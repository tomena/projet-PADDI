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
  } from 'recharts';

  import {
    Flame,
    Target,
    Map,
    TrendingDown,
    Calendar,
    MapPin,
    Landmark,
    FileSpreadsheet,
  } from 'lucide-react';

  import { MapContainer, TileLayer } from 'react-leaflet';
  import 'leaflet/dist/leaflet.css';

export default function SuperficiesBrulees() {

  const [selectedYear, setSelectedYear] = React.useState(2025);

  const evolution = [
    { annee: "", },
    { annee: 2025, valeur: -16 },
    { annee: 2026, valeur: -17.5 },
    { annee: 2027, valeur: -19 },
    { annee: 2028, valeur: -20.5 },
    { annee: 2029, valeur: -22.5 },
    { annee: 2030, valeur: -25 },
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

  const COLORS = ['#16a34a', '#22c55e', '#84cc16', '#f59e0b', '#ef4444', '#9333ea', '#2563eb'];

  const kpiValue = 64;

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
                Système de suivi de feux
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
            <div style={styles.filterBlock}>
                <div style={styles.filterLabel}>
                    <Landmark size={14} /> Aire protégée
                </div>
                <select style={styles.select}>
                    <option>Toutes les aires protégées</option>
                    <option>Analamerana</option>
                    <option>Andohahela</option>
                    <option>Ankarafantsika</option>
                    <option>Ankarana</option>
                    <option>Befotaka-Midongy</option>
                    <option>Marolambo</option>
                    <option>Montagne d'Ambre</option>
                </select>
            </div>

          <button style={styles.button}>
            Réinitialiser
          </button>
      </div>
      </div>

      <div style={styles.banner}>
        <Target size={28} color="#16a34a" /> Indicateur : Les superficies brûlées ont diminué de 25% d’ici 2030 dans les zones en périphérie des aires protégées sélectionées.
      </div>

      {/* ================= KPI + LINE + MAP ================= */}
<div style={styles.gridTop}>

{/* KPI DONUT */}
<div style={styles.cardLarge}>
  <div style={styles.cardTitle}>
    TAUX D’ATTEINTE DE LA CIBLE
  </div>

  <ResponsiveContainer width="100%" height={220}>
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
      de la cible atteinte
    </div>
  </div>

  {/* TEXTE OBJECTIF SOUS LE DONUT */}
  <div style={styles.kpiTextBlock}>
    <div style={styles.objectifTitle}>
      Objectif : -25% de superficies brûlées d'ici 2030
    </div>

    <div style={styles.kpiLine}>Référence (2024) : 100%</div>
    <div style={styles.kpiLine}>Valeur actuelle (2025) : -16,0%</div>
    <div style={styles.kpiLine}>Cible (2030): -25%</div>
  </div>
</div>

{/* LINE CHART */}
<div style={styles.cardLarge}>
  <div style={styles.cardTitle}>
     ÉVOLUTION MULTI-ANNUELLE DE L'INDICATEUR 
  </div>

  <div style={{ fontSize: 12, color: '#6b7280', textAlign: "center", marginBottom: 8 }}>
      Variation (%) des superficies brûlées par rapport à l'année de référence (2020 - 2024)
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
        domain={[-30, 30]}
        ticks={[30, 20, 10, 0, -10, -20, -30]}
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
        name="Variation des superficies brûlées (%)"
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

{/* MAP */}
<div style={styles.cardLarge}>
  <div style={styles.cardTitle}>
    CARTE DES SUPERFICIES BRÛLÉES EN PÉRIPHÉRIE DES AIRES PROTÉGÉES ({selectedYear})
  </div>

  <div style={styles.mapBox}>
  <MapContainer
    center={[-18.9, 47.5]}
    zoom={6}
    zoomControl={true}
    style={{ height: '100%', width: '100%' }}
  >
    
    {/* ESRI TOPO LAYER */}
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
      attribution="Tiles © Esri"
    />

  </MapContainer>
</div>
</div>

</div>

{/* ================= REPARTITION (BAR STYLE LIKE IMAGE) ================= */}
<div style={styles.gridComparison}>
  
  {/* GRAPHIQUE */}
  <div style={styles.cardLarge}>
    <div style={styles.cardTitle}>
      COMPARAISON MULTI-ANNUELLE DES 7 AIRES PROTÉGÉES
    </div>

    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={comparisonData}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="annee"
          type="category"
          padding={{ left: 20, right: 20 }}
        />
        <YAxis
          domain={['dataMin', 'dataMax + 20']}
          tick={{ fontSize: 11 }}>

          <Label
            value="Variation (%)"
            angle={-90}
            position="insideLeft"
            style={{
              textAnchor: 'middle',
              fontSize: 12,
              fontWeight: 600,
              fill: '#374151',
            }}
          />
        </YAxis>

        <Tooltip formatter={(v: number) => `${v}%`} />

        {/* 7 COURBES */}
        <Line dataKey="MDA" type="natural" stroke="#16a34a" strokeWidth={2} name="Montagne d’Ambre (MDA)" dot={{ r: 3 }} activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>
                <Line dataKey="ANK" type="natural" stroke="#22c55e" strokeWidth={2} name="Ankarana (ANK)" dot={{ r: 3 }}  activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>
                <Line dataKey="ANLM" type="natural" stroke="#84cc16" strokeWidth={2} name="Analamerana (ANLM)" dot={{ r: 3 }}  activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>
                <Line dataKey="AKF" type="natural" stroke="#f59e0b" strokeWidth={2} name="Ankarafantsika (AKF)" dot={{ r: 3 }}  activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>
                <Line dataKey="ADH" type="natural" stroke="#ef4444" strokeWidth={2} name="Andohahela (ADH)" dot={{ r: 3 }}  activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>
                <Line dataKey="MDS" type="natural" stroke="#9333ea" strokeWidth={2} name="Midongy du Sud (MDS)" dot={{ r: 3 }}  activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>
                <Line dataKey="MLB" type="natural" stroke="#2563eb" strokeWidth={2} name="Marolambo (MLB)" dot={{ r: 3 }}  activeDot={{ r: 5 }} label={({ x, y, value }) => (
            <text
              x={x}
              y={y - 6}
              fontSize={9}
              fontWeight={600}
              fill="#111827"
              textAnchor="middle"
            >
              {value}%
            </text>
          )}/>

      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* LÉGENDES À DROITE */}
  <div style={styles.card}>
    <div style={styles.cardTitle}>LÉGENDES</div>

    <div style={styles.mapLegend}>

        <div style={styles.mapLegendTitle}>
          Superficie brûlée (ha)
        </div>

        <div style={styles.mapLegendItem}>
          <span
            style={{
              ...styles.mapLegendColor,
              background: '#fef3c7',
            }}
          />
          0 - 100
        </div>

        <div style={styles.mapLegendItem}>
          <span
            style={{
              ...styles.mapLegendColor,
              background: '#fcd34d',
            }}
          />
          100 - 500
        </div>

        <div style={styles.mapLegendItem}>
          <span
            style={{
              ...styles.mapLegendColor,
              background: '#fb923c',
            }}
          />
          500 - 1 000
        </div>

        <div style={styles.mapLegendItem}>
          <span
            style={{
              ...styles.mapLegendColor,
              background: '#ef4444',
            }}
          />
          1 000 - 5 000
        </div>

        <div style={styles.mapLegendItem}>
          <span
            style={{
              ...styles.mapLegendColor,
              background: '#b91c1c',
            }}
          />
          &gt; 5 000
        </div>

        <div style={{ height: 12 }} />

        <div style={styles.mapLegendItem}>
          <span
            style={{
              ...styles.mapLegendColor,
              background: '#16a34a',
            }}
          />
          Aire protégée
        </div>
      </div>

    <div style={styles.legendBox}>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#16a34a',
            }}
          />
          MDA - Montagne d'Ambre
        </div>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#22c55e',
            }}
          />
          ANK - Ankarana
        </div>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#84cc16',
            }}
          />
          ANLM - Analamerana
        </div>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#f59e0b',
            }}
          />
          AKF - Ankarafantsika
        </div>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#ef4444',
            }}
          />
          ADH - Andohahela
        </div>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#9333ea',
            }}
          />
          MDS - Midongy du Sud
        </div>

        <div style={styles.legendItem}>
          <span
            style={{
              ...styles.legendLine,
              borderColor: '#2563eb',
            }}
          />
          MLB - Marolambo
        </div>

      </div>

      
  </div>

