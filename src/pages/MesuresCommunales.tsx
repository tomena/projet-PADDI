import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, BarChart, Bar, LabelList, Legend,
} from "recharts";
import { Landmark, RefreshCw, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, Users } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

/* ================= TRADUCTIONS =================
   `fr` sert de modèle : TypeScript impose que mg / en / de contiennent exactement les mêmes clés. */
const fr = {
  title: "Suivi des mesures communales", refresh: "Actualiser", year: "Année",
  filters: { region: "Région", aire: "Aire protégée", paysage: "Paysage", district: "District", name: "Commune" },
  all: { region: "Toutes", aire: "Toutes", paysage: "Tous", district: "Tous", name: "Toutes" },
  keyPoint: "À retenir", searchCommune: "Rechercher une commune…",
  noMatch: "Aucune commune ne correspond aux filtres choisis.",
  summary: (ok: number, total: number, pct: string, year: number) => `${ok} commune${ok > 1 ? "s" : ""} sur ${total} (${pct} %) ont atteint la cible fin ${year}.`,
  remaining: (n: number, cible: number) => `Il en manque ${n} pour atteindre ${cible} %.`,
  targetMet: (cible: number) => `La cible de ${cible} % est atteinte.`,
  priorityRegion: (name: string, pct: string) => `Région à appuyer en priorité : ${name} (${pct} %).`,
  statementTitle: "Énoncé de l'indicateur",
  statement: (c: number) => `3 mesures prioritaires pour améliorer les services écosystémiques d'approvisionnement sont adoptées par les conseils communaux dans ${c} % des communes d'intervention, à partir des plans d'aménagement existants, dont 1 mesure tenant compte des besoins spécifiques des femmes et des jeunes.`,
  kpiRate: "Taux d'atteinte de la cible", target: (c: number) => `Cible : ${c} %`,
  ofCommunes: (ok: number, total: number) => `${ok} sur ${total} communes`,
  kpiRemaining: "Reste à faire", toConvince: (c: number) => `communes à convaincre pour atteindre ${c} %`,
  kpiWomen: "Part des femmes atteinte", kpiYouth: "Part des jeunes (< 35 ans)", persons: "pers.",
  kpiCommunes: "Communes d'intervention", displayed: "communes affichées",
  donut1: "Communes selon le nombre de mesures décidées", donut2: "Communes selon les mesures femmes et jeunes", communesLc: "communes",
  m0: "0 mesure", m12: "1 à 2 mesures", m3: "3 mesures", m3p: "Plus de 3 mesures", m1: "1 mesure", m1p: "Plus de 1 mesure",
  trend: "Évolution annuelle du taux d'atteinte (%)", planned: "Trajectoire prévue", actual: "Réalisé",
  byRegion: "Taux d'atteinte par région (% de communes)", noData: "Aucune donnée.", reached: "Atteint",
  regionTip: (pct: string, ok: number, total: number) => `${pct} % (${ok}/${total} communes)`,
  prio: "Communes à accompagner en priorité", allReached: "Toutes les communes affichées ont atteint la cible.",
  prioAria: "Communes à accompagner, liste défilante",
  missing: (need: number, inc: boolean) => `Manque ${need} mesure${need > 1 ? "s" : ""}${inc ? " dont 1 pour les femmes et les jeunes" : ""}`,
  prioHint: (n: number) => `${n} communes à accompagner : faites défiler pour voir la suite`,
  tableTitle: "Détail des mesures adoptées par les communes", searchMeasure: "Rechercher une mesure…", search: "Rechercher",
  audience: "Public visé", allAudience: "Tous", womenYouth: "Femmes et jeunes", export: "Exporter",
  colId: "ID de la mesure", colDate: "Date d'adoption", colSpec: "Spécification de la mesure",
  noMeasures: "Aucune mesure trouvée. Modifiez les filtres ou la recherche.",
  range: (a: number, b: number, n: number) => `${a} – ${b} sur ${n} mesures`,
  prev: "Page précédente", next: "Page suivante", rowsPerPage: "Lignes par page",
  source: "Source :", loading: "Chargement des données…", demo: "Données fictives de démonstration",
  csv: ["ID", "Commune", "Région", "Date d'adoption", "Mesure", "Femmes/jeunes"], yes: "Oui", no: "Non",
};
type Txt = typeof fr;

