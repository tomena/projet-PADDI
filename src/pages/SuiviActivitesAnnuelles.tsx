import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import ActivitesAccessModal from "../components/ActivitesAccessModal";
import UpdateActivitesModal from "../components/UpdateActivitesModal";
import {
  CalendarDays, RotateCcw, RefreshCw, Download, CheckCircle, ListChecks, Clock, XCircle,
  Leaf, ShieldCheck, Mountain, BriefcaseBusiness, Building2, Users, Trees, ClipboardCheck, FileText,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";

/* ================= TRADUCTIONS =================
   `fr` sert de modèle : TypeScript impose les mêmes clés dans mg / en / de. */

const fr = {
  title: "SUIVI DES ACTIVITÉS ANNUELLES",
  subtitle: "Plan Stratégique 2024 – 2030",
  updated: "Données mises à jour",
  update: "Mettre à jour",
  loading: "Chargement...",
  noUpdate: "Aucune mise à jour enregistrée",
  dateUnavailable: "Date indisponible",

  year: "ANNÉE",
  month: "MOIS",
  unit: "UNITÉ DE COORDINATION",
  all: "Tous",
  reset: "Réinitialiser les filtres",
  export: "Exporter",
  exportTitle: "Exporter en Excel",
  noDataYear: "Aucune donnée disponible pour l'année",

  globalProgress: "TAUX D’AVANCEMENT GLOBAL DES ACTIVITÉS",
  totalPlanned: "Total activités planifiées",
  completed: "Activités achevées",
  ongoing: "Activités en cours",
  notStarted: "Activités non démarrées",

  byAchievement: "TAUX D’AVANCEMENT PAR RÉALISATION",
  byComponent: "TAUX D’AVANCEMENT PAR COMPOSANTE",

  result1: "R1. SYSTÈME DE GESTION",
  result2: "R2. AMÉNAGEMENT DU TERRITOIRE",

  componentC1: "C1. GESTION DES SERVICES ÉCOSYSTÉMIQUES",
  componentC2: "C2. GOUVERNANCE ENVIRONNEMENTALE DÉCENTRALISÉE",
  componentC3: "C3. DÉVELOPPEMENT DES PAYSAGES PRODUCTIFS",
  componentC4: "C4. CRÉATION D’EMPLOIS VERTS",

  axisPriority: "AXE PRIORITAIRE",
  progressRate: "TAUX D'AVANCEMENT",
  axis1Title: "AXES PRIORITAIRES DE LA RÉALISATION 1 : SYSTÈME DE GESTION",
  axis2Title: "AXES PRIORITAIRES DE LA RÉALISATION 2 : AMÉNAGEMENT DU TERRITOIRE",

  diagnostic: "Analyses diagnostiques",
  territorialPlanning: "Planification territoriale",
  ecosystemMonitoring: "Suivi écosystémique",
  sustainableFinancing: "Financement durable",
  populationParticipation: "Participation des populations",
  mnpCooperation: "Coopération avec MNP",
  intersectoralCoordination: "Coordination intersectorielle",
  antiCorruption: "Lutte contre la corruption",

  landscapeRestoration: "Restauration paysages",
  sustainableProduction: "Production durable",
  landSecurity: "Sécurisation foncière",
  fireManagement: "Gestion des feux",
  marketSystem: "Système de marché",
  productionValorization: "Valorisation des productions",
  activityDiversification: "Diversification des activités",
  communityMobilization: "Mobilisation communautaire",

  legend: "LÉGENDE (TAUX D'AVANCEMENT)",
  range0_25: "0 à 25%",
  range25_50: "25% à 50%",
  range50_75: "50% à 75%",
  range75_100: "75% à 100%",

  accessTitle: "ACCÉDER AU SUIVI DES ACTIVITÉS ANNUELLES DE L’ANNÉE CHOISIE",
  accessDesc: "Consultez le détail des activités",
  accessBtn: "Accéder au suivi des activités",

  months: {
    Janvier: "Janvier", Février: "Février", Mars: "Mars", Avril: "Avril", Mai: "Mai", Juin: "Juin",
    Juillet: "Juillet", Août: "Août", Septembre: "Septembre", Octobre: "Octobre", Novembre: "Novembre", Décembre: "Décembre",
  } as Record<string, string>,
};

type Txt = typeof fr;

const mg: Txt = {
  title: "FANARAHANA NY ASA ISAN-TAONA",
  subtitle: "Drafitra stratejika 2024 – 2030",
  updated: "Angon-drakitra nohavaozina",
  update: "Havaozina",
  loading: "Eo am-pakàna...",
  noUpdate: "Tsy mbola misy fanavaozana voarakitra",
  dateUnavailable: "Tsy azo jerena ny daty",

  year: "TAONA",
  month: "VOLANA",
  unit: "SAMPANA MPANDRINDRA",
  all: "Rehetra",
  reset: "Avereno ny sivana",
  export: "Alefa",
  exportTitle: "Alefa amin'ny Excel",
  noDataYear: "Tsy misy angon-drakitra ho an'ny taona",

  globalProgress: "TAHA-PANDROSOANA ANKAPOBENY NY ASA",
  totalPlanned: "Fitambaran'ny asa voalamina",
  completed: "Asa vita",
  ongoing: "Asa mbola mandeha",
  notStarted: "Asa mbola tsy natomboka",

  byAchievement: "TAHA-PANDROSOANA ISAKY NY ZAVA-BITA",
  byComponent: "TAHA-PANDROSOANA ISAKY NY SINGA",

  result1: "R1. RAFITRA FITANTANANA",
  result2: "R2. FANDAMINANA NY TONTOLON-TANY",

  componentC1: "C1. FITANTANANA NY SERIVISY ARA-TONTOLO IAINANA",
  componentC2: "C2. FITANTANANA NY TONTOLON'AINA IFOTONY",
  componentC3: "C3. FAMPANDROSOANA NY TONTOLON-TANY MPAMOKATRA",
  componentC4: "C4. FAMORONANA ASA MAITSO",

  axisPriority: "LAHARANA LAHARANA",
  progressRate: "TAHA-PANDROSOANA",
  axis1Title: "LAHARAM-PAHAMEHANA AMIN'NY ZAVA-BITA 1 : RAFITRA FITANTANANA",
  axis2Title: "LAHARAM-PAHAMEHANA AMIN'NY ZAVA-BITA 2 : FANDAMINANA NY TONTOLON-TANY",

  diagnostic: "Fanadihadiana diagnostika",
  territorialPlanning: "Fandaminana ny faritra",
  ecosystemMonitoring: "Fanaraha-maso ny tontolo iainana",
  sustainableFinancing: "Famatsiam-bola maharitra",
  populationParticipation: "Fandraisan'anjaran'ny mponina",
  mnpCooperation: "Fiaraha-miasa amin'ny MNP",
  intersectoralCoordination: "Fandrindrana eo amin'ny sehatra",
  antiCorruption: "Ady amin'ny kolikoly",

  landscapeRestoration: "Famerenana amin'ny laoniny ny tontolo-tany",
  sustainableProduction: "Famokarana maharitra",
  landSecurity: "Fiarovana ny fananan-tany",
  fireManagement: "Fitantanana ny doro-tanety",
  marketSystem: "Rafitra ara-barotra",
  productionValorization: "Fanomezana lanja ny vokatra",
  activityDiversification: "Fanamaroana ny asa",
  communityMobilization: "Fanentanana ny vondrom-piarahamonina",

  legend: "FANAZAVANA (TAHA-PANDROSOANA)",
  range0_25: "0 hatramin'ny 25%",
  range25_50: "25% hatramin'ny 50%",
  range50_75: "50% hatramin'ny 75%",
  range75_100: "75% hatramin'ny 100%",

  accessTitle: "HIDITRA AMIN'NY FANARAHANA NY ASA ISAN-TAONA VOAFIDY",
  accessDesc: "Jereo amin'ny antsipiriany ny asa",
  accessBtn: "Hiditra amin'ny fanaraha-maso ny asa",

  months: {
    Janvier: "Janoary", Février: "Febroary", Mars: "Martsa", Avril: "Aprily", Mai: "Mey", Juin: "Jona",
    Juillet: "Jolay", Août: "Aogositra", Septembre: "Septambra", Octobre: "Oktobra", Novembre: "Novambra", Décembre: "Desambra",
  },
};

const en: Txt = {
  title: "ANNUAL ACTIVITY MONITORING",
  subtitle: "Strategic Plan 2024 – 2030",
  updated: "Data updated",
  update: "Update",
  loading: "Loading...",
  noUpdate: "No update recorded",
  dateUnavailable: "Date unavailable",

  year: "YEAR",
  month: "MONTH",
  unit: "COORDINATION UNIT",
  all: "All",
  reset: "Reset filters",
  export: "Export",
  exportTitle: "Export to Excel",
  noDataYear: "No data available for the year",

  globalProgress: "OVERALL ACTIVITY PROGRESS RATE",
  totalPlanned: "Total planned activities",
  completed: "Completed activities",
  ongoing: "Ongoing activities",
  notStarted: "Activities not started",

  byAchievement: "PROGRESS RATE BY RESULT",
  byComponent: "PROGRESS RATE BY COMPONENT",

  result1: "R1. MANAGEMENT SYSTEM",
  result2: "R2. LAND-USE PLANNING",

  componentC1: "C1. ECOSYSTEM SERVICES MANAGEMENT",
  componentC2: "C2. DECENTRALIZED ENVIRONMENTAL GOVERNANCE",
  componentC3: "C3. DEVELOPMENT OF PRODUCTIVE LANDSCAPES",
  componentC4: "C4. CREATION OF GREEN JOBS",

  axisPriority: "PRIORITY AXIS",
  progressRate: "PROGRESS RATE",
  axis1Title: "PRIORITY AXES OF RESULT 1: MANAGEMENT SYSTEM",
  axis2Title: "PRIORITY AXES OF RESULT 2: LAND-USE PLANNING",

  diagnostic: "Diagnostic analyses",
  territorialPlanning: "Territorial planning",
  ecosystemMonitoring: "Ecosystem monitoring",
  sustainableFinancing: "Sustainable financing",
  populationParticipation: "Population participation",
  mnpCooperation: "Cooperation with MNP",
  intersectoralCoordination: "Intersectoral coordination",
  antiCorruption: "Fight against corruption",

  landscapeRestoration: "Landscape restoration",
  sustainableProduction: "Sustainable production",
  landSecurity: "Land tenure security",
  fireManagement: "Fire management",
  marketSystem: "Market system",
  productionValorization: "Production valorization",
  activityDiversification: "Activity diversification",
  communityMobilization: "Community mobilization",

  legend: "LEGEND (PROGRESS RATE)",
  range0_25: "0 to 25%",
  range25_50: "25% to 50%",
  range50_75: "50% to 75%",
  range75_100: "75% to 100%",

  accessTitle: "ACCESS ANNUAL ACTIVITY MONITORING FOR THE SELECTED YEAR",
  accessDesc: "View activity details",
  accessBtn: "Access activity monitoring",

  months: {
    Janvier: "January", Février: "February", Mars: "March", Avril: "April", Mai: "May", Juin: "June",
    Juillet: "July", Août: "August", Septembre: "September", Octobre: "October", Novembre: "November", Décembre: "December",
  },
};

const de: Txt = {
  title: "JÄHRLICHE AKTIVITÄTSÜBERWACHUNG",
  subtitle: "Strategischer Plan 2024 – 2030",
  updated: "Daten aktualisiert",
  update: "Aktualisieren",
  loading: "Wird geladen...",
  noUpdate: "Keine Aktualisierung erfasst",
  dateUnavailable: "Datum nicht verfügbar",

  year: "JAHR",
  month: "MONAT",
  unit: "KOORDINATIONSEINHEIT",
  all: "Alle",
  reset: "Filter zurücksetzen",
  export: "Exportieren",
  exportTitle: "Nach Excel exportieren",
  noDataYear: "Keine Daten verfügbar für das Jahr",

  globalProgress: "GESAMTFORTSCHRITTSRATE DER AKTIVITÄTEN",
  totalPlanned: "Insgesamt geplante Aktivitäten",
  completed: "Abgeschlossene Aktivitäten",
  ongoing: "Laufende Aktivitäten",
  notStarted: "Noch nicht gestartete Aktivitäten",

  byAchievement: "FORTSCHRITTSRATE NACH ERGEBNIS",
  byComponent: "FORTSCHRITTSRATE NACH KOMPONENTE",

  result1: "R1. MANAGEMENTSYSTEM",
  result2: "R2. RAUMORDNUNG",

  componentC1: "C1. MANAGEMENT VON ÖKOSYSTEMDIENSTLEISTUNGEN",
  componentC2: "C2. DEZENTRALISIERTE UMWELTGOVERNANCE",
  componentC3: "C3. ENTWICKLUNG PRODUKTIVER LANDSCHAFTEN",
  componentC4: "C4. SCHAFFUNG GRÜNER ARBEITSPLÄTZE",

  axisPriority: "PRIORITÄTSACHSE",
  progressRate: "FORTSCHRITTSRATE",
  axis1Title: "PRIORITÄTSACHSEN DES ERGEBNISSES 1: MANAGEMENTSYSTEM",
  axis2Title: "PRIORITÄTSACHSEN DES ERGEBNISSES 2: RAUMORDNUNG",

  diagnostic: "Diagnostische Analysen",
  territorialPlanning: "Raumplanung",
  ecosystemMonitoring: "Ökosystemüberwachung",
  sustainableFinancing: "Nachhaltige Finanzierung",
  populationParticipation: "Beteiligung der Bevölkerung",
  mnpCooperation: "Zusammenarbeit mit MNP",
  intersectoralCoordination: "Sektorübergreifende Koordination",
  antiCorruption: "Korruptionsbekämpfung",

  landscapeRestoration: "Landschaftswiederherstellung",
  sustainableProduction: "Nachhaltige Produktion",
  landSecurity: "Sicherung von Landrechten",
  fireManagement: "Feuermanagement",
  marketSystem: "Marktsystem",
  productionValorization: "Aufwertung der Produktion",
  activityDiversification: "Diversifizierung der Aktivitäten",
  communityMobilization: "Mobilisierung der Gemeinschaft",

  legend: "LEGENDE (FORTSCHRITTSRATE)",
  range0_25: "0 bis 25%",
  range25_50: "25% bis 50%",
  range50_75: "50% bis 75%",
  range75_100: "75% bis 100%",

  accessTitle: "ZUGRIFF AUF DIE JÄHRLICHE AKTIVITÄTSÜBERWACHUNG DES AUSGEWÄHLTEN JAHRES",
  accessDesc: "Details zu den Aktivitäten anzeigen",
  accessBtn: "Zur Aktivitätsüberwachung",

  months: {
    Janvier: "Januar", Février: "Februar", Mars: "März", Avril: "April", Mai: "Mai", Juin: "Juni",
    Juillet: "Juli", Août: "August", Septembre: "September", Octobre: "Oktober", Novembre: "November", Décembre: "Dezember",
  },
};

const TEXT: Record<string, Txt> = { fr, mg, en, de };
const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };

