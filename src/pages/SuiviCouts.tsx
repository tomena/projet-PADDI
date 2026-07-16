import React, { useEffect, useState }  from 'react';
import {CalendarDays,RotateCcw,Building2,Building,Plane,Wallet,Users,User,Info,Coins,Briefcase,UserRound,Handshake,Leaf,Map,ShoppingCart, FileText
      } from 'lucide-react';
import { FaShoppingCart, FaFileContract } from 'react-icons/fa';
import { MdPayments, MdAccountBalanceWallet } from 'react-icons/md';
import { GiPayMoney } from 'react-icons/gi';
import {ResponsiveContainer,PieChart,Pie,Cell,BarChart,Bar,XAxis,YAxis,LabelList,Label,CartesianGrid,Tooltip,
      } from 'recharts';

interface CoutActivite {
  Année:number;
  Mois:string;
  UC:string;      
  [key:string]: any;
      }

const getProgressColor = (percent) => {
  if (percent < 25) return '#ef4444'; // rouge
  if (percent < 50) return '#f59e0b'; // jaune
  if (percent < 75) return '#22c55e'; // vert
  return '#2563eb'; // bleu
};

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

export default function SuiviCouts() {

  const [data,setData] = useState<CoutActivite[]>([]);
  const [annee,setAnnee] = useState<number>(2026);
  const [mois,setMois] = useState<string>("Tous");
  const [uc,setUc] = useState<string>("Tous");

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

  const coutActuel = dataFiltre.find(
    d => d["BD C1 (EUR)"] !== null
  ) || dataFiltre[0] || {};

  const tauxDecaissement =
        (coutActuel["TD"] || 0) * 100;

  const decaisse = coutActuel["D (EUR)"] || 0;
  const planification = coutActuel["PA (EUR)"] || 0;      
        
  const tauxAvancement =
          planification > 0
            ? (decaisse / planification) * 100
            : 0;

  const couleurDonut =
  tauxDecaissement < 25
    ? "#ef4444"   // Rouge
    : tauxDecaissement < 50
    ? "#f59e0b"   // Orange
    : tauxDecaissement < 75
    ? "#22c55e"   // Vert
    : "#2563eb";  // Bleu

    const couleurAvancement =
    tauxAvancement < 25
      ? "#ef4444"
      : tauxAvancement < 50
      ? "#f59e0b"
      : tauxAvancement < 75
      ? "#22c55e"
      : "#2563eb";

        const composantes = [
          {
            icon: Leaf,
            title: "C1. Gestion des services écosystémiques",
            amount: coutActuel["BD C1 (EUR)"] || 0,
            percent: (coutActuel["BD C1 (%)"] || 0) * 100,
            color: "#2563eb",
          },
          {
            icon: Building,
            title: "C2. Gouvernance environnementale",
            amount: coutActuel["BD C2 (EUR)"] || 0,
            percent: (coutActuel["BD C2 (%)"] || 0) * 100,
            color: "#2563eb",
          },
          {
            icon: Map,
            title: "C3. Développement des paysages",
            amount: coutActuel["BD C3 (EUR)"] || 0,
            percent: (coutActuel["BD C3 (%)"] || 0) * 100,
            color: "#16a34a",
          },
          {
            icon: Briefcase,
            title: "C4. Création d’emplois verts",
            amount: coutActuel["BD C4 (EUR)"] || 0,
            percent: (coutActuel["BD C4 (%)"] || 0) * 100,
            color: "#16a34a",
          },
        ];

        const instruments = [
          {
            icon: Wallet,
            title: "Financements",
            amount: coutActuel["BDF (EUR)"] || 0,
            percent: (coutActuel["BDF (%)"] || 0) * 100,
            color: "#2563eb",
          },
        
          {
            icon: ShoppingCart,
            title: "Achats",
            amount: coutActuel["BDA (EUR)"] || 0,
            percent: (coutActuel["BDA (%)"] || 0) * 100,
            color: "#2563eb",
          },
        
          {
            icon: FileText,
            title: "Contrats",
            amount: coutActuel["BDC (EUR)"] || 0,
            percent: (coutActuel["BDC (%)"] || 0) * 100,
            color: "#22c55e",
          },
        
          {
            icon: Users,
            title: "Mission interne",
            amount: coutActuel["BDMI (EUR)"] || 0,
            percent: (coutActuel["BDMI (%)"] || 0) * 100,
            color: "#22c55e",
          },
        
          {
            icon: Handshake,
            title: "Missions partenaires",
            amount: coutActuel["BDMP (EUR)"] || 0,
            percent: (coutActuel["BDMP (%)"] || 0) * 100,
            color: "#f59e0b",
          },
        
          {
            icon: Briefcase,
            title: "Salaires",
            amount: coutActuel["BDS (EUR)"] || 0,
            percent: (coutActuel["BDS (%)"] || 0) * 100,
            color: "#f59e0b",
          },
        ];

  const dataGraph = data.filter((d) => {
          return uc === "Tous" || d.UC === uc;
        });

  const ligneGraph = dataGraph[0] || {};

  const yearlyData = [2024, 2025, 2026, 2027, 2028, 2029, 2030].map((annee) => ({
      year: String(annee),
      value: (ligneGraph[`BD ${annee} (EUR)`] || 0) / 1_000_000,
      percent: ((ligneGraph[`BD ${annee} (%)`] || 0) * 100).toFixed(1),
  }));

  const tauxComposantes = [
    {
      title: "C1. GESTION DES SERVICES ÉCOSYSTÉMIQUES",
      percent: (coutActuel["TAC C1"] || 0) * 100,
      dec: coutActuel["D C1 (EUR)"] || 0,
      plan: coutActuel["PA C1 (EUR)"] || 0,
      color: "#2563eb",
    },
  
    {
      title: "C2. GOUVERNANCE ENVIRONNEMENTALE DECENTRALISEE",
      percent: (coutActuel["TAC C2"] || 0) * 100,
      dec: coutActuel["D C2 (EUR)"] || 0,
      plan: coutActuel["PA C2 (EUR)"] || 0,
      color: "#2563eb",
    },
  
    {
      title: "C3. DEVELOPPEMENT DES PAYSAGES PRODUCTIFS",
      percent: (coutActuel["TAC C3"] || 0) * 100,
      dec: coutActuel["D C3 (EUR)"] || 0,
      plan: coutActuel["PA C3 (EUR)"] || 0,
      color: "#16a34a",
    },
  
    {
      title: "C4. CREATION EMPLOIS VERTS",
      percent: (coutActuel["TAC C4"] || 0) * 100,
      dec: coutActuel["D C4 (EUR)"] || 0,
      plan: coutActuel["PA C4 (EUR)"] || 0,
      color: "#16a34a",
    },
  ];

  const tauxInstruments = [
    {
      title: "FINANCEMENTS",
      icon: Handshake,
      percent: Number(coutActuel["TAC F"] || 0) * 100,
      dec: coutActuel["DF (EUR)"] || 0,
      plan: coutActuel["PAF (EUR)"] || 0,
      color:"#2563eb",
    },
  
    {
      title:"ACHATS",
      icon: FaShoppingCart,
      percent:Number(coutActuel["TAC A"] || 0) * 100,
      dec:coutActuel["DA (EUR)"] || 0,
      plan:coutActuel["PAA (EUR)"] || 0,
      color:"#16a34a",
    },
  
    {
      title:"CONTRATS",
      icon:FaFileContract,
      percent:Number(coutActuel["TAC C"] || 0) * 100,
      dec:coutActuel["DC (EUR)"] || 0,
      plan:coutActuel["PAC (EUR)"] || 0,
      color:"#f59e0b",
    },
  
    {
      title:"MISSIONS INTERNE",
      icon:Plane,
      percent:Number(coutActuel["TAC MI"] || 0) * 100,
      dec:coutActuel["DMI (EUR)"] || 0,
      plan:coutActuel["PAMI (EUR)"] || 0,
      color:"#f97316",
    },
  
    {
      title:"MISSIONS PARTENAIRES",
      icon:Users,
      percent:Number(coutActuel["TAC MP"] || 0) * 100,
      dec:coutActuel["DMP (EUR)"] || 0,
      plan:coutActuel["PAMP (EUR)"] || 0,
      color:"#f97316",
    },
  ];


    console.log(data);
    console.log(annees);
    console.log(moisListe);
    console.log(ucListe);
    console.log("coutActuel :", coutActuel);
    console.log("Clés disponibles :", Object.keys(coutActuel));
    console.log("coutActuel complet :", JSON.stringify(coutActuel, null, 2));
    console.log("D :", coutActuel["D"]);
    console.log("PA :", coutActuel["PA"]);
    console.log("Taux :", tauxAvancement);

  const getPercent = (p: string) =>
    Math.min(parseFloat(p.replace(',', '.')) || 0, 100);

    const formatCompactEuro = (value: number | string) => {
      const num = Number(value) || 0;
    
      if (num >= 1000000) {
        return `${(num / 1000000)
          .toFixed(1)
          .replace('.', ',')} M€`;
      }
    
      if (num >= 1000) {
        return `${Math.round(num / 1000)} k€`;
      }
    
      return `${Math.round(num)} €`;
    };



  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoWrap}></div>

          <div>
            <div style={styles.title}>SUIVI DES COÛTS</div>

            <div style={styles.subtitle}>Plan Stratégique 2024 - 2030</div>
          </div>
        </div>

        <div style={styles.dateBox}>
          <CalendarDays size={18} />

          <div>
            <div style={styles.dateLabel}>Données mises à jour le :</div>

            <div style={styles.dateValue}>16 juillet 2026</div>
          </div>
        </div>
      </div>
      {/* FILTERS */}
      <div style={styles.filtersContainer}>
        {/* ANNÉE */}
        <div style={styles.bigFilter}>
          <div style={styles.filterIcon}>
            <CalendarDays size={28} color="#1d4ed8" />
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
            <CalendarDays size={28} color="#1d4ed8" />
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
            <Building2 size={28} color="#1d4ed8" />
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
            Réinitialiser
            <br />
            les filtres
          </button>
        </div>
      </div>
      {/* TOP GRID */}
      <div style={styles.topGrid}>
        {/* LEFT */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              ÉVOLUTION ANNUELLE DU DÉCAISSEMENT (PROGRAMME)
              <Info size={18} />
            </div>
          </div>

          <div style={styles.kpiRow}>
            {/* LEFT KPI */}
            <div style={styles.kpiLeftBlock}>
              <div style={styles.kpiTile}>
                {/* ICON */}
                <div style={styles.kpiIconWrap}>
                  <GiPayMoney size={26} color="#2563eb" />
                </div>

                {/* CONTENT */}
                <div style={styles.kpiContent}>
                  <div style={styles.kpiTopLabel}>DÉCAISSÉ CUMULÉ</div>

                  <div style={styles.kpiMainValue}>
                    {
                    coutActuel["DC"]
                    ?
                    new Intl.NumberFormat("fr-FR").format(
                    coutActuel["DC"]
                    )
                    :
                    "0"
                    } €
                    </div>

                  <div style={styles.kpiDivider} />

                  <div style={styles.kpiSubOverlay}>
                    <span style={styles.kpiSubLabel}>
                      SUR UN BUDGET TOTAL DE
                    </span>
                    <span style={styles.kpiSubValue}>
                      <div style={styles.kpiSubValue}>
                        {
                        coutActuel["BT"]
                        ?
                        new Intl.NumberFormat("fr-FR").format(
                        coutActuel["BT"]
                        )
                        :
                        "0"
                        } €
                      </div>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PIE */}
            <div style={{ textAlign: 'center' }}>
              <div style={styles.kpiLabel}>TAUX DE DÉCAISSEMENT</div>

              <div style={styles.pieWrapper}>
              <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                    <Pie
                      data={[
                      {
                      value:tauxDecaissement
                      },
                      {
                      value:100-tauxDecaissement
                      }
                      ]}
                        dataKey="value"
                        innerRadius={27}
                        outerRadius={50}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill={couleurDonut} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
              </ResponsiveContainer>

              <div
                style={{
                  ...styles.pieCenter,
                  color: couleurDonut,
                }}
              >
                {tauxDecaissement.toFixed(1)}%
              </div>
              </div>
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              color: '#2563eb',
              fontWeight: 900,
              fontSize: 10,
              marginTop: 0,
              marginBottom: 5,
              letterSpacing: 0.5,
            }}
          >
            EVOLUTION ANNUELLE DU DÉCAISSEMENT
          </div>
          <div
            style={{
              textAlign: 'left',
              color: '#64748b',
              fontSize: 10,
              fontWeight: 800,
              marginBottom: 4,
              marginLeft: 18,
            }}
          >
            Million €
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={yearlyData}
              margin={{
                top: 10,
                right: 25,
                left: 0,
                bottom: 5,
              }}
            >
              {/* LIGNES HORIZONTALES */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#dbeafe"
              />

              {/* AXE X */}
              <XAxis
                dataKey="year"
                tick={{
                  fontSize: 10,
                  fill: '#64748b',
                  fontWeight: 600,
                }}
                axisLine={false}
                tickLine={false}
              />

              {/* AXE Y */}
              <YAxis
                domain={[0, 16]}
                ticks={[0, 4, 8, 12, 16]}
                tickFormatter={(v) => (v === 0 ? '0' : `${v}M`)}
                tick={{
                  fontSize: 10,
                  fill: '#64748b',
                  fontWeight: 700,
                }}
                axisLine={false}
                tickLine={false}
              >
                {/* TEXTE Millions € */}
                <Label
                  value="Millions €"
                  angle={0}
                  position="top"
                  offset={10}
                  style={{
                    fill: '#2563eb',
                    fontSize: 4,
                    fontWeight: 600,
                    textAnchor: 'end',
                  }}
                />
              </YAxis>

              {/* BARRES */}
              <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={22}>
                {yearlyData.map((entry, index) => {
                  const max = Math.max(...yearlyData.map((d) => d.value));

                  return (
                    <Cell
                      key={index}
                      fill={
                        entry.value === max
                          ? '#1e3a8a'
                          : '#94a3b8'
                      }
                    />
                  );
                })}

                {/* POURCENTAGE EN DESSOUS */}
                <LabelList
                  position="top"
                  content={(props: any) => {
                    const { x, y, width, value, index } = props;

                    const percent = yearlyData[index]?.percent || 0;

                    return (
                      <g>
                        {/* VALEUR */}
                        <text
                          x={x + width / 2}
                          y={y - 16}
                          textAnchor="middle"
                          fill="#1d4ed8"
                          fontSize="10"
                          fontWeight="700"
                        >
                          {value.toFixed(2)}M
                        </text>

                        {/* POURCENTAGE */}
                        <text
                          x={x + width / 2}
                          y={y - 3}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="9"
                          fontWeight="700"
                        >
                          {percent}%
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ÉVOLUTION ANNUELLE DU DÉCAISSEMENT PAR COMPOSANTE  */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                ÉVOLUTION ANNUELLE DU DÉCAISSEMENT PAR COMPOSANTE
              </span>
              <Info size={18} />
            </div>
          </div>

          {/* HEADER STICKY */}
          <div style={styles.stickyHeader}>
            <span>COMPOSANTE</span>
            <span>DÉCAISSÉ</span>
            <span>% DU BUDGET TOTAL</span>
          </div>

          {composantes.map((item, i) => {
            const Icon = item.icon;

            const percent = Math.min(
                Number(item.percent) || 0,
                100
              );

            return (
              <div
                key={i}
                style={{
                  ...styles.saasRow,
                  gridTemplateColumns: '2fr 1fr 1fr',
                  background: i % 2 === 0 ? '#ffffff' : 'transparent',
                }}
              >
                {/* COL 1 */}
                <div style={styles.cellFlex}>
                  <div
                    style={{
                      ...styles.badge,
                      background: 'transparent',
                    }}
                  >
                    <Icon size={18} color={item.color} />
                  </div>

                  <div style={styles.rowTitle}>{item.title}</div>
                </div>

                {/* AMOUNT */}
                <div style={styles.amount}>{new Intl.NumberFormat("fr-FR").format(item.amount)} €</div>

                {/* PROGRESS + % INLINE */}
                <div style={styles.progressCell}>
                  <span style={styles.percentLeft}>{percent.toFixed(1)}%</span>

                  <div style={styles.progress}>
                    <div
                      style={{
                        ...styles.progressBarAnimated,
                        width: `${percent}%`,
                        background: getProgressColor(percent),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div style={styles.totalRow}>
            <div style={{ fontWeight: 900, fontSize: 12, color: '#1d4ed8' }}>
              TOTAL
            </div>

            <div
              style={{
                fontWeight: 800,
                textAlign: 'left',
                fontSize: 12,
                color: '#1d4ed8',
              }}
            >
              {new Intl.NumberFormat("fr-FR").format(coutActuel["DC"] || 0)} €
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#1d4ed8',
                fontWeight: 800,
              }}
            >
              {((coutActuel["TD"] || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

      {/* ÉVOLUTION ANNUELLE DU DÉCAISSEMENT PAR COMPOSANTE  */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            ÉVOLUTION ANNUELLE DU DECAISSEMENT PAR INSTRUMENT
            <Info size={18} />
          </div>

          <div style={styles.tableHeaderRow}>
            <span>INSTRUMENT</span>
            <span>DÉCAISSÉ</span>
            <span>% DU BUDGET TOTAL</span>
          </div>

          {instruments.map((item, i) => {
            const Icon = item.icon;

            const percent = Math.min(
              Number(item.percent) || 0,
              100
            );

            return (
              <div
                key={i}
                style={{
                  ...styles.saasRow,
                  background: i % 2 === 0 ? '#fff' : '#f8fafc',
                }}
              >
                {/* COL 1 */}
                <div style={styles.cellFlex}>
                  <div
                    style={{
                      ...styles.badge,
                      background: 'transparent',
                    }}
                  >
                    <Icon size={18} color={item.color} />
                  </div>

                  <div style={styles.rowTitle}>{item.title}</div>
                </div>

                <div style={styles.amount}>
                  {
                  new Intl.NumberFormat("fr-FR")
                  .format(item.amount)
                  } €
                </div>

                <div style={styles.progressCell}>
                <span style={styles.percentLeft}>
                  {percent.toFixed(1)}%
                </span>

                  <div style={styles.progress}>
                    <div
                      style={{
                        ...styles.progressBarAnimated,
                        width: `${percent}%`,
                        background: getProgressColor(percent),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div style={styles.totalRow}>
            <div style={{ fontWeight: 900, fontSize: 12, color: '#1d4ed8' }}>
              TOTAL
            </div>

            <div
              style={{
                fontWeight: 800,
                textAlign: 'left',
                fontSize: 12,
                color: '#1d4ed8',
              }}
            >
              {
              new Intl.NumberFormat("fr-FR")
              .format(coutActuel["DC"] || 0)
              } €
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#1d4ed8',
                fontWeight: 800,
              }}
            >
              {
              ((coutActuel["TD"] || 0) * 100)
              .toFixed(1)
              }%
            </div>
          </div>
        </div>{' '}
      </div>{' '}


      {/* ===================== NEW BOTTOM GRIDS ===================== */}
      <div style={styles.bottomGrid}>
        <div style={styles.card}>
          <div
            style={{
              background: 'transparent',
              color: '#1d4ed8',
              padding: '6px 10px',
              fontWeight: 900,
              fontSize: 8,
              letterSpacing: 0.5,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: 'none',
              marginBottom: 5,
            }}
          >
            TAUX D’AVANCEMENT GLOBAL DES COÛTS (PAR RAPPORT A LA PLANIFICATION
            ANNUELLE)
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* DONUT EN HAUT */}
            <div
              style={{
                position:"relative",
                width:100,
                height:100,
              }}
            >
              <PieChart width={100} height={100}>
                <Pie
                  data={[
                    {value:tauxAvancement},
                    {value:100-tauxAvancement}
                  ]}
                  innerRadius={25}
                  outerRadius={42}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  <Cell fill={couleurAvancement}/>
                  <Cell fill="#e5e7eb"/>
                </Pie>
              </PieChart>
              <div
                style={{
                  position:"absolute",
                  top:"50%",
                  left:"50%",
                  transform:"translate(-50%,-50%)",
                  fontSize:16,
                  fontWeight:900,
                  color:couleurAvancement,
                }}
              >
                {tauxAvancement.toFixed(1)}%
              </div>
            </div>
            {/* TABLEAU EN DESSOUS */}
            <div
              style={{
                width:"100%",
                marginTop:1,
              }}
            >
              {/* DECAISSE */}
              <div
                style={{
                  display:"grid",
                  gridTemplateColumns:"1fr auto",
                  padding:"8px 10px",
                  borderBottom:"1px solid #e5e7eb",
                  fontSize:8,
                }}
              >
                <span
                  style={{
                    fontWeight:700,
                    color:"#475569",
                  }}
                >
                  DÉCAISSÉ
                </span>
                <span
                  style={{
                    fontWeight:900,
                    color:"#2563eb",
                  }}
                >
                  {
                    new Intl.NumberFormat("fr-FR")
                    .format(decaisse)
                  } €
                </span>
              </div>
              {/* PLANIFICATION */}
              <div
                style={{
                  display:"grid",
                  gridTemplateColumns:"1fr auto",
                  padding:"8px 10px",
                  fontSize:8,
                }}
              >
                <span
                  style={{
                    fontWeight:700,
                    color:"#475569",
                  }}
                >
                  PLANIFICATION ANNUELLE
                </span>
                <span
                  style={{
                    fontWeight:800,
                    color:"#2563eb",
                  }}
                >
                  {
                    new Intl.NumberFormat("fr-FR")
                    .format(planification)
                  } €
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div
            style={{
              background: 'transparent',
              color: '#1d4ed8',
              padding: '6px 10px',
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: 0.3,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: 'none',
            }}
          >
            TAUX D’AVANCEMENT PAR COMPOSANTE
          </div>

          <div style={styles.donutGrid4}>
          {tauxComposantes.map((item,i)=>{
            const couleur = getProgressColor(item.percent);
            return (
              
              <div
                key={i}
                style={{
                  ...styles.donutCard,
                  border: `1.5px solid ${item.color}40`,
                  background: `${item.color}10`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: 7,
                    fontWeight: 900,
                    color: item.color,
                    textAlign: 'center',
                    lineHeight: 1.1,
                    letterSpacing: 0.2,
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </div>

                {/* SLOT ICON FIX (ALIGNEMENT GRID6) */}
                <div
                  style={{
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                    opacity: 0, // invisible mais prend espace
                  }}
                >
                  <GiPayMoney size={14} />
                </div>

                <div style={styles.donutWrapper}>
                  <PieChart width={72} height={72}>
                    <Pie
                      data={[
                        { value: item.percent },
                        { value: 100 - item.percent },
                      ]}
                      innerRadius={18}
                      outerRadius={30}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill={couleur} />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                  </PieChart>

                  {/* 🔥 CENTRAGE PARFAIT ABSOLU */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontWeight: 900,
                      fontSize: 11,
                      color: couleur,
                      pointerEvents: 'none',
                      lineHeight: 1,
                    }}
                  >
                    {item.percent.toFixed(1)}%
                  </div>
                </div>

                <div style={styles.twoCols}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={styles.smallLabel}>DÉCAISSÉ</div>
                    <div style={styles.money}>
                      {formatCompactEuro(item.dec)}
                    </div>
                  </div>

                  <div style={styles.verticalSeparator} />

                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={styles.smallLabel}>PLANIFIÉ</div>
                    <div style={styles.money}>
                      {formatCompactEuro(item.plan)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>

        <div style={styles.card}>
          <div
            style={{
              background: 'transparent',
              color: '#15803d',
              padding: '6px 10px',
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: 0.3,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: 'none',
            }}
          >
            TAUX D’AVANCEMENT PAR INSTRUMENT
          </div>

          <div style={styles.donutGrid6}>
          {tauxInstruments.map((item,i)=>{
            const couleur = getProgressColor(item.percent);
            const Icon = item.icon;

          return (
                <div
                  key={i}
                  style={{
                    ...styles.donutCard,
                    border: `1.5px solid ${item.color}33`,
                    boxShadow: `0 2px 6px rgba(0,0,0,0.04)`,
                    borderTop: `2px solid ${item.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 900,
                      lineHeight: 1.2,
                      minHeight: 24,
                      textAlign: 'center',
                      color: item.color,
                      letterSpacing: 0.3,
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Icon size={14} color={item.color} />
                  </div>

                  <div style={styles.donutWrapper}>
                    <PieChart width={72} height={72}>
                      <Pie
                        data={[
                          { value: item.percent },
                          { value: 100 - item.percent },
                        ]}
                        innerRadius={18}
                        outerRadius={30}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        <Cell fill={couleur}/>
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>

                    {/* 🔥 CENTRAGE PARFAIT ABSOLU */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontWeight: 900,
                        fontSize: 11,
                        color:couleur,
                        pointerEvents: 'none',
                        lineHeight: 1,
                      }}
                    >
                      {item.percent.toFixed(1)}%
                    </div>
                  </div>

                  <div style={styles.twoCols}>
                    <div style={styles.colBox}>
                      <div style={styles.smallLabel}>DÉCAISSÉ</div>
                      <div style={{ ...styles.money, color: item.color }}>
                        {formatCompactEuro(item.dec)}
                      </div>
                    </div>

                    <div style={styles.verticalSeparator} />

                    <div style={styles.colBox}>
                      <div style={styles.smallLabel}>PLANIFIÉ</div>
                      <div style={styles.money}>
                        {formatCompactEuro(item.plan)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
            ACCÉDER AU SUIVI DES COÛTS DE L’ANNÉE
          </div>
          <div style={{ fontSize: 9, opacity: 0.8 }}>
            Consultez le détail des coûts, engagements et décaissements
          </div>
        </div>

        <button style={styles.ctaButton}>
          Accéder au suivi des coûts ↗
        </button>
      </div>
    </div>
  </div>
  );
}

const styles: any = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    background: 'none',
    padding: 10,
    minHeight: '100vh',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  header: {
    background: 'linear-gradient(135deg,#0f2d6b,#0a4cb3)',
    borderRadius: 8,
    padding: '14px 18px',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: -0.4,
  },

  percentLeft: {
    fontSize: 10,
    fontWeight: 800,
    color: '#374151',
    textAlign: 'right',
    marginRight: 2,
    minWidth: 36,
  },

  subtitle: {
    marginTop: 12,
    opacity: 0.9,
    fontWeight: 500,
    fontSize: 13,
  },

  dateBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,255,255,0.12)',
    padding: '14px 14px',
    borderRadius: 10,
  },

  dateLabel: {
    fontSize: 11,
    opacity: 0.8,
  },

  dateValue: {
    fontSize: 12,
    fontWeight: 700,
  },

  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr',
    gap: 10,
    alignItems: 'start',
    minHeight: 320,
  },

  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #dbe4f0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    maxHeight: 340,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },

  cardHeader: {
    background: 'linear-gradient(90deg,#0a4cb3,#1d4ed8)',
    color: '#fff',
    padding: '8px 12px',
    fontWeight: 900,
    fontSize: 9,
    letterSpacing: 0.2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    whiteSpace: 'nowrap',
    flexWrap: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  kpiRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    padding: '6px 10px',
    flex: 1,
    gap: 10,
  },

  bigValue: {
    fontSize: 34,
    fontWeight: 800,
    color: '#111827',
  },

  pieCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontWeight: 900,
    fontSize: 18,
    textAlign: 'center',
    pointerEvents: 'none',
  },

  rowTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },

  amount: {
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    lineHeight: 1,
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
    fontSize: 11,
    fontWeight: 800,
    color: '#1d4ed8',
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
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    lineHeight: 1.1,
  },

  kpiLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#2563eb',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  pieWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  kpiLeftBlock: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
  },

  kpiTile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 6,
    gap: 10,
    padding: '5px 0px 18px 18px',
    width: '100%',
    minWidth: 0,
  },

  kpiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  kpiContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start', // IMPORTANT
    gap: 2,
    textAlign: 'left', // IMPORTANT
    width: '100%',
    minWidth: 0,
  },

  kpiTopLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2563eb',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap', // IMPORTANT
  },

  kpiMainValue: {
    fontSize: 20,
    fontWeight: 800,
    color: '#2563eb',
    lineHeight: 1.1,
  },

  kpiDivider: {
    height: 1,
    background: '#e5e7eb',
    margin: '6px 0',
    width: '100%',
  },

  kpiSubLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 600,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    position: 'relative',
    zIndex: 2,
  },

  kpiSubValue: {
    fontSize: 13,
    fontWeight: 800,
    color: '#0f172a',
    marginTop: 4,
    position: 'relative',
    zIndex: 1,
  },

  kpiSubOverlay: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
  },

  percentInline: {
    width: 30,
    fontSize: 9,
    fontWeight: 800,
    color: '#374151',
    textAlign: 'left',
  },

  totalRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    alignItems: 'center',
    padding: '8px 10px',
    borderTop: '1px solid black',
    background: 'transparent',
  },

  totalLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: '#1d4ed8',
    letterSpacing: 0.5,
  },

  totalAmount: {
    fontSize: 12,
    fontWeight: 900,
    color: '#1d4ed8',
  },

  totalPercent: {
    fontSize: 12,
    fontWeight: 900,
    color: '#1d4ed8',
    textAlign: 'left',
  },

  stickyHeader: {
    display: 'grid',
    gridTemplateColumns: '2.4fr 1fr 1.2fr', // OK
    padding: '9px 12px',
    fontSize: 10,
    fontWeight: 800,
    color: '#475569',
    background: '#f1f5f9',
    borderBottom: '2px solid #cbd5e1',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap', // IMPORTANT
    overflow: 'hidden',
  },

  cellFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },

  badge: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    boxShadow: 'none',
  },

  progressBarAnimated: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 1s ease-in-out',
  },

  progressCell: {
    display: 'flex',
    gridTemplateColumns: '42px 1fr',
    alignItems: 'center',
    gap: 4,
  },

  progress: {
    flex: 1,
    height: 8,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },

  tableHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '2.4fr 1fr 1.2fr',
    gridAutoColumns: 'minmax(0, 1fr)',
    padding: '9px 12px',
    fontSize: 10,
    fontWeight: 800,
    color: '#475569',
    background: '#f1f5f9',
    borderBottom: '2px solid #cbd5e1',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  saasRow: {
    display: 'grid',
    gridTemplateColumns: '2.4fr 1fr 1.2fr', // EXACT MATCH
    alignItems: 'center',
    height: 54, // 👈 fixe
    padding: '0 12px',
    borderBottom: '1px solid #eef2f7',
  },

  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },

  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '0.65fr 1.07fr 1.60fr',
    gap: 5,
    marginTop: 10,
    alignItems: 'stretch',
    minHeight: 200,
  },

  globalGrid: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '4px 6px',
  },

  globalIndicators: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    justifyContent: 'center',
  },

  donutBox: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  donutCenterGreen: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    fontSize: 16,
    fontWeight: 900,
    color: '#16a34a',
  },

  blueValue: {
    color: '#2563eb',
    fontWeight: 900,
    fontSize: 10,
    lineHeight: 1.1,
  },

  greenValue: {
    color: '#16a34a',
    fontWeight: 800,
    fontSize: 10,
  },

  donutGrid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 2,
    padding: 3,
    alignItems: 'start',
    gridAutoRows: '1fr',
  },

  donutGrid6: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 2,
    padding: 3,
    alignItems: 'stretch',
  },

  donutCard: {
    position: 'relative',
    background: '#f8fafc',
    borderRadius: 8,
    padding: '6px 4px',
    textAlign: 'center',
    minHeight: 170,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  donutCenterSmall: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontWeight: 900,
    fontSize: 14,
    pointerEvents: 'none',
  },

  twoCols: {
    display: 'flex',
    justifyContent: 'space-between',
    gridTemplateColumns: '1fr 1px 1fr',
    alignItems: 'stretch', // IMPORTANT
    width: '100%',
    marginTop: 'auto',
    paddingTop: 10,
    gap: 6,
    fontSize: 5,
    overflow: 'hidden',
    position: 'relative',
  },

  smallLabel: {
    fontSize: 5.5,
    fontWeight: 900,
    color: '#64748b',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    letterSpacing: 0,
  },

  label: {
    fontSize: 7,
    color: '#64748b',
    fontWeight: 700,
    lineHeight: 1,
  },

  verticalSeparator: {
    width: 1,
    background: '#e2e8f0',
    alignSelf: 'stretch', // 🔥 clé
  },

  money: {
    fontWeight: 900,
    fontSize: 6.5,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'visible',
    flexShrink: 0,
    lineHeight: 1,
  },

  colBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 0,
  },

  donutWrapper: {
    position: 'relative',
    width: '100%',
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 1.2fr',
    alignItems: 'start',
    gap: 6,
    padding: '4px 8px',
    background: '#ffffff',
    border: '1px solid #dbe4f0',
    borderRadius: 10,
  },
  
  footerLegend: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: 6,
    fontSize: 10,
    fontWeight: 700,
    color: '#334155',
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    display: 'inline-block',
  },
  
  footerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: '#475569',
    fontWeight: 600,
    transform: 'translateY(-4px)',
    paddingTop: 2,
  },
  
  footerCTA: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 2,
    background: '#ecfdf5',
    padding: '4px 8px',
    borderRadius: 8,
    border: '1px solid #a7f3d0',
    transform: 'translateY(-4px)',
  },
  
  ctaIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#d1fae5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
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

  footerHeader: {
    gridColumn: '1 / -1',
    fontSize: 11,
    fontWeight: 800,
    marginTop: 10,
    color: '#1d4ed8',
    marginBottom: 0,
    letterSpacing: 0.4,
    
  },
};
