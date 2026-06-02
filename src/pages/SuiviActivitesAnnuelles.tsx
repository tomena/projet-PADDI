import React from 'react';
import {
  CalendarDays,
  RotateCcw,
  CheckCircle,
  ListChecks,
  Clock,
  TrendingUp,
  TrendingDown,
  Leaf,
  ShieldCheck,
  Mountain,
  BriefcaseBusiness,
  XCircle,
  Building2,
  Info,
  TreePine,
  Users,
  Trees, 
  MapPin,
} from 'lucide-react';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function SuiviActivitesAnnuelles() {

  const clamp = (minPx, vw, maxPx) =>
  `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`;

  const isMobile =
  typeof window !== 'undefined' && window.innerWidth < 900;

  const globalPie = [
    { value: 62 },
    { value: 38 },
  ];

  const results = [
    { label: 'R1. SYSTEME DE GESTION', percent: 68,done: 72,total: 106,color: '#2563eb', },
    { label: 'R2. AMENAGEMENT DU TERRITOIRE', percent: 47, done: 37,total: 70,color: '#f59e0b', },
  ];

  const composantes = [
    {
      label: 'C1. GESTION DES SERVICES ÉCOSYSTÉMIQUES',
      percent: 81,
      done: 46,
      total: 57,
      color: '#2563eb',
      icon: Leaf,
      trend: '+12%',
      up: true,
    },
  
    {
      label: 'C2. GOUVERNANCE ENVIRONNEMENTALE DÉCENTRALISÉE',
      percent: 63,
      done: 38,
      total: 60,
      color: '#16a34a',
      icon: ShieldCheck,
      trend: '+6%',
      up: true,
    },
  
    {
      label: 'C3. DÉVELOPPEMENT DES PAYSAGES PRODUCTIFS',
      percent: 48,
      done: 28,
      total: 58,
      color: '#f59e0b',
      icon: Mountain,
      trend: '-4%',
      up: false,
    },
  
    {
      label: 'C4. CRÉATION D’EMPLOIS VERTS',
      percent: 23,
      done: 16,
      total: 70,
      color: '#f97316',
      icon: BriefcaseBusiness,
      trend: '-7%',
      up: false,
    },
  ];

  const axes1 = {
    title: 'AXES PRIORITAIRES 1 : SYSTÈME DE GESTION ET GOUVERNANCE',
    icon: Users,
    data:[
        { name: 'Analyses diagnostiques', value: 82, color: '#2563eb' },
        { name: 'Planification territoriale', value: 65, color: '#16a34a' },
        { name: 'Suivi écosystémique', value: 42, color: '#f59e0b' },
        { name: 'Financement durable', value: 55, color: '#16a34a' },
        { name: 'Participation des populations', value: 76, color: '#2563eb' },
        { name: 'Coopération avec MNP', value: 60, color: '#16a34a' },
        { name: 'Coordination intersectorielle', value: 40, color: '#f59e0b' },
        { name: 'Lutte contre la corruption', value: 20, color: '#f97316' },
    ]
    
};
  const axes2 = {
    title: 'AXES PRIORITAIRES 2 : AMÉNAGEMENT DU TERRITOIRE',
    icon: Trees,
    data:[
        { name: 'Restauration paysages', value: 78, color: '#16a34a' },
        { name: 'Production durable', value: 58, color: '#2563eb' },
        { name: 'Sécurisation foncière', value: 45, color: '#f59e0b' },
        { name: 'Gestion des feux', value: 22, color: '#f97316' },
        { name: 'Valorisation des productions', value: 60, color: '#16a34a' },
        { name: 'Diversification des activités', value: 48, color: '#f59e0b' },
        { name: 'Mobilisation communautaire', value: 66, color: '#16a34a' },
        { name: 'Système de marché', value: 25, color: '#f97316' },
    ]
    };

    const Axis1Icon = axes1.icon;
    const Axis2Icon = axes2.icon;

    const getProgressColor = (value) => {
        if (value <= 25) return '#ef4444'; // rouge
        if (value <= 50) return '#facc15'; // jaune
        if (value <= 75) return '#22c55e'; // vert
        return '#2563eb'; // bleu
      };

  return (
    <div style={styles.page}>

      {/* ================= HEADER ================= */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            SUIVI DES ACTIVITÉS ANNUELLES
          </div>
          <div style={styles.subtitle}>
            Plan Stratégique 2024 – 2030
          </div>
        </div>

        <div style={styles.dateBox}>
          <CalendarDays size={18} />
          <div>
            <div style={styles.dateLabel}>Données mises à jour</div>
            <div style={styles.dateValue}>25 mai 2024</div>
          </div>
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div style={styles.filtersContainer}>
        {/* ANNÉE */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <CalendarDays size={28} color="#16a34a" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.filterLabel}>ANNÉE</div>

            <select style={styles.bigSelect}>
              <option>Tous</option>
              <option>2024</option>
              <option>2025</option>
              <option>2026</option>
              <option>2027</option>
              <option>2028</option>
              <option>2029</option>
              <option>2030</option>
            </select>

            <div style={styles.filterSub}>2024 - 2030</div>
          </div>
        </div>

        {/* MOIS */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <CalendarDays size={28} color="#16a34a" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.filterLabel}>MOIS</div>

            <select style={styles.bigSelect}>
              <option>Tous</option>
              <option>Janvier</option>
              <option>Février</option>
              <option>Mars</option>
              <option>Avril</option>
              <option>Mai</option>
              <option>Juin</option>
              <option>Juillet</option>
              <option>Août</option>
              <option>Septembre</option>
              <option>Octobre</option>
              <option>Novembre</option>
              <option>Decembre</option>
            </select>

            <div style={styles.filterSub}>Janvier - Décembre</div>
          </div>
        </div>

        {/* UNITÉ */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <Building2 size={28} color="#16a34a" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.filterLabel}>UNITÉ DE COORDINATION</div>

            <select style={styles.bigSelect}>
              <option>Tous</option>
              <option>Antananarivo</option>
              <option>Ambositra</option>
              <option>Mahajanga</option>
              <option>Diego</option>
              <option>Fort-Dauphin</option>
              <option>Farafangana</option>
            </select>

            <div style={styles.filterSub}>
              Ambositra, Mahajanga, Antananarivo, Fort-Dauphin...
            </div>
          </div>
        </div>

        {/* RESET */}
        <div style={styles.resetContainer}>
          <button style={styles.resetBigBtn}>
            <RotateCcw size={20} />
            <span style={{ textAlign: 'center' }}>
              Réinitialiser les filtres
            </span>
          </button>
        </div>
      </div>

      {/* ================= TOP CARDS ================= */}
      <div style={styles.gridTop}>

        {/* GLOBAL */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            TAUX D’AVANCEMENT GLOBAL DES ACTIVITÉS
          </div>

          <div style={styles.globalWrap}>

            {/* DONUT */}
            <div style={styles.donutBox}>
            <div style={styles.rechartsWrapper}>
              <ResponsiveContainer>
                <PieChart>
                <Pie
                    data={globalPie}
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    >
                    <Cell fill="#16a34a" />
                    <Cell fill="#e5e7eb" />
                </Pie>
                </PieChart>
              </ResponsiveContainer>

              </div>

              <div style={styles.donutCenter}>62%</div>
            </div>

            {/* KPIs */}
            <div style={styles.kpiList}>
                <div style={styles.kpiItem}>
                    <ListChecks size={20} color="#16a34a" />

                    <span style={styles.kpiLabel}>
                        Total activités planifiées
                    </span>

                    <span style={styles.kpiValue}>
                        176
                    </span>
                </div>

                <div style={styles.kpiItem}>
                    <CheckCircle size={20} color="#16a34a" />
                        <span style={styles.kpiLabel}>
                            Activités achevées
                        </span>

                        <span style={styles.kpiValue}>
                            109
                        </span>
                </div>

                <div style={styles.kpiItem}>
                    <Clock size={20} color="#16a34a" />
                    <span style={styles.kpiLabel}>
                            Activités en cours
                        </span>

                        <span style={styles.kpiValue}>
                            51
                        </span>
                    </div>

                <div style={styles.kpiItem}>
                    <XCircle size={20} color="#16a34a" />
                    <span style={styles.kpiLabel}>
                            Activités non démarrées
                        </span>

                        <span style={styles.kpiValue}>
                            16
                        </span>
                    </div>
                </div>

            </div>
        </div>

       {/* RESULTS */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    TAUX D’AVANCEMENT PAR RÉSULTAT
                </div>
                <div style={styles.resultsColumn}>

          {results.map((r, i) => (
            <div key={i} style={styles.resultBlock}>

                <div
                style={{
                    ...styles.resultTitle,
                    color: '#111827',
                }}
                >
                {r.label}
                </div>

              <div style={styles.resultGrid}>
  
            {/* LEFT: DONUT */}
            <div style={styles.resultDonutBox}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: r.percent },
                      { value: 100 - r.percent },
                    ]}
                    innerRadius={30}   
                    outerRadius={55}   
                    dataKey="value"
                  >
                    <Cell fill={r.color} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div
                style={{
                  ...styles.donutText,
                  color: r.color,
                  fontSize: 18, // 🔥 plus visible
                }}
              >
                {r.percent}%
              </div>
            </div>

          {/* RIGHT: INFOS */}
          <div style={styles.resultInfoBox}>
            
          <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: r.percent >= 50 ? '#16a34a' : '#ef4444',
                    fontWeight: 800,
                }}
                >
                {r.percent >= 50 ? (
                    <TrendingUp size={28} />
                ) : (
                    <TrendingDown size={28} />
                )}

                <span style={{ fontSize: 16 }}>
                    {r.percent >= 50 ? '+8%' : '-5%'}
                </span>
            </div>

            <div style={{ fontSize: clamp(10, 0.8, 11), color: '#64748b' }}>
              vs mois précédent
            </div>

            <div style={styles.resultFooter}>
                Activités achevées{' '}
                <span
                    style={{
                    color: r.color,
                    fontWeight: 900,
                    fontSize: 12,
                    }}
                >
                    {r.done}
                </span>
                {' / '}
                {r.total}
                </div>
            </div>
            </div>
            </div>
          ))}
      </div>            
    </div>
  </div>

      {/* ================= COMPOSANTES ================= */}
      <div style={styles.sectionTitle}>TAUX D’AVANCEMENT PAR COMPOSANTE</div>
      
      <div style={styles.grid4}>
        {composantes.map((c, i) => {
            const Icon = c.icon;

            return (
              <div key={i} style={styles.smallCard}>

                <div style={styles.compHeader}>

                    <div style={styles.compIcon}>
                    <Icon size={18} color="#16a34a" />
                    </div>

                    <span style={{ color: '#111827' }}>
                    {c.label}
                    </span>

                </div>
                <div style={styles.compContent}>

                    {/* DONUT A GAUCHE */}
                    <div style={styles.donutSmall}>
                    <ResponsiveContainer>
                        <PieChart>
                        <Pie
                            data={[
                            { value: c.percent },
                            { value: 100 - c.percent },
                            ]}
                            innerRadius={24}
                            outerRadius={38}
                            dataKey="value"
                        >
                            <Cell fill={c.color} />
                            <Cell fill="#e5e7eb" />
                        </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <div
                        style={{
                        ...styles.centerSmall,
                        color: c.color,
                        }}
                    >
                        {c.percent}%
                    </div>
                    </div>

                    {/* INFOS A DROITE */}
                    <div style={styles.compInfo}>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 800,
                            fontSize: 13,
                            color: '#111827', // 🔥 tout en noir
                        }}
                        >
                        {c.up ? (
                            <TrendingUp size={18} color="#16a34a" />
                        ) : (
                            <TrendingDown size={18} color="#ef4444" />
                        )}

                        <span>
                            {c.trend}
                        </span>
                        </div>

                    <div
                        style={{
                        fontSize: 11,
                        color: '#64748b',
                        }}
                    >
                        vs mois précédent
                    </div>

                    <div
                        style={{
                          fontSize: 11,
                        fontWeight: 600,
                        color: '#64748b',
                        }}
                    >
                        Activités achevées{' '}
                        <span
                        style={{
                            color: c.color,
                            fontWeight: 900,
                            fontSize:11,
                        }}
                        >
                        {c.done}
                        </span>
                        {' / '}
                        {c.total}
                    </div>

                    </div>

                    </div>           
              </div>
            );
        })}
        </div>   

      {/* ================= AXES ================= */}
      <div style={styles.grid2}>

            {/* AXE 1 */}
            <div style={styles.card}>

              <div style={styles.axisHeader}>
                <div style={styles.axisHeaderLeft}>
                  <Axis1Icon size={18} color="#fff" />
                  <span>{axes1.title}</span>
                </div>

              </div>

          {/* HEADER TABLE */}
          <div style={styles.axisTableHeader}>
            <div>AXE PRIORITAIRE</div>
            <div>TAUX D'AVANCEMENT</div>
          </div>

          <div style={styles.axisBox}>
            {axes1.data.map((a, i) => (
              <div key={i} style={styles.axisTableRow}>

                {/* COLONNE 1 */}
                <div style={styles.axisLeftCol}>
                  <span style={styles.axisCode}>
                  {
                    i < 4
                      ? `1.1.${i + 1}`
                      : `1.2.${i - 3}`
                  }
                  </span>

                  <span style={styles.axisName}>
                    {a.name}
                  </span>
                </div>

                {/* COLONNE 2 */}
                <div style={styles.axisRightCol}>

                  {/* BAR */}
                  <div style={styles.axisBar}>
                    <div
                      style={{
                        ...styles.axisFill,
                        width: `${a.value}%`,
                        background: getProgressColor(a.value),
                      }}
                    />
                  </div>

                  {/* % */}
                  <div style={styles.axisPercent}>
                    {a.value}%
                  </div>

                </div>

              </div>
            ))}
          </div>
        </div>

        {/* AXE 2 */}
        <div style={styles.card}>
              <div style={styles.axisHeader}>
                <div style={styles.axisHeaderLeft}>
                  <Axis2Icon size={18} color="#fff" />
                  <span>{axes2.title}</span>
                </div>
              </div>

          <div style={styles.axisTableHeader}>
            <div>AXE PRIORITAIRE</div>
            <div>TAUX D'AVANCEMENT</div>
          </div>

          <div style={styles.axisBox}>
            {axes2.data.map((a, i) => (
              <div key={i} style={styles.axisTableRow}>

        <div style={styles.axisLeftCol}>
          <span style={styles.axisCode}>
          {
            i < 4
              ? `2.1.${i + 1}`
              : `2.2.${i - 3}`
          }
          </span>

          <span style={styles.axisName}>
            {a.name}
          </span>
        </div>

        <div style={styles.axisRightCol}>

          <div style={styles.axisBar}>
            <div
              style={{
                ...styles.axisFill,
                width: `${a.value}%`,
                background: getProgressColor(a.value),
              }}
            />
          </div>

          <div style={styles.axisPercent}>
            {a.value}%
          </div>

        </div>

      </div>
    ))}
  </div>
