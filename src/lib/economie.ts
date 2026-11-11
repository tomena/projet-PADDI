import { usePersistedState } from "./analyse-utils";

/** Un secteur de l'économie. Unités : va = milliards d'Ariary, emplois = milliers. */
export type Secteur = {
  id: string;
  nom: string;
  va: number; // valeur ajoutée (Md Ar)
  emplois: number; // milliers d'emplois
  croissance: number; // % par an
  exportation: number; // % de la production exportée
  informel: number; // % d'emplois informels
  potentiel: number; // 1 (faible) à 5 (fort) : avis d'expert / étude de filière
};

// ⚠ CHIFFRES ILLUSTRATIFS : à remplacer par INSTAT, BFM, Banque mondiale, ministères.
export const EXEMPLE: Secteur[] = [
  { id: "agri", nom: "Agriculture & élevage", va: 9000, emplois: 4800, croissance: 2.5, exportation: 12, informel: 95, potentiel: 4 },
  { id: "peche", nom: "Pêche & aquaculture", va: 1200, emplois: 450, croissance: 3, exportation: 55, informel: 80, potentiel: 4 },
  { id: "mines", nom: "Mines & carrières", va: 2500, emplois: 120, croissance: 6, exportation: 85, informel: 40, potentiel: 4 },
  { id: "textile", nom: "Industrie (zones franches)", va: 1800, emplois: 200, croissance: 4, exportation: 90, informel: 15, potentiel: 3 },
  { id: "tourisme", nom: "Tourisme", va: 1500, emplois: 180, croissance: 5, exportation: 40, informel: 60, potentiel: 5 },
  { id: "services", nom: "Commerce & services", va: 11000, emplois: 1500, croissance: 3.5, exportation: 3, informel: 85, potentiel: 3 },
  { id: "energie", nom: "Énergie", va: 700, emplois: 30, croissance: 3, exportation: 0, informel: 10, potentiel: 5 },
  { id: "btp", nom: "BTP", va: 2200, emplois: 350, croissance: 3.2, exportation: 0, informel: 75, potentiel: 3 },
];

export const MODELE_CSV =
  "nom;va;emplois;croissance;exportation;informel;potentiel\n" +
  "Agriculture & élevage;9000;4800;2,5;12;95;4\n" +
  "Tourisme;1500;180;5;40;60;5\n";

export const KEY_SECTEURS = "paddi.economie.secteurs";
export const KEY_POIDS = "paddi.economie.poids";

export const useSecteurs = () => usePersistedState<Secteur[]>(KEY_SECTEURS, EXEMPLE);

export type Poids = {
  croissance: number;
  potentiel: number;
  emploi: number;
  exportation: number;
  formalisation: number;
};
export const POIDS_DEFAUT: Poids = { croissance: 25, potentiel: 25, emploi: 20, exportation: 15, formalisation: 15 };
export const POIDS_LABELS: Record<keyof Poids, string> = {
  croissance: "Dynamique de croissance",
  potentiel: "Potentiel de la filière",
  emploi: "Emplois créés par Ariary investi",
  exportation: "Entrée de devises (export)",
  formalisation: "Marge de formalisation (recettes fiscales)",
};

export type Action = "Accélérer" | "Formaliser" | "Restructurer" | "Consolider";
export type SecteurNote = Secteur & { score: number; action: Action; intensite: number };

export const CONSEILS: Record<Action, string> = {
  Accélérer:
    "Secteur à fort effet d'entraînement. Prioriser l'investissement public qui lève les blocages : énergie, routes, accès au financement, appui à l'export. Fixer des objectifs chiffrés (emplois, exportations) et les suivre chaque trimestre.",
  Formaliser:
    "Beaucoup d'activité mais peu visible. Simplifier l'immatriculation, créer un régime fiscal allégé pour les petits opérateurs, regrouper en coopératives et lier l'accès au crédit ou aux marchés publics à la formalisation.",
  Restructurer:
    "Croissance faible. Identifier les causes (productivité, intrants, débouchés, infrastructures) avant d'investir. Une étude de filière courte et des projets pilotes évitent de financer ce qui ne marche pas.",
  Consolider:
    "Secteur stable. Maintenir les acquis, améliorer la qualité et la productivité, et surveiller les risques (climat, prix mondiaux) plutôt que d'y concentrer de nouveaux fonds.",
};

export function noter(rows: Secteur[], p: Poids): SecteurNote[] {
  if (!rows.length) return [];
  const intensite = (s: Secteur) => (s.va > 0 ? s.emplois / s.va : 0);
  const ext = (f: (s: Secteur) => number) => {
    const v = rows.map(f);
    return [Math.min(...v), Math.max(...v)] as const;
  };
  const n = (v: number, [a, b]: readonly [number, number]) => (b === a ? 0.5 : (v - a) / (b - a));
  const eC = ext((s) => s.croissance);
  const eP = ext((s) => s.potentiel);
  const eE = ext(intensite);
  const eX = ext((s) => s.exportation);
  const eF = ext((s) => s.informel);
  const total = Object.values(p).reduce((a, b) => a + b, 0) || 1;

  return rows
    .map((s) => {
      const sc =
        (p.croissance * n(s.croissance, eC) +
          p.potentiel * n(s.potentiel, eP) +
          p.emploi * n(intensite(s), eE) +
          p.exportation * n(s.exportation, eX) +
          p.formalisation * n(s.informel, eF)) /
        total;
      const action: Action =
        sc >= 0.6 ? "Accélérer" : s.informel >= 60 ? "Formaliser" : s.croissance < 2 ? "Restructurer" : "Consolider";
      return { ...s, score: Math.round(sc * 100), intensite: intensite(s), action };
    })
    .sort((a, b) => b.score - a.score);
}
