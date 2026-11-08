import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Area, Line, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, LabelList,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as MapTip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon, Target, MapPin, Package, Users, Sprout, RotateCcw, Download, Search, Calendar,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, CheckCircle2, XCircle, TrendingUp, TrendingDown,
} from 'lucide-react';

/* =====================================================================
   CONFIGURATION ET DONNÉES (source unique : tout le reste en est déduit)
   ===================================================================== */
const GEO_URL = '/data/madagascar_24_region.geojson'; // facultatif : champ « nom_reg » (sinon, bulles sur la carte)
const GEO_PROP = 'nom_reg';
const CIBLE_PAR_REGION = 1; // une région atteint la cible quand elle a élaboré au moins N paquet(s) de mesures
const FEMMES = { valeur: 46.8, cible: 40 }; // part des femmes dans les plateformes (%)
const JEUNES = { valeur: 35.2, cible: 30 }; // part des jeunes (< 35 ans) dans les plateformes (%)
const LV = ['#dc2626', '#f59e0b', '#15803d']; // 0 paquet · 1 paquet · plus d'1 paquet

// Régions d'intervention (supprimez une ligne : tout se recalcule)
const REGIONS: { name: string; pos: [number, number] }[] = [
  { name: 'Boeny', pos: [-16.5, 46.5] },
  { name: 'DIANA', pos: [-13.2, 49.2] },
  { name: 'Vakinankaratra', pos: [-19.9, 46.8] },
  { name: 'Amoron’i Mania', pos: [-20.7, 46.9] },
  { name: 'Anôsy', pos: [-24.6, 46.4] },
  { name: 'Atsimo Atsinanana', pos: [-23.0, 47.4] },
];

// Paquets de mesures élaborés (une ligne = un paquet ; date au format AAAA-MM-JJ)
const PAQUETS = [
  { id: 'PR-DIA-001', region: 'DIANA', date: '2025-04-15', spec: 'Restauration des écosystèmes côtiers et mangroves : gestion durable des ressources en eau et prévention des inondations.' },
  { id: 'PR-DIA-002', region: 'DIANA', date: '2025-04-15', spec: 'Renforcement de la gestion des bassins versants et protection des forêts de captage.' },
  { id: 'PR-BOE-001', region: 'Boeny', date: '2025-04-10', spec: 'Réhabilitation des zones humides et lutte contre l’érosion : promotion de l’agroforesterie.' },
  { id: 'PR-BOE-002', region: 'Boeny', date: '2025-04-10', spec: 'Appui à la gestion intégrée des paysages et valorisation des services écosystémiques.' },
  { id: 'PR-VAK-001', region: 'Vakinankaratra', date: '2025-03-20', spec: 'Préservation des forêts et régulation des flux d’eau : réduction des risques naturels.' },
  { id: 'PR-VAK-002', region: 'Vakinankaratra', date: '2025-03-20', spec: 'Gestion durable des sols et restauration des terres dégradées.' },
  { id: 'PR-AMA-001', region: 'Amoron’i Mania', date: '2025-05-05', spec: 'Gestion durable des pâturages et conservation des ressources naturelles.' },
];

// Trajectoire cible du taux d'atteinte (% de régions ayant atteint la cible)
const TRAJECTOIRE: Record<number, number> = { 2025: 20, 2026: 40, 2027: 60, 2028: 60, 2029: 80, 2030: 100 };
const YEARS = Object.keys(TRAJECTOIRE).map(Number);

/* =====================================================================
   TRADUCTIONS (fr sert de modèle : mêmes clés imposées dans mg / en / de)
   ===================================================================== */
const fr = {
  title: 'Suivi des mesures régionales',
  subtitle: 'Paquets de mesures élaborés par les plateformes régionales pour renforcer les services écosystémiques de régulation',
  filters: 'Filtres', year: 'Année', region: 'Région', allYears: 'Toutes les années', allRegions: 'Toutes les régions', reset: 'Réinitialiser',
  yearHint: 'Cumul des paquets adoptés jusqu’à l’année choisie',
  enonceTitle: 'Énoncé de l’indicateur',
  enonce: 'Les plateformes régionales de coordination intersectorielles dans les cinq régions d’intervention élaborent chacune un paquet de mesures pour améliorer les services écosystémiques de régulation dans le cadre de la mise à jour des plans régionaux de développement.',
  kRate: 'Taux d’atteinte de la cible', kRateSub: (a: number, b: number) => `${a} sur ${b} région${b > 1 ? 's' : ''}`, kRateTarget: 'Cible : 100 %',
  kRegions: 'Régions d’intervention', kRegionsSub: (n: number) => `${n} ayant élaboré au moins un paquet`,
  kPackets: 'Paquets de mesures élaborés', kPacketsSub: (v: string) => `${v} par région en moyenne`,
  kWomen: 'Part des femmes dans les plateformes', kYouth: 'Part des jeunes (< 35 ans) dans les plateformes',
  kTarget: (n: number) => `Cible : ≥ ${n} %`, kMet: 'Cible atteinte', kBelow: 'Sous la cible',
  regTitle: 'Avancement par région', regSub: (n: number) => `Paquets de mesures élaborés · cible : au moins ${n} par région`,
  l0: 'Aucun paquet', l1: '1 paquet', l2: 'Plus d’1 paquet', ok: 'Atteint', ko: 'Non atteint',
  donTitle: 'Régions selon le nombre de paquets', regionsWord: 'régions',
  evoTitle: 'Évolution annuelle du taux d’atteinte', evoSub: '% de régions ayant atteint la cible', evoReal: 'Réalisé', evoTarget: 'Trajectoire cible',
  evoOn: (y: number, a: string, c: string) => `En ${y} : ${a} réalisé pour ${c} attendu. La trajectoire est respectée.`,
  evoOff: (y: number, a: string, c: string) => `En ${y} : ${a} réalisé pour ${c} attendu. Un rattrapage est nécessaire.`,
  cadTitle: 'Rythme d’adoption des paquets', cadSub: 'Paquets adoptés par mois et cumul', cadMonthly: 'Adoptés dans le mois', cadCum: 'Cumul',
  cadEmpty: 'Aucun paquet adopté pour cette sélection.',
  mapTitle: 'Carte des régions selon le nombre de paquets', mapHint: 'Cliquez sur une région pour la sélectionner.', legend: 'Nombre de paquets de mesures',
  tblTitle: 'Détail des paquets de mesures', search: 'Rechercher une région, un identifiant…', export: 'Exporter CSV',
  cols: ['Région', 'Paquets élaborés', 'Id du paquet', 'Date d’adoption', 'Spécification'],
  none: 'Aucun paquet de mesures adopté à ce jour.',
  showing: (a: number, b: number, n: number) => `Affichage de ${a} à ${b} sur ${n} enregistrements`,
  rowsPer: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page',
  noResult: 'Aucun enregistrement. Modifiez les filtres ou la recherche.', pageOf: (p: number, n: number) => `${p} / ${n}`,
  csv: ['Region', 'Paquets elabores', 'Id du paquet', 'Date d’adoption', 'Specification'],
};
type Txt = typeof fr;

