/**
 * PanneauIndicateurs.tsx — version corrigée
 *
 * - Économie : marchés et routes, issus d'OpenStreetMap (OsmIndicateurs).
 * - Social   : santé issue du wiki OSM « Formations Sanitaires / Suivi » (SanteFormations).
 *              OsmIndicateurs n'est plus appelé pour le social, donc plus de requête Overpass ici.
 *
 * La carte de Madagascar et les filtres région / district / commune ne changent pas.
 */
import OsmIndicateurs from "./OsmIndicateurs";
import SanteFormations from "./SanteFormations";
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

  if (theme === "social") {
    return (
      <SanteFormations
        region={zone.region}
        district={zone.district}
        commune={zone.commune}
      />
    );
  }

  return <OsmIndicateurs theme={theme} lang={lang} geometry={zone.geometry} />;
}
