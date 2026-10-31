import * as XLSX from "xlsx";

/* ================================
 * TYPES
 * ================================ */
export interface CoutMensuel {
  annee: number;
  mois: string;
  uc: string;

  // Décaissement par instrument
  DMI: number;
  DMP: number;
  DC: number;
  DA: number;
  DF: number;
  Autres: number;
  D: number; // total du mois

  // Décaissement par composante
  DC1: number;
  DC2: number;
  DC3: number;
  DC4: number;
}

export interface BudgetCouts {
  annee: number;
  uc: string;

  PA: number; // budget annuel total

  PAC1: number;
  PAC2: number;
  PAC3: number;
  PAC4: number;

  PAF: number;
  PAA: number;
  PAC: number;
  PAMI: number;
  PAMP: number;
}

export interface ResultatImportCouts {
  uc: string;
  feuille: string;
  annee: number;
  budget: BudgetCouts;
  mois: CoutMensuel[];
}

/* ================================
 * CONFIGURATION DES FEUILLES
 * ================================ */
export const FEUILLES_UC = [
  "UCT (ext)",
  "UCR-N (Boeny-ext)",
  "UCR-N (DIANA-ext)",
  "UCR-S (Ambositra-ext)",
  "UCR-S (Farafangana-ext)",
  "UCR-S (Fort-dauphin-ext)",
] as const;

/* Correspondance Excel -> UC GeoJSON (les noms GeoJSON ne changent pas). */
export const FEUILLE_VERS_UC: Record<string, string> = {
  "UCT (ext)": "UCT",
  "UCR-N (Boeny-ext)": "UCR-B",
  "UCR-N (DIANA-ext)": "UCR-D",
  "UCR-S (Ambositra-ext)": "UCR-A",
  "UCR-S (Farafangana-ext)": "UCR-F",
  "UCR-S (Fort-dauphin-ext)": "UCR-FD",
};

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/* Ligne Excel (1-based) qui contient les totaux de l'UC. */
const LIGNE_TOTAL = 4;
/* Un bloc (budget, cumul ou mois) fait 7 colonnes :
 * Mission GIZ, Mission partenaires, Contrats, Achats, Financements, Autres, Total. */
const OFFSET_TOTAL = 6;
/* Tolérance (en €) pour les contrôles de cohérence. */
const TOLERANCE = 1;

/* ================================
 * OUTILS
 * ================================ */
function nombre(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function sansAccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/* Lit une cellule (colonne et ligne 1-based).
 * Une cellule en erreur Excel (#VALUE!, #DIV/0!...) stoppe l'import :
 * SheetJS stocke alors un code numérique (ex. 15) qui serait lu comme un montant. */
function valeurColonne(feuille: XLSX.WorkSheet, colonne: number, ligne: number): number {
  const adresse = XLSX.utils.encode_cell({ r: ligne - 1, c: colonne - 1 });
  const cell = feuille[adresse];
  if (cell?.t === "e") {
    throw new Error(
      `Cellule en erreur Excel (${cell.w ?? "#ERREUR"}) en ${adresse} : corrigez le fichier avant l'import.`
    );
  }
  return nombre(cell?.v);
}

/* ================================
 * DÉTECTION DE LA DISPOSITION
 * ================================ */

/* « Suivi mensuel des coûts (Juilet) » -> "Juillet".
 * Ignore le bloc cumul « (Janvier - Décembre) » ou « (Juin - Décembre) ». */
function moisDepuisLibelle(label: unknown): string | null {
  const m = String(label ?? "").match(/\(([^)]+)\)/);
  if (!m) return null;
  const t = sansAccent(m[1]);
  if (t.includes("-")) return null;
  if (t.startsWith("juil")) return "Juillet"; // « Juilet » (faute) dans les onglets UCR-S
  if (t.startsWith("juin")) return "Juin";
  return MOIS.find((x) => sansAccent(x) === t) ?? null;
}

interface Disposition {
  colBudget: number; // colonne « Mission GIZ » du budget (1-based)
  colCumul: number; // colonne « Mission GIZ » du cumul annuel (1-based)
  colsMois: Record<string, number>; // mois -> 1re colonne du bloc de 7 (1-based)
}

/* UCT / Boeny / DIANA : budget en S, cumul en Z, Janvier en AH.
 * UCR-S : budget en T, cumul en AB, Juin en AJ (Juin -> Décembre uniquement).
 * On repère donc les blocs par leurs en-têtes plutôt que par des colonnes fixes. */
