import React, { useState, useMemo, useEffect } from "react";
import {Trees,MapPinned,Flame,TrendingDown,BadgePercent, Medal,Calendar, MapPin, Slash, TreePine, X, BarChart3,TrendingUp, ShieldCheck
} from "lucide-react";
import {ResponsiveContainer,ComposedChart,BarChart,LineChart,Bar,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,LabelList,ReferenceLine,Cell,
} from "recharts";

import { useLanguage } from "../context/LanguageContext";

interface CardProps {
  title: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  index?: number;
  commune?: string;
  taux?: number;
}

const TEXT = {
  fr: {
    title: "Suivi de la déforestation",
    year: "Année",
    protectedArea: "Aire protégée",

    leastDeforested:
      "Communes les moins déforestées par rapport à leur couverture forestière en",

    loss: "avec une perte",
    forestCover: "de sa couverture forestière",

    kpiForestCover:
      "Couverture forestière des Communes riveraines (2000)",

    kpiRemainingArea:
      "Superficie restante autour de l'Aire Protégée en",

    kpiLossInside:
      "Superficie perdue à l'intérieur de l'Aire Protégée en",

    kpiAverage:
      "Superficie moyenne annuelle de déforestation",

    kpiCumulativeRate:
      "Taux cumulé de perte forestière",

    kpiMostAffected:
      "Commune la plus touchée",

    g1:
      "Les 05 Communes les plus affectées en",

    g2:
      "Déforestation par Commune à l'intérieur de l'Aire Protégée",

    g3:
      "Déforestation dans les Communes riveraines",

    g4:
      "Communes les plus touchées depuis 2001 jusqu'en",

    g5:
      "Évolution annuelle des pertes forestières et du taux de déforestation des Communes riveraines",

    g6:
      "Évolution décennale de la déforestation autour de l'Aire Protégée",

    compare:
      "Comparer avec :",

    inside:
      "À l'intérieur du parc",

    outside:
      "À l'extérieur du parc",

    surface:
      "Superficie",

    surfaceHa:
      "Superficie (ha)",

    cumulative:
      "Cumul (%)",

    lossRate:
      "Taux de perte (%)",

    annualUnit:
      "ha/an",
  },

  mg: {
    title: "Fanaraha-maso ny fahapotehan'ny ala",
    year: "Taona",
    protectedArea: "Faritra arovana",

    leastDeforested:
      "Kaominina vitsy fahapotehan'ala indrindra raha oharina amin'ny rakotra ala tamin'ny",

    loss:
      "nahitana fatiantoka",

    forestCover:
      "amin'ny rakotra alany",

    kpiForestCover:
      "Rakotra ala tany amin'ny Kaominina manodidina (2000)",

    kpiRemainingArea:
      "Velaran'ala sisa tavela manodidina ny Faritra Arovana tamin'ny",

    kpiLossInside:
      "Velaran'ala very tao anatin'ny Faritra Arovana tamin'ny",

    kpiAverage:
      "Salan'isa isan-taona amin'ny fahapotehan'ala",

    kpiCumulativeRate:
      "Tahan'ny fahaverezan'ala mitambatra",

    kpiMostAffected:
      "Kaominina voakasika indrindra",

    g1:
      "Kaominina 05 tena voakasika indrindra tamin'ny",

    g2:
      "Fahapotehan'ala isaky ny Kaominina ao anatin'ny Faritra Arovana",

    g3:
      "Fahapotehan'ala amin'ireo Kaominina manodidina",

    g4:
      "Kaominina tena voakasika indrindra nanomboka 2001 ka hatramin'ny",

    g5:
      "Fivoaran'ny fahaverezan'ala sy ny tahan'ny fahapotehan'ala isan-taona amin'ireo Kaominina manodidina",

    g6:
      "Fivoaran'ny fahapotehan'ala isaky ny folo taona manodidina ny Faritra Arovana",

    compare:
      "Ampitahao amin'ny :",

    inside:
      "Ao anatin'ny valan-javaboary",

    outside:
      "Eo ivelan'ny valan-javaboary",

    surface:
      "Velarana",

    surfaceHa:
      "Velarana (ha)",

    cumulative:
      "Fitambatra (%)",

    lossRate:
      "Tahan'ny fahaverezana (%)",

    annualUnit:
      "ha/taona",
  },

  en: {
    title: "Deforestation Monitoring",
    year: "Year",
    protectedArea: "Protected Area",

    leastDeforested:
      "Least deforested municipalities relative to their forest cover in",

    loss:
      "with a loss of",

    forestCover:
      "of its forest cover",

    kpiForestCover:
      "Forest cover of surrounding municipalities (2000)",

    kpiRemainingArea:
      "Remaining forest area around the Protected Area in",

    kpiLossInside:
      "Forest area lost inside the Protected Area in",

    kpiAverage:
      "Average annual deforestation area",

    kpiCumulativeRate:
      "Cumulative forest loss rate",

    kpiMostAffected:
      "Most affected municipality",

    g1:
      "Top 5 most affected municipalities in",

    g2:
      "Deforestation by municipality inside the Protected Area",

    g3:
      "Deforestation in surrounding municipalities",

    g4:
      "Most affected municipalities since 2001 until",

    g5:
      "Annual evolution of forest loss and deforestation rate in surrounding municipalities",

    g6:
      "Decadal evolution of deforestation around the Protected Area",

    compare:
      "Compare with:",

    inside:
      "Inside the park",

    outside:
      "Outside the park",

    surface:
      "Area",

    surfaceHa:
      "Area (ha)",

    cumulative:
      "Cumulative (%)",

    lossRate:
      "Loss rate (%)",

    annualUnit:
      "ha/year",
  },

  de: {
    title: "Überwachung der Entwaldung",
    year: "Jahr",
    protectedArea: "Schutzgebiet",

    leastDeforested:
      "Gemeinden mit der geringsten Entwaldung im Verhältnis zu ihrer Waldfläche im",

    loss:
      "mit einem Verlust von",

    forestCover:
      "ihrer Waldfläche",

    kpiForestCover:
      "Waldfläche der angrenzenden Gemeinden (2000)",

    kpiRemainingArea:
      "Verbleibende Waldfläche rund um das Schutzgebiet im",

    kpiLossInside:
      "Verlorene Waldfläche innerhalb des Schutzgebiets im",

    kpiAverage:
      "Durchschnittliche jährliche Entwaldungsfläche",

    kpiCumulativeRate:
      "Kumulative Waldverlustrate",

    kpiMostAffected:
      "Am stärksten betroffene Gemeinde",

    g1:
      "Die 5 am stärksten betroffenen Gemeinden im",

    g2:
      "Entwaldung nach Gemeinden innerhalb des Schutzgebiets",

    g3:
      "Entwaldung in den umliegenden Gemeinden",

    g4:
      "Am stärksten betroffene Gemeinden seit 2001 bis",

    g5:
      "Jährliche Entwicklung der Waldverluste und Entwaldungsrate der umliegenden Gemeinden",

    g6:
      "Zehnjährige Entwicklung der Entwaldung rund um das Schutzgebiet",

    compare:
      "Vergleichen mit:",

    inside:
      "Innerhalb des Parks",

    outside:
      "Außerhalb des Parks",

    surface:
      "Fläche",

    surfaceHa:
      "Fläche (ha)",

    cumulative:
      "Kumuliert (%)",

    lossRate:
      "Verlustrate (%)",

    annualUnit:
      "ha/Jahr",
  },
};

