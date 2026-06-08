import React , { useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceLine,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Label,
    Pie,
    Cell,
    LabelList, 
  } from 'recharts';

  import {
    Flame,
    Target,
    TrendingDown,
    Calendar,
    CalendarDays,
    MapPin,
    ExternalLink,
    Landmark,
    FileSpreadsheet,
    Check, Clock, Pause,
  } from 'lucide-react';

export default function SuperficiesBrulees() {

  const [selectedYear, setSelectedYear] = React.useState(2025);

  const [regionFilter, setRegionFilter] = useState("Toutes");

  const evolution = [
    { annee: "", },
    { annee: 2025, valeur: 66.7 },
    { annee: 2026, valeur: 70.0 },
    { annee: 2027, valeur: 76.7 },
    { annee: 2028, valeur: 83.3 },
    { annee: 2029, valeur: 90.0 },
    { annee: 2030, valeur: 100 },
  ];

  const evolutionWithTarget = evolution.map(d => ({
    ...d,
    cible: -25,
  }));

  const regions = [
    { name: 'MDA', v: -5 },
    { name: 'ANK', v: -12 },
    { name: 'ANL', v: -18 },
    { name: 'AKF', v: -20 },
    { name: 'ADH', v: -25 },
    { name: 'MDS', v: -32 },
    { name: 'MLB', v: -38 },
  ];

  const data = [
    { region: 'Boeny', taux: 100, color: '#16a34a' },
    { region: 'DIANA', taux: 100, color: '#16a34a' },
    { region: "Amoron'i Mania", taux: 75, color: '#eab308' },
    { region: 'Vakinankaratra', taux: 50, color: '#eab308' },
    { region: 'Anôsy', taux: 25, color: '#eab308' },
    { region: 'Atsimo Atsinanana', taux: 10.5, color: '#ef4444' },
  ];

  const sortedData = [...data]
  .sort((a, b) => b.taux - a.taux)
  .map((d) => ({
    ...d,
    fill:
      d.taux >= 80
        ? '#16a34a' // vert
        : d.taux >= 50
        ? '#eab308' // jaune
        : '#ef4444', // rouge
  }));

  const renderCustomTick = (props: any) => {
    const { x, y, payload } = props;
    const label = payload.value;
  
    // exemple simple de découpage (tu peux adapter)
    const parts = label.split(" ");
  
    return (
      <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fill="#374151">
        {parts.map((p: string, i: number) => (
          <tspan x={x} dy={i === 0 ? 0 : 12} key={i}>
            {p}
          </tspan>
        ))}
      </text>
    );
  };

  const [rows, setRows] = useState([
    {
      region: "Boeny",
      date: "2024-03-15",
      org: "Direction Régionale de l'Environnement et du Développement Durable (DREDD)",
      link: "https://suivi-boeny.mg",
      linkLabel: "Système de suivi Boeny",
      status: "done",
    },
    {
      region: "DIANA",
      date: "2024-06-10",
      org: "Direction Régionale de l'Environnement et du Développement Durable (DREDD)",
      link: "https://suivi-diana.mg",
      linkLabel: "Système de suivi DIANA",
      status: "done",
    },
    {
      region: "Amoron'i Mania",
      date: "2024-11-22",
      org: "Bureau Régional de l'Environnement et du Développement Durable (BREDD)",
      link: "https://suivi-amoroni-mania.mg",
      linkLabel: "Système de suivi Amoron'i Mania",
      status: "progress",
    },
    {
      region: "Vakinankaratra",
      date: "2025-02-05",
      org: "Bureau Régional de l'Environnement et du Développement Durable (BREDD)",
      link: "https://suivi-vakinakaratra.mg",
      linkLabel: "Système de suivi Vakinakaratra",
      status: "progress",
    },
    {
      region: "Anôsy",
      date: "-",
      org: "-",
      link: "-",
      linkLabel: "-",
      status: "pending",
    },
    {
      region: "Atsimo Atsinanana",
      date: "-",
      org: "-",
      link: "-",
      linkLabel: "-",
      status: "pending",
    },
  ]);

  const COLORS = ['#16a34a', '#22c55e', '#84cc16', '#f59e0b', '#ef4444', '#9333ea', '#2563eb'];

  const kpiValue = 66.7;

  const dataDonut = [
    { name: 'atteint', value: kpiValue },
    { name: 'reste', value: 100 - kpiValue },
  ];

  

  const donutColor = '#16a34a';
  const restColor = '#e5e7eb';

  const comparisonData = [

    {
      annee: 2025,
      MDA: -5,
      ANK: -12.02,
      ANLM: -15,
      AKF: -18,
      ADH: -22.05,
      MDS: -25.05,
      MLB: -30.2,
    },
    {
      annee: 2026,
      MDA: -7,
      ANK: -14.02,
      ANLM: -16,
      AKF: -16.5,
      ADH: -26,
      MDS: -28.02,
      MLB: -32,
    },
    {
      annee: 2027,
      MDA: -10,
      ANK: -16,
      ANLM: -17,
      AKF: -25,
      ADH: -25,
      MDS: -30,
      MLB: -34.02,
    },
    {
      annee: 2028,
      MDA: -12,
      ANK: -18,
      ANLM: -18.5,
      AKF: -22,
      ADH: -26,
      MDS: -32,
      MLB: -36,
    },
    {
      annee: 2029,
      MDA: -14,
      ANK: -20,
      ANLM: -22,
      AKF: -24,
      ADH: -27.02,
      MDS: -34.05,
      MLB: -38,
    },
    {
      annee: 2030,
      MDA: -15,
      ANK: -22,
      ANLM: -22.5,
      AKF: -24.25,
      ADH: -28,
      MDS: -36,
      MLB: -40,
    },
  ];

  return (
    <div style={styles.container}>

      {/* ================= HEADER ================= */}
      <div style={styles.header}>

            {/* LEFT */}
            <h2 style={styles.title}>
                Système de suivi
            </h2>

            {/* RIGHT */}
            <div style={styles.filterRow}>

                <div style={styles.filterBlock}>
                <div style={styles.filterLabel}>
                    <Calendar size={14} /> Année
                </div>
                <select
                  style={styles.select}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  <option value={2030}>2030</option>
                  <option value={2029}>2029</option>
                  <option value={2028}>2028</option>
                  <option value={2027}>2027</option>
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
            </div>
            <div style={styles.filterBlock}>
                <div style={styles.filterLabel}>
                    <MapPin size={14} /> Région
                </div>
                    <select style={styles.select}>
                        <option>Toutes les régions</option>
                        <option>Amoron'i Mania</option>
                        <option>Atsimo Atsinanana</option>
                        <option>Anôsy</option>
                        <option>Boeny</option>
                        <option>Diana</option>
                        <option>Vakinakaratra</option>
                    </select>
            </div>

          <button style={styles.button}>
            Réinitialiser les filtres
          </button>
      </div>
      </div>

      <div style={styles.banner}>
        <Target size={28} color="#16a34a" /> Indicateur : Les 5 régions d’intervention disposent d’un système de suivi et d'évaluation des services écosystémiques.
      </div>

      {/* ================= KPI + LINE + MAP ================= */}
<div style={styles.gridTop}>

{/* KPI DONUT */}
<div style={styles.cardLarge}>
  <div style={styles.cardTitle}>
    TAUX D’ATTEINTE DE LA CIBLE
  </div>

  <ResponsiveContainer width="100%" height={240}>
    <PieChart>
      <Pie
        data={dataDonut}
        innerRadius={60}
        outerRadius={90}
        startAngle={90}
        endAngle={-270}
        dataKey="value"
        stroke="none"
      >
        <Cell fill={donutColor} />
        <Cell fill={restColor} />
      </Pie>
    </PieChart>
  </ResponsiveContainer>

  {/* TEXTE CENTRÉ DANS LE DONUT */}
  <div style={styles.kpiCenterOverlay}>
    <div style={{ ...styles.kpiValue, color: donutColor }}>
    {kpiValue.toFixed(1).replace('.', ',')}%
    </div>
    <div style={styles.kpiLabel}>
      Cible : 100%
    </div>
  </div>

  {/* TEXTE OBJECTIF SOUS LE DONUT */}
  <div style={styles.kpiTextBlock}>
    <div style={styles.objectifTitle}>
      4 / 6 régions disposent d'un système de suivi et d'évaluation opérationnel
    </div>
  </div>
</div>

{/* LINE CHART */}
<div style={styles.cardLarge}>
  <div style={styles.cardTitle}>
     ÉVOLUTION MULTI-ANNUELLE DE L'INDICATEUR 
  </div>

  <ResponsiveContainer width="100%" height={300}>
    <LineChart
      data={evolution}
      margin={{ top: 20, right: 50, left: 0, bottom: 0 }}
    >

      <CartesianGrid strokeDasharray="3 3" />

      {/* AXE X */}
      <XAxis
        dataKey="annee"
        tick={{ fontSize: 11 }}
      />

      {/* AXE Y FIXE */}
      <YAxis
        domain={[0, 100]}
        ticks={[100, 80, 60, 40, 20, 0]}
        tick={{ fontSize: 11 }}
      />

      <Tooltip
        contentStyle={{ fontSize: 11 }}
        formatter={(value: number) => `${value}%`}
      />

      {/* LIGNE OBJECTIF -25% */}
      <ReferenceLine
        y={-25}
        stroke="#16a34a"
        strokeDasharray="5 5"
        label={{
          value: "Objectif: -25%",
          position: "insideLeft",
          fill: "red",
          fontSize: 11
        }}
      />

      {/* COURBE */}
      <Line
        type="monotone"
        dataKey="valeur"
        name="Taux d'atteinte(%)"
        stroke="#16a34a"
        strokeWidth={2}
        dot={{ r: 3 }}
        label={({ x, y, value }) => (
          <text
            x={x}
            y={y - 8}
            fontSize={10}
            fontWeight={700}
            fill="#111827"
            textAnchor="middle"
          >
            {value}%
          </text>
        )}
      />

      {/* LÉGENDE */}
      <Legend
        verticalAlign="bottom"
        iconType="line"
        wrapperStyle={{ fontSize: 11 }}
      />

    </LineChart>
</ResponsiveContainer>
</div>

        {/* BAR CHART */}
        <div style={styles.cardLarge}>
        <div style={styles.cardTitle}>
            COMPARAISON DES REGIONS (%)
        </div>

    <ResponsiveContainer width="100%" height={300}>
        <BarChart
            data={sortedData}
            barCategoryGap="40%"   // 👈 espace entre groupes
        >

            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

            <XAxis
                dataKey="region"
                tick={renderCustomTick}
                interval={0}
                />

            <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            />

            <Tooltip
            formatter={(v) => `${v}%`}
            contentStyle={{ fontSize: 12 }}
            />

            <Bar
                dataKey="taux"
                barSize={35}
                radius={[4, 4, 0, 0]}
                animationDuration={1200}
            >
            {sortedData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
            ))}

            <LabelList
                dataKey="taux"
                position="insideTop"
                formatter={(v) => `${v}%`}
                style={{
                fill: '#fff',
                fontSize: 11,
                fontWeight: 700,
                }}
            />
            </Bar>
            </BarChart>
        </ResponsiveContainer>
    <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, background: '#16a34a', borderRadius: 3 }} />
            ≥ 80% Atteint
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, background: '#eab308', borderRadius: 3 }} />
            50–79% En cours
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
            style={{
            width: 12,
            height: 12,
            background: '#ef4444',
            borderRadius: 3,
            }}
        />
        &lt; 50% En retard
        </div>

    </div>
    
