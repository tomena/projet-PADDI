import React, { useState, useMemo, useEffect } from "react";
import {Trees,MapPinned,Flame,TrendingDown,BadgePercent, Medal,Calendar, MapPin, Slash, TreePine, X, BarChart3,TrendingUp, ShieldCheck
} from "lucide-react";
import {ResponsiveContainer,ComposedChart,BarChart,LineChart,Bar,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,LabelList,ReferenceLine,Cell,
} from "recharts";

const data = [
  {
    commune: "Tsaramandroso",
    superficie: 859.77,
    perte: 1540,
    annee: 2019,
    ap: "Ankarafantsika",
  },
  {
    commune: "Marosakoa",
    superficie: 497.34,
    perte: 1480,
    annee: 2019,
    ap: "Ankarafantsika",
  },
  {
    commune: "Marenireno",
    superficie: 288.99,
    perte: 910,
    annee: 2019,
    ap: "Ankarafantsika",
  },
  {
    commune: "Madirovalo",
    superficie: 219.42,
    perte: 620,
    annee: 2019,
    ap: "Ankarafantsika",
  },
  {
    commune: "Andranofasika",
    superficie: 181.8,
    perte: 75,
    annee: 2019,
    ap: "Ankarafantsika",
  },
];

//========================
// GRAPHIQUE 1
//========================

const chart1 = [
  { commune: "Tsaramandroso", superficie: 859.77, pct: 55.9 },
  { commune: "Marosakoa", superficie: 497.34, pct: 67.8 },
  { commune: "Manerinerina", superficie: 288.99, pct: 76.9 },
  { commune: "Madirovalo", superficie: 219.42, pct: 84.6 },
  { commune: "Andranofasika", superficie: 181.80, pct: 84.6 },
];


//========================
// GRAPHIQUE 2
//========================

const chart2 = [
  { commune:"Andranofasika", y2018:120, y2019:180 },
  { commune:"Ankijabe", y2018:400, y2019:120 },
  { commune:"Madirovalo", y2018:580, y2019:60 },
  { commune:"Manerinerina", y2018:580, y2019:100 },
  { commune:"Tsaramandroso", y2018:1580, y2019:200 },
  { commune:"Ambolomoty", y2018:10, y2019:5 },
  { commune:"Ankazomborona", y2018:930, y2019:90 },
  { commune:"Marosakoa", y2018:1460, y2019:440 },
  { commune:"Marovoay Banlieu", y2018:0, y2019:0 },
  { commune:"Tsararano", y2018:930, y2019:90 },
  { commune:"Autres", y2018:60, y2019:80 },
];


//========================
// GRAPHIQUE 3
//========================

const chart3 = [
  { commune:"Andranofasika", y2018:120, y2019:180 },
  { commune:"Ankijabe", y2018:400, y2019:120 },
  { commune:"Madirovalo", y2018:580, y2019:60 },
  { commune:"Manerinerina", y2018:580, y2019:100 },
  { commune:"Tsaramandroso", y2018:1580, y2019:200 },
  { commune:"Ambolomoty", y2018:10, y2019:5 },
  { commune:"Ankazomborona", y2018:930, y2019:90 },
  { commune:"Marosakoa", y2018:1460, y2019:440 },
  { commune:"Marovoay Banlieu", y2018:0, y2019:0 },
  { commune:"Tsararano", y2018:930, y2019:90 },
];

//========================
// GRAPHIQUE 4
//========================

const chart4 = [
  { commune:"Ankazomborona", superficie:11586.78, pct:18.6 },
  { commune:"Tsaramandroso", superficie:11011.86, pct:37.2 },
  { commune:"Marosakoa", superficie:10888.83, pct:53.7 },
  { commune:"Madirovalo", superficie:8476.92, pct:67.3 },
  { commune:"Ankijabe", superficie:5559.84, pct:76.2 },
];

//========================
// GRAPHIQUE 5
//========================