const mg: Txt = {
  title: "Fanaraha-maso ny fepetra kaominina", refresh: "Havaozina", year: "Taona",
  filters: { region: "Faritra", aire: "Faritra arovana", paysage: "Tontolo", district: "Distrika", name: "Kaominina" },
  all: { region: "Rehetra", aire: "Rehetra", paysage: "Rehetra", district: "Rehetra", name: "Rehetra" },
  keyPoint: "Tokony hotsaroana", searchCommune: "Hitady kaominina…",
  noMatch: "Tsy misy kaominina mifanaraka amin'ny sivana nofidina.",
  summary: (ok, total, pct, year) => `Kaominina ${ok} amin'ny ${total} (${pct} %) no tafita ny tanjona tamin'ny faran'ny ${year}.`,
  remaining: (n, cible) => `Mbola ${n} no ilaina mba hahatratra ny ${cible} %.`,
  targetMet: (cible) => `Tratra ny tanjona ${cible} %.`,
  priorityRegion: (name, pct) => `Faritra tokony hojerena voalohany : ${name} (${pct} %).`,
  statementTitle: "Fanambarana ny tondro",
  statement: (c) => `Fepetra laharam-pahamehana 3 hanatsarana ny tolotra avy amin'ny tontolo iainana no raisin'ny filankevitry ny kaominina ao amin'ny ${c} % amin'ireo kaominina iasana, mifototra amin'ny drafitra fandrindrana efa misy, ka 1 amin'izany dia mijery ny filan'ny vehivavy sy ny tanora manokana.`,
  kpiRate: "Tahan'ny fahatratrarana ny tanjona", target: (c) => `Tanjona : ${c} %`,
  ofCommunes: (ok, total) => `${ok} amin'ny ${total} kaominina`,
  kpiRemaining: "Mbola atao", toConvince: (c) => `kaominina mbola tokony hatosika hahatratra ny ${c} %`,
  kpiWomen: "Anjaran'ny vehivavy tratra", kpiYouth: "Anjaran'ny tanora (< 35 taona) tratra", persons: "olona",
  kpiCommunes: "Kaominina iasana", displayed: "kaominina aseho",
  donut1: "Kaominina araka ny isan'ny fepetra raisina", donut2: "Kaominina araka ny fepetra ho an'ny vehivavy sy ny tanora", communesLc: "kaominina",
  m0: "Fepetra 0", m12: "Fepetra 1 ka hatramin'ny 2", m3: "Fepetra 3", m3p: "Fepetra mihoatra ny 3", m1: "Fepetra 1", m1p: "Fepetra mihoatra ny 1",
  trend: "Fivoaran'ny tahan'ny fahatratrarana isan-taona (%)", planned: "Làlana nokasaina", actual: "Vita",
  byRegion: "Tahan'ny fahatratrarana isam-paritra (% ny kaominina)", noData: "Tsy misy angona.", reached: "Tratra",
  regionTip: (pct, ok, total) => `${pct} % (kaominina ${ok}/${total})`,
  prio: "Kaominina tokony hotohanana voalohany", allReached: "Tratry ny kaominina rehetra aseho ny tanjona.",
  prioAria: "Lisitry ny kaominina hotohanana, azo hosintonina",
  missing: (need, inc) => `Mbola mila fepetra ${need}${inc ? ", ka 1 ho an'ny vehivavy sy ny tanora" : ""}`,
  prioHint: (n) => `Kaominina ${n} no hotohanana : sintony mba hahitana ny sisa`,
  tableTitle: "Antsipirihany ny fepetra noraisin'ny kaominina", searchMeasure: "Hitady fepetra…", search: "Hikaroka",
  audience: "Vondrona tanjona", allAudience: "Rehetra", womenYouth: "Vehivavy sy tanora", export: "Hamoaka",
  colId: "ID ny fepetra", colDate: "Daty nanaovana ny fepetra", colSpec: "Famaritana ny fepetra",
  noMeasures: "Tsy nahitana fepetra. Ovay ny sivana na ny fikarohana.",
  range: (a, b, n) => `${a} – ${b} amin'ny ${n} fepetra`,
  prev: "Pejy teo aloha", next: "Pejy manaraka", rowsPerPage: "Andalana isaky ny pejy",
  source: "Loharano :", loading: "Ampidirina ny angona…", demo: "Angona noforonina ho fanehoana",
  csv: ["ID", "Kaominina", "Faritra", "Daty nanaovana", "Fepetra", "Vehivavy/tanora"], yes: "Eny", no: "Tsia",
};

const en: Txt = {
  title: "Municipal measures monitoring", refresh: "Refresh", year: "Year",
  filters: { region: "Region", aire: "Protected area", paysage: "Landscape", district: "District", name: "Municipality" },
  all: { region: "All", aire: "All", paysage: "All", district: "All", name: "All" },
  keyPoint: "Key takeaway", searchCommune: "Search a municipality…",
  noMatch: "No municipality matches the selected filters.",
  summary: (ok, total, pct, year) => `${ok} of ${total} municipalities (${pct} %) had reached the target by the end of ${year}.`,
  remaining: (n, cible) => `${n} more are needed to reach ${cible} %.`,
  targetMet: (cible) => `The ${cible} % target has been reached.`,
  priorityRegion: (name, pct) => `Region to support first: ${name} (${pct} %).`,
  statementTitle: "Indicator statement",
  statement: (c) => `3 priority measures to improve provisioning ecosystem services are adopted by municipal councils in ${c} % of the intervention municipalities, based on existing management plans, including 1 measure addressing the specific needs of women and young people.`,
  kpiRate: "Target achievement rate", target: (c) => `Target: ${c} %`,
  ofCommunes: (ok, total) => `${ok} of ${total} municipalities`,
  kpiRemaining: "Remaining", toConvince: (c) => `municipalities still to convince to reach ${c} %`,
  kpiWomen: "Women's share reached", kpiYouth: "Youth share (< 35) reached", persons: "people",
  kpiCommunes: "Intervention municipalities", displayed: "municipalities shown",
  donut1: "Municipalities by number of measures adopted", donut2: "Municipalities by measures for women and youth", communesLc: "municipalities",
  m0: "0 measures", m12: "1 to 2 measures", m3: "3 measures", m3p: "More than 3 measures", m1: "1 measure", m1p: "More than 1 measure",
  trend: "Yearly trend of the achievement rate (%)", planned: "Planned trajectory", actual: "Actual",
  byRegion: "Achievement rate by region (% of municipalities)", noData: "No data.", reached: "Reached",
  regionTip: (pct, ok, total) => `${pct} % (${ok}/${total} municipalities)`,
  prio: "Municipalities to support first", allReached: "All municipalities shown have reached the target.",
  prioAria: "Municipalities to support, scrollable list",
  missing: (need, inc) => `Needs ${need} more measure${need > 1 ? "s" : ""}${inc ? ", including 1 for women and youth" : ""}`,
  prioHint: (n) => `${n} municipalities to support: scroll to see more`,
  tableTitle: "Measures adopted by municipalities", searchMeasure: "Search a measure…", search: "Search",
  audience: "Target group", allAudience: "All", womenYouth: "Women and youth", export: "Export",
  colId: "Measure ID", colDate: "Adoption date", colSpec: "Measure description",
  noMeasures: "No measure found. Change the filters or the search.",
  range: (a, b, n) => `${a} – ${b} of ${n} measures`,
  prev: "Previous page", next: "Next page", rowsPerPage: "Rows per page",
  source: "Source:", loading: "Loading data…", demo: "Demonstration data (fictional)",
  csv: ["ID", "Municipality", "Region", "Adoption date", "Measure", "Women/youth"], yes: "Yes", no: "No",
};

