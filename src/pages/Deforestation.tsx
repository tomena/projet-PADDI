import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Trees, ShieldCheck, TreePine, TrendingDown, BadgePercent, MapPinned, MapPin, Calendar,
  Trophy, Medal, Globe2, Play, Pause,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, Cell, ReferenceLine,
} from "recharts";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../context/LanguageContext";

/* ============================ TRADUCTIONS ============================
   `fr` sert de modèle : TypeScript impose les mêmes clés dans mg / en / de. */

const fr = {
  title: "Suivi de la déforestation",
  year: "Année",
  protectedArea: "Aire protégée",
  region: "Région",
  allRegions: "Toutes les régions",
  loading: "Chargement des données…",
  noBase: "Base de déforestation introuvable : vérifiez les chemins dans DATA.",

  leastDeforested: "Communes les moins déforestées par rapport à leur couverture forestière en",
  loss: "avec une perte",
  forestCover: "de sa couverture forestière",

  kpiForestCover: "Couverture forestière des Communes riveraines (2000)",
  kpiRemainingArea: "Superficie restante autour de l'Aire Protégée en",
  kpiLossInside: "Superficie perdue à l'intérieur de l'Aire Protégée en",
  kpiAverage: "Superficie moyenne annuelle de déforestation",
  kpiCumulativeRate: "Taux cumulé de perte forestière",
  kpiMostAffected: "Commune la plus touchée",

  gTopYear: "Communes les plus affectées en",
  gTopCum: "Communes les plus touchées depuis 2001 jusqu'en",
  gCompare: "Comparaison de la déforestation par commune",
  gEvolution: "Évolution annuelle des pertes forestières et du taux de déforestation des Communes riveraines",
  gDecade: "Évolution décennale de la déforestation autour de l'Aire Protégée",

  compare: "Comparer avec :",
  inside: "À l'intérieur du parc",
  outside: "À l'extérieur du parc",
  surrounding: "Communes riveraines",
  surface: "Superficie",
  surfaceHa: "Superficie (ha)",
  cumulative: "Cumul (%)",
  lossRate: "Taux de perte (%)",
  annualUnit: "ha/an",
  topN: "Top",
  modeYear: "Année",
  modeCum: "Cumul",
  ofTotal: "du total de toutes les communes",
  peak: "Pic",
  total: "Total",

  tipLoss: "Perte",
  tipCum: "Cumul depuis 2001",
  tipRate: "Taux cumulé",
  tipCover: "Couverture 2000",
  tipRemaining: "Couverture restante",

  mapTitle: "Carte interactive de la déforestation",
  street: "Plan",
  satellite: "Satellite",
  lCommunes: "Communes",
  lLabels: "Noms des communes",
  lBubbles: "Pertes de l'année (bulles)",
  lAP: "Limite de l'AP",
  lPeriph: "Périphérie 5 km",
  lRegions: "Régions",
  metricCum: "Cumul depuis 2001",
  metricYear: "Année seule",
  legendCum: "Taux cumulé de perte (% de la couverture 2000)",
  legendYear: "Taux de perte de l'année (%)",
  bubbleLegend: "Perte de l'année (taille = ha)",
  play: "Lecture de la série",
  pause: "Pause",
  noGeo: "Aucune géométrie de commune trouvée pour cette aire protégée.",
  apBox: "Intérieur de l'AP",
};
type Txt = typeof fr;

const mg: Txt = {
  title: "Fanaraha-maso ny fahapotehan'ny ala",
  year: "Taona",
  protectedArea: "Faritra arovana",
  region: "Faritra",
  allRegions: "Faritra rehetra",
  loading: "Mitondra ny angona…",
  noBase: "Tsy hita ny angona fahapotehan'ala: jereo ny lalana ao amin'ny DATA.",

  leastDeforested: "Kaominina vitsy fahapotehan'ala indrindra raha oharina amin'ny rakotra ala tamin'ny",
  loss: "nahitana fatiantoka",
  forestCover: "amin'ny rakotra alany",

  kpiForestCover: "Rakotra ala tany amin'ny Kaominina manodidina (2000)",
  kpiRemainingArea: "Velaran'ala sisa tavela manodidina ny Faritra Arovana tamin'ny",
  kpiLossInside: "Velaran'ala very tao anatin'ny Faritra Arovana tamin'ny",
  kpiAverage: "Salan'isa isan-taona amin'ny fahapotehan'ala",
  kpiCumulativeRate: "Tahan'ny fahaverezan'ala mitambatra",
  kpiMostAffected: "Kaominina voakasika indrindra",

  gTopYear: "Kaominina tena voakasika indrindra tamin'ny",
  gTopCum: "Kaominina tena voakasika indrindra nanomboka 2001 ka hatramin'ny",
  gCompare: "Fampitahana ny fahapotehan'ala isaky ny kaominina",
  gEvolution: "Fivoaran'ny fahaverezan'ala sy ny tahan'ny fahapotehan'ala isan-taona amin'ireo Kaominina manodidina",
  gDecade: "Fivoaran'ny fahapotehan'ala isaky ny folo taona manodidina ny Faritra Arovana",

  compare: "Ampitahao amin'ny :",
  inside: "Ao anatin'ny valan-javaboary",
  outside: "Eo ivelan'ny valan-javaboary",
  surrounding: "Kaominina manodidina",
  surface: "Velarana",
  surfaceHa: "Velarana (ha)",
  cumulative: "Fitambatra (%)",
  lossRate: "Tahan'ny fahaverezana (%)",
  annualUnit: "ha/taona",
  topN: "Top",
  modeYear: "Taona",
  modeCum: "Fitambatra",
  ofTotal: "amin'ny fitambaran'ny kaominina rehetra",
  peak: "Tampony",
  total: "Fitambarany",

  tipLoss: "Fatiantoka",
  tipCum: "Fitambatra hatramin'ny 2001",
  tipRate: "Tahan'ny fitambatra",
  tipCover: "Rakotra ala 2000",
  tipRemaining: "Rakotra ala sisa",

  mapTitle: "Sarintany mifandray amin'ny fahapotehan'ala",
  street: "Sarintany",
  satellite: "Zanabolana",
  lCommunes: "Kaominina",
  lLabels: "Anaran'ny kaominina",
  lBubbles: "Fatiantoka isan-taona (boribory)",
  lAP: "Sisin'ny AP",
  lPeriph: "Manodidina 5 km",
  lRegions: "Faritra",
  metricCum: "Fitambatra hatramin'ny 2001",
  metricYear: "Taona iray",
  legendCum: "Tahan'ny fahaverezan'ala mitambatra (% amin'ny rakotra 2000)",
  legendYear: "Tahan'ny fahaverezana isan-taona (%)",
  bubbleLegend: "Fatiantoka isan-taona (habe = ha)",
  play: "Alefaso ny andiany",
  pause: "Ajanony",
  noGeo: "Tsy misy endrika kaominina hita ho an'ity faritra arovana ity.",
  apBox: "Ao anatin'ny AP",
};

