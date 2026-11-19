import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, BarChart, Bar, LabelList,
} from 'recharts';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Users, Flame, Download, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { T, V, IDX, LOCALES } from '../i18n/suivi';
import type { Lang } from '../i18n/suivi';

export interface Parcelle {
  id: string; utilisateur: string; theme: string; theme_label: string; pratique: string; pratique_cat: string;
  type_terrain: string; region: string; aire_protegee: string; paysage: string; district: string; commune: string;
  fokontany: string; mbv: string; annee: number; debut: string; fin: string; superficie_ha: number;
  statut: string; precision_gps_m: number; is_cep: boolean; is_pare_feu: boolean;
}
type Feat = { type: 'Feature'; geometry: any; properties: Parcelle };
type Geo = { type: 'FeatureCollection'; features: Feat[] };
type FilterKey = 'annee' | 'aire_protegee' | 'region' | 'district' | 'commune' | 'paysage' | 'mbv' | 'statut';
type PageKey = 'agro' | 'foret' | 'global';
type Base = 'topo' | 'sat' | 'osm';

export interface DashboardConfig {
  titleKey: PageKey;
  enonceKey: PageKey;
  themes: string[];
  cible: number;
  debut: number;
  fin: number;
  donuts: ('type_terrain' | 'pratique_cat' | 'theme_label')[];
  extras?: { key: 'cep' | 'feu'; flag: 'is_cep' | 'is_pare_feu'; icon: 'cep' | 'feu' }[];
}

/* Limites administratives. Régions : OpenStreetMap (Overpass). Districts et communes : geoBoundaries. */
type Adm = { type?: string; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type Niv = 'ADM2' | 'ADM3';
type Pt = [number, number];

/* Les 24 régions actuelles de Madagascar (Vatovavy-Fitovinany scindée, Ambatosoa créée) */
const REGIONS_REF = [
  'Analamanga', 'Vakinankaratra', 'Itasy', 'Bongolava', 'Haute Matsiatra', "Amoron'i Mania",
  'Vatovavy', 'Fitovinany', 'Ihorombe', 'Atsimo Atsinanana', 'Atsinanana', 'Analanjirofo',
  'Ambatosoa', 'Alaotra Mangoro', 'Boeny', 'Betsiboka', 'Melaky', 'Atsimo Andrefana',
  'Androy', 'Anosy', 'Menabe', 'Diana', 'Sava', 'Sofia',
];

/* Couleurs
   - G / STATUT : valeurs « réelles » (hex) utilisées sur la carte Leaflet
   - GV / BAD / STATUT_UI : variables du thème (clair / sombre) pour le reste de l'interface */
const G = '#1b5e20';
const GV = 'var(--gv)';
const BAD = 'var(--bad)';
const PAL = ['#2e7d32', '#66bb6a', '#D4E157', '#FFB300', '#64B5F6', '#a5d6a7', '#8d6e63'];
const STATUT: Record<string, string> = { 'Validé': G, 'En attente': '#FFB300', 'Rejeté': '#c62828' };
const STATUT_UI: Record<string, string> = { 'Validé': GV, 'En attente': '#FFB300', 'Rejeté': BAD };
const COULEUR_REGION = '#ea580c';
const COULEUR_DISTRICT = '#7c3aed';
const COULEUR_COMMUNE = '#dc2626';
// Ordre d'affichage des filtres (Fokontany retiré)
const FILTERS: FilterKey[] = ['annee', 'aire_protegee', 'region', 'district', 'commune', 'paysage', 'mbv', 'statut'];
const ICONS: Record<string, React.ComponentType<any>> = { cep: Users, feu: Flame };
const MADAGASCAR: [number, number] = [-18.9, 47.5];

// Homonymes : clé région|district|commune (normalisées) -> nom de la géométrie à utiliser
const COMMUNE_GEO: Record<string, string> = {
  'boeny|marovoay|marosakoa': 'Marovoay',
};

// Fonds de carte : Topographie (ArcGIS), Satellite (ArcGIS), OpenStreetMap
const BASEMAPS: Record<Base, { label: string; url: string; attribution: string }> = {
  topo: {
    label: 'Topographie',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri',
  },
  sat: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
};

// Style des info-bulles Recharts (lisibles en clair et en sombre)
const TIP = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--txt)' },
  itemStyle: { color: 'var(--txt)' },
  labelStyle: { color: 'var(--txt)' },
};
const TICK = { fill: 'var(--txt2)' };

