import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, Legend, PieChart, Pie, Cell, Label,
} from "recharts";
import { Target, Calendar, MapPin, Landmark, FileSpreadsheet } from "lucide-react";

/* ================= CONSTANTES ================= */
const DEFAULT_YEAR = 2026;
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);
const BASELINE_YEARS = [2020, 2021, 2022, 2023, 2024];
const TARGET = 25; // % de réduction visé en 2030
const VALID_ANTENNES = ["Tanà", "Amoron'i Mania", "Boeny", "Diana", "Atsimo-Atsinanana", "Anosy"];
const DASHBOARD_URL =
  "https://gizonline.sharepoint.com/:x:/r/sites/PADDIwithguests-01SEetSIG/Freigegebene%20Dokumente/Equipe%20Technique/03.%20Op%C3%A9rations/R%C3%A9alisation%20PO%20(par%20unit%C3%A9)/UCT%20Tan%C3%A0/Composante%200/SIG/2025-10-06_Tableau_de_Bord_Feux/TB_et_BDD/Tableau_de_Bord_PADDI.xlsx?d=w35ed3c1299264334a65aa1d2729d3042&csf=1&web=1&e=pze1XJ";

const AP_LIST = [
  { code: "MDA", name: "Montagne d'Ambre", color: "#16a34a" },
  { code: "ANK", name: "Ankarana", color: "#22c55e" },
  { code: "ANLM", name: "Analamerana", color: "#84cc16" },
  { code: "AKF", name: "Ankarafantsika", color: "#f59e0b" },
  { code: "ADH", name: "Andohahela", color: "#ef4444" },
  { code: "MDS", name: "Befotaka-Midongy", label: "Midongy du Sud", color: "#9333ea" },
  { code: "MLB", name: "Marolambo", color: "#2563eb" },
];
const AP_CODE: Record<string, string> = Object.fromEntries(AP_LIST.map((a) => [a.name, a.code]));

const BURN_LEGEND = [
  ["#fef3c7", "0 - 100"], ["#fcd34d", "100 - 500"], ["#fb923c", "500 - 1 000"],
  ["#ef4444", "1 000 - 5 000"], ["#b91c1c", "> 5 000"],
];

const ANTENNE_COLORS: Record<string, string> = {
  "Tanà": "#16a34a", Boeny: "#2563eb", "Atsimo-Atsinanana": "#f59e0b",
  Diana: "#ef4444", Anosy: "#8b5cf6",
};
const getColorByAntenne = (a?: string) => ANTENNE_COLORS[a ?? ""] ?? "#64748b";