/* ================= CONFIGURATION ================= */

interface LigneActivite {
  Année: number;
  Mois: string;
  UC: string;
  [key: string]: any;
}

const ordreMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const COMPOSANTES: { code: string; key: keyof Txt; icon: any }[] = [
  { code: "C1", key: "componentC1", icon: Leaf },
  { code: "C2", key: "componentC2", icon: ShieldCheck },
  { code: "C3", key: "componentC3", icon: Mountain },
  { code: "C4", key: "componentC4", icon: BriefcaseBusiness },
];

const AXES: { titleKey: keyof Txt; icon: any; items: [string, keyof Txt][] }[] = [
  {
    titleKey: "axis1Title", icon: Users,
    items: [
      ["1.1.1", "diagnostic"], ["1.1.2", "territorialPlanning"], ["1.1.3", "ecosystemMonitoring"], ["1.1.4", "sustainableFinancing"],
      ["1.2.1", "populationParticipation"], ["1.2.2", "mnpCooperation"], ["1.2.3", "intersectoralCoordination"], ["1.2.4", "antiCorruption"],
    ],
  },
  {
    titleKey: "axis2Title", icon: Trees,
    items: [
      ["2.1.1", "landscapeRestoration"], ["2.1.2", "sustainableProduction"], ["2.1.3", "landSecurity"], ["2.1.4", "fireManagement"],
      ["2.2.1", "marketSystem"], ["2.2.2", "productionValorization"], ["2.2.3", "activityDiversification"], ["2.2.4", "communityMobilization"],
    ],
  },
];

