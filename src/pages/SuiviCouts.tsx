import React, { useEffect, useMemo, useState } from "react";
import { calculerDecaissement, type BaseDecaissement } from "../utils/decaissement";
import { useLanguage } from "../context/LanguageContext";
import LoginModal from "../components/LoginModal";
import UpdateModal from "../components/UpdateModal";
import {
  CalendarDays, RotateCcw, RefreshCw, Building2, Target, Plane, Users, User, Info, Coins,
  Briefcase, Handshake, Leaf, Map as MapIcon, ShoppingCart, FileText, HardHat, Landmark, Cog, Receipt,
  Building,
} from "lucide-react";
import { FaShoppingCart, FaFileContract } from "react-icons/fa";
import { GiPayMoney } from "react-icons/gi";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, LabelList, CartesianGrid,
} from "recharts";
import IconeSuiviCouts from "../components/IconeSuiviCouts";

interface CoutActivite {
  Année: number;
  Mois: string;
  UC: string;
  [key: string]: any;
}

/* ================= TRADUCTIONS =================
   `fr` sert de modèle : TypeScript impose les mêmes clés dans mg / en / de. */

const fr = {
  title: "SUIVI DES COÛTS",
  subtitle: "Plan Stratégique 2024 - 2030",
  updated: "Données mises à jour le :",
  update: "Mettre à jour",
  year: "ANNÉE",
  month: "MOIS",
  unit: "UNITÉ DE COORDINATION",
  all: "Tous",
  reset: "Réinitialiser les filtres",

  annual: "ÉVOLUTION ANNUELLE DU DÉCAISSEMENT (PROGRAMME)",
  cumulative: "DÉCAISSÉ CUMULÉ",
  totalBudget: "SUR UN BUDGET TOTAL DE",
  disbursementRate: "TAUX DE DÉCAISSEMENT",
  annualEvolution: "ÉVOLUTION ANNUELLE DU DÉCAISSEMENT",

  byComponent: "ÉVOLUTION ANNUELLE DU DÉCAISSEMENT PAR COMPOSANTE",
  byInstrument: "ÉVOLUTION ANNUELLE DU DÉCAISSEMENT PAR INSTRUMENT",

  allocatedShare: "% AU BUDGET",
  instExperts: "EXPERTS",
  instMission: "FRAIS DE MISSION",
  instContrats: "CONTRATS",
  instAchats: "ACHATS PAR LE PROJET",
  instConstruction: "CONSTRUCTION (LP 005)",
  instFinancements: "FINANCEMENTS",
  instCharges: "CHARGES DE FONCTIONNEMENT ET DIVERS",
  instFraisGeneraux: "FRAIS GÉNÉRAUX + TVA GER",

  component: "COMPOSANTE",
  instrument: "INSTRUMENT",
  disbursed: "DÉCAISSÉ",
  budgetShare: "% DU BUDGET TOTAL",
  total: "TOTAL",

  globalProgress: "TAUX D’AVANCEMENT GLOBAL DES COÛTS (PAR RAPPORT À LA PLANIFICATION ANNUELLE)",
  annualPlanning: "PLANIFICATION ANNUELLE",
  progressComponent: "TAUX D’AVANCEMENT PAR COMPOSANTE",
  progressInstrument: "TAUX D’AVANCEMENT PAR INSTRUMENT",
  planned: "PLANIFIÉ",
  legend: "LÉGENDE (TAUX D'AVANCEMENT)",
  info: "Le taux d’avancement des coûts est calculé par rapport à la planification annuelle de l’année sélectionnée.",

  access: "ACCÉDER AU SUIVI DES COÛTS DE L’ANNÉE",
  accessDesc: "Consultez le détail des coûts, engagements et décaissements",
  accessBtn: "Accéder au suivi des coûts ↗",

  millionsEuro: "Million €",

  componentC1: "C1. GESTION DES SERVICES ÉCOSYSTÉMIQUES",
  componentC2: "C2. GOUVERNANCE ENVIRONNEMENTALE DÉCENTRALISÉE",
  componentC3: "C3. DÉVELOPPEMENT DES PAYSAGES PRODUCTIFS",
  componentC4: "C4. CRÉATION D’EMPLOIS VERTS",

  achats: "ACHATS",
  financements: "FINANCEMENTS",
  contrats: "CONTRATS",
  missionsInterne: "MISSIONS INTERNES",
  missionsPartenaires: "MISSIONS PARTENAIRES",

  months: {
    Janvier: "Janvier", Février: "Février", Mars: "Mars", Avril: "Avril", Mai: "Mai", Juin: "Juin",
    Juillet: "Juillet", Août: "Août", Septembre: "Septembre", Octobre: "Octobre", Novembre: "Novembre", Décembre: "Décembre",
  } as Record<string, string>,
};

type Txt = typeof fr;

