import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";

/* api/derniere-maj.ts : date de la dernière mise à jour faite par l'utilisateur connecté.
 * Lit historique-mises-a-jour.json (alimenté par api/import-couts.ts).
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

  const nom = lireJeton(req.body?.token, authSecret);
  if (!nom) return res.status(401).json({ error: "Session expirée ou invalide." });

  const chemin = process.env.HISTORY_PATH || "historique-mises-a-jour.json";
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
    if (r.status === 404) return res.status(200).json({ date: null }); // aucun historique encore
    if (!r.ok) throw new Error(`Lecture de l'historique impossible (${r.status}).`);

    const parsed = JSON.parse(await r.text());
    const entries: any[] = Array.isArray(parsed.entries) ? parsed.entries : [];

    // La plus récente parmi les entrées de cet utilisateur.
    let derniere: number | null = null;
    for (const e of entries) {
      if (e?.utilisateur !== nom && e?.identifiant !== nom) continue;
      const t = Date.parse(e?.date);
      if (Number.isFinite(t) && (derniere === null || t > derniere)) derniere = t;
    }

    return res.status(200).json({ date: derniere === null ? null : new Date(derniere).toISOString() });
  } catch (e: any) {
    console.error("Erreur dernière mise à jour :", e);
    return res.status(500).json({ error: e?.message || "Erreur serveur." });
  }
}
