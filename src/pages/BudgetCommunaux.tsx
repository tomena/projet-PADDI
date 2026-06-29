import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Calendar,
  RotateCcw,
  MapPin,
  Mountain,
  Building2,
  Users,
  Landmark,
  Coins,
  Leaf,
  PieChart as PieIcon,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  LabelList,
  Legend,
} from 'recharts';

const CustomLegend = (props: any) => {
  const { payload } = props;

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {payload.map((entry: any) => {
        const key = entry.dataKey;

        const active =
          key === 'global' ? visibleSeries.global : visibleSeries.femmes;

        return (
          <div
            key={key}
            onClick={() => toggleSeries(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              border: `1px solid ${entry.color}`,
              background: active ? entry.color : '#fff',
              color: active ? '#fff' : entry.color,
              fontSize: 11,
              fontWeight: 600,
              transition: '0.2s',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                background: entry.color,
                borderRadius: 2,
              }}
            />
            {entry.value}
          </div>
        );
      })}
    </div>
  );
};

const stats = [
  {
    title: 'BUDGET TOTAL (SÉLECTION)',
    value: '125,87M Ar',
    subtitle: 'Total des communes sélectionnées',
    color: '#2e7d32',
    icon: Coins,
  },
  {
    title: 'BUDGET SE TOTAL',
    value: '6,32M Ar',
    subtitle: 'Total alloué aux SE',
    color: '#43a047',
    icon: Leaf,
  },
  {
    title: '% BUDGET SE (GLOBAL)',
    value: '5,02 %',
    subtitle: 'Objectif : 5 %',
    color: '#1565c0',
    icon: PieIcon,
  },
  {
    title: '% BUDGET SE (FEMMES)',
    value: '2,18 %',
    subtitle: 'Objectif : ≥ 2 %',
    color: '#7b1fa2',
    icon: Users,
  },
  {
    title: 'COMMUNES ≥ 5 %',
    value: '128 / 262',
    subtitle: '48,9 % des communes',
    color: '#f9a825',
    icon: Building2,
  },
  {
    title: 'COMMUNES AVEC ≥ 25%',
    value: '74 / 262',
    subtitle: '28,2 % des communes',
    color: '#388e3c',
    icon: Users,
  },
];

const chartData = [
  { name: 'Commune A', global: 10.4, femmes: 3.6 },
  { name: 'Commune B', global: 7.8, femmes: 2.7 },
  { name: 'Commune C', global: 6.2, femmes: 2.1 },
  { name: 'Commune D', global: 5.3, femmes: 1.9 },
  { name: 'Commune E', global: 4.8, femmes: 1.6 },
  { name: 'Commune F', global: 3.6, femmes: 1.2 },
  { name: 'Commune G', global: 2.9, femmes: 0.9 },
  { name: 'Commune H', global: 2.1, femmes: 0.7 },
  { name: 'Commune I', global: 1.6, femmes: 0.6 },
  { name: 'Commune I', global: 1.6, femmes: 0.3 },
];