const mg: Txt = {
  title: 'Fanaraha-maso ny fepetra isam-paritra',
  subtitle: 'Fonosana fepetra nataon’ny sehatra isam-paritra hanamafisana ny serivisy avy amin’ny tontolo iainana mifehy',
  filters: 'Sivana', year: 'Taona', region: 'Faritra', allYears: 'Taona rehetra', allRegions: 'Faritra rehetra', reset: 'Averina',
  yearHint: 'Fitambaran’ny fonosana nekena hatramin’ny taona voafidy',
  enonceTitle: 'Fanambarana ny tondro',
  enonce: 'Ny sehatra fandrindrana isam-paritra mifandray amin’ny sehatra maro ao amin’ireo faritra dimy fiasana dia samy manao fonosana fepetra iray mba hanatsarana ny serivisy avy amin’ny tontolo iainana mifehy, ao anatin’ny fanavaozana ny drafitra fampandrosoana isam-paritra.',
  kRate: 'Tahan’ny fahatratrarana ny tanjona', kRateSub: (a, b) => `${a} amin’ny faritra ${b}`, kRateTarget: 'Tanjona : 100 %',
  kRegions: 'Faritra fiasana', kRegionsSub: (n) => `${n} no nanao fonosana iray farafahakeliny`,
  kPackets: 'Fonosana fepetra vita', kPacketsSub: (v) => `${v} isaky ny faritra eo ho eo`,
  kWomen: 'Anjaran’ny vehivavy ao amin’ny sehatra', kYouth: 'Anjaran’ny tanora (< 35 taona) ao amin’ny sehatra',
  kTarget: (n) => `Tanjona : ≥ ${n} %`, kMet: 'Tanjona tratra', kBelow: 'Latsaky ny tanjona',
  regTitle: 'Fandrosoana isaky ny faritra', regSub: (n) => `Fonosana fepetra vita · tanjona : ${n} farafahakeliny isaky ny faritra`,
  l0: 'Tsy misy fonosana', l1: 'Fonosana 1', l2: 'Mihoatra ny fonosana 1', ok: 'Tratra', ko: 'Tsy tratra',
  donTitle: 'Faritra araka ny isan’ny fonosana', regionsWord: 'faritra',
  evoTitle: 'Fivoaran’ny tahan’ny fahatratrarana isan-taona', evoSub: '% amin’ny faritra nahatratra ny tanjona', evoReal: 'Vita', evoTarget: 'Làlana tanjona',
  evoOn: (y, a, c) => `Tamin’ny ${y} : ${a} vita ho an’ny ${c} andrasana. Arahina ny làlana.`,
  evoOff: (y, a, c) => `Tamin’ny ${y} : ${a} vita ho an’ny ${c} andrasana. Mila manatratra ny fahatarana.`,
  cadTitle: 'Hafainganam-pandehan’ny fanekena ny fonosana', cadSub: 'Fonosana nekena isam-bolana sy fitambarana', cadMonthly: 'Nekena tao anatin’ny volana', cadCum: 'Fitambarana',
  cadEmpty: 'Tsy misy fonosana nekena ho an’ity fifidianana ity.',
  mapTitle: 'Sarintanin’ny faritra araka ny isan’ny fonosana', mapHint: 'Tsindrio faritra iray hifidianana azy.', legend: 'Isan’ny fonosana fepetra',
  tblTitle: 'Antsipiriany momba ny fonosana fepetra', search: 'Hitady faritra, ID…', export: 'Alaina CSV',
  cols: ['Faritra', 'Fonosana vita', 'ID ny fonosana', 'Daty nekena', 'Famaritana'],
  none: 'Mbola tsy misy fonosana fepetra nekena hatramin’izao.',
  showing: (a, b, n) => `${a} – ${b} amin’ny ${n} voarakitra`,
  rowsPer: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany',
  noResult: 'Tsy misy voarakitra. Ovay ny sivana na ny fikarohana.', pageOf: (p, n) => `${p} / ${n}`,
  csv: ['Faritra', 'Fonosana vita', 'ID ny fonosana', 'Daty nekena', 'Famaritana'],
};

