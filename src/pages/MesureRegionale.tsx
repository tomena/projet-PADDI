import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LabelList,
  ReferenceLine,
} from 'recharts';

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Users, TreePine, RefreshCw, Flame, Trees, Globe2, Map } from 'lucide-react';

const GREEN = '#1b5e20';

export default function SurfacesAgropastorales() {

const evolution = [
  { annee: '2025', valeur: 20.0 },
  { annee: '2026', valeur: 40.0 },
  { annee: '2027', valeur: 60.0 },
  { annee: '2028', valeur: 60.0 },
  { annee: '2029', valeur: 80.0 },
  { annee: '2030', valeur: 100 },
];

const regions = [
  { name: 'Boeny', value: 2 },
  { name: 'DIANA', value: 2 },
  { name: 'Vakinankaratra', value: 2 },
  { name: 'Amoron’i Mania', value: 1 },
  { name: 'Anôsy', value: 0 },
  { name: 'Atsimo Atsinanana', value: 0 },
];

const typeTerrain = [
  { name: '0 paquet de mesure', value: 1, color: 'red', pct: '20,0%' },
  { name: '1 paquet de mesure', value: 1, color: 'yellow', pct: '20,0%' },
  { name: 'Plus d’1 paquet de mesures', value: 3, color: 'green', pct: '20,0%' },
];


const renderCenter = () => (
    <text
      x="50%"
      y="45%"
      textAnchor="middle"
      fontSize={16}
      fontWeight="bold"
    >
      24 650 ha
      <tspan
        x="50%"
        dy="20"
        fontSize={12}
        fontWeight="normal"
      >
        (100%)
      </tspan>
    </text>
  );

  const rows = [
    {
      région: 'DIANA',
      nbrPrise: '2',
      id: 'PR-DIA-001',
      date: '15/04/2025',
      specification: 'Restauration des écosystèmes côtiers et mangroves: Gestion durable des ressources en eau et prévention des innondations.',
    },
    {
        région: 'DIANA',
        nbrPrise: '2',
        id: 'PR-DIA-002',
        date: '15/04/2025',
        specification: 'Renforcement de la gestion des bassins versants et protection des forêts de captage.',
      },
      {
        région: 'Boeny',
        nbrPrise: '2',
        id: 'PR-BOE-001',
        date: '10/04/2025',
        specification: 'Réhabilitation des zones humides et lutte contre l’érosion: Promotion de l’agroforesterie.',
      },
      {
        région: 'Boeny',
        nbrPrise: '2',
        id: 'PR-BOE-002',
        date: '10/04/2025',
        specification: 'Appui à la gestion intégrée des paysages et valorisation des services écosystémiques.',
      },
      {
        région: 'Vakinakaratra',
        nbrPrise: '2',
        id: 'PR-VAK-001',
        date: '20/03/2025',
        specification: 'Préservation des forêts et régulation des flux d’eau: Réduction des risques naturels.',
      },
      {
        région: 'Vakinakaratra',
        nbrPrise: '2',
        id: 'PR-VAK-002',
        date: '20/03/2025',
        specification: 'Gestion durable des sols et restauration des terres dégradées.',
      },
      {
        région: 'Amoron’i Mania',
        nbrPrise: '1',
        id: 'PR-AMA-001',
        date: '05/05/2025',
        specification: 'Gestion durable des pâturages et conservation des ressources naturelles.',
      },
      {
        région: 'Atsimo Atsinanana',
        nbrPrise: '0',
        id: '-',
        date: '-',
        specification: 'Aucun paquet de mesures adopté à ce jour.',
      },
      {
        région: 'Anôsy',
        nbrPrise: '0',
        id: '-',
        date: '-',
        specification: 'Aucun paquet de mesures adopté à ce jour.',
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

  const filtres = {
    'Année': ['Tous', '2025', '2026', '2027', '2028', '2029', '2030'],
  
    'Région': [
      'Tous',
      'Boeny',
      'DIANA',
      'Anôsy',
      'Vakinankaratra',
      'Amoron’i Mania',
      'Atsimo Atsinanana',
    ],
  };

  const chartCardStyle = {
    background: '#fff',
    padding: 12,
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    height: '100%',
    boxSizing: 'border-box',
  };

  const totalTerrain = typeTerrain.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const regionsColored = useMemo(() => {
    return regions.map((r) => ({
      ...r,
      color: r.value > 1 ? GREEN : r.value === 1 ? "#facc15" : "#ef4444",
    }));
  }, [regions]);

return (
<div style={{ background: '#f4f6f5', minHeight: '100vh', fontFamily: 'Arial' }}>

    {/* ================= HEADER ================= */}

<div
  style={{
    background: "#0b5d1e",
    color: "#fff",
    height: 58,
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 6px rgba(0,0,0,.15)",
  }}
>
  {/* Partie gauche */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "#ffffff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Map
        size={30}
        color="#0b5d1e"
        strokeWidth={2.2}
      />
    </div>

    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      Suivi des mesures régionales
    </div>
  </div>

  {/* Bouton Actualiser */}
  <button
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 18px",
      background: "#0a4f19",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.25)",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 600,
      transition: ".2s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "#146c2b";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "#0a4f19";
    }}
  >
    <RefreshCw size={17} />
    Actualiser
  </button>
</div>

<div style={{ padding: 10 }}>

{/* ===================== ZONE 1 : FILTRES ===================== */}
<div
  style={{
    display: 'flex',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 5,
  }}
>
  {Object.entries(filtres).map(([label, options]) => (
    <div
      key={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: 170,
      }}
    >
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#374151',
        }}
      >
        {label}
      </label>

      <select
        style={{
          width: '100%',
          height: 38,
          borderRadius: 8,
          border: '1px solid #d1d5db',
          padding: '0 10px',
        }}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  ))}
