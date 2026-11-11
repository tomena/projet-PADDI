import { useMemo, useState } from "react";
import { Advice, DataTools, EmptyState, Facts, Kpi, PageShell, RankList, Section, Segmented, UnitTable } from "../components/AnalyseKit";
import { SCALES, ZoneMap, type MapVal } from "../components/ZoneMap";
import { fmt, usePersistedState } from "../lib/analyse-utils";
import {
  ACTION_ORDER, ACTION_TONE, CONSEILS, ECO_BLANK, KEY_ECO, KEY_POIDS, POIDS_DEFAUT, POIDS_LABELS,
  ecoDemo, noter, type EcoData, type Poids,
} from "../lib/economie";
import { useZone } from "../lib/geo";
import { useZoneData, type UCol } from "../lib/zonedata";

const COLS: UCol<EcoData>[] = [
  { key: "population", label: "Population", type: "number", min: 0 },
  { key: "emplois", label: "Emplois", type: "number", min: 0 },
  { key: "filiere", label: "Filière principale", type: "text" },
  { key: "croissance", label: "Croissance (%/an)", type: "number", step: 0.1 },
  { key: "acces", label: "Accès au marché (%)", type: "number", min: 0, max: 100 },
  { key: "informel", label: "Emplois informels (%)", type: "number", min: 0, max: 100 },
  { key: "potentiel", label: "Potentiel (1 à 5)", type: "number", min: 1, max: 5 },
];

