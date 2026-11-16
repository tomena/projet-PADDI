/**
 * OsmIndicateurs.tsx
 * Affiche les données OpenStreetMap de la zone sélectionnée.
 *  - Onglet Social   : santé, éducation
 *  - Onglet Économie : marchés et commerces, routes
 *
 * Appelle POST /api/osm-territoire (fichier api/osm-territoire.js).
 * Utilise les classes CSS déjà présentes dans AnalyseTerritoriale (at-card, at-tbl, at-alert…).
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Lang = "fr" | "en" | "de" | "mg";
type Props = {
  theme: "economie" | "social";
  lang: Lang;
  geometry: unknown | null;
};

type Donnees = {
  date: string;
  aire_km2: number;
  sante: { etablissements: number; pharmacies: number; distance_km: number | null };
  education: { ecoles: number; superieur: number; distance_km: number | null };
  marches: { marches: number; commerces: number; distance_km: number | null };
  routes: {
    total_km: number;
    nationales_km: number;
    secondaires_km: number;
    pistes_km: number;
    densite_100km2: number | null;
  } | null;
};

type Textes = Record<string, string>;

const TX: Record<Lang, Textes> = {
  fr: {
    titreSante: "Santé",
    titreEducation: "Éducation",
    titreMarches: "Marchés et commerces",
    titreRoutes: "Routes et accès",
    etab: "Établissements de santé",
    pharma: "Pharmacies",
    distSante: "Le plus proche (depuis le centre de la zone)",
    ecoles: "Écoles et maternelles",
    sup: "Collèges, lycées et universités",
    distEcole: "École la plus proche (depuis le centre)",
    marches: "Marchés",
    commerces: "Commerces d'alimentation",
    distMarche: "Marché le plus proche (depuis le centre)",
    routesTot: "Longueur totale",
    nat: "Routes nationales et régionales",
    sec: "Routes secondaires et tertiaires",
    pistes: "Pistes",
    densite: "Densité routière",
    km: "km",
    per100: "pour 100 km²",
    chargement: "Chargement des données OpenStreetMap…",
    indispo: "Données OpenStreetMap indisponibles",
    reessayer: "Réessayer",
    aucun: "Aucun dans la zone",
    tropGrand: "Zone trop grande pour les données routières : choisissez un district ou une commune.",
    source: "Source : OpenStreetMap © contributeurs (ODbL). Un chiffre bas peut signifier une donnée non saisie.",
  },
  en: {
    titreSante: "Health",
    titreEducation: "Education",
    titreMarches: "Markets and shops",
    titreRoutes: "Roads and access",
    etab: "Health facilities",
    pharma: "Pharmacies",
    distSante: "Nearest (from zone centre)",
    ecoles: "Schools and kindergartens",
    sup: "Colleges, high schools, universities",
    distEcole: "Nearest school (from zone centre)",
    marches: "Markets",
    commerces: "Food shops",
    distMarche: "Nearest market (from zone centre)",
    routesTot: "Total length",
    nat: "National and regional roads",
    sec: "Secondary and tertiary roads",
    pistes: "Tracks",
    densite: "Road density",
    km: "km",
    per100: "per 100 km²",
    chargement: "Loading OpenStreetMap data…",
    indispo: "OpenStreetMap data unavailable",
    reessayer: "Retry",
    aucun: "None in zone",
    tropGrand: "Zone too large for road data: select a district or commune.",
    source: "Source: OpenStreetMap © contributors (ODbL). A low figure may mean data not yet mapped.",
  },
  de: {
    titreSante: "Gesundheit",
    titreEducation: "Bildung",
    titreMarches: "Märkte und Geschäfte",
    titreRoutes: "Straßen und Erreichbarkeit",
    etab: "Gesundheitseinrichtungen",
    pharma: "Apotheken",
    distSante: "Nächste (vom Zentrum der Zone)",
    ecoles: "Schulen und Kindergärten",
    sup: "Colleges, Gymnasien, Universitäten",
    distEcole: "Nächste Schule (vom Zentrum)",
    marches: "Märkte",
    commerces: "Lebensmittelgeschäfte",
    distMarche: "Nächster Markt (vom Zentrum)",
    routesTot: "Gesamtlänge",
    nat: "Nationale und regionale Straßen",
    sec: "Sekundär- und Tertiärstraßen",
    pistes: "Pisten",
    densite: "Straßendichte",
    km: "km",
    per100: "pro 100 km²",
    chargement: "OpenStreetMap-Daten werden geladen…",
    indispo: "OpenStreetMap-Daten nicht verfügbar",
    reessayer: "Erneut versuchen",
    aucun: "Keine in der Zone",
    tropGrand: "Zone zu groß für Straßendaten: Distrikt oder Gemeinde wählen.",
    source: "Quelle: OpenStreetMap © Mitwirkende (ODbL). Ein niedriger Wert kann fehlende Daten bedeuten.",
  },
  // Malgache : traduction à faire relire par un locuteur natif avant mise en production.
  mg: {
    titreSante: "Fahasalamana",
    titreEducation: "Fampianarana",
    titreMarches: "Tsena sy fivarotana",
    titreRoutes: "Lalana sy fidirana",
    etab: "Toeram-pitsaboana",
    pharma: "Farmasia",
    distSante: "Akaiky indrindra (avy amin'ny ivon'ny faritra)",
    ecoles: "Sekoly sy zanatanana",
    sup: "Lycée, kolejy, oniversite",
    distEcole: "Sekoly akaiky indrindra",
    marches: "Tsena",
    commerces: "Fivarotana sakafo",
    distMarche: "Tsena akaiky indrindra",
    routesTot: "Halavan'ny lalana rehetra",
    nat: "Lalana nasionaly sy faritany",
    sec: "Lalana faharoa sy fahatelo",
    pistes: "Lalan-kely",
    densite: "Hakitroky ny lalana",
    km: "km",
    per100: "isaky ny 100 km²",
    chargement: "Eo am-pampidirana ny angon-drakitra OpenStreetMap…",
    indispo: "Tsy azo ny angon-drakitra OpenStreetMap",
    reessayer: "Andramo indray",
    aucun: "Tsy misy ao amin'ny faritra",
    tropGrand: "Lehibe loatra ny faritra ho an'ny lalana: misafidiana distrika na kaominina.",
    source: "Loharano: OpenStreetMap © mpandray anjara (ODbL). Ny isa ambany dia mety midika fa tsy voatonta.",
  },
};

const LOCALE: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };
const CACHE = new Map<string, Donnees>();

export default function OsmIndicateurs({ theme, lang, geometry }: Props) {
  const tx = TX[lang] ?? TX.fr;
  const cle = useMemo(() => (geometry ? JSON.stringify(geometry) : ""), [geometry]);
  const [etat, setEtat] = useState<{ data: Donnees | null; busy: boolean; err: string | null }>({
    data: null,
    busy: false,
    err: null,
  });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!cle) {
      setEtat({ data: null, busy: false, err: null });
      return;
    }
    const hit = CACHE.get(cle);
    if (hit && essai === 0) {
      setEtat({ data: hit, busy: false, err: null });
      return;
    }
    const ctl = new AbortController();
    setEtat({ data: null, busy: true, err: null });
    fetch("/api/osm-territoire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry }),
      signal: ctl.signal,
    })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.erreur || `HTTP ${r.status}`);
        CACHE.set(cle, j as Donnees);
        setEtat({ data: j as Donnees, busy: false, err: null });
      })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        setEtat({ data: null, busy: false, err: e?.message || "erreur" });
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, essai]);

  const reessayer = () => {
    CACHE.delete(cle);
    setEssai((n) => n + 1);
  };

  const n = (v: number | null | undefined, d = 0) =>
    v == null || !Number.isFinite(v) ? "—" : v.toLocaleString(LOCALE[lang], { maximumFractionDigits: d });
  const km = (v: number | null | undefined) => (v == null ? tx.aucun : `${n(v, 1)} ${tx.km}`);
  const ligne = (libelle: string, valeur: string) => (
    <tr key={libelle}>
      <td>{libelle}</td>
      <td>{valeur}</td>
    </tr>
  );

  if (!cle) return null;
  if (etat.busy) return <p className="at-load">{tx.chargement}</p>;
  if (etat.err) {
    return (
      <p className="at-alert" role="alert">
        {tx.indispo} ({etat.err}){" "}
        <button type="button" className="at-link" onClick={reessayer}>
          {tx.reessayer}
        </button>
      </p>
    );
  }
  const d = etat.data;
  if (!d) return null;

  const carte = (titre: string, lignes: ReactNode) => (
    <section className="at-card at-c">
      <h3>{titre}</h3>
      <table className="at-tbl">
        <tbody>{lignes}</tbody>
      </table>
      <p className="at-note">
        {tx.source} · {d.date}
      </p>
    </section>
  );

  const cSante = carte(tx.titreSante, [
    ligne(tx.etab, n(d.sante.etablissements)),
    ligne(tx.pharma, n(d.sante.pharmacies)),
    ligne(tx.distSante, km(d.sante.distance_km)),
  ]);

  const cEducation = carte(tx.titreEducation, [
    ligne(tx.ecoles, n(d.education.ecoles)),
    ligne(tx.sup, n(d.education.superieur)),
    ligne(tx.distEcole, km(d.education.distance_km)),
  ]);

  const cMarches = carte(tx.titreMarches, [
    ligne(tx.marches, n(d.marches.marches)),
    ligne(tx.commerces, n(d.marches.commerces)),
    ligne(tx.distMarche, km(d.marches.distance_km)),
  ]);

  const cRoutes = d.routes ? (
    carte(tx.titreRoutes, [
      ligne(tx.routesTot, `${n(d.routes.total_km)} ${tx.km}`),
      ligne(tx.nat, `${n(d.routes.nationales_km)} ${tx.km}`),
      ligne(tx.sec, `${n(d.routes.secondaires_km)} ${tx.km}`),
      ligne(tx.pistes, `${n(d.routes.pistes_km)} ${tx.km}`),
      ligne(tx.densite, `${n(d.routes.densite_100km2, 1)} ${tx.km} ${tx.per100}`),
    ])
  ) : (
    <section className="at-card at-c">
      <h3>{tx.titreRoutes}</h3>
      <p className="at-alert">{tx.tropGrand}</p>
    </section>
  );

  return (
    <div className="at-duo">
      {theme === "social" ? (
        <>
          {cSante}
          {cEducation}
        </>
      ) : (
        <>
          {cMarches}
          {cRoutes}
        </>
      )}
    </div>
  );
}
