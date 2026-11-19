/**
 * communeFeux.ts — analyse d'une commune à partir de la base des feux (Bases_Feux)
 * et des points de feux satellite (FIRMS). Logique pure, sans React : testable seule.
 *
 * Lignes attendues (propriétés du GeoJSON) : Commune, AP, Année, Source (Commune | 5km | Interieur),
 * Janvier … Décembre (null si le mois n'est pas encore renseigné), Total.
 *
 * Ce que la base mesure (vérifié sur les données) :
 *  - « Commune »   : hectares brûlés sur toute la commune ;
 *  - « Interieur » : hectares brûlés DANS l'aire protégée (toujours ≤ Commune : c'est un sous-ensemble) ;
 *  - « 5km »       : hectares brûlés dans la zone tampon de 5 km, qui DÉBORDE du territoire communal
 *                    (elle peut dépasser la valeur Commune) : ne jamais l'exprimer en % de la commune.
 *
 * Principes statistiques :
 *  - un mois vide reste vide (null), jamais 0 ; l'année en cours est comparée à la MÊME période des années complètes ;
 *  - petits échantillons (6 à 7 années) : médiane et rang en plus de la moyenne ; tendance par test de Mann-Kendall
 *    EXACT (pas d'approximation normale) + pente de Theil-Sen, jamais par simple comparaison de deux moitiés ;
 *  - « pas de tendance détectable » n'est pas « stable » : avec 6 points, seule une évolution très nette est détectée ;
 *  - aucune phrase n'est produite sur une donnée absente.
 */

export const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/** Tous les seuils de décision au même endroit : à ajuster avec l'équipe. */
export const CFG = {
  REF_DEBUT: 2020, REF_FIN: 2024,   // période de référence (moyenne historique)
  MIN_ANNEES_REF: 3,                // minimum d'années complètes pour parler de « référence »
  MIN_ANNEES_TENDANCE: 5,           // minimum d'années complètes pour tester une tendance
  P_TENDANCE: 0.10, P_TENDANCE_FORTE: 0.05, PENTE_MIN_PCT: 3, // tendance : seuil p, p « fort », pente minimale (% de la médiane / an)
  ECART_FORT: 25, ECART_NET: 10,    // écart (%) à la référence : « très au-dessus » / « au-dessus »
  RATIO_FORT: 1.3, RATIO_NET: 1.1,  // idem pour l'année incomplète (rapport à la même période)
  CV_IRREGULIER: 0.6,               // coefficient de variation interannuel au-delà duquel « il n'y a pas d'année normale »
  SEUIL_INTERIEUR_HA: 1,            // sous ce niveau, pas de feu significatif dans l'aire protégée
  INTERIEUR_FORT_HA: 500,           // feux réguliers dans l'aire protégée
  PERIPHERIE_HA: 200,               // zone tampon : à partir de quand on la commente
  RANG_PRIORITAIRE: 3,              // « parmi les N communes les plus touchées de l'AP »
  FRP_HA_PAR_MW: null as number | null, // conversion MW → ha : laisser null tant qu'elle n'est pas calibrée sur la base
};
export const REF_DEBUT = CFG.REF_DEBUT, REF_FIN = CFG.REF_FIN, SEUIL_INTERIEUR_HA = CFG.SEUIL_INTERIEUR_HA;

export type Tend = "hausse" | "baisse" | "stable" | null;
export type Lvl = "haute" | "moyenne" | "info";
type Mois12 = (number | null)[];

/* ===================== OUTILS ===================== */

const src = (p: any) => String(p?.Source ?? "").trim().toLowerCase();
const val = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const complet = (m?: Mois12) => !!m && m.length === 12 && m.every((v) => v != null);
const somme = (m: Mois12, n = 12) => m.slice(0, n).reduce<number>((s, v) => s + (v ?? 0), 0);
const moyenne = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);
const mediane = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b), h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const ecartType = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = moyenne(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
};
const dernierRempli = (m: Mois12) => m.reduce<number>((l, v, i) => (v != null ? i : l), -1);
const erf = (x: number) => {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
};
const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function serie(rows: any[], source: string): Map<number, Mois12> {
  const out = new Map<number, Mois12>();
  for (const p of rows) {
    if (src(p) !== source) continue;
    const an = Number(p["Année"]);
    if (!Number.isFinite(an)) continue;
    const mois = MOIS.map((k) => val(p[k])), cur = out.get(an);
    out.set(an, cur ? mois.map((v, i) => (v == null ? cur[i] : cur[i] == null ? v : Math.max(v, cur[i] as number))) : mois);
  }
  return out;
}

/** Test de Mann-Kendall. Loi EXACTE (dénombrement des permutations) jusqu'à 10 points, normale au-delà. */
export function mannKendall(v: number[]): { S: number; tau: number; p: number } {
  const n = v.length, tot = (n * (n - 1)) / 2;
  let S = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) S += Math.sign(v[j] - v[i]);
  if (n < 3) return { S, tau: tot ? S / tot : 0, p: 1 };
  let p: number;
  if (n <= 10) {
    let dp = [1];                                   // nombre de permutations de m éléments ayant k inversions
    for (let m = 2; m <= n; m++) {
      const nd = new Array(dp.length + m - 1).fill(0);
      for (let k = 0; k < dp.length; k++) for (let j = 0; j < m; j++) nd[k + j] += dp[k];
      dp = nd;
    }
    const all = dp.reduce((s, x) => s + x, 0);
    let c = 0;
    dp.forEach((cnt, k) => { if (Math.abs(tot - 2 * k) >= Math.abs(S)) c += cnt; });
    p = c / all;
  } else {
    const sd = Math.sqrt((n * (n - 1) * (2 * n + 5)) / 18);
    p = S === 0 ? 1 : 2 * (1 - phi((Math.abs(S) - 1) / sd));
  }
  return { S, tau: S / tot, p: Math.min(1, p) };
}

function theilSen(pts: { an: number; ha: number }[]): number | null {
  const s: number[] = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++)
    if (pts[j].an !== pts[i].an) s.push((pts[j].ha - pts[i].ha) / (pts[j].an - pts[i].an));
  return s.length ? mediane(s) : null;
}

export type Trend = {
  tend: Tend; force: "forte" | "indicative" | "non" | null;
  tau: number | null; p: number | null; pente: number | null; penteRel: number | null; n: number;
};
function tendance(pts: { an: number; ha: number }[]): Trend {
  const n = pts.length;
  if (n < CFG.MIN_ANNEES_TENDANCE) return { tend: null, force: null, tau: null, p: null, pente: null, penteRel: null, n };
  const mk = mannKendall(pts.map((x) => x.ha)), pente = theilSen(pts), med = mediane(pts.map((x) => x.ha));
  const penteRel = pente != null && med > 0 ? (pente / med) * 100 : null;
  const net = mk.p <= CFG.P_TENDANCE && (penteRel == null ? !!pente : Math.abs(penteRel) >= CFG.PENTE_MIN_PCT);
  return {
    tend: net ? ((pente ?? 0) > 0 ? "hausse" : "baisse") : "stable",
    force: net ? (mk.p <= CFG.P_TENDANCE_FORTE ? "forte" : "indicative") : "non",
    tau: mk.tau, p: mk.p, pente, penteRel, n,
  };
}

/** Sur les n premiers mois de l'année `y` : valeur de l'année vs moyenne des années de référence complètes. */
function vsPeriode(S: Map<number, Mois12>, y: number, dm: number): { ha: number; ref: number; ratio: number | null } | null {
  const m = S.get(y);
  if (!m || dm < 0 || m.slice(0, dm + 1).some((v) => v == null)) return null;
  const refs = [...S.entries()].filter(([an, mm]) => an >= CFG.REF_DEBUT && an <= CFG.REF_FIN && an !== y && complet(mm)).map(([, mm]) => somme(mm, dm + 1));
  if (refs.length < CFG.MIN_ANNEES_REF) return null;
  const ref = moyenne(refs), ha = somme(m, dm + 1);
  return { ha, ref, ratio: ref > 0 ? ha / ref : null };
}

/* ===================== ANALYSE DE LA BASE ===================== */