const en: Txt = {
  title: 'Regional measures monitoring',
  subtitle: 'Packages of measures developed by the regional platforms to strengthen regulating ecosystem services',
  filters: 'Filters', year: 'Year', region: 'Region', allYears: 'All years', allRegions: 'All regions', reset: 'Reset',
  yearHint: 'Cumulative packages adopted up to the selected year',
  enonceTitle: 'Indicator statement',
  enonce: 'The regional cross-sectoral coordination platforms in the five intervention regions each develop a package of measures to improve regulating ecosystem services as part of the update of the regional development plans.',
  kRate: 'Target achievement rate', kRateSub: (a, b) => `${a} of ${b} region${b > 1 ? 's' : ''}`, kRateTarget: 'Target: 100 %',
  kRegions: 'Intervention regions', kRegionsSub: (n) => `${n} with at least one package`,
  kPackets: 'Packages of measures developed', kPacketsSub: (v) => `${v} per region on average`,
  kWomen: 'Share of women in the platforms', kYouth: 'Share of young people (< 35) in the platforms',
  kTarget: (n) => `Target: ≥ ${n} %`, kMet: 'Target reached', kBelow: 'Below target',
  regTitle: 'Progress by region', regSub: (n) => `Packages of measures developed · target: at least ${n} per region`,
  l0: 'No package', l1: '1 package', l2: 'More than 1 package', ok: 'Reached', ko: 'Not reached',
  donTitle: 'Regions by number of packages', regionsWord: 'regions',
  evoTitle: 'Yearly trend of the achievement rate', evoSub: '% of regions that reached the target', evoReal: 'Achieved', evoTarget: 'Target trajectory',
  evoOn: (y, a, c) => `In ${y}: ${a} achieved against ${c} expected. The trajectory is on track.`,
  evoOff: (y, a, c) => `In ${y}: ${a} achieved against ${c} expected. Catching up is needed.`,
  cadTitle: 'Package adoption pace', cadSub: 'Packages adopted per month and cumulative total', cadMonthly: 'Adopted in the month', cadCum: 'Cumulative',
  cadEmpty: 'No package adopted for this selection.',
  mapTitle: 'Map of regions by number of packages', mapHint: 'Click a region to select it.', legend: 'Number of packages of measures',
  tblTitle: 'Details of the packages of measures', search: 'Search a region, an ID…', export: 'Export CSV',
  cols: ['Region', 'Packages developed', 'Package ID', 'Adoption date', 'Description'],
  none: 'No package of measures adopted to date.',
  showing: (a, b, n) => `Showing ${a} to ${b} of ${n} records`,
  rowsPer: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page',
  noResult: 'No records found. Change the filters or the search.', pageOf: (p, n) => `${p} / ${n}`,
  csv: ['Region', 'Packages developed', 'Package ID', 'Adoption date', 'Description'],
};

const de: Txt = {
  title: 'Überwachung der regionalen Maßnahmen',
  subtitle: 'Von den regionalen Plattformen erarbeitete Maßnahmenpakete zur Stärkung der regulierenden Ökosystemleistungen',
  filters: 'Filter', year: 'Jahr', region: 'Region', allYears: 'Alle Jahre', allRegions: 'Alle Regionen', reset: 'Zurücksetzen',
  yearHint: 'Kumulierte Pakete bis zum gewählten Jahr',
  enonceTitle: 'Indikatorbeschreibung',
  enonce: 'Die regionalen sektorübergreifenden Koordinierungsplattformen in den fünf Interventionsregionen erarbeiten jeweils ein Maßnahmenpaket zur Verbesserung der regulierenden Ökosystemleistungen im Rahmen der Aktualisierung der regionalen Entwicklungspläne.',
  kRate: 'Zielerreichungsgrad', kRateSub: (a, b) => `${a} von ${b} Region${b > 1 ? 'en' : ''}`, kRateTarget: 'Ziel: 100 %',
  kRegions: 'Interventionsregionen', kRegionsSub: (n) => `${n} mit mindestens einem Paket`,
  kPackets: 'Erarbeitete Maßnahmenpakete', kPacketsSub: (v) => `${v} pro Region im Durchschnitt`,
  kWomen: 'Frauenanteil in den Plattformen', kYouth: 'Anteil Jugendlicher (< 35 Jahre) in den Plattformen',
  kTarget: (n) => `Ziel: ≥ ${n} %`, kMet: 'Ziel erreicht', kBelow: 'Unter dem Ziel',
  regTitle: 'Fortschritt nach Region', regSub: (n) => `Erarbeitete Maßnahmenpakete · Ziel: mindestens ${n} pro Region`,
  l0: 'Kein Paket', l1: '1 Paket', l2: 'Mehr als 1 Paket', ok: 'Erreicht', ko: 'Nicht erreicht',
  donTitle: 'Regionen nach Anzahl der Pakete', regionsWord: 'Regionen',
  evoTitle: 'Jährliche Entwicklung des Zielerreichungsgrads', evoSub: '% der Regionen, die das Ziel erreicht haben', evoReal: 'Erreicht', evoTarget: 'Zielpfad',
  evoOn: (y, a, c) => `${y}: ${a} erreicht bei ${c} erwartet. Der Zielpfad wird eingehalten.`,
  evoOff: (y, a, c) => `${y}: ${a} erreicht bei ${c} erwartet. Aufholbedarf besteht.`,
  cadTitle: 'Tempo der Paketverabschiedung', cadSub: 'Pro Monat verabschiedete Pakete und Summe', cadMonthly: 'Im Monat verabschiedet', cadCum: 'Kumuliert',
  cadEmpty: 'Für diese Auswahl wurde kein Paket verabschiedet.',
  mapTitle: 'Karte der Regionen nach Anzahl der Pakete', mapHint: 'Klicken Sie auf eine Region, um sie auszuwählen.', legend: 'Anzahl der Maßnahmenpakete',
  tblTitle: 'Details der Maßnahmenpakete', search: 'Region, ID suchen…', export: 'CSV exportieren',
  cols: ['Region', 'Erarbeitete Pakete', 'Paket-ID', 'Datum der Verabschiedung', 'Beschreibung'],
  none: 'Bisher wurde kein Maßnahmenpaket verabschiedet.',
  showing: (a, b, n) => `Anzeige von ${a} bis ${b} von ${n} Einträgen`,
  rowsPer: 'Zeilen pro Seite', first: 'Erste Seite', prev: 'Vorherige Seite', next: 'Nächste Seite', last: 'Letzte Seite',
  noResult: 'Keine Einträge. Filter oder Suche ändern.', pageOf: (p, n) => `${p} / ${n}`,
  csv: ['Region', 'Erarbeitete Pakete', 'Paket-ID', 'Datum der Verabschiedung', 'Beschreibung'],
};

const TXT: Record<string, Txt> = { fr, mg, en, de };
const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', mg: 'fr-FR' };

/* =====================================================================
   OUTILS
   ===================================================================== */
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : 2);
const yearOf = (iso: string) => Number(iso.slice(0, 4));
const TICK = { fontSize: 11, fill: 'var(--text-3)' };

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
const csvLine = (cells: (string | number)[]) => cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';');

/* =====================================================================
   STYLES RESPONSIVES (container queries : la page s'adapte à la largeur
   réelle de son conteneur, du petit téléphone au grand écran)
   Couleurs d'interface = variables du thème (clair / sombre).
   Restent fixes : couleurs de données, en-tête vert, éléments posés sur la carte.
   ===================================================================== */
