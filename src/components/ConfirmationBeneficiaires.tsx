import React, {useState} from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  YAxis,
  XAxis,
  Tooltip,
  LabelList,
} from "recharts";

import {
  Users,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react";

const GREEN = '#1b5e20';

const pageBtn = {
    minWidth: 32,
    height: 32,
    border: '1px solid #d1d5db',
    background: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
  };

const activePageBtn = {
    ...pageBtn,
    background: GREEN,
    color: '#fff',
    borderColor: GREEN,
  };

  

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 8,
  padding: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 800,
  color: "#1B5E20",
};

const competences = [
    { name: "Techniques de compostage", value: 57 },
    { name: "Gestion intégrée des cultures", value: 52 },
    { name: "Agroforesterie", value: 48 },
    { name: "Transformation des produits agricoles", value: 46 },
    { name: "Gestion financière / tenue de caisse", value: 42 },
    { name: "Commercialisation et marketing", value: 38 },
    { name: "Élevage amélioré", value: 35 },
    { name: "Gestion durable des ressources naturelles", value: 33 },
    { name: "Utilisation d’intrants biologiques", value: 29 },
    { name: "Planification de la production", value: 27 },
  ];  

  const step = 10;

  const maxValue = Math.max(...competences.map(item => item.value));
  const maxDomain = Math.ceil(maxValue / step) * step;
  
  const ticks = Array.from(
    { length: maxDomain / step + 1 },
    (_, i) => i * step
  );

