import React, { useState, useMemo } from "react";
import {Trees,MapPinned,Flame,TrendingDown,BadgePercent, Medal,Calendar, MapPin
} from "lucide-react";

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

interface CardProps {
    title: string;
    value: string;
    color: string;
    icon: React.ReactNode;
    index?: number;
  }

  const KPICard = ({ title, value, color, icon, index }: CardProps) => {
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              
              <div style={{ color, display: "flex", alignItems: "center" }}>
                {icon}
              </div>
  
              <div style={{ display: "flex", flexDirection: "column" }}>
  
                <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>
                    Tsaramandroso
                </div>

                <div style={{ fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: "#2563eb" }}>
                    avec une perte
                    </span>{" "}
                    <span style={{ color: "#dc2626", fontWeight: 800 }}>
                    57,93%
                    </span>
                </div>

                <div
                    style={{
                    fontSize: 13,
                    color: "#2563eb", 
                    fontWeight: 600,
                    marginTop: 8,
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

export default function Deforestation() {
  const [year, setYear] = useState<number>(2019);
  const [ap, setAp] = useState<string>("Ankarafantsika");

  const kpis = useMemo(() => [
    {
      title: "Couverture forestière des Communes riveraines (2000)",
      value: "199 305,18 ha",
      color: "#2e7d32",
      icon: <Trees size={40} />,
    },
    {
      title: `Superficie restante autour de l'Aire Protégée en ${year}`,
      value: "112 338,00 ha",
      color: "#2e7d32",
      icon: <Trees size={40} />,
    },
    {
      title: `Superficie perdue à l'intérieur de l'Aire Protégée en ${year}`,
      value: "24 625,98 ha",
      color: "#c40000",
      icon: <Flame size={40} />,
    },
    {
      title: "Superficie moyenne annuelle de déforestation",
      value: "218,74 ha/an",
      color: "#c40000",
      icon: <TrendingDown size={40} />,
    },
    {
      title: "Taux cumulé de perte forestière",
      value: "31,28%",
      color: "#ff6600",
      icon: <BadgePercent size={40} />,
    },
    {
      title: "Commune la plus touchée",
      value: "Tsaramandroso",
      color: "#003399",
      icon: <MapPinned size={40} />,
    },
  ], [year]);

  return (
    <div
      style={{
        padding: 10,
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
      >
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
      fontSize: 14,
      whiteSpace: "nowrap",
    }}
  >
    Communes les moins déforestées par rapport à leur couverture forestière en {year}
  </div>

  <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 18,
    width: "100%",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Medal color="gold" />
    <span>Ambolomoty</span>
    <span style={{ color: "#16a34a" }}>(0%)</span>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Medal color="silver" />
    <span>Tsararano</span>
    <span style={{ color: "#16a34a" }}>(0.15%)</span>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Medal color="#cd7f32" />
    <span>Antanimasaka</span>
    <span style={{ color: "#16a34a" }}>(0.17%)</span>
  </div>
</div>
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr 0.9fr 1.2fr",
    gap: 2,
    marginBottom: 20,
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
    </div>
  );
}