/// <reference types="node" />
import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";

/* =====================================================================
 * api/import-indicateurs.ts : met à jour public/data/Base_Indicateurs.geojson
 *
 * Une ligne de la base = (Année, Semestre, Antenne). Les valeurs sont CUMULÉES depuis le
 * début du projet. Un champ non envoyé n'écrase rien.
 *
 * Droits : - un administrateur importe n'importe quelle antenne et la ligne « Toutes » ;
 *          - une personne ne peut importer que les lignes de SON antenne ;
 *          - R1.2 et « Avancement global (%) » : ligne « Toutes » seulement (non additifs).
 *
 * « Toutes » (colonnes additives) = somme des 6 antennes, recalculée seulement quand
 * les 6 antennes ont une ligne pour le même semestre (sinon on garde la ligne telle quelle).
 *
 * Variables : GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, AUTH_SECRET.
 * Optionnelles : GEOJSON_INDICATEURS_PATH (défaut public/data/Base_Indicateurs.geojson),
 *                HISTORY_INDICATEURS_PATH (défaut historique-indicateurs.json).
 * ===================================================================== */

const ADMIN = new Set(["Toky", "Zo", "Joary"]);
const ANTENNE_PAR_UTILISATEUR: Record<string, string> = {
  Allan: "Diana",
  Herimanga: "Boeny",
  Michael: "Amoron'i Mania",
  Tsinjo: "Anosy",
  Njaka: "Atsimo-Atsinanana",
  // Tanà : à ajouter ici si une personne non administratrice saisit pour l'antenne de Tanà
};

const ANTENNES = ["Tanà", "Amoron'i Mania", "Boeny", "Diana", "Atsimo-Atsinanana", "Anosy"];
const SEMESTRES = ["S1", "S2"]; // S1 = janvier-juin, S2 = juillet-décembre (valeurs cumulées à la fin du semestre)

const ADDITIFS = [
  "R1.1", "R2.1", "R2.2", "R1.1.1", "R1.1.2", "R1.2.1", "R1.2.2", "R2.1.1", "R2.1.2", "R2.2.1", "R2.2.2",
  "Hommes", "Femmes", "Age <18", "Age 18-35", "Age 36-59", "Age >60",
];
const TOUTES_SEULEMENT = ["R1.2", "Avancement global (%)"];
const COLONNES = [...ADDITIFS, ...TOUTES_SEULEMENT];

type Props = Record<string, any>;
type Changement = { colonne: string; ancienneValeur: any; nouvelleValeur: number; antenne: string; annee: number; semestre: string };

/* ---------- Jeton de session (créé par api/auth.ts) ---------- */
function lireJeton(jeton: unknown, secret: string): string | null {
  if (typeof jeton !== "string") return null;
  const [payload, signature] = jeton.split(".");
  if (!payload || !signature) return null;
  const attendu = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof u === "string" && typeof exp === "number" && exp > Date.now() ? u : null;
  } catch {
    return null;
  }
}

/* ---------- Outils ---------- */
const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function memeValeur(ancienne: any, nouvelle: number): boolean {
  if (ancienne === null || ancienne === undefined || ancienne === "") return false;
  const n = Number(ancienne);
  return Number.isFinite(n) && Math.abs(n - nouvelle) < 1e-9;
}

function ecrire(p: Props, valeurs: Record<string, number>, antenne: string, annee: number, semestre: string, historique: Changement[]) {
  for (const [cle, valeur] of Object.entries(valeurs)) {
    const ancienne = p[cle] ?? null;
    if (!memeValeur(ancienne, valeur)) {
      historique.push({ colonne: `${semestre} — ${antenne} — ${cle}`, ancienneValeur: ancienne, nouvelleValeur: valeur, antenne, annee, semestre });
    }
    p[cle] = valeur;
  }
}

/* ---------- GitHub ---------- */
const urlContenu = (owner: string, repo: string, chemin: string) =>
  `https://api.github.com/repos/${owner}/${repo}/contents/` + chemin.split("/").map(encodeURIComponent).join("/");

async function lireGeoJSON(url: string, branch: string, headers: Record<string, string>) {
  const meta = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (meta.status === 404) throw new Error("Base_Indicateurs.geojson introuvable dans GitHub. Vérifiez GEOJSON_INDICATEURS_PATH.");
  if (!meta.ok) throw new Error(`Lecture des métadonnées GitHub impossible (${meta.status}).`);
  const { sha } = await meta.json();
  if (!sha) throw new Error("GitHub n'a pas retourné le SHA de la base.");
  const raw = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: { ...headers, Accept: "application/vnd.github.raw+json" },
    cache: "no-store",
  });
  if (!raw.ok) throw new Error(`Lecture de la base impossible (${raw.status}).`);
  const geojson = JSON.parse(await raw.text());
  if (!Array.isArray(geojson.features)) throw new Error("La base ne contient pas de tableau features.");
  return { sha, geojson };
}