export type Annee = { annee: number; ha: number; complet: boolean; dernierMois: number; trou: boolean; interieur: number | null; peripherie: number | null };
export type Per = { ha: number; ref: number; ratio: number | null };
export type CommuneAnalyse = {
  annees: Annee[];
  anneeSel: Annee | null;
  ref: { moy: number; med: number; min: number; max: number; n: number } | null;
  stats: { moy: number; med: number; min: number; max: number; n: number; cv: number | null } | null; // toutes années complètes
  moyRef: number | null;
  vsRef: number | null;                                  // % si l'année choisie est complète
  memePeriode: { ha: number; ref: number; ratio: number | null; dernierMois: number } | null; // si elle est incomplète
  rang: { rang: number; sur: number; memePeriode: boolean } | null; // 1 = année la plus touchée
  projection: { ha: number; bas: number; haut: number; reste: number; part: number; vsRef: number | null; dernierMois: number } | null;
  mensuel: { m: number; sel: number | null; prec: number | null; moy: number | null }[];
  heat: { annee: number; mois: Mois12 }[];
  maxCell: { annee: number; m: number; ha: number; partAnnee: number } | null;
  saison: { debut: number; fin: number; pic: number; part: number; m50: number; picFreq: { mois: number; n: number; sur: number } } | null;
  trend: Trend;
  tendance: Tend; moyDebut: number; moyFin: number;       // (compatibilité)
  recurrence: { n: number; sur: number };
  moyHa: number;
  pctSup: number | null; pctSupSel: number | null; incoherent: boolean;
  interieur: { moy: number; touchees: number; sur: number } | null;
  partInterieur: number | null;                           // % du brûlé de la commune situé dans l'AP (années complètes) : vraie part, ≤ 100
  partPeripherie: number | null;                          // zone 5 km / commune, en % (années complètes) : RAPPORT, peut dépasser 100
  pctSel: { interieur: number | null; peripherie: number | null; partiel: boolean; dernierMois: number } | null; // année choisie (même période si incomplète)
  interieurPer: Per | null;                               // année choisie vs référence, même période
  peripherie: { moy: number } | null;
  peripheriePer: Per | null;
  derniere: { annee: number; mois: number } | null;
  qualite: { nComplet: number; premiere: number | null; recente: boolean; trous: { commune: number[]; interieur: number[]; tampon: number[] }; confiance: "haute" | "moyenne" | "faible" };
};

export function analyserCommune(rows: any[], annee: number, superficieHa: number | null, nowMs: number = Date.now()): CommuneAnalyse {
  const C = serie(rows, "commune"), I = serie(rows, "interieur"), B = serie(rows, "5km");
  const anCourant = new Date(nowMs).getFullYear();
  const ans = [...C.keys()].sort((a, b) => a - b);
  const sup = superficieHa && superficieHa > 0 ? superficieHa : null;

  const annees: Annee[] = ans.map((y) => {
    const m = C.get(y)!, ok = complet(m);
    return {
      annee: y, ha: somme(m), complet: ok, dernierMois: dernierRempli(m), trou: !ok && y < anCourant,
      interieur: ok && I.has(y) && complet(I.get(y)) ? somme(I.get(y)!) : null,
      peripherie: ok && B.has(y) && complet(B.get(y)) ? somme(B.get(y)!) : null,
    };
  });
  const cmpl = annees.filter((a) => a.complet);
  const ha = cmpl.map((a) => a.ha);
  const moyHa = moyenne(ha);
  const anneeSel = annees.find((a) => a.annee === annee) ?? null;

  const stats = cmpl.length ? {
    moy: moyHa, med: mediane(ha), min: Math.min(...ha), max: Math.max(...ha), n: ha.length,
    cv: ha.length >= 3 && moyHa > 0 ? ecartType(ha) / moyHa : null,
  } : null;

  const refs = cmpl.filter((a) => a.annee >= CFG.REF_DEBUT && a.annee <= CFG.REF_FIN);
  const refHa = refs.map((a) => a.ha);
  const ref = refs.length >= CFG.MIN_ANNEES_REF ? { moy: moyenne(refHa), med: mediane(refHa), min: Math.min(...refHa), max: Math.max(...refHa), n: refs.length } : null;
  const moyRef = ref ? ref.moy : null;
  const vsRef = anneeSel?.complet && moyRef != null && moyRef > 0 ? ((anneeSel.ha - moyRef) / moyRef) * 100 : null;

  let memePeriode: CommuneAnalyse["memePeriode"] = null;
  if (anneeSel && !anneeSel.complet && anneeSel.dernierMois >= 0 && ref) {
    const dm = anneeSel.dernierMois, n = dm + 1;
    const r = moyenne(refs.map((a) => somme(C.get(a.annee)!, n)));
    memePeriode = { ha: anneeSel.ha, ref: r, ratio: r > 0 ? anneeSel.ha / r : null, dernierMois: dm };
  }

  // Rang de l'année choisie (même période si l'année est incomplète)
  let rang: CommuneAnalyse["rang"] = null;
  if (anneeSel && cmpl.length >= CFG.MIN_ANNEES_REF && anneeSel.dernierMois >= 0) {
    const dm = anneeSel.complet ? 11 : anneeSel.dernierMois;
    const pool = cmpl.filter((a) => a.annee !== anneeSel.annee).map((a) => somme(C.get(a.annee)!, dm + 1));
    const v = somme(C.get(anneeSel.annee)!, dm + 1);
    rang = { rang: 1 + pool.filter((x) => x > v).length, sur: pool.length + 1, memePeriode: !anneeSel.complet };
  }

  // Projection de fin d'année (année incomplète) : le début d'année représente, d'ordinaire, une part stable du total
  let projection: CommuneAnalyse["projection"] = null;
  if (anneeSel && !anneeSel.complet && anneeSel.dernierMois >= 2 && cmpl.length >= CFG.MIN_ANNEES_REF) {
    const n = anneeSel.dernierMois + 1;
    const parts = cmpl.map((a) => { const m = C.get(a.annee)!, t = somme(m); return t > 0 ? somme(m, n) / t : null; }).filter((x): x is number => x != null && x > 0);
    if (parts.length >= CFG.MIN_ANNEES_REF) {
      const pm = moyenne(parts), h0 = anneeSel.ha, est = h0 / pm;
      projection = {
        ha: est, bas: h0 / Math.max(...parts), haut: h0 / Math.min(...parts), reste: Math.max(0, est - h0), part: pm * 100,
        vsRef: ref && ref.moy > 0 ? ((est - ref.moy) / ref.moy) * 100 : null, dernierMois: anneeSel.dernierMois,
      };
    }
  }

  // Saisonnalité (profil moyen des années complètes)
  const profil = cmpl.length >= 2 ? Array.from({ length: 12 }, (_, m) => moyenne(cmpl.map((a) => C.get(a.annee)![m] as number))) : null;
  const mensuel = MOIS.map((_, m) => ({ m, sel: C.get(annee)?.[m] ?? null, prec: C.get(annee - 1)?.[m] ?? null, moy: profil ? profil[m] : null }));

  let saison: CommuneAnalyse["saison"] = null;
  const tot = profil ? profil.reduce((s, x) => s + x, 0) : 0;
  if (profil && tot > 0) {
    let debut = 0, best = -1;
    for (let s = 0; s < 12; s++) {
      const x = profil[s] + profil[(s + 1) % 12] + profil[(s + 2) % 12];
      if (x > best) { best = x; debut = s; }
    }
    let acc = 0, m50 = 0;
    for (let m = 0; m < 12; m++) { acc += profil[m]; if (acc >= tot / 2) { m50 = m; break; } }
    const picsAn = cmpl.filter((a) => a.ha > 0).map((a) => { const mm = C.get(a.annee)! as number[]; return mm.indexOf(Math.max(...mm)); });
    const freq = new Map<number, number>();
    picsAn.forEach((m) => freq.set(m, (freq.get(m) ?? 0) + 1));
    const [mf, nf] = [...freq.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0] ?? [0, 0];
    saison = { debut, fin: (debut + 2) % 12, pic: profil.indexOf(Math.max(...profil)), part: (best / tot) * 100, m50, picFreq: { mois: mf, n: nf, sur: picsAn.length } };
  }

  // Case (année × mois) la plus brûlée
  let maxCell: CommuneAnalyse["maxCell"] = null;
  for (const y of ans) C.get(y)!.forEach((v, m) => {
    if (v != null && (!maxCell || v > maxCell.ha)) { const t = somme(C.get(y)!); maxCell = { annee: y, m, ha: v, partAnnee: t > 0 ? (v / t) * 100 : 0 }; }
  });

  const h = Math.floor(ha.length / 2);
  const incoherent = sup != null && ha.length > 0 && Math.max(...ha) > sup * 1.05;

  // Aire protégée et zone tampon : années complètes
  const iv = [...I.entries()].filter(([, m]) => complet(m)).map(([, m]) => somme(m));
  const bv = [...B.entries()].filter(([, m]) => complet(m)).map(([, m]) => somme(m));
  const both = cmpl.filter((a) => a.interieur != null && a.ha > 0);
  const partInterieur = both.length >= 2 ? (both.reduce((s, a) => s + (a.interieur as number), 0) / both.reduce((s, a) => s + a.ha, 0)) * 100 : null;
  const dmSel = anneeSel ? (anneeSel.complet ? 11 : anneeSel.dernierMois) : -1;
  const bothB = cmpl.filter((a) => a.peripherie != null && a.ha > 0);
  const partPeripherie = bothB.length >= 2 ? (bothB.reduce((s, a) => s + (a.peripherie as number), 0) / bothB.reduce((s, a) => s + a.ha, 0)) * 100 : null;
  const comSel = anneeSel && dmSel >= 0 ? somme(C.get(annee)!, dmSel + 1) : 0;
  const iPer = vsPeriode(I, annee, dmSel), bPer = vsPeriode(B, annee, dmSel);
  const pctSel = anneeSel && comSel > 0 && (iPer || bPer)
    ? { interieur: iPer ? (iPer.ha / comSel) * 100 : null, peripherie: bPer ? (bPer.ha / comSel) * 100 : null, partiel: !anneeSel.complet, dernierMois: dmSel }
    : null;

  let derniere: CommuneAnalyse["derniere"] = null;
  for (const y of [...ans].reverse()) {
    const d = dernierRempli(C.get(y)!);
    if (d >= 0) { derniere = { annee: y, mois: d }; break; }
  }

  const trousDe = (S: Map<number, Mois12>) => [...S.entries()].filter(([y, m]) => y < anCourant && !complet(m)).map(([y]) => y).sort();
  const trous = { commune: trousDe(C), interieur: trousDe(I), tampon: trousDe(B) };
  const premiere = ans[0] ?? null;
  const nTrous = trous.commune.length + trous.interieur.length + trous.tampon.length;
  const confiance: "haute" | "moyenne" | "faible" = cmpl.length >= 6 && !nTrous ? "haute" : cmpl.length >= 4 ? "moyenne" : "faible";

  const trend = tendance(cmpl.map((a) => ({ an: a.annee, ha: a.ha })));
  return {
    annees, anneeSel, ref, stats, moyRef, vsRef, memePeriode, rang, projection, mensuel,
    heat: ans.map((y) => ({ annee: y, mois: C.get(y)! })), maxCell, saison,
    trend, tendance: trend.tend, moyDebut: moyenne(ha.slice(0, h)), moyFin: moyenne(ha.slice(ha.length - h)),
    recurrence: { n: ha.filter((x) => x > 0).length, sur: ha.length },
    moyHa,
    pctSup: sup && !incoherent ? (moyHa / sup) * 100 : null,
    pctSupSel: sup && anneeSel && !incoherent ? (anneeSel.ha / sup) * 100 : null,
    incoherent,
    interieur: iv.length ? { moy: moyenne(iv), touchees: iv.filter((x) => x > 0).length, sur: iv.length } : null,
    partInterieur, partPeripherie, pctSel,
    interieurPer: iPer,
    peripherie: bv.length ? { moy: moyenne(bv) } : null,
    peripheriePer: bPer,
    derniere,
    qualite: { nComplet: cmpl.length, premiere, recente: premiere != null && premiere > CFG.REF_DEBUT, trous, confiance },
  };
}

