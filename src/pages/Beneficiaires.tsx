import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line,
  CartesianGrid, Legend, LabelList, ReferenceLine, Cell,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  Users, Target, GraduationCap, ClipboardCheck, CheckCircle2, Printer, Download,
  RefreshCw, RotateCcw, Search,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { V, IDX, LOCALES } from '../i18n/suivi';
import type { Lang } from '../i18n/suivi';
import { TB, V2 } from '../i18n/beneficiaires';
import { CSS, FitBounds, Donut, Gauge, useNarrow, fr, setLoc, G, STATUT } from './SuiviDashboard';

type Cat = 'C2' | 'C3' | 'C4';
interface Act {
  id: string; categorie: Cat; intitule: string; region: string; aire_protegee: string; paysage: string;
  district: string; commune: string; fokontany: string; mbv: string; annee: number; date: string;
  participants: number; femmes: number; jeunes: number; enquetes: number; confirmes: number; statut: string;
}
type Feat = { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: Act };
type Geo = { type: 'FeatureCollection'; metadata?: { cible_total?: number; cible_confirmation?: number; debut?: number; fin?: number }; features: Feat[] };
type FK = 'annee' | 'region' | 'aire_protegee' | 'paysage' | 'district' | 'commune' | 'fokontany' | 'mbv' | 'categorie' | 'statut';
type Num = 'participants' | 'femmes' | 'jeunes' | 'enquetes' | 'confirmes';

const FILTERS: FK[] = ['annee', 'region', 'aire_protegee', 'paysage', 'district', 'commune', 'fokontany', 'mbv', 'categorie', 'statut'];
const CATS: Cat[] = ['C2', 'C3', 'C4'];
const CATC: Record<Cat, string> = { C2: '#2e7d32', C3: '#1976d2', C4: '#f9a825' };
const WOMEN = '#2e7d32';
const YOUTH = '#1976d2';
const S = (a: Act[], k: Num) => a.reduce((s, r) => s + r[k], 0);
const pc = (a: number, b: number) => (b ? (a / b) * 100 : 0);

const EXTRA = `
.sv-sec{display:flex;align-items:center;gap:8px;background:#2e7d32;color:#fff;padding:8px 12px;border-radius:6px;margin:0;font-size:clamp(13px,1.6vw,15px)}
.sv-wide{grid-column:1/-1}
.sv-hb{display:flex;gap:8px;flex-wrap:wrap}
.sv-ms{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.sv-ms>div{border:1px solid #d0d0d0;border-radius:10px;padding:10px;text-align:center}
.sv-ct{width:100%;border-collapse:collapse;font-size:12px;text-align:center}
.sv-ct th{background:#2e7d32;color:#fff;padding:6px;border:1px solid #ccc}
.sv-ct td{padding:8px;border:1px solid #ccc}
.sv-ct tr.tot td{background:#e8f5e9;font-weight:700}
.sv-abt{background:rgba(46,125,50,.06);border:1px solid #2e7d32}
.sv-abt p{font-size:12px;line-height:1.5;margin:0 0 8px}
@media print{.sv-noprint{display:none!important}.sv{background:#fff}.sv-c{box-shadow:none;break-inside:avoid}}
`;