/* ================= TEXTES ================= */
const TEXT: any = {
  fr: {
    pageTitle: "Système de suivi de feux en périphérie de 5 km de l'Aire protégée",
    year: "Année", region: "Région", protectedArea: "Aire protégée",
    allRegions: "Toutes les régions", allProtectedAreas: "Toutes", reset: "Réinitialiser",
    indicator: "Indicateur : Les superficies brûlées ont diminué de 25% d’ici 2030 dans les zones en périphérie des aires protégées sélectionnées.",
    targetRate: "TAUX D’ATTEINTE DE LA CIBLE", targetReached: "de la cible atteinte",
    reference: "Référence (2020-2024)", burnedArea: "Superficie", variation: "Variation",
    objective2030: "Objectif 2030 (-25%)",
    annualEvolution: "ÉVOLUTION MULTI-ANNUELLE DE L'INDICATEUR",
    annualSubtitle: "Variation (%) des superficies brûlées par rapport à l'année de référence (2020 - 2024)",
    targetLine: "Objectif : -25%", burnedVariation: "Variation des superficies brûlées (%)",
    mapTitle: "CARTE DES SUPERFICIES BRÛLÉES EN PÉRIPHÉRIE DES AIRES PROTÉGÉES",
    comparison: "COMPARAISON MULTI-ANNUELLE DES 7 AIRES PROTÉGÉES", variationAxis: "Variation (%)",
    legends: "LÉGENDES", burnedLegend: "Superficie brûlée (ha)", protectedLegend: "Aire protégée", legend: "Légende",
    footer: "Analyse détaillée par aire protégée, commune et micro-bassin versant",
    dashboard: "Tableaux de bord PADDI.xlsx", ahead: "au-delà", delay: "de retard",
  },
  mg: {
    pageTitle: "Rafitra fanaraha-maso ny doro tanety ao anatin’ny faritra 5 km manodidina ny Faritra Arovana",
    year: "Taona", region: "Faritra", protectedArea: "Faritra arovana",
    allRegions: "Faritra rehetra", allProtectedAreas: "Rehetra", reset: "Avereno",
    indicator: "Mari-pamantarana: Hihena 25% ny velaran-tany may hatramin'ny taona 2030 eny amin'ny faritra 5 km manodidina ireo Faritra Arovana voafantina.",
    targetRate: "TAHAN'NY FAHATRATRARANA NY TANJONA", targetReached: "amin'ny tanjona tratra",
    reference: "Taona fototra (2020-2024)", burnedArea: "Velarana", variation: "Fiovana",
    objective2030: "Tanjona 2030 (-25%)",
    annualEvolution: "FIVOARANA ISAN-TAONA NY MARI-PAMANTARANA",
    annualSubtitle: "Fiovan'ny (%) velaran-tany may raha oharina amin'ny taona fototra (2020-2024)",
    targetLine: "Tanjona: -25%", burnedVariation: "Fiovan'ny velaran-tany may (%)",
    mapTitle: "SARINTANIN'NY VELARAN-TANY MAY MANODIDINA NY FARITRA AROVANA",
    comparison: "FAMPITAHANA ISAN-TAONA NY FARITRA AROVANA 7", variationAxis: "Fiovana (%)",
    legends: "MARIBOLANA", burnedLegend: "Velaran-tany may (ha)", protectedLegend: "Faritra arovana", legend: "Maribolana",
    footer: "Famakafakana amin'ny antsipiriany isaky ny Faritra Arovana, Kaominina ary mikro-basinina",
    dashboard: "Takelaka PADDI.xlsx", ahead: "mihoatra ny tanjona", delay: "tara",
  },
  en: {
    pageTitle: "Fire Monitoring System within the 5 km Buffer around Protected Areas",
    year: "Year", region: "Region", protectedArea: "Protected Area",
    allRegions: "All regions", allProtectedAreas: "All", reset: "Reset",
    indicator: "Indicator: Burned areas are reduced by 25% by 2030 within the 5 km buffer surrounding the selected protected areas.",
    targetRate: "TARGET ACHIEVEMENT RATE", targetReached: "of the target achieved",
    reference: "Baseline (2020-2024)", burnedArea: "Burned area", variation: "Variation",
    objective2030: "2030 Target (-25%)",
    annualEvolution: "MULTI-YEAR EVOLUTION OF THE INDICATOR",
    annualSubtitle: "Variation (%) of burned areas compared with the baseline period (2020-2024)",
    targetLine: "Target: -25%", burnedVariation: "Burned area variation (%)",
    mapTitle: "MAP OF BURNED AREAS AROUND PROTECTED AREAS",
    comparison: "MULTI-YEAR COMPARISON OF THE 7 PROTECTED AREAS", variationAxis: "Variation (%)",
    legends: "LEGENDS", burnedLegend: "Burned area (ha)", protectedLegend: "Protected area", legend: "Legend",
    footer: "Detailed analysis by protected area, municipality and micro-watershed",
    dashboard: "PADDI Dashboard.xlsx", ahead: "ahead", delay: "behind schedule",
  },
  de: {
    pageTitle: "System zur Überwachung von Bränden im 5-km-Puffer um Schutzgebiete",
    year: "Jahr", region: "Region", protectedArea: "Schutzgebiet",
    allRegions: "Alle Regionen", allProtectedAreas: "Alle", reset: "Zurücksetzen",
    indicator: "Indikator: Die verbrannte Fläche soll bis 2030 im 5-km-Puffer der ausgewählten Schutzgebiete um 25 % reduziert werden.",
    targetRate: "ERREICHUNG DER ZIELVORGABE", targetReached: "des Ziels erreicht",
    reference: "Referenz (2020-2024)", burnedArea: "Verbrannte Fläche", variation: "Veränderung",
    objective2030: "Ziel 2030 (-25%)",
    annualEvolution: "MEHRJÄHRIGE ENTWICKLUNG DES INDIKATORS",
    annualSubtitle: "Veränderung (%) der verbrannten Flächen gegenüber der Referenzperiode (2020-2024)",
    targetLine: "Ziel: -25%", burnedVariation: "Veränderung der verbrannten Fläche (%)",
    mapTitle: "KARTE DER VERBRANNTEN FLÄCHEN UM SCHUTZGEBIETE",
    comparison: "MEHRJÄHRIGER VERGLEICH DER 7 SCHUTZGEBIETE", variationAxis: "Veränderung (%)",
    legends: "LEGENDE", burnedLegend: "Verbrannte Fläche (ha)", protectedLegend: "Schutzgebiet", legend: "Legende",
    footer: "Detaillierte Analyse nach Schutzgebiet, Gemeinde und Mikroeinzugsgebiet",
    dashboard: "PADDI-Dashboard.xlsx", ahead: "über dem Ziel", delay: "Rückstand",
  },
};

