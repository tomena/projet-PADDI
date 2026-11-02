/* src/utils/decaissement.ts
 * Calculs de la partie « programme » de la page Suivi des coûts, à partir de Base_Decaissement.geojson.
 *
 * La base contient des montants MENSUELS (une ligne = une Année + un Mois), exactement comme l'Excel
 * (onglet « CL-Dépenses » pour les instruments, onglet « Pour Céline » pour les Output).
 * Tout est cumulé ici, jusqu'à l'année et au mois choisis. Rien ne dépend du filtre UC. */

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

export interface BaseDecaissement {
  features: { properties: Record<string, any> }[];
  budgets?: Record<string, number>; // budget alloué par instrument (ligne 5 de « CL-Dépenses ») + « Total »
}

export interface ResultatDecaissement {
  cumulTotal: number; // somme du TOTAL de toutes les années précédentes + de l'année choisie
  taux: number;       // cumulTotal / 34 500 000, en %
  parAnnee: { annee: number; valeur: number; pct: number }[]; // une barre par année, % du budget total
  instruments: { cle: Instrument; montant: number; budget: number; pct: number }[]; // pct = montant / budget alloué
  totalInstruments: number;
  outputs: { cle: string; montant: number; pct: number }[];   // pct = montant / budget total
  totalOutputs: number;
}

const n = (v: any): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const rang = (annee: number, mois: string) => annee * 12 + MOIS.indexOf(mois);

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

  const outputs = OUTPUTS.map((cle) => {
    const montant = somme(cle);
    return { cle, montant, pct: budgetTotal > 0 ? (montant / budgetTotal) * 100 : 0 };
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
