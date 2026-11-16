/**
 * PanneauIndicateurs.tsx
 * Affiche dans le panneau de gauche les cartes OpenStreetMap
 * (Économie : marchés et routes ; Social : santé et éducation).
 *
 * La carte de Madagascar et les filtres région / district / commune ne changent pas.
 * Les indicateurs de la base (/api/import?type=indicateurs) ne sont plus appelés ici,
 * car cette route sert à écrire des données, pas à les lire.
 */
import OsmIndicateurs from "./OsmIndicateurs";
import { TERR_TEXTS, type Lang } from "./territoireTexts";

export type ZoneSel = {
  niveau: "ADM1" | "ADM2" | "ADM3" | "parcelle" | null;
  nom: string;
  region: string | null;
  district: string | null;
  commune: string | null;
  geometry: unknown | null;
};

export default function PanneauIndicateurs({
  theme,
  lang,
  zone,
}: {
  theme: "economie" | "social";
  lang: Lang;
  zone: ZoneSel;
}) {
  const tx = TERR_TEXTS[lang];

  if (!zone.niveau) return <p className="at-note">{tx.choisir}</p>;
  if (zone.niveau === "parcelle") {
    return <p className="at-alert" role="alert">{tx.parcelleNonSupportee}</p>;
  }

  return <OsmIndicateurs theme={theme} lang={lang} geometry={zone.geometry} />;
}
