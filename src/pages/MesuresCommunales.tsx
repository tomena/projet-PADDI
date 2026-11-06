import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, BarChart, Bar, LabelList, Legend,
} from "recharts";
import { Landmark, RefreshCw, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, Users } from "lucide-react";

/* ============================ RÈGLES DE L'INDICATEUR ============================
   « 3 mesures prioritaires adoptées par les conseils communaux dans 80 % des communes,
   dont 1 mesure tenant compte des besoins des femmes et des jeunes. »
   → une commune a ATTEINT la cible si : ≥ 3 mesures ET ≥ 1 mesure femmes/jeunes.        */
const CIBLE = 80;          // % de communes visé
const MIN_MESURES = 3;
const CUR_YEAR = 2026;     // dernière année avec des données réelles
const GREEN = "#2e7d32", AMBER = "#d97706", RED = "#d32f2f", GREY = "#e5e7eb";

/* ================================== TYPES ================================== */
interface Mesure { id: string; date: string; spec: string; inc: boolean } // inc = femmes/jeunes
interface Commune {
  name: string; region: string; aire: string; paysage: string; district: string;
  p: number; f: number; j: number;   // participants, dont femmes, dont jeunes (< 35 ans)
  m: Mesure[];
}
const KEYS = ["region", "aire", "paysage", "district", "name"] as const;
type Key = (typeof KEYS)[number];
const LABELS: Record<Key, string> = { region: "Région", aire: "Aire protégée", paysage: "Paysage", district: "District", name: "Commune" };
const ALL: Record<Key, string> = { region: "Toutes", aire: "Toutes", paysage: "Tous", district: "Tous", name: "Toutes" };

const TRAJ = [
  { annee: 2025, prevu: 20.8 }, { annee: 2026, prevu: 33.3 }, { annee: 2027, prevu: 45.8 },
  { annee: 2028, prevu: 58.3 }, { annee: 2029, prevu: 67.5 }, { annee: 2030, prevu: 80 },
];

/* ============ DONNÉES DE DÉMONSTRATION (fictives, 120 communes, cohérentes) ============
   Remplacées automatiquement si /data/communes.json existe (même structure que Commune[]). */
const GEO: Record<string, { paysage: string; aires: string[]; districts: string[] }> = {
  "Boeny": { paysage: "Paysage Nord", aires: ["Ankarafantsika"], districts: ["Mahajanga II", "Marovoay"] },
  "DIANA": { paysage: "Paysage Nord", aires: ["Analamerana", "Ankarana", "Montagne d'Ambre"], districts: ["Antsiranana II", "Ambilobe"] },
  "Amoron'i Mania": { paysage: "Paysage Centre", aires: ["Marolambo"], districts: ["Ambositra", "Fandriana"] },
  "Vakinankaratra": { paysage: "Paysage Centre", aires: ["Marolambo"], districts: ["Antsirabe II", "Betafo"] },
  "Anôsy": { paysage: "Paysage Sud", aires: ["Andohahela"], districts: ["Taolagnaro", "Amboasary Atsimo"] },
  "Atsimo Atsinanana": { paysage: "Paysage Sud", aires: ["Befotaka-Midongy"], districts: ["Farafangana", "Midongy Atsimo"] },
};
const REGS = Object.keys(GEO);
const SPECS = [
  "Mise en place de pépinières communales pour la production de plants forestiers et fruitiers.",
  "Gestion durable des ressources en eau : protection des sources et reboisement des bassins versants.",
  "Promotion de l'agroforesterie et des systèmes agro-sylvopastoraux durables.",
  "Réglementation et contrôle des prélèvements de bois énergie dans les forêts naturelles.",
  "Sensibilisation communautaire et formation sur les pratiques agricoles durables.",
  "Aménagement de pare-feux et surveillance participative des forêts.",
];
const SPECS_INC = [
  "Appui aux femmes et aux jeunes pour la transformation et la valorisation des produits forestiers non ligneux.",
  "Formation des jeunes aux métiers de la restauration forestière.",
  "Accès des femmes aux pépinières communales et aux filières de produits forestiers.",
];

