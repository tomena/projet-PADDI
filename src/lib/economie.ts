import type { Unit } from "./geo";
import { between, pickOne, popDemo, rng } from "./demo";

/** Indicateurs économiques d'un territoire (région, district ou commune). */
export type EcoData = {
  population: number;
  emplois: number; // nombre d'emplois estimés
  filiere: string; // filière principale
  croissance: number; // % par an de l'activité locale
  acces: number; // % de la population à moins de 2 h d'un marché ou d'une route praticable
  informel: number; // % d'emplois informels
  potentiel: number; // 1 (faible) à 5 (fort)
};
export const ECO_BLANK: EcoData = { population: 0, emplois: 0, filiere: "", croissance: 0, acces: 0, informel: 0, potentiel: 3 };
export const KEY_ECO = "paddi.economie.territoires";
export const KEY_POIDS = "paddi.economie.poids2";

const FILIERES = ["Riz", "Vanille", "Café", "Girofle", "Pêche", "Élevage", "Tourisme", "Mines", "Manioc", "Litchi", "Artisanat"];
// ⚠ VALEURS FICTIVES pour la démonstration : à remplacer par INSTAT, BFM, ministères, EDBM.
export function ecoDemo(u: Unit): EcoData {
  const r = rng("eco:" + u.key);
  const population = popDemo(u.level, r);
  return {
    population,
    emplois: Math.round(population * between(r, 0.25, 0.45, 0.01)),
    filiere: pickOne(r, FILIERES),
    croissance: between(r, 0.5, 6, 0.1),
    acces: between(r, 10, 95),
    informel: between(r, 55, 97),
    potentiel: between(r, 1, 5),
  };
}

export type Poids = { potentiel: number; croissance: number; enclavement: number; informel: number; emploi: number };
export const POIDS_DEFAUT: Poids = { potentiel: 25, croissance: 20, enclavement: 25, informel: 15, emploi: 15 };
export const POIDS_LABELS: Record<keyof Poids, string> = {
  potentiel: "Potentiel de la filière",
  croissance: "Dynamique de croissance",
  enclavement: "Enclavement (accès au marché faible)",
  informel: "Marge de formalisation",
  emploi: "Besoin d'emplois (peu d'emplois par habitant)",
};

export type Action = "Désenclaver" | "Accélérer" | "Formaliser" | "Relancer" | "Consolider";
export const ACTION_ORDER: Action[] = ["Désenclaver", "Accélérer", "Formaliser", "Relancer", "Consolider"];
export const ACTION_TONE: Record<Action, "info" | "warn" | "good"> = {
  Désenclaver: "warn", Accélérer: "good", Formaliser: "info", Relancer: "warn", Consolider: "info",
};
export const CONSEILS: Record<Action, string> = {
  Désenclaver:
    "Fort potentiel mais difficile d'accès aux marchés. Priorité aux pistes rurales, ponts, points de collecte et stockage avant d'investir dans la production : sans route, la production reste invendue ou mal payée.",
  Accélérer:
    "Territoire dynamique et bien placé. Lever les derniers blocages : énergie, financement, transformation locale, appui à l'export. Fixer des objectifs chiffrés (emplois, exportations) et les suivre chaque trimestre.",
  Formaliser:
    "Beaucoup d'activité, peu visible. Simplifier l'immatriculation, créer un régime fiscal allégé pour les petits opérateurs, regrouper en coopératives et lier l'accès au crédit ou aux marchés publics à la formalisation.",
  Relancer:
    "Croissance faible. Identifier les causes (productivité, intrants, débouchés, infrastructures) avant d'investir. Une étude de filière courte et des projets pilotes évitent de financer ce qui ne marche pas.",
  Consolider:
    "Situation stable. Maintenir les acquis, améliorer la qualité et la productivité, et surveiller les risques (climat, prix mondiaux) plutôt que d'y concentrer de nouveaux fonds.",
};

export type Ligne = { unit: Unit; d: EcoData };
export type EcoNote = Ligne & { score: number; action: Action; emploiTaux: number };

/** Score de priorité 0-100 : opportunité (potentiel, croissance) + besoin (enclavement, informalité, peu d'emplois). */
export function noter(rows: Ligne[], p: Poids): EcoNote[] {
  if (!rows.length) return [];
  const taux = (d: EcoData) => (d.population > 0 ? (d.emplois / d.population) * 100 : 0);
  const ext = (f: (d: EcoData) => number) => {
    const v = rows.map((r) => f(r.d));
    return [Math.min(...v), Math.max(...v)] as const;
  };
  const n = (v: number, [a, b]: readonly [number, number]) => (b === a ? 0.5 : (v - a) / (b - a));
  const eP = ext((d) => d.potentiel), eC = ext((d) => d.croissance), eA = ext((d) => d.acces),
    eI = ext((d) => d.informel), eT = ext(taux);
  const total = Object.values(p).reduce((a, b) => a + b, 0) || 1;
  return rows
    .map(({ unit, d }) => {
      const s =
        (p.potentiel * n(d.potentiel, eP) + p.croissance * n(d.croissance, eC) + p.enclavement * (1 - n(d.acces, eA)) +
          p.informel * n(d.informel, eI) + p.emploi * (1 - n(taux(d), eT))) / total;
      const action: Action =
        d.potentiel >= 4 && d.acces < 50 ? "Désenclaver" : s >= 0.6 ? "Accélérer" : d.informel >= 70 ? "Formaliser" : d.croissance < 2 ? "Relancer" : "Consolider";
      return { unit, d, score: Math.round(s * 100), action, emploiTaux: taux(d) };
    })
    .sort((a, b) => b.score - a.score);
}

/* ===================== Simulation ===================== */

export type Hyp = { mult: number; cout: number; surcout: number };
// mult = richesse créée par Ariary investi ; cout = M Ar pour créer un emploi ; surcout = % de surcoût dans les zones enclavées
export const HYP_DEFAUT: Hyp = { mult: 1.3, cout: 25, surcout: 50 };
export const coutEmploi = (d: EcoData, h: Hyp) => Math.max(0.1, h.cout * (1 + (h.surcout / 100) * (1 - d.acces / 100)));
export const multiplicateur = (d: EcoData, h: Hyp) => h.mult * (0.8 + 0.1 * d.potentiel);
/** montant en milliards d'Ariary */
export const effets = (d: EcoData, montant: number, h: Hyp) => ({
  emplois: (montant * 1000) / coutEmploi(d, h),
  va: montant * multiplicateur(d, h),
});

export type Scenario = "habitant" | "priorite" | "emplois" | "perso";
export const SCENARIOS: Record<Exclude<Scenario, "perso">, { titre: string; desc: string }> = {
  habitant: { titre: "Par habitant", desc: "Chaque habitant reçoit la même part du budget. Le plus équitable." },
  priorite: { titre: "Selon la priorité", desc: "Plus de fonds aux territoires les mieux classés au diagnostic." },
  emplois: { titre: "Maximiser l'emploi", desc: "Plus de fonds là où un emploi coûte le moins cher." },
};

/** Parts du budget en % (somme ≈ 100) pour chaque territoire. */
export function repartir(notes: EcoNote[], sc: Exclude<Scenario, "perso">, h: Hyp): Record<string, number> {
  const w = notes.map((n) => (sc === "habitant" ? n.d.population : sc === "priorite" ? n.score : (1 / coutEmploi(n.d, h)) ** 2));
  const sum = w.reduce((a, b) => a + b, 0);
  return Object.fromEntries(notes.map((n, i) => [n.unit.key, Math.round((sum > 0 ? w[i] / sum : 1 / notes.length) * 1000) / 10]));
}
