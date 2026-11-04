import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Flame, Monitor, Home, MapPinned, TrendingUp, FileText, Leaf,
  Tractor, Trees, Users, Cog, CalendarDays, RefreshCw,
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";
import { calculerTableau, couleurPct, fmtNombre, type Base, type Code, type FiltreSemestre } from "../utils/indicateurs";
import IconeTableauBord from "../components/IconeTableauBord";
import LoginModal from "../components/LoginModal";
import UpdateIndicateursModal from "../components/UpdateIndicateursModal";

/* ================= TRADUCTIONS =================
   `fr` sert de modèle : TypeScript impose que en / mg / de contiennent
   exactement les mêmes clés (plus de texte `undefined` à l'écran). */

const fr = {
  title: "TABLEAU DE BORD PADDI+",
  antenna: "Antenne",
  allAntennas: "Toutes les antennes",
  year: "Année",
  semester: "Semestre",
  allSemesters: "Tous",
  semester1: "S1 (janv. – juin)",
  semester2: "S2 (juil. – déc.)",
  dateOfLastUpdate: "Données mises à jour le :",
  update: "Mettre à jour",

  keyAchievements: "RÉALISATIONS CLÉS",
  keyResults: "RÉSULTATS CLÉS",
  interventionZone: "ZONE D’INTERVENTION",

  municipalBudgets: "R1.1 Budgets communaux",
  communes: "Commune(s)",
  reduction: "de réduction",
  reductionBurnedAreas: "R1.2 Superficies brûlées autour des 7 aires protégées",
  ecosystems: "R2.1 Superficies aménagées durablement",
  ha: "ha",
  beneficiaries: "bénéficiaires",
  smallholders: "R2.2 Petits exploitants appuyés",

  adoptedMeasures: "R1.1.2 Mesures communales",
  measures: "mesure(s)",
  cosapDecisions: "R1.2.1 Décisions des COSAP",
  decisions: "décision(s)",
  regionalPackages: "R1.2.2 Mesures régionales",
  packages: "paquet(s)",
  regionsMonitoring: "R1.1.1 Système de suivi",
  regions: "région(s)",

  sustainableAgropastoral: "R2.1.1 Surfaces agropastorales",
  sustainableForest: "R2.1.2 Surfaces forestières",
  improvedProducers: "R2.2.1 Producteurs avec revenus",
  agrMicroBusinesses: "R2.2.2 Micro-entreprises",
  producers: "producteurs",
  companies: "entreprises",

  beneficiariesByGender: "Répartition des bénéficiaires par genre",
  men: "Hommes",
  women: "Femmes",
  youngBeneficiaries: "Répartition des bénéficiaires par tranche d'âge",
  under_18: "<18",
  between_18_35: "18-35",
  between_36_59: "36-59",
  more_60: ">60",

  indicatorStatus: "Statut des indicateurs (par rapport aux cibles)",
  under25: "<=25%",
  between25_50: ">25% à 50%",
  between50_75: ">50% à 75%",
  over75: ">75%",

  globalProjectProgress: "Avancement global du projet par rapport aux jalons dans le plan quinquenal",
  globalProgress: "Progression globale",

  legend: "Légende",
  office: "Bureau",
  protectedArea: "Aire protégée",
  targetLabel: "Cible",
};

type Txt = typeof fr;

const mg: Txt = {
  title: "TABILAO FANARAHANA PADDI+",
  antenna: "Antenina",
  allAntennas: "Antenina rehetra",
  year: "Taona",
  semester: "Enim-bolana",
  allSemesters: "Rehetra",
  semester1: "S1 (Janoary – Jona)",
  semester2: "S2 (Jolay – Desambra)",
  dateOfLastUpdate: "Daty fanavaozana farany :",
  update: "Havaozina",

  keyAchievements: "ZAVA-BITA LEHIBE",
  keyResults: "VOKATRA LEHIBE",
  interventionZone: "FARITRA IASA",

  municipalBudgets: "R1.1 Tetibolan'ny kaominina",
  communes: "Kaominina",
  reduction: "fihenana",
  reductionBurnedAreas: "R1.2 Velaran-tany may manodidina ireo faritra arovana 7",
  ecosystems: "R2.1 Velaran-tany voalamina maharitra",
  ha: "ha",
  beneficiaries: "mpahazo tombontsoa",
  smallholders: "R2.2 Mpamboly madinika notohanana",

  adoptedMeasures: "R1.1.2 Fepetra kaominina",
  measures: "fepetra",
  cosapDecisions: "R1.2.1 Fanapahan-kevitry ny COSAP",
  decisions: "fanapahan-kevitra",
  regionalPackages: "R1.2.2 Fepetra isam-paritra",
  packages: "fonosana",
  regionsMonitoring: "R1.1.1 Rafitra fanaraha-maso",
  regions: "faritra",

  sustainableAgropastoral: "R2.1.1 Velarana fambolena sy fiompiana",
  sustainableForest: "R2.1.2 Velarana ala",
  improvedProducers: "R2.2.1 Mpamokatra manana vola miditra",
  agrMicroBusinesses: "R2.2.2 Orinasa madinika",
  producers: "mpamokatra",
  companies: "orinasa",

  beneficiariesByGender: "Fizarana ny mpahazo tombontsoa araka ny lahy sy vavy",
  men: "Lehilahy",
  women: "Vehivavy",
  youngBeneficiaries: "Fizarana ny mpahazo tombontsoa araka ny taona",
  under_18: "<18",
  between_18_35: "18-35",
  between_36_59: "36-59",
  more_60: ">60",

  indicatorStatus: "Toetry ny tondro (arakaraka ny tanjona)",
  under25: "<=25%",
  between25_50: ">25% à 50%",
  between50_75: ">50% à 75%",
  over75: ">75%",

  globalProjectProgress: "Fandrosoan'ny tetikasa amin'ny ankapobeny",
  globalProgress: "Fandrosoana ankapobeny",

  legend: "Fanazavana",
  office: "Birao",
  protectedArea: "Faritra arovana",
  targetLabel: "Tanjona",
};

