import React, { useEffect, useState } from 'react';
import { CalendarDays, RotateCcw, CheckCircle, ListChecks, Clock, Building,  Briefcase, TrendingUp, TrendingDown, Leaf, ShieldCheck, Mountain, BriefcaseBusiness, XCircle, Building2, Info, TreePine, Users, Trees, MapPin,
} from 'lucide-react';

import { ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface CoutActivite {
  Année:number;
  Mois:string;
  UC:string;      
  [key:string]: any;
      }

  

const composantesConfig = [
  { code: "C1", icon: Leaf, title: "Gestion des services écosystémiques" },
  { code: "C2", icon: Building, title: "Gouvernance environnementale" },
  { code: "C3", icon: Map, title: "Développement des paysages" },
  { code: "C4", icon: Briefcase, title: "Création d'emplois verts" },
];

const ordreMois = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre"
];

export default function SuiviActivitesAnnuelles() {

  const [data,setData] = useState<CoutActivite[]>([]);
  const [annee,setAnnee] = useState<number>(2026);
  const [mois,setMois] = useState<string>("Tous");
  const [uc,setUc] = useState<string>("Tous");

  const getProgressColor = (value: number) => {
    if (value <= 25) return '#ef4444';
    if (value <= 50) return '#facc15';
    if (value <= 75) return '#22c55e';
    return '#2563eb';
};

  useEffect(() => {
    fetch("/data/Base_Cout_Activite.geojson")
      .then(res => {
        if (!res.ok) {
          throw new Error("Base_Cout_Activite.geojson introuvable");
        }  
        return res.json();
      })
      .then(json => {  
        const table = json.features.map((f:any)=>f.properties);  
        setData(table);  
      })
      .catch(err => {
        console.error("Erreur chargement Base Cout :", err);
      });  
  }, []);

  const annees = Array.from(
    new Set(
    data.map(d=>d.Année)
    )
    ).sort();

  const moisListe = ordreMois.filter(m =>
      data.some(d => d.Mois === m)
    );

  const ucListe = Array.from(
    new Set(
    data.map(d=>d.UC)
     )
    );

 
  const dataFiltre = data.filter((d)=>{
      const filtreAnnee = d.Année === annee;    
      const filtreMois = mois === "Tous" || d.Mois === mois;    
      const filtreUC = uc === "Tous" || d.UC === uc;   
    
      return filtreAnnee && filtreMois && filtreUC;    
  });

  const coutActuel = dataFiltre[0] ?? {};

  const totalActivites = Number(coutActuel["NAP"] || 0);
  const activitesAchevees = Number(coutActuel["NAA"] || 0);
  const activitesEnCours = Number(coutActuel["NAC"] || 0);
  const activitesNonDemarrees = Number(coutActuel["NAD"] || 0);

  const tauxGlobalActivites = Number(coutActuel["TAG"] || 0) * 100;


  const globalPie = [
      { value: tauxGlobalActivites },
      { value: 100 - tauxGlobalActivites },
    ];


  const results = [
      {
        label: "R1. SYSTÈME DE GESTION",
        percent: Number(coutActuel["TAR 1"] || 0) * 100,
      },
      {
        label: "R2. AMÉNAGEMENT DU TERRITOIRE",
        percent: Number(coutActuel["TAR 2"] || 0) * 100,
      },
    ].map(item => ({
      ...item,
      color: getProgressColor(item.percent),
    }));

  const clamp = (minPx, vw, maxPx) =>
  `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`;

  const isMobile =
  typeof window !== 'undefined' && window.innerWidth < 900;

  const composantes = [
    {
      label: "C1. GESTION DES SERVICES ÉCOSYSTÉMIQUES",
      percent: Number(coutActuel["TAA 1.1.1"] || 0) * 100,
      icon: Leaf,
    },
  
    {
      label: "C2. GOUVERNANCE ENVIRONNEMENTALE DÉCENTRALISÉE",
      percent: Number(coutActuel["TAA 1.1.2"] || 0) * 100,
      icon: ShieldCheck,
    },
  
    {
      label: "C3. DÉVELOPPEMENT DES PAYSAGES PRODUCTIFS",
      percent: Number(coutActuel["TAA 1.1.3"] || 0) * 100,
      icon: Mountain,
    },
  
    {
      label: "C4. CRÉATION D’EMPLOIS VERTS",
      percent: Number(coutActuel["TAA 1.1.4"] || 0) * 100,
      icon: BriefcaseBusiness,
    },
  
  ].map(item => ({
    ...item,
    percent: Number(item.percent.toFixed(1)),
    color: getProgressColor(item.percent)
  }));

  const axes1 = {
    title: "AXES PRIORITAIRES DE LA RÉALISATION 1 : SYSTÈME DE GESTION",
    icon: Users,
  
    data: [
      {
        code: "1.1.1",
        name: "Analyses diagnostiques",
        value: Number(coutActuel["TAA 1.1.1"] || 0) * 100,
      },
      {
        code: "1.1.2",
        name: "Planification territoriale",
        value: Number(coutActuel["TAA 1.1.2"] || 0) * 100,
      },
      {
        code: "1.1.3",
        name: "Suivi écosystémique",
        value: Number(coutActuel["TAA 1.1.3"] || 0) * 100,
      },
      {
        code: "1.1.4",
        name: "Financement durable",
        value: Number(coutActuel["TAA 1.1.4"] || 0) * 100,
      },
      {
        code: "1.2.1",
        name: "Participation des populations",
        value: Number(coutActuel["TAA 1.2.1"] || 0) * 100,
      },
      {
        code: "1.2.2",
        name: "Coopération avec MNP",
        value: Number(coutActuel["TAA 1.2.2"] || 0) * 100,
      },
      {
        code: "1.2.3",
        name: "Coordination intersectorielle",
        value: Number(coutActuel["TAA 1.2.3"] || 0) * 100,
      },
      {
        code: "1.2.4",
        name: "Lutte contre la corruption",
        value: Number(coutActuel["TAA 1.2.4"] || 0) * 100,
      },
    ],
  };
  const axes2 = {
    title: "AXES PRIORITAIRES DE LA RÉALISATION 2 : AMÉNAGEMENT DU TERRITOIRE",
    icon: Trees,
  
    data: [
      {
        code: "2.1.1",
        name: "Restauration paysages",
        value: Number(coutActuel["TAA 2.1.1"] || 0) * 100,
      },
      {
        code: "2.1.2",
        name: "Production durable",
        value: Number(coutActuel["TAA 2.1.2"] || 0) * 100,
      },
      {
        code: "2.1.3",
        name: "Sécurisation foncière",
        value: Number(coutActuel["TAA 2.1.3"] || 0) * 100,
      },
      {
        code: "2.1.4",
        name: "Gestion des feux",
        value: Number(coutActuel["TAA 2.1.4"] || 0) * 100,
      },
      {
        code: "2.2.1",
        name: "Système de marché",
        value: Number(coutActuel["TAA 2.2.1"] || 0) * 100,
      },
      {
        code: "2.2.2",
        name: "Valorisation des productions",
        value: Number(coutActuel["TAA 2.2.2"] || 0) * 100,
      },
      {
        code: "2.2.3",
        name: "Diversification des activités",
        value: Number(coutActuel["TAA 2.2.3"] || 0) * 100,
      },
      {
        code: "2.2.4",
        name: "Mobilisation communautaire",
        value: Number(coutActuel["TAA 2.2.4"] || 0) * 100,
      },
    ],
  };

    const Axis1Icon = axes1.icon;
    const Axis2Icon = axes2.icon;

   
  
  const couleurActivites = getProgressColor(tauxGlobalActivites);

    console.log(data);
    console.log(annees);
    console.log(moisListe);
    console.log(ucListe);

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

            <select
              style={styles.bigSelect}
              value={annee}
              onChange={(e)=>setAnnee(Number(e.target.value))}
            >
              {
              annees.map(a=>
              <option key={a} value={a}>
              {a}
              </option>
              )
              }
            </select>

            <div style={styles.filterSub}>2025 - 2030</div>
          </div>
        </div>

        {/* MOIS */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <CalendarDays size={28} color="#16a34a" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.filterLabel}>MOIS</div>

            <select
              style={styles.bigSelect}
              value={mois}
              onChange={(e)=>setMois(e.target.value)}
            >
              <option value="Tous">
                Tous
              </option>
                {
                moisListe.map(m=>
                <option key={m}>
                {m}
              </option>
              )
              }
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

            <select
                style={styles.bigSelect}
                value={uc}
                onChange={(e)=>setUc(e.target.value)}
              >
              {
              ucListe.map(u=>
              <option key={u}>
              {u}
              </option>
              )
              }
            </select>

            <div style={styles.filterSub}>
              DIANA, BOENY, ANTANANARIVO, FORT-DAUPHIN...
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
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    >
                    <Cell fill={couleurActivites}/>
                    <Cell fill="#e5e7eb" />
                </Pie>
                </PieChart>
              </ResponsiveContainer>

              </div>

              <div
                style={{
                  ...styles.donutCenter,
                  color: couleurActivites,
                }}
              >
                {tauxGlobalActivites.toFixed(1)}%
              </div>
            </div>

            {/* KPIs */}
            <div style={styles.kpiList}>
                <div style={styles.kpiItem}>
                    <ListChecks size={20} color="#16a34a" />

                    <span style={styles.kpiLabel}>
                        Total activités planifiées
                    </span>

                    <span style={styles.kpiValue}>
                      {totalActivites}
                    </span>
                </div>

                    <div style={styles.kpiItem}>
                        <CheckCircle size={20} color="#16a34a" />
                            <span style={styles.kpiLabel}>
                                Activités achevées
                            </span>

                            <span style={styles.kpiValue}>
                              {activitesAchevees}
                            </span>
                    </div>

                    <div style={styles.kpiItem}>
                        <Clock size={20} color="#16a34a" />
                        <span style={styles.kpiLabel}>
                            Activités en cours
                        </span>

                        <span style={styles.kpiValue}>
                          {activitesEnCours}
                        </span>
                    </div>

                    <div style={styles.kpiItem}>
                      <XCircle size={20} color="#16a34a" />
                        <span style={styles.kpiLabel}>
                            Activités non démarrées
                        </span>

                        <span style={styles.kpiValue}>
                            {activitesNonDemarrees}
                        </span>
                    </div>
                </div>
            </div>
        </div>

            {/* RESULTS */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    TAUX D’AVANCEMENT PAR REALISATION
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
                        {r.percent.toFixed(1)}%
                      </div>
                    </div>          
                  </div>
                </div>
              ))}
            </div>
        </div>
        <div style={styles.card}>

    <div style={styles.cardHeader}>
        TAUX D’AVANCEMENT PAR COMPOSANTE
    </div>

    <div style={styles.gridComposantes}>
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
                            innerRadius={20}
                            outerRadius={34}
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
                    </div>           
              </div>
            );
        })}            
          </div>
        </div>
        </div>

      {/* ================= TABLEAU AXES ================= */}
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
                  {a.code}
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
                  {a.value.toFixed(1).replace(".", ",")}%
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
            {a.code}
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
          {a.value.toFixed(1).replace(".", ",")}%
          </div>

        </div>

      </div>
    ))}
  </div>