function detecterDisposition(feuille: XLSX.WorkSheet, nomFeuille: string): Disposition {
  const range = XLSX.utils.decode_range(feuille["!ref"] || "A1:A1");
  const debuts: number[] = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    const v = feuille[XLSX.utils.encode_cell({ r: 1, c })]?.v; // ligne 2 = en-têtes
    if (typeof v === "string" && v.trim().startsWith("Mission GIZ")) debuts.push(c + 1);
  }

  if (debuts.length < 3) {
    throw new Error(
      `Onglet « ${nomFeuille} » : disposition non reconnue (en-têtes « Mission GIZ » introuvables en ligne 2).`
    );
  }

  const [colBudget, colCumul, ...blocs] = debuts;
  const colsMois: Record<string, number> = {};

  for (const col of blocs) {
    const label = feuille[XLSX.utils.encode_cell({ r: 0, c: col - 1 })]?.v; // ligne 1
    const mois = moisDepuisLibelle(label);
    if (mois) colsMois[mois] = col;
  }

  if (Object.keys(colsMois).length === 0) {
    throw new Error(`Onglet « ${nomFeuille} » : aucun bloc mensuel reconnu en ligne 1.`);
  }

  return { colBudget, colCumul, colsMois };
}

/* ================================
 * LIGNES DE COMPOSANTES
 * ================================ */
function trouverLigneComposante(feuille: XLSX.WorkSheet, code: string, nomFeuille: string): number {
  const range = XLSX.utils.decode_range(feuille["!ref"] || "A1:A1");

  for (let ligne = range.s.r; ligne <= range.e.r; ligne++) {
    const valeur = feuille[XLSX.utils.encode_cell({ r: ligne, c: 0 })]?.v;
    if (typeof valeur === "string" && valeur.trim().startsWith(code)) return ligne + 1;
  }
  throw new Error(`Onglet « ${nomFeuille} » : ligne de la composante ${code} introuvable en colonne A.`);
}

/* ================================
 * ANNÉE
 * ================================ */
function trouverAnnee(feuille: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(feuille["!ref"] || "A1:A1");

  for (let ligne = range.s.r; ligne <= Math.min(range.e.r, 10); ligne++) {
    for (let colonne = range.s.c; colonne <= Math.min(range.e.c, 10); colonne++) {
      const valeur = feuille[XLSX.utils.encode_cell({ r: ligne, c: colonne })]?.v;

      if (typeof valeur === "number" && valeur >= 2000 && valeur <= 2100) return valeur;

      if (typeof valeur === "string") {
        const match = valeur.match(/\b(20\d{2})\b/);
        if (match) return Number(match[1]);
      }
    }
  }
  throw new Error("Impossible de déterminer l'année dans la feuille Excel.");
}

/* ================================
 * BUDGET
 * ================================ */
function extraireBudget(
  feuille: XLSX.WorkSheet,
  annee: number,
  uc: string,
  nomFeuille: string,
  dispo: Disposition
): BudgetCouts {
  const b = dispo.colBudget;

  const ligneC1 = trouverLigneComposante(feuille, "1.1", nomFeuille);
  const ligneC2 = trouverLigneComposante(feuille, "1.2", nomFeuille);
  const ligneC3 = trouverLigneComposante(feuille, "2.1", nomFeuille);
  const ligneC4 = trouverLigneComposante(feuille, "2.2", nomFeuille);

  const budget: BudgetCouts = {
    annee,
    uc,
    PAMI: valeurColonne(feuille, b, LIGNE_TOTAL),
    PAMP: valeurColonne(feuille, b + 1, LIGNE_TOTAL),
    PAC: valeurColonne(feuille, b + 2, LIGNE_TOTAL),
    PAA: valeurColonne(feuille, b + 3, LIGNE_TOTAL),
    PAF: valeurColonne(feuille, b + 4, LIGNE_TOTAL),
    PA: valeurColonne(feuille, b + OFFSET_TOTAL, LIGNE_TOTAL),
    PAC1: valeurColonne(feuille, b + OFFSET_TOTAL, ligneC1),
    PAC2: valeurColonne(feuille, b + OFFSET_TOTAL, ligneC2),
    PAC3: valeurColonne(feuille, b + OFFSET_TOTAL, ligneC3),
    PAC4: valeurColonne(feuille, b + OFFSET_TOTAL, ligneC4),
  };

  if (budget.PA <= 0) {
    throw new Error(`Onglet « ${nomFeuille} » : budget total (ligne ${LIGNE_TOTAL}) nul ou introuvable.`);
  }

  const sommeComposantes = budget.PAC1 + budget.PAC2 + budget.PAC3 + budget.PAC4;
  if (Math.abs(sommeComposantes - budget.PA) > TOLERANCE) {
    throw new Error(
      `Onglet « ${nomFeuille} » : les budgets des composantes (${Math.round(sommeComposantes)}) ` +
        `ne correspondent pas au budget total (${Math.round(budget.PA)}).`
    );
  }

  return budget;
}