const de: Txt = {
  title: "Überwachung der Gemeindemaßnahmen", refresh: "Aktualisieren", year: "Jahr",
  filters: { region: "Region", aire: "Schutzgebiet", paysage: "Landschaft", district: "Distrikt", name: "Gemeinde" },
  all: { region: "Alle", aire: "Alle", paysage: "Alle", district: "Alle", name: "Alle" },
  keyPoint: "Das Wichtigste", searchCommune: "Gemeinde suchen…",
  noMatch: "Keine Gemeinde entspricht den gewählten Filtern.",
  summary: (ok, total, pct, year) => `${ok} von ${total} Gemeinden (${pct} %) hatten das Ziel Ende ${year} erreicht.`,
  remaining: (n, cible) => `Es fehlen noch ${n}, um ${cible} % zu erreichen.`,
  targetMet: (cible) => `Das Ziel von ${cible} % ist erreicht.`,
  priorityRegion: (name, pct) => `Vorrangig zu unterstützende Region: ${name} (${pct} %).`,
  statementTitle: "Indikatortext",
  statement: (c) => `Die Gemeinderäte beschließen in ${c} % der Interventionsgemeinden 3 vorrangige Maßnahmen zur Verbesserung der bereitstellenden Ökosystemleistungen auf Grundlage bestehender Bewirtschaftungspläne, darunter 1 Maßnahme, die den besonderen Bedürfnissen von Frauen und Jugendlichen Rechnung trägt.`,
  kpiRate: "Zielerreichungsgrad", target: (c) => `Ziel: ${c} %`,
  ofCommunes: (ok, total) => `${ok} von ${total} Gemeinden`,
  kpiRemaining: "Noch zu tun", toConvince: (c) => `Gemeinden, die noch überzeugt werden müssen, um ${c} % zu erreichen`,
  kpiWomen: "Erreichter Frauenanteil", kpiYouth: "Erreichter Jugendanteil (< 35)", persons: "Personen",
  kpiCommunes: "Interventionsgemeinden", displayed: "angezeigte Gemeinden",
  donut1: "Gemeinden nach Zahl der beschlossenen Maßnahmen", donut2: "Gemeinden nach Maßnahmen für Frauen und Jugendliche", communesLc: "Gemeinden",
  m0: "0 Maßnahmen", m12: "1 bis 2 Maßnahmen", m3: "3 Maßnahmen", m3p: "Mehr als 3 Maßnahmen", m1: "1 Maßnahme", m1p: "Mehr als 1 Maßnahme",
  trend: "Jährliche Entwicklung des Zielerreichungsgrads (%)", planned: "Geplanter Verlauf", actual: "Erreicht",
  byRegion: "Zielerreichung nach Region (% der Gemeinden)", noData: "Keine Daten.", reached: "Erreicht",
  regionTip: (pct, ok, total) => `${pct} % (${ok}/${total} Gemeinden)`,
  prio: "Vorrangig zu unterstützende Gemeinden", allReached: "Alle angezeigten Gemeinden haben das Ziel erreicht.",
  prioAria: "Zu unterstützende Gemeinden, scrollbare Liste",
  missing: (need, inc) => `Es fehlen ${need} Maßnahme${need > 1 ? "n" : ""}${inc ? ", davon 1 für Frauen und Jugendliche" : ""}`,
  prioHint: (n) => `${n} Gemeinden zu unterstützen: scrollen für mehr`,
  tableTitle: "Von den Gemeinden beschlossene Maßnahmen", searchMeasure: "Maßnahme suchen…", search: "Suchen",
  audience: "Zielgruppe", allAudience: "Alle", womenYouth: "Frauen und Jugendliche", export: "Exportieren",
  colId: "Maßnahmen-ID", colDate: "Beschlussdatum", colSpec: "Beschreibung der Maßnahme",
  noMeasures: "Keine Maßnahme gefunden. Filter oder Suche ändern.",
  range: (a, b, n) => `${a} – ${b} von ${n} Maßnahmen`,
  prev: "Vorherige Seite", next: "Nächste Seite", rowsPerPage: "Zeilen pro Seite",
  source: "Quelle:", loading: "Daten werden geladen…", demo: "Fiktive Demonstrationsdaten",
  csv: ["ID", "Gemeinde", "Region", "Beschlussdatum", "Maßnahme", "Frauen/Jugend"], yes: "Ja", no: "Nein",
};

const TXT: Record<string, Txt> = { fr, mg, en, de };
const DATE_LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };
const makeNf = (loc: string) => (n: number) => n.toLocaleString(loc, { maximumFractionDigits: 1 });


/* ============================ RÈGLES DE L'INDICATEUR ============================
   « 3 mesures prioritaires adoptées par les conseils communaux dans 80 % des communes,
   dont 1 mesure tenant compte des besoins des femmes et des jeunes. »
   → une commune a ATTEINT la cible si : ≥ 3 mesures ET ≥ 1 mesure femmes/jeunes.        */
const CIBLE = 80;          // % de communes visé
const MIN_MESURES = 3;
const CUR_YEAR = 2026;     // dernière année avec des données réelles
const GREEN = "#2e7d32", AMBER = "#d97706", RED = "#d32f2f", GREY = "#e5e7eb";

/* ================================== TYPES ================================== */
/* Texte venant des données : une simple chaîne (affichée telle quelle) ou un objet par langue */
type L10n = string | Partial<Record<string, string>>;
const l10n = (v: L10n, lang: string) => (typeof v === "string" ? v : v[lang] ?? v.fr ?? Object.values(v)[0] ?? "");

interface Mesure { id: string; date: string; spec: L10n; inc: boolean } // inc = femmes/jeunes
interface Commune {
  name: string; region: string; aire: string; paysage: string; district: string;
  p: number; f: number; j: number;   // participants, dont femmes, dont jeunes (< 35 ans)
  m: Mesure[];
}
const KEYS = ["region", "aire", "paysage", "district", "name"] as const;
type Key = (typeof KEYS)[number];

const TRAJ = [
  { annee: 2025, prevu: 20.8 }, { annee: 2026, prevu: 33.3 }, { annee: 2027, prevu: 45.8 },
  { annee: 2028, prevu: 58.3 }, { annee: 2029, prevu: 67.5 }, { annee: 2030, prevu: 80 },
];

/* ============ DONNÉES DE DÉMONSTRATION (fictives, 120 communes, cohérentes) ============
   Remplacées automatiquement si /data/communes.json existe (même structure que Commune[]). */