/* ================= HELPERS ================= */
const num = (v: any) => Number(String(v ?? 0).replace(",", ".")) || 0;
const pct = (v: number, d = 1) => Number(v).toFixed(d).replace(".", ",");
const formatHa = (v: number) =>
  Number(v ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " ha";
const sameAP = (a: any, b: any) => String(a).trim() === String(b).trim();

/* ================= COMPOSANTS CARTE ================= */
// Recalcule la taille de la carte quand son conteneur change (rotation, redimensionnement, menu replié…)
function MapResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// Un seul contrôleur de zoom : AP sélectionnée > régions filtrées
function FitController({ geoData, apData, selectedAP }: any) {
  const map = useMap();
  useEffect(() => {
    let source: any = null;
    let maxZoom = 10;
    if (selectedAP && apData?.features) {
      const f = apData.features.find((x: any) => x.properties?.nom_ap === selectedAP);
      if (f) { source = f; maxZoom = 12; }
    }
    if (!source && geoData?.features?.length) source = geoData;
    if (!source) return;
    const bounds = L.geoJSON(source).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20], maxZoom, animate: true });
  }, [geoData, apData, selectedAP, map]);
  return null;
}

function GeoLayer({ data, options }: any) {
  const map = useMap();
  useEffect(() => {
    if (!data?.features?.length) return;
    const layer = L.geoJSON(data, options).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [data, options, map]);
  return null;
}

function LegendControl({ t }: any) {
  const map = useMap();
  useEffect(() => {
    const legend = (L as any).control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "sb-map-legend");
      div.innerHTML = `<strong>${t.legend} :</strong>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
          <span style="width:14px;height:14px;background:rgba(34,197,94,.30);border:1px solid #fff;display:inline-block"></span>
          ${t.protectedArea}
        </div>`;
      return div;
    };
    legend.addTo(map);
    return () => legend.remove();
  }, [map, t]);
  return null;
}

