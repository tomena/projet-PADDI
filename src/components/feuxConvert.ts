/* =====================================================================
   feuxConvert.ts : conversion Excel (Bases_Feux.xlsx) -> GeoJSON (Bases_Feux.geojson)
   Logique pure (sans React) : lecture tolérante des colonnes, validation,
   comparaison avec la base actuellement en ligne, génération du GeoJSON.
   ===================================================================== */

export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const COLONNES = ['District', 'AP', 'Année', 'Commune', ...MOIS, 'Total', 'Source'];
const OBLIGATOIRES = COLONNES.filter((c) => c !== 'Total');

// Aires protégées connues du tableau de bord (nom exact utilisé par la page)
export const AP_CONNUES = [
  "Montagne d'Ambre", 'Ankarana', 'Analamerana', 'Ankarafantsika',
  'Andohahela', 'Befotaka-Midongy', 'Marolambo',
];
const SOURCES = ['5km', 'Interieur', 'Commune'];

// Plage d'années gérée par le tableau de bord (constante ANNEES de la page)
export const ANNEE_MIN = 2020;
export const ANNEE_MAX = 2030;

export type Ligne = Record<string, string | number | null>;

export interface Rapport {
  erreurs: string[];          // bloquantes : l'import est impossible
  avertissements: string[];   // à lire, mais n'empêchent pas l'import
  lignes: Ligne[];            // lignes propres, prêtes pour le GeoJSON
  nbLues: number;
  annees: { annee: number; n: number }[];
  derniereAnnee: number | null;
  dernierMois: string | null; // dernier mois renseigné de la dernière année
  aires: string[];
  sources: Record<string, number>;
  diff: {
    ajoutees: number; supprimees: number; modifiees: number; identiques: number;
    anneesNouvelles: number[]; anneesDisparues: number[];
  } | null;
  risque: boolean;            // true => confirmation explicite demandée
}

/* ---------- Utilitaires ---------- */
const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const COL_PAR_CLE: Record<string, string> = Object.fromEntries(COLONNES.map((c) => [norm(c), c]));
const AP_PAR_CLE: Record<string, string> = Object.fromEntries(AP_CONNUES.map((a) => [norm(a), a]));
const SRC_PAR_CLE: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [norm(s), s]));

const arrondi = (n: number) => Math.round(n * 1e6) / 1e6; // supprime le bruit flottant (0.24000000000000002)

// null = cellule vide ; NaN = valeur illisible
function nombre(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? arrondi(v) : NaN;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? arrondi(n) : NaN;
}

const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const cle = (l: Ligne) => [l.District, l.AP, l['Année'], l.Commune, l.Source].join('|');
const egal = (a: unknown, b: unknown) =>
  (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-6);

function exemples(liste: string[], max = 6) {
  return liste.slice(0, max).join(' ; ') + (liste.length > max ? ` … (+${liste.length - max})` : '');
}

