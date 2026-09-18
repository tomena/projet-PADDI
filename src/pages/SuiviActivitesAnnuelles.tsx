import React, { useEffect, useState } from 'react';
import { useLanguage } from "../context/LanguageContext";
import { CalendarDays, RotateCcw, CheckCircle, ListChecks, Clock, Building,  Briefcase, TrendingUp, TrendingDown, Leaf, ShieldCheck, Mountain, BriefcaseBusiness, XCircle, Building2, Info, TreePine, Users, Trees, MapPin,
} from 'lucide-react';

import { ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';


const TEXT = {
  fr: {
    title: "SUIVI DES ACTIVITÉS ANNUELLES",
    subtitle: "Plan Stratégique 2024 – 2030",
    updated: "Données mises à jour",
    
    year: "ANNÉE",
    month: "MOIS",
    unit: "UNITÉ DE COORDINATION",
    all: "Tous",
    reset: "Réinitialiser les filtres",

    monthRange: "Janvier - Décembre",
    yearRange: "2025 - 2030",

    globalProgress: "TAUX D’AVANCEMENT GLOBAL DES ACTIVITÉS",
    totalPlanned: "Total activités planifiées",
    completed: "Activités achevées",
    ongoing: "Activités en cours",
    notStarted: "Activités non démarrées",

    byAchievement: "TAUX D’AVANCEMENT PAR RÉALISATION",
    byComponent: "TAUX D’AVANCEMENT PAR COMPOSANTE",

    result1: "R1. SYSTÈME DE GESTION",
    result2: "R2. AMÉNAGEMENT DU TERRITOIRE",

    componentC1: "C1. GESTION DES SERVICES ÉCOSYSTÉMIQUES",
    componentC2: "C2. GOUVERNANCE ENVIRONNEMENTALE DÉCENTRALISÉE",
    componentC3: "C3. DÉVELOPPEMENT DES PAYSAGES PRODUCTIFS",
    componentC4: "C4. CRÉATION D’EMPLOIS VERTS",

    axisPriority: "AXE PRIORITAIRE",
    progressRate: "TAUX D'AVANCEMENT",

    axis1Title: "AXES PRIORITAIRES DE LA RÉALISATION 1 : SYSTÈME DE GESTION",
    axis2Title: "AXES PRIORITAIRES DE LA RÉALISATION 2 : AMÉNAGEMENT DU TERRITOIRE",

    diagnostic: "Analyses diagnostiques",
    territorialPlanning: "Planification territoriale",
    ecosystemMonitoring: "Suivi écosystémique",
    sustainableFinancing: "Financement durable",
    populationParticipation: "Participation des populations",
    mnpCooperation: "Coopération avec MNP",
    intersectoralCoordination: "Coordination intersectorielle",
    antiCorruption: "Lutte contre la corruption",

    landscapeRestoration: "Restauration paysages",
    sustainableProduction: "Production durable",
    landSecurity: "Sécurisation foncière",
    fireManagement: "Gestion des feux",
    marketSystem: "Système de marché",
    productionValorization: "Valorisation des productions",
    activityDiversification: "Diversification des activités",
    communityMobilization: "Mobilisation communautaire",

    legend: "LÉGENDE (TAUX D'AVANCEMENT)",

    accessTitle: "ACCÉDER AU SUIVI DES ACTIVITÉS ANNUELLES DE L’ANNÉE CHOISIE",
    accessDesc: "Consultez le détail des activités",
    accessBtn: "Accéder au suivi des activités",

    months: {
      Janvier: "Janvier",
      Février: "Février",
      Mars: "Mars",
      Avril: "Avril",
      Mai: "Mai",
      Juin: "Juin",
      Juillet: "Juillet",
      Août: "Août",
      Septembre: "Septembre",
      Octobre: "Octobre",
      Novembre: "Novembre",
      Décembre: "Décembre",
    },

    range0_25: "0 à 25%",
    range25_50: "25% à 50%",
    range50_75: "50% à 75%",
    range75_100: "75% à 100%",
  },

  mg: {
    title: "FANARAHANA NY ASA ISAN-TAONA",
    subtitle: "Drafitra stratejika 2024 – 2030",
    updated: "Angon-drakitra nohavaozina",

    year: "TAONA",
    month: "VOLANA",
    unit: "SAMPANA MPANDRINDRA",
    all: "Rehetra",
    reset: "Avereno ny sivana",

    monthRange: "Janoary - Desambra",
    yearRange: "2025 - 2030",

    globalProgress: "TAHA-PANDROSOANA ANKAPOBENY NY ASA",
    totalPlanned: "Fitambaran'ny asa voalamina",
    completed: "Asa vita",
    ongoing: "Asa mbola mandeha",
    notStarted: "Asa mbola tsy natomboka",

    byAchievement: "TAHA-PANDROSOANA ISAKY NY ZAVA-BITA",
    byComponent: "TAHA-PANDROSOANA ISAKY NY SINGA",

    result1: "R1. RAFITRA FITANTANANA",
    result2: "R2. FANDAMINANA NY TONTOLON-TANY",

    componentC1: "C1. FITANTANANA NY SERIVISY ARA-TONTOLO IAINANA",
    componentC2: "C2. FITANTANANA NY TONTOLON'AINA IFOTONY",
    componentC3: "C3. FAMPANDROSOANA NY TONTOLON-TANY MPAMOKATRA",
    componentC4: "C4. FAMORONANA ASA MAITSO",

    axisPriority: "LAHARANA LAHARANA",
    progressRate: "TAHA-PANDROSOANA",

    axis1Title: "LAHARAM-PAHAMEHANA AMIN'NY ZAVA-BITA 1 : RAFITRA FITANTANANA",
    axis2Title: "LAHARAM-PAHAMEHANA AMIN'NY ZAVA-BITA 2 : FANDAMINANA NY TONTOLON-TANY",

    diagnostic: "Fanadihadiana diagnostika",
    territorialPlanning: "Fandaminana ny faritra",
    ecosystemMonitoring: "Fanaraha-maso ny tontolo iainana",
    sustainableFinancing: "Famatsiam-bola maharitra",
    populationParticipation: "Fandraisan'anjaran'ny mponina",
    mnpCooperation: "Fiaraha-miasa amin'ny MNP",
    intersectoralCoordination: "Fandrindrana eo amin'ny sehatra",
    antiCorruption: "Ady amin'ny kolikoly",

    landscapeRestoration: "Famerenana amin'ny laoniny ny tontolo-tany",
    sustainableProduction: "Famokarana maharitra",
    landSecurity: "Fiarovana ny fananan-tany",
    fireManagement: "Fitantanana ny doro-tanety",
    marketSystem: "Rafitra ara-barotra",
    productionValorization: "Fanomezana lanja ny vokatra",
    activityDiversification: "Fanamaroana ny asa",
    communityMobilization: "Fanentanana ny vondrom-piarahamonina",

    legend: "FANAZAVANA (TAHA-PANDROSOANA)",

    accessTitle: "HIDITRA AMIN'NY FANARAHANA NY ASA ISAN-TAONA VOAFIDY",
    accessDesc: "Jereo amin'ny antsipiriany ny asa",
    accessBtn: "Hiditra amin'ny fanaraha-maso ny asa",

    months: {
      Janvier: "Janoary",
      Février: "Febroary",
      Mars: "Martsa",
      Avril: "Aprily",
      Mai: "Mey",
      Juin: "Jona",
      Juillet: "Jolay",
      Août: "Aogositra",
      Septembre: "Septambra",
      Octobre: "Oktobra",
      Novembre: "Novambra",
      Décembre: "Desambra",
    },

    range0_25: "0 hatramin'ny 25%",
    range25_50: "25% hatramin'ny 50%",
    range50_75: "50% hatramin'ny 75%",
    range75_100: "75% hatramin'ny 100%",
  },

  en: {
    title: "ANNUAL ACTIVITY MONITORING",
    subtitle: "Strategic Plan 2024 – 2030",
    updated: "Data updated",

    year: "YEAR",
    month: "MONTH",
    unit: "COORDINATION UNIT",
    all: "All",
    reset: "Reset filters",

    monthRange: "January - December",
    yearRange: "2025 - 2030",

    globalProgress: "OVERALL ACTIVITY PROGRESS RATE",
    totalPlanned: "Total planned activities",
    completed: "Completed activities",
    ongoing: "Ongoing activities",
    notStarted: "Activities not started",

    byAchievement: "PROGRESS RATE BY RESULT",
    byComponent: "PROGRESS RATE BY COMPONENT",

    result1: "R1. MANAGEMENT SYSTEM",
    result2: "R2. LAND-USE PLANNING",

    componentC1: "C1. ECOSYSTEM SERVICES MANAGEMENT",
    componentC2: "C2. DECENTRALIZED ENVIRONMENTAL GOVERNANCE",
    componentC3: "C3. DEVELOPMENT OF PRODUCTIVE LANDSCAPES",
    componentC4: "C4. CREATION OF GREEN JOBS",

    axisPriority: "PRIORITY AXIS",
    progressRate: "PROGRESS RATE",

    axis1Title: "PRIORITY AXES OF RESULT 1: MANAGEMENT SYSTEM",
    axis2Title: "PRIORITY AXES OF RESULT 2: LAND-USE PLANNING",

    diagnostic: "Diagnostic analyses",
    territorialPlanning: "Territorial planning",
    ecosystemMonitoring: "Ecosystem monitoring",
    sustainableFinancing: "Sustainable financing",
    populationParticipation: "Population participation",
    mnpCooperation: "Cooperation with MNP",
    intersectoralCoordination: "Intersectoral coordination",
    antiCorruption: "Fight against corruption",

    landscapeRestoration: "Landscape restoration",
    sustainableProduction: "Sustainable production",
    landSecurity: "Land tenure security",
    fireManagement: "Fire management",
    marketSystem: "Market system",
    productionValorization: "Production valorization",
    activityDiversification: "Activity diversification",
    communityMobilization: "Community mobilization",

    legend: "LEGEND (PROGRESS RATE)",

    accessTitle: "ACCESS ANNUAL ACTIVITY MONITORING FOR THE SELECTED YEAR",
    accessDesc: "View activity details",
    accessBtn: "Access activity monitoring",

    months: {
      Janvier: "January",
      Février: "February",
      Mars: "March",
      Avril: "April",
      Mai: "May",
      Juin: "June",
      Juillet: "July",
      Août: "August",
      Septembre: "September",
      Octobre: "October",
      Novembre: "November",
      Décembre: "December",
    },

    range0_25: "0 to 25%",
    range25_50: "25% to 50%",
    range50_75: "50% to 75%",
    range75_100: "75% to 100%",
  },

  de: {
    title: "JÄHRLICHE AKTIVITÄTSÜBERWACHUNG",
    subtitle: "Strategischer Plan 2024 – 2030",
    updated: "Daten aktualisiert",

    year: "JAHR",
    month: "MONAT",
    unit: "KOORDINATIONSEINHEIT",
    all: "Alle",
    reset: "Filter zurücksetzen",

    monthRange: "Januar - Dezember",
    yearRange: "2025 - 2030",

    globalProgress: "GESAMTFORTSCHRITTSRATE DER AKTIVITÄTEN",
    totalPlanned: "Insgesamt geplante Aktivitäten",
    completed: "Abgeschlossene Aktivitäten",
    ongoing: "Laufende Aktivitäten",
    notStarted: "Noch nicht gestartete Aktivitäten",

    byAchievement: "FORTSCHRITTSRATE NACH ERGEBNIS",
    byComponent: "FORTSCHRITTSRATE NACH KOMPONENTE",

    result1: "R1. MANAGEMENTSYSTEM",
    result2: "R2. RAUMORDNUNG",

    componentC1: "C1. MANAGEMENT VON ÖKOSYSTEMDIENSTLEISTUNGEN",
    componentC2: "C2. DEZENTRALISIERTE UMWELTGOVERNANCE",
    componentC3: "C3. ENTWICKLUNG PRODUKTIVER LANDSCHAFTEN",
    componentC4: "C4. SCHAFFUNG GRÜNER ARBEITSPLÄTZE",

    axisPriority: "PRIORITÄTSACHSE",
    progressRate: "FORTSCHRITTSRATE",

    axis1Title: "PRIORITÄTSACHSEN DES ERGEBNISSES 1: MANAGEMENTSYSTEM",
    axis2Title: "PRIORITÄTSACHSEN DES ERGEBNISSES 2: RAUMORDNUNG",

    diagnostic: "Diagnostische Analysen",
    territorialPlanning: "Raumplanung",
    ecosystemMonitoring: "Ökosystemüberwachung",
    sustainableFinancing: "Nachhaltige Finanzierung",
    populationParticipation: "Beteiligung der Bevölkerung",
    mnpCooperation: "Zusammenarbeit mit MNP",
    intersectoralCoordination: "Sektorübergreifende Koordination",
    antiCorruption: "Korruptionsbekämpfung",

    landscapeRestoration: "Landschaftswiederherstellung",
    sustainableProduction: "Nachhaltige Produktion",
    landSecurity: "Sicherung von Landrechten",
    fireManagement: "Feuermanagement",
    marketSystem: "Marktsystem",
    productionValorization: "Aufwertung der Produktion",
    activityDiversification: "Diversifizierung der Aktivitäten",
    communityMobilization: "Mobilisierung der Gemeinschaft",

    legend: "LEGENDE (FORTSCHRITTSRATE)",

    accessTitle: "ZUGRIFF AUF DIE JÄHRLICHE AKTIVITÄTSÜBERWACHUNG DES AUSGEWÄHLTEN JAHRES",
    accessDesc: "Details zu den Aktivitäten anzeigen",
    accessBtn: "Zur Aktivitätsüberwachung",

    months: {
      Janvier: "Januar",
      Février: "Februar",
      Mars: "März",
      Avril: "April",
      Mai: "Mai",
      Juin: "Juni",
      Juillet: "Juli",
      Août: "August",
      Septembre: "September",
      Octobre: "Oktober",
      Novembre: "November",
      Décembre: "Dezember",
    },

    range0_25: "0 bis 25%",
    range25_50: "25% bis 50%",
    range50_75: "50% bis 75%",
    range75_100: "75% bis 100%",
  },
};

interface CoutActivite {
  Année:number;
  Mois:string;
  UC:string;      
  [key:string]: any;
      } 

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

  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.fr;

  const [data,setData] = useState<CoutActivite[]>([]);
  const [annee,setAnnee] = useState<number>(2026);
  const [mois,setMois] = useState<string>("Tous");
  const [uc,setUc] = useState<string>("Tous");


  const composantesConfig = [
    { code: "C1", icon: Leaf, title: t.componentC1Short },
    { code: "C2", icon: Building, title: t.componentC2Short },
    { code: "C3", icon: Map, title: t.componentC3Short },
    { code: "C4", icon: Briefcase, title: t.componentC4Short },
  ];

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
        label: t.result1,
        percent: Number(coutActuel["TAR 1"] || 0) * 100,
      },
      {
        label: t.result2,
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
      label: t.componentC1,
      percent: Number(coutActuel["TAA 1.1.1"] || 0) * 100,
      icon: Leaf,
    },
  
    {
      label: t.componentC2,
      percent: Number(coutActuel["TAA 1.1.2"] || 0) * 100,
      icon: ShieldCheck,
    },
  
    {
      label: t.componentC3,
      percent: Number(coutActuel["TAA 1.1.3"] || 0) * 100,
      icon: Mountain,
    },
  
    {
      label: t.componentC4,
      percent: Number(coutActuel["TAA 1.1.4"] || 0) * 100,
      icon: BriefcaseBusiness,
    },
  
  ].map(item => ({
    ...item,
    percent: Number(item.percent.toFixed(1)),
    color: getProgressColor(item.percent)
  }));

  const axes1 = {
    title: t.axis1Title,
    icon: Users,
  
    data: [
      {
        code: "1.1.1",
        name: t.diagnostic,
        value: Number(coutActuel["TAA 1.1.1"] || 0) * 100,
      },
      {
        code: "1.1.2",
        name: t.territorialPlanning,
        value: Number(coutActuel["TAA 1.1.2"] || 0) * 100,
      },
      {
        code: "1.1.3",
        name: t.ecosystemMonitoring,
        value: Number(coutActuel["TAA 1.1.3"] || 0) * 100,
      },
      {
        code: "1.1.4",
        name: t.sustainableFinancing,
        value: Number(coutActuel["TAA 1.1.4"] || 0) * 100,
      },
      {
        code: "1.2.1",
        name: t.populationParticipation,
        value: Number(coutActuel["TAA 1.2.1"] || 0) * 100,
      },
      {
        code: "1.2.2",
        name: t.mnpCooperation,
        value: Number(coutActuel["TAA 1.2.2"] || 0) * 100,
      },
      {
        code: "1.2.3",
        name: t.intersectoralCoordination,
        value: Number(coutActuel["TAA 1.2.3"] || 0) * 100,
      },
      {
        code: "1.2.4",
        name: t.antiCorruption,
        value: Number(coutActuel["TAA 1.2.4"] || 0) * 100,
      },
    ],
  };
  const axes2 = {
    title: t.axis2Title,
    icon: Trees,
  
    data: [
      {
        code: "2.1.1",
        name: t.landscapeRestoration,
        value: Number(coutActuel["TAA 2.1.1"] || 0) * 100,
      },
      {
        code: "2.1.2",
        name: t.sustainableProduction,
        value: Number(coutActuel["TAA 2.1.2"] || 0) * 100,
      },
      {
        code: "2.1.3",
        name: t.landSecurity,
        value: Number(coutActuel["TAA 2.1.3"] || 0) * 100,
      },
      {
        code: "2.1.4",
        name: t.fireManagement,
        value: Number(coutActuel["TAA 2.1.4"] || 0) * 100,
      },
      {
        code: "2.2.1",
        name: t.marketSystem,
        value: Number(coutActuel["TAA 2.2.1"] || 0) * 100,
      },
      {
        code: "2.2.2",
        name: t.productionValorization,
        value: Number(coutActuel["TAA 2.2.2"] || 0) * 100,
      },
      {
        code: "2.2.3",
        name: t.activityDiversification,
        value: Number(coutActuel["TAA 2.2.3"] || 0) * 100,
      },
      {
        code: "2.2.4",
        name: t.communityMobilization,
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
            {t.title}
          </div>
          <div style={styles.subtitle}>
            {t.subtitle}
          </div>
        </div>

        <div style={styles.dateBox}>
          <CalendarDays size={18} />
          <div>
            <div style={styles.dateLabel}>{t.updated}</div>
            <div style={styles.dateValue}>17 juillet 2026</div>
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
          <div style={styles.filterLabel}>{t.year}</div>

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

            <div style={styles.filterSub}>{t.yearRange}</div>
          </div>
        </div>

        {/* MOIS */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <CalendarDays size={28} color="#16a34a" />
          </div>

          <div style={{ flex: 1 }}>
          <div style={styles.filterLabel}>{t.month}</div>

            <select
              style={styles.bigSelect}
              value={mois}
              onChange={(e)=>setMois(e.target.value)}
            >
              <option value="Tous">
                    {t.all}
                  </option>

                  {
                    moisListe.map(m =>
                      <option key={m} value={m}>
                        {t.months?.[m] || m}
                      </option>
                    )
                  }
            </select>

            <div style={styles.filterSub}>{t.monthRange}</div>
          </div>
        </div>

        {/* UNITÉ */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <Building2 size={28} color="#16a34a" />
          </div>

          <div style={{ flex: 1 }}>
          <div style={styles.filterLabel}>{t.unit}</div>

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
              {t.reset}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TOP CARDS ================= */}
      <div style={styles.gridTop}>

        {/* GLOBAL */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
             {t.globalProgress}
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
                        {t.totalPlanned}
                    </span>

                    <span style={styles.kpiValue}>
                      {totalActivites}
                    </span>
                </div>

                    <div style={styles.kpiItem}>
                        <CheckCircle size={20} color="#16a34a" />
                            <span style={styles.kpiLabel}>
                                {t.completed}
                            </span>

                            <span style={styles.kpiValue}>
                              {activitesAchevees}
                            </span>
                    </div>

                    <div style={styles.kpiItem}>
                        <Clock size={20} color="#16a34a" />
                        <span style={styles.kpiLabel}>
                            {t.ongoing}
                        </span>

                        <span style={styles.kpiValue}>
                          {activitesEnCours}
                        </span>
                    </div>

                    <div style={styles.kpiItem}>
                      <XCircle size={20} color="#16a34a" />
                        <span style={styles.kpiLabel}>
                           {t.notStarted}
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
                    {t.byAchievement}
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
       {t.byComponent}
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
            <div>{t.axisPriority}</div>
            <div>{t.progressRate}</div>
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
            <div>{t.axisPriority}</div>
            <div>{t.progressRate}</div>
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
      <div style={styles.footerHeader}>
        {t.legend}
      </div>
      </div>
  
      {/* LEFT : LEGEND */}
        <div style={styles.footerLegend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#ef4444' }} />
            {t.range0_25}
          </div>

          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#f59e0b' }} />
            {t.range25_50}
          </div>

          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#22c55e' }} />
            {t.range50_75}
          </div>

          <div style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#2563eb' }} />
            {t.range75_100}
          </div>
        </div>

        {/* RIGHT : CTA */}
        <div style={styles.footerCTA}>
          <div style={styles.ctaIcon}>
            📄
          </div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 10 }}>
          {t.accessTitle}
          </div>
          <div style={{ fontSize: 9, opacity: 0.8 }}>
          {t.accessDesc}
          </div>
        </div>

        <button style={styles.ctaButton}>
        {t.accessBtn} ↗
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
