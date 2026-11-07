import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, LabelList, Legend,
} from 'recharts';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Users, Flame, Download, Search } from 'lucide-react';

const G = '#1b5e20';
const PAL = ['#2e7d32', '#66bb6a', '#D4E157', '#FFB300', '#64B5F6', '#a5d6a7', '#8d6e63'];
const STATUT = { 'Validé': G, 'En attente': '#FFB300', 'Rejeté': '#c62828' };
const FILTERS = [
  ['annee', 'Année'], ['region', 'Région'], ['aire_protegee', 'Aire protégée'],
  ['paysage', 'Paysage'], ['district', 'District'], ['commune', 'Commune'],
  ['fokontany', 'Fokontany'], ['mbv', 'Micro-bassin versant'], ['statut', 'Statut'],
];
const ICONS = { cep: Users, feu: Flame };

const fr = (n, d = 0) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const sum = (rows) => rows.reduce((s, r) => s + r.superficie_ha, 0);
const dateFr = (iso) => iso.split('-').reverse().join('/');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const group = (rows, key) => {
  const m = {};
  rows.forEach((r) => { m[r[key]] = (m[r[key]] || 0) + r.superficie_ha; });
  return Object.entries(m)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
};

const CSS = `
.sv{--g:clamp(8px,1.2vw,16px);background:#f4f6f5;min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#374151}
.sv *{box-sizing:border-box}
.sv-h{background:#0b5d1e;color:#fff;padding:10px clamp(12px,2vw,24px);display:flex;justify-content:space-between;align-items:center;gap:12px}
.sv-h h2{margin:0;font-size:clamp(15px,2.4vw,22px);line-height:1.2}
.sv-h button{background:none;border:0;color:#fff;cursor:pointer;display:flex}
.sv-w{max-width:1920px;margin:0 auto;padding:clamp(10px,2vw,24px);display:grid;gap:var(--g)}
.sv-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.sv-f label{font-size:12px;font-weight:600;display:flex;flex-direction:column;gap:4px;min-width:0}
.sv-f select{height:38px;width:100%;min-width:0;border:1px solid #d1d5db;border-radius:8px;padding:0 8px;background:#fff}
.sv-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:var(--g)}
.sv-r{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:var(--g)}
.sv-c{background:#fff;border-radius:10px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);min-width:0;display:flex;flex-direction:column}
.sv-c h4{margin:0 0 10px;text-align:center;color:${G};font-size:14px}
.sv-e{grid-column:span 2;border-left:6px solid ${G};background:linear-gradient(90deg,rgba(27,94,32,.08),rgba(27,94,32,.02))}
.sv-e p{margin:0;font-size:14px;line-height:1.6}
.sv-big{font-size:clamp(20px,2.4vw,30px);font-weight:800;color:${G};text-align:center;line-height:1.1}
.sv-sub{font-size:12px;font-weight:700;text-align:center;margin-top:6px}
.sv-lg{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:6px;align-items:center}
.sv-lg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.sv-bar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:3px 0 10px}
.sv-bar b{display:block;height:100%}
.sv-map{min-height:420px}
.sv-map .leaflet-container{flex:1;min-height:340px;width:100%;border-radius:8px;z-index:0}
.sv-tb{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px}
.sv-tb h4{margin:0}
.sv-tb input{padding:8px 10px;width:min(100%,220px);border:1px solid #ddd;border-radius:8px}
.sv-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;background:${G};color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600}
.sv-t{overflow-x:auto}
.sv-t table{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}
.sv-t th{background:${G};color:#fff;padding:10px;border-right:1px solid rgba(255,255,255,.3)}
.sv-t td{padding:10px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;text-align:center}
.sv-t td.l{text-align:left}
.sv-pg{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px}
.sv-pg div{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.sv-pg button{min-width:32px;height:32px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer;font-weight:600}
.sv-pg button.on{background:${G};color:#fff;border-color:${G}}
.sv-pg button:disabled{opacity:.4;cursor:default}
.sv-msg{padding:40px 16px;text-align:center}
@media(max-width:520px){.sv-e{grid-column:auto}.sv-pg{justify-content:center}}
@media(min-width:2200px){.sv{font-size:18px}.sv-c h4{font-size:18px}.sv-t table{font-size:16px}}
@media(prefers-reduced-motion:reduce){.sv *{transition:none!important;animation:none!important}}
`;

