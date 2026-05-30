import { Bold } from 'lucide-react';
import React, { useMemo, useState } from 'react';

export default function InsertionDonnees() {
  /* ================= DONNÉES ================= */
  const data: any = {
    Boeny: {
      Ambatoboeny: {
        'Ambato Ambarimay': ['Fokontany 1', 'Fokontany 2', 'Fokontany 3'],
        Ambesisika: ['Fokontany 1', 'Fokontany 2'],
        Ambondromamy: ['Betaramahamay', 'Beronono'],
        Andranofasika: ['Andranofasika', 'Ambongamaranitra', 'Ambalambakisiny'],
        Andranomamy: ['Fokontany 1'],
        Anjiajia: ['Fokontany 1'],
        Ankijabe: ['Morarano', 'Befotaka', 'Bealàna', 'Belalitra'],
        Ankirihitra: ['Fokontany 1'],
        Madirovalo: ['Fokontany 1'],
        Manerinerina: ['Fokontany 1'],
        Sitampiky: ['Fokontany 1'],
        Tsaramandroso: [
          'Ambatoloaka',
          'Andranomandevy',
          'Ambohimiarina',
          'Andranomiditra',
        ],
      },

      'Mahajanga I': {
        Mahajanga: ['Fokontany 1', 'Fokontany 2'],
      },

      'Mahajanga II': {
        'Ambalabe Befanjava': ['Fokontany 1'],
        Ambalakida: ['Fokontany 1'],
        Andranoboka: ['Fokontany 1'],
        Bekobay: ['Fokontany 1'],
        Belobaka: ['Fokontany 1'],
        Betsako: ['Fokontany 1'],
        Boanamary: ['Fokontany 1'],
        'Mahajamba Usine': ['Fokontany 1'],
        Mariarano: ['Fokontany 1'],
      },

      Marovoay: {
        Ambolomoty: ['Fokontany 1'],
        Ankaboka: ['Fokontany 1'],
        Ankaraobato: ['Fokontany 1'],
        Ankazomborona: ['Mahatazana', 'Fokontany 1'],
        Anosinalainolona: ['Fokontany 1'],
        'Antanambao Andranolava': ['Fokontany 1'],
        Antanimasaka: ['Fokontany 1'],
        Bemaharivo: ['Fokontany 1'],
        Manaratsandry: ['Fokontany 1'],
        Marosakoa: ['Befotoana', 'Tsarahonenana', 'Marosakoa', 'Manaribe'],
        Marovoay: ['Fokontany 1'],
        'Marovoay Banlieue': ['Fokontany 1'],
        Tsararano: ['Fokontany 1'],
      },

      Mitsinjo: {
        Ambarimaninga: ['Fokontany 1'],
        'Antongomena Bevary': ['Fokontany 1'],
        Antseza: ['Fokontany 1'],
        Bekipay: ['Fokontany 1'],
        Katsepy: ['Fokontany 1'],
        Matsakabanja: ['Fokontany 1'],
        Mitsinjo: ['Fokontany 1'],
      },

      Soalala: {
        Ambohipaky: ['Fokontany 1'],
        Andranomavo: ['Fokontany 1'],
        Antsakoamileka: ['Fokontany 1'],
        Soalala: ['Fokontany 1'],
      },
    },
  };

  const emptyRow = {
    nom: '',
    superficie: '',
    population: '',
    ecole_primaire: '',
    ecole_secondaire: '',
    ecole_lycee: '',
    sante_toby: '',
    sante_csb1: '',
    sante_csb2: '',
    sante_chd: '',
    aep: '',
    produit: '',
    marche: '',
  };

  /* ================= STATES ================= */
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [commune, setCommune] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [showSave, setShowSave] = useState(false);

  const districts = region ? Object.keys(data[region]) : [];

  const communes =
    region && district ? Object.keys(data[region][district]) : [];

  const fokontanyList =
    region && district && commune ? data[region][district][commune] : [];

  /* ================= RESET ================= */
  const resetRows = () => {
    setRows([]);
    setSelected([]);
  };

  /* ================= GENERATE ================= */
  const generate = () => {
    setRows(fokontanyList.map((f: string) => ({ ...emptyRow, nom: f })));
    setSelected([]);
  };

  /* ================= UPDATE ================= */
  const update = (i: number, field: string, value: any) => {
    const copy = [...rows];
    copy[i][field] = value;
    setRows(copy);
  };

  /* ================= SELECT ================= */
  const toggleSelect = (i: number) => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const deleteSelected = () => {
    setRows(rows.filter((_, i) => !selected.includes(i)));
    setSelected([]);
  };

  const addFokontany = () => {
    setRows([...rows, { ...emptyRow }]);
  };

  /* ================= STATS ================= */
  const stats = useMemo(
    () => ({
      pop: rows.reduce((a, b) => a + Number(b.population || 0), 0),
      superficie: rows.reduce((a, b) => a + Number(b.superficie || 0), 0),
    }),
    [rows]
  );
  const poleDemographique = useMemo(() => {
    const validRows = rows.filter(
      (r) => Number(r.population) > 0 && Number(r.superficie) > 0
    );

    return validRows
      .map((r) => {
        const pop = Number(r.population || 0);
        const sup = Number(r.superficie || 1);

        const density = pop / sup;

        const maxPop = Math.max(
          ...validRows.map((x) => Number(x.population || 0)),
          0
        );

        const densities = validRows.map(
          (x) => Number(x.population || 0) / Number(x.superficie || 1)
        );

        const maxDensity = Math.max(...densities, 0);

        const notePop = maxPop ? (pop * 5) / maxPop : 0;
        const noteDensity = maxDensity ? (density * 5) / maxDensity : 0;

        const poids = (notePop + noteDensity) / 2;

        return {
          nom: r.nom,
          density,
          poids,
        };
      })
      .sort((a, b) => {
        if (b.poids !== a.poids) {
          return b.poids - a.poids;
        }

        return b.density - a.density;
      })
      .slice(0, 3);
  }, [rows]);

  /* ================= POIDS DEMOGRAPHIQUE ================= */
  const demographicRanking = useMemo(() => {
    const validRows = rows.filter(
      (r) => Number(r.population) > 0 && Number(r.superficie) > 0
    );

    const maxPop = Math.max(
      ...validRows.map((r) => Number(r.population || 0)),
      0
    );

    const densities = validRows.map(
      (r) => (Number(r.population) / Number(r.superficie)) * 100
    );
    const maxDensity = Math.max(...densities, 0);

    return validRows
      .map((r, i) => {
        const pop = Number(r.population || 0);
        const sup = Number(r.superficie || 1);

        const density = pop / sup;

        const notePop = maxPop ? (pop * 5) / maxPop : 0;
        const noteDensity = maxDensity ? (density * 5) / maxDensity : 0;

        const poids = (notePop + noteDensity) / 2;

        return {
          nom: r.nom,
          poids,
        };
      })
      .filter((r) => r.poids >= 3);
  }, [rows]);
  /* ================= DIAGNOSTIC BESOINS ================= */

  const totalPop = rows.reduce((a, b) => a + Number(b.population || 0), 0);

  const totalCSB1 = rows.reduce((a, b) => a + Number(b.sante_csb1 || 0), 0);

  const totalCSB2 = rows.reduce((a, b) => a + Number(b.sante_csb2 || 0), 0);

  const totalCHD = rows.reduce((a, b) => a + Number(b.sante_chd || 0), 0);

  const totalPrimary = rows.reduce(
    (a, b) => a + Number(b.ecole_primaire || 0),
    0
  );

  const totalSecondary = rows.reduce(
    (a, b) => a + Number(b.ecole_secondaire || 0),
    0
  );

  const totalLycee = rows.reduce((a, b) => a + Number(b.ecole_lycee || 0), 0);

  /* ================= AEP (NORME 1 BORNES / 250 HAB) ================= */
  const besoinAEP = Math.ceil(totalPop / 250);

  /* ================= DIAGNOSTIC COMMUNAL ================= */

  let communeBesoin = [];

  // ===== SANTÉ =====
  if (totalPop >= 50000 && totalCHD === 0) {
    communeBesoin.push('1 CHD');
  }

  if (totalPop >= 25000 && totalCSB2 === 0) {
    communeBesoin.push('1 CSB II');
  }

  if (totalPop >= 8000 && totalCSB1 < Math.ceil(totalPop / 5000)) {
    communeBesoin.push(`${Math.ceil(totalPop / 5000) - totalCSB1} CSB I`);
  }

  // ===== ÉDUCATION =====
  if (totalPrimary < Math.ceil(totalPop / 1500)) {
    communeBesoin.push(
      `${Math.ceil(totalPop / 1500) - totalPrimary} École primaire`
    );
  }

  if (totalSecondary < Math.ceil(totalPop / 5000)) {
    communeBesoin.push(`${Math.ceil(totalPop / 5000) - totalSecondary} CEG`);
  }

  if (totalLycee < Math.ceil(totalPop / 15000)) {
    communeBesoin.push(`${Math.ceil(totalPop / 15000) - totalLycee} Lycée`);
  }

  // ===== AEP =====
  if (besoinAEP > 0) {
    communeBesoin.push(`${besoinAEP} bornes fontaines (AEP)`);
  }

  /* ================= FORMAT POUR L'UI ================= */

  const diagnosticFokontany = useMemo(() => {
    const scored = rows
      .map((r) => {
        const pop = Number(r.population || 0);
        const sup = Number(r.superficie || 1);

        const density = pop / sup;

        let score = 0;

        // --- logique simple de criticité ---
        if (pop > 5000) score += 3;
        else if (pop > 2000) score += 2;
        else score += 1;

        if (density > 100) score += 2;
        else if (density > 50) score += 1;

        const csb = Number(r.sante_csb1 || 0) + Number(r.sante_csb2 || 0);
        if (csb === 0 && pop > 2000) score += 2;

        const aep = Number(r.aep || 0);
        if (aep === 0 && pop > 1000) score += 2;

        let niveau = 'faible';
        if (score >= 6) niveau = 'critique';
        else if (score >= 4) niveau = 'moyen';

        const besoins = [];

        if (aep === 0 && pop > 1000) {
          besoins.push(`AEP (${Math.ceil(pop / 250)} bornes)`);
        }

        if (csb === 0 && pop > 2000) {
          besoins.push('CSB');
        }

        return {
          nom: r.nom,
          population: pop,
          score,
          niveau,
          besoins,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // 🔥 LES 3 PREMIERS SEULEMENT

    return scored;
  }, [rows]);

  const communeDiagnostic = useMemo(() => {
    return {
      nom: commune || 'Commune',
      besoins: communeBesoin || [],
    };
  }, [commune, communeBesoin]);

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Tableau de données à analyser</h2>

      {/* ================= FILTERS ================= */}
      <div style={styles.filters}>
        {/* ================= LEFT (LOCALISATION) ================= */}
        <div style={styles.leftGroup}>
          <select
            style={styles.select}
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setDistrict('');
              setCommune('');
              resetRows();
            }}
          >
            <option value="">📍 Région</option>

            {Object.keys(data).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setCommune('');
              resetRows();
            }}
          >
            <option value="">🏙️ District</option>

            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={commune}
            onChange={(e) => {
              setCommune(e.target.value);
              resetRows();
            }}
          >
            <option value="">🏡 Commune</option>

            {communes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ================= CENTER (ACTIONS) ================= */}
        <div style={styles.centerGroup}>
          <button style={styles.button} onClick={generate}>
            ⚡ Afficher
          </button>

          <button
            style={styles.addButton}
            onClick={() => {
              addFokontany();
              setShowSave(true);
            }}
          >
            ➕ Ajouter
          </button>

          <button style={styles.deleteButton} onClick={deleteSelected}>
            🗑 Supprimer
          </button>

          {showSave && (
            <button
              style={{ ...styles.button, background: '#f59e0b' }}
              onClick={() => {
                console.log('Données enregistrées :', rows);
                setShowSave(false);
              }}
            >
              💾 Enregistrer
            </button>
          )}
        </div>

        {/* ================= RIGHT (SEARCH) ================= */}
        <div style={styles.rightGroup}>
          <input
            style={styles.search}
            placeholder="🔍 Rechercher un fokontany..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ================= INFO ================= */}
      <div style={styles.infoBar}>
        <div style={styles.infoItem}>📍 Région : {region || '-'}</div>
        <div style={styles.infoItem}>🏙️ District : {district || '-'}</div>
        <div style={styles.infoItem}>🏡 Commune : {commune || '-'}</div>

        <div style={styles.infoItem}>📊 Total Fokontany : {rows.length}</div>

        <div style={{ fontSize: 11, color: '#64748b' }}>
          📊 Scroll pour explorer toutes les données
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thSelect} rowSpan={2}>
                ✔
              </th>

              <th style={styles.thSticky} rowSpan={2}>
                Fokontany
              </th>

              <th style={styles.thBase} rowSpan={2}>
                Superficie(ha)
              </th>

              <th style={styles.thBase} rowSpan={2}>
                Population
              </th>

              <th style={styles.thBase} colSpan={3}>
                École
              </th>

              <th style={styles.thBase} colSpan={4}>
                Santé
              </th>

              <th
                style={{
                  ...styles.thBase,
                  minWidth: 110,
                }}
                rowSpan={2}
              >
                AEP <br />
                (Adduction en eau potable)
              </th>

              <th style={styles.thBase} rowSpan={2}>
                Produits
              </th>

              <th style={styles.thBase} rowSpan={2}>
                Type de <br />
                marché
              </th>
            </tr>

            <tr>
              <th style={styles.th}>Primaire</th>
              <th style={styles.th}>Secondaire</th>
              <th style={styles.th}>Lycée</th>

              <th style={styles.th}>Toby AC</th>
              <th style={styles.th}>CSB I</th>
              <th style={styles.th}>CSB II</th>
              <th style={styles.th}>CHD</th>
            </tr>
          </thead>

          <tbody>
            {rows
              .filter((r) => {
                const term = search.toLowerCase();

                return (
                  r.nom.toLowerCase().includes(term) ||
                  commune.toLowerCase().includes(term)
                );
              })
              .map((r, i) => (
                <tr key={i} style={i % 2 ? styles.rowOdd : styles.rowEven}>
                  <td style={styles.tdCheckbox}>
                    <input
                      type="checkbox"
                      checked={selected.includes(i)}
                      onChange={() => toggleSelect(i)}
                    />
                  </td>
                  <td style={styles.tdFokontany}>
                    <input
                      value={r.nom}
                      style={styles.inputFokontany}
                      onChange={(e) => update(i, 'nom', e.target.value)}
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.inputSmall}
                      value={r.superficie}
                      onChange={(e) => update(i, 'superficie', e.target.value)}
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.inputSmall}
                      value={r.population}
                      onChange={(e) => update(i, 'population', e.target.value)}
                    />
                  </td>

                  {[
                    'ecole_primaire',
                    'ecole_secondaire',
                    'ecole_lycee',
                    'sante_toby',
                    'sante_csb1',
                    'sante_csb2',
                    'sante_chd',
                    'aep',
                    'produit',
                  ].map((f) => (
                    <td key={f} style={styles.td}>
                      <input
                        style={styles.inputSmall}
                        value={r[f]}
                        onChange={(e) => update(i, f, e.target.value)}
                      />
                    </td>
                  ))}
                  <td style={styles.td}>
                    <select
                      style={styles.inputSmall}
                      value={r.marche}
                      onChange={(e) => update(i, 'marche', e.target.value)}
                    >
                      <option></option>
                      <option>Local</option>
                      <option>Hebdomadaire</option>
                      <option>Exportation</option>
                    </select>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ================= BLOCS ANALYSE ================= */}
      <div style={styles.analysisGrid}>
        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #2563eb' }}
        >
          <h3 style={styles.analysisTitle}>Pôle Communale</h3>
        </div>

        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #059669' }}
        >
          <h3 style={styles.analysisTitle}>Pôle démographique</h3>

          <div style={styles.demographicGrid}>
            {poleDemographique.length === 0 ? (
              <div style={{ fontSize: 13, color: '#888' }}>Aucun résultat</div>
            ) : (
              poleDemographique.map((f, i) => (
                <div key={i} style={styles.demographicCard}>
                  <div style={styles.rankCircle}>{i + 1}</div>

                  <div style={styles.demographicContent}>
                    <div style={styles.fokontanyName}>{f.nom}</div>

                    <div style={styles.densityText}>
                      {f.density.toFixed(2)} hab/ha
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #dc2626' }}
        >
          <h3 style={styles.analysisTitle}>Pôle Sociale</h3>
        </div>

        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #d97706' }}
        >
          <h3 style={styles.analysisTitle}>Pôle économique</h3>
        </div>

        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #7c3aed' }}
        >
          <h3 style={styles.analysisTitle}>Carrefour</h3>
        </div>

        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #0891b2' }}
        >
          <h3 style={styles.analysisTitle}>Pôle administratif</h3>
        </div>

        <div
          style={{ ...styles.analysisCard, borderLeft: '8px solid #db2777' }}
        >
          <h3 style={styles.analysisTitle}>Source de SECO</h3>
        </div>

        <div
          style={{
            ...styles.analysisCard,
            borderLeft: '8px solid #65a30d',
            gridColumn: 'span 3',
            height: 115,
          }}
        >
          <h3 style={styles.analysisTitle}>
            📊 Analyse communale basée sur norme territoriale
          </h3>

          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              maxHeight: 95,
              overflowY: 'hidden',
              paddingRight: 5,
            }}
          >
            {/* ================= FOKONTANY ================= */}
            {diagnosticFokontany.map((r, i) => (
              <div
                key={i}
                style={{
                  background: 'transparent', // ❌ plus de fond lourd
                  borderRadius: 6,
                  padding: 4, // 🔥 réduit
                  border: '1px solid #e5e7eb',
                  minHeight: 55, // 🔥 réduit
                  overflow: 'hidden',
                }}
              >
                {/* NOM + NIVEAU */}
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 2,
                    color: '#111827',
                    fontSize: 9, // 🔥 réduit
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.1,
                  }}
                >
                  📍 {r.nom}
                </div>

                <div
                  style={{
                    fontSize: 8.5, // 🔥 réduit
                    fontWeight: 600,
                    color:
                      r.niveau === 'critique'
                        ? '#dc2626'
                        : r.niveau === 'moyen'
                        ? '#f59e0b'
                        : '#16a34a',
                    marginBottom: 2,
                  }}
                >
                  {r.niveau.toUpperCase()}
                </div>

                {/* BESOINS */}
                <div
                  style={{
                    fontSize: 8.3, // 🔥 réduit
                    color: '#374151',
                    lineHeight: 1.1,
                  }}
                >
                  {r.besoins.map((b, idx) => (
                    <div key={idx}>• {b}</div>
                  ))}
                </div>
              </div>
            ))}

            {/* ================= COMMUNE ================= */}
            {communeDiagnostic.besoins.length > 0 && (
              <div
                style={{
                  background: '#ecfeff',
                  borderRadius: 8,
                  padding: 6, // 🔥 réduit
                  border: '2px solid #0891b2',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 3,
                    fontSize: 9,
                  }}
                >
                  🏛 {communeDiagnostic.nom}
                </div>

                <div style={{ fontSize: 8.5, lineHeight: 1.2 }}>
                  {communeDiagnostic.besoins.map((b, idx) => (
                    <div key={idx}>▸ {b}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= STATS ================= */}
      <div style={styles.statsContainer}>
        👥 {stats.pop} | 📏 {stats.superficie}
      </div>
    </div>
  );
}
const BASE_CELL = {
  border: '1px solid #d1d5db',
  padding: '1px 3px',
  fontSize: 10,
  textAlign: 'center',
  background: '#fff',
  verticalAlign: 'middle',
  height: 24,
};

const BASE_HEADER = {
  background: '#eef3ff',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 4px',
  lineHeight: 1.1,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  minHeight: 24,
  verticalAlign: 'middle',
  color: '#1e293b',
};

const btnBase = {
  height: 34,
  padding: '0 12px',
  borderRadius: 8,
  fontSize: 11,
  lineHeight: 1,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 600,
};

const styles: any = {
  /* ================= PAGE ================= */
  page: {
    padding: 25,
    background: 'none',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    width: '100%',
    maxWidth: '100vw',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },

  title: {
    fontSize: 22,
    fontWeight: 700,
  },

  /* ================= FILTER BAR ================= */
  filters: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: '#ffffff',
    padding: '8px 10px',
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    flexWrap: 'wrap',
  },

  leftGroup: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },

  centerGroup: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  select: {
    height: 34,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 12,
    background: '#f9fafb',
    minWidth: 120,
    color: '#0f172a',
  },

  search: {
    height: 34,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 12,
    width: 220,
    background: '#fff',
  },

  button: {
    ...btnBase,
    background: '#2563eb',
    color: '#fff',
  },

  addButton: {
    ...btnBase,
    background: '#059669',
    color: '#fff',
  },

  deleteButton: {
    ...btnBase,
    background: '#dc2626',
    color: '#fff',
  },

  /* ================= INFO ================= */
  infoBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
    fontSize: 11,
  },

  infoItem: {
    background: '#fff',
    padding: 6,
    borderRadius: 8,
    fontSize: 11,
  },

  /* ================= TABLE WRAPPER ================= */
  tableWrapper: {
    background: '#fff',
    borderRadius: 12,
    minHeight: 120,
    maxHeight: 220,
    overflowY: 'auto',
    overflowX: 'auto',
    border: '1px solid #dbe2ea',
    position: 'relative',
  },

  table: {
    borderCollapse: 'separate',
    borderSpacing: 0,
    width: '100%',
    minWidth: 'max-content',
    tableLayout: 'fixed',
  },
  /* ================= HEADER ================= */

  thBase: {
    ...BASE_HEADER,
    background: '#eef3ff',
    fontSize: 11,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center',
    verticalAlign: 'middle',
    border: '1px solid #cbd5e1',
    padding: '6px 4px',
    height: 38,
  },

  th: {
    ...BASE_HEADER,
    background: '#eef3ff',
    fontSize: 11,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center',
    verticalAlign: 'middle',
    border: '1px solid #cbd5e1',
    padding: '6px 4px',
    height: 38,
  },

  thSticky: {
    ...BASE_HEADER,
    background: '#eef3ff',
    position: 'sticky',
    left: 45,
    zIndex: 220,
    width: 150,
    minWidth: 150,
    maxWidth: 150,
    fontSize: 11,
    fontWeight: 700,
    color: '#1e293b',
    border: '1px solid #cbd5e1',
  },

  thSelect: {
    ...BASE_HEADER,
    background: '#eef3ff',
    position: 'sticky',
    left: 0,
    zIndex: 221,
    width: 45,
    minWidth: 45,
    maxWidth: 45,
    fontSize: 11,
    fontWeight: 700,
    color: '#1e293b',
    border: '1px solid #cbd5e1',
  },
  /* ================= BODY CELLS ================= */
  tdCheckbox: {
    ...BASE_CELL,
    position: 'sticky',
    left: 0,
    zIndex: 10,
    width: 45,
    minWidth: 45,
    maxWidth: 45,
  },

  tdFokontany: {
    ...BASE_CELL,
    position: 'sticky',
    left: 45, // ⚠️ IDENTIQUE AU HEADER
    zIndex: 9,
    width: 150,
    minWidth: 150,
    maxWidth: 150,
    fontWeight: 600,
    background: '#f9fafb',
  },

  td: {
    ...BASE_CELL,
    width: 90,
    color: '#1e293b',
    minWidth: 90,
    maxWidth: 90,
  },

  /* ================= INPUTS ================= */
  inputSmall: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    textAlign: 'center',
    fontSize: 10,
    padding: 0,
    margin: 0,
    height: 18,
  },

  inputFokontany: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontWeight: 600,
    fontSize: 10,
    padding: 0,
    margin: 0,
    height: 18,
  },

  /* ================= ROWS ================= */
  rowEven: {
    background: '#fff',
  },

  rowOdd: {
    background: '#f9fafb',
  },

  /* ================= ANALYSIS ================= */
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 10,
    marginTop: 10,
  },

  analysisCard: {
    background: '#ffffff',
    borderRadius: 14,
    padding: 12,
    maxHeight: 140,
    height: 'auto',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
    border: '1px solid #e2e8f0',
    transition: '0.2s',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  analysisTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
  },

  demographicGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginTop: 4,
    maxHeight: 120,
    overflow: 'hidden',
  },

  demographicCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 0',
    minHeight: 18,
    overflow: 'hidden',
  },

  rankCircle: {
    width: 15,
    height: 15,
    borderRadius: '50%',
    background: '#059669',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 9,
    flexShrink: 0,
  },

  demographicContent: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
    lineHeight: 1.1,
  },

  fokontanyName: {
    fontSize: 9,
    fontWeight: 700,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1,
  },

  densityText: {
    fontSize: 8.8,
    color: '#64748b',
    marginTop: 0,
    lineHeight: 1,
  },
};
