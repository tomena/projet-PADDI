import type { Level } from "./geo";

/** Générateur pseudo-aléatoire reproductible : une même zone donne toujours les mêmes valeurs d'exemple. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: () => number, a: number, b: number, step = 1) =>
  Number((Math.round((a + (b - a) * r()) / step) * step).toFixed(6));

export const pickOne = <T>(r: () => number, list: T[]): T => list[Math.floor(r() * list.length)];

/** Population fictive, d'un ordre de grandeur réaliste pour le niveau. */
export const popDemo = (level: Level, r: () => number) =>
  level === "ADM1" ? between(r, 400000, 3000000, 1000) : level === "ADM2" ? between(r, 80000, 600000, 1000) : between(r, 3000, 60000, 100);