const KPICard = ({
  title,
  value,
  color,
  icon,
  index,
  commune,
  taux,
}: CardProps) => {
  const { lang } = useLanguage();
const t = TEXT[lang] || TEXT.fr;

  const isSixth = index === 5;

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
      {isSixth ? (
        <>
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#dc2626",
                }}
              >
                {commune || "-"}
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ color: "#2563eb" }}>
                  {t.loss}
                </span>{" "}

                <span
                  style={{
                    color: "#dc2626",
                    fontWeight: 800,
                  }}
                >
                  {taux !== undefined
                    ? taux.toFixed(1)
                    : "0.0"}
                  %
                </span>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#2563eb",
                  fontWeight: 600,
                  marginTop: 8,
                }}
              >
                {t.forestCover}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
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

  
export default function Deforestation() {
  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.fr;
  
  const [year, setYear] = useState<number>(2019);
  const [ap, setAp] = useState<string>("Ankarafantsika");
  const [baseDeforestation,setBaseDeforestation]=useState<any[]>([]);
  const [yearCompareG2,setYearCompareG2] = useState(2018);
  const [yearCompareG3,setYearCompareG3] = useState(2018);

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

    const kpis = useMemo(
      () => [
        {
          title: t.kpiForestCover,
          value: `${couverture2000.toLocaleString()} ha`,
          color: "#2e7d32",
          icon: <Trees size={40} />,
        },
    
        {
          title: `${t.kpiRemainingArea} ${year}`,
          value: `${superficieRestante.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })} ha`,
          color: "#2e7d32",
          icon: <Trees size={40} />,
        },
    
        {
          title: `${t.kpiLossInside} ${year}`,
          value: `${perteAnnee.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })} ha`,
          color: "#c40000",
          icon: (
            <div
              style={{
                position: "relative",
                width: 40,
                height: 40,
              }}
            >
              <TreePine size={40} color="#c40000" />
            </div>
          ),
        },
    
        {
          title: t.kpiAverage,
          value: `${moyenneAnnuelle.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })} ${t.annualUnit}`,
          color: "#c40000",
          icon: <TrendingDown size={40} />,
        },
    
        {
          title: t.kpiCumulativeRate,
          value: `${tauxPerte.toFixed(2)}%`,
          color: "#ff6600",
          icon: (
            <div style={{ position: "relative" }}>
              <BarChart3 size={40} color="#ff6600" />
              <TrendingUp
                size={30}
                color="#00c853"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                }}
              />
            </div>
          ),
        },
    
        {
          title: t.kpiMostAffected,
          value: "",
          commune: communeImpactee?.commune,
          taux: communeImpactee?.taux,
          color: "#003399",
          icon: <MapPinned size={40} />,
        },
      ],
      [
        t,
        year,
        ap,
        couverture2000,
        superficieRestante,
        perteAnnee,
        moyenneAnnuelle,
        tauxPerte,
        communeImpactee,
      ]
    );