const GEO: Record<string, { paysage: string; aires: string[]; districts: string[] }> = {
  "Boeny": { paysage: "Paysage Nord", aires: ["Ankarafantsika"], districts: ["Mahajanga II", "Marovoay"] },
  "DIANA": { paysage: "Paysage Nord", aires: ["Analamerana", "Ankarana", "Montagne d'Ambre"], districts: ["Antsiranana II", "Ambilobe"] },
  "Amoron'i Mania": { paysage: "Paysage Centre", aires: ["Marolambo"], districts: ["Ambositra", "Fandriana"] },
  "Vakinankaratra": { paysage: "Paysage Centre", aires: ["Marolambo"], districts: ["Antsirabe II", "Betafo"] },
  "Anôsy": { paysage: "Paysage Sud", aires: ["Andohahela"], districts: ["Taolagnaro", "Amboasary Atsimo"] },
  "Atsimo Atsinanana": { paysage: "Paysage Sud", aires: ["Befotaka-Midongy"], districts: ["Farafangana", "Midongy Atsimo"] },
};
const REGS = Object.keys(GEO);
const SPECS: L10n[] = [
  { fr: "Mise en place de pépinières communales pour la production de plants forestiers et fruitiers.",
    en: "Setting up municipal nurseries to produce forest and fruit tree seedlings.",
    de: "Einrichtung kommunaler Baumschulen zur Erzeugung von Forst- und Obstpflanzen.",
    mg: "Fananganana toeram-pambolena zanakazo ao amin'ny kaominina ho an'ny hazo ala sy hazo fihinam-boa." },
  { fr: "Gestion durable des ressources en eau : protection des sources et reboisement des bassins versants.",
    en: "Sustainable water resource management: protecting springs and reforesting watersheds.",
    de: "Nachhaltige Wasserbewirtschaftung: Schutz von Quellen und Wiederaufforstung der Einzugsgebiete.",
    mg: "Fitantanana maharitra ny loharanon-drano : fiarovana ny loharano sy fambolena kazo any amin'ny faritra mamatsy rano." },
  { fr: "Promotion de l'agroforesterie et des systèmes agro-sylvopastoraux durables.",
    en: "Promoting agroforestry and sustainable agro-silvopastoral systems.",
    de: "Förderung von Agroforstwirtschaft und nachhaltigen agrosilvopastoralen Systemen.",
    mg: "Fanentanana ny fambolena mitambatra amin'ny hazo sy ny rafitra fambolena-fiompiana-ala maharitra." },
  { fr: "Réglementation et contrôle des prélèvements de bois énergie dans les forêts naturelles.",
    en: "Regulating and monitoring fuelwood harvesting in natural forests.",
    de: "Regelung und Kontrolle der Brennholzentnahme in Naturwäldern.",
    mg: "Fametrahana lalàna sy fanaraha-maso ny fanapahana kitay ao anaty ala voajanahary." },
  { fr: "Sensibilisation communautaire et formation sur les pratiques agricoles durables.",
    en: "Community awareness and training on sustainable farming practices.",
    de: "Sensibilisierung der Gemeinschaft und Schulung zu nachhaltigen landwirtschaftlichen Praktiken.",
    mg: "Fanentanana ny vahoaka sy fampiofanana momba ny fomba fambolena maharitra." },
  { fr: "Aménagement de pare-feux et surveillance participative des forêts.",
    en: "Building firebreaks and participatory forest monitoring.",
    de: "Anlage von Brandschneisen und partizipative Waldüberwachung.",
    mg: "Fananganana tantsambo fanakanana afo sy fanaraha-maso ny ala miaraka amin'ny vahoaka." },
];
const SPECS_INC: L10n[] = [
  { fr: "Appui aux femmes et aux jeunes pour la transformation et la valorisation des produits forestiers non ligneux.",
    en: "Support for women and young people in processing and adding value to non-timber forest products.",
    de: "Unterstützung von Frauen und Jugendlichen bei der Verarbeitung und Veredelung von Nichtholz-Waldprodukten.",
    mg: "Fanohanana ny vehivavy sy ny tanora amin'ny fanodinana sy fampiakarana ny sandan'ny vokatra avy amin'ny ala tsy kitay." },
  { fr: "Formation des jeunes aux métiers de la restauration forestière.",
    en: "Training young people in forest restoration trades.",
    de: "Ausbildung von Jugendlichen in Berufen der Waldrestaurierung.",
    mg: "Fampiofanana ny tanora amin'ny asa fanarenana ny ala." },
  { fr: "Accès des femmes aux pépinières communales et aux filières de produits forestiers.",
    en: "Women's access to municipal nurseries and forest product value chains.",
    de: "Zugang von Frauen zu kommunalen Baumschulen und Wertschöpfungsketten für Waldprodukte.",
    mg: "Fidirana an'ny vehivavy amin'ny toeram-pambolena zanakazo ao amin'ny kaominina sy ny tamba-jotra vokatra avy amin'ny ala." },
];

function demoData(): Commune[] {
  const top = ["Ambohimahavelona", "Ambinanindrano", "Marovato", "Ankazomioritra", "Bekopaka", "Andranovory", "Ambatolahy", "Soamahamanina", "Manandriana", "Antsahavola"];
  const low = ["Manjakandriana", "Sahafinaritra", "Morarano Chrome", "Belomaka", "Anjoma", "Ankarenana", "Morarano Gara", "Bekoratsaka", "Ampamarinana", "Andranomiditra"];
  const A = ["Amba", "Anki", "Ando", "Mana", "Soa", "Beko", "Mora", "Anta", "Fana", "Tsiro"];
  const B = ["tola", "hima", "vato", "ranga", "zomi", "fari", "lava", "hasoa"];
  const C = ["na", "ny", "tra", "ka", "ndrano", "vola", "soa"];
  const mid = Array.from({ length: 100 }, (_, i) => A[i % 10] + B[(i * 3) % 8] + C[(i * 5 + 1) % 7]);
  const seq: Record<number, number> = {};
  const pad = (n: number) => String(n).padStart(2, "0");
  return [...top, ...mid, ...low].map((name, i) => {
    const region = REGS[i < 81 ? i % 6 : [3, 4, 4, 5, 5, 5, 2, 1][(i - 81) % 8]];
    const g = GEO[region];
    // 55 communes à 3 mesures, 26 à 4–5 (= 81 atteintes), 6 à 3 mesures sans femmes/jeunes, 21 à 1–2, 12 à 0
    const n = i < 55 ? 3 : i < 81 ? 4 + (i % 2) : i < 87 ? 3 : i < 108 ? 1 + (i % 2) : 0;
    const m: Mesure[] = Array.from({ length: n }, (_, k) => {
      const inc = i < 81 ? k === 0 || (k === 3 && i % 2 === 0) : i < 87 ? false : i < 108 ? k === 0 && i % 3 !== 0 : false;
      const off = (i * 5 + k * 7) % 20, y = 2025 + Math.floor((2 + off) / 12);
      seq[y] = (seq[y] ?? 0) + 1;
      return {
        id: `MES-${y}-${String(seq[y]).padStart(3, "0")}`, inc,
        date: `${y}-${pad(((2 + off) % 12) + 1)}-${pad(1 + ((i * 3 + k * 5) % 28))}`,
        spec: inc ? SPECS_INC[(i + k) % 3] : SPECS[(i + k) % 6],
      };
    });
    const p = 30 + ((i * 13) % 21);
    return {
      name, region, aire: g.aires[i % g.aires.length], paysage: g.paysage, district: g.districts[(i >> 1) % 2],
      p, f: Math.round(p * (0.43 + ((i * 7) % 11) / 100)), j: Math.round(p * (0.31 + ((i * 5) % 13) / 100)), m,
    };
  });
}
const DEMO = demoData();