const en: Txt = {
  title: "PADDI+ DASHBOARD",
  antenna: "Office",
  allAntennas: "All offices",
  year: "Year",
  semester: "Semester",
  allSemesters: "All",
  semester1: "S1 (Jan – Jun)",
  semester2: "S2 (Jul – Dec)",
  dateOfLastUpdate: "Data last updated:",
  update: "Update",

  keyAchievements: "KEY ACHIEVEMENTS",
  keyResults: "KEY RESULTS",
  interventionZone: "INTERVENTION AREA",

  municipalBudgets: "R1.1 Municipal budgets",
  communes: "Commune(s)",
  reduction: "reduction",
  reductionBurnedAreas: "R1.2 Burned areas around the 7 protected areas",
  ecosystems: "R2.1 Areas under sustainable management",
  ha: "ha",
  beneficiaries: "beneficiaries",
  smallholders: "R2.2 Smallholders supported",

  adoptedMeasures: "R1.1.2 Municipal measures",
  measures: "measure(s)",
  cosapDecisions: "R1.2.1 COSAP decisions",
  decisions: "decision(s)",
  regionalPackages: "R1.2.2 Regional measures",
  packages: "package(s)",
  regionsMonitoring: "R1.1.1 Monitoring system",
  regions: "region(s)",

  sustainableAgropastoral: "R2.1.1 Agropastoral areas",
  sustainableForest: "R2.1.2 Forest areas",
  improvedProducers: "R2.2.1 Producers with income",
  agrMicroBusinesses: "R2.2.2 Micro-enterprises",
  producers: "producers",
  companies: "companies",

  beneficiariesByGender: "Beneficiaries by gender",
  men: "Men",
  women: "Women",
  youngBeneficiaries: "Beneficiaries by age group",
  under_18: "Under 18",
  between_18_35: "18-35",
  between_36_59: "36-59",
  more_60: "Over 60",

  indicatorStatus: "Indicator status (vs. targets)",
  under25: "<=25%",
  between25_50: ">25% to 50%",
  between50_75: ">50% to 75%",
  over75: ">75%",

  globalProjectProgress: "Overall project progress against the five-year plan milestones",
  globalProgress: "Overall progress",

  legend: "Legend",
  office: "Office",
  protectedArea: "Protected area",
  targetLabel: "Target",
};

const de: Txt = {
  title: "PADDI+ DASHBOARD",
  antenna: "Büro",
  allAntennas: "Alle Büros",
  year: "Jahr",
  semester: "Halbjahr",
  allSemesters: "Alle",
  semester1: "H1 (Jan – Jun)",
  semester2: "H2 (Jul – Dez)",
  dateOfLastUpdate: "Daten aktualisiert am:",
  update: "Aktualisieren",

  keyAchievements: "WICHTIGE ERFOLGE",
  keyResults: "WICHTIGE ERGEBNISSE",
  interventionZone: "INTERVENTIONSGEBIET",

  municipalBudgets: "R1.1 Gemeindehaushalte",
  communes: "Gemeinde(n)",
  reduction: "Reduzierung",
  reductionBurnedAreas: "R1.2 Verbrannte Flächen um die 7 Schutzgebiete",
  ecosystems: "R2.1 Nachhaltig bewirtschaftete Flächen",
  ha: "ha",
  beneficiaries: "Begünstigte",
  smallholders: "R2.2 Unterstützte Kleinproduzenten",

  adoptedMeasures: "R1.1.2 Gemeindemaßnahmen",
  measures: "Maßnahme(n)",
  cosapDecisions: "R1.2.1 COSAP-Entscheidungen",
  decisions: "Entscheidung(en)",
  regionalPackages: "R1.2.2 Regionale Maßnahmen",
  packages: "Paket(e)",
  regionsMonitoring: "R1.1.1 Monitoringsystem",
  regions: "Region(en)",

  sustainableAgropastoral: "R2.1.1 Agropastorale Flächen",
  sustainableForest: "R2.1.2 Waldflächen",
  improvedProducers: "R2.2.1 Produzenten mit Einkommen",
  agrMicroBusinesses: "R2.2.2 Kleinstunternehmen",
  producers: "Produzenten",
  companies: "Unternehmen",

  beneficiariesByGender: "Begünstigte nach Geschlecht",
  men: "Männer",
  women: "Frauen",
  youngBeneficiaries: "Begünstigte nach Altersgruppe",
  under_18: "Unter 18",
  between_18_35: "18-35",
  between_36_59: "36-59",
  more_60: "Über 60",

  indicatorStatus: "Status der Indikatoren (im Verhältnis zu den Zielen)",
  under25: "<=25%",
  between25_50: ">25% bis 50%",
  between50_75: ">50% bis 75%",
  over75: ">75%",

  globalProjectProgress: "Gesamtfortschritt des Projekts gegenüber den Meilensteinen des Fünfjahresplans",
  globalProgress: "Gesamtfortschritt",

  legend: "Legende",
  office: "Büro",
  protectedArea: "Schutzgebiet",
  targetLabel: "Ziel",
};

