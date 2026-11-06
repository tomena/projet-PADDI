import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, Calendar, RotateCcw, MapPin, Mountain, Building2, Users, Landmark, Coins, Leaf,
  PieChart as PieIcon, Download, Upload, FileJson, RefreshCw, TrendingUp, TrendingDown, X,
  ArrowUpDown, ChevronLeft, ChevronRight, Info, CheckCircle2, AlertTriangle, SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  LabelList, Cell, ComposedChart, Line, ReferenceArea,
} from 'recharts';

/* =====================================================================
   CONFIGURATION (à adapter)
   ===================================================================== */
const DATA = {
  budgets: '/data/budgets_communaux.geojson', // ← base GeoJSON (modèle fourni : budgets_communaux.geojson)
  regions: '/data/madagascar_24_region.geojson', // champ « nom_reg »
  districts: '/data/District_Paddi_2024.geojson', // champs REGION, DISTRICT, Aires_Prot
  communes: '/data/Commune_Paddi_2024.geojson', // champs REGION_2, DISTRICT_2, COMMUNE, Aires_Prot, fid
};
const PROP = {
  region: 'nom_reg', // couche régions
  district: 'DISTRICT', districtRegion: 'REGION', // couche districts (District_Paddi_2024)
  commune: 'COMMUNE', communeDistrict: 'DISTRICT_2', communeRegion: 'REGION_2', // couche communes (Commune_Paddi_2024)
  communeCode: '', // optionnel : champ unique de la couche communes = « Code_Commune » de la base (le « fid » actuel n'est PAS unique) ; '' = jointure par Région|District|Commune
};
const NONE = '__hors_ap__'; // valeur du filtre « Hors aire protégée »
const REFRESH_MS = 0; // actualisation automatique du fichier (en millisecondes). 0 = désactivée, ex. 300000 = toutes les 5 min

// Objectifs de suivi
const OBJ_SE = 5; // % du budget total consacré aux services écosystémiques (SE)
const OBJ_FJ = 25; // % du budget SE destiné aux femmes et aux jeunes
const SOURCE = 'Données communales';

const MADAGASCAR: L.LatLngBoundsExpression = [[-26, 42.3], [-11.5, 50.9]];
const FONDS: Record<string, { url: string; attr: string }> = {
  topo: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri' },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri' },
};

// Les deux indicateurs de suivi (pilotent la carte et le classement)
type IndicId = 'se' | 'fj';
const INDIC: Record<IndicId, any> = {
  se: {
    label: 'Budget SE', short: `SE ≥ ${OBJ_SE} %`, long: 'Budget SE (% du budget total)', obj: OBJ_SE, unit: 'du budget total',
    scale: [[5, '#15803d'], [2.5, '#84cc16'], [1, '#f59e0b'], [0, '#dc2626']] as [number, string][],
    val: (a: any) => a.pSe, ok: (a: any) => a.okSe,
  },
  fj: {
    label: 'Femmes et jeunes', short: `F/J ≥ ${OBJ_FJ} %`, long: 'Femmes et jeunes (% du budget SE)', obj: OBJ_FJ, unit: 'du budget SE',
    scale: [[25, '#15803d'], [15, '#84cc16'], [5, '#f59e0b'], [0, '#dc2626']] as [number, string][],
    val: (a: any) => a.pFj, ok: (a: any) => a.okFj,
  },
};

