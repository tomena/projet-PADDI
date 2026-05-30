import React from 'react';
import {
  RefreshCw,
  Search,
  Download,
  GraduationCap,
  Gift,
  Wrench,
  Leaf,
} from 'lucide-react';

import L from 'leaflet';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

export default function RevenusProducteurs() {
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [visibleLines, setVisibleLines] = React.useState({
    total: true,
    producteurs: true,
  });

  const filters = [
    'Année',
    'Région',
    'Aire protégée',
    'Paysage',
    'District',
    'Commune',
    'Micro-bassin versant',
    'Fokontany',
  ];

  const toggleLine = (key: 'total' | 'producteurs') => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatK = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value;
  };

  const yearlyData = [
    { year: 2025, total: 2145, producteurs: 1210 },
    { year: 2026, total: 3785, producteurs: 2165 },
    { year: 2027, total: 5362, producteurs: 3012 },
    { year: 2028, total: 6947, producteurs: 3872 },
    { year: 2029, total: 8510, producteurs: 4826 },
    { year: 2030, total: 10250, producteurs: 5950 },
  ];

  const tableRows = [
    {
      id: 'C3-IND-0001',
      formations: 3,
      formationSpec:
        'Techniques agroécologiques; Gestion intégrée des cultures',
      formationDate: '15/03/2025',
      dotations: 1,
      dotationSpec: 'Kit semences; Outils agricoles',
      dotationDate: '28/03/2025',
      amenagements: 1,
      amenagementSpec: 'Terrassement agricole (1 ha)',
      amenagementDate: '10/04/2025',
    },
    {
      id: 'C3-IND-0002',
      formations: 2,
      formationSpec: 'Agroforesterie',
      formationDate: '22/02/2025',
      dotations: 1,
      dotationSpec: 'Plants agroforestiers; Matériel d’entretien',
      dotationDate: '05/03/2025',
      amenagements: 0,
      amenagementSpec: '-',
      amenagementDate: '-',
    },
    {
      id: 'C3-GRP-0001',
      formations: 5,
      formationSpec:
        'Gestion de groupement; Techniques agroécologiques; Transformation',
      formationDate: '10/01/2025',
      dotations: 2,
      dotationSpec: 'Équipements de transformation; Outils agricoles',
      dotationDate: '18/02/2025',
      amenagements: 1,
      amenagementSpec: 'Aménagement site de production (0,5 ha)',
      amenagementDate: '12/03/2025',
    },
    {
      id: 'C3-IND-0003',
      formations: 4,
      formationSpec: 'Élevage amélioré; Gestion financière',
      formationDate: '05/03/2025',
      dotations: 1,
      dotationSpec: 'Kit avicole',
      dotationDate: '20/03/2025',
      amenagements: 1,
      amenagementSpec: 'Poulailler amélioré',
      amenagementDate: '02/04/2025',
    },
    {
      id: 'C3-GRP-0002',
      formations: 6,
      formationSpec: 'Gouvernance; Techniques maraîchères; Commercialisation',
      formationDate: '12/02/2025',
      dotations: 3,
      dotationSpec: 'Système d’irrigation; Intrants; Outils agricoles',
      dotationDate: '25/03/2025',
      amenagements: 2,
      amenagementSpec:
        'Aménagement périmètre irrigué (1,2 ha); Bassin de rétention',
      amenagementDate: '15/04/2025',
    },
  ];

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const paginatedRows = tableRows.slice(startIndex, endIndex);

  const totalPages = Math.ceil(tableRows.length / rowsPerPage);

  const producerPoints = [
    { position: [-18.9, 47.5], value: 35 },
    { position: [-19.2, 47.3], value: 75 },
    { position: [-20.1, 47.0], value: 120 },
    { position: [-17.8, 48.2], value: 220 },
    { position: [-16.5, 49.7], value: 320 },
    { position: [-22.0, 47.1], value: 580 },
    { position: [-21.5, 46.9], value: 650 },
    { position: [-18.4, 46.2], value: 90 },
    { position: [-19.8, 48.0], value: 260 },
    { position: [-15.9, 49.3], value: 45 },
  ];

  const getColor = (value: number) => {
    if (value <= 50) return '#16a34a'; // vert
    if (value <= 100) return '#4ade80'; // vert clair
    if (value <= 250) return '#facc15'; // jaune
    if (value <= 500) return '#fb923c'; // orange
    return '#ef4444'; // rouge
  };

  return (
    <div style={styles.page}>
      <div
        style={{
          width: '100%',
          overflowX: 'hidden',
        }}
      >
        {/* ================= HEADER ================= */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Leaf size={26} color="#16a34a" />

            <div style={styles.title}>Suivi des producteurs avec revenus</div>
          </div>

          <div style={styles.refreshBtn}>
            <RefreshCw size={18} />
            Actualiser
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        <div style={styles.filtersGrid}>
          {filters.map((item) => (
            <div key={item} style={styles.filterItem}>
              <div style={styles.filterLabel}>{item}</div>

              <select style={styles.select}>
                <option>Tous</option>
              </select>
            </div>
          ))}
        </div>

        {/* ================= TOP GRID ================= */}
        <div style={styles.topGrid}>
          {/* ===== CARD 1 ===== */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Atteinte de la cible</div>

            <div style={styles.subText}>
              7000 producteurs augmentent leurs revenus
            </div>

            <div style={styles.bigValue}>4 826</div>

            <div style={styles.bigSub}>sur 7 000</div>

            <div style={styles.progressBg}>
              <div style={styles.progressFill}></div>
            </div>

            <div style={styles.progressValue}>69,0%</div>

            <div style={styles.target}>Cible : 7 000</div>
          </div>

          {/* ===== DONUTS ===== */}
          <div style={styles.smallCard}>
            <div style={styles.smallTitle}>% Femmes (Total)</div>

            <div style={styles.donut}>
              <div style={styles.donutInner}>43,2%</div>
            </div>
          </div>

          <div style={styles.smallCard}>
            <div style={styles.smallTitle}>% Jeunes &lt; 35 ans (Total)</div>

            <div style={styles.donut}>
              <div style={styles.donutInner}>33,8%</div>
            </div>
          </div>

          {/* ===== TABLE ===== */}
          <div style={styles.largeCard}>
            <div style={styles.cardTitle}>
              Atteinte par catégorie de bénéficiaires (C3)
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Catégorie C3</th>
                  <th style={styles.th}>Nombre de producteurs</th>
                  <th style={styles.th}>% de la cible (7 000)</th>
                  <th style={styles.th}>% Femmes</th>
                  <th style={styles.th}>% Jeunes &lt; 35 ans</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td style={{ ...styles.td, ...styles.categoryCell }}>
                    Bénéficiaires individuels (C3)
                  </td>
                  <td style={styles.tdCenter}>3 012</td>
                  <td style={styles.tdCenter}>43,0%</td>
                  <td style={styles.tdCenter}>41,8%</td>
                  <td style={styles.tdCenter}>33,1%</td>
                </tr>

                <tr>
                  <td style={styles.td}>Groupements bénéficiaires (C3)</td>
                  <td style={styles.tdCenter}>1 814</td>
                  <td style={styles.tdCenter}>25,9%</td>
                  <td style={styles.tdCenter}>45,3%</td>
                  <td style={styles.tdCenter}>34,7%</td>
                </tr>

                <tr style={{ background: '#f0f8eb', fontWeight: 700 }}>
                  <td style={styles.td}>Total</td>
                  <td style={styles.tdCenter}>4 826</td>
                  <td style={styles.tdCenter}>69,0%</td>
                  <td style={styles.tdCenter}>43,2%</td>
                  <td style={styles.tdCenter}>33,8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= SECOND GRID ================= */}
        <div style={styles.middleGrid}>
          {/* ===== CHART ===== */}
          <div style={styles.chartCard}>
            <div style={styles.cardTitle}>
              Évolution annuelle des bénéficiaires C3
            </div>

            <div style={styles.legendRow}>
              <div style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendDot,
                    background: '#16a34a',
                  }}
                />
              </div>

              <div style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendDot,
                    background: '#2563eb',
                  }}
                />
              </div>
            </div>

            <div style={{ width: '100%', height: 270 }}>
              <ResponsiveContainer>
                <LineChart
                  data={yearlyData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                >
                  {/* ===== GRADIENTS ===== */}
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#16a34a"
                        stopOpacity={0.1}
                      />
                    </linearGradient>

                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} />
                      <stop
                        offset="95%"
                        stopColor="#2563eb"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>

                  {/* ===== GRID STYLE POWER BI ===== */}
                  <CartesianGrid
                    vertical={false}
                    stroke="#e5e7eb"
                    strokeDasharray="3 3"
                  />

                  {/* ===== AXES ===== */}
                  <XAxis
                    dataKey="year"
                    axisLine={{ stroke: '#9ca3af' }}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fontFamily: 'Arial',
                      fill: '#6b7280',
                    }}
                  />

                  <YAxis
                    tickFormatter={formatK}
                    tick={{
                      fontSize: 11,
                      fontFamily: 'Arial',
                      fill: '#6b7280',
                    }}
                    axisLine={{ stroke: '#9ca3af' }}
                    tickLine={false}
                  />

                  {/* ===== TOOLTIP MODERNE ===== */}
                  <Tooltip
                    formatter={(value: number) => formatK(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                    }}
                  />

                  {/* ===== ANIMATION ===== */}
                  {visibleLines.total && (
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="url(#colorTotal)"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: '#fff',
                        stroke: '#16a34a',
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 7 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      name="Total bénéficiaires C3"
                      label={{
                        position: 'top',
                        fontSize: 10,
                        fill: '#16a34a',
                      }}
                    />
                  )}

                  {visibleLines.producteurs && (
                    <Line
                      type="monotone"
                      dataKey="producteurs"
                      stroke="url(#colorProd)"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: '#fff',
                        stroke: '#2563eb',
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 7 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      name="Producteurs (C3)"
                      label={{
                        position: 'top',
                        fontSize: 10,
                        fill: '#2563eb',
                      }}
                    />
                  )}

                  <Legend
                    verticalAlign="top"
                    align="center"
                    content={() => (
                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          fontSize: 12,
                          marginBottom: 10,
                          marginTop: -10,
                        }}
                      >
                        <div
                          onClick={() => toggleLine('total')}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: visibleLines.total ? 1 : 0.4,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              background: '#16a34a',
                            }}
                          />
                          Total bénéficiaires
                        </div>

                        <div
                          onClick={() => toggleLine('producteurs')}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: visibleLines.producteurs ? 1 : 0.4,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              background: '#2563eb',
                            }}
                          />
                          Producteurs
                        </div>
                      </div>
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ===== PARCOURS ===== */}
          <div style={styles.pathCard}>
            <div style={styles.cardTitle}>
              Parcours d’appui des bénéficiaires (C3)
            </div>

            <div style={styles.pathFlow}>
              <div style={styles.pathBoxYellow}>
                <div style={styles.pathIconYellow}>
                  <GraduationCap size={20} />
                </div>

                <div style={styles.pathLabel}>
                  Bénéficiaires ayant obtenu une formation
                </div>

                <div style={styles.pathValueYellow}>7 842</div>

                <div style={styles.pathPercent}>(76,3%)</div>
              </div>

              <div style={styles.arrow}>→</div>

              <div style={styles.pathBoxBlue}>
                <div style={styles.pathIconBlue}>
                  <Gift size={20} />
                </div>

                <div style={styles.pathLabel}>
                  Bénéficiaires ayant obtenu une dotation
                </div>

                <div style={styles.pathValueBlue}>6 215</div>

                <div style={styles.pathPercent}>(60,4%)</div>
              </div>

              <div style={styles.arrow}>→</div>

              <div style={styles.pathBoxGray}>
                <div style={styles.pathIconGray}>
                  <Wrench size={20} />
                </div>

                <div style={styles.pathLabel}>
                  Bénéficiaires ayant obtenu un aménagement
                </div>

                <div style={styles.pathValueGray}>4 128</div>

                <div style={styles.pathPercent}>(40,1%)</div>
              </div>
            </div>

            <div style={styles.note}>
              Les pourcentages sont calculés par rapport à la cible (7 000).
            </div>
          </div>

          {/* ===== MAP ===== */}
          <div style={styles.mapCard}>
            <div style={styles.cardTitle}>
              Localisation des producteurs (C3)
            </div>

            <div style={styles.fakeMap}>
              <MapContainer
                center={[-18.8792, 47.5079]}
                zoom={5.5}
                scrollWheelZoom={true}
                style={{
                  width: '100%',
                  height: '320px',
                  borderRadius: '14px',
                }}
              >
                <TileLayer
                  attribution="Tiles © Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                />

                {producerPoints.map((point, index) => (
                  <CircleMarker
                    key={index}
                    center={point.position as [number, number]}
                    radius={10}
                    pathOptions={{
                      fillColor: getColor(point.value),
                      color: '#fff',
                      weight: 1.5,
                      fillOpacity: 0.85,
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>Producteurs :</strong> {point.value}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              <div style={styles.mapLegend}>
                <div style={styles.legendTitle}>Nb producteurs</div>

                <div style={styles.legendRow}>
                  <span
                    style={{ ...styles.legendColor, background: '#16a34a' }}
                  />
                  1 - 50
                </div>

                <div style={styles.legendRow}>
                  <span
                    style={{ ...styles.legendColor, background: '#4ade80' }}
                  />
                  51 - 100
                </div>

                <div style={styles.legendRow}>
                  <span
                    style={{ ...styles.legendColor, background: '#facc15' }}
                  />
                  101 - 250
                </div>

                <div style={styles.legendRow}>
                  <span
                    style={{ ...styles.legendColor, background: '#fb923c' }}
                  />
                  251 - 500
                </div>

                <div style={styles.legendRow}>
                  <span
                    style={{ ...styles.legendColor, background: '#ef4444' }}
                  />
                  501 et +
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div style={styles.bottomCard}>
        <div style={styles.bottomHeader}>
          <div style={styles.bottomTitle}>Détails des bénéficiaires C3</div>

          <div style={styles.bottomActions}>
            <div style={styles.searchBox}>
              <Search size={16} color="#6b7280" />
              <input placeholder="Rechercher..." style={styles.searchInput} />
            </div>

            <button style={styles.exportBtn}>
              Exporter
              <Download size={16} />
            </button>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.bigTable}>
            <thead>
              <tr>
                <th style={{ ...styles.headGray, width: '8%' }}>Id</th>

                <th style={{ ...styles.headYellow, width: '5.5%' }}>
                  Nombre de formations
                </th>
                <th style={{ ...styles.headYellow, width: '16%' }}>
                  Spécification de la formation
                </th>
                <th style={{ ...styles.headYellow, width: '7%' }}>Date</th>

                <th style={{ ...styles.headBlue, width: '5.5%' }}>
                  Nombre de dotations
                </th>
                <th style={{ ...styles.headBlue, width: '16%' }}>
                  Spécification de la dotation
                </th>
                <th style={{ ...styles.headBlue, width: '7%' }}>Date</th>

                <th style={{ ...styles.headGray, width: '5.5%' }}>
                  Nombre d’aménagements
                </th>
                <th style={{ ...styles.headGray, width: '17%' }}>
                  Spécification de l’aménagement
                </th>
                <th style={{ ...styles.headGray, width: '7%' }}>Date</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.bodyTd}>{row.id}</td>

                  <td style={styles.bodyTdCenter}>{row.formations}</td>
                  <td style={styles.bodyTd}>{row.formationSpec}</td>
                  <td style={styles.bodyTdCenter}>{row.formationDate}</td>

                  <td style={styles.bodyTdCenter}>{row.dotations}</td>
                  <td style={styles.bodyTd}>{row.dotationSpec}</td>
                  <td style={styles.bodyTdCenter}>{row.dotationDate}</td>

                  <td style={styles.bodyTdCenter}>{row.amenagements}</td>
                  <td style={styles.bodyTd}>{row.amenagementSpec}</td>
                  <td style={styles.bodyTdCenter}>{row.amenagementDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          {/* LEFT */}
          <div style={styles.paginationInfo}>
            Affichage de {startIndex + 1} à{' '}
            {Math.min(endIndex, tableRows.length)} sur {tableRows.length}{' '}
            enregistrements
          </div>

          {/* CENTER */}
          <div style={styles.pages}>
            <button
              style={styles.pageBtn}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                style={
                  currentPage === index + 1
                    ? styles.pageBtnActive
                    : styles.pageBtn
                }
              >
                {index + 1}
              </button>
            ))}

            <button
              style={styles.pageBtn}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              ›
            </button>
          </div>

          {/* RIGHT */}
          <div style={styles.rowsPerPage}>
            <span>Lignes par page</span>

            <select
              style={styles.rowsSelect}
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option>5</option>
              <option>10</option>
              <option>15</option>
              <option>20</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    padding: 12,
    background: 'none',
    minHeight: '100vh',
    width: '100%',
    overflowX: 'hidden',
    fontFamily: 'Inter, sans-serif',
    color: '#111827',
    maxWidth: '100vw',
  },

  /* ================= FILTERS ================= */

  filtersGrid: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 5,
    width: '100%',
    marginBottom: 5,
    overflowX: 'auto',
  },

  filterItem: {
    flex: 1,
    minWidth: 0,
  },

  filterLabel: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
    color: '#111827',
  },

  select: {
    width: '100%',
    height: 38,
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    padding: '0 12px',
    fontSize: 10,
    outline: 'none',
  },

  /* ================= TOP ================= */

  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr 3fr',
    gap: 8,
    width: '100%',
    alignItems: 'start',
  },

  categoryCell: {
    whiteSpace: 'nowrap',
    fontWeight: 600,
    fontSize: 12,
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 8,
    border: '1px solid #e5e7eb',
    fontSize: 10,
    height: 160,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },

  smallCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 8,
    border: '1px solid #e5e7eb',
    display: 'flex',
    height: 160,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },

  largeCard: {
    background: '#fff',
    borderRadius: 10,
    padding: 8,
    height: 160,
    maxHeight: 290,
    border: '1px solid #e5e7eb',
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#166534',
    marginBottom: 5,
  },

  subText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 10,
  },

  bigValue: {
    fontSize: 22,
    fontWeight: 800,
    textAlign: 'center',
    color: '#166534',
    lineHeight: 1,
  },

  bigSub: {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 10,
  },

  progressBg: {
    width: '100%',
    height: 18,
    borderRadius: 999,
    overflow: 'hidden',
    background: '#dfe8d7',
  },

  progressFill: {
    width: '69%',
    height: '100%',
    background: 'linear-gradient(90deg,#4ade80,#3f8f00)',
  },

  progressValue: {
    textAlign: 'center',
    marginTop: 6,
    fontWeight: 800,
    fontSize: 15,
    color: '#166534',
  },

  target: {
    textAlign: 'center',
    marginTop: 4,
    color: '#4b5563',
    fontSize: 12,
  },

  /* ================= DONUT ================= */

  smallTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 12,
  },

  donut: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'conic-gradient(#3f8f00 0% 43%, #dfe8d7 43% 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutInner: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 800,
    color: '#166534',
  },

  /* ================= TABLE TOP ================= */

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },

  th: {
    background: '#3f8f00',
    color: '#fff',
    padding: '9px 6px',
    fontSize: 12,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    border: '1px solid #d1d5db',
  },

  td: {
    padding: '9px 6px',
    border: '1px solid #e5e7eb',
    fontSize: 12,
    whiteSpace: 'nowrap',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  tdCenter: {
    padding: '9px 6px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },

  /* ================= MIDDLE ================= */

  middleGrid: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr 1.6fr',
    gap: 12,
    width: '100%',
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'stretch',
  },

  chartCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 14,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },

  pathCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 14,
    border: '1px solid #e5e7eb',
  },

  mapCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 14,
    border: '1px solid #e5e7eb',
  },

  note: {
    marginTop: 40,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },

  /* ================= PARCOURS ================= */

  pathFlow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    marginTop: 15,
  },

  pathBoxYellow: {
    flex: 1,
    border: '1.5px solid #facc15',
    borderRadius: 13,
    padding: 12,
    textAlign: 'center',
  },

  pathBoxBlue: {
    flex: 1,
    border: '1.5px solid #60a5fa',
    borderRadius: 13,
    padding: 12,
    textAlign: 'center',
  },

  pathBoxGray: {
    flex: 1,
    border: '1.5px solid #d1d5db',
    borderRadius: 13,
    padding: 12,
    textAlign: 'center',
  },

  pathLabel: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.4,
    minHeight: 52,
  },

  pathValueYellow: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ca8a04',
  },

  pathValueBlue: {
    fontSize: 20,
    fontWeight: 800,
    color: '#2563eb',
  },

  pathValueGray: {
    fontSize: 20,
    fontWeight: 800,
    color: '#4b5563',
  },

  /* ================= MAP ================= */

  fakeMap: {
    position: 'relative',
    height: 280,
    borderRadius: 12,
    background: '#eef5ff',
    overflow: 'hidden',
  },

  mapDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.8)',
  },

  /* ================= BOTTOM ================= */

  bottomCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 14,
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  bottomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'nowrap',
  },

  bottomTitle: {
    background: '#166534',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '10px 10px 0 0',
    fontWeight: 700,
    fontSize: 12,
    marginBottom: 0,
  },

  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '4px 8px',
    background: '#fff',
    height: 26,
  },

  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 12,
    width: 140,
  },

  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '6px 10px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
    height: 34,
  },

  tableWrapper: {
    overflowX: 'hidden',
    maxWidth: '100%',
  },

  bigTable: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },

  headYellow: {
    background: '#fef3c7',
    padding: '7px 4px',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 700,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
  },

  headBlue: {
    background: '#dbeafe',
    padding: '7px 4px',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 700,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
  },

  headGray: {
    background: '#f3f4f6',
    padding: '7px 4px',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 700,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word',
  },

  bodyTd: {
    padding: '6px 5px',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    fontSize: 11,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  bodyTdCenter: {
    padding: '6px 5px',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    textAlign: 'center',
    fontSize: 11,
  },

  pagination: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    marginTop: 12,
    fontSize: 12,
    paddingTop: 8,
    borderTop: '1px solid #e5e7eb',
  },

  paginationInfo: {
    fontSize: 12,
    color: '#6b7280',
  },

  rowsPerPage: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#374151',
  },

  rowsSelect: {
    height: 30,
    borderRadius: 6,
    border: '1px solid #d1d5db',
    padding: '0 8px',
    fontSize: 12,
    background: '#fff',
    outline: 'none',
  },

  pageBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
    transition: '0.2s',
    opacity: 0.9,
  },

  pageBtnActive: {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: 'none',
    background: '#166534',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
    flexWrap: 'wrap',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: '#ecfdf3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #bbf7d0',
  },

  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  refreshBtn: {
    height: 42,
    padding: '0 18px',
    borderRadius: 10,
    background: '#166534',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    flexShrink: 0,
  },

  mapLegend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    background: 'rgba(255,255,255,0.95)',
    padding: '10px 12px',
    borderRadius: 12,
    zIndex: 999,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontSize: 12,
  },

  legendTitle: {
    fontWeight: 700,
    marginBottom: 8,
    color: '#111827',
  },

  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },

  legendColor: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    display: 'inline-block',
  },

  bottomActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};
