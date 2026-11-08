import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Search, Download, GraduationCap, Gift, Wrench, Leaf, SlidersHorizontal, RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, Pane, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

/* =====================================================================
   SUIVI DES PRODUCTEURS AVEC REVENUS (C3) – cible : producteurs dont le revenu augmente
   Dépendances : react, recharts, lucide-react, react-leaflet, leaflet
   ===================================================================== */

type Lang = 'fr' | 'mg' | 'en' | 'de';
interface Rec {
  id: string; type: 'IND' | 'GRP'; region: string; ap: string; paysage: string; district: string; commune: string;
  mbv: string; fokontany: string; loc: string; year: number;
  m: number; p: number; w: number; y: number; // bénéficiaires, producteurs (revenu en hausse), femmes, jeunes (parmi les producteurs)
  nF: number; fSpec: string; fDate: string; nD: number; dSpec: string; dDate: string; nA: number; aSpec: string; aDate: string;
  lat: number; lng: number;
}
interface Meta { cible_producteurs?: number; debut?: number; fin?: number }

/* ---------- Configuration (à adapter) : mêmes couches que vos autres pages ---------- */
const DATA = {
  producteurs: '/data/producteurs_c3.geojson', // base GeoJSON de cette page
  regions: '/data/madagascar_24_region.geojson', // champ « nom_reg »
  districts: '/data/District_Paddi_2024.geojson', // champs REGION, DISTRICT, Aires_Prot
  communes: '/data/Commune_Paddi_2024.geojson', // champs REGION_2, DISTRICT_2, COMMUNE, Aires_Prot
};
const PROP = {
  region: 'nom_reg',
  district: 'DISTRICT', districtRegion: 'REGION',
  commune: 'COMMUNE', communeDistrict: 'DISTRICT_2', communeRegion: 'REGION_2',
  ap: 'Aires_Prot',
};
const NONE = '__hors_ap__'; // valeur du filtre « Hors aire protégée »
const DEF = { cible: 7000, debut: 2025, fin: 2030 }; // repli si absent de metadata

const LOC: Record<Lang, string> = { fr: 'fr-FR', mg: 'fr-FR', en: 'en-US', de: 'de-DE' };
const LI: Record<Lang, number> = { fr: 0, mg: 1, en: 2, de: 3 };
// Classes de la carte (hex : la carte Leaflet reste claire dans les deux thèmes)
const CLASSES = [
  { max: 50, c: '#16a34a', l: '1 – 50' }, { max: 100, c: '#4ade80', l: '51 – 100' }, { max: 250, c: '#facc15', l: '101 – 250' },
  { max: 500, c: '#fb923c', l: '251 – 500' }, { max: Infinity, c: '#ef4444', l: '501+' },
];
const colorOf = (v: number) => (CLASSES.find((k) => v <= k.max) ?? CLASSES[4]).c;
// Couleurs du parcours d'appui : variables du thème (clair / sombre)
const PATH = [
  { k: 'nF', Ic: GraduationCap, c: 'var(--p1)', b: '#facc15', bg: 'var(--p1bg)', lab: 'pf' },
  { k: 'nD', Ic: Gift, c: 'var(--p2)', b: '#60a5fa', bg: 'var(--p2bg)', lab: 'pd' },
  { k: 'nA', Ic: Wrench, c: 'var(--p3)', b: '#9ca3af', bg: 'var(--p3bg)', lab: 'pa' },
] as const;
const SERIES = [
  { k: 'total', c: '#16a34a', n: 'sTot', l: 'lTot' },
  { k: 'prod', c: 'var(--blue)', n: 'sProd', l: 'lProd' },
  { k: 'cible', c: '#9ca3af', n: 'sCible', l: 'sCible' },
] as const;
const HEAD = ['hg', 'hy', 'hy', 'hy', 'hb', 'hb', 'hb', 'hg', 'hg', 'hg'];

/* ---------- Spécifications (valeurs des données) : [fr, mg, en, de] ---------- */
const SPEC: Record<string, string[]> = Object.fromEntries([
  ['Techniques agroécologiques', 'Teknika agroekolojika', 'Agroecological techniques', 'Agrarökologische Techniken'],
  ['Gestion intégrée des cultures', 'Fitantanana mitambatra ny voly', 'Integrated crop management', 'Integrierter Pflanzenbau'],
  ['Agroforesterie', 'Fambolena mitambatra amin’ny hazo', 'Agroforestry', 'Agroforstwirtschaft'],
  ['Gestion de groupement', 'Fitantanana vondrona', 'Group management', 'Gruppenmanagement'],
  ['Transformation', 'Fanodinana', 'Processing', 'Verarbeitung'],
  ['Élevage amélioré', 'Fiompiana nohatsaraina', 'Improved livestock farming', 'Verbesserte Tierhaltung'],
  ['Gestion financière', 'Fitantanam-bola', 'Financial management', 'Finanzmanagement'],
  ['Gouvernance', 'Governansa', 'Governance', 'Governance'],
  ['Techniques maraîchères', 'Teknika fambolena anana', 'Vegetable-growing techniques', 'Gemüseanbautechniken'],
  ['Commercialisation', 'Varotra', 'Marketing', 'Vermarktung'],
  ['Kit semences', 'Kit masomboly', 'Seed kit', 'Saatgut-Set'],
  ['Outils agricoles', 'Fitaovam-pambolena', 'Farm tools', 'Landwirtschaftliche Werkzeuge'],
  ['Plants agroforestiers', 'Zanaky ny hazo fambolena', 'Agroforestry seedlings', 'Agroforst-Setzlinge'],
  ['Matériel d’entretien', 'Fitaovana fikarakarana', 'Maintenance equipment', 'Pflegematerial'],
  ['Équipements de transformation', 'Fitaovana fanodinana', 'Processing equipment', 'Verarbeitungsausrüstung'],
  ['Kit avicole', 'Kit fiompiana akoho', 'Poultry kit', 'Geflügel-Set'],
  ['Système d’irrigation', 'Rafitra fanondranana rano', 'Irrigation system', 'Bewässerungssystem'],
  ['Intrants', 'Akora', 'Inputs', 'Betriebsmittel'],
  ['Terrassement agricole', 'Fanamboarana tarasy fambolena', 'Agricultural terracing', 'Landwirtschaftliche Terrassierung'],
  ['Aménagement site de production', 'Fanamboarana toerana famokarana', 'Production site development', 'Ausbau des Produktionsstandorts'],
  ['Poulailler amélioré', 'Trano fiompiana akoho nohatsaraina', 'Improved poultry house', 'Verbesserter Hühnerstall'],
  ['Aménagement périmètre irrigué', 'Fanamboarana tanimbary mahazo rano', 'Irrigated perimeter development', 'Ausbau der Bewässerungsfläche'],
  ['Bassin de rétention', 'Dobo fitahirizana rano', 'Retention basin', 'Rückhaltebecken'],
].map((a) => [a[0], a] as [string, string[]]));

