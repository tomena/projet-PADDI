import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "crypto";

/* =====================================================================
 * CONVENTION DE LA BASE (confirmée sur la ligne UCR-A / Septembre 2026)
 * ---------------------------------------------------------------------
 * Pour chaque ligne (Année, Mois, UC), les colonnes OPÉRATIONNELLES sont
 * CUMULÉES depuis le début de l'année jusqu'à ce mois :
 *   D (EUR), D C1..C4 (EUR), DF/DA/DC/DMI/DMP (EUR)
 * Les budgets (PA...) sont ANNUELS, et les taux sont cumul / budget :
 *   TAC, TAC C1..C4, TAC F/A/C/MI/MP
 *
 * Les colonnes PROGRAMME (BT, DC, TD, BD 20xx, BD O0..O4, 1. S ... 4 S)
 * appartiennent au flux « Décaissement » : cet import n'y touche JAMAIS.
 * ===================================================================== */

const UC_PAR_ONGLET: Record<string, string> = {
  "UCT (ext)": "UCT",
  "UCR-N (Boeny-ext)": "UCR-B",
  "UCR-N (DIANA-ext)": "UCR-D",
  "UCR-S (Ambositra-ext)": "UCR-A",
  "UCR-S (Farafangana-ext)": "UCR-F",
  "UCR-S (Fort-dauphin-ext)": "UCR-FD",
};
const ADMIN = new Set(["Toky", "Zo", "Joary"]);
const ONGLET_PAR_UTILISATEUR: Record<string, string> = {
  Allan: "UCR-N (DIANA-ext)",
  Herimanga: "UCR-N (Boeny-ext)",
  Michael: "UCR-S (Ambositra-ext)",
  Tsinjo: "UCR-S (Fort-dauphin-ext)",
  Njaka: "UCR-S (Farafangana-ext)",
};
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const UC_AGREGEES = ["UCT", "UCR-A", "UCR-B", "UCR-D", "UCR-F", "UCR-FD"];

/* Champ envoyé par le front -> colonne cumulée / colonne budget / colonne taux. */
const CHAMPS = [
  { src: "total", d: "D (EUR)", pa: "PA (EUR)", tac: "TAC" },
  { src: "c1", d: "D C1 (EUR)", pa: "PA C1 (EUR)", tac: "TAC C1" },
  { src: "c2", d: "D C2 (EUR)", pa: "PA C2 (EUR)", tac: "TAC C2" },
  { src: "c3", d: "D C3 (EUR)", pa: "PA C3 (EUR)", tac: "TAC C3" },
  { src: "c4", d: "D C4 (EUR)", pa: "PA C4 (EUR)", tac: "TAC C4" },
  { src: "financements", d: "DF (EUR)", pa: "PAF (EUR)", tac: "TAC F" },
  { src: "achats", d: "DA (EUR)", pa: "PAA (EUR)", tac: "TAC A" },
  { src: "contrats", d: "DC (EUR)", pa: "PAC (EUR)", tac: "TAC C" },
  { src: "dmi", d: "DMI (EUR)", pa: "PAMI (EUR)", tac: "TAC MI" },
  { src: "dmp", d: "DMP (EUR)", pa: "PAMP (EUR)", tac: "TAC MP" },
] as const;

type Props = Record<string, any>;
type Changement = { colonne: string; ancienneValeur: any; nouvelleValeur: number; uc: string; annee: number; mois: string };

/* ---------- Outils ---------- */
function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0; // « #DIV/0! » ou null -> 0
}
function ratio(numerateur: number, denominateur: number): number {
  return denominateur > 0 ? numerateur / denominateur : 0;
}
function monthIndex(value: unknown): number {
  return MOIS.indexOf(String(value));
}
function memeValeur(ancienne: any, nouvelle: number): boolean {
  if (ancienne === null || ancienne === undefined || ancienne === "") return false;
  const n = Number(ancienne); // tolère « 1120.29 » stocké en texte
  return Number.isFinite(n) && Math.abs(n - nouvelle) < 1e-9;
}
function aLaColonne(p: Props, cle: string) {
  return Object.prototype.hasOwnProperty.call(p, cle);
}

/* Écrit des valeurs dans une ligne, et trace les changements. Colonne absente = erreur. */
function ecrire(p: Props, valeurs: Record<string, number>, uc: string, annee: number, mois: string, historique: Changement[]) {
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (!aLaColonne(p, cle)) throw new Error(`La colonne GeoJSON « ${cle} » n'existe pas dans ${annee} ${mois} ${uc}.`);
    const ancienne = p[cle] ?? null;
    if (!memeValeur(ancienne, valeur)) {
      historique.push({ colonne: `${mois} — ${cle}`, ancienneValeur: ancienne, nouvelleValeur: valeur, uc, annee, mois });
    }
    p[cle] = valeur;
  }
}

