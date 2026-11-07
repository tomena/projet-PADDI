import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
  Legend, LabelList, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Target, GraduationCap, ClipboardCheck, CheckCircle2, Printer, Download, RotateCcw, Search, SlidersHorizontal, RefreshCw,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

/* =====================================================================
   SUIVI DES PETITS EXPLOITANTS – page unique (Indicateur 1 + Indicateur 2)
   Dépendances : react, recharts, lucide-react (déjà dans votre projet)
   ===================================================================== */

type Lang = 'fr' | 'mg' | 'en' | 'de';
type Cat = 'C2' | 'C3' | 'C4';
type St = 'valid' | 'pending' | 'rejected';
interface Act {
  id: string; cat: Cat; region: string; ap: string; paysage: string; district: string; commune: string; fokontany: string; mbv: string; sk: number;
  year: number; date: string; p: number; w: number; y: number; enq: number; ok: number; st: St; lat: number; lng: number;
}

/* ---------- Paramètres du projet ---------- */
const GEO_URL = '/data/beneficiaires.geojson'; // à placer dans public/data/
const DEF_TARGET = 25000;   // cible (surchargée par metadata.cible_total)
const DEF_CONF = 80;        // % confirmation (metadata.cible_confirmation)
const DEF_START = 2025;     // metadata.debut
const DEF_END = 2030;       // metadata.fin
interface Meta { cible_total?: number; cible_confirmation?: number; debut?: number; fin?: number }
const CATS: Cat[] = ['C2', 'C3', 'C4'];
const CATC: Record<Cat, string> = { C2: '#2e7d32', C3: '#1976d2', C4: '#f9a825' };
const STC: Record<St, string> = { valid: '#2e7d32', pending: '#f9a825', rejected: '#c62828' };
const WOMEN = '#2e7d32';
const YOUTH = '#1976d2';
const RED = '#c62828';
const LOC: Record<Lang, string> = { fr: 'fr-FR', mg: 'fr-FR', en: 'en-US', de: 'de-DE' };
const LI: Record<Lang, number> = { fr: 0, mg: 1, en: 2, de: 3 };

/* ---------- Compétences : [fr, mg, en, de] ---------- */
const SK: string[][] = [
  ['Techniques de compostage', 'Teknika fanaovana zezika organika', 'Composting techniques', 'Kompostierungstechniken'],
  ['Gestion intégrée des cultures', 'Fitantanana mitambatra ny voly', 'Integrated crop management', 'Integrierter Pflanzenbau'],
  ['Agroforesterie', 'Fambolena mitambatra amin’ny hazo', 'Agroforestry', 'Agroforstwirtschaft'],
  ['Transformation des produits agricoles', 'Fanodinana ny vokatra fambolena', 'Processing of agricultural products', 'Verarbeitung landwirtschaftlicher Produkte'],
  ['Gestion financière / tenue de caisse', 'Fitantanam-bola / bokin’ny kaonty', 'Financial management / cash book', 'Finanzmanagement / Kassenführung'],
  ['Commercialisation et marketing', 'Varotra sy marketing', 'Marketing and sales', 'Vermarktung und Marketing'],
  ['Élevage amélioré', 'Fiompiana nohatsaraina', 'Improved livestock farming', 'Verbesserte Tierhaltung'],
  ['Gestion durable des ressources naturelles', 'Fitantanana maharitra ny harena voajanahary', 'Sustainable natural resource management', 'Nachhaltiges Management natürlicher Ressourcen'],
  ['Utilisation d’intrants biologiques', 'Fampiasana akora organika', 'Use of organic inputs', 'Einsatz biologischer Betriebsmittel'],
  ['Planification de la production', 'Fandrafetana ny famokarana', 'Production planning', 'Produktionsplanung'],
];

