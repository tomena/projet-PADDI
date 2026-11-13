/**
 * AnalyseTerritoriale.tsx — Madagascar : Région → District → Commune → Parcelle tracée
 *
 * Disposition : à gauche 5 cartes d'information (territoire, occupation du sol, déforestation,
 * relief et pente, points de feux), à droite UNE carte de Madagascar qui superpose
 * l'occupation du sol, la perte de couvert arboré et les points de feux.
 * Le bouton « Analyser ce territoire » ouvre une fenêtre (pop-up) avec les orientations
 * classées par thème : restauration, agriculture, eau et sols, feux, conservation, communautés.
 *
 * Dépendances : leaflet, @types/leaflet, lucide-react.
 *
 * Données :
 *  - Limites : geoBoundaries (en ligne, plusieurs miroirs essayés en parallèle)
 *  - Occupation du sol : Esri / Impact Observatory Sentinel-2 10 m
 *  - Cultures (second avis) : ESA WorldCover 2021 via /api/worldcover (Terrascope)
 *  - Perte de couvert : tuiles Global Forest Watch (carte) + POST /api/gfw-perte (chiffres, clé côté serveur)
 *  - Points de feux : GET /api/firms (NASA FIRMS, la même route que votre page « Zones de pression »)
 *  - Altitude / pluie : Open-Meteo (pluie = moyenne annuelle sur RAIN_YEARS ans). Bassins versants : BASSINS_GEOJSON_URL (à fournir).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronRight, RotateCcw, PenTool, Check, X, Trash2 } from "lucide-react";

/* ===================== CONFIGURATION ===================== */

type Level = "ADM1" | "ADM2" | "ADM3";

const NOM_CLES = ["shapename", "nom_region", "region", "nom_district", "district", "nom_commune", "commune",
  "adm3_fr", "adm2_fr", "adm1_fr", "name_3", "name_2", "name_1", "nom", "name", "libelle"];

const BASSINS_GEOJSON_URL = ""; // ex. "/data/bassins_versants.geojson"
const LC_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LOSS_FIRST = 2001, LOSS_LAST = 2025; // période de la perte de couvert arboré (GFW)
const LOSS_YEARS = Array.from({ length: LOSS_LAST - LOSS_FIRST + 1 }, (_, i) => LOSS_FIRST + i);
const RAIN_YEARS = 5; // nombre d'années pour la pluie moyenne (modifiable : 10, etc.)
const RAIN_LAST = 2025; // dernière année complète
const RAIN_FIRST = RAIN_LAST - RAIN_YEARS + 1; // 2021
const FONDS = {
  sat: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
};
const MADA: L.LatLngBoundsExpression = [[-25.9, 43.0], [-11.8, 50.7]];
const LAURITE = "#ff7a3d", CYAN = "#22d3ee", COULEUR_PERTE = "#dc6c9a";

const ESRI = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage";
type Box = { minLon: number; minLat: number; maxLon: number; maxLat: number };
const esriUrl = (b: Box, W: number, H: number, year: number) =>
  `${ESRI}?f=image&format=png&bbox=${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}&bboxSR=4326&imageSR=4326&size=${W},${H}` +
  `&interpolation=RSP_NearestNeighbor&time=${Date.UTC(year, 0, 1)},${Date.UTC(year, 11, 31)}`;
const lossUrl = (from: number, to: number) =>
  `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=${from}&end_year=${to}&tcd=30&render_type=true_color`;

const GH = "wmgeolab/geoBoundaries", REV = "9469f09";
const sources = (l: Level) => {
  const f = `releaseData/gbOpen/MDG/${l}/geoBoundaries-MDG-${l}_simplified.geojson`;
  return [`https://raw.githubusercontent.com/${GH}/${REV}/${f}`, `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`];
};

const CLASSES = [
  { n: "Couvert arboré", c: [57, 125, 73] },
  { n: "Savane et parcours", c: [227, 226, 195] },
  { n: "Cultures", c: [228, 150, 53] },
  { n: "Bâti", c: [196, 40, 27] },
  { n: "Sol nu", c: [165, 155, 143] },
  { n: "Eau", c: [65, 155, 223] },
  { n: "Végétation inondée, mangrove", c: [122, 135, 198] },
  { n: "Neige et glace", c: [168, 235, 255] },
  { n: "Nuages", c: [97, 97, 97] },
];
const N_VALID = 8;
const rgb = (c: number[]) => `rgb(${c.join(",")})`;
const SLOPES = [
  { n: "Plat, moins de 5 %", max: 5, col: "#7fb069" },
  { n: "Modérée, 5 à 15 %", max: 15, col: "#e6c84f" },
  { n: "Forte, 15 à 30 %", max: 30, col: "#e08a3c" },
  { n: "Très forte, plus de 30 %", max: 1e9, col: "#b23a2e" },
];
const RANG = { l: 1, n: 2, h: 3 } as const;
const couleurAge = (age: number) => (age <= 24 ? "rgb(200,15,15)" : age <= 48 ? "#f97316" : "#facc15");

/* ===================== GÉOMÉTRIE ===================== */

type Ring = number[][];
type Feat = { type?: string; properties: Record<string, any>; geometry: { type: string; coordinates: any } };

const polys = (f: Feat): Ring[][] => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
const inRing = (x: number, y: number, r: Ring) => {
  let o = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) o = !o;
  return o;
};
const inFeat = (x: number, y: number, f: Feat) =>
  polys(f).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