const chart5 = [
{annee:2002,taux:0},
{annee:2003,taux:0.2},
{annee:2004,taux:0.1},
{annee:2005,taux:3},
{annee:2006,taux:0},
{annee:2007,taux:0},
{annee:2008,taux:0},
{annee:2009,taux:0},
{annee:2010,taux:0.2},
{annee:2011,taux:0},
{annee:2012,taux:1.4},
{annee:2013,taux:1.7},
{annee:2014,taux:0.7},
{annee:2015,taux:5},
{annee:2016,taux:3.2},
{annee:2017,taux:2.8},
{annee:2018,taux:1},
{annee:2019,taux:1.3},
{annee:2020,taux:2.8},
{annee:2021,taux:3.1},
{annee:2022,taux:2.8},
{annee:2023,taux:0.7},
];

//========================
// GRAPHIQUE 6
//========================

const chart6 = [
{annee:2001,valeur:1200},
{annee:2002,valeur:2300},
{annee:2003,valeur:2000},
{annee:2004,valeur:8200},
{annee:2005,valeur:2500},
{annee:2006,valeur:1000},
{annee:2007,valeur:1800},
{annee:2008,valeur:2700},
{annee:2009,valeur:1000},
{annee:2010,valeur:3200},
{annee:2011,valeur:5800},
{annee:2012,valeur:2800},
{annee:2013,valeur:8400},
{annee:2014,valeur:6800},
{annee:2015,valeur:6100},
{annee:2016,valeur:2200},
{annee:2017,valeur:2600},
{annee:2018,valeur:4700},
{annee:2019,valeur:4000},
{annee:2020,valeur:1500},
];

