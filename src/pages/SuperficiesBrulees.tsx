import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapContainer, TileLayer, ScaleControl, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, PieChart, Pie, Cell, Label, Legend,
} from 'recharts';
import { Flame, Target, Calendar, MapPin, Landmark, FileSpreadsheet, RotateCcw } from 'lucide-react';

/* =====================================================================
   TEXTES
   ===================================================================== */
const TEXT: any = {
  fr: {
    pageTitle: "Suivi des feux dans la périphérie de 5 km des aires protégées",
    pageSub: "Évolution des superficies brûlées par rapport à la référence 2020-2024",
    year: 'Année', region: 'Région', protectedArea: 'Aire protégée',
    allRegions: 'Toutes les régions', allProtectedAreas: 'Toutes', reset: 'Réinitialiser',
    indicator: "Indicateur : les superficies brûlées ont diminué de 25 % d’ici 2030 dans les zones en périphérie des aires protégées sélectionnées.",
    targetRate: 'Taux d’atteinte de la cible', targetReached: 'de la cible atteinte',
    reference: 'Référence (2020-2024)', burnedArea: 'Superficie', variation: 'Variation',
    objective2030: 'Objectif 2030 (-25 %)',
    annualEvolution: "Évolution multi-annuelle de l’indicateur",
    annualSubtitle: "Variation (%) des superficies brûlées par rapport à la référence (2020-2024)",
    targetLine: 'Objectif : -25 %', burnedVariation: 'Variation des superficies brûlées (%)',
    mapTitle: 'Superficies brûlées en périphérie des aires protégées',
    comparison: 'Comparaison multi-annuelle des 7 aires protégées',
    comparisonHint: 'Touchez un code pour afficher ou masquer une courbe',
    legend: 'Légende', protectedLegend: 'Aire protégée', basemap: 'Fond de carte',
    topo: 'Topographique', sat: 'Satellite', noData: 'Pas de données', trajectory: 'Trajectoire attendue', ranking: 'Classement des aires protégées', rankingSub: 'Variation par rapport à la référence · repère noir à -25 %', remaining: 'Reste à réduire', apsReached: 'Aires ayant atteint la cible', reached: 'Cible atteinte', onTrack: 'En bonne voie', toReinforce: 'À renforcer', late: 'En retard',
    footer: 'Analyse détaillée par aire protégée, commune et micro-bassin versant',
    dashboard: 'Tableaux de bord PADDI.xlsx', ahead: 'au-delà', delay: 'de retard',
  },
  mg: {
    pageTitle: "Fanaraha-maso ny doro tanety ao anatin’ny 5 km manodidina ny Faritra Arovana",
    pageSub: "Fivoaran’ny velaran-tany may raha oharina amin’ny taona fototra 2020-2024",
    year: 'Taona', region: 'Faritra', protectedArea: 'Faritra arovana',
    allRegions: 'Faritra rehetra', allProtectedAreas: 'Rehetra', reset: 'Avereno',
    indicator: "Mari-pamantarana: Hihena 25% ny velaran-tany may hatramin'ny taona 2030 eny amin'ny faritra 5 km manodidina ireo Faritra Arovana voafantina.",
    targetRate: "Tahan'ny fahatratrarana ny tanjona", targetReached: "amin'ny tanjona tratra",
    reference: 'Taona fototra (2020-2024)', burnedArea: 'Velarana', variation: 'Fiovana',
    objective2030: 'Tanjona 2030 (-25%)',
    annualEvolution: 'Fivoarana isan-taona ny mari-pamantarana',
    annualSubtitle: "Fiovan'ny (%) velaran-tany may raha oharina amin'ny taona fototra (2020-2024)",
    targetLine: 'Tanjona: -25%', burnedVariation: "Fiovan'ny velaran-tany may (%)",
    mapTitle: "Sarintanin'ny velaran-tany may manodidina ny faritra arovana",
    comparison: "Fampitahana isan-taona ny faritra arovana 7",
    comparisonHint: 'Tsindrio ny kaody mba haseho na afenina ny tsipika',
    legend: 'Maribolana', protectedLegend: 'Faritra arovana', basemap: 'Sarintany fototra',
    topo: 'Topografika', sat: 'Zanabolana', noData: 'Tsy misy angona', trajectory: 'Làlana andrasana', ranking: 'Laharan’ny faritra arovana', rankingSub: 'Fiovana raha oharina amin’ny fototra · tondro mainty amin’ny -25%', remaining: 'Mbola hotsaraina', apsReached: 'Faritra tratra ny tanjona', reached: 'Tanjona tratra', onTrack: 'Eo am-pandrosoana', toReinforce: 'Ilaina ny fanamafisana', late: 'Tara',
    footer: "Famakafakana amin'ny antsipiriany isaky ny Faritra Arovana, Kaominina ary mikro-basinina",
    dashboard: 'Takelaka PADDI.xlsx', ahead: 'mihoatra ny tanjona', delay: 'tara',
  },
  en: {
    pageTitle: 'Fire monitoring within the 5 km buffer around protected areas',
    pageSub: 'Burned-area trend compared with the 2020-2024 baseline',
    year: 'Year', region: 'Region', protectedArea: 'Protected area',
    allRegions: 'All regions', allProtectedAreas: 'All', reset: 'Reset',
    indicator: 'Indicator: burned areas are reduced by 25% by 2030 within the 5 km buffer around the selected protected areas.',
    targetRate: 'Target achievement rate', targetReached: 'of the target achieved',
    reference: 'Baseline (2020-2024)', burnedArea: 'Burned area', variation: 'Variation',
    objective2030: '2030 target (-25%)',
    annualEvolution: 'Multi-year evolution of the indicator',
    annualSubtitle: 'Variation (%) of burned areas compared with the baseline (2020-2024)',
    targetLine: 'Target: -25%', burnedVariation: 'Burned area variation (%)',
    mapTitle: 'Burned areas around protected areas',
    comparison: 'Multi-year comparison of the 7 protected areas',
    comparisonHint: 'Tap a code to show or hide a line',
    legend: 'Legend', protectedLegend: 'Protected area', basemap: 'Basemap',
    topo: 'Topographic', sat: 'Satellite', noData: 'No data', trajectory: 'Expected trajectory', ranking: 'Protected-area ranking', rankingSub: 'Variation vs baseline · black marker at -25%', remaining: 'Left to reduce', apsReached: 'Areas that reached the target', reached: 'Target reached', onTrack: 'On track', toReinforce: 'Needs effort', late: 'Behind',
    footer: 'Detailed analysis by protected area, municipality and micro-watershed',
    dashboard: 'PADDI Dashboard.xlsx', ahead: 'ahead', delay: 'behind schedule',
  },
  de: {
    pageTitle: 'Brandüberwachung im 5-km-Puffer um Schutzgebiete',
    pageSub: 'Entwicklung der verbrannten Flächen gegenüber der Referenz 2020-2024',
    year: 'Jahr', region: 'Region', protectedArea: 'Schutzgebiet',
    allRegions: 'Alle Regionen', allProtectedAreas: 'Alle', reset: 'Zurücksetzen',
    indicator: 'Indikator: Die verbrannte Fläche soll bis 2030 im 5-km-Puffer der ausgewählten Schutzgebiete um 25 % sinken.',
    targetRate: 'Zielerreichung', targetReached: 'des Ziels erreicht',
    reference: 'Referenz (2020-2024)', burnedArea: 'Verbrannte Fläche', variation: 'Veränderung',
    objective2030: 'Ziel 2030 (-25 %)',
    annualEvolution: 'Mehrjährige Entwicklung des Indikators',
    annualSubtitle: 'Veränderung (%) der verbrannten Flächen gegenüber der Referenz (2020-2024)',
    targetLine: 'Ziel: -25 %', burnedVariation: 'Veränderung der verbrannten Fläche (%)',
    mapTitle: 'Karte der verbrannten Flächen um Schutzgebiete',
    comparison: 'Mehrjähriger Vergleich der 7 Schutzgebiete',
    comparisonHint: 'Kürzel antippen, um eine Linie ein- oder auszublenden',
    legend: 'Legende', protectedLegend: 'Schutzgebiet', basemap: 'Hintergrundkarte',
    topo: 'Topografisch', sat: 'Satellit', noData: 'Keine Daten', trajectory: 'Erwarteter Verlauf', ranking: 'Rangliste der Schutzgebiete', rankingSub: 'Veränderung ggü. Referenz · schwarze Marke bei -25 %', remaining: 'Noch zu reduzieren', apsReached: 'Schutzgebiete mit erreichtem Ziel', reached: 'Ziel erreicht', onTrack: 'Auf Kurs', toReinforce: 'Nachsteuern', late: 'Im Rückstand',
    footer: 'Detaillierte Analyse nach Schutzgebiet, Gemeinde und Mikroeinzugsgebiet',
    dashboard: 'PADDI-Dashboard.xlsx', ahead: 'über dem Ziel', delay: 'Rückstand',
  },
};

