/// <reference types="node" />
import type { VercelRequest as NextApiRequest, VercelResponse as NextApiResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";

/* =====================================================================
 * api/zones-intervention.ts : enregistrement des zones d'intervention
 *
 * PUT /api/zones-intervention
 *   En-tête : Authorization: Bearer <jeton renvoyé par /api/auth>
 *   Corps    : FeatureCollection GeoJSON (projets + features), voir zones_intervention.geojson
 *
 * Contrôles :
 *  1. jeton signé (HMAC) et non expiré ;
 *  2. l'email du jeton figure dans ZONES_EDITEURS (liste vide = personne n'est autorisé) ;
 *  3. le GeoJSON est valide (projets connus, régions renseignées, commune avec district, MBV positif).
 *
 * Variables d'environnement :
 *  AUTH_SECRET (même valeur que pour /api/auth), ZONES_EDITEURS (emails séparés par des virgules),
 *  GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH (même dépôt que les autres données),
 *  optionnelle : ZONES_PATH (défaut : public/data/zones_intervention.geojson).
 *
 * Remarque : chaque enregistrement crée un commit ; Vercel redéploie alors le site,
 * et les nouvelles données sont visibles après le redéploiement (environ une à deux minutes).
 * ===================================================================== */

const CHEMIN = process.env.ZONES_PATH || "public/data/zones_intervention.geojson";
const MAX_OCTETS = 2_000_000;
const TYPES_PROJET = ["environnement", "developpement"];

const egal = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/* Renvoie le prénom et l'email du jeton, ou null si le jeton est invalide ou expiré */
function lireJeton(jeton: string, secret: string): { u: string; e?: string } | null {
  const [payload, signature] = jeton.split(".");
  if (!payload || !signature) return null;
  const attendue = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!egal(signature, attendue)) return null;

  let data: any;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof data.exp !== "number" || Date.now() > data.exp) return null;
  return { u: String(data.u ?? ""), e: data.e ? String(data.e).trim().toLowerCase() : undefined };
}

/* Renvoie un message d'erreur, ou null si le GeoJSON est valide */
function validerDonnees(corps: any): string | null {
  if (!corps || corps.type !== "FeatureCollection" || !Array.isArray(corps.projets) || !Array.isArray(corps.features)) {
    return "Format GeoJSON invalide.";
  }
  const idsProjets = new Set<string>();
  for (const p of corps.projets) {
    if (!p?.id || !p?.nom || !TYPES_PROJET.includes(p.type)) return "Projet invalide (id, nom et type requis).";
    idsProjets.add(String(p.id));
  }
  for (const f of corps.features) {
    const pr = f?.properties;
    if (!pr?.projet_id || !pr?.region) return "Zone invalide : projet_id et region sont requis.";
    if (!idsProjets.has(String(pr.projet_id))) return `Projet inconnu : ${pr.projet_id}.`;
    if (pr.commune && !pr.district) return `Commune « ${pr.commune} » sans district.`;
    if (pr.mbv_ha != null && (typeof pr.mbv_ha !== "number" || pr.mbv_ha < 0)) {
      return `Superficie MBV invalide pour « ${pr.commune ?? pr.region} ».`;
    }
  }
  return null;
}

/* Écrit le fichier dans le dépôt GitHub (même principe que pour les utilisateurs) */
async function ecrireDansGitHub(contenu: string, auteur: string) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  if (!token || !owner || !repo || !branch) throw new Error("CONFIG");

  const url =
    `https://api.github.com/repos/${owner}/${repo}/contents/` + CHEMIN.split("/").map(encodeURIComponent).join("/");
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // SHA du fichier actuel (nécessaire pour une mise à jour)
  let sha: string | undefined;
  const lecture = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (lecture.ok) sha = (await lecture.json()).sha;
  else if (lecture.status !== 404) throw new Error(`Lecture du fichier impossible (${lecture.status}).`);

  const ecriture = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Mise à jour des zones d'intervention (${auteur})`,
      content: Buffer.from(contenu, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
      branch,
    }),
  });
  if (ecriture.status === 409 || ecriture.status === 422) {
    throw new Error("Un autre enregistrement était en cours. Veuillez réessayer.");
  }
  if (!ecriture.ok) throw new Error(`Enregistrement impossible (${ecriture.status}).`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Méthode non autorisée." });

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return res.status(500).json({ error: "Configuration serveur incomplète." });

  /* 1. Jeton */
  const entete = String(req.headers.authorization ?? "");
  const jeton = entete.startsWith("Bearer ") ? entete.slice(7).trim() : "";
  const info = jeton ? lireJeton(jeton, secret) : null;
  if (!info) return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });

  /* 2. Droit de modifier les zones */
  const editeurs = (process.env.ZONES_EDITEURS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!info.e) return res.status(403).json({ error: "Reconnectez-vous pour mettre à jour les zones." });
  if (!editeurs.includes(info.e)) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à mettre à jour les zones d'intervention." });
  }

  /* 3. Données */
  const corps = req.body;
  const contenu = JSON.stringify({ ...corps, mise_a_jour: new Date().toISOString().slice(0, 10) }, null, 2);
  if (Buffer.byteLength(contenu, "utf8") > MAX_OCTETS) return res.status(413).json({ error: "Fichier trop volumineux." });

  const erreur = validerDonnees(corps);
  if (erreur) return res.status(400).json({ error: erreur });

  try {
    await ecrireDansGitHub(contenu, info.u || info.e);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("Erreur zones-intervention :", e);
    const message = e?.message === "CONFIG" ? "Configuration serveur incomplète." : e?.message || "Erreur serveur.";
    return res.status(500).json({ error: message });
  }
}
