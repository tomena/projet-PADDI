import { useState, type ReactNode } from "react";
import { ArrowUp, ChevronRight, RotateCcw } from "lucide-react";
import { downloadText, fmt, parseCsv } from "../lib/analyse-utils";
import { LEVEL_PLURAL, LEVEL_SING, norm, type ZoneApi } from "../lib/geo";
import type { UCol, ZoneData } from "../lib/zonedata";
import "./AnalyseKit.css";

/* ===================== Mise en page ===================== */

export function PageShell({ title, intro, zone, map, children }: {
  title: string; intro: string; zone: ZoneApi; map: ReactNode; children: ReactNode;
}) {
  return (
    <main className="an-page">
      <div className="an-wrap">
        <header className="an-head">
          <h1>{title}</h1>
          <p className="an-intro">{intro}</p>
        </header>
        <ZoneBar zone={zone} />
        <div className="an-split">
          <div className="an-main">{children}</div>
          <div className="an-mapcol">{map}</div>
        </div>
      </div>
    </main>
  );
}

export function ZoneBar({ zone }: { zone: ZoneApi }) {
  return (
    <div className="an-zonebar" role="group" aria-label="Zone d'analyse">
      <select value={zone.rU?.key ?? ""} onChange={(e) => zone.setRegion(e.target.value)} aria-label="Région">
        <option value="">{zone.regions.length ? "Toutes les régions" : zone.error ? "Indisponible" : "Chargement…"}</option>
        {zone.regions.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
      </select>
      <ChevronRight size={16} aria-hidden="true" />
      <select value={zone.dU?.key ?? ""} onChange={(e) => zone.setDistrict(e.target.value)} disabled={!zone.rU} aria-label="District">
        <option value="">{zone.rU && !zone.districts.length ? "Chargement…" : "Tous les districts"}</option>
        {zone.districts.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
      </select>
      <ChevronRight size={16} aria-hidden="true" />
      <select value={zone.cU?.key ?? ""} onChange={(e) => zone.setCommune(e.target.value)} disabled={!zone.dU} aria-label="Commune">
        <option value="">{zone.dU && !zone.communes.length ? "Chargement…" : "Toutes les communes"}</option>
        {zone.communes.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
      </select>
      <button type="button" className="an-iconbtn" onClick={zone.up} disabled={!zone.rU} title="Niveau supérieur" aria-label="Revenir au niveau supérieur">
        <ArrowUp size={16} />
      </button>
      <button type="button" className="an-iconbtn" onClick={zone.reset} disabled={!zone.rU} title="Revenir à Madagascar" aria-label="Réinitialiser la zone">
        <RotateCcw size={16} />
      </button>
      {zone.busy && <span className="an-status" role="status">Chargement des limites…</span>}
      {zone.error && <span className="an-status err" role="alert">{zone.error}</span>}
    </div>
  );
}

export function Section({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="an-section">
      <div className="an-section-h">
        <h2>{title}</h2>
        {actions}
      </div>
      {hint && <p className="an-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function Segmented<V extends string>({ value, onChange, items, label }: {
  value: V; onChange: (v: V) => void; items: { value: V; label: string }[]; label: string;
}) {
  return (
    <div className="an-seg an-seg-lg" role="group" aria-label={label}>
      {items.map((i) => (
        <button key={i.value} type="button" aria-pressed={value === i.value} onClick={() => onChange(i.value)}>{i.label}</button>
      ))}
    </div>
  );
}

/* ===================== Éléments d'affichage ===================== */

export function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="an-kpi">
      <span className="an-kpi-label">{label}</span>
      <strong>{value}{unit && <small> {unit}</small>}</strong>
    </div>
  );
}

export function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="an-facts">
      {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export function Bars({ items, unit = "", max }: { items: { label: string; value: number }[]; unit?: string; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="an-bars">
      {items.map((i) => (
        <li key={i.label}>
          <span className="an-bars-label">{i.label}</span>
          <span className="an-bars-track"><span className="an-bars-fill" style={{ width: `${Math.min(100, (i.value / top) * 100)}%` }} /></span>
          <span className="an-bars-val">{fmt(i.value, 0)}{unit}</span>
        </li>
      ))}
    </ul>
  );
}

export function Advice({ title, tag, tone = "info", children }: {
  title: string; tag?: string; tone?: "info" | "warn" | "good"; children: ReactNode;
}) {
  return (
    <article className={`an-advice ${tone}`}>
      <header>
        <h3>{title}</h3>
        {tag && <span className="an-tag">{tag}</span>}
      </header>
      <p>{children}</p>
    </article>
  );
}

export function EmptyState({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="an-empty">
      <h3>{title}</h3>
      <p>{children}</p>
      {actions && <div className="an-tools an-center">{actions}</div>}
    </div>
  );
}

export type RankItem = { key: string; name: string; value: number; badge: string; tone?: "info" | "warn" | "good"; onPick: () => void };

export function RankList({ items, focusKey, max = 8 }: { items: RankItem[]; focusKey?: string; max?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, max);
  return (
    <>
      <ol className="an-rank">
        {shown.map((it, i) => (
          <li key={it.key}>
            <button type="button" className={it.key === focusKey ? "on" : ""} onClick={it.onPick}>
              <span className="an-rank-n">{i + 1}</span>
              <span className="an-rank-name">{it.name}</span>
              <span className="an-rank-bar" aria-hidden="true"><i style={{ width: `${Math.max(2, Math.min(100, it.value))}%` }} /></span>
              <span className="an-rank-val">{fmt(it.value, 0)}</span>
              <span className={`an-badge ${it.tone ?? "info"}`}>{it.badge}</span>
            </button>
          </li>
        ))}
      </ol>
      {items.length > max && (
        <button type="button" className="an-btn ghost an-more" onClick={() => setAll(!all)}>
          {all ? "Réduire la liste" : `Afficher les ${items.length} territoires`}
        </button>
      )}
    </>
  );
}

/* ===================== Saisie des données par territoire ===================== */

export function DataTools<T extends object>({ zone, store, cols }: { zone: ZoneApi; store: ZoneData<T>; cols: UCol<T>[] }) {
  const template = () => {
    const head = ["nom", ...cols.map((c) => c.key)].join(";");
    const lines = zone.units.map((u) => [u.name, ...cols.map(() => "")].join(";"));
    downloadText(`modele-${norm(zone.title).replace(/ /g, "-")}.csv`, [head, ...lines].join("\n"));
  };
  return (
    <div className="an-datatools">
      <div className="an-tools">
        <label className="an-btn">
          Importer un CSV
          <input type="file" accept=".csv,text/csv" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const rows = parseCsv(await f.text());
            if (rows.length) store.importCsv(rows);
            else alert("Fichier vide ou illisible. Téléchargez le modèle de cette zone et gardez la première ligne.");
            e.target.value = "";
          }} />
        </label>
        <button type="button" className="an-btn ghost" onClick={template} disabled={!zone.units.length}>Modèle CSV de cette zone</button>
        <button type="button" className="an-btn ghost" onClick={store.fillDemo} disabled={!zone.units.length}>Remplir avec un exemple</button>
        <button type="button" className="an-btn ghost" onClick={() => confirm("Effacer les données de cette zone ?") && store.clearZone()} disabled={!zone.units.length}>Effacer</button>
      </div>
      {store.msg && <p className="an-note" role="status">{store.msg}</p>}
      {store.hasDemo && <p className="an-warn" role="note">Certaines lignes contiennent des valeurs d'exemple fictives (marquées « exemple »). Ne les utilisez pas pour décider.</p>}
    </div>
  );
}

export function UnitTable<T extends object>({ zone, store, cols }: { zone: ZoneApi; store: ZoneData<T>; cols: UCol<T>[] }) {
  const [q, setQ] = useState("");
  const rows = zone.units.filter((u) => norm(u.name).includes(norm(q)));
  if (!zone.units.length) return <p className="an-note">{zone.busy ? "Chargement des territoires…" : "Aucun territoire à afficher."}</p>;
  return (
    <div className="an-table-wrap">
      {zone.units.length > 8 && (
        <input type="search" className="an-search" placeholder={`Filtrer les ${LEVEL_PLURAL[zone.level].toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filtrer par nom" />
      )}
      <div className="an-scroll">
        <table className="an-table an-units">
          <thead>
            <tr>
              <th>{LEVEL_SING[zone.level]}</th>
              {cols.map((c) => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const r = store.all[u.key];
              return (
                <tr key={u.key} className={zone.focus?.key === u.key ? "focus" : ""}>
                  <td className="an-name">
                    <button type="button" onClick={() => zone.select(u)} title={u.level === "ADM3" ? "Sélectionner sur la carte" : "Voir le niveau suivant"}>
                      {u.name}{u.level !== "ADM3" && <ChevronRight size={14} aria-hidden="true" />}
                    </button>
                    {r?.demo && <em className="an-demo">exemple</em>}
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} data-label={c.label}>
                      <input
                        type={c.type === "text" ? "text" : "number"}
                        min={c.min} max={c.max} step={c.step}
                        value={r ? String((r as Record<string, unknown>)[c.key] ?? "") : ""}
                        placeholder="–"
                        aria-label={`${c.label} : ${u.name}`}
                        onChange={(e) => store.patch(u, { [c.key]: c.type === "text" ? e.target.value : e.target.value === "" ? 0 : Number(e.target.value) } as unknown as Partial<T>)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tableau simple à lignes éditables (ex. coûts des investissements). */
export type Col<T> = { key: keyof T & string; label: string; type?: "text" | "number"; step?: number; min?: number; max?: number };

export function EditableTable<T extends { id: string }>({ cols, rows, onChange }: {
  cols: Col<T>[]; rows: T[]; onChange: (rows: T[]) => void;
}) {
  const set = (id: string, c: Col<T>, v: string) =>
    onChange(rows.map((r) => (r.id === id ? ({ ...r, [c.key]: c.type === "number" ? Number(v) : v } as T) : r)));
  return (
    <div className="an-scroll">
      <table className="an-table an-units">
        <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cols.map((c) => (
                <td key={c.key} data-label={c.label}>
                  <input type={c.type === "number" ? "number" : "text"} step={c.step} min={c.min} max={c.max}
                    value={String(r[c.key] ?? "")} onChange={(e) => set(r.id, c, e.target.value)} aria-label={c.label} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
