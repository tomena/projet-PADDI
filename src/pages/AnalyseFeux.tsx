import React, { useState, useMemo, useEffect } from "react";
import {Trees,MapPinned,Flame,TrendingDown,BadgePercent, Medal,Calendar, MapPin, Slash, TreePine, X, BarChart3,TrendingUp, ArrowUp, ArrowDown
} from "lucide-react";
import {ResponsiveContainer,ComposedChart,BarChart,LineChart,Bar,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,LabelList,ReferenceLine,Cell,Customized, ReferenceDot, Area
} from "recharts";
import { createRoot } from "react-dom/client";

const ArrowLabel = ({ payload, year, viewBox, index }: any) => {
  const actuel = payload[`y${year}`] ?? 0;
  const precedent = payload[`y${year - 1}`] ?? 0;
  if (precedent === 0) return null;
  const variation = ((actuel - precedent) / precedent) * 100;
  const isAugmentation = variation > 0;
  const color = isAugmentation
    ? "#dc2626"
    : "#16a34a";

  return (
    <text
      x={viewBox.x}
      y={viewBox.y - (index % 2 === 0 ? 15 : 30)}
      textAnchor="middle"
      fontSize={8}
      fontWeight="600"
      fill={color}
    >
      {isAugmentation
        ? `▲ ${variation.toFixed(0)}%`
        : "▼"}
    </text>
  );
};

const CustomXAxisTick = ({ x, y, payload }:any) => {
  const nom = payload.value;
  const affichage =
    nom.length > 8
    ? nom.substring(0,8) + "..."
    : nom;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={5}
        textAnchor="end"
        transform="rotate(-25)"
        fontSize={10}
        fill="#333"
      >
        {affichage}
      </text>
    </g>
  );
};

