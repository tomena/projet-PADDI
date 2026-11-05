import React, { useEffect, useState } from "react";
import { X, Save, History, RotateCcw } from "lucide-react";

interface UpdateActivitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  identifiant: string;
  motDePasse: string;
}

/* =========================================================
   CONFIGURATION DES CHAMPS
   (une seule source de vérité : formulaire, chargement,
   enregistrement et validation en dérivent)
========================================================= */

interface FieldDef {
  id: string; // clé dans le formulaire
  col: string; // colonne dans le GeoJSON
  label: string;
  pct?: boolean; // pourcentage (stocké en décimal)
  readOnly?: boolean;
}

interface Section {
  label: string;
  fields: FieldDef[];
}

type Group = "taux" | "axes";

const pct = (id: string, col: string, label: string): FieldDef => ({
  id,
  col,
  label,
  pct: true,
});

const num = (id: string, col: string, label: string, readOnly = false): FieldDef => ({
  id,
  col,
  label,
  readOnly,
});

// ex. ["1.1.1", "Analyses"] → { id: "a111", col: "TAA 1.1.1", label: "1.1.1 Analyses" }
const taa = (items: [string, string][]) =>
  items.map(([code, label]) =>
    pct(`a${code.replace(/\./g, "")}`, `TAA ${code}`, `${code} ${label}`)
  );

const SECTIONS: Record<string, Section> = {
  global: {
    label: "Avancement global des activités",
    fields: [
      pct("tauxGlobal", "TAG", "Taux d'avancement global des activités"),
      num("totalPlanifiees", "NAP", "Total activités planifiées"),
      num("achevees", "NAA", "Activités achevées"),
      num("enCours", "NAC", "Activités en cours"),
      num("nonDemarrees", "NAD", "Activités non démarrées", true),
    ],
  },
  realisation: {
    label: "Avancement par réalisation",
    fields: [
      pct("r1", "TAR 1", "R1. Système de gestion"),
      pct("r2", "TAR 2", "R2. Aménagement du territoire"),
    ],
  },
  composante: {
    label: "Avancement par composante",
    fields: [
      pct("c1", "TAC C1", "C1. Gestion de services écosystémiques"),
      pct("c2", "TAC C2", "C2. Gouvernance environnementale décentralisée"),
      pct("c3", "TAC C3", "C3. Développement des paysages productifs"),
      pct("c4", "TAC C4", "C4. Création d'emplois verts"),
    ],
  },
  gestion: {
    label: "Système de gestion",
    fields: taa([
      ["1.1.1", "Analyses diagnostiques"],
      ["1.1.2", "Planification territoriale"],
      ["1.1.3", "Suivi écosystémique"],
      ["1.1.4", "Financement durable"],
      ["1.2.1", "Participation des populations"],
      ["1.2.2", "Coopération avec MNP"],
      ["1.2.3", "Coordination intersectorielle"],
      ["1.2.4", "Lutte contre la corruption"],
    ]),
  },
  amenagement: {
    label: "Aménagement du territoire",
    fields: taa([
      ["2.1.1", "Restauration paysages"],
      ["2.1.2", "Production durable"],
      ["2.1.3", "Sécurisation foncière"],
      ["2.1.4", "Gestion des feux"],
      ["2.2.1", "Système de marché"],
      ["2.2.2", "Valorisation des productions"],
      ["2.2.3", "Diversification des activités"],
      ["2.2.4", "Mobilisation communautaire"],
    ]),
  },
};

const GROUPS: Record<
  Group,
  { title: string; desc: string; subtitle: string; tabs: string[] }
> = {
  taux: {
    title: "Taux d'avancement",
    desc: "Activités, réalisations et composantes",
    subtitle: "Type d'avancement",
    tabs: ["global", "realisation", "composante"],
  },
  axes: {
    title: "Axes prioritaires",
    desc: "Système de gestion et aménagement",
    subtitle: "Axe prioritaire",
    tabs: ["gestion", "amenagement"],
  },
};