const en: Txt = {
  title: "Deforestation Monitoring",
  year: "Year",
  protectedArea: "Protected Area",
  region: "Region",
  allRegions: "All regions",
  loading: "Loading data…",
  noBase: "Deforestation database not found: check the paths in DATA.",

  leastDeforested: "Least deforested municipalities relative to their forest cover in",
  loss: "with a loss of",
  forestCover: "of its forest cover",

  kpiForestCover: "Forest cover of surrounding municipalities (2000)",
  kpiRemainingArea: "Remaining forest area around the Protected Area in",
  kpiLossInside: "Forest area lost inside the Protected Area in",
  kpiAverage: "Average annual deforestation area",
  kpiCumulativeRate: "Cumulative forest loss rate",
  kpiMostAffected: "Most affected municipality",

  gTopYear: "Most affected municipalities in",
  gTopCum: "Most affected municipalities since 2001 until",
  gCompare: "Deforestation by municipality: comparison",
  gEvolution: "Annual evolution of forest loss and deforestation rate in surrounding municipalities",
  gDecade: "Decadal evolution of deforestation around the Protected Area",

  compare: "Compare with:",
  inside: "Inside the park",
  outside: "Outside the park",
  surrounding: "Surrounding municipalities",
  surface: "Area",
  surfaceHa: "Area (ha)",
  cumulative: "Cumulative (%)",
  lossRate: "Loss rate (%)",
  annualUnit: "ha/year",
  topN: "Top",
  modeYear: "Year",
  modeCum: "Cumulative",
  ofTotal: "of the total of all municipalities",
  peak: "Peak",
  total: "Total",

  tipLoss: "Loss",
  tipCum: "Cumulative since 2001",
  tipRate: "Cumulative rate",
  tipCover: "Cover in 2000",
  tipRemaining: "Remaining cover",

  mapTitle: "Interactive deforestation map",
  street: "Streets",
  satellite: "Satellite",
  lCommunes: "Municipalities",
  lLabels: "Municipality names",
  lBubbles: "Yearly losses (bubbles)",
  lAP: "PA boundary",
  lPeriph: "5 km periphery",
  lRegions: "Regions",
  metricCum: "Cumulative since 2001",
  metricYear: "Single year",
  legendCum: "Cumulative loss rate (% of 2000 cover)",
  legendYear: "Loss rate of the year (%)",
  bubbleLegend: "Loss of the year (size = ha)",
  play: "Play the series",
  pause: "Pause",
  noGeo: "No municipality geometry found for this protected area.",
  apBox: "Inside the PA",
};

const de: Txt = {
  title: "Überwachung der Entwaldung",
  year: "Jahr",
  protectedArea: "Schutzgebiet",
  region: "Region",
  allRegions: "Alle Regionen",
  loading: "Daten werden geladen…",
  noBase: "Entwaldungsdatenbank nicht gefunden: Pfade in DATA prüfen.",

  leastDeforested: "Gemeinden mit der geringsten Entwaldung im Verhältnis zu ihrer Waldfläche im",
  loss: "mit einem Verlust von",
  forestCover: "ihrer Waldfläche",

  kpiForestCover: "Waldfläche der angrenzenden Gemeinden (2000)",
  kpiRemainingArea: "Verbleibende Waldfläche rund um das Schutzgebiet im",
  kpiLossInside: "Verlorene Waldfläche innerhalb des Schutzgebiets im",
  kpiAverage: "Durchschnittliche jährliche Entwaldungsfläche",
  kpiCumulativeRate: "Kumulative Waldverlustrate",
  kpiMostAffected: "Am stärksten betroffene Gemeinde",

  gTopYear: "Am stärksten betroffene Gemeinden im",
  gTopCum: "Am stärksten betroffene Gemeinden seit 2001 bis",
  gCompare: "Entwaldung nach Gemeinde: Vergleich",
  gEvolution: "Jährliche Entwicklung der Waldverluste und Entwaldungsrate der umliegenden Gemeinden",
  gDecade: "Zehnjährige Entwicklung der Entwaldung rund um das Schutzgebiet",

  compare: "Vergleichen mit:",
  inside: "Innerhalb des Parks",
  outside: "Außerhalb des Parks",
  surrounding: "Angrenzende Gemeinden",
  surface: "Fläche",
  surfaceHa: "Fläche (ha)",
  cumulative: "Kumuliert (%)",
  lossRate: "Verlustrate (%)",
  annualUnit: "ha/Jahr",
  topN: "Top",
  modeYear: "Jahr",
  modeCum: "Kumuliert",
  ofTotal: "der Summe aller Gemeinden",
  peak: "Spitze",
  total: "Gesamt",

  tipLoss: "Verlust",
  tipCum: "Kumuliert seit 2001",
  tipRate: "Kumulierte Rate",
  tipCover: "Waldfläche 2000",
  tipRemaining: "Verbleibende Waldfläche",

  mapTitle: "Interaktive Entwaldungskarte",
  street: "Straßen",
  satellite: "Satellit",
  lCommunes: "Gemeinden",
  lLabels: "Gemeindenamen",
  lBubbles: "Jahresverluste (Blasen)",
  lAP: "Grenze des Schutzgebiets",
  lPeriph: "5-km-Randgebiet",
  lRegions: "Regionen",
  metricCum: "Kumuliert seit 2001",
  metricYear: "Einzelnes Jahr",
  legendCum: "Kumulierte Verlustrate (% der Waldfläche 2000)",
  legendYear: "Verlustrate des Jahres (%)",
  bubbleLegend: "Verlust des Jahres (Größe = ha)",
  play: "Zeitreihe abspielen",
  pause: "Pause",
  noGeo: "Keine Gemeindegeometrie für dieses Schutzgebiet gefunden.",
  apBox: "Innerhalb des Schutzgebiets",
};

const TEXT: Record<string, Txt> = { fr, mg, en, de };
const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };

/* ============================ CHEMINS DES DONNÉES (à adapter) ============================
   Les 4 fichiers géographiques sont les mêmes que ceux de la page « Analyse des feux ». */
const DATA = {
  deforestation: "/data/Bases_Deforestation.geojson", // AP, Source, Commune, Couverture2000, 2001…2025
  regions: "/data/madagascar_24_region.geojson",
  aires: "/data/aire_protegee_paddi.geojson",
  peripheries: "/data/peripherie_5km_paddi.geojson",
  communesGeo: "/data/madagascar_communes.json",
};
const PROP = { region: "nom_reg", ap: "nom_ap", periph: "nom_ap", commune: "NAME_4" };

const MADAGASCAR: L.LatLngBoundsExpression = [[-26, 42.3], [-11.5, 50.9]];
const FONDS: Record<string, { url: string; attr: string }> = {
  topo: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
};

// Échelles de couleur de la carte (seuils en %, à ajuster selon vos données)
const SCALE_CUM: [number, string][] = [[30, "#7f1d1d"], [20, "#dc2626"], [10, "#f97316"], [3, "#facc15"], [0, "#dcfce7"]];
const SCALE_YEAR: [number, string][] = [[3, "#7f1d1d"], [1.5, "#dc2626"], [0.5, "#f97316"], [0.1, "#facc15"], [0, "#dcfce7"]];
const colorOf = (pct: number | null, scale: [number, string][]) =>
  pct == null ? "#cbd5e1" : (scale.find(([m]) => pct >= m) || scale[scale.length - 1])[1];

/* ============================ OUTILS ============================ */
const num = (v: any) => Number(String(v ?? 0).replace(",", ".")) || 0;
const same = (a: any, b: any) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const srcOf = (p: any) => String(p.Source).trim().toLowerCase();
const isCommune = (p: any) => srcOf(p) === "commune";
// la base écrit « Interrieur » (sic) ; on accepte aussi l'orthographe correcte
const isInterieur = (p: any) => srcOf(p) === "interrieur" || srcOf(p) === "interieur";
const val = (p: any, y: number) => num(p[String(y)]);
const cumTo = (p: any, y: number) => {
  let s = 0;
  for (const k in p) {
    const n = Number(k);
    if (Number.isInteger(n) && n >= 2001 && n <= y) s += num(p[k]);
  }
  return s;
};
const sumBy = (rows: any[], fn: (p: any) => number) => rows.reduce((a, p) => a + fn(p), 0);
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));
const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sameArea = (a: unknown, b: unknown) => {
  const x = norm(a), y = norm(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
};

const makeFmt = (loc: string) => ({
  ha: (v: number) => `${v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`,
  int: (v: number) => Math.round(v).toLocaleString(loc),
  pct: (v: number, d = 1) => `${v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d })} %`,
});
type Fmt = ReturnType<typeof makeFmt>;

function useGeo(url: string) {
  const [features, setFeatures] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let on = true;
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))))
      .then((j) => on && setFeatures(j.features || []))
      .catch(() => console.warn("Données introuvables :", url))
      .finally(() => on && setDone(true));
    return () => { on = false; };
  }, [url]);
  return [features, done] as const;
}

