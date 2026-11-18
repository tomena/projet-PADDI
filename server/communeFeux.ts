/**
 * communeFeux.ts — analyse d'une commune à partir des lignes de la base des feux (Bases_Feux)
 * et des points de feux satellite (FIRMS). Logique pure, sans React : testable seule.
 *
 * Lignes attendues (propriétés du GeoJSON) : Commune, AP, Année, Source (Commune | 5km | Interieur),
 * Janvier … Décembre (null si le mois n'est pas encore renseigné), Total.
 *
 * Principes :
 *  - un mois vide reste vide (null), jamais 0 : une année incomplète n'est pas comparée à une année complète ;
 *  - l'année en cours est comparée à la MÊME période des années complètes ;
 *  - aucune phrase n'est produite sur une donnée absente (ex. pas de limite de commune → pas de décompte de points).
 */

export const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const REF_DEBUT = 2020, REF_FIN = 2024; // même référence que la page : moyenne historique 2020-2024
export const SEUIL_INTERIEUR_HA = 1;            // sous ce niveau, pas de feu significatif dans l'aire protégée

export type Tend = "hausse" | "baisse" | "stable" | null;
export type Lvl = "haute" | "moyenne" | "info";
type Mois12 = (number | null)[];

const src = (p: any) => String(p?.Source ?? "").trim().toLowerCase();
const val = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const complet = (m?: Mois12) => !!m && m.length === 12 && m.every((v) => v != null);
const somme = (m: Mois12, n = 12) => m.slice(0, n).reduce<number>((s, v) => s + (v ?? 0), 0);
const moyenne = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);
const dernierRempli = (m: Mois12) => m.reduce((l, v, i) => (v != null ? i : l), -1);

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

function tendance(v: number[], seuil: number): Tend {
  if (v.length < 4) return null;
  const h = Math.floor(v.length / 2);
  const a = moyenne(v.slice(0, h)), b = moyenne(v.slice(v.length - h));
  return b > a * 1.25 && b - a > seuil ? "hausse" : b < a * 0.75 && a - b > seuil ? "baisse" : "stable";
}

/* ===================== ANALYSE DE LA BASE ===================== */

export type Annee = { annee: number; ha: number; complet: boolean; dernierMois: number; interieur: number | null; peripherie: number | null };
export type CommuneAnalyse = {
  annees: Annee[];
  anneeSel: Annee | null;
  moyRef: number | null;
  vsRef: number | null;                       // % si l'année choisie est complète
  memePeriode: { ha: number; ref: number; ratio: number | null; dernierMois: number } | null; // si elle est incomplète
  mensuel: { m: number; sel: number | null; prec: number | null; moy: number | null }[];
  heat: { annee: number; mois: Mois12 }[];
  saison: { debut: number; fin: number; pic: number; part: number } | null;
  tendance: Tend; moyDebut: number; moyFin: number;
  recurrence: { n: number; sur: number };
  moyHa: number;
  pctSup: number | null; pctSupSel: number | null; incoherent: boolean;
  interieur: { moy: number; touchees: number; sur: number } | null;
  peripherie: { moy: number } | null;
  derniere: { annee: number; mois: number } | null;
};

