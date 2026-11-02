import * as XLSX from "xlsx";

/* src/utils/parseDecaissementExcel.ts
 * Lit le fichier « Pour_la_visualisation_Coûts.xlsx » :
 *   - niveau « instrument »  -> onglet « CL-Dépenses » (colonnes G, H, I, J, K, N, O, P + TOTAL + budgets de la ligne 5)
 *   - niveau « composante »  -> onglet « Pour Céline » (colonnes C à G = Output 0 à 4)
 * Les colonnes sont repérées par leur TITRE, jamais par leur lettre : un ajout de colonne ne casse pas l'import.
 * Les montants mensuels sont repris tels quels (négatifs possibles : corrections comptables). */

export type Niveau = "instrument" | "composante";

export interface LigneDecaissement {
  annee: number;
  mois: string;
  valeurs: Record<string, number>; // uniquement les cellules renseignées
}

export interface ResultatDecaissement {
  niveau: Niveau;
  lignes: LigneDecaissement[];
  budgets?: Record<string, number>; // niveau « instrument » seulement
  avertissements: string[];         // contrôles non bloquants
}

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/* Comparaison tolérante : sans accents ni majuscules, ni espaces, ni _ - . */
const compact = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9()+]/g, "");

const MOIS_COMPACT = new Map(MOIS.map((m) => [compact(m), m]));

/* Titre de colonne (compacté) -> nom dans la base. Plusieurs écritures acceptées. */
const INSTRUMENTS: { nom: string; titres: string[] }[] = [
  { nom: "Experts", titres: ["experts"] },
  { nom: "Frais de mission", titres: ["fraisdemission"] },
  { nom: "Contrats", titres: ["contrats"] },
  { nom: "Achats par le projet", titres: ["achatsparleprojet"] },
  { nom: "Construction (LP 005)", titres: ["constructions(lp005)", "construction(lp005)"] },
  { nom: "Financements", titres: ["financements"] },
  { nom: "Charges de fonctionnement et divers", titres: ["chargesdefonctionnementetdivers", "chargesdefonctionnementsetdivers"] },
  { nom: "Frais généraux + TVA GER", titres: ["fraisgeneraux+tvager(vgk)", "fraisgeneraux+tvager"] },
];

function versNombre(v: unknown, ligne: number, colonne: string): number | null {
  if (v === null || v === undefined || v === "") return null; // vide = ne pas modifier
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`Ligne ${ligne} : valeur invalide dans « ${colonne} ».`);
    return v;
  }
  const x = Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(x)) throw new Error(`Ligne ${ligne} : « ${v} » n'est pas un nombre (colonne « ${colonne} »).`);
  return x;
}

/* Lit les lignes de données (Année entière + mois valide). Les autres lignes (budget, total, vides) sont ignorées. */
function lireLignes(
  tableau: unknown[][],
  idxEntete: number,
  colAnnee: number,
  colMois: number,
  colonnes: { index: number; nom: string }[]
): LigneDecaissement[] {
  const resultat: LigneDecaissement[] = [];
  const vues = new Set<string>();

  for (let i = idxEntete + 1; i < tableau.length; i++) {
    const l = tableau[i];
    const annee = Number(l[colAnnee]);
    const mois = MOIS_COMPACT.get(compact(l[colMois]));
    if (!Number.isInteger(annee) || annee < 2000 || annee > 2100 || !mois) continue;

    const valeurs: Record<string, number> = {};
    for (const { index, nom } of colonnes) {
      const v = versNombre(l[index], i + 1, nom);
      if (v !== null) valeurs[nom] = v;
    }
    if (Object.keys(valeurs).length === 0) continue; // mois sans aucune valeur : rien à importer

    const cle = `${annee}|${mois}`;
    if (vues.has(cle)) throw new Error(`Ligne ${i + 1} : ${mois} ${annee} apparaît plusieurs fois.`);
    vues.add(cle);
    resultat.push({ annee, mois, valeurs });
  }
  return resultat;
}