/* ---- Géométrie ---- */
type Bbox = [number, number, number, number];
type Zone = { nom: string; feature: any; bbox: Bbox; [k: string]: any };
const walk = (c: any, cb: (x: number, y: number) => void) => {
  if (!Array.isArray(c)) return;
  if (typeof c[0] === "number") { cb(c[0], c[1]); return; }
  for (const k of c) walk(k, cb);
};
const bboxOf = (g: any): Bbox => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  walk(g?.coordinates, (x, y) => { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; });
  return [a, b, c, d];
};
const inRing = (lon: number, lat: number, r: number[][]) => {
  let in_ = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
};
const inPoly = (lon: number, lat: number, g: any): boolean => {
  const test = (p: number[][][]) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h));
  if (g?.type === "Polygon") return test(g.coordinates);
  if (g?.type === "MultiPolygon") return g.coordinates.some(test);
  return false;
};
const touch = (a: Bbox, b: Bbox) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
const inZone = (lon: number, lat: number, z: Zone) => {
  const b = z.bbox;
  return !(lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) && inPoly(lon, lat, z.feature.geometry);
};
const zoneIn = (z: Zone, r: Zone) => {
  if (!touch(z.bbox, r.bbox)) return false;
  const pts: number[][] = [];
  walk(z.feature.geometry?.coordinates, (x, y) => pts.push([x, y]));
  const step = Math.max(1, Math.floor(pts.length / 40));
  for (let i = 0; i < pts.length; i += step) if (inZone(pts[i][0], pts[i][1], r)) return true;
  return inZone((z.bbox[0] + z.bbox[2]) / 2, (z.bbox[1] + z.bbox[3]) / 2, r);
};
const around = (z: Zone, c: Zone) => zoneIn(z, c) || zoneIn(c, z);
const toZones = (feats: any[], key: string, def: string): Zone[] =>
  feats.filter((f) => f?.geometry).map((f) => ({ nom: f.properties?.[key] || def, feature: f, bbox: bboxOf(f.geometry) }));

/* ============================ STYLES RESPONSIFS ============================ */
const CSS = `
.df{padding:clamp(8px,1.6vw,16px);background:#eef3f8;min-height:100vh;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;max-width:2400px;margin:0 auto}
.df *{box-sizing:border-box}
.df-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;padding:12px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.df-brand{display:flex;align-items:center;gap:12px;min-width:0}
.df-logo{flex:none;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#166534,#22a05a);position:relative}
.df-logo svg.f{position:absolute;right:-5px;bottom:-5px;background:#fff;border-radius:50%;padding:3px}
.df-h1{margin:0;color:#0b4ea2;font-size:clamp(17px,2.4vw,24px);font-weight:700;line-height:1.2}
.df-sub{margin:2px 0 0;font-size:12px;color:#6b7280}
.df-filters{display:flex;flex-wrap:wrap;gap:10px}
.df-f{display:flex;flex-direction:column;gap:4px;min-width:130px;flex:1 1 130px}
.df-f label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#374151}
.df select,.df-sel{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #d1d5db;background:#f9fafb;font-weight:600;font-size:12px;cursor:pointer}
.df select:focus-visible,.df input:focus-visible,.df button:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.df-rank{display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;margin-bottom:10px;padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;font-size:12px}
.df-rank-t{display:flex;align-items:center;gap:8px;font-weight:700;color:#003399;font-size:13px;flex:1 1 280px}
.df-rank-i{display:flex;align-items:center;gap:6px}
.df-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:10px;margin-bottom:10px}
.df-kpi{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-left:4px solid var(--c);border-radius:12px;padding:12px 14px;min-height:96px;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.df-badge{flex:none;width:56px;height:56px;border-radius:15px;display:grid;place-items:center;background:var(--bg)}
.df-kpi-txt{min-width:0;display:flex;flex-direction:column;gap:4px}
.df-kpi-t{font-size:11.5px;font-weight:700;line-height:1.25;color:var(--c)}
.df-kpi-v{font-size:clamp(17px,1.5vw,21px);font-weight:800;color:var(--c);line-height:1.1;word-break:break-word}
.df-kpi-s{font-size:11px;font-weight:600;color:#475569;line-height:1.3}
.df-body{display:grid;grid-template-columns:1fr;gap:10px}
.df-left{display:grid;grid-template-columns:1fr;gap:10px;align-content:start;min-width:0}
@media(min-width:700px){.df-left{grid-template-columns:repeat(2,minmax(0,1fr))}.df-wide{grid-column:1/-1}}
@media(min-width:1100px){.df-body{grid-template-columns:minmax(0,56fr) minmax(0,44fr)}.df-mapcard{position:sticky;top:10px;height:calc(100vh - 24px);max-height:900px}}
@media(max-width:1099px){.df-mapcard{order:-1;height:68vh;min-height:420px}}
.df-card{background:#fff;border:1px solid #d9d9d9;border-radius:10px;padding:10px;min-width:0;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.df-ct{margin:0 0 8px;text-align:center;font-size:12px;font-weight:700;font-style:italic;color:#d32f2f;line-height:1.3}
.df-chart{height:clamp(250px,22vw,380px)}
.df-note{margin:6px 0 0;font-size:11px;color:#64748b;text-align:center}
.df-tip{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.df-tip b{display:block;margin-bottom:4px;color:#0f172a}
.df-tip div{display:flex;justify-content:space-between;gap:14px}
.df-bar-tools{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 10px;margin-bottom:4px}
.df-chips{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:#334155;justify-content:center}
.df-chips span{display:inline-flex;align-items:center;gap:5px}
.df-chips i{width:11px;height:11px;border-radius:3px;display:inline-block}
.df-chips i.dot{border-radius:50%}
.df-chips i.ln{height:3px;width:16px;border-radius:2px}
.df-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff}
.df-seg button{padding:5px 10px;border:0;background:transparent;color:#475569;font-size:12px;font-weight:600;cursor:pointer}
.df-seg button+button{border-left:1px solid #cbd5e1}
.df-seg button.on{background:#0b4ea2;color:#fff}
.df-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
.df-zone{background:#f8fafc;border:1px solid #eef2f7;border-radius:10px;padding:6px 8px 2px}
.df-zh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:2px}
.df-zt{display:flex;align-items:center;gap:6px;color:#1565c0;font-size:12px;font-weight:700}
.df-vchip{padding:2px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;background:#e0f2fe;color:#075985}
.df-mapcard{min-height:520px}
.df-tools{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-bottom:8px;font-size:12px;font-weight:600;color:#374151}
.df-tools label{display:flex;align-items:center;gap:5px;cursor:pointer}
.df-tools .df-sel{width:auto}
.df-time{display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:6px 10px;background:#f1f5f9;border-radius:10px}
.df-time input[type=range]{flex:1;min-width:80px;accent-color:#b91c1c;cursor:pointer}
.df-time strong{min-width:42px;text-align:right;font-size:15px;color:#b91c1c}
.df-play{flex:none;width:34px;height:34px;border-radius:50%;border:0;background:#b91c1c;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 6px rgba(185,28,28,.4);transition:transform .15s}
.df-play:hover{transform:scale(1.08)}
.df-map{position:relative;flex:1;min-height:340px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;isolation:isolate}
.df-map .leaflet-container{position:absolute;inset:0;font-family:inherit;background:#e5e7eb}
.df-legend{position:absolute;left:8px;bottom:8px;z-index:1000;display:flex;flex-direction:column;gap:6px;max-width:68%}
.df-lg{background:rgba(255,255,255,.94);padding:6px 9px;border-radius:8px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.df-lg div{display:flex;align-items:center;gap:6px;margin-top:2px}
.df-lg i{width:13px;height:10px;display:inline-block;border:1px solid #9ca3af}
.df-lg i.bub{width:12px;height:12px;border-radius:50%;background:rgba(29,78,216,.55);border:1.5px solid #fff;box-shadow:0 0 0 1px #1d4ed8}
.df-apbox{position:absolute;left:8px;top:8px;z-index:1000;background:rgba(255,255,255,.95);border-radius:10px;padding:8px 11px;box-shadow:0 1px 6px rgba(0,0,0,.28);font-size:11px;max-width:60%;border-left:4px solid #166534}
.df-apbox b{display:block;font-size:13px;color:#14532d}
.df-apbox span{color:#64748b}
.df-apbox div{display:flex;justify-content:space-between;gap:12px;margin-top:3px}
.df-apbox strong{color:#b91c1c;white-space:nowrap}
.df-lbl{background:none;border:0}
.df-lbl span{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font-weight:700;color:#0f172a;text-shadow:0 0 2px #fff,0 0 3px #fff,0 0 4px #fff;pointer-events:none}
.df-load{padding:30px;text-align:center;color:#0b4ea2;font-weight:600}
.df .leaflet-tooltip{font-size:12px;font-weight:600;line-height:1.5}
@media(max-width:560px){.df-lg{font-size:10px;padding:4px 6px}.df-legend{max-width:80%}.df-apbox{max-width:75%}}
@media(prefers-reduced-motion:reduce){.df *{transition:none!important}}
`;

