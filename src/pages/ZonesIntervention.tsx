/**
 * ZonesIntervention.tsx — zones d'intervention des projets
 * Les données (projets, régions, districts, communes, activités, MBV) sont lues depuis
 * public/data/zones_intervention.geojson. La mise à jour se fait par le bouton « Mettre à jour »
 * (connexion requise), via ZonesUpdateModal.
 *
 * Nouveautés :
 *  - MBV du projet PADDI, lues depuis public/data/paddi_mbv.geojson. Elles ne s'affichent que si
 *    le projet PADDI est l'objet de la recherche, ou si son aire protégée est choisie, ou si le PADDI
 *    est choisi comme filtre dans une région, un district ou une commune ;
 *  - niveau de recherche « Aire protégée » ;
 *  - aires protégées et zone tampon 5 km (mêmes fichiers que la page feux : DATA.aires, DATA.peripheries) ;
 *  - une aire protégée affiche aussi les communes PADDI dont le territoire chevauche son polygone,
 *    même lorsqu'aucune MBV n'est enregistrée pour cette commune ;
 *  - dans une région, un district, une commune ou une aire protégée, cliquer sur un projet n'affiche
 *    que la zone d'intervention de ce projet dans la sélection (un nouveau clic annule le filtre).
 *
 * Suit le thème clair/sombre de l'application (variables CSS, comme AnalyseTerritoriale).
 * 4 langues (fr, mg, en, de). Fonds de carte : Topographie, Satellite, OpenStreetMap.
 * Dépendances : leaflet, @types/leaflet, lucide-react, ../context/LanguageContext, ../lib/fireGeo,
 *               ../components/ZonesLoginModal, ../components/ZonesUpdateModal
 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, Trees, Sprout, Leaf, MapPin, RotateCcw, Globe2, RefreshCw } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { DATA, PROP, useGeo, toZones, sameArea } from "../lib/fireGeo";
import ZonesLoginModal from "../components/ZonesLoginModal";
import ZonesUpdateModal from "../components/ZonesUpdateModal";

/* ===================== OUTIL DE COMPARAISON ===================== */

const cle = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/* Noms d'aires protégées : comparaison tolérante (accents, apostrophes droites ou typographiques,
   espaces, majuscules, nom contenu dans l'autre) + alias à compléter à la main.
   Clé = nom alternatif écrit en minuscules sans espace ni ponctuation ; valeur = nom usuel de la même façon. */
const ALIAS_AP: Record<string, string> = {
  ambohitra: "montagnedambre",
};
const canonAP = (v: unknown) => {
  const k = cle(String(v ?? ""));
  return ALIAS_AP[k] ?? k;
};
const memeNom = (a: unknown, b: unknown): boolean => {
  const x = canonAP(a), y = canonAP(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 6 && y.length >= 6 && (x.includes(y) || y.includes(x))) return true;
  return !!sameArea(String(a ?? ""), String(b ?? ""));
};

/* Retire les caractères dangereux avant insertion dans une infobulle HTML */
const esc = (v: unknown) => String(v ?? "").replace(/[<>&]/g, "");

/* ===================== TYPES ET DONNÉES ===================== */

/* Fichiers des données (lecture) et route d'enregistrement (écriture, avec jeton) */
const DATA_URL = "/data/zones_intervention.geojson";
const MBV_URL = "/data/paddi_mbv.geojson";
const SAUVEGARDE_URL = "/api/import?type=zones";

type TypeActivite = "restauration" | "reboisement" | "autre";
type Activite = { type: TypeActivite; titre: string; annee?: number; surface_ha?: number };
type TypeProjet = "environnement" | "developpement";
type ProjetMeta = { id: string; nom: string; alias: string[]; type: TypeProjet };

/* Une ligne = une zone d'intervention (commune, district ou région) d'un projet */
type Ligne = {
  projetId: string;
  projet: string;
  type: TypeProjet;
  region: string;
  district?: string;
  commune?: string;
  activites: Activite[];
  mbv_ha?: number;
};

type Donnees = { projets: ProjetMeta[]; lignes: Ligne[] };

const LIGNES_VIDES: Ligne[] = [];

/* Le projet est-il PADDI ? (reconnu par son id ou son nom, « PADDI+ » inclus) */
const estPaddi = (id: string, nom: string) => cle(id).includes("paddi") || cle(nom).includes("paddi");

/* Transforme le GeoJSON en données utilisables par la page */
const construireDonnees = (geo: any): Donnees => ({
  projets: (geo.projets ?? []) as ProjetMeta[],
  lignes: ((geo.features ?? []) as any[]).map((f): Ligne => {
    const p = f.properties ?? {};
    return {
      projetId: String(p.projet_id),
      projet: String(p.projet),
      type: p.type as TypeProjet,
      region: String(p.region),
      district: p.district || undefined,
      commune: p.commune || undefined,
      activites: (p.activites ?? []) as Activite[],
      mbv_ha: p.mbv_ha ?? undefined,
    };
  }),
});

/* Clé d'une ligne : région|district|commune (vides si absents) */
const cleLigne = (l: Ligne) =>
  [cle(l.region), l.district ? cle(l.district) : "", l.commune ? cle(l.commune) : ""].join("|");

/* Communes homonymes : pour la ligne (clé région|district|commune), nom de la géométrie à utiliser.
   Ex. : la commune « Marovoay » du district Marovoay (Boeny) correspond à la géométrie « Marosakoa »,
   et non à « Marovoay ville » ni à « Marovoay Banlieue ». */
const COMMUNE_GEO: Record<string, string> = {
  "boeny|marovoay|marosakoa": "Marovoay",
};

/* ===================== FONDS DE CARTE (sans clé API) ===================== */

type Fond = "topo" | "sat" | "osm";
const FONDS: Record<Fond, { url: string; attr: string; maxZoom: number }> = {
  topo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri",
    maxZoom: 18,
  },
  sat: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "Tiles © Esri",
    maxZoom: 18,
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "© OpenStreetMap",
    maxZoom: 19,
  },
};

/* ===================== TEXTES (fr, mg, en, de) ===================== */

const FR = {
  titre: "Zones d'intervention des projets",
  sousTitre: "Localisation des régions, districts et communes où interviennent les projets",
  recherche: "Projet, catégorie, aire protégée, paysage, micro-bassin versant, région, district ou commune (ex. PADDI+, Ankarana, Boeny)",
  rechercheAria: "Rechercher une zone d'intervention",
  effacer: "Effacer",
  retirer: "Retirer de la liste",
  update: "Mettre à jour",
  vueMada: "Vue Madagascar",
  vueTitre: "Zones d'intervention",
  vueTexte: "Recherchez un projet, une catégorie, une aire protégée, un paysage, un micro-bassin versant, une région, un district ou une commune, ou cliquez sur un projet ci-dessous.",
  chargement: "Chargement des données…",
  aucunResultat: "Aucun résultat pour cette recherche.",
  projets: "Projets",
  regions: "Régions",
  districts: "Districts",
  communes: "Communes",
  parCommune: "Par commune",
  colCommune: "Commune",
  colSuperficie: "Superficie (ha)",
  colMBV: "Superficie MBV (ha)",
  colPourcentage: "Part de la commune",
  total: "Total",
  activites: "Activités environnementales",
  aucuneActivite: "Aucune activité renseignée",
  zonesInterv: "Zones d'intervention",
  communesNon: "Communes non renseignées",
  districtsNon: "Districts non renseignés",
  types: { restauration: "Restauration", reboisement: "Reboisement", autre: "Autres projets environnementaux" },
  niveaux: { projet: "Projet", categorie: "Catégorie", region: "Région", district: "District", commune: "Commune", ap: "Aire protégée", mbv: "Micro-bassin versant", paysage: "Paysage" },
  projetCtx: "Projet d'intervention",
  catCtx: "Catégorie de projets",
  catEnv: "Projets environnementaux",
  catDev: "Projets de développement",
  regionCtx: "Région",
  apCtx: "Aire protégée",
  legRegion: "Région",
  legDistrict: "District",
  legCommune: "Commune",
  legAP: "Aire protégée",
  legMbv: "MBV (PADDI)",
  legPeriph: "Zone tampon 5 km",
  legMixte: "Environnement et développement",
  legSelection: "Sélection",
  mbvTitre: "Micro-bassin versant du projet PADDI",
  colMbv: "Micro-bassin versant",
  colPaysage: "Paysage",
  colAP: "Aire protégée",
  carteAria: "Carte des zones d'intervention",
  carteTitre: "Madagascar : zones d'intervention",
  projetsConcernes: "Projets concernés",
  projetsAucun: "Aucun projet pour cette sélection",
  filtreActif: "Cliquer à nouveau pour voir tous les projets",
  fondAria: "Fond de carte",
  fondTopo: "Topographie",
  fondSat: "Satellite",
  fondOsm: "OpenStreetMap",
  note: "Limites : geoBoundaries (ADM1 à ADM3). Superficies calculées à partir des contours, donc approximatives.",
  erreur: "Impossible de charger les limites administratives.",
  erreurDonnees: "Impossible de charger les données des zones d'intervention.",
};

type Dict = typeof FR;

const MG: Dict = {
  titre: "Faritra fanatanterahan'ny tetikasa",
  sousTitre: "Fitoerana ny faritra, distrika sy kaominina misy ny tetikasa",
  recherche: "Tetikasa, sokajy, faritra arovana, paysage, micro-bassin versant, faritra, distrika na kaominina (ohatra: PADDI+, Ankarana, Boeny)",
  rechercheAria: "Hitady faritra fanatanterahana",
  effacer: "Esory",
  retirer: "Esorina amin'ny lisitra",
  update: "Havaozina",
  vueMada: "Madagasikara manontolo",
  vueTitre: "Faritra fanatanterahana",
  vueTexte: "Hitady tetikasa, sokajy, faritra arovana, paysage, micro-bassin versant, faritra, distrika na kaominina, na tsindrio ny tetikasa etsy ambany.",
  chargement: "Mampidina ny angon-drakitra…",
  aucunResultat: "Tsy misy valiny ho an'ity fikarohana ity.",
  projets: "Tetikasa",
  regions: "Faritra",
  districts: "Distrika",
  communes: "Kaominina",
  parCommune: "Isaky ny kaominina",
  colCommune: "Kaominina",
  colSuperficie: "Habetsahana (ha)",
  colMBV: "Habetsahana MBV (ha)",
  colPourcentage: "Anjara amin'ny kaominina",
  total: "Totaly",
  activites: "Asa ara-tontolo iainana",
  aucuneActivite: "Tsy misy asa voarakitra",
  zonesInterv: "Faritra fanatanterahana",
  communesNon: "Kaominina tsy voarakitra",
  districtsNon: "Distrika tsy voarakitra",
  types: { restauration: "Fanarenana", reboisement: "Fambolena ala", autre: "Tetikasa hafa momba ny tontolo iainana" },
  niveaux: { projet: "Tetikasa", categorie: "Sokajy", region: "Faritra", district: "Distrika", commune: "Kaominina", ap: "Faritra arovana", mbv: "Micro-bassin versant", paysage: "Paysage" },
  projetCtx: "Tetikasa fanatanterahana",
  catCtx: "Sokajin'ny tetikasa",
  catEnv: "Tetikasa ara-tontolo iainana",
  catDev: "Tetikasa fampandrosoana",
  regionCtx: "Faritra",
  apCtx: "Faritra arovana",
  legRegion: "Faritra",
  legDistrict: "Distrika",
  legCommune: "Kaominina",
  legAP: "Faritra arovana",
  legMbv: "MBV (PADDI)",
  legPeriph: "Faritra manodidina 5 km",
  legMixte: "Tontolo iainana sy fampandrosoana",
  legSelection: "Voafantina",
  mbvTitre: "Micro-bassin versant an'ny tetikasa PADDI",
  colMbv: "Micro-bassin versant",
  colPaysage: "Paysage",
  colAP: "Faritra arovana",
  carteAria: "Sarintanin'ny faritra fanatanterahana",
  carteTitre: "Madagasikara: faritra fanatanterahana",
  projetsConcernes: "Tetikasa voakasika",
  projetsAucun: "Tsy misy tetikasa ho an'ity fifantenana ity",
  filtreActif: "Tsindrio indray mba hahitana ny tetikasa rehetra",
  fondAria: "Fototra sarintany",
  fondTopo: "Topografia",
  fondSat: "Zanabolana",
  fondOsm: "OpenStreetMap",
  note: "Sisin-tany: geoBoundaries (ADM1 ka hatramin'ny ADM3). Ny habetsahana dia tombanana avy amin'ny sisin-tany, ka mety tsy marina tanteraka.",
  erreur: "Tsy afaka naka ny sisin-tany administratifa.",
  erreurDonnees: "Tsy afaka naka ny angon-drakitra momba ny faritra fanatanterahana.",
};