const dashboardTxt: Record<string, Txt> = { fr, mg, en, de };
const DATE_LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };

/* ================= CONSTANTES (hors composant : créées une seule fois) ================= */

const VALID_ANTENNES = ["Tanà", "Amoron'i Mania", "Boeny", "Diana", "Atsimo-Atsinanana", "Anosy"];

const UC_PAR_ANTENNE: Record<string, string> = {
  "Tanà": "UCT", "Amoron'i Mania": "UCR-A", "Boeny": "UCR-B",
  "Diana": "UCR-D", "Atsimo-Atsinanana": "UCR-F", "Anosy": "UCR-FD",
};

// "Amoron'i Mania" n'avait pas de couleur (il tombait en gris) : ajoutée.
const ANTENNE_COLORS: Record<string, string> = {
  "Tanà": "#16a34a",
  "Amoron'i Mania": "#0ea5e9",
  "Boeny": "#2563eb",
  "Atsimo-Atsinanana": "#f59e0b",
  "Diana": "#ef4444",
  "Anosy": "#8b5cf6",
};

// Fonction stable : n'est plus recréée à chaque rendu, donc les couches Leaflet
// ne sont plus détruites/reconstruites inutilement.
const getColorByAntenne = (antenne?: string) => ANTENNE_COLORS[antenne ?? ""] ?? "#64748b";

const clampPct = (v: number) => (Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);

const getVille = (nom?: string) => (nom ? nom.replace("Bureau à", "").trim() : "");

const filterByAntenne = (features: any[], antenne: string) =>
  antenne ? features.filter((f) => f.properties?.antenne === antenne) : features;

/* ================= CSS RESPONSIVE =================
   - media queries pour la structure de la page
   - container queries pour les grilles : elles s'adaptent à la largeur réelle
     de la colonne (et pas seulement à celle de l'écran). */

const RESPONSIVE_CSS = `
.pd-page{width:100%;max-width:2200px;margin:0 auto;min-height:100vh;min-height:100dvh}
.pd-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:8px;align-items:start;padding-bottom:5px}
.pd-left{container-type:inline-size;container-name:pdleft;display:flex;flex-direction:column;gap:8px;min-width:0}
.pd-right{position:sticky;top:8px;display:flex;flex-direction:column;min-width:0;
  height:calc(100vh - 90px);height:calc(100dvh - 90px);min-height:440px}
.pd-map{flex:1;min-height:0;isolation:isolate;border:1px solid #e5e7eb;background:#f1f5f9}
.pd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:100%;min-width:0;align-items:stretch;grid-auto-rows:1fr}
.pd-select{font-size:12px}
.pd-title{overflow-wrap:anywhere}

@container pdleft (max-width:820px){.pd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container pdleft (max-width:420px){.pd-grid{grid-template-columns:minmax(0,1fr)}}

@media (max-width:1100px){
  .pd-layout{grid-template-columns:minmax(0,1fr)}
  .pd-right{position:static;height:auto;min-height:0}
  .pd-map{flex:none;height:clamp(320px,60vh,600px)}
}
@media (max-width:640px){
  .pd-header{flex-direction:column;align-items:stretch !important}
  .pd-filters{width:100%}
  .pd-filter-group{flex:1 1 140px}
  .pd-select{width:100%;font-size:16px} /* évite le zoom automatique sur iOS */
  .pd-date{flex:1 1 100%}
}
@media (min-width:1800px){
  .pd-layout{grid-template-columns:minmax(0,5fr) minmax(0,2fr)}
}
@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
`;

/* ================= HOOK DE CHARGEMENT GEOJSON ================= */

function useGeoJSON(url: string) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url} introuvable`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => console.error("Erreur chargement", url, err));
    return () => { cancelled = true; };
  }, [url]);

  return data;
}

/* ================= CARTE ================= */

const officeIcon = (nom?: string) =>
  L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;">
        <svg width="20" height="20" viewBox="0 0 24 24" style="display:block;">
          <path fill="#e53935" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
        <div style="font-size:10px;color:#111;white-space:nowrap;margin:0;padding:0;line-height:1;">
          ${getVille(nom)}
        </div>
      </div>`,
    className: "",
    iconSize: [60, 40],
    iconAnchor: [30, 20],
  });