/* ================================
 * MOIS
 * ================================ */
function extraireMois(
  feuille: XLSX.WorkSheet,
  annee: number,
  uc: string,
  nomFeuille: string,
  dispo: Disposition
): CoutMensuel[] {
  const resultats: CoutMensuel[] = [];

  const ligneC1 = trouverLigneComposante(feuille, "1.1", nomFeuille);
  const ligneC2 = trouverLigneComposante(feuille, "1.2", nomFeuille);
  const ligneC3 = trouverLigneComposante(feuille, "2.1", nomFeuille);
  const ligneC4 = trouverLigneComposante(feuille, "2.2", nomFeuille);

  for (const mois of MOIS) {
    const col = dispo.colsMois[mois];
    if (!col) continue; // ex. UCR-S : pas de Janvier à Mai

    const colTotal = col + OFFSET_TOTAL;

    resultats.push({
      annee,
      mois,
      uc,
      DMI: valeurColonne(feuille, col, LIGNE_TOTAL),
      DMP: valeurColonne(feuille, col + 1, LIGNE_TOTAL),
      DC: valeurColonne(feuille, col + 2, LIGNE_TOTAL),
      DA: valeurColonne(feuille, col + 3, LIGNE_TOTAL),
      DF: valeurColonne(feuille, col + 4, LIGNE_TOTAL),
      Autres: valeurColonne(feuille, col + 5, LIGNE_TOTAL),
      D: valeurColonne(feuille, colTotal, LIGNE_TOTAL),
      DC1: valeurColonne(feuille, colTotal, ligneC1),
      DC2: valeurColonne(feuille, colTotal, ligneC2),
      DC3: valeurColonne(feuille, colTotal, ligneC3),
      DC4: valeurColonne(feuille, colTotal, ligneC4),
    });
  }

  // Contrôle d'intégrité : la somme des mois doit égaler le cumul annuel de l'Excel.
  const cumulExcel = valeurColonne(feuille, dispo.colCumul + OFFSET_TOTAL, LIGNE_TOTAL);
  const sommeMois = resultats.reduce((s, m) => s + m.D, 0);
  if (Math.abs(sommeMois - cumulExcel) > TOLERANCE) {
    throw new Error(
      `Onglet « ${nomFeuille} » : la somme des mois (${Math.round(sommeMois)}) ` +
        `diffère du cumul annuel de l'Excel (${Math.round(cumulExcel)}).`
    );
  }

  // Contrôle d'intégrité : pour chaque mois, composantes = total.
  for (const m of resultats) {
    const sommeC = m.DC1 + m.DC2 + m.DC3 + m.DC4;
    if (Math.abs(sommeC - m.D) > TOLERANCE) {
      throw new Error(
        `Onglet « ${nomFeuille} », ${m.mois} : la somme des composantes (${Math.round(sommeC)}) ` +
          `diffère du total (${Math.round(m.D)}).`
      );
    }
  }

  return resultats;
}

/* ================================
 * PARSER PRINCIPAL
 * ================================ */
export async function parseCoutsExcelFeuilles(
  fichier: File,
  feuilles?: string[]
): Promise<ResultatImportCouts[]> {
  const buffer = await fichier.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const aTraiter =
    feuilles && feuilles.length > 0
      ? feuilles
      : FEUILLES_UC.filter((nom) => workbook.SheetNames.includes(nom));

  if (aTraiter.length === 0) {
    throw new Error("Aucune feuille UC reconnue dans le fichier Excel.");
  }

  const resultats: ResultatImportCouts[] = [];

  for (const nomFeuille of aTraiter) {
    const feuille = workbook.Sheets[nomFeuille];
    if (!feuille) {
      throw new Error(`La feuille « ${nomFeuille} » est introuvable dans le fichier Excel.`);
    }

    const uc = FEUILLE_VERS_UC[nomFeuille];
    if (!uc) {
      throw new Error(`Aucune correspondance UC définie pour la feuille « ${nomFeuille} ».`);
    }

    const annee = trouverAnnee(feuille);
    const dispo = detecterDisposition(feuille, nomFeuille);
    const budget = extraireBudget(feuille, annee, uc, nomFeuille, dispo);
    const mois = extraireMois(feuille, annee, uc, nomFeuille, dispo);

    resultats.push({ uc, feuille: nomFeuille, annee, budget, mois });
  }

  return resultats;
}

