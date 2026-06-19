import React from "react";
import {
            ResponsiveContainer,
            PieChart,
            Pie,
            Cell,
            LineChart,
            Line,
            XAxis,
            YAxis,
            CartesianGrid,
            Tooltip,
            ReferenceLine, 
            Area,
            Legend,
        } from "recharts";

import {
    RefreshCw,
} from "lucide-react";

import ConfirmationBeneficiaires from "../components/ConfirmationBeneficiaires";

const COLORS = ["#2e7d32", "#c8e6c9"];

const lineData = [
{ annee: "2025", valeur: 6890 },
{ annee: "2026", valeur: 9785 },
{ annee: "2027", valeur: 12864 },
{ annee: "2028", valeur: 15943 },
{ annee: "2029", valeur: 18357 },
{ annee: "2030", valeur: 25000 },
];

const donut = (value: number) => [
{ name: "done", value },
{ name: "rest", value: 100 - value },
];

const cardTitleStyle: React.CSSProperties = {
    margin: 0,
    marginBottom: 8,
    color: "#1B5E20",
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
  };

const filtres = {
    'Année': ['Tous', '2025', '2026', '2027', '2028', '2029', '2030'],

    'Région': [
    'Tous',
    'Boeny',
    'DIANA',
    'Anôsy',
    'Vakinankaratra',
    'Amoron’i Mania',
    'Atsimo Atsinanana',
    ],

    'Aire protégée': [
    'Tous',
    'Ankarafantsika',
    'Andohahela',
    'Analamerana',
    'Ankarana',
    'Befotaka-Midongy',
    'Marolambo',
    'Montagne d’Ambre',
    ],

    'Paysage': [
    'Tous',
    'Paysage Nord',
    'Paysage Centre',
    'Paysage Sud',
    ],

    'District': [
    'Tous',
    'Mahajanga I',
    'Mahajanga II',
    'Marovoay',
    ],

    'Commune': [
    'Tous',
    'Marovoay',
    'Anjiajia',
    'Ambato-Boeny',
    ],

    'Fokontany': [
    'Tous',
    'Antanambao',
    'Tsararano',
    'Mangarivotra',
    ],

    'Micro-bassin versant': [
    'Tous',
    'MBV-001',
    'MBV-002',
    'MBV-003',
    ],
};


