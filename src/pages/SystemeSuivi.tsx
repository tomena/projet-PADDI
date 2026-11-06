import React, { memo, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, BarChart, Bar, Cell, LabelList, Legend, PieChart, Pie,
} from "recharts";
import {
  Target, Calendar, MapPin, ExternalLink, Check, Clock, AlertTriangle,
  Download, RotateCcw, Search, ChevronLeft, ChevronRight, ArrowUpDown,
} from "lucide-react";

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

// Une seule source de vérité pour les statuts (remplace 3 blocs JSX dupliqués)
const STATUS: Record<Status, { label: string; color: string; bg: string; Icon: typeof Check }> = {
  done: { label: "Atteint", color: "#15803d", bg: "#dcfce7", Icon: Check },
  progress: { label: "En cours", color: "#b45309", bg: "#fef3c7", Icon: Clock },
  late: { label: "En retard", color: "#b91c1c", bg: "#fee2e2", Icon: AlertTriangle },
};
const statusOf = (v: number): Status => (v >= 80 ? "done" : v >= 50 ? "progress" : "late");

/* ================================ HELPERS ================================ */
const nf = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const fdate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR") : "—");
const host = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };
const isDeployed = (r: Region, year: number) => !!r.date && Number(r.date.slice(0, 4)) <= year;

