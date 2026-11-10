import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

/* =====================================================================
   TRADUCTIONS
   `fr` sert de modèle : TypeScript impose les mêmes clés dans mg / en / de.
   ===================================================================== */

const fr = {
  title: 'Zones de pression',
  subtitle: 'Feux actifs, perte de couvert forestier, risque d’érosion et pression sur les aires protégées',
  updating: 'Mise à jour…', offline: 'Hors ligne', dataAt: (h: string) => `Données de ${h}`,
  refresh: 'Actualiser', refreshFires: 'Actualiser les feux', export: 'Exporter',
  exportView: 'Vue actuelle', exportViewSub: (n: string) => `${n} feux filtrés · CSV`,
  exportHisto: 'Historique du mois',
  exportHistoSub: (n: number) => `${n} jour${n > 1 ? 's' : ''} enregistré${n > 1 ? 's' : ''} · CSV`,
  exportHistoNone: 'Aucun jour enregistré pour l’instant',

  firePoints: 'Points de feux actifs', period: 'Période', firePeriodAria: 'Période des feux',
  reliability: 'Fiabilité', confAll: 'Toutes les détections', confNominal: 'Nominale et plus', confHigh: 'Élevée seulement',
  lossLayer: 'Perte de couvert forestier', alerts: 'Alertes', alertsAria: 'Période des alertes',
  erosionLayer: 'Zone à risque d’érosion',
  years: 'Années', yearFrom: 'Année de début', yearTo: 'Année de fin', to: 'à',
  region: 'Région', allRegions: 'Toutes les régions', protectedArea: 'Aire protégée',
  allAPs: 'Toutes les aires protégées', allAPsOfRegion: 'Toutes celles de la région', reset: 'Réinitialiser',

  noLayerTitle: 'Aucune couche sélectionnée',
  noLayerText: 'Cochez « Points de feux actifs », « Perte de couvert forestier » ou « Zone à risque d’érosion » pour afficher les statistiques et la carte.',
  firesDetected: 'feux détectés', lastHours: (h: number) => `${h} dernières heures`,
  chronoAria: 'Détections par tranche de 6 heures',
  chronoTip: (n: number, a: number, b: number) => `${n} feux · il y a ${a} à ${b} h`,
  ago72: 'il y a 72 h', now: 'maintenant',
  forestLost: 'de couvert forestier perdu', lossAria: 'Alertes de perte de couvert par jour',
  lossTip: (n: number, d: string) => `${n} alertes · ${d}`,
  alertsDays: (n: string, j: number) => `${n} alertes · ${j} derniers jours`, today: 'aujourd’hui',
  erosionZones: 'zones à risque d’érosion',

  recentPace: 'Rythme récent', keyFires: 'feux (24 / 48 / 72 h)', keyAlerts: 'alertes (7 / 30 / 90 j)',
  row24: '24 h · 7 j', row48: '48 h · 30 j', row72: '72 h · 90 j',
  firesTitle: 'Feux détectés', last24: '24 dernières heures', last48: '48 dernières heures', last72: '72 dernières heures',
  lossAlertsTitle: 'Alertes de perte de couvert', last7d: '7 derniers jours', last30d: '30 derniers jours', last90d: '90 derniers jours',
  apTitle: 'Aires protégées', noAP: 'Aucune aire protégée dans cette région', loading: 'Chargement…',
  noAPFire: 'Aucune aire protégée avec un feu détecté sur cette période',
  noAPErosion: 'Aucune aire protégée concernée par une zone à risque d’érosion',
  apOnlyConcerned: 'Seules les aires concernées sont listées · choisissez une région pour voir toutes ses aires',
  yearlyTitle: 'Évolution annuelle de la perte', haLostPerYear: (p: string) => `Hectares perdus par an · ${p}`,
  haPerYear: (n: string) => ` · ≈ ${n} ha/an`, unavailable: 'Données indisponibles',
  aroundTitle: 'Autour des aires protégées', periphNote: (h: number) => `Périphéries de 5 km · ${h} h`,
  pctShown: (p: number) => `${p} % des feux affichés`, noFireShown: 'Aucun feu affiché',
  top3: 'Top 3 des communes', noFireZone: 'Aucun feu dans la zone choisie',

  layersBtn: 'Couches',
  layers: { feux: 'Détections de feux', perte: 'Perte de couvert forestier', erosion: 'Zones à risque d’érosion', paysages: 'Paysages', mbv: 'Micro-bassins', regions: 'Limites des régions', aires: 'Aires protégées', peripheries: 'Périphéries de 5 km' },
  fonds: { satellite: 'Satellite', topo: 'Topographique', osm: 'OpenStreetMap' },
  legFireAge: 'Ancienneté des feux', legLess24: 'Moins de 24 h', leg24_48: '24 à 48 h', leg48_72: '48 à 72 h',
  legLoss: 'Perte de couvert forestier', legErosion: 'Zone à risque d’érosion',
  legZones: 'Zones de l’aire protégée', legLandscapes: 'Paysages', legMicro: 'Micro-bassins',
  retry: 'Réessayer',
  theme: 'Couche',

  tipFires: 'Feux détectés', tipHa: 'Superficie déboisée', tipErosion: 'Zones à risque d’érosion',
  na: 'n/d', keyFire: 'feux', keyHa: 'hectares déboisés', unitHa: 'ha',
  popupTitle: 'Détection satellite', popupAt: (d: string, h: string) => `${d} à ${h} UTC`,
  popupConf: 'Confiance', popupPower: 'Puissance', popupSat: 'Satellite',
  conf: { h: 'élevée', n: 'nominale', l: 'faible', na: 'n/d' },

  allMadagascar: 'Tout Madagascar',
  defRegion: 'Région', defAP: 'Aire protégée sans nom', defCommune: 'Commune sans nom',
  defLandscape: 'Paysage sans nom', defMicro: 'Micro-bassin sans nom', defErosion: 'Zone à risque d’érosion',
  errFirms: 'Impossible de récupérer les données FIRMS.', errGfw: 'Impossible de récupérer les alertes GFW.',
  errErosion: 'Fichier des zones à risque d’érosion introuvable.',

  csvFires: ['date', 'heure_utc', 'latitude', 'longitude', 'region', 'confiance', 'puissance_mw', 'satellite', 'jour_nuit'],
  csvHisto: ['date', 'type', 'nom', 'nombre_de_feux'],
  csvTypes: { country: 'Madagascar', total: 'Total', region: 'Région', ap: 'Aire protégée' },
};
type Txt = typeof fr;

const mg: Txt = {
  title: 'Faritra iharan’ny tsindry',
  subtitle: 'Doro mavitrika, fahaverezan’ny rakotra ala, loza eroziona ary tsindry eo amin’ny faritra arovana',
  updating: 'Fanavaozana…', offline: 'Tsy misy tambajotra', dataAt: (h) => `Angona tamin’ny ${h}`,
  refresh: 'Havaozina', refreshFires: 'Havaozy ny doro', export: 'Hamoaka',
  exportView: 'Fijery ankehitriny', exportViewSub: (n) => `doro ${n} voasivana · CSV`,
  exportHisto: 'Tantaran’ny volana',
  exportHistoSub: (n) => `andro ${n} voarakitra · CSV`,
  exportHistoNone: 'Mbola tsy misy andro voarakitra',

  firePoints: 'Teboka doro mavitrika', period: 'Vanim-potoana', firePeriodAria: 'Vanim-potoanan’ny doro',
  reliability: 'Fahatokisana', confAll: 'Ny fanamarihana rehetra', confNominal: 'Antonony sy mihoatra', confHigh: 'Avo ihany',
  lossLayer: 'Fahaverezan’ny rakotra ala', alerts: 'Fampitandremana', alertsAria: 'Vanim-potoanan’ny fampitandremana',
  erosionLayer: 'Faritra atahorana ho voan’ny eroziona',
  years: 'Taona', yearFrom: 'Taona fanombohana', yearTo: 'Taona farany', to: 'ka hatramin’ny',
  region: 'Faritra', allRegions: 'Faritra rehetra', protectedArea: 'Faritra arovana',
  allAPs: 'Faritra arovana rehetra', allAPsOfRegion: 'Izay rehetra ao amin’ny faritra', reset: 'Averina',

  noLayerTitle: 'Tsy misy sosona voafidy',
  noLayerText: 'Asio tick ny « Teboka doro mavitrika », ny « Fahaverezan’ny rakotra ala » na ny « Faritra atahorana ho voan’ny eroziona » mba hiseho ny antontan-kisary sy ny sarintany.',
  firesDetected: 'doro hita', lastHours: (h) => `ora ${h} farany`,
  chronoAria: 'Fanamarihana isaky ny ora 6',
  chronoTip: (n, a, b) => `doro ${n} · ${a} ka hatramin’ny ${b} ora lasa`,
  ago72: '72 ora lasa', now: 'ankehitriny',
  forestLost: 'rakotra ala very', lossAria: 'Fampitandremana momba ny fahaverezan’ny rakotra isan’andro',
  lossTip: (n, d) => `fampitandremana ${n} · ${d}`,
  alertsDays: (n, j) => `fampitandremana ${n} · andro ${j} farany`, today: 'androany',
  erosionZones: 'faritra atahorana ho voan’ny eroziona',

  recentPace: 'Hafainganam-pandehana vao haingana', keyFires: 'doro (24 / 48 / 72 ora)', keyAlerts: 'fampitandremana (7 / 30 / 90 andro)',
  row24: '24 ora · 7 andro', row48: '48 ora · 30 andro', row72: '72 ora · 90 andro',
  firesTitle: 'Doro hita', last24: 'Ora 24 farany', last48: 'Ora 48 farany', last72: 'Ora 72 farany',
  lossAlertsTitle: 'Fampitandremana momba ny fahaverezan’ny rakotra', last7d: 'Andro 7 farany', last30d: 'Andro 30 farany', last90d: 'Andro 90 farany',
  apTitle: 'Faritra arovana', noAP: 'Tsy misy faritra arovana ao amin’ity faritra ity', loading: 'Mitondra…',
  noAPFire: 'Tsy misy faritra arovana nahitana doro tamin’ity vanim-potoana ity',
  noAPErosion: 'Tsy misy faritra arovana voakasik’ny faritra atahorana ho voan’ny eroziona',
  apOnlyConcerned: 'Ireo faritra arovana voakasika ihany no voatanisa · fidio ny faritra raha te hahita ny rehetra',
  yearlyTitle: 'Fivoaran’ny fahaverezana isan-taona', haLostPerYear: (p) => `Hektara very isan-taona · ${p}`,
  haPerYear: (n) => ` · ≈ ${n} ha/taona`, unavailable: 'Tsy misy angona',
  aroundTitle: 'Manodidina ny faritra arovana', periphNote: (h) => `Manodidina 5 km · ${h} ora`,
  pctShown: (p) => `${p} % amin’ny doro aseho`, noFireShown: 'Tsy misy doro aseho',
  top3: 'Kaominina 3 ambony indrindra', noFireZone: 'Tsy misy doro ao amin’ny faritra nofidina',

  layersBtn: 'Sosona',
  layers: { feux: 'Fanamarihana doro', perte: 'Fahaverezan’ny rakotra ala', erosion: 'Faritra atahorana ho voan’ny eroziona', paysages: 'Tontolo', mbv: 'Mikro-basinina', regions: 'Sisin’ny faritra', aires: 'Faritra arovana', peripheries: 'Manodidina 5 km' },
  fonds: { satellite: 'Zanabolana', topo: 'Topografika', osm: 'OpenStreetMap' },
  legFireAge: 'Faha-taonan’ny doro', legLess24: 'Latsaky ny 24 ora', leg24_48: '24 ka hatramin’ny 48 ora', leg48_72: '48 ka hatramin’ny 72 ora',
  legLoss: 'Fahaverezan’ny rakotra ala', legErosion: 'Faritra atahorana ho voan’ny eroziona',
  legZones: 'Faritry ny faritra arovana', legLandscapes: 'Tontolo', legMicro: 'Mikro-basinina',
  retry: 'Andramo indray',
   theme: 'Sosona',

  tipFires: 'Doro hita', tipHa: 'Velarana nopotehina', tipErosion: 'Faritra atahorana ho voan’ny eroziona',
  na: 'n/a', keyFire: 'doro', keyHa: 'hektara nopotehina', unitHa: 'ha',
  popupTitle: 'Fanamarihana avy amin’ny zanabolana', popupAt: (d, h) => `${d} tamin’ny ${h} UTC`,
  popupConf: 'Fahatokisana', popupPower: 'Heriny', popupSat: 'Zanabolana',
  conf: { h: 'avo', n: 'antonony', l: 'ambany', na: 'n/a' },

  allMadagascar: 'Madagasikara manontolo',
  defRegion: 'Faritra', defAP: 'Faritra arovana tsy misy anarana', defCommune: 'Kaominina tsy misy anarana',
  defLandscape: 'Tontolo tsy misy anarana', defMicro: 'Mikro-basinina tsy misy anarana', defErosion: 'Faritra atahorana ho voan’ny eroziona',
  errFirms: 'Tsy afaka naka ny angona FIRMS.', errGfw: 'Tsy afaka naka ny fampitandremana GFW.',
  errErosion: 'Tsy hita ny rakitra momba ny faritra atahorana ho voan’ny eroziona.',

  csvFires: ['daty', 'ora_utc', 'latitiota', 'longitiota', 'faritra', 'fahatokisana', 'heriny_mw', 'zanabolana', 'andro_alina'],
  csvHisto: ['daty', 'karazana', 'anarana', 'isan_ny_doro'],
  csvTypes: { country: 'Madagasikara', total: 'Fitambarany', region: 'Faritra', ap: 'Faritra arovana' },
};