// 29 colonnes de l'export Excel, dans l'ordre du modèle
const EXPORT_COLONNES: { titre: string; champ: string }[] = [
  { titre: "Année", champ: "Année" }, { titre: "Mois", champ: "Mois" }, { titre: "UC", champ: "UC" },
  { titre: "TAP", champ: "NAP" }, { titre: "AA", champ: "NAA" }, { titre: "AC", champ: "NAC" }, { titre: "AND", champ: "NAD" },
  { titre: "R1.SG", champ: "TAR 1" }, { titre: "R2.AT", champ: "TAR 2" },
  { titre: "C1.GSE", champ: "TAC C1" }, { titre: "C2.GED", champ: "TAC C2" }, { titre: "C3.DPP", champ: "TAC C3" }, { titre: "C4.CEV", champ: "TAC C4" },
  { titre: "1.1.1 AD", champ: "TAA 1.1.1" }, { titre: "1.1.2 PT", champ: "TAA 1.1.2" }, { titre: "1.1.3 SE", champ: "TAA 1.1.3" }, { titre: "1.1.4 FD", champ: "TAA 1.1.4" },
  { titre: "1.2.1 PP", champ: "TAA 1.2.1" }, { titre: "1.2.2 CMNP", champ: "TAA 1.2.2" }, { titre: "1.2.3 CI", champ: "TAA 1.2.3" }, { titre: "1.2.4 LCC", champ: "TAA 1.2.4" },
  { titre: "2.1.1 RP", champ: "TAA 2.1.1" }, { titre: "2.1.2 PD", champ: "TAA 2.1.2" }, { titre: "2.1.3 SF", champ: "TAA 2.1.3" }, { titre: "2.1.4 GF", champ: "TAA 2.1.4" },
  { titre: "2.2.1 SM", champ: "TAA 2.2.1" }, { titre: "2.2.2 VP", champ: "TAA 2.2.2" }, { titre: "2.2.3 DA", champ: "TAA 2.2.3" }, { titre: "2.2.4 MC", champ: "TAA 2.2.4" },
];

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clampPct = (p: number) => Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0));
const parMois = (a: any, b: any) => ordreMois.indexOf(a.Mois) - ordreMois.indexOf(b.Mois);

