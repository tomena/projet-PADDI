import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, BarChart, Bar, Cell, LabelList, Legend, PieChart, Pie,
} from "recharts";
import {
  Target, Calendar, MapPin, ExternalLink, Check, Clock, AlertTriangle,
  Download, RotateCcw, Search, ChevronLeft, ChevronRight, ArrowUpDown,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

/* ================= TRADUCTIONS =================
   `fr` sert de modèle : TypeScript impose que mg / en / de contiennent exactement les mêmes clés. */
const fr = {
  title: "Système de suivi",
  subtitle: (n: number) => `Régions disposant déjà d'un système de suivi · ${n} région${n > 1 ? "s" : ""} affichée${n > 1 ? "s" : ""}`,
  year: "Année", region: "Région", status: "Statut", search: "Recherche", searchPh: "Région ou entité…",
  allRegions: "Toutes les régions", allStatus: "Tous", include7: "Inclure la 7e région", reset: "Réinitialiser", exportCsv: "Exporter CSV",
  banner: "Indicateur : nombre de régions d'intervention qui disposent déjà d'un système de suivi.",
  statusL: { done: "Atteint", progress: "En cours", late: "En retard" },
  legend: { done: "≥ 80 % Atteint", progress: "50–79 % En cours", late: "< 50 % En retard" },
  kCover: "Régions disposant d'un système",
  kCoverSub: (p: string, y: number) => `${p} % de couverture · situation ${y}`,
  kAvg: "Avancement moyen", kAvgSub: "Moyenne des régions affichées",
  kGap: "Écart à la trajectoire", pts: "pts", noTarget: "Pas de cible pour cette année",
  targetYear: (y: number, v: string) => `Cible ${y} : ${v} %`,
  kLate: "Régions en retard", kLateSub: (d: number, p: number) => `${d} atteintes · ${p} en cours`,
  rate: "Taux d'atteinte de la cible", target100: "Cible : 100 %", regionsEquipped: "régions disposent déjà d'un système de suivi",
  trajTitle: "Trajectoire prévue et réalisée", yearLine: "Année", planned: "Cible prévue", actual: "Réalisé",
  compare: "Comparaison des régions (%)", noRegion: "Aucune région ne correspond aux filtres.", progress: "Avancement",
  alertsTitle: (n: number) => `Points d'attention (${n})`, noAlert: "Aucune alerte : tout est dans les temps.",
  alertLate: (name: string, v: string) => `${name} : avancement de ${v} %, sous le seuil de 50 %.`,
  alertOrg: (name: string) => `${name} : aucune entité n'héberge encore le système de suivi.`,
  tableTitle: "Systèmes de suivi par région", colSetup: "Mise en place", colOrg: "Entité hébergeante", colLink: "Lien", colState: "État", colUpdate: "Dernière MAJ",
  noResult: "Aucun résultat. Modifiez ou réinitialisez les filtres.", show: "Afficher", rowsWord: "lignes",
  range: (a: number, b: number, n: number) => `${a} – ${b} sur ${n}`,
  prev: "Page précédente", next: "Page suivante",
  source: "Source :", loading: "Chargement des données…", demo: "Données fictives de démonstration", lastUpdate: "dernière actualisation :",
  csv: ["Région", "Avancement (%)", "Date de mise en place", "Entité", "Lien", "Statut", "Dernière MAJ"],
};
type Txt = typeof fr;

const mg: Txt = {
  title: "Rafitra fanaraha-maso",
  subtitle: (n) => `Faritra manana rafitra fanaraha-maso efa misy · faritra ${n} aseho`,
  year: "Taona", region: "Faritra", status: "Toetra", search: "Fikarohana", searchPh: "Faritra na andrim-panjakana…",
  allRegions: "Faritra rehetra", allStatus: "Rehetra", include7: "Ampidirina ny faritra faha-7", reset: "Averina", exportCsv: "Hamoaka CSV",
  banner: "Tondro : isan'ny faritra iasana manana rafitra fanaraha-maso efa misy.",
  statusL: { done: "Tratra", progress: "Mandeha", late: "Tara" },
  legend: { done: "≥ 80 % Tratra", progress: "50–79 % Mandeha", late: "< 50 % Tara" },
  kCover: "Faritra manana rafitra",
  kCoverSub: (p, y) => `${p} % ny fandrakofana · toe-javatra ${y}`,
  kAvg: "Fandrosoana salan'isa", kAvgSub: "Salan'isan'ny faritra aseho",
  kGap: "Elanelana amin'ny làlana nokasaina", pts: "teboka", noTarget: "Tsy misy tanjona amin'ity taona ity",
  targetYear: (y, v) => `Tanjona ${y} : ${v} %`,
  kLate: "Faritra tara", kLateSub: (d, p) => `${d} tratra · ${p} mandeha`,
  rate: "Tahan'ny fahatratrarana ny tanjona", target100: "Tanjona : 100 %", regionsEquipped: "faritra no manana rafitra fanaraha-maso efa misy",
  trajTitle: "Làlana nokasaina sy vita", yearLine: "Taona", planned: "Tanjona nokasaina", actual: "Vita",
  compare: "Fampitahana ny faritra (%)", noRegion: "Tsy misy faritra mifanaraka amin'ny sivana.", progress: "Fandrosoana",
  alertsTitle: (n) => `Zavatra tokony hojerena (${n})`, noAlert: "Tsy misy fampitandremana : mandeha ara-potoana ny zava-drehetra.",
  alertLate: (name, v) => `${name} : fandrosoana ${v} %, ambanin'ny tahan'ny 50 %.`,
  alertOrg: (name) => `${name} : mbola tsy misy andrim-panjakana mampiantrano ny rafitra fanaraha-maso.`,
  tableTitle: "Rafitra fanaraha-maso isam-paritra", colSetup: "Daty nananganana", colOrg: "Andrim-panjakana mampiantrano", colLink: "Rohy", colState: "Toetra", colUpdate: "Fanavaozana farany",
  noResult: "Tsy misy valiny. Ovay na averina ny sivana.", show: "Asehoy", rowsWord: "andalana",
  range: (a, b, n) => `${a} – ${b} amin'ny ${n}`,
  prev: "Pejy teo aloha", next: "Pejy manaraka",
  source: "Loharano :", loading: "Ampidirina ny angona…", demo: "Angona noforonina ho fanehoana", lastUpdate: "fanavaozana farany :",
  csv: ["Faritra", "Fandrosoana (%)", "Daty nananganana", "Andrim-panjakana", "Rohy", "Toetra", "Fanavaozana farany"],
};

const en: Txt = {
  title: "Monitoring system",
  subtitle: (n) => `Regions that already have a monitoring system · ${n} region${n > 1 ? "s" : ""} shown`,
  year: "Year", region: "Region", status: "Status", search: "Search", searchPh: "Region or entity…",
  allRegions: "All regions", allStatus: "All", include7: "Include the 7th region", reset: "Reset", exportCsv: "Export CSV",
  banner: "Indicator: number of intervention regions that already have a monitoring system.",
  statusL: { done: "Reached", progress: "In progress", late: "Delayed" },
  legend: { done: "≥ 80 % Reached", progress: "50–79 % In progress", late: "< 50 % Delayed" },
  kCover: "Regions with a system",
  kCoverSub: (p, y) => `${p} % coverage · situation in ${y}`,
  kAvg: "Average progress", kAvgSub: "Average of the regions shown",
  kGap: "Gap to trajectory", pts: "pts", noTarget: "No target for this year",
  targetYear: (y, v) => `Target ${y}: ${v} %`,
  kLate: "Delayed regions", kLateSub: (d, p) => `${d} reached · ${p} in progress`,
  rate: "Target achievement rate", target100: "Target: 100 %", regionsEquipped: "regions already have a monitoring system",
  trajTitle: "Planned and actual trajectory", yearLine: "Year", planned: "Planned target", actual: "Actual",
  compare: "Regional comparison (%)", noRegion: "No region matches the filters.", progress: "Progress",
  alertsTitle: (n) => `Points of attention (${n})`, noAlert: "No alerts: everything is on schedule.",
  alertLate: (name, v) => `${name}: progress of ${v} %, below the 50 % threshold.`,
  alertOrg: (name) => `${name}: no entity hosts the monitoring system yet.`,
  tableTitle: "Monitoring systems by region", colSetup: "Set-up date", colOrg: "Hosting entity", colLink: "Link", colState: "Status", colUpdate: "Last update",
  noResult: "No result. Change or reset the filters.", show: "Show", rowsWord: "rows",
  range: (a, b, n) => `${a} – ${b} of ${n}`,
  prev: "Previous page", next: "Next page",
  source: "Source:", loading: "Loading data…", demo: "Demonstration data (fictional)", lastUpdate: "last updated:",
  csv: ["Region", "Progress (%)", "Set-up date", "Entity", "Link", "Status", "Last update"],
};

const de: Txt = {
  title: "Monitoringsystem",
  subtitle: (n) => `Regionen mit bereits vorhandenem Monitoringsystem · ${n} Region${n > 1 ? "en" : ""} angezeigt`,
  year: "Jahr", region: "Region", status: "Status", search: "Suche", searchPh: "Region oder Einrichtung…",
  allRegions: "Alle Regionen", allStatus: "Alle", include7: "7. Region einbeziehen", reset: "Zurücksetzen", exportCsv: "CSV exportieren",
  banner: "Indikator: Anzahl der Interventionsregionen, die bereits über ein Monitoringsystem verfügen.",
  statusL: { done: "Erreicht", progress: "In Arbeit", late: "Im Rückstand" },
  legend: { done: "≥ 80 % Erreicht", progress: "50–79 % In Arbeit", late: "< 50 % Im Rückstand" },
  kCover: "Regionen mit System",
  kCoverSub: (p, y) => `${p} % Abdeckung · Stand ${y}`,
  kAvg: "Durchschnittlicher Fortschritt", kAvgSub: "Durchschnitt der angezeigten Regionen",
  kGap: "Abweichung vom Zielpfad", pts: "Pkt.", noTarget: "Kein Ziel für dieses Jahr",
  targetYear: (y, v) => `Ziel ${y}: ${v} %`,
  kLate: "Regionen im Rückstand", kLateSub: (d, p) => `${d} erreicht · ${p} in Arbeit`,
  rate: "Zielerreichungsgrad", target100: "Ziel: 100 %", regionsEquipped: "Regionen verfügen bereits über ein Monitoringsystem",
  trajTitle: "Geplanter und tatsächlicher Verlauf", yearLine: "Jahr", planned: "Geplantes Ziel", actual: "Erreicht",
  compare: "Regionenvergleich (%)", noRegion: "Keine Region entspricht den Filtern.", progress: "Fortschritt",
  alertsTitle: (n) => `Aufmerksamkeitspunkte (${n})`, noAlert: "Keine Warnungen: alles im Zeitplan.",
  alertLate: (name, v) => `${name}: Fortschritt von ${v} %, unter der Schwelle von 50 %.`,
  alertOrg: (name) => `${name}: noch keine Einrichtung betreibt das Monitoringsystem.`,
  tableTitle: "Monitoringsysteme nach Region", colSetup: "Einrichtungsdatum", colOrg: "Trägereinrichtung", colLink: "Link", colState: "Status", colUpdate: "Letzte Aktualisierung",
  noResult: "Kein Ergebnis. Filter ändern oder zurücksetzen.", show: "Anzeigen", rowsWord: "Zeilen",
  range: (a, b, n) => `${a} – ${b} von ${n}`,
  prev: "Vorherige Seite", next: "Nächste Seite",
  source: "Quelle:", loading: "Daten werden geladen…", demo: "Fiktive Demonstrationsdaten", lastUpdate: "zuletzt aktualisiert:",
  csv: ["Region", "Fortschritt (%)", "Einrichtungsdatum", "Einrichtung", "Link", "Status", "Letzte Aktualisierung"],
};

const TXT: Record<string, Txt> = { fr, mg, en, de };
const DATE_LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };
const makeNf = (loc: string) => (n: number) => n.toLocaleString(loc, { maximumFractionDigits: 1 });