/* =====================================================================
   CONSTANTES
   ===================================================================== */
const ANNEES = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
const BASELINE_YEARS = [2020, 2021, 2022, 2023, 2024];
const VALID_ANTENNES = ['Tanà', "Amoron'i Mania", 'Boeny', 'Diana', 'Atsimo-Atsinanana', 'Anosy'];
const DEFAULT_YEAR = 2026;
const MADAGASCAR: L.LatLngBoundsExpression = [[-26, 42.3], [-11.5, 50.9]];

const FONDS: any = {
  topo: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
};

const AP_LIST = [
  { code: 'MDA', nom: "Montagne d'Ambre", color: '#16a34a' },
  { code: 'ANK', nom: 'Ankarana', color: '#0d9488' },
  { code: 'ANLM', nom: 'Analamerana', color: '#84cc16' },
  { code: 'AKF', nom: 'Ankarafantsika', color: '#f59e0b' },
  { code: 'ADH', nom: 'Andohahela', color: '#ef4444' },
  { code: 'MDS', nom: 'Befotaka-Midongy', color: '#9333ea' },
  { code: 'MLB', nom: 'Marolambo', color: '#2563eb' },
];
const AP_CODE: Record<string, string> = Object.fromEntries(AP_LIST.map((a) => [a.nom, a.code]));

const COULEUR_ANTENNE: Record<string, string> = {
  'Tanà': '#16a34a', Boeny: '#2563eb', 'Atsimo-Atsinanana': '#f59e0b', Diana: '#ef4444', Anosy: '#8b5cf6',
};
const getColorByAntenne = (a: string) => COULEUR_ANTENNE[a] || '#64748b';

const statutDe = (reduction: number, has: boolean) =>
  !has ? 'nodata' : reduction >= 25 ? 'reached' : reduction >= 15 ? 'onTrack' : reduction >= 5 ? 'toReinforce' : 'late';