</div>

      </div>

      {/* ================= FOOTER ================= */}
      {/* ================= FOOTER LEGEND ================= */}
      
      <div style={styles.footer}>

      <div style={styles.footerHeader}>
        LEGENDE (TAUX D'AVANCEMENT)
      </div>
  
      {/* LEFT : LEGEND */}
        <div style={styles.footerLegend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#ef4444' }} />
            0 à 25%
          </div>

          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#f59e0b' }} />
            25% à 50%
          </div>

          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#22c55e' }} />
            50% à 75%
          </div>

          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#2563eb' }} />
            75% à 100%
          </div>
        </div>

        {/* CENTER : INFO TEXT */}
        <div style={styles.footerInfo}>
          <Info size={16} color="#16a34a" />
          <span>
            Le taux d’avancement des coûts est calculé par rapport à la planification annuelle de l’année sélectionnée.
          </span>
        </div>

        {/* RIGHT : CTA */}
        <div style={styles.footerCTA}>
          <div style={styles.ctaIcon}>
            📄
          </div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 10 }}>
            ACCÉDER AU SUIVI DES COÛTS DE L’ANNÉE 2025
          </div>
          <div style={{ fontSize: 9, opacity: 0.8 }}>
            Consultez le détail des coûts, engagements et décaissements
          </div>
        </div>

        <button style={styles.ctaButton}>
          Accéder au suivi des coûts 2025 ↗
        </button>
      </div>
    </div>

    </div>
  );
}

