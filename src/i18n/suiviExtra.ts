/* Textes complémentaires du tableau de bord (fr, mg, en, de).
   À placer dans src/i18n/suiviExtra.ts */

export type ExtraT = {
  now: string; plan: string;
  hintRegion: string; hintDistrict: string; hintCommune: string; loadingLimits: string;
  limitsFail: (l: string) => string;
  partial: (n: number, tot: number) => string;
  adm: Record<string, string>;
  base: { topo: string; sat: string; osm: string };
  baseAria: string;
};

export const X: Record<string, ExtraT> = {
  fr: {
    now: 'Actuel', plan: 'Planifié',
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
    now: 'Ankehitriny', plan: 'Voadrafitra',
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
    now: 'Current', plan: 'Planned',
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
    now: 'Aktuell', plan: 'Geplant',
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
