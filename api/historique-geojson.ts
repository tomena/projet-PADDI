/// <reference types="node" />

// Colonnes propres à la page « Suivi des activités » (pas celles du suivi des coûts)
const COLONNE_ACTIVITE = /^(TAG|NAP|NAA|NAC|NAD|TAR \d|TAC C\d|TAA \d\.\d\.\d)$/;
const nomColonne = (c: any) =>
  String(c?.colonne ?? c?.champ ?? c?.field ?? c?.nomColonne ?? "");

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Méthode non autorisée." });
    }

    const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, AUTH_SECRET } = process.env;
    const branch = process.env.GITHUB_BRANCH || "main";
    const historyPath = process.env.HISTORY_PATH || "historique-mises-a-jour.json";

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !AUTH_SECRET) {
      return res.status(500).json({ error: "Configuration serveur incomplète sur Vercel." });
    }

    // Chargé ici (et non en haut du fichier) pour que toute erreur soit renvoyée proprement
    const { createHmac, timingSafeEqual } = await import("crypto");

    const entete = String(req.headers?.authorization || "");
    const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";

    const [payload, signature] = jeton.split(".");
    if (!payload || !signature) {
      return res.status(401).json({ error: "Session expirée ou invalide." });
    }

    const attendu = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(attendu);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "Session expirée ou invalide." });
    }

    let valide = false;
    try {
      const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      valide = typeof u === "string" && typeof exp === "number" && exp > Date.now();
    } catch {
      valide = false;
    }
    if (!valide) {
      return res.status(401).json({ error: "Session expirée ou invalide." });
    }

    const url =
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/` +
      historyPath.split("/").map(encodeURIComponent).join("/") +
      `?ref=${encodeURIComponent(branch)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.status === 404) return res.status(200).json({ entries: [] });

    if (!response.ok) {
      console.error("Erreur de lecture historique GitHub:", await response.text());
      return res.status(502).json({ error: `Lecture GitHub impossible (${response.status}).` });
    }

    const history = JSON.parse(await response.text());
    const toutes: any[] = Array.isArray(history.entries) ? history.entries : [];

    const entries = toutes
      .map((e: any) => ({
        ...e,
        changements: (Array.isArray(e.changements) ? e.changements : []).filter((c: any) =>
          COLONNE_ACTIVITE.test(nomColonne(c))
        ),
      }))
      .filter((e: any) => e.changements.length > 0)
      .sort((x: any, y: any) => Date.parse(y.date) - Date.parse(x.date));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ entries });
  } catch (error: any) {
    console.error("Erreur API historique:", error);
    return res.status(500).json({ error: `Erreur serveur : ${error?.message || error}` });
  }
}