function demoData(): Commune[] {
  const top = ["Ambohimahavelona", "Ambinanindrano", "Marovato", "Ankazomioritra", "Bekopaka", "Andranovory", "Ambatolahy", "Soamahamanina", "Manandriana", "Antsahavola"];
  const low = ["Manjakandriana", "Sahafinaritra", "Morarano Chrome", "Belomaka", "Anjoma", "Ankarenana", "Morarano Gara", "Bekoratsaka", "Ampamarinana", "Andranomiditra"];
  const A = ["Amba", "Anki", "Ando", "Mana", "Soa", "Beko", "Mora", "Anta", "Fana", "Tsiro"];
  const B = ["tola", "hima", "vato", "ranga", "zomi", "fari", "lava", "hasoa"];
  const C = ["na", "ny", "tra", "ka", "ndrano", "vola", "soa"];
  const mid = Array.from({ length: 100 }, (_, i) => A[i % 10] + B[(i * 3) % 8] + C[(i * 5 + 1) % 7]);
  const seq: Record<number, number> = {};
  const pad = (n: number) => String(n).padStart(2, "0");
  return [...top, ...mid, ...low].map((name, i) => {
    const region = REGS[i < 81 ? i % 6 : [3, 4, 4, 5, 5, 5, 2, 1][(i - 81) % 8]];
    const g = GEO[region];
    // 55 communes à 3 mesures, 26 à 4–5 (= 81 atteintes), 6 à 3 mesures sans femmes/jeunes, 21 à 1–2, 12 à 0
    const n = i < 55 ? 3 : i < 81 ? 4 + (i % 2) : i < 87 ? 3 : i < 108 ? 1 + (i % 2) : 0;
    const m: Mesure[] = Array.from({ length: n }, (_, k) => {
      const inc = i < 81 ? k === 0 || (k === 3 && i % 2 === 0) : i < 87 ? false : i < 108 ? k === 0 && i % 3 !== 0 : false;
      const off = (i * 5 + k * 7) % 20, y = 2025 + Math.floor((2 + off) / 12);
      seq[y] = (seq[y] ?? 0) + 1;
      return {
        id: `MES-${y}-${String(seq[y]).padStart(3, "0")}`, inc,
        date: `${y}-${pad(((2 + off) % 12) + 1)}-${pad(1 + ((i * 3 + k * 5) % 28))}`,
        spec: inc ? SPECS_INC[(i + k) % 3] : SPECS[(i + k) % 6],
      };
    });
    const p = 30 + ((i * 13) % 21);
    return {
      name, region, aire: g.aires[i % g.aires.length], paysage: g.paysage, district: g.districts[(i >> 1) % 2],
      p, f: Math.round(p * (0.43 + ((i * 7) % 11) / 100)), j: Math.round(p * (0.31 + ((i * 5) % 13) / 100)), m,
    };
  });
}
const DEMO = demoData();

/* ===================== CHARGEMENT / MISE À JOUR DES DONNÉES ===================== */
const DATA_URL = "/data/communes.json"; // fichier ou API ; absent → données de démonstration

function useCommunes() {
  const [data, setData] = useState<Commune[]>(DEMO);
  const [state, setState] = useState<"loading" | "ok" | "demo">("loading");
  const load = useCallback(() => {
    const ctrl = new AbortController();
    setState("loading");
    fetch(DATA_URL, { signal: ctrl.signal, cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: Commune[]) => { setData(d); setState("ok"); })
      .catch(() => { if (!ctrl.signal.aborted) { setData(DEMO); setState("demo"); } });
    return () => ctrl.abort();
  }, []);
  useEffect(() => load(), [load]);
  return { data, state, reload: load };
}

/* ================================= HELPERS ================================== */
const nf = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const fdate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR");
const matches = (c: Commune, sel: Record<Key, string>, upto: number) =>
  KEYS.slice(0, upto).every((k) => sel[k] === "all" || c[k] === sel[k]);
const rateColor = (v: number) => (v >= CIBLE ? GREEN : v >= 50 ? AMBER : RED);