/* ---------- GitHub ---------- */
async function readGitHubFile(apiUrl: string, branch: string, headers: Record<string, string>) {
  const metadataResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (!metadataResponse.ok) throw new Error(`Lecture des métadonnées GitHub impossible (${metadataResponse.status}).`);
  const metadata = await metadataResponse.json();
  if (!metadata.sha) throw new Error("GitHub n'a pas retourné le SHA du GeoJSON.");
  const rawResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: { ...headers, Accept: "application/vnd.github.raw+json" },
    cache: "no-store",
  });
  if (!rawResponse.ok) throw new Error(`Lecture du GeoJSON impossible (${rawResponse.status}).`);
  const geojson = JSON.parse(await rawResponse.text());
  if (!Array.isArray(geojson.features)) throw new Error("Le GeoJSON ne contient pas de tableau features.");
  return { metadata, geojson };
}

async function appendHistory(owner: string, repo: string, branch: string, path: string, headers: Record<string, string>, entry: any) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/");
  let sha: string | undefined;
  let entries: any[] = [];
  const response = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (response.ok) {
    const metadata = await response.json();
    sha = metadata.sha;
    const content = Buffer.from(String(metadata.content).replace(/\n/g, ""), "base64").toString("utf8");
    const parsed = JSON.parse(content);
    entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  } else if (response.status !== 404) {
    throw new Error("Impossible de lire l'historique des mises à jour.");
  }
  entries.unshift(entry);
  const save = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Historique import décaissements ${entry.annee}`,
      content: Buffer.from(JSON.stringify({ entries }, null, 2), "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
      branch,
    }),
  });
  if (!save.ok) throw new Error("L'historique n'a pas pu être sauvegardé.");
}

/* ---------- Ligne « Tous » ----------
 * Comme les valeurs des UC sont déjà cumulées, « Tous » = somme des 6 UC, et chaque
 * taux = somme des cumuls / somme des budgets. Les colonnes programme ne sont pas touchées. */
function recalcTous(features: any[], annee: number, mois: string, historique: Changement[]) {
  const tous = features.find(
    (f: any) => Number(f.properties?.["Année"]) === annee && f.properties?.Mois === mois && f.properties?.UC === "Tous"
  );
  if (!tous) throw new Error(`Ligne « Tous » introuvable pour ${mois} ${annee}. Aucune ligne n'a été créée.`);

  const lignes = features.filter(
    (f: any) => Number(f.properties?.["Année"]) === annee && f.properties?.Mois === mois && UC_AGREGEES.includes(f.properties?.UC)
  );

  const valeurs: Record<string, number> = {};
  for (const c of CHAMPS) {
    const somme = (cle: string) => lignes.reduce((s: number, f: any) => s + num(f.properties?.[cle]), 0);
    const cumul = somme(c.d);
    const budget = somme(c.pa);
    valeurs[c.d] = cumul;
    valeurs[c.pa] = budget;
    valeurs[c.tac] = ratio(cumul, budget);
  }
  ecrire(tous.properties, valeurs, "Tous", annee, mois, historique);
}