interface CardProps {
    title: string;
    value: string;
    color: string;
    icon: React.ReactNode;
    index?: number;
  }

  const KPICard = ({
    title,
    value,
    color,
    icon,
    index,
    commune,
    taux
   }: CardProps) => {
    const isSixth = index === 5; // 👈 6e carte
  
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 5,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: 100,
          transition: "all 0.2s ease",
          cursor: "pointer",
        }}
      >
        {/* ================== 6e CARTE SPÉCIALE ================== */}
        {isSixth ? (
          <>
            {/* TITRE inchangé */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                marginBottom: 8,
                color,
              }}
            >
              {title}
            </div>
  
            {/* CONTENU SPÉCIAL */}
            <div
              style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                width:"100%",
              }}
            >
              <div
                style={{
                  color,
                  display:"flex",
                  alignItems:"center"
                }}
              >
                {icon}
              </div>
              <div
                style={{
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  textAlign:"center",
                }}
              >

                <div
                  style={{
                    fontSize:16,
                    fontWeight:700,
                    color:"#dc2626"
                  }}
                >
                  {commune || "-"}
                </div>
                <div
                  style={{
                    fontSize:13,
                    fontWeight:600
                  }}
                >
                  <span style={{color:"#2563eb"}}>
                    avec une perte
                  </span>{" "}

                  <span
                    style={{
                      color:"#dc2626",
                      fontWeight:800
                    }}
                  >
                    {taux !== undefined
                      ? taux.toFixed(1)
                      : "0.0"
                    }%
                  </span>
                </div>
                <div
                  style={{
                    fontSize:11,
                    color:"#2563eb",
                    fontWeight:600,
                    marginTop:8,
                  }}
                >
                  de sa couverture forestière
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* TITRE */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                marginBottom: 10,
                color,
              }}
            >
              {title}
            </div>
  
            {/* ICON + VALUE */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <div style={{ color }}>{icon}</div>
  
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color,
                }}
              >
                {value}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };


  const renderArrow = (props: any) => {
    if (!props || !props.payload) return null;
  
    const diff = (props.payload.y2019 ?? 0) - (props.payload.y2018 ?? 0);
  
    let symbol = "→";
    let color = "#999";
  
    if (diff > 0) {
      symbol = "▲";
      color = "#2e7d32";
    } else if (diff < 0) {
      symbol = "▼";
      color = "#d32f2f";
    }
  
    return (
      <text
        x={props.x + props.width / 2}
        y={props.y - 10}
        textAnchor="middle"
        fontSize={12}
        fontWeight="bold"
        fill={color}
      >
        {symbol}
      </text>
    );
  };

  const Graphique1 = () => {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          padding: 10,
          marginBottom:5,
          boxShadow: "0 1px 3px rgba(0,0,0,.05)",
          height: 280,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#d32f2f",
            fontSize:12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 2,
          }}
        >
          Communes les plus affectées en {2019}
        </div>  
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chart1}>

            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#e5e7eb" />

            <XAxis
              dataKey="commune"
              angle={-25}
              interval={0}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 10 }}
              padding={{ left: 0, right: 0 }}
            />

            <YAxis
              yAxisId="left"
              domain={[0, "dataMax"]}
              tick={{ fontSize: 11 }}
            />

            <Bar
              yAxisId="left"
              name="Superficie"
              dataKey="superficie"
              fill="url(#blueGradient)"
              barSize={45}
              radius={[3, 3, 0, 0]}
            >
              <LabelList
                dataKey="superficie"
                position="insideTop"
                fill="#ffffff"
                fontSize={9}
                fontWeight={600}
              />
            </Bar>

            <Line
              name="Cumul (%)"
              yAxisId="right"
              type="monotone"
              dataKey="pct"
              stroke="#9e9e9e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2 }}
            >
              <LabelList
                dataKey="pct"
                position="top"
                formatter={(v: number) => `${v}%`}
                fill="#000"
                style={{ fontWeight: "bold", fontSize: 11 }}
              />
            </Line>

            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 600,
                color: "#1565c0",
              }}
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const chart2Pro = chart2
  .map(d => {
    const variation = ((d.y2019 - d.y2018) / d.y2018) * 100;

    return {
      ...d,
      variation: Number(variation.toFixed(1))
    };
  })
  .sort((a, b) => b.y2019 - a.y2019);

  const Graphique2Pro = () => {
    const chart2Pro = chart2
      .map(d => {
        const variation = ((d.y2019 - d.y2018) / d.y2018) * 100;
  
        return {
          ...d,
          variation: Number(variation.toFixed(1))
        };
      })
      .sort((a, b) => b.y2019 - a.y2019);
  
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          padding: 10,
          marginBottom: 5,
          boxShadow: "0 1px 3px rgba(0,0,0,.05)",
          height: 280,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#d32f2f",
            fontSize:12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 10,
          }}
        >
          Déforestation par Commune à l'intérieur de l'Aire Protégée
        </div>
  
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chart2Pro} barGap={2} barCategoryGap="10%"> 
  
            <XAxis
              dataKey="commune"
              angle={-25}
              interval={0}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 10 }}
              padding={{ left: 10, right: 10 }}
            />
  
            <YAxis
              domain={[0, (dataMax: number) => Math.ceil(dataMax / 100) * 100]}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 600,
                color: "#1565c0",
              }}
            />
  
            <YAxis
                domain={[0, 'dataMax']}
                tick={{ fontSize: 11 }}
                allowDecimals={false}
              />

              <Bar
                dataKey="y2018"
                name="2018"
                fill="#fdba74"
                opacity={0.85}
                barSize={13}
                radius={[3, 3, 0, 0]}
              />
              
              <Bar
                dataKey="y2019"
                name="2019"
                fill="#c2410c"
                barSize={13}
                radius={[3, 3, 0, 0]}
              />
              <LabelList content={renderArrow} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const chart3Pro = chart3
  .map(d => {
    const variation = ((d.y2019 - d.y2018) / d.y2018) * 100;

    return {
      ...d,
      variation: Number(variation.toFixed(1)),
      trend: d.y2019 > d.y2018 ? "up" : d.y2019 < d.y2018 ? "down" : "stable"
    };
  })
  .sort((a, b) => a.commune.localeCompare(b.commune));

  const Graphique3 = () => {

    const chart3Pro = chart3
      .map(d => {
        const variation = d.y2018
          ? ((d.y2019 - d.y2018) / d.y2018) * 100
          : 0;
  
        return {
          ...d,
          variation: Number(variation.toFixed(1)),
        };
      })
      .sort((a, b) => a.commune.localeCompare(b.commune));
  
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          padding: 10,
          marginBottom: 5,
          boxShadow: "0 1px 3px rgba(0,0,0,.05)",
          height: 280,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#d32f2f",
            fontSize:12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 5,
          }}
        >
          Déforestation dans les Communes riveraines
        </div>
  
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart3Pro}>
            <CartesianGrid stroke="#e5e7eb" />
  
            <XAxis
              dataKey="commune"
              angle ={-25}
              interval={0}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 10 }}
              padding={{ left: 10, right: 10 }}
            />
  
            <YAxis
              domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]}
              tick={{ fontSize: 12 }}
            />
  
            <Legend
              verticalAlign="top"
              align="center"
              iconType="line"
              wrapperStyle={{
                fontSize: 12,
                fontWeight: 600,
                color: "#1565c0",
              }}
            />
  
            {/* 2018 */}
            <Line
              type="monotone"
              dataKey="y2018"
              name="2018"
              stroke="#90caf9"
              margin={{ bottom: 20 }}
              strokeWidth={2}
              dot={{ r: 1 }}
            />
  
            {/* 2019 */}
            <Line
              type="monotone"
              dataKey="y2019"
              name="2019"
              stroke="#1d4ed8"
              strokeWidth={2}
              margin={{ bottom: 20 }}
              dot={{ r: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const chart4Pro = chart4
  .sort((a, b) => b.superficie - a.superficie)
  .map((d, index, arr) => {
    const total = arr.reduce((sum, x) => sum + x.superficie, 0);
    const cumulated = arr
      .slice(0, index + 1)
      .reduce((sum, x) => sum + x.superficie, 0);

    return {
      ...d,
      pctCum: Number(((cumulated / total) * 100).toFixed(1)),
    };
  });

  const Graphique4 = () => {
    const chart4Pro = chart4
      .sort((a, b) => b.superficie - a.superficie)
      .map((d, index, arr) => {
        const total = arr.reduce((sum, x) => sum + x.superficie, 0);
        const cumulated = arr
          .slice(0, index + 1)
          .reduce((sum, x) => sum + x.superficie, 0);
  
        return {
          ...d,
          pctCum: Number(((cumulated / total) * 100).toFixed(1)),
        };
      });
  
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          padding: 10,
          height: 280,
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#b91c1c",
            fontSize:12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 5,
          }}
        >
          Communes les plus touchées depuis 2001 jusqu'en {2019}
        </div>
  
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart4Pro} margin={{ top: 10, bottom: 15 }} barCategoryGap="25%">
            <CartesianGrid stroke="#f3f4f6" />
  
            <XAxis
              dataKey="commune"
              angle={-25}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
              height={60}
            />
  
            <YAxis
              yAxisId="left"
              domain={[0, "dataMax"]}
              tick={{ fontSize: 11 }}
            />
  
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 5,
              }}
            />
  
            {/* BAR ROUGE */}
            <Bar
              yAxisId="left"
              dataKey="superficie"
              name="Superficie (ha)"
              fill="url(#redGradient)"
              barSize={40}
              radius={[3, 3, 0, 0]}
            >

            <LabelList
              dataKey="superficie"
              position="insideTop"
              fill="#ffffff"
              fontSize={9}
              fontWeight={600}
            />

            </Bar>
  
            {/* LINE CUMUL */}
            <Line
              name="Cumul (%)"
              yAxisId="right"
              type="monotone"
              dataKey="pct"
              stroke="#9e9e9e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2 }}
            >
              <LabelList
                dataKey="pct"
                position="top"
                formatter={(v: number) => `${v}%`}
                fill="#000"
                style={{ fontWeight: "bold", fontSize: 11 }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
  
        {/* GRADIENT ROUGE */}
        <svg width="0" height="0">
          <defs>
            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };


  
