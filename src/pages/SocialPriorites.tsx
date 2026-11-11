import { useMemo } from "react";
import { Bars, Col, EditableTable, Kpi, PageShell, Section } from "../components/AnalyseKit";
import { fmt, usePersistedState } from "../lib/analyse-utils";
import { KEY_SERVICES, SERVICES_DEFAUT, Service, diagnostiquer, useTerritoires } from "../lib/social";
import { TABS_SOCIAL } from "./SocialDiagnostic";

const COLS: Col<Service>[] = [
  { key: "nom", label: "Type d'investissement" },
  { key: "cout", label: "Coût par unité (M Ar)", type: "number", min: 1 },
  { key: "couverture", label: "Personnes servies par unité", type: "number", min: 1 },
];

type Ligne = { territoire: string; service: string; unites: number; personnes: number; cout: number };

export default function SocialPriorites() {
  const [terr] = useTerritoires();
  const [services, setServices] = usePersistedState<Service[]>(KEY_SERVICES, SERVICES_DEFAUT);
  const [budget, setBudget] = usePersistedState("paddi.social.budget", 2000); // M Ar

  const resultat = useMemo(() => {
    const notes = diagnostiquer(terr);
    const besoin = new Map<string, number>();
    notes.forEach((t) =>
      services.forEach((s) => {
        const ecart = t.manques.find((m) => m.key === s.indicateur)?.ecart ?? 0;
        besoin.set(`${t.id}|${s.id}`, (t.population * ecart) / 100);
      }),
    );
    const reste = new Map(besoin);
    const unites = new Map<string, number>();
    let b = budget;

    // Glouton : à chaque étape on finance l'unité qui touche le plus de monde par Ariary,
    // avec un bonus d'équité pour les territoires les plus précaires.
    for (let i = 0; i < 10000; i++) {
      let best: string | null = null;
      let bestScore = 0;
      for (const [k, r] of reste) {
        if (r <= 0) continue;
        const [tid, sid] = k.split("|");
        const s = services.find((x) => x.id === sid);
        const t = notes.find((x) => x.id === tid);
        if (!s || !t || s.cout <= 0 || s.cout > b || s.couverture <= 0) continue;
        const sc = (Math.min(r, s.couverture) / s.cout) * (1 + t.indice / 100);
        if (sc > bestScore) { bestScore = sc; best = k; }
      }
      if (!best) break;
      const s = services.find((x) => x.id === best!.split("|")[1])!;
      b -= s.cout;
      reste.set(best, (reste.get(best) ?? 0) - s.couverture);
      unites.set(best, (unites.get(best) ?? 0) + 1);
    }

    const lignes: Ligne[] = [];
    unites.forEach((u, k) => {
      const [tid, sid] = k.split("|");
      const s = services.find((x) => x.id === sid)!;
      lignes.push({
        territoire: notes.find((x) => x.id === tid)!.nom,
        service: s.nom,
        unites: u,
        personnes: Math.min(besoin.get(k) ?? 0, u * s.couverture),
        cout: u * s.cout,
      });
    });
    lignes.sort((a, b2) => b2.personnes - a.personnes);
    const parTerr = new Map<string, number>();
    lignes.forEach((l) => parTerr.set(l.territoire, (parTerr.get(l.territoire) ?? 0) + l.personnes));
    return { lignes, restant: b, parTerr };
  }, [terr, services, budget]);

  const depense = budget - resultat.restant;
  const touches = resultat.lignes.reduce((s, l) => s + l.personnes, 0);

  return (
    <PageShell
      title="Planificateur de priorités sociales"
      intro="Avec un budget donné, l'outil propose où construire en premier pour toucher le plus de personnes, en favorisant les territoires les plus précaires."
      tabs={TABS_SOCIAL}
    >
      {terr.length === 0 ? (
        <p className="an-empty">Ajoutez d'abord des territoires dans la page Diagnostic.</p>
      ) : (
        <>
          <Section title="1. Budget disponible">
            <label className="an-field">
              Budget (millions d'Ariary)
              <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </label>
          </Section>

          <Section title="2. Coûts des investissements" hint="Valeurs de départ = hypothèses. Remplacez-les par les coûts réels (ministères, bailleurs, devis récents).">
            <EditableTable cols={COLS} rows={services} onChange={setServices} />
          </Section>

          <Section title="3. Plan proposé">
            <div className="an-grid">
              <Kpi label="Budget utilisé" value={fmt(depense, 0)} unit="M Ar" />
              <Kpi label="Personnes touchées" value={fmt(touches, 0)} />
              <Kpi label="Coût par personne" value={touches ? fmt((depense * 1_000_000) / touches, 0) : "–"} unit="Ar" />
            </div>
            <br />
            {resultat.lignes.length === 0 ? (
              <p className="an-empty">Budget insuffisant ou aucun besoin détecté.</p>
            ) : (
              <>
                <Bars items={[...resultat.parTerr].map(([label, value]) => ({ label, value }))} unit=" pers." />
                <br />
                <div className="an-scroll">
                  <table className="an-table an-result">
                    <thead><tr><th>Territoire</th><th>Investissement</th><th className="an-num">Unités</th><th className="an-num">Personnes</th><th className="an-num">Coût (M Ar)</th></tr></thead>
                    <tbody>
                      {resultat.lignes.map((l) => (
                        <tr key={l.territoire + l.service}>
                          <td data-label="Territoire">{l.territoire}</td>
                          <td data-label="Investissement">{l.service}</td>
                          <td className="an-num" data-label="Unités">{l.unites}</td>
                          <td className="an-num" data-label="Personnes">{fmt(l.personnes, 0)}</td>
                          <td className="an-num" data-label="Coût (M Ar)">{fmt(l.cout, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="an-note">
              Simplification : le besoin d'un service = population × écart de couverture. Prévoir aussi l'entretien et le personnel (enseignants, infirmiers), qui coûtent plus cher que la construction.
            </p>
          </Section>
        </>
      )}
    </PageShell>
  );
}