</div>

{/* ===================== ZONE 2 : KPI ===================== */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1.6fr 1.3fr 1.2fr 1.1fr 1fr",
    gap: 5,
    gridAutoRows: "140px",
    alignItems: "stretch",
  }}
>

  {/* ÉNONCÉ */}
  <div
  style={{
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    padding: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
  }}
>
  <h4
      style={{
        margin: 0,
        marginBottom: 10,
        textAlign: 'center',
        color: GREEN,
        fontSize: 13,
        fontWeight: 700,
        
      }}
    >Énoncé de l’indicateur
  </h4>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.1,   
          color: '#374151',
          textAlign: 'left',
        }}
      >
      Les plateformes régionales de coordination intersectorielles dans les cinq régions d'interventions élaborent
      chacune un paquet de mesures pour améliorer les services écosystémiques de régulation dans le cadre de la mise à jour des plans régionaux de développement.
      </div>
  </div>
  
  {/* Taux d'atteinte*/}
  <div
  style={{
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    padding: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
  }}
>
  {/* TITRE */}
  <h4
    style={{
      margin: 0,
      marginBottom: 0,
      textAlign: "center",
      color: GREEN,
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    Taux d'atteinte de la cible
  </h4>

  {/* CONTENU */}
  <div style={{
  height: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 12,
}}>
    {/* Texte */}
    <div
      style={{
        flex: 1,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: GREEN,
          lineHeight: 1,
        }}
      >
        80,0 %
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#374151",
          marginTop: 8,
        }}
      >
        4 sur 5 régions
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginTop: 10,
        }}
      >
        Cible : 100% (5 régions)
      </div>
    </div>

    {/* Donut */}
    <div
      style={{
        width: 80,
        height: 80,
        flexShrink: 0,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { value: 80 },
              { value: 20 },
            ]}
            dataKey="value"
            innerRadius={28}
            outerRadius={40}
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={GREEN} />
            <Cell fill="#e5e7eb" />
          </Pie>

          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fontWeight="bold"
            fill={GREEN}
          >
            80,0%
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>

{/* Part de femmes */}
<div
  style={{
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    padding: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
  }}
>
  <h4
    style={{
      margin: 5,
      marginBottom: 0,
      textAlign: 'center',
      color: GREEN,
      fontSize: 12,
      fontWeight: 700,
    }}
  >
    Part des femmes impliquées dans les plateformes
  </h4>

  <div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  }}