const ST: any = {
  reached: { k: 'reached', c: '#1d4ed8', bg: '#dbeafe', bar: '#2563eb' },
  onTrack: { k: 'onTrack', c: '#15803d', bg: '#dcfce7', bar: '#16a34a' },
  toReinforce: { k: 'toReinforce', c: '#b45309', bg: '#fef3c7', bar: '#f59e0b' },
  late: { k: 'late', c: '#b91c1c', bg: '#fee2e2', bar: '#dc2626' },
  nodata: { k: 'noData', c: '#64748b', bg: '#f1f5f9', bar: '#cbd5e1' },
};

const num = (v: any) => Number(String(v ?? 0).replace(',', '.')) || 0;
const fr1 = (v: number) => Number(v ?? 0).toFixed(1).replace('.', ',');
const formatHa = (v: number) =>
  Number(v ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ha';

/* =====================================================================
   COUCHES LEAFLET
   ===================================================================== */
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

// Un seul composant de zoom : l'aire protégée choisie, sinon les régions affichées
function FocusCarte({ geoData, apData, selectedAP }: any) {
  const map = useMap();
  useEffect(() => {
    let cible: any = null;
    let maxZoom = 10;
    if (selectedAP && apData?.features) {
      const f = apData.features.find((x: any) => x.properties?.nom_ap === selectedAP);
      if (f) { cible = f; maxZoom = 12; }
    }
    if (!cible && geoData?.features?.length) cible = geoData;
    if (!cible) { map.fitBounds(MADAGASCAR, { padding: [10, 10] }); return; }
    const b = L.geoJSON(cible).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [24, 24], maxZoom, animate: true });
  }, [geoData, apData, selectedAP, map]);
  return null;
}