async function ajouterHistorique(url: string, branch: string, headers: Record<string, string>, entree: any) {
  let sha: string | undefined;
  let entries: any[] = [];
  const meta = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (meta.ok) {
    sha = (await meta.json()).sha;
    const raw = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
      headers: { ...headers, Accept: "application/vnd.github.raw+json" },
      cache: "no-store",
    });
    if (!raw.ok) throw new Error("Impossible de lire l'historique.");
    const parsed = JSON.parse(await raw.text());
    entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  } else if (meta.status !== 404) {
    throw new Error("Impossible de lire l'historique.");
  }
  entries.unshift(entree);
  const save = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Historique import indicateurs ${entree.annee}`,
      content: Buffer.from(JSON.stringify({ entries }, null, 2), "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
      branch,
    }),
  });
  if (!save.ok) throw new Error("L'historique n'a pas pu être sauvegardé.");
}

/* ---------- Handler ---------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const authSecret = process.env.AUTH_SECRET;
  if (!token || !owner || !repo || !branch || !authSecret) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  // 1. Session : le nom vient du jeton signé, jamais du navigateur.
  const nom = lireJeton(req.body?.token, authSecret);
  if (!nom) return res.status(401).json({ error: "Session expirée ou invalide. Fermez cette fenêtre et reconnectez-vous." });

  const estAdmin = ADMIN.has(nom);
  const monAntenne = ANTENNE_PAR_UTILISATEUR[nom];
  if (!estAdmin && !monAntenne) return res.status(403).json({ error: "Accès refusé. Utilisateur non autorisé." });

  // 2. Validation complète AVANT toute modification (tout-ou-rien)
  const lignes = req.body?.lignes;
  if (!Array.isArray(lignes) || lignes.length === 0) return res.status(400).json({ error: "Aucune ligne à importer." });
  if (lignes.length > 200) return res.status(400).json({ error: "Trop de lignes (200 maximum par import)." });

  const vues = new Set<string>();
  for (const l of lignes) {
    const annee = Number(l?.annee);
    if (!Number.isInteger(annee) || annee < 2024 || annee > 2030) return res.status(400).json({ error: `Année invalide : ${l?.annee}.` });
    if (!SEMESTRES.includes(l?.semestre)) return res.status(400).json({ error: `Semestre invalide : ${l?.semestre} (S1 ou S2).` });
    if (l?.antenne !== "Toutes" && !ANTENNES.includes(l?.antenne)) return res.status(400).json({ error: `Antenne invalide : ${l?.antenne}.` });

    if (!estAdmin && l.antenne !== monAntenne) {
      return res.status(403).json({ error: `Vous ne pouvez importer que les lignes de l'antenne ${monAntenne} (ligne reçue : ${l.antenne}).` });
    }
    const valeurs = l?.valeurs;
    if (!valeurs || typeof valeurs !== "object" || Object.keys(valeurs).length === 0) {
      return res.status(400).json({ error: `Aucune valeur pour ${l.semestre} ${annee} – ${l.antenne}.` });
    }
    for (const [cle, v] of Object.entries(valeurs)) {
      if (!COLONNES.includes(cle)) return res.status(400).json({ error: `Colonne inconnue : « ${cle} ».` });
      const x = nombre(v);
      if (x === null) return res.status(400).json({ error: `Valeur non numérique pour « ${cle} » (${l.semestre} ${annee} – ${l.antenne}).` });
      if (TOUTES_SEULEMENT.includes(cle) && l.antenne !== "Toutes") {
        return res.status(400).json({ error: `« ${cle} » se saisit uniquement sur la ligne « Toutes » (reçu pour ${l.antenne}).` });
      }
      if (cle === "Avancement global (%)" && (x < 0 || x > 100)) return res.status(400).json({ error: "« Avancement global (%) » doit être entre 0 et 100." });
      if (cle === "R1.2" && (x < -100 || x > 100)) return res.status(400).json({ error: "« R1.2 » doit être un pourcentage entre -100 et 100." });
      if (!TOUTES_SEULEMENT.includes(cle) && x < 0) return res.status(400).json({ error: `« ${cle} » ne peut pas être négatif (${l.semestre} ${annee} – ${l.antenne}).` });
    }
    const cle = `${annee}|${l.semestre}|${l.antenne}`;
    if (vues.has(cle)) return res.status(400).json({ error: `${l.semestre} ${annee} – ${l.antenne} est présent plusieurs fois.` });
    vues.add(cle);
  }

  const chemin = process.env.GEOJSON_INDICATEURS_PATH || "public/data/Base_Indicateurs.geojson";
  const url = urlContenu(owner, repo, chemin);
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    const { sha, geojson } = await lireGeoJSON(url, branch, headers);
    const features: any[] = geojson.features;
    const historique: Changement[] = [];
    let creees = 0;

    const trouver = (a: number, m: string, ant: string) =>
      features.filter((f) => Number(f.properties?.["Année"]) === a && f.properties?.Semestre === m && f.properties?.Antenne === ant);

    const obtenir = (a: number, m: string, ant: string, creer: boolean): any | null => {
      const t = trouver(a, m, ant);
      if (t.length > 1) throw new Error(`${m} ${a} – ${ant} : plusieurs lignes correspondantes dans la base.`);
      if (t.length === 1) return t[0];
      if (!creer) return null;
      const f = {
        type: "Feature",
        properties: { "Année": a, Semestre: m, Antenne: ant, ...Object.fromEntries(COLONNES.map((c) => [c, null])) },
        geometry: null,
      };
      features.push(f);
      creees++;
      return f;
    };

    // 3. Écriture des lignes reçues (création si la ligne n'existe pas encore)
    const touchees = new Map<string, { annee: number; semestre: string }>();
    for (const l of lignes) {
      const f = obtenir(Number(l.annee), l.semestre, l.antenne, true);
      ecrire(f.properties, l.valeurs, l.antenne, Number(l.annee), l.semestre, historique);
      if (l.antenne !== "Toutes") touchees.set(`${l.annee}|${l.semestre}`, { annee: Number(l.annee), semestre: l.semestre });
    }

    // 4. Ligne « Toutes » : somme des 6 antennes, seulement si elles ont toutes une ligne ce semestre-là
    const toutesRecalculees: string[] = [];
    const incompletes: string[] = [];
    for (const { annee, semestre } of touchees.values()) {
      const lignesAntennes = ANTENNES.map((ant) => obtenir(annee, semestre, ant, false));
      const manquantes = ANTENNES.filter((_, i) => !lignesAntennes[i] || !ADDITIFS.some((c) => lignesAntennes[i].properties[c] != null));
      if (manquantes.length > 0) {
        incompletes.push(`${semestre} ${annee} (manque : ${manquantes.join(", ")})`);
        continue;
      }
      const somme: Record<string, number> = {};
      for (const c of ADDITIFS) {
        const vals = lignesAntennes.map((r) => r.properties[c]).filter((v) => v !== null && v !== undefined);
        if (vals.length > 0) somme[c] = vals.reduce((s: number, v: any) => s + Number(v), 0);
      }
      ecrire(obtenir(annee, semestre, "Toutes", true).properties, somme, "Toutes", annee, semestre, historique);
      toutesRecalculees.push(`${semestre} ${annee}`);
    }

    // 5. Ordre stable (moins de différences dans Git) : année, semestre, « Toutes » puis antennes
    if (creees > 0) {
      const ordreAntenne = (a: string) => (a === "Toutes" ? -1 : ANTENNES.indexOf(a));
      features.sort(
        (x, y) =>
          Number(x.properties["Année"]) - Number(y.properties["Année"]) ||
          SEMESTRES.indexOf(x.properties.Semestre) - SEMESTRES.indexOf(y.properties.Semestre) ||
          ordreAntenne(x.properties.Antenne) - ordreAntenne(y.properties.Antenne)
      );
    }

    // 6. Enregistrement
    const save = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Import des indicateurs (${[...new Set(lignes.map((l: any) => l.antenne))].join(", ")}) par ${nom}`,
        content: Buffer.from(JSON.stringify(geojson, null, 2), "utf8").toString("base64"),
        sha,
        branch,
      }),
    });
    if (save.status === 409 || save.status === 422) {
      throw new Error("La base a été modifiée par quelqu'un d'autre pendant l'import. Relancez l'importation.");
    }
    if (!save.ok) throw new Error(`GitHub a refusé l'enregistrement de la base (${save.status}).`);

    let historySaved = false;
    try {
      await ajouterHistorique(
        urlContenu(owner, repo, process.env.HISTORY_INDICATEURS_PATH || "historique-indicateurs.json"),
        branch,
        headers,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: new Date().toISOString(),
          utilisateur: nom,
          identifiant: nom,
          annee: Number(lignes[0].annee),
          semestre: [...new Set(lignes.map((l: any) => l.semestre))].join(", "),
          antenne: [...new Set(lignes.map((l: any) => l.antenne))].join(", "),
          nombreColonnesModifiees: historique.length,
          changements: historique,
        }
      );
      historySaved = true;
    } catch (e) {
      console.error("Base enregistrée, historique non enregistré :", e);
    }

    let message = `${lignes.length} ligne(s) importée(s)${creees ? `, dont ${creees} créée(s)` : ""}.`;
    if (toutesRecalculees.length) message += ` Ligne « Toutes » recalculée : ${toutesRecalculees.join(", ")}.`;
    if (incompletes.length) message += ` « Toutes » non recalculée (antennes manquantes) : ${incompletes.join(" ; ")}.`;
    if (!historySaved) message += " L'historique n'a pas pu être sauvegardé.";

    return res.status(200).json({ success: true, historySaved, message, lignes: lignes.length, creees, toutesRecalculees, incompletes });
  } catch (error: any) {
    console.error("Erreur import indicateurs :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation." });
  }
}
