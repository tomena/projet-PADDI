import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Search, Download, Building2, Leaf, Users, Package, Briefcase, TrendingUp, FileCheck, Landmark,
  SlidersHorizontal, RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar, PieChart, Pie, Cell, LabelList, CartesianGrid,
  ReferenceLine, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, Pane, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

/* =====================================================================
   SUIVI DES MPME ET DES INITIATIVES (C4)
   Dépendances : react, recharts, lucide-react, react-leaflet, leaflet
   ===================================================================== */

type Lang = 'fr' | 'mg' | 'en' | 'de';
type Ty = 'MICRO' | 'PETITE' | 'MOYENNE' | 'INIT';
interface Rec {
  id: string; nom: string; type: Ty; chain: string; region: string; ap: string; paysage: string; district: string; commune: string;
  mbv: string; fokontany: string; loc: string; year: number;
  eff: number; effW: number; effY: number; jobs: number; // personnel total, femmes, jeunes (< 35 ans), emplois créés
  nApp: number; spec: string; date: string;
  offer: number; nOff: number; // offre élargie (0/1) et nombre de nouveaux produits/services
  ca0: number; ca1: number; formal: number; fin: number; // CA avant/après (Ar), formalisée (0/1), accès au financement (0/1)
  lat: number; lng: number;
}
interface Meta { cible_entites?: number; debut?: number; fin?: number }

/* ---------- Configuration (à adapter) : mêmes couches que vos autres pages ---------- */
const DATA = {
  entites: '/data/mpme_c4.geojson', // base GeoJSON de cette page
  regions: '/data/madagascar_24_region.geojson',
  districts: '/data/District_Paddi_2024.geojson',
  communes: '/data/Commune_Paddi_2024.geojson',
};
const PROP = {
  region: 'nom_reg',
  district: 'DISTRICT', districtRegion: 'REGION',
  commune: 'COMMUNE', communeDistrict: 'DISTRICT_2', communeRegion: 'REGION_2',
  ap: 'Aires_Prot',
};
const NONE = '__hors_ap__';
const DEF = { cible: 50, debut: 2025, fin: 2030 };

const GREEN = '#2E7D32', BLUE = '#1565C0', DARK = '#374151';
const LOC: Record<Lang, string> = { fr: 'fr-FR', mg: 'fr-FR', en: 'en-US', de: 'de-DE' };
const LI: Record<Lang, number> = { fr: 0, mg: 1, en: 2, de: 3 };
const TYPES: Ty[] = ['MICRO', 'PETITE', 'MOYENNE', 'INIT'];
const TC: Record<Ty, string> = { MICRO: '#689F38', PETITE: '#9CCC65', MOYENNE: '#F4B400', INIT: '#5E92F3' };
const CVC = ['#689F38', '#9CCC65', '#F4B400', '#5E92F3', '#C7C7C7'];
const AP_CATS = ['formation', 'equipement', 'technique', 'certification', 'commercial', 'financement'];

/* ---------- Valeurs des données à traduire : [fr, mg, en, de] ---------- */
const CV: string[][] = [
  ['Agriculture durable', 'Fambolena maharitra', 'Sustainable agriculture', 'Nachhaltige Landwirtschaft'],
  ['Foresterie / Produits forestiers', 'Fiharian-kazo / Vokatra avy amin’ny ala', 'Forestry / Forest products', 'Forstwirtschaft / Waldprodukte'],
  ['Écotourisme', 'Ekotourisma', 'Ecotourism', 'Ökotourismus'],
  ['Élevage durable', 'Fiompiana maharitra', 'Sustainable livestock farming', 'Nachhaltige Tierhaltung'],
  ['Autres (énergies renouvelables, etc.)', 'Hafa (angovo azo havaozina, sns.)', 'Other (renewable energy, etc.)', 'Sonstige (erneuerbare Energien usw.)'],
];
// [fr, mg, en, de, catégorie d'appui]
const APPUI: Record<string, string[]> = Object.fromEntries([
  ['Formation en apiculture durable', 'Fampiofanana momba ny fiompiana tantely maharitra', 'Training in sustainable beekeeping', 'Schulung in nachhaltiger Imkerei', 'formation'],
  ['Formation en accueil touristique', 'Fampiofanana momba ny fandraisana mpizaha tany', 'Training in tourist hospitality', 'Schulung in touristischer Gastfreundschaft', 'formation'],
  ['Formation en maraîchage bio', 'Fampiofanana momba ny fambolena anana organika', 'Training in organic vegetable farming', 'Schulung im Bio-Gemüseanbau', 'formation'],
  ['Formation en gestion d’entreprise', 'Fampiofanana momba ny fitantanana orinasa', 'Training in business management', 'Schulung in Unternehmensführung', 'formation'],
  ['Équipement ruche moderne', 'Fitaovana tanana-tantely maoderina', 'Modern beehive equipment', 'Moderne Bienenstock-Ausrüstung', 'equipement'],
  ['Matériel d’hébergement', 'Fitaovana fandraisana mpandalo', 'Accommodation equipment', 'Beherbergungsausstattung', 'equipement'],
  ['Machine de transformation bambou', 'Milina fanodinana volotsangana', 'Bamboo processing machine', 'Bambus-Verarbeitungsmaschine', 'equipement'],
  ['Kits solaires', 'Kitra solaire', 'Solar kits', 'Solar-Sets', 'equipement'],
  ['Appui technique', 'Fanampiana ara-teknika', 'Technical support', 'Technische Unterstützung', 'technique'],
  ['Étude de faisabilité', 'Fanadihadiana ny fahafahana manatanteraka', 'Feasibility study', 'Machbarkeitsstudie', 'technique'],
  ['Appui design produit', 'Fanampiana amin’ny endrika vokatra', 'Product design support', 'Unterstützung beim Produktdesign', 'technique'],
  ['Appui à la certification bio', 'Fanampiana amin’ny fanamarinana bio', 'Organic certification support', 'Unterstützung bei der Bio-Zertifizierung', 'certification'],
  ['Appui commercial', 'Fanampiana ara-barotra', 'Commercial support', 'Vertriebsunterstützung', 'commercial'],
  ['Facilitation d’accès au crédit', 'Fanamorana ny fidirana amin’ny trosa', 'Facilitation of access to credit', 'Erleichterung des Kreditzugangs', 'financement'],
].map((a) => [a[0], a] as [string, string[]]));

