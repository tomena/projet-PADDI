import { fromUrl } from "geotiff";

// Données ESA WorldCover 2021 v200, tuiles de 3°x3° publiques sur AWS (sans clé).
const BASE = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map";
const MAX_COTE = 1000; // nombre max d'échantillons par côté et par tuile
const CULTURES = 40;   // code de la classe « Cropland » dans WorldCover

const pad = (n, k) => String(n).padStart(k, "0");

/** Liste les tuiles 3°x3° qui recouvrent la boîte englobante. */
function tuiles(minLon, minLat, maxLon, maxLat) {
  const out = [];
  const lat0 = Math.floor(minLat / 3) * 3, lat1 = Math.floor(maxLat / 3) * 3;
  const lon0 = Math.floor(minLon / 3) * 3, lon1 = Math.floor(maxLon / 3) * 3;
  for (let la = lat0; la <= lat1; la += 3)
    for (let lo = lon0; lo <= lon1; lo += 3) {
      const ns = la >= 0 ? "N" : "S", ew = lo >= 0 ? "E" : "W";
      out.push({ nom: `${ns}${pad(Math.abs(la), 2)}${ew}${pad(Math.abs(lo), 3)}` });
    }
  return out;
}

/** Point dans un anneau (ray casting). Coordonnées [lon, lat]. */
const dansAnneau = (x, y, anneau) => {
  let o = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi, yi] = anneau[i], [xj, yj] = anneau[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o;
  }
  return o;
};
const dansPoly = (x, y, polys) =>
  polys.some((p) => dansAnneau(x, y, p[0]) && !p.slice(1).some((h) => dansAnneau(x, y, h)));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erreur: "POST attendu" });

  const g = req.body?.geometry;
  if (!g || !g.coordinates) return res.status(400).json({ erreur: "geometry manquante" });
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;

  let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
  for (const p of polys)
    for (const [x, y] of p[0]) {
      minLon = Math.min(minLon, x); maxLon = Math.max(maxLon, x);
      minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y);
    }

  let total = 0, cult = 0;
  const classes = {};
  const erreurs = [];

  for (const t of tuiles(minLon, minLat, maxLon, maxLat)) {
    try {
      const tif = await fromUrl(`${BASE}/ESA_WorldCover_10m_2021_v200_${t.nom}_Map.tif`);
      const img = await tif.getImage();
      const [x0, y0, x1, y1] = img.getBoundingBox();
      const [rx, ry] = img.getResolution();
      const ay = Math.abs(ry);
      const W = img.getWidth(), H = img.getHeight();

      // partie de la zone qui tombe dans cette tuile
      const cx0 = Math.max(minLon, x0), cx1 = Math.min(maxLon, x1);
      const cy0 = Math.max(minLat, y0), cy1 = Math.min(maxLat, y1);
      if (cx0 >= cx1 || cy0 >= cy1) continue;

      const c0 = Math.max(0, Math.floor((cx0 - x0) / rx));
      const c1 = Math.min(W, Math.ceil((cx1 - x0) / rx));
      const r0 = Math.max(0, Math.floor((y1 - cy1) / ay));
      const r1 = Math.min(H, Math.ceil((y1 - cy0) / ay));
      const ww = c1 - c0, hh = r1 - r0;
      if (ww <= 0 || hh <= 0) continue;

      // sur-échantillonnage pour les grandes zones (limite le temps de calcul)
      const pas = Math.max(1, Math.ceil(Math.max(ww, hh) / MAX_COTE));
      const outW = Math.ceil(ww / pas), outH = Math.ceil(hh / pas);
      const [data] = await img.readRasters({
        window: [c0, r0, c1, r1], width: outW, height: outH, samples: [0], resampleMethod: "nearest",
      });

      for (let j = 0; j < outH; j++) {
        const lat = y1 - (r0 + (j + 0.5) * pas) * ay;
        for (let i = 0; i < outW; i++) {
          const v = data[j * outW + i];
          if (!v) continue; // 0 = hors donnée
          const lon = x0 + (c0 + (i + 0.5) * pas) * rx;
          if (!dansPoly(lon, lat, polys)) continue;
          total++;
          classes[v] = (classes[v] || 0) + 1;
          if (v === CULTURES) cult++;
        }
      }
    } catch (e) {
      erreurs.push(`${t.nom}: ${e?.message || e}`);
      console.error("WorldCover tuile", t.nom, e);
    }
  }

  if (!total) {
    return res.status(502).json({ erreur: "Aucun pixel WorldCover dans la zone. " + erreurs.join(" ; ") });
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ pct: (cult / total) * 100, echantillons: total, classes, erreurs });
}
