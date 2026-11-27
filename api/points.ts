// api/points.ts — version 2
// Ajoute ou déplace un point dans le fichier GeoJSON du dépôt GitHub.
//
// POST /api/points (en-tête x-code-ajout)
//
// 1. Ajout (comportement existant) :
//    { domaine, nom, amenity, lat, lon, adm1_name…adm4_name }
//
// 2. Déplacement (nouveau) :
//    { action: "deplacer", domaine, nom, ancienLat, ancienLon, lat, lon }
//    Le point est retrouvé par son nom exact et sa position actuelle (tolérance ~10 m).
//    Fonctionne aussi pour les points d'origine, qui n'ont pas d'identifiant.

const TOKEN = process.env.GITHUB_TOKEN;
const CODE = process.env.CODE_AJOUT;
const OWNER = process.env.GITHUB_OWNER;
const DEPOT = process.env.GITHUB_REPO;
const REPO = OWNER && DEPOT ? `${OWNER}/${DEPOT}` : undefined;
const BRANCH = process.env.GITHUB_BRANCH ?? "main";

const FICHIERS: Record<string, string> = {
  sante: "public/data/localisation_hopital_mada.geojson",
  education: "public/data/localisation_education_mada.geojson",
};

// Même emprise que la carte (MADA dans AnalyseTerritoriale.tsx)
const MADA = { lonMin: 43.0, lonMax: 50.7, latMin: -25.9, latMax: -11.8 };

// Tolérance pour retrouver un point à sa position actuelle (environ 10 m)
const TOLERANCE = 0.0001;

type Geo = { features?: any[] };

const entetes = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "paddi-ajout",
});

const normNom = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

const dansMada = (lon: number, lat: number) =>
  lon >= MADA.lonMin && lon <= MADA.lonMax && lat >= MADA.latMin && lat <= MADA.latMax;

/** Lit le fichier GeoJSON sur GitHub : sha (pour l'écriture) et contenu. */
async function lireGeo(chemin: string) {
  const api = `https://api.github.com/repos/${REPO}/contents/${chemin}`;
  const lecture = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, { headers: entetes() });
  if (!lecture.ok) {
    const depot = await fetch(`https://api.github.com/repos/${REPO}`, { headers: entetes() });
    const moi = await fetch("https://api.github.com/user", { headers: entetes() });
    return {
      echec: {
        status: 502,
        corps: {
          erreur: "lecture",
          statut: lecture.status,
          repo: JSON.stringify(REPO),
          branche: JSON.stringify(BRANCH),
          chemin,
          test_depot: depot.status,
          test_token: moi.status,
        },
      },
    } as const;
  }
  const meta = await lecture.json();

  const brut = await fetch(meta.download_url, { headers: entetes() });
  if (!brut.ok) return { echec: { status: 502, corps: { erreur: "lecture-contenu" } } } as const;

  return { api, sha: meta.sha as string, geo: JSON.parse(await brut.text()) as Geo };
}

/** Écrit le fichier GeoJSON sur GitHub (un commit). Renvoie null si tout va bien, sinon l'erreur à renvoyer. */
async function ecrireGeo(api: string, sha: string, geo: Geo, message: string) {
  const r = await fetch(api, {
    method: "PUT",
    headers: { ...entetes(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(geo)).toString("base64"),
      sha,
      branch: BRANCH,
    }),
  });
  if (r.status === 409) return { status: 409, corps: { erreur: "conflit" } };
  if (!r.ok) return { status: 502, corps: { erreur: "ecriture" } };
  return null;
}

/** Ajoute un nouveau point. */
async function ajouter(c: any, chemin: string, res: any) {
  const lon = Number(c.lon), lat = Number(c.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return res.status(400).json({ erreur: "position" });

  const lu = await lireGeo(chemin);
  if ("echec" in lu) return res.status(lu.echec.status).json(lu.echec.corps);

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
  lu.geo.features = [...(lu.geo.features ?? []), point];

  const err = await ecrireGeo(lu.api, lu.sha, lu.geo, `Ajout ${c.domaine} : ${point.properties.name}`);
  if (err) return res.status(err.status).json(err.corps);

  return res.status(201).json({ id, feature: point });
}

/** Déplace un point existant vers une nouvelle position. */
async function deplacer(c: any, chemin: string, res: any) {
  const nom = normNom(c.nom);
  const ancienLon = Number(c.ancienLon), ancienLat = Number(c.ancienLat);
  const lon = Number(c.lon), lat = Number(c.lat);
  if (!nom || ![ancienLon, ancienLat, lon, lat].every(Number.isFinite)) {
    return res.status(400).json({ erreur: "champs" });
  }
  if (!dansMada(lon, lat)) return res.status(400).json({ erreur: "hors-mada" });

  const lu = await lireGeo(chemin);
  if ("echec" in lu) return res.status(lu.echec.status).json(lu.echec.corps);

  // Points qui ont le même nom ET la même position actuelle
  const trouves = (lu.geo.features ?? []).filter((f) => {
    if (f?.geometry?.type !== "Point") return false;
    const [x, y] = f.geometry.coordinates ?? [];
    return (
      normNom(f.properties?.name) === nom &&
      Math.abs(x - ancienLon) <= TOLERANCE &&
      Math.abs(y - ancienLat) <= TOLERANCE
    );
  });

  if (!trouves.length) return res.status(404).json({ erreur: "introuvable" });
  // Plusieurs points identiques au même endroit : on n'en déplace aucun, pour ne pas toucher le mauvais
  if (trouves.length > 1) return res.status(409).json({ erreur: "ambigu", nombre: trouves.length });

  trouves[0].geometry = { type: "Point", coordinates: [lon, lat] };

  const err = await ecrireGeo(lu.api, lu.sha, lu.geo, `Déplacement ${c.domaine} : ${nom}`);
  if (err) return res.status(err.status).json(err.corps);

  return res.status(200).json({ ok: true, nom, lat, lon });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ erreur: "methode" });
  if (!TOKEN || !CODE || !REPO) return res.status(500).json({ erreur: "config" });
  if (req.headers["x-code-ajout"] !== CODE) return res.status(401).json({ erreur: "code" });

  const c = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  const chemin = FICHIERS[c.domaine];
  if (!chemin) return res.status(400).json({ erreur: "champs" });

  if (c.action === "deplacer") return deplacer(c, chemin, res);

  if (!c.nom || !c.amenity) return res.status(400).json({ erreur: "champs" });
  return ajouter(c, chemin, res);
}
