import type { Lang } from './suivi';

/* Intitulés des activités (valeurs du GeoJSON) → [fr, mg, en, de] */
export const V2: Record<string, string[]> = {
  'Techniques de compostage': ['Techniques de compostage', 'Teknika fanaovana zezika organika', 'Composting techniques', 'Kompostierungstechniken'],
  'Gestion intégrée des cultures': ['Gestion intégrée des cultures', 'Fitantanana mitambatra ny voly', 'Integrated crop management', 'Integrierter Pflanzenbau'],
  'Agroforesterie': ['Agroforesterie', 'Fambolena mitambatra amin’ny hazo', 'Agroforestry', 'Agroforstwirtschaft'],
  'Transformation des produits agricoles': ['Transformation des produits agricoles', 'Fanodinana ny vokatra fambolena', 'Processing of agricultural products', 'Verarbeitung landwirtschaftlicher Produkte'],
  'Gestion financière / tenue de caisse': ['Gestion financière / tenue de caisse', 'Fitantanam-bola / bokin’ny kaonty', 'Financial management / cash book', 'Finanzmanagement / Kassenführung'],
  'Commercialisation et marketing': ['Commercialisation et marketing', 'Varotra sy marketing', 'Marketing and sales', 'Vermarktung und Marketing'],
  'Élevage amélioré': ['Élevage amélioré', 'Fiompiana nohatsaraina', 'Improved livestock farming', 'Verbesserte Tierhaltung'],
  'Gestion durable des ressources naturelles': ['Gestion durable des ressources naturelles', 'Fitantanana maharitra ny harena voajanahary', 'Sustainable natural resource management', 'Nachhaltiges Management natürlicher Ressourcen'],
  'Utilisation d’intrants biologiques': ['Utilisation d’intrants biologiques', 'Fampiasana akora organika', 'Use of organic inputs', 'Einsatz biologischer Betriebsmittel'],
  'Planification de la production': ['Planification de la production', 'Fandrafetana ny famokarana', 'Production planning', 'Produktionsplanung'],
};

