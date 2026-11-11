import { usePersistedState } from "./analyse-utils";

export type Territoire = {
  id: string;
  nom: string;
  population: number;
  scolarisation: number; // % taux net de scolarisation primaire
  eau: number; // % de la population avec accès à l'eau potable
  sante: number; // % de la population à moins de 5 km d'un centre de santé
  electricite: number; // % de la population avec accès à l'électricité
  pauvrete: number; // % de la population sous le seuil de pauvreté
};

// ⚠ CHIFFRES ILLUSTRATIFS : à remplacer par INSTAT (EPM, RGPH), EDS/DHS, MICS, SIGE, ministères.
export const EXEMPLE: Territoire[] = [
  { id: "a", nom: "Exemple – Commune A", population: 42000, scolarisation: 62, eau: 28, sante: 45, electricite: 8, pauvrete: 82 },
  { id: "b", nom: "Exemple – Commune B", population: 65000, scolarisation: 78, eau: 55, sante: 70, electricite: 35, pauvrete: 64 },
  { id: "c", nom: "Exemple – Commune C", population: 28000, scolarisation: 55, eau: 18, sante: 30, electricite: 3, pauvrete: 88 },
  { id: "d", nom: "Exemple – Commune D", population: 120000, scolarisation: 88, eau: 72, sante: 85, electricite: 60, pauvrete: 40 },
  { id: "e", nom: "Exemple – Commune E", population: 51000, scolarisation: 70, eau: 40, sante: 52, electricite: 12, pauvrete: 75 },
];

export const MODELE_CSV =
  "nom;population;scolarisation;eau;sante;electricite;pauvrete\n" +
  "Commune A;42000;62;28;45;8;82\n" +
  "Commune B;65000;78;55;70;35;64\n";

export const KEY_TERRITOIRES = "paddi.social.territoires";
export const KEY_SERVICES = "paddi.social.services";
export const useTerritoires = () => usePersistedState<Territoire[]>(KEY_TERRITOIRES, EXEMPLE);

export type IndicKey = "scolarisation" | "eau" | "sante" | "electricite" | "pauvrete";

export const INDICATEURS: { key: IndicKey; label: string; ecart: (t: Territoire) => number; conseil: string }[] = [
  {
    key: "scolarisation",
    label: "Éducation",
    ecart: (t) => 100 - t.scolarisation,
    conseil:
      "Construire ou réhabiliter des salles de classe, former et déployer des enseignants, appuyer les cantines scolaires et lutter contre l'abandon (distance, coût, travail des enfants).",
  },
  {
    key: "eau",
    label: "Eau potable",
    ecart: (t) => 100 - t.eau,
    conseil:
      "Forages et bornes-fontaines gérés par un comité local, avec un contrat d'entretien. Sans maintenance, une grande partie des points d'eau tombent en panne en quelques années.",
  },
  {
    key: "sante",
    label: "Accès à la santé",
    ecart: (t) => 100 - t.sante,
    conseil:
      "Centres de santé de base dans les zones à plus de 5 km, agents de santé communautaires, approvisionnement régulier en médicaments et solutions pour les routes impraticables en saison des pluies.",
  },
  {
    key: "electricite",
    label: "Électricité",
    ecart: (t) => 100 - t.electricite,
    conseil:
      "Mini-réseaux solaires et kits solaires pour les écoles, centres de santé et petits commerces, avec un modèle de paiement adapté aux revenus locaux.",
  },
  {
    key: "pauvrete",
    label: "Pauvreté",
    ecart: (t) => t.pauvrete,
    conseil:
      "Soutenir les revenus : appui aux activités agricoles et artisanales, accès à l'épargne et au microcrédit, transferts monétaires ciblés pour les ménages les plus vulnérables, désenclavement des marchés.",
  },
];

export type Niveau = "Critique" | "Prioritaire" | "À surveiller";
export type Manque = { key: IndicKey; label: string; ecart: number; conseil: string };
export type TerritoireNote = Territoire & { indice: number; niveau: Niveau; manques: Manque[] };

/** Indice de précarité 0-100 = moyenne des écarts (plus c'est haut, plus le besoin est grand). */
export function diagnostiquer(rows: Territoire[]): TerritoireNote[] {
  return rows
    .map((t) => {
      const manques = INDICATEURS.map((i) => ({
        key: i.key,
        label: i.label,
        ecart: Math.max(0, Math.min(100, i.ecart(t))),
        conseil: i.conseil,
      })).sort((a, b) => b.ecart - a.ecart);
      const indice = Math.round(manques.reduce((s, m) => s + m.ecart, 0) / manques.length);
      const niveau: Niveau = indice >= 60 ? "Critique" : indice >= 40 ? "Prioritaire" : "À surveiller";
      return { ...t, indice, niveau, manques };
    })
    .sort((a, b) => b.indice - a.indice);
}

/** Un type d'investissement. Coût en millions d'Ariary. */
export type Service = {
  id: string;
  nom: string;
  indicateur: Exclude<IndicKey, "pauvrete">;
  cout: number; // M Ar par unité
  couverture: number; // personnes servies par unité
};

// ⚠ HYPOTHÈSES : à remplacer par les coûts réels (ministères, bailleurs, devis).
export const SERVICES_DEFAUT: Service[] = [
  { id: "edu", nom: "École primaire (3 salles)", indicateur: "scolarisation", cout: 90, couverture: 250 },
  { id: "eau", nom: "Forage + borne-fontaine", indicateur: "eau", cout: 35, couverture: 500 },
  { id: "san", nom: "Centre de santé de base", indicateur: "sante", cout: 180, couverture: 5000 },
  { id: "ele", nom: "Mini-réseau solaire", indicateur: "electricite", cout: 150, couverture: 600 },
];
