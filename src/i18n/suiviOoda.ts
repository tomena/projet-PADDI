/* Textes du bloc OODA et des messages de carte, en 4 langues (fr, mg, en, de).
   À placer dans src/i18n/suiviOoda.ts */

export type OodaT = {
  obs: string; ori: string; dec: string; act: string;
  declared: string; validated: string; pendRej: string;
  parcels: (n: string, avg: string) => string;
  ofDeclared: (p: string) => string;
  lowN: (n: number) => string;
  rhythm: string; quality: string;
  qualityVal: (rej: string, gps: string) => string;
  conc: string; top3: (p: string) => string;
  dominant: string; ofArea: (p: string) => string;
  cols: [string, string, string];
  adminT: string; adminA: (att: string) => string;
  realT: string; realA: (req: string, real: string) => string;
  waitT: string; waitA: (p: string) => string;
  rejT: string; rejA: (p: string) => string;
  gpsT: string; gpsA: (p: string) => string;
  concT: string; concA: (p: string) => string;
  noneT: string; noneA: string;
  whoValid: string; whoPartners: string; whoSE: string; whoField: string;
  whoGis: string; whoRegional: string; whoTeam: string;
  w30: string; wQuarter: string; w60: string; wPlan: string; wMonthly: string;
  hintRegion: string; hintDistrict: string; hintCommune: string; loadingLimits: string;
  limitsFail: (l: string) => string;
  partial: (n: number, tot: number) => string;
  adm: Record<string, string>;
  base: { topo: string; sat: string; osm: string };
  baseAria: string;
};

