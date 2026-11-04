/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";

/* api/derniere-maj.ts
 *  - GET  (sans jeton) : date de la dernière mise à jour, tous utilisateurs confondus
 *                        -> affichée dans l'en-tête de la page « Suivi des coûts ».
 *  - POST { token }    : date de la dernière mise à jour de l'utilisateur connecté
 *                        -> affichée dans la fenêtre « Mise à jour des données ».
 * Lit historique-mises-a-jour.json (alimenté par api/import-couts.ts).
 * Avec ?source=indicateurs (GET) ou { source: "indicateurs" } (POST) : lit à la place
 * historique-indicateurs.json (alimenté par api/import-indicateurs.ts).
 * Variables : GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, AUTH_SECRET,
 * et optionnellement HISTORY_PATH. */

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

/* Secours : date du dernier enregistrement du GeoJSON dans GitHub (utilisée seulement
 * si l'historique des imports n'existe pas encore ou ne contient aucune entrée). */
async function dateDernierCommit(owner: string, repo: string, branch: string, token: string, chemin: string | undefined): Promise<number | null> {
  if (!chemin) return null;
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(chemin)}&per_page=1`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store",
    }
  );
  if (!r.ok) return null;
  const liste = await r.json();
  const t = Date.parse(liste?.[0]?.commit?.committer?.date);
  return Number.isFinite(t) ? t : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const authSecret = process.env.AUTH_SECRET;
  if (!token || !owner || !repo || !branch || !authSecret) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  // POST : l'utilisateur doit être connecté. GET : date globale, publique.
  let nom: string | null = null;
  if (req.method === "POST") {
    nom = lireJeton(req.body?.token, authSecret);
    if (!nom) return res.status(401).json({ error: "Session expirée ou invalide." });
  }

  const indicateurs = (req.query?.source ?? req.body?.source) === "indicateurs";
  const chemin = indicateurs
    ? process.env.HISTORY_INDICATEURS_PATH || "historique-indicateurs.json"
    : process.env.HISTORY_PATH || "historique-mises-a-jour.json";
  const cheminDonnees = indicateurs
    ? process.env.GEOJSON_INDICATEURS_PATH || "public/data/Base_Indicateurs.geojson"
    : process.env.GEOJSON_PATH;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/` + chemin.split("/").map(encodeURIComponent).join("/");

  try {
    // Accept « raw » : fonctionne même si le fichier dépasse 1 Mo (l'historique grossit à chaque import).
    const r = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    let derniere: number | null = null;

    if (r.status !== 404) { // 404 = aucun historique encore
      if (!r.ok) throw new Error(`Lecture de l'historique impossible (${r.status}).`);
      const parsed = JSON.parse(await r.text());
      const entries: any[] = Array.isArray(parsed.entries) ? parsed.entries : [];
      for (const e of entries) {
        if (nom && e?.utilisateur !== nom && e?.identifiant !== nom) continue; // GET : toutes les entrées
        const t = Date.parse(e?.date);
        if (Number.isFinite(t) && (derniere === null || t > derniere)) derniere = t;
      }
    }

    // En-tête de la page : à défaut d'historique, on prend le dernier enregistrement du GeoJSON.
    if (derniere === null && req.method === "GET") derniere = await dateDernierCommit(owner, repo, branch, token, cheminDonnees);

    if (req.method === "GET") {
      // Court cache : évite d'appeler GitHub à chaque visite, tout en restant à jour à la minute près.
      res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    }
    return res.status(200).json({ date: derniere === null ? null : new Date(derniere).toISOString() });
  } catch (e: any) {
    console.error("Erreur dernière mise à jour :", e);
    return res.status(500).json({ error: e?.message || "Erreur serveur." });
  }
}