/* Compatibilité avec l'ancienne signature. */
export async function parseCoutsExcel(
  fichier: File,
  feuilleDemandee?: string
): Promise<ResultatImportCouts[]> {
  return parseCoutsExcelFeuilles(fichier, feuilleDemandee ? [feuilleDemandee] : undefined);
}

export async function testerParseCoutsExcel(fichier: File, feuille?: string): Promise<void> {
  const resultat = await parseCoutsExcel(fichier, feuille);
  console.log("========== IMPORT SUIVI DES COÛTS ==========");
  for (const uc of resultat) {
    console.log("UC :", uc.uc, "| Feuille :", uc.feuille, "| Année :", uc.annee);
    console.log("Budget :", uc.budget);
    console.table(uc.mois);
  }
}

/* ================================
 * FORMAT ENVOYÉ À L'API
 * ================================ */
const aDesValeurs = (m: CoutMensuel): boolean =>
  [m.DMI, m.DMP, m.DC, m.DA, m.DF, m.Autres, m.D, m.DC1, m.DC2, m.DC3, m.DC4].some((v) => v !== 0);

/* anneeAttendue : année choisie dans le modal. Si elle diffère de celle du fichier, l'import est refusé. */
export async function analyserFichierCouts(
  fichier: File,
  ongletsAImporter: string[],
  anneeAttendue?: number
) {
  const resultats = await parseCoutsExcelFeuilles(fichier, ongletsAImporter);

  return resultats.map((resultat) => {
    if (anneeAttendue && resultat.annee !== anneeAttendue) {
      throw new Error(
        `L'onglet « ${resultat.feuille} » concerne ${resultat.annee}, mais l'année sélectionnée est ${anneeAttendue}.`
      );
    }

    // On importe tous les mois jusqu'au DERNIER mois non nul (les mois à 0 au milieu
    // sont conservés, sinon leur ligne GeoJSON resterait vide), les mois suivants sont ignorés.
    const dernier = resultat.mois.map(aDesValeurs).lastIndexOf(true);
    const moisAImporter = dernier < 0 ? [] : resultat.mois.slice(0, dernier + 1);

    return {
      onglet: resultat.feuille,
      uc: resultat.uc,
      annee: resultat.annee,

      budget: {
        total: resultat.budget.PA,
        financements: resultat.budget.PAF,
        achats: resultat.budget.PAA,
        contrats: resultat.budget.PAC,
        dmi: resultat.budget.PAMI,
        dmp: resultat.budget.PAMP,
        c1: resultat.budget.PAC1,
        c2: resultat.budget.PAC2,
        c3: resultat.budget.PAC3,
        c4: resultat.budget.PAC4,
      },

      mois: moisAImporter.map((m) => ({
        mois: m.mois,
        total: m.D,
        dmi: m.DMI,
        dmp: m.DMP,
        contrats: m.DC,
        achats: m.DA,
        financements: m.DF,
        c1: m.DC1,
        c2: m.DC2,
        c3: m.DC3,
        c4: m.DC4,
      })),
    };
  });
}

/* ================================
 * DROITS
 * ================================ */
export const UC_PAR_ONGLET = FEUILLE_VERS_UC;

export const ONGLET_PAR_UTILISATEUR: Record<string, string> = {
  Allan: "UCR-N (DIANA-ext)",
  Herimanga: "UCR-N (Boeny-ext)",
  Michael: "UCR-S (Ambositra-ext)",
  Tsinjo: "UCR-S (Fort-dauphin-ext)",
  Njaka: "UCR-S (Farafangana-ext)",
};

// Joary ajouté : il est administrateur côté API (ADMIN) mais manquait ici.
export const UTILISATEURS_ADMIN = new Set(["Toky", "Zo", "Joary"]);