const tableData = [
  {
    region: 'Atsinanana',
    district: 'Toamasina II',
    commune: 'Commune A',
    fokontany: 'Ambogimanga',
    budget: '1 250 000 000',
    se: '117 500 000',
    taux: '9,40%',
    budgetFJ: '40 000 000',
    tauxFJ: '34,04%',
    statutGlobal: 'Atteint',
    statutFJ: 'Atteint',
  },
  {
    region: 'Betsiboka',
    district: 'Maevatanana',
    commune: 'Commune B',
    fokontany: 'Mahatsinjo',
    budget: '980 000 000',
    se: '69 580 000',
    taux: '7,10%',
    budgetFJ: '25 480 000',
    tauxFJ: '36,63%',
    statutGlobal: 'Atteint',
    statutFJ: 'Atteint',
  },
  {
    region: 'Boeny',
    district: 'Soalala',
    commune: 'Commune C',
    fokontany: 'Ankijabe',
    budget: '870 000 000',
    se: '48 720 000',
    taux: '5,60%',
    budgetFJ: '18 270 000',
    tauxFJ: '37,50%',
    statutGlobal: 'Atteint',
    statutFJ: 'Atteint',
  },
  {
    region: 'Itasy',
    district: 'Miarinarivo',
    commune: 'Commune D',
    fokontany: 'Soavinandriana',
    budget: '760 000 000',
    se: '36 480 000',
    taux: '4,80%',
    budgetFJ: '12 920 000',
    tauxFJ: '35,44%',
    statutGlobal: 'Non atteint',
    statutFJ: 'Atteint',
  },
  {
    region: 'Melaky',
    district: 'Maintirano',
    commune: 'Commune E',
    fokontany: 'Andranofasika',
    budget: '640 000 000',
    se: '20 480 000',
    taux: '3,20%',
    budgetFJ: '8 320 000',
    tauxFJ: '28,77%',
    statutGlobal: 'Non atteint',
    statutFJ: 'Atteint',
  },
  {
    region: 'Sava',
    district: 'Sambava',
    commune: 'Commune F',
    fokontany: 'Belambo',
    budget: '590 000 000',
    se: '15 340 000',
    taux: '2,60%',
    budgetFJ: '6 490 000',
    tauxFJ: '24,95%',
    statutGlobal: 'Non atteint',
    statutFJ: 'Non atteint',
  },
  {
    region: 'Vakinakaratra',
    district: 'Antsirabe II',
    commune: 'Commune G',
    fokontany: 'Marofarihy',
    budget: '520 000 000',
    se: '8 320 000',
    taux: '1,60%',
    budgetFJ: '3 490 000',
    tauxFJ: '21,93%',
    statutGlobal: 'Non atteint',
    statutFJ: 'Non atteint',
  },
  {
    region: 'Atsimo Andrefana',
    district: 'Toliara I',
    commune: 'Commune H',
    fokontany: 'Efoetse',
    budget: '410 000 000',
    se: '3 280 000',
    taux: '0,80%',
    budgetFJ: '1 230 000',
    tauxFJ: '18,77%',
    statutGlobal: 'Non atteint',
    statutFJ: 'Non atteint',
  },
];

const filters = [
  { icon: MapPin, label: 'Région' },
  { icon: Building2, label: 'District' },
  { icon: Users, label: 'Commune' },
  { icon: Mountain, label: 'Aire protégée' },
  { icon: Landmark, label: 'Paysage' },
];