export default function Deforestation() {
  const [year, setYear] = useState<number>(2019);
  const [ap, setAp] = useState<string>("Ankarafantsika");
  const [baseDeforestation,setBaseDeforestation]=useState<any[]>([]);

  useEffect(() => {

    fetch("/data/Bases_Deforestation.geojson")
    .then(res => res.json())
    .then(data => {    
    console.log("Deforestation chargée :",data.features.length);    
    setBaseDeforestation(data.features);    
    });
    
    },[]);

    const dataAP = useMemo(()=>{
      return baseDeforestation.filter(
      f =>
      String(f.properties.AP)
      .trim()
      .toLowerCase()
      ===
      String(ap)
      .trim()
      .toLowerCase()
      );
      
      },[
      baseDeforestation,
      ap
      ]);

      useEffect(() => {
        console.log("AP :", ap);
        console.log("Nombre de lignes :", dataAP.length);
      
        if (dataAP.length > 0) {
          console.log(dataAP[0].properties.AP);
        }
      }, [ap, dataAP]);

      const dataCommunes = useMemo(() => {
        return dataAP.filter(f =>
          String(f.properties.Source)
            .trim()
            .toLowerCase() === "commune"
        );
      }, [dataAP]);
      
      const dataInterieur = useMemo(() => {
        return dataAP.filter(f =>
          String(f.properties.Source)
            .trim()
            .toLowerCase() === "interrieur"
        );
      }, [dataAP]);

      const couverture2000 = useMemo(() => {
        return baseDeforestation
          .filter(f => {      
            const p = f.properties;      
            return (
              p.AP === ap &&
              String(p.Source)
                .trim()
                .toLowerCase() === "commune"
            );      
          })
          .reduce(
            (total, f) =>
              total +
              Number(f.properties.Couverture2000 || 0),
            0
          );      
      }, [
        baseDeforestation,
        ap
      ]);

      const getPerteCumulee = (
        properties: any,
        annee: number
      ) => {
        return Object.keys(properties)
          .filter(key =>
            Number(key) >= 2001 &&
            Number(key) <= annee
          )
          .reduce(
            (total, key) =>
              total + Number(properties[key] || 0),
            0
          );
      };

      const superficieRestante = useMemo(()=>{
        const superficieCommuneRestante =
          dataAP
          .filter(f =>
            String(f.properties.Source)
            .trim()
            .toLowerCase() === "commune"
          )
          .reduce((total,f)=>{
            const p = f.properties;
            const perte =
              getPerteCumulee(
                p,
                year
              );
            return total +
              (
                Number(p.Couverture2000 || 0)
                -
                perte
              );
          },0);
        const superficieInterieurRestante =
          dataAP
          .filter(f =>
            String(f.properties.Source)
            .trim()
            .toLowerCase() === "interrieur"
          )
          .reduce((total,f)=>{
            const p = f.properties;
            const perte =
              getPerteCumulee(
                p,
                year
              );
            return total +
              (
                Number(p.Couverture2000 || 0)
                -
                perte
              );
          },0);
        return superficieCommuneRestante -
               superficieInterieurRestante;
      },[
       dataAP,
       year
      ]);

      const perteAnnee = useMemo(()=>{
        return dataAP
          .filter(f =>
            String(f.properties.Source)
            .trim()
            .toLowerCase() === "interrieur"
          )
          .reduce(
            (total,f)=>
              total +
              Number(
                f.properties[String(year)] || 0
              ),
            0
          );
      },[
        dataAP,
        year
      ]);

      const moyenneAnnuelle = useMemo(()=>{
        const pertes = dataAP
          .filter(f =>
            String(f.properties.Source)
              .trim()
              .toLowerCase() === "commune"
          )
          .flatMap(f=>{
      
            return Object.keys(f.properties)
              .filter(key =>
                Number(key)>=2001 &&
                Number(key)<=year
              )
              .map(key =>
                Number(f.properties[key] || 0)
              );
          });
        if(pertes.length===0)
          return 0;
        return (
          pertes.reduce(
            (a,b)=>a+b,
            0
          )
          /
          pertes.length
        );
      },[
       dataAP,
       year
      ]);

      const tauxPerte = useMemo(()=>{
        const couvertureInitiale = dataAP
          .filter(f =>
            String(f.properties.Source)
              .trim()
              .toLowerCase() === "commune"
          )
          .reduce(
            (total,f)=>
              total +
              Number(f.properties.Couverture2000 || 0),
            0
          );
        const perteCumulee = dataAP
          .filter(f =>
            String(f.properties.Source)
              .trim()
              .toLowerCase() === "commune"
          )
          .reduce(
            (total,f)=>
              total +
              getPerteCumulee(
                f.properties,
                year
              ),
            0
          );
        return couvertureInitiale > 0
          ?
          (perteCumulee / couvertureInitiale) * 100
          :
          0;
      },[
        dataAP,
        year
      ]);

      const communeImpactee = useMemo(() => {
        // 1. Trouver la commune qui a perdu le plus de superficie l'année choisie
        const communeMax = dataCommunes.reduce(
          (max, f) => {
            const perteAnnee =
              Number(
                f.properties[String(year)] || 0
              );
            if(perteAnnee > max.perte){
              return {
                commune: f.properties.Commune,
                perte: perteAnnee
              };
            }
            return max;
          },
          {
            commune:"",
            perte:0
          }
        );
        // aucune donnée
        if(!communeMax.commune){
          return {
            commune:"-",
            perte:0,
            taux:0
          };
        }
        // 2. Retrouver la ligne de cette commune
        const ligne = dataCommunes.find(
          f =>
            f.properties.Commune === communeMax.commune
        );
        if(!ligne){
          return {
            commune:"-",
            perte:0,
            taux:0
          };
        }
        const p = ligne.properties;
        // 3. Calcul de la perte cumulée depuis 2001 jusqu'à l'année choisie
        const perteCumulee =
          Object.keys(p)
            .filter(key =>
              Number(key)>=2001 &&
              Number(key)<=year
            )
            .reduce(
              (total,key)=>
                total +
                Number(p[key] || 0),
              0
            );
        // 4. Taux cumulé par rapport à la couverture 2000
        const taux =
          Number(p.Couverture2000)>0
            ?
            (perteCumulee /
            Number(p.Couverture2000))*100
            :
            0;
        return {
          commune: communeMax.commune,
          perte: communeMax.perte,
          taux
        };
      },[
        dataCommunes,
        year
      ]);
    
  const maxChart6 =chart6 && chart6.length>0
                ?
                Math.max(...chart6.map(d=>d.valeur))
                :
                0;

  console.log("Commune impactée :", communeImpactee);


  const communesMoinsDeforestees = useMemo(()=>{
    const communes = dataAP
      .filter(f =>
        String(f.properties.Source)
          .trim()
          .toLowerCase() === "commune"
      )
      .map(f=>{
        const p = f.properties;
        // perte uniquement de l'année choisie
        const perteAnnee =
          Number(
            p[String(year)] || 0
          );
        // pertes avant l'année choisie
        const perteAvant =
          Object.keys(p)
            .filter(key =>
              Number(key)>=2001 &&
              Number(key)<year
            )
            .reduce(
              (total,key)=>
                total +
                Number(p[key] || 0),
              0
            );
        // couverture restante avant cette année
        const couvertureRestante =
          Number(p.Couverture2000 || 0)
          -
          perteAvant;
        // taux de perte de l'année choisie
        const taux =
          couvertureRestante > 0
          ?
          (perteAnnee / couvertureRestante)*100
          :
          0;
        return {
          commune:p.Commune,
          taux:taux,
          perte:perteAnnee
        };
      });
    return communes
      .sort((a,b)=>a.taux-b.taux)
      .slice(0,3);
  },[
    dataAP,
    year
  ]);

  const kpis = useMemo(() => [
    {
      title: "Couverture forestière des Communes riveraines (2000)",
      value:`${couverture2000.toLocaleString()} ha`,
      color: "#2e7d32",
      icon: <Trees size={40} />,
    },
    {
      title: `Superficie restante autour de l'Aire Protégée en ${year}`,
      value:`${superficieRestante.toLocaleString(undefined,{maximumFractionDigits:2})} ha`,
      color: "#2e7d32",
      icon: <Trees size={40} />,
    },
    {
      title: `Superficie perdue à l'intérieur de l'Aire Protégée en ${year}`,
      value:`${perteAnnee.toLocaleString(undefined,{maximumFractionDigits:2})} ha`,
      color: "#c40000",
      icon: (
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <TreePine size={40} color="#c40000" />
        </div>
      ),
    },
    {
      title: "Superficie moyenne annuelle de déforestation",
      value:`${moyenneAnnuelle.toLocaleString(undefined,{maximumFractionDigits:2})} ha/an`,
      color: "#c40000",
      icon: <TrendingDown size={40} />,
    },
    {
      title: "Taux cumulé de perte forestière",
      value:`${tauxPerte.toFixed(2)}%`,
      color: "#ff6600",
      icon: (
        <div style={{ position: "relative" }}>
          <BarChart3 size={40} color="#ff6600" />
          <TrendingUp
            size={30}
            color="#00c853"
            style={{ position: "absolute", top: 0, right: 0 }}
          />
        </div>
      ),
    },
    {
      title: "Commune la plus touchée",
      value:"",commune: communeImpactee?.commune,taux: communeImpactee?.taux,
      color: "#003399",
      icon: <MapPinned size={40} />,
    },
  ], [
    year,
    ap,
    couverture2000,
    superficieRestante,
    perteAnnee,
    moyenneAnnuelle,
    tauxPerte,
    communeImpactee
  ]);

  const n = chart6.length;

let sumX = 0;
let sumY = 0;
let sumXY = 0;
let sumX2 = 0;

chart6.forEach((d, i) => {
  const x = i + 1;
  const y = Math.log(d.valeur);

  sumX += x;
  sumY += y;
  sumXY += x * y;
  sumX2 += x * x;
});

const b =
  (n * sumXY - sumX * sumY) /
  (n * sumX2 - sumX * sumX);

const a = Math.exp((sumY - b * sumX) / n);

const chart6Trend = chart6.map((d, i) => ({
  ...d,
  tendance: a * Math.exp(b * (i + 1)),
}));

const maxValue = Math.max(...chart6Trend.map(d => d.valeur));

  return (
    <div
        style={{
          padding: 16,
          background: "#eef3f8",
          minHeight: "100vh",
        }}
      >
      {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 5,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
        {/* TITRE */}
        <h2
          style={{
            margin: 0,
            color: "#0b4ea2",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Suivi de la déforestation
        </h2>

        {/* FILTRES */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          {/* ===== ANNÉE ===== */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 100,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 5,
              }}
            >
              <Calendar size={14} />
              Année
            </div>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                fontWeight: 600,
                fontSize: 12,
                textAlign: "center",
                outline: "none",
                cursor: "pointer",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.border = "1px solid #2563eb")
              }
              onBlur={(e) =>
                (e.currentTarget.style.border = "1px solid #d1d5db")
              }
            > <option value={2001}>2001</option>
              <option value={2002}>2002</option>
              <option value={2003}>2003</option>
              <option value={2004}>2004</option>
              <option value={2005}>2005</option>
              <option value={2006}>2006</option>
              <option value={2007}>2007</option>
              <option value={2008}>2008</option>
              <option value={2009}>2009</option>
              <option value={2010}>2010</option>
              <option value={2011}>2011</option>
              <option value={2012}>2012</option>
              <option value={2013}>2013</option>
              <option value={2014}>2014</option>
              <option value={2015}>2015</option>
              <option value={2016}>2016</option>
              <option value={2017}>2017</option>
              <option value={2018}>2018</option>
              <option value={2019}>2019</option>
              <option value={2020}>2020</option>
              <option value={2021}>2021</option>
              <option value={2022}>2022</option>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {/* ===== AIRE PROTÉGÉE ===== */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 160,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "left",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 5,
              }}
            >
              <MapPin size={14} />
              Aire protégée
            </div>

            <select
              value={ap}
              onChange={(e) => setAp(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                fontWeight: 600,
                fontSize: 12,
                textAlign: "left",
                outline: "none",
                cursor: "pointer",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.border = "1px solid #2563eb")
              }
              onBlur={(e) =>
                (e.currentTarget.style.border = "1px solid #d1d5db")
              }
            >
              <option>Analamerana</option>
              <option>Andohahela</option>
              <option>Ankarafantsika</option>
              <option>Ankarana</option>
              <option>Befotaka-Midongy</option>
              <option>Marolambo</option>
              <option>Montagne d'Ambre</option>
            </select>
          </div>
        </div>
      </div>

      <div
style={{
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  marginBottom:6,
  padding:10,
  background:"#fff",
  border:"1px solid #e5e7eb",
  borderRadius:10,
}}
>

{/* TITRE */}
<div
style={{
  display:"flex",
  alignItems:"center",
  gap:8,
  fontWeight:700,
  color:"#003399",
  fontSize:13,
  whiteSpace:"nowrap",
}}
>

<ShieldCheck
size={18}
color="#16a34a"
/>

Communes les moins déforestées par rapport à leur couverture forestière en {year}

</div>


{/* CLASSEMENT */}
<div
style={{
  display:"flex",
  justifyContent:"flex-end",
  alignItems:"center",
  fontSize:12,
  gap:18,
  width:"100%",
}}
>

{
communesMoinsDeforestees.map((item,index)=>{

const medals = [
"gold",
"silver",
"#cd7f32"
];

return (

<div
key={item.commune}
style={{
display:"flex",
alignItems:"center",
gap:6
}}
>

<Medal
color={medals[index]}
/>

<span>
{item.commune}
</span>

<span
style={{
color:"#16a34a",
fontWeight:600
}}
>
(
{item.taux.toFixed(2)}%
)
</span>

</div>

)

})
}

</div>

</div>


<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr 0.9fr 1.2fr",
    gap: 2,
    marginBottom: 5,
  }}