const Beneficiaires: React.FC = () => {
  const ctx: any = useLanguage() || {};
  const raw = ctx.language ?? ctx.lang ?? ctx.locale;
  const lang: Lang = typeof raw === 'string' && raw in IDX ? (raw as Lang) : 'fr';
  const t = TB[lang];
  setLoc(LOCALES[lang]);
  const tv = (s: string) => (V2[s] ?? V[s])?.[IDX[lang]] ?? s;
  const narrow = useNarrow();
  const src = '/data/beneficiaires.geojson';

  const [geo, setGeo] = useState<Geo | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);

  const load = () => {
    setErr(false);
    setBusy(true);
    fetch(src, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setGeo)
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);
  const resetFilters = () => { setF({}); setQ(''); setPage(1); setPer(10); };
  const refresh = () => { resetFilters(); load(); };

  const cibleTotal = geo?.metadata?.cible_total ?? 25000;
  const cibleConf = geo?.metadata?.cible_confirmation ?? 80;
  const debut = geo?.metadata?.debut ?? 2025;
  const fin = geo?.metadata?.fin ?? 2030;

  const feats = geo?.features ?? [];
  const match = (p: Act, skip?: FK) => FILTERS.every((k) => k === skip || !f[k] || String(p[k]) === f[k]);
  const filtered = useMemo(() => feats.filter((x) => match(x.properties)), [feats, f]); // eslint-disable-line
  const rows = useMemo(() => filtered.map((x) => x.properties), [filtered]);
  const all = feats.map((x) => x.properties);
  const opts = (k: FK) => [...new Set(all.filter((r) => match(r, k)).map((r) => String(r[k])))].sort();

  // ---- Indicateur 1 : portée ----
  const val = rows.filter((r) => r.statut === 'Validé');
  const reach = S(val, 'participants');
  const decl = S(rows, 'participants');
  const cy = new Date().getFullYear();
  const nYears = fin - debut + 1;
  const attendu = cibleTotal * Math.max(0, Math.min(1, (cy - debut + 1) / nYears));
  const ecart = S(all.filter((r) => r.statut === 'Validé'), 'participants') - attendu;
  const women = pc(S(val, 'femmes'), reach);
  const youth = pc(S(val, 'jeunes'), reach);

  const base = all.filter((r) => match(r, 'annee'));
  const evolution = Array.from({ length: nYears }, (_, i) => {
    const y = debut + i;
    const past = y <= cy;
    return {
      annee: String(y),
      declare: past ? S(base.filter((r) => r.annee <= y), 'participants') : null,
      valide: past ? S(base.filter((r) => r.annee <= y && r.statut === 'Validé'), 'participants') : null,
      cible: Math.round((cibleTotal * (i + 1)) / nYears),
    };
  });

  const byCat = CATS.map((c) => {
    const a = val.filter((r) => r.categorie === c);
    const p = S(a, 'participants');
    return { c, n: a.length, p, share: pc(p, reach), w: pc(S(a, 'femmes'), p), j: pc(S(a, 'jeunes'), p), enq: S(a, 'enquetes'), ok: S(a, 'confirmes') };
  });
  const regions = Object.entries(val.reduce<Record<string, number>>((m, r) => ({ ...m, [r.region]: (m[r.region] || 0) + r.participants }), {}))
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const years = [...new Set(val.map((r) => r.annee))].sort();
  const byYear = years.map((y) => { const a = val.filter((r) => r.annee === y); const p = S(a, 'participants'); return { y: String(y), w: pc(S(a, 'femmes'), p), j: pc(S(a, 'jeunes'), p) }; });
  const statuts = Object.keys(STATUT).map((s) => ({ name: s, value: S(rows.filter((r) => r.statut === s), 'participants') }));

  // ---- Indicateur 2 : confirmation ----
  const enq = S(val, 'enquetes');
  const ok = S(val, 'confirmes');
  const rate = pc(ok, enq);
  const margin = enq ? 1.96 * Math.sqrt(((ok / enq) * (1 - ok / enq)) / enq) * 100 : 0;
  const surveyed = val.filter((r) => r.enquetes > 0);
  const cov = pc(enq, S(surveyed, 'participants'));
  const skills = Object.entries(val.reduce<Record<string, number>>((m, r) => ({ ...m, [r.intitule]: (m[r.intitule] || 0) + r.confirmes }), {}))
    .map(([name, v]) => ({ name: tv(name), value: Math.round(pc(v, ok) * 10) / 10 })).sort((a, b) => b.value - a.value).slice(0, 10);
  const waves = [{ y: 2026, k: t.conf.base }, { y: 2027, k: t.conf.mid }, { y: 2030, k: t.conf.final }];

  // ---- Tableau ----
  const ql = q.trim().toLowerCase();
  const table = ql ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(ql)) : rows;
  const pages = Math.max(1, Math.ceil(table.length / per));
  const cur = Math.min(page, pages);
  const slice = table.slice((cur - 1) * per, cur * per);
  const win = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(LOCALES[lang], { timeZone: 'UTC' });

  const exportCsv = () => {
    const keys: (keyof Act)[] = ['id', 'categorie', 'region', 'aire_protegee', 'district', 'commune', 'fokontany', 'intitule', 'participants', 'femmes', 'jeunes', 'date', 'statut'];
    const cell = (r: Act, k: keyof Act) => (k === 'intitule' || k === 'statut' ? tv(String(r[k])) : r[k]);
    const csv = ([t.table.cols, ...table.map((r) => keys.map((k) => cell(r, k)))] as (string | number)[][])
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'beneficiaires.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Sec = ({ icon: Ic, text }: { icon: React.ComponentType<any>; text: string }) => (
    <h3 className="sv-sec"><Ic size={18} />{text}</h3>
  );
  const Kpi = ({ title, big, sub, color = G, icon: Ic }: { title: string; big: string; sub?: string; color?: string; icon?: React.ComponentType<any> }) => (
    <div className="sv-c">
      <h4>{title}</h4>
      <div className="sv-big" style={{ color }}>{Ic && <Ic size={22} style={{ verticalAlign: -3, marginRight: 8 }} />}{big}</div>
      {sub && <div className="sv-sub">{sub}</div>}
    </div>
  );
  const bar = (v: number, c: string) => <div className="sv-bar"><b style={{ width: `${Math.min(100, v)}%`, background: c }} /></div>;
  const pct = (v: number) => `${fr(v, 1)} %`;

  return (
    <div className="sv">
      <style>{CSS + EXTRA}</style>
      <header className="sv-h">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users />{t.title}</h2>
        <div className="sv-hb sv-noprint">
          <button onClick={() => window.print()}><Printer size={18} /><span>{t.print}</span></button>
          <button onClick={refresh} disabled={busy} aria-label={t.refresh}><RefreshCw className={busy ? 'sv-spin' : ''} size={18} /><span>{t.refresh}</span></button>
        </div>
      </header>

      <main className="sv-w">
        {err && <div className="sv-c sv-msg">{t.err(src)}</div>}
        {!geo && !err && <div className="sv-c sv-msg">{t.loading}</div>}

        {geo && (<>
          <section className="sv-f sv-noprint">
            {FILTERS.map((k) => (
              <label key={k}>{t.f[k]}
                <select value={f[k] || ''} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setPage(1); }}>
                  <option value="">{t.all}</option>
                  {opts(k).map((o) => <option key={o} value={o}>{k === 'statut' ? tv(o) : o}</option>)}
                </select>
              </label>
            ))}
            <label>&nbsp;<button className="sv-btn" style={{ height: 38, justifyContent: 'center' }} onClick={resetFilters}><RotateCcw size={16} />{t.reset}</button></label>
          </section>

          {/* ===== 1. Atteinte de l'objectif ===== */}
          <Sec icon={Target} text={t.s1(fr(cibleTotal))} />
          <section className="sv-k">
            <div className="sv-c">
              <h4>{t.k.total}</h4>
              <div className="sv-big">{fr(reach)}</div>
              <div className="sv-sub">{t.k.on(fr(cibleTotal))}</div>
              {bar(pc(reach, cibleTotal), G)}
            </div>
            <div className="sv-c"><h4>{t.k.taux}</h4><Gauge pct={pc(reach, cibleTotal)} /></div>
            <Kpi title={t.k.ecart} big={`${ecart >= 0 ? '+' : ''}${fr(ecart)}`} sub={t.k.expected(cy, fr(attendu))} color={ecart >= 0 ? G : '#c62828'} />
            <Kpi title={t.k.declare} big={fr(decl)} sub={t.k.valPct(fr(pc(reach, decl), 1), fr(rows.length))} />
            <Kpi title={t.k.femmes} big={pct(women)} sub={t.k.persons(fr(S(val, 'femmes')))} color={WOMEN} />
            <Kpi title={t.k.jeunes} big={pct(youth)} sub={t.k.persons(fr(S(val, 'jeunes')))} color={YOUTH} />
          </section>

          <section className="sv-r3">
            <div className="sv-c">
              <h4>{t.c.cat}</h4>
              <div className="sv-t">
                <table className="sv-ct" style={{ minWidth: 380 }}>
                  <thead><tr>{t.cat.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {byCat.map((r) => (
                      <tr key={r.c}><td><b style={{ color: CATC[r.c] }}>{r.c}</b></td><td>{fr(r.n)}</td><td>{fr(r.p)}</td><td>{pct(r.share)}</td><td>{pct(r.w)}</td><td>{pct(r.j)}</td></tr>
                    ))}
                    <tr className="tot"><td>{t.cat.total}</td><td>{fr(val.length)}</td><td>{fr(reach)}</td><td>{pct(reach ? 100 : 0)}</td><td>{pct(women)}</td><td>{pct(youth)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <Donut title={t.c.cat} data={byCat.map((r) => ({ name: r.c, value: r.p }))} unit="" colors={CATS.map((c) => CATC[c])} />
            <div className="sv-c">
              <h4>{t.c.qual}</h4>
              {statuts.map((s) => (
                <div key={s.name}>
                  <div className="sv-lg" style={{ marginTop: 0 }}>
                    <span><i style={{ background: STATUT[s.name] }} />{tv(s.name)}</span>
                    <span><b>{fr(s.value)}</b> ({pct(pc(s.value, decl))})</span>
                  </div>
                  {bar(pc(s.value, decl), STATUT[s.name])}
                </div>
              ))}
            </div>
          </section>

          <section className="sv-r3 b">
            <div className="sv-c">
              <h4>{t.c.evol}</h4>
              <ResponsiveContainer width="100%" height={narrow ? 240 : 300}>
                <LineChart data={evolution} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, cibleTotal]} tickFormatter={(v: number) => fr(v)} width={64} />
                  <Tooltip formatter={(v: any) => fr(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line name={t.ev.declare} dataKey="declare" stroke="#FFB300" strokeWidth={2} dot={{ r: 3 }} />
                  <Line name={t.ev.valide} dataKey="valide" stroke={G} strokeWidth={3} dot={{ r: 4 }} />
                  <Line name={t.ev.cible(fr(cibleTotal))} dataKey="cible" stroke="#9e9e9e" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="sv-c">
              <h4>{t.c.region}</h4>
              <ResponsiveContainer width="100%" height={Math.max(220, regions.length * 36 + 30)}>
                <BarChart data={regions} layout="vertical" margin={{ left: 0, right: 48 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => fr(v)} />
                  <YAxis dataKey="name" type="category" width={narrow ? 84 : 120} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(v: any) => fr(v)} />
                  <Bar dataKey="value" fill={G} barSize={20} radius={[0, 2, 2, 0]}>
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fr(v)} style={{ fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="sv-c sv-map">
              <h4>{t.c.map}</h4>
              <MapContainer center={[-18.9, 47.5]} zoom={5} scrollWheelZoom={!narrow}>
                <TileLayer attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                {filtered.map((x) => {
                  const p = x.properties;
                  const [lo, la] = x.geometry.coordinates;
                  return (
                    <CircleMarker key={p.id} center={[la, lo]} radius={Math.max(5, Math.min(22, Math.sqrt(p.participants) / 1.2))}
                      pathOptions={{ color: CATC[p.categorie], fillColor: CATC[p.categorie], fillOpacity: 0.55, weight: 2 }}>
                      <Popup><b>{p.id}</b><br />{tv(p.intitule)}<br />{p.commune}, {p.region}<br />{fr(p.participants)} · {tv(p.statut)}</Popup>
                    </CircleMarker>
                  );
                })}
                <FitBounds feats={filtered as any} />
              </MapContainer>
              <div className="sv-lg" style={{ justifyContent: 'center', gap: 14 }}>
                {CATS.map((c) => <span key={c}><i style={{ background: CATC[c] }} />{c}</span>)}
              </div>
            </div>
          </section>

          {/* ===== 2. Inclusion ===== */}
          <Sec icon={Users} text={t.s2} />
          <section className="sv-r">
            {[{ title: t.c.incl, data: byCat.map((r) => ({ k: r.c, w: r.w, j: r.j })) }, { title: t.c.inclYear, data: byYear.map((r) => ({ k: r.y, w: r.w, j: r.j })) }].map((ch) => (
              <div className="sv-c" key={ch.title}>
                <h4>{ch.title}</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ch.data} margin={{ top: 18, right: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="k" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={44} />
                    <Tooltip formatter={(v: any) => pct(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar name={t.k.femmes} dataKey="w" fill={WOMEN} maxBarSize={44}><LabelList dataKey="w" position="top" formatter={(v: any) => fr(v, 1)} style={{ fontSize: 11, fontWeight: 700 }} /></Bar>
                    <Bar name={t.k.jeunes} dataKey="j" fill={YOUTH} maxBarSize={44}><LabelList dataKey="j" position="top" formatter={(v: any) => fr(v, 1)} style={{ fontSize: 11, fontWeight: 700 }} /></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </section>

          {/* ===== 3. Confirmation ===== */}
          <Sec icon={GraduationCap} text={t.s3} />
          <section className="sv-k">
            <Kpi title={t.conf.enq} big={fr(enq)} icon={ClipboardCheck} color={YOUTH} sub={`${t.conf.cov} : ${pct(cov)}`} />
            <Kpi title={t.conf.ok} big={fr(ok)} icon={CheckCircle2} color="#f9a825" />
            <div className="sv-c">
              <h4>{t.conf.rate}</h4>
              <div className="sv-big" style={{ color: rate >= cibleConf ? G : '#c62828' }}>{enq ? pct(rate) : '—'}</div>
              <div className="sv-sub">{t.conf.target(fr(cibleConf))} · {enq ? (rate >= cibleConf ? t.conf.met : t.conf.notMet) : ''}</div>
              {bar(rate, rate >= cibleConf ? G : '#c62828')}
              <div className="sv-sub" style={{ fontWeight: 500 }}>{enq ? t.conf.margin(fr(margin, 1)) : ''}</div>
            </div>
            <div className="sv-c sv-wide">
              <h4>{t.conf.ms}</h4>
              <div className="sv-ms">
                {waves.map((w) => {
                  const done = w.y <= cy && enq > 0;
                  return (
                    <div key={w.y} style={{ borderColor: done ? G : '#d0d0d0' }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{w.y}</div>
                      <div style={{ fontSize: 12 }}>{w.k}</div>
                      <div style={{ fontWeight: 700, color: done ? G : '#9e9e9e', marginTop: 4 }}>{done ? `${t.conf.done} · ${pct(rate)}` : `${t.conf.soon} · ${fr(cibleConf)} %`}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="sv-r3">
            <div className="sv-c">
              <h4>{t.conf.byCat}</h4>
              {enq ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byCat.filter((r) => r.enq).map((r) => ({ k: r.c, v: pc(r.ok, r.enq) }))} margin={{ top: 18, right: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="k" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={44} />
                    <Tooltip formatter={(v: any) => pct(v)} />
                    <ReferenceLine y={cibleConf} stroke="#c62828" strokeDasharray="5 5" label={{ value: `${fr(cibleConf)} %`, fill: '#c62828', fontSize: 11, position: 'insideTopRight' }} />
                    <Bar dataKey="v" maxBarSize={50} radius={[3, 3, 0, 0]}>
                      {byCat.filter((r) => r.enq).map((r) => <Cell key={r.c} fill={CATC[r.c]} />)}
                      <LabelList dataKey="v" position="top" formatter={(v: any) => fr(v, 1)} style={{ fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="sv-msg">{t.conf.none}</div>}
            </div>
            <div className="sv-c">
              <h4>{t.conf.skills}</h4>
              <ResponsiveContainer width="100%" height={Math.max(260, skills.length * 30 + 30)}>
                <BarChart data={skills} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={narrow ? 110 : 190} interval={0} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => `${fr(v, 1)} %`} />
                  <Bar dataKey="value" fill={G} barSize={14} radius={[0, 2, 2, 0]}>
                    <LabelList dataKey="value" position="right" formatter={(v: any) => `${fr(v, 1)}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="sv-c sv-abt">
              <h4>{t.about.title}</h4>
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
              {CATS.map((c) => <p key={c}><b style={{ color: CATC[c] }}>{c} :</b> {t.about[c]}</p>)}
            </div>
          </section>

          {/* ===== 4. Données détaillées ===== */}
          <Sec icon={ClipboardCheck} text={t.s4} />
          <section className="sv-c">
            <div className="sv-tb">
              <h4>{t.table.title(fr(table.length))}</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#888' }} />
                  <input style={{ paddingLeft: 32 }} placeholder={t.table.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                </span>
                <button className="sv-btn sv-noprint" onClick={exportCsv}><Download size={16} />{t.table.export}</button>
              </div>
            </div>
            <div className="sv-t">
              <table style={{ minWidth: 1100 }}>
                <thead><tr>{t.table.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td><td style={{ color: CATC[r.categorie], fontWeight: 700 }}>{r.categorie}</td>
                      <td>{r.region}</td><td>{r.aire_protegee}</td><td>{r.district}</td><td>{r.commune}</td><td>{r.fokontany}</td>
                      <td className="l">{tv(r.intitule)}</td>
                      <td>{fr(r.participants)}</td><td>{fr(r.femmes)}</td><td>{fr(r.jeunes)}</td><td>{dateFmt(r.date)}</td>
                      <td style={{ color: STATUT[r.statut], fontWeight: 600 }}>{tv(r.statut)}</td>
                    </tr>
                  ))}
                  {!slice.length && <tr><td colSpan={13}>{t.table.none}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="sv-pg sv-noprint">
              <span style={{ fontWeight: 700, color: '#6b7280' }}>
                {table.length ? t.table.showing(fr((cur - 1) * per + 1), fr(Math.min(cur * per, table.length)), fr(table.length)) : t.table.empty}
              </span>
              <div>
                <button disabled={cur === 1} onClick={() => setPage(1)} aria-label={t.table.first}>⏮</button>
                <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label={t.table.prev}>◀</button>
                {win.map((p, i) => (
                  <React.Fragment key={p}>
                    {i > 0 && p - win[i - 1] > 1 && <span>…</span>}
                    <button className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
                  </React.Fragment>
                ))}
                <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label={t.table.next}>▶</button>
                <button disabled={cur === pages} onClick={() => setPage(pages)} aria-label={t.table.last}>⏭</button>
              </div>
              <label>{t.table.rows}{' '}
                <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </section>
        </>)}
      </main>
    </div>
  );
};

export default Beneficiaires;
