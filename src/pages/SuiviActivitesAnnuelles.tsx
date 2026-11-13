import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import ActivitesAccessModal from "../components/ActivitesAccessModal";
import UpdateActivitesModal from "../components/UpdateActivitesModal";
import VueTousAvancements from "./VueTousAvancements"; // adaptez le chemin si besoin
import {
  CalendarDays, RotateCcw, RefreshCw, CheckCircle, ListChecks, Clock, XCircle,
  TreePine, Landmark, Wheat, HardHat, Building2, Users, Trees, ClipboardCheck, FileText, FileSpreadsheet, LayoutGrid,
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
  viewAll: "Vue d'ensemble",
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

  back: "Retour",

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
  viewAll: "Topimaso ankapobeny",
  noDataYear: "Tsy misy angon-drakitra ho an'ny taona",

  globalProgress: "TAHA-PANDROSOANA ANKAPOBENY NY ASA",
  totalPlanned: "Fitambaran'ny asa voalamina",
  completed: "Asa vita",
  ongoing: "Asa mbola mandeha",
  notStarted: "Asa mbola tsy natomboka",

  back: "Hiverina",

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
  viewAll: "Overview",
  noDataYear: "No data available for the year",

  globalProgress: "OVERALL ACTIVITY PROGRESS RATE",
  totalPlanned: "Total planned activities",
  completed: "Completed activities",
  ongoing: "Ongoing activities",
  notStarted: "Activities not started",

  back: "Back",

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
  viewAll: "Gesamtübersicht",
  noDataYear: "Keine Daten verfügbar für das Jahr",

  globalProgress: "GESAMTFORTSCHRITTSRATE DER AKTIVITÄTEN",
  totalPlanned: "Insgesamt geplante Aktivitäten",
  completed: "Abgeschlossene Aktivitäten",
  ongoing: "Laufende Aktivitäten",
  notStarted: "Noch nicht gestartete Aktivitäten",

  back: "Zurück",

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

interface LigneActivite { Année: number; Mois: string; UC: string; [key: string]: any }

const ordreMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const COMPOSANTES: { code: string; key: keyof Txt; icon: any }[] = [
  { code: "C1", key: "componentC1", icon: TreePine },
  { code: "C2", key: "componentC2", icon: Landmark },
  { code: "C3", key: "componentC3", icon: Wheat },
  { code: "C4", key: "componentC4", icon: HardHat },
];

const AXES: { titleKey: keyof Txt; icon: any; items: [string, keyof Txt][] }[] = [
  { titleKey: "axis1Title", icon: Users, items: [
    ["1.1.1", "diagnostic"], ["1.1.2", "territorialPlanning"], ["1.1.3", "ecosystemMonitoring"], ["1.1.4", "sustainableFinancing"],
    ["1.2.1", "populationParticipation"], ["1.2.2", "mnpCooperation"], ["1.2.3", "intersectoralCoordination"], ["1.2.4", "antiCorruption"] ] },
  { titleKey: "axis2Title", icon: Trees, items: [
    ["2.1.1", "landscapeRestoration"], ["2.1.2", "sustainableProduction"], ["2.1.3", "landSecurity"], ["2.1.4", "fireManagement"],
    ["2.2.1", "marketSystem"], ["2.2.2", "productionValorization"], ["2.2.3", "activityDiversification"], ["2.2.4", "communityMobilization"] ] },
];

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
const getProgressColor = (v: number) => (v <= 25 ? "#ef4444" : v <= 50 ? "#f59e0b" : v <= 75 ? "#22c55e" : "#2563eb");

/* ================= CSS =================
   Nouveau design : pas de bandeau, fond doux dégradé, grandes cartes très arrondies,
   KPI en tuiles colorées, anneaux fins, composantes sur toute la largeur. */

const CSS = `
.sa-page{container-type:inline-size;container-name:sa;width:100%;font-family:Inter,system-ui,sans-serif;border-radius:20px;
  background:radial-gradient(1200px 400px at 0% -10%,rgba(22,163,74,.10),transparent 60%),var(--bg,#f4f7f5)}
.sa-zoom{display:flex;flex-direction:column;gap:18px;padding:clamp(12px,2.2vw,28px);box-sizing:border-box;min-width:0}
@media (min-width:1920px){.sa-zoom{zoom:1.2}}
@media (min-width:2560px){.sa-zoom{zoom:1.5}}
@media (min-width:3200px){.sa-zoom{zoom:1.9}}
@media (min-width:3840px){.sa-zoom{zoom:2.3}}

/* en-tête */
.sa-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px}
.sa-head-right{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.sa-chip{display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:var(--surface);
  border:1px solid var(--border);color:#16a34a}
.sa-export{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 6px 0 16px;border-radius:999px;border:none;
  background:#16a34a;color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;
  box-shadow:0 6px 16px -6px rgba(22,163,74,.6);transition:transform .15s ease,background .2s ease}
.sa-export:hover{background:#15803d}.sa-export:active{transform:scale(.97)}
.sa-export-year{background:rgba(255,255,255,.22);border-radius:999px;padding:5px 11px;font-size:11px;font-weight:800}
.sa-viewall{height:42px;border-radius:999px;padding:0 16px}

/* barre de filtres : une seule pilule, champs en ligne */
.sa-filters{display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;background:var(--surface);border:1px solid var(--border);
  border-radius:20px;padding:8px;box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}
.sa-field{flex:1 1 180px;display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:14px;min-width:0;background:var(--surface-2)}
.sa-field:focus-within{outline:2px solid rgba(22,163,74,.45)}
.sa-select{width:100%;min-width:0;border:none;background:transparent;color:var(--text);font-size:15px;font-weight:700;outline:none;cursor:pointer;padding:0}
.sa-actions{display:flex;gap:6px;flex:0 1 auto}
.sa-btn{min-height:44px;padding:0 16px;border-radius:14px;font-size:12px;font-weight:700;cursor:pointer;display:flex;
  align-items:center;justify-content:center;gap:8px;white-space:nowrap;transition:background .2s ease}
.sa-btn-ghost{border:1px solid var(--border);background:var(--surface);color:var(--text-2)}
.sa-btn-ghost:hover{background:var(--surface-2)}
.sa-btn-primary{border:none;background:#2563eb;color:#fff}.sa-btn-primary:hover{background:#1d4ed8}

/* cartes */
.sa-card{container-type:inline-size;background:var(--surface);border-radius:22px;border:1px solid var(--border);padding:20px;
  box-sizing:border-box;display:flex;flex-direction:column;gap:16px;min-width:0;box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}
.sa-ch{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text-2)}
.sa-ch::before{content:"";width:4px;height:16px;border-radius:4px;background:#16a34a;flex-shrink:0}

.sa-top{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1.6fr);gap:18px;align-items:stretch}
.sa-global{display:flex;flex-direction:column;align-items:center;gap:14px;flex:1;justify-content:center}
.sa-kpis{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;width:100%}
.sa-kpi{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:12px;background:var(--surface-2);min-width:0}
.sa-kpi-ico{width:30px;height:30px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.sa-kpi-val{order:3;font-size:17px;font-weight:900;line-height:1;color:var(--text)}
.sa-kpi-lab{order:2;flex:1;min-width:0;font-size:12px;color:var(--text-2);line-height:1.2}

.sa-results{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;flex:1;align-items:center}
.sa-result{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:16px 8px;border-radius:18px;background:var(--surface-2)}

.sa-comp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;gap:12px;flex:1}
.sa-compcard{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:14px 8px;border-radius:18px;background:var(--surface-2);justify-content:center}

.sa-axes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
.sa-axhead{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:800;color:var(--text);line-height:1.25}
.sa-axhead-ico{width:38px;height:38px;border-radius:12px;background:rgba(22,163,74,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sa-axcols{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:10px;font-size:11px;font-weight:600;color:var(--text-3);padding:0 4px}
.sa-axrow{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(6px,1vw,14px);align-items:center;padding:9px 10px;border-radius:12px}
.sa-axrow:nth-child(odd){background:var(--surface-2)}
.sa-axcode{font-size:11px;font-weight:800;color:#16a34a;background:rgba(22,163,74,.12);border-radius:8px;padding:3px 7px;justify-self:start}
.sa-axname{font-size:12px;line-height:1.3;overflow-wrap:anywhere;color:var(--text)}
.sa-axleft{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;align-items:center;min-width:0}
.sa-axright{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}
.sa-bar{height:10px;background:var(--track);border-radius:999px;overflow:hidden}
.sa-fill{height:100%;border-radius:999px;transition:width .5s ease}
.sa-pct{min-width:52px;text-align:right;font-weight:900;font-size:12px}
@container (max-width:380px){.sa-axrow,.sa-axcols{grid-template-columns:minmax(0,1fr)}}

.sa-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;background:var(--surface);
  border:1px solid var(--border);border-radius:20px;padding:14px 18px}
.sa-legend{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}
.sa-legend-t{font-size:11px;font-weight:800;letter-spacing:.4px;color:var(--text-2)}
.sa-leg{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:var(--text)}
.sa-cta{display:flex;align-items:center;flex-wrap:wrap;gap:12px;background:var(--green-soft);border-radius:16px;padding:10px 12px}
.sa-cta-btn{background:#16a34a;color:#fff;border:none;border-radius:999px;padding:9px 16px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}

@container sa (max-width:1099px){.sa-top{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-top>:last-child{grid-column:1/-1}}
@container sa (max-width:699px){.sa-top{grid-template-columns:minmax(0,1fr)}.sa-top>:last-child{grid-column:auto}}
@container sa (max-width:899px){.sa-axes{grid-template-columns:minmax(0,1fr)}}
@container sa (max-width:520px){.sa-actions{flex:1 1 100%}.sa-actions .sa-btn{flex:1}}
@media (max-width:640px){.sa-select{font-size:16px}}
`;

/* ================= COMPOSANTS ================= */

function Ring({ percent, color, size, font, label }: any) {
  const p = clampPct(percent);
  const outer = size / 2 - 2, inner = outer - Math.max(8, size * 0.09); // anneau fin
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", flexShrink: 0 }}>
      <PieChart width={size} height={size}>
        <Pie data={[{ value: p }, { value: 100 - p }]} innerRadius={inner} outerRadius={outer} dataKey="value"
          startAngle={90} endAngle={-270} cornerRadius={8} stroke="none">
          <Cell fill={color} />
          <Cell fill="var(--track)" />
        </Pie>
      </PieChart>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: font, color: "var(--text)", pointerEvents: "none" }}>{label}</div>
    </div>
  );
}