const bbox = (f: Feat): Box => {
  let a = 180, b = 90, c = -180, d = -90;
  polys(f).forEach((p) => p[0].forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }));
  return { minLon: a, minLat: b, maxLon: c, maxLat: d };
};
const bigRing = (f: Feat) => [...polys(f)].sort((p, q) => q[0].length - p[0].length)[0][0];
const center = (f: Feat): [number, number] => {
  const r = bigRing(f);
  return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
};
const childOf = (c: Feat, p: Feat) => {
  const [cx, cy] = center(c), r = bigRing(c);
  let hits = inFeat(cx, cy, p) ? 3 : 0;
  for (let i = 0; i < 5; i++) {
    const q = r[Math.floor((i * r.length) / 5)];
    if (inFeat(q[0] * 0.8 + cx * 0.2, q[1] * 0.8 + cy * 0.2, p)) hits++;
  }
  return hits >= 5;
};
const areaKm2 = (f: Feat) => {
  const ring = (r: Ring) => {
    const k = Math.cos(((r[0][1] || 0) * Math.PI) / 180) * 111.32;
    let s = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] * k) * (r[i][1] * 110.54) - (r[i][0] * k) * (r[j][1] * 110.54);
    return Math.abs(s / 2);
  };
  return polys(f).reduce((t, p) => t + ring(p[0]) - p.slice(1).reduce((h, r) => h + ring(r), 0), 0);
};
const lisible = (x: unknown): x is string => typeof x === "string" && x.trim() !== "" && !/^[\d\s.\-]*$/.test(x.trim());
const nameOf = (f: Feat) => {
  const p = f.properties || {};
  const keys = Object.keys(p);
  for (const k of NOM_CLES) {
    const real = keys.find((x) => x.toLowerCase() === k);
    if (real && lisible(p[real])) return p[real].trim();
  }
  const v = Object.values(p).find(lisible);
  return v ? v.trim() : "Sans nom";
};
const nf = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const fmtArea = (km2: number) => (km2 < 10 ? `${nf(km2 * 100, km2 < 0.1 ? 2 : 1)} ha` : `${nf(km2)} km²`);

/** Voile « monde moins la zone » pour estomper l'extérieur de la zone choisie. */
const veil = (f: Feat) => {
  const monde: L.LatLngTuple[] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
  const trous = polys(f).map((p) => p[0].map(([x, y]) => [y, x] as L.LatLngTuple));
  return L.polygon([monde, ...trous], { pane: "veil", stroke: false, fillColor: "#f1f4f7", fillOpacity: 0.78, interactive: false });
};

/** Allège un polygone (Douglas-Peucker) avant de l'envoyer à l'API : anneaux extérieurs seulement. */
function rdp(p: Ring, eps: number): Ring {
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const st: [number, number][] = [[0, p.length - 1]];
  while (st.length) {
    const [a, b] = st.pop()!;
    const [x1, y1] = p[a], [x2, y2] = p[b];
    const dx = x2 - x1, dy = y2 - y1, d2 = dx * dx + dy * dy;
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      let t = d2 ? ((p[i][0] - x1) * dx + (p[i][1] - y1) * dy) / d2 : 0;
      t = Math.max(0, Math.min(1, t));
      const ex = x1 + t * dx - p[i][0], ey = y1 + t * dy - p[i][1], d = ex * ex + ey * ey;
      if (d > md) { md = d; mi = i; }
    }
    if (mi > 0 && md > eps * eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
function simple(f: Feat) {
  const b = bbox(f), eps = Math.max(b.maxLon - b.minLon, b.maxLat - b.minLat) * 0.001;
  const rings = polys(f)
    .map((p) => rdp(p[0], eps).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]))
    .filter((r) => r.length >= 4);
  return rings.length === 1 ? { type: "Polygon", coordinates: rings } : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };
}

const CACHE: Partial<Record<Level, Feat[]>> = {};
function loadLevel(l: Level): Promise<Feat[]> {
  if (CACHE[l]) return Promise.resolve(CACHE[l]!);
  const tries = sources(l).map((u) =>
    fetch(u).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then((j) => {
      const feats: Feat[] = (j?.features ?? []).filter((f: Feat) => f?.geometry && /Polygon/.test(f.geometry.type));
      if (!feats.length) throw new Error("vide");
      console.info(`Limites ${l} : ${feats.length} entités, exemple de propriétés`, feats[0].properties);
      return feats;
    }));
  return new Promise((ok, ko) => {
    let left = tries.length;
    tries.forEach((p) => p.then((v) => { CACHE[l] = v; ok(v); }).catch(() => { if (--left === 0) ko(new Error(`Limites ${l} indisponibles en ligne. Vérifiez votre connexion et réessayez.`)); }));
  });
}

/* ===================== PLUIE MOYENNE (Open-Meteo, RAIN_YEARS ans) ===================== */

const RAIN_CACHE = new Map<string, number>();

