import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Flame, Trees, MapPinned, MapPin, Calendar, Trophy, Medal,
  TrendingUp, TrendingDown, BarChart3, Globe2, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList, Cell,
} from "recharts";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../context/LanguageContext";

/* ============================ TRADUCTIONS ============================ */
const txt: any = {
  fr: {
    title: "Suivi et analyse des feux", year: "Année", ap: "Aire protégée", region: "Région",
    allRegions: "Toutes les régions", loading: "Chargement des données…",
    leastBurnedCommunes: "Communes les moins brûlées par rapport à leur superficie",
    totalBurnedCommunes: "Total des superficies brûlées dans les Communes riveraines",
    burnedPeripheral: "Superficies brûlées en périphérie de l'AP (sur un rayon de 5 km)",
    burnedInside: "Superficies brûlées à l'intérieur de l'Aire Protégée",
    burnedLastMonth: "Superficies brûlées aux Communes riveraines du mois dernier",
    annualEvolution: "Évolution annuelle par rapport à l'année précédente",
    mostAffected: "Commune la plus touchée", with: "avec", totalBurnedSurface: "de surface totale brûlée",
    monthlyEvolution: "Évolution mensuelle des superficies brûlées par rapport à l'année précédente",
    historicalDifference: "Écart des superficies brûlées par rapport à la moyenne historique 2020-2024",
    peripheral5km: "Périphérie 5 km", insidePark: "Intérieur du parc",
    historicalAverage: "Moyenne 2020 - 2024", highPressureYears: "Années à forte pression",
    fireImpact: "Impact des feux aux 11 Communes les plus touchées autour de",
    insideAP: "Intérieur AP", total: "Total",
    peripheralVariation: "Variation de la superficie brûlée en périphérie de 5 km", reference: "réf. 2020–2024",
    decreased: "La superficie brûlée a diminué de", increased: "La superficie brûlée a augmenté de",
    unchanged: "La superficie brûlée est identique à la moyenne de référence.",
    mapTitle: "Carte interactive des zones brûlées", street: "Plan", satellite: "Satellite",
    lCommunes: "Communes", lZones: "Zones brûlées", lAP: "Limite de l'AP",
    legend: "Part de la commune brûlée", noZones: "Aucune zone brûlée géolocalisée pour cette sélection : les communes sont affichées.",
    noData: "Aucune donnée géographique pour cette aire protégée.",
    topN: "Top", ofTotal: "du cumul brûlé de toutes les communes", lFires: "Feux actifs", lRegions: "Régions",
    fireAge: "Ancienneté des feux", fireDetected: "Détection satellite", fireUnit: "feux", fireErr: "Feux actifs indisponibles",
    refresh: "Actualiser", noFire: "Aucun feu actif détecté dans cette zone.", noBase: "Base de feux introuvable : vérifiez les chemins dans DATA.",
    months: { Jan: "Jan", Feb: "Fév", Mar: "Mar", Apr: "Avr", May: "Mai", Jun: "Juin", Jul: "Juil", Aug: "Août", Sep: "Sep", Oct: "Oct", Nov: "Nov", Dec: "Déc" },
  },
  mg: {
    title: "Fanaraha-maso sy fanadihadiana ny doro tanety", year: "Taona", ap: "Faritra arovana", region: "Faritra",
    allRegions: "Faritra rehetra", loading: "Mitondra ny angona…",
    leastBurnedCommunes: "Kaominina vitsy indrindra tratran'ny doro raha oharina amin'ny velarantaniny",
    totalBurnedCommunes: "Fitambaran'ny velaran-tany may ao amin'ireo Kaominina manodidina",
    burnedPeripheral: "Velaran-tany may manodidina ny faritra arovana (5 km)",
    burnedInside: "Velaran-tany may ao anatin'ny Faritra Arovana",
    burnedLastMonth: "Velaran-tany may tao amin'ireo Kaominina manodidina tamin'ny volana lasa",
    annualEvolution: "Fiovan'ny velaran-tany isan-taona raha oharina amin'ny taona lasa",
    mostAffected: "Kaominina tena voakasiky ny doro", with: "miaraka amin'ny", totalBurnedSurface: "amin'ny fitambaran'ny velaran-tany may",
    monthlyEvolution: "Fiovan'ny velaran-tany may isam-bolana raha oharina amin'ny taona lasa",
    historicalDifference: "Elanelan'ny velaran-tany may raha oharina amin'ny salan'isa ara-tantara 2020-2024",
    peripheral5km: "Manodidina 5 km", insidePark: "Ao anatin'ny valan-javaboary",
    historicalAverage: "Salan'isa 2020 - 2024", highPressureYears: "Taona nahitana tsindry avo",
    fireImpact: "Fiantraikan'ny doro amin'ireo Kaominina 11 tena voakasika manodidina an'i",
    insideAP: "Ao anatin'ny Faritra Arovana", total: "Fitambarany",
    peripheralVariation: "Fiovan'ny velaran-tany may manodidina 5 km", reference: "fanondroana 2020–2024",
    decreased: "Nihena", increased: "Nitombo", unchanged: "Mitovy amin'ny salan'isa fanondroana ny velaran-tany may.",
    mapTitle: "Sarintany mifandray amin'ny faritra may", street: "Sarintany", satellite: "Zanabolana",
    lCommunes: "Kaominina", lZones: "Faritra may", lAP: "Sisin'ny AP",
    legend: "Ampahany may amin'ny kaominina", noZones: "Tsy misy faritra may voasoratra amin'ny sarintany ho an'ity safidy ity: aseho ny kaominina.",
    noData: "Tsy misy angona ara-jeografika ho an'ity faritra arovana ity.",
    topN: "Top", ofTotal: "amin'ny fitambaran'ny velaran-tany may amin'ny kaominina rehetra", lFires: "Doro mavitrika", lRegions: "Faritra",
    fireAge: "Faha-taonan'ny doro", fireDetected: "Fanamarihana avy amin'ny zanabolana", fireUnit: "doro", fireErr: "Tsy azo ny doro mavitrika",
    refresh: "Havaozina", noFire: "Tsy misy doro mavitrika hita amin'ity faritra ity.", noBase: "Tsy hita ny angona doro: jereo ny lalana ao amin'ny DATA.",
    months: { Jan: "Jan", Feb: "Feb", Mar: "Mar", Apr: "Apr", May: "Mey", Jun: "Jon", Jul: "Jol", Aug: "Aog", Sep: "Sep", Oct: "Okt", Nov: "Nov", Dec: "Des" },
  },
  en: {
    title: "Fire Monitoring and Analysis", year: "Year", ap: "Protected Area", region: "Region",
    allRegions: "All regions", loading: "Loading data…",
    leastBurnedCommunes: "Communes with the lowest burned area relative to their size",
    totalBurnedCommunes: "Total burned area in surrounding communes",
    burnedPeripheral: "Burned area around the protected area (within 5 km)",
    burnedInside: "Burned area inside the Protected Area",
    burnedLastMonth: "Burned area in surrounding communes during the previous month",
    annualEvolution: "Annual change compared with the previous year",
    mostAffected: "Most affected commune", with: "with", totalBurnedSurface: "of the total burned area",
    monthlyEvolution: "Monthly evolution of burned areas compared with the previous year",
    historicalDifference: "Difference in burned area compared with the historical average 2020-2024",
    peripheral5km: "5 km peripheral area", insidePark: "Inside the park",
    historicalAverage: "Average 2020 - 2024", highPressureYears: "High-pressure years",
    fireImpact: "Fire impact on the 11 most affected communes around",
    insideAP: "Inside PA", total: "Total",
    peripheralVariation: "Variation in burned area within the 5 km peripheral area", reference: "ref. 2020–2024",
    decreased: "The burned area decreased by", increased: "The burned area increased by",
    unchanged: "The burned area is identical to the reference average.",
    mapTitle: "Interactive map of burned areas", street: "Streets", satellite: "Satellite",
    lCommunes: "Communes", lZones: "Burned areas", lAP: "PA boundary",
    legend: "Share of commune burned", noZones: "No georeferenced burned area for this selection: communes are displayed.",
    noData: "No geographic data for this protected area.",
    topN: "Top", ofTotal: "of the burned total of all communes", lFires: "Active fires", lRegions: "Regions",
    fireAge: "Fire age", fireDetected: "Satellite detection", fireUnit: "fires", fireErr: "Active fires unavailable",
    refresh: "Refresh", noFire: "No active fire detected in this area.", noBase: "Fire database not found: check the paths in DATA.",
    months: { Jan: "Jan", Feb: "Feb", Mar: "Mar", Apr: "Apr", May: "May", Jun: "Jun", Jul: "Jul", Aug: "Aug", Sep: "Sep", Oct: "Oct", Nov: "Nov", Dec: "Dec" },
  },
  de: {
    title: "Überwachung und Analyse von Bränden", year: "Jahr", ap: "Schutzgebiet", region: "Region",
    allRegions: "Alle Regionen", loading: "Daten werden geladen…",
    leastBurnedCommunes: "Gemeinden mit der geringsten verbrannten Fläche im Verhältnis zu ihrer Fläche",
    totalBurnedCommunes: "Gesamte verbrannte Fläche in den angrenzenden Gemeinden",
    burnedPeripheral: "Verbrannte Fläche im Umfeld des Schutzgebiets (innerhalb von 5 km)",
    burnedInside: "Verbrannte Fläche innerhalb des Schutzgebiets",
    burnedLastMonth: "Verbrannte Fläche in den angrenzenden Gemeinden im letzten Monat",
    annualEvolution: "Jährliche Entwicklung gegenüber dem Vorjahr",
    mostAffected: "Am stärksten betroffene Gemeinde", with: "mit", totalBurnedSurface: "der gesamten verbrannten Fläche",
    monthlyEvolution: "Monatliche Entwicklung der verbrannten Flächen gegenüber dem Vorjahr",
    historicalDifference: "Abweichung der verbrannten Flächen vom historischen Durchschnitt 2020-2024",
    peripheral5km: "5-km-Randgebiet", insidePark: "Innerhalb des Parks",
    historicalAverage: "Durchschnitt 2020 - 2024", highPressureYears: "Jahre mit hohem Druck",
    fireImpact: "Auswirkungen der Brände auf die 11 am stärksten betroffenen Gemeinden rund um",
    insideAP: "Innerhalb des Schutzgebiets", total: "Gesamt",
    peripheralVariation: "Veränderung der verbrannten Fläche im 5-km-Randgebiet", reference: "Bez. 2020–2024",
    decreased: "Die verbrannte Fläche ist gesunken um", increased: "Die verbrannte Fläche ist gestiegen um",
    unchanged: "Die verbrannte Fläche entspricht dem Referenzdurchschnitt.",
    mapTitle: "Interaktive Karte der verbrannten Flächen", street: "Straßen", satellite: "Satellit",
    lCommunes: "Gemeinden", lZones: "Verbrannte Flächen", lAP: "Grenze des Schutzgebiets",
    legend: "Verbrannter Anteil der Gemeinde", noZones: "Keine georeferenzierte Brandfläche für diese Auswahl: Gemeinden werden angezeigt.",
    noData: "Keine Geodaten für dieses Schutzgebiet.",
    topN: "Top", ofTotal: "der verbrannten Gesamtfläche aller Gemeinden", lFires: "Aktive Brände", lRegions: "Regionen",
    fireAge: "Alter der Brände", fireDetected: "Satellitenerkennung", fireUnit: "Brände", fireErr: "Aktive Brände nicht verfügbar",
    refresh: "Aktualisieren", noFire: "Kein aktiver Brand in diesem Gebiet erkannt.", noBase: "Brand-Datenbank nicht gefunden: Pfade in DATA prüfen.",
    months: { Jan: "Jan", Feb: "Feb", Mar: "Mär", Apr: "Apr", May: "Mai", Jun: "Jun", Jul: "Jul", Aug: "Aug", Sep: "Sep", Oct: "Okt", Nov: "Nov", Dec: "Dez" },
  },
};