/* ---------- Conversion ---------- */
// `brut` : lignes de la feuille Excel (objets { entête: valeur })
// `actuel` : lignes de la base en ligne (propriétés des features), pour la comparaison
export function convertir(brut: Record<string, unknown>[], actuel: Ligne[] = []): Rapport {
  const r: Rapport = {
    erreurs: [], avertissements: [], lignes: [], nbLues: brut.length, annees: [],
    derniereAnnee: null, dernierMois: null, aires: [], sources: {}, diff: null, risque: false,
  };
  if (!brut.length) { r.erreurs.push('La feuille est vide : aucune ligne à importer.'); return r; }

  // 1) Entêtes : tolérance aux accents, majuscules, espaces (« Annee », « aout »…)
  const entetes = Object.keys(brut[0]);
  const carte: Record<string, string> = {};
  const ignorees: string[] = [];
  entetes.forEach((h) => { const c = COL_PAR_CLE[norm(h)]; if (c && !Object.values(carte).includes(c)) carte[h] = c; else ignorees.push(h); });
  const presentes = new Set(Object.values(carte));
  const manquantes = OBLIGATOIRES.filter((c) => !presentes.has(c));
  if (manquantes.length) {
    r.erreurs.push(`Colonnes manquantes : ${manquantes.join(', ')}. Vérifiez la ligne d'entêtes (ligne 1).`);
    return r;
  }
  if (ignorees.length) r.avertissements.push(`Colonnes ignorées (non utilisées par le tableau de bord) : ${ignorees.join(', ')}.`);

  // 2) Lignes
  const erreursLignes: string[] = [];
  const apInconnues = new Set<string>();
  const srcInconnues = new Set<string>();
  const anneesHors = new Set<number>();
  const vus = new Map<string, number>();
  let nbTotalRecalcule = 0;
  let nbTotalIncoherent = 0;
  const incoherents: string[] = [];
  let nbNegatifs = 0;

  brut.forEach((src, i) => {
    const n = i + 2; // numéro de ligne dans Excel
    const v: Record<string, unknown> = {};
    for (const h of Object.keys(carte)) v[carte[h]] = src[h];

    const vide = ['District', 'AP', 'Commune', 'Année'].every((c) => texte(v[c]) === '');
    if (vide) return; // ligne totalement vide

    const annee = nombre(v['Année']);
    if (annee === null || Number.isNaN(annee) || !Number.isInteger(annee)) { erreursLignes.push(`ligne ${n} : année invalide (« ${texte(v['Année'])} »)`); return; }

    const apBrut = texte(v.AP);
    if (!apBrut) { erreursLignes.push(`ligne ${n} : aire protégée (AP) vide`); return; }
    const ap = AP_PAR_CLE[norm(apBrut)] ?? apBrut;
    if (!AP_PAR_CLE[norm(apBrut)]) apInconnues.add(apBrut);

    const srcBrut = texte(v.Source);
    if (!srcBrut) { erreursLignes.push(`ligne ${n} : « Source » vide`); return; }
    const source = SRC_PAR_CLE[norm(srcBrut)] ?? srcBrut;
    if (!SRC_PAR_CLE[norm(srcBrut)]) srcInconnues.add(srcBrut);

    const commune = texte(v.Commune);
    if (!commune) { erreursLignes.push(`ligne ${n} : commune vide`); return; }

    let ok = true;
    const mois: (number | null)[] = MOIS.map((m) => {
      const x = nombre(v[m]);
      if (x !== null && Number.isNaN(x)) { erreursLignes.push(`ligne ${n} : valeur non numérique en « ${m} » (« ${texte(v[m])} »)`); ok = false; return null; }
      if (x !== null && x < 0) nbNegatifs++;
      return x;
    });
    if (!ok) return;

    const somme = arrondi(mois.reduce<number>((s, x) => s + (x ?? 0), 0));
    let total = nombre(v.Total);
    if (total !== null && Number.isNaN(total)) { erreursLignes.push(`ligne ${n} : « Total » non numérique (« ${texte(v.Total)} »)`); return; }
    if (total === null) { total = somme; nbTotalRecalcule++; }
    else if (Math.abs(total - somme) > 0.05) { nbTotalIncoherent++; if (incoherents.length < 6) incoherents.push(`ligne ${n}`); }

    if (annee < ANNEE_MIN || annee > ANNEE_MAX) anneesHors.add(annee);

    // Ordre des propriétés identique à la base actuelle
    const p: Ligne = { District: texte(v.District), AP: ap, 'Année': annee, Commune: commune };
    MOIS.forEach((m, k) => { p[m] = mois[k]; });
    p.Total = total;
    p.Source = source;

    const k = cle(p);
    if (vus.has(k)) { r.avertissements.push(`Doublon : ${commune} / ${ap} / ${annee} / ${source} (lignes ${vus.get(k)} et ${n}).`); }
    else vus.set(k, n);
    r.lignes.push(p);
  });

  if (erreursLignes.length) r.erreurs.push(`${erreursLignes.length} ligne(s) à corriger dans l'Excel : ${exemples(erreursLignes)}.`);
  if (!r.lignes.length && !r.erreurs.length) r.erreurs.push('Aucune ligne exploitable trouvée.');

  if (apInconnues.size) r.avertissements.push(`Aire(s) protégée(s) inconnue(s) du tableau de bord (non affichées dans les graphiques) : ${[...apInconnues].join(', ')}.`);
  if (srcInconnues.size) r.avertissements.push(`Valeur(s) « Source » inattendue(s) : ${[...srcInconnues].join(', ')} (attendu : 5km, Interieur, Commune).`);
  if (anneesHors.size) r.avertissements.push(`Année(s) hors de la plage du tableau de bord (${ANNEE_MIN}-${ANNEE_MAX}) : ${[...anneesHors].sort().join(', ')}.`);
  if (nbTotalRecalcule) r.avertissements.push(`${nbTotalRecalcule} ligne(s) sans « Total » : somme des mois utilisée.`);
  if (nbTotalIncoherent) r.avertissements.push(`${nbTotalIncoherent} ligne(s) où « Total » ≠ somme des mois (${incoherents.join(', ')}…). La valeur du « Total » de l'Excel est conservée.`);
  if (nbNegatifs) r.avertissements.push(`${nbNegatifs} valeur(s) négative(s) détectée(s).`);

  /* 3) Statistiques */
  const parAnnee = new Map<number, number>();
  const aires = new Set<string>();
  r.lignes.forEach((l) => {
    const a = Number(l['Année']);
    parAnnee.set(a, (parAnnee.get(a) ?? 0) + 1);
    aires.add(String(l.AP));
    r.sources[String(l.Source)] = (r.sources[String(l.Source)] ?? 0) + 1;
  });
  r.annees = [...parAnnee].map(([annee, n]) => ({ annee, n })).sort((a, b) => a.annee - b.annee);
  r.aires = [...aires].sort();
  r.derniereAnnee = r.annees.length ? r.annees[r.annees.length - 1].annee : null;
  if (r.derniereAnnee !== null) {
    const dern = r.lignes.filter((l) => Number(l['Année']) === r.derniereAnnee);
    let idx = -1;
    MOIS.forEach((m, k) => { if (dern.some((l) => l[m] !== null)) idx = k; });
    r.dernierMois = idx >= 0 ? MOIS[idx] : null;
  }

  /* 4) Comparaison avec la base en ligne */
  if (actuel.length) {
    const ancien = new Map(actuel.map((l) => [cle(l), l]));
    const nouveau = new Map(r.lignes.map((l) => [cle(l), l]));
    let ajoutees = 0, modifiees = 0, identiques = 0;
    nouveau.forEach((l, k) => {
      const a = ancien.get(k);
      if (!a) { ajoutees++; return; }
      [...MOIS, 'Total'].every((c) => egal(a[c], l[c])) ? identiques++ : modifiees++;
    });
    let supprimees = 0;
    ancien.forEach((_, k) => { if (!nouveau.has(k)) supprimees++; });
    const anAct = new Set(actuel.map((l) => Number(l['Année'])));
    const anNew = new Set(r.lignes.map((l) => Number(l['Année'])));
    const anneesNouvelles = [...anNew].filter((a) => !anAct.has(a)).sort();
    const anneesDisparues = [...anAct].filter((a) => !anNew.has(a)).sort();
    r.diff = { ajoutees, supprimees, modifiees, identiques, anneesNouvelles, anneesDisparues };
    r.risque = supprimees > 0 || anneesDisparues.length > 0 || r.lignes.length < actuel.length * 0.9;
    if (supprimees > 0) r.avertissements.push(`${supprimees} ligne(s) de la base actuelle n'existent plus dans ce fichier : elles seront supprimées.`);
    if (anneesDisparues.length) r.avertissements.push(`Année(s) présente(s) dans la base actuelle mais absente(s) du fichier : ${anneesDisparues.join(', ')}.`);
  }
  return r;
}

/* ---------- Génération du GeoJSON (même structure que le fichier actuel) ---------- */
export function versGeoJSON(lignes: Ligne[]) {
  return {
    type: 'FeatureCollection',
    name: 'Bases_Feux',
    features: lignes.map((p) => ({ type: 'Feature', properties: p, geometry: null })),
  };
}

// Une feature par ligne : fichier lisible et compact
export function serialiser(geo: ReturnType<typeof versGeoJSON>) {
  return `{\n"type": "FeatureCollection",\n"name": "Bases_Feux",\n"features": [\n${geo.features
    .map((f) => JSON.stringify(f))
    .join(',\n')}\n]\n}\n`;
}
