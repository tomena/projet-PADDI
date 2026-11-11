import { useState } from "react";
import { clamp, num, usePersistedState } from "./analyse-utils";
import { norm, type Unit, type ZoneApi } from "./geo";

export type UCol<T> = {
  key: keyof T & string; // en minuscules : sert aussi d'en-tête de colonne CSV
  label: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
};

export type Rec<T> = T & { demo?: boolean };

export interface ZoneData<T> {
  all: Record<string, Rec<T>>;
  patch: (u: Unit, p: Partial<T>) => void;
  importCsv: (rows: Record<string, string>[]) => void;
  fillDemo: () => void;
  clearZone: () => void;
  msg: string;
  hasDemo: boolean;
}

/**
 * Données saisies par territoire, mémorisées dans le navigateur (clé = territoire).
 * Les valeurs d'exemple sont marquées « demo » jusqu'à ce que l'utilisateur les modifie.
 */
export function useZoneData<T extends object>(
  zone: ZoneApi, storageKey: string, cols: UCol<T>[], blank: T, demoFn: (u: Unit) => T,
): ZoneData<T> {
  const [all, setAll] = usePersistedState<Record<string, Rec<T>>>(storageKey, {});
  const [msg, setMsg] = useState("");

  const patch = (u: Unit, p: Partial<T>) =>
    setAll((a) => ({ ...a, [u.key]: { ...blank, ...(a[u.key] ?? {}), ...p, demo: false } as Rec<T> }));

  const importCsv = (rows: Record<string, string>[]) => {
    const byName = new Map(zone.units.map((u) => [norm(u.name), u]));
    const entries: Record<string, Rec<T>> = {};
    const inconnus: string[] = [];
    rows.forEach((r) => {
      const nom = r.nom ?? r.name ?? "";
      const u = byName.get(norm(nom));
      if (!u) { if (nom) inconnus.push(nom); return; }
      const rec = { ...blank } as unknown as Record<string, unknown>;
      cols.forEach((c) => {
        const raw = r[c.key];
        if (raw === undefined || raw === "") return;
        rec[c.key] = c.type === "text" ? raw : clamp(num(raw), c.min ?? -Infinity, c.max ?? Infinity);
      });
      rec.demo = false;
      entries[u.key] = rec as Rec<T>;
    });
    setAll((a) => ({ ...a, ...entries }));
    const n = Object.keys(entries).length;
    setMsg(`${n} ligne${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""}` +
      (inconnus.length ? `, ${inconnus.length} non reconnue${inconnus.length > 1 ? "s" : ""} dans cette zone (${inconnus.slice(0, 4).join(", ")}${inconnus.length > 4 ? "…" : ""}).` : "."));
  };

  const fillDemo = () => {
    setAll((a) => {
      const n = { ...a };
      zone.units.forEach((u) => { if (!a[u.key] || a[u.key].demo) n[u.key] = { ...demoFn(u), demo: true } as Rec<T>; });
      return n;
    });
    setMsg("Valeurs d'exemple fictives ajoutées aux territoires vides. Remplacez-les par vos données.");
  };

  const clearZone = () => {
    setAll((a) => { const n = { ...a }; zone.units.forEach((u) => delete n[u.key]); return n; });
    setMsg("Données de cette zone effacées.");
  };

  return { all, patch, importCsv, fillDemo, clearZone, msg, hasDemo: zone.units.some((u) => all[u.key]?.demo) };
}
