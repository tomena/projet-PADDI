import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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

import { Users, TreePine, RefreshCw, Flame, Trees } from 'lucide-react';

const GREEN = '#1b5e20';

export default function SurfacesAgropastorales() {

const evolution = [
  { annee: '2025', valeur: 12450 },
  { annee: '2026', valeur: 25120},
  { annee: '2027', valeur: 38650 },
  { annee: '2028', valeur: 53480 },
  { annee: '2029', valeur: 70210 },
  { annee: '2030', valeur: 110000 },
];

const regions = [
  { name: 'Alaotra-Mangoro', value: 15842 },
  { name: 'Analamanga', value: 12376 },
  { name: 'Menabe', value: 9780 },
  { name: 'Atsimo-Andrefana', value: 8456 },
  { name: 'Itasy', value: 5895 },
  { name: 'Vakinakaratra', value: 4876 },
  { name: 'Haute Matsiatra', value: 3926 },
  { name: 'Autres régions', value: 2133 },
];

const typeTerrain = [
  { name: 'Surface agropastorale', value: 41763, color: '#66bb6a', pct: '66,0%' },
  { name: 'Surface forestière', value: 21521, color: '#D4E157', pct: '34,0%' },
];

  const rows = [
    {
      parcelle: 'PAR-2025-0001',
      utilisateur: 'UT-2025-0156',
      pratique: 'Agroforesterie (cultures sous arbres)',
      debut: '10/01/2025',
      fin: '10/01/2030',
      superficie: 2.45,
    },
    {
      parcelle: 'PAR-2025-0002',
      utilisateur: 'UT-2025-0238',
      pratique: 'Zai amélioré',
      debut: '15/02/2025',
      fin: '15/02/2028',
      superficie: 1.80,
    },
    {
      parcelle: 'PAR-2025-0003',
      utilisateur: 'UT-2025-0112',
      pratique: 'Reboisement - espèces locales',
      debut: '01/03/2025',
      fin: '01/03/2035',
      superficie: 5.60,
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
      'Toutes les régions',
      'Boeny',
      'DIANA',
      'Anôsy',
      'Vakinankaratra',
      'Amoron’i Mania',
      'Atsimo Atsinanana',
    ],
  
    'Aire protégée': [
      'Toutes les aires protégées',
      'Ankarafantsika',
      'Andohahela',
      'Analamerana',
      'Ankarana',
      'Befotaka-Midongy',
      'Marolambo',
      'Montagne d’Ambre',
    ],
  
    'Paysage': [
      'Tous les paysages',
      'Paysage Nord',
      'Paysage Centre',
      'Paysage Sud',
    ],
  
    'District': [
      'Tous les districts',
      'Mahajanga I',
      'Mahajanga II',
      'Marovoay',
    ],
  
    'Commune': [
      'Toutes les communes',
      'Marovoay',
      'Anjiajia',
      'Ambato-Boeny',
    ],
  
    'Fokontany': [
      'Tous les fokontany',
      'Antanambao',
      'Tsararano',
      'Mangarivotra',
    ],
  
    'Micro-bassin versant': [
      'Tous les micro-bassins',
      'MBV-001',
      'MBV-002',
      'MBV-003',
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

return (
<div style={{ background: '#f4f6f5', minHeight: '100vh', fontFamily: 'Arial' }}>

    {/* HEADER */}
    <div style={{
    background: '#0b5d1e',
    color: '#fff',
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 700
    }}>
  <h2 style={{ margin: 0 }}>
    Suivi des superficies aménagées durablement
  </h2>

  <RefreshCw />
</div>

<div style={{ padding: 20 }}>

{/* ===================== ZONE 1 : FILTRES ===================== */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(8,1fr)',
    gap: 5,
    marginBottom: 8,
  }}
>
  {Object.entries(filtres).map(([label, options]) => (
    <div
      key={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
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
          height: 38,
          borderRadius: 8,
          border: '1px solid #d1d5db',
          padding: '0 10px',
        }}
      >
        {options.map((option) => (
          <option key={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  ))}
</div>

{/* ===================== ZONE 2 : KPI ===================== */}
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1.1fr 1fr 1fr',
  gap: 8,
  gridAutoRows: '140px',
}}>

  {/* ÉNONCÉ */}
  <div
  style={{
    background: 'linear-gradient(90deg, rgba(27,94,32,0.08), rgba(27,94,32,0.02))',
    padding: 12,
    borderRadius: 8,
    borderLeft: '6px solid #1b5e20',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    cursor: 'default',
  }}
>
  <h4
      style={{
        margin: 0,
        marginBottom: 12,
        textAlign: 'center',
        color: GREEN,
        fontSize: 15,
        fontWeight: 700,
        
      }}
    >Énoncé de l’indicateur
  </h4>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.6,   
          color: '#374151',
          textAlign: 'justify',
        }}
      >
      Sur 110.000 ha, on applique des pratiques agro-pastorales et forestières durables.
      </div>
  </div>

  {/* ATTEINTE */}
  <div
  style={{
    background: '#fff',
    padding: 10,
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    height: '100%',
    boxSizing: 'border-box',
  }}
>
  <h4
    style={{
      margin: 5,
      marginBottom: 20,
      textAlign: 'center',
      color: GREEN,
    }}
  >
    Superficie aménagée durablement
  </h4>

  <div
    style={{
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontSize: 24,
        fontWeight: 800,
        color: GREEN,
        lineHeight: 1,
      }}
    >
      63 284 ha
    </div>

    <div
      style={{
        marginTop: 10,
        fontWeight: 700,
        color: '#374151',
      }}
    >
      sur 110 000 ha
    </div>
  </div>
</div>
  
  {/* TITRE GLOBAL CENTRÉ */}
  <div
  style={{
    background: '#fff',
    padding: 10,
    borderRadius: 8,
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  }}
>
  {/* TITRE */}
  <h4
    style={{
      margin: 0,
      textAlign: 'center',
      color: GREEN,
      fontWeight: 700,
      fontSize: 16,
    }}
  >
    Atteinte de la cible
  </h4>

  {/* CONTENU */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flex: 1,
      overflow: 'hidden',
    }}
  >
    {/* TEXTE */}
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: GREEN,
        }}
      >
        57,5%
      </div>

      <div style={{ fontSize: 12, fontWeight: 700 }}>
        Cible : 110 000 ha
      </div>
    </div>

    {/* DONUT FIXE */}
    
  </div>