function AxisCard({ title, icon: Icon, rows, t, fmtPct }: any) {
  return (
    <div className="sa-card">
      <div className="sa-axhead"><div className="sa-axhead-ico"><Icon size={20} color="#16a34a" /></div><span>{title}</span></div>
      <div className="sa-axcols"><div>{t.axisPriority}</div><div>{t.progressRate}</div></div>
      <div>
        {rows.map((a: any) => (
          <div key={a.code} className="sa-axrow">
            <div className="sa-axleft"><span className="sa-axcode">{a.code}</span><span className="sa-axname">{a.name}</span></div>
            <div className="sa-axright">
              <div className="sa-bar"><div className="sa-fill" style={{ width: `${clampPct(a.value)}%`, background: getProgressColor(a.value) }} /></div>
              <div className="sa-pct" style={{ color: getProgressColor(a.value) }}>{fmtPct(a.value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= PAGE ================= */

type MajStatus = { status: "loading" | "ok" | "none" | "error"; date?: string };

export default function SuiviActivitesAnnuelles() {
  const { lang } = useLanguage();
  const t = TEXT[lang as string] ?? TEXT.fr;
  const locale = LOCALES[lang as string] ?? "fr-FR";
  const fmtPct = (v: number) => `${v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  const [data, setData] = useState<LigneActivite[]>([]);
  const [annee, setAnnee] = useState<number>(2026);
  const [mois, setMois] = useState<string>("Tous");
  const [uc, setUc] = useState<string>("Tous");
  const [maj, setMaj] = useState<MajStatus>({ status: "loading" });
  const [showLogin, setShowLogin] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");
  const [vueGlobale, setVueGlobale] = useState(false);

  const handleReset = () => { setAnnee(2026); setMois("Tous"); setUc("Tous"); };

  const chargerDateMiseAJour = async () => {
    try {
      const response = await fetch("/api/derniere-mise-a-jour", { cache: "no-store" });
      if (!response.ok) throw new Error("Erreur lors de la récupération de la date.");
      const result = await response.json();
      setMaj(result.date ? { status: "ok", date: result.date } : { status: "none" });
    } catch (error) { console.error("Erreur de chargement de la date :", error); setMaj({ status: "error" }); }
  };

  const chargerDonnees = async () => {
    try {
      const response = await fetch("/api/update-geojson?tout=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Impossible de charger les données à jour.");
      const json = await response.json();
      setData(json.features.map((f: any) => f.properties));
    } catch (error) { console.error("Erreur de chargement des activités :", error); }
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

  const annees = useMemo(() => Array.from(new Set(data.map((d) => d.Année))).sort((a, b) => a - b), [data]);
  const moisListe = useMemo(() => ordreMois.filter((m) => data.some((d) => d.Mois === m)), [data]);
  const ucOptions = useMemo(() => ["Tous", ...Array.from(new Set(data.map((d) => d.UC))).filter((u) => u !== "Tous")], [data]);

  const coutActuel: Record<string, any> = useMemo(() => {
    const parAnnee = data.filter((d) => d.Année === annee);
    let lignes = parAnnee.filter((d) => d.UC === uc);
    if (!lignes.length && uc === "Tous") lignes = parAnnee;
    lignes = [...lignes].sort(parMois);
    if (mois !== "Tous") return lignes.find((d) => d.Mois === mois) ?? {};
    return [...lignes].reverse().find((d) => n(d.NAA) > 0 || n(d.NAC) > 0 || n(d.TAG) > 0) ?? lignes[0] ?? {};
  }, [data, annee, mois, uc]);

  const tauxGlobal = n(coutActuel["TAG"]) * 100;

  const kpis = [
    { icon: ListChecks, label: t.totalPlanned, value: n(coutActuel["NAP"]), color: "#64748b" },
    { icon: CheckCircle, label: t.completed, value: n(coutActuel["NAA"]), color: "#16a34a" },
    { icon: Clock, label: t.ongoing, value: n(coutActuel["NAC"]), color: "#f59e0b" },
    { icon: XCircle, label: t.notStarted, value: n(coutActuel["NAD"]), color: "#ef4444" },
  ];
  const results = [
    { label: t.result1, percent: n(coutActuel["TAR 1"]) * 100 },
    { label: t.result2, percent: n(coutActuel["TAR 2"]) * 100 },
  ];
  const composantes = COMPOSANTES.map(({ code, key, icon }) => ({ label: t[key] as string, icon, percent: n(coutActuel[`TAC ${code}`]) * 100 }));
  const axes = AXES.map(({ titleKey, icon, items }) => ({
    title: t[titleKey] as string, icon,
    rows: items.map(([code, key]) => ({ code, name: t[key] as string, value: n(coutActuel[`TAA ${code}`]) * 100 })),
  }));

  const subAnnee = annees.length ? `${annees[0]} - ${annees[annees.length - 1]}` : "";
  const subMois = moisListe.length ? `${t.months[moisListe[0]] ?? moisListe[0]} - ${t.months[moisListe[moisListe.length - 1]] ?? moisListe[moisListe.length - 1]}` : "";
  const subUC = ucOptions.filter((u) => u !== "Tous").join(", ");

  const handleExportExcel = async () => {
    const lignes = data.filter((l) => Number(l["Année"]) === Number(annee));
    if (lignes.length === 0) { alert(`${t.noDataYear} ${annee}.`); return; }
    const XLSX = await import("xlsx");
    const nbCols = EXPORT_COLONNES.length;
    const e1 = Array(nbCols).fill(""), e2 = Array(nbCols).fill("");
    const e3 = EXPORT_COLONNES.map((c) => c.titre);
    e1[0] = "Année"; e1[1] = "Mois"; e1[2] = "UC"; e1[3] = "Taux d'Avancement"; e1[13] = "Axes prioritaires";
    e2[3] = "Avancement Global des Activités"; e2[7] = "Avancement par réalisation"; e2[9] = "Avancement par composante";
    e2[13] = "Système de gestion"; e2[21] = "Aménagement du territoire";
    const rows = lignes.map((l) => EXPORT_COLONNES.map(({ champ }) => l[champ] ?? null));
    const ws = XLSX.utils.aoa_to_sheet([e1, e2, e3, ...rows]);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } }, { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 12 } }, { s: { r: 0, c: 13 }, e: { r: 0, c: 28 } },
      { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } }, { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } }, { s: { r: 1, c: 9 }, e: { r: 1, c: 12 } },
      { s: { r: 1, c: 13 }, e: { r: 1, c: 20 } }, { s: { r: 1, c: 21 }, e: { r: 1, c: 28 } },
    ];
    ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 12 }, ...Array(nbCols - 3).fill({ wch: 14 })];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Activites ${annee}`);
    XLSX.writeFile(wb, `Export_Activite_${annee}.xlsx`);
  };

  const legendItems = [
    { color: "#ef4444", label: t.range0_25 }, { color: "#f59e0b", label: t.range25_50 },
    { color: "#22c55e", label: t.range50_75 }, { color: "#2563eb", label: t.range75_100 },
  ];

  const sub: React.CSSProperties = { fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const lab: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: "#16a34a" };

  /* ============ VUE « TOUS LES AVANCEMENTS » ============
     Placé après tous les hooks : l'ordre des hooks reste donc identique à chaque rendu. */
  if (vueGlobale) {
    return (
      <VueTousAvancements
        data={data}
        annee={annee}
        mois={mois}
        moisLabel={t.months[mois] ?? mois}
        onBack={() => setVueGlobale(false)}
        t={t}
        fmtPct={fmtPct}
      />
    );
  }

  return (
    <div className="sa-page">
      <style>{CSS}</style>
      <div className="sa-zoom">
        {/* ============ EN-TÊTE ============ */}
        <div className="sa-head">
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 20px -8px rgba(22,163,74,.6)" }}>
              <ClipboardCheck size={28} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "clamp(20px, 1.8vw + 10px, 32px)", fontWeight: 900, letterSpacing: -0.5, color: "var(--text)", lineHeight: 1.1, overflowWrap: "anywhere" }}>{t.title}</div>
              <div style={{ fontSize: 14, color: "var(--text-3)", marginTop: 4 }}>{t.subtitle}</div>
            </div>
          </div>
          <div className="sa-head-right">
            <div className="sa-chip">
              <CalendarDays size={18} />
              <div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t.updated}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{dateAffichee}</div>
              </div>
            </div>
            <button type="button" className="sa-btn sa-btn-primary sa-viewall" onClick={() => setVueGlobale(true)}>
              <LayoutGrid size={16} strokeWidth={1.8} /><span>{t.viewAll}</span>
            </button>
            <button type="button" className="sa-export" onClick={handleExportExcel} title={`${t.exportTitle} ${annee}`} aria-label={`${t.exportTitle} ${annee}`}>
              <FileSpreadsheet size={20} strokeWidth={1.8} /><span>{t.exportTitle}</span><span className="sa-export-year">{annee}</span>
            </button>
          </div>
        </div>

        {/* ============ FILTRES ============ */}
        <div className="sa-filters">
          <div className="sa-field">
            <CalendarDays size={22} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-annee" style={lab}>{t.year}</label>
              <select id="sa-annee" className="sa-select" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                {annees.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <div style={sub}>{subAnnee}</div>
            </div>
          </div>
          <div className="sa-field">
            <CalendarDays size={22} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-mois" style={lab}>{t.month}</label>
              <select id="sa-mois" className="sa-select" value={mois} onChange={(e) => setMois(e.target.value)}>
                <option value="Tous">{t.all}</option>
                {moisListe.map((m) => <option key={m} value={m}>{t.months[m] || m}</option>)}
              </select>
              <div style={sub}>{subMois}</div>
            </div>
          </div>
          <div className="sa-field">
            <Building2 size={22} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-uc" style={lab}>{t.unit}</label>
              <select id="sa-uc" className="sa-select" value={uc} onChange={(e) => setUc(e.target.value)}>
                {ucOptions.map((u) => <option key={u} value={u}>{u === "Tous" ? t.all : u}</option>)}
              </select>
              <div style={sub} title={subUC}>{subUC}</div>
            </div>
          </div>
          <div className="sa-actions">
            <button type="button" className="sa-btn sa-btn-ghost" onClick={handleReset}><RotateCcw size={16} strokeWidth={1.8} /><span>{t.reset}</span></button>
            <button type="button" className="sa-btn sa-btn-primary" onClick={() => setShowLogin(true)}><RefreshCw size={16} strokeWidth={1.8} /><span>{t.update}</span></button>
          </div>
        </div>

        {/* ============ GLOBAL + RÉALISATIONS ============ */}
        <div className="sa-top">
          <div className="sa-card">
            <div className="sa-ch">{t.globalProgress}</div>
            <div className="sa-global">
              <div className="sa-ringbox"><Ring percent={tauxGlobal} color={getProgressColor(tauxGlobal)} size={160} font={22} label={fmtPct(tauxGlobal)} /></div>
              <div className="sa-kpis">
                {kpis.map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="sa-kpi">
                    <div className="sa-kpi-ico" style={{ background: `${color}22` }}><Icon size={20} color={color} /></div>
                    <div className="sa-kpi-val">{value}</div>
                    <div className="sa-kpi-lab">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sa-card">
            <div className="sa-ch">{t.byAchievement}</div>
            <div className="sa-results">
              {results.map((r) => (
                <div key={r.label} className="sa-result">
                  <Ring percent={r.percent} color={getProgressColor(r.percent)} size={120} font={18} label={fmtPct(r.percent)} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", lineHeight: 1.25 }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>

        {/* ============ COMPOSANTES ============ */}
        <div className="sa-card">
          <div className="sa-ch">{t.byComponent}</div>
          <div className="sa-comp">
            {composantes.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="sa-compcard">
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: "rgba(22,163,74,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color="#16a34a" />
                  </div>
                  <Ring percent={c.percent} color={getProgressColor(c.percent)} size={88} font={13} label={fmtPct(c.percent)} />
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text)", lineHeight: 1.25, overflowWrap: "anywhere" }}>{c.label}</div>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* ============ AXES PRIORITAIRES ============ */}
        <div className="sa-axes">
          {axes.map((a, i) => <AxisCard key={i} title={a.title} icon={a.icon} rows={a.rows} t={t} fmtPct={fmtPct} />)}
        </div>

        {/* ============ LÉGENDE + ACCÈS ============ */}
        <div className="sa-footer">
          <div className="sa-legend">
            <span className="sa-legend-t">{t.legend}</span>
            {legendItems.map(({ color, label }) => (
              <span key={label} className="sa-leg"><span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />{label}</span>
            ))}
          </div>
          <div className="sa-cta">
            <FileText size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 140 }}>
              <div style={{ fontWeight: 900, fontSize: 11, color: "var(--text)" }}>{t.accessTitle}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t.accessDesc}</div>
            </div>
            <button type="button" className="sa-cta-btn">{t.accessBtn} ↗</button>
          </div>
        </div>

        {/* ============ MODALES ============ */}
        <ActivitesAccessModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onSuccess={(name: string, jeton: string) => { setUserName(name); setToken(jeton); setShowLogin(false); setShowUpdate(true); }}
        />
        <UpdateActivitesModal
          isOpen={showUpdate}
          onClose={() => { setShowUpdate(false); setToken(""); }}
          userName={userName}
          token={token}
          onUpdateSuccess={async () => { await chargerDonnees(); await chargerDateMiseAJour(); }}
        />
      </div>
    </div>
  );
}