const chart1 = useMemo(()=>{
  // Toutes les communes de l'AP choisie
  const toutesCommunes = dataAP
    .filter(f =>
      String(f.properties.Source)
      .trim()
      .toLowerCase() === "commune"
    )
    .map(f=>{
      const p = f.properties;
      return {
        commune:p.Commune,
        superficie:
          Number(
            p[String(year)] || 0
          )
      };
    })
    .filter(d=>d.superficie>0)
    .sort(
      (a,b)=>
        b.superficie-a.superficie
    );
  // perte totale de toutes les communes
  const totalToutesCommunes =
    toutesCommunes.reduce(
      (s,d)=>s+d.superficie,
      0
    );
  // seulement les 5 premières
  const top5 =
    toutesCommunes.slice(0,5);
  let cumul = 0;
  return top5.map(d=>{
    cumul += d.superficie;
    return {
      commune:d.commune,
      superficie:d.superficie,
      pct:
        totalToutesCommunes>0
        ?
        Number(
          ((cumul/totalToutesCommunes)*100)
          .toFixed(1)
        )
        :
        0
    };

  });
},[
 dataAP,
 year
]);

const chart2Pro = useMemo(()=>{
  const communes = dataAP
    .filter(f =>
      f.properties.Source === "Interrieur"
    )
    .map(f=>{  
      const p = f.properties;  
      return {
        commune:p.Commune,
        y1:Number(p[String(yearCompareG2)] || 0),
        y2:Number(p[String(year)] || 0)
      };  
    })  
    // garder les 11 plus touchées
    .sort((a,b)=>
      (b.y1+b.y2)-(a.y1+a.y2)
    )  
    .slice(0,11)
    // affichage alphabétique
    .sort((a,b)=>
      a.commune.localeCompare(b.commune)
    )
    .map(d=>({  
      ...d,
      communeCourt:
      d.commune.length>8
      ?
      d.commune.substring(0,8)+"..."
      :
      d.commune  
    }));
return communes;  

},[
  dataAP,
  year,
  yearCompareG2
 ]);

