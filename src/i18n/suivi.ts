export type Lang = 'fr' | 'mg' | 'en' | 'de';
export const IDX: Record<Lang, number> = { fr: 0, mg: 1, en: 2, de: 3 };
export const LOCALES: Record<Lang, string> = { fr: 'fr-FR', mg: 'fr-FR', en: 'en-GB', de: 'de-DE' };

/* Valeurs des données (GeoJSON) → [fr, mg, en, de] */
export const V: Record<string, string[]> = {
  'Surface agropastorale': ['Surface agropastorale', 'Velarana fambolena sy fiompiana', 'Agropastoral area', 'Agrarisch-weidewirtschaftliche Fläche'],
  'Surface forestière': ['Surface forestière', 'Velarana ala', 'Forest area', 'Waldfläche'],
  'Pâturage': ['Pâturage', 'Kijana', 'Pasture', 'Weideland'],
  'Agricole': ['Agricole', 'Fambolena', 'Agricultural', 'Ackerland'],
  'Agroforestier': ['Agroforestier', 'Fambolena mitambatra amin’ny hazo', 'Agroforestry', 'Agroforst'],
  'Bois énergie': ['Bois énergie', 'Kitay', 'Fuelwood', 'Energieholz'],
  'Restauration forêt': ['Restauration forêt', 'Famerenana ny ala', 'Forest restoration', 'Waldwiederherstellung'],
  'Restauration sources': ['Restauration sources', 'Famerenana ny loharano', 'Spring restoration', 'Quellsanierung'],
  'RNA': ['RNA', 'RNA (fiterahana voajanahary notohanana)', 'Assisted natural regeneration', 'Gelenkte Naturverjüngung'],
  'Stabilisation lavaka': ['Stabilisation lavaka', 'Fanamafisana lavaka', 'Lavaka stabilisation', 'Lavaka-Stabilisierung'],
  'Production durable': ['Production durable', 'Famokarana maharitra', 'Sustainable production', 'Nachhaltige Produktion'],
  'Gestion durable des ressources naturelles': ['Gestion durable des ressources naturelles', 'Fitantanana maharitra ny harena voajanahary', 'Sustainable natural resource management', 'Nachhaltiges Management natürlicher Ressourcen'],
  'Valorisation des productions durables': ['Valorisation des productions durables', 'Fanomezam-boka ny vokatra maharitra', 'Valorisation of sustainable products', 'Wertschöpfung nachhaltiger Produkte'],
  'Restauration des paysages': ['Restauration des paysages', 'Famerenana ny tontolo', 'Landscape restoration', 'Landschaftswiederherstellung'],
  'culture de conservation': ['culture de conservation', 'fambolena fiarovana', 'conservation farming', 'Erhaltungsanbau'],
  'maraîchage bio': ['maraîchage bio', 'fambolena anana organika', 'organic market gardening', 'Bio-Gemüseanbau'],
  'pâturage tournant': ['pâturage tournant', 'fiompiana mivadika toerana', 'rotational grazing', 'Umtriebsweide'],
  'haie vive': ['haie vive', 'fefy velona', 'living hedge', 'Lebendhecke'],
  'transformation': ['transformation', 'fanodinana', 'processing', 'Verarbeitung'],
  'agroforesterie': ['agroforesterie', 'fambolena mitambatra amin’ny hazo', 'agroforestry', 'Agroforstwirtschaft'],
  'reboisement': ['reboisement', 'famafazana hazo', 'reforestation', 'Aufforstung'],
  'espèces locales': ['espèces locales', 'karazana teratany', 'native species', 'heimische Arten'],
  'protection des sources': ['protection des sources', 'fiarovana ny loharano', 'spring protection', 'Quellschutz'],
  'bois énergie': ['bois énergie', 'kitay', 'fuelwood', 'Energieholz'],
  'Validé': ['Validé', 'Nekena', 'Validated', 'Validiert'],
  'En attente': ['En attente', 'Miandry', 'Pending', 'Ausstehend'],
  'Rejeté': ['Rejeté', 'Nolavina', 'Rejected', 'Abgelehnt'],
};