/* Situation d'une commune à la fin d'une année donnée */
const evalC = (c: Commune, year: number) => {
  const ms = c.m.filter((m) => +m.date.slice(0, 4) <= year);
  const n = ms.length, inc = ms.filter((m) => m.inc).length;
  return {
    c, ms, n, inc, ok: n >= MIN_MESURES && inc >= 1,
    taux: Math.round(((Math.min(n, MIN_MESURES) + Math.min(inc, 1)) / (MIN_MESURES + 1)) * 100),
  };
};
type Ev = ReturnType<typeof evalC>;
const missing = (e: Ev) => {
  const need = Math.max(MIN_MESURES - e.n, e.inc < 1 ? 1 : 0);
  return `Manque ${need} mesure${need > 1 ? "s" : ""}${e.inc < 1 ? " dont 1 pour les femmes et les jeunes" : ""}`;
};

function exportCsv(rows: { id: string; commune: string; region: string; date: string; spec: string; inc: boolean }[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["ID", "Commune", "Région", "Date d'adoption", "Mesure", "Femmes/jeunes"].map(esc).join(";");
  const body = rows.map((r) => [r.id, r.commune, r.region, r.date, r.spec, r.inc ? "Oui" : "Non"].map(esc).join(";"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + [head, ...body].join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = `mesures-communales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================== SOUS-COMPOSANTS ============================== */
const Card = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={`mc-card ${className}`}>{title && <h3 className="mc-card-title">{title}</h3>}{children}</section>
);

const Ring = memo(({ pct, color = GREEN, sub }: { pct: number; color?: string; sub?: string }) => (
  <div className="mc-ring" role="img" aria-label={`${nf(pct)} %`}
    style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, ${GREY} 0)` }}>
    <div><strong style={{ color }}>{nf(pct)} %</strong>{sub && <small>{sub}</small>}</div>
  </div>
));

