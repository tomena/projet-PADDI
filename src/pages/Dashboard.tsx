import React,{ useRef, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, ScaleControl, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';
import {PieChart,Pie,Cell,LineChart,Line,XAxis,YAxis,Tooltip,Legend,ResponsiveContainer } from 'recharts';
import {Flame,Monitor,Home,MapPinned,TrendingUp,FileText,Leaf,Tractor,Trees,Users,Cog } from 'lucide-react';

const getVille = (nom) => {
  if (!nom) return "";
  return nom.replace("Bureau à", "").trim();
};

const pinSVG = `
<svg width="20" height="20" viewBox="0 0 24 24">
  <path fill="#e53935" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  <circle cx="12" cy="9" r="2.5" fill="white"/>
</svg>
`;

const officeIcon = (nom) =>
  L.divIcon({
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        line-height:1;
      ">

        <!-- ICON -->
        <svg width="20" height="20" viewBox="0 0 24 24" style="display:block;">
          <path fill="#e53935" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>

        <!-- LABEL -->
        <div style="
          font-size:10px;
          color:#111;
          white-space:nowrap;
          margin:0;
          padding:0;
          line-height:1;
        ">
          ${getVille(nom)}
        </div>

      </div>
    `,
    className: "",
    iconSize: [60, 40],
    iconAnchor: [30, 20],
  });

function AutoZoom({ geoData }) {
  const map = useMap();

  useEffect(() => {
    if (!geoData?.features?.length) return;

    const layer = L.geoJSON(geoData);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 10,
        animate: true,
      });
    }
  }, [geoData, map]);

  return null;
}

function onEachRegion(feature, layer, mapRef) {
  const name = feature?.properties?.nom_reg;

  if (name) {
    layer.bindTooltip(name, {
      sticky: true,
      direction: "center",
      className: "region-label",
      permanent: true,
    });
  }

  layer.on("click", () => {
    const bounds = layer.getBounds?.();

    if (bounds && bounds.isValid()) {
      mapRef.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 10,
        animate: true,
      });
    }
  });
}

function LegendControl({ getColorByAntenne, antennes }) {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");

      div.style.background = "white";
      div.style.padding = "8px 10px";
      div.style.borderRadius = "8px";
      div.style.boxShadow = "0 1px 5px rgba(0,0,0,0.2)";
      div.style.fontSize = "12px";

      div.innerHTML = `<strong>Légende:</strong><br/>`;

      div.innerHTML += `
      <div style="display:flex;align-items:center;gap:6px;">
        ${pinSVG}
        Bureau
      </div>
    `;

      antennes.forEach((a) => {
        const color = getColorByAntenne(a);

        div.innerHTML += `
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <span style="
              width:12px;height:12px;
              background:${color};
              display:inline-block;
              border-radius:3px;"></span>
            ${a}
          </div>
        `;
        
      });

      div.innerHTML += `
        <div style="display:flex;align-items:center;gap:6px;">
        <svg width="18" height="18" viewBox="0 0 24 24">
        <path
        d="M3 18 L6 5 L14 3 L21 8 L18 20 L8 21 Z"
        fill="rgba(34,197,94,0.30)"
        stroke="white"
        stroke-width="1"
        />
        </svg>
        Aire protégée
        </div>
        `;
      
      return div;
    };

    legend.addTo(map);

    return () => legend.remove();
  }, [map, antennes, getColorByAntenne]);

  return null;
}

function RegionLayer({ data, getColorByAntenne }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: (feature) => ({
        color: "#fff",
        weight: 1,
        fillColor: getColorByAntenne(feature.properties?.antenne),
        fillOpacity: 0.6,
      }),
    });

    layer.addTo(map);

    return () => {
      layer.clearLayers();
      map.removeLayer(layer);
    };
  }, [data, map, getColorByAntenne]);

  return null;
}

function BureauLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) =>
        L.marker(latlng, {
          icon: officeIcon(feature.properties?.nom),
        }),
    });

    layer.addTo(map);

    return () => map.removeLayer(layer);
  }, [data, map]);

  return null;
}

function AireProtegeeLayer({ data, selectedAntenne }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: {
        color: "#fff",
        weight: 0.8,
        fillColor: "#22c55e",
        fillOpacity: 0.30,
      },
      onEachFeature: (feature, layer) => {

        if (selectedAntenne) {
          layer.bindTooltip(feature.properties.nom_ap, {
            permanent: true,
            direction: "center",
            className: "ap-label",
            sticky: false,
          });
        }      
      },
    });

    layer.addTo(map);

    return () => {
      layer.clearLayers();
      map.removeLayer(layer);
    };
  }, [data, map]);

  return null;
}

export default function Dashboard({ data }: any) {

  const [selectedAntenne, setSelectedAntenne] = useState("");
  const [regionsData, setRegionsData] = useState(null);

    useEffect(() => {
      fetch("/data/madagascar_24_region.geojson")
        .then(res => {
          if (!res.ok) throw new Error("GeoJSON introuvable");
          return res.json();
        })
        .then(setRegionsData)
        .catch(err => console.error("Erreur chargement GeoJSON:", err));
    }, []);

  const VALID_ANTENNES = ["Tanà","Amoron'i Mania", "Boeny", "Diana", "Atsimo-Atsinanana", "Anosy"];

  const antennes = useMemo(() => {
    if (!regionsData?.features) return [];

    return VALID_ANTENNES.filter(a =>
      regionsData.features.some(f => f.properties?.antenne === a)
    );
  }, [regionsData]);

  const showAll = selectedAntenne === "";

  const [bureauData, setBureauData] = useState(null);

    useEffect(() => {
      fetch("/data/localisation_bureau_paddi.geojson")
        .then(r => r.json())
        .then(setBureauData);
    }, []);


    const [aireProtegeeData, setAireProtegeeData] = useState(null);

useEffect(() => {
  fetch("/data/aire_protegee_paddi.geojson")
    .then((r) => r.json())
    .then(setAireProtegeeData)
    .catch(console.error);
}, []);


  const dashboard = useMemo(
    () => ({
      progression: 68,
    }),
    [data]
  );

  const regionsFiltrees = useMemo(() => {
    if (!regionsData?.features) return [];
  
    return selectedAntenne === ""
      ? regionsData.features.filter(f => f.properties?.actif)
      : regionsData.features.filter(
          f => f.properties?.actif &&
               f.properties?.antenne === selectedAntenne
        );
  }, [regionsData, selectedAntenne]);

  const norm = (v) => (v || "").toString().trim();

  const geoFiltered = useMemo(() => {
    if (!regionsData?.features) return null;
  
    const features = regionsData.features.filter(f => {
      if (!f.properties?.actif) return false;
    
      if (!selectedAntenne) return true;
    
      return f.properties?.antenne === selectedAntenne;
    });
  
    return {
      type: "FeatureCollection",
      features,
    };
  }, [regionsData, selectedAntenne]);

  const getColorByAntenne = (antenne) => {
    switch (antenne) {
      case "Tanà":
        return "#16a34a";
      case "Boeny":
        return "#2563eb";
      case "Atsimo-Atsinanana":
        return "#f59e0b";
      case "Diana":
        return "#ef4444";
      case "Anosy":
        return "#8b5cf6";
      default:
        return "#64748b";
    }
  };

  const bureauFiltered = useMemo(() => {
    if (!bureauData?.features) return null;
  
    return {
      type: "FeatureCollection",
      features: bureauData.features.filter(f =>
        showAll ? true : f.properties.antenne === selectedAntenne
      )
    };
  }, [bureauData, selectedAntenne]);


  const aireProtegeeFiltered = useMemo(() => {
    if (!aireProtegeeData?.features) return null;
  
    return {
      type: "FeatureCollection",
      features: aireProtegeeData.features.filter((f) => {
        if (!selectedAntenne) return true;
  
        return f.properties?.antenne === selectedAntenne;
      }),
    };
  }, [aireProtegeeData, selectedAntenne]);

  console.log("features:", regionsData?.features);
  console.log("antennes:", antennes);

return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>TABLEAU DE BORD PADDI+</h1>

        <div style={styles.headerFilters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Antenne</label>

            <select
              style={styles.select}
              value={selectedAntenne}
              onChange={(e) => setSelectedAntenne(e.target.value)}
            >
              <option value="">Toutes les antennes</option>

              {antennes?.length > 0 &&
                antennes.map((antenne) => (
                  <option key={antenne} value={antenne}>
                    {antenne}
                  </option>
                ))}
            </select>
          </div>

          {/* ANNEE */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Année</label>

            <select style={styles.select}>
              <option>2024</option>
              <option>2025</option>
              <option>2026</option>
              <option>2027</option>
              <option>2028</option>
              <option>2029</option>
              <option>2030</option>
            </select>
          </div>
        </div>
      </div>
      {/* ================== GLOBAL LAYOUT ================== */}
      <div style={styles.layout}>
        {/* COLONNE GAUCHE */}
        <div style={styles.leftColumn}>
          {/* ================= INDICATEURS ================= */}
          <div style={styles.leftBlock}>
            <div style={styles.sectionTitle}>
              <TrendingUp size={30} />
              <span>RÉALISATIONS CLÉS</span>
            </div>

            <div style={styles.kpiGrid}>
              <KpiCard
                title="Budgets communaux ≥5% pour le SECO (dont 25% femmes/jeunes)"
                value="40"
                unit="Communes"
                percent={100}
                target="Cible : 40 Communes"
                color="#16a34a"
                type="circle"
              />

              <KpiCard
                title="Réduction de 25% des superficies brûlées en périphérie des 7 AP d'ici 2030"
                value="-18%"
                unit="de réduction"
                percent={72}
                target="Cible : -25% d'ici 2030"
                color="#ea580c"
                icon={<Flame size={42} />}
              />

              <KpiCard
                title="Ecosystèmes agropastoraux sous pratique durable (UE)"
                value="60 500"
                unit="ha"
                percent={55}
                target="Cible : 110 000 ha"
                color="#16a34a"
                icon={<Trees size={42} />}
              />

              <KpiCard
                title="Petits exploitants bénéficiaires (production, marchés, sécurité foncière)"
                value="13 750"
                unit="bénéficiaires"
                percent={55}
                target="Cible : 25 000"
                color="#f59e0b"
                icon={<Users size={42} />}
              />
            </div>
          </div>

          {/* ================= RESULTATS CLES ================= */}
          <div style={styles.resultSection}>
            <div style={styles.sectionTitle}>
              <TrendingUp size={28} />
              <span>RÉSULTATS CLÉS</span>
            </div>

            <div style={styles.resultGrid}>
              <ResultCard
                icon={<Home size={20} />}
                title="Mesures SECO adoptées par les Communes"
                value="36"
                unit="mesures"
                percent={80}
                target="Cible : 80% des communes"
              />

              <ResultCard
                icon={<FileText size={20} />}
                title="Décisions COSAP intégrées aux plans communaux"
                value="21"
                unit="décisions"
                percent={100}
                target="Cible : 21 décisions"
              />

              <ResultCard
                icon={<Leaf size={20} />}
                title="Paquets de mesures régionales SE"
                value="5"
                unit="paquets"
                percent={100}
                target="Cible : 5 paquets"
              />

              <ResultCard
                icon={<Monitor size={20} />}
                title="Région disposent d'un système de suivi-évaluation des SE"
                value="3"
                unit="régions"
                percent={60}
                target="Cible : 5 régions"
              />
            </div>
          </div>

          <div style={styles.realisationSection}>
            {/* LIGNE KPI + GAUGE */}
            <div style={styles.kpiGroup}>
            <div style={styles.realisationGrid}>
              <RealKpi
                title="Pratiques agropastorales durables"
                value="40 000"
                unit="ha"
                target="Cible : 60 000 ha"
                percent={67}
                color="#16a34a"
                icon={<Tractor size={30} />}
              />

              <RealKpi
                title="Pratiques forestières durables"
                value="70 000"
                unit="ha"
                target="Cible : 100 000 ha"
                percent={70}
                color="#16a34a"
                icon={<Trees size={30} />}
              />

              <RealKpi
                title="Producteurs améliorés"
                value="7 000"
                unit="producteurs"
                target="Cible : 10 000"
                percent={70}
                color="#f59e0b"
                icon={<Users size={30} />}
              />

              <RealKpi
                title="AGR / micro-entreprises"
                value="50"
                unit="entreprises"
                target="Cible : 70"
                percent={71}
                color="#0284c7"
                icon={<Cog size={30} />}
              />              
            </div>
            </div>

            <div style={styles.analyticsGroup}>
          <div style={styles.analyticsGrid}>

          <div style={{ ...styles.chartCard, justifyContent: 'flex-start' }}>
          
            <DonutChart
              title="Répartition des bénéficiaires par genre"
              data={[
                { name: 'Hommes', value: 55, color: '#16a34a' },
                { name: 'Femmes', value: 45, color: '#eab308' },
              ]}
              centerText="7 000"
              centerLabel="producteurs"
            />
            </div>

            <div style={{ ...styles.chartCard, justifyContent: 'flex-start' }}>
            <DonutChart
              title="Répartition des jeunes bénéficiaires"
              data={[
                { name: 'Jeunes (JH/JF)', value: 60, color: '#2563eb' },
                { name: 'Adultes', value: 40, color: '#f97316' },
              ]}
              centerText="7 000"
              centerLabel="producteurs"
            />
            </div>

            <div style={{ ...styles.chartCard, justifyContent: 'flex-start' }}>

            <DonutChart
              title="Statut des indicateurs"
              data={[
                { name: 'Atteint', value: 70, color: '#16a34a' },
                { name: 'En cours', value: 20, color: '#f59e0b' },
                { name: 'Non atteint', value: 10, color: '#ef4444' },
              ]}
            />
            </div>

            <div style={{ ...styles.chartCard, justifyContent: 'flex-start' }}>
              
              <GaugeKpi value={dashboard.progression} />
            </div>

          </div>

          </div>

         </div>
        </div>

        {/* COLONNE DROITE */}
        <div style={styles.rightBlock}>
          <div style={styles.sectionTitle}>
            <MapPinned size={28} />
            <span>ZONE D’INTERVENTION</span>
          </div>

          <div style={styles.mapCard}>
            <MapContainer
              center={[-18.8792, 47.5079]}
              zoom={6}
              style={{ width: "100%", height: "100%", minHeight: "380px" }}
            >
              <TileLayer
                attribution="© ESRI"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              />
              <ScaleControl position="bottomleft" imperial={false} />

              {geoFiltered?.features?.length > 0 && (
                <>
                  <RegionLayer
                    key={`${selectedAntenne}-${geoFiltered?.features?.length}`}
                    data={geoFiltered}
                    getColorByAntenne={getColorByAntenne}
                  />

                {aireProtegeeFiltered?.features?.length > 0 && (
                  <AireProtegeeLayer
                  key={`${selectedAntenne}-ap`}
                  data={aireProtegeeFiltered}
                  selectedAntenne={selectedAntenne}
                />
                )}

              {bureauFiltered?.features?.length > 0 && (
                <BureauLayer
                  key={selectedAntenne || "all-bureau"}
                  data={bureauFiltered}
                />
              )}

                  <AutoZoom geoData={geoFiltered} />
                </>
              )}

              <LegendControl
                antennes={antennes}
                getColorByAntenne={getColorByAntenne}
              />
            </MapContainer>
          </div>
        </div>
      </div>      
    </div>    
  );  
}
/* ================= KPI ================= */

function CustomScale() {
  return (
    <div
      style={{
        position: 'relative',
        bottom: 15,
        left: 15,
        background: 'white',
        padding: '6px 10px',
        borderRadius: 6,
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        fontSize: 11,
        fontWeight: 600,
        zIndex: 100,
      }}
    >
      <div style={{ height: 4, width: 50, background: '#111', marginBottom: 4 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 50 }}>
        <span>0</span>
        <span>50 km</span>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  percent,
  target,
  color,
  icon,
  type,
}: any) {
  return (
    <div style={styles.card}>
      <div style={styles.kpiTitle}>{title}</div>

      <div style={styles.row}>
        <div>
          <div style={styles.value}>{value}</div>
          <div style={styles.unit}>{unit}</div>
        </div>

        {type === 'circle' ? (
          <div
            style={{
              ...styles.circle,
              background: `conic-gradient(${color} ${percent}%, #eee 0)`,
            }}
          >
            <div style={styles.circleInner}>{percent}%</div>
          </div>
        ) : (
          <div style={{ color }}>{icon}</div>
        )}
      </div>

      <div style={styles.barRow}>
        <div style={styles.barBg}>
          <div
            style={{
              ...styles.barFill,
              width: `${percent}%`,
              background: color,
            }}
          />
        </div>

        <span style={styles.percentText}>{percent}%</span>
      </div>

      <div style={styles.target}>{target}</div>
    </div>
  );
}


