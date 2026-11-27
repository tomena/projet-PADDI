import * as XLSX from "xlsx";

/* src/utils/parseDecaissementExcel.ts
 * Lit le fichier « Pour_la_visualisation_Coûts.xlsx » :
 *   - niveau « instrument » -> onglet « CL-Dépenses » : montants MENSUELS
 *       (colonnes des 8 instruments + TOTAL) et budgets alloués (ligne « BUDGET »).
 *   - niveau « composante » -> onglet « CL-Outputs » : CUMULS PAR SEMESTRE
 *       (colonnes « COÛTS mm/aaaa ») pour Output 0 à 4, et budgets par Output (colonne BUDGET).
 *       Les périodes à 0 ou vides (non encore clôturées) sont ignorées pour ne pas écraser la base.
 * Les colonnes sont repérées par leur TITRE, jamais par leur lettre. Les montants négatifs sont conservés. */

export type Niveau = "instrument" | "composante";

/* Dates de situation proposées dans le pop-up pour le niveau « composante » (colonnes COÛTS de CL-Outputs). */
export const PERIODES_COMPOSANTES = ["06/2025", "06/2026", "12/2026", "06/2027"] as const;

export interface LigneInstrument {
  annee: number;
  mois: string;
  valeurs: Record<string, number>; // uniquement les cellules renseignées
}

export interface LigneComposante {
  periode: string; // « 06/2026 », etc.
  valeurs: Record<string, number>; // cumuls « Output 0 » à « Output 4 » (pas de Total : calculé par le serveur)
}

export type ResultatDecaissement =
  | {
      niveau: "instrument";
      lignes: LigneInstrument[];
      budgets?: Record<string, number>;
      avertissements: string[]; // contrôles non bloquants
    }
  | {
      niveau: "composante";
      lignes: LigneComposante[];
      budgets?: Record<string, number>; // « Output 0 » à « Output 4 »
      avertissements: string[];
    };

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/* Sans accents, en majuscules conservées : pour les libellés affichés (ex. « COÛTS 06/2025 ») */
const sansAccents = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/* Comparaison tolérante : sans accents ni majuscules, ni espaces, ni _ - . */
const compact = (s: unknown) => sansAccents(s).toLowerCase().replace(/[^a-z0-9()+]/g, "");

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

/* ============ Niveau « instrument » : onglet CL-Dépenses (mensuel) ============ */

/* Lit les lignes de données mensuelles (Année entière + mois valide). Les autres lignes (budget, total, vides) sont ignorées. */
function lireLignesMensuelles(
  tableau: unknown[][],
  idxEntete: number,
  colAnnee: number,
  colMois: number,
  colonnes: { index: number; nom: string }[]
): LigneInstrument[] {
  const resultat: LigneInstrument[] = [];
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

  const lignes = lireLignesMensuelles(tableau, idxEntete, colAnnee, colMois, colonnes);
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

  return {
    niveau: "instrument",
    lignes,
    budgets: Object.keys(budgets).length ? budgets : undefined,
    avertissements,
  };
}

/* ============ Niveau « composante » : onglet CL-Outputs (cumuls par semestre) ============ */