function useNarrow(px = 480) {
  const q = `(max-width:${px}px)`;
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

function FitBounds({ feats }) {
  const map = useMap();
  useEffect(() => {
    if (!feats.length) return;
    const b = L.geoJSON({ type: 'FeatureCollection', features: feats }).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24], maxZoom: 9 });
  }, [feats, map]);
  return null;
}

function Donut({ title, data }) {
  const t = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="sv-c">
      <h4>{title}</h4>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="85%">
              {data.map((d, i) => <Cell key={d.name} fill={PAL[i % PAL.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `${fr(v)} ha`} />
            <text x="50%" y="48%" textAnchor="middle" fontSize={15} fontWeight="700" fill={G}>{fr(t)} ha</text>
            <text x="50%" y="58%" textAnchor="middle" fontSize={11} fill="#6b7280">(100 %)</text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {data.map((d, i) => (
        <div className="sv-lg" key={d.name}>
          <span><i style={{ background: PAL[i % PAL.length] }} />{d.name}</span>
          <span><b>{fr(d.value)} ha</b> ({fr((d.value / (t || 1)) * 100, 1)} %)</span>
        </div>
      ))}
    </div>
  );
}

function Gauge({ pct }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 90 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={[{ v: p }, { v: 100 - p }]} dataKey="v" innerRadius="65%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={G} /><Cell fill="#e0e0e0" />
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight="700" fill={G}>{fr(pct, 1)} %</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SuiviDashboard({ config, src = '/data/parcelles.geojson' }) {
  const { title, themes, cible, debut, fin, enonce, donuts, extras = [] } = config;
  const narrow = useNarrow();
  const [geo, setGeo] = useState(null);
  const [err, setErr] = useState(null);
  const [f, setF] = useState({});
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);

  const load = () => {
    setErr(null);
    fetch(src)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setGeo)
      .catch((e) => setErr(e.message));
  };
  useEffect(load, [src]);

  const feats = useMemo(
    () => (geo ? geo.features.filter((x) => themes.includes(x.properties.theme)) : []),
    [geo, themes],
  );
  const match = (p, skip) => FILTERS.every(([k]) => k === skip || !f[k] || String(p[k]) === f[k]);
  const filtered = useMemo(() => feats.filter((x) => match(x.properties)), [feats, f]); // eslint-disable-line
  const rows = useMemo(() => filtered.map((x) => x.properties), [filtered]);
  const opts = (k) => [...new Set(feats.filter((x) => match(x.properties, k)).map((x) => String(x.properties[k])))].sort();

  // KPI
  const cy = new Date().getFullYear();
  const nYears = fin - debut + 1;
  const all = feats.map((x) => x.properties);
  const valides = rows.filter((r) => r.statut === 'Validé');
  const vTot = sum(valides);
  const dTot = sum(rows);
  const attendu = cible * Math.max(0, Math.min(1, (cy - debut + 1) / nYears));
  const ecart = sum(all.filter((r) => r.statut === 'Validé')) - attendu;
  const prec = rows.length ? rows.reduce((s, r) => s + r.precision_gps_m, 0) / rows.length : 0;

  // Évolution (indépendante du filtre année)
  const base = all.filter((r) => FILTERS.every(([k]) => k === 'annee' || !f[k] || String(r[k]) === f[k]));
  const evolution = Array.from({ length: nYears }, (_, i) => {
    const y = debut + i;
    const past = y <= cy;
    return {
      annee: String(y),
      declare: past ? Math.round(sum(base.filter((r) => r.annee <= y))) : null,
      valide: past ? Math.round(sum(base.filter((r) => r.annee <= y && r.statut === 'Validé'))) : null,
      cible: Math.round((cible * (i + 1)) / nYears),
    };
  });

  const regions = group(rows, 'region');
  const statuts = Object.keys(STATUT).map((s) => ({ name: s, value: sum(rows.filter((r) => r.statut === s)) }));

  // Tableau
  const ql = q.trim().toLowerCase();
  const table = ql ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(ql)) : rows;
  const pages = Math.max(1, Math.ceil(table.length / per));
  const cur = Math.min(page, pages);
  const slice = table.slice((cur - 1) * per, cur * per);
  const win = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);

  const exportCsv = () => {
    const cols = ['id', 'utilisateur', 'pratique', 'region', 'commune', 'debut', 'fin', 'superficie_ha', 'statut', 'precision_gps_m'];
    const csv = [cols.join(';'), ...table.map((r) => cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'parcelles.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const mapKey = `${filtered.length}-${Math.round(dTot)}`;

  return (
    <div className="sv">
      <style>{CSS}</style>
      <header className="sv-h">
        <h2>{title}</h2>
        <button onClick={load} aria-label="Actualiser les données"><RefreshCw /></button>
      </header>

      <main className="sv-w">
        {err && <div className="sv-c sv-msg">Chargement impossible ({err}). Vérifiez que <code>{src}</code> est accessible, puis actualisez.</div>}
        {!geo && !err && <div className="sv-c sv-msg">Chargement des parcelles…</div>}

        {geo && (<>
          <section className="sv-f" aria-label="Filtres">
            {FILTERS.map(([k, label]) => (
              <label key={k}>{label}
                <select value={f[k] || ''} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setPage(1); }}>
                  <option value="">Tous</option>
                  {opts(k).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </section>

          <section className="sv-k">
            <div className="sv-c sv-e"><h4>Énoncé de l’indicateur</h4><p>{enonce}</p></div>
            <div className="sv-c">
              <h4>Superficie validée</h4>
              <div className="sv-big">{fr(vTot)} ha</div>
              <div className="sv-sub">sur {fr(cible)} ha</div>
            </div>
            <div className="sv-c"><h4>Taux d’atteinte</h4><Gauge pct={(vTot / cible) * 100} /></div>
            <div className="sv-c">
              <h4>Écart à la trajectoire</h4>
              <div className="sv-big" style={{ color: ecart >= 0 ? G : '#c62828' }}>{ecart >= 0 ? '+' : ''}{fr(ecart)} ha</div>
              <div className="sv-sub">attendu fin {cy} : {fr(attendu)} ha</div>
            </div>
            <div className="sv-c">
              <h4>Déclaré par le prestataire</h4>
              <div className="sv-big">{fr(dTot)} ha</div>
              <div className="sv-sub">{fr(dTot ? (vTot / dTot) * 100 : 0, 1)} % validé · {fr(rows.length)} parcelles</div>
            </div>
            {extras.map((x) => {
              const Ic = ICONS[x.icon] || Users;
              return (
                <div className="sv-c" key={x.label}>
                  <h4>{x.label}</h4>
                  <div className="sv-big"><Ic size={22} style={{ verticalAlign: -3, marginRight: 8 }} />{fr(sum(rows.filter((r) => r[x.flag])))} ha</div>
                </div>
              );
            })}
          </section>

          <section className="sv-r">
            <div className="sv-c">
              <h4>Répartition par région (ha)</h4>
              <ResponsiveContainer width="100%" height={Math.max(220, regions.length * 36 + 30)}>
                <BarChart data={regions} layout="vertical" margin={{ left: 0, right: 48 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fr(v)} />
                  <YAxis dataKey="name" type="category" width={narrow ? 84 : 120} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(v) => `${fr(v)} ha`} />
                  <Bar dataKey="value" fill={G} barSize={20} radius={[0, 2, 2, 0]}>
                    <LabelList dataKey="value" position="right" formatter={(v) => fr(v)} style={{ fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {donuts.map(([key, label]) => <Donut key={key} title={label} data={group(rows, key)} />)}
            <div className="sv-c">
              <h4>Contrôle qualité des relevés</h4>
              {statuts.map((s) => (
                <div key={s.name}>
                  <div className="sv-lg" style={{ marginTop: 0 }}>
                    <span><i style={{ background: STATUT[s.name] }} />{s.name}</span>
                    <span><b>{fr(s.value)} ha</b> ({fr(dTot ? (s.value / dTot) * 100 : 0, 1)} %)</span>
                  </div>
                  <div className="sv-bar"><b style={{ width: `${dTot ? (s.value / dTot) * 100 : 0}%`, background: STATUT[s.name] }} /></div>
                </div>
              ))}
              <div className="sv-sub">Précision GPS moyenne : {fr(prec, 1)} m</div>
            </div>
          </section>

          <section className="sv-r">
            <div className="sv-c" style={{ gridColumn: 'span 2' }}>
              <h4>Évolution annuelle cumulée (ha)</h4>
              <ResponsiveContainer width="100%" height={narrow ? 240 : 300}>
                <LineChart data={evolution} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} padding={{ left: 15, right: 15 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, cible]} tickFormatter={(v) => fr(v)} width={64} />
                  <Tooltip formatter={(v) => `${fr(v)} ha`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line name="Déclaré" dataKey="declare" stroke="#FFB300" strokeWidth={2} dot={{ r: 3 }} />
                  <Line name="Validé" dataKey="valide" stroke={G} strokeWidth={3} dot={{ r: 4 }} />
                  <Line name={`Trajectoire cible (${fr(cible)} ha)`} dataKey="cible" stroke="#9e9e9e" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="sv-c sv-map">
              <h4>Localisation des parcelles</h4>
              <MapContainer center={[-18.9, 47.5]} zoom={5} scrollWheelZoom={!narrow}>
                <TileLayer attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                <GeoJSON
                  key={mapKey}
                  data={{ type: 'FeatureCollection', features: filtered }}
                  style={(x) => ({ color: STATUT[x.properties.statut], weight: 5, fillOpacity: 0.6 })}
                  onEachFeature={(x, l) => {
                    const p = x.properties;
                    l.bindPopup(`<b>${esc(p.id)}</b><br>${esc(p.pratique)}<br>${esc(p.commune)}, ${esc(p.region)}<br>${fr(p.superficie_ha, 2)} ha · ${esc(p.statut)}`);
                  }}
                />
                <FitBounds feats={filtered} />
              </MapContainer>
              <div className="sv-lg" style={{ justifyContent: 'center', gap: 14 }}>
                {Object.entries(STATUT).map(([s, c]) => <span key={s}><i style={{ background: c }} />{s}</span>)}
              </div>
            </div>
          </section>

          <section className="sv-c">
            <div className="sv-tb">
              <h4>Détails des parcelles ({fr(table.length)})</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#888' }} />
                  <input style={{ paddingLeft: 32 }} placeholder="Rechercher…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                </span>
                <button className="sv-btn" onClick={exportCsv}><Download size={16} />Exporter CSV</button>
              </div>
            </div>
            <div className="sv-t">
              <table>
                <thead><tr>
                  {['ID Parcelle', 'ID Utilisateur', 'Pratique durable appliquée', 'Début', 'Fin', 'Superficie (ha)', 'Statut'].map((h) => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td><td>{r.utilisateur}</td><td className="l">{r.pratique}</td>
                      <td>{dateFr(r.debut)}</td><td>{dateFr(r.fin)}</td>
                      <td style={{ fontWeight: 600, color: G }}>{fr(r.superficie_ha, 2)}</td>
                      <td style={{ color: STATUT[r.statut], fontWeight: 600 }}>{r.statut}</td>
                    </tr>
                  ))}
                  {!slice.length && <tr><td colSpan={7}>Aucune parcelle pour ces filtres.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="sv-pg">
              <span style={{ fontWeight: 700, color: '#6b7280' }}>
                {table.length ? `Affichage de ${(cur - 1) * per + 1} à ${Math.min(cur * per, table.length)} sur ${fr(table.length)}` : '0 enregistrement'}
              </span>
              <div>
                <button disabled={cur === 1} onClick={() => setPage(1)} aria-label="Première page">⏮</button>
                <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Page précédente">◀</button>
                {win.map((p, i) => (
                  <React.Fragment key={p}>
                    {i > 0 && p - win[i - 1] > 1 && <span>…</span>}
                    <button className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
                  </React.Fragment>
                ))}
                <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Page suivante">▶</button>
                <button disabled={cur === pages} onClick={() => setPage(pages)} aria-label="Dernière page">⏭</button>
              </div>
              <label>Lignes par page{' '}
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
}
