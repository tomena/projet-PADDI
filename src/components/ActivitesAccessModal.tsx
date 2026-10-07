import React, { useState } from "react";

interface ActivitesAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ActivitesAccessModal({
  isOpen,
  onClose,
  onSuccess,
}: ActivitesAccessModalProps) {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCancel = () => {
    setIdentifiant("");
    setMotDePasse("");
    setError("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    /*
     * Accès provisoire pour le prototype.
     * À remplacer plus tard par le système d'authentification réel.
     */
    if (
      identifiant === "zo.ravelonirina@giz.de" &&
      motDePasse === "Paddi2026"
    ) {
      setIdentifiant("");
      setMotDePasse("");
      setError("");
      onSuccess();
    } else {
      setError("Identifiant ou mot de passe incorrect.");
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>
              Accès mise à jour
            </div>

            <div style={styles.headerSubtitle}>
              Suivi des activités annuelles
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            style={styles.closeButton}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* CONTENU */}
        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.infoBox}>
            <div style={styles.infoIcon}>✓</div>

            <div>
              <div style={styles.infoTitle}>
                Accès réservé
              </div>

              <div style={styles.infoText}>
                Veuillez saisir vos identifiants pour accéder
                à la mise à jour des activités.
              </div>
            </div>
          </div>

          {/* IDENTIFIANT */}
          <div style={styles.field}>
            <label style={styles.label}>
              Identifiant
            </label>

            <input
              type="text"
              value={identifiant}
              onChange={(e) => {
                setIdentifiant(e.target.value);
                setError("");
              }}
              placeholder="Saisir votre identifiant"
              autoComplete="username"
              style={styles.input}
            />
          </div>

          {/* MOT DE PASSE */}
          <div style={styles.field}>
            <label style={styles.label}>
              Mot de passe
            </label>

            <input
              type="password"
              value={motDePasse}
              onChange={(e) => {
                setMotDePasse(e.target.value);
                setError("");
              }}
              placeholder="Saisir votre mot de passe"
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {/* ERREUR */}
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* ACTIONS */}
          <div style={styles.actions}>

            <button
              type="button"
              onClick={handleCancel}
              style={styles.cancelButton}
            >
              Annuler
            </button>

            <button
              type="submit"
              style={styles.submitButton}
            >
              Accéder à la mise à jour
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 480,
    background: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
  },

  header: {
    background: "#15803d",
    color: "#ffffff",
    padding: "20px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: 800,
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.9,
  },

  closeButton: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 8,
    background: "rgba(255,255,255,0.15)",
    color: "#ffffff",
    fontSize: 25,
    lineHeight: 1,
    cursor: "pointer",
  },

  form: {
    padding: 24,
  },

  infoBox: {
    display: "flex",
    gap: 12,
    padding: 14,
    marginBottom: 22,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
  },

  infoIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: "50%",
    background: "#15803d",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#166534",
    marginBottom: 3,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#475569",
  },

  field: {
    marginBottom: 17,
  },

  label: {
    display: "block",
    marginBottom: 7,
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    height: 44,
    padding: "0 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    outline: "none",
    fontSize: 14,
    color: "#0f172a",
    background: "#ffffff",
  },

  error: {
    padding: "10px 12px",
    marginBottom: 16,
    borderRadius: 8,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 600,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 24,
  },

  cancelButton: {
    height: 42,
    padding: "0 18px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#ffffff",
    color: "#475569",
    fontWeight: 700,
    cursor: "pointer",
  },

  submitButton: {
    height: 42,
    padding: "0 18px",
    border: "none",
    borderRadius: 9,
    background: "#15803d",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
};
