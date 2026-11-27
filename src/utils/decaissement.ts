/* src/utils/decaissement.ts
 * Calculs de la partie « programme » de la page Suivi des coûts, à partir de Base_Decaissement.geojson.
 *
 * Deux sources, deux formes :
 *  - Instruments : montants MENSUELS dans features (onglet « CL-Dépenses »). Cumulés jusqu'à la date choisie.
 *  - Composantes (Output) : CUMULS PAR SEMESTRE dans composantes_semestre (onglet « CL-Outputs »).
 *    Pour une date donnée : cumul du dernier semestre clos ≤ date, plus les montants mensuels Output
 *    postérieurs à ce semestre et ≤ date (ces mois existent dans features tant qu'ils ne sont pas couverts
 *    par un semestre). Sans aucun semestre, on retombe sur la somme mensuelle depuis le début.
 *
 * Rien ne dépend du filtre UC. */

export const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const BUDGET_TOTAL = 34_500_000;
export const ANNEES_GRAPHIQUE = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

/* Les 8 instruments, dans l'ordre d'affichage (colonnes G, H, I, J, K, N, O, P de « CL-Dépenses »). */
export const INSTRUMENTS = [
  "Experts",
  "Frais de mission",
  "Contrats",
  "Achats par le projet",
  "Construction (LP 005)",
  "Financements",
  "Charges de fonctionnement et divers",
  "Frais généraux + TVA GER",
] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const OUTPUTS = ["Output 0", "Output 1", "Output 2", "Output 3", "Output 4"] as const;
export type Output = (typeof OUTPUTS)[number];

/* Cumul d'un Output à une date de situation (onglet « CL-Outputs », colonnes « COÛTS mm/aaaa »). */
export interface CumulComposante {
  periode: string;                  // « 06/2026 »
  annee: number;
  semestre: "S1" | "S2";
  cumul: Partial<Record<Output, number>>;
}

export interface BaseDecaissement {
  features: { properties: Record<string, any> }[];
  budgets?: Record<string, number>;               // budget alloué par instrument + « Total »
  budgets_composantes?: Partial<Record<Output, number>>; // budget alloué par Output (colonne BUDGET de « CL-Outputs »)
  composantes_semestre?: CumulComposante[];
}

export interface ResultatDecaissement {
  cumulTotal: number;  // somme du TOTAL de toutes les années précédentes + de l'année choisie
  taux: number;        // cumulTotal / budgetTotal, en %
  parAnnee: { annee: number; valeur: number; pct: number }[]; // une barre par année, % du budget total
  instruments: { cle: Instrument; montant: number; budget: number; pct: number }[]; // pct = montant / budget alloué
  totalInstruments: number;
  outputs: { cle: Output; montant: number; budget: number; pct: number }[];         // pct = montant / budget de l'Output
  totalOutputs: number;
}

const n = (v: any): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/* Rang d'un mois : annee * 12 + index du mois (0 à 11) */
const rang = (annee: number, mois: string) => annee * 12 + MOIS.indexOf(mois);

/* Rang d'une période « mm/aaaa » : le semestre est repéré par son dernier mois (juin ou décembre). */
const rangPeriode = (periode: string) => {
  const [mm, aaaa] = periode.split("/").map(Number);
  return aaaa * 12 + (mm - 1);
};

/* Montant cumulé d'un Output jusqu'à la limite (rang du mois choisi, inclus). */
function cumulOutputs(base: BaseDecaissement | null, limite: number): Record<Output, number> {
  const features = (base?.features ?? []).map((f) => f.properties);

  // Dernier semestre clos ≤ limite
  const semestres = (base?.composantes_semestre ?? [])
    .filter((s) => rangPeriode(s.periode) <= limite)
    .sort((a, b) => rangPeriode(b.periode) - rangPeriode(a.periode));
  const dernier = semestres[0];
  const depart = dernier ? rangPeriode(dernier.periode) : -Infinity;

  const resultat = {} as Record<Output, number>;
  for (const o of OUTPUTS) {
    const cumulSemestre = dernier ? n(dernier.cumul[o]) : 0;
    const mensuelApres = features
      .filter((p) => {
        const r = rang(Number(p["Année"]), p.Mois);
        return r > depart && r <= limite;
      })
      .reduce((s, p) => s + n(p[o]), 0);
    resultat[o] = cumulSemestre + mensuelApres;
  }
  return resultat;
}

/* annee + mois : « Tous » = janvier à décembre de l'année choisie. */
export function calculerDecaissement(
  base: BaseDecaissement | null,
  annee: number,
  mois: string,
  budgetTotal: number = BUDGET_TOTAL
): ResultatDecaissement {
  const indexMois = MOIS.indexOf(mois);
  const limite = annee * 12 + (indexMois >= 0 ? indexMois : 11);

  const lignes = (base?.features ?? [])
    .map((f) => f.properties)
    .filter((p) => rang(Number(p["Année"]), p.Mois) <= limite);

  const somme = (cle: string, filtre?: (p: Record<string, any>) => boolean) =>
    lignes.filter((p) => (filtre ? filtre(p) : true)).reduce((s, p) => s + n(p[cle]), 0);

  const cumulTotal = somme("Total");

  const instruments = INSTRUMENTS.map((cle) => {
    const montant = somme(cle);
    const budget = n(base?.budgets?.[cle]);
    return { cle, montant, budget, pct: budget > 0 ? (montant / budget) * 100 : 0 };
  });

  const cumulComposantes = cumulOutputs(base, limite);
  const outputs = OUTPUTS.map((cle) => {
    const montant = cumulComposantes[cle];
    const budget = n(base?.budgets_composantes?.[cle]);
    return { cle, montant, budget, pct: budget > 0 ? (montant / budget) * 100 : 0 };
  });

  const parAnnee = ANNEES_GRAPHIQUE.map((a) => {
    const valeur = somme("Total", (p) => Number(p["Année"]) === a);
    return { annee: a, valeur, pct: budgetTotal > 0 ? (valeur / budgetTotal) * 100 : 0 };
  });

  return {
    cumulTotal,
    taux: budgetTotal > 0 ? (cumulTotal / budgetTotal) * 100 : 0,
    parAnnee,
    instruments,
    totalInstruments: instruments.reduce((s, i) => s + i.montant, 0),
    outputs,
    totalOutputs: outputs.reduce((s, o) => s + o.montant, 0),
  };
}
