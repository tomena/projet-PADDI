/**
 * AnalyseTerritoriale.tsx — version 2.5 (aide à la décision, multilingue, 3 onglets)
 *
 * Onglets (lus dans l'URL, la sélection géographique reste identique) :
 *   /dashboard/analyse-territoriale               -> Environnement (par défaut)
 *   /dashboard/analyse-territoriale/environnement -> Environnement
 *   /dashboard/analyse-territoriale/economie      -> Économie
 *   /dashboard/analyse-territoriale/social        -> Social
 *
 * Environnement : fond au choix, occupation du sol, perte de couvert, feux, relief,
 *                 tracé de parcelle, orientations.
 * Économie et Social : fond OpenStreetMap uniquement, pas de tracé de parcelle,
 *                 pas d'occupation, de perte ni de feux. Le bandeau de la zone est
 *                 fourni par le panneau de l'onglet.
 *
 * Principes :
 *  - Chaque source est indépendante : si l'une échoue, les autres restent affichées.
 *  - Aucune recommandation n'est donnée sur une donnée qui n'a pas pu être obtenue.
 *  - Sources, dates et limites accessibles et exportables.
 *
 * Dépendances : leaflet, @types/leaflet, lucide-react, react-router-dom.
 * Routes serveur attendues : POST /api/worldcover, POST /api/gfw-perte, GET /api/firms.
 */
import { Component, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronRight, RotateCcw, PenTool, Check, X, Trash2, Download } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { TEXTS, ORI, LANGS, LOCALE, fill, type Lang, type Dict, type Lvl, type Theme, type OriKey } from "./analyseTexts";
import PanneauIndicateurs from "./PanneauIndicateurs"; // adaptez le chemin si besoin
import { useSanteMap } from "../lib/localisation";

/* ===================== CONFIGURATION ===================== */

type LevelKey = "ADM1" | "ADM2" | "ADM3";
type Onglet = "environnement" | "economie" | "social";
type Fond = "sat" | "topo" | "osm";

const VERSION = "2.5";
const DELAI_MS = 20000;
const DELAI_FEUX_MAJ_MS = 3 * 3600e3;
const REV = "9469f09";

const NOM_CLES = ["shapename", "nom_region", "region", "nom_district", "district", "nom_commune", "commune",
  "adm3_fr", "adm2_fr", "adm1_fr", "name_3", "name_2", "name_1", "nom", "name", "libelle"];

const WORLDCOVER_ACTIVE = true;
const BASSINS_GEOJSON_URL = ""; // ex. "/data/bassins_versants.geojson"
const LC_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LOSS_FIRST = 2001, LOSS_LAST = 2025;
const LOSS_YEARS = Array.from({ length: LOSS_LAST - LOSS_FIRST + 1 }, (_, i) => LOSS_FIRST + i);
const RAIN_YEARS = 5;
const RAIN_LAST = 2025;
const RAIN_FIRST = RAIN_LAST - RAIN_YEARS + 1;

/** Fonds de carte : satellite, topographie (ArcGIS) et OpenStreetMap, sans clé API. */
const FONDS: Record<Fond, string> = {
  sat: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
};
const ATTRIB: Record<Fond, string> = {
  sat: "Esri, Maxar, Earthstar Geographics",
  topo: "Esri, Maxar, Earthstar Geographics",
  osm: "© OpenStreetMap contributors",
};
const MADA: L.LatLngBoundsExpression = [[-25.9, 43.0], [-11.8, 50.7]];
const LAURITE = "#ff7a3d", CYAN = "#22d3ee", COULEUR_PERTE = "#dc6c9a";
const ORANGE_WC = "#f97316", ORANGE_WC_TXT = "#ea580c";

const ESRI = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage";
type Box = { minLon: number; minLat: number; maxLon: number; maxLat: number };
const esriUrl = (b: Box, W: number, H: number, year: number) =>
  `${ESRI}?f=image&format=png&bbox=${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}&bboxSR=4326&imageSR=4326&size=${W},${H}` +
  `&interpolation=RSP_NearestNeighbor&time=${Date.UTC(year, 0, 1)},${Date.UTC(year, 11, 31)}`;
const lossUrl = (from: number, to: number) =>
  `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=${from}&end_year=${to}&tcd=30&render_type=true_color`;

const GH = "wmgeolab/geoBoundaries";
const sources = (l: LevelKey) => {
  const f = `releaseData/gbOpen/MDG/${l}/geoBoundaries-MDG-${l}_simplified.geojson`;
  return [`https://raw.githubusercontent.com/${GH}/${REV}/${f}`, `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`];
};

/** Repères de classes : valeurs RGB de référence de l'occupation du sol (indices fixes). */
const CLASSES_RGB = [
  [57, 125, 73], [227, 226, 195], [228, 150, 53], [196, 40, 27], [165, 155, 143],
  [65, 155, 223], [122, 135, 198], [168, 235, 255], [97, 97, 97],
];
const N_VALID = 8; // classes 0 à 7 : utilisables ; 8 = nuages
const NUAGES = 8;
const SLOPES_MAX = [5, 15, 30, 1e9];
const SLOPES_COL = ["#7fb069", "#e6c84f", "#e08a3c", "#b23a2e"];
const RANG = { l: 1, n: 2, h: 3 } as const;
const couleurAge = (age: number) => (age <= 24 ? "rgb(200,15,15)" : age <= 48 ? "#f97316" : "#facc15");
const rgb = (c: number[]) => `rgb(${c.join(",")})`;

/* ===================== ERREURS ET RÉSEAU ===================== */

/**
 * Erreur d'une source. `code` est une clé de t.err (ou un message serveur brut),
 * `vars` les valeurs à insérer. La traduction se fait à l'affichage (errMsg).
 */
class ErreurSource extends Error {
  code: string;
  vars: Record<string, string | number>;
  constructor(code: string, vars: Record<string, string | number> = {}) {
    super(code);
    this.name = "ErreurSource";
    this.code = code;
    this.vars = vars;
  }
}
type Err = ErreurSource | null;

const toErr = (e: unknown): ErreurSource => (e instanceof ErreurSource ? e : new ErreurSource("unknown"));
const abortError = () => new DOMException("Annulé", "AbortError");

function errMsg(e: Err | unknown, t: Dict): string {
  if (!(e instanceof ErreurSource)) return t.err.unknown;
  const modele = (t.err as Record<string, string>)[e.code] ?? e.code;
  return fill(modele, e.vars);
}

/** fetch avec délai maximum, annulation externe et validation du JSON. */
async function fetchJSON<T>(url: string, signal?: AbortSignal, init: RequestInit = {}): Promise<T> {
  if (signal?.aborted) throw abortError();
  const ctl = new AbortController();
  const annule = () => ctl.abort();
  signal?.addEventListener("abort", annule);
  const minuteur = setTimeout(() => ctl.abort(), DELAI_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const corps = await r.json().catch(() => null);
    if (!r.ok) throw new ErreurSource(corps?.erreur || corps?.error || "http", corps?.erreur || corps?.error ? {} : { s: r.status });
    if (corps == null) throw new ErreurSource("reponse");
    return corps as T;
  } catch (e: any) {
    if (signal?.aborted) throw abortError();
    if (e instanceof ErreurSource) throw e;
    if (e?.name === "AbortError") throw new ErreurSource("timeout");
    throw new ErreurSource("conn");
  } finally {
    clearTimeout(minuteur);
    signal?.removeEventListener("abort", annule);
  }
}

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
  return v ? v.trim() : "—";
};

const veil = (f: Feat) => {
  const monde: L.LatLngTuple[] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
  const trous = polys(f).map((p) => p[0].map(([x, y]) => [y, x] as L.LatLngTuple));
  return L.polygon([monde, ...trous], { pane: "veil", stroke: false, fillColor: "#f1f4f7", fillOpacity: 0.78, interactive: false });
};

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
  if (!rings.length) throw new ErreurSource("geom");
  return rings.length === 1 ? { type: "Polygon", coordinates: rings } : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };
}

/* ===================== LIMITES ADMINISTRATIVES ===================== */

const CACHE: Partial<Record<LevelKey, Feat[]>> = {};
const ENCOURS: Partial<Record<LevelKey, Promise<Feat[]>>> = {};

function loadLevel(l: LevelKey): Promise<Feat[]> {
  if (CACHE[l]) return Promise.resolve(CACHE[l]!);
  if (ENCOURS[l]) return ENCOURS[l]!;
  const essais = sources(l).map(async (u) => {
    const j = await fetchJSON<any>(u);
    const feats: Feat[] = (j?.features ?? []).filter((f: Feat) => f?.geometry && /Polygon/.test(f.geometry.type));
    if (!feats.length) throw new ErreurSource("fichierVide");
    return feats;
  });
  const p = new Promise<Feat[]>((ok, ko) => {
    let reste = essais.length;
    essais.forEach((e) => e.then((v) => { CACHE[l] = v; ok(v); })
      .catch(() => { if (--reste === 0) ko(new ErreurSource("limits", { l })); }));
  }).finally(() => { delete ENCOURS[l]; });
  ENCOURS[l] = p;
  return p;
}

/* ===================== PLUIE MOYENNE ===================== */

