import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import OodaPanel from './OodaPanel';

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

/* Limites administratives.
   Régions : OpenStreetMap (Overpass) avec geoBoundaries ADM1 en secours. Districts et communes : geoBoundaries. */
type Adm = { type?: string; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type Niv = 'ADM1' | 'ADM2' | 'ADM3';
type Pt = [number, number];

/* Les 24 régions actuelles de Madagascar (Vatovavy-Fitovinany scindée, Ambatosoa créée) */
const REGIONS_REF = [
  'Analamanga', 'Vakinankaratra', 'Itasy', 'Bongolava', 'Haute Matsiatra', "Amoron'i Mania",
  'Vatovavy', 'Fitovinany', 'Ihorombe', 'Atsimo Atsinanana', 'Atsinanana', 'Analanjirofo',
  'Ambatosoa', 'Alaotra Mangoro', 'Boeny', 'Betsiboka', 'Melaky', 'Atsimo Andrefana',
  'Androy', 'Anosy', 'Menabe', 'Diana', 'Sava', 'Sofia',
];

/* Ancienne région (avant la scission), affichée aussi dans la liste */
const REGIONS_EXTRA = ['Vatovavy Fitovinany'];
const COMBINE = 'vatovavyfitovinany';
/* Variantes de noms : Matsiatra Ambony = Haute Matsiatra */
const ALIAS_REG: Record<string, string> = {
  matsiatraambony: 'hautematsiatra',
  uppermatsiatra: 'hautematsiatra',
};

const G = '#1b5e20';
const GV = 'var(--gv)';
const BAD = 'var(--bad)';
const PAL = ['#2e7d32', '#66bb6a', '#D4E157', '#FFB300', '#64B5F6', '#a5d6a7', '#8d6e63'];
const STATUT: Record<string, string> = { 'Validé': G, 'En attente': '#FFB300', 'Rejeté': '#c62828' };
const STATUT_UI: Record<string, string> = { 'Validé': GV, 'En attente': '#FFB300', 'Rejeté': BAD };
const COULEUR_REGION = '#ea580c';
const COULEUR_DISTRICT = '#7c3aed';
const COULEUR_COMMUNE = '#dc2626';
const FILTERS: FilterKey[] = ['annee', 'aire_protegee', 'region', 'district', 'commune', 'paysage', 'mbv', 'statut'];
const NOMS_ADM: FilterKey[] = ['region', 'district', 'commune'];
const ICONS: Record<string, React.ComponentType<any>> = { cep: Users, feu: Flame };
const MADAGASCAR: [number, number] = [-18.9, 47.5];

// Homonymes : clé région|district|commune (normalisées) -> nom de la géométrie à utiliser
const COMMUNE_GEO: Record<string, string> = {
  'boeny|marovoay|marosakoa': 'Marovoay',
};

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

const TIP = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--txt)' },
  itemStyle: { color: 'var(--txt)' },
  labelStyle: { color: 'var(--txt)' },
};
const TICK = { fill: 'var(--txt2)' };

let LOC = 'fr-FR';
const fr = (n: number | string, d = 0) => Number(n || 0).toLocaleString(LOC, { maximumFractionDigits: d });
const sum = (rows: Parcelle[]) => rows.reduce((s, r) => s + r.superficie_ha, 0);
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(LOC, { timeZone: 'UTC' });
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cle = (s: string) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const cleReg = (s: string) => {
  const k = cle(s).replace(/^(region|faritra)/, '');
  return ALIAS_REG[k] ?? k;
};

/* Deux noms de région sont équivalents (alias, ou ancienne région fusionnée) */
const memeRegion = (a: unknown, b: string) => {
  const x = cleReg(String(a));
  const y = cleReg(b);
  if (x === y) return true;
  const part = ['vatovavy', 'fitovinany'];
  return (y === COMBINE && part.includes(x)) || (x === COMBINE && part.includes(y));
};
/* Nom d'affichage canonique (évite les doublons dans la liste) */
const nomRegion = (n: string) =>
  [...REGIONS_REF, ...REGIONS_EXTRA].find((r) => cleReg(r) === cleReg(n)) ?? n;