let LOC = 'fr-FR'; // mis à jour à chaque rendu selon la langue active
const fr = (n: number | string, d = 0) => Number(n || 0).toLocaleString(LOC, { maximumFractionDigits: d });
const sum = (rows: Parcelle[]) => rows.reduce((s, r) => s + r.superficie_ha, 0);
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(LOC, { timeZone: 'UTC' });
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cle = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const trier = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
const group = (rows: Parcelle[], key: keyof Parcelle) => {
  const m: Record<string, number> = {};
  rows.forEach((r) => { const k = String(r[key]); m[k] = (m[k] || 0) + r.superficie_ha; });
  return Object.entries(m)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
};

/* ===================== LIMITES ADMINISTRATIVES ===================== */

const REV = '9469f09';
const GH = 'wmgeolab/geoBoundaries';
const CACHE: Partial<Record<Niv, Adm[]>> = {};
let CACHE_REGIONS: Adm[] | null = null;

const nomAdm = (f: Adm): string =>
  String(
    f.properties.shapeName ??
      f.properties.name ??
      Object.values(f.properties).find((v) => typeof v === 'string') ??
      ''
  );

const polygones = (f: Adm): number[][][][] =>
  f.geometry.type === 'Polygon'
    ? [f.geometry.coordinates]
    : f.geometry.type === 'MultiPolygon'
    ? f.geometry.coordinates
    : [];

