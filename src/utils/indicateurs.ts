/* src/utils/indicateurs.ts
 * Lecture de la base Base_Indicateurs.geojson pour le tableau de bord PADDI+.
 * Aucun chiffre n'est écrit en dur : valeurs, cibles et pourcentages viennent de la base. */

export const ANTENNES = ["Tanà", "Amoron'i Mania", "Boeny", "Diana", "Atsimo-Atsinanana", "Anosy"] as const;

/* Les indicateurs sont rapportés par semestre : S1 = janvier-juin, S2 = juillet-décembre.
 * Les valeurs sont cumulées depuis le début du projet, à la fin du semestre. */
export const SEMESTRES = ["S1", "S2"] as const;
export type Semestre = (typeof SEMESTRES)[number];
export type FiltreSemestre = "Tous" | Semestre;
export const LIBELLE_SEMESTRE: Record<Semestre, string> = {
  S1: "S1 – Janvier à Juin",
  S2: "S2 – Juillet à Décembre",
};

export const CODES = ["R1.1", "R1.2", "R2.1", "R2.2", "R1.1.1", "R1.1.2", "R1.2.1", "R1.2.2", "R2.1.1", "R2.1.2", "R2.2.1", "R2.2.2"] as const;
export type Code = (typeof CODES)[number];

export interface Cible { libelle: string; unite: string; cible: number; sur?: number }
export interface Base { features: { properties: Record<string, any> }[]; cibles?: Record<string, Cible> }

export interface Indicateur { valeur: number; cible: number; sur?: number; pct: number }

export interface Tableau {
  ligne: Record<string, any> | null;          // ligne de la base utilisée (null = aucune donnée)
  indicateurs: Record<Code, Indicateur>;
  statuts: [number, number, number, number];  // nb d'indicateurs : ≤25 %, 25-50, 50-75, >75
  nbIndicateurs: number;
  genre: { hommes: number; femmes: number };  // en %
  ages: [number, number, number, number];     // en % : <18, 18-35, 36-59, >60
  beneficiaires: number;                      // total affiché au centre des donuts
  avancementGlobal: number;
}

const n = (v: any): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/* Même seuils que les cartes « Résultats clés » : <26 rouge, <51 orange, <76 vert, sinon bleu. */
export const couleurPct = (p: number): string =>
  p < 26 ? "#ef4444" : p < 51 ? "#f59e0b" : p < 76 ? "#22c55e" : "#2563eb";

