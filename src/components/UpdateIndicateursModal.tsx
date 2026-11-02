import React, { useEffect, useState } from "react";
import { X, Save, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { ANTENNES, SEMESTRES, LIBELLE_SEMESTRE, type Semestre, CHAMPS, GROUPES, ligneJusqua, construireValeurs, avertissements, fmtNombre, type Base } from "../utils/indicateurs";

interface Props {
  onClose: () => void;
  userName?: string;
  token?: string;
  base: Base | null;            // base chargée par le tableau de bord (valeurs de départ du formulaire)
  anneeParDefaut?: number;
  antenneParDefaut?: string;    // "" ou "Toutes" = ligne Toutes
  onImported?: () => void;
}

/* Droits : doivent rester identiques à api/import-indicateurs.ts (le serveur refait toujours la vérification). */
const ADMIN = ["Toky", "Zo", "Joary"];
const ANTENNE_PAR_UTILISATEUR: Record<string, string> = {
  Allan: "Diana",
  Herimanga: "Boeny",
  Michael: "Amoron'i Mania",
  Tsinjo: "Anosy",
  Njaka: "Atsimo-Atsinanana",
};

export default function UpdateIndicateursModal({ onClose, userName, token, base, anneeParDefaut, antenneParDefaut, onImported }: Props) {
  const estAdmin = ADMIN.includes(userName ?? "");
  const monAntenne = ANTENNE_PAR_UTILISATEUR[userName ?? ""];
  const antennesPermises = estAdmin ? ["Toutes", ...ANTENNES] : monAntenne ? [monAntenne] : [];

  const [annee, setAnnee] = useState<number>(anneeParDefaut ?? new Date().getFullYear());
  const [semestre, setSemestre] = useState<Semestre>(new Date().getMonth() < 6 ? "S1" : "S2");
  const [antenne, setAntenne] = useState<string>(
    estAdmin ? (antenneParDefaut && antennesPermises.includes(antenneParDefaut) ? antenneParDefaut : "Toutes") : monAntenne ?? ""
  );
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // undefined = chargement / indisponible, null = jamais de mise à jour, sinon date ISO
  const [derniereMaj, setDerniereMaj] = useState<string | null | undefined>(undefined);

  // Valeurs de départ : ligne du semestre choisi si elle existe, sinon dernière situation connue (valeurs cumulées)
  const source = ligneJusqua(base, annee, semestre, antenne);
  const existe = !!source && Number(source["Année"]) === annee && source.Semestre === semestre;

  useEffect(() => {
    const depart: Record<string, string> = {};
    for (const c of CHAMPS) {
      const v = source?.[c.cle];
      if (v !== null && v !== undefined) depart[c.cle] = String(v);
    }
    setSaisies(depart);
    setErreur(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annee, semestre, antenne, base]);

  // « Ta dernière mise à jour »
  useEffect(() => {
    if (!token) return;
    let annule = false;
    fetch("/api/derniere-maj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, source: "indicateurs" }),
    })
      .then((r) => r.json())
      .then((d) => { if (!annule) setDerniereMaj(d.date ?? null); })
      .catch(() => { if (!annule) setDerniereMaj(undefined); });
    return () => { annule = true; };
  }, [token]);

  const formaterDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Indian/Antananarivo" });

  // Avertissements de cohérence (non bloquants), calculés sur ce qui est saisi
  const numeriques: Record<string, number> = {};
  for (const c of CHAMPS) {
    const x = Number((saisies[c.cle] ?? "").replace(/\s/g, "").replace(",", "."));
    if ((saisies[c.cle] ?? "").trim() !== "" && Number.isFinite(x)) numeriques[c.cle] = x;
  }
  const alertes = avertissements(numeriques);

  const enregistrer = async () => {
    setErreur(null);
    setMessage(null);
    if (!token) return setErreur("Session expirée : fermez cette fenêtre et reconnectez-vous.");
    if (!antennesPermises.includes(antenne)) return setErreur("Vous n'êtes pas autorisé à modifier cette antenne.");

    let valeurs: Record<string, number>;
    try {
      valeurs = construireValeurs(saisies, antenne);
    } catch (e) {
      return setErreur(e instanceof Error ? e.message : "Valeurs invalides.");
    }

    setEnCours(true);
    try {
      const reponse = await fetch("/api/import-indicateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lignes: [{ annee, semestre, antenne, valeurs }] }),
      });
      const resultat = await reponse.json().catch(() => ({}));
      if (!reponse.ok || !resultat.success) throw new Error(resultat.error || "Échec de l'enregistrement.");

      setMessage((resultat.message || "Enregistré.") + " Les chiffres du tableau de bord seront à jour dans environ une minute.");
      setDerniereMaj(new Date().toISOString());
      onImported?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur inattendue est survenue.");
    } finally {
      setEnCours(false);
    }
  };

  if (antennesPermises.length === 0) {
    return (
      <div style={s.overlay} onClick={onClose}>
        <div style={{ ...s.modal, maxWidth: 420 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div style={{ ...s.content, textAlign: "center" }}>
            <AlertCircle size={28} color="#dc2626" />
            <div style={{ fontSize: 13, fontWeight: 700, margin: "10px 0 16px" }}>
              Vous n'êtes pas autorisé à mettre à jour les indicateurs.
            </div>
            <button type="button" onClick={onClose} style={s.cancel}>Fermer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {/* EN-TÊTE */}
        <div style={s.header}>
          <div>
            <div style={s.title}>Mise à jour des indicateurs</div>
            <div style={s.subtitle}>Saisie manuelle : valeurs cumulées depuis le début du projet, à la fin du semestre</div>
            {userName && <div style={s.welcome}>Bienvenue {userName} !</div>}
            {derniereMaj !== undefined && (
              <div style={s.last}>
                {derniereMaj ? `Ta dernière mise à jour : ${formaterDate(derniereMaj)}` : "Tu n'as pas encore fait de mise à jour."}
              </div>
            )}
          </div>
          <button onClick={onClose} style={s.close} title="Fermer"><X size={19} /></button>
        </div>

        <div style={s.content}>
          {/* PÉRIODE ET ANTENNE */}
          <div style={s.selecteurs}>
            <label style={s.champ}>
              <span style={s.label}>Année</span>
              <select style={s.select} value={annee} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAnnee(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label style={s.champ}>
              <span style={s.label}>Semestre</span>
              <select style={s.select} value={semestre} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSemestre(e.target.value as Semestre)}>
                {SEMESTRES.map((x) => <option key={x} value={x}>{LIBELLE_SEMESTRE[x]}</option>)}
              </select>
            </label>
            <label style={s.champ}>
              <span style={s.label}>Antenne</span>
              <select
                style={s.select}
                value={antenne}
                disabled={antennesPermises.length === 1}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAntenne(e.target.value)}
              >
                {antennesPermises.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>

          <div style={s.info}>
            {existe
              ? `Ligne existante : ${semestre} ${annee} – ${antenne}. Modifiez les valeurs puis enregistrez.`
              : source
              ? `Nouvelle ligne pour ${semestre} ${annee}. Valeurs de départ reprises de ${source.Semestre} ${source["Année"]} : corrigez ce qui a changé.`
              : `Aucune donnée pour ${antenne} : saisissez les valeurs de ${semestre} ${annee}.`}
          </div>

          {antenne === "Toutes" && (
            <div style={s.note}>
              La ligne « Toutes » est recalculée automatiquement (somme des antennes) lorsque les 6 antennes ont une ligne pour le même semestre.
              R1.2 et l'avancement global se saisissent ici uniquement.
            </div>
          )}

          {/* CHAMPS PAR GROUPE */}
          {GROUPES.map((g) => {
            const champs = CHAMPS.filter((c) => c.groupe === g.id && (!c.toutesSeulement || antenne === "Toutes"));
            if (champs.length === 0) return null;
            return (
              <div key={g.id} style={s.groupe}>
                <div style={s.groupeTitre}>{g.titre}</div>
                <div style={s.grille}>
                  {champs.map((c) => {
                    const cible = base?.cibles?.[c.cle];
                    return (
                      <label key={c.cle} style={s.ligneChamp}>
                        <span style={s.libelle}>{c.libelle}</span>
                        <span style={s.saisie}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={saisies[c.cle] ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaisies({ ...saisies, [c.cle]: e.target.value })}
                            style={s.input}
                            placeholder="—"
                          />
                          <span style={s.unite}>{c.unite}</span>
                        </span>
                        {cible && (
                          <span style={s.cible}>
                            Cible : {fmtNombre(cible.cible)}{cible.sur ? ` / ${cible.sur}` : ""} {cible.unite}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* MESSAGES */}
          {alertes.length > 0 && (
            <div style={s.alerte}>
              <AlertTriangle size={16} color="#b45309" />
              <div>{alertes.map((a, i) => <div key={i}>{a}</div>)}<div style={{ opacity: 0.8 }}>Vous pouvez quand même enregistrer.</div></div>
            </div>
          )}
          {erreur && <div style={s.erreur}><AlertCircle size={16} color="#dc2626" /><span>{erreur}</span></div>}
          {message && <div style={s.succes}><CheckCircle2 size={16} color="#16a34a" /><span>{message}</span></div>}
        </div>

        {/* PIED */}
        <div style={s.footer}>
          <button type="button" onClick={onClose} disabled={enCours} style={s.cancel}>Fermer</button>
          <button
            type="button"
            onClick={enregistrer}
            disabled={enCours}
            style={{ ...s.enregistrer, opacity: enCours ? 0.55 : 1, cursor: enCours ? "not-allowed" : "pointer" }}
          >
            <Save size={16} />
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s: { [k: string]: React.CSSProperties } = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.48)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16, boxSizing: "border-box" },
  modal: { width: "100%", maxWidth: 640, maxHeight: "92vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 16, boxShadow: "0 25px 60px rgba(15,23,42,0.22)", overflow: "hidden", border: "1px solid #e2e8f0" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 },
  title: { fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 },
  subtitle: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  welcome: { display: "inline-block", marginTop: 6, padding: "3px 8px", borderRadius: 6, background: "#f0fdf4", color: "#15803d", fontSize: 10, fontWeight: 700 },
  last: { marginTop: 5, fontSize: 10, color: "#64748b", fontWeight: 600 },
  close: { width: 34, height: 34, border: "none", borderRadius: 8, background: "#f8fafc", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  content: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 },
  selecteurs: { display: "grid", gridTemplateColumns: "0.8fr 1.4fr 1.4fr", gap: 10 },
  champ: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  select: { height: 34, padding: "0 8px", border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", fontSize: 12, fontWeight: 700, color: "#0f172a", outline: "none" },
  info: { fontSize: 11, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px" },
  note: { fontSize: 10, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 10px" },
  groupe: { border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" },
  groupeTitre: { background: "#f1f5f9", padding: "7px 10px", fontSize: 10, fontWeight: 800, color: "#14532d", textTransform: "uppercase", letterSpacing: "0.05em" },
  grille: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 10 },
  ligneChamp: { display: "flex", flexDirection: "column", gap: 3 },
  libelle: { fontSize: 10, fontWeight: 700, color: "#334155", lineHeight: 1.2 },
  saisie: { display: "flex", alignItems: "center", gap: 6 },
  input: { flex: 1, minWidth: 0, height: 32, padding: "0 8px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, fontWeight: 700, textAlign: "right", outline: "none", boxSizing: "border-box" },
  unite: { fontSize: 10, color: "#64748b", width: 64, flexShrink: 0 },
  cible: { fontSize: 9, color: "#94a3b8" },
  alerte: { display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: 11, fontWeight: 600 },
  erreur: { display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 11, fontWeight: 600 },
  succes: { display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 11, fontWeight: 600 },
  footer: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 },
  cancel: { height: 38, padding: "0 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  enregistrer: { height: 38, padding: "0 18px", borderRadius: 8, border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 },
};
