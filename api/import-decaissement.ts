/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";

/* =====================================================================
 * api/import-decaissement.ts : met à jour public/data/Base_Decaissement.geojson
 *
 * Une ligne de la base = (Année, Mois), montants MENSUELS comme dans l'Excel.
 *  - niveau « instrument » : onglet « CL-Dépenses » -> 8 instruments + Total, et budgets alloués (ligne 5)
 *  - niveau « composante » : onglet « Pour Céline »  -> Output 0 à 4
 * Un champ non envoyé n'écrase rien. Les lignes manquantes sont créées.
 *
 * Droits : Céline et les administrateurs.
 * L'historique est écrit dans le même fichier que le Suivi coût (HISTORY_PATH) :
 * la date « Données mises à jour le » de la page se met donc à jour automatiquement.
 *
 * Variables : GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, AUTH_SECRET.
 * Optionnelles : GEOJSON_DECAISSEMENT_PATH (défaut public/data/Base_Decaissement.geojson),
 *                HISTORY_PATH (défaut historique-mises-a-jour.json).
 * ===================================================================== */

const ADMIN = new Set(["Toky", "Zo", "Joary"]);
const AUTORISES = new Set([...ADMIN, "Celine"]);

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const INSTRUMENTS = [
  "Experts",
  "Frais de mission",
  "Contrats",
  "Achats par le projet",
  "Construction (LP 005)",
  "Financements",
  "Charges de fonctionnement et divers",
  "Frais généraux + TVA GER",
];
const OUTPUTS = ["Output 0", "Output 1", "Output 2", "Output 3", "Output 4"];
const COLONNES_BASE = [...INSTRUMENTS, "Total", ...OUTPUTS];
const CLES_PAR_NIVEAU: Record<string, string[]> = {
  instrument: [...INSTRUMENTS, "Total"],
  composante: OUTPUTS,
};
const LIBELLE_NIVEAU: Record<string, string> = {
  instrument: "Décaissement par instrument",
  composante: "Décaissement par composante (Output)",
};

type Props = Record<string, any>;
type Changement = { colonne: string; ancienneValeur: any; nouvelleValeur: number; uc: string; annee: number; mois: string };

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
const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e11 ? v : null);
const arrondi = (v: number) => Math.round(v * 100) / 100; // centimes : évite -3444.3600000000006

function memeValeur(ancienne: any, nouvelle: number): boolean {
  if (ancienne === null || ancienne === undefined || ancienne === "") return false;
  const n = Number(ancienne);
  return Number.isFinite(n) && Math.abs(n - nouvelle) < 1e-9;
}

function ecrire(p: Props, valeurs: Record<string, number>, libelle: string, annee: number, mois: string, historique: Changement[]) {
  for (const [cle, brute] of Object.entries(valeurs)) {
    const valeur = arrondi(brute);
    const ancienne = p[cle] ?? null;
    if (!memeValeur(ancienne, valeur)) {
      historique.push({ colonne: `${mois} ${annee} — ${cle}`, ancienneValeur: ancienne, nouvelleValeur: valeur, uc: libelle, annee, mois });
    }
    p[cle] = valeur;
  }
}

/* ---------- GitHub ---------- */
const urlContenu = (owner: string, repo: string, chemin: string) =>
  `https://api.github.com/repos/${owner}/${repo}/contents/` + chemin.split("/").map(encodeURIComponent).join("/");

async function lireGeoJSON(url: string, branch: string, headers: Record<string, string>) {
  const meta = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (meta.status === 404) throw new Error("Base_Decaissement.geojson introuvable dans GitHub. Vérifiez GEOJSON_DECAISSEMENT_PATH.");
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
      message: `Historique import décaissement ${entree.annee}`,
      content: Buffer.from(JSON.stringify({ entries }, null, 2), "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
      branch,
    }),
  });
  if (!save.ok) throw new Error("L'historique n'a pas pu être sauvegardé.");
}

