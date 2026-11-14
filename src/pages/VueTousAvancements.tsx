import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, CalendarDays, ListChecks, CheckCircle, Clock, XCircle,
  TrendingDown, TrendingUp, Minus, AlertTriangle, X, Info,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";

const ordreMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clampPct = (p: number) => Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0));
const parMois = (a: any, b: any) => ordreMois.indexOf(a.Mois) - ordreMois.indexOf(b.Mois);
const getProgressColor = (v: number) => (v <= 25 ? "#ef4444" : v <= 50 ? "#f59e0b" : v <= 75 ? "#22c55e" : "#2563eb");

const CODES_COMP = ["C1", "C2", "C3", "C4"];
const AXES_CODES: [string, string][] = [
  ["1.1.1", "diagnostic"], ["1.1.2", "territorialPlanning"], ["1.1.3", "ecosystemMonitoring"], ["1.1.4", "sustainableFinancing"],
  ["1.2.1", "populationParticipation"], ["1.2.2", "mnpCooperation"], ["1.2.3", "intersectoralCoordination"], ["1.2.4", "antiCorruption"],
  ["2.1.1", "landscapeRestoration"], ["2.1.2", "sustainableProduction"], ["2.1.3", "landSecurity"], ["2.1.4", "fireManagement"],
  ["2.2.1", "marketSystem"], ["2.2.2", "productionValorization"], ["2.2.3", "activityDiversification"], ["2.2.4", "communityMobilization"],
];

