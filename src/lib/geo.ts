/**
 * Limites administratives de Madagascar (geoBoundaries) : Région → District → Commune.
 * Même source que AnalyseTerritoriale.tsx. Le choix de zone est mémorisé : il reste le même
 * quand on passe d'une page d'analyse à une autre.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistedState } from "./analyse-utils";

export type Level = "ADM1" | "ADM2" | "ADM3";
export const LEVEL_PLURAL: Record<Level, string> = { ADM1: "Régions", ADM2: "Districts", ADM3: "Communes" };
export const LEVEL_SING: Record<Level, string> = { ADM1: "Région", ADM2: "District", ADM3: "Commune" };

type Ring = number[][];
export type Feat = { type?: string; properties: Record<string, any>; geometry: { type: string; coordinates: any } };

const NOM_CLES = ["shapename", "nom_region", "region", "nom_district", "district", "nom_commune", "commune",
  "adm3_fr", "adm2_fr", "adm1_fr", "name_3", "name_2", "name_1", "nom", "name", "libelle"];

const polys = (f: Feat): Ring[][] => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
const inRing = (x: number, y: number, r: Ring) => {
  let o = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) o = !o;
  return o;
};
const inFeat = (x: number, y: number, f: Feat) =>
  polys(f).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
const bigRing = (f: Feat) => [...polys(f)].sort((p, q) => q[0].length - p[0].length)[0][0];
const center = (f: Feat): [number, number] => {
  const r = bigRing(f);
  return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
};
/** Vrai si l'entité c est à l'intérieur de p (test sur son centre et 5 points de son contour). */
const childOf = (c: Feat, p: Feat) => {
  const [cx, cy] = center(c), r = bigRing(c);
  let hits = inFeat(cx, cy, p) ? 3 : 0;
  for (let i = 0; i < 5; i++) {
    const q = r[Math.floor((i * r.length) / 5)];
    if (inFeat(q[0] * 0.8 + cx * 0.2, q[1] * 0.8 + cy * 0.2, p)) hits++;
  }
  return hits >= 5;
};
const lisible = (x: unknown): x is string => typeof x === "string" && x.trim() !== "" && !/^[\d\s.\-]*$/.test(x.trim());
export const nameOf = (f: Feat) => {
  const p = f.properties || {};
  const keys = Object.keys(p);
  for (const k of NOM_CLES) {
    const real = keys.find((x) => x.toLowerCase() === k);
    if (real && lisible(p[real])) return p[real].trim();
  }
  const v = Object.values(p).find(lisible);
  return v ? v.trim() : "Sans nom";
};

/** Texte comparable : sans accents, minuscules, sans ponctuation. */
export const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const GH = "wmgeolab/geoBoundaries", REV = "9469f09";
const sources = (l: Level) => {
  const f = `releaseData/gbOpen/MDG/${l}/geoBoundaries-MDG-${l}_simplified.geojson`;
  return [`https://raw.githubusercontent.com/${GH}/${REV}/${f}`, `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`];
};

const CACHE: Partial<Record<Level, Feat[]>> = {};
export function loadLevel(l: Level): Promise<Feat[]> {
  if (CACHE[l]) return Promise.resolve(CACHE[l]!);
  const tries = sources(l).map((u) =>
    fetch(u).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then((j) => {
      const feats: Feat[] = (j?.features ?? []).filter((f: Feat) => f?.geometry && /Polygon/.test(f.geometry.type));
      if (!feats.length) throw new Error("vide");
      return feats;
    }));
  return new Promise((ok, ko) => {
    let left = tries.length;
    tries.forEach((p) => p.then((v) => { CACHE[l] = v; ok(v); }).catch(() => {
      if (--left === 0) ko(new Error(`Limites ${LEVEL_PLURAL[l].toLowerCase()} indisponibles en ligne. Vérifiez votre connexion et réessayez.`));
    }));
  });
}

/* ===================== Unités (régions, districts, communes) ===================== */

export type Unit = { key: string; name: string; level: Level; feat: Feat };

/** Clé stable d'un territoire : sert à retrouver ses données saisies. */
const keyOf = (f: Feat, l: Level) => `${l}:${f.properties?.shapeID ?? f.properties?.shapeid ?? nameOf(f)}`;
const toUnit = (f: Feat, level: Level): Unit => ({ key: keyOf(f, level), name: nameOf(f), level, feat: f });
const byName = (a: Unit, b: Unit) => a.name.localeCompare(b.name, "fr");

type Sel = { r: string; d: string; c: string };

export function useZone() {
  const [sel, setSel] = usePersistedState<Sel>("paddi.zone", { r: "", d: "", c: "" });
  const [regs, setRegs] = useState<Feat[]>([]);
  const [adm2, setAdm2] = useState<Feat[] | null>(null);
  const [adm3, setAdm3] = useState<Feat[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLevel("ADM1").then(setRegs).catch((e) => setError(e.message));
  }, []);
  const regions = useMemo(() => regs.map((f) => toUnit(f, "ADM1")).sort(byName), [regs]);
  const rU = useMemo(() => regions.find((u) => u.key === sel.r) ?? null, [regions, sel.r]);

  useEffect(() => {
    if (rU && !adm2) loadLevel("ADM2").then(setAdm2).catch((e) => setError(e.message));
  }, [rU, adm2]);
  const districts = useMemo(
    () => (rU && adm2 ? adm2.filter((f) => childOf(f, rU.feat)).map((f) => toUnit(f, "ADM2")).sort(byName) : []),
    [rU, adm2]);
  const dU = useMemo(() => districts.find((u) => u.key === sel.d) ?? null, [districts, sel.d]);

  useEffect(() => {
    if (dU && !adm3) loadLevel("ADM3").then(setAdm3).catch((e) => setError(e.message));
  }, [dU, adm3]);
  const communes = useMemo(
    () => (dU && adm3 ? adm3.filter((f) => childOf(f, dU.feat)).map((f) => toUnit(f, "ADM3")).sort(byName) : []),
    [dU, adm3]);
  const cU = useMemo(() => communes.find((u) => u.key === sel.c) ?? null, [communes, sel.c]);

  /** Niveau affiché dans les tableaux et sur la carte = les enfants de la zone choisie. */
  const level: Level = !rU ? "ADM1" : !dU ? "ADM2" : "ADM3";
  const units = level === "ADM1" ? regions : level === "ADM2" ? districts : communes;
  const parent = dU ?? rU;
  const focus = cU ?? dU ?? rU;
  const title = parent ? `${LEVEL_PLURAL[level]} · ${parent.name}` : "Régions de Madagascar";
  const busy = !error && (regs.length === 0 || (!!rU && !adm2) || (!!dU && !adm3));

  const select = useCallback((u: Unit) => {
    setSel((s) => (u.level === "ADM1" ? { r: u.key, d: "", c: "" } : u.level === "ADM2" ? { ...s, d: u.key, c: "" } : { ...s, c: u.key }));
  }, [setSel]);
  const setRegion = (k: string) => setSel({ r: k, d: "", c: "" });
  const setDistrict = (k: string) => setSel((s) => ({ ...s, d: k, c: "" }));
  const setCommune = (k: string) => setSel((s) => ({ ...s, c: k }));
  const reset = () => setSel({ r: "", d: "", c: "" });
  const up = () => setSel((s) => (s.c ? { ...s, c: "" } : s.d ? { ...s, d: "" } : { r: "", d: "", c: "" }));

  return { regions, districts, communes, units, level, parent, focus, rU, dU, cU, title, busy, error,
    select, setRegion, setDistrict, setCommune, reset, up };
}

export type ZoneApi = ReturnType<typeof useZone>;