// Même échelle que la légende : rouge ≤ 25 · orange ≤ 50 · vert ≤ 75 · bleu au-delà
// (avant : jaune #facc15 dans les barres mais orange #f59e0b dans la légende)
const getProgressColor = (value: number) =>
  value <= 25 ? "#ef4444" : value <= 50 ? "#f59e0b" : value <= 75 ? "#22c55e" : "#2563eb";

/* ================= CSS RESPONSIVE =================
   - grilles de page : container query « sa » (largeur réelle de la page)
   - grilles internes : container query sur la carte elle-même
   - grands écrans (≥1920 px) : toute la page est agrandie pour rester lisible. */

const RESPONSIVE_CSS = `
.sa-page{container-type:inline-size;container-name:sa;width:100%;font-family:Inter,system-ui,sans-serif}
.sa-zoom{display:flex;flex-direction:column;gap:10px;padding:clamp(8px,2vw,16px);box-sizing:border-box;min-width:0}
@media (min-width:1920px){.sa-zoom{zoom:1.2}}
@media (min-width:2560px){.sa-zoom{zoom:1.5}}
@media (min-width:3200px){.sa-zoom{zoom:1.9}}
@media (min-width:3840px){.sa-zoom{zoom:2.3}}

.sa-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(200px,.7fr);gap:6px;align-items:stretch;
  background:#fff;border:1px solid #dbe4f0;border-radius:10px;padding:6px 8px;box-sizing:border-box}
.sa-filter{display:flex;align-items:center;gap:8px;padding:6px 10px;border-right:1px solid #e5e7eb;min-width:0}
.sa-select{font-size:13px}
.sa-actions{display:flex;flex-direction:column;justify-content:center;gap:5px;padding-left:4px}
.sa-btn{width:100%;min-height:40px;box-sizing:border-box;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;line-height:1.1;transition:background .2s ease}
.sa-btn-ghost{border:1px solid #cbd5e1;background:#fff;color:#475569}
.sa-btn-ghost:hover{background:#f1f5f9}
.sa-btn-primary{border:1px solid #2563eb;background:#2563eb;color:#fff}
.sa-btn-primary:hover{background:#1d4ed8}
.sa-btn-export{width:42px;min-height:50px;padding:0;border:1px solid #15803d;background:#15803d;color:#fff}
.sa-btn-export:hover{background:#166534}

.sa-top{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.7fr);gap:8px;align-items:stretch}
.sa-axes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:start}
.sa-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 12px;align-items:center;
  background:#fff;border:1px solid #dbe4f0;border-radius:12px;padding:8px 12px 12px}
.sa-footer-head{grid-column:1/-1}

.sa-card{container-type:inline-size;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:10px;
  box-sizing:border-box;display:flex;flex-direction:column;min-width:0}
.sa-comp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px;flex:1}
.sa-axrow{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(4px,1vw,10px);align-items:center;
  padding:4px 0;border-bottom:1px solid #f1f5f9}

@container (min-width:560px){.sa-comp{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container (max-width:359px){.sa-axrow{grid-template-columns:minmax(0,1fr)}}

@container sa (max-width:1099px){
  .sa-filters{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sa-filter{border:1px solid #e5e7eb;border-radius:8px}
  .sa-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;padding-left:0}
  .sa-actions .sa-btn{flex:1 1 180px;width:auto}
  .sa-top{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sa-top>:last-child{grid-column:1/-1}
}
@container sa (max-width:899px){
  .sa-axes,.sa-footer{grid-template-columns:minmax(0,1fr)}
}
@container sa (max-width:699px){
  .sa-top{grid-template-columns:minmax(0,1fr)}
  .sa-top>:last-child{grid-column:auto}
}
@container sa (max-width:479px){
  .sa-filters{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:640px){.sa-select{font-size:16px}}
`;

