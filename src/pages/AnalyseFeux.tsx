import React, { useState, useMemo, useEffect } from "react";
import {
  Flame, Trees, MapPinned, MapPin, Calendar, Trophy, Medal,
  TrendingUp, TrendingDown, BarChart3, Globe2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, LineChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList, Cell, ReferenceDot,
} from "recharts";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
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
    months: { Jan: "Jan", Feb: "Feb", Mar: "Mär", Apr: "Apr", May: "Mai", Jun: "Jun", Jul: "Jul", Aug: "Aug", Sep: "Sep", Oct: "Okt", Nov: "Nov", Dec: "Dez" },
  },
};

/* ============================ CHEMINS DES DONNÉES (à adapter) ============================ */
const DATA = {
  feux: "/data/Bases_Feux.geojson",
  communes: "/data/communes_superficie.geojson",
  zonesBrulees: "/data/zones_brulees.geojson", // optionnel
  aires: "/data/aires_protegees.geojson", // optionnel
};

/* ============================ DONNÉES & OUTILS ============================ */
// Région -> Aires protégées (à ajuster si besoin)
const REGIONS: Record<string, string[]> = {
  DIANA: ["Analamerana", "Ankarana", "Montagne d'Ambre"],
  Boeny: ["Ankarafantsika"],
  Anosy: ["Andohahela"],
  Atsinanana: ["Marolambo"],
  "Atsimo-Atsinanana": ["Befotaka-Midongy"],
};
const ALL_AP = Object.values(REGIONS).flat().sort();
const SUPERFICIE_2018: Record<string, number> = {
  Analamerana: 2809.96, Andohahela: 5584.04, Ankarafantsika: 18496.4, Ankarana: 5812.0,
  Marolambo: 7120.84, "Befotaka-Midongy": 19312.32, "Montagne d'Ambre": 4092.2,
};
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MOIS_KEYS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

const num = (v: any) => Number(String(v ?? 0).replace(",", ".")) || 0;
const same = (a: any, b: any) => String(a).trim() === String(b).trim();
const src = (p: any) => String(p.Source).trim().toLowerCase();
const fmtHa = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ha";
const loadFeatures = (url: string, set: (f: any[]) => void, done?: () => void) =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => set(d.features || [])).catch(() => set([])).finally(() => done && done());

const SCALE: [number, string][] = [[10, "#991b1b"], [5, "#ef4444"], [2, "#f97316"], [0.5, "#facc15"], [0, "#dcfce7"]];
const colorOf = (pct: number) => (SCALE.find(([m]) => pct >= m) || SCALE[4])[1];