const CustomTotalBar = (props:any) => {
  const {
    x,
    y,
    width,
    height,
    payload
  } = props;
  const espace = 2;
  const total = payload.total || 1;
  // hauteur proportionnelle
  const hauteurInterieur =
    (payload.interieur / total) * height;

  const hauteurPeripherie =
    (payload.peripherie / total) * height;
    const largeurPetiteBarre = 
      (width * 0.45); // 35% de la barre totale    
    const largeurInterne =
      largeurPetiteBarre * 2 + espace;    
    const debutX =
      x + (width - largeurInterne) / 2;
  return (
    <g>

      {/* Total arrière */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#d9edf7"
        rx={4}
      />
      {/* Intérieur AP */}
      <rect
        x={debutX}
        y={y + height - hauteurInterieur}
        width={largeurPetiteBarre}
        height={hauteurInterieur}
        fill="#ff0000"
      />
      {/* Périphérie 5km */}
      <rect
        x={debutX + largeurPetiteBarre + espace}
        y={y + height - hauteurPeripherie}
        width={largeurPetiteBarre}
        height={hauteurPeripherie}
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

  const Graphique3 = ({baseFeux,year, ap}:any) => {
    const chart3Pro = useMemo(() => {
      const AP_LIST = [
        "Analamerana",
        "Andohahela",
        "Ankarafantsika",
        "Ankarana",
        "Marolambo",
        "Befotaka-Midongy",
        "Montagne d'Ambre"
      ];   
    
      const superficie2018 = {
        "Analamerana":2809.96,
        "Andohahela":5584.04,
        "Ankarafantsika":18496.40,
        "Ankarana":5812.00,
        "Marolambo":7120.84,
        "Befotaka-Midongy":19312.32,
        "Montagne d'Ambre":4092.20
      };
    
      const getSuperficie = (
        annee:number,
        source:string,
        nomAP:string
      ) => {    

        if(
          annee === 2018 &&
          source === "5km"
        ){
          return superficie2018[nomAP] || 0;
        }    
    
        return baseFeux
          .filter(f=>{
    
            const p = f.properties;
    
            return (
              String(p.AP)
              .trim()
              === nomAP &&
    
              Number(p.Année)
              === annee &&
    
              String(p.Source)
              .trim()
              .toLowerCase()
              === source
            );
    
          })
          .reduce((total,f)=>{
    
            return total +
            (
              Number(
                String(f.properties.Total)
                .replace(",",".")
              ) || 0
            );    
          },0);    
      };   
   
      const calculMoyenneReference = (
        source:string
      )=>{    
        const moyennesAP =
          AP_LIST.map(nomAP=>{    
    
            const somme =
              [2020,2021,2022,2023,2024]
              .reduce((s,annee)=>{
    
                return s +
                getSuperficie(
                  annee,
                  source,
                  nomAP
                );
    
              },0);    
            return somme / 5;    
          });   
    
        return (
          moyennesAP.reduce(
            (a,b)=>a+b,
            0
          )
          /
          AP_LIST.length
        );    
      };

      const moyenneQuinquennaleAP = (
        source:string,
        nomAP:string
      )=>{
      
        const somme =
          [2020,2021,2022,2023,2024]
          .reduce((s,annee)=>{
      
            return s +
              getSuperficie(
                annee,
                source,
                nomAP
              );
      
          },0);
      
        return somme / 5;
      };
      // ===============================
      // MOYENNE ANNEE DIFFICILE 7 AP
      // ===============================
    
      const calculMoyenneDifficile = (
        source:string,
        annees:number[]
      )=>{
         const moyennesAP =
          AP_LIST.map(nomAP=>{
            const somme =
              annees.reduce((s,annee)=>{
                return s +
                getSuperficie(
                  annee,
                  source,
                  nomAP
                );
              },0);
            return somme / annees.length;
          });
        return (
          moyennesAP.reduce(
            (a,b)=>a+b,
            0
          )
          /
          AP_LIST.length
        );
      };
    
      const calculVariation = (
        superficie:number,
        moyenne:number
      )=>{
      
        if(moyenne===0)
          return 0;
      
        return -(
          (
            superficie -
            moyenne
          )
          /
          moyenne
        )*100;
      
      };
      // Variation moyenne des 7 AP pour une année donnée
      const moyenneVariation7AP = (
        source:string,
        annee:number
      )=>{
      
        const variations = AP_LIST.map(nomAP=>{      
          const moyenneAP =
            moyenneQuinquennaleAP(
              source,
              nomAP
            );      
          const superficie =
            getSuperficie(
              annee,
              source,
              nomAP
            );

          return calculVariation(
            superficie,
            moyenneAP
          );      
        });      
      
        return (
          variations.reduce(
            (a,b)=>a+b,
            0
          )
          /
          variations.length
        );      
      };      
      
      // Variation année difficile moyenne 7 AP
      const moyenneVariationDifficile = (
        source:string,
        annees:number[]
      )=>{
      
       const variations = AP_LIST.map(nomAP=>{     
         const moyenneAP =
         moyenneQuinquennaleAP(
           source,
           nomAP
         );
      
      
         const superficieMoyenne =
         annees.reduce(
           (s,annee)=>
             s +
             getSuperficie(
              annee,
              source,
              nomAP
             ),
           0
         )
         /
         annees.length;
      
      
         return calculVariation(
           superficieMoyenne,
           moyenneAP
         );      
       });   
      
       return (
         variations.reduce(
           (a,b)=>a+b,
           0
         )
         /
         variations.length
       );      
      };
      // ===============================
      // CALCUL FINAL
      // ===============================
    const ref5km =
        calculMoyenneReference("5km");
      const refInterieur =
        calculMoyenneReference("interieur");
      // années difficiles périphérie
      const difficile5km =
        calculMoyenneDifficile(
          "5km",
          [2018,2023,2025]
        );
      // années difficiles intérieur
      const difficileInterieur =
        calculMoyenneDifficile(
          "interieur",
          [2023,2025]
        );

        return [
          {
            zone:"Au périphérie de 5 km",
        
            // barre grise = même logique que la jauge pour l'AP choisie
            ecart:Number(
              calculVariation(
                getSuperficie(
                  year,
                  "5km",
                  ap
                ),
                moyenneQuinquennaleAP(
                  "5km",
                  ap
                )
              ).toFixed(2)
            ),
        
            // ligne verte = moyenne des variations des 7 AP de l'année choisie
            moyenne5ans:Number(
              moyenneVariation7AP(
                "5km",
                year
              ).toFixed(2)
            ),
        
            // ligne rouge = moyenne des années difficiles des 7 AP
            anneeDifficile:Number(
              moyenneVariationDifficile(
                "5km",
                [2018,2023,2025]
              ).toFixed(2)
            )
          },
        
          {
            zone:"À l'intérieur du parc",
        
            ecart:Number(
              calculVariation(
                getSuperficie(
                  year,
                  "interieur",
                  ap
                ),
                moyenneQuinquennaleAP(
                  "interieur",
                  ap
                )
              ).toFixed(2)
            ),
        
            moyenne5ans:Number(
              moyenneVariation7AP(
                "interieur",
                year
              ).toFixed(2)
            ),
        
            anneeDifficile:Number(
              moyenneVariationDifficile(
                "interieur",
                [2023,2025]
              ).toFixed(2)
            )
          }
        ];
    },[baseFeux,ap,year]);    
    
    
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

  
  const Graphique6 = ({baseFeux, ap, year}:any) => {
    const valeur = useMemo(() => {
      const getSuperficieByYear = (annee:number) => {    
        return baseFeux
          .filter(f => {    
            const p = f.properties;    
            return (
              String(p.AP).trim() === String(ap).trim() &&
              Number(p.Année) === annee &&
              String(p.Source).trim().toLowerCase() === "5km"
            );    
          })
          .reduce((total,f)=>{    
            const superficie = Number(
              String(f.properties.Total).replace(",", ".")
            ) || 0;    
            return total + superficie;    
          },0);    
      };    
      // Superficie de l'année sélectionnée
      const superficieAnnee = getSuperficieByYear(year);
    
      const moyenneReference =
        (
          getSuperficieByYear(2020) +
          getSuperficieByYear(2021) +
          getSuperficieByYear(2022) +
          getSuperficieByYear(2023) +
          getSuperficieByYear(2024)
        ) / 5;    
      if (moyenneReference === 0) {
        return 0;
      }    
      const variation =
        (
          (superficieAnnee - moyenneReference)
          /
          moyenneReference
        ) * 100;    
      return Number(variation.toFixed(1));    
    }, [baseFeux, ap, year]);

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

    const valeurJauge = Math.max(
      -100,
      Math.min(
        100,
        valeur < 0
          ? Math.abs(valeur)
          : -valeur
      )
    );    
    const targetAngle = valueToAngle(valeur);

const [animatedAngle, setAnimatedAngle] = useState(targetAngle);

useEffect(() => {
  let angle = animatedAngle;

  const timer = setInterval(() => {
    const diff = targetAngle - angle;

    if (Math.abs(diff) < 0.5) {
      angle = targetAngle;
      setAnimatedAngle(targetAngle);
      clearInterval(timer);
      return;
    }

    angle += diff * 0.08; // vitesse de déplacement
    setAnimatedAngle(angle);
  }, 16); // ≈60 fps

  return () => clearInterval(timer);
}, [targetAngle]);

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
          Variation de la superficie brûlée en périphérie de 5 km <br/>(réf. 2020–2024)
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

              const angle = animatedAngle;

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
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              marginTop: -20,
              color:
                valeur < 0
                  ? "#2e7d32"
                  : valeur > 0
                  ? "#d32f2f"
                  : "#1565c0",
            }}
          >
            {
              valeur < 0
                ? `La superficie brûlée a diminué de ${Math.abs(valeur)} %.`
                : valeur > 0
                ? `La superficie brûlée a augmenté de ${valeur} %.`
                : `La superficie brûlée est identique à la moyenne de référence.`
            }
          </div>
      </div>
    );
  };


  const Graphique1 = ({chart1, year}) => {    
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

            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />

            <Legend
                verticalAlign="top"
                height={25}
                wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
            />
            <Line
              type="natural"
              dataKey={`y${year-1}`}
              name={`${year-1}`}
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{r:1}}
              />
            <Line
              type="natural"
              dataKey={`y${year}`}
              name={`${year}`}
              stroke="#dc2626"
              strokeWidth={2.5}
              dot={{r:1}}
              />
              

            {/*TREND INDICATOR PRO */}
            {chart1.map((d, i) => {
                const diff = d[`y${year}`] - d[`y${year-1}`];

                const isGood = diff < 0; 
                const isBad = diff > 0;    

                const color = isGood
                  ? "#16a34a"
                  : isBad
                  ? "#dc2626"
                  : "#9ca3af";

                const symbol = isGood ? "▼" : isBad ? "▲" : "—";

                const formattedDiff = Math.abs(diff).toLocaleString("fr-FR", {
                  maximumFractionDigits: 2,
                });

                return (
                  <ReferenceDot
                    key={i}
                    x={d.mois}
                    y={Math.max(
                      d[`y${year-1}`],
                      d[`y${year}`]
                    )}
                    r={0}
                    label={{
                      value: `${symbol} ${formattedDiff}`,
                      position: "top",
                      fill: color,
                      fontSize: 8,
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

  const CustomBarWithArrow = (props:any) => {
    const {
      x,
      y,
      width,
      height,
      payload,
      year
    } = props;  
    const actuel = payload[`y${year}`] ?? 0;
    const precedent = payload[`y${year-1}`] ?? 0;  
    if (precedent === 0) {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#c2410c"
        />
      );
    }
    const variation =
      ((actuel - precedent) / precedent) * 100;  
    const diminution = variation < 0;  
    return (
      <g>
  
        {/* barre année choisie */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={props.fill || "#c2410c"}
          rx={3}
        />
        {/* flèche */}
        <text
          x={x + width / 2}
          y={y-1}
          textAnchor="middle"
          fontSize={10}
          fontWeight="700"
          fill={
            diminution
            ? "#16a34a"
            : "#dc2626"
          }
        >
          {diminution ? "▼" : "▲"}
        </text>  
      </g>
    );
  };
  
  const Graphique2Pro = ({ ap, chart2Pro, year }) => {   
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
  
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
              data={chart2Pro}
              barGap={5}
              barCategoryGap="25%"
              margin={{
                top:10,
                right:10,
                left:0,
                bottom:20
              }}
            >  
            <XAxis
              dataKey="commune"
              angle={-25}
              interval={0}
              tick={<CustomXAxisTick />}
              textAnchor="end"
              height={50}
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

              <Bar
                dataKey={`y${year-1}`}
                name={`${year-1}`}
                fill="#fdba74"
                opacity={0.85}
                barSize={13}
                radius={[3,3,0,0]}
              />
              <Bar
                dataKey={`y${year}`}
                name={`${year}`}
                barSize={13}
                fill="#c2410c"
                shape={
                  <CustomBarWithArrow
                    year={year}
                  />
                }
              />            
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  
export default function Feux() {
  const [year, setYear] = useState<number>(2019);
  const [ap, setAp] = useState<string>("Ankarafantsika");
  const [source, setSource] = useState<string>("Interieur");
  const [baseFeux, setBaseFeux] = useState<any[]>([]);

  useEffect(() => {
    fetch("/data/Bases_Feux.geojson")
      .then(res => res.json())
      .then(data => {  
        setBaseFeux(data.features);  
      });  
  }, []);

  useEffect(() => {
    console.log("Nombre total de features :", baseFeux.length);
  }, [baseFeux]);


  const feuxCommune = useMemo(() => {

    return baseFeux.filter(f => {    
    const p = f.properties;    
    return (
      String(p.AP).trim() === String(ap).trim() &&
      Number(p.Année) === Number(year) &&
      String(p.Source).trim().toLowerCase() === "commune"
    );    
    });    
    }, [baseFeux, ap, year]);

      console.log(
        feuxCommune.map(f => ({
          AP: f.properties.AP,
          Annee: f.properties.Année,
          Source: f.properties.Source,
          Commune: f.properties.Commune,
          Total: f.properties.Total
        }))
      );  

      console.log("Nombre de lignes filtrées :", feuxCommune.length);

      console.table(
        feuxCommune.map(f => ({
          Commune: f.properties.Commune,
          Total: f.properties.Total,
          AP: f.properties.AP,
          Annee: f.properties.Année,
          Source: f.properties.Source
        }))
      );

      const doublons = feuxCommune.reduce((acc, f) => {
        const key = `${f.properties.AP}-${f.properties.Année}-${f.properties.Commune}-${f.properties.Source}`;

        acc[key] = (acc[key] || 0) + 1;

        return acc;
      }, {});

      console.table(
        Object.entries(doublons).filter(([, n]) => n > 1)
      );

    const totalCommune = useMemo(() => {
      const parCommune = {};    
      feuxCommune.forEach(f => {    
        const commune = f.properties.Commune;    
        const total = Number(
          String(f.properties.Total)
          .replace(",", ".")
        );    
        if (!parCommune[commune]) {
          parCommune[commune] = 0;
        }    
        parCommune[commune] += isNaN(total) ? 0 : total;    
      });   
      return Object.values(parCommune)
        .reduce(
          (somme, valeur) => somme + valeur,
          0
        );
    
    }, [feuxCommune]);

    const feux5km = useMemo(() => {
      return baseFeux.filter(f => {
        const p = f.properties;    
        return (
          String(p.AP).trim() === String(ap).trim() &&
          Number(p.Année) === Number(year) &&
          String(p.Source).trim().toLowerCase() === "5km"
        );
      });    
    }, [baseFeux, ap, year]);    

    const total5km = useMemo(() => {
      return feux5km.reduce((somme, f) => {    
        const total = Number(
          String(f.properties.Total)
          .replace(",", ".")
        );    
        return somme + (isNaN(total) ? 0 : total);    
      }, 0);
    
    }, [feux5km]);

    const feuxInterieur = useMemo(() => {
      return baseFeux.filter(f => {
        const p = f.properties;
    
        return (
          String(p.AP).trim() === String(ap).trim() &&
          Number(p.Année) === Number(year) &&
          String(p.Source).trim().toLowerCase() === "interieur"
        );
      });
    
    }, [baseFeux, ap, year]);

    const totalInterieur = useMemo(() => {
      return feuxInterieur.reduce((somme, f) => {    
        const total = Number(
          String(f.properties.Total)
          .replace(",", ".")
        );    
        return somme + (isNaN(total) ? 0 : total);    
      }, 0);    
    }, [feuxInterieur]);

    const moisPrecedent = useMemo(() => {
      const mois = [
        "Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"
      ];
    
      // getMonth() : Janvier = 0
      const index = new Date().getMonth();    
      // Si on est en janvier, on prend décembre
      return mois[index === 0 ? 11 : index - 1];    
    }, []);

    const moisCourt = [
      { nom: "Jan", champ: "Janvier" },
      { nom: "Fév", champ: "Février" },
      { nom: "Mar", champ: "Mars" },
      { nom: "Avr", champ: "Avril" },
      { nom: "Mai", champ: "Mai" },
      { nom: "Juin", champ: "Juin" },
      { nom: "Juil", champ: "Juillet" },
      { nom: "Août", champ: "Août" },
      { nom: "Sep", champ: "Septembre" },
      { nom: "Oct", champ: "Octobre" },
      { nom: "Nov", champ: "Novembre" },
      { nom: "Déc", champ: "Décembre" },
    ];

    const totalMoisDernier = useMemo(() => {
      return feuxCommune.reduce((somme, f) => {    
        const valeur = Number(
          String(f.properties[moisPrecedent] ?? "0")
            .replace(",", ".")
        );    
        return somme + (isNaN(valeur) ? 0 : valeur);    
      }, 0);    
    }, [feuxCommune, moisPrecedent]);


    const totalAnnuel = (annee:number) => {
      return baseFeux
        .filter(f => {    
          const p = f.properties;    
          return (
            String(p.AP).trim() === String(ap).trim() &&
            Number(p.Année) === annee &&
            String(p.Source).trim().toLowerCase() === "commune"
          );    
        })
        .reduce((somme, f) => {    
          const total = Number(
            String(f.properties.Total)
              .replace(",", ".")
          );    
          return somme + (isNaN(total) ? 0 : total);    
        }, 0);    
    };

    const totalAnnee = useMemo(
      () => totalAnnuel(year),
      [baseFeux, ap, year]
    );
    
    const totalAnneePrecedente = useMemo(
      () => totalAnnuel(year - 1),
      [baseFeux, ap, year]
    );

    const evolutionAnnuelle = useMemo(() => {
      if (totalAnneePrecedente === 0) return null;
    
      return (
        (totalAnnee - totalAnneePrecedente) /
        totalAnneePrecedente
      ) * 100;    
    }, [totalAnnee, totalAnneePrecedente]);


    const communePlusTouchee = useMemo(() => {
      const communes = baseFeux
        .filter(f => {    
          const p = f.properties;    
          return (
            String(p.AP).trim() === String(ap).trim() &&
            Number(p.Année) === Number(year) &&
            String(p.Source).trim().toLowerCase() === "commune"
          );    
        })
        .map(f => ({    
          commune: f.properties.Commune,    
          total: Number(
            String(f.properties.Total)
              .replace(",", ".")
          ) || 0    
        }));    
      if (communes.length === 0) return null;    
      return communes.reduce((max, courant) =>
        courant.total > max.total ? courant : max
      );    
    }, [baseFeux, ap, year]);


    const getEvolutionMensuelle = (annee:number) => {
      const donnees = baseFeux.filter(f => {    
        const p = f.properties;    
        return (
          String(p.AP).trim() === String(ap).trim() &&
          Number(p.Année) === annee &&
          String(p.Source).trim().toLowerCase() === "commune"
        );    
      });    
    
      return moisCourt.map(m => {    
        const totalMois = donnees.reduce((somme, f) => {    
          const valeur = Number(
            String(f.properties[m.champ] ?? "0")
            .replace(",", ".")
          );    
          return somme + (isNaN(valeur) ? 0 : valeur);    
        },0);    
        return totalMois;    
      });    
    };

    const chart1 = useMemo(() => {
      const anneePrecedente = getEvolutionMensuelle(year - 1);
      const anneeActuelle = getEvolutionMensuelle(year);    
      return moisCourt.map((m,i)=>({    
        mois:m.nom,    
        [`y${year-1}`]: anneePrecedente[i],    
        [`y${year}`]: anneeActuelle[i],    
      }));    
    },[baseFeux, ap, year]);


  const formatHa = (value:number) =>
  value.toLocaleString("fr-FR", {
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + " ha";


  const feuxFiltres = useMemo(() => {
    return baseFeux.filter(
      (f) =>
        Number(f.properties.Année) === year &&
        f.properties.AP === ap &&
        f.properties.Source === source
    );  
  }, [baseFeux, year, ap, source]);


  const chart2Pro = useMemo(() => {
    const getDataByYear = (annee:number) => {
      const data:any = {};  
      baseFeux
        .filter(f => {
          const p = f.properties;  
          return (
            String(p.AP).trim() === String(ap).trim() &&
            Number(p.Année) === annee &&
            String(p.Source).trim().toLowerCase() === "interieur"
          );
        })
        .forEach(f => {  
          const commune = f.properties.Commune;  
          const total = Number(
            String(f.properties.Total)
              .replace(",", ".")
          ) || 0;  
          if (!data[commune]) {
            data[commune] = 0;
          }  
          data[commune] += total;  
        });  
      return data;
    };  
    const actuel = getDataByYear(year);
    const precedent = getDataByYear(year - 1);  
    const communes = Array.from(
      new Set([
        ...Object.keys(actuel),
        ...Object.keys(precedent)
      ])
    );  
    const resultat = communes.map(commune => {  
      const yActuel = actuel[commune] || 0;
      const yPrecedent = precedent[commune] || 0;  
      const variation =
        yPrecedent === 0
        ? 0
        : ((yActuel - yPrecedent) / yPrecedent) * 100;  
  
      return {
        commune,
        [`y${year-1}`]: yPrecedent,
        [`y${year}`]: yActuel,
        variation:Number(variation.toFixed(1))
      };  
    });  
    // 1 - prendre les 11 communes les plus brûlées de l'année choisie
    const top11 = resultat
      .sort(
        (a,b) =>
        b[`y${year}`] - a[`y${year}`]
      )
      .slice(0,11);  
    // 2 - afficher ces 11 communes par ordre alphabétique
    return top11.sort(
      (a,b) =>
      a.commune.localeCompare(b.commune)
    );  
  },[baseFeux, ap, year]);


  const chart4Data = useMemo(() => {
    const parCommune = {};  
    // Toutes les communes
    feuxCommune.forEach(f => {  
      const commune = f.properties.Commune;  
      const superficie = Number(
        String(f.properties.Total)
        .replace(",", ".")
      ) || 0;  
      if (!parCommune[commune]) {
        parCommune[commune] = 0;
      }  
      parCommune[commune] += superficie;  
    });  
    // Total général de toutes les communes
    const totalGeneral = Object.values(parCommune)
      .reduce(
        (sum,val)=>sum + val,
        0
      );  
    // Trier et garder seulement les 5 premières
    const top5 = Object.entries(parCommune)
      .map(([commune, superficie])=>({
        commune,
        superficie:Number(superficie.toFixed(2))
      }))
      .sort((a,b)=>b.superficie-a.superficie)
      .slice(0,5);  
    // Calcul cumul sur le total général
    let cumul = 0;  
    return top5.map(d=>{ 
      cumul += d.superficie;  
      return {
        ...d,
        pct:Number(
          ((cumul / totalGeneral)*100)
          .toFixed(1)
        )
      };  
    });  
  },[feuxCommune]);


  const impactFeux = useMemo(() => {
    const communes: Record<
      string,
      {
        commune: string;
        total: number;
        peripherie: number;
        interieur: number;
      }
    > = {};  
    baseFeux.forEach(f => {
      const p = f.properties;  
      if (
        String(p.AP).trim() !== String(ap).trim() ||
        Number(p.Année) !== Number(year)
      ) {
        return;
      }  
      const commune = p.Commune;  
      const total =
        Number(String(p.Total).replace(",", ".")) || 0;  
      if (!communes[commune]) {
        communes[commune] = {
          commune,
          total: 0,
          peripherie: 0,
          interieur: 0,
        };      }  
      const source = String(p.Source).trim().toLowerCase();  
      if (source === "interieur") {
        communes[commune].interieur += total;
      }  
      if (source === "5km") {
        communes[commune].peripherie += total;
      }  
      communes[commune].total += total;
    });  
    return Object.values(communes)  
      // 1. garder les plus grandes superficies
      .sort((a, b) => b.total - a.total)  
      // 2. seulement les 11 premières
      .slice(0, 11)  
      // 3. puis ordre alphabétique
      .sort((a, b) =>
        a.commune.localeCompare(b.commune)
      );  
  }, [baseFeux, ap, year]);


  const maxY = Math.max(
    ...impactFeux.map(d => d.total),
    0
  );  
  const roundedMax = Math.max(
    500,
    Math.ceil(maxY / 500) * 500
  );
  
  const ticks = Array.from(
    { length: roundedMax / 500 + 1 },
    (_, i) => i * 500
  );

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const nom = payload.value;
    const texteCourt =
      nom.length > 8 ? nom.substring(0, 8) + "..." : nom;
  
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="end"
          transform="rotate(-30)"
          fill="#333"
          fontSize={11}
        >
          {texteCourt}
        </text>
      </g>
    );
  };

  const Graphique4 = ({chart4, year}) => {
    const maxValue = Math.max(...chart4.map(d => d.superficie));
    const roundedMax = Math.ceil(
      Math.max(
        maxValue,
        ...chart4.map(d=>d.pct)
      ) / 100
    ) * 100;

    const chart4Trend = chart4.map((d, index) => {
      const a = chart4[0]?.superficie || 1;    
      const k = 0.7; // coefficient de décroissance    
      return {
        ...d,
        trend: Number(
          (a * Math.exp(-k * index))
          .toFixed(2)
        )
      };    
    });

    const chart4WithTrend = chart4.map((d,index)=>{
      const a = chart4[0]?.superficie || 1;
      const k = 0.7;
    
      return {
        ...d,
        trend:Number(
          (a * Math.exp(-k*index))
          .toFixed(2)
        )
      };
    
    });


    const Graphique6 = ({baseFeux, ap, year}:any) => {
      const valeur = useMemo(() => {    
        // Fonction pour calculer la superficie brûlée 5km d'une année
        const getSuperficieByYear = (annee:number) => {    
          return baseFeux
            .filter(f => {    
              const p = f.properties;    
              return (
                String(p.AP).trim() === String(ap).trim() &&
                Number(p.Année) === annee &&
                String(p.Source).trim().toLowerCase() === "5km"
              );    
            })
            .reduce((total,f)=>{    
              const superficie = Number(
                String(f.properties.Total)
                .replace(",", ".")
              ) || 0;    
              return total + superficie;    
            },0); 
        };    
        // Superficie de l'année choisie
        const superficieAnnee = getSuperficieByYear(year);    
        // Moyenne référence projet 2020-2024
        const anneesReference = [
          2020,
          2021,
          2022,
          2023,
          2024
        ];    
        const superficiesReference =
          anneesReference.map(
            annee => getSuperficieByYear(annee)
          );    
        const moyenneReference =
          superficiesReference.reduce(
            (a,b)=>a+b,
            0
          )
          /
          anneesReference.length;    
        if(moyenneReference === 0){
          return 0;
        }    
    
        const variation =
          (
            (superficieAnnee - moyenneReference)
            /
            moyenneReference
          )
          * 100;    
        return Number(
          variation.toFixed(1)
        );    
      },[baseFeux, ap, year]);    
      // le reste de ton code SVG reste ici
    };
  
  
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
          Communes les plus affectées par les feux en {year}
        </div>
  
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chart4WithTrend}
              margin={{ top:15,bottom:15 }}
              barCategoryGap="25%"
              >
            <CartesianGrid stroke="#f3f4f6" />
  
            <XAxis
              dataKey="commune"
              angle={-15}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
              height={60}
            />
  
            <YAxis
              yAxisId="left"
              domain={[0, roundedMax]}
              tick={{fontSize:11}}
            />

          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0,100]}
            hide
          />
  
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 10,
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
              dot={{r:2}}
            >
              <LabelList
                dataKey="pct"
                position="top"
                formatter={(v:number)=>`${v}%`}
                fill="#000"
                style={{
                  fontWeight:"bold",
                  fontSize:11
                }}
              />
            </Line>
            {/* TENDANCE EXPONENTIELLE */}
            <Line
              name="Tendance exponentielle"
              yAxisId="left"
              type="monotone"
              dataKey="trend"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="8 5"
              dot={false}
              legendType="none"
            />
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
              fontSize: 16,
            }}
          >
            {value}
          </div>
        </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                height: "100%",
              }}
            >
          
              {/* Ligne principale : icône + commune + superficie */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
          
                {/* Icône */}
                <div
                  style={{
                    color,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {icon}
                </div>   
          
                {/* Informations */}
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >          
                  {/* Commune */}
                  <div
                    style={{
                      color: "#b40000",
                      fontWeight: 800,
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    {communePlusTouchee?.commune ?? "--"}
                  </div>          
          
                  {/* avec */}
                  <div
                    style={{
                      color: "#003399",
                      fontWeight: 700,
                      marginTop: 5,
                      fontSize: 12,
                      lineHeight: 1.1,
                    }}
                  >
                    avec
                  </div>          
          
                  {/* Superficie */}
                  <div
                    style={{
                      color: "#b40000",
                      fontWeight: 800,
                      fontSize: 12,
                      marginTop: 5,
                      lineHeight: 1,
                    }}
                  >
                    {communePlusTouchee
                      ? formatHa(communePlusTouchee.total)
                      : "--"}
                  </div>
                </div>          
              </div>          
          
              {/* Texte qui commence sous l'icône */}
              <div
                style={{
                  color: "#003399",
                  fontWeight: 700,
                  fontSize: 11,
                  marginTop: 5,
                  textAlign: "right",
                }}
              >
                de surface totale brûlée
              </div>          
            </div>
          )}
      </div>
    );
  };

  const kpis = useMemo(
    () => [
      {
        title:"Total des superficies brûlées dans les Communes riveraines",
        value:formatHa(totalCommune),
        color:"#c00000",
       
        icon:
        <Flame
          size={46}
          color="#ff6b35"
        />
       },
  
      {
        title: "Superficies brûlées en périphérie de l'AP (sur un rayon de 5km)",
        value:formatHa(total5km),
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
        title: "Superficies brûlées à l'intérieur de l'Aire Protégées",
        value:formatHa(totalInterieur),
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
        value: formatHa(totalMoisDernier),
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
        value:
          evolutionAnnuelle === null ? (
            "--"
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: evolutionAnnuelle >= 0 ? "#d32f2f" : "#2e7d32",
                fontWeight: 700,
              }}
            >
              {evolutionAnnuelle.toFixed(2)} %
      
              {evolutionAnnuelle >= 0 ? (
                <TrendingUp
                  size={22}
                  color="#d32f2f"
                  strokeWidth={2.8}
                />
              ) : (
                <TrendingDown
                  size={22}
                  color="#2e7d32"
                  strokeWidth={2.8}
                />
              )}
            </span>
          ),
      
        color: evolutionAnnuelle >= 0 ? "#d32f2f" : "#2e7d32",
      
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
  
        icon: <div style={{ position: "relative", width: 45, height: 45 }}>
        <MapPinned size={40} color="#1d4ed8" />
      </div>
      },
    ],
    [year, ap, totalCommune]
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
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
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
    <Graphique1 chart1={chart1} year={year}/>
    </div>
    <Graphique2Pro
      ap={ap}
      chart2Pro={chart2Pro}
      year={year}
    />

    <div style={{ width: "100%" }}>
    <Graphique3 baseFeux={baseFeux} year={year}/>
    </div>

    <div style={{ width: "100%" }}>
    <Graphique4
      chart4={chart4Data}
      year={year}
    />
    </div>

      {/* =====================IMPACT DES FEUX PAR COMMUNE ===================== */}
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
          Impact des feux aux 11 Communes les plus touchés autour de {ap}
        </div>

      <ResponsiveContainer width="100%" height="100%">
      <BarChart
          data={impactFeux}
          margin={{
            top:20,
            right:10,
            left:0,
            bottom:35,
          }}
          barCategoryGap="25%"
          barGap={-18}
        >

            <XAxis
              dataKey="commune"
              interval={0}
              tick={<CustomXAxisTick />}
              axisLine={{
                stroke: "#0066cc",
                strokeWidth: 1.5,
              }}
              tickLine={true}
            />

            <YAxis
              domain={[0, roundedMax]}
              ticks={ticks}
              tick={{
                fill: "#555",
                fontSize: 11,
              }}
              axisLine={{
                stroke: "#0066cc",
                strokeWidth: 1.5,
              }}
              tickLine={{
                stroke: "#0066cc",
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: 11,
                paddingTop: 20,
              }}
              content={() => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background: "#ff0000",
                        display: "inline-block",
                        marginRight: 6,
                      }}
                    />
                    Intérieur AP
                  </div>

                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background: "#ffff00",
                        border: "1px solid #999",
                        display: "inline-block",
                        marginRight: 6,
                      }}
                    />
                    Périphérie 5 km
                  </div>

                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        background: "#d9edf7",
                        display: "inline-block",
                        marginRight: 6,
                      }}
                    />
                    Total
                  </div>
                </div>
              )}
            />
            
            {/* BARRE TOTALE EN ARRIERE */}
            <Bar
              dataKey="total"
              name="Total"
              shape={<CustomTotalBar />}
              barSize={20}
            >
              <LabelList
                dataKey="total"
                position="top"
                fill="#0099ff"
                fontSize={10}
                formatter={(v:number)=>Math.round(v).toLocaleString("fr-FR")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

{/* ===================== JAUGE CIRCULAIRE===================== */}
<div style={{ width: "100%" }}>
<Graphique6
  baseFeux={baseFeux}
  ap={ap}
  year={year}
/>
    </div>

    </div>
    </div>
  );
}
