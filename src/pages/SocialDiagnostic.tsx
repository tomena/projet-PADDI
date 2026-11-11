import { useMemo, useState } from "react";
import { Advice, Bars, DataTools, EmptyState, Kpi, PageShell, RankList, Section, Segmented, UnitTable } from "../components/AnalyseKit";
import { SCALES, ZoneMap, type MapVal } from "../components/ZoneMap";
import { fmt } from "../lib/analyse-utils";
import { useZone } from "../lib/geo";
import { KEY_SOC, NIVEAUX, NIVEAU_TONE, SOC_BLANK, diagnostiquer, socDemo, type SocData } from "../lib/social";
import { useZoneData, type UCol } from "../lib/zonedata";

const COLS: UCol<SocData>[] = [
  { key: "population", label: "Population", type: "number", min: 0 },
  { key: "scolarisation", label: "Scolarisation primaire (%)", type: "number", min: 0, max: 100 },
  { key: "eau", label: "Accès eau potable (%)", type: "number", min: 0, max: 100 },
  { key: "sante", label: "À moins de 5 km d'un centre de santé (%)", type: "number", min: 0, max: 100 },
  { key: "electricite", label: "Accès électricité (%)", type: "number", min: 0, max: 100 },
  { key: "pauvrete", label: "Pauvreté (%)", type: "number", min: 0, max: 100 },
];

export default function SocialDiagnostic() {
  const zone = useZone();
  const store = useZoneData<SocData>(zone, KEY_SOC, COLS, SOC_BLANK, socDemo);
  const [vue, setVue] = useState<"priorites" | "donnees">("priorites");

  const notes = useMemo(
    () => diagnostiquer(zone.units.flatMap((u) => { const d = store.all[u.key]; return d && d.population > 0 ? [{ unit: u, d }] : []; })),
    [zone.units, store.all]);
  const values = useMemo(() => {
    const v: Record<string, MapVal> = {};
    notes.forEach((n) => { v[n.unit.key] = { v: n.indice, text: `Précarité ${n.indice}/100 · ${n.niveau}` }; });
    return v;
  }, [notes]);

  const pop = notes.reduce((s, n) => s + n.d.population, 0);
  const critiques = notes.filter((n) => n.niveau === "Critique");
  const popCritique = critiques.reduce((s, n) => s + n.d.population, 0);
  const fiche = notes.find((n) => n.unit.key === zone.focus?.key) ?? notes[0];

  return (
    <PageShell
      title="Société : quels territoires sont les plus en retard ?"
      intro="Choisissez une zone et renseignez les services de base par territoire. L'outil calcule un indice de précarité, désigne le manque principal et propose des réponses."
      zone={zone}
      map={<ZoneMap zone={zone} values={values} scale={SCALES.rouge} legend="Indice de précarité (0 à 100)" low="faible" high="forte" />}
    >
      <Segmented label="Affichage" value={vue} onChange={setVue}
        items={[{ value: "priorites", label: "Priorités" }, { value: "donnees", label: `Données (${notes.length}/${zone.units.length})` }]} />

      {vue === "donnees" ? (
        <Section title="Données par territoire"
          hint="Une ligne par territoire. Cliquez sur un nom pour voir le niveau suivant. Sources possibles : INSTAT (RGPH, EPM), enquêtes EDS et MICS, SIGE, ministères de la Santé et de l'Éducation, JIRAMA.">
          <DataTools zone={zone} store={store} cols={COLS} />
          <UnitTable zone={zone} store={store} cols={COLS} />
        </Section>
      ) : notes.length === 0 ? (
        <EmptyState title="Pas encore de données dans cette zone"
          actions={<>
            <button type="button" className="an-btn" onClick={() => setVue("donnees")}>Saisir ou importer</button>
            <button type="button" className="an-btn ghost" onClick={store.fillDemo} disabled={!zone.units.length}>Voir avec un exemple</button>
          </>}>
          Renseignez la population et l'accès à l'école, à l'eau, à la santé et à l'électricité pour obtenir un classement.
        </EmptyState>
      ) : (
        <>
          <div className="an-kpis">
            <Kpi label="Territoires renseignés" value={`${notes.length}/${zone.units.length}`} />
            <Kpi label="Territoires critiques" value={String(critiques.length)} />
            <Kpi label="Habitants en zone critique" value={pop ? fmt((popCritique / pop) * 100, 0) : "0"} unit="%" />
          </div>

          <Section title="Classement par précarité" hint="Indice de 0 (aucun manque) à 100 (tous les services absents). Critique à partir de 60, prioritaire à partir de 40.">
            <RankList focusKey={zone.focus?.key}
              items={notes.map((n) => ({ key: n.unit.key, name: n.unit.name, value: n.indice, badge: n.niveau, tone: NIVEAU_TONE[n.niveau], onPick: () => zone.select(n.unit) }))} />
          </Section>

          {fiche && (
            <Section title={`Fiche : ${fiche.unit.name}`} hint={fiche.unit.key === zone.focus?.key ? "Territoire sélectionné. Part de la population non couverte, par service." : "Territoire le plus précaire. Part de la population non couverte, par service."}>
              <Bars max={100} unit=" %" items={fiche.manques.map((m) => ({ label: m.label, value: m.ecart }))} />
              <div className="an-grid" style={{ marginTop: ".8rem" }}>
                {fiche.manques.slice(0, 2).map((m) => (
                  <Advice key={m.key} title={`${m.label} : ${fmt(m.ecart, 0)} % de la population concernée`}
                    tag={`≈ ${fmt((fiche.d.population * m.ecart) / 100, 0)} pers.`} tone={fiche.niveau === "Critique" ? "warn" : "info"}>
                    {m.conseil}
                  </Advice>
                ))}
              </div>
            </Section>
          )}

          <Section title="Plan d'action pour la zone" hint="Le manque le plus fréquent dans chaque groupe de territoires.">
            <div className="an-grid">
              {NIVEAUX.filter((nv) => nv !== "À surveiller").map((nv) => {
                const g = notes.filter((n) => n.niveau === nv);
                if (!g.length) return null;
                const compte = new Map<string, number>();
                g.forEach((n) => compte.set(n.manques[0].key, (compte.get(n.manques[0].key) ?? 0) + 1));
                const [cle, nb] = [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
                const m = g.find((n) => n.manques[0].key === cle)!.manques[0];
                return (
                  <Advice key={nv} title={`${nv} · ${g.length} territoire${g.length > 1 ? "s" : ""}`} tone={NIVEAU_TONE[nv]}>
                    <strong>{g.slice(0, 6).map((n) => n.unit.name).join(", ")}{g.length > 6 ? "…" : ""}.</strong> Manque principal : {m.label.toLowerCase()} ({nb} territoire{nb > 1 ? "s" : ""}). {m.conseil}
                  </Advice>
                );
              })}
            </div>
            <p className="an-note">Aide à structurer la décision, sans la remplacer : vérifiez les chiffres avec les directions régionales.</p>
          </Section>
        </>
      )}
    </PageShell>
  );
}
