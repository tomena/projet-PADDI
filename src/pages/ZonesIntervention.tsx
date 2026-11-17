/**
 * ZonesIntervention.tsx — zones d'intervention des projets
 * Suit le thème clair/sombre de l'application (variables CSS, comme AnalyseTerritoriale).
 * 4 langues (fr, mg, en, de). Fonds de carte : Topographie, Satellite, OpenStreetMap.
 * Dépendances : leaflet, @types/leaflet, lucide-react, ../context/LanguageContext, ../lib/fireGeo
 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, Trees, Sprout, Leaf, MapPin, RotateCcw, Globe2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { DATA, PROP, useGeo, toZones } from "../lib/fireGeo";

/* ===================== OUTIL DE COMPARAISON ===================== */
/* Doit être déclaré AVANT les constantes qui l'utilisent (SURB_*). */

const cle = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/* ===================== DONNÉES DES PROJETS ===================== */

type TypeActivite = "restauration" | "reboisement" | "autre";
type Activite = { type: TypeActivite; titre: string; annee?: number; surface_ha?: number };
type Commune = { nom: string; activites: Activite[]; objectif_ha?: number };
type District = { nom: string; communes: Commune[] };
type Region = { nom: string; districts: District[] };
type Projet = { id: string; nom: string; alias: string[]; regions: Region[] };

/* Crée une liste de communes sans activité ni objectif renseignés */
const communesVides = (...noms: string[]): Commune[] => noms.map((nom) => ({ nom, activites: [] }));

/*
 * Activité  : { type: "reboisement", titre: "Plantation de filao", annee: 2025, surface_ha: 120 }
 * Objectif  : objectif_ha: 500  (superficie cible de la commune, en ha)
 * Nom de région : orthographe officielle (geoBoundaries) : « Vakinankaratra ».
 */
const PROJETS: Projet[] = [
  {
    id: "paddi",
    nom: "PADDI+",
    alias: ["paddi", "paddi+", "paddi plus"],
    regions: [
      {
        nom: "Boeny",
        districts: [
          {
            nom: "Ambato Boeni",
            communes: communesVides("Ankijabe", "Andranofasika", "Ambondromamy", "Tsaramandroso"),
          },
          {
            nom: "Marovoay",
            communes: communesVides("Ankazomborona", "Marosakoa"),
          },
        ],
      },
      {
        nom: "Diana",
        districts: [
          {
            nom: "Antsiranana II",
            communes: communesVides(
              "Anivorano-Nord",
              "Antsoha",
              "Ankarongana",
              "Joffre Ville",
              "Sakaramy",
              "Mangaoka",
              "Antsahampano",
            ),
          },
          {
            nom: "Ambilobe",
            communes: communesVides("Antsaravibe", "Tanambao Marivorahona"),
          },
        ],
      },
      {
        nom: "Vakinankaratra",
        districts: [{ nom: "Antanifotsy", communes: [] }],
      },
      {
        nom: "Amoron'i Mania",
        districts: [
          { nom: "Fandriana", communes: [] },
          { nom: "Ambositra", communes: [] },
        ],
      },
      {
        nom: "Atsimo Atsinanana",
        districts: [
          { nom: "Befotaka", communes: [] },
          { nom: "Midongy Atsimo", communes: [] },
          { nom: "Vangaindrano", communes: [] },
        ],
      },
      {
        nom: "Anosy",
        districts: [{ nom: "Taolagnaro", communes: [] }],
      },
    ],
  },
];

type Ligne = { projet: Projet; region: Region; district?: District; commune?: Commune };
type LigneCommune = Ligne & { district: District; commune: Commune };

const LIGNES: Ligne[] = PROJETS.flatMap((projet) =>
  projet.regions.flatMap((region) => {
    if (!region.districts.length) return [{ projet, region }];
    return region.districts.flatMap((district) =>
      district.communes.length
        ? district.communes.map((commune) => ({ projet, region, district, commune }))
        : [{ projet, region, district }]
    );
  })
);

/* Clé d'une ligne : région|district|commune (vides si absents) */
const cleLigne = (l: Ligne) =>
  [cle(l.region.nom), l.district ? cle(l.district.nom) : "", l.commune ? cle(l.commune.nom) : ""].join("|");