</div>   

</div>

{/* ================= REPARTITION (BAR STYLE LIKE IMAGE) ================= */}
<div style={styles.gridComparison}>
  
        {/* GRAPHIQUE */}
        <div style={styles.tableCard}>

        <div style={styles.tableTitle}>
            SYSTEMES DE SUIVI PAR REGION
        </div>

        <table style={styles.table}>
        <thead>
            <tr style={styles.thead}>
                <th style={styles.th}>Région</th>
                <th style={{ ...styles.th, ...styles.dateColumn }}>
                    Date de mise en place du système de suivi
                    </th>
                <th style={styles.th}>
                Nom de l'entité qui héberge le système
                </th>
                <th style={styles.th}>
                Lien du système de suivi
                </th>
                <th style={styles.th}>
                État de l’indicateur
                </th>
            </tr>
        </thead>

        <tbody>
            {rows.map((row, i) => (
                <tr
                key={i}
                style={{
                    backgroundColor:
                    i % 2 === 0 ? "#ffffff" : "#f9fafb",
                }}
                >

                {/* Région */}
                <td style={styles.td}>{row.region}</td>

                {/* DATE avec icône calendrier */}
                <td
                    style={{
                        ...styles.td,
                        ...styles.dateColumn,
                        textAlign: "left",
                    }}
                    >
                    {row.date !== "-" ? (
                        <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: 6,
                        }}
                        >
                        <CalendarDays size={16} color="#16a34a" />

                        <span
                            style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "#f3f4f6",
                            fontSize: 12,
                            }}
                        >
                            {row.date}
                        </span>
                        </div>
                    ) : (
                        "-"
                    )}
                </td>

                {/* ORGANISME */}
                <td style={styles.td}>{row.org}</td>

                {/* LINK */}
                <td style={styles.td}>
                    {row.link !== "-" ? (
                        <a
                        href={row.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            paddingRight: 6,
                          }}
                        >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {row.link}
                        </span>

                        <ExternalLink size={16} style={{ flexShrink: 0 }} />
                        </a>
                    ) : (
                        "-"
                    )}
                </td>

                {/* STATUS */}
                <td style={styles.td}>
                    {row.status === "done" && (
                        <span
                            title="Atteint"
                            style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            color: "#16a34a",
                            fontSize: 12,
                            fontWeight: 700,
                            }}
                        >
                            <span
                            style={{
                                ...styles.statusIconBase,
                                background: "rgba(34,197,94,0.15)",
                                color: "#16a34a",
                            }}
                            >
                            <Check size={16} />
                            </span>

                            Atteint
                        </span>
                        )}

                        {row.status === "progress" && (
                        <span
                            title="En cours"
                            style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            color: "#f59e0b",
                            fontSize: 12,
                            fontWeight: 700,
                            }}
                        >
                            <span
                            style={{
                                ...styles.statusIconBase,
                                background: "rgba(245,158,11,0.15)",
                                color: "#f59e0b",
                            }}
                            >
                            <Clock size={16} />
                            </span>

                            En cours
                        </span>
                        )}

                        {row.status === "pending" && (
                        <span
                            title="En suspend"
                            style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            color: "#ef4444",
                            fontSize: 12,
                            fontWeight: 700,
                            }}
                        >
                            <span
                            style={{
                                ...styles.statusIconBase,
                                background: "rgba(239,68,68,0.15)",
                                color: "#ef4444",
                            }}
                            >
                            <Pause size={16} />
                            </span>

                            En suspend
                        </span>
                        )}
                </td>

                </tr>
            ))}
            </tbody>
        </table>

        {/* PAGINATION */}
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                fontSize: 12,
                color: "#374151",
                paddingTop: 10,
                borderTop: "1px solid #e5e7eb",
            }}
            >
            {/* LEFT - rows per page */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Afficher</span>

                <select
                style={{
                    padding: "4px 6px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                    background: "#fff",
                }}
                >
                {[5, 10, 20, 50].map((n) => (
                    <option key={n}>{n}</option>
                ))}
                </select>

                <span>lignes</span>
            </div>

            {/* CENTER - info */}
            <div style={{ fontWeight: 500 }}>
                1 – 6 sur 6 résultats
            </div>

            {/* RIGHT - navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                }}
                >
                ‹
                </button>

                <button
                style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #16a34a",
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: 600,
                }}
                >
                1
                </button>

                <button
                style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer",
                }}
                >
                ›
                </button>
            </div>
            </div>
    </div>
</div>

</div>
);
}

/* ================= STYLES ================= */
const styles: any = {

    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    
    title: {
      fontSize: 22,
      fontWeight: 700,
    },
    
    
    filterBlock: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    },
    
    filterLabel: {
      fontSize: 11,
      display: 'flex',
      gap: 5,
      alignItems: 'center',
      color: '#374151',
    },
    
    select: {
      padding: 8,
      borderRadius: 8,
      border: '1px solid #ddd',
    },
    
    button: {
      padding: '8px 12px',
      background: '#16a34a',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
    },
    
    gridTop: {
        display: 'grid',
        gridTemplateColumns: '0.7fr 1.1fr 1.2fr',
        gap: 16,
        alignItems: 'stretch',
      },
    
    cardLarge: {
      background: '#fff',
      padding: 10,
      borderRadius: 10,
    },
    
    cardTitle: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      textAlign: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      marginBottom: 5,
      fontSize: 'clamp(11px, 1vw, 14px)',
    },
    
    kpiValue: {
      fontSize: 22,
      fontWeight: 700,
    },
    

    filterRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        flexWrap: 'nowrap',
      },

      kpiCenterOverlay: {
        position: 'relative',
        top: -140,
        textAlign: 'center',
      },
      
      kpiTextBlock: {
        marginTop: -20,
        textAlign: 'center',
        fontSize: 12,
        color: '#374151',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      },
      
      objectifTitle: {
        fontWeight: 700,
        marginBottom: 6,
      },
      
      kpiLine: {
        fontSize: 11,
        opacity: 0.85,
      },

      banner: {
        background: '#ecfdf5',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        fontWeight: 700,
        color: '#065f46',
        lineHeight: 1.4,
      },
      
      tableTitle: {
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 10,
        color: "#111827",
      },
      
      table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 13,
        border: "1px solid #d1d5db", // bordure extérieure
      },      

      tableCard: {
        background: "#fff",
        borderRadius: 12,
        padding: 12,
        overflowX: "auto",
      },

      thead: {
        background: "#16a34a",
        color: "#fff",
        height: 50,
      },
      
      th: {
        padding: "10px 12px",
        textAlign: "left",
        fontWeight: 700,
        fontSize: 14,              // plus grand
        borderRight: "1px solid rgba(255,255,255,0.3)", // séparation colonnes
        whiteSpace: "normal",
        lineHeight: 1.2,
      },
      
      td: {
        padding: "8px 12px",
        borderBottom: "1px solid #e5e7eb",
        borderRight: "1px solid #e5e7eb", // séparation colonnes
        verticalAlign: "middle",
      },
      
      tableFooter: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        fontSize: 12,
        color: "#374151",
      },
      
      statusDone: {
        background: "rgba(34,197,94,0.1)",
        color: "#16a34a",
        padding: "4px 8px",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontWeight: 600,
      },
      
      statusProgress: {
        background: "rgba(245,158,11,0.1)",
        color: "#f59e0b",
        padding: "4px 8px",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontWeight: 600,
      },
      
      statusPending: {
        background: "rgba(239,68,68,0.1)",
        color: "#ef4444",
        padding: "4px 8px",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontWeight: 600,
      },

      dateInput: {
        border: "1px solid #d1d5db",
        borderRadius: 6,
        padding: "4px 6px",
        fontSize: 12,
        width: 130,
      },
      
      dateColumn: {
        width: 160,
        textAlign: "center",
        minWidth: 120,
        maxWidth: 200,
      },

      statusIconBase: {
        width: 26,
        height: 26,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    };