export default function EconomieDiagnostic() {
  const zone = useZone();
  const store = useZoneData<EcoData>(zone, KEY_ECO, COLS, ECO_BLANK, ecoDemo);
  const [poids, setPoids] = usePersistedState<Poids>(KEY_POIDS, POIDS_DEFAUT);
  const [vue, setVue] = useState<"priorites" | "donnees">("priorites");

  const rows = useMemo(
    () => zone.units.flatMap((u) => { const d = store.all[u.key]; return d && d.population > 0 ? [{ unit: u, d }] : []; }),
    [zone.units, store.all]);
  const notes = useMemo(() => noter(rows, poids), [rows, poids]);
  const values = useMemo(() => {
    const v: Record<string, MapVal> = {};
    notes.forEach((n) => { v[n.unit.key] = { v: n.score, text: `Priorité ${n.score}/100 · ${n.action}` }; });
    return v;
  }, [notes]);

  const pop = rows.reduce((s, r) => s + r.d.population, 0);
  const moy = (f: (d: EcoData) => number) => (pop ? rows.reduce((s, r) => s + f(r.d) * r.d.population, 0) / pop : 0);
  const acces = moy((d) => d.acces), informel = moy((d) => d.informel), croissance = moy((d) => d.croissance);
  const fiche = notes.find((n) => n.unit.key === zone.focus?.key) ?? notes[0];
  const groupes = ACTION_ORDER.filter((a) => notes.some((n) => n.action === a));

  return (
    <PageShell
      title="Économie : où agir en premier ?"
      intro="Choisissez une zone, renseignez quelques indicateurs par territoire, et l'outil classe les territoires et propose une action pour chacun."
      zone={zone}
      map={<ZoneMap zone={zone} values={values} scale={SCALES.bleu} legend="Priorité d'action (0 à 100)" low="faible" high="forte" />}
    >
      <Segmented label="Affichage" value={vue} onChange={setVue}
        items={[{ value: "priorites", label: "Priorités" }, { value: "donnees", label: `Données (${rows.length}/${zone.units.length})` }]} />

      {vue === "donnees" ? (
        <Section title="Données par territoire"
          hint="Une ligne par territoire. Cliquez sur un nom pour voir le niveau suivant. Sources possibles : INSTAT, Banque centrale (BFM), ministères, EDBM.">
          <DataTools zone={zone} store={store} cols={COLS} />
          <UnitTable zone={zone} store={store} cols={COLS} />
        </Section>
      ) : rows.length === 0 ? (
        <EmptyState title="Pas encore de données dans cette zone"
          actions={<>
            <button type="button" className="an-btn" onClick={() => setVue("donnees")}>Saisir ou importer</button>
            <button type="button" className="an-btn ghost" onClick={store.fillDemo} disabled={!zone.units.length}>Voir avec un exemple</button>
          </>}>
          Renseignez la population, l'accès au marché, l'informalité et le potentiel de chaque territoire pour obtenir un classement.
        </EmptyState>
      ) : (
        <>
          <div className="an-kpis">
            <Kpi label="Territoires renseignés" value={`${rows.length}/${zone.units.length}`} />
            <Kpi label="Population couverte" value={fmt(pop, 0)} />
            <Kpi label="Accès au marché" value={fmt(acces, 0)} unit="%" />
            <Kpi label="Emplois informels" value={fmt(informel, 0)} unit="%" />
          </div>

          {(acces < 50 || informel >= 70 || croissance < 3) && (
            <div className="an-grid">
              {acces < 50 && (
                <Advice tone="warn" title="Zone enclavée" tag={`${fmt(acces, 0)} %`}>
                  Moins de la moitié de la population est à moins de 2 h d'un marché ou d'une route praticable. Les routes et pistes rurales sont souvent le premier levier.
                </Advice>
              )}
              {informel >= 70 && (
                <Advice tone="warn" title="Économie très informelle" tag={`${fmt(informel, 0)} %`}>
                  La majorité des emplois échappent à l'impôt et à la protection sociale. Une formalisation progressive augmente les recettes sans freiner les petits opérateurs.
                </Advice>
              )}
              {croissance < 3 && (
                <Advice tone="warn" title="Croissance fragile" tag={`${fmt(croissance)} %/an`}>
                  Si la population croît de 2,5 à 3 % par an (à vérifier avec l'INSTAT), un rythme inférieur ne fait pas progresser le revenu par habitant.
                </Advice>
              )}
            </div>
          )}

          <Section title="Classement des priorités" hint="Cliquez sur une ligne pour la voir sur la carte et ouvrir sa fiche.">
            <RankList focusKey={zone.focus?.key}
              items={notes.map((n) => ({ key: n.unit.key, name: n.unit.name, value: n.score, badge: n.action, tone: ACTION_TONE[n.action], onPick: () => zone.select(n.unit) }))} />
            <details className="an-details">
              <summary>Ajuster l'importance des critères</summary>
              <div className="an-sliders">
                {(Object.keys(POIDS_LABELS) as (keyof Poids)[]).map((k) => (
                  <label key={k}>
                    {POIDS_LABELS[k]} : {poids[k]}
                    <input type="range" min={0} max={50} value={poids[k]} onChange={(e) => setPoids({ ...poids, [k]: Number(e.target.value) })} />
                  </label>
                ))}
              </div>
              <p className="an-note">Le score mélange l'opportunité (potentiel, croissance) et le besoin (enclavement, informalité, peu d'emplois). Modifiez les poids selon la stratégie nationale.</p>
            </details>
          </Section>

          {fiche && (
            <Section title={`Fiche : ${fiche.unit.name}`} hint={fiche.unit.key === zone.focus?.key ? "Territoire sélectionné." : "Territoire le mieux classé."}>
              <Facts items={[
                ["Filière principale", fiche.d.filiere || "n/d"],
                ["Population", fmt(fiche.d.population, 0)],
                ["Emplois pour 100 habitants", fmt(fiche.emploiTaux, 0)],
                ["Accès au marché", `${fmt(fiche.d.acces, 0)} %`],
                ["Emplois informels", `${fmt(fiche.d.informel, 0)} %`],
                ["Croissance", `${fmt(fiche.d.croissance)} %/an`],
              ]} />
              <Advice title={fiche.action} tag={`Priorité ${fiche.score}/100`} tone={ACTION_TONE[fiche.action]}>{CONSEILS[fiche.action]}</Advice>
            </Section>
          )}

          <Section title="Plan d'action pour la zone" hint="Les territoires sont regroupés par type d'action à mener.">
            <div className="an-grid">
              {groupes.map((a) => {
                const g = notes.filter((n) => n.action === a);
                return (
                  <Advice key={a} title={`${a} · ${g.length} territoire${g.length > 1 ? "s" : ""}`} tone={ACTION_TONE[a]}>
                    <strong>{g.slice(0, 6).map((n) => n.unit.name).join(", ")}{g.length > 6 ? "…" : ""}.</strong> {CONSEILS[a]}
                  </Advice>
                );
              })}
            </div>
            <p className="an-note">Aide à structurer la décision, sans la remplacer : confrontez le classement aux études de terrain.</p>
          </Section>
        </>
      )}
    </PageShell>
  );
}