const pinSVG = `
<svg width="20" height="20" viewBox="0 0 24 24">
  <path fill="#e53935" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  <circle cx="12" cy="9" r="2.5" fill="white"/>
</svg>`;

/** Cadre la carte sur les données, et la recadre quand son conteneur change de taille
 *  (rotation du téléphone, redimensionnement de la fenêtre, passage 1 → 2 colonnes…). */
function AutoZoom({ geoData }: { geoData: any }) {
  const map = useMap();

  useEffect(() => {
    if (!geoData?.features?.length) return;
    const bounds = L.geoJSON(geoData).getBounds();
    if (!bounds.isValid()) return;

    const fit = (animate: boolean) =>
      map.fitBounds(bounds, { padding: [10, 10], maxZoom: 10, animate });

    fit(true);

    let timer: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        map.invalidateSize();
        fit(false);
      }, 150);
    });
    ro.observe(map.getContainer());

    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, [geoData, map]);

  return null;
}

function LegendControl({ antennes, legendText, officeText, protectedAreaText }: {
  antennes: string[]; legendText: string; officeText: string; protectedAreaText: string;
}) {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      L.DomEvent.disableClickPropagation(div);

      div.style.background = "white";
      div.style.padding = "8px 10px";
      div.style.borderRadius = "8px";
      div.style.boxShadow = "0 1px 5px rgba(0,0,0,0.2)";
      div.style.fontSize = "12px";
      div.style.maxWidth = "60vw";

      const row = (inner: string) =>
        `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">${inner}</div>`;

      let html = `<strong>${legendText}:</strong>`;
      html += row(`${pinSVG}${officeText}`);
      antennes.forEach((a) => {
        html += row(`<span style="width:12px;height:12px;background:${getColorByAntenne(a)};display:inline-block;border-radius:3px;flex-shrink:0;"></span>${a}`);
      });
      html += row(`
        <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0;">
          <path d="M3 18 L6 5 L14 3 L21 8 L18 20 L8 21 Z" fill="rgba(34,197,94,0.30)" stroke="#16a34a" stroke-width="1"/>
        </svg>${protectedAreaText}`);

      div.innerHTML = html;
      return div;
    };

    legend.addTo(map);
    return () => { legend.remove(); };
    // Les textes sont maintenant dans les dépendances : la légende suit le changement de langue.
  }, [map, antennes, legendText, officeText, protectedAreaText]);

  return null;
}

function RegionLayer({ data }: { data: any }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: (feature) => ({
        color: "#fff",
        weight: 1,
        fillColor: getColorByAntenne(feature?.properties?.antenne),
        fillOpacity: 0.6,
      }),
    }).addTo(map);

    return () => { layer.clearLayers(); map.removeLayer(layer); };
  }, [data, map]);

  return null;
}

function BureauLayer({ data }: { data: any }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) =>
        L.marker(latlng, { icon: officeIcon(feature.properties?.nom) }),
    }).addTo(map);

    return () => { map.removeLayer(layer); };
  }, [data, map]);

  return null;
}

function AireProtegeeLayer({ data, selectedAntenne }: { data: any; selectedAntenne: string }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: { color: "#fff", weight: 0.8, fillColor: "#22c55e", fillOpacity: 0.30 },
      onEachFeature: (feature, lyr) => {
        if (selectedAntenne && feature.properties?.nom_ap) {
          lyr.bindTooltip(feature.properties.nom_ap, {
            permanent: true,
            direction: "center",
            className: "ap-label",
            sticky: false,
          });
        }
      },
    }).addTo(map);

    return () => { layer.clearLayers(); map.removeLayer(layer); };
  }, [data, map, selectedAntenne]); // selectedAntenne manquait : les étiquettes ne se mettaient pas à jour

  return null;
}

/* ================= PAGE ================= */