export function analyserCommune(rows: any[], annee: number, superficieHa: number | null): CommuneAnalyse {
  const C = serie(rows, "commune"), I = serie(rows, "interieur"), B = serie(rows, "5km");
  const ans = [...C.keys()].sort((a, b) => a - b);
  const sup = superficieHa && superficieHa > 0 ? superficieHa : null;

  const annees: Annee[] = ans.map((y) => {
    const m = C.get(y)!, ok = complet(m);
    return {
      annee: y, ha: somme(m), complet: ok, dernierMois: dernierRempli(m),
      interieur: ok && I.has(y) && complet(I.get(y)) ? somme(I.get(y)!) : null,
      peripherie: ok && B.has(y) && complet(B.get(y)) ? somme(B.get(y)!) : null,
    };
  });
  const cmpl = annees.filter((a) => a.complet);
  const ha = cmpl.map((a) => a.ha);
  const moyHa = moyenne(ha);
  const anneeSel = annees.find((a) => a.annee === annee) ?? null;

  const refs = cmpl.filter((a) => a.annee >= REF_DEBUT && a.annee <= REF_FIN);
  const moyRef = refs.length >= 3 ? moyenne(refs.map((a) => a.ha)) : null;
  const vsRef = anneeSel?.complet && moyRef != null && moyRef > 0 ? ((anneeSel.ha - moyRef) / moyRef) * 100 : null;

  let memePeriode: CommuneAnalyse["memePeriode"] = null;
  if (anneeSel && !anneeSel.complet && anneeSel.dernierMois >= 0 && refs.length >= 3) {
    const dm = anneeSel.dernierMois, n = dm + 1;
    const ref = moyenne(refs.map((a) => somme(C.get(a.annee)!, n)));
    memePeriode = { ha: anneeSel.ha, ref, ratio: ref > 0 ? anneeSel.ha / ref : null, dernierMois: dm };
  }

  const profil = cmpl.length >= 2 ? Array.from({ length: 12 }, (_, m) => moyenne(cmpl.map((a) => C.get(a.annee)![m] as number))) : null;
  const mensuel = MOIS.map((_, m) => ({
    m, sel: C.get(annee)?.[m] ?? null, prec: C.get(annee - 1)?.[m] ?? null, moy: profil ? profil[m] : null,
  }));

  let saison: CommuneAnalyse["saison"] = null;
  const tot = profil ? profil.reduce((s, x) => s + x, 0) : 0;
  if (profil && tot > 0) {
    let debut = 0, best = -1;
    for (let s = 0; s < 12; s++) {
      const x = profil[s] + profil[(s + 1) % 12] + profil[(s + 2) % 12];
      if (x > best) { best = x; debut = s; }
    }
    saison = { debut, fin: (debut + 2) % 12, pic: profil.indexOf(Math.max(...profil)), part: (best / tot) * 100 };
  }

  const h = Math.floor(ha.length / 2);
  const incoherent = sup != null && ha.length > 0 && Math.max(...ha) > sup * 1.05;
  const iv = [...I.entries()].filter(([, m]) => complet(m)).map(([, m]) => somme(m));
  const bv = [...B.entries()].filter(([, m]) => complet(m)).map(([, m]) => somme(m));

  let derniere: CommuneAnalyse["derniere"] = null;
  for (const y of [...ans].reverse()) {
    const d = dernierRempli(C.get(y)!);
    if (d >= 0) { derniere = { annee: y, mois: d }; break; }
  }

  return {
    annees, anneeSel, moyRef, vsRef, memePeriode, mensuel,
    heat: ans.map((y) => ({ annee: y, mois: C.get(y)! })),
    saison, tendance: tendance(ha, sup ? sup * 0.0005 : 50), moyDebut: moyenne(ha.slice(0, h)), moyFin: moyenne(ha.slice(ha.length - h)),
    recurrence: { n: ha.filter((x) => x > 0).length, sur: ha.length },
    moyHa,
    pctSup: sup && !incoherent ? (moyHa / sup) * 100 : null,
    pctSupSel: sup && anneeSel && !incoherent ? (anneeSel.ha / sup) * 100 : null,
    incoherent,
    interieur: iv.length ? { moy: moyenne(iv), touchees: iv.filter((x) => x > 0).length, sur: iv.length } : null,
    peripherie: bv.length ? { moy: moyenne(bv) } : null,
    derniere,
  };
}

/* ===================== POINTS DE FEUX (satellite) ===================== */

export type Bilan = {
  total: number; n24: number; n48: number; n72: number;
  frpTotal: number; frpMax: number | null;
  premier: number | null; dernier: number | null;
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
  const n72 = pts.filter((p) => p.age <= 72).length;
  return {
    total: pts.length, n24: pts.filter((p) => p.age <= 24).length, n48: pts.filter((p) => p.age <= 48).length, n72,
    frpTotal, frpMax,
    premier: pts.length ? Math.min(...pts.map((p) => p.t)) : null,
    dernier: pts.length ? Math.max(...pts.map((p) => p.t)) : null,
    largeurH, bins,
    densite: superficieHa && superficieHa > 0 ? (n72 / (superficieHa / 100)) * 100 : null,
  };
}

/* ===================== TEXTES (FR / EN ; mg et de retombent sur le français) ===================== */

type R = { t: string; d: string; a?: string[] };
type Key =
  | "pos" | "refComplet" | "refPartiel" | "tendHausse" | "tendBaisse" | "recurrent" | "occasionnel"
  | "saisonDedans" | "saisonAvant" | "saisonHors" | "interieur" | "interieurNul" | "peripherie"
  | "pointsActifs" | "pointsAucun" | "pointsSansLimite" | "retardBase" | "incoherent";