/** Moyenne annuelle des précipitations (mm/an) sur RAIN_FIRST–RAIN_LAST, au centre de la zone. */
async function moyennePluie(lon: number, lat: number, signal: AbortSignal): Promise<number | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = RAIN_CACHE.get(key);
  if (hit != null) return hit;
  try {
    const r = await (await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${RAIN_FIRST}-01-01&end_date=${RAIN_LAST}-12-31&daily=precipitation_sum&timezone=auto`,
      { signal })).json();
    const jours: (number | null)[] = r.daily.precipitation_sum;
    const total = jours.reduce<number>((s, v) => s + (v || 0), 0);
    const val = Math.round(total / RAIN_YEARS);
    RAIN_CACHE.set(key, val);
    return val;
  } catch {
    return null; // facultatif
  }
}

/* ===================== CULTURES : SECOND AVIS (ESA WorldCover 2021) ===================== */

/* Palette officielle ESA WorldCover (classe : couleur RGB) */
const WC_PALETTE: { code: number; n: string; c: [number, number, number] }[] = [
  { code: 10, n: "Couvert arboré", c: [0, 100, 0] },
  { code: 20, n: "Arbustes", c: [255, 187, 34] },
  { code: 30, n: "Prairies", c: [255, 255, 76] },
  { code: 40, n: "Cultures", c: [240, 150, 255] },
  { code: 50, n: "Bâti", c: [250, 0, 0] },
  { code: 60, n: "Sol nu", c: [180, 180, 180] },
  { code: 70, n: "Neige", c: [240, 240, 240] },
  { code: 80, n: "Eau", c: [0, 100, 200] },
  { code: 90, n: "Zones humides herbacées", c: [0, 150, 160] },
  { code: 95, n: "Mangrove", c: [0, 207, 117] },
  { code: 100, n: "Mousse et lichen", c: [250, 230, 160] },
];

type WcRes = { pct: number | null; err: string | null };

/**
 * Part (%) de cultures selon ESA WorldCover 2021, dans le polygone.
 * Renvoie aussi le message d'erreur (affiché dans l'interface) au lieu de le masquer.
 */
async function pctCulturesWC(f: Feat, b: Box, W: number, H: number): Promise<WcRes> {
  try {
    const url = `/api/worldcover?minLon=${b.minLon}&minLat=${b.minLat}&maxLon=${b.maxLon}&maxLat=${b.maxLat}&w=${W}&h=${H}`;
    const r = await fetch(url);
    if (!r.ok) {
      const j = await r.json().catch(() => ({} as any));
      return { pct: null, err: j.erreur || `HTTP ${r.status}` };
    }
    const blob = await r.blob();
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = objUrl;
    await img.decode();

    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const cx = cv.getContext("2d", { willReadFrequently: true })!;
    cx.drawImage(img, 0, 0);
    URL.revokeObjectURL(objUrl);
    const px = cx.getImageData(0, 0, W, H).data;

    const mk = document.createElement("canvas"); mk.width = W; mk.height = H;
    const mc = mk.getContext("2d", { willReadFrequently: true })!;
    const X = (lon: number) => ((lon - b.minLon) / (b.maxLon - b.minLon)) * W;
    const Y = (lat: number) => ((b.maxLat - lat) / (b.maxLat - b.minLat)) * H;
    mc.beginPath();
    polys(f).forEach((p) => p.forEach((r) => r.forEach(([x, y], i) => (i ? mc.lineTo(X(x), Y(y)) : mc.moveTo(X(x), Y(y))))));
    mc.fill("evenodd");
    const mask = mc.getImageData(0, 0, W, H).data;

    const cnt = new Array(WC_PALETTE.length).fill(0);
    const brutes = new Map<string, number>(); // diagnostic : couleurs réelles reçues
    let tot = 0, opaques = 0;

    for (let i = 0; i < W * H; i++) {
      if (mask[i * 4 + 3] < 128) continue;       // hors polygone
      if (px[i * 4 + 3] < 128) continue;         // transparent (hors couverture)
      opaques++;
      const pr = px[i * 4], pg = px[i * 4 + 1], pb = px[i * 4 + 2];
      const key = `${pr},${pg},${pb}`;
      brutes.set(key, (brutes.get(key) ?? 0) + 1);

      let best = -1, bd = Infinity;
      WC_PALETTE.forEach((k, ci) => {
        const d = (pr - k.c[0]) ** 2 + (pg - k.c[1]) ** 2 + (pb - k.c[2]) ** 2;
        if (d < bd) { bd = d; best = ci; }
      });
      if (bd < 90 * 90) { cnt[best]++; tot++; }
    }

    console.groupCollapsed(`WorldCover : ${W}×${H} px, ${opaques} pixels opaques, ${tot} classés`);
    console.table(WC_PALETTE.map((k, i) => ({ classe: k.n, pixels: cnt[i] })));
    console.log("Couleurs les plus fréquentes reçues :", [...brutes.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8));
    console.groupEnd();

    if (!opaques) return { pct: null, err: "image entièrement transparente (zone hors couverture WMS)" };
    if (!tot) return { pct: null, err: "couleurs reçues non reconnues (voir la console)" };
    const idx = WC_PALETTE.findIndex((k) => k.code === 40);
    return { pct: (cnt[idx] / tot) * 100, err: null };
  } catch (e: any) {
    console.warn("WorldCover indisponible :", e);
    return { pct: null, err: e?.message || "erreur inconnue" };
  }
}

/* ===================== ANALYSE : OCCUPATION DU SOL ET RELIEF ===================== */

type Part = { n: string; pct: number; col: string };
type Result = {
  land: Part[]; slope: Part[]; cloudPct: number;
  elevMin: number; elevMax: number; elevMean: number;
  rain: number | null; areaKm2: number;
  cropSteep: number; treePct: number; cropPct: number; barePct: number; steepPct: number; wetPct: number;
  savPct: number; builtPct: number; // savane et parcours ; bâti
  cultWC: number | null; // cultures selon ESA WorldCover 2021
  cultErr: string | null; // raison d'un échec WorldCover
  bassin: string | null; resolution: string;
};

async function analyse(f: Feat, signal: AbortSignal, year: number): Promise<Result> {
  const b = bbox(f);
  const midLat = (b.minLat + b.maxLat) / 2;
  const wKm = Math.max(0.01, (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180));
  const hKm = Math.max(0.01, (b.maxLat - b.minLat) * 110.54);
  const Lpx = Math.max(40, Math.min(700, Math.ceil(Math.max(wKm, hKm) * 100)));
  const W = wKm >= hKm ? Lpx : Math.max(24, Math.round((Lpx * wKm) / hKm));
  const H = wKm >= hKm ? Math.max(24, Math.round((Lpx * hKm) / wKm)) : Lpx;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = esriUrl(b, W, H, year);
  await img.decode();
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const cx = cv.getContext("2d", { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, W, H).data;
  const mk = document.createElement("canvas"); mk.width = W; mk.height = H;
  const mc = mk.getContext("2d", { willReadFrequently: true })!;
  const X = (lon: number) => ((lon - b.minLon) / (b.maxLon - b.minLon)) * W;
  const Y = (lat: number) => ((b.maxLat - lat) / (b.maxLat - b.minLat)) * H;
  mc.beginPath();
  polys(f).forEach((p) => p.forEach((r) => r.forEach(([x, y], i) => (i ? mc.lineTo(X(x), Y(y)) : mc.moveTo(X(x), Y(y))))));
  mc.fill("evenodd");
  const mask = mc.getImageData(0, 0, W, H).data;
  const cls = (i: number) => {
    if (px[i * 4 + 3] < 128) return -1;
    let best = -1, bd = 40 * 40 * 3;
    CLASSES.forEach((k, ci) => {
      const d = (px[i * 4] - k.c[0]) ** 2 + (px[i * 4 + 1] - k.c[1]) ** 2 + (px[i * 4 + 2] - k.c[2]) ** 2;
      if (d < bd) { bd = d; best = ci; }
    });
    return best;
  };
  const cnt = new Array(CLASSES.length).fill(0); let tot = 0;
  for (let i = 0; i < W * H; i++) if (mask[i * 4 + 3] > 128) { const c = cls(i); if (c >= 0) { cnt[c]++; if (c < N_VALID) tot++; } }
  if (!tot) throw new Error("Aucune donnée d'occupation du sol reçue pour cette zone (service Esri indisponible ou zone entièrement nuageuse).");

  const N = 10, minSpan = 0.012;
  const small = b.maxLon - b.minLon < minSpan || b.maxLat - b.minLat < minSpan;
  const sLon = Math.max(b.maxLon - b.minLon, minSpan), sLat = Math.max(b.maxLat - b.minLat, minSpan);
  const e0 = (b.minLon + b.maxLon) / 2 - sLon / 2, n1 = (b.minLat + b.maxLat) / 2 + sLat / 2;
  const dLon = sLon / (N - 1), dLat = sLat / (N - 1);
  const lats: number[] = [], lons: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { lats.push(+(n1 - i * dLat).toFixed(5)); lons.push(+(e0 + j * dLon).toFixed(5)); }
  const el = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lons.join(",")}`, { signal })).json();
  const z: number[] = el.elevation;
  const dx = dLon * 111320 * Math.cos((midLat * Math.PI) / 180), dy = dLat * 110540;
  const sc = new Array(SLOPES.length).fill(0); let sn = 0, cropSteep = 0, cropN = 0;
  for (let i = 1; i < N - 1; i++) for (let j = 1; j < N - 1; j++) {
    const k = i * N + j;
    const ins = inFeat(lons[k], lats[k], f);
    if (!ins && !small) continue;
    const s = Math.hypot((z[k + 1] - z[k - 1]) / (2 * dx), (z[k - N] - z[k + N]) / (2 * dy)) * 100;
    sc[SLOPES.findIndex((t) => s < t.max)]++; sn++;
    if (!ins) continue;
    const c = cls(Math.min(H - 1, Math.max(0, Math.floor(Y(lats[k])))) * W + Math.min(W - 1, Math.max(0, Math.floor(X(lons[k])))));
    if (c === 2) { cropN++; if (s >= 15) cropSteep++; }
  }
  const inside = z.filter((_, k) => inFeat(lons[k], lats[k], f));
  const zs = small || !inside.length ? z : inside;

  // pluie : moyenne annuelle sur RAIN_YEARS ans (une seule requête, mise en cache)
  const [cLon, cLat] = center(f);
  const rain = await moyennePluie(cLon, cLat, signal);

  // second avis cultures (WorldCover 2021)
  const wc = await pctCulturesWC(f, b, W, H);

  let bassin: string | null = null;
  if (BASSINS_GEOJSON_URL) {
    try {
      const g = await (await fetch(BASSINS_GEOJSON_URL, { signal })).json();
      const hit = g.features.find((x: Feat) => inFeat(cLon, cLat, x));
      bassin = hit ? nameOf(hit) : "Hors bassin référencé";
    } catch { bassin = null; }
  }

  const pct = (c: number) => (cnt[c] / tot) * 100;
  return {
    // la ligne « Cultures » reste visible même à 0 %
    land: CLASSES.slice(0, N_VALID).map((k, i) => ({ n: k.n, pct: pct(i), col: rgb(k.c) }))
      .filter((x) => x.pct > 0 || x.n === "Cultures").sort((a, c) => c.pct - a.pct),
    cloudPct: (cnt[8] / (tot + cnt[8])) * 100,
    slope: SLOPES.map((s, i) => ({ n: s.n, pct: sn ? (sc[i] / sn) * 100 : 0, col: s.col })),
    elevMin: Math.min(...zs), elevMax: Math.max(...zs), elevMean: zs.reduce((a, c) => a + c, 0) / zs.length,
    rain, areaKm2: areaKm2(f),
    cropSteep: cropN ? (cropSteep / cropN) * 100 : 0,
    treePct: pct(0), cropPct: pct(2), barePct: pct(4), steepPct: sn ? ((sc[2] + sc[3]) / sn) * 100 : 0, wetPct: pct(6),
    savPct: pct(1), builtPct: pct(3),
    cultWC: wc.pct,
    cultErr: wc.err,
    bassin,
    resolution: small
      ? "Occupation du sol à 10 m ; relief à 90 m autour de la parcelle (indicatif)"
      : `Occupation à ${nf((wKm * 1000) / W)} m par pixel ; altitude tous les ${nf(Math.max(dx, dy) / 1000, 1)} km`,
  };
}