export default function Dashboard(_props: { data?: unknown }) {
  const { lang } = useLanguage();
  const t = dashboardTxt[lang as string] ?? dashboardTxt.fr;

  const [selectedAntenne, setSelectedAntenne] = useState("");
  const [annee, setAnnee] = useState<number>(2026);
  const [semestre, setSemestre] = useState<FiltreSemestre>("Tous");
  const [dateMaj, setDateMaj] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");

  const regionsData = useGeoJSON("/data/madagascar_24_region.geojson");
  const bureauData = useGeoJSON("/data/localisation_bureau_paddi.geojson");
  const aireProtegeeData = useGeoJSON("/data/aire_protegee_paddi.geojson");
  const base = useGeoJSON("/data/Base_Indicateurs.geojson") as Base | null;

  const chargerDate = () =>
    fetch("/api/derniere-maj?source=indicateurs")
      .then((r) => { if (!r.ok) throw new Error("maj indisponible"); return r.json(); })
      .then((d) => setDateMaj(d.date ?? null))
      .catch(() => setDateMaj(null));

  useEffect(() => { chargerDate(); }, []);

  const antennes = useMemo(() => {
    if (!regionsData?.features) return [];
    return VALID_ANTENNES.filter((a) =>
      regionsData.features.some((f: any) => f.properties?.antenne === a)
    );
  }, [regionsData]);

  const tab = useMemo(
    () => calculerTableau(base, annee, semestre, selectedAntenne || "Toutes"),
    [base, annee, semestre, selectedAntenne]
  );
  const ind = tab.indicateurs;

  const cibleTexte = (code: Code, unite: string) =>
    `${t.targetLabel} : ${fmtNombre(ind[code].cible)}${ind[code].sur ? ` / ${ind[code].sur}` : ""} ${unite}`.trim();

  const kpi = (code: Code, unite: string) => ({
    percent: ind[code].pct,
    color: couleurPct(ind[code].pct),
    target: cibleTexte(code, unite),
  });

  const geoFiltered = useMemo(() => {
    if (!regionsData?.features) return null;
    const actives = regionsData.features.filter((f: any) => f.properties?.actif);
    return { type: "FeatureCollection", features: filterByAntenne(actives, selectedAntenne) };
  }, [regionsData, selectedAntenne]);

  const bureauFiltered = useMemo(() => {
    if (!bureauData?.features) return null;
    return { type: "FeatureCollection", features: filterByAntenne(bureauData.features, selectedAntenne) };
  }, [bureauData, selectedAntenne]);

  const aireProtegeeFiltered = useMemo(() => {
    if (!aireProtegeeData?.features) return null;
    return { type: "FeatureCollection", features: filterByAntenne(aireProtegeeData.features, selectedAntenne) };
  }, [aireProtegeeData, selectedAntenne]);

  const dateAffichee = (() => {
    if (!dateMaj) return "—";
    const d = new Date(dateMaj);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(DATE_LOCALES[lang as string] ?? "fr-FR", {
      day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo",
    });
  })();

  const hasRegions = (geoFiltered?.features?.length ?? 0) > 0;

  return (
    <div className="pd-page" style={styles.page}>
      <style>{RESPONSIVE_CSS}</style>

      {/* ============ HEADER ============ */}
      <div className="pd-header" style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <IconeTableauBord size={40} />
          <h1 className="pd-title" style={styles.title}>{t.title}</h1>
        </div>

        <div className="pd-filters" style={styles.headerFilters}>
          <div className="pd-filter-group" style={styles.filterGroup}>
            <label style={styles.filterLabel}>{t.antenna}</label>
            <select
              className="pd-select"
              style={styles.select}
              value={selectedAntenne}
              onChange={(e) => setSelectedAntenne(e.target.value)}
            >
              <option value="">{t.allAntennas}</option>
              {antennes.map((a) => (
                <option key={a} value={a}>{a} ({UC_PAR_ANTENNE[a]})</option>
              ))}
            </select>
          </div>

          <div className="pd-filter-group" style={styles.filterGroup}>
            <label style={styles.filterLabel}>{t.year}</label>
            <select
              className="pd-select"
              style={styles.select}
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="pd-filter-group" style={styles.filterGroup}>
            <label style={styles.filterLabel}>{t.semester}</label>
            <select
              className="pd-select"
              style={styles.select}
              value={semestre}
              onChange={(e) => setSemestre(e.target.value as FiltreSemestre)}
            >
              <option value="Tous">{t.allSemesters}</option>
              <option value="S1">{t.semester1}</option>
              <option value="S2">{t.semester2}</option>
            </select>
          </div>

          <div className="pd-date" style={styles.dateBox}>
            <CalendarDays size={18} />
            <div>
              <div style={styles.dateLabel}>{t.dateOfLastUpdate}</div>
              <div style={styles.dateValue}>{dateAffichee}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ LAYOUT GLOBAL ============ */}
      <div className="pd-layout">
        {/* COLONNE GAUCHE */}
        <div className="pd-left">
          {/* RÉALISATIONS CLÉS */}
          <div style={styles.leftBlock}>
            <div style={styles.sectionTitle}>
              <TrendingUp size={26} />
              <span>{t.keyAchievements}</span>
            </div>

            <div className="pd-grid">
              <KpiCard
                title={t.municipalBudgets}
                value={fmtNombre(ind["R1.1"].valeur)}
                unit={t.communes}
                {...kpi("R1.1", t.communes)}
                type="circle"
              />
              <KpiCard
                title={t.reductionBurnedAreas}
                value={`${fmtNombre(ind["R1.2"].valeur)} %`}
                unit={t.reduction}
                {...kpi("R1.2", "%")}
                icon={<Flame size={42} />}
              />
              <KpiCard
                title={t.ecosystems}
                value={fmtNombre(ind["R2.1"].valeur)}
                unit={t.ha}
                {...kpi("R2.1", t.ha)}
                icon={<Trees size={42} />}
              />
              <KpiCard
                title={t.smallholders}
                value={fmtNombre(ind["R2.2"].valeur)}
                unit={t.beneficiaries}
                {...kpi("R2.2", t.beneficiaries)}
                icon={<Users size={42} />}
              />
            </div>
          </div>

          {/* RÉSULTATS CLÉS */}
          <div style={styles.resultSection}>
            <div style={styles.sectionTitle}>
              <TrendingUp size={26} />
              <span>{t.keyResults}</span>
            </div>

            <div className="pd-grid">
              <ResultCard
                icon={<Monitor size={20} />}
                title={t.regionsMonitoring}
                value={fmtNombre(ind["R1.1.1"].valeur)}
                unit={t.regions}
                {...kpi("R1.1.1", t.regions)}
              />
              <ResultCard
                icon={<Home size={20} />}
                title={t.adoptedMeasures}
                value={fmtNombre(ind["R1.1.2"].valeur)}
                unit={t.measures}
                {...kpi("R1.1.2", t.communes)}
              />
              <ResultCard
                icon={<FileText size={20} />}
                title={t.cosapDecisions}
                value={fmtNombre(ind["R1.2.1"].valeur)}
                unit={t.decisions}
                {...kpi("R1.2.1", t.decisions)}
              />
              <ResultCard
                icon={<Leaf size={20} />}
                title={t.regionalPackages}
                value={fmtNombre(ind["R1.2.2"].valeur)}
                unit={t.packages}
                {...kpi("R1.2.2", t.packages)}
              />
            </div>
          </div>

          <div style={styles.realisationSection}>
            <div style={styles.kpiGroup}>
              <div className="pd-grid">
                <RealKpi
                  title={t.sustainableAgropastoral}
                  value={fmtNombre(ind["R2.1.1"].valeur)}
                  unit={t.ha}
                  {...kpi("R2.1.1", t.ha)}
                  icon={<Tractor size={30} />}
                />
                <RealKpi
                  title={t.sustainableForest}
                  value={fmtNombre(ind["R2.1.2"].valeur)}
                  unit={t.ha}
                  {...kpi("R2.1.2", t.ha)}
                  icon={<Trees size={30} />}
                />
                <RealKpi
                  title={t.improvedProducers}
                  value={fmtNombre(ind["R2.2.1"].valeur)}
                  unit={t.producers}
                  {...kpi("R2.2.1", t.producers)}
                  icon={<Users size={30} />}
                />
                <RealKpi
                  title={t.agrMicroBusinesses}
                  value={fmtNombre(ind["R2.2.2"].valeur)}
                  unit={t.companies}
                  {...kpi("R2.2.2", t.companies)}
                  icon={<Cog size={30} />}
                />
              </div>
            </div>

            <div style={styles.analyticsGroup}>
              <div className="pd-grid" style={{ gridAutoRows: "auto" }}>
                <div style={styles.chartCard}>
                  <DonutChart
                    title={t.beneficiariesByGender}
                    data={[
                      { name: t.men, value: tab.genre.hommes, color: '#16a34a' },
                      { name: t.women, value: tab.genre.femmes, color: '#eab308' },
                    ]}
                    centerText={fmtNombre(tab.beneficiaires)}
                    centerLabel={t.producers}
                  />
                </div>

                <div style={styles.chartCard}>
                  <DonutChart
                    title={t.youngBeneficiaries}
                    data={[
                      { name: t.under_18, value: tab.ages[0], color: '#ef4444' },
                      { name: t.between_18_35, value: tab.ages[1], color: '#22c55e' },
                      { name: t.between_36_59, value: tab.ages[2], color: '#2563eb' },
                      { name: t.more_60, value: tab.ages[3], color: '#f97316' },
                    ]}
                    centerText={fmtNombre(tab.beneficiaires)}
                    centerLabel={t.producers}
                  />
                </div>

                <div style={styles.chartCard}>
                  <DonutChart
                    title={t.indicatorStatus}
                    showPercentage={false}
                    data={[
                      { name: t.under25, value: tab.statuts[0], color: '#ef4444' },
                      { name: t.between25_50, value: tab.statuts[1], color: '#f59e0b' },
                      { name: t.between50_75, value: tab.statuts[2], color: '#16a34a' },
                      { name: t.over75, value: tab.statuts[3], color: '#2563eb' },
                    ]}
                    centerText={String(tab.nbIndicateurs)}
                  />
                </div>

                <div style={styles.chartCard}>
                  <GaugeKpi
                    value={tab.avancementGlobal}
                    title={t.globalProjectProgress}
                    label={t.globalProgress}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="pd-right">
          <div style={styles.sectionTitle}>
            <MapPinned size={26} />
            <span>{t.interventionZone}</span>
            <button type="button" onClick={() => setShowLogin(true)} style={styles.updateButton}>
              <RefreshCw size={16} />
              <span>{t.update}</span>
            </button>
          </div>

          <div className="pd-map" style={styles.mapCard}>
            <MapContainer
              center={[-18.8792, 47.5079]}
              zoom={6}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution="© ESRI"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              />
              <ScaleControl position="bottomleft" imperial={false} />

              {/* Ordre des couches important : régions, puis aires protégées, puis bureaux */}
              {hasRegions && (
                <>
                  <RegionLayer
                    key={`${selectedAntenne}-${geoFiltered?.features?.length}`}
                    data={geoFiltered}
                  />
                  {(aireProtegeeFiltered?.features?.length ?? 0) > 0 && (
                    <AireProtegeeLayer
                      key={`${selectedAntenne}-ap`}
                      data={aireProtegeeFiltered}
                      selectedAntenne={selectedAntenne}
                    />
                  )}
                  {(bureauFiltered?.features?.length ?? 0) > 0 && (
                    <BureauLayer key={selectedAntenne || "all-bureau"} data={bureauFiltered} />
                  )}
                  <AutoZoom geoData={geoFiltered} />
                </>
              )}

              <LegendControl
                antennes={antennes}
                legendText={t.legend}
                officeText={t.office}
                protectedAreaText={t.protectedArea}
              />
            </MapContainer>
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(name: string, jeton: string) => {
            setUserName(name);
            setToken(jeton);
            setShowLogin(false);
            setShowUpdate(true);
          }}
        />
      )}
      {showUpdate && (
        <UpdateIndicateursModal
          onClose={() => { setShowUpdate(false); setToken(""); }}
          userName={userName}
          token={token}
          base={base}
          anneeParDefaut={annee}
          antenneParDefaut={selectedAntenne}
          onImported={chargerDate}
        />
      )}
    </div>
  );
}