const RAIN_CACHE = new Map<string, number>();

async function moyennePluie(lon: number, lat: number, signal: AbortSignal): Promise<{ valeur: number | null; err: Err }> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = RAIN_CACHE.get(key);
  if (hit != null) return { valeur: hit, err: null };
  try {
    const r = await fetchJSON<any>(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${RAIN_FIRST}-01-01&end_date=${RAIN_LAST}-12-31&daily=precipitation_sum&timezone=auto`,
      signal);
    const jours = r?.daily?.precipitation_sum;
    if (!Array.isArray(jours) || !jours.length) throw new ErreurSource("rainAbsent");
    const total = jours.reduce<number>((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
    const val = Math.round(total / RAIN_YEARS);
    RAIN_CACHE.set(key, val);
    return { valeur: val, err: null };
  } catch (e: any) {
    if (signal.aborted) throw e;
    return { valeur: null, err: toErr(e) };
  }
}

/* ===================== CULTURES : SECOND AVIS (WorldCover) ===================== */

async function pctCulturesWC(f: Feat, signal: AbortSignal): Promise<{ pct: number | null; err: Err }> {
  if (!WORLDCOVER_ACTIVE) return { pct: null, err: new ErreurSource("wcDesactive") };
  try {
    const j = await fetchJSON<{ pct?: number }>("/api/worldcover", signal, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: simple(f) }),
    });
    if (typeof j.pct !== "number" || !Number.isFinite(j.pct)) throw new ErreurSource("wcBad");
    return { pct: j.pct, err: null };
  } catch (e: any) {
    if (signal.aborted) throw e;
    return { pct: null, err: e instanceof ErreurSource ? e : new ErreurSource("wc") };
  }
}

/* ===================== IMAGE SATELLITE ===================== */

function chargerImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    if (signal.aborted) return ko(abortError());
    const img = new Image();
    img.crossOrigin = "anonymous";
    const stop = () => { img.src = ""; ko(abortError()); };
    signal.addEventListener("abort", stop, { once: true });
    img.onload = () => { signal.removeEventListener("abort", stop); ok(img); };
    img.onerror = () => { signal.removeEventListener("abort", stop); ko(new ErreurSource("img")); };
    img.src = src;
  });
}

/* ===================== ANALYSE ===================== */

type Part = { k: number; pct: number; col: string };
type Fiabilite = "bonne" | "moyenne" | "faible";
type Result = {
  land: Part[];
  slope: { k: number; pct: number; col: string }[] | null;
  cloudPct: number;
  couverture: number;
  elevMin: number | null; elevMax: number | null; elevMean: number | null;
  rain: number | null; areaKm2: number;
  cropSteep: number | null; steepPct: number | null;
  treePct: number; cropPct: number; barePct: number; wetPct: number; savPct: number; builtPct: number;
  cultWC: number | null;
  bassin: string | null;
  resolution: { small: boolean; pixelM: number; stepKm: number };
  statuts: { relief: Err; pluie: Err; cultures: Err };
  fiable: Fiabilite;
};

async function analyse(f: Feat, signal: AbortSignal, year: number): Promise<Result> {
  const b = bbox(f);
  const midLat = (b.minLat + b.maxLat) / 2;
  const wKm = Math.max(0.01, (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180));
  const hKm = Math.max(0.01, (b.maxLat - b.minLat) * 110.54);
  const Lpx = Math.max(40, Math.min(700, Math.ceil(Math.max(wKm, hKm) * 100)));
  const W = wKm >= hKm ? Lpx : Math.max(24, Math.round((Lpx * wKm) / hKm));
  const H = wKm >= hKm ? Math.max(24, Math.round((Lpx * hKm) / wKm)) : Lpx;

  /* 1. Occupation du sol : indispensable */
  const img = await chargerImage(esriUrl(b, W, H, year), signal);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const cx = cv.getContext("2d", { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0);
  let px: Uint8ClampedArray;
  try { px = cx.getImageData(0, 0, W, H).data; }
  catch { throw new ErreurSource("cors"); }

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
    CLASSES_RGB.forEach((c, ci) => {
      const d = (px[i * 4] - c[0]) ** 2 + (px[i * 4 + 1] - c[1]) ** 2 + (px[i * 4 + 2] - c[2]) ** 2;
      if (d < bd) { bd = d; best = ci; }
    });
    return best;
  };

  const cnt = new Array(CLASSES_RGB.length).fill(0);
  let tot = 0, inMask = 0;
  for (let i = 0; i < W * H; i++) {
    if (mask[i * 4 + 3] <= 128) continue;
    inMask++;
    const c = cls(i);
    if (c < 0) continue;
    cnt[c]++;
    if (c < N_VALID) tot++;
  }
  if (!tot || !inMask) throw new ErreurSource("noOcc");
  const couverture = (tot / inMask) * 100;
  const pct = (c: number) => (cnt[c] / tot) * 100;

  /* 2. Relief : facultatif, mais signalé s'il manque */
  const N = 10, minSpan = 0.012;
  const small = b.maxLon - b.minLon < minSpan || b.maxLat - b.minLat < minSpan;
  const sLon = Math.max(b.maxLon - b.minLon, minSpan), sLat = Math.max(b.maxLat - b.minLat, minSpan);
  const e0 = (b.minLon + b.maxLon) / 2 - sLon / 2, n1 = (b.minLat + b.maxLat) / 2 + sLat / 2;
  const dLon = sLon / (N - 1), dLat = sLat / (N - 1);
  const lats: number[] = [], lons: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { lats.push(+(n1 - i * dLat).toFixed(5)); lons.push(+(e0 + j * dLon).toFixed(5)); }

  let z: number[] = [];
  let statRelief: Err = null;
  try {
    const el = await fetchJSON<{ elevation?: number[] }>(
      `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lons.join(",")}`, signal);
    if (!Array.isArray(el.elevation) || el.elevation.length !== lats.length) throw new ErreurSource("altitude");
    z = el.elevation.map((v) => (Number.isFinite(v) ? v : 0));
  } catch (e: any) {
    if (signal.aborted) throw e;
    statRelief = e instanceof ErreurSource ? e : new ErreurSource("relief");
  }

  const dx = dLon * 111320 * Math.cos((midLat * Math.PI) / 180), dy = dLat * 110540;
  const sc = new Array(SLOPES_MAX.length).fill(0);
  let sn = 0, cropSteep = 0, cropN = 0;
  if (!statRelief) {
    for (let i = 1; i < N - 1; i++) for (let j = 1; j < N - 1; j++) {
      const k = i * N + j;
      const ins = inFeat(lons[k], lats[k], f);
      if (!ins && !small) continue;
      const s = Math.hypot((z[k + 1] - z[k - 1]) / (2 * dx), (z[k - N] - z[k + N]) / (2 * dy)) * 100;
      sc[SLOPES_MAX.findIndex((m) => s < m)]++; sn++;
      if (!ins) continue;
      const c = cls(Math.min(H - 1, Math.max(0, Math.floor(Y(lats[k])))) * W + Math.min(W - 1, Math.max(0, Math.floor(X(lons[k])))));
      if (c === 2) { cropN++; if (s >= 15) cropSteep++; }
    }
  }
  const inside = z.filter((_, k) => inFeat(lons[k], lats[k], f));
  const zs = small || !inside.length ? z : inside;
  const elevOK = !statRelief && zs.length > 0;

  /* 3. Pluie et second avis cultures (indépendants) */
  const [cLon, cLat] = center(f);
  const [pluieR, wc] = await Promise.all([moyennePluie(cLon, cLat, signal), pctCulturesWC(f, signal)]);

  /* 4. Bassin versant (facultatif) */
  let bassin: string | null = null;
  if (BASSINS_GEOJSON_URL) {
    try {
      const g = await fetchJSON<any>(BASSINS_GEOJSON_URL, signal);
      const hit = (g.features ?? []).find((x: Feat) => inFeat(cLon, cLat, x));
      bassin = hit ? nameOf(hit) : "";
    } catch (e: any) {
      if (signal.aborted) throw e;
      bassin = null;
    }
  }

  const erreurs = [statRelief, pluieR.err, wc.err].filter(Boolean).length;
  const fiable: Fiabilite = erreurs >= 2 || couverture < 60 ? "faible" : erreurs === 1 || couverture < 85 ? "moyenne" : "bonne";

  return {
    land: CLASSES_RGB.slice(0, N_VALID).map((_, k) => ({ k, pct: pct(k), col: rgb(CLASSES_RGB[k]) }))
      .filter((x) => x.pct > 0).sort((a, c) => c.pct - a.pct),
    cloudPct: (cnt[NUAGES] / (tot + cnt[NUAGES] || 1)) * 100,
    couverture,
    slope: elevOK && sn ? SLOPES_MAX.map((_, k) => ({ k, pct: (sc[k] / sn) * 100, col: SLOPES_COL[k] })) : null,
    elevMin: elevOK ? Math.min(...zs) : null,
    elevMax: elevOK ? Math.max(...zs) : null,
    elevMean: elevOK ? zs.reduce((a, c) => a + c, 0) / zs.length : null,
    rain: pluieR.valeur,
    areaKm2: areaKm2(f),
    cropSteep: elevOK && cropN ? (cropSteep / cropN) * 100 : null,
    steepPct: elevOK && sn ? ((sc[2] + sc[3]) / sn) * 100 : null,
    treePct: pct(0), cropPct: pct(2), barePct: pct(4), wetPct: pct(6), savPct: pct(1), builtPct: pct(3),
    cultWC: wc.pct,
    bassin,
    resolution: { small, pixelM: (wKm * 1000) / W, stepKm: Math.max(dx, dy) / 1000 },
    statuts: { relief: statRelief, pluie: pluieR.err, cultures: wc.err },
    fiable,
  };
}

function useAnalysis(f: Feat | null, year: number) {
  const [s, setS] = useState<{ res: Result | null; busy: boolean; err: Err }>({ res: null, busy: false, err: null });
  useEffect(() => {
    if (!f) { setS({ res: null, busy: false, err: null }); return; }
    const c = new AbortController();
    setS({ res: null, busy: true, err: null });
    analyse(f, c.signal, year)
      .then((res) => { if (!c.signal.aborted) setS({ res, busy: false, err: null }); })
      .catch((e) => { if (!c.signal.aborted) setS({ res: null, busy: false, err: e instanceof ErreurSource ? e : new ErreurSource("analyse") }); });
    return () => c.abort();
  }, [f, year]);
  return s;
}

/* ===================== PERTE DE COUVERT ===================== */

type PerteAn = { annee: number; ha: number };
const LOSS_CACHE = new WeakMap<Feat, Promise<PerteAn[]>>();

function lossFor(f: Feat): Promise<PerteAn[]> {
  let p = LOSS_CACHE.get(f);
  if (!p) {
    p = fetchJSON<any>("/api/gfw-perte", undefined, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: simple(f) }),
    }).then((j) => {
      const rows = Array.isArray(j?.annees)
        ? j.annees.filter((a: any) => Number.isFinite(a?.annee) && Number.isFinite(a?.ha) && a.ha >= 0)
        : null;
      if (!rows) throw new ErreurSource("reponse");
      return rows as PerteAn[];
    });
    LOSS_CACHE.set(f, p);
    p.catch(() => LOSS_CACHE.delete(f));
  }
  return p;
}

function useLoss(f: Feat | null) {
  const [s, setS] = useState<{ rows: PerteAn[] | null; busy: boolean; err: Err }>({ rows: null, busy: false, err: null });
  useEffect(() => {
    if (!f) { setS({ rows: null, busy: false, err: null }); return; }
    let actif = true;
    setS({ rows: null, busy: true, err: null });
    lossFor(f)
      .then((rows) => { if (actif) setS({ rows, busy: false, err: null }); })
      .catch((e) => { if (actif) setS({ rows: null, busy: false, err: toErr(e) }); });
    return () => { actif = false; };
  }, [f]);
  return s;
}

/* ===================== FEUX (NASA FIRMS) ===================== */

type Feu = { lon: number; lat: number; t: number; heure: string; conf: "l" | "n" | "h" | null; frp: number | null; sat: string; age: number };

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
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !p.acq_date || p.acq_time == null) continue;
    const h = String(p.acq_time).padStart(4, "0");
    const t = new Date(`${p.acq_date}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    const frp = Number(p.frp);
    out.push({
      lon: c[0], lat: c[1], t,
      heure: `${h.slice(0, 2)}:${h.slice(2, 4)}`,
      conf: niveauConfiance(p.confidence),
      frp: Number.isFinite(frp) ? frp : null,
      sat: typeof p.satellite === "string" ? p.satellite : "",
    });
  }
  return out;
}