/* Thème : couleur de donnée → texte / fond lisibles en clair comme en sombre */
const tonText = (c: string) => `color-mix(in srgb, ${c} 70%, var(--text))`;
const tonBg = (c: string) => `color-mix(in srgb, ${c} 18%, transparent)`;
const TICK = { fontSize: 11, fill: "var(--text-3)" };
const TT = {
  fontSize: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)",
};

/* ============================ TYPES & DONNÉES ============================ */
type Status = "done" | "progress" | "late";
interface Region {
  name: string;
  counted: boolean;          // false = 7e région, hors périmètre de l'indicateur
  avancement: number;        // 0–100
  date: string | null;       // date de mise en place du système
  org: string | null;
  link: string | null;
  maj: string;               // dernière mise à jour des données
}

// ⚠️ Données fictives – à remplacer par un appel API (voir hook à la fin du fichier)
const REGIONS: Region[] = [
  { name: "Boeny", counted: true, avancement: 100, date: "2024-03-15", maj: "2026-10-28",
    org: "DREDD – Direction Régionale de l'Environnement et du Développement Durable", link: "https://suivi-boeny.mg" },
  { name: "DIANA", counted: true, avancement: 100, date: "2024-06-10", maj: "2026-10-30",
    org: "DREDD – Direction Régionale de l'Environnement et du Développement Durable", link: "https://suivi-diana.mg" },
  { name: "Amoron'i Mania", counted: true, avancement: 75, date: "2024-11-22", maj: "2026-09-12",
    org: "BREDD – Bureau Régional de l'Environnement et du Développement Durable", link: "https://suivi-amoroni-mania.mg" },
  { name: "Vakinankaratra", counted: true, avancement: 50, date: "2025-02-05", maj: "2026-08-03",
    org: "BREDD – Bureau Régional de l'Environnement et du Développement Durable", link: "https://suivi-vakinankaratra.mg" },
  { name: "Anôsy", counted: true, avancement: 25, date: null, maj: "2026-06-20", org: null, link: null },
  { name: "Atsimo Atsinanana", counted: true, avancement: 10.5, date: null, maj: "2026-05-02", org: null, link: null },
  { name: "Menabe (7e région)", counted: false, avancement: 40, date: null, maj: "2026-07-15", org: null, link: null },
];