function useAnalysis(f: Feat | null, year: number) {
  const [s, setS] = useState<{ res: Result | null; busy: boolean; err: string }>({ res: null, busy: false, err: "" });
  useEffect(() => {
    if (!f) { setS({ res: null, busy: false, err: "" }); return; }
    const c = new AbortController();
    setS({ res: null, busy: true, err: "" });
    analyse(f, c.signal, year)
      .then((res) => !c.signal.aborted && setS({ res, busy: false, err: "" }))
      .catch((e) => !c.signal.aborted && setS({ res: null, busy: false, err: e?.message || "Erreur d'analyse" }));
    return () => c.abort();
  }, [f, year]);
  return s;
}

/* ===================== DÉFORESTATION (chiffres par polygone) ===================== */

type PerteAn = { annee: number; ha: number };
const LOSS_CACHE = new WeakMap<Feat, Promise<PerteAn[]>>();

function lossFor(f: Feat): Promise<PerteAn[]> {
  let p = LOSS_CACHE.get(f);
  if (!p) {
    p = fetch("/api/gfw-perte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geometry: simple(f) }) })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(`${r.status}${j.erreur || j.error ? " : " + (j.erreur || j.error) : ""}`);
        }
        return r.json();
      })
      .then((j) => j.annees as PerteAn[]);
    LOSS_CACHE.set(f, p);
    p.catch(() => LOSS_CACHE.delete(f)); // on pourra réessayer
  }
  return p;
}

function useLoss(f: Feat | null) {
  const [s, setS] = useState<{ rows: PerteAn[] | null; busy: boolean; err: string }>({ rows: null, busy: false, err: "" });
  useEffect(() => {
    if (!f) { setS({ rows: null, busy: false, err: "" }); return; }
    let on = true;
    setS({ rows: null, busy: true, err: "" });
    lossFor(f).then((rows) => on && setS({ rows, busy: false, err: "" })).catch((e) => on && setS({ rows: null, busy: false, err: e?.message || "réseau" }));
    return () => { on = false; };
  }, [f]);
  return s;
}

/* ===================== POINTS DE FEUX (NASA FIRMS, via /api/firms) ===================== */

type Feu = { lon: number; lat: number; t: number; date: string; heure: string; conf: "l" | "n" | "h" | null; frp: number | null; sat: string; age: number };

