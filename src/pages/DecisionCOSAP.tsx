import React, { useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, LineChart, Line, ReferenceLine, CartesianGrid, Legend,
} from "recharts";
import {
  TreePine, Target, Calendar, MapPin, Landmark, RefreshCcw, Search,
  Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users,
} from "lucide-react";

/* ================= TRADUCTIONS =================
   `fr` sert de modèle : TypeScript impose les mêmes clés dans mg / en / de. */
const fr = {
  title: "Suivi des décisions des COSAP",
  subtitle: "Décisions des COSAP intégrées dans les plans communaux",
  year: "Année", region: "Région", aire: "Aire protégée",
  allRegions: "Toutes les régions", allAires: "Toutes les aires protégées", reset: "Réinitialiser",
  indicator: "Indicateur :",
  indicatorText: (n: number) => `Pour chaque COSAP (${n}), 3 décisions sont intégrées dans les plans communaux (total de ${n * 3} décisions), dont 1 mesure tenant compte des besoins spécifiques des femmes et des jeunes (total de ${n} mesures).`,
  kpiTitle: "Taux d'atteinte de la cible",
  kpiDecisions: "Décisions incluses dans les plans", kpiFJ: "Mesures femmes et jeunes atteintes",
  decisionsOf: (a: number, b: number) => `${a} / ${b} décisions`,
  measuresOf: (a: number, b: number) => `${a} / ${b} mesures`,
  targetDecisions: (n: number) => `Cible : ${n} décisions`, targetMeasures: (n: number) => `Cible : ${n} mesures`,
  cosapDone: "COSAP ayant atteint la cible", cosapDoneHint: "3 décisions dont 1 mesure femmes et jeunes",
  cosapTotal: "COSAP suivis", cosapTotalHint: "selon les filtres choisis",
  chartDec: "COSAP par nombre de décisions incluses dans les plans communaux",
  chartFJ: "COSAP par nombre de décisions tenant compte des besoins des femmes et des jeunes",
  totalCosap: (n: number) => `Total COSAP : ${n}`, nbCosap: "Nombre de COSAP",
  b0: "0", b12: "1 à 2", b3: "3", b3p: "Plus de 3", f0: "0", f1: "1", f1p: "Plus de 1",
  trendTitle: "Évolution multi-annuelle de l'indicateur", sDecisions: "Décisions incluses dans les plans (%)", sFJ: "Mesures F & J atteintes (%)",
  compareTitle: "Comparaison des COSAP : décisions incluses dans les plans communaux",
  lHigh: "≥ 3 décisions", lMed: "1-2 décisions", lLow: "0 décision", nbDecisions: "Nombre de décisions", targetLine: "Cible",
  tableTitle: "Détail des décisions des COSAP incluses dans les plans communaux",
  searchPh: "Rechercher une aire protégée, une commune…", export: "Exporter",
  cols: ["Région", "Aire protégée", "Nombre de décisions", "Id de la décision", "Date de la décision (COSAP)", "Date de la décision (Commune)", "Communes impliquées", "Liste des communes impliquées", "Spécification de la décision"],
  showing: (a: number, b: number, n: number) => `Affichage de ${a} à ${b} sur ${n} enregistrements`,
  rowsPerPage: "Lignes par page", first: "Première page", prev: "Page précédente", next: "Page suivante", last: "Dernière page",
  noResult: "Aucun enregistrement. Modifiez les filtres ou la recherche.",
  csv: ["Région", "Aire protégée", "Nb décisions", "Id", "Date COSAP", "Date commune", "Nb communes", "Communes", "Spécification"],
};
type Txt = typeof fr;