/* ---------- Handler ---------- */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const authSecret = process.env.AUTH_SECRET;
  if (!token || !owner || !repo || !branch || !authSecret) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  // 1. Session et droits : le nom vient du jeton signé, jamais du navigateur.
  const nom = lireJeton(req.body?.token, authSecret);
  if (!nom) return res.status(401).json({ error: "Session expirée ou invalide. Fermez cette fenêtre et reconnectez-vous." });
  if (!AUTORISES.has(nom)) return res.status(403).json({ error: "Vous n'êtes pas autorisé à mettre à jour le décaissement." });

  // 2. Validation complète AVANT toute modification (tout-ou-rien)
  const niveau = String(req.body?.niveau ?? "");
  const clesAutorisees = CLES_PAR_NIVEAU[niveau];
  if (!clesAutorisees) return res.status(400).json({ error: "Niveau invalide (instrument ou composante)." });

  const lignes = req.body?.lignes;
  if (!Array.isArray(lignes) || lignes.length === 0) return res.status(400).json({ error: "Aucune ligne à importer." });
  if (lignes.length > 120) return res.status(400).json({ error: "Trop de lignes (120 maximum par import)." });

  const vues = new Set<string>();
  for (const l of lignes) {
    const annee = Number(l?.annee);
    if (!Number.isInteger(annee) || annee < 2024 || annee > 2031) return res.status(400).json({ error: `Année invalide : ${l?.annee}.` });
    if (!MOIS.includes(l?.mois)) return res.status(400).json({ error: `Mois invalide : ${l?.mois}.` });
    const valeurs = l?.valeurs;
    if (!valeurs || typeof valeurs !== "object" || Object.keys(valeurs).length === 0) {
      return res.status(400).json({ error: `Aucune valeur pour ${l.mois} ${annee}.` });
    }
    for (const [cle, v] of Object.entries(valeurs)) {
      if (!clesAutorisees.includes(cle)) return res.status(400).json({ error: `Colonne « ${cle} » non autorisée pour le niveau ${niveau}.` });
      if (nombre(v) === null) return res.status(400).json({ error: `Valeur non numérique pour « ${cle} » (${l.mois} ${annee}).` });
    }
    const cle = `${annee}|${l.mois}`;
    if (vues.has(cle)) return res.status(400).json({ error: `${l.mois} ${annee} est présent plusieurs fois.` });
    vues.add(cle);
  }

  // Budgets alloués (niveau « instrument » seulement)
  const budgets = req.body?.budgets;
  if (budgets !== undefined && budgets !== null) {
    if (niveau !== "instrument" || typeof budgets !== "object") return res.status(400).json({ error: "Budgets non acceptés pour ce niveau." });
    for (const [cle, v] of Object.entries(budgets)) {
      const x = nombre(v);
      if (!CLES_PAR_NIVEAU.instrument.includes(cle) || x === null || x < 0) {
        return res.status(400).json({ error: `Budget invalide pour « ${cle} ».` });
      }
    }
  }

  const chemin = process.env.GEOJSON_DECAISSEMENT_PATH || "public/data/Base_Decaissement.geojson";
  const url = urlContenu(owner, repo, chemin);
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    const { sha, geojson } = await lireGeoJSON(url, branch, headers);
    const features: any[] = geojson.features;
    const historique: Changement[] = [];
    let creees = 0;

    const obtenir = (a: number, m: string): any => {
      const t = features.filter((f) => Number(f.properties?.["Année"]) === a && f.properties?.Mois === m);
      if (t.length > 1) throw new Error(`${m} ${a} : plusieurs lignes correspondantes dans la base.`);
      if (t.length === 1) return t[0];
      const f = {
        type: "Feature",
        properties: { "Année": a, Mois: m, ...Object.fromEntries(COLONNES_BASE.map((c) => [c, null])) },
        geometry: null,
      };
      features.push(f);
      creees++;
      return f;
    };

    // 3. Montants mensuels
    for (const l of lignes) {
      ecrire(obtenir(Number(l.annee), l.mois).properties, l.valeurs, LIBELLE_NIVEAU[niveau], Number(l.annee), l.mois, historique);
    }

    // 4. Budgets alloués
    if (budgets && Object.keys(budgets).length > 0) {
      if (!geojson.budgets || typeof geojson.budgets !== "object") geojson.budgets = {};
      for (const [cle, brute] of Object.entries(budgets as Record<string, number>)) {
        const valeur = arrondi(brute);
        const ancienne = geojson.budgets[cle] ?? null;
        if (!memeValeur(ancienne, valeur)) {
          historique.push({ colonne: `Budget alloué — ${cle}`, ancienneValeur: ancienne, nouvelleValeur: valeur, uc: LIBELLE_NIVEAU[niveau], annee: 0, mois: "" });
        }
        geojson.budgets[cle] = valeur;
      }
    }

    // 5. Ordre chronologique (moins de différences dans Git)
    if (creees > 0) {
      features.sort(
        (x, y) =>
          Number(x.properties["Année"]) - Number(y.properties["Année"]) ||
          MOIS.indexOf(x.properties.Mois) - MOIS.indexOf(y.properties.Mois)
      );
    }

    // 6. Enregistrement
    const save = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Import du décaissement (${niveau}) par ${nom}`,
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
      await ajouterHistorique(urlContenu(owner, repo, process.env.HISTORY_PATH || "historique-mises-a-jour.json"), branch, headers, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString(),
        utilisateur: nom,
        identifiant: nom,
        annee: Math.max(...lignes.map((l: any) => Number(l.annee))),
        mois: LIBELLE_NIVEAU[niveau],
        uc: "Programme",
        nombreColonnesModifiees: historique.length,
        changements: historique,
      });
      historySaved = true;
    } catch (e) {
      console.error("Base enregistrée, historique non enregistré :", e);
    }

    const modifiees = historique.length;
    let message = modifiees === 0
      ? `Aucune valeur n'a changé (${lignes.length} mois vérifiés).`
      : `${modifiees} valeur(s) mise(s) à jour sur ${lignes.length} mois${creees ? `, dont ${creees} ligne(s) créée(s)` : ""}.`;
    if (!historySaved) message += " L'historique n'a pas pu être sauvegardé.";

    return res.status(200).json({ success: true, historySaved, message, modifiees, creees });
  } catch (error: any) {
    console.error("Erreur import décaissement :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation." });
  }
}