const ALL_FIELDS = Object.values(SECTIONS).flatMap((s) => s.fields);

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const UNITES = ["UCT", "UCR-A", "UCR-B", "UCR-D", "UCR-F", "UCR-FD"];
const ANNEES = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const isEmpty = (v?: string) => !v || v.trim() === "";

// Activités non démarrées = planifiées − achevées − en cours
const calcNonDemarrees = (v: Record<string, string>) =>
  v.totalPlanifiees
    ? String(
        Math.max(
          0,
          Number(v.totalPlanifiees) - Number(v.achevees || 0) - Number(v.enCours || 0)
        )
      )
    : "";

/* =========================================================
   PETITS COMPOSANTS
========================================================= */

interface FieldProps {
  def: FieldDef;
  value: string;
  onChange: (id: string, value: string) => void;
  invalid: boolean;
}

const Field = ({ def, value, onChange, invalid }: FieldProps) => {
  const inputId = `uam-${def.id}`;
  const flag = invalid ? " is-invalid" : "";

  return (
    <div className={`uam-card${flag}`}>
      <label className="uam-flabel" htmlFor={inputId}>
        {def.label}
      </label>

      {def.pct ? (
        <div className={`uam-pct${flag}`}>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(def.id, e.target.value)}
            placeholder="0"
            className="uam-pct-input"
          />
          <span className="uam-pct-symbol">%</span>
        </div>
      ) : (
        <input
          id={inputId}
          type="number"
          min="0"
          step="1"
          value={value}
          readOnly={def.readOnly}
          onChange={(e) => onChange(def.id, e.target.value)}
          placeholder="Saisir une valeur"
          className={`uam-input${flag}${def.readOnly ? " is-readonly" : ""}`}
        />
      )}
    </div>
  );
};

interface SelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const Select = ({ id, label, value, onChange, options }: SelectProps) => (
  <div>
    <label className="uam-slabel" htmlFor={id}>
      {label}
    </label>
    <select
      id={id}
      className="uam-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Sélectionner</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

/* =========================================================
   HISTORIQUE
========================================================= */

const pick = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return "";
};

const HISTORIQUE_COLONNES = [
  "Utilisateur", "Date", "Heure", "Année", "Unité de coordination",
  "Nom colonne modifié", "Ancienne valeur", "Nouvelle valeur",
];

interface HistoriqueModalProps {
  identifiant: string;
  motDePasse: string;
  onClose: () => void;
}