/* ============================ STYLES RESPONSIVES ============================ */
const CSS = `
.fx{padding:clamp(8px,2vw,16px);background:#eef3f8;min-height:100vh;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937}
.fx *{box-sizing:border-box}
.fx-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;padding:12px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.fx-brand{display:flex;align-items:center;gap:12px;min-width:0}
.fx-logo{flex:none;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0b4ea2,#1d78d6);position:relative}
.fx-logo svg.f{position:absolute;right:-5px;bottom:-5px;background:#fff;border-radius:50%;padding:3px}
.fx-h1{margin:0;color:#0b4ea2;font-size:clamp(17px,2.6vw,24px);font-weight:700;line-height:1.2}
.fx-sub{margin:2px 0 0;font-size:12px;color:#6b7280}
.fx-filters{display:flex;flex-wrap:wrap;gap:10px}
.fx-f{display:flex;flex-direction:column;gap:4px;min-width:130px;flex:1 1 130px}
.fx-f label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#374151}
.fx select,.fx-sel{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #d1d5db;background:#f9fafb;font-weight:600;font-size:12px;cursor:pointer}
.fx select:focus-visible,.fx input:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.fx-rank{display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;margin-bottom:10px;padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;font-size:12px}
.fx-rank-t{display:flex;align-items:center;gap:8px;font-weight:700;color:#003399;font-size:13px;flex:1 1 280px}
.fx-rank-i{display:flex;align-items:center;gap:6px}
.fx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:10px}
.fx-kpi{background:linear-gradient(to bottom,#fff,#f7f7f7);border:1px solid #d6d6d6;border-radius:8px;padding:8px 12px;min-height:110px;box-shadow:0 1px 2px rgba(0,0,0,.05);display:flex;flex-direction:column;justify-content:center}
.fx-kpi-t{text-align:center;font-weight:700;font-style:italic;font-size:12px;line-height:1.2}
.fx-kpi-b{display:grid;grid-template-columns:64px 1fr;align-items:center;margin-top:6px}
.fx-kpi-v{display:flex;justify-content:center;align-items:center;font-weight:800;font-style:italic;font-size:clamp(14px,1.5vw,16px);text-align:center}
.fx-grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:700px){.fx-grid{grid-template-columns:repeat(2,1fr)}.fx-span2{grid-column:1/-1}}
@media(min-width:1150px){.fx-grid{grid-template-columns:repeat(3,1fr)}.fx-span2{grid-column:span 2}}
.fx-card{background:#fff;border:1px solid #d9d9d9;border-radius:8px;padding:10px;min-width:0;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.fx-ct{margin:0 0 8px;text-align:center;font-size:12px;font-weight:700;font-style:italic;color:#d32f2f}
.fx-map{position:relative;flex:1;min-height:380px;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb}
.fx-map .leaflet-container{position:absolute;inset:0;font-family:inherit}
.fx-tools{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-bottom:8px;font-size:12px;font-weight:600;color:#374151}
.fx-tools label{display:flex;align-items:center;gap:5px;cursor:pointer}
.fx-tools .fx-sel{width:auto}
.fx-legend{position:absolute;left:8px;bottom:8px;z-index:1000;background:rgba(255,255,255,.95);padding:6px 9px;border-radius:6px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.fx-legend div{display:flex;align-items:center;gap:6px;margin-top:2px}
.fx-legend i{width:14px;height:10px;display:inline-block;border:1px solid #9ca3af}
.fx-note{margin:6px 0 0;font-size:11px;color:#6b7280;text-align:center}
.fx-chart{height:300px;min-height:260px}
.fx-load{padding:30px;text-align:center;color:#0b4ea2;font-weight:600}
@media(prefers-reduced-motion:reduce){.fx *{transition:none!important}}
`;

/* ============================ COMPOSANTS ============================ */
const Card = ({ title, color, className = "", children }: any) => (
  <section className={`fx-card ${className}`}>
    <h3 className="fx-ct" style={color ? { color } : undefined}>{title}</h3>
    {children}
  </section>
);

const KPI = ({ title, color, icon, value, children }: any) => (
  <div className="fx-kpi">
    <div className="fx-kpi-t" style={{ color }}>{title}</div>
    {children ?? (
      <div className="fx-kpi-b">
        <div style={{ display: "flex", justifyContent: "center", color }}>{icon}</div>
        <div className="fx-kpi-v" style={{ color }}>{value}</div>
      </div>
    )}
  </div>
);

const Ranking = ({ stats }: any) => {
  const top = [...stats].sort((a, b) => a.pct - b.pct).slice(0, 3);
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

const MonthlyChart = ({ data, year, t }: any) => (
  <Card title={t.monthlyEvolution}>
    <div className="fx-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 22, left: 0, right: 15, bottom: 0 }}>
          <CartesianGrid stroke="#eee" vertical={false} />
          <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend verticalAlign="top" height={25} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
          <Line type="natural" dataKey={`y${year - 1}`} name={`${year - 1}`} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 1 }} />
          <Line type="natural" dataKey={`y${year}`} name={`${year}`} stroke="#dc2626" strokeWidth={2.5} dot={{ r: 1 }} />
          {data.map((d: any, i: number) => {
            const diff = d[`y${year}`] - d[`y${year - 1}`];
            const color = diff < 0 ? "#16a34a" : diff > 0 ? "#dc2626" : "#9ca3af";
            const symbol = diff < 0 ? "▼" : diff > 0 ? "▲" : "—";
            return (
              <ReferenceDot
                key={i} x={d.mois} y={Math.max(d[`y${year - 1}`], d[`y${year}`])} r={0}
                label={{ value: `${symbol} ${Math.abs(diff).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`, position: "top", fill: color, fontSize: 8, fontWeight: 700 }}
              />
            );
          })}
        </LineChart>
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
          <ResponsiveContainer width="100%" height={110}>
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
                        {vText && (
                          <text x={inside ? x + width - text.length * 6 - 4 : x + width + 8 + text.length * 6} y={y + height / 2} dy={4} textAnchor={inside ? "end" : "start"} fill={vColor} fontSize={11} fontWeight={700}>{vText}</text>
                        )}
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