const chart3Pro = useMemo(()=>{
  const communes = dataAP
    .filter(f =>
      f.properties.Source === "Commune"
    )
    .map(f=>{
      const p = f.properties;
      return {
        commune:p.Commune,
        y1:Number(p[String(yearCompareG3)] || 0),
        y2:Number(p[String(year)] || 0)
      };
    })
    // prendre les 11 plus touchées
    .sort((a,b)=>{
      return (b.y1 + b.y2) - (a.y1 + a.y2);
    })
    .slice(0,11)
    // puis classement alphabétique
    .sort((a,b)=>
      a.commune.localeCompare(b.commune)
    )
    .map(d=>({
      ...d,
      communeCourt:
      d.commune.length > 8
      ?
      d.commune.substring(0,8)+"..."
      :
      d.commune
    }));
return communes;
},[
  dataAP,
  year,
  yearCompareG3
 ]);

const chart4 = useMemo(()=>{
  // toutes les communes riveraines de l'AP choisi
  const toutesCommunes = dataAP
    .filter(f =>
      String(f.properties.Source)
      .trim()
      .toLowerCase() === "commune"
    )
    .map(f=>{
      const p = f.properties;
      // perte cumulée depuis 2001 jusqu'à l'année choisie
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
      return {
        commune:p.Commune,
        superficie:perteCumulee
      };
    })
    .filter(d=>d.superficie>0)
    .sort(
      (a,b)=>
      b.superficie-a.superficie
    );
  // perte totale de toutes les communes
  const total =
    toutesCommunes.reduce(
      (s,d)=>s+d.superficie,
      0
    );
  // garder seulement les 5 plus touchées
  const top5 =
    toutesCommunes.slice(0,5);
  let cumul = 0;
  return top5.map(d=>{
    cumul += d.superficie;
    return {
      commune:d.commune,
      superficie:
        Number(
          d.superficie.toFixed(2)
        ),
      pct:
        total>0
        ?
        Number(
          ((cumul/total)*100)
          .toFixed(1)
        )
        :
        0
      };
    });
  },[
  dataAP,
  year
  ]);

const chart5Pro = useMemo(() => {
  const lignes = dataAP.filter(
    f => f.properties.Source === "Interrieur"
  );
  return Array.from(
    { length: 24 },
    (_, i) => 2001 + i
  ).map(annee => {
    // perte de l'année
    const perteAnnee = lignes.reduce((total, f) => {
      return total +
        Number(
          f.properties[String(annee)] || 0
        );
    }, 0);
    // couverture restante avant cette année
    const couvertureRestante = lignes.reduce((total, f) => {
      const p = f.properties;
      const perteAvant = Object.keys(p)
        .filter(key =>
          Number(key) >= 2001 &&
          Number(key) < annee
        )
        .reduce(
          (s, key) =>
            s + Number(p[key] || 0),
          0
        );
      return total +
        (
          Number(p.Couverture2000 || 0)
          - perteAvant
        );
    }, 0);
    const taux =
      couvertureRestante > 0
        ? (perteAnnee / couvertureRestante) * 100
        : 0;
    return {
      annee,
      taux: Number(taux.toFixed(2))
    };
  });
}, [dataAP, year]);


const picTaux = useMemo(() => {
  return chart5Pro.reduce((max, item) =>
    item.taux > max.taux
      ? item
      : max
  );
}, [chart5Pro]);