/* Régions d'intervention (noms uniques dans geoBoundaries) */
const SURB_REG = new Set(LIGNES.map((l) => cle(l.region.nom)));

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
  recherche: "Projet, région, district ou commune (ex. PADDI+, Boeny, Marovoay)",
  rechercheAria: "Rechercher une zone d'intervention",
  effacer: "Effacer",
  retirer: "Retirer de la liste",
  vueMada: "Vue Madagascar",
  vueTitre: "Zones d'intervention",
  vueTexte: "Recherchez un projet, une région, un district ou une commune, ou cliquez sur un projet ci-dessous.",
  aucunResultat: "Aucun résultat pour cette recherche.",
  regions: "Régions",
  districts: "Districts",
  communes: "Communes",
  parCommune: "Par commune",
  colCommune: "Commune",
  colResto: "Restauration",
  colReboisement: "Reboisement",
  colSuperficie: "Superficie (ha)",
  colObjectif: "Objectif (ha)",
  total: "Total",
  activites: "Activités environnementales",
  aucuneActivite: "Aucune activité renseignée",
  zonesInterv: "Zones d'intervention",
  communesNon: "Communes non renseignées",
  districtsNon: "Districts non renseignés",
  types: { restauration: "Restauration", reboisement: "Reboisement", autre: "Autres projets environnementaux" },
  niveaux: { projet: "Projet", region: "Région", district: "District", commune: "Commune" },
  projetCtx: "Projet d'intervention",
  regionCtx: "Région",
  legRegion: "Région",
  legDistrict: "District",
  legCommune: "Commune",
  legAP: "Aire protégée",
  legSelection: "Sélection",
  carteAria: "Carte des zones d'intervention",
  carteTitre: "Madagascar : zones d'intervention",
  projetsConcernes: "Projets concernés",
  fondAria: "Fond de carte",
  fondTopo: "Topographie",
  fondSat: "Satellite",
  fondOsm: "OpenStreetMap",
  note: "Limites : geoBoundaries (ADM1 à ADM3). Superficies calculées à partir des contours, donc approximatives.",
  erreur: "Impossible de charger les limites administratives.",
};

type Dict = typeof FR;

const MG: Dict = {
  titre: "Faritra fanatanterahan'ny tetikasa",
  sousTitre: "Fitoerana ny faritra, distrika sy kaominina misy ny tetikasa",
  recherche: "Tetikasa, faritra, distrika na kaominina (ohatra: PADDI+, Boeny, Marovoay)",
  rechercheAria: "Hitady faritra fanatanterahana",
  effacer: "Esory",
  retirer: "Esorina amin'ny lisitra",
  vueMada: "Madagasikara manontolo",
  vueTitre: "Faritra fanatanterahana",
  vueTexte: "Hitady tetikasa, faritra, distrika na kaominina, na tsindrio ny tetikasa etsy ambany.",
  aucunResultat: "Tsy misy valiny ho an'ity fikarohana ity.",
  regions: "Faritra",
  districts: "Distrika",
  communes: "Kaominina",
  parCommune: "Isaky ny kaominina",
  colCommune: "Kaominina",
  colResto: "Fanarenana",
  colReboisement: "Fambolena ala",
  colSuperficie: "Habetsahana (ha)",
  colObjectif: "Tanjona (ha)",
  total: "Totaly",
  activites: "Asa ara-tontolo iainana",
  aucuneActivite: "Tsy misy asa voarakitra",
  zonesInterv: "Faritra fanatanterahana",
  communesNon: "Kaominina tsy voarakitra",
  districtsNon: "Distrika tsy voarakitra",
  types: { restauration: "Fanarenana", reboisement: "Fambolena ala", autre: "Tetikasa hafa momba ny tontolo iainana" },
  niveaux: { projet: "Tetikasa", region: "Faritra", district: "Distrika", commune: "Kaominina" },
  projetCtx: "Tetikasa fanatanterahana",
  regionCtx: "Faritra",
  legRegion: "Faritra",
  legDistrict: "Distrika",
  legCommune: "Kaominina",
  legAP: "Faritra arovana",
  legSelection: "Voafantina",
  carteAria: "Sarintanin'ny faritra fanatanterahana",
  carteTitre: "Madagasikara: faritra fanatanterahana",
  projetsConcernes: "Tetikasa voakasika",
  fondAria: "Fototra sarintany",
  fondTopo: "Topografia",
  fondSat: "Zanabolana",
  fondOsm: "OpenStreetMap",
  note: "Sisin-tany: geoBoundaries (ADM1 ka hatramin'ny ADM3). Ny habetsahana dia tombanana avy amin'ny sisin-tany, ka mety tsy marina tanteraka.",
  erreur: "Tsy afaka naka ny sisin-tany administratifa.",
};