/* ===================== POINTS DE FEUX (satellite) ===================== */

export type Bilan = {
  total: number; n24: number; n24_48: number; n48: number; n72: number;
  frpTotal: number; frpMax: number | null;
  premier: number | null; dernier: number | null; ageMin: number | null;
  accel: "hausse" | "baisse" | "stable" | null;    // dernières 24 h comparées aux 24 h d'avant
  largeurH: number;
  bins: { de: number; a: number; n: number }[];   // du plus récent au plus ancien
  densite: number | null;                          // détections pour 100 km² sur 72 h
};

/** pts : points DÉJÀ filtrés sur la commune, avec leur âge en heures. fenetreH : âge du plus ancien point connu (toutes zones). */
export function bilanPoints(pts: { t: number; age: number; frp: number | null }[], fenetreH: number, superficieHa: number | null): Bilan {
  const largeurH = fenetreH <= 80 ? 6 : 24;
  const nb = Math.min(40, Math.max(1, Math.ceil(fenetreH / largeurH)));
  const bins = Array.from({ length: nb }, (_, i) => ({ de: i * largeurH, a: (i + 1) * largeurH, n: 0 }));
  let frpTotal = 0, frpMax: number | null = null;
  for (const p of pts) {
    bins[Math.min(nb - 1, Math.max(0, Math.floor(p.age / largeurH)))].n++;
    if (p.frp != null) { frpTotal += p.frp; frpMax = frpMax == null ? p.frp : Math.max(frpMax, p.frp); }
  }
  const n24 = pts.filter((p) => p.age <= 24).length;
  const n24_48 = pts.filter((p) => p.age > 24 && p.age <= 48).length;
  const n72 = pts.filter((p) => p.age <= 72).length;
  return {
    total: pts.length, n24, n24_48, n48: n24 + n24_48, n72,
    frpTotal, frpMax,
    premier: pts.length ? Math.min(...pts.map((p) => p.t)) : null,
    dernier: pts.length ? Math.max(...pts.map((p) => p.t)) : null,
    ageMin: pts.length ? Math.min(...pts.map((p) => p.age)) : null,
    accel: n24 + n24_48 === 0 ? null : n24 >= Math.max(n24_48 * 1.5, n24_48 + 2) ? "hausse" : n24_48 >= Math.max(n24 * 1.5, n24 + 2) ? "baisse" : "stable",
    largeurH, bins,
    densite: superficieHa && superficieHa > 0 ? (n72 / (superficieHa / 100)) * 100 : null,
  };
}

/* ===================== RAPPORT : constats, niveau de priorité, actions, lecture des graphes ===================== */

export type Hz = "now" | "pre" | "post" | "data";
export type Act = { hz: Hz; s: string };
export type Item = { k: string; lvl: Lvl; t: string; d: string; acts?: Act[] };
export type Niveau = "critique" | "eleve" | "modere" | "faible";
export type Lecture = { cle: string; lignes: string[] };
export type Rapport = {
  niveau: Niveau;
  declencheurs: string[];                  // critères réunis : ils expliquent le niveau
  confiance: "haute" | "moyenne" | "faible";
  cles: Item[];                            // 3 à 4 messages à retenir
  points: Item[];                          // tous les constats, du plus urgent au moins urgent
  qualite: Item[];                         // limites et problèmes de données
  actions: { hz: Hz; items: string[] }[];
  lectures: { mensuel: Lecture; historique: Lecture; heat: Lecture; satellite: Lecture | null };
};
export type CtxLecture = {
  commune: string; ap: string; annee: number; rang: number; de: number; partAP: number | null;
  nowMs: number; moisLongs: string[]; geometrieOk: boolean; fenetreH: number;
};

const LVL: Record<Lvl, number> = { haute: 0, moyenne: 1, info: 2 };
const HZ_ORDER: Hz[] = ["now", "pre", "post", "data"];