const mg: Txt = {
  title: "FANARAHA-MASO NY VIDIM-PANATANTERAHANA",
  subtitle: "Drafitra Stratejika 2024 - 2030",
  updated: "Nohavaozina farany :",
  update: "Havaozina",
  year: "TAONA",
  month: "VOLANA",
  unit: "VONDROM-PANDRINDRANA",
  all: "Rehetra",
  reset: "Avereno ny sivana",

  annual: "FIVOARAN'NY FAMOAHAM-BOLA ISAN-TAONA",
  cumulative: "FITAMBARAN'NY VOLA VOAVOAKA",
  totalBudget: "AMIN'NY TETIBOLA MANONTOLO",
  disbursementRate: "TAHAN'NY FAMOAHAM-BOLA",
  annualEvolution: "FIVOARAN'NY FAMOAHAM-BOLA ISAN-TAONA",

  byComponent: "FAMOAHAM-BOLA ISAN-TAONA ISAKY NY SINGA",
  byInstrument: "FAMOAHAM-BOLA ISAN-TAONA ISAKY NY FITAOVANA",

  allocatedShare: "%-N'NY TETIBOLA VOATOMBOKA",
  instExperts: "MANAM-PAHAIZANA",
  instMission: "SARAN'NY IRAKA",
  instContrats: "FIFANEKENA",
  instAchats: "FIVIDIANA ATAON'NY TETIKASA",
  instConstruction: "FANORENANA (LP 005)",
  instFinancements: "FAMATSIAM-BOLA",
  instCharges: "SARAN'NY FIASANA SY HAFA",
  instFraisGeneraux: "SARAN'NY ANKAPOBENY + TVA GER",

  component: "SINGA",
  instrument: "FITAOVANA",
  disbursed: "VOAVOAKA",
  budgetShare: "%-N'NY TETIBOLA",
  total: "FITAMBARANY",

  globalProgress: "TAHAN'NY FIVOARAN'NY VIDIM-PANATANTERAHANA (RAHA OHARINA AMIN'NY DRAFITRA ISAN-TAONA)",
  annualPlanning: "DRAFITRA ISAN-TAONA",
  progressComponent: "TAHAN'NY FIVOARANA ISAKY NY SINGA",
  progressInstrument: "TAHAN'NY FIVOARANA ISAKY NY FITAOVANA",
  planned: "VOALAMINA",
  legend: "FANAZAVANA (TAHAN'NY FIVOARANA)",
  info: "Ny tahan'ny fivoaran'ny vidim-panatanterahana dia kajiana raha oharina amin'ny drafitra isan-taona voafantina.",

  access: "HIDITRA AMIN'NY FANARAHA-MASO NY VIDIM-PANATANTERAHANA",
  accessDesc: "Jereo ny antsipirian'ny vola, fifanekena ary famoaham-bola",
  accessBtn: "Hiditra ↗",

  millionsEuro: "Tapitrisa €",

  componentC1: "C1. FITANTANANA NY SERIVISY ARA-TONTOLON'AINA",
  componentC2: "C2. FITANTANANA NY TONTOLON'AINA IFOTONY",
  componentC3: "C3. FAMPANDROSOANA NY TONTOLON-TANY MPAMOKATRA",
  componentC4: "C4. FAMORONANA ASA MAITSO",

  achats: "FIVIDIANA",
  financements: "FAMATSIAM-BOLA",
  contrats: "FIFANEKENA",
  missionsInterne: "IRAKA ANATINY",
  missionsPartenaires: "IRAKA MIARAKA AMIN'NY MPIARA-MIASA",

  months: {
    Janvier: "Janoary", Février: "Febroary", Mars: "Martsa", Avril: "Aprily", Mai: "Mey", Juin: "Jona",
    Juillet: "Jolay", Août: "Aogositra", Septembre: "Septambra", Octobre: "Oktobra", Novembre: "Novambra", Décembre: "Desambra",
  },
};

const en: Txt = {
  title: "COST MONITORING",
  subtitle: "Strategic Plan 2024 - 2030",
  updated: "Data updated on:",
  update: "Update",
  year: "YEAR",
  month: "MONTH",
  unit: "COORDINATION UNIT",
  all: "All",
  reset: "Reset filters",

  annual: "ANNUAL DISBURSEMENT EVOLUTION (PROGRAMME)",
  cumulative: "CUMULATIVE DISBURSEMENT",
  totalBudget: "OUT OF A TOTAL BUDGET OF",
  disbursementRate: "DISBURSEMENT RATE",
  annualEvolution: "ANNUAL DISBURSEMENT EVOLUTION",

  byComponent: "ANNUAL DISBURSEMENT BY COMPONENT",
  byInstrument: "ANNUAL DISBURSEMENT BY INSTRUMENT",

  allocatedShare: "% OF BUDGET",
  instExperts: "EXPERTS",
  instMission: "MISSION COSTS",
  instContrats: "CONTRACTS",
  instAchats: "PURCHASES BY THE PROJECT",
  instConstruction: "CONSTRUCTION (LP 005)",
  instFinancements: "FINANCING",
  instCharges: "OPERATING COSTS AND MISCELLANEOUS",
  instFraisGeneraux: "OVERHEADS + VAT GER",

  component: "COMPONENT",
  instrument: "INSTRUMENT",
  disbursed: "DISBURSED",
  budgetShare: "% OF TOTAL BUDGET",
  total: "TOTAL",

  globalProgress: "OVERALL COST PROGRESS (COMPARED TO ANNUAL PLANNING)",
  annualPlanning: "ANNUAL PLANNING",
  progressComponent: "PROGRESS BY COMPONENT",
  progressInstrument: "PROGRESS BY INSTRUMENT",
  planned: "PLANNED",
  legend: "LEGEND (PROGRESS RATE)",
  info: "The cost progress rate is calculated against the annual plan for the selected year.",

  access: "OPEN ANNUAL COST MONITORING",
  accessDesc: "View detailed costs, commitments and disbursements",
  accessBtn: "Open cost monitoring ↗",

  millionsEuro: "Million €",

  componentC1: "C1. ECOSYSTEM SERVICES MANAGEMENT",
  componentC2: "C2. DECENTRALIZED ENVIRONMENTAL GOVERNANCE",
  componentC3: "C3. DEVELOPMENT OF PRODUCTIVE LANDSCAPES",
  componentC4: "C4. CREATION OF GREEN JOBS",

  achats: "PURCHASES",
  financements: "FUNDING",
  contrats: "CONTRACTS",
  missionsInterne: "INTERNAL MISSIONS",
  missionsPartenaires: "PARTNER MISSIONS",

  months: {
    Janvier: "January", Février: "February", Mars: "March", Avril: "April", Mai: "May", Juin: "June",
    Juillet: "July", Août: "August", Septembre: "September", Octobre: "October", Novembre: "November", Décembre: "December",
  },
};