</div>

  {/* PARE-FEU */}
  <div
      style={{
        background: '#fff',
        padding: 10,
        borderRadius: 8,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
    >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: 180,
          }}
        >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { value: 61.6 },
              { value: 38.4 },
            ]}
            dataKey="value"
            innerRadius={35}
            outerRadius={60}
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={GREEN} />
            <Cell fill="#e0e0e0" />
          </Pie>

          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight="bold"
            fill={GREEN}
          >
            57,5%
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>      
  </div>
</div>

{/* ===================== ZONE 3 + 4 + 5 ===================== */}
<div
    style={{
        display: 'grid',
        gridTemplateColumns: '1.3fr 0.8fr 0.8fr 1.2fr',
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
            gridTemplateColumns: '1.4fr 0.8fr',
            gap: 8,
        }}
        >
      {/* BAR HORIZONTAL */}
      <div style={chartCardStyle}>
          <h4 style={{
            margin: 0,
            marginBottom: 20,
            textAlign: 'center',
            color: GREEN,
            fontWeight: 700,
            fontSize: 14,
          }}>
            Répartition de la superficie aménagée par région (ha)
          </h4>

          <ResponsiveContainer height={320}>
            <BarChart
              data={regions}
              layout="vertical"
              margin={{ left: 5, right: 40 }}
            >
              {/* AXE X */}
              <XAxis
                type="number"
                tick={{ fontSize: 12, fontWeight: 700 }}
              />

              {/* AXE Y */}
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12, fontWeight: 700 }}
              />

              <Tooltip />

              {/* BARRES PLUS PETITES */}
              <Bar
                dataKey="value"
                fill={GREEN}
                barSize={20}
                radius={[0, 2, 2, 0]}
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{
                    fontSize: 12,
                    fill: '#374151',
                    fontWeight: 600,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* TITRE AXE X */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              marginTop: 5,
              color: '#6b7280',
              fontWeight: 600,
            }}
          >
            Superficie (ha)
          </div>
        </div>

      {/* DONUT TERRAIN */}
      <div style={chartCardStyle}>
            <h4 style={{
              margin: 0,
              marginBottom: 10,
              textAlign: 'center',
              color: GREEN,
              fontWeight: 700,
              fontSize: 14,
            }}>
            Part des surfaces par type d'aménagement (ha)
          </h4>

          {/* DONUT + LEGEND */}
          <div style={{ width: '100%', height: 200, marginTop: 15 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeTerrain}
                  dataKey="value"
                  cx="50%"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={90}
                >
                {typeTerrain.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>

              {/* CENTRE DU DONUT */}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                fontSize={16}
                fontWeight="bold"
                fill={GREEN}
              >
                63 284 ha
              </text>

              <text
                x="50%"
                y="60%"
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="#6b7280"
              >
                (100%)
              </text>
            </PieChart>
          </ResponsiveContainer>

          {/* LÉGENDE EN BAS */}
          <div
              style={{
                width: '100%',
                marginTop: 2,
              }}
            >
              {typeTerrain.map((t, i) => {
                const pct = ((t.value / totalTerrain) * 100).toFixed(1);

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: t.color,
                          fontSize: 30,
                          fontWeight: 'bold',
                          lineHeight: 1,
                        }}
                      >
                        ●
                      </span>{' '}
                      {t.name}
                    </div>

                    <div>
                      <b>{t.value.toLocaleString('fr-FR')} ha</b>{' '}
                      ({pct.replace('.', ',')}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </div>

    {/* ZONE 5 */}
    <div style={chartCardStyle}>
            <h4 style={{
              margin: 0,
              marginBottom: 6,
              textAlign: 'center',
              color: GREEN,
              fontWeight: 800,
              fontSize: 14,
            }}>
              Évolution annuelle de l'indicateur (ha)
            </h4>

            {/* LÉGENDE */}
            <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 20,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >

                {/* CUMUL ATTEINT */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="20" height="10">
                    <line
                      x1="0"
                      y1="5"
                      x2="20"
                      y2="5"
                      stroke={GREEN}
                      strokeWidth="3"
                    />
                    <circle cx="10" cy="5" r="3" fill={GREEN} />
                  </svg>
                  <span>Cumul atteint (ha)</span>
                </div>

                {/* CIBLE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="20" height="10">
                    <line
                      x1="0"
                      y1="5"
                      x2="20"
                      y2="5"
                      stroke="#9e9e9e"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  </svg>
                  <span>Cible (110 000 ha)</span>
                </div>

              </div>

            <ResponsiveContainer height={250}>
              <LineChart data={evolution} margin={{ left: 10, right: 20 }}>

                {/* AXE X (un peu décollé) */}
                <XAxis
                    dataKey="annee"
                    axisLine={{ stroke: '#9ca3af' }}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    padding={{ left: 15, right: 15 }}
                />

                {/* AXE Y */}
                <YAxis
                    axisLine={{ stroke: '#9ca3af' }}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    domain={[0, 120000]}
                    ticks={[0, 20000, 40000, 60000, 80000, 100000, 120000]}
                    tickFormatter={(v) => v.toLocaleString('fr-FR')}
                    label={{
                        value: 'Superficie (ha)',
                        angle: -90,
                        position: 'insideLeft',
                        style: {
                        textAnchor: 'middle',
                        fill: '#6b7280',
                        fontSize: 12,
                        fontWeight: 800,
                        },
                    }}
                />

                <Tooltip />

                {/* COURBE PRINCIPALE */}
                <Line
                  type="monotone"
                  dataKey="valeur"
                  stroke={GREEN}
                  strokeWidth={3}
                  dot={{ r: 4, fill: GREEN }}
                  label={{
                    position: 'top',
                    fill: GREEN,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />

                {/* LIGNE CIBLE (110 000 ha) */}
                <ReferenceLine
                    y={110000}
                    stroke="#9e9e9e"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={({ viewBox }) => {
                        const { x, y } = viewBox;

                        return (
                        <text
                            x={x + 10}
                            y={y - 5}
                            fill="#6b7280"
                            fontSize={11}
                            fontWeight={700}
                        >
                            110 000 ha
                        </text>
                        );
                    }}
                    />
              </LineChart>
            </ResponsiveContainer>            
          </div>
  </div>

  {/* CARTE MADAGASCAR */}
  <div style={chartCardStyle}>
  <h4 style={{
    margin: 0,
    marginBottom: 10,
    textAlign: 'center',
    color: GREEN,
    fontWeight: 700,
    fontSize: 14,
  }}>
    Localisation des superficies aménagées durablements
  </h4>

  <MapContainer
    center={[-18.9, 47.5]}
    zoom={5.5}
    style={{ width: '100%', height: '100%'}}
  >
    <TileLayer
      attribution="Esri"
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
    />
  </MapContainer>
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
                    width: 100,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                ID Parcelle
                </th>

                <th
                style={{
                    padding: 10,
                    textAlign: 'center',
                    width: 100,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                ID Utilisateur
                </th>

                <th
                    style={{
                        padding: 10,
                        textAlign: 'center',
                        width: 350,
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                    }}
                    >
                    Pratique durable appliquée
                </th>

                <th
                style={{
                    padding: 10,
                    textAlign: 'center',
                    width: 100,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                Date début de la pratique
                </th>

                <th
                style={{
                    padding: 10,
                    textAlign: 'center',
                    width: 100,
                    borderRight: '1px solid rgba(255,255,255,0.3)',
                }}
                >
                Date fin de la pratique
                </th>

                <th
                    style={{
                        padding: 10,
                        textAlign: 'center',
                        width: 80,
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                    }}
                >
                Superficie exploitée (ha)
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
                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {r.parcelle}
                </td>

                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                    {r.utilisateur}
                </td>

                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',}}>
                    {r.pratique}
                </td>

                <td style={{ padding: 10,borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {r.debut}
                </td>

                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                    {r.fin}
                </td>

                <td
                    style={{
                    padding: 10,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: GREEN,
                    }}
                >
                    {r.superficie.toLocaleString('fr-FR')}
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