/* ===================== ORIENTATIONS ===================== */

type Trend = "hausse" | "baisse" | "stable" | null;
type Extra = { lossHa: number | null; lossPct: number | null; lossTrend: Trend; fires72: number; fires24: number; areaKm2: number };
type Orient = { th: Theme; lvl: Lvl; t: string; d: string; acts?: string[] };

const THEME_ORDER: Theme[] = ["restauration", "agriculture", "eau", "feux", "conservation", "communautes"];
const LVL_RANK: Record<Lvl, number> = { haute: 0, moyenne: 1, info: 2 };

/** Score de vulnérabilité à l'érosion (0-100). Null si le relief manque. */
const vuln = (r: Result): number | null => {
  if (r.steepPct == null) return null;
  const c = (v: number, m: number) => Math.min(v, m) / m;
  return Math.round(35 * c(r.steepPct, 60) + 25 * c(r.cropSteep ?? 0, 60) + 15 * c(r.barePct, 25) + 15 * (1 - c(r.treePct, 50)) + 10 * c(r.rain ?? 0, 2500));
};

function orientations(R: Result, x: Extra, periode: string, lang: Lang, N: (n: number, d?: number) => string): Orient[] {
  const ti = ORI[lang];
  const rules = ti.rules;
  const r = { ...R, cropPct: Math.max(R.cropPct, R.cultWC ?? 0) };
  const relief = R.steepPct != null;
  const steep = R.steepPct ?? 0, cropSteep = R.cropSteep ?? 0;
  const o: Orient[] = [];
  const loss = x.lossPct;
  const rain = r.rain;

  // Ajoute une recommandation : texte pris dans le dictionnaire de la langue, valeurs insérées.
  const add = (th: Theme, lvl: Lvl, key: OriKey, v: Record<string, string> = {}) => {
    const src = rules[key];
    const vars = { periode, ...v };
    o.push({ th, lvl, t: fill(src.t, vars), d: fill(src.d, vars), acts: src.a?.map((s) => fill(s, vars)) });
  };

  const pentes = relief && steep > 25 ? fill(ti.extras.pentesSuffix, { steep: N(steep) }) : "";
  const bassinTxt = r.bassin ? fill(ti.extras.bassinSuffix, { nom: r.bassin }) : "";

  /* RESTAURATION */
  if (loss != null && loss >= 3) add("restauration", "haute", "lossHigh", { ha: N(x.lossHa ?? 0), pct: N(loss, 1), pentes });
  else if (loss != null && loss >= 0.5) add("restauration", "moyenne", "lossMid", { ha: N(x.lossHa ?? 0), pct: N(loss, 1) });

  if (relief && steep > 35 && r.treePct < 25) add("restauration", "haute", "versants", { steep: N(steep), tree: N(r.treePct) });
  if (r.barePct > 10) add("restauration", "haute", "solsNus", { bare: N(r.barePct, 1) });
  if (r.treePct >= 8 && r.treePct < 40 && (r.barePct > 2 || r.savPct > 20)) add("restauration", "moyenne", "regen", { tree: N(r.treePct, 1) });
  if (r.treePct >= 15 && r.treePct < 45 && loss != null && loss >= 1) add("restauration", "moyenne", "fragments", { tree: N(r.treePct, 1), loss: N(loss, 1) });
  if (r.wetPct > 3 && loss != null && loss >= 1) add("restauration", "moyenne", "mangroves", { wet: N(r.wetPct, 1) });
  if (r.treePct < 25 && r.cropPct + r.savPct + r.builtPct > 50) add("restauration", "moyenne", "boisEnergie", { tree: N(r.treePct, 1) });
  if (rain != null && rain < 800 && r.treePct < 15) add("restauration", "moyenne", "zoneSeche", { rain: N(rain), tree: N(r.treePct, 1) });

  /* CONSERVATION */
  if (x.lossTrend === "hausse" && loss != null && loss >= 0.5) add("conservation", "haute", "accel");
  if (r.treePct >= 40) add("conservation", "info", "conserver", { tree: N(r.treePct, 1) });
  if (r.wetPct > 3) add("conservation", "moyenne", "zonesHumides", { wet: N(r.wetPct, 1) });

  /* AGRICULTURE */
  if (relief && cropSteep > 30 && (rain ?? 0) > 1000) add("agriculture", "haute", "erosionCultures", { cropSteep: N(cropSteep), rain: N(rain!) });
  else if (relief && cropSteep > 30) add("agriculture", "moyenne", "pentesCultures", { cropSteep: N(cropSteep) });
  if (r.cropPct > 20 && r.treePct < 30) add("agriculture", "moyenne", "agroforesterie", { crop: N(r.cropPct, 1), tree: N(r.treePct, 1) });
  if (loss != null && loss >= 1 && r.cropPct > 10 && r.treePct >= 15) add("agriculture", loss >= 3 ? "haute" : "moyenne", "defriche", { loss: N(loss, 1) });
  if (rain != null && rain < 900 && r.cropPct > 10) add("agriculture", "moyenne", "peuEau", { rain: N(rain), a: String(RAIN_FIRST), b: String(RAIN_LAST) });
  if (r.savPct > 40) add("agriculture", "moyenne", "paturages", { sav: N(r.savPct, 1) });
  if (relief && r.cropPct > 25 && steep < 15) add("agriculture", "info", "intensif", { crop: N(r.cropPct, 1) });
  if (r.treePct >= 20 && r.cropPct > 8) add("agriculture", "info", "filieres");

  /* EAU ET SOLS */
  if (relief && steep > 25 && r.barePct > 3) add("eau", "haute", "lavaka", { steep: N(steep), bare: N(r.barePct, 1) });
  if (relief && steep > 25 && r.cropPct > 10) add("eau", "moyenne", "rizieres");
  if (relief && steep > 25 && (rain ?? 0) > 1200) add("eau", "moyenne", "tetes", { rain: N(rain!), bassin: bassinTxt });

  /* FEUX */
  if (x.fires72 > 0) {
    const dens = (x.fires72 / Math.max(x.areaKm2, 1)) * 100;
    const lvl: Lvl = dens >= 1 || x.fires24 >= 10 ? "haute" : "moyenne";
    add("feux", lvl, "feux", { f72: N(x.fires72), f24: N(x.fires24) });
    if (r.savPct > 30) o[o.length - 1].acts = [...(o[o.length - 1].acts ?? []), ti.extras.feuxBrulis];
  }

  /* COMMUNAUTÉS */
  if (r.treePct >= 15 && loss != null && loss >= 0.5) add("communautes", "moyenne", "gestionComm");
  if (r.treePct >= 25) add("communautes", "info", "revenus");

  if (!o.length) add("conservation", "info", "aucun");

  const final = R.fiable === "bonne" ? o : o.map((a) => ({ ...a, d: a.d + " " + ti.extras.partialSuffix }));
  return final.sort((a, b) => LVL_RANK[a.lvl] - LVL_RANK[b.lvl]);
}