export default function BudgetCommunaux() {
  const [visibleSeries, setVisibleSeries] = useState({
    global: true,
    femmes: true,
  });

  const [filtersTable, setFiltersTable] = useState({
    region: '',
    district: '',
    commune: '',
    fokontany: '',
    budget: '',
    se: '',
    taux: '',
    budgetFJ: '',
    tauxFJ: '',
    statut: '',
  });

  const toggleSeries = (key: 'global' | 'femmes') => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFiltersTable((prev) => ({
      ...prev,
      [key]: value === 'Tous' ? '' : value,
    }));
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;

    return (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {payload.map((entry: any) => {
          const key = entry.dataKey;

          const active =
            key === 'global' ? visibleSeries.global : visibleSeries.femmes;

          return (
            <div
              key={key}
              onClick={() => toggleSeries(key)}
              style={{
                cursor: 'pointer',
                padding: '4px 10px',
                border: `1px solid ${entry.color}`,
                background: active ? entry.color : '#fff',
                color: active ? '#fff' : entry.color,
              }}
            >
              {entry.value}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      {/* ================= HEADER ================= */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>SUIVI DES BUDGETS COMMUNAUX</h1>

          <div style={styles.subtitle}>
            Allocation des budgets pour l’amélioration des services
            écosystémiques
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.yearBox}>
            <Calendar size={14} />

            <select style={styles.select}>
              <option>2025</option>
              <option>2024</option>
              <option>2023</option>
              <option>2022</option>
            </select>
          </div>

          <button style={styles.resetBtn}>
            <RotateCcw size={12} />
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      {/* ================= FILTERS + SEARCH ================= */}
      <div style={styles.topFiltersGrid}>
        {/* FILTERS */}
        {filters.map((f, i) => {
          const Icon = f.icon;

          return (
            <div key={i} style={styles.filterCard}>
              <div style={styles.filterLeft}>
                <Icon size={14} color="#1e3a8a" />

                <div>
                  <div style={styles.filterTitle}>{f.label}</div>
                  <div style={styles.filterValue}>Toutes</div>
                </div>
              </div>

              <select style={styles.filterSelect}>
                <option>Tous</option>
              </select>
            </div>
          );
        })}

        {/* SEARCH */}
        <div style={styles.searchBox}>
          <Search size={14} color="#6b7280" />

          <input
            placeholder="Rechercher une commune, fokontany, district..."
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* ================= KPI ================= */}
      <div style={styles.statsGrid}>
        {stats.map((item, i) => {
          const Icon = item.icon;

          return (
            <div key={i} style={styles.statCard}>
              <div
                style={{
                  ...styles.iconBox,
                  background: item.color,
                }}
              >
                <Icon size={13} color="#fff" />
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    ...styles.statTitle,
                    color: item.color,
                  }}
                >
                  {item.title}
                </div>

                <div style={styles.statValue}>{item.value}</div>

                {/* BARRE EN PREMIER */}
                <div style={styles.progress}>
                  <div
                    style={{
                      ...styles.progressBar,
                      background: item.color,
                      width: `${50 + i * 8}%`,
                    }}
                  />
                </div>

                {/* OBJECTIF EN DESSOUS */}
                <div style={{ ...styles.statSub, marginTop: 8 }}>
                  {item.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= MAP + CHART ================= */}
      <div style={styles.middleGrid}>
        {/* MAP */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>CARTE INTERACTIVE – MADAGASCAR</div>

          <div style={styles.mapCard}>
            <MapContainer
              center={[-19.0, 47.0]}
              zoom={5}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '280px',
                borderRadius: 5,
              }}
            >
              <TileLayer
                attribution="&copy; ESRI"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              />
            </MapContainer>
          </div>
        </div>

        {/* CHART */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>GRAPHIQUE COMPARATIF DES COMMUNES</div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={25}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={50}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <ReferenceLine
                y={5}
                stroke="red"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: 'Objectif 5%',
                  position: 'insideTopRight',
                  fill: 'red',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />
              <Bar
                dataKey="global"
                name="% Budget SE Global"
                fill="#2e7d32"
                radius={[6, 6, 0, 0]}
                hide={!visibleSeries.global}
              >
                <LabelList
                  dataKey="global"
                  position="top"
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fill: '#2e7d32',
                  }}
                />
              </Bar>
              <Bar
                dataKey="femmes"
                name="% Budget Femmes"
                fill="#7b1fa2"
                radius={[6, 6, 0, 0]}
                hide={!visibleSeries.femmes}
              >
                <LabelList
                  dataKey="femmes"
                  position="top"
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fill: '#7b1fa2',
                  }}
                />
              </Bar>
              <Legend
                content={<CustomLegend />}
                verticalAlign="top"
                align="right"
                iconType="rect"
                iconSize={12}
                wrapperStyle={{
                  fontSize: 11,
                  paddingBottom: 8,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div style={styles.card}>
        <div style={styles.tableHeader}>
          <div style={styles.cardTitle}>TABLEAU DÉTAILLÉ – COMMUNES</div>

          <div style={styles.updateText}>Dernière mise à jour : 20/05/2024</div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '70px' }}>Région</th>
                <th style={{ ...styles.th, width: '70px' }}>District</th>
                <th style={{ ...styles.th, width: '70px' }}>Commune</th>
                <th style={{ ...styles.th, width: '50px' }}>Fokontany</th>
                <th style={{ ...styles.th, width: '80px' }}>
                  Budget Total (Ar)
                </th>
                <th style={{ ...styles.th, width: '70px' }}>Budget SE (Ar)</th>
                <th style={{ ...styles.th, width: '40px' }}>
                  % Budget SE (Global){' '}
                </th>
                <th style={{ ...styles.th, width: '60px' }}>
                  Budget SE (femmes et jeunes)(Ar)
                </th>
                <th style={{ ...styles.th, width: '50px' }}>
                  % Budget SE (femmes et jeunes)
                </th>
                <th style={{ ...styles.th, width: '70px' }}>Objectif 5%</th>
                <th style={{ ...styles.th, width: '80px' }}>
                  Objectif F/J ≥ 25%
                </th>
              </tr>
            </thead>

            <tbody>
              {tableData
                .filter((row) => {
                  return (
                    (!filtersTable.region ||
                      row.region === filtersTable.region) &&
                    (!filtersTable.district ||
                      row.district === filtersTable.district) &&
                    (!filtersTable.commune ||
                      row.commune === filtersTable.commune) &&
                    (!filtersTable.fokontany ||
                      row.fokontany === filtersTable.fokontany) &&
                    (!filtersTable.fokontany ||
                      row.budget === filtersTable.budget) &&
                    (!filtersTable.fokontany || row.se === filtersTable.se) &&
                    (!filtersTable.fokontany ||
                      row.taux === filtersTable.taux) &&
                    (!filtersTable.fokontany ||
                      row.budgetFJ === filtersTable.budgetFJ) &&
                    (!filtersTable.fokontany ||
                      row.tauxFJ === filtersTable.tauxFJ) &&
                    (!filtersTable.statut ||
                      row.statutGlobal === filtersTable.statut)
                  );
                })

                .map((row, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{row.region}</td>
                    <td style={styles.td}>{row.district}</td>
                    <td style={styles.td}>{row.commune}</td>
                    <td style={styles.td}>{row.fokontany}</td>
                    <td style={styles.td}>{row.budget}</td>
                    <td style={styles.td}>{row.se}</td>
                    <td style={styles.td}>{row.taux}</td>
                    <td style={styles.td}>{row.budgetFJ}</td>
                    <td style={styles.td}>{row.tauxFJ}</td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            row.statutGlobal === 'Atteint'
                              ? '#d1fae5'
                              : '#fee2e2',

                          color:
                            row.statutGlobal === 'Atteint'
                              ? '#065f46'
                              : '#b91c1c',
                        }}
                      >
                        {row.statutGlobal}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            row.statutFJ === 'Atteint' ? '#d1fae5' : '#fee2e2',

                          color:
                            row.statutFJ === 'Atteint' ? '#065f46' : '#b91c1c',
                        }}
                      >
                        {row.statutFJ}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BOTTOM ================= */}
      <div style={styles.bottom}>
        <div style={{ fontWeight: 600 }}>Source : Données communales 2024</div>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
  },

  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: '#111827',
  },

  subtitle: {
    marginTop: 8,
    color: '#2e7d32',
    fontWeight: 600,
    fontSize: 13,
  },

  headerRight: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  yearBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fff',
    padding: '12px 16px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
  },

  select: {
    border: 'none',
    outline: 'none',
    fontSize: 12,
    background: 'transparent',
  },

  resetBtn: {
    background: '#15803d',
    color: '#fff',
    border: 'none',
    padding: '14px 20px',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  searchBox: {
    background: '#fff',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid #e5e7eb',
    minWidth: 0,
  },

  searchInput: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: 13,
    background: 'transparent',
    minWidth: 0,
  },

  filterCard: {
    flex: 1,
    minWidth: 0,
    background: '#fff',
    borderRadius: 10,
    padding: '10px 4px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
  },

  filterLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  filterTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
    whiteSpace: 'nowrap',
  },

  filterValue: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },

  filterSelect: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 11,
    width: 55,
  },

  statsGrid: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 8,
    width: '100%',
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    background: '#fff',
    borderRadius: 14,
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #e5e7eb',
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statTitle: {
    fontSize: 11,
    fontWeight: 700,
  },

  statValue: {
    fontSize: 16,
    fontWeight: 800,
    marginTop: 4,
    color: '#111827',
  },

  statSub: {
    marginTop: 2,
    fontSize: 10,
    color: '#6b7280',
  },

  progress: {
    height: 8,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBar: {
    height: '100%',
    borderRadius: 999,
  },

  middleGrid: {
    display: 'grid',
    gridTemplateColumns: '0.95fr 1.45fr',
    gap: 10,
  },

  card: {
    background: '#fff',
    borderRadius: 14,
    padding: 12,
    border: '1px solid #e5e7eb',
  },

  cardTitle: {
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 10,
    color: '#111827',
  },

  fakeMap: {
    position: 'relative',
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    background: '#dbeafe',
  },

  mapImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  mapBubble1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#2e7d32',
    top: 80,
    left: 140,
  },

  mapBubble2: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: '#f59e0b',
    top: 180,
    left: 90,
  },

  mapBubble3: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#43a047',
    top: 130,
    left: 200,
  },

  tableWrapper: {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: 320,
    borderRadius: 10,
    scrollbarWidth: 'thin',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 900,
    tableLayout: 'fixed',
  },

  th: {
    background: '#166534',
    color: '#fff',
    padding: 8,
    fontSize: 12,
    borderRight: '1px solid rgba(255,255,255,0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    textAlign: 'center',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },

  td: {
    padding: 14,
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    fontSize: 12,
    textAlign: 'center',
  },

  badge: {
    padding: '6px 12px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
  },

  bottom: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    color: '#4b5563',
    fontSize: 12,
    marginBottom: 30,
  },

  mapCard: {
    position: 'relative',
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
  },

  topFiltersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr) 1.6fr',
    gap: 8,
    width: '100%',
    alignItems: 'stretch',
  },

  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },

  updateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500,
  },
};