function HistoriqueModal({ identifiant, motDePasse, onClose }: HistoriqueModalProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/historique-geojson?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "x-paddi-identifiant": identifiant,
            "x-paddi-password": motDePasse,
            "Cache-Control": "no-cache",
          },
        });

        const texte = await response.text();

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Accès non autorisé : vérifie les identifiants de session."
              : `Erreur API historique (${response.status}) : ${texte}`
          );
        }

        let result: any;
        try {
          result = JSON.parse(texte);
        } catch {
          throw new Error("La réponse de l'API historique n'est pas un JSON valide.");
        }

        // Deux formats acceptés : { entries: [...] } ou directement [...]
        const liste = Array.isArray(result) ? result : result?.entries;
        if (!Array.isArray(liste)) {
          throw new Error(
            "L'API répond, mais ne renvoie pas de tableau entries. Vérifie la structure JSON."
          );
        }

        if (!cancelled) setEntries(liste);
      } catch (error) {
        console.error("Erreur chargement historique :", error);
        if (!cancelled) {
          setErreur(
            error instanceof Error
              ? error.message
              : "Une erreur est survenue lors du chargement de l'historique."
          );
        }
      } finally {
        if (!cancelled) setChargement(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identifiant, motDePasse]);

  // Une ligne par changement réel (ancienne valeur ≠ nouvelle valeur)
  const lignes = entries.flatMap((e, i) => {
    const d = e.date ? new Date(e.date) : null;
    const valide = d !== null && !isNaN(d.getTime());

    return (Array.isArray(e.changements) ? e.changements : [])
      .map((c: any, j: number) => ({
        key: `${e.id ?? i}-${j}`,
        cells: [
          e.utilisateur ?? e.nom ?? "",
          valide ? d!.toLocaleDateString("fr-FR") : "",
          valide ? d!.toLocaleTimeString("fr-FR") : "",
          e.annee ?? "",
          e.uc ?? "",
          pick(c, ["colonne", "champ", "field", "nomColonne"]),
        ],
        ancienne: pick(c, ["ancienneValeur", "ancienne", "oldValue"]),
        nouvelle: pick(c, ["nouvelleValeur", "nouvelle", "newValue"]),
      }))
      .filter((l: any) => JSON.stringify(l.ancienne) !== JSON.stringify(l.nouvelle));
  });

  return (
    <div className="uam-overlay uam-overlay-top">
      <div className="uam-modal uam-modal-history" role="dialog" aria-modal="true">
        <div className="uam-header">
          <div className="uam-header-text">
            <h2 className="uam-title">Historique des mises à jour</h2>
            <p className="uam-subtitle">
              Consultez les modifications effectuées sur les activités.
            </p>
          </div>

          <button type="button" onClick={onClose} className="uam-close" title="Fermer">
            <X size={21} />
          </button>
        </div>

        <div className="uam-hbody">
          {chargement ? (
            <div className="uam-hmsg">Chargement de l'historique...</div>
          ) : erreur ? (
            <div className="uam-hmsg is-error">{erreur}</div>
          ) : lignes.length === 0 ? (
            <div className="uam-hmsg">Aucune modification enregistrée.</div>
          ) : (
            <table className="uam-table">
              <thead>
                <tr>
                  {HISTORIQUE_COLONNES.map((titre) => (
                    <th key={titre}>{titre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l: any) => (
                  <tr key={l.key}>
                    {l.cells.map((cell: unknown, k: number) => (
                      <td key={k}>{String(cell)}</td>
                    ))}
                    <td>{String(l.ancienne)}</td>
                    <td>{String(l.nouvelle)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */

export default function UpdateActivitesModal({
  isOpen,
  onClose,
  userName,
  identifiant,
  motDePasse,
}: UpdateActivitesModalProps) {
  const [group, setGroup] = useState<Group>("taux");
  const [tab, setTab] = useState<Record<Group, string>>({
    taux: "global",
    axes: "gestion",
  });

  const [annee, setAnnee] = useState("");
  const [mois, setMois] = useState("");
  const [uc, setUc] = useState("");

  const [values, setValues] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);

  /* ---------- Chargement de l'enregistrement existant ---------- */
  useEffect(() => {
    setValues({});
    if (!annee || !mois || !uc) return;

    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({ annee, mois, uc });
        const response = await fetch(`/api/update-geojson?${params}`);
        const result = await response.json();

        if (!response.ok) {
          console.warn("Chargement de l'enregistrement :", result.error);
          return;
        }

        const loaded: Record<string, string> = {};
        for (const f of ALL_FIELDS) {
          const raw = result.properties?.[f.col];
          if (raw === null || raw === undefined) {
            loaded[f.id] = "";
            continue;
          }
          const n = f.pct ? Number(raw) * 100 : Number(raw);
          loaded[f.id] = String(Number(n.toFixed(6)));
        }

        if (!cancelled) setValues(loaded);
      } catch (error) {
        console.error("Erreur de chargement :", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [annee, mois, uc]);

  if (!isOpen) return null;

  /* ---------- Saisie ---------- */
  const handleValueChange = (id: string, value: string) => {
    // Uniquement des nombres avec un point décimal
    if (!/^\d*\.?\d*$/.test(value)) return;

    // Les pourcentages sont limités à 100
    const def = ALL_FIELDS.find((f) => f.id === id);
    if (def?.pct && value !== "" && Number(value) > 100) return;

    setValues((prev) => {
      const next = { ...prev, [id]: value };
      if (["totalPlanifiees", "achevees", "enCours"].includes(id)) {
        next.nonDemarrees = calcNonDemarrees(next);
      }
      return next;
    });
  };

  const handleReset = () => {
    setAnnee("");
    setMois("");
    setUc("");
    setValues({});
    setShowValidation(false);
  };

  /* ---------- Enregistrement ---------- */
  const handleSave = async () => {
    setShowValidation(true);

    if (!annee || !mois || !uc) {
      alert("Veuillez sélectionner l’année, le mois et l’unité de coordination.");
      return;
    }

    if (ALL_FIELDS.some((f) => isEmpty(values[f.id]))) {
      alert("Veuillez remplir tous les champs avant d'enregistrer.");
      return;
    }

    const data = { ...values, nonDemarrees: calcNonDemarrees(values) };
    const updates: Record<string, number> = {};

    for (const f of ALL_FIELDS) {
      const n = Number(data[f.id]);
      if (!Number.isFinite(n)) {
        alert(`Valeur invalide pour le champ : ${f.id}`);
        return;
      }
      // Les pourcentages sont stockés sous forme décimale
      updates[f.col] = f.pct ? n / 100 : n;
    }

    try {
      const response = await fetch("/api/update-geojson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, motDePasse, annee, mois, uc, updates }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Échec de l’enregistrement.");
        return;
      }

      alert("Toutes les données ont été enregistrées avec succès dans GitHub.");
      onClose();
    } catch (error) {
      console.error("Erreur d’enregistrement :", error);
      alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
    }
  };

  /* ---------- Validation visuelle ---------- */
  const isMissing = (f: FieldDef) => showValidation && isEmpty(values[f.id]);
  const isTabInvalid = (key: string) => SECTIONS[key].fields.some(isMissing);
  const isGroupInvalid = (g: Group) => GROUPS[g].tabs.some(isTabInvalid);

  const current = GROUPS[group];
  const section = SECTIONS[tab[group]];

  return (
    <>
      <style>{css}</style>

      <div className="uam-overlay">
        <div className="uam-modal" role="dialog" aria-modal="true" aria-labelledby="uam-title">
          {/* ================= HEADER ================= */}
          <div className="uam-header">
            <div className="uam-header-text">
              <h2 className="uam-title" id="uam-title">Mise à jour</h2>
              <p className="uam-subtitle">Suivi des activités annuelles</p>
              {userName && <div className="uam-welcome">Bienvenue {userName} !</div>}
            </div>

            <div className="uam-header-actions">
              <button
                type="button"
                className="uam-hist"
                onClick={() => setShowHistorique(true)}
                title="Voir l'historique des mises à jour"
              >
                <History size={16} />
                <span>Historique</span>
              </button>

              <button type="button" className="uam-close" onClick={onClose} title="Fermer">
                <X size={21} />
              </button>
            </div>
          </div>

          {/* ================= CONTENU ================= */}
          <div className="uam-content">
            <div className="uam-section-title">Que souhaitez-vous mettre à jour ?</div>

            <div className="uam-context">
              <Select id="uam-annee" label="Année" value={annee} onChange={setAnnee} options={ANNEES} />
              <Select id="uam-mois" label="Mois" value={mois} onChange={setMois} options={MOIS} />
            </div>

            <div className="uam-full">
              <Select
                id="uam-uc"
                label="Unité de coordination"
                value={uc}
                onChange={setUc}
                options={UNITES}
              />
            </div>

            {/* Choix principal */}
            <div className="uam-choices">
              {(Object.keys(GROUPS) as Group[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={group === g}
                  onClick={() => setGroup(g)}
                  className={`uam-choice${group === g ? " is-active" : ""}${
                    isGroupInvalid(g) ? " is-invalid" : ""
                  }`}
                >
                  <div className="uam-choice-title">{GROUPS[g].title}</div>
                  <div className="uam-choice-desc">{GROUPS[g].desc}</div>
                </button>
              ))}
            </div>

            {/* Sous-onglets */}
            <div className="uam-subtitle-block">{current.subtitle}</div>

            <div className="uam-tabs">
              {current.tabs.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab[group] === key}
                  onClick={() => setTab((t) => ({ ...t, [group]: key }))}
                  className={`uam-tab${tab[group] === key ? " is-active" : ""}${
                    isTabInvalid(key) ? " is-invalid" : ""
                  }`}
                >
                  {SECTIONS[key].label}
                </button>
              ))}
            </div>

            {/* Champs */}
            <div className="uam-form-section">
              <div className="uam-fields">
                {section.fields.map((f) => (
                  <Field
                    key={f.id}
                    def={f}
                    value={values[f.id] || ""}
                    onChange={handleValueChange}
                    invalid={isMissing(f)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div className="uam-footer">
            <button type="button" onClick={handleReset} className="uam-btn uam-btn-reset">
              <RotateCcw size={16} />
              Réinitialiser
            </button>

            <div className="uam-footer-right">
              <button type="button" onClick={onClose} className="uam-btn uam-btn-cancel">
                Annuler
              </button>

              <button type="button" onClick={handleSave} className="uam-btn uam-btn-save">
                <Save size={16} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>

      {showHistorique && (
        <HistoriqueModal
          identifiant={identifiant}
          motDePasse={motDePasse}
          onClose={() => setShowHistorique(false)}
        />
      )}
    </>
  );
}

/* =========================================================
   STYLES (classes CSS pour pouvoir utiliser les media queries)
========================================================= */

const css = `
.uam-overlay {
  --pad: clamp(8px, 2.5vw, 20px);
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  box-sizing: border-box;
  padding:
    max(var(--pad), env(safe-area-inset-top))
    max(var(--pad), env(safe-area-inset-right))
    max(var(--pad), env(safe-area-inset-bottom))
    max(var(--pad), env(safe-area-inset-left));
}
.uam-overlay-top { z-index: 10000; }

.uam-modal {
  width: min(1050px, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
}
.uam-modal-history { width: min(900px, 100%); }

/* ----- Header ----- */
.uam-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #15803d;
  color: #fff;
  padding: 18px 22px;
}
.uam-header-text { min-width: 0; }
.uam-title { margin: 0; font-size: clamp(17px, 4.5vw, 21px); font-weight: 700; overflow-wrap: anywhere; }
.uam-subtitle { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
.uam-welcome {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #dcfce7;
  color: #166534;
  font-size: 10px;
  font-weight: 700;
}
.uam-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.uam-hist {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.uam-close {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
}

/* ----- Contenu ----- */
.uam-content { flex: 1; min-height: 0; overflow-y: auto; padding: 22px; -webkit-overflow-scrolling: touch; }
.uam-section-title { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 12px; }
.uam-subtitle-block { font-size: 14px; font-weight: 700; color: #374151; margin: 22px 0 10px; }

.uam-context { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
.uam-full { margin-bottom: 16px; }
.uam-slabel { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.uam-select {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 13px;
}

.uam-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.uam-choice {
  text-align: left;
  padding: 15px 17px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.uam-choice.is-active { background: #f0fdf4; border: 2px solid #15803d; box-shadow: 0 2px 8px rgba(21, 128, 61, 0.1); }
.uam-choice-title { color: #1f2937; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.uam-choice-desc { color: #6b7280; font-size: 12px; }

.uam-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.uam-tab {
  padding: 9px 13px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.uam-tab.is-active { background: #15803d; border-color: #15803d; color: #fff; }

.uam-choice.is-invalid,
.uam-tab.is-invalid { border: 2px solid #dc2626; box-shadow: 0 0 0 1px #dc2626; }

.uam-form-section { margin-top: 18px; padding: 18px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; }
.uam-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }

.uam-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; min-width: 0; }
.uam-flabel { display: block; font-size: 12px; line-height: 1.4; font-weight: 600; color: #374151; margin-bottom: 8px; min-height: 34px; }

.uam-input {
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 13px;
}
.uam-input.is-readonly { background: #f3f4f6; color: #4b5563; }
.uam-pct { display: flex; align-items: center; height: 38px; border: 1px solid #d1d5db; border-radius: 7px; background: #fff; overflow: hidden; }
.uam-pct-input { flex: 1; min-width: 0; height: 100%; padding: 0 10px; border: none; outline: none; font-size: 13px; }
.uam-pct-symbol { padding: 0 10px; color: #15803d; font-weight: 700; font-size: 13px; }

.uam-card.is-invalid,
.uam-input.is-invalid,
.uam-pct.is-invalid { border: 1px solid #dc2626; box-shadow: 0 0 0 1px #dc2626; }

/* ----- Footer ----- */
.uam-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.uam-footer-right { display: flex; gap: 8px; }
.uam-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 9px 15px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.uam-btn-reset,
.uam-btn-cancel { border: 1px solid #d1d5db; background: #fff; color: #4b5563; }
.uam-btn-save { border: none; background: #15803d; color: #fff; font-weight: 700; }

/* ----- Historique ----- */
.uam-hbody { flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch; }
.uam-hmsg { padding: 30px; text-align: center; color: #6b7280; }
.uam-hmsg.is-error { color: #dc2626; }
.uam-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.uam-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  min-width: 100px;
  padding: 10px;
  border: 1px solid #dce5dd;
  background: #f0f5f1;
  color: #245c3a;
  line-height: 1.2;
}
.uam-table td { padding: 10px; border: 1px solid #e2e8e3; vertical-align: top; white-space: nowrap; }

/* ----- Accessibilité ----- */
.uam-close:focus-visible,
.uam-hist:focus-visible,
.uam-choice:focus-visible,
.uam-tab:focus-visible,
.uam-btn:focus-visible,
.uam-select:focus-visible,
.uam-input:focus-visible { outline: 3px solid rgba(21, 128, 61, 0.45); outline-offset: 2px; }
.uam-pct:focus-within { border-color: #15803d; box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.25); }

/* ---------- Tablettes / petits écrans (≤ 720px) ---------- */
@media (max-width: 720px) {
  .uam-content { padding: 18px; }
  .uam-header { padding: 16px; }
}

/* ---------- Mobiles (≤ 560px) ---------- */
@media (max-width: 560px) {
  .uam-hist span { display: none; }           /* icône seule */
  .uam-hist { width: 40px; height: 40px; padding: 0; justify-content: center; }
  .uam-close { width: 40px; height: 40px; }

  .uam-content { padding: 14px; }
  .uam-choices,
  .uam-fields { grid-template-columns: minmax(0, 1fr); }
  .uam-form-section { padding: 12px; }
  .uam-flabel { min-height: 0; }

  .uam-tabs { flex-direction: column; }
  .uam-tab { width: 100%; text-align: left; min-height: 44px; }
  .uam-choice { padding: 13px 14px; }

  /* 16px minimum : évite le zoom automatique sur iOS */
  .uam-select,
  .uam-input,
  .uam-pct-input { font-size: 16px; }
  .uam-select { height: 44px; }
  .uam-input,
  .uam-pct { height: 44px; }

  .uam-footer { flex-direction: column-reverse; align-items: stretch; padding: 12px 14px; }
  .uam-footer-right { width: 100%; }
  .uam-footer-right .uam-btn { flex: 1; }
  .uam-btn { min-height: 46px; font-size: 13px; }
}

/* ---------- Très petits écrans (≤ 400px) ---------- */
@media (max-width: 400px) {
  .uam-modal { border-radius: 12px; }
  .uam-context { grid-template-columns: minmax(0, 1fr); }
  .uam-header { padding: 12px; }
  .uam-content { padding: 12px; }
}

/* ---------- Faible hauteur (mobile en paysage) ---------- */
@media (max-height: 520px) {
  .uam-overlay { align-items: flex-start; }
  .uam-header { padding-top: 8px; padding-bottom: 8px; }
  .uam-subtitle,
  .uam-welcome { display: none; }
  .uam-content { padding-top: 12px; padding-bottom: 12px; }
  .uam-footer { padding-top: 8px; padding-bottom: 8px; }
}

/* ---------- Grands écrans (≥ 1600px) ---------- */
@media (min-width: 1600px) {
  .uam-modal { width: min(1200px, 100%); }
  .uam-modal-history { width: min(1100px, 100%); }
}

/* ---------- Écrans tactiles ---------- */
@media (hover: none) and (pointer: coarse) {
  .uam-btn,
  .uam-tab { min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  .uam-choice { transition: none; }
}
`;