/* =====================================================================
   OUTILS
   ===================================================================== */
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
const fmtN = (v: number) => Math.round(v).toLocaleString('fr-FR');
const fmtP = (v: number, d = 1) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const fmtAr = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md Ar`
    : v >= 1e6 ? `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M Ar`
    : `${fmtN(v)} Ar`;
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort((x, y) => x.localeCompare(y, 'fr'));
const colorFor = (v: number, scale: [number, string][]) => (scale.find(([m]) => v >= m) || scale[scale.length - 1])[1];

function download(name: string, content: string, mime = 'text/csv;charset=utf-8', bom = true) {
  const url = URL.createObjectURL(new Blob([(bom ? '\ufeff' : '') + content], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
const csvLine = (cells: (string | number)[]) => cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';');

/* =====================================================================
   BASE DE DONNÉES GEOJSON
   ---------------------------------------------------------------------
   Une « Feature » = une commune. La géométrie (Polygon / MultiPolygon) est
   facultative : si elle est absente (null), la commune est cherchée dans la
   couche communes (par code ou par nom).

   Propriétés d'une commune :
     Region, District, Commune, Aire_Protegee, Fokontany, Code_Commune (facultatif)
     budgets : [ { Annee, Budget_Total, Budget_SE, Budget_SE_Femmes_Jeunes, Date_MAJ }, ... ]

   Format « plat » également accepté : une Feature par commune ET par année,
   avec Annee, Budget_Total, Budget_SE, Budget_SE_Femmes_Jeunes, Date_MAJ
   directement dans les propriétés.
   Obligatoires : Commune, Annee, Budget_Total, Budget_SE. Le reste est facultatif.
   ===================================================================== */
type Row = { annee: number; region: string; district: string; commune: string; ap: string; fokontany: string; code: string; total: number; se: number; fj: number; maj: string };

const ALIASES: Record<string, string[]> = {
  annee: ['annee', 'year'], region: ['region'], district: ['district'], commune: ['commune'],
  ap: ['aire protegee', 'ap'], fokontany: ['fokontany'], code: ['code commune', 'code', 'pcode'],
  total: ['budget total', 'total', 'budget'], se: ['budget se', 'se'],
  fj: ['budget se femmes jeunes', 'budget se fj', 'se femmes jeunes', 'fj'], maj: ['date maj', 'maj', 'mise a jour'],
};

const TEMPLATE = JSON.stringify({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {
      Region: 'Boeny', District: 'Soalala', Commune: 'Nom de la commune', Aire_Protegee: 'Ankarafantsika', Fokontany: '', Code_Commune: '',
      budgets: [
        { Annee: 2024, Budget_Total: 850000000, Budget_SE: 40000000, Budget_SE_Femmes_Jeunes: 12000000, Date_MAJ: '2024-12-31' },
        { Annee: 2025, Budget_Total: 870000000, Budget_SE: 48720000, Budget_SE_Femmes_Jeunes: 18270000, Date_MAJ: '2025-12-31' },
      ],
    },
    geometry: null, // ← remplacez par le Polygon / MultiPolygon de la commune (ou laissez null)
  }],
}, null, 2);

const toNum = (v: any) => Number(String(v ?? '').replace(/[\s\u00a0]/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')) || 0;

// Lecteur de propriétés insensible à la casse, aux accents et aux « _ »
const reader = (obj: any) => {
  const nk: Record<string, any> = {};
  Object.keys(obj || {}).forEach((k) => { nk[norm(k)] = obj[k]; });
  return (k: string) => {
    const a = ALIASES[k].find((x) => nk[x] !== undefined && nk[x] !== null);
    return a ? String(nk[a]).trim() : '';
  };
};

const rowKey = (r: { code?: string; region: string; district: string; commune: string }) =>
  r.code ? `c:${norm(r.code)}` : `${norm(r.region)}|${norm(r.district)}|${norm(r.commune)}`;

function rowsFromGeo(json: any): { rows: Row[]; geoms: Map<string, any> } {
  const feats = json && Array.isArray(json.features) ? json.features : null;
  if (!feats) throw new Error('Fichier GeoJSON invalide : une « FeatureCollection » est attendue.');
  const rows: Row[] = [];
  const geoms = new Map<string, any>();
  feats.forEach((f: any) => {
    const p = f?.properties || {};
    const get = reader(p);
    const commune = get('commune');
    if (!commune) return;
    const head = { region: get('region') || '—', district: get('district') || '—', commune, ap: get('ap'), fokontany: get('fokontany'), code: get('code') };
    const budgetsKey = Object.keys(p).find((k) => norm(k) === 'budgets');
    const items: any[] = budgetsKey && Array.isArray(p[budgetsKey]) ? p[budgetsKey] : [p];
    items.forEach((it) => {
      const g = reader(it);
      const annee = Math.round(toNum(g('annee')));
      if (annee > 1990) rows.push({ ...head, annee, total: toNum(g('total')), se: toNum(g('se')), fj: toNum(g('fj')), maj: g('maj') });
    });
    if (f.geometry) geoms.set(rowKey(head), f.geometry);
  });
  if (!rows.length) throw new Error('Aucune ligne exploitable : vérifiez les propriétés Commune, Annee, Budget_Total et Budget_SE.');
  return { rows, geoms };
}

// Données de démonstration (affichées tant que le fichier n'est pas en place)
function demoRows(): Row[] {
  const base = [
    ['Atsinanana', 'Toamasina II', 'Commune A', 'Marolambo'], ['Atsinanana', 'Toamasina II', 'Commune B', 'Marolambo'],
    ['Betsiboka', 'Maevatanana', 'Commune C', 'Ankarafantsika'], ['Boeny', 'Soalala', 'Commune D', 'Ankarafantsika'],
    ['Boeny', 'Soalala', 'Commune E', 'Ankarafantsika'], ['Itasy', 'Miarinarivo', 'Commune F', ''],
    ['Melaky', 'Maintirano', 'Commune G', ''], ['Sava', 'Sambava', 'Commune H', ''],
    ['Diana', 'Antsiranana II', 'Commune I', "Montagne d'Ambre"], ['Diana', 'Antsiranana II', 'Commune J', 'Ankarana'],
    ['Diana', 'Ambilobe', 'Commune K', 'Analamerana'], ['Vakinankaratra', 'Antsirabe II', 'Commune L', ''],
    ['Atsimo Andrefana', 'Toliara I', 'Commune M', ''], ['Anosy', 'Amboasary Atsimo', 'Commune N', 'Andohahela'],
    ['Atsimo Atsinanana', 'Befotaka', 'Commune O', 'Befotaka-Midongy'], ['Analamanga', 'Antananarivo Atsimondrano', 'Commune P', ''],
  ];
  let s = 42;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const out: Row[] = [];
  [2022, 2023, 2024, 2025].forEach((y) => base.forEach(([region, district, commune, ap]) => {
    const total = Math.round((3e8 + rnd() * 1.1e9) / 1e4) * 1e4;
    const se = Math.round((total * (1 + rnd() * 10 + (y - 2022) * 0.4)) / 100 / 1e3) * 1e3;
    const fj = Math.round((se * (0.12 + rnd() * 0.35)) / 1e3) * 1e3;
    out.push({ annee: y, region, district, commune, ap, fokontany: '', code: '', total, se, fj, maj: `${y}-12-31` });
  }));
  return out;
}

/* ---- Agrégats : une ligne par commune ---- */
const aggOf = (total: number, se: number, fj: number) => {
  const pSe = total > 0 ? (se / total) * 100 : 0;
  const pFj = se > 0 ? (fj / se) * 100 : 0;
  return { total, se, fj, pSe, pFj, okSe: pSe >= OBJ_SE, okFj: pFj >= OBJ_FJ };
};
type CAgg = ReturnType<typeof aggOf> & { key: string; region: string; district: string; commune: string; ap: string; code: string };

function byCommune(rows: Row[]): CAgg[] {
  const m = new Map<string, any>();
  rows.forEach((r) => {
    const k = rowKey(r);
    const e = m.get(k) || { region: r.region, district: r.district, commune: r.commune, code: r.code, ap: '', total: 0, se: 0, fj: 0 };
    e.total += r.total; e.se += r.se; e.fj += r.fj;
    if (!e.ap && r.ap) e.ap = r.ap;
    m.set(k, e);
  });
  return Array.from(m.entries()).map(([key, e]) => ({ key, ...e, ...aggOf(e.total, e.se, e.fj) }));
}
const overall = (list: CAgg[]) => {
  const a = aggOf(list.reduce((s, c) => s + c.total, 0), list.reduce((s, c) => s + c.se, 0), list.reduce((s, c) => s + c.fj, 0));
  return { ...a, n: list.length, nSe: list.filter((c) => c.okSe).length, nFj: list.filter((c) => c.okFj).length };
};

/* =====================================================================
   DONNÉES GÉOGRAPHIQUES
   ===================================================================== */
type Zone = { nom: string; feature: any };
function useGeo(url: string) {
  const [features, setFeatures] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let on = true;
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))))
      .then((j) => on && setFeatures(j.features || []))
      .catch(() => console.warn('Données introuvables :', url))
      .finally(() => on && setDone(true));
    return () => { on = false; };
  }, [url]);
  return [features, done] as const;
}
const toZones = (feats: any[], key: string): Zone[] => feats.filter((f) => f?.geometry).map((f) => ({ nom: String(f.properties?.[key] ?? ''), feature: f }));

/* =====================================================================
   STYLES RESPONSIVES
   ===================================================================== */
const CSS = `
.bc{--g:#166534;--g2:#15803d;--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--card:#fff;
  container-type:inline-size;container-name:bc;width:100%;min-width:0;box-sizing:border-box;
  padding:clamp(8px,1.6vw,16px);background:#eef3f8;color:var(--ink);min-height:100vh;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;display:flex;flex-direction:column;gap:10px}
.bc *{box-sizing:border-box}
.bc button,.bc select,.bc input{font-family:inherit}
.bc button:focus-visible,.bc select:focus-visible,.bc input:focus-visible,.bc a:focus-visible{outline:2px solid #2563eb;outline-offset:2px}

/* En-tête */
.bc-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 16px;padding:12px 16px;
  background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.bc-brand{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 300px}
.bc-logo{flex:none;position:relative;width:48px;height:48px;border-radius:13px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(145deg,#14532d,#22a05a)}
.bc-logo .lf{position:absolute;right:-6px;bottom:-6px;background:#fff;border-radius:50%;padding:3px;box-shadow:0 0 0 1px var(--line)}
.bc-h1{margin:0;font-size:clamp(16px,2.2vw,22px);font-weight:800;letter-spacing:.01em;line-height:1.2;color:#0f172a}
.bc-sub{margin:3px 0 0;font-size:12.5px;font-weight:600;color:var(--g2);line-height:1.35}
.bc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.bc-year{display:flex;align-items:center;gap:8px;padding:0 12px;height:38px;background:#f8fafc;border:1px solid #d1d5db;border-radius:10px;font-weight:700}
.bc-year select{border:0;background:transparent;font-weight:700;font-size:13px;cursor:pointer;outline-offset:4px}
.bc-btn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:10px;border:1px solid #d1d5db;
  background:#fff;color:var(--ink);font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.bc-btn:hover{background:#f1f5f9}
.bc-btn:disabled{opacity:.55;cursor:not-allowed}
.bc-btn.pri{background:var(--g2);border-color:var(--g2);color:#fff}
.bc-btn.pri:hover{background:var(--g)}
.bc-hidden{display:none}
.bc-spin{animation:bcspin .9s linear infinite}
@keyframes bcspin{to{transform:rotate(360deg)}}

/* Bandeaux d'information */
.bc-note{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:12px;font-size:12.5px;line-height:1.45}
.bc-note svg{flex:none;margin-top:1px}
.bc-note.warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
.bc-note.err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.bc-note.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d}
.bc-note code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:4px;font-size:11.5px}
.bc-insight{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d}
.bc-insight svg{flex:none;margin-top:2px}
.bc-insight strong{display:block;font-size:13.5px;line-height:1.4}
.bc-insight span{display:block;font-size:12px;color:#166534;margin-top:3px;line-height:1.45}

/* Filtres */
.bc-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:8px;align-items:end}
.bc-f{display:flex;flex-direction:column;gap:4px;min-width:0}
.bc-f label{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#334155}
.bc-f select,.bc-search{width:100%;height:38px;padding:0 10px;border-radius:10px;border:1px solid #d1d5db;background:#fff;font-size:12.5px;font-weight:600;color:var(--ink)}
.bc-f select{cursor:pointer}
.bc-f select:disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.bc-f.ind{min-width:min(100%,240px)}
.bc-f.ind .bc-seg{width:100%;height:38px}
.bc-f.ind .bc-seg button{flex:1;padding:0 8px;white-space:nowrap}
.bc-searchbox{grid-column:1/-1;position:relative}
.bc-searchbox svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8}
.bc-search{padding-left:33px;font-weight:500}
.bc-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.bc-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 10px;border-radius:999px;background:#dcfce7;color:#14532d;font-size:12px;font-weight:700}
.bc-chip button{display:grid;place-items:center;width:18px;height:18px;border:0;border-radius:50%;background:rgba(20,83,45,.15);color:inherit;cursor:pointer;padding:0}
.bc-chip button:hover{background:rgba(20,83,45,.3)}

/* Indicateurs clés */
.bc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:6px}
.bc-kpi{display:flex;gap:8px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-top:3px solid var(--c);
  border-radius:12px;padding:8px 10px;min-width:0;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.bc-ico{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--c)}
.bc-kb{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.bc-kt{font-size:9.5px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:var(--c);line-height:1.2}
.bc-kv{font-size:clamp(15px,1.3vw,19px);font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.bc-bar{height:9px;border-radius:999px;background:#f1f5f9;overflow:hidden;margin-top:3px}
.bc-bar i{display:block;height:100%;border-radius:999px;background:color-mix(in srgb,var(--c) 22%,transparent);border:2px solid var(--c);box-sizing:border-box;transition:width .5s}
.bc-ks{font-size:10px;color:var(--mut);line-height:1.3}
.bc-delta{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;margin-top:1px}

/* Segments (boutons groupés) */
.bc-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#fff}
.bc-seg button{padding:7px 12px;border:0;background:transparent;font-size:12px;font-weight:700;color:#475569;cursor:pointer}
.bc-seg button+button{border-left:1px solid #cbd5e1}
.bc-seg button.on{background:var(--g2);color:#fff}

/* Cartes & grilles */
.bc-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px;min-width:0;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.bc-ct{margin:0;font-size:12px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:#111827}
.bc-cs{margin:2px 0 6px;font-size:11px;color:var(--mut)}
.bc-card.compact{padding:8px}
.bc-card.compact .bc-cs{display:none}
.bc-card.compact .bc-head2{margin-bottom:4px}
.bc-lg{display:flex;flex-wrap:wrap;gap:3px 10px;font-size:10px;color:#475569;font-weight:600}
.bc-lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px;box-sizing:border-box}
.bc-lg b{display:inline-block;width:10px;height:3px;border-radius:2px;margin-right:4px;vertical-align:3px}
.bc-head2{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:6px 12px;margin-bottom:6px}
.bc-main{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.bc-left{display:flex;flex-direction:column;gap:10px;min-width:0;order:2}
.bc-left>.bc-card{min-height:250px}
.bc-mapcard{order:1;min-height:340px}
.bc-scroll{flex:1;min-height:0;overflow:auto;scrollbar-width:thin}
.bc-chart{flex:1 1 170px;min-height:150px;position:relative}
.bc-mapwrap{position:relative;flex:1;min-height:260px;border-radius:10px;overflow:hidden;border:1px solid var(--line);isolation:isolate}
.bc-mapwrap .leaflet-container{position:absolute;inset:0;background:#e5e7eb;font-family:inherit}
.bc-legend{position:absolute;left:8px;bottom:8px;z-index:1000;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.95);
  box-shadow:0 1px 5px rgba(0,0,0,.25);font-size:11px;max-width:70%}
.bc-legend strong{display:block;margin-bottom:3px}
.bc-legend div{display:flex;align-items:center;gap:6px;margin-top:2px;color:#334155}
.bc-legend i{width:14px;height:10px;border-radius:2px;display:inline-block;border:1px solid rgba(0,0,0,.15)}
.bc-fond{position:absolute;top:8px;right:8px;z-index:1000;box-shadow:0 1px 5px rgba(0,0,0,.25)}
.bc-mapnote{margin:6px 0 0;font-size:11px;color:#92400e}
.bc .leaflet-tooltip{font-size:12px;font-weight:600;line-height:1.4}
/* plus de cadre/contour au clic sur la carte ou sur une zone */
.bc .leaflet-container:focus,.bc .leaflet-container .leaflet-interactive:focus,.bc .leaflet-container path:focus{outline:none}
.bc .leaflet-container a{outline:none}
/* étiquettes des communes */
.bc .bc-lbl-wrap{background:transparent;border:0}
.bc .bc-lbl{position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;text-align:center;
  font-weight:700;line-height:1.15;color:#0f172a;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 4px #fff}
.bc .bc-lbl small{display:block;font-size:.82em;font-weight:700;color:#334155}
.bc .bc-lbl.sel{color:#052e16;font-weight:800}
.bc-tip{background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.bc-tip b{display:block;margin-bottom:3px}
.bc-tip div{display:flex;justify-content:space-between;gap:14px}
.bc-empty{padding:26px 10px;text-align:center;color:var(--mut);font-size:12.5px}

/* Tableau */
.bc-tbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;margin-bottom:8px}
.bc-tw{overflow:auto;max-height:440px;border:1px solid var(--line);border-radius:10px;scrollbar-width:thin}
.bc-t{width:100%;border-collapse:separate;border-spacing:0;min-width:1000px;font-size:12px}
.bc-t th{position:sticky;top:0;z-index:2;background:var(--g);color:#fff;padding:0;text-align:center;border-right:1px solid rgba(255,255,255,.18);font-weight:700}
.bc-t th button{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;padding:9px 8px;border:0;background:transparent;color:inherit;font-size:11.5px;font-weight:700;cursor:pointer;line-height:1.25}
.bc-t th button:hover{background:rgba(255,255,255,.12)}
.bc-t td{padding:9px 10px;border-bottom:1px solid var(--line);border-right:1px solid #f1f5f9;text-align:center;font-variant-numeric:tabular-nums;background:#fff}
.bc-t tbody tr:hover td{background:#f0fdf4}
.bc-t tbody tr{cursor:pointer}
.bc-t th:first-child,.bc-t td:first-child{position:sticky;left:0;z-index:1;text-align:left;font-weight:700;box-shadow:1px 0 0 var(--line)}
.bc-t th:first-child{z-index:3}
.bc-t td.n{text-align:right}
.bc-t tfoot td{position:sticky;bottom:0;background:#ecfdf5;font-weight:800;border-top:2px solid #86efac}
.bc-badge{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:700;font-size:11.5px;white-space:nowrap}
.bc-badge.ok{background:#d1fae5;color:#065f46}
.bc-badge.ko{background:#fee2e2;color:#b91c1c}
.bc-pg{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px;color:var(--mut)}
.bc-pg .bc-seg button{padding:6px 10px}
.bc-pg select{height:32px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-size:12px;padding:0 6px}
.bc-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 12px;color:#4b5563;font-size:12px;padding:2px 2px 24px}

/* Adaptation à la largeur disponible */
@container bc (min-width:760px){
  .bc-searchbox{grid-column:span 2}
}
/* Grand écran : gauche = classement/comparaison (haut) + évolution (bas) ; droite = carte pleine hauteur */
@container bc (min-width:960px){
  .bc-main{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);height:clamp(430px,56vh,580px)}
  .bc-left{order:1}
  .bc-left>.bc-card{flex:1 1 0;min-height:0}
  .bc-mapcard{order:2;min-height:0}
}
@container bc (max-width:560px){
  .bc-head{padding:10px 12px}
  .bc-actions{width:100%}
  .bc-actions .bc-btn span.t{display:none}
  .bc-mapwrap{min-height:240px}
  .bc-legend{max-width:85%}
  .bc-kpis{grid-template-columns:repeat(auto-fit,minmax(138px,1fr))}
}
@container bc (min-width:1800px){
  .bc-t{font-size:13px}
  .bc-kt,.bc-ks,.bc-cs{font-size:12px}
}
@media print{.bc-actions,.bc-filters,.bc-pg{display:none!important}.bc{background:#fff}}
@media (prefers-reduced-motion:reduce){.bc *{transition:none!important;animation:none!important}}
`;

/* =====================================================================
   PETITS COMPOSANTS
   ===================================================================== */
const Delta = ({ v, unit, label }: { v: number | null; unit: '%' | 'pts' | ''; label: string }) => {
  if (v == null || !Number.isFinite(v)) return null;
  const flat = Math.abs(v) < 0.05;
  const up = v > 0;
  const color = flat ? '#64748b' : up ? '#15803d' : '#b91c1c';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="bc-delta" style={{ color }} title={`Variation par rapport à ${label}`}>
      {!flat && <Icon size={13} strokeWidth={2.6} />}
      {flat ? '=' : `${up ? '+' : ''}${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${unit ? ' ' + unit : ''}`} vs {label}
    </span>
  );
};

const KPI = ({ title, value, sub, color, icon: Icon, progress, delta }: any) => (
  <div className="bc-kpi" style={{ '--c': color } as any}>
    <div className="bc-ico"><Icon size={20} color="#fff" /></div>
    <div className="bc-kb">
      <div className="bc-kt">{title}</div>
      <div className="bc-kv">{value}</div>
      {progress != null && <div className="bc-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} /></div>}
      <div className="bc-ks">{sub}</div>
      {delta}
    </div>
  </div>
);

const RankTip = ({ active, payload, unit }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bc-tip">
      <b>{d.name}</b>
      <div><span>Valeur</span><strong>{fmtP(d.value)} {unit}</strong></div>
      <div><span>Budget total</span><strong>{fmtAr(d.total)}</strong></div>
      <div><span>Budget SE</span><strong>{fmtAr(d.se)}</strong></div>
    </div>
  );
};

// Barres de progression : fond translucide + bordure marquée, couleur = classe de la carte, taille adaptée à l'espace disponible
const RankBars = ({ data, obj, unit, scale, avail = 0, width = 0 }: any) => {
  const rows = data.length;
  const top = 16, bottom = 4;
  const rowH = avail ? Math.max(19, Math.min(30, (avail - top - bottom) / rows)) : 26;
  const h = Math.round(rows * rowH + top + bottom);
  const fs = rowH < 23 ? 10 : 11;
  const bar = Math.max(9, Math.round(rowH * 0.56));
  const yW = width && width < 380 ? 88 : width && width < 520 ? 106 : 124;
  const cut = Math.max(8, Math.floor(yW / (fs * 0.56)));
  const max = Math.max(obj * 1.35, ...data.map((d: any) => d.value));
  const colorOf = (d: any) => (scale ? colorFor(d.value, scale) : d.ok ? '#15803d' : '#d97706');
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top, right: 40, left: 0, bottom }} barCategoryGap="12%">
          <XAxis type="number" hide domain={[0, Math.ceil(max)]} />
          <YAxis type="category" dataKey="name" width={yW} tick={{ fontSize: fs, fill: '#334155' }} axisLine={false} tickLine={false}
                 tickFormatter={(v) => (String(v).length > cut ? `${String(v).slice(0, cut - 1)}…` : v)} interval={0} />
          <Tooltip content={<RankTip unit={unit} />} cursor={{ fill: 'rgba(22,101,52,.05)' }} />
          <ReferenceLine x={obj} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1.5}
                         label={{ value: `Objectif ${obj} %`, position: 'top', fill: '#dc2626', fontSize: 9.5, fontWeight: 700 }} />
          <Bar dataKey="value" radius={[0, 7, 7, 0]} barSize={bar} background={{ fill: '#f1f5f9', radius: [0, 7, 7, 0] } as any}>
            {data.map((d: any, i: number) => { const c = colorOf(d); return <Cell key={i} fill={c} fillOpacity={0.2} stroke={c} strokeWidth={2} />; })}
            <LabelList dataKey="value" position="right" formatter={(v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`} style={{ fontSize: fs - 0.5, fontWeight: 700, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Mesure la taille d'un élément (pour adapter le contenu à la taille des cartes)
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [sz, setSz] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSz((p) => (Math.abs(p.w - r.width) < 1 && Math.abs(p.h - r.height) < 1 ? p : { w: Math.round(r.width), h: Math.round(r.height) }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, sz] as const;
}

// Info-bulle de l'évolution annuelle
const EvoTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bc-tip">
      <b>{label}</b>
      <div><span>Budget SE</span><strong>{d.se.toLocaleString('fr-FR')} M Ar</strong></div>
      <div><span>SE / budget total</span><strong>{fmtP(d.pSe)} · {fmtN(d.aSe)} % de l’objectif</strong></div>
      <div><span>F/J / budget SE</span><strong>{fmtP(d.pFj)} · {fmtN(d.aFj)} % de l’objectif</strong></div>
    </div>
  );
};

// Étiquettes des communes : nom (et valeur si zoom élevé), affichées seulement si elles tiennent dans la commune
const anchorCache = new WeakMap<object, { lat: number; lng: number; w: number; h: number }>();
function anchorOf(geom: any) {
  if (!geom) return null;
  const hit = anchorCache.get(geom);
  if (hit) return hit;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let best: any = null;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const a = (x1 - x0) * (y1 - y0);
    if (!best || a > best.a) best = { a, x0, y0, x1, y1 };
  }
  if (!best) return null;
  const r = { lat: (best.y0 + best.y1) / 2, lng: (best.x0 + best.x1) / 2, w: best.x1 - best.x0, h: best.y1 - best.y0 };
  anchorCache.set(geom, r);
  return r;
}

function CommuneLabels({ items, selected, valFn, valKey }: any) {
  const map = useMap();
  const vf = useRef(valFn);
  vf.current = valFn;
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const on = () => setZoom(map.getZoom());
    map.on('zoomend', on);
    return () => { map.off('zoomend', on); };
  }, [map]);
  const anchors = useMemo(() => items.map((z: any) => ({ z, a: anchorOf(z.feature.geometry) })).filter((x: any) => x.a), [items]);
  useEffect(() => {
    const g = L.layerGroup();
    const k = (256 * Math.pow(2, zoom)) / 360; // pixels par degré de longitude
    const fs = Math.max(8, Math.min(14, 7 + (zoom - 6) * 1.1)); // taille du texte selon le zoom
    const few = anchors.length <= 3;
    anchors.forEach(({ z, a }: any) => {
      const name: string = z.agg.commune;
      const isSel = !!selected && name === selected;
      const wpx = a.w * k;
      const hpx = (a.h * k) / Math.cos((a.lat * Math.PI) / 180);
      const fits = wpx >= name.length * fs * 0.58 * 0.9 && hpx >= fs * 1.4;
      if (!(isSel || few || (zoom >= 7 && fits))) return;
      const withVal = zoom >= 11 && wpx >= 90 && hpx >= fs * 2.8;
      const html = `<div class="bc-lbl${isSel ? ' sel' : ''}" style="font-size:${fs.toFixed(1)}px">${esc(name)}${withVal ? `<small>${esc(vf.current(z.agg))}</small>` : ''}</div>`;
      L.marker([a.lat, a.lng], { icon: L.divIcon({ className: 'bc-lbl-wrap', html, iconSize: [0, 0] }), interactive: false, keyboard: false }).addTo(g);
    });
    g.addTo(map);
    return () => { map.removeLayer(g); };
  }, [anchors, zoom, selected, valKey, map]);
  return null;
}

/* =====================================================================
   CARTE : régions + districts + communes colorées
   ===================================================================== */
function GeoLayer({ zones, style, cle, tip, onClick }: any) {
  const map = useMap();
  const st = useRef(style), tp = useRef(tip), ck = useRef(onClick);
  st.current = style; tp.current = tip; ck.current = onClick;
  useEffect(() => {
    if (!zones.length) return;
    const g = L.featureGroup();
    zones.forEach((z: any) => {
      const l = L.geoJSON(z.feature, { style: () => st.current(z) });
      const html = tp.current ? tp.current(z) : esc(z.nom);
      if (html) l.bindTooltip(html, { sticky: true });
      l.on('click', () => ck.current?.(z));
      l.addTo(g);
    });
    g.addTo(map);
    return () => { map.removeLayer(g); };
  }, [zones, cle, map]);
  return null;
}

function FitTo({ zones, k }: any) {
  const map = useMap();
  const ref = useRef(zones);
  ref.current = zones;
  useEffect(() => {
    const z = ref.current;
    if (!z.length) { map.fitBounds(MADAGASCAR, { padding: [10, 10] }); return; }
    try {
      const b = L.geoJSON({ type: 'FeatureCollection', features: z.map((x: any) => x.feature) } as any).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [24, 24], maxZoom: 13 });
    } catch { /* géométrie invalide */ }
  }, [k, map]);
  return null;
}

function Resize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer().parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/* =====================================================================
   PAGE
   ===================================================================== */
type SortKey = 'commune' | 'district' | 'region' | 'ap' | 'total' | 'se' | 'pSe' | 'fj' | 'pFj';
type DS = { rows: Row[]; geoms: Map<string, any>; mode: 'loading' | 'file' | 'demo' | 'import'; label: string; at: Date | null };

export default function BudgetCommunaux() {
  /* ---------- Base de données (GeoJSON) ---------- */
  const [ds, setDs] = useState<DS>({ rows: [], geoms: new Map(), mode: 'loading', label: '', at: null });
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef(ds.mode);
  modeRef.current = ds.mode;

  // Charge (ou recharge) le fichier. Le paramètre ?v= et cache:'no-store' évitent d'afficher une ancienne version en cache.
  const load = useCallback((silent = false) => {
    setBusy(true);
    return fetch(`${DATA.budgets}?v=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('introuvable'))))
      .then((j) => {
        const { rows, geoms } = rowsFromGeo(j);
        setDs({ rows, geoms, mode: 'file', label: DATA.budgets, at: new Date() });
        setLoadErr('');
      })
      .catch((e: any) => {
        const absent = e?.message === 'introuvable' || e instanceof TypeError || e instanceof SyntaxError;
        setDs((s) => (s.mode === 'file' || s.mode === 'import' ? s : { rows: demoRows(), geoms: new Map(), mode: 'demo', label: '', at: null }));
        if (!silent || !absent) setLoadErr(absent ? (modeRef.current === 'file' ? 'Actualisation impossible : fichier introuvable ou illisible.' : '') : e.message);
      })
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    load(true);
    if (REFRESH_MS > 0) {
      const t = setInterval(() => { if (modeRef.current !== 'import') load(true); }, REFRESH_MS);
      return () => clearInterval(t);
    }
  }, [load]);

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    f.text().then((txt) => {
      try {
        const { rows, geoms } = rowsFromGeo(JSON.parse(txt));
        setDs({ rows, geoms, mode: 'import', label: f.name, at: new Date() });
        setLoadErr('');
      } catch (err: any) { setLoadErr(err instanceof SyntaxError ? 'Fichier JSON illisible.' : err.message || 'Fichier illisible.'); }
    });
  };
  const rows = ds.rows;

  /* ---------- Géographie (couches de référence) ---------- */
  const [regionsF] = useGeo(DATA.regions);
  const [districtsF] = useGeo(DATA.districts);
  const [communesF, communesDone] = useGeo(DATA.communes);
  const regionsZ = useMemo(() => toZones(regionsF, PROP.region), [regionsF]);
  const districtsZ = useMemo(() => toZones(districtsF, PROP.district), [districtsF]);
  const communesZ = useMemo(() => toZones(communesF, PROP.commune), [communesF]);

  /* ---------- Filtres ---------- */
  const [year, setYear] = useState(0);
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [commune, setCommune] = useState('');
  const [ap, setAp] = useState('');
  const [q, setQ] = useState('');
  const [indic, setIndic] = useState<IndicId>('se');
  const [rankMode, setRankMode] = useState<'best' | 'worst'>('worst');
  const [rankN, setRankN] = useState(10);
  const [rankView, setRankView] = useState<'communes' | 'regions'>('communes');
  const [fond, setFond] = useState('topo');

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.annee))).sort((a, b) => b - a), [rows]);
  const yr = years.includes(year) ? year : years[0] ?? new Date().getFullYear();
  const qn = norm(q);

  const apOk = (r: Row) => !ap || (ap === NONE ? !r.ap : r.ap === ap);
  const hasNoAp = useMemo(() => rows.some((r) => !r.ap), [rows]);
  const optAps = useMemo(() => uniq(rows.map((r) => r.ap)), [rows]);
  const optRegions = useMemo(() => uniq(rows.filter(apOk).map((r) => r.region)), [rows, ap]);
  const optDistricts = useMemo(() => uniq(rows.filter((r) => apOk(r) && (!region || r.region === region)).map((r) => r.district)), [rows, ap, region]);
  const optCommunes = useMemo(() => uniq(rows.filter((r) => apOk(r) && (!region || r.region === region) && (!district || r.district === district)).map((r) => r.commune)), [rows, ap, region, district]);

  // Cascade : choisir un niveau vide les niveaux inférieurs
  const onAp = (v: string) => { setAp(v); setRegion(''); setDistrict(''); setCommune(''); };
  const onRegion = (v: string) => { setRegion(v); setDistrict(''); setCommune(''); };
  const onDistrict = (v: string) => { setDistrict(v); setCommune(''); };
  const reset = () => { setAp(''); setRegion(''); setDistrict(''); setCommune(''); setQ(''); setYear(0); };
  const pickCommune = (c: { region: string; district: string; commune: string }) => { setRegion(c.region); setDistrict(c.district); setCommune(c.commune); };

  const base = useMemo(
    () => rows.filter((r) =>
      (!region || r.region === region) && (!district || r.district === district) && (!commune || r.commune === commune) &&
      apOk(r) && (!qn || norm(`${r.region} ${r.district} ${r.commune} ${r.ap} ${r.fokontany}`).includes(qn))),
    [rows, region, district, commune, ap, qn]
  );
  const communesAgg = useMemo(() => byCommune(base.filter((r) => r.annee === yr)), [base, yr]);
  const prevAgg = useMemo(() => byCommune(base.filter((r) => r.annee === yr - 1)), [base, yr]);
  const tot = useMemo(() => overall(communesAgg), [communesAgg]);
  const prev = useMemo(() => overall(prevAgg), [prevAgg]);
  const hasPrev = prevAgg.length > 0;
  const pctVar = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

  /* ---------- Séries pour les graphiques ---------- */
  const I = INDIC[indic];
  const ranking = useMemo(() => {
    const dupl = new Map<string, number>();
    communesAgg.forEach((c) => dupl.set(norm(c.commune), (dupl.get(norm(c.commune)) || 0) + 1));
    const sorted = [...communesAgg].sort((a, b) => (rankMode === 'best' ? I.val(b) - I.val(a) : I.val(a) - I.val(b)));
    return sorted.slice(0, rankN).map((c) => ({
      name: (dupl.get(norm(c.commune)) || 0) > 1 ? `${c.commune} (${c.district})` : c.commune,
      value: I.val(c), ok: I.ok(c), total: c.total, se: c.se,
    }));
  }, [communesAgg, rankMode, rankN, indic]);

  const regionRank = useMemo(() => {
    const m = new Map<string, CAgg[]>();
    communesAgg.forEach((c) => m.set(c.region, [...(m.get(c.region) || []), c]));
    return Array.from(m.entries()).map(([name, list]) => {
      const o = overall(list);
      return { name, value: I.val(o), ok: I.ok(o), total: o.total, se: o.se };
    }).sort((a, b) => b.value - a.value);
  }, [communesAgg, indic]);

  const trend = useMemo(
    () => [...years].reverse().map((y) => {
      const o = overall(byCommune(base.filter((r) => r.annee === y)));
      return {
        annee: String(y), se: Math.round(o.se / 1e6 * 10) / 10, pSe: o.pSe, pFj: o.pFj,
        aSe: Math.round((o.pSe / OBJ_SE) * 1000) / 10, aFj: Math.round((o.pFj / OBJ_FJ) * 1000) / 10, // 100 % = objectif atteint
      };
    }).filter((d) => d.se > 0 || d.pSe > 0),
    [base, years]
  );
  const evoMax = Math.max(120, Math.ceil(Math.max(...trend.map((d) => Math.max(d.aSe, d.aFj)), 0) / 20) * 20);

  // Tailles mesurées des 3 cartes : le contenu s'adapte à l'espace disponible
  const [rankRef, rkSz] = useSize<HTMLElement>();
  const [rankScrollRef, rsSz] = useSize<HTMLDivElement>();
  const [evoRef, evSz] = useSize<HTMLElement>();
  const [mapCardRef, mpSz] = useSize<HTMLElement>();

  /* ---------- Carte : communes de la sélection associées à leur géométrie ----------
     Ordre de recherche : 1) géométrie contenue dans la base GeoJSON,
     2) couche communes par code, 3) par district + nom, 4) par nom unique. */
  const geoIndex = useMemo(() => {
    const exact = new Map<string, Zone>();
    const byName = new Map<string, Zone[]>();
    const byCode = new Map<string, Zone>();
    communesZ.forEach((z) => {
      const pr = z.feature.properties || {};
      exact.set(`${norm(pr[PROP.communeRegion])}|${norm(pr[PROP.communeDistrict])}|${norm(z.nom)}`, z);
      const k = norm(z.nom);
      byName.set(k, [...(byName.get(k) || []), z]);
      if (PROP.communeCode) {
        const code = z.feature.properties?.[PROP.communeCode];
        if (code != null && code !== '') byCode.set(norm(code), z);
      }
    });
    return { exact, byName, byCode };
  }, [communesZ]);

  const mapCommunes = useMemo(() => {
    const out: any[] = [];
    communesAgg.forEach((c) => {
      const g = ds.geoms.get(c.key);
      let z: Zone | undefined = g ? { nom: c.commune, feature: { type: 'Feature', geometry: g, properties: {} } } : undefined;
      if (!z && PROP.communeCode && c.code) { const zc = geoIndex.byCode.get(norm(c.code)); if (zc && norm(zc.nom) === norm(c.commune)) z = zc; } // le code n'est retenu que si le nom concorde
      if (!z) z = geoIndex.exact.get(`${norm(c.region)}|${norm(c.district)}|${norm(c.commune)}`);
      if (!z) { const l = geoIndex.byName.get(norm(c.commune)); if (l?.length === 1) z = l[0]; }
      if (z) out.push({ ...z, agg: c });
    });
    return out;
  }, [communesAgg, geoIndex, ds.geoms]);
  const missingGeo = communesDone && (communesZ.length > 0 || ds.geoms.size > 0) ? communesAgg.length - mapCommunes.length : 0;

  const districtKeys = useMemo(() => new Set(communesAgg.map((c) => `${norm(c.region)}|${norm(c.district)}`)), [communesAgg]);
  const dKey = (z: Zone) => `${norm(z.feature.properties?.[PROP.districtRegion])}|${norm(z.nom)}`;
  const mapDistricts = useMemo(() => districtsZ.filter((z) => districtKeys.has(dKey(z))), [districtsZ, districtKeys]);
  const isSelDistrict = (z: Zone) => !!district && norm(z.nom) === norm(district) && (!region || norm(z.feature.properties?.[PROP.districtRegion]) === norm(region));
  const contextCommunes = useMemo(
    () => (district ? communesZ.filter((z) => norm(z.feature.properties?.[PROP.communeDistrict]) === norm(district) && (!region || norm(z.feature.properties?.[PROP.communeRegion]) === norm(region))) : []),
    [communesZ, district, region]
  );
  const regionZone = useMemo(() => (region ? regionsZ.find((z) => norm(z.nom) === norm(region)) || null : null), [regionsZ, region]);
  const districtZone = useMemo(() => (district ? districtsZ.find((z) => isSelDistrict(z)) || null : null), [districtsZ, district, region]);
  const focusZones = mapCommunes.length ? mapCommunes : districtZone ? [districtZone] : regionZone ? [regionZone] : [];
  const focusKey = [region, district, commune, ap, mapCommunes.length].join('|');

  // Clic sur un district de la carte : sélectionne le district (et sa région)
  const pickDistrictFromMap = (z: Zone) => {
    const regName = z.feature.properties?.[PROP.districtRegion];
    const row = rows.find((r) => norm(r.district) === norm(z.nom) && (!regName || norm(r.region) === norm(regName))) || rows.find((r) => norm(r.district) === norm(z.nom));
    if (row) { setRegion(row.region); setDistrict(row.district); setCommune(''); }
  };

  const tipCommune = (z: any) => {
    const a = z.agg as CAgg;
    return `<b>${esc(a.commune)}</b><br/>${esc(a.district)} – ${esc(a.region)}<br/>Budget total : ${fmtAr(a.total)}<br/>Budget SE : ${fmtAr(a.se)} (${fmtP(a.pSe)})<br/>Femmes et jeunes : ${fmtP(a.pFj)} du budget SE`;
  };

  /* ---------- Tableau ---------- */
  const [status, setStatus] = useState<'all' | 'ok' | 'ko'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'total', dir: -1 });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const tableRows = useMemo(() => {
    const f = communesAgg.filter((c) => status === 'all' || (status === 'ok') === I.ok(c));
    const g = (c: CAgg) => (sort.key === 'commune' ? c.commune : sort.key === 'district' ? c.district : sort.key === 'region' ? c.region : sort.key === 'ap' ? c.ap : (c as any)[sort.key]);
    return [...f].sort((a, b) => {
      const x = g(a), y = g(b);
      return (typeof x === 'string' ? x.localeCompare(y, 'fr') : x - y) * sort.dir;
    });
  }, [communesAgg, status, sort, indic]);
  const pages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const pageC = Math.min(page, pages - 1);
  const pageRows = tableRows.slice(pageC * pageSize, pageC * pageSize + pageSize);
  useEffect(() => { setPage(0); }, [communesAgg, status, sort, pageSize]);
  const tTot = useMemo(() => overall(tableRows), [tableRows]);

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'commune' || key === 'district' || key === 'region' || key === 'ap' ? 1 : -1 }));
  const th = (key: SortKey, label: string, w?: number) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} style={w ? { minWidth: w } : undefined}>
      <button onClick={() => sortBy(key)}>{label}<ArrowUpDown size={11} style={{ opacity: sort.key === key ? 1 : 0.45 }} /></button>
    </th>
  );

  const exportCSV = () => {
    const lines = [csvLine(['Annee', 'Region', 'District', 'Commune', 'Aire protegee', 'Budget total (Ar)', 'Budget SE (Ar)', '% Budget SE', 'Budget SE femmes et jeunes (Ar)', '% F/J du budget SE', `Objectif ${OBJ_SE} %`, `Objectif F/J >= ${OBJ_FJ} %`])];
    tableRows.forEach((c) => lines.push(csvLine([yr, c.region, c.district, c.commune, c.ap, Math.round(c.total), Math.round(c.se), c.pSe.toFixed(2).replace('.', ','), Math.round(c.fj), c.pFj.toFixed(2).replace('.', ','), c.okSe ? 'Atteint' : 'Non atteint', c.okFj ? 'Atteint' : 'Non atteint'])));
    download(`budgets_communaux_${yr}.csv`, lines.join('\n'));
  };

  /* ---------- Message clé ---------- */
  const weak = communesAgg.filter((c) => c.pSe < OBJ_SE / 2).length;
  const shareSe = tot.n ? Math.round((tot.nSe / tot.n) * 100) : 0;
  const prevShare = prev.n ? Math.round((prev.nSe / prev.n) * 100) : null;

  const lastMaj = useMemo(() => rows.map((r) => r.maj).filter(Boolean).sort().pop() || '', [rows]);
  const chips: [string, string, () => void][] = [];
  if (ap) chips.push(['Aire protégée', ap === NONE ? 'Hors aire protégée' : ap, () => onAp('')]);
  if (region) chips.push(['Région', region, () => onRegion('')]);
  if (district) chips.push(['District', district, () => onDistrict('')]);
  if (commune) chips.push(['Commune', commune, () => setCommune('')]);
  if (q) chips.push(['Recherche', q, () => setQ('')]);
  const filtered = chips.length > 0 || year !== 0;

  const progSe = Math.min(100, (tot.pSe / OBJ_SE) * 100);
  const progFj = Math.min(100, (tot.pFj / OBJ_FJ) * 100);
  const dCmp = hasPrev ? String(yr - 1) : '';

  /* =====================================================================
     RENDU
     ===================================================================== */
  return (
    <div className="bc">
      <style>{CSS}</style>

      {/* ============ EN-TÊTE ============ */}
      <header className="bc-head">
        <div className="bc-brand">
          <div className="bc-logo" aria-hidden="true">
            <Landmark size={26} />
            <Leaf className="lf" size={22} color="#16a34a" />
          </div>
          <div>
            <h1 className="bc-h1">SUIVI DES BUDGETS COMMUNAUX</h1>
            <p className="bc-sub">Allocation des budgets pour l’amélioration des services écosystémiques</p>
          </div>
        </div>

        <div className="bc-actions">
          <div className="bc-year">
            <Calendar size={15} />
            <select aria-label="Année" value={yr} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="bc-btn" onClick={() => load(false)} disabled={busy} title="Recharger le fichier GeoJSON depuis le serveur">
            <RefreshCw size={14} className={busy ? 'bc-spin' : ''} /><span className="t">Actualiser</span>
          </button>
          <button className="bc-btn" onClick={() => fileRef.current?.click()} title="Importer un fichier GeoJSON (le temps de la session)">
            <Upload size={14} /><span className="t">Importer</span>
          </button>
          <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="bc-hidden" onChange={onImport} />
          <button className="bc-btn" onClick={() => download('budgets_communaux_modele.geojson', TEMPLATE, 'application/geo+json', false)} title="Télécharger le modèle GeoJSON à remplir">
            <FileJson size={14} /><span className="t">Modèle</span>
          </button>
          <button className="bc-btn pri" onClick={reset} disabled={!filtered && !q}>
            <RotateCcw size={13} /><span className="t">Réinitialiser</span>
          </button>
        </div>
      </header>

      {/* ============ ÉTAT DE LA BASE ============ */}
      {ds.mode === 'demo' && (
        <div className="bc-note warn" role="status">
          <AlertTriangle size={17} />
          <div>
            <strong>Données de démonstration.</strong> Placez votre base GeoJSON dans <code>public{DATA.budgets}</code> (modèle : bouton « Modèle »)
            ou utilisez « Importer ». Les noms de région, district et commune doivent correspondre à ceux des couches cartographiques si la base ne contient pas les géométries.
          </div>
        </div>
      )}
      {ds.mode === 'import' && (
        <div className="bc-note ok" role="status"><CheckCircle2 size={17} /><div>Fichier importé : <strong>{ds.label}</strong> (valable jusqu’à l’actualisation de la page). Cliquez sur « Actualiser » pour revenir au fichier du serveur.</div></div>
      )}
      {loadErr && <div className="bc-note err" role="alert"><AlertTriangle size={17} /><div>{loadErr}</div></div>}

      {/* ============ FILTRES + INDICATEUR (même ligne) ============ */}
      <section className="bc-filters" aria-label="Filtres">
        <div className="bc-f">
          <label htmlFor="bc-ap"><Mountain size={13} color="#1e3a8a" />Aire protégée</label>
          <select id="bc-ap" value={ap} onChange={(e) => onAp(e.target.value)}>
            <option value="">Toutes</option>{optAps.map((v) => <option key={v}>{v}</option>)}
            {hasNoAp && <option value={NONE}>Hors aire protégée</option>}
          </select>
        </div>
        <div className="bc-f">
          <label htmlFor="bc-reg"><MapPin size={13} color="#1e3a8a" />Région</label>
          <select id="bc-reg" value={region} onChange={(e) => onRegion(e.target.value)}>
            <option value="">Toutes</option>{optRegions.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="bc-f">
          <label htmlFor="bc-dis"><Building2 size={13} color="#1e3a8a" />District</label>
          <select id="bc-dis" value={district} onChange={(e) => onDistrict(e.target.value)} disabled={!optDistricts.length}>
            <option value="">Tous</option>{optDistricts.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="bc-f">
          <label htmlFor="bc-com"><Users size={13} color="#1e3a8a" />Commune</label>
          <select id="bc-com" value={commune} onChange={(e) => setCommune(e.target.value)} disabled={!optCommunes.length}>
            <option value="">Toutes</option>{optCommunes.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="bc-f ind">
          <label id="bc-ind-l"><SlidersHorizontal size={13} color="#1e3a8a" />Indicateur (carte et classement)</label>
          <div className="bc-seg" role="group" aria-labelledby="bc-ind-l">
            {(Object.keys(INDIC) as IndicId[]).map((k) => (
              <button key={k} className={indic === k ? 'on' : ''} onClick={() => setIndic(k)} aria-pressed={indic === k} title={INDIC[k].long}>{INDIC[k].short}</button>
            ))}
          </div>
        </div>
        <div className="bc-searchbox">
          <Search size={15} />
          <input className="bc-search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher"
                 placeholder="Rechercher une commune, un fokontany, un district…" />
        </div>
      </section>


      {/* ============ MESSAGE CLÉ ============ */}
      {tot.n > 0 && (
        <div className="bc-insight" role="status">
          <Info size={18} />
          <div>
            <strong>
              {tot.nSe} commune{tot.nSe > 1 ? 's' : ''} sur {tot.n} ({shareSe} %) atteigne{tot.nSe > 1 ? 'nt' : ''} l’objectif de {OBJ_SE} % du budget consacré aux services écosystémiques en {yr}.
            </strong>
            <span>
              {prevShare != null && `Par rapport à ${yr - 1} : ${shareSe - prevShare >= 0 ? '+' : ''}${shareSe - prevShare} point(s) de communes ayant atteint l’objectif. `}
              {weak > 0 ? `${weak} commune${weak > 1 ? 's sont' : ' est'} sous la moitié de l’objectif (< ${fmtP(OBJ_SE / 2)}) et nécessite${weak > 1 ? 'nt' : ''} un accompagnement prioritaire.` : 'Aucune commune sous la moitié de l’objectif.'}
            </span>
          </div>
        </div>
      )}

      {/* ============ INDICATEURS CLÉS ============ */}
      <section className="bc-kpis" aria-label="Indicateurs clés">
        <KPI title="Budget total (sélection)" value={fmtAr(tot.total)} sub={`${tot.n} commune${tot.n > 1 ? 's' : ''} · ${yr}`} color="#2e7d32" icon={Coins}
             delta={hasPrev ? <Delta v={pctVar(tot.total, prev.total)} unit="%" label={dCmp} /> : null} />
        <KPI title="Budget SE total" value={fmtAr(tot.se)} sub="Total alloué aux services écosystémiques" color="#43a047" icon={Leaf}
             delta={hasPrev ? <Delta v={pctVar(tot.se, prev.se)} unit="%" label={dCmp} /> : null} />
        <KPI title="% Budget SE (global)" value={fmtP(tot.pSe, 2)} sub={`Objectif : ${OBJ_SE} % · ${fmtN(progSe)} % de la cible`} color="#1565c0" icon={PieIcon} progress={progSe}
             delta={hasPrev ? <Delta v={tot.pSe - prev.pSe} unit="pts" label={dCmp} /> : null} />
        <KPI title="% Budget SE (femmes et jeunes)" value={fmtP(tot.pFj, 2)} sub={`Objectif : ≥ ${OBJ_FJ} % du budget SE`} color="#7b1fa2" icon={Users} progress={progFj}
             delta={hasPrev ? <Delta v={tot.pFj - prev.pFj} unit="pts" label={dCmp} /> : null} />
        <KPI title={`Communes ≥ ${OBJ_SE} %`} value={`${tot.nSe} / ${tot.n}`} sub={`${tot.n ? fmtP((tot.nSe / tot.n) * 100) : '—'} des communes`} color="#f9a825" icon={Building2}
             progress={tot.n ? (tot.nSe / tot.n) * 100 : 0} delta={hasPrev ? <Delta v={tot.nSe - prev.nSe} unit="" label={dCmp} /> : null} />
        <KPI title={`Communes avec F/J ≥ ${OBJ_FJ} %`} value={`${tot.nFj} / ${tot.n}`} sub={`${tot.n ? fmtP((tot.nFj / tot.n) * 100) : '—'} des communes`} color="#388e3c" icon={CheckCircle2}
             progress={tot.n ? (tot.nFj / tot.n) * 100 : 0} delta={hasPrev ? <Delta v={tot.nFj - prev.nFj} unit="" label={dCmp} /> : null} />
      </section>

      {/* ============ GAUCHE : classement / comparaison (haut) + évolution (bas) · DROITE : carte ============ */}
      <div className="bc-main">
        <div className="bc-left">
          <section ref={rankRef} className={`bc-card${rkSz.h && rkSz.h < 300 ? ' compact' : ''}`}>
            <div className="bc-head2">
              <div>
                <h2 className="bc-ct">{rankView === 'communes' ? 'Classement des communes' : 'Comparaison par région'}</h2>
                <p className="bc-cs" style={{ margin: 0 }}>{I.long} · {yr}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <div className="bc-seg" role="group" aria-label="Vue">
                  <button className={rankView === 'communes' ? 'on' : ''} onClick={() => setRankView('communes')}>Communes</button>
                  <button className={rankView === 'regions' ? 'on' : ''} onClick={() => setRankView('regions')}>Régions</button>
                </div>
                {rankView === 'communes' && (
                  <>
                    <div className="bc-seg" role="group" aria-label="Ordre">
                      <button className={rankMode === 'worst' ? 'on' : ''} onClick={() => setRankMode('worst')}>À renforcer</button>
                      <button className={rankMode === 'best' ? 'on' : ''} onClick={() => setRankMode('best')}>Meilleures</button>
                    </div>
                    <div className="bc-seg" role="group" aria-label="Nombre de communes">
                      {[10, 20].map((n) => <button key={n} className={rankN === n ? 'on' : ''} onClick={() => setRankN(n)}>Top {n}</button>)}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="bc-scroll" ref={rankScrollRef}>
              {rankView === 'communes'
                ? (ranking.length ? <RankBars data={ranking} obj={I.obj} unit={I.unit} scale={I.scale} avail={rsSz.h} width={rsSz.w} /> : <div className="bc-empty">Aucune donnée pour cette sélection.</div>)
                : (regionRank.length > 1 ? <RankBars data={regionRank} obj={I.obj} unit={I.unit} scale={I.scale} avail={rsSz.h} width={rsSz.w} /> : <div className="bc-empty">Une seule région dans la sélection : la comparaison apparaît lorsque plusieurs régions sont concernées.</div>)}
            </div>
          </section>

          <section ref={evoRef} className={`bc-card${evSz.h && evSz.h < 300 ? ' compact' : ''}`}>
            <div className="bc-head2" style={{ marginBottom: 2 }}>
              <div>
                <h2 className="bc-ct">Évolution annuelle · progression vers l’objectif</h2>
                <p className="bc-cs" style={{ margin: 0 }}>100 % = objectif atteint (SE : {OBJ_SE} % du budget · F/J : {OBJ_FJ} % du budget SE)</p>
              </div>
              <div className="bc-lg" aria-hidden="true">
                <span><i style={{ background: 'rgba(21,128,61,.18)', border: '2px solid #15803d' }} />Budget SE (M Ar)</span>
                <span><b style={{ background: '#15803d' }} />Budget SE</span>
                <span><b style={{ background: '#7b1fa2' }} />Femmes et jeunes</span>
              </div>
            </div>
            {trend.length > 1 ? (
              <div className="bc-chart">
                <div style={{ position: 'absolute', inset: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trend} margin={{ top: 8, right: 2, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="annee" tick={{ fontSize: 10.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="a" domain={[0, evoMax]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}%`} />
                      <YAxis yAxisId="b" orientation="right" hide={evSz.w < 400} domain={[0, (m: number) => Math.ceil(m * 2.2)]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={34} tickFormatter={(v) => `${v}M`} />
                      <Tooltip content={<EvoTip />} cursor={{ fill: 'rgba(22,101,52,.05)' }} />
                      <ReferenceArea yAxisId="a" y1={100} y2={evoMax} fill="#16a34a" fillOpacity={0.07} />
                      <ReferenceLine yAxisId="a" y={100} stroke="#15803d" strokeWidth={1.5} strokeDasharray="5 4"
                                     label={{ value: 'Objectif', position: 'insideTopLeft', fill: '#15803d', fontSize: 10, fontWeight: 700 }} />
                      <Bar yAxisId="b" dataKey="se" name="Budget SE (M Ar)" fill="#16a34a" fillOpacity={0.14} stroke="#15803d" strokeWidth={2} radius={[6, 6, 0, 0]} barSize={26} />
                      <Line yAxisId="a" type="monotone" dataKey="aSe" name="SE (% de l’objectif)" stroke="#15803d" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                      <Line yAxisId="a" type="monotone" dataKey="aFj" name="F/J (% de l’objectif)" stroke="#7b1fa2" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : <div className="bc-empty">Au moins deux années de données sont nécessaires pour afficher l’évolution.</div>}
          </section>
        </div>

        <section ref={mapCardRef} className={`bc-card bc-mapcard${mpSz.h && mpSz.h < 380 ? ' compact' : ''}`}>
          <h2 className="bc-ct">Carte interactive – Madagascar</h2>
          <p className="bc-cs">{I.long} · {yr}. Cliquez sur une région, un district ou une commune pour la sélectionner.</p>
          <div className="bc-mapwrap">
            <MapContainer bounds={MADAGASCAR} zoomControl={false} style={{ height: '100%', width: '100%' }} preferCanvas>
              <TileLayer key={fond} url={FONDS[fond].url} attribution={FONDS[fond].attr} />
              <ZoomControl position="bottomright" />
              <Resize />
              <FitTo zones={focusZones} k={focusKey} />
              {regionsZ.length > 0 && (
                <GeoLayer zones={regionsZ} cle={region}
                  style={(z: Zone) => { const sel = region && norm(z.nom) === norm(region); return { color: sel ? '#0f766e' : '#64748b', weight: sel ? 2.5 : 0.8, fillColor: '#0f766e', fillOpacity: sel ? 0.1 : 0.03 }; }}
                  onClick={(z: Zone) => { const m = uniq(rows.map((r) => r.region)).find((r) => norm(r) === norm(z.nom)); if (!m) return; if (!rows.some((r) => apOk(r) && r.region === m)) setAp(''); onRegion(m); }} />
              )}
              {contextCommunes.length > 0 && (
                <GeoLayer zones={contextCommunes} cle={`ctx${district}`} style={() => ({ color: '#94a3b8', weight: 0.8, fillColor: '#cbd5e1', fillOpacity: 0.25 })} />
              )}
              {mapDistricts.length > 0 && (
                <GeoLayer zones={mapDistricts} cle={`d${region}|${district}`} onClick={pickDistrictFromMap}
                  style={(z: Zone) => ({ color: isSelDistrict(z) ? '#dc2626' : '#64748b', weight: isSelDistrict(z) ? 2 : 0.8, fillColor: '#000', fillOpacity: 0 })} />
              )}
              {mapCommunes.length > 0 && (
                <GeoLayer zones={mapCommunes} cle={`c${indic}${yr}${commune}${mapCommunes.length}`} tip={tipCommune}
                  style={(z: any) => ({ color: commune && z.agg.commune === commune ? '#052e16' : '#fff', weight: commune && z.agg.commune === commune ? 3 : 1.2, fillColor: colorFor(I.val(z.agg), I.scale), fillOpacity: 0.78 })}
                  onClick={(z: any) => pickCommune(z.agg)} />
              )}
              <CommuneLabels items={mapCommunes} selected={commune} valKey={`${indic}${yr}`} valFn={(a: CAgg) => fmtP(I.val(a))} />
            </MapContainer>
            <div className="bc-fond bc-seg" role="group" aria-label="Fond de carte">
              <button className={fond === 'topo' ? 'on' : ''} onClick={() => setFond('topo')}>Plan</button>
              <button className={fond === 'sat' ? 'on' : ''} onClick={() => setFond('sat')}>Satellite</button>
            </div>
            <div className="bc-legend">
              <strong>{I.label} ({I.unit})</strong>
              {I.scale.map(([m, c]: [number, string], i: number, a: [number, string][]) => (
                <div key={c}><i style={{ background: c }} />
                  {i === 0 ? `≥ ${m.toLocaleString('fr-FR')} %` : i === a.length - 1 ? `< ${a[i - 1][0].toLocaleString('fr-FR')} %` : `${m.toLocaleString('fr-FR')} – ${a[i - 1][0].toLocaleString('fr-FR')} %`}
                </div>
              ))}
            </div>
          </div>
          {missingGeo > 0 && (
            <p className="bc-mapnote">{missingGeo} commune{missingGeo > 1 ? 's' : ''} de la base n’ont pas été retrouvée{missingGeo > 1 ? 's' : ''} sur la carte (ajoutez la géométrie dans la base, ou vérifiez l’orthographe / le code de la commune).</p>
          )}
        </section>
      </div>

      {/* ============ TABLEAU ============ */}
      <section className="bc-card">
        <div className="bc-tbar">
          <div>
            <h2 className="bc-ct">Tableau détaillé – communes</h2>
            <p className="bc-cs" style={{ margin: 0 }}>{tableRows.length} commune{tableRows.length > 1 ? 's' : ''} · {yr}{lastMaj ? ` · mise à jour : ${lastMaj}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="bc-seg" role="group" aria-label={`Statut ${I.label}`}>
              <button className={status === 'all' ? 'on' : ''} onClick={() => setStatus('all')}>Toutes</button>
              <button className={status === 'ok' ? 'on' : ''} onClick={() => setStatus('ok')}>Atteint</button>
              <button className={status === 'ko' ? 'on' : ''} onClick={() => setStatus('ko')}>Non atteint</button>
            </div>
            <button className="bc-btn" onClick={exportCSV} disabled={!tableRows.length}><Download size={14} /><span className="t">Exporter CSV</span></button>
          </div>
        </div>

        <div className="bc-tw">
          <table className="bc-t">
            <thead>
              <tr>
                {th('commune', 'Commune', 130)}{th('district', 'District', 110)}{th('region', 'Région', 110)}{th('ap', 'Aire protégée', 110)}
                {th('total', 'Budget total (Ar)', 120)}{th('se', 'Budget SE (Ar)', 110)}{th('pSe', '% Budget SE (global)', 90)}
                {th('fj', 'Budget SE femmes et jeunes (Ar)', 130)}{th('pFj', '% Budget SE (femmes et jeunes)', 100)}
                <th style={{ minWidth: 100 }}><button style={{ cursor: 'default' }}>Objectif {OBJ_SE} %</button></th>
                <th style={{ minWidth: 110 }}><button style={{ cursor: 'default' }}>Objectif F/J ≥ {OBJ_FJ} %</button></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.key} onClick={() => pickCommune(c)} title="Cliquer pour voir la commune sur la carte">
                  <td>{c.commune}</td><td>{c.district}</td><td>{c.region}</td><td>{c.ap || '—'}</td>
                  <td className="n">{fmtN(c.total)}</td><td className="n">{fmtN(c.se)}</td><td>{fmtP(c.pSe, 2)}</td>
                  <td className="n">{fmtN(c.fj)}</td><td>{fmtP(c.pFj, 2)}</td>
                  <td><span className={`bc-badge ${c.okSe ? 'ok' : 'ko'}`}>{c.okSe ? 'Atteint' : 'Non atteint'}</span></td>
                  <td><span className={`bc-badge ${c.okFj ? 'ok' : 'ko'}`}>{c.okFj ? 'Atteint' : 'Non atteint'}</span></td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={11} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>Aucune commune ne correspond à ces filtres.</td></tr>}
            </tbody>
            {tableRows.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total</td><td colSpan={3} style={{ textAlign: 'left' }}>{tableRows.length} commune{tableRows.length > 1 ? 's' : ''}</td>
                  <td className="n">{fmtN(tTot.total)}</td><td className="n">{fmtN(tTot.se)}</td><td>{fmtP(tTot.pSe, 2)}</td>
                  <td className="n">{fmtN(tTot.fj)}</td><td>{fmtP(tTot.pFj, 2)}</td>
                  <td>{tTot.nSe} / {tTot.n}</td><td>{tTot.nFj} / {tTot.n}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bc-pg">
          <span>
            {tableRows.length ? `${pageC * pageSize + 1}–${Math.min(tableRows.length, (pageC + 1) * pageSize)} sur ${tableRows.length}` : '0 résultat'} ·{' '}
            <label>lignes par page{' '}
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>{[10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select>
            </label>
          </span>
          <div className="bc-seg" role="group" aria-label="Pagination">
            <button onClick={() => setPage(Math.max(0, pageC - 1))} disabled={pageC === 0} aria-label="Page précédente"><ChevronLeft size={14} /></button>
            <button style={{ cursor: 'default' }}>{pageC + 1} / {pages}</button>
            <button onClick={() => setPage(Math.min(pages - 1, pageC + 1))} disabled={pageC >= pages - 1} aria-label="Page suivante"><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>

      <footer className="bc-foot">
        <span style={{ fontWeight: 600 }}>Source : {SOURCE} {yr}{ds.mode === 'demo' ? ' (données fictives de démonstration)' : ''}</span>
        <span>Objectifs : {OBJ_SE} % du budget en SE · {OBJ_FJ} % du budget SE pour les femmes et les jeunes</span>
      </footer>
    </div>
  );
}