const EN: Dict = {
  titre: "Project intervention zones",
  sousTitre: "Location of the regions, districts and communes where the projects operate",
  recherche: "Project, category, protected area, landscape, micro-watershed, region, district or commune (e.g. PADDI+, Ankarana, Boeny)",
  rechercheAria: "Search an intervention zone",
  effacer: "Clear",
  retirer: "Remove from list",
  update: "Update",
  vueMada: "Madagascar view",
  vueTitre: "Intervention zones",
  vueTexte: "Search for a project, category, protected area, landscape, micro-watershed, region, district or commune, or click a project below.",
  chargement: "Loading data…",
  aucunResultat: "No result for this search.",
  projets: "Projects",
  regions: "Regions",
  districts: "Districts",
  communes: "Communes",
  parCommune: "By commune",
  colCommune: "Commune",
  colSuperficie: "Area (ha)",
  colMBV: "MBV area (ha)",
  colPourcentage: "Share of commune",
  total: "Total",
  activites: "Environmental activities",
  aucuneActivite: "No activity recorded",
  zonesInterv: "Intervention zones",
  communesNon: "Communes not recorded",
  districtsNon: "Districts not recorded",
  types: { restauration: "Restoration", reboisement: "Reforestation", autre: "Other environmental projects" },
  niveaux: { projet: "Project", categorie: "Category", region: "Region", district: "District", commune: "Commune", ap: "Protected area", mbv: "Micro-watershed", paysage: "Landscape" },
  projetCtx: "Intervention project",
  catCtx: "Project category",
  catEnv: "Environmental projects",
  catDev: "Development projects",
  regionCtx: "Region",
  apCtx: "Protected area",
  legRegion: "Region",
  legDistrict: "District",
  legCommune: "Commune",
  legAP: "Protected area",
  legMbv: "MBV (PADDI)",
  legPeriph: "5 km buffer zone",
  legMixte: "Environment and development",
  legSelection: "Selection",
  mbvTitre: "PADDI project micro-watershed",
  colMbv: "Micro-watershed",
  colPaysage: "Landscape",
  colAP: "Protected area",
  carteAria: "Intervention zones map",
  carteTitre: "Madagascar: intervention zones",
  projetsConcernes: "Projects involved",
  projetsAucun: "No project for this selection",
  filtreActif: "Click again to show all projects",
  fondAria: "Basemap",
  fondTopo: "Topographic",
  fondSat: "Satellite",
  fondOsm: "OpenStreetMap",
  note: "Boundaries: geoBoundaries (ADM1 to ADM3). Areas are computed from the outlines, so they are approximate.",
  erreur: "Unable to load the administrative boundaries.",
  erreurDonnees: "Unable to load the intervention zone data.",
};

const DE: Dict = {
  titre: "Interventionsgebiete der Projekte",
  sousTitre: "Lage der Regionen, Distrikte und Gemeinden, in denen die Projekte tätig sind",
  recherche: "Projekt, Kategorie, Schutzgebiet, Landschaft, Mikro-Einzugsgebiet, Region, Distrikt oder Gemeinde (z. B. PADDI+, Ankarana, Boeny)",
  rechercheAria: "Interventionsgebiet suchen",
  effacer: "Leeren",
  retirer: "Aus der Liste entfernen",
  update: "Aktualisieren",
  vueMada: "Ansicht Madagaskar",
  vueTitre: "Interventionsgebiete",
  vueTexte: "Suchen Sie ein Projekt, eine Kategorie, ein Schutzgebiet, eine Landschaft, ein Mikro-Einzugsgebiet, eine Region, einen Distrikt oder eine Gemeinde, oder klicken Sie unten auf ein Projekt.",
  chargement: "Daten werden geladen…",
  aucunResultat: "Kein Ergebnis für diese Suche.",
  projets: "Projekte",
  regions: "Regionen",
  districts: "Distrikte",
  communes: "Gemeinden",
  parCommune: "Nach Gemeinde",
  colCommune: "Gemeinde",
  colSuperficie: "Fläche (ha)",
  colMBV: "MBV-Fläche (ha)",
  colPourcentage: "Anteil der Gemeinde",
  total: "Gesamt",
  activites: "Umweltaktivitäten",
  aucuneActivite: "Keine Aktivität erfasst",
  zonesInterv: "Interventionsgebiete",
  communesNon: "Gemeinden nicht erfasst",
  districtsNon: "Distrikte nicht erfasst",
  types: { restauration: "Wiederherstellung", reboisement: "Aufforstung", autre: "Andere Umweltprojekte" },
  niveaux: { projet: "Projekt", categorie: "Kategorie", region: "Region", district: "Distrikt", commune: "Gemeinde", ap: "Schutzgebiet", mbv: "Mikro-Einzugsgebiet", paysage: "Landschaft" },
  projetCtx: "Interventionsprojekt",
  catCtx: "Projektkategorie",
  catEnv: "Umweltprojekte",
  catDev: "Entwicklungsprojekte",
  regionCtx: "Region",
  apCtx: "Schutzgebiet",
  legRegion: "Region",
  legDistrict: "Distrikt",
  legCommune: "Gemeinde",
  legAP: "Schutzgebiet",
  legMbv: "MBV (PADDI)",
  legPeriph: "5-km-Pufferzone",
  legMixte: "Umwelt und Entwicklung",
  legSelection: "Auswahl",
  mbvTitre: "Mikro-Einzugsgebiet des PADDI-Projekts",
  colMbv: "Mikro-Einzugsgebiet",
  colPaysage: "Landschaft",
  colAP: "Schutzgebiet",
  carteAria: "Karte der Interventionsgebiete",
  carteTitre: "Madagaskar: Interventionsgebiete",
  projetsConcernes: "Beteiligte Projekte",
  projetsAucun: "Kein Projekt für diese Auswahl",
  filtreActif: "Erneut klicken, um alle Projekte anzuzeigen",
  fondAria: "Kartengrundlage",
  fondTopo: "Topografie",
  fondSat: "Satellit",
  fondOsm: "OpenStreetMap",
  note: "Grenzen: geoBoundaries (ADM1 bis ADM3). Flächen werden aus den Umrissen berechnet und sind daher ungefähr.",
  erreur: "Die Verwaltungsgrenzen konnten nicht geladen werden.",
  erreurDonnees: "Die Daten der Interventionsgebiete konnten nicht geladen werden.",
};

type Lang = "fr" | "mg" | "en" | "de";
const T: Record<Lang, Dict> = { fr: FR, mg: MG, en: EN, de: DE };
const LOCALE: Record<Lang, string> = { fr: "fr-FR", mg: "fr-FR", en: "en-US", de: "de-DE" };

/* ===================== RECHERCHE ===================== */

type Niveau = "projet" | "categorie" | "region" | "district" | "commune" | "ap" | "mbv" | "paysage";

type Sel = {
  niveau: Niveau;
  label: string;
  cle: string;
  recherche: string;
  projetId?: string;
  categorie?: TypeProjet;
  mots?: string[];
  regionCle?: string;
  districtCle?: string;
  regionNom?: string;
  districtNom?: string;
  apNom?: string;
};

/* Arborescence pour le panneau « Zones d'intervention » */
type Noeud = { nom: string; districts: { nom: string; communes: string[] }[] };

const RANG: Record<Niveau, number> = { categorie: -1, projet: 0, ap: 0.5, mbv: 0.6, paysage: 0.55, region: 1, district: 2, commune: 3 };

const TYPE_ICONE: Record<TypeActivite, { couleur: string; icone: typeof Leaf }> = {
  restauration: { couleur: "#65a30d", icone: Sprout },
  reboisement: { couleur: "#15803d", icone: Trees },
  autre: { couleur: "#0891b2", icone: Leaf },
};

const idSug = (s: Sel) => [s.niveau, s.regionCle, s.districtCle, s.cle].join("|");

/* Suggestions : catégories, projets, aires protégées, puis régions, districts et communes */
const construireSuggestions = (
  d: Donnees,
  aps: { nom: string; region?: string }[] = [],
  mbvs: { nom: string; ap: string; region?: string }[] = [],
  paysages: { nom: string; ap: string; region?: string }[] = []
): Sel[] => {
  const vues = new Map<string, Sel>();
  const ajouter = (s: Sel) => {
    const k = idSug(s);
    if (!vues.has(k)) vues.set(k, s);
  };
  ajouter({
    niveau: "categorie",
    label: "Projets environnementaux",
    cle: "environnement",
    recherche: "environnement environnemental environnementaux environnementale",
    categorie: "environnement",
    mots: ["environnement", "environnemental", "environnementaux", "environnementale"],
  });
  ajouter({
    niveau: "categorie",
    label: "Projets de développement",
    cle: "developpement",
    recherche: "developpement developpementrural rural",
    categorie: "developpement",
    mots: ["developpement", "developpementrural", "rural"],
  });
  d.projets.forEach((p) =>
    ajouter({
      niveau: "projet",
      label: p.nom,
      cle: cle(p.id),
      recherche: [p.nom, ...p.alias].map(cle).join(" "),
      projetId: p.id,
    })
  );
  aps.forEach((a) =>
    ajouter({ niveau: "ap", label: a.nom, cle: cle(a.nom), recherche: cle(a.nom), regionNom: a.region })
  );
  d.lignes.forEach((l) => {
    const rk = cle(l.region);
    ajouter({ niveau: "region", label: l.region, cle: rk, regionCle: rk, recherche: rk, regionNom: l.region });
    if (l.district) {
      const dk = cle(l.district);
      ajouter({
        niveau: "district",
        label: l.district,
        cle: dk,
        regionCle: rk,
        recherche: dk,
        regionNom: l.region,
        districtNom: l.district,
      });
      if (l.commune) {
        const ck = cle(l.commune);
        ajouter({
          niveau: "commune",
          label: l.commune,
          cle: ck,
          regionCle: rk,
          districtCle: dk,
          recherche: ck,
          regionNom: l.region,
          districtNom: l.district,
        });
      }
    }
  });
  paysages.forEach((m) =>
    ajouter({
      niveau: "paysage",
      label: m.nom,
      cle: cle(m.nom),
      recherche: cle(m.nom),
      apNom: m.ap,
      regionNom: m.region,
    })
  );
  /* MBV en dernier : un nom identique à une commune ne doit pas la masquer */
  mbvs.forEach((m) =>
    ajouter({
      niveau: "mbv",
      label: m.nom,
      cle: cle(`${m.ap}${m.nom}`),
      recherche: cle(m.nom),
      apNom: m.ap,
      regionNom: m.region,
    })
  );
  return [...vues.values()];
};

const contexteDe = (s: Sel, t: Dict) =>
  s.niveau === "mbv" || s.niveau === "paysage"
    ? [s.apNom, s.regionNom].filter(Boolean).join(" · ")
    : s.niveau === "ap"
    ? `${t.apCtx}${s.regionNom ? ` · ${s.regionNom}` : ""}`
    : s.niveau === "projet"
    ? t.projetCtx
    : s.niveau === "categorie"
    ? t.catCtx
    : s.niveau === "region"
    ? t.regionCtx
    : s.niveau === "district"
    ? `${t.regionCtx} ${s.regionNom}`
    : `${s.regionNom} · ${s.districtNom}`;

/* Libellé traduit d'une suggestion (les catégories changent de langue, les noms propres non) */
const libelleDe = (s: Sel, t: Dict) =>
  s.niveau === "categorie" ? (s.categorie === "environnement" ? t.catEnv : t.catDev) : s.label;

