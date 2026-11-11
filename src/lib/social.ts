import type { Unit } from "./geo";
import { between, popDemo, rng } from "./demo";

export type SocData = {
  population: number;
  scolarisation: number; // % taux net de scolarisation primaire
  eau: number; // % de la population avec accès à l'eau potable
  sante: number; // % de la population à moins de 5 km d'un centre de santé
  electricite: number; // % de la population avec accès à l'électricité
  pauvrete: number; // % de la population sous le seuil de pauvreté
};
export const SOC_BLANK: SocData = { population: 0, scolarisation: 0, eau: 0, sante: 0, electricite: 0, pauvrete: 0 };
export const KEY_SOC = "paddi.social.territoires";
export const KEY_SERVICES = "paddi.social.services";

// ⚠ VALEURS FICTIVES pour la démonstration : à remplacer par INSTAT (RGPH, EPM), EDS/MICS, SIGE, ministères.
export function socDemo(u: Unit): SocData {
  const r = rng("soc:" + u.key);
  return {
    population: popDemo(u.level, r),
    scolarisation: between(r, 40, 95),
    eau: between(r, 10, 85),
    sante: between(r, 20, 95),
    electricite: between(r, 2, 70),
    pauvrete: between(r, 35, 92),
  };
}

export type IndicKey = "scolarisation" | "eau" | "sante" | "electricite" | "pauvrete";

export const INDICATEURS: { key: IndicKey; label: string; ecart: (d: SocData) => number; conseil: string }[] = [
  {
    key: "scolarisation", label: "Éducation", ecart: (d) => 100 - d.scolarisation,
    conseil: "Construire ou réhabiliter des salles de classe, former et déployer des enseignants, appuyer les cantines scolaires et lutter contre l'abandon (distance, coût, travail des enfants).",
  },
  {
    key: "eau", label: "Eau potable", ecart: (d) => 100 - d.eau,
    conseil: "Forages et bornes-fontaines gérés par un comité local, avec un contrat d'entretien. Sans maintenance, une grande partie des points d'eau tombent en panne en quelques années.",
  },
  {
    key: "sante", label: "Accès à la santé", ecart: (d) => 100 - d.sante,
    conseil: "Centres de santé de base dans les zones à plus de 5 km, agents de santé communautaires, approvisionnement régulier en médicaments et solutions pour les routes impraticables en saison des pluies.",
  },
  {
    key: "electricite", label: "Électricité", ecart: (d) => 100 - d.electricite,
    conseil: "Mini-réseaux solaires et kits solaires pour les écoles, centres de santé et petits commerces, avec un modèle de paiement adapté aux revenus locaux.",
  },
  {
    key: "pauvrete", label: "Pauvreté", ecart: (d) => d.pauvrete,
    conseil: "Soutenir les revenus : appui aux activités agricoles et artisanales, accès à l'épargne et au microcrédit, transferts monétaires ciblés pour les ménages vulnérables, désenclavement des marchés.",
  },
];

export type Niveau = "Critique" | "Prioritaire" | "À surveiller";
export const NIVEAUX: Niveau[] = ["Critique", "Prioritaire", "À surveiller"];
export const NIVEAU_TONE: Record<Niveau, "warn" | "info" | "good"> = { Critique: "warn", Prioritaire: "info", "À surveiller": "good" };
export type Manque = { key: IndicKey; label: string; ecart: number; conseil: string };
export type SocLigne = { unit: Unit; d: SocData };
export type SocNote = SocLigne & { indice: number; niveau: Niveau; manques: Manque[] };

/** Indice de précarité 0-100 = moyenne des écarts (plus c'est haut, plus le besoin est grand). */
export function diagnostiquer(rows: SocLigne[]): SocNote[] {
  return rows
    .map(({ unit, d }) => {
      const manques = INDICATEURS.map((i) => ({
        key: i.key, label: i.label, conseil: i.conseil, ecart: Math.max(0, Math.min(100, i.ecart(d))),
      })).sort((a, b) => b.ecart - a.ecart);
      const indice = Math.round(manques.reduce((s, m) => s + m.ecart, 0) / manques.length);
      const niveau: Niveau = indice >= 60 ? "Critique" : indice >= 40 ? "Prioritaire" : "À surveiller";
      return { unit, d, indice, niveau, manques };
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

export type LignePlan = { unit: Unit; service: Service; unites: number; personnes: number; cout: number };

/**
 * Glouton : à chaque étape on finance l'unité qui touche le plus de monde par Ariary,
 * avec un bonus d'équité pour les territoires les plus précaires.
 */
export function planifier(notes: SocNote[], services: Service[], budget: number) {
  type Opt = { n: SocNote; s: Service; reste: number; besoin: number; u: number };
  const opts: Opt[] = notes
    .flatMap((n) => services.map((s) => {
      const b = (n.d.population * (n.manques.find((m) => m.key === s.indicateur)?.ecart ?? 0)) / 100;
      return { n, s, reste: b, besoin: b, u: 0 };
    }))
    .filter((o) => o.besoin > 0 && o.s.cout > 0 && o.s.couverture > 0);
  let b = budget;
  for (let i = 0; i < 20000; i++) {
    let best: Opt | null = null, bs = 0;
    for (const o of opts) {
      if (o.reste <= 0 || o.s.cout > b) continue;
      const sc = (Math.min(o.reste, o.s.couverture) / o.s.cout) * (1 + o.n.indice / 100);
      if (sc > bs) { bs = sc; best = o; }
    }
    if (!best) break;
    b -= best.s.cout; best.reste -= best.s.couverture; best.u++;
  }
  const lignes: LignePlan[] = opts.filter((o) => o.u > 0).map((o) => ({
    unit: o.n.unit, service: o.s, unites: o.u, personnes: Math.min(o.besoin, o.u * o.s.couverture), cout: o.u * o.s.cout,
  })).sort((a, c) => c.personnes - a.personnes);
  return { lignes, restant: b };
}