const trier = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
/* Fusionne des listes de noms sans doublon (comparaison normalisée), la première occurrence gagne */
const unir = (...listes: string[][]) => {
  const m = new Map<string, string>();
  listes.flat().filter(Boolean).forEach((n) => { const k = cle(n); if (!m.has(k)) m.set(k, n); });
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'fr'));
};
const group = (rows: Parcelle[], key: keyof Parcelle) => {
  const m: Record<string, number> = {};
  rows.forEach((r) => { const k = String(r[key]); m[k] = (m[k] || 0) + r.superficie_ha; });
  return Object.entries(m)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
};
/* Les noms administratifs se comparent sans accents ni majuscules ; les autres filtres à l'identique */
const memeValeur = (k: FilterKey, a: unknown, b: string) =>
  k === 'region' ? memeRegion(a, b)
  : NOMS_ADM.includes(k) ? cle(String(a)) === cle(b)
  : String(a) === b;

/* ===================== LIMITES ADMINISTRATIVES ===================== */

const REV = '9469f09';
const GH = 'wmgeolab/geoBoundaries';
const CACHE: Partial<Record<Niv, Adm[]>> = {};
const ENCOURS: Partial<Record<Niv, Promise<Adm[]>>> = {};
let CACHE_REGIONS: Adm[] | null = null;
let ENCOURS_REGIONS: Promise<Adm[]> | null = null;

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

/* geoBoundaries (ADM1, ADM2, ADM3) : plusieurs miroirs, un seul chargement par niveau */
function chargerAdm(niv: Niv): Promise<Adm[]> {
  if (CACHE[niv]) return Promise.resolve(CACHE[niv]!);
  if (ENCOURS[niv]) return ENCOURS[niv]!;
  const f = `releaseData/gbOpen/MDG/${niv}/geoBoundaries-MDG-${niv}_simplified.geojson`;
  const urls = [
    `https://raw.githubusercontent.com/${GH}/${REV}/${f}`,
    `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`,
  ];
  const p = (async () => {
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
  })().finally(() => { delete ENCOURS[niv]; });
  ENCOURS[niv] = p;
  return p;
}

/* ----- Conversion OpenStreetMap -> GeoJSON ----- */

const memePoint = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

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
    properties: {
      shapeName: String(rel.tags?.name ?? ''),
      noms: [rel.tags?.name, rel.tags?.['name:fr'], rel.tags?.['name:mg'], rel.tags?.['name:en']].filter(Boolean),
    },
    geometry: { type: 'MultiPolygon', coordinates: polys },
  };
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const REQUETE_REGIONS =
  '[out:json][timeout:60];' +
  'area["ISO3166-1"="MG"][admin_level=2]->.pays;' +
  'relation(area.pays)["boundary"="administrative"]["admin_level"="4"];' +
  'out geom;';

async function regionsOSM(): Promise<Adm[]> {
  const ctl = new AbortController();
  const minuteur = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(REQUETE_REGIONS),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
    const data = await r.json();
    const out: Adm[] = [];
    (data.elements ?? []).forEach((rel: any) => {
      if (rel.type !== 'relation') return;
      const adm = relationVersAdm(rel);
      if (adm) out.push(adm);
    });
    return out;
  } finally {
    clearTimeout(minuteur);
  }
}

/* Tous les noms connus d'une zone (nom principal + variantes OSM) */
const nomsAdm = (f: Adm): string[] => [nomAdm(f), ...((f.properties.noms as string[]) ?? [])];

function trouverReg(liste: Adm[], nom: string, secours: string[] = []) {
  const cles = [cleReg(nom), ...secours];
  for (const k of cles) {
    const r = liste.find((x) => nomsAdm(x).some((n) => cleReg(n) === k));
    if (r) return { r, secours: k !== cles[0] };
  }
  return null;
}

function fusionner(a: Adm, b: Adm, nom: string): Adm {
  return {
    type: 'Feature',
    properties: { shapeName: nom },
    geometry: { type: 'MultiPolygon', coordinates: [...polygones(a), ...polygones(b)] },
  };
}

