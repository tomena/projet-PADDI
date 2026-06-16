import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Label,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import {
  Target,
  Leaf,
  Users,
  Building2,
  Search,
  Download,
  RefreshCw,
  MapPin,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const GREEN = "#2E7D32";
const GREEN2 = "#4CAF50";
const LIGHTGREEN = "#E8F5E9";
const BLUE = "#1565C0";
const YELLOW = "#F9A825";
const ORANGE = "#FB8C00";
const RED = "#D32F2F";
const GRAY = "#E5E7EB";
const DARK = "#374151";



  export default function MicroEntreprise() {

    const objectif = 50;
        const realise = 37;
        const taux = (realise / objectif) * 100;

        const rows = [
            {
              id: 'ME-2025-0001',
              nomentite: 'Coopérative Miel Vert',
              typeentite: 'Micro-entreprise',
              chaineValeur: 'Agriculture durable',
              nombre: '2',
              specification: 'Formation en apiculture durable: Equipement ruche moderne',
              date: "15/03/2025",
            },
            {
                id: 'ME-2025-0002',
                nomentite: 'Société BioVanille',
                typeentite: 'Petite entreprise',
                chaineValeur: 'Agriculture durable',
                nombre: '3',
                specification: "Appui technique: Plants de vanille; Appui à la certification bio",
                date: "21/02/2025",
              },
              {
                id: 'ME-2025-0003',
                nomentite: 'EcoTour Andasibe',
                typeentite: 'Micro-entreprise',
                chaineValeur: 'Ecotourisme',
                nombre: '2',
                specification: "Formation en accueil touristique; Matériel d'hébergement",
                date: "10/04/2025",
              },
              {
                id: 'ME-2025-0004',
                nomentite: 'Atelier Bambou Vert',
                typeentite: 'Petite entreprise',
                chaineValeur: 'Foresterie / Produits forestiers',
                nombre: '2',
                specification: "Machine de transformation bambou; Appui design produit",
                date: "05/03/2025",
              },
              {
                id: 'ME-2025-0005',
                nomentite: 'Green Energy Solutions',
                typeentite: 'Moyenne entreprise',
                chaineValeur: 'Autres (énergies renouvelables)',
                nombre: '3',
                specification: "Etude de faisabilité; Kits solaires; Appui commercial",
                date: "28/04/2025",
              },
              {
                id: 'ME-2025-0006',
                nomentite: 'Jardin Bio Fianarantsoa',
                typeentite: 'Initiative (MGR)',
                chaineValeur: 'Agriculture durable',
                nombre: '1',
                specification: "Formation en maraichage bio",
                date: "12/03/2025",
              },
            
          ];

        const cartes = [
            {
            titre: "MPME appuyées",
            icon: Building2,
            valeur: 25,
            taux: 67.6,
            cible: 37,
            femmes: 44,
            jeunes: 36,
            color: "#2E7D32",
            },
            {
            titre: "Initiatives mesures génératrices de revenus appuyées",
            valeur: 12,
            taux: 32.4,
            cible: 37,
            femmes: 50,
            jeunes: 41.7,
            color: "#689F38",
            },
            {
            titre: "Ensemble (MPME + Initiatives)",
            icon: Users,
            valeur: 37,
            taux: 74,
            cible: 50,
            femmes: 45,
            jeunes: 37.8,
            color: "#1B5E20",
            },
        ];

        const evolution = [
            {
            annee: "2025",
            mpme: 4,
            initiatives: 4,
            total: 6,
            },
            {
            annee: "2026",
            mpme: 10,
            initiatives: 6,
            total: 11,
            },
            {
            annee: "2027",
            mpme: 17,
            initiatives: 6,
            total: 18,
            },
            {
            annee: "2028",
            mpme: 16,
            initiatives: 8,
            total: 24,
            },
            {
            annee: "2029",
            mpme: 21,
            initiatives: 10,
            total: 31,
            },
            {
            annee: "2030",
            mpme: 25,
            initiatives: 12,
            total: 37,
            },
        ];

        const chaineValeur = [
            {
            name: "Agriculture durable",
            value: 14,
            color: "#689F38",
            },
            {
            name: "Foresterie / Produits forestiers",
            value: 9,
            color: "#9CCC65",
            },
            {
            name: "Ecotourisme",
            value: 6,
            color: "#F4B400",
            },
            {
            name: "Elevage durable",
            value: 4,
            color: "#5E92F3",
            },
            {
            name: "Autres (énergies renouvelables,etc...)",
            value: 4,
            color: "#C7C7C7",
            },
        ];

        const typeEntite = [
            {
            name: "Micro-entreprises",
            value: 21,
            color: "#689F38",
            },
            {
            name: "Petites entreprises",
            value: 10,
            color: "#9CCC65",
            },
            {
            name: "Moyennes entreprises",
            value: 3,
            color: "#F4B400",
            },
            {
            name: "Initiatives (mesures génératrices de revenus)",
            value: 3,
            color: "#5E92F3",
            },
        ];

        const points = [
            {
            nom: "Antananarivo",
            lat: -18.8792,
            lng: 47.5079,
            taille: 12,
            couleur: "#43A047",
            },
            {
            nom: "Toamasina",
            lat: -18.149,
            lng: 49.4023,
            taille: 9,
            couleur: "#FB8C00",
            },
            {
            nom: "Mahajanga",
            lat: -15.716,
            lng: 46.317,
            taille: 11,
            couleur: "#D81B60",
            },
            {
            nom: "Fianarantsoa",
            lat: -21.452,
            lng: 47.085,
            taille: 8,
            couleur: "#1976D2",
            },
        ];

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

        const [currentPage, setCurrentPage] = useState(1);
        const [rowsPerPage, setRowsPerPage] = useState(10);

        const total = rows.length;

        const start = (currentPage - 1) * rowsPerPage + 1;

        const end = Math.min(currentPage * rowsPerPage, total);

        const paginatedRows = rows.slice(
            (currentPage - 1) * rowsPerPage,
            currentPage * rowsPerPage
        );

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

        const chartCardStyle = {
            background: '#fff',
            padding: 12,
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            height: '100%',
            boxSizing: 'border-box',
        };

        const evolutionWithTotal = evolution.map((item) => ({
            ...item,
            total: item.mpme + item.initiatives,
          }));

          const totalChaine = chaineValeur.reduce(
            (sum, item) => sum + item.value,
            0
          );

          const totalType = typeEntite.reduce(
            (sum, item) => sum + item.value,
            0
          );
        

    return (
  
        <div style={{ background: '#f4f6f5', minHeight: '100vh', fontFamily: 'Arial' }}>

                {/* HEADER */}
                <div style={{
                background: '#0b5d1e',
                color: '#fff',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 700
                }}>
            <h2 style={{ margin: 0 }}>
                Suivi des micro-entreprises
            </h2>

            <RefreshCw />
        </div>

        <div style={{ padding: 20 }}>

        {/* ===================== ZONE 1 : FILTRES ===================== */}
        <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8,1fr)',
                    gap: 5,
                    marginBottom: 8,
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
            </div>
            {/* ===================== KPI GRID GLOBAL ===================== */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 2.5fr 1.3fr",
                            gap: 5,
                            alignItems: "stretch",
                            marginBottom: 10,
                            marginTop:5,
                        }}
                    >
                {/* ================= OBJECTIF GLOBAL ================= */}
                <div
                    style={{
                        background: "white",
                        borderRadius: 12,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "left", 
                    }}
                    >
                    {/* TITRE */}
                    <h3 style={{ margin: 0, color: DARK }}>
                        Atteinte de la cible
                    </h3>

                    {/* DESCRIPTION */}
                    <p
                        style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 10,
                        lineHeight: 1.4,
                        maxWidth: 300,
                        }}
                    >
                        50 micro, petite et moyennes entreprises (MPME) ainsi que des initiatives
                        promouvant des mesures génératrices de revenus ont élargi leur offre de produits
                        ou de services dans des chaînes de valeur "vertes" sélectionnées.
                    </p>

                    {/* INDICATEUR */}
                        <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            marginTop: 10,
                        }}
                        >
                        {/* VALEUR PRINCIPALE */}
                        <div
                            style={{
                            fontSize: 30,
                            fontWeight: "bold",
                            color: GREEN,
                            lineHeight: 1,
                            }}
                        >
                            {realise}
                        </div>

                        {/* SOUS-TEXTE */}
                        <div
                            style={{
                            fontSize: 13,
                            color: "#6B7280",
                            marginTop: 4,
                            }}
                        >
                            sur {objectif}
                        </div>
                    </div>

                    {/* LABEL */}
                    <div
                        style={{
                        fontSize: 12,
                        color: DARK,
                        fontWeight: 500,
                        marginTop: 6,
                        }}
                    >
                        MPME et initiatives appuyées
                    </div>

                    {/* BARRE PROGRESSION */}
                    <div
                        style={{
                        width: "100%",
                        height: 12,
                        background: "#E5E7EB",
                        borderRadius: 10,
                        marginTop: 12,
                        overflow: "hidden",
                        }}
                    >
                        <div
                        style={{
                            height: "100%",
                            width: `${taux}%`,   // 🔥 dynamique
                            background: GREEN,
                            borderRadius: 10,
                        }}
                        />
                    </div>

                    {/* POURCENTAGE */}
                    <div
                        style={{
                        marginTop: 6,
                        fontSize: 15,
                        fontWeight: 800,
                        color: GREEN,
                        }}
                    >
                        {taux.toFixed(1)}%
                    </div>

                    {/* CIBLE */}
                    <div
                        style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 2,
                        }}
                    >
                        Cible : {objectif}
                    </div>
                </div>

                {/* ================= KPI 1 ================= */}
                    <div
                        style={{
                            background: "white",
                            borderRadius: 12,
                            padding: 14,
                            border: "1px solid #eee",
                        }}
                        >
                        <h3
                            style={{
                            margin: 0,
                            marginBottom: 12,
                            color: DARK,
                            fontSize: 14,
                            fontWeight: 700,
                            }}
                        >
                            Répartition des MPME et initiatives appuyées
                        </h3>

                        <div
                            style={{
                            display: "grid",
                            gridTemplateColumns: "0.5fr 3fr 2fr",
                            gap: 2,
                            alignItems: "start",
                            }}
                        >
                
                        {cartes.map((c, i) => {
                            const donutData = [
                            { name: "Femmes", value: c.femmes },
                            { name: "Jeunes", value: c.jeunes },
                            { name: "Autres", value: 100 - (c.femmes + c.jeunes) },
                            ];

                            return (
                                <div
                                key={i}
                                style={{
                                    background: "white",
                                    borderRadius: 12,
                                    padding: 10,
                                    border: "1px solid #eee",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                                >
                                {/* TITRE + ICONE + INDICATEUR CENTRÉ */}
                                <div style={{ textAlign: "center" }}>
                                    {/* TITRE */}
                                        <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            gap: 8,
                                            fontWeight: 900,
                                            color: DARK,
                                            fontSize: 10,
                                            
                                        }}
                                        >
                                        <span>{c.titre}</span>
                                        </div>

                                        {/* ICÔNE À GAUCHE + INDICATEURS À DROITE */}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                marginTop: 10,
                                                gap: 6,
                                            }}
                                        >

                                        {/* INDICATEURS (colonne droite) */}
                                        <div style={{ textAlign: "left" }}>
                                            <div
                                            style={{
                                                fontSize: 25,
                                                fontWeight: "bold",
                                                color: c.color,
                                                lineHeight: 1,
                                            }}
                                            >
                                            {c.valeur}
                                            </div>

                                            <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: c.color,
                                                marginTop: 2,
                                            }}
                                            >
                                            ({c.taux}%)
                                            </div>

                                            <div
                                            style={{
                                                fontSize: 12,
                                                fontWeight: "bold",
                                                color: "#111",
                                                marginTop: 2,
                                            }}
                                            >
                                            sur {c.cible}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                    
                            
                                {/* LIGNE DE SÉPARATION TRÈS FAIBLE */}
                                <div
                                    style={{
                                    height: 1,
                                    background: "#000",
                                    opacity: 0.06,
                                    margin: "14px 0",
                                    }}
                                />
                            
                                {/* DONUTS */}
                                <div
                                    style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: 5,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    }}
                                >
                                    {/* Donut Femmes */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
                                        Femmes
                                    </div>
                            
                                    <ResponsiveContainer width={80} height={80}>
                                        <PieChart>
                                        <Pie
                                            data={[
                                            { value: c.femmes },
                                            { value: 100 - c.femmes },
                                            ]}
                                            dataKey="value"
                                            innerRadius={24}
                                            outerRadius={34}
                                            startAngle={90}
                                            endAngle={-270}
                                            stroke="none"
                                        >
                                            <Cell fill={GREEN} />
                                            <Cell fill="#E5E7EB" />
                            
                                            <Label
                                            value={`${c.femmes.toFixed(1)}%`}
                                            position="center"
                                            style={{
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                                fill: "#374151",
                                            }}
                                            />
                                        </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    </div>
                            
                                    {/* Donut Jeunes */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
                                        Jeunes (&lt; 35 ans)
                                    </div>
                            
                                    <ResponsiveContainer width={80} height={80}>
                                        <PieChart>
                                        <Pie
                                            data={[
                                            { value: c.jeunes },
                                            { value: 100 - c.jeunes },
                                            ]}
                                            dataKey="value"
                                            innerRadius={24}
                                            outerRadius={34}
                                            startAngle={90}
                                            endAngle={-270}
                                            stroke="none"
                                        >
                                            <Cell fill={BLUE} />
                                            <Cell fill="#E5E7EB" />
                            
                                            <Label
                                            value={`${c.jeunes.toFixed(1)}%`}
                                            position="center"
                                            style={{
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                                fill: "#374151",
                                            }}
                                            />
                                        </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    </div>
                                </div>
                                </div>
                            );
                        })}
                </div>
            </div>
                
              {/* ================= COURBE EVOLUTION ================= */}
                <div
                    style={{
                        background: "white",
                        borderRadius: 12,
                        padding: 5,
                    }}
                    >
                        <h3
                            style={{
                            margin: 5,
                            marginBottom: 10,
                            color: GREEN,
                            fontSize: 14,
                            fontWeight: 700,
                            }}
                        >
                        Évolution annuelle de l’atteinte de la cible
                        </h3>

                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart
                                data={evolutionWithTotal}
                                margin={{ top: 5, right: 15, left: 0, bottom: 0 }}
                            >
                                <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />

                                <Tooltip />

                                <Legend verticalAlign="top" height={30} />

                                <Line type="monotone" dataKey="mpme" stroke={GREEN} />
                                <Line type="monotone" dataKey="initiatives" stroke={BLUE} />
                                <Line type="monotone" dataKey="total" stroke={DARK} />

                                {/* ligne cible */}
                                <Line
                                type="monotone"
                                dataKey={() => 50}
                                stroke="#9CA3AF"
                                strokeDasharray="5 5"
                                />
                            </LineChart>
                            </ResponsiveContainer>
                    </div>

                </div>

              {/* ================= DROITE ================= */}
              <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 0.8fr 0.8fr",
                    gap: 5,
                    alignItems: "stretch",
                }}
                >
                <div
                    style={{
                        background: "white",
                        borderRadius: 8,
                        padding: 10,
                        height: 340,
                    }}
                    >
                    <h4 style={{ margin: 0, marginBottom: 8, color: GREEN }}>
                        Localisation des MPME et initiatives appuyées
                    </h4>

                    <MapContainer
                        center={[-18.8792, 47.5079]}
                        zoom={5}
                        style={{ height: "310px", width: "100%" }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {points.map((p, i) => (
                        <CircleMarker
                            key={i}
                            center={[p.lat, p.lng]}
                            radius={p.taille}
                            pathOptions={{ color: p.couleur }}
                        >
                            <Popup>{p.nom}</Popup>
                        </CircleMarker>
                        ))}
                    </MapContainer>
                </div>
                {/* ================= DONUT CHAINE VALEUR ================= */}
                <div
                    style={{
                        background: "white",
                        borderRadius: 12,
                        padding: 10,
                        height: 340,
                    }}
                    >
                    <h4 style={{ margin: 0, marginBottom: 8, color: DARK }}>
                        Répartition par chaîne de valeur "verte"
                    </h4>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: 10,
                            marginBottom: 1,
                        }}
                        >
                        <ResponsiveContainer width={240} height={200}>
                            <PieChart>
                                <Pie
                                    data={chaineValeur}
                                    dataKey="value"
                                    innerRadius={50}
                                    outerRadius={80}
                                >
                                    {chaineValeur.map((e, i) => (
                                        <Cell key={i} fill={e.color} />
                                    ))}
                                <Label
                                    position="center"
                                    content={() => (
                                        <text
                                        x="50%"
                                        y="50%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        >
                                        <tspan
                                            x="50%"
                                            dy="-0.4em"
                                            fontSize="22"
                                            fontWeight="bold"
                                            fill={DARK}
                                        >
                                            37
                                        </tspan>

                                        <tspan
                                            x="50%"
                                            dy="1.5em"
                                            fontSize="13"
                                            fill="#6B7280"
                                        >
                                            (100%)
                                        </tspan>
                                        </text>
                                    )}
                                    />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                marginTop: 1,
                            }}
                            >
                            {chaineValeur.map((e) => (
                                <div
                                key={e.name}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: 12,
                                }}
                                >
                                {/* Partie gauche */}
                                <div
                                    style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    }}
                                >
                                    <div
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 3,
                                        background: e.color,
                                    }}
                                    />

                                    <span>{e.name}</span>
                                </div>

                                {/* Partie droite */}
                                <div
                                    style={{
                                    minWidth: 70,
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color: DARK,
                                    fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {e.value} ({((e.value / totalChaine) * 100).toFixed(1)}%)
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            background: "white",
                            borderRadius: 12,
                            padding: 10,
                        }}
                        >
                        <h4 style={{ margin: 0, marginBottom: 8, color: DARK }}>
                            Répartition par type d’entité
                        </h4>

                        <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: 10,
                            marginBottom: 1,
                        }}
                        >
                        <ResponsiveContainer width={240} height={200}>
                            <PieChart>
                                <Pie
                                    data={typeEntite}
                                    dataKey="value"
                                    innerRadius={50}
                                    outerRadius={80}
                                >
                                    {typeEntite.map((e, i) => (
                                        <Cell key={i} fill={e.color} />
                                    ))}
                                <Label
                                    position="center"
                                    content={() => (
                                        <text
                                        x="50%"
                                        y="50%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        >
                                        <tspan
                                            x="50%"
                                            dy="-0.4em"
                                            fontSize="22"
                                            fontWeight="bold"
                                            fill={DARK}
                                        >
                                            37
                                        </tspan>

                                        <tspan
                                            x="50%"
                                            dy="1.5em"
                                            fontSize="13"
                                            fill="#6B7280"
                                        >
                                            (100%)
                                        </tspan>
                                        </text>
                                    )}
                                    />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                marginTop: 5,
                            }}
                            >
                            {typeEntite.map((e) => (
                                <div
                                key={e.name}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: 12,
                                }}
                                >
                                {/* Partie gauche */}
                                <div
                                    style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    }}
                                >
                                    <div
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 3,
                                        background: e.color,
                                    }}
                                    />

                                    <span>{e.name}</span>
                                </div>

                                {/* Partie droite */}
                                <div
                                    style={{
                                    minWidth: 70,
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color: DARK,
                                    fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {e.value} ({((e.value / totalType) * 100).toFixed(1)}%)
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>
                
                </div>

                    {/* ===================== TABLEAU DETAIL ===================== */}

                        <div
                        style={{
                            background: '#fff',
                            marginTop: 20,
                            borderRadius: 10,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,.05)',
                        }}
                        >
                        {/* HEADER */}
                        <div
                            style={{
                            padding: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #eee',
                            }}
                        >
                            <h4
                            style={{
                                margin: 0,
                                color: GREEN,
                            }}
                            >
                            Détails des appuis reçus par les micro-entreprises et initiatives
                            </h4>

                            <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                            }}
                            >
                            <div style={{ position: 'relative' }}>
                                <span
                                style={{
                                    position: 'absolute',
                                    left: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#888',
                                }}
                                >
                                🔍
                                </span>

                                <input
                                placeholder="Rechercher..."
                                style={{
                                    padding: '8px 8px 8px 40px',
                                    width: 220,
                                    borderRadius: 8,
                                    border: '1px solid #ddd',
                                    outline: 'none',
                                }}
                                />
                            </div>

                            <button
                                style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 12px',
                                background: GREEN,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 600,
                                }}
                            >
                                Exporter  📤
                            </button>
                            </div>
                        </div>

                        {/* TABLE */}
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed',
                                fontSize: 13,
                            }}
                            >
                            <thead>
                                    <tr
                                        style={{
                                        background: GREEN,
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
                                        Id
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 80,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Nom de l’entité
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 80,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                            >
                                            Type d’entité
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 80,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Chaîne de valeur
                                        </th>

                                        <th
                                        style={{
                                            padding: 10,
                                            textAlign: 'center',
                                            width: 20,
                                            borderRight: '1px solid rgba(255,255,255,0.3)',
                                        }}
                                        >
                                        Nombre d'appui
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 200,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                        >
                                        Spécification de l’appui
                                        </th>

                                        <th
                                            style={{
                                                padding: 10,
                                                textAlign: 'center',
                                                width: 60,
                                                borderRight: '1px solid rgba(255,255,255,0.3)',
                                            }}
                                        >
                                        Date d’obtention de l'appui
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                {paginatedRows.map((r, i) => (
                                    <tr
                                        key={i}
                                        style={{
                                            borderBottom: '1px solid #e5e7eb',
                                        }}
                                        >
                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            {r.id}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>
                                            {r.nomentite}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>
                                            {r.typeentite}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'left' }}>
                                            {r.chaineValeur}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center'}}>
                                            {r.nombre}
                                        </td>

                                        <td style={{ padding: 10,borderRight: '1px solid #e5e7eb', textAlign: 'left' }}>
                                            {r.specification}
                                        </td>

                                        <td style={{ padding: 10, borderRight: '1px solid #e5e7eb',textAlign: 'center' }}>
                                            {r.date}
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>

                        {/* PAGINATION */}
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
  
    );
  
  }