/* ===================== CHARGEMENT / MISE À JOUR DES DONNÉES ===================== */
const DATA_URL = "/data/communes.json"; // fichier ou API ; absent → données de démonstration

function useCommunes() {
  const [data, setData] = useState<Commune[]>(DEMO);
  const [state, setState] = useState<"loading" | "ok" | "demo">("loading");
  const load = useCallback(() => {
    const ctrl = new AbortController();
    setState("loading");
    fetch(DATA_URL, { signal: ctrl.signal, cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: Commune[]) => { setData(d); setState("ok"); })
      .catch(() => { if (!ctrl.signal.aborted) { setData(DEMO); setState("demo"); } });
    return () => ctrl.abort();
  }, []);
  useEffect(() => load(), [load]);
  return { data, state, reload: load };
}

/* ================================= HELPERS ================================== */
const fdate = (d: string, loc: string) => new Date(d + "T00:00:00").toLocaleDateString(loc);
const matches = (c: Commune, sel: Record<Key, string>, upto: number) =>
  KEYS.slice(0, upto).every((k) => sel[k] === "all" || c[k] === sel[k]);
const rateColor = (v: number) => (v >= CIBLE ? GREEN : v >= 50 ? AMBER : RED);

/* Situation d'une commune à la fin d'une année donnée */
const evalC = (c: Commune, year: number) => {
  const ms = c.m.filter((m) => +m.date.slice(0, 4) <= year);
  const n = ms.length, inc = ms.filter((m) => m.inc).length;
  return {
    c, ms, n, inc, ok: n >= MIN_MESURES && inc >= 1,
    taux: Math.round(((Math.min(n, MIN_MESURES) + Math.min(inc, 1)) / (MIN_MESURES + 1)) * 100),
  };
};
type Ev = ReturnType<typeof evalC>;
const needOf = (e: Ev) => Math.max(MIN_MESURES - e.n, e.inc < 1 ? 1 : 0);

function exportCsv(rows: { id: string; commune: string; region: string; date: string; spec: string; inc: boolean }[], tx: Pick<Txt, "csv" | "yes" | "no">) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = tx.csv.map(esc).join(";");
  const body = rows.map((r) => [r.id, r.commune, r.region, r.date, r.spec, r.inc ? tx.yes : tx.no].map(esc).join(";"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + [head, ...body].join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = `mesures-communales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================== SOUS-COMPOSANTS ============================== */
const Card = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={`mc-card ${className}`}>{title && <h3 className="mc-card-title">{title}</h3>}{children}</section>
);

const Ring = memo(({ pct, color = GREEN, sub, nf }: { pct: number; color?: string; sub?: string; nf: (n: number) => string }) => (
  <div className="mc-ring" role="img" aria-label={`${nf(pct)} %`}
    style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, ${GREY} 0)` }}>
    <div><strong style={{ color }}>{nf(pct)} %</strong>{sub && <small>{sub}</small>}</div>
  </div>
));