export const fmtNombre = (v: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(v);

/* Avancement = valeur / cible, borné à 0-100. Fonctionne aussi pour R1.2 (-22,5 / -25 = 90 %). */
export function pourcentage(valeur: number, cible: number): number {
  if (!cible) return 0;
  return Math.min(100, Math.max(0, Math.round((valeur / cible) * 100)));
}

const statut = (p: number): 0 | 1 | 2 | 3 => (p <= 25 ? 0 : p <= 50 ? 1 : p <= 75 ? 2 : 3);

const aDesDonnees = (p: Record<string, any>): boolean =>
  CODES.some((c) => p[c] !== null && p[c] !== undefined) ||
  p["Hommes"] != null || p["Femmes"] != null || p["Avancement global (%)"] != null;

/* Ligne affichée : le semestre choisi ; avec « Tous », le dernier semestre de l'année qui contient des données. */
export function ligneReference(base: Base | null, annee: number, semestre: FiltreSemestre, antenne: string): Record<string, any> | null {
  if (!base?.features) return null;
  const lignes = base.features
    .map((f) => f.properties)
    .filter((p) => Number(p["Année"]) === annee && p.Antenne === antenne && aDesDonnees(p))
    .sort((x, y) => SEMESTRES.indexOf(x.Semestre) - SEMESTRES.indexOf(y.Semestre));
  if (semestre === "Tous") return lignes.length ? lignes[lignes.length - 1] : null;
  return lignes.find((p) => p.Semestre === semestre) ?? null;
}

export function anneesDisponibles(base: Base | null): number[] {
  const set = new Set<number>((base?.features ?? []).map((f) => Number(f.properties["Année"])).filter(Boolean));
  return [...set].sort((a, b) => a - b);
}

const part = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

export function calculerTableau(base: Base | null, annee: number, semestre: FiltreSemestre, antenne: string): Tableau {
  const ligne = ligneReference(base, annee, semestre, antenne || "Toutes");
  const cibles = base?.cibles ?? {};

  const indicateurs = {} as Record<Code, Indicateur>;
  for (const code of CODES) {
    const c = cibles[code];
    const valeur = n(ligne?.[code]);
    indicateurs[code] = { valeur, cible: n(c?.cible), sur: c?.sur, pct: pourcentage(valeur, n(c?.cible)) };
  }

  // Donut « statut des indicateurs » : calculé, plus de chiffres écrits à la main.
  const statuts: [number, number, number, number] = [0, 0, 0, 0];
  for (const code of CODES) statuts[statut(indicateurs[code].pct)]++;

  const h = n(ligne?.["Hommes"]), f = n(ligne?.["Femmes"]);
  const ages = [n(ligne?.["Age <18"]), n(ligne?.["Age 18-35"]), n(ligne?.["Age 36-59"]), n(ligne?.["Age >60"])];
  const totalAges = ages.reduce((s, x) => s + x, 0);

  return {
    ligne,
    indicateurs,
    statuts,
    nbIndicateurs: CODES.length,
    genre: { hommes: part(h, h + f), femmes: part(f, h + f) },
    ages: [part(ages[0], totalAges), part(ages[1], totalAges), part(ages[2], totalAges), part(ages[3], totalAges)],
    beneficiaires: indicateurs["R2.2"].valeur,
    avancementGlobal: Math.min(100, Math.max(0, n(ligne?.["Avancement global (%)"]))),
  };
}

/* ===================== SAISIE MANUELLE ===================== */

export interface Champ {
  cle: string;
  libelle: string;
  groupe: "cles" | "resultats" | "realisations" | "genre" | "age" | "global";
  unite?: string;
  toutesSeulement?: boolean; // non additif : se saisit uniquement sur la ligne « Toutes »
}

export const GROUPES: { id: Champ["groupe"]; titre: string }[] = [
  { id: "cles", titre: "Réalisations clés" },
  { id: "resultats", titre: "Résultats clés" },
  { id: "realisations", titre: "Réalisations" },
  { id: "genre", titre: "Bénéficiaires par genre (effectifs)" },
  { id: "age", titre: "Bénéficiaires par âge (effectifs)" },
  { id: "global", titre: "Avancement global" },
];

export const CHAMPS: Champ[] = [
  { cle: "R1.1", libelle: "R1.1 Communes avec budget communal ≥5% pour SECO", groupe: "cles", unite: "communes" },
  { cle: "R1.2", libelle: "R1.2 Superficies brûlées (variation %, négatif = réduction)", groupe: "cles", unite: "%", toutesSeulement: true },
  { cle: "R2.1", libelle: "R2.1 Superficies aménagées durablement", groupe: "cles", unite: "ha" },
  { cle: "R2.2", libelle: "R2.2 Petits exploitants appuyés", groupe: "cles", unite: "bénéficiaires" },
  { cle: "R1.1.1", libelle: "R1.1.1 Régions avec système de suivi", groupe: "resultats", unite: "régions" },
  { cle: "R1.1.2", libelle: "R1.1.2 Mesures communales adoptées", groupe: "resultats", unite: "mesures" },
  { cle: "R1.2.1", libelle: "R1.2.1 Décisions des COSAP", groupe: "resultats", unite: "décisions" },
  { cle: "R1.2.2", libelle: "R1.2.2 Mesures régionales (paquets)", groupe: "resultats", unite: "paquets" },
  { cle: "R2.1.1", libelle: "R2.1.1 Surfaces agropastorales durables", groupe: "realisations", unite: "ha" },
  { cle: "R2.1.2", libelle: "R2.1.2 Surfaces forestières durables", groupe: "realisations", unite: "ha" },
  { cle: "R2.2.1", libelle: "R2.2.1 Producteurs avec revenus améliorés", groupe: "realisations", unite: "producteurs" },
  { cle: "R2.2.2", libelle: "R2.2.2 Micro-entreprises", groupe: "realisations", unite: "entreprises" },
  { cle: "Hommes", libelle: "Hommes", groupe: "genre", unite: "personnes" },
  { cle: "Femmes", libelle: "Femmes", groupe: "genre", unite: "personnes" },
  { cle: "Age <18", libelle: "Moins de 18 ans", groupe: "age", unite: "personnes" },
  { cle: "Age 18-35", libelle: "18 à 35 ans", groupe: "age", unite: "personnes" },
  { cle: "Age 36-59", libelle: "36 à 59 ans", groupe: "age", unite: "personnes" },
  { cle: "Age >60", libelle: "Plus de 60 ans", groupe: "age", unite: "personnes" },
  { cle: "Avancement global (%)", libelle: "Avancement global du projet vs jalons du plan quinquennal", groupe: "global", unite: "%", toutesSeulement: true },
];

/* Valeurs de départ du formulaire : la ligne du semestre choisi si elle existe, sinon la plus récente
 * avant ce semestre (les valeurs sont cumulées : on repart de la dernière situation connue). */
export function ligneJusqua(base: Base | null, annee: number, semestre: Semestre, antenne: string): Record<string, any> | null {
  const rang = (a: number, sem: string) => a * 2 + SEMESTRES.indexOf(sem as Semestre);
  const limite = rang(annee, semestre);
  const lignes = (base?.features ?? [])
    .map((f) => f.properties)
    .filter((p) => p.Antenne === antenne && aDesDonnees(p) && rang(Number(p["Année"]), p.Semestre) <= limite)
    .sort((x, y) => rang(Number(x["Année"]), x.Semestre) - rang(Number(y["Année"]), y.Semestre));
  return lignes.length ? lignes[lignes.length - 1] : null;
}

/* Transforme les champs texte du formulaire en valeurs à envoyer. Lance une erreur lisible si invalide. */
export function construireValeurs(saisies: Record<string, string>, antenne: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CHAMPS) {
    if (c.toutesSeulement && antenne !== "Toutes") continue;
    const brut = (saisies[c.cle] ?? "").replace(/\s/g, "").replace(",", ".");
    if (brut === "") continue; // champ vide = non renseigné
    const x = Number(brut);
    if (!Number.isFinite(x)) throw new Error(`« ${c.libelle} » : « ${saisies[c.cle]} » n'est pas un nombre.`);
    if (c.cle === "Avancement global (%)") {
      if (x < 0 || x > 100) throw new Error("« Avancement global » doit être entre 0 et 100.");
    } else if (c.cle === "R1.2") {
      if (x < -100 || x > 100) throw new Error("« R1.2 » doit être un pourcentage entre -100 et 100.");
    } else if (x < 0) {
      throw new Error(`« ${c.libelle} » ne peut pas être négatif.`);
    }
    out[c.cle] = x;
  }
  if (Object.keys(out).length === 0) throw new Error("Saisissez au moins une valeur.");
  return out;
}