const mg: Txt = {
  title: "Fanaraha-maso ny fanapahan-kevitry ny COSAP",
  subtitle: "Fanapahan-kevitry ny COSAP ampidirina ao amin'ny drafitry ny kaominina",
  year: "Taona", region: "Faritra", aire: "Faritra arovana",
  allRegions: "Faritra rehetra", allAires: "Faritra arovana rehetra", reset: "Averina",
  indicator: "Tondro :",
  indicatorText: (n) => `Isaky ny COSAP (${n}), fanapahan-kevitra 3 no ampidirina ao amin'ny drafitry ny kaominina (fanapahan-kevitra ${n * 3} amin'ny totalany), ka fepetra 1 mijery ny filan'ny vehivavy sy ny tanora manokana (fepetra ${n} amin'ny totalany).`,
  kpiTitle: "Tahan'ny fahatratrarana ny tanjona",
  kpiDecisions: "Fanapahan-kevitra ao anaty drafitra", kpiFJ: "Fepetra ho an'ny vehivavy sy tanora tratra",
  decisionsOf: (a, b) => `${a} / ${b} fanapahan-kevitra`,
  measuresOf: (a, b) => `${a} / ${b} fepetra`,
  targetDecisions: (n) => `Tanjona : ${n} fanapahan-kevitra`, targetMeasures: (n) => `Tanjona : ${n} fepetra`,
  cosapDone: "COSAP nahatratra ny tanjona", cosapDoneHint: "Fanapahan-kevitra 3 ka fepetra 1 ho an'ny vehivavy sy tanora",
  cosapTotal: "COSAP arahina", cosapTotalHint: "araka ny sivana nofidina",
  chartDec: "COSAP araka ny isan'ny fanapahan-kevitra ampidirina ao amin'ny drafitry ny kaominina",
  chartFJ: "COSAP araka ny isan'ny fanapahan-kevitra mijery ny filan'ny vehivavy sy ny tanora",
  totalCosap: (n) => `COSAP totalin'ny : ${n}`, nbCosap: "Isan'ny COSAP",
  b0: "0", b12: "1 ka hatramin'ny 2", b3: "3", b3p: "Mihoatra ny 3", f0: "0", f1: "1", f1p: "Mihoatra ny 1",
  trendTitle: "Fivoaran'ny tondro isan-taona", sDecisions: "Fanapahan-kevitra ao anaty drafitra (%)", sFJ: "Fepetra vehivavy sy tanora tratra (%)",
  compareTitle: "Fampitahana ny COSAP : fanapahan-kevitra ao amin'ny drafitry ny kaominina",
  lHigh: "≥ 3 fanapahan-kevitra", lMed: "1-2 fanapahan-kevitra", lLow: "0 fanapahan-kevitra", nbDecisions: "Isan'ny fanapahan-kevitra", targetLine: "Tanjona",
  tableTitle: "Antsipirihany ny fanapahan-kevitry ny COSAP ao amin'ny drafitry ny kaominina",
  searchPh: "Hitady faritra arovana, kaominina…", export: "Hamoaka",
  cols: ["Faritra", "Faritra arovana", "Isan'ny fanapahan-kevitra", "ID ny fanapahan-kevitra", "Daty (COSAP)", "Daty (Kaominina)", "Kaominina tafiditra", "Lisitry ny kaominina tafiditra", "Famaritana ny fanapahan-kevitra"],
  showing: (a, b, n) => `${a} – ${b} amin'ny ${n} voarakitra`,
  rowsPerPage: "Andalana isaky ny pejy", first: "Pejy voalohany", prev: "Pejy teo aloha", next: "Pejy manaraka", last: "Pejy farany",
  noResult: "Tsy misy voarakitra. Ovay ny sivana na ny fikarohana.",
  csv: ["Faritra", "Faritra arovana", "Isan'ny fanapahan-kevitra", "ID", "Daty COSAP", "Daty kaominina", "Isan'ny kaominina", "Kaominina", "Famaritana"],
};

const en: Txt = {
  title: "COSAP decisions monitoring",
  subtitle: "COSAP decisions integrated into municipal plans",
  year: "Year", region: "Region", aire: "Protected area",
  allRegions: "All regions", allAires: "All protected areas", reset: "Reset",
  indicator: "Indicator:",
  indicatorText: (n) => `For each COSAP (${n}), 3 decisions are integrated into municipal plans (total of ${n * 3} decisions), including 1 measure addressing the specific needs of women and young people (total of ${n} measures).`,
  kpiTitle: "Target achievement rate",
  kpiDecisions: "Decisions included in plans", kpiFJ: "Women & youth measures reached",
  decisionsOf: (a, b) => `${a} / ${b} decisions`,
  measuresOf: (a, b) => `${a} / ${b} measures`,
  targetDecisions: (n) => `Target: ${n} decisions`, targetMeasures: (n) => `Target: ${n} measures`,
  cosapDone: "COSAP that reached the target", cosapDoneHint: "3 decisions including 1 women & youth measure",
  cosapTotal: "COSAP monitored", cosapTotalHint: "based on selected filters",
  chartDec: "COSAP by number of decisions included in municipal plans",
  chartFJ: "COSAP by number of decisions addressing women's and youth needs",
  totalCosap: (n) => `Total COSAP: ${n}`, nbCosap: "Number of COSAP",
  b0: "0", b12: "1 to 2", b3: "3", b3p: "More than 3", f0: "0", f1: "1", f1p: "More than 1",
  trendTitle: "Multi-year trend of the indicator", sDecisions: "Decisions included in plans (%)", sFJ: "Women & youth measures reached (%)",
  compareTitle: "COSAP comparison: decisions included in municipal plans",
  lHigh: "≥ 3 decisions", lMed: "1-2 decisions", lLow: "0 decisions", nbDecisions: "Number of decisions", targetLine: "Target",
  tableTitle: "Details of COSAP decisions included in municipal plans",
  searchPh: "Search a protected area, a municipality…", export: "Export",
  cols: ["Region", "Protected area", "Number of decisions", "Decision ID", "Decision date (COSAP)", "Decision date (Municipality)", "Municipalities involved", "List of municipalities involved", "Decision description"],
  showing: (a, b, n) => `Showing ${a} to ${b} of ${n} records`,
  rowsPerPage: "Rows per page", first: "First page", prev: "Previous page", next: "Next page", last: "Last page",
  noResult: "No records found. Change the filters or the search.",
  csv: ["Region", "Protected area", "No. decisions", "ID", "COSAP date", "Municipality date", "No. municipalities", "Municipalities", "Description"],
};