function correspond(l: Ligne, s: Sel): boolean {
  const rk = cle(l.region);
  switch (s.niveau) {
    case "categorie":
      return l.type === s.categorie;
    case "projet":
      return l.projetId === s.projetId;
    case "region":
      return rk === s.cle;
    case "district":
      return rk === s.regionCle && !!l.district && cle(l.district) === s.cle;
    case "commune":
      return (
        rk === s.regionCle &&
        !!l.district &&
        cle(l.district) === s.districtCle &&
        !!l.commune &&
        cle(l.commune) === s.cle
      );
    case "mbv":
    case "paysage":
    case "ap":
      /* L'aire protégée est traitée à part (test spatial avec les MBV) */
      return false;
  }
}

/* ===================== GÉOMÉTRIE ET LIMITES ===================== */

type Feat = { properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type Niv = "ADM1" | "ADM2" | "ADM3";

const REV = "9469f09";
const GH = "wmgeolab/geoBoundaries";
const MADA: L.LatLngBoundsExpression = [[-25.9, 43.0], [-11.8, 50.7]];

const nomFeat = (f: Feat): string =>
  String(
    f.properties.shapeName ??
      f.properties.name ??
      Object.values(f.properties).find((v) => typeof v === "string") ??
      ""
  );

const polygones = (f: Feat): number[][][][] =>
  f.geometry.type === "Polygon"
    ? [f.geometry.coordinates]
    : f.geometry.type === "MultiPolygon"
    ? f.geometry.coordinates
    : [];

function dansAnneau(x: number, y: number, a: number[][]): boolean {
  let dedans = false;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [xi, yi] = a[i];
    const [xj, yj] = a[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

const contient = (x: number, y: number, f: Feat) =>
  polygones(f).some((p) => dansAnneau(x, y, p[0]) && !p.slice(1).some((h) => dansAnneau(x, y, h)));

function estDans(enfant: Feat, parent: Feat): boolean {
  const pts = polygones(enfant).flatMap((p) => p[0]);
  if (!pts.length) return false;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let score = contient(cx, cy, parent) ? 3 : 0;
  const pas = Math.max(1, Math.floor(pts.length / 6));
  for (let i = 0; i < pts.length && i < pas * 6; i += pas) {
    if (contient(pts[i][0], pts[i][1], parent)) score++;
  }
  return score >= 5;
}

/** Superficie approximative d'un polygone, en hectares. */
function surfaceHa(f: Feat): number {
  const anneau = (r: number[][]) => {
    const k = Math.cos((r[0][1] * Math.PI) / 180) * 111.32;
    let s = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      s += r[j][0] * k * (r[i][1] * 110.54) - r[i][0] * k * (r[j][1] * 110.54);
    }
    return Math.abs(s / 2);
  };
  const km2 = polygones(f).reduce(
    (t, p) => t + anneau(p[0]) - p.slice(1).reduce((h, r) => h + anneau(r), 0),
    0
  );
  return km2 * 100;
}

/* Boîte englobante d'une géométrie (mise en cache) */
const bboxCache = new WeakMap<Feat, [number, number, number, number]>();
const bboxFeat = (f: Feat): [number, number, number, number] => {
  let b = bboxCache.get(f);
  if (!b) {
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    polygones(f).forEach((p) =>
      p[0].forEach(([x, y]) => {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      })
    );
    b = [x0, y0, x1, y1];
    bboxCache.set(f, b);
  }
  return b;
};

/** Vrai si au moins `seuil` des points échantillonnés de `enfant` sont dans `parent`. */
function chevauche(enfant: Feat, parent: Feat, seuil = 0.25): boolean {
  const a = bboxFeat(enfant), b = bboxFeat(parent);
  if (a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]) return false;
  const pts = polygones(enfant).flatMap((p) => p[0]);
  if (!pts.length) return false;
  const n = Math.min(16, pts.length), pas = pts.length / n;
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(i * pas)];
    if (contient(p[0], p[1], parent)) ok++;
  }
  return ok / n >= seuil;
}

/** Commune(s) où se trouve une géométrie (ex. une MBV), calculée avec les limites des communes.
 *  On teste le centre et 12 points ramenés vers l'intérieur (60 %) pour éviter les effets de bord ;
 *  la commune principale est toujours donnée, les autres seulement si elles couvrent au moins 25 % des points. */
function communesFeatDe(f: Feat, communes: Feat[]): Feat[] {
  const pts = polygones(f).flatMap((p) => p[0]);
  if (!pts.length || !communes.length) return [];
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const n = Math.min(12, pts.length), pas = pts.length / n;
  const echant: [number, number][] = [[cx, cy]];
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(i * pas)];
    echant.push([cx + (p[0] - cx) * 0.6, cy + (p[1] - cy) * 0.6]);
  }
  const [x0, y0, x1, y1] = bboxFeat(f);
  const hits = new Map<Feat, number>();
  communes.forEach((c) => {
    const b = bboxFeat(c);
    if (b[0] > x1 || b[2] < x0 || b[1] > y1 || b[3] < y0) return;
    let h = 0;
    echant.forEach(([x, y]) => {
      if (contient(x, y, c)) h++;
    });
    if (h) hits.set(c, h);
  });
  return [...hits.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, h], i) => i === 0 || h / echant.length >= 0.25)
    .map(([c]) => c);
}

/* Clé d'une MBV : aire protégée + nom */
const cleMbv = (f: Feat) => cle(`${f.properties.Aire_Prot ?? ""}${f.properties.Nom ?? ""}`);

const CACHE: Partial<Record<Niv, Feat[]>> = {};