function exportCsv(rows: Region[]) {
  const head = ["Région", "Avancement (%)", "Date de mise en place", "Entité", "Lien", "Statut", "Dernière MAJ"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [r.name, r.avancement, r.date ?? "", r.org ?? "", r.link ?? "", STATUS[statusOf(r.avancement)].label, r.maj].map(esc).join(";"));
  const blob = new Blob(["\uFEFF" + [head.map(esc).join(";"), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `suivi-systemes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================ SOUS-COMPOSANTS ============================ */
const StatusChip = memo(({ status }: { status: Status }) => {
  const { label, color, bg, Icon } = STATUS[status];
  return (
    <span className="sv-chip" style={{ color, background: bg }}>
      <Icon size={14} aria-hidden /> {label}
    </span>
  );
});

const Kpi = memo(({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) => (
  <div className="sv-card sv-kpi">
    <span className="sv-muted">{label}</span>
    <strong style={{ color: tone }}>{value}</strong>
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
  const [f, setF] = useState(INITIAL);
  const [sort, setSort] = useState<{ key: keyof Region; dir: 1 | -1 }>({ key: "avancement", dir: -1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const update = (p: Partial<typeof INITIAL>) => { setF((s) => ({ ...s, ...p })); setPage(1); };
  const toggleSort = (key: keyof Region) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  /* Tout est dérivé d'une seule source → aucune incohérence possible entre KPI, graphiques et tableau */
  const scope = useMemo(() => REGIONS.filter((r) => r.counted || f.include7), [f.include7]);

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
      .map((r) => `${r.name} : avancement de ${nf(r.avancement)} %, sous le seuil de 50 %.`),
    ...view.filter((r) => !r.org).map((r) => `${r.name} : aucune entité n'héberge encore le système.`),
  ], [view]);

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
        <div>
          <h1>Système de suivi</h1>
          <p className="sv-muted">Suivi-évaluation des services écosystémiques · {stats.total} région{stats.total > 1 ? "s" : ""} affichée{stats.total > 1 ? "s" : ""}</p>
        </div>
        <div className="sv-filters" role="search">
          <label><span><Calendar size={13} /> Année</span>
            <select value={f.year} onChange={(e) => update({ year: +e.target.value })}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select></label>
          <label><span><MapPin size={13} /> Région</span>
            <select value={f.region} onChange={(e) => update({ region: e.target.value })}>
              <option value="all">Toutes les régions</option>
              {scope.map((r) => <option key={r.name}>{r.name}</option>)}
            </select></label>
          <label><span>Statut</span>
            <select value={f.status} onChange={(e) => update({ status: e.target.value })}>
              <option value="all">Tous</option>
              {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select></label>
          <label className="sv-search"><span><Search size={13} /> Recherche</span>
            <input value={f.q} onChange={(e) => update({ q: e.target.value })} placeholder="Région ou entité…" /></label>
          <label className="sv-check">
            <input type="checkbox" checked={f.include7} onChange={(e) => update({ include7: e.target.checked, region: "all" })} />
            Inclure la 7e région</label>
          <button className="sv-btn" onClick={() => { setF(INITIAL); setPage(1); }}><RotateCcw size={14} /> Réinitialiser</button>
          <button className="sv-btn sv-btn-ghost" onClick={() => exportCsv(sorted)}><Download size={14} /> Exporter CSV</button>
        </div>
      </header>

      <div className="sv-banner">
        <Target size={22} aria-hidden />
        <span>Indicateur : toutes les régions d'intervention disposent d'un système de suivi et d'évaluation des services écosystémiques.</span>
      </div>

      {/* ----- KPI ----- */}
      <div className="sv-kpis">
        <Kpi label="Couverture" value={`${nf(stats.couverture)} %`} tone="#15803d"
          sub={`${stats.deployed}/${stats.total} systèmes en place (${f.year})`} />
        <Kpi label="Avancement moyen" value={`${nf(stats.moyenne)} %`} sub="Moyenne des régions affichées" />
        <Kpi label="Écart à la trajectoire"
          value={stats.ecart === null ? "—" : `${stats.ecart > 0 ? "+" : ""}${nf(stats.ecart)} pts`}
          tone={stats.ecart !== null && stats.ecart < 0 ? "#b91c1c" : "#15803d"}
          sub={stats.ecart === null ? "Pas de cible pour cette année" : `Cible ${f.year} : ${nf(TRAJECTOIRE.find((t) => t.annee === f.year)!.prevu)} %`} />
        <Kpi label="Régions en retard" value={String(stats.late)} tone={stats.late ? "#b91c1c" : "#15803d"}
          sub={`${stats.done} atteintes · ${stats.progress} en cours`} />
      </div>

      {/* ----- Graphiques ----- */}
      <div className="sv-charts">
        <Card title="Taux d'atteinte de la cible">
          <div className="sv-donut">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={donut} dataKey="v" innerRadius="68%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                  <Cell fill="#16a34a" /><Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="sv-donut-center"><strong>{nf(stats.couverture)} %</strong><small>Cible : 100 %</small></div>
          </div>
          <p className="sv-center"><b>{stats.deployed} / {stats.total}</b> régions disposent d'un système opérationnel</p>
        </Card>

        <Card title="Trajectoire prévue et réalisée">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={TRAJECTOIRE} margin={{ top: 16, right: 24, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${nf(v)} %`} contentStyle={{ fontSize: 12 }} />
              <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={f.year} stroke="#6b7280" strokeDasharray="4 4" label={{ value: "Année", fontSize: 10, position: "top" }} />
              <Line dataKey="prevu" name="Cible prévue" stroke="#9ca3af" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="realise" name="Réalisé" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Comparaison des régions (%)" className="sv-span">
          {barData.length === 0 ? <p className="sv-empty">Aucune région ne correspond aux filtres.</p> : (
            <>
              <ResponsiveContainer width="100%" height={barData.length * 42 + 30}>
                <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11 }} interval={0} />
                  <Tooltip formatter={(v: number) => `${nf(v)} %`} contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={80} stroke="#16a34a" strokeDasharray="4 4" />
                  <Bar dataKey="avancement" name="Avancement" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {barData.map((r) => <Cell key={r.name} fill={STATUS[statusOf(r.avancement)].color} />)}
                    <LabelList dataKey="avancement" position="right" formatter={(v: number) => `${nf(v)}%`} style={{ fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="sv-legend">
                {(Object.keys(STATUS) as Status[]).map((s) => (
                  <span key={s}><i style={{ background: STATUS[s].color }} />
                    {s === "done" ? "≥ 80 % Atteint" : s === "progress" ? "50–79 % En cours" : "< 50 % En retard"}</span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title={`Points d'attention (${alerts.length})`}>
          {alerts.length === 0
            ? <p className="sv-empty">Aucune alerte : tout est dans les temps.</p>
            : <ul className="sv-alerts">{alerts.map((a) => <li key={a}><AlertTriangle size={15} aria-hidden />{a}</li>)}</ul>}
        </Card>
      </div>

      {/* ----- Tableau ----- */}
      <section className="sv-card">
        <h3 className="sv-card-title">Systèmes de suivi par région</h3>
        <div className="sv-scroll">
          <table className="sv-table">
            <thead>
              <tr>
                <SortTh k="name">Région</SortTh>
                <SortTh k="avancement">Avancement</SortTh>
                <SortTh k="date">Mise en place</SortTh>
                <th>Entité hébergeante</th>
                <th>Lien</th>
                <th>État</th>
                <SortTh k="maj">Dernière MAJ</SortTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td data-label="Région"><b>{r.name}</b></td>
                  <td data-label="Avancement">
                    <div className="sv-bar" title={`${nf(r.avancement)} %`}>
                      <i style={{ width: `${r.avancement}%`, background: STATUS[statusOf(r.avancement)].color }} />
                    </div>
                    <small>{nf(r.avancement)} %</small>
                  </td>
                  <td data-label="Mise en place">{fdate(r.date)}</td>
                  <td data-label="Entité">{r.org ?? "—"}</td>
                  <td data-label="Lien">
                    {r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer">{host(r.link)} <ExternalLink size={13} aria-hidden /></a> : "—"}
                  </td>
                  <td data-label="État"><StatusChip status={statusOf(r.avancement)} /></td>
                  <td data-label="Dernière MAJ">{fdate(r.maj)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="sv-empty">Aucun résultat. Modifiez ou réinitialisez les filtres.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="sv-pager">
          <label>Afficher
            <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
            </select> lignes</label>
          <span>{sorted.length ? `${(cur - 1) * pageSize + 1} – ${Math.min(cur * pageSize, sorted.length)}` : "0"} sur {sorted.length}</span>
          <div>
            <button aria-label="Page précédente" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
            <b className="sv-page">{cur} / {pages}</b>
            <button aria-label="Page suivante" disabled={cur >= pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>

      <p className="sv-muted sv-note">Données fictives à des fins de démonstration · dernière actualisation : {fdate(REGIONS.map((r) => r.maj).sort().at(-1)!)}</p>
    </main>
  );
}

/* ==================== STYLES (CSS réel = media queries possibles) ==================== */
const CSS = `
.sv{--g:#16a34a;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;--bg:#f3f4f6;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);
  padding:clamp(10px,2vw,24px);display:flex;flex-direction:column;gap:16px;box-sizing:border-box;min-height:100%}
.sv *,.sv *::before,.sv *::after{box-sizing:border-box}
.sv h1{font-size:clamp(20px,3vw,28px);margin:0}
.sv-muted{color:var(--muted);font-size:13px;margin:2px 0 0}
.sv-head{display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:flex-end}
.sv-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.sv-filters label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#374151}
.sv-filters label>span{display:flex;gap:5px;align-items:center}
.sv select,.sv input[type=text],.sv input:not([type]){padding:8px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;min-width:0}
.sv .sv-check{flex-direction:row;align-items:center;gap:6px;font-size:12px}
.sv-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border:1px solid var(--g);background:var(--g);color:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.sv-btn-ghost{background:#fff;color:#15803d}
.sv button:focus-visible,.sv select:focus-visible,.sv input:focus-visible,.sv a:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.sv-banner{display:flex;gap:12px;align-items:center;background:#ecfdf5;color:#065f46;border-radius:12px;padding:12px 14px;font-size:13px;font-weight:700;line-height:1.4}
.sv-banner svg{flex-shrink:0;color:var(--g)}
.sv-card{background:#fff;border-radius:12px;padding:14px;min-width:0;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.sv-card-title{font-size:13px;font-weight:700;margin:0 0 8px;text-align:center}
.sv-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.sv-kpi{display:flex;flex-direction:column;gap:2px}
.sv-kpi strong{font-size:clamp(22px,3vw,30px)}
.sv-charts{display:grid;grid-template-columns:1fr;gap:16px}
.sv-donut{position:relative}
.sv-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.sv-donut-center strong{font-size:26px;color:var(--g)}
.sv-donut-center small{color:var(--muted)}
.sv-center{text-align:center;font-size:12px;margin:4px 0 0}
.sv-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;margin-top:8px}
.sv-legend span{display:flex;align-items:center;gap:6px}
.sv-legend i{width:12px;height:12px;border-radius:3px}
.sv-alerts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13px}
.sv-alerts li{display:flex;gap:8px;align-items:flex-start;background:#fef2f2;color:#991b1b;padding:8px 10px;border-radius:8px}
.sv-alerts svg{flex-shrink:0;margin-top:2px}
.sv-empty{text-align:center;color:var(--muted);font-size:13px;padding:14px}
.sv-scroll{overflow-x:auto}
.sv-table{width:100%;border-collapse:collapse;font-size:13px}
.sv-table th{background:var(--g);color:#fff;text-align:left;padding:10px 12px;font-size:13px;white-space:nowrap}
.sv-th-btn{all:unset;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.sv-th-btn:focus-visible{outline:2px solid #fff}
.sv-table td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:middle}
.sv-table tbody tr:nth-child(even){background:#f9fafb}
.sv-table a{color:#15803d;display:inline-flex;gap:5px;align-items:center}
.sv-bar{height:6px;background:var(--line);border-radius:4px;min-width:80px;overflow:hidden;margin-bottom:3px}
.sv-bar i{display:block;height:100%}
.sv-chip{display:inline-flex;gap:6px;align-items:center;padding:3px 10px;border-radius:999px;font-weight:700;font-size:12px;white-space:nowrap}
.sv-pager{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:12px}
.sv-pager label,.sv-pager div{display:flex;gap:6px;align-items:center}
.sv-pager button{padding:4px 8px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer;display:flex}
.sv-pager button:disabled{opacity:.4;cursor:not-allowed}
.sv-page{padding:0 6px}
.sv-note{text-align:center}
@media(min-width:720px){.sv-charts{grid-template-columns:1fr 1fr}.sv-span{grid-column:1/-1}}
@media(min-width:1180px){.sv-charts{grid-template-columns:.8fr 1.2fr 1.2fr}.sv-span{grid-column:auto}}
@media(max-width:760px){
  .sv-filters{width:100%}.sv-filters label:not(.sv-check){flex:1 1 140px}.sv-filters select,.sv-filters input{width:100%}
  .sv-table thead{display:none}
  .sv-table tr{display:block;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;padding:6px 12px;background:#fff!important}
  .sv-table td{display:flex;justify-content:space-between;align-items:center;gap:14px;border:0;padding:6px 0;text-align:right}
  .sv-table td::before{content:attr(data-label);font-weight:600;color:var(--muted);text-align:left;flex-shrink:0}
  .sv-table td[colspan]{display:block}.sv-table td[colspan]::before{content:none}
}
@media(prefers-reduced-motion:reduce){.sv *{transition:none!important;animation:none!important}}
`;

/* ============================ ÉTAPE SUIVANTE : API ============================
   Remplacer REGIONS par un hook de données (ex. TanStack Query) :
   const { data = [], isLoading, error } = useQuery({ queryKey: ["regions"], queryFn: () => fetch("/api/regions").then(r => r.json()) });
   puis afficher un squelette de chargement (isLoading) et un message d'erreur (error). */