const de: Txt = {
  title: "Überwachung der COSAP-Beschlüsse",
  subtitle: "In die Gemeindepläne aufgenommene COSAP-Beschlüsse",
  year: "Jahr", region: "Region", aire: "Schutzgebiet",
  allRegions: "Alle Regionen", allAires: "Alle Schutzgebiete", reset: "Zurücksetzen",
  indicator: "Indikator:",
  indicatorText: (n) => `Für jede COSAP (${n}) werden 3 Beschlüsse in die Gemeindepläne aufgenommen (insgesamt ${n * 3} Beschlüsse), darunter 1 Maßnahme, die den besonderen Bedürfnissen von Frauen und Jugendlichen Rechnung trägt (insgesamt ${n} Maßnahmen).`,
  kpiTitle: "Zielerreichungsgrad",
  kpiDecisions: "In die Pläne aufgenommene Beschlüsse", kpiFJ: "Erreichte Maßnahmen für Frauen und Jugend",
  decisionsOf: (a, b) => `${a} / ${b} Beschlüsse`,
  measuresOf: (a, b) => `${a} / ${b} Maßnahmen`,
  targetDecisions: (n) => `Ziel: ${n} Beschlüsse`, targetMeasures: (n) => `Ziel: ${n} Maßnahmen`,
  cosapDone: "COSAP mit erreichtem Ziel", cosapDoneHint: "3 Beschlüsse, davon 1 Maßnahme für Frauen und Jugend",
  cosapTotal: "Überwachte COSAP", cosapTotalHint: "gemäß gewählten Filtern",
  chartDec: "COSAP nach Zahl der in die Gemeindepläne aufgenommenen Beschlüsse",
  chartFJ: "COSAP nach Zahl der Beschlüsse für die Bedürfnisse von Frauen und Jugendlichen",
  totalCosap: (n) => `COSAP gesamt: ${n}`, nbCosap: "Anzahl COSAP",
  b0: "0", b12: "1 bis 2", b3: "3", b3p: "Mehr als 3", f0: "0", f1: "1", f1p: "Mehr als 1",
  trendTitle: "Mehrjährige Entwicklung des Indikators", sDecisions: "In die Pläne aufgenommene Beschlüsse (%)", sFJ: "Erreichte Maßnahmen Frauen & Jugend (%)",
  compareTitle: "COSAP-Vergleich: in die Gemeindepläne aufgenommene Beschlüsse",
  lHigh: "≥ 3 Beschlüsse", lMed: "1-2 Beschlüsse", lLow: "0 Beschlüsse", nbDecisions: "Anzahl der Beschlüsse", targetLine: "Ziel",
  tableTitle: "Details der in die Gemeindepläne aufgenommenen COSAP-Beschlüsse",
  searchPh: "Schutzgebiet, Gemeinde suchen…", export: "Exportieren",
  cols: ["Region", "Schutzgebiet", "Anzahl Beschlüsse", "Beschluss-ID", "Beschlussdatum (COSAP)", "Beschlussdatum (Gemeinde)", "Beteiligte Gemeinden", "Liste der beteiligten Gemeinden", "Beschreibung des Beschlusses"],
  showing: (a, b, n) => `Anzeige von ${a} bis ${b} von ${n} Einträgen`,
  rowsPerPage: "Zeilen pro Seite", first: "Erste Seite", prev: "Vorherige Seite", next: "Nächste Seite", last: "Letzte Seite",
  noResult: "Keine Einträge. Filter oder Suche ändern.",
  csv: ["Region", "Schutzgebiet", "Anz. Beschlüsse", "ID", "Datum COSAP", "Datum Gemeinde", "Anz. Gemeinden", "Gemeinden", "Beschreibung"],
};

const TXT: Record<string, Txt> = { fr, mg, en, de };
const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };

/* ================= DONNÉES ================= */
type Row = {
  annee: number; region: string; code: string; AP: string; nbrDecision: number; mesuresFJ: number;
  idDecision: string; dateCOSAP: string; dateCommune: string; communes: string[]; specification: Record<"fr" | "mg" | "en" | "de", string>; // traduite dans chaque langue
};

