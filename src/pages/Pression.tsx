import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const compterFeuxDepuis = (
  features: any[],
  heures: number
) => {
  const maintenant = Date.now();
  const limite = maintenant - heures * 60 * 60 * 1000;

  return features.filter((feature) => {
    const { acq_date, acq_time } = feature.properties;

    if (!acq_date || acq_time == null) return false;

    const heure = String(acq_time).padStart(4, "0");

    const dateFeu = new Date(
      `${acq_date}T${heure.slice(0, 2)}:${heure.slice(2, 4)}:00Z`
    ).getTime();

    return (
      Number.isFinite(dateFeu) &&
      dateFeu >= limite &&
      dateFeu <= maintenant
    );
  }).length;
};

const filtrerFeuxDepuis = (
  features: any[],
  heures: number
) => {
  const maintenant = Date.now();
  const limite = maintenant - heures * 60 * 60 * 1000;

  return features.filter((feature) => {
    const { acq_date, acq_time } = feature.properties;

    if (!acq_date || acq_time == null) return false;

    const heure = String(acq_time).padStart(4, '0');

    const dateFeu = new Date(
      `${acq_date}T${heure.slice(0, 2)}:${heure.slice(2, 4)}:00Z`
    ).getTime();

    return (
      Number.isFinite(dateFeu) &&
      dateFeu >= limite &&
      dateFeu <= maintenant
    );
  });
};

/* ================= COUCHE DES FEUX ================= */

function CoucheFeux({ features }: { features: any[] }) {
  const map = useMap();

  useEffect(() => {
    // Calcul de l'ancienneté de chaque détection
    const obtenirAgeHeures = (feature: any) => {
      const { acq_date, acq_time } = feature.properties;

      if (!acq_date || acq_time == null) return null;

      const heure = String(acq_time).padStart(4, '0');

      const dateFeu = new Date(
        `${acq_date}T${heure.slice(0, 2)}:${heure.slice(2, 4)}:00Z`
      ).getTime();

      if (!Number.isFinite(dateFeu)) return null;

      return (Date.now() - dateFeu) / (1000 * 60 * 60);
    };

    // Couleur selon l'ancienneté
    const obtenirCouleur = (age: number | null) => {
      if (age === null || age < 0 || age > 72) {
        return '#9ca3af';
      }

      if (age <= 24) return '#ef2929'; // Rouge
      if (age <= 48) return '#f97316'; // Orange

      return '#facc15'; // Jaune
    };

    // Taille des points selon le niveau de zoom
    const obtenirRayon = (zoom: number) => {
      return Math.max(
        2,
        Math.min(8, 2 + (zoom - 5) * 0.65)
      );
    };

    // Utilisation du moteur Canvas pour les nombreux points
    const renderer = L.canvas({ padding: 0.5 });

    const couche = L.geoJSON(features as any, {
      pointToLayer: (feature, latlng) => {
        const age = obtenirAgeHeures(feature);

        return L.circleMarker(latlng, {
          radius: obtenirRayon(map.getZoom()),
          fillColor: obtenirCouleur(age),
          color: '#ffffff',
          weight: 0.6,
          opacity: 1,
          fillOpacity: 0.9,
          renderer,
        });
      },
    });

    couche.addTo(map);

    // Adapter la taille des points à chaque changement de zoom
    const actualiserTaille = () => {
      const nouveauRayon = obtenirRayon(map.getZoom());

      couche.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          layer.setRadius(nouveauRayon);
        }
      });
    };

    map.on('zoomend', actualiserTaille);

    return () => {
      map.off('zoomend', actualiserTaille);
      map.removeLayer(couche);
    };
  }, [features, map]);

  return null;
}

function RegionPressionLayer({
  data,
  selectedRegion,
}: {
  data: any;
  selectedRegion: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: (feature: any) => {
        const selectionnee =
          selectedRegion !== "Toutes les régions" &&
          feature.properties?.nom_reg === selectedRegion;
      
        return {
          color: selectionnee ? "#0284c7" : "#ffffff",
          weight: selectionnee ? 2.5 : 1,
          fillColor: selectionnee ? "#38bdf8" : "#64748b",
          fillOpacity: selectionnee ? 0.35 : 0.12,
        };
      },
      onEachFeature: (feature, layer) => {
        const nom = feature.properties?.nom_reg;

        if (nom) {
          layer.bindTooltip(nom, {
            sticky: true,
            direction: 'center',
          });
        }
      },
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [data, map, selectedRegion]);

  return null;
}