>
{kpis.map((k, i) => (
  <KPICard
    key={i}
    index={i}
    title={k.title}
    value={k.value}
    color={k.color}
    icon={k.icon}
    commune={k.commune}
    taux={k.taux}
  />
))}
</div>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 5,
    marginTop: 5,
    alignItems: "stretch",
  }}
>
<div style={{ width: "100%" }}>
      <Graphique1 />
    </div>

    <div style={{ width: "100%" }}>
      <Graphique2Pro />
    </div>

    <div style={{ width: "100%" }}>
      <Graphique3 />
    </div>

    <div style={{ width: "100%" }}>
      <Graphique4 />
    </div>

{/* =====================EVOLUTION DU TAUX ===================== */}
<div
  style={{
    background: "#fff",
    border: "1px solid #d9d9d9",
    borderRadius: 8,
    padding: 10,
    height: 280,
    boxSizing: "border-box",
    overflow: "hidden"
  }}
>
        <div
          style={{
            textAlign: "center",
            color: "#d32f2f",
            fontSize:12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 10,
          }}
        >
    Tendance de taux de déforestation à l'intérieur de l'Aire Protégée
  </div>

  <ResponsiveContainer width="100%" height="100%">
    <LineChart
        data={chart5}
        margin={{ left: 0, right: 10, top: 10, bottom: 10 }}
      >
        <CartesianGrid stroke="#e5e7eb" />

        <XAxis
          dataKey="annee"
          tick={{ fontSize: 11 }}
          height={40}
        />

        <YAxis
          domain={[0, (dataMax: number) => Math.ceil(dataMax)]}
          width={30}
        />

        <Line
          type="linear"
          dataKey="taux"
          stroke="#dc2626"
          strokeWidth={2}
          dot={(props: any) => {
            const { cx, cy } = props;

            return (
              <g>
                <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="#2563eb" strokeWidth={2} />
                <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="#2563eb" strokeWidth={2} />
              </g>
            );
          }}
        />
      </LineChart>
  </ResponsiveContainer>