const CustomXAxisTick = ({ x, y, payload }: any) => {
  const nom = String(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="end" transform="rotate(-30)" fill="#333" fontSize={11}>
        {nom.length > 8 ? nom.substring(0, 8) + "..." : nom}
      </text>
    </g>
  );
};

const CustomTotalBar = ({ x, y, width, height, payload }: any) => {
  const total = payload.total || 1;
  const hInt = (payload.interieur / total) * height;
  const hPer = (payload.peripherie / total) * height;
  const w = width * 0.45, gap = 2, x0 = x + (width - (w * 2 + gap)) / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#d9edf7" rx={4} />
      <rect x={x0} y={y + height - hInt} width={w} height={hInt} fill="#ff0000" />
      <rect x={x0 + w + gap} y={y + height - hPer} width={w} height={hPer} fill="#ffff00" />
    </g>
  );
};

const ImpactChart = ({ data, ap, t }: any) => {
  const maxY = Math.max(...data.map((d: any) => d.total), 0);
  const step = maxY > 5000 ? 1000 : 500;
  const top = Math.max(step, Math.ceil(maxY / step) * step);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const item = (bg: string, label: string, border = "none") => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ width: 12, height: 12, background: bg, border, display: "inline-block", marginRight: 6 }} />{label}
    </div>
  );
  return (
    <Card title={`${t.fireImpact} ${ap}`}>
      <div className="fx-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 35 }} barCategoryGap="25%">
            <XAxis dataKey="commune" interval={0} tick={<CustomXAxisTick />} axisLine={{ stroke: "#0066cc", strokeWidth: 1.5 }} />
            <YAxis domain={[0, top]} ticks={ticks} tick={{ fill: "#555", fontSize: 11 }} axisLine={{ stroke: "#0066cc", strokeWidth: 1.5 }} tickLine={{ stroke: "#0066cc" }} />
            <Legend
              verticalAlign="bottom" align="center"
              content={() => (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, fontSize: 12 }}>
                  {item("#ff0000", t.insideAP)}{item("#ffff00", t.peripheral5km, "1px solid #999")}{item("#d9edf7", t.total)}
                </div>
              )}
            />
            <Bar dataKey="total" name="Total" shape={<CustomTotalBar />} barSize={20}>
              <LabelList dataKey="total" position="top" fill="#0099ff" fontSize={10} formatter={(v: number) => Math.round(v).toLocaleString("fr-FR")} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
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
      <svg width="100%" viewBox="0 0 500 260" style={{ maxHeight: 260 }}>
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
const FitBounds = ({ features }: any) => {
  const map = useMap();
  useEffect(() => {
    if (!features.length) return;
    try {
      const b = L.geoJSON({ type: "FeatureCollection", features } as any).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [24, 24] });
    } catch { /* géométrie invalide */ }
  }, [features, map]);
  return null;
};