const FR: Record<Key, R> = {
  pos: { t: "{c} : n° {rang} sur {de} dans {ap}", d: "{part} des surfaces brûlées des communes de l'aire protégée en {an}." },
  refComplet: { t: "{an} : {pct} par rapport à la moyenne historique", d: "{ha} ha brûlés en {an}, contre {moy} ha en moyenne sur {ref}." },
  refPartiel: {
    t: "{an} (janvier à {mois}) : {ratio} fois la moyenne de la même période",
    d: "{ha} ha brûlés, contre {ref} ha en moyenne sur la même période ({refAns}). {manque} ne figurent pas encore dans la base : le bilan {an} est incomplet.",
  },
  tendHausse: {
    t: "Les surfaces brûlées augmentent", d: "{fin} ha/an en moyenne sur les dernières années, contre {debut} ha/an sur les premières. À confirmer par les prochaines saisons.",
    a: ["Rechercher les causes locales de l'augmentation (défrichement, pâturage, conflits d'usage)", "Renforcer la prévention dès la prochaine saison"],
  },
  tendBaisse: { t: "Baisse des surfaces brûlées", d: "{fin} ha/an en moyenne sur les dernières années, contre {debut} ha/an sur les premières.", a: ["Identifier les pratiques qui ont fonctionné et les maintenir"] },
  recurrent: { t: "Des feux chaque année", d: "Des surfaces brûlées sont enregistrées {n} années sur {sur} : les feux sont structurels dans cette commune, pas accidentels." },
  occasionnel: { t: "Feux occasionnels", d: "Des surfaces brûlées ne sont enregistrées que {n} années sur {sur}." },
  saisonDedans: {
    t: "Nous sommes dans la fenêtre à risque ({debut} à {fin})", d: "{part} des surfaces brûlées de cette commune se concentrent sur ces trois mois (pic en {pic}).",
    a: ["Activer la veille communautaire et les alertes", "Positionner les équipes sur les zones brûlées chaque année", "Signaler chaque départ de feu pour compléter la base"],
  },
  saisonAvant: {
    t: "La fenêtre à risque ({debut} à {fin}) commence dans {n} mois", d: "{part} des surfaces brûlées se concentrent sur ces trois mois (pic en {pic}).",
    a: ["Ouvrir ou entretenir les pare-feux avant {debut}", "Sensibiliser sur les brûlis et les feux de pâturage avant la saison"],
  },
  saisonHors: {
    t: "Période la plus touchée : {debut} à {fin}", d: "{part} des surfaces brûlées se concentrent sur ces trois mois (pic en {pic}). Hors de cette fenêtre, c'est le moment de faire le bilan et de planifier.",
    a: ["Faire le bilan de la dernière saison avec les communautés", "Programmer l'entretien des pare-feux avant {debut}"],
  },
  interieur: {
    t: "Feux à l'intérieur de l'aire protégée", d: "{moy} ha brûlent en moyenne par an dans l'aire protégée ({t} années sur {sur}).",
    a: ["Renforcer les patrouilles et les pare-feux en limite de l'aire protégée", "Transmettre les données au gestionnaire de l'aire protégée"],
  },
  interieurNul: { t: "Pas de feu significatif dans l'aire protégée", d: "Moins de 1 ha brûlé par an en moyenne à l'intérieur de l'aire protégée de la commune." },
  peripherie: {
    t: "Feux dans la zone tampon de 5 km", d: "{moy} ha brûlent en moyenne par an dans les 5 km autour de l'aire protégée : ils peuvent s'y propager.",
    a: ["Établir des pare-feux dans la zone tampon avec les communautés riveraines", "Prioriser les villages proches des limites"],
  },
  pointsActifs: {
    t: "Feux actifs détectés par satellite", d: "{n72} détection(s) dans la commune sur les 72 dernières heures, dont {n24} sur les dernières 24 h (puissance cumulée {frp} MW). Données disponibles sur {fenetre}.",
    a: ["Vérifier ces points sur le terrain avec les relais locaux", "Prévenir les villages et le gestionnaire de l'aire protégée"],
  },
  pointsAucun: { t: "Aucune détection satellite récente", d: "Aucun feu actif détecté dans la commune sur les {fenetre} disponibles. Cela ne dit rien des mois précédents : l'historique vient de la base." },
  pointsSansLimite: { t: "Détections non attribuées à la commune", d: "La limite de cette commune est introuvable sur la carte : les points de feux ne peuvent pas lui être rattachés." },
  retardBase: { t: "Dernière donnée de la base : {mois} {an}", d: "Les superficies brûlées ne couvrent pas {manque} : les détections récentes n'y sont pas encore comptées." },
  incoherent: { t: "Valeurs de la base à vérifier", d: "Un total annuel dépasse la superficie de la commune : les pourcentages ne sont pas affichés. Vérifier l'unité (hectares ?) ou le périmètre." },
};
const EN: Record<Key, R> = {
  pos: { t: "{c}: no. {rang} of {de} in {ap}", d: "{part} of the burned area of the protected area's communes in {an}." },
  refComplet: { t: "{an}: {pct} versus the historical average", d: "{ha} ha burned in {an}, versus {moy} ha on average over {ref}." },
  refPartiel: {
    t: "{an} (January to {mois}): {ratio} times the average for the same period",
    d: "{ha} ha burned, versus {ref} ha on average over the same period ({refAns}). {manque} are not yet in the database: the {an} total is incomplete.",
  },
  tendHausse: {
    t: "Burned area is increasing", d: "{fin} ha/yr on average in recent years, versus {debut} ha/yr in the first years. To be confirmed by the next seasons.",
    a: ["Look for local causes of the increase (clearing, grazing, land-use conflicts)", "Strengthen prevention from the next season"],
  },
  tendBaisse: { t: "Burned area is decreasing", d: "{fin} ha/yr on average in recent years, versus {debut} ha/yr in the first years.", a: ["Identify the practices that worked and keep them"] },
  recurrent: { t: "Fires every year", d: "Burned area is recorded in {n} of {sur} years: fires are structural in this commune, not accidental." },
  occasionnel: { t: "Occasional fires", d: "Burned area is recorded in only {n} of {sur} years." },
  saisonDedans: {
    t: "We are inside the risk window ({debut} to {fin})", d: "{part} of this commune's burned area is concentrated in these three months (peak in {pic}).",
    a: ["Activate community watch and alerts", "Position teams on areas that burn every year", "Report every fire start to complete the database"],
  },
  saisonAvant: {
    t: "The risk window ({debut} to {fin}) starts in {n} months", d: "{part} of burned area is concentrated in these three months (peak in {pic}).",
    a: ["Open or maintain firebreaks before {debut}", "Raise awareness on burning and pasture fires before the season"],
  },
  saisonHors: {
    t: "Most affected period: {debut} to {fin}", d: "{part} of burned area is concentrated in these three months (peak in {pic}). Outside this window, it is time to review and plan.",
    a: ["Review the last season with communities", "Schedule firebreak maintenance before {debut}"],
  },
  interieur: {
    t: "Fires inside the protected area", d: "{moy} ha burn on average per year inside the protected area ({t} of {sur} years).",
    a: ["Strengthen patrols and firebreaks along the protected area boundary", "Share the data with the protected area manager"],
  },
  interieurNul: { t: "No significant fire in the protected area", d: "Less than 1 ha burned per year on average inside the commune's protected area." },
  peripherie: {
    t: "Fires in the 5 km buffer", d: "{moy} ha burn on average per year within 5 km of the protected area: they can spread into it.",
    a: ["Set up firebreaks in the buffer zone with neighbouring communities", "Prioritise villages close to the boundary"],
  },
  pointsActifs: {
    t: "Active fires detected by satellite", d: "{n72} detection(s) in the commune over the last 72 hours, {n24} of them in the last 24 h (total power {frp} MW). Data available over {fenetre}.",
    a: ["Check these points on the ground with local relays", "Warn villages and the protected area manager"],
  },
  pointsAucun: { t: "No recent satellite detection", d: "No active fire detected in the commune over the {fenetre} available. This says nothing about earlier months: the history comes from the database." },
  pointsSansLimite: { t: "Detections not attributed to the commune", d: "This commune's boundary is missing on the map: fire points cannot be assigned to it." },
  retardBase: { t: "Latest database entry: {mois} {an}", d: "Burned areas do not cover {manque}: recent detections are not counted in them yet." },
  incoherent: { t: "Database values to check", d: "An annual total exceeds the commune's area: percentages are not shown. Check the unit (hectares?) or the perimeter." },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`));

export type Item = { lvl: Lvl; t: string; d: string; acts?: string[] };
export type CtxLecture = {
  commune: string; ap: string; annee: number; rang: number; de: number; partAP: number | null;
  nowMs: number; moisLongs: string[]; geometrieOk: boolean; fenetreH: number;
};

const dureeTxt = (h: number, en: boolean) => (h >= 48 ? `${Math.round(h / 24)} ${en ? "days" : "jours"}` : `${Math.max(1, Math.round(h))} h`);
const LVL: Record<Lvl, number> = { haute: 0, moyenne: 1, info: 2 };

export function lecture(a: CommuneAnalyse, b: Bilan | null, c: CtxLecture, lang: string): Item[] {
  const en = lang === "en", TX = en ? EN : FR, loc = en ? "en-GB" : "fr-FR";
  const N = (n: number, d = 0) => n.toLocaleString(loc, { maximumFractionDigits: d });
  const out: Item[] = [];
  const add = (k: Key, lvl: Lvl, v: Record<string, string | number> = {}) => {
    const r = TX[k];
    out.push({ lvl, t: fill(r.t, v), d: fill(r.d, v), acts: r.a?.map((s) => fill(s, v)) });
  };
  const M = (m: number) => c.moisLongs[m] ?? String(m + 1);
  const now = new Date(c.nowMs), moisNow = now.getMonth();
  const refAns = `${REF_DEBUT}–${REF_FIN}`;

  if (a.incoherent) add("incoherent", "info");

  // Position dans l'aire protégée
  if (c.rang > 0 && c.partAP != null)
    add("pos", c.rang <= 3 ? "haute" : c.rang <= 6 ? "moyenne" : "info", { c: c.commune, rang: c.rang, de: c.de, ap: c.ap, part: `${N(c.partAP, 1)} %`, an: c.annee });

  // Année choisie : complète → vs moyenne ; incomplète → même période
  const s = a.anneeSel;
  if (s?.complet && a.vsRef != null && a.moyRef != null)
    add("refComplet", a.vsRef >= 25 ? "moyenne" : "info", { an: s.annee, pct: `${a.vsRef > 0 ? "+" : ""}${N(a.vsRef, 1)} %`, ha: N(s.ha), moy: N(a.moyRef), ref: refAns });
  else if (s && !s.complet && a.memePeriode?.ratio != null) {
    const mp = a.memePeriode, manque = mp.dernierMois >= 11 ? "" : `${M(mp.dernierMois + 1)}–${M(11)}`;
    add("refPartiel", mp.ratio! >= 1.3 ? "moyenne" : "info", {
      an: s.annee, mois: M(mp.dernierMois), ratio: N(mp.ratio!, 1), ha: N(mp.ha), ref: N(mp.ref), refAns,
      manque: manque ? manque[0].toUpperCase() + manque.slice(1) : "",
    });
  }

  if (a.tendance === "hausse") add("tendHausse", "moyenne", { debut: N(a.moyDebut), fin: N(a.moyFin) });
  else if (a.tendance === "baisse") add("tendBaisse", "info", { debut: N(a.moyDebut), fin: N(a.moyFin) });

  if (a.recurrence.sur >= 3 && a.moyHa > 0) {
    if (a.recurrence.n === a.recurrence.sur) add("recurrent", "moyenne", a.recurrence);
    else if (a.recurrence.n / a.recurrence.sur < 0.5) add("occasionnel", "info", a.recurrence);
  }

  if (a.saison && a.recurrence.n >= 2) {
    const z = a.saison, v = { debut: M(z.debut), fin: M(z.fin), pic: M(z.pic), part: `${N(z.part)} %` };
    const dedans = (moisNow - z.debut + 12) % 12 <= 2, avant = (z.debut - moisNow + 12) % 12;
    if (dedans) add("saisonDedans", "haute", v);
    else if (avant <= 2) add("saisonAvant", "haute", { ...v, n: avant });
    else add("saisonHors", "moyenne", v);
  }

  if (a.interieur) {
    const i = a.interieur;
    if (i.moy < SEUIL_INTERIEUR_HA) add("interieurNul", "info");
    else add("interieur", i.moy >= 500 ? "haute" : "moyenne", { moy: N(i.moy), t: i.touchees, sur: i.sur });
  }
  if (a.peripherie && a.peripherie.moy >= 200) add("peripherie", "moyenne", { moy: N(a.peripherie.moy) });

  // Points de feux satellite
  if (!c.geometrieOk) add("pointsSansLimite", "info");
  else if (b && b.total > 0 && b.n72 > 0)
    add("pointsActifs", b.n24 > 0 ? "haute" : "moyenne", { n72: b.n72, n24: b.n24, frp: N(b.frpTotal), fenetre: dureeTxt(c.fenetreH, en) });
  else if (b) add("pointsAucun", "info", { fenetre: dureeTxt(c.fenetreH, en) });

  // Retard de la base par rapport à aujourd'hui
  if (a.derniere) {
    const lag = now.getFullYear() * 12 + moisNow - (a.derniere.annee * 12 + a.derniere.mois);
    if (lag >= 1) {
      const m1 = (a.derniere.mois + 1) % 12;
      const manque = lag === 1 ? M(m1) : `${M(m1)}–${M(moisNow)}`;
      add("retardBase", "info", { mois: M(a.derniere.mois), an: a.derniere.annee, manque: manque[0].toUpperCase() + manque.slice(1) });
    }
  }
  return out.sort((x, y) => LVL[x.lvl] - LVL[y.lvl]);
}

/* ===================== LIBELLÉS DE LA FENÊTRE ===================== */

const UI_FR = {
  fermer: "Fermer", apLbl: "Aire protégée", rang: "Rang dans l'AP", partAP: "Part de l'AP", totalAn: "Brûlé en {an}", vsRef: "vs moyenne {ref}",
  pctSup: "de la commune ({an})", recurrence: "Années avec feux", interieurAn: "Dans l'AP / an", detect72: "Détections 72 h", ha: "ha", partiel: "partiel", na: "—",
  hist: "Historique annuel (ha brûlés)", histNote: "Barres : toute la commune. Lignes : intérieur de l'aire protégée et zone de 5 km (années complètes seulement).",
  barres: "Commune", interieur: "Intérieur AP", tampon: "Zone 5 km", refLbl: "Moyenne {ref}",
  mens: "Saisonnalité mensuelle (ha)", prec: "Année précédente", moy: "Moyenne des années complètes", sel: "Année choisie",
  mensNote: "Un mois sans valeur n'est pas dessiné : il n'est pas encore dans la base.",
  heat: "Carte année × mois (ha)", heatNote: "Plus la case est foncée, plus la surface brûlée est élevée. Tiret : mois pas encore dans la base.",
  pts: "Points de feux (satellite)", ptsFen: "Données de feux disponibles sur {fenetre}", ptsNo: "Aucun point dans la commune.", ptsSans: "Limite de commune introuvable : points non attribués.",
  ptsChart: "Détections par tranche de {w} h (du plus ancien au plus récent)", ptsList: "Dernières détections (UTC)", frp: "Puissance", sat: "Satellite",
  lect: "Lecture et orientations", src: "Sources : base des feux (superficies brûlées par commune, par mois) ; points de feux FIRMS pour les détections récentes. Les deux ne mesurent pas la même chose : la base donne des hectares, les points donnent des détections.",
  cartAria: "Carte de la commune avec les points de feux", aucune: "Aucune donnée pour cette commune.",
  hint: "Cliquez sur une commune pour son analyse détaillée.",
};
const UI_EN: typeof UI_FR = {
  fermer: "Close", apLbl: "Protected area", rang: "Rank in the PA", partAP: "Share of the PA", totalAn: "Burned in {an}", vsRef: "vs {ref} average",
  pctSup: "of the commune ({an})", recurrence: "Years with fires", interieurAn: "Inside PA / yr", detect72: "Detections 72 h", ha: "ha", partiel: "partial", na: "—",
  hist: "Annual history (ha burned)", histNote: "Bars: whole commune. Lines: inside the protected area and 5 km zone (complete years only).",
  barres: "Commune", interieur: "Inside PA", tampon: "5 km zone", refLbl: "{ref} average",
  mens: "Monthly seasonality (ha)", prec: "Previous year", moy: "Average of complete years", sel: "Selected year",
  mensNote: "A month with no value is not drawn: it is not in the database yet.",
  heat: "Year × month map (ha)", heatNote: "The darker the cell, the larger the burned area. Dash: month not yet in the database.",
  pts: "Fire points (satellite)", ptsFen: "Fire data available over {fenetre}", ptsNo: "No point in the commune.", ptsSans: "Commune boundary missing: points not attributed.",
  ptsChart: "Detections per {w} h slot (oldest to newest)", ptsList: "Latest detections (UTC)", frp: "Power", sat: "Satellite",
  lect: "Reading and orientations", src: "Sources: fire database (burned area per commune, per month); FIRMS fire points for recent detections. They do not measure the same thing: the database gives hectares, the points give detections.",
  cartAria: "Commune map with fire points", aucune: "No data for this commune.",
  hint: "Click a commune for its detailed analysis.",
};
export const txtCommune = (lang: string) => (lang === "en" ? UI_EN : UI_FR);
export { fill };