/* ---------- Traductions ---------- */
const fr = {
  title: 'Suivi des petits exploitants', print: 'Imprimer', reset: 'Réinitialiser', all: 'Tous', lang: 'Langue',
  map: 'Localisation des activités', ld: 'Chargement des activités…', er: 'Chargement impossible. Vérifiez que {0} est accessible, puis actualisez.', rf: 'Actualiser', more: 'Plus de filtres',
  f: { year: 'Année', region: 'Région', ap: 'Aire protégée', paysage: 'Paysage', district: 'District', commune: 'Commune', fokontany: 'Fokontany', mbv: 'Micro-bassin versant', cat: 'Catégorie', st: 'Statut' },
  st: { valid: 'Validé', pending: 'En attente', rejected: 'Rejeté' },
  s1: '1. Atteinte de l’objectif : {0} petits exploitants agricoles (C2, C3 et C4)',
  s2: '2. Inclusion : femmes et jeunes (< 35 ans)',
  s3: '3. Confirmation de l’amélioration des compétences techniques et entrepreneuriales',
  s4: '4. Données détaillées',
  k: { total: 'Petits exploitants validés', of: 'sur {0}', rate: 'Taux d’atteinte', gap: 'Écart à la trajectoire', exp: 'attendu fin {0} : {1}', decl: 'Déclarés par le prestataire', vp: '{0} % validés · {1} activités', w: 'Part des femmes', y: 'Part des jeunes (< 35 ans)', p: '{0} personnes' },
  c: { cat: 'Répartition par catégorie', evol: 'Évolution cumulée et trajectoire cible', reg: 'Bénéficiaires validés par région', inclC: 'Femmes et jeunes par catégorie (%)', inclY: 'Femmes et jeunes par année (%)', qual: 'Qualité des données (statut de validation)' },
  cols: { cat: 'Catégorie', act: 'Activités', ben: 'Bénéficiaires', share: '% du total', w: '% Femmes', y: '% Jeunes', tot: 'Total' },
  ev: { decl: 'Déclaré', val: 'Validé', tar: 'Trajectoire cible' },
  cf: { enq: 'Personnes enquêtées', ok: 'Amélioration confirmée', rate: 'Taux de confirmation', tar: 'Cible : {0} %', cov: 'Couverture de l’enquête', ci: 'IC 95 % : ± {0} pts', met: 'Cible atteinte', not: 'Cible non atteinte', ms: 'Jalons de collecte', m1: 'Suivi', m2: 'Mi-parcours', m3: 'Finale', done: 'Réalisé', soon: 'À venir', byCat: 'Taux de confirmation par catégorie (%)', sk: 'Compétences confirmées (Top 10, % des confirmations)', none: 'Aucune enquête pour ces filtres.' },
  ab: { t: 'À propos de l’indicateur', p1: 'Indicateur 2 : 80 % des bénéficiaires confirment, exemples à l’appui, avoir amélioré leurs compétences techniques et entrepreneuriales pour mettre en œuvre des pratiques durables et valoriser les produits de l’agriculture, de la sylviculture et de l’élevage.', p2: 'La confirmation repose sur des enquêtes auprès d’un échantillon représentatif de bénéficiaires. Seules les activités validées sont comptées.', C2: 'Formations collectives', C3: 'Appui individuel / groupements', C4: 'Appui aux entrepreneurs' },
  tb: { title: 'Activités et bénéficiaires ({0})', search: 'Rechercher…', exp: 'Exporter CSV', cols: ['ID activité', 'Catégorie', 'Région', 'Aire protégée', 'District', 'Commune', 'Intitulé', 'Participants', 'Femmes', 'Jeunes < 35 ans', 'Date', 'Statut'], none: 'Aucune activité pour ces filtres.', show: '{0}–{1} sur {2}', rows: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page' },
};
type D = typeof fr;
const mg: D = {
  title: 'Fanaraha-maso ny mpamboly madinika', print: 'Hanonta', reset: 'Averina', all: 'Rehetra', lang: 'Fiteny',
  map: 'Toerana misy ny hetsika', ld: 'Mampiditra ny hetsika…', er: 'Tsy afaka naka ny angona. Jereo raha azo vakiana ny {0}, avy eo havaozy.', rf: 'Havaozina', more: 'Sivana hafa',
  f: { year: 'Taona', region: 'Faritra', ap: 'Faritra arovana', paysage: 'Tontolo', district: 'Distrika', commune: 'Kaominina', fokontany: 'Fokontany', mbv: 'Tambatra-drano kely', cat: 'Sokajy', st: 'Sata' },
  st: { valid: 'Nekena', pending: 'Miandry', rejected: 'Nolavina' },
  s1: '1. Fahatratrarana ny tanjona : mpamboly madinika {0} (C2, C3 ary C4)',
  s2: '2. Fampidirana : vehivavy sy tanora (< 35 taona)',
  s3: '3. Fanamarinana ny fanatsarana ny fahaizana ara-teknika sy ara-pandraharahana',
  s4: '4. Angona amin’ny antsipiriany',
  k: { total: 'Mpamboly madinika nekena', of: 'amin’ny {0}', rate: 'Tahan’ny fahatratrarana', gap: 'Elanelana amin’ny làlana', exp: 'andrasana tamin’ny faran’ny {0} : {1}', decl: 'Ambaran’ny mpanome serivisy', vp: '{0} % nekena · hetsika {1}', w: 'Anjaran’ny vehivavy', y: 'Anjaran’ny tanora (< 35 taona)', p: 'olona {0}' },
  c: { cat: 'Fizarana araka ny sokajy', evol: 'Fivoaran’ny fitambarana sy làlana tanjona', reg: 'Mpahazo tombontsoa nekena isaky ny faritra', inclC: 'Vehivavy sy tanora araka ny sokajy (%)', inclY: 'Vehivavy sy tanora isan-taona (%)', qual: 'Kalitaon’ny angona (sata fankatoavana)' },
  cols: { cat: 'Sokajy', act: 'Hetsika', ben: 'Mpahazo tombontsoa', share: '% amin’ny total', w: '% Vehivavy', y: '% Tanora', tot: 'Total' },
  ev: { decl: 'Voambara', val: 'Nekena', tar: 'Làlana tanjona' },
  cf: { enq: 'Olona nanontaniana', ok: 'Fanatsarana voamarina', rate: 'Tahan’ny fanamarinana', tar: 'Tanjona : {0} %', cov: 'Fetran’ny fanadihadiana', ci: 'IC 95 % : ± {0} teboka', met: 'Tratra ny tanjona', not: 'Tsy tratra ny tanjona', ms: 'Dingana fanangonana', m1: 'Fanaraha-maso', m2: 'Antonony', m3: 'Farany', done: 'Vita', soon: 'Ho avy', byCat: 'Tahan’ny fanamarinana araka ny sokajy (%)', sk: 'Fahaizana voamarina (Top 10, % amin’ny fanamarinana)', none: 'Tsy misy fanadihadiana ho an’ireo sivana ireo.' },
  ab: { t: 'Mikasika ny tondro', p1: 'Tondro 2 : 80 % amin’ny mpahazo tombontsoa no manamarina, miaraka amin’ny ohatra, fa nanatsara ny fahaizany ara-teknika sy ara-pandraharahana mba hampihatra fomba maharitra sy hanomezam-boka ny vokatra avy amin’ny fambolena, ny ala ary ny fiompiana.', p2: 'Ny fanamarinana dia miorina amin’ny fanadihadiana ny santionan’ny mpahazo tombontsoa maneho ny rehetra. Ny hetsika nekena ihany no isaina.', C2: 'Fampianarana iraisana', C3: 'Fanampiana manokana / vondrona', C4: 'Fanampiana ho an’ny mpandraharaha' },
  tb: { title: 'Hetsika sy mpahazo tombontsoa ({0})', search: 'Hikaroka…', exp: 'Hamoaka CSV', cols: ['ID hetsika', 'Sokajy', 'Faritra', 'Faritra arovana', 'Distrika', 'Kaominina', 'Lohateny', 'Mpandray anjara', 'Vehivavy', 'Tanora < 35 taona', 'Daty', 'Sata'], none: 'Tsy misy hetsika mifanaraka amin’ireo sivana ireo.', show: '{0} – {1} amin’ny {2}', rows: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany' },
};
const en: D = {
  title: 'Smallholder farmers monitoring', print: 'Print', reset: 'Reset', all: 'All', lang: 'Language',
  map: 'Activity locations', ld: 'Loading activities…', er: 'Unable to load data. Check that {0} is reachable, then refresh.', rf: 'Refresh', more: 'More filters',
  f: { year: 'Year', region: 'Region', ap: 'Protected area', paysage: 'Landscape', district: 'District', commune: 'Municipality', fokontany: 'Fokontany', mbv: 'Micro-watershed', cat: 'Category', st: 'Status' },
  st: { valid: 'Validated', pending: 'Pending', rejected: 'Rejected' },
  s1: '1. Target achievement: {0} smallholder farmers (C2, C3 and C4)',
  s2: '2. Inclusion: women and youth (< 35 years)',
  s3: '3. Confirmation of improved technical and entrepreneurial skills',
  s4: '4. Detailed data',
  k: { total: 'Validated smallholder farmers', of: 'out of {0}', rate: 'Achievement rate', gap: 'Gap to trajectory', exp: 'expected end of {0}: {1}', decl: 'Reported by the contractor', vp: '{0} % validated · {1} activities', w: 'Share of women', y: 'Share of youth (< 35 years)', p: '{0} people' },
  c: { cat: 'Breakdown by category', evol: 'Cumulative trend and target trajectory', reg: 'Validated beneficiaries by region', inclC: 'Women and youth by category (%)', inclY: 'Women and youth by year (%)', qual: 'Data quality (validation status)' },
  cols: { cat: 'Category', act: 'Activities', ben: 'Beneficiaries', share: '% of total', w: '% Women', y: '% Youth', tot: 'Total' },
  ev: { decl: 'Reported', val: 'Validated', tar: 'Target trajectory' },
  cf: { enq: 'People surveyed', ok: 'Improvement confirmed', rate: 'Confirmation rate', tar: 'Target: {0} %', cov: 'Survey coverage', ci: '95 % CI: ± {0} pts', met: 'Target met', not: 'Target not met', ms: 'Data collection milestones', m1: 'Follow-up', m2: 'Mid-term', m3: 'Final', done: 'Completed', soon: 'Upcoming', byCat: 'Confirmation rate by category (%)', sk: 'Confirmed skills (Top 10, % of confirmations)', none: 'No survey for these filters.' },
  ab: { t: 'About the indicator', p1: 'Indicator 2: 80 % of beneficiaries confirm, with examples, that they have improved their technical and entrepreneurial skills to implement sustainable practices and add value to agricultural, forestry and livestock products.', p2: 'Confirmation is based on surveys of a representative sample of beneficiaries. Only validated activities are counted.', C2: 'Group training', C3: 'Individual support / groups', C4: 'Support to entrepreneurs' },
  tb: { title: 'Activities and beneficiaries ({0})', search: 'Search…', exp: 'Export CSV', cols: ['Activity ID', 'Category', 'Region', 'Protected area', 'District', 'Municipality', 'Title', 'Participants', 'Women', 'Youth < 35', 'Date', 'Status'], none: 'No activity matches these filters.', show: '{0}–{1} of {2}', rows: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page' },
};
const de: D = {
  title: 'Überwachung der Kleinbauern', print: 'Drucken', reset: 'Zurücksetzen', all: 'Alle', lang: 'Sprache',
  map: 'Standorte der Aktivitäten', ld: 'Aktivitäten werden geladen…', er: 'Laden nicht möglich. Prüfen Sie, ob {0} erreichbar ist, und aktualisieren Sie dann.', rf: 'Aktualisieren', more: 'Weitere Filter',
  f: { year: 'Jahr', region: 'Region', ap: 'Schutzgebiet', paysage: 'Landschaft', district: 'Distrikt', commune: 'Gemeinde', fokontany: 'Fokontany', mbv: 'Mikro-Einzugsgebiet', cat: 'Kategorie', st: 'Status' },
  st: { valid: 'Validiert', pending: 'Ausstehend', rejected: 'Abgelehnt' },
  s1: '1. Zielerreichung: {0} Kleinbauern (C2, C3 und C4)',
  s2: '2. Inklusion: Frauen und Jugendliche (< 35 Jahre)',
  s3: '3. Bestätigung der verbesserten technischen und unternehmerischen Kompetenzen',
  s4: '4. Detaillierte Daten',
  k: { total: 'Validierte Kleinbauern', of: 'von {0}', rate: 'Zielerreichung', gap: 'Abweichung vom Zielpfad', exp: 'erwartet Ende {0}: {1}', decl: 'Vom Dienstleister gemeldet', vp: '{0} % validiert · {1} Aktivitäten', w: 'Frauenanteil', y: 'Anteil Jugendlicher (< 35 Jahre)', p: '{0} Personen' },
  c: { cat: 'Verteilung nach Kategorie', evol: 'Kumulierte Entwicklung und Zielpfad', reg: 'Validierte Begünstigte nach Region', inclC: 'Frauen und Jugendliche nach Kategorie (%)', inclY: 'Frauen und Jugendliche nach Jahr (%)', qual: 'Datenqualität (Validierungsstatus)' },
  cols: { cat: 'Kategorie', act: 'Aktivitäten', ben: 'Begünstigte', share: '% des Gesamtwerts', w: '% Frauen', y: '% Jugend', tot: 'Gesamt' },
  ev: { decl: 'Gemeldet', val: 'Validiert', tar: 'Zielpfad' },
  cf: { enq: 'Befragte Personen', ok: 'Verbesserung bestätigt', rate: 'Bestätigungsquote', tar: 'Ziel: {0} %', cov: 'Erhebungsabdeckung', ci: '95-%-KI: ± {0} Pkt.', met: 'Ziel erreicht', not: 'Ziel nicht erreicht', ms: 'Erhebungsmeilensteine', m1: 'Nachverfolgung', m2: 'Halbzeit', m3: 'Abschluss', done: 'Abgeschlossen', soon: 'Bevorstehend', byCat: 'Bestätigungsquote nach Kategorie (%)', sk: 'Bestätigte Kompetenzen (Top 10, % der Bestätigungen)', none: 'Keine Erhebung für diese Filter.' },
  ab: { t: 'Zum Indikator', p1: 'Indikator 2: 80 % der Begünstigten bestätigen anhand von Beispielen, ihre technischen und unternehmerischen Kompetenzen verbessert zu haben, um nachhaltige Praktiken umzusetzen und Erzeugnisse aus Landwirtschaft, Forstwirtschaft und Viehhaltung aufzuwerten.', p2: 'Die Bestätigung beruht auf Befragungen einer repräsentativen Stichprobe der Begünstigten. Nur validierte Aktivitäten werden gezählt.', C2: 'Gruppenschulungen', C3: 'Einzelberatung / Gruppen', C4: 'Unterstützung von Unternehmern' },
  tb: { title: 'Aktivitäten und Begünstigte ({0})', search: 'Suchen…', exp: 'CSV exportieren', cols: ['Aktivitäts-ID', 'Kategorie', 'Region', 'Schutzgebiet', 'Distrikt', 'Gemeinde', 'Titel', 'Teilnehmende', 'Frauen', 'Jugend < 35', 'Datum', 'Status'], none: 'Keine Aktivität für diese Filter.', show: '{0}–{1} von {2}', rows: 'Zeilen pro Seite', first: 'Erste Seite', prev: 'Vorherige Seite', next: 'Nächste Seite', last: 'Letzte Seite' },
};
const TR: Record<Lang, D> = { fr, mg, en, de };
const fmt = (s: string, ...a: (string | number)[]) => s.replace(/\{(\d)\}/g, (_, i) => String(a[+i]));

/* ---------- Conversion GeoJSON -> activités ---------- */
const ST_MAP: Record<string, St> = { 'Validé': 'valid', 'Valide': 'valid', 'En attente': 'pending', 'Rejeté': 'rejected', valid: 'valid', pending: 'pending', rejected: 'rejected' };
// Un intitulé inconnu est ajouté tel quel (non traduit) à la liste des compétences.
const skIdx = (name: string) => {
  let i = SK.findIndex((x) => x[0] === name);
  if (i < 0) { SK.push([name, name, name, name]); i = SK.length - 1; }
  return i;
};
const toAct = (x: any): Act | null => {
  const p = x?.properties;
  const c = x?.geometry?.coordinates;
  if (!p || !CATS.includes(p.categorie)) return null;
  const s = (v: any) => (v == null ? '' : String(v));
  return {
    id: s(p.id), cat: p.categorie, region: s(p.region), ap: s(p.aire_protegee), paysage: s(p.paysage), district: s(p.district),
    commune: s(p.commune), fokontany: s(p.fokontany), mbv: s(p.mbv), sk: skIdx(s(p.intitule)),
    year: Number(p.annee) || new Date(p.date).getUTCFullYear(), date: s(p.date),
    p: Number(p.participants) || 0, w: Number(p.femmes) || 0, y: Number(p.jeunes) || 0,
    enq: Number(p.enquetes) || 0, ok: Number(p.confirmes) || 0, st: ST_MAP[s(p.statut)] ?? 'pending',
    lat: Array.isArray(c) ? Number(c[1]) : NaN, lng: Array.isArray(c) ? Number(c[0]) : NaN,
  };
};
const hasXY = (r: Act) => Number.isFinite(r.lat) && Number.isFinite(r.lng);

const Fit = ({ pts }: { pts: [number, number][] }) => {
  const map = useMap();
  useEffect(() => { if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 11 }); }, [pts, map]);
  return null;
};

/* ---------- Helpers ---------- */
const sum = (a: Act[], k: 'p' | 'w' | 'y' | 'enq' | 'ok') => a.reduce((t, r) => t + r[k], 0);
const pc = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const FK = ['year', 'region', 'ap', 'paysage', 'district', 'commune', 'fokontany', 'mbv', 'cat', 'st'] as const;
type K = (typeof FK)[number];
const PRIMARY: K[] = ['year', 'region', 'cat', 'st'];
const SECOND: K[] = ['ap', 'paysage', 'district', 'commune', 'fokontany', 'mbv'];

const CSS = `
.sv{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f3f5f1;min-height:100vh;color:#1c2b24;font-size:14px}
.sv *{box-sizing:border-box}
.sv-h{position:sticky;top:0;z-index:20;background:#0b5d1e;color:#fff;padding:10px clamp(10px,2vw,24px);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.sv-h h2{margin:0;font-size:clamp(16px,2.4vw,22px);display:flex;align-items:center;gap:8px}
.sv-hb{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sv-b{display:inline-flex;align-items:center;gap:6px;border-radius:8px;border:1px solid transparent;padding:7px 12px;font-weight:700;font-size:13px;cursor:pointer;min-height:36px;background:#2e7d32;color:#fff}
.sv-b.o{background:transparent;color:#fff;border-color:rgba(255,255,255,.6)}
.sv-b.l{background:#fff;color:#1c2b24;border-color:#c9d1cb}
.sv :focus-visible{outline:3px solid #f9a825;outline-offset:2px}
.sv-w{padding:clamp(8px,2vw,24px);display:flex;flex-direction:column;gap:14px;max-width:1600px;margin:0 auto}
.sv-demo{background:#fff8e1;border:1px solid #f9a825;border-radius:8px;padding:8px 12px;font-size:12px}
.sv-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;align-items:end}
.sv-f label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#374151}
.sv select,.sv input{height:38px;border-radius:8px;border:1px solid #c9d1cb;padding:0 10px;background:#fff;font-size:13px;width:100%;min-width:0}
.sv-s{display:flex;align-items:center;gap:8px;background:#2e7d32;color:#fff;margin:6px 0 0;padding:9px 12px;border-radius:8px;font-size:clamp(13px,1.6vw,16px)}
.sv-f2{margin-top:8px;padding:10px;background:#fff;border:1px solid #e1e6e2;border-radius:10px}
.sv-n{background:#f9a825;color:#1c2b24;border-radius:10px;padding:0 6px;font-size:11px;font-style:normal}
.g{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.g2{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.c{background:#fff;border-radius:10px;padding:12px;border:1px solid #e1e6e2;min-width:0}
.c h4{margin:0 0 8px;font-size:13px;color:#1b5e20}
.big{font-size:clamp(24px,3.4vw,34px);font-weight:800;line-height:1.1}
.sub{font-size:12px;color:#556;margin-top:4px}
.bar{height:10px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin-top:8px}
.bar b{display:block;height:100%}
.dn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;pointer-events:none}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
.sv table{width:100%;border-collapse:collapse;font-size:12px;text-align:center}
.sv th{background:#2e7d32;color:#fff;padding:8px 6px;border:1px solid #cfd8d1;white-space:nowrap}
.sv td{padding:7px 6px;border:1px solid #e1e6e2}
.sv td.l{text-align:left}
.sv tr.tot td{background:#e8f5e9;font-weight:700}
.row{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:8px}
.row i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.ms{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.ms>div{border:1px solid #d0d0d0;border-radius:10px;padding:10px;text-align:center}
.ab{background:rgba(46,125,50,.06);border-color:#2e7d32}
.ab p{font-size:12px;line-height:1.55;margin:0 0 8px;max-width:70ch}
.tb{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px}
.tb>div{display:flex;gap:8px;flex-wrap:wrap}
.pg{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px}
.pg div{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.pg button{min-width:34px;height:34px;border:1px solid #c9d1cb;background:#fff;border-radius:6px;cursor:pointer;font-weight:600}
.pg button.on{background:#1b5e20;color:#fff;border-color:#1b5e20}
.pg button:disabled{opacity:.4;cursor:default}
.pg label{display:flex;align-items:center;gap:6px}
.pg select{width:auto}
@media (max-width:600px){.sv-b span{display:none}.sv-s{align-items:flex-start}.tb input{width:100%}}
@media (prefers-reduced-motion:reduce){.sv *{transition:none!important;animation:none!important}}
@media print{.np{display:none!important}.sv{background:#fff}.sv-h{position:static}.c{break-inside:avoid}}
`;

const Sec = ({ icon: Ic, text }: { icon: React.ComponentType<any>; text: string }) => (
  <h3 className="sv-s"><Ic size={18} style={{ flexShrink: 0 }} />{text}</h3>
);
const Kpi = ({ title, big, sub, color = '#2e7d32', bar, sub2 }: { title: string; big: string; sub?: string; sub2?: string; color?: string; bar?: number }) => (
  <div className="c">
    <h4>{title}</h4>
    <div className="big" style={{ color }}>{big}</div>
    {sub && <div className="sub">{sub}</div>}
    {sub2 && <div className="sub" style={{ marginTop: 0 }}>{sub2}</div>}
    {bar !== undefined && <div className="bar"><b style={{ width: `${Math.min(100, bar)}%`, background: color }} /></div>}
  </div>
);
const Donut = ({ v, color, label }: { v: number; color: string; label: string }) => (
  <div style={{ position: 'relative', height: 150 }}>
    <ResponsiveContainer>
      <PieChart>
        <Pie data={[{ n: 'a', v: Math.min(100, v) }, { n: 'b', v: Math.max(0, 100 - v) }]} dataKey="v" innerRadius="64%" outerRadius="90%" startAngle={90} endAngle={-270} stroke="none">
          <Cell fill={color} /><Cell fill="#e5e7eb" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
    <div className="dn" style={{ color }}>{label}</div>
  </div>
);

const useNarrow = () => {
  const [n, setN] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  React.useEffect(() => {
    const on = () => setN(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
};

/* ===================================================================== */
const Beneficiaires: React.FC = () => {
  // Langue choisie au démarrage de l'application (LanguageContext)
  const ctx: any = useLanguage() || {};
  const lc = ctx.lang ?? ctx.language;
  const lang: Lang = lc === 'mg' || lc === 'en' || lc === 'de' ? lc : 'fr';
  const t = TR[lang];
  const narrow = useNarrow();
  const nf = (n: number, d = 0) => n.toLocaleString(LOC[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n: number) => `${nf(n, 1)} %`;
  const sk = (i: number) => SK[i][LI[lang]];

  const [raw, setRaw] = useState<Act[] | null>(null);
  const [meta, setMeta] = useState<Meta>({});
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const acts = useMemo(() => raw ?? [], [raw]);
  const TARGET = meta.cible_total ?? DEF_TARGET;
  const TARGET_CONF = meta.cible_confirmation ?? DEF_CONF;
  const START = meta.debut ?? DEF_START;
  const END = meta.fin ?? DEF_END;

  const load = () => {
    setErr(false);
    setBusy(true);
    fetch(GEO_URL, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((g) => { setMeta(g.metadata || {}); setRaw((g.features || []).map(toAct).filter(Boolean) as Act[]); })
      .catch(() => setErr(true))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const [f, setF] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [more, setMore] = useState(false);

  const match = (a: Act, skip?: K) => FK.every((k) => k === skip || !f[k] || String(a[k === 'st' ? 'st' : k]) === f[k]);
  const rows = useMemo(() => acts.filter((a) => match(a)), [f, acts]); // eslint-disable-line
  const opts = (k: K) => [...new Set(acts.filter((a) => match(a, k)).map((a) => String(a[k])))].sort();
  const reset = () => { setF({}); setQ(''); setPage(1); setPer(10); };
  const nAct = FK.filter((k) => f[k]).length;
  const nSec = SECOND.filter((k) => f[k]).length;
  const sel = (k: K) => (
    <label key={k}>{t.f[k]}
      <select value={f[k] || ''} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setPage(1); }}>
        <option value="">{t.all}</option>
        {opts(k).map((o) => <option key={o} value={o}>{k === 'st' ? t.st[o as St] : o}</option>)}
      </select>
    </label>
  );

  const pts = useMemo<[number, number][]>(() => rows.filter(hasXY).map((r) => [r.lat, r.lng]), [rows]);

  /* ----- Indicateur 1 ----- */
  const val = rows.filter((r) => r.st === 'valid');
  const reach = sum(val, 'p');
  const decl = sum(rows, 'p');
  const cy = new Date().getFullYear();
  const nY = END - START + 1;
  const expected = TARGET * Math.max(0, Math.min(1, (cy - START + 1) / nY));
  const gap = sum(acts.filter((r) => r.st === 'valid'), 'p') - expected;
  const women = pc(sum(val, 'w'), reach);
  const youth = pc(sum(val, 'y'), reach);

  const base = acts.filter((a) => match(a, 'year'));
  const evol = Array.from({ length: nY }, (_, i) => {
    const y = START + i;
    const past = y <= cy;
    return {
      y: String(y),
      decl: past ? sum(base.filter((r) => r.year <= y), 'p') : null,
      val: past ? sum(base.filter((r) => r.year <= y && r.st === 'valid'), 'p') : null,
      tar: Math.round((TARGET * (i + 1)) / nY),
    };
  });
  const byCat = CATS.map((c) => {
    const a = val.filter((r) => r.cat === c);
    const p = sum(a, 'p');
    return { c, n: a.length, p, share: pc(p, reach), w: pc(sum(a, 'w'), p), j: pc(sum(a, 'y'), p), enq: sum(a, 'enq'), ok: sum(a, 'ok') };
  });
  const regions = Object.entries(val.reduce<Record<string, number>>((m, r) => ({ ...m, [r.region]: (m[r.region] || 0) + r.p }), {}))
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const byYear = [...new Set(val.map((r) => r.year))].sort().map((y) => {
    const a = val.filter((r) => r.year === y);
    const p = sum(a, 'p');
    return { k: String(y), w: pc(sum(a, 'w'), p), j: pc(sum(a, 'y'), p) };
  });
  const quality = (['valid', 'pending', 'rejected'] as St[]).map((s) => ({ s, v: sum(rows.filter((r) => r.st === s), 'p') }));

  /* ----- Indicateur 2 ----- */
  const enq = sum(val, 'enq');
  const ok = sum(val, 'ok');
  const rate = pc(ok, enq);
  const margin = enq ? 1.96 * Math.sqrt(((ok / enq) * (1 - ok / enq)) / enq) * 100 : 0;
  const cov = pc(enq, sum(val.filter((r) => r.enq > 0), 'p'));
  const skills = Object.entries(val.reduce<Record<number, number>>((m, r) => ({ ...m, [r.sk]: (m[r.sk] || 0) + r.ok }), {}))
    .map(([i, v]) => ({ name: sk(+i), value: Math.round(pc(v, ok) * 10) / 10 })).sort((a, b) => b.value - a.value).slice(0, 10);
  const waves = [{ y: 2026, k: t.cf.m1 }, { y: 2027, k: t.cf.m2 }, { y: 2030, k: t.cf.m3 }];
  const rc = rate >= TARGET_CONF ? '#2e7d32' : RED;

  /* ----- Tableau ----- */
  const ql = q.trim().toLowerCase();
  const table = ql ? rows.filter((r) => `${Object.values(r).join(' ')} ${sk(r.sk)}`.toLowerCase().includes(ql)) : rows;
  const pages = Math.max(1, Math.ceil(table.length / per));
  const cur = Math.min(page, pages);
  const slice = table.slice((cur - 1) * per, cur * per);
  const win = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const dFmt = (iso: string) => new Date(iso).toLocaleDateString(LOC[lang], { timeZone: 'UTC' });

  const exportCsv = () => {
    const lines: (string | number)[][] = [t.tb.cols, ...table.map((r) => [r.id, r.cat, r.region, r.ap, r.district, r.commune, sk(r.sk), r.p, r.w, r.y, r.date, t.st[r.st]])];
    const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'beneficiaires.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const inclCharts = [{ title: t.c.inclC, data: byCat.map((r) => ({ k: r.c, w: r.w, j: r.j })) }, { title: t.c.inclY, data: byYear }];

  return (
    <div className="sv" lang={lang}>
      <style>{CSS}</style>

      <header className="sv-h">
        <h2><Users size={22} />{t.title}</h2>
        <div className="sv-hb np">
          <button className="sv-b o" onClick={() => window.print()} aria-label={t.print}><Printer size={16} /><span>{t.print}</span></button>
          <button className="sv-b o" onClick={() => { reset(); load(); }} disabled={busy} aria-label={t.rf}><RefreshCw size={16} /><span>{t.rf}</span></button>
        </div>
      </header>

      <main className="sv-w">
        {err && <div className="c" role="alert">{fmt(t.er, GEO_URL)}</div>}
        {!raw && !err && <div className="c">{t.ld}</div>}
        {raw && (<>

        {/* Filtres : 4 principaux + panneau « plus de filtres » */}
        <section className="np">
          <div className="sv-f">
            {PRIMARY.map(sel)}
            <button className="sv-b l" style={{ height: 38 }} aria-expanded={more} aria-label={t.more} onClick={() => setMore(!more)}>
              <SlidersHorizontal size={16} /><span>{t.more}</span>{nSec > 0 && <em className="sv-n">{nSec}</em>}
            </button>
            {nAct > 0 && <button className="sv-b l" style={{ height: 38 }} aria-label={t.reset} onClick={reset}><RotateCcw size={16} /><span>{t.reset}</span></button>}
          </div>
          {more && <div className="sv-f sv-f2">{SECOND.map(sel)}</div>}
        </section>

        {/* ===== 1. Atteinte de l'objectif ===== */}
        <Sec icon={Target} text={fmt(t.s1, nf(TARGET))} />
        <section className="g">
          <div className="c">
            <h4>{t.k.total}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 130px', minWidth: 120 }} aria-label={t.k.rate}>
                <Donut v={pc(reach, TARGET)} color="#2e7d32" label={pct(pc(reach, TARGET))} />
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <div className="big">{nf(reach)}</div>
                <div className="sub">{fmt(t.k.of, nf(TARGET))}</div>
              </div>
            </div>
          </div>
          <Kpi title={t.k.gap} big={`${gap >= 0 ? '+' : ''}${nf(gap)}`} sub={fmt(t.k.exp, cy, nf(expected))} color={gap >= 0 ? '#2e7d32' : RED} />
          <div className="c">
            <h4>{t.c.qual}</h4>
            <div className="sub" style={{ marginTop: 0 }}>{t.k.decl} : <b>{nf(decl)}</b></div>
            {quality.map((x) => (
              <div key={x.s}>
                <div className="row"><span><i style={{ background: STC[x.s] }} />{t.st[x.s]}</span><span><b>{nf(x.v)}</b> ({pct(pc(x.v, decl))})</span></div>
                <div className="bar" style={{ marginTop: 4 }}><b style={{ width: `${pc(x.v, decl)}%`, background: STC[x.s] }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="g2">
          <div className="c">
            <h4>{t.c.evol}</h4>
            <ResponsiveContainer width="100%" height={narrow ? 240 : 300}>
              <LineChart data={evol} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="y" tick={{ fontSize: 11 }} padding={{ left: 15, right: 15 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, TARGET]} tickFormatter={(v: number) => nf(v)} width={60} />
                <Tooltip formatter={(v: any) => nf(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line name={t.ev.decl} dataKey="decl" stroke="#f9a825" strokeWidth={2} dot={{ r: 3 }} />
                <Line name={t.ev.val} dataKey="val" stroke="#2e7d32" strokeWidth={3} dot={{ r: 4 }} />
                <Line name={`${t.ev.tar} (${nf(TARGET)})`} dataKey="tar" stroke="#9e9e9e" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="c">
            <h4>{t.map}</h4>
            <div style={{ height: narrow ? 260 : 300, borderRadius: 8, overflow: 'hidden' }}>
              <MapContainer center={[-18.9, 47.5]} zoom={5} scrollWheelZoom={!narrow} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                {rows.filter(hasXY).map((r) => (
                  <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={Math.max(5, Math.min(22, Math.sqrt(r.p) / 1.2))}
                    pathOptions={{ color: CATC[r.cat], fillColor: CATC[r.cat], fillOpacity: 0.55, weight: 2 }}>
                    <Popup><b>{r.id}</b><br />{sk(r.sk)}<br />{r.commune}, {r.region}<br />{nf(r.p)} · {t.st[r.st]}</Popup>
                  </CircleMarker>
                ))}
                <Fit pts={pts} />
              </MapContainer>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
              {CATS.map((c) => <span key={c}><i style={{ background: CATC[c] }} />{c}</span>)}
            </div>
          </div>
        </section>

        <section className="g2">
          <div className="c">
            <h4>{t.c.cat}</h4>
            <div className="tw">
              <table style={{ minWidth: 300 }}>
                <thead><tr>{[t.cols.cat, t.cols.act, t.cols.ben, t.cols.share].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {byCat.map((r) => (
                    <tr key={r.c}><td><b style={{ color: CATC[r.c] }}>{r.c}</b></td><td>{nf(r.n)}</td><td>{nf(r.p)}</td><td>{pct(r.share)}</td></tr>
                  ))}
                  <tr className="tot"><td>{t.cols.tot}</td><td>{nf(val.length)}</td><td>{nf(reach)}</td><td>{pct(reach ? 100 : 0)}</td></tr>
                </tbody>
              </table>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={byCat.map((r) => ({ name: r.c, value: r.p }))} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%" label={(e: any) => e.name}>
                  {CATS.map((c) => <Cell key={c} fill={CATC[c]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => nf(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="c">
            <h4>{t.c.reg}</h4>
            <ResponsiveContainer width="100%" height={Math.max(220, regions.length * 34 + 20)}>
              <BarChart data={regions} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => nf(v)} />
                <YAxis dataKey="name" type="category" width={narrow ? 84 : 120} tick={{ fontSize: 11 }} interval={0} />
                <Tooltip formatter={(v: any) => nf(v)} />
                <Bar dataKey="value" fill="#2e7d32" barSize={18} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="value" position="right" formatter={(v: any) => nf(v)} style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ===== 2. Inclusion ===== */}
        <Sec icon={Users} text={t.s2} />
        <section className="g">
          <Kpi title={t.k.w} big={pct(women)} sub={fmt(t.k.p, nf(sum(val, 'w')))} color={WOMEN} bar={women} />
          <Kpi title={t.k.y} big={pct(youth)} sub={fmt(t.k.p, nf(sum(val, 'y')))} color={YOUTH} bar={youth} />
        </section>
        <section className="g2">
          {inclCharts.map((ch) => (
            <div className="c" key={ch.title}>
              <h4>{ch.title}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ch.data} margin={{ top: 18, right: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="k" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={42} />
                  <Tooltip formatter={(v: any) => pct(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar name={t.k.w} dataKey="w" fill={WOMEN} maxBarSize={40}><LabelList dataKey="w" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 11, fontWeight: 700 }} /></Bar>
                  <Bar name={t.k.y} dataKey="j" fill={YOUTH} maxBarSize={40}><LabelList dataKey="j" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 11, fontWeight: 700 }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </section>

        {/* ===== 3. Confirmation ===== */}
        <Sec icon={GraduationCap} text={t.s3} />
        <section className="g">
          <Kpi title={t.cf.enq} big={nf(enq)} color={YOUTH} sub={`${t.cf.ok} : ${nf(ok)}`} sub2={`${t.cf.cov} : ${pct(cov)}`} />
          <div className="c">
            <h4>{t.cf.rate}</h4>
            <div className="big" style={{ color: rc, display: 'flex', alignItems: 'center', gap: 8 }}>
              {enq > 0 && <CheckCircle2 size={24} />}{enq ? pct(rate) : '—'}
            </div>
            <div className="sub">{fmt(t.cf.tar, TARGET_CONF)}{enq ? ` · ${rate >= TARGET_CONF ? t.cf.met : t.cf.not}` : ''}</div>
            <div className="bar"><b style={{ width: `${Math.min(100, rate)}%`, background: rc }} /></div>
            <div className="sub">{enq ? fmt(t.cf.ci, nf(margin, 1)) : ''}</div>
          </div>
        </section>

        <section className="c">
          <h4><ClipboardCheck size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{t.cf.ms}</h4>
          <div className="ms">
            {waves.map((w) => {
              const done = w.y <= cy && enq > 0;
              return (
                <div key={w.y} style={{ borderColor: done ? '#2e7d32' : '#d0d0d0' }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{w.y}</div>
                  <div style={{ fontSize: 12 }}>{w.k}</div>
                  <div style={{ fontWeight: 700, color: done ? '#2e7d32' : '#757575', marginTop: 4 }}>
                    {done ? `${t.cf.done} · ${pct(rate)}` : `${t.cf.soon} · ${TARGET_CONF} %`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="g2">
          <div className="c">
            <h4>{t.cf.byCat}</h4>
            {enq ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCat.filter((r) => r.enq).map((r) => ({ k: r.c, v: pc(r.ok, r.enq) }))} margin={{ top: 18, right: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="k" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={42} />
                  <Tooltip formatter={(v: any) => pct(v)} />
                  <ReferenceLine y={TARGET_CONF} stroke={RED} strokeDasharray="5 5" label={{ value: `${TARGET_CONF} %`, fill: RED, fontSize: 11, position: 'insideTopRight' }} />
                  <Bar dataKey="v" maxBarSize={50} radius={[3, 3, 0, 0]}>
                    {byCat.filter((r) => r.enq).map((r) => <Cell key={r.c} fill={CATC[r.c]} />)}
                    <LabelList dataKey="v" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="sub">{t.cf.none}</div>}
          </div>
          <div className="c">
            <h4>{t.cf.sk}</h4>
            <ResponsiveContainer width="100%" height={Math.max(260, skills.length * 30 + 30)}>
              <BarChart data={skills} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={narrow ? 110 : 190} interval={0} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${nf(v, 1)} %`} />
                <Bar dataKey="value" fill="#2e7d32" barSize={14} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="value" position="right" formatter={(v: any) => `${nf(v, 1)}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="c ab">
          <h4>{t.ab.t}</h4>
          <p>{t.ab.p1}</p>
          <p>{t.ab.p2}</p>
          {CATS.map((c) => <p key={c}><b style={{ color: CATC[c] }}>{c} :</b> {t.ab[c]}</p>)}
        </section>

        {/* ===== 4. Données détaillées ===== */}
        <Sec icon={ClipboardCheck} text={t.s4} />
        <section className="c">
          <div className="tb">
            <h4 style={{ margin: 0 }}>{fmt(t.tb.title, nf(table.length))}</h4>
            <div>
              <span style={{ position: 'relative', display: 'inline-flex', flex: '1 1 200px' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#888' }} />
                <input style={{ paddingLeft: 32 }} placeholder={t.tb.search} aria-label={t.tb.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </span>
              <button className="sv-b np" onClick={exportCsv}><Download size={16} /><span>{t.tb.exp}</span></button>
            </div>
          </div>
          <div className="tw">
            <table style={{ minWidth: 1100 }}>
              <thead><tr>{t.tb.cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {slice.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td style={{ color: CATC[r.cat], fontWeight: 700 }}>{r.cat}</td>
                    <td>{r.region}</td><td>{r.ap}</td><td>{r.district}</td><td>{r.commune}</td>
                    <td className="l">{sk(r.sk)}</td>
                    <td>{nf(r.p)}</td><td>{nf(r.w)}</td><td>{nf(r.y)}</td><td>{dFmt(r.date)}</td>
                    <td style={{ color: STC[r.st], fontWeight: 700 }}>{t.st[r.st]}</td>
                  </tr>
                ))}
                {!slice.length && <tr><td colSpan={12}>{t.tb.none}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pg np">
            <b style={{ color: '#6b7280' }}>{table.length ? fmt(t.tb.show, nf((cur - 1) * per + 1), nf(Math.min(cur * per, table.length)), nf(table.length)) : '0'}</b>
            <div>
              <button disabled={cur === 1} onClick={() => setPage(1)} aria-label={t.tb.first}>⏮</button>
              <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label={t.tb.prev}>◀</button>
              {win.map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 && p - win[i - 1] > 1 && <span>…</span>}
                  <button className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>
                </React.Fragment>
              ))}
              <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label={t.tb.next}>▶</button>
              <button disabled={cur === pages} onClick={() => setPage(pages)} aria-label={t.tb.last}>⏭</button>
            </div>
            <label>{t.tb.rows}
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
