import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import ActivitesAccessModal from "../components/ActivitesAccessModal";
import UpdateActivitesModal from "../components/UpdateActivitesModal";
import {
  CalendarDays, RotateCcw, RefreshCw, CheckCircle, ListChecks, Clock, XCircle,
  TreePine, Landmark, Wheat, HardHat, Building2, Users, Trees, ClipboardCheck, FileText, FileSpreadsheet,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
// Traductions : bloc inchangé, déplacé dans ce fichier (voir les instructions)
import { TEXT, LOCALES } from "./suiviActivitesTranslations";
import type { Txt } from "./suiviActivitesTranslations";

/* ================= CONFIGURATION ================= */

interface LigneActivite {
  Année: number;
  Mois: string;
  UC: string;
  [key: string]: any;
}

const ordreMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const COMPOSANTES: { code: string; key: keyof Txt; icon: any }[] = [
  { code: "C1", key: "componentC1", icon: TreePine },
  { code: "C2", key: "componentC2", icon: Landmark },
  { code: "C3", key: "componentC3", icon: Wheat },
  { code: "C4", key: "componentC4", icon: HardHat },
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
const getProgressColor = (value: number) =>
  value <= 25 ? "#ef4444" : value <= 50 ? "#f59e0b" : value <= 75 ? "#22c55e" : "#2563eb";

/* ================= CSS RESPONSIVE =================
   Design : pas de bandeau vert, fond de page teinté, cartes blanches arrondies.
   Le fond utilise --bg du thème s'il existe (sinon un gris-vert très clair). */

const RESPONSIVE_CSS = `
.sa-page{container-type:inline-size;container-name:sa;width:100%;font-family:Inter,system-ui,sans-serif;
  background:var(--bg,#f1f5f2);border-radius:16px}
.sa-zoom{display:flex;flex-direction:column;gap:14px;padding:clamp(10px,2vw,20px);box-sizing:border-box;min-width:0}
@media (min-width:1920px){.sa-zoom{zoom:1.2}}
@media (min-width:2560px){.sa-zoom{zoom:1.5}}
@media (min-width:3200px){.sa-zoom{zoom:1.9}}
@media (min-width:3840px){.sa-zoom{zoom:2.3}}

.sa-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(200px,.7fr);gap:6px;align-items:stretch;
  background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:8px;box-sizing:border-box;
  box-shadow:0 1px 2px rgba(15,23,42,.04)}
.sa-filter{display:flex;align-items:center;gap:8px;padding:6px 10px;border-right:1px solid var(--border);min-width:0}
.sa-select{font-size:13px}
.sa-actions{display:flex;flex-direction:column;justify-content:center;gap:5px;padding-left:4px}
.sa-btn{width:100%;min-height:40px;box-sizing:border-box;padding:6px 10px;border-radius:10px;font-size:12px;font-weight:700;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;line-height:1.1;transition:background .2s ease}
.sa-btn-ghost{border:1px solid var(--border);background:var(--surface);color:var(--text-2)}
.sa-btn-ghost:hover{background:var(--surface-2)}
.sa-btn-primary{border:1px solid #2563eb;background:#2563eb;color:#fff}
.sa-btn-primary:hover{background:#1d4ed8}

/* export : bouton vert plein avec l'année exportée */
.sa-header-right{display:flex;align-items:center;flex-wrap:wrap;gap:12px}
.sa-export{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 6px 0 14px;border-radius:999px;
  border:1px solid #16a34a;background:#16a34a;color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;
  box-shadow:0 2px 6px rgba(22,163,74,.25);transition:background .2s ease,transform .15s ease}
.sa-export:hover{background:#15803d}
.sa-export:active{transform:scale(.97)}
.sa-export-year{background:rgba(255,255,255,.22);color:#fff;border-radius:999px;padding:5px 11px;font-size:11px;font-weight:800}

.sa-top{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.7fr);gap:12px;align-items:stretch}
.sa-axes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.sa-footer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 12px;align-items:center;
  background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:12px 16px 14px;
  box-shadow:0 1px 2px rgba(15,23,42,.04)}
.sa-footer-head{grid-column:1/-1}

.sa-card{container-type:inline-size;background:var(--surface);border-radius:16px;border:1px solid var(--border);padding:14px;
  box-sizing:border-box;display:flex;flex-direction:column;min-width:0;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.sa-comp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;gap:8px;margin-top:10px;flex:1}
.sa-compcard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:8px 6px}
.sa-comptext{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.sa-axrow{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(4px,1vw,10px);align-items:center;
  padding:5px 0;border-bottom:1px solid var(--border)}
.sa-axrow:last-child{border-bottom:none}

@container (min-width:560px){
  .sa-compcard{flex-direction:row;justify-content:space-between;text-align:left;gap:12px;padding:10px 18px}
  .sa-comptext{flex-direction:row;gap:12px;flex:1}
}
@container (max-width:359px){.sa-axrow{grid-template-columns:minmax(0,1fr)}}

@container sa (max-width:1099px){
  .sa-filters{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sa-filter{border:1px solid var(--border);border-radius:10px}
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
        <Pie data={[{ value: p }, { value: 100 - p }]} innerRadius={inner} outerRadius={outer} dataKey="value" stroke="none">
          <Cell fill={color} />
          <Cell fill="var(--track)" />
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
        <Icon size={18} color="#16a34a" style={{ flexShrink: 0 }} />
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
  const [token, setToken] = useState("");

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
  const ucOptions = useMemo(
    () => ["Tous", ...Array.from(new Set(data.map((d) => d.UC))).filter((u) => u !== "Tous")],
    [data]
  );

  /* ----- ligne affichée ----- */
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

  /* ----- sous-titres des filtres ----- */
  const subAnnee = annees.length ? `${annees[0]} - ${annees[annees.length - 1]}` : "";
  const subMois = moisListe.length
    ? `${t.months[moisListe[0]] ?? moisListe[0]} - ${t.months[moisListe[moisListe.length - 1]] ?? moisListe[moisListe.length - 1]}`
    : "";
  const subUC = ucOptions.filter((u) => u !== "Tous").join(", ");

  /* ----- export Excel ----- */
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
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 12 } },
      { s: { r: 0, c: 13 }, e: { r: 0, c: 28 } },
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
        {/* ============ HEADER (sans bande verte) ============ */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoWrap}><ClipboardCheck size={28} color="#16a34a" strokeWidth={2} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.title}>{t.title}</div>
              <div style={styles.subtitle}>{t.subtitle}</div>
            </div>
          </div>

          <div className="sa-header-right">
            <div style={styles.dateBox}>
              <CalendarDays size={18} />
              <div>
                <div style={styles.dateLabel}>{t.updated}</div>
                <div style={styles.dateValue}>{dateAffichee}</div>
              </div>
            </div>

            <button type="button" className="sa-export" onClick={handleExportExcel}
              title={`${t.exportTitle} ${annee}`} aria-label={`${t.exportTitle} ${annee}`}>
              <FileSpreadsheet size={20} strokeWidth={1.8} />
              <span>{t.exportTitle}</span>
              <span className="sa-export-year">{annee}</span>
            </button>
          </div>
        </div>

        {/* ============ FILTRES ============ */}
        <div className="sa-filters">
          <div className="sa-filter">
            <div style={styles.filterIcon}><CalendarDays size={26} color="#16a34a" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label htmlFor="sa-annee" style={styles.filterLabel}>{t.year}</label>
              <select id="sa-annee" className="sa-select" style={styles.bigSelect} value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}>
                {annees.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <div style={styles.filterSub}>{subAnnee}</div>
            </div>
          </div>

          <div className="sa-filter">
            <div style={styles.filterIcon}><CalendarDays size={26} color="#16a34a" /></div>
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
            <div style={styles.filterIcon}><Building2 size={26} color="#16a34a" /></div>
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
          <div className="sa-card">
            <div style={styles.cardHeader}>{t.globalProgress}</div>

            <div style={styles.globalWrap}>
              <Ring percent={tauxGlobal} color={couleurGlobal} size={170} inner={50} outer={76} font={20} label={fmtPct(tauxGlobal)} />

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

          <div className="sa-card">
            <div style={styles.cardHeader}>{t.byAchievement}</div>

            <div style={styles.resultsColumn}>
              {results.map((r) => {
                const color = getProgressColor(r.percent);
                return (
                  <div key={r.label} style={styles.resultBlock}>
                    <div style={styles.resultTitle}>{r.label}</div>
                    <Ring percent={r.percent} color={color} size={120} inner={36} outer={56} font={18} label={fmtPct(r.percent)} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sa-card">
            <div style={styles.cardHeader}>{t.byComponent}</div>

            <div className="sa-comp">
              {composantes.map((c) => {
                const Icon = c.icon;
                const color = getProgressColor(c.percent);
                return (
                  <div key={c.label} className="sa-compcard" style={styles.smallCard}>
                    <div className="sa-comptext">
                      <div style={styles.compIcon}><Icon size={20} color="#16a34a" /></div>
                      <div style={styles.compLabel}>{c.label}</div>
                    </div>
                    <Ring percent={c.percent} color={color} size={88} inner={30} outer={43} font={13} label={fmtPct(c.percent)} />
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
          onSuccess={(name: string, jeton: string) => {
            setUserName(name);
            setToken(jeton);
            setShowLogin(false);
            setShowUpdate(true);
          }}
        />

        <UpdateActivitesModal
          isOpen={showUpdate}
          onClose={() => {
            setShowUpdate(false);
            setToken("");
          }}
          userName={userName}
          token={token}
          onUpdateSuccess={async () => {
            await chargerDonnees();
            await chargerDateMiseAJour();
          }}
        />
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles: Record<string, React.CSSProperties> = {
  header: {
    color: "var(--text)", padding: "4px 2px 6px", display: "flex", justifyContent: "space-between",
    alignItems: "center", flexWrap: "wrap", gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 },
  logoWrap: { width: 50, height: 50, borderRadius: 16, background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: "clamp(18px, 1.4vw + 10px, 26px)", fontWeight: 800, letterSpacing: -0.2, color: "var(--text)", overflowWrap: "anywhere" },
  subtitle: { fontSize: 13, fontWeight: 500, color: "var(--text-3)", marginTop: 3 },
  dateBox: { display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)", color: "#16a34a" },
  dateLabel: { fontSize: 10, color: "var(--text-3)" },
  dateValue: { fontSize: 12, fontWeight: 700, color: "var(--text)" },

  /* filtres */
  filterIcon: { width: 38, height: 38, borderRadius: 10, background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  filterLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#16a34a", letterSpacing: 0.3, marginBottom: 2 },
  bigSelect: {
    width: "100%", minWidth: 0, height: 30, borderRadius: 8, border: "1px solid var(--border)", padding: "0 8px",
    fontWeight: 600, background: "var(--surface)", color: "var(--text)", outline: "none", boxSizing: "border-box", cursor: "pointer",
  },
  filterSub: { marginTop: 4, fontSize: 11, color: "var(--text-3)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  /* cartes */
  cardHeader: {
    fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", paddingBottom: 4,
    color: "var(--text-2)", textAlign: "left",
  },

  globalWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 8 },
  kpiList: { display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8, width: "100%" },
  kpiItem: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--surface-2)" },
  kpiLabel: { fontSize: 12, color: "var(--text)", minWidth: 0 },
  kpiValue: { minWidth: 40, textAlign: "right", fontWeight: 700, color: "var(--text)", fontSize: 13 },

  resultsColumn: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, marginTop: 10 },
  resultBlock: {
    width: "100%", maxWidth: 380, margin: "0 auto", background: "var(--surface-2)", borderRadius: 14, padding: 12,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxSizing: "border-box",
  },
  resultTitle: { fontSize: 14, fontWeight: 900, color: "var(--text)", textAlign: "center" },

  smallCard: { background: "var(--surface-2)", borderRadius: 12, minWidth: 0 },
  compIcon: { width: 38, height: 38, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  compLabel: { fontSize: 11, fontWeight: 700, color: "var(--text)", lineHeight: 1.2, overflowWrap: "anywhere" },

  /* axes prioritaires */
  axisHeader: {
    background: "rgba(22,163,74,0.10)", color: "#16a34a", padding: "9px 12px", borderRadius: 10, fontWeight: 800, fontSize: 12,
    letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 10,
  },
  axisTableHeader: {
    display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 10, fontSize: 11, fontWeight: 600,
    color: "var(--text-3)", padding: "6px 4px", borderBottom: "1px solid var(--border)",
  },
  axisLeftCol: { display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 4, alignItems: "center", minWidth: 0 },
  axisCode: { fontWeight: 600, color: "var(--text-3)", fontSize: 11 },
  axisName: { fontSize: 12, lineHeight: 1.3, overflowWrap: "anywhere" },
  axisRightCol: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 6, alignItems: "center" },
  axisBar: { height: 8, background: "var(--track)", borderRadius: 999, overflow: "hidden" },
  axisFill: { height: "100%", borderRadius: 999 },
  axisPercent: { minWidth: 44, paddingRight: 6, textAlign: "right", fontWeight: 900, fontSize: 11 },

  /* légende */
  footerHeader: { color: "var(--text-2)", fontWeight: 800, fontSize: 11, letterSpacing: 0.4 },
  footerLegend: { display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800 },
  dot: { display: "inline-block", width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  footerCTA: {
    display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, background: "var(--green-soft)",
    borderRadius: 12, padding: "10px 12px",
  },
  ctaIcon: { width: 32, height: 32, borderRadius: 8, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ctaButton: { background: "#16a34a", color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
};