>
  {/* DONUT */}
  <div style={{ width: 90, height: 90 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={[
            { value: 46.8 },
            { value: 53.2 },
          ]}
          dataKey="value"
          innerRadius={28}
          outerRadius={42}
          startAngle={90}
          endAngle={-270}
        >
          <Cell fill={GREEN} />
          <Cell fill="#e5e7eb" />
        </Pie>

        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={800}
          fill={GREEN}
        >
          46,8%
        </text>
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* CIBLE */}
  <div
    style={{
      marginTop: 6,
      fontSize: 12,
      fontWeight: 600,
      color: "#374151",
    }}
  >
    Cible : ≥ 40%
  </div>
</div>
</div>

  {/* Part de jeunes */}
  <div
  style={{
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    padding: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
  }}
>
        {/* TITRE */}
        <h4
          style={{
            margin: 0,
            marginBottom: 0,
            textAlign: 'center',
            color: GREEN,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Part des jeunes (&lt; 35 ans) impliqués dans les plateformes
        </h4>

        {/* CONTENU */}
        <div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  }}
>
  {/* DONUT */}
  <div style={{ width: 90, height: 90 }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={[
            { value: 35.2 },
            { value: 64.8 },
          ]}
          dataKey="value"
          innerRadius={28}
          outerRadius={42}
          startAngle={90}
          endAngle={-270}
        >
          <Cell fill={GREEN} />
          <Cell fill="#e5e7eb" />
        </Pie>

        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={800}
          fill={GREEN}
        >
          35,2%
        </text>
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* CIBLE */}
  <div
    style={{
      marginTop: 6,
      fontSize: 12,
      fontWeight: 600,
      color: "#374151",
    }}
  >
    Cible : ≥ 30%
  </div>
</div>
      </div>

  {/* Régions d'intervention*/}
  <div
  style={{
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    padding: 6,
    background: "#fff",
    border: "1px solid #e5e7eb",
  }}
>
  {/* ================= TITRE CENTRÉ ================= */}
  <div
    style={{
      textAlign: "center",
      fontSize: 13,
      fontWeight: 700,
      color: GREEN,
      marginBottom: 0,
    }}
  >
    Régions d’intervention
  </div>

  {/* ================= CONTENU SPLIT ================= */}
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
    }}
  >
    {/* LEFT ICON */}
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Users size={42} color={GREEN} />
    </div>

    {/* RIGHT KPI */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#111827",
          lineHeight: 1,
        }}
      >
        5
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginTop: 4,
        }}
      >
        régions
      </div>
    </div>
  </div>
</div>

</div>

<div
    style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1.5fr 1.55fr',
        gap: 5,
        marginTop: 20,
        alignItems: 'stretch',
    }}
>
  {/* COLONNE GAUCHE */}
    <div
        style={{
        gridColumn: '1 / span 3',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        }}
    >
    {/* Ligne supérieure */}
        <div
        style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.5fr 1.55fr',
            gap: 5,
        }}
        >

      {/* DONUT TERRAIN */}
      <div style={chartCardStyle}>
            <h4 style={{
              margin: 0,
              marginBottom: 5,
              textAlign: 'center',
              color: GREEN,
              fontSize: 13,
              fontWeight: 700,
              
            }}>
            Régions selon le nombre de paquets de mesures élaborés
          </h4>

          {/* DONUT + LEGEND */}
          <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  }}
>
  {/* DONUT */}
  <div style={{ width: 220, height: 220, position: "relative" }}>
  <ResponsiveContainer width="100%" height="100%">
  <PieChart>
  <Pie
  data={typeTerrain}
  dataKey="value"
  innerRadius={45}
  outerRadius={75}
  labelLine={false}
  label={({ cx, cy, midAngle, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
      >
        {/* VALEUR */}
        <tspan
          x={x}
          dy="-4"
          fontWeight={700}
          fill="#111827"
        >
          {typeTerrain[index].value}
        </tspan>

        {/* POURCENTAGE */}
        <tspan
          x={x}
          dy="12"
          fontSize={10}
          fill="#6b7280"
        >
          ({(percent * 100).toFixed(1)}%)
        </tspan>
      </text>
    );
  }}
>
  {typeTerrain.map((e, i) => (
    <Cell key={i} fill={e.color} />
  ))}
</Pie>
</PieChart>
  </ResponsiveContainer>

  {/* CENTRE DU DONUT */}
  <div
  style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
  }}
>
  <div style={{ fontSize: 22, fontWeight: 800, color: GREEN }}>
    5
  </div>
  <div style={{ fontSize: 11, color: "#6b7280" }}>
    régions
  </div>
</div>
</div>

  {/* LÉGENDE DROITE */}
  <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 140,
  }}
>
  {typeTerrain.map((t, i) => (
    <div
      key={i}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          backgroundColor: t.color,
          borderRadius: 2,
        }}
      />
      {t.name}
    </div>
  ))}
</div>  
</div>
</div>