const fr = {
  title: { agro: '🌿 Suivi des surfaces agropastorales', foret: '🌳 Suivi des surfaces forestières', global: 'Suivi des superficies aménagées durablement' },
  enonceTitle: 'Énoncé de l’indicateur',
  enonce: {
    agro: (n: string) => `Les surfaces sur lesquelles des pratiques agricoles et d’élevage durables sont appliquées augmentent de ${n} hectares dans les Communes partenaires.`,
    foret: (n: string) => `Les surfaces sur lesquelles des pratiques forestières durables sont appliquées augmentent de ${n} hectares dans les Communes partenaires.`,
    global: (n: string) => `Sur ${n} ha, des pratiques agropastorales et forestières durables sont appliquées.`,
  },
  f: { annee: 'Année', region: 'Région', aire_protegee: 'Aire protégée', paysage: 'Paysage', district: 'District', commune: 'Commune', fokontany: 'Fokontany', mbv: 'Micro-bassin versant', statut: 'Statut' },
  all: 'Tous', refresh: 'Actualiser', loading: 'Chargement des parcelles…',
  err: (s: string) => `Chargement impossible. Vérifiez que ${s} est accessible, puis actualisez.`,
  k: { valide: 'Superficie validée', on: (n: string) => `sur ${n} ha`, taux: 'Taux d’atteinte', ecart: 'Écart à la trajectoire', expected: (y: number, n: string) => `attendu fin ${y} : ${n} ha`, declare: 'Déclaré par le prestataire', valPct: (p: string, n: string) => `${p} % validé · ${n} parcelles` },
  extra: { cep: 'Superficie des Champs Écoles Paysans (CEP)', feu: 'Superficie des pare-feux' },
  c: { region: 'Répartition par région (ha)', evol: 'Évolution annuelle cumulée (ha)', qual: 'Contrôle qualité des relevés', map: 'Localisation des parcelles', prec: (n: string) => `Précision GPS moyenne : ${n} m` },
  ev: { declare: 'Déclaré', valide: 'Validé', cible: (n: string) => `Trajectoire cible (${n} ha)` },
  donut: { type_terrain: 'Répartition par type de terrain (ha)', pratique_cat: 'Répartition par type de pratique (ha)', theme_label: 'Part par type d’aménagement (ha)' },
  table: { title: (n: string) => `Détails des parcelles (${n})`, search: 'Rechercher…', export: 'Exporter CSV', cols: ['ID Parcelle', 'ID Utilisateur', 'Pratique durable appliquée', 'Début', 'Fin', 'Superficie (ha)', 'Statut'], none: 'Aucune parcelle pour ces filtres.', showing: (a: string, b: string, n: string) => `Affichage de ${a} à ${b} sur ${n}`, empty: '0 enregistrement', rows: 'Lignes par page', first: 'Première page', prev: 'Page précédente', next: 'Page suivante', last: 'Dernière page' },
};
export type Txt = typeof fr;

