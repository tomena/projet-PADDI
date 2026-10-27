import * as XLSX from "xlsx";
/* ================================
 * TYPES
 * ================================
 */
export interface CoutMensuel {
  annee: number;
  mois: string;
  uc: string;

  // Décaissement global
  DMI: number;
  DMP: number;
  DC: number;
  DA: number;
  DF: number;
  Autres: number;
  D: number;

  // Décaissement par composante
  DC1: number;
  DC2: number;
  DC3: number;
  DC4: number;

  // Pourcentage global fourni par Excel
  tauxDepense?: number;
}

export interface BudgetCouts {
  annee: number;
  uc: string;

  // Budget global
  PA: number;

  // Budget par composante
  PAC1: number;
  PAC2: number;
  PAC3: number;
  PAC4: number;

  // Budget par instrument
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
 * ================================
 */
export const FEUILLES_UC = [
  "UCT (ext)",
  "UCR-N (Boeny-ext)",
  "UCR-N (DIANA-ext)",
  "UCR-S (Ambositra-ext)",
  "UCR-S (Farafangana-ext)",
  "UCR-S (Fort-dauphin-ext)",
] as const;

/* Correspondance Excel -> UC GeoJSON
 *
 * IMPORTANT :
 * On ne modifie PAS les noms des UC dans le GeoJSON.
 */
export const FEUILLE_VERS_UC: Record<string, string> = {
  "UCT (ext)": "UCT",
  "UCR-N (Boeny-ext)": "UCR-B",
  "UCR-N (DIANA-ext)": "UCR-D",
  "UCR-S (Ambositra-ext)": "UCR-A",
  "UCR-S (Farafangana-ext)": "UCR-F",
  "UCR-S (Fort-dauphin-ext)": "UCR-FD",
};
/* ================================
 * MOIS
 * ================================
 */
const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
/* ================================
 * OUTILS
 * ================================
 */
function nombre(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const nettoye = value
      .replace(/\s/g, "")
      .replace(",", ".");

    const n = Number(nettoye);

    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

/* Recherche une ligne dont la colonne A commence par le code
 * de la composante.
 *
 * Exemple :
 * "1.1 Gestion des services écosystémiques"
 *
 * retourne la ligne correspondant à 1.1.
 */
function trouverLigneComposante(
  feuille: XLSX.WorkSheet,
  code: string
): number | null {
  const range = XLSX.utils.decode_range(feuille["!ref"] || "A1:A1");

  for (let ligne = range.s.r; ligne <= range.e.r; ligne++) {
    const cellule = feuille[
      XLSX.utils.encode_cell({
        r: ligne,
        c: 0,
      })
    ];

    const valeur = cellule?.v;

    if (
      typeof valeur === "string" &&
      valeur.trim().startsWith(code)
    ) {
      return ligne + 1;
    }
  }

  return null;
}

/* Récupère une cellule Excel par adresse.*/
function cellule(
  feuille: XLSX.WorkSheet,
  adresse: string
): number {
  return nombre(feuille[adresse]?.v);
}

/* Récupère la valeur d'une colonne à partir d'un numéro de ligne.*/
function valeurColonne(
  feuille: XLSX.WorkSheet,
  colonne: number,
  ligne: number
): number {
  const adresse = XLSX.utils.encode_cell({
    r: ligne - 1,
    c: colonne - 1,
  });

  return nombre(feuille[adresse]?.v);
}

/* ================================
 * EXTRACTION DE L'ANNÉE
 * ================================
 */

function trouverAnnee(feuille: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(feuille["!ref"] || "A1:A1");

  // On cherche l'année dans les premières lignes.
  for (
    let ligne = range.s.r;
    ligne <= Math.min(range.e.r, 10);
    ligne++
  ) {
    for (
      let colonne = range.s.c;
      colonne <= Math.min(range.e.c, 10);
      colonne++
    ) {
      const cell = feuille[
        XLSX.utils.encode_cell({
          r: ligne,
          c: colonne,
        })
      ];

      const valeur = cell?.v;

      if (typeof valeur === "number") {
        if (valeur >= 2000 && valeur <= 2100) {
          return valeur;
        }
      }

      if (typeof valeur === "string") {
        const match = valeur.match(/\b(20\d{2})\b/);

        if (match) {
          return Number(match[1]);
        }
      }
    }
  }

  throw new Error(
    "Impossible de déterminer l'année dans la feuille Excel."
  );
}

/* ================================
 * BUDGET
 * ================================
 *
 * Structure confirmée :
 *
 * R = Personnel (HJ)
 * S = Mission GIZ (EUR)
 * T = Mission des partenaires (EUR)
 * U = Contrats (EUR)
 * V = Achats (EUR)
 * W = Financements (EUR)
 * X = Autres (EUR)
 * Y = Total (EUR)
 *
 * Ligne 4 = total général
 */

function extraireBudget(
  feuille: XLSX.WorkSheet,
  annee: number,
  uc: string
): BudgetCouts {
  // Ligne 4 = budget total
  const PA = cellule(feuille, "Y4");

  /**
   * Budget par composante.
   *
   * On recherche dynamiquement les lignes.
   */
  const ligneC1 = trouverLigneComposante(feuille, "1.1");
  const ligneC2 = trouverLigneComposante(feuille, "1.2");
  const ligneC3 = trouverLigneComposante(feuille, "2.1");
  const ligneC4 = trouverLigneComposante(feuille, "2.2");

  const PAC1 =
    ligneC1 !== null
      ? valeurColonne(feuille, 25, ligneC1)
      : 0;

  const PAC2 =
    ligneC2 !== null
      ? valeurColonne(feuille, 25, ligneC2)
      : 0;

  const PAC3 =
    ligneC3 !== null
      ? valeurColonne(feuille, 25, ligneC3)
      : 0;

  const PAC4 =
    ligneC4 !== null
      ? valeurColonne(feuille, 25, ligneC4)
      : 0;

  /* Budget par instrument.
   *
   * S = Mission GIZ
   * T = Mission partenaires
   * U = Contrats
   * V = Achats
   * W = Financements
   */
  const PAMI = cellule(feuille, "S4");
  const PAMP = cellule(feuille, "T4");
  const PAC = cellule(feuille, "U4");
  const PAA = cellule(feuille, "V4");
  const PAF = cellule(feuille, "W4");

  return {
    annee,uc,PA,PAC1, PAC2,PAC3,PAC4,PAF,PAA,PAC,PAMI,PAMP,
  };
}

/* ================================
 * EXTRACTION DES COÛTS MENSUELS
 * ================================
 *
 * Structure confirmée :
 *
 * Z:AG = Janvier - Décembre cumulé
 *
 * AH:AN = Janvier
 * AO:AU = Février
 * AV:BB = Mars
 * ...
 *
 * Chaque mois possède 7 colonnes :
 *
 * +0 = Mission GIZ
 * +1 = Mission partenaires
 * +2 = Contrats
 * +3 = Achats
 * +4 = Financements
 * +5 = Autres
 * +6 = Total
 *
 * Ligne 4 = total global
 *
 * Les lignes des composantes sont recherchées
 * dynamiquement.
 */

function extraireMois(
  feuille: XLSX.WorkSheet,
  annee: number,
  uc: string
): CoutMensuel[] {
  const resultats: CoutMensuel[] = [];

  /**
   * Lignes des composantes
   */
  const ligneC1 = trouverLigneComposante(feuille, "1.1");
  const ligneC2 = trouverLigneComposante(feuille, "1.2");
  const ligneC3 = trouverLigneComposante(feuille, "2.1");
  const ligneC4 = trouverLigneComposante(feuille, "2.2");

  /**
   * Première colonne des blocs mensuels.
   *
   * AH = 34
   *
   * En JavaScript / XLSX :
   * colonne 34 = AH
   */
  const PREMIERE_COLONNE_MOIS = 34;

  /**
   * Chaque mois occupe 7 colonnes.
   */
  const LARGEUR_BLOC = 7;

  for (let indexMois = 0; indexMois < 12; indexMois++) {
    const colonneDebut =
      PREMIERE_COLONNE_MOIS +
      indexMois * LARGEUR_BLOC;

    /**
     * Ligne 4 = total global
     */
    const DMI = valeurColonne(
      feuille,
      colonneDebut,
      4
    );

    const DMP = valeurColonne(
      feuille,
      colonneDebut + 1,
      4
    );

    const DC = valeurColonne(
      feuille,
      colonneDebut + 2,
      4
    );

    const DA = valeurColonne(
      feuille,
      colonneDebut + 3,
      4
    );

    const DF = valeurColonne(
      feuille,
      colonneDebut + 4,
      4
    );

    const Autres = valeurColonne(
      feuille,
      colonneDebut + 5,
      4
    );

    const D = valeurColonne(
      feuille,
      colonneDebut + 6,
      4
    );

    /**
     * Décaissement par composante.
     *
     * On récupère le TOTAL de chaque composante.
     */
    const DC1 =
      ligneC1 !== null
        ? valeurColonne(
            feuille,
            colonneDebut + 6,
            ligneC1
          )
        : 0;

    const DC2 =
      ligneC2 !== null
        ? valeurColonne(
            feuille,
            colonneDebut + 6,
            ligneC2
          )
        : 0;

    const DC3 =
      ligneC3 !== null
        ? valeurColonne(
            feuille,
            colonneDebut + 6,
            ligneC3
          )
        : 0;

    const DC4 =
      ligneC4 !== null
        ? valeurColonne(
            feuille,
            colonneDebut + 6,
            ligneC4
          )
        : 0;

    /**
     * Taux mensuel.
     *
     * On calcule uniquement si le budget existe.
     */
    const mois = MOIS[indexMois];

    resultats.push({
      annee,
      mois,
      uc,
      DMI,
      DMP,
      DC,
      DA,
      DF,
      Autres,
      D,
      DC1,
      DC2,
      DC3,
      DC4,
      tauxDepense: 0,
    });
  }

  /**
   * On récupère le taux cumulé Janvier-Décembre
   * depuis la colonne AG.
   *
   * Ce taux est actuellement global.
   */
  const tauxGlobal = valeurColonne(
    feuille,
    33,
    4
  );

  /**
   * Pour l'instant, on ne remplace pas les taux
   * mensuels par le taux global.
   *
   * Le taux global pourra être utilisé plus tard
   * pour la ligne annuelle.
   */

  void tauxGlobal;
  return resultats;
}

/**
 * ================================
 * PARSER PRINCIPAL
 * ================================
 */

export async function parseCoutsExcel(
  fichier: File,
  feuilleDemandee?: string
): Promise<ResultatImportCouts[]> {
  const buffer = await fichier.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
  });

