import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
  Legend, LabelList, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Target, GraduationCap, ClipboardCheck, CheckCircle2, Printer, Download, RotateCcw, Search, SlidersHorizontal, RefreshCw, TrendingUp, TrendingDown, FileText, User,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Pane, GeoJSON, useMap } from 'react-leaflet';
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
/* =====================================================================
   CONFIGURATION (à adapter) : mêmes couches que vos autres pages
   ===================================================================== */
const DATA = {
  beneficiaires: '/data/beneficiaires.geojson', // base GeoJSON des activités
  regions: '/data/madagascar_24_region.geojson', // champ « nom_reg »
  districts: '/data/District_Paddi_2024.geojson', // champs REGION, DISTRICT, Aires_Prot
  communes: '/data/Commune_Paddi_2024.geojson', // champs REGION_2, DISTRICT_2, COMMUNE, Aires_Prot
};
const PROP = {
  region: 'nom_reg', // couche régions
  district: 'DISTRICT', districtRegion: 'REGION', // couche districts
  commune: 'COMMUNE', communeDistrict: 'DISTRICT_2', communeRegion: 'REGION_2', // couche communes
  ap: 'Aires_Prot', // aire protégée (districts et communes)
};
const NONE = '__hors_ap__'; // valeur du filtre « Hors aire protégée »
const DEF_TARGET = 25000;   // cible (surchargée par metadata.cible_total)
const DEF_CONF = 80;        // % confirmation (metadata.cible_confirmation)
const DEF_START = 2025;     // metadata.debut
const DEF_END = 2030;       // metadata.fin
interface Meta { cible_total?: number; cible_confirmation?: number; debut?: number; fin?: number }
const CATS: Cat[] = ['C2', 'C3', 'C4'];
/* Couleurs
   - CATC : valeurs hex, utilisées sur la carte Leaflet (qui reste claire dans les deux thèmes)
   - CATU / STC / WOMEN / YOUTH / RED : variables du thème (clair / sombre) pour le reste */
