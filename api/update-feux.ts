/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";

/* =====================================================================
 * api/update-feux.ts : remplace public/data/Bases_Feux.geojson dans GitHub
 * avec les lignes converties depuis l'Excel « Bases_Feux ».
 *
 * Même principe que l'import des décaissements :
 *  - l'identité vient du jeton de session signé (AUTH_SECRET), jamais du navigateur ;
 *  - seul l'utilisateur de UTILISATEURS_AUTORISES peut écrire ;
 *  - le serveur REVALIDE chaque ligne et reconstruit lui-même le GeoJSON ;
 *  - l'enregistrement est un commit GitHub (l'historique Git sert de sauvegarde),
 *    protégé par le SHA contre les écritures simultanées.
 *
 * Variables d'environnement déjà utilisées par vos autres routes :
 *   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, AUTH_SECRET
 * Nouvelle variable (optionnelle) :
 *   FEUX_GEOJSON_PATH   défaut : public/data/Bases_Feux.geojson
 *   (ne réutilisez pas GEOJSON_PATH : c'est le fichier des coûts)
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
    const total = nombreOuNull(l.Total, "Total", n);
    if (total === null) throw new Error(`Ligne ${n} : « Total » manquant.`);
    p.Total = total;
    p.Source = source;
    return p;
  });
}

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

  const { token: jeton, lignes, confirmeSuppression } = req.body ?? {};

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

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    const propres = nettoyer(lignes);

    // Fichier actuel : SHA (pour écrire) + nombre de lignes (garde-fou contre un fichier amputé).
    let sha: string | undefined;
    let nbActuel = 0;
    const meta = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
    if (meta.ok) {
      sha = (await meta.json()).sha;
      const brut = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: { ...headers, Accept: "application/vnd.github.raw+json" },
        cache: "no-store",
      });
      if (!brut.ok) throw new Error(`Lecture du GeoJSON actuel impossible (${brut.status}).`);
      const actuel = JSON.parse(await brut.text());
      nbActuel = Array.isArray(actuel.features) ? actuel.features.length : 0;
    } else if (meta.status !== 404) {
      throw new Error(`Lecture des métadonnées GitHub impossible (${meta.status}).`);
    }

    if (nbActuel > 0 && propres.length < nbActuel * 0.9 && confirmeSuppression !== true) {
      return res.status(400).json({
        error: `Le fichier contient ${propres.length} lignes contre ${nbActuel} actuellement. Confirmez le remplacement dans la fenêtre d'import.`,
      });
    }

    const save = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Mise à jour Bases_Feux (${propres.length} lignes) par ${nom}`,
        content: Buffer.from(serialiser(propres), "utf8").toString("base64"),
        ...(sha ? { sha } : {}),
        branch,
      }),
    });
    if (save.status === 409 || save.status === 422) {
      throw new Error("Le fichier a été modifié par quelqu'un d'autre pendant l'import. Relancez l'importation.");
    }
    if (!save.ok) throw new Error(`GitHub a refusé l'enregistrement (${save.status}).`);

    return res.status(200).json({ success: true, lignes: propres.length, message: "Base des feux mise à jour." });
  } catch (error: any) {
    console.error("Erreur import feux :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation." });
  }
}
