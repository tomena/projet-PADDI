import React, { useEffect, useId, useState } from "react";

interface LoginModalProps {
  onClose: () => void;
  // userName : prénom de l'utilisateur ; token : jeton de session signé par le serveur
  onSuccess: (userName: string, token: string) => void;
}

const LONGUEUR_MIN = 10;

/* =========================================================
   STYLES RESPONSIVES
   - Les media queries ne sont pas possibles en style inline :
     on injecte donc une feuille de style avec des classes "lm-*".
   - Technique : tailles fluides (clamp), unités dvh/svh, safe-area
     (encoches iPhone), défilement interne si l'écran est trop court
     (paysage, clavier ouvert), champs à 16px sur mobile pour éviter
     le zoom automatique d'iOS, cibles tactiles >= 44px.
========================================================= */
const CSS = `
.lm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding:
    max(12px, env(safe-area-inset-top))
    max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.lm-modal {
  width: 100%;
  max-width: 400px;
  margin: auto;                       /* centré, mais défile si trop haut */
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 14px;
  padding: clamp(18px, 5vw, 28px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
  max-height: calc(100vh - 24px);
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}

.lm-header { margin-bottom: clamp(16px, 4vw, 24px); }

.lm-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  font-size: 20px;
}

.lm-title {
  margin: 0;
  font-size: clamp(18px, 4.5vw, 20px);
  font-weight: 700;
  color: #111827;
  line-height: 1.25;
}

.lm-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.45;
}

.lm-field { margin-bottom: 16px; }

.lm-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  line-height: 1.35;
}

.lm-input {
  display: block;
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  background: #ffffff;
  box-sizing: border-box;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lm-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}

.lm-msg {
  margin-bottom: 16px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.lm-info  { background: #eff6ff; color: #1d4ed8; }
.lm-error { background: #fef2f2; color: #b91c1c; }

.lm-link {
  background: none;
  border: none;
  padding: 10px 0;                    /* zone tactile plus confortable */
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-align: left;
}

.lm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.lm-btn {
  height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-sizing: border-box;
  line-height: 1.2;
}
.lm-btn-cancel  { border: 1px solid #d1d5db; background: #ffffff; color: #374151; }
.lm-btn-primary { border: none; background: #2563eb; color: #ffffff; }
.lm-btn-primary:disabled { cursor: not-allowed; opacity: 0.6; }

.lm-btn:focus-visible,
.lm-link:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.45);
  outline-offset: 2px;
}

/* ---------- Téléphones (<= 480px) ---------- */
@media (max-width: 480px) {
  .lm-overlay { align-items: flex-end; }          /* feuille ancrée en bas */
  .lm-modal   { border-radius: 16px; max-width: 100%; }
  .lm-input   { font-size: 16px; }                /* évite le zoom auto d'iOS */
  .lm-actions { flex-direction: column-reverse; gap: 8px; }
  .lm-btn     { width: 100%; }                    /* boutons pleine largeur */
}

/* ---------- Très petits écrans (<= 340px) ---------- */
@media (max-width: 340px) {
  .lm-overlay { padding-left: 8px; padding-right: 8px; }
  .lm-modal   { padding: 16px; }
  .lm-label   { font-size: 12px; }
}

/* ---------- Écrans courts / paysage mobile ---------- */
@media (max-height: 520px) {
  .lm-overlay { align-items: flex-start; }
  .lm-modal   { max-height: none; padding: 16px 20px; }
  .lm-icon    { display: none; }
  .lm-header  { margin-bottom: 12px; }
  .lm-field   { margin-bottom: 12px; }
}

/* ---------- Grands écrans (>= 1600px) ---------- */
@media (min-width: 1600px) {
  .lm-modal    { max-width: 440px; }
  .lm-title    { font-size: 22px; }
  .lm-subtitle,
  .lm-label,
  .lm-msg      { font-size: 14px; }
}

/* ---------- Écrans tactiles : cibles >= 44px ---------- */
@media (pointer: coarse) {
  .lm-input, .lm-btn { min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  .lm-input { transition: none; }
}
`;

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "change">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // mot de passe (connexion) ou actuel (changement)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const uid = useId();
  const idEmail = `${uid}-email`;
  const idPassword = `${uid}-password`;
  const idNew = `${uid}-new`;
  const idConfirm = `${uid}-confirm`;

  // Fermeture avec la touche Échap + blocage du défilement de la page derrière le modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowInitial;
    };
  }, [onClose]);

  const effacerMessages = () => {
    setError("");
    setInfo("");
  };

  const changerMode = (m: "login" | "change") => {
    setMode(m);
    setNewPassword("");
    setConfirmPassword("");
    effacerMessages();
  };

  const appelerAuth = async (corps: Record<string, string>) => {
    const reponse = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const data = await reponse.json().catch(() => ({}));
    if (!reponse.ok) throw new Error(data.error || "Connexion impossible.");
    return data as { userName: string; token: string; mustChange: boolean };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    effacerMessages();

    const mail = email.trim().toLowerCase();

    if (mode === "change") {
      if (newPassword.length < LONGUEUR_MIN) {
        setError(`Le nouveau mot de passe doit contenir au moins ${LONGUEUR_MIN} caractères.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("La confirmation ne correspond pas au nouveau mot de passe.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const data = await appelerAuth({ action: "login", email: mail, password });

        if (data.mustChange) {
          // Première connexion : mot de passe initial, l'utilisateur doit choisir le sien.
          setMode("change");
          setInfo("Première connexion : choisissez votre mot de passe personnel.");
          return;
        }
        onSuccess(data.userName, data.token);
      } else {
        const data = await appelerAuth({
          action: "change",
          email: mail,
          currentPassword: password,
          newPassword,
        });
        onSuccess(data.userName, data.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const enChangement = mode === "change";

  return (
    <>
      <style>{CSS}</style>

      <div className="lm-overlay" onClick={onClose}>
        <div
          className="lm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-title`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="lm-header">
            <div className="lm-icon" aria-hidden="true">🔒</div>

            <h2 id={`${uid}-title`} className="lm-title">
              {enChangement ? "Changer le mot de passe" : "Accès sécurisé"}
            </h2>

            <p className="lm-subtitle">
              {enChangement
                ? "Choisissez un mot de passe personnel."
                : "Connectez-vous pour mettre à jour les coûts."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="lm-field">
              <label className="lm-label" htmlFor={idEmail}>Email</label>
              <input
                id={idEmail}
                className="lm-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  effacerMessages();
                }}
                placeholder="exemple@giz.de"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
              />
            </div>

            {/* Mot de passe (actuel en mode changement) */}
            <div className="lm-field">
              <label className="lm-label" htmlFor={idPassword}>
                {enChangement ? "Mot de passe actuel" : "Mot de passe"}
              </label>
              <input
                id={idPassword}
                className="lm-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  effacerMessages();
                }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Nouveau mot de passe + confirmation */}
            {enChangement && (
              <>
                <div className="lm-field">
                  <label className="lm-label" htmlFor={idNew}>
                    Nouveau mot de passe (min. {LONGUEUR_MIN} caractères)
                  </label>
                  <input
                    id={idNew}
                    className="lm-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      effacerMessages();
                    }}
                    placeholder="••••••••••"
                    required
                    minLength={LONGUEUR_MIN}
                    autoComplete="new-password"
                  />
                </div>

                <div className="lm-field">
                  <label className="lm-label" htmlFor={idConfirm}>
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    id={idConfirm}
                    className="lm-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      effacerMessages();
                    }}
                    placeholder="••••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {/* Information */}
            {info && <div className="lm-msg lm-info" role="status">{info}</div>}

            {/* Erreur */}
            {error && <div className="lm-msg lm-error" role="alert">{error}</div>}

            {/* Lien de bascule */}
            <div>
              <button
                type="button"
                className="lm-link"
                onClick={() => changerMode(enChangement ? "login" : "change")}
              >
                {enChangement ? "← Retour à la connexion" : "Changer le mot de passe ?"}
              </button>
            </div>

            {/* Boutons */}
            <div className="lm-actions">
              <button type="button" className="lm-btn lm-btn-cancel" onClick={onClose}>
                Annuler
              </button>

              <button type="submit" className="lm-btn lm-btn-primary" disabled={loading}>
                {loading
                  ? "Veuillez patienter..."
                  : enChangement
                  ? "Enregistrer et se connecter"
                  : "Se connecter"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