function ResultCard({ icon, title, value, unit, percent, target }: any) {
  return (
    <div style={styles.resultCard}>
      {/* TITRE */}
      <div style={styles.resultTitle}>{title}</div>

      {/* CONTENU HAUT */}
      <div style={styles.resultTop}>
        {/* LEFT */}
        <div style={styles.resultContent}>
          <div style={styles.resultValue}>{value}</div>
          <div style={styles.resultUnit}>{unit}</div>
        </div>

        {/* RIGHT ICON (centré proprement) */}
        <div style={styles.resultIcon}>{icon}</div>
      </div>

      {/* BAR */}
      <div style={styles.barRow}>
        <div style={styles.barBg}>
          <div
            style={{
              ...styles.barFill,
              width: `${percent}%`,
              background: '#16a34a',
            }}
          />
        </div>

        <span style={styles.percentText}>{percent}%</span>
      </div>

      {/* TARGET */}
      <div style={styles.resultTarget}>{target}</div>
    </div>
  );
}

function RealKpi({ title, value, unit, target, percent, color, icon }: any) {
  return (
    <div style={styles.realCard}>
      <div style={styles.realTitle}>{title}</div>

      {/* VALUE + ICON */}
      <div style={styles.realTop}>
        <div>
          <div style={styles.realValue}>{value}</div>
          <div style={styles.realUnit}>{unit}</div>
        </div>

        <div
          style={{
            ...styles.realIcon,
            background: `${color}15`,
            color: color,
            border: `1px solid ${color}30`,
          }}
        >
          {icon}
        </div>
      </div>

      {/* BAR */}
      <div style={styles.barRow}>
        <div style={styles.barBg}>
          <div
            style={{
              ...styles.barFill,
              width: `${percent}%`,
              background: color,
            }}
          />
        </div>

        <span style={styles.percentText}>{percent}%</span>
      </div>

      <div style={styles.target}>{target}</div>
    </div>
  );
}

