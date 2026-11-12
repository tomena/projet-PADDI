/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";

/* =====================================================================
 * server/update-feux.ts : met à jour public/data/Bases_Feux.geojson dans GitHub
 * à partir des lignes converties depuis l'Excel « Bases_Feux ».
 *
 * Mode FUSION (et non plus remplacement complet) :
 *  - l'utilisateur choisit UNE année et UN ou PLUSIEURS mois ;
 *  - pour chaque ligne (District + AP + Année + Commune + Source) déjà présente,
 *    seuls les mois choisis sont modifiés, Total est recalculé ;
 *  - si la ligne n'existe pas (nouvelle année, nouvelle commune...), elle est ajoutée ;
 *  - aucune ligne n'est jamais supprimée.
 *
 * Sécurité (inchangée) :
 *  - l'identité vient du jeton de session signé (AUTH_SECRET), jamais du navigateur ;
 *  - seul l'utilisateur de UTILISATEURS_AUTORISES peut écrire ;
 *  - le serveur REVALIDE chaque ligne et reconstruit lui-même le GeoJSON ;
 *  - l'enregistrement est un commit GitHub (l'historique Git sert de sauvegarde),
 *    protégé par le SHA contre les écritures simultanées.
 *
 * Corps de requête attendu :
 *   { token, lignes, annee, mois }   // mois = ["Janvier", "Février", ...]
 *
 * Variables d'environnement :
 *   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, AUTH_SECRET
 *   FEUX_GEOJSON_PATH   (optionnelle) défaut : public/data/Bases_Feux.geojson
 * ===================================================================== */

const UTILISATEURS_AUTORISES = new Set(["Toky"]); // anjarampifohazana.toky@giz.de
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const SOURCES = ["5km", "Interieur", "Commune"];

type Props = Record<string, string | number | null>;

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

/* ---------- Validation stricte : on ne fait pas confiance au navigateur ---------- */
function nombreOuNull(v: unknown, champ: string, n: number): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1e9) throw new Error(`Ligne ${n} : « ${champ} » invalide.`);
  return v;
}
function texteNonVide(v: unknown, champ: string, n: number): string {
  if (typeof v !== "string" || v.trim() === "" || v.length > 200) throw new Error(`Ligne ${n} : « ${champ} » vide ou invalide.`);
  return v.trim();
}

// Reconstruit chaque ligne avec exactement les champs attendus, dans l'ordre du fichier actuel.
// Le Total de l'Excel est ignoré : il est recalculé à la fusion (somme des 12 mois).
function nettoyer(lignes: any[]): Props[] {
  return lignes.map((l, i) => {
    const n = i + 1;
    if (!l || typeof l !== "object") throw new Error(`Ligne ${n} invalide.`);
    const annee = l["Année"];
    if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) throw new Error(`Ligne ${n} : année invalide.`);
    const source = texteNonVide(l.Source, "Source", n);
    if (!SOURCES.includes(source)) throw new Error(`Ligne ${n} : Source « ${source} » inattendue (5km, Interieur ou Commune).`);

    const p: Props = {
      District: texteNonVide(l.District, "District", n),
      AP: texteNonVide(l.AP, "AP", n),
      "Année": annee,
      Commune: texteNonVide(l.Commune, "Commune", n),
    };
    for (const m of MOIS) p[m] = nombreOuNull(l[m], m, n);
    p.Total = 0; // recalculé plus tard
    p.Source = source;
    return p;
  });
}

// Clé d'identification d'une ligne
const cle = (p: Props) => [p.District, p.AP, p["Année"], p.Commune, p.Source].join("|");

// Total = somme des 12 mois
const somme = (p: Props) =>
  MOIS.reduce((s, m) => s + (typeof p[m] === "number" ? (p[m] as number) : 0), 0);

// Même mise en forme que le fichier actuel : une feature par ligne.
function serialiser(lignes: Props[]): string {
  const features = lignes.map((p) => JSON.stringify({ type: "Feature", properties: p, geometry: null }));
  return `{\n"type": "FeatureCollection",\n"name": "Bases_Feux",\n"features": [\n${features.join(",\n")}\n]\n}\n`;
}