/* ===== Textes propres à cette vue (autonomes) ===== */
const L: Record<string, any> = {
  fr: {
    pageTitle: "Vue d'ensemble d'avancement",
    year: "ANNÉE", month: "MOIS", analysis: "ANALYSE DES RÉSULTATS", noData: "Aucune donnée pour cette période.",
    ref: "Moyenne (Tous)", components: "Composantes", axesWeak: "Axes les plus faibles",
    late: "En retard", critical: "Retard important", avg: "Dans la moyenne", ahead: "En avance", global: "Global",
    weakUc: "UC la plus en retard", bestUc: "UC la plus avancée", close: "Fermer", clickHint: "Cliquer pour voir l'analyse",
    gapTxt: "écart de {gap} pt",
    s_tous: "Au niveau global ({taux}), la composante la plus en retard est {comp} ({cp}). L'axe le plus faible est « {axis} » ({ap}).",
    s_critical: "{uc} est en retard important ({taux}), principalement à cause de la composante {comp} ({cp}). L'axe le plus faible est « {axis} » ({ap}).",
    s_late: "{uc} est en retard ({taux}), principalement à cause de la composante {comp} ({cp}). L'axe le plus faible est « {axis} » ({ap}).",
    s_avg: "{uc} suit la moyenne ({taux}). Point à surveiller : {comp} ({cp}), axe « {axis} » ({ap}).",
    s_ahead: "{uc} est en avance ({taux}). Son point le plus faible reste {comp} ({cp}).",
  },
  en: {
    pageTitle: "Progress overview",
    year: "YEAR", month: "MONTH", analysis: "RESULTS ANALYSIS", noData: "No data for this period.",
    ref: "Average (All)", components: "Components", axesWeak: "Weakest axes",
    late: "Behind", critical: "Seriously behind", avg: "On average", ahead: "Ahead", global: "Overall",
    weakUc: "Most delayed unit", bestUc: "Most advanced unit", close: "Close", clickHint: "Click to see the analysis",
    gapTxt: "{gap} pt gap",
    s_tous: "Overall ({taux}), the component furthest behind is {comp} ({cp}). The weakest axis is “{axis}” ({ap}).",
    s_critical: "{uc} is seriously behind ({taux}), mainly because of component {comp} ({cp}). The weakest axis is “{axis}” ({ap}).",
    s_late: "{uc} is behind ({taux}), mainly because of component {comp} ({cp}). The weakest axis is “{axis}” ({ap}).",
    s_avg: "{uc} is in line with the average ({taux}). To watch: {comp} ({cp}), axis “{axis}” ({ap}).",
    s_ahead: "{uc} is ahead ({taux}). Its weakest point remains {comp} ({cp}).",
  },
  de: {
    pageTitle: "Fortschrittsübersicht",
    year: "JAHR", month: "MONAT", analysis: "ERGEBNISANALYSE", noData: "Keine Daten für diesen Zeitraum.",
    ref: "Durchschnitt (Alle)", components: "Komponenten", axesWeak: "Schwächste Achsen",
    late: "Im Rückstand", critical: "Stark im Rückstand", avg: "Im Durchschnitt", ahead: "Voraus", global: "Gesamt",
    weakUc: "Am weitesten zurückliegende Einheit", bestUc: "Am weitesten fortgeschrittene Einheit", close: "Schließen", clickHint: "Klicken, um die Analyse zu sehen",
    gapTxt: "{gap} Pkt. Abstand",
    s_tous: "Insgesamt ({taux}) liegt die Komponente {comp} am weitesten zurück ({cp}). Schwächste Achse: „{axis}“ ({ap}).",
    s_critical: "{uc} liegt stark im Rückstand ({taux}), hauptsächlich wegen der Komponente {comp} ({cp}). Schwächste Achse: „{axis}“ ({ap}).",
    s_late: "{uc} liegt im Rückstand ({taux}), hauptsächlich wegen der Komponente {comp} ({cp}). Schwächste Achse: „{axis}“ ({ap}).",
    s_avg: "{uc} liegt im Durchschnitt ({taux}). Zu beobachten: {comp} ({cp}), Achse „{axis}“ ({ap}).",
    s_ahead: "{uc} liegt vorn ({taux}). Schwächster Punkt bleibt {comp} ({cp}).",
  },
  mg: {
    pageTitle: "Topimaso ankapobeny momba ny fandrosoana",
    year: "TAONA", month: "VOLANA", analysis: "FAMPIASANA NY ZAVATRA VITA", noData: "Tsy misy angon-drakitra amin'ity vanim-potoana ity.",
    ref: "Salan'isa (Rehetra)", components: "Singa", axesWeak: "Laharana malemy indrindra",
    late: "Tara", critical: "Tara be", avg: "Salan'isa", ahead: "Mialoha", global: "Ankapobeny",
    weakUc: "UC tara indrindra", bestUc: "UC mandroso indrindra", close: "Hidio", clickHint: "Tsindrio hijerena ny fampiasana",
    gapTxt: "elanelana {gap} pt",
    s_tous: "Amin'ny ankapobeny ({taux}), ny singa tara indrindra dia {comp} ({cp}). Ny laharana malemy indrindra dia « {axis} » ({ap}).",
    s_critical: "Tara be ny {uc} ({taux}), indrindra noho ny singa {comp} ({cp}). Ny laharana malemy indrindra dia « {axis} » ({ap}).",
    s_late: "Tara ny {uc} ({taux}), indrindra noho ny singa {comp} ({cp}). Ny laharana malemy indrindra dia « {axis} » ({ap}).",
    s_avg: "Mitovy amin'ny salan'isa ny {uc} ({taux}). Tokony harahana: {comp} ({cp}), laharana « {axis} » ({ap}).",
    s_ahead: "Mialoha ny {uc} ({taux}). Ny teboka malemy indrindra dia {comp} ({cp}).",
  },
};
const fill = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