/* ---------- Traductions ---------- */
const fr = {
  title: 'Suivi des producteurs avec revenus', rf: 'Actualiser', all: 'Tous', more: 'Plus de filtres', reset: 'Réinitialiser', noap: 'Hors aire protégée',
  ld: 'Chargement…', er: 'Chargement impossible. Vérifiez que {0} est accessible, puis actualisez.',
  f: { year: 'Année', region: 'Région', ap: 'Aire protégée', paysage: 'Paysage', district: 'District', commune: 'Commune', mbv: 'Micro-bassin versant', fokontany: 'Fokontany' },
  tgt: 'Atteinte de la cible', tgtSub: '{0} producteurs augmentent leurs revenus', of: 'sur {0}', target: 'Cible : {0}',
  fem: '% Femmes (Total)', yth: '% Jeunes < 35 ans (Total)',
  cat: 'Atteinte par catégorie de bénéficiaires (C3)', cols: ['Catégorie C3', 'Nombre de producteurs', '% de la cible ({0})', '% Femmes', '% Jeunes < 35 ans'],
  ind: 'Bénéficiaires individuels (C3)', grp: 'Groupements bénéficiaires (C3)', tot: 'Total',
  evol: 'Évolution annuelle des bénéficiaires C3', sTot: 'Total bénéficiaires C3', sProd: 'Producteurs (C3)', sCible: 'Trajectoire cible', lTot: 'Total bénéficiaires', lProd: 'Producteurs',
  path: 'Parcours d’appui des bénéficiaires (C3)', pf: 'Bénéficiaires ayant obtenu une formation', pd: 'Bénéficiaires ayant obtenu une dotation', pa: 'Bénéficiaires ayant obtenu un aménagement',
  step1: 'des bénéficiaires formés ont reçu une dotation', step2: 'des bénéficiaires dotés ont obtenu un aménagement',
  note: 'Les pourcentages sont calculés par rapport au total des bénéficiaires C3 ({0}).',
  map: 'Localisation des producteurs (C3)', pop: 'Producteurs :', lg: 'Nb producteurs', hint: 'Cliquez sur une limite pour filtrer (région, district, commune).',
  tb: { title: 'Détails des bénéficiaires C3', search: 'Rechercher...', exp: 'Exporter', cols: ['Id', 'Nombre de formations', 'Spécification de la formation', 'Date', 'Nombre de dotations', 'Spécification de la dotation', 'Date', 'Nombre d’aménagements', 'Spécification de l’aménagement', 'Date'],
    none: 'Aucun enregistrement pour ces filtres.', show: 'Affichage de {0} à {1} sur {2} enregistrements', rows: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page' },
};
type D = typeof fr;
const mg: D = {
  title: 'Fanaraha-maso ny mpamokatra nitombo ny fidiram-bola', rf: 'Havaozina', all: 'Rehetra', more: 'Sivana hafa', reset: 'Averina', noap: 'Ivelan’ny faritra arovana',
  ld: 'Mampiditra…', er: 'Tsy afaka naka ny angona. Jereo raha azo vakiana ny {0}, avy eo havaozy.',
  f: { year: 'Taona', region: 'Faritra', ap: 'Faritra arovana', paysage: 'Tontolo', district: 'Distrika', commune: 'Kaominina', mbv: 'Tambatra-drano kely', fokontany: 'Fokontany' },
  tgt: 'Fahatratrarana ny tanjona', tgtSub: 'mpamokatra {0} no nitombo ny fidiram-bolany', of: 'amin’ny {0}', target: 'Tanjona : {0}',
  fem: '% Vehivavy (Total)', yth: '% Tanora < 35 taona (Total)',
  cat: 'Fahatratrarana araka ny sokajin’ny mpahazo tombontsoa (C3)', cols: ['Sokajy C3', 'Isan’ny mpamokatra', '% amin’ny tanjona ({0})', '% Vehivavy', '% Tanora < 35 taona'],
  ind: 'Mpahazo tombontsoa tsirairay (C3)', grp: 'Vondrona mpahazo tombontsoa (C3)', tot: 'Total',
  evol: 'Fivoaran’ny mpahazo tombontsoa C3 isan-taona', sTot: 'Mpahazo tombontsoa C3 rehetra', sProd: 'Mpamokatra (C3)', sCible: 'Làlana tanjona', lTot: 'Mpahazo tombontsoa rehetra', lProd: 'Mpamokatra',
  path: 'Lalana fanampiana ny mpahazo tombontsoa (C3)', pf: 'Mpahazo tombontsoa nahazo fampiofanana', pd: 'Mpahazo tombontsoa nahazo fanomezana', pa: 'Mpahazo tombontsoa nahazo fanamboarana',
  step1: 'amin’ireo nahazo fampiofanana no nahazo fanomezana', step2: 'amin’ireo nahazo fanomezana no nahazo fanamboarana',
  note: 'Ny isan-jato dia kajiana amin’ny mpahazo tombontsoa C3 rehetra ({0}).',
  map: 'Toeran’ny mpamokatra (C3)', pop: 'Mpamokatra :', lg: 'Isan’ny mpamokatra', hint: 'Tsindrio ny sisintany mba hanivana (faritra, distrika, kaominina).',
  tb: { title: 'Antsipiriany momba ny mpahazo tombontsoa C3', search: 'Hikaroka...', exp: 'Hamoaka', cols: ['Id', 'Isan’ny fampiofanana', 'Famaritana ny fampiofanana', 'Daty', 'Isan’ny fanomezana', 'Famaritana ny fanomezana', 'Daty', 'Isan’ny fanamboarana', 'Famaritana ny fanamboarana', 'Daty'],
    none: 'Tsy misy voarakitra ho an’ireo sivana ireo.', show: 'Aseho ny {0} hatramin’ny {1} amin’ny {2}', rows: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany' },
};
const en: D = {
  title: 'Monitoring of producers with income gains', rf: 'Refresh', all: 'All', more: 'More filters', reset: 'Reset', noap: 'Outside protected area',
  ld: 'Loading…', er: 'Unable to load data. Check that {0} is reachable, then refresh.',
  f: { year: 'Year', region: 'Region', ap: 'Protected area', paysage: 'Landscape', district: 'District', commune: 'Municipality', mbv: 'Micro-watershed', fokontany: 'Fokontany' },
  tgt: 'Target achievement', tgtSub: '{0} producers increase their income', of: 'out of {0}', target: 'Target: {0}',
  fem: '% Women (Total)', yth: '% Youth < 35 (Total)',
  cat: 'Achievement by beneficiary category (C3)', cols: ['C3 category', 'Number of producers', '% of target ({0})', '% Women', '% Youth < 35'],
  ind: 'Individual beneficiaries (C3)', grp: 'Beneficiary groups (C3)', tot: 'Total',
  evol: 'Annual trend of C3 beneficiaries', sTot: 'Total C3 beneficiaries', sProd: 'Producers (C3)', sCible: 'Target trajectory', lTot: 'Total beneficiaries', lProd: 'Producers',
  path: 'Support pathway of beneficiaries (C3)', pf: 'Beneficiaries who received training', pd: 'Beneficiaries who received an in-kind grant', pa: 'Beneficiaries who received site improvements',
  step1: 'of trained beneficiaries received an in-kind grant', step2: 'of beneficiaries with a grant received site improvements',
  note: 'Percentages are calculated against total C3 beneficiaries ({0}).',
  map: 'Producer locations (C3)', pop: 'Producers:', lg: 'No. of producers', hint: 'Click a boundary to filter (region, district, municipality).',
  tb: { title: 'Details of C3 beneficiaries', search: 'Search...', exp: 'Export', cols: ['Id', 'Number of trainings', 'Training details', 'Date', 'Number of in-kind grants', 'In-kind grant details', 'Date', 'Number of improvements', 'Improvement details', 'Date'],
    none: 'No records match these filters.', show: 'Showing {0} to {1} of {2} records', rows: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page' },
};
const de: D = {
  title: 'Überwachung der Produzenten mit Einkommenssteigerung', rf: 'Aktualisieren', all: 'Alle', more: 'Weitere Filter', reset: 'Zurücksetzen', noap: 'Außerhalb von Schutzgebieten',
  ld: 'Wird geladen…', er: 'Laden nicht möglich. Prüfen Sie, ob {0} erreichbar ist, und aktualisieren Sie dann.',
  f: { year: 'Jahr', region: 'Region', ap: 'Schutzgebiet', paysage: 'Landschaft', district: 'Distrikt', commune: 'Gemeinde', mbv: 'Mikro-Einzugsgebiet', fokontany: 'Fokontany' },
  tgt: 'Zielerreichung', tgtSub: '{0} Produzenten steigern ihr Einkommen', of: 'von {0}', target: 'Ziel: {0}',
  fem: '% Frauen (Gesamt)', yth: '% Jugendliche < 35 (Gesamt)',
  cat: 'Zielerreichung nach Begünstigtenkategorie (C3)', cols: ['Kategorie C3', 'Anzahl Produzenten', '% des Ziels ({0})', '% Frauen', '% Jugend < 35'],
  ind: 'Einzelbegünstigte (C3)', grp: 'Begünstigte Gruppen (C3)', tot: 'Gesamt',
  evol: 'Jährliche Entwicklung der C3-Begünstigten', sTot: 'Begünstigte C3 gesamt', sProd: 'Produzenten (C3)', sCible: 'Zielpfad', lTot: 'Begünstigte gesamt', lProd: 'Produzenten',
  path: 'Unterstützungspfad der Begünstigten (C3)', pf: 'Begünstigte mit Schulung', pd: 'Begünstigte mit Sachleistung', pa: 'Begünstigte mit Standortverbesserung',
  step1: 'der geschulten Begünstigten erhielten eine Sachleistung', step2: 'der Begünstigten mit Sachleistung erhielten eine Standortverbesserung',
  note: 'Die Prozentsätze beziehen sich auf alle C3-Begünstigten ({0}).',
  map: 'Standorte der Produzenten (C3)', pop: 'Produzenten:', lg: 'Anz. Produzenten', hint: 'Klicken Sie auf eine Grenze, um zu filtern (Region, Distrikt, Gemeinde).',
  tb: { title: 'Details der C3-Begünstigten', search: 'Suchen...', exp: 'Exportieren', cols: ['ID', 'Anzahl Schulungen', 'Details der Schulung', 'Datum', 'Anzahl Sachleistungen', 'Details der Sachleistung', 'Datum', 'Anzahl Verbesserungen', 'Details der Verbesserung', 'Datum'],
    none: 'Keine Einträge für diese Filter.', show: 'Anzeige von {0} bis {1} von {2} Einträgen', rows: 'Zeilen pro Seite', first: 'Erste Seite', prev: 'Vorherige Seite', next: 'Nächste Seite', last: 'Letzte Seite' },
};
const TR: Record<Lang, D> = { fr, mg, en, de };
const fmt = (s: string, ...a: (string | number)[]) => s.replace(/\{(\d)\}/g, (_, i) => String(a[+i]));

/* ---------- Helpers ---------- */
const sum = (a: Rec[], k: 'm' | 'p' | 'w' | 'y') => a.reduce((t, r) => t + r[k], 0);
const pc = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const hasXY = (r: { lat: number; lng: number }) => Number.isFinite(r.lat) && Number.isFinite(r.lng);
const norm = (v: any) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const bbox = (fs: any[]): [number, number][] => {
  let a = 90, b = 180, c = -90, d = -180;
  const walk = (x: any) => {
    if (typeof x[0] === 'number') { if (x[1] < a) a = x[1]; if (x[1] > c) c = x[1]; if (x[0] < b) b = x[0]; if (x[0] > d) d = x[0]; }
    else x.forEach(walk);
  };
  fs.forEach((ft) => ft?.geometry?.coordinates && walk(ft.geometry.coordinates));
  return a <= c ? [[a, b], [c, d]] : [];
};

const FK = ['year', 'region', 'ap', 'paysage', 'district', 'commune', 'mbv', 'fokontany'] as const;
type K = (typeof FK)[number];
const PRIMARY: K[] = ['year', 'region', 'district', 'commune'];
const SECOND: K[] = ['ap', 'paysage', 'mbv', 'fokontany'];
type Lvl = 'region' | 'district' | 'commune';
interface Ly { key: string; features: any[]; style: any; click?: Lvl }
const ST_REG = { color: '#546e7a', weight: 1, fillColor: '#90a4ae', fillOpacity: 0.04 };
const ST_CTX = { color: '#78909c', weight: 1, dashArray: '3', fillColor: '#90a4ae', fillOpacity: 0.05 };
const ST_AP = { color: '#ef6c00', weight: 2, fillColor: '#ef6c00', fillOpacity: 0.15 };
const ST_HL = { color: '#166534', weight: 3, fillColor: '#3f8f00', fillOpacity: 0.12 };

const toRec = (x: any): Rec | null => {
  const p = x?.properties;
  const c = x?.geometry?.coordinates;
  if (!p?.id) return null;
  const s = (v: any) => (v == null ? '' : String(v));
  const n = (v: any) => Number(v) || 0;
  const first = s(p.formation_date) || s(p.dotation_date) || s(p.amenagement_date);
  const grp = p.type === 'GRP' || /GRP/i.test(s(p.id));
  return {
    id: s(p.id), type: grp ? 'GRP' : 'IND', region: s(p.region), ap: s(p.aire_protegee), paysage: s(p.paysage), district: s(p.district),
    commune: s(p.commune), mbv: s(p.mbv), fokontany: s(p.fokontany), loc: s(p.localisation),
    year: n(p.annee) || new Date(first).getUTCFullYear() || 0,
    m: n(p.membres) || 1, p: n(p.producteurs), w: n(p.femmes), y: n(p.jeunes),
    nF: n(p.nb_formations), fSpec: s(p.formation_spec), fDate: s(p.formation_date),
    nD: n(p.nb_dotations), dSpec: s(p.dotation_spec), dDate: s(p.dotation_date),
    nA: n(p.nb_amenagements), aSpec: s(p.amenagement_spec), aDate: s(p.amenagement_date),
    lat: Array.isArray(c) ? Number(c[1]) : NaN, lng: Array.isArray(c) ? Number(c[0]) : NaN,
  };
};

const Fit = ({ pts }: { pts: [number, number][] }) => {
  const map = useMap();
  useEffect(() => { if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); }, [pts, map]);
  return null;
};
const Donut = ({ v, label }: { v: number; label: string }) => (
  <div className="rp-dn" role="img" aria-label={label}
    style={{ background: `conic-gradient(#3f8f00 0 ${Math.min(100, v)}%, var(--track) ${Math.min(100, v)}% 100%)` }}>
    <span>{label}</span>
  </div>
);
const useNarrow = () => {
  const [n, setN] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setN(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
};

/* Les couleurs viennent de variables : valeurs claires dans « .rp »,
   surcharges du thème sombre dans « :root[data-theme="dark"] .rp ».
   (La carte Leaflet reste claire dans les deux thèmes.) */
const CSS = `
.rp{--ink:#111827;--txt2:#374151;--mut:#6b7280;--card:#fff;--line:#e5e7eb;--bd:#d1d5db;--track:#dfe8d7;
  --gv:#166534;--gb:#166534;--tot:#f0f8eb;--glass:rgba(255,255,255,.95);--blue:#2563eb;
  --hy:#fef3c7;--hb:#dbeafe;--hg:#f3f4f6;
  --p1:#ca8a04;--p1bg:#fef3c7;--p2:#2563eb;--p2bg:#dbeafe;--p3:#4b5563;--p3bg:#f3f4f6;
  padding:12px;min-height:100vh;width:100%;max-width:2200px;margin:0 auto;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);display:flex;flex-direction:column;gap:12px}
:root[data-theme="dark"] .rp{--ink:#e5e7eb;--txt2:#cbd5e1;--mut:#94a3b8;--card:var(--surface);--line:rgba(255,255,255,.12);--bd:rgba(255,255,255,.2);
  --track:rgba(255,255,255,.14);--gv:#4ade80;--gb:#15803d;--tot:rgba(74,222,128,.12);--glass:rgba(17,26,46,.95);--blue:#60a5fa;
  --hy:rgba(250,204,21,.18);--hb:rgba(96,165,250,.2);--hg:rgba(255,255,255,.08);
  --p1:#facc15;--p1bg:rgba(250,204,21,.18);--p2:#60a5fa;--p2bg:rgba(96,165,250,.2);--p3:#cbd5e1;--p3bg:rgba(255,255,255,.1)}
.rp *{box-sizing:border-box}
.rp :focus-visible{outline:3px solid #facc15;outline-offset:2px}
.rp-h{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.rp-t{display:flex;align-items:center;gap:10px;font-size:clamp(18px,2.6vw,24px);font-weight:800;color:var(--gv)}
.rp-btn{height:42px;padding:0 18px;border-radius:10px;background:var(--gb);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;cursor:pointer;border:none;flex-shrink:0}
.rp-btn.l{background:var(--card);color:var(--ink);border:1px solid var(--bd);height:38px;padding:0 12px;font-weight:600;font-size:12px}
.rp-btn:disabled{opacity:.6;cursor:default}
.rp-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;align-items:end}
.rp-f2{margin-top:8px;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.rp-f label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:500}
.rp select,.rp input{height:38px;width:100%;min-width:0;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--ink);padding:0 10px;font-size:12px}
.rp-n{background:#facc15;color:#111827;border-radius:10px;padding:0 6px;font-size:11px;font-style:normal}
.rp-c{background:var(--card);border-radius:14px;padding:12px;border:1px solid var(--line);min-width:0}
.rp-ct{font-size:13px;font-weight:700;color:var(--gv);margin-bottom:6px}
.rp-top{display:grid;gap:8px;grid-template-columns:1.5fr 1fr 1fr 3fr}
.rp-mid{display:grid;gap:12px;grid-template-columns:1.6fr 1fr 1.6fr}
.rp-ctr{display:flex;flex-direction:column;align-items:center;justify-content:center}
.rp-sub{font-size:12px;color:var(--txt2);margin-bottom:10px}
.rp-big{font-size:clamp(22px,2.6vw,28px);font-weight:800;text-align:center;color:var(--gv);line-height:1}
.rp-bs{text-align:center;font-weight:700;font-size:13px;margin:4px 0 10px}
.rp-pb{width:100%;height:18px;border-radius:999px;overflow:hidden;background:var(--track)}
.rp-pb b{display:block;height:100%;background:linear-gradient(90deg,#4ade80,#3f8f00)}
.rp-pv{text-align:center;margin-top:6px;font-weight:800;font-size:15px;color:var(--gv)}
.rp-tg{text-align:center;margin-top:4px;color:var(--txt2);font-size:12px}
.rp-dn{width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rp-dn span{width:70px;height:70px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--gv)}
.rp-dt{font-size:12px;font-weight:700;text-align:center;margin-bottom:12px}
.rp-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
.rp table{width:100%;border-collapse:collapse;font-size:12px}
.rp th{background:#3f8f00;color:#fff;padding:9px 6px;text-align:center;border:1px solid var(--bd)}
.rp th.hy,.rp th.hb,.rp th.hg{color:var(--ink);font-size:11px;padding:7px 4px}
.rp th.hy{background:var(--hy)}.rp th.hb{background:var(--hb)}.rp th.hg{background:var(--hg)}
.rp td{padding:9px 6px;border:1px solid var(--line)}
.rp td.c{text-align:center;white-space:nowrap}
.rp td.s{font-size:11px;line-height:1.35}
.rp tr.tot td{background:var(--tot);font-weight:700}
.rp-pc{display:flex;flex-direction:column}
.rp-flow{display:flex;flex-direction:column;align-items:stretch;margin-top:10px}
.rp-pc .rp-flow{flex:1;justify-content:center}
.rp-box{display:flex;align-items:center;gap:12px;border:1.5px solid;border-radius:13px;padding:10px 12px;min-width:0}
.rp-pt{flex:1;min-width:0}
.rp-pr{text-align:right;flex-shrink:0}
.rp-mb{height:6px;border-radius:999px;background:var(--track);overflow:hidden;margin-top:6px}
.rp-mb b{display:block;height:100%}
.rp-ic{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rp-pl{font-size:12px;font-weight:700;line-height:1.35}
.rp-pvv{font-size:20px;font-weight:800}
.rp-pp{font-size:12px;color:var(--mut)}
.rp-ar{align-self:center;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;font-size:12px;color:var(--mut);padding:4px 0;text-align:center}
.rp-ar span{font-size:18px;line-height:1;color:var(--mut)}
.rp-ar b{color:var(--gv);font-size:13px}
.rp-note{margin-top:16px;font-size:13px;color:var(--mut);text-align:center}
.rp-map{position:relative;border-radius:12px;overflow:hidden}
.rp-lgd{position:absolute;bottom:12px;left:12px;z-index:999;background:var(--glass);color:var(--ink);padding:10px 12px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.15);font-size:12px}
.rp-lgd b{display:block;margin-bottom:8px}
.rp-lr{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.rp-lr i{width:14px;height:14px;border-radius:50%;display:inline-block}
.rp-lg2{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px;font-size:12px}
.rp-lg2 button{display:flex;align-items:center;gap:6px;background:none;color:var(--ink);border:0;cursor:pointer;font-size:12px;padding:2px 0}
.rp-lg2 i{width:10px;height:10px;display:inline-block}
.rp-bh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.rp-bt{background:var(--gb);color:#fff;padding:6px 12px;border-radius:10px 10px 0 0;font-weight:700;font-size:12px}
.rp-ba{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.rp-sb{position:relative;display:inline-flex;align-items:center}
.rp-sb svg{position:absolute;left:9px;pointer-events:none}
.rp-sb input{padding-left:30px;width:200px;height:34px}
.rp-pg{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;font-size:12px;padding-top:8px;border-top:1px solid var(--line)}
.rp-pg>div{display:flex;gap:3px;align-items:center;flex-wrap:wrap}
.rp-pg>div:first-child{color:var(--mut)}
.rp-pg>div:last-child{justify-content:flex-end;gap:8px}
.rp-pg button{width:30px;height:30px;border-radius:6px;border:1px solid var(--bd);background:var(--card);color:var(--ink);cursor:pointer}
.rp-pg button.on{background:var(--gb);color:#fff;border-color:var(--gb);font-weight:700}
.rp-pg button:disabled{opacity:.4;cursor:default}
.rp-pg select{width:auto;height:30px}
@media (max-width:1280px){.rp-mid{grid-template-columns:1fr 1fr}.rp-mid>.wide{grid-column:1/-1}}
@media (max-width:1100px){.rp-top{grid-template-columns:repeat(3,1fr)}.rp-top>.wide{grid-column:1/-1}}
@media (max-width:760px){.rp-mid{grid-template-columns:1fr}.rp-pg{grid-template-columns:1fr;justify-items:center;text-align:center}.rp-pg>div:last-child{justify-content:center}}
@media (max-width:640px){.rp{padding:8px}.rp-top{grid-template-columns:1fr 1fr}.rp-top>.tg{grid-column:1/-1}.rp-sb,.rp-sb input{width:100%}.rp-sb{flex:1 1 100%}}
@media (max-width:560px){.rp-btn span{display:none}.rp-btn{padding:0 12px}.rp-lgd{position:static;margin-top:8px;box-shadow:none;border:1px solid var(--line)}}
@media print{.np{display:none!important}.rp-c{break-inside:avoid}}
`;

/* ===================================================================== */
export default function RevenusProducteurs() {
  // Langue choisie au démarrage de l'application (LanguageContext)
  const ctx: any = useLanguage() || {};
  const lc = ctx.lang ?? ctx.language;
  const lang: Lang = lc === 'mg' || lc === 'en' || lc === 'de' ? lc : 'fr';
  const t = TR[lang];
  const narrow = useNarrow();
  const nf = (n: number, d = 0) => n.toLocaleString(LOC[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n: number) => `${nf(n, 1)}%`;
  const formatK = (v: number) => (v >= 1000 ? `${nf(v / 1000, 1)}K` : nf(v));
  const dFmt = (iso: string) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString(LOC[lang], { timeZone: 'UTC' }) : '–');
  const spec = (s: string) => (!s || s === '-' ? '–' : s.split(';').map((x) => {
    const m = x.trim().match(/^(.*?)(\s*\(.*\))?$/);
    const base = m ? m[1] : x.trim();
    return (SPEC[base]?.[LI[lang]] ?? base) + (m?.[2] ?? '');
  }).join('; '));

  /* ----- Données ----- */
  const [raw, setRaw] = useState<Rec[] | null>(null);
  const [meta, setMeta] = useState<Meta>({});
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adm, setAdm] = useState<{ reg: any; dis: any; com: any }>({ reg: null, dis: null, com: null });
  const recs = useMemo(() => raw ?? [], [raw]);
  const TARGET = meta.cible_producteurs ?? DEF.cible;
  const START = meta.debut ?? DEF.debut;
  const END = meta.fin ?? DEF.fin;

  const load = () => {
    setErr(false);
    setBusy(true);
    fetch(DATA.producteurs, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((g) => { setMeta(g.metadata || {}); setRaw((g.features || []).map(toRec).filter(Boolean) as Rec[]); })
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);
  useEffect(() => {
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([get(DATA.regions), get(DATA.districts), get(DATA.communes)]).then(([reg, dis, com]) => setAdm({ reg, dis, com }));
  }, []);

  /* ----- Filtres (hiérarchiques) ----- */
  const [f, setF] = useState<Record<string, string>>({});
  const [more, setMore] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(5);
  const [vis, setVis] = useState<Record<string, boolean>>({ total: true, prod: true, cible: true });

  const match = (a: Rec, skip?: K) => FK.every((k) => {
    if (k === skip || !f[k]) return true;
    if (k === 'ap' && f[k] === NONE) return !a.ap;
    return String(a[k]) === f[k];
  });
  const rows = useMemo(() => recs.filter((a) => match(a)), [f, recs]); // eslint-disable-line
  const opts = (k: K) => {
    const l = [...new Set(recs.filter((a) => match(a, k)).map((a) => (k === 'ap' && !a.ap ? NONE : String(a[k]))))].filter((v) => v && v !== '0').sort();
    if (f[k] && !l.includes(f[k])) l.push(f[k]);
    return l;
  };
  const reset = () => { setF({}); setQ(''); setPage(1); setPer(5); };
  const CHILD: Partial<Record<K, K[]>> = { region: ['district', 'commune', 'fokontany', 'mbv'], district: ['commune', 'fokontany', 'mbv'], commune: ['fokontany', 'mbv'] };
  const setFilter = (k: K, v: string) => {
    setF((p) => { const n = { ...p, [k]: v }; (CHILD[k] || []).forEach((c) => { delete n[c]; }); return n; });
    setPage(1);
  };
  const canon = (k: Lvl, name: string) => { const h = recs.find((a) => norm(a[k]) === norm(name)); return h ? String(h[k]) : name; };
  const pick = (lvl: Lvl, p: any) => {
    const reg = lvl === 'region' ? p?.[PROP.region] : lvl === 'district' ? p?.[PROP.districtRegion] : p?.[PROP.communeRegion];
    const dis = lvl === 'district' ? p?.[PROP.district] : lvl === 'commune' ? p?.[PROP.communeDistrict] : '';
    const com = lvl === 'commune' ? p?.[PROP.commune] : '';
    setF((prev) => {
      const n = { ...prev };
      (['region', 'district', 'commune', 'fokontany', 'mbv'] as K[]).forEach((c) => { delete n[c]; });
      if (reg) n.region = canon('region', reg);
      if (dis) n.district = canon('district', dis);
      if (com) n.commune = canon('commune', com);
      return n;
    });
    setPage(1);
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const nAct = FK.filter((k) => f[k]).length;
  const nSec = SECOND.filter((k) => f[k]).length;
  const sel = (k: K) => (
    <label key={k}>{t.f[k]}
      <select value={f[k] || ''} onChange={(e) => setFilter(k, e.target.value)}>
        <option value="">{t.all}</option>
        {opts(k).map((o) => <option key={o} value={o}>{o === NONE ? t.noap : o}</option>)}
      </select>
    </label>
  );

  /* ----- Indicateurs ----- */
  const prod = sum(rows, 'p');
  const ben = sum(rows, 'm');
  const prog = pc(prod, TARGET);
  const women = pc(sum(rows, 'w'), prod);
  const youth = pc(sum(rows, 'y'), prod);
  const byType = (['IND', 'GRP'] as const).map((k) => {
    const a = rows.filter((r) => r.type === k);
    const p = sum(a, 'p');
    return { k, p, share: pc(p, TARGET), w: pc(sum(a, 'w'), p), y: pc(sum(a, 'y'), p) };
  });
  const cy = new Date().getFullYear();
  const nY = END - START + 1;
  const base = recs.filter((a) => match(a, 'year'));
  const evol = Array.from({ length: nY }, (_, i) => {
    const y = START + i;
    const a = base.filter((r) => r.year <= y);
    return { year: y, total: y <= cy ? sum(a, 'm') : null, prod: y <= cy ? sum(a, 'p') : null, cible: Math.round((TARGET * (i + 1)) / nY) };
  });
  const path = PATH.map((x, i) => {
    const prev = i ? PATH[i - 1].k : null;
    const v = sum(rows.filter((r) => r[x.k] > 0), 'm');
    const from = prev ? sum(rows.filter((r) => r[prev] > 0), 'm') : 0;
    const both = prev ? sum(rows.filter((r) => r[prev] > 0 && r[x.k] > 0), 'm') : 0;
    return { ...x, v, p: pc(v, ben), conv: prev ? pc(both, from) : 0 }; // conv = taux de passage depuis l'étape précédente
  });

  /* ----- Carte : un point par localité ----- */
  const spots = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; p: number; name: string }>();
    rows.filter(hasXY).forEach((r) => {
      const k = `${r.commune}|${r.fokontany}|${r.loc}`;
      const e = m.get(k) || { lat: r.lat, lng: r.lng, p: 0, name: [r.loc || r.fokontany, r.commune].filter(Boolean).join(', ') };
      e.p += r.p;
      m.set(k, e);
    });
    return [...m.values()].filter((x) => x.p > 0);
  }, [rows]);
  const pts = useMemo<[number, number][]>(() => spots.map((s) => [s.lat, s.lng]), [spots]);
  const layers = useMemo<Ly[]>(() => {
    const out: Ly[] = [];
    const reg: any[] = adm.reg?.features ?? [], dis: any[] = adm.dis?.features ?? [], com: any[] = adm.com?.features ?? [];
    const nr = norm(f.region), nd = norm(f.district), nc = norm(f.commune);
    const na = f.ap && f.ap !== NONE ? norm(f.ap) : '';
    const inR = (x: any) => !nr || norm(x) === nr;
    const inD = (x: any) => !nd || norm(x) === nd;
    const P = PROP;
    if (reg.length) out.push({ key: 'reg', features: reg, style: ST_REG, click: 'region' });
    if (nd && com.length) {
      out.push({ key: `cc-${nr}-${nd}`, features: com.filter((x) => inR(x.properties?.[P.communeRegion]) && inD(x.properties?.[P.communeDistrict])), style: ST_CTX, click: 'commune' });
    } else if (nr && dis.length) {
      out.push({ key: `cd-${nr}`, features: dis.filter((x) => norm(x.properties?.[P.districtRegion]) === nr), style: ST_CTX, click: 'district' });
    }
    if (na) {
      const useCom = com.length > 0;
      const src = useCom ? com : dis;
      const rk = useCom ? P.communeRegion : P.districtRegion, dk = useCom ? P.communeDistrict : P.district;
      const a = src.filter((x) => norm(x.properties?.[P.ap]).includes(na) && inR(x.properties?.[rk]) && inD(x.properties?.[dk]));
      if (a.length) out.push({ key: `ap-${na}-${nr}-${nd}`, features: a, style: ST_AP });
    }
    let hl: any[] = [];
    if (nc) hl = com.filter((x) => norm(x.properties?.[P.commune]) === nc && inR(x.properties?.[P.communeRegion]) && inD(x.properties?.[P.communeDistrict]));
    else if (nd) hl = dis.filter((x) => norm(x.properties?.[P.district]) === nd && inR(x.properties?.[P.districtRegion]));
    else if (nr) hl = reg.filter((x) => norm(x.properties?.[P.region]) === nr);
    if (hl.length) out.push({ key: `hl-${nr}-${nd}-${nc}`, features: hl, style: ST_HL });
    return out;
  }, [adm, f.region, f.district, f.commune, f.ap]);
  const fitPts = useMemo(() => {
    const tg = layers.find((l) => l.key.startsWith('hl')) || layers.find((l) => l.key.startsWith('ap'));
    const b = tg ? bbox(tg.features) : [];
    return b.length ? b : pts;
  }, [layers, pts]);

  /* ----- Tableau ----- */
  const ql = q.trim().toLowerCase();
  const cells = (r: Rec) => [r.id, r.nF, spec(r.fSpec), dFmt(r.fDate), r.nD, spec(r.dSpec), dFmt(r.dDate), r.nA, spec(r.aSpec), dFmt(r.aDate)];
  const table = ql ? rows.filter((r) => `${cells(r).join(' ')} ${r.region} ${r.commune}`.toLowerCase().includes(ql)) : rows;
  const pages = Math.max(1, Math.ceil(table.length / per));
  const cur = Math.min(page, pages);
  const slice = table.slice((cur - 1) * per, cur * per);
  const win = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);

  const exportCsv = () => {
    const lines: (string | number)[][] = [t.tb.cols, ...table.map(cells)];
    const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'producteurs_c3.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rp" lang={lang}>
      <style>{CSS}</style>

      <header className="rp-h">
        <div className="rp-t"><Leaf size={26} color="#16a34a" />{t.title}</div>
        <button className="rp-btn np" onClick={() => { reset(); load(); }} disabled={busy} aria-label={t.rf}><RefreshCw size={18} /><span>{t.rf}</span></button>
      </header>

      {err && <div className="rp-c" role="alert">{fmt(t.er, DATA.producteurs)}</div>}
      {!raw && !err && <div className="rp-c">{t.ld}</div>}

      {raw && (<>
        {/* ===== Filtres : 4 principaux + « plus de filtres » ===== */}
        <section className="np">
          <div className="rp-f">
            {PRIMARY.map(sel)}
            <button className="rp-btn l" aria-expanded={more} aria-label={t.more} onClick={() => setMore(!more)}>
              <SlidersHorizontal size={16} /><span>{t.more}</span>{nSec > 0 && <em className="rp-n">{nSec}</em>}
            </button>
            {nAct > 0 && <button className="rp-btn l" aria-label={t.reset} onClick={reset}><RotateCcw size={16} /><span>{t.reset}</span></button>}
          </div>
          {more && <div className="rp-f rp-f2">{SECOND.map(sel)}</div>}
        </section>

        {/* ===== Ligne 1 : cible, donuts, catégories ===== */}
        <section className="rp-top">
          <div className="rp-c tg">
            <div className="rp-ct">{t.tgt}</div>
            <div className="rp-sub">{fmt(t.tgtSub, nf(TARGET))}</div>
            <div className="rp-big">{nf(prod)}</div>
            <div className="rp-bs">{fmt(t.of, nf(TARGET))}</div>
            <div className="rp-pb"><b style={{ width: `${Math.min(100, prog)}%` }} /></div>
            <div className="rp-pv">{pct(prog)}</div>
            <div className="rp-tg">{fmt(t.target, nf(TARGET))}</div>
          </div>
          {[{ title: t.fem, v: women }, { title: t.yth, v: youth }].map((d) => (
            <div className="rp-c rp-ctr" key={d.title}>
              <div className="rp-dt">{d.title}</div>
              <Donut v={d.v} label={pct(d.v)} />
            </div>
          ))}
          <div className="rp-c wide">
            <div className="rp-ct">{t.cat}</div>
            <div className="rp-tw">
              <table style={{ minWidth: 520 }}>
                <thead><tr>{t.cols.map((h) => <th key={h}>{fmt(h, nf(TARGET))}</th>)}</tr></thead>
                <tbody>
                  {byType.map((r) => (
                    <tr key={r.k}><td style={{ fontWeight: 600 }}>{r.k === 'IND' ? t.ind : t.grp}</td><td className="c">{nf(r.p)}</td><td className="c">{pct(r.share)}</td><td className="c">{pct(r.w)}</td><td className="c">{pct(r.y)}</td></tr>
                  ))}
                  <tr className="tot"><td>{t.tot}</td><td className="c">{nf(prod)}</td><td className="c">{pct(prog)}</td><td className="c">{pct(women)}</td><td className="c">{pct(youth)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ===== Ligne 2 : évolution, parcours, carte ===== */}
        <section className="rp-mid">
          <div className="rp-c wide">
            <div className="rp-ct">{t.evol}</div>
            <div className="rp-lg2">
              {SERIES.map((s) => (
                <button key={s.k} onClick={() => setVis({ ...vis, [s.k]: !vis[s.k] })} aria-pressed={vis[s.k]} style={{ opacity: vis[s.k] ? 1 : 0.4 }}>
                  <i style={{ background: s.c }} />{t[s.l]}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={narrow ? 220 : 270}>
              <LineChart data={evol} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="year" axisLine={{ stroke: '#9ca3af' }} tickLine={false} tick={{ fontSize: 11, fill: 'var(--mut)' }} padding={{ left: 15, right: 15 }} />
                <YAxis tickFormatter={formatK} axisLine={{ stroke: '#9ca3af' }} tickLine={false} tick={{ fontSize: 11, fill: 'var(--mut)' }} width={44} />
                <Tooltip formatter={(v: any) => nf(v)} contentStyle={{ backgroundColor: 'var(--card)', color: 'var(--ink)', borderRadius: 12, border: '1px solid var(--line)' }} itemStyle={{ color: 'var(--ink)' }} labelStyle={{ color: 'var(--ink)' }} />
                <Legend content={() => null} />
                {SERIES.map((s) => vis[s.k] && (
                  <Line key={s.k} type="monotone" dataKey={s.k} name={t[s.n]} stroke={s.c} strokeWidth={s.k === 'cible' ? 2 : 3}
                    strokeDasharray={s.k === 'cible' ? '5 5' : undefined}
                    dot={s.k === 'cible' ? false : { r: 4, fill: 'var(--card)', stroke: s.c, strokeWidth: 2 }} activeDot={{ r: 7 }}
                    isAnimationActive animationDuration={1200} animationEasing="ease-out"
                    label={s.k === 'cible' ? undefined : { position: 'top', fontSize: 10, fill: s.c }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rp-c rp-pc">
            <div className="rp-ct">{t.path}</div>
            <div className="rp-flow">
              {path.map((x, i) => (
                <React.Fragment key={x.k}>
                  {i > 0 && <div className="rp-ar"><span aria-hidden="true">↓</span><b>{pct(x.conv)}</b>{t[i === 1 ? 'step1' : 'step2']}</div>}
                  <div className="rp-box" style={{ borderColor: x.b }}>
                    <div className="rp-ic" style={{ background: x.bg, color: x.c }}><x.Ic size={20} /></div>
                    <div className="rp-pt">
                      <div className="rp-pl">{t[x.lab]}</div>
                      <div className="rp-mb"><b style={{ width: `${Math.min(100, x.p)}%`, background: x.c }} /></div>
                    </div>
                    <div className="rp-pr">
                      <div className="rp-pvv" style={{ color: x.c }}>{nf(x.v)}</div>
                      <div className="rp-pp">({pct(x.p)})</div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="rp-note">{fmt(t.note, nf(ben))}</div>
          </div>

          <div className="rp-c">
            <div className="rp-ct">{t.map}</div>
            <div className="rp-map">
              <MapContainer center={[-18.9, 47.5]} zoom={5} scrollWheelZoom={!narrow} style={{ width: '100%', height: 'clamp(260px,38vw,340px)', borderRadius: 14 }}>
                <TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                <Pane name="admin" style={{ zIndex: 350 }}>
                  {layers.map((ly) => (
                    <GeoJSON key={ly.key} data={{ type: 'FeatureCollection', features: ly.features } as any} pane="admin" interactive={!!ly.click}
                      style={() => ly.style}
                      onEachFeature={ly.click ? (ft: any, lay: any) => lay.on({ click: () => pickRef.current(ly.click as Lvl, ft.properties) }) : undefined} />
                  ))}
                </Pane>
                {spots.map((s) => (
                  <CircleMarker key={`${s.lat}-${s.lng}-${s.name}`} center={[s.lat, s.lng]} radius={10}
                    pathOptions={{ fillColor: colorOf(s.p), color: '#fff', weight: 1.5, fillOpacity: 0.85 }}>
                    <Popup><b>{s.name}</b><br />{t.pop} {nf(s.p)}</Popup>
                  </CircleMarker>
                ))}
                <Fit pts={fitPts} />
              </MapContainer>
              <div className="rp-lgd">
                <b>{t.lg}</b>
                {CLASSES.map((k) => <div className="rp-lr" key={k.c}><i style={{ background: k.c }} />{k.l}</div>)}
              </div>
            </div>
            <div className="rp-note" style={{ marginTop: 8 }}>{t.hint}</div>
          </div>
        </section>

        {/* ===== Tableau détaillé ===== */}
        <section className="rp-c" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="rp-bh">
            <div className="rp-bt">{t.tb.title}</div>
            <div className="rp-ba">
              <span className="rp-sb">
                <Search size={16} color="var(--mut)" />
                <input placeholder={t.tb.search} aria-label={t.tb.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </span>
              <button className="rp-btn l np" onClick={exportCsv}>{t.tb.exp}<Download size={16} /></button>
            </div>
          </div>
          <div className="rp-tw">
            <table style={{ minWidth: 1000 }}>
              <thead><tr>{t.tb.cols.map((h, i) => <th key={i} className={HEAD[i]}>{h}</th>)}</tr></thead>
              <tbody>
                {slice.map((r) => {
                  const c = cells(r);
                  return (
                    <tr key={r.id}>
                      {c.map((v, i) => <td key={i} className={[1, 3, 4, 6, 7, 9].includes(i) ? 'c' : 's'}>{v}</td>)}
                    </tr>
                  );
                })}
                {!slice.length && <tr><td colSpan={10}>{t.tb.none}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="rp-pg np">
            <div>{table.length ? fmt(t.tb.show, nf((cur - 1) * per + 1), nf(Math.min(cur * per, table.length)), nf(table.length)) : '0'}</div>
            <div>
              <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label={t.tb.prev}>‹</button>
              {win.map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 && p - win[i - 1] > 1 && <span>…</span>}
                  <button className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
                </React.Fragment>
              ))}
              <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label={t.tb.next}>›</button>
            </div>
            <div>
              <span>{t.tb.rows}</span>
              <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}>
                {[5, 10, 15, 20].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </section>
      </>)}
    </div>
  );
}
