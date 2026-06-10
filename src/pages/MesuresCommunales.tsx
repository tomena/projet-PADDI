import React from 'react';
import {
ResponsiveContainer,
PieChart,
Pie,
Cell,
LineChart,
ReferenceLine,
Line,
XAxis,
YAxis,
Tooltip,
CartesianGrid,
BarChart,
Bar,
Legend,
} from 'recharts';

import {
Users,
Target,
RefreshCw,
} from 'lucide-react';

const GREEN = '#2e7d32';


export default function MesuresCommunales() {
  const evolution = [
    { annee: '2025', valeur: 20.8 },
    { annee: '2026', valeur: 33.3 },
    { annee: '2027', valeur: 45.8 },
    { annee: '2028', valeur: 58.3 },
    { annee: '2029', valeur: 67.5 },
    { annee: '2030', valeur: 80.0 },
  ];

  const top10 = [
    { commune: 'Ambohimahavelona', taux: 100 },
    { commune: 'Ambinanindrano', taux: 98 },
    { commune: 'Marovato', taux: 95 },
    { commune: 'Ankazomioritra', taux: 92 },
    { commune: 'Bekopaka', taux: 90 },
    { commune: 'Andranovory', taux: 89 },
    { commune: 'Ambatolahy', taux: 88 },
    { commune: 'Soamahamanina', taux: 87 },
    { commune: 'Manandriana', taux: 86 },
    { commune: 'Antsahavola', taux: 85 },
  ];

  const bottom10 = [
    { commune: 'Manjakandriana', taux: 20 },
    { commune: 'Sahafinaritra', taux: 25 },
    { commune: 'Morarano Chrome', taux: 25 },
    { commune: 'Belomaka', taux: 30 },
    { commune: 'Anjoma', taux: 30 },
    { commune: 'Ankarenana', taux: 35 },
    { commune: 'Morarano Gara', taux: 35 },
    { commune: 'Bekoratsaka', taux: 40 },
    { commune: 'Ampamarinana', taux: 40 },
    { commune: 'Andranomiditra', taux: 45 },
  ];

  const rows = [
    {
      commune: 'Ambohimahavelona',
      nb: 4,
      id: 'MES-2025-001',
      date: '15/03/2025',
      spec: 'Mise en place de pépinières communales pour la production de plants forestiers et fruitièrs.',
    },
    {
      commune: 'Ambinanindrano',
      nb: 3,
      id: 'MES-2025-002',
      date: '20/03/2025',
      spec: 'Gestion durable des ressources en eau par la protection des sources et reboisement des bassins versants',
    },
    {
      commune: 'Marovato',
      nb: 3,
      id: 'MES-2025-003',
      date: '25/03/2025',
      spec: 'Promotion des agroforesteries et systèmes agro-sylvopastoraux durables.',
    },
    {
        commune: 'Bekopaka',
        nb: 3,
        id: 'MES-2025-004',
        date: '02/04/2025',
        spec: 'Réglementation et contrôle des prélèvements de bois énergie dans les forêts naturelles.',
    },
    {
        commune: 'Soamahamanina',
        nb: 2,
        id: 'MES-2025-005',
        date: '03/04/2025',
        spec: 'Appui aux femmes et jeunes pour la transformation  et la valorisation des produits forestiers non ligneux.',
    },
    {
        commune: 'Manjakandriana',
        nb: 1,
        id: 'MES-2025-006',
        date: '10/04/2025',
        spec: 'Sensibilisation communautaire et formation sur les pratiques agricoles durables.',
    },
    {
        commune: 'Sahafinaritra',
        nb: 1,
        id: 'MES-2025-007',
        date: '11/04/2025',
        spec: 'Aménagement de pare-feux et surveillance participative des forêts.',
    },
  ];

  const filters = [
    {
      label: 'Année',
      options: ['2030','2029','2028','2027', '2026', '2025', '2024'],
    },
    {
      label: 'Région',
      options: [
        'Toutes',
        'Boeny',
        'DIANA',
        'Amoron’i Mania',
        'Atsimo Atsinanana',
        'Anôsy',
        'Vakinakaratra',
      ],
    },
    {
      label: 'Aire protégée',
      options: [
        'Toutes',
        'Ankarafantsika',
        'Analamerana',
        'Ankarana',
        'Befotaka-Midongy',
        'Andohahela',
        'Marolambo',
        'Montagne d’Ambre',
      ],
    },
    {
      label: 'Paysage',
      options: [
        'Toutes',
        'Paysage Nord',
        'Paysage Centre',
        'Paysage Sud',
      ],
    },
    {
      label: 'District',
      options: [
        'Tous',
        'Mahajanga I',
        'Mahajanga II',
        'Mitsinjo',
        'Marovoay',
      ],
    },
    {
      label: 'Commune',
      options: [
        'Toutes',
        'Ambato-Boeny',
        'Marovoay',
        'Mitsinjo',
        'Mahajanga',
      ],
    },
  ];

  const CenterText = ({ value }: any) => (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="20"
      fontWeight="bold"
      fill={GREEN}
    >
      {value}%
    </text>
  );

  const CenterLabel = ({ value, subtitle, color }: any) => (
    <>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="1000"
        fill={color}
      >
        {value}%
      </text>
  
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontStyle="italic"
        fill="#000"
      >
        {subtitle}
      </text>
    </>
  );

  const getPercent = (value, total = 120) =>
  ((value / total) * 100).toFixed(1).replace('.', ',');

  const donut1 = [
    { name: '0 mesures', value: 24, color: '#e53935' },
    { name: '1 à 2 mesures', value: 24, color: '#fbc02d' },
    { name: '3 mesures', value: 39, color: '#9ccc65' }, // vert clair
    { name: 'Plus de 3 mesures', value: 18, color: '#2e7d32' }, // vert foncé
  ];

  const donut2 = [
    { name: '0 mesure', value: 56, color: '#e53935' },
    { name: '1 mesure', value: 42, color: '#fbc02d' },
    { name: 'Plus de 1 mesure', value: 22, color: '#2e7d32' },
  ];

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
  
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="700"
        fill="#000"
      >
        <tspan x={x} dy="-6">{value}</tspan>
        <tspan x={x} dy="14">{`(${((value / 120) * 100).toFixed(1).replace('.', ',')}%)`}</tspan>
      </text>
    );
  };

  const renderOutsideLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 15; // 👉 à l'extérieur
  
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    const percent = ((value / 120) * 100)
      .toFixed(1)
      .replace('.', ',');
  
    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
        fontWeight="700"
        fill="#000"
      >
        <tspan x={x} dy="-6">{value}</tspan>
        <tspan x={x} dy="14">({percent}%)</tspan>
      </text>
    );
  };

  const renderCenteredOutsideLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
  }) => {
    const RADIAN = Math.PI / 180;
  
    const radius = outerRadius + 20; // dehors du donut
  
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    const percent = ((value / 120) * 100)
      .toFixed(1)
      .replace('.', ',');
  
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"   // 👉 CENTRÉ HORIZONTAL
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="700"
        fill="#000"
      >
        <tspan x={x} dy="-6">{value}</tspan>
        <tspan x={x} dy="14">({percent}%)</tspan>
      </text>
    );
  };

  const renderUltraLabel = (props) => {
    const {
      cx,
      cy,
      midAngle,
      outerRadius,
      value,
    } = props;
  
    const RADIAN = Math.PI / 180;
  
    // position ligne (sortie du donut)
    const radius = outerRadius + 25;
  
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    const xLine = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
    const yLine = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
  
    const isRight = x > cx;
  
    return (
      <g>
        {/* ligne de connexion */}
        <line
          x1={xLine}
          y1={yLine}
          x2={x}
          y2={y}
          stroke="#999"
          strokeWidth={1}
        />
  
        {/* texte */}
        <text
          x={x}
          y={y}
          textAnchor={isRight ? 'start' : 'end'}
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={700}
          fill="#000"
        >
          <tspan x={x} dy="-6">
            {value}
          </tspan>
          <tspan x={x} dy="14">
            ({getPercent(value)}%)
          </tspan>
        </text>
      </g>
    );
  };

  const pageBtn = {
    width: 32,
    height: 32,
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 6,
    border: '1px solid #d1d5db',
    background: 'transparent',
    color: '#374151',
    cursor: 'pointer',
  };

  const activePageBtn = {
    ...pageBtn,
    background: GREEN,
    color: '#fff',
    border: `1px solid ${GREEN}`,
  };

  return (
    <div
        style={{
            background: '#f4f6f5',
            minHeight: '100vh',
            fontFamily:
            "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
        >
      {/* HEADER */}
      <div
        style={{
          background: GREEN,
          color: 'white',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0 }}>🏛️ Suivi des mesures communales</h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <RefreshCw size={18} />
          Actualiser
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* FILTRES */}
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6,1fr)',
                gap: 12,
                marginBottom: 20,
            }}
            >
            {filters.map((filter) => (
                <div
                key={filter.label}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}
                >
                <label
                    style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    }}
                >
                    {filter.label}
                </label>

                <select
                    style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    }}
                >
                    {filter.options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                    ))}
                </select>
                </div>
            ))}
            </div>

        {/* KPI */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1.1fr 1fr',
            gap: 4,
            marginBottom: 15,
          }}
        >
          <Card>
            <div
                style={{
                background: 'rgba(46,125,50,0.04)',
                borderLeft: `4px solid ${GREEN}`,
                borderRadius: 8,
                padding: 12,
                height: '100%',
                }}
            >
                <h4
                style={{
                    margin: '0 0 10px 0',
                    color: '#1b5e20',
                    fontWeight: 700,
                    textAlign: 'left',
                }}
                >
                Enoncé de l'indicateur
                </h4>

                <p
                style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#374151',
                    textAlign: 'justify',
                }}
                >
                3 mesures prioritaires pour améliorer les services écosystémiques d'approvisionnement sont adoptées par les conseils communaux dans 80% des communes d'intervention,
                à partir des plans d'aménagements existants, dont 1 mesure tenant compte des besoins spécifiques des femmes et des jeunes.
                </p>
            </div>
            </Card>

          <Card>
          <h4 style={{ margin: '3px 0 1px 0', textAlign: 'center', color: '#1b5e20' }}>
                    Taux d'atteinte de la cible
                </h4>

                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                    <Pie
                        data={[
                        { name: 'atteint', value: 67.5 },
                        { name: 'reste', value: 32.5 },
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                    >
                        <Cell fill={GREEN} />
                        <Cell fill="#e0e0e0" />
                    </Pie>

                    <CenterLabel value={67.5} subtitle="Cible : 80%" color={GREEN} />
                    </PieChart>
                </ResponsiveContainer>

                <div
                    style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        marginTop: -10,
                    }}
                    >
                    81 sur 120 communes
                    </div>
                </Card>

                <Card>
                <h4 style={{ margin: '3px 0 1px 0', textAlign: 'center', color: '#1b5e20'}}>
                        Part des femmes atteinte
                    </h4>

                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                        <Pie
                            data={[
                            { name: 'atteint', value: 48.3 },
                            { name: 'reste', value: 51.7 },
                            ]}
                            innerRadius={50}
                            outerRadius={70}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                        >
                            <Cell fill={GREEN} />
                            <Cell fill="#e0e0e0" />
                        </Pie>

                        <CenterLabel value={48.3} subtitle="(2 315)" color={GREEN} />
                        </PieChart>
                    </ResponsiveContainer>
                    </Card>

                    <Card>
                    <h4 style={{ margin: '3px 0 1px 0', textAlign: 'center', color: '#1b5e20' }}>
                            Part des jeunes (&lt; 35 ans) atteinte
                        </h4>

                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                            <Pie
                                data={[
                                { name: 'atteint', value: 36.7 },
                                { name: 'reste', value: 63.3 },
                                ]}
                                innerRadius={50}
                                outerRadius={70}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                <Cell fill={GREEN} />
                                <Cell fill="#e0e0e0" />
                            </Pie>

                            <CenterLabel value={36.7} subtitle="(1 760)" color={GREEN} />
                            </PieChart>
                        </ResponsiveContainer>

                    </Card>

                    <Card>
                        
                        <div
                            style={{
                            background: 'rgba(46,125,50,0.04)',
                            borderRight: `4px solid ${GREEN}`,
                            borderRadius: 8,
                            padding: 12,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 8,
                            textAlign: 'center',
                            }}
                        >

                        <h4
                            style={{
                            margin: '0 0 6px 0',
                            color: '#1b5e20',
                            fontWeight: 700,
                            textAlign: 'center',
                            }}
                        >
                            Communes d'intervention
                        </h4>
                            <Users size={42} color={GREEN} strokeWidth={2} />

                            <div
                            style={{
                                fontSize: 28,
                                fontWeight: 800,
                                color: '#1b5e20',
                            }}
                            >
                            120
                            </div>

                            <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#1b5e20',
                            }}
                            >
                            Communes
                            </div>
                        </div>
                        </Card>
        </div>

        {/* DONUTS + EVOLUTION */}
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.2fr',
                gap: 12,
                marginBottom: 15,
            }}
            >
          <Card>
                <h4 style={{ margin: 0, color: GREEN, textAlign: 'center', fontSize: 14 }}>
                    Nombre de Communes selon le nombre de mesures décidées
                </h4>

                <div style={{ display: 'flex', alignItems: 'center' }}>

                    {/* DONUT */}
                    <ResponsiveContainer width="60%" height={240}>
                    <PieChart>

                        <Pie
                            data={donut1}
                            dataKey="value"
                            innerRadius={50}
                            outerRadius={80}
                            label={renderCenteredOutsideLabel}
                            labelLine={false}
                        >
                        {donut1.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                        ))}
                        </Pie>

                        {/* CENTRE */}
                        <text x="50%" y="48%" textAnchor="middle" fontSize="26" fontWeight="800" fill="#000">
                        120
                        </text>

                        <text x="50%" y="62%" textAnchor="middle" fontSize="12" fontWeight="700" fill="#000">
                        Communes
                        </text>

                    </PieChart>
                    </ResponsiveContainer>

                    {/* LÉGENDE À DROITE */}
                    <div style={{ width: '40%', paddingLeft: 10 }}>
                    {donut1.map((d, i) => (
                        <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            marginBottom: 6,
                            color: '#000',
                        }}
                        >
                        <span>
                            <span
                            style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                background: d.color,
                                marginRight: 6,
                            }}
                            />
                            {d.name}
                        </span>
                        </div>
                    ))}
                    </div>

                </div>
                </Card>

                <Card>
                    <h4 style={{ margin: 0, color: GREEN, textAlign: 'center', fontSize: 14 }}>
                        Nombre de Communes selon le nombre de mesures tenant compte des besoins des femmes et jeunes
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center' }}>

                        <ResponsiveContainer width="60%" height={240}>
                        <PieChart>

                        <Pie
                            data={donut2}
                            dataKey="value"
                            innerRadius={50}
                            outerRadius={80}
                            label={renderCenteredOutsideLabel}
                            labelLine={false}
                        >
                            {donut2.map((e, i) => (
                                <Cell key={i} fill={e.color} />
                            ))}
                            </Pie>

                            <text x="50%" y="48%" textAnchor="middle" fontSize="26" fontWeight="800" fill="#000">
                            120
                            </text>

                            <text x="50%" y="62%" textAnchor="middle" fontSize="12" fontWeight="700" fill="#000">
                            Communes
                            </text>

                        </PieChart>
                        </ResponsiveContainer>

                        {/* LÉGENDE */}
                        <div style={{ width: '40%', paddingLeft: 10 }}>
                        {donut2.map((d, i) => (
                            <div
                            key={i}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 12,
                                marginBottom: 6,
                                color: '#000',
                            }}
                            >
                            <span>
                                <span
                                style={{
                                    display: 'inline-block',
                                    width: 10,
                                    height: 10,
                                    background: d.color,
                                    marginRight: 6,
                                }}
                                />
                                {d.name}
                            </span>

                            </div>
                        ))}
                        </div>

                    </div>
                    </Card>
                <Card>
                <h4
                    style={{
                    margin: 0,
                    color: GREEN,
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: 'center',
                    }}
                > Évolution annuelle du taux d’atteinte de la cible (%) </h4>
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart
                          data={evolution}
                          margin={{
                            top: 20,
                            right: 10,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <XAxis
                            dataKey="annee"
                            padding={{ left: 20, right: 10 }}
                            tick={{
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                            tick={{
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          />

                          <Tooltip />

                          <Legend />

                          <ReferenceLine
                            y={80}
                            stroke="#777"
                            strokeDasharray="4 4"
                            label="Cible (80%)"
                          />

                          <Line
                            type="monotone"
                            dataKey="valeur"
                            stroke={GREEN}
                            strokeWidth={3}
                            dot={{
                              r: 6,
                              fill: GREEN,
                              stroke: '#fff',
                              strokeWidth: 2,
                            }}
                            activeDot={{
                              r: 8,
                              fill: GREEN,
                              stroke: '#fff',
                              strokeWidth: 2,
                            }}
                            label={({ x, y, value }) => (
                              <text
                                x={x}
                                y={y - 10}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill={GREEN}
                              >
                                {value.toFixed(1).replace('.', ',')}%
                              </text>
                            )}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                </Card>
        </div>
        

        {/* TOP / BOTTOM */}        
        <Card style={{ marginTop: 24, marginBottom: 32 }}>
              <h4
                style={{
                  margin: '10px 0 10px 0',
                  color: GREEN,
                  fontWeight: 700,
                }}
              >
                Taux d'atteinte de la cible par Commune (Top 10 / Bottom 10)
              </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1px 1fr',
                    gap: 15,
                    alignItems: 'stretch',
                  }}
                >
                {/* TOP 10 */}
                <div>
                    <h5
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: 15,
                        fontWeight: 900,
                        color: '#2e7d32',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                    Les 10 Communes les plus performantes
                  </h5>

                  <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        layout="vertical"
                        data={top10}
                        margin={{
                          top: 5,
                          right: 50,
                          left: 15,
                          bottom: 5,
                        }}
                        barCategoryGap="25%"
                      >
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      />
                      <YAxis
                        dataKey="commune"
                        type="category"
                        width={140}
                        tick={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="taux"
                        radius={[0, 2, 2, 0]}
                        fill="#2e7d32"
                        barSize={14}
                        label={{
                          position: 'right',
                          formatter: (value) => `${value}%`,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div
                  style={{
                    background: '#d1d5db',
                    width: 1,
                  }}
                />
                <div>
                  <h5
                    style={{
                      margin: '0 0 10px 0',
                      fontSize: 15,
                      fontWeight: 900,
                      color: '#d32f2f',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                    }}
                  >
                    Les 10 communes les moins performantes
                  </h5>

                  <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                        layout="vertical"
                        data={bottom10}
                        margin={{
                          top: 5,
                          right: 50,
                          left: 15,
                          bottom: 5,
                        }}
                        barCategoryGap="25%"
                      >
                    <XAxis
                        type="number"
                        domain={[0, 50]}
                        tick={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      />
                      <YAxis
                        dataKey="commune"
                        type="category"
                        width={140}
                        tick={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="taux"
                        radius={[0, 2, 2, 0]}
                        fill="#d32f2f"
                        barSize={14}
                        label={{
                          position: 'right',
                          formatter: (value) => `${value}%`,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>          
                </div>
              </div>              
        </Card>
        
        <div style={{ height: 1, margin: '4px 0' }} />

        {/* TABLEAU */}
        <Card >
        <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 5,
              marginTop: 10,
            }}
          >
            <h4
                style={{
                  margin: '0 0 1px 0',
                  color: '#1b5e20',
                  fontWeight: 800,
                }}
              >
                Détails des mesures prises par les Communes
            </h4>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* SEARCH */}
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    color: '#888',
                  }}
                >
                  🔍
                </span>

                <input
                  placeholder="Rechercher une commune..."
                  style={{
                    padding: '8px 5px 8px 30px',
                    width: 220,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    outline: 'none',
                  }}
                />
              </div>

              {/* EXPORT */}
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
                📤 Exporter
              </button>
            </div>
          </div>

          <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                  <tr style={{ background: GREEN, color: '#fff' }}>
                    <th
                      style={{
                        padding: 10,
                        width: 150,
                        textAlign: 'left',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      Commune
                    </th>

                    <th
                      style={{
                        padding: 10,
                        width: 100,
                        textAlign: 'center',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      Nombre de mesures prises
                    </th>

                    <th
                      style={{
                        padding: 10,
                        width: 100,
                        textAlign: 'center',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      ID de la mesure
                    </th>

                    <th
                      style={{
                        padding: 10,
                        width: 100,
                        textAlign: 'center',
                        borderRight: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      Date d’adoption de la mesure
                    </th>

                    <th
                      style={{
                        padding: 10,
                        textAlign: 'left',
                      }}
                    >
                      Spécification de la mesure
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
                    <td style={{ padding: 10, borderRight: '1px solid #eee' }}>
                      {r.commune}
                    </td>
                    <td style={{ padding: 10, borderRight: '1px solid #eee', textAlign: 'center' }}>
                      {r.nb}
                    </td>
                    <td style={{ padding: 10, borderRight: '1px solid #eee', textAlign: 'center' }}>
                      {r.id}
                    </td>
                    <td style={{ padding: 10, borderRight: '1px solid #eee', textAlign: 'center' }}>
                      {r.date}
                    </td>
                    <td style={{ padding: 10 }}>{r.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
              paddingTop: 8,
            }}
            >
            <span
              style={{
                fontSize: 13,
                color: '#6b7280',
                fontWeight: 700,
              }}
            >
              Affichage de 1 à 7 sur 120 enregistrements
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
                <button style={pageBtn}>4</button>

                <span style={{ fontSize: 13, color: '#6b7280' }}>...</span>

                <button style={pageBtn}>18</button>

                <button style={pageBtn}>▶</button>
                <button style={pageBtn}>⏭</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                Lignes par page
              </span>

              <select
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  background: '#fff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: any) {
    return (
      <div
        style={{
          background: 'white',
          padding: '4px 8px', // ⬅️ réduit padding top
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {children}
      </div>
    );
  }
