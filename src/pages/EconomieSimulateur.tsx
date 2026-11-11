import { useMemo } from "react";
import { Link } from "react-router-dom";
import { EmptyState, Kpi, PageShell, Section } from "../components/AnalyseKit";
import { SCALES, ZoneMap, type MapVal } from "../components/ZoneMap";
import { fmt, usePersistedState } from "../lib/analyse-utils";
import {
  HYP_DEFAUT, KEY_ECO, KEY_POIDS, POIDS_DEFAUT, SCENARIOS, coutEmploi, effets, noter, repartir,
  type EcoData, type Hyp, type Poids, type Scenario,
} from "../lib/economie";
import { useZone } from "../lib/geo";
import type { Rec } from "../lib/zonedata";

const ORDRE = ["habitant", "priorite", "emplois"] as const;

export default function EconomieSimulateur() {
  const zone = useZone();
  const [all] = usePersistedState<Record<string, Rec<EcoData>>>(KEY_ECO, {});
  const [poids] = usePersistedState<Poids>(KEY_POIDS, POIDS_DEFAUT);
  const [budget, setBudget] = usePersistedState("paddi.economie.budget", 500); // milliards d'Ariary
  const [hyp, setHyp] = usePersistedState<Hyp>("paddi.economie.hyp2", HYP_DEFAUT);
  const [scenario, setScenario] = usePersistedState<Scenario>("paddi.economie.scenario", "priorite");
  const [perso, setPerso] = usePersistedState<Record<string, number>>("paddi.economie.perso", {});

  const notes = useMemo(
    () => noter(zone.units.flatMap((u) => { const d = all[u.key]; return d && d.population > 0 ? [{ unit: u, d }] : []; }), poids),
    [zone.units, all, poids]);
  const parts = useMemo(() => ({
    habitant: repartir(notes, "habitant", hyp), priorite: repartir(notes, "priorite", hyp), emplois: repartir(notes, "emplois", hyp),
  }), [notes, hyp]);
  const current = scenario === "perso" ? perso : parts[scenario];

  const totalEffets = (p: Record<string, number>) =>
    notes.reduce((t, n) => { const e = effets(n.d, (budget * (p[n.unit.key] ?? 0)) / 100, hyp); return { emplois: t.emplois + e.emplois, va: t.va + e.va }; }, { emplois: 0, va: 0 });
  const eff = totalEffets(current);
  const totalPct = notes.reduce((s, n) => s + (current[n.unit.key] ?? 0), 0);
  const maxPct = Math.max(0, ...notes.map((n) => current[n.unit.key] ?? 0));

  const setPct = (key: string, v: number) => {
    setPerso({ ...(scenario === "perso" ? perso : parts[scenario]), [key]: v });
    setScenario("perso");
  };
  const normaliser = () => {
    if (totalPct <= 0) return;
    setPerso(Object.fromEntries(notes.map((n) => [n.unit.key, Math.round(((current[n.unit.key] ?? 0) / totalPct) * 1000) / 10])));
  };

  const values = useMemo(() => {
    const v: Record<string, MapVal> = {};
    notes.forEach((n) => {
      const p = current[n.unit.key] ?? 0;
      v[n.unit.key] = { v: maxPct ? (p / maxPct) * 100 : 0, text: `${fmt(p)} % du budget · ${fmt((budget * p) / 100)} Md Ar` };
    });
    return v;
  }, [notes, current, maxPct, budget]);

  const num = (k: keyof Hyp, v: string) => setHyp({ ...hyp, [k]: Number(v) });

  return (
    <PageShell
      title="Simulateur d'investissement"
      intro="Répartissez un budget entre les territoires de la zone choisie et comparez l'effet sur l'emploi et la richesse créée."
      zone={zone}
      map={<ZoneMap zone={zone} values={values} scale={SCALES.vert} legend="Part du budget reçue" low="faible" high="forte" />}
    >
      {notes.length === 0 ? (
        <EmptyState title="Aucun territoire renseigné dans cette zone"
          actions={<Link className="an-btn" to="/dashboard/analyse-economie">Aller au diagnostic économique</Link>}>
          Le simulateur utilise les données saisies dans le diagnostic économique, pour la même zone.
        </EmptyState>
      ) : (
        <>
          <Section title="Budget à répartir">
            <label className="an-field">
              Budget (milliards d'Ariary)
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </label>
            <details className="an-details">
              <summary>Hypothèses de calcul</summary>
              <div className="an-sliders">
                <label>Richesse créée par Ariary investi : {hyp.mult}
                  <input type="number" min={0} step={0.1} value={hyp.mult} onChange={(e) => num("mult", e.target.value)} />
                </label>
                <label>Coût d'un emploi (M Ar)
                  <input type="number" min={1} value={hyp.cout} onChange={(e) => num("cout", e.target.value)} />
                </label>
                <label>Surcoût en zone enclavée (%)
                  <input type="number" min={0} value={hyp.surcout} onChange={(e) => num("surcout", e.target.value)} />
                </label>
              </div>
              <p className="an-note">Hypothèses de départ : remplacez-les par des valeurs issues d'études. La richesse varie avec le potentiel du territoire (de -20 % à +30 %), le coût d'un emploi augmente avec l'enclavement.</p>
            </details>
          </Section>

          <Section title="Comparer les scénarios" hint="Choisissez une répartition de départ, puis ajustez-la dans le tableau si besoin.">
            <div className="an-scen">
              {ORDRE.map((k) => {
                const e = totalEffets(parts[k]);
                return (
                  <button key={k} type="button" className={`an-scen-card ${scenario === k ? "on" : ""}`} aria-pressed={scenario === k} onClick={() => setScenario(k)}>
                    <strong>{SCENARIOS[k].titre}</strong>
                    <span>{SCENARIOS[k].desc}</span>
                    <dl>
                      <div><dt>Emplois</dt><dd>{fmt(e.emplois, 0)}</dd></div>
                      <div><dt>Richesse</dt><dd>{fmt(e.va, 0)} Md Ar</dd></div>
                    </dl>
                  </button>
                );
              })}
              {scenario === "perso" && (
                <div className="an-scen-card on">
                  <strong>Personnalisé</strong>
                  <span>Votre répartition modifiée dans le tableau.</span>
                  <dl>
                    <div><dt>Emplois</dt><dd>{fmt(eff.emplois, 0)}</dd></div>
                    <div><dt>Richesse</dt><dd>{fmt(eff.va, 0)} Md Ar</dd></div>
                  </dl>
                </div>
              )}
            </div>
          </Section>

          <div className="an-kpis">
            <Kpi label="Emplois créés" value={fmt(eff.emplois, 0)} />
            <Kpi label="Richesse additionnelle" value={fmt(eff.va, 0)} unit="Md Ar" />
            <Kpi label="Coût moyen par emploi" value={eff.emplois ? fmt((budget * 1000) / eff.emplois) : "–"} unit="M Ar" />
          </div>

          <Section title="Résultat par territoire"
            actions={Math.abs(totalPct - 100) > 0.5 ? <button type="button" className="an-btn ghost" onClick={normaliser}>Ramener à 100 %</button> : undefined}>
            <div className="an-scroll">
              <table className="an-table an-units an-result">
                <thead>
                  <tr><th>Territoire</th><th>Part (%)</th><th className="an-num">Montant (Md Ar)</th><th className="an-num">Coût/emploi (M Ar)</th><th className="an-num">Emplois</th></tr>
                </thead>
                <tbody>
                  {notes.map((n) => {
                    const p = current[n.unit.key] ?? 0;
                    const m = (budget * p) / 100;
                    return (
                      <tr key={n.unit.key} className={zone.focus?.key === n.unit.key ? "focus" : ""}>
                        <td className="an-name"><button type="button" onClick={() => zone.select(n.unit)}>{n.unit.name}</button></td>
                        <td data-label="Part (%)">
                          <input type="number" min={0} max={100} step={0.5} value={p} aria-label={`Part du budget : ${n.unit.name}`} onChange={(e) => setPct(n.unit.key, Number(e.target.value))} />
                        </td>
                        <td className="an-num" data-label="Montant (Md Ar)">{fmt(m)}</td>
                        <td className="an-num" data-label="Coût/emploi (M Ar)">{fmt(coutEmploi(n.d, hyp))}</td>
                        <td className="an-num" data-label="Emplois">{fmt(effets(n.d, m, hyp).emplois, 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {Math.abs(totalPct - 100) > 0.5 && <p className="an-warn" role="alert">Total actuel : {fmt(totalPct)} %. Il doit faire 100 % pour que les résultats soient cohérents.</p>}
            <p className="an-note">Estimation simplifiée (effet direct). Utile pour comparer des scénarios entre eux, pas pour prévoir un chiffre exact.</p>
          </Section>
        </>
      )}
    </PageShell>
  );
}
