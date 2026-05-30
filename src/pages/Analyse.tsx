import React, { useMemo, useState } from 'react';

export default function Analyse() {
  const [region, setRegion] = useState('');

  const [inputs, setInputs] = useState({
    hommes: 0,
    femmes: 0,
    enfants: 0,

    csb1: 0,
    csb2: 0,
    chrd: 0,

    eauSource: 0,
    borneFontaine: 0,

    epp: 0,
    ceg: 0,
    lycee: 0,

    voiTgrn: 0,
    foret: 0,
    reboisement: 0,
    aireProtegee: 0,

    paturageSuperficie: 0,
    rizSuperficie: 0,
    rizRendement: 0,
  });

  const handleChange = (key: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const result = useMemo(() => {
    const population = inputs.hommes + inputs.femmes + inputs.enfants;

    const scoreSocial = Math.min(100, Math.round(population / 500));

    const scoreEnv = Math.min(
      100,
      Math.round(
        inputs.voiTgrn +
          inputs.foret / 10 +
          inputs.reboisement / 10 +
          inputs.aireProtegee / 10
      )
    );

    const scoreEco = Math.min(
      100,
      Math.round((inputs.rizSuperficie * inputs.rizRendement) / 100)
    );

    const scoreGlobal = Math.round((scoreSocial + scoreEnv + scoreEco) / 3);

    let niveau = 'Faible';
    if (scoreGlobal > 70) niveau = 'Élevée';
    else if (scoreGlobal > 40) niveau = 'Modérée';

    return {
      population,
      scoreSocial,
      scoreEnv,
      scoreEco,
      scoreGlobal,
      niveau,
    };
  }, [inputs]);

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2 style={styles.title}>🧠 Analyse territoriale</h2>

        <select
          style={styles.select}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option>🌍 Région</option>
          <option>Amoron'i Mania</option>
          <option>Atsimo Atsinanana</option>
          <option>Anôsy</option>
          <option>Boeny</option>
          <option>DIANA</option>
          <option>Vakinankaratra</option>
        </select>

        <input placeholder="🔍 Recherche..." style={styles.search} />

        <div style={styles.actions}>
          <button style={styles.btnPrimary}>📊 Analyser</button>
          <button style={styles.btn}>🔄 Reinitialiser</button>
          <button style={styles.btn}>📁 Exporter</button>
        </div>
      </div>

      {/* SOCIAL */}
      <Section title="👥 Population & Services sociaux">
        <div style={styles.grid4}>
          <Card title="👨‍👩‍👧 Population">
            <Input
              onChange={(e) => handleChange('hommes', e.target.value)}
              placeholder="Hommes"
            />
            <Input
              onChange={(e) => handleChange('femmes', e.target.value)}
              placeholder="Femmes"
            />
            <Input
              onChange={(e) => handleChange('enfants', e.target.value)}
              placeholder="Enfants"
            />
          </Card>

          <Card title="🏥 Santé (hôpital existant)">
            <Input placeholder="CSB I" />
            <Input placeholder="CSB II" />
            <Input placeholder="CHD" />
          </Card>

          <Card title="🏫 Éducation (école existant)">
            <Input placeholder="Primaire" />
            <Input placeholder="Secondaire" />
            <Input placeholder="Lycée" />
          </Card>

          <Card title="💧 Eau potable">
            <Input placeholder="Sources eau" />
            <Input placeholder="Bornes fontaines" />
            <Input placeholder="Types (puits/sources)" />
          </Card>
        </div>
      </Section>

      {/* ENV + ECO */}
      <div style={styles.twoCols}>
        <Section title="🌿 Gestion communautaire & environnement">
          <div style={styles.grid2}>
            <Card title="🤝 Gestion communautaire">
              <Input placeholder="VOI existant" />
              <Input placeholder="TGRN existant" />
              <Input placeholder="Pépinière existant" />
            </Card>

            <Card title="🌳 Forêt & protection">
              <Input placeholder="Forêt(ha)" />
              <Input placeholder="Reboisement(ha)" />
              <Input placeholder="Aire protégée(ha)" />
            </Card>
          </div>
        </Section>

        <Section title="💰 Production agricole & économique">
          <div style={styles.grid2}>
            <Card title="🐄 Pâturage">
              <Input placeholder="Superficie (ha)" />
              <Input placeholder="Type(Pastorale/mixte)" />
              <Input placeholder="Intensif/extensif" />
            </Card>

            <Card title="🌾 Riziculture">
              <Input placeholder="Superficie (ha)" />
              <Input placeholder="Rendement (tonnes/ha)" />
              <Input placeholder="Extension possible(oui/non)" />
            </Card>
          </div>
        </Section>
      </div>

      {/* RESULTATS IA */}
      <div style={styles.aiGrid}>
        <AiCard icon="👥" title="Population" value={result.population} />
        <AiCard
          icon="🌳"
          title="Bois"
          value={Math.round(result.population * 0.8)}
        />
        <AiCard
          icon="🌾"
          title="Riz"
          value={Math.round(result.population * 0.15)}
        />
        <AiCard
          icon="🏫"
          title="Écoles"
          value={Math.ceil(result.population / 500)}
        />
        <AiCard
          icon="🏥"
          title="Hôpitaux"
          value={Math.ceil(result.population / 5000)}
        />
        <AiCard
          icon="💧"
          title="Eau"
          value={Math.round(result.population * 0.9)}
        />
      </div>

      {/* IA BOX OPTIMISÉE (SANS SCROLL) */}
      <div style={styles.aiBox}>
        <div style={styles.aiTitle}>🧠 Resultat d'analyse</div>

        {/* KPI ROW */}
        <div style={styles.aiMiniGrid}>
          <div style={styles.aiMiniCard}>
            <span>📊 Niveau</span>
            <b>{result.niveau}</b>
          </div>

          <div style={styles.aiMiniCard}>
            <span>⚖️ Équilibre</span>
            <b>
              {result.scoreGlobal > 70
                ? 'Stable'
                : result.scoreGlobal > 40
                ? 'Moyen'
                : 'Critique'}
            </b>
          </div>

          <div style={styles.aiMiniCard}>
            <span>🎯 Priorité</span>
            <b>
              {result.scoreSocial < result.scoreEnv
                ? 'Social'
                : result.scoreEco < result.scoreEnv
                ? 'Éco'
                : 'Env'}
            </b>
          </div>
        </div>

        {/* ACTIONS COMPACTES */}
        <div style={styles.aiDecisionCompact}>
          <b>📌 Actions prioritaires :</b>

          <div style={styles.actionRow}>
            {result.scoreSocial < 50 && <span>🏥 Social</span>}
            {result.scoreEnv < 50 && <span>🌿 Env</span>}
            {result.scoreEco < 50 && <span>🌾 Éco</span>}
            {result.scoreGlobal <= 40 && (
              <span style={{ color: 'red' }}>⚠ Urgence</span>
            )}
            {result.scoreGlobal > 40 && result.scoreGlobal <= 70 && (
              <span>🟠 Plan</span>
            )}
            {result.scoreGlobal > 70 && <span>🟢 Stable</span>}
          </div>
        </div>

        <p style={styles.aiTextCompact}>
          Analyse automatique pour aide à la décision territoriale.
        </p>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const Section = ({ title, children }: any) => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    {children}
  </div>
);

const Card = ({ title, children }: any) => (
  <div style={styles.card}>
    <h4 style={styles.cardTitle}>{title}</h4>
    {children}
  </div>
);

const Input = (props: any) => <input {...props} style={styles.input} />;

const AiCard = ({ icon, title, value }: any) => (
  <div style={styles.aiCard}>
    <div>
      {icon} {title}
    </div>
    <b>{value}</b>
  </div>
);

/* ================= STYLE ================= */

const styles: any = {
  container: {
    padding: 16,
    background: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    background: 'white',
    padding: 12,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },

  title: { margin: 0, fontSize: 18, fontWeight: 700 },

  select: { padding: 8, borderRadius: 8 },

  search: {
    padding: 8,
    borderRadius: 8,
    border: '1px solid #ddd',
    flex: 1,
    minWidth: 180,
  },

  actions: { display: 'flex', gap: 8 },

  btnPrimary: {
    background: '#1d4ed8',
    color: 'white',
    border: 'none',
    padding: '8px 10px',
    borderRadius: 8,
  },

  btn: {
    background: '#e5e7eb',
    border: 'none',
    padding: '8px 10px',
    borderRadius: 8,
  },

  section: {
    background: 'white',
    padding: 12,
    borderRadius: 12,
  },

  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: 15,
    fontWeight: 600,
  },

  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },

  twoCols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },

  card: {
    background: '#f9fafb',
    padding: 10,
    borderRadius: 10,
    border: '1px solid #eee',
    overflow: 'hidden',
  },

  cardTitle: { fontSize: 13, marginBottom: 6 },

  input: {
    width: '100%',
    padding: 6,
    marginBottom: 6,
    borderRadius: 6,
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    fontSize: 12,
  },

  aiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 10,
  },

  aiCard: {
    background: 'white',
    padding: 12,
    borderRadius: 12,
  },

  aiBox: {
    background: 'white',
    padding: 12,
    borderRadius: 12,
  },

  aiTitle: {
    fontWeight: 700,
    marginBottom: 10,
  },

  aiMiniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 10,
  },

  aiMiniCard: {
    background: '#f9fafb',
    padding: 10,
    borderRadius: 10,
    border: '1px solid #eee',
  },

  aiDecisionCompact: {
    padding: 8,
    background: '#f9fafb',
    borderRadius: 10,
    border: '1px solid #eee',
  },

  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    fontSize: 11,
  },

  aiTextCompact: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
  },
};
