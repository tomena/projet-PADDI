/**
 * api/osm-territoire.js
 * Route Vercel (Node 18+, sans Python).
 *
 * POST /api/osm-territoire
 *   corps : { geometry: GeoJSON Polygon | MultiPolygon }
 *   réponse : santé, éducation, marchés, commerces et routes issus d'OpenStreetMap.
 *
 * Source : Overpass API. © contributeurs OpenStreetMap, licence ODbL.
 *
 * Si votre package.json contient "type": "module", remplacez
 * « module.exports = async function handler » par « export default async function handler ».
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const DELAI_MS = 12000;          // délai maximum par requête Overpass
const TTL_MS = 24 * 3600 * 1000; // durée du cache serveur : 24 h
const CACHE_MAX = 100;           // nombre maximum de zones en cache
const RINGS_MAX = 20;            // nombre maximum de polygones d'une même zone
const POINTS_MAX = 150;          // sommets maximum envoyés à Overpass par anneau
const AIRE_ROUTES_MAX_KM2 = 2500; // au-delà, les routes ne sont pas demandées (trop lourd)

const SANTE = ["hospital", "clinic", "doctors", "health_post", "health_centre"];
const PHARMA = ["pharmacy"];
const ECOLES = ["school", "kindergarten"];
const SUP = ["college", "university"];
const MARCHE = ["marketplace"];
const SHOPS = ["supermarket", "convenience", "general", "wholesale", "kiosk"];
const ROUTES = ["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "track"];

const cache = new Map();

/* ----------------------------- géométrie ----------------------------- */

function anneaux(geometry) {
  if (!geometry || typeof geometry !== "object") return null;
  let polygones;
  if (geometry.type === "Polygon") polygones = [geometry.coordinates];
  else if (geometry.type === "MultiPolygon") polygones = geometry.coordinates;
  else return null;
  const exterieurs = (polygones || [])
    .map((p) => p && p[0])
    .filter((r) => Array.isArray(r) && r.length >= 4);
  exterieurs.sort((a, b) => b.length - a.length);
  return exterieurs.slice(0, RINGS_MAX);
}

// Réduit le nombre de sommets pour rester dans la limite d'Overpass.
function echantillon(ring) {
  const pas = Math.max(1, Math.ceil(ring.length / POINTS_MAX));
  const pts = [];
  for (let i = 0; i < ring.length; i += pas) pts.push(ring[i]);
  return pts;
}

// Format attendu par Overpass : « lat lon lat lon … »
const polyStr = (ring) => ring.map(([lon, lat]) => `${lat} ${lon}`).join(" ");

function aireKm2(ring) {
  const k = Math.cos((ring[0][1] * Math.PI) / 180) * 111.32;
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += ring[j][0] * k * ring[i][1] * 110.54 - ring[i][0] * k * ring[j][1] * 110.54;
  }
  return Math.abs(s / 2);
}

function centroide(ring) {
  const n = ring.length;
  const lon = ring.reduce((s, p) => s + p[0], 0) / n;
  const lat = ring.reduce((s, p) => s + p[1], 0) / n;
  return { lon, lat };
}

// Distance à vol d'oiseau entre deux points (km)
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const arrondi = (v, d = 1) =>
  v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d;

/* ----------------------------- requêtes Overpass ----------------------------- */

function requetePoints(rings) {
  const blocs = [];
  const amenites = [...SANTE, ...PHARMA, ...ECOLES, ...SUP, ...MARCHE].join("|");
  const shops = SHOPS.join("|");
  for (const r of rings) {
    const p = `(poly:"${polyStr(r)}")`;
    blocs.push(`nwr["amenity"~"^(${amenites})$"]${p};`);
    blocs.push(`nwr["shop"~"^(${shops})$"]${p};`);
  }
  return `[out:json][timeout:25];(${blocs.join("")});out center tags;`;
}