const EN: Dict = {
  titre: "Project intervention zones",
  sousTitre: "Location of the regions, districts and communes where the projects operate",
  recherche: "Project, region, district or commune (e.g. PADDI+, Boeny, Marovoay)",
  rechercheAria: "Search an intervention zone",
  effacer: "Clear",
  retirer: "Remove from list",
  vueMada: "Madagascar view",
  vueTitre: "Intervention zones",
  vueTexte: "Search for a project, region, district or commune, or click a project below.",
  aucunResultat: "No result for this search.",
  regions: "Regions",
  districts: "Districts",
  communes: "Communes",
  parCommune: "By commune",
  colCommune: "Commune",
  colResto: "Restoration",
  colReboisement: "Reforestation",
  colSuperficie: "Area (ha)",
  colObjectif: "Target (ha)",
  total: "Total",
  activites: "Environmental activities",
  aucuneActivite: "No activity recorded",
  zonesInterv: "Intervention zones",
  communesNon: "Communes not recorded",
  districtsNon: "Districts not recorded",
  types: { restauration: "Restoration", reboisement: "Reforestation", autre: "Other environmental projects" },
  niveaux: { projet: "Project", region: "Region", district: "District", commune: "Commune" },
  projetCtx: "Intervention project",
  regionCtx: "Region",
  legRegion: "Region",
  legDistrict: "District",
  legCommune: "Commune",
  legAP: "Protected area",
  legSelection: "Selection",
  carteAria: "Intervention zones map",
  carteTitre: "Madagascar: intervention zones",
  projetsConcernes: "Projects involved",
  fondAria: "Basemap",
  fondTopo: "Topographic",
  fondSat: "Satellite",
  fondOsm: "OpenStreetMap",
  note: "Boundaries: geoBoundaries (ADM1 to ADM3). Areas are computed from the outlines, so they are approximate.",
  erreur: "Unable to load the administrative boundaries.",
};

const DE: Dict = {
  titre: "Interventionsgebiete der Projekte",
  sousTitre: "Lage der Regionen, Distrikte und Gemeinden, in denen die Projekte tätig sind",
  recherche: "Projekt, Region, Distrikt oder Gemeinde (z. B. PADDI+, Boeny, Marovoay)",
  rechercheAria: "Interventionsgebiet suchen",
  effacer: "Leeren",
  retirer: "Aus der Liste entfernen",
  vueMada: "Ansicht Madagaskar",
  vueTitre: "Interventionsgebiete",
  vueTexte: "Suchen Sie ein Projekt, eine Region, einen Distrikt oder eine Gemeinde, oder klicken Sie unten auf ein Projekt.",
  aucunResultat: "Kein Ergebnis für diese Suche.",
  regions: "Regionen",
  districts: "Distrikte",
  communes: "Gemeinden",
  parCommune: "Nach Gemeinde",
  colCommune: "Gemeinde",
  colResto: "Wiederherstellung",
  colReboisement: "Aufforstung",
  colSuperficie: "Fläche (ha)",
  colObjectif: "Ziel (ha)",
  total: "Gesamt",
  activites: "Umweltaktivitäten",
  aucuneActivite: "Keine Aktivität erfasst",
  zonesInterv: "Interventionsgebiete",
  communesNon: "Gemeinden nicht erfasst",
  districtsNon: "Distrikte nicht erfasst",
  types: { restauration: "Wiederherstellung", reboisement: "Aufforstung", autre: "Andere Umweltprojekte" },
  niveaux: { projet: "Projekt", region: "Region", district: "Distrikt", commune: "Gemeinde" },
  projetCtx: "Interventionsprojekt",
  regionCtx: "Region",
  legRegion: "Region",
  legDistrict: "Distrikt",
  legCommune: "Gemeinde",
  legAP: "Schutzgebiet",
  legSelection: "Auswahl",
  carteAria: "Karte der Interventionsgebiete",
  carteTitre: "Madagaskar: Interventionsgebiete",
  projetsConcernes: "Beteiligte Projekte",
  fondAria: "Kartengrundlage",
  fondTopo: "Topografie",
  fondSat: "Satellit",
  fondOsm: "OpenStreetMap",
  note: "Grenzen: geoBoundaries (ADM1 bis ADM3). Flächen werden aus den Umrissen berechnet und sind daher ungefähr.",
  erreur: "Die Verwaltungsgrenzen konnten nicht geladen werden.",
};

type Lang = "fr" | "mg" | "en" | "de";
const T: Record<Lang, Dict> = { fr: FR, mg: MG, en: EN, de: DE };
const LOCALE: Record<Lang, string> = { fr: "fr-FR", mg: "fr-FR", en: "en-US", de: "de-DE" };

/* ===================== OUTILS ===================== */

type Niveau = "projet" | "region" | "district" | "commune";

type Sel = {
  niveau: Niveau;
  label: string;
  cle: string;
  recherche: string;
  projetId?: string;
  regionCle?: string;
  districtCle?: string;
  regionNom?: string;
  districtNom?: string;
};

/* Arborescence pour le panneau « Zones d'intervention » */
type Noeud = { nom: string; districts: { nom: string; communes: string[] }[] };

