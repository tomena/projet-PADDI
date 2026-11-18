import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
// Ajuste le chemin selon ton arborescence (communeFeux.ts est dans server/)
import { analyserCommune, bilanPoints, lecture, txtCommune, fill } from "../../server/communeFeux";
import { inZone, norm } from "../lib/fireGeo";
import type { Zone } from "../lib/fireGeo";

export type FicheFire = { t: number; lat: number; lon: number; frp: number | null; age: number };

export type CommuneFicheProps = {
  commune: string;
  ap: string;
  year: number;
  hours: number;
  lang: string;
  monthNames: string[];
  rowsAP: any[];                 // propriétés des lignes de la base pour l'AP choisie
  superficieHa: number | null;   // superficie de la commune (ha)
  rang: number;                  // rang de la commune dans l'AP (1 = la plus touchée)
  nbCommunes: number;
  partAP: number | null;         // part (%) de la commune dans le total brûlé de l'AP
  zone: Zone | null;             // limite géographique de la commune (pour compter les points de feux)
  fires: FicheFire[];
  onClose: () => void;
};

const LOC: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE" };
const LVL_COLOR: Record<"haute" | "moyenne" | "info", string> = { haute: "#dc2626", moyenne: "#d97706", info: "#2563eb" };

const CSS = `
.fxm-bg{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px}
.fxm{background:var(--surface,#fff);color:var(--text,#0f172a);border:1px solid var(--border,#e2e8f0);border-radius:14px;width:min(1000px,100%);max-height:92vh;overflow:auto;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.fxm *{box-sizing:border-box}
.fxm-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.fxm-h h2{margin:0;font-size:20px;color:color-mix(in srgb,#0b4ea2 60%,var(--text,#0f172a))}
.fxm-h p{margin:2px 0 0;font-size:12px;color:var(--text-3,#64748b)}
.fxm-x{border:1px solid var(--border,#e2e8f0);background:var(--surface-3,#f1f5f9);color:var(--text,#0f172a);border-radius:8px;width:32px;height:32px;display:grid;place-items:center;cursor:pointer;flex:none}
.fxm-x:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.fxm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px}
.fxm-kpi{border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:8px 10px;background:var(--surface-2,#f8fafc)}
.fxm-kpi span{display:block;font-size:11px;color:var(--text-2,#475569);font-weight:600}
.fxm-kpi b{display:block;font-size:17px;margin-top:2px;color:var(--text,#0f172a)}
.fxm-kpi small{display:block;font-size:10.5px;color:var(--text-3,#64748b)}
.fxm-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:10px}
@media(min-width:760px){.fxm-grid{grid-template-columns:1fr 1fr}}
.fxm-card{border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:10px;background:var(--surface,#fff);margin-bottom:10px;min-width:0}
.fxm-card h3{margin:0 0 6px;font-size:13px;text-align:center;color:#b91c1c}
.fxm-chart{height:210px}
.fxm-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;font-size:11px;color:var(--text-2,#475569);margin-bottom:4px}
.fxm-chips i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
.fxm-note{font-size:11px;color:var(--text-3,#64748b);margin:6px 0 0;text-align:center}
.fxm-item{border-left:4px solid;padding:6px 10px;margin-bottom:8px;background:var(--surface-2,#f8fafc);border-radius:6px}
.fxm-it-t{font-weight:700;font-size:13px}
.fxm-it-d{font-size:12.5px;margin-top:2px;color:var(--text-2,#475569)}
.fxm-acts{margin:4px 0 0;padding-left:18px;font-size:12px;color:var(--text-2,#475569)}
@media(prefers-reduced-motion:reduce){.fxm *{transition:none!important}}
`;

const TICK = { fontSize: 11, fill: "var(--text-3,#64748b)" };
const TIP_STYLE = { background: "var(--surface,#fff)", border: "1px solid var(--border,#e2e8f0)", color: "var(--text,#0f172a)", borderRadius: 8, fontSize: 12 };

