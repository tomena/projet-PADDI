import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  ScaleControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned } from "lucide-react";

const VALID_ANTENNES = [
  "Tanà",
  "Amoron'i Mania",
  "Boeny",
  "Diana",
  "Atsimo-Atsinanana",
  "Anosy",
];

const getVille = (nom: string) => {
  if (!nom) return "";
  return nom.replace("Bureau à", "").trim();
};

const pinSVG = `
<svg width="20" height="20" viewBox="0 0 24 24">
  <path
    fill="#e53935"
    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
  />
  <circle cx="12" cy="9" r="2.5" fill="white"/>
</svg>
`;

const officeIcon = (nom: string) =>
  L.divIcon({
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        line-height:1;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="#e53935"
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          />
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>

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

function AutoZoom({ geoData }: any) {
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

function RegionLayer({
  data,
  getColorByAntenne,
}: any) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features) return;

    const layer = L.geoJSON(data, {
      style: (feature: any) => ({
        color: "#fff",
        weight: 1,
        fillColor: getColorByAntenne(
          feature.properties?.antenne
        ),
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

function BureauLayer({ data }: any) {
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

function AireProtegeeLayer({
  data,
  selectedAntenne,
}: any) {
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
          layer.bindTooltip(
            feature.properties.nom_ap,
            {
              permanent: true,
              direction: "center",
              className: "ap-label",
              sticky: false,
            }
          );
        }
      },
    });

    layer.addTo(map);

    return () => {
      layer.clearLayers();
      map.removeLayer(layer);
    };
  }, [data, map, selectedAntenne]);

  return null;
}

function LegendControl({
  getColorByAntenne,
  antennes,
  legendText,
  officeText,
  protectedAreaText,
}: any) {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({
      position: "bottomright",
    });

    legend.onAdd = () => {
      const div = L.DomUtil.create(
        "div",
        "info legend"
      );

      div.style.background = "white";
      div.style.padding = "8px 10px";
      div.style.borderRadius = "8px";
      div.style.boxShadow =
        "0 1px 5px rgba(0,0,0,0.2)";
      div.style.fontSize = "12px";

      div.innerHTML =
        `<strong>${legendText}:</strong><br/>`;

      div.innerHTML += `
        <div style="
          display:flex;
          align-items:center;
          gap:6px;
        ">
          ${pinSVG}
          ${officeText}
        </div>
      `;

      antennes.forEach((a: string) => {
        const color = getColorByAntenne(a);

        div.innerHTML += `
          <div style="
            display:flex;
            align-items:center;
            gap:6px;
            margin-top:4px;
          ">
            <span style="
              width:12px;
              height:12px;
              background:${color};
              display:inline-block;
              border-radius:3px;
            "></span>
            ${a}
          </div>
        `;
      });

      div.innerHTML += `
        <div style="
          display:flex;
          align-items:center;
          gap:6px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M3 18 L6 5 L14 3 L21 8 L18 20 L8 21 Z"
              fill="rgba(34,197,94,0.30)"
              stroke="white"
              stroke-width="1"
            />
          </svg>
          ${protectedAreaText}
        </div>
      `;

      return div;
    };

    legend.addTo(map);

    return () => legend.remove();
  }, [
    map,
    antennes,
    getColorByAntenne,
    legendText,
    officeText,
    protectedAreaText,
  ]);

  return null;
}

export default function CarteInterventionPaddi() {
  const [selectedAntenne, setSelectedAntenne] =
    useState("");

  const [regionsData, setRegionsData] =
    useState<any>(null);

  const [bureauData, setBureauData] =
    useState<any>(null);

  const [aireProtegeeData, setAireProtegeeData] =
    useState<any>(null);

  useEffect(() => {
    fetch("/data/madagascar_24_region.geojson")
      .then((res) => res.json())
      .then(setRegionsData)
      .catch(console.error);

    fetch("/data/localisation_bureau_paddi.geojson")
      .then((res) => res.json())
      .then(setBureauData)
      .catch(console.error);

    fetch("/data/aire_protegee_paddi.geojson")
      .then((res) => res.json())
      .then(setAireProtegeeData)
      .catch(console.error);
  }, []);

  const antennes = useMemo(() => {
    if (!regionsData?.features) return [];

    return VALID_ANTENNES.filter((a) =>
      regionsData.features.some(
        (f: any) =>
          f.properties?.antenne === a
      )
    );
  }, [regionsData]);

  const geoFiltered = useMemo(() => {
    if (!regionsData?.features) return null;

    const features =
      regionsData.features.filter((f: any) => {
        if (!f.properties?.actif) return false;

        if (!selectedAntenne) return true;

        return (
          f.properties?.antenne ===
          selectedAntenne
        );
      });

    return {
      type: "FeatureCollection",
      features,
    };
  }, [regionsData, selectedAntenne]);

  const bureauFiltered = useMemo(() => {
    if (!bureauData?.features) return null;

    return {
      type: "FeatureCollection",
      features: bureauData.features.filter(
        (f: any) =>
          !selectedAntenne ||
          f.properties?.antenne ===
            selectedAntenne
      ),
    };
  }, [bureauData, selectedAntenne]);

  const aireProtegeeFiltered = useMemo(() => {
    if (!aireProtegeeData?.features) return null;

    return {
      type: "FeatureCollection",
      features:
        aireProtegeeData.features.filter(
          (f: any) =>
            !selectedAntenne ||
            f.properties?.antenne ===
              selectedAntenne
        ),
    };
  }, [
    aireProtegeeData,
    selectedAntenne,
  ]);

  const getColorByAntenne = (antenne: string) => {
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

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <MapPinned size={28} />

        <h1 style={{ margin: 0 }}>
          Intervention de PADDI+
        </h1>

        <select
          value={selectedAntenne}
          onChange={(e) =>
            setSelectedAntenne(e.target.value)
          }
          style={{
            marginLeft: "auto",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd",
          }}
        >
          <option value="">
            Toutes les antennes
          </option>

          {antennes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          width: "100%",
          height: "calc(100vh - 100px)",
          minHeight: "500px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={[-18.8792, 47.5079]}
          zoom={6}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <TileLayer
            attribution="© ESRI"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          />

          <ScaleControl
            position="bottomleft"
            imperial={false}
          />

          {geoFiltered?.features?.length > 0 && (
            <>
              <RegionLayer
                data={geoFiltered}
                getColorByAntenne={
                  getColorByAntenne
                }
              />

              {aireProtegeeFiltered?.features
                ?.length > 0 && (
                <AireProtegeeLayer
                  data={aireProtegeeFiltered}
                  selectedAntenne={
                    selectedAntenne
                  }
                />
              )}

              {bureauFiltered?.features?.length >
                0 && (
                <BureauLayer
                  data={bureauFiltered}
                />
              )}

              <AutoZoom
                geoData={geoFiltered}
              />
            </>
          )}

          <LegendControl
            antennes={antennes}
            getColorByAntenne={
              getColorByAntenne
            }
            legendText="Légende"
            officeText="Bureau"
            protectedAreaText="Aire protégée"
          />
        </MapContainer>
      </div>
    </div>
  );
}