const RANG: Record<Niveau, number> = { projet: 0, region: 1, district: 2, commune: 3 };

const TYPE_ICONE: Record<TypeActivite, { couleur: string; icone: typeof Leaf }> = {
  restauration: { couleur: "#65a30d", icone: Sprout },
  reboisement: { couleur: "#15803d", icone: Trees },
  autre: { couleur: "#0891b2", icone: Leaf },
};

const idSug = (s: Sel) => [s.niveau, s.regionCle, s.districtCle, s.cle].join("|");

const SUGGESTIONS: Sel[] = (() => {
  const vues = new Map<string, Sel>();
  const ajouter = (s: Sel) => {
    const k = idSug(s);
    if (!vues.has(k)) vues.set(k, s);
  };
  PROJETS.forEach((p) =>
    ajouter({
      niveau: "projet",
      label: p.nom,
      cle: cle(p.id),
      recherche: [p.nom, ...p.alias].map(cle).join(" "),
      projetId: p.id,
    })
  );
  LIGNES.forEach(({ region, district, commune }) => {
    const rk = cle(region.nom);
    ajouter({ niveau: "region", label: region.nom, cle: rk, regionCle: rk, recherche: rk, regionNom: region.nom });
    if (district) {
      const dk = cle(district.nom);
      ajouter({
        niveau: "district",
        label: district.nom,
        cle: dk,
        regionCle: rk,
        recherche: dk,
        regionNom: region.nom,
        districtNom: district.nom,
      });
      if (commune) {
        const ck = cle(commune.nom);
        ajouter({
          niveau: "commune",
          label: commune.nom,
          cle: ck,
          regionCle: rk,
          districtCle: dk,
          recherche: ck,
          regionNom: region.nom,
          districtNom: district.nom,
        });
      }
    }
  });
  return [...vues.values()];
})();

const trouver = (niveau: Niveau, k: string, regionK?: string, districtK?: string) =>
  SUGGESTIONS.find(
    (s) =>
      s.niveau === niveau &&
      s.cle === k &&
      (regionK === undefined || s.regionCle === regionK) &&
      (districtK === undefined || s.districtCle === districtK)
  );

const contexteDe = (s: Sel, t: Dict) =>
  s.niveau === "projet"
    ? t.projetCtx
    : s.niveau === "region"
    ? t.regionCtx
    : s.niveau === "district"
    ? `${t.regionCtx} ${s.regionNom}`
    : `${s.regionNom} · ${s.districtNom}`;