/* « C2. GOUVERNANCE ... » -> « C2 – Gouvernance ... » */
const joliComposante = (label: string) => {
  const m = label.match(/^(C\d)\.\s*(.*)$/);
  if (!m) return label;
  const rest = m[2].toLowerCase();
  return `${m[1]} – ${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
};

/* même logique que « coutActuel » de la page principale, pour une UC donnée */
function choisirLigne(data: any[], annee: number, mois: string, uc: string): Record<string, any> {
  const parAnnee = data.filter((d) => d.Année === annee);
  let lignes = parAnnee.filter((d) => d.UC === uc);
  if (!lignes.length && uc === "Tous") lignes = parAnnee;
  lignes = [...lignes].sort(parMois);
  if (mois !== "Tous") return lignes.find((d) => d.Mois === mois) ?? {};
  return [...lignes].reverse().find((d) => n(d.NAA) > 0 || n(d.NAC) > 0 || n(d.TAG) > 0) ?? lignes[0] ?? {};
}

const CSS = `
.vt-page{container-type:inline-size;container-name:vt;width:100%;font-family:Inter,system-ui,sans-serif;border-radius:20px;
  background:radial-gradient(1200px 400px at 0% -10%,rgba(22,163,74,.10),transparent 60%),var(--bg,#f4f7f5)}
.vt-wrap{display:flex;flex-direction:column;gap:18px;padding:clamp(12px,2.2vw,28px);box-sizing:border-box;min-width:0}
.vt-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.vt-head-left{display:flex;align-items:center;flex-wrap:wrap;gap:14px}
.vt-head-right{display:flex;align-items:stretch;gap:8px;margin-left:auto;flex-wrap:wrap}
.vt-back{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:999px;border:1px solid var(--border);
  background:var(--surface);color:var(--text-2);font-size:12px;font-weight:700;cursor:pointer}
.vt-back:hover{background:var(--surface-2)}
.vt-title{font-size:clamp(18px,1.6vw + 8px,28px);font-weight:900;color:var(--text);line-height:1.15}
.vt-filter{display:flex;align-items:center;gap:10px;padding:6px 14px;border-radius:14px;background:var(--surface);border:1px solid var(--border);min-width:130px}
.vt-filter:focus-within{outline:2px solid rgba(22,163,74,.45)}
.vt-filter label{display:block;font-size:10px;font-weight:800;letter-spacing:.5px;color:#16a34a}
.vt-select{width:100%;border:none;background:transparent;color:var(--text);font-size:14px;font-weight:700;outline:none;cursor:pointer;padding:0}

.vt-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:12px;align-items:stretch}
.vt-right{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,1fr);grid-auto-rows:1fr;gap:12px}

.vt-card{background:var(--surface);border-radius:22px;border:1px solid var(--border);padding:18px;box-sizing:border-box;
  display:flex;flex-direction:column;gap:12px;min-width:0;box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}
.vt-ch{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text-2)}
.vt-ch::before{content:"";width:4px;height:16px;border-radius:4px;background:#16a34a;flex-shrink:0}
/* titre cliquable */
.vt-ch-btn{border:none;background:transparent;padding:4px 6px;margin:-4px -6px;border-radius:10px;cursor:pointer;font-family:inherit;text-align:left;width:fit-content;max-width:100%}
.vt-ch-btn:hover{background:rgba(22,163,74,.12);color:#16a34a}
.vt-ch-btn:focus-visible{outline:2px solid rgba(22,163,74,.6)}
.vt-ch-btn svg{flex-shrink:0;opacity:.6}
.vt-uc{align-self:flex-start;font-size:12px;font-weight:900;color:#16a34a;background:rgba(22,163,74,.12);border-radius:999px;padding:4px 12px}
.vt-global{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}

.vt-kpis{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;width:100%}
.vt-kpi{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:12px;background:var(--surface-2);min-width:0}
.vt-kpi-ico{width:28px;height:28px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vt-kpi-val{order:3;font-size:16px;font-weight:900;line-height:1;color:var(--text)}
.vt-kpi-lab{order:2;flex:1;min-width:0;font-size:11px;color:var(--text-2);line-height:1.2}

.vt-compact{padding:12px;gap:8px}
.vt-compact .vt-ch{font-size:11px}
.vt-compact .vt-global{gap:10px}
.vt-kpis2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,auto);gap:6px;width:100%}
.vt-kpi2{display:flex;align-items:center;justify-content:center;gap:8px;padding:5px 8px;border-radius:12px;background:var(--surface-2);min-width:0}
.vt-kpi2-ico{width:24px;height:24px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vt-kpi2-val{font-size:14px;font-weight:900;line-height:1;color:var(--text)}

/* analyses du bas (2) */
.vt-an-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.vt-an-tag{font-size:11px;font-weight:900;letter-spacing:.5px;text-transform:uppercase}
.vt-an{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:18px;background:var(--surface-2,#f1f5f9);min-width:0}
.vt-an-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.vt-an-name{font-size:14px;font-weight:900;color:var(--text,#0f172a)}
.vt-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;border-radius:999px;padding:3px 10px}
.vt-track{position:relative;height:10px;border-radius:999px;background:var(--track,#e2e8f0)}
.vt-track-fill{height:100%;border-radius:999px;transition:width .5s ease}
.vt-track-ref{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--text,#0f172a);opacity:.55;border-radius:2px}
.vt-an-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--text-3,#64748b);gap:8px;flex-wrap:wrap}
.vt-sub{font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text-3,#64748b)}
.vt-chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.vt-chipc{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 4px;border-radius:10px;background:var(--surface,#fff);border:2px solid transparent;font-size:10px;color:var(--text-3,#64748b);font-weight:700}
.vt-chipc b{font-size:12px;font-weight:900}
.vt-chipc.weak{border-color:#ef4444}

/* liste des axes les plus faibles : responsive (retour à la ligne + % toujours visible) */
.vt-axl{display:flex;flex-direction:column;gap:4px;min-width:0}
.vt-axi{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;font-size:12px;color:var(--text,#0f172a);min-width:0}
.vt-axi span{min-width:0;overflow-wrap:anywhere}
.vt-axi b{flex-shrink:0;white-space:nowrap}

.vt-axinline{font-size:12px;line-height:1.6;color:var(--text,#0f172a)}
.vt-axinline .sep{color:var(--text-3,#64748b);margin:0 6px}
.vt-axinline .it{display:inline-block;max-width:100%;overflow-wrap:anywhere}
.vt-an-txt{font-size:12px;line-height:1.5;color:var(--text,#0f172a)}

/* pop-up (rendu dans <body> : valeurs de repli pour les variables) */
.vt-overlay{position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px;
  font-family:Inter,system-ui,sans-serif}
.vt-modal{width:100%;max-width:560px;max-height:90vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#0f172a);border-radius:22px;
  padding:20px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;box-shadow:0 30px 70px -20px rgba(0,0,0,.45)}
.vt-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.vt-modal-title{font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.4px}
.vt-x{width:34px;height:34px;border-radius:50%;border:1px solid var(--border,#e2e8f0);background:var(--surface,#fff);color:var(--text-2,#475569);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.vt-x:hover{background:var(--surface-2,#f1f5f9)}
.vt-modal-ring{display:flex;justify-content:center}

@container vt (max-width:1100px){.vt-right{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:none}}
@container vt (max-width:900px){.vt-an-list{grid-template-columns:minmax(0,1fr)}}
@container vt (max-width:800px){.vt-grid{grid-template-columns:minmax(0,1fr)}.vt-head-right{margin-left:0;width:100%}.vt-filter{flex:1}}
@container vt (max-width:520px){.vt-right{grid-template-columns:minmax(0,1fr)}}
`;

function Ring({ percent, color, size, font, label, thick }: any) {
  const p = clampPct(percent);
  const outer = size / 2 - 2;
  const inner = outer - (thick ?? Math.max(8, size * 0.09));
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", flexShrink: 0 }}>
      <PieChart width={size} height={size}>
        <Pie data={[{ value: p }, { value: 100 - p }]} innerRadius={inner} outerRadius={outer} dataKey="value"
          startAngle={90} endAngle={-270} cornerRadius={8} stroke="none">
          <Cell fill={color} />
          <Cell fill="var(--track, #e2e8f0)" />
        </Pie>
      </PieChart>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: font, color: "var(--text, #0f172a)", pointerEvents: "none" }}>{label}</div>
    </div>
  );
}

function CarteGlobale({ uc, row, t, fmtPct, ringSize, ringFont, ringThick, compact, onOpen, hint }: any) {
  const taux = n(row["TAG"]) * 100;
  const kpis = [
    { icon: ListChecks, label: t.totalPlanned, value: n(row["NAP"]), color: "#64748b" },
    { icon: CheckCircle, label: t.completed, value: n(row["NAA"]), color: "#16a34a" },
    { icon: Clock, label: t.ongoing, value: n(row["NAC"]), color: "#f59e0b" },
    { icon: XCircle, label: t.notStarted, value: n(row["NAD"]), color: "#ef4444" },
  ];
  return (
    <div className={`vt-card${compact ? " vt-compact" : ""}`}>
      {compact ? (
        <button type="button" className="vt-ch vt-ch-btn" onClick={() => onOpen(uc)} title={hint}>
          {uc}<Info size={13} />
        </button>
      ) : (
        <>
          <button type="button" className="vt-ch vt-ch-btn" onClick={() => onOpen("Tous")} title={hint}>
            {t.globalProgress}<Info size={13} />
          </button>
          <span className="vt-uc">{t.all}</span>
        </>
      )}
      <div className="vt-global">
        <Ring percent={taux} color={getProgressColor(taux)} size={ringSize} font={ringFont} thick={ringThick} label={fmtPct(taux)} />
        {compact ? (
          <div className="vt-kpis2">
            {kpis.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="vt-kpi2" title={label} aria-label={`${label} : ${value}`}>
                <div className="vt-kpi2-ico" style={{ background: `${color}22` }}><Icon size={15} color={color} /></div>
                <div className="vt-kpi2-val">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="vt-kpis">
            {kpis.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="vt-kpi">
                <div className="vt-kpi-ico" style={{ background: `${color}22` }}><Icon size={18} color={color} /></div>
                <div className="vt-kpi-val">{value}</div>
                <div className="vt-kpi-lab">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Bloc d'analyse (en bas de page et dans le pop-up) */
function AnalyseBloc({ a, refTaux, tx, fmtPct, t, inline }: any) {
  const isTous = a.kind === "tous";
  const b =
    a.kind === "critical" ? { color: "#ef4444", Icon: AlertTriangle, label: tx.critical }
    : a.kind === "late" ? { color: "#f59e0b", Icon: TrendingDown, label: tx.late }
    : a.kind === "ahead" ? { color: "#2563eb", Icon: TrendingUp, label: tx.ahead }
    : a.kind === "avg" ? { color: "#22c55e", Icon: Minus, label: tx.avg }
    : { color: "#64748b", Icon: Minus, label: tx.global };
  const BI = b.Icon;
  return (
    <div className="vt-an">
      <div className="vt-an-top">
        <span className="vt-an-name">{isTous ? t.all : a.uc}</span>
        <span className="vt-badge" style={{ color: b.color, background: `${b.color}22` }}><BI size={13} />{b.label}</span>
      </div>

      <div>
        <div className="vt-track">
          <div className="vt-track-fill" style={{ width: `${clampPct(a.taux)}%`, background: getProgressColor(a.taux) }} />
          {!isTous && <div className="vt-track-ref" style={{ left: `${clampPct(refTaux)}%` }} title={`${tx.ref} : ${fmtPct(refTaux)}`} />}
        </div>
        <div className="vt-an-meta" style={{ marginTop: 6 }}>
          <span><b style={{ color: getProgressColor(a.taux) }}>{fmtPct(a.taux)}</b></span>
          {!isTous && (
            <span>{fill(tx.gapTxt, { gap: `${a.ecart > 0 ? "+" : ""}${a.ecart.toFixed(1)}` })}</span>
          )}
        </div>
      </div>

      <div>
        <div className="vt-sub" style={{ marginBottom: 6 }}>{tx.components}</div>
        <div className="vt-chips">
          {a.comps.map((c: any) => (
            <div key={c.code} className={`vt-chipc${c.code === a.faibleC.code ? " weak" : ""}`} title={c.label}>
              {c.code}<b style={{ color: getProgressColor(c.value) }}>{fmtPct(c.value)}</b>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="vt-sub" style={{ marginBottom: 6 }}>{tx.axesWeak}</div>
        {inline ? (
          <div className="vt-axinline">
            {a.pires.map((x: any, i: number) => (
              <React.Fragment key={x.code}>
                {i > 0 && <span className="sep">·</span>}
                <span className="it">{x.code} {x.name} <b style={{ color: getProgressColor(x.value) }}>{fmtPct(x.value)}</b></span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="vt-axl">
            {a.pires.map((x: any) => (
              <div key={x.code} className="vt-axi">
                <span>{x.code} · {x.name}</span>
                <b style={{ color: getProgressColor(x.value) }}>{fmtPct(x.value)}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="vt-an-txt">{a.texte}</div>
    </div>
  );
}

interface Props {
  data: any[];
  annee: number;
  mois: string;
  moisLabel?: string;
  onBack: () => void;
  t: any;
  fmtPct: (v: number) => string;
  lang?: string;
}

export default function VueTousAvancements({ data, annee: anneeInit, mois: moisInit, onBack, t, fmtPct, lang }: Props) {
  const tx = L[lang ?? "fr"] ?? L.fr;

  const [annee, setAnnee] = useState<number>(anneeInit);
  const [mois, setMois] = useState<string>(moisInit);
  const [ouvert, setOuvert] = useState<string | null>(null); // UC dont le pop-up est ouvert

  const annees = useMemo(() => Array.from(new Set(data.map((d) => d.Année))).sort((a: any, b: any) => a - b) as number[], [data]);
  const moisListe = useMemo(() => ordreMois.filter((m) => data.some((d) => d.Année === annee && d.Mois === m)), [data, annee]);
  const moisValide = mois === "Tous" || moisListe.includes(mois) ? mois : "Tous";

  const ucs = useMemo(
    () => Array.from(new Set(data.filter((d) => d.Année === annee).map((d) => d.UC))).filter((u) => u && u !== "Tous") as string[],
    [data, annee]
  );

  const rowTous = useMemo(() => choisirLigne(data, annee, moisValide, "Tous"), [data, annee, moisValide]);
  const refTaux = n(rowTous["TAG"]) * 100;

  /* Échap ferme le pop-up */
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  /* Analyse de « Tous » et de chaque UC */
  const analyseMap = useMemo(() => {
    const map: Record<string, any> = {};
    ["Tous", ...ucs].forEach((uc) => {
      const row = uc === "Tous" ? rowTous : choisirLigne(data, annee, moisValide, uc);
      if (!Object.keys(row).length) return;
      const taux = n(row["TAG"]) * 100;
      const comps = CODES_COMP.map((c) => ({ code: c, label: joliComposante(t[`component${c}`] as string), value: n(row[`TAC ${c}`]) * 100 }));
      const faibleC = comps.reduce((a, b) => (b.value < a.value ? b : a));
      const axes = AXES_CODES.map(([code, key]) => ({ code, name: t[key] as string, value: n(row[`TAA ${code}`]) * 100 }));
      const pires = [...axes].sort((a, b) => a.value - b.value).slice(0, 3);
      const faibleA = pires[0];
      const ecart = taux - refTaux;
      const kind = uc === "Tous" ? "tous" : taux <= 25 ? "critical" : ecart < -5 ? "late" : ecart > 5 ? "ahead" : "avg";
      const texte = fill(tx[`s_${kind}`], {
        uc, taux: fmtPct(taux), ref: fmtPct(refTaux),
        comp: faibleC.label, cp: fmtPct(faibleC.value), axis: faibleA.name, ap: fmtPct(faibleA.value),
      });
      map[uc] = { uc, taux, ecart, kind, comps, faibleC, pires, texte };
    });
    return map;
  }, [ucs, data, annee, moisValide, rowTous, refTaux, t, tx, fmtPct]);

  /* UC la plus en retard / la plus avancée */
  const classees = useMemo(
    () => ucs.map((u) => analyseMap[u]).filter(Boolean).sort((a: any, b: any) => a.taux - b.taux),
    [ucs, analyseMap]
  );
  const plusFaible = classees[0];
  const plusAvancee = classees.length > 1 ? classees[classees.length - 1] : null;

  const detail = ouvert ? analyseMap[ouvert] : null;

  return (
    <div className="vt-page">
      <style>{CSS}</style>
      <div className="vt-wrap">
        {/* ===== En-tête + filtres à droite ===== */}
        <div className="vt-head">
          <div className="vt-head-left">
            <button type="button" className="vt-back" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={1.8} /><span>{t.back}</span>
            </button>
            <div className="vt-title">{tx.pageTitle}</div>
          </div>
          <div className="vt-head-right">
            <div className="vt-filter">
              <CalendarDays size={20} color="#16a34a" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="vt-annee">{tx.year}</label>
                <select id="vt-annee" className="vt-select" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                  {annees.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="vt-filter">
              <CalendarDays size={20} color="#16a34a" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="vt-mois">{tx.month}</label>
                <select id="vt-mois" className="vt-select" value={moisValide} onChange={(e) => setMois(e.target.value)}>
                  <option value="Tous">{t.all}</option>
                  {moisListe.map((m) => <option key={m} value={m}>{t.months[m] || m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 7 cartes ===== */}
        <div className="vt-grid">
          <CarteGlobale uc="Tous" row={rowTous} t={t} fmtPct={fmtPct} ringSize={170} ringFont={24} ringThick={22}
            onOpen={setOuvert} hint={tx.clickHint} />
          <div className="vt-right">
            {ucs.map((uc) => (
              <CarteGlobale key={uc} uc={uc} row={choisirLigne(data, annee, moisValide, uc)} t={t} fmtPct={fmtPct}
                ringSize={84} ringFont={14} ringThick={13} compact onOpen={setOuvert} hint={tx.clickHint} />
            ))}
          </div>
        </div>

        {/* ===== 2 analyses : la plus en retard et la plus avancée ===== */}
        <div className="vt-card">
          <div className="vt-ch">{tx.analysis} · {annee} · {moisValide === "Tous" ? t.all : (t.months[moisValide] || moisValide)}</div>
          {!plusFaible ? (
            <div className="vt-an-txt">{tx.noData}</div>
          ) : (
            <div className="vt-an-list">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                <span className="vt-an-tag" style={{ color: "#ef4444" }}>{tx.weakUc}</span>
                <AnalyseBloc a={plusFaible} refTaux={refTaux} tx={tx} fmtPct={fmtPct} t={t} inline />
              </div>
              {plusAvancee && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <span className="vt-an-tag" style={{ color: "#2563eb" }}>{tx.bestUc}</span>
                  <AnalyseBloc a={plusAvancee} refTaux={refTaux} tx={tx} fmtPct={fmtPct} t={t} inline />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Pop-up d'analyse d'une carte (rendu dans <body>) ===== */}
      {detail && createPortal(
        <div className="vt-overlay" onClick={() => setOuvert(null)} role="presentation">
          <style>{CSS}</style>
          <div className="vt-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="vt-modal-head">
              <div className="vt-modal-title">{tx.analysis} · {ouvert === "Tous" ? t.all : ouvert}</div>
              <button type="button" className="vt-x" onClick={() => setOuvert(null)} aria-label={tx.close} title={tx.close}>
                <X size={16} />
              </button>
            </div>
            <div className="vt-modal-ring">
              <Ring percent={detail.taux} color={getProgressColor(detail.taux)} size={120} font={18} thick={16} label={fmtPct(detail.taux)} />
            </div>
            <AnalyseBloc a={detail} refTaux={refTaux} tx={tx} fmtPct={fmtPct} t={t} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