const CSS = `
.sp{--g:#166534;--g2:#15803d;--gt:color-mix(in srgb,#166534 55%,var(--text));
  --ink:var(--text);--mut:var(--text-3);--line:var(--border);
  container-type:inline-size;container-name:sp;width:100%;min-width:0;min-height:100vh;background:var(--surface-2);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.4}
.sp *{box-sizing:border-box}
.sp button,.sp select,.sp input{font-family:inherit}
.sp button:focus-visible,.sp select:focus-visible,.sp input:focus-visible,.sp summary:focus-visible{outline:2px solid #2563eb;outline-offset:2px}

.sp-top{background:linear-gradient(120deg,#14532d,#15803d 70%,#22a05a);color:#fff;padding:clamp(12px,2.4cqw,22px) clamp(12px,2.4cqw,24px)}
.sp-top-in{max-width:1600px;margin:0 auto;display:flex;align-items:center;gap:12px}
.sp-logo{flex:none;width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.16);display:grid;place-items:center}
.sp-h1{margin:0;font-size:clamp(17px,2.6cqw,26px);font-weight:800;line-height:1.2}
.sp-sub{margin:3px 0 0;font-size:clamp(11.5px,1.5cqw,13.5px);opacity:.9}
.sp-body{max-width:1600px;margin:0 auto;padding:clamp(8px,1.6cqw,16px);display:flex;flex-direction:column;gap:12px}

.sp-info{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--g2);border-radius:12px;padding:10px 14px}
.sp-info summary{display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:800;color:var(--gt);font-size:13px;list-style:none}
.sp-info summary::-webkit-details-marker{display:none}
.sp-info p{margin:8px 0 0;color:var(--text-2);font-size:13px}

.sp-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end}
.sp-f{display:flex;flex-direction:column;gap:4px;min-width:0}
.sp-f label{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--text-2)}
.sp-f select,.sp-search input{width:100%;height:40px;padding:0 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface-3);font-size:13px;font-weight:600;color:var(--ink)}
.sp-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.sp-btn:hover{background:var(--surface-3)}
.sp-btn:disabled{opacity:.5;cursor:not-allowed}
.sp-btn.pri{background:var(--g2);border-color:var(--g2);color:#fff}
.sp-btn.pri:hover{background:var(--g)}
.sp-hint{font-size:10.5px;color:var(--mut)}

.sp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px}
.sp-kpi{--cc:color-mix(in srgb,var(--c) 72%,var(--text));
  display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--line);border-top:3px solid var(--c);border-radius:14px;padding:12px 14px;min-width:0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sp-kic{flex:none;width:40px;height:40px;border-radius:11px;background:var(--c);display:grid;place-items:center;color:#fff}
.sp-kb{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.sp-kt{font-size:10.5px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:var(--cc);line-height:1.25}
.sp-kv{font-size:clamp(22px,2.4cqw,30px);font-weight:800;line-height:1.05;font-variant-numeric:tabular-nums}
.sp-ks{font-size:11.5px;color:var(--mut)}
.sp-donut{position:relative;flex:none;width:68px;height:68px}
.sp-meter{position:relative;height:9px;border-radius:999px;background:var(--track);margin:5px 0 2px}
.sp-meter i{display:block;height:100%;border-radius:999px;background:var(--c)}
.sp-meter b{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--text);border-radius:2px}
.sp-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;width:fit-content}
.sp-pill.ok{background:rgba(16,185,129,.18);color:color-mix(in srgb,#065f46 60%,var(--text))}
.sp-pill.ko{background:rgba(239,68,68,.18);color:color-mix(in srgb,#b91c1c 65%,var(--text))}

.sp-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
.sp-grid>*{grid-column:span 12}
.sp-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;min-width:0;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.sp-ct{margin:0;font-size:12.5px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:var(--text)}
.sp-cs{margin:2px 0 0;font-size:11.5px;color:var(--mut)}
.sp-chart{height:230px;min-width:0}
.sp-empty{padding:28px 10px;text-align:center;color:var(--mut);font-size:13px}
.sp-lg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;font-weight:600;color:var(--text-2)}
.sp-lg i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.sp-tip{background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.sp-tip b{display:block;margin-bottom:3px}
.sp-tip div{display:flex;justify-content:space-between;gap:14px}

.sp-reg{display:flex;flex-direction:column;gap:9px}
.sp-rr{display:grid;grid-template-columns:minmax(90px,1.1fr) minmax(0,2fr) auto;gap:8px 12px;align-items:center;cursor:pointer;border-radius:8px;padding:2px 4px}
.sp-rr:hover,.sp-rr.sel{background:color-mix(in srgb,#16a34a 14%,var(--surface))}
.sp-rn{font-weight:700;font-size:12.5px;overflow-wrap:anywhere}
.sp-track{position:relative;height:14px;border-radius:999px;background:var(--track);overflow:hidden}
.sp-track i{display:block;height:100%;border-radius:999px;min-width:6px}
.sp-rv{display:flex;align-items:center;gap:8px;justify-content:flex-end}
.sp-rv strong{min-width:14px;text-align:right;font-variant-numeric:tabular-nums}
.sp-st{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap}
.sp-st.ok{background:rgba(16,185,129,.18);color:color-mix(in srgb,#065f46 60%,var(--text))}
.sp-st.ko{background:rgba(239,68,68,.18);color:color-mix(in srgb,#b91c1c 65%,var(--text))}

.sp-dwrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 18px}
.sp-dchart{position:relative;width:170px;height:170px;flex:none}
.sp-dcenter{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}
.sp-dcenter strong{font-size:26px;font-weight:800;color:var(--gt);line-height:1}
.sp-dcenter span{font-size:11px;color:var(--mut)}
.sp-dleg{display:flex;flex-direction:column;gap:8px;font-size:12.5px;min-width:150px}
.sp-dleg div{display:flex;align-items:center;gap:8px}
.sp-dleg i{width:11px;height:11px;border-radius:3px;flex:none}
.sp-dleg b{margin-left:auto;font-variant-numeric:tabular-nums}
.sp-note{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:8px 10px;border-radius:10px}
.sp-note.ok{background:rgba(22,163,74,.16);color:color-mix(in srgb,#15803d 65%,var(--text))}
.sp-note.ko{background:rgba(245,158,11,.16);color:color-mix(in srgb,#b45309 65%,var(--text))}
.sp-note svg{flex:none;margin-top:1px}

.sp-mapcard{min-height:340px}
.sp-mapwrap{position:relative;flex:1;min-height:300px;border-radius:10px;overflow:hidden;border:1px solid var(--line);isolation:isolate}
.sp-mapwrap .leaflet-container{position:absolute;inset:0;background:#e5e7eb;font-family:inherit}
.sp-mapwrap .leaflet-container:focus,.sp-mapwrap .leaflet-container path:focus{outline:none}
/* légende posée sur la carte (fond Esri clair) : reste claire, texte sombre fixe */
.sp-maplg{position:absolute;left:8px;bottom:8px;z-index:1000;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.95);color:#0f172a;box-shadow:0 1px 5px rgba(0,0,0,.25);font-size:11px;max-width:80%}
.sp-maplg strong{display:block;margin-bottom:3px}
.sp-maplg div{display:flex;align-items:center;gap:6px;margin-top:2px}
.sp-maplg i{width:12px;height:12px;border-radius:50%;display:inline-block}
.sp .leaflet-tooltip.sp-bubble{background:transparent;border:0;box-shadow:none;color:#fff;font-weight:800;font-size:12px;padding:0}
.sp .leaflet-tooltip.sp-bubble::before{display:none}

.sp-tbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 12px}
.sp-tact{display:flex;flex-wrap:wrap;gap:8px;flex:1 1 280px;justify-content:flex-end}
.sp-search{position:relative;flex:1 1 220px;max-width:360px}
.sp-search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--mut)}
.sp-search input{padding-left:34px;font-weight:500}
.sp-tw{overflow:auto;border:1px solid var(--line);border-radius:10px}
.sp-t{width:100%;border-collapse:separate;border-spacing:0;font-size:12.5px}
.sp-t th{position:sticky;top:0;background:var(--g);color:#fff;padding:10px 10px;text-align:left;font-weight:700;white-space:nowrap}
.sp-t td{padding:10px;border-bottom:1px solid var(--line);vertical-align:top;background:var(--surface)}
.sp-t tbody tr:hover td{background:color-mix(in srgb,#16a34a 14%,var(--surface))}
.sp-t td.c,.sp-t th.c{text-align:center}
.sp-t td.s{min-width:260px}
.sp-t .mut{color:var(--mut)}
.sp-pg{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 14px;font-size:12.5px;color:var(--mut)}
.sp-pgb{display:flex;align-items:center;gap:4px}
.sp-pgb button{min-width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line);background:var(--surface);border-radius:8px;cursor:pointer;color:var(--ink);font-weight:700;padding:0 8px}
.sp-pgb button:disabled{opacity:.4;cursor:not-allowed}
.sp-pgb span{padding:0 8px;font-weight:700;color:var(--ink)}
.sp-pg select{height:34px;border:1px solid var(--line);border-radius:8px;background:var(--surface-3);color:var(--ink);padding:0 8px;font-size:12.5px}

/* ≥ 720 px : deux colonnes */
@container sp (min-width:720px){
  .sp-grid>.cReg,.sp-grid>.cEvo,.sp-grid>.cDon,.sp-grid>.cCad{grid-column:span 6}
  .sp-grid>.cMap{order:3}
}
/* ≥ 1100 px : disposition complète */
@container sp (min-width:1100px){
  .sp-grid>.cReg{grid-column:span 5}
  .sp-grid>.cEvo{grid-column:span 4}
  .sp-grid>.cDon{grid-column:span 3}
  .sp-grid>.cMap{grid-column:span 7;order:1}
  .sp-grid>.cCad{grid-column:span 5;order:2}
  .sp-chart{height:250px}
  .sp-mapwrap{min-height:380px}
}
@container sp (min-width:1800px){
  .sp{font-size:15px}
  .sp-t{font-size:13.5px}
}
/* ≤ 640 px : tableau en cartes, éléments empilés */
@container sp (max-width:640px){
  .sp-logo{width:38px;height:38px}
  .sp-btn span.t{display:none}
  .sp-tact{justify-content:stretch}
  .sp-search{max-width:none}
  .sp-t thead{display:none}
  .sp-t,.sp-t tbody,.sp-t tr,.sp-t td{display:block;width:100%}
  .sp-t tr{border-bottom:6px solid var(--surface-2);padding:6px 0}
  .sp-t td{display:flex;gap:10px;justify-content:space-between;border:0;padding:5px 12px;text-align:right}
  .sp-t td.c{text-align:right}
  .sp-t td::before{content:attr(data-label);font-weight:700;color:var(--gt);text-align:left;flex:none}
  .sp-t td.s{min-width:0;flex-direction:column;gap:2px;text-align:left}
  .sp-pg{justify-content:center}
  .sp-rr{grid-template-columns:minmax(0,1fr) auto}
  .sp-rr .sp-track{grid-column:1 / -1;order:3}
}
/* Impression : toujours en clair, même en thème sombre */
@media print{
  .sp-filters,.sp-pg,.sp-tact{display:none!important}
  .sp{--surface:#fff;--surface-2:#fff;--surface-3:#f8fafc;--border:#e2e8f0;--track:#e5e7eb;
    --text:#0f172a;--text-2:#334155;--text-3:#64748b;--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--gt:#166534;
    background:#fff;color:#0f172a}
}
@media (prefers-reduced-motion:reduce){.sp *{transition:none!important;animation:none!important}}
`;

