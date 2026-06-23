import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  LabelList,
  ReferenceLine,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Info, RefreshCcw, Search,Target, Calendar, MapPin, Landmark } from "lucide-react";

const GREEN = "#1b5e20";
const LIGHT_GREEN = "#66bb6a";
const GOLD = "#c8a700";
const BLUE = "#1976d2";
const GREEN_DARK = "#1b5e20";
const GREEN_GOLD = "#a67c00";
const GREEN_GOLD_LIGHT = "#C8D96F";

const donut = (value: number) => [
  { name: "value", value },
  { name: "rest", value: 100 - value },
];

const COLORS = [GREEN, "#e5e7eb"];

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 10,
  padding: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,.08)",
  border: "1px solid #edf0f2",
};

const DecisionCOSAP: React.FC = () => {
  const [page, setPage] = useState(1);

  const rows = [
    {
      région: 'Diana',
      AP: 'Montagne d’Ambre (MDA)',
      nbrDecision: '5',
      idDecision: 'MDA-2025-01',
      dateCOSAP: '15/03/2025',
      dateCommune: '10/04/2025',
      nbrCommuneImplique: "3",
      listeCommune: "JoffreVille, Ambanja, Antsiranana II",
      specification: "Protection des sources d'eau et reboisement",
    },
    {
      région: 'Diana',
      AP: 'Ankarana (ANK)',
      nbrDecision: '3',
      idDecision: 'ANK-2025-01',
      dateCOSAP: '20/02/2025',
      dateCommune: '18/03/2025',
      nbrCommuneImplique: "2",
      listeCommune: "Anivorano-Nord, Marivorahona",
      specification: "Gestion des feux de brousse",
    },
    {
      région: 'SAVA',
      AP: 'Analamerana (ANL)',
      nbrDecision: '2',
      idDecision: 'ANL-2025-01',
      dateCOSAP: '28/01/2025',
      dateCommune: '20/02/2025',
      nbrCommuneImplique: "2",
      listeCommune: "Vohemar, Andapa",
      specification: "Réglementation de la pêche",
    },
    {
      région: 'Boeny',
      AP: 'Ankarafantsika (AKF)',
      nbrDecision: '4',
      idDecision: 'AKF-2025-01',
      dateCOSAP: '05/02/2025',
      dateCommune: '28/03/2025',
      nbrCommuneImplique: "4",
      listeCommune: "Mahajanga I, Mahajanga II, Marovoay, Mitsinjo",
      specification: "Lutte contre l'exploitation illégale des ressources",
    },
    {
      région: 'Atsimo Andrefana',
      AP: 'Andohahela (ADH)',
      nbrDecision: '5',
      idDecision: 'ADH-2025-01',
      dateCOSAP: '12/02/2025',
      dateCommune: '30/03/2025',
      nbrCommuneImplique: "3",
      listeCommune: "Toliara I, Betioky Sud, Bekily",
      specification: "Gestion des parcours et pâturages",
    },
    {
      région: 'Atsimo Atsinanana',
      AP: 'Midongy du Sud (MDS)',
      nbrDecision: '1',
      idDecision: 'MDS-2025-01',
      dateCOSAP: '18/01/2025',
      dateCommune: '22/02/2025',
      nbrCommuneImplique: "1",
      listeCommune: "Farafangana",
      specification: "Protection de la mangrove",
    },
    {
      région: 'Alaotra Mangoro',
      AP: 'Marolambo (MLB)',
      nbrDecision: '3',
      idDecision: 'MLB-2025-01',
      dateCOSAP: '25/02/2025',
      dateCommune: '05/04/2025',
      nbrCommuneImplique: "2",
      listeCommune: "Ambatondrazaka, Moramanga",
      specification: "Sensibilisation et éducation environnementale",
    },
    
  ];

  const pageBtn = {
    minWidth: 32,
    height: 32,
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
};

const activePageBtn = {
    ...pageBtn,
    background: GREEN,
    color: '#fff',
    borderColor: GREEN,
};

const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(10);

const total = rows.length;

const start = (currentPage - 1) * rowsPerPage + 1;

const end = Math.min(currentPage * rowsPerPage, total);

const paginatedRows = rows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
);

  const data = [
    { name: "MDA", high: 5, medium: 0, low: 0 },
    { name: "ANK", high: 3, medium: 0, low: 0 },
    { name: "ANL", high: 0, medium: 2, low: 0 },
    { name: "AKF", high: 4, medium: 0, low: 0 },
    { name: "ADH", high: 5, medium: 0, low: 0 },
    { name: "MDS", high: 0, medium: 1, low: 0 },
    { name: "MLB", high: 3, medium: 0, low: 0 },
  ];

  

  return (
    <div style={{ background: "#f4f6f5", minHeight: "100vh", padding: 12 }}>

     {/* ================= HEADER ================= */}
            <div style={{
            background: "white",
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            }}>

            {/* LEFT */}
            <h2 style={{ margin: 0, color: GREEN }}>
                Suivi des décisions des COSAP
            </h2>

            {/* RIGHT */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end"}}>

                {/* Année */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <Calendar size={14} /> Année
                </div>
                <select style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb"
                }}>
                    <option>2030</option>
                    <option>2029</option>
                    <option>2028</option>
                    <option>2027</option>
                    <option>2026</option>
                    <option>2025</option>
                    <option>2024</option>
                    <option>2023</option>
                </select>
                </div>

                {/* Région */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <MapPin size={14} /> Région
                </div>
                <select style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb"
                }}>
                    <option>Toutes les régions</option>
                    <option>Amoron'i Mania</option>
                    <option>Atsimo Atsinanana</option>
                    <option>Anôsy</option>
                    <option>Boeny</option>
                    <option>Diana</option>
                    <option>Vakinankaratra</option>
                </select>
                </div>

                {/* Aire protégée */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <Landmark size={14} /> Aire protégée
                </div>
                <select style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb"
                }}>
                    <option>Toutes les aires protégées</option>
                    <option>Analamerana</option>
                    <option>Ankarafantsika</option>
                    <option>Ankarana</option>
                    <option>Andohahela</option>
                    <option>Befotaka-Midongy</option>
                    <option>Marolambo</option>
                    <option>Montagne d'Ambre</option>
                </select>
                </div>

                {/* Reset */}
                <button style={{
                    background: "#16a34a",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer"
                }}>
                <RefreshCcw size={14} /> Réinitialiser
                </button>
            </div>
          </div>

      {/* ================= Bandeau ================= */}

  <div
    style={{
      background: "#ecfdf5",
      borderRadius: 10,
      padding: "10px 10px",
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 6,
      alignItems: "center",
      border: "1px solid #d1fae5",
    }}
  >
    {/* Texte */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        flex: "1 1 auto",
        maxWidth: "72%",
        minWidth: 0,    
      }}
    >
      <Target
        size={45}
        color="#16a34a"
      />

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          fontWeight: 600,
        }}
      >
        <strong>Indicateur :</strong> Pour chaque COSAP (7), 3 décisions sont
        intégrées dans les plans communaux (total de 21 décisions), dont 1
        mesure tenant compte des besoins spécifiques des femmes et des jeunes
        (total de 7 mesures).
      </div>
    </div>

    {/* Barre de recherche */}

    <div
      style={{
        flexShrink: 0,
        width: 240,
        position: "relative",
        marginLeft: 10,
      }}
    >
      <Search
        size={16}
        color="#9ca3af"
        style={{
          position: "absolute",
          top: 10,
          left: 8,
        }}
      />

      <input
        placeholder="Rechercher une aire protégée..."
        style={{
          width: 220,
          height: 30,
          borderRadius: 10,
          border: "1px solid #d1d5db",
          outline: "none",
          paddingLeft: 30,
          paddingRight: 0,
          fontSize: 12,
          background: "white",
        }}
      />
    </div>
  </div>

      {/* ================= DASHBOARD ================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "220px 250px",
          gap: 5,
          marginBottom: 10,
        }}
      >
            <div
              style={{
                width: "100%",
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxSizing: "border-box",
                overflow: "hidden",
                height: "100%",
                gridColumn: "1 / 3",
                gridRow: "1 / 2",     
              }}
            >
              {/* ===== HEADER ===== */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#2f2f2f",
                  }}
                >
                  TAUX D'ATTEINTE DE LA CIBLE
                </div>

                <Info size={18} color="#9ca3af" />
              </div>

              {/* ===== DONUTS ===== */}
              <div style={{ display: "flex", gap: 5 }}>

                {/* DONUT 1 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 140 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={donut(66.7)}
                          startAngle={90}
                          endAngle={-270}
                          innerRadius={45}
                          outerRadius={55}
                          stroke="none"
                          dataKey="value"
                        >
                          {donut(66.7).map((_, i) => (
                            <Cell
                              key={i}
                              fill={i === 0 ? GREEN_DARK : "#ececec"}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div style={{ marginTop: -95 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN_DARK }}>
                        66,7%
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#555" }}>
                        Décisions incluses<br />dans les plans
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 0, fontSize: 12 }}>
                    <div>14 / 21 décisions</div>
                    <div style={{ marginTop: 6, display: "flex", justifyContent: "center", gap: 2 }}>
                      <div style={{ width: 10, height: 10, background: GREEN_DARK }} />
                      Cible : 21 décisions
                    </div>
                  </div>
                </div>

                {/* DONUT 2 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 140 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={donut(71.4)}
                          startAngle={90}
                          endAngle={-270}
                          innerRadius={45}
                          outerRadius={55}
                          stroke="none"
                          dataKey="value"
                        >
                          {donut(71.4).map((_, i) => (
                            <Cell
                              key={i}
                              fill={i === 0 ? GREEN_GOLD_LIGHT : "#ececec"}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div style={{ marginTop: -95 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN_GOLD_LIGHT }}>
                        71,4%
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>
                        Mesures F & J<br /> atteintes
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    <div>5 / 7 mesures</div>

                    <div style={{ marginTop: 6, display: "flex", justifyContent: "center", gap: 3 }}>
                      <div style={{ width: 10, height: 10, background: GREEN_GOLD_LIGHT }} />
                      Cible: 7 mesures
                    </div>
                  </div>
                </div>

              </div>
            </div>

      <div
          style={{
          background:"white",
          borderRadius:10,
          padding:12,
          gridColumn: "3 / 5",
          gridRow: "1 / 2",
          }}
          >

        <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#2f2f2f",
                lineHeight: 1.3,
              }}
            >
              NOMBRE DE COSAP PAR NOMBRE DE DÉCISIONS INCLUSES DANS LES PLANS COMMUNAUX
            </div>
          </div>

          <ResponsiveContainer width="100%" height={145}>
              <BarChart
                data={[
                {name:"0",v:1},
                {name:"1 à 2",v:2},
                {name:"3",v:3},
                {name:"Plud de 3",v:1},
                ]}
                margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                >
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: "Total COSAP: 7",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />

                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  tickMargin={0}
                  domain={[0, 4]}
                  label={{
                    value: "Nombre de COSAP",
                    angle: -90,
                    position: "insideLeft",
                    dx: -1,   
                    dy: 60,  
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="v"
                  fill={GREEN}
                  margin={{ left: 8 }}
                  radius={[3, 3, 0, 0]}
                  barSize={20}
                >
                  <LabelList dataKey="v" position="top" style={{ fontSize: 12, fill: "#333" }} />
                </Bar>
              </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
          background:"white",
          borderRadius:10,
          padding:12,
          gridColumn: "5 / 7",
          gridRow: "1 / 2",
          }}
          >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#2f2f2f",
                lineHeight: 1.3,
              }}
            >
              NOMBRE DE COSAP PAR NOMBRE DE DÉCISIONS TENANT COMPTE DES BESOINS SPÉCIFIQUES DES FEMMES ET DES JEUNES
            </div>
          </div>

          <ResponsiveContainer width="100%" height={145}>
              <BarChart
                data={[
                {name:"0 décision",v:2},
                {name:"1 ",v:4},
                {name:"Plud de 1",v:1},
                ]}
                margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                >
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Total COSAP: 7",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />

                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  tickMargin={0}
                  domain={[0, 4]}
                  label={{
                    value: "Nombre de COSAP",
                    angle: -90,
                    position: "insideLeft",
                    dx: -1,   
                    dy: 60,  
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="v"
                  fill={GREEN_GOLD_LIGHT}
                  margin={{ left: 8 }}
                  radius={[3, 3, 0, 0]}
                  barSize={20}
                >
                  <LabelList dataKey="v" position="top" style={{ fontSize: 12, fill: "#333" }} />
                </Bar>
              </BarChart>
          </ResponsiveContainer>
          </div>

          <div
            style={{
                  background:"white",
                  borderRadius:10,
                  padding:5,
                  gridColumn: "7 / 9",
                  gridRow: "1 / 3",
                  display:"flex",
                  flexDirection:"column"
            }}
          >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#2f2f2f",
                lineHeight: 1.3,
              }}
            >
              LOCALISATION DES AIRES PROTÉGÉES
            </div>

            <Info
              size={14}
              color="#9ca3af"
            />
          </div>

          <MapContainer
            center={[-18.9, 47.5]}
            zoom={6}
            style={{ width: '100%', height: '100%'}}
          >
            <TileLayer
              attribution="Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            />
          </MapContainer>
          </div>

          
          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: 10,
              gridColumn: "1 / 4",
              gridRow: "2",
              height: 230,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#2f2f2f",
                lineHeight: 1.3,
              }}
            >
              ÉVOLUTION MULTI-ANNUELLE DE L'INDICATEUR
            </div>
          </div>

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={[
                  { y: 2025, v: 33.3, v2: 14.3 },
                  { y: 2026, v: 47.6, v2: 28.6 },
                  { y: 2027, v: 57.1, v2: 42.9 },
                  { y: 2028, v: 66.7, v2: 57.1 },
                  { y: 2029, v: 81.0, v2: 71.4 },
                  { y: 2030, v: 100, v2: 100 },
                  ]}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 0,
                  }}
              >                 

                  <XAxis
                      dataKey="y"
                      tick={{ fontSize: 10 }}
                      padding={{ left:15, right: 20 }}
                  />

                  <YAxis
                      domain={[0, 100]}
                      ticks={[0,20,40,60,80,100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 9 }}                     
                  />

                  <Legend
                      verticalAlign="bottom"
                      height={30}
                      iconType="line"
                      wrapperStyle={{
                          fontSize: 10,
                          paddingTop: 8,
                      }}
                  />

                  <Line
                      type="monotone"
                      dataKey="v"
                      name="Décisions incluses dans les plans (%)"
                      stroke={GREEN}
                      strokeWidth={2.2}
                      dot={{ r: 2 }}
                  >
                      <LabelList
                          dataKey="v"
                          position="top"
                          formatter={(value:any)=>`${value}%`}
                          style={{
                              fontSize:9,
                              fontWeight:600,
                          }}
                      />
                  </Line>

                  <Line
                      type="monotone"
                      dataKey="v2"
                      name="Mesures F&J atteintes (%)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                  >
                      <LabelList
                          dataKey="v2"
                          position="bottom"
                          formatter={(value:any)=>`${value}%`}
                          style={{
                              fontSize:9,
                              fontWeight:600,
                          }}
                      />
                  </Line>

              </LineChart>

            </ResponsiveContainer>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 10,
                padding: 12,
                gridColumn: "4 / 7",
                gridRow: "2",
                height: 230,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#2f2f2f",
                lineHeight: 1.3,
              }}
            >
              COMPARAISON DES COSAP-DÉCISIONS INCLUSES DANS LES PLANS COMMUNAUX
            </div>

          </div>

          <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                barCategoryGap="30%"
                barGap={0}
                margin={{ top: 10, right: 10, bottom: 5, left: 0 }}
              >

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    interval={0}
                    padding={{ left: 10, right: 5 }}
                  />

                  <YAxis
                    tick={{ fontSize: 9 }}
                    label={{
                      value: "Nombre de décisions",
                      angle: -90,
                      position: "insideLeft",
                      dx: 20,   
                      dy: 50,  
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />

                  {/* ligne cible */}
                  <ReferenceLine
                    y={3}
                    stroke="#555"
                    strokeDasharray="4 4"
                  />

                    <Bar
                      dataKey="high"
                      stackId="a"
                      name=">= 3 décisions"
                      fill="#1b5e20"
                      barSize={20}
                      radius={[3, 3, 0, 0]}
                    />

                    <Bar
                      dataKey="medium"
                      stackId="a"
                      name="1-2 décisions"
                      fill="#66bb6a"
                      barSize={20}
                    />

                    <Bar
                      dataKey="low"
                      stackId="a"
                      name="0 décision"
                      fill="#c8a700"
                      barSize={20}
                    />       
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 10 }}
                  />

                </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* ===================== TABLEAU DETAIL ===================== */}

                    <div
                        style={{
                            background: '#fff',
                            marginTop: 1,
                            borderRadius: 10,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                        }}
                        >
                        {/* HEADER */}
                        <div
                            style={{
                            padding: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #eee',
                            }}
                        >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 2,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  color: "#2f2f2f",
                                  lineHeight: 1.3,
                                }}
                              >
                                DÉTAIL DES DÉCISIONS DES COSAP INCLUSES DANS LES PLANS COMMUNAUX
                              </div>
                            </div>

                            <div
                            style={{
                                display: 'flex',
                                gap: 5,
                                alignItems: 'center',
                            }}
                            >                            
                            </div>
                        </div>

                        {/* TABLE */}
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed',
                                fontSize: 11,
                            }}
                            >
                            <thead>
                                    <tr
                                        style={{
                                        background: GREEN,
                                        color: '#fff',
                                        }}
                                    >
                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 48,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Région
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 68,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Aire protégée
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 20,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                            >
                                            Nombre de décisions
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 38,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                          Id de la décision
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 40,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Date de la décision au niveau COSAP
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 30,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Date de la décision au niveau de la Commune
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 25,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                        >
                                        Nombre de communes impliquées
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 120,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                        >
                                        Liste des communes impliquées
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 100,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                        >
                                        Spécification de la décision
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                {paginatedRows.map((r, i) => (
                                    <tr
                                        key={i}
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                        }}
                                        >
                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>
                                            {r.région}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>
                                            {r.AP}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            {r.nbrDecision}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                            {r.idDecision}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center'}}>
                                            {r.dateCOSAP}
                                        </td>

                                        <td style={{ padding: 10,borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            {r.dateCommune}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                            {r.nbrCommuneImplique}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'left' }}>
                                            {r.listeCommune}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'left' }}>
                                            {r.specification}
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>

                        {/* PAGINATION */}
                        <div
                            style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderTop: '1px solid #eee',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    color: '#6b7280',
                                    fontWeight: 700,
                                }}
                                >
                                Affichage de {start} à {end} sur {total} enregistrements
                            </span>

                            <div
                            style={{
                                display: 'flex',
                                gap: 3,
                                alignItems: 'center',
                            }}
                            >
                            <button style={pageBtn}>⏮</button>
                            <button style={pageBtn}>◀</button>

                            <button style={activePageBtn}>1</button>
                            <button style={pageBtn}>2</button>
                            <button style={pageBtn}>3</button>

                            <span style={{ fontSize: 13 }}>
                                ...
                            </span>

                            <button style={pageBtn}>24</button>

                            <button style={pageBtn}>▶</button>
                            <button style={pageBtn}>⏭</button>
                            </div>

                            <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                            >
                            <span
                                style={{
                                fontSize: 13,
                                fontWeight: 600,
                                }}
                            >
                                Lignes par page
                            </span>

                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                                }}
                                style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid #d1d5db',
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            </div>
                        </div>
                    </div>

    </div>
  );
};

export default DecisionCOSAP;