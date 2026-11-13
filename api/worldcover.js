const WMS = "https://services.terrascope.be/wms/v2";

// Cache en mémoire de la couche trouvée (réinitialisé à chaque démarrage de la fonction)
let cacheCouche = { nom: null, at: 0 };

/** Interroge GetCapabilities et choisit la couche WorldCover 2021 réellement disponible. */
async function trouverCouche() {
  if (cacheCouche.nom && Date.now() - cacheCouche.at < 24 * 3600 * 1000) return cacheCouche.nom;

  const r = await fetch(`${WMS}?service=WMS&version=1.3.0&request=GetCapabilities`);
  const xml = await r.text();
  if (!r.ok) throw new Error(`GetCapabilities HTTP ${r.status}`);

  const noms = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => m[1].trim());
  const candidats = noms.filter((n) => /worldcover/i.test(n) && /2021/.test(n));
  const choisi = candidats.find((n) => /map/i.test(n)) ?? candidats[0];

  if (!choisi) {
    throw new Error("Couche WorldCover 2021 introuvable. Couches disponibles : " + noms.slice(0, 40).join(", "));
  }
  cacheCouche = { nom: choisi, at: Date.now() };
  return choisi;
}

export default async function handler(req, res) {
  const minLon = Number(req.query.minLon);
  const minLat = Number(req.query.minLat);
  const maxLon = Number(req.query.maxLon);
  const maxLat = Number(req.query.maxLat);
  const w = Math.min(2000, Math.max(16, Math.round(Number(req.query.w))));
  const h = Math.min(2000, Math.max(16, Math.round(Number(req.query.h))));

  if ([minLon, minLat, maxLon, maxLat, w, h].some((v) => !Number.isFinite(v))) {
    return res.status(400).json({ erreur: "Paramètres invalides (minLon, minLat, maxLon, maxLat, w, h)" });
  }

  try {
    const couche = await trouverCouche();

    // WMS 1.3.0 avec EPSG:4326 : l'ordre des coordonnées BBOX est lat,lon
    const params = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetMap",
      LAYERS: couche,
      STYLES: "",
      CRS: "EPSG:4326",
      BBOX: `${minLat},${minLon},${maxLat},${maxLon}`,
      WIDTH: String(w),
      HEIGHT: String(h),
      FORMAT: "image/png",
      TRANSPARENT: "TRUE",
    });

    const r = await fetch(`${WMS}?${params}`);
    const type = r.headers.get("content-type") || "";

    if (!r.ok || !type.startsWith("image/")) {
      const txt = await r.text();
      console.error("WorldCover GetMap :", r.status, type, txt.slice(0, 500));
      return res.status(502).json({
        erreur: `GetMap (couche ${couche}) : ${txt.slice(0, 300)}`,
      });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("WorldCover :", e);
    res.status(502).json({ erreur: "WorldCover : " + (e?.message || "injoignable") });
  }
}