/* =====================================================================
   CARTE
   ===================================================================== */
function FitView({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const key = pts.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!pts.length) { map.setView([-19, 47], 5); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: pts.length === 1 ? 7 : 8 });
  }, [key, map]);
  return null;
}
function ResizeMap() {
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
// Polygones des régions (si le fichier GeoJSON est disponible), colorés selon le nombre de paquets
function RegionPolygons({ geo, stats, selected, onPick, label }: any) {
  const map = useMap();
  useEffect(() => {
    if (!geo.length) return;
    const byName = new Map<string, any>(stats.map((s: any) => [norm(s.name), s]));
    const g = L.featureGroup();
    geo.forEach((f: any) => {
      const s = byName.get(norm(f?.properties?.[GEO_PROP]));
      const l = L.geoJSON(f, {
        style: () => ({
          color: s ? (selected === s.name ? '#0f172a' : '#ffffff') : '#94a3b8', weight: s ? (selected === s.name ? 3 : 1.4) : 0.6,
          fillColor: s ? LV[s.level] : '#cbd5e1', fillOpacity: s ? 0.5 : 0.12,
        }),
      });
      if (s) { l.bindTooltip(`<b>${s.name}</b><br/>${label(s.n)}`, { sticky: true }); l.on('click', () => onPick(s.name)); }
      l.addTo(g);
    });
    g.addTo(map);
    return () => { map.removeLayer(g); };
  }, [geo, stats, selected, map]);
  return null;
}

/* =====================================================================
   PAGE
   ===================================================================== */
export default function SurfacesAgropastorales() {
  /* ---------- Langue (contexte de l'application) ---------- */
  const langCtx: any = useLanguage();
  const lang: string = langCtx?.lang ?? langCtx?.language ?? langCtx?.locale ?? 'fr';
  const t: Txt = TXT[lang] || fr;
  const LOC = LOCALES[lang] || 'fr-FR';
  const fmtP = (v: number, d = 1) => `${v.toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
  const fmtD = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(LOC, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const lvName = [t.l0, t.l1, t.l2];
  const thisYear = new Date().getFullYear();

  /* ---------- Filtres ---------- */
  const [year, setYear] = useState(0); // 0 = toutes les années
  const [region, setRegion] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const reset = () => { setYear(0); setRegion(''); setQ(''); };

  /* ---------- Données dérivées (source unique) ---------- */
  const regsSel = useMemo(() => REGIONS.filter((r) => !region || r.name === region), [region]);
  const packets = useMemo(() => PAQUETS.filter((p) => (!region || p.region === region) && (!year || yearOf(p.date) <= year)), [region, year]);
  const stats = useMemo(() => regsSel.map((r) => {
    const n = packets.filter((p) => p.region === r.name).length;
    return { ...r, n, level: level(n), ok: n >= CIBLE_PAR_REGION };
  }), [regsSel, packets]);

  const nReg = stats.length;
  const nOk = stats.filter((s) => s.ok).length;
  const rate = nReg ? (nOk / nReg) * 100 : 0;
  const avg = nReg ? packets.length / nReg : 0;

  const levels = [0, 1, 2].map((i) => ({ name: lvName[i], value: stats.filter((s) => s.level === i).length, color: LV[i] }));
  const maxN = Math.max(2, ...stats.map((s) => s.n));
  const sortedStats = useMemo(() => [...stats].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'fr')), [stats]);

  // Évolution : taux réalisé (déduit des dates d'adoption) comparé à la trajectoire cible
  const evo = useMemo(() => YEARS.map((y) => {
    const done = regsSel.filter((r) => PAQUETS.some((p) => p.region === r.name && yearOf(p.date) <= y)).length;
    return { annee: String(y), cible: TRAJECTOIRE[y], realise: y <= thisYear && regsSel.length ? Math.round((done / regsSel.length) * 1000) / 10 : null };
  }), [regsSel, thisYear]);
  const refYear = year || Math.min(thisYear, YEARS[YEARS.length - 1]);
  const refPoint = evo.find((e) => e.annee === String(refYear));
  const evoMsg = refPoint && refPoint.realise != null
    ? { ok: refPoint.realise >= refPoint.cible, text: (refPoint.realise >= refPoint.cible ? t.evoOn : t.evoOff)(refYear, fmtP(refPoint.realise, 0), fmtP(refPoint.cible, 0)) }
    : null;

  // Rythme d'adoption : paquets par mois et cumul
  const cad = useMemo(() => {
    const m = new Map<string, number>();
    packets.forEach((p) => { const k = p.date.slice(0, 7); m.set(k, (m.get(k) || 0) + 1); });
    let c = 0;
    return Array.from(m.entries()).sort().map(([k, n]) => {
      c += n;
      const [y, mo] = k.split('-').map(Number);
      return { mois: new Date(y, mo - 1, 1).toLocaleDateString(LOC, { month: 'short', year: '2-digit' }), n, c };
    });
  }, [packets, LOC]);

  // Tableau détaillé (une ligne par paquet ; une ligne « aucun paquet » pour les régions vides)
  const allRows = useMemo(() => stats.flatMap((s) => s.n
    ? packets.filter((p) => p.region === s.name).map((p) => ({ region: s.name, n: s.n, id: p.id, date: fmtD(p.date), spec: p.spec }))
    : [{ region: s.name, n: 0, id: '—', date: '—', spec: t.none }]), [stats, packets, t, LOC]);
  const qn = norm(q);
  const rows = useMemo(() => allRows.filter((r) => !qn || norm(`${r.region} ${r.id} ${r.spec}`).includes(qn)), [allRows, qn]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageC = Math.min(page, pages);
  const startI = (pageC - 1) * pageSize;
  const pageRows = rows.slice(startI, startI + pageSize);
  useEffect(() => { setPage(1); }, [region, year, q, pageSize]);

  const exportCSV = () => {
    const lines = [csvLine(t.csv)];
    rows.forEach((r) => lines.push(csvLine([r.region, r.n, r.id, r.date, r.spec])));
    download('mesures_regionales.csv', lines.join('\n'));
  };

  // Polygones des régions (facultatif)
  const [geo, setGeo] = useState<any[]>([]);
  useEffect(() => {
    let on = true;
    fetch(GEO_URL).then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => on && setGeo(j.features || [])).catch(() => { /* bulles seules */ });
    return () => { on = false; };
  }, []);

  const pkLabel = (n: number) => lvName[level(n)] + (n > 1 ? ` (${n})` : '');
  const filtered = !!(year || region || q);

  /* ---------- Info-bulles des graphiques ---------- */
  const EvoTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="sp-tip">
        <b>{label}</b>
        {d.realise != null && <div><span>{t.evoReal}</span><strong>{fmtP(d.realise)}</strong></div>}
        <div><span>{t.evoTarget}</span><strong>{fmtP(d.cible)}</strong></div>
      </div>
    );
  };
  const CadTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="sp-tip">
        <b>{label}</b>
        <div><span>{t.cadMonthly}</span><strong>{d.n}</strong></div>
        <div><span>{t.cadCum}</span><strong>{d.c}</strong></div>
      </div>
    );
  };

  /* =====================================================================
     RENDU
     ===================================================================== */
  return (
    <div className="sp">
      <style>{CSS}</style>

      {/* ============ EN-TÊTE ============ */}
      <header className="sp-top">
        <div className="sp-top-in">
          <div className="sp-logo" aria-hidden="true"><MapIcon size={24} /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sp-h1">{t.title}</h1>
            <p className="sp-sub">{t.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="sp-body">
        {/* ============ ÉNONCÉ DE L'INDICATEUR ============ */}
        <details className="sp-info" open>
          <summary><Info size={16} />{t.enonceTitle}</summary>
          <p>{t.enonce}</p>
        </details>

        {/* ============ FILTRES ============ */}
        <section className="sp-filters" aria-label={t.filters}>
          <div className="sp-f">
            <label htmlFor="sp-year"><Calendar size={13} color="currentColor" />{t.year}</label>
            <select id="sp-year" value={year} onChange={(e) => setYear(Number(e.target.value))} title={t.yearHint}>
              <option value={0}>{t.allYears}</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="sp-f">
            <label htmlFor="sp-reg"><MapPin size={13} color="currentColor" />{t.region}</label>
            <select id="sp-reg" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{t.allRegions}</option>
              {REGIONS.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div className="sp-f">
            <button className="sp-btn pri" onClick={reset} disabled={!filtered}><RotateCcw size={14} /><span className="t">{t.reset}</span></button>
          </div>
        </section>

        {/* ============ INDICATEURS CLÉS ============ */}
        <section className="sp-kpis" aria-label="KPI">
          <div className="sp-kpi" style={{ '--c': '#15803d' } as React.CSSProperties}>
            <div className="sp-kb">
              <div className="sp-kt">{t.kRate}</div>
              <div className="sp-kv">{fmtP(rate)}</div>
              <div className="sp-ks">{t.kRateSub(nOk, nReg)}</div>
              <div className="sp-ks">{t.kRateTarget}</div>
            </div>
            <div className="sp-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ v: rate }, { v: 100 - rate }]} dataKey="v" innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="#15803d" /><Cell fill="var(--track)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="sp-kpi" style={{ '--c': '#1565c0' } as React.CSSProperties}>
            <div className="sp-kic"><Target size={22} /></div>
            <div className="sp-kb">
              <div className="sp-kt">{t.kRegions}</div>
              <div className="sp-kv">{nReg}</div>
              <div className="sp-ks">{t.kRegionsSub(nOk)}</div>
            </div>
          </div>

          <div className="sp-kpi" style={{ '--c': '#ef6c00' } as React.CSSProperties}>
            <div className="sp-kic"><Package size={22} /></div>
            <div className="sp-kb">
              <div className="sp-kt">{t.kPackets}</div>
              <div className="sp-kv">{packets.length}</div>
              <div className="sp-ks">{t.kPacketsSub(avg.toLocaleString(LOC, { maximumFractionDigits: 1 }))}</div>
            </div>
          </div>

          {[{ k: t.kWomen, d: FEMMES, c: '#7b1fa2', Icon: Users }, { k: t.kYouth, d: JEUNES, c: '#00897b', Icon: Sprout }].map(({ k, d, c, Icon }) => (
            <div className="sp-kpi" key={k} style={{ '--c': c } as React.CSSProperties}>
              <div className="sp-kic"><Icon size={22} /></div>
              <div className="sp-kb">
                <div className="sp-kt">{k}</div>
                <div className="sp-kv">{fmtP(d.valeur)}</div>
                <div className="sp-meter" role="progressbar" aria-valuenow={d.valeur} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${Math.min(100, d.valeur)}%` }} /><b style={{ left: `${d.cible}%` }} title={t.kTarget(d.cible)} />
                </div>
                <div className="sp-ks">{t.kTarget(d.cible)}</div>
                <span className={`sp-pill ${d.valeur >= d.cible ? 'ok' : 'ko'}`}>
                  {d.valeur >= d.cible ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{d.valeur >= d.cible ? t.kMet : t.kBelow}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* ============ GRAPHIQUES + CARTE ============ */}
        <div className="sp-grid">
          {/* Avancement par région */}
          <section className="sp-card cReg">
            <div>
              <h2 className="sp-ct">{t.regTitle}</h2>
              <p className="sp-cs">{t.regSub(CIBLE_PAR_REGION)}</p>
            </div>
            <div className="sp-reg">
              {sortedStats.map((s) => (
                <div key={s.name} className={`sp-rr${region === s.name ? ' sel' : ''}`} onClick={() => setRegion(region === s.name ? '' : s.name)} title={pkLabel(s.n)}>
                  <div className="sp-rn">{s.name}</div>
                  <div className="sp-track"><i style={{ width: `${(s.n / maxN) * 100}%`, background: LV[s.level], opacity: s.n ? 0.9 : 0 }} /></div>
                  <div className="sp-rv">
                    <strong>{s.n}</strong>
                    <span className={`sp-st ${s.ok ? 'ok' : 'ko'}`}>{s.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{s.ok ? t.ok : t.ko}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="sp-lg" style={{ marginTop: 'auto' }}>
              {[0, 1, 2].map((i) => <span key={i}><i style={{ background: LV[i] }} />{lvName[i]}</span>)}
            </div>
          </section>

          {/* Évolution annuelle */}
          <section className="sp-card cEvo">
            <div>
              <h2 className="sp-ct">{t.evoTitle}</h2>
              <p className="sp-cs">{t.evoSub}</p>
            </div>
            <div className="sp-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evo} margin={{ top: 14, right: 12, left: 2, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="annee" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 14, right: 14 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={TICK} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<EvoTip />} />
                  {year > 0 && <ReferenceLine x={String(year)} stroke="var(--text)" strokeDasharray="2 3" />}
                  <Area type="monotone" dataKey="realise" stroke="none" fill="#15803d" fillOpacity={0.15} connectNulls={false} />
                  <Line type="monotone" dataKey="cible" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2.5, fill: '#94a3b8', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="realise" stroke="#15803d" strokeWidth={2.8} dot={{ r: 4, fill: 'var(--surface)', stroke: '#15803d', strokeWidth: 2 }} connectNulls={false}>
                    <LabelList dataKey="realise" position="top" formatter={(v: any) => (v == null ? '' : `${Math.round(v)}%`)} style={{ fontSize: 11, fontWeight: 700, fill: 'var(--text)' }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="sp-lg">
              <span><i style={{ background: '#15803d' }} />{t.evoReal}</span>
              <span><i style={{ background: '#94a3b8' }} />{t.evoTarget}</span>
            </div>
            {evoMsg && <div className={`sp-note ${evoMsg.ok ? 'ok' : 'ko'}`}>{evoMsg.ok ? <TrendingUp size={15} /> : <TrendingDown size={15} />}<span>{evoMsg.text}</span></div>}
          </section>

          {/* Répartition */}
          <section className="sp-card cDon">
            <h2 className="sp-ct">{t.donTitle}</h2>
            <div className="sp-dwrap">
              <div className="sp-dchart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={levels.filter((l) => l.value > 0)} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                      {levels.filter((l) => l.value > 0).map((l, i) => <Cell key={i} fill={l.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="sp-dcenter"><strong>{nReg}</strong><span>{t.regionsWord}</span></div>
              </div>
              <div className="sp-dleg">
                {levels.map((l) => (
                  <div key={l.name}><i style={{ background: l.color }} />{l.name}<b>{l.value} · {fmtP(nReg ? (l.value / nReg) * 100 : 0, 0)}</b></div>
                ))}
              </div>
            </div>
          </section>

          {/* Carte */}
          <section className="sp-card sp-mapcard cMap">
            <div>
              <h2 className="sp-ct">{t.mapTitle}</h2>
              <p className="sp-cs">{t.mapHint}</p>
            </div>
            <div className="sp-mapwrap">
              <MapContainer center={[-19, 47]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
                <ResizeMap />
                <FitView pts={stats.map((s) => s.pos)} />
                <RegionPolygons geo={geo} stats={stats} selected={region} onPick={(n: string) => setRegion(n)} label={pkLabel} />
                {stats.map((s) => (
                  <CircleMarker key={s.name} center={s.pos} radius={region === s.name ? 19 : 15}
                    pathOptions={{ color: region === s.name ? '#0f172a' : '#ffffff', weight: region === s.name ? 3 : 2, fillColor: LV[s.level], fillOpacity: 0.95 }}
                    eventHandlers={{ click: () => setRegion(region === s.name ? '' : s.name) }}>
                    <MapTip permanent direction="center" className="sp-bubble">{s.n}</MapTip>
                  </CircleMarker>
                ))}
              </MapContainer>
              <div className="sp-maplg">
                <strong>{t.legend}</strong>
                {[0, 1, 2].map((i) => <div key={i}><i style={{ background: LV[i] }} />{lvName[i]}</div>)}
              </div>
            </div>
          </section>

          {/* Rythme d'adoption */}
          <section className="sp-card cCad">
            <div>
              <h2 className="sp-ct">{t.cadTitle}</h2>
              <p className="sp-cs">{t.cadSub}</p>
            </div>
            {cad.length ? (
              <>
                <div className="sp-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cad} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" tick={TICK} axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} />
                      <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={30} />
                      <Tooltip content={<CadTip />} cursor={{ fill: 'rgba(22,163,74,.10)' }} />
                      <Bar dataKey="n" fill="#15803d" fillOpacity={0.85} radius={[6, 6, 0, 0]} barSize={28} />
                      <Line type="monotone" dataKey="c" stroke="#ef6c00" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--surface)', stroke: '#ef6c00', strokeWidth: 2 }}>
                        <LabelList dataKey="c" position="top" style={{ fontSize: 11, fontWeight: 700, fill: 'var(--text)' }} />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="sp-lg">
                  <span><i style={{ background: '#15803d' }} />{t.cadMonthly}</span>
                  <span><i style={{ background: '#ef6c00' }} />{t.cadCum}</span>
                </div>
              </>
            ) : <div className="sp-empty">{t.cadEmpty}</div>}
          </section>
        </div>

        {/* ============ TABLEAU DÉTAILLÉ ============ */}
        <section className="sp-card">
          <div className="sp-tbar">
            <h2 className="sp-ct">{t.tblTitle}</h2>
            <div className="sp-tact">
              <div className="sp-search">
                <Search size={15} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
              </div>
              <button className="sp-btn" onClick={exportCSV} disabled={!rows.length}><Download size={14} /><span className="t">{t.export}</span></button>
            </div>
          </div>

          <div className="sp-tw">
            <table className="sp-t">
              <thead>
                <tr>
                  <th>{t.cols[0]}</th><th className="c">{t.cols[1]}</th><th className="c">{t.cols[2]}</th><th className="c">{t.cols[3]}</th><th>{t.cols[4]}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={`${r.id}-${r.region}-${i}`}>
                    <td data-label={t.cols[0]}><strong>{r.region}</strong></td>
                    <td className="c" data-label={t.cols[1]}>{r.n}</td>
                    <td className="c" data-label={t.cols[2]}>{r.id}</td>
                    <td className="c" data-label={t.cols[3]}>{r.date}</td>
                    <td className={`s${r.n ? '' : ' mut'}`} data-label={t.cols[4]}>{r.spec}</td>
                  </tr>
                ))}
                {!pageRows.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>{t.noResult}</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="sp-pg">
            <span>{rows.length ? t.showing(startI + 1, Math.min(rows.length, startI + pageSize), rows.length) : t.noResult}</span>
            <div className="sp-pgb">
              <button onClick={() => setPage(1)} disabled={pageC === 1} aria-label={t.first}><ChevronsLeft size={15} /></button>
              <button onClick={() => setPage(pageC - 1)} disabled={pageC === 1} aria-label={t.prev}><ChevronLeft size={15} /></button>
              <span>{t.pageOf(pageC, pages)}</span>
              <button onClick={() => setPage(pageC + 1)} disabled={pageC >= pages} aria-label={t.next}><ChevronRight size={15} /></button>
              <button onClick={() => setPage(pages)} disabled={pageC >= pages} aria-label={t.last}><ChevronsRight size={15} /></button>
            </div>
            <label>{t.rowsPer}{' '}
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>{[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