const chartEvolution = useMemo(() => {
  const annees = Array.from({ length: 24 }, (_, i) => 2001 + i);
  return annees.map((annee) => {
    // Perte annuelle (ha)
    const superficie = dataAP
      .filter(f => f.properties.Source === "Commune")
      .reduce(
        (total, f) =>
          total + Number(f.properties[String(annee)] || 0),
        0
      );
    // Couverture restante avant cette année
    const couvertureAvant = dataAP
      .filter(f => f.properties.Source === "Commune")
      .reduce((total, f) => {
        const p = f.properties;
        const perteAvant = Object.keys(p)
          .filter(key => Number(key) >= 2001 && Number(key) < annee)
          .reduce(
            (s, key) => s + Number(p[key] || 0),
            0
          );
        return total + (Number(p.Couverture2000) - perteAvant);
      }, 0);
    // Taux annuel (%)
    const taux =
      couvertureAvant > 0
        ? (superficie / couvertureAvant) * 100
        : 0;
    return {
      annee,
      superficie,
      taux: Number(taux.toFixed(2)),
    };
  });
}, [dataAP]);


const chartInterieurDecennie = useMemo(()=>{
  const calculInterieur = (annees:number[])=>{  
    return dataAP
        .filter(f =>
          String(f.properties.Source)
          .trim()
          .toLowerCase()
          ==="interrieur"
        )
    .reduce(
    (total,f)=>{
    
    return total +
      annees.reduce(
      (s,annee)=>
      s +
      Number(
      f.properties[String(annee)] || 0
      )
      ,0);    
    },
    0);    
    };  
  
  return [  
  {
  periode:"2001 - 2010",
  valeur:calculInterieur([
  2001,2002,2003,2004,2005,
  2006,2007,2008,2009,2010
  ])
  },  
  {
  periode:"2011 - 2020",
  valeur:calculInterieur([
  2011,2012,2013,2014,2015,
  2016,2017,2018,2019,2020
  ])
  },  
  {
  periode:"2021 - 2025",
  valeur:calculInterieur([
  2021,2022,2023,2024,2025
  ])
  }  
  ];  
  },[
  dataAP,
  ap
  ]);
  const chartExterieurDecennie = useMemo(()=>{
    const calculSource = (
      source:string,
      annees:number[]
      )=>{    
    return dataAP
      .filter(f =>
        String(f.properties.Source)
        .trim()
        .toLowerCase()
        ===source.toLowerCase()
      )
    .reduce(
    (total,f)=>{    
    return total +
    annees.reduce(
    (s,annee)=>
    s+
    Number(
    f.properties[String(annee)] || 0
    )
    ,0);    
    },
    0);    
    };

    const calculExterieur = (annees:number[])=>{    
    return (
    calculSource(
    "Commune",
    annees
    )
    -
    calculSource(
    "Interrieur",
    annees
    )
    );    
    };   
    
    
    return [    
    {
    periode:"2001 - 2010",
    valeur:calculExterieur([
    2001,2002,2003,2004,2005,
    2006,2007,2008,2009,2010
    ])
    },    
    {
    periode:"2011 - 2020",
    valeur:calculExterieur([
    2011,2012,2013,2014,2015,
    2016,2017,2018,2019,2020
    ])
    },    
    {
    periode:"2021 - 2025",
    valeur:calculExterieur([
    2021,2022,2023,2024,2025
    ])
    }    
    ];    
    },[
    dataAP,
    ap
    ]);


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
        {t.g1} {year}
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
            angle={-20}
            interval={0}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 10 }}
            padding={{ left: 0, right: 0 }}
            tickFormatter={(value)=> 
              value.length > 8
                ? `${value.substring(0,8)}...`
                : value
            }
          />
          <YAxis
            yAxisId="left"
            domain={[0, "dataMax"]}
            tick={{ fontSize: 11 }}
          />
          <Bar
            yAxisId="left"
            name={t.surface}
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
            name={t.cumulative}
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


