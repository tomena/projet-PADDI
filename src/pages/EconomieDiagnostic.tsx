import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Advice, Bars, Col, CsvTools, EditableTable, Kpi, PageShell, Section } from "../components/AnalyseKit";
import { fmt, num, uid, usePersistedState } from "../lib/analyse-utils";
import {
  CONSEILS, EXEMPLE, KEY_POIDS, MODELE_CSV, POIDS_DEFAUT, POIDS_LABELS,
  Poids, Secteur, noter, useSecteurs,
} from "../lib/economie";

export const TABS_ECONOMIE = [
  { to: "/dashboard/analyse-economie", label: "Diagnostic des secteurs" },
  { to: "/dashboard/analyse-economie/simulateur", label: "Simulateur d'investissement" },
];

const COLS: Col<Secteur>[] = [
  { key: "nom", label: "Secteur" },
  { key: "va", label: "Valeur ajoutée (Md Ar)", type: "number", min: 0 },
  { key: "emplois", label: "Emplois (milliers)", type: "number", min: 0 },
  { key: "croissance", label: "Croissance (%/an)", type: "number", step: 0.1 },
  { key: "exportation", label: "Export (% production)", type: "number", min: 0, max: 100 },
  { key: "informel", label: "Emplois informels (%)", type: "number", min: 0, max: 100 },
  { key: "potentiel", label: "Potentiel (1 à 5)", type: "number", min: 1, max: 5 },
];

export default function EconomieDiagnostic() {
  const [rows, setRows] = useSecteurs();
  const [poids, setPoids] = usePersistedState<Poids>(KEY_POIDS, POIDS_DEFAUT);
  const notes = useMemo(() => noter(rows, poids), [rows, poids]);

  const vaTot = rows.reduce((s, r) => s + r.va, 0);
  const empTot = rows.reduce((s, r) => s + r.emplois, 0);
  const croissance = vaTot ? rows.reduce((s, r) => s + r.va * r.croissance, 0) / vaTot : 0;
  const informel = empTot ? rows.reduce((s, r) => s + r.emplois * r.informel, 0) / empTot : 0;

  const importer = (csv: Record<string, string>[]) =>
    setRows(
      csv.map((r) => ({
        id: uid(),
        nom: r.nom || "Sans nom",
        va: num(r.va),
        emplois: num(r.emplois),
        croissance: num(r.croissance),
        exportation: num(r.exportation),
        informel: num(r.informel),
        potentiel: Math.min(5, Math.max(1, num(r.potentiel) || 3)),
      })),
    );

  return (
    <PageShell
      title="Économie : où investir pour développer le pays ?"
      intro="Entrez les chiffres de vos secteurs (ou importez un fichier CSV). L'outil classe les secteurs par priorité d'investissement et propose une action pour chacun."
      tabs={TABS_ECONOMIE}
    >
      <Section
        title="1. Vos données"
        hint="Sources possibles : INSTAT, Banque centrale (BFM), ministère de l'Économie et des Finances, Banque mondiale, EDBM. Les chiffres affichés au départ sont des exemples : remplacez-les."
      >
        <CsvTools template={MODELE_CSV} filename="modele-secteurs.csv" onRows={importer} onReset={() => setRows(EXEMPLE)} />
        <EditableTable
          cols={COLS}
          rows={rows}
          onChange={setRows}
          blank={() => ({ id: uid(), nom: "", va: 0, emplois: 0, croissance: 0, exportation: 0, informel: 0, potentiel: 3 })}
          addLabel="Ajouter un secteur"
        />
      </Section>

      {rows.length > 0 && (
        <>
          <div className="an-grid">
            <Kpi label="Valeur ajoutée totale" value={fmt(vaTot, 0)} unit="Md Ar" />
            <Kpi label="Emplois" value={fmt(empTot, 0)} unit="milliers" />
            <Kpi label="Croissance moyenne pondérée" value={fmt(croissance)} unit="%/an" />
            <Kpi label="Emplois informels" value={fmt(informel, 0)} unit="%" />
          </div>

          <Section title="2. Alertes pour le décideur">
            <div className="an-grid">
              {informel >= 70 && (
                <Advice tone="warn" title="Économie très informelle" tag={`${fmt(informel, 0)} %`}>
                  La majorité des emplois échappent à l'impôt et à la protection sociale. Une politique de formalisation progressive augmente les recettes de l'État sans freiner les petits opérateurs.
                </Advice>
              )}
              {croissance < 3 && (
                <Advice tone="warn" title="Croissance fragile" tag={`${fmt(croissance)} %/an`}>
                  Si la population croît à 2,5-3 % par an (à vérifier avec l'INSTAT), un rythme inférieur ne fait pas progresser le revenu par habitant. Il faut concentrer l'effort sur les secteurs qui accélèrent.
                </Advice>
              )}
              {informel < 70 && croissance >= 3 && (
                <Advice tone="good" title="Situation globalement saine" tag="OK">
                  Aucune alerte majeure avec ces données. Vérifiez la qualité des chiffres et affinez les secteurs.
                </Advice>
              )}
            </div>
          </Section>

          <Section
            title="3. Classement des priorités"
            hint="Le score (0 à 100) combine cinq critères. Modifiez leur importance selon la stratégie nationale."
          >
            <div className="an-sliders">
              {(Object.keys(POIDS_LABELS) as (keyof Poids)[]).map((k) => (
                <label key={k}>
                  {POIDS_LABELS[k]} : {poids[k]}
                  <input type="range" min={0} max={50} value={poids[k]} onChange={(e) => setPoids({ ...poids, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <br />
            <Bars items={notes.map((n) => ({ label: n.nom, value: n.score }))} />
          </Section>

          <Section title="4. Que faire, secteur par secteur ?">
            <div className="an-grid">
              {notes.map((n) => (
                <Advice key={n.id} title={n.nom} tag={`${n.action} · ${n.score}`} tone={n.action === "Accélérer" ? "good" : n.action === "Restructurer" ? "warn" : "info"}>
                  {CONSEILS[n.action]}
                </Advice>
              ))}
            </div>
            <p className="an-note">
              Cet outil aide à structurer la décision mais ne la remplace pas : confrontez le classement aux études de terrain.
            </p>
            <Link className="an-btn" to="/dashboard/analyse-economie/simulateur">Simuler un budget d'investissement</Link>
          </Section>
        </>
      )}
    </PageShell>
  );
}