/* Contrôles de cohérence NON bloquants (affichés en orange dans le formulaire). */
export function avertissements(v: Record<string, number>): string[] {
  const a: string[] = [];
  const egal = (x: number, y: number) => Math.abs(x - y) <= 0.5;
  const total = v["R2.2"];
  if (v["Hommes"] != null && v["Femmes"] != null && total != null && !egal(v["Hommes"] + v["Femmes"], total)) {
    a.push(`Hommes + Femmes = ${fmtNombre(v["Hommes"] + v["Femmes"])}, mais R2.2 = ${fmtNombre(total)}.`);
  }
  const ages = ["Age <18", "Age 18-35", "Age 36-59", "Age >60"];
  if (total != null && ages.every((k) => v[k] != null)) {
    const somme = ages.reduce((s, k) => s + v[k], 0);
    if (!egal(somme, total)) a.push(`La somme des tranches d'âge = ${fmtNombre(somme)}, mais R2.2 = ${fmtNombre(total)}.`);
  }
  if (v["R2.1"] != null && v["R2.1.1"] != null && v["R2.1.2"] != null && !egal(v["R2.1.1"] + v["R2.1.2"], v["R2.1"])) {
    a.push(`R2.1.1 + R2.1.2 = ${fmtNombre(v["R2.1.1"] + v["R2.1.2"])} ha, mais R2.1 = ${fmtNombre(v["R2.1"])} ha.`);
  }
  return a;
}