{/* Courbe d'évolution */}
      <div style={chartCardStyle}>
            <h4 style={{
              margin: 0,
              marginBottom: 6,
              textAlign: 'center',
              color: GREEN,
              fontWeight: 800,
              fontSize: 12,
            }}>
              Évolution annuelle du taux d'atteinte de la cible (%)
            </h4>

            <div
              style={{
                gridColumn: "2 / span 2",
                gridRow: "2",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 10,
              }}
            >

            <ResponsiveContainer height={200}>
              <LineChart  data={evolution} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
>

                {/* AXE X (un peu décollé) */}
                <XAxis
                    dataKey="annee"
                    axisLine={{ stroke: '#9ca3af' }}
                    tickLine={true}
                    tick={{ fontSize: 11 }}
                    padding={{ left: 20, right: 10 }}
                />

                {/* AXE Y */}
                <YAxis
                    axisLine={{ stroke: '#9ca3af' }}
                    tickLine={true}
                    tick={{ fontSize: 11 }}
                    domain={[0, 110]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(v) => `${v}%`}
                    
                />

                  <Area
                    type="monotone"
                    dataKey="valeur"
                    stroke="none"
                    fill={GREEN}
                    fillOpacity={0.02}
                  />

                  <Line
                    type="monotone"
                    dataKey="valeur"
                    stroke={GREEN}
                    strokeWidth={2}
                    dot={{ r: 2, fill: GREEN }}
                    activeDot={{ r: 4 }}
                  >
                    <LabelList
                      dataKey="valeur"
                      position="top"
                      formatter={(v) => `${v}%`}
                      style={{
                        fontSize: 11,
                        fill: "#111827",
                        fontWeight: 600,
                      }}
                    />
                  </Line>

                {/* LIGNE CIBLE (100%) */}
                <ReferenceLine
                    y={100}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    label={{
                      value: "Cible (100%)",
                      position: "center",
                      fill: "#9ca3af",
                      fontSize: 10,
                    }}
                  />
              </LineChart>
            </ResponsiveContainer>            
          </div>
          </div>

      {/* BAR HORIZONTAL */}
      <div style={chartCardStyle}>
          <h4 style={{
            margin: 0,
            marginBottom: 10,
            textAlign: 'center',
            color: GREEN,
            fontWeight: 700,
            fontSize: 13,
          }}>
            Comparatif des régions (nombre de paquets de mesures)
          </h4>
          <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: 220,
              }}
            >

              {/* ================== GRAPHIQUE ================== */}

              <div
                style={{
                  flex: 1,
                  height: "100%",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionsColored}
                    layout="vertical"
                    margin={{
                      left: 0,
                      right: 10,
                      top: 1,
                      bottom: 0,
                    }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 3]}
                      ticks={[0, 1, 2, 3]}
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      dataKey="name"
                      type="category"
                      width={140}
                      tick={{
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />

                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      barSize={14}
                      minPointSize={4} 
                    >
                      {regionsColored.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.value === 0 ? "#ef4444" : entry.color}
                        />
                      ))}

                      <LabelList
                        dataKey="value"
                        position="right"
                        style={{
                          fontWeight: 700,
                          fontSize: 11,
                          fill: "#374151",
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

          {/* Légende */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 5,
              flexWrap: "wrap",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: GREEN,
                  borderRadius: 2,
                }}
              />
              <span>Plus d'1 paquet de mesures</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: "#facc15",
                  borderRadius: 2,
                }}
              />
              <span>1 paquet de mesure</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: "#ef4444",
                  borderRadius: 2,
                }}
              />
              <span>0 paquet de mesure</span>
            </div>
          </div>
        </div>        
        </div>
        {/* ===================== ZONE CARTE + TABLEAU ===================== */}
        <div
          style={{
            gridColumn: '1 / span 3',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          {/* ===================== LIGNE HAUTE ===================== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 5,
            }}
          >

            {/* ===================== CARTE ===================== */}
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,.05)",
            position: "relative",
          }}
        >
          <h4 style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 800,
            color: GREEN,
          }}>
            Carte des régions selon le nombre de paquets de mesures élaborés
          </h4>

          {/* 🔍 SEARCH */}
          <div style={{ display: "flex", marginBottom: 6 }}>
            <input
              placeholder="Rechercher une région..."
              style={{
                flex: 1,
                padding: "6px 8px",
                border: "1px solid #ddd",
                borderRight: "none",
                borderRadius: "4px 0 0 4px",
                outline: "none",
                fontSize: 12,
              }}
            />
            <button
              style={{
                background: "#065f46",
                border: "none",
                padding: "0 10px",
                borderRadius: "0 4px 4px 0",
                cursor: "pointer",
                color: "white",
              }}
            >
              🔍
            </button>
          </div>

          {/* 🗺️ CARTE */}
          <div style={{ height: 320, borderRadius: 8, overflow: "hidden" }}>
            <MapContainer
              center={[-19.0, 47.0]}
              zoom={5}
              zoomControl={true}
              style={{ height: "100%", width: "100%" }}
              className="custom-map"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </MapContainer>
          </div>

          {/* 📊 LÉGENDE*/}
          <div
            style={{
              position: "absolute",
              bottom: 15,
              left: 15,
              background: "white",
              padding: "10px 12px",
              borderRadius: 4,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              fontSize: 11,
              zIndex: 999,
              width: 180,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 6,
                color: "black",
                whiteSpace: "normal", 
                wordBreak: "break-word",
                lineHeight: 1.2,
              }}
            >
              Nombre de paquets de mesures élaborés
            </div>

            <div>🔴 0 paquet de mesure</div>
            <div>🟡 1 paquet de mesure</div>
            <div>🟢 Plus d'1 paquet de mesure</div>
          </div>
        </div>

            {/* ===================== TABLEAU STYLE EXCEL ===================== */}
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                overflowX: "auto",
              }}
            >
              <h4 style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 800,
                color: GREEN,
              }}>
                Détail par région
              </h4>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}>
                <thead>
                  <tr style={{ background: "#065f46", color: "white" }}>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Région</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Nombre de paquets de mesures</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Taux d'atteinte</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {regions.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: 8, border: "1px solid #eee" }}>{r.name}</td>

                      <td style={{ padding: 8, border: "1px solid #eee", textAlign: "center" }}>
                        {r.value}
                      </td>

                      <td style={{ padding: 8, border: "1px solid #eee", textAlign: "center" }}>
                        {r.value === 0 ? "0%" : r.value === 1 ? "50%" : "100%"}
                      </td>

                      <td style={{ padding: 8, border: "1px solid #eee", textAlign: "left" }}>
                        {r.value === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#ef4444",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>
                                ✕
                              </span>
                            </div>
                            <span>Non atteint</span>
                          </div>
                        ) : r.value === 1 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#f59e0b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>
                                !
                              </span>
                            </div>
                            <span>En cours</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>
                                ✓
                              </span>
                            </div>
                            <span>Atteint</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div> 