const niveauConfiance = (c: any): "l" | "n" | "h" | null => {
  if (c == null || c === "") return null;
  if (typeof c === "string" && Number.isNaN(Number(c))) {
    const v = c.toLowerCase();
    return v.startsWith("h") ? "h" : v.startsWith("n") ? "n" : v.startsWith("l") ? "l" : null;
  }
  const n = Number(c);
  return n >= 80 ? "h" : n >= 30 ? "n" : "l";
};
function analyserFeux(features: any[]): Omit<Feu, "age">[] {
  const out: Omit<Feu, "age">[] = [];
  for (const f of features) {
    const p = f?.properties || {}, c = f?.geometry?.coordinates;
    if (!c || !p.acq_date || p.acq_time == null) continue;
    const h = String(p.acq_time).padStart(4, "0");
    const t = new Date(`${p.acq_date}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    const frp = Number(p.frp);
    out.push({ lon: c[0], lat: c[1], t, date: p.acq_date, heure: `${h.slice(0, 2)}:${h.slice(2, 4)}`, conf: niveauConfiance(p.confidence), frp: Number.isFinite(frp) ? frp : null, sat: p.satellite ?? "" });
  }
  return out;
}

/* ===================== DÉCISION ===================== */

type Trend = "hausse" | "baisse" | "stable" | null;
type Extra = { lossHa: number | null; lossPct: number | null; lossTrend: Trend; fires72: number; fires24: number; areaKm2: number };
type Lvl = "haute" | "moyenne" | "info";
type Thematique = "Restauration" | "Agriculture" | "Eau et sols" | "Feux" | "Conservation" | "Communautés";
type Orient = { t: string; d: string; lvl: Lvl; th: Thematique; acts?: string[] };

const THEMES: Thematique[] = ["Restauration", "Agriculture", "Eau et sols", "Feux", "Conservation", "Communautés"];
const LVL_TXT: Record<Lvl, string> = { haute: "Priorité haute", moyenne: "Priorité moyenne", info: "Recommandé" };
const LVL_RANK: Record<Lvl, number> = { haute: 0, moyenne: 1, info: 2 };

const vuln = (r: Result) => {
  const c = (v: number, m: number) => Math.min(v, m) / m;
  return Math.round(35 * c(r.steepPct, 60) + 25 * c(r.cropSteep, 60) + 15 * c(r.barePct, 25) + 15 * (1 - c(r.treePct, 50)) + 10 * c(r.rain ?? 0, 2500));
};
const vulnLabel = (v: number) => (v < 25 ? "faible" : v < 50 ? "modérée" : v < 70 ? "élevée" : "très élevée");

function orientations(R: Result, x: Extra, periode: string): Orient[] {
  // Cultures : on retient la plus grande des deux estimations (Impact Observatory, WorldCover)
  const r = { ...R, cropPct: Math.max(R.cropPct, R.cultWC ?? 0) };
  const o: Orient[] = [];
  const add = (th: Thematique, lvl: Lvl, t: string, d: string, acts?: string[]) => o.push({ th, lvl, t, d, acts });
  const loss = x.lossPct;
  const rain = r.rain;

  /* ---------- RESTAURATION ---------- */
  if (loss != null && loss >= 3)
    add("Restauration", "haute", "Restaurer les zones déboisées",
      `${nf(x.lossHa ?? 0)} ha de couvert arboré perdus sur ${periode}, soit ${nf(loss, 1)} % de la zone. Ces surfaces sont les premiers candidats à la restauration${r.steepPct > 25 ? ", surtout sur les pentes (" + nf(r.steepPct) + " % de la zone en pente forte)" : ""}.`,
      ["Repérer les foyers de perte sur la carte et les classer par urgence", "Reboiser avec des espèces autochtones adaptées au site, en commençant par les pentes et les têtes de bassin", "Monter une pépinière locale et suivre la survie des plants à 1 an et à 3 ans"]);
  else if (loss != null && loss >= 0.5)
    add("Restauration", "moyenne", "Cibler les foyers de perte de couvert",
      `${nf(x.lossHa ?? 0)} ha perdus sur ${periode} (${nf(loss, 1)} % de la zone). Cibler les foyers de perte visibles sur la carte avant qu'ils ne s'étendent.`);

  if (r.steepPct > 35 && r.treePct < 25)
    add("Restauration", "haute", "Restauration forestière des versants",
      `Pentes de 15 % ou plus sur ${nf(r.steepPct)} % du territoire pour seulement ${nf(r.treePct)} % de couvert arboré. Reboiser avec des espèces locales, en commençant par les têtes de bassin.`,
      ["Planter en lignes suivant les courbes de niveau", "Associer arbres, arbustes et graminées pour couvrir le sol rapidement"]);

  if (r.barePct > 10)
    add("Restauration", "haute", "Réhabilitation des sols nus",
      `${nf(r.barePct)} % de sol nu : stabiliser par végétalisation (graminées, légumineuses), puis planter.`,
      ["Végétaliser d'abord avec des plantes pionnières et des légumineuses", "Planter les arbres ensuite, quand le sol est stabilisé"]);

  if (r.treePct >= 8 && r.treePct < 40 && (r.barePct > 2 || r.savPct > 20))
    add("Restauration", "moyenne", "Régénération naturelle assistée",
      `Avec ${nf(r.treePct)} % de couvert arboré, une partie de la forêt peut repartir seule si on la protège. C'est souvent moins coûteux que planter.`,
      ["Protéger les jeunes pousses du feu et du pâturage", "Enrichir par des plantations là où la régénération reste faible", "Mettre en défens les parcelles pendant plusieurs années"]);

  if (r.treePct >= 15 && r.treePct < 45 && loss != null && loss >= 1)
    add("Restauration", "moyenne", "Reconnecter les fragments forestiers",
      `Le couvert arboré est morcelé (${nf(r.treePct)} %) et il a reculé de ${nf(loss, 1)} % sur ${periode}. Relier les îlots forestiers aide la faune et la dispersion des graines.`,
      ["Tracer des corridors entre les blocs forestiers restants", "Planter des haies vives et des bandes boisées le long des cours d'eau"]);

  if (r.wetPct > 3 && loss != null && loss >= 1)
    add("Restauration", "moyenne", "Restaurer les mangroves dégradées",
      `${nf(r.wetPct, 1)} % de végétation inondée ou de mangrove, avec une perte de couvert sur la période. Restaurer d'abord l'hydrologie, puis replanter.`,
      ["Rétablir la circulation de l'eau et des marées avant toute plantation", "Replanter des palétuviers (Avicennia, Rhizophora) adaptés à chaque niveau de marée"]);

  if (r.treePct < 25 && r.cropPct + r.savPct + r.builtPct > 50)
    add("Restauration", "moyenne", "Sécuriser le bois-énergie",
      `Peu de forêt (${nf(r.treePct)} %) autour de terres cultivées, de savane ou bâties : la pression du bois de chauffe et du charbon est probable sur les reliques forestières.`,
      ["Créer des plantations villageoises à croissance rapide (eucalyptus, acacia) pour le bois-énergie", "Diffuser des foyers améliorés pour réduire la consommation de bois"]);

  if (r.rain != null && r.rain < 800 && r.treePct < 15)
    add("Restauration", "moyenne", "Restaurer en zone sèche",
      `Seulement ${nf(r.rain)} mm de pluie par an en moyenne pour ${nf(r.treePct)} % de couvert arboré : les plantations classiques risquent d'échouer.`,
      ["Choisir des espèces adaptées à la sécheresse", "Capter l'eau au pied des plants (demi-lunes, paillage)", "Planter au début de la saison des pluies"]);

  /* ---------- CONSERVATION ---------- */
  if (x.lossTrend === "hausse" && loss != null && loss >= 0.5)
    add("Conservation", "haute", "La perte de couvert s'accélère",
      `Les pertes des dernières années de la période dépassent nettement celles du début. Il faut agir vite pour ne pas laisser le défrichement gagner du terrain.`,
      ["Renforcer la surveillance (patrouilles, alertes de déforestation)", "Dialoguer avec les communautés sur les causes locales du défrichement"]);

  if (r.treePct >= 40)
    add("Conservation", "info", "Conserver le couvert existant",
      `${nf(r.treePct)} % de couvert arboré : protéger en priorité (gestion communautaire, lutte contre les feux et le défrichement).`,
      ["Délimiter et matérialiser les limites de la forêt", "Soutenir la surveillance locale et le suivi de la biodiversité"]);

  if (r.wetPct > 3)
    add("Conservation", "moyenne", "Protection des zones humides et mangroves",
      `${nf(r.wetPct, 1)} % de végétation inondée ou de mangrove : zones tampons, pas de drainage ni de coupe.`);

  /* ---------- AGRICULTURE ---------- */
  if (r.cropSteep > 30 && (rain ?? 0) > 1000)
    add("Agriculture", "haute", "Lutte antiérosive sur les cultures de pente",
      `${nf(r.cropSteep)} % des cultures échantillonnées sont sur pente de 15 % ou plus, avec ${nf(rain!)} mm de pluie par an en moyenne : risque élevé de ravinement et de lavaka.`,
      ["Agroforesterie, cordons de pierres et bandes enherbées", "Terrasses et cultures suivant les courbes de niveau", "Haies de vétiver pour freiner le ruissellement"]);
  else if (r.cropSteep > 30)
    add("Agriculture", "moyenne", "Cultures sur pente à sécuriser",
      `${nf(r.cropSteep)} % des cultures sont sur pente de 15 % ou plus. Prévoir des pratiques de conservation des sols.`,
      ["Cultiver en courbes de niveau", "Garder le sol couvert (paillage, plantes de couverture)"]);

  if (r.cropPct > 20 && r.treePct < 30)
    add("Agriculture", "moyenne", "Développer l'agroforesterie",
      `${nf(r.cropPct)} % de cultures pour ${nf(r.treePct)} % d'arbres : associer des arbres aux cultures protège le sol, apporte de l'ombre et diversifie les revenus.`,
      ["Associer arbres fixateurs d'azote et arbres fruitiers aux cultures", "Planter des haies vives autour des parcelles", "Garder des arbres d'ombrage dans les parcelles"]);

  if (loss != null && loss >= 1 && r.cropPct > 10 && r.treePct >= 15)
    add("Agriculture", loss >= 3 ? "haute" : "moyenne", "Réduire le défrichement-brûlis",
      `La perte de couvert (${nf(loss, 1)} % sur ${periode}) se fait au contact de terres cultivées : le défrichement pour de nouvelles parcelles est une cause probable.`,
      ["Intensifier les parcelles déjà ouvertes plutôt que d'en défricher de nouvelles", "Semer sous couvert végétal et améliorer les jachères avec des légumineuses", "Sécuriser le foncier des parcelles déjà cultivées"]);

  if (rain != null && rain < 900 && r.cropPct > 10)
    add("Agriculture", "moyenne", "Cultiver avec peu d'eau",
      `${nf(rain)} mm de pluie par an en moyenne (${RAIN_FIRST}-${RAIN_LAST}) : l'eau limite les rendements et expose les cultures aux aléas.`,
      ["Choisir des cultures tolérantes à la sécheresse (manioc, sorgho, niébé)", "Récolter l'eau de pluie et pailler le sol", "Caler les semis sur le début réel de la saison des pluies"]);

  if (r.savPct > 40)
    add("Agriculture", "moyenne", "Gérer les pâturages et l'élevage",
      `${nf(r.savPct)} % de savane et de parcours : un pâturage mieux géré réduit les feux de pâture et la dégradation du sol.`,
      ["Organiser la rotation des pâturages et des parcs de nuit", "Semer des plantes fourragères (Brachiaria, Stylosanthes) pour compléter l'herbe", "Éviter les feux de renouvellement des pâturages en pleine saison sèche"]);

  if (r.cropPct > 25 && r.steepPct < 15)
    add("Agriculture", "info", "Intensification durable en terrain plat",
      `Terrain peu pentu et cultivé sur ${nf(r.cropPct)} % : conditions favorables pour produire davantage sur les mêmes surfaces et alléger la pression sur les forêts.`,
      ["Pratiquer la riziculture améliorée (SRI, SRA) et aménager les bas-fonds", "Alterner riz et légumineuses, fertiliser avec du compost", "Maîtriser l'eau (canaux, petits barrages) pour sécuriser les récoltes"]);

  if (r.treePct >= 20 && r.cropPct > 8)
    add("Agriculture", "info", "Valoriser des filières agroforestières",
      `Forêt et cultures se côtoient : les produits cultivés sous ombrage donnent des revenus sans déboiser.`,
      ["Développer le café, le cacao, les épices ou la vanille sous ombrage, selon le climat local", "Transformer sur place pour garder la valeur ajoutée", "Viser des labels ou des filières équitables"]);

  /* ---------- EAU ET SOLS ---------- */
  if (r.steepPct > 25 && r.barePct > 3)
    add("Eau et sols", "haute", "Stabiliser les lavaka et les ravines",
      `Pentes fortes sur ${nf(r.steepPct)} % de la zone et ${nf(r.barePct, 1)} % de sol nu : les ravines (lavaka) risquent de s'élargir à chaque saison des pluies.`,
      ["Détourner l'eau de ruissellement en amont de la ravine", "Poser des fascines ou des digues en gradins dans le lit", "Végétaliser les bords (vétiver, arbustes) pour les fixer"]);

  if (r.steepPct > 25 && r.cropPct > 10)
    add("Eau et sols", "moyenne", "Protéger les rizières de bas-fond contre l'ensablement",
      `Des versants raides surplombent des cultures : l'érosion peut déposer du sable dans les bas-fonds et les canaux.`,
      ["Installer des bandes enherbées et des fascines à la sortie des versants", "Curer régulièrement les canaux et les bassins de décantation"]);

  if (r.steepPct > 25 && (rain ?? 0) > 1200)
    add("Eau et sols", "moyenne", "Protéger les têtes de bassin versant",
      `Pentes fortes et ${nf(rain!)} mm de pluie par an en moyenne : la végétation des hauts de versant régule l'eau pour tout l'aval${r.bassin ? " (bassin : " + r.bassin + ")" : ""}.`,
      ["Maintenir ou rétablir un couvert permanent sur les hauts de versant", "Boiser une bande protectrice le long des sources et des cours d'eau"]);

  /* ---------- FEUX ---------- */
  if (x.fires72 > 0) {
    const dens = (x.fires72 / Math.max(x.areaKm2, 1)) * 100;
    add("Feux", dens >= 1 || x.fires24 >= 10 ? "haute" : "moyenne", "Prévention et surveillance des feux",
      `${nf(x.fires72)} feux détectés ces 72 h (${nf(x.fires24)} ces 24 h). Renforcer les pare-feux et l'alerte communautaire, surtout sur les savanes et lisières forestières.`,
      ["Ouvrir et entretenir des pare-feux autour des forêts et des plantations", "Organiser des brigades villageoises avec un système d'alerte", ...(r.savPct > 30 ? ["Pratiquer des brûlis précoces et contrôlés en début de saison sèche"] : [])]);
  }

  /* ---------- COMMUNAUTÉS ---------- */
  if (r.treePct >= 15 && loss != null && loss >= 0.5)
    add("Communautés", "moyenne", "Renforcer la gestion communautaire",
      `Les habitants sont les mieux placés pour protéger ce qui reste de forêt si leurs droits de gestion sont reconnus.`,
      ["Soutenir les transferts de gestion aux communautés (VOI, COBA)", "Faire adopter des règles locales (dina) et un suivi participatif", "Prévoir des financements durables pour les associations locales"]);

  if (r.treePct >= 25)
    add("Communautés", "info", "Offrir des revenus qui dépendent de la forêt debout",
      `Quand la forêt rapporte, on la protège. Des activités à faible impact peuvent réduire la pression du défrichement.`,
      ["Développer l'apiculture et les produits forestiers non ligneux", "Étudier l'écotourisme là où le site s'y prête", "Appuyer la pisciculture ou l'élevage à cycle court"]);

  if (!o.length)
    add("Conservation", "info", "Aucun signal prioritaire", "Les indicateurs calculés ne montrent pas de pression marquée. Affinez par un diagnostic de terrain.");

  return o.sort((a, b) => LVL_RANK[a.lvl] - LVL_RANK[b.lvl]);
}

/* ===================== COMPOSANT ===================== */

const ROWS = ["Région", "District", "Commune", "Parcelle"];
const VERSION = "5 cartes, limites en ligne";

export default function AnalyseTerritoriale() {
  const elMap = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null), loss = useRef<L.TileLayer | null>(null), ov = useRef<L.ImageOverlay | null>(null);
  const kids = useRef<L.GeoJSON | null>(null), outline = useRef<L.GeoJSON | null>(null);
  const veilL = useRef<L.Polygon | null>(null), draft = useRef<L.FeatureGroup | null>(null), fireL = useRef<L.FeatureGroup | null>(null);
  const pts = useRef<L.LatLng[]>([]);
  const pickRef = useRef<(l: Level, i: number) => void>(() => {});
  const modalRef = useRef<HTMLDivElement>(null), closeRef = useRef<HTMLButtonElement>(null);

  const [regs, setRegs] = useState<Feat[]>([]);
  const [adm2, setAdm2] = useState<Feat[] | null>(null);
  const [adm3, setAdm3] = useState<Feat[] | null>(null);
  const [ri, setRi] = useState(""), [di, setDi] = useState(""), [ci, setCi] = useState("");
  const [parcel, setParcel] = useState<Feat | null>(null);
  const [drawing, setDrawing] = useState(false), [nPts, setNPts] = useState(0);
  const [fond, setFond] = useState<"sat" | "topo">("sat");
  const [showLC, setShowLC] = useState(true), [lcYear, setLcYear] = useState(2023);
  const [showLoss, setShowLoss] = useState(true), [dfFrom, setDfFrom] = useState(2015), [dfTo, setDfTo] = useState(LOSS_LAST);
  const [showFires, setShowFires] = useState(true), [fPeriod, setFPeriod] = useState<24 | 48 | 72>(72), [conf, setConf] = useState<"l" | "n" | "h">("l");
  const [mask, setMask] = useState(true);
  const [show, setShow] = useState(false); // fenêtre des orientations
  const [themeF, setThemeF] = useState<"Toutes" | Thematique>("Toutes");
  const [loadErr, setLoadErr] = useState("");

  /* ----- sélection administrative ----- */
  const rF = ri !== "" ? regs[+ri] : null;
  const dists = useMemo(
    () => (rF && adm2 ? adm2.filter((d) => childOf(d, rF)).sort((a, b) => nameOf(a).localeCompare(nameOf(b))) : []),
    [rF, adm2]);
  const dF = di !== "" ? dists[+di] ?? null : null;
  const coms = useMemo(
    () => (dF && adm3 ? adm3.filter((c) => childOf(c, dF)).sort((a, b) => nameOf(a).localeCompare(nameOf(b))) : []),
    [dF, adm3]);
  const cF = ci !== "" ? coms[+ci] ?? null : null;
  const admin = cF || dF || rF;
  const selected = parcel || admin;
  const hi = parcel ? CYAN : LAURITE;

  const rRes = useAnalysis(rF, lcYear), dRes = useAnalysis(dF, lcYear), cRes = useAnalysis(cF, lcYear), pRes = useAnalysis(parcel, lcYear);
  const current = parcel ? pRes : cF ? cRes : dF ? dRes : rRes;
  const res = current.res;
  const lossS = useLoss(selected);
  const zoneKm2 = useMemo(() => (selected ? areaKm2(selected) : 0), [selected]);

  const list = !rF ? regs : !dF ? dists : coms;
  const kidLevel: Level = !rF ? "ADM1" : !dF ? "ADM2" : "ADM3";

  /* ----- déforestation : chiffres de la période ----- */
  const lossStats = useMemo(() => {
    if (!lossS.rows) return null;
    const years = LOSS_YEARS.filter((y) => y >= dfFrom && y <= dfTo).map((y) => ({ annee: y, ha: lossS.rows!.find((a) => a.annee === y)?.ha ?? 0 }));
    const total = years.reduce((s, a) => s + a.ha, 0);
    const peak = years.reduce((m, a) => (a.ha > m.ha ? a : m), years[0] ?? { annee: 0, ha: 0 });
    // tendance : moyenne de la 2e moitié de la période comparée à celle de la 1re moitié
    let trend: Trend = null;
    if (years.length >= 4) {
      const half = Math.floor(years.length / 2);
      const avg = (a: typeof years) => a.reduce((s, y) => s + y.ha, 0) / Math.max(1, a.length);
      const a = avg(years.slice(0, half)), b = avg(years.slice(years.length - half));
      trend = b > a * 1.25 && b - a > 5 ? "hausse" : b < a * 0.75 ? "baisse" : "stable";
    }
    return { years, total, peak, trend, max: Math.max(1, ...years.map((a) => a.ha)), pct: zoneKm2 > 0 ? (total / (zoneKm2 * 100)) * 100 : 0 };
  }, [lossS.rows, dfFrom, dfTo, zoneKm2]);

  /* ----- points de feux ----- */
  const [feuxBruts, setFeuxBruts] = useState<any[]>([]);
  const [fLoad, setFLoad] = useState(true), [fErr, setFErr] = useState(false), [fMaj, setFMaj] = useState<number | null>(null), [now, setNow] = useState(Date.now());
  const chargerFeux = useCallback(async () => {
    try {
      setFLoad(true); setFErr(false);
      const r = await fetch("/api/firms");
      if (!r.ok) throw new Error("FIRMS");
      const j = await r.json();
      setFeuxBruts(Array.isArray(j.features) ? j.features : []);
      setFMaj(Date.now());
    } catch { setFErr(true); } finally { setFLoad(false); }
  }, []);
  useEffect(() => {
    chargerFeux();
    const a = setInterval(chargerFeux, 15 * 60 * 1000), b = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [chargerFeux]);

  const feuxZone: Feu[] = useMemo(() => {
    const bb = selected ? bbox(selected) : null;
    return analyserFeux(feuxBruts)
      .map((f) => ({ ...f, age: (now - f.t) / 3.6e6 }))
      .filter((f) => f.age <= 72 && f.age >= -1 && RANG[f.conf ?? "n"] >= RANG[conf])
      .filter((f) => !selected || (f.lon >= bb!.minLon && f.lon <= bb!.maxLon && f.lat >= bb!.minLat && f.lat <= bb!.maxLat && inFeat(f.lon, f.lat, selected)));
  }, [feuxBruts, now, conf, selected]);
  const feuxAff = useMemo(() => feuxZone.filter((f) => f.age <= fPeriod), [feuxZone, fPeriod]);
  const n24 = feuxZone.filter((f) => f.age <= 24).length, n48 = feuxZone.filter((f) => f.age <= 48).length, n72 = feuxZone.length;
  const chrono = useMemo(() => {
    const b = new Array(12).fill(0);
    feuxZone.forEach((f) => { b[Math.min(11, Math.max(0, Math.floor(f.age / 6)))]++; });
    return b as number[];
  }, [feuxZone]);
  const maxChrono = Math.max(1, ...chrono);
  const heureMaj = fMaj ? new Date(fMaj).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

  /* ----- tracé de parcelle ----- */
  const redraw = () => {
    const g = draft.current; if (!g) return;
    g.clearLayers();
    const p = pts.current, o = { pane: "vec", interactive: false } as const;
    if (p.length >= 3) L.polygon(p, { ...o, color: CYAN, weight: 2.5, dashArray: "6 4", fillColor: CYAN, fillOpacity: 0.15 }).addTo(g);
    else if (p.length > 1) L.polyline(p, { ...o, color: CYAN, weight: 2.5, dashArray: "6 4" }).addTo(g);
    p.forEach((q) => L.circleMarker(q, { ...o, radius: 5, color: "#fff", weight: 2, fillColor: CYAN, fillOpacity: 1 }).addTo(g));
    setNPts(p.length);
  };
  const cancelDraw = () => { pts.current = []; draft.current?.clearLayers(); setNPts(0); setDrawing(false); };
  const finishDraw = () => {
    const p = pts.current;
    if (p.length < 3) return;
    const ring = [...p.map((q) => [q.lng, q.lat]), [p[0].lng, p[0].lat]];
    setParcel({ type: "Feature", properties: { shapeName: "Parcelle tracée" }, geometry: { type: "Polygon", coordinates: [ring] } });
    cancelDraw();
  };
  const startDraw = () => { setParcel(null); pts.current = []; draft.current?.clearLayers(); setNPts(0); setDrawing(true); };

  const onRegion = (v: string) => { setRi(v); setDi(""); setCi(""); setParcel(null); };
  const onDistrict = (v: string) => { setDi(v); setCi(""); setParcel(null); };
  const onCommune = (v: string) => { setCi(v); setParcel(null); };
  pickRef.current = (l, i) => (l === "ADM1" ? onRegion : l === "ADM2" ? onDistrict : onCommune)(String(i));
  const reset = () => { onRegion(""); cancelDraw(); };

  /* ----- chargement des limites ----- */
  useEffect(() => { loadLevel("ADM1").then((r) => {
    setRegs(r);
    if (r.length < 15 || r.length > 30) setLoadErr(`Attention : ${r.length} entités chargées au niveau 1 au lieu d'environ 22 régions. Les limites en ligne ne correspondent peut-être pas aux régions.`);
  }).catch((e) => setLoadErr(e.message)); }, []);
  useEffect(() => { if (rF && !adm2) loadLevel("ADM2").then(setAdm2).catch((e) => setLoadErr(e.message)); }, [rF, adm2]);
  useEffect(() => { if (dF && !adm3) loadLevel("ADM3").then(setAdm3).catch((e) => setLoadErr(e.message)); }, [dF, adm3]);
  useEffect(() => { setShow(false); }, [selected]);

  /* ----- fenêtre des orientations : Échap, piège du focus, blocage du défilement ----- */
  useEffect(() => {
    if (!show) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShow(false); return; }
      if (e.key !== "Tab" || !modalRef.current) return;
      const f = modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventD
