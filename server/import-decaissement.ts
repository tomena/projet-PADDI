/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";

/* =====================================================================
 * api/import-decaissement.ts : met à jour public/data/Base_Decaissement.geojson
 *
 * Deux niveaux, deux formes de données :
 *
 *  - « instrument » (onglet « CL-Dépenses ») : MONTANTS MENSUELS.
 *    Une ligne = (Année, Mois) dans geojson.features, colonnes des 8 instruments + Total.
 *    Budgets alloués par instrument dans geojson.budgets.
 *
 *  - « composante » (onglet « CL-Outputs ») : CUMULS PAR SEMESTRE.
 *    Une ligne = une date de situation (06/2025, 06/2026, 12/2026, 06/2027).
 *    Stockage dans geojson.composantes_semestre (tableau séparé des features) :
 *      { periode, annee, semestre, cumul: { "Output 0"..."Output 4", Total } }
 *    Les valeurs sont les cumuls tels qu'affichés dans l'Excel (« COÛTS 06/2026 », etc.).
 *    Le « Total » est calculé par le serveur (somme des 5 Outputs), jamais accepté en entrée.
 *    Le pop-up calcule le décaissement d'un semestre comme la différence avec le cumul précédent.
 *    Budgets par Output dans geojson.budgets_composantes.
 *
 * Un champ non envoyé n'écrase rien. Les lignes manquantes sont créées.
 * Tout-ou-rien : toute la validation passe avant la moindre écriture.
 *
 * Droits : Céline et les administrateurs.
 * L'historique est écrit dans HISTORY_PATH (défaut historique-mises-a-jour.json) :
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

// Colonnes mensuelles des features (niveau instrument). Les Outputs restent présents à null pour garder la forme existante.
const COLONNES_BASE = [...INSTRUMENTS, "Total", ...OUTPUTS];

// Clés qu'on accepte en saisie, par niveau
const CLES_SAISIE: Record<string, string[]> = {
  instrument: [...INSTRUMENTS, "Total"],
  composante: OUTPUTS,
};

// Clés de budgets acceptées, par niveau
const CLES_BUDGET: Record<string, string[]> = {
  instrument: [...INSTRUMENTS, "Total"],
  composante: OUTPUTS,
};

const LIBELLE_NIVEAU: Record<string, string> = {
  instrument: "Décaissement par instrument",
  composante: "Décaissement par composante (Output)",
};

// Dates de situation de l'onglet CL-Outputs (colonnes « COÛTS … »). La colonne « COÛTS XX » est ignorée.
type Periode = { periode: string; annee: number; semestre: "S1" | "S2" };
const PERIODES_COMPOSANTES: Periode[] = [
  { periode: "06/2025", annee: 2025, semestre: "S1" },
  { periode: "06/2026", annee: 2026, semestre: "S1" },
  { periode: "12/2026", annee: 2026, semestre: "S2" },
  { periode: "06/2027", annee: 2027, semestre: "S1" },
];

const indexPeriode = (p: string) => PERIODES_COMPOSANTES.findIndex((x) => x.periode === p);

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
  if (niveau !== "instrument" && niveau !== "composante") {
    return res.status(400).json({ error: "Niveau invalide (instrument ou composante)." });
  }
  const clesSaisie = CLES_SAISIE[niveau];

  const lignes = req.body?.lignes;
  if (!Array.isArray(lignes) || lignes.length === 0) return res.status(400).json({ error: "Aucune ligne à importer." });
  if (lignes.length > 120) return res.status(400).json({ error: "Trop de lignes (120 maximum par import)." });

  const vues = new Set<string>();
  for (const l of lignes) {
    let cle: string;
    if (niveau === "instrument") {
      const annee = Number(l?.annee);
      if (!Number.isInteger(annee) || annee < 2024 || annee > 2031) return res.status(400).json({ error: `Année invalide : ${l?.annee}.` });
      if (!MOIS.includes(l?.mois)) return res.status(400).json({ error: `Mois invalide : ${l?.mois}.` });
      cle = `${annee}|${l.mois}`;
    } else {
      if (indexPeriode(String(l?.periode)) === -1) {
        return res.status(400).json({
          error: `Période invalide : ${l?.periode}. Attendu : ${PERIODES_COMPOSANTES.map((p) => p.periode).join(", ")}.`,
        });
      }
      cle = String(l.periode);
    }
    const valeurs = l?.valeurs;
    if (!valeurs || typeof valeurs !== "object" || Object.keys(valeurs).length === 0) {
      return res.status(400).json({ error: `Aucune valeur pour ${cle}.` });
    }
    for (const [c, v] of Object.entries(valeurs)) {
      if (!clesSaisie.includes(c)) return res.status(400).json({ error: `Colonne « ${c} » non autorisée pour le niveau ${niveau}.` });
      if (nombre(v) === null) return res.status(400).json({ error: `Valeur non numérique pour « ${c} » (${cle}).` });
    }
    if (vues.has(cle)) return res.status(400).json({ error: `${cle} est présent plusieurs fois.` });
    vues.add(cle);
  }

  // Budgets alloués (instrument ou composante)
  const budgets = req.body?.budgets;
  if (budgets !== undefined && budgets !== null) {
    if (typeof budgets !== "object" || Array.isArray(budgets)) return res.status(400).json({ error: "Budgets invalides." });
    for (const [c, v] of Object.entries(budgets)) {
      const x = nombre(v);
      if (!CLES_BUDGET[niveau].includes(c) || x === null || x < 0) {
        return res.status(400).json({ error: `Budget invalide pour « ${c} ».` });
      }
    }
  }

  const chemin = process.env.GEOJSON_DECAISSEMENT_PATH || "public/data/Base_Decaissement.geojson";
  const url = urlContenu(owner, repo, chemin);
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    const { sha, geojson } = await lireGeoJSON(url, branch, headers);
    const historique: Changement[] = [];
    const avertissements: string[] = [];
    let creees = 0;
    let anneeHistorique = 0;

    if (niveau === "instrument") {
      /* ----- Montants mensuels par instrument ----- */
      const features: any[] = geojson.features;

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

      for (const l of lignes) {
        const annee = Number(l.annee);
        anneeHistorique = Math.max(anneeHistorique, annee);
        ecrire(obtenir(annee, l.mois).properties, l.valeurs, LIBELLE_NIVEAU[niveau], annee, l.mois, historique);
      }

      if (creees > 0) {
        features.sort(
          (x, y) =>
            Number(x.properties["Année"]) - Number(y.properties["Année"]) ||
            MOIS.indexOf(x.properties.Mois) - MOIS.indexOf(y.properties.Mois)
        );
      }
    } else {
      /* ----- Cumuls par composante (Output) à chaque semestre ----- */
      if (!Array.isArray(geojson.composantes_semestre)) geojson.composantes_semestre = [];
      const entrees: any[] = geojson.composantes_semestre;

      for (const l of lignes) {
        const i = indexPeriode(String(l.periode));
        const ref = PERIODES_COMPOSANTES[i];
        anneeHistorique = Math.max(anneeHistorique, ref.annee);

        let entree = entrees.find((e) => e.periode === ref.periode);
        if (!entree) {
          entree = { periode: ref.periode, annee: ref.annee, semestre: ref.semestre, cumul: {} };
          entrees.push(entree);
          creees++;
        }

        ecrire(entree.cumul, l.valeurs, LIBELLE_NIVEAU[niveau], ref.annee, ref.periode, historique);

        // Total = somme des 5 Outputs, recalculé seulement si les 5 sont connus
        if (OUTPUTS.every((o) => nombre(entree.cumul[o]) !== null)) {
          const total = OUTPUTS.reduce((s, o) => s + Number(entree.cumul[o]), 0);
          ecrire(entree.cumul, { Total: total }, LIBELLE_NIVEAU[niveau], ref.annee, ref.periode, historique);
        }

        // Contrôle : un cumul ne doit pas baisser d'un semestre à l'autre (avertissement, pas blocage)
        if (i > 0) {
          const prec = entrees.find((e) => e.periode === PERIODES_COMPOSANTES[i - 1].periode);
          if (prec) {
            for (const o of OUTPUTS) {
              const nouv = Number(entree.cumul[o]);
              const anc = Number(prec.cumul?.[o]);
              if (Number.isFinite(nouv) && Number.isFinite(anc) && nouv < anc) {
                avertissements.push(`${o} : ${ref.periode} (${nouv}) est inférieur à ${PERIODES_COMPOSANTES[i - 1].periode} (${anc}).`);
              }
            }
          }
        }
      }

      entrees.sort((a, b) => indexPeriode(a.periode) - indexPeriode(b.periode));
    }

    // Budgets alloués : geojson.budgets (instrument) ou geojson.budgets_composantes (composante)
    if (budgets && Object.keys(budgets).length > 0) {
      const cleBudgets = niveau === "instrument" ? "budgets" : "budgets_composantes";
      if (!geojson[cleBudgets] || typeof geojson[cleBudgets] !== "object") geojson[cleBudgets] = {};
      for (const [c, brute] of Object.entries(budgets as Record<string, number>)) {
        const valeur = arrondi(brute);
        const ancienne = geojson[cleBudgets][c] ?? null;
        if (!memeValeur(ancienne, valeur)) {
          historique.push({ colonne: `Budget alloué — ${c}`, ancienneValeur: ancienne, nouvelleValeur: valeur, uc: LIBELLE_NIVEAU[niveau], annee: 0, mois: "" });
        }
        geojson[cleBudgets][c] = valeur;
      }
    }

    // Enregistrement
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
        annee: anneeHistorique,
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
    const unite = niveau === "instrument" ? "mois" : "période(s)";
    let message = modifiees === 0
      ? `Aucune valeur n'a changé (${lignes.length} ${unite} vérifié(s)).`
      : `${modifiees} valeur(s) mise(s) à jour sur ${lignes.length} ${unite}${creees ? `, dont ${creees} ligne(s) créée(s)` : ""}.`;
    if (!historySaved) message += " L'historique n'a pas pu être sauvegardé.";

    return res.status(200).json({ success: true, historySaved, message, modifiees, creees, avertissements });
  } catch (error: any) {
    console.error("Erreur import décaissement :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation." });
  }
}