const en: Txt = {
  title: 'Pressure zones',
  subtitle: 'Active fires, forest cover loss, erosion risk and pressure on protected areas',
  updating: 'Updating…', offline: 'Offline', dataAt: (h) => `Data as of ${h}`,
  refresh: 'Refresh', refreshFires: 'Refresh fires', export: 'Export',
  exportView: 'Current view', exportViewSub: (n) => `${n} filtered fires · CSV`,
  exportHisto: 'Monthly history',
  exportHistoSub: (n) => `${n} day${n > 1 ? 's' : ''} recorded · CSV`,
  exportHistoNone: 'No day recorded yet',

  firePoints: 'Active fire points', period: 'Period', firePeriodAria: 'Fire period',
  reliability: 'Reliability', confAll: 'All detections', confNominal: 'Nominal and above', confHigh: 'High only',
  lossLayer: 'Forest cover loss', alerts: 'Alerts', alertsAria: 'Alert period',
  erosionLayer: 'Erosion-risk zone',
  years: 'Years', yearFrom: 'Start year', yearTo: 'End year', to: 'to',
  region: 'Region', allRegions: 'All regions', protectedArea: 'Protected area',
  allAPs: 'All protected areas', allAPsOfRegion: 'All in the region', reset: 'Reset',

  noLayerTitle: 'No layer selected',
  noLayerText: 'Tick “Active fire points”, “Forest cover loss” or “Erosion-risk zone” to display the statistics and the map.',
  firesDetected: 'fires detected', lastHours: (h) => `last ${h} hours`,
  chronoAria: 'Detections per 6-hour block',
  chronoTip: (n, a, b) => `${n} fires · ${a} to ${b} h ago`,
  ago72: '72 h ago', now: 'now',
  forestLost: 'of forest cover lost', lossAria: 'Forest cover loss alerts per day',
  lossTip: (n, d) => `${n} alerts · ${d}`,
  alertsDays: (n, j) => `${n} alerts · last ${j} days`, today: 'today',
  erosionZones: 'erosion-risk zones',

  recentPace: 'Recent pace', keyFires: 'fires (24 / 48 / 72 h)', keyAlerts: 'alerts (7 / 30 / 90 d)',
  row24: '24 h · 7 d', row48: '48 h · 30 d', row72: '72 h · 90 d',
  firesTitle: 'Fires detected', last24: 'Last 24 hours', last48: 'Last 48 hours', last72: 'Last 72 hours',
  lossAlertsTitle: 'Forest cover loss alerts', last7d: 'Last 7 days', last30d: 'Last 30 days', last90d: 'Last 90 days',
  apTitle: 'Protected areas', noAP: 'No protected area in this region', loading: 'Loading…',
  noAPFire: 'No protected area with a detected fire in this period',
  noAPErosion: 'No protected area affected by an erosion-risk zone',
  apOnlyConcerned: 'Only the affected areas are listed · pick a region to see all of its areas',
  yearlyTitle: 'Yearly trend of the loss', haLostPerYear: (p) => `Hectares lost per year · ${p}`,
  haPerYear: (n) => ` · ≈ ${n} ha/year`, unavailable: 'Data unavailable',
  aroundTitle: 'Around protected areas', periphNote: (h) => `5 km peripheries · ${h} h`,
  pctShown: (p) => `${p} % of the fires shown`, noFireShown: 'No fire shown',
  top3: 'Top 3 municipalities', noFireZone: 'No fire in the selected area',

  layersBtn: 'Layers',
  layers: { feux: 'Fire detections', perte: 'Forest cover loss', erosion: 'Erosion-risk zones', paysages: 'Landscapes', mbv: 'Micro-watersheds', regions: 'Region boundaries', aires: 'Protected areas', peripheries: '5 km peripheries' },
  fonds: { satellite: 'Satellite', topo: 'Topographic', osm: 'OpenStreetMap' },
  legFireAge: 'Fire age', legLess24: 'Less than 24 h', leg24_48: '24 to 48 h', leg48_72: '48 to 72 h',
  legLoss: 'Forest cover loss', legErosion: 'Erosion-risk zone',
  legZones: 'Protected-area zones', legLandscapes: 'Landscapes', legMicro: 'Micro-watersheds',
  retry: 'Retry',
   theme: 'Layer',

  tipFires: 'Fires detected', tipHa: 'Deforested area', tipErosion: 'Erosion-risk zones',
  na: 'n/a', keyFire: 'fires', keyHa: 'hectares deforested', unitHa: 'ha',
  popupTitle: 'Satellite detection', popupAt: (d, h) => `${d} at ${h} UTC`,
  popupConf: 'Confidence', popupPower: 'Power', popupSat: 'Satellite',
  conf: { h: 'high', n: 'nominal', l: 'low', na: 'n/a' },

  allMadagascar: 'All of Madagascar',
  defRegion: 'Region', defAP: 'Unnamed protected area', defCommune: 'Unnamed municipality',
  defLandscape: 'Unnamed landscape', defMicro: 'Unnamed micro-watershed', defErosion: 'Erosion-risk zone',
  errFirms: 'Unable to retrieve FIRMS data.', errGfw: 'Unable to retrieve GFW alerts.',
  errErosion: 'Erosion-risk zone file not found.',

  csvFires: ['date', 'time_utc', 'latitude', 'longitude', 'region', 'confidence', 'power_mw', 'satellite', 'day_night'],
  csvHisto: ['date', 'type', 'name', 'number_of_fires'],
  csvTypes: { country: 'Madagascar', total: 'Total', region: 'Region', ap: 'Protected area' },
};

const de: Txt = {
  title: 'Druckzonen',
  subtitle: 'Aktive Brände, Waldverlust, Erosionsrisiko und Druck auf die Schutzgebiete',
  updating: 'Aktualisierung…', offline: 'Offline', dataAt: (h) => `Daten von ${h}`,
  refresh: 'Aktualisieren', refreshFires: 'Brände aktualisieren', export: 'Exportieren',
  exportView: 'Aktuelle Ansicht', exportViewSub: (n) => `${n} gefilterte Brände · CSV`,
  exportHisto: 'Monatsverlauf',
  exportHistoSub: (n) => `${n} Tag${n > 1 ? 'e' : ''} gespeichert · CSV`,
  exportHistoNone: 'Noch kein Tag gespeichert',

  firePoints: 'Aktive Brandpunkte', period: 'Zeitraum', firePeriodAria: 'Zeitraum der Brände',
  reliability: 'Zuverlässigkeit', confAll: 'Alle Erkennungen', confNominal: 'Nominal und höher', confHigh: 'Nur hoch',
  lossLayer: 'Waldverlust', alerts: 'Warnungen', alertsAria: 'Zeitraum der Warnungen',
  erosionLayer: 'Erosionsgefährdete Zone',
  years: 'Jahre', yearFrom: 'Startjahr', yearTo: 'Endjahr', to: 'bis',
  region: 'Region', allRegions: 'Alle Regionen', protectedArea: 'Schutzgebiet',
  allAPs: 'Alle Schutzgebiete', allAPsOfRegion: 'Alle der Region', reset: 'Zurücksetzen',

  noLayerTitle: 'Keine Ebene ausgewählt',
  noLayerText: 'Aktivieren Sie „Aktive Brandpunkte“, „Waldverlust“ oder „Erosionsgefährdete Zone“, um die Statistiken und die Karte anzuzeigen.',
  firesDetected: 'Brände erkannt', lastHours: (h) => `letzte ${h} Stunden`,
  chronoAria: 'Erkennungen pro 6-Stunden-Block',
  chronoTip: (n, a, b) => `${n} Brände · vor ${a} bis ${b} h`,
  ago72: 'vor 72 h', now: 'jetzt',
  forestLost: 'Waldfläche verloren', lossAria: 'Waldverlust-Warnungen pro Tag',
  lossTip: (n, d) => `${n} Warnungen · ${d}`,
  alertsDays: (n, j) => `${n} Warnungen · letzte ${j} Tage`, today: 'heute',
  erosionZones: 'erosionsgefährdete Zonen',

  recentPace: 'Aktuelle Entwicklung', keyFires: 'Brände (24 / 48 / 72 h)', keyAlerts: 'Warnungen (7 / 30 / 90 T.)',
  row24: '24 h · 7 T.', row48: '48 h · 30 T.', row72: '72 h · 90 T.',
  firesTitle: 'Erkannte Brände', last24: 'Letzte 24 Stunden', last48: 'Letzte 48 Stunden', last72: 'Letzte 72 Stunden',
  lossAlertsTitle: 'Waldverlust-Warnungen', last7d: 'Letzte 7 Tage', last30d: 'Letzte 30 Tage', last90d: 'Letzte 90 Tage',
  apTitle: 'Schutzgebiete', noAP: 'Kein Schutzgebiet in dieser Region', loading: 'Wird geladen…',
  noAPFire: 'Kein Schutzgebiet mit erkanntem Brand in diesem Zeitraum',
  noAPErosion: 'Kein Schutzgebiet von einer erosionsgefährdeten Zone betroffen',
  apOnlyConcerned: 'Nur betroffene Gebiete werden aufgeführt · Region wählen, um alle ihre Gebiete zu sehen',
  yearlyTitle: 'Jährliche Entwicklung des Verlusts', haLostPerYear: (p) => `Verlorene Hektar pro Jahr · ${p}`,
  haPerYear: (n) => ` · ≈ ${n} ha/Jahr`, unavailable: 'Daten nicht verfügbar',
  aroundTitle: 'Rund um die Schutzgebiete', periphNote: (h) => `5-km-Randgebiete · ${h} h`,
  pctShown: (p) => `${p} % der angezeigten Brände`, noFireShown: 'Kein Brand angezeigt',
  top3: 'Top 3 der Gemeinden', noFireZone: 'Kein Brand im gewählten Gebiet',

  layersBtn: 'Ebenen',
  layers: { feux: 'Branderkennungen', perte: 'Waldverlust', erosion: 'Erosionsgefährdete Zonen', paysages: 'Landschaften', mbv: 'Mikroeinzugsgebiete', regions: 'Regionsgrenzen', aires: 'Schutzgebiete', peripheries: '5-km-Randgebiete' },
  fonds: { satellite: 'Satellit', topo: 'Topografisch', osm: 'OpenStreetMap' },
  legFireAge: 'Alter der Brände', legLess24: 'Weniger als 24 h', leg24_48: '24 bis 48 h', leg48_72: '48 bis 72 h',
  legLoss: 'Waldverlust', legErosion: 'Erosionsgefährdete Zone',
  legZones: 'Zonen des Schutzgebiets', legLandscapes: 'Landschaften', legMicro: 'Mikroeinzugsgebiete',
  retry: 'Erneut versuchen',
   theme: 'Ebene',

  tipFires: 'Erkannte Brände', tipHa: 'Entwaldete Fläche', tipErosion: 'Erosionsgefährdete Zonen',
  na: 'k. A.', keyFire: 'Brände', keyHa: 'Hektar entwaldet', unitHa: 'ha',
  popupTitle: 'Satellitenerkennung', popupAt: (d, h) => `${d} um ${h} UTC`,
  popupConf: 'Konfidenz', popupPower: 'Leistung', popupSat: 'Satellit',
  conf: { h: 'hoch', n: 'nominal', l: 'niedrig', na: 'k. A.' },

  allMadagascar: 'Ganz Madagaskar',
  defRegion: 'Region', defAP: 'Schutzgebiet ohne Namen', defCommune: 'Gemeinde ohne Namen',
  defLandscape: 'Landschaft ohne Namen', defMicro: 'Mikroeinzugsgebiet ohne Namen', defErosion: 'Erosionsgefährdete Zone',
  errFirms: 'FIRMS-Daten konnten nicht abgerufen werden.', errGfw: 'GFW-Warnungen konnten nicht abgerufen werden.',
  errErosion: 'Datei der erosionsgefährdeten Zonen nicht gefunden.',

  csvFires: ['datum', 'uhrzeit_utc', 'breitengrad', 'laengengrad', 'region', 'konfidenz', 'leistung_mw', 'satellit', 'tag_nacht'],
  csvHisto: ['datum', 'typ', 'name', 'anzahl_braende'],
  csvTypes: { country: 'Madagaskar', total: 'Gesamt', region: 'Region', ap: 'Schutzgebiet' },
};

const TEXT: Record<string, Txt> = { fr, mg, en, de };
const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', mg: 'fr-FR' };
const makeNf = (loc: string) => (n: number) => n.toLocaleString(loc);

/* =====================================================================
   TYPES & CONSTANTES
   ===================================================================== */

type Bbox = [number, number, number, number]; // minLon, minLat, maxLon, maxLat

type Zone = { nom: string; feature: any; bbox: Bbox };