interface Slice { name: string; value: number; color: string }
const DonutCard = memo(({ title, data, total, nf, unit }: { title: string; data: Slice[]; total: number; nf: (n: number) => string; unit: string }) => (
  <Card title={title}>
    <div className="mc-donut">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="92%" stroke="#fff" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${v} ${unit}`} contentStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mc-donut-c"><strong>{total}</strong><small>{unit}</small></div>
    </div>
    <ul className="mc-leg">
      {data.map((d) => (
        <li key={d.name}><i style={{ background: d.color }} /><span>{d.name}</span><b>{d.value}</b>
          <small>{total ? nf((d.value / total) * 100) : 0} %</small></li>
      ))}
    </ul>
  </Card>
));

/* ==================================== PAGE ==================================== */
type SK = "date" | "commune" | "id";

export default function MesuresCommunales() {
  const { lang } = useLanguage();               // adapte si ton hook expose "language"
  const t = TXT[lang] ?? fr;
  const loc = DATE_LOCALES[lang] ?? "fr-FR";
  const nf = useMemo(() => makeNf(loc), [loc]);
  const { data, state, reload } = useCommunes();
  const [year, setYear] = useState(CUR_YEAR);
  const [sel, setSel] = useState<Record<Key, string>>({ region: "all", aire: "all", paysage: "all", district: "all", name: "all" });
  const [search, setSearch] = useState("");            // recherche dans le tableau (mesures)
  const [cq, setCq] = useState("");                      // recherche de commune (toute la page)
  const [pub, setPub] = useState<"all" | "inc">("all");   // public visé : Tous / Femmes et jeunes
  const [sort, setSort] = useState<{ k: SK; dir: 1 | -1 }>({ k: "date", dir: -1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* Filtres en cascade : changer la région réinitialise les filtres plus fins */
  const pick = (k: Key, v: string) => {
    setSel((s) => {
      const next = { ...s, [k]: v };
      KEYS.slice(KEYS.indexOf(k) + 1).forEach((x) => { next[x] = "all"; });
      return next;
    });
    setPage(1);
  };
  const opts = useMemo(() => Object.fromEntries(KEYS.map((k, i) =>
    [k, [...new Set(data.filter((c) => matches(c, sel, i)).map((c) => c[k]))].sort((a, b) => a.localeCompare(b, "fr"))])) as Record<Key, string[]>,
  [data, sel]);

  const view = useMemo(() => {
    const s = cq.trim().toLowerCase();
    return data.filter((c) => matches(c, sel, KEYS.length) && (!s || c.name.toLowerCase().includes(s)));
  }, [data, sel, cq]);
  const ev = useMemo(() => view.map((c) => evalC(c, year)), [view, year]);

  const S = useMemo(() => {
    const total = ev.length, ok = ev.filter((e) => e.ok).length;
    const cnt = (fn: (e: Ev) => boolean) => ev.filter(fn).length;
    const sum = (k: "p" | "f" | "j") => view.reduce((s, c) => s + c[k], 0);
    const pct = total ? (ok / total) * 100 : 0;
    const byRegion = REGS.map((name) => {
      const l = ev.filter((e) => e.c.region === name), o = l.filter((e) => e.ok).length;
      return { name, total: l.length, ok: o, pct: l.length ? Math.round((o / l.length) * 1000) / 10 : 0 };
    }).filter((r) => r.total > 0).sort((a, b) => b.pct - a.pct);
    const traj = TRAJ.map((t) => {
      const o = t.annee <= CUR_YEAR && total ? view.filter((c) => evalC(c, t.annee).ok).length : null;
      return { ...t, realise: o === null ? undefined : Math.round((o / total) * 1000) / 10 };
    });
    return {
      total, ok, pct, byRegion, traj,
      restant: Math.max(0, Math.ceil((total * CIBLE) / 100) - ok),
      d1: [
        { name: t.m0, value: cnt((e) => e.n === 0), color: RED },
        { name: t.m12, value: cnt((e) => e.n > 0 && e.n < 3), color: "#fbc02d" },
        { name: t.m3, value: cnt((e) => e.n === 3), color: "#9ccc65" },
        { name: t.m3p, value: cnt((e) => e.n > 3), color: GREEN },
      ],
      d2: [
        { name: t.m0, value: cnt((e) => e.inc === 0), color: RED },
        { name: t.m1, value: cnt((e) => e.inc === 1), color: "#fbc02d" },
        { name: t.m1p, value: cnt((e) => e.inc > 1), color: GREEN },
      ],
      femmes: sum("p") ? (sum("f") / sum("p")) * 100 : 0, nF: sum("f"),
      jeunes: sum("p") ? (sum("j") / sum("p")) * 100 : 0, nJ: sum("j"),
      prio: ev.filter((e) => !e.ok).sort((a, b) => a.taux - b.taux || a.n - b.n),
    };
  }, [ev, view, t]);

  const worst = S.byRegion.length > 1 ? S.byRegion[S.byRegion.length - 1] : null;

  const flat = useMemo(() => ev.flatMap((e) => e.ms.map((m) => ({ ...m, spec: l10n(m.spec, lang), commune: e.c.name, region: e.c.region }))), [ev, lang]);
  const rowsAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = pub === "inc" ? flat.filter((x) => x.inc) : flat;
    const r = q ? base.filter((x) => `${x.commune} ${x.spec} ${x.id}`.toLowerCase().includes(q)) : base;
    return [...r].sort((a, b) => (a[sort.k] < b[sort.k] ? -1 : a[sort.k] > b[sort.k] ? 1 : 0) * sort.dir);
  }, [flat, search, sort, pub]);
  const nInc = useMemo(() => flat.filter((x) => x.inc).length, [flat]);
  const pages = Math.max(1, Math.ceil(rowsAll.length / pageSize));
  const cur = Math.min(page, pages);
  const rows = rowsAll.slice((cur - 1) * pageSize, cur * pageSize);

  const SortTh = ({ k, children }: { k: SK; children: React.ReactNode }) => (
    <th aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="mc-th" onClick={() => setSort((s) => (s.k === k ? { k, dir: (s.dir * -1) as 1 | -1 } : { k, dir: 1 }))}>
        {children}<ArrowUpDown size={12} aria-hidden />
      </button>
    </th>
  );

  const message = S.total === 0 ? t.noMatch : [
    t.summary(S.ok, S.total, nf(S.pct), year),
    S.restant > 0 ? t.remaining(S.restant, CIBLE) : t.targetMet(CIBLE),
    worst && worst.pct < CIBLE ? t.priorityRegion(worst.name, nf(worst.pct)) : "",
  ].filter(Boolean).join(" ");

  return (
    <main className="mc">
      <style>{CSS}</style>

      <header className="mc-head">
        <div className="mc-brand">
          <span className="mc-logo"><Landmark size={24} aria-hidden /></span>
          <h1>{t.title}</h1>
        </div>
        <button className="mc-btn-light" onClick={reload} disabled={state === "loading"}>
          <RefreshCw size={16} className={state === "loading" ? "mc-spin" : ""} aria-hidden /> {t.refresh}
        </button>
      </header>

      <div className="mc-body">
        {/* ----- Filtres ----- */}
        <div className="mc-filters" role="search">
          <label><span>{t.year}</span>
            <select value={year} onChange={(e) => { setYear(+e.target.value); setPage(1); }}>
              {TRAJ.map((t) => <option key={t.annee}>{t.annee}</option>)}
            </select></label>
          {KEYS.map((k) => (
            <label key={k}><span>{t.filters[k]}</span>
              <select value={sel[k]} onChange={(e) => pick(k, e.target.value)}>
                <option value="all">{t.all[k]}</option>
                {opts[k].map((o) => <option key={o}>{o}</option>)}
              </select></label>
          ))}
        </div>

        {/* ----- Message clé pour décider ----- */}
        <div className="mc-insight">
          <b>{t.keyPoint}</b>
          <span className="mc-insight-t" role="status">{message}</span>
          <label className="mc-search mc-insight-s"><Search size={14} aria-hidden />
            <input placeholder={t.searchCommune} value={cq} aria-label={t.searchCommune}
              onChange={(e) => { setCq(e.target.value); setPage(1); }} /></label>
        </div>
        <details className="mc-enonce">
          <summary>{t.statementTitle}</summary>
          <p>{t.statement(CIBLE)}</p>
        </details>

        {/* ----- KPI ----- */}
        <div className="mc-kpis">
          <Card title={t.kpiRate}>
            <Ring pct={S.pct} sub={t.target(CIBLE)} nf={nf} />
            <p className="mc-cap"><b>{t.ofCommunes(S.ok, S.total)}</b></p>
          </Card>
          <Card title={t.kpiRemaining}>
            <div className="mc-big" style={{ color: S.restant ? RED : GREEN }}>{S.restant}</div>
            <p className="mc-cap">{t.toConvince(CIBLE)}</p>
          </Card>
          <Card title={t.kpiWomen}>
            <Ring pct={S.femmes} sub={`${nf(S.nF)} ${t.persons}`} nf={nf} />
          </Card>
          <Card title={t.kpiYouth}>
            <Ring pct={S.jeunes} sub={`${nf(S.nJ)} ${t.persons}`} nf={nf} />
          </Card>
          <Card title={t.kpiCommunes}>
            <Users size={34} color={GREEN} aria-hidden style={{ margin: "0 auto" }} />
            <div className="mc-big">{S.total}</div>
            <p className="mc-cap">{t.displayed}</p>
          </Card>
        </div>

        {/* ----- Graphiques : 3 colonnes alignées ----- */}
        <div className="mc-row3">
          <DonutCard title={t.donut1} data={S.d1} total={S.total} nf={nf} unit={t.communesLc} />
          <DonutCard title={t.donut2} data={S.d2} total={S.total} nf={nf} unit={t.communesLc} />
          <Card title={t.trend} className="mc-wide">
            <ResponsiveContainer width="100%" height={270}>
              <LineChart data={S.traj} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GREY} />
                <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${nf(v)} %`} contentStyle={{ fontSize: 12 }} />
                <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={CIBLE} stroke={RED} strokeDasharray="4 4" label={{ value: t.target(CIBLE), fontSize: 11, fill: RED, position: "insideTopLeft" }} />
                <Line dataKey="prevu" name={t.planned} stroke="#9ca3af" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line dataKey="realise" name={t.actual} stroke={GREEN} strokeWidth={3} dot={{ r: 5, fill: GREEN, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ----- Où agir ----- */}
        <div className="mc-row2">
          <Card title={t.byRegion}>
            {S.byRegion.length === 0 ? <p className="mc-empty">{t.noData}</p> : (
              <ResponsiveContainer width="100%" height={S.byRegion.length * 44 + 36}>
                <BarChart data={S.byRegion} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GREY} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11 }} interval={0} />
                  <Tooltip formatter={(v: number, _n, p) => [t.regionTip(nf(v), p.payload.ok, p.payload.total), t.reached]} contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={CIBLE} stroke={RED} strokeDasharray="4 4" />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {S.byRegion.map((r) => <Cell key={r.name} fill={rateColor(r.pct)} />)}
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${nf(v)}%`} style={{ fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title={t.prio}>
            {S.prio.length === 0 ? <p className="mc-empty">{t.allReached}</p> : (
              <>
              <ol className="mc-prio" tabIndex={0} aria-label={t.prioAria}>
                {S.prio.map((e) => (
                  <li key={e.c.name}>
                    <div><b>{e.c.name}</b><small>{e.c.region}, {e.c.district}</small></div>
                    <span>{t.missing(needOf(e), e.inc < 1)}</span>
                    <div className="mc-bar" title={`${e.taux} %`}><i style={{ width: `${e.taux}%`, background: rateColor(e.taux + 30) }} /></div>
                  </li>
                ))}
              </ol>
              {S.prio.length > 5 && <p className="mc-hint">{t.prioHint(S.prio.length)}</p>}
              </>
            )}
          </Card>
        </div>

        {/* ----- Tableau (seul en bas) ----- */}
        <Card>
          <div className="mc-tools">
            <h3 className="mc-card-title mc-left">{t.tableTitle}</h3>
            <div className="mc-tools-r">
              <label className="mc-search"><Search size={14} aria-hidden />
                <input placeholder={t.searchMeasure} value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label={t.search} /></label>
              <div className="mc-seg" role="group" aria-label={t.audience}>
                {([["all", t.allAudience, flat.length], ["inc", t.womenYouth, nInc]] as const).map(([v, l, n]) => (
                  <button key={v} className={pub === v ? "on" : ""} aria-pressed={pub === v}
                    onClick={() => { setPub(v); setPage(1); }}>{l} <small>{n}</small></button>
                ))}
              </div>
              <button className="mc-btn" onClick={() => exportCsv(rowsAll, t)}><Download size={14} aria-hidden /> {t.export}</button>
            </div>
          </div>

          <div className="mc-scroll">
            <table className="mc-table">
              <thead>
                <tr>
                  <SortTh k="commune">{t.filters.name}</SortTh>
                  <SortTh k="id">{t.colId}</SortTh>
                  <SortTh k="date">{t.colDate}</SortTh>
                  <th>{t.colSpec}</th>
                  <th>{t.audience}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t.filters.name}><b>{r.commune}</b><small>{r.region}</small></td>
                    <td data-label={t.colId}>{r.id}</td>
                    <td data-label={t.colDate}>{fdate(r.date, loc)}</td>
                    <td data-label={t.colSpec} className="mc-spec">{r.spec}</td>
                    <td data-label={t.audience}>{r.inc ? <span className="mc-tag">{t.womenYouth}</span> : t.allAudience}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="mc-empty">{t.noMeasures}</td></tr>}
              </tbody>
            </table>
          </div>

          <footer className="mc-pager">
            <span>{t.range(rowsAll.length ? (cur - 1) * pageSize + 1 : 0, Math.min(cur * pageSize, rowsAll.length), rowsAll.length)}</span>
            <div>
              <button aria-label={t.prev} disabled={cur <= 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={16} /></button>
              <b>{cur} / {pages}</b>
              <button aria-label={t.next} disabled={cur >= pages} onClick={() => setPage(cur + 1)}><ChevronRight size={16} /></button>
            </div>
            <label>{t.rowsPerPage}
              <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }}>
                {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
              </select></label>
          </footer>
        </Card>

        <p className="mc-note">
          {state === "ok" ? `${t.source} ${DATA_URL}` : state === "loading" ? t.loading : t.demo}
        </p>
      </div>
    </main>
  );
}

/* ================================== STYLES ================================== */
const CSS = `
.mc{--g:#2e7d32;--gd:#1b5e20;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;background:#f4f6f5;min-height:100%;color:var(--ink);
  font-family:Inter,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.mc *,.mc *::before,.mc *::after{box-sizing:border-box}
.mc-head{background:var(--g);color:#fff;padding:12px clamp(12px,2vw,24px);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.mc-brand{display:flex;align-items:center;gap:12px}
.mc-logo{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35)}
.mc h1{margin:0;font-size:clamp(17px,2.6vw,22px)}
.mc-btn-light,.mc-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
.mc-btn-light{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)}
.mc-btn{background:var(--g);color:#fff;border:1px solid var(--g)}
.mc button:disabled{opacity:.5;cursor:not-allowed}
.mc-spin{animation:mcspin 1s linear infinite}@keyframes mcspin{to{transform:rotate(360deg)}}
.mc-body{padding:clamp(10px,2vw,24px);display:flex;flex-direction:column;gap:16px}
.mc-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.mc-filters label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#374151;min-width:0}
.mc select,.mc input{padding:9px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;min-width:0;width:100%}
.mc button:focus-visible,.mc select:focus-visible,.mc input:focus-visible,.mc summary:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.mc-insight{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#fff;border-left:5px solid var(--g);border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.mc-insight b{color:var(--gd)}
.mc-insight-t{flex:1 1 320px}
.mc-insight-s{margin-left:auto;flex:0 1 260px;max-width:none}
.mc-enonce{background:rgba(46,125,50,.06);border-radius:8px;padding:10px 14px;font-size:13px;color:#374151}
.mc-enonce summary{cursor:pointer;font-weight:700;color:var(--gd)}
.mc-enonce p{margin:8px 0 0;line-height:1.6}
.mc-card{background:#fff;border-radius:10px;padding:14px;min-width:0;box-shadow:0 1px 3px rgba(0,0,0,.07);display:flex;flex-direction:column;gap:8px}
.mc-card-title{margin:0;font-size:14px;font-weight:700;color:var(--gd);text-align:center}
.mc-left{text-align:left}
.mc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.mc-kpis .mc-card{align-items:center;justify-content:space-between}
.mc-ring{width:128px;height:128px;border-radius:50%;display:grid;place-items:center}
.mc-ring>div{width:96px;height:96px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}
.mc-ring strong{font-size:21px}.mc-ring small{font-size:11px;color:var(--muted)}
.mc-big{font-size:42px;font-weight:800;line-height:1}
.mc-cap{margin:0;font-size:13px;text-align:center;color:#374151}
.mc-row3,.mc-row2{display:grid;grid-template-columns:1fr;gap:16px}
.mc-donut{position:relative}
.mc-donut-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.mc-donut-c strong{font-size:26px}.mc-donut-c small{font-size:12px;color:var(--muted)}
.mc-leg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:12px}
.mc-leg li{display:grid;grid-template-columns:12px 1fr auto 52px;gap:8px;align-items:center}
.mc-leg i{width:12px;height:12px;border-radius:3px}.mc-leg small{text-align:right;color:var(--muted)}
.mc-prio{list-style:none;margin:0;padding:0 8px 0 0;display:flex;flex-direction:column;gap:10px;max-height:372px;overflow-y:auto;scrollbar-width:thin}
.mc-hint{margin:0;text-align:center;font-size:11px;color:var(--muted)}
.mc-prio li{display:grid;grid-template-columns:1fr;gap:4px;padding-bottom:8px;border-bottom:1px solid var(--line);font-size:13px}
.mc-prio li>div:first-child{display:flex;flex-direction:column}
.mc-prio small,.mc-table small{color:var(--muted);font-size:11px;display:block}
.mc-prio span{color:#b91c1c;font-size:12px}
.mc-bar{height:6px;background:var(--line);border-radius:4px;overflow:hidden}.mc-bar i{display:block;height:100%}
.mc-tools{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}
.mc-tools-r{display:flex;flex-wrap:wrap;gap:8px;align-items:center;flex:1 1 280px;justify-content:flex-end}
.mc-search{position:relative;flex:1 1 220px;max-width:320px}
.mc-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#888}
.mc-search input{padding-left:30px}
.mc-scroll{overflow-x:auto}
.mc-table{width:100%;border-collapse:collapse;font-size:13px}
.mc-table th{background:var(--g);color:#fff;text-align:left;padding:10px 12px;white-space:nowrap}
.mc-th{all:unset;cursor:pointer;display:inline-flex;gap:6px;align-items:center}.mc-th:focus-visible{outline:2px solid #fff}
.mc-table td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
.mc-table tbody tr:nth-child(even){background:#f9fafb}
.mc-spec{min-width:280px;line-height:1.45}
.mc-tag{background:#dcfce7;color:#166534;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
.mc-empty{text-align:center;color:var(--muted);font-size:13px;padding:14px}
.mc-pager{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px;font-size:12px}
.mc-pager div,.mc-pager label{display:flex;align-items:center;gap:8px}
.mc-pager select{width:auto;padding:5px 8px}
.mc-pager button{padding:4px 8px;border:1px solid #d1d5db;background:#fff;border-radius:6px;cursor:pointer;display:flex}
.mc-seg{display:inline-flex;border:1px solid var(--g);border-radius:8px;overflow:hidden}
.mc-seg button{display:flex;gap:6px;align-items:center;padding:8px 12px;border:0;background:#fff;color:var(--gd);font-size:13px;font-weight:600;cursor:pointer}
.mc-seg button.on{background:var(--g);color:#fff}
.mc-seg small{font-size:11px;opacity:.85}
.mc-note{text-align:center;color:var(--muted);font-size:12px;margin:0}
@media(min-width:720px){.mc-row3{grid-template-columns:1fr 1fr}.mc-wide{grid-column:1/-1}.mc-row2{grid-template-columns:1fr 1fr}}
@media(min-width:1180px){.mc-row3{grid-template-columns:1fr 1fr 1.25fr}.mc-wide{grid-column:auto}.mc-row2{grid-template-columns:1fr 1.2fr}}
@media(max-width:760px){
  .mc-table thead{display:none}
  .mc-table tr{display:block;border:1px solid var(--line);border-radius:10px;margin-bottom:10px;padding:6px 12px;background:#fff!important}
  .mc-table td{display:flex;justify-content:space-between;gap:14px;border:0;padding:6px 0;text-align:right}
  .mc-table td::before{content:attr(data-label);font-weight:600;color:var(--muted);text-align:left;flex-shrink:0}
  .mc-spec{min-width:0}.mc-table td[colspan]{display:block}.mc-table td[colspan]::before{content:none}
  .mc-tools-r,.mc-search,.mc-insight-s{max-width:none;flex-basis:100%}
  .mc-seg{flex:1 1 100%}.mc-seg button{flex:1;justify-content:center}
}
@media(prefers-reduced-motion:reduce){.mc *{animation:none!important;transition:none!important}}
`;
