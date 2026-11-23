/// <reference types="node" />

/* =====================================================================
 * server/firms-archive.ts : points de feux par jour et par commune (archive NASA FIRMS)
 * Handler appelé par le dispatcher api/*.ts avec ?type=firms-archive (aucune fonction Vercel de plus).
 *
 * Trois opérations, choisies par ?op= :
 *   fetch : relais vers NASA FIRMS (la clé FIRMS_MAP_KEY reste côté serveur)
 *   get   : lit dans la base de sauvegarde le nombre de points par jour d'une commune et d'un mois
 *   save  : enregistre ce nombre de points par jour (POST JSON)
 *
 * Base de sauvegarde = fichiers JSON dans GitHub (comme update-feux), un fichier par mois :
 *   public/data/point_feux_archive/2025-09.json
 *   { "version": 1, "entrees": { "ankarafantsika__marovoay": { ap, commune, jours:[..], maj, definitif } } }
 * Ils sont écrits sur une BRANCHE DÉDIÉE (data-archive) pour ne pas relancer le déploiement de la branche principale.
 *
 * Variables d'environnement (les 4 premières existent déjà pour update-feux) :
 *   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, FIRMS_MAP_KEY
 *   GITHUB_ARCHIVE_BRANCH  (optionnelle) défaut : data-archive
 *   FEUX_ARCHIVE_DIR       (optionnelle) défaut : public/data/point_feux_archive
 * ===================================================================== */

const SOURCES = new Set([
  "VIIRS_SNPP_SP", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT",
]);
const NUM = "-?\\d+(?:\\.\\d+)?";
const BBOX = new RegExp(`^${NUM},${NUM},${NUM},${NUM}$`);
const DAY = 86400000;
// Au-delà de ce délai après la fin du mois, l'archive validée (SP) est publiée : les chiffres ne changent plus
const DELAI_DEFINITIF_JOURS = 120;

const q = (v: any): string => String(Array.isArray(v) ? v[0] : v ?? "");
const slug = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

type Entree = { ap: string; commune: string; jours: number[]; maj: string; definitif: boolean };
type FichierMois = { version: 1; entrees: Record<string, Entree> };

/* ---------- Paramètres communs ---------- */
function cible(ap: string, commune: string, year: number, month: number) {
  if (!ap || !commune || ap.length > 100 || commune.length > 100) return null;
  if (!(year >= 2000 && year <= 2100) || !(month >= 1 && month <= 12)) return null;
  return { mois: `${year}-${String(month).padStart(2, "0")}`, cle: `${slug(ap)}__${slug(commune)}` };
}

/* ---------- GitHub ---------- */
function configGithub() {
  const token = process.env.GITHUB_TOKEN, owner = process.env.GITHUB_OWNER, repo = process.env.GITHUB_REPO, base = process.env.GITHUB_BRANCH;
  if (!token || !owner || !repo || !base) return null;
  const archive = process.env.GITHUB_ARCHIVE_BRANCH || "data-archive";
  const dir = (process.env.FEUX_ARCHIVE_DIR || "public/data/point_feux_archive").replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  return { base, archive, dir, headers, api };
}
type Gh = NonNullable<ReturnType<typeof configGithub>>;

const urlFichier = (g: Gh, mois: string) =>
  `${g.api}/contents/` + `${g.dir}/${mois}.json`.split("/").map(encodeURIComponent).join("/");

// Lit le fichier d'un mois sur la branche d'archive : { sha, data } ou null s'il n'existe pas encore
async function lireMois(g: Gh, mois: string): Promise<{ sha: string; data: FichierMois } | null> {
  const r = await fetch(`${urlFichier(g, mois)}?ref=${encodeURIComponent(g.archive)}`, { headers: g.headers, cache: "no-store" });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Lecture GitHub impossible (${r.status}).`);
  const j = await r.json();
  const data = JSON.parse(Buffer.from(String(j.content ?? ""), "base64").toString("utf8")) as FichierMois;
  return { sha: j.sha, data: data && typeof data.entrees === "object" ? data : { version: 1, entrees: {} } };
}

// Crée la branche d'archive à partir de la branche principale si elle n'existe pas
let brancheVerifiee = false;
async function assurerBranche(g: Gh) {
  if (brancheVerifiee) return;
  const ref = await fetch(`${g.api}/git/ref/heads/${encodeURIComponent(g.archive)}`, { headers: g.headers, cache: "no-store" });
  if (ref.status === 404) {
    const base = await fetch(`${g.api}/git/ref/heads/${encodeURIComponent(g.base)}`, { headers: g.headers, cache: "no-store" });
    if (!base.ok) throw new Error(`Branche principale introuvable (${base.status}).`);
    const sha = (await base.json()).object?.sha;
    const cree = await fetch(`${g.api}/git/refs`, {
      method: "POST", headers: { ...g.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${g.archive}`, sha }),
    });
    if (!cree.ok && cree.status !== 422) throw new Error(`Création de la branche d'archive impossible (${cree.status}).`);
  } else if (!ref.ok) {
    throw new Error(`Lecture de la branche d'archive impossible (${ref.status}).`);
  }
  brancheVerifiee = true;
}

