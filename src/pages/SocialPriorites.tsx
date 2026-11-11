import { useMemo } from "react";
import { Link } from "react-router-dom";
import { EditableTable, EmptyState, Kpi, PageShell, Section, type Col } from "../components/AnalyseKit";
import { SCALES, ZoneMap, type MapVal } from "../components/ZoneMap";
import { fmt, usePersistedState } from "../lib/analyse-utils";
import { useZone } from "../lib/geo";
import { KEY_SERVICES, KEY_SOC, SERVICES_DEFAUT, diagnostiquer, planifier, type Service, type SocData } from "../lib/social";
import type { Rec } from "../lib/zonedata";

const COLS: Col<Service>[] = [
  { key: "nom", label: "Type d'investissement" },
  { key: "cout", label: "Coût par unité (M Ar)", type: "number", min: 1 },
  { key: "couverture", label: "Personnes servies par unité", type: "number", min: 1 },
];

export default function SocialPriorites() {
  const zone = useZone();
  const [all] = usePersistedState<Record<string, Rec<SocData>>>(KEY_SOC, {});
  const [services, setServices] = usePersistedState<Service[]>(KEY_SERVICES, SERVICES_DEFAUT);
  const [budget, setBudget] = usePersistedState("paddi.social.budget", 2000); // millions d'Ariary

  const notes = useMemo(
    () => diagnostiquer(zone.units.flatMap((u) => { const d = all[u.key]; return d && d.population > 0 ? [{ unit: u, d }] : []; })),
    [zone.units, all]);
  const plan = useMemo(() => planifier(notes, services, budget), [notes, services, budget]);

  const parUnite = useMemo(() => {
    const m = new Map<string, number>();
    plan.lignes.forEach((l) => m.set(l.unit.key, (m.get(l.unit.key) ?? 0) + l.personnes));
    return m;
  }, [plan]);
  const values = useMemo(() => {
    const top = Math.max(1, ...parUnite.values());
    const v: Record<string, MapVal> = {};
    notes.forEach((n) => {
      const p = parUnite.get(n.unit.key) ?? 0;
      v[n.unit.key] = { v: (p / top) * 100, text: p ? `${fmt(p, 0)} personnes touchées` : "Aucun investissement prévu" };
    });
    return v;
  }, [notes, parUnite]);

  const depense = budget - plan.restant;
  const touches = plan.lignes.reduce((s, l) => s + l.personnes, 0);

  return (
    <PageShell
      title="Planificateur de priorités sociales"
      intro="Avec un budget donné, l'outil propose où construire en premier pour toucher le plus de personnes, en favorisant les territoires les plus précaires."
      zone={zone}
      map={<ZoneMap zone={zone} values={values} scale={SCALES.vert} legend="Personnes touchées par le plan" low="peu" high="beaucoup" />}
    >
      {notes.length === 0 ? (
        <EmptyState title="Aucun territoire renseigné dans cette zone"
          actions={<Link className="an-btn" to="/dashboard/analyse-social">Aller au diagnostic des territoires</Link>}>
          Le planificateur utilise les données saisies dans le diagnostic des territoires, pour la même zone.
        </EmptyState>
      ) : (
        <>
          <Section title="Budget et coûts">
            <label className="an-field">
              Budget (millions d'Ariary)
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </label>
            <details className="an-details">
              <summary>Coûts des investissements</summary>
              <p className="an-hint">Valeurs de départ = hypothèses. Remplacez-les par les coûts réels (ministères, bailleurs, devis récents).</p>
              <EditableTable cols={COLS} rows={services} onChange={setServices} />
            </details>
          </Section>

          <div className="an-kpis">
            <Kpi label="Budget utilisé" value={fmt(depense, 0)} unit="M Ar" />
            <Kpi label="Personnes touchées" value={fmt(touches, 0)} />
            <Kpi label="Coût par personne" value={touches ? fmt((depense * 1_000_000) / touches, 0) : "–"} unit="Ar" />
          </div>

          <Section title="Plan proposé" hint="Territoires et investissements classés par nombre de personnes touchées.">
            {plan.lignes.length === 0 ? (
              <p className="an-note">Budget insuffisant ou aucun besoin détecté dans cette zone.</p>
            ) : (
              <div className="an-scroll">
                <table className="an-table an-units an-result">
                  <thead>
                    <tr><th>Territoire</th><th>Investissement</th><th className="an-num">Unités</th><th className="an-num">Personnes</th><th className="an-num">Coût (M Ar)</th></tr>
                  </thead>
                  <tbody>
                    {plan.lignes.map((l) => (
                      <tr key={l.unit.key + l.service.id} className={zone.focus?.key === l.unit.key ? "focus" : ""}>
                        <td className="an-name"><button type="button" onClick={() => zone.select(l.unit)}>{l.unit.name}</button></td>
                        <td data-label="Investissement">{l.service.nom}</td>
                        <td className="an-num" data-label="Unités">{l.unites}</td>
                        <td className="an-num" data-label="Personnes">{fmt(l.personnes, 0)}</td>
                        <td className="an-num" data-label="Coût (M Ar)">{fmt(l.cout, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="an-note">Simplification : le besoin d'un service = population × écart de couverture. Prévoir aussi l'entretien et le personnel (enseignants, infirmiers), souvent plus coûteux que la construction.</p>
          </Section>
        </>
      )}
    </PageShell>
  );
}
