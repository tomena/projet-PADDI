import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { downloadText, fmt, parseCsv } from "../lib/analyse-utils";
import "./AnalyseKit.css";

type Tab = { to: string; label: string };

export function PageShell({
  title,
  intro,
  tabs,
  children,
}: {
  title: string;
  intro: string;
  tabs: Tab[];
  children: ReactNode;
}) {
  return (
    <main className="an-page">
      <div className="an-wrap">
        <Link to="/" className="an-back">
          <ArrowLeft size={16} aria-hidden="true" /> Accueil
        </Link>
        <h1>{title}</h1>
        <p className="an-intro">{intro}</p>
        <nav className="an-tabs" aria-label="Pages du thème">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? "on" : "")}>
              {t.label}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="an-section">
      <h2>{title}</h2>
      {hint && <p className="an-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="an-kpi">
      <span className="an-kpi-label">{label}</span>
      <strong>
        {value}
        {unit && <small> {unit}</small>}
      </strong>
    </div>
  );
}

export function Bars({ items, unit = "" }: { items: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="an-bars">
      {items.map((i) => (
        <li key={i.label}>
          <span className="an-bars-label">{i.label}</span>
          <span className="an-bars-track">
            <span className="an-bars-fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="an-bars-val">
            {fmt(i.value, 0)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Advice({
  title,
  tag,
  tone = "info",
  children,
}: {
  title: string;
  tag?: string;
  tone?: "info" | "warn" | "good";
  children: ReactNode;
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

export function CsvTools({
  template,
  filename,
  onRows,
  onReset,
}: {
  template: string;
  filename: string;
  onRows: (rows: Record<string, string>[]) => void;
  onReset: () => void;
}) {
  return (
    <div className="an-tools">
      <label className="an-btn">
        Importer un fichier CSV
        <input
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const rows = parseCsv(await f.text());
            if (rows.length) onRows(rows);
            else alert("Fichier vide ou illisible. Téléchargez le modèle et gardez la première ligne.");
            e.target.value = "";
          }}
        />
      </label>
      <button type="button" className="an-btn ghost" onClick={() => downloadText(filename, template)}>
        Télécharger le modèle
      </button>
      <button
        type="button"
        className="an-btn ghost"
        onClick={() => confirm("Remettre les données d'exemple ?") && onReset()}
      >
        Remettre l'exemple
      </button>
    </div>
  );
}

export type Col<T> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "number";
  step?: number;
  min?: number;
  max?: number;
};

export function EditableTable<T extends { id: string }>({
  cols,
  rows,
  onChange,
  blank,
  addLabel = "Ajouter une ligne",
}: {
  cols: Col<T>[];
  rows: T[];
  onChange: (rows: T[]) => void;
  blank?: () => T;
  addLabel?: string;
}) {
  const set = (id: string, c: Col<T>, v: string) =>
    onChange(rows.map((r) => (r.id === id ? ({ ...r, [c.key]: c.type === "number" ? Number(v) : v } as T) : r)));
  return (
    <div className="an-table-wrap">
      <div className="an-scroll">
        <table className="an-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {blank && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {cols.map((c) => (
                  <td key={c.key}>
                    <input
                      type={c.type === "number" ? "number" : "text"}
                      step={c.step}
                      min={c.min}
                      max={c.max}
                      value={String(r[c.key] ?? "")}
                      onChange={(e) => set(r.id, c, e.target.value)}
                      aria-label={c.label}
                    />
                  </td>
                ))}
                {blank && (
                  <td>
                    <button
                      type="button"
                      className="an-x"
                      aria-label="Supprimer la ligne"
                      onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {blank && (
        <button type="button" className="an-btn ghost" onClick={() => onChange([...rows, blank()])}>
          + {addLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="an-empty">{children}</p>;
}