const typography = {
  h1: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  h2: {
    fontSize: 14,
    fontWeight: 700,
  },
  body: {
    fontSize: 12,
    fontWeight: 400,
  },
};
/* ================= STYLES ================= */

const styles: any = {

  page: {
    padding: 'clamp(8px, 2vw, 16px)',
    background: 'none',
    fontFamily: 'Inter',
    width: '100%',
    boxSizing: 'border-box',
  },

  header: {
    background: 'linear-gradient(135deg,#0f6b3a,#16a34a)',
    color: '#fff',
    padding: 14,
    borderRadius: 12,
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: 400,
    opacity: 0.9,
  },

  dateBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  dateLabel: { 
    fontSize: 10, 
    opacity: 0.8 
  },

  dateValue: { 
    fontWeight: 700 
  },

  gridTop: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 2fr)',
    gap: 10,
    marginTop: 7,
  
    // responsive mobile
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },

  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 10,
    border: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },

  cardHeader: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    marginBottom: 0,
    paddingBottom: 4,
    color: '#16a34a',
    textAlign: 'center',
    borderBottom: '1px solid #f1f5f9',
  },

  globalWrap: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    alignItems: 'center',
    gap: 12,
    height: '100%',
  },

  donutBox: {
    position: 'relative',
    width: 110,
    height: 110,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    fontSize: 20,
    fontWeight: 900,
    color: '#16a34a',
  },
  
  kpiList: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 6,
    fontSize: 'clamp(10, 0.8, 14)',
  },

  resultLabel: { 
    fontSize: 11, 
    fontWeight: 700, 
  },

  resultSub: { 
    fontSize: 10, 
    color: '#64748b',
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.4px',
    color: '#16a34a',
    textTransform: 'uppercase',
  },

  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 10,
    marginTop: 8,
  },

  smallCard: {
    background: '#fff',
    borderRadius: 14,
    padding: 12,
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },

  donutSmall: {
    width: 80,
    height: 80,
    margin: 'auto',
    position: 'relative',
  },

  centerSmall: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    fontWeight: 900,
  },

  doneText: {
    fontSize: 10,
    marginTop: 6,
    color: '#64748b',
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(500px,1fr))',
    gap: 12,
    marginTop: 14,
    alignItems: 'start',
  },

  axisBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  axisRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    fontWeight: 600,
  },

  filtersContainer: {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    borderRadius: 10,
    padding: '6px 8px',
    border: '1px solid #dbe4f0',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 6,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 10,
  },

  bigFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRight: '1px solid #e5e7eb',
    minWidth: 0,  
    flexWrap: 'wrap', // 🔥 important
  },

  
  filterIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#16a34a',
    letterSpacing: '0.3px',
    marginBottom: 2,
  },

  bigSelect: {
    width: '100%',
    maxWidth: '100%',   // 🔥 important
    minWidth: 0,
    height: 30,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    padding: '0 8px',
    fontSize: 'clamp(10px, 1vw, 14px)',
    fontWeight: 600,
    background: '#fff',
    outline: 'none',
  },

  filterSub: {
    marginTop: 6,
    fontSize: 11,
    color: '#6b7280',
    whiteSpace: 'normal', // 🔥 important
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.2,
  },

  resetContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: 100,
  },

  resetBigBtn: {
    width: '100%',
    minHeight: 60,        // au lieu de height fixe
    padding: '6px 10px',  // plus compact
    borderRadius: 8,
    border: '1.2px solid #bfdbfe',
    background: '#fff',
    color: '#16a34a',
    fontWeight: 700,
    fontSize: 'clamp(11px, 1vw, 14px)',
    cursor: 'pointer',  
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,  
    lineHeight: 1.1,
    textAlign: 'center',
  },

  resultsColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 'clamp(6px, 1vw, 12px)',
    marginTop: 10,
  },

  resultBlock: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 2,
    background: '#fff',  
    flex: '1 1 320px', // 🔥 clé du responsive
    minWidth: 280,     // empêche les cartes trop petites
    maxWidth: '100%',  
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  
  resultTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: '#16a34a',
    textAlign: 'center',
    marginBottom: 0,
  },
    
  donutText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    fontSize: 20,
    fontWeight: 900,
  },
  
  resultFooter: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 500,
    lineHeight: 1.3,
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr', // 🔥 donut plus large
    alignItems: 'center',
    gap: 30,
  },

  resultInfoBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 6,
  },

  resultDonutBox: {
    width: 120,
    height: 120,
    position: 'relative',  
    aspectRatio: '1 / 1', // 🔥 clé moderne
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  rechartsWrapper: {
    width: '100%',
    height: '100%',
  },

  kpiItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#111827',
    fontWeight: 600,
  },

  compHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontWeight: 700,
    color: '#16a34a',
  },

  compContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 2,
  },

  compInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    textAlign: 'left',
    gap: 4,
  },

  compIcon: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'rgba(22, 163, 74, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  
  kpiLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: 400,
    color: '#111827',
  },
  
  kpiValue: {
    minWidth: 40,
    textAlign: 'right',
    fontWeight: 700,
    color: '#111827',
    fontSize: 13,
  },

  axisHeader: {
    background: '#16a34a',
    color: '#fff',
    padding: '8px 10px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  
  axisHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  axisTableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 10,
    fontSize: 11,
    fontWeight: 600,
    color: '#16a34a',
    padding: '6px 4px',
    borderBottom: '1px solid #e5e7eb',
  },
  
  axisTableRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(120px, 1fr) minmax(120px, 1fr)',
    gap: 'clamp(4px, 1vw, 10px)',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  
  axisLeftCol: {
    display: 'grid',
    gridTemplateColumns: '45px 1fr',
    gap: 4,
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
  },

  axisName: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.3,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  },
  
  axisCode: {
    fontWeight: 600,
    color: '#64748b',
    fontSize: 10,
  },
  
  axisRightCol: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 6,
    alignItems: 'center',
  },
  
  axisBar: {
    flex: 1,
    height: 10,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    marginLeft: -2,
  },
  
  axisFill: {
    height: '100%',
    borderRadius: 999,
  },
  
  axisPercent: {
    width: 40,
    paddingRight: 6,
    textAlign: 'right',
    fontWeight: 900,
    fontSize: 10,
  },

  legendBox: {
    marginTop: 16,
    background: '#fff',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    padding: 12,
  },
  
  legendItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11, // ou 11
    fontWeight: 800,
  },
  
  legendColor: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  typography: {
    h1: {
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: '0.5px',
    },
  
    h2: {
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '0.3px',
    },
  
    h3: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.2px',
    },
  
    body: {
      fontSize: 12,
      fontWeight: 400,
    },
  
    small: {
      fontSize: 11,
      fontWeight: 400,
      color: '#64748b',
    },
  },

  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 1.3fr',
    gap: 10,
    alignItems: 'start',
    background: '#ffffff',
    border: '1px solid #dbe4f0',
    borderRadius: 12,
    padding: '8px 12px 12px',
    marginTop: 8,
  },
  
  footerHeader: {
    gridColumn: '1 / -1',
    color: '#1d4ed8',
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  
  footerLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'center',
    paddingTop: 8,
  },
  
  footerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    paddingTop: 8,
  },
  
  footerCTA: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 10,
    padding: '8px 10px',
    marginTop: -2,
  },

  ctaButton: {
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  dot: {
    display: 'inline-block',
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
  },
  
};