const de: Txt = {
  title: "KOSTENMONITORING",
  subtitle: "Strategischer Plan 2024 - 2030",
  updated: "Daten aktualisiert am:",
  update: "Aktualisieren",
  year: "JAHR",
  month: "MONAT",
  unit: "KOORDINATIONSEINHEIT",
  all: "Alle",
  reset: "Filter zurücksetzen",

  annual: "JÄHRLICHE ENTWICKLUNG DER AUSZAHLUNGEN",
  cumulative: "KUMULIERTE AUSZAHLUNG",
  totalBudget: "VON EINEM GESAMTBUDGET VON",
  disbursementRate: "AUSZAHLUNGSRATE",
  annualEvolution: "JÄHRLICHE ENTWICKLUNG DER AUSZAHLUNGEN",

  byComponent: "JÄHRLICHE AUSZAHLUNG NACH KOMPONENTE",
  byInstrument: "JÄHRLICHE AUSZAHLUNG NACH INSTRUMENT",

  allocatedShare: "% DES BUDGETS",
  instExperts: "EXPERTEN",
  instMission: "MISSIONSKOSTEN",
  instContrats: "VERTRÄGE",
  instAchats: "EINKÄUFE DES PROJEKTS",
  instConstruction: "BAU (LP 005)",
  instFinancements: "FINANZIERUNGEN",
  instCharges: "BETRIEBSKOSTEN UND SONSTIGES",
  instFraisGeneraux: "GEMEINKOSTEN + MWST GER",

  component: "KOMPONENTE",
  instrument: "INSTRUMENT",
  disbursed: "AUSGEZAHLT",
  budgetShare: "% DES GESAMTBUDGETS",
  total: "GESAMT",

  globalProgress: "GESAMTFORTSCHRITT DER KOSTEN (IM VERGLEICH ZUR JAHRESPLANUNG)",
  annualPlanning: "JAHRESPLANUNG",
  progressComponent: "FORTSCHRITT NACH KOMPONENTE",
  progressInstrument: "FORTSCHRITT NACH INSTRUMENT",
  planned: "GEPLANT",
  legend: "LEGENDE (FORTSCHRITTSRATE)",
  info: "Die Kostenfortschrittsrate wird anhand der Jahresplanung des ausgewählten Jahres berechnet.",

  access: "JÄHRLICHES KOSTENMONITORING ÖFFNEN",
  accessDesc: "Details zu Kosten, Verpflichtungen und Auszahlungen anzeigen",
  accessBtn: "Kostenmonitoring öffnen ↗",

  millionsEuro: "Mio. €",

  componentC1: "C1. MANAGEMENT VON ÖKOSYSTEMDIENSTLEISTUNGEN",
  componentC2: "C2. DEZENTRALISIERTE UMWELTGOVERNANCE",
  componentC3: "C3. ENTWICKLUNG PRODUKTIVER LANDSCHAFTEN",
  componentC4: "C4. SCHAFFUNG GRÜNER ARBEITSPLÄTZE",

  achats: "EINKÄUFE",
  financements: "FINANZIERUNGEN",
  contrats: "VERTRÄGE",
  missionsInterne: "INTERNE MISSIONEN",
  missionsPartenaires: "PARTNER-MISSIONEN",

  months: {
    Janvier: "Januar", Février: "Februar", Mars: "März", Avril: "April", Mai: "Mai", Juin: "Juni",
    Juillet: "Juli", Août: "August", Septembre: "September", Octobre: "Oktober", Novembre: "November", Décembre: "Dezember",
  },
};

const TEXT: Record<string, Txt> = { fr, mg, en, de };
const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };

/* ================= CONSTANTES & OUTILS ================= */

const ordreMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const budgetTotalProjet = 34_500_000;

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clampPct = (p: number) => Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0));
const parMois = (a: any, b: any) => ordreMois.indexOf(a.Mois) - ordreMois.indexOf(b.Mois);

// Rouge < 25 · Orange < 50 · Vert < 75 · Bleu ≥ 75 (même échelle que la légende)
const getProgressColor = (percent: number) =>
  percent < 25 ? "#ef4444" : percent < 50 ? "#f59e0b" : percent < 75 ? "#22c55e" : "#2563eb";

const formatCompactEuro = (value: number | string) => {
  const num = Number(value) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(".", ",")} M€`;
  if (num >= 1000) return `${Math.round(num / 1000)} k€`;
  return `${Math.round(num)} €`;
};

function useGeoJSON(url: string) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`${url} introuvable`); return r.json(); })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => console.error("Erreur chargement", url, err));
    return () => { cancelled = true; };
  }, [url]);
  return data;
}

/* ================= CSS RESPONSIVE =================
   - les grilles de page réagissent à la largeur réelle de la page (container query « sc »)
   - les grilles de donuts réagissent à la largeur de leur carte
   - sur grands écrans (≥1920 px) toute la page est agrandie (zoom) pour rester lisible. */

const RESPONSIVE_CSS = `
.sc-page{container-type:inline-size;container-name:sc;width:100%;font-family:Inter,system-ui,sans-serif}
.sc-zoom{display:flex;flex-direction:column;gap:10px;padding:10px;box-sizing:border-box;min-width:0}
@media (min-width:1920px){.sc-zoom{zoom:1.2}}
@media (min-width:2560px){.sc-zoom{zoom:1.5}}
@media (min-width:3200px){.sc-zoom{zoom:1.9}}
@media (min-width:3840px){.sc-zoom{zoom:2.3}}

.sc-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 240px;gap:16px;align-items:stretch;padding:16px;
  background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;box-sizing:border-box}
.sc-actions{display:flex;flex-direction:column;justify-content:center;gap:9px}
.sc-btn{width:100%;height:38px;padding:0 12px;border-radius:8px;font-size:12px;display:flex;align-items:center;
  justify-content:center;gap:7px;cursor:pointer;transition:background .2s ease}