export default function CommuneFiche({
  commune, ap, year, hours, lang, monthNames, rowsAP, superficieHa, rang, nbCommunes, partAP, zone, fires, onClose,
}: CommuneFicheProps) {
  const T = txtCommune(lang);
  const loc = LOC[lang] ?? "fr-FR";
  const fmt = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 }) + " ha";
  const nf = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 0 });

  // Échap pour fermer
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Lignes de cette seule commune (analyserCommune ne filtre pas sur le nom)
  const key = norm(commune);
  const rows = useMemo(() => rowsAP.filter((p) => norm(p.Commune) === key), [rowsAP, key]);

  const analyse = useMemo(
    () => analyserCommune(rows, year, superficieHa),
    [rows, year, superficieHa]
  );

  // Points de feux satellite situés dans la commune
  const bilan = useMemo(() => {
    if (!zone) return null;
    const pts = fires.filter((f) => inZone(f.lon, f.lat, zone)).map((f) => ({ t: f.t, age: f.age, frp: f.frp }));
    return bilanPoints(pts, hours, superficieHa);
  }, [zone, fires, hours, superficieHa]);

  const items = useMemo(
    () =>
      lecture(
        analyse,
        bilan,
        {
          commune,
          ap,
          annee: year,
          rang,
          de: nbCommunes,
          partAP,
          nowMs: Date.now(),
          moisLongs: monthNames,
          geometrieOk: !!zone,
          fenetreH: hours,
        },
        lang
      ),
    [analyse, bilan, commune, ap, year, rang, nbCommunes, partAP, monthNames, zone, hours, lang]
  );

  const mensuel = analyse.mensuel.map((r) => ({
    mois: monthNames[r.m]?.slice(0, 3) ?? String(r.m + 1),
    sel: r.sel ?? undefined,
    prec: r.prec ?? undefined,
    moy: r.moy ?? undefined,
  }));

  const historique = analyse.annees.map((a) => ({
    an: String(a.annee),
    ha: a.ha,
    sel: a.annee === year,
    complet: a.complet,
  }));

  const sel = analyse.anneeSel;

  return (
    <div className="fxm-bg" onClick={onClose} role="presentation">
      <style>{CSS}</style>
      <div className="fxm" role="dialog" aria-modal="true" aria-labelledby="fxm-title" onClick={(e) => e.stopPropagation()}>
        <header className="fxm-h">
          <div>
            <h2 id="fxm-title">{commune}</h2>
            <p>
              {T.apLbl} : {ap} · {year}
            </p>
          </div>
          <button className="fxm-x" onClick={onClose} aria-label={T.fermer} title={T.fermer}>
            <X size={18} />
          </button>
        </header>

        {rows.length === 0 ? (
          <p className="fxm-note">{T.aucune}</p>
        ) : (
          <>
            <div className="fxm-kpis">
              <div className="fxm-kpi">
                <span>{fill(T.totalAn, { an: year })}</span>
                <b>{sel ? fmt(sel.ha) : T.na}</b>
                {sel && !sel.complet && <small>{T.partiel}</small>}
              </div>
              <div className="fxm-kpi">
                <span>{T.rang}</span>
                <b>{rang > 0 ? `${rang} / ${nbCommunes}` : T.na}</b>
                {partAP != null && <small>{`${T.partAP} : ${partAP.toFixed(1)} %`}</small>}
              </div>
              <div className="fxm-kpi">
                <span>{T.interieurAn}</span>
                <b>{analyse.interieur ? fmt(analyse.interieur.moy) : T.na}</b>
              </div>
              <div className="fxm-kpi">
                <span>{T.recurrence}</span>
                <b>{analyse.recurrence.sur ? `${analyse.recurrence.n} / ${analyse.recurrence.sur}` : T.na}</b>
              </div>
              <div className="fxm-kpi">
                <span>{T.detect72}</span>
                <b>{bilan ? nf(bilan.n72) : T.na}</b>
              </div>
            </div>

            <div className="fxm-grid">
              <section className="fxm-card">
                <h3>{T.mens}</h3>
                <div className="fxm-chips">
                  <span>
                    <i style={{ background: "#2563eb", opacity: 0.5 }} />
                    {T.prec} ({year - 1})
                  </span>
                  <span>
                    <i style={{ background: "#dc2626" }} />
                    {T.sel} ({year})
                  </span>
                  <span>
                    <i style={{ background: "#64748b" }} />
                    {T.moy}
                  </span>
                </div>
                <div className="fxm-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mensuel} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border,#e2e8f0)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" tick={TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} />
                      <Tooltip contentStyle={TIP_STYLE} labelStyle={{ color: "var(--text,#0f172a)" }} formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="prec" name={`${year - 1}`} fill="#2563eb" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="sel" name={`${year}`} fill="#dc2626" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="moy" name={T.moy} stroke="#64748b" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="fxm-note">{T.mensNote}</p>
              </section>

              <section className="fxm-card">
                <h3>{T.hist}</h3>
                <div className="fxm-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historique} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border,#e2e8f0)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="an" tick={TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} />
                      <Tooltip contentStyle={TIP_STYLE} labelStyle={{ color: "var(--text,#0f172a)" }} formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="ha" name="ha" radius={[4, 4, 0, 0]}>
                        {historique.map((h, i) => (
                          <Cell key={i} fill={h.sel ? "#dc2626" : h.complet ? "#64748b" : "#cbd5e1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="fxm-note">{T.histNote}</p>
              </section>
            </div>

            <section className="fxm-card">
              <h3 style={{ color: "var(--text,#0f172a)" }}>{T.lect}</h3>
              {items.map((it, i) => (
                <div key={i} className="fxm-item" style={{ borderLeftColor: LVL_COLOR[it.lvl] }}>
                  <div className="fxm-it-t" style={{ color: LVL_COLOR[it.lvl] }}>
                    {it.t}
                  </div>
                  <div className="fxm-it-d">{it.d}</div>
                  {it.acts && it.acts.length > 0 && (
                    <ul className="fxm-acts">
                      {it.acts.map((a, j) => (
                        <li key={j}>{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>

            <p className="fxm-note">{T.src}</p>
          </>
        )}
      </div>
    </div>
  );
}
