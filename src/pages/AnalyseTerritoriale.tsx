/**
 * AnalyseTerritoriale.tsx — Madagascar : Région → District → Commune → Parcelle tracée
 *
 * Dépendances : leaflet, @types/leaflet, lucide-react. Aucun Tailwind requis.
 *
 * Données (toutes en ligne, appelées depuis le navigateur, sans clé API côté page) :
 *  - Limites administratives : geoBoundaries (régions, districts, communes), plusieurs miroirs essayés en parallèle
 *  - Occupation du sol : Esri / Impact Observatory Sentinel-2 10 m (2017-2024)
 *  - Perte de couvert arboré : tuiles Global Forest Watch (UMD/Hansen), sans clé
 *  - Altitude : Open-Meteo Elevation (Copernicus DEM 90 m) → pente
 *  - Pluie annuelle : Open-Meteo Archive
 *  - Bassins versants : BASSINS_GEOJSON_URL (à fournir, ex. HydroBASINS)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronRight, RotateCcw, PenTool, Check, X, Trash2 } from "lucide-react";

/* ===================== CONFIGURATION ===================== */

type Level = "ADM1" | "ADM2" | "ADM3";

const NOM_CLES = ["shapename", "nom_region", "region", "nom_district", "district", "nom_commune", "commune",
  "adm3_fr", "adm2_fr", "adm1_fr", "name_3", "name_2", "name_1", "nom", "name", "libelle"];

const BASSINS_GEOJSON_URL = ""; // ex. "/data/bassins_versants.geojson"
const LC_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LOSS_FIRST = 2001, LOSS_LAST = 2024; // période disponible pour la perte de couvert arboré
const FONDS = {
  sat: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
};
const MADA: L.LatLngBoundsExpression = [[-25.9, 43.0], [-11.8, 50.7]];
const LAURITE = "#ff7a3d", CYAN = "#22d3ee";

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

// Légende Esri Sentinel-2 10 m. Les nuages (dernier) sont exclus des pourcentages.
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
/** vrai si l'entité `c` est contenue dans `p` (centre + 5 points échantillonnés, vote à la majorité) */
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
const nameOf = (f: Feat) => {
  const p = f.properties || {};
  const keys = Object.keys(p);
  for (const k of NOM_CLES) {
    const real = keys.find((x) => x.toLowerCase() === k);
    if (real && typeof p[real] === "string" && p[real].trim()) return p[real].trim() as string;
  }
  const v = Object.values(p).find((x) => typeof x === "string" && (x as string).trim());
  return (v as string) || "Sans nom";
};
const nf = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const fmtArea = (km2: number) => (km2 < 10 ? `${nf(km2 * 100, km2 < 0.1 ? 2 : 1)} ha` : `${nf(km2)} km²`);

/** Veille un polygone « monde moins la zone » pour estomper l'extérieur de la zone choisie. */
const veil = (f: Feat) => {
  const monde: L.LatLngTuple[] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
  const trous = polys(f).map((p) => p[0].map(([x, y]) => [y, x] as L.LatLngTuple));
  return L.polygon([monde, ...trous], { stroke: false, fillColor: "#f1f4f7", fillOpacity: 0.78, interactive: false });
};

const CACHE: Partial<Record<Level, Feat[]>> = {};
/** Les miroirs sont interrogés en parallèle : le premier GeoJSON valide gagne. */
function loadLevel(l: Level): Promise<Feat[]> {
  if (CACHE[l]) return Promise.resolve(CACHE[l]!);
  const tries = sources(l).map((u) =>
    fetch(u).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then((j) => {
      const feats: Feat[] = (j?.features ?? []).filter((f: Feat) => f?.geometry && /Polygon/.test(f.geometry.type));
      if (!feats.length) throw new Error("vide");
      return feats;
    }));
  return new Promise((ok, ko) => {
    let left = tries.length;
    tries.forEach((p) => p.then((v) => { CACHE[l] = v; ok(v); }).catch(() => { if (--left === 0) ko(new Error(`Limites ${l} indisponibles en ligne. Vérifiez votre connexion et réessayez.`)); }));
  });
}

/* ===================== ANALYSE ===================== */

type Part = { n: string; pct: number; col: string };
type Result = {
  land: Part[]; slope: Part[]; cloudPct: number;
  elevMin: number; elevMax: number; elevMean: number;
  rain: number | null; areaKm2: number;
  cropSteep: number; treePct: number; cropPct: number; barePct: number; steepPct: number; wetPct: number;
  bassin: string | null; resolution: string;
};

