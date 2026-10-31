import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";

/* =====================================================================
 * api/auth.ts : connexion + changement de mot de passe
 *
 * - Mots de passe personnels : stockés HACHÉS (scrypt + sel) dans un fichier
 *   JSON du dépôt GitHub (par défaut « utilisateurs.json »). DÉPÔT PRIVÉ OBLIGATOIRE.
 * - Tant qu'un utilisateur n'a pas choisi son mot de passe, c'est le mot de passe
 *   initial (variable PADDI_ACCESS_PASSWORD) qui est accepté, et il doit le changer.
 * - Après connexion : jeton signé (HMAC) de 8 h, vérifié par l'API d'import.
 *
 * Variables d'environnement : GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH,
 * PADDI_ACCESS_PASSWORD (mot de passe initial), AUTH_SECRET (≥ 32 caractères aléatoires).
 * Optionnelles : USERS_PATH, USERS_OWNER, USERS_REPO, USERS_BRANCH.
 * ===================================================================== */

const UTILISATEURS: Record<string, string> = {
  "zo.ravelonirina@giz.de": "Zo",
  "anjarampifohazana.toky@giz.de": "Toky",
  "joary.andriamiharimanana@giz.de": "Joary",
  "allan.hong-wa@giz.de": "Allan",
  "nantenaina.herimanga@giz.de": "Herimanga",
  "tolojanahary.velomahafaly@giz.de": "Njaka",
  "mmichael.raharifidinarivo@giz.de": "Michael",
  "tsinjoharinosy.rahaingoarivelo@giz.de": "Tsinjo",
};

const LONGUEUR_MIN = 10;
const LONGUEUR_MAX = 200;
const DUREE_JETON_MS = 8 * 60 * 60 * 1000;

type Entree = { salt: string; hash: string; maj: string };
type Store = { users: Record<string, Entree> };

/* ---------- Outils de sécurité ---------- */
function egal(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function deriver(motDePasse: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(motDePasse, salt, 64, (err: Error | null, cle: Buffer) => (err ? reject(err) : resolve(cle)))
  );
}

async function creerEntree(motDePasse: string): Promise<Entree> {
  const salt = randomBytes(16);
  const hash = await deriver(motDePasse, salt);
  return { salt: salt.toString("hex"), hash: hash.toString("hex"), maj: new Date().toISOString() };
}

async function verifierEntree(motDePasse: string, e: Entree): Promise<boolean> {
  const cle = await deriver(motDePasse, Buffer.from(e.salt, "hex"));
  const attendu = Buffer.from(e.hash, "hex");
  return cle.length === attendu.length && timingSafeEqual(cle, attendu);
}

function signer(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function creerJeton(userName: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userName, exp: Date.now() + DUREE_JETON_MS })).toString("base64url");
  return `${payload}.${signer(payload, secret)}`;
}

/* ---------- Stockage GitHub ---------- */
function configGitHub() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.USERS_OWNER || process.env.GITHUB_OWNER;
  const repo = process.env.USERS_REPO || process.env.GITHUB_REPO;
  const branch = process.env.USERS_BRANCH || process.env.GITHUB_BRANCH;
  const path = process.env.USERS_PATH || "utilisateurs.json";
  if (!token || !owner || !repo || !branch) throw new Error("CONFIG");
  return {
    branch,
    url: `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/"),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  };
}
type ConfigGitHub = ReturnType<typeof configGitHub>;

async function lireStore(c: ConfigGitHub): Promise<{ store: Store; sha?: string }> {
  const r = await fetch(`${c.url}?ref=${encodeURIComponent(c.branch)}`, { headers: c.headers, cache: "no-store" });
  if (r.status === 404) return { store: { users: {} } }; // aucun mot de passe personnel pour l'instant
  if (!r.ok) throw new Error(`Lecture des utilisateurs impossible (${r.status}).`);
  const meta = await r.json();
  const texte = Buffer.from(String(meta.content ?? "").replace(/\n/g, ""), "base64").toString("utf8");
  const parsed = texte.trim() ? JSON.parse(texte) : {};
  return { store: { users: parsed.users && typeof parsed.users === "object" ? parsed.users : {} }, sha: meta.sha };
}

async function ecrireStore(c: ConfigGitHub, store: Store, sha: string | undefined, message: string) {
  const r = await fetch(c.url, {
    method: "PUT",
    headers: { ...c.headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(store, null, 2), "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
      branch: c.branch,
    }),
  });
  if (r.status === 409 || r.status === 422) throw new Error("Un autre changement était en cours. Veuillez réessayer.");
  if (!r.ok) throw new Error(`Enregistrement du mot de passe impossible (${r.status}).`);
}

/* ---------- Handler ---------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const secret = process.env.AUTH_SECRET;
  const motDePasseInitial = process.env.PADDI_ACCESS_PASSWORD;
  if (!secret || secret.length < 32 || !motDePasseInitial) {
    console.error("Configuration auth incomplète : AUTH_SECRET (≥ 32 car.) et PADDI_ACCESS_PASSWORD requis.");
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { action, email, password, currentPassword, newPassword } = req.body ?? {};
  const mail = String(email ?? "").trim().toLowerCase();
  const userName = UTILISATEURS[mail];
  const refus = { error: "Email ou mot de passe incorrect." }; // même message dans tous les cas

  if (action !== "login" && action !== "change") return res.status(400).json({ error: "Action inconnue." });
  if (!userName) return res.status(401).json(refus);

  try {
    const c = configGitHub();
    const { store, sha } = await lireStore(c);
    const entree = store.users[mail];

    const motDePasseValide = async (saisi: string) => {
      if (saisi.length === 0 || saisi.length > LONGUEUR_MAX) return false;
      return entree ? verifierEntree(saisi, entree) : egal(saisi, motDePasseInitial);
    };

    if (action === "login") {
      if (!(await motDePasseValide(String(password ?? "")))) return res.status(401).json(refus);
      return res.status(200).json({ userName, token: creerJeton(userName, secret), mustChange: !entree });
    }

    // action === "change"
    const actuel = String(currentPassword ?? "");
    const nouveau = String(newPassword ?? "");
    if (!(await motDePasseValide(actuel))) return res.status(401).json(refus);

    if (nouveau.length < LONGUEUR_MIN) {
      return res.status(400).json({ error: `Le nouveau mot de passe doit contenir au moins ${LONGUEUR_MIN} caractères.` });
    }
    if (nouveau.length > LONGUEUR_MAX) {
      return res.status(400).json({ error: "Le nouveau mot de passe est trop long." });
    }
    if (nouveau === actuel || egal(nouveau, motDePasseInitial)) {
      return res.status(400).json({ error: "Choisissez un mot de passe différent de l'actuel et du mot de passe initial." });
    }

    store.users[mail] = await creerEntree(nouveau);
    await ecrireStore(c, store, sha, `Mot de passe mis à jour : ${userName}`);
    return res.status(200).json({ userName, token: creerJeton(userName, secret), mustChange: false });
  } catch (e: any) {
    console.error("Erreur auth :", e);
    const message = e?.message === "CONFIG" ? "Configuration serveur incomplète." : e?.message || "Erreur serveur.";
    return res.status(500).json({ error: message });
  }
}