const Graphique2Pro = () => {
  const renderArrow = (props:any)=>{
    const {
      x,
      y,
      width,
      index
    } = props;
    const item = chart2Pro[index];
    if(!item){
      return null;
    }
    const difference =
      item.y2 - item.y1;
    if(difference === 0){
      return null;
    }
    return (
      <text
        x={x + width / 2}
        y={y - 1}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill={
          difference > 0
          ? "#dc2626"
          : "#16a34a"
        }
      >
        {
          difference > 0
          ? "▲"
          : "▼"
        }
      </text>
    );
  };

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
        textAlign:"center",
        color:"#d32f2f",
        fontSize:12,
        fontWeight:700,
        fontStyle:"italic",
        marginBottom:5,
        }}
        >
        {t.g2}
        </div>
        <div
          style={{
          display:"flex",
          justifyContent:"center",
          alignItems:"center",
          gap:8,
          marginBottom:5
          }}
        >

        <span
          style={{
          fontSize:11,
          fontWeight:600
          }}
        >
        {t.compare}
        </span>
        <select
          value={yearCompareG2}
          onChange={(e)=>
          setYearCompareG2(Number(e.target.value))
          }
          style={{
            fontSize:11,
            padding:"3px 8px",
            borderRadius:6
          }}
        >
        {
          Array.from(
          {length:24},
          (_,i)=>2001+i
          )
          .map(y=>
          <option key={y}>
          {y}
        </option>
        )
        }
        </select>
      </div>

      <ResponsiveContainer width="100%" height="100%" >
        <BarChart data={chart2Pro} barGap={1} barCategoryGap="20%">
          <XAxis
            dataKey="communeCourt"
            angle={-20}
            interval={0}
            textAnchor="end"
            height={70}
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
            dataKey="y1"
            name={String(yearCompareG2)}
            fill="#fdba74"
            barSize={13}
            radius={[2,2,0,0]}
          />            
            <Bar
                dataKey="y2"
                name={String(year)}
                fill="#c2410c"
                barSize={13}
                radius={[2,2,0,0]}
                >
                <LabelList
                content={renderArrow}
              />
            </Bar>
            <LabelList content={renderArrow} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const Graphique3 = () => {
  const CustomDot = (props:any) => {
    const {
      cx,
      cy,
      payload
    } = props;  
  
    const difference =
      payload.y2 - payload.y1;  
  
    const isIncrease = difference > 0;
    const isDecrease = difference < 0;  
  
    if(difference === 0){
      return (
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="#2563eb"
        />
      );
    }  
    return (
      <g>  
        {/* point */}
        <circle
          cx={cx}
          cy={cy}
          r={2}
          fill="#2563eb"
        />  
        {/* flèche */}
        <text
          x={cx}
          y={cy-10}
          textAnchor="middle"
          fontSize={8}
          fontWeight={700}
          fill={
            isIncrease
            ? "#dc2626"
            : "#16a34a"
          }
        >
          {
            isIncrease
            ? "▲"
            : "▼"
          }
        </text>  
        {/* différence ha */}
        <text
          x={cx}
          y={cy-2}
          textAnchor="middle"
          fontSize={8}
          fontWeight={700}
          fill={
            isIncrease
            ? "#dc2626"
            : "#16a34a"
          }
        >
          {
            Math.abs(difference)
            .toFixed(1)
          }
        </text>
      </g>
    );
  };

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
          textAlign:"center",
          color:"#d32f2f",
          fontSize:12,
          fontWeight:700,
          fontStyle:"italic",
          marginBottom:5,
          }}
          >
          {t.g3}
          </div>
          <div
            style={{
            display:"flex",
            justifyContent:"center",
            alignItems:"center",
            gap:10,
            marginBottom:2
          }}
          >
          <span
            style={{
            fontSize:11,
            fontWeight:600,
            color:"#333"
          }}
          >
          {t.compare}
          </span>
          <select
            value={yearCompareG3}
            onChange={(e)=>
            setYearCompareG3(Number(e.target.value))
            }
          style={{
            padding:"3px 8px",
            borderRadius:6,
            border:"1px solid #d1d5db",
            fontSize:11,
            fontWeight:600
          }}
          >
          {[2001,2002,2003,2004,2005,
          2006,2007,2008,2009,2010,
          2011,2012,2013,2014,2015,
          2016,2017,2018,2019,2020,
          2021,2022,2023,2024]
          .map(y=>
          <option key={y}>
          {y}
          </option>
          )}
          </select>
        </div>
      <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chart3Pro}
          >
          <CartesianGrid stroke="#e5e7eb" />
          <XAxis
            dataKey="communeCourt"
            angle={-20}
            interval={0}
            textAnchor="end"
            height={70}
            tick={{fontSize:10}}
            padding={{left:10,right:10}}
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
          fontSize:12,
          fontWeight:600,
          color:"#1565c0",
          }}
        />
          <Line
            type="monotone"
            dataKey="y1"
            name={String(yearCompareG3)}
            stroke="#dc2626"
            strokeWidth={2}
            dot={{r:1}}
          />
          <Line
            type="monotone"
            dataKey="y2"
            name={String(year)}
            stroke="#2563eb"
            strokeWidth={2}
            dot={<CustomDot />}
            />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Graphique4 = () => {
  const chart4Pro = [...chart4]
.sort((a, b) => b.superficie - a.superficie)
.map((d, index, arr) => {

  const total = arr.reduce(
    (sum, x) => sum + x.superficie,
    0
  );
  const cumulated = arr
    .slice(0, index + 1)
    .reduce(
      (sum, x) => sum + x.superficie,
      0
    );
  return {
    ...d,
    pctCum:
      Number(
        ((cumulated / total) * 100)
        .toFixed(1)
      )
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
        {t.g4} {year}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chart4} margin={{ top: 15, bottom: 15 }} barCategoryGap="25%">
          <CartesianGrid stroke="#f3f4f6" />
            <XAxis
              dataKey="commune"
              angle={-20}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
              height={50}
              tickFormatter={(value)=> 
                value.length > 8
                  ? `${value.substring(0,8)}...`
                  : value
              }
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
            name={t.surfaceHa}
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
            name={t.cumulative}
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


return (
    <div
        style={{
          padding: 12,
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
            {t.title}
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
                {t.year}
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
                <option value={2025}>2025</option>
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
                {t.protectedArea}
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
          <ShieldCheck size={18} color="#16a34a" />

          {t.leastDeforested} {year}
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
          { communesMoinsDeforestees.map((item,index)=>{

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
                ({item.taux.toFixed(2)}%)
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

        {/* =====================EVOLUTION ===================== */}
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
            {t.g5}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartEvolution}>
                <CartesianGrid stroke="#e5e7eb" />
                  <XAxis
                    dataKey="annee"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                    padding={{ left: 5, right: 5 }}
                  />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  domain={[
                    0,
                    (dataMax: number) => Math.ceil(dataMax / 1000) * 1000
                  ]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  hide={true}
                />
                <Bar
                    yAxisId="left"
                    dataKey="superficie"
                    name={t.surface}
                    fill="#93c5fd"
                    barSize={10}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="taux"
                  name={t.lossRate}
                  stroke="#dc2626"
                  strokeWidth={1.5}
                  dot={(props:any)=>{
                    const {
                      cx,
                      cy,
                      payload
                    } = props;
                  
                    const isPeak = payload.annee === picTaux.annee;
                  
                    if (!isPeak) {
                      return null;
                    }
                  
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="#dc2626"
                          stroke="#fff"
                          strokeWidth={1.5}
                        />
                  
                        <text
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={700}
                          fill="#dc2626"
                        >
                          {payload.taux.toFixed(1)}%
                        </text>
                      </g>
                    );
                  }}
                />
              <LabelList
                dataKey="taux"
                position="top"
                formatter={(v:number)=>`${v}%`}
                fontSize={10}
              />
              <Legend
                verticalAlign="top"
                align="center"
                wrapperStyle={{
                  fontSize: 11,
                  fontWeight: 600
                }}
              />
              </ComposedChart>
          </ResponsiveContainer>
        </div>

          {/* ===================== HISTOGRAMME ANNUEL ===================== */}
          <div
            style={{
              background:"#fff",
              border:"1px solid #d9d9d9",
              borderRadius:8,
              padding:10,
              height:"auto"
            }}
          >
          {/* TITRE PRINCIPAL */}
          <div
            style={{
              textAlign:"center",
              color:"#d32f2f",
              fontSize:12,
              fontWeight:700,
              fontStyle:"italic",
              marginBottom:5
            }}
          >
          {t.g6} {ap}
          </div>
          {/* ================= INTERIEUR ================= */}
          <div
            style={{
              color:"#d97706",
              fontSize:12,
              fontWeight:700,
              marginBottom:3
            }}
          >
          {t.inside}
          </div>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart
              data={chartInterieurDecennie}
              layout="vertical"
              margin={{
              left:5,
              right:10
              }}
            >
            <XAxis
              type="number"
              hide
            />
            <YAxis
              type="category"
              dataKey="periode"
              width={90}
              tick={{
                fontSize:11,
                fill:"#333"
              }}
            />
              <Bar
                dataKey="valeur"
                barSize={22}
                radius={[0,2,2,0]}
              >
              {
              [
              "#fde68a",
              "#f59e0b",
              "#d97706"
              ].map((color,index)=>(

              <Cell
                key={index}
                fill={color}
              />
              ))
              }
              <LabelList
                dataKey="valeur"
                content={(props:any)=>{
                const {
                    x,
                    y,
                    width,
                    height,
                    value
                  }=props;
                const texte =
                `${Math.round(value).toLocaleString()} ha`;
                const largeurTexte =
                texte.length * 6;

                // Si la barre est assez grande
                const inside =
                width > largeurTexte + 30;

              return (
              <text
                  x={
                    inside
                    ?
                    x + width - 5
                    :
                    x + width + 5
                  }
                  y={
                    y + height/2
                  }
                  dy={4}
                  textAnchor={
                    inside
                    ?
                    "end"
                    :
                    "start"
                  }
                  fill={
                    inside
                    ?
                    "#fff"
                    :
                    "#333"
                  }
                  fontSize={11}
                  fontWeight={700}
                >
              {texte}
              </text>
              );
              }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

          {/* ================= EXTERIEUR ================= */}
          <div
              style={{
                color:"#2563eb",
                fontSize:12,
                fontWeight:700,
                marginTop:8,
                marginBottom:3
              }}
          >
            {t.outside}
          </div>
          <ResponsiveContainer width="100%" height={90}>
              <BarChart
                data={chartExterieurDecennie}
                layout="vertical"
                margin={{
                left:5,
                right:30
                }}
              >
              <XAxis
                type="number"
                hide
              />
              <YAxis
                type="category"
                dataKey="periode"
                width={90}
                tick={{
                fontSize:11,
                fill:"#333"
              }}
              />
              <Bar
                dataKey="valeur"
                barSize={22}
                radius={[0,4,4,0]}
              >
                {
                [
                "#bfdbfe",
                "#60a5fa",
                "#2563eb"
                ].map((color,index)=>(
                <Cell
                  key={index}
                  fill={color}
                />
                ))
                }
                <LabelList
                  dataKey="valeur"
                  content={(props:any)=>{
                const {
                  x,
                  y,
                  width,
                  height,
                  value
                }=props;
                const texte =
                `${Math.round(value).toLocaleString()} ha`;
                const largeurTexte =
                texte.length * 6;
                const inside =
                width > largeurTexte + 30;
                return (
                <text
                    x={
                    inside
                    ?
                    x + width - 5
                    :
                    x + width + 5
                    }
                    y={
                    y + height/2
                    }
                    dy={4}
                    textAnchor={
                    inside
                    ?
                    "end"
                    :
                    "start"
                    }
                    fill={
                    inside
                    ?
                    "#fff"
                    :
                    "#333"
                    }
                    fontSize={11}
                    fontWeight={700}
                    >
                    {texte}
                  </text>
                );
                }}
              />
              </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>   
  </div>
  </div>
  );
}