export function rapport(a: CommuneAnalyse, b: Bilan | null, c: CtxLecture, lang: string): Rapport {
  const en = lang === "en", loc = en ? "en-GB" : "fr-FR";
  const L = (fr: string, e: string) => (en ? e : fr);
  const N = (n: number, d = 0) => n.toLocaleString(loc, { maximumFractionDigits: d });
  const Pc = (n: number) => N(n, n < 10 ? 1 : 0); // pourcentage : une décimale sous 10 %
  const S = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${N(Math.abs(n), Math.abs(n) < 10 ? 1 : 0)} %`;
  const Pv = (p: number) => (p < 0.001 ? "< 0.001" : N(p, 3));
  const M = (m: number) => c.moisLongs[m] ?? MOIS[m];
  const De = (m: number) => (en ? M(m) : /^[aeiouyéèh]/i.test(M(m)) ? `d'${M(m)}` : `de ${M(m)}`); // « de mars » / « d'août »
  const now = new Date(c.nowMs), moisNow = now.getMonth();
  const REF = `${CFG.REF_DEBUT}–${CFG.REF_FIN}`;
  const dureeTxt = (h: number) => (h >= 48 ? `${Math.round(h / 24)} ${L("jours", "days")}` : `${Math.max(1, Math.round(h))} h`);

  const pts: Item[] = [], qual: Item[] = [], trig: string[] = [];
  const add = (arr: Item[], k: string, lvl: Lvl, t: string, d: string, acts?: Act[]) => arr.push({ k, lvl, t, d, acts });
  const s = a.anneeSel;
  const rangTxt = a.rang ? L(`Rang ${a.rang.rang}/${a.rang.sur} (1 = la plus touchée${a.rang.memePeriode ? ", sur la même période" : ""}).`, `Rank ${a.rang.rang}/${a.rang.sur} (1 = most affected${a.rang.memePeriode ? ", same period" : ""}).`) : "";

  /* ---- Position dans l'aire protégée ---- */
  if (c.rang > 0 && c.partAP != null) {
    if (c.rang <= CFG.RANG_PRIORITAIRE) trig.push(L(`Parmi les ${CFG.RANG_PRIORITAIRE} communes les plus touchées de l'AP`, `Among the ${CFG.RANG_PRIORITAIRE} most affected communes of the PA`));
    add(pts, "pos", c.rang <= CFG.RANG_PRIORITAIRE ? "haute" : c.rang <= 6 ? "moyenne" : "info",
      L(`${c.commune} : n° ${c.rang} sur ${c.de} dans ${c.ap}`, `${c.commune}: no. ${c.rang} of ${c.de} in ${c.ap}`),
      L(`${N(c.partAP, 1)} % des surfaces brûlées des communes de l'aire protégée en ${c.annee}.`, `${N(c.partAP, 1)} % of the burned area of the protected area's communes in ${c.annee}.`));
  }

  /* ---- Année choisie ---- */
  if (!s) {
    add(pts, "aucuneAnnee", "info", L(`Aucune donnée pour ${c.annee}`, `No data for ${c.annee}`), L("Cette commune n'a pas de ligne pour cette année dans la base.", "This commune has no row for this year in the database."));
  } else if (s.complet && a.vsRef != null && a.ref) {
    const v = a.vsRef;
    const mot = v >= CFG.ECART_FORT ? L("année très forte", "very severe year") : v >= CFG.ECART_NET ? L("au-dessus de la moyenne", "above average") : v <= -CFG.ECART_NET ? L("en dessous de la moyenne", "below average") : L("proche de la moyenne", "close to average");
    if (v >= CFG.ECART_FORT) trig.push(L("Année très au-dessus de la référence", "Year far above the reference"));
    add(pts, "annee", v >= CFG.ECART_FORT ? "haute" : v >= CFG.ECART_NET ? "moyenne" : "info",
      L(`${s.annee} : ${mot} (${S(v)})`, `${s.annee}: ${mot} (${S(v)})`),
      L(`${N(s.ha)} ha brûlés contre ${N(a.ref.moy)} ha en moyenne ${REF} (médiane ${N(a.ref.med)} ; de ${N(a.ref.min)} à ${N(a.ref.max)} ha). ${rangTxt}`,
        `${N(s.ha)} ha burned versus ${N(a.ref.moy)} ha on average over ${REF} (median ${N(a.ref.med)}; ${N(a.ref.min)} to ${N(a.ref.max)} ha). ${rangTxt}`));
  } else if (!s.complet && a.memePeriode?.ratio != null) {
    const mp = a.memePeriode, r = mp.ratio!, manque = mp.dernierMois >= 11 ? "" : cap(`${M(mp.dernierMois + 1)}–${M(11)}`);
    if (r >= CFG.RATIO_FORT) trig.push(L("Saison en cours très au-dessus de la normale", "Current season far above normal"));
    add(pts, "anneePartielle", r >= CFG.RATIO_FORT ? "haute" : r >= CFG.RATIO_NET ? "moyenne" : "info",
      L(`${s.annee} (janvier à ${M(mp.dernierMois)}) : ${N(r, 1)} fois la moyenne de la même période`, `${s.annee} (January to ${M(mp.dernierMois)}): ${N(r, 1)} times the average of the same period`),
      L(`${N(mp.ha)} ha brûlés contre ${N(mp.ref)} ha en moyenne ${REF} sur la même période. ${rangTxt} ${manque ? `${manque} ne figurent pas encore dans la base : le bilan ${s.annee} est incomplet.` : ""}`,
        `${N(mp.ha)} ha burned versus ${N(mp.ref)} ha on average over ${REF} for the same period. ${rangTxt} ${manque ? `${manque} are not yet in the database: the ${s.annee} total is incomplete.` : ""}`),
      r >= CFG.RATIO_FORT ? [{ hz: "now", s: L("Informer le gestionnaire de l'aire protégée : la saison est nettement au-dessus de la normale", "Inform the protected area manager: the season is well above normal") }] : undefined);
  } else {
    add(pts, "anneeSansRef", "info", L(`${s.annee} : ${N(s.ha)} ha`, `${s.annee}: ${N(s.ha)} ha`),
      L(`Pas assez d'années complètes dans ${REF} (moins de ${CFG.MIN_ANNEES_REF}) pour comparer à une référence.`, `Not enough complete years in ${REF} (fewer than ${CFG.MIN_ANNEES_REF}) to compare with a reference.`));
  }

  /* ---- Projection de fin d'année ---- */
  if (s && a.projection) {
    const p = a.projection;
    add(pts, "projection", p.vsRef != null && p.vsRef >= CFG.ECART_FORT ? "moyenne" : "info",
      L(`Fin ${s.annee} : environ ${N(p.ha)} ha attendus (entre ${N(p.bas)} et ${N(p.haut)})`, `End of ${s.annee}: about ${N(p.ha)} ha expected (between ${N(p.bas)} and ${N(p.haut)})`),
      L(`Janvier–${M(p.dernierMois)} représente en moyenne ${N(p.part)} % du total annuel de cette commune. ${p.vsRef != null ? `Projection : ${S(p.vsRef)} par rapport à la moyenne ${REF}. ` : ""}Estimation indicative : elle suppose que la fin d'année suive la saisonnalité habituelle.`,
        `January–${M(p.dernierMois)} usually represents ${N(p.part)} % of this commune's annual total. ${p.vsRef != null ? `Projection: ${S(p.vsRef)} versus the ${REF} average. ` : ""}Indicative estimate: it assumes the rest of the year follows the usual seasonality.`));
  }

  /* ---- Tendance (Mann-Kendall exact + Theil-Sen) ---- */
  const T = a.trend;
  if (T.tend === "hausse" || T.tend === "baisse") {
    const h = T.tend === "hausse";
    const detail = L(
      `Pente de Theil-Sen : ${h ? "+" : "−"}${N(Math.abs(T.pente ?? 0))} ha/an${T.penteRel != null ? ` (${N(Math.abs(T.penteRel), 1)} % de la médiane par an)` : ""} ; τ de Kendall = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)} sur ${T.n} années complètes (${T.force === "forte" ? "significative" : "indicative, à confirmer"}).`,
      `Theil-Sen slope: ${h ? "+" : "−"}${N(Math.abs(T.pente ?? 0))} ha/yr${T.penteRel != null ? ` (${N(Math.abs(T.penteRel), 1)} % of the median per year)` : ""}; Kendall's τ = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)} over ${T.n} complete years (${T.force === "forte" ? "significant" : "indicative, to be confirmed"}).`);
    if (h) {
      trig.push(L("Tendance à la hausse", "Rising trend"));
      add(pts, "tendHausse", "moyenne", L("Les surfaces brûlées augmentent", "Burned area is increasing"), detail, [
        { hz: "post", s: L("Rechercher les causes locales de l'augmentation (défrichement, pâturage, conflits d'usage)", "Look for local causes of the increase (clearing, grazing, land-use conflicts)") },
        { hz: "pre", s: L("Renforcer la prévention dès la prochaine saison", "Strengthen prevention from the next season") }]);
    } else add(pts, "tendBaisse", "info", L("Baisse des surfaces brûlées", "Burned area is decreasing"), detail,
      [{ hz: "post", s: L("Identifier les pratiques qui ont fonctionné et les maintenir", "Identify the practices that worked and keep them") }]);
  } else if (T.tend === "stable") {
    add(pts, "tendStable", "info", L("Pas de tendance détectable", "No detectable trend"),
      L(`τ de Kendall = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)} sur ${T.n} années : ni hausse ni baisse ne ressort statistiquement. Avec si peu d'années, seule une évolution très nette serait détectée : cela ne prouve pas la stabilité.`,
        `Kendall's τ = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)} over ${T.n} years: neither increase nor decrease stands out statistically. With so few years only a very marked change would be detected: this does not prove stability.`));
  }

  /* ---- Irrégularité interannuelle ---- */
  if (a.stats?.cv != null && a.stats.cv >= CFG.CV_IRREGULIER) {
    add(pts, "irregulier", "info", L("Très forte irrégularité d'une année à l'autre", "Very uneven from one year to the next"),
      L(`Coefficient de variation de ${N(a.stats.cv * 100)} % (de ${N(a.stats.min)} à ${N(a.stats.max)} ha/an) : il n'y a pas d'année « normale ». Dimensionner les moyens sur les années fortes plutôt que sur la moyenne.`,
        `Coefficient of variation of ${N(a.stats.cv * 100)} % (${N(a.stats.min)} to ${N(a.stats.max)} ha/yr): there is no "normal" year. Size resources on severe years rather than on the average.`),
      [{ hz: "post", s: L("Dimensionner les moyens (patrouilles, pare-feux) sur les années fortes, pas sur la moyenne", "Size resources (patrols, firebreaks) on severe years, not on the average") }]);
  }

  /* ---- Récurrence ---- */
  if (a.recurrence.sur >= 3 && a.moyHa > 0) {
    const r = a.recurrence;
    if (r.n === r.sur) {
      add(pts, "recurrent", "moyenne", L("Des feux chaque année", "Fires every year"),
        L(`Des surfaces brûlées sont enregistrées ${r.n} années sur ${r.sur} : les feux sont structurels dans cette commune, pas accidentels.`, `Burned area is recorded in ${r.n} of ${r.sur} years: fires are structural in this commune, not accidental.`),
        [{ hz: "post", s: L("Cartographier les zones qui brûlent d'une année sur l'autre pour cibler la prévention", "Map the areas that burn year after year to target prevention") }]);
    } else if (r.n / r.sur < 0.5)
      add(pts, "occasionnel", "info", L("Feux occasionnels", "Occasional fires"), L(`Des surfaces brûlées ne sont enregistrées que ${r.n} années sur ${r.sur}.`, `Burned area is recorded in only ${r.n} of ${r.sur} years.`));
  }

  /* ---- Saison à risque ---- */
  if (a.saison && a.recurrence.n >= 2) {
    const z = a.saison, v = { debut: M(z.debut), fin: M(z.fin), pic: M(z.pic) };
    const dedans = (moisNow - z.debut + 12) % 12 <= 2, avant = (z.debut - moisNow + 12) % 12;
    const base = L(`${N(z.part)} % des surfaces brûlées se concentrent sur ces trois mois (pic en ${v.pic} ; la moitié est atteinte fin ${M(z.m50)}).`, `${N(z.part)} % of burned area is concentrated in these three months (peak in ${v.pic}; half is reached by the end of ${M(z.m50)}).`);
    if (dedans) {
      trig.push(L("Fenêtre à risque en cours", "Risk window under way"));
      add(pts, "saisonDedans", "haute", L(`Nous sommes dans la fenêtre à risque (${v.debut} à ${v.fin})`, `We are inside the risk window (${v.debut} to ${v.fin})`), base, [
        { hz: "now", s: L("Activer la veille communautaire et les alertes", "Activate community watch and alerts") },
        { hz: "now", s: L("Positionner les équipes sur les zones qui brûlent chaque année", "Position teams on areas that burn every year") },
        { hz: "data", s: L("Signaler chaque départ de feu pour compléter la base", "Report every fire start to complete the database") }]);
    } else if (avant <= 2) {
      trig.push(L("Fenêtre à risque imminente", "Risk window imminent"));
      add(pts, "saisonAvant", "haute", L(`La fenêtre à risque (${v.debut} à ${v.fin}) commence dans ${avant} mois`, `The risk window (${v.debut} to ${v.fin}) starts in ${avant} months`), base, [
        { hz: "pre", s: L(`Ouvrir ou entretenir les pare-feux avant ${v.debut}`, `Open or maintain firebreaks before ${v.debut}`) },
        { hz: "pre", s: L("Sensibiliser sur les brûlis et les feux de pâturage avant la saison", "Raise awareness on burning and pasture fires before the season") }]);
    } else add(pts, "saisonHors", "moyenne", L(`Période la plus touchée : ${v.debut} à ${v.fin}`, `Most affected period: ${v.debut} to ${v.fin}`),
      base + L(" Hors de cette fenêtre, c'est le moment de faire le bilan et de planifier.", " Outside this window, it is time to review and plan."), [
        { hz: "post", s: L("Faire le bilan de la dernière saison avec les communautés", "Review the last season with communities") },
        { hz: "pre", s: L(`Programmer l'entretien des pare-feux avant ${v.debut}`, `Schedule firebreak maintenance before ${v.debut}`) }]);
  }

  /* ---- Intérieur de l'aire protégée ---- */
  if (a.interieur) {
    const i = a.interieur, ip = a.interieurPer;
    if (i.moy < CFG.SEUIL_INTERIEUR_HA) add(pts, "interieurNul", "info", L("Pas de feu significatif dans l'aire protégée", "No significant fire in the protected area"), L("Moins de 1 ha brûlé par an en moyenne à l'intérieur de l'aire protégée de la commune.", "Less than 1 ha burned per year on average inside the commune's protected area."));
    else {
      const fort = i.moy >= CFG.INTERIEUR_FORT_HA;
      if (fort) trig.push(L(`Feux réguliers dans l'aire protégée (≥ ${CFG.INTERIEUR_FORT_HA} ha/an)`, `Regular fires in the protected area (≥ ${CFG.INTERIEUR_FORT_HA} ha/yr)`));
      const selTxt = ip && s ? L(` Soit ${N(ip.ha)} ha${ip.ratio != null ? `, ${N(ip.ratio, 1)} fois la moyenne de la même période` : ""}.`, ` I.e. ${N(ip.ha)} ha${ip.ratio != null ? `, ${N(ip.ratio, 1)} times the same-period average` : ""}.`) : "";
      add(pts, "interieur", fort || (ip?.ratio ?? 0) >= CFG.RATIO_FORT ? "haute" : "moyenne",
        a.partInterieur != null
          ? L(`${Pc(a.partInterieur)} % du brûlé de la commune est dans l'aire protégée (${N(i.moy)} ha/an)`, `${Pc(a.partInterieur)} % of the commune's burned area is inside the protected area (${N(i.moy)} ha/yr)`)
          : L(`Feux à l'intérieur de l'aire protégée : ${N(i.moy)} ha/an en moyenne`, `Fires inside the protected area: ${N(i.moy)} ha/yr on average`),
        L(`Touchée ${i.touchees} années sur ${i.sur}.${a.pctSel?.interieur != null && s ? ` En ${s.annee}${s.complet ? "" : ` (jusqu'à ${M(a.pctSel.dernierMois)})`} : ${Pc(a.pctSel.interieur)} % du brûlé de la commune.` : ""}${selTxt}`,
          `Affected ${i.touchees} of ${i.sur} years.${a.pctSel?.interieur != null && s ? ` In ${s.annee}${s.complet ? "" : ` (up to ${M(a.pctSel.dernierMois)})`}: ${Pc(a.pctSel.interieur)} % of the commune's burned area.` : ""}${selTxt}`), [
          { hz: "pre", s: L("Renforcer les patrouilles et les pare-feux en limite de l'aire protégée", "Strengthen patrols and firebreaks along the protected area boundary") },
          { hz: "post", s: L("Transmettre les données au gestionnaire de l'aire protégée", "Share the data with the protected area manager") }]);
    }
  }

  /* ---- Zone tampon (ne déborde pas de la commune : jamais exprimée en % de la commune) ---- */
  if (a.peripherie && a.peripherie.moy >= CFG.PERIPHERIE_HA) {
    const pp = a.peripheriePer;
    add(pts, "peripherie", (pp?.ratio ?? 0) >= CFG.RATIO_FORT ? "haute" : "moyenne",
      a.partPeripherie != null
        ? L(`Zone tampon de 5 km : l'équivalent de ${Pc(a.partPeripherie)} % du brûlé de la commune (${N(a.peripherie.moy)} ha/an)`, `5 km buffer: equivalent to ${Pc(a.partPeripherie)} % of the commune's burned area (${N(a.peripherie.moy)} ha/yr)`)
        : L(`Zone tampon de 5 km : ${N(a.peripherie.moy)} ha/an en moyenne`, `5 km buffer: ${N(a.peripherie.moy)} ha/yr on average`),
      L(`Ces feux brûlent hors de l'aire protégée et peuvent s'y propager.${a.pctSel?.peripherie != null && s ? ` En ${s.annee}${s.complet ? "" : ` (jusqu'à ${M(a.pctSel.dernierMois)})`} : ${Pc(a.pctSel.peripherie)} % du brûlé de la commune${pp?.ratio != null ? `, soit ${N(pp.ratio, 1)} fois la moyenne de la même période` : ""}.` : ""} C'est un rapport, pas une part : la zone tampon déborde du territoire communal, il peut donc dépasser 100 %.`,
        `These fires burn outside the protected area and can spread into it.${a.pctSel?.peripherie != null && s ? ` In ${s.annee}${s.complet ? "" : ` (up to ${M(a.pctSel.dernierMois)})`}: ${Pc(a.pctSel.peripherie)} % of the commune's burned area${pp?.ratio != null ? `, i.e. ${N(pp.ratio, 1)} times the same-period average` : ""}.` : ""} This is a ratio, not a share: the buffer extends beyond the commune, so it can exceed 100 %.`), [
        { hz: "pre", s: L("Établir des pare-feux dans la zone tampon avec les communautés riveraines", "Set up firebreaks in the buffer zone with neighbouring communities") },
        { hz: "pre", s: L("Prioriser les villages proches des limites", "Prioritise villages close to the boundary") }]);
  }

  /* ---- Satellite ---- */
  const fen = dureeTxt(c.fenetreH);
  if (!c.geometrieOk) add(pts, "pointsSansLimite", "info", L("Détections non attribuées à la commune", "Detections not attributed to the commune"), L("La limite de cette commune est introuvable sur la carte : les points de feux ne peuvent pas lui être rattachés.", "This commune's boundary is missing on the map: fire points cannot be assigned to it."));
  else if (b && b.n72 > 0) {
    if (b.n24 > 0) trig.push(L("Feux actifs détectés ces dernières 24 h", "Active fires detected in the last 24 h"));
    const acc = b.accel === "hausse" ? L(" Le rythme s'accélère (plus de détections que les 24 h précédentes).", " The pace is increasing (more detections than the previous 24 h).") : b.accel === "baisse" ? L(" Le rythme ralentit.", " The pace is slowing.") : "";
    const frpTxt = L(`puissance cumulée ${N(b.frpTotal)} MW${b.frpMax != null ? `, maximum ${N(b.frpMax)} MW` : ""}`, `cumulative power ${N(b.frpTotal)} MW${b.frpMax != null ? `, maximum ${N(b.frpMax)} MW` : ""}`);
    const ha = CFG.FRP_HA_PAR_MW != null ? L(` Surface potentiellement touchée (indicatif) : ${N(b.frpTotal * CFG.FRP_HA_PAR_MW)} ha.`, ` Potentially affected area (indicative): ${N(b.frpTotal * CFG.FRP_HA_PAR_MW)} ha.`) : "";
    add(pts, "pointsActifs", b.n24 > 0 ? "haute" : "moyenne",
      L(`Feux actifs détectés par satellite : ${b.n72} détection(s) sur 72 h`, `Active fires detected by satellite: ${b.n72} detection(s) over 72 h`),
      L(`Dont ${b.n24} sur les dernières 24 h (${frpTxt}).${acc}${ha} Une détection n'est pas forcément un feu distinct : un même feu peut être vu par plusieurs passages ou pixels. Données disponibles sur ${fen}.`,
        `Including ${b.n24} in the last 24 h (${frpTxt}).${acc}${ha} A detection is not necessarily a distinct fire: one fire can be seen by several passes or pixels. Data available over ${fen}.`), [
        { hz: "now", s: L("Vérifier ces points sur le terrain avec les relais locaux", "Check these points on the ground with local relays") },
        { hz: "now", s: L("Prévenir les villages et le gestionnaire de l'aire protégée", "Warn villages and the protected area manager") }]);
  } else if (b) add(pts, "pointsAucun", "info", L("Aucune détection satellite récente", "No recent satellite detection"),
    L(`Aucun feu actif détecté dans la commune sur les ${fen} disponibles. Cela ne dit rien des mois précédents : l'historique vient de la base.`, `No active fire detected in the commune over the ${fen} available. This says nothing about earlier months: the history comes from the database.`));

  /* ---- Qualité des données et limites ---- */
  if (a.incoherent) add(qual, "incoherent", "moyenne", L("Valeurs de la base à vérifier", "Database values to check"), L("Un total annuel dépasse la superficie de la commune : les pourcentages ne sont pas affichés. Vérifier l'unité (hectares ?) ou le périmètre.", "An annual total exceeds the commune's area: percentages are not shown. Check the unit (hectares?) or the perimeter."), [{ hz: "data", s: L("Vérifier l'unité et le périmètre des valeurs annuelles", "Check the unit and perimeter of the annual values") }]);
  if (a.derniere) {
    const lag = now.getFullYear() * 12 + moisNow - (a.derniere.annee * 12 + a.derniere.mois);
    if (lag >= 1) {
      const m1 = (a.derniere.mois + 1) % 12, manque = cap(lag === 1 ? M(m1) : `${M(m1)}–${M(moisNow)}`);
      add(qual, "retardBase", "info", L(`Dernière donnée de la base : ${M(a.derniere.mois)} ${a.derniere.annee}`, `Latest database entry: ${M(a.derniere.mois)} ${a.derniere.annee}`),
        L(`Les superficies brûlées ne couvrent pas ${manque} : les détections récentes n'y sont pas encore comptées.`, `Burned areas do not cover ${manque}: recent detections are not counted in them yet.`), [{ hz: "data", s: L("Mettre à jour la base avec les mois manquants", "Update the database with the missing months") }]);
    }
  }
  const q = a.qualite, tr = q.trous;
  if (tr.commune.length + tr.interieur.length + tr.tampon.length > 0) {
    const parts = [tr.commune.length ? `${L("commune", "commune")} : ${tr.commune.join(", ")}` : "", tr.interieur.length ? `${L("aire protégée", "protected area")} : ${tr.interieur.join(", ")}` : "", tr.tampon.length ? `${L("zone 5 km", "5 km zone")} : ${tr.tampon.join(", ")}` : ""].filter(Boolean).join(" ; ");
    add(qual, "trous", "moyenne", L("Mois vides dans des années déjà terminées", "Empty months in years already over"),
      L(`${parts}. Ces années sont écartées des moyennes et des tendances (un mois vide n'est pas un mois à zéro).`, `${parts}. These years are excluded from averages and trends (an empty month is not a zero month).`), [{ hz: "data", s: L("Compléter ou confirmer à zéro les mois vides des années passées", "Complete, or confirm as zero, the empty months of past years") }]);
  }
  if (q.nComplet < 4) add(qual, "historiqueCourt", "moyenne", L(`Historique court : ${q.nComplet} année(s) complète(s)`, `Short history: ${q.nComplet} complete year(s)`),
    L("Moyennes, saisonnalité et tendance sont peu fiables : lire ces résultats comme des ordres de grandeur.", "Averages, seasonality and trend are unreliable: read these results as orders of magnitude only."));
  else if (q.nComplet < 8) add(qual, "petitEchantillon", "info", L(`Petit échantillon : ${q.nComplet} années complètes`, `Small sample: ${q.nComplet} complete years`),
    L("La médiane et le rang sont plus robustes que la moyenne ; une tendance n'est détectée que si elle est très nette.", "The median and rank are more robust than the mean; a trend is only detected if it is very clear."));
  if (q.recente && q.premiere != null) add(qual, "recente", "info", L(`La série de cette commune commence en ${q.premiere}`, `This commune's series starts in ${q.premiere}`), L(`La référence ${REF} est calculée sur moins d'années que pour les autres communes.`, `The ${REF} reference is computed over fewer years than for the other communes.`));

  /* ---- Niveau de priorité : nombre de critères réunis (lisible, donc discutable) ---- */
  const niveau: Niveau = trig.length >= 4 ? "critique" : trig.length >= 2 ? "eleve" : trig.length === 1 ? "modere" : "faible";
  const points = pts.sort((x, y) => LVL[x.lvl] - LVL[y.lvl]);
  let cles = points.filter((x) => x.lvl !== "info").slice(0, 4);
  if (cles.length < 3) cles = [...cles, ...points.filter((x) => x.lvl === "info" && x.k !== "pos").slice(0, 3 - cles.length)];

  const acts = new Map<Hz, string[]>();
  for (const it of [...points, ...qual]) for (const x of it.acts ?? []) { const l = acts.get(x.hz) ?? []; if (!l.includes(x.s)) l.push(x.s); acts.set(x.hz, l); }
  const actions = HZ_ORDER.filter((h) => acts.has(h)).map((h) => ({ hz: h, items: acts.get(h)! }));

  /* ---- Lecture des graphes ---- */
  const z = a.saison;
  // Saisonnalité mensuelle
  const mL: string[] = [];
  const valsSel = a.mensuel.filter((x) => x.sel != null);
  if (z) {
    const pf = z.picFreq;
    mL.push(L(`Le mois le plus brûlé est ${M(pf.mois)} dans ${pf.n} années sur ${pf.sur} : ${pf.sur && pf.n / pf.sur >= 0.6 ? "saisonnalité régulière, calendrier fiable" : "saisonnalité variable, prévoir une marge d'un mois autour du pic"}.`,
      `The most burned month is ${M(pf.mois)} in ${pf.n} of ${pf.sur} years: ${pf.sur && pf.n / pf.sur >= 0.6 ? "regular seasonality, reliable calendar" : "variable seasonality, allow a one-month margin around the peak"}.`));
    mL.push(L(`La moitié des surfaces est généralement brûlée à la fin ${De(z.m50)} : les mesures de prévention doivent être en place avant.`, `Half of the area is usually burned by the end of ${M(z.m50)}: prevention measures must be in place before.`));
  }
  if (valsSel.length) {
    const top = valsSel.reduce((p, x) => ((x.sel as number) > (p.sel as number) ? x : p));
    if ((top.sel as number) > 0) {
      const dec = z ? top.m - z.pic : 0;
      mL.push(L(`En ${c.annee}, le pic est en ${M(top.m)} (${N(top.sel as number)} ha)${z && dec !== 0 ? `, soit ${Math.abs(dec)} mois ${dec < 0 ? "plus tôt" : "plus tard"} que le pic moyen` : ""}.`,
        `In ${c.annee}, the peak is in ${M(top.m)} (${N(top.sel as number)} ha)${z && dec !== 0 ? `, ${Math.abs(dec)} month(s) ${dec < 0 ? "earlier" : "later"} than the average peak` : ""}.`));
    }
    const seuilMin = (a.stats?.moy ?? 0) * 0.02;
    const au = a.mensuel.filter((x) => x.sel != null && x.moy != null && x.moy > 0 && (x.sel as number) >= 1.5 * x.moy && (x.sel as number) - x.moy >= seuilMin).slice(0, 4).map((x) => M(x.m));
    if (au.length) mL.push(L(`Mois nettement au-dessus de la moyenne (plus de 1,5 fois) : ${au.join(", ")}.`, `Months well above average (more than 1.5 times): ${au.join(", ")}.`));
  }
  const vides = a.mensuel.filter((x) => x.sel == null).map((x) => x.m);
  if (vides.length && valsSel.length) mL.push(L(`Pas encore dans la base : ${M(vides[0])}${vides.length > 1 ? ` à ${M(vides[vides.length - 1])}` : ""} ${c.annee}. Ces mois ne sont pas comparés.`, `Not yet in the database: ${M(vides[0])}${vides.length > 1 ? ` to ${M(vides[vides.length - 1])}` : ""} ${c.annee}. These months are not compared.`));
  const mensuel: Lecture = {
    cle: z ? L(`Le risque se concentre ${De(z.debut)} à ${M(z.fin)} (${N(z.part)} % des surfaces), avec un pic en ${M(z.pic)}.`, `Risk is concentrated from ${M(z.debut)} to ${M(z.fin)} (${N(z.part)} % of the area), peaking in ${M(z.pic)}.`) : L("Historique trop court pour dégager une saisonnalité fiable.", "History too short to establish a reliable seasonality."),
    lignes: mL,
  };

  // Historique annuel
  const hL: string[] = [];
  const st = a.stats;
  if (st?.cv != null) hL.push(L(`Variabilité d'une année à l'autre : coefficient de variation de ${N(st.cv * 100)} % (${st.cv >= CFG.CV_IRREGULIER ? "très irrégulier" : st.cv >= 0.3 ? "irrégulier" : "plutôt régulier"}).`, `Year-to-year variability: coefficient of variation of ${N(st.cv * 100)} % (${st.cv >= CFG.CV_IRREGULIER ? "very uneven" : st.cv >= 0.3 ? "uneven" : "fairly regular"}).`));
  if (T.tend) hL.push(T.tend === "stable"
    ? L(`Tendance : aucune détectable (τ = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)}, ${T.n} années).`, `Trend: none detectable (τ = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)}, ${T.n} years).`)
    : L(`Tendance à la ${T.tend} : ${(T.pente ?? 0) > 0 ? "+" : "−"}${N(Math.abs(T.pente ?? 0))} ha/an (τ = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)}, ${T.force === "forte" ? "significative" : "indicative"}).`, `Trend: ${T.tend === "hausse" ? "rising" : "falling"} at ${(T.pente ?? 0) > 0 ? "+" : "−"}${N(Math.abs(T.pente ?? 0))} ha/yr (τ = ${N(T.tau ?? 0, 2)}, p = ${Pv(T.p ?? 1)}, ${T.force === "forte" ? "significant" : "indicative"}).`));
  if (a.rang && s) hL.push(L(`${s.annee} : ${rangTxt}`, `${s.annee}: ${rangTxt}`));
  if (a.projection && s) hL.push(L(`La barre claire de ${s.annee} est la projection de fin d'année (indicative), la barre pleine ce qui est déjà dans la base.`, `The light ${s.annee} bar is the indicative year-end projection; the solid bar is what is already in the database.`));
  if (a.partInterieur != null) hL.push(L(`En moyenne ${Pc(a.partInterieur)} % du brûlé de la commune se situe dans l'aire protégée.`, `On average ${Pc(a.partInterieur)} % of the commune's burned area lies inside the protected area.`));
  const historique: Lecture = {
    cle: st && st.n >= 2 ? L(`${N(st.moy)} ha/an en moyenne (médiane ${N(st.med)}), de ${N(st.min)} à ${N(st.max)} ha sur ${st.n} années complètes.`, `${N(st.moy)} ha/yr on average (median ${N(st.med)}), from ${N(st.min)} to ${N(st.max)} ha over ${st.n} complete years.`) : st ? L(`Une seule année complète (${N(st.moy)} ha) : aucune moyenne ni tendance possible.`, `Only one complete year (${N(st.moy)} ha): no average or trend possible.`) : L("Aucune année complète dans la base.", "No complete year in the database."),
    lignes: hL,
  };

  // Carte année × mois
  const hm: string[] = [];
  const top2 = a.annees.filter((x) => x.complet).sort((x, y) => y.ha - x.ha).slice(0, 2);
  if (top2.length >= 2) hm.push(L(`Années les plus touchées : ${top2[0].annee} (${N(top2[0].ha)} ha) puis ${top2[1].annee} (${N(top2[1].ha)} ha).`, `Most affected years: ${top2[0].annee} (${N(top2[0].ha)} ha) then ${top2[1].annee} (${N(top2[1].ha)} ha).`));
  if (z) hm.push(L(`Une colonne sombre qui revient chaque année signale une saison stable (ici autour ${De(z.pic)}) ; un décalage d'une année à l'autre signale une saison qui bouge.`, `A dark column that returns every year signals a stable season (here around ${M(z.pic)}); a shift from year to year signals a moving season.`));
  const heat: Lecture = {
    cle: a.maxCell ? L(`Pire mois de la série : ${M(a.maxCell.m)} ${a.maxCell.annee} (${N(a.maxCell.ha)} ha, ${N(a.maxCell.partAnnee)} % de cette année).`, `Worst month of the series: ${M(a.maxCell.m)} ${a.maxCell.annee} (${N(a.maxCell.ha)} ha, ${N(a.maxCell.partAnnee)} % of that year).`) : L("Pas de donnée mensuelle.", "No monthly data."),
    lignes: hm,
  };

  // Satellite
  let satellite: Lecture | null = null;
  if (b && c.geometrieOk) {
    const sL: string[] = [];
    if (b.ageMin != null) sL.push(L(`Détection la plus récente : il y a ${N(b.ageMin, b.ageMin < 10 ? 1 : 0)} h.`, `Most recent detection: ${N(b.ageMin, b.ageMin < 10 ? 1 : 0)} h ago.`));
    if (b.densite != null && b.n72 > 0) sL.push(L(`Densité : ${N(b.densite, 1)} détection(s) pour 100 km² sur 72 h.`, `Density: ${N(b.densite, 1)} detection(s) per 100 km² over 72 h.`));
    sL.push(L("Les détections indiquent où ça brûle maintenant ; les hectares viennent de la base, avec un retard. Les deux ne se convertissent pas directement.", "Detections show where it is burning now; hectares come from the database, with a delay. The two cannot be converted directly."));
    satellite = {
      cle: b.n72 > 0 ? L(`${b.n72} détection(s) sur 72 h, dont ${b.n24} sur 24 h.`, `${b.n72} detection(s) over 72 h, ${b.n24} of them in 24 h.`) : L(`Aucune détection sur les ${fen} disponibles.`, `No detection over the ${fen} available.`),
      lignes: sL,
    };
  }

  return { niveau, declencheurs: trig, confiance: q.confiance, cles, points, qualite: qual, actions, lectures: { mensuel, historique, heat, satellite } };
}

