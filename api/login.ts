import type { NextApiRequest, NextApiResponse } from "next";
import { timingSafeEqual } from "crypto";

const USERS: Record<string, string> = {
  "zo.ravelonirina@giz.de": "Zo",
  "anjarampifohazana.toky@giz.de": "Toky",
  "joary.andriamiharimanana@giz.de": "Joary",
  "allan.hong-wa@giz.de": "Allan",
  "nantenaina.herimanga@giz.de": "Herimanga",
  "tolojanahary.velomahafaly@giz.de": "Njaka",
  "mmichael.raharifidinarivo@giz.de": "Michael",
  "tsinjoharinosy.rahaingoarivelo@giz.de": "Tsinjo",
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const attendu = process.env.PADDI_ACCESS_PASSWORD;
  if (!attendu) return res.status(500).json({ error: "Configuration serveur incomplète." });

  const { email, password } = req.body ?? {};
  const a = Buffer.from(String(password ?? ""));
  const b = Buffer.from(attendu);
  const motDePasseOk = a.length === b.length && timingSafeEqual(a, b);
  const userName = USERS[String(email ?? "").trim().toLowerCase()];

  // Même message dans les deux cas, pour ne pas révéler quels e-mails existent.
  if (!motDePasseOk || !userName) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }
  return res.status(200).json({ userName });
}