function AireProtegeePressionLayer({ data }: { data: any }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: {
        color: '#ffffff',
        weight: 1,
        fillColor: '#22c55e',
        fillOpacity: 0.25,
      },
      onEachFeature: (feature, layer) => {
        const nom = feature.properties?.nom_ap;

        if (nom) {
          layer.bindTooltip(nom, {
            sticky: true,
            direction: 'center',
          });
        }
      },
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [data, map]);

  return null;
}

function ZoomRegion({
  data,
  selectedRegion,
}: {
  data: any;
  selectedRegion: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) return;

    if (selectedRegion === "Toutes les régions") {
      map.setView([-18.8, 47.5], 6);
      return;
    }

    const region = data.features.find(
      (feature: any) =>
        feature.properties?.nom_reg === selectedRegion
    );

    if (!region) return;

    const bounds = L.geoJSON(region).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 9,
      });
    }
  }, [data, selectedRegion, map]);

  return null;
}
/* ================= DATA ================= */

const zones = {
  type: 'FeatureCollection',
  features: [],
};
function pointDansAnneau(
  longitude: number,
  latitude: number,
  anneau: number[][]
) {
  let dedans = false;

  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const xi = anneau[i][0];
    const yi = anneau[i][1];
    const xj = anneau[j][0];
    const yj = anneau[j][1];

    const intersecte =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (intersecte) dedans = !dedans;
  }

  return dedans;
}