export const OODA: Record<string, OodaT> = {
  fr: {
    obs: 'Observer', ori: 'Orienter', dec: 'Décider', act: 'Agir',
    declared: 'Déclaré', validated: 'Validé', pendRej: 'En attente / rejeté',
    parcels: (n, a) => `${n} parcelles · moy. ${a} ha`,
    ofDeclared: (p) => `${p} % du déclaré`,
    lowN: (n) => `Seulement ${n} parcelle(s) : interpréter avec prudence.`,
    rhythm: 'Rythme annuel (réel → requis)', quality: 'Qualité des données',
    qualityVal: (r, g) => `${r} % rejet · ${g} % GPS > 10 m`,
    conc: 'Concentration', top3: (p) => `3 premières régions : ${p} %`,
    dominant: 'Pratique dominante', ofArea: (p) => `${p} % des superficies`,
    cols: ['Action', 'Responsable', 'Délai'],
    adminT: 'Retard surtout administratif',
    adminA: (a) => `${a} ha en attente suffiraient à rattraper : accélérer la validation.`,
    realT: 'Retard de réalisation',
    realA: (q, r) => `Il faut ${q} ha/an contre ${r} ha/an réalisés : renforcer les zones et partenaires les plus productifs.`,
    waitT: 'Stock en attente élevé',
    waitA: (p) => `${p} % de la superficie n'est pas validée : fixer un délai maximal de traitement.`,
    rejT: 'Taux de rejet élevé',
    rejA: (p) => `${p} % rejetés : analyser les motifs et former les agents de collecte.`,
    gpsT: 'Qualité GPS insuffisante',
    gpsA: (p) => `${p} % des parcelles dépassent 10 m d'erreur : recontrôler ou recalibrer.`,
    concT: 'Réalisations concentrées',
    concA: (p) => `3 régions portent ${p} % des superficies : cibler les régions sous-représentées.`,
    noneT: 'Aucune alerte', noneA: 'Maintenir le rythme et le contrôle qualité.',
    whoValid: 'Cellule de validation', whoPartners: 'Coordination / partenaires', whoSE: 'Suivi-évaluation',
    whoField: 'Agents de terrain / S&E', whoGis: 'Équipe SIG', whoRegional: 'Coordination régionale', whoTeam: 'Équipe projet',
    w30: '30 jours', wQuarter: 'Prochain trimestre', w60: '60 jours', wPlan: 'Prochain plan annuel', wMonthly: 'Suivi mensuel',
    hintRegion: 'Cliquez sur une région (ou choisissez-la dans la liste) pour zoomer et voir ses districts.',
    hintDistrict: 'Cliquez sur un district pour zoomer et voir ses communes.',
    hintCommune: 'Cliquez sur une commune pour la sélectionner.',
    loadingLimits: 'Chargement des limites…',
    limitsFail: (l) => `Limites non chargées : ${l}. Le zoom se fait alors sur les parcelles de la base.`,
    partial: (n, t) => `Contours disponibles pour ${n} régions sur ${t} : les autres se zooment sur leurs parcelles.`,
    adm: { 'régions': 'régions', districts: 'districts', communes: 'communes' },
    base: { topo: 'Topographie', sat: 'Satellite', osm: 'OpenStreetMap' },
    baseAria: 'Fond de carte',
  },
  mg: {
    obs: 'Mijery', ori: 'Mamantatra', dec: 'Mandray fanapahan-kevitra', act: 'Manao',
    declared: 'Voatatitra', validated: 'Voamarina', pendRej: 'Miandry / nolavina',
    parcels: (n, a) => `${n} sombintany · salan'isa ${a} ha`,
    ofDeclared: (p) => `${p} % amin'ny voatatitra`,
    lowN: (n) => `Sombintany ${n} ihany: ampiasao amin'ny fitandremana.`,
    rhythm: "Hafainganam-pandehan'ny taona (tena izy → takiana)", quality: "Kalitaon'ny angona",
    qualityVal: (r, g) => `${r} % nolavina · ${g} % GPS > 10 m`,
    conc: 'Fifantohana', top3: (p) => `Faritra 3 voalohany: ${p} %`,
    dominant: 'Fomba fanao manjaka', ofArea: (p) => `${p} % amin'ny velarana`,
    cols: ['Hetsika', "Tompon'andraikitra", 'Fe-potoana'],
    adminT: 'Fahatarana ara-pitantanana indrindra',
    adminA: (a) => `${a} ha miandry no ampy hahatratra ny lasa: haingana kokoa ny fanamarinana.`,
    realT: "Fahatarana amin'ny fanatanterahana",
    realA: (q, r) => `Ilaina ny ${q} ha/taona fa ${r} ha/taona ihany no vita: hamafisina ny faritra sy ny mpiara-miasa mahomby indrindra.`,
    waitT: 'Be loatra ny miandry fanamarinana',
    waitA: (p) => `${p} % amin'ny velarana no tsy mbola voamarina: hamaritana fe-potoana farany ho an'ny fikarakarana.`,
    rejT: "Avo ny tahan'ny fandavana",
    rejA: (p) => `${p} % nolavina: hodinihina ny antony ary hampiofanina ny mpanangona angona.`,
    gpsT: "Tsy ampy ny fahamarinan'ny GPS",
    gpsA: (p) => `${p} % amin'ny sombintany no mihoatra ny 10 m ny hadisoana: hojerena na hatsaraina ny fitaovana.`,
    concT: 'Mifantoka loatra ny vokatra',
    concA: (p) => `Faritra 3 no mitondra ${p} % amin'ny velarana: kendrena ny faritra tsy misy fisehoana betsaka.`,
    noneT: 'Tsy misy fanairana', noneA: "Tazonina ny hafainganana sy ny fanaraha-maso ny kalitao.",
    whoValid: 'Sampana fanamarinana', whoPartners: 'Fandrindrana / mpiara-miasa', whoSE: 'Fanaraha-maso sy fanombanana',
    whoField: "Mpanangona eny an-toerana / F&F", whoGis: 'Ekipa SIG', whoRegional: 'Fandrindrana ara-faritra', whoTeam: "Ekipan'ny tetikasa",
    w30: 'Andro 30', wQuarter: 'Telovolana manaraka', w60: 'Andro 60', wPlan: 'Drafitra isan-taona manaraka', wMonthly: 'Fanaraha-maso isam-bolana',
    hintRegion: 'Tsindrio ny faritra iray (na safidio ao amin\'ny lisitra) mba hizoomana sy hijerena ny distrikany.',
    hintDistrict: 'Tsindrio ny distrika iray mba hizoomana sy hijerena ny kaomininy.',
    hintCommune: 'Tsindrio ny kaominina iray mba hisafidianana azy.',
    loadingLimits: 'Mampiditra ny sisintany…',
    limitsFail: (l) => `Tsy voakarina ny sisintany: ${l}. Hizoom amin'ny sombintanin'ny angona izany.`,
    partial: (n, t) => `Misy sisintany ho an'ny faritra ${n} amin'ny ${t}: ny hafa dia mizoom amin'ny sombintany.`,
    adm: { 'régions': 'faritra', districts: 'distrika', communes: 'kaominina' },
    base: { topo: 'Topografia', sat: 'Zanaka-tany', osm: 'OpenStreetMap' },
    baseAria: "Fototry ny sarintany",
  },
  en: {
    obs: 'Observe', ori: 'Orient', dec: 'Decide', act: 'Act',
    declared: 'Declared', validated: 'Validated', pendRej: 'Pending / rejected',
    parcels: (n, a) => `${n} plots · avg. ${a} ha`,
    ofDeclared: (p) => `${p}% of declared`,
    lowN: (n) => `Only ${n} plot(s): interpret with caution.`,
    rhythm: 'Annual pace (actual → required)', quality: 'Data quality',
    qualityVal: (r, g) => `${r}% rejected · ${g}% GPS > 10 m`,
    conc: 'Concentration', top3: (p) => `Top 3 regions: ${p}%`,
    dominant: 'Dominant practice', ofArea: (p) => `${p}% of the area`,
    cols: ['Action', 'Owner', 'Deadline'],
    adminT: 'Mostly an administrative delay',
    adminA: (a) => `${a} ha pending would be enough to catch up: speed up validation.`,
    realT: 'Delivery delay',
    realA: (q, r) => `${q} ha/yr are needed versus ${r} ha/yr achieved: strengthen the most productive areas and partners.`,
    waitT: 'High pending backlog',
    waitA: (p) => `${p}% of the area is not validated: set a maximum processing time.`,
    rejT: 'High rejection rate',
    rejA: (p) => `${p}% rejected: analyse the reasons and train the data collectors.`,
    gpsT: 'Insufficient GPS quality',
    gpsA: (p) => `${p}% of plots exceed 10 m error: re-check or recalibrate devices.`,
    concT: 'Concentrated results',
    concA: (p) => `3 regions account for ${p}% of the area: target under-represented regions.`,
    noneT: 'No alerts', noneA: 'Maintain the current pace and quality control.',
    whoValid: 'Validation unit', whoPartners: 'Coordination / partners', whoSE: 'Monitoring & evaluation',
    whoField: 'Field agents / M&E', whoGis: 'GIS team', whoRegional: 'Regional coordination', whoTeam: 'Project team',
    w30: '30 days', wQuarter: 'Next quarter', w60: '60 days', wPlan: 'Next annual plan', wMonthly: 'Monthly follow-up',
    hintRegion: 'Click a region (or pick it from the list) to zoom in and see its districts.',
    hintDistrict: 'Click a district to zoom in and see its communes.',
    hintCommune: 'Click a commune to select it.',
    loadingLimits: 'Loading boundaries…',
    limitsFail: (l) => `Boundaries not loaded: ${l}. The map will zoom to the plots in the database instead.`,
    partial: (n, t) => `Outlines available for ${n} of ${t} regions: the others zoom to their plots.`,
    adm: { 'régions': 'regions', districts: 'districts', communes: 'communes' },
    base: { topo: 'Topography', sat: 'Satellite', osm: 'OpenStreetMap' },
    baseAria: 'Base map',
  },
  de: {
    obs: 'Beobachten', ori: 'Orientieren', dec: 'Entscheiden', act: 'Handeln',
    declared: 'Gemeldet', validated: 'Validiert', pendRej: 'Ausstehend / abgelehnt',
    parcels: (n, a) => `${n} Parzellen · Ø ${a} ha`,
    ofDeclared: (p) => `${p} % der gemeldeten Fläche`,
    lowN: (n) => `Nur ${n} Parzelle(n): mit Vorsicht interpretieren.`,
    rhythm: 'Jahrestempo (Ist → erforderlich)', quality: 'Datenqualität',
    qualityVal: (r, g) => `${r} % abgelehnt · ${g} % GPS > 10 m`,
    conc: 'Konzentration', top3: (p) => `Top-3-Regionen: ${p} %`,
    dominant: 'Vorherrschende Praxis', ofArea: (p) => `${p} % der Fläche`,
    cols: ['Maßnahme', 'Verantwortlich', 'Frist'],
    adminT: 'Überwiegend Verzögerung in der Verwaltung',
    adminA: (a) => `${a} ha ausstehend würden zum Aufholen genügen: Validierung beschleunigen.`,
    realT: 'Verzögerung bei der Umsetzung',
    realA: (q, r) => `Erforderlich sind ${q} ha/Jahr, erreicht wurden ${r} ha/Jahr: produktivste Gebiete und Partner stärken.`,
    waitT: 'Hoher Rückstau ausstehender Parzellen',
    waitA: (p) => `${p} % der Fläche sind nicht validiert: maximale Bearbeitungsfrist festlegen.`,
    rejT: 'Hohe Ablehnungsquote',
    rejA: (p) => `${p} % abgelehnt: Gründe analysieren und Datenerheber schulen.`,
    gpsT: 'Unzureichende GPS-Qualität',
    gpsA: (p) => `${p} % der Parzellen haben mehr als 10 m Fehler: Geräte prüfen oder neu kalibrieren.`,
    concT: 'Ergebnisse konzentriert',
    concA: (p) => `3 Regionen tragen ${p} % der Fläche: unterrepräsentierte Regionen gezielt ansprechen.`,
    noneT: 'Keine Warnungen', noneA: 'Tempo und Qualitätskontrolle beibehalten.',
    whoValid: 'Validierungsstelle', whoPartners: 'Koordination / Partner', whoSE: 'Monitoring & Evaluierung',
    whoField: 'Feldmitarbeiter / M&E', whoGis: 'GIS-Team', whoRegional: 'Regionale Koordination', whoTeam: 'Projektteam',
    w30: '30 Tage', wQuarter: 'Nächstes Quartal', w60: '60 Tage', wPlan: 'Nächster Jahresplan', wMonthly: 'Monatliche Nachverfolgung',
    hintRegion: 'Klicken Sie auf eine Region (oder wählen Sie sie in der Liste), um zu zoomen und ihre Distrikte zu sehen.',
    hintDistrict: 'Klicken Sie auf einen Distrikt, um zu zoomen und seine Gemeinden zu sehen.',
    hintCommune: 'Klicken Sie auf eine Gemeinde, um sie auszuwählen.',
    loadingLimits: 'Grenzen werden geladen…',
    limitsFail: (l) => `Grenzen nicht geladen: ${l}. Die Karte zoomt stattdessen auf die Parzellen der Datenbank.`,
    partial: (n, t) => `Umrisse für ${n} von ${t} Regionen verfügbar: die übrigen zoomen auf ihre Parzellen.`,
    adm: { 'régions': 'Regionen', districts: 'Distrikte', communes: 'Gemeinden' },
    base: { topo: 'Topografie', sat: 'Satellit', osm: 'OpenStreetMap' },
    baseAria: 'Hintergrundkarte',
  },
};