/* Régions : on garde les 24 noms de référence + Vatovavy Fitovinany.
   Contour = OpenStreetMap si disponible, sinon geoBoundaries ADM1 (qui peut ne contenir que 22 régions).
   Une région sans contour reste sélectionnable : la carte zoome alors sur ses parcelles. */
function chargerRegions(): Promise<Adm[]> {
  if (CACHE_REGIONS) return Promise.resolve(CACHE_REGIONS);
  if (ENCOURS_REGIONS) return ENCOURS_REGIONS;
  ENCOURS_REGIONS = (async () => {
    const [osm, gb] = await Promise.all([
      regionsOSM().catch(() => [] as Adm[]),
      chargerAdm('ADM1').catch(() => [] as Adm[]),
    ]);
    // nom exact d'abord, puis (Vatovavy / Fitovinany) repli sur la région fusionnée
    const chercher = (nom: string, secours: string[] = []) =>
      trouverReg(osm, nom) ?? trouverReg(gb, nom) ??
      (secours.length ? trouverReg(osm, nom, secours) ?? trouverReg(gb, nom, secours) : null);

    const out: Adm[] = [];
    REGIONS_REF.forEach((nom) => {
      const secours = ['vatovavy', 'fitovinany'].includes(cleReg(nom)) ? [COMBINE] : [];
      const tr = chercher(nom, secours);
      if (tr) out.push({ ...tr.r, properties: { ...tr.r.properties, shapeName: nom, comb: tr.secours } });
    });

    // Vatovavy Fitovinany : contour fusionné s'il existe, sinon union de Vatovavy + Fitovinany
    const nomC = REGIONS_EXTRA[0];
    const c = chercher(nomC);
    if (c) {
      out.push({ ...c.r, properties: { ...c.r.properties, shapeName: nomC, comb: false } });
    } else {
      const v = out.find((x) => nomAdm(x) === 'Vatovavy');
      const fi = out.find((x) => nomAdm(x) === 'Fitovinany');
      if (v && fi) out.push(fusionner(v, fi, nomC));
    }

    if (!out.length) throw new Error('regions');
    CACHE_REGIONS = out;
    return out;
  })().finally(() => { ENCOURS_REGIONS = null; });
  return ENCOURS_REGIONS;
}

/* ===================== CARTE : RECADRAGE, ÉCHELLE ===================== */

function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) { map.flyTo(MADAGASCAR, 5, { duration: 0.8 }); return; }
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [24, 24], maxZoom: 12, duration: 1 });
  }, [bounds]); // eslint-disable-line
  return null;
}

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