{/* ===================== TABLEAU DETAIL ===================== */}

<div
  style={{
    background: '#fff',
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,.05)',
  }}
>
  {/* HEADER */}
  <div
    style={{
      padding: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #eee',
    }}
  >
    <h4
      style={{
        margin: 0,
        color: GREEN,
      }}
    >
      Détails des parcelles
    </h4>

    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#888',
          }}
        >
          🔍
        </span>

        <input
          placeholder="Rechercher..."
          style={{
            padding: '8px 8px 8px 40px',
            width: 220,
            borderRadius: 8,
            border: '1px solid #ddd',
            outline: 'none',
          }}
        />
      </div>

      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: GREEN,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Exporter  📤
      </button>
    </div>
  </div>

  {/* TABLE */}
  <table
    style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontSize: 13,
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
                    width: 60,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                Région
                </th>

                <th
                style={{
                    padding: 10,
                    textAlign: 'center',
                    width: 50,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                Nombre de paquet prise
                </th>

                <th
                    style={{
                        padding: 10,
                        textAlign: 'center',
                        width: 50,
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                    }}
                    >
                    Id du paquet
                </th>

                <th
                style={{
                    padding: 10,
                    textAlign: 'center',
                    width: 50,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                Date d'adoption
                </th>

                <th
                style={{
                    padding: 10,
                    textAlign: 'center',
                    width: 380,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                Spécification
                </th>
            </tr>
        </thead>

        <tbody>
            {rows.map((r, i) => (
             <tr
                key={i}
                style={{
                    borderBottom: '1px solid #e5e7eb',
                }}
                >
                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>
                    {r.région}
                </td>

                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                    {r.nbrPrise}
                </td>

                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center'}}>
                    {r.id}
                </td>

                <td style={{ padding: 10,borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {r.date}
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
</div>
);
}