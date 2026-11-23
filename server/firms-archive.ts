/// <reference types="node" />
// Handler appelé par le dispatcher api/*.ts avec ?type=firms-archive (pas de fonction Vercel supplémentaire).
// Relais vers l'API NASA FIRMS. La clé FIRMS_MAP_KEY reste côté serveur (jamais envoyée au navigateur).
// Paramètres : source=VIIRS_SNPP_SP & bbox=west,south,east,north & day=YYYY-MM-DD & n=1..5

const SOURCES = new Set([
  "VIIRS_SNPP_SP", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT",
]);
const NUM = "-?\\d+(?:\\.\\d+)?";
const BBOX = new RegExp(`^${NUM},${NUM},${NUM},${NUM}$`);

export default async function handler(req: any, res: any) {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return res.status(500).send("FIRMS_MAP_KEY absente côté serveur");

  const { source, bbox, day, n } = (req.query ?? {}) as Record<string, string>;
  const nn = Number(n);
  if (!SOURCES.has(source) || !BBOX.test(bbox ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(day ?? "") || !(nn >= 1 && nn <= 5)) {
    return res.status(400).send("Paramètres invalides");
  }
  // Évite les requêtes sur de très grandes zones (la fiche ne demande que le rectangle d'une commune)
  const [w, s, e, no] = bbox.split(",").map(Number);
  if (e - w > 3 || no - s > 3) return res.status(400).send("Zone trop grande");

  try {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/${bbox}/${nn}/${day}`);
    const text = await r.text();
    const ok = r.ok && text.trim().toLowerCase().startsWith("latitude");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    // Les données passées ne changent pas : mise en cache côté Vercel pour limiter les appels à FIRMS
    res.setHeader("Cache-Control", ok ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store");
    return res.status(r.ok ? 200 : r.status).send(ok ? text : text.replace(key, "***").slice(0, 200));
  } catch {
    return res.status(502).send("FIRMS injoignable");
  }
}