function GaugeKpi({ value }: any) {
  const clamp = Math.min(Math.max(value, 0), 100);

  const color =
    clamp <= 30 ? '#dc2626' : clamp <= 55 ? '#f97316' : '#16a34a';

  const data = [
    { value: clamp },
    { value: 100 - clamp },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        width: '100%',
      }}
    >
      {/* TITRE */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        Avancement global du projet
      </div>

      {/* JAUGE */}
      <div style={{ width: '100%', height: 180, position: 'relative', marginTop: 20, }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              startAngle={180}
              endAngle={0}
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* TEXTE CENTRÉ DANS LA JAUGE */}
        <div
          style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color,
              lineHeight: 1,
            }}
          >
            {clamp}%
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#666',
              marginTop: 2,
            }}
          >
            Progression globale
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutChart({ title, data, centerText, centerLabel }: any) {
  return (
    <div style={styles.donutCard}>
      {/* TITRE */}
      <div style={styles.chartTitle}>{title}</div>

      {/* CHART */}
      <div style={styles.donutWrapper}>
        <ResponsiveContainer width="100%" height={160}>
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
              label={({
                cx,
                cy,
                midAngle,
                innerRadius,
                outerRadius,
                value,
              }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;

                const x = cx + radius * Math.cos(-midAngle * RADIAN);

                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#fff"
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {value}%
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

        {/* CENTRE */}
        <div style={styles.donutCenter}>
          <div style={styles.donutCenterValue}>{centerText}</div>

          <div style={styles.donutCenterLabel}>{centerLabel}</div>
        </div>
      </div>

      {/* LEGENDE */}
      <div style={styles.legendModern}>
        {data.map((d: any, i: number) => (
          <div key={i} style={styles.legendModernItem}>
            <span
              style={{
                ...styles.legendDot,
                background: d.color,
              }}
            />
            <span style={styles.legendText}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const isTablet =
  typeof window !== 'undefined' && window.innerWidth < 1024;

const isMobile =
  typeof window !== 'undefined' && window.innerWidth < 768;
/* ================= STYLES ================= */

const styles: any = {
  page: {
    padding: '2px 0',
    margin: 0,
    width: '100%',
    height: '100vh',
    minHeight: '100vh',
    background: 'none',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxSizing: 'border-box',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: isTablet ? '1fr' : '2fr 1fr',
    gap: 8,
    alignItems: 'start', 
    height: 'auto',
    minHeight: 'auto',
    overflow: 'visible',
    paddingBottom: 5,
  },

  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#14532d',
  },
  /* LEFT */
  leftBlock: {
    background: '#fff',
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
  },

  sectionTitle: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    fontWeight: 800,
    marginBottom: 10,
    color: '#14532d',
  },

  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: '100%',
    minHeight: 0,
    overflow: 'visible',
  },

  /* KPI GRID (réduite) */
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? '1fr'
      : isTablet
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(4, minmax(0, 1fr))',
    gap: 6,
    gridAutoRows: '1fr',
    alignItems: 'stretch',
  },

  card: {
    background: '#fafafa',
    borderRadius: 8,
    height: '100%',
    padding: 6,
    minHeight: 130,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textAlign: 'center',
    overflow: 'hidden',
    width: '100%',      // AJOUT
  },

  kpiTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: '#111',
    textAlign: 'center',
    width: '100%',
  },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  value: {
    fontSize: 16,
    fontWeight: 800,
  },

  unit: {
    fontSize: 10,
    color: '#666',
  },

  circle: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleInner: {
    fontSize: 9,
    fontWeight: 800,
    background: '#fff',
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  barBg: {
    background: '#e5e7eb',
    flex: 1,
    height: 8,
    borderRadius: 6,
    overflow: 'hidden',
    minWidth: 0,
  },

  barFill: {
    height: '100%',
    borderRadius: 10,
  },

  target: {
    fontSize: 8,
    marginTop: 3,
    color: '#666',
  },

  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },

  percentText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111',
    minWidth: 30,
    textAlign: 'right',
  },

  /* RIGHT ZONE INTERVENTION */
  rightBlock: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    top: 10,
    height: '100%',
  },

  mapCard: {
    flex: 1,
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },

  mapImg: {
    width: '100%',
    height: 'auto',
  },

  infoTitle: {
    fontWeight: 700,
    color: '#334155',
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },

  percentRight: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111',
    minWidth: 28,
    textAlign: 'right',
  },

  resultSection: {
    marginTop: 0,
    background: '#fff',
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 6,
    width: '100%',
    gridAutoRows: '1fr',
    alignItems: 'stretch',
  },

  resultCard: {
    background: '#fff',
    borderRadius: 10,
    gap: 4,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    padding: 1,
    minHeight: 120, // ⬅️ avant 150
  },

  resultTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 10px',
  },

  resultTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
  },

  resultValue: {
    fontSize: 16,
    fontWeight: 800,
    color: '#14532d',
  },

  resultUnit: {
    fontSize: 11,
    color: '#6b7280',
  },

  resultTarget: {
    fontSize: 10,
    marginTop: 4,
    marginleft: 24,
    color: '#6b7280',
  },

  resultIcon: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
    border: '1px solid #bbf7d0', // 🔥 renforce visibilité du cercle
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', // léger relief
  },

  resultContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 1,
    padding: '0 10px',   // 🔥 espace à gauche de value
  },

  iconBox: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 6,
    color: '#16a34a',
  },

  realisationSection: {
    width: '100%',
    background: 'transparent',
    padding: 10,
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  realisationGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? '1fr'
      : isTablet
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(4, minmax(0, 1fr))',
    gap: 8,
    gridAutoRows: '1fr',
    alignItems: 'stretch',
    width: '100%',
    minWidth: 0,
  },

  realCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#fafafa',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'space-between',
    minWidth: 0, // 🔥 IMPORTANT
    overflow: 'hidden',
  },

  realTitle: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center', // 🔥 AJOUT
    width: '100%',
  },

  realTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
  paddingRight: 8,
  },

  realValue: {
    fontSize: 18,
    fontWeight: 800,
  },

  realUnit: {
    fontSize: 10,
    color: '#666',
  },

  realIcon: {
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  },

  chartBox: {
    background: '#fff',
    padding: 6,
    borderRadius: 10,
    width: '100%',
    height: isMobile ? 200 : 240,
    overflow: 'hidden',
  },

  chartTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
    lineHeight: 1.1,
    textAlign: 'center',
  },

  donutCenter: {
    position: 'absolute',
    top: '60%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },

  legend: {
    fontSize: 10,
    marginTop: 0,
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    fontSize: 10,
  },

  legendBox: {
    width: 5,
    height: 5,
    borderRadius: 0,
  },

  realisationGrid2: {
    display: 'grid',
    gridTemplateColumns: isTablet ? '1fr' : '2fr 1fr',
    gap: 6,
    alignItems: 'stretch',
  },

  pieBox: {
    height: '100%',
    minHeight: 0,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
  },

  donutCard: {
    width: '100%',
    height: 220,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  donutWrapper: {
    position: 'relative',
    width: '100%',
    height: 140,
    marginTop: 0,
    marginBottom: 10,
  },

  donutCenterValue: {
    fontSize: 20,
    fontWeight: 800,
    color: '#111827',
    lineHeight: 1,
  },

  donutCenterLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },

  legendModern: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },

  legendModernItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#fff',
    padding: '1px 3px',
  },

  legendDot: {
    width: 15,
    height: 15,
    borderRadius: '50%',
    marginRight: 6,
  },

  legendText: {
    flex: 1,
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
  },

  legendPercent: {
    fontSize: 11,
    fontWeight: 800,
    color: '#111827',
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'transparent',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },

  mapSection: {
    marginTop: 10,
    background: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    border: '1px solid #e5e7eb',
  },

  legendRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 140,
  },

  donutGroup: {
    display: 'flex',
    justifyContent: 'flex-start',
  },

  donutGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 1fr',
    gap: 8,
  },

  donutContainer: {
    display: 'grid',
    gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    gap: 2,
    width: '100%',
  },

  donutRow: {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? '1fr'
      : 'repeat(4,1fr)',
    gap: 8,
    width: '100%',
  },

  realisationTitle: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    fontWeight: 800,
    marginBottom: 10,
    color: '#14532d',
    textAlign: 'center',
  },

  header: {
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },

  headerFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  filterLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#14532d',
  },

  select: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 110,
  },

  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 0.75fr)) 0.8fr',
    gap: 10,
    alignItems: 'stretch',
    width: '100%',
  },

  chartCard: {
    background: '#fff',
    borderRadius: 10,
    padding: 8,        // ↓ réduit padding
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',  
    minWidth: 0,
    overflow: 'hidden',
  },

  gaugeBox: {
    background: '#fff',
    borderRadius: 10,
    padding: 10,  
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',  
    height: '100%',
    minHeight: 0,
  },

  sectionDivider: {
    height: 1,
    background: '#e5e7eb',
    margin: '4px 0',
  },

  kpiGroup: {
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 12,
    minHeight: 130,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },

  analyticsGroup: {
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },

  footer: {
    marginTop: 10,
    padding: 10,
    textAlign: 'center',
    fontSize: 11,
    color: '#6b7280',
    borderTop: '1px solid #e5e7eb',
    background: '#fff',
    position: 'relative',
    zIndex: 1,
  },
};