</div>

{/* ===================== HISTOGRAMME ANNUEL ===================== */}
<div
  style={{
    background: "#fff",
    border: "1px solid #d9d9d9",
    borderRadius: 8,
    padding: 10,
    height: 280,
    boxSizing: "border-box",
    overflow: "hidden"
  }}
>
  <div
          style={{
            textAlign: "center",
            color: "#d32f2f",
            fontSize:12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 5,
          }}
        >
    Evolution annuelle de la perte forestière (ha)
  </div>

  <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chart6Trend}
        barCategoryGap="40%"
      >

        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

      <CartesianGrid stroke="#e5e7eb" />

      <XAxis dataKey="annee" tick={{ fontSize: 11 }} 
      
      />

      <YAxis
        domain={[0, (dataMax: number) => Math.ceil(dataMax / 1000) * 1000]}
        tick={{ fontSize: 11 }}
      />

<Bar
  dataKey="valeur"
  stroke="#1e3a8a"
  strokeWidth={1.5}
  fill="#93c5fd"   // couleur normale plus claire
  barSize={10}
  radius={[3, 3, 0, 0]}
>
  {chart6Trend.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={entry.valeur === maxValue ? "#dc2626" : "#93c5fd"}
    />
  ))}
        <Line
          type="monotone"
          dataKey="tendance"
          stroke="#dc2626"
          strokeWidth={3}
          dot={false}
          activeDot={false}
          strokeDasharray="8 4"
        />
      </Bar>
    </ComposedChart>
  </ResponsiveContainer>
</div>
    
  </div>
  </div>
  );
}