/* Jauge : plus haute et plus épaisse, occupe tout l'espace restant de la carte */
function Gauge({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ flex: 1, minHeight: 170 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={[{ v: p }, { v: 100 - p }]} dataKey="v" innerRadius="50%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
            <Cell fill="var(--gv)" /><Cell fill="var(--track)" />
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight="700" fill="var(--gv)">{fr(pct, 1)} %</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ===================== CSS ===================== */

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
.sv-f select:disabled{opacity:.5}
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
.sv-val.top{justify-content:flex-start;gap:2px}
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
.sv-hint{margin:6px 0 0;font-size:12px;color:var(--mut);text-align:center}
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
  const [ver, setVer] = useState(0);
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
  const [regChargees, setRegChargees] = useState(false);

  const signaler = (n: string) => setAdmErreurs((p) => (p.includes(n) ? p : [...p, n]));
  const retirer = (n: string) => setAdmErreurs((p) => p.filter((x) => x !== n));

  const load = () => {
    setErr(false);
    setBusy(true);
    fetch(src, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((g) => { setGeo(g); setVer((v) => v + 1); })
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [src]);

  /* ----- Limites : régions au démarrage, districts à la sélection d'une région, communes à celle d'un district ----- */
  useEffect(() => {
    chargerRegions()
      .then((r) => { setRegions(r); retirer('régions'); })
      .catch(() => signaler('régions'))
      .finally(() => setRegChargees(true));
  }, []);
  useEffect(() => {
    if (!f.region || districts.length) return;
    chargerAdm('ADM2').then((d) => { setDistricts(d); retirer('districts'); }).catch(() => signaler('districts'));
  }, [f.region, districts.length]);
  useEffect(() => {
    if (!f.district || communes.length) return;
    chargerAdm('ADM3').then((c) => { setCommunes(c); retirer('communes'); }).catch(() => signaler('communes'));
  }, [f.district, communes.length]);

  // « Actualiser » : réinitialise filtres, recherche et pagination, puis recharge les données
  const refresh = () => { setF({}); setQ(''); setPage(1); setPer(10); load(); };

  const feats = useMemo(() => (geo ? geo.features.filter((x) => themes.includes(x.properties.theme)) : []), [geo, themes]);
  const match = (p: Parcelle, skip?: FilterKey) => FILTERS.every((k) => k === skip || !f[k] || memeValeur(k, p[k], f[k]));
  const filtered = useMemo(() => feats.filter((x) => match(x.properties)), [feats, f]); // eslint-disable-line
  const rows = useMemo(() => filtered.map((x) => x.properties), [filtered]);
  // Options issues des parcelles, en cascade : chaque filtre tient compte des autres filtres
  const opts = (k: FilterKey) => trier(feats.filter((x) => match(x.properties, k)).map((x) => String(x.properties[k])));

  /* ===== Arbre administratif : région -> districts -> communes ===== */

  const rGeo = useMemo(
    () => (f.region ? regions.find((x) => cleReg(nomAdm(x)) === cleReg(f.region)) : undefined),
    [f.region, regions]);

  // Noms présents dans la base pour la sélection (sert quand un contour manque)
  const nomsBase = (k: 'district' | 'commune') => {
    const parent = k === 'district' ? 'region' : 'district';
    return new Set(
      feats
        .filter((x) => !f[parent] || memeValeur(parent, x.properties[parent], f[parent]))
        .filter((x) => k === 'district' || !f.region || memeValeur('region', x.properties.region, f.region))
        .map((x) => cle(String(x.properties[k])))
        .filter(Boolean)
    );
  };

  const districtsRegion = useMemo(() => {
    if (!f.region || !districts.length) return [];
    if (rGeo) return districts.filter((d) => estDans(d, rGeo));
    const noms = nomsBase('district');
    return districts.filter((d) => noms.has(cle(nomAdm(d))));
  }, [f.region, rGeo, districts, feats]); // eslint-disable-line

  const dGeo = useMemo(
    () => (f.district ? districtsRegion.find((x) => cle(nomAdm(x)) === cle(f.district)) : undefined),
    [f.district, districtsRegion]);

  const communesDistrict = useMemo(() => {
    if (!f.district || !communes.length) return [];
    if (dGeo) {
      const b = centre(dGeo);
      return communes.filter((c) => {
        const cc = centre(c);
        return cc && b && Math.abs(cc[0] - b[0]) < 1.5 && Math.abs(cc[1] - b[1]) < 1.5 && estDans(c, dGeo);
      });
    }
    const noms = nomsBase('commune');
    return communes.filter((c) => noms.has(cle(nomAdm(c))));
  }, [f.district, dGeo, communes, feats]); // eslint-disable-line

  const cGeo = useMemo(() => {
    if (!f.commune) return undefined;
    const nom = COMMUNE_GEO[`${cle(f.region || '')}|${cle(f.district || '')}|${cle(f.commune)}`] ?? f.commune;
    return communesDistrict.find((x) => cle(nomAdm(x)) === cle(nom));
  }, [f.commune, f.region, f.district, communesDistrict]);

  /* Listes déroulantes : toujours les 24 régions (+ Vatovavy Fitovinany) ; districts / communes = contours de la zone + valeurs de la base */
  const optsRegion = useMemo(
    () => unir(REGIONS_REF, REGIONS_EXTRA, opts('region').map(nomRegion)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feats, f]);
  const optsDistrict = useMemo(
    () => (f.region ? unir(districtsRegion.map(nomAdm), opts('district')) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f.region, districtsRegion, feats, f]);
  const optsCommune = useMemo(
    () => (f.district ? unir(communesDistrict.map(nomAdm), opts('commune')) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f.district, communesDistrict, feats, f]);

  /* Cadrage : commune, sinon district, sinon région ; à défaut de contour, emprise des parcelles ; sinon Madagascar */
  const cadre = useMemo(() => {
    const g = cGeo ?? dGeo ?? rGeo;
    const selection = f.commune || f.district || f.region;
    if (selection && g) return L.geoJSON(g as any).getBounds();
    if (selection && filtered.length) return L.geoJSON({ type: 'FeatureCollection', features: filtered } as any).getBounds();
    return null;
  }, [cGeo, dGeo, rGeo, f.region, f.district, f.commune, filtered]);

  /* Régions cliquables : évite de superposer « Vatovavy Fitovinany » avec Vatovavy et Fitovinany */
  const combine = regions.some((r) => r.properties.comb);
  const listeRegions = regions.filter((r) => {
    const n = nomAdm(r);
    if (REGIONS_EXTRA.includes(n)) return combine; // fusionnée : seulement si Vatovavy/Fitovinany n'ont pas leur propre contour
    return !r.properties.comb;
  });

  /* Couche cliquable du niveau suivant */
  const enfants = !f.region
    ? { liste: listeRegions, niveau: 'region' as FilterKey, couleur: COULEUR_REGION }
    : !f.district
    ? { liste: districtsRegion, niveau: 'district' as FilterKey, couleur: COULEUR_DISTRICT }
    : !f.commune
    ? { liste: communesDistrict, niveau: 'commune' as FilterKey, couleur: COULEUR_COMMUNE }
    : null;

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
  const pickRef = useRef<(k: FilterKey, v: string) => void>(() => {});
  pickRef.current = choisirFiltre;

  /* Barres par région : uniquement les régions présentes dans la base */
  const regionsData = useMemo(() => group(rows, 'region'), [rows]);

  const vTot = sum(rows.filter((r) => r.statut === 'Validé'));
  const dTot = sum(rows);
  const taux = cible ? (vTot / cible) * 100 : 0;
  // Les données de superficie ne s'affichent que si la sélection en contient dans la base
  const aDonnees = rows.length > 0;

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

  // Clé complète : la couche des parcelles se redessine à chaque changement de filtre ou rechargement
  const mapKey = `${ver}-${JSON.stringify(f)}-${filtered.length}-${Math.round(dTot)}`;
  const title = t.title[titleKey];
  const showTitle = !/vue\s+d.ensemble/i.test(title);

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

  const chargeLimites =
    (!!f.region && !districts.length && !admErreurs.includes('districts')) ||
    (!!f.district && !communes.length && !admErreurs.includes('communes'));

  const aide = !f.region
    ? 'Cliquez sur une région (ou choisissez-la dans la liste) pour zoomer et voir ses districts.'
    : !f.district
    ? 'Cliquez sur un district pour zoomer et voir ses communes.'
    : !f.commune
    ? 'Cliquez sur une commune pour la sélectionner.'
    : '';

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
                <select
                  value={f[k] || ''}
                  onChange={(e) => choisirFiltre(k, e.target.value)}
                  disabled={(k === 'district' && !f.region) || (k === 'commune' && !f.district)}
                >
                  <option value="">{t.all}</option>
                  {listeFiltre(k).map((o) => <option key={o} value={o}>{k === 'statut' ? tv(o) : o}</option>)}
                </select>
              </label>
            ))}
          </section>

          {aDonnees && (
              <OodaPanel
                rows={rows}
                cible={cible}
                debut={config.debut}
                fin={config.fin}
                filtre={Object.values(f).some(Boolean)}
              />
            )}

          <section className="sv-cols">
            {/* Partie gauche : énoncé et cartes d'information */}
            <div className="sv-side">
              <section className="sv-c sv-e">
                <h4>{t.enonceTitle}</h4>
                <p>{t.enonce[enonceKey](fr(cible))}</p>
              </section>

              {/* Superficies : seulement si la zone sélectionnée a des données dans la base */}
              {aDonnees && (
                <div className="sv-grid2">
                  {carteExtra('feu')}
                  {carteExtra('cep')}

                  <div className="sv-c">
                    <h4>{t.k.valide}</h4>
                    <div className="sv-val top">
                      <div className="sv-big">{fr(vTot)} ha</div>
                      <div className="sv-sub">{t.k.on(fr(cible))}</div>
                      <Gauge pct={taux} />
                    </div>
                  </div>
                  <Donut title={t.donut.pratique_cat} data={group(rows, 'pratique_cat').map((d) => ({ ...d, name: tv(d.name) }))} />

                  {regionsData.length > 0 && (
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
                  )}
                </div>
              )}
            </div>

            {/* Partie droite : carte interactive */}
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

                {/* Niveau suivant, cliquable : régions -> districts -> communes */}
                {enfants && enfants.liste.length > 0 && (
                  <GeoJSON
                    key={`enf-${enfants.niveau}-${f.region || ''}-${f.district || ''}-${enfants.liste.length}`}
                    data={{ type: 'FeatureCollection', features: enfants.liste } as any}
                    style={() => ({ color: enfants.couleur, weight: 1.6, fillColor: enfants.couleur, fillOpacity: 0.06 })}
                    onEachFeature={(x: any, l: any) => {
                      l.bindTooltip(nomAdm(x), { sticky: true, className: 'sv-tip' });
                      l.on('mouseover', () => l.setStyle({ fillOpacity: 0.3, weight: 2.5 }));
                      l.on('mouseout', () => l.setStyle({ fillOpacity: 0.06, weight: 1.6 }));
                      l.on('click', () => pickRef.current(enfants.niveau, nomAdm(x)));
                    }}
                  />
                )}

                {/* Contours de la sélection (non interactifs) */}
                {rGeo && (
                  <GeoJSON
                    key={`reg-${f.region}`}
                    data={rGeo as any}
                    interactive={false}
                    style={() => ({ color: COULEUR_REGION, weight: 3, fillOpacity: 0, dashArray: dGeo ? '6 4' : undefined })}
                  />
                )}
                {dGeo && (
                  <GeoJSON
                    key={`dis-${f.district}`}
                    data={dGeo as any}
                    interactive={false}
                    style={() => ({ color: COULEUR_DISTRICT, weight: 3, fillOpacity: 0, dashArray: cGeo ? '6 4' : undefined })}
                  />
                )}
                {cGeo && (
                  <GeoJSON
                    key={`com-${f.commune}`}
                    data={cGeo as any}
                    interactive={false}
                    style={() => ({ color: COULEUR_COMMUNE, weight: 3, fillColor: '#14b8a6', fillOpacity: 0.2 })}
                  />
                )}

                {/* Parcelles de la base (GeoJSON), filtrées, par-dessus les limites */}
                <GeoJSON
                  key={`${mapKey}-${lang}`}
                  data={{ type: 'FeatureCollection', features: filtered } as any}
                  style={(x: any) => ({ color: STATUT[x.properties.statut], weight: 5, fillOpacity: 0.6 })}
                  onEachFeature={(x: any, l: any) => {
                    const p = x.properties;
                    l.bindPopup(`<b>${esc(p.id)}</b><br>${esc(tp(p.pratique))}<br>${esc(p.commune)}, ${esc(p.region)}<br>${fr(p.superficie_ha, 2)} ha · ${esc(tv(p.statut))}`);
                  }}
                />

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
              {aide && <p className="sv-hint">{chargeLimites ? 'Chargement des limites…' : aide}</p>}
              {admErreurs.length > 0 && (
                <p className="sv-warn">Limites non chargées : {admErreurs.join(', ')}. Le zoom se fait alors sur les parcelles de la base.</p>
              )}
              {regChargees && (() => {
                const n = regions.filter((r) => REGIONS_REF.includes(nomAdm(r))).length;
                return n > 0 && n < REGIONS_REF.length && (
                  <p className="sv-hint">
                    Contours disponibles pour {n} régions sur {REGIONS_REF.length} : les autres se zooment sur leurs parcelles.
                  </p>
                );
              })()}
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