function correspond(l: Ligne, s: Sel): boolean {
  const rk = cle(l.region.nom);
  switch (s.niveau) {
    case "projet":
      return l.projet.id === s.projetId;
    case "region":
      return rk === s.cle;
    case "district":
      return rk === s.regionCle && !!l.district && cle(l.district.nom) === s.cle;
    case "commune":
      return (
        rk === s.regionCle &&
        !!l.district &&
        cle(l.district.nom) === s.districtCle &&
        !!l.commune &&
        cle(l.commune.nom) === s.cle
      );
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

type Etat = "hors" | "inter" | "choisie";
type NivZone = "region" | "district" | "commune";

/* Épaisseurs de trait réduites pour des limites plus fines. */
const STYLE: Record<NivZone, Record<Etat, L.PathOptions>> = {
  region: {
    hors: { color: "#64748b", weight: 0.5, fillColor: "#94a3b8", fillOpacity: 0.05 },
    inter: { color: "#ea580c", weight: 1.5, fillColor: "#ff6a00", fillOpacity: 0.14 },
    choisie: { color: "#dc2626", weight: 2, fillColor: "#ff6a00", fillOpacity: 0.3 },
  },
  district: {
    hors: { color: "#64748b", weight: 0.4, fillColor: "#94a3b8", fillOpacity: 0.03 },
    inter: { color: "#7c3aed", weight: 1, fillColor: "#a78bfa", fillOpacity: 0.3 },
    choisie: { color: "#dc2626", weight: 1.5, fillColor: "#7c3aed", fillOpacity: 0.5 },
  },
  commune: {
    hors: { color: "#64748b", weight: 0.3, fillColor: "#94a3b8", fillOpacity: 0.03 },
    inter: { color: "#0f766e", weight: 0.8, fillColor: "#14b8a6", fillOpacity: 0.45 },
    choisie: { color: "#dc2626", weight: 1.5, fillColor: "#0d9488", fillOpacity: 0.6 },
  },
};

function dessiner(
  g: L.LayerGroup,
  f: Feat,
  niv: NivZone,
  etat: Etat,
  etiquette: boolean,
  onClick?: () => void
) {
  const nom = nomFeat(f);
  const couc = L.geoJSON(f as any, { style: STYLE[niv][etat] });
  couc.bindTooltip(
    nom,
    etiquette
      ? { permanent: true, direction: "center", className: `zi-label zi-label-${niv}` }
      : { sticky: true, className: "zi-hover" }
  );
  if (onClick && etat !== "hors") couc.on("click", onClick);
  couc.addTo(g);
}

type ActiviteLocalisee = Activite & { region: string; district: string; commune: string };

/* ===================== COMPOSANT ===================== */

export default function ZonesIntervention() {
  const { lang: brut } = useLanguage();
  const lang: Lang = (["fr", "mg", "en", "de"] as string[]).includes(brut as string) ? (brut as Lang) : "fr";
  const t = T[lang];

  const elMap = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const couche = useRef<L.LayerGroup | null>(null);
  const fond = useRef<L.TileLayer | null>(null);

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

  /* ----- aires protégées (mêmes données que la page feux) ----- */
  const [airesF] = useGeo(DATA.aires);
  const apZ = useMemo(() => toZones(airesF, PROP.ap, ""), [airesF]);

  /* ----- actions ----- */
  const choisir = (s: Sel) => {
    setSel(s);
    setVide(false);
    setRequete(s.label);
    setOuvert(false);
  };
  const effacer = () => {
    setSel(null);
    setVide(false);
    setRequete("");
    setOuvert(false);
    setMasques(new Set());
  };
  const choisirZone = (niveau: Niveau, k: string, rk?: string, dk?: string) => {
    const s = trouver(niveau, k, rk, dk);
    if (s) choisir(s);
  };

  /* ----- saisie : le panneau suit la recherche ; sans résultat, tout reste vide ----- */
  const saisir = (v: string) => {
    setRequete(v);
    setOuvert(true);
    if (!v) {
      setSel(null);
      setVide(false);
      setMasques(new Set());
      return;
    }
    const q = cle(v);
    const exact = SUGGESTIONS.find((s) => cle(s.label) === q);
    if (exact) {
      setSel(exact);
      setVide(false);
      return;
    }
    const trouve = SUGGESTIONS.some((s) => s.recherche.includes(q));
    setSel(null);
    setVide(!trouve);
  };

  /* ----- suggestions (sans celles que l'on a retirées avec la croix) ----- */
  const suggestions = useMemo(() => {
    const q = cle(requete);
    if (!q) return [];
    return SUGGESTIONS.filter((s) => s.recherche.includes(q) && !masques.has(idSug(s)))
      .sort((a, b) => RANG[a.niveau] - RANG[b.niveau] || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [requete, masques]);

  /* ----- périmètre ----- */
  const lignes = useMemo(() => (sel ? LIGNES.filter((l) => correspond(l, sel)) : []), [sel]);
  const actives = useMemo<Ligne[]>(() => (vide ? [] : sel ? lignes : LIGNES), [vide, sel, lignes]);

  /* ----- correspondance géographique : chaque district et commune est trouvé À L'INTÉRIEUR
         de sa région et de son district, pour éviter les homonymes ailleurs dans le pays ----- */
  const { featDis, featCom, ligneDis, ligneCom } = useMemo(() => {
    const featDis = new Map<string, Feat>();
    const featCom = new Map<string, Feat>();
    const ligneDis = new Map<Feat, Ligne>();
    const ligneCom = new Map<Feat, Ligne>();

    LIGNES.forEach((l) => {
      if (!l.district) return;
      const rF = regions.find((r) => cle(nomFeat(r)) === cle(l.region.nom));
      const dk = cle(l.district.nom);
      const candD = districts.filter((d) => cle(nomFeat(d)) === dk);
      const dF = rF ? candD.find((d) => estDans(d, rF)) : candD[0];
      if (!dF) return;

      const kD = `${cle(l.region.nom)}|${dk}|`;
      if (!featDis.has(kD)) {
        featDis.set(kD, dF);
        ligneDis.set(dF, { projet: l.projet, region: l.region, district: l.district });
      }

      if (!l.commune) return;
      const ck = cle(l.commune.nom);
      const cF = communes.find((c) => cle(nomFeat(c)) === ck && estDans(c, dF));
      if (cF) {
        featCom.set(cleLigne(l), cF);
        ligneCom.set(cF, l);
      }
    });
    return { featDis, featCom, ligneDis, ligneCom };
  }, [regions, districts, communes]);

  const interDisSet = useMemo(() => new Set(featDis.values()), [featDis]);
  const interComSet = useMemo(() => new Set(featCom.values()), [featCom]);

  /* Région, district et commune actuellement choisis (géométries) */
  const regionCle = sel ? (sel.niveau === "region" ? sel.cle : sel.regionCle ?? null) : null;
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
    const ids = new Set(lignes.map((l) => cle(l.region.nom)));
    return regions.filter((f) => ids.has(cle(nomFeat(f))));
  }, [lignes, regions]);

  /* ----- carte : création ----- */
  useEffect(() => {
    const m = L.map(elMap.current!, { zoomControl: false }).fitBounds(MADA);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    m.createPane("zi-ap").style.zIndex = "450";
    couche.current = L.layerGroup().addTo(m);
    map.current = m;
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

  /* ----- dessin : aires protégées, régions, districts, communes d'intervention ----- */
  useEffect(() => {
    const g = couche.current;
    if (!g) return;
    g.clearLayers();

    /* Aires protégées : limites comme sur la page feux */
    apZ.forEach((z) => {
      L.geoJSON(z.feature as any, {
        pane: "zi-ap",
        interactive: true,
        style: { color: "#16a34a", weight: 1.2, fillColor: "#22c55e", fillOpacity: 0.1 },
      })
        .bindTooltip(String(z.nom), { sticky: true, className: "zi-hover" })
        .addTo(g);
    });

    /* Recherche sans résultat : aucune zone d'intervention n'est affichée */
    if (vide) return;

    const n = sel?.niveau ?? "vue";
    const etiqRegion = n === "vue" || n === "projet" || n === "region";
    const etiqDistrict = n === "projet" || n === "region" || n === "district";
    const etiqCommune = n === "district" || n === "commune";

    /* Régions */
    regions.forEach((f) => {
      const k = cle(nomFeat(f));
      const inter = SURB_REG.has(k);
      const etat: Etat = n === "region" && regionFeat === f ? "choisie" : inter ? "inter" : "hors";
      dessiner(g, f, "region", etat, etiqRegion && inter, () => {
        if (!inter) return;
        if (n === "region" && regionFeat === f) effacer();
        else choisirZone("region", k);
      });
    });

    /* Districts d'intervention, et tous ceux de la région sélectionnée */
    districts
      .filter((d) => interDisSet.has(d) || (regionFeat && estDans(d, regionFeat)))
      .forEach((d) => {
        const inter = interDisSet.has(d);
        const etat: Etat = n === "district" && districtFeat === d ? "choisie" : inter ? "inter" : "hors";
        dessiner(g, d, "district", etat, etiqDistrict && inter, () => {
          if (!inter) return;
          const l = ligneDis.get(d);
          if (!l) return;
          if (n === "district" && districtFeat === d) choisirZone("region", cle(l.region.nom));
          else choisirZone("district", cle(l.district!.nom), cle(l.region.nom));
        });
      });

    /* Communes d'intervention uniquement (aucune autre commune, même homonyme ailleurs) */
    interComSet.forEach((c) => {
      const etat: Etat = n === "commune" && communeFeat === c ? "choisie" : "inter";
      dessiner(g, c, "commune", etat, etiqCommune, () => {
        const l = ligneCom.get(c);
        if (!l || !l.district || !l.commune) return;
        if (n === "commune" && communeFeat === c)
          choisirZone("district", cle(l.district.nom), cle(l.region.nom));
        else choisirZone("commune", cle(l.commune.nom), cle(l.region.nom), cle(l.district.nom));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apZ, regions, districts, sel, vide, regionFeat, districtFeat, communeFeat, interDisSet, interComSet, ligneDis, ligneCom]);

  /* ----- cadrage ----- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!sel) {
      m.flyToBounds(MADA, { duration: 0.8 });
      return;
    }
    let liste: Feat[] = [];
    if (sel.niveau === "projet") liste = regionsProjet;
    else {
      const cible =
        sel.niveau === "commune" ? communeFeat : sel.niveau === "district" ? districtFeat : regionFeat;
      if (cible) liste = [cible];
    }
    if (!liste.length) return;
    const bounds = liste.map((f) => L.geoJSON(f as any).getBounds()).reduce((a, b) => a.extend(b));
    m.flyToBounds(bounds, { padding: [40, 40], maxZoom: sel.niveau === "commune" ? 11 : 9, duration: 0.9 });
  }, [sel, regionsProjet, regionFeat, districtFeat, communeFeat]);

  /* ----- données du panneau ----- */
  const lignesCommunes = useMemo(
    () => actives.filter((l): l is LigneCommune => !!l.commune && !!l.district),
    [actives]
  );
  const activites = useMemo<ActiviteLocalisee[]>(
    () =>
      lignesCommunes.flatMap((l) =>
        l.commune.activites.map((a) => ({
          ...a,
          region: l.region.nom,
          district: l.district.nom,
          commune: l.commune.nom,
        }))
      ),
    [lignesCommunes]
  );
  const projetsVue = useMemo(
    () => PROJETS.filter((p) => actives.some((l) => l.projet.id === p.id)),
    [actives]
  );

  /* Lignes sans doublon */
  const lignesTableau = useMemo(() => {
    const vues = new Set<string>();
    const out: Ligne[] = [];
    actives.forEach((l) => {
      const k = `${l.region.nom}|${l.district?.nom ?? ""}|${l.commune?.nom ?? ""}`;
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
      if (!regs.has(l.region.nom)) regs.set(l.region.nom, new Map());
      if (!l.district) return;
      const dis = regs.get(l.region.nom)!;
      if (!dis.has(l.district.nom)) dis.set(l.district.nom, []);
      if (l.commune) dis.get(l.district.nom)!.push(l.commune.nom);
    });
    return [...regs.entries()].map(([nom, dis]) => ({
      nom,
      districts: [...dis.entries()].map(([dn, communesN]) => ({ nom: dn, communes: communesN })),
    }));
  }, [lignesTableau]);

  /* Nom de la région affiché à droite du titre */
  const regionAff = !vide && sel ? (sel.niveau === "region" ? sel.label : sel.regionNom ?? null) : null;

  const nbRegions = new Set(actives.map((l) => cle(l.region.nom))).size;
  const nbDistricts = new Set(
    actives.filter((l) => l.district).map((l) => `${cle(l.region.nom)}|${cle(l.district!.nom)}`)
  ).size;

  /* Superficie de la commune, prise dans la géométrie trouvée pour sa ligne */
  const surfaceDe = (l: LigneCommune) => {
    const f = featCom.get(cleLigne(l));
    return f ? surfaceHa(f) : null;
  };
  const totaux = lignesCommunes.reduce(
    (acc, l) => {
      acc.surface += surfaceDe(l) ?? 0;
      acc.objectif += l.commune.objectif_ha ?? 0;
      return acc;
    },
    { surface: 0, objectif: 0 }
  );
  const fmt = (n: number) => Math.round(n).toLocaleString(LOCALE[lang]);
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
                  <strong>{s.label}</strong>
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
      </header>

      {erreur && <div className="zi-erreur" role="alert">{t.erreur}</div>}

      <div className="zi-body">
        <aside className="zi-panel">
          {/* 1. Carte d'accueil / sélection */}
          <section className="zi-card zi-hero">
            {vide ? (
              <p className="zi-fil">{t.aucunResultat}</p>
            ) : sel ? (
              <>
                <span className="zi-niveau">{t.niveaux[sel.niveau]}</span>
                <h2>{sel.label}</h2>
                <p className="zi-fil">{contexteDe(sel, t)}</p>
              </>
            ) : (
              <p className="zi-fil">{t.vueTexte}</p>
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
              <div><b>{nbRegions}</b><span>{t.regions}</span></div>
              <div><b>{nbDistricts}</b><span>{t.districts}</span></div>
              <div><b>{lignesCommunes.length}</b><span>{t.communes}</span></div>
            </div>
          </section>

          {/* 2. Activités environnementales */}
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
                        <th>{t.colResto}</th>
                        <th>{t.colReboisement}</th>
                        <th>{t.colSuperficie}</th>
                        <th>{t.colObjectif}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignesCommunes.map((l) => {
                        const acts = l.commune.activites;
                        const s = surfaceDe(l);
                        const o = l.commune.objectif_ha;
                        return (
                          <tr
                            key={`${l.region.nom}-${l.district.nom}-${l.commune.nom}`}
                            className="zi-row"
                            onClick={() =>
                              choisirZone("commune", cle(l.commune.nom), cle(l.region.nom), cle(l.district.nom))
                            }
                          >
                            <td>{l.commune.nom}</td>
                            <td>{acts.filter((a) => a.type === "restauration").length}</td>
                            <td>{acts.filter((a) => a.type === "reboisement").length}</td>
                            <td>{s != null ? fmt(s) : "—"}</td>
                            <td>{o != null ? fmt(o) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>{t.total}</td>
                        <td>{compte("restauration")}</td>
                        <td>{compte("reboisement")}</td>
                        <td>{fmt(totaux.surface)}</td>
                        <td>{totaux.objectif ? fmt(totaux.objectif) : "—"}</td>
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
              <span>{sel && !vide ? sel.label : t.carteTitre}</span>
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
          <div className="zi-legende">
            <span><i className="zi-lg-reg" />{t.legRegion}</span>
            <span><i className="zi-lg-dis" />{t.legDistrict}</span>
            <span><i className="zi-lg-com" />{t.legCommune}</span>
            <span><i className="zi-lg-ap" />{t.legAP}</span>
            <span><i className="zi-lg-sel" />{t.legSelection}</span>
          </div>
          <p className="zi-note">
            {t.note} {t.projetsConcernes} : {projetsVue.map((p) => p.nom).join(", ") || "—"}.
          </p>
        </section>
      </div>
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
.zi-badge.projet{background:#fde68a;color:#78350f}
.zi-badge.region{background:#ffedd5;color:#9a3412}
.zi-badge.district{background:#ede9fe;color:#5b21b6}
.zi-badge.commune{background:#ccfbf1;color:#115e59}
.zi-erreur{padding:8px 20px;background:rgba(220,38,38,.1);color:#dc2626;font-size:13px}

/* Mise en page : panneau à gauche, carte à droite, le tout sur un seul écran */
.zi-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
.zi-panel{min-height:0;overflow:auto;padding:12px;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:10px;border-right:1px solid var(--line)}
.zi-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;min-width:0}
.zi-hero{display:flex;flex-direction:column;gap:8px;background:linear-gradient(135deg,var(--card),var(--acc-soft))}
.zi-niveau{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--acc)}
.zi-fil{margin:0;font-size:13px;color:var(--ink2);line-height:1.5}
.zi-chips{display:flex;flex-wrap:wrap;gap:6px}
.zi-chip{font-size:12.5px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--chip);cursor:pointer;color:var(--ink2)}
.zi-chip:hover{background:var(--hover)}
.zi-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.zi-stats div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 12px;display:flex;flex-direction:column}
.zi-stats b{font-family:Georgia,serif;font-weight:500;font-size:24px;line-height:1.1;color:var(--acc)}
.zi-stats span{font-size:12px;color:var(--ink3)}

.zi-acts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:150px;overflow:auto}
.zi-typeh{display:flex;align-items:center;gap:6px;font-weight:600;font-size:13px;margin:0 0 4px}
.zi-typeh span{margin-left:auto;font-size:12px;background:var(--hover);color:var(--ink2);padding:1px 8px;border-radius:999px}
.zi-type ul{margin:0;padding-left:16px;font-size:12.5px;line-height:1.5;color:var(--ink2)}
.zi-type small{color:var(--ink3)}
.zi-vide{font-size:13px;color:var(--ink3);margin:2px 0}

/* Zones d'intervention et tableau côte à côte ; en colonne sur petit écran */
.zi-duo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;min-height:0}
.zi-col{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.zi-cardh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}
.zi-cardh h3{margin:0}
.zi-regname{font-size:13px;font-weight:600;color:var(--acc);text-align:right}
.zi-scroll{flex:1;min-height:0;overflow:auto}

/* Tableau Par commune : colonnes séparées par un filet vertical */
.zi-tbl{width:100%;border-collapse:collapse;font-size:12.5px;color:var(--ink)}
.zi-tbl th{font-weight:500;font-size:11.5px;color:var(--ink3);text-align:right;padding:4px 6px;position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--line)}
.zi-tbl td{padding:5px 6px;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
.zi-tbl th+th,.zi-tbl td+td{border-left:1px solid var(--line)}
.zi-tbl th:first-child,.zi-tbl td:first-child{text-align:left}
.zi-tbl tfoot td{font-weight:700;border-top:2px solid var(--line)}
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
.zi-lg-sel{background:#f97316;border:2px solid #dc2626}
.zi-note{font-size:11.5px;color:var(--ink3);line-height:1.4;margin:0;padding:6px 14px 8px}

/* Étiquettes et infobulles de carte */
.leaflet-tooltip.zi-label{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;font-size:11px;font-weight:700;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff}
.leaflet-tooltip.zi-label::before{display:none!important}
.zi-label-region{color:#c2410c!important}
.zi-label-district{color:#6d28d9!important}
.zi-label-commune{color:#0f766e!important}
.leaflet-tooltip.zi-hover{background:var(--card);color:var(--ink);border:1px solid var(--line);font-size:12px}
.leaflet-tooltip.zi-hover::before{display:none}
.zi .leaflet-bar a{background:var(--card);color:var(--ink);border-color:var(--line)}
.zi .leaflet-control-scale-line{background:var(--card);color:var(--ink);border-color:var(--line)}
.zi .leaflet-control-attribution{background:rgba(255,255,255,.8)!important;color:var(--ink3)!important}

/* Petit écran : la page s'adapte et défile */
@media (max-width:900px){
  .zi{height:auto;min-height:100dvh}
  .zi-body{grid-template-columns:1fr}
  .zi-panel{border-right:0;order:2;overflow:visible;display:flex;flex-direction:column}
  .zi-mcard{order:1;margin:10px 10px 0}
  .zi-mbox{min-height:50vh;flex:none}
  .zi-scroll{overflow:visible}
  .zi-acts{max-height:none;grid-template-columns:1fr}
  .zi-duo{grid-template-columns:1fr}
}
`;
