const OVERPASS = "https://overpass-api.de/api/interpreter";

const REQUETES = {
  routes: (b) => `way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${b});`,
  rivieres: (b) => `way["waterway"~"^(river|canal)$"](${b});`,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erreur: "POST attendu" });
  const { couche, bbox } = req.body || {};
  const requete = REQUETES[couche];
  if (!requete || !bbox) return res.status(400).json({ erreur: "couche ou bbox invalide" });

  const { minLat, minLon, maxLat, maxLon } = bbox;
  if ([minLat, minLon, maxLat, maxLon].some((v) => !Number.isFinite(v))) {
    return res.status(400).json({ erreur: "bbox invalide" });
  }

  // Overpass attend (sud, ouest, nord, est)
  const q = `[out:json][timeout:25];(${requete(`${minLat},${minLon},${maxLat},${maxLon}`)});out geom;`;
  try {
    const r = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PADDI-plus/1.0" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!r.ok) return res.status(502).json({ erreur: `Overpass HTTP ${r.status}` });
    const j = await r.json();

    const features = (j.elements || []).filter((e) => e.geometry).map((e) => ({
      type: "Feature",
      properties: { nom: e.tags?.name || "", type: e.tags?.highway || e.tags?.waterway || "" },
      geometry: { type: "LineString", coordinates: e.geometry.map((p) => [p.lon, p.lat]) },
    }));

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.json({ type: "FeatureCollection", features });
  } catch (e) {
    res.status(502).json({ erreur: `Overpass injoignable : ${e?.message || e}` });
  }
}