interface Slice { name: string; value: number; color: string }
const DonutCard = memo(({ title, data, total }: { title: string; data: Slice[]; total: number }) => (
  <Card title={title}>
    <div className="mc-donut">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="92%" stroke="#fff" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${v} communes`} contentStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mc-donut-c"><strong>{total}</strong><small>communes</small></div>
    </div>
    <ul className="mc-leg">
      {data.map((d) => (
        <li key={d.name}><i style={{ background: d.color }} /><span>{d.name}</span><b>{d.value}</b>
          <small>{total ? nf((d.value / total) * 100) : 0} %</small></li>
      ))}
    </ul>
  </Card>
));

/* ==================================== PAGE ==================================== */
type SK = "date" | "commune" | "id";

export default function MesuresCommunales() {
  const { data, state, reload } = useCommunes();
  const [year, setYear] = useState(CUR_YEAR);
  const [sel, setSel] = useState<Record<Key, string>>({ region: "all", aire: "all", paysage: "all", district: "all", name: "all" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ k: SK; dir: 1 | -1 }>({ k: "date", dir: -1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* Filtres en cascade : changer la région réinitialise les filtres plus fins */
  const pick = (k: Key, v: string) => {
    setSel((s) => {
      const next = { ...s, [k]: v };
      KEYS.slice(KEYS.indexOf(k) + 1).forEach((x) => { next[x] = "all"; });
      return next;
    });
    setPage(1);
  };
  const opts = useMemo(() => Object.fromEntries(KEYS.map((k, i) =>
    [k, [...new Set(data.filter((c) => matches(c, sel, i)).map((c) => c[k]))].sort((a, b) => a.localeCompare(b, "fr"))])) as Record<Key, string[]>,
  [data, sel]);

  const view = useMemo(() => data.filter((c) => matches(c, sel, KEYS.length)), [data, sel]);
  const ev = useMemo(() => view.map((c) => evalC(c, year)), [view, year]);

  const S = useMemo(() => {
    const total = ev.length, ok = ev.filter((e) => e.ok).length;
    const cnt = (fn: (e: Ev) => boolean) => ev.filter(fn).length;
    const sum = (k: "p" | "f" | "j") => view.reduce((s, c) => s + c[k], 0);
    const pct = total ? (ok / total) * 100 : 0;
    const byRegion = REGS.map((name) => {
      const l = ev.filter((e) => e.c.region === name), o = l.filter((e) => e.ok).length;
      return { name, total: l.length, ok: o, pct: l.length ? Math.round((o / l.length) * 1000) / 10 : 0 };
    }).filter((r) => r.total > 0).sort((a, b) => b.pct - a.pct);
    const traj = TRAJ.map((t) => {
      const o = t.annee <= CUR_YEAR && total ? view.filter((c) => evalC(c, t.annee).ok).length : null;
      return { ...t, realise: o === null ? undefined : Math.round((o / total) * 1000) / 10 };
    });
    return {
      total, ok, pct, byRegion, traj,
      restant: Math.max(0, Math.ceil((total * CIBLE) / 100) - ok),
      d1: [
        { name: "0 mesure", value: cnt((e) => e.n === 0), color: RED },
        { name: "1 à 2 mesures", value: cnt((e) => e.n > 0 && e.n < 3), color: "#fbc02d" },
        { name: "3 mesures", value: cnt((e) => e.n === 3), color: "#9ccc65" },
        { name: "Plus de 3 mesures", value: cnt((e) => e.n > 3), color: GREEN },
      ],
      d2: [
        { name: "0 mesure", value: cnt((e) => e.inc === 0), color: RED },
        { name: "1 mesure", value: cnt((e) => e.inc === 1), color: "#fbc02d" },
        { name: "Plus de 1 mesure", value: cnt((e) => e.inc > 1), color: GREEN },
      ],
      femmes: sum("p") ? (sum("f") / sum("p")) * 100 : 0, nF: sum("f"),
      jeunes: sum("p") ? (sum("j") / sum("p")) * 100 : 0, nJ: sum("j"),
      prio: ev.filter((e) => !e.ok).sort((a, b) => a.taux - b.taux || a.n - b.n).slice(0, 10),
    };
  }, [ev, view]);

  const worst = S.byRegion.length > 1 ? S.byRegion[S.byRegion.length - 1] : null;

  const flat = useMemo(() => ev.flatMap((e) => e.ms.map((m) => ({ ...m, commune: e.c.name, region: e.c.region }))), [ev]);
  const rowsAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    const r = q ? flat.filter((x) => `${x.commune} ${x.spec} ${x.id}`.toLowerCase().includes(q)) : flat;
    return [...r].sort((a, b) => (a[sort.k] < b[sort.k] ? -1 : a[sort.k] > b[sort.k] ? 1 : 0) * sort.dir);
  }, [flat, search, sort]);
  const pages = Math.max(1, Math.ceil(rowsAll.length / pageSize));
  const cur = Math.min(page, pages);
  const rows = rowsAll.slice((cur - 1) * pageSize, cur * pageSize);

  const SortTh = ({ k, children }: { k: SK; children: React.ReactNode }) => (
    <th aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="mc-th" onClick={() => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }))}>
        {children}<ArrowUpDown size={12} aria-hidden />
      </button>
    </th>
  );

  const message = S.total === 0
    ? "Aucune commune ne correspond aux filtres choisis."
    : `${S.ok} commune${S.ok > 1 ? "s" : ""} sur ${S.total} (${nf(S.pct)} %) ont atteint la cible fin ${year}. ` +
      (S.restant > 0 ? `Il en manque ${S.restant} pour atteindre ${CIBLE} %.` : `La cible de ${CIBLE} % est atteinte.`) +
      (worst && worst.pct < CIBLE ? ` Région à appuyer en priorité : ${worst.name} (${nf(worst.pct)} %).` : "");

  return (
    <main className="mc">
      <style>{CSS}</style>

      <header className="mc-head">
        <div className="mc-brand">
          <span className="mc-logo"><Landmark size={24} aria-hidden /></span>
          <h1>Suivi des mesures communales</h1>
        </div>
        <button className="mc-btn-light" onClick={reload} disabled={state === "loading"}>
          <RefreshCw size={16} className={state === "loading" ? "mc-spin" : ""} aria-hidden /> Actualiser
        </button>
      </header>

      <div className="mc-body">
        {/* ----- Filtres ----- */}
        <div className="mc-filters" role="search">
          <label><span>Année</span>
            <select value={year} onChange={(e) => { setYear(+e.target.value); setPage(1); }}>
              {TRAJ.map((t) => <option key={t.annee}>{t.annee}</option>)}
            </select></label>
          {KEYS.map((k) => (
            <label key={k}><span>{LABELS[k]}</span>
              <select value={sel[k]} onChange={(e) => pick(k, e.target.value)}>
                <option value="all">{ALL[k]}</option>
                {opts[k].map((o) => <option key={o}>{o}</option>)}
              </select></label>
          ))}
        </div>

        {/* ----- Message clé pour décider ----- */}
        <div className="mc-insight" role="status"><b>À retenir</b><span>{message}</span></div>
        <details className="mc-enonce">
          <summary>Énoncé de l'indicateur</summary>
          <p>3 mesures prioritaires pour améliorer les services écosystémiques d'approvisionnement sont adoptées par les conseils communaux dans {CIBLE} % des communes d'intervention, à partir des plans d'aménagement existants, dont 1 mesure tenant compte des besoins spécifiques des femmes et des jeunes.</p>
        </details>

        {/* ----- KPI ----- */}
        <div className="mc-kpis">
          <Card title="Taux d'atteinte de la cible">
            <Ring pct={S.pct} sub={`Cible : ${CIBLE} %`} />
            <p className="mc-cap"><b>{S.ok} sur {S.total}</b> communes</p>
          </Card>
          <Card title="Reste à faire">
            <div className="mc-big" style={{ color: S.restant ? RED : GREEN }}>{S.restant}</div>
            <p className="mc-cap">communes à convaincre pour atteindre {CIBLE} %</p>
          </Card>
          <Card title="Part des femmes atteinte">
            <Ring pct={S.femmes} sub={`${nf(S.nF)} pers.`} />
          </Card>
          <Card title="Part des jeunes (< 35 ans)">
            <Ring pct={S.jeunes} sub={`${nf(S.nJ)} pers.`} />
          </Card>
          <Card title="Communes d'intervention">
            <Users size={34} color={GREEN} aria-hidden style={{ margin: "0 auto" }} />
            <div className="mc-big">{S.total}</div>
            <p className="mc-cap">communes affichées</p>
          </Card>
        </div>

        {/* ----- Graphiques : 3 colonnes alignées ----- */}
        <div className="mc-row3">
          <DonutCard title="Communes selon le nombre de mesures décidées" data={S.d1} total={S.total} />
          <DonutCard title="Communes selon les mesures femmes et jeunes" data={S.d2} total={S.total} />
          <Card title="Évolution annuelle du taux d'atteinte (%)" className="mc-wide">
            <ResponsiveContainer width="100%" height={270}>
              <LineChart data={S.traj} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${nf(v)} %`} contentStyle={{ fontSize: 12 }} />
                <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={CIBLE} stroke={RED} strokeDasharray="4 4" label={{ value: `Cible ${CIBLE} %`, fontSize: 11, fill: RED, position: "insideTopLeft" }} />
                <Line dataKey="prevu" name="Trajectoire prévue" stroke="#9ca3af" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line dataKey="realise" name="Réalisé" stroke={GREEN} strokeWidth={3} dot={{ r: 5, fill: GREEN, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ----- Où agir ----- */}
        <div className="mc-row2">
          <Card title="Taux d'atteinte par région (% de communes)">
            {S.byRegion.length === 0 ? <p className="mc-empty">Aucune donnée.</p> : (
              <ResponsiveContainer width="100%" height={S.byRegion.length * 44 + 36}>
                <BarChart data={S.byRegion} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GREY} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11 }} interval={0} />
                  <Tooltip formatter={(v: number, _n, p) => [`${nf(v)} % (${p.payload.ok}/${p.payload.total} communes)`, "Atteint"]} contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={CIBLE} stroke={RED} strokeDasharray="4 4" />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {S.byRegion.map((r) => <Cell key={r.name} fill={rateColor(r.pct)} />)}
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${nf(v)}%`} style={{ fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Communes à accompagner en priorité">
            {S.prio.length === 0 ? <p className="mc-empty">Toutes les communes affichées ont atteint la cible.</p> : (
              <ol className="mc-prio">
                {S.prio.map((e) => (
                  <li key={e.c.name}>
                    <div><b>{e.c.name}</b><small>{e.c.region}, {e.c.district}</small></div>
                    <span>{missing(e)}</span>
                    <div className="mc-bar" title={`${e.taux} %`}><i style={{ width: `${e.taux}%`, background: rateColor(e.taux + 30) }} /></div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* ----- Tableau (seul en bas) ----- */}
        <Card>
          <div className="mc-tools">
            <h3 className="mc-card-title mc-left">Détail des mesures adoptées par les communes</h3>
            <div className="mc-tools-r">
              <label className="mc-search"><Search size={14} aria-hidden />
                <input placeholder="Rechercher une commune, une mesure…" value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Rechercher" /></label>
              <button className="mc-btn" onClick={() => exportCsv(rowsAll)}><Download size={14} aria-hidden /> Exporter</button>
            </div>
          </div>

          <div className="mc-scroll">
            <table className="mc-table">
              <thead>
                <tr>
                  <SortTh k="commune">Commune</SortTh>
                  <SortTh k="id">ID de la mesure</SortTh>
                  <SortTh k="date">Date d'adoption</SortTh>
                  <th>Spécification de la mesure</th>
                  <th>Public visé</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Commune"><b>{r.commune}</b><small>{r.region}</small></td>
                    <td data-label="ID">{r.id}</td>
                    <td data-label="Date">{fdate(r.date)}</td>
                    <td data-label="Mesure" className="mc-spec">{r.spec}</td>
                    <td data-label="Public">{r.inc ? <span className="mc-tag">Femmes et jeunes</span> : "Tous"}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="mc-empty">Aucune mesure trouvée. Modifiez les filtres ou la recherche.</td></tr>}
              </tbody>
            </table>
          </div>

          <footer className="mc-pager">
            <span>{rowsAll.length ? `${(cur - 1) * pageSize + 1} – ${Math.min(cur * pageSize, rowsAll.length)}` : "0"} sur {rowsAll.length} mesures</span>
            <div>
              <button aria-label="Page précédente" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
              <b>{cur} / {pages}</b>
              <button aria-label="Page suivante" disabled={cur >= pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
            </div>
            <label>Lignes par page
              <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }}>
                {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
              </select></label>
          </footer>
        </Card>

        <p className="mc-note">
          {state === "ok" ? `Source : ${DATA_URL}` : state === "loading" ? "Chargement des données…" : "Données fictives de démonstration"}
        </p>
      </div>
    </main>
  );
}

/* ================================== STYLES ================================== */
const CSS = `
.mc{--g:#2e7d32;--gd:#1b5e20;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;background:#f4f6f5;min-height:100%;color:var(--ink);
  font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.mc *,.mc *::before,.mc *::after{box-sizing:border-box}
.mc-head{background:var(--g);color:#fff;padding:12px clamp(12px,2vw,24px);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.mc-brand{display:flex;align-items:center;gap:12px}
.mc-logo{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35)}
.mc h1{margin:0;font-size:clamp(17px,2.6vw,22px)}
.mc-btn-light,.mc-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.mc-btn-light{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)}
.mc-btn{background:var(--g);color:#fff;border:1px solid var(--g)}
.mc button:disabled{opacity:.5;cursor:not-allowed}
.mc-spin{animation:mcspin 1s linear infinite}@keyframes mcspin{to{transform:rotate(360deg)}}
.mc-body{padding:clamp(10px,2vw,24px);display:flex;flex-direction:column;gap:16px}
.mc-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.mc-filters label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#374151;min-width:0}
.mc select,.mc input{padding:9px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;min-width:0;width:100%}
.mc button:focus-visible,.mc select:focus-visible,.mc input:focus-visible,.mc summary:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.mc-insight{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;background:#fff;border-left:5px solid var(--g);border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.mc-insight b{color:var(--gd)}
.mc-enonce{background:rgba(46,125,50,.06);border-radius:8px;padding:10px 14px;font-size:13px;color:#374151}
.mc-enonce summary{cursor:pointer;font-weight:700;color:var(--gd)}
.mc-enonce p{margin:8px 0 0;line-height:1.6}
.mc-card{background:#fff;border-radius:10px;padding:14px;min-width:0;box-shadow:0 1px 3px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:8px}
.mc-card-title{margin:0;font-size:14px;font-weight:700;color:var(--gd);text-align:center}
.mc-left{text-align:left}
.mc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.mc-kpis .mc-card{align-items:center;justify-content:space-between}
.mc-ring{width:128px;height:128px;border-radius:50%;display:grid;place-items:center}
.mc-ring>div{width:96px;height:96px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}
.mc-ring strong{font-size:21px}.mc-ring small{font-size:11px;color:var(--muted)}
.mc-big{font-size:42px;font-weight:800;line-height:1}
.mc-cap{margin:0;font-size:13px;text-align:center;color:#374151}
.mc-row3,.mc-row2{display:grid;grid-template-columns:1fr;gap:16px}
.mc-donut{position:relative}
.mc-donut-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.mc-donut-c strong{font-size:26px}.mc-donut-c small{font-size:12px;color:var(--muted)}
.mc-leg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:12px}
.mc-leg li{display:grid;grid-template-columns:12px 1fr auto 52px;gap:8px;align-items:center}
.mc-leg i{width:12px;height:12px;border-radius:3px}.mc-leg small{text-align:right;color:var(--muted)}
.mc-prio{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.mc-prio li{display:grid;grid-template-columns:1fr;gap:4px;padding-bottom:8px;border-bottom:1px solid var(--line);font-size:13px}
.mc-prio li>div:first-child{display:flex;flex-direction:column}
.mc-prio small,.mc-table small{color:var(--muted);font-size:11px;display:block}
.mc-prio span{color:#b91c1c;font-size:12px}
.mc-bar{height:6px;background:var(--line);border-radius:4px;overflow:hidden}.mc-bar i{display:block;height:100%}
.mc-tools{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}
.mc-tools-r{display:flex;flex-wrap:wrap;gap:8px;align-items:center;flex:1 1 280px;justify-content:flex-end}
.mc-search{position:relative;flex:1 1 220px;max-width:320px}
.mc-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#888}
.mc-search input{padding-left:30px}
.mc-scroll{overflow-x:auto}
.mc-table{width:100%;border-collapse:collapse;font-size:13px}
.mc-table th{background:var(--g);color:#fff;text-align:left;padding:10px 12px;white-space:nowrap}
.mc-th{all:unset;cursor:pointer;display:inline-flex;gap:6px;align-items:center}.mc-th:focus-visible{outline:2px solid #fff}
.mc-table td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
.mc-table tbody tr:nth-child(even){background:#f9fafb}
.mc-spec{min-width:280px;line-height:1.45}
.mc-tag{background:#dcfce7;color:#166534;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
.mc-empty{text-align:center;color:var(--muted);font-size:13px;padding:14px}
.mc-pager{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px;font-size:12px}
.mc-pager div,.mc-pager label{display:flex;align-items:center;gap:8px}
.mc-pager select{width:auto;padding:5px 8px}
.mc-pager button{padding:4px 8px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer;display:flex}
.mc-note{text-align:center;color:var(--muted);font-size:12px;margin:0}
@media(min-width:720px){.mc-row3{grid-template-columns:1fr 1fr}.mc-wide{grid-column:1/-1}.mc-row2{grid-template-columns:1fr 1fr}}
@media(min-width:1180px){.mc-row3{grid-template-columns:1fr 1fr 1.25fr}.mc-wide{grid-column:auto}.mc-row2{grid-template-columns:1fr 1.2fr}}
@media(max-width:760px){
  .mc-table thead{display:none}
  .mc-table tr{display:block;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;padding:6px 12px;background:#fff!important}
  .mc-table td{display:flex;justify-content:space-between;gap:14px;border:0;padding:6px 0;text-align:right}
  .mc-table td::before{content:attr(data-label);font-weight:600;color:var(--muted);text-align:left;flex-shrink:0}
  .mc-spec{min-width:0}.mc-table td[colspan]{display:block}.mc-table td[colspan]::before{content:none}
  .mc-tools-r,.mc-search{max-width:none;flex-basis:100%}
}
@media(prefers-reduced-motion:reduce){.mc *{animation:none!important;transition:none!important}}
`;
