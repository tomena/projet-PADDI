import React, { useState, useMemo } from "react";
import {Trees,MapPinned,Flame,TrendingDown,BadgePercent, Medal,Calendar, MapPin, Slash, TreePine, X, BarChart3,TrendingUp, ArrowUp, ArrowDown
} from "lucide-react";
import {ResponsiveContainer,ComposedChart,BarChart,LineChart,Bar,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,LabelList,ReferenceLine,Cell,Customized, ReferenceDot, Area
} from "recharts";
import { createRoot } from "react-dom/client";

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
    { mois: "Jan", y2025: 5, y2026: 4 },
    { mois: "Fév", y2025: 0, y2026: 0 },
    { mois: "Mar", y2025: 8, y2026: 4 },
    { mois: "Avr", y2025: 100, y2026: 80 },
    { mois: "Mai", y2025: 1200, y2026: 452},
    { mois: "Juin", y2025: 1482, y2026: 982 },
    { mois: "Juil", y2025: 420, y2026: 1200 },
    { mois: "Août", y2025: 3417, y2026: 0 },
    { mois: "Sep", y2025: 2919, y2026: 0 },
    { mois: "Oct", y2025: 2004, y2026: 0 },
    { mois: "Nov", y2025: 1312, y2026: 0 },
    { mois: "Déc", y2025: 714, y2026: 0 },
  ];

//========================
// GRAPHIQUE 2
//========================

const chart2 = [
  { commune:"Ankarongana", y2025:1645, y2026:820 },
  { commune:"Antsoha", y2025:418, y2026:125 },
  { commune:"Anivorano_Nord", y2025:92, y2026:30 },
  { commune:"Sadjaovato", y2025:0, y2026:0 },
];

//========================
// GRAPHIQUE 4
//========================

const chart4 = [
  { commune:"Ankarongana", superficie:1232.68, pct:49.2 },
  { commune:"Antsoha", superficie:650.76, pct:75.2 },
  { commune:"Anivorano_Nord", superficie:548.64, pct:97.0 },
  { commune:"Sadjaovato", superficie:71.96, pct:100.0 },
  { commune:" ", superficie:0.0, pct:0.0 },
];

//========================
// GRAPHIQUE 5
//========================

const chart5 = [
  {
    commune: "Anivorano_Nord",
    total: 546.64,
    peripherie: 154.80,
    interieur: 0,
  },
  {
    commune: "Ankarongana",
    total: 1232.68,
    peripherie: 164.52,
    interieur: 820.16,
  },
  {
    commune: "Antsoha",
    total: 660.76,
    peripherie: 515.90,
    interieur: 144.86,
  },
  {
    commune: "Sadjoavato",
    total: 71.00,
    peripherie: 0,
    interieur: 0,
  },
];


const impactFeux = [
  {
    commune: "Anivorano_Nord",
    total: 454.64,
    peripherie: 150,
    interieur: 0,
  },
  {
    commune: "Ankarongana",
    total: 1232.05,
    peripherie: 160,
    interieur: 1000,
  },
  {
    commune: "Antsoha",
    total: 650.75,
    peripherie: 500,
    interieur: 200,
  },
  {
    commune: "Sadjoavato",
    total: 71.05,
    peripherie: 0,
    interieur: 0,
  },
];

const ArrowLabel = (props: any) => {
  const { viewBox, payload } = props;

  const diff = payload.y2026 - payload.y2025;

  if (diff === 0) return null;

  const color = diff < 0 ? "#16a34a" : "#dc2626";
  const Icon = diff < 0 ? ArrowDown : ArrowUp;

  return (
    <foreignObject
      x={viewBox.x - 10}
      y={viewBox.y - 10}
      width={30}
      height={30}
    >
      <Icon
        size={15}
        color={color}
        strokeWidth={3}
      />
    </foreignObject>
  );
};

