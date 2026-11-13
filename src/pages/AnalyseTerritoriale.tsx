/**
 * AnalyseTerritoriale.tsx — Madagascar : Région → District → Commune → Parcelle tracée
 *
 * Données :
 *  - Limites : geoBoundaries (en ligne, plusieurs miroirs essayés en parallèle)
 *  - Occupation du sol : Esri / Impact Observatory Sentinel-2 10 m
 *  - Cultures (second avis) : ESA WorldCover 2021 via /api/worldcover (Terrascope)
 *  - Perte de couvert : tuiles Global Forest Watch (carte) + POST /api/gfw-perte (chiffres)
 *  - Points de feux : GET /api/firms (NASA FIRMS)
 *  - Altitude / pluie : Open-Meteo (pluie = moyenne annuelle sur RAIN_YEARS ans)
 *
 * Dépendances : leaflet, @types/leaflet, lucide-react.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronRight, RotateCcw, PenTool, Check, X, Trash2 } from "lucide-react";

/* ===================== CONFIGURATION ===================== */

type Level = "ADM1" | "ADM2" | "ADM3";

const NOM_CLES = ["shapename", "nom_region", "region", "nom_district", "district", "nom_commune", "commune",
  "adm3_fr", "adm2_fr", "adm1_fr", "name_3", "name_2", "name_1", "nom", "name", "libelle"];

const WORLDCOVER_ACTIVE = true; // passer à true quand la source répond
const BASSINS_GEOJSON_URL = ""; // ex. "/data/bassins_versants.geojson"
const LC_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LOSS_FIRST = 2001, LOSS_LAST = 2025;
const LOSS_YEARS = Array.from({ length: LOSS_LAST - LOSS_FIRST + 1 }, (_, i) => LOSS_FIRST + i);
const RAIN_YEARS = 5;
const RAIN_LAST = 2025;
const RAIN_FIRST = RAIN_LAST - RAIN_YEARS + 1;
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

/** Allège un polygone (Douglas-Peucker) avant l'envoi à l'API : anneaux extérieurs seulement. */
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
      console.info(`Limites ${l} : ${feats.length} entités`, feats[0].properties);
      return feats;
    }));
  return new Promise((ok, ko) => {
    let left = tries.length;
    tries.forEach((p) => p.then((v) => { CACHE[l] = v; ok(v); }).catch(() => { if (--left === 0) ko(new Error(`Limites ${l} indisponibles en ligne. Vérifiez votre connexion et réessayez.`)); }));
  });
}

/* ===================== PLUIE MOYENNE (Open-Meteo) ===================== */

const RAIN_CACHE = new Map<string, number>();

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
    return null;
  }
}

/* ===================== CULTURES : SECOND AVIS (ESA WorldCover 2021) ===================== */

type WcRes = { pct: number | null; err: string | null };