</div>

{/* ================= FOOTER EXCEL ================= */}
<div style={styles.footer}>
<FileSpreadsheet size={18} color="#16a34a" />
<span>Analyse détaillée par aire protégée, commune et micro-bassin versant</span>
<a href="https://gizonline.sharepoint.com/:x:/r/sites/PADDIwithguests-01SEetSIG/Freigegebene%20Dokumente/Equipe%20Technique/03.%20Op%C3%A9rations/R%C3%A9alisation%20PO%20(par%20unit%C3%A9)/UCT%20Tan%C3%A0/Composante%200/SIG/2025-10-06_Tableau_de_Bord_Feux/TB_et_BDD/Tableau_de_Bord_PADDI.xlsx?d=w35ed3c1299264334a65aa1d2729d3042&csf=1&web=1&e=pze1XJ" style={styles.link}>
  Tableaux de bord PADDI.xlsx
</a>
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
    
    filters: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-end',
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
        gridTemplateColumns: '0.7fr 1.1fr 1.2fr', // carte plus large en hauteur visuelle
        gap: 16,
        alignItems: 'stretch',
      },

      gridComparison: {
        display: 'grid',
        gridTemplateColumns: '4fr 0.8fr', // réduit largeur
        gap: 10,
      },
    
    card: {
      background: '#fff',
      padding: 10,
      borderRadius: 12,
    },
    
    cardLarge: {
      background: '#fff',
      padding: 16,
      borderRadius: 12,
    },
    
    cardBottom: {
      background: '#fff',
      padding: 16,
      borderRadius: 12,
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
    
    kpiCenter: {
      textAlign: 'center',
      marginTop: 20,
    },
    
    kpiValue: {
      fontSize: 22,
      fontWeight: 700,
    },
    
    kpiLabel: {
      fontSize: 12,
      opacity: 0.7,
    },
    
    mapBox: {
      height: 320,
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    
    legend: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 10,
      fontSize: 12,
    },
    
    footer: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      background: '#ecfdf5',
      borderRadius: 10,
    },
    
    link: {
      marginLeft: 'auto',
      color: '#16a34a',
      textDecoration: 'underline',
      fontWeight: 600,
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

      legendBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 11,
        lineHeight: 1.3,
      },

      legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
      },
      
      legendLine: {
        width: 20,
        height: 0,
        borderTop: '3px solid',
        borderRadius: 2,
      },

      mapLegend: {
        marginTop: 10,
        paddingTop: 8,
      },
      
      mapLegendTitle: {
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 10,
        color: '#374151',
      },
      
      mapLegendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 11,
        marginBottom: 8,
        color: '#374151',
      },
      
      mapLegendColor: {
        width: 18,
        height: 18,
        borderRadius: 2,
        flexShrink: 0,
      },
    };