const FireMap = ({ t, ap, year, communes, zones, shape }: any) => {
  const [satellite, setSatellite] = useState(true);
  const [show, setShow] = useState({ communes: true, zones: true, ap: true });
  const toggle = (k: string) => setShow((s: any) => ({ ...s, [k]: !s[k] }));
  const fit = communes.length ? communes : shape.length ? shape : zones;
  const fc = (features: any[]) => ({ type: "FeatureCollection", features } as any);
  return (
    <Card title={`${t.mapTitle} – ${ap} (${year})`} className="fx-span2">
      <div className="fx-tools">
        <Globe2 size={14} />
        <select className="fx-sel" aria-label="Fond de carte" value={satellite ? "sat" : "osm"} onChange={(e) => setSatellite(e.target.value === "sat")}>
          <option value="osm">{t.street}</option>
          <option value="sat">{t.satellite}</option>
        </select>
        {([["communes", t.lCommunes], ["zones", t.lZones], ["ap", t.lAP]] as const).map(([k, label]) => (
          <label key={k}><input type="checkbox" checked={(show as any)[k]} onChange={() => toggle(k)} />{label}</label>
        ))}
      </div>
      <div className="fx-map">
        <MapContainer center={[-19, 46.8]} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          {satellite ? (
            <TileLayer key="sat" attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          ) : (
            <TileLayer key="osm" attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
          <FitBounds features={fit} />
          {show.communes && communes.length > 0 && (
            <GeoJSON
              key={`c-${ap}-${year}`} data={fc(communes)}
              style={(f: any) => ({ color: "#ffffff", weight: 1.2, fillColor: colorOf(f.properties.pct), fillOpacity: 0.65 })}
              onEachFeature={(f: any, layer: any) =>
                layer.bindTooltip(`<b>${f.properties.Commune}</b><br/>${fmtHa(f.properties.burned)} (${f.properties.pct.toFixed(2)} %)`, { sticky: true })
              }
            />
          )}
          {show.zones && zones.length > 0 && (
            <GeoJSON key={`z-${ap}-${year}`} data={fc(zones)} style={() => ({ color: "#b91c1c", weight: 1, fillColor: "#ff0000", fillOpacity: 0.7 })} />
          )}
          {show.ap && shape.length > 0 && (
            <GeoJSON key={`a-${ap}`} data={fc(shape)} style={() => ({ color: "#0b4ea2", weight: 3, dashArray: "6 4", fill: false })} />
          )}
        </MapContainer>
        <div className="fx-legend">
          <strong>{t.legend}</strong>
          {SCALE.slice().reverse().map(([m, c], i, a) => (
            <div key={c}><i style={{ background: c }} />{i === a.length - 1 ? `≥ ${m} %` : i === 0 ? `< ${a[1][0]} %` : `${m} – ${a[i + 1][0]} %`}</div>
          ))}
        </div>
      </div>
      {!communes.length && !shape.length && <p className="fx-note">{t.noData}</p>}
      {communes.length > 0 && !zones.length && <p className="fx-note">{t.noZones}</p>}
    </Card>
  );
};

/* ============================ PAGE ============================ */
export default function AnalyseFeux() {
  const { lang } = useLanguage();
  const t = txt[lang] ?? txt.fr;
  const [year, setYear] = useState<number>(2025);
  const [region, setRegion] = useState<string>("all");
  const [ap, setAp] = useState<string>("Ankarafantsika");
  const [baseFeux, setBaseFeux] = useState<any[]>([]);
  const [communesSuperficie, setCommunesSuperficie] = useState<any[]>([]);
  const [zonesBrulees, setZonesBrulees] = useState<any[]>([]);
  const [aires, setAires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures(DATA.feux, setBaseFeux, () => setLoading(false));
    loadFeatures(DATA.communes, setCommunesSuperficie);
    loadFeatures(DATA.zonesBrulees, setZonesBrulees); // optionnel
    loadFeatures(DATA.aires, setAires); // optionnel
  }, []);

  const apOptions = region === "all" ? ALL_AP : REGIONS[region];
  const onRegion = (r: string) => {
    setRegion(r);
    if (r !== "all" && !REGIONS[r].includes(ap)) setAp(REGIONS[r][0]);
  };

  const rowsAP = useMemo(() => baseFeux.filter((f) => same(f.properties.AP, ap)), [baseFeux, ap]);
  const rows = (y: number, s: string) => rowsAP.filter((f) => Number(f.properties.Année) === y && src(f.properties) === s);
  const ha = (y: number, s: string, ref = ap) =>
    y === 2018 && s === "5km" ? SUPERFICIE_2018[ref] || 0
      : baseFeux.filter((f) => same(f.properties.AP, ref) && Number(f.properties.Année) === y && src(f.properties) === s).reduce((a, f) => a + num(f.properties.Total), 0);

  const totalCommune = ha(year, "commune");
  const total5km = ha(year, "5km");
  const totalInterieur = ha(year, "interieur");
  const evolution = ha(year - 1, "commune") === 0 ? null : ((totalCommune - ha(year - 1, "commune")) / ha(year - 1, "commune")) * 100;

  const moisPrecedent = MOIS[(new Date().getMonth() + 11) % 12];
  const totalMoisDernier = rows(year, "commune").reduce((a, f) => a + num(f.properties[moisPrecedent]), 0);

  const communeRows = rows(year, "commune");
  const communePlusTouchee = useMemo(() => {
    const m: Record<string, number> = {};
    communeRows.forEach((f) => { m[f.properties.Commune] = (m[f.properties.Commune] || 0) + num(f.properties.Total); });
    const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return e ? { commune: e[0], total: e[1] } : null;
  }, [baseFeux, ap, year]);

  // Commune géolocalisée + superficie brûlée (carte et classement)
  const communesAP = useMemo(() =>
    communesSuperficie.filter((c) => same(c.properties.AP, ap)).map((c) => {
      const nom = String(c.properties.Commune).trim();
      const burned = communeRows.filter((f) => same(f.properties.Commune, nom)).reduce((a, f) => a + num(f.properties.Total), 0);
      const sup = num(c.properties.Superficie);
      return { ...c, properties: { ...c.properties, commune: nom, burned, pct: sup > 0 ? (burned / sup) * 100 : 0 } };
    }), [communesSuperficie, baseFeux, ap, year]);

  const zonesAP = useMemo(() => zonesBrulees.filter((z) => (!z.properties?.AP || same(z.properties.AP, ap)) && (!z.properties?.Année || Number(z.properties.Année) === year)), [zonesBrulees, ap, year]);
  const shapeAP = useMemo(() => aires.filter((a) => [a.properties?.AP, a.properties?.Nom, a.properties?.NOM].some((v) => v && same(v, ap))), [aires, ap]);

  const chart1 = useMemo(() => {
    const monthly = (y: number) => MOIS.map((m) => rows(y, "commune").reduce((a, f) => a + num(f.properties[m]), 0));
    const prev = monthly(year - 1), cur = monthly(year);
    return MOIS_KEYS.map((k, i) => ({ mois: t.months[k], [`y${year - 1}`]: prev[i], [`y${year}`]: cur[i] }));
  }, [baseFeux, ap, year, lang]);

  const zonesHisto = useMemo(() => {
    const moy = (s: string) => [2020, 2021, 2022, 2023, 2024].reduce((a, y) => a + ha(y, s), 0) / 5;
    const diff = (s: string, ys: number[]) => ys.reduce((a, y) => a + ha(y, s), 0) / ys.length;
    return [
      { zone: t.peripheral5km, annee: ha(year, "5km"), moyenne: moy("5km"), difficile: diff("5km", [2018, 2023, 2025]) },
      { zone: t.insidePark, annee: ha(year, "interieur"), moyenne: moy("interieur"), difficile: diff("interieur", [2023, 2025]) },
    ];
  }, [baseFeux, ap, year, lang]);

  const impact = useMemo(() => {
    const m: Record<string, any> = {};
    rowsAP.filter((f) => Number(f.properties.Année) === year).forEach((f) => {
      const p = f.properties, v = num(p.Total);
      const c = (m[p.Commune] ||= { commune: p.Commune, total: 0, peripherie: 0, interieur: 0 });
      if (src(p) === "interieur") c.interieur += v;
      if (src(p) === "5km") c.peripherie += v;
      c.total += v;
    });
    return Object.values(m).sort((a: any, b: any) => b.total - a.total).slice(0, 11).sort((a: any, b: any) => a.commune.localeCompare(b.commune));
  }, [rowsAP, year]);

  const variation5km = useMemo(() => {
    const moy = [2020, 2021, 2022, 2023, 2024].reduce((a, y) => a + ha(y, "5km"), 0) / 5;
    return moy === 0 ? 0 : Number((((ha(year, "5km") - moy) / moy) * 100).toFixed(1));
  }, [baseFeux, ap, year]);

  const evoColor = (evolution ?? 0) >= 0 ? "#d32f2f" : "#2e7d32";
  const overlay = (Icon: any, color: string, size = 44, flame = 18) => (
    <div style={{ position: "relative", width: 48, height: 48 }}>
      <Icon size={size} color={color} />
      <Flame size={flame} color="#ff6b35" style={{ position: "absolute", bottom: -2, right: -2 }} />
    </div>
  );

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
              {Object.keys(REGIONS).map((r) => <option key={r}>{r}</option>)}
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

      {loading ? (
        <div className="fx-load">{t.loading}</div>
      ) : (
        <>
          <div className="fx-rank">
            <div className="fx-rank-t"><Trophy size={18} color="#d4af37" />{t.leastBurnedCommunes}</div>
            <Ranking stats={communesAP.map((c) => c.properties)} />
          </div>

          <div className="fx-kpis">
            <KPI title={t.totalBurnedCommunes} color="#c00000" icon={<Flame size={46} color="#ff6b35" />} value={fmtHa(totalCommune)} />
            <KPI title={t.burnedPeripheral} color="#707070" icon={overlay(MapPinned, "#2563eb")} value={fmtHa(total5km)} />
            <KPI title={t.burnedInside} color="#f0a500" icon={overlay(Trees, "#2e7d32", 44, 20)} value={fmtHa(totalInterieur)} />
            <KPI title={t.burnedLastMonth} color="#c00000" icon={overlay(Calendar, "#1d4ed8")} value={fmtHa(totalMoisDernier)} />
            <KPI
              title={t.annualEvolution} color={evoColor} icon={<BarChart3 size={42} color="#ef4444" />}
              value={evolution === null ? "--" : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {evolution.toFixed(2)} %
                  {evolution >= 0 ? <TrendingUp size={22} color="#d32f2f" strokeWidth={2.8} /> : <TrendingDown size={22} color="#2e7d32" strokeWidth={2.8} />}
                </span>
              )}
            />
            <KPI title={t.mostAffected} color="#003399">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <MapPinned size={36} color="#1d4ed8" />
                <div style={{ flex: 1, textAlign: "center", lineHeight: 1.25 }}>
                  <div style={{ color: "#b40000", fontWeight: 800, fontSize: 13 }}>{communePlusTouchee?.commune ?? "--"}</div>
                  <div style={{ color: "#003399", fontWeight: 700, fontSize: 12 }}>{t.with}</div>
                  <div style={{ color: "#b40000", fontWeight: 800, fontSize: 12 }}>{communePlusTouchee ? fmtHa(communePlusTouchee.total) : "--"}</div>
                </div>
              </div>
              <div style={{ color: "#003399", fontWeight: 700, fontSize: 11, textAlign: "right" }}>{t.totalBurnedSurface}</div>
            </KPI>
          </div>

          <div className="fx-grid">
            <FireMap t={t} ap={ap} year={year} communes={communesAP} zones={zonesAP} shape={shapeAP} />
            <Gauge variation={variation5km} t={t} />
            <MonthlyChart data={chart1} year={year} t={t} />
            <HistoricalChart zones={zonesHisto} year={year} t={t} />
            <ImpactChart data={impact} ap={ap} t={t} />
          </div>
        </>
      )}
    </div>
  );
}