/* ===================== EXPORT ===================== */

function telechargerJSON(nomFichier: string, contenu: unknown) {
  const blob = new Blob([JSON.stringify(contenu, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomFichier;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ===================== COMPOSANT COEUR ===================== */

function Coeur({ lang, t, onglet }: { lang: Lang; t: Dict; onglet: Onglet }) {
  const N = useCallback((n: number, d = 0) => n.toLocaleString(LOCALE[lang], { maximumFractionDigits: d }), [lang]);
  const fmtArea = (km2: number) => (km2 < 10 ? `${N(km2 * 100, km2 < 0.1 ? 2 : 1)} ha` : `${N(km2)} km²`);
  const periodeDe = (a: number, b: number) => (a === b ? String(a) : fill(t.periode, { a, b }));

  const elMap = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null), loss = useRef<L.TileLayer | null>(null), ov = useRef<L.ImageOverlay | null>(null);
  const kids = useRef<L.GeoJSON | null>(null), outline = useRef<L.GeoJSON | null>(null);
  const veilL = useRef<L.Polygon | null>(null), draft = useRef<L.FeatureGroup | null>(null), fireL = useRef<L.FeatureGroup | null>(null);
  const pts = useRef<L.LatLng[]>([]);
  const pickRef = useRef<(l: LevelKey, i: number) => void>(() => {});
  const modalRef = useRef<HTMLDivElement>(null), closeRef = useRef<HTMLButtonElement>(null);

  const [regs, setRegs] = useState<Feat[]>([]);
  const [adm2, setAdm2] = useState<Feat[] | null>(null);
  const [adm3, setAdm3] = useState<Feat[] | null>(null);
  const [ri, setRi] = useState(""), [di, setDi] = useState(""), [ci, setCi] = useState("");
  const [parcel, setParcel] = useState<Feat | null>(null);
  const [drawing, setDrawing] = useState(false), [nPts, setNPts] = useState(0);
  const [fond, setFond] = useState<Fond>("sat");
  const [showLC, setShowLC] = useState(true), [lcYear, setLcYear] = useState(2023);
  const [showLoss, setShowLoss] = useState(true), [dfFrom, setDfFrom] = useState(2015), [dfTo, setDfTo] = useState(LOSS_LAST);
  const [showFires, setShowFires] = useState(true), [fPeriod, setFPeriod] = useState<24 | 48 | 72>(72), [conf, setConf] = useState<"l" | "n" | "h">("l");
  const [mask, setMask] = useState(true);
  const [show, setShow] = useState(false);
  const [themeF, setThemeF] = useState<"Toutes" | Theme>("Toutes");
  const [loadErr, setLoadErr] = useState("");
  const [annonce, setAnnonce] = useState("");

  /* ----- sélection administrative ----- */
  const rF = ri !== "" ? regs[+ri] ?? null : null;
  const dists = useMemo(
    () => (rF && adm2 ? adm2.filter((d) => childOf(d, rF)).sort((a, b) => nameOf(a).localeCompare(nameOf(b), lang)) : []),
    [rF, adm2, lang]);
  const dF = di !== "" ? dists[+di] ?? null : null;
  const coms = useMemo(
    () => (dF && adm3 ? adm3.filter((c) => childOf(c, dF)).sort((a, b) => nameOf(a).localeCompare(nameOf(b), lang)) : []),
    [dF, adm3, lang]);
  const cF = ci !== "" ? coms[+ci] ?? null : null;
  const admin = cF || dF || rF;
  const selected = parcel || admin;
  const hi = parcel ? CYAN : LAURITE;

  // Les calculs environnementaux ne tournent que sur l'onglet Environnement.
  // La sélection géographique, elle, reste identique sur les trois onglets.
  const env = onglet === "environnement";

  // Économie et Social : fond OpenStreetMap seul, sans occupation, perte ni feux.
  const fondAff: Fond = env ? fond : "osm";
  const occAff = env && showLC;
  const lossAff = env && showLoss;
  const firesAff = env && showFires;

  const rRes = useAnalysis(env ? rF : null, lcYear);
  const dRes = useAnalysis(env ? dF : null, lcYear);
  const cRes = useAnalysis(env ? cF : null, lcYear);
  const pRes = useAnalysis(env ? parcel : null, lcYear);
  const current = parcel ? pRes : cF ? cRes : dF ? dRes : rRes;
  const res = current.res;
  const lossS = useLoss(env ? selected : null);
  const zoneKm2 = useMemo(() => (selected ? areaKm2(selected) : 0), [selected]);

  const list = !rF ? regs : !dF ? dists : coms;
  const kidLevel: LevelKey = !rF ? "ADM1" : !dF ? "ADM2" : "ADM3";

  /* ----- perte de couvert : chiffres de la période ----- */
  const lossStats = useMemo(() => {
    if (!lossS.rows) return null;
    const rows = lossS.rows;
    const years = LOSS_YEARS.filter((y) => y >= dfFrom && y <= dfTo).map((y) => ({ annee: y, ha: rows.find((a) => a.annee === y)?.ha ?? 0 }));
    const total = years.reduce((s, a) => s + a.ha, 0);
    const peak = years.reduce((m, a) => (a.ha > m.ha ? a : m), years[0] ?? { annee: 0, ha: 0 });
    let trend: Trend = null;
    if (years.length >= 4) {
      const half = Math.floor(years.length / 2);
      const avg = (a: typeof years) => a.reduce((s, y) => s + y.ha, 0) / Math.max(1, a.length);
      const a = avg(years.slice(0, half)), b = avg(years.slice(years.length - half));
      trend = b > a * 1.25 && b - a > 5 ? "hausse" : b < a * 0.75 ? "baisse" : "stable";
    }
    return {
      years, total, peak, trend,
      max: Math.max(1, ...years.map((a) => a.ha)),
      pct: zoneKm2 > 0 ? (total / (zoneKm2 * 100)) * 100 : 0,
    };
  }, [lossS.rows, dfFrom, dfTo, zoneKm2]);

  /* ----- points de feux ----- */
  const [feuxBruts, setFeuxBruts] = useState<any[]>([]);
  const [fLoad, setFLoad] = useState(true), [fErr, setFErr] = useState<Err>(null), [fMaj, setFMaj] = useState<number | null>(null), [now, setNow] = useState(Date.now());
  const chargerFeux = useCallback(async () => {
    setFLoad(true); setFErr(null);
    try {
      const j = await fetchJSON<any>("/api/firms");
      setFeuxBruts(Array.isArray(j.features) ? j.features : []);
      setFMaj(Date.now());
    } catch (e: any) {
      setFErr(toErr(e));
    } finally {
      setFLoad(false);
    }
  }, []);
  useEffect(() => {
    chargerFeux();
    const a = setInterval(chargerFeux, 15 * 60 * 1000), b = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [chargerFeux]);

  const feuxPerimes = fMaj != null && now - fMaj > DELAI_FEUX_MAJ_MS;
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
  const heureMaj = fMaj ? new Date(fMaj).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit" }) : "—";

  /* ----- tracé de parcelle (Environnement uniquement) ----- */
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
    setParcel({ type: "Feature", properties: { shapeName: t.niveaux.parcelle }, geometry: { type: "Polygon", coordinates: [ring] } });
    cancelDraw();
  };
  const startDraw = () => { setParcel(null); pts.current = []; draft.current?.clearLayers(); setNPts(0); setDrawing(true); };

  const onRegion = (v: string) => { setRi(v); setDi(""); setCi(""); setParcel(null); };
  const onDistrict = (v: string) => { setDi(v); setCi(""); setParcel(null); };
  const onCommune = (v: string) => { setCi(v); setParcel(null); };
  pickRef.current = (l, i) => (l === "ADM1" ? onRegion : l === "ADM2" ? onDistrict : onCommune)(String(i));
  const reset = () => { onRegion(""); cancelDraw(); };

  // Hors Environnement, un tracé en cours est annulé.
  useEffect(() => { if (!env && drawing) cancelDraw(); if (!env) setParcel(null); }, [env]);

  /* ----- chargement des limites ----- */
  useEffect(() => {
    loadLevel("ADM1")
      .then((r) => {
        setRegs(r);
        if (r.length < 15 || r.length > 30) setLoadErr(fill(t.banniereNiveau, { n: r.length }));
      })
      .catch((e) => setLoadErr(errMsg(toErr(e), t)));
  }, [t]);
  useEffect(() => {
    if (rF && !adm2) loadLevel("ADM2").then(setAdm2).catch((e) => setLoadErr(errMsg(toErr(e), t)));
  }, [rF, adm2, t]);
  useEffect(() => {
    if (dF && !adm3) loadLevel("ADM3").then(setAdm3).catch((e) => setLoadErr(errMsg(toErr(e), t)));
  }, [dF, adm3, t]);
  useEffect(() => { setShow(false); }, [selected]);
  // Changer d'onglet ferme la fenêtre des orientations (elle ne concerne que l'environnement)
  useEffect(() => { setShow(false); }, [onglet]);

  /* Annonce pour lecteurs d'écran */
  useEffect(() => {
    if (!selected) { setAnnonce(""); return; }
    if (current.busy) setAnnonce(t.annonce.analyse);
    else if (current.err) setAnnonce(fill(t.annonce.erreur, { e: errMsg(current.err, t) }));
    else if (res) setAnnonce(fill(t.annonce.termine, { f: t.fiableBas[res.fiable] }));
  }, [selected, current.busy, current.err, res, t]);

  /* ----- fenêtre des orientations ----- */
  useEffect(() => {
    if (!show) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShow(false); return; }
      if (e.key !== "Tab" || !modalRef.current) return;
      const f = modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, summary, [tabindex]:not([tabindex="-1"])');
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

  /* ----- la carte ----- */
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
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  /* fond de carte : choisi en Environnement, OpenStreetMap en Économie et Social */
  useEffect(() => {
    if (!map.current) return;
    base.current?.remove();
    base.current = L.tileLayer(FONDS[fondAff], { maxZoom: 18, attribution: ATTRIB[fondAff] }).addTo(map.current);
    base.current.bringToBack();
  }, [fondAff]);

  useSanteMap(
    map,
      {
        region: rF ? nameOf(rF) : null,
        district: dF ? nameOf(dF) : null,
        commune: cF ? nameOf(cF) : null,
      },
      onglet === "social",
  );

  /* entités cliquables du niveau suivant */
  useEffect(() => {
    if (!map.current) return;
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
    }).addTo(map.current);
  }, [list, kidLevel, drawing]);

  /* contour, voile et zoom */
  useEffect(() => {
    if (!map.current) return;
    outline.current?.remove(); veilL.current?.remove();
    if (!selected) { map.current.flyToBounds(MADA, { duration: 1 }); return; }
    if (mask) veilL.current = veil(selected).addTo(map.current);
    outline.current = L.geoJSON(selected as any, { pane: "vec", interactive: false, style: { color: hi, weight: 3.5, fill: false } }).addTo(map.current);
  }, [selected, mask]);
  useEffect(() => {
    if (!selected || !map.current) return;
    map.current.flyToBounds(L.geoJSON(selected as any).getBounds(), { padding: [40, 40], maxZoom: parcel ? 17 : undefined, duration: 1.2 });
  }, [selected]);

  /* occupation du sol (image) : uniquement en Environnement */
  useEffect(() => {
    ov.current?.remove();
    if (!occAff || !map.current) return;
    const b = selected ? bbox(selected) : { minLon: 43.2, minLat: -25.7, maxLon: 50.6, maxLat: -11.9 };
    const midLat = (b.minLat + b.maxLat) / 2;
    const wKm = (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180), hKm = (b.maxLat - b.minLat) * 110.54;
    const Lpx = Math.max(64, Math.min(1400, Math.ceil(Math.max(wKm, hKm) * 100)));
    const W = wKm >= hKm ? Lpx : Math.max(32, Math.round((Lpx * wKm) / hKm)), H = wKm >= hKm ? Math.max(32, Math.round((Lpx * hKm) / wKm)) : Lpx;
    ov.current = L.imageOverlay(esriUrl(b, W, H, lcYear), [[b.minLat, b.minLon], [b.maxLat, b.maxLon]], { opacity: 0.6, interactive: false }).addTo(map.current);
  }, [occAff, selected, lcYear]);

  /* perte de couvert (tuiles GFW) : uniquement en Environnement */
  useEffect(() => {
    if (!map.current) return;
    loss.current?.remove();
    if (!lossAff) return;
    loss.current = L.tileLayer(lossUrl(dfFrom, dfTo), { pane: "perte", maxNativeZoom: 12, opacity: 0.95, attribution: "Perte de couvert © UMD/Hansen, GFW" }).addTo(map.current);
  }, [lossAff, dfFrom, dfTo]);

  /* points de feux : uniquement en Environnement */
  useEffect(() => {
    if (!map.current) return;
    fireL.current?.remove();
    if (!firesAff || !feuxAff.length) return;
    const m = map.current, g = L.featureGroup(), renderer = L.canvas({ pane: "feux", padding: 0.5 });
    const rayon = (z: number) => Math.max(2.5, Math.min(9, 2 + (z - 5) * 0.75));
    feuxAff.forEach((f) => {
      const confTxt = t.feux.conf[f.conf ?? "na"];
      L.circleMarker([f.lat, f.lon], { pane: "feux", renderer, radius: rayon(m.getZoom()), fillColor: couleurAge(f.age), color: "#fff", weight: 0.6, opacity: 0.9, fillOpacity: 0.92 })
        .bindPopup(`<div style="font:13px/1.5 system-ui"><strong>${t.feux.pointTitre}</strong><br/>${new Date(f.t).toLocaleDateString(LOCALE[lang])} · ${f.heure} UTC<br/>${confTxt}${f.frp != null ? `<br/>${t.feux.puissance} : ${f.frp} MW` : ""}${f.sat ? `<br/>${t.feux.satellite} : ${f.sat}` : ""}</div>`)
        .addTo(g);
    });
    g.addTo(m);
    const maj = () => g.eachLayer((l) => l instanceof L.CircleMarker && l.setRadius(rayon(m.getZoom())));
    m.on("zoomend", maj);
    fireL.current = g;
    return () => { m.off("zoomend", maj); g.remove(); };
  }, [firesAff, feuxAff, lang, t]);

  /* tracé de parcelle : clics (Environnement uniquement) */
  useEffect(() => {
    const m = map.current;
    if (!m || !drawing || !env) return;
    m.getContainer().style.cursor = "crosshair";
    m.doubleClickZoom.disable();
    const click = (e: L.LeafletMouseEvent) => {
      const last = pts.current[pts.current.length - 1];
      if (last && last.distanceTo(e.latlng) < 1e-7) return;
      pts.current.push(e.latlng); redraw();
    };
    const dbl = () => finishDraw();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") cancelDraw(); };
    m.on("click", click); m.on("dblclick", dbl);
    window.addEventListener("keydown", key);
    return () => {
      m.off("click", click); m.off("dblclick", dbl);
      window.removeEventListener("keydown", key);
      m.getContainer().style.cursor = ""; m.doubleClickZoom.enable();
    };
  }, [drawing, env]);

  /* ----- affichage ----- */
  const levels = [{ f: rF, s: rRes }, { f: dF, s: dRes }, { f: cF, s: cRes }, { f: parcel, s: pRes }];
  const periodeTxt = periodeDe(dfFrom, dfTo);
  const advice = useMemo(
    () => (res ? orientations(res, { lossHa: lossStats?.total ?? null, lossPct: lossStats?.pct ?? null, lossTrend: lossStats?.trend ?? null, fires72: n72, fires24: n24, areaKm2: zoneKm2 }, periodeTxt, lang, N) : []),
    [res, lossStats, n72, n24, zoneKm2, periodeTxt, lang, N]);
  const themesPresents = useMemo(
    () => THEME_ORDER.map((th) => ({ th, n: advice.filter((a) => a.th === th).length })).filter((x) => x.n > 0),
    [advice]);
  const adviceShown = themeF === "Toutes" ? advice : advice.filter((a) => a.th === themeF);
  const nHautes = advice.filter((a) => a.lvl === "haute").length;
  const score = res ? vuln(res) : null;
  const openAnalysis = () => { setThemeF("Toutes"); setShow(true); };

  const statutsManquants = res
    ? (Object.entries(res.statuts) as [keyof Result["statuts"], Err][])
        .filter(([, v]) => v)
        .map(([k, v]) => `${t.statuts[k]} (${errMsg(v, t)})`)
    : [];

  const hint = drawing
    ? fill(t.hint.dessin, { n: nPts })
    : !rF ? t.hint.region : !dF ? t.hint.district : !cF ? t.hint.commune : t.hint.comparer;
  const classeNom = (k: number) => t.classes[k];
  const legendLC = res ? res.land : CLASSES_RGB.slice(0, N_VALID).map((c, k) => ({ k, pct: 0, col: rgb(c) }));
  const lvlText = parcel
    ? (admin ? fill(t.lvlParcelleDans, { nom: nameOf(admin) }) : t.lvlParcelle)
    : cF ? fill(t.lvlCommune, { commune: nameOf(cF), region: nameOf(rF!) })
    : dF ? fill(t.lvlDistrict, { region: nameOf(rF!) })
    : t.lvlRegion;
  const area = fmtArea(zoneKm2).split(" ");
  const yearOptions = LOSS_YEARS.map((y) => <option key={y}>{y}</option>);

  const exporter = () => {
    if (!res || !selected) return;
    const doc = {
      outil: t.titre,
      version: VERSION,
      langue: lang,
      genere_le: new Date().toISOString(),
      avertissement: t.avertExport,
      zone: { nom: nameOf(selected), niveau: lvlText, surface_km2: +zoneKm2.toFixed(3) },
      parametres: { annee_occupation_du_sol: lcYear, periode_perte: periodeTxt, confiance_feux: conf, fond_de_carte: fond },
      fiabilite: { niveau: res.fiable, libelle: t.fiable[res.fiable], sources_en_echec: statutsManquants, couverture_classification_pct: +res.couverture.toFixed(1) },
      indicateurs: {
        occupation_du_sol_pct: Object.fromEntries(res.land.map((p) => [classeNom(p.k), +p.pct.toFixed(2)])),
        cultures_impact_observatory_pct: +res.cropPct.toFixed(2),
        cultures_worldcover_2021_pct: res.cultWC != null ? +res.cultWC.toFixed(2) : null,
        pente_15pct_ou_plus_pct: res.steepPct != null ? +res.steepPct.toFixed(2) : null,
        altitude_moyenne_m: res.elevMean != null ? Math.round(res.elevMean) : null,
        pluie_moyenne_annuelle_mm: res.rain,
        perte_couvert_ha: lossStats ? Math.round(lossStats.total) : null,
        perte_couvert_par_annee_ha: lossStats ? Object.fromEntries(lossStats.years.map((a) => [a.annee, Math.round(a.ha)])) : null,
        feux_72h: n72, feux_24h: n24,
        vulnerabilite_erosion_sur_100: score,
      },
      orientations: advice.map((a) => ({ priorite: t.prio[a.lvl], theme: t.themes[a.th], titre: a.t, description: a.d, actions: a.acts ?? [] })),
      sources: t.sources.nom.map((nom, i) => ({
        nom,
        source: fill(t.sources.source[i], { rev: REV, n: RAIN_YEARS }),
        limite: t.sources.limite[i],
      })),
    };
    const nom = nameOf(selected).replace(/[^\p{L}\p{N}]+/gu, "_");
    telechargerJSON(`analyse-${nom}-${lcYear}-${lang}.json`, doc);
  };

  return (
    <div className="at">
      <style>{CSS}</style>
      <div className="at-sr" role="status" aria-live="polite">{annonce}</div>

      <header className="at-head">
        <div>
          <h1>{t.titre}</h1>
          <p>{t.sousTitre}</p>
        </div>
        <div className="at-chain">
          <select value={ri} onChange={(e) => onRegion(e.target.value)} aria-label={t.niveaux.region}>
            <option value="">{regs.length ? t.niveaux.region : loadErr ? t.indisponible : t.chargement}</option>
            {regs.map((f, i) => ({ f, i })).sort((a, b) => nameOf(a.f).localeCompare(nameOf(b.f), lang)).map(({ f, i }) => <option key={i} value={i}>{nameOf(f)}</option>)}
          </select>
          <ChevronRight size={16} aria-hidden />
          <select value={di} onChange={(e) => onDistrict(e.target.value)} disabled={!rF} aria-label={t.niveaux.district}>
            <option value="">{rF && !adm2 ? t.chargement : t.niveaux.district}</option>
            {dists.map((f, i) => <option key={i} value={i}>{nameOf(f)}</option>)}
          </select>
          <ChevronRight size={16} aria-hidden />
          <select value={ci} onChange={(e) => onCommune(e.target.value)} disabled={!dF} aria-label={t.niveaux.commune}>
            <option value="">{dF && !adm3 ? t.chargement : t.niveaux.commune}</option>
            {coms.map((f, i) => <option key={i} value={i}>{nameOf(f)}</option>)}
          </select>
          <button type="button" className="at-reset" onClick={reset} disabled={!selected && !drawing} title={t.reinitTitre} aria-label={t.reinit}>
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {loadErr && <div className="at-banner" role="alert">{loadErr}</div>}

      <div className="at-body">
        <aside className="at-panel">
          {!selected ? (
            <div className="at-empty">
              <h2>{t.videTitre}</h2>
              <p>{t.videTexte}</p>
              <p className="at-note">{t.videNote}</p>
            </div>
          ) : (
            <>
              {/* Bandeau de la zone : uniquement en Environnement. En Économie et Social, c'est le bandeau du panneau qui s'affiche. */}
              {env && (
                <div className="at-card at-hero">
                  <h2>{nameOf(selected)}</h2>
                  <div className="at-lvl">{lvlText}</div>

                  <dl className="at-facts">
                    <div><dd>{area[0]}</dd><dt>{area[1]}</dt></div>
                    <div><dd>{res?.elevMean != null ? N(res.elevMean) : res ? t.modal.na : "…"}</dd><dt>{t.altitude}</dt></div>
                    <div><dd>{res?.rain != null ? N(res.rain) : res ? t.modal.na : "…"}</dd><dt>{fill(t.pluieAn, { a: RAIN_FIRST, b: RAIN_LAST })}</dt></div>
                  </dl>
                  {res && <p className="at-note">{t.bassin} : {res.bassin || t.bassinNon}</p>}
                  {res && (
                    <p className={`at-badge ${res.fiable}`}>
                      {t.fiable[res.fiable]}
                      {statutsManquants.length > 0 && <> · {t.manquantes} : {statutsManquants.join(", ")}</>}
                    </p>
                  )}
                  {current.err && (
                    <p className="at-alert" role="alert">
                      {t.analyseKo} : {errMsg(current.err, t)}. <button type="button" className="at-link" onClick={() => setRi((v) => v)}>{t.reessayer}</button>
                    </p>
                  )}
                </div>
              )}

              {onglet === "environnement" ? (
                <>
                  <div className="at-duo">
                    <section className="at-card at-c">
                      <div className="at-ch">
                        <h3>{t.occ.titre}</h3>
                        <select value={lcYear} onChange={(e) => setLcYear(+e.target.value)} aria-label={t.occ.annee} className="at-mini">
                          {LC_YEARS.map((y) => <option key={y}>{y}</option>)}
                        </select>
                      </div>
                      <p className="at-sub">{t.occ.sub}</p>
                      {levels.map(({ f, s }, i) => f && (
                        <div className="at-core" key={i}>
                          <div className="at-corelab"><small>{[t.niveaux.region, t.niveaux.district, t.niveaux.commune, t.niveaux.parcelle][i]}</small><span title={nameOf(f)}>{nameOf(f)}</span></div>
                          {s.res ? (
                            <div className="at-stack" key={nameOf(f) + s.res.areaKm2}>
                              {s.res.land.map((p) => <i key={p.k} style={{ width: `${p.pct}%`, background: p.col }} title={`${classeNom(p.k)} : ${N(p.pct, 1)} %`} />)}
                            </div>
                          ) : <div className="at-stack at-pulse" />}
                        </div>
                      ))}
                      {res ? (
                        <>
                          <table className="at-tbl">
                            <thead><tr><th scope="col">{t.occ.types}</th><th scope="col">{t.occ.part}</th><th scope="col">{t.occ.ha}</th></tr></thead>
                            <tbody>
                              {res.land.map((p) => (
                                <tr key={p.k}>
                                  <td><i style={{ background: p.col }} />{classeNom(p.k)}</td>
                                  <td>{p.pct < 0.1 ? "< 0,1" : N(p.pct, 1)} %</td>
                                  <td>{N((p.pct / 100) * res.areaKm2 * 100, res.areaKm2 < 1 ? 2 : 0)}</td>
                                </tr>
                              ))}
                              {res.cultWC != null && (
                                <tr style={{ color: ORANGE_WC_TXT, fontWeight: 600 }}>
                                  <td><i style={{ background: ORANGE_WC }} />{t.occ.wcRow}</td>
                                  <td>{res.cultWC < 0.1 ? "< 0,1" : N(res.cultWC, 1)} %</td>
                                  <td>{N((res.cultWC / 100) * res.areaKm2 * 100, res.areaKm2 < 1 ? 2 : 0)}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          {res.cloudPct > 0.5 && <p className="at-note">{fill(t.occ.nuages, { p: N(res.cloudPct, 1) })}</p>}
                          <p className="at-note">{fill(t.occ.exploitable, { p: N(res.couverture, 0) })}</p>
                          <p className="at-note">
                            {fill(t.occ.cultIO, { p: N(res.cropPct, 1) })} · {res.cultWC != null
                              ? <span style={{ color: ORANGE_WC_TXT, fontWeight: 600 }}>{fill(t.occ.wcLigne, { p: N(res.cultWC, 1) })}</span>
                              : <>{t.occ.wcIndispo}{res.statuts.cultures ? ` (${errMsg(res.statuts.cultures, t)})` : ""}</>}
                          </p>
                        </>
                      ) : <p className="at-load">{current.busy ? t.chargement : ""}</p>}
                    </section>

                    <section className="at-card at-c at-def">
                      <div className="at-ch">
                        <h3>{t.perte.titre}</h3>
                        <div className="at-yrs">
                          <select className="at-mini" value={dfFrom} aria-label={t.perte.de} onChange={(e) => { const v = +e.target.value; setDfFrom(v); if (v > dfTo) setDfTo(v); }}>{yearOptions}</select>
                          <span>{t.perte.a}</span>
                          <select className="at-mini" value={dfTo} aria-label={t.perte.fin} onChange={(e) => { const v = +e.target.value; setDfTo(v); if (v < dfFrom) setDfFrom(v); }}>{yearOptions}</select>
                        </div>
                      </div>
                      {lossS.busy && <p className="at-load">{t.perte.attente}</p>}
                      {lossS.err && <p className="at-alert" role="alert">{fill(t.perte.indispo, { e: errMsg(lossS.err, t) })}</p>}
                      {lossStats && (
                        <>
                          <div className="at-big at-big-def">{N(Math.round(lossStats.total))}<small>{t.perte.unite}</small></div>
                          <p className="at-sub">{fill(t.perte.desc, { p: periodeTxt, pct: N(lossStats.pct, lossStats.pct < 1 ? 2 : 1) })}</p>
                          <div className="at-cols" role="img" aria-label={t.perte.titre}>
                            {lossStats.years.map((a) => (
                              <div key={a.annee} className="at-colw" title={`${a.annee} : ${N(Math.round(a.ha))} ${t.perte.unite}`}>
                                <i style={{ height: `${Math.max(3, (a.ha / lossStats.max) * 100)}%`, background: a.annee === lossStats.peak.annee ? "#b0285f" : COULEUR_PERTE }} />
                              </div>
                            ))}
                          </div>
                          <div className="at-colsl"><span>{dfFrom}</span><span>{dfTo}</span></div>
                          <dl className="at-mini-facts">
                            <div><dt>{t.perte.pic}</dt><dd>{lossStats.peak.annee} · {N(Math.round(lossStats.peak.ha))} {t.perte.unite}</dd></div>
                            <div><dt>{t.perte.moyenne}</dt><dd>{N(Math.round(lossStats.total / Math.max(1, lossStats.years.length)))} {t.perte.parAn}</dd></div>
                            {lossStats.trend && (
                              <div>
                                <dt>{t.perte.tendance}</dt>
                                <dd>{lossStats.trend === "hausse" ? t.perte.hausse : lossStats.trend === "baisse" ? t.perte.baisse : t.perte.stable}</dd>
                              </div>
                            )}
                          </dl>
                        </>
                      )}
                    </section>

                    <section className="at-card at-c">
                      <h3>{t.relief.titre}</h3>
                      {res && res.slope ? (
                        <>
                          <div className="at-stack at-slope" key={nameOf(selected)}>
                            {res.slope.map((p) => <i key={p.k} style={{ width: `${p.pct}%`, background: p.col }} title={`${t.pentes[p.k]} : ${N(p.pct, 1)} %`} />)}
                          </div>
                          <table className="at-tbl">
                            <tbody>
                              {res.slope.map((p) => <tr key={p.k}><td><i style={{ background: p.col }} />{t.pentes[p.k]}</td><td>{N(p.pct, 1)} %</td></tr>)}
                            </tbody>
                          </table>
                          {res.elevMin != null && res.elevMax != null && (
                            <>
                              <div className="at-strip" aria-hidden>
                                <b className="at-range" style={{ left: `${(Math.max(0, res.elevMin) / 2900) * 100}%`, width: `${Math.max(1.5, ((res.elevMax - Math.max(0, res.elevMin)) / 2900) * 100)}%` }} />
                                <u className="at-dot" style={{ left: `${((res.elevMean ?? 0) / 2900) * 100}%` }} />
                              </div>
                              <div className="at-stripl"><span>0 m</span><span>{N(res.elevMin)} – {N(res.elevMax)} m</span><span>2 900 m</span></div>
                            </>
                          )}
                          <p className="at-note">
                            {res.resolution.small
                              ? t.relief.petit
                              : fill(t.relief.grand, { m: N(res.resolution.pixelM), km: N(res.resolution.stepKm, 1) })}.
                          </p>
                        </>
                      ) : res ? (
                        <p className="at-alert" role="alert">{t.relief.indispo}{res.statuts.relief ? ` (${errMsg(res.statuts.relief, t)})` : ""}. {t.relief.masque}</p>
                      ) : <p className="at-load">{current.busy ? t.chargement : ""}</p>}
                    </section>

                    <section className="at-card at-c at-feu">
                      <div className="at-ch">
                        <h3>{t.feux.titre}</h3>
                        <select className="at-mini" value={conf} onChange={(e) => setConf(e.target.value as "l" | "n" | "h")} aria-label={t.feux.fiabiliteAria}>
                          <option value="l">{t.feux.confToutes}</option><option value="n">{t.feux.confNominale}</option><option value="h">{t.feux.confElevee}</option>
                        </select>
                      </div>
                      {fErr && !feuxBruts.length ? (
                        <p className="at-alert" role="alert">{fill(t.feux.indispo, { e: errMsg(fErr, t) })} <button type="button" className="at-link" onClick={chargerFeux}>{t.feux.reessayer}</button></p>
                      ) : (
                        <>
                          {feuxPerimes && <p className="at-alert" role="alert">{fill(t.feux.perime, { h: heureMaj })} <button type="button" className="at-link" onClick={chargerFeux}>{t.feux.actualiser}</button></p>}
                          {fErr && feuxBruts.length > 0 && <p className="at-note">{t.feux.echecMaj}</p>}
                          <div className="at-feu-top">
                            <div className="at-big at-big-feu">{fLoad && !feuxBruts.length ? "…" : N(feuxAff.length)}</div>
                            <div className="at-seg" role="group" aria-label={t.feux.periodeAria}>
                              {([24, 48, 72] as const).map((h) => <button key={h} type="button" aria-pressed={fPeriod === h} onClick={() => setFPeriod(h)}>{h} h</button>)}
                            </div>
                          </div>
                          <p className="at-sub">{fill(t.feux.sub, { h: fPeriod })}</p>
                          <div className="at-cols" role="img" aria-label={t.feux.binAria}>
                            {[...chrono].map((n, i) => ({ n, i })).reverse().map(({ n, i }) => (
                              <div key={i} className="at-colw" title={fill(t.feux.binTitre, { n: N(n), a: i * 6, b: i * 6 + 6 })}>
                                <i style={{ height: `${Math.max(4, (n / maxChrono) * 100)}%`, background: couleurAge(i * 6 + 3), opacity: i * 6 < fPeriod ? 1 : 0.22 }} />
                              </div>
                            ))}
                          </div>
                          <div className="at-colsl"><span>{t.feux.ilya72}</span><span>{t.feux.maintenant}</span></div>
                          <table className="at-tbl">
                            <tbody>
                              <tr><td><i style={{ background: "rgb(200,15,15)" }} />{t.feux.h24}</td><td>{N(n24)}</td></tr>
                              <tr><td><i style={{ background: "#f97316" }} />{t.feux.h2448}</td><td>{N(n48 - n24)}</td></tr>
                              <tr><td><i style={{ background: "#facc15" }} />{t.feux.h4872}</td><td>{N(n72 - n48)}</td></tr>
                            </tbody>
                          </table>
                          <p className="at-note">{fill(t.feux.maj, { h: heureMaj })}</p>
                        </>
                      )}
                    </section>
                  </div>

                  <button type="button" className="at-go" disabled={!res} onClick={openAnalysis}>{t.voirOrient}</button>
                </>
              ) : (
                /* Onglets Économie et Social : seules ces cartes changent, la carte et les filtres restent identiques */
                <PanneauIndicateurs
                  theme={onglet}
                  lang={lang}
                  zone={{
                    niveau: cF ? "ADM3" : dF ? "ADM2" : rF ? "ADM1" : null,
                    nom: nameOf(selected),
                    region: rF ? nameOf(rF) : null,
                    district: dF ? nameOf(dF) : null,
                    commune: cF ? nameOf(cF) : null,
                    geometry: selected.geometry
                  }}
                />
              )}
            </>
          )}
        </aside>

        <section className="at-mcard" aria-label={t.carte.carteAria}>
          <div className="at-mhead">
            <div className="at-mtools">
              <div className="at-seg" role="group" aria-label={t.carte.fondAria}>
                <button type="button" aria-pressed={fondAff === "sat"} disabled={!env} onClick={() => setFond("sat")}>{t.carte.satellite}</button>
                <button type="button" aria-pressed={fondAff === "topo"} disabled={!env} onClick={() => setFond("topo")}>{t.carte.topo}</button>
                <button type="button" aria-pressed={fondAff === "osm"} disabled={!env} onClick={() => setFond("osm")}>OpenStreetMap</button>
              </div>
              {env && (
                <>
                  <label className="at-chk"><input type="checkbox" checked={occAff} onChange={(e) => setShowLC(e.target.checked)} />{t.carte.occ}</label>
                  <label className="at-chk"><input type="checkbox" checked={lossAff} onChange={(e) => setShowLoss(e.target.checked)} />{t.carte.perte}</label>
                  <label className="at-chk"><input type="checkbox" checked={firesAff} onChange={(e) => setShowFires(e.target.checked)} />{t.carte.feux}</label>
                </>
              )}
              <label className="at-chk"><input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} />{t.carte.estomper}</label>
            </div>
            {env && (
              <div className="at-mtools">
                {!drawing ? (
                  <button type="button" className="at-tool" onClick={startDraw}><PenTool size={15} />{t.carte.tracer}</button>
                ) : (
                  <>
                    <button type="button" className="at-tool on" onClick={finishDraw} disabled={nPts < 3}><Check size={15} />{t.carte.terminer}</button>
                    <button type="button" className="at-tool" onClick={cancelDraw}><X size={15} />{t.carte.annuler}</button>
                  </>
                )}
                {parcel && <button type="button" className="at-tool" onClick={() => setParcel(null)}><Trash2 size={15} />{t.carte.effacer}</button>}
              </div>
            )}
          </div>
          <div className="at-mbox">
            <div ref={elMap} className="at-map" />
            <div className="at-ctl at-hint">{hint}</div>
            {(occAff || lossAff || firesAff) && (
              <div className="at-ctl at-legend">
                {occAff && <><strong>{fill(t.legende.lc, { y: lcYear })}</strong>{legendLC.map((k) => <span key={k.k}><i style={{ background: k.col }} />{classeNom(k.k)}</span>)}</>}
                {lossAff && <><strong>{t.legende.perte}</strong><span><i style={{ background: COULEUR_PERTE }} />{periodeTxt}</span></>}
                {firesAff && <><strong>{t.legende.feux}</strong>
                  <span><i className="r" style={{ background: "rgb(200,15,15)" }} />{t.legende.m24}</span>
                  <span><i className="r" style={{ background: "#f97316" }} />{t.legende.m2448}</span>
                  <span><i className="r" style={{ background: "#facc15" }} />{t.legende.m4872}</span></>}
              </div>
            )}
          </div>
        </section>
      </div>

      {show && onglet === "environnement" && res && selected && (
        <div className="at-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <div className="at-modal" role="dialog" aria-modal="true" aria-labelledby="at-m-titre" ref={modalRef}>
            <header className="at-mh">
              <div>
                <h2 id="at-m-titre">{fill(t.modal.titre, { nom: nameOf(selected) })}</h2>
                <p>
                  {lvlText} · {fmtArea(zoneKm2)} · {fill(t.modal.nb, { n: advice.length })}
                  {nHautes ? fill(t.modal.prio, { n: nHautes }) : ""} · {t.fiableBas[res.fiable]}
                </p>
              </div>
              <button type="button" className="at-x" ref={closeRef} onClick={() => setShow(false)} aria-label={t.modal.fermerAria}><X size={18} /></button>
            </header>

            <div className="at-mb">
              <div className="at-kpis">
                <div className="at-kpi"><b>{N(res.treePct, 1)} %</b><span>{t.modal.kTree}</span></div>
                <div className="at-kpi">
                  <b>{res.cultWC == null ? `${N(res.cropPct, 1)} %` : `${N(Math.max(res.cropPct, res.cultWC), 1)} %`}</b>
                  <span>{res.cultWC == null ? t.modal.kCropIndispo : t.modal.kCrop}</span>
                </div>
                <div className="at-kpi"><b>{res.steepPct != null ? `${N(res.steepPct, 1)} %` : t.modal.na}</b><span>{t.modal.kSteep}</span></div>
                <div className="at-kpi"><b>{lossStats ? `${N(Math.round(lossStats.total))} ${t.perte.unite}` : t.modal.na}</b><span>{fill(t.modal.kLoss, { p: periodeTxt })}</span></div>
                <div className="at-kpi"><b>{N(n72)}</b><span>{t.modal.kFires}</span></div>
                <div className="at-kpi"><b>{res.rain != null ? `${N(res.rain)} mm` : t.modal.na}</b><span>{fill(t.modal.kRain, { a: RAIN_FIRST, b: RAIN_LAST })}</span></div>
              </div>

              {score != null ? (
                <div className="at-gauge-wrap">
                  <div className="at-gauge"><u style={{ left: `${score}%` }} /></div>
                  <p>{fill(t.modal.vuln, { label: t.vulnNiv[score < 25 ? "faible" : score < 50 ? "moderee" : score < 70 ? "elevee" : "tres"], s: score })}</p>
                </div>
              ) : (
                <p className="at-alert" role="alert">{t.modal.vulnNA}</p>
              )}

              {res.fiable !== "bonne" && (
                <p className="at-alert" role="alert">
                  {fill(t.modal.partiel, { s: statutsManquants.length ? ` (${statutsManquants.join(", ")})` : "" })}
                </p>
              )}

              {themesPresents.length > 1 && (
                <div className="at-chips" role="group" aria-label={t.modal.filtre}>
                  <button type="button" aria-pressed={themeF === "Toutes"} onClick={() => setThemeF("Toutes")}>{fill(t.modal.tous, { n: advice.length })}</button>
                  {themesPresents.map(({ th, n }) => (
                    <button key={th} type="button" aria-pressed={themeF === th} onClick={() => setThemeF(th)}>{t.themes[th]} ({n})</button>
                  ))}
                </div>
              )}

              {adviceShown.map((a) => (
                <article key={a.t} className={`at-reco ${a.lvl}`}>
                  <div className="at-rtags">
                    <span className="at-tag">{t.themes[a.th]}</span>
                    <span className={`at-lv ${a.lvl}`}>{t.prio[a.lvl]}</span>
                  </div>
                  <h4>{a.t}</h4>
                  <p>{a.d}</p>
                  {a.acts && a.acts.length > 0 && <ul className="at-acts">{a.acts.map((s) => <li key={s}>{s}</li>)}</ul>}
                </article>
              ))}

              <details className="at-meth">
                <summary>{t.modal.methode}</summary>
                <table className="at-tbl">
                  <thead><tr><th scope="col">{t.modal.colDonnee}</th><th scope="col">{t.modal.colSource}</th><th scope="col">{t.modal.colLimite}</th></tr></thead>
                  <tbody>
                    {t.sources.nom.map((nom, i) => (
                      <tr key={nom}>
                        <td>{nom}</td>
                        <td>{fill(t.sources.source[i], { rev: REV, n: RAIN_YEARS })}</td>
                        <td>{t.sources.limite[i]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="at-note">{t.modal.regles}</p>
              </details>

              <p className="at-note">{t.modal.estim}</p>
            </div>

            <footer className="at-mf">
              <button type="button" className="at-tool" onClick={exporter}><Download size={15} />{t.modal.exporter}</button>
              <button type="button" className="at-tool on" onClick={() => setShow(false)}>{t.modal.fermer}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

/** Limite d'erreur : une panne interne n'efface pas toute la page. */
class Garde extends Component<{ children: ReactNode; t: Dict }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="at-alert" role="alert" style={{ margin: 20 }}>
          {this.props.t.garde} ({this.state.err.message})
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Langue lue dans le contexte, comme Home.tsx. Repli sur le français si la valeur est inconnue.
 * L'onglet (Environnement / Économie / Social) est lu dans l'URL : la carte n'est jamais rechargée.
 */
export default function AnalyseTerritoriale() {
  const { lang: rawLang } = useLanguage();
  const { pathname } = useLocation();
  const lang: Lang = (LANGS as string[]).includes(rawLang as string) ? (rawLang as Lang) : "fr";
  const t = TEXTS[lang];
  const onglet: Onglet = /\/economie\/?$/.test(pathname) ? "economie" : /\/social\/?$/.test(pathname) ? "social" : "environnement";
  return (
    <Garde t={t}>
      <Coeur lang={lang} t={t} onglet={onglet} />
    </Garde>
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
.at-mf{padding:12px 20px;border-top:1px solid var(--c-line);display:flex;justify-content:flex-end;gap:8px}
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
.at-seg{display:flex;gap:2px;border:1px solid var(--c-line);border-radius:9px;padding:2px;flex-wrap:wrap}
.at-seg button{padding:4px 9px;border:0;border-radius:7px;background:transparent;color:var(--c-ink2);font:inherit;font-size:12.5px;cursor:pointer}
.at-seg button[aria-pressed=true]{background:var(--c-acc);color:#fff}
.at-seg button:disabled{opacity:.45;cursor:default}
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
.at-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.at-badge{display:inline-block;margin:8px 0 0;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600}
.at-badge.bonne{background:rgba(127,176,105,.22);color:#3f6b2c}
.at-badge.moyenne{background:rgba(224,162,60,.2);color:#8a5a0c}
.at-badge.faible{background:rgba(178,58,46,.14);color:#9a2b20}
.at-meth{margin-top:16px;border-top:1px solid var(--c-line);padding-top:12px}
.at-meth summary{cursor:pointer;font-weight:600;font-size:14px;color:var(--c-ink2)}
.at-meth table{margin-top:10px}
.at-meth td,.at-meth th{vertical-align:top;text-align:left}
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
