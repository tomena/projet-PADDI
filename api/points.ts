// api/points.ts — ajoute un point dans le fichier GeoJSON du dépôt GitHub
// POST /api/points (en-tête x-code-ajout) avec { domaine, nom, amenity, lat, lon, adm1_name…adm4_name }
const TOKEN = process.env.GITHUB_TOKEN;
const CODE = process.env.CODE_AJOUT;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH ?? "main";

const FICHIERS: Record<string, string> = {
  sante: "public/data/localisation_hopital_mada.geojson",
  education: "public/data/localisation_education_mada.geojson",
};

const entetes = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "paddi-ajout",
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ erreur: "methode" });
  if (!TOKEN || !CODE || !REPO) return res.status(500).json({ erreur: "config" });
  if (req.headers["x-code-ajout"] !== CODE) return res.status(401).json({ erreur: "code" });

  const c = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  const chemin = FICHIERS[c.domaine];
  if (!chemin || !c.nom || !c.amenity) return res.status(400).json({ erreur: "champs" });
  const lon = Number(c.lon), lat = Number(c.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return res.status(400).json({ erreur: "position" });

  const api = `https://api.github.com/repos/${REPO}/contents/${chemin}`;

  // 1. Lire le fichier actuel (métadonnées : sha, adresse du contenu brut)
  const lecture = await fetch(`${api}?ref=${BRANCH}`, { headers: entetes() });
  if (!lecture.ok) return res.status(502).json({ erreur: "lecture" });
  const meta = await lecture.json();

  // 2. Lire le contenu brut (fonctionne aussi pour les gros fichiers)
  const brut = await fetch(meta.download_url, { headers: entetes() });
  if (!brut.ok) return res.status(502).json({ erreur: "lecture-contenu" });
  const geo = JSON.parse(await brut.text());

  // 3. Ajouter le point
  const id = `ajout/${Date.now()}`;
  const point = {
    type: "Feature",
    properties: {
      id,
      name: String(c.nom).slice(0, 200),
      amenity: String(c.amenity).slice(0, 40),
      adm1_name: String(c.adm1_name ?? ""),
      adm2_name: String(c.adm2_name ?? ""),
      adm3_name: String(c.adm3_name ?? ""),
      adm4_name: String(c.adm4_name ?? ""),
    },
    geometry: { type: "Point", coordinates: [lon, lat] },
  };
  geo.features = [...(geo.features ?? []), point];

  // 4. Enregistrer dans le dépôt (commit)
  const ecriture = await fetch(api, {
    method: "PUT",
    headers: { ...entetes(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Ajout ${c.domaine} : ${point.properties.name}`,
      content: Buffer.from(JSON.stringify(geo)).toString("base64"),
      sha: meta.sha,
      branch: BRANCH,
    }),
  });
  if (ecriture.status === 409) return res.status(409).json({ erreur: "conflit" });
  if (!ecriture.ok) return res.status(502).json({ erreur: "ecriture" });

  return res.status(201).json({ id, feature: point });
}