type Feu = {
  lon: number;
  lat: number;
  t: number; // timestamp UTC (ms)
  date: string;
  heure: string;
  conf: 'l' | 'n' | 'h' | null;
  frp: number | null;
  sat: string;
  jn: string;
  age: number; // en heures
};

type Histo = Record<
  string,
  { total: number; regions: Record<string, number>; aps: Record<string, number> }
>;

type LigneMixte = {
  nom: string;
  feux?: number | null;
  ha?: number | null;
  ero?: number | null; // nombre de zones à risque d'érosion
  err?: boolean;
  on?: boolean;
  onClick?: () => void;
};

// Thème affiché : une seule case cochée à la fois (null = aucune)
type Theme = 'feux' | 'perte' | 'erosion' | null;
type ModeTri = 'feux' | 'perte' | 'erosion';

const TOUS = '__tous__';
const MADAGASCAR: L.LatLngBoundsExpression = [
  [-26, 42.3],
  [-11.5, 50.9],
];
const CLE_HISTO = 'pression_historique_feux_v1';
const RANG = { l: 1, n: 2, h: 3 } as const;

const rangAlerte = (c: string) => (c === 'high' ? 3 : c === 'nominal' ? 2 : 1);

// Perte annuelle de couvert (UMD/Hansen) : dernière année disponible chez GFW
const ANNEE_MIN = 2020;
const ANNEE_MAX = 2025; // à mettre à jour quand GFW publie l'année suivante
const ANNEES = Array.from({ length: ANNEE_MAX - ANNEE_MIN + 1 }, (_, i) => ANNEE_MIN + i);
type PerteAn = { annee: number; ha: number };

// Champ « nom » dans tes fichiers : paddi_paysage.geojson → "Paysage", paddi_mbv.geojson → "Nom"
// (mettre les mêmes valeurs dans api/gfw-perte.ts)
const CLE_NOM_PAYSAGE: string | null = 'Paysage';
const CLE_NOM_MBV: string | null = 'Nom';
const CANDIDATS_PAYSAGE = ['paysage', 'nom_paysage', 'nom', 'name'];
const CANDIDATS_MBV = ['nom', 'nom_mbv', 'mbv', 'name'];

// Zones à risque d'érosion : fichier de polygones à placer dans public/data/ (à adapter).
// Le champ « nom » est facultatif : sans lui, le libellé par défaut des traductions est utilisé.
const FICHIER_EROSION = '/data/zone_risque_erosion.geojson';
const CLE_NOM_EROSION = 'nom';

// Les libellés des fonds de carte sont dans les traductions (t.fonds)
const FONDS: Record<string, { url: string; attribution: string; apercu: string }> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    apercu: 'linear-gradient(135deg,#2c4a33,#7d8a52)',
  },
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    apercu: 'linear-gradient(135deg,#cfe3c0,#e8d9b0)',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    apercu: 'linear-gradient(135deg,#e9e2cf,#b7d1a0)',
  },
};

const couleurAge = (age: number) =>
  age <= 24 ? 'rgb(200,15,15)' : age <= 48 ? '#f97316' : '#facc15';

const COULEUR_PERTE = '#dc6c9a';
const COULEUR_EROSION = '#ea580c';

// Somme des hectares perdus entre deux années
const sommeAnnees = (rows: PerteAn[] | null, debut: number, fin: number) =>
  rows ? rows.filter((a) => a.annee >= debut && a.annee <= fin).reduce((s, a) => s + a.ha, 0) : null;

// Tri : selon le thème affiché (feux, hectares perdus ou zones d'érosion), puis par nom
const comparer = (mode: ModeTri) => (a: LigneMixte, b: LigneMixte) =>
  (mode === 'feux' ? (b.feux ?? 0) - (a.feux ?? 0) : mode === 'erosion' ? (b.ero ?? 0) - (a.ero ?? 0) : 0) ||
  (b.ha ?? -1) - (a.ha ?? -1) ||
  a.nom.localeCompare(b.nom, 'fr');

/* =====================================================================
   GÉOMÉTRIE
   ===================================================================== */

function parcourirPoints(coords: any, cb: (x: number, y: number) => void) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number') {
    cb(coords[0], coords[1]);
    return;
  }
  for (const c of coords) parcourirPoints(c, cb);
}

function bboxDe(geometry: any): Bbox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  parcourirPoints(geometry?.coordinates, (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  return [minX, minY, maxX, maxY];
}

function pointDansAnneau(lon: number, lat: number, anneau: number[][]) {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const xi = anneau[i][0],
      yi = anneau[i][1],
      xj = anneau[j][0],
      yj = anneau[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

function pointDansPolygone(lon: number, lat: number, geometry: any): boolean {
  if (!geometry) return false;
  const verifier = (poly: number[][][]) => {
    if (!pointDansAnneau(lon, lat, poly[0])) return false;
    for (let i = 1; i < poly.length; i++) {
      if (pointDansAnneau(lon, lat, poly[i])) return false; // trou
    }
    return true;
  };
  if (geometry.type === 'Polygon') return verifier(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(verifier);
  return false;
}

// Test rapide : boîte englobante d'abord, polygone ensuite
function dansZone(lon: number, lat: number, z: Zone) {
  const b = z.bbox;
  if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) return false;
  return pointDansPolygone(lon, lat, z.feature.geometry);
}

function boitesSeCroisent(a: Bbox, b: Bbox) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

/* Tampon de 5 km : calcul pur, rien n'est dessiné.
   Un point est « autour » d'une zone s'il est dedans ou à ≤ 5 km de l'un de ses bords. */
const TAMPON_KM = 5;

function distSegmentKm(lon: number, lat: number, x1: number, y1: number, x2: number, y2: number) {
  const kx = Math.cos((lat * Math.PI) / 180) * 111.32; // km par degré de longitude
  const ky = 110.574; // km par degré de latitude
  const ax = (x1 - lon) * kx, ay = (y1 - lat) * ky;
  const bx = (x2 - lon) * kx, by = (y2 - lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const u = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + u * dx, ay + u * dy);
}

function dansTampon(lon: number, lat: number, z: Zone, km = TAMPON_KM) {
  // 1. boîte englobante agrandie de 5 km (rejet rapide)
  const dLat = km / 110.574;
  const dLon = km / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const b = z.bbox;
  if (lon < b[0] - dLon || lon > b[2] + dLon || lat < b[1] - dLat || lat > b[3] + dLat) return false;
  // 2. à l'intérieur de l'aire protégée
  if (dansZone(lon, lat, z)) return true;
  // 3. distance au contour
  const g = z.feature.geometry;
  const polys: number[][][][] =
    g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' ? g.coordinates : [];
  for (const poly of polys) {
    for (const anneau of poly) {
      for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
        if (distSegmentKm(lon, lat, anneau[j][0], anneau[j][1], anneau[i][0], anneau[i][1]) <= km) return true;
      }
    }
  }
  return false;
}

// Une zone (aire protégée, périphérie) appartient à une région si l'un de ses
// sommets (ou le centre de sa boîte) tombe dans la région.
function zoneDansRegion(z: Zone, region: Zone) {
  if (!boitesSeCroisent(z.bbox, region.bbox)) return false;
  const points: number[][] = [];
  parcourirPoints(z.feature.geometry?.coordinates, (x, y) => points.push([x, y]));
  const pas = Math.max(1, Math.floor(points.length / 40));
  for (let i = 0; i < points.length; i += pas) {
    if (dansZone(points[i][0], points[i][1], region)) return true;
  }
  const cx = (z.bbox[0] + z.bbox[2]) / 2;
  const cy = (z.bbox[1] + z.bbox[3]) / 2;
  return dansZone(cx, cy, region);
}

// Champs de tes fichiers : paddi_mbv.geojson → "Aire_Prot" (aire protégée) et "Paysage"
const PROP_MBV_AIRE = 'Aire_Prot';
const PROP_MBV_PAYSAGE = 'Paysage';
// paddi_paysage.geojson → champ "Aires_Prot" (aire protégée du paysage)
const PROP_PAYSAGE_AIRE = 'Aires_Prot';

const normaliser = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Même nom, ou l'un contenu dans l'autre (ex. « Ankarana » et « Réserve spéciale d'Ankarana »)
const memeAire = (a: unknown, b: unknown) => {
  const x = normaliser(a);
  const y = normaliser(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
};

// Deux zones s'emboîtent ou se chevauchent (dans un sens ou dans l'autre)
function zoneAutour(z: Zone, conteneur: Zone) {
  return zoneDansRegion(z, conteneur) || zoneDansRegion(conteneur, z);
}

function compterParZone(feux: Feu[], zones: Zone[], unique = false) {
  const compte = new Array(zones.length).fill(0);
  for (const f of feux) {
    for (let i = 0; i < zones.length; i++) {
      if (dansZone(f.lon, f.lat, zones[i])) {
        compte[i]++;
        if (unique) break;
      }
    }
  }
  return compte as number[];
}

function preparerZones(data: any, cle: string, defaut: string): Zone[] {
  return (data?.features || [])
    .filter((f: any) => f?.geometry)
    .map((f: any) => ({
      nom: f.properties?.[cle] || defaut,
      feature: f,
      bbox: bboxDe(f.geometry),
    }));
}

/* =====================================================================
   DONNÉES FEUX
   ===================================================================== */

function trouverCleNom(features: any[], candidats: string[], force: string | null) {
  if (force) return force;
  const props = features.find((f) => f?.properties)?.properties || {};
  const cles = Object.keys(props);
  for (const c of candidats) {
    const k = cles.find((x) => x.toLowerCase() === c);
    if (k) return k;
  }
  return cles.find((k) => typeof props[k] === 'string') || '';
}

// Même logique côté serveur (api/gfw-perte.ts) : champ du nom + noms rendus uniques
function preparerZonesAuto(data: any, candidats: string[], force: string | null, defaut: string): Zone[] {
  const features = (data?.features || []).filter((f: any) => f?.geometry);
  const cle = trouverCleNom(features, candidats, force);
  const bruts: string[] = features.map((f: any) => String(f.properties?.[cle] ?? '').trim() || defaut);
  const total: Record<string, number> = {};
  bruts.forEach((n) => (total[n] = (total[n] || 0) + 1));
  const vus: Record<string, number> = {};
  return features.map((f: any, i: number) => {
    const n = bruts[i];
    vus[n] = (vus[n] || 0) + 1;
    return { nom: total[n] > 1 ? `${n} (${vus[n]})` : n, feature: f, bbox: bboxDe(f.geometry) };
  });
}

function niveauConfiance(c: any): 'l' | 'n' | 'h' | null {
  if (c == null || c === '') return null;
  if (typeof c === 'string' && Number.isNaN(Number(c))) {
    const v = c.toLowerCase();
    if (v.startsWith('h')) return 'h';
    if (v.startsWith('n')) return 'n';
    if (v.startsWith('l')) return 'l';
    return null;
  }
  const n = Number(c); // MODIS : 0-100
  return n >= 80 ? 'h' : n >= 30 ? 'n' : 'l';
}

function analyserFeux(features: any[]): Omit<Feu, 'age'>[] {
  const sortie: Omit<Feu, 'age'>[] = [];
  for (const f of features) {
    const p = f?.properties || {};
    const c = f?.geometry?.coordinates;
    if (!c || !p.acq_date || p.acq_time == null) continue;
    const h = String(p.acq_time).padStart(4, '0');
    const t = new Date(`${p.acq_date}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    const frp = Number(p.frp);
    sortie.push({
      lon: c[0],
      lat: c[1],
      t,
      date: p.acq_date,
      heure: `${h.slice(0, 2)}:${h.slice(2, 4)}`,
      conf: niveauConfiance(p.confidence),
      frp: Number.isFinite(frp) ? frp : null,
      sat: p.satellite ?? '',
      jn: p.daynight ?? '',
    });
  }
  return sortie;
}

// `actif` = false : le fichier n'est chargé que lorsqu'il est nécessaire (ex. thème « érosion »)
function useGeoJSONEtat(url: string, actif = true) {
  const [etat, setEtat] = useState<{ data: any; erreur: boolean }>({ data: null, erreur: false });
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url} introuvable`);
        return r.json();
      })
      .then((j) => vivant && setEtat({ data: j, erreur: false }))
      .catch((e) => {
        console.error(e);
        if (vivant) setEtat({ data: null, erreur: true });
      });
    return () => {
      vivant = false;
    };
  }, [url, actif]);
  return etat;
}

const useGeoJSON = (url: string) => useGeoJSONEtat(url).data;

/* =====================================================================
   HISTORIQUE MENSUEL (compteurs par jour, stockés dans le navigateur)
   ===================================================================== */

function lireHisto(): Histo {
  try {
    return JSON.parse(localStorage.getItem(CLE_HISTO) || '{}');
  } catch {
    return {};
  }
}

function ecrireHisto(h: Histo) {
  try {
    localStorage.setItem(CLE_HISTO, JSON.stringify(h));
  } catch (e) {
    console.error('Historique non enregistré', e);
  }
}

function telechargerCSV(nom: string, lignes: (string | number)[][]) {
  const csv =
    '\ufeff' +
    lignes
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/* =====================================================================
   COUCHES LEAFLET
   ===================================================================== */

function CoucheZones({
  zones,
  style,
  cle,
  onClick,
}: {
  zones: Zone[];
  style: (z: Zone) => L.PathOptions;
  cle: string; // change quand le style doit être recalculé
  onClick?: (z: Zone) => void;
}) {
  const map = useMap();
  const styleRef = useRef(style);
  const clickRef = useRef(onClick);
  styleRef.current = style;
  clickRef.current = onClick;

  useEffect(() => {
    if (!zones.length) return;
    const groupe = L.featureGroup();
    zones.forEach((z) => {
      const couche = L.geoJSON(z.feature, { style: () => styleRef.current(z) });
      if (z.nom) couche.bindTooltip(z.nom, { sticky: true });
      couche.on('click', () => clickRef.current?.(z));
      couche.addTo(groupe);
    });
    groupe.addTo(map);
    return () => {
      map.removeLayer(groupe);
    };
  }, [zones, cle, map]);

  return null;
}

function CoucheFeux({ feux, t, loc }: { feux: Feu[]; t: Txt; loc: string }) {
  const map = useMap();

  useEffect(() => {
    const rayon = (zoom: number) => Math.max(2.5, Math.min(9, 2 + (zoom - 5) * 0.75));
    const renderer = L.canvas({ padding: 0.5 });
    const groupe = L.featureGroup();

    feux.forEach((f) => {
      const m = L.circleMarker([f.lat, f.lon], {
        radius: rayon(map.getZoom()),
        fillColor: couleurAge(f.age),
        color: '#ffffff',
        weight: 0.6,
        opacity: 0.9,
        fillOpacity: 0.92,
        renderer,
      });
      m.bindPopup(() => {
        const conf = t.conf[f.conf ?? 'na'];
        const jr = new Date(f.t).toLocaleDateString(loc);
        return `<div style="font:13px/1.5 system-ui"><strong>${t.popupTitle}</strong><br/>
          ${t.popupAt(jr, f.heure)}<br/>
          ${t.popupConf} : ${conf}<br/>
          ${f.frp != null ? `${t.popupPower} : ${f.frp} MW<br/>` : ''}
          ${f.sat ? `${t.popupSat} : ${f.sat}` : ''}</div>`;
      });
      m.addTo(groupe);
    });
    groupe.addTo(map);

    const maj = () => {
      const r = rayon(map.getZoom());
      groupe.eachLayer((l) => l instanceof L.CircleMarker && l.setRadius(r));
    };
    map.on('zoomend', maj);
    return () => {
      map.off('zoomend', maj);
      map.removeLayer(groupe);
    };
  }, [feux, t, loc, map]);

  return null;
}

function FocusCarte({ zone, maxZoom }: { zone: Zone | null; maxZoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!zone) {
      map.fitBounds(MADAGASCAR, { padding: [10, 10] });
      return;
    }
    const b = L.geoJSON(zone.feature).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom });
  }, [zone, maxZoom, map]);
  return null;
}