.sc-btn-primary{border:1px solid #2563eb;background:#2563eb;color:#fff;font-weight:700;box-shadow:0 2px 5px rgba(37,99,235,.16)}
.sc-btn-primary:hover{background:#1d4ed8}
.sc-btn-ghost{border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600}
.sc-btn-ghost:hover{background:#f1f5f9}
.sc-select{font-size:13px}

.sc-top{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.1fr) minmax(0,.9fr);gap:8px;align-items:stretch}
.sc-bottom{display:grid;grid-template-columns:minmax(0,.55fr) minmax(0,.9fr) minmax(0,2.3fr);gap:8px;align-items:stretch}
.sc-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1.2fr);gap:8px 12px;align-items:center;
  padding:8px 12px;background:#fff;border:1px solid #dbe4f0;border-radius:10px}
.sc-footer-head{grid-column:1/-1}

.sc-card{container-type:inline-size;background:#fff;border-radius:12px;border:1px solid #dbe4f0;display:flex;flex-direction:column;
  min-width:0;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.sc-kpirow{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:8px 12px}

/* tableaux : une SEULE définition de colonnes => en-tête, lignes et total bien alignés */
.sc-cols{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1.5fr) minmax(0,1.6fr);align-items:center;gap:6px}

/* composantes : 2 colonnes, rangées en colonne => C1 sur C2 (bleu) à gauche, C3 sur C4 (vert) à droite */
.sc-d4{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,auto);grid-auto-flow:column;gap:6px;padding:6px}
.sc-d5{flex:1;display:grid;grid-template-columns:repeat(var(--n,5),minmax(0,1fr));gap:4px;padding:4px;align-items:stretch}
.sc-donut{container-type:inline-size}
.sc-two{display:flex;justify-content:space-between;align-items:stretch;gap:4px;width:100%;margin-top:auto;padding-top:8px}
.sc-two>div{flex:1;min-width:0;text-align:center}
.sc-two>.sc-sep{flex:none;width:1px;background:#cbd5e1}

@container (max-width:699px){.sc-d5{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container (max-width:279px){.sc-d4{grid-template-columns:minmax(0,1fr);grid-template-rows:none;grid-auto-flow:row}}
@container (max-width:379px){.sc-d5{grid-template-columns:repeat(2,minmax(0,1fr))}.sc-amount{font-size:10px !important}}

@container sc (max-width:1279px){
  .sc-top{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sc-top>:first-child{grid-column:1/-1}
  .sc-bottom{grid-template-columns:minmax(0,1fr) minmax(0,1.5fr)}
  .sc-bottom>:last-child{grid-column:1/-1}
}
@container sc (max-width:899px){
  .sc-filters{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sc-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}
  .sc-actions .sc-btn{flex:1 1 180px;width:auto}
  .sc-footer{grid-template-columns:minmax(0,1fr)}
}
@container sc (max-width:699px){
  .sc-top,.sc-bottom{grid-template-columns:minmax(0,1fr)}
  .sc-top>:first-child,.sc-bottom>:last-child{grid-column:auto}
}
@container sc (max-width:479px){
  .sc-filters{grid-template-columns:minmax(0,1fr);padding:10px}
}
@media (max-width:640px){.sc-select{font-size:16px}}
`;

/* ================= COMPOSANTS ================= */

function Ring({ percent, color, size = 72, inner = 18, outer = 30, font = 11 }: any) {
  const p = clampPct(percent);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", flexShrink: 0 }}>
      <PieChart width={size} height={size}>
        <Pie data={[{ value: p }, { value: 100 - p }]} innerRadius={inner} outerRadius={outer}
          startAngle={90} endAngle={-270} dataKey="value">
          <Cell fill={color} />
          <Cell fill="#e5e7eb" />
        </Pie>
      </PieChart>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        fontWeight: 900, fontSize: font, color, lineHeight: 1, pointerEvents: "none",
      }}>
        {Number(percent).toFixed(1)}%
      </div>
    </div>
  );
}

function TableRow({ icon: Icon, color, title, amount, percent, index, fill }: any) {
  const p = clampPct(percent);
  const c = getProgressColor(p);
  return (
    <div className="sc-cols" style={{ ...styles.row, ...(fill ? { flex: 1 } : null), background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
      <div style={styles.cellFlex}>
        <Icon size={18} color={color} style={{ flexShrink: 0 }} />
        <div style={styles.rowTitle}>{title}</div>
      </div>
      <div className="sc-amount" style={styles.amount}>{amount}</div>
      <div style={styles.progressCell}>
        <span style={{ ...styles.percentLeft, color: c }}>{p.toFixed(1)}%</span>
        <div style={styles.progress}>
          <div style={{ ...styles.progressFill, width: `${p}%`, background: c }} />
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, amount, percent, color }: any) {
  return (
    <div className="sc-cols" style={styles.totalRow}>
      <div style={{ fontWeight: 900, fontSize: 12, color: "#1d4ed8" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 12, color: "#1d4ed8", whiteSpace: "nowrap" }}>{amount}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color, textAlign: "center" }}>{percent.toFixed(1)}%</div>
    </div>
  );
}

function RateCard({ title, color, percent, dec, plan, icon: Icon, labels }: any) {
  const c = getProgressColor(percent);
  return (
    <div
      className="sc-donut"
      style={{
        ...styles.donutCard,
        border: `1.5px solid ${color}33`,
        background: "#f8fafc",
        borderTop: `2px solid ${color}`,
      }}
    >
      <div style={{ ...styles.donutTitle, color }}>{title}</div>

      {/* l'emplacement de l'icône est toujours réservé : les anneaux restent alignés */}
      <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0" }}>
        {Icon && <Icon size={14} color={color} />}
      </div>

      <Ring percent={percent} color={c} size={64} inner={16} outer={28} font={10} />

      <div className="sc-two">
        <div>
          <div style={styles.rateLabel}>{labels.disbursed}</div>
          <div style={{ ...styles.rateMoney, color }}>{formatCompactEuro(dec)}</div>
        </div>
        <div className="sc-sep" />
        <div>
          <div style={styles.rateLabel}>{labels.planned}</div>
          <div style={styles.rateMoney}>{formatCompactEuro(plan)}</div>
        </div>
      </div>
    </div>
  );
}

/** Carte des composantes : titre + % en haut, barre de progression, puis
 *  « Décaissé » collé au début de la barre et « Planifié » collé à son extrémité droite. */
function BarRateCard({ title, color, percent, dec, plan, labels }: any) {
  const p = clampPct(percent);
  const c = getProgressColor(p);
  return (
    <div style={{ ...styles.barCard, border: `1.5px solid ${color}40`, background: `${color}10` }}>
      <div style={styles.barCardTop}>
        <div style={{ ...styles.compactTitle, color }}>{title}</div>
        <div style={{ ...styles.barCardPct, color: c }}>{p.toFixed(1)}%</div>
      </div>

      <div style={styles.barTrack}>
        <div style={{ ...styles.progressFill, width: `${p}%`, background: c }} />
      </div>

      <div style={styles.barCardBottom}>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={styles.smallLabel}>{labels.disbursed}</div>
          <div style={styles.money}>{formatCompactEuro(dec)}</div>
        </div>
        <div style={styles.vSep} />
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <div style={styles.smallLabel}>{labels.planned}</div>
          <div style={styles.money}>{formatCompactEuro(plan)}</div>
        </div>
      </div>
    </div>
  );
}

/* ================= PAGE ================= */

export default function SuiviCouts() {
  const { lang } = useLanguage();
  const t = TEXT[lang as string] ?? TEXT.fr;
  const locale = LOCALES[lang as string] ?? "fr-FR";
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const eur = (v: number) => `${nf.format(v)} €`;

  const [annee, setAnnee] = useState<number>(2026);
  const [mois, setMois] = useState<string>("Tous");
  const [uc, setUc] = useState<string>("Tous");
  const [bailleur, setBailleur] = useState<string>("BMZ");
  const [dateMaj, setDateMaj] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");

  const coutJson = useGeoJSON("/data/Base_Cout_Activite.geojson");
  const baseDec = useGeoJSON("/data/Base_Decaissement.geojson") as BaseDecaissement | null;

  const data: CoutActivite[] = useMemo(
    () => coutJson?.features?.map((f: any) => f.properties) ?? [],
    [coutJson]
  );

  useEffect(() => {
    fetch("/api/derniere-maj")
      .then((r) => r.json())
      .then((d) => setDateMaj(d.date ?? null))
      .catch(() => setDateMaj(null));
  }, []);

  const dateAffichee = (() => {
    if (!dateMaj) return "—";
    const d = new Date(dateMaj);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo" });
  })();

  const handleReset = () => { setAnnee(2026); setMois("Tous"); setUc("Tous"); };

  const annees = useMemo(() => Array.from(new Set(data.map((d) => d.Année))).sort((a, b) => a - b), [data]);
  const moisListe = useMemo(() => ordreMois.filter((m) => data.some((d) => d.Mois === m)), [data]);
  const ucListe = useMemo(() => Array.from(new Set(data.map((d) => d.UC))), [data]);

  /* ----- Décaissement du programme (ne dépend pas du filtre UC) ----- */
  const dec = useMemo(() => calculerDecaissement(baseDec, annee, mois), [baseDec, annee, mois]);
  const decaissementCumule = dec.cumulTotal;
  const tauxDecaissement = (decaissementCumule / budgetTotalProjet) * 100;

  /* ----- Suivi des coûts de l'UC choisie ----- */
  const { coutActuel, planAnnuel } = useMemo(() => {
    const lignes = data.filter((d) => d.Année === annee && d.UC === uc).sort(parMois);
    // Cumul de janvier au mois choisi ; si « Tous » : dernier mois ayant des données
    const actuel: any =
      mois !== "Tous"
        ? lignes.find((d) => d.Mois === mois) ?? {}
        : [...lignes].reverse().find((d) => n(d["D (EUR)"]) > 0) ?? {};
    // Budget planifié de l'année (identique tous les mois : on prend le maximum)
    const plan = (champ: string) => lignes.reduce((m, d) => Math.max(m, n(d[champ])), 0);
    return { coutActuel: actuel, planAnnuel: plan };
  }, [data, annee, mois, uc]);

  const decaisse = n(coutActuel["D (EUR)"]);
  const planification = planAnnuel("PA (EUR)");
  const tauxAvancement = planification > 0 ? (decaisse / planification) * 100 : 0;

  /* ----- Carte « par composante » ----- */
  const composantes = dec.outputs.map((o, i) => ({
    icon: [Target, Leaf, Building, MapIcon, Briefcase][i] ?? Coins,
    title: `Output ${i}`,
    amount: o.montant,
    percent: o.pct,
    color: ["#2563eb", "#16a34a", "#7c3aed", "#f59e0b", "#f97316"][i] ?? "#64748b",
  }));

  /* ----- Carte « par instrument » ----- */
  const infosInstruments: Record<string, { icon: any; title: string; color: string }> = {
    "Experts": { icon: User, title: t.instExperts, color: "#2563eb" },
    "Frais de mission": { icon: Plane, title: t.instMission, color: "#f97316" },
    "Contrats": { icon: FileText, title: t.instContrats, color: "#7c3aed" },
    "Achats par le projet": { icon: ShoppingCart, title: t.instAchats, color: "#16a34a" },
    "Construction (LP 005)": { icon: HardHat, title: t.instConstruction, color: "#b45309" },
    "Financements": { icon: Landmark, title: t.instFinancements, color: "#0891b2" },
    "Charges de fonctionnement et divers": { icon: Cog, title: t.instCharges, color: "#64748b" },
    "Frais généraux + TVA GER": { icon: Receipt, title: t.instFraisGeneraux, color: "#db2777" },
  };
  const instruments = dec.instruments.map((i) => ({
    ...(infosInstruments[i.cle] ?? { icon: Coins, title: i.cle, color: "#64748b" }),
    amount: i.montant,
    percent: i.pct,
  }));

  /* ----- Graphique annuel ----- */
  const yearlyData = dec.parAnnee.map((a) => ({
    year: String(a.annee),
    value: a.valeur / 1_000_000,
    percent: a.pct.toFixed(1),
  }));
  const maxYear = Math.max(0, ...yearlyData.map((d) => d.value));

  /* ----- Taux d'avancement par composante / par instrument ----- */
  const tauxComposantes = ([
    ["C1", t.componentC1, "#2563eb"],
    ["C2", t.componentC2, "#2563eb"],
    ["C3", t.componentC3, "#16a34a"],
    ["C4", t.componentC4, "#16a34a"],
  ] as const).map(([code, title, color]) => {
    const d = n(coutActuel[`D ${code} (EUR)`]);
    const plan = planAnnuel(`PA ${code} (EUR)`);
    return { title, color, dec: d, plan, percent: plan > 0 ? clampPct((d / plan) * 100) : 0 };
  });

  // Colonnes présentes dans la base : les cartes « optionnelles » ne s'affichent que si leurs colonnes existent
  const colonnes = useMemo(() => new Set(data.length ? Object.keys(data[0]) : []), [data]);

  const tauxInstruments = [
    { title: t.financements, icon: Handshake, d: "DF (EUR)", pa: "PAF (EUR)", color: "#2563eb" },
    { title: t.achats, icon: FaShoppingCart, d: "DA (EUR)", pa: "PAA (EUR)", color: "#16a34a" },
    { title: t.contrats, icon: FaFileContract, d: "DC (EUR)", pa: "PAC (EUR)", color: "#f59e0b" },
    { title: t.missionsInterne, icon: Plane, d: "DMI (EUR)", pa: "PAMI (EUR)", color: "#f97316" },
    { title: t.missionsPartenaires, icon: Users, d: "DMP (EUR)", pa: "PAMP (EUR)", color: "#f97316" },
    // ↓ cartes ajoutées pour arriver à 8 instruments. ADAPTER d / pa aux vrais noms de colonnes de
    //   Base_Cout_Activite.geojson : tant qu'une colonne n'existe pas, la carte reste masquée.
    { title: t.instExperts, icon: User, d: "DE (EUR)", pa: "PAE (EUR)", color: "#2563eb", optionnel: true },
    { title: t.instConstruction, icon: HardHat, d: "DCO (EUR)", pa: "PACO (EUR)", color: "#b45309", optionnel: true },
    { title: t.instFraisGeneraux, icon: Receipt, d: "DFG (EUR)", pa: "PAFG (EUR)", color: "#db2777", optionnel: true },
  ]
    .filter(({ pa, optionnel }) => !optionnel || colonnes.has(pa))
    .map(({ title, icon, d, pa, color }) => {
      const dv = n(coutActuel[d]);
      const plan = planAnnuel(pa);
      return { title, icon, color, dec: dv, plan, percent: plan > 0 ? clampPct((dv / plan) * 100) : 0 };
    });

  const rateLabels = { disbursed: t.disbursed, planned: t.planned };

  /* ----- Sous-titres des filtres (dynamiques, plus de texte en dur) ----- */
  const subAnnee = annees.length ? `${annees[0]} - ${annees[annees.length - 1]}` : "";
  const subMois = moisListe.length
    ? `${t.months[moisListe[0]] ?? moisListe[0]} - ${t.months[moisListe[moisListe.length - 1]] ?? moisListe[moisListe.length - 1]}`
    : "";
  const subUC = ucListe.filter((u) => u !== "Tous").join(", ");

  const totalInstrPct = budgetTotalProjet > 0 ? (dec.totalInstruments / budgetTotalProjet) * 100 : 0;
  const totalOutPct = budgetTotalProjet > 0 ? (dec.totalOutputs / budgetTotalProjet) * 100 : 0;

  return (
    <div className="sc-page">
      <style>{RESPONSIVE_CSS}</style>
      <div className="sc-zoom">
        {/* ============ HEADER ============ */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoWrap}><IconeSuiviCouts size={44} /></div>
            <div>
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
        <div className="sc-filters">
          <div style={styles.bigFilter}>
            <div style={styles.filterIcon}><CalendarDays size={28} color="#1d4ed8" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sc-annee" style={styles.filterLabel}>{t.year}</label>
              <select id="sc-annee" className="sc-select" style={styles.bigSelect} value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}>
                {annees.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <div style={styles.filterSub}>{subAnnee}</div>
            </div>
          </div>

          <div style={styles.bigFilter}>
            <div style={styles.filterIcon}><CalendarDays size={28} color="#1d4ed8" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sc-mois" style={styles.filterLabel}>{t.month}</label>
              <select id="sc-mois" className="sc-select" style={styles.bigSelect} value={mois}
                onChange={(e) => setMois(e.target.value)}>
                <option value="Tous">{t.all}</option>
                {moisListe.map((m) => <option key={m} value={m}>{t.months[m] || m}</option>)}
              </select>
              <div style={styles.filterSub}>{subMois}</div>
            </div>
          </div>

          <div style={styles.bigFilter}>
            <div style={styles.filterIcon}><Building2 size={28} color="#1d4ed8" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sc-uc" style={styles.filterLabel}>{t.unit}</label>
              <select id="sc-uc" className="sc-select" style={styles.bigSelect} value={uc}
                onChange={(e) => setUc(e.target.value)}>
                {ucListe.map((u) => <option key={u} value={u}>{u === "Tous" ? t.all : u}</option>)}
              </select>
              <div style={styles.filterSub} title={subUC}>{subUC}</div>
            </div>
          </div>

          <div className="sc-actions">
            <button type="button" className="sc-btn sc-btn-primary" onClick={() => setShowLogin(true)}>
              <RefreshCw size={15} />{t.update}
            </button>
            <button type="button" className="sc-btn sc-btn-ghost" onClick={handleReset}>
              <RotateCcw size={15} />{t.reset}
            </button>
          </div>
        </div>

        {/* ============ LIGNE DU HAUT ============ */}
        <div className="sc-top">
          {/* Évolution annuelle (programme) */}
          <div className="sc-card">
            <div style={styles.cardHeader}>
              <span>{t.annual}</span>
              <Info size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            </div>

            <div className="sc-kpirow">
              <div style={styles.kpiTile}>
                <div style={styles.kpiIconWrap}><GiPayMoney size={26} color="#2563eb" /></div>
                <div style={styles.kpiContent}>
                  <div style={styles.kpiTopLabel}>{t.cumulative}</div>
                  <div style={styles.kpiMainValue}>{eur(decaissementCumule)}</div>
                  <div style={styles.kpiDivider} />
                  <div style={styles.kpiSubLabel}>{t.totalBudget}</div>
                  <div style={styles.kpiSubValue}>{eur(budgetTotalProjet)}</div>
                </div>
              </div>

              <div style={{ textAlign: "center", margin: "0 auto" }}>
                <div style={styles.kpiLabel}>{t.disbursementRate}</div>
                <Ring percent={tauxDecaissement} color={getProgressColor(tauxDecaissement)} size={100} inner={27} outer={50} font={18} />
              </div>
            </div>

            <div style={styles.chartTitle}>{t.annualEvolution}</div>
            <div style={styles.chartUnit}>{t.millionsEuro}</div>

            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={yearlyData} margin={{ top: 30, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }}
                  axisLine={{ stroke: "#1e293b", strokeWidth: 2 }}
                  tickLine={{ stroke: "#1e293b", strokeWidth: 1.5 }}
                />
                <YAxis
                  width={42}
                  domain={[0, "auto"]}
                  tickFormatter={(v) => (v === 0 ? "0" : `${v}M`)}
                  tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }}
                  axisLine={{ stroke: "#1e293b", strokeWidth: 2 }}
                  tickLine={{ stroke: "#1e293b", strokeWidth: 1.5 }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={22}>
                  {yearlyData.map((entry, index) => (
                    <Cell key={index} fill={entry.value === maxYear ? "#1e3a8a" : "#94a3b8"} />
                  ))}
                  <LabelList
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, value, index } = props;
                      return (
                        <g>
                          <text x={x + width / 2} y={y - 16} textAnchor="middle" fill="#1d4ed8" fontSize="10" fontWeight="700">
                            {(Number(value) || 0).toFixed(2)}M
                          </text>
                          <text x={x + width / 2} y={y - 3} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700">
                            {yearlyData[index]?.percent ?? 0}%
                          </text>
                        </g>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Par instrument */}
          <div className="sc-card">
            <div style={styles.cardHeader}>
              <span>{t.byInstrument}</span>
              {/* NB : ce sélecteur ne filtre encore aucune donnée (voir note) */}
              <select
                aria-label="Bailleur"
                value={bailleur}
                onChange={(e) => setBailleur(e.target.value)}
                style={{
                  fontSize: 12, fontWeight: 700, width: 70, height: 25, padding: "0 8px", borderRadius: 8,
                  border: "1px solid #cbd5e1", cursor: "pointer", outline: "none", flexShrink: 0,
                  backgroundColor: bailleur === "BMZ" ? "#eff6ff" : "#fefce8",
                  color: bailleur === "BMZ" ? "#1d4ed8" : "#854d0e",
                }}
              >
                <option value="BMZ">BMZ</option>
                <option value="UE">UE</option>
              </select>
            </div>

            <div className="sc-cols" style={styles.tableHeader}>
              <span>{t.instrument}</span>
              <span>{t.disbursed}</span>
              <span>{t.allocatedShare}</span>
            </div>

            <div style={{ maxHeight: 340, overflowY: "auto", overflowX: "hidden" }}>
              {instruments.map((item, i) => (
                <TableRow key={i} index={i} icon={item.icon} color={item.color} title={item.title}
                  amount={eur(item.amount)} percent={Number(item.percent) || 0} />
              ))}
            </div>

            <TotalRow label={t.total} amount={eur(dec.totalInstruments)} percent={totalInstrPct}
              color={getProgressColor(totalInstrPct)} />
          </div>

          {/* Par composante */}
          <div className="sc-card">
            <div style={styles.cardHeader}>
              <span>{t.byComponent}</span>
              <Info size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            </div>

            <div className="sc-cols" style={styles.tableHeader}>
              <span>{t.component}</span>
              <span>{t.disbursed}</span>
              <span>{t.budgetShare}</span>
            </div>

            {/* les lignes se partagent toute la hauteur disponible de la carte */}
            <div style={styles.rowsFill}>
              {composantes.map((item, i) => (
                <TableRow key={i} fill index={i} icon={item.icon} color={item.color} title={item.title}
                  amount={eur(item.amount)} percent={Number(item.percent) || 0} />
              ))}
            </div>

            <TotalRow label={t.total} amount={eur(dec.totalOutputs)} percent={totalOutPct} color="#1d4ed8" />
          </div>
        </div>

        {/* ============ LIGNE DU BAS ============ */}
        <div className="sc-bottom">
          {/* Avancement global */}
          <div className="sc-card">
            <div style={{ ...styles.subHead, color: "#1d4ed8" }}>{t.globalProgress}</div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, paddingBottom: 6 }}>
              <Ring percent={tauxAvancement} color={getProgressColor(tauxAvancement)} size={100} inner={25} outer={42} font={16} />

              <div style={{ width: "100%" }}>
                <div style={{ ...styles.summaryRow, borderBottom: "1px solid #e5e7eb" }}>
                  <span style={styles.summaryLabel}>{t.disbursed}</span>
                  <span style={{ fontWeight: 900, color: "#2563eb" }}>{eur(decaisse)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>{t.annualPlanning}</span>
                  <span style={{ fontWeight: 800, color: "#2563eb" }}>{eur(planification)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Par composante */}
          <div className="sc-card">
            <div style={{ ...styles.subHead, color: "#1d4ed8" }}>{t.progressComponent}</div>
            <div className="sc-d4">
              {tauxComposantes.map((item, i) => (
                <BarRateCard key={i} {...item} labels={rateLabels} />
              ))}
            </div>
          </div>

          {/* Par instrument */}
          <div className="sc-card">
            <div style={{ ...styles.subHead, color: "#15803d" }}>{t.progressInstrument}</div>
            <div className="sc-d5" style={{ "--n": tauxInstruments.length } as React.CSSProperties}>
              {tauxInstruments.map((item, i) => (
                <RateCard key={i} {...item} labels={rateLabels} />
              ))}
            </div>
          </div>
        </div>

        {/* ============ LÉGENDE ============ */}
        <div className="sc-footer">
          <div className="sc-footer-head" style={styles.footerHeader}>{t.legend}</div>

          <div style={styles.footerLegend}>
            {[["#ef4444", "0 – 25%"], ["#f59e0b", "25 – 50%"], ["#22c55e", "50 – 75%"], ["#2563eb", "75 – 100%"]].map(([c, label]) => (
              <div key={label} style={styles.legendItem}>
                <span style={{ ...styles.dot, background: c }} />
                {label}
              </div>
            ))}
          </div>

          <div style={styles.footerInfo}>
            <Info size={16} color="#16a34a" style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{t.info}</span>
          </div>

          <div style={styles.footerCTA}>
            <div style={styles.ctaIcon}><FileText size={18} color="#16a34a" /></div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 900, fontSize: 11 }}>{t.access}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>{t.accessDesc}</div>
            </div>
            <button type="button" style={styles.ctaButton}>{t.accessBtn}</button>
          </div>
        </div>

        {/* ============ MODALES ============ */}
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onSuccess={(name: string, jeton: string) => {
              setUserName(name);
              setToken(jeton);
              setShowLogin(false);
              setShowUpdate(true);
            }}
          />
        )}
        {showUpdate && (
          <UpdateModal onClose={() => { setShowUpdate(false); setToken(""); }} userName={userName} token={token} />
        )}
      </div>
    </div>
  );
}

/* ================= STYLES (la mise en page est dans RESPONSIVE_CSS) ================= */

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: "linear-gradient(135deg,#0f2d6b,#0a4cb3)",
    borderRadius: 8,
    padding: "14px 18px",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  logoWrap: { width: 52, height: 52, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: "clamp(15px, 1.2vw + 9px, 22px)", fontWeight: 900, letterSpacing: -0.4, overflowWrap: "anywhere" },
  subtitle: { marginTop: 4, opacity: 0.9, fontWeight: 500, fontSize: 13 },
  dateBox: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.12)", padding: "12px 14px", borderRadius: 10 },
  dateLabel: { fontSize: 11, opacity: 0.8 },
  dateValue: { fontSize: 12, fontWeight: 700 },

  /* filtres */
  bigFilter: {
    display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", background: "#fff",
    border: "1px solid #e2e8f0", borderRadius: 11, minHeight: 78, boxSizing: "border-box", minWidth: 0,
  },
  filterIcon: { width: 42, height: 42, minWidth: 42, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" },
  filterLabel: { display: "block", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 },
  bigSelect: {
    width: "100%", height: 32, padding: "0 28px 0 10px", border: "1px solid #cbd5e1", borderRadius: 7,
    background: "#fff", color: "#0f172a", fontWeight: 700, outline: "none", cursor: "pointer", boxSizing: "border-box",
  },
  filterSub: { fontSize: 10, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  /* cartes */
  cardHeader: {
    background: "linear-gradient(90deg,#0a4cb3,#1d4ed8)", color: "#fff", padding: "8px 12px", fontWeight: 900,
    fontSize: 10, lineHeight: 1.25, letterSpacing: 0.2, display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 8, minHeight: 34,
  },
  subHead: { padding: "8px 10px", fontWeight: 900, fontSize: 10, lineHeight: 1.25, letterSpacing: 0.3, textAlign: "center" },

  kpiTile: { display: "flex", alignItems: "center", gap: 10, flex: "1 1 220px", minWidth: 0, padding: "6px 0 6px 6px" },
  kpiIconWrap: { width: 44, height: 44, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiContent: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left", minWidth: 0 },
  kpiTopLabel: { fontSize: 11, fontWeight: 700, color: "#2563eb", letterSpacing: 0.5, textTransform: "uppercase" },
  kpiMainValue: { fontSize: "clamp(16px, 1vw + 10px, 20px)", fontWeight: 800, color: "#2563eb", lineHeight: 1.1 },
  kpiDivider: { height: 1, background: "#e5e7eb", margin: "6px 0", width: "100%" },
  kpiSubLabel: { fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" },
  kpiSubValue: { fontSize: 13, fontWeight: 800, color: "#0f172a", marginTop: 2 },
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#2563eb", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },

  chartTitle: { textAlign: "center", color: "#2563eb", fontWeight: 900, fontSize: 10, marginBottom: 5, letterSpacing: 0.5, padding: "0 8px" },
  chartUnit: { color: "#64748b", fontSize: 10, fontWeight: 800, marginBottom: 4, marginLeft: 18 },

  /* tableaux */
  tableHeader: {
    padding: "9px 12px", fontSize: 10, fontWeight: 800, color: "#475569", background: "#f1f5f9",
    borderBottom: "2px solid #cbd5e1", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  row: { minHeight: 42, padding: "4px 12px", borderBottom: "1px solid #eef2f7" },
  totalRow: { padding: "8px 12px", borderTop: "1px solid black", marginTop: "auto" },
  cellFlex: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  rowTitle: {
    fontSize: 11, fontWeight: 600, color: "#111827", lineHeight: 1.15, display: "-webkit-box",
    WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word",
  },
  amount: { fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  progressCell: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 },
  percentLeft: { fontSize: 10, fontWeight: 700, textAlign: "right", minWidth: 36 },
  progress: { flex: 1, minWidth: 20, height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, transition: "width 1s ease-in-out" },

  /* avancement global */
  summaryRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "8px 12px", fontSize: 11 },
  summaryLabel: { fontWeight: 700, color: "#475569" },

  /* cartes donuts */
  donutCard: {
    borderRadius: 8, padding: "6px 4px", textAlign: "center", minHeight: 176, display: "flex", flexDirection: "column",
    width: "100%", boxSizing: "border-box", overflow: "hidden", alignItems: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  donutTitle: { fontSize: "clamp(7.5px, 7.5cqw, 9px)", fontWeight: 900, lineHeight: 1.15, minHeight: "3.5em", textAlign: "center", letterSpacing: 0.2 },
  smallLabel: { fontSize: 9, fontWeight: 900, color: "#64748b", lineHeight: 1.1, whiteSpace: "nowrap" },
  money: { fontWeight: 900, fontSize: 11, color: "#0f172a", whiteSpace: "nowrap", lineHeight: 1.2, marginTop: 2 },

  /* textes des cartes « instrument » : suivent la largeur de la carte (8 cartes côte à côte) */
  rateLabel: { fontSize: "clamp(6.5px, 6.8cqw, 9px)", fontWeight: 900, color: "#64748b", lineHeight: 1.1, whiteSpace: "nowrap" },
  rateMoney: { fontWeight: 900, fontSize: "clamp(8px, 9.5cqw, 11px)", color: "#0f172a", whiteSpace: "nowrap", lineHeight: 1.2, marginTop: 2 },

  /* carte « composante » avec barre de progression */
  barCard: {
    display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 6, padding: "7px 9px",
    borderRadius: 8, minWidth: 0, boxSizing: "border-box", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  barCardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  compactTitle: {
    flex: 1, minWidth: 0, fontSize: 9, fontWeight: 900, lineHeight: 1.15, letterSpacing: 0.2, textAlign: "left",
    display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  barCardPct: { fontSize: 13, fontWeight: 900, lineHeight: 1.1, flexShrink: 0 },
  barTrack: { width: "100%", height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" },
  barCardBottom: { display: "flex", alignItems: "stretch", gap: 8 },
  vSep: { width: 1, background: "#cbd5e1", flex: "none" },

  rowsFill: { flex: 1, display: "flex", flexDirection: "column" },

  /* légende */
  footerHeader: { fontSize: 11, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.4 },
  footerLegend: { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#334155" },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 999, display: "inline-block", flexShrink: 0 },
  footerInfo: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#475569", fontWeight: 600 },
  footerCTA: {
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
    background: "#ecfdf5", padding: "6px 10px", borderRadius: 8, border: "1px solid #a7f3d0",
  },
  ctaIcon: { width: 32, height: 32, borderRadius: 8, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ctaButton: { background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
};
