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
  MapPin,
} from 'lucide-react';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function SuiviActivitesAnnuelles() {

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
    icon: TreePine,
    data:[
        { name: 'Analyses diagnostiques', value: 82, color: '#2563eb' },
        { name: 'Planification territoriale', value: 65, color: '#16a34a' },
        { name: 'Suivi écosystémique', value: 42, color: '#f59e0b' },
        { name: 'Financement durable', value: 55, color: '#16a34a' },
        { name: 'Participation population', value: 76, color: '#2563eb' },
    ]
};
  const axes2 = {
    title: 'AXES PRIORITAIRES 2 : AMÉNAGEMENT DU TERRITOIRE',
    icon: MapPin,
    data:[
        { name: 'Restauration paysages', value: 78, color: '#16a34a' },
        { name: 'Production durable', value: 58, color: '#2563eb' },
        { name: 'Sécurisation foncière', value: 45, color: '#f59e0b' },
        { name: 'Gestion des feux', value: 22, color: '#f97316' },
    ]
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
            Réinitialiser
            <br />
            les filtres
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

            <div style={{ fontSize: 12, color: '#64748b' }}>
              vs mois précédent
            </div>

            <div style={styles.resultFooter}>
                Activités achevées{' '}
                <span
                    style={{
                    color: r.color,
                    fontWeight: 900,
                    fontSize: 13,
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
                            <TrendingUp size={16} color="#16a34a" />
                        ) : (
                            <TrendingDown size={16} color="#ef4444" />
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
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        }}
                    >
                        Activités achevées{' '}
                        <span
                        style={{
                            color: c.color,
                            fontWeight: 900,
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
                    <TreePine size={18} color="#fff" />
                    <span>AXES PRIORITAIRES 1 : SYSTÈME DE GESTION ET GOUVERNANCE</span>
                </div>
            </div>

          <div style={styles.axisBox}>
          {axes1.data.map((a, i) => (
              <div key={i}>
                <div style={styles.axisRow}>
                  <span>{a.name}</span>
                  <span style={{ color: a.color, fontWeight: 900 }}>{a.value}%</span>
                </div>

                <div style={styles.bar}>
                  <div style={{ ...styles.fill, width: `${a.value}%`, background: a.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AXE 2 */}
        <div style={styles.card}>
        <div style={styles.axisHeader}>
                <div style={styles.axisHeaderLeft}>
                    <MapPin size={18} color="#fff" />
                    <span>AXES PRIORITAIRES 2 : AMENAGEMENT DU TERRITOIRE</span>
                </div>
            </div>

          <div style={styles.axisBox}>
          {axes2.data.map((a, i) => (
              <div key={i}>
                <div style={styles.axisRow}>
                  <span>{a.name}</span>
                  <span style={{ color: a.color, fontWeight: 900 }}>{a.value}%</span>
                </div>

                <div style={styles.bar}>
                  <div style={{ ...styles.fill, width: `${a.value}%`, background: a.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ================= FOOTER ================= */}
      <div style={styles.footer}>
        <div>Total activités: 176</div>
        <div style={{ color: '#16a34a', fontWeight: 900 }}>Taux global: 62%</div>
        <div>Activités actives: 160</div>
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const styles: any = {

  page: {
    padding: 12,
    background: 'none',
    fontFamily: 'Inter',
    maxWidth: 1400,
    margin: '0 auto',
  },

  header: {
    background: 'linear-gradient(135deg,#0f6b3a,#16a34a)',
    color: '#fff',
    padding: 14,
    borderRadius: 12,
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },

  title: { 
    fontSize: 16, 
    fontWeight: 900 
  },

  subtitle: { 
    fontSize: 12, 
    opacity: 0.9 
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

  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 8,
    marginTop: 10,
  },

  select: {
    padding: 8,
    borderRadius: 8,
    border: '1px solid #ddd',
  },

  reset: {
    background: '#fff',
    border: '1px solid #16a34a',
    borderRadius: 8,
    fontWeight: 700,
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gridTop: {
    display: 'grid',
    gridTemplateColumns: '0.6fr 1.2fr',
    gap: 5,
    marginTop: 7,
  },

  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 10,
    border: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    maxHeight: 220,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },

  cardHeader: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 0,
    paddingBottom: 2,
    color: '#16a34a',
    textAlign: 'center',
    borderBottom: '1px solid #f1f5f9', // optionnel mais joli
  },

  cardHeaderGreen: {
    background: '#16a34a',
    color: '#fff',
    padding: 8,
    borderRadius: 8,
    fontWeight: 900,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
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

  globalInnerCard: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    background: '#f8fafc',
  },
  
  kpiList: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 6,
    fontSize: 12,
  },

  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 8,
    borderBottom: '1px solid #eee',
  },

  resultLabel: { 
    fontSize: 11, 
    fontWeight: 700 
  },

  resultSub: { 
    fontSize: 10, 
    color: '#64748b' 
  },

  percent: { 
    fontWeight: 900 
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: 900,
    color: '#16a34a',
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
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 14,
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
    gridTemplateColumns: '1fr 1fr 1.3fr 160px',
    gap: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },

  bigFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRight: '1px solid #e5e7eb',
    minWidth: 0,
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
    fontWeight: 800,
    color: '#16a34a',
    marginBottom: 2,
  },

  bigSelect: {
    width: '100%',
    height: 30,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    padding: '0 8px',
    fontSize: 12,
    fontWeight: 600,
    background: '#fff',
    outline: 'none',
  },

  filterSub: {
    marginTop: 6,
    fontSize: 11,
    color: '#6b7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  resetContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  resetBigBtn: {
    width: '100%',
    height: 60,
    borderRadius: 10,
    border: '2px solid #bfdbfe',
    background: '#fff',
    color: '#16a34a',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    lineHeight: 1.1,
  },

  bar: {
    width: '100%',
    height: 8,
    background: '#e5e7eb',
    borderRadius: 999,
    marginBottom: 6,
  },

  fill: {
    height: '100%',
    borderRadius: 999,
  },

  footer: {
    marginTop: 14,
    background: '#fff',
    padding: 12,
    borderRadius: 10,
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    fontSize: 12,
  },

  resultsColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 10,
    marginTop: 10,
  },
  
  resultCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
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
  
  resultMiddle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  donutWrap: {
    width: 100,
    height: 100,
    position: 'relative',
    flexShrink: 0,
    marginLeft: 0,
  },
  
  donutText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    fontSize: 20,
    fontWeight: 900,
  },
  
  evolutionBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  
  resultFooter: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 600,
  },

  resultRowMiddle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    fontSize: 13,
    color: '#111827',
  },
  
  kpiValue: {
    minWidth: 40,         
    textAlign: 'right',   
    fontWeight: 600,
    color: '#111827',
    fontSize: 13,
  },

  axisHeader: {
    background: '#16a34a',
    color: '#fff',
    padding: '8px 10px',
    borderRadius: 8,
    fontWeight: 900,
    fontSize: 11,
    marginBottom: 10,
  },
  
  axisHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }
};