const Beneficiaires: React.FC = () => {

    const [modeConfirmation, setModeConfirmation] = React.useState(false);
return (
        <div style={{ background: "#f4f6f5", minHeight: "100vh", fontFamily: "Arial" }}>

            {/* HEADER */}
            <div style={{
                background: "#0b5d1e",
                color: "#fff",
                padding: "8px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 700
                }} 
            >
            <h2 style={{ margin: 0 }}>Suivi des petits exploitants</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <button
                onClick={() => setModeConfirmation(!modeConfirmation)}
                style={{
                    background: "transparent",
                    color: "#ffffff",
                    border: "1px solid #ffffff",
                    padding: "10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                }}
                >
                {modeConfirmation
                    ? "Retour au suivi"
                    : "Confirmation des bénéficiaires"}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 6 , cursor: "pointer"}}>
                    <RefreshCw size={18} />
                    <span>
                        Actualiser
                    </span>
                </div>

            </div>
            </div>

            {/* CONTENT */}
            <div style={{ padding: 10 }}>
                {modeConfirmation ? (
                    <ConfirmationBeneficiaires />
                ) : (
                <>                

                {/* ===================== FILTRES ===================== */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8,1fr)',
                        gap: 5,
                        marginBottom: 6,
                    }}
                    >
                    {Object.entries(filtres).map(([label, options]) => (
                        <div
                        key={label}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}
                        >
                        <label
                            style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#374151',
                            }}
                        >
                            {label}
                        </label>

                        <select
                            style={{
                            height: 38,
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            padding: '0 10px',
                            }}
                        >
                            {options.map((option) => (
                            <option key={option}>
                                {option}
                            </option>
                            ))}
                        </select>
                        </div>
                    ))}
                </div>

                {/* BARRE VERTE */}
                <div style={{
                    marginTop: 4,
                    background: "#2e7d32",
                    color: "white",
                    padding: 8,
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13
                    }}
                >
                1. Atteinte de l’objectif : 25 000 petits exploitants agricoles (Bénéficiaires C2, C3 et C4)
                </div>

                {/* TOP GRID */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1.6fr 0.8fr 1fr",
                    gap: 6,
                    marginTop: 6
                    }}
                >

                {/* KPI */}
                <div style={{ background: "white", padding: 12, borderRadius: 8, textAlign: "center" }}>

                    <h4 style={cardTitleStyle}>Total petits exploitants</h4>

                    <h1 style={{ margin: "15px 0 0", fontSize: 30, textAlign: "center" }}>18 357</h1>

                    <div style={{ textAlign: "center", color: "#555" }}>
                        sur 25 000                
                    </div>
                    
                    <h3 style={{ color: "#2e7d32", textAlign: "center", marginTop: 8}}>
                    73,4%
                    </h3>

                    <div style={{
                        marginTop: 0,
                        height: 11,
                        background: "#e0e0e0",
                        borderRadius: 8,
                        overflow: "hidden"
                        }}>
                    <div style={{
                        width: "73.4%",
                        background: "#2e7d32",
                        height: "100%"
                        }} 
                    />                    
                    </div>

                    <div style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>
                    Cible : 25 000
                    </div>

                    
                </div>

                {/* TABLE */}
                <div style={{
                            background: "white",
                            padding: "12px 14px",
                            borderRadius: 8,
                        }}>
                        
                        <h4 style={cardTitleStyle}>
                            Répartition des petits exploitants par catégorie
                        </h4>

                        <table style={{
                            width: "100%",
                            fontSize: 11,
                            borderCollapse: "collapse",
                            textAlign: "center"
                        }}>

                            <thead>
                            <tr style={{ background: "#2e7d32", color: "white" }}>
                                <th style={{ border: "1px solid #ccc", padding: 5 }}>Catégorie</th>
                                <th style={{ border: "1px solid #ccc", padding: 6 }}>Nombre</th>
                                <th style={{ border: "1px solid #ccc", padding: 10 }}>% du total</th>
                                <th style={{ border: "1px solid #ccc", padding: 10 }}>% Femmes</th>
                                <th style={{ border: "1px solid #ccc", padding: 10 }}>% Jeunes (&lt; 35 ans)</th>
                            </tr>
                            </thead>

                            <tbody>
                            <tr>
                                <td style={{ border: "1px solid #ccc", padding: 5 }}>C2</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>6 542</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>35.6%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>48.7%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>32.1%</td>
                            </tr>

                            <tr>
                                <td style={{ border: "1px solid #ccc", padding: 5 }}>C3</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>8 726</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>47.5%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>45.3%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>34.8%</td>
                            </tr>

                            <tr>
                                <td style={{ border: "1px solid #ccc", padding: 5 }}>C4</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>3 089</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>16.8%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>41.2%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>29.6%</td>
                            </tr>

                            <tr style={{ background: "#e8f5e9", fontWeight: "bold" }}>
                                <td style={{ border: "1px solid #ccc", padding: 5 }}>Total</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>18 357</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>100%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>45.7%</td>
                                <td style={{ border: "1px solid #ccc", padding: 10 }}>32.6%</td>
                            </tr>
                            </tbody>
                        </table>
                </div>               

                {/* DONUTS */}
                {[45.7, 32.6].map((v, i) => (
                <div key={i} style={{ background: "white", padding: 5, borderRadius: 8, textAlign: "center" }}>

                        <h4 style={cardTitleStyle}>{i === 0 ? "Part des femmes (Total)" : "Part des Jeunes < 35 ans (Total)"}</h4>

                        <div style={{ position: "relative", width: "100%", height: 180 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={donut(v)} dataKey="value" innerRadius={40} outerRadius={70}>
                                        {donut(v).map((_, i2) => (
                                        <Cell key={i2} fill={COLORS[i2]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                        {/* CENTRE TEXT */}
                        <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontWeight: "bold",
                            color: "#2e7d32",
                            fontSize: 16
                            }}>
                                {v}%
                        </div>
                    </div>
                </div>
                ))}
                </div>
                {/* DONUT SECTION GLOBAL (2 GRIDS COTE À COTE) */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 5,
                    marginTop: 8
                }}>

                {/* ================= FEMMES ================= */}
                <div style={{ background: "white", padding: 10, borderRadius: 8 }}>
                    
                <h4 style={cardTitleStyle}>
                    Part des femmes (%) par catégorie
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
                    {[48.7, 45.3, 41.2].map((v, i) => (
                        <div key={i} style={{ textAlign: "center" }}>

                        <div style={{ fontWeight: 700, marginBottom: 0 }}>
                            {["C2", "C3", "C4"][i]}
                        </div>

                        <div style={{ position: "relative", width: "100%", height: 140 }}>
                            <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                data={donut(v)}
                                dataKey="value"
                                innerRadius={40}
                                outerRadius={60}
                                >
                                {donut(v).map((_, i2) => (
                                    <Cell key={i2} fill={COLORS[i2]} />
                                ))}
                                </Pie>
                            </PieChart>
                            </ResponsiveContainer>

                            <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontWeight: "bold",
                            color: "#2e7d32",
                            fontSize: 16
                            }}>
                            {v}%
                            </div>
                        </div>

                        </div>
                    ))}
                    </div>
                </div>

                {/* ================= JEUNES ================= */}
                <div style={{ background: "white", padding: 10, borderRadius: 8 }}>
                    
                <h4 style={cardTitleStyle}>
                    Part des jeunes (&lt; 35 ans) (%) par catégorie
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
                    {[32.1, 34.8, 29.6].map((v, i) => (
                        <div key={i} style={{ textAlign: "center" }}>

                        <div style={{ fontWeight: 700, marginBottom: 2 }}>
                            {["C2", "C3", "C4"][i]}
                        </div>

                        <div style={{ position: "relative", width: "100%", height: 140 }}>
                            <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                data={donut(v)}
                                dataKey="value"
                                innerRadius={40}
                                outerRadius={60}
                                >
                                {donut(v).map((_, i2) => (
                                    <Cell key={i2} fill={COLORS[i2]} />
                                ))}
                                </Pie>
                            </PieChart>
                            </ResponsiveContainer>

                            <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontWeight: "bold",
                            color: "#2e7d32",
                            fontSize: 16
                            }}>
                            {v}%
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
                </div>
                {/* LINE */}
                <div style={{ background: "white", padding: 12, borderRadius: 8, marginTop: 8}}>
                        <h4 style={cardTitleStyle}>Évolution annuelle de l’atteinte de la cible des 25 000 petits exploitants</h4>

                        {/* LÉGENDE */}
                        

                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart
                                data={lineData}
                                margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
                                >
                                <CartesianGrid horizontal={true} vertical={false} opacity={0.25} />

                                    {lineData.map((entry, i) => (
                                    <ReferenceLine
                                        key={i}
                                        x={entry.annee}
                                        stroke="#ccc"
                                        strokeOpacity={0.3}
                                    />
                                    ))}

                                {/* AXES */}
                                <XAxis dataKey="annee" tick={{ fontSize: 11 }} padding={{ left: 20, right: 20 }} />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    label={{
                                    value: "Nombre de petits exploitants",
                                    angle: -90,
                                    position: "insideLeft",
                                    style: { fontSize: 11, textAnchor: "middle" }
                                    }}
                                />

                                {/* LIGNE PRINCIPALE */}
                                <Line
                                    type="monotone"
                                    dataKey="valeur"
                                    stroke="#2e7d32"
                                    strokeWidth={2}
                                    dot={{
                                        r: 4,
                                        fill: "#2e7d32",
                                        stroke: "#2e7d32"
                                      }}
                                      label={({ x, y, value }) => (
                                        <text
                                            x={x}
                                            y={y - 10}
                                            fill="#2e7d32"
                                            fontSize={10}
                                            textAnchor="middle"
                                        >
                                            {value}
                                        </text>
                                        )}                                    
                                />

                                {/* LIGNE CIBLE */}
                                <ReferenceLine
                                    y={25000}
                                    stroke="red"
                                    strokeDasharray="5 5"
                                />
                                </LineChart>
                            </ResponsiveContainer>
                    </div>
                </>
            )}            
            </div>
        </div>
        );
    };

 export default Beneficiaires;