// Dates au format ISO (AAAA-MM-JJ) : elles sont formatées selon la langue active.
const ROWS: Row[] = [
  { annee: 2025, region: "Diana", code: "MDA", AP: "Montagne d'Ambre", nbrDecision: 5, mesuresFJ: 1, idDecision: "MDA-2025-01", dateCOSAP: "2025-03-15", dateCommune: "2025-04-10", communes: ["Joffreville", "Ambanja", "Antsiranana II"], specification: { fr: "Protection des sources d'eau et reboisement", mg: "Fiarovana ny loharanon-drano sy fambolena ala", en: "Water source protection and reforestation", de: "Schutz der Wasserquellen und Wiederaufforstung" } },
  { annee: 2025, region: "Diana", code: "ANK", AP: "Ankarana", nbrDecision: 3, mesuresFJ: 1, idDecision: "ANK-2025-01", dateCOSAP: "2025-02-20", dateCommune: "2025-03-18", communes: ["Anivorano-Nord", "Marivorahona"], specification: { fr: "Gestion des feux de brousse", mg: "Fitantanana ny doro-tanety", en: "Bushfire management", de: "Management von Buschfeuern" } },
  { annee: 2025, region: "SAVA", code: "ANL", AP: "Analamerana", nbrDecision: 2, mesuresFJ: 0, idDecision: "ANL-2025-01", dateCOSAP: "2025-01-28", dateCommune: "2025-02-20", communes: ["Vohemar", "Andapa"], specification: { fr: "Réglementation de la pêche", mg: "Fandrindrana ny jono", en: "Fishing regulation", de: "Regulierung der Fischerei" } },
  { annee: 2025, region: "Boeny", code: "AKF", AP: "Ankarafantsika", nbrDecision: 4, mesuresFJ: 2, idDecision: "AKF-2025-01", dateCOSAP: "2025-02-05", dateCommune: "2025-03-28", communes: ["Mahajanga I", "Mahajanga II", "Marovoay", "Mitsinjo"], specification: { fr: "Lutte contre l'exploitation illégale des ressources", mg: "Ady amin'ny fanararaotana tsy ara-dalàna ny harena voajanahary", en: "Fight against illegal exploitation of resources", de: "Bekämpfung der illegalen Ressourcenausbeutung" } },
  { annee: 2025, region: "Atsimo Andrefana", code: "ADH", AP: "Andohahela", nbrDecision: 5, mesuresFJ: 1, idDecision: "ADH-2025-01", dateCOSAP: "2025-02-12", dateCommune: "2025-03-30", communes: ["Toliara I", "Betioky Sud", "Bekily"], specification: { fr: "Gestion des parcours et pâturages", mg: "Fitantanana ny tany fiompiana sy fiandrasana biby", en: "Rangeland and pasture management", de: "Verwaltung von Weide- und Grasland" } },
  { annee: 2025, region: "Atsimo Atsinanana", code: "MDS", AP: "Midongy du Sud", nbrDecision: 1, mesuresFJ: 0, idDecision: "MDS-2025-01", dateCOSAP: "2025-01-18", dateCommune: "2025-02-22", communes: ["Farafangana"], specification: { fr: "Protection de la mangrove", mg: "Fiarovana ny honko (mangrove)", en: "Mangrove protection", de: "Schutz der Mangroven" } },
  { annee: 2025, region: "Alaotra Mangoro", code: "MLB", AP: "Marolambo", nbrDecision: 3, mesuresFJ: 1, idDecision: "MLB-2025-01", dateCOSAP: "2025-02-25", dateCommune: "2025-04-05", communes: ["Ambatondrazaka", "Moramanga"], specification: { fr: "Sensibilisation et éducation environnementale", mg: "Fanentanana sy fanabeazana momba ny tontolo iainana", en: "Environmental awareness and education", de: "Umweltbewusstsein und Umweltbildung" } },
];

// Trajectoire pluriannuelle (% cumulés vers la cible 2030)
const TREND = [
  { y: 2025, v: 33.3, v2: 14.3 }, { y: 2026, v: 47.6, v2: 28.6 }, { y: 2027, v: 57.1, v2: 42.9 },
  { y: 2028, v: 66.7, v2: 57.1 }, { y: 2029, v: 81.0, v2: 71.4 }, { y: 2030, v: 100, v2: 100 },
];
const YEARS = [2030, 2029, 2028, 2027, 2026, 2025, 2024, 2023];

const GREEN = "#1b5e20", GREEN_MID = "#4caf50", AMBER = "#d99a00", LIME = "#9aae2d", INK = "#1f2937", MUTED = "#6b7280", LINE = "#e5e7eb";