function GeoLayer({ data, style, labels }: { data: any; style: any; labels?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!data?.features?.length) return;
    const layer = L.geoJSON(data, {
      style,
      onEachFeature: (f: any, l: any) => {
        const nom = f.properties?.nom_ap;
        if (labels && nom) l.bindTooltip(nom, { permanent: true, direction: 'center', className: 'sbr-ap-label' });
      },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [data, map, style, labels]);
  return null;
}

/* =====================================================================
   COMPOSANT PRINCIPAL
   ===================================================================== */
export default function SuperficiesBrulees({ data }: any) {
  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.fr;

  const [selectedAntenne, setSelectedAntenne] = useState('');
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [selectedAP, setSelectedAP] = useState('');
  const [fond, setFond] = useState<'topo' | 'sat'>('topo');
  const [hidden, setHidden] = useState<string[]>([]);

  const [regionsData, setRegionsData] = useState<any>(null);
  const [aireProtegeeData, setAireProtegeeData] = useState<any>(null);
  const [feuxData, setFeuxData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/data/madagascar_24_region.geojson')
      .then((r) => { if (!r.ok) throw new Error('GeoJSON introuvable'); return r.json(); })
      .then(setRegionsData).catch(console.error);
    fetch('/data/aire_protegee_paddi.geojson').then((r) => r.json()).then(setAireProtegeeData).catch(console.error);
    fetch('/data/Bases_Feux.geojson').then((r) => r.json())
      .then((d) => setFeuxData(d.features.map((f: any) => f.properties))).catch(console.error);
  }, []);

  /* ---------- Tableau virtuel : baseline, variation, taux d'atteinte ---------- */
  const tableauVirtuel = useMemo(() => {
    if (!feuxData.length) return [];
    const data5km = feuxData.filter((d: any) => d.Source === '5km');
    const aps = ['', ...new Set<string>(data5km.map((d: any) => d.AP))]; // '' = toutes les AP
    const table: any[] = [];

    aps.forEach((ap) => {
      const dataAP = ap === '' ? data5km : data5km.filter((d: any) => d.AP === ap);
      const somme = (an: number) =>
        dataAP.filter((d: any) => Number(d['Année']) === an).reduce((s: number, d: any) => s + num(d.Total), 0);
      const baseline = BASELINE_YEARS.reduce((s, an) => s + somme(an), 0) / BASELINE_YEARS.length;

      ANNEES.forEach((an) => {
        const lignes = dataAP.filter((d: any) => Number(d['Année']) === an);
        const hasData = lignes.length > 0;
        const superficie = somme(an);
        const ok = hasData && baseline !== 0;
        const variation = ok ? ((superficie - baseline) / baseline) * 100 : 0;
        const reduction = ok ? ((baseline - superficie) / baseline) * 100 : 0;

        table.push({
          AP: ap, Annee: an, HasData: hasData,
          Baseline: baseline, Objectif2030: baseline * 0.75, Superficie: superficie,
          Variation: variation, Reduction: reduction,
          TauxAtteinte2030: Math.max(0, Math.min((reduction / 25) * 100, 100)),
          EcartCible: reduction - 25,
        });
      });
    });
    return table;
  }, [feuxData]);

  const donutKPI = useMemo(
    () =>
      tableauVirtuel.find(
        (d) => String(d.AP).trim() === String(selectedAP).trim() && Number(d.Annee) === Number(selectedYear)
      ) ?? { HasData: false, Baseline: 0, Objectif2030: 0, Superficie: 0, Variation: 0, Reduction: 0, TauxAtteinte2030: 0, EcartCible: 0 },
    [tableauVirtuel, selectedAP, selectedYear]
  );

  const evolution = useMemo(
    () =>
      tableauVirtuel
        .filter((d) => String(d.AP).trim() === String(selectedAP).trim())
        .map((d) => ({ annee: Number(d.Annee), valeur: d.HasData ? -d.Reduction : null, cible: -25, traj: Number(d.Annee) >= 2025 ? -(25 / 6) * (Number(d.Annee) - 2024) : null }))
        .sort((a, b) => a.annee - b.annee),
    [tableauVirtuel, selectedAP]
  );

  const comparisonData = useMemo(
    () =>
      ANNEES.map((an) => {
        const ligne: any = { annee: an };
        tableauVirtuel
          .filter((d) => Number(d.Annee) === an && d.AP !== '' && d.HasData)
          .forEach((d) => {
            const code = AP_CODE[d.AP];
            if (code) ligne[code] = Number(d.Variation ?? 0);
          });
        return ligne;
      }),
    [tableauVirtuel]
  );

  /* ---------- Classement des 7 aires protégées pour l'année choisie ---------- */
  const apRows = useMemo(
    () =>
      AP_LIST.map((a) => {
        const d = tableauVirtuel.find((x) => x.AP === a.nom && Number(x.Annee) === Number(selectedYear));
        const has = !!d?.HasData;
        const reduction = has ? d.Reduction : 0;
        return { ...a, has, reduction, variation: has ? d.Variation : 0, statut: statutDe(reduction, has) };
      }).sort((a, b) => (b.has ? b.reduction : -999) - (a.has ? a.reduction : -999)),
    [tableauVirtuel, selectedYear]
  );
  const nbAtteintes = apRows.filter((r) => r.statut === 'reached').length;
  const choisirAP = (nom: string) => {
    setSelectedAntenne('');
    setSelectedAP(selectedAP === nom ? '' : nom);
  };

  /* ---------- Filtres géographiques ---------- */
  const antennes = useMemo(
    () =>
      regionsData?.features
        ? VALID_ANTENNES.filter((a) => regionsData.features.some((f: any) => f.properties?.antenne === a))
        : [],
    [regionsData]
  );

  const geoFiltered = useMemo(() => {
    if (!regionsData?.features) return null;
    return {
      type: 'FeatureCollection',
      features: regionsData.features.filter(
        (f: any) => f.properties?.actif && (!selectedAntenne || f.properties?.antenne === selectedAntenne)
      ),
    };
  }, [regionsData, selectedAntenne]);

  const aireProtegeeFiltered = useMemo(() => {
    if (!aireProtegeeData?.features) return null;
    return {
      type: 'FeatureCollection',
      features: aireProtegeeData.features.filter(
        (f: any) =>
          (!selectedAntenne || f.properties?.antenne === selectedAntenne) &&
          (!selectedAP || f.properties?.nom_ap === selectedAP)
      ),
    };
  }, [aireProtegeeData, selectedAntenne, selectedAP]);

  const apList = useMemo(() => {
    if (!aireProtegeeData?.features) return [];
    return aireProtegeeData.features
      .filter((f: any) => !selectedAntenne || f.properties?.antenne === selectedAntenne)
      .map((f: any) => f.properties?.nom_ap)
      .filter(Boolean);
  }, [aireProtegeeData, selectedAntenne]);

  // Styles stables (évite de recréer les couches Leaflet à chaque rendu)
  const styleRegion = useMemo(
    () => (f: any) => ({ color: '#fff', weight: 1, fillColor: getColorByAntenne(f.properties?.antenne), fillOpacity: 0.6 }),
    []
  );
  const styleAP = useMemo(() => ({ color: '#fff', weight: 0.8, fillColor: '#22c55e', fillOpacity: 0.35 }), []);

  const changeAntenne = (v: string) => { setSelectedAntenne(v); setSelectedAP(''); };
  const filtresModifies = selectedYear !== DEFAULT_YEAR || !!selectedAntenne || !!selectedAP;
  const resetFilters = () => { setSelectedYear(DEFAULT_YEAR); setSelectedAntenne(''); setSelectedAP(''); };

  /* ---------- Valeurs d'affichage ---------- */
  const kpiValue = donutKPI.TauxAtteinte2030 ?? 0;
  const ecartCible = donutKPI.EcartCible ?? 0;
  const variation = Number(donutKPI.Variation ?? 0);
  const donutColor = variation <= -25 ? '#2563eb' : variation <= -15 ? '#16a34a' : variation <= -5 ? '#f59e0b' : '#dc2626';
  const dataDonut = [{ name: 'atteint', value: kpiValue }, { name: 'reste', value: Math.max(0, 100 - kpiValue) }];
  const portee = selectedAP || selectedAntenne || t.allRegions;
  const toggleSerie = (code: string) =>
    setHidden((h) => (h.includes(code) ? h.filter((x) => x !== code) : [...h, code]));

  /* =====================================================================
     RENDU
     ===================================================================== */
  return (
    <div className="sbr">
      <div className="sbr-in">
      <style>{CSS}</style>

      {/* ============ EN-TÊTE + FILTRES (même structure que Pression) ============ */}
      <header className="sbr-top">
        <div className="sbr-top-ligne">
          <div className="sbr-marque">
            <div className="sbr-logo" aria-hidden="true"><Flame size={20} /></div>
            <div>
              <h1 className="sbr-titre">{t.pageTitle}</h1>
              <p className="sbr-sous">{t.pageSub}</p>
            </div>
          </div>

        <div className="sbr-filtres">
          <label className="sbr-champ">
            <span><Calendar size={13} /> {t.year}</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <label className="sbr-champ">
            <span><MapPin size={13} /> {t.region}</span>
            <select value={selectedAntenne} onChange={(e) => changeAntenne(e.target.value)}>
              <option value="">{t.allRegions}</option>
              {antennes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <label className="sbr-champ">
            <span><Landmark size={13} /> {t.protectedArea}</span>
            <select value={selectedAP} onChange={(e) => setSelectedAP(e.target.value)}>
              <option value="">{t.allProtectedAreas}</option>
              {apList.map((ap: string) => <option key={ap} value={ap}>{ap}</option>)}
            </select>
          </label>

          {filtresModifies && (
            <button className="sbr-reset" onClick={resetFilters}>
              <RotateCcw size={13} /> {t.reset}
            </button>
          )}
        </div>
        </div>
      </header>

      {/* ============ CORPS : panneau à gauche, carte pleine hauteur à droite ============ */}
      <div className="sbr-body">
        <aside className="sbr-panel">
          <div className="sbr-grid">
          <div className="sbr-banner">
            <Target size={22} color="#16a34a" style={{ flex: 'none' }} />
            <p>{t.indicator}</p>
          </div>

          {/* KPI : donut + synthèse */}
          <section className="sbr-carte">
            <h2>{t.targetRate}</h2>
            <p className="sbr-note">{portee} · {selectedYear}{!donutKPI.HasData && ` · ${t.noData}`}</p>
            <div className="sbr-kpi">
              <div className="sbr-kpi-haut">
                <div className="sbr-stats-col">
                  <div className="sbr-tuile"><span>{t.reference}</span><strong>{formatHa(donutKPI.Baseline)}</strong></div>
                  <div className="sbr-tuile"><span>{t.burnedArea} {selectedYear}</span><strong>{formatHa(donutKPI.Superficie)}</strong></div>
                  <div className="sbr-tuile"><span>{t.objective2030}</span><strong>{formatHa(donutKPI.Objectif2030)}</strong></div>
                </div>

                <div className="sbr-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataDonut} innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270}
                           dataKey="value" stroke="none" isAnimationActive={false}>
                        <Cell fill={donutColor} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="sbr-donut-centre">
                    <strong style={{ color: donutColor }}>{fr1(kpiValue)} %</strong>
                    <span>{t.targetReached}</span>
                    {ecartCible !== 0 && (
                      <em style={{ color: ecartCible > 0 ? '#2563eb' : '#dc2626' }}>
                        {ecartCible > 0 ? `+${fr1(ecartCible)} % ${t.ahead}` : `${fr1(Math.abs(ecartCible))} % ${t.delay}`}
                      </em>
                    )}
                  </div>
                </div>
              </div>

              <div className="sbr-stats-bas">
                <div className="sbr-tuile">
                  <span>{t.variation}</span>
                  <strong style={{ color: variation <= 0 ? '#16a34a' : '#dc2626' }}>{fr1(variation)} %</strong>
                </div>
                <div className="sbr-tuile">
                  <span>{t.remaining}</span>
                  <strong>{donutKPI.HasData ? formatHa(Math.max(0, donutKPI.Superficie - donutKPI.Objectif2030)) : '—'}</strong>
                </div>
                {!selectedAP && (
                  <div className="sbr-tuile"><span>{t.apsReached}</span><strong>{nbAtteintes} / {AP_LIST.length}</strong></div>
                )}
              </div>
            </div>
          </section>

          {/* Évolution */}
          <section className="sbr-carte">
            <h2>{t.annualEvolution}</h2>
            <p className="sbr-note">{t.annualSubtitle}</p>
            <div className="sbr-graph">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 18, right: 24, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} padding={{ left: 12, right: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[
                      (m: number) => Math.floor(Math.min(m, -30) / 5) * 5,
                      (m: number) => Math.ceil(Math.max(m, 0) / 5) * 5,
                    ]}
                  />
                  <Tooltip formatter={(v: any) => `${fr1(v)} %`} labelFormatter={(l) => `${t.year} ${l}`} />
                  <ReferenceLine y={-25} stroke="#16a34a" strokeDasharray="5 5"
                    label={{ value: t.targetLine, position: 'insideBottomLeft', fill: '#15803d', fontSize: 11 }} />
                  <Line type="linear" dataKey="traj" name={t.trajectory} stroke="#64748b" strokeWidth={2}
                        strokeDasharray="6 4" dot={false} connectNulls />
                  <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="valeur" name={t.burnedVariation} stroke="#c80f0f"
                        strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false}
                        label={({ x, y, value }: any) =>
                          value == null || Number(value) === 0 ? null : (
                            <text x={x} y={y - 9} fontSize={10} fontWeight={700} fill="#111827" textAnchor="middle">
                              {fr1(value)}%
                            </text>
                          )} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Comparaison des 7 AP, légende cliquable */}
          <section className="sbr-carte">
            <h2>{t.comparison}</h2>
            <p className="sbr-note">{t.comparisonHint}</p>
            <div className="sbr-chips">
              {AP_LIST.map((a) => (
                <button key={a.code} title={a.nom}
                        className={`sbr-chip ${hidden.includes(a.code) ? 'off' : ''}`}
                        onClick={() => toggleSerie(a.code)}>
                  <i style={{ background: a.color }} />
                  <b>{a.code}</b> {a.nom}
                </button>
              ))}
            </div>
            <div className="sbr-graph sbr-graph-grand">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 10, right: 24, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} padding={{ left: 12, right: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v)}%`} domain={['auto', 'auto']}>
                    <Label value="Variation (%)" angle={-90} position="insideLeft"
                           style={{ textAnchor: 'middle', fontSize: 11, fontWeight: 600, fill: '#475569' }} />
                  </YAxis>
                  <Tooltip formatter={(v: any) => `${fr1(v)} %`} labelFormatter={(l) => `${t.year} ${l}`} />
                  <ReferenceLine y={-25} stroke="#dc2626" strokeDasharray="5 5"
                    label={{ value: t.targetLine, position: 'insideBottomLeft', fill: '#dc2626', fontSize: 11 }} />
                  {AP_LIST.filter((a) => !hidden.includes(a.code)).map((a) => (
                    <Line key={a.code} dataKey={a.code} type="monotone" stroke={a.color} strokeWidth={2}
                          name={`${a.nom} (${a.code})`} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="sbr-carte">
            <h2>{t.ranking}</h2>
            <p className="sbr-note">{t.rankingSub} · {selectedYear}</p>
            <ul className="sbr-rang">
              {apRows.map((r) => {
                const st = ST[r.statut];
                return (
                  <li key={r.code}>
                    <button className={selectedAP === r.nom ? 'on' : ''} onClick={() => choisirAP(r.nom)}>
                      <span className="nom"><i style={{ background: r.color }} />{r.nom}</span>
                      <strong className="val" style={{ color: r.has ? (r.variation <= 0 ? '#16a34a' : '#dc2626') : '#94a3b8' }}>
                        {r.has ? `${fr1(r.variation)} %` : '—'}
                      </strong>
                      <span className="sbr-statut" style={{ color: st.c, background: st.bg }}>{t[st.k]}</span>
                      <span className="sbr-piste">
                        <i style={{ width: `${(Math.max(0, Math.min(r.reduction, 40)) / 40) * 100}%`, background: st.bar }} />
                        <u />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <a className="sbr-footer"
             href="https://gizonline.sharepoint.com/:x:/r/sites/PADDIwithguests-01SEetSIG/Freigegebene%20Dokumente/Equipe%20Technique/03.%20Op%C3%A9rations/R%C3%A9alisation%20PO%20(par%20unit%C3%A9)/UCT%20Tan%C3%A0/Composante%200/SIG/2025-10-06_Tableau_de_Bord_Feux/TB_et_BDD/Tableau_de_Bord_PADDI.xlsx?d=w35ed3c1299264334a65aa1d2729d3042&csf=1&web=1&e=pze1XJ"
             target="_blank" rel="noreferrer">
            <FileSpreadsheet size={18} color="#16a34a" />
            <span>{t.footer}</span>
            <strong>{t.dashboard}</strong>
          </a>
          </div>
        </aside>

        {/* ---------- CARTE : toute la hauteur à droite ---------- */}
        <main className="sbr-map">
          <MapContainer bounds={MADAGASCAR} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer key={fond} url={FONDS[fond].url} attribution="© Esri" />
            <ScaleControl position="bottomleft" imperial={false} />
            <ZoomControl position="bottomright" />
            <Redimension />
            {geoFiltered?.features?.length ? (
              <>
                <GeoLayer key={`r-${selectedAntenne}`} data={geoFiltered} style={styleRegion} />
                {aireProtegeeFiltered?.features?.length ? (
                  <GeoLayer key={`ap-${selectedAntenne}-${selectedAP}`} data={aireProtegeeFiltered}
                            style={styleAP} labels={!!selectedAntenne || !!selectedAP} />
                ) : null}
                <FocusCarte geoData={geoFiltered} apData={aireProtegeeFiltered} selectedAP={selectedAP} />
              </>
            ) : null}
          </MapContainer>

          <div className="sbr-map-titre">{t.mapTitle} ({selectedYear})</div>

          <div className="sbr-outils" role="group" aria-label={t.basemap}>
            <button className={fond === 'topo' ? 'on' : ''} onClick={() => setFond('topo')}>{t.topo}</button>
            <button className={fond === 'sat' ? 'on' : ''} onClick={() => setFond('sat')}>{t.sat}</button>
          </div>

          <div className="sbr-legende">
            <strong>{t.legend}</strong>
            <div><i className="carre" style={{ background: 'rgba(34,197,94,.45)', border: '1px solid #15803d' }} />{t.protectedLegend}</div>
            {Object.entries(COULEUR_ANTENNE)
              .filter(([a]) => !selectedAntenne || a === selectedAntenne)
              .map(([a, c]) => (
                <div key={a}><i className="carre" style={{ background: c, opacity: 0.7 }} />{a}</div>
              ))}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}

/* =====================================================================
   STYLES (feuille locale : media queries + même palette que Pression)
   ===================================================================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600&display=swap');

/* .sbr est un « conteneur » : tout s'adapte à la largeur réellement disponible
   (sidebar ouverte ou réduite), pas à la largeur de la fenêtre. */
.sbr{
  --fond-panneau:#f1f4f7; --fond-entete:rgba(255,255,255,.95); --carte:#fff; --ligne:#e2e8f0;
  --txt:#0f172a; --mut:#64748b; --rouge:rgb(200,15,15);
  --titre:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;
  --corps:'Figtree','Segoe UI',system-ui,sans-serif;
  width:100%;min-width:0;max-width:100%;container-type:inline-size;container-name:sbr;
  color:var(--txt);font-family:var(--corps);font-size:14px;box-sizing:border-box;
}
.sbr *{box-sizing:border-box}
.sbr button,.sbr select{font-family:inherit}
.sbr button:focus-visible,.sbr select:focus-visible,.sbr a:focus-visible{outline:2px solid var(--rouge);outline-offset:2px}
/* --sbr-offset : hauteur d'un éventuel en-tête global de ton application (ex. 64px) */
.sbr-in{height:calc(100dvh - var(--sbr-offset,0px));min-height:560px;display:flex;flex-direction:column}

/* ---- En-tête ---- */
.sbr-top{background:var(--fond-entete);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border-bottom:1px solid var(--ligne);padding:12px 18px;position:relative;z-index:20;flex:none}
.sbr-top-ligne{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 20px}
.sbr-marque{display:flex;align-items:center;gap:12px;min-width:0;flex:1 1 300px}
.sbr-logo{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;color:#fff;flex:none;
  background:linear-gradient(160deg,rgb(200,15,15),#e8601c)}
.sbr-titre{margin:0;font-family:var(--titre);font-size:clamp(15px,1.5vw,20px);font-weight:700;letter-spacing:-.01em;line-height:1.2}
.sbr-sous{margin:2px 0 0;font-size:12px;color:var(--mut)}
.sbr-filtres{display:flex;gap:12px;align-items:flex-end;flex-wrap:nowrap;margin-top:0;margin-left:auto}
.sbr-champ{display:flex;flex-direction:column;gap:4px;min-width:0}
.sbr-champ>span{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--mut);font-weight:500}
.sbr-champ select{padding:8px 10px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:var(--txt);
  font-size:13px;min-width:150px;max-width:210px;cursor:pointer}
.sbr-reset{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:9px;
  border:1px dashed #94a3b8;background:transparent;color:var(--txt);font-size:13px;font-weight:600;cursor:pointer}
.sbr-reset:hover{border-color:var(--rouge);color:var(--rouge)}

/* ---- Corps : panneau (plus large) + carte (plus étroite, pleine hauteur) ---- */
.sbr-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,66%) minmax(0,1fr)}
.sbr-panel{container-type:inline-size;container-name:sbrp;overflow-y:auto;padding:16px;
  background:var(--fond-panneau);border-right:1px solid var(--ligne);min-width:0}
.sbr-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.sbr-map{position:relative;min-height:0;min-width:0;isolation:isolate;height:100%}

.sbr-banner{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:#ecfdf5;
  border:1px solid #bbf7d0;color:#065f46;grid-column:1/-1}
.sbr-banner p{margin:0;font-size:13px;font-weight:600;line-height:1.45}
.sbr-footer{grid-column:1/-1}

/* ---- Cartes ---- */
.sbr-carte{background:var(--carte);border:1px solid var(--ligne);border-radius:14px;padding:16px;min-width:0;
  box-shadow:0 1px 3px rgba(15,23,42,.06);display:flex;flex-direction:column;container-type:inline-size;container-name:sbc}
.sbr-carte:nth-of-type(1){border-top:4px solid var(--rouge)}
.sbr-carte:nth-of-type(2){border-top:4px solid #16a34a}
.sbr-carte:nth-of-type(3){border-top:4px solid #2563eb}
.sbr-carte:nth-of-type(4){border-top:4px solid #f59e0b}
.sbr-carte h2{margin:0;font-family:var(--titre);font-size:15px;font-weight:700;line-height:1.25}
.sbr-note{margin:3px 0 10px;font-size:11.5px;color:var(--mut)}

.sbr-kpi{display:flex;flex-direction:column;gap:10px}
.sbr-kpi-haut{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:12px;align-items:stretch}
.sbr-stats-col{display:grid;grid-template-rows:repeat(3,minmax(0,1fr));gap:8px}
.sbr-stats-bas{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:8px}
.sbr-tuile{background:#f8fafc;border:1px solid var(--ligne);border-radius:10px;padding:8px 10px;min-width:0;
  display:flex;flex-direction:column;justify-content:center;gap:2px}
.sbr-tuile span{font-size:11px;color:var(--mut);line-height:1.25}
.sbr-tuile strong{font-family:var(--titre);font-size:clamp(13px,1.15vw,16px);font-weight:700;
  font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.sbr-donut{position:relative;height:176px;width:100%;max-width:210px;margin:auto}
.sbr-donut-centre{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;pointer-events:none;padding:0 22%}
.sbr-donut-centre strong{font-family:var(--titre);font-size:clamp(22px,2.4vw,30px);font-weight:800;line-height:1}
.sbr-donut-centre span{font-size:11.5px;color:var(--mut);margin-top:3px}
.sbr-donut-centre em{font-style:normal;font-size:11.5px;font-weight:700;margin-top:4px}

.sbr-graph{flex:1;min-height:250px;width:100%}
.sbr-graph-grand{flex:1;min-height:240px}

.sbr-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.sbr-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;border:1px solid #cbd5e1;
  background:#fff;color:var(--txt);font-size:11.5px;cursor:pointer;max-width:100%}
.sbr-chip b{font-weight:700}
.sbr-chip i{width:10px;height:10px;border-radius:50%;flex:none}
.sbr-chip.off{opacity:.45;text-decoration:line-through;background:#f8fafc}
.sbr-chip:hover{background:#f1f5f9}

/* ---- Classement ---- */
.sbr-rang{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.sbr-rang button{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:5px 12px;
  align-items:center;width:100%;padding:6px 10px;border:0;border-radius:8px;background:transparent;
  cursor:pointer;text-align:left;font-size:12.5px;color:var(--txt)}
.sbr-rang button:hover{background:#f1f5f9}
.sbr-rang button.on{background:#dcfce7;outline:1px solid #16a34a}
.sbr-rang .nom{display:flex;align-items:center;gap:8px;font-weight:600;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.sbr-rang .nom i{width:10px;height:10px;border-radius:50%;flex:none}
.sbr-rang .val{font-variant-numeric:tabular-nums;order:3;min-width:60px;text-align:right}
.sbr-piste{grid-column:1/-1;order:5;position:relative;height:8px;background:#e2e8f0;border-radius:4px}
.sbr-piste i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;transition:width .3s}
.sbr-piste u{position:absolute;top:-3px;bottom:-3px;left:62.5%;width:2px;background:#0f172a;opacity:.65}
.sbr-statut{order:4;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}

.sbr-footer{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:12px;
  background:#ecfdf5;color:var(--txt);text-decoration:none;font-size:13px}
.sbr-footer strong{margin-left:auto;color:#15803d;text-decoration:underline}

/* ---- Carte ---- */
.sbr .leaflet-container{background:#e5e7eb;font-family:var(--corps)}
.sbr .sbr-ap-label{background:#fff;border:1px solid #94a3b8;border-radius:5px;font-size:12px;font-weight:700;
  box-shadow:0 2px 8px rgba(0,0,0,.2);padding:3px 7px}
.sbr .sbr-ap-label:before{display:none}
.sbr-map-titre{position:absolute;top:12px;left:12px;z-index:1000;padding:9px 13px;border-radius:10px;
  background:rgba(255,255,255,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(15,23,42,.15);font-size:12.5px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.15);
  width:fit-content;max-width:calc(100% - 200px)}
.sbr-outils{position:absolute;top:12px;right:12px;z-index:1000;display:flex;border-radius:10px;overflow:hidden;
  border:1px solid rgba(15,23,42,.18);background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.15)}
.sbr-outils button{padding:9px 12px;border:0;background:transparent;font-size:13px;font-weight:700;cursor:pointer;color:var(--txt)}
.sbr-outils button+button{border-left:1px solid rgba(15,23,42,.15)}
.sbr-outils button.on{background:var(--rouge);color:#fff}
.sbr-legende{position:absolute;right:12px;bottom:64px;z-index:1000;padding:10px 13px;border-radius:12px;
  background:rgba(255,255,255,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(15,23,42,.15);font-size:12px;display:flex;flex-direction:column;gap:6px;
  box-shadow:0 3px 12px rgba(0,0,0,.15);max-width:200px}
.sbr-legende div{display:flex;align-items:center;gap:8px;color:#334155;font-weight:600}
.sbr-legende .carre{width:14px;height:14px;border-radius:3px;flex:none}

@container sbc (min-width:600px){
  .sbr-rang button{grid-template-columns:minmax(110px,1.1fr) minmax(0,2fr) auto auto}
  .sbr-piste{grid-column:auto;order:2}
}

/* ---- Adaptation au PANNEAU (largeur réelle disponible) ---- */
@container sbrp (min-width:620px){
  .sbr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@container sbrp (max-width:360px){
  .sbr-kpi-haut{grid-template-columns:1fr}
  .sbr-stats-col{grid-template-rows:none}
}

/* ---- Adaptation à la ZONE (sidebar ouverte ou réduite) ---- */
@container sbr (max-width:1279px){
  .sbr-body{grid-template-columns:minmax(0,62%) minmax(0,1fr)}
}
@container sbr (min-width:1600px){
  .sbr-body{grid-template-columns:minmax(0,68%) minmax(0,1fr)}
  .sbr-panel{padding:20px}
  .sbr-grid{gap:16px}
}
@container sbr (min-width:2200px){
  .sbr-in{font-size:16px}
  .sbr-body{grid-template-columns:minmax(0,70%) minmax(0,1fr)}
  .sbr-graph{min-height:340px}
  .sbr-graph-grand{min-height:380px}
}
/* Tablette & mobile : carte au-dessus, la page défile */
@container sbr (max-width:1023px){
  .sbr-in{height:auto;min-height:0}
  .sbr-top{position:sticky;top:0}
  .sbr-body{display:flex;flex-direction:column;flex:none}
  .sbr-map{order:-1;height:56vh;min-height:320px;flex:none}
  .sbr-panel{overflow:visible;border-right:0}
  .sbr-filtres{width:100%;margin-left:0;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .sbr-champ,.sbr-reset{flex:none}
}
@container sbr (max-width:639px){
  .sbr-top{padding:10px 12px}
  .sbr-sous{display:none}
  .sbr-panel{padding:12px}
  .sbr-grid{gap:12px}
  .sbr-carte{padding:12px}
  .sbr-map{height:48vh}
  .sbr-map-titre{top:60px;max-width:calc(100% - 24px);font-size:11.5px}
  .sbr-legende{display:none}
  .sbr-graph{min-height:230px}
  .sbr-graph-grand{min-height:280px}
  .sbr-champ select{min-width:140px}
  .sbr-footer strong{margin-left:0}
}
@media (prefers-reduced-motion:reduce){ .sbr *{transition:none !important;animation:none !important} }
`;