const fr = {
  title: 'Suivi des petits exploitants', refresh: 'Actualiser', print: 'Imprimer', reset: 'Réinitialiser les filtres',
  loading: 'Chargement des activités…', all: 'Tous',
  err: (s: string) => `Chargement impossible. Vérifiez que ${s} est accessible, puis actualisez.`,
  f: { annee: 'Année', region: 'Région', aire_protegee: 'Aire protégée', paysage: 'Paysage', district: 'District', commune: 'Commune', fokontany: 'Fokontany', mbv: 'Micro-bassin versant', categorie: 'Catégorie', statut: 'Statut' },
  s1: (n: string) => `1. Atteinte de l’objectif : ${n} petits exploitants agricoles (Bénéficiaires C2, C3 et C4)`,
  s2: '2. Inclusion : femmes et jeunes (< 35 ans)',
  s3: '3. Confirmation de l’amélioration des compétences techniques et entrepreneuriales',
  s4: '4. Données détaillées',
  k: { total: 'Total petits exploitants', on: (n: string) => `sur ${n}`, taux: 'Taux d’atteinte', ecart: 'Écart à la trajectoire', expected: (y: number, n: string) => `attendu fin ${y} : ${n}`, declare: 'Déclaré par le prestataire', valPct: (p: string, n: string) => `${p} % validé · ${n} activités`, femmes: 'Part des femmes', jeunes: 'Part des jeunes (< 35 ans)', persons: (n: string) => `${n} personnes` },
  c: { cat: 'Répartition par catégorie', evol: 'Évolution annuelle cumulée des bénéficiaires', region: 'Bénéficiaires par région', map: 'Localisation des activités', incl: 'Femmes et jeunes par catégorie (%)', inclYear: 'Femmes et jeunes par année (%)', qual: 'Contrôle qualité des données' },
  cat: { cols: ['Catégorie', 'Activités', 'Bénéficiaires', '% du total', '% Femmes', '% Jeunes'], total: 'Total' },
  ev: { declare: 'Déclaré', valide: 'Validé', cible: (n: string) => `Trajectoire cible (${n})` },
  conf: { enq: 'Personnes enquêtées', ok: 'Amélioration confirmée', rate: 'Taux de confirmation', target: (n: string) => `Cible : ${n} %`, cov: 'Couverture de l’enquête', margin: (n: string) => `IC 95 % : ± ${n} pts`, byCat: 'Taux de confirmation par catégorie (%)', skills: 'Compétences confirmées (Top 10, % des confirmations)', ms: 'Jalons de collecte', base: 'Suivi', mid: 'Mi-parcours', final: 'Finale', done: 'Réalisé', soon: 'À venir', met: 'Cible atteinte', notMet: 'Cible non atteinte', none: 'Aucune enquête pour ces filtres.' },
  about: { title: 'À propos de l’indicateur', p1: 'Indicateur 2 : 80 % des bénéficiaires confirment, exemples à l’appui, avoir amélioré leurs compétences techniques et entrepreneuriales pour mettre en œuvre des pratiques durables et valoriser les produits de l’agriculture, de la sylviculture et de l’élevage.', p2: 'La confirmation repose sur des enquêtes auprès d’un échantillon représentatif de bénéficiaires.', C2: 'Formations collectives', C3: 'Appui individuel / groupements', C4: 'Appui aux entrepreneurs' },
  table: { title: (n: string) => `Activités et bénéficiaires (${n})`, search: 'Rechercher…', export: 'Exporter CSV', cols: ['ID activité', 'Catégorie', 'Région', 'Aire protégée', 'District', 'Commune', 'Fokontany', 'Intitulé', 'Participants', 'Femmes', 'Jeunes < 35 ans', 'Date', 'Statut'], none: 'Aucune activité pour ces filtres.', showing: (a: string, b: string, n: string) => `Affichage de ${a} à ${b} sur ${n}`, empty: '0 enregistrement', rows: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page' },
};
export type Txt = typeof fr;

const mg: Txt = {
  title: 'Fanaraha-maso ny mpamboly madinika', refresh: 'Havaozina', print: 'Hanonta', reset: 'Averina ny sivana',
  loading: 'Mampiditra ny hetsika…', all: 'Rehetra',
  err: (s) => `Tsy afaka naka ny angona. Jereo raha azo vakiana ny ${s}, avy eo havaozy.`,
  f: { annee: 'Taona', region: 'Faritra', aire_protegee: 'Faritra arovana', paysage: 'Tontolo', district: 'Distrika', commune: 'Kaominina', fokontany: 'Fokontany', mbv: 'Tambatra-drano kely', categorie: 'Sokajy', statut: 'Sata' },
  s1: (n) => `1. Fahatratrarana ny tanjona : mpamboly madinika ${n} (Mpahazo tombontsoa C2, C3 ary C4)`,
  s2: '2. Fampidirana : vehivavy sy tanora (< 35 taona)',
  s3: '3. Fanamarinana ny fanatsarana ny fahaizana ara-teknika sy ara-pandraharahana',
  s4: '4. Angona amin’ny antsipiriany',
  k: { total: 'Mpamboly madinika rehetra', on: (n) => `amin’ny ${n}`, taux: 'Tahan’ny fahatratrarana', ecart: 'Elanelana amin’ny làlana', expected: (y, n) => `andrasana tamin’ny faran’ny ${y} : ${n}`, declare: 'Ambaran’ny mpanome serivisy', valPct: (p, n) => `${p} % nekena · hetsika ${n}`, femmes: 'Anjaran’ny vehivavy', jeunes: 'Anjaran’ny tanora (< 35 taona)', persons: (n) => `olona ${n}` },
  c: { cat: 'Fizarana araka ny sokajy', evol: 'Fivoaran’ny mpahazo tombontsoa isan-taona (fitambarana)', region: 'Mpahazo tombontsoa isaky ny faritra', map: 'Toerana misy ny hetsika', incl: 'Vehivavy sy tanora araka ny sokajy (%)', inclYear: 'Vehivavy sy tanora isan-taona (%)', qual: 'Fanaraha-maso ny kalitaon’ny angona' },
  cat: { cols: ['Sokajy', 'Hetsika', 'Mpahazo tombontsoa', '% amin’ny totalin’ny', '% Vehivavy', '% Tanora'], total: 'Total' },
  ev: { declare: 'Voambara', valide: 'Nekena', cible: (n) => `Làlana tanjona (${n})` },
  conf: { enq: 'Olona nanontaniana', ok: 'Fanatsarana voamarina', rate: 'Tahan’ny fanamarinana', target: (n) => `Tanjona : ${n} %`, cov: 'Fetran’ny fanadihadiana', margin: (n) => `IC 95 % : ± ${n} teboka`, byCat: 'Tahan’ny fanamarinana araka ny sokajy (%)', skills: 'Fahaizana voamarina (Top 10, % amin’ny fanamarinana)', ms: 'Dingana fanangonana', base: 'Fanaraha-maso', mid: 'Antonony', final: 'Farany', done: 'Vita', soon: 'Ho avy', met: 'Tratra ny tanjona', notMet: 'Tsy tratra ny tanjona', none: 'Tsy misy fanadihadiana ho an’ireo sivana ireo.' },
  about: { title: 'Mikasika ny tondro', p1: 'Tondro 2 : 80 % amin’ny mpahazo tombontsoa no manamarina, miaraka amin’ny ohatra, fa nanatsara ny fahaizany ara-teknika sy ara-pandraharahana mba hampihatra fomba maharitra sy hanomezam-boka ny vokatra avy amin’ny fambolena, ny ala ary ny fiompiana.', p2: 'Ny fanamarinana dia miorina amin’ny fanadihadiana ny santionan’ny mpahazo tombontsoa maneho ny rehetra.', C2: 'Fampianarana iraisana', C3: 'Fanampiana manokana / vondrona', C4: 'Fanampiana ho an’ny mpandraharaha' },
  table: { title: (n) => `Hetsika sy mpahazo tombontsoa (${n})`, search: 'Hikaroka…', export: 'Hamoaka CSV', cols: ['ID hetsika', 'Sokajy', 'Faritra', 'Faritra arovana', 'Distrika', 'Kaominina', 'Fokontany', 'Lohateny', 'Mpandray anjara', 'Vehivavy', 'Tanora < 35 taona', 'Daty', 'Sata'], none: 'Tsy misy hetsika mifanaraka amin’ireo sivana ireo.', showing: (a, b, n) => `${a} – ${b} amin’ny ${n}`, empty: 'Tsy misy voarakitra', rows: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany' },
};

const en: Txt = {
  title: 'Smallholder farmers monitoring', refresh: 'Refresh', print: 'Print', reset: 'Reset filters',
  loading: 'Loading activities…', all: 'All',
  err: (s) => `Unable to load data. Check that ${s} is reachable, then refresh.`,
  f: { annee: 'Year', region: 'Region', aire_protegee: 'Protected area', paysage: 'Landscape', district: 'District', commune: 'Municipality', fokontany: 'Fokontany', mbv: 'Micro-watershed', categorie: 'Category', statut: 'Status' },
  s1: (n) => `1. Target achievement: ${n} smallholder farmers (C2, C3 and C4 beneficiaries)`,
  s2: '2. Inclusion: women and youth (< 35 years)',
  s3: '3. Confirmation of improved technical and entrepreneurial skills',
  s4: '4. Detailed data',
  k: { total: 'Total smallholder farmers', on: (n) => `out of ${n}`, taux: 'Achievement rate', ecart: 'Gap to trajectory', expected: (y, n) => `expected end of ${y}: ${n}`, declare: 'Reported by the contractor', valPct: (p, n) => `${p} % validated · ${n} activities`, femmes: 'Share of women', jeunes: 'Share of youth (< 35 years)', persons: (n) => `${n} people` },
  c: { cat: 'Breakdown by category', evol: 'Cumulative annual trend of beneficiaries', region: 'Beneficiaries by region', map: 'Activity locations', incl: 'Women and youth by category (%)', inclYear: 'Women and youth by year (%)', qual: 'Data quality control' },
  cat: { cols: ['Category', 'Activities', 'Beneficiaries', '% of total', '% Women', '% Youth'], total: 'Total' },
  ev: { declare: 'Reported', valide: 'Validated', cible: (n) => `Target trajectory (${n})` },
  conf: { enq: 'People surveyed', ok: 'Improvement confirmed', rate: 'Confirmation rate', target: (n) => `Target: ${n} %`, cov: 'Survey coverage', margin: (n) => `95 % CI: ± ${n} pts`, byCat: 'Confirmation rate by category (%)', skills: 'Confirmed skills (Top 10, % of confirmations)', ms: 'Data collection milestones', base: 'Follow-up', mid: 'Mid-term', final: 'Final', done: 'Completed', soon: 'Upcoming', met: 'Target met', notMet: 'Target not met', none: 'No survey for these filters.' },
  about: { title: 'About the indicator', p1: 'Indicator 2: 80 % of beneficiaries confirm, with examples, that they have improved their technical and entrepreneurial skills to implement sustainable practices and add value to agricultural, forestry and livestock products.', p2: 'Confirmation is based on surveys of a representative sample of beneficiaries.', C2: 'Group training', C3: 'Individual support / groups', C4: 'Support to entrepreneurs' },
  table: { title: (n) => `Activities and beneficiaries (${n})`, search: 'Search…', export: 'Export CSV', cols: ['Activity ID', 'Category', 'Region', 'Protected area', 'District', 'Municipality', 'Fokontany', 'Title', 'Participants', 'Women', 'Youth < 35', 'Date', 'Status'], none: 'No activity matches these filters.', showing: (a, b, n) => `Showing ${a} to ${b} of ${n}`, empty: '0 records', rows: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page' },
};

const de: Txt = {
  title: 'Überwachung der Kleinbauern', refresh: 'Aktualisieren', print: 'Drucken', reset: 'Filter zurücksetzen',
  loading: 'Aktivitäten werden geladen…', all: 'Alle',
  err: (s) => `Laden nicht möglich. Prüfen Sie, ob ${s} erreichbar ist, und aktualisieren Sie dann.`,
  f: { annee: 'Jahr', region: 'Region', aire_protegee: 'Schutzgebiet', paysage: 'Landschaft', district: 'Distrikt', commune: 'Gemeinde', fokontany: 'Fokontany', mbv: 'Mikro-Einzugsgebiet', categorie: 'Kategorie', statut: 'Status' },
  s1: (n) => `1. Zielerreichung: ${n} Kleinbauern (Begünstigte C2, C3 und C4)`,
  s2: '2. Inklusion: Frauen und Jugendliche (< 35 Jahre)',
  s3: '3. Bestätigung der verbesserten technischen und unternehmerischen Kompetenzen',
  s4: '4. Detaillierte Daten',
  k: { total: 'Kleinbauern gesamt', on: (n) => `von ${n}`, taux: 'Zielerreichung', ecart: 'Abweichung vom Zielpfad', expected: (y, n) => `erwartet Ende ${y}: ${n}`, declare: 'Vom Dienstleister gemeldet', valPct: (p, n) => `${p} % validiert · ${n} Aktivitäten`, femmes: 'Frauenanteil', jeunes: 'Anteil Jugendlicher (< 35 Jahre)', persons: (n) => `${n} Personen` },
  c: { cat: 'Verteilung nach Kategorie', evol: 'Kumulierte jährliche Entwicklung der Begünstigten', region: 'Begünstigte nach Region', map: 'Standorte der Aktivitäten', incl: 'Frauen und Jugendliche nach Kategorie (%)', inclYear: 'Frauen und Jugendliche nach Jahr (%)', qual: 'Datenqualitätskontrolle' },
  cat: { cols: ['Kategorie', 'Aktivitäten', 'Begünstigte', '% des Gesamtwerts', '% Frauen', '% Jugend'], total: 'Gesamt' },
  ev: { declare: 'Gemeldet', valide: 'Validiert', cible: (n) => `Zielpfad (${n})` },
  conf: { enq: 'Befragte Personen', ok: 'Verbesserung bestätigt', rate: 'Bestätigungsquote', target: (n) => `Ziel: ${n} %`, cov: 'Erhebungsabdeckung', margin: (n) => `95-%-KI: ± ${n} Pkt.`, byCat: 'Bestätigungsquote nach Kategorie (%)', skills: 'Bestätigte Kompetenzen (Top 10, % der Bestätigungen)', ms: 'Erhebungsmeilensteine', base: 'Nachverfolgung', mid: 'Halbzeit', final: 'Abschluss', done: 'Abgeschlossen', soon: 'Bevorstehend', met: 'Ziel erreicht', notMet: 'Ziel nicht erreicht', none: 'Keine Erhebung für diese Filter.' },
  about: { title: 'Zum Indikator', p1: 'Indikator 2: 80 % der Begünstigten bestätigen anhand von Beispielen, ihre technischen und unternehmerischen Kompetenzen verbessert zu haben, um nachhaltige Praktiken umzusetzen und Erzeugnisse aus Landwirtschaft, Forstwirtschaft und Viehhaltung aufzuwerten.', p2: 'Die Bestätigung beruht auf Befragungen einer repräsentativen Stichprobe der Begünstigten.', C2: 'Gruppenschulungen', C3: 'Einzelberatung / Gruppen', C4: 'Unterstützung von Unternehmern' },
  table: { title: (n) => `Aktivitäten und Begünstigte (${n})`, search: 'Suchen…', export: 'CSV exportieren', cols: ['Aktivitäts-ID', 'Kategorie', 'Region', 'Schutzgebiet', 'Distrikt', 'Gemeinde', 'Fokontany', 'Titel', 'Teilnehmende', 'Frauen', 'Jugend < 35', 'Datum', 'Status'], none: 'Keine Aktivität für diese Filter.', showing: (a, b, n) => `Anzeige von ${a} bis ${b} von ${n}`, empty: '0 Einträge', rows: 'Zeilen pro Seite', first: 'Erste Seite', prev: 'Vorherige Seite', next: 'Nächste Seite', last: 'Letzte Seite' },
};

export const TB: Record<Lang, Txt> = { fr, mg, en, de };
