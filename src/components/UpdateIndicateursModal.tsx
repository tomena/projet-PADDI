import React, { useEffect, useRef, useState } from "react";
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
const ANNEES = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const formaterDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Indian/Antananarivo" });

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
  const retourRef = useRef<HTMLDivElement>(null);

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

  // Échap pour fermer (sauf pendant l'enregistrement)
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enCours) onClose();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [enCours, onClose]);

  // Empêche la page en arrière-plan de défiler pendant que la fenêtre est ouverte
  useEffect(() => {
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = precedent; };
  }, []);

  // Sur petit écran le message est en bas du formulaire : on le ramène dans la vue
  useEffect(() => {
    if (erreur || message) retourRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [erreur, message]);

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

  // Un clic qui commence sur le fond ferme la fenêtre ; une sélection de texte
  // qui finit sur le fond ne la ferme plus par accident.
  const fermerSurFond = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !enCours) onClose();
  };

  if (antennesPermises.length === 0) {
    return (
      <>
        <style>{css}</style>
        <div className="uim-overlay" onMouseDown={fermerSurFond}>
          <div className="uim-modal uim-modal-sm" role="alertdialog" aria-modal="true">
            <div className="uim-content uim-center">
              <AlertCircle size={28} color="#dc2626" />
              <div className="uim-denied">Vous n'êtes pas autorisé à mettre à jour les indicateurs.</div>
              <button type="button" onClick={onClose} className="uim-btn uim-btn-cancel">Fermer</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>

      <div className="uim-overlay" onMouseDown={fermerSurFond}>
        <div className="uim-modal" role="dialog" aria-modal="true" aria-labelledby="uim-title">
          {/* EN-TÊTE */}
          <div className="uim-header">
            <div className="uim-header-text">
              <div className="uim-title" id="uim-title">Mise à jour des indicateurs</div>
              <div className="uim-subtitle">Saisie manuelle : valeurs cumulées depuis le début du projet, à la fin du semestre</div>
              {userName && <div className="uim-welcome">Bienvenue {userName} !</div>}
              {derniereMaj !== undefined && (
                <div className="uim-last">
                  {derniereMaj ? `Ta dernière mise à jour : ${formaterDate(derniereMaj)}` : "Tu n'as pas encore fait de mise à jour."}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} disabled={enCours} className="uim-close" title="Fermer" aria-label="Fermer">
              <X size={19} />
            </button>
          </div>

          <div className="uim-content">
            {/* PÉRIODE ET ANTENNE */}
            <div className="uim-selecteurs">
              <label className="uim-champ">
                <span className="uim-label">Année</span>
                <select
                  className="uim-select"
                  value={annee}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setAnnee(Number(e.target.value)); setMessage(null); }}
                >
                  {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="uim-champ">
                <span className="uim-label">Semestre</span>
                <select
                  className="uim-select"
                  value={semestre}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSemestre(e.target.value as Semestre); setMessage(null); }}
                >
                  {SEMESTRES.map((x) => <option key={x} value={x}>{LIBELLE_SEMESTRE[x]}</option>)}
                </select>
              </label>
              <label className="uim-champ">
                <span className="uim-label">Antenne</span>
                <select
                  className="uim-select"
                  value={antenne}
                  disabled={antennesPermises.length === 1}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setAntenne(e.target.value); setMessage(null); }}
                >
                  {antennesPermises.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>

            <div className="uim-info">
              {existe
                ? `Ligne existante : ${semestre} ${annee} – ${antenne}. Modifiez les valeurs puis enregistrez.`
                : source
                ? `Nouvelle ligne pour ${semestre} ${annee}. Valeurs de départ reprises de ${source.Semestre} ${source["Année"]} : corrigez ce qui a changé.`
                : `Aucune donnée pour ${antenne} : saisissez les valeurs de ${semestre} ${annee}.`}
            </div>

            {antenne === "Toutes" && (
              <div className="uim-note">
                La ligne « Toutes » est recalculée automatiquement (somme des antennes) lorsque les 6 antennes ont une ligne pour le même semestre.
                R1.2 et l'avancement global se saisissent ici uniquement.
              </div>
            )}

            {/* CHAMPS PAR GROUPE */}
            {GROUPES.map((g) => {
              const champs = CHAMPS.filter((c) => c.groupe === g.id && (!c.toutesSeulement || antenne === "Toutes"));
              if (champs.length === 0) return null;
              return (
                <div key={g.id} className="uim-groupe">
                  <div className="uim-groupe-titre">{g.titre}</div>
                  <div className="uim-grille">
                    {champs.map((c) => {
                      const cible = base?.cibles?.[c.cle];
                      return (
                        <label key={c.cle} className="uim-ligne">
                          <span className="uim-libelle">{c.libelle}</span>
                          <span className="uim-saisie">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              value={saisies[c.cle] ?? ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaisies({ ...saisies, [c.cle]: e.target.value })}
                              className="uim-input"
                              placeholder="—"
                            />
                            <span className="uim-unite">{c.unite}</span>
                          </span>
                          {cible && (
                            <span className="uim-cible">
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
              <div className="uim-msg uim-alerte">
                <AlertTriangle size={16} color="#b45309" className="uim-msg-icon" />
                <div>
                  {alertes.map((a, i) => <div key={i}>{a}</div>)}
                  <div style={{ opacity: 0.8 }}>Vous pouvez quand même enregistrer.</div>
                </div>
              </div>
            )}

            {(erreur || message) && (
              <div ref={retourRef} className="uim-retour" aria-live="polite">
                {erreur && (
                  <div className="uim-msg uim-erreur" role="alert">
                    <AlertCircle size={16} color="#dc2626" className="uim-msg-icon" />
                    <span>{erreur}</span>
                  </div>
                )}
                {message && (
                  <div className="uim-msg uim-succes">
                    <CheckCircle2 size={16} color="#16a34a" className="uim-msg-icon" />
                    <span>{message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PIED */}
          <div className="uim-footer">
            <button type="button" onClick={onClose} disabled={enCours} className="uim-btn uim-btn-cancel">Fermer</button>
            <button type="button" onClick={enregistrer} disabled={enCours} aria-busy={enCours} className="uim-btn uim-btn-save">
              <Save size={16} />
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* Classes CSS (et non styles inline) pour pouvoir utiliser les media queries */
const css = `
.uim-overlay {
  --pad: clamp(8px, 2.5vw, 16px);
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(3px);
  box-sizing: border-box;
  padding:
    max(var(--pad), env(safe-area-inset-top))
    max(var(--pad), env(safe-area-inset-right))
    max(var(--pad), env(safe-area-inset-bottom))
    max(var(--pad), env(safe-area-inset-left));
}

.uim-modal {
  width: 100%;
  max-width: 640px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}
.uim-modal-sm { max-width: 420px; }

/* ----- En-tête ----- */
.uim-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.uim-header-text { min-width: 0; }
.uim-title { font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.2; overflow-wrap: anywhere; }
.uim-subtitle { font-size: 10px; color: #94a3b8; margin-top: 4px; }
.uim-welcome {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 10px;
  font-weight: 700;
}
.uim-last { margin-top: 5px; font-size: 10px; color: #64748b; font-weight: 600; }
.uim-close {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
}
.uim-close:disabled { opacity: 0.5; cursor: not-allowed; }

/* ----- Contenu ----- */
.uim-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.uim-center { align-items: center; text-align: center; }
.uim-denied { font-size: 13px; font-weight: 700; margin: 2px 0 6px; }

.uim-selecteurs { display: grid; grid-template-columns: 0.8fr 1.4fr 1.4fr; gap: 10px; }
.uim-champ { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.uim-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.uim-select {
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}
.uim-select:disabled { background: #f1f5f9; color: #475569; }

.uim-info { font-size: 11px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
.uim-note { font-size: 10px; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; }

.uim-groupe { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.uim-groupe-titre {
  background: #f1f5f9;
  padding: 7px 10px;
  font-size: 10px;
  font-weight: 800;
  color: #14532d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.uim-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; }
.uim-ligne { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.uim-libelle { font-size: 10px; font-weight: 700; color: #334155; line-height: 1.2; }
.uim-saisie { display: flex; align-items: center; gap: 6px; }
.uim-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
}
.uim-unite { width: 64px; flex-shrink: 0; font-size: 10px; color: #64748b; overflow-wrap: anywhere; }
.uim-cible { font-size: 9px; color: #94a3b8; }

/* ----- Messages ----- */
.uim-retour { display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
.uim-msg { display: flex; align-items: flex-start; gap: 8px; padding: 9px 11px; border-radius: 8px; font-size: 11px; font-weight: 600; flex-shrink: 0; overflow-wrap: anywhere; }
.uim-msg-icon { flex-shrink: 0; margin-top: 1px; }
.uim-alerte { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.uim-erreur { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.uim-succes { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

/* ----- Pied ----- */
.uim-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}
.uim-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}
.uim-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.uim-btn-cancel { border: 1px solid #cbd5e1; background: #fff; color: #475569; }
.uim-btn-save { padding: 0 18px; border: 1px solid #16a34a; background: #16a34a; color: #fff; }

/* ----- Accessibilité ----- */
.uim-close:focus-visible,
.uim-btn:focus-visible { outline: 3px solid rgba(22, 163, 74, 0.45); outline-offset: 2px; }
.uim-select:focus-visible,
.uim-input:focus-visible { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25); }

/* ---------- Mobiles (≤ 560px) ---------- */
@media (max-width: 560px) {
  .uim-header { padding: 14px 14px; }
  .uim-content { padding: 14px; gap: 12px; }
  .uim-footer { padding: 12px 14px; }

  .uim-subtitle,
  .uim-last,
  .uim-welcome { font-size: 11px; }
  .uim-info { font-size: 12px; }
  .uim-note { font-size: 11px; }
  .uim-msg { font-size: 12px; }

  .uim-selecteurs { grid-template-columns: 1fr 1fr; }
  .uim-selecteurs .uim-champ:last-child { grid-column: 1 / -1; }
  .uim-grille { grid-template-columns: minmax(0, 1fr); }

  .uim-label,
  .uim-groupe-titre { font-size: 11px; }
  .uim-libelle { font-size: 12px; }
  .uim-cible { font-size: 11px; }
  .uim-unite { font-size: 11px; }

  /* 16px minimum : évite le zoom automatique sur iOS */
  .uim-select,
  .uim-input { font-size: 16px; height: 44px; }

  .uim-close { width: 40px; height: 40px; }

  .uim-footer { flex-direction: column-reverse; align-items: stretch; }
  .uim-btn { height: 46px; font-size: 13px; }
}

/* ---------- Très petits écrans (≤ 360px) ---------- */
@media (max-width: 360px) {
  .uim-modal { border-radius: 12px; }
  .uim-selecteurs { grid-template-columns: minmax(0, 1fr); }
  .uim-unite { width: 52px; }
}

/* ---------- Faible hauteur (mobile en paysage) ---------- */
@media (max-height: 520px) {
  .uim-overlay { align-items: flex-start; }
  .uim-header { padding-top: 8px; padding-bottom: 8px; }
  .uim-subtitle,
  .uim-welcome { display: none; }
  .uim-content { padding-top: 10px; padding-bottom: 10px; gap: 10px; }
  .uim-footer { padding-top: 8px; padding-bottom: 8px; flex-direction: row; }
}

/* ---------- Grands écrans (≥ 1600px) ---------- */
@media (min-width: 1600px) {
  .uim-modal { max-width: 720px; }
}

/* ---------- Écrans tactiles ---------- */
@media (hover: none) and (pointer: coarse) {
  .uim-btn { min-height: 44px; }
  .uim-close { min-width: 40px; min-height: 40px; }
}
`;
