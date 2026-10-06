import React, { useRef, useState } from "react";
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface UpdateModalProps {
  onClose: () => void;
}

export default function UpdateModal({
  onClose,
}: UpdateModalProps) {
  const [typeMiseAJour, setTypeMiseAJour] = useState<
    "decaissement" | "avancement" | null
  >(null);

  const [niveau, setNiveau] = useState<
    "Par composante" | "Par instrument"
  >("Par composante");

  const [uniteCoordination, setUniteCoordination] =
  useState("UCT");

  const [fichier, setFichier] = useState<File | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [erreur, setErreur] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* =========================
     SÉLECTION DU FICHIER
  ========================= */

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setErreur(null);
    setMessage(null);

    const file = event.target.files?.[0];

    if (!file) {
      setFichier(null);
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls") {
      setErreur(
        "Veuillez sélectionner un fichier Excel au format .xlsx ou .xls."
      );

      setFichier(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setFichier(file);
  };

  /* =========================
     OUVRIR LE SÉLECTEUR
  ========================= */

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  /* =========================
     IMPORTATION
  ========================= */

  const handleImport = () => {
    setErreur(null);
    setMessage(null);

    if (!typeMiseAJour) {
      setErreur(
        "Veuillez sélectionner le type de donnée à mettre à jour."
      );
      return;
    }

    if (!fichier) {
      setErreur(
        "Veuillez sélectionner un fichier Excel."
      );
      return;
    }

    /*
      Pour le moment, cette partie est une démonstration.

      Plus tard, le fichier sera envoyé vers Django
      pour validation puis mise à jour de PostgreSQL.
    */

    setMessage(
      `Le fichier "${fichier.name}" est prêt à être importé pour ${
        typeMiseAJour === "decaissement"
          ? "le décaissement"
          : "le taux d'avancement"
      } (${niveau.toLowerCase()}).`
    );
  };

  /* =========================
     RESET DU MODAL
  ========================= */

  const handleClose = () => {
    setTypeMiseAJour(null);
    setNiveau("Par composante");
    setFichier(null);
    setMessage(null);
    setErreur(null);

    onClose();
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        style={styles.overlay}
        onClick={handleClose}
      >
        {/* MODAL */}
        <div
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* =========================
              HEADER
          ========================= */}

          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.headerIcon}>
                <RefreshCw
                  size={20}
                  color="#2563eb"
                />
              </div>

              <div>
                <div style={styles.title}>
                  Mise à jour des données
                </div>

                <div style={styles.subtitle}>
                  Importer et actualiser les données financières
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              style={styles.closeButton}
              title="Fermer"
            >
              <X size={19} />
            </button>
          </div>

          {/* =========================
              CONTENU
          ========================= */}

          <div style={styles.content}>

            {/* TITRE SECTION */}

            <div style={styles.sectionTitle}>
              DONNÉES À METTRE À JOUR
            </div>

            {/* =========================
                CHOIX DES DONNÉES
            ========================= */}

            <div style={styles.dataChoices}>

              {/* DÉCAISSEMENT */}

              <label
                style={{
                  ...styles.choice,
                  ...(typeMiseAJour === "decaissement"
                    ? styles.choiceActive
                    : {}),
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    typeMiseAJour === "decaissement"
                  }
                  onChange={() =>
                    setTypeMiseAJour(
                      typeMiseAJour === "decaissement"
                        ? null
                        : "decaissement"
                    )
                  }
                  style={styles.checkbox}
                />

                <span
                  style={{
                    ...styles.choiceText,
                    ...(typeMiseAJour ===
                    "decaissement"
                      ? styles.choiceTextActive
                      : {}),
                  }}
                >
                  Décaissement
                </span>
              </label>

              {/* TAUX D'AVANCEMENT */}

              <label
                style={{
                  ...styles.choice,
                  ...(typeMiseAJour === "avancement"
                    ? styles.choiceActive
                    : {}),
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    typeMiseAJour === "avancement"
                  }
                  onChange={() =>
                    setTypeMiseAJour(
                      typeMiseAJour === "avancement"
                        ? null
                        : "avancement"
                    )
                  }
                  style={styles.checkbox}
                />

                <span
                  style={{
                    ...styles.choiceText,
                    ...(typeMiseAJour ===
                    "avancement"
                      ? styles.choiceTextActive
                      : {}),
                  }}
                >
                  Taux d'avancement
                </span>
              </label>
            </div>

           {/* =========================
                MENUS DE PARAMÉTRAGE
            ========================= */}

            {typeMiseAJour && (
            <div style={styles.levelContainer}>

                {/* NIVEAU DE MISE À JOUR */}
                <div style={styles.selectGroup}>
                <div style={styles.levelLabel}>
                    Niveau de mise à jour
                </div>

                <select
                    value={niveau}
                    onChange={(e) =>
                    setNiveau(
                        e.target.value as
                        | "Par composante"
                        | "Par instrument"
                    )
                    }
                    style={styles.select}
                >
                    <option value="Par composante">
                    Par composante
                    </option>

                    <option value="Par instrument">
                    Par instrument
                    </option>
                </select>
                </div>

                {/* UNITÉ DE COORDINATION */}
                {typeMiseAJour === "avancement" && (
                <div style={styles.selectGroup}>
                    <div style={styles.levelLabel}>
                    Unité de coordination
                    </div>

                    <select
                    value={uniteCoordination}
                    onChange={(e) =>
                        setUniteCoordination(e.target.value)
                    }
                    style={styles.select}
                    >
                    <option value="UCT">UCT</option>
                    <option value="UCR-A">UCR-A</option>
                    <option value="UCR-B">UCR-B</option>
                    <option value="UCR-D">UCR-D</option>
                    <option value="UCR-F">UCR-F</option>
                    <option value="UCR-FD">UCR-FD</option>
                    </select>
                </div>
                )}

            </div>
            )}

            {/* =========================
                IMPORT EXCEL
            ========================= */}

            <div style={styles.importSection}>

              <div style={styles.sectionTitle}>
                IMPORTER LE FICHIER EXCEL
              </div>

              {/* INPUT INVISIBLE */}

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {/* DROPZONE */}

              <div
                style={{
                  ...styles.uploadBox,
                  ...(fichier
                    ? styles.uploadBoxSelected
                    : {}),
                }}
                onClick={handleOpenFile}
              >
                {fichier ? (
                  <>
                    <div style={styles.fileIcon}>
                      <FileSpreadsheet
                        size={27}
                        color="#16a34a"
                      />
                    </div>

                    <div style={styles.fileName}>
                      {fichier.name}
                    </div>

                    <div style={styles.fileInfo}>
                      {(fichier.size / 1024).toFixed(1)} Ko
                    </div>

                    <div style={styles.changeFile}>
                      Cliquer pour remplacer le fichier
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.uploadIcon}>
                      <Upload
                        size={25}
                        color="#2563eb"
                      />
                    </div>

                    <div style={styles.uploadTitle}>
                      Importer le fichier Excel
                    </div>

                    <div style={styles.uploadDescription}>
                      Cliquez pour sélectionner votre fichier
                    </div>

                    <div style={styles.uploadFormat}>
                      Formats acceptés : .xlsx / .xls
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* =========================
                MESSAGE ERREUR
            ========================= */}

            {erreur && (
              <div style={styles.errorMessage}>
                <AlertCircle
                  size={16}
                  color="#dc2626"
                />

                <span>{erreur}</span>
              </div>
            )}

            {/* =========================
                MESSAGE SUCCÈS
            ========================= */}

            {message && (
              <div style={styles.successMessage}>
                <CheckCircle2
                  size={16}
                  color="#16a34a"
                />

                <span>{message}</span>
              </div>
            )}
          </div>

          {/* =========================
              FOOTER
          ========================= */}

          <div style={styles.footer}>
            <button
              onClick={handleClose}
              style={styles.cancelButton}
            >
              Annuler
            </button>

            <button
              onClick={handleImport}
              style={{
                ...styles.importButton,
                opacity:
                  !typeMiseAJour || !fichier
                    ? 0.55
                    : 1,
                cursor:
                  !typeMiseAJour || !fichier
                    ? "not-allowed"
                    : "pointer",
              }}
              disabled={
                !typeMiseAJour || !fichier
              }
            >
              <RefreshCw size={16} />

              Importer et mettre à jour
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles: {
  [key: string]: React.CSSProperties;
} = {
  /* =========================
     OVERLAY
  ========================= */

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.48)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
    boxSizing: "border-box",
  },

  /* =========================
     MODAL
  ========================= */

  modal: {
    width: "100%",
    maxWidth: 570,
    background: "#ffffff",
    borderRadius: 16,
    boxShadow:
      "0 25px 60px rgba(15, 23, 42, 0.22)",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
    background: "#ffffff",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  title: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.2,
  },

  subtitle: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },

  closeButton: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  /* =========================
     CONTENT
  ========================= */

  content: {
    padding: "20px 22px 22px",
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 11,
  },

  /* =========================
     CHOIX DONNÉES
  ========================= */

  dataChoices: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },

  choice: {
    flex: 1,
    minHeight: 48,
    padding: "0 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  choiceActive: {
    border: "1px solid #93c5fd",
    background: "#f8fbff",
    boxShadow:
      "0 2px 6px rgba(37, 99, 235, 0.06)",
  },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#2563eb",
    cursor: "pointer",
    margin: 0,
  },

  choiceText: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    whiteSpace: "nowrap",
  },

  choiceTextActive: {
    color: "#1d4ed8",
  },

  /* =========================
     MENU DÉROULANT
  ========================= */

  levelContainer: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 9,
  },

  levelLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "#64748b",
    marginBottom: 1,
  },

  select: {
    width: 190,
    height: 34,
    padding: "0 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 11,
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
  },

  selectGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 5,
  },

  /* =========================
     IMPORT
  ========================= */

  importSection: {
    marginTop: 24,
  },

  uploadBox: {
    minHeight: 135,
    border: "1.5px dashed #cbd5e1",
    borderRadius: 11,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: "20px",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  uploadBoxSelected: {
    border: "1.5px dashed #86efac",
    background: "#f0fdf4",
  },

  uploadIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  fileIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  uploadTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
  },

  uploadDescription: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },

  uploadFormat: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 5,
  },

  fileName: {
    maxWidth: "90%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 800,
    color: "#166534",
  },

  fileInfo: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 3,
  },

  changeFile: {
    fontSize: 9,
    color: "#2563eb",
    marginTop: 7,
    fontWeight: 700,
  },

  /* =========================
     MESSAGES
  ========================= */

  errorMessage: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: "9px 11px",
    borderRadius: 8,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 10,
    fontWeight: 600,
  },

  successMessage: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: "9px 11px",
    borderRadius: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 10,
    fontWeight: 600,
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  cancelButton: {
    height: 38,
    padding: "0 16px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  importButton: {
    height: 38,
    padding: "0 16px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
};