/* ================= COMPOSANT PRINCIPAL ================= */
export default function SuperficiesBrulees() {
  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.fr;

  const [selectedAntenne, setSelectedAntenne] = useState("");
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [selectedAP, setSelectedAP] = useState("");
  const [regionsData, setRegionsData] = useState<any>(null);
  const [aireProtegeeData, setAireProtegeeData] = useState<any>(null);
  const [feuxData, setFeuxData] = useState<any[]>([]);

  const resetFilters = useCallback(() => {
    setSelectedYear(DEFAULT_YEAR);
    setSelectedAntenne("");
    setSelectedAP("");
  }, []);

  /* ---------- Chargement des données (une seule fois, annulable) ---------- */
  useEffect(() => {
    let cancelled = false;
    const load = (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url} introuvable`);
        return r.json();
      });
    Promise.all([
      load("/data/madagascar_24_region.geojson"),
      load("/data/Bases_Feux.geojson"),
      load("/data/aire_protegee_paddi.geojson"),
    ])
      .then(([regions, feux, aps]) => {
        if (cancelled) return;
        setRegionsData(regions);
        setFeuxData(feux.features.map((f: any) => f.properties));
        setAireProtegeeData(aps);
      })
      .catch((e) => console.error("Erreur de chargement :", e));
    return () => { cancelled = true; };
  }, []);

  /* ---------- Tableau virtuel (baseline, variation, atteinte…) ---------- */
  const tableauVirtuel = useMemo(() => {
    if (!feuxData.length) return [];
    const data5km = feuxData.filter((d) => d.Source === "5km");
    const aps: string[] = ["", ...Array.from(new Set<string>(data5km.map((d) => d.AP).filter(Boolean)))];
    const rows: any[] = [];

    aps.forEach((ap) => {
      const dataAP = ap === "" ? data5km : data5km.filter((d) => d.AP === ap);
      const sumYear = (an: number) =>
        dataAP.filter((d) => Number(d["Année"]) === an).reduce((s, d) => s + num(d.Total), 0);
      const baseline = BASELINE_YEARS.reduce((s, an) => s + sumYear(an), 0) / BASELINE_YEARS.length;

      YEARS.forEach((an) => {
        const hasData = dataAP.some((d) => Number(d["Année"]) === an);
        const superficie = sumYear(an);
        const ok = hasData && baseline !== 0;
        const variation = ok ? ((superficie - baseline) / baseline) * 100 : 0;
        const reduction = ok ? ((baseline - superficie) / baseline) * 100 : 0;
        rows.push({
          AP: ap, Annee: an, HasData: ok, Baseline: baseline, Objectif2030: baseline * (1 - TARGET / 100),
          Superficie: superficie, Variation: variation, Reduction: reduction,
          TauxAtteinte2030: Math.max(0, Math.min((reduction / TARGET) * 100, 100)),
          EcartCible: reduction - TARGET,
        });
      });
    });
    return rows;
  }, [feuxData]);

  const donutKPI = useMemo(
    () =>
      tableauVirtuel.find((d) => (selectedAP === "" ? d.AP === "" : sameAP(d.AP, selectedAP)) && d.Annee === selectedYear) ?? {
        Baseline: 0, Objectif2030: 0, Superficie: 0, Variation: 0, Reduction: 0, TauxAtteinte2030: 0, EcartCible: 0,
      },
    [tableauVirtuel, selectedAP, selectedYear]
  );

  // null quand il n'y a pas de donnée → la courbe n'affiche plus de faux "0"
  const evolution = useMemo(
    () =>
      tableauVirtuel
        .filter((d) => (selectedAP === "" ? d.AP === "" : sameAP(d.AP, selectedAP)))
        .map((d) => ({ annee: d.Annee, valeur: d.HasData ? -d.Reduction : null }))
        .sort((a, b) => a.annee - b.annee),
    [tableauVirtuel, selectedAP]
  );

  const comparisonData = useMemo(
    () =>
      YEARS.map((an) => {
        const ligne: any = { annee: an };
        tableauVirtuel
          .filter((d) => d.Annee === an && d.AP !== "")
          .forEach((d) => {
            const code = AP_CODE[d.AP];
            if (code) ligne[code] = d.HasData ? d.Variation : null;
          });
        return ligne;
      }),
    [tableauVirtuel]
  );

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
      type: "FeatureCollection",
      features: regionsData.features.filter(
        (f: any) => f.properties?.actif && (!selectedAntenne || f.properties?.antenne === selectedAntenne)
      ),
    };
  }, [regionsData, selectedAntenne]);

  const aireProtegeeFiltered = useMemo(() => {
    if (!aireProtegeeData?.features) return null;
    return {
      type: "FeatureCollection",
      features: aireProtegeeData.features.filter(
        (f: any) =>
          (!selectedAntenne || f.properties?.antenne === selectedAntenne) &&
          (!selectedAP || f.properties?.nom_ap === selectedAP)
      ),
    };
  }, [aireProtegeeData, selectedAntenne, selectedAP]);

  const apList = useMemo(
    () =>
      (aireProtegeeData?.features ?? [])
        .filter((f: any) => !selectedAntenne || f.properties?.antenne === selectedAntenne)
        .map((f: any) => f.properties?.nom_ap)
        .filter(Boolean),
    [aireProtegeeData, selectedAntenne]
  );

  // Si l'AP choisie n'appartient plus à la région sélectionnée, on la réinitialise
  useEffect(() => {
    if (selectedAP && apList.length && !apList.includes(selectedAP)) setSelectedAP("");
  }, [apList, selectedAP]);

  // Styles Leaflet mémorisés (évite de recréer les couches à chaque rendu)
  const regionOptions = useMemo(
    () => ({
      style: (f: any) => ({ color: "#fff", weight: 1, fillColor: getColorByAntenne(f.properties?.antenne), fillOpacity: 0.6 }),
    }),
    []
  );
  const apOptions = useMemo(
    () => ({
      style: { color: "#fff", weight: 0.8, fillColor: "#22c55e", fillOpacity: 0.3 },
      onEachFeature: (f: any, layer: any) => {
        if (selectedAntenne && f.properties?.nom_ap)
          layer.bindTooltip(f.properties.nom_ap, { permanent: true, direction: "center", className: "ap-label" });
      },
    }),
    [selectedAntenne]
  );

  /* ---------- Donut ---------- */
  const kpiValue = donutKPI.TauxAtteinte2030 ?? 0;
  const ecartCible = donutKPI.EcartCible ?? 0;
  const variation = Number(donutKPI.Variation ?? 0);
  const dataDonut = [{ name: "atteint", value: kpiValue }, { name: "reste", value: Math.max(0, 100 - kpiValue) }];
  const donutColor = variation <= -25 ? "#2563eb" : variation <= -15 ? "#16a34a" : variation <= -5 ? "#f59e0b" : "#dc2626";

  /* ================= RENDU ================= */
  return (
    <div className="sb">
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="sb-header">
        <h2 className="sb-title">{t.pageTitle}</h2>

        <div className="sb-filters">
          <label className="sb-filter">
            <span className="sb-filter-label"><Calendar size={14} /> {t.year}</span>
            <select className="sb-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>

          <label className="sb-filter">
            <span className="sb-filter-label"><MapPin size={14} /> {t.region}</span>
            <select className="sb-select" value={selectedAntenne} onChange={(e) => setSelectedAntenne(e.target.value)}>
              <option value="">{t.allRegions}</option>
              {antennes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          <label className="sb-filter">
            <span className="sb-filter-label"><Landmark size={14} /> {t.protectedArea}</span>
            <select className="sb-select" value={selectedAP} onChange={(e) => setSelectedAP(e.target.value)}>
              <option value="">{t.allProtectedAreas}</option>
              {apList.map((ap: string) => <option key={ap} value={ap}>{ap}</option>)}
            </select>
          </label>

          <button className="sb-button" onClick={resetFilters}>{t.reset}</button>
        </div>
      </header>

      <div className="sb-banner">
        <Target size={26} color="#16a34a" style={{ flexShrink: 0 }} />
        <span>{t.indicator}</span>
      </div>

      {/* KPI + COURBE + CARTE */}
      <div className="sb-grid-top">
        {/* DONUT */}
        <section className="sb-card">
          <h3 className="sb-card-title">{t.targetRate}</h3>

          <div className="sb-donut">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={170}>
              <PieChart>
                <Pie data={dataDonut} innerRadius="65%" outerRadius="95%" startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                  <Cell fill={donutColor} />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="sb-donut-center">
              <div className="sb-kpi-value" style={{ color: donutColor }}>{pct(kpiValue)}%</div>
              <div className="sb-kpi-sub">{t.targetReached}</div>
              {ecartCible !== 0 && (
                <div className="sb-kpi-gap" style={{ color: ecartCible > 0 ? "#2563eb" : "#dc2626" }}>
                  {ecartCible > 0 ? `+${pct(ecartCible)}% ${t.ahead}` : `${pct(Math.abs(ecartCible))}% ${t.delay}`}
                </div>
              )}
            </div>
          </div>

          <div className="sb-table">
            <div className="sb-row"><span>{t.reference}</span><strong>{formatHa(donutKPI.Baseline)}</strong></div>
            <div className="sb-row"><span>{t.burnedArea} {selectedYear}</span><strong>{formatHa(donutKPI.Superficie)}</strong></div>
            <div className="sb-row">
              <span>{t.variation}</span>
              <strong style={{ color: variation <= 0 ? "#16a34a" : "#dc2626" }}>{pct(variation)} %</strong>
            </div>
            <div className="sb-row"><span>{t.objective2030}</span><strong>{formatHa(donutKPI.Objectif2030)}</strong></div>
          </div>
        </section>

        {/* ÉVOLUTION */}
        <section className="sb-card">
          <h3 className="sb-card-title">{t.annualEvolution}</h3>
          <p className="sb-subtitle">{t.annualSubtitle}</p>

          <div className="sb-chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={170}>
              <LineChart data={evolution} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="annee" tick={{ fontSize: 11 }} padding={{ left: 16, right: 16 }} interval="preserveStartEnd" minTickGap={8} />
                <YAxis
                  width={42}
                  domain={[
                    (min: number) => Math.min(-30, Math.floor(min / 5) * 5),
                    (max: number) => Math.max(0, Math.ceil(max / 5) * 5),
                  ]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip formatter={(v: any) => `${pct(v)}%`} />
                <ReferenceLine
                  y={-TARGET} stroke="#16a34a" strokeDasharray="5 5"
                  label={{ value: t.targetLine, position: "insideBottomLeft", fill: "#dc2626", fontSize: 11 }}
                />
                <Line
                  type="monotone" dataKey="valeur" name={t.burnedVariation}
                  stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}
                  label={({ x, y, value }: any) =>
                    value == null ? null : (
                      <text x={x} y={y - 8} fontSize={10} fontWeight={700} fill="#111827" textAnchor="middle">
                        {pct(value)}%
                      </text>
                    )
                  }
                />
                <Legend verticalAlign="bottom" iconType="line" wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* CARTE */}
        <section className="sb-card sb-card-map">
          <h3 className="sb-card-title">{t.mapTitle} ({selectedYear})</h3>

          <div className="sb-map">
            <MapContainer center={[-18.8792, 47.5079]} zoom={6} style={{ width: "100%", height: "100%" }}>
              <TileLayer
                attribution="© ESRI"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              />
              <ScaleControl position="bottomleft" imperial={false} />
              <MapResize />
              <GeoLayer data={geoFiltered} options={regionOptions} />
              <GeoLayer data={aireProtegeeFiltered} options={apOptions} />
              <FitController geoData={geoFiltered} apData={aireProtegeeFiltered} selectedAP={selectedAP} />
              <LegendControl t={t} />
            </MapContainer>
          </div>
        </section>
      </div>

      {/* COMPARAISON */}
      <div className="sb-grid-compare">
        <section className="sb-card">
          <h3 className="sb-card-title">{t.comparison}</h3>

          <div className="sb-chart sb-chart-lg">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={170}>
              <LineChart data={comparisonData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="annee" type="category" tick={{ fontSize: 11 }} padding={{ left: 12, right: 12 }} interval="preserveStartEnd" minTickGap={8} />
                <YAxis
                  width={52}
                  domain={[(min: number) => Math.min(-30, Math.floor(min / 10) * 10), "auto"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${pct(v, 0)}%`}
                >
                  <Label value={t.variationAxis} angle={-90} position="insideLeft"
                    style={{ textAnchor: "middle", fontSize: 12, fontWeight: 600, fill: "#374151" }} />
                </YAxis>
                <Tooltip formatter={(v: any) => `${pct(v)}%`} />
                {AP_LIST.map((ap) => (
                  <Line key={ap.code} dataKey={ap.code} type="monotone" stroke={ap.color} strokeWidth={2}
                    name={`${ap.label ?? ap.name} (${ap.code})`} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls={false} />
                ))}
                <ReferenceLine y={-TARGET} stroke="#dc2626" strokeDasharray="5 5"
                  label={{ value: t.targetLine, position: "insideBottomLeft", fill: "#dc2626", fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <aside className="sb-card sb-legends">
          <h3 className="sb-card-title">{t.legends}</h3>

          <div className="sb-legend-block">
            <div className="sb-legend-title">{t.burnedLegend}</div>
            {BURN_LEGEND.map(([c, label]) => (
              <div key={label} className="sb-legend-item"><span className="sb-swatch" style={{ background: c }} />{label}</div>
            ))}
            <div className="sb-legend-item"><span className="sb-swatch" style={{ background: "#16a34a" }} />{t.protectedLegend}</div>
          </div>

          <div className="sb-legend-block">
            {AP_LIST.map((ap) => (
              <div key={ap.code} className="sb-legend-item">
                <span className="sb-line" style={{ borderColor: ap.color }} />
                {ap.code} - {ap.label ?? ap.name}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="sb-footer">
        <FileSpreadsheet size={18} color="#16a34a" style={{ flexShrink: 0 }} />
        <span>{t.footer}</span>
        <a className="sb-link" href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer">{t.dashboard}</a>
      </footer>
    </div>
  );
}

/* ================= STYLES RESPONSIVES =================
   Mobile-first : 1 colonne par défaut, puis 2 colonnes (≥ 768px),
   puis 3 colonnes (≥ 1200px). Les tailles utilisent clamp()/vw/vh. */
const CSS = `
.sb{display:flex;flex-direction:column;gap:clamp(10px,1.6vw,16px);width:100%;max-width:1920px;margin:0 auto;
  padding:clamp(8px,2vw,20px);box-sizing:border-box;overflow-x:hidden}
.sb *,.sb *::before,.sb *::after{box-sizing:border-box}
.sb-header{display:flex;flex-direction:column;gap:12px}
.sb-title{margin:0;font-size:clamp(16px,2.4vw,24px);font-weight:700;line-height:1.25;overflow-wrap:anywhere}

/* filtres : grille 2 colonnes sur mobile */
.sb-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:end}
.sb-filter{display:flex;flex-direction:column;gap:4px;min-width:0}
.sb-filter-label{font-size:11px;display:flex;gap:5px;align-items:center;color:#374151}
.sb-select{width:100%;min-height:40px;padding:8px;border-radius:8px;border:1px solid #ddd;background:#fff;font-size:14px;text-overflow:ellipsis}
.sb-button{min-height:40px;padding:8px 14px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px}
.sb-button:hover{background:#15803d}
.sb-select:focus-visible,.sb-button:focus-visible,.sb-link:focus-visible{outline:2px solid #2563eb;outline-offset:2px}

.sb-banner{background:#ecfdf5;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;
  font-size:clamp(12px,1.4vw,14px);font-weight:700;color:#065f46;line-height:1.4}

.sb-grid-top,.sb-grid-compare{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(10px,1.6vw,16px)}
.sb-card{background:#fff;padding:clamp(8px,1.4vw,14px);border-radius:12px;min-width:0}
.sb-card-title{margin:0 0 6px;text-align:center;font-weight:600;font-size:clamp(11px,1.5vw,14px);line-height:1.3}
.sb-subtitle{margin:0 0 8px;font-size:12px;color:#6b7280;text-align:center}

/* donut */
.sb-donut{position:relative;width:100%;height:clamp(170px,32vw,230px)}
.sb-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;pointer-events:none;padding:0 22%}
.sb-kpi-value{font-size:clamp(20px,3vw,26px);font-weight:700;line-height:1.1}
.sb-kpi-sub{font-size:clamp(10px,1.3vw,12px);color:#4b5563}
.sb-kpi-gap{font-size:clamp(10px,1.3vw,12px);font-weight:600;margin-top:3px}
.sb-table{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;font-size:13px;margin-top:8px}
.sb-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px 10px;align-items:center;border-bottom:1px solid #f1f5f9}
.sb-row:last-child{border-bottom:none}

/* graphiques : hauteur fluide */
.sb-chart{width:100%;height:clamp(240px,52vw,320px)}
.sb-chart-lg{height:clamp(280px,60vw,400px)}
.sb-map{width:100%;height:clamp(280px,70vw,420px);border-radius:10px;overflow:hidden;background:#f3f4f6}
.sb-map-legend{background:#fff;padding:6px 8px;border-radius:8px;box-shadow:0 1px 5px rgba(0,0,0,.2);font-size:11px}
.ap-label{font-size:10px;font-weight:600;background:rgba(255,255,255,.75);border:none;box-shadow:none}

/* légendes : en lignes sur mobile, en colonne sur grand écran */
.sb-legends{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 20px;align-content:start}
.sb-legends .sb-card-title{grid-column:1/-1}
.sb-legend-block{display:flex;flex-direction:column;gap:6px;font-size:11px;color:#374151}
.sb-legend-title{font-size:12px;font-weight:700;margin-bottom:2px}
.sb-legend-item{display:flex;align-items:center;gap:8px;line-height:1.3}
.sb-swatch{width:16px;height:16px;border-radius:2px;flex-shrink:0}
.sb-line{width:20px;height:0;border-top:3px solid;border-radius:2px;flex-shrink:0}

.sb-footer{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:12px;background:#ecfdf5;border-radius:10px;font-size:13px}
.sb-link{margin-left:auto;color:#16a34a;text-decoration:underline;font-weight:600;overflow-wrap:anywhere}

/* ---------- Petits mobiles ---------- */
@media (max-width:359px){
  .sb-filters{grid-template-columns:minmax(0,1fr)}
  .sb-row{font-size:12px}
}
@media (max-width:599px){
  .sb-button{grid-column:1/-1}
  .sb-link{margin-left:0;width:100%}
}

/* ---------- Tablettes (≥ 768px) ---------- */
@media (min-width:768px){
  .sb-header{flex-direction:row;justify-content:space-between;align-items:flex-start;gap:20px}
  .sb-title{flex:1 1 40%}
  .sb-filters{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;flex:1 1 60%}
  .sb-filter{min-width:130px;flex:0 1 170px}
  .sb-grid-top{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sb-card-map{grid-column:1/-1}
  .sb-map{height:clamp(320px,45vw,460px)}
  .sb-chart{height:clamp(280px,34vw,340px)}
}

/* ---------- Laptops / bureaux (≥ 1200px) ---------- */
@media (min-width:1200px){
  .sb-grid-top{grid-template-columns:minmax(0,.8fr) minmax(0,1.1fr) minmax(0,1.2fr)}
  .sb-card-map{grid-column:auto}
  .sb-map{height:100%;min-height:320px}
  .sb-card-map{display:flex;flex-direction:column}
  .sb-card-map .sb-map{flex:1}
  .sb-chart{height:320px}
  .sb-grid-compare{grid-template-columns:minmax(0,4fr) minmax(220px,1fr)}
  .sb-legends{grid-template-columns:1fr}
  .sb-chart-lg{height:400px}
}

/* ---------- Très grands écrans / TV (≥ 1920px) ---------- */
@media (min-width:1920px){
  .sb{max-width:2400px;font-size:112%}
  .sb-chart{height:380px}
  .sb-chart-lg{height:480px}
}

/* Paysage téléphone : peu de hauteur */
@media (max-height:480px) and (orientation:landscape){
  .sb-map{height:260px}
  .sb-chart,.sb-chart-lg{height:240px}
}

@media (prefers-reduced-motion:reduce){.sb *{transition:none!important;animation:none!important}}
`;