/* ============================ CHEMINS DES DONNÉES (à adapter) ============================ */
const DATA = {
  feux: "/data/Bases_Feux.geojson", // base des superficies brûlées (AP, Année, Source, Commune, Total, mois…)
  communesSup: "/data/communes_superficie.geojson", // AP, Commune, Superficie
  regions: "/data/madagascar_24_region.geojson",
  aires: "/data/aire_protegee_paddi.geojson",
  peripheries: "/data/peripherie_5km_paddi.geojson",
  communesGeo: "/data/madagascar_communes.json",
  zonesBrulees: "/data/zones_brulees.geojson", // optionnel : polygones des zones brûlées (AP, Année)
  firms: "/api/firms", // points de feux actifs NASA FIRMS
};
// Champ « nom » dans vos fichiers géographiques (identiques à Pression.tsx)
const PROP = { region: "nom_reg", ap: "nom_ap", periph: "nom_ap", commune: "NAME_4" };

const SUPERFICIE_2018: Record<string, number> = {
  Analamerana: 2809.96, Andohahela: 5584.04, Ankarafantsika: 18496.4, Ankarana: 5812.0,
  Marolambo: 7120.84, "Befotaka-Midongy": 19312.32, "Montagne d'Ambre": 4092.2,
};
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MOIS_KEYS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const MADAGASCAR: L.LatLngBoundsExpression = [[-26, 42.3], [-11.5, 50.9]];
const FONDS: Record<string, { url: string; attr: string }> = {
  topo: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
};
const SCALE: [number, string][] = [[10, "#991b1b"], [5, "#ef4444"], [2, "#f97316"], [0.5, "#facc15"], [0, "#dcfce7"]];
const colorOf = (pct: number | null) => (pct == null ? "#cbd5e1" : (SCALE.find(([m]) => pct >= m) || SCALE[4])[1]);
const ageColor = (h: number) => (h <= 24 ? "rgb(200,15,15)" : h <= 48 ? "#f97316" : "#facc15");