async function analyse(f: Feat, signal: AbortSignal, year: number): Promise<Result> {
  const b = bbox(f);
  const midLat = (b.minLat + b.maxLat) / 2;
  const wKm = Math.max(0.01, (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180));
  const hKm = Math.max(0.01, (b.maxLat - b.minLat) * 110.54);
  const Lpx = Math.max(40, Math.min(700, Math.ceil(Math.max(wKm, hKm) * 100))); // 100 px/km = 10 m, résolution native
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

  // Grille d'altitude 10×10, élargie à ~1,3 km minimum pour les très petites zones (parcelles)
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

  let rain: number | null = null;
  try {
    const [cLon, cLat] = center(f);
    const r = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${cLat}&longitude=${cLon}&start_date=2023-01-01&end_date=2023-12-31&daily=precipitation_sum&timezone=auto`, { signal })).json();
    rain = Math.round(r.daily.precipitation_sum.reduce((s: number, v: number) => s + (v || 0), 0));
  } catch { /* facultatif */ }

  let bassin: string | null = null;
  if (BASSINS_GEOJSON_URL) {
    try {
      const g = await (await fetch(BASSINS_GEOJSON_URL, { signal })).json();
      const [cLon, cLat] = center(f);
      const hit = g.features.find((x: Feat) => inFeat(cLon, cLat, x));
      bassin = hit ? nameOf(hit) : "Hors bassin référencé";
    } catch { bassin = null; }
  }

  const pct = (c: number) => (cnt[c] / tot) * 100;
  return {
    // toutes les classes présentes dans la zone, de la plus grande à la plus petite
    land: CLASSES.slice(0, N_VALID).map((k, i) => ({ n: k.n, pct: pct(i), col: rgb(k.c) })).filter((x) => x.pct > 0).sort((a, c) => c.pct - a.pct),
    cloudPct: (cnt[8] / (tot + cnt[8])) * 100,
    slope: SLOPES.map((s, i) => ({ n: s.n, pct: sn ? (sc[i] / sn) * 100 : 0, col: s.col })),
    elevMin: Math.min(...zs), elevMax: Math.max(...zs), elevMean: zs.reduce((a, c) => a + c, 0) / zs.length,
    rain, areaKm2: areaKm2(f),
    cropSteep: cropN ? (cropSteep / cropN) * 100 : 0,
    treePct: pct(0), cropPct: pct(2), barePct: pct(4), steepPct: sn ? ((sc[2] + sc[3]) / sn) * 100 : 0, wetPct: pct(6),
    bassin,
    resolution: small
      ? "10 m pour l'occupation du sol ; relief à 90 m autour de la parcelle (indicatif)"
      : `${nf((wKm * 1000) / W)} m par pixel pour l'occupation, ${nf(Math.max(dx, dy) / 1000, 1)} km entre points d'altitude`,
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

/* ===================== DÉCISION ===================== */

const vuln = (r: Result) => {
  const c = (v: number, m: number) => Math.min(v, m) / m;
  return Math.round(35 * c(r.steepPct, 60) + 25 * c(r.cropSteep, 60) + 15 * c(r.barePct, 25) + 15 * (1 - c(r.treePct, 50)) + 10 * c(r.rain ?? 0, 2500));
};
const vulnLabel = (v: number) => (v < 25 ? "faible" : v < 50 ? "modérée" : v < 70 ? "élevée" : "très élevée");

function orientations(r: Result) {
  const o: { t: string; d: string; lvl: "haute" | "moyenne" | "info" }[] = [];
  if (r.cropSteep > 30 && (r.rain ?? 0) > 1000)
    o.push({ lvl: "haute", t: "Lutte antiérosive sur les cultures de pente", d: `${nf(r.cropSteep)} % des cultures échantillonnées sont sur pente de 15 % ou plus, avec ${nf(r.rain!)} mm de pluie par an : risque élevé de ravinement et de lavaka. Agroforesterie, cordons de pierres, bandes enherbées et terrasses en priorité.` });
  else if (r.cropSteep > 30)
    o.push({ lvl: "moyenne", t: "Cultures sur pente à sécuriser", d: `${nf(r.cropSteep)} % des cultures sont sur pente de 15 % ou plus. Prévoir des pratiques de conservation des sols.` });
  if (r.steepPct > 35 && r.treePct < 25)
    o.push({ lvl: "haute", t: "Restauration forestière des versants", d: `Pentes de 15 % ou plus sur ${nf(r.steepPct)} % du territoire pour seulement ${nf(r.treePct)} % de couvert arboré. Reboiser avec des espèces locales, en commençant par les têtes de bassin.` });
  if (r.barePct > 10)
    o.push({ lvl: "haute", t: "Réhabilitation des sols nus", d: `${nf(r.barePct)} % de sol nu : stabiliser par végétalisation (graminées, légumineuses), puis planter.` });
  if (r.treePct >= 40)
    o.push({ lvl: "info", t: "Conservation du couvert existant", d: `${nf(r.treePct)} % de couvert arboré : protéger en priorité (gestion communautaire, lutte contre les feux et le défrichement).` });
  if (r.wetPct > 3)
    o.push({ lvl: "moyenne", t: "Protection des zones humides et mangroves", d: `${nf(r.wetPct, 1)} % de végétation inondée ou de mangrove : zones tampons, pas de drainage ni de coupe.` });
  if (r.cropPct > 40 && r.steepPct < 15)
    o.push({ lvl: "info", t: "Intensification durable en terrain plat", d: "Terrain peu pentu et très cultivé : conditions favorables pour intensifier (rotations, fertilisation organique) et alléger la pression sur les forêts." });
  if (!o.length)
    o.push({ lvl: "info", t: "Aucun signal prioritaire", d: "Les indicateurs calculés ne montrent pas de pression marquée. Affinez par un diagnostic de terrain." });
  o.push({ lvl: "info", t: "Lire aussi la carte de déforestation", d: "Les zones roses de la carte de droite montrent où le couvert arboré a déjà disparu : ce sont les premiers candidats à la restauration, surtout s'ils sont sur pente." });
  return o;
}

/* ===================== COMPOSANT ===================== */

const ROWS = ["Région", "District", "Commune", "Parcelle"];

export default function AnalyseTerritoriale() {
  const elA = useRef<HTMLDivElement>(null), elB = useRef<HTMLDivElement>(null);
  const mapA = useRef<L.Map | null>(null), mapB = useRef<L.Map | null>(null);
  const baseA = useRef<L.TileLayer | null>(null), baseB = useRef<L.TileLayer | null>(null);
  const ov = useRef<L.ImageOverlay | null>(null), loss = useRef<L.TileLayer | null>(null);
  const kids = useRef<L.GeoJSON | null>(null), outA = useRef<L.GeoJSON | null>(null), outB = useRef<L.GeoJSON | null>(null);
  const veilB = useRef<L.Polygon | null>(null), draft = useRef<L.FeatureGroup | null>(null);
  const pts = useRef<L.LatLng[]>([]);
  const pickRef = useRef<(l: Level, i: number) => void>(() => {});

  const [regs, setRegs] = useState<Feat[]>([]);
  const [adm2, setAdm2] = useState<Feat[] | null>(null);
  const [adm3, setAdm3] = useState<Feat[] | null>(null);
  const [ri, setRi] = useState(""), [di, setDi] = useState(""), [ci, setCi] = useState("");
  const [parcel, setParcel] = useState<Feat | null>(null);
  const [drawing, setDrawing] = useState(false), [nPts, setNPts] = useState(0);
  const [fond, setFond] = useState<"sat" | "topo">("sat");
  const [wcOn, setWcOn] = useState(true), [lcYear, setLcYear] = useState(2023);
  const [dfFrom, setDfFrom] = useState(2015), [dfTo, setDfTo] = useState(LOSS_LAST);
  const [mask, setMask] = useState(true), [sync, setSync] = useState(true);
  const [show, setShow] = useState(false);
  const [loadErr, setLoadErr] = useState("");

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

  const list = !rF ? regs : !dF ? dists : coms;
  const kidLevel: Level = !rF ? "ADM1" : !dF ? "ADM2" : "ADM3";

  /* ----- tracé de parcelle ----- */
  const redraw = () => {
    const g = draft.current; if (!g) return;
    g.clearLayers();
    const p = pts.current;
    if (p.length >= 3) L.polygon(p, { color: CYAN, weight: 2.5, dashArray: "6 4", fillColor: CYAN, fillOpacity: 0.15, interactive: false }).addTo(g);
    else if (p.length > 1) L.polyline(p, { color: CYAN, weight: 2.5, dashArray: "6 4", interactive: false }).addTo(g);
    p.forEach((q) => L.circleMarker(q, { radius: 5, color: "#fff", weight: 2, fillColor: CYAN, fillOpacity: 1, interactive: false }).addTo(g));
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

  /* ----- chargement des limites en ligne ----- */
  useEffect(() => { loadLevel("ADM1").then(setRegs).catch((e) => setLoadErr(e.message)); }, []);
  useEffect(() => { if (rF && !adm2) loadLevel("ADM2").then(setAdm2).catch((e) => setLoadErr(e.message)); }, [rF, adm2]);
  useEffect(() => { if (dF && !adm3) loadLevel("ADM3").then(setAdm3).catch((e) => setLoadErr(e.message)); }, [dF, adm3]);
  useEffect(() => { setShow(false); }, [selected]);

  /* ----- création des deux cartes ----- */
  useEffect(() => {
    const mk = (el: HTMLDivElement) => {
      const m = L.map(el, { zoomControl: false, zoomSnap: 0.25 }).fitBounds(MADA);
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
      return m;
    };
    const a = mk(elA.current!), b = mk(elB.current!);
    b.createPane("perte").style.zIndex = "250";
    draft.current = L.featureGroup().addTo(a);
    mapA.current = a; mapB.current = b;
    const ro = new ResizeObserver(() => { a.invalidateSize(); b.invalidateSize(); });
    ro.observe(elA.current!); ro.observe(elB.current!);
    return () => { ro.disconnect(); a.remove(); b.remove(); };
  }, []);

  /* synchronisation des deux vues */
  useEffect(() => {
    const a = mapA.current!, b = mapB.current!;
    if (!sync) return;
    let lock = false;
    const link = (s: L.Map, d: L.Map) => () => { if (lock) return; lock = true; d.setView(s.getCenter(), s.getZoom(), { animate: false }); lock = false; };
    const fa = link(a, b), fb = link(b, a);
    a.on("move", fa); b.on("move", fb);
    fa();
    return () => { a.off("move", fa); b.off("move", fb); };
  }, [sync]);

  /* fonds de carte */
  useEffect(() => {
    baseA.current?.remove(); baseB.current?.remove();
    baseA.current = L.tileLayer(FONDS[fond], { maxZoom: 18, attribution: "Esri, Maxar, Earthstar Geographics" }).addTo(mapA.current!);
    baseB.current = L.tileLayer(FONDS[fond], { maxZoom: 18, attribution: "Esri, Maxar, Earthstar Geographics" }).addTo(mapB.current!);
    baseA.current.bringToBack(); baseB.current.bringToBack();
  }, [fond]);

  /* carte A : entités cliquables du niveau suivant */
  useEffect(() => {
    kids.current?.remove();
    if (!list.length) return;
    const idx = new Map<Feat, number>(list.map((f, i) => [f, i]));
    kids.current = L.geoJSON(list as any, {
      interactive: !drawing,
      style: () => ({ color: "#ffffff", weight: 1.2, fillColor: "#ffffff", fillOpacity: 0.06 }),
      onEachFeature: (f, layer) => {
        const p = layer as L.Path;
        p.bindTooltip(nameOf(f as any), { sticky: true, className: "at-tip" });
        p.on("mouseover", () => p.setStyle({ fillOpacity: 0.3, weight: 2.2 }));
        p.on("mouseout", () => p.setStyle({ fillOpacity: 0.06, weight: 1.2 }));
        p.on("click", () => pickRef.current(kidLevel, idx.get(f as any)!));
      },
    }).addTo(mapA.current!);
    outA.current?.bringToFront();
  }, [list, kidLevel, drawing]);

  /* carte A : contour de la sélection et zoom */
  useEffect(() => {
    outA.current?.remove();
    if (!selected) { mapA.current?.flyToBounds(MADA, { duration: 1 }); return; }
    outA.current = L.geoJSON(selected as any, { interactive: false, style: { color: hi, weight: 3.5, fill: false } }).addTo(mapA.current!);
    mapA.current!.flyToBounds(outA.current.getBounds(), { padding: [40, 40], maxZoom: parcel ? 17 : undefined, duration: 1.2 });
  }, [selected]);

  /* carte A : image d'occupation du sol */
  useEffect(() => {
    ov.current?.remove();
    if (!wcOn || !mapA.current) return;
    const b = selected ? bbox(selected) : { minLon: 43.2, minLat: -25.7, maxLon: 50.6, maxLat: -11.9 };
    const midLat = (b.minLat + b.maxLat) / 2;
    const wKm = (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180), hKm = (b.maxLat - b.minLat) * 110.54;
    const Lpx = Math.max(64, Math.min(1400, Math.ceil(Math.max(wKm, hKm) * 100)));
    const W = wKm >= hKm ? Lpx : Math.max(32, Math.round((Lpx * wKm) / hKm)), H = wKm >= hKm ? Math.max(32, Math.round((Lpx * hKm) / wKm)) : Lpx;
    ov.current = L.imageOverlay(esriUrl(b, W, H, lcYear), [[b.minLat, b.minLon], [b.maxLat, b.maxLon]], { opacity: 0.62, interactive: false }).addTo(mapA.current);
    outA.current?.bringToFront();
  }, [wcOn, selected, lcYear]);

  /* carte A : tracé de parcelle (clics) */
  useEffect(() => {
    const m = mapA.current!;
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

  /* carte B : perte de couvert arboré (Global Forest Watch) */
  useEffect(() => {
    loss.current?.remove();
    loss.current = L.tileLayer(lossUrl(dfFrom, dfTo), { pane: "perte", maxNativeZoom: 12, opacity: 0.95, attribution: "Perte de couvert © UMD/Hansen, GFW" }).addTo(mapB.current!);
  }, [dfFrom, dfTo]);

  /* carte B : contour, voile hors zone, zoom si non synchronisée */
  useEffect(() => {
    const m = mapB.current!;
    veilB.current?.remove(); outB.current?.remove();
    if (!selected) { if (!sync) m.flyToBounds(MADA, { duration: 1 }); return; }
    if (mask) veilB.current = veil(selected).addTo(m);
    outB.current = L.geoJSON(selected as any, { interactive: false, style: { color: hi, weight: 3, fill: false } }).addTo(m);
    if (!sync) m.flyToBounds(outB.current.getBounds(), { padding: [40, 40], maxZoom: parcel ? 17 : undefined, duration: 1.2 });
  }, [selected, mask]);

  const levels = [{ f: rF, s: rRes }, { f: dF, s: dRes }, { f: cF, s: cRes }, { f: parcel, s: pRes }];
  const res = current.res;
  const advice = useMemo(() => (res ? orientations(res) : []), [res]);
  const score = res ? vuln(res) : 0;
  const hint = drawing
    ? `Cliquez pour poser les sommets (${nPts}). Double-clic ou « Terminer » pour fermer, Échap pour annuler.`
    : !rF ? "Cliquez sur une région pour zoomer" : !dF ? "Cliquez sur un district" : !cF ? "Cliquez sur une commune" : "Cliquez sur une autre commune pour comparer";
  const legend = res ? res.land : CLASSES.slice(0, N_VALID).map((k) => ({ n: k.n, pct: 0, col: rgb(k.c) }));
  const lvlText = parcel
    ? `Parcelle tracée${admin ? ` dans ${nameOf(admin)}` : ""}`
    : cF ? `Commune de ${nameOf(dF!)}, ${nameOf(rF!)}` : dF ? `District de ${nameOf(rF!)}` : "Région";

  return (
    <div className="at">
      <style>{CSS}</style>

      <header className="at-head">
        <div>
          <h1>Analyse territoriale</h1>
          <p>Occupation du sol, relief, déforestation et orientations pour restaurer</p>
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
          {!selected && (
            <div className="at-empty">
              <h2>Commencez par une région</h2>
              <p>Choisissez-la dans la liste ou cliquez sur la carte. L’occupation du sol et le relief se précisent jusqu’à la commune. Vous pouvez aussi tracer votre propre parcelle sur la carte.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="at-card at-hero">
                <h2>{nameOf(selected)}</h2>
                <div className="at-lvl">{lvlText}</div>
                {res ? (
                  <dl className="at-facts">
                    <div><dd>{fmtArea(res.areaKm2).split(" ")[0]}</dd><dt>{fmtArea(res.areaKm2).split(" ")[1]}</dt></div>
                    <div><dd>{nf(res.elevMean)}</dd><dt>m d’altitude moyenne</dt></div>
                    <div><dd>{res.rain ? nf(res.rain) : "n/d"}</dd><dt>mm de pluie en 2023</dt></div>
                  </dl>
                ) : <div className="at-load">{current.busy ? "Calcul en cours…" : ""}</div>}
                {res && <p className="at-note">Bassin versant : {res.bassin ?? "source non renseignée"}</p>}
                {current.err && <p className="at-alert" role="alert">{current.err}</p>}
              </div>

              <div className="at-card">
                <h3>Occupation du sol en {lcYear}</h3>
                <p className="at-sub">Chaque ligne est un niveau choisi : on voit la composition se préciser.</p>
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
                {res && (
                  <>
                    <table className="at-tbl">
                      <thead><tr><th scope="col">Type présent dans la zone</th><th scope="col">Part</th><th scope="col">Hectares</th></tr></thead>
                      <tbody>
                        {res.land.map((p) => (
                          <tr key={p.n}>
                            <td><i style={{ background: p.col }} />{p.n}</td>
                            <td>{p.pct < 0.1 ? "< 0,1" : nf(p.pct, 1)} %</td>
                            <td>{nf((p.pct / 100) * res.areaKm2 * 100, res.areaKm2 < 1 ? 2 : 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {res.cloudPct > 0.5 && <p className="at-note">{nf(res.cloudPct, 1)} % de la zone est sous les nuages sur l’image : ces pixels sont exclus des parts.</p>}
                  </>
                )}
              </div>

              {res && (
                <div className="at-card">
                  <h3>Relief et pente</h3>
                  <div className="at-stack at-slope" key={nameOf(selected)}>
                    {res.slope.map((p) => <i key={p.n} style={{ width: `${p.pct}%`, background: p.col }} title={`${p.n} : ${nf(p.pct, 1)} %`} />)}
                  </div>
                  <table className="at-tbl">
                    <tbody>
                      {res.slope.map((p) => (
                        <tr key={p.n}><td><i style={{ background: p.col }} />{p.n}</td><td>{nf(p.pct, 1)} %</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="at-strip" aria-hidden>
                    <b className="at-range" style={{ left: `${(Math.max(0, res.elevMin) / 2900) * 100}%`, width: `${Math.max(1.5, ((res.elevMax - Math.max(0, res.elevMin)) / 2900) * 100)}%` }} />
                    <u className="at-dot" style={{ left: `${(res.elevMean / 2900) * 100}%` }} />
                  </div>
                  <div className="at-stripl"><span>0 m</span><span>{nf(res.elevMin)} à {nf(res.elevMax)} m ici</span><span>2 900 m</span></div>
                  <p className="at-note">{res.resolution}.</p>
                </div>
              )}

              <button type="button" className="at-go" disabled={!res} onClick={() => setShow(true)}>
                Analyser ce territoire
              </button>

              {show && res && (
                <div className="at-card" aria-live="polite">
                  <h3>Orientations pour {nameOf(selected)}</h3>
                  <div className="at-gauge-wrap">
                    <div className="at-gauge"><u style={{ left: `${score}%` }} /></div>
                    <p>Vulnérabilité à l’érosion : <strong>{vulnLabel(score)}</strong> ({score} sur 100)</p>
                  </div>
                  {advice.map((a) => (
                    <article key={a.t} className={`at-reco ${a.lvl}`}>
                      <h4>{a.t}{a.lvl !== "info" && <span> priorité {a.lvl}</span>}</h4>
                      <p>{a.d}</p>
                    </article>
                  ))}
                  <p className="at-note">Estimation indicative issue d’images satellite et d’un relief à 90 m échantillonné. À valider avec des données locales et les acteurs du territoire avant toute décision.</p>
                </div>
              )}
            </>
          )}
        </aside>

        <div className="at-maps">
          {/* ---------- Carte A : occupation du sol ---------- */}
          <section className="at-mcard" aria-label="Carte d'occupation du sol">
            <div className="at-mhead">
              <h3>Occupation du sol</h3>
              <div className="at-mtools">
                <div className="at-seg" role="group" aria-label="Fond de carte">
                  <button type="button" aria-pressed={fond === "sat"} onClick={() => setFond("sat")}>Satellite</button>
                  <button type="button" aria-pressed={fond === "topo"} onClick={() => setFond("topo")}>Topographie</button>
                </div>
                <label className="at-chk"><input type="checkbox" checked={wcOn} onChange={(e) => setWcOn(e.target.checked)} />Couche</label>
                <select value={lcYear} onChange={(e) => setLcYear(+e.target.value)} aria-label="Année de l'occupation du sol" className="at-mini">
                  {LC_YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
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
              <div ref={elA} className="at-map" />
              <div className="at-ctl at-hint">{hint}</div>
              {wcOn && (
                <div className="at-ctl at-legend">
                  {legend.map((k) => <span key={k.n}><i style={{ background: k.col }} />{k.n}</span>)}
                </div>
              )}
            </div>
          </section>

          {/* ---------- Carte B : déforestation ---------- */}
          <section className="at-mcard" aria-label="Carte de déforestation">
            <div className="at-mhead">
              <h3>Déforestation</h3>
              <div className="at-mtools">
                <label className="at-chk">De
                  <select className="at-mini" value={dfFrom} aria-label="Année de début"
                    onChange={(e) => { const v = +e.target.value; setDfFrom(v); if (v > dfTo) setDfTo(v); }}>
                    {Array.from({ length: LOSS_LAST - LOSS_FIRST + 1 }, (_, i) => LOSS_FIRST + i).map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
                <label className="at-chk">à
                  <select className="at-mini" value={dfTo} aria-label="Année de fin"
                    onChange={(e) => { const v = +e.target.value; setDfTo(v); if (v < dfFrom) setDfFrom(v); }}>
                    {Array.from({ length: LOSS_LAST - LOSS_FIRST + 1 }, (_, i) => LOSS_FIRST + i).map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
              </div>
              <div className="at-mtools">
                <label className="at-chk"><input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} />Estomper l’extérieur</label>
                <label className="at-chk"><input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} />Cartes liées</label>
              </div>
            </div>
            <div className="at-mbox">
              <div ref={elB} className="at-map" />
              <div className="at-ctl at-legend">
                <span><i style={{ background: "#dc6c9a" }} />Perte de couvert arboré, {dfFrom === dfTo ? dfFrom : `${dfFrom} à ${dfTo}`}</span>
                <span className="at-src">Source : UMD/Hansen, Global Forest Watch</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');
.at{--c-bg:var(--surface-2,#f1efe8);--c-card:var(--surface,#fff);--c-line:var(--border,#d8d4c8);--c-ink:var(--text,#1c2822);
  --c-ink2:var(--text-2,#4a5850);--c-ink3:var(--text-3,#7a867f);--c-acc:var(--accent,#1f6f50);--c-soft:var(--accent-soft,#e3f0ea);
  flex:1;min-width:0;height:100vh;height:100dvh;display:flex;flex-direction:column;background:var(--c-bg);color:var(--c-ink);font-family:inherit}
.at *{box-sizing:border-box}
.at h1,.at h2,.at h3,.at-facts dd{font-family:'Newsreader',Georgia,serif;font-weight:500;margin:0}
.at-head{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center;justify-content:space-between;padding:14px 20px;
  border-bottom:1px solid var(--c-line);background:var(--c-card)}
.at-head h1{font-size:26px;letter-spacing:-.01em;line-height:1.1}
.at-head p{margin:2px 0 0;font-size:13px;color:var(--c-ink3)}
.at-chain{display:flex;align-items:center;gap:6px;color:var(--c-ink3);flex-wrap:wrap}
.at select{min-width:150px;padding:9px 10px;border:1px solid var(--c-line);border-radius:10px;background:var(--c-card);color:var(--c-ink);font:inherit;font-size:14px}
.at select.at-mini{min-width:0;padding:5px 6px;font-size:13px;border-radius:8px}
.at select:disabled{opacity:.5}
.at select:focus-visible,.at button:focus-visible,.at-chk input:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
.at-reset{margin-left:6px;width:38px;height:38px;border-radius:10px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink2);cursor:pointer;display:grid;place-items:center}
.at-reset:disabled{opacity:.4;cursor:default}
.at-banner{padding:10px 20px;background:rgba(178,58,46,.1);border-bottom:1px solid #b23a2e;color:#8a2a20;font-size:14px}

.at-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(330px,390px) minmax(0,1fr)}
.at-panel{overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px;border-right:1px solid var(--c-line);overscroll-behavior:contain}
.at-maps{min-height:0;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px}
.at-mcard{min-height:0;min-width:0;display:flex;flex-direction:column;background:var(--c-card);border:1px solid var(--c-line);border-radius:14px;overflow:hidden}
.at-mhead{padding:10px 12px;border-bottom:1px solid var(--c-line);display:flex;flex-direction:column;gap:8px}
.at-mhead h3{font-size:19px}
.at-mtools{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:13px}
.at-mbox{position:relative;flex:1;min-height:240px;background:#1b2a24}
.at-map{position:absolute;inset:0}

.at-seg{display:flex;gap:2px;border:1px solid var(--c-line);border-radius:9px;padding:2px}
.at-seg button{padding:5px 10px;border:0;border-radius:7px;background:transparent;color:var(--c-ink2);font:inherit;font-size:13px;cursor:pointer}
.at-seg button[aria-pressed=true]{background:var(--c-acc);color:#fff}
.at-chk{display:flex;gap:6px;align-items:center;cursor:pointer;color:var(--c-ink2)}
.at-tool{display:inline-flex;gap:6px;align-items:center;padding:6px 11px;border-radius:9px;border:1px solid var(--c-line);background:var(--c-card);color:var(--c-ink);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.at-tool.on{background:var(--c-acc);border-color:var(--c-acc);color:#fff}
.at-tool:disabled{opacity:.45;cursor:default}

.at-ctl{position:absolute;z-index:1000;background:rgba(255,255,255,.94);color:#14231c;border-radius:9px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.at-hint{left:10px;top:10px;padding:7px 11px;max-width:calc(100% - 70px)}
.at-legend{left:10px;bottom:34px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;max-width:70%}
.at-legend span{display:flex;gap:8px;align-items:center}
.at-src{color:#5b6a62;font-size:11px}
.at-legend i,.at-tbl i{display:inline-block;width:11px;height:11px;border-radius:3px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.at-tip{background:#fff;color:#1c2822;border:0;border-radius:6px;font-weight:600;box-shadow:0 1px 6px rgba(0,0,0,.3)}

.at-card{background:var(--c-card);border:1px solid var(--c-line);border-radius:14px;padding:16px}
.at-card h3{font-size:20px;margin-bottom:4px}
.at-sub,.at-note{font-size:12.5px;color:var(--c-ink3);line-height:1.5;margin:4px 0 12px}
.at-note{margin:12px 0 0}
.at-empty{padding:24px 8px}
.at-empty h2{font-size:28px;line-height:1.1;margin-bottom:10px}
.at-empty p{color:var(--c-ink2);line-height:1.6;max-width:46ch}
.at-hero{border-color:transparent;background:
  repeating-radial-gradient(ellipse at 92% -10%,transparent 0 13px,rgba(125,125,105,.17) 13px 14px),var(--c-card)}
.at-hero h2{font-size:34px;line-height:1.02;letter-spacing:-.015em}
.at-lvl{margin:6px 0 14px;color:var(--c-ink2);font-size:14px}
.at-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0}
.at-facts div{display:flex;flex-direction:column-reverse}
.at-facts dd{margin:0;font-size:26px}
.at-facts dt{font-size:12px;color:var(--c-ink3);line-height:1.3}
.at-load{color:var(--c-ink3);font-size:14px}
.at-alert{font-size:13px;border-left:4px solid #b23a2e;background:rgba(178,58,46,.08);padding:8px 10px;margin:12px 0 0;border-radius:0 8px 8px 0}

.at-core{display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:center;margin-bottom:8px}
.at-corelab{display:flex;flex-direction:column;min-width:0;line-height:1.25}
.at-corelab small{font-size:11.5px;color:var(--c-ink3)}
.at-corelab span{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.at-stack{display:flex;height:26px;border-radius:7px;overflow:hidden;transform-origin:left;animation:atGrow .7s cubic-bezier(.2,.7,.2,1)}
.at-stack i{display:block;height:100%;box-shadow:inset -1px 0 rgba(255,255,255,.55)}
.at-slope{margin:10px 0 8px;height:18px}
.at-pulse{background:var(--c-line);animation:atPulse 1.2s ease-in-out infinite}
.at-tbl{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
.at-tbl th{font-weight:500;font-size:12px;color:var(--c-ink3);text-align:right;padding:0 0 6px}
.at-tbl th:first-child,.at-tbl td:first-child{text-align:left}
.at-tbl td{padding:5px 0;border-top:1px solid var(--c-line);text-align:right;font-variant-numeric:tabular-nums}
.at-tbl td:first-child{display:flex;gap:8px;align-items:center}
.at-strip{position:relative;height:10px;margin:16px 4px 0;border-radius:5px;background:linear-gradient(90deg,#8fbf8f,#e8d98a 35%,#c98b4a 65%,#8a5a3c)}
.at-range{position:absolute;top:-4px;bottom:-4px;border:2px solid var(--c-ink);border-radius:6px}
.at-dot{position:absolute;top:-3px;width:4px;height:16px;margin-left:-2px;background:var(--c-ink);border-radius:2px}
.at-stripl{display:flex;justify-content:space-between;font-size:11.5px;color:var(--c-ink3);margin-top:8px}

.at-go{padding:15px;border:0;border-radius:12px;background:var(--c-acc);color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer}
.at-go:disabled{opacity:.45;cursor:default}
.at-gauge-wrap p{margin:12px 0 14px;font-size:14px}
.at-gauge{position:relative;height:12px;border-radius:6px;background:linear-gradient(90deg,#6fae7a,#e6c84f,#e08a3c,#b23a2e)}
.at-gauge u{position:absolute;top:-5px;width:4px;height:22px;margin-left:-2px;background:var(--c-ink);border-radius:2px}
.at-reco{padding:12px 14px;border-radius:0 10px 10px 0;border-left:4px solid var(--c-line);background:var(--c-bg);margin-top:10px}
.at-reco.haute{border-color:#b23a2e}.at-reco.moyenne{border-color:#e0a23c}
.at-reco h4{margin:0 0 4px;font-size:14px}
.at-reco h4 span{font-weight:400;color:var(--c-ink3)}
.at-reco p{margin:0;font-size:13.5px;line-height:1.55;color:var(--c-ink2)}

@keyframes atGrow{from{transform:scaleX(0)}}
@keyframes atPulse{50%{opacity:.45}}
@media (max-width:1450px){
  .at-maps{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) minmax(0,1fr)}
}
@media (max-width:900px){
  .at{height:auto;min-height:100dvh}
  .at-body{display:flex;flex-direction:column}
  .at-maps{order:1;display:flex;flex-direction:column}
  .at-mbox{flex:none;height:54dvh}
  .at-panel{order:2;overflow:visible;border-right:0}
  .at-hint{display:none}
}
@media (prefers-reduced-motion:reduce){.at-stack,.at-pulse{animation:none}}
`;