/* ============ Niveau « instrument » : onglet CL-Dépenses ============ */
export function lignesInstruments(tableau: unknown[][]): ResultatDecaissement {
  const idxEntete = tableau.findIndex((l) => {
    const c = l.map(compact);
    return c.includes("annee") && c.includes("mois") && c.includes("experts");
  });
  if (idxEntete < 0) {
    throw new Error("Onglet « CL-Dépenses » non reconnu : la ligne de titres (Année, Mois, EXPERTS, ...) est introuvable.");
  }
  const entetes = tableau[idxEntete].map(compact);
  const colAnnee = entetes.indexOf("annee");
  const colMois = entetes.indexOf("mois");

  const colonnes: { index: number; nom: string }[] = [];
  for (const instr of INSTRUMENTS) {
    const index = entetes.findIndex((h) => instr.titres.includes(h));
    if (index < 0) throw new Error(`Colonne « ${instr.nom} » introuvable dans « CL-Dépenses ».`);
    colonnes.push({ index, nom: instr.nom });
  }
  const colTotal = entetes.indexOf("total");
  if (colTotal < 0) throw new Error("Colonne « TOTAL » introuvable dans « CL-Dépenses ».");
  colonnes.push({ index: colTotal, nom: "Total" });

  // Budget alloué : ligne dont la colonne « Mois » contient « BUDGET » (ligne 5)
  const budgets: Record<string, number> = {};
  const ligneBudget = tableau.slice(idxEntete + 1).find((l) => compact(l[colMois]) === "budget");
  if (ligneBudget) {
    for (const { index, nom } of colonnes) {
      const v = versNombre(ligneBudget[index], 0, nom);
      if (v !== null) budgets[nom] = v;
    }
  }

  const lignes = lireLignes(tableau, idxEntete, colAnnee, colMois, colonnes);
  if (lignes.length === 0) throw new Error("Aucune ligne de dépenses trouvée dans « CL-Dépenses ».");

  // Contrôle non bloquant : somme des 8 instruments = TOTAL
  const avertissements: string[] = [];
  for (const l of lignes) {
    const v = l.valeurs;
    if (v["Total"] === undefined || INSTRUMENTS.some((i) => v[i.nom] === undefined)) continue;
    const somme = INSTRUMENTS.reduce((s, i) => s + v[i.nom], 0);
    if (Math.abs(somme - v["Total"]) > 1) {
      avertissements.push(`${l.mois} ${l.annee} : la somme des instruments (${Math.round(somme)}) diffère du TOTAL (${Math.round(v["Total"])}).`);
    }
  }
  if (Object.keys(budgets).length === 0) avertissements.push("Ligne « BUDGET » introuvable : les budgets alloués ne seront pas mis à jour.");

  return { niveau: "instrument", lignes, budgets: Object.keys(budgets).length ? budgets : undefined, avertissements };
}

/* ============ Niveau « composante » : onglet Pour Céline ============ */
export function lignesOutputs(tableau: unknown[][]): ResultatDecaissement {
  const idxEntete = tableau.findIndex((l) => {
    const c = l.map(compact);
    return c.includes("annee") && c.includes("mois") && c.includes("budgetdecaissesuroutput0");
  });
  if (idxEntete < 0) {
    throw new Error("Onglet « Pour Céline » non reconnu : la ligne de titres (Année, Mois, Budget décaissé sur Output 0, ...) est introuvable.");
  }
  const entetes = tableau[idxEntete].map(compact);
  const colAnnee = entetes.indexOf("annee");
  const colMois = entetes.indexOf("mois");

  // Premier jeu de colonnes « Output N » (C à G) : le second jeu (X à AB) est un tableau à part.
  const colonnes: { index: number; nom: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const index = entetes.indexOf(`budgetdecaissesuroutput${i}`);
    if (index < 0) throw new Error(`Colonne « Budget décaissé sur Output ${i} » introuvable dans « Pour Céline ».`);
    colonnes.push({ index, nom: `Output ${i}` });
  }

  const lignes = lireLignes(tableau, idxEntete, colAnnee, colMois, colonnes);
  if (lignes.length === 0) throw new Error("Aucune ligne de données trouvée dans « Pour Céline ».");
  return { niveau: "composante", lignes, avertissements: [] };
}

/* ============ Lecture du fichier ============ */
export async function analyserFichierDecaissement(fichier: File, niveau: Niveau): Promise<ResultatDecaissement> {
  const buffer = await fichier.arrayBuffer();
  const classeur = XLSX.read(buffer, { type: "array", cellDates: false });

  const nomFeuille = classeur.SheetNames.find((s: string) =>
    niveau === "instrument" ? compact(s).startsWith("cldepense") : compact(s) === "pourceline"
  );
  if (!nomFeuille) {
    throw new Error(
      niveau === "instrument"
        ? "L'onglet « CL-Dépenses » est introuvable dans ce fichier."
        : "L'onglet « Pour Céline » est introuvable dans ce fichier."
    );
  }
  const feuille = classeur.Sheets[nomFeuille];

  // Les cellules en erreur Excel (#VALUE!, ...) sont lues comme vides.
  const plage = XLSX.utils.decode_range(feuille["!ref"] || "A1:A1");
  const tableau: unknown[][] = [];
  for (let r = plage.s.r; r <= plage.e.r; r++) {
    const ligne: unknown[] = [];
    for (let c = plage.s.c; c <= plage.e.c; c++) {
      const cell = feuille[XLSX.utils.encode_cell({ r, c })];
      ligne.push(!cell || cell.t === "e" ? null : cell.v);
    }
    tableau.push(ligne);
  }
  return niveau === "instrument" ? lignesInstruments(tableau) : lignesOutputs(tableau);
}
