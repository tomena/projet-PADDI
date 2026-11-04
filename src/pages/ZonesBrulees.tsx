
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// =====================================================
// TYPES
// =====================================================

type RegionFeature = {
  type: "Feature";
  properties: {
    nom_reg?: string;
    antenne?: string;
    actif?: boolean | number | string;
  };
  geometry: any;
};

type RegionCollection = {
  type: "FeatureCollection";
  features: RegionFeature[];
};

type Periode = {
  year: number;
  month: number;
};

// =====================================================
// PARAMÈTRES
// =====================================================

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre",];

// Date locale de Madagascar
function getDateMadagascar() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Indian/Antananarivo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

// Le mois devient disponible à partir du 11 du mois suivant
function getDernierMoisDisponible(): Periode {
  const today = getDateMadagascar();

  const date = new Date(
    Date.UTC(
      today.year,
      today.month - 1 - (today.day >= 11 ? 1 : 2),
      1
    )
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function comparerPeriodes(a: Periode, b: Periode) {
  return a.year * 12 + a.month <= b.year * 12 + b.month;
}

// =====================================================
// ZOOM AUTOMATIQUE SUR LA RÉGION SÉLECTIONNÉE
// =====================================================

function ZoomRegion({
  feature,
}: {
  feature?: RegionFeature;
}) {
  const map = useMap();

  useEffect(() => {
    if (!feature) return;

    try {
      const layer = L.geoJSON(feature as any);
      const bounds = layer.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 9,
        });
      }
    } catch (error) {
      console.error("Erreur de zoom :", error);
    }
  }, [feature, map]);

  return null;
}

// =====================================================
// PAGE PRINCIPALE
// =====================================================