const CustomTotalBar = (props:any) => {
  const {x,y,width,height,payload,background
  } = props;

  const total = payload.total;
  const interieur = payload.interieur;
  const peripherie = payload.peripherie;

  // largeur fixe des deux barres internes
  const innerBarWidth = 18;
  const gap = 4;

  // position horizontale centrée
  const startX = x + (width - (innerBarWidth * 2 + gap)) / 2;

  // conversion hauteur selon le total
  const interieurHeight = (interieur / total) * height;
  const peripherieHeight = (peripherie / total) * height;

  return (
    <g>
      {/* BARRE MERE TOTAL */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#d9edf7"
        rx={2}
      />
      {/* INTERIEUR AP */}
      <rect
        x={startX}
        y={y + height - interieurHeight}
        width={innerBarWidth}
        height={interieurHeight}
        fill="#ff0000"
      />
      {/* PERIPHERIE 5KM */}
      <rect
        x={startX + innerBarWidth + gap}
        y={y + height - peripherieHeight}
        width={innerBarWidth}
        height={peripherieHeight}
        fill="#ffff00"
      />
    </g>
  );
};

interface CardProps {
    title: string;
    value: string;
    color: string;
    icon: React.ReactNode;
    index?: number;
  }
  
  const KPICard = ({ title, value, color, icon, index }: CardProps) => {
    const isSixth = index === 5;
  
    return (
      <div
      style={{
        background: "linear-gradient(to bottom,#ffffff,#f7f7f7)",
        border: "1px solid #d6d6d6",
        borderRadius: 8,
        padding: "8px 12px",
        height: 110,
        boxSizing: "border-box",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    }}
      >
        {/* TITRE */}  
        <div
          style={{
            textAlign: "center",
            color,
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 12,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
  
        {!isSixth ? (
          <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 1fr",
            alignItems: "center",
            flex: 1,
            marginTop: 2,
          }}
        >
          {/* Icône */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color,
            }}
          >
            {icon}
          </div>
        
          {/* Valeur */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color,
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: 18,
            }}
          >
            {value}
          </div>
        </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                color,
                display: "flex",
                alignItems: "center",
              }}
            >
              {icon}
            </div>
  
            <div
              style={{
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#b40000",
                  fontWeight: 800,
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                Ankarongana
              </div>
  
              <div
                style={{
                  color: "#003399",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                avec
              </div>
  
              <div
                style={{
                  color: "#b40000",
                  fontWeight: 800,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                1 232,68 ha
              </div>
  
              <div
                style={{
                  color: "#003399",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                de surface totale brûlée
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderArrow = (props: any) => {
    if (!props || !props.payload) return null;
  
    const diff = (props.payload.y2026 ?? 0) - (props.payload.y2025 ?? 0);
  
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
          borderRadius: 6,
          padding: 5,
          height: 300,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#c62828",
            fontSize: 12,
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: 5,
          }}
        >
          Evolution mensuelle des superficies brûlées par rapport à l'année précédente
        </div>
  
        <ResponsiveContainer width="100%" height="90%">
            
        <LineChart
            data={chart1}
            margin={{ top: 5, left: 0, right: 15, bottom: 0 }}
            >
            <CartesianGrid stroke="#eeeeee" vertical={false} />

            <Tooltip />

            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />

            <Legend
                verticalAlign="top"
                height={25}
                wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
            />
            <Line
                type="natural"
                dataKey="y2025"
                name="2025"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 1 }}
            />
            <Line
                type="natural"
                dataKey="y2026"
                name="2026"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={{ r: 1 }}
            />

            {/*TREND INDICATOR PRO */}
            {chart1.map((d, i) => {
                const diff = d.y2026 - d.y2025;

                const isGood = diff < 0; 
                const isBad = diff > 0;    

                const color = isGood
                  ? "#16a34a"
                  : isBad
                  ? "#dc2626"
                  : "#9ca3af";

                const symbol = isGood ? "▼" : isBad ? "▲" : "—";

                return (
                  <ReferenceDot
                    key={i}
                    x={d.mois}
                    y={(d.y2025 + d.y2026) / 2}
                    r={0}
                    label={{
                      value: `${symbol} ${Math.abs(diff)}`,
                      position: "center",
                      fill: color,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                );
              })}
            </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const chart2Pro = chart2
  .map(d => {
    const variation = ((d.y2026 - d.y2025) / d.y2025) * 100;

    return {
      ...d,
      variation: Number(variation.toFixed(1))
    };
  })
  .sort((a, b) => b.y2026 - a.y2026);

  const Graphique2Pro = ({ ap }) => {

    const chart2Pro = chart2
      .map(d => {
        const variation = ((d.y2026 - d.y2025) / d.y2025) * 100;
  
        return {
          ...d,
          variation: Number(variation.toFixed(1))
        };
      })
      .sort((a, b) => b.y2026 - a.y2026);
  
  
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
  A l'intérieur de l'Aire Protégée {ap}
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
                dataKey="y2025"
                name="2025"
                fill="#fdba74"
                opacity={0.85}
                barSize={13}
                radius={[3, 3, 0, 0]}
              />
              
              <Bar
                dataKey="y2026"
                name="2026"
                fill="#c2410c"
                barSize={13}
                radius={[3, 3, 0, 0]}
              />

              {chart2Pro.map((d, i) => (
                <ReferenceDot
                  key={i}
                  x={d.commune}
                  y={(d.y2025 + d.y2026) / 2}
                  r={0}
                  isFront
                  label={<ArrowLabel payload={d} />}
                />
              ))}
              <LabelList content={renderArrow} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const Graphique3 = () => {
    const chart3Pro = [
      {
        zone: "Au périphérie de 5 km",
        ecart: -6.25,
        moyenne5ans: 10.56,
        anneeDifficile: 12.7,
      },
      {
        zone: "À l'intérieur du parc",
        ecart: 21.12,
        moyenne5ans: 0,
        anneeDifficile: 1.63,
      },
    ];  
    const min = -40;
    const max = 100; 
  
    return (
      <div
        style={{
          background:"#fff",
          border:"1px solid #d9d9d9",
          borderRadius:8,
          padding:10,
          height:280,
        }}
      >  
        <div
          style={{
            textAlign:"center",
            color:"#d32f2f",
            fontSize:12,
            fontWeight:700,
            fontStyle:"italic",
            marginBottom:10
          }}
        >
          Écart entre l'année choisie par rapport aux superficies moyennes
          brûlées sur 5 ans (2020 - 2024)
        </div> 
  
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 400 300"
        >  
          {/* paramètres graphiques */}
          {(() => {  
            const chartHeight = 200;
            const top = 20;
            const bottom = 230;  
            const yScale = (value) =>
              bottom -
              ((value - min) / (max - min)) *
              chartHeight;  
  
            const zeroY = yScale(0); 
  
            return (
              <>  
                {
                  [-40,-20,0,20,40,60,80,100].map((v)=>(
                    <g key={v}>  
                      <line
                        x1="55"
                        x2="560"
                        y1={yScale(v)}
                        y2={yScale(v)}
                        stroke={
                          v===0
                          ? "#555"
                          : "#e5e7eb"
                        }
                      />  
                      <text
                        x="45"
                        y={yScale(v)+4}
                        textAnchor="end"
                        fontSize="11"
                      >
                        {v}%
                      </text>  
                    </g>
                  ))
                } 
                {/* Légende horizontale */}
                  <g>
                    {/* Ligne verte */}
                    <line
                      x1="10"
                      x2="30"
                      y1="5"
                      y2="5"
                      stroke="#00aa55"
                      strokeWidth="5"
                    />
                    <text
                      x="35"
                      y="7"
                      fontSize="11"
                      fontWeight="600"
                    >
                      Moyenne brûlée sur 5 ans (2020-2024)
                    </text>
                    {/* Ligne rouge */}
                    <line
                      x1="240"
                      x2="260"
                      y1="5"
                      y2="5"
                      stroke="red"
                      strokeWidth="5"
                    />
                    <text
                      x="265"
                      y="7"
                      fontSize="11"
                      fontWeight="600"
                    >
                      Moyenne année difficile
                    </text>

                  </g>
                 
                 {
                    chart3Pro.map((d,i)=>{
                      const x = i===0 ? 100 : 250;
                      const width = 80;
                      return(
                        <g key={d.zone}>
                          {/* fond -40 à 100 */}
                          <rect
                            x={x}
                            y={yScale(100)}
                            width={width}
                            height={
                              yScale(-40)-yScale(100)
                            }
                            fill="white"
                            fillOpacity="0.35"
                            stroke="#bdbdbd"
                          />
                          {/* barre d'écart */}
                          {
                            d.ecart >= 0 ? (
                              <rect
                                x={x}
                                y={yScale(d.ecart)}
                                width={width}
                                height={
                                  yScale(0)-yScale(d.ecart)
                                }
                                fill="#999999"
                              />
                            ) : (
                              <rect
                                x={x}
                                y={yScale(0)}
                                width={width}
                                height={
                                  yScale(d.ecart)-yScale(0)
                                }
                                fill="#555555"
                              />
                            )
                          }
                          {/* ligne zéro */}
                          <line
                            x1={x}
                            x2={x+width}
                            y1={yScale(0)}
                            y2={yScale(0)}
                            stroke="#555"
                          />
                          {/* ligne verte moyenne 5 ans */}
                            <line
                              x1={x}
                              x2={x+width}
                              y1={yScale(d.moyenne5ans)}
                              y2={yScale(d.moyenne5ans)}
                              stroke="#00aa55"
                              strokeWidth="2"
                            />
                            {/* liaison inclinée + valeur ligne verte */}
                            <line
                              x1={x + width}
                              y1={yScale(d.moyenne5ans)}
                              x2={x + width + 25}
                              y2={yScale(d.moyenne5ans) + 12}
                              stroke="#00aa55"
                              strokeWidth="1.2"
                            />

                            <text
                              x={x + width + 30}
                              y={yScale(d.moyenne5ans) + 16}
                              fontSize="11"
                              fill="#00aa55"
                              fontWeight="700"
                            >
                              {d.moyenne5ans}%
                            </text>

                          {/* ligne rouge année difficile */}
                            <line
                              x1={x}
                              x2={x+width}
                              y1={yScale(d.anneeDifficile)}
                              y2={yScale(d.anneeDifficile)}
                              stroke="red"
                              strokeWidth="2"
                            />
                            {/* liaison inclinée + valeur ligne rouge */}
                            <line
                              x1={x + width}
                              y1={yScale(d.anneeDifficile)}
                              x2={x + width + 25}
                              y2={yScale(d.anneeDifficile) - 12}
                              stroke="red"
                              strokeWidth="1.2"
                            />

                            <text
                              x={x + width + 30}
                              y={yScale(d.anneeDifficile) - 14}
                              fontSize="11"
                              fill="red"
                              fontWeight="700"
                            >
                              {d.anneeDifficile}%
                            </text>
                          {/* valeur écart */}
                          <text
                            x={x+width/2}
                            y={
                              d.ecart >=0
                              ? yScale(d.ecart)-8
                              : yScale(d.ecart)+18
                            }
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="700"
                            fill={
                              d.ecart>=0
                              ? "#555"
                              : "#333"
                            }
                          >
                            {d.ecart > 0 ? "+" : ""}
                            {d.ecart}%
                          </text>
                          {/* nom zone */}
                          <text
                            x={x+width/2}
                            y="250"
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                          >
                            {d.zone}
                          </text>
                        </g>
                      )
                    })
                  }
              </>
            )
          })()}
        </svg>
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

      const maxValue = Math.max(...chart4.map(d => d.superficie));
    const roundedMax = Math.ceil(maxValue / 100) * 100;
  
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          padding: 10,
          height: 300,
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
            marginBottom: 15,
          }}
        >
          Communes les plus affectées par le feux
        </div>
  
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart4Pro} margin={{ top: 15, bottom: 15 }} barCategoryGap="25%">
            <CartesianGrid stroke="#f3f4f6" />
  
            <XAxis
              dataKey="commune"
              angle={-10}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
              height={40}
            />
  
            <YAxis
                key={roundedMax}
                yAxisId="left"
                domain={[0, roundedMax]}
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


  const Graphique6 = () => {

    const valeur = -6.25;
  
    const cx = 250;
    const cy = 120;
    const rayon = 80;
  
    const valueToAngle = (v) => {

      const value = Math.max(-100, Math.min(100, v));

      if (value >= 0) {
        return 180 + (value / 100) * 180;
      } else {
        return 180 - (Math.abs(value) / 100) * 180;
      }
    
    };
    const polar = (angle, r) => {
      const rad = (angle * Math.PI) / 180;
  
      return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
      };
    };

    const graduation = (angle, longueur, couleur="#555") => {

      const p1 = polar(angle, rayon + 20);
      const p2 = polar(angle, rayon + 20 - longueur);
    
      return (
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={couleur}
          strokeWidth="2"
        />
      );
    
    };
    const arc = (start, end, color) => {
  
      const p1 = polar(start, rayon);
      const p2 = polar(end, rayon);
  
      return (
        <path
          d={`
            M ${p1.x} ${p1.y}
            A ${rayon} ${rayon}
            0 0 1
            ${p2.x} ${p2.y}
          `}
          fill="none"
          stroke={color}
          strokeWidth="40"
        />
      );
    };  
  
    const needleAngle = valueToAngle(valeur);  
    return (
  
      <div
        style={{
          background:"#fff",
          border:"1px solid #d9d9d9",
          borderRadius:8,
          padding:10,
          height:280
        }}
      >
  
        <div
          style={{
            textAlign:"center",
            fontSize:12,
            fontWeight:700,
            color:"#d32f2f"
          }}
        >
          Variation de la superficie brûlée au péripherie de 5km
        </div>
        <svg
          width="100%"
          height="250"
          viewBox="0 0 500 260"
        >
          {/* =====================DEMI CERCLE VERT 0 → 100====================== */}
  
          {[
            "#dcfce7",
            "#86efac",
            "#4ade80",
            "#16a34a"
          ].map((c,i)=>(
  
            arc(
              -180 + i*45,
              -180 + (i+1)*45,
              c
            )
  
          ))}
          {/* =====================DEMI CERCLE ROUGE 0 → -100====================== */}
  
            {[
            "#991b1b", // -100 : rouge foncé
            "#ef4444",
            "#f87171",
            "#fecaca"  // 0 : rouge clair
          ].map((c,i)=>(

            arc(
              i*45,
              (i+1)*45,
              c
            )

          ))}
          {/* =====================LABELS====================== */}
                {/* 0 au début du vert clair */}

                <text
                  x="135"
                  y="125"
                  fontSize="16"
                  fontWeight="600"
                >
                  0
                </text>
                {/* 50 au sommet */}

                <text
                  x="240"
                  y="15"
                  fontSize="15"
                  fontWeight="600"
                >
                  50
                </text>
                {/* 100 à droite */}
                <text
                  x="350"
                  y="120"
                  fontSize="16"
                  fontWeight="600"
                >
                  100
                </text>

                <text
                  x="240"
                  y="240"
                  fontSize="15"
                  fontWeight="600"
                >
                  -50
                </text>
          {/* =====================AIGUILLE====================== */}
            {
            (() => {

              const angle = needleAngle;

              // pointe de l'aiguille
              const pointe = polar(
                angle,
                rayon - 2
              );
              // base gauche de l'aiguille
              const gauche = polar(
                angle - 90,
                6
              );
              // base droite de l'aiguille
              const droite = polar(
                angle + 90,
                6
              );
              return (
                <>
                  {/* aiguille triangulaire */}

                  <polygon
                    points={`
                      ${gauche.x},${gauche.y}
                      ${pointe.x},${pointe.y}
                      ${droite.x},${droite.y}
                    `}
                    fill="#111"
                  />
                  {/* rond central */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="10"
                    fill="#111"
                  />
                  {/* petit centre blanc */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill="#fff"
                  />
                </>
              );
            })()
            }

            {/* =====================GRADUATIONS DU CERCLE====================== */}

              {

              Array.from({length: 21}).map((_,i)=>{

                const angleVert = -180 + i * 9;

                const angleRouge = i * 9;
                return (
                  <React.Fragment key={i}>

                    {/* graduation verte */}

                    {graduation(
                      angleVert,
                      i % 5 === 0 ? 18 : 10,
                      "#555"
                    )}


                    {/* graduation rouge */}

                    {graduation(
                      angleRouge,
                      i % 5 === 0 ? 18 : 10,
                      "#555"
                    )}

                  </React.Fragment>
                );

              })

              }
        </svg>
        <div
          style={{
            textAlign:"center",
            fontSize:12,
            fontWeight:700,
            marginTop:-20,
            color: valeur >= 0 ? "#2e7d32" : "#d32f2f"
          }}
        >
          {
            valeur >=0
            ?
            `La superficie brûlée a diminué de ${valeur}%`
            :
            `La superficie brûlée a augmenté de ${Math.abs(valeur)}%`
          }
        </div>
      </div>
    );
  };

  
export default function Deforestation() {
  const [year, setYear] = useState<number>(2019);
  const [ap, setAp] = useState<string>("Ankarafantsika");

  const kpis = useMemo(
    () => [
      {
        title: "Total des superficies brûlées dans les Communes riveraines",
        value: "2 504,04 ha",
        color: "#c00000",
  
        icon: <Flame size={46} color="#ff6b35" />,
      },
  
      {
        title: "Superficies brûlées en périphérie de l'AP (sur un rayon de 5km)",
        value: "783,56 ha",
        color: "#707070",
  
        icon: <div style={{ position: "relative", width: 48, height: 48 }}>
        <MapPinned size={44} color="#2563eb" />
      
        <Flame
          size={18}
          color="#ff6b35"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
          }}
        />
      </div>
      },
  
      {
        title: "Superficies brûlées à l'intérieur de l'Aire Protégée",
        value: "989,60 ha",
        color: "#f0a500",
  
        icon: <div style={{ position: "relative", width: 48, height: 48 }}>
        <Trees size={44} color="#2e7d32" />
      
        <Flame
          size={20}
          color="#ff6b35"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
          }}
        />
      </div>
      },
  
      {
        title: "Superficies brûlées aux Communes riveraines du mois dernier",
        value: "1 275,20 ha",
        color: "#c00000",
  
        icon: <div style={{ position: "relative", width: 48, height: 48 }}>
        <Calendar size={44} color="#1d4ed8" />
      
        <Flame
          size={18}
          color="#ff6b35"
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
          }}
        />
      </div>
      },
  
      {
        title: "Evolution annuelle par rapport à l'année précédente",
        value: "-78,91%",
        color: "green",
  
        icon: (
            <div style={{ position: "relative", width: 48, height: 48 }}>
            <BarChart3 size={42} color="#ef4444" />
          </div>
        ),
      },
  
      {
        title: "Commune la plus touchée",
        value: "",
        color: "#003399",
  
        icon: <div style={{ position: "relative", width: 48, height: 48 }}>
        <MapPinned size={44} color="#1d4ed8" />
      </div>
      },
    ],
    [year]
  );


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
          Suivi et analyse des feux
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
            >
              <option value={2020}>2020</option>
              <option value={2021}>2021</option>
              <option value={2022}>2022</option>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2018}>2025</option>
              <option value={2019}>2026</option>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    padding: 10,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
  }}
>
  {/* TITRE */}
  <div
    style={{
      fontWeight: 700,
      color: "#003399",
      fontSize: 13,
      whiteSpace: "nowrap",
    }}
  >
    Communes les moins brûlées par rapport à leur superficie
  </div>

  <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    fontSize: 12,
    gap: 18,
    width: "100%",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Medal color="gold" />
    <span>Anivorano Nord</span>
    <span style={{ color: "#16a34a" }}>(0,66%)</span>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Medal color="silver" />
    <span>Sadjaovato</span>
    <span style={{ color: "#16a34a" }}>(0,76%)</span>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Medal color="#cd7f32" />
    <span>Ankarongana</span>
    <span style={{ color: "#16a34a" }}>(1,47%)</span>
  </div>
</div>
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(6,1fr)",
    gap: 2,
    marginBottom: 8,
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
    <Graphique2Pro ap={ap} />
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
          height: 300,
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
          Impact des feux par Commune et par zone géographique
        </div>

      <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={impactFeux}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 20,
            }}
            barCategoryGap="25%"      >

            <XAxis
              dataKey="commune"
              angle={-15}
              textAnchor="end"
              interval={0}
              dy={0}
              tick={{
                fill: "#333",
                fontSize: 11,
              }}
              axisLine={{
                stroke: "#0066cc",
                strokeWidth: 1.5,
              }}
              tickLine={true}
            />

            <YAxis
              domain={[0, 1500]}
              ticks={[0,500,1000,1500]}
              tick={{
                fill:"#555",
                fontSize:11,
              }}
              axisLine={{
                stroke:"#0066cc",
                strokeWidth:1.5,
              }}
              tickLine={{
                stroke:"#0066cc"
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: 12,
                paddingTop: 15,
              }}
              content={() => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    fontSize: 12,
                  }}
                >
                  <div style={{display:"flex", alignItems:"center"}}>
                    <span
                      style={{
                        width:10,
                        height:10,
                        background:"#ff0000",
                        display:"inline-block",
                        marginRight:5
                      }}
                    />
                    Intérieur AP
                  </div>

                  <div style={{display:"flex", alignItems:"center"}}>
                    <span
                      style={{
                        width:10,
                        height:10,
                        background:"#ffff00",
                        display:"inline-block",
                        marginRight:5
                      }}
                    />
                    Périphérie 5km
                  </div>

                  <div style={{display:"flex", alignItems:"center"}}>
                    <span
                      style={{
                        width:10,
                        height:10,
                        background:"#d9edf7",
                        display:"inline-block",
                        marginRight:5
                      }}
                    />
                    Total
                  </div>
                </div>
              )}
            />
              <Bar
                dataKey="total"
                name="Total"
                shape={<CustomTotalBar />}
                barSize={45}
              >
                <LabelList
                  dataKey="total"
                  position="top"
                  fill="#0099ff"
                  fontSize={10}
                  formatter={(v:number)=>v.toFixed(2)}
                />
              </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

{/* ===================== JAUGE CIRCULAIRE===================== */}
<div style={{ width: "100%" }}>
      <Graphique6 />
    </div>

    </div>
    </div>
  );
}
