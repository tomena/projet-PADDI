import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
// Ajuste le chemin selon ton arborescence (communeFeux.ts est dans server/)
import { analyserCommune, bilanPoints, txtCommune } from "../../server/communeFeux";
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

/* ---- Seuils et calibrage (à ajuster avec l'équipe) ---- */
const FRP_SEUIL_MW = 50;        // en dessous, la puissance cumulée n'est pas commentée
const FRP_HA_PAR_MW = 0.5;      // ESTIMATION INDICATIVE : hectares potentiellement touchés par MW cumulé. À calibrer.
const SEUIL_INTERIEUR_HA = 1;

const LOC: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE" };
const LVL_COLOR: Record<"haute" | "moyenne" | "info", string> = { haute: "#dc2626", moyenne: "#d97706", info: "#2563eb" };
const REF_LABEL = "2020–2024";

type Ln = { lvl: "haute" | "moyenne" | "info"; t: string; d?: string };

const CSS = `
.fxm-bg{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px}
.fxm{background:var(--surface,#fff);color:var(--text,#0f172a);border:1px solid var(--border,#e2e8f0);border-radius:14px;width:min(1040px,100%);max-height:92vh;overflow:auto;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
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
.fxm-grid{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:760px){.fxm-grid{grid-template-columns:1fr 1fr;align-items:start}}
.fxm-col{display:flex;flex-direction:column;gap:10px;min-width:0}
.fxm-card{border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:10px;background:var(--surface,#fff);min-width:0}
.fxm-card h3{margin:0 0 6px;font-size:13px;text-align:center;color:#b91c1c}
.fxm-info h3{color:var(--text,#0f172a);text-align:left}
.fxm-chart{height:210px}
.fxm-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;font-size:11px;color:var(--text-2,#475569);margin-bottom:4px}
.fxm-chips i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
.fxm-note{font-size:11px;color:var(--text-3,#64748b);margin:6px 0 0;text-align:center}
.fxm-item{border-left:4px solid;padding:6px 10px;margin-bottom:8px;background:var(--surface-2,#f8fafc);border-radius:6px}
.fxm-item:last-child{margin-bottom:0}
.fxm-it-t{font-weight:700;font-size:13px}
.fxm-it-d{font-size:12.5px;margin-top:2px;color:var(--text-2,#475569)}
@media(prefers-reduced-motion:reduce){.fxm *{transition:none!important}}
`;

const TICK = { fontSize: 11, fill: "var(--text-3,#64748b)" };
const TIP_STYLE = { background: "var(--surface,#fff)", border: "1px solid var(--border,#e2e8f0)", color: "var(--text,#0f172a)", borderRadius: 8, fontSize: 12 };

/* Carte d'information : une liste de constats colorés par niveau */
const InfoCard = ({ title, lines, empty }: { title: string; lines: Ln[]; empty: string }) => (
  <section className="fxm-card fxm-info">
    <h3>{title}</h3>
    {lines.length === 0 ? (
      <p className="fxm-note">{empty}</p>
    ) : (
      lines.map((l, i) => (
        <div key={i} className="fxm-item" style={{ borderLeftColor: LVL_COLOR[l.lvl] }}>
          <div className="fxm-it-t" style={{ color: LVL_COLOR[l.lvl] }}>
            {l.t}
          </div>
          {l.d && <div className="fxm-it-d">{l.d}</div>}
        </div>
      ))
    )}
  </section>
);

