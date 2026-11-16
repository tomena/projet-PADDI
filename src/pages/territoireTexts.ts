/**
 * territoireTexts.ts — textes du panneau Économie / Social (à placer à côté de analyseTexts.ts)
 */
export type Lang = "fr" | "mg" | "en" | "de";

export type TerrTxt = {
  economie: string;
  social: string;
  chargement: string;
  indispo: string;       // {e} = message d'erreur
  aucune: string;
  reessayer: string;
  source: string;
  annee: string;
  choisir: string;
  parcelleNonSupportee: string;
};

export const TERR_TEXTS: Record<Lang, TerrTxt> = {
  fr: {
    economie: "Économie", social: "Social",
    chargement: "Chargement...",
    indispo: "Données indisponibles pour cette zone : {e}",
    aucune: "Aucune donnée disponible pour cette zone.",
    reessayer: "Réessayer",
    source: "Source", annee: "Année",
    choisir: "Sélectionnez une région, un district ou une commune pour afficher les indicateurs.",
    parcelleNonSupportee: "Les indicateurs ne sont pas disponibles pour une parcelle tracée. Sélectionnez une zone administrative.",
  },
  en: {
    economie: "Economy", social: "Social",
    chargement: "Loading...",
    indispo: "Data unavailable for this area: {e}",
    aucune: "No data available for this area.",
    reessayer: "Retry",
    source: "Source", annee: "Year",
    choisir: "Select a region, district or commune to display the indicators.",
    parcelleNonSupportee: "Indicators are not available for a drawn plot. Select an administrative area.",
  },
  de: {
    economie: "Wirtschaft", social: "Soziales",
    chargement: "Wird geladen...",
    indispo: "Daten für dieses Gebiet nicht verfügbar: {e}",
    aucune: "Keine Daten für dieses Gebiet verfügbar.",
    reessayer: "Erneut versuchen",
    source: "Quelle", annee: "Jahr",
    choisir: "Wählen Sie eine Region, einen Distrikt oder eine Gemeinde, um die Indikatoren anzuzeigen.",
    parcelleNonSupportee: "Für eine gezeichnete Parzelle sind keine Indikatoren verfügbar. Wählen Sie ein Verwaltungsgebiet.",
  },
  mg: {
    economie: "Toekarena", social: "Ara-tsosialy",
    chargement: "Eo am-pakàna...",
    indispo: "Tsy misy angon-drakitra ho an'ity faritra ity: {e}",
    aucune: "Tsy misy angon-drakitra ho an'ity faritra ity.",
    reessayer: "Avereno",
    source: "Loharano", annee: "Taona",
    choisir: "Mifidiana faritra, distrika na kaominina mba hijerena ny tondro.",
    parcelleNonSupportee: "Tsy misy tondro ho an'ny tany notarihina. Mifidiana faritra ara-pitantanana.",
  },
};
