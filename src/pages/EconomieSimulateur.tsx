import { useMemo } from "react";
import { Bars, Kpi, PageShell, Section } from "../components/AnalyseKit";
import { fmt, usePersistedState } from "../lib/analyse-utils";
import { KEY_POIDS, POIDS_DEFAUT, Poids, noter, useSecteurs } from "../lib/economie";
import { TABS_ECONOMIE } from "./EconomieDiagnostic";

type Hyp = { mult: number; coutEmploi: number };

export default function EconomieSimulateur() {
  const [secteurs] = useSecteurs();
  const [poids] = usePersistedState<Poids>(KEY_POIDS, POIDS_DEFAUT);
  const [budget, setBudget] = usePersistedState("paddi.economie.budget", 500); // Md Ar
  const [alloc, setAlloc] = usePersistedState<Record<string, number>>("paddi.economie.alloc", {});
  const [hyp, setHyp] = usePersistedState<Record<string, Hyp>>("paddi.economie.hyp", {});

  const notes = useMemo(() => noter(secteurs, poids), [secteurs, poids]);
  const h = (id: string): Hyp => hyp[id] ?? { mult: 1.3, coutEmploi: 25 };
  const pct = (id: string) => alloc[id] ?? 0;

  const lignes = notes.map((s) => {
    const montant = (budget * pct(s.id)) / 100; // Md Ar
    const { mult, coutEmploi } = h(s.id);
    return { s, montant, emplois: coutEmploi > 0 ? (montant * 1000) / coutEmploi : 0, va: montant * mult };
  });
  const totalPct = notes.reduce((t, s) => t + pct(s.id), 0);
  const emploisTot = lignes.reduce((t, l) => t + l.emplois, 0);
  const vaTot = lignes.reduce((t, l) => t + l.va, 0);

  const repartir = (poidsDe: (i: number) => number) => {
    const w = notes.map((_, i) => poidsDe(i));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    setAlloc(Object.fromEntries(notes.map((s, i) => [s.id, Math.round((w[i] / sum) * 1000) / 10])));
  };

  return (
    <PageShell
      title="Simulateur d'investissement"
      intro="Répartissez un budget entre les secteurs et voyez l'effet estimé sur les emplois et la richesse créée. Les secteurs viennent de la page Diagnostic."
      tabs={TABS_ECONOMIE}
    >
      {notes.length === 0 ? (
        <p className="an-empty">Ajoutez d'abord des secteurs dans la page Diagnostic.</p>
      ) : (
        <>
          <Section title="1. Budget et scénario">
            <label className="an-field">
              Budget à investir (milliards d'Ariary)
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </label>
            <br />
            <div className="an-tools">
              <button className="an-btn ghost" onClick={() => repartir(() => 1)}>Équilibré</button>
              <button className="an-btn ghost" onClick={() => repartir((i) => notes[i].score)}>Selon le score de priorité</button>
              <button className="an-btn ghost" onClick={() => repartir((i) => 1 / (h(notes[i].id).coutEmploi || 1))}>Maximiser les emplois</button>
            </div>
          </Section>

          <Section title="2. Répartition et hypothèses" hint="Le multiplicateur = richesse créée par Ariary investi. Le coût par emploi = millions d'Ariary pour créer un emploi. Ce sont des hypothèses : remplacez-les par des valeurs issues d'études.">
            <div className="an-scroll">
              <table className="an-table an-result">
                <thead>
                  <tr><th>Secteur</th><th>Part (%)</th><th>Multiplicateur</th><th>Coût/emploi (M Ar)</th><th className="an-num">Montant (Md Ar)</th><th className="an-num">Emplois créés</th></tr>
                </thead>
                <tbody>
                  {lignes.map(({ s, montant, emplois }) => (
                    <tr key={s.id}>
                      <td>{s.nom}</td>
                      <td><input type="number" min={0} max={100} step={0.5} value={pct(s.id)} onChange={(e) => setAlloc({ ...alloc, [s.id]: Number(e.target.value) })} style={{ width: 80 }} /></td>
                      <td><input type="number" min={0} step={0.1} value={h(s.id).mult} onChange={(e) => setHyp({ ...hyp, [s.id]: { ...h(s.id), mult: Number(e.target.value) } })} style={{ width: 80 }} /></td>
                      <td><input type="number" min={1} value={h(s.id).coutEmploi} onChange={(e) => setHyp({ ...hyp, [s.id]: { ...h(s.id), coutEmploi: Number(e.target.value) } })} style={{ width: 80 }} /></td>
                      <td className="an-num">{fmt(montant)}</td>
                      <td className="an-num">{fmt(emplois, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Math.abs(totalPct - 100) > 0.5 && (
              <p className="an-note" role="alert">Total actuel : {fmt(totalPct)} %. Il doit faire 100 % pour que les résultats soient cohérents.</p>
            )}
          </Section>

          <Section title="3. Résultats estimés">
            <div className="an-grid">
              <Kpi label="Emplois créés" value={fmt(emploisTot, 0)} />
              <Kpi label="Richesse additionnelle" value={fmt(vaTot, 0)} unit="Md Ar" />
              <Kpi label="Coût moyen par emploi" value={emploisTot ? fmt((budget * 1000) / emploisTot) : "–"} unit="M Ar" />
            </div>
            <br />
            <Bars items={lignes.map((l) => ({ label: l.s.nom, value: l.emplois }))} unit=" emplois" />
            <p className="an-note">Estimation simplifiée (effet direct uniquement). Utile pour comparer des scénarios entre eux, pas pour prévoir un chiffre exact.</p>
          </Section>
        </>
      )}
    </PageShell>
  );
}