/* ================= COMPOSANTS ================= */

function Ring({ percent, color, size, inner, outer, font, label }: any) {
  const p = clampPct(percent);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", flexShrink: 0 }}>
      <PieChart width={size} height={size}>
        <Pie data={[{ value: p }, { value: 100 - p }]} innerRadius={inner} outerRadius={outer} dataKey="value">
          <Cell fill={color} />
          <Cell fill="#e5e7eb" />
        </Pie>
      </PieChart>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        fontWeight: 900, fontSize: font, color, lineHeight: 1, pointerEvents: "none",
      }}>
        {label}
      </div>
    </div>
  );
}

function AxisCard({ title, icon: Icon, rows, t, fmtPct }: any) {
  return (
    <div className="sa-card">
      <div style={styles.axisHeader}>
        <Icon size={18} color="#fff" style={{ flexShrink: 0 }} />
        <span>{title}</span>
      </div>

      <div style={styles.axisTableHeader}>
        <div>{t.axisPriority}</div>
        <div>{t.progressRate}</div>
      </div>

      {rows.map((a: any) => {
        const p = clampPct(a.value);
        return (
          <div key={a.code} className="sa-axrow">
            <div style={styles.axisLeftCol}>
              <span style={styles.axisCode}>{a.code}</span>
              <span style={styles.axisName}>{a.name}</span>
            </div>
            <div style={styles.axisRightCol}>
              <div style={styles.axisBar}>
                <div style={{ ...styles.axisFill, width: `${p}%`, background: getProgressColor(a.value) }} />
              </div>
              <div style={styles.axisPercent}>{fmtPct(a.value)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= PAGE ================= */

type MajStatus = { status: "loading" | "ok" | "none" | "error"; date?: string };

export default function SuiviActivitesAnnuelles() {
  const { lang } = useLanguage();
  const t = TEXT[lang as string] ?? TEXT.fr;
  const locale = LOCALES[lang as string] ?? "fr-FR";
  const fmtPct = (v: number) =>
    `${v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  const [data, setData] = useState<LigneActivite[]>([]);
  const [annee, setAnnee] = useState<number>(2026);
  const [mois, setMois] = useState<string>("Tous");
  const [uc, setUc] = useState<string>("Tous");
  const [maj, setMaj] = useState<MajStatus>({ status: "loading" });

  const [showLogin, setShowLogin] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [userName, setUserName] = useState("");
  const [userIdentifiant, setUserIdentifiant] = useState("");
  const [userMotDePasse, setUserMotDePasse] = useState("");

  const handleReset = () => { setAnnee(2026); setMois("Tous"); setUc("Tous"); };

  /* ----- chargement ----- */
  const chargerDateMiseAJour = async () => {
    try {
      const response = await fetch("/api/derniere-mise-a-jour", { cache: "no-store" });
      if (!response.ok) throw new Error("Erreur lors de la récupération de la date.");
      const result = await response.json();
      setMaj(result.date ? { status: "ok", date: result.date } : { status: "none" });
    } catch (error) {
      console.error("Erreur de chargement de la date :", error);
      setMaj({ status: "error" });
    }
  };

  const chargerDonnees = async () => {
    try {
      const response = await fetch("/api/update-geojson?tout=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Impossible de charger les données à jour.");
      const json = await response.json();
      setData(json.features.map((f: any) => f.properties));
    } catch (error) {
      console.error("Erreur de chargement des activités :", error);
    }
  };

  useEffect(() => { chargerDateMiseAJour(); chargerDonnees(); }, []);

  const dateAffichee = (() => {
    if (maj.status === "loading") return t.loading;
    if (maj.status === "none") return t.noUpdate;
    if (maj.status === "error" || !maj.date) return t.dateUnavailable;
    const d = new Date(maj.date);
    if (Number.isNaN(d.getTime())) return t.dateUnavailable;
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo" }).format(d);
  })();

  /* ----- listes des filtres ----- */
  const annees = useMemo(() => Array.from(new Set(data.map((d) => d.Année))).sort((a, b) => a - b), [data]);
  const moisListe = useMemo(() => ordreMois.filter((m) => data.some((d) => d.Mois === m)), [data]);
  // « Tous » est toujours proposé en premier
  const ucOptions = useMemo(
    () => ["Tous", ...Array.from(new Set(data.map((d) => d.UC))).filter((u) => u !== "Tous")],
    [data]
  );

  /* ----- ligne affichée -----
     • UC « Tous » : on prend la ligne « Tous » (total du programme) ; si la base n'en a pas, on garde toutes les lignes
     • Mois « Tous » : on prend le dernier mois qui a de l'avancement (avant : simplement la 1re ligne trouvée) */
  const coutActuel: Record<string, any> = useMemo(() => {
    const parAnnee = data.filter((d) => d.Année === annee);
    let lignes = parAnnee.filter((d) => d.UC === uc);
    if (!lignes.length && uc === "Tous") lignes = parAnnee;
    lignes = [...lignes].sort(parMois);

    if (mois !== "Tous") return lignes.find((d) => d.Mois === mois) ?? {};
    return (
      [...lignes].reverse().find((d) => n(d.NAA) > 0 || n(d.NAC) > 0 || n(d.TAG) > 0) ?? lignes[0] ?? {}
    );
  }, [data, annee, mois, uc]);

  /* ----- indicateurs ----- */
  const totalActivites = n(coutActuel["NAP"]);
  const tauxGlobal = n(coutActuel["TAG"]) * 100;
  const couleurGlobal = getProgressColor(tauxGlobal);

  const kpis = [
    { icon: ListChecks, label: t.totalPlanned, value: totalActivites },
    { icon: CheckCircle, label: t.completed, value: n(coutActuel["NAA"]) },
    { icon: Clock, label: t.ongoing, value: n(coutActuel["NAC"]) },
    { icon: XCircle, label: t.notStarted, value: n(coutActuel["NAD"]) },
  ];

  const results = [
    { label: t.result1, percent: n(coutActuel["TAR 1"]) * 100 },
    { label: t.result2, percent: n(coutActuel["TAR 2"]) * 100 },
  ];

  const composantes = COMPOSANTES.map(({ code, key, icon }) => ({
    label: t[key] as string,
    icon,
    percent: n(coutActuel[`TAC ${code}`]) * 100,
  }));

  const axes = AXES.map(({ titleKey, icon, items }) => ({
    title: t[titleKey] as string,
    icon,
    rows: items.map(([code, key]) => ({ code, name: t[key] as string, value: n(coutActuel[`TAA ${code}`]) * 100 })),
  }));

  /* ----- sous-titres des filtres (dynamiques) ----- */
  const subAnnee = annees.length ? `${annees[0]} - ${annees[annees.length - 1]}` : "";
  const subMois = moisListe.length
    ? `${t.months[moisListe[0]] ?? moisListe[0]} - ${t.months[moisListe[moisListe.length - 1]] ?? moisListe[moisListe.length - 1]}`
    : "";
  const subUC = ucOptions.filter((u) => u !== "Tous").join(", ");

  /* ----- export Excel (la librairie n'est chargée qu'au clic) ----- */
  const handleExportExcel = async () => {
    const lignes = data.filter((l) => Number(l["Année"]) === Number(annee));
    if (lignes.length === 0) {
      alert(`${t.noDataYear} ${annee}.`);
      return;
    }

    const XLSX = await import("xlsx");

    const nbCols = EXPORT_COLONNES.length; // 29
    const entete1 = Array(nbCols).fill("");
    const entete2 = Array(nbCols).fill("");
    const entete3 = EXPORT_COLONNES.map((c) => c.titre);

    entete1[0] = "Année";
    entete1[1] = "Mois";
    entete1[2] = "UC";
    entete1[3] = "Taux d'Avancement";
    entete1[13] = "Axes prioritaires";

    entete2[3] = "Avancement Global des Activités";
    entete2[7] = "Avancement par réalisation";
    entete2[9] = "Avancement par composante";
    entete2[13] = "Système de gestion";
    entete2[21] = "Aménagement du territoire";

    const lignesExcel = lignes.map((l) => EXPORT_COLONNES.map(({ champ }) => l[champ] ?? null));
    const worksheet = XLSX.utils.aoa_to_sheet([entete1, entete2, entete3, ...lignesExcel]);

    worksheet["!merges"] = [
      // colonnes fixes sur les trois niveaux
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
      // niveau 1 : les deux blocs ne se chevauchent plus
      // (avant, « Taux d'Avancement » couvrait aussi les colonnes 13-28 => Excel signalait un fichier corrompu)
      { s: { r: 0, c: 3 }, e: { r: 0, c: 12 } },
      { s: { r: 0, c: 13 }, e: { r: 0, c: 28 } },
      // niveau 2
      { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } },
      { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },
      { s: { r: 1, c: 9 }, e: { r: 1, c: 12 } },
      { s: { r: 1, c: 13 }, e: { r: 1, c: 20 } },
      { s: { r: 1, c: 21 }, e: { r: 1, c: 28 } },
    ];

    worksheet["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 12 }, ...Array(nbCols - 3).fill({ wch: 14 })];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Activites ${annee}`);
    XLSX.writeFile(workbook, `Export_Activite_${annee}.xlsx`);
  };

  const legendItems = [
    { color: "#ef4444", label: t.range0_25 },
    { color: "#f59e0b", label: t.range25_50 },
    { color: "#22c55e", label: t.range50_75 },
    { color: "#2563eb", label: t.range75_100 },
  ];

  return (
    <div className="sa-page">
      <style>{RESPONSIVE_CSS}</style>
      <div className="sa-zoom">
        {/* ============ HEADER ============ */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {/* icône du titre : presse-papier coché = suivi / contrôle d'activités */}
            <div style={styles.logoWrap}><ClipboardCheck size={30} color="#16a34a" strokeWidth={2} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.title}>{t.title}</div>
              <div style={styles.subtitle}>{t.subtitle}</div>
            </div>
          </div>

          <div style={styles.dateBox}>
            <CalendarDays size={18} />
            <div>
              <div style={styles.dateLabel}>{t.updated}</div>
              <div style={styles.dateValue}>{dateAffichee}</div>
            </div>
          </div>
        </div>

        {/* ============ FILTRES ============ */}
        <div className="sa-filters">
          <div className="sa-filter">
            <div style={styles.filterIcon}><CalendarDays size={28} color="#16a34a" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-annee" style={styles.filterLabel}>{t.year}</label>
              <select id="sa-annee" className="sa-select" style={styles.bigSelect} value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}>
                {annees.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <div style={styles.filterSub}>{subAnnee}</div>
            </div>

            {/* export Excel de l'année choisie */}
            <div style={styles.exportBox}>
              <span style={styles.exportLabel}>{t.export}</span>
              <button type="button" className="sa-btn sa-btn-export" onClick={handleExportExcel}
                title={t.exportTitle} aria-label={t.exportTitle}>
                <Download size={22} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="sa-filter">
            <div style={styles.filterIcon}><CalendarDays size={28} color="#16a34a" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-mois" style={styles.filterLabel}>{t.month}</label>
              <select id="sa-mois" className="sa-select" style={styles.bigSelect} value={mois}
                onChange={(e) => setMois(e.target.value)}>
                <option value="Tous">{t.all}</option>
                {moisListe.map((m) => <option key={m} value={m}>{t.months[m] || m}</option>)}
              </select>
              <div style={styles.filterSub}>{subMois}</div>
            </div>
          </div>

          <div className="sa-filter">
            <div style={styles.filterIcon}><Building2 size={28} color="#16a34a" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-uc" style={styles.filterLabel}>{t.unit}</label>
              <select id="sa-uc" className="sa-select" style={styles.bigSelect} value={uc}
                onChange={(e) => setUc(e.target.value)}>
                {ucOptions.map((u) => <option key={u} value={u}>{u === "Tous" ? t.all : u}</option>)}
              </select>
              <div style={styles.filterSub} title={subUC}>{subUC}</div>
            </div>
          </div>

          <div className="sa-actions">
            <button type="button" className="sa-btn sa-btn-ghost" onClick={handleReset}>
              <RotateCcw size={17} strokeWidth={1.8} /><span>{t.reset}</span>
            </button>
            <button type="button" className="sa-btn sa-btn-primary" onClick={() => setShowLogin(true)}>
              <RefreshCw size={17} strokeWidth={1.8} /><span>{t.update}</span>
            </button>
          </div>
        </div>

        {/* ============ CARTES DU HAUT ============ */}
        <div className="sa-top">
          {/* Avancement global */}
          <div className="sa-card">
            <div style={styles.cardHeader}>{t.globalProgress}</div>

            <div style={styles.globalWrap}>
              <Ring percent={tauxGlobal} color={couleurGlobal} size={170} inner={45} outer={75} font={20} label={fmtPct(tauxGlobal)} />

              <div style={styles.kpiList}>
                {kpis.map(({ icon: Icon, label, value }) => (
                  <div key={label} style={styles.kpiItem}>
                    <Icon size={20} color="#16a34a" />
                    <span style={styles.kpiLabel}>{label}</span>
                    <span style={styles.kpiValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Par réalisation */}
          <div className="sa-card">
            <div style={styles.cardHeader}>{t.byAchievement}</div>

            <div style={styles.resultsColumn}>
              {results.map((r) => {
                const color = getProgressColor(r.percent);
                return (
                  <div key={r.label} style={styles.resultBlock}>
                    <div style={styles.resultTitle}>{r.label}</div>
                    <Ring percent={r.percent} color={color} size={120} inner={30} outer={55} font={18} label={fmtPct(r.percent)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Par composante : C1 C2 en haut, C3 C4 en bas (4 sur une ligne si la carte est large) */}
          <div className="sa-card">
            <div style={styles.cardHeader}>{t.byComponent}</div>

            <div className="sa-comp">
              {composantes.map((c) => {
                const Icon = c.icon;
                const color = getProgressColor(c.percent);
                return (
                  <div key={c.label} style={styles.smallCard}>
                    <div style={styles.compIcon}><Icon size={18} color="#16a34a" /></div>
                    <div style={styles.compLabel}>{c.label}</div>
                    <Ring percent={c.percent} color={color} size={70} inner={20} outer={34} font={11} label={fmtPct(c.percent)} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============ AXES PRIORITAIRES ============ */}
        <div className="sa-axes">
          {axes.map((a, i) => (
            <AxisCard key={i} title={a.title} icon={a.icon} rows={a.rows} t={t} fmtPct={fmtPct} />
          ))}
        </div>

        {/* ============ LÉGENDE ============ */}
        <div className="sa-footer">
          <div className="sa-footer-head" style={styles.footerHeader}>{t.legend}</div>

          <div style={styles.footerLegend}>
            {legendItems.map(({ color, label }) => (
              <div key={label} style={styles.legendItem}>
                <span style={{ ...styles.dot, background: color }} />
                {label}
              </div>
            ))}
          </div>

          <div style={styles.footerCTA}>
            <div style={styles.ctaIcon}><FileText size={18} color="#16a34a" /></div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 900, fontSize: 11 }}>{t.accessTitle}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{t.accessDesc}</div>
            </div>
            <button type="button" style={styles.ctaButton}>{t.accessBtn} ↗</button>
          </div>
        </div>

        {/* ============ MODALES ============ */}
        <ActivitesAccessModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onSuccess={(name: string, identifiant: string, motDePasse: string) => {
            setUserName(name);
            setUserIdentifiant(identifiant);
            setUserMotDePasse(motDePasse);
            setShowLogin(false);
            setShowUpdate(true);
          }}
        />

        <UpdateActivitesModal
          isOpen={showUpdate}
          onClose={() => {
            setShowUpdate(false);
            // les identifiants ne restent pas en mémoire une fois la fenêtre fermée
            setUserIdentifiant("");
            setUserMotDePasse("");
          }}
          userName={userName}
          identifiant={userIdentifiant}
          motDePasse={userMotDePasse}
          onUpdateSuccess={async () => {
            await chargerDonnees();
            await chargerDateMiseAJour();
          }}
        />
      </div>
    </div>
  );
}

/* ================= STYLES (la mise en page est dans RESPONSIVE_CSS) ================= */

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "linear-gradient(135deg,#0f6b3a,#16a34a)",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  logoWrap: { width: 52, height: 52, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: "clamp(15px, 1.2vw + 9px, 22px)", fontWeight: 800, letterSpacing: 0.3, overflowWrap: "anywhere" },
  subtitle: { fontSize: 12, fontWeight: 400, opacity: 0.9, marginTop: 3 },
  dateBox: { display: "flex", alignItems: "center", gap: 8 },
  dateLabel: { fontSize: 10, opacity: 0.8 },
  dateValue: { fontSize: 12, fontWeight: 700 },

  /* filtres */
  filterIcon: { width: 34, height: 34, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  filterLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#16a34a", letterSpacing: 0.3, marginBottom: 2 },
  bigSelect: {
    width: "100%", minWidth: 0, height: 30, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 8px",
    fontWeight: 600, background: "#fff", outline: "none", boxSizing: "border-box", cursor: "pointer",
  },
  filterSub: { marginTop: 4, fontSize: 11, color: "#6b7280", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  exportBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, alignSelf: "stretch", flexShrink: 0 },
  exportLabel: { fontSize: 12, fontWeight: 700, color: "#15803d", whiteSpace: "nowrap" },

  /* cartes */
  cardHeader: {
    fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", paddingBottom: 6,
    color: "#16a34a", textAlign: "center", borderBottom: "1px solid #f1f5f9",
  },

  globalWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 },
  kpiList: { display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8, width: "100%" },
  kpiItem: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" },
  kpiLabel: { fontSize: 12, color: "#111827", minWidth: 0 },
  kpiValue: { minWidth: 40, textAlign: "right", fontWeight: 700, color: "#111827", fontSize: 13 },

  resultsColumn: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, marginTop: 10 },
  resultBlock: {
    width: "100%", maxWidth: 380, margin: "0 auto", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxSizing: "border-box",
  },
  resultTitle: { fontSize: 14, fontWeight: 900, color: "#111827", textAlign: "center" },

  smallCard: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 6px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", minWidth: 0,
  },
  compIcon: { width: 34, height: 34, borderRadius: "50%", background: "rgba(22, 163, 74, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  compLabel: { fontSize: 10, fontWeight: 700, color: "#111827", lineHeight: 1.2, overflowWrap: "anywhere" },

  /* axes prioritaires */
  axisHeader: {
    background: "#16a34a", color: "#fff", padding: "8px 10px", borderRadius: 8, fontWeight: 700, fontSize: 12,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 10,
  },
  axisTableHeader: {
    display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 10, fontSize: 11, fontWeight: 600,
    color: "#16a34a", padding: "6px 4px", borderBottom: "1px solid #e5e7eb",
  },
  axisLeftCol: { display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 4, alignItems: "center", minWidth: 0 },
  axisCode: { fontWeight: 600, color: "#64748b", fontSize: 11 },
  axisName: { fontSize: 12, lineHeight: 1.3, overflowWrap: "anywhere" },
  axisRightCol: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 6, alignItems: "center" },
  axisBar: { height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" },
  axisFill: { height: "100%", borderRadius: 999 },
  axisPercent: { minWidth: 44, paddingRight: 6, textAlign: "right", fontWeight: 900, fontSize: 11 },

  /* légende */
  footerHeader: { color: "#1d4ed8", fontWeight: 900, fontSize: 11, letterSpacing: 0.4 },
  footerLegend: { display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800 },
  dot: { display: "inline-block", width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  footerCTA: {
    display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, background: "#ecfdf5",
    border: "1px solid #a7f3d0", borderRadius: 10, padding: "8px 10px",
  },
  ctaIcon: { width: 32, height: 32, borderRadius: 8, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ctaButton: { background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
};
