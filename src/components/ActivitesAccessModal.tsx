import React, { useState } from "react";

interface ActivitesAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    userName: string,
    identifiant: string,
    motDePasse: string
  ) => void;
}

/*
 * Les styles inline ne supportent pas les media queries.
 * On utilise donc des classes CSS injectées via <style>, ce qui permet
 * d'adapter la modale à tous les écrans (petits mobiles, paysage,
 * tablettes, ordinateurs, très grands écrans).
 */
const css = `
.aam-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  box-sizing: border-box;
  padding:
    max(clamp(8px, 3vw, 24px), env(safe-area-inset-top))
    max(clamp(8px, 3vw, 24px), env(safe-area-inset-right))
    max(clamp(8px, 3vw, 24px), env(safe-area-inset-bottom))
    max(clamp(8px, 3vw, 24px), env(safe-area-inset-left));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.aam-modal {
  width: 100%;
  max-width: 480px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.aam-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #15803d;
  color: #ffffff;
  padding: 20px 22px;
}

.aam-header-text { min-width: 0; }

.aam-title {
  font-size: clamp(16px, 4.2vw, 19px);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.aam-subtitle {
  margin-top: 4px;
  font-size: clamp(12px, 3.3vw, 13px);
  opacity: 0.9;
  overflow-wrap: anywhere;
}

.aam-close {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 25px;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
}

.aam-form {
  padding: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}

.aam-info {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin-bottom: 22px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
}

.aam-info-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #15803d;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.aam-info-body { min-width: 0; }

.aam-info-title {
  font-size: 14px;
  font-weight: 700;
  color: #166534;
  margin-bottom: 3px;
}

.aam-info-text {
  font-size: 13px;
  line-height: 1.5;
  color: #475569;
  overflow-wrap: anywhere;
}

.aam-field { margin-bottom: 17px; }

.aam-label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.aam-input {
  width: 100%;
  box-sizing: border-box;
  height: 44px;
  padding: 0 13px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  outline: none;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
}

.aam-input:focus-visible {
  border-color: #15803d;
  box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.25);
}

.aam-error {
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.aam-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.aam-btn {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  touch-action: manipulation;
}

.aam-btn-cancel {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.aam-btn-submit {
  border: none;
  background: #15803d;
  color: #ffffff;
}

.aam-close:focus-visible,
.aam-btn:focus-visible {
  outline: 3px solid rgba(21, 128, 61, 0.45);
  outline-offset: 2px;
}

/* ---------- Tablettes et petits écrans (≤ 600px) ---------- */
@media (max-width: 600px) {
  .aam-header { padding: 16px 16px; }
  .aam-form { padding: 18px 16px; }
  .aam-info { padding: 12px; margin-bottom: 18px; }

  /* 16px minimum : évite le zoom automatique sur iOS */
  .aam-input { font-size: 16px; height: 48px; }

  .aam-actions { flex-direction: column-reverse; }
  .aam-btn { width: 100%; min-height: 48px; }
}

/* ---------- Très petits écrans (≤ 360px) ---------- */
@media (max-width: 360px) {
  .aam-modal { border-radius: 12px; }
  .aam-header { padding: 14px 12px; }
  .aam-form { padding: 14px 12px; }
  .aam-info { flex-direction: column; gap: 8px; }
}

/* ---------- Écrans de faible hauteur (mobile en paysage) ---------- */
@media (max-height: 520px) {
  .aam-overlay { align-items: flex-start; }
  .aam-header { padding-top: 10px; padding-bottom: 10px; }
  .aam-form { padding-top: 12px; padding-bottom: 12px; }
  .aam-info { display: none; }
  .aam-field { margin-bottom: 12px; }
  .aam-actions { margin-top: 14px; }
}

/* ---------- Grands écrans (≥ 1600px) ---------- */
@media (min-width: 1600px) {
  .aam-modal { max-width: 540px; }
  .aam-input { height: 48px; font-size: 15px; }
  .aam-btn { min-height: 46px; }
}

/* ---------- Écrans tactiles : zones de toucher confortables ---------- */
@media (hover: none) and (pointer: coarse) {
  .aam-close { width: 44px; height: 44px; }
}

/* ---------- Respect de la réduction des animations ---------- */
@media (prefers-reduced-motion: reduce) {
  .aam-overlay, .aam-modal { scroll-behavior: auto; transition: none; animation: none; }
}
`;

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
    const USERS: Record<string, string> = {
      "zo.ravelonirina@giz.de": "Zo",
      "anjarampifohazana.toky@giz.de": "Toky",
      "joary.andriamiharimanana@giz.de": "Joary",
    };

    const normalizedIdentifiant = identifiant.trim().toLowerCase();

    if (
      USERS[normalizedIdentifiant] &&
      motDePasse === "PaddiActivite2026"
    ) {
      setIdentifiant("");
      setMotDePasse("");
      setError("");

      onSuccess(
        USERS[normalizedIdentifiant],
        normalizedIdentifiant,
        motDePasse
      );
    } else {
      setError("Identifiant ou mot de passe incorrect.");
    }
  };

  return (
    <>
      <style>{css}</style>

      <div className="aam-overlay">
        <div
          className="aam-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aam-title"
        >
          {/* HEADER */}
          <div className="aam-header">
            <div className="aam-header-text">
              <div className="aam-title" id="aam-title">
                Accès mise à jour
              </div>
              <div className="aam-subtitle">
                Suivi des activités annuelles
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="aam-close"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          {/* CONTENU */}
          <form onSubmit={handleSubmit} className="aam-form">
            <div className="aam-info">
              <div className="aam-info-icon">✓</div>

              <div className="aam-info-body">
                <div className="aam-info-title">Accès réservé</div>
                <div className="aam-info-text">
                  Veuillez saisir vos identifiants pour accéder à la mise
                  à jour des activités.
                </div>
              </div>
            </div>

            {/* IDENTIFIANT */}
            <div className="aam-field">
              <label className="aam-label" htmlFor="aam-identifiant">
                Identifiant
              </label>
              <input
                id="aam-identifiant"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={identifiant}
                onChange={(e) => {
                  setIdentifiant(e.target.value);
                  setError("");
                }}
                placeholder="Saisir votre identifiant"
                autoComplete="username"
                className="aam-input"
              />
            </div>

            {/* MOT DE PASSE */}
            <div className="aam-field">
              <label className="aam-label" htmlFor="aam-motdepasse">
                Mot de passe
              </label>
              <input
                id="aam-motdepasse"
                type="password"
                value={motDePasse}
                onChange={(e) => {
                  setMotDePasse(e.target.value);
                  setError("");
                }}
                placeholder="Saisir votre mot de passe"
                autoComplete="current-password"
                className="aam-input"
              />
            </div>

            {/* ERREUR */}
            {error && (
              <div className="aam-error" role="alert">
                {error}
              </div>
            )}

            {/* ACTIONS */}
            <div className="aam-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="aam-btn aam-btn-cancel"
              >
                Annuler
              </button>

              <button type="submit" className="aam-btn aam-btn-submit">
                Accéder à la mise à jour
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
