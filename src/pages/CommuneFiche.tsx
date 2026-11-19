import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
// Ajuste le chemin selon ton arborescence (communeFeux.ts est dans server/)
import { analyserCommune, bilanPoints, rapport, txtCommune, CFG } from "../../server/communeFeux";
import type { Item, Lecture as LectureT, Niveau } from "../../server/communeFeux";
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
  nowMs?: number;                // optionnel : date de référence (tests) ; par défaut maintenant
};

const LOC: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE" };
const LVL_COLOR: Record<"haute" | "moyenne" | "info", string> = { haute: "#dc2626", moyenne: "#d97706", info: "#2563eb" };
const NIV_COLOR: Record<Niveau, string> = { critique: "#b91c1c", eleve: "#ea580c", modere: "#d97706", faible: "#16a34a" };
const REF_LABEL = `${CFG.REF_DEBUT}–${CFG.REF_FIN}`;

const CSS = `
.fxm-bg{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px}
.fxm{background:var(--surface,#fff);color:var(--text,#0f172a);border:1px solid var(--border,#e2e8f0);border-radius:14px;width:min(1080px,100%);max-height:92vh;overflow:auto;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.fxm *{box-sizing:border-box}
.fxm-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.fxm-h h2{margin:0;font-size:20px;color:color-mix(in srgb,#0b4ea2 60%,var(--text,#0f172a))}
.fxm-h p{margin:2px 0 0;font-size:12px;color:var(--text-3,#64748b)}
.fxm-x{border:1px solid var(--border,#e2e8f0);background:var(--surface-3,#f1f5f9);color:var(--text,#0f172a);border-radius:8px;width:32px;height:32px;display:grid;place-items:center;cursor:pointer;flex:none}
.fxm-x:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.fxm-syn{border:1px solid var(--border,#e2e8f0);border-left:6px solid var(--niv);border-radius:10px;padding:10px 12px;background:var(--surface-2,#f8fafc);margin-bottom:10px}
.fxm-syn-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px}
.fxm-badge{background:var(--niv);color:#fff;font-weight:700;font-size:13px;padding:3px 10px;border-radius:999px}
.fxm-conf{font-size:11.5px;color:var(--text-2,#475569)}
.fxm-syn h3{margin:6px 0 4px;font-size:13px}
.fxm-keys{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.fxm-keys li{border-left:4px solid;padding:4px 8px;background:var(--surface,#fff);border-radius:6px}
.fxm-trig{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:11.5px}
.fxm-trig em{font-style:normal;font-weight:600;color:var(--text-2,#475569)}
.fxm-chip{border:1px solid var(--niv);color:var(--text,#0f172a);border-radius:999px;padding:1px 8px}
.fxm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:10px}
.fxm-kpi{border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:8px 10px;background:var(--surface-2,#f8fafc)}
.fxm-kpi span{display:block;font-size:11px;color:var(--text-2,#475569);font-weight:600}
.fxm-kpi b{display:block;font-size:17px;margin-top:2px;color:var(--text,#0f172a)}
.fxm-kpi small{display:block;font-size:10.5px;color:var(--text-3,#64748b)}
.fxm-grid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:10px}
@media(min-width:760px){.fxm-grid{grid-template-columns:1fr 1fr;align-items:start}}
.fxm-card{border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:10px;background:var(--surface,#fff);min-width:0}
.fxm-card h3{margin:0 0 6px;font-size:13px;text-align:center;color:#b91c1c}
.fxm-info h3{color:var(--text,#0f172a);text-align:left}
.fxm-chart{height:220px}
.fxm-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;font-size:11px;color:var(--text-2,#475569);margin-bottom:4px}
.fxm-chips i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
.fxm-note{font-size:11px;color:var(--text-3,#64748b);margin:6px 0 0;text-align:center}
.fxm-lect{margin-top:8px;border-top:1px dashed var(--border,#e2e8f0);padding-top:6px;font-size:12.5px}
.fxm-lect b{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--text-3,#64748b)}
.fxm-lect .k{margin:3px 0;font-weight:700}
.fxm-lect ul{margin:4px 0 0;padding-left:18px;color:var(--text-2,#475569)}
.fxm-lect li{margin-bottom:3px}
.fxm-item{border-left:4px solid;padding:6px 10px;margin-bottom:8px;background:var(--surface-2,#f8fafc);border-radius:6px}
.fxm-item:last-child{margin-bottom:0}
.fxm-it-t{font-weight:700;font-size:13px}
.fxm-it-d{font-size:12.5px;margin-top:2px;color:var(--text-2,#475569)}
.fxm-part{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
.fxm-pc{border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:10px 12px;background:var(--surface-2,#f8fafc)}
.fxm-pc span{display:block;font-size:12px;font-weight:600;color:var(--text-2,#475569)}
.fxm-pc b{font-size:28px;line-height:1.1;color:var(--text,#0f172a)}
.fxm-pc small{display:block;font-size:11px;color:var(--text-3,#64748b);margin-top:2px}
.fxm-bar{height:8px;border-radius:999px;background:var(--border,#e2e8f0);margin:6px 0 4px;overflow:hidden}
.fxm-bar i{display:block;height:100%;border-radius:999px}
.fxm-heatw{overflow-x:auto}
.fxm-heat{border-collapse:separate;border-spacing:2px;width:100%;font-size:10.5px;text-align:center}
.fxm-heat th{font-weight:600;color:var(--text-3,#64748b);padding:2px 3px;white-space:nowrap}
.fxm-heat td{min-width:34px;padding:4px 2px;border-radius:4px;font-variant-numeric:tabular-nums}
.fxm-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.fxm-acts h4{margin:0 0 4px;font-size:12px}
.fxm-acts ul{margin:0;padding-left:16px;font-size:12.5px;color:var(--text-2,#475569)}
.fxm details{margin-bottom:10px}
.fxm summary{cursor:pointer;font-size:13px;font-weight:600;margin-bottom:6px}
@media(prefers-reduced-motion:reduce){.fxm *{transition:none!important}}
`;