export default function CommuneFiche({
  commune, ap, year, hours, lang, monthNames, rowsAP, superficieHa, rang, nbCommunes, partAP, zone, fires, onClose,
}: CommuneFicheProps) {
  const T = txtCommune(lang);
  const isEn = lang === "en";
  const tx = (fr: string, en: string) => (isEn ? en : fr);
  const loc = LOC[lang] ?? "fr-FR";
  const fmt = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 }) + " ha";
  const n0 = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 0 });
  const p1 = (v: number) => v.toLocaleString(loc, { maximumFractionDigits: 1 }) + " %";
  const mName = (m: number) => monthNames[m] ?? String(m + 1);
  const nowDate = new Date();
  const nowMonth = nowDate.getMonth();

  // Échap pour fermer
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Lignes de cette seule commune
  const key = norm(commune);
  const rows = useMemo(() => rowsAP.filter((p) => norm(p.Commune) === key), [rowsAP, key]);

  const analyse = useMemo(() => analyserCommune(rows, year, superficieHa), [rows, year, superficieHa]);

  // Points de feux satellite situés dans la commune
  const bilan = useMemo(() => {
    if (!zone) return null;
    const pts = fires.filter((f) => inZone(f.lon, f.lat, zone)).map((f) => ({ t: f.t, age: f.age, frp: f.frp }));
    return bilanPoints(pts, hours, superficieHa);
  }, [zone, fires, hours, superficieHa]);

  const cur = analyse.anneeSel;
  const curRow = cur;

  /* ---------- Carte 1 : année en cours (sous « Saisonnalité mensuelle ») ---------- */
  const lignesAnnee = useMemo((): Ln[] => {
    const out: Ln[] = [];

    // Bilan de l'année
    if (!cur) {
      out.push({ lvl: "info", t: tx(`Aucune donnée pour ${year}`, `No data for ${year}`) });
    } else if (cur.complet && analyse.vsRef != null) {
      const v = analyse.vsRef;
      out.push({
        lvl: v >= 25 ? "haute" : v >= 10 ? "moyenne" : "info",
        t: `${year} : ${fmt(cur.ha)}`,
        d: tx(
          `${v > 0 ? "+" : ""}${v.toFixed(1)} % par rapport à la moyenne ${REF_LABEL} (${fmt(analyse.moyRef ?? 0)}).`,
          `${v > 0 ? "+" : ""}${v.toFixed(1)} % versus the ${REF_LABEL} average (${fmt(analyse.moyRef ?? 0)}).`
        ),
      });
    } else if (analyse.memePeriode?.ratio != null) {
      const mp = analyse.memePeriode;
      const r = mp.ratio!;
      out.push({
        lvl: r >= 1.3 ? "haute" : r >= 1.1 ? "moyenne" : "info",
        t: tx(
          `${year} incomplet (janvier à ${mName(mp.dernierMois)}) : ${r.toFixed(1)} fois la moyenne de la même période`,
          `${year} incomplete (January to ${mName(mp.dernierMois)}): ${r.toFixed(1)} times the same-period average`
        ),
        d: tx(
          `${fmt(mp.ha)} brûlés, contre ${fmt(mp.ref)} en moyenne sur ${REF_LABEL} pour la même période.`,
          `${fmt(mp.ha)} burned, versus ${fmt(mp.ref)} on average over ${REF_LABEL} for the same period.`
        ),
      });
    } else {
      out.push({ lvl: "info", t: `${year} : ${fmt(cur.ha)}` });
    }

    // Retard de la base
    if (analyse.derniere) {
      const d = analyse.derniere;
      const lag = nowDate.getFullYear() * 12 + nowMonth - (d.annee * 12 + d.mois);
      if (lag >= 1) {
        out.push({
          lvl: "info",
          t: tx(`Dernière donnée de la base : ${mName(d.mois)} ${d.annee}`, `Latest database entry: ${mName(d.mois)} ${d.annee}`),
          d: tx("Les détections récentes ne sont pas encore comptées dans les superficies.", "Recent detections are not yet counted in the burned areas."),
        });
      }
    }

    // Zone tampon : part de la commune
    if (cur && cur.complet && cur.peripherie != null && cur.ha > 0) {
      const pc = (cur.peripherie / cur.ha) * 100;
      out.push({
        lvl: pc >= 20 ? "haute" : pc >= 5 ? "moyenne" : "info",
        t: tx(`Zone tampon 5 km : ${fmt(cur.peripherie)} brûlés en ${year}`, `5 km buffer: ${fmt(cur.peripherie)} burned in ${year}`),
        d: tx(
          `soit ${p1(pc)} de la superficie brûlée de la commune cette année : ces feux peuvent se propager vers l'aire protégée.`,
          `i.e. ${p1(pc)} of the commune's burned area this year: these fires can spread toward the protected area.`
        ),
      });
    }

    // Satellite : détections et puissance cumulée
    if (!zone) {
      out.push({
        lvl: "info",
        t: tx("Limite de commune introuvable", "Commune boundary not found"),
        d: tx("Les points de feux satellite ne peuvent pas être rattachés à la commune.", "Satellite fire points cannot be assigned to the commune."),
      });
    } else if (bilan && bilan.n72 > 0) {
      out.push({
        lvl: bilan.n24 > 0 ? "haute" : "moyenne",
        t: tx(`${bilan.n72} détection(s) satellite sur 72 h`, `${bilan.n72} satellite detection(s) over 72 h`),
        d: tx(`dont ${bilan.n24} sur les dernières 24 h.`, `including ${bilan.n24} in the last 24 h.`),
      });
      if (bilan.frpTotal >= FRP_SEUIL_MW) {
        const hectares = bilan.frpTotal * FRP_HA_PAR_MW;
        out.push({
          lvl: "haute",
          t: tx(
            `Puissance cumulée ${n0(bilan.frpTotal)} MW : propagation possible sur environ ${n0(hectares)} ha`,
            `Cumulative power ${n0(bilan.frpTotal)} MW: possible spread over about ${n0(hectares)} ha`
          ),
          d: tx(
            "Estimation indicative à partir de la puissance détectée : à vérifier sur le terrain.",
            "Indicative estimate from detected power: to be verified on the ground."
          ),
        });
      }
    } else if (bilan) {
      out.push({
        lvl: "info",
        t: tx(`Aucune détection satellite sur ${hours} h`, `No satellite detection over ${hours} h`),
        d: tx(
          "Cela ne dit rien des mois précédents : l'historique vient de la base.",
          "This says nothing about earlier months: the history comes from the database."
        ),
      });
    }

    return out;
  }, [cur, analyse, bilan, zone, year, hours, lang, monthNames]);

  /* ---------- Carte 2 : saisonnalité (sous « Saisonnalité mensuelle ») ---------- */
  const lignesSaison = useMemo((): Ln[] => {
    const out: Ln[] = [];
    const z = analyse.saison;
    if (z && analyse.recurrence.n >= 2) {
      const avant = (z.debut - nowMonth + 12) % 12;
      const dedans = (nowMonth - z.debut + 12) % 12 <= 2;
      const per = `${mName(z.debut)} ${tx("à", "to")} ${mName(z.fin)}`;
      if (dedans) {
        out.push({
          lvl: "haute",
          t: tx(`Nous sommes dans la fenêtre à risque (${per})`, `We are inside the risk window (${per})`),
          d: tx(
            `${p1(z.part)} des surfaces brûlées se concentrent sur ces trois mois (pic en ${mName(z.pic)}). Activer la veille et positionner les équipes.`,
            `${p1(z.part)} of burned area is concentrated in these three months (peak in ${mName(z.pic)}). Activate watch and position teams.`
          ),
        });
      } else if (avant <= 2) {
        out.push({
          lvl: "haute",
          t: tx(`La fenêtre à risque (${per}) commence dans ${avant} mois`, `The risk window (${per}) starts in ${avant} months`),
          d: tx(
            `${p1(z.part)} des surfaces brûlées se concentrent sur ces trois mois. Ouvrir et entretenir les pare-feux avant le début.`,
            `${p1(z.part)} of burned area is concentrated in these three months. Open and maintain firebreaks before it starts.`
          ),
        });
      } else {
        out.push({
          lvl: "moyenne",
          t: tx(`Période la plus touchée : ${per}`, `Most affected period: ${per}`),
          d: tx(
            `${p1(z.part)} des surfaces brûlées (pic en ${mName(z.pic)}). Hors de cette fenêtre, c'est le moment de faire le bilan et de planifier.`,
            `${p1(z.part)} of burned area (peak in ${mName(z.pic)}). Outside this window, it is time to review and plan.`
          ),
        });
      }
    }
    if (analyse.recurrence.sur < 3) {
      out.push({
        lvl: "info",
        t: tx("Historique trop court pour une saisonnalité fiable", "History too short for a reliable seasonality"),
        d: tx(`Moins de 3 années complètes dans la base.`, `Fewer than 3 complete years in the database.`),
      });
    }
    return out;
  }, [analyse, nowMonth, lang, monthNames]);

  /* ---------- Carte 3 : multi-annuel + verdict (sous « Historique annuel ») ---------- */
  const lignesMulti = useMemo((): Ln[] => {
    const out: Ln[] = [];

    // Verdict sur l'année en cours
    if (cur?.complet && analyse.vsRef != null) {
      const v = analyse.vsRef;
      const word =
        v >= 25 ? tx("année très forte", "very severe year")
          : v >= 10 ? tx("année au-dessus de la moyenne", "above-average year")
          : v <= -10 ? tx("année en dessous de la moyenne", "below-average year")
          : tx("année proche de la moyenne", "near-average year");
      out.push({
        lvl: v >= 25 ? "haute" : v >= 10 ? "moyenne" : "info",
        t: tx(`Verdict ${year} : ${word}`, `${year} verdict: ${word}`),
        d: tx(`Référence ${REF_LABEL}, moyenne ${fmt(analyse.moyRef ?? 0)}.`, `${REF_LABEL} reference, average ${fmt(analyse.moyRef ?? 0)}.`),
      });
    } else if (cur && analyse.memePeriode?.ratio != null) {
      const r = analyse.memePeriode.ratio!;
      const word =
        r >= 1.3 ? tx("forte pression pour la période", "high pressure for the period")
          : r >= 1.1 ? tx("au-dessus de la même période", "above the same period")
          : r <= 0.9 ? tx("en dessous de la même période", "below the same period")
          : tx("proche de la même période", "close to the same period");
      out.push({
        lvl: r >= 1.3 ? "haute" : r >= 1.1 ? "moyenne" : "info",
        t: tx(`Verdict ${year} (partiel) : ${word}`, `${year} verdict (partial): ${word}`),
        d: tx("Année non terminée : le verdict porte sur la même période des années complètes.", "Year not finished: the verdict compares the same period of complete years."),
      });
    }

    // Tendance
    if (analyse.tendance === "hausse") {
      out.push({
        lvl: "moyenne",
        t: tx("Les surfaces brûlées augmentent", "Burned areas are increasing"),
        d: tx(`${fmt(analyse.moyFin)}/an en moyenne récemment, contre ${fmt(analyse.moyDebut)}/an au début. À confirmer.`, `${fmt(analyse.moyFin)}/yr recently, versus ${fmt(analyse.moyDebut)}/yr at the start. To be confirmed.`),
      });
    } else if (analyse.tendance === "baisse") {
      out.push({
        lvl: "info",
        t: tx("Baisse des surfaces brûlées", "Burned areas are decreasing"),
        d: tx(`${fmt(analyse.moyFin)}/an en moyenne récemment, contre ${fmt(analyse.moyDebut)}/an au début.`, `${fmt(analyse.moyFin)}/yr recently, versus ${fmt(analyse.moyDebut)}/yr at the start.`),
      });
    }

    // Récurrence
    const rec = analyse.recurrence;
    if (rec.sur >= 3 && analyse.moyHa > 0) {
      if (rec.n === rec.sur) {
        out.push({
          lvl: "moyenne",
          t: tx("Des feux chaque année", "Fires every year"),
          d: tx(`Surfaces brûlées enregistrées ${rec.n} années sur ${rec.sur} : feux structurels, pas accidentels.`, `Burned area recorded in ${rec.n} of ${rec.sur} years: structural, not accidental, fires.`),
        });
      } else if (rec.n / rec.sur < 0.5) {
        out.push({
          lvl: "info",
          t: tx("Feux occasionnels", "Occasional fires"),
          d: tx(`Surfaces brûlées enregistrées seulement ${rec.n} années sur ${rec.sur}.`, `Burned area recorded in only ${rec.n} of ${rec.sur} years.`),
        });
      }
    }

    // Aire protégée (intérieur)
    if (analyse.interieur) {
      const i = analyse.interieur;
      if (i.moy < SEUIL_INTERIEUR_HA) {
        out.push({
          lvl: "info",
          t: tx("Pas de feu significatif dans l'aire protégée", "No significant fire inside the protected area"),
          d: tx("Moins de 1 ha par an en moyenne à l'intérieur.", "Less than 1 ha per year on average inside."),
        });
      } else {
        out.push({
          lvl: i.moy >= 500 ? "haute" : "moyenne",
          t: tx(`Intérieur de l'AP : ${fmt(i.moy)}/an en moyenne`, `Inside the PA: ${fmt(i.moy)}/yr on average`),
          d: tx(`Touché ${i.touchees} années sur ${i.sur}. Renforcer patrouilles et pare-feux en limite.`, `Affected ${i.touchees} of ${i.sur} years. Strengthen patrols and boundary firebreaks.`),
        });
      }
    }

    // Zone tampon (moyenne)
    if (analyse.peripherie && analyse.peripherie.moy >= 200) {
      out.push({
        lvl: "moyenne",
        t: tx(`Zone tampon 5 km : ${fmt(analyse.peripherie.moy)}/an en moyenne`, `5 km buffer: ${fmt(analyse.peripherie.moy)}/yr on average`),
        d: tx("Ces feux peuvent se propager vers l'aire protégée : prévoir des pare-feux avec les communautés riveraines.", "These fires can spread toward the protected area: plan firebreaks with neighbouring communities."),
      });
    }

    // Rang dans l'AP
    if (rang > 0 && partAP != null) {
      out.push({
        lvl: rang <= 3 ? "haute" : rang <= 6 ? "moyenne" : "info",
        t: tx(`N° ${rang} sur ${nbCommunes} dans l'AP`, `No. ${rang} of ${nbCommunes} in the PA`),
        d: tx(`${p1(partAP)} des surfaces brûlées de l'aire protégée en ${year}.`, `${p1(partAP)} of the protected area's burned area in ${year}.`),
      });
    }

    return out;
  }, [cur, analyse, year, rang, nbCommunes, partAP, lang, monthNames]);

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
                <span>{T.totalAn.replace("{an}", String(year))}</span>
                <b>{cur ? fmt(cur.ha) : T.na}</b>
                {cur && !cur.complet && <small>{T.partiel}</small>}
              </div>
              <div className="fxm-kpi">
                <span>{T.rang}</span>
                <b>{rang > 0 ? `${rang} / ${nbCommunes}` : T.na}</b>
                {partAP != null && <small>{`${T.partAP} : ${p1(partAP)}`}</small>}
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
                <b>{bilan ? n0(bilan.n72) : T.na}</b>
              </div>
            </div>

            <div className="fxm-grid">
              {/* Colonne gauche : saisonnalité + année en cours */}
              <div className="fxm-col">
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

                <InfoCard
                  title={tx(`Année ${year} et saisonnalité`, `${year} and seasonality`)}
                  lines={[...lignesAnnee, ...lignesSaison]}
                  empty={T.aucune}
                />
              </div>

              {/* Colonne droite : historique + saisonnalité multi-annuelle + verdict */}
              <div className="fxm-col">
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

                <InfoCard
                  title={tx("Analyse multi-annuelle et verdict", "Multi-year analysis and verdict")}
                  lines={lignesMulti}
                  empty={T.aucune}
                />
              </div>
            </div>

            <p className="fxm-note">{T.src}</p>
          </>
        )}
      </div>
    </div>
  );
}