const ConfirmationBeneficiaires: React.FC = () => {

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const CustomYAxisTick = ({ x, y, payload }: any) => {
        const text = payload.value;
      
        return (
          <g transform={`translate(${x},${y})`}>
            <text
              x={0}
              y={0}
              dy={4}
              textAnchor="end"   // 👈 IMPORTANT (gauche)
              fontSize={12}
              fill="#333"
            >
              {text}
            </text>
          </g>
        );
      };

      const getMaxLabelWidth = (data: any[], font = "12px Arial") => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
    
        if (!ctx) return 180;
    
        ctx.font = font;
    
        return Math.max(
            ...data.map(item => ctx.measureText(item.name).width)
        );
    };

    const yAxisWidth = Math.min(getMaxLabelWidth(competences) + 20, 320);

    const rows = [
        {
          idFormation: 'F-C2-2025-001',
          région: 'Alaotra-Mangoro',
          AP: 'Zahamena',
          paysage: 'Ankeniheny-Zahamena',
          district: 'Ambatondrazaka',
          commune: 'Ambohibary',
          mbv: 'Betsiboka Nord',
          fokontany: 'Ankadinandriana',
          localisation: 'Andranomainty',
          intituleFormation: 'Technique de compostage',
          nbrParticipant:'28',
          nbrFemmes: '16',
          nbrjeune: '12',
          date: '15/04/2025',
        },
        {
            idFormation: 'F-C2-2025-002',
            région: 'Analamanga',
            AP: 'Ambohitantely',
            paysage: 'Antananarivo Nord',
            district: 'Andramasina',
            commune: 'Sahamalaza',
            mbv: 'Mamba',
            fokontany: 'Ampitatafika',
            localisation: 'Ambodirano',
            intituleFormation: 'Gestion intégrale des cultures',
            nbrParticipant:'35',
            nbrFemmes: '20',
            nbrjeune: '15',
            date: '20/04/2025',
          },
          {
            idFormation: 'F-C2-2025-003',
            région: 'Atsinanana',
            AP: 'Masoala',
            paysage: 'Masoala',
            district: 'Marolambo',
            commune: 'Antanambao Manampotsy',
            mbv: 'Manampotsy Nord',
            fokontany: 'Ambodivoribe',
            localisation: 'Sahavory',
            intituleFormation: 'Agroforesterie',
            nbrParticipant:'30',
            nbrFemmes: '15',
            nbrjeune: '15',
            date: '05/05/2025',
          },
          {
            idFormation: 'F-C2-2025-004',
            région: 'Boeny',
            AP: 'Baie de Baly',
            paysage: 'Mahavory Kinkony',
            district: 'Mahajanga II',
            commune: 'Belobaka',
            mbv: 'Kinkony',
            fokontany: 'Marofinaritra',
            localisation: 'Ankijabe',
            intituleFormation: 'Transformation des produits agricoles',
            nbrParticipant:'26',
            nbrFemmes: '14',
            nbrjeune: '12',
            date: '12/05/2025',
          },
          {
            idFormation: 'F-C2-2025-005',
            région: 'Vakinakaratra',
            AP: 'Kirindy Mitea',
            paysage: 'Menabe Antanimena',
            district: 'Miandrivazo',
            commune: 'Antsalova',
            mbv: 'Sahambavy',
            fokontany: 'Andranolava',
            localisation: 'Bemananteza',
            intituleFormation: 'Elevage amélioré',
            nbrParticipant:'32',
            nbrFemmes: '18',
            nbrjeune: '14',
            date: '18/05/2025',
          },
        
      ];

    const total = rows.length;

    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, total);

    const paginatedRows = rows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );
  return (
    <div style={{ background: "#f4f6f5", minHeight: "100vh", fontFamily: "Arial" }}>

      {/* HEADER */}
      <div style={{
        background: "transparent",
        color: "#0b5d1e",
        padding: 10,
        fontWeight: 700
      }}>
        2. Confirmation des bénéficiaires : amélioration des compétences techniques et entrepreneuriales
      </div>

      {/* MAIN GRID */}
      <div style={{
        padding: 5,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6
      }}>

        {/* COLONNE GAUCHE */}
        <div style={cardStyle}>
          <h4 style={titleStyle}>Synthèse par année de collecte</h4>

          {/* ================= 2027 ================= */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{
                        border: "1px solid #d0d0d0",
                        borderRadius: 10,
                        padding: 8
                    }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: "#333" }}>
                        2027
                    </div>                

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>

                    {/* CARD 1 */}
                    <div style={{
                        border: "1px solid #2e7d32",
                        background: "rgba(46,125,50,0.06)",
                        padding: 10,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <Users size={30} color="#2e7d32" />

                    {/* TEXTE */}
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}>
                            
                            <div style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#333",
                                marginBottom: 8
                            }}>
                            Nombre de bénéficiaires
                            </div>

                            <div style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: "#2e7d32"
                            }}>
                            12 864
                            </div>
                        </div>
                        </div>

                    {/* CARD 2 */}
                    <div style={{
                        border: "1px solid #1976d2",
                        background: "rgba(25,118,210,0.06)",
                        padding: 10,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <ClipboardCheck size={30} color="#1976d2" />

                    <div>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#333",
                        marginBottom: 8
                        }}>
                            Personnes enquêtées
                    </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1976d2" }}>
                        4 215
                        </div>
                    </div>
                    </div>

                    {/* CARD 3 */}
                    <div style={{
                        border: "1px solid #f9a825",
                        background: "rgba(245,124,0,0.06)",
                        padding: 10,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <CheckCircle2 size={30} color="#f9a825" />

                    <div>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#333",
                        marginBottom: 8
                        }}>
                            % amélioration confirmée
                    </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#f9a825" }}>
                        71,3%
                        </div>
                    </div>
                </div>
                </div>

                </div>
                </div>

                {/* ================= 2030 ================= */}
                <div>
                <div style={{
                    border: "1px solid #d0d0d0",
                    borderRadius: 10,
                    padding: 8
                }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: "#333" }}>
                    2030
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>

                    {/* CARD 1 */}
                    <div style={{
                        border: "1px solid #2e7d32",
                        background: "rgba(46,125,50,0.06)",
                        padding: 10,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <Users size={30} color="#2e7d32" />

                    {/* TEXTE */}
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}>
                            
                            <div style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#333",
                                marginBottom: 8
                            }}>
                                Nombre de bénéficiaires
                            </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>
                        18 357
                        </div>
                    </div>
                    </div>

                    {/* CARD 2 */}
                    <div style={{
                        border: "1px solid #1976d2",
                        background: "rgba(25,118,210,0.06)",
                        padding: 10,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <ClipboardCheck size={30} color="#1976d2" />

                    {/* TEXTE */}
                    <div style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}>
                            
                            <div style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#333",
                                marginBottom: 8
                            }}>
                            Personnes enquêtées
                    </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1976d2" }}>
                        6 432
                        </div>
                    </div>
                    </div>

                    {/* CARD 3 */}
                    <div style={{
                        border: "1px solid #f9a825",
                        background: "rgba(245,124,0,0.06)",
                        padding: 10,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 20
                    }}>
                    <CheckCircle2 size={30} color="#f9a825" />

                    <div>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#333",
                        marginBottom: 8
                        }}>
                            % amélioration confirmée
                    </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#f9a825" }}>
                        80,2%
                        </div>
                    </div>
                </div>
            </div>

        </div>
        </div>  
        
        </div>
        

        {/* ================= GRID DROITE (VERTICAL) ================= */}
        <div style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12
            }}>

            {/* ================= CARTE 1 : PROFIL ================= */}
            <div style={cardStyle}>

                <h4 style={titleStyle}>
                    Profil des bénéficiaires par année (Femmes et Jeunes &lt;35 ans)
                </h4>

                {/* Légende */}
                <div
                style={{
                    display: "flex",
                    gap: 18,
                    alignItems: "center",
                    marginBottom: 12,
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#555",
                }}
                >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: "#2e7d32",
                    }}
                    />
                    % Femmes
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: "#81c784",
                    }}
                    />
                    % Jeunes &lt;35 ans
                </div>
                </div>

                {/* ====== 2027 ====== */}
                {(() => {
                const f = 47.5;
                const j = 33.1;
                const total = f + j;

                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>

                    {/* année */}
                    <div style={{ width: 45, fontSize: 14, fontWeight: 700 }}>
                        2027
                    </div>

                    {/* barre */}
                    <div style={{
                        flex: 1,
                        height: 30,
                        display: "flex",
                        borderRadius: 2,
                        overflow: "hidden",
                        background: "#e8f5e9"
                    }}>

                        <div style={{
                            width: `${(f / total) * 100}%`,
                            background: "#2e7d32",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                        {f}%
                        </div>

                        <div style={{
                            width: `${(j / total) * 100}%`,
                            background: "#66bb6a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                        {j}%
                        </div>
                    </div>
                    </div>
                );
                })()}

                {/* ====== 2030 ====== */}
                {(() => {
                const f = 48.6;
                const j = 34.2;
                const total = f + j;

                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                    <div style={{ width: 45, fontSize: 14, fontWeight: 700 }}>
                        2030
                    </div>

                    <div style={{
                        flex: 1,
                        height: 30,
                        display: "flex",
                        borderRadius: 2,
                        overflow: "hidden",
                        background: "#e8f5e9"
                    }}>

                        <div style={{
                            width: `${(f / total) * 100}%`,
                            background: "#2e7d32",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                        {f}%
                        </div>

                        <div style={{
                            width: `${(j / total) * 100}%`,
                            background: "#66bb6a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700
                        }}>
                            {j}%
                        </div>
                    </div>
                </div>
                );
                })()}

            </div>

            {/* ================= CARTE 2 : BAR CHART ================= */}
            <div style={cardStyle}>

                <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 2,
                    color: "#333"
                }}>
                    <h4 style={titleStyle}>
                        Confirmation de l'amélioration par catégorie de bénéficiaires (%)
                    </h4>
                </div>

                {/* LÉGENDE */}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: -20,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#555",
                    }}
                    >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div
                        style={{
                            width: 12,
                            height: 12,
                            background: "#2e7d32",
                            borderRadius: 3,
                        }}
                        />
                        C2
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div
                        style={{
                            width: 12,
                            height: 12,
                            background: "#66bb6a",
                            borderRadius: 3,
                        }}
                        />
                        C3
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div
                        style={{
                            width: 12,
                            height: 12,
                            background: "#f9a825",
                            borderRadius: 3,
                        }}
                        />
                        C4
                    </div>
                    </div>

                <ResponsiveContainer width="100%" height={150}>
                    <BarChart
                        data={[
                        { year: "2027", c2: 68.2, c3: 72.4, c4: 70.1 },
                        { year: "2030", c2: 79.1, c3: 81.3, c4: 80.2 },
                        ]}
                        margin={{
                            top: 10,
                            right: 10,
                            left: 0,
                            bottom: 0,
                          }}
                        barCategoryGap="35%"
                        barGap={10}
                    >
                        <XAxis
                            dataKey="year"
                            tick={{
                                fontSize: 13,
                                fontWeight: 600,
                                fill: "#555",
                            }}
                            interval={0}
                            height={20}
                            tickMargin={2}
                        />                       

                        <Bar dataKey="c2" fill="#2e7d32" barSize={45} >
                            <LabelList
                                dataKey="c2"
                                position="top"
                                formatter={(v: number) => `${v}%`}
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    fill: "black",
                                }}
                                
                            />
                        </Bar>

                        <Bar dataKey="c3" fill="#66bb6a" barSize={45}>
                            <LabelList
                                dataKey="c3"
                                position="top"
                                formatter={(v: number) => `${v}%`}
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    fill: "black",
                                }}
                            />
                        </Bar>

                        <Bar dataKey="c4" fill="#f9a825" barSize={45}>
                            <LabelList
                                dataKey="c4"
                                position="top"
                                formatter={(v: number) => `${v}%`}
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    fill: "black",
                                }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
        </div>

                {/* ================= LIGNE 2 ================= */}
                    <div style={{
                        gridColumn: "1 / span 2",
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr",
                        gap: 12
                    }}>
                    <div style={cardStyle}>
                        <h4 style={titleStyle}>
                            Exemples de compétences citées par les bénéficiaires (Top 10)
                        </h4>

                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={competences}
                                layout="vertical"
                                margin={{
                                    top: 5,
                                    right: 20,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <XAxis
                                    type="number"
                                    domain={[0, maxDomain]}
                                    ticks={ticks}
                                    tick={{
                                        fontSize: 12,
                                        fill: "#666",
                                    }}
                                    tickFormatter={(v) => `${v}%`}
                                />

                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={yAxisWidth}
                                    interval={0}
                                    tickMargin={5}                                                                
                                    tick={<CustomYAxisTick />}
                                />

                                <Bar
                                    dataKey="value"
                                    fill="#2e7d32"
                                    barSize={16}
                                    radius={[0, 2, 2, 0]}
                                >
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        formatter={(v: number) => `${v}%`}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fill: "black",
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: "#rgba(46,125,50,0.06)", border: "1px solid #2e7d32", borderRadius: 8, padding: 12 }}>
                        <h4 style={titleStyle}>À propos de l'indicateur</h4>

                        <p style={{ fontSize: 12, lineHeight: 1.5, color: "#444" }}>
                            Indicateur 2: 80% des bénéficiaires ont confirmé, à l’aide d’exemples, 
                            qu’ils(elles) avaient amélioré leurs compétences techniques et entrepreneuriales pour mettre en oeuvre des pratiques durables et valoriser les produits issus de l’agriculture,
                            de la syviculture et de l’élèvage.                           
                        </p>

                        <p style={{ fontSize: 12, lineHeight: 1.5, color: "#444" }}>
                            La confirmation est basée sur des enquêtes auprès d’un échantillon représentatif de bénéficiaires.
                        </p> 

                        <div style={{ marginTop: 10, fontSize: 12 }}>
                            <b>C2 :</b> Formations collectives <br />
                            <br />
                            <b>C3 :</b> Appui individuel / Groupements <br />
                            <br />
                            <b>C4 :</b> Appui aux entrepreneurs
                        </div>
                    </div>
                </div>

                {/* ================= Tableau détaille ================= */}

                <div
                    style={{
                        gridColumn: "1 / span 2",
                        background: "#fff",
                        borderRadius: 10,
                        padding: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                    >
                    <h4 style={{ margin: 0, marginBottom: 10, color: "#2e7d32" }}>
                        3. Données détaillées
                    </h4>

                    {/* HEADER */}

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 12,
                        }}
                    >
                        {/* ====== GAUCHE ====== */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 13, color: '#555' }}>
                                    Choisir une table :
                                </label>

                                <select
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        border: '1px solid #ddd',
                                        outline: 'none',
                                    }}
                                >
                                    <option>Toutes le bénéficiaires</option>
                                    <option>Bénéficiaire_C2</option>
                                    <option>Bénéficiaire_C3</option>
                                    <option>Bénéficiaire_C4</option>
                                </select>
                            </div>
                        </div>

                        {/* ====== DROITE ====== */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ position: 'relative', width: 220, flexShrink: 0 }}>
                                <input
                                    placeholder="Rechercher..."
                                    style={{
                                        padding: '8px 35px 8px 12px',
                                        width: '100%',
                                        borderRadius: 8,
                                        border: '1px solid #ddd',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />

                                <span
                                    style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#888',
                                        pointerEvents: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </span>
                            </div>

                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 12px',
                                    background: 'green',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    {/* flèche vers le bas */}
                                    <path d="M12 3v12" />
                                    <path d="M8 11l4 4 4-4" />

                                    {/* base / bac */}
                                    <path d="M4 17v3h16v-3" />
                                </svg>

                                Exporter
                            </button>

                            <button
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 12px',
                                    background: '#1976d2',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3" />
                                </svg>

                                Filtrer
                            </button>
                        </div>
                    </div>               

                {/* TABLE */}
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                        fontSize: 10,
                    }}
                    >
                    <thead>
                            <tr
                                style={{
                                background: "green",
                                color: '#fff',
                                }}
                            >
                                <th
                                style={{
                                    padding: 10,
                                    textAlign: 'center',
                                    width: 50,
                                    borderRight: '1px solid rgba(255,255,255,0.3)',
                                }}
                                >
                                ID de la formation
                                </th>

                                <th
                                style={{
                                    padding: 10,
                                    textAlign: 'center',
                                    width: 50,
                                    borderRight: '1px solid rgba(255,255,255,0.3)',
                                }}
                                >
                                Région
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 50,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                    >
                                    AP
                                </th>

                                <th
                                style={{
                                    padding: 10,
                                    textAlign: 'center',
                                    width: 50,
                                    borderRight: '1px solid rgba(255,255,255,0.3)',
                                }}
                                >
                                Paysage
                                </th>

                                <th
                                style={{
                                    padding: 10,
                                    textAlign: 'center',
                                    width: 70,
                                    borderRight: '1px solid rgba(255,255,255,0.3)',
                                }}
                                >
                                District
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 70,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Commune
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 70,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                MBV
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 70,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Fokontany
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 60,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Localisation
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 80,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Intitulé de la formation
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 50,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Nombre de participant
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 50,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Nombre de femmes
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 50,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Nombre de jeunes &lt;35 ans
                                </th>

                                <th
                                    style={{
                                        padding: 10,
                                        textAlign: 'center',
                                        width: 60,
                                        borderRight: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                Date
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r, i) => (
                            <tr
                                key={i}
                                style={{
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                                >
                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.idFormation}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.région}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',}}>
                                    {r.AP}
                                </td>

                                <td style={{ padding: 10,borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    {r.paysage}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.district}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.commune}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.mbv}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.fokontany}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.localisation}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.intituleFormation}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.nbrParticipant}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.nbrFemmes}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.nbrjeune}
                                </td>

                                <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                    {r.date}
                                </td>                                
                            </tr>
                            ))}
                        </tbody>
                    </table>
                    <div
                        style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderTop: '1px solid #eee',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 13,
                                color: '#6b7280',
                                fontWeight: 700,
                            }}
                            >
                            Affichage de {start} à {end} sur {total} enregistrements
                        </span>

                        <div
                        style={{
                            display: 'flex',
                            gap: 3,
                            alignItems: 'center',
                        }}
                        >
                        <button style={pageBtn}>⏮</button>
                        <button style={pageBtn}>◀</button>

                        <button style={activePageBtn}>1</button>
                        <button style={pageBtn}>2</button>
                        <button style={pageBtn}>3</button>

                        <span style={{ fontSize: 13 }}>
                            ...
                        </span>

                        <button style={pageBtn}>24</button>

                        <button style={pageBtn}>▶</button>
                        <button style={pageBtn}>⏭</button>
                        </div>

                        <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                        >
                        <span
                            style={{
                            fontSize: 13,
                            fontWeight: 600,
                            }}
                        >
                            Lignes par page
                        </span>

                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                            }}
                            style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        </div>
                    </div>
                </div>
                      
    </div>
    </div>
  );
};

export default ConfirmationBeneficiaires;