/* ============================ COMPOSANTS DE BASE ============================ */
const Card = ({ title, className = "", children }: any) => (
  <section className={`df-card ${className}`}>
    <h3 className="df-ct">{title}</h3>
    {children}
  </section>
);

const Seg = ({ options, value, onChange, label }: any) => (
  <div className="df-seg" role="group" aria-label={label}>
    {options.map(([v, l]: any) => (
      <button key={String(v)} type="button" className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>
    ))}
  </div>
);

const KPI = ({ title, color, tint, icon, value, sub }: any) => (
  <div className="df-kpi" style={{ "--c": color, "--bg": `${tint}1f` } as any}>
    <div className="df-badge">{icon}</div>
    <div className="df-kpi-txt">
      <div className="df-kpi-t">{title}</div>
      <div className="df-kpi-v">{value}</div>
      {sub && <div className="df-kpi-s">{sub}</div>}
    </div>
  </div>
);

const Ranking = ({ items, f }: any) => (
  <>
    {items.map((c: any, i: number) => (
      <div className="df-rank-i" key={c.commune}>
        <Medal color={i === 0 ? "gold" : i === 1 ? "silver" : "#cd7f32"} />
        <span>{c.commune}</span>
        <span style={{ color: "#16a34a", fontWeight: 600 }}>({f.pct(c.taux, 2)})</span>
      </div>
    ))}
  </>
);

// étiquette d'axe inclinée : les 5 premières communes sont mises en avant
const RankTick = ({ x, y, payload, index, top = 0 }: any) => {
  const nom = String(payload.value);
  const hot = index < top;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="end" transform="rotate(-30)" fill={hot ? "#b91c1c" : "#475569"} fontSize={11} fontWeight={hot ? 700 : 400}>
        {hot ? `${index + 1}. ` : ""}{nom.length > 9 ? `${nom.substring(0, 9)}…` : nom}
      </text>
    </g>
  );
};

/* ============================ GRAPHIQUES ============================ */

/* 1. Évolution annuelle : barres (ha) + courbe du taux, année choisie mise en évidence */
const EvoTip = ({ active, payload, f, t }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="df-tip">
      <b>{d.annee}</b>
      <div><span>{t.surface}</span><strong>{f.ha(d.superficie)}</strong></div>
      <div><span>{t.lossRate}</span><strong>{f.pct(d.taux, 2)}</strong></div>
    </div>
  );
};

const EvolutionChart = ({ data, year, peak, t, f }: any) => (
  <Card title={t.gEvolution} className="df-wide">
    <div className="df-chips">
      <span><i style={{ background: "#93c5fd" }} />{t.surface}</span>
      <span><i className="ln" style={{ background: "#dc2626" }} />{t.lossRate}</span>
      {peak?.annee ? <span style={{ color: "#dc2626", fontWeight: 700 }}>▲ {t.peak} : {peak.annee} ({f.pct(peak.taux, 2)})</span> : null}
    </div>
    <div className="df-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 24, right: 14, left: -6, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="annee" interval={0} angle={-45} textAnchor="end" height={44} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#94a3b8" }} tickLine={false} />
          <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={compact} width={42} />
          <YAxis yAxisId="r" orientation="right" hide domain={[0, (m: number) => Math.max(1, m * 1.25)]} />
          <Tooltip content={<EvoTip f={f} t={t} />} cursor={{ fill: "rgba(11,78,162,.06)" }} />
          <Bar yAxisId="l" dataKey="superficie" name={t.surface} radius={[3, 3, 0, 0]}>
            {data.map((d: any) => (
              <Cell key={d.annee} fill={d.annee === year ? "#1d4ed8" : d.annee < year ? "#93c5fd" : "#dbeafe"} />
            ))}
          </Bar>
          <Line
            yAxisId="r" type="monotone" dataKey="taux" name={t.lossRate} stroke="#dc2626" strokeWidth={2}
            dot={(p: any) => {
              if (!peak?.annee || p.payload.annee !== peak.annee) return <g key={`d${p.index}`} />;
              return (
                <g key={`d${p.index}`}>
                  <circle cx={p.cx} cy={p.cy} r={5} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
                  <text x={p.cx} y={p.cy - 11} textAnchor="middle" fontSize={11} fontWeight={700} fill="#dc2626">{p.payload.taux.toFixed(1)}%</text>
                </g>
              );
            }}
          />
          <ReferenceLine yAxisId="l" x={year} stroke="#1d4ed8" strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

/* 2. Communes les plus touchées : l'année choisie OU le cumul depuis 2001 (fusion des anciens graphiques 1 et 4) */
const TopTip = ({ active, payload, f, t }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="df-tip">
      <b>{d.commune}</b>
      <div><span>{t.surface}</span><strong>{f.ha(d.superficie)}</strong></div>
      <div><span>{t.cumulative}</span><strong>{f.pct(d.pct, 1)}</strong></div>
    </div>
  );
};

const TopChart = ({ data, share, mode, setMode, n, setN, year, t, f }: any) => (
  <Card title={`${mode === "year" ? t.gTopYear : t.gTopCum} ${year}`}>
    <div className="df-bar-tools">
      <Seg label="mode" value={mode} onChange={setMode} options={[["year", t.modeYear], ["cum", t.modeCum]]} />
      <Seg label="Top" value={n} onChange={setN} options={[[5, `${t.topN} 5`], [11, `${t.topN} 11`]]} />
    </div>
    <div className="df-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 22, right: 8, left: -4, bottom: 30 }} barCategoryGap="22%">
          <defs>
            <linearGradient id="dfRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.95} /><stop offset="100%" stopColor="#fca5a5" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="commune" interval={0} tick={<RankTick top={3} />} axisLine={{ stroke: "#94a3b8" }} tickLine={false} />
          <YAxis yAxisId="l" tickFormatter={compact} width={42} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="r" orientation="right" hide domain={[0, 100]} />
          <Tooltip content={<TopTip f={f} t={t} />} cursor={{ fill: "rgba(220,38,38,.06)" }} />
          <Bar yAxisId="l" dataKey="superficie" name={t.surfaceHa} fill="url(#dfRed)" radius={[4, 4, 0, 0]} barSize={26}>
            <LabelList dataKey="superficie" position="insideTop" fill="#fff" fontSize={9} fontWeight={700} formatter={(v: number) => compact(v)} />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="pct" name={t.cumulative} stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2.5 }}>
            <LabelList dataKey="pct" position="top" fill="#111827" fontSize={10} fontWeight={700} formatter={(v: number) => `${Math.round(v)}%`} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="df-note">{t.topN} {n} : <strong>{share} %</strong> {t.ofTotal}</p>
  </Card>
);