export default function ZonesBrulees() {
  const dernierDisponible = useMemo(
    () => getDernierMoisDisponible(),
    []
  );

  const [geoData, setGeoData] =
    useState<RegionCollection | null>(null);

  const [region, setRegion] = useState("");
  const [annee, setAnnee] = useState(
    String(dernierDisponible.year)
  );
  const [mois, setMois] = useState(
    String(dernierDisponible.month)
  );

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  // ===================================================
  // CHARGEMENT DES 24 RÉGIONS
  // ===================================================

  useEffect(() => {
    let actif = true;

    async function chargerRegions() {
      try {
        setChargement(true);
        setErreur("");

        const response = await fetch(
          "/data/madagascar_24_region.geojson",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            "Impossible de charger le fichier GeoJSON des régions."
          );
        }

        const json = (await response.json()) as RegionCollection;

        if (
          json.type !== "FeatureCollection" ||
          !Array.isArray(json.features)
        ) {
          throw new Error("Le fichier GeoJSON est invalide.");
        }

        const regionsValides = json.features.filter(
          (feature) =>
            feature.properties?.nom_reg &&
            feature.geometry
        );

        if (regionsValides.length === 0) {
          throw new Error("Aucune région valide trouvée.");
        }

        if (actif) {
          setGeoData({
            type: "FeatureCollection",
            features: regionsValides,
          });

          setRegion(
            regionsValides[0].properties.nom_reg || ""
          );
        }
      } catch (error) {
        if (actif) {
          setErreur(
            error instanceof Error
              ? error.message
              : "Erreur lors du chargement des régions."
          );
        }
      } finally {
        if (actif) setChargement(false);
      }
    }

    chargerRegions();

    return () => {
      actif = false;
    };
  }, []);

  // ===================================================
  // LISTE DES RÉGIONS
  // ===================================================

  const regions = useMemo(() => {
    if (!geoData) return [];

    return [
      ...new Set(
        geoData.features
          .map((f) => f.properties.nom_reg || "")
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "fr"));
  }, [geoData]);

  // ===================================================
  // RÉGION SÉLECTIONNÉE
  // ===================================================

  const regionSelectionnee = useMemo(() => {
    return geoData?.features.find(
      (f) => f.properties.nom_reg === region
    );
  }, [geoData, region]);

  // ===================================================
  // ANNÉES DISPONIBLES
  // ===================================================

  const annees = useMemo(() => {
    const debut = 2024;
    const fin = dernierDisponible.year;

    return Array.from(
      { length: Math.max(0, fin - debut + 1) },
      (_, i) => debut + i
    );
  }, [dernierDisponible]);

  // ===================================================
  // MOIS DISPONIBLES POUR L'ANNÉE SÉLECTIONNÉE
  // ===================================================

  const moisDisponibles = useMemo(() => {
    const anneeSelectionnee = Number(annee);

    return MOIS.map((nom, index) => ({
      nom,
      valeur: index + 1,
    })).filter((item) =>
      comparerPeriodes(
        {
          year: anneeSelectionnee,
          month: item.valeur,
        },
        dernierDisponible
      )
    );
  }, [annee, dernierDisponible]);

  // Ajuster le mois si l'utilisateur change d'année
  useEffect(() => {
    const moisExiste = moisDisponibles.some(
      (m) => String(m.valeur) === mois
    );

    if (!moisExiste) {
      const dernierMois =
        moisDisponibles[moisDisponibles.length - 1];

      setMois(
        dernierMois ? String(dernierMois.valeur) : ""
      );
    }
  }, [annee, moisDisponibles, mois]);

  // ===================================================
  // LANCEMENT DE L'ANALYSE
  // ===================================================

  const analyser = () => {
    setMessage("");

    if (!region) {
      setMessage("Veuillez sélectionner une région.");
      return;
    }

    if (!annee || !mois) {
      setMessage(
        "Veuillez sélectionner une année et un mois disponibles."
      );
      return;
    }

    const periode = {
      year: Number(annee),
      month: Number(mois),
    };

    if (!comparerPeriodes(periode, dernierDisponible)) {
      setMessage(
        "Ce mois n'est pas encore disponible pour l'analyse."
      );
      return;
    }

    setMessage(
      `Paramètres validés : ${region}, ${MOIS[Number(mois) - 1]} ${annee}. La connexion à Google Earth Engine sera ajoutée à l'étape suivante.`
    );
  };

  // ===================================================
  // STYLE DES RÉGIONS
  // ===================================================

  const styleRegions = (feature: any) => {
    const nom = feature?.properties?.nom_reg;
    const selectionnee = nom === region;

    return {
      color: selectionnee ? "#dc2626" : "#64748b",
      weight: selectionnee ? 3 : 1,
      fillColor: selectionnee ? "#f97316" : "#cbd5e1",
      fillOpacity: selectionnee ? 0.25 : 0.08,
    };
  };

  // ===================================================
  // AFFICHAGE
  // ===================================================

  return (
    <div className="zb-page">

      <style>{`
        .zb-page {
          padding: 24px;
          color: #1f2937;
          min-height: 100%;
          font-family: inherit;
        }

        .zb-header {
          margin-bottom: 22px;
        }

        .zb-title {
          font-size: 25px;
          font-weight: 750;
          margin: 0 0 8px;
          color: #111827;
        }

        .zb-description {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .zb-filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 14px;
          align-items: end;
          padding: 20px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          margin-bottom: 18px;
        }

        .zb-field label {
          display: block;
          font-size: 13px;
          font-weight: 650;
          margin-bottom: 8px;
          color: #374151;
        }

        .zb-field select {
          width: 100%;
          height: 42px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 12px;
          background: white;
          color: #111827;
          font-size: 14px;
          outline: none;
        }

        .zb-field select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,.1);
        }

        .zb-button {
          height: 42px;
          padding: 0 22px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 650;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
        }

        .zb-button:hover {
          background: #b91c1c;
        }

        .zb-message {
          padding: 12px 15px;
          margin-bottom: 16px;
          border-radius: 9px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          line-height: 1.5;
        }

        .zb-error {
          padding: 12px 15px;
          margin-bottom: 16px;
          border-radius: 9px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
        }

        .zb-map-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          overflow: hidden;
        }

        .zb-map-header {
          padding: 15px 18px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .zb-map-header h2 {
          font-size: 15px;
          font-weight: 700;
          margin: 0;
        }

        .zb-map-header span {
          color: #6b7280;
          font-size: 12px;
        }

        .zb-map {
          height: 540px;
          width: 100%;
          background: #e5e7eb;
        }

        .zb-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          font-size: 12px;
          color: #4b5563;
          border-top: 1px solid #e5e7eb;
        }

        .zb-legend-color {
          width: 13px;
          height: 13px;
          border-radius: 3px;
          background: #f97316;
          border: 1px solid #dc2626;
        }

        @media (max-width: 900px) {
          .zb-filters {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .zb-page {
            padding: 14px;
          }

          .zb-filters {
            grid-template-columns: 1fr;
          }

          .zb-button {
            width: 100%;
          }

          .zb-map {
            height: 430px;
          }

          .zb-map-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      {/* EN-TÊTE */}
      <div className="zb-header">
        <h1 className="zb-title">
          Cartographie des zones brûlées
        </h1>

        <p className="zb-description">
          Détection et visualisation des nouvelles superficies
          brûlées par région, année et mois.
        </p>
      </div>

      {/* FILTRES */}
      <div className="zb-filters">

        <div className="zb-field">
          <label>Région</label>

          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setMessage("");
            }}
            disabled={chargement || regions.length === 0}
          >
            <option value="">Sélectionner une région</option>

            {regions.map((nom) => (
              <option key={nom} value={nom}>
                {nom}
              </option>
            ))}
          </select>
        </div>

        <div className="zb-field">
          <label>Année</label>

          <select
            value={annee}
            onChange={(e) => {
              setAnnee(e.target.value);
              setMessage("");
            }}
          >
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="zb-field">
          <label>Mois</label>

          <select
            value={mois}
            onChange={(e) => {
              setMois(e.target.value);
              setMessage("");
            }}
            disabled={moisDisponibles.length === 0}
          >
            {moisDisponibles.map((m) => (
              <option key={m.valeur} value={m.valeur}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="zb-button"
          onClick={analyser}
          disabled={chargement || !region || !mois}
        >
          <span>🔥 Analyser</span>
        </button>
      </div>

      {/* MESSAGES */}
      {chargement && (
        <div className="zb-message">
          Chargement des régions de Madagascar...
        </div>
      )}

      {erreur && (
        <div className="zb-error">
          {erreur}
        </div>
      )}

      {message && (
        <div className="zb-message">
          {message}
        </div>
      )}

      {/* CARTE */}
      <div className="zb-map-card">

        <div className="zb-map-header">
          <h2>
            Carte des régions de Madagascar
          </h2>

          <span>
            {region || "Aucune région sélectionnée"}
          </span>
        </div>

        <MapContainer
          center={[-19.0, 46.7]}
          zoom={5}
          className="zb-map"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geoData && (
            <>
              <GeoJSON
                key={region}
                data={geoData as any}
                style={styleRegions}
              />

              <ZoomRegion feature={regionSelectionnee} />
            </>
          )}
        </MapContainer>

        <div className="zb-legend">
          <span className="zb-legend-color" />
          Région sélectionnée
        </div>

      </div>
    </div>
  );
}