// Couche GFW : zones de perte de couvert arboré pour la période choisie
function CouchePerte({ debut, fin }: { debut: number; fin: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('perte')) {
      const pane = map.createPane('perte');
      pane.style.zIndex = '250'; // au-dessus du fond de carte, sous les contours
      pane.style.pointerEvents = 'none';
    }
    const couche = L.tileLayer(
      `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=${debut}&end_year=${fin}&tcd=30&render_type=true_color`,
      { pane: 'perte', maxNativeZoom: 12, opacity: 0.95, attribution: 'Perte de couvert © UMD/Hansen, GFW' }
    ).addTo(map);
    return () => {
      map.removeLayer(couche);
    };
  }, [debut, fin, map]);
  return null;
}

// Voile clair sur tout ce qui est hors de la région / aire protégée choisie
// (le fond de carte reste clair dans les deux thèmes : le voile aussi)
function MasqueZone({ zone }: { zone: Zone }) {
  const map = useMap();
  useEffect(() => {
    const monde: L.LatLngTuple[] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
    const g = zone.feature.geometry;
    const polys: number[][][][] =
      g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const trous = polys.map((p) => p[0].map(([x, y]) => [y, x] as L.LatLngTuple));
    const couche = L.polygon([monde, ...trous], {
      stroke: false,
      fillColor: '#f1f4f7',
      fillOpacity: 0.82,
      interactive: false,
    });
    couche.addTo(map);
    return () => {
      map.removeLayer(couche);
    };
  }, [zone, map]);
  return null;
}

// Liste à une valeur par ligne selon le thème : nombre de feux, hectares déboisés ou zones d'érosion
function ListeMixte({
  items,
  vide,
  feux,
  perte,
  erosion,
  t,
  nf,
}: {
  items: LigneMixte[];
  vide: string;
  feux: boolean;
  perte: boolean;
  erosion: boolean;
  t: Txt;
  nf: (n: number) => string;
}) {
  if (!items.length) return <p className="pr-vide">{vide}</p>;
  return (
    <div className="pr-liste">
      {items.map((i) => {
        const contenu = (
          <>
            <span>{i.nom}</span>
            <span className="pr-vals">
              {feux && (
                <strong className="pr-v pr-v-feu" title={t.tipFires}>
                  {nf(i.feux ?? 0)}
                </strong>
              )}
              {perte && (
                <strong className="pr-v pr-v-ha" title={t.tipHa}>
                  {i.err ? t.na : i.ha == null ? '…' : `${nf(Math.round(i.ha))} ${t.unitHa}`}
                </strong>
              )}
              {erosion && (
                <strong className="pr-v pr-v-ero" title={t.tipErosion}>
                  {nf(i.ero ?? 0)}
                </strong>
              )}
            </span>
          </>
        );
        return i.onClick ? (
          <button key={i.nom} className={`pr-ligne pr-cliquable ${i.on ? 'on' : ''}`} onClick={i.onClick}>
            {contenu}
          </button>
        ) : (
          <div key={i.nom} className="pr-ligne">
            {contenu}
          </div>
        );
      })}
    </div>
  );
}

