import React, { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { Parcelle } from './SuiviDashboard';

/* Seuils de lecture (hypothèses à valider avec l'équipe S&E) */
const SEUIL_OK = 0.95;        // ratio validé / attendu : sur la trajectoire
const SEUIL_RETARD = 0.7;     // en dessous : retard critique
const SEUIL_ATTENTE = 0.2;    // part en attente jugée élevée
const SEUIL_REJET = 0.1;      // part rejetée jugée élevée
const SEUIL_GPS_M = 10;       // précision GPS acceptable (m)
const SEUIL_GPS_PART = 0.25;  // part max de parcelles imprécises
const SEUIL_CONC = 0.5;       // part max des 3 premières régions
const N_MIN = 30;             // effectif minimal pour interpréter

type Props = {
  rows: Parcelle[];
  cible: number;
  debut: number;
  fin: number;
  /** vrai si un filtre est actif : la cible n'est alors plus comparable */
  filtre: boolean;
};

const fr = (n: number, d = 0) => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const sum = (r: Parcelle[]) => r.reduce((s, x) => s + x.superficie_ha, 0);

type Niveau = 'ok' | 'warn' | 'bad';
const COL: Record<Niveau, string> = { ok: 'var(--gv)', warn: '#FFB300', bad: 'var(--bad)' };

export default function OodaPanel({ rows, cible, debut, fin, filtre }: Props) {
  const a = useMemo(() => {
    const valide = sum(rows.filter((r) => r.statut === 'Validé'));
    const attente = sum(rows.filter((r) => r.statut === 'En attente'));
    const rejete = sum(rows.filter((r) => r.statut === 'Rejeté'));
    const total = valide + attente + rejete;

    const now = new Date();
    const duree = fin + 1 - debut;
    const ecoule = Math.min(duree, Math.max(0, now.getFullYear() + now.getMonth() / 12 - debut));
    const restant = Math.max(0.01, duree - ecoule);
    const attendu = cible * (ecoule / duree);
    const ratio = attendu > 0 ? valide / attendu : 1;
    const rythmeReel = ecoule > 0 ? valide / ecoule : 0;
    const rythmeRequis = Math.max(0, cible - valide) / restant;

    const gpsFaible = rows.filter((r) => r.precision_gps_m > SEUIL_GPS_M).length;
    const parRegion: Record<string, number> = {};
    rows.forEach((r) => { parRegion[r.region] = (parRegion[r.region] || 0) + r.superficie_ha; });
    const top = Object.entries(parRegion).sort((x, y) => y[1] - x[1]);
    const top3 = top.slice(0, 3).reduce((s, e) => s + e[1], 0);
    const parPratique: Record<string, number> = {};
    rows.forEach((r) => { parPratique[r.pratique_cat] = (parPratique[r.pratique_cat] || 0) + r.superficie_ha; });
    const pratiquePrincipale = Object.entries(parPratique).sort((x, y) => y[1] - x[1])[0];

    const annees: any[] = [];
    for (let y = debut; y <= fin; y++) {
      const passe = y <= now.getFullYear();
      annees.push({
        annee: String(y),
        objectif: Math.round((cible * (y + 1 - debut)) / duree),
        valide: passe ? Math.round(sum(rows.filter((r) => r.statut === 'Validé' && r.annee <= y))) : null,
        declare: passe ? Math.round(sum(rows.filter((r) => r.annee <= y))) : null,
      });
    }

    return {
      valide, attente, rejete, total, attendu, ratio, rythmeReel, rythmeRequis, ecoule, restant,
      pAttente: total ? attente / total : 0,
      pRejet: total ? rejete / total : 0,
      pGps: rows.length ? gpsFaible / rows.length : 0,
      moyenne: rows.length ? total / rows.length : 0,
      nRegions: top.length,
      topRegion: top[0],
      pTop3: total ? top3 / total : 0,
      pratiquePrincipale,
      annees,
    };
  }, [rows, cible, debut, fin]);

  if (!rows.length) return null;

  const statut: Niveau = a.ratio >= SEUIL_OK ? 'ok' : a.ratio >= SEUIL_RETARD ? 'warn' : 'bad';
  const verdict = { ok: 'Sur la trajectoire', warn: 'Retard modéré', bad: 'Retard critique' }[statut];
  const comparable = !filtre; // la cible est nationale : pas de verdict sur une sélection filtrée
  const fiable = rows.length >= N_MIN;

  /* Décisions : règles simples, chacune avec responsable et délai suggérés */
  const decisions: { niv: Niveau; titre: string; action: string; qui: string; delai: string }[] = [];
  if (comparable && statut !== 'ok') {
    const rattrapable = a.valide + a.attente >= a.attendu;
    decisions.push(rattrapable
      ? { niv: 'warn', titre: 'Retard surtout administratif',
          action: `${fr(a.attente)} ha en attente suffiraient à rejoindre la trajectoire : accélérer la validation.`,
          qui: 'Cellule de validation', delai: '30 jours' }
      : { niv: 'bad', titre: 'Retard de réalisation',
          action: `Il faut ${fr(a.rythmeRequis)} ha/an contre ${fr(a.rythmeReel)} ha/an réalisés (×${fr(a.rythmeRequis / (a.rythmeReel || 1), 1)}) : renforcer les zones et partenaires les plus productifs.`,
          qui: 'Coordination / partenaires', delai: 'Prochain trimestre' });
  }
  if (a.pAttente > SEUIL_ATTENTE) {
    decisions.push({ niv: 'warn', titre: 'Stock de parcelles en attente élevé',
      action: `${fr(a.pAttente * 100, 0)} % de la superficie n'est pas encore validée : fixer un délai maximal de traitement.`,
      qui: 'Suivi-évaluation', delai: '30 jours' });
  }
  if (a.pRejet > SEUIL_REJET) {
    decisions.push({ niv: 'bad', titre: 'Taux de rejet élevé',
      action: `${fr(a.pRejet * 100, 0)} % rejetés : analyser les motifs et former les agents de collecte concernés.`,
      qui: 'Agents de terrain / S&E', delai: '60 jours' });
  }
  if (a.pGps > SEUIL_GPS_PART) {
    decisions.push({ niv: 'warn', titre: 'Qualité GPS insuffisante',
      action: `${fr(a.pGps * 100, 0)} % des parcelles dépassent ${SEUIL_GPS_M} m d'erreur : recontrôler ou recalibrer les appareils.`,
      qui: 'Équipe SIG', delai: '60 jours' });
  }
  if (a.pTop3 > SEUIL_CONC && a.nRegions > 3) {
    decisions.push({ niv: 'warn', titre: 'Réalisations concentrées',
      action: `3 régions portent ${fr(a.pTop3 * 100, 0)} % des superficies : cibler les régions sous-représentées.`,
      qui: 'Coordination régionale', delai: 'Prochain plan annuel' });
  }
  if (!decisions.length) {
    decisions.push({ niv: 'ok', titre: 'Aucune alerte', action: 'Maintenir le rythme et le contrôle qualité actuels.', qui: 'Équipe projet', delai: 'Suivi mensuel' });
  }

  const KPI = (label: string, val: string, sub?: string, niv?: Niveau) => (
    <div className="ooda-kpi">
      <span>{label}</span>
      <b style={niv ? { color: COL[niv] } : undefined}>{val}</b>
      {sub && <small>{sub}</small>}
    </div>
  );

  return (
    <section className="sv-c ooda" aria-label="Analyse OODA">
      <style>{CSS}</style>

      {!fiable && (
        <p className="ooda-note bad">Seulement {rows.length} parcelle(s) : interpréter avec prudence (seuil recommandé : {N_MIN}).</p>
      )}
      {filtre && (
        <p className="ooda-note">Un filtre est actif : la cible ({fr(cible)} ha) est nationale, le verdict de trajectoire est donc masqué.</p>
      )}

      <div className="ooda-grid">
        {/* 1. OBSERVER */}
        <div className="ooda-col">
          <h4><i>1</i> Observer <small>Que s'est-il passé ?</small></h4>
          {KPI('Validé', `${fr(a.valide)} ha`, `${fr(a.total ? (a.valide / a.total) * 100 : 0, 0)} % du déclaré`)}
          {KPI('Déclaré', `${fr(a.total)} ha`, `${fr(rows.length)} parcelles · moy. ${fr(a.moyenne, 1)} ha`)}
          {KPI('En attente / rejeté', `${fr(a.attente)} / ${fr(a.rejete)} ha`)}
        </div>

        {/* 2. ORIENTER */}
        <div className="ooda-col">
          <h4><i>2</i> Orienter <small>Qu'est-ce que cela signifie ?</small></h4>
          {comparable ? (
            <>
              {KPI('Trajectoire', verdict, `Attendu à ce jour : ${fr(a.attendu)} ha · réalisé ${fr(a.ratio * 100, 0)} %`, statut)}
              {KPI('Rythme annuel', `${fr(a.rythmeReel)} → ${fr(a.rythmeRequis)} ha/an`, 'réel → requis pour atteindre la cible', a.rythmeRequis > a.rythmeReel * 1.2 ? 'warn' : 'ok')}
            </>
          ) : KPI('Part de la sélection', `${fr((a.total / (cible || 1)) * 100, 1)} %`, 'du total déclaré / cible')}
          {KPI('Qualité des données', `${fr(a.pRejet * 100, 0)} % rejet · ${fr(a.pGps * 100, 0)} % GPS > ${SEUIL_GPS_M} m`, undefined, a.pRejet > SEUIL_REJET || a.pGps > SEUIL_GPS_PART ? 'warn' : 'ok')}
          {a.topRegion && KPI('Concentration', `${a.topRegion[0]} : ${fr((a.topRegion[1] / (a.total || 1)) * 100, 0)} %`, `3 premières régions : ${fr(a.pTop3 * 100, 0)} % · ${a.nRegions} région(s)`)}
          {a.pratiquePrincipale && KPI('Pratique dominante', a.pratiquePrincipale[0], `${fr((a.pratiquePrincipale[1] / (a.total || 1)) * 100, 0)} % des superficies`)}
        </div>

        {/* 3. DÉCIDER */}
        <div className="ooda-col">
          <h4><i>3</i> Décider <small>Quelles priorités ?</small></h4>
          <ol className="ooda-dec">
            {decisions.map((d, i) => (
              <li key={i} style={{ borderLeftColor: COL[d.niv] }}>
                <b>{d.titre}</b>
                <span>{d.action}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 4. AGIR */}
        <div className="ooda-col">
          <h4><i>4</i> Agir <small>Qui, quand ?</small></h4>
          <table className="ooda-tab">
            <thead><tr><th>Action</th><th>Responsable</th><th>Délai</th></tr></thead>
            <tbody>
              {decisions.map((d, i) => (
                <tr key={i}><td>{d.titre}</td><td>{d.qui}</td><td>{d.delai}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="ooda-note">Reboucler : après exécution, relire ce panneau à la prochaine actualisation.</p>
        </div>
      </div>

      {/* Trajectoire cumulée */}
      <div className="ooda-chart">
        <h4>Trajectoire cumulée vs objectif linéaire ({debut}–{fin})</h4>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={a.annees} margin={{ left: 0, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: 'var(--txt2)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--txt2)', fontSize: 11 }} tickFormatter={(v) => fr(v)} width={60} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--txt)' }}
                formatter={(v: any) => (v == null ? '—' : `${fr(v)} ha`)}
              />
              <Legend />
              <Area type="monotone" dataKey="declare" name="Déclaré (cumul)" stroke="#FFB300" fill="#FFB300" fillOpacity={0.15} connectNulls={false} />
              <Line type="monotone" dataKey="valide" name="Validé (cumul)" stroke="var(--gv)" strokeWidth={3} dot connectNulls={false} />
              <Line type="monotone" dataKey="objectif" name="Objectif linéaire" stroke="var(--bad)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.ooda{gap:12px}
.ooda-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--g)}
@media(max-width:1300px){.ooda-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.ooda-grid{grid-template-columns:1fr}}
.ooda-col{border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0}
.ooda-col h4{margin:0;text-align:left;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ooda-col h4 i{font-style:normal;background:var(--gb);color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px}
.ooda-col h4 small{font-weight:500;color:var(--mut);font-size:11px;width:100%}
.ooda-kpi{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--txt2)}
.ooda-kpi b{font-size:clamp(14px,1.4vw,18px);color:var(--gv);line-height:1.2}
.ooda-kpi small{color:var(--mut)}
.ooda-dec{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.ooda-dec li{border-left:4px solid;padding:4px 8px;background:var(--e2);border-radius:0 6px 6px 0;font-size:12px;display:flex;flex-direction:column;gap:2px}
.ooda-dec li b{color:var(--txt)}
.ooda-tab{width:100%;border-collapse:collapse;font-size:11px}
.ooda-tab th{background:var(--gb);color:#fff;padding:5px;text-align:left}
.ooda-tab td{padding:5px;border-bottom:1px solid var(--line);color:var(--txt);vertical-align:top}
.ooda-note{margin:0;font-size:11px;color:var(--mut)}
.ooda-note.bad{color:var(--bad);font-weight:600}
.ooda-chart h4{margin:0 0 6px}
`;