/* ================= STYLES RESPONSIVES ================= */
const CSS = `
.cs-root{background:#f1f5f2;min-height:100vh;padding:clamp(10px,2vw,24px);color:${INK};font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box}
.cs-root *{box-sizing:border-box}
.cs-wrap{max-width:1680px;margin:0 auto;display:flex;flex-direction:column;gap:clamp(10px,1.4vw,18px)}
.cs-card{background:#fff;border:1px solid #e3e9e5;border-radius:14px;padding:clamp(12px,1.6vw,20px);min-width:0}
.cs-header{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
.cs-brand{display:flex;align-items:center;gap:14px;min-width:0;flex:1 1 320px}
.cs-badge{width:52px;height:52px;border-radius:14px;background:${GREEN};color:#fff;display:grid;place-items:center;flex:none}
.cs-h1{margin:0;font-size:clamp(18px,2.2vw,26px);line-height:1.2;color:${GREEN};font-weight:750}
.cs-sub{margin:2px 0 0;font-size:clamp(12px,1.2vw,14px);color:${MUTED}}
.cs-filters{display:grid;grid-template-columns:repeat(4,auto);gap:10px;align-items:end;flex:0 1 auto}
.cs-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.cs-label{font-size:12px;font-weight:650;display:flex;align-items:center;gap:5px;color:#374151}
.cs-select,.cs-input{height:38px;border:1px solid #d1d5db;border-radius:8px;padding:0 10px;font-size:13px;background:#fff;color:${INK};min-width:0;width:100%}
.cs-select:focus-visible,.cs-input:focus-visible,.cs-btn:focus-visible,.cs-pg:focus-visible{outline:3px solid #86efac;outline-offset:1px}
.cs-btn{height:38px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:8px;padding:0 14px;font-size:13px;font-weight:650;cursor:pointer;background:${GREEN};color:#fff;white-space:nowrap}
.cs-btn:hover{background:#2e7d32}
.cs-btn.alt{background:#fff;color:${GREEN};border:1px solid ${GREEN}}
.cs-btn.alt:hover{background:#f0fdf4}
.cs-banner{display:flex;gap:14px;align-items:center;background:#ecfdf5;border-color:#bbf7d0}
.cs-banner p{margin:0;font-size:clamp(12px,1.25vw,14px);line-height:1.55;font-weight:550}
.cs-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,1.4vw,18px)}
.cs-kpi-donut{display:flex;align-items:center;gap:12px}
.cs-donut{position:relative;width:112px;height:112px;flex:none}
.cs-donut-c{position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:18px;pointer-events:none}
.cs-eyebrow{font-size:12px;font-weight:700;color:#374151;line-height:1.35;margin:0 0 4px}
.cs-big{font-size:clamp(26px,3vw,36px);font-weight:800;color:${GREEN};line-height:1.1}
.cs-small{font-size:12px;color:${MUTED};margin-top:4px;line-height:1.4}
.cs-charts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;gap:clamp(10px,1.4vw,18px)}
.cs-title{font-size:13px;font-weight:700;line-height:1.35;margin:0 0 10px;color:#2f2f2f}
.cs-charts .cs-card{display:flex;flex-direction:column}
.cs-charts .cs-title{min-height:calc(3 * 1.35em)}
.cs-chart{width:100%;height:260px;margin-top:auto}
.cs-tablewrap{padding:0;overflow:hidden}
.cs-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:14px clamp(12px,1.6vw,20px);border-bottom:1px solid ${LINE}}
.cs-search{position:relative;flex:1 1 240px;max-width:420px}
.cs-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af}
.cs-search .cs-input{padding-left:34px}
.cs-scroll{overflow-x:auto}
.cs-table{width:100%;border-collapse:collapse;font-size:13px}
.cs-table th{background:${GREEN};color:#fff;padding:11px 10px;text-align:center;font-weight:650;font-size:12px;line-height:1.3;border-right:1px solid rgba(255,255,255,.25)}
.cs-table td{padding:11px 10px;border-bottom:1px solid ${LINE};border-right:1px solid #f0f0f0;vertical-align:top;line-height:1.45}
.cs-table tbody tr:nth-child(even){background:#fafcfa}
.cs-table tbody tr:hover{background:#f0fdf4}
.cs-c{text-align:center}
.cs-pill{display:inline-block;min-width:26px;padding:2px 8px;border-radius:999px;background:#dcfce7;color:${GREEN};font-weight:700}
.cs-foot{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:12px clamp(12px,1.6vw,20px);border-top:1px solid ${LINE};font-size:13px}
.cs-pages{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.cs-pg{min-width:34px;height:34px;display:inline-grid;place-items:center;border:1px solid #d1d5db;background:#fff;border-radius:8px;cursor:pointer;font-weight:650;font-size:13px;color:${INK}}
.cs-pg[disabled]{opacity:.4;cursor:not-allowed}
.cs-pg.on{background:${GREEN};color:#fff;border-color:${GREEN}}
.cs-empty{padding:32px 16px;text-align:center;color:${MUTED};font-size:14px}
@media (max-width:1399px){.cs-charts{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-charts .cs-title{min-height:0}}
@media (max-width:1100px){.cs-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){.cs-charts{grid-template-columns:minmax(0,1fr)}}
@media (max-width:1100px){.cs-filters{grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.cs-filters .cs-btn{grid-column:1/-1}}
@media (max-width:860px){
  .cs-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .cs-table,.cs-table tbody,.cs-table tr,.cs-table td{display:block;width:100%}
  .cs-table tbody tr{border:1px solid ${LINE};border-radius:12px;margin:10px 12px;width:auto;padding:6px 0;background:#fff!important}
  .cs-table td{border:none;border-bottom:1px dashed #eceff1;display:grid;grid-template-columns:42% 1fr;gap:10px;text-align:left!important;padding:8px 12px}
  .cs-table td:last-child{border-bottom:none}
  .cs-table td::before{content:attr(data-label);font-weight:700;color:${GREEN};font-size:12px}
}
@media (max-width:520px){
  .cs-kpis{grid-template-columns:minmax(0,1fr)}
  .cs-filters{grid-template-columns:1fr}
  .cs-banner{flex-direction:column;align-items:flex-start}
  .cs-badge{width:44px;height:44px;border-radius:12px}
  .cs-foot{justify-content:center}
  .cs-chart{height:220px}
}
@media (min-width:2000px){.cs-root{font-size:17px}.cs-chart{height:320px}}
`;