/* ================= COMPOSANTS ================= */

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={styles.barRow}>
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${clampPct(percent)}%`, background: color }} />
      </div>
      <span style={styles.percentText}>{percent}%</span>
    </div>
  );
}

function KpiCard({ title, value, unit, percent, target, color, icon, type }: any) {
  return (
    <div style={styles.card}>
      <div style={styles.kpiTitle}>{title}</div>

      <div style={styles.row}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.value}>{value}</div>
          <div style={styles.unit}>{unit}</div>
        </div>

        {type === 'circle' ? (
          <div style={{ ...styles.circle, background: `conic-gradient(${color} ${clampPct(percent)}%, #eee 0)` }}>
            <div style={styles.circleInner}>{percent}%</div>
          </div>
        ) : (
          <div style={{ color, flexShrink: 0 }}>{icon}</div>
        )}
      </div>

      <ProgressBar percent={percent} color={color} />
      <div style={styles.target}>{target}</div>
    </div>
  );
}

function ResultCard({ icon, title, value, unit, percent, target, color }: any) {
  // La couleur vient maintenant de couleurPct (comme les autres cartes),
  // au lieu d'un second jeu de seuils codé en dur.
  return (
    <div style={styles.resultCard}>
      <div style={styles.resultTitle}>{title}</div>

      <div style={styles.resultTop}>
        <div style={styles.resultContent}>
          <div style={styles.resultValue}>{value}</div>
          <div style={styles.resultUnit}>{unit}</div>
        </div>

        <div
          style={{
            ...styles.resultIcon,
            color,
            background: `${color}20`,
            border: `1px solid ${color}40`,
          }}
        >
          {icon}
        </div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <ProgressBar percent={percent} color={color} />
      </div>
      <div style={styles.resultTarget}>{target}</div>
    </div>
  );
}