function pointDansPolygone(
  longitude: number,
  latitude: number,
  geometry: any
): boolean {
  if (!geometry) return false;

  const verifierPolygone = (polygone: number[][][]) => {
    const exterieur = polygone[0];

    if (!pointDansAnneau(longitude, latitude, exterieur)) {
      return false;
    }

    // Exclure les éventuels trous du polygone
    for (let i = 1; i < polygone.length; i++) {
      if (pointDansAnneau(longitude, latitude, polygone[i])) {
        return false;
      }
    }

    return true;
  };

  if (geometry.type === "Polygon") {
    return verifierPolygone(geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some(verifierPolygone);
  }

  return false;
}

function compterFeuxDansZone(feux: any[], feature: any) {
  return feux.filter((feu) => {
    const coordinates = feu.geometry?.coordinates;

    if (!coordinates) return false;

    return pointDansPolygone(
      coordinates[0],
      coordinates[1],
      feature.geometry
    );
  }).length;
}

/* ================= COMPONENT ================= */

export default function Pression() {
  const [basemap, setBasemap] = useState('satellite');
  const [selectedRegion, setSelectedRegion] = useState("Toutes les régions");

  // ================= COUCHES GÉOGRAPHIQUES =================

const [regionsData, setRegionsData] = useState<any>(null);
const [aireProtegeeData, setAireProtegeeData] = useState<any>(null);
const [communesData, setCommunesData] = useState<any>(null);
const [peripherieData, setPeripherieData] = useState<any>(null);

// Chargement des régions
useEffect(() => {
  fetch('/data/madagascar_24_region.geojson')
    .then(res => {
      if (!res.ok) throw new Error('GeoJSON régions introuvable');
      return res.json();
    })
    .then(setRegionsData)
    .catch(err => console.error('Erreur régions :', err));
}, []);

  const regionsDisponibles = Array.from(
  new Set(
    (regionsData?.features || [])
      .map((feature: any) => feature.properties?.nom_reg)
      .filter(Boolean)
  )
).sort((a: any, b: any) => a.localeCompare(b, "fr"));

// Chargement des aires protégées
useEffect(() => {
  fetch('/data/aire_protegee_paddi.geojson')
    .then(res => {
      if (!res.ok) throw new Error('GeoJSON aires protégées introuvable');
      return res.json();
    })
    .then(setAireProtegeeData)
    .catch(err => console.error('Erreur aires protégées :', err));
}, []);

// Chargement des communes
useEffect(() => {
  fetch('/data/madagascar_communes.json')
    .then(res => {
      if (!res.ok) throw new Error('GeoJSON communes introuvable');
      return res.json();
    })
    .then(setCommunesData)
    .catch(err => console.error('Erreur communes :', err));
}, []);

// Chargement des périphéries de 5 km
useEffect(() => {
  fetch('/data/peripherie_5km_paddi.geojson')
    .then(res => {
      if (!res.ok) throw new Error('GeoJSON périphéries introuvable');
      return res.json();
    })
    .then(setPeripherieData)
    .catch(err => console.error('Erreur périphéries :', err));
}, []);

  // Données des feux NASA FIRMS
  const [feux, setFeux] = useState<any[]>([]);
  const [chargementFeux, setChargementFeux] = useState(true);
  const [erreurFeux, setErreurFeux] = useState('');

  // Récupération des détections sur les 3 derniers jours
  useEffect(() => {
    const chargerFeux = async () => {
      try {
        setChargementFeux(true);
        setErreurFeux('');

        const response = await fetch('/api/firms');

        if (!response.ok) {
          throw new Error('Impossible de récupérer les données FIRMS.');
        }

        const geojson = await response.json();

        setFeux(
          Array.isArray(geojson.features)
            ? geojson.features
            : []
        );
      } catch (error) {
        console.error('Erreur chargement FIRMS :', error);

        setErreurFeux(
          error instanceof Error
            ? error.message
            : 'Erreur inconnue'
        );
      } finally {
        setChargementFeux(false);
      }
    };

    chargerFeux();
  }, []);

  // Nombre de détections selon la période
  const feux24h = compterFeuxDepuis(feux, 24);
  const feux48h = compterFeuxDepuis(feux, 48);
  const feux72h = compterFeuxDepuis(feux, 72);

  const feuxRecents = filtrerFeuxDepuis(feux, 72);
  // ================= FILTRE RÉGION =================

const regionSelectionnee =
  selectedRegion === "Toutes les régions"
    ? null
    : regionsData?.features?.find(
        (f: any) => f.properties?.nom_reg === selectedRegion
      );

const feuxRegion = regionSelectionnee
  ? feuxRecents.filter((feu) => {
      const coordinates = feu.geometry?.coordinates;

      if (!coordinates) return false;

      return pointDansPolygone(
        coordinates[0],
        coordinates[1],
        regionSelectionnee.geometry
      );
    })
  : feuxRecents;

// ================= CARTE 1 : RÉGION =================

const statistiquesRegion = {
  h24: compterFeuxDepuis(feuxRegion, 24),
  h48: compterFeuxDepuis(feuxRegion, 48),
  h72: feuxRegion.length,
};

// ================= CARTE 2 : AIRES PROTÉGÉES =================

const statistiquesAP = (aireProtegeeData?.features || [])
  .map((ap: any) => ({
    nom: ap.properties?.nom_ap || "Aire protégée sans nom",
    nombre: compterFeuxDansZone(feuxRegion, ap),
  }))
  .sort((a: any, b: any) => b.nombre - a.nombre);

// ================= CARTE 3 : PAYSAGES =================

// Couche géographique non encore disponible
const statistiquesPaysages: any[] = [];

// ================= CARTE 4 : MICRO-BASSINS =================

// Couche géographique non encore disponible
const statistiquesMicroBassins: any[] = [];

// ================= CARTE 5 : PÉRIPHÉRIE 5 KM =================

const peripheries = peripherieData?.features || [];

const feuxPeripherie = feuxRegion.filter((feu) => {
  const coordinates = feu.geometry?.coordinates;

  if (!coordinates) return false;

  return peripheries.some((zone: any) =>
    pointDansPolygone(
      coordinates[0],
      coordinates[1],
      zone.geometry
    )
  );
});

// ================= CARTE 6 : TOP 3 COMMUNES =================

const statistiquesCommunes = (communesData?.features || [])
  .map((commune: any) => ({
    nom: commune.properties?.NAME_4 || "Commune sans nom",
    nombre: compterFeuxDansZone(feuxRegion, commune),
  }))
  .sort((a: any, b: any) => b.nombre - a.nombre)
  .slice(0, 3);

  const getBaseLayer = () => {
    switch (basemap) {
      case 'osm':
        return (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        );

      case 'carto':
        return (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        );

      case 'topo':
        return (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
        );

      default:
        return (
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        );
    }
  };

  return (
    <div style={styles.page}>
      {/* ================= HEADER (RESTORED EXACT DESIGN) ================= */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Zones de Pression</div>
          <div style={styles.subtitle}>
            Visualisation des zones de pression environnementale
          </div>
        </div>

        <div style={styles.actions}>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={styles.selectRegion}
          >
            <option value="Toutes les régions">
              Toutes les régions
            </option>        
            {regionsDisponibles.map((region: any) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>        
          <button style={styles.btnExport}>
            Exporter
          </button>
        </div>
      </div>
      {/* ================= PANNEAU STATISTIQUES ================= */}

<div style={styles.statsPanel}>

  {/* CARTE 1 */}
  <div style={styles.statCard}>
    <div style={styles.statTitle}>
      Feux détectés par région
    </div>

    <div style={styles.statSubtitle}>
      {selectedRegion}
    </div>

    <div style={styles.statLine}>
      <span>Dernières 24 heures</span>
      <strong>{statistiquesRegion.h24.toLocaleString("fr-FR")}</strong>
    </div>

    <div style={styles.statLine}>
      <span>Dernières 48 heures</span>
      <strong>{statistiquesRegion.h48.toLocaleString("fr-FR")}</strong>
    </div>

    <div style={styles.statLine}>
      <span>Dernières 72 heures</span>
      <strong>{statistiquesRegion.h72.toLocaleString("fr-FR")}</strong>
    </div>
  </div>

  {/* CARTE 2 */}
  <div style={styles.statCard}>
    <div style={styles.statTitle}>
      Feux par aire protégée
    </div>

    <div style={styles.statSubtitle}>
      Détections sur les dernières 72 heures
    </div>

    {statistiquesAP.length > 0 ? (
      statistiquesAP.map((ap: any, index: number) => (
        <div style={styles.statLine} key={index}>
          <span>{ap.nom}</span>
          <strong>{ap.nombre.toLocaleString("fr-FR")}</strong>
        </div>
      ))
    ) : (
      <div style={styles.emptyStat}>Aucune donnée disponible</div>
    )}
  </div>

  {/* CARTE 3 */}
  <div style={styles.statCard}>
    <div style={styles.statTitle}>
      Feux par paysage
    </div>

    <div style={styles.statSubtitle}>
      Détections sur les dernières 72 heures
    </div>

    <div style={styles.emptyStat}>
      Couche des paysages à intégrer
    </div>
  </div>

  {/* CARTE 4 */}
  <div style={styles.statCard}>
    <div style={styles.statTitle}>
      Feux par micro-bassin
    </div>

    <div style={styles.statSubtitle}>
      Détections sur les dernières 72 heures
    </div>

    <div style={styles.emptyStat}>
      Couche des micro-bassins à intégrer
    </div>
  </div>

  {/* CARTE 5 */}
  <div style={styles.statCard}>
    <div style={styles.statTitle}>
      Feux dans les périphéries de 5 km
    </div>

    <div style={styles.statSubtitle}>
      Autour des aires protégées · 72 heures
    </div>

    <div style={styles.bigNumber}>
      {feuxPeripherie.length.toLocaleString("fr-FR")}
    </div>

    <div style={styles.statSubtitle}>
      Détections dans les périphéries
    </div>
  </div>

  {/* CARTE 6 */}
  <div style={styles.statCard}>
    <div style={styles.statTitle}>
      Top 3 des communes
    </div>

    <div style={styles.statSubtitle}>
      Selon le nombre de feux · 72 heures
    </div>

    {statistiquesCommunes.map((commune: any, index: number) => (
      <div style={styles.statLine} key={index}>
        <span>
          {index + 1}. {commune.nom}
        </span>
        <strong>{commune.nombre.toLocaleString("fr-FR")}</strong>
      </div>
    ))}
  </div>

</div>

      {/* ================= MAP ================= */}
      <div style={styles.mapContainer}>
        <MapContainer
          center={[-18.8, 47.5]}
          zoom={6}
          style={styles.map}
          zoomControl={false}
          preferCanvas={true}
        >
          {getBaseLayer()}

            {/* Zones de pression */}
            <GeoJSON data={zones} />
            
            {/* Limites des régions */}
              <RegionPressionLayer
                data={regionsData}
                selectedRegion={selectedRegion}
              />
              
              <ZoomRegion
                data={regionsData}
                selectedRegion={selectedRegion}
              />
              
              {/* Aires protégées */}
              <AireProtegeePressionLayer data={aireProtegeeData} />
              
              {/* Détections NASA FIRMS */}
              <CoucheFeux features={feuxRecents} />
        </MapContainer>
        {/* ================= TEST DONNÉES FIRMS ================= */}
<div
  style={{
    position: 'absolute',
    bottom: 20,
    left: 12,
    zIndex: 999,
    background: 'rgba(255,255,255,0.95)',
    padding: 15,
    borderRadius: 12,
    boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
    color: '#111827',
    minWidth: 220,
  }}
>
  <div style={{ fontWeight: 700, marginBottom: 8 }}>
    Détections NASA FIRMS
  </div>

  {chargementFeux ? (
    <div>Chargement des données...</div>
        ) : erreurFeux ? (
          <div style={{ color: '#dc2626' }}>
            {erreurFeux}
          </div>
        ) : (
          <>
            <div>Depuis 24 h : <strong>{feux24h}</strong></div>
            <div>Depuis 48 h : <strong>{feux48h}</strong></div>
            <div>Depuis 72 h : <strong>{feux72h}</strong></div>
      
            <hr />
      
            <div>
              Total récupéré : <strong>{feux.length}</strong> points
            </div>
          </>
        )}
      </div>

        {/* ================= LEFT PANEL (BASEMAP) ================= */}
        <div style={styles.leftPanel}>
          <div style={styles.panelTitle}>Fond de carte</div>

          <div
            onClick={() => setBasemap('topo')}
            style={styles.item(basemap === 'topo')}
          >
            ESRI Topographic
          </div>

          <div
            onClick={() => setBasemap('satellite')}
            style={styles.item(basemap === 'satellite')}
          >
            ESRI Satellite
          </div>

          <div
            onClick={() => setBasemap('osm')}
            style={styles.item(basemap === 'osm')}
          >
            OpenStreetMap
          </div>

          <div
            onClick={() => setBasemap('carto')}
            style={styles.item(basemap === 'carto')}
          >
            Carto Light
          </div>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div style={styles.rightPanel}>
          <div style={styles.panelTitle}>Couches</div>

          <div>✔ Zones de pression</div>
          <div style={{ fontWeight: 700, marginTop: 10 }}>
            🔥 Détections de feux
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef2929' }} />
            <span>Dernières 24 heures</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f97316' }} />
            <span>24 à 48 heures</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#facc15' }} />
            <span>48 à 72 heures</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES (RESTORED DASHBOARD LOOK) ================= */

const styles: any = {
  page: {
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },

  /* 🔥 HEADER RESTAURÉ EXACT STYLE IMAGE */
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,

    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',

    padding: '12px 18px',

    background: 'rgba(255,255,255,0.85)', // ✅ CHANGÉ
    backdropFilter: 'blur(10px)',

    color: '#111827',

    borderBottom: '1px solid rgba(0,0,0,0.08)',
  },

  title: {
    fontSize: 18,
    fontWeight: 700,
  },

  subtitle: {
    fontSize: 11,
    opacity: 0.7,
  },

  actions: {
    display: 'flex',
    gap: 10,
  },

  input: {
    padding: 6,
    borderRadius: 6,
    border: 'none',
  },

  btn: {
    padding: '6px 10px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
  },

  btnExport: {
    padding: '6px 10px',
    borderRadius: 6,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
  },

  /* MAP */
  mapContainer: {
    position: 'absolute',
    top: 76,
    right: 0,
    bottom: 0,
    left: '33.333%',
    width: '66.667%',
  },

  map: {
    height: '100%',
    width: '100%',
  },

  statsPanel: {
  position: 'absolute',
  top: 76,
  left: 0,
  bottom: 0,
  width: '33.333%',
  overflowY: 'auto',
  padding: 12,
  boxSizing: 'border-box',
  background: '#f1f5f9',
  zIndex: 900,
},

statCard: {
  background: '#ffffff',
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
},

statTitle: {
  fontSize: 14,
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: 6,
},

statSubtitle: {
  fontSize: 11,
  color: '#64748b',
  marginBottom: 10,
},

statLine: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  padding: '7px 0',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 12,
  color: '#334155',
},

bigNumber: {
  fontSize: 30,
  fontWeight: 800,
  color: '#ea580c',
  marginTop: 8,
},

emptyStat: {
  padding: '10px 0',
  fontSize: 12,
  color: '#94a3b8',
  fontStyle: 'italic',
},

  /* LEFT PANEL */
  leftPanel: {
    position: 'absolute',
    top: 90,
    left: 12,
    zIndex: 999,

    background: 'rgba(255,255,255,0.9)', // ✅ CHANGÉ
    padding: 12,
    borderRadius: 14,

    color: '#111827',

    width: 200,

    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
  },

  /* RIGHT PANEL */
  rightPanel: {
    position: 'absolute',
    top: 90,
    right: 12,
    zIndex: 999,

    background: 'rgba(255,255,255,0.9)', // ✅ CHANGÉ
    padding: 12,
    borderRadius: 14,

    color: '#111827',

    width: 220,

    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
  },

  panelTitle: {
    fontWeight: 700,
    marginBottom: 8,
    color: '#1f2937',
  },

  selectRegion: {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#111827',
  fontSize: 13,
  minWidth: 190,
  cursor: 'pointer',
  outline: 'none',
},

  item: (active: boolean) => ({
    padding: 8,
    marginTop: 6,
    cursor: 'pointer',
    borderRadius: 10,

    background: active ? '#e0f2fe' : 'transparent',
    border: '1px solid rgba(0,0,0,0.08)',

    color: '#111827',
  }),
};