export function lignesOutputs(tableau: unknown[][]): ResultatDecaissement {
  const avertissements: string[] = [];

  // En-tête : la ligne qui contient « INSTRUMENTS » en première colonne
  const idxEntete = tableau.findIndex((l) => compact(l[0]) === "instruments");
  if (idxEntete < 0) {
    throw new Error("Onglet « CL-Outputs » non reconnu : la ligne d'en-tête « INSTRUMENTS » est introuvable.");
  }
  const entetes = tableau[idxEntete];

  // Colonnes « COÛTS mm/aaaa » -> période. « COÛTS XX » ne correspond à aucune période et est ignorée.
  const colPeriode = new Map<number, string>();
  entetes.forEach((h, index) => {
    const m = sansAccents(h).trim().match(/^COUTS\s+(\d{2}\/\d{4})$/i);
    if (m) colPeriode.set(index, m[1]);
  });
  for (const p of PERIODES_COMPOSANTES) {
    if (![...colPeriode.values()].includes(p)) {
      throw new Error(`Colonne « COÛTS ${p} » introuvable dans « CL-Outputs ».`);
    }
  }

  // Colonne BUDGET
  const colBudget = entetes.findIndex((h) => compact(h) === "budget");
  if (colBudget < 0) avertissements.push("Colonne « BUDGET » introuvable : les budgets par Output ne seront pas mis à jour.");

  // Lignes « OUTPUT n » (la ligne « OUTPUT 0-4 » sert seulement de contrôle)
  const lignesOutput = new Map<number, number>(); // n -> index de ligne
  let ligneTotal: number | null = null;
  for (let i = idxEntete + 1; i < tableau.length; i++) {
    const label = sansAccents(tableau[i][0]).trim().toUpperCase().replace(/\s+/g, " ");
    const mo = label.match(/^OUTPUT (\d)$/);
    if (mo) {
      const n = Number(mo[1]);
      if (lignesOutput.has(n)) throw new Error(`« OUTPUT ${n} » apparaît plusieurs fois dans « CL-Outputs ».`);
      lignesOutput.set(n, i);
    } else if (label === "OUTPUT 0-4") {
      ligneTotal = i;
    }
  }
  for (let n = 0; n < 5; n++) {
    if (!lignesOutput.has(n)) throw new Error(`« CL-Outputs » : la ligne « OUTPUT ${n} » est introuvable.`);
  }

  // Cumuls par période
  const lignes: LigneComposante[] = [];
  for (const periode of PERIODES_COMPOSANTES) {
    const col = [...colPeriode.entries()].find(([, p]) => p === periode)![0];

    const valeurs: Record<string, number> = {};
    for (let n = 0; n < 5; n++) {
      const r = lignesOutput.get(n)!;
      const v = versNombre(tableau[r][col], r + 1, `OUTPUT ${n} — ${periode}`);
      if (v !== null) valeurs[`Output ${n}`] = v;
    }

    // Période non clôturée (cellules vides ou toutes à 0) : on ne touche pas à la base
    const montants = Object.values(valeurs);
    if (montants.length === 0 || montants.every((v) => v === 0)) {
      avertissements.push(`${periode} ignorée : aucune valeur (cellules vides ou à 0, période non clôturée).`);
      continue;
    }

    // Contrôle non bloquant : somme des 5 Outputs = ligne « OUTPUT 0-4 »
    if (ligneTotal !== null && Object.keys(valeurs).length === 5) {
      const total = versNombre(tableau[ligneTotal][col], ligneTotal + 1, `OUTPUT 0-4 — ${periode}`);
      const somme = montants.reduce((s, v) => s + v, 0);
      if (total !== null && Math.abs(somme - total) > 1) {
        avertissements.push(`${periode} : la somme des Outputs (${Math.round(somme)}) diffère de « OUTPUT 0-4 » (${Math.round(total)}).`);
      }
    }

    lignes.push({ periode, valeurs });
  }

  // Budgets par Output (colonne BUDGET)
  const budgets: Record<string, number> = {};
  if (colBudget >= 0) {
    for (let n = 0; n < 5; n++) {
      const r = lignesOutput.get(n)!;
      const v = versNombre(tableau[r][colBudget], r + 1, `Budget OUTPUT ${n}`);
      if (v !== null) budgets[`Output ${n}`] = v;
    }
  }

  if (lignes.length === 0) throw new Error("Aucune valeur de composante trouvée dans « CL-Outputs ».");

  return {
    niveau: "composante",
    lignes,
    budgets: Object.keys(budgets).length ? budgets : undefined,
    avertissements,
  };
}

/* ============ Lecture du fichier ============ */
export async function analyserFichierDecaissement(fichier: File, niveau: Niveau): Promise<ResultatDecaissement> {
  const buffer = await fichier.arrayBuffer();
  const classeur = XLSX.read(buffer, { type: "array", cellDates: false });

  const nomFeuille = classeur.SheetNames.find((s: string) =>
    niveau === "instrument" ? compact(s).startsWith("cldepense") : compact(s) === "cloutputs"
  );
  if (!nomFeuille) {
    throw new Error(
      niveau === "instrument"
        ? "L'onglet « CL-Dépenses » est introuvable dans ce fichier."
        : "L'onglet « CL-Outputs » est introuvable dans ce fichier."
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