const CATC: Record<Cat, string> = { C2: '#2e7d32', C3: '#1976d2', C4: '#f9a825' };
const CATU: Record<Cat, string> = { C2: 'var(--c-green)', C3: 'var(--c-blue)', C4: '#f9a825' };
const STC: Record<St, string> = { valid: 'var(--c-green)', pending: '#f9a825', rejected: 'var(--c-red)' };
const WOMEN = 'var(--c-green)';
const YOUTH = 'var(--c-blue)';
const RED = 'var(--c-red)';
// Style des info-bulles et des textes Recharts (lisibles en clair et en sombre)
const TIP = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' },
  itemStyle: { color: 'var(--ink)' },
  labelStyle: { color: 'var(--ink)' },
};
const TICK = { fill: 'var(--txt2)' };
// Couleurs des cartes « Jalons de collecte » (reprises de l'ancienne page)
const MC = [
  { Ic: Users, c: 'var(--c-green)', bg: 'rgba(46,125,50,0.06)' },
  { Ic: ClipboardCheck, c: 'var(--c-blue)', bg: 'rgba(25,118,210,0.06)' },
  { Ic: CheckCircle2, c: '#f9a825', bg: 'rgba(245,124,0,0.06)' },
];
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
  map: 'Localisation des activités', ld: 'Chargement des activités…', er: 'Chargement impossible. Vérifiez que {0} est accessible, puis actualisez.', rf: 'Actualiser', more: 'Plus de filtres', noap: 'Hors aire protégée', hint: 'Cliquez sur une limite pour filtrer (région, district, commune).',
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
  cf: { sum: 'Synthèse de la confirmation', enq: 'Personnes enquêtées', ok: 'Amélioration confirmée', rate: 'Taux de confirmation', tar: 'Cible : {0} %', cov: 'Couverture de l’enquête', ci: 'IC 95 % : ± {0} pts', met: 'Cible atteinte', not: 'Cible non atteinte', ms: 'Jalons de collecte', m1: 'Suivi', m2: 'Mi-parcours', m3: 'Finale', done: 'Réalisé', soon: 'À venir', byCat: 'Taux de confirmation par catégorie (%)', sk: 'Compétences confirmées (Top 10, % des confirmations)', none: 'Aucune enquête pour ces filtres.' },
  ab: { t: 'À propos de l’indicateur', p1: 'Indicateur 2 : 80 % des bénéficiaires confirment, exemples à l’appui, avoir amélioré leurs compétences techniques et entrepreneuriales pour mettre en œuvre des pratiques durables et valoriser les produits de l’agriculture, de la sylviculture et de l’élevage.', p2: 'La confirmation repose sur des enquêtes auprès d’un échantillon représentatif de bénéficiaires. Seules les activités validées sont comptées.', C2: 'Formations collectives', C3: 'Appui individuel / groupements', C4: 'Appui aux entrepreneurs' },
  tb: { title: 'Activités et bénéficiaires ({0})', search: 'Rechercher…', exp: 'Exporter CSV', cols: ['ID activité', 'Catégorie', 'Région', 'Aire protégée', 'District', 'Commune', 'Intitulé', 'Participants', 'Femmes', 'Jeunes < 35 ans', 'Date', 'Statut'], none: 'Aucune activité pour ces filtres.', show: '{0}–{1} sur {2}', rows: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page' },
};
type D = typeof fr;
const mg: D = {
  title: 'Fanaraha-maso ny mpamboly madinika', print: 'Hanonta', reset: 'Averina', all: 'Rehetra', lang: 'Fiteny',
  map: 'Toerana misy ny hetsika', ld: 'Mampiditra ny hetsika…', er: 'Tsy afaka naka ny angona. Jereo raha azo vakiana ny {0}, avy eo havaozy.', rf: 'Havaozina', more: 'Sivana hafa', noap: 'Ivelan’ny faritra arovana', hint: 'Tsindrio ny sisintany mba hanivana (faritra, distrika, kaominina).',
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
  cf: { sum: 'Famintinana ny fanamarinana', enq: 'Olona nanontaniana', ok: 'Fanatsarana voamarina', rate: 'Tahan’ny fanamarinana', tar: 'Tanjona : {0} %', cov: 'Fetran’ny fanadihadiana', ci: 'IC 95 % : ± {0} teboka', met: 'Tratra ny tanjona', not: 'Tsy tratra ny tanjona', ms: 'Dingana fanangonana', m1: 'Fanaraha-maso', m2: 'Antonony', m3: 'Farany', done: 'Vita', soon: 'Ho avy', byCat: 'Tahan’ny fanamarinana araka ny sokajy (%)', sk: 'Fahaizana voamarina (Top 10, % amin’ny fanamarinana)', none: 'Tsy misy fanadihadiana ho an’ireo sivana ireo.' },
  ab: { t: 'Mikasika ny tondro', p1: 'Tondro 2 : 80 % amin’ny mpahazo tombontsoa no manamarina, miaraka amin’ny ohatra, fa nanatsara ny fahaizany ara-teknika sy ara-pandraharahana mba hampihatra fomba maharitra sy hanomezam-boka ny vokatra avy amin’ny fambolena, ny ala ary ny fiompiana.', p2: 'Ny fanamarinana dia miorina amin’ny fanadihadiana ny santionan’ny mpahazo tombontsoa maneho ny rehetra. Ny hetsika nekena ihany no isaina.', C2: 'Fampianarana iraisana', C3: 'Fanampiana manokana / vondrona', C4: 'Fanampiana ho an’ny mpandraharaha' },
  tb: { title: 'Hetsika sy mpahazo tombontsoa ({0})', search: 'Hikaroka…', exp: 'Hamoaka CSV', cols: ['ID hetsika', 'Sokajy', 'Faritra', 'Faritra arovana', 'Distrika', 'Kaominina', 'Lohateny', 'Mpandray anjara', 'Vehivavy', 'Tanora < 35 taona', 'Daty', 'Sata'], none: 'Tsy misy hetsika mifanaraka amin’ireo sivana ireo.', show: '{0} – {1} amin’ny {2}', rows: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany' },
};
const en: D = {
  title: 'Smallholder farmers monitoring', print: 'Print', reset: 'Reset', all: 'All', lang: 'Language',
  map: 'Activity locations', ld: 'Loading activities…', er: 'Unable to load data. Check that {0} is reachable, then refresh.', rf: 'Refresh', more: 'More filters', noap: 'Outside protected area', hint: 'Click a boundary to filter (region, district, municipality).',
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
  cf: { sum: 'Confirmation summary', enq: 'People surveyed', ok: 'Improvement confirmed', rate: 'Confirmation rate', tar: 'Target: {0} %', cov: 'Survey coverage', ci: '95 % CI: ± {0} pts', met: 'Target met', not: 'Target not met', ms: 'Data collection milestones', m1: 'Follow-up', m2: 'Mid-term', m3: 'Final', done: 'Completed', soon: 'Upcoming', byCat: 'Confirmation rate by category (%)', sk: 'Confirmed skills (Top 10, % of confirmations)', none: 'No survey for these filters.' },
  ab: { t: 'About the indicator', p1: 'Indicator 2: 80 % of beneficiaries confirm, with examples, that they have improved their technical and entrepreneurial skills to implement sustainable practices and add value to agricultural, forestry and livestock products.', p2: 'Confirmation is based on surveys of a representative sample of beneficiaries. Only validated activities are counted.', C2: 'Group training', C3: 'Individual support / groups', C4: 'Support to entrepreneurs' },
  tb: { title: 'Activities and beneficiaries ({0})', search: 'Search…', exp: 'Export CSV', cols: ['Activity ID', 'Category', 'Region', 'Protected area', 'District', 'Municipality', 'Title', 'Participants', 'Women', 'Youth < 35', 'Date', 'Status'], none: 'No activity matches these filters.', show: '{0}–{1} of {2}', rows: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page' },
};
const de: D = {
  title: 'Überwachung der Kleinbauern', print: 'Drucken', reset: 'Zurücksetzen', all: 'Alle', lang: 'Sprache',
  map: 'Standorte der Aktivitäten', ld: 'Aktivitäten werden geladen…', er: 'Laden nicht möglich. Prüfen Sie, ob {0} erreichbar ist, und aktualisieren Sie dann.', rf: 'Aktualisieren', more: 'Weitere Filter', noap: 'Außerhalb von Schutzgebieten', hint: 'Klicken Sie auf eine Grenze, um zu filtern (Region, Distrikt, Gemeinde).',
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
  cf: { sum: 'Zusammenfassung der Bestätigung', enq: 'Befragte Personen', ok: 'Verbesserung bestätigt', rate: 'Bestätigungsquote', tar: 'Ziel: {0} %', cov: 'Erhebungsabdeckung', ci: '95-%-KI: ± {0} Pkt.', met: 'Ziel erreicht', not: 'Ziel nicht erreicht', ms: 'Erhebungsmeilensteine', m1: 'Nachverfolgung', m2: 'Halbzeit', m3: 'Abschluss', done: 'Abgeschlossen', soon: 'Bevorstehend', byCat: 'Bestätigungsquote nach Kategorie (%)', sk: 'Bestätigte Kompetenzen (Top 10, % der Bestätigungen)', none: 'Keine Erhebung für diese Filter.' },
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

// Comparaison de noms tolérante (accents, majuscules, apostrophes)
const norm = (v: any) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// Emprise [[latMin, lngMin], [latMax, lngMax]] d'une liste d'entités GeoJSON
const bbox = (fs: any[]): [number, number][] => {
  let a = 90, b = 180, c = -90, d = -180;
  const walk = (x: any) => {
    if (typeof x[0] === 'number') { if (x[1] < a) a = x[1]; if (x[1] > c) c = x[1]; if (x[0] < b) b = x[0]; if (x[0] > d) d = x[0]; }
    else x.forEach(walk);
  };
  fs.forEach((ft) => ft?.geometry?.coordinates && walk(ft.geometry.coordinates));
  return a <= c ? [[a, b], [c, d]] : [];
};
type Lvl = 'region' | 'district' | 'commune';
interface Ly { key: string; features: any[]; style: any; click?: Lvl }
const ST_REG = { color: '#546e7a', weight: 1, fillColor: '#90a4ae', fillOpacity: 0.04 };
const ST_CTX = { color: '#78909c', weight: 1, dashArray: '3', fillColor: '#90a4ae', fillOpacity: 0.05 };
const ST_AP = { color: '#ef6c00', weight: 2, fillColor: '#ef6c00', fillOpacity: 0.15 };
const ST_HL = { color: '#1b5e20', weight: 3, fillColor: '#2e7d32', fillOpacity: 0.12 };

const Fit = ({ pts }: { pts: [number, number][] }) => {
  const map = useMap();
  useEffect(() => { if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); }, [pts, map]);
  return null;
};

/* ---------- Helpers ---------- */
const sum = (a: Act[], k: 'p' | 'w' | 'y' | 'enq' | 'ok') => a.reduce((t, r) => t + r[k], 0);
const pc = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const FK = ['year', 'region', 'ap', 'paysage', 'district', 'commune', 'fokontany', 'mbv', 'cat', 'st'] as const;
type K = (typeof FK)[number];
const PRIMARY: K[] = ['year', 'region', 'cat', 'st'];
const SECOND: K[] = ['ap', 'paysage', 'district', 'commune', 'fokontany', 'mbv'];

/* Les couleurs viennent de variables : valeurs claires dans « .sv »,
   surcharges du thème sombre dans « :root[data-theme="dark"] .sv ».
   (Les cartes Leaflet restent claires dans les deux thèmes.) */
const CSS = `
.sv{--page:#f3f5f1;--card:#fff;--ink:#1c2b24;--txt2:#374151;--mut:#556;--line:#e1e6e2;--bd:#c9d1cb;--track:#e5e7eb;
  --gv:#1b5e20;--gb:#2e7d32;--gb2:#1b5e20;--tot:#e8f5e9;
  --c-green:#2e7d32;--c-blue:#1976d2;--c-red:#c62828;--c-slate:#455a64;--warn-bg:#fff8e1;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:var(--page);min-height:100vh;color:var(--ink);font-size:14px}
:root[data-theme="dark"] .sv{--page:var(--bg);--card:var(--surface);--ink:#e5e7eb;--txt2:#cbd5e1;--mut:#94a3b8;
  --line:rgba(255,255,255,.12);--bd:rgba(255,255,255,.2);--track:rgba(255,255,255,.14);
  --gv:#66bb6a;--gb:#2e7d32;--gb2:#2e7d32;--tot:rgba(102,187,106,.14);
  --c-green:#66bb6a;--c-blue:#64b5f6;--c-red:#f87171;--c-slate:#94a3b8;--warn-bg:rgba(249,168,37,.14)}
.sv *{box-sizing:border-box}
.sv-h{position:sticky;top:0;z-index:20;background:#0b5d1e;color:#fff;padding:10px clamp(10px,2vw,24px);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.sv-h h2{margin:0;font-size:clamp(16px,2.4vw,22px);display:flex;align-items:center;gap:8px}
.sv-hb{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.sv-b{display:inline-flex;align-items:center;gap:6px;border-radius:8px;border:1px solid transparent;padding:7px 12px;font-weight:700;font-size:13px;cursor:pointer;min-height:36px;background:#2e7d32;color:#fff}
.sv-b.o{background:transparent;color:#fff;border-color:rgba(255,255,255,.6)}
.sv-b.l{background:var(--card);color:var(--ink);border-color:var(--bd)}
.sv :focus-visible{outline:3px solid #f9a825;outline-offset:2px}
.sv-w{padding:clamp(8px,2vw,24px);display:flex;flex-direction:column;gap:14px;max-width:1600px;margin:0 auto}
.sv-demo{background:var(--warn-bg);border:1px solid #f9a825;border-radius:8px;padding:8px 12px;font-size:12px}
.sv-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;align-items:end}
.sv-f label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--txt2)}
.sv select,.sv input{height:38px;border-radius:8px;border:1px solid var(--bd);padding:0 10px;background:var(--card);color:var(--ink);font-size:13px;width:100%;min-width:0}
.sv-s{display:flex;align-items:center;gap:8px;background:#2e7d32;color:#fff;margin:6px 0 0;padding:9px 12px;border-radius:8px;font-size:clamp(13px,1.6vw,16px)}
.sv-f2{margin-top:8px;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:10px}
.sv-n{background:#f9a825;color:#1c2b24;border-radius:10px;padding:0 6px;font-size:11px;font-style:normal}
.k5{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))}
.kc{display:flex;flex-direction:column;align-items:center;text-align:center;border-top:4px solid #2e7d32}
.kc .kh{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px}
.kc .kh h4{margin:0}
.kc .sub{margin:2px 0 0}
.kc .bar{margin-top:auto}
.ki{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;flex-shrink:0}
.g3{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.r4{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.r4>.wide{grid-column:span 2}
.y3{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px}
.g{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.g2{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.c{background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--line);min-width:0}
.c h4{margin:0 0 8px;font-size:13px;color:var(--gv)}
.big{font-size:clamp(24px,3.4vw,34px);font-weight:800;line-height:1.1}
.sub{font-size:12px;color:var(--mut);margin-top:4px}
.bar{height:10px;background:var(--track);border-radius:6px;overflow:hidden;margin-top:8px}
.bar b{display:block;height:100%}
.dn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;pointer-events:none}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
.sv table{width:100%;border-collapse:collapse;font-size:12px;text-align:center}
.sv th{background:var(--gb);color:#fff;padding:8px 6px;border:1px solid var(--line);white-space:nowrap}
.sv td{padding:7px 6px;border:1px solid var(--line)}
.sv td.l{text-align:left}
.sv tr.tot td{background:var(--tot);font-weight:700}
.row{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:8px}
.row i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.ms{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.ms>div{border:1px solid var(--bd);border-radius:10px;padding:10px;text-align:center}
.ab{background:rgba(46,125,50,.06);border-color:var(--gb)}
.ab p{font-size:12px;line-height:1.55;margin:0 0 8px;max-width:70ch}
.tb{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px}
.tb>div{display:flex;gap:8px;flex-wrap:wrap}
.pg{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px}
.pg div{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.pg button{min-width:34px;height:34px;border:1px solid var(--bd);background:var(--card);color:var(--ink);border-radius:6px;cursor:pointer;font-weight:600}
.pg button.on{background:var(--gb2);color:#fff;border-color:var(--gb2)}
.pg button:disabled{opacity:.4;cursor:default}
.pg label{display:flex;align-items:center;gap:6px}
.pg select{width:auto}
@media (max-width:560px){.r4>.wide{grid-column:auto}}
@media (max-width:600px){.sv-b span{display:none}.sv-s{align-items:flex-start}.tb input{width:100%}}
@media (prefers-reduced-motion:reduce){.sv *{transition:none!important;animation:none!important}}
@media print{.np{display:none!important}.sv{background:#fff}.sv-h{position:static}.c{break-inside:avoid}}
`;

const Sec = ({ icon: Ic, text }: { icon: React.ComponentType<any>; text: string }) => (
  <h3 className="sv-s"><Ic size={18} style={{ flexShrink: 0 }} />{text}</h3>
);
const Kpi = ({ title, big, sub, color = 'var(--c-green)', icon: Ic, v, label }: { title: string; big: string; sub?: string; color?: string; icon?: React.ComponentType<any>; v: number; label: string }) => (
  <div className="c kc" style={{ borderTopColor: color }}>
    <div className="kh">
      {Ic && <span className="ki" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}><Ic size={18} /></span>}
      <h4>{title}</h4>
    </div>
    <Donut v={v} color={color} label={label} h={120} />
    <div className="big" style={{ color }}>{big}</div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);
const Donut = ({ v, color, label, h = 150 }: { v: number; color: string; label: string; h?: number }) => (
  <div style={{ position: 'relative', height: h, width: '100%' }}>
    <ResponsiveContainer>
      <PieChart>
        <Pie data={[{ n: 'a', v: Math.min(100, v) }, { n: 'b', v: Math.max(0, 100 - v) }]} dataKey="v" innerRadius="64%" outerRadius="90%" startAngle={90} endAngle={-270} stroke="none">
          <Cell fill={color} /><Cell fill="var(--track)" />
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
    fetch(DATA.beneficiaires, { cache: 'no-store' })
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
  const [adm, setAdm] = useState<{ reg: any; dis: any; com: any }>({ reg: null, dis: null, com: null });
  useEffect(() => {
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([get(DATA.regions), get(DATA.districts), get(DATA.communes)]).then(([reg, dis, com]) => setAdm({ reg, dis, com }));
  }, []);

  const match = (a: Act, skip?: K) => FK.every((k) => {
    if (k === skip || !f[k]) return true;
    if (k === 'ap' && f[k] === NONE) return !a.ap;
    return String(a[k]) === f[k];
  });
  const rows = useMemo(() => acts.filter((a) => match(a)), [f, acts]); // eslint-disable-line
  const opts = (k: K) => {
    const l = [...new Set(acts.filter((a) => match(a, k)).map((a) => (k === 'ap' && !a.ap ? NONE : String(a[k]))))].filter(Boolean).sort();
    if (f[k] && !l.includes(f[k])) l.push(f[k]); // valeur choisie sur la carte absente des activités
    return l;
  };
  const reset = () => { setF({}); setQ(''); setPage(1); setPer(10); };
  // Hiérarchie : changer un niveau réinitialise les niveaux inférieurs
  const CHILD: Partial<Record<K, K[]>> = { region: ['district', 'commune', 'fokontany', 'mbv'], district: ['commune', 'fokontany', 'mbv'], commune: ['fokontany', 'mbv'] };
  const setFilter = (k: K, v: string) => {
    setF((p) => { const n = { ...p, [k]: v }; (CHILD[k] || []).forEach((c) => { delete n[c]; }); return n; });
    setPage(1);
  };
  // Clic sur une limite de la carte -> filtres région / district / commune
  const canon = (k: Lvl, name: string) => { const h = acts.find((a) => norm(a[k]) === norm(name)); return h ? String(h[k]) : name; };
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
        {opts(k).map((o) => <option key={o} value={o}>{k === 'st' ? t.st[o as St] : o === NONE ? t.noap : o}</option>)}
      </select>
    </label>
  );


  const pts = useMemo<[number, number][]>(() => rows.filter(hasXY).map((r) => [r.lat, r.lng]), [rows]);
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
  const miles = [{ y: 2026, k: t.cf.m1 }, { y: 2027, k: t.cf.m2 }, { y: 2030, k: t.cf.m3 }].map((w) => {
    const a = base.filter((r) => r.st === 'valid' && r.year <= w.y);
    const e = sum(a, 'enq');
    return { ...w, done: w.y <= cy, ben: sum(a, 'p'), enq: e, rate: pc(sum(a, 'ok'), e), traj: Math.round((TARGET * (w.y - START + 1)) / nY) };
  });
  const mLabels = [t.cols.ben, t.cf.enq, t.cf.rate];
  const rc = rate >= TARGET_CONF ? 'var(--c-green)' : RED;
  const cfItems: { Ic: React.ComponentType<any>; c: string; bg: string; title: string; value: string; subs: string[]; bar?: number }[] = [
    { Ic: ClipboardCheck, c: 'var(--c-blue)', bg: 'rgba(25,118,210,0.06)', title: t.cf.enq, value: nf(enq), subs: [`${t.cf.cov} : ${pct(cov)}`] },
    { Ic: CheckCircle2, c: '#f9a825', bg: 'rgba(245,124,0,0.06)', title: t.cf.ok, value: nf(ok), subs: [] },
    { Ic: Target, c: rc, bg: rate >= TARGET_CONF ? 'rgba(46,125,50,0.06)' : 'rgba(198,40,40,0.06)', title: t.cf.rate, value: enq ? pct(rate) : '—',
      subs: [`${fmt(t.cf.tar, TARGET_CONF)}${enq ? ` · ${rate >= TARGET_CONF ? t.cf.met : t.cf.not}` : ''}`, enq ? fmt(t.cf.ci, nf(margin, 1)) : ''], bar: enq ? rate : undefined },
  ];

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
        {err && <div className="c" role="alert">{fmt(t.er, DATA.beneficiaires)}</div>}
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
        <section className="k5">
          <Kpi icon={Target} title={t.k.total} v={pc(reach, TARGET)} label={pct(pc(reach, TARGET))} big={nf(reach)} sub={fmt(t.k.of, nf(TARGET))} />
          <Kpi icon={gap >= 0 ? TrendingUp : TrendingDown} title={t.k.gap} v={pc(gap + expected, expected)} label={pct(pc(gap + expected, expected))}
            big={`${gap >= 0 ? '+' : ''}${nf(gap)}`} sub={fmt(t.k.exp, cy, nf(expected))} color={gap >= 0 ? 'var(--c-green)' : RED} />
          <Kpi icon={FileText} title={t.k.decl} v={pc(reach, decl)} label={pct(pc(reach, decl))} big={nf(decl)}
            sub={fmt(t.k.vp, nf(pc(reach, decl), 1), nf(rows.length))} color="var(--c-slate)" />
          <Kpi icon={Users} title={t.k.w} v={women} label={pct(women)} big={nf(sum(val, 'w'))} sub={fmt(t.k.p, '').trim()} color={WOMEN} />
          <Kpi icon={User} title={t.k.y} v={youth} label={pct(youth)} big={nf(sum(val, 'y'))} sub={fmt(t.k.p, '').trim()} color={YOUTH} />
        </section>

        <section className="g3">
          <div className="c" style={{ display: 'flex', flexDirection: 'column' }}>
            <h4>{t.c.qual}</h4>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 8 }}>
            {quality.map((x) => (
              <div key={x.s}>
                <div className="row"><span><i style={{ background: STC[x.s] }} />{t.st[x.s]}</span><span><b>{nf(x.v)}</b> ({pct(pc(x.v, decl))})</span></div>
                <div className="bar" style={{ marginTop: 4 }}><b style={{ width: `${pc(x.v, decl)}%`, background: STC[x.s] }} /></div>
              </div>
            ))}
            </div>
          </div>
          <div className="c">
            <h4>{t.c.evol}</h4>
            <ResponsiveContainer width="100%" height={narrow ? 200 : 230}>
              <LineChart data={evol} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="y" tick={{ fontSize: 11, ...TICK }} padding={{ left: 15, right: 15 }} />
                <YAxis tick={{ fontSize: 11, ...TICK }} domain={[0, TARGET]} tickFormatter={(v: number) => nf(v)} width={60} />
                <Tooltip {...TIP} formatter={(v: any) => nf(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--txt2)' }} />
                <Line name={t.ev.decl} dataKey="decl" stroke="#f9a825" strokeWidth={2} dot={{ r: 3 }} />
                <Line name={t.ev.val} dataKey="val" stroke="var(--c-green)" strokeWidth={3} dot={{ r: 4 }} />
                <Line name={`${t.ev.tar} (${nf(TARGET)})`} dataKey="tar" stroke="#9e9e9e" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="c">
            <h4>{t.c.reg}</h4>
            <ResponsiveContainer width="100%" height={Math.max(190, regions.length * 34 + 20)}>
              <BarChart data={regions} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 11, ...TICK }} tickFormatter={(v: number) => nf(v)} />
                <YAxis dataKey="name" type="category" width={narrow ? 84 : 120} tick={{ fontSize: 11, ...TICK }} interval={0} />
                <Tooltip {...TIP} formatter={(v: any) => nf(v)} />
                <Bar dataKey="value" fill="var(--c-green)" barSize={18} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="value" position="right" formatter={(v: any) => nf(v)} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--txt2)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="g2">
          <div className="c">
            <h4>{t.c.cat}</h4>
            <div className="tw">
              <table style={{ minWidth: 380 }}>
                <thead><tr>{[t.cols.cat, t.cols.act, t.cols.ben, t.cols.share, t.cols.w, t.cols.y].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {byCat.map((r) => (
                    <tr key={r.c}><td><b style={{ color: CATU[r.c] }}>{r.c}</b></td><td>{nf(r.n)}</td><td>{nf(r.p)}</td><td>{pct(r.share)}</td><td>{pct(r.w)}</td><td>{pct(r.j)}</td></tr>
                  ))}
                  <tr className="tot"><td>{t.cols.tot}</td><td>{nf(val.length)}</td><td>{nf(reach)}</td><td>{pct(reach ? 100 : 0)}</td><td>{pct(women)}</td><td>{pct(youth)}</td></tr>
                </tbody>
              </table>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={byCat.map((r) => ({ name: r.c, value: r.p }))} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%" stroke="var(--card)" label={(e: any) => e.name}>
                  {CATS.map((c) => <Cell key={c} fill={CATU[c]} />)}
                </Pie>
                <Tooltip {...TIP} formatter={(v: any) => nf(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="c">
            <h4>{t.map}</h4>
            <div style={{ height: narrow ? 260 : 300, borderRadius: 8, overflow: 'hidden' }}>
              <MapContainer center={[-18.9, 47.5]} zoom={5} scrollWheelZoom={!narrow} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                <Pane name="admin" style={{ zIndex: 350 }}>
                  {layers.map((ly) => (
                    <GeoJSON key={ly.key} data={{ type: 'FeatureCollection', features: ly.features } as any} pane="admin" interactive={!!ly.click}
                      style={() => ly.style}
                      onEachFeature={ly.click ? (ft: any, lay: any) => lay.on({ click: () => pickRef.current(ly.click as Lvl, ft.properties) }) : undefined} />
                  ))}
                </Pane>
                {rows.filter(hasXY).map((r) => (
                  <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={Math.max(5, Math.min(22, Math.sqrt(r.p) / 1.2))}
                    pathOptions={{ color: CATC[r.cat], fillColor: CATC[r.cat], fillOpacity: 0.55, weight: 2 }}>
                    <Popup><b>{r.id}</b><br />{sk(r.sk)}<br />{r.commune}, {r.region}<br />{nf(r.p)} · {t.st[r.st]}</Popup>
                  </CircleMarker>
                ))}
                <Fit pts={fitPts} />
              </MapContainer>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
              {CATS.map((c) => <span key={c}><i style={{ background: CATU[c] }} />{c}</span>)}
            </div>
            <div className="sub" style={{ textAlign: 'center' }}>{t.hint}</div>
          </div>
        </section>

        {/* ===== 2. Inclusion ===== */}
        <Sec icon={Users} text={t.s2} />
        <section className="g2">
          {inclCharts.map((ch) => (
            <div className="c" key={ch.title}>
              <h4>{ch.title}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ch.data} margin={{ top: 18, right: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="k" tick={{ fontSize: 12, fontWeight: 600, ...TICK }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, ...TICK }} tickFormatter={(v: number) => `${v}%`} width={42} />
                  <Tooltip {...TIP} formatter={(v: any) => pct(v)} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--txt2)' }} />
                  <Bar name={t.k.w} dataKey="w" fill={WOMEN} maxBarSize={40}><LabelList dataKey="w" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 11, fontWeight: 700, fill: 'var(--txt2)' }} /></Bar>
                  <Bar name={t.k.y} dataKey="j" fill={YOUTH} maxBarSize={40}><LabelList dataKey="j" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 11, fontWeight: 700, fill: 'var(--txt2)' }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </section>

        {/* ===== 3. Confirmation ===== */}
        <Sec icon={GraduationCap} text={t.s3} />
        <section className="g3">
          <div className="c">
            <h4>{t.cf.sum}</h4>
            <div style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cfItems.map((x, k) => (
                <div key={k} style={{ border: `1px solid ${x.c}`, background: x.bg, borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <x.Ic size={22} color={x.c} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{x.title}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: x.c }}>{x.value}</div>
                    {x.subs.filter(Boolean).map((l) => <div key={l} className="sub" style={{ marginTop: 2 }}>{l}</div>)}
                    {x.bar !== undefined && <div className="bar"><b style={{ width: `${Math.min(100, x.bar)}%`, background: x.c }} /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="c">
            <h4>{t.cf.ms}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {miles.map((m) => {
                const vals = m.done
                  ? [nf(m.ben), m.enq ? nf(m.enq) : '—', m.enq ? pct(m.rate) : '—']
                  : [`≥ ${nf(m.traj)}`, '—', `≥ ${TARGET_CONF} %`];
                return (
                  <div key={m.y} style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, fontSize: 13 }}>
                      <span><b style={{ fontSize: 15 }}>{m.y}</b> · {m.k}</span>
                      <b style={{ color: m.done ? 'var(--c-green)' : 'var(--mut)' }}>{m.done ? t.cf.done : t.cf.soon}</b>
                    </div>
                    <div className="y3">
                      {MC.map((x, k) => (
                        <div key={k} style={{ border: `1px solid ${x.c}`, background: x.bg, borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', gap: 8, opacity: m.done ? 1 : 0.7 }}>
                          <x.Ic size={22} color={x.c} style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{mLabels[k]}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: x.c }}>{vals[k]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="c ab">
          <h4>{t.ab.t}</h4>
          <p>{t.ab.p1}</p>
          <p>{t.ab.p2}</p>
          {CATS.map((c) => <p key={c}><b style={{ color: CATU[c] }}>{c} :</b> {t.ab[c]}</p>)}
          </div>
        </section>

        <section className="g2">
          <div className="c">
            <h4>{t.cf.byCat}</h4>
            {enq ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCat.filter((r) => r.enq).map((r) => ({ k: r.c, v: pc(r.ok, r.enq) }))} margin={{ top: 18, right: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="k" tick={{ fontSize: 12, fontWeight: 600, ...TICK }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, ...TICK }} tickFormatter={(v: number) => `${v}%`} width={42} />
                  <Tooltip {...TIP} formatter={(v: any) => pct(v)} />
                  <ReferenceLine y={TARGET_CONF} stroke={RED} strokeDasharray="5 5" label={{ value: `${TARGET_CONF} %`, fill: RED, fontSize: 11, position: 'insideTopRight' }} />
                  <Bar dataKey="v" maxBarSize={50} radius={[3, 3, 0, 0]}>
                    {byCat.filter((r) => r.enq).map((r) => <Cell key={r.c} fill={CATU[r.c]} />)}
                    <LabelList dataKey="v" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 11, fontWeight: 700, fill: 'var(--txt2)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="sub">{t.cf.none}</div>}
          </div>
          <div className="c">
            <h4>{t.cf.sk}</h4>
            <ResponsiveContainer width="100%" height={Math.max(260, skills.length * 30 + 30)}>
              <BarChart data={skills} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 11, ...TICK }} tickFormatter={(v: number) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={narrow ? 110 : 190} interval={0} tick={{ fontSize: 10, ...TICK }} />
                <Tooltip {...TIP} formatter={(v: any) => `${nf(v, 1)} %`} />
                <Bar dataKey="value" fill="var(--c-green)" barSize={14} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="value" position="right" formatter={(v: any) => `${nf(v, 1)}%`} style={{ fontSize: 10, fontWeight: 700, fill: 'var(--txt2)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ===== 4. Données détaillées ===== */}
        <Sec icon={ClipboardCheck} text={t.s4} />
        <section className="c">
          <div className="tb">
            <h4 style={{ margin: 0 }}>{fmt(t.tb.title, nf(table.length))}</h4>
            <div>
              <span style={{ position: 'relative', display: 'inline-flex', flex: '1 1 200px' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--mut)' }} />
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
                    <td style={{ color: CATU[r.cat], fontWeight: 700 }}>{r.cat}</td>
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
            <b style={{ color: 'var(--mut)' }}>{table.length ? fmt(t.tb.show, nf((cur - 1) * per + 1), nf(Math.min(cur * per, table.length)), nf(table.length)) : '0'}</b>
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