function requeteRoutes(rings) {
  const hw = ROUTES.join("|");
  const blocs = rings.map((r) => `way["highway"~"^(${hw})$"](poly:"${polyStr(r)}");`);
  return `[out:json][timeout:25];(${blocs.join("")});out geom;`;
}

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function overpass(requete) {
  let derniere = "Overpass indisponible";
  for (let tour = 0; tour < 2; tour++) {
    for (const url of ENDPOINTS) {
      const ctl = new AbortController();
      const minuteur = setTimeout(() => ctl.abort(), DELAI_MS);
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(requete),
          signal: ctl.signal,
        });
        if (r.status === 429 || r.status === 504) {
          derniere = `HTTP ${r.status}`;
          continue;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        return Array.isArray(j.elements) ? j.elements : [];
      } catch (e) {
        derniere = e.name === "AbortError" ? "délai dépassé" : e.message;
      } finally {
        clearTimeout(minuteur);
      }
    }
    await pause(3000);
  }
  throw new Error(derniere);
}

/* ----------------------------- calculs ----------------------------- */

function pointsDe(elements) {
  const out = [];
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    out.push({ lat, lon, amenity: e.tags?.amenity, shop: e.tags?.shop });
  }
  return out;
}

function calcul(rings, elements, ways, avecRoutes) {
  const c = centroide(rings[0]);
  const aire = rings.reduce((s, r) => s + aireKm2(r), 0);
  const pts = pointsDe(elements);

  const parType = (liste) => pts.filter((p) => liste.includes(p.amenity));
  const plusProche = (liste) =>
    liste.length
      ? arrondi(Math.min(...liste.map((p) => distKm(c.lat, c.lon, p.lat, p.lon))), 1)
      : null;

  const sante = parType(SANTE);
  const pharma = parType(PHARMA);
  const ecoles = parType(ECOLES);
  const sup = parType(SUP);
  const marches = parType(MARCHE);
  const commerces = pts.filter((p) => SHOPS.includes(p.shop));

  let routes = null;
  if (avecRoutes) {
    let total = 0, nat = 0, sec = 0, pistes = 0;
    for (const w of ways) {
      if (!Array.isArray(w.geometry)) continue;
      let l = 0;
      for (let i = 1; i < w.geometry.length; i++) {
        const a = w.geometry[i - 1], b = w.geometry[i];
        l += distKm(a.lat, a.lon, b.lat, b.lon);
      }
      const h = w.tags?.highway;
      total += l;
      if (["motorway", "trunk", "primary"].includes(h)) nat += l;
      else if (h === "track") pistes += l;
      else sec += l;
    }
    routes = {
      total_km: arrondi(total, 1),
      nationales_km: arrondi(nat, 1),
      secondaires_km: arrondi(sec, 1),
      pistes_km: arrondi(pistes, 1),
      densite_100km2: aire > 0 ? arrondi((total / aire) * 100, 1) : null,
    };
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    aire_km2: arrondi(aire, 1),
    centre: { lat: arrondi(c.lat, 4), lon: arrondi(c.lon, 4) },
    sante: {
      etablissements: sante.length,
      pharmacies: pharma.length,
      distance_km: plusProche(sante),
    },
    education: {
      ecoles: ecoles.length,
      superieur: sup.length,
      distance_km: plusProche(ecoles),
    },
    marches: {
      marches: marches.length,
      commerces: commerces.length,
      distance_km: plusProche(marches),
    },
    routes,
    source: "OpenStreetMap (Overpass API), © contributeurs OpenStreetMap, ODbL",
  };
}

/* ----------------------------- handler ----------------------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erreur: "methode" });

  let corps = req.body;
  if (typeof corps === "string") {
    try {
      corps = JSON.parse(corps);
    } catch {
      return res.status(400).json({ erreur: "json" });
    }
  }

  const rings = anneaux(corps?.geometry);
  if (!rings || !rings.length) return res.status(400).json({ erreur: "geometrie" });

  const cle = JSON.stringify(corps.geometry);
  const hit = cache.get(cle);
  if (hit && Date.now() - hit.t < TTL_MS) return res.status(200).json(hit.data);

  const aire = rings.reduce((s, r) => s + aireKm2(r), 0);
  const avecRoutes = aire <= AIRE_ROUTES_MAX_KM2;

  try {
    const echantillons = rings.map(echantillon);
    // Requêtes successives (et non parallèles) pour ménager le service public Overpass
    const elements = await overpass(requetePoints(echantillons));
    const ways = avecRoutes ? await overpass(requeteRoutes(echantillons)) : [];
    const data = calcul(rings, elements, ways, avecRoutes);

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(cle, { t: Date.now(), data });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ erreur: e.message || "overpass" });
  }
};