function Redimension() {
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

/* =====================================================================
   COMPOSANT PRINCIPAL
   ===================================================================== */

export default function Pression() {
  // ---- Langue
  const { lang } = useLanguage();
  const t: Txt = TEXT[lang as string] ?? TEXT.fr;
  const loc = LOCALES[lang as string] ?? 'fr-FR';
  const nf = useMemo(() => makeNf(loc), [loc]);

  // ---- Filtres
  const [region, setRegion] = useState(TOUS);
  const [ap, setAp] = useState(TOUS);
  const [periode, setPeriode] = useState<24 | 48 | 72>(72);
  const [confiance, setConfiance] = useState<'l' | 'n' | 'h'>('l');
  const [joursDef, setJoursDef] = useState<7 | 30 | 90>(30);
  const [anneeDebut, setAnneeDebut] = useState(ANNEE_MIN);
  const [anneeFin, setAnneeFin] = useState(ANNEE_MAX);

  // ---- Thème affiché (cases à cocher exclusives : une seule à la fois)
  const [theme, setTheme] = useState<Theme>('feux');
  const showFeux = theme === 'feux';
  const showPerte = theme === 'perte';
  const showErosion = theme === 'erosion';
  const choisirTheme = (th: Exclude<Theme, null>) => setTheme((cur) => (cur === th ? null : th));

  // ---- Interface
  const [fond, setFond] = useState('topo');
  const [menu, setMenu] = useState<null | 'fond' | 'couches' | 'export'>(null);
  const [couches, setCouches] = useState({
    regions: true,
    aires: true,
    peripheries: false,
    feux: true,
    perte: true,
    erosion: true,
    paysages: true,
    mbv: true,
  });

  // ---- Données géographiques
  const regionsData = useGeoJSON('/data/madagascar_24_region.geojson');
  const apData = useGeoJSON('/data/ap_terrestre_madagascar.geojson');
  const communesData = useGeoJSON('/data/madagascar_communes.json');
  const paysageData = useGeoJSON('/data/paddi_paysage.geojson');
  const mbvData = useGeoJSON('/data/paddi_mbv.geojson');
  const erosionEtat = useGeoJSONEtat(FICHIER_EROSION, showErosion); // chargé seulement pour ce thème

  const regionsZ = useMemo(() => preparerZones(regionsData, 'nom_reg', t.defRegion), [regionsData, t.defRegion]);
  const apZ = useMemo(() => preparerZones(apData, 'SHORT_NAME', t.defAP), [apData, t.defAP]);
  const communesZ = useMemo(
    () => preparerZones(communesData, 'NAME_4', t.defCommune),
    [communesData, t.defCommune]
  );
  const erosionZ = useMemo(
    () => preparerZones(erosionEtat.data, CLE_NOM_EROSION, t.defErosion),
    [erosionEtat.data, t.defErosion]
  );

  const paysagesZ = useMemo(
    () => preparerZonesAuto(paysageData, CANDIDATS_PAYSAGE, CLE_NOM_PAYSAGE, t.defLandscape),
    [paysageData, t.defLandscape]
  );
  const mbvZ = useMemo(
    () => preparerZonesAuto(mbvData, CANDIDATS_MBV, CLE_NOM_MBV, t.defMicro),
    [mbvData, t.defMicro]
  );

  // ---- Feux NASA FIRMS
  const [feuxBruts, setFeuxBruts] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false); // le message affiché vient des traductions (t.errFirms)
  const [derniereMaj, setDerniereMaj] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(Date.now());

  const chargerFeux = useCallback(async () => {
    try {
      setChargement(true);
      setErreur(false);
      const rep = await fetch('/api/firms');
      if (!rep.ok) throw new Error('FIRMS');
      const geojson = await rep.json();
      setFeuxBruts(Array.isArray(geojson.features) ? geojson.features : []);
      setDerniereMaj(Date.now());
    } catch (e) {
      console.error(e);
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerFeux();
    const rafraichir = setInterval(chargerFeux, 15 * 60 * 1000); // données : toutes les 15 min
    const horloge = setInterval(() => setMaintenant(Date.now()), 60 * 1000); // ancienneté : chaque minute
    return () => {
      clearInterval(rafraichir);
      clearInterval(horloge);
    };
  }, [chargerFeux]);

  const feux = useMemo(() => analyserFeux(feuxBruts), [feuxBruts]);

  // ---- Chaîne de filtrage ------------------------------------------------
  const feuxAges: Feu[] = useMemo(
    () =>
      feux
        .map((f) => ({ ...f, age: (maintenant - f.t) / 3.6e6 }))
        .filter((f) => f.age <= 72 && f.age >= -1),
    [feux, maintenant]
  );

  // 1. confiance
  const feuxConf = useMemo(
    () => feuxAges.filter((f) => RANG[f.conf ?? 'n'] >= RANG[confiance]),
    [feuxAges, confiance]
  );

  // 2. région
  const regionZone = useMemo(
    () => (region === TOUS ? null : regionsZ.find((z) => z.nom === region) || null),
    [region, regionsZ]
  );
  const feuxRegion = useMemo(
    () => (regionZone ? feuxConf.filter((f) => dansZone(f.lon, f.lat, regionZone)) : feuxConf),
    [feuxConf, regionZone]
  );

  // aires protégées et périphéries de la région choisie uniquement
  const apsVisibles = useMemo(() => {
    if (!regionZone) return apZ;
    const regionChoisie = normaliser(regionZone.nom);
    return apZ.filter((z) => {
      // Priorité au champ REGION du GeoJSON ; sinon, test géométrique
      const regionAP = normaliser(z.feature.properties?.REGION);
      return regionAP ? regionAP === regionChoisie : zoneDansRegion(z, regionZone);
    });
  }, [apZ, regionZone]);

  // 3. aire protégée
  const apZone = useMemo(
    () => (ap === TOUS ? null : apsVisibles.find((z) => z.nom === ap) || null),
    [ap, apsVisibles]
  );

  const feuxZone = useMemo(
  () => (apZone ? feuxRegion.filter((f) => dansTampon(f.lon, f.lat, apZone)) : feuxRegion),
  [feuxRegion, apZone]
);

  // Micro-bassins et paysages : affichés seulement quand une aire protégée est choisie.
  // Micro-bassins = ceux dont le champ "Aire_Prot" correspond à l'aire protégée
  // (à défaut, ceux qui la touchent) ; paysages = ceux de ces micro-bassins.
  const mbvVisibles = useMemo(() => {
    if (!apZone) return [];
    const parNom = mbvZ.filter((z) => memeAire(z.feature.properties?.[PROP_MBV_AIRE], apZone.nom));
    return parNom.length ? parNom : mbvZ.filter((z) => zoneAutour(z, apZone));
  }, [mbvZ, apZone]);

  const paysagesVisibles = useMemo(() => {
    if (!apZone) return [];
    // tous les paysages de l'aire protégée (champ "Aires_Prot") + ceux de ses micro-bassins
    const nomsMbv = new Set(
      mbvVisibles.map((z) => normaliser(z.feature.properties?.[PROP_MBV_PAYSAGE])).filter(Boolean)
    );
    const liste = paysagesZ.filter(
      (z) =>
        memeAire(z.feature.properties?.[PROP_PAYSAGE_AIRE], apZone.nom) ||
        nomsMbv.has(normaliser(z.feature.properties?.[CLE_NOM_PAYSAGE ?? 'Paysage']))
    );
    return liste.length ? liste : paysagesZ.filter((z) => zoneAutour(z, apZone));
  }, [paysagesZ, mbvVisibles, apZone]);

  // Zones à risque d'érosion : celles qui touchent l'aire protégée ou la région choisie
  const erosionVisibles = useMemo(() => {
    const cible = apZone || regionZone;
    return cible ? erosionZ.filter((z) => boitesSeCroisent(z.bbox, cible.bbox)) : erosionZ;
  }, [erosionZ, apZone, regionZone]);

  // Nombre de zones d'érosion qui touchent chaque aire protégée visible (thème « érosion » seulement)
  const comptesErosion = useMemo(() => {
    if (!showErosion || !erosionZ.length) return apsVisibles.map(() => 0);
    return apsVisibles.map(
      (a) => erosionZ.filter((z) => boitesSeCroisent(z.bbox, a.bbox) && zoneAutour(z, a)).length
    );
  }, [showErosion, erosionZ, apsVisibles]);

  // 4. période → ce qui est affiché sur la carte
  const feuxAffiches = useMemo(() => feuxZone.filter((f) => f.age <= periode), [feuxZone, periode]);
  const feuxRegionPeriode = useMemo(
    () => feuxRegion.filter((f) => f.age <= periode),
    [feuxRegion, periode]
  );

  // ---- Statistiques feux -------------------------------------------------
  const stats24 = feuxZone.filter((f) => f.age <= 24).length;
  const stats48 = feuxZone.filter((f) => f.age <= 48).length;
  const stats72 = feuxZone.length;

  const feuxPeriph = useMemo(() => {
  const cibles = apZone ? [apZone] : apsVisibles;
  return feuxAffiches.filter((f) => cibles.some((z) => dansTampon(f.lon, f.lat, z)));
}, [feuxAffiches, apZone, apsVisibles]);

  const topCommunes = useMemo(() => {
    if (!communesZ.length || !feuxAffiches.length) return [];
    const c = compterParZone(feuxAffiches, communesZ, true);
    return communesZ
      .map((z, i) => ({ nom: z.nom, nombre: c[i] }))
      .filter((x) => x.nombre > 0)
      .sort((a, b) => b.nombre - a.nombre)
      .slice(0, 3);
  }, [feuxAffiches, communesZ]);

  // Chronologie : un bloc toutes les 6 heures sur 72 h
  const chronologie = useMemo(() => {
    const blocs = new Array(12).fill(0);
    feuxZone.forEach((f) => {
      const i = Math.min(11, Math.max(0, Math.floor(f.age / 6)));
      blocs[i]++;
    });
    return blocs as number[]; // indice 0 = les 6 dernières heures
  }, [feuxZone]);

  // ---- Historique mensuel ------------------------------------------------
  const [nbJoursHisto, setNbJoursHisto] = useState(() => Object.keys(lireHisto()).length);

  useEffect(() => {
    if (!feux.length || !regionsZ.length || !apZ.length) return;

    const parJour: Record<string, Feu[]> = {};
    feux.forEach((f) => {
      (parJour[f.date] = parJour[f.date] || []).push(f as Feu);
    });

    const histo = lireHisto();
    for (const [jour, liste] of Object.entries(parJour)) {
      if (histo[jour] && histo[jour].total >= liste.length) continue;
      const cr = compterParZone(liste, regionsZ, true);
      const ca = compterParZone(liste, apZ);
      const regions: Record<string, number> = {};
      const aps: Record<string, number> = {};
      regionsZ.forEach((z, i) => cr[i] > 0 && (regions[z.nom] = cr[i]));
      apZ.forEach((z, i) => ca[i] > 0 && (aps[z.nom] = ca[i]));
      histo[jour] = { total: liste.length, regions, aps };
    }

    const limite = Date.now() - 31 * 864e5;
    Object.keys(histo).forEach((j) => {
      if (new Date(`${j}T00:00:00Z`).getTime() < limite) delete histo[j];
    });

    ecrireHisto(histo);
    setNbJoursHisto(Object.keys(histo).length);
  }, [feux, regionsZ, apZ]);

  const exporterVue = () => {
    const lignes: (string | number)[][] = [t.csvFires];
    feuxAffiches.forEach((f) => {
      const r = regionZone?.nom || regionsZ.find((z) => dansZone(f.lon, f.lat, z))?.nom || '';
      lignes.push([
        f.date,
        f.heure,
        f.lat,
        f.lon,
        r,
        f.conf ? t.conf[f.conf] : '',
        f.frp ?? '',
        f.sat,
        f.jn,
      ]);
    });
    telechargerCSV(`feux_vue_${new Date().toISOString().slice(0, 10)}.csv`, lignes);
    setMenu(null);
  };

  const exporterHistorique = () => {
    const histo = lireHisto();
    const lignes: (string | number)[][] = [t.csvHisto];
    Object.keys(histo)
      .sort()
      .forEach((jour) => {
        const h = histo[jour];
        lignes.push([jour, t.csvTypes.country, t.csvTypes.total, h.total]);
        Object.entries(h.regions).forEach(([n, v]) => lignes.push([jour, t.csvTypes.region, n, v]));
        Object.entries(h.aps).forEach(([n, v]) => lignes.push([jour, t.csvTypes.ap, n, v]));
      });
    telechargerCSV(`feux_historique_${new Date().toISOString().slice(0, 10)}.csv`, lignes);
    setMenu(null);
  };

  // ---- Actions -----------------------------------------------------------
  const choisirRegion = (nom: string) => {
    setRegion(nom);
    setAp(TOUS);
  };
  const filtresModifies =
    region !== TOUS || ap !== TOUS || periode !== 72 || confiance !== 'l' || joursDef !== 30 ||
    anneeDebut !== ANNEE_MIN || anneeFin !== ANNEE_MAX;
  const reinitialiser = () => {
    setRegion(TOUS);
    setAp(TOUS);
    setPeriode(72);
    setConfiance('l');
    setJoursDef(30);
    setAnneeDebut(ANNEE_MIN);
    setAnneeFin(ANNEE_MAX);
  };

  const nomsRegions = useMemo(
    () => Array.from(new Set(regionsZ.map((z) => z.nom))).sort((a, b) => a.localeCompare(b, 'fr')),
    [regionsZ]
  );
  const nomsAP = useMemo(
    () => Array.from(new Set(apsVisibles.map((z) => z.nom))).sort((a, b) => a.localeCompare(b, 'fr')),
    [apsVisibles]
  );

  const portee = apZone ? apZone.nom : region !== TOUS ? region : t.allMadagascar;
  const maxBloc = Math.max(1, ...chronologie);
  const heureMaj = derniereMaj
    ? new Date(derniereMaj).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
    : '—';

  // Texte de période affiché sous les titres des cartes (selon le thème choisi)
  const notePeriode = showFeux ? `${periode} h` : showPerte ? `${anneeDebut} – ${anneeFin}` : '';

  // ---- Déforestation : alertes GFW (une requête par région, 90 jours) -------
  const [alertes, setAlertes] = useState<any | null>(null);
  const [chargAlertes, setChargAlertes] = useState(false);
  const [erreurAlertes, setErreurAlertes] = useState(false); // message : t.errGfw

  useEffect(() => {
    if (!showPerte) return;
    const ctrl = new AbortController();
    setAlertes(null);
    setErreurAlertes(false);
    setChargAlertes(true);
    fetch(`/api/gfw?region=${encodeURIComponent(region === TOUS ? 'all' : region)}&jours=90`, {
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('GFW');
        return r.json();
      })
      .then((j) => setAlertes(j))
      .catch((e) => {
        if (e.name !== 'AbortError') {
          console.error(e);
          setErreurAlertes(true);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setChargAlertes(false);
      });
    return () => ctrl.abort();
  }, [showPerte, region]);

  const defStats = useMemo(() => {
    const toutes: any[] = alertes?.lignes || [];
    const lignes = toutes.filter((l) => rangAlerte(l.confiance) >= RANG[confiance]);
    const depuis = (j: number) => new Date(Date.now() - j * 864e5).toISOString().slice(0, 10);
    const somme = (j: number, cle: 'alertes' | 'ha') =>
      lignes.filter((l) => l.date >= depuis(j)).reduce((s, l) => s + (l[cle] || 0), 0);

    const jours: { date: string; n: number }[] = [];
    for (let i = joursDef - 1; i >= 0; i--) {
      const d = depuis(i);
      jours.push({ date: d, n: lignes.filter((l) => l.date === d).reduce((s, l) => s + l.alertes, 0) });
    }

    return {
      total: somme(joursDef, 'alertes'),
      p7: somme(7, 'alertes'),
      p30: somme(30, 'alertes'),
      p90: somme(90, 'alertes'),
      jours,
      maxJour: Math.max(1, ...jours.map((j) => j.n)),
    };
  }, [alertes, confiance, joursDef]);

  // ---- Déforestation : superficie perdue par année (GFW, depuis 2020) -------
  const [perte, setPerte] = useState<Record<string, PerteAn[] | 'err'>>({});
  const enCours = useRef(new Set<string>());

  useEffect(() => {
    if (!showPerte) return;
    const besoins: [string, string, string][] = [
      region === TOUS ? ['all', 'all', ''] : [`region:${region}`, 'region', region],
    ];
    apsVisibles.forEach((a) => besoins.push([`ap:${a.nom}`, 'ap', a.nom]));

    besoins.forEach(([cle, type, nom]) => {
      if (perte[cle] || enCours.current.has(cle)) return;
      enCours.current.add(cle);
      fetch(`/api/gfw-perte?type=${type}&nom=${encodeURIComponent(nom)}`)
        .then((r) => {
          if (!r.ok) throw new Error('GFW');
          return r.json();
        })
        .then((j) => setPerte((p) => ({ ...p, [cle]: j.annees as PerteAn[] })))
        .catch(() => setPerte((p) => ({ ...p, [cle]: 'err' })))
        .finally(() => enCours.current.delete(cle));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPerte, region, apsVisibles]);

  const defPerte = useMemo(() => {
    const lire = (cle: string) => (Array.isArray(perte[cle]) ? (perte[cle] as PerteAn[]) : null);
    const cleScope = apZone ? `ap:${apZone.nom}` : region === TOUS ? 'all' : `region:${region}`;
    const scope = lire(cleScope);

    const parAnnee: PerteAn[] = [];
    for (let a = anneeDebut; a <= anneeFin; a++) {
      parAnnee.push({ annee: a, ha: scope?.find((x) => x.annee === a)?.ha ?? 0 });
    }

    return {
      erreur: perte[cleScope] === 'err',
      total: sommeAnnees(scope, anneeDebut, anneeFin),
      parAnnee,
      maxAn: Math.max(1, ...parAnnee.map((a) => a.ha)),
      nbAnnees: anneeFin - anneeDebut + 1,
    };
  }, [perte, anneeDebut, anneeFin, apZone, region]);

  // ---- Liste des aires protégées : une valeur par ligne selon le thème ------
  const ligneDe = (z: Zone, feuxN: number, ero: number): LigneMixte => {
    const cle = `ap:${z.nom}`;
    const rows = Array.isArray(perte[cle]) ? (perte[cle] as PerteAn[]) : null;
    return {
      nom: z.nom,
      feux: feuxN,
      ero,
      ha: sommeAnnees(rows, anneeDebut, anneeFin),
      err: perte[cle] === 'err',
    };
  };

  /* Règle d'affichage :
     - une région est choisie  → on liste TOUTES les aires protégées de cette région ;
     - sinon, thème « feux »   → seulement les aires qui ont au moins un feu (période choisie) ;
     - sinon, thème « érosion » → seulement les aires touchées par une zone à risque ;
     - thème « déforestation »  → toutes les aires (les hectares perdus sont listés pour chacune).
     L'aire protégée sélectionnée reste toujours visible. */
  const modeTri: ModeTri = showFeux ? 'feux' : showErosion ? 'erosion' : 'perte';
  const filtreAPConcernees = region === TOUS && (showFeux || showErosion);

  const lignesAP = useMemo(() => {
    const c = compterParZone(feuxRegionPeriode, apsVisibles);
    return apsVisibles
      .map((z, i) => ligneDe(z, c[i], comptesErosion[i] ?? 0))
      .filter((l) => {
        if (!filtreAPConcernees || l.nom === ap) return true;
        return showFeux ? (l.feux ?? 0) > 0 : (l.ero ?? 0) > 0;
      })
      .sort(comparer(modeTri));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feuxRegionPeriode, apsVisibles, perte, anneeDebut, anneeFin, comptesErosion, filtreAPConcernees, showFeux, modeTri, ap]);

  // Message affiché quand la liste est vide
  const enChargement =
    !apZ.length ||
    (showFeux && chargement && !feux.length) ||
    (showErosion && !erosionEtat.data && !erosionEtat.erreur);
  const messageListeVide = enChargement
    ? t.loading
    : filtreAPConcernees && showFeux
      ? t.noAPFire
      : filtreAPConcernees && showErosion
        ? t.noAPErosion
        : t.noAP;

  // ---- Styles des zones sur la carte ------------------------------------
  // (le fond de carte reste clair dans les deux thèmes : ces couleurs sont conservées)
  const styleRegion = (z: Zone): L.PathOptions => {
    const sel = region !== TOUS && z.nom === region;
    return {
      color: sel ? '#0f766e' : '#475569',
      weight: sel ? 2.5 : region !== TOUS ? 0.6 : 1,
      fillColor: '#0f766e',
      fillOpacity: sel ? 0.14 : region !== TOUS ? 0 : 0.05,
    };
  };
  const styleAP = (z: Zone): L.PathOptions => {
    const sel = ap !== TOUS && z.nom === ap;
    return {
      color: sel ? '#052e16' : '#166534',
      weight: sel ? 2.5 : 1,
      fillColor: '#22c55e',
      fillOpacity: sel ? 0.36 : 0.2,
    };
  };

  const stylePaysage = (): L.PathOptions => ({
    color: '#6d28d9',
    weight: 2.5,
    fillColor: '#8b5cf6',
    fillOpacity: 0.06,
  });
  const styleMbv = (): L.PathOptions => ({
    color: '#0e7490',
    weight: 1.3,
    dashArray: '4 3',
    fillColor: '#22d3ee',
    fillOpacity: 0.16,
  });
  const styleErosion = (): L.PathOptions => ({
    color: '#9a3412',
    weight: 1,
    fillColor: COULEUR_EROSION,
    fillOpacity: 0.4,
  });

  // Les libellés viennent des traductions (t.layers)
  const optionsCouches: (keyof typeof couches)[] = [
    'feux', 'perte', 'erosion', 'paysages', 'mbv', 'regions', 'aires', 'peripheries',
  ];

  const lignesAPCliquables = lignesAP.map((a) => ({
    ...a,
    on: ap === a.nom,
    onClick: () => setAp(ap === a.nom ? TOUS : a.nom),
  }));

  const noteAP = [region === TOUS ? t.allRegions : region, notePeriode].filter(Boolean).join(' · ');

  /* ------------------------------------------------------------------ */

  return (
    <div className="pr">
      <style>{CSS}</style>

      {/* ============ EN-TÊTE + FILTRES ============ */}
      <header className="pr-top">
        <div className="pr-top-ligne">
          <div className="pr-marque">
            <div className="pr-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2c.6 3.2-1.4 4.6-2.8 6.4C7.6 10.4 7 12 8.2 13.8c.3-1.5 1.2-2.4 2.3-3 0 2.2 2.8 2.6 2.4 5.2-.2 1.2-.9 2-1.9 2.5 3.6.3 6.4-2.1 6.4-5.5 0-2.7-1.6-4.2-2.6-5.6C13.700 6 12.500 4.500 12 2Z" />
                <path d="M6.500 15.500C6 18.500 8.300 21 12 21c-3-.8-4.700-3-5.500-5.500Z" opacity=".55" />
              </svg>
            </div>
            <div>
              <h1 className="pr-titre">{t.title}</h1>
              <p className="pr-sous">{t.subtitle}</p>
            </div>
          </div>

          <div className="pr-actions">
            <span className={`pr-etat ${erreur ? 'err' : ''}`}>
              <i /> {chargement ? t.updating : erreur ? t.offline : t.dataAt(heureMaj)}
            </span>
            <button className="pr-btn" onClick={chargerFeux} disabled={chargement} title={t.refreshFires}>
              {t.refresh}
            </button>
            <div className="pr-menu-wrap">
              <button className="pr-btn pr-btn-plein" onClick={() => setMenu(menu === 'export' ? null : 'export')}>
                {t.export}
              </button>
              {menu === 'export' && (
                <div className="pr-pop pr-pop-droite">
                  <button className="pr-pop-item" onClick={exporterVue} disabled={!feuxAffiches.length}>
                    <strong>{t.exportView}</strong>
                    <span>{t.exportViewSub(nf(feuxAffiches.length))}</span>
                  </button>
                  <button className="pr-pop-item" onClick={exporterHistorique} disabled={!nbJoursHisto}>
                    <strong>{t.exportHisto}</strong>
                    <span>{nbJoursHisto ? t.exportHistoSub(nbJoursHisto) : t.exportHistoNone}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pr-filtres">
          {/* Colonne de gauche : une ligne par thème (une seule case cochée à la fois) */}
         <div className="pr-fgroupe pr-fgauche">
           <label className="pr-champ">
             <span>{t.theme}</span>
             <select
               value={theme ?? ''}
               onChange={(e) => setTheme((e.target.value || null) as Theme)}
             >
               <option value="">{t.noLayerTitle}</option>
               <option value="feux">{t.firePoints}</option>
               <option value="perte">{t.lossLayer}</option>
               <option value="erosion">{t.erosionLayer}</option>
             </select>
           </label>
         
           <div className="pr-fctl">
             {showFeux && (
               <div className="pr-inl">
                 <span>{t.period}</span>
                 <div className="pr-seg" role="group" aria-label={t.firePeriodAria}>
                   {([24, 48, 72] as const).map((h) => (
                     <button key={h} className={periode === h ? 'on' : ''} onClick={() => setPeriode(h)}>
                       {h} h
                     </button>
                   ))}
                 </div>
               </div>
             )}
         
             {(showFeux || showPerte) && (
               <div className="pr-inl">
                 <span>{t.reliability}</span>
                 <select value={confiance} onChange={(e) => setConfiance(e.target.value as 'l' | 'n' | 'h')}>
                   <option value="l">{t.confAll}</option>
                   <option value="n">{t.confNominal}</option>
                   <option value="h">{t.confHigh}</option>
                 </select>
               </div>
             )}
         
             {showPerte && (
               <>
                 <div className="pr-inl">
                   <span>{t.alerts}</span>
                   <div className="pr-seg" role="group" aria-label={t.alertsAria}>
                     {([7, 30, 90] as const).map((j) => (
                       <button key={j} className={joursDef === j ? 'on' : ''} onClick={() => setJoursDef(j)}>
                         {j} {lang === 'mg' ? 'andro' : lang === 'en' ? 'd' : lang === 'de' ? 'T.' : 'j'}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div className="pr-inl">
                   <span>{t.years}</span>
                   <div className="pr-annees">
                     <select
                       aria-label={t.yearFrom}
                       value={anneeDebut}
                       onChange={(e) => {
                         const v = Number(e.target.value);
                         setAnneeDebut(v);
                         if (v > anneeFin) setAnneeFin(v);
                       }}
                     >
                       {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                     </select>
                     <span>{t.to}</span>
                     <select
                       aria-label={t.yearTo}
                       value={anneeFin}
                       onChange={(e) => {
                         const v = Number(e.target.value);
                         setAnneeFin(v);
                         if (v < anneeDebut) setAnneeDebut(v);
                       }}
                     >
                       {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                     </select>
                   </div>
                 </div>
               </>
             )}
           </div>
         </div>

          {/* Colonne de droite : filtres géographiques */}
          <div className="pr-fdroite">
            <label className="pr-champ">
              <span>{t.region}</span>
              <select value={region} onChange={(e) => choisirRegion(e.target.value)}>
                <option value={TOUS}>{t.allRegions}</option>
                {nomsRegions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="pr-champ">
              <span>{t.protectedArea}</span>
              <select value={apZone ? ap : TOUS} onChange={(e) => setAp(e.target.value)}>
                <option value={TOUS}>
                  {region === TOUS ? t.allAPs : t.allAPsOfRegion}
                </option>
                {nomsAP.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            {filtresModifies && (
              <button className="pr-reset" onClick={reinitialiser}>
                {t.reset}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============ CORPS ============ */}
      <div className="pr-body">
        {/* ---------- PANNEAU DE STATISTIQUES ---------- */}
        <aside className="pr-panel">
          {!theme && (
            <section className="pr-attente-theme">
              <h2>{t.noLayerTitle}</h2>
              <p>{t.noLayerText}</p>
            </section>
          )}

          {theme && (
            <>
              {/* ---- Synthèse : un bloc selon le thème choisi ---- */}
              <section className="pr-hero">
                {showFeux && (
                  <div className="pr-hero-bloc">
                    <div className="pr-hero-haut">
                      <div className="pr-hero-nb">{nf(feuxAffiches.length)}</div>
                      <div className="pr-hero-txt">
                        <strong>{t.firesDetected}</strong>
                        <span>
                          {portee} · {t.lastHours(periode)}
                        </span>
                      </div>
                    </div>
                    <div className="pr-chrono" role="img" aria-label={t.chronoAria}>
                      {[...chronologie]
                        .map((n, i) => ({ n, i }))
                        .reverse()
                        .map(({ n, i }) => (
                          <div key={i} className="pr-chrono-col" title={t.chronoTip(n, i * 6, i * 6 + 6)}>
                            <div
                              className="pr-chrono-barre"
                              style={{
                                height: `${Math.max(4, (n / maxBloc) * 100)}%`,
                                background: couleurAge(i * 6 + 3),
                                opacity: i * 6 < periode ? 1 : 0.22,
                              }}
                            />
                          </div>
                        ))}
                    </div>
                    <div className="pr-chrono-legende">
                      <span>{t.ago72}</span>
                      <span>{t.now}</span>
                    </div>
                  </div>
                )}

                {showPerte && (
                  <div className="pr-hero-bloc perte">
                    <div className="pr-hero-haut">
                      <div className="pr-hero-nb">
                        {defPerte.erreur ? t.na : defPerte.total == null ? '…' : nf(Math.round(defPerte.total))}
                        {defPerte.total != null && <small>{t.unitHa}</small>}
                      </div>
                      <div className="pr-hero-txt">
                        <strong>{t.forestLost}</strong>
                        <span>
                          {portee} · {anneeDebut} – {anneeFin}
                        </span>
                      </div>
                    </div>
                    {erreurAlertes ? (
                      <p className="pr-vide">{t.errGfw}</p>
                    ) : (
                      <>
                        <div className="pr-chrono" role="img" aria-label={t.lossAria}>
                          {defStats.jours.map((j) => (
                            <div key={j.date} className="pr-chrono-col" title={t.lossTip(j.n, j.date)}>
                              <div
                                className="pr-chrono-barre"
                                style={{
                                  height: `${Math.max(4, (j.n / defStats.maxJour) * 100)}%`,
                                  background: COULEUR_PERTE,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="pr-chrono-legende">
                          <span>{t.alertsDays(chargAlertes ? '…' : nf(defStats.total), joursDef)}</span>
                          <span>{t.today}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {showErosion && (
                  <div className="pr-hero-bloc erosion">
                    <div className="pr-hero-haut">
                      <div className="pr-hero-nb">
                        {erosionEtat.erreur ? t.na : erosionEtat.data ? nf(erosionVisibles.length) : '…'}
                      </div>
                      <div className="pr-hero-txt">
                        <strong>{t.erosionZones}</strong>
                        <span>{portee}</span>
                      </div>
                    </div>
                    {erosionEtat.erreur && <p className="pr-vide">{t.errErosion}</p>}
                  </div>
                )}
              </section>

              <div className="pr-grille">
                {/* CARTE 1 : rythme récent (feux ou alertes de perte) */}
                {(showFeux || showPerte) && (
                  <article className="pr-carte c1">
                    <h2>{t.recentPace}</h2>
                    <p className="pr-note">{portee}</p>

                    {showFeux && (
                      <>
                        <h3 className="pr-sstitre">{t.firesTitle}</h3>
                        {[
                          [t.last24, stats24, 'rgb(200,15,15)'],
                          [t.last48, stats48, '#f97316'],
                          [t.last72, stats72, '#facc15'],
                        ].map(([label, val, col]) => (
                          <div className="pr-ligne-barre" key={label as string}>
                            <div className="pr-ligne">
                              <span>{label}</span>
                              <strong>{nf(val as number)}</strong>
                            </div>
                            <div className="pr-barre">
                              <i style={{ width: `${stats72 ? ((val as number) / stats72) * 100 : 0}%`, background: col as string }} />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {showPerte && (
                      <>
                        <h3 className="pr-sstitre">{t.lossAlertsTitle}</h3>
                        {[
                          [t.last7d, defStats.p7, 'rgb(200,15,15)'],
                          [t.last30d, defStats.p30, '#f97316'],
                          [t.last90d, defStats.p90, '#facc15'],
                        ].map(([label, val, col]) => (
                          <div className="pr-ligne-barre" key={label as string}>
                            <div className="pr-ligne">
                              <span>{label}</span>
                              <strong>{chargAlertes ? '…' : nf(val as number)}</strong>
                            </div>
                            <div className="pr-barre">
                              <i style={{ width: `${defStats.p90 ? ((val as number) / defStats.p90) * 100 : 0}%`, background: col as string }} />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </article>
                )}

                {/* CARTE 2 : aires protégées */}
                <article className="pr-carte c2">
                  <h2>{t.apTitle}</h2>
                  <p className="pr-note">{noteAP}</p>
                  {filtreAPConcernees && <p className="pr-note pr-note-filtre">{t.apOnlyConcerned}</p>}
                  <ListeMixte
                    items={lignesAPCliquables}
                    feux={showFeux}
                    perte={showPerte}
                    erosion={showErosion}
                    t={t}
                    nf={nf}
                    vide={messageListeVide}
                  />
                </article>

                {/* CARTE 5 : évolution annuelle de la perte */}
                {showPerte && (
                  <article className="pr-carte c5">
                    <h2>{t.yearlyTitle}</h2>
                    <p className="pr-note">
                      {t.haLostPerYear(portee)}
                      {defPerte.total != null && t.haPerYear(nf(Math.round(defPerte.total / defPerte.nbAnnees)))}
                    </p>
                    {defPerte.erreur ? (
                      <p className="pr-vide">{t.unavailable}</p>
                    ) : (
                      defPerte.parAnnee.map((a) => (
                        <div className="pr-ligne-barre" key={a.annee}>
                          <div className="pr-ligne">
                            <span>{a.annee}</span>
                            <strong>{defPerte.total == null ? '…' : `${nf(Math.round(a.ha))} ${t.unitHa}`}</strong>
                          </div>
                          <div className="pr-barre">
                            <i style={{ width: `${(a.ha / defPerte.maxAn) * 100}%`, background: COULEUR_PERTE }} />
                          </div>
                        </div>
                      ))
                    )}
                  </article>
                )}

                {/* CARTE 6 : périphéries de 5 km + communes */}
                {showFeux && (
                  <article className="pr-carte c6">
                    <h2>{t.aroundTitle}</h2>
                    <p className="pr-note">{t.periphNote(periode)}</p>
                    <div className="pr-grand">{nf(feuxPeriph.length)}</div>
                    <p className="pr-note">
                      {feuxAffiches.length
                        ? t.pctShown(Math.round((feuxPeriph.length / feuxAffiches.length) * 100))
                        : t.noFireShown}
                    </p>
                    <h3 className="pr-sstitre">{t.top3}</h3>
                    {topCommunes.length ? (
                      topCommunes.map((c, i) => (
                        <div className="pr-ligne-barre" key={c.nom + i}>
                          <div className="pr-ligne">
                            <span>
                              {i + 1}. {c.nom}
                            </span>
                            <strong>{nf(c.nombre)}</strong>
                          </div>
                          <div className="pr-barre">
                            <i style={{ width: `${(c.nombre / topCommunes[0].nombre) * 100}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="pr-vide">
                        {communesZ.length ? t.noFireZone : t.loading}
                      </p>
                    )}
                  </article>
                )}
              </div>
            </>
          )}
        </aside>

        {/* ---------- CARTE ---------- */}
        <main className="pr-map">
          <MapContainer
            bounds={MADAGASCAR}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas={true}
          >
            <TileLayer
              key={fond}
              url={FONDS[fond].url}
              attribution={FONDS[fond].attribution}
            />
            <ZoomControl position="bottomright" />
            <Redimension />
            <FocusCarte zone={apZone || regionZone} maxZoom={apZone ? 11 : 9} />

            {showPerte && couches.perte && <CouchePerte debut={anneeDebut} fin={anneeFin} />}
            {showPerte && couches.perte && (apZone || regionZone) && (
              <MasqueZone zone={(apZone || regionZone) as Zone} />
            )}
            {showErosion && couches.erosion && (
              <CoucheZones zones={erosionVisibles} style={styleErosion} cle={`ero|${region}|${ap}`} />
            )}
            {couches.regions && (
              <CoucheZones zones={regionsZ} style={styleRegion} cle={region} onClick={(z) => choisirRegion(z.nom)} />
            )}
            {couches.paysages && <CoucheZones zones={paysagesVisibles} style={stylePaysage} cle="paysages" />}
            {couches.mbv && <CoucheZones zones={mbvVisibles} style={styleMbv} cle="mbv" />}
             
            {couches.aires && (
              <CoucheZones
                zones={apsVisibles}
                style={styleAP}
                cle={`${region}|${ap}`}
                onClick={(z) => setAp(z.nom === ap ? TOUS : z.nom)}
              />
            )}
            {showFeux && couches.feux && <CoucheFeux feux={feuxAffiches} t={t} loc={loc} />}
          </MapContainer>

          {/* Barre d'outils : fond de carte + couches */}
          <div className="pr-outils">
            <div className="pr-menu-wrap">
              <button className="pr-outil" onClick={() => setMenu(menu === 'fond' ? null : 'fond')}>
                <span className="pr-apercu" style={{ background: FONDS[fond].apercu }} />
                {t.fonds[fond as keyof Txt['fonds']]}
              </button>
              {menu === 'fond' && (
                <div className="pr-pop pr-pop-droite">
                  {Object.entries(FONDS).map(([id, f]) => (
                    <button
                      key={id}
                      className={`pr-pop-item pr-pop-fond ${fond === id ? 'on' : ''}`}
                      onClick={() => {
                        setFond(id);
                        setMenu(null);
                      }}
                    >
                      <span className="pr-apercu grand" style={{ background: f.apercu }} />
                      <strong>{t.fonds[id as keyof Txt['fonds']]}</strong>
                      {fond === id && <span className="pr-fond-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pr-menu-wrap">
              <button className="pr-outil" onClick={() => setMenu(menu === 'couches' ? null : 'couches')}>
                {t.layersBtn}
              </button>
              {menu === 'couches' && (
                <div className="pr-pop pr-pop-droite">
                  {optionsCouches
                    .filter((id) =>
                      id === 'feux' ? showFeux : id === 'perte' ? showPerte : id === 'erosion' ? showErosion : true
                    )
                    .map((id) => (
                    <label key={id} className="pr-check">
                      <input
                        type="checkbox"
                        checked={couches[id]}
                        onChange={() => setCouches((c) => ({ ...c, [id]: !c[id] }))}
                      />
                      <span>{t.layers[id]}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {menu && <div className="pr-voile" onClick={() => setMenu(null)} />}

          {/* Légendes : empilées en bas à gauche selon le thème affiché */}
          {((showFeux && couches.feux) || (showPerte && couches.perte) || (showErosion && couches.erosion)) && (
            <div className="pr-legendes">
              {showFeux && couches.feux && (
                <div className="pr-legende">
                  <strong>{t.legFireAge}</strong>
                  <div><i style={{ background: 'rgb(200,15,15)' }} />{t.legLess24}</div>
                  <div><i style={{ background: '#f97316' }} />{t.leg24_48}</div>
                  <div><i style={{ background: '#facc15' }} />{t.leg48_72}</div>
                </div>
              )}
              {showPerte && couches.perte && (
                <div className="pr-legende">
                  <strong>{t.legLoss}</strong>
                  <div>
                    <i style={{ background: COULEUR_PERTE }} />
                    {anneeDebut} {t.to} {anneeFin}
                  </div>
                </div>
              )}
              {showErosion && couches.erosion && (
                <div className="pr-legende">
                  <strong>{t.legErosion}</strong>
                  <div>
                    <i style={{ background: 'rgba(234,88,12,.4)', border: '2px solid #9a3412', boxShadow: 'none', borderRadius: 3 }} />
                    {t.legErosion}
                  </div>
                </div>
              )}
            </div>
          )}

          {apZone && (couches.paysages || couches.mbv) && (
            <div className="pr-legende pr-legende-zones">
              <strong>{t.legZones}</strong>
              {couches.paysages && (
                <div>
                  <i style={{ background: 'rgba(139,92,246,.3)', border: '2px solid #6d28d9', boxShadow: 'none', borderRadius: 3 }} />
                  {t.legLandscapes}
                </div>
              )}
              {couches.mbv && (
                <div>
                  <i style={{ background: 'rgba(34,211,238,.3)', border: '2px dashed #0e7490', boxShadow: 'none', borderRadius: 3 }} />
                  {t.legMicro}
                </div>
              )}
            </div>
          )}

          {showFeux && erreur && (
            <div className="pr-alerte">
              {t.errFirms}
              <button onClick={chargerFeux}>{t.retry}</button>
            </div>
          )}
          {showErosion && erosionEtat.erreur && <div className="pr-alerte">{t.errErosion}</div>}
        </main>
      </div>
    </div>
  );
}

/* =====================================================================
   STYLES (media queries impossibles en inline → feuille de style locale)
   ===================================================================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600&display=swap');

/* =====================================================================
   PALETTE — pour changer l'ambiance, modifier uniquement ces deux blocs
   (clair par défaut, puis surcharges du thème sombre)
   ===================================================================== */
.pr{
  --fond-panneau:#f1f4f7;               /* mettre "transparent" pour reprendre le fond de l'application */
  --fond-entete:rgba(255,255,255,.95);
  --carte:#ffffff;
  --ligne:#e2e8f0;
  --txt:#0f172a;
  --mut:#64748b;
  --rouge:rgb(200,15,15);
  --vert:#166534;
  --perte:#db2777;                      /* couleur des pastilles « perte de couvert » */
  --erosion:#c2410c;                    /* couleur du thème « zone à risque d'érosion » */

  /* couleurs d'interface (boutons, champs, survols…) */
  --champ-bg:#ffffff;
  --champ-bord:#cbd5e1;
  --hover:#f1f5f9;
  --track:#e2e8f0;
  --txt2:#334155;
  --txt3:#475569;
  --dis-bg:#f1f5f9;
  --dis-txt:#94a3b8;
  --sel-feu:#fef2f2;
  --sel-perte:#fdf2f8;
  --sel-ero:#fff7ed;
  --sel-ap:#dcfce7;
  --sel-fond:#fee2e2;
  --glass:rgba(255,255,255,.92);
  --pop-bg:#ffffff;
  --pop-bord:rgba(15,23,42,.12);
  --btn-plein-bg:#0f172a;
  --btn-plein-txt:#ffffff;
  --btn-plein-hover:#1e293b;
  --alerte-bg:#fff1f1;
  --alerte-txt:rgb(160,10,10);
  --alerte-bord:#f5b5b5;
  --leaflet-bg:#e5e7eb;
  --c-ap:#166534;
  --c-periph:#b45309;

  --titre:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;
  --corps:'Figtree','Segoe UI',system-ui,sans-serif;

  height:100%;width:100%;display:flex;flex-direction:column;
  background:transparent;color:var(--txt);font-family:var(--corps);
  font-size:14px;overflow:hidden;box-sizing:border-box;
}

/* ---- Thème sombre ---- */
:root[data-theme="dark"] .pr{
  --fond-panneau:var(--bg);
  --fond-entete:rgba(17,26,46,.95);
  --carte:var(--surface);
  --ligne:rgba(255,255,255,.12);
  --txt:#e5e7eb;
  --mut:#94a3b8;
  --rouge:#ef4444;
  --vert:#4ade80;
  --perte:#f472b6;
  --erosion:#fb923c;

  --champ-bg:#16213a;
  --champ-bord:rgba(255,255,255,.2);
  --hover:rgba(255,255,255,.07);
  --track:rgba(255,255,255,.14);
  --txt2:#cbd5e1;
  --txt3:#b6bfcc;
  --dis-bg:rgba(255,255,255,.05);
  --dis-txt:#64748b;
  --sel-feu:rgba(239,68,68,.16);
  --sel-perte:rgba(244,114,182,.16);
  --sel-ero:rgba(251,146,60,.16);
  --sel-ap:rgba(74,222,128,.14);
  --sel-fond:rgba(239,68,68,.2);
  --glass:rgba(17,26,46,.92);
  --pop-bg:#16213a;
  --pop-bord:rgba(255,255,255,.15);
  --btn-plein-bg:#e5e7eb;
  --btn-plein-txt:#0f172a;
  --btn-plein-hover:#ffffff;
  --alerte-bg:rgba(239,68,68,.18);
  --alerte-txt:#fca5a5;
  --alerte-bord:rgba(248,113,113,.4);
  --leaflet-bg:#1b2740;
  --c-ap:#4ade80;
  --c-periph:#f59e0b;
}

.pr *{box-sizing:border-box}
.pr button,.pr select,.pr input{font-family:inherit}
.pr button:focus-visible,.pr select:focus-visible,.pr input:focus-visible{outline:2px solid var(--rouge);outline-offset:2px}

/* ---- En-tête ---- */
.pr-top{background:var(--fond-entete);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border-bottom:1px solid var(--ligne);padding:12px 18px;position:relative;z-index:20}
.pr-top-ligne{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pr-marque{display:flex;align-items:center;gap:12px;min-width:0}
.pr-logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(160deg,rgb(200,15,15),#e8601c);flex:none}
.pr-titre{margin:0;font-family:var(--titre);font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.1}
.pr-sous{margin:2px 0 0;font-size:12px;color:var(--mut)}
.pr-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pr-etat{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);margin-right:4px}
.pr-etat i{width:8px;height:8px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.18)}
.pr-etat.err i{background:var(--rouge);box-shadow:0 0 0 3px rgba(200,15,15,.2)}
.pr-btn{padding:8px 14px;border-radius:9px;border:1px solid var(--champ-bord);background:var(--champ-bg);color:var(--txt);
  font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.pr-btn:hover:not(:disabled){background:var(--hover)}
.pr-btn:disabled{opacity:.55;cursor:default}
.pr-btn-plein{background:var(--btn-plein-bg);color:var(--btn-plein-txt);border-color:var(--btn-plein-bg)}
.pr-btn-plein:hover:not(:disabled){background:var(--btn-plein-hover)}

.pr-filtres{display:flex;gap:10px 32px;align-items:flex-start;flex-wrap:wrap;margin-top:12px}
/* Deux groupes à lignes alignées : [thème + ses réglages] | [filtres] */
.pr-fgroupe{display:grid;grid-auto-rows:36px;gap:8px 14px;align-items:center}
.pr-fgauche{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 18px}
.pr-fgauche .pr-fctl{height:36px}
.pr-fgauche .pr-champ select{min-width:220px;max-width:280px}
.pr-fdroite{display:flex;align-items:flex-end;gap:12px;margin-left:auto}
.pr-fdroite select{height:36px;padding:0 10px}
.pr-fdroite .pr-reset{height:36px}
.pr-fctl{display:flex;align-items:center;gap:18px;min-width:0}
.pr-inl{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap;font-size:12px;color:var(--mut);font-weight:500}
.pr-fgauche .pr-inl>span:first-child{min-width:46px}
.pr-fgroupe select{height:36px;padding:0 10px;border-radius:9px;border:1px solid var(--champ-bord);background:var(--champ-bg);color:var(--txt);
  font-size:13px;min-width:140px;max-width:210px;cursor:pointer}
.pr-fgroupe select:disabled{background:var(--dis-bg);color:var(--dis-txt);cursor:not-allowed}
.pr-fgroupe .pr-annees select{min-width:84px}
.pr-fgroupe .pr-seg button{height:34px;padding:0 14px}
.pr-fgroupe .pr-chk,.pr-fgroupe .pr-reset{height:36px}
.pr-champ{display:flex;flex-direction:column;gap:4px;min-width:0}
.pr-champ>span{font-size:12px;color:var(--mut);font-weight:500}
.pr-champ select{padding:8px 10px;border-radius:9px;border:1px solid var(--champ-bord);background:var(--champ-bg);
  color:var(--txt);font-size:13px;min-width:170px;max-width:260px;cursor:pointer}
.pr-champ select:disabled{background:var(--dis-bg);color:var(--dis-txt);cursor:not-allowed}
.pr-seg{display:flex;border:1px solid var(--champ-bord);border-radius:9px;overflow:hidden;background:var(--champ-bg)}
.pr-seg button{padding:8px 14px;border:0;background:transparent;color:var(--txt3);font-size:13px;cursor:pointer;font-weight:600}
.pr-seg button+button{border-left:1px solid var(--champ-bord)}
.pr-seg button.on{background:var(--rouge);color:#fff}
.pr-seg button:disabled{color:var(--dis-txt);background:var(--dis-bg);cursor:not-allowed}
.pr-reset{padding:8px 12px;border-radius:9px;border:1px dashed var(--mut);background:transparent;color:var(--txt);
  font-size:13px;font-weight:600;cursor:pointer}
.pr-reset:hover{border-color:var(--rouge);color:var(--rouge)}

/* ---- Cases à cocher des thèmes (exclusives) ---- */
.pr-checks{display:flex;gap:6px;flex-wrap:wrap}
.pr-chk{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid var(--champ-bord);border-radius:9px;
  background:var(--champ-bg);font-size:13px;font-weight:600;color:var(--txt);cursor:pointer;white-space:nowrap}
.pr-chk input{accent-color:var(--rouge);width:15px;height:15px;margin:0;cursor:inherit}
.pr-chk.on{border-color:var(--rouge);background:var(--sel-feu)}
.pr-chk.perte input{accent-color:var(--perte)}
.pr-chk.perte.on{border-color:var(--perte);background:var(--sel-perte)}
.pr-chk.erosion input{accent-color:var(--erosion)}
.pr-chk.erosion.on{border-color:var(--erosion);background:var(--sel-ero)}
.pr-chk.off{opacity:.55;cursor:not-allowed;background:var(--dis-bg)}

/* ---- Corps ---- */
.pr-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(440px,56%) 1fr}
.pr-panel{overflow-y:auto;padding:16px;background:var(--fond-panneau);border-right:1px solid var(--ligne)}
.pr-map{position:relative;min-height:0;min-width:0;isolation:isolate}

/* ---- Synthèse : un bloc selon le thème choisi ---- */
.pr-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:14px}
.pr-hero-bloc{--a:var(--rouge);background:var(--carte);border:1px solid var(--ligne);border-left:5px solid var(--a);
  border-radius:14px;padding:16px;min-width:0;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.pr-hero-bloc.perte{--a:var(--perte)}
.pr-hero-bloc.erosion{--a:var(--erosion)}
.pr-hero-haut{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
.pr-hero-nb{font-family:var(--titre);font-weight:800;font-size:clamp(36px,4.4vw,56px);line-height:.9;
  color:var(--a);letter-spacing:-.03em;overflow-wrap:anywhere}
.pr-hero-nb small{font-size:.38em;font-weight:700;margin-left:6px;letter-spacing:0}
.pr-hero-txt{display:flex;flex-direction:column;gap:2px;padding-bottom:4px;min-width:0}
.pr-hero-txt strong{font-family:var(--titre);font-size:16px;color:var(--txt);line-height:1.2}
.pr-hero-txt span{color:var(--mut);font-size:12.5px}
.pr-chrono{display:flex;align-items:flex-end;gap:4px;height:60px;margin-top:14px}
.pr-chrono-col{flex:1;height:100%;display:flex;align-items:flex-end}
.pr-chrono-barre{width:100%;border-radius:4px 4px 2px 2px;transition:height .3s,opacity .2s}
.pr-chrono-legende{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--mut);margin-top:6px}

.pr-attente-theme{background:var(--carte);border:1px dashed var(--mut);border-radius:14px;padding:22px}
.pr-attente-theme h2{margin:0 0 8px;font-family:var(--titre);font-size:18px}
.pr-attente-theme p{margin:0;color:var(--mut);line-height:1.5}

/* ---- Grille 2 colonnes : une couleur par carte ---- */
.pr-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.pr-carte{--accent:var(--txt3);background:var(--carte);border:1px solid var(--ligne);border-top:4px solid var(--accent);
  border-radius:12px;padding:14px;min-width:0;display:flex;flex-direction:column;
  box-shadow:0 1px 3px rgba(15,23,42,.06)}
.pr-carte.c1{--accent:var(--rouge)}     /* rythme récent : rouge */
.pr-carte.c2{--accent:var(--c-ap)}      /* aires protégées : vert forêt */
.pr-carte.c3{--accent:#8b5cf6}          /* paysages : violet (comme sur la carte) */
.pr-carte.c4{--accent:#0e7490}          /* micro-bassins : cyan (comme sur la carte) */
.pr-carte.c5{--accent:var(--perte)}     /* évolution de la perte : rose */
.pr-carte.c6{--accent:var(--c-periph)}  /* périphéries & communes : ocre */
.pr-carte h2{margin:0;font-family:var(--titre);font-size:15px;font-weight:700;color:var(--txt);line-height:1.25}
.pr-sstitre{margin:10px 0 6px;font-size:12px;font-weight:700;color:var(--txt2)}
.pr-note{margin:3px 0 10px;font-size:11.5px;color:var(--mut)}
.pr-note-filtre{margin-top:-4px;font-style:italic}
.pr-carte-attente{background:var(--dis-bg);border-style:dashed;border-top-style:solid}
.pr-vide{margin:auto 0;padding:8px 0;font-size:12.5px;color:var(--mut);font-style:italic}
.pr-ligne{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;padding:5px 0;color:var(--txt2)}
.pr-ligne span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-ligne strong{font-variant-numeric:tabular-nums;color:var(--txt)}
.pr-ligne .pr-vals{flex:none;display:flex;gap:12px;overflow:visible}
.pr-v{display:inline-flex;align-items:center;font-variant-numeric:tabular-nums;white-space:nowrap}
.pr-v::before{content:'';width:7px;height:7px;border-radius:50%;margin-right:5px;flex:none;background:var(--p)}
.pr-v-feu{--p:var(--rouge)}
.pr-v-ha{--p:#dc6c9a}
.pr-v-ero{--p:var(--erosion)}
.pr-ligne-barre{margin-bottom:8px}
.pr-barre.fine{height:4px;margin-top:3px}
.pr-barre{height:6px;border-radius:3px;background:var(--track);overflow:hidden}
.pr-barre i{display:block;height:100%;border-radius:3px;background:var(--accent);transition:width .3s}
.pr-grand{font-family:var(--titre);font-weight:800;font-size:40px;color:var(--accent);line-height:1.05}
.pr-liste{max-height:220px;overflow-y:auto;margin:0 -6px;padding:0 6px}
.pr-cliquable{width:100%;border:0;background:transparent;color:var(--txt2);cursor:pointer;text-align:left;
  padding:6px 8px;margin:1px 0;border-radius:8px}
.pr-cliquable:hover{background:var(--hover)}
.pr-cliquable.on{background:var(--sel-ap);outline:1px solid var(--accent)}

/* ---- Outils sur la carte ---- */
.pr-outils{position:absolute;top:12px;right:12px;z-index:1010;display:flex;gap:8px}
.pr-menu-wrap{position:relative}
.pr-outil{display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:10px;
  border:1px solid var(--pop-bord);background:var(--glass);backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);color:var(--txt);font-size:13px;font-weight:700;cursor:pointer;
  box-shadow:0 2px 8px rgba(0,0,0,.15)}
.pr-outil:hover{background:var(--pop-bg)}
.pr-apercu{width:18px;height:18px;border-radius:5px;border:1px solid rgba(15,23,42,.25);flex:none}
.pr-apercu.grand{width:36px;height:36px;border-radius:8px}
.pr-pop{position:absolute;top:calc(100% + 8px);z-index:1020;min-width:245px;background:var(--pop-bg);
  border:1px solid var(--pop-bord);border-radius:12px;padding:7px;box-shadow:0 8px 28px rgba(0,0,0,.18)}
.pr-pop-droite{right:0}
.pr-pop-item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:10px;border:0;
  border-radius:8px;background:transparent;color:var(--txt);cursor:pointer;font-size:13px;font-weight:600}
.pr-pop-item span{color:var(--mut);font-weight:500}
.pr-pop-item:hover:not(:disabled){background:var(--hover)}
.pr-pop-item:disabled{opacity:.5;cursor:default}
.pr-top .pr-pop-item{flex-direction:column;align-items:flex-start;gap:2px}
.pr-pop-fond{min-height:55px}
.pr-top .pr-pop-fond{flex-direction:row;align-items:center}
.pr-pop-fond.on{background:var(--sel-fond);outline:1px solid var(--rouge)}
.pr-pop .pr-fond-check{margin-left:auto;color:var(--rouge);font-size:17px;font-weight:800}
.pr-check{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;
  font-size:13px;font-weight:600;color:var(--txt)}
.pr-check:hover{background:var(--hover)}
.pr-check input{accent-color:var(--rouge);width:16px;height:16px}
.pr-voile{position:absolute;inset:0;z-index:1005;background:transparent}

/* ---- Légendes & messages sur la carte ---- */
.pr-legendes{position:absolute;left:12px;bottom:12px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.pr-legende{position:absolute;left:12px;bottom:12px;z-index:1000;padding:11px 14px;border-radius:12px;
  background:var(--glass);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid var(--pop-bord);font-size:12px;font-weight:600;display:flex;flex-direction:column;
  gap:7px;box-shadow:0 3px 12px rgba(0,0,0,.15)}
.pr-legendes .pr-legende{position:static}
.pr-legende.pr-legende-zones{top:12px;bottom:auto}
.pr-legende div{display:flex;align-items:center;gap:8px;color:var(--txt2)}
.pr-legende strong{color:var(--txt)}
.pr-legende i{width:11px;height:11px;border-radius:50%;border:1px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.35);flex:none}
.pr-alerte{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:1000;display:flex;gap:10px;
  align-items:center;padding:9px 13px;border-radius:10px;background:var(--alerte-bg);color:var(--alerte-txt);
  font-size:12.5px;font-weight:700;border:1px solid var(--alerte-bord);box-shadow:0 2px 8px rgba(0,0,0,.12)}
.pr-alerte button{border:0;background:rgb(200,15,15);color:#fff;border-radius:6px;padding:5px 9px;cursor:pointer;font-weight:700}

.pr .leaflet-container{background:var(--leaflet-bg);font-family:var(--corps)}
.pr .leaflet-tooltip{background:var(--pop-bg);color:var(--txt);border:1px solid var(--mut);border-radius:5px;
  box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:13px;font-weight:700;padding:5px 8px}
.pr .leaflet-tooltip-top:before,.pr .leaflet-tooltip-bottom:before{display:none}

/* ---- Tablette & mobile : la carte passe au-dessus, la page défile ---- */
@media (max-width:1023px){
  .pr{overflow-y:auto;overflow-x:hidden}
  .pr-top{position:sticky;top:0}
  .pr-body{display:flex;flex-direction:column;flex:none;min-height:auto}
  .pr-map{order:-1;height:56vh;min-height:320px;flex:none}
  .pr-panel{overflow:visible;border-right:0}
  .pr-filtres{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .pr-champ,.pr-reset,.pr-fgroupe,.pr-fdroite{flex:none}
}
@media (max-width:639px){
  .pr-top{padding:10px 12px}
  .pr-sous,.pr-etat{display:none}
  .pr-titre{font-size:18px}
  .pr-panel{padding:12px}
  .pr-grille{grid-template-columns:1fr}
  .pr-hero{grid-template-columns:1fr}
  .pr-map{height:50vh}
  .pr-legende{font-size:11px;padding:8px 10px}
  .pr-outil{padding:7px 10px}
}
.pr-annees{display:flex;align-items:center;gap:6px}
.pr-annees>span{font-size:13px;color:var(--mut)}
.pr-champ .pr-annees select{min-width:84px}
@media (prefers-reduced-motion:reduce){
  .pr *{transition:none !important}
}

`;