  /**
   * Feuilles à traiter.
   *
   * Si une feuille est spécifiée :
   * on ne traite que celle-ci.
   *
   * Sinon :
   * on traite les six feuilles UC.
   */
  const feuillesATraiter = feuilleDemandee
    ? [feuilleDemandee]
    : FEUILLES_UC.filter((nom) =>
        workbook.SheetNames.includes(nom)
      );

  if (feuillesATraiter.length === 0) {
    throw new Error(
      "Aucune feuille UC reconnue dans le fichier Excel."
    );
  }

  const resultats: ResultatImportCouts[] = [];

  for (const nomFeuille of feuillesATraiter) {
    const feuille = workbook.Sheets[nomFeuille];

    if (!feuille) {
      throw new Error(
        `La feuille "${nomFeuille}" est introuvable dans le fichier Excel.`
      );
    }

    const uc = FEUILLE_VERS_UC[nomFeuille];

    if (!uc) {
      throw new Error(
        `Aucune correspondance UC définie pour la feuille "${nomFeuille}".`
      );
    }

    const annee = trouverAnnee(feuille);

    const budget = extraireBudget(
      feuille,
      annee,
      uc
    );

    const mois = extraireMois(
      feuille,
      annee,
      uc
    );

    resultats.push({
      uc,
      feuille: nomFeuille,
      annee,
      budget,
      mois,
    });
  }

  return resultats;
}

/* ================================
 * FONCTION UTILITAIRE POUR TEST
 * ================================
 *
 * Permet de voir facilement ce que le parser
 * récupère avant de connecter GitHub.
 */

export async function testerParseCoutsExcel(
  fichier: File,
  feuille?: string
): Promise<void> {
  const resultat = await parseCoutsExcel(
    fichier,
    feuille
  );

  console.log(
    "========== IMPORT SUIVI DES COÛTS =========="
  );

  for (const uc of resultat) {
    console.log("============================================");
    console.log("UC :", uc.uc);
    console.log("Feuille :", uc.feuille);
    console.log("Année :", uc.annee);

    console.log("---------- BUDGET ----------");
    console.log(uc.budget);

    console.log("---------- MOIS ----------");

    for (const mois of uc.mois) {
      console.log(
        mois.mois,
        {
          DMI: mois.DMI,
          DMP: mois.DMP,
          DC: mois.DC,
          DA: mois.DA,
          DF: mois.DF,
          Autres: mois.Autres,
          D: mois.D,
          DC1: mois.DC1,
          DC2: mois.DC2,
          DC3: mois.DC3,
          DC4: mois.DC4,
        }
      );
    }
  }

  console.log(
    "============================================"
  );
}