const TRAJECTOIRE = [
  { annee: 2025, prevu: 66.7, realise: 66.7 },
  { annee: 2026, prevu: 70, realise: 66.7 },
  { annee: 2027, prevu: 76.7 },
  { annee: 2028, prevu: 83.3 },
  { annee: 2029, prevu: 90 },
  { annee: 2030, prevu: 100 },
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const PAGE_SIZES = [5, 10, 20];

// Une seule source de vérité pour les statuts (couleur de donnée ; texte et fond de pastille calculés)
const STATUS: Record<Status, { color: string; Icon: typeof Check }> = {
  done: { color: "#15803d", Icon: Check },
  progress: { color: "#b45309", Icon: Clock },
  late: { color: "#b91c1c", Icon: AlertTriangle },
};
const statusOf = (v: number): Status => (v >= 80 ? "done" : v >= 50 ? "progress" : "late");

/* ================================ HELPERS ================================ */
const fdate = (d: string | null, loc: string) => (d ? new Date(d + "T00:00:00").toLocaleDateString(loc) : "—");
const host = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };
const isDeployed = (r: Region, year: number) => !!r.date && Number(r.date.slice(0, 4)) <= year;

function exportCsv(rows: Region[], head: string[], label: (s: Status) => string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [r.name, r.avancement, r.date ?? "", r.org ?? "", r.link ?? "", label(statusOf(r.avancement)), r.maj].map(esc).join(";"));
  const blob = new Blob(["\uFEFF" + [head.map(esc).join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `suivi-systemes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ===================== CHARGEMENT DES DONNÉES (mise à jour) =====================
   La page lit DATA_URL au chargement. Pour mettre à jour : modifier ce fichier JSON
   (même structure que REGIONS), sans toucher au code. Si le fichier est absent,
   les données de démonstration ci-dessus s'affichent. */
const DATA_URL = "/data/regions.json"; // peut aussi être l'URL d'une API

function useRegions() {
  const [data, setData] = useState<Region[]>(REGIONS);
  const [state, setState] = useState<"loading" | "ok" | "demo">("loading");
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(DATA_URL, { signal: ctrl.signal, cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: Region[]) => { setData(d); setState("ok"); })
      .catch(() => { if (!ctrl.signal.aborted) setState("demo"); });
    return () => ctrl.abort();
  }, []);
  return { data, state };
}

/* Logo : radar (suivi) + point repéré sur le territoire (région équipée) */
const Logo = () => (
  <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
    <rect width="48" height="48" rx="12" fill="#16a34a" />
    <circle cx="24" cy="24" r="15" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
    <circle cx="24" cy="24" r="8" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
    <path d="M24 24 L36 13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="24" r="3" fill="#fff" />
    <circle cx="35.5" cy="14" r="3.4" fill="#fde047" />
  </svg>
);

/* ============================ SOUS-COMPOSANTS ============================ */
const StatusChip = memo(({ status, label }: { status: Status; label: string }) => {
  const { color, Icon } = STATUS[status];
  return (
    <span className="sv-chip" style={{ color: tonText(color), background: tonBg(color) }}>
      <Icon size={14} aria-hidden /> {label}
    </span>
  );
});

const Kpi = memo(({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) => (
  <div className="sv-card sv-kpi">
    <span className="sv-muted">{label}</span>
    <strong style={{ color: tone ? tonText(tone) : undefined }}>{value}</strong>
    {sub && <small className="sv-muted">{sub}</small>}
  </div>
));

const Card = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={`sv-card ${className}`}>
    <h3 className="sv-card-title">{title}</h3>
    {children}
  </section>
);

/* ================================ PAGE ================================== */
const INITIAL = { year: 2026, region: "all", status: "all", q: "", include7: false };

export default function SuiviSystemes() {
  const { lang } = useLanguage();               // adapte si ton hook expose "language"
  const t = TXT[lang] ?? fr;
  const loc = DATE_LOCALES[lang] ?? "fr-FR";
  const nf = useMemo(() => makeNf(loc), [loc]);
  const { data, state } = useRegions();
  const [f, setF] = useState(INITIAL);
  const [sort, setSort] = useState<{ key: keyof Region; dir: 1 | -1 }>({ key: "avancement", dir: -1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const update = (p: Partial<typeof INITIAL>) => { setF((s) => ({ ...s, ...p })); setPage(1); };
  const toggleSort = (key: keyof Region) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  /* Tout est dérivé d'une seule source → aucune incohérence possible entre KPI, graphiques et tableau */
  const scope = useMemo(() => data.filter((r) => r.counted || f.include7), [data, f.include7]);

  const view = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return scope.filter((r) =>
      (f.region === "all" || r.name === f.region) &&
      (f.status === "all" || statusOf(r.avancement) === f.status) &&
      (!q || `${r.name} ${r.org ?? ""}`.toLowerCase().includes(q)));
  }, [scope, f.region, f.status, f.q]);

  const stats = useMemo(() => {
    const total = view.length;
    const deployed = view.filter((r) => isDeployed(r, f.year)).length;
    const couverture = total ? (deployed / total) * 100 : 0;
    const moyenne = total ? view.reduce((s, r) => s + r.avancement, 0) / total : 0;
    const count = (s: Status) => view.filter((r) => statusOf(r.avancement) === s).length;
    const prevu = TRAJECTOIRE.find((t) => t.annee === f.year)?.prevu;
    return { total, deployed, couverture, moyenne, done: count("done"), progress: count("progress"), late: count("late"),
      ecart: prevu === undefined ? null : couverture - prevu };
  }, [view, f.year]);

  const alerts = useMemo(() => [
    ...view.filter((r) => statusOf(r.avancement) === "late")
      .map((r) => t.alertLate(r.name, nf(r.avancement))),
    ...view.filter((r) => !r.org).map((r) => t.alertOrg(r.name)),
  ], [view, t, nf]);

  const sorted = useMemo(() => [...view].sort((a, b) => {
    const x = a[sort.key] ?? "", y = b[sort.key] ?? "";
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
  }), [view, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages);
  const rows = sorted.slice((cur - 1) * pageSize, cur * pageSize);
  const donut = [{ v: stats.couverture }, { v: 100 - stats.couverture }];
  const barData = useMemo(() => [...view].sort((a, b) => b.avancement - a.avancement), [view]);

  const SortTh = ({ k, children }: { k: keyof Region; children: React.ReactNode }) => (
    <th aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="sv-th-btn" onClick={() => toggleSort(k)}>{children}<ArrowUpDown size={12} aria-hidden /></button>
    </th>
  );

  return (
    <main className="sv">
      <style>{CSS}</style>

      {/* ----- En-tête + filtres ----- */}
      <header className="sv-head">
        <div className="sv-brand">
          <Logo />
          <div>
          <h1>{t.title}</h1>
          <p className="sv-muted">{t.subtitle(stats.total)}</p>
          </div>
        </div>
        <div className="sv-filters" role="search">
          <label><span><Calendar size={13} /> {t.year}</span>
            <select value={f.year} onChange={(e) => update({ year: +e.target.value })}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select></label>
          <label><span><MapPin size={13} /> {t.region}</span>
            <select value={f.region} onChange={(e) => update({ region: e.target.value })}>
              <option value="all">{t.allRegions}</option>
              {scope.map((r) => <option key={r.name}>{r.name}</option>)}
            </select></label>
          <label><span>{t.status}</span>
            <select value={f.status} onChange={(e) => update({ status: e.target.value })}>
              <option value="all">{t.allStatus}</option>
              {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{t.statusL[s]}</option>)}
            </select></label>
          <label className="sv-search"><span><Search size={13} /> {t.search}</span>
            <input value={f.q} onChange={(e) => update({ q: e.target.value })} placeholder={t.searchPh} /></label>
          <label className="sv-check">
            <input type="checkbox" checked={f.include7} onChange={(e) => update({ include7: e.target.checked, region: "all" })} />
            {t.include7}</label>
          <button className="sv-btn" onClick={() => { setF(INITIAL); setPage(1); }}><RotateCcw size={14} /> {t.reset}</button>
          <button className="sv-btn sv-btn-ghost" onClick={() => exportCsv(sorted, t.csv, (x) => t.statusL[x])}><Download size={14} /> {t.exportCsv}</button>
        </div>
      </header>

      <div className="sv-banner">
        <Target size={22} aria-hidden />
        <span>{t.banner}</span>
      </div>

      {/* ----- KPI ----- */}
      <div className="sv-kpis">
        <Kpi label={t.kCover} value={`${stats.deployed} / ${stats.total}`} tone="#15803d"
          sub={t.kCoverSub(nf(stats.couverture), f.year)} />
        <Kpi label={t.kAvg} value={`${nf(stats.moyenne)} %`} sub={t.kAvgSub} />
        <Kpi label={t.kGap}
          value={stats.ecart === null ? "—" : `${stats.ecart > 0 ? "+" : ""}${nf(stats.ecart)} ${t.pts}`}
          tone={stats.ecart !== null && stats.ecart < 0 ? "#b91c1c" : "#15803d"}
          sub={stats.ecart === null ? t.noTarget : t.targetYear(f.year, nf(TRAJECTOIRE.find((x) => x.annee === f.year)!.prevu))} />
        <Kpi label={t.kLate} value={String(stats.late)} tone={stats.late ? "#b91c1c" : "#15803d"}
          sub={t.kLateSub(stats.done, stats.progress)} />
      </div>

      {/* ----- Graphiques ----- */}
      <div className="sv-charts">
        <Card title={t.rate}>
          <div className="sv-donut">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={donut} dataKey="v" innerRadius="68%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                  <Cell fill="#16a34a" /><Cell fill="var(--track)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="sv-donut-center"><strong>{nf(stats.couverture)} %</strong><small>{t.target100}</small></div>
          </div>
          <p className="sv-center"><b>{stats.deployed} / {stats.total}</b> {t.regionsEquipped}</p>
        </Card>

        <Card title={t.trajTitle}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={TRAJECTOIRE} margin={{ top: 16, right: 24, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="annee" tick={TICK} stroke="var(--text-3)" />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={TICK} stroke="var(--text-3)" />
              <Tooltip formatter={(v: number) => `${nf(v)} %`} contentStyle={TT} labelStyle={{ color: "var(--text)", fontWeight: 700 }} />
              <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11, color: "var(--text-2)" }} />
              <ReferenceLine x={f.year} stroke="var(--text-3)" strokeDasharray="4 4" label={{ value: t.yearLine, fontSize: 10, position: "top", fill: "var(--text-3)" }} />
              <Line dataKey="prevu" name={t.planned} stroke="#9ca3af" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="realise" name={t.actual} stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t.compare}>
          {barData.length === 0 ? <p className="sv-empty">{t.noRegion}</p> : (
            <>
              <ResponsiveContainer width="100%" height={barData.length * 42 + 30}>
                <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={TICK} stroke="var(--text-3)" />
                  <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11, fill: "var(--text-2)" }} stroke="var(--text-3)" interval={0} />
                  <Tooltip formatter={(v: number) => `${nf(v)} %`} contentStyle={TT} labelStyle={{ color: "var(--text)", fontWeight: 700 }} />
                  <ReferenceLine x={80} stroke="#16a34a" strokeDasharray="4 4" />
                  <Bar dataKey="avancement" name={t.progress} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {barData.map((r) => <Cell key={r.name} fill={STATUS[statusOf(r.avancement)].color} />)}
                    <LabelList dataKey="avancement" position="right" formatter={(v: number) => `${nf(v)}%`} style={{ fontSize: 11, fontWeight: 700, fill: "var(--text)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="sv-legend">
                {(Object.keys(STATUS) as Status[]).map((s) => (
                  <span key={s}><i style={{ background: STATUS[s].color }} />
                    {t.legend[s]}</span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title={t.alertsTitle(alerts.length)}>
          {alerts.length === 0
            ? <p className="sv-empty">{t.noAlert}</p>
            : <ul className="sv-alerts">{alerts.map((a) => <li key={a}><AlertTriangle size={15} aria-hidden />{a}</li>)}</ul>}
        </Card>
      </div>

      {/* ----- Tableau ----- */}
      <section className="sv-card">
        <h3 className="sv-card-title">{t.tableTitle}</h3>
        <div className="sv-scroll">
          <table className="sv-table">
            <thead>
              <tr>
                <SortTh k="name">{t.region}</SortTh>
                <SortTh k="avancement">{t.progress}</SortTh>
                <SortTh k="date">{t.colSetup}</SortTh>
                <th>{t.colOrg}</th>
                <th>{t.colLink}</th>
                <th>{t.colState}</th>
                <SortTh k="maj">{t.colUpdate}</SortTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td data-label={t.region}><b>{r.name}</b></td>
                  <td data-label={t.progress}>
                    <div className="sv-bar" title={`${nf(r.avancement)} %`}>
                      <i style={{ width: `${r.avancement}%`, background: STATUS[statusOf(r.avancement)].color }} />
                    </div>
                    <small>{nf(r.avancement)} %</small>
                  </td>
                  <td data-label={t.colSetup}>{fdate(r.date, loc)}</td>
                  <td data-label={t.colOrg}>{r.org ?? "—"}</td>
                  <td data-label={t.colLink}>
                    {r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer">{host(r.link)} <ExternalLink size={13} aria-hidden /></a> : "—"}
                  </td>
                  <td data-label={t.colState}><StatusChip status={statusOf(r.avancement)} label={t.statusL[statusOf(r.avancement)]} /></td>
                  <td data-label={t.colUpdate}>{fdate(r.maj, loc)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="sv-empty">{t.noResult}</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="sv-pager">
          <label>{t.show}
            <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
            </select> {t.rowsWord}</label>
          <span>{t.range(sorted.length ? (cur - 1) * pageSize + 1 : 0, Math.min(cur * pageSize, sorted.length), sorted.length)}</span>
          <div>
            <button aria-label={t.prev} disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
            <b className="sv-page">{cur} / {pages}</b>
            <button aria-label={t.next} disabled={cur >= pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>

      <p className="sv-muted sv-note">
        {state === "ok" ? `${t.source} ${DATA_URL}` : state === "loading" ? t.loading : t.demo}
        {" "}· {t.lastUpdate} {fdate(data.map((r) => r.maj).sort().pop() ?? null, loc)}
      </p>
    </main>
  );
}

/* ==================== STYLES ====================
   Variables locales = alias vers les variables globales du thème (clair / sombre). */
const CSS = `
.sv{--g:#16a34a;--gt:color-mix(in srgb,#15803d 70%,var(--text));
  --ink:var(--text);--muted:var(--text-3);--line:var(--border);--bg:var(--surface-2);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);
  padding:clamp(10px,2vw,24px);display:flex;flex-direction:column;gap:16px;box-sizing:border-box;min-height:100%}
.sv *,.sv *::before,.sv *::after{box-sizing:border-box}
.sv h1{font-size:clamp(20px,3vw,28px);margin:0}
.sv-brand{display:flex;gap:12px;align-items:center}
.sv-muted{color:var(--muted);font-size:13px;margin:2px 0 0}
.sv-head{display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:flex-end}
.sv-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.sv-filters label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-2)}
.sv-filters label>span{display:flex;gap:5px;align-items:center}
.sv select,.sv input[type=text],.sv input:not([type]){padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface-3);color:var(--text);font-size:13px;min-width:0}
.sv .sv-check{flex-direction:row;align-items:center;gap:6px;font-size:12px}
.sv-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border:1px solid var(--g);background:var(--g);color:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.sv-btn-ghost{background:var(--surface);color:var(--gt)}
.sv button:focus-visible,.sv select:focus-visible,.sv input:focus-visible,.sv a:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.sv-banner{display:flex;gap:12px;align-items:center;background:color-mix(in srgb,#16a34a 14%,var(--surface));border:1px solid var(--border);color:var(--gt);border-radius:12px;padding:12px 14px;font-size:13px;font-weight:700;line-height:1.4}
.sv-banner svg{flex-shrink:0;color:var(--g)}
.sv-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;min-width:0;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.sv-card-title{font-size:13px;font-weight:700;margin:0 0 8px;text-align:center}
.sv-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.sv-kpi{display:flex;flex-direction:column;gap:2px}
.sv-kpi strong{font-size:clamp(22px,3vw,30px)}
.sv-charts{display:grid;grid-template-columns:1fr;gap:16px}
.sv-donut{position:relative}
.sv-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.sv-donut-center strong{font-size:26px;color:var(--gt)}
.sv-donut-center small{color:var(--muted)}
.sv-center{text-align:center;font-size:12px;margin:4px 0 0}
.sv-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;margin-top:8px}
.sv-legend span{display:flex;align-items:center;gap:6px}
.sv-legend i{width:12px;height:12px;border-radius:3px}
.sv-alerts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13px}
.sv-alerts li{display:flex;gap:8px;align-items:flex-start;background:rgba(239,68,68,.14);color:color-mix(in srgb,#b91c1c 65%,var(--text));padding:8px 10px;border-radius:8px}
.sv-alerts svg{flex-shrink:0;margin-top:2px}
.sv-empty{text-align:center;color:var(--muted);font-size:13px;padding:14px}
.sv-scroll{overflow-x:auto}
.sv-table{width:100%;border-collapse:collapse;font-size:13px}
.sv-table th{background:#16a34a;color:#fff;text-align:left;padding:10px 12px;font-size:13px;white-space:nowrap}
.sv-th-btn{all:unset;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.sv-th-btn:focus-visible{outline:2px solid #fff}
.sv-table td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
.sv-table tbody tr:nth-child(even){background:var(--surface-3)}
.sv-table a{color:var(--gt);display:inline-flex;gap:5px;align-items:center}
.sv-bar{height:6px;background:var(--track);border-radius:4px;min-width:80px;overflow:hidden;margin-bottom:3px}
.sv-bar i{display:block;height:100%}
.sv-chip{display:inline-flex;gap:6px;align-items:center;padding:3px 10px;border-radius:999px;font-weight:700;font-size:12px;white-space:nowrap}
.sv-pager{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:12px}
.sv-pager label,.sv-pager div{display:flex;gap:6px;align-items:center}
.sv-pager button{padding:4px 8px;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:6px;cursor:pointer;display:flex}
.sv-pager button:disabled{opacity:.4;cursor:not-allowed}
.sv-page{padding:0 6px}
.sv-note{text-align:center}
@media(min-width:720px){.sv-charts{grid-template-columns:1fr 1fr}}
@media(min-width:1280px){.sv-charts{grid-template-columns:.8fr 1.15fr 1.2fr .85fr}}
@media(max-width:760px){
  .sv-filters{width:100%}.sv-filters label:not(.sv-check){flex:1 1 140px}.sv-filters select,.sv-filters input{width:100%}
  .sv-table thead{display:none}
  .sv-table tr{display:block;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;padding:6px 12px;background:var(--surface)!important}
  .sv-table td{display:flex;justify-content:space-between;align-items:center;gap:14px;border:0;padding:6px 0;text-align:right}
  .sv-table td::before{content:attr(data-label);font-weight:600;color:var(--muted);text-align:left;flex-shrink:0}
  .sv-table td[colspan]{display:block}.sv-table td[colspan]::before{content:none}
}
@media(prefers-reduced-motion:reduce){.sv *{transition:none!important;animation:none!important}}
`;
