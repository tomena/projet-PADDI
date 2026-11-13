const WMS = "https://services.terrascope.be/wms/v2";
const LAYER_PAR_DEFAUT = "WORLDCOVER_2021_MAP"; // utilisée si GetCapabilities échoue

const EN_TETES = {
  "User-Agent": "Mozilla/5.0 (compatible; PADDI-plus/1.0)",
  Accept: "*/*",
};

let cacheCouche = { nom: null, at: 0 };

/** Requête avec nouvelles tentatives (ECONNRESET, timeouts, erreurs 5xx). */
async function fetchAvecRetry(url, essais = 3) {
  let derniere;
  for (let i = 1; i <= essais; i++) {
    try {
      const r = await fetch(url, { headers: EN_TETES, signal: AbortSignal.timeout(20000) });
      if (r.status >= 500 && i < essais) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      derniere = e;
      if (i < essais) await new Promise((ok) => setTimeout(ok, 800 * i));
    }
  }
  throw derniere;
}

function detailErreur(e) {
  const c = e?.cause || {};
  return [e?.message, c.code, c.message].filter(Boolean).join(" | ");
}

async function trouverCouche() {
  if (cacheCouche.nom && Date.now() - cacheCouche.at < 24 * 3600 * 1000) return cacheCouche.nom;
  try {
    const r = await fetchAvecRetry(`${WMS}?service=WMS&version=1.3.0&request=GetCapabilities`);
    if (!r.ok) throw new Error(`GetCapabilities HTTP ${r.status}`);
    const xml = await r.text();
    const noms = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => m[1].trim());
    const candidats = noms.filter((n) => /worldcover/i.test(n) && /2021/.test(n));
    const choisi = candidats.find((n) => /map/i.test(n)) ?? candidats[0];
    if (choisi) {
      cacheCouche = { nom: choisi, at: Date.now() };
      return choisi;
    }
    console.warn("Couches trouvées :", noms.slice(0, 40).join(", "));
  } catch (e) {
    console.warn("GetCapabilities échoué, couche par défaut :", detailErreur(e));
  }
  return LAYER_PAR_DEFAUT;
}

export default async function handler(req, res) {
  const minLon = Number(req.query.minLon), minLat = Number(req.query.minLat);
  const maxLon = Number(req.query.maxLon), maxLat = Number(req.query.maxLat);
  const w = Math.min(2000, Math.max(16, Math.round(Number(req.query.w))));
  const h = Math.min(2000, Math.max(16, Math.round(Number(req.query.h))));

  if ([minLon, minLat, maxLon, maxLat, w, h].some((v) => !Number.isFinite(v))) {
    return res.status(400).json({ erreur: "Paramètres invalides (minLon, minLat, maxLon, maxLat, w, h)" });
  }

  try {
    const couche = await trouverCouche();
    const params = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetMap",
      LAYERS: couche,
      STYLES: "",
      CRS: "EPSG:4326",
      BBOX: `${minLat},${minLon},${maxLat},${maxLon}`, // WMS 1.3.0 + EPSG:4326 : lat,lon
      WIDTH: String(w),
      HEIGHT: String(h),
      FORMAT: "image/png",
      TRANSPARENT: "TRUE",
    });

    const r = await fetchAvecRetry(`${WMS}?${params}`);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) {
      const txt = await r.text();
      return res.status(502).json({ erreur: `GetMap (couche ${couche}) HTTP ${r.status} : ${txt.slice(0, 300)}` });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("WorldCover :", e, e?.cause);
    res.status(502).json({ erreur: `WorldCover : ${detailErreur(e) || "injoignable"}` });
  }
}