/* ---------- Handler ---------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GEOJSON_PATH;
  const accessPassword = process.env.PADDI_ACCESS_PASSWORD;
  if (!token || !owner || !repo || !branch || !path || !accessPassword) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { userName, password, imports } = req.body ?? {};

  // 1. Mot de passe (avant toute autre vérification)
  const fourni = Buffer.from(String(password ?? ""));
  const attendu = Buffer.from(accessPassword);
  if (fourni.length !== attendu.length || !timingSafeEqual(fourni, attendu)) {
    return res.status(401).json({ error: "Mot de passe invalide." });
  }

  // 2. Utilisateur
  const nom = typeof userName === "string" ? userName.trim() : "";
  if (!nom || (!ADMIN.has(nom) && !ONGLET_PAR_UTILISATEUR[nom])) {
    return res.status(401).json({ error: "Accès refusé. Utilisateur non autorisé." });
  }

  // 3. Données
  if (!Array.isArray(imports) || imports.length === 0) {
    return res.status(400).json({ error: "Aucune donnée Excel à importer." });
  }
  const ongletsEnvoyes = imports.map((item: any) => String(item?.onglet ?? ""));
  if (ongletsEnvoyes.some((sheet: string) => !UC_PAR_ONGLET[sheet])) {
    return res.status(400).json({ error: "Le fichier contient un onglet UC non autorisé à l'importation." });
  }
  if (!ADMIN.has(nom) && (imports.length !== 1 || ongletsEnvoyes[0] !== ONGLET_PAR_UTILISATEUR[nom])) {
    return res.status(403).json({ error: "Vous n'êtes autorisé à importer que votre onglet Excel." });
  }
  if (new Set(ongletsEnvoyes).size !== ongletsEnvoyes.length) {
    return res.status(400).json({ error: "Un même onglet est présent plusieurs fois dans l'import." });
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    const { metadata, geojson } = await readGitHubFile(apiUrl, branch, headers);
    const historique: Changement[] = [];
    const touched = new Map<string, { annee: number; mois: string }>();

    // Validation complète AVANT toute modification : l'import est tout-ou-rien.
    const prepared: any[] = [];
    for (const item of imports) {
      const expectedUC = UC_PAR_ONGLET[item.onglet];
      if (item.uc !== expectedUC || !Number.isInteger(Number(item.annee)) || !Array.isArray(item.mois) || item.mois.length === 0) {
        return res.status(400).json({ error: `Structure invalide pour l'onglet ${item.onglet}.` });
      }
      if (!item.budget || typeof item.budget !== "object" || !(num(item.budget.total) > 0)) {
        return res.status(400).json({ error: `Budget manquant ou nul pour l'onglet ${item.onglet}.` });
      }
      const year = Number(item.annee);
      const monthRows = [...item.mois].sort((a: any, b: any) => monthIndex(a.mois) - monthIndex(b.mois));
      if (monthRows.some((m: any) => monthIndex(m.mois) < 0) || new Set(monthRows.map((m: any) => m.mois)).size !== monthRows.length) {
        return res.status(400).json({ error: `Nom de mois invalide ou répété dans ${item.onglet}.` });
      }
      // Les cumuls sont recalculés à partir des mois reçus : ils doivent se suivre sans trou.
      const idx0 = monthIndex(monthRows[0].mois);
      if (monthRows.some((m: any, i: number) => monthIndex(m.mois) !== idx0 + i)) {
        return res.status(400).json({ error: `Les mois de ${item.onglet} ne sont pas consécutifs : cumul impossible.` });
      }
      const lignes = monthRows.map((m: any) => {
        const matches = geojson.features.filter(
          (f: any) => Number(f.properties?.["Année"]) === year && f.properties?.Mois === m.mois && f.properties?.UC === expectedUC
        );
        if (matches.length !== 1) {
          throw new Error(`${m.mois} ${year} – ${expectedUC} : ${matches.length === 0 ? "ligne existante introuvable" : "plusieurs lignes correspondantes"}. Aucune ligne n'a été créée.`);
        }
        return { month: m, feature: matches[0] };
      });
      prepared.push({ item, year, uc: expectedUC, monthRows: lignes });
    }

    for (const { item, year, uc, monthRows } of prepared) {
      const cumul: Record<string, number> = {};
      for (const c of CHAMPS) cumul[c.src] = 0;

      for (const { month: m, feature } of monthRows) {
        const valeurs: Record<string, number> = {};
        for (const c of CHAMPS) {
          cumul[c.src] += num(m[c.src]); // cumul annuel jusqu'à ce mois
          const budget = num(item.budget[c.src]);
          valeurs[c.d] = cumul[c.src];
          valeurs[c.pa] = budget;
          valeurs[c.tac] = ratio(cumul[c.src], budget);
        }
        ecrire(feature.properties, valeurs, uc, year, m.mois, historique);
        touched.set(`${year}-${m.mois}`, { annee: year, mois: m.mois });
      }
    }

    // « Tous » : une seule fois par (année, mois).
    for (const t of touched.values()) recalcTous(geojson.features, t.annee, t.mois, historique);

    const saveResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Import des décaissements Excel ${[...new Set(prepared.map((b: any) => b.year))].join(", ")} (${prepared.map((b: any) => b.uc).join(", ")})`,
        content: Buffer.from(JSON.stringify(geojson, null, 2), "utf8").toString("base64"),
        sha: metadata.sha,
        branch,
      }),
    });
    if (saveResponse.status === 409 || saveResponse.status === 422) {
      throw new Error("Le GeoJSON a été modifié par quelqu'un d'autre pendant l'import. Relancez l'importation.");
    }
    if (!saveResponse.ok) throw new Error(`GitHub a refusé l'enregistrement du GeoJSON (${saveResponse.status}).`);

    let historySaved = false;
    try {
      await appendHistory(owner, repo, branch, process.env.HISTORY_PATH || "historique-mises-a-jour.json", headers, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString(),
        utilisateur: nom,
        identifiant: nom,
        annee: prepared[0].year,
        mois: "Import annuel (janvier-décembre)",
        uc: prepared.map((b: any) => b.uc).join(", "),
        nombreColonnesModifiees: historique.length,
        changements: historique,
      });
      historySaved = true;
    } catch (e) {
      console.error("GeoJSON enregistré, historique non enregistré :", e);
    }

    return res.status(200).json({
      success: true,
      historySaved,
      imported: prepared.map((b: any) => ({ onglet: b.item.onglet, uc: b.uc, annee: b.year, mois: b.monthRows.length })),
      message: historySaved ? "Import Excel enregistré avec son historique." : "Import enregistré, mais l'historique n'a pas pu être sauvegardé.",
    });
  } catch (error: any) {
    console.error("Erreur import décaissements :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation Excel." });
  }
}