/* ============================ OUTILS ============================ */
const num = (v: any) => Number(String(v ?? 0).replace(",", ".")) || 0;
const same = (a: any, b: any) => String(a).trim() === String(b).trim();
const src = (p: any) => String(p.Source).trim().toLowerCase();
const fmtHa = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ha";
const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));
const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sameArea = (a: unknown, b: unknown) => {
  const x = norm(a), y = norm(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
};

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

/* ---- Géométrie (mêmes méthodes que Pression.tsx) ---- */
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

/* ---- Feux NASA FIRMS ---- */
const confLevel = (c: any): "l" | "n" | "h" => {
  if (c == null || c === "") return "n";
  if (typeof c === "string" && Number.isNaN(Number(c))) { const v = c.toLowerCase(); return v[0] === "h" ? "h" : v[0] === "l" ? "l" : "n"; }
  return Number(c) >= 80 ? "h" : Number(c) >= 30 ? "n" : "l";
};
const parseFires = (features: any[]) => {
  const out: any[] = [];
  for (const f of features) {
    const p = f?.properties || {}, c = f?.geometry?.coordinates;
    if (!c || !p.acq_date || p.acq_time == null) continue;
    const h = String(p.acq_time).padStart(4, "0");
    const t = new Date(`${p.acq_date}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    out.push({ lon: c[0], lat: c[1], t, date: p.acq_date, heure: `${h.slice(0, 2)}:${h.slice(2, 4)}`, conf: confLevel(p.confidence), frp: Number.isFinite(Number(p.frp)) ? Number(p.frp) : null, sat: p.satellite ?? "" });
  }
  return out;
};

/* ============================ STYLES RESPONSIVES ============================ */
const CSS = `
.fx{padding:clamp(8px,1.6vw,16px);background:#eef3f8;min-height:100vh;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937}
.fx *{box-sizing:border-box}
.fx-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;padding:12px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.fx-brand{display:flex;align-items:center;gap:12px;min-width:0}
.fx-logo{flex:none;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0b4ea2,#1d78d6);position:relative}
.fx-logo svg.f{position:absolute;right:-5px;bottom:-5px;background:#fff;border-radius:50%;padding:3px}
.fx-h1{margin:0;color:#0b4ea2;font-size:clamp(17px,2.4vw,24px);font-weight:700;line-height:1.2}
.fx-sub{margin:2px 0 0;font-size:12px;color:#6b7280}
.fx-filters{display:flex;flex-wrap:wrap;gap:10px}
.fx-f{display:flex;flex-direction:column;gap:4px;min-width:130px;flex:1 1 130px}
.fx-f label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#374151}
.fx select,.fx-sel{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #d1d5db;background:#f9fafb;font-weight:600;font-size:12px;cursor:pointer}
.fx select:focus-visible,.fx input:focus-visible,.fx button:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.fx-rank{display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;margin-bottom:10px;padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;font-size:12px}
.fx-rank-t{display:flex;align-items:center;gap:8px;font-weight:700;color:#003399;font-size:13px;flex:1 1 280px}
.fx-rank-i{display:flex;align-items:center;gap:6px}
.fx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:10px;margin-bottom:10px}
.fx-kpi{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-left:4px solid var(--c);border-radius:12px;padding:12px 14px;min-height:96px;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.fx-badge{flex:none;width:56px;height:56px;border-radius:15px;display:grid;place-items:center;position:relative;background:var(--bg)}
.fx-badge .fl{position:absolute;right:-6px;bottom:-6px;background:#fff;border-radius:50%;padding:2px;box-shadow:0 0 0 1px #e5e7eb}
.fx-kpi-txt{min-width:0;display:flex;flex-direction:column;gap:4px}
.fx-kpi-t{font-size:11.5px;font-weight:700;line-height:1.25;color:var(--c)}
.fx-kpi-v{font-size:clamp(17px,1.5vw,21px);font-weight:800;color:var(--c);display:flex;align-items:center;gap:6px;line-height:1.1;word-break:break-word}
.fx-kpi-s{font-size:11px;font-weight:600;color:#475569;line-height:1.3}
.fx-body{display:grid;grid-template-columns:1fr;gap:10px}
.fx-left{display:grid;grid-template-columns:1fr;gap:10px;align-content:start;min-width:0}
@media(min-width:700px){.fx-left{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:1100px){.fx-body{grid-template-columns:minmax(0,58fr) minmax(0,42fr)}}
@media(max-width:1099px){.fx-mapcard{order:-1;height:64vh;min-height:380px}}
.fx-card{background:#fff;border:1px solid #d9d9d9;border-radius:10px;padding:10px;min-width:0;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.fx-ct{margin:0 0 8px;text-align:center;font-size:12px;font-weight:700;font-style:italic;color:#d32f2f;line-height:1.3}
.fx-chart{height:270px}
.fx-note{margin:6px 0 0;font-size:11px;color:#64748b;text-align:center}
.fx-tip{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.fx-tip b{display:block;margin-bottom:4px;color:#0f172a}
.fx-tip div{display:flex;justify-content:space-between;gap:14px}
.fx-bar-tools{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 10px;margin-bottom:4px}
.fx-lg-chips{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:#334155}
.fx-lg-chips span{display:inline-flex;align-items:center;gap:5px}
.fx-lg-chips i{width:11px;height:11px;border-radius:3px;display:inline-block}
.fx-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff}
.fx-seg button{padding:5px 10px;border:0;background:transparent;color:#475569;font-size:12px;font-weight:600;cursor:pointer}
.fx-seg button+button{border-left:1px solid #cbd5e1}
.fx-seg button.on{background:#0b4ea2;color:#fff}
.fx-mapcard{min-height:520px}
.fx-tools{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-bottom:8px;font-size:12px;font-weight:600;color:#374151}
.fx-tools label{display:flex;align-items:center;gap:5px;cursor:pointer}
.fx-tools .fx-sel{width:auto}
.fx-ico{display:grid;place-items:center;width:30px;height:30px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;cursor:pointer}
.fx-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:700}
.fx-map{position:relative;flex:1;min-height:340px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;isolation:isolate}
.fx-map .leaflet-container{position:absolute;inset:0;font-family:inherit;background:#e5e7eb}
.fx-legend{position:absolute;left:8px;bottom:8px;z-index:1000;display:flex;flex-direction:column;gap:6px;max-width:60%}
.fx-lg{background:rgba(255,255,255,.94);padding:6px 9px;border-radius:8px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.fx-lg div{display:flex;align-items:center;gap:6px;margin-top:2px}
.fx-lg i{width:13px;height:10px;display:inline-block;border:1px solid #9ca3af}
.fx-lg i.dot{width:10px;height:10px;border-radius:50%;border:1px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.35)}
.fx-load{padding:30px;text-align:center;color:#0b4ea2;font-weight:600}
.fx .leaflet-tooltip{font-size:12px;font-weight:600}
@media(max-width:560px){.fx-lg{font-size:10px;padding:4px 6px}.fx-legend{max-width:75%}}
@media(prefers-reduced-motion:reduce){.fx *{transition:none!important}}
`;

/* ============================ COMPOSANTS ============================ */
const Card = ({ title, className = "", children }: any) => (
  <section className={`fx-card ${className}`}>
    <h3 className="fx-ct">{title}</h3>
    {children}
  </section>
);

const KPI = ({ title, color, tint, icon, flame, value, sub }: any) => (
  <div className="fx-kpi" style={{ "--c": color, "--bg": `${tint}1f` } as any}>
    <div className="fx-badge">
      {icon}
      {flame && <Flame className="fl" size={18} color="#ff6b35" />}
    </div>
    <div className="fx-kpi-txt">
      <div className="fx-kpi-t">{title}</div>
      <div className="fx-kpi-v">{value}</div>
      {sub && <div className="fx-kpi-s">{sub}</div>}
    </div>
  </div>
);

const Ranking = ({ stats }: any) => {
  const top = [...stats].sort((a: any, b: any) => a.pct - b.pct).slice(0, 3);
  return (
    <>
      {top.map((c: any, i: number) => (
        <div className="fx-rank-i" key={c.commune}>
          <Medal color={i === 0 ? "gold" : i === 1 ? "silver" : "#cd7f32"} />
          <span>{c.commune}</span>
          <span style={{ color: "#16a34a" }}>({c.pct.toFixed(2)} %)</span>
        </div>
      ))}
    </>
  );
};

/* ---- Courbes en « collines » (aires dégradées), mêmes couleurs ---- */
const MonthTip = ({ active, payload, label, year }: any) => {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p: any) => p.dataKey === `y${year}`)?.value ?? 0;
  const prev = payload.find((p: any) => p.dataKey === `y${year - 1}`)?.value ?? 0;
  const d = cur - prev, up = d > 0;
  const pct = prev ? ` (${up ? "+" : ""}${((d / prev) * 100).toFixed(0)} %)` : "";
  return (
    <div className="fx-tip">
      <b>{label}</b>
      <div><span style={{ color: "#2563eb" }}>{year - 1}</span><strong>{fmtHa(prev)}</strong></div>
      <div><span style={{ color: "#dc2626" }}>{year}</span><strong>{fmtHa(cur)}</strong></div>
      <div style={{ color: d === 0 ? "#64748b" : up ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
        <span>{d === 0 ? "—" : up ? "▲" : "▼"}</span><span>{fmtHa(Math.abs(d))}{pct}</span>
      </div>
    </div>
  );
};

const MonthlyChart = ({ data, year, t }: any) => (
  <Card title={t.monthlyEvolution}>
    <div className="fx-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 12, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gCur" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.38} /><stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={compact} width={42} />
          <Tooltip content={<MonthTip year={year} />} cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} />
          <Legend verticalAlign="top" align="right" iconType="circle" height={28} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
          <Area type="monotone" dataKey={`y${year - 1}`} name={`${year - 1}`} stroke="#2563eb" strokeWidth={2} fill="url(#gPrev)" dot={false} activeDot={{ r: 4 }} />
          <Area type="monotone" dataKey={`y${year}`} name={`${year}`} stroke="#dc2626" strokeWidth={2.5} fill="url(#gCur)" dot={false} activeDot={{ r: 4.5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

const HistoricalChart = ({ zones, year, t }: any) => (
  <Card title={t.historicalDifference}>
    {zones.map((z: any) => {
      const rows = [
        { nom: String(year), val: z.annee, type: "annee" },
        { nom: t.historicalAverage, val: z.moyenne, type: "moyenne" },
        { nom: t.highPressureYears, val: z.difficile, type: "difficile" },
      ];
      return (
        <div key={z.zone} style={{ marginBottom: 6 }}>
          <div style={{ color: "#1565c0", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{z.zone}</div>
          <ResponsiveContainer width="100%" height={112}>
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 15, left: 5, bottom: 2 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nom" width={95} tick={{ fontSize: 11, fill: "#333" }} />
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <Bar dataKey="val" barSize={25} radius={[0, 3, 3, 0]}>
                {["#9ca3af", "#EAB308", "#d32f2f"].map((c, i) => <Cell key={i} fill={c} />)}
                <LabelList
                  dataKey="val"
                  content={(p: any) => {
                    const { x, y, width, height, value, index } = p;
                    const el = rows[index];
                    const text = `${Math.round(value).toLocaleString("fr-FR")} ha`;
                    const inside = width > text.length * 6 + 50;
                    let vText = "", vColor = "#2563eb";
                    if (el.type === "annee") {
                      const v = z.moyenne !== 0 ? ((el.val - z.moyenne) / z.moyenne) * 100 : 0;
                      vText = ` (${v > 0 ? "+" : ""}${v.toFixed(1)}%)`;
                      vColor = v > 0 ? "#ef4444" : v < 0 ? "#2563eb" : "#22c55e";
                    }
                    return (
                      <g>
                        <text x={inside ? x + width - 8 : x + width + 8} y={y + height / 2} dy={4} textAnchor={inside ? "end" : "start"} fill={inside ? "#fff" : "#000"} fontSize={11} fontWeight={600}>{text}</text>
                        {vText && <text x={inside ? x + width - text.length * 6 - 4 : x + width + 8 + text.length * 6} y={y + height / 2} dy={4} textAnchor={inside ? "end" : "start"} fill={vColor} fontSize={11} fontWeight={700}>{vText}</text>}
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    })}
  </Card>
);

/* ---- Barres « Impact » : légende en haut, Top 5 / Top 11, infobulle ---- */
const RankTick = ({ x, y, payload, index }: any) => {
  const nom = String(payload.value);
  const top5 = index < 5;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="end" transform="rotate(-30)" fill={top5 ? "#b91c1c" : "#475569"} fontSize={11} fontWeight={top5 ? 700 : 400}>
        {top5 ? `${index + 1}. ` : ""}{nom.length > 9 ? nom.substring(0, 9) + "…" : nom}
      </text>
    </g>
  );
};

const CustomTotalBar = ({ x, y, width, height, payload }: any) => {
  const total = payload.total || 1;
  const hInt = (payload.interieur / total) * height, hPer = (payload.peripherie / total) * height;
  const w = width * 0.45, gap = 2, x0 = x + (width - (w * 2 + gap)) / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#d9edf7" rx={4} />
      <rect x={x0} y={y + height - hInt} width={w} height={hInt} fill="#ff0000" />
      <rect x={x0 + w + gap} y={y + height - hPer} width={w} height={hPer} fill="#ffff00" />
    </g>
  );
};

const ImpactTip = ({ active, payload, t }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="fx-tip">
      <b>{d.commune}</b>
      <div><span>{t.total}</span><strong>{fmtHa(d.total)}</strong></div>
      <div><span>{t.insideAP}</span><strong>{fmtHa(d.interieur)}</strong></div>
      <div><span>{t.peripheral5km}</span><strong>{fmtHa(d.peripherie)}</strong></div>
    </div>
  );
};

const ImpactChart = ({ all, ap, t, n, setN }: any) => {
  const data = all.slice(0, n);
  const sum = (a: any[]) => a.reduce((s, d) => s + d.total, 0);
  const share = sum(all) > 0 ? Math.round((sum(data) / sum(all)) * 100) : 0;
  const maxY = Math.max(...data.map((d: any) => d.total), 0);
  const step = maxY > 5000 ? 1000 : 500;
  const top = Math.max(step, Math.ceil(maxY / step) * step);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const chip = (bg: string, label: string, border = "none") => <span><i style={{ background: bg, border }} />{label}</span>;
  return (
    <Card title={`${t.fireImpact.replace("11", String(n))} ${ap}`}>
      <div className="fx-bar-tools">
        <div className="fx-lg-chips">
          {chip("#ff0000", t.insideAP)}{chip("#ffff00", t.peripheral5km, "1px solid #999")}{chip("#d9edf7", t.total)}
        </div>
        <div className="fx-seg" role="group" aria-label="Top">
          {[5, 11].map((k) => <button key={k} className={n === k ? "on" : ""} onClick={() => setN(k)}>{t.topN} {k}</button>)}
        </div>
      </div>
      <div className="fx-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: -4, bottom: 30 }} barCategoryGap="22%">
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="commune" interval={0} tick={<RankTick />} axisLine={{ stroke: "#0066cc", strokeWidth: 1.5 }} tickLine={false} />
            <YAxis domain={[0, top]} ticks={ticks} tickFormatter={compact} width={40} tick={{ fill: "#555", fontSize: 11 }} axisLine={{ stroke: "#0066cc", strokeWidth: 1.5 }} tickLine={false} />
            <Tooltip content={<ImpactTip t={t} />} cursor={{ fill: "rgba(11,78,162,.06)" }} />
            <Bar dataKey="total" name="Total" shape={<CustomTotalBar />} barSize={22}>
              <LabelList dataKey="total" position="top" fill="#0099ff" fontSize={10} formatter={(v: number) => Math.round(v).toLocaleString("fr-FR")} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="fx-note">{t.topN} {n} : <strong>{share} %</strong> {t.ofTotal}</p>
    </Card>
  );
};

const Gauge = ({ variation, t }: any) => {
  const cx = 250, cy = 120, R = 80;
  const polar = (a: number, r: number) => ({ x: cx + r * Math.cos((a * Math.PI) / 180), y: cy + r * Math.sin((a * Math.PI) / 180) });
  const g = Math.max(-100, Math.min(100, variation < 0 ? Math.abs(variation) : -variation));
  const angle = g >= 0 ? 180 + (g / 100) * 180 : 180 - (Math.abs(g) / 100) * 180;
  const arc = (s: number, e: number, c: string) => {
    const p1 = polar(s, R), p2 = polar(e, R);
    return <path key={`${s}${c}`} d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`} fill="none" stroke={c} strokeWidth="40" />;
  };
  const tick = (a: number, len: number) => {
    const p1 = polar(a, R + 20), p2 = polar(a, R + 20 - len);
    return <line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#555" strokeWidth="2" />;
  };
  const color = variation < 0 ? "#2e7d32" : variation > 0 ? "#d32f2f" : "#1565c0";
  return (
    <Card title={<>{t.peripheralVariation}<br />({t.reference})</>}>
      <svg width="100%" viewBox="0 0 500 260" style={{ maxHeight: 270 }}>
        {["#dcfce7", "#86efac", "#4ade80", "#16a34a"].map((c, i) => arc(-180 + i * 45, -180 + (i + 1) * 45, c))}
        {["#991b1b", "#ef4444", "#f87171", "#fecaca"].map((c, i) => arc(i * 45, (i + 1) * 45, c))}
        <text x="135" y="125" fontSize="16" fontWeight="600">0</text>
        <text x="240" y="15" fontSize="15" fontWeight="600">50</text>
        <text x="350" y="120" fontSize="16" fontWeight="600">100</text>
        <text x="240" y="240" fontSize="15" fontWeight="600">-50</text>
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform .8s ease-out" }}>
          <polygon points={`${cx},${cy - 6} ${cx + R - 2},${cy} ${cx},${cy + 6}`} fill="#111" />
        </g>
        <circle cx={cx} cy={cy} r="10" fill="#111" />
        <circle cx={cx} cy={cy} r="4" fill="#fff" />
        {Array.from({ length: 21 }).map((_, i) => (
          <React.Fragment key={i}>{tick(-180 + i * 9, i % 5 === 0 ? 18 : 10)}{tick(i * 9, i % 5 === 0 ? 18 : 10)}</React.Fragment>
        ))}
      </svg>
      <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color }}>
        {variation < 0 ? `${t.decreased} ${Math.abs(variation)} %.` : variation > 0 ? `${t.increased} ${variation} %.` : t.unchanged}
      </div>
    </Card>
  );
};

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
      const html = tp.current ? tp.current(z) : z.nom;
      if (html) l.bindTooltip(html, { sticky: true });
      l.addTo(g);
    });
    g.addTo(map);
    return () => { map.removeLayer(g); };
  }, [zones, cle, map]);
  return null;
};

const Fires = ({ fires, t }: any) => {
  const map = useMap();
  useEffect(() => {
    const radius = (z: number) => Math.max(2.5, Math.min(9, 2 + (z - 5) * 0.75));
    const renderer = L.canvas({ padding: 0.5 });
    const g = L.featureGroup();
    fires.forEach((f: any) => {
      L.circleMarker([f.lat, f.lon], { radius: radius(map.getZoom()), fillColor: ageColor(f.age), color: "#fff", weight: 0.6, opacity: 0.9, fillOpacity: 0.92, renderer })
        .bindPopup(`<div style="font:13px/1.5 system-ui"><strong>${t.fireDetected}</strong><br/>${new Date(f.t).toLocaleDateString("fr-FR")} ${f.heure} UTC${f.frp != null ? `<br/>${f.frp} MW` : ""}${f.sat ? `<br/>${f.sat}` : ""}</div>`)
        .addTo(g);
    });
    g.addTo(map);
    const upd = () => g.eachLayer((l: any) => l instanceof L.CircleMarker && l.setRadius(radius(map.getZoom())));
    map.on("zoomend", upd);
    return () => { map.off("zoomend", upd); map.removeLayer(g); };
  }, [fires, map]);
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

const FireMap = ({ t, ap, year, communes, zones, apZones, periph, regions, regionZone, fires, hours, setHours, onRefresh, err }: any) => {
  const [fond, setFond] = useState("topo");
  const [show, setShow] = useState<any>({ fires: true, communes: true, ap: true, periph: true, zones: true, regions: false });
  const focus = apZones.length ? [...apZones, ...periph] : regionZone ? [regionZone] : [];
  const layers: [string, string][] = [["fires", t.lFires], ["communes", t.lCommunes], ["ap", t.lAP], ["periph", t.peripheral5km], ["zones", t.lZones], ["regions", t.lRegions]];
  const tipCommune = (z: any) => `<b>${z.nom}</b><br/>${fmtHa(z.burned)}${z.pct != null ? ` (${z.pct.toFixed(2)} %)` : ""}`;
  return (
    <Card className="fx-mapcard" title={`${t.mapTitle} – ${ap} (${year})`}>
      <div className="fx-tools">
        <Globe2 size={14} />
        <select className="fx-sel" aria-label="Fond de carte" value={fond} onChange={(e) => setFond(e.target.value)}>
          <option value="topo">Topo</option><option value="satellite">{t.satellite}</option><option value="osm">{t.street}</option>
        </select>
        <div className="fx-seg" role="group" aria-label="Période">
          {[24, 48, 72].map((h) => <button key={h} className={hours === h ? "on" : ""} onClick={() => setHours(h)}>{h} h</button>)}
        </div>
        <button className="fx-ico" onClick={onRefresh} title={t.refresh} aria-label={t.refresh}><RefreshCw size={14} /></button>
        <span className="fx-chip"><Flame size={13} />{fires.length} {t.fireUnit}</span>
        {layers.map(([k, label]) => (
          <label key={k}><input type="checkbox" checked={show[k]} onChange={() => setShow((s: any) => ({ ...s, [k]: !s[k] }))} />{label}</label>
        ))}
      </div>
      <div className="fx-map">
        <MapContainer bounds={MADAGASCAR} style={{ height: "100%", width: "100%" }} zoomControl={false} preferCanvas>
          <TileLayer key={fond} url={FONDS[fond].url} attribution={FONDS[fond].attr} />
          <ZoomControl position="bottomright" />
          <Resize />
          <Focus zones={focus} />
          {show.regions && <Layer zones={regions} cle={regionZone?.nom || "all"} style={(z: Zone) => ({ color: regionZone && z.nom === regionZone.nom ? "#0f766e" : "#475569", weight: regionZone && z.nom === regionZone.nom ? 2.5 : 1, fillColor: "#0f766e", fillOpacity: regionZone && z.nom === regionZone.nom ? 0.12 : 0.03 })} />}
          {show.communes && <Layer zones={communes} cle={`c${ap}${year}`} tip={tipCommune} style={(z: any) => ({ color: "#fff", weight: 1.2, fillColor: colorOf(z.pct), fillOpacity: 0.6 })} />}
          {show.periph && <Layer zones={periph} cle={`p${ap}`} style={() => ({ color: "#b45309", weight: 1, dashArray: "4 4", fillColor: "#d97706", fillOpacity: 0.07 })} />}
          {show.zones && <Layer zones={zones} cle={`z${ap}${year}`} style={() => ({ color: "#b91c1c", weight: 1, fillColor: "#ff0000", fillOpacity: 0.7 })} />}
          {show.ap && <Layer zones={apZones} cle={`a${ap}`} style={() => ({ color: "#052e16", weight: 2.5, fillColor: "#22c55e", fillOpacity: 0.25 })} />}
          {show.fires && <Fires fires={fires} t={t} />}
        </MapContainer>
        <div className="fx-legend">
          {show.fires && (
            <div className="fx-lg"><strong>{t.fireAge}</strong>
              {[["< 24 h", 12], ["24–48 h", 36], ["48–72 h", 60]].map(([l, h]) => <div key={l as string}><i className="dot" style={{ background: ageColor(h as number) }} />{l}</div>)}
            </div>
          )}
          {show.communes && communes.length > 0 && (
            <div className="fx-lg"><strong>{t.legend}</strong>
              {SCALE.slice().reverse().map(([m, c], i, a) => <div key={c}><i style={{ background: c }} />{i === a.length - 1 ? `≥ ${m} %` : i === 0 ? `< ${a[1][0]} %` : `${m} – ${a[i + 1][0]} %`}</div>)}
            </div>
          )}
        </div>
      </div>
      {err ? <p className="fx-note" style={{ color: "#b91c1c" }}>{t.fireErr}</p>
        : !fires.length ? <p className="fx-note">{t.noFire}</p>
        : !zones.length ? <p className="fx-note">{t.noZones}</p> : null}
    </Card>
  );
};

/* ============================ PAGE ============================ */
export default function AnalyseFeux() {
  const { lang } = useLanguage();
  const t = txt[lang] ?? txt.fr;
  const [year, setYear] = useState<number>(2025);
  const [region, setRegion] = useState("all");
  const [ap, setAp] = useState("Ankarafantsika");
  const [hours, setHours] = useState(72);
  const [topN, setTopN] = useState(11);

  // Données statistiques + géographiques
  const [baseFeux, baseOk] = useGeo(DATA.feux);
  const [communesSup] = useGeo(DATA.communesSup);
  const [regionsF] = useGeo(DATA.regions);
  const [airesF] = useGeo(DATA.aires);
  const [periphF] = useGeo(DATA.peripheries);
  const [communesGeoF] = useGeo(DATA.communesGeo);
  const [zonesF] = useGeo(DATA.zonesBrulees);

  const regionsZ = useMemo(() => toZones(regionsF, PROP.region, "Région"), [regionsF]);
  const apZ = useMemo(() => toZones(airesF, PROP.ap, ""), [airesF]);
  const periphZ = useMemo(() => toZones(periphF, PROP.periph, ""), [periphF]);
  const communesGeoZ = useMemo(() => toZones(communesGeoF, PROP.commune, ""), [communesGeoF]);

  // AP issues de la base statistique, rattachées à leur géométrie et à leur région
  const apNames = useMemo(
    () => Array.from(new Set(baseFeux.map((f) => String(f.properties.AP).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")),
    [baseFeux]
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
  const onRegion = (r: string) => {
    setRegion(r);
    const l = apsIn(r);
    if (!l.includes(ap)) setAp(l[0]);
  };

  const regionZone = useMemo(() => regionsZ.find((z) => z.nom === region) || null, [region, regionsZ]);
  const apZones = apGeo[ap] || [];
  const periphSel = useMemo(() => {
    if (!apZones.length) return [];
    const byName = periphZ.filter((p) => sameArea(p.nom, ap) || apZones.some((a) => sameArea(p.nom, a.nom)));
    return byName.length ? byName : periphZ.filter((p) => apZones.some((a) => touch(p.bbox, a.bbox)));
  }, [periphZ, apZones, ap]);

  // Statistiques de l'AP choisie
  const rowsAP = useMemo(() => baseFeux.filter((f) => same(f.properties.AP, ap)), [baseFeux, ap]);
  const rows = (y: number, s: string) => rowsAP.filter((f) => Number(f.properties.Année) === y && src(f.properties) === s);
  const ha = (y: number, s: string) => (y === 2018 && s === "5km" ? SUPERFICIE_2018[ap] || 0 : rows(y, s).reduce((a, f) => a + num(f.properties.Total), 0));

  const totalCommune = ha(year, "commune"), total5km = ha(year, "5km"), totalInterieur = ha(year, "interieur");
  const prevCommune = ha(year - 1, "commune");
  const evolution = prevCommune === 0 ? null : ((totalCommune - prevCommune) / prevCommune) * 100;
  const moisPrecedent = MOIS[(new Date().getMonth() + 11) % 12];
  const communeRows = useMemo(() => rowsAP.filter((f) => Number(f.properties.Année) === year && src(f.properties) === "commune"), [rowsAP, year]);
  const totalMoisDernier = communeRows.reduce((a, f) => a + num(f.properties[moisPrecedent]), 0);

  const communePlusTouchee = useMemo(() => {
    const m: Record<string, number> = {};
    communeRows.forEach((f) => { m[f.properties.Commune] = (m[f.properties.Commune] || 0) + num(f.properties.Total); });
    const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return e ? { commune: e[0], total: e[1] } : null;
  }, [communeRows]);

  const burnedBy = useMemo(() => {
    const m: Record<string, number> = {};
    communeRows.forEach((f) => { const k = norm(f.properties.Commune); m[k] = (m[k] || 0) + num(f.properties.Total); });
    return m;
  }, [communeRows]);
  const supBy = useMemo(() => {
    const m: Record<string, number> = {};
    communesSup.filter((c) => same(c.properties.AP, ap)).forEach((c) => { m[norm(c.properties.Commune)] = num(c.properties.Superficie); });
    return m;
  }, [communesSup, ap]);

  const communeStats = useMemo(
    () => communesSup.filter((c) => same(c.properties.AP, ap)).map((c) => {
      const nom = String(c.properties.Commune).trim(), sup = num(c.properties.Superficie);
      return { commune: nom, pct: sup > 0 ? ((burnedBy[norm(nom)] || 0) / sup) * 100 : 0 };
    }),
    [communesSup, ap, burnedBy]
  );

  // Communes tracées sur la carte (même nom que la base + proches de l'AP), colorées par % brûlé
  const communesMap = useMemo(() => {
    if (!communesGeoZ.length || !apZones.length) return [];
    const boxes = [...apZones, ...periphSel].map((z) => z.bbox);
    const box: Bbox = [Math.min(...boxes.map((b) => b[0])) - 0.5, Math.min(...boxes.map((b) => b[1])) - 0.5, Math.max(...boxes.map((b) => b[2])) + 0.5, Math.max(...boxes.map((b) => b[3])) + 0.5];
    const names = new Set(rowsAP.filter((f) => src(f.properties) === "commune").map((f) => norm(f.properties.Commune)));
    const near = communesGeoZ.filter((z) => touch(z.bbox, box));
    let list = near.filter((z) => names.has(norm(z.nom)));
    if (!list.length) list = near.filter((z) => apZones.some((a) => around(z, a)));
    return list.map((z) => {
      const k = norm(z.nom), burned = burnedBy[k] || 0, sup = supBy[k] || 0;
      return { ...z, burned, pct: sup > 0 ? (burned / sup) * 100 : null };
    });
  }, [communesGeoZ, apZones, periphSel, rowsAP, burnedBy, supBy]);

  const zonesBrulees = useMemo(
    () => toZones(zonesF.filter((z) => (!z.properties?.AP || same(z.properties.AP, ap)) && (!z.properties?.Année || Number(z.properties.Année) === year)), "AP", ""),
    [zonesF, ap, year]
  );

  // Feux actifs NASA FIRMS
  const [firesRaw, setFiresRaw] = useState<any[]>([]);
  const [firesErr, setFiresErr] = useState(false);
  const [now, setNow] = useState(Date.now());
  const loadFires = useCallback(async () => {
    try {
      setFiresErr(false);
      const r = await fetch(DATA.firms);
      if (!r.ok) throw new Error("FIRMS");
      const j = await r.json();
      setFiresRaw(Array.isArray(j.features) ? j.features : []);
    } catch { setFiresErr(true); }
  }, []);
  useEffect(() => {
    loadFires();
    const a = setInterval(loadFires, 15 * 60 * 1000), b = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [loadFires]);

  const fires = useMemo(() => {
    const scope = [...apZones, ...periphSel];
    return parseFires(firesRaw)
      .map((f) => ({ ...f, age: (now - f.t) / 3.6e6 }))
      .filter((f) => f.age <= hours && f.age >= -1)
      .filter((f) => (scope.length ? scope.some((z) => inZone(f.lon, f.lat, z)) : regionZone ? inZone(f.lon, f.lat, regionZone) : true));
  }, [firesRaw, now, hours, apZones, periphSel, regionZone]);

  // Graphiques
  const chart1 = useMemo(() => {
    const monthly = (y: number) => MOIS.map((m) => rows(y, "commune").reduce((a, f) => a + num(f.properties[m]), 0));
    const prev = monthly(year - 1), cur = monthly(year);
    return MOIS_KEYS.map((k, i) => ({ mois: t.months[k], [`y${year - 1}`]: prev[i], [`y${year}`]: cur[i] }));
  }, [rowsAP, year, lang]);

  const zonesHisto = useMemo(() => {
    const moy = (s: string) => [2020, 2021, 2022, 2023, 2024].reduce((a, y) => a + ha(y, s), 0) / 5;
    const diff = (s: string, ys: number[]) => ys.reduce((a, y) => a + ha(y, s), 0) / ys.length;
    return [
      { zone: t.peripheral5km, annee: ha(year, "5km"), moyenne: moy("5km"), difficile: diff("5km", [2018, 2023, 2025]) },
      { zone: t.insidePark, annee: ha(year, "interieur"), moyenne: moy("interieur"), difficile: diff("interieur", [2023, 2025]) },
    ];
  }, [rowsAP, year, ap, lang]);

  const impactAll = useMemo(() => {
    const m: Record<string, any> = {};
    rowsAP.filter((f) => Number(f.properties.Année) === year).forEach((f) => {
      const p = f.properties, v = num(p.Total);
      const c = (m[p.Commune] ||= { commune: p.Commune, total: 0, peripherie: 0, interieur: 0 });
      if (src(p) === "interieur") c.interieur += v;
      if (src(p) === "5km") c.peripherie += v;
      c.total += v;
    });
    return Object.values(m).sort((a: any, b: any) => b.total - a.total);
  }, [rowsAP, year]);

  const variation5km = useMemo(() => {
    const moy = [2020, 2021, 2022, 2023, 2024].reduce((a, y) => a + ha(y, "5km"), 0) / 5;
    return moy === 0 ? 0 : Number((((ha(year, "5km") - moy) / moy) * 100).toFixed(1));
  }, [rowsAP, year, ap]);

  const evoColor = (evolution ?? 0) >= 0 ? "#d32f2f" : "#2e7d32";

  return (
    <div className="fx">
      <style>{CSS}</style>

      <header className="fx-head">
        <div className="fx-brand">
          <div className="fx-logo" aria-hidden="true">
            <Trees size={26} color="#fff" />
            <Flame className="f" size={22} color="#ff6b35" />
          </div>
          <div>
            <h1 className="fx-h1">{t.title}</h1>
            <p className="fx-sub">{ap} – {year}</p>
          </div>
        </div>
        <div className="fx-filters">
          <div className="fx-f">
            <label htmlFor="fx-region"><Globe2 size={14} />{t.region}</label>
            <select id="fx-region" value={region} onChange={(e) => onRegion(e.target.value)}>
              <option value="all">{t.allRegions}</option>
              {regionOptions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="fx-f">
            <label htmlFor="fx-ap"><MapPin size={14} />{t.ap}</label>
            <select id="fx-ap" value={ap} onChange={(e) => setAp(e.target.value)}>
              {apOptions.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="fx-f" style={{ flex: "0 1 110px", minWidth: 100 }}>
            <label htmlFor="fx-year"><Calendar size={14} />{t.year}</label>
            <select id="fx-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </header>

      {!baseOk ? (
        <div className="fx-load">{t.loading}</div>
      ) : !baseFeux.length ? (
        <div className="fx-load" style={{ color: "#b91c1c" }}>{t.noBase}</div>
      ) : (
        <>
          <div className="fx-rank">
            <div className="fx-rank-t"><Trophy size={18} color="#d4af37" />{t.leastBurnedCommunes}</div>
            <Ranking stats={communeStats} />
          </div>

          <div className="fx-kpis">
            <KPI title={t.totalBurnedCommunes} color="#c00000" tint="#ff6b35" icon={<Flame size={30} color="#ff6b35" />} value={fmtHa(totalCommune)} />
            <KPI title={t.burnedPeripheral} color="#707070" tint="#2563eb" icon={<MapPinned size={30} color="#2563eb" />} flame value={fmtHa(total5km)} />
            <KPI title={t.burnedInside} color="#f0a500" tint="#2e7d32" icon={<Trees size={30} color="#2e7d32" />} flame value={fmtHa(totalInterieur)} />
            <KPI title={t.burnedLastMonth} color="#c00000" tint="#1d4ed8" icon={<Calendar size={30} color="#1d4ed8" />} flame value={fmtHa(totalMoisDernier)} />
            <KPI
              title={t.annualEvolution} color={evoColor} tint="#ef4444" icon={<BarChart3 size={30} color="#ef4444" />}
              value={evolution === null ? "--" : (
                <>
                  {evolution.toFixed(2)} %
                  {evolution >= 0 ? <TrendingUp size={22} color="#d32f2f" strokeWidth={2.8} /> : <TrendingDown size={22} color="#2e7d32" strokeWidth={2.8} />}
                </>
              )}
            />
            <KPI
              title={t.mostAffected} color="#003399" tint="#1d4ed8" icon={<MapPinned size={30} color="#1d4ed8" />}
              value={<span style={{ color: "#b40000" }}>{communePlusTouchee?.commune ?? "--"}</span>}
              sub={communePlusTouchee ? `${t.with} ${fmtHa(communePlusTouchee.total)} ${t.totalBurnedSurface}` : undefined}
            />
          </div>

          <div className="fx-body">
            <div className="fx-left">
              <Gauge variation={variation5km} t={t} />
              <MonthlyChart data={chart1} year={year} t={t} />
              <HistoricalChart zones={zonesHisto} year={year} t={t} />
              <ImpactChart all={impactAll} ap={ap} t={t} n={topN} setN={setTopN} />
            </div>
            <FireMap
              t={t} ap={ap} year={year} communes={communesMap} zones={zonesBrulees} apZones={apZones} periph={periphSel}
              regions={regionsZ} regionZone={regionZone} fires={fires} hours={hours} setHours={setHours}
              onRefresh={loadFires} err={firesErr}
            />
          </div>
        </>
      )}
    </div>
  );
}