/* ---------- fetch : relais FIRMS ---------- */
async function opFetch(req: any, res: any) {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return res.status(500).send("FIRMS_MAP_KEY absente côté serveur");
  const source = q(req.query?.source), bbox = q(req.query?.bbox), day = q(req.query?.day), nn = Number(q(req.query?.n));
  if (!SOURCES.has(source) || !BBOX.test(bbox) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !(nn >= 1 && nn <= 5)) {
    return res.status(400).send("Paramètres invalides");
  }
  const [w, s, e, no] = bbox.split(",").map(Number);
  if (e - w > 3 || no - s > 3) return res.status(400).send("Zone trop grande");

  const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/${bbox}/${nn}/${day}`);
  const text = await r.text();
  const ok = r.ok && text.trim().toLowerCase().startsWith("latitude");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", ok ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store");
  return res.status(r.ok ? 200 : r.status).send(ok ? text : text.replace(key, "***").slice(0, 200));
}

/* ---------- get : lecture dans la base ---------- */
async function opGet(req: any, res: any) {
  const c = cible(q(req.query?.ap), q(req.query?.commune), Number(q(req.query?.year)), Number(q(req.query?.month)));
  if (!c) return res.status(400).json({ error: "Paramètres invalides" });
  const g = configGithub();
  if (!g) return res.status(500).json({ error: "Configuration GitHub incomplète." });
  const f = await lireMois(g, c.mois);
  const e = f?.data.entrees[c.cle];
  if (!e) return res.status(404).json({ error: "absent" });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(e);
}

/* ---------- save : écriture dans la base (commit sur la branche d'archive) ---------- */
async function opSave(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST requis" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  const ap = String(body?.ap ?? "").trim(), commune = String(body?.commune ?? "").trim();
  const year = Number(body?.year), month = Number(body?.month);
  const c = cible(ap, commune, year, month);
  if (!c) return res.status(400).json({ error: "Paramètres invalides" });

  const nJours = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const jours = body?.jours;
  if (!Array.isArray(jours) || jours.length !== nJours || !jours.every((v: any) => Number.isInteger(v) && v >= 0 && v <= 100000)) {
    return res.status(400).json({ error: "Tableau jours invalide" });
  }
  if (Date.UTC(year, month - 1, 1) > Date.now()) return res.status(400).json({ error: "Mois futur" });

  const g = configGithub();
  if (!g) return res.status(500).json({ error: "Configuration GitHub incomplète." });
  await assurerBranche(g);

  const finMois = Date.UTC(year, month, 0);
  const entree: Entree = { ap, commune, jours, maj: new Date().toISOString(), definitif: Date.now() > finMois + DELAI_DEFINITIF_JOURS * DAY };

  // Plusieurs communes peuvent s'enregistrer en même temps : en cas de conflit (SHA périmé), on relit, on refusionne et on réessaie
  for (let essai = 0; essai < 4; essai++) {
    const f = await lireMois(g, c.mois);
    const data: FichierMois = f?.data ?? { version: 1, entrees: {} };
    const avant = data.entrees[c.cle];
    if (avant && avant.definitif && avant.jours.join() === jours.join()) return res.status(200).json({ ok: true, inchange: true });
    data.entrees[c.cle] = entree;
    // clés triées : historique Git lisible
    const tri: FichierMois = { version: 1, entrees: Object.fromEntries(Object.entries(data.entrees).sort(([a], [b]) => a.localeCompare(b))) };

    const put = await fetch(urlFichier(g, c.mois), {
      method: "PUT",
      headers: { ...g.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Archive points de feux ${c.mois} : ${commune} (${ap})`,
        content: Buffer.from(JSON.stringify(tri, null, 1) + "\n", "utf8").toString("base64"),
        ...(f ? { sha: f.sha } : {}),
        branch: g.archive,
      }),
    });
    if (put.ok) return res.status(200).json({ ok: true });
    if (put.status !== 409 && put.status !== 422) throw new Error(`GitHub a refusé l'enregistrement (${put.status}).`);
    await new Promise((r) => setTimeout(r, 300 * (essai + 1)));
  }
  return res.status(409).json({ error: "Conflit d'écriture : réessayez." });
}

export default async function handler(req: any, res: any) {
  try {
    const op = q(req.query?.op) || "fetch";
    if (op === "get") return await opGet(req, res);
    if (op === "save") return await opSave(req, res);
    if (op === "fetch") return await opFetch(req, res);
    return res.status(400).json({ error: "op inconnue" });
  } catch (e: any) {
    console.error("firms-archive:", e);
    return res.status(502).json({ error: e?.message || "Erreur serveur" });
  }
}
