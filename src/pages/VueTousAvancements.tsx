import React, { useMemo } from "react";
import { ArrowLeft, CalendarDays, ListChecks, CheckCircle, Clock, XCircle } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";

const ordreMois = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clampPct = (p: number) => Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0));
const parMois = (a: any, b: any) => ordreMois.indexOf(a.Mois) - ordreMois.indexOf(b.Mois);
const getProgressColor = (v: number) => (v <= 25 ? "#ef4444" : v <= 50 ? "#f59e0b" : v <= 75 ? "#22c55e" : "#2563eb");

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
.vt-wrap{display:flex;flex-direction:column;gap:22px;padding:clamp(12px,2.2vw,28px);box-sizing:border-box;min-width:0}
.vt-head{display:flex;align-items:center;flex-wrap:wrap;gap:14px}
.vt-back{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border-radius:999px;border:1px solid var(--border);
  background:var(--surface);color:var(--text-2);font-size:12px;font-weight:700;cursor:pointer}
.vt-back:hover{background:var(--surface-2)}
.vt-title{font-size:clamp(18px,1.6vw + 8px,28px);font-weight:900;color:var(--text);line-height:1.15}
.vt-chip{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:var(--surface);
  border:1px solid var(--border);color:#16a34a;font-size:12px;font-weight:700}

/* 1 grande carte (Tous) à gauche + 3 colonnes × 2 lignes (UC) à droite */
.vt-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr);gap:12px;align-items:stretch}
.vt-right{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,1fr);grid-auto-rows:1fr;gap:12px}

.vt-card{background:var(--surface);border-radius:22px;border:1px solid var(--border);padding:18px;box-sizing:border-box;
  display:flex;flex-direction:column;gap:12px;min-width:0;box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}
.vt-ch{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text-2)}
.vt-ch::before{content:"";width:4px;height:16px;border-radius:4px;background:#16a34a;flex-shrink:0}
.vt-uc{align-self:flex-start;font-size:12px;font-weight:900;color:#16a34a;background:rgba(22,163,74,.12);border-radius:999px;padding:4px 12px}
.vt-global{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}

/* carte « Tous » : icône + nom + valeur */
.vt-kpis{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;width:100%}
.vt-kpi{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:12px;background:var(--surface-2);min-width:0}
.vt-kpi-ico{width:28px;height:28px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vt-kpi-val{order:3;font-size:16px;font-weight:900;line-height:1;color:var(--text)}
.vt-kpi-lab{order:2;flex:1;min-width:0;font-size:11px;color:var(--text-2);line-height:1.2}

/* cartes UC : icône + valeur seulement, 2 lignes × 2 colonnes */
.vt-compact{padding:12px;gap:8px}
.vt-compact .vt-ch{font-size:11px}
.vt-compact .vt-global{gap:10px}
.vt-kpis2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,auto);gap:6px;width:100%}
.vt-kpi2{display:flex;align-items:center;justify-content:center;gap:8px;padding:5px 8px;border-radius:12px;background:var(--surface-2);min-width:0}
.vt-kpi2-ico{width:24px;height:24px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vt-kpi2-val{font-size:14px;font-weight:900;line-height:1;color:var(--text)}

@container vt (max-width:1100px){.vt-right{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:none}}
@container vt (max-width:800px){.vt-grid{grid-template-columns:minmax(0,1fr)}}
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
          <Cell fill="var(--track)" />
        </Pie>
      </PieChart>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: font, color: "var(--text)", pointerEvents: "none" }}>{label}</div>
    </div>
  );
}

/* « TAUX D'AVANCEMENT GLOBAL DES ACTIVITÉS » pour une UC.
   compact = true : nom de l'UC seul, puis icônes + valeurs en 2×2 (sans libellés). */
function CarteGlobale({ uc, row, t, fmtPct, ringSize, ringFont, ringThick, compact }: any) {
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
        <div className="vt-ch">{uc}</div>
      ) : (
        <>
          <div className="vt-ch">{t.globalProgress}</div>
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

interface Props {
  data: any[];
  annee: number;
  mois: string;
  moisLabel: string;
  onBack: () => void;
  t: any;
  fmtPct: (v: number) => string;
}

export default function VueTousAvancements({ data, annee, mois, moisLabel, onBack, t, fmtPct }: Props) {
  const ucs = useMemo(
    () => Array.from(new Set(data.map((d) => d.UC))).filter((u) => u && u !== "Tous") as string[],
    [data]
  );

  return (
    <div className="vt-page">
      <style>{CSS}</style>
      <div className="vt-wrap">
        <div className="vt-head">
          <button type="button" className="vt-back" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={1.8} /><span>{t.back}</span>
          </button>
          <div className="vt-title">{t.viewAll}</div>
          <div className="vt-chip">
            <CalendarDays size={16} />
            <span>{annee} · {mois === "Tous" ? t.all : moisLabel}</span>
          </div>
        </div>

        <div className="vt-grid">
          {/* Carte 1 : « Tous », inchangée (icône + nom + valeur) */}
          <CarteGlobale uc="Tous" row={choisirLigne(data, annee, mois, "Tous")} t={t} fmtPct={fmtPct}
            ringSize={170} ringFont={24} ringThick={22} />

          {/* Cartes 2 à 7 : une par UC, nom + donut + icônes/valeurs en 2×2 */}
          <div className="vt-right">
            {ucs.map((uc) => (
              <CarteGlobale key={uc} uc={uc} row={choisirLigne(data, annee, mois, uc)} t={t} fmtPct={fmtPct}
                ringSize={84} ringFont={14} ringThick={13} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