</div>

      </div>
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

        {/* RIGHT : CTA */}
        <div style={styles.footerCTA}>
          <div style={styles.ctaIcon}>
            📄
          </div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 10 }}>
            ACCÉDER AU SUIVI DES ACTIVITES ANNUELLES DE L’ANNÉE CHOISI
          </div>
          <div style={{ fontSize: 9, opacity: 0.8 }}>
            Consultez le détail des activités
          </div>
        </div>

        <button style={styles.ctaButton}>
          Accéder au suivi des activités 2025 ↗
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
    display:'grid',
    gridTemplateColumns:'1.2fr 1fr 1.7fr',
    gap:2,
    alignItems: 'stretch',
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  donutBox: {
    position: 'relative',
    width: 180,
    height: 180,
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
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 8,
    width: '100%',
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

  smallCard:{
    background:'#fff',
    border:'1px solid #e5e7eb',
    borderRadius:10,
    padding:'8px 6px',
    display:'flex',
    flexDirection:'column',
    alignItems:'center',
    justifyContent:'center',
    textAlign:'center',
},

donutSmall:{
  width:70,
  height:70,
  position:'relative',
  margin:'8px auto',
},

centerSmall: {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontWeight: 900,
  fontSize: 10,
  lineHeight: 1,
},

  doneText: {
    fontSize: 10,
    marginTop: 6,
    color: '#64748b',
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(500px,1fr))',
    gap: 2,
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
    minHeight: 60,
    padding: '6px 10px',
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
    display: 'flex',
    gridTemplateColumns: '1fr',
    flexDirection: 'column',
    gap: 'clamp(6px, 1vw, 6px)',
    alignItems: 'center',
    marginTop: 15,
    overflow: 'hidden',
  },

  resultBlock: {
    width: '100%',
    maxWidth: 380,
    margin: '0 auto',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 10,
  
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  
    boxSizing: 'border-box',
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 1,
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    margin: '0 auto',
  },

  rechartsWrapper: {
    width: '100%',
    height: '100%',
  },

  kpiItem: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
  },

  compHeader:{
    display:'flex',
    flexDirection:'column',
    alignItems:'center',
    gap:6,
    textAlign:'center',
    fontSize:10,
    fontWeight:700,
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
    gridTemplateColumns: '1fr 1fr',
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

  gridComposantes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: 4,
    marginTop: 10,
  },
  
};