/** Compatibilité : ancienne API, renvoie la liste des constats. */
export const lecture = (a: CommuneAnalyse, b: Bilan | null, c: CtxLecture, lang: string): Item[] => rapport(a, b, c, lang).points;

/* ===================== LIBELLÉS DE LA FENÊTRE ===================== */

const UI_FR = {
  fermer: "Fermer", apLbl: "Aire protégée", rang: "Rang dans l'AP", partAP: "Part de l'AP", totalAn: "Brûlé en {an}", vsRef: "vs moyenne {ref}",
  pctSup: "de la commune ({an})", recurrence: "Années avec feux", interieurAn: "Dans l'AP / an", detect72: "Détections 72 h", ha: "ha", partiel: "partiel", na: "—",
  hist: "Historique annuel (ha brûlés)", histNote: "Barres : toute la commune. Gris foncé : années complètes ; gris clair : année incomplète ; rouge : année choisie. Trait bleu : moyenne de référence.",
  barres: "Commune", interieur: "Intérieur AP", tampon: "Zone 5 km", refLbl: "Moyenne {ref}", projLbl: "Projection fin d'année",
  mens: "Saisonnalité mensuelle (ha)", prec: "Année précédente", moy: "Moyenne des années complètes", sel: "Année choisie",
  mensNote: "Un mois sans valeur n'est pas dessiné : il n'est pas encore dans la base.",
  heat: "Carte année × mois (ha)", heatNote: "Plus la case est foncée, plus la surface brûlée est élevée. Tiret : mois pas encore dans la base.",
  pts: "Points de feux (satellite)", ptsFen: "Données de feux disponibles sur {fenetre}", ptsNo: "Aucun point dans la commune.", ptsSans: "Limite de commune introuvable : points non attribués.",
  ptsChart: "Détections par tranche de {w} h (du plus ancien au plus récent)", ptsList: "Dernières détections (UTC)", frp: "Puissance", sat: "Satellite",
  lect: "Lecture et orientations", lectLbl: "Comment lire ce graphique",
  src: "Sources : base des feux (superficies brûlées par commune, par mois) ; points de feux FIRMS pour les détections récentes. Les deux ne mesurent pas la même chose : la base donne des hectares, les points donnent des détections.",
  cartAria: "Carte de la commune avec les points de feux", aucune: "Aucune donnée pour cette commune.",
  hint: "Cliquez sur une commune pour son analyse détaillée.",
  niveau: { critique: "Priorité critique", eleve: "Priorité élevée", modere: "Priorité modérée", faible: "Priorité faible" } as Record<Niveau, string>,
  niveauNote: "Le niveau compte les critères réunis : 4 ou plus = critique, 2 à 3 = élevé, 1 = modéré, aucun = faible. Il oriente la décision, il ne la remplace pas.",
  confLbl: "Fiabilité de l'analyse", conf: { haute: "élevée", moyenne: "moyenne", faible: "faible" } as Record<"haute" | "moyenne" | "faible", string>,
  cles: "À retenir", declench: "Pourquoi ce niveau", aucunDeclench: "Aucun critère d'alerte réuni pour le moment.",
  actions: "Actions recommandées", hz: { now: "Immédiat", pre: "Avant la saison", post: "Bilan et planification", data: "Fiabiliser les données" } as Record<Hz, string>,
  qualite: "Qualité des données et limites", partTitre: "Poids dans le brûlé de la commune", partInt: "Intérieur de l'aire protégée", partTam: "Zone tampon 5 km", partMoy: "Moyenne (années complètes)", partNoteInt: "Part réelle : l'intérieur est un sous-ensemble de la commune (≤ 100 %).", partNoteTam: "Rapport : la zone tampon déborde de la commune, il peut dépasser 100 %.", projKpi: "Fin {an} (estimée)", vsMoy: "vs moyenne",
};
const UI_EN: typeof UI_FR = {
  fermer: "Close", apLbl: "Protected area", rang: "Rank in the PA", partAP: "Share of the PA", totalAn: "Burned in {an}", vsRef: "vs {ref} average",
  pctSup: "of the commune ({an})", recurrence: "Years with fires", interieurAn: "Inside PA / yr", detect72: "Detections 72 h", ha: "ha", partiel: "partial", na: "—",
  hist: "Annual history (ha burned)", histNote: "Bars: whole commune. Dark grey: complete years; light grey: incomplete year; red: selected year. Blue line: reference average.",
  barres: "Commune", interieur: "Inside PA", tampon: "5 km zone", refLbl: "{ref} average", projLbl: "Year-end projection",
  mens: "Monthly seasonality (ha)", prec: "Previous year", moy: "Average of complete years", sel: "Selected year",
  mensNote: "A month with no value is not drawn: it is not in the database yet.",
  heat: "Year × month map (ha)", heatNote: "The darker the cell, the larger the burned area. Dash: month not yet in the database.",
  pts: "Fire points (satellite)", ptsFen: "Fire data available over {fenetre}", ptsNo: "No point in the commune.", ptsSans: "Commune boundary missing: points not attributed.",
  ptsChart: "Detections per {w} h slot (oldest to newest)", ptsList: "Latest detections (UTC)", frp: "Power", sat: "Satellite",
  lect: "Reading and orientations", lectLbl: "How to read this chart",
  src: "Sources: fire database (burned area per commune, per month); FIRMS fire points for recent detections. They do not measure the same thing: the database gives hectares, the points give detections.",
  cartAria: "Commune map with fire points", aucune: "No data for this commune.",
  hint: "Click a commune for its detailed analysis.",
  niveau: { critique: "Critical priority", eleve: "High priority", modere: "Moderate priority", faible: "Low priority" },
  niveauNote: "The level counts the criteria met: 4 or more = critical, 2 to 3 = high, 1 = moderate, none = low. It guides the decision, it does not replace it.",
  confLbl: "Analysis reliability", conf: { haute: "high", moyenne: "medium", faible: "low" },
  cles: "Key points", declench: "Why this level", aucunDeclench: "No alert criterion met at the moment.",
  actions: "Recommended actions", hz: { now: "Right now", pre: "Before the season", post: "Review and planning", data: "Improve the data" },
  qualite: "Data quality and limits", partTitre: "Weight in the commune's burned area", partInt: "Inside the protected area", partTam: "5 km buffer", partMoy: "Average (complete years)", partNoteInt: "True share: the interior is a subset of the commune (≤ 100 %).", partNoteTam: "Ratio: the buffer extends beyond the commune, so it can exceed 100 %.", projKpi: "End of {an} (estimated)", vsMoy: "vs average",
};
export const txtCommune = (lang: string) => (lang === "en" ? UI_EN : UI_FR);

export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`));