/* ================= PETITS COMPOSANTS ================= */
const Donut: React.FC<{ pct: number; color: string; fmt: (n: number) => string }> = ({ pct, color, fmt }) => (
  <div className="cs-donut" role="img" aria-label={`${fmt(pct)} %`}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={[{ v: pct }, { v: 100 - pct }]} dataKey="v" startAngle={90} endAngle={-270} innerRadius="74%" outerRadius="100%" stroke="none" isAnimationActive={false}>
          <Cell fill={color} /><Cell fill="#ececec" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <div className="cs-donut-c" style={{ color }}>{fmt(pct)} %</div>
  </div>
);

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <label className="cs-field"><span className="cs-label">{icon}{label}</span>{children}</label>
);

const pageList = (cur: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set([1, total, cur - 1, cur, cur + 1]);
  const arr = [...s].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  arr.forEach((p, i) => { if (i && p - (arr[i - 1] as number) > 1) out.push("…"); out.push(p); });
  return out;
};

/* ================= PAGE ================= */
const DecisionCOSAP: React.FC = () => {
  const { lang } = useLanguage(); // même contexte que Home.tsx : change dès que setLang est appelé
  const t = TXT[lang as string] ?? fr;
  const loc = LOCALES[lang as string] ?? "fr-FR";
  const spec = (r: Row) => r.specification[lang as "fr" | "mg" | "en" | "de"] ?? r.specification.fr;
  const nf = (n: number) => n.toLocaleString(loc, { maximumFractionDigits: 1 });
  const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString(loc, { day: "2-digit", month: "2-digit", year: "numeric" });

  const [year, setYear] = useState(2025);
  const [region, setRegion] = useState("");
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const resetPage = () => setPage(1);

  // Listes de filtres dépendantes (région → aires protégées)
  const regions = useMemo(() => [...new Set(ROWS.map((r) => r.region))].sort(), []);
  const aires = useMemo(() => ROWS.filter((r) => !region || r.region === region), [region]);

  const rows = useMemo(
    () => ROWS.filter((r) => r.annee === year && (!region || r.region === region) && (!code || r.code === code)),
    [year, region, code]
  );

  // Indicateurs calculés à partir des données filtrées
  const k = useMemo(() => {
    const n = rows.length;
    const included = rows.reduce((s, r) => s + Math.min(r.nbrDecision, 3), 0);
    const fj = rows.reduce((s, r) => s + Math.min(r.mesuresFJ, 1), 0);
    const done = rows.filter((r) => r.nbrDecision >= 3 && r.mesuresFJ >= 1).length;
    const count = (f: (r: Row) => boolean) => rows.filter(f).length;
    return {
      n, included, fj, done, target: n * 3,
      pctDec: n ? (included / (n * 3)) * 100 : 0,
      pctFJ: n ? (fj / n) * 100 : 0,
      dec: [
        { name: t.b0, v: count((r) => r.nbrDecision === 0) },
        { name: t.b12, v: count((r) => r.nbrDecision >= 1 && r.nbrDecision <= 2) },
        { name: t.b3, v: count((r) => r.nbrDecision === 3) },
        { name: t.b3p, v: count((r) => r.nbrDecision > 3) },
      ],
      fjBars: [
        { name: t.f0, v: count((r) => r.mesuresFJ === 0) },
        { name: t.f1, v: count((r) => r.mesuresFJ === 1) },
        { name: t.f1p, v: count((r) => r.mesuresFJ > 1) },
      ],
      compare: rows.map((r) => ({
        name: r.code,
        high: r.nbrDecision >= 3 ? r.nbrDecision : 0,
        medium: r.nbrDecision >= 1 && r.nbrDecision < 3 ? r.nbrDecision : 0,
        low: 0,
      })),
    };
  }, [rows, t]);

  // Recherche + pagination du tableau
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.AP, r.region, r.idDecision, spec(r), ...r.communes].join(" ").toLowerCase().includes(q));
  }, [rows, query]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const cur = Math.min(page, pages);
  const start = total ? (cur - 1) * perPage + 1 : 0;
  const end = Math.min(cur * perPage, total);
  const visible = filtered.slice((cur - 1) * perPage, cur * perPage);

  const reset = () => { setYear(2025); setRegion(""); setCode(""); setQuery(""); resetPage(); };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [t.csv.map(esc).join(";")].concat(
      filtered.map((r) => [r.region, r.AP, r.nbrDecision, r.idDecision, fmtDate(r.dateCOSAP), fmtDate(r.dateCommune), r.communes.length, r.communes.join(", "), spec(r)].map(esc).join(";"))
    );
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cosap-decisions-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tip = { fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` };
  const axis = { fontSize: 11, fill: MUTED };

  const barBlock = (title: string, data: { name: string; v: number }[], color: string) => (
    <section className="cs-card" aria-label={title}>
      <h3 className="cs-title">{title}</h3>
      <div className="cs-chart">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 18, right: 8, left: -8, bottom: 22 }}>
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={axis} tickLine={false} label={{ value: t.totalCosap(k.n), position: "insideBottom", offset: -14, fontSize: 11, fontWeight: 700 }} />
            <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
            <Tooltip contentStyle={tip} formatter={(v) => [v as number, t.nbCosap]} cursor={{ fill: "rgba(0,0,0,.04)" }} />
            <Bar dataKey="v" fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} label={{ position: "top", fontSize: 12, fill: INK }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );

  return (
    <div className="cs-root">
      <style>{CSS}</style>
      <div className="cs-wrap">

        {/* ===== EN-TÊTE ===== */}
        <header className="cs-card cs-header">
          <div className="cs-brand">
            <div className="cs-badge" aria-hidden="true"><TreePine size={28} /></div>
            <div style={{ minWidth: 0 }}>
              <h1 className="cs-h1">{t.title}</h1>
              <p className="cs-sub">{t.subtitle}</p>
            </div>
          </div>

          <div className="cs-filters">
            <Field icon={<Calendar size={14} />} label={t.year}>
              <select className="cs-select" value={year} onChange={(e) => { setYear(Number(e.target.value)); resetPage(); }}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field icon={<MapPin size={14} />} label={t.region}>
              <select className="cs-select" value={region} onChange={(e) => { setRegion(e.target.value); setCode(""); resetPage(); }}>
                <option value="">{t.allRegions}</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field icon={<Landmark size={14} />} label={t.aire}>
              <select className="cs-select" value={code} onChange={(e) => { setCode(e.target.value); resetPage(); }}>
                <option value="">{t.allAires}</option>
                {aires.map((r) => <option key={r.code} value={r.code}>{r.AP}</option>)}
              </select>
            </Field>
            <button className="cs-btn" onClick={reset}><RefreshCcw size={14} />{t.reset}</button>
          </div>
        </header>

        {/* ===== BANDEAU INDICATEUR ===== */}
        <div className="cs-card cs-banner">
          <Target size={40} color="#16a34a" style={{ flex: "none" }} aria-hidden="true" />
          <p><strong>{t.indicator}</strong> {t.indicatorText(k.n)}</p>
        </div>

        {/* ===== KPI ===== */}
        <div className="cs-kpis">
          <section className="cs-card cs-kpi-donut">
            <Donut pct={k.pctDec} color={GREEN} fmt={nf} />
            <div>
              <p className="cs-eyebrow">{t.kpiDecisions}</p>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t.decisionsOf(k.included, k.target)}</div>
              <div className="cs-small">{t.targetDecisions(k.target)}</div>
            </div>
          </section>

          <section className="cs-card cs-kpi-donut">
            <Donut pct={k.pctFJ} color={LIME} fmt={nf} />
            <div>
              <p className="cs-eyebrow">{t.kpiFJ}</p>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t.measuresOf(k.fj, k.n)}</div>
              <div className="cs-small">{t.targetMeasures(k.n)}</div>
            </div>
          </section>

          <section className="cs-card">
            <p className="cs-eyebrow">{t.cosapDone}</p>
            <div className="cs-big">{k.done} <span style={{ fontSize: "0.55em", color: MUTED, fontWeight: 600 }}>/ {k.n}</span></div>
            <div className="cs-small">{t.cosapDoneHint}</div>
          </section>

          <section className="cs-card">
            <p className="cs-eyebrow"><Users size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t.cosapTotal}</p>
            <div className="cs-big">{k.n}</div>
            <div className="cs-small">{t.cosapTotalHint}</div>
          </section>
        </div>

        {/* ===== GRAPHIQUES ===== */}
        <div className="cs-charts">
          {barBlock(t.chartDec, k.dec, GREEN)}
          {barBlock(t.chartFJ, k.fjBars, LIME)}

          <section className="cs-card" aria-label={t.trendTitle}>
            <h3 className="cs-title">{t.trendTitle}</h3>
            <div className="cs-chart">
              <ResponsiveContainer>
                <LineChart data={TREND} margin={{ top: 10, right: 14, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="y" tick={axis} padding={{ left: 12, right: 12 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tick={axis} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={tip} formatter={(v) => `${nf(v as number)} %`} />
                  <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={year} stroke="#9ca3af" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="v" name={t.sDecisions} stroke={GREEN} strokeWidth={2.4} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="v2" name={t.sFJ} stroke={AMBER} strokeWidth={2.4} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="cs-card" aria-label={t.compareTitle}>
            <h3 className="cs-title">{t.compareTitle}</h3>
            <div className="cs-chart">
              <ResponsiveContainer>
                <BarChart data={k.compare} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={axis} interval={0} tickLine={false} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={34}
                    label={{ value: t.nbDecisions, angle: -90, position: "insideLeft", offset: 22, fontSize: 11, fontWeight: 700 }} />
                  <Tooltip contentStyle={tip} cursor={{ fill: "rgba(0,0,0,.04)" }} />
                  <ReferenceLine y={3} stroke="#555" strokeDasharray="4 4" label={{ value: t.targetLine, position: "right", fontSize: 10, fill: "#555" }} />
                  <Bar dataKey="high" stackId="a" name={t.lHigh} fill={GREEN} maxBarSize={36} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="medium" stackId="a" name={t.lMed} fill={GREEN_MID} maxBarSize={36} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="low" stackId="a" name={t.lLow} fill={AMBER} maxBarSize={36} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ===== TABLEAU DÉTAIL ===== */}
        <section className="cs-card cs-tablewrap" aria-label={t.tableTitle}>
          <div className="cs-toolbar">
            <h3 className="cs-title" style={{ margin: 0 }}>{t.tableTitle}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "1 1 320px", justifyContent: "flex-end" }}>
              <div className="cs-search">
                <Search size={16} aria-hidden="true" />
                <input className="cs-input" type="search" placeholder={t.searchPh} aria-label={t.searchPh} value={query} onChange={(e) => { setQuery(e.target.value); resetPage(); }} />
              </div>
              <button className="cs-btn alt" onClick={exportCsv} disabled={!total}><Download size={14} />{t.export}</button>
            </div>
          </div>

          {total === 0 ? (
            <div className="cs-empty">{t.noResult}</div>
          ) : (
            <div className="cs-scroll">
              <table className="cs-table">
                <thead>
                  <tr>{t.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.idDecision}>
                      <td data-label={t.cols[0]}>{r.region}</td>
                      <td data-label={t.cols[1]}><strong>{r.AP}</strong> ({r.code})</td>
                      <td data-label={t.cols[2]} className="cs-c"><span className="cs-pill">{r.nbrDecision}</span></td>
                      <td data-label={t.cols[3]} className="cs-c">{r.idDecision}</td>
                      <td data-label={t.cols[4]} className="cs-c">{fmtDate(r.dateCOSAP)}</td>
                      <td data-label={t.cols[5]} className="cs-c">{fmtDate(r.dateCommune)}</td>
                      <td data-label={t.cols[6]} className="cs-c">{r.communes.length}</td>
                      <td data-label={t.cols[7]}>{r.communes.join(", ")}</td>
                      <td data-label={t.cols[8]}>{spec(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="cs-foot">
            <span style={{ color: MUTED, fontWeight: 650 }}>{t.showing(start, end, total)}</span>

            <nav className="cs-pages" aria-label="Pagination">
              <button className="cs-pg" aria-label={t.first} disabled={cur === 1} onClick={() => setPage(1)}><ChevronsLeft size={16} /></button>
              <button className="cs-pg" aria-label={t.prev} disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
              {pageList(cur, pages).map((p, i) =>
                p === "…" ? <span key={`e${i}`} style={{ padding: "0 4px" }}>…</span> : (
                  <button key={p} className={`cs-pg${p === cur ? " on" : ""}`} aria-current={p === cur ? "page" : undefined} onClick={() => setPage(p)}>{p}</button>
                )
              )}
              <button className="cs-pg" aria-label={t.next} disabled={cur === pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
              <button className="cs-pg" aria-label={t.last} disabled={cur === pages} onClick={() => setPage(pages)}><ChevronsRight size={16} /></button>
            </nav>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              {t.rowsPerPage}
              <select className="cs-select" style={{ width: 72 }} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); resetPage(); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DecisionCOSAP;
