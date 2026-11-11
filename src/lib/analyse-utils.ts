import { useEffect, useState } from "react";

/** useState sauvegardé dans le navigateur (les données saisies survivent au rechargement). */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage plein ou bloqué : on ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmt = (n: number, digits = 1) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: digits });

/** Lit un CSV (séparateur ; ou ,) et renvoie une liste d'objets (clés en minuscules). */
export function parseCsv(txt: string): Record<string, string>[] {
  const lines = txt.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(sep);
    const obj: Record<string, string> = {};
    head.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}

/** "12,5" ou "12.5" -> 12.5 (0 si invalide) */
export const num = (s: string | undefined) => {
  const n = parseFloat((s ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function downloadText(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