/* ---------- Handler ---------- */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.FEUX_GEOJSON_PATH || "public/data/Bases_Feux.geojson";
  const authSecret = process.env.AUTH_SECRET;
  if (!token || !owner || !repo || !branch || !authSecret) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { token: jeton, lignes, annee, mois } = req.body ?? {};

  // 1. Session : le nom vient du jeton signé.
  const nom = lireJeton(jeton, authSecret);
  if (!nom) return res.status(401).json({ error: "Session expirée ou invalide. Reconnectez-vous." });

  // 2. Droits
  if (!UTILISATEURS_AUTORISES.has(nom)) {
    return res.status(403).json({ error: "Accès refusé : vous n'êtes pas autorisé à mettre à jour la base des feux." });
  }

  // 3. Données
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ error: "Aucune ligne à importer." });
  }
  if (lignes.length > 50000) return res.status(400).json({ error: "Fichier trop volumineux." });

  // 4. Choix de l'année et des mois
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) {
    return res.status(400).json({ error: "Choisissez l'année à mettre à jour." });
  }
  if (!Array.isArray(mois) || mois.length === 0 || !mois.every((m: unknown) => typeof m === "string" && MOIS.includes(m))) {
    return res.status(400).json({ error: "Choisissez au moins un mois valide." });
  }
  const moisChoisis: string[] = MOIS.filter((m) => mois.includes(m)); // dédoublonné, dans l'ordre

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    // Uniquement les lignes de l'année choisie
    const propres = nettoyer(lignes).filter((p) => p["Année"] === annee);
    if (propres.length === 0) throw new Error(`Aucune ligne de l'année ${annee} dans le fichier Excel.`);

    // Fichier actuel : SHA (pour écrire) + contenu (pour fusionner)
    let sha: string | undefined;
    let existantes: Props[] = [];
    const meta = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
    if (meta.ok) {
      sha = (await meta.json()).sha;
      const brut = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: { ...headers, Accept: "application/vnd.github.raw+json" },
        cache: "no-store",
      });
      if (!brut.ok) throw new Error(`Lecture du GeoJSON actuel impossible (${brut.status}).`);
      const actuel = JSON.parse(await brut.text());
      existantes = (Array.isArray(actuel.features) ? actuel.features : []).map((f: any) => f.properties as Props);
    } else if (meta.status !== 404) {
      throw new Error(`Lecture des métadonnées GitHub impossible (${meta.status}).`);
    }

    // Fusion
    const index = new Map<string, number>();
    existantes.forEach((p, i) => index.set(cle(p), i));

    let modifiees = 0;
    let ajoutees = 0;
    for (const nouv of propres) {
      const i = index.get(cle(nouv));
      if (i === undefined) {
        // Nouvelle ligne : on ne remplit que les mois choisis
        const p: Props = { ...nouv };
        for (const m of MOIS) if (!moisChoisis.includes(m)) p[m] = null;
        p.Total = somme(p);
        index.set(cle(p), existantes.push(p) - 1);
        ajoutees++;
      } else {
        // Ligne existante : seuls les mois choisis sont modifiés
        const p = existantes[i];
        for (const m of moisChoisis) p[m] = nouv[m];
        p.Total = somme(p);
        modifiees++;
      }
    }

    const save = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Mise à jour Bases_Feux ${annee} (${moisChoisis.join(", ")}) par ${nom}`,
        content: Buffer.from(serialiser(existantes), "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
        branch,
      }),
    });
    if (save.status === 409 || save.status === 422) {
      throw new Error("Le fichier a été modifié par quelqu'un d'autre pendant l'import. Relancez l'importation.");
    }
    if (!save.ok) throw new Error(`GitHub a refusé l'enregistrement (${save.status}).`);

    return res.status(200).json({
      success: true,
      modifiees,
      ajoutees,
      message: `Base des feux mise à jour (${annee} : ${moisChoisis.join(", ")}) : ${modifiees} ligne(s) modifiée(s), ${ajoutees} ajoutée(s).`,
    });
  } catch (error: any) {
    console.error("Erreur import feux :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation." });
  }
}