function RealKpi({ title, value, unit, target, percent, color, icon }: any) {
  return (
    <div style={styles.realCard}>
      <div style={styles.realTitle}>{title}</div>

      <div style={styles.realTop}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.realValue}>{value}</div>
          <div style={styles.realUnit}>{unit}</div>
        </div>

        <div style={{ ...styles.realIcon, background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {icon}
        </div>
      </div>

      <ProgressBar percent={percent} color={color} />
      <div style={styles.target}>{target}</div>
    </div>
  );
}

function GaugeKpi({ value, title, label }: any) {
  const clamp = clampPct(value);
  // Même échelle de couleurs que les barres et le donut « statut » (avant : seuils 30/55 différents).
  const color = couleurPct(clamp);
  const data = [{ value: clamp }, { value: 100 - clamp }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: 220 }}>
      <div style={styles.chartTitle}>{title}</div>

      <div style={{ width: '100%', height: 170, position: 'relative', marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} startAngle={180} endAngle={0} innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{clamp}%</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({ title, data, centerText, centerLabel, showPercentage = true }: any) {
  return (
    <div style={styles.donutCard}>
      <div style={styles.chartTitle}>{title}</div>

      <div style={styles.donutWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={1}
              stroke="#ffffff"
              strokeWidth={3}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
                if (!value) return null; // pas d'étiquette « 0% » superposée aux autres
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: 12, fontWeight: 800 }}>
                    {showPercentage ? `${value}%` : value}
                  </text>
                );
              }}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div style={styles.donutCenter}>
          <div style={styles.donutCenterValue}>{centerText}</div>
          {centerLabel && <div style={styles.donutCenterLabel}>{centerLabel}</div>}
        </div>
      </div>

      <div style={styles.legendModern}>
        {data.map((d: any, i: number) => (
          <div key={i} style={styles.legendModernItem}>
            <span style={{ ...styles.legendDot, background: d.color }} />
            <span style={styles.legendText}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= STYLES =================
   Plus de isMobile / isTablet calculés au chargement du module (ils ne réagissaient
   ni au redimensionnement ni à la rotation) : toute la partie « grille / hauteur »
   est dans RESPONSIVE_CSS. */

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '2px 4px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxSizing: 'border-box',
  },

  /* HEADER */
  header: {
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  title: { margin: 0, fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 800, color: '#14532d' },
  headerFilters: { display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  filterLabel: { fontSize: 11, fontWeight: 700, color: '#14532d' },
  select: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    fontWeight: 600,
    color: '#111827',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 110,
  },
  // Avant : fond blanc à 12 % d'opacité sur fond clair = boîte invisible.
  dateBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fff',
    border: '1px solid #e5e7eb',
    color: '#14532d',
    padding: '8px 14px',
    borderRadius: 10,
  },
  dateLabel: { fontSize: 11, opacity: 0.8 },
  dateValue: { fontSize: 12, fontWeight: 700 },

  /* BLOCS */
  leftBlock: { background: '#fff', padding: 10, borderRadius: 10, textAlign: 'center', minWidth: 0 },
  sectionTitle: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontWeight: 800,
    marginBottom: 10,
    color: '#14532d',
  },
  updateButton: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '8px 12px',
    border: 'none',
    borderRadius: 8,
    background: '#14532d',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 5px rgba(20, 83, 45, 0.2)',
  },
  mapCard: { borderRadius: 8, overflow: 'hidden' },

  /* KPI */
  card: {
    background: '#fafafa',
    borderRadius: 8,
    padding: 8,
    minHeight: 130,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 4,
    textAlign: 'center',
    overflow: 'hidden',
    minWidth: 0,
  },
  kpiTitle: { fontSize: 11, fontWeight: 800, color: '#111', textAlign: 'center', width: '100%', overflowWrap: 'anywhere' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  value: { fontSize: 16, fontWeight: 800 },
  unit: { fontSize: 11, color: '#666' },
  circle: { width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  circleInner: {
    fontSize: 9, fontWeight: 800, background: '#fff', width: 24, height: 24,
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  barRow: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 },
  barBg: { background: '#e5e7eb', flex: 1, height: 8, borderRadius: 6, overflow: 'hidden', minWidth: 0 },
  barFill: { height: '100%', borderRadius: 10 },
  percentText: { fontSize: 11, fontWeight: 700, color: '#111', minWidth: 34, textAlign: 'right' },
  target: { fontSize: 10, marginTop: 3, color: '#666', overflowWrap: 'anywhere' },

  /* RÉSULTATS CLÉS */
  resultSection: { background: '#fff', padding: 10, borderRadius: 10, minWidth: 0 },
  resultCard: {
    background: '#fff',
    borderRadius: 10,
    gap: 4,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    padding: 6,
    minHeight: 120,
    minWidth: 0,
  },
  resultTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', gap: 6 },
  resultTitle: { fontSize: 11, fontWeight: 700, color: '#111827', lineHeight: 1.2, textAlign: 'center', width: '100%', marginBottom: 6, overflowWrap: 'anywhere' },
  resultContent: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, minWidth: 0 },
  resultValue: { fontSize: 16, fontWeight: 800, color: '#14532d' },
  resultUnit: { fontSize: 11, color: '#6b7280' },
  resultTarget: { fontSize: 10, marginTop: 4, padding: '0 8px', color: '#6b7280', overflowWrap: 'anywhere' },
  resultIcon: {
    width: 42, height: 42, minWidth: 42, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },

  /* RÉALISATIONS */
  realisationSection: { width: '100%', background: 'transparent', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 },
  kpiGroup: {
    background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10,
    width: '100%', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box',
  },
  realCard: {
    display: 'flex', flexDirection: 'column', background: '#fafafa', padding: 10, gap: 4,
    borderRadius: 10, justifyContent: 'space-between', minWidth: 0, overflow: 'hidden',
  },
  realTitle: { fontSize: 11, fontWeight: 700, textAlign: 'center', width: '100%', overflowWrap: 'anywhere' },
  realTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', gap: 6 },
  realValue: { fontSize: 18, fontWeight: 800 },
  realUnit: { fontSize: 11, color: '#666' },
  realIcon: {
    width: 42, height: 42, minWidth: 42, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)', flexShrink: 0,
  },

  /* GRAPHIQUES */
  analyticsGroup: {
    background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10,
    display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
  },
  chartCard: {
    background: '#fff', borderRadius: 10, padding: 8, display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
    minWidth: 0, overflow: 'hidden',
  },
  chartTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4, lineHeight: 1.2, textAlign: 'center' },
  // Hauteur fixe (220) supprimée : la légende était coupée quand elle passait à la ligne.
  donutCard: { width: '100%', minHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  donutWrapper: { position: 'relative', width: '100%', height: 160 },
  donutCenter: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' },
  donutCenterValue: { fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 },
  donutCenterLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  legendModern: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 },
  legendModernItem: { display: 'flex', alignItems: 'center', gap: 5, padding: '1px 3px' },
  legendDot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
  legendText: { fontSize: 11, fontWeight: 600, color: '#374151' },
};
