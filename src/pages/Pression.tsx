import { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/* ================= DATA ================= */

const zones = {
  type: 'FeatureCollection',
  features: [],
};

/* ================= COMPONENT ================= */

export default function Pression() {
  const [basemap, setBasemap] = useState('satellite');

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
          <input type="date" style={styles.input} />

          <button style={styles.btn}>Filtres</button>

          <button style={styles.btnExport}>Exporter</button>
        </div>
      </div>

      {/* ================= MAP ================= */}
      <div style={styles.mapContainer}>
        <MapContainer
          center={[-18.8, 47.5]}
          zoom={6}
          style={styles.map}
          zoomControl={false}
        >
          {getBaseLayer()}

          <GeoJSON data={zones} />
        </MapContainer>

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
          <div>🔥 Feux</div>
          <div>🌳 Déforestation</div>

          <hr style={{ opacity: 0.2 }} />

          <div style={styles.panelTitle}>Légende</div>

          <div style={{ color: '#2ecc71' }}>Très faible</div>
          <div style={{ color: '#a3e635' }}>Faible</div>
          <div style={{ color: '#facc15' }}>Modéré</div>
          <div style={{ color: '#f97316' }}>Élevé</div>
          <div style={{ color: '#dc2626' }}>Très élevé</div>
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
    height: '100%',
    width: '100%',
  },

  map: {
    height: '100%',
    width: '100%',
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