async function charger(niv: Niv): Promise<Feat[]> {
  if (CACHE[niv]) return CACHE[niv]!;
  const f = `releaseData/gbOpen/MDG/${niv}/geoBoundaries-MDG-${niv}_simplified.geojson`;
  const urls = [
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`,
    `https://raw.githubusercontent.com/${GH}/${REV}/${f}`,
    `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texte = await r.text();
      if (texte.startsWith("version https://git-lfs")) throw new Error("LFS");
      const j = JSON.parse(texte);
      const feats = (j.features ?? []).filter(
        (x: Feat) => x?.geometry && /Polygon/.test(x.geometry.type)
      ) as Feat[];
      if (feats.length) {
        CACHE[niv] = feats;
        return feats;
      }
    } catch {
      /* source suivante */
    }
  }
  throw new Error(niv);
}

/* ===================== STYLES DE CARTE ===================== */

/* Couleur de la limite d'une région selon les types de projets qui y interviennent */
const COULEUR_TYPE: Record<TypeProjet | "mixte", string> = {
  environnement: "#b91c1c",
  developpement: "#1d4ed8",
  mixte: "#7c3aed",
};
const COULEUR_HORS = "#64748b";

/* Micro-bassins et zones tampon 5 km : affichés seulement à partir de ce zoom (en dessous : vue nationale) */
const ZOOM_DETAIL = 9;

/* Limite seule, sans fond (sauf les communes, remplies légèrement) */
function contour(
  g: L.LayerGroup,
  f: Feat,
  style: L.PathOptions,
  nom: string,
  classe: string | null,
  onClick?: () => void
) {
  const couc = L.geoJSON(f as any, { style });
  couc.bindTooltip(
    nom,
    classe
      ? { permanent: true, direction: "center", className: `zi-label ${classe}` }
      : { sticky: true, className: "zi-hover" }
  );
  if (onClick) couc.on("click", onClick);
  couc.addTo(g);
}

type ActiviteLocalisee = Activite & { region: string; district: string; commune: string };

const DONNEES_VIDES: Donnees = { projets: [], lignes: LIGNES_VIDES };

/* ===================== COMPOSANT ===================== */

export default function ZonesIntervention() {
  const { lang: brut } = useLanguage();
  const lang: Lang = (["fr", "mg", "en", "de"] as string[]).includes(brut as string) ? (brut as Lang) : "fr";
  const t = T[lang];

  const fmt = (n: number) => Math.round(n).toLocaleString(LOCALE[lang]);
  const fmtPct = (p: number | null) =>
    p != null ? `${p.toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 })} %` : "—";

  const elMap = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const couche = useRef<L.LayerGroup | null>(null);
  const fond = useRef<L.TileLayer | null>(null);

  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreurDonnees, setErreurDonnees] = useState(false);
  const [version, setVersion] = useState(0);
  const [regions, setRegions] = useState<Feat[]>([]);
  const [districts, setDistricts] = useState<Feat[]>([]);
  const [communes, setCommunes] = useState<Feat[]>([]);
  const [erreur, setErreur] = useState(false);
  const [requete, setRequete] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const [vide, setVide] = useState(false);
  const [typeFond, setTypeFond] = useState<Fond>("topo");
  const [masques, setMasques] = useState<Set<string>>(new Set());
  /* Liste ouverte en cliquant sur l'un des compteurs (projets, régions, districts, communes) */
  const [liste, setListe] = useState<null | "projets" | "regions" | "districts" | "communes">(null);
  /* Projet choisi comme filtre dans la sélection (région, district, commune, aire protégée…) */
  const [projetFiltre, setProjetFiltre] = useState<string | null>(null);
  /* Niveau de zoom de la carte (pour masquer les MBV et zones tampon en vue nationale) */
  const [zoom, setZoom] = useState(5);

  /* ----- mise à jour (connexion requise, comme le Dashboard) ----- */
  const [showLogin, setShowLogin] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");

  /* ----- données (fichier GeoJSON), rechargées après chaque enregistrement ----- */
  useEffect(() => {
    fetch(`${DATA_URL}?v=${version}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((geo) => {
        setDonnees(construireDonnees(geo));
        setErreurDonnees(false);
      })
      .catch(() => setErreurDonnees(true));
  }, [version]);

  const PROJETS = donnees?.projets ?? [];
  const LIGNES = donnees?.lignes ?? LIGNES_VIDES;

  /* Le projet d'identifiant donné est-il PADDI ? */
  const projetPaddi = (id?: string | null) => {
    const p = PROJETS.find((x) => x.id === id);
    return !!p && estPaddi(p.id, p.nom);
  };

  /* ----- MBV du projet PADDI (fichier public/data/paddi_mbv.geojson) ----- */
  const [mbvF, setMbvF] = useState<Feat[]>([]);
  useEffect(() => {
    fetch(MBV_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) =>
        setMbvF(((j.features ?? []) as Feat[]).filter((f) => f?.geometry && /Polygon/.test(f.geometry.type)))
      )
      .catch((e) => console.error("MBV introuvables :", e));
  }, []);

  /* Commune(s) de chaque MBV : géométries calculées d'après les limites des communes (geoBoundaries ADM3).
     Le nom affiché est celui de la base s'il existe (champ Commune), sinon celui de la commune calculée. */
  const mbvCom = useMemo(() => {
    const feats = new Map<Feat, Feat[]>();
    const noms = new Map<Feat, string>();
    mbvF.forEach((f) => {
      const fs = communesFeatDe(f, communes);
      feats.set(f, fs);
      const base = f.properties.Commune ?? f.properties.commune;
      noms.set(f, base ? String(base).trim() : fs.map(nomFeat).join(", "));
    });
    return { feats, noms };
  }, [mbvF, communes]);
  const mbvCommune = mbvCom.noms;

  /* Superficie des MBV cumulée par commune (commune principale de chaque MBV) :
     c'est la même valeur que celle du tableau « Micro-bassin versant » */
  const mbvHa = useMemo(() => {
    const parFeat = new Map<Feat, number>();
    const parNom = new Map<string, number>();
    mbvF.forEach((f) => {
      const sup = Number(f.properties.Superficie) || 0;
      const base = f.properties.Commune ?? f.properties.commune;
      if (base) parNom.set(cle(String(base)), (parNom.get(cle(String(base))) ?? 0) + sup);
      else {
        const c = mbvCom.feats.get(f)?.[0];
        if (c) parFeat.set(c, (parFeat.get(c) ?? 0) + sup);
      }
    });
    return { parFeat, parNom };
  }, [mbvF, mbvCom]);

  /* ----- aires protégées et zones tampon 5 km (mêmes données que la page feux) ----- */
  const [airesF] = useGeo(DATA.aires);
  const [periphF] = useGeo(DATA.peripheries);
  const apZ = useMemo(() => toZones(airesF, PROP.ap, ""), [airesF]);
  const periphZ = useMemo(() => toZones(periphF, PROP.periph, ""), [periphF]);

  /* Liste des AP pour la recherche (AP du fichier des aires + AP citées dans les MBV) */
  const apListe = useMemo(() => {
    const m = new Map<string, string | undefined>();
    apZ.forEach((z) => m.set(String(z.nom), undefined));
    mbvF.forEach((f) => {
      const n = String(f.properties.Aire_Prot ?? "").trim();
      if (!n) return;
      const ex = [...m.keys()].find((k) => memeNom(k, n));
      m.set(ex ?? n, f.properties.Region);
    });
    return [...m.entries()].map(([nom, region]) => ({ nom, region }));
  }, [apZ, mbvF]);

  /* Diagnostic (console du navigateur) : noms d'AP qui ne correspondent pas entre les fichiers */
  useEffect(() => {
    if (!mbvF.length || !apZ.length) return;
    const sans = [...new Set(mbvF.map((f) => String(f.properties.Aire_Prot ?? "").trim()))].filter(
      (n) => n && !apZ.some((z) => memeNom(z.nom, n))
    );
    if (sans.length)
      console.warn("[MBV] Aire_Prot sans AP correspondante dans DATA.aires :", sans, "| AP disponibles :", apZ.map((z) => z.nom));
    if (periphZ.length) {
      const sp = apZ.filter((z) => !periphZ.some((p) => memeNom(p.nom, z.nom))).map((z) => z.nom);
      if (sp.length) console.warn("[Zone tampon] AP sans zone tampon du même nom :", sp, "| zones tampon :", periphZ.map((p) => p.nom));
    }
  }, [mbvF, apZ, periphZ]);

  const mbvListe = useMemo(
    () =>
      mbvF
        .filter((f) => f.properties.Nom)
        .map((f) => ({
          nom: String(f.properties.Nom),
          ap: String(f.properties.Aire_Prot ?? ""),
          region: f.properties.Region ? String(f.properties.Region) : undefined,
        })),
    [mbvF]
  );

  /* Paysages : un par nom, avec leur AP et leur région (champ Paysage des MBV) */
  const paysageListe = useMemo(() => {
    const m = new Map<string, { nom: string; ap: string; region?: string }>();
    mbvF.forEach((f) => {
      const nom = String(f.properties.Paysage ?? "").trim();
      if (!nom || m.has(cle(nom))) return;
      m.set(cle(nom), {
        nom,
        ap: String(f.properties.Aire_Prot ?? ""),
        region: f.properties.Region ? String(f.properties.Region) : undefined,
      });
    });
    return [...m.values()];
  }, [mbvF]);

  const SUGG = useMemo(
    () => construireSuggestions(donnees ?? DONNEES_VIDES, apListe, mbvListe, paysageListe),
    [donnees, apListe, mbvListe, paysageListe]
  );

  const trouver = (niveau: Niveau, k: string, regionK?: string, districtK?: string) =>
    SUGG.find(
      (s) =>
        s.niveau === niveau &&
        s.cle === k &&
        (regionK === undefined || s.regionCle === regionK) &&
        (districtK === undefined || s.districtCle === districtK)
    );

  /* ----- actions ----- */
  /* garderFiltre : vrai quand on descend d'un niveau à l'autre (région → district → commune) ;
     faux pour une nouvelle recherche, qui efface le filtre par projet */
  const choisir = (s: Sel, garderFiltre = false) => {
    setListe(null);
    setSel(s);
    setVide(false);
    setRequete(libelleDe(s, t));
    setOuvert(false);
    if (!garderFiltre || s.niveau === "projet" || s.niveau === "mbv") setProjetFiltre(null);
  };
  const effacer = () => {
    setListe(null);
    setSel(null);
    setVide(false);
    setRequete("");
    setOuvert(false);
    setMasques(new Set());
    setProjetFiltre(null);
  };
  const choisirZone = (niveau: Niveau, k: string, rk?: string, dk?: string) => {
    const s = trouver(niveau, k, rk, dk);
    if (s) choisir(s, true);
  };
  /* Sélectionne une aire protégée à partir de son nom (tolère les petites différences d'écriture) */
  const choisirAP = (nom: unknown) => {
    const n = String(nom ?? "").trim();
    if (!n) return;
    const s = SUGG.find((x) => x.niveau === "ap" && (x.cle === cle(n) || memeNom(x.label, n)));
    if (s) choisir(s);
  };

  /* Sélectionne une MBV ; un second clic sur la MBV déjà choisie remonte à son aire protégée */
  const choisirMBV = (f: Feat) => {
    const k = cleMbv(f);
    const s = SUGG.find((x) => x.niveau === "mbv" && x.cle === k);
    if (!s) return;
    if (sel?.niveau === "mbv" && sel.cle === k) choisirAP(f.properties.Aire_Prot);
    else choisir(s);
  };

  /* Clic sur un projet (chips) :
     - dans une région, un district, une commune, une aire protégée, etc. : affiche seulement
       la zone d'intervention de ce projet dans la sélection (un nouveau clic annule le filtre) ;
     - sinon : choisit le projet comme nouvelle recherche */
  const cliquerProjet = (p: ProjetMeta) => {
    if (sel && sel.niveau !== "projet") {
      setProjetFiltre((prev) => (prev === p.id ? null : p.id));
      return;
    }
    choisirZone("projet", cle(p.id));
  };

  /* ----- saisie : le panneau suit la recherche ; sans résultat, tout reste vide ----- */
  const saisir = (v: string) => {
    setRequete(v);
    setOuvert(true);
    setListe(null);
    setProjetFiltre(null);
    if (!v) {
      setSel(null);
      setVide(false);
      setMasques(new Set());
      return;
    }
    const q = cle(v);
    const exact = SUGG.find((s) => cle(s.label) === q || (s.mots ?? []).includes(q));
    if (exact) {
      setSel(exact);
      setVide(false);
      return;
    }
    const trouve = SUGG.some((s) => s.recherche.includes(q));
    setSel(null);
    setVide(!trouve);
  };

  /* ----- suggestions (sans celles que l'on a retirées avec la croix) ----- */
  const suggestions = useMemo(() => {
    const q = cle(requete);
    if (!q) return [];
    return SUGG.filter((s) => s.recherche.includes(q) && !masques.has(idSug(s)))
      .sort((a, b) => RANG[a.niveau] - RANG[b.niveau] || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [requete, masques, SUGG]);

  /* ----- correspondance géographique : chaque district et commune est trouvé À L'INTÉRIEUR
         de sa région et de son district, pour éviter les homonymes ailleurs dans le pays ----- */
  const { featDis, featCom, ligneDis, ligneCom } = useMemo(() => {
    const featDis = new Map<string, Feat>();
    const featCom = new Map<string, Feat>();
    const ligneDis = new Map<Feat, { region: string; district: string }>();
    const ligneCom = new Map<Feat, Ligne>();

    LIGNES.forEach((l) => {
      if (!l.district) return;
      const rF = regions.find((r) => cle(nomFeat(r)) === cle(l.region));
      const dk = cle(l.district);
      const candD = districts.filter((d) => cle(nomFeat(d)) === dk);
      const dF = rF ? candD.find((d) => estDans(d, rF)) : candD[0];
      if (!dF) return;

      const kD = `${cle(l.region)}|${dk}|`;
      if (!featDis.has(kD)) {
        featDis.set(kD, dF);
        ligneDis.set(dF, { region: l.region, district: l.district });
      }

      if (!l.commune) return;
      /* Nom de géométrie : celui défini dans COMMUNE_GEO si la commune est un homonyme */
      const ck = cle(COMMUNE_GEO[cleLigne(l)] ?? l.commune);
      const cF = communes.find((c) => cle(nomFeat(c)) === ck && estDans(c, dF));
      if (cF) {
        featCom.set(cleLigne(l), cF);
        ligneCom.set(cF, l);
      }
    });
    return { featDis, featCom, ligneDis, ligneCom };
  }, [regions, districts, communes, LIGNES]);

  /* ----- périmètre ----- */
  /* MBV d'une aire protégée : même nom, ou, si le nom écrit dans le fichier MBV diffère,
     MBV située dans le polygone de l'AP (au moins la moitié des points) */
  const mbvDeAp = (label: string) => {
    const zs = apZ.filter((z) => memeNom(z.nom, label));
    return mbvF.filter(
      (f) =>
        memeNom(f.properties.Aire_Prot, label) ||
        zs.some((z) => chevauche(f, z.feature as unknown as Feat, 0.5))
    );
  };

  const mbvChoisie = useMemo(
    () => (sel?.niveau === "mbv" ? mbvF.find((f) => cleMbv(f) === sel.cle) : undefined),
    [sel, mbvF]
  );

  /* Lignes de la sélection, sans filtre par projet */
  const lignesSel = useMemo(() => {
    if (!sel) return [];
    if (sel.niveau === "mbv") {
      /* communes PADDI où se trouve la MBV */
      if (!mbvChoisie) return [];
      const cs = mbvCom.feats.get(mbvChoisie) ?? [];
      const base = mbvChoisie.properties.Commune ?? mbvChoisie.properties.commune;
      return LIGNES.filter((l) => {
        if (!l.commune || !estPaddi(l.projetId, l.projet)) return false;
        const cF = featCom.get(cleLigne(l));
        return (!!cF && cs.includes(cF)) || (!!base && cle(String(base)) === cle(l.commune));
      });
    }
    if (sel.niveau === "ap" || sel.niveau === "paysage") {
      /* Communes traversées par les MBV de cette AP ou de ce paysage (projets PADDI).
         Pour une AP, une commune est aussi retenue si son territoire chevauche le polygone de l'AP,
         même sans MBV enregistrée (ex. Andohahela, Marolambo, Befotaka-Midongy), et les autres
         projets sont retenus s'ils interviennent dans le polygone de l'AP. */
      const mb =
        sel.niveau === "ap"
          ? mbvDeAp(sel.label)
          : mbvF.filter((f) => cle(String(f.properties.Paysage ?? "")) === sel.cle);
      /* Polygone de l'aire protégée */
      const apFeat =
        sel.niveau === "ap"
          ? (apZ.find((z) => memeNom(z.nom, sel.label))?.feature as unknown as Feat | undefined)
          : undefined;
      if (!mb.length && !apFeat) return [];
      return LIGNES.filter((l) => {
        if (!l.commune) return false;
        const cF = featCom.get(cleLigne(l));
        if (!cF) return false;
        if (estPaddi(l.projetId, l.projet)) {
          if (mb.some((m) => chevauche(m, cF))) return true;
          return !!apFeat && chevauche(cF, apFeat, 0.1);
        }
        return sel.niveau === "ap" && !!apFeat && chevauche(cF, apFeat, 0.1);
      });
    }
    return LIGNES.filter((l) => correspond(l, sel));
  }, [sel, LIGNES, mbvF, featCom, mbvChoisie, mbvCom, apZ]);

  /* Lignes après filtre par projet (uniquement dans une région, un district, une commune ou une AP) */
  const lignes = useMemo(
    () =>
      projetFiltre && sel && sel.niveau !== "projet"
        ? lignesSel.filter((l) => l.projetId === projetFiltre)
        : lignesSel,
    [lignesSel, projetFiltre, sel]
  );

  const actives = useMemo<Ligne[]>(
    () => (vide ? [] : sel ? lignes : LIGNES),
    [vide, sel, lignes, LIGNES]
  );

  /* Projets concernés par la sélection (avant filtre), pour pouvoir changer de projet */
  const projetsVue = useMemo(() => {
    if (vide) return [];
    const base = sel ? lignesSel : LIGNES;
    return PROJETS.filter((p) => base.some((l) => l.projetId === p.id));
  }, [vide, sel, lignesSel, LIGNES, PROJETS]);

  /* Zones à dessiner : uniquement celles des lignes de la sélection en cours */
  const actRegKeys = useMemo(() => new Set(actives.map((l) => cle(l.region))), [actives]);
  const actDisSet = useMemo(() => {
    const s = new Set<Feat>();
    actives.forEach((l) => {
      if (!l.district) return;
      const f = featDis.get(`${cle(l.region)}|${cle(l.district)}|`);
      if (f) s.add(f);
    });
    return s;
  }, [actives, featDis]);
  const actComSet = useMemo(() => {
    const s = new Set<Feat>();
    actives.forEach((l) => {
      if (!l.commune) return;
      const f = featCom.get(cleLigne(l));
      if (f) s.add(f);
    });
    return s;
  }, [actives, featCom]);

  /* Types de projets par région (couleur de la limite régionale) */
  const typesRegion = useMemo(() => {
    const m = new Map<string, Set<TypeProjet>>();
    actives.forEach((l) => {
      const k = cle(l.region);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(l.type);
    });
    return m;
  }, [actives]);

  /* Région, district et commune actuellement choisis (géométries) */
  const regionCle = sel && (sel.niveau === "region" ? sel.cle : sel.regionCle ?? null);
  const regionFeat = useMemo(
    () => (regionCle ? regions.find((f) => cle(nomFeat(f)) === regionCle) : undefined),
    [regionCle, regions]
  );
  const districtFeat = useMemo(() => {
    if (!sel) return undefined;
    const kD =
      sel.niveau === "district"
        ? `${sel.regionCle}|${sel.cle}|`
        : sel.niveau === "commune"
        ? `${sel.regionCle}|${sel.districtCle}|`
        : null;
    return kD ? featDis.get(kD) : undefined;
  }, [sel, featDis]);
  const communeFeat = useMemo(() => {
    if (!sel || sel.niveau !== "commune") return undefined;
    return featCom.get(`${sel.regionCle}|${sel.districtCle}|${sel.cle}`);
  }, [sel, featCom]);

  const regionsProjet = useMemo(() => {
    const ids = new Set(lignes.map((l) => cle(l.region)));
    return regions.filter((f) => ids.has(cle(nomFeat(f))));
  }, [lignes, regions]);

  /* ----- MBV : affichées seulement si le projet PADDI est l'objet de la recherche,
         ou si son aire protégée est choisie, ou s'il est choisi comme filtre dans la sélection ----- */
  const mbvVisible = useMemo(() => {
    if (vide || !sel) return false;
    if (projetFiltre) return projetPaddi(projetFiltre);
    switch (sel.niveau) {
      case "projet":
        return projetPaddi(sel.projetId);
      case "ap":
      case "mbv":
      case "paysage":
        return true;
      default:
        return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vide, sel, projetFiltre, PROJETS]);

  /* ----- MBV à afficher selon la sélection ----- */
  const mbvSel = useMemo<Feat[]>(() => {
    if (!mbvVisible || !mbvF.length || !sel) return [];
    switch (sel.niveau) {
      case "ap":
        return mbvDeAp(sel.label);
      case "region": {
        const p = mbvF.filter((f) => cle(String(f.properties.Region ?? "")) === sel.cle);
        return p.length || !regionFeat ? p : mbvF.filter((f) => chevauche(f, regionFeat, 0.5));
      }
      case "district": {
        if (!districtFeat) return [];
        const nomsDis = new Set(lignes.filter((l) => l.commune).map((l) => cle(l.commune!)));
        return mbvF.filter((f) => {
          const base = f.properties.Commune ?? f.properties.commune;
          if (base) return nomsDis.has(cle(String(base)));
          const c = mbvCom.feats.get(f)?.[0];
          return c ? chevauche(c, districtFeat, 0.5) : chevauche(f, districtFeat);
        });
      }
      case "commune":
        /* MBV dont la commune principale est celle choisie (même règle que la colonne « Superficie MBV ») */
        return communeFeat
          ? mbvF.filter((f) => {
              const base = f.properties.Commune ?? f.properties.commune;
              return base ? cle(String(base)) === sel.cle : mbvCom.feats.get(f)?.[0] === communeFeat;
            })
          : [];
      case "mbv":
        return mbvChoisie ? [mbvChoisie] : [];
      case "paysage":
        return mbvF.filter((f) => cle(String(f.properties.Paysage ?? "")) === sel.cle);
      case "projet":
        return mbvF;
      default:
        return [];
    }
  }, [mbvVisible, sel, mbvF, regionFeat, districtFeat, communeFeat, lignes, mbvCom, mbvChoisie]);

  /* AP concernées : celle choisie + celles des MBV affichées */
  const apsConcernes = useMemo(() => {
    const noms = new Set<string>();
    if (vide || !sel) return [] as string[];
    if (sel.niveau === "ap") noms.add(sel.label);
    mbvSel.forEach((f) => {
      const n = String(f.properties.Aire_Prot ?? "").trim();
      if (n) noms.add(n);
    });
    return [...noms];
  }, [vide, sel, mbvSel]);

  const apZonesSel = useMemo(
    () =>
      apZ.filter(
        (z) =>
          apsConcernes.some((n) => memeNom(z.nom, n)) ||
          mbvSel.some((f) => chevauche(f, z.feature as unknown as Feat, 0.5))
      ),
    [apZ, apsConcernes, mbvSel]
  );

  /* Zone tampon 5 km de chaque AP concernée : par le nom ; si le nom diffère dans le fichier des périphéries,
     la zone tampon (la plus petite) dont la boîte englobe celle de l'AP */
  const periphSel = useMemo(() => {
    const out: typeof periphZ = [];
    const tol = 0.02;
    apZonesSel.forEach((a) => {
      const parNom = periphZ.filter((p) => memeNom(p.nom, a.nom));
      if (parNom.length) {
        parNom.forEach((p) => !out.includes(p) && out.push(p));
        return;
      }
      const aire = (b: number[]) => (b[2] - b[0]) * (b[3] - b[1]);
      const entoure = periphZ
        .filter(
          (p) =>
            p.bbox[0] <= a.bbox[0] + tol &&
            p.bbox[1] <= a.bbox[1] + tol &&
            p.bbox[2] >= a.bbox[2] - tol &&
            p.bbox[3] >= a.bbox[3] - tol
        )
        .sort((x, y) => aire(x.bbox) - aire(y.bbox))[0];
      if (entoure && !out.includes(entoure)) out.push(entoure);
    });
    return out;
  }, [periphZ, apZonesSel]);

  /* Districts affichés : après un district choisi, ou dans une région, une AP ou un paysage
     où un projet a été choisi comme filtre (sans filtre, la région seule reste sans districts) */
  const districtsVisibles =
    !vide &&
    !!sel &&
    (sel.niveau === "district" ||
      (!!projetFiltre && (sel.niveau === "region" || sel.niveau === "ap" || sel.niveau === "paysage")));

  /* ----- carte : création ----- */
  useEffect(() => {
    const m = L.map(elMap.current!, { zoomControl: false }).fitBounds(MADA);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    m.createPane("zi-ap").style.zIndex = "450";
    m.createPane("zi-per").style.zIndex = "445";
    m.createPane("zi-mbv").style.zIndex = "460";
    couche.current = L.layerGroup().addTo(m);
    map.current = m;
    setZoom(m.getZoom());
    m.on("zoomend", () => setZoom(m.getZoom()));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(elMap.current!);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  /* ----- fond de carte : Topographie, Satellite ou OpenStreetMap ----- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    fond.current?.remove();
    const f = FONDS[typeFond];
    fond.current = L.tileLayer(f.url, { attribution: f.attr, maxZoom: f.maxZoom }).addTo(m);
    fond.current.bringToBack();
  }, [typeFond]);

  /* ----- chargement des limites ----- */
  useEffect(() => {
    charger("ADM1").then(setRegions).catch(() => setErreur(true));
    charger("ADM2").then(setDistricts).catch(() => setErreur(true));
    charger("ADM3").then(setCommunes).catch(() => setErreur(true));
  }, []);

  /* ----- dessin (limites sans fond) ----- */
  useEffect(() => {
    const g = couche.current;
    if (!g) return;
    g.clearLayers();

    /* Aires protégées : celles concernées par la sélection sont mises en avant */
    apZ.forEach((z) => {
      const conc = apZonesSel.includes(z);
      L.geoJSON(z.feature as any, {
        pane: "zi-ap",
        interactive: true,
        style: {
          color: conc ? "#14532d" : "#16a34a",
          weight: conc ? 3 : 1.2,
          fillColor: "#22c55e",
          fillOpacity: conc ? 0.2 : 0.1,
        },
      })
        .bindTooltip(String(z.nom), { sticky: true, className: "zi-hover" })
        .addTo(g);
    });

    /* Zone tampon 5 km */
    if (zoom >= ZOOM_DETAIL) periphSel.forEach((z) =>
      L.geoJSON(z.feature as any, {
        pane: "zi-per",
        interactive: false,
        style: { color: "#ea580c", weight: 1.5, dashArray: "5 4", fillColor: "#fb923c", fillOpacity: 0.12 },
      }).addTo(g)
    );

    /* MBV du projet PADDI (cliquer sur une MBV sélectionne son aire protégée) */
    if (!vide && zoom >= ZOOM_DETAIL) {
      mbvSel.forEach((f) => {
        const p = f.properties;
        const l = L.geoJSON(f as any, {
          pane: "zi-mbv",
          style: {
            color: "#0369a1",
            weight: sel?.niveau === "mbv" ? 3 : 1.5,
            fillColor: "#38bdf8",
            fillOpacity: sel?.niveau === "mbv" ? 0.55 : 0.45,
          },
        });
        const com = mbvCommune.get(f) ?? "";
        if (sel?.niveau === "mbv") {
          /* MBV choisie : son nom reste affiché au centre de la carte */
          l.bindTooltip(esc(p.Nom), { permanent: true, direction: "center", className: "zi-label zi-label-mbv" });
        } else {
          l.bindTooltip(
            `<b>${esc(p.Nom)}</b><br/>${fmt(Number(p.Superficie) || 0)} ha` +
              `<br/>${esc(p.Paysage)}${com ? ` · ${esc(com)}` : ""}` +
              `<br/>${esc(p.Aire_Prot)} · ${esc(p.Region)}`,
            { sticky: true, className: "zi-hover" }
          );
        }
        l.on("click", () => choisirMBV(f));
        l.addTo(g);
      });
    }

    /* MBV choisie : seule la limite de sa commune reste (région et district disparaissent) */
    if (!vide && sel?.niveau === "mbv") {
      (mbvChoisie ? mbvCom.feats.get(mbvChoisie) ?? [] : []).forEach((c) =>
        contour(
          g,
          c,
          { color: "#0f766e", weight: 2.5, fillOpacity: 0 },
          nomFeat(c),
          "zi-label-commune",
          () => {
            const l = ligneCom.get(c);
            if (l && l.district && l.commune) choisirZone("commune", cle(l.commune), cle(l.region), cle(l.district));
          }
        )
      );
      return;
    }

    /* Recherche sans résultat, ou sélection sans zone renseignée : aucune limite administrative */
    if (vide || (sel && actives.length === 0)) return;

    const n = sel?.niveau ?? "vue";
    const versCommunes = n === "district" || n === "commune" || n === "ap" || n === "paysage";
    const etiqRegion = n === "vue" || n === "region" || n === "projet" || n === "categorie";
    /* Fond : uniquement sur le niveau choisi (région, district ou commune) */
    const remplirRegion = n === "vue" || n === "region" || n === "projet" || n === "categorie";
    const etiqDistrict = districtsVisibles;
    const etiqCommune = n === "district" || n === "commune" || n === "ap" || n === "paysage";

    /* Régions : toutes sans recherche, puis seulement celles de la sélection */
    /* Chaque niveau cache la limite de son parent :
       région visible seulement en vue générale, projet, catégorie ou région choisie ;
       district visible seulement quand un district est choisi (pas au niveau région) ;
       commune ensuite (district, commune, AP, paysage, MBV) */
    (n === "vue" || n === "region" || n === "projet" || n === "categorie" ? regions : [])
      .filter((f) => n === "vue" || actRegKeys.has(cle(nomFeat(f))))
      .forEach((f) => {
        const k = cle(nomFeat(f));
        const choisie = n === "region" && regionFeat === f;
        const types = typesRegion.get(k);
        /* Sans recherche : limite neutre, sans couleur ni fond ni étiquette (nom au survol).
           Dès qu'on cherche, la couleur par type de projet revient. */
        const neutre = n === "vue";
        const couleur =
          neutre || !types
            ? COULEUR_HORS
            : types.size > 1
            ? COULEUR_TYPE.mixte
            : COULEUR_TYPE[[...types][0]];
        contour(
          g,
          f,
          {
            color: couleur,
            weight: neutre ? 1 : choisie ? 3 : 1.6,
            fillColor: couleur,
            fillOpacity: !neutre && remplirRegion ? 0.18 : 0,
          },
          nomFeat(f),
          !neutre && etiqRegion && typesRegion.has(k) ? "zi-label-region" : null,
          () => {
            if (n === "region" && regionFeat === f) effacer();
            else choisirZone("region", k);
          }
        );
      });

    /* Districts de la sélection (limites sans fond) */
    if (districtsVisibles) {
      districts
        .filter((d) => actDisSet.has(d))
        .forEach((d) => {
          const choisi = n === "district" && districtFeat === d;
          contour(
            g,
            d,
            {
              color: choisi ? "#dc2626" : "#6d28d9",
              weight: choisi ? 2.5 : 1.2,
              dashArray: "4 3",
              fillColor: "#a78bfa",
              /* Le fond du district disparaît : ce sont ses communes qui sont remplies */
              fillOpacity: 0,
            },
            nomFeat(d),
            etiqDistrict ? "zi-label-district" : null,
            () => {
              const l = ligneDis.get(d);
              if (!l) return;
              if (choisi) choisirZone("region", cle(l.region));
              else choisirZone("district", cle(l.district), cle(l.region));
            }
          );
        });
    }

    /* Communes : quand un district, une commune ou une AP est choisi */
    if (versCommunes) {
      actComSet.forEach((c) => {
        const choisie = n === "commune" && communeFeat === c;
        const l = ligneCom.get(c);
        contour(
          g,
          c,
          {
            color: choisie ? "#dc2626" : "#0f766e",
            weight: choisie ? 2.5 : 1,
            fillColor: "#14b8a6",
            /* Communes remplies (district ou AP choisi) ; la commune choisie n'a plus de fond,
               seule sa limite reste, pour voir les MBV et le fond de carte */
            fillOpacity: n === "commune" ? 0 : 0.2,
          },
          nomFeat(c),
          etiqCommune ? "zi-label-commune" : null,
          () => {
            if (!l || !l.district || !l.commune) return;
            if (choisie) choisirZone("district", cle(l.district), cle(l.region));
            else choisirZone("commune", cle(l.commune), cle(l.region), cle(l.district));
          }
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apZ, regions, districts, sel, vide, zoom, projetFiltre, districtsVisibles, actives, regionFeat, districtFeat, communeFeat, actRegKeys, actDisSet, actComSet, ligneDis, ligneCom, typesRegion, mbvSel, mbvCommune, mbvChoisie, mbvCom, apZonesSel, periphSel, SUGG]);

  /* ----- cadrage ----- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!sel) {
      m.flyToBounds(MADA, { duration: 0.8 });
      return;
    }
    let liste: Feat[] = [];
    if (sel.niveau === "projet" || sel.niveau === "categorie") liste = regionsProjet;
    else if (sel.niveau === "mbv" || sel.niveau === "paysage") liste = mbvSel;
    else if (sel.niveau === "ap") {
      liste = [...apZonesSel, ...periphSel].map((z) => z.feature as Feat);
      if (!liste.length) liste = mbvSel;
    } else {
      const cible =
        sel.niveau === "commune" ? communeFeat : sel.niveau === "district" ? districtFeat : regionFeat;
      if (cible) liste = [cible];
    }
    if (!liste.length) return;
    const bounds = liste.map((f) => L.geoJSON(f as any).getBounds()).reduce((a, b) => a.extend(b));
    m.flyToBounds(bounds, { padding: [40, 40], maxZoom: sel.niveau === "mbv" ? 13 : sel.niveau === "commune" || sel.niveau === "paysage" ? 11 : 9, duration: 0.9 });
  }, [sel, regionsProjet, regionFeat, districtFeat, communeFeat, apZonesSel, periphSel, mbvSel]);

  /* ----- données du panneau ----- */
  const lignesCommunes = useMemo(() => actives.filter((l) => !!l.commune && !!l.district), [actives]);
  const activites = useMemo<ActiviteLocalisee[]>(
    () =>
      lignesCommunes.flatMap((l) =>
        l.activites.map((a) => ({
          ...a,
          region: l.region,
          district: l.district ?? "",
          commune: l.commune ?? "",
        }))
      ),
    [lignesCommunes]
  );

  /* La carte « Activités environnementales » n'apparaît que si la sélection contient un projet environnemental */
  const afficherActivites = !vide && !!sel && lignesCommunes.some((l) => l.type === "environnement");

  /* Le MBV (colonne du tableau) ne concerne que les projets environnementaux (ils ciblent un endroit précis).
     Les projets de développement travaillent sur la commune entière : pas de MBV pour eux. */
  const avecMbv = lignesCommunes.some((l) => l.type === "environnement");

  /* Lignes sans doublon */
  const lignesTableau = useMemo(() => {
    const vues = new Set<string>();
    const out: Ligne[] = [];
    actives.forEach((l) => {
      const k = `${l.region}|${l.district ?? ""}|${l.commune ?? ""}`;
      if (!vues.has(k)) {
        vues.add(k);
        out.push(l);
      }
    });
    return out;
  }, [actives]);

  /* Arborescence Région > District > Commune */
  const arbre = useMemo<Noeud[]>(() => {
    const regs = new Map<string, Map<string, string[]>>();
    lignesTableau.forEach((l) => {
      if (!regs.has(l.region)) regs.set(l.region, new Map());
      if (!l.district) return;
      const dis = regs.get(l.region)!;
      if (!dis.has(l.district)) dis.set(l.district, []);
      if (l.commune) dis.get(l.district)!.push(l.commune);
    });
    return [...regs.entries()].map(([nom, dis]) => ({
      nom,
      districts: [...dis.entries()].map(([dn, communesN]) => ({ nom: dn, communes: communesN })),
    }));
  }, [lignesTableau]);

  /* Nom de la région affiché à droite du titre */
  const regionAff = !vide && sel ? (sel.niveau === "region" ? sel.label : sel.regionNom ?? null) : null;

  /* ----- légende dynamique ----- */
  const legende = (() => {
    const n = sel?.niveau ?? "vue";
    const it: { k: string; label: string; cls?: string; color?: string }[] = [];
    const adminVisible = !vide && (n === "mbv" || !sel || actives.length > 0);
    if (adminVisible) {
      if (n === "vue") {
        it.push({ k: "reg", label: t.legRegion, color: COULEUR_HORS });
      } else if (n === "region" || n === "projet" || n === "categorie") {
        const types = new Set<string>();
        typesRegion.forEach((v) => types.add(v.size > 1 ? "mixte" : [...v][0]));
        if (types.has("environnement")) it.push({ k: "env", label: t.catEnv, color: COULEUR_TYPE.environnement });
        if (types.has("developpement")) it.push({ k: "dev", label: t.catDev, color: COULEUR_TYPE.developpement });
        if (types.has("mixte")) it.push({ k: "mix", label: t.legMixte, color: COULEUR_TYPE.mixte });
      }
      if (districtsVisibles) it.push({ k: "dis", label: t.legDistrict, cls: "zi-lg-dis" });
      const communesVues =
        n === "mbv"
          ? !!mbvChoisie && (mbvCom.feats.get(mbvChoisie)?.length ?? 0) > 0
          : ["district", "commune", "ap", "paysage"].includes(n) && actComSet.size > 0;
      if (communesVues) it.push({ k: "com", label: t.legCommune, cls: "zi-lg-com" });
    }
    if (apZ.length) it.push({ k: "ap", label: t.legAP, cls: "zi-lg-ap" });
    if (periphSel.length && zoom >= ZOOM_DETAIL) it.push({ k: "per", label: t.legPeriph, cls: "zi-lg-per" });
    if (mbvSel.length && zoom >= ZOOM_DETAIL) it.push({ k: "mbv", label: t.legMbv, cls: "zi-lg-mbv" });
    if (adminVisible && (n === "district" || n === "commune")) it.push({ k: "sel", label: t.legSelection, cls: "zi-lg-sel" });
    return it;
  })();

  /* ----- contenu de la liste ouverte par un compteur ----- */
  const elementsListe: { k: string; label: string; sub?: string; go: () => void }[] = (() => {
    if (!liste) return [];
    const vus = new Set<string>();
    const out: { k: string; label: string; sub?: string; go: () => void }[] = [];
    const add = (k: string, label: string, go: () => void, sub?: string) => {
      if (vus.has(k)) return;
      vus.add(k);
      out.push({ k, label, sub, go });
    };
    if (liste === "projets")
      projetsVue.forEach((p) => add(p.id, p.nom, () => choisirZone("projet", cle(p.id))));
    if (liste === "regions")
      actives.forEach((l) => add(cle(l.region), l.region, () => choisirZone("region", cle(l.region))));
    if (liste === "districts")
      actives.forEach((l) => {
        if (l.district)
          add(`${cle(l.region)}|${cle(l.district)}`, l.district, () => choisirZone("district", cle(l.district!), cle(l.region)), l.region);
      });
    if (liste === "communes")
      lignesCommunes.forEach((l) =>
        add(
          cleLigne(l),
          l.commune!,
          () => choisirZone("commune", cle(l.commune!), cle(l.region), cle(l.district!)),
          `${l.district} · ${l.region}`
        )
      );
    return out.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  })();

  const nbRegions = new Set(actives.map((l) => cle(l.region))).size;
  const nbDistricts = new Set(
    actives.filter((l) => l.district).map((l) => `${cle(l.region)}|${cle(l.district!)}`)
  ).size;

  /* Superficie de la commune, prise dans la géométrie trouvée pour sa ligne */
  const surfaceDe = (l: Ligne) => {
    const f = featCom.get(cleLigne(l));
    return f ? surfaceHa(f) : null;
  };

  /* Pourcentage : superficie MBV divisée par la superficie de la commune */
  const pourcentage = (sup: number | null, mbv: number | undefined) =>
    sup && sup > 0 && mbv != null ? (mbv / sup) * 100 : null;

  /* Superficie MBV d'une commune : pour PADDI, somme des superficies du tableau « Micro-bassin versant »
     (fichier paddi_mbv.geojson), donc identique à ce tableau ; pour les autres projets, valeur de la base */
  const mbvDe = (l: Ligne): number | undefined => {
    if (l.type !== "environnement") return undefined;
    if (estPaddi(l.projetId, l.projet) && mbvF.length > 0 && communes.length > 0) {
      const cF = featCom.get(cleLigne(l));
      const v = (cF ? mbvHa.parFeat.get(cF) ?? 0 : 0) + (mbvHa.parNom.get(cle(l.commune ?? "")) ?? 0);
      return v > 0 ? v : undefined;
    }
    return l.mbv_ha;
  };

  /* Totaux : le MBV n'est cumulé que pour les lignes de projets environnementaux */
  const totaux = lignesCommunes.reduce(
    (acc, l) => {
      const sup = surfaceDe(l);
      const mbvL = mbvDe(l);
      acc.surface += sup ?? 0;
      if (mbvL != null) {
        acc.mbv += mbvL;
        acc.supAvecMbv += sup ?? 0;
      }
      return acc;
    },
    { surface: 0, mbv: 0, supAvecMbv: 0 }
  );
  const pctTotal = totaux.supAvecMbv > 0 ? (totaux.mbv / totaux.supAvecMbv) * 100 : null;

  const compte = (ty: TypeActivite) => activites.filter((a) => a.type === ty).length;

  /* Bloc d'un district et de ses communes */
  const blocDistrict = (r: Noeud, d: Noeud["districts"][number]) => (
    <div className="zi-dis" key={`${r.nom}|${d.nom}`}>
      <button
        type="button"
        className="zi-node zi-n-dis"
        onClick={() => choisirZone("district", cle(d.nom), cle(r.nom))}
      >
        {d.nom}
      </button>
      {d.communes.length > 0 && (
        <ul>
          {d.communes.map((c) => (
            <li key={c}>
              <button
                type="button"
                className="zi-node zi-n-com"
                onClick={() => choisirZone("commune", cle(c), cle(r.nom), cle(d.nom))}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  /* ----- rendu ----- */
  return (
    <div className="zi">
      <style>{CSS}</style>

      <header className="zi-head">
        <div>
          <h1>{t.titre}</h1>
          <p>{t.sousTitre}</p>
        </div>

        <div className="zi-search">
          <Search size={17} aria-hidden />
          <input
            type="search"
            value={requete}
            placeholder={t.recherche}
            onChange={(e) => saisir(e.target.value)}
            onFocus={() => setOuvert(true)}
            onBlur={() => setOuvert(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]) choisir(suggestions[0]);
              if (e.key === "Escape") setOuvert(false);
            }}
            aria-label={t.rechercheAria}
            aria-autocomplete="list"
          />
          {requete && (
            <span className="zi-clear" onClick={effacer} role="button" tabIndex={0} aria-label={t.effacer}>
              <X size={16} />
            </span>
          )}
          {ouvert && suggestions.length > 0 && (
            <ul className="zi-sug" role="listbox">
              {suggestions.map((s) => (
                <li
                  key={idSug(s)}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choisir(s);
                  }}
                >
                  <span className={`zi-badge ${s.niveau}`}>{t.niveaux[s.niveau]}</span>
                  <strong>{libelleDe(s, t)}</strong>
                  <small>{contexteDe(s, t)}</small>
                  <button
                    type="button"
                    className="zi-sug-x"
                    aria-label={t.retirer}
                    title={t.retirer}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMasques((prev) => new Set(prev).add(idSug(s)));
                    }}
                  >
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="zi-update" onClick={() => setShowLogin(true)}>
          <RefreshCw size={16} aria-hidden />
          <span>{t.update}</span>
        </button>
      </header>

      {erreurDonnees && <div className="zi-erreur" role="alert">{t.erreurDonnees}</div>}
      {erreur && <div className="zi-erreur" role="alert">{t.erreur}</div>}

      <div className="zi-body">
        <aside className="zi-panel">
          {/* 1. Carte d'accueil / sélection : la sélection à gauche, les projets concernés à droite */}
          <section className="zi-card zi-hero">
            {vide ? (
              <p className="zi-fil">{t.aucunResultat}</p>
            ) : sel ? (
              <div className="zi-hero-top">
                <div className="zi-hero-id">
                  <span className="zi-niveau">{t.niveaux[sel.niveau]}</span>
                  <h2>{libelleDe(sel, t)}</h2>
                  {sel.niveau !== "projet" && <p className="zi-fil">{contexteDe(sel, t)}</p>}
                </div>

                <span className="zi-hero-sep" aria-hidden />

                <div className="zi-hero-proj">
                  <h4>
                    {t.projetsConcernes} <span className="zi-compte">{projetsVue.length}</span>
                  </h4>
                  {projetsVue.length > 0 ? (
                    <div className="zi-chips">
                      {projetsVue.map((p) => (
                        <span
                          key={p.id}
                          className={`zi-chip zi-chip-${p.type}${projetFiltre === p.id ? " zi-chip-on" : ""}`}
                          role="button"
                          tabIndex={0}
                          title={projetFiltre === p.id ? t.filtreActif : p.nom}
                          onClick={() => cliquerProjet(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") cliquerProjet(p);
                          }}
                        >
                          {p.nom}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="zi-vide">{t.projetsAucun}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="zi-fil">{donnees ? t.vueTexte : t.chargement}</p>
            )}

            {!sel && !vide && (
              <div className="zi-chips">
                {PROJETS.map((p) => (
                  <span
                    key={p.id}
                    className="zi-chip"
                    role="button"
                    tabIndex={0}
                    onClick={() => choisirZone("projet", cle(p.id))}
                  >
                    {p.nom}
                  </span>
                ))}
              </div>
            )}

            <div className="zi-stats">
              {(
                [
                  ["projets", projetsVue.length, t.projets],
                  ["regions", nbRegions, t.regions],
                  ["districts", nbDistricts, t.districts],
                  ["communes", lignesCommunes.length, t.communes],
                ] as const
              ).map(([k, n, label]) => (
                <button
                  key={k}
                  type="button"
                  className={liste === k ? "on" : ""}
                  disabled={n === 0}
                  aria-expanded={liste === k}
                  title={label}
                  onClick={() => setListe((l) => (l === k ? null : k))}
                >
                  <b>{n}</b>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {liste && elementsListe.length > 0 && (
              <div className="zi-liste">
                {elementsListe.map((e) => (
                  <span
                    key={e.k}
                    className="zi-chip"
                    role="button"
                    tabIndex={0}
                    onClick={e.go}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") e.go();
                    }}
                  >
                    {e.label}
                    {e.sub && <small> · {e.sub}</small>}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 1 bis. MBV du projet PADDI : seulement si PADDI est l'objet de la recherche ou son aire protégée */}
          {mbvSel.length > 0 && (
            <section className="zi-card">
              <div className="zi-cardh">
                <h3>{t.mbvTitre}</h3>
                <span className="zi-regname">
                  {mbvSel.length} MBV · {fmt(mbvSel.reduce((s, f) => s + (Number(f.properties.Superficie) || 0), 0))} ha
                </span>
              </div>
              <div style={{ maxHeight: 150, overflow: "auto" }}>
                <table className="zi-tbl">
                  <thead>
                    <tr>
                      <th className="zi-l">{t.colMbv}</th>
                      <th className="zi-l">{t.colPaysage}</th>
                      <th className="zi-l">{t.colCommune}</th>
                      <th className="zi-l">{t.colAP}</th>
                      <th>{t.colSuperficie}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...mbvSel]
                      .sort(
                        (a, b) =>
                          String(a.properties.Aire_Prot).localeCompare(String(b.properties.Aire_Prot)) ||
                          String(a.properties.Nom).localeCompare(String(b.properties.Nom))
                      )
                      .map((f, i) => (
                        <tr key={i} className="zi-row" onClick={() => choisirMBV(f)}>
                          <td className="zi-l">{f.properties.Nom}</td>
                          <td className="zi-l">{f.properties.Paysage ?? "—"}</td>
                          <td className="zi-l">{mbvCommune.get(f) || "—"}</td>
                          <td className="zi-l">{f.properties.Aire_Prot}</td>
                          <td>{fmt(Number(f.properties.Superficie) || 0)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 2. Activités environnementales (seulement pour les projets environnementaux) */}
          {afficherActivites && (
            <section className="zi-card">
              <h3>{t.activites}</h3>
              <div className="zi-acts">
                {(Object.keys(TYPE_ICONE) as TypeActivite[]).map((ty) => {
                  const Icone = TYPE_ICONE[ty].icone;
                  const liste = activites.filter((a) => a.type === ty);
                  return (
                    <div className="zi-type" key={ty}>
                      <div className="zi-typeh" style={{ color: TYPE_ICONE[ty].couleur }}>
                        <Icone size={16} aria-hidden />
                        {t.types[ty]}
                        <span>{compte(ty)}</span>
                      </div>
                      {liste.length ? (
                        <ul>
                          {liste.map((a, i) => (
                            <li key={i}>
                              <strong>{a.commune}</strong> · {a.titre}
                              {a.surface_ha ? ` · ${a.surface_ha} ha` : ""}
                              {a.annee ? ` · ${a.annee}` : ""}
                              <small> ({a.district}, {a.region})</small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="zi-vide">{t.aucuneActivite}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. Zones d'intervention et Par commune, côte à côte */}
          <div className="zi-duo">
            <section className="zi-card zi-col">
              <div className="zi-cardh">
                <h3>{t.zonesInterv}</h3>
                {regionAff && <span className="zi-regname">{regionAff}</span>}
              </div>
              <div className="zi-scroll">
                {arbre.length ? (
                  <div className="zi-regions">
                    {regionAff
                      ? arbre.flatMap((r) => r.districts.map((d) => (
                          <div className="zi-reg" key={`${r.nom}|${d.nom}`}>
                            {blocDistrict(r, d)}
                          </div>
                        )))
                      : arbre.map((r) => (
                          <div className="zi-reg" key={r.nom}>
                            <button
                              type="button"
                              className="zi-node zi-n-reg"
                              onClick={() => choisirZone("region", cle(r.nom))}
                            >
                              {r.nom}
                            </button>
                            {r.districts.map((d) => blocDistrict(r, d))}
                          </div>
                        ))}
                  </div>
                ) : (
                  <p className="zi-vide">{t.districtsNon}</p>
                )}
              </div>
            </section>

            <section className="zi-card zi-col">
              <div className="zi-cardh">
                <h3>{t.parCommune}</h3>
              </div>
              <div className="zi-scroll">
                {lignesCommunes.length ? (
                  <table className="zi-tbl">
                    <thead>
                      <tr>
                        <th>{t.colCommune}</th>
                        <th>{t.colSuperficie}</th>
                        {avecMbv && <th>{t.colMBV}</th>}
                        {avecMbv && <th className="zi-th-pct">{t.colPourcentage}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lignesCommunes.map((l, i) => {
                        const s = surfaceDe(l);
                        /* MBV affiché uniquement pour un projet environnemental */
                        const mbv = mbvDe(l);
                        /* Trait plus épais avant la première commune d'une nouvelle région */
                        const nouvelleRegion = i > 0 && lignesCommunes[i - 1].region !== l.region;
                        return (
                          <tr
                            key={`${l.region}-${l.district}-${l.commune}-${l.projetId}`}
                            className={`zi-row${nouvelleRegion ? " zi-sep" : ""}`}
                            onClick={() =>
                              choisirZone("commune", cle(l.commune!), cle(l.region), cle(l.district!))
                            }
                          >
                            <td>{l.commune}</td>
                            <td>{s != null ? fmt(s) : "—"}</td>
                            {avecMbv && <td>{mbv != null ? fmt(mbv) : "—"}</td>}
                            {avecMbv && <td>{fmtPct(pourcentage(s, mbv))}</td>}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>{t.total}</td>
                        <td>{fmt(totaux.surface)}</td>
                        {avecMbv && <td>{totaux.mbv ? fmt(totaux.mbv) : "—"}</td>}
                        {avecMbv && <td>{fmtPct(pctTotal)}</td>}
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="zi-vide">{t.communesNon}</p>
                )}
              </div>
            </section>
          </div>
        </aside>

        <section className="zi-mcard" aria-label={t.carteAria}>
          <div className="zi-mhead">
            <span className="zi-mtitre">
              <MapPin size={16} aria-hidden />
              <span>{sel && !vide ? libelleDe(sel, t) : t.carteTitre}</span>
            </span>
            <div className="zi-fondsel">
              <Globe2 size={14} aria-hidden />
              <select
                value={typeFond}
                onChange={(e) => setTypeFond(e.target.value as Fond)}
                aria-label={t.fondAria}
              >
                <option value="topo">{t.fondTopo}</option>
                <option value="sat">{t.fondSat}</option>
                <option value="osm">{t.fondOsm}</option>
              </select>
            </div>
          </div>
          <div className="zi-mbox">
            <div ref={elMap} className="zi-map" />
            {sel && (
              <button type="button" className="zi-reset" onClick={effacer}>
                <RotateCcw size={14} aria-hidden />
                {t.vueMada}
              </button>
            )}
          </div>
          {/* Légende dynamique : seulement ce qui est affiché sur la carte pour la sélection en cours */}
          <div className="zi-legende">
            {legende.map((e) => (
              <span key={e.k}>
                <i
                  className={e.cls}
                  style={e.color ? { background: e.color, border: `1.5px solid ${e.color}`, opacity: 0.7 } : undefined}
                />
                {e.label}
              </span>
            ))}
          </div>
          <p className="zi-note">{t.note}</p>
        </section>
      </div>

      {/* Connexion, puis fenêtre de mise à jour (même enchaînement que le Dashboard) */}
      {showLogin && (
        <ZonesLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(name: string, jeton: string) => {
            setUserName(name);
            setToken(jeton);
            setShowLogin(false);
            setShowUpdate(true);
          }}
        />
      )}
      {showUpdate && donnees && (
        <ZonesUpdateModal
          projets={PROJETS}
          lignes={LIGNES}
          token={token}
          userName={userName}
          saveUrl={SAUVEGARDE_URL}
          onClose={() => {
            setShowUpdate(false);
            setToken("");
          }}
          onSaved={() => setVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}

/* ===================== STYLES (thème de l'application) ===================== */
/* Les couleurs viennent des variables de l'application (clair ou sombre), comme AnalyseTerritoriale. */

const CSS = `
.zi{--bg:var(--surface-2,#f1efe8);--card:var(--surface,#ffffff);--line:var(--border,#d8d4c8);
  --ink:var(--text,#1c2822);--ink2:var(--text-2,#4a5850);--ink3:var(--text-3,#7a867f);
  --acc:var(--accent,#1f6f50);--acc-soft:color-mix(in srgb,var(--accent,#1f6f50) 14%,var(--surface,#ffffff));
  --chip:var(--surface-3,var(--surface,#ffffff));--hover:var(--surface-2,#f1efe8);--map:#e5e7eb;
  display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg);color:var(--ink);font-family:inherit}
.zi *{box-sizing:border-box}
.zi h1,.zi h2,.zi h3,.zi h4{margin:0;font-weight:600;color:var(--ink)}
.zi h1{font-size:20px}
.zi h2{font-family:Georgia,serif;font-weight:500;font-size:26px;line-height:1.1;margin:2px 0}
.zi h3{font-size:15px}
.zi h4{font-size:13px;margin:4px 0 6px;color:var(--ink2)}
.zi-head{display:flex;flex-wrap:wrap;gap:10px 24px;align-items:center;justify-content:space-between;padding:10px 20px;background:var(--card);border-bottom:1px solid var(--line)}
.zi-head p{margin:2px 0 0;font-size:13px;color:var(--ink3)}
.zi-search{position:relative;display:flex;align-items:center;gap:8px;flex:1;max-width:640px;min-width:260px;padding:0 12px;height:42px;border:1px solid var(--line);border-radius:12px;background:var(--chip);color:var(--ink3)}
.zi-search:focus-within{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 22%,transparent)}
.zi-search input{flex:1;min-width:0;border:0;outline:none;background:transparent;font:inherit;font-size:14px;color:var(--ink)}
.zi-search input::placeholder{color:var(--ink3)}
.zi-clear{cursor:pointer;display:grid;place-items:center;color:var(--ink3)}
.zi-sug{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:2000;margin:0;padding:6px;list-style:none;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.2);max-height:360px;overflow-y:auto}
.zi-sug li{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;padding:8px 8px 8px 10px;border-radius:8px;cursor:pointer;align-items:center}
.zi-sug li:hover{background:var(--hover)}
.zi-sug strong{font-size:14px;color:var(--ink)}
.zi-sug small{grid-column:2;font-size:12px;color:var(--ink3)}
.zi-sug-x{grid-column:3;grid-row:1 / span 2;display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:none;color:var(--ink3);cursor:pointer}
.zi-sug-x:hover{background:var(--line);color:var(--ink)}
.zi-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--acc-soft);color:var(--acc);white-space:nowrap}
.zi-badge.categorie{background:#dbeafe;color:#1e40af}
.zi-badge.projet{background:#fde68a;color:#78350f}
.zi-badge.ap{background:#dcfce7;color:#166534}
.zi-badge.region{background:#ffedd5;color:#9a3412}
.zi-badge.district{background:#ede9fe;color:#5b21b6}
.zi-badge.commune{background:#ccfbf1;color:#115e59}
.zi-update{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border:none;border-radius:10px;background:#14532d;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 2px 5px rgba(20,83,45,.2)}
.zi-update:hover{filter:brightness(1.08)}
.zi-erreur{padding:8px 20px;background:rgba(220,38,38,.1);color:#dc2626;font-size:13px}

/* Mise en page : panneau à gauche, carte à droite, le tout sur un seul écran */
.zi-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
.zi-panel{min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;border-right:1px solid var(--line)}
.zi-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;min-width:0}
.zi-hero{display:flex;flex-direction:column;gap:8px;background:linear-gradient(135deg,var(--card),var(--acc-soft));flex:none}
/* Sélection à gauche, séparateur vertical, projets concernés à droite (dans la même carte) */
.zi-hero-top{display:flex;align-items:stretch;gap:14px;flex-wrap:wrap}
.zi-hero-id{flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:4px}
.zi-hero-sep{width:1px;flex:none;background:var(--line);align-self:stretch}
.zi-hero-proj{flex:1.3 1 240px;min-width:0;display:flex;flex-direction:column;gap:6px}
.zi-niveau{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--acc)}
.zi-fil{margin:0;font-size:13px;color:var(--ink2);line-height:1.5}
.zi-compte{display:inline-block;margin-left:4px;padding:0 8px;border-radius:999px;background:var(--acc);color:#fff;font-size:12px;font-weight:700}
.zi-chips{display:flex;flex-wrap:wrap;gap:6px}
.zi-chip{font-size:12.5px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--chip);cursor:pointer;color:var(--ink2)}
.zi-chip:hover{background:var(--hover)}
.zi-chip-environnement{border-color:#65a30d}
.zi-chip-developpement{border-color:#2563eb}
.zi-chip-on,.zi-chip-on:hover{background:var(--acc);color:#fff;border-color:var(--acc)}
.zi-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.zi-stats div,.zi-stats button{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column}
.zi-stats button{cursor:pointer;font:inherit;text-align:left;color:inherit}
.zi-stats button:hover:not(:disabled){background:var(--hover)}
.zi-stats button.on{border-color:var(--acc);box-shadow:0 0 0 2px color-mix(in srgb,var(--acc) 25%,transparent)}
.zi-stats button:disabled{opacity:.5;cursor:default}
.zi-liste{display:flex;flex-wrap:wrap;gap:6px;max-height:150px;overflow:auto;padding-top:8px;border-top:1px solid var(--line)}
.zi-chip small{color:var(--ink3)}
.zi-stats b{font-family:Georgia,serif;font-weight:500;font-size:24px;line-height:1.1;color:var(--acc)}
.zi-stats span{font-size:12px;color:var(--ink3)}

.zi-acts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:150px;overflow:auto}
.zi-typeh{display:flex;align-items:center;gap:6px;font-weight:600;font-size:13px;margin:0 0 4px}
.zi-typeh span{margin-left:auto;font-size:12px;background:var(--hover);color:var(--ink2);padding:1px 8px;border-radius:999px}
.zi-type ul{margin:0;padding-left:16px;font-size:12.5px;line-height:1.5;color:var(--ink2)}
.zi-type small{color:var(--ink3)}
.zi-vide{font-size:13px;color:var(--ink3);margin:2px 0}

/* Zones d'intervention et tableau côte à côte ; en colonne sur petit écran */
.zi-duo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;flex:1;min-height:0}
.zi-col{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.zi-cardh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}
.zi-cardh h3{margin:0}
.zi-regname{font-size:13px;font-weight:600;color:var(--acc);text-align:right}
.zi-scroll{flex:1;min-height:0;overflow:auto}

/* Tableau Par commune : colonnes séparées par un filet vertical, régions séparées par un trait épais */
.zi-tbl{width:100%;border-collapse:collapse;font-size:12.5px;color:var(--ink)}
.zi-tbl th{font-weight:500;font-size:11.5px;color:var(--ink3);text-align:right;padding:4px 6px;position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--line)}
.zi-tbl td{padding:5px 6px;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
.zi-tbl th+th,.zi-tbl td+td{border-left:1px solid var(--line)}
.zi-tbl th.zi-th-pct{white-space:normal;max-width:120px;font-size:10.5px;line-height:1.25;vertical-align:bottom}
.zi-tbl th:first-child,.zi-tbl td:first-child,.zi-tbl th.zi-l,.zi-tbl td.zi-l{text-align:left}
.zi-tbl tfoot td{font-weight:700;border-top:2px solid var(--line)}
.zi-tbl tr.zi-sep td{border-top:3px solid var(--ink2)}
.zi-row{cursor:pointer}
.zi-row:hover td{background:var(--hover)}

/* Zones d'intervention : blocs par région (ou par district), sur 2 à 3 colonnes */
.zi-regions{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;align-content:start}
.zi-reg{border:1px solid var(--line);border-radius:10px;padding:6px;min-width:0;background:var(--card)}
.zi-dis{margin-top:4px}
.zi-dis ul{list-style:none;margin:0 0 0 6px;padding:0 0 0 8px;border-left:1px solid var(--line)}
.zi-dis li{margin:1px 0}
.zi-node{display:block;width:100%;background:none;border:0;padding:3px 6px;font:inherit;font-size:12.5px;color:var(--ink);text-align:left;border-radius:6px;cursor:pointer}
.zi-node:hover{background:var(--hover)}
.zi-n-reg{font-weight:700;font-size:13px;color:var(--acc);border-bottom:1px solid var(--line);border-radius:0;padding-bottom:5px;margin-bottom:2px}
.zi-n-dis{font-weight:600}
.zi-n-com{color:var(--ink2);font-size:12px}

/* Carte */
.zi-mcard{margin:10px;display:flex;flex-direction:column;min-height:0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.zi-mhead{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px;border-bottom:1px solid var(--line);font-size:14px;font-weight:600;color:var(--ink)}
.zi-mtitre{display:flex;align-items:center;gap:8px}
.zi-fondsel{display:flex;align-items:center;gap:6px;color:var(--ink3)}
.zi-fondsel select{padding:5px 9px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--ink);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}
.zi-mbox{position:relative;flex:1;min-height:0}
.zi-map{position:absolute;inset:0;background:var(--map)}
.zi-reset{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;display:flex;gap:6px;align-items:center;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.zi-reset:hover{background:var(--hover)}
.zi-legende{display:flex;gap:14px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid var(--line);font-size:12px;color:var(--ink2)}
.zi-legende i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.zi-lg-reg{background:#ff6a00;opacity:.6;border:1.5px solid #ff6a00}
.zi-lg-dis{background:#a78bfa;border:1.5px solid #7c3aed}
.zi-lg-com{background:#14b8a6;border:1px solid #0f766e}
.zi-lg-ap{background:#22c55e;opacity:.5;border:1.5px solid #16a34a}
.zi-lg-mbv{background:#38bdf8;border:1.5px solid #0369a1}
.zi-lg-per{background:#fb923c;opacity:.6;border:1.5px dashed #ea580c}
.zi-lg-sel{background:#f97316;border:2px solid #dc2626}
.zi-note{font-size:11.5px;color:var(--ink3);line-height:1.4;margin:0;padding:6px 14px 8px}

/* Étiquettes et infobulles de carte */
.leaflet-tooltip.zi-label{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;font-size:11px;font-weight:700;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff}
.leaflet-tooltip.zi-label::before{display:none!important}
.zi-label-region{color:#c2410c!important}
.zi-label-district{color:#6d28d9!important}
.zi-label-commune{color:#0f766e!important}
.zi-label-mbv{color:#0369a1!important;font-size:12.5px!important}
.leaflet-tooltip.zi-hover{background:var(--card);color:var(--ink);border:1px solid var(--line);font-size:12px}
.leaflet-tooltip.zi-hover::before{display:none}
.zi .leaflet-bar a{background:var(--card);color:var(--ink);border-color:var(--line)}
.zi .leaflet-control-scale-line{background:var(--card);color:var(--ink);border-color:var(--line)}
.zi .leaflet-control-attribution{background:rgba(255,255,255,.8)!important;color:var(--ink3)!important}

/* Petit écran : la page s'adapte et défile */
@media (max-width:900px){
  .zi{height:auto;min-height:100dvh}
  .zi-body{grid-template-columns:1fr}
  .zi-panel{border-right:0;order:2;overflow:visible}
  .zi-mcard{order:1;margin:10px 10px 0}
  .zi-mbox{min-height:50vh;flex:none}
  .zi-scroll{overflow:visible}
  .zi-acts{max-height:none;grid-template-columns:1fr}
  .zi-duo{grid-template-columns:1fr}
  .zi-stats{grid-template-columns:repeat(2,1fr)}
  .zi-hero-sep{display:none}
}
`;