/** Part (%) de cultures selon ESA WorldCover 2021, dans le polygone. Renvoie aussi l'erreur éventuelle. */
async function pctCulturesWC(f: Feat, _b: Box, _W: number, _H: number): Promise<WcRes> {
  if (!WORLDCOVER_ACTIVE) return { pct: null, err: "source désactivée" };
  try {
    const r = await fetch("/api/worldcover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: simple(f) }),
    });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) return { pct: null, err: j.erreur || `HTTP ${r.status}` };
    return { pct: j.pct, err: null };
  } catch (e: any) {
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
  savPct: number; builtPct: number;
  cultWC: number | null; cultErr: string | null;
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
  if (!tot) throw new Error("Aucune donnée d'occupation du sol pour cette zone (service Esri indisponible ou zone entièrement nuageuse).");

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

  const [cLon, cLat] = center(f);
  const rain = await moyennePluie(cLon, cLat, signal);
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
    land: CLASSES.slice(0, N_VALID).map((k, i) => ({ n: k.n, pct: pct(i), col: rgb(k.c) }))
      .filter((x) => x.pct > 0).sort((a, c) => c.pct - a.pct),
    cloudPct: (cnt[8] / (tot + cnt[8])) * 100,
    slope: SLOPES.map((s, i) => ({ n: s.n, pct: sn ? (sc[i] / sn) * 100 : 0, col: s.col })),
    elevMin: Math.min(...zs), elevMax: Math.max(...zs), elevMean: zs.reduce((a, c) => a + c, 0) / zs.length,
    rain, areaKm2: areaKm2(f),
    cropSteep: cropN ? (cropSteep / cropN) * 100 : 0,
    treePct: pct(0), cropPct: pct(2), barePct: pct(4), steepPct: sn ? ((sc[2] + sc[3]) / sn) * 100 : 0, wetPct: pct(6),
    savPct: pct(1), builtPct: pct(3),
    cultWC: wc.pct, cultErr: wc.err,
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

/* ===================== DÉFORESTATION ===================== */

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
    p.catch(() => LOSS_CACHE.delete(f));
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

/* ===================== POINTS DE FEUX (NASA FIRMS) ===================== */

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

/* ===================== DÉCISION : ORIENTATIONS ===================== */

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
  const [show, setShow] = useState(false);
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
  useEffect(() => {
    loadLevel("ADM1").then((r) => {
      setRegs(r);
      if (r.length < 15 || r.length > 30) setLoadErr(`Attention : ${r.length} entités au niveau 1 au lieu d'environ 22 régions.`);
    }).catch((e) => setLoadErr(e.message));
  }, []);
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
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [show]);

  /* ----- la carte unique ----- */
  useEffect(() => {
    const m = L.map(elMap.current!, { zoomControl: false, zoomSnap: 0.25 }).fitBounds(MADA);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    ([["perte", 450], ["veil", 460], ["vec", 480], ["feux", 490]] as [string, number][]).forEach(([n, z]) => {
      const p = m.createPane(n); p.style.zIndex = String(z);
      if (n === "perte" || n === "veil") p.style.pointerEvents = "none";
    });
    draft.current = L.featureGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(elMap.current!);
    return () => { ro.disconnect(); m.remove(); };
  }, []);

  useEffect(() => {
    base.current?.remove();
    base.current = L.tileLayer(FONDS[fond], { maxZoom: 18, attribution: "Esri, Maxar, Earthstar Geographics" }).addTo(map.current!);
    base.current.bringToBack();
  }, [fond]);

  /* entités cliquables du niveau suivant */
  useEffect(() => {
    kids.current?.remove();
    if (!list.length) return;
    const idx = new Map<Feat, number>(list.map((f, i) => [f, i]));
    kids.current = L.geoJSON(list as any, {
      pane: "vec", interactive: !drawing,
      style: () => ({ color: "#ffffff", weight: 1.2, fillColor: "#ffffff", fillOpacity: 0.04 }),
      onEachFeature: (f, layer) => {
        const p = layer as L.Path;
        p.bindTooltip(nameOf(f as any), { sticky: true, className: "at-tip" });
        p.on("mouseover", () => p.setStyle({ fillOpacity: 0.25, weight: 2.2 }));
        p.on("mouseout", () => p.setStyle({ fillOpacity: 0.04, weight: 1.2 }));
        p.on("click", () => pickRef.current(kidLevel, idx.get(f as any)!));
      },
    }).addTo(map.current!);
  }, [list, kidLevel, drawing]);

  /* contour, voile et zoom */
  useEffect(() => {
    outline.current?.remove(); veilL.current?.remove();
    if (!selected) { map.current?.flyToBounds(MADA, { duration: 1 }); return; }
    if (mask) veilL.current = veil(selected).addTo(map.current!);
    outline.current = L.geoJSON(selected as any, { pane: "vec", interactive: false, style: { color: hi, weight: 3.5, fill: false } }).addTo(map.current!);
  }, [selected, mask]);
  useEffect(() => {
    if (!selected) return;
    map.current!.flyToBounds(L.geoJSON(selected as any).getBounds(), { padding: [40, 40], maxZoom: parcel ? 17 : undefined, duration: 1.2 });
  }, [selected]);

  /* occupation du sol (image) */
  useEffect(() => {
    ov.current?.remove();
    if (!showLC || !map.current) return;
    const b = selected ? bbox(selected) : { minLon: 43.2, minLat: -25.7, maxLon: 50.6, maxLat: -11.9 };
    const midLat = (b.minLat + b.maxLat) / 2;
    const wKm = (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180), hKm = (b.maxLat - b.minLat) * 110.54;
    const Lpx = Math.max(64, Math.min(1400, Math.ceil(Math.max(wKm, hKm) * 100)));
    const W = wKm >= hKm ? Lpx : Math.max(32, Math.round((Lpx * wKm) / hKm)), H = wKm >= hKm ? Math.max(32, Math.round((Lpx * hKm) / wKm)) : Lpx;
    ov.current = L.imageOverlay(esriUrl(b, W, H, lcYear), [[b.minLat, b.minLon], [b.maxLat, b.maxLon]], { opacity: 0.6, interactive: false }).addTo(map.current);
  }, [showLC, selected, lcYear]);

  /* perte de couvert arboré (tuiles GFW) */
  useEffect(() => {
    loss.current?.remove();
    if (!showLoss) return;
    loss.current = L.tileLayer(lossUrl(dfFrom, dfTo), { pane: "perte", maxNativeZoom: 12, opacity: 0.95, attribution: "Perte de couvert © UMD/Hansen, GFW" }).addTo(map.current!);
  }, [showLoss, dfFrom, dfTo]);

  /* points de feux */
  useEffect(() => {
    fireL.current?.remove();
    if (!showFires || !feuxAff.length) return;
    const m = map.current!, g = L.featureGroup(), renderer = L.canvas({ pane: "feux", padding: 0.5 });
    const rayon = (z: number) => Math.max(2.5, Math.min(9, 2 + (z - 5) * 0.75));
    feuxAff.forEach((f) => {
      L.circleMarker([f.lat, f.lon], { pane: "feux", renderer, radius: rayon(m.getZoom()), fillColor: couleurAge(f.age), color: "#fff", weight: 0.6, opacity: 0.9, fillOpacity: 0.92 })
        .bindPopup(`<div style="font:13px/1.5 system-ui"><strong>Détection satellite</strong><br/>${new Date(f.t).toLocaleDateString("fr-FR")} à ${f.heure} UTC<br/>Confiance : ${f.conf === "h" ? "élevée" : f.conf === "n" ? "nominale" : f.conf === "l" ? "faible" : "n/d"}${f.frp != null ? `<br/>Puissance : ${f.frp} MW` : ""}${f.sat ? `<br/>Satellite : ${f.sat}` : ""}</div>`)
        .addTo(g);
    });
    g.addTo(m);
    const maj = () => g.eachLayer((l) => l instanceof L.CircleMarker && l.setRadius(rayon(m.getZoom())));
    m.on("zoomend", maj);
    fireL.current = g;
    return () => { m.off("zoomend", maj); g.remove(); };
  }, [showFires, feuxAff]);

  /* tracé de parcelle : clics */
  useEffect(() => {
    const m = map.current!;
    if (!drawing) return;
    m.getContainer().style.cursor = "crosshair";
    m.doubleClickZoom.disable();
    const click = (e: L.LeafletMouseEvent) => { pts.current.push(e.latlng); redraw(); };
    const dbl = () => { pts.current.pop(); redraw(); finishDraw(); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && cancelDraw();
    m.on("click", click); m.on("dblclick", dbl);
    window.addEventListener("keydown", key);
    return () => {
      m.off("click", click); m.off("dblclick", dbl);
      window.removeEventListener("keydown", key);
      m.getContainer().style.cursor = ""; m.doubleClickZoom.enable();
    };
  }, [drawing]);

  /* ----- affichage ----- */
  const levels = [{ f: rF, s: rRes }, { f: dF, s: dRes }, { f: cF, s: cRes }, { f: parcel, s: pRes }];
  const periodeTxt = dfFrom === dfTo ? String(dfFrom) : `${dfFrom} à ${dfTo}`;
  const advice = useMemo(
    () => (res ? orientations(res, { lossHa: lossStats?.total ?? null, lossPct: lossStats?.pct ?? null, lossTrend: lossStats?.trend ?? null, fires72: n72, fires24: n24, areaKm2: zoneKm2 }, periodeTxt) : []),
    [res, lossStats, n72, n24, zoneKm2, periodeTxt]);
  const themesPresents = useMemo(
    () => THEMES.map((th) => ({ th, n: advice.filter((a) => a.th === th).length })).filter((x) => x.n > 0),
    [advice]);
  const adviceShown = themeF === "Toutes" ? advice : advice.filter((a) => a.th === themeF);
  const nHautes = advice.filter((a) => a.lvl === "haute").length;
  const score = res ? vuln(res) : 0;
  const openAnalysis = () => { setThemeF("Toutes"); setShow(true); };
  const hint = drawing
    ? `Cliquez pour poser les sommets (${nPts}). Double-clic ou « Terminer » pour fermer, Échap pour annuler.`
    : !rF ? "Cliquez sur une région pour zoomer" : !dF ? "Cliquez sur un district" : !cF ? "Cliquez sur une commune" : "Cliquez sur une autre commune pour comparer";
  const legendLC = res ? res.land : CLASSES.slice(0, N_VALID).map((k) => ({ n: k.n, pct: 0, col: rgb(k.c) }));
  const lvlText = parcel
    ? `Parcelle tracée${admin ? ` dans ${nameOf(admin)}` : ""}`
    : cF ? `Commune de ${nameOf(dF!)}, ${nameOf(rF!)}` : dF ? `District de ${nameOf(rF!)}` : "Région";
  const area = fmtArea(zoneKm2).split(" ");
  const yearOptions = LOSS_YEARS.map((y) => <option key={y}>{y}</option>);
  const cultAff = res ? (res.cultWC == null ? null : Math.max(res.cropPct, res.cultWC)) : null;

  return (
    <div className="at">
      <style>{CSS}</style>

      <header className="at-head">
        <div>
          <h1>Analyse territoriale</h1>
          <p>Occupation du sol, déforestation, relief, feux et orientations pour restaurer · version : {VERSION}</p>
        </div>
        <div className="at-chain">
          <select value={ri} onChange={(e) => onRegion(e.target.value)} aria-label="Région">
            <option value="">{regs.length ? "Région" : loadErr ? "Indisponible" : "Chargement…"}</option>
            {regs.map((f, i) => ({ f, i })).sort((a, b) => nameOf(a.f).localeCompare(nameOf(b.f))).map(({ f, i }) => <option key={i} value={i}>{nameOf(f)}</option>)}
          </select>
          <ChevronRight size={16} aria-hidden />
          <select value={di} onChange={(e) => onDistrict(e.target.value)} disabled={!rF} aria-label="District">
            <option value="">{rF && !adm2 ? "Chargement…" : "District"}</option>
            {dists.map((f, i) => <option key={i} value={i}>{nameOf(f)}</option>)}
          </select>
          <ChevronRight size={16} aria-hidden />
          <select value={ci} onChange={(e) => onCommune(e.target.value)} disabled={!dF} aria-label="Commune">
            <option value="">{dF && !adm3 ? "Chargement…" : "Commune"}</option>
            {coms.map((f, i) => <option key={i} value={i}>{nameOf(f)}</option>)}
          </select>
          <button type="button" className="at-reset" onClick={reset} disabled={!selected && !drawing} title="Revenir à Madagascar" aria-label="Réinitialiser">
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {loadErr && <div className="at-banner" role="alert">{loadErr}</div>}

      <div className="at-body">
        <aside className="at-panel">
          {!selected ? (
            <div className="at-empty">
              <h2>Commencez par une région</h2>
              <p>Choisissez-la dans la liste ou cliquez sur la carte. Les informations se précisent jusqu’à la commune. Vous pouvez aussi tracer votre propre parcelle.</p>
            </div>
          ) : (
            <>
              <div className="at-card at-hero">
                <h2>{nameOf(selected)}</h2>
                <div className="at-lvl">{lvlText}</div>
                <dl className="at-facts">
                  <div><dd>{area[0]}</dd><dt>{area[1]}</dt></div>
                  <div><dd>{res ? nf(res.elevMean) : "…"}</dd><dt>m d’altitude moyenne</dt></div>
                  <div><dd>{res ? (res.rain ? nf(res.rain) : "n/d") : "…"}</dd><dt>mm de pluie par an (moy. {RAIN_FIRST}-{RAIN_LAST})</dt></div>
                </dl>
                {res && <p className="at-note">Bassin versant : {res.bassin ?? "source non renseignée"}</p>}
                {current.err && <p className="at-alert" role="alert">{current.err}</p>}
              </div>

              <div className="at-duo">
                <section className="at-card at-c">
                  <div className="at-ch">
                    <h3>Occupation du sol</h3>
                    <select value={lcYear} onChange={(e) => setLcYear(+e.target.value)} aria-label="Année de l'occupation du sol" className="at-mini">
                      {LC_YEARS.map((y) => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <p className="at-sub">Une ligne par niveau choisi.</p>
                  {levels.map(({ f, s }, i) => f && (
                    <div className="at-core" key={i}>
                      <div className="at-corelab"><small>{ROWS[i]}</small><span title={nameOf(f)}>{nameOf(f)}</span></div>
                      {s.res ? (
                        <div className="at-stack" key={nameOf(f) + s.res.areaKm2}>
                          {s.res.land.map((p) => <i key={p.n} style={{ width: `${p.pct}%`, background: p.col }} title={`${p.n} : ${nf(p.pct, 1)} %`} />)}
                        </div>
                      ) : <div className="at-stack at-pulse" />}
                    </div>
                  ))}
                  {res ? (
                    <>
                      <table className="at-tbl">
                        <thead><tr><th scope="col">Types présents</th><th scope="col">Part</th><th scope="col">ha</th></tr></thead>
                        <tbody>
                          {res.land.map((p) => (
                            <tr key={p.n}>
                              <td><i style={{ background: p.col }} />{p.n}</td>
                              <td>{p.pct < 0.1 ? "< 0,1" : nf(p.pct, 1)} %</td>
                              <td>{nf((p.pct / 100) * res.areaKm2 * 100, res.areaKm2 < 1 ? 2 : 0)}</td>
                            </tr>
                          ))}
                          {res.cultWC != null && (
                            <tr>
                              <td><i style={{ background: "#7a3db8" }} />Cultures (WorldCover 2021)</td>
                              <td>{res.cultWC < 0.1 ? "< 0,1" : nf(res.cultWC, 1)} %</td>
                              <td>{nf((res.cultWC / 100) * res.areaKm2 * 100, res.areaKm2 < 1 ? 2 : 0)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {res.cloudPct > 0.5 && <p className="at-note">{nf(res.cloudPct, 1)} % sous les nuages, exclus des parts.</p>}
                      <p className="at-note">
                        Cultures : Impact Observatory {nf(res.cropPct, 1)} % · {res.cultWC != null
                          ? <>WorldCover 2021 {nf(res.cultWC, 1)} %</>
                          : <>WorldCover indisponible{res.cultErr ? ` (${res.cultErr})` : ""}</>}
                      </p>
                    </>
                  ) : <p className="at-load">{current.busy ? "Calcul en cours…" : ""}</p>}
                </section>

                <section className="at-card at-c at-def">
                  <div className="at-ch">
                    <h3>Déforestation</h3>
                    <div className="at-yrs">
                      <select className="at-mini" value={dfFrom} aria-label="Année de début" onChange={(e) => { const v = +e.target.value; setDfFrom(v); if (v > dfTo) setDfTo(v); }}>{yearOptions}</select>
                      <span>à</span>
                      <select className="at-mini" value={dfTo} aria-label="Année de fin" onChange={(e) => { const v = +e.target.value; setDfTo(v); if (v < dfFrom) setDfFrom(v); }}>{yearOptions}</select>
                    </div>
                  </div>
                  {lossS.busy && <p className="at-load">Calcul en cours… (peut durer quelques secondes pour une région)</p>}
                  {lossS.err && (
                    <p className="at-alert" role="alert">
                      Chiffres indisponibles ({lossS.err}). Vérifiez la route /api/gfw-perte et la clé GFW côté serveur. La carte de perte, elle, s’affiche.
                    </p>
                  )}
                  {lossStats && (
                    <>
                      <div className="at-big at-big-def">{nf(Math.round(lossStats.total))}<small>ha</small></div>
                      <p className="at-sub">de couvert arboré perdus sur {periodeTxt}, soit {nf(lossStats.pct, lossStats.pct < 1 ? 2 : 1)} % de la zone.</p>
                      <div className="at-cols" role="img" aria-label="Perte de couvert par année">
                        {lossStats.years.map((a) => (
                          <div key={a.annee} className="at-colw" title={`${a.annee} : ${nf(Math.round(a.ha))} ha`}>
                            <i style={{ height: `${Math.max(3, (a.ha / lossStats.max) * 100)}%`, background: a.annee === lossStats.peak.annee ? "#b0285f" : COULEUR_PERTE }} />
                          </div>
                        ))}
                      </div>
                      <div className="at-colsl"><span>{dfFrom}</span><span>{dfTo}</span></div>
                      <dl className="at-mini-facts">
                        <div><dt>Année la plus touchée</dt><dd>{lossStats.peak.annee} · {nf(Math.round(lossStats.peak.ha))} ha</dd></div>
                        <div><dt>Moyenne annuelle</dt><dd>{nf(Math.round(lossStats.total / Math.max(1, lossStats.years.length)))} ha/an</dd></div>
                        {lossStats.trend && <div><dt>Tendance</dt><dd>{lossStats.trend === "hausse" ? "en hausse" : lossStats.trend === "baisse" ? "en baisse" : "stable"}</dd></div>}
                      </dl>
                    </>
                  )}
                </section>

                <section className="at-card at-c">
                  <h3>Relief et pente</h3>
                  {res ? (
                    <>
                      <div className="at-stack at-slope" key={nameOf(selected)}>
                        {res.slope.map((p) => <i key={p.n} style={{ width: `${p.pct}%`, background: p.col }} title={`${p.n} : ${nf(p.pct, 1)} %`} />)}
                      </div>
                      <table className="at-tbl">
                        <tbody>
                          {res.slope.map((p) => <tr key={p.n}><td><i style={{ background: p.col }} />{p.n}</td><td>{nf(p.pct, 1)} %</td></tr>)}
                        </tbody>
                      </table>
                      <div className="at-strip" aria-hidden>
                        <b className="at-range" style={{ left: `${(Math.max(0, res.elevMin) / 2900) * 100}%`, width: `${Math.max(1.5, ((res.elevMax - Math.max(0, res.elevMin)) / 2900) * 100)}%` }} />
                        <u className="at-dot" style={{ left: `${(res.elevMean / 2900) * 100}%` }} />
                      </div>
                      <div className="at-stripl"><span>0 m</span><span>{nf(res.elevMin)} à {nf(res.elevMax)} m</span><span>2 900 m</span></div>
                      <p className="at-note">{res.resolution}.</p>
                    </>
                  ) : <p className="at-load">{current.busy ? "Calcul en cours…" : ""}</p>}
                </section>

                <section className="at-card at-c at-feu">
                  <div className="at-ch">
                    <h3>Points de feux</h3>
                    <select className="at-mini" value={conf} onChange={(e) => setConf(e.target.value as "l" | "n" | "h")} aria-label="Fiabilité des détections">
                      <option value="l">Toutes</option><option value="n">Nominale+</option><option value="h">Élevée</option>
                    </select>
                  </div>
                  {fErr ? (
                    <p className="at-alert" role="alert">Données de feux indisponibles (route /api/firms). <button type="button" className="at-link" onClick={chargerFeux}>Réessayer</button></p>
                  ) : (
                    <>
                      <div className="at-feu-top">
                        <div className="at-big at-big-feu">{fLoad && !feuxBruts.length ? "…" : nf(feuxAff.length)}</div>
                        <div className="at-seg" role="group" aria-label="Période des feux">
                          {([24, 48, 72] as const).map((h) => <button key={h} type="button" aria-pressed={fPeriod === h} onClick={() => setFPeriod(h)}>{h} h</button>)}
                        </div>
                      </div>
                      <p className="at-sub">feux détectés ces {fPeriod} dernières heures dans la zone.</p>
                      <div className="at-cols" role="img" aria-label="Détections par tranche de 6 heures">
                        {[...chrono].map((n, i) => ({ n, i })).reverse().map(({ n, i }) => (
                          <div key={i} className="at-colw" title={`${n} feux · il y a ${i * 6} à ${i * 6 + 6} h`}>
                            <i style={{ height: `${Math.max(4, (n / maxChrono) * 100)}%`, background: couleurAge(i * 6 + 3), opacity: i * 6 < fPeriod ? 1 : 0.22 }} />
                          </div>
                        ))}
                      </div>
                      <div className="at-colsl"><span>il y a 72 h</span><span>maintenant</span></div>
                      <table className="at-tbl">
                        <tbody>
                          <tr><td><i style={{ background: "rgb(200,15,15)" }} />24 dernières heures</td><td>{nf(n24)}</td></tr>
                          <tr><td><i style={{ background: "#f97316" }} />24 à 48 h</td><td>{nf(n48 - n24)}</td></tr>
                          <tr><td><i style={{ background: "#facc15" }} />48 à 72 h</td><td>{nf(n72 - n48)}</td></tr>
                        </tbody>
                      </table>
                      <p className="at-note">NASA FIRMS, données de {heureMaj}.</p>
                    </>
                  )}
                </section>
              </div>

              <button type="button" className="at-go" disabled={!res} onClick={openAnalysis}>Analyser ce territoire</button>
            </>
          )}
        </aside>

        <section className="at-mcard" aria-label="Carte de Madagascar">
          <div className="at-mhead">
            <div className="at-mtools">
              <div className="at-seg" role="group" aria-label="Fond de carte">
                <button type="button" aria-pressed={fond === "sat"} onClick={() => setFond("sat")}>Satellite</button>
                <button type="button" aria-pressed={fond === "topo"} onClick={() => setFond("topo")}>Topographie</button>
              </div>
              <label className="at-chk"><input type="checkbox" checked={showLC} onChange={(e) => setShowLC(e.target.checked)} />Occupation du sol</label>
              <label className="at-chk"><input type="checkbox" checked={showLoss} onChange={(e) => setShowLoss(e.target.checked)} />Déforestation</label>
              <label className="at-chk"><input type="checkbox" checked={showFires} onChange={(e) => setShowFires(e.target.checked)} />Points de feux</label>
              <label className="at-chk"><input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} />Estomper l’extérieur</label>
            </div>
            <div className="at-mtools">
              {!drawing ? (
                <button type="button" className="at-tool" onClick={startDraw}><PenTool size={15} />Tracer une parcelle</button>
              ) : (
                <>
                  <button type="button" className="at-tool on" onClick={finishDraw} disabled={nPts < 3}><Check size={15} />Terminer</button>
                  <button type="button" className="at-tool" onClick={cancelDraw}><X size={15} />Annuler</button>
                </>
              )}
              {parcel && <button type="button" className="at-tool" onClick={() => setParcel(null)}><Trash2 size={15} />Effacer la parcelle</button>}
            </div>
          </div>
          <div className="at-mbox">
            <div ref={elMap} className="at-map" />
            <div className="at-ctl at-hint">{hint}</div>
            {(showLC || showLoss || showFires) && (
              <div className="at-ctl at-legend">
                {showLC && <><strong>Occupation du sol {lcYear}</strong>{legendLC.map((k) => <span key={k.n}><i style={{ background: k.col }} />{k.n}</span>)}</>}
                {showLoss && <><strong>Déforestation</strong><span><i style={{ background: COULEUR_PERTE }} />Perte de couvert, {periodeTxt}</span></>}
                {showFires && <><strong>Feux</strong>
                  <span><i className="r" style={{ background: "rgb(200,15,15)" }} />Moins de 24 h</span>
                  <span><i className="r" style={{ background: "#f97316" }} />24 à 48 h</span>
                  <span><i className="r" style={{ background: "#facc15" }} />48 à 72 h</span></>}
              </div>
            )}
          </div>
        </section>
      </div>

      {show && res && selected && (
        <div className="at-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <div className="at-modal" role="dialog" aria-modal="true" aria-labelledby="at-m-titre" ref={modalRef}>
            <header className="at-mh">
              <div>
                <h2 id="at-m-titre">Orientations pour {nameOf(selected)}</h2>
                <p>{lvlText} · {fmtArea(zoneKm2)} · {advice.length} orientation{advice.length > 1 ? "s" : ""}{nHautes ? `, dont ${nHautes} prioritaire${nHautes > 1 ? "s" : ""}` : ""}</p>
              </div>
              <button type="button" className="at-x" ref={closeRef} onClick={() => setShow(false)} aria-label="Fermer la fenêtre"><X size={18} /></button>
            </header>

            <div className="at-mb">
              <div className="at-kpis">
                <div className="at-kpi"><b>{nf(res.treePct)} %</b><span>couvert arboré</span></div>
                <div className="at-kpi">
                  <b>{cultAff == null ? `${nf(res.cropPct, 1)} %` : `${nf(cultAff, 1)} %`}</b>
                  <span>{cultAff == null ? "cultures (WorldCover indisponible)" : "cultures (max des 2 sources)"}</span>
                </div>
                <div className="at-kpi"><b>{nf(res.steepPct)} %</b><span>pente de 15 % ou plus</span></div>
                <div className="at-kpi"><b>{lossStats ? `${nf(Math.round(lossStats.total))} ha` : "n/d"}</b><span>perdus, {periodeTxt}</span></div>
                <div className="at-kpi"><b>{nf(n72)}</b><span>feux en 72 h</span></div>
                <div className="at-kpi"><b>{res.rain ? `${nf(res.rain)} mm` : "n/d"}</b><span>pluie par an (moy. {RAIN_FIRST}-{RAIN_LAST})</span></div>
              </div>

              <div className="at-gauge-wrap">
                <div className="at-gauge"><u style={{ left: `${score}%` }} /></div>
                <p>Vulnérabilité à l’érosion : <strong>{vulnLabel(score)}</strong> ({score} sur 100)</p>
              </div>

              {themesPresents.length > 1 && (
                <div className="at-chips" role="group" aria-label="Filtrer par thème">
                  <button type="button" aria-pressed={themeF === "Toutes"} onClick={() => setThemeF("Toutes")}>Toutes ({advice.length})</button>
                  {themesPresents.map(({ th, n }) => (
                    <button key={th} type="button" aria-pressed={themeF === th} onClick={() => setThemeF(th)}>{th} ({n})</button>
                  ))}
                </div>
              )}

              {adviceShown.map((a) => (
                <article key={a.t} className={`at-reco ${a.lvl}`}>
                  <div className="at-rtags">
                    <span className="at-tag">{a.th}</span>
                    <span className={`at-lv ${a.lvl}`}>{LVL_TXT[a.lvl]}</span>
                  </div>
                  <h4>{a.t}</h4>
                  <p>{a.d}</p>
                  {a.acts && a.acts.length > 0 && <ul className="at-acts">{a.acts.map((s) => <li key={s}>{s}</li>)}</ul>}
                </article>
              ))}

              <p className="at-note">Estimation indicative issue d’images satellite, de la perte de couvert GFW, des détections de feux, d’une pluie moyenne sur {RAIN_YEARS} ans et d’un relief à 90 m échantillonné. À valider avec des données locales et les acteurs du territoire avant toute décision.</p>
            </div>

            <footer className="at-mf">
              <button type="button" className="at-tool" onClick={() => setShow(false)}>Fermer</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STYLES ===================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');
.at{--c-bg:var(--surface-2,#f1efe8);--c-card:var(--surface,#fff);--c-line:var(--border,#d8d4c8);--c-ink:var(--text,#1c2822);
  --c-ink2:var(--text-2,#4a5850);--c-ink3:var(--text-3,#7a867f);--c-acc:var(--accent,#1f6f50);
  flex:1;min-width:0;height:100vh;height:100dvh;display:flex;flex-direction:column;background:var(--c-bg);color:var(--c-ink);font-family:inherit}
.at *{box-sizing:border-box}
.at h1,.at h2,.at h3,.at-facts dd,.at-big{font-family:'Newsreader',Georgia,serif;font-weight:500;margin:0}
.at-head{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--c-line);background:var(--c-card)}
.at-head h1{font-size:25px;letter-spacing:-.01em;line-height:1.1}
.at-head p{margin:2px 0 0;font-size:13px;color:var(--c-ink3)}
.at-chain{display:flex;align-items:center;gap:6px;color:var(--c-ink3);flex-wrap:wrap}
.at select{min-width:150px;padding:9px 10px;border:1px solid var(--c-line);border-radius:10px;background:var(--c-card);color:var(--c-ink);font:inherit;font-size:14px}
.at select.at-mini{min-width:0;padding:4px 6px;font-size:12.5px;border-radius:8px}
.at select:disabled{opacity:.5}
.at select:focus-visible,.at button:focus-visible,.at-chk input:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
.at-reset{margin-left:6px;width:38px;height:38px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink2);cursor:pointer;display:grid;place-items:center}
.at-reset:disabled{opacity:.4;cursor:default}
.at-banner{padding:10px 20px;background:rgba(178,58,46,.1);border-bottom:1px solid #b23a2e;color:#8a2a20;font-size:14px}
.at-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(560px,52%) minmax(0,1fr)}
.at-panel{overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;border-right:1px solid var(--c-line);overscroll-behavior:contain}
.at-duo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.at-card{background:var(--c-card);border:1px solid var(--c-line);border-radius:14px;padding:14px;min-width:0}
.at-c h3{font-size:18px;margin:0 0 2px}
.at-ch{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap}
.at-yrs{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--c-ink3)}
.at-sub,.at-note{font-size:12px;color:var(--c-ink3);line-height:1.45;margin:3px 0 10px}
.at-note{margin:10px 0 0}
.at-load{color:var(--c-ink3);font-size:13px;margin:8px 0}
.at-empty{padding:22px 8px}
.at-empty h2{font-size:28px;line-height:1.1;margin-bottom:10px}
.at-empty p{color:var(--c-ink2);line-height:1.6;max-width:46ch}
.at-hero{border-color:transparent;background:repeating-radial-gradient(ellipse at 92% -10%,transparent 0 13px,rgba(125,125,105,.17) 13px 14px),var(--c-card)}
.at-hero h2{font-size:32px;line-height:1.02;letter-spacing:-.015em}
.at-lvl{margin:6px 0 12px;color:var(--c-ink2);font-size:14px}
.at-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0}
.at-facts div{display:flex;flex-direction:column-reverse}
.at-facts dd{margin:0;font-size:25px}
.at-facts dt{font-size:12px;color:var(--c-ink3);line-height:1.3}
.at-alert{font-size:12.5px;border-left:4px solid #b23a2e;background:rgba(178,58,46,.08);padding:8px 10px;margin:10px 0 0;border-radius:0 8px 8px 0}
.at-link{border:0;background:none;color:var(--c-acc);font:inherit;font-weight:700;cursor:pointer;text-decoration:underline;padding:0}
.at-core{display:grid;grid-template-columns:72px 1fr;gap:8px;align-items:center;margin-bottom:7px}
.at-corelab{display:flex;flex-direction:column;min-width:0;line-height:1.2}
.at-corelab small{font-size:11px;color:var(--c-ink3)}
.at-corelab span{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.at-stack{display:flex;height:24px;border-radius:7px;overflow:hidden;transform-origin:left;animation:atGrow .7s cubic-bezier(.2,.7,.2,1)}
.at-stack i{display:block;height:100%;box-shadow:inset -1px 0 rgba(255,255,255,.55)}
.at-slope{margin:8px 0 6px;height:16px}
.at-pulse{background:var(--c-line);animation:atPulse 1.2s ease-in-out infinite}
.at-tbl{width:100%;border-collapse:collapse;margin-top:10px;font-size:12.5px}
.at-tbl th{font-weight:500;font-size:11.5px;color:var(--c-ink3);text-align:right;padding:0 0 5px}
.at-tbl th:first-child,.at-tbl td:first-child{text-align:left}
.at-tbl td{padding:4px 0;border-top:1px solid var(--c-line);text-align:right;font-variant-numeric:tabular-nums}
.at-tbl td:first-child{display:flex;gap:7px;align-items:center}
.at-tbl i,.at-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.at-strip{position:relative;height:9px;margin:14px 4px 0;border-radius:5px;background:linear-gradient(90deg,#8fbf8f,#e8d98a 35%,#c98b4a 65%,#8a5a3c)}
.at-range{position:absolute;top:-4px;bottom:-4px;border:2px solid var(--c-ink);border-radius:6px}
.at-dot{position:absolute;top:-3px;width:4px;height:15px;margin-left:-2px;background:var(--c-ink);border-radius:2px}
.at-stripl{display:flex;justify-content:space-between;font-size:11px;color:var(--c-ink3);margin-top:7px}
.at-big{font-size:38px;line-height:1;letter-spacing:-.02em;margin:6px 0 2px}
.at-big small{font-size:.4em;margin-left:5px;font-weight:600}
.at-big-def{color:#b0285f}
.at-big-feu{color:#c80f0f}
.at-cols{display:flex;align-items:flex-end;gap:3px;height:56px;margin-top:8px}
.at-colw{flex:1;height:100%;display:flex;align-items:flex-end}
.at-colw i{display:block;width:100%;border-radius:3px 3px 1px 1px;transition:height .3s}
.at-colsl{display:flex;justify-content:space-between;font-size:11px;color:var(--c-ink3);margin-top:5px}
.at-mini-facts{margin:10px 0 0;font-size:12.5px}
.at-mini-facts div{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid var(--c-line)}
.at-mini-facts dt{color:var(--c-ink3)}.at-mini-facts dd{margin:0;font-weight:600;text-align:right}
.at-feu-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.at-go{padding:15px;border:0;border-radius:12px;background:var(--c-acc);color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer}
.at-go:disabled{opacity:.45;cursor:default}
.at-gauge-wrap p{margin:12px 0 14px;font-size:14px}
.at-gauge{position:relative;height:12px;border-radius:6px;background:linear-gradient(90deg,#6fae7a,#e6c84f,#e08a3c,#b23a2e)}
.at-gauge u{position:absolute;top:-5px;width:4px;height:22px;margin-left:-2px;background:var(--c-ink);border-radius:2px}
.at-ov{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:16px;background:rgba(10,20,15,.58);backdrop-filter:blur(2px);animation:atFade .18s ease-out}
.at-modal{width:min(900px,100%);max-height:min(92dvh,900px);display:flex;flex-direction:column;background:var(--c-card);color:var(--c-ink);border:1px solid var(--c-line);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.4);overflow:hidden;animation:atPop .22s cubic-bezier(.2,.8,.2,1)}
.at-mh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:18px 20px 14px;border-bottom:1px solid var(--c-line)}
.at-mh h2{font-size:26px;line-height:1.1;letter-spacing:-.01em}
.at-mh p{margin:5px 0 0;font-size:13px;color:var(--c-ink3)}
.at-x{flex:none;width:38px;height:38px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink2);cursor:pointer;display:grid;place-items:center}
.at-x:hover{background:var(--c-bg)}
.at-mb{padding:16px 20px;overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0}
.at-mf{padding:12px 20px;border-top:1px solid var(--c-line);display:flex;justify-content:flex-end}
.at-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.at-kpi{background:var(--c-bg);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.at-kpi b{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:24px;line-height:1.1}
.at-kpi span{font-size:12px;color:var(--c-ink3)}
.at-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 6px}
.at-chips button{padding:5px 11px;border-radius:999px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink2);font:inherit;font-size:12.5px;cursor:pointer}
.at-chips button[aria-pressed=true]{background:var(--c-acc);border-color:var(--c-acc);color:#fff}
.at-reco{padding:12px 14px;border-radius:0 10px 10px 0;border-left:4px solid var(--c-line);background:var(--c-bg);margin-top:10px}
.at-reco.haute{border-color:#b23a2e}.at-reco.moyenne{border-color:#e0a23c}.at-reco.info{border-color:#7fb069}
.at-rtags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.at-tag,.at-lv{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px}
.at-tag{background:var(--c-card);border:1px solid var(--c-line);color:var(--c-ink2)}
.at-lv.haute{background:rgba(178,58,46,.14);color:#9a2b20}
.at-lv.moyenne{background:rgba(224,162,60,.2);color:#8a5a0c}
.at-lv.info{background:rgba(127,176,105,.22);color:#3f6b2c}
.at-reco h4{margin:0 0 4px;font-size:15px}
.at-reco p{margin:0;font-size:13.5px;line-height:1.55;color:var(--c-ink2)}
.at-acts{margin:8px 0 0;padding-left:18px;font-size:13px;line-height:1.5;color:var(--c-ink2)}
.at-acts li{margin:2px 0}
.at-mcard{min-height:0;min-width:0;display:flex;flex-direction:column;margin:10px;background:var(--c-card);border:1px solid var(--c-line);border-radius:14px;overflow:hidden}
.at-mhead{padding:10px 12px;border-bottom:1px solid var(--c-line);display:flex;flex-direction:column;gap:8px}
.at-mtools{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:13px}
.at-mbox{position:relative;flex:1;min-height:260px;background:#1b2a24}
.at-map{position:absolute;inset:0}
.at-seg{display:flex;gap:2px;border:1px solid var(--c-line);border-radius:9px;padding:2px}
.at-seg button{padding:4px 9px;border:0;border-radius:7px;background:transparent;color:var(--c-ink2);font:inherit;font-size:12.5px;cursor:pointer}
.at-seg button[aria-pressed=true]{background:var(--c-acc);color:#fff}
.at-chk{display:flex;gap:6px;align-items:center;cursor:pointer;color:var(--c-ink2)}
.at-tool{display:inline-flex;gap:6px;align-items:center;padding:6px 11px;border-radius:9px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.at-tool.on{background:var(--c-acc);border-color:var(--c-acc);color:#fff}
.at-tool:disabled{opacity:.45;cursor:default}
.at-ctl{position:absolute;z-index:1000;background:rgba(255,255,255,.94);color:#14231c;border-radius:9px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.at-hint{left:10px;top:10px;padding:7px 11px;max-width:calc(100% - 70px)}
.at-legend{left:10px;bottom:34px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;max-width:62%;max-height:70%;overflow-y:auto}
.at-legend strong{margin-top:4px;font-size:11.5px}.at-legend strong:first-child{margin-top:0}
.at-legend span{display:flex;gap:8px;align-items:center}
.at-legend i.r{border-radius:50%}
.at-tip{background:#fff;color:#1c2822;border:0;border-radius:6px;font-weight:600;box-shadow:0 1px 6px rgba(0,0,0,.3)}
@keyframes atGrow{from{transform:scaleX(0)}}
@keyframes atPulse{50%{opacity:.45}}
@keyframes atFade{from{opacity:0}}
@keyframes atPop{from{opacity:0;transform:translateY(12px) scale(.98)}}
@media (max-width:1250px){
  .at-body{grid-template-columns:minmax(420px,46%) minmax(0,1fr)}
  .at-duo{grid-template-columns:1fr}
}
@media (max-width:1000px){
  .at{height:auto;min-height:100dvh}
  .at-body{display:flex;flex-direction:column}
  .at-mcard{order:1;flex:none}
  .at-mbox{flex:none;height:56dvh}
  .at-panel{order:2;overflow:visible;border-right:0}
  .at-duo{grid-template-columns:repeat(2,minmax(0,1fr))}
  .at-hint{display:none}
}
@media (max-width:640px){
  .at-duo{grid-template-columns:1fr}
  .at-ov{padding:0}
  .at-modal{width:100%;max-height:100dvh;height:100dvh;border-radius:0;border:0}
  .at-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .at-mh h2{font-size:22px}
}
@media (prefers-reduced-motion:reduce){.at-stack,.at-pulse,.at-ov,.at-modal{animation:none}.at-colw i{transition:none}}
`;