const mg: Txt = {
  title: { agro: '🌿 Fanaraha-maso ny velarana fambolena sy fiompiana', foret: '🌳 Fanaraha-maso ny velarana ala', global: 'Fanaraha-maso ny velarana voalamina maharitra' },
  enonceTitle: 'Fanazavana ny tondro',
  enonce: {
    agro: (n) => `Mitombo ${n} hektara ny velarana ampiharana fomba fambolena sy fiompiana maharitra ao amin’ny Kaominina mpiara-miasa.`,
    foret: (n) => `Mitombo ${n} hektara ny velarana ampiharana fomba fitantanana ala maharitra ao amin’ny Kaominina mpiara-miasa.`,
    global: (n) => `Amin’ny ${n} ha, ampiharina ny fomba fambolena, fiompiana ary fitantanana ala maharitra.`,
  },
  f: { annee: 'Taona', region: 'Faritra', aire_protegee: 'Faritra arovana', paysage: 'Tontolo', district: 'Distrika', commune: 'Kaominina', fokontany: 'Fokontany', mbv: 'Tambatra-drano kely', statut: 'Sata' },
  all: 'Rehetra', refresh: 'Havaozina', loading: 'Mampiditra ny angona…',
  err: (s) => `Tsy afaka naka ny angona. Jereo raha azo vakiana ny ${s}, avy eo havaozy.`,
  k: { valide: 'Velarana nekena', on: (n) => `amin’ny ${n} ha`, taux: 'Tahan’ny fahatratrarana', ecart: 'Elanelana amin’ny làlana', expected: (y, n) => `andrasana tamin’ny faran’ny ${y} : ${n} ha`, declare: 'Ambaran’ny mpanome serivisy', valPct: (p, n) => `${p} % nekena · ${n} tany` },
  extra: { cep: 'Velaran’ny Saha Fampianarana Mpamboly (CEP)', feu: 'Velaran’ny sakana afo' },
  c: { region: 'Fizarana isaky ny faritra (ha)', evol: 'Fivoaran’ny fitambarana isan-taona (ha)', qual: 'Fanaraha-maso ny kalitaon’ny fakana ny angona', map: 'Toerana misy ny tany', prec: (n) => `Salan’ny fahamarinan’ny GPS : ${n} m` },
  ev: { declare: 'Voambara', valide: 'Nekena', cible: (n) => `Làlana tanjona (${n} ha)` },
  donut: { type_terrain: 'Fizarana araka ny karazan-tany (ha)', pratique_cat: 'Fizarana araka ny karazana fomba (ha)', theme_label: 'Anjaran’ny karazana fanamboarana (ha)' },
  table: { title: (n) => `Antsipirihan’ny tany (${n})`, search: 'Hikaroka…', export: 'Hamoaka CSV', cols: ['ID tany', 'ID mpampiasa', 'Fomba maharitra ampiharina', 'Fanombohana', 'Fiafarana', 'Velarana (ha)', 'Sata'], none: 'Tsy misy tany mifanaraka amin’ireo sivana ireo.', showing: (a, b, n) => `${a} – ${b} amin’ny ${n}`, empty: 'Tsy misy voarakitra', rows: 'Andalana isaky ny pejy', first: 'Pejy voalohany', prev: 'Pejy teo aloha', next: 'Pejy manaraka', last: 'Pejy farany' },
};

const en: Txt = {
  title: { agro: '🌿 Agropastoral areas monitoring', foret: '🌳 Forest areas monitoring', global: 'Sustainably managed areas monitoring' },
  enonceTitle: 'Indicator statement',
  enonce: {
    agro: (n) => `The area under sustainable farming and livestock practices increases by ${n} hectares in the partner Municipalities.`,
    foret: (n) => `The area under sustainable forestry practices increases by ${n} hectares in the partner Municipalities.`,
    global: (n) => `Sustainable agropastoral and forestry practices are applied over ${n} ha.`,
  },
  f: { annee: 'Year', region: 'Region', aire_protegee: 'Protected area', paysage: 'Landscape', district: 'District', commune: 'Municipality', fokontany: 'Fokontany', mbv: 'Micro-watershed', statut: 'Status' },
  all: 'All', refresh: 'Refresh', loading: 'Loading parcels…',
  err: (s) => `Unable to load data. Check that ${s} is reachable, then refresh.`,
  k: { valide: 'Validated area', on: (n) => `out of ${n} ha`, taux: 'Achievement rate', ecart: 'Gap to trajectory', expected: (y, n) => `expected end of ${y}: ${n} ha`, declare: 'Reported by the contractor', valPct: (p, n) => `${p} % validated · ${n} parcels` },
  extra: { cep: 'Farmer Field School (CEP) area', feu: 'Firebreak area' },
  c: { region: 'Breakdown by region (ha)', evol: 'Cumulative annual trend (ha)', qual: 'Survey quality control', map: 'Parcel locations', prec: (n) => `Average GPS accuracy: ${n} m` },
  ev: { declare: 'Reported', valide: 'Validated', cible: (n) => `Target trajectory (${n} ha)` },
  donut: { type_terrain: 'Breakdown by land type (ha)', pratique_cat: 'Breakdown by practice type (ha)', theme_label: 'Share by type of management (ha)' },
  table: { title: (n) => `Parcel details (${n})`, search: 'Search…', export: 'Export CSV', cols: ['Parcel ID', 'User ID', 'Sustainable practice applied', 'Start', 'End', 'Area (ha)', 'Status'], none: 'No parcel matches these filters.', showing: (a, b, n) => `Showing ${a} to ${b} of ${n}`, empty: '0 records', rows: 'Rows per page', first: 'First page', prev: 'Previous page', next: 'Next page', last: 'Last page' },
};