/* ---------- Traductions ---------- */
const fr = {
  title: 'Suivi des MPME et des initiatives', rf: 'Actualiser', all: 'Tous', more: 'Plus de filtres', reset: 'Réinitialiser', noap: 'Hors aire protégée',
  ld: 'Chargement…', er: 'Chargement impossible. Vérifiez que {0} est accessible, puis actualisez.',
  f: { year: 'Année', region: 'Région', type: 'Type d’entité', chain: 'Chaîne de valeur', ap: 'Aire protégée', paysage: 'Paysage', district: 'District', commune: 'Commune', mbv: 'Micro-bassin versant', fokontany: 'Fokontany' },
  tgt: 'Atteinte de la cible',
  tgtTxt: '{0} micro, petites et moyennes entreprises (MPME) ainsi que des initiatives promouvant des mesures génératrices de revenus ont élargi leur offre de produits ou de services dans des chaînes de valeur « vertes » sélectionnées.',
  of: 'sur {0}', lab: 'MPME et initiatives appuyées', target: 'Cible : {0}',
  cat: 'Répartition des MPME et initiatives appuyées', cMpme: 'MPME appuyées', cIni: 'Initiatives (mesures génératrices de revenus) appuyées', cAll: 'Ensemble (MPME + initiatives)',
  fem: 'Femmes', yth: 'Jeunes (< 35 ans)', staff: 'Part du personnel',
  evol: 'Évolution annuelle de l’atteinte de la cible', eMpme: 'MPME', eIni: 'Initiatives', eTot: 'Total',
  res: 'Résultats observés auprès des entités appuyées', r1: 'Offre élargie', r2: 'Emplois créés', r3: 'Chiffre d’affaires', r4: 'Entités formalisées', r5: 'Accès au financement',
  ofEnt: '{0} sur {1} entités', newOff: '{0} nouveaux produits ou services', jobsTot: '{0} personnes employées au total', caS: '{0} → {1} M Ar',
  map: 'Localisation des MPME et initiatives appuyées', pop: 'Appuis : {0}', hint: 'Cliquez sur une limite pour filtrer (région, district, commune).',
  chT: 'Répartition par chaîne de valeur « verte »', tyT: 'Répartition par type d’entité',
  ty: { MICRO: 'Micro-entreprises', PETITE: 'Petites entreprises', MOYENNE: 'Moyennes entreprises', INIT: 'Initiatives (mesures génératrices de revenus)' },
  ty1: { MICRO: 'Micro-entreprise', PETITE: 'Petite entreprise', MOYENNE: 'Moyenne entreprise', INIT: 'Initiative (MGR)' },
  apT: 'Types d’appui reçus', apC: ['Formation', 'Équipement', 'Appui technique', 'Certification', 'Appui commercial', 'Accès au financement'],
  ca: 'Chiffre d’affaires avant et après l’appui (M Ar)', ca0: 'Avant l’appui', ca1: 'Actuel',
  tb: { title: 'Détails des appuis reçus par les MPME et initiatives', search: 'Rechercher...', exp: 'Exporter', cols: ['Id', 'Nom de l’entité', 'Type d’entité', 'Chaîne de valeur', 'Nombre d’appuis', 'Spécification de l’appui', 'Date d’obtention de l’appui'],
    none: 'Aucun enregistrement pour ces filtres.', show: 'Affichage de {0} à {1} sur {2} enregistrements', rows: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page' },
};
type D = typeof fr;
const mg: D = {
  title: 'Fanaraha-maso ny MPME sy ny hetsika', rf: 'Havaozina', all: 'Rehetra', more: 'Sivana hafa', reset: 'Averina', noap: 'Ivelan’ny faritra arovana',
  ld: 'Mampiditra…', er: 'Tsy afaka naka ny angona. Jereo raha azo vakiana ny {0}, avy eo havaozy.',
  f: { year: 'Taona', region: 'Faritra', type: 'Karazan’ny orinasa', chain: 'Rojom-pamokarana', ap: 'Faritra arovana', paysage: 'Tontolo', district: 'Distrika', commune: 'Kaominina', mbv: 'Tambatra-drano kely', fokontany: 'Fokontany' },
  tgt: 'Fahatratrarana ny tanjona',
  tgtTxt: 'Orinasa madinika, kely ary antonony (MPME) {0} ary hetsika manosika fepetra mitondra vola miditra no nanitatra ny vokatra na serivisy atolotra ao amin’ny rojom-pamokarana « maitso » voafidy.',
  of: 'amin’ny {0}', lab: 'MPME sy hetsika notohanana', target: 'Tanjona : {0}',
  cat: 'Fizarana ny MPME sy ny hetsika notohanana', cMpme: 'MPME notohanana', cIni: 'Hetsika (fepetra mitondra vola miditra) notohanana', cAll: 'Rehetra (MPME + hetsika)',
  fem: 'Vehivavy', yth: 'Tanora (< 35 taona)', staff: 'Anjaran’ny mpiasa',
  evol: 'Fivoaran’ny fahatratrarana ny tanjona isan-taona', eMpme: 'MPME', eIni: 'Hetsika', eTot: 'Total',
  res: 'Vokatra hita ao amin’ireo orinasa notohanana', r1: 'Vokatra/serivisy nitarina', r2: 'Asa noforonina', r3: 'Fidiram-bola', r4: 'Orinasa voarakitra ara-dalàna', r5: 'Fidirana amin’ny famatsiam-bola',
  ofEnt: '{0} amin’ny orinasa {1}', newOff: 'vokatra na serivisy vaovao {0}', jobsTot: 'mpiasa {0} amin’ny total', caS: '{0} → {1} M Ar',
  map: 'Toeran’ny MPME sy ny hetsika notohanana', pop: 'Fanampiana : {0}', hint: 'Tsindrio ny sisintany mba hanivana (faritra, distrika, kaominina).',
  chT: 'Fizarana araka ny rojom-pamokarana « maitso »', tyT: 'Fizarana araka ny karazan’ny orinasa',
  ty: { MICRO: 'Orinasa madinika be', PETITE: 'Orinasa kely', MOYENNE: 'Orinasa antonony', INIT: 'Hetsika (fepetra mitondra vola miditra)' },
  ty1: { MICRO: 'Orinasa madinika be', PETITE: 'Orinasa kely', MOYENNE: 'Orinasa antonony', INIT: 'Hetsika (MGR)' },
  apT: 'Karazana fanampiana azo', apC: ['Fampiofanana', 'Fitaovana', 'Fanampiana ara-teknika', 'Fanamarinana (certification)', 'Fanampiana ara-barotra', 'Fidirana amin’ny famatsiam-bola'],
  ca: 'Fidiram-bola talohan’ny sy aorian’ny fanampiana (M Ar)', ca0: 'Talohan’ny fanampiana', ca1: 'Ankehitriny',
  tb: { title: 'Antsipiriany momba ny fanampiana azon’ny MPME sy ny hetsika', search: 'Hikaroka...', exp: 'Hamoaka', cols: ['Id', 'Anaran’ny orinasa', 'Karazan’ny orinasa', 'Rojom-pamokarana', 'Isan’ny fanampiana', 'Famaritana ny fanampiana', 'Daty nahazoana ny fanampiana'],
    none: 'Tsy misy voarakitra ho an’ireo sivana ireo.', show: 'Aseho ny {0} hatramin’ny {1} amin’ny {2}', rows: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany' },
};
const en: D = {
  title: 'Monitoring of MSMEs and initiatives', rf: 'Refresh', all: 'All', more: 'More filters', reset: 'Reset', noap: 'Outside protected area',
  ld: 'Loading…', er: 'Unable to load data. Check that {0} is reachable, then refresh.',
  f: { year: 'Year', region: 'Region', type: 'Entity type', chain: 'Value chain', ap: 'Protected area', paysage: 'Landscape', district: 'District', commune: 'Municipality', mbv: 'Micro-watershed', fokontany: 'Fokontany' },
  tgt: 'Target achievement',
  tgtTxt: '{0} micro, small and medium enterprises (MSMEs) and initiatives promoting income-generating measures have expanded their range of products or services in selected “green” value chains.',
  of: 'out of {0}', lab: 'MSMEs and initiatives supported', target: 'Target: {0}',
  cat: 'Breakdown of supported MSMEs and initiatives', cMpme: 'MSMEs supported', cIni: 'Initiatives (income-generating measures) supported', cAll: 'Total (MSMEs + initiatives)',
  fem: 'Women', yth: 'Youth (< 35 years)', staff: 'Share of staff',
  evol: 'Annual trend of target achievement', eMpme: 'MSMEs', eIni: 'Initiatives', eTot: 'Total',
  res: 'Results observed among supported entities', r1: 'Expanded offer', r2: 'Jobs created', r3: 'Turnover', r4: 'Formalised entities', r5: 'Access to finance',
  ofEnt: '{0} of {1} entities', newOff: '{0} new products or services', jobsTot: '{0} people employed in total', caS: '{0} → {1} M Ar',
  map: 'Locations of supported MSMEs and initiatives', pop: 'Support: {0}', hint: 'Click a boundary to filter (region, district, municipality).',
  chT: 'Breakdown by “green” value chain', tyT: 'Breakdown by entity type',
  ty: { MICRO: 'Micro-enterprises', PETITE: 'Small enterprises', MOYENNE: 'Medium enterprises', INIT: 'Initiatives (income-generating measures)' },
  ty1: { MICRO: 'Micro-enterprise', PETITE: 'Small enterprise', MOYENNE: 'Medium enterprise', INIT: 'Initiative (IGM)' },
  apT: 'Types of support received', apC: ['Training', 'Equipment', 'Technical support', 'Certification', 'Commercial support', 'Access to finance'],
  ca: 'Turnover before and after support (M Ar)', ca0: 'Before support', ca1: 'Current',
  tb: { title: 'Details of support received by MSMEs and initiatives', search: 'Search...', exp: 'Export', cols: ['Id', 'Entity name', 'Entity type', 'Value chain', 'Number of supports', 'Support details', 'Date support was received'],
    none: 'No records match these filters.', show: 'Showing {0} to {1} of {2} records', rows: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page' },
};
const de: D = {
  title: 'Überwachung der KKMU und Initiativen', rf: 'Aktualisieren', all: 'Alle', more: 'Weitere Filter', reset: 'Zurücksetzen', noap: 'Außerhalb von Schutzgebieten',
  ld: 'Wird geladen…', er: 'Laden nicht möglich. Prüfen Sie, ob {0} erreichbar ist, und aktualisieren Sie dann.',
  f: { year: 'Jahr', region: 'Region', type: 'Unternehmenstyp', chain: 'Wertschöpfungskette', ap: 'Schutzgebiet', paysage: 'Landschaft', district: 'Distrikt', commune: 'Gemeinde', mbv: 'Mikro-Einzugsgebiet', fokontany: 'Fokontany' },
  tgt: 'Zielerreichung',
  tgtTxt: '{0} Kleinst-, kleine und mittlere Unternehmen (KKMU) sowie Initiativen zur Förderung einkommensschaffender Maßnahmen haben ihr Angebot an Produkten oder Dienstleistungen in ausgewählten „grünen“ Wertschöpfungsketten erweitert.',
  of: 'von {0}', lab: 'Unterstützte KKMU und Initiativen', target: 'Ziel: {0}',
  cat: 'Verteilung der unterstützten KKMU und Initiativen', cMpme: 'Unterstützte KKMU', cIni: 'Unterstützte Initiativen (einkommensschaffende Maßnahmen)', cAll: 'Gesamt (KKMU + Initiativen)',
  fem: 'Frauen', yth: 'Jugendliche (< 35 Jahre)', staff: 'Anteil am Personal',
  evol: 'Jährliche Entwicklung der Zielerreichung', eMpme: 'KKMU', eIni: 'Initiativen', eTot: 'Gesamt',
  res: 'Beobachtete Ergebnisse bei den unterstützten Einheiten', r1: 'Erweitertes Angebot', r2: 'Geschaffene Arbeitsplätze', r3: 'Umsatz', r4: 'Formalisierte Einheiten', r5: 'Zugang zu Finanzierung',
  ofEnt: '{0} von {1} Einheiten', newOff: '{0} neue Produkte oder Dienstleistungen', jobsTot: '{0} Beschäftigte insgesamt', caS: '{0} → {1} M Ar',
  map: 'Standorte der unterstützten KKMU und Initiativen', pop: 'Unterstützung: {0}', hint: 'Klicken Sie auf eine Grenze, um zu filtern (Region, Distrikt, Gemeinde).',
  chT: 'Verteilung nach „grüner“ Wertschöpfungskette', tyT: 'Verteilung nach Unternehmenstyp',
  ty: { MICRO: 'Kleinstunternehmen', PETITE: 'Kleine Unternehmen', MOYENNE: 'Mittlere Unternehmen', INIT: 'Initiativen (einkommensschaffende Maßnahmen)' },
  ty1: { MICRO: 'Kleinstunternehmen', PETITE: 'Kleines Unternehmen', MOYENNE: 'Mittleres Unternehmen', INIT: 'Initiative (EM)' },
  apT: 'Erhaltene Unterstützungsarten', apC: ['Schulung', 'Ausrüstung', 'Technische Unterstützung', 'Zertifizierung', 'Vertriebsunterstützung', 'Zugang zu Finanzierung'],
  ca: 'Umsatz vor und nach der Unterstützung (M Ar)', ca0: 'Vor der Unterstützung', ca1: 'Aktuell',
  tb: { title: 'Details der erhaltenen Unterstützung von KKMU und Initiativen', search: 'Suchen...', exp: 'Exportieren', cols: ['ID', 'Name der Einheit', 'Unternehmenstyp', 'Wertschöpfungskette', 'Anzahl Unterstützungen', 'Details der Unterstützung', 'Datum der Unterstützung'],
    none: 'Keine Einträge für diese Filter.', show: 'Anzeige von {0} bis {1} von {2} Einträgen', rows: 'Zeilen pro Seite', first: 'Erste Seite', prev: 'Vorherige Seite', next: 'Nächste Seite', last: 'Letzte Seite' },
};
const TR: Record<Lang, D> = { fr, mg, en, de };
const fmt = (s: string, ...a: (string | number)[]) => s.replace(/\{(\d)\}/g, (_, i) => String(a[+i]));

/* ---------- Helpers ---------- */
type NK = 'eff' | 'effW' | 'effY' | 'jobs' | 'nOff' | 'ca0' | 'ca1' | 'offer' | 'formal' | 'fin' | 'nApp';
const sum = (a: Rec[], k: NK) => a.reduce((t, r) => t + r[k], 0);
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

const FK = ['year', 'region', 'type', 'chain', 'ap', 'paysage', 'district', 'commune', 'mbv', 'fokontany'] as const;
type K = (typeof FK)[number];
const PRIMARY: K[] = ['year', 'region', 'type', 'chain'];
const SECOND: K[] = ['ap', 'paysage', 'district', 'commune', 'fokontany', 'mbv'];
type Lvl = 'region' | 'district' | 'commune';
interface Ly { key: string; features: any[]; style: any; click?: Lvl }
const ST_REG = { color: '#546e7a', weight: 1, fillColor: '#90a4ae', fillOpacity: 0.04 };
const ST_CTX = { color: '#78909c', weight: 1, dashArray: '3', fillColor: '#90a4ae', fillOpacity: 0.05 };
const ST_AP = { color: '#ef6c00', weight: 2, fillColor: '#ef6c00', fillOpacity: 0.15 };
const ST_HL = { color: '#1B5E20', weight: 3, fillColor: '#2E7D32', fillOpacity: 0.12 };

const toRec = (x: any): Rec | null => {
  const p = x?.properties;
  const c = x?.geometry?.coordinates;
  if (!p?.id || !TYPES.includes(p.type)) return null;
  const s = (v: any) => (v == null ? '' : String(v));
  const n = (v: any) => Number(v) || 0;
  return {
    id: s(p.id), nom: s(p.nom), type: p.type, chain: s(p.chaine_valeur), region: s(p.region), ap: s(p.aire_protegee), paysage: s(p.paysage),
    district: s(p.district), commune: s(p.commune), mbv: s(p.mbv), fokontany: s(p.fokontany), loc: s(p.localisation),
    year: n(p.annee) || new Date(s(p.date_appui)).getUTCFullYear() || 0,
    eff: n(p.effectif), effW: n(p.effectif_femmes), effY: n(p.effectif_jeunes), jobs: n(p.emplois_crees),
    nApp: n(p.nombre_appuis), spec: s(p.appui_spec), date: s(p.date_appui),
    offer: n(p.offre_elargie) ? 1 : 0, nOff: n(p.nouvelles_offres), ca0: n(p.ca_initial), ca1: n(p.ca_actuel),
    formal: n(p.formalisee) ? 1 : 0, fin: n(p.acces_financement) ? 1 : 0,
    lat: Array.isArray(c) ? Number(c[1]) : NaN, lng: Array.isArray(c) ? Number(c[0]) : NaN,
  };
};

const Fit = ({ pts }: { pts: [number, number][] }) => {
  const map = useMap();
  useEffect(() => { if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); }, [pts, map]);
  return null;
};
const Donut = ({ v, color, label }: { v: number; color: string; label: string }) => (
  <div className="me-dn" role="img" aria-label={label}
    style={{ background: `conic-gradient(${color} 0 ${Math.min(100, v)}%, #E5E7EB ${Math.min(100, v)}% 100%)` }}>
    <span>{label}</span>
  </div>
);
const Kpi = ({ title, big, sub, sub2, color, icon: Ic }: { title: string; big: string; sub?: string; sub2?: string; color: string; icon: React.ComponentType<any> }) => (
  <div className="me-k" style={{ borderTopColor: color }}>
    <div className="me-kh"><span className="me-ki" style={{ background: `${color}1a`, color }}><Ic size={18} /></span><span>{title}</span></div>
    <div className="me-kb" style={{ color }}>{big}</div>
    {sub && <div className="me-ks">{sub}</div>}
    {sub2 && <div className="me-ks">{sub2}</div>}
  </div>
);
const PieCard = ({ title, data, nf, pct }: { title: string; data: { name: string; value: number; color: string }[]; nf: (n: number, d?: number) => string; pct: (n: number) => string }) => {
  const total = data.reduce((t, d) => t + d.value, 0);
  return (
    <div className="me-c">
      <div className="me-ct">{title}</div>
      <div className="me-pie">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="58%" outerRadius="88%" stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="me-pc"><b>{nf(total)}</b><span>({pct(total ? 100 : 0)})</span></div>
      </div>
      <div className="me-leg">
        {data.map((d) => (
          <div key={d.name}><span><i style={{ background: d.color }} />{d.name}</span><b>{nf(d.value)} ({pct(pc(d.value, total))})</b></div>
        ))}
      </div>
    </div>
  );
};
const useNarrow = () => {
  const [n, setN] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setN(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
};

const CSS = `
.me{background:#f4f6f5;min-height:100vh;font-family:Arial,system-ui,sans-serif;color:#111827}
.me *{box-sizing:border-box}
.me :focus-visible{outline:3px solid #F9A825;outline-offset:2px}
.me-h{background:#0b5d1e;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.me-h h2{margin:0;font-size:clamp(16px,2.4vw,22px);display:flex;align-items:center;gap:8px}
.me-w{padding:clamp(8px,1.6vw,20px);display:flex;flex-direction:column;gap:12px;max-width:2200px;margin:0 auto}
.me-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 12px;border-radius:8px;border:1px solid transparent;background:#2E7D32;color:#fff;font-weight:600;font-size:13px;cursor:pointer;flex-shrink:0}
.me-btn.o{background:transparent;border-color:rgba(255,255,255,.7)}
.me-btn.l{background:#fff;color:#111827;border-color:#d1d5db;font-size:12px}
.me-btn:disabled{opacity:.6;cursor:default}
.me-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;align-items:end}
.me-f2{margin-top:8px;padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:10px}
.me-f label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#374151}
.me select,.me input{height:38px;width:100%;min-width:0;border-radius:8px;border:1px solid #d1d5db;background:#fff;padding:0 10px;font-size:12px}
.me-n{background:#F9A825;color:#111827;border-radius:10px;padding:0 6px;font-size:11px;font-style:normal}
.me-c{background:#fff;border-radius:12px;padding:12px;border:1px solid #eee;min-width:0}
.me-ct{margin:0 0 8px;color:#1B5E20;font-size:13px;font-weight:800}
.me-sub{font-size:11px;color:#6B7280;margin:-4px 0 8px}
.me-a{display:grid;gap:8px;grid-template-columns:1fr 2.5fr 1.3fr}
.me-b{display:grid;gap:12px;grid-template-columns:1.3fr .8fr .8fr}
.me-r{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))}
.me-g2{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.me-t{display:flex;flex-direction:column;align-items:center;text-align:center}
.me-t p{font-size:12px;color:#6B7280;line-height:1.45;margin:6px 0 0;max-width:340px}
.me-tv{font-size:clamp(26px,3vw,32px);font-weight:700;color:#2E7D32;line-height:1;margin-top:12px}
.me-pb{width:100%;height:12px;background:#E5E7EB;border-radius:10px;overflow:hidden;margin-top:12px}
.me-pb b{display:block;height:100%;background:#2E7D32;border-radius:10px}
.me-cg{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.me-mc{border:1px solid #eee;border-radius:12px;padding:10px;display:flex;flex-direction:column;background:#fff}
.me-mh{margin:-10px -10px 10px;padding:8px 6px;color:#fff;font-weight:700;font-size:11px;min-height:46px;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:11px 11px 0 0;line-height:1.2}
.me-mn{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:4px}
.me-mi{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.me-mv{font-size:25px;font-weight:700;line-height:1}
.me-sep{height:1px;background:rgba(0,0,0,.07);margin:12px 0}
.me-dd{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:auto}
.me-dd>div{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:700;text-align:center}
.me-dn{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.me-dn span{width:54px;height:54px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#374151}
.me-k{background:#fff;border:1px solid #eee;border-top:4px solid;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px}
.me-kh{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#374151}
.me-ki{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.me-kb{font-size:clamp(22px,2.4vw,28px);font-weight:800;line-height:1.1}
.me-ks{font-size:11px;color:#6B7280}
.me-pie{position:relative}
.me-pc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.me-pc b{font-size:22px;color:#374151}.me-pc span{font-size:13px;color:#6B7280}
.me-leg{display:flex;flex-direction:column;gap:8px;margin-top:6px;font-size:12px}
.me-leg>div{display:flex;justify-content:space-between;align-items:center;gap:8px}
.me-leg span{display:flex;align-items:center;gap:8px;min-width:0}
.me-leg i{width:12px;height:12px;border-radius:3px;flex-shrink:0}
.me-leg b{white-space:nowrap;color:#374151;font-variant-numeric:tabular-nums}
.me-map{position:relative;border-radius:10px;overflow:hidden}
.me-lgd{position:absolute;bottom:10px;left:10px;z-index:999;background:rgba(255,255,255,.95);padding:8px 10px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.15);font-size:11px}
.me-lgd div{display:flex;align-items:center;gap:6px;margin:3px 0}
.me-lgd i{width:12px;height:12px;border-radius:50%;display:inline-block}
.me-note{margin-top:8px;font-size:12px;color:#6B7280;text-align:center}
.me-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
.me table{width:100%;border-collapse:collapse;font-size:13px}
.me th{background:#2E7D32;color:#fff;padding:10px 8px;text-align:center;border-right:1px solid rgba(255,255,255,.3);font-size:12px}
.me td{padding:10px 8px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-size:12px;line-height:1.35}
.me td.c{text-align:center;white-space:nowrap}
.me-bh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.me-bh h4{margin:0;color:#2E7D32;font-size:14px}
.me-ba{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.me-sb{position:relative;display:inline-flex;align-items:center}
.me-sb svg{position:absolute;left:10px;pointer-events:none}
.me-sb input{padding-left:32px;width:220px}
.me-pg{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;font-size:13px;padding-top:10px;margin-top:10px;border-top:1px solid #eee}
.me-pg>div{display:flex;gap:3px;align-items:center;flex-wrap:wrap}
.me-pg>div:first-child{color:#6b7280;font-weight:700}
.me-pg>div:last-child{justify-content:flex-end;gap:8px;font-weight:600}
.me-pg button{min-width:32px;height:32px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer;font-weight:600}
.me-pg button.on{background:#2E7D32;color:#fff;border-color:#2E7D32}
.me-pg button:disabled{opacity:.4;cursor:default}
.me-pg select{width:auto;height:32px}
@media (max-width:1280px){.me-a{grid-template-columns:1fr 2fr}.me-a>.wide{grid-column:1/-1}.me-b{grid-template-columns:1fr 1fr}.me-b>.wide{grid-column:1/-1}}
@media (max-width:900px){.me-pg{grid-template-columns:1fr;justify-items:center;text-align:center}.me-pg>div:last-child{justify-content:center}}
@media (max-width:760px){.me-a,.me-b{grid-template-columns:1fr}.me-sb,.me-sb input{width:100%}.me-sb{flex:1 1 100%}}
@media (max-width:560px){.me-btn span{display:none}.me-lgd{position:static;margin-top:8px;box-shadow:none;border:1px solid #e5e7eb}}
@media print{.np{display:none!important}.me-c,.me-k,.me-mc{break-inside:avoid}}
`;

/* ===================================================================== */
export default function MicroEntreprise() {
  // Langue choisie au démarrage de l'application (LanguageContext)
  const ctx: any = useLanguage() || {};
  const lc = ctx.lang ?? ctx.language;
  const lang: Lang = lc === 'mg' || lc === 'en' || lc === 'de' ? lc : 'fr';
  const t = TR[lang];
  const narrow = useNarrow();
  const nf = (n: number, d = 0) => n.toLocaleString(LOC[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n: number) => `${nf(n, 1)}%`;
  const dFmt = (iso: string) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString(LOC[lang], { timeZone: 'UTC' }) : '–');
  const cvT = (v: string) => CV.find((x) => x[0] === v)?.[LI[lang]] ?? v;
  const spec = (s: string) => (s ? s.split(';').map((x) => APPUI[x.trim()]?.[LI[lang]] ?? x.trim()).join('; ') : '–');
  const label = (k: K, o: string) => (k === 'ap' && o === NONE ? t.noap : k === 'type' ? t.ty1[o as Ty] ?? o : k === 'chain' ? cvT(o) : o);

  /* ----- Données ----- */
  const [raw, setRaw] = useState<Rec[] | null>(null);
  const [meta, setMeta] = useState<Meta>({});
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adm, setAdm] = useState<{ reg: any; dis: any; com: any }>({ reg: null, dis: null, com: null });
  const recs = useMemo(() => raw ?? [], [raw]);
  const TARGET = meta.cible_entites ?? DEF.cible;
  const START = meta.debut ?? DEF.debut;
  const END = meta.fin ?? DEF.fin;

  const load = () => {
    setErr(false);
    setBusy(true);
    fetch(DATA.entites, { cache: 'no-store' })
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
  const [per, setPer] = useState(10);

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
  const reset = () => { setF({}); setQ(''); setPage(1); setPer(10); };
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
    if (dis || com) setMore(true); // district / commune sont dans « plus de filtres »
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
        {opts(k).map((o) => <option key={o} value={o}>{label(k, o)}</option>)}
      </select>
    </label>
  );

  /* ----- Indicateurs ----- */
  const N = rows.length;
  const taux = pc(N, TARGET);
  const mp = rows.filter((r) => r.type !== 'INIT');
  const ini = rows.filter((r) => r.type === 'INIT');
  const cards = [
    { k: 'mpme', title: t.cMpme, Ic: Building2, color: '#2E7D32', a: mp, den: N },
    { k: 'ini', title: t.cIni, Ic: Leaf, color: '#7CB342', a: ini, den: N },
    { k: 'all', title: t.cAll, Ic: Users, color: '#1B5E20', a: rows, den: TARGET },
  ].map((c) => ({ ...c, n: c.a.length, w: pc(sum(c.a, 'effW'), sum(c.a, 'eff')), y: pc(sum(c.a, 'effY'), sum(c.a, 'eff')) }));

  const cy = new Date().getFullYear();
  const nY = END - START + 1;
  const base = recs.filter((a) => match(a, 'year'));
  const evol = Array.from({ length: nY }, (_, i) => {
    const y = START + i;
    const a = base.filter((r) => r.year <= y);
    const m = a.filter((r) => r.type !== 'INIT').length;
    const past = y <= cy;
    return { year: String(y), mpme: past ? m : null, ini: past ? a.length - m : null, total: past ? a.length : null };
  });

  const offerN = sum(rows, 'offer');
  const ca0 = sum(rows, 'ca0');
  const ca1 = sum(rows, 'ca1');
  const caVar = ca0 ? ((ca1 - ca0) / ca0) * 100 : 0;
  const results = [
    { k: 'r1', title: t.r1, icon: Package, color: '#2E7D32', big: pct(pc(offerN, N)), sub: fmt(t.ofEnt, nf(offerN), nf(N)), sub2: fmt(t.newOff, nf(sum(rows, 'nOff'))) },
    { k: 'r2', title: t.r2, icon: Briefcase, color: BLUE, big: nf(sum(rows, 'jobs')), sub: fmt(t.jobsTot, nf(sum(rows, 'eff'))) },
    { k: 'r3', title: t.r3, icon: TrendingUp, color: '#F9A825', big: `${caVar >= 0 ? '+' : ''}${nf(caVar, 1)}%`, sub: fmt(t.caS, nf(ca0 / 1e6, 1), nf(ca1 / 1e6, 1)) },
    { k: 'r4', title: t.r4, icon: FileCheck, color: '#7CB342', big: pct(pc(sum(rows, 'formal'), N)), sub: fmt(t.ofEnt, nf(sum(rows, 'formal')), nf(N)) },
    { k: 'r5', title: t.r5, icon: Landmark, color: '#FB8C00', big: pct(pc(sum(rows, 'fin'), N)), sub: fmt(t.ofEnt, nf(sum(rows, 'fin')), nf(N)) },
  ];

  const chainData = CV.map((c, i) => ({ name: c[LI[lang]], value: rows.filter((r) => r.chain === c[0]).length, color: CVC[i] }));
  const typeData = TYPES.map((k) => ({ name: t.ty[k], value: rows.filter((r) => r.type === k).length, color: TC[k] }));
  const appuiData = AP_CATS.map((c, i) => ({
    name: t.apC[i],
    value: rows.reduce((s, r) => s + r.spec.split(';').filter((x) => APPUI[x.trim()]?.[4] === c).length, 0),
  }));
  const caData = TYPES.map((k) => {
    const a = rows.filter((r) => r.type === k);
    return { name: t.ty1[k], before: Math.round(sum(a, 'ca0') / 1e5) / 10, after: Math.round(sum(a, 'ca1') / 1e5) / 10, n: a.length };
  }).filter((d) => d.n > 0);

  /* ----- Carte ----- */
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

  /* ----- Tableau ----- */
  const ql = q.trim().toLowerCase();
  const cells = (r: Rec) => [r.id, r.nom, t.ty1[r.type], cvT(r.chain), r.nApp, spec(r.spec), dFmt(r.date)];
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
    a.download = 'mpme_initiatives.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="me" lang={lang}>
      <style>{CSS}</style>

      <header className="me-h">
        <h2><Building2 size={24} />{t.title}</h2>
        <button className="me-btn o np" onClick={() => { reset(); load(); }} disabled={busy} aria-label={t.rf}><RefreshCw size={18} /><span>{t.rf}</span></button>
      </header>

      <main className="me-w">
        {err && <div className="me-c" role="alert">{fmt(t.er, DATA.entites)}</div>}
        {!raw && !err && <div className="me-c">{t.ld}</div>}

        {raw && (<>
          {/* ===== Filtres : 4 principaux + « plus de filtres » ===== */}
          <section className="np">
            <div className="me-f">
              {PRIMARY.map(sel)}
              <button className="me-btn l" aria-expanded={more} aria-label={t.more} onClick={() => setMore(!more)}>
                <SlidersHorizontal size={16} /><span>{t.more}</span>{nSec > 0 && <em className="me-n">{nSec}</em>}
              </button>
              {nAct > 0 && <button className="me-btn l" aria-label={t.reset} onClick={reset}><RotateCcw size={16} /><span>{t.reset}</span></button>}
            </div>
            {more && <div className="me-f me-f2">{SECOND.map(sel)}</div>}
          </section>

          {/* ===== Ligne 1 : cible | répartition | évolution ===== */}
          <section className="me-a">
            <div className="me-c me-t">
              <h3 className="me-ct" style={{ margin: 0 }}>{t.tgt}</h3>
              <p>{fmt(t.tgtTxt, nf(TARGET))}</p>
              <div className="me-tv">{nf(N)}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{fmt(t.of, nf(TARGET))}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: DARK, marginTop: 6 }}>{t.lab}</div>
              <div className="me-pb"><b style={{ width: `${Math.min(100, taux)}%` }} /></div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: GREEN }}>{pct(taux)}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{fmt(t.target, nf(TARGET))}</div>
            </div>

            <div className="me-c">
              <h3 className="me-ct" style={{ margin: 0 }}>{t.cat}</h3>
              <div className="me-sub" style={{ marginTop: 4 }}>{t.staff}</div>
              <div className="me-cg">
                {cards.map((c) => (
                  <div className="me-mc" key={c.k}>
                    <div className="me-mh" style={{ background: c.color }}>{c.title}</div>
                    <div className="me-mn">
                      <span className="me-mi" style={{ background: c.color }}><c.Ic size={22} color="#fff" strokeWidth={2.2} /></span>
                      <div>
                        <div className="me-mv" style={{ color: c.color }}>{nf(c.n)}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: c.color, marginTop: 2 }}>({pct(pc(c.n, c.den))})</div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{fmt(t.of, nf(c.den))}</div>
                      </div>
                    </div>
                    <div className="me-sep" />
                    <div className="me-dd">
                      <div>{t.fem}<Donut v={c.w} color={GREEN} label={pct(c.w)} /></div>
                      <div>{t.yth}<Donut v={c.y} color={BLUE} label={pct(c.y)} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="me-c wide">
              <h3 className="me-ct" style={{ margin: 0 }}>{t.evol}</h3>
              <ResponsiveContainer width="100%" height={narrow ? 230 : 270}>
                <ComposedChart data={evol} margin={{ top: 14, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} padding={{ left: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} domain={[0, (m: number) => Math.max(m, TARGET)]} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={TARGET} stroke="#9CA3AF" strokeDasharray="5 5" label={{ value: nf(TARGET), position: 'top', fill: '#9CA3AF', fontSize: 11 }} />
                  <Area dataKey="mpme" fill={GREEN} fillOpacity={0.12} stroke="none" legendType="none" />
                  <Line name={t.eMpme} dataKey="mpme" stroke={GREEN} strokeWidth={1.6} dot={{ r: 3 }} />
                  <Area dataKey="ini" fill={BLUE} fillOpacity={0.1} stroke="none" legendType="none" />
                  <Line name={t.eIni} dataKey="ini" stroke={BLUE} strokeWidth={1.6} dot={{ r: 3 }} />
                  <Area dataKey="total" fill={DARK} fillOpacity={0.08} stroke="none" legendType="none" />
                  <Line name={t.eTot} dataKey="total" stroke={DARK} strokeWidth={1.6} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Ligne 2 : résultats observés ===== */}
          <section>
            <h3 className="me-ct" style={{ margin: '0 0 8px', fontSize: 14 }}>{t.res}</h3>
            <div className="me-r">{results.map(({ k, ...r }) => <Kpi key={k} {...r} />)}</div>
          </section>

          {/* ===== Ligne 3 : carte | chaînes de valeur | types ===== */}
          <section className="me-b">
            <div className="me-c wide">
              <h3 className="me-ct" style={{ margin: 0, marginBottom: 8 }}>{t.map}</h3>
              <div className="me-map">
                <MapContainer center={[-18.9, 47.5]} zoom={5} scrollWheelZoom={!narrow} style={{ width: '100%', height: 'clamp(280px,42vw,380px)' }}>
                  <TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
                  <Pane name="admin" style={{ zIndex: 350 }}>
                    {layers.map((ly) => (
                      <GeoJSON key={ly.key} data={{ type: 'FeatureCollection', features: ly.features } as any} pane="admin" interactive={!!ly.click}
                        style={() => ly.style}
                        onEachFeature={ly.click ? (ft: any, lay: any) => lay.on({ click: () => pickRef.current(ly.click as Lvl, ft.properties) }) : undefined} />
                    ))}
                  </Pane>
                  {rows.filter(hasXY).map((r) => (
                    <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={Math.max(6, Math.min(16, Math.sqrt(r.eff) * 1.3))}
                      pathOptions={{ color: '#fff', weight: 1.5, fillColor: TC[r.type], fillOpacity: 0.9 }}>
                      <Popup><b>{r.nom}</b><br />{t.ty1[r.type]} · {cvT(r.chain)}<br />{r.commune}, {r.region}<br />{fmt(t.pop, r.nApp)}</Popup>
                    </CircleMarker>
                  ))}
                  <Fit pts={fitPts} />
                </MapContainer>
                <div className="me-lgd">{TYPES.map((k) => <div key={k}><i style={{ background: TC[k] }} />{t.ty1[k]}</div>)}</div>
              </div>
              <div className="me-note">{t.hint}</div>
            </div>
            <PieCard title={t.chT} data={chainData} nf={nf} pct={pct} />
            <PieCard title={t.tyT} data={typeData} nf={nf} pct={pct} />
          </section>

          {/* ===== Ligne 4 : types d'appui | chiffre d'affaires ===== */}
          <section className="me-g2">
            <div className="me-c">
              <h3 className="me-ct" style={{ margin: 0, marginBottom: 8 }}>{t.apT}</h3>
              <ResponsiveContainer width="100%" height={appuiData.length * 38 + 30}>
                <BarChart data={appuiData} layout="vertical" margin={{ left: 0, right: 36 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={narrow ? 100 : 150} tick={{ fontSize: 11 }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="value" fill={GREEN} barSize={18} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="me-c">
              <h3 className="me-ct" style={{ margin: 0, marginBottom: 8 }}>{t.ca}</h3>
              <ResponsiveContainer width="100%" height={appuiData.length * 38 + 30}>
                <BarChart data={caData} margin={{ top: 18, right: 8, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip formatter={(v: any) => `${nf(v, 1)} M Ar`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar name={t.ca0} dataKey="before" fill="#9CA3AF" maxBarSize={36}><LabelList dataKey="before" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 10 }} /></Bar>
                  <Bar name={t.ca1} dataKey="after" fill={GREEN} maxBarSize={36}><LabelList dataKey="after" position="top" formatter={(v: any) => nf(v, 1)} style={{ fontSize: 10, fontWeight: 700 }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Tableau détaillé ===== */}
          <section className="me-c">
            <div className="me-bh">
              <h4>{t.tb.title}</h4>
              <div className="me-ba">
                <span className="me-sb">
                  <Search size={16} color="#888" />
                  <input placeholder={t.tb.search} aria-label={t.tb.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                </span>
                <button className="me-btn np" onClick={exportCsv}>{t.tb.exp}<Download size={16} /></button>
              </div>
            </div>
            <div className="me-tw">
              <table style={{ minWidth: 900 }}>
                <thead><tr>{t.tb.cols.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id}>{cells(r).map((v, i) => <td key={i} className={[0, 4, 6].includes(i) ? 'c' : ''}>{v}</td>)}</tr>
                  ))}
                  {!slice.length && <tr><td colSpan={7}>{t.tb.none}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="me-pg np">
              <div>{table.length ? fmt(t.tb.show, nf((cur - 1) * per + 1), nf(Math.min(cur * per, table.length)), nf(table.length)) : '0'}</div>
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
              <div>
                <span>{t.tb.rows}</span>
                <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </section>
        </>)}
      </main>
    </div>
  );
}