const TICK = { fontSize: 11, fill: "var(--text-3,#64748b)" };
const TIP_STYLE = { background: "var(--surface,#fff)", border: "1px solid var(--border,#e2e8f0)", color: "var(--text,#0f172a)", borderRadius: 8, fontSize: 12 };
const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)));

const Items = ({ items }: { items: Item[] }) => (
  <>
    {items.map((l, i) => (
      <div key={`${l.k}-${i}`} className="fxm-item" style={{ borderLeftColor: LVL_COLOR[l.lvl] }}>
        <div className="fxm-it-t" style={{ color: LVL_COLOR[l.lvl] }}>{l.t}</div>
        {l.d && <div className="fxm-it-d">{l.d}</div>}
      </div>
    ))}
  </>
);

const Lecture = ({ title, l }: { title: string; l: LectureT }) => (
  <div className="fxm-lect">
    <b>{title}</b>
    <p className="k">{l.cle}</p>
    {l.lignes.length > 0 && <ul>{l.lignes.map((x, i) => <li key={i}>{x}</li>)}</ul>}
  </div>
);

export default function CommuneFiche({
  commune, ap, year, hours, lang, monthNames, rowsAP, superficieHa, rang, nbCommunes, partAP, zone, fires, onClose, nowMs,
}: CommuneFicheProps) {
  const T = txtCommune(lang);
  const loc = LOC[lang] ?? "fr-FR";
  const fmt = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 }) + " ha";
  const n0 = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 0 });
  const p1 = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 }) + " %";
  const sp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString(loc, { maximumFractionDigits: Math.abs(v) < 10 ? 1 : 0 })} %`;
  const now = useMemo(() => nowMs ?? Date.now(), [nowMs]);

  // Échap pour fermer
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Lignes de cette seule commune
  const key = norm(commune);
  const rows = useMemo(() => rowsAP.filter((p) => norm(p.Commune) === key), [rowsAP, key]);
  const analyse = useMemo(() => analyserCommune(rows, year, superficieHa, now), [rows, year, superficieHa, now]);

  // Points de feux satellite situés dans la commune
  const bilan = useMemo(() => {
    if (!zone) return null;
    const pts = fires.filter((f) => inZone(f.lon, f.lat, zone)).map((f) => ({ t: f.t, age: f.age, frp: f.frp }));
    return bilanPoints(pts, hours, superficieHa);
  }, [zone, fires, hours, superficieHa]);

  // Rapport : niveau de priorité, points clés, actions, lecture de chaque graphe
  const rap = useMemo(
    () => rapport(analyse, bilan, { commune, ap, annee: year, rang, de: nbCommunes, partAP, nowMs: now, moisLongs: monthNames, geometrieOk: !!zone, fenetreH: hours }, lang),
    [analyse, bilan, commune, ap, year, rang, nbCommunes, partAP, now, monthNames, zone, hours, lang]
  );

  const cur = analyse.anneeSel;
  const abbr = (m: number) => monthNames[m]?.slice(0, 3) ?? String(m + 1);

  const mensuel = analyse.mensuel.map((r) => ({ mois: abbr(r.m), sel: r.sel ?? undefined, prec: r.prec ?? undefined, moy: r.moy ?? undefined }));
  const historique = analyse.annees.map((a) => ({
    an: String(a.annee), ha: a.ha, reste: analyse.projection && a.annee === year ? analyse.projection.reste : 0,
    sel: a.annee === year, complet: a.complet,
  }));
  const satSerie = bilan ? [...bilan.bins].reverse().map((b) => ({ tr: `${b.a}h`, n: b.n })) : [];
  const heatMax = Math.max(0, ...analyse.heat.flatMap((r) => r.mois.map((v) => v ?? 0)));

  return (
    <div className="fxm-bg" onClick={onClose} role="presentation">
      <style>{CSS}</style>
      <div className="fxm" role="dialog" aria-modal="true" aria-labelledby="fxm-title" onClick={(e) => e.stopPropagation()}>
        <header className="fxm-h">
          <div>
            <h2 id="fxm-title">{commune}</h2>
            <p>{T.apLbl} : {ap} · {year}</p>
          </div>
          <button className="fxm-x" onClick={onClose} aria-label={T.fermer} title={T.fermer}><X size={18} /></button>
        </header>

        {rows.length === 0 ? (
          <p className="fxm-note">{T.aucune}</p>
        ) : (
          <>
            {/* ===== Synthèse : niveau, points clés, critères ===== */}
            <section className="fxm-syn" style={{ ["--niv" as any]: NIV_COLOR[rap.niveau] }} aria-label={T.cles}>
              <div className="fxm-syn-h">
                <span className="fxm-badge">{T.niveau[rap.niveau]}</span>
                <span className="fxm-conf">{T.confLbl} : <b>{T.conf[rap.confiance]}</b> · {analyse.qualite.nComplet} {lang === "en" ? "complete years" : "années complètes"}</span>
              </div>
              <h3>{T.cles}</h3>
              <ol className="fxm-keys">
                {rap.cles.map((k, i) => (
                  <li key={`${k.k}-${i}`} style={{ borderLeftColor: LVL_COLOR[k.lvl] }}>
                    <div className="fxm-it-t" style={{ color: LVL_COLOR[k.lvl] }}>{k.t}</div>
                    <div className="fxm-it-d">{k.d}</div>
                  </li>
                ))}
              </ol>
              <div className="fxm-trig">
                <em>{T.declench} :</em>
                {rap.declencheurs.length ? rap.declencheurs.map((d) => <span key={d} className="fxm-chip">{d}</span>) : <span>{T.aucunDeclench}</span>}
              </div>
              <p className="fxm-note" style={{ textAlign: "left" }}>{T.niveauNote}</p>
            </section>

            {/* ===== Indicateurs ===== */}
            <div className="fxm-kpis">
              <div className="fxm-kpi">
                <span>{T.totalAn.replace("{an}", String(year))}</span>
                <b>{cur ? fmt(cur.ha) : T.na}</b>
                {cur && cur.complet && analyse.vsRef != null && <small>{`${sp(analyse.vsRef)} ${T.vsMoy} ${REF_LABEL}`}</small>}
                {cur && !cur.complet && <small>{T.partiel}{analyse.memePeriode?.ratio != null ? ` · ×${analyse.memePeriode.ratio.toLocaleString(loc, { maximumFractionDigits: 1 })} ${T.vsMoy}` : ""}</small>}
              </div>
              {analyse.projection && (
                <div className="fxm-kpi">
                  <span>{T.projKpi.replace("{an}", String(year))}</span>
                  <b>≈ {fmt(analyse.projection.ha)}</b>
                  <small>{`${n0(analyse.projection.bas)} – ${n0(analyse.projection.haut)} ha`}</small>
                </div>
              )}
              <div className="fxm-kpi">
                <span>{T.rang}</span>
                <b>{rang > 0 ? `${rang} / ${nbCommunes}` : T.na}</b>
                {partAP != null && <small>{`${T.partAP} : ${p1(partAP)}`}</small>}
              </div>
              <div className="fxm-kpi">
                <span>{T.interieurAn}</span>
                <b>{analyse.interieur ? fmt(analyse.interieur.moy) : T.na}</b>
                {analyse.partInterieur != null && <small>{`${p1(analyse.partInterieur)} ${lang === "en" ? "of the commune's burned area" : "du brûlé de la commune"}`}</small>}
              </div>
              <div className="fxm-kpi">
                <span>{T.recurrence}</span>
                <b>{analyse.recurrence.sur ? `${analyse.recurrence.n} / ${analyse.recurrence.sur}` : T.na}</b>
              </div>
              <div className="fxm-kpi">
                <span>{T.detect72}</span>
                <b>{bilan ? n0(bilan.n72) : T.na}</b>
                {bilan && bilan.n72 > 0 && <small>{`${n0(bilan.n24)} / 24 h`}</small>}
              </div>
            </div>

            {/* ===== Poids de l'intérieur et de la zone 5 km par rapport à la commune ===== */}
            {(analyse.partInterieur != null || analyse.partPeripherie != null || analyse.pctSel) && (
              <section className="fxm-card fxm-info" style={{ marginBottom: 10 }}>
                <h3>{T.partTitre}</h3>
                <div className="fxm-part">
                  {([
                    { lbl: T.partInt, moy: analyse.partInterieur, sel: analyse.pctSel?.interieur ?? null, col: "#dc2626", note: T.partNoteInt },
                    { lbl: T.partTam, moy: analyse.partPeripherie, sel: analyse.pctSel?.peripherie ?? null, col: "#d97706", note: T.partNoteTam },
                  ]).map((x) => {
                    const big = x.sel ?? x.moy;
                    return (
                      <div key={x.lbl} className="fxm-pc">
                        <span>{x.lbl}</span>
                        {big == null ? <b>{T.na}</b> : <b>{p1(big)}</b>}
                        <small>{x.sel != null ? `${year}${analyse.pctSel?.partiel ? ` (${T.partiel})` : ""}` : T.partMoy}</small>
                        <div className="fxm-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, big ?? 0)}%`, background: x.col }} /></div>
                        {x.sel != null && x.moy != null && <small>{`${T.partMoy} : ${p1(x.moy)}`}</small>}
                        <small>{x.note}</small>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===== Graphes et lecture ===== */}
            <div className="fxm-grid">
              <section className="fxm-card">
                <h3>{T.mens}</h3>
                <div className="fxm-chips">
                  <span><i style={{ background: "#2563eb", opacity: 0.5 }} />{T.prec} ({year - 1})</span>
                  <span><i style={{ background: "#dc2626" }} />{T.sel} ({year})</span>
                  <span><i style={{ background: "#64748b" }} />{T.moy}</span>
                </div>
                <div className="fxm-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mensuel} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border,#e2e8f0)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" tick={TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={compact} />
                      <Tooltip contentStyle={TIP_STYLE} labelStyle={{ color: "var(--text,#0f172a)" }} formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="prec" name={`${year - 1}`} fill="#2563eb" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="sel" name={`${year}`} fill="#dc2626" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="moy" name={T.moy} stroke="#64748b" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="fxm-note">{T.mensNote}</p>
                <Lecture title={T.lectLbl} l={rap.lectures.mensuel} />
              </section>

              <section className="fxm-card">
                <h3>{T.hist}</h3>
                <div className="fxm-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historique} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border,#e2e8f0)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="an" tick={TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={compact} />
                      <Tooltip contentStyle={TIP_STYLE} labelStyle={{ color: "var(--text,#0f172a)" }} formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="ha" name="ha" stackId="a">
                        {historique.map((h, i) => <Cell key={i} fill={h.sel ? "#dc2626" : h.complet ? "#64748b" : "#cbd5e1"} />)}
                      </Bar>
                      <Bar dataKey="reste" name={T.projLbl} stackId="a" fill="#fca5a5" fillOpacity={0.6} stroke="#dc2626" strokeDasharray="3 2" radius={[3, 3, 0, 0]} />
                      {analyse.moyRef != null && (
                        <ReferenceLine y={analyse.moyRef} stroke="#0b4ea2" strokeDasharray="5 3" ifOverflow="extendDomain"
                          label={{ value: T.refLbl.replace("{ref}", REF_LABEL), position: "insideTopLeft", fontSize: 10, fill: "#0b4ea2" }} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="fxm-note">{T.histNote}</p>
                <Lecture title={T.lectLbl} l={rap.lectures.historique} />
              </section>
            </div>

            <div className="fxm-grid">
              <section className="fxm-card">
                <h3>{T.heat}</h3>
                <div className="fxm-heatw">
                  <table className="fxm-heat">
                    <thead>
                      <tr><th />{Array.from({ length: 12 }, (_, m) => <th key={m} scope="col">{abbr(m)}</th>)}</tr>
                    </thead>
                    <tbody>
                      {analyse.heat.map((r) => (
                        <tr key={r.annee}>
                          <th scope="row">{r.annee}</th>
                          {r.mois.map((v, m) => {
                            const a = v != null && v > 0 && heatMax > 0 ? 0.08 + 0.92 * Math.sqrt(v / heatMax) : 0;
                            return (
                              <td key={m} title={v == null ? "—" : fmt(v)}
                                style={{ background: v == null ? "transparent" : `rgba(220,38,38,${a})`, color: a > 0.55 ? "#fff" : "var(--text,#0f172a)", outline: v == null ? "1px dashed var(--border,#e2e8f0)" : undefined }}>
                                {v == null ? "–" : v === 0 ? "" : compact(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="fxm-note">{T.heatNote}</p>
                <Lecture title={T.lectLbl} l={rap.lectures.heat} />
              </section>

              <section className="fxm-card">
                <h3>{T.pts}</h3>
                {!zone ? (
                  <p className="fxm-note">{T.ptsSans}</p>
                ) : bilan && bilan.total > 0 ? (
                  <>
                    <div className="fxm-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={satSerie} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border,#e2e8f0)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="tr" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={TICK} axisLine={false} tickLine={false} width={34} allowDecimals={false} />
                          <Tooltip contentStyle={TIP_STYLE} labelStyle={{ color: "var(--text,#0f172a)" }} />
                          <Bar dataKey="n" fill="#ea580c" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="fxm-note">{T.ptsChart.replace("{w}", String(bilan.largeurH))}</p>
                  </>
                ) : (
                  <p className="fxm-note">{T.ptsNo}</p>
                )}
                {rap.lectures.satellite && <Lecture title={T.lectLbl} l={rap.lectures.satellite} />}
              </section>
            </div>

            {/* ===== Actions recommandées ===== */}
            {rap.actions.length > 0 && (
              <section className="fxm-card fxm-info" style={{ marginBottom: 10 }}>
                <h3>{T.actions}</h3>
                <div className="fxm-acts">
                  {rap.actions.map((g) => (
                    <div key={g.hz}>
                      <h4>{T.hz[g.hz]}</h4>
                      <ul>{g.items.map((s) => <li key={s}>{s}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ===== Qualité des données ===== */}
            {rap.qualite.length > 0 && (
              <section className="fxm-card fxm-info" style={{ marginBottom: 10 }}>
                <h3>{T.qualite}</h3>
                <Items items={rap.qualite} />
              </section>
            )}

            <p className="fxm-note">{T.src}</p>
          </>
        )}
      </div>
    </div>
  );
}
