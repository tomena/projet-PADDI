import React, { useState } from "react";
import { X, Save, RotateCcw } from "lucide-react";

interface UpdateActivitesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainChoice = "taux" | "axes";
type TauxChoice = "global" | "realisation" | "composante";
type AxeChoice = "gestion" | "amenagement";

const mois = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const unites = [
  "UCT",
  "UCR-A",
  "UCR-B",
  "UCR-D",
  "UCR-F",
  "UCR-FD",
];

const annees = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

export default function UpdateActivitesModal({
  isOpen,
  onClose,
}: UpdateActivitesModalProps) {
  const [mainChoice, setMainChoice] = useState<MainChoice>("taux");

  const [tauxChoice, setTauxChoice] =
    useState<TauxChoice>("global");

  const [axeChoice, setAxeChoice] =
    useState<AxeChoice>("gestion");

  const [annee, setAnnee] = useState("");
  const [moisSelectionne, setMoisSelectionne] = useState("");
  const [uc, setUc] = useState("");

  const [values, setValues] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleValueChange = (
    key: string,
    value: string
  ) => {
    // Autoriser uniquement les nombres et le point décimal
    if (!/^\d*\.?\d*$/.test(value)) return;

    // Limiter les pourcentages à 100
    if (value !== "" && Number(value) > 100) return;

    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setAnnee("");
    setMoisSelectionne("");
    setUc("");
    setValues({});
  };

  const handleMainChoice = (choice: MainChoice) => {
    setMainChoice(choice);
    setValues({});
  };

  const handleTauxChoice = (choice: TauxChoice) => {
    setTauxChoice(choice);
    setValues({});
  };

  const handleAxeChoice = (choice: AxeChoice) => {
    setAxeChoice(choice);
    setValues({});
  };

  const handleSave = () => {
    /*
      Pour l'instant :
      aucune donnée n'est envoyée vers une base.
      L'interface est uniquement un prototype de saisie.
    */

    console.log("Données du formulaire :", {
      mainChoice,
      tauxChoice,
      axeChoice,
      annee,
      mois: moisSelectionne,
      uc,
      values,
    });
  };

  const InputPercent = ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => (
    <div style={styles.fieldCard}>
      <label style={styles.fieldLabel}>{label}</label>

      <div style={styles.percentInputWrapper}>
        <input
          type="text"
          inputMode="decimal"
          value={values[id] || ""}
          onChange={(e) =>
            handleValueChange(id, e.target.value)
          }
          placeholder="0"
          style={styles.percentInput}
        />

        <span style={styles.percentSymbol}>%</span>
      </div>
    </div>
  );

  const InputNumber = ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => (
    <div style={styles.fieldCard}>
      <label style={styles.fieldLabel}>{label}</label>

      <input
        type="number"
        min="0"
        value={values[id] || ""}
        onChange={(e) =>
          setValues((prev) => ({
            ...prev,
            [id]: e.target.value,
          }))
        }
        placeholder="Saisir une valeur"
        style={styles.normalInput}
      />
    </div>
  );

  const renderHeaderFields = () => (
    <>
      <div style={styles.contextGrid}>
        <div>
          <label style={styles.selectLabel}>Année</label>

          <select
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
            style={styles.select}
          >
            <option value="">Sélectionner</option>

            {annees.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={styles.selectLabel}>Mois</label>

          <select
            value={moisSelectionne}
            onChange={(e) =>
              setMoisSelectionne(e.target.value)
            }
            style={styles.select}
          >
            <option value="">Sélectionner</option>

            {mois.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.fullField}>
        <label style={styles.selectLabel}>
          Unité de coordination
        </label>

        <select
          value={uc}
          onChange={(e) => setUc(e.target.value)}
          style={styles.select}
        >
          <option value="">Sélectionner</option>

          {unites.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderGlobal = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputNumber
          id="totalPlanifiees"
          label="Total activités planifiées"
        />

        <InputPercent
          id="achevees"
          label="Activités achevées"
        />

        <InputPercent
          id="enCours"
          label="Activités en cours"
        />

        <InputPercent
          id="nonDemarrees"
          label="Activités non démarrées"
        />
      </div>
    </>
  );

  const renderRealisation = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="r1"
          label="R1. Système de gestion"
        />

        <InputPercent
          id="r2"
          label="R2. Aménagement du territoire"
        />
      </div>
    </>
  );

  const renderComposante = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="c1"
          label="C1. Gestion de services écosystémiques"
        />

        <InputPercent
          id="c2"
          label="C2. Gouvernance environnementale décentralisée"
        />

        <InputPercent
          id="c3"
          label="C3. Développement des paysages productifs"
        />

        <InputPercent
          id="c4"
          label="C4. Création d'emplois verts"
        />
      </div>
    </>
  );

  const renderGestion = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="a111"
          label="1.1.1 Analyses diagnostiques"
        />

        <InputPercent
          id="a112"
          label="1.1.2 Planification territoriale"
        />

        <InputPercent
          id="a113"
          label="1.1.3 Suivi écosystémique"
        />

        <InputPercent
          id="a114"
          label="1.1.4 Financement durable"
        />

        <InputPercent
          id="a121"
          label="1.2.1 Participation des populations"
        />

        <InputPercent
          id="a122"
          label="1.2.2 Coopération avec MNP"
        />

        <InputPercent
          id="a123"
          label="1.2.3 Coordination intersectorielle"
        />

        <InputPercent
          id="a124"
          label="1.2.4 Lutte contre la corruption"
        />
      </div>
    </>
  );

  const renderAmenagement = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="a211"
          label="2.1.1 Restauration paysages"
        />

        <InputPercent
          id="a212"
          label="2.1.2 Production durable"
        />

        <InputPercent
          id="a213"
          label="2.1.3 Sécurisation foncière"
        />

        <InputPercent
          id="a214"
          label="2.1.4 Gestion des feux"
        />

        <InputPercent
          id="a221"
          label="2.2.1 Système de marché"
        />

        <InputPercent
          id="a222"
          label="2.2.2 Valorisation des productions"
        />

        <InputPercent
          id="a223"
          label="2.2.3 Diversification des activités"
        />

        <InputPercent
          id="a224"
          label="2.2.4 Mobilisation communautaire"
        />
      </div>
    </>
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ================= HEADER ================= */}

        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.title}>
              Mise à jour
            </h2>

            <p style={styles.subtitle}>
              Suivi des activités annuelles
            </p>
          </div>

          <button
            onClick={onClose}
            style={styles.closeButton}
            title="Fermer"
          >
            <X size={21} />
          </button>
        </div>

        {/* ================= CONTENU ================= */}

        <div style={styles.content}>
          <div style={styles.sectionTitle}>
            Que souhaitez-vous mettre à jour ?
          </div>

          {/* CHOIX PRINCIPAL */}

          <div style={styles.choiceGrid}>
            <button
              onClick={() => handleMainChoice("taux")}
              style={{
                ...styles.choiceButton,
                ...(mainChoice === "taux"
                  ? styles.choiceButtonActive
                  : {}),
              }}
            >
              <div style={styles.choiceTitle}>
                Taux d'avancement
              </div>

              <div style={styles.choiceDescription}>
                Activités, réalisations et composantes
              </div>
            </button>

            <button
              onClick={() => handleMainChoice("axes")}
              style={{
                ...styles.choiceButton,
                ...(mainChoice === "axes"
                  ? styles.choiceButtonActive
                  : {}),
              }}
            >
              <div style={styles.choiceTitle}>
                Axes prioritaires
              </div>

              <div style={styles.choiceDescription}>
                Système de gestion et aménagement
              </div>
            </button>
          </div>

          {/* ================= TAUX ================= */}

          {mainChoice === "taux" && (
            <>
              <div style={styles.subTitle}>
                Type d'avancement
              </div>

              <div style={styles.tabs}>
                <button
                  onClick={() =>
                    handleTauxChoice("global")
                  }
                  style={{
                    ...styles.tab,
                    ...(tauxChoice === "global"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Avancement global des activités
                </button>

                <button
                  onClick={() =>
                    handleTauxChoice("realisation")
                  }
                  style={{
                    ...styles.tab,
                    ...(tauxChoice === "realisation"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Avancement par réalisation
                </button>

                <button
                  onClick={() =>
                    handleTauxChoice("composante")
                  }
                  style={{
                    ...styles.tab,
                    ...(tauxChoice === "composante"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Avancement par composante
                </button>
              </div>

              <div style={styles.formSection}>
                {tauxChoice === "global" &&
                  renderGlobal()}

                {tauxChoice === "realisation" &&
                  renderRealisation()}

                {tauxChoice === "composante" &&
                  renderComposante()}
              </div>
            </>
          )}

          {/* ================= AXES ================= */}

          {mainChoice === "axes" && (
            <>
              <div style={styles.subTitle}>
                Axe prioritaire
              </div>

              <div style={styles.tabs}>
                <button
                  onClick={() =>
                    handleAxeChoice("gestion")
                  }
                  style={{
                    ...styles.tab,
                    ...(axeChoice === "gestion"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Système de gestion
                </button>

                <button
                  onClick={() =>
                    handleAxeChoice("amenagement")
                  }
                  style={{
                    ...styles.tab,
                    ...(axeChoice === "amenagement"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Aménagement du territoire
                </button>
              </div>

              <div style={styles.formSection}>
                {axeChoice === "gestion" &&
                  renderGestion()}

                {axeChoice === "amenagement" &&
                  renderAmenagement()}
              </div>
            </>
          )}
        </div>

        {/* ================= FOOTER ================= */}

        <div style={styles.footer}>
          <button
            onClick={handleReset}
            style={styles.resetButton}
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>

          <div style={styles.footerRight}>
            <button
              onClick={onClose}
              style={styles.cancelButton}
            >
              Annuler
            </button>

            <button
              onClick={handleSave}
              style={styles.saveButton}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const GREEN = "#15803d";
const GREEN_DARK = "#166534";
const GREEN_LIGHT = "#f0fdf4";
const GREEN_BORDER = "#bbf7d0";

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },

  modal: {
    width: "min(1050px, 100%)",
    maxHeight: "90vh",
    background: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.20)",
  },

  modalHeader: {
    background: GREEN,
    color: "#ffffff",
    padding: "18px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },

  title: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 700,
  },

  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    opacity: 0.9,
  },

  closeButton: {
    border: "none",
    background: "rgba(255,255,255,0.15)",
    color: "#ffffff",
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: "22px",
    overflowY: "auto",
    flex: 1,
  },

  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: "12px",
  },

  subTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#374151",
    marginTop: "22px",
    marginBottom: "10px",
  },

  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  choiceButton: {
    textAlign: "left",
    padding: "15px 17px",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  choiceButtonActive: {
    background: GREEN_LIGHT,
    border: `2px solid ${GREEN}`,
    boxShadow: "0 2px 8px rgba(21,128,61,0.10)",
  },

  choiceTitle: {
    color: "#1f2937",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px",
  },

  choiceDescription: {
    color: "#6b7280",
    fontSize: "12px",
  },

  tabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  tab: {
    padding: "9px 13px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  tabActive: {
    background: GREEN,
    borderColor: GREEN,
    color: "#ffffff",
  },

  formSection: {
    marginTop: "18px",
    padding: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
  },

  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "14px",
  },

  fullField: {
    marginBottom: "16px",
  },

  selectLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "6px",
  },

  select: {
    width: "100%",
    height: "40px",
    padding: "0 11px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#374151",
    fontSize: "13px",
    outline: "none",
  },

  fieldsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  fieldCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px",
  },

  fieldLabel: {
    display: "block",
    fontSize: "12px",
    lineHeight: 1.4,
    fontWeight: 600,
    color: "#374151",
    marginBottom: "8px",
    minHeight: "34px",
  },

  normalInput: {
    width: "100%",
    height: "38px",
    boxSizing: "border-box",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "13px",
    outline: "none",
  },

  percentInputWrapper: {
    display: "flex",
    alignItems: "center",
    height: "38px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    background: "#ffffff",
    overflow: "hidden",
  },

  percentInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    padding: "0 10px",
    border: "none",
    outline: "none",
    fontSize: "13px",
  },

  percentSymbol: {
    padding: "0 10px",
    color: GREEN,
    fontWeight: 700,
    fontSize: "13px",
  },

  footer: {
    padding: "14px 20px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#ffffff",
    flexShrink: 0,
  },

  footerRight: {
    display: "flex",
    gap: "8px",
  },

  resetButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 13px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  cancelButton: {
    padding: "9px 15px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 16px",
    border: "none",
    borderRadius: "8px",
    background: GREEN,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },
};