/* 3. Comparaison de deux années (fusion des anciens graphiques 2 et 3) : intérieur du parc OU communes riveraines */
const CmpTip = ({ active, payload, label, year, cmpYear, f }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const diff = d.y2 - d.y1;
  return (
    <div className="df-tip">
      <b>{d.commune}</b>
      <div><span style={{ color: "#c2410c" }}>{cmpYear}</span><strong>{f.ha(d.y1)}</strong></div>
      <div><span style={{ color: "#7c2d12" }}>{year}</span><strong>{f.ha(d.y2)}</strong></div>
      <div style={{ color: diff === 0 ? "#64748b" : diff > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
        <span>{diff === 0 ? "—" : diff > 0 ? "▲" : "▼"}</span><span>{f.ha(Math.abs(diff))}</span>
      </div>
    </div>
  );
};

const CompareChart = ({ data, zone, setZone, cmpYear, setCmpYear, years, year, t, f }: any) => {
  // écart entre les deux années : ▲ rouge si la perte augmente, ▼ vert si elle diminue
  const diffLabel = (p: any) => {
    const { x, y, index } = p;
    const d = data[index];
    if (!d || x == null || y == null) return null;
    const diff = d.y2 - d.y1;
    if (!diff) return null;
    const v = Math.abs(diff);
    const txt = `${diff > 0 ? "▲" : "▼"} ${v >= 100 ? Math.round(v).toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    return <text x={x} y={y - 6 - (index % 2) * 10} textAnchor="middle" fontSize={9} fontWeight={700} fill={diff > 0 ? "#dc2626" : "#16a34a"}>{txt}</text>;
  };
  return (
    <Card title={t.gCompare}>
      <div className="df-bar-tools">
        <Seg label="zone" value={zone} onChange={setZone} options={[["int", t.inside], ["com", t.surrounding]]} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
          {t.compare}
          <select aria-label={t.compare} value={cmpYear} onChange={(e) => setCmpYear(Number(e.target.value))} style={{ width: "auto" }}>
            {years.map((y: number) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>
      <div className="df-chips" style={{ marginBottom: 2 }}>
        <span><i style={{ background: "#fdba74" }} />{cmpYear}</span>
        <span><i style={{ background: "#c2410c" }} />{year}</span>
      </div>
      <div className="df-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 8, left: -4, bottom: 30 }} barGap={1} barCategoryGap="20%">
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="commune" interval={0} tick={<RankTick />} axisLine={{ stroke: "#94a3b8" }} tickLine={false} />
            <YAxis tickFormatter={compact} width={42} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, (m: number) => Math.ceil(m * 1.1)]} />
            <Tooltip content={<CmpTip year={year} cmpYear={cmpYear} f={f} />} cursor={{ fill: "rgba(194,65,12,.06)" }} />
            <Bar dataKey="y1" name={String(cmpYear)} fill="#fdba74" barSize={12} radius={[2, 2, 0, 0]} />
            <Bar dataKey="y2" name={String(year)} fill="#c2410c" barSize={12} radius={[2, 2, 0, 0]} />
            <Line type="monotone" dataKey="m" stroke="none" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false}>
              <LabelList content={diffLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

/* 4. Évolution par décennie : intérieur / extérieur du parc */
const DecadeChart = ({ blocks, ap, t, f }: any) => (
  <Card title={`${t.gDecade} ${ap}`} className="df-wide">
    <div className="df-two">
      {blocks.map((b: any) => {
        const Icon = b.icon;
        return (
          <div key={b.key} className="df-zone">
            <div className="df-zh">
              <span className="df-zt" style={{ color: b.color }}><Icon size={14} />{b.title}</span>
              <span className="df-vchip">{t.total} : {f.int(b.total)} ha</span>
            </div>
            <ResponsiveContainer width="100%" height={108}>
              <BarChart data={b.rows} layout="vertical" margin={{ top: 2, right: 16, left: 0, bottom: 2 }} barCategoryGap="18%">
                <XAxis type="number" hide domain={[0, (m: number) => Math.max(1, m * 1.25)]} />
                <YAxis type="category" dataKey="periode" width={92} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Bar dataKey="valeur" barSize={22} radius={[0, 4, 4, 0]} background={{ fill: "#eef2f7", radius: 4 }}>
                  {b.shades.map((c: string, i: number) => <Cell key={i} fill={c} />)}
                  <LabelList
                    dataKey="valeur"
                    content={(p: any) => {
                      const { x, y, width, height, value } = p;
                      const text = `${Math.round(value).toLocaleString()} ha`;
                      const inside = width > text.length * 6.2 + 16;
                      return (
                        <text x={inside ? x + width - 8 : x + width + 6} y={y + height / 2} dy={4} textAnchor={inside ? "end" : "start"} fill={inside ? "#fff" : "#1f2937"} fontSize={11} fontWeight={700}>{text}</text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  </Card>
);

/* ============================ CARTE INTERACTIVE ============================ */
const Layer = ({ zones, style, cle, tip }: any) => {
  const map = useMap();
  const st = useRef(style), tp = useRef(tip);
  st.current = style; tp.current = tip;
  useEffect(() => {
    if (!zones.length) return;
    const g = L.featureGroup();
    zones.forEach((z: any) => {
      const l = L.geoJSON(z.feature, { style: () => st.current(z) });
      const html = tp.current ? tp.current(z) : null;
      if (html) l.bindTooltip(html, { sticky: true });
      l.addTo(g);
    });
    g.addTo(map);
    return () => { map.removeLayer(g); };
  }, [zones, cle, map]);
  return null;
};

/* bulles proportionnelles à la perte de l'année (surface ∝ ha) */
const Bubbles = ({ zones, cle, t, f, year }: any) => {
  const map = useMap();
  useEffect(() => {
    const max = Math.max(...zones.map((z: any) => z.lossYear), 0);
    if (!max) return;
    const g = L.featureGroup();
    zones.forEach((z: any) => {
      if (z.lossYear <= 0) return;
      L.circleMarker(z.center, { radius: 4 + 24 * Math.sqrt(z.lossYear / max), color: "#fff", weight: 1.5, fillColor: "#1d4ed8", fillOpacity: 0.55 })
        .bindTooltip(`<b>${z.nom}</b><br/>${t.tipLoss} ${year} : ${f.ha(z.lossYear)}`, { sticky: true })
        .addTo(g);
    });
    g.addTo(map);
    return () => { map.removeLayer(g); };
  }, [zones, cle, map]);
  return null;
};

const Labels = ({ zones }: any) => {
  const map = useMap();
  useEffect(() => {
    if (!zones.length) return;
    const items = zones.map((z: any) => { const b = L.geoJSON(z.feature).getBounds(); return { nom: String(z.nom), b, c: b.getCenter() }; });
    const g = L.layerGroup().addTo(map);
    const upd = () => {
      g.clearLayers();
      const fs = Math.max(9, Math.min(16, 6 + (map.getZoom() - 6) * 1.1));
      items.forEach((i: any) => {
        const w = Math.abs(map.latLngToContainerPoint(i.b.getNorthEast()).x - map.latLngToContainerPoint(i.b.getSouthWest()).x);
        if (w < i.nom.length * fs * 0.5) return; // commune trop petite à l'écran : on masque le nom
        L.marker(i.c, { interactive: false, keyboard: false, icon: L.divIcon({ className: "df-lbl", html: `<span style="font-size:${fs}px">${i.nom}</span>`, iconSize: [0, 0] }) }).addTo(g);
      });
    };
    map.on("zoomend", upd);
    upd();
    return () => { map.off("zoomend", upd); map.removeLayer(g); };
  }, [zones, map]);
  return null;
};

const Focus = ({ zones }: any) => {
  const map = useMap();
  const ref = useRef(zones);
  ref.current = zones;
  const key = zones.map((z: any) => z.nom).join("|");
  useEffect(() => {
    const z = ref.current;
    if (!z.length) { map.fitBounds(MADAGASCAR, { padding: [10, 10] }); return; }
    try {
      const b = L.geoJSON({ type: "FeatureCollection", features: z.map((x: any) => x.feature) } as any).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 11 });
    } catch { /* géométrie invalide */ }
  }, [key, map]);
  return null;
};

const Resize = () => {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer().parentElement;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
};

const DefMap = ({ t, f, ap, year, years, setYear, playing, onPlay, communes, apZones, periph, regions, regionZone, apStats }: any) => {
  const [fond, setFond] = useState("topo");
  const [metric, setMetric] = useState<"cum" | "year">("cum");
  const [show, setShow] = useState<any>({ communes: true, labels: true, bubbles: true, ap: true, periph: true, regions: false });
  const scale = metric === "cum" ? SCALE_CUM : SCALE_YEAR;
  const focus = apZones.length ? [...apZones, ...periph] : regionZone ? [regionZone] : [];
  const layers: [string, string][] = [["communes", t.lCommunes], ["labels", t.lLabels], ["bubbles", t.lBubbles], ["ap", t.lAP], ["periph", t.lPeriph], ["regions", t.lRegions]];
  const tip = (z: any) =>
    `<b>${z.nom}</b><br/>${t.tipLoss} ${year} : ${f.ha(z.lossYear)}<br/>${t.tipCum} : ${f.ha(z.cum)}${z.pctCum != null ? ` (${f.pct(z.pctCum)})` : ""}<br/>${t.tipCover} : ${f.ha(z.cover)}<br/>${t.tipRemaining} : ${f.ha(z.remaining)}`;
  return (
    <Card className="df-mapcard" title={`${t.mapTitle} – ${ap} (${year})`}>
      <div className="df-tools">
        <Globe2 size={14} />
        <select className="df-sel" aria-label="Fond de carte" value={fond} onChange={(e) => setFond(e.target.value)}>
          <option value="topo">Topo</option><option value="satellite">{t.satellite}</option><option value="osm">{t.street}</option>
        </select>
        <Seg label="metric" value={metric} onChange={setMetric} options={[["cum", t.metricCum], ["year", t.metricYear]]} />
        {layers.map(([k, label]) => (
          <label key={k}><input type="checkbox" checked={show[k]} onChange={() => setShow((s: any) => ({ ...s, [k]: !s[k] }))} />{label}</label>
        ))}
      </div>

      {years.length > 1 && (
        <div className="df-time">
          <button type="button" className="df-play" onClick={onPlay} title={playing ? t.pause : t.play} aria-label={playing ? t.pause : t.play}>
            {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
          <input type="range" aria-label={t.year} min={years[0]} max={years[years.length - 1]} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <strong>{year}</strong>
        </div>
      )}

      <div className="df-map">
        <MapContainer bounds={MADAGASCAR} style={{ height: "100%", width: "100%" }} zoomControl={false} preferCanvas>
          <TileLayer key={fond} url={FONDS[fond].url} attribution={FONDS[fond].attr} />
          <ZoomControl position="bottomright" />
          <Resize />
          <Focus zones={focus} />
          {show.regions && <Layer zones={regions} cle={regionZone?.nom || "all"} style={(z: Zone) => ({ interactive: false, color: regionZone && z.nom === regionZone.nom ? "#0f766e" : "#475569", weight: regionZone && z.nom === regionZone.nom ? 2.5 : 1, fillColor: "#0f766e", fillOpacity: regionZone && z.nom === regionZone.nom ? 0.12 : 0.03 })} />}
          {show.communes && <Layer zones={communes} cle={`c${ap}${year}${metric}`} tip={tip} style={(z: any) => ({ color: "#fff", weight: 1.2, fillColor: colorOf(metric === "cum" ? z.pctCum : z.pctYear, scale), fillOpacity: 0.72 })} />}
          {show.periph && <Layer zones={periph} cle={`p${ap}`} style={() => ({ interactive: false, fill: false, color: "#b45309", weight: 1.2, dashArray: "5 4" })} />}
          {show.ap && <Layer zones={apZones} cle={`a${ap}`} style={() => ({ interactive: false, fill: false, color: "#052e16", weight: 3 })} />}
          {show.bubbles && <Bubbles zones={communes} cle={`b${ap}${year}`} t={t} f={f} year={year} />}
          {show.labels && show.communes && <Labels zones={communes} />}
        </MapContainer>

        {apStats && apStats.cover > 0 && (
          <div className="df-apbox">
            <b>{ap}</b><span>{t.apBox}</span>
            <div><span>{t.tipLoss} {year}</span><strong>{f.ha(apStats.loss)}</strong></div>
            <div><span>{t.tipCum}</span><strong>{f.ha(apStats.cum)}{apStats.pct != null ? ` (${f.pct(apStats.pct)})` : ""}</strong></div>
          </div>
        )}

        <div className="df-legend">
          {show.communes && communes.length > 0 && (
            <div className="df-lg"><strong>{metric === "cum" ? t.legendCum : t.legendYear}</strong>
              {scale.slice().reverse().map(([m, c]: any, i: number, a: any[]) => (
                <div key={c}><i style={{ background: c }} />{i === a.length - 1 ? `≥ ${m} %` : i === 0 ? `< ${a[1][0]} %` : `${m} – ${a[i + 1][0]} %`}</div>
              ))}
            </div>
          )}
          {show.bubbles && communes.length > 0 && <div className="df-lg"><div style={{ marginTop: 0 }}><i className="bub" />{t.bubbleLegend}</div></div>}
        </div>
      </div>
      {!communes.length && <p className="df-note">{t.noGeo}</p>}
    </Card>
  );
};

/* ============================ PAGE ============================ */
export default function Deforestation() {
  const { lang } = useLanguage();
  const t = TEXT[lang as string] ?? TEXT.fr;
  const f: Fmt = useMemo(() => makeFmt(LOCALES[lang as string] ?? "fr-FR"), [lang]);

  const [year, setYear] = useState<number>(2019);
  const [region, setRegion] = useState("all");
  const [ap, setAp] = useState("Ankarafantsika");
  const [cmpYear, setCmpYear] = useState<number>(2018);
  const [cmpZone, setCmpZone] = useState<"int" | "com">("int");
  const [topMode, setTopMode] = useState<"year" | "cum">("year");
  const [topN, setTopN] = useState(5);
  const [playing, setPlaying] = useState(false);

  /* ----- chargement ----- */
  const [baseDef, baseOk] = useGeo(DATA.deforestation);
  const [regionsF] = useGeo(DATA.regions);
  const [airesF] = useGeo(DATA.aires);
  const [periphF] = useGeo(DATA.peripheries);
  const [communesGeoF] = useGeo(DATA.communesGeo);

  const regionsZ = useMemo(() => toZones(regionsF, PROP.region, "Région"), [regionsF]);
  const apZ = useMemo(() => toZones(airesF, PROP.ap, ""), [airesF]);
  const periphZ = useMemo(() => toZones(periphF, PROP.periph, ""), [periphF]);
  const communesGeoZ = useMemo(() => toZones(communesGeoF, PROP.commune, ""), [communesGeoF]);

  // années disponibles, lues dans la base (avant : liste figée, et 2025 absent des graphiques)
  const years = useMemo(() => {
    const s = new Set<number>();
    baseDef.forEach((ft) => Object.keys(ft.properties || {}).forEach((k) => { if (/^\d{4}$/.test(k) && Number(k) >= 2001) s.add(Number(k)); }));
    return Array.from(s).sort((a, b) => a - b);
  }, [baseDef]);
  const minYear = years[0] ?? 2001, maxYear = years[years.length - 1] ?? 2025;
  useEffect(() => {
    if (!years.length) return;
    setYear((y) => (years.includes(y) ? y : maxYear));
    setCmpYear((y) => (years.includes(y) ? y : years[Math.max(0, years.length - 2)]));
  }, [years]);

  /* ----- aires protégées, régions ----- */
  const apNames = useMemo(
    () => Array.from(new Set(baseDef.map((ft) => String(ft.properties.AP).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")),
    [baseDef]
  );
  const apGeo = useMemo(() => Object.fromEntries(apNames.map((n) => [n, apZ.filter((z) => sameArea(z.nom, n))])) as Record<string, Zone[]>, [apNames, apZ]);
  const regionsOfAp = useMemo(
    () => Object.fromEntries(apNames.map((n) => [n, regionsZ.filter((r) => apGeo[n].some((z) => zoneIn(z, r))).map((r) => r.nom)])) as Record<string, string[]>,
    [apNames, apGeo, regionsZ]
  );
  const regionOptions = useMemo(() => Array.from(new Set(Object.values(regionsOfAp).flat())).sort((a, b) => a.localeCompare(b, "fr")), [regionsOfAp]);
  const apsIn = (r: string) => { const l = r === "all" ? apNames : apNames.filter((n) => regionsOfAp[n]?.includes(r)); return l.length ? l : apNames; };
  const apOptions = apsIn(region);
  useEffect(() => {
    if (apNames.length && !apNames.includes(ap)) setAp(apNames.includes("Ankarafantsika") ? "Ankarafantsika" : apNames[0]);
  }, [apNames]);
  const onRegion = (r: string) => { setRegion(r); const l = apsIn(r); if (!l.includes(ap)) setAp(l[0]); };

  const regionZone = useMemo(() => regionsZ.find((z) => z.nom === region) || null, [region, regionsZ]);
  const apZones = apGeo[ap] || [];
  const periphSel = useMemo(() => {
    if (!apZones.length) return [];
    const byName = periphZ.filter((p) => sameArea(p.nom, ap) || apZones.some((a) => sameArea(p.nom, a.nom)));
    return byName.length ? byName : periphZ.filter((p) => apZones.some((a) => touch(p.bbox, a.bbox)));
  }, [periphZ, apZones, ap]);

  /* ----- lecture automatique de la série d'années ----- */
  useEffect(() => {
    if (!playing) return;
    if (year >= maxYear) { setPlaying(false); return; }
    const id = setTimeout(() => setYear((y) => y + 1), 1000);
    return () => clearTimeout(id);
  }, [playing, year, maxYear]);
  const onPlay = () => { if (!playing && year >= maxYear) setYear(minYear); setPlaying((p) => !p); };

  /* ===================== CALCULS (logique d'origine conservée) ===================== */
  const P = useMemo(() => baseDef.filter((ft) => same(ft.properties.AP, ap)).map((ft) => ft.properties), [baseDef, ap]);
  const com = useMemo(() => P.filter(isCommune), [P]);
  const int = useMemo(() => P.filter(isInterieur), [P]);

  const couverture2000 = useMemo(() => sumBy(com, (p) => num(p.Couverture2000)), [com]);

  // superficie restante autour de l'AP = restant des communes − restant de l'intérieur
  const superficieRestante = useMemo(() => {
    const restant = (rows: any[]) => sumBy(rows, (p) => num(p.Couverture2000) - cumTo(p, year));
    return restant(com) - restant(int);
  }, [com, int, year]);

  const perteAnnee = useMemo(() => sumBy(int, (p) => val(p, year)), [int, year]);

  // moyenne de toutes les valeurs « commune × année » de 2001 à l'année choisie (formule d'origine)
  const moyenneAnnuelle = useMemo(() => {
    const pertes: number[] = [];
    com.forEach((p) => { for (const k in p) { const n = Number(k); if (Number.isInteger(n) && n >= 2001 && n <= year) pertes.push(num(p[k])); } });
    return pertes.length ? pertes.reduce((a, b) => a + b, 0) / pertes.length : 0;
  }, [com, year]);

  const tauxPerte = useMemo(() => {
    const init = sumBy(com, (p) => num(p.Couverture2000));
    const cumul = sumBy(com, (p) => cumTo(p, year));
    return init > 0 ? (cumul / init) * 100 : 0;
  }, [com, year]);

  const communeImpactee = useMemo(() => {
    let best: any = null, max = 0;
    com.forEach((p) => { const v = val(p, year); if (v > max) { max = v; best = p; } });
    if (!best) return { commune: "-", perte: 0, taux: 0 };
    const cover = num(best.Couverture2000);
    return { commune: best.Commune, perte: max, taux: cover > 0 ? (cumTo(best, year) / cover) * 100 : 0 };
  }, [com, year]);

  // communes les moins déforestées : perte de l'année / couverture restante avant l'année
  // (les communes sans couverture restante sont écartées : elles faussaient le classement avec un 0 %)
  const moinsDeforestees = useMemo(
    () => com
      .map((p) => {
        const restante = num(p.Couverture2000) - cumTo(p, year - 1);
        return { commune: p.Commune, taux: restante > 0 ? (val(p, year) / restante) * 100 : null as number | null };
      })
      .filter((c): c is { commune: any; taux: number } => c.taux !== null)
      .sort((a, b) => a.taux - b.taux)
      .slice(0, 3),
    [com, year]
  );

  /* ----- graphiques ----- */
  const evolution = useMemo(
    () => years.map((a) => {
      const superficie = sumBy(com, (p) => val(p, a));
      const couvertureAvant = sumBy(com, (p) => num(p.Couverture2000) - cumTo(p, a - 1));
      return { annee: a, superficie, taux: Number((couvertureAvant > 0 ? (superficie / couvertureAvant) * 100 : 0).toFixed(2)) };
    }),
    [com, years]
  );
  // le pic est calculé sur la courbe affichée (avant : sur les lignes « intérieur », donc point mal placé)
  const peak = useMemo(() => evolution.reduce((m, d) => (d.taux > m.taux ? d : m), evolution[0] ?? { annee: 0, taux: 0 }), [evolution]);

  const topAll = useMemo(() => {
    const list = com
      .map((p) => ({ commune: String(p.Commune), superficie: topMode === "year" ? val(p, year) : cumTo(p, year) }))
      .filter((d) => d.superficie > 0)
      .sort((a, b) => b.superficie - a.superficie);
    const total = list.reduce((s, d) => s + d.superficie, 0);
    let cumul = 0;
    return list.map((d) => {
      cumul += d.superficie;
      return { ...d, superficie: Number(d.superficie.toFixed(2)), pct: total > 0 ? Number(((cumul / total) * 100).toFixed(1)) : 0 };
    }).map((d) => ({ ...d, total }));
  }, [com, year, topMode]);
  const topData = topAll.slice(0, topN);
  const topShare = topAll.length && topAll[0].total > 0 ? Math.round((topData.reduce((s, d) => s + d.superficie, 0) / topAll[0].total) * 100) : 0;

  const cmpData = useMemo(
    () => (cmpZone === "int" ? int : com)
      .map((p) => ({ commune: String(p.Commune), y1: val(p, cmpYear), y2: val(p, year) }))
      .sort((a, b) => b.y1 + b.y2 - (a.y1 + a.y2))
      .slice(0, 11)
      .sort((a, b) => a.commune.localeCompare(b.commune))
      .map((d) => ({ ...d, m: Math.max(d.y1, d.y2) })),
    [com, int, cmpZone, cmpYear, year]
  );

  const decadeBlocks = useMemo(() => {
    const ranges: [number, number][] = [[2001, 2010], [2011, 2020], [2021, maxYear]];
    const periods = ranges.filter(([s]) => s <= maxYear).map(([s, e]) => ({ label: `${s} - ${Math.min(e, maxYear)}`, ys: range(s, Math.min(e, maxYear)) }));
    const sumYears = (rows: any[], ys: number[]) => sumBy(rows, (p) => ys.reduce((s, y) => s + val(p, y), 0));
    const inside = periods.map((p) => ({ periode: p.label, valeur: sumYears(int, p.ys) }));
    const outside = periods.map((p) => ({ periode: p.label, valeur: sumYears(com, p.ys) - sumYears(int, p.ys) }));
    const tot = (r: any[]) => r.reduce((s, d) => s + d.valeur, 0);
    return [
      { key: "in", title: t.inside, icon: TreePine, color: "#d97706", rows: inside, total: tot(inside), shades: ["#fde68a", "#f59e0b", "#d97706"] },
      { key: "out", title: t.outside, icon: MapPinned, color: "#2563eb", rows: outside, total: tot(outside), shades: ["#bfdbfe", "#60a5fa", "#2563eb"] },
    ];
  }, [com, int, maxYear, lang]);

  /* ----- carte : communes dessinées + indicateurs de l'année ----- */
  const communesBase = useMemo(() => {
    if (!communesGeoZ.length || !apZones.length) return [];
    const boxes = [...apZones, ...periphSel].map((z) => z.bbox);
    const box: Bbox = [Math.min(...boxes.map((b) => b[0])) - 0.5, Math.min(...boxes.map((b) => b[1])) - 0.5, Math.max(...boxes.map((b) => b[2])) + 0.5, Math.max(...boxes.map((b) => b[3])) + 0.5];
    const names = new Set(com.map((p) => norm(p.Commune)));
    const near = communesGeoZ.filter((z) => touch(z.bbox, box));
    let list = near.filter((z) => names.has(norm(z.nom)));
    if (!list.length) list = near.filter((z) => apZones.some((a) => around(z, a)));
    return list.map((z) => { const c = L.geoJSON(z.feature).getBounds().getCenter(); return { ...z, center: [c.lat, c.lng] as [number, number] }; });
  }, [communesGeoZ, apZones, periphSel, com]);

  const communesMap = useMemo(() => {
    const agg: Record<string, { cover: number; lossYear: number; cum: number; before: number }> = {};
    com.forEach((p) => {
      const a = (agg[norm(p.Commune)] ||= { cover: 0, lossYear: 0, cum: 0, before: 0 });
      a.cover += num(p.Couverture2000); a.lossYear += val(p, year); a.cum += cumTo(p, year); a.before += cumTo(p, year - 1);
    });
    return communesBase.map((z) => {
      const a = agg[norm(z.nom)] || { cover: 0, lossYear: 0, cum: 0, before: 0 };
      const restBefore = a.cover - a.before;
      return {
        ...z, cover: a.cover, lossYear: a.lossYear, cum: a.cum, remaining: a.cover - a.cum,
        pctCum: a.cover > 0 ? (a.cum / a.cover) * 100 : null,
        pctYear: restBefore > 0 ? (a.lossYear / restBefore) * 100 : null,
      };
    });
  }, [communesBase, com, year]);

  const apStats = useMemo(() => {
    const cover = sumBy(int, (p) => num(p.Couverture2000)), cum = sumBy(int, (p) => cumTo(p, year));
    return { cover, loss: perteAnnee, cum, pct: cover > 0 ? (cum / cover) * 100 : null };
  }, [int, year, perteAnnee]);

  /* ----- cartes KPI ----- */
  const kpis = [
    { title: t.kpiForestCover, color: "#2e7d32", tint: "#2e7d32", icon: <Trees size={30} color="#2e7d32" />, value: f.ha(couverture2000) },
    { title: `${t.kpiRemainingArea} ${year}`, color: "#2e7d32", tint: "#16a34a", icon: <ShieldCheck size={30} color="#16a34a" />, value: f.ha(superficieRestante) },
    { title: `${t.kpiLossInside} ${year}`, color: "#c40000", tint: "#dc2626", icon: <TreePine size={30} color="#c40000" />, value: f.ha(perteAnnee) },
    { title: t.kpiAverage, color: "#c40000", tint: "#ef4444", icon: <TrendingDown size={30} color="#c40000" />, value: `${f.ha(moyenneAnnuelle).replace(" ha", "")} ${t.annualUnit}` },
    { title: t.kpiCumulativeRate, color: "#ea580c", tint: "#ff6600", icon: <BadgePercent size={30} color="#ea580c" />, value: f.pct(tauxPerte, 2) },
    {
      title: t.kpiMostAffected, color: "#003399", tint: "#1d4ed8", icon: <MapPinned size={30} color="#1d4ed8" />,
      value: <span style={{ color: "#b40000" }}>{communeImpactee.commune}</span>,
      sub: <>{t.loss} <strong style={{ color: "#dc2626" }}>{f.pct(communeImpactee.taux, 1)}</strong> {t.forestCover}</>,
    },
  ];

  return (
    <div className="df">
      <style>{CSS}</style>

      <header className="df-head">
        <div className="df-brand">
          <div className="df-logo" aria-hidden="true">
            <Trees size={26} color="#fff" />
            <TrendingDown className="f" size={22} color="#dc2626" />
          </div>
          <div>
            <h1 className="df-h1">{t.title}</h1>
            <p className="df-sub">{ap} – {year}</p>
          </div>
        </div>
        <div className="df-filters">
          <div className="df-f">
            <label htmlFor="df-region"><Globe2 size={14} />{t.region}</label>
            <select id="df-region" value={region} onChange={(e) => onRegion(e.target.value)}>
              <option value="all">{t.allRegions}</option>
              {regionOptions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="df-f">
            <label htmlFor="df-ap"><MapPin size={14} />{t.protectedArea}</label>
            <select id="df-ap" value={ap} onChange={(e) => setAp(e.target.value)}>
              {apOptions.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="df-f" style={{ flex: "0 1 110px", minWidth: 100 }}>
            <label htmlFor="df-year"><Calendar size={14} />{t.year}</label>
            <select id="df-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {(years.length ? years : [year]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </header>

      {!baseOk ? (
        <div className="df-load">{t.loading}</div>
      ) : !baseDef.length ? (
        <div className="df-load" style={{ color: "#b91c1c" }}>{t.noBase}</div>
      ) : (
        <>
          <div className="df-rank">
            <div className="df-rank-t"><Trophy size={18} color="#d4af37" />{t.leastDeforested} {year}</div>
            <Ranking items={moinsDeforestees} f={f} />
          </div>

          <div className="df-kpis">
            {kpis.map((k, i) => <KPI key={i} {...k} />)}
          </div>

          <div className="df-body">
            <div className="df-left">
              <EvolutionChart data={evolution} year={year} peak={peak} t={t} f={f} />
              <TopChart data={topData} share={topShare} mode={topMode} setMode={setTopMode} n={topN} setN={setTopN} year={year} t={t} f={f} />
              <CompareChart data={cmpData} zone={cmpZone} setZone={setCmpZone} cmpYear={cmpYear} setCmpYear={setCmpYear} years={years} year={year} t={t} f={f} />
              <DecadeChart blocks={decadeBlocks} ap={ap} t={t} f={f} />
            </div>

            <DefMap
              t={t} f={f} ap={ap} year={year} years={years} setYear={setYear} playing={playing} onPlay={onPlay}
              communes={communesMap} apZones={apZones} periph={periphSel} regions={regionsZ} regionZone={regionZone} apStats={apStats}
            />
          </div>
        </>
      )}
    </div>
  );
}
