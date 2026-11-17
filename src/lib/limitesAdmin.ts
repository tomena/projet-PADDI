/**
 * limitesAdmin.ts — limites administratives de Madagascar (geoBoundaries ADM1 à ADM3)
 * Partagé par ZonesIntervention (carte) et ZonesUpdateModal (listes en cascade).
 * À placer dans : src/lib/limitesAdmin.ts
 */
export type Feat = { properties: Record<string, any>; geometry: { type: string; coordinates: any } };
export type Niv = "ADM1" | "ADM2" | "ADM3";

const REV = "9469f09";
const GH = "wmgeolab/geoBoundaries";

export const cle = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const nomFeat = (f: Feat): string =>
  String(
    f.properties.shapeName ??
      f.properties.name ??
      Object.values(f.properties).find((v) => typeof v === "string") ??
      ""
  );

export const polygones = (f: Feat): number[][][][] =>
  f.geometry.type === "Polygon"
    ? [f.geometry.coordinates]
    : f.geometry.type === "MultiPolygon"
    ? f.geometry.coordinates
    : [];

function dansAnneau(x: number, y: number, a: number[][]): boolean {
  let dedans = false;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [xi, yi] = a[i];
    const [xj, yj] = a[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

const contient = (x: number, y: number, f: Feat) =>
  polygones(f).some((p) => dansAnneau(x, y, p[0]) && !p.slice(1).some((h) => dansAnneau(x, y, h)));

/** Vrai si `enfant` est situé à l'intérieur de `parent`. */
export function estDans(enfant: Feat, parent: Feat): boolean {
  const pts = polygones(enfant).flatMap((p) => p[0]);
  if (!pts.length) return false;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let score = contient(cx, cy, parent) ? 3 : 0;
  const pas = Math.max(1, Math.floor(pts.length / 6));
  for (let i = 0; i < pts.length && i < pas * 6; i += pas) {
    if (contient(pts[i][0], pts[i][1], parent)) score++;
  }
  return score >= 5;
}

const CACHE: Partial<Record<Niv, Feat[]>> = {};

export async function charger(niv: Niv): Promise<Feat[]> {
  if (CACHE[niv]) return CACHE[niv]!;
  const f = `releaseData/gbOpen/MDG/${niv}/geoBoundaries-MDG-${niv}_simplified.geojson`;
  const urls = [
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`,
    `https://raw.githubusercontent.com/${GH}/${REV}/${f}`,
    `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texte = await r.text();
      if (texte.startsWith("version https://git-lfs")) throw new Error("LFS");
      const j = JSON.parse(texte);
      const feats = (j.features ?? []).filter(
        (x: Feat) => x?.geometry && /Polygon/.test(x.geometry.type)
      ) as Feat[];
      if (feats.length) {
        CACHE[niv] = feats;
        return feats;
      }
    } catch {
      /* source suivante */
    }
  }
  throw new Error(niv);
}