const de: Txt = {
  title: { agro: '🌿 Überwachung der agrarisch-weidewirtschaftlichen Flächen', foret: '🌳 Überwachung der Waldflächen', global: 'Überwachung der nachhaltig bewirtschafteten Flächen' },
  enonceTitle: 'Indikatorbeschreibung',
  enonce: {
    agro: (n) => `Die Fläche mit nachhaltigen Anbau- und Viehhaltungspraktiken wächst in den Partnergemeinden um ${n} Hektar.`,
    foret: (n) => `Die Fläche mit nachhaltigen Forstpraktiken wächst in den Partnergemeinden um ${n} Hektar.`,
    global: (n) => `Auf ${n} ha werden nachhaltige agrarisch-weidewirtschaftliche und forstliche Praktiken angewendet.`,
  },
  f: { annee: 'Jahr', region: 'Region', aire_protegee: 'Schutzgebiet', paysage: 'Landschaft', district: 'Distrikt', commune: 'Gemeinde', fokontany: 'Fokontany', mbv: 'Mikro-Einzugsgebiet', statut: 'Status' },
  all: 'Alle', refresh: 'Aktualisieren', loading: 'Parzellen werden geladen…',
  err: (s) => `Laden nicht möglich. Prüfen Sie, ob ${s} erreichbar ist, und aktualisieren Sie dann.`,
  k: { valide: 'Validierte Fläche', on: (n) => `von ${n} ha`, taux: 'Zielerreichung', ecart: 'Abweichung vom Zielpfad', expected: (y, n) => `erwartet Ende ${y}: ${n} ha`, declare: 'Vom Dienstleister gemeldet', valPct: (p, n) => `${p} % validiert · ${n} Parzellen` },
  extra: { cep: 'Fläche der Farmer Field Schools (CEP)', feu: 'Fläche der Brandschneisen' },
  c: { region: 'Verteilung nach Region (ha)', evol: 'Kumulierte jährliche Entwicklung (ha)', qual: 'Qualitätskontrolle der Erhebungen', map: 'Lage der Parzellen', prec: (n) => `Durchschnittliche GPS-Genauigkeit: ${n} m` },
  ev: { declare: 'Gemeldet', valide: 'Validiert', cible: (n) => `Zielpfad (${n} ha)` },
  donut: { type_terrain: 'Verteilung nach Flächenart (ha)', pratique_cat: 'Verteilung nach Praxistyp (ha)', theme_label: 'Anteil nach Bewirtschaftungsart (ha)' },
  table: { title: (n) => `Parzellendetails (${n})`, search: 'Suchen…', export: 'CSV exportieren', cols: ['Parzellen-ID', 'Nutzer-ID', 'Angewendete nachhaltige Praxis', 'Beginn', 'Ende', 'Fläche (ha)', 'Status'], none: 'Keine Parzelle für diese Filter.', showing: (a, b, n) => `Anzeige von ${a} bis ${b} von ${n}`, empty: '0 Einträge', rows: 'Zeilen pro Seite', first: 'Erste Seite', prev: 'Vorherige Seite', next: 'Nächste Seite', last: 'Letzte Seite' },
};

export const T: Record<Lang, Txt> = { fr, mg, en, de };
