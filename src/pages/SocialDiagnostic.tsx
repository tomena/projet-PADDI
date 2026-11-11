import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Advice, Bars, Col, CsvTools, EditableTable, Kpi, PageShell, Section } from "../components/AnalyseKit";
import { fmt, num, uid } from "../lib/analyse-utils";
import { EXEMPLE, MODELE_CSV, Territoire, diagnostiquer, useTerritoires } from "../lib/social";

export const TABS_SOCIAL = [
  { to: "/dashboard/analyse-social", label: "Diagnostic des territoires" },
  { to: "/dashboard/analyse-social/priorites", label: "Planificateur de priorités" },
];

const COLS: Col<Territoire>[] = [
  { key: "nom", label: "Commune / district" },
  { key: "population", label: "Population", type: "number", min: 0 },
  { key: "scolarisation", label: "Scolarisation primaire (%)", type: "number", min: 0, max: 100 },
  { key: "eau", label: "Accès eau potable (%)", type: "number", min: 0, max: 100 },
  { key: "sante", label: "À < 5 km d'un centre de santé (%)", type: "number", min: 0, max: 100 },
  { key: "electricite", label: "Accès électricité (%)", type: "number", min: 0, max: 100 },
  { key: "pauvrete", label: "Pauvreté (%)", type: "number", min: 0, max: 100 },
];

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export default function SocialDiagnostic() {
  const [rows, setRows] = useTerritoires();
  const notes = useMemo(() => diagnostiquer(rows), [rows]);
  const pop = rows.reduce((s, r) => s + r.population, 0);
  const critiques = notes.filter((n) => n.niveau === "Critique");
  const popCritique = critiques.reduce((s, n) => s + n.population, 0);

  const importer = (csv: Record<string, string>[]) =>
    setRows(
      csv.map((r) => ({
        id: uid(),
        nom: r.nom || "Sans nom",
        population: num(r.population),
        scolarisation: clamp(num(r.scolarisation)),
        eau: clamp(num(r.eau)),
        sante: clamp(num(r.sante)),
        electricite: clamp(num(r.electricite)),
        pauvrete: clamp(num(r.pauvrete)),
      })),
    );

  return (
    <PageShell
      title="Société : quels territoires sont les plus en retard ?"
      intro="Entrez les indicateurs de chaque commune ou district. L'outil calcule un indice de précarité, désigne le manque principal de chaque territoire et propose des réponses."
      tabs={TABS_SOCIAL}
    >
      <Section
        title="1. Vos données"
        hint="Sources possibles : INSTAT (recensement RGPH, enquête EPM), enquêtes EDS/DHS et MICS, SIGE du ministère de l'Éducation, ministère de la Santé, JIRAMA / Agence de l'électrification rurale. Les lignes d'exemple sont fictives : remplacez-les."
      >
        <CsvTools template={MODELE_CSV} filename="modele-territoires.csv" onRows={importer} onReset={() => setRows(EXEMPLE)} />
        <EditableTable
          cols={COLS}
          rows={rows}
          onChange={setRows}
          blank={() => ({ id: uid(), nom: "", population: 0, scolarisation: 0, eau: 0, sante: 0, electricite: 0, pauvrete: 0 })}
          addLabel="Ajouter un territoire"
        />
      </Section>

      {rows.length > 0 && (
        <>
          <div className="an-grid">
            <Kpi label="Population couverte" value={fmt(pop, 0)} />
            <Kpi label="Territoires critiques" value={String(critiques.length)} unit={`sur ${rows.length}`} />
            <Kpi label="Habitants en zone critique" value={pop ? fmt((popCritique / pop) * 100, 0) : "0"} unit="%" />
          </div>

          <Section title="2. Classement par précarité" hint="Indice de 0 (aucun manque) à 100 (tous les services absents). Critique à partir de 60, prioritaire à partir de 40.">
            <Bars items={notes.map((n) => ({ label: n.nom, value: n.indice }))} />
          </Section>

          <Section title="3. Que faire dans chaque territoire ?">
            <div className="an-grid">
              {notes.map((n) => (
                <Advice key={n.id} title={n.nom} tag={`${n.niveau} · ${n.indice}`} tone={n.niveau === "Critique" ? "warn" : n.niveau === "Prioritaire" ? "info" : "good"}>
                  Manque principal : <strong>{n.manques[0].label}</strong> ({fmt(n.manques[0].ecart, 0)} % de la population non couverte
                  {n.manques[1] ? `, puis ${n.manques[1].label.toLowerCase()} : ${fmt(n.manques[1].ecart, 0)} %` : ""}). {n.manques[0].conseil}
                </Advice>
              ))}
            </div>
            <br />
            <Link className="an-btn" to="/dashboard/analyse-social/priorites">Planifier un budget social</Link>
          </Section>
        </>
      )}
    </PageShell>
  );
}