function dansAnneau(x: number, y: number, a: number[][]): boolean {
  let dedans = false;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [xi, yi] = a[i];
    const [xj, yj] = a[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

const contient = (x: number, y: number, f: Adm) =>
  polygones(f).some((p) => dansAnneau(x, y, p[0]) && !p.slice(1).some((h) => dansAnneau(x, y, h)));

/* Centre approximatif d'une zone (moyenne des sommets) */
function centre(f: Adm): [number, number] | null {
  const pts = polygones(f).flatMap((p) => p[0]);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/* Vrai si l'enfant (district ou commune) se trouve à l'intérieur du parent */
function estDans(enfant: Adm, parent: Adm): boolean {
  const pts = polygones(enfant).flatMap((p) => p[0]);
  const c = centre(enfant);
  if (!pts.length || !c) return false;
  let score = contient(c[0], c[1], parent) ? 3 : 0;
  const pas = Math.max(1, Math.floor(pts.length / 6));
  for (let i = 0; i < pts.length && i < pas * 6; i += pas) {
    if (contient(pts[i][0], pts[i][1], parent)) score++;
  }
  return score >= 5;
}

/* Districts et communes : geoBoundaries (libre) */
async function chargerAdm(niv: Niv): Promise<Adm[]> {
  if (CACHE[niv]) return CACHE[niv]!;
  const f = `releaseData/gbOpen/MDG/${niv}/geoBoundaries-MDG-${niv}_simplified.geojson`;
  const urls = [
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`,
    `https://raw.githubusercontent.com/${GH}/${REV}/${f}`,
    `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texte = await r.text();
      if (texte.startsWith('version https://git-lfs')) throw new Error('LFS');
      const j = JSON.parse(texte);
      const feats = (j.features ?? []).filter(
        (x: Adm) => x?.geometry && /Polygon/.test(x.geometry.type)
      ) as Adm[];
      if (feats.length) {
        CACHE[niv] = feats;
        return feats;
      }
    } catch {
      /* source suivante */
    }
  }
  throw new Error(niv);
}

/* ----- Conversion OpenStreetMap -> GeoJSON (sans bibliothèque externe) ----- */

const memePoint = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

/* Assemble des segments (tronçons de contour) en anneaux fermés */
function assemblerAnneaux(segs: Pt[][]): Pt[][] {
  const reste = segs.filter((s) => s.length > 1).map((s) => [...s]);
  const anneaux: Pt[][] = [];
  while (reste.length) {
    let anneau: Pt[] = reste.shift()!;
    let progres = true;
    while (progres && !memePoint(anneau[0], anneau[anneau.length - 1])) {
      progres = false;
      const fin = anneau[anneau.length - 1];
      for (let i = 0; i < reste.length; i++) {
        const s = reste[i];
        if (memePoint(s[0], fin)) {
          anneau = anneau.concat(s.slice(1));
        } else if (memePoint(s[s.length - 1], fin)) {
          anneau = anneau.concat(s.slice(0, -1).reverse());
        } else {
          continue;
        }
        reste.splice(i, 1);
        progres = true;
        break;
      }
    }
    if (anneau.length > 3 && memePoint(anneau[0], anneau[anneau.length - 1])) anneaux.push(anneau);
  }
  return anneaux;
}

/* Relation OSM (out geom) -> Feature GeoJSON (MultiPolygon, avec trous) */
function relationVersAdm(rel: any): Adm | null {
  const ext: Pt[][] = [];
  const int: Pt[][] = [];
  (rel.members ?? []).forEach((m: any) => {
    if (m.type !== 'way' || !Array.isArray(m.geometry)) return;
    const seg: Pt[] = m.geometry.map((p: any) => [p.lon, p.lat] as Pt);
    if (m.role === 'inner') int.push(seg);
    else if (m.role === 'outer' || m.role === '') ext.push(seg);
  });
  const exterieurs = assemblerAnneaux(ext);
  const trous = assemblerAnneaux(int);
  if (!exterieurs.length) return null;
  const polys = exterieurs.map((o) => [o, ...trous.filter((h) => dansAnneau(h[0][0], h[0][1], o))]);
  return {
    type: 'Feature',
    properties: { shapeName: String(rel.tags?.name ?? '') },
    geometry: { type: 'MultiPolygon', coordinates: polys },
  };
}

/* Régions : OpenStreetMap via Overpass (libre, à jour). On ne garde que les 24 noms de référence,
   car OSM peut aussi marquer les provinces au même niveau administratif. */
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const REQUETE_REGIONS =
  '[out:json][timeout:90];' +
  'area["ISO3166-1"="MG"][admin_level=2]->.pays;' +
  'relation(area.pays)["boundary"="administrative"]["admin_level"="4"];' +
  'out geom;';

async function chargerRegions(): Promise<Adm[]> {
  if (CACHE_REGIONS) return CACHE_REGIONS;
  const r = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(REQUETE_REGIONS),
  });
  if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
  const data = await r.json();
  const ref = new Set(REGIONS_REF.map(cle));
  const vues = new Set<string>();
  const feats: Adm[] = [];
  (data.elements ?? []).forEach((rel: any) => {
    if (rel.type !== 'relation') return;
    const nom = String(rel.tags?.name ?? '');
    const k = cle(nom);
    if (!ref.has(k) || vues.has(k)) return;
    const adm = relationVersAdm(rel);
    if (!adm) return;
    vues.add(k);
    feats.push(adm);
  });
  const manquantes = REGIONS_REF.filter((n) => !vues.has(cle(n)));
  if (manquantes.length) console.warn('Régions introuvables dans OpenStreetMap :', manquantes);
  CACHE_REGIONS = feats;
  return feats;
}

/* ===================== CARTE : RECADRAGE, ÉCHELLE ===================== */

// Recadre la carte sur la zone sélectionnée, sinon sur Madagascar
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) { map.setView(MADAGASCAR, 5); return; }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
  }, [bounds]); // eslint-disable-line
  return null;
}

// Échelle métrique en bas à gauche de la carte
function ScaleBar() {
  const map = useMap();
  useEffect(() => {
    const c = L.control.scale({ metric: true, imperial: false, position: 'bottomleft' });
    c.addTo(map);
    return () => { c.remove(); };
  }, [map]);
  return null;
}

/* ===================== GRAPHIQUES ===================== */

function Donut({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const t = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="sv-c">
      <h4>{title}</h4>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="85%" stroke="var(--card)">
              {data.map((d, i) => <Cell key={d.name} fill={PAL[i % PAL.length]} />)}
            </Pie>
            <Tooltip {...TIP} formatter={(v: any) => `${fr(v)} ha`} />
            <text x="50%" y="48%" textAnchor="middle" fontSize={15} fontWeight="700" fill="var(--gv)">{fr(t)} ha</text>
            <text x="50%" y="58%" textAnchor="middle" fontSize={11} fill="var(--mut)">(100 %)</text>
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

function Gauge({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 110 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={[{ v: p }, { v: 100 - p }]} dataKey="v" innerRadius="65%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
            <Cell fill="var(--gv)" /><Cell fill="var(--track)" />
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight="700" fill="var(--gv)">{fr(pct, 1)} %</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ===================== CSS ===================== */

/* Les couleurs viennent de variables : valeurs claires dans « .sv »,
   surcharges du thème sombre dans « :root[data-theme="dark"] .sv ». */
const CSS = `
.sv{--g:clamp(8px,1.2vw,16px);
  --page:#f4f6f5;--card:#fff;--txt:#374151;--txt2:#4b5563;--mut:#6b7280;--line:#e5e7eb;--bd:#d1d5db;--track:#e5e7eb;
  --gv:#1b5e20;--gb:#1b5e20;--bad:#c62828;--e1:rgba(27,94,32,.08);--e2:rgba(27,94,32,.02);--map-bg:#e5e7eb;
  background:var(--page);min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:var(--txt)}
:root[data-theme="dark"] .sv{--page:var(--bg);--card:var(--surface);--txt:#e5e7eb;--txt2:#cbd5e1;--mut:#94a3b8;
  --line:rgba(255,255,255,.12);--bd:rgba(255,255,255,.2);--track:rgba(255,255,255,.14);
  --gv:#66bb6a;--gb:#2e7d32;--bad:#f87171;--e1:rgba(102,187,106,.14);--e2:rgba(102,187,106,.04);--map-bg:#1b2740}
.sv *{box-sizing:border-box}
.sv-w{max-width:1920px;margin:0 auto;padding:clamp(10px,2vw,24px);display:grid;gap:var(--g)}
.sv-hd{max-width:1920px;margin:0 auto;padding:clamp(10px,2vw,24px) clamp(10px,2vw,24px) 0;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;color:var(--txt)}
.sv-hd h2{margin:0;font-size:clamp(16px,2.4vw,22px);line-height:1.2;color:var(--txt)}
.sv-ha{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto}
.sv-hd button{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:6px 12px;color:var(--txt);cursor:pointer;display:flex;align-items:center;gap:6px;font-weight:600}
.sv-hd button:disabled{opacity:.7;cursor:default}
.sv-spin{animation:svs 1s linear infinite}@keyframes svs{to{transform:rotate(360deg)}}
.sv-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.sv-f label{font-size:12px;font-weight:600;display:flex;flex-direction:column;gap:4px;min-width:0}
.sv-f select{height:38px;width:100%;min-width:0;border:1px solid var(--bd);border-radius:8px;padding:0 8px;background:var(--card);color:var(--txt)}
.sv-cols{display:grid;grid-template-columns:1fr;gap:var(--g)}
@media(min-width:1000px){.sv-cols{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:stretch}}
.sv-side{display:flex;flex-direction:column;gap:var(--g);min-width:0}
.sv-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--g);flex:1}
.sv-span{grid-column:1/-1}
@media(max-width:520px){.sv-grid2{grid-template-columns:1fr}}
.sv-c{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);min-width:0;display:flex;flex-direction:column}
.sv-c h4{margin:0 0 10px;text-align:center;color:var(--gv);font-size:14px}
.sv-e{border-left:6px solid var(--gv);background:linear-gradient(90deg,var(--e1),var(--e2)),var(--card)}
.sv-e p{margin:0;text-align:center;font-size:14px;line-height:1.6}
.sv-big{font-size:clamp(18px,2.2vw,28px);font-weight:800;color:var(--gv);text-align:center;line-height:1.1}
.sv-sub{font-size:12px;font-weight:700;text-align:center;margin-top:6px}
.sv-val{flex:1;display:flex;flex-direction:column;justify-content:center}
.sv-lg{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:6px;align-items:center;flex-wrap:wrap}
.sv-lg i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.sv-map{min-height:480px}
.sv-mapbox{flex:1;min-height:420px;width:100%;border-radius:8px;z-index:0;background:var(--map-bg)}
.sv-mh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.sv-mh h4{margin:0;color:var(--gv);font-size:14px}
.sv-mh select{height:32px;border:1px solid var(--bd);border-radius:6px;background:var(--card);color:var(--txt);padding:0 6px}
.sv-leg-adm{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:12px;color:var(--txt2);margin-top:6px}
.sv-leg-adm i{display:inline-block;width:14px;height:0;border-top:3px solid;margin-right:6px;vertical-align:middle}
.sv-warn{margin:6px 0 0;font-size:12px;color:var(--bad);text-align:center}
.sv-tb{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px}
.sv-tb h4{margin:0}
.sv-tb input{padding:8px 10px;width:min(100%,220px);border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--txt)}
.sv-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;background:var(--gb);color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600}
.sv-t{overflow-x:auto}
.sv-t table{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}
.sv-t th{background:var(--gb);color:#fff;padding:10px;border-right:1px solid rgba(255,255,255,.3)}
.sv-t td{padding:10px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:center;color:var(--txt)}
.sv-t td.l{text-align:left}
.sv-pg{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px}
.sv-pg div{display:flex;gap:3px;flex-wrap:wrap;align-items:center}
.sv-pg button{min-width:32px;height:32px;border:1px solid var(--bd);background:var(--card);color:var(--txt);border-radius:6px;cursor:pointer;font-weight:600}
.sv-pg button.on{background:var(--gb);color:#fff;border-color:var(--gb)}
.sv-pg button:disabled{opacity:.4;cursor:default}
.sv-pg select{height:32px;border:1px solid var(--bd);border-radius:6px;background:var(--card);color:var(--txt);padding:0 6px}
.sv-msg{padding:40px 16px;text-align:center}
@media(max-width:520px){.sv-pg{justify-content:center}}
@media(min-width:2200px){.sv{font-size:18px}.sv-c h4{font-size:18px}.sv-t table{font-size:16px}}
@media(prefers-reduced-motion:reduce){.sv *{transition:none!important;animation:none!important}}
.leaflet-tooltip.sv-tip{font-size:12px;font-weight:600}
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

export default function SuiviDashboard({ config, src = '/data/parcelles.geojson', headerExtra }: { config: DashboardConfig; src?: string; headerExtra?: React.ReactNode }) {
  const { titleKey, enonceKey, themes, cible, extras = [] } = config;
  const ctx: any = useLanguage() || {};
  const raw = ctx.language ?? ctx.lang ?? ctx.locale;
  const lang: Lang = typeof raw === 'string' && raw in IDX ? (raw as Lang) : 'fr';
  const t = T[lang];
  LOC = LOCALES[lang];
  const tv = (s: string) => (V[s] ? V[s][IDX[lang]] : s);
  const tp = (s: string) => s.replace(/^(.*?) \((.*)\)$/, (_: string, c: string, sub: string) => `${tv(c)} (${tv(sub)})`);
  const narrow = useNarrow();
  const [geo, setGeo] = useState<Geo | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [base, setBase] = useState<Base>('topo');
  const [regions, setRegions] = useState<Adm[]>([]);
  const [districts, setDistricts] = useState<Adm[]>([]);
  const [communes, setCommunes] = useState<Adm[]>([]);
  const [admErreurs, setAdmErreurs] = useState<string[]>([]);

  const load = () => {
    setErr(false);
    setBusy(true);
    fetch(src, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setGeo)
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [src]);

  // Limites administratives : chargées une fois ; un message s'affiche si une source échoue
  useEffect(() => {
    const erreurs: string[] = [];
    chargerRegions().then(setRegions).catch(() => erreurs.push('régions (OpenStreetMap)'));
    chargerAdm('ADM2').then(setDistricts).catch(() => erreurs.push('districts (geoBoundaries)'));
    chargerAdm('ADM3').then(setCommunes).catch(() => erreurs.push('communes (geoBoundaries)'));
    const t0 = setTimeout(() => setAdmErreurs(erreurs), 0);
    return () => clearTimeout(t0);
  }, []);
  // Met à jour la liste des erreurs une fois les chargements terminés
  useEffect(() => {
    const id = setTimeout(() => {
      const manque: string[] = [];
      if (!regions.length) manque.push('régions (OpenStreetMap)');
      if (!districts.length) manque.push('districts (geoBoundaries)');
      if (!communes.length) manque.push('communes (geoBoundaries)');
      setAdmErreurs(manque);
    }, 15000);
    return () => clearTimeout(id);
  }, [regions, districts, communes]);

  // « Actualiser » : réinitialise filtres, recherche et pagination, puis recharge les données
  const refresh = () => { setF({}); setQ(''); setPage(1); setPer(10); load(); };

  const feats = useMemo(() => (geo ? geo.features.filter((x) => themes.includes(x.properties.theme)) : []), [geo, themes]);
  const match = (p: Parcelle, skip?: FilterKey) => FILTERS.every((k) => k === skip || !f[k] || String(p[k]) === f[k]);
  const filtered = useMemo(() => feats.filter((x) => match(x.properties)), [feats, f]); // eslint-disable-line
  const rows = useMemo(() => filtered.map((x) => x.properties), [filtered]);
  // Options issues des parcelles, en cascade : chaque filtre tient compte des autres filtres
  const opts = (k: FilterKey) => trier(feats.filter((x) => match(x.properties, k)).map((x) => String(x.properties[k])));

  /* Géométries administratives de la sélection, cherchées à l'intérieur de leur parent */
  const adm = useMemo(() => {
    const rK = f.region ? cle(f.region) : '';
    const dK = f.district ? cle(f.district) : '';
    const cK = f.commune ? cle(f.commune) : '';
    const reg = rK ? regions.find((x) => cle(nomAdm(x)) === rK) : undefined;
    const candD = dK ? districts.filter((x) => cle(nomAdm(x)) === dK) : [];
    const dis = candD.length ? candD.find((x) => reg && estDans(x, reg)) ?? candD[0] : undefined;
    const nomCommune = COMMUNE_GEO[`${rK}|${dK}|${cK}`] ?? f.commune ?? '';
    const candC = cK && dis ? communes.filter((x) => cle(nomAdm(x)) === cle(nomCommune)) : [];
    const com = candC.length ? candC.find((x) => estDans(x, dis!)) ?? candC[0] : undefined;
    return { reg, dis, com };
  }, [f.region, f.district, f.commune, regions, districts, communes]);

  /* Listes en cascade :
     - District : districts de la région choisie (référence), plus ceux de la base
     - Commune : communes du district choisi (référence), plus celles de la base */
  const optsRegion = useMemo(() => {
    const ref = new Set(REGIONS_REF.map(cle));
    return [...REGIONS_REF, ...opts('region').filter((n) => !ref.has(cle(n)))]
      .sort((a, b) => a.localeCompare(b, 'fr'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feats, f]);

  const optsDistrict = useMemo(() => {
    let ref: string[] = [];
    if (adm.reg) ref = districts.filter((d) => estDans(d, adm.reg!)).map(nomAdm);
    else if (!f.region) ref = districts.map(nomAdm);
    return trier([...ref, ...opts('district')]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adm.reg, districts, feats, f]);

  const optsCommune = useMemo(() => {
    let ref: string[] = [];
    if (adm.dis) {
      const b = centre(adm.dis);
      ref = communes
        .filter((c) => {
          const cc = centre(c);
          return cc && b && Math.abs(cc[0] - b[0]) < 1.5 && Math.abs(cc[1] - b[1]) < 1.5 && estDans(c, adm.dis!);
        })
        .map(nomAdm);
    }
    return trier([...ref, ...opts('commune')]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adm.dis, communes, feats, f]);

  /* Cadrage : commune, sinon district, sinon région ; sinon Madagascar */
  const cadre = useMemo(() => {
    const cibleAdm = adm.com ?? adm.dis ?? adm.reg;
    return cibleAdm ? L.geoJSON(cibleAdm as any).getBounds() : null;
  }, [adm]);

  /* Barres par région : uniquement les régions présentes dans la base */
  const regionsData = useMemo(() => group(rows, 'region'), [rows]);

  // Changer un filtre réinitialise les filtres qui en dépendent
  const choisirFiltre = (k: FilterKey, v: string) => {
    setF((prev) => {
      const n = { ...prev, [k]: v };
      if (k === 'region') { n.district = ''; n.commune = ''; }
      if (k === 'district') { n.commune = ''; }
      return n;
    });
    setPage(1);
  };

  const vTot = sum(rows.filter((r) => r.statut === 'Validé'));
  const dTot = sum(rows);
  const taux = cible ? (vTot / cible) * 100 : 0;

  const ql = q.trim().toLowerCase();
  const table = ql ? rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(ql)) : rows;
  const pages = Math.max(1, Math.ceil(table.length / per));
  const cur = Math.min(page, pages);
  const slice = table.slice((cur - 1) * per, cur * per);
  const win = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);

  const exportCsv = () => {
    const c = t.table.cols;
    const head = [c[0], c[1], c[2], t.f.region, t.f.commune, c[3], c[4], c[5], c[6]];
    const keys: (keyof Parcelle)[] = ['id', 'utilisateur', 'pratique', 'region', 'commune', 'debut', 'fin', 'superficie_ha', 'statut'];
    const cell = (r: Parcelle, k: keyof Parcelle) => (k === 'pratique' ? tp(r[k]) : k === 'statut' ? tv(r[k]) : r[k]);
    const csv = ([head, ...table.map((r) => keys.map((k) => cell(r, k)))] as (string | number | boolean)[][])
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'parcelles.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const mapKey = `${filtered.length}-${Math.round(dTot)}`;
  const title = t.title[titleKey];
  const showTitle = !/vue\s+d.ensemble/i.test(title);

  /* Carte d'information simple (CEP, pare-feux) depuis la configuration */
  const carteExtra = (key: 'cep' | 'feu') => {
    const x = extras.find((e) => e.key === key);
    if (!x) return null;
    const Ic = ICONS[x.icon] || Users;
    return (
      <div className="sv-c" key={x.key}>
        <h4>{t.extra[x.key]}</h4>
        <div className="sv-val">
          <div className="sv-big"><Ic size={20} style={{ verticalAlign: -3, marginRight: 6 }} />{fr(sum(rows.filter((r) => r[x.flag])))} ha</div>
        </div>
      </div>
    );
  };

  const listeFiltre = (k: FilterKey): string[] =>
    k === 'region' ? optsRegion : k === 'district' ? optsDistrict : k === 'commune' ? optsCommune : opts(k);

  return (
    <div className="sv">
      <style>{CSS}</style>
      <header className="sv-hd">
        {showTitle ? <h2>{title}</h2> : <span />}
        <div className="sv-ha">
          {headerExtra}
          <button onClick={refresh} disabled={busy} aria-label={t.refresh}>
            <RefreshCw className={busy ? 'sv-spin' : ''} /><span>{t.refresh}</span>
          </button>
        </div>
      </header>

      <main className="sv-w">
        {err && <div className="sv-c sv-msg">{t.err(src)}</div>}
        {!geo && !err && <div className="sv-c sv-msg">{t.loading}</div>}

        {geo && (<>
          <section className="sv-f">
            {FILTERS.map((k) => (
              <label key={k}>{t.f[k]}
                <select value={f[k] || ''} onChange={(e) => choisirFiltre(k, e.target.value)}>
                  <option value="">{t.all}</option>
                  {listeFiltre(k).map((o) => <option key={o} value={o}>{k === 'statut' ? tv(o) : o}</option>)}
                </select>
              </label>
            ))}
          </section>

          <section className="sv-cols">
            {/* Partie gauche : énoncé et cartes d'information */}
            <div className="sv-side">
              <section className="sv-c sv-e">
                <h4>{t.enonceTitle}</h4>
                <p>{t.enonce[enonceKey](fr(cible))}</p>
              </section>

              <div className="sv-grid2">
                {/* Ligne 1 : pare-feux | CEP */}
                {carteExtra('feu')}
                {carteExtra('cep')}

                {/* Ligne 2 : superficie validée | répartition par type de pratique */}
                <div className="sv-c">
                  <h4>{t.k.valide}</h4>
                  <div className="sv-val">
                    <div className="sv-big">{fr(vTot)} ha</div>
                    <div className="sv-sub">{t.k.on(fr(cible))}</div>
                    <Gauge pct={taux} />
                  </div>
                </div>
                <Donut title={t.donut.pratique_cat} data={group(rows, 'pratique_cat').map((d) => ({ ...d, name: tv(d.name) }))} />

                {/* Ligne 3 : répartition par région (régions de la base), pleine largeur */}
                <div className="sv-c sv-span">
                  <h4>{t.c.region}</h4>
                  <ResponsiveContainer width="100%" height={Math.max(220, regionsData.length * 36 + 30)}>
                    <BarChart data={regionsData} layout="vertical" margin={{ left: 0, right: 48 }}>
                      <XAxis type="number" tick={{ fontSize: 11, ...TICK }} tickFormatter={(v) => fr(v)} />
                      <YAxis dataKey="name" type="category" width={narrow ? 84 : 120} tick={{ fontSize: 11, fontWeight: 700, ...TICK }} />
                      <Tooltip {...TIP} formatter={(v: any) => `${fr(v)} ha`} />
                      <Bar dataKey="value" fill="var(--gv)" barSize={20} radius={[0, 2, 2, 0]}>
                        <LabelList dataKey="value" position="right" formatter={(v: any) => fr(v)} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--txt2)' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Partie droite : carte de localisation centrée sur Madagascar */}
            <div className="sv-c sv-map">
              <div className="sv-mh">
                <h4>{t.c.map}</h4>
                <select value={base} onChange={(e) => setBase(e.target.value as Base)} aria-label="Fond de carte">
                  {(Object.keys(BASEMAPS) as Base[]).map((b) => (
                    <option key={b} value={b}>{BASEMAPS[b].label}</option>
                  ))}
                </select>
              </div>
              <MapContainer center={MADAGASCAR} zoom={5} scrollWheelZoom={!narrow} className="sv-mapbox">
                <TileLayer key={base} attribution={BASEMAPS[base].attribution} url={BASEMAPS[base].url} />

                {/* Contours de toutes les régions, en léger */}
                {regions.length > 0 && (
                  <GeoJSON
                    key="toutes-regions"
                    data={{ type: 'FeatureCollection', features: regions } as any}
                    style={() => ({ color: COULEUR_REGION, weight: 1, opacity: 0.6, fillOpacity: 0 })}
                    onEachFeature={(x: any, l: any) => l.bindTooltip(nomAdm(x), { sticky: true, className: 'sv-tip' })}
                  />
                )}

                <GeoJSON
                  key={`${mapKey}-${lang}`}
                  data={{ type: 'FeatureCollection', features: filtered } as any}
                  style={(x: any) => ({ color: STATUT[x.properties.statut], weight: 5, fillOpacity: 0.6 })}
                  onEachFeature={(x: any, l: any) => {
                    const p = x.properties;
                    l.bindPopup(`<b>${esc(p.id)}</b><br>${esc(tp(p.pratique))}<br>${esc(p.commune)}, ${esc(p.region)}<br>${fr(p.superficie_ha, 2)} ha · ${esc(tv(p.statut))}`);
                  }}
                />

                {/* Limites de la sélection : région, puis district, puis commune (par-dessus) */}
                {adm.reg && (
                  <GeoJSON
                    key={`reg-${f.region}`}
                    data={adm.reg as any}
                    style={() => ({ color: COULEUR_REGION, weight: 3, fillOpacity: 0, dashArray: adm.dis ? '6 4' : undefined })}
                    onEachFeature={(x: any, l: any) => l.bindTooltip(`${t.f.region} : ${nomAdm(x)}`, { sticky: true, className: 'sv-tip' })}
                  />
                )}
                {adm.dis && (
                  <GeoJSON
                    key={`dis-${f.district}`}
                    data={adm.dis as any}
                    style={() => ({ color: COULEUR_DISTRICT, weight: 2.5, fillColor: COULEUR_DISTRICT, fillOpacity: adm.com ? 0 : 0.12 })}
                    onEachFeature={(x: any, l: any) => l.bindTooltip(`${t.f.district} : ${nomAdm(x)}`, { sticky: true, className: 'sv-tip' })}
                  />
                )}
                {adm.com && (
                  <GeoJSON
                    key={`com-${f.commune}`}
                    data={adm.com as any}
                    style={() => ({ color: COULEUR_COMMUNE, weight: 3, fillColor: '#14b8a6', fillOpacity: 0.25 })}
                    onEachFeature={(x: any, l: any) => l.bindTooltip(`${t.f.commune} : ${nomAdm(x)}`, { sticky: true, className: 'sv-tip' })}
                  />
                )}

                <MapController bounds={cadre} />
                <ScaleBar />
              </MapContainer>
              <div className="sv-lg" style={{ justifyContent: 'center', gap: 14 }}>
                {Object.entries(STATUT_UI).map(([s, c]) => <span key={s}><i style={{ background: c }} />{tv(s)}</span>)}
              </div>
              <div className="sv-leg-adm">
                <span><i style={{ borderColor: COULEUR_REGION }} />{t.f.region}</span>
                <span><i style={{ borderColor: COULEUR_DISTRICT }} />{t.f.district}</span>
                <span><i style={{ borderColor: COULEUR_COMMUNE }} />{t.f.commune}</span>
              </div>
              {admErreurs.length > 0 && (
                <p className="sv-warn">Limites non chargées : {admErreurs.join(', ')}. Le zoom et les contours ne peuvent pas s'afficher.</p>
              )}
            </div>
          </section>

          {/* Bas de page : détails des parcelles */}
          <section className="sv-c">
            <div className="sv-tb">
              <h4>{t.table.title(fr(table.length))}</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--mut)' }} />
                  <input style={{ paddingLeft: 32 }} placeholder={t.table.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                </span>
                <button className="sv-btn" onClick={exportCsv}><Download size={16} />{t.table.export}</button>
              </div>
            </div>
            <div className="sv-t">
              <table>
                <thead><tr>{t.table.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td><td>{r.utilisateur}</td><td className="l">{tp(r.pratique)}</td>
                      <td>{dateFmt(r.debut)}</td><td>{dateFmt(r.fin)}</td>
                      <td style={{ fontWeight: 600, color: GV }}>{fr(r.superficie_ha, 2)}</td>
                      <td style={{ color: STATUT_UI[r.statut], fontWeight: 600 }}>{tv(r.statut)}</td>
                    </tr>
                  ))}
                  {!slice.length && <tr><td colSpan={7}>{t.table.none}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="sv-pg">
              <span style={{ fontWeight: 700, color: 'var(--mut)' }}>
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
}
