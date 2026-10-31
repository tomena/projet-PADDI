import React, { useState } from "react";

interface LoginModalProps {
  onClose: () => void;
  // userName : prénom de l'utilisateur ; token : jeton de session signé par le serveur
  onSuccess: (userName: string, token: string) => void;
}

const LONGUEUR_MIN = 10;

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "change">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // mot de passe (connexion) ou actuel (changement)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: "#ffffff",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              fontSize: 20,
            }}
          >
            🔒
          </div>

          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
            {enChangement ? "Changer le mot de passe" : "Accès sécurisé"}
          </h2>

          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
            {enChangement
              ? "Choisissez un mot de passe personnel."
              : "Connectez-vous pour mettre à jour les coûts."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                effacerMessages();
              }}
              placeholder="exemple@giz.de"
              required
              style={inputStyle}
            />
          </div>

          {/* Mot de passe (actuel en mode changement) */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              {enChangement ? "Mot de passe actuel" : "Mot de passe"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                effacerMessages();
              }}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          {/* Nouveau mot de passe + confirmation */}
          {enChangement && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Nouveau mot de passe (min. {LONGUEUR_MIN} caractères)
                </label>
                <input
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
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    effacerMessages();
                  }}
                  placeholder="••••••••••"
                  required
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* Information */}
          {info && (
            <div
              style={{
                marginBottom: 16,
                padding: "9px 12px",
                borderRadius: 8,
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 13,
              }}
            >
              {info}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "9px 12px",
                borderRadius: 8,
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Lien de bascule */}
          <div style={{ textAlign: "left" }}>
            <button
              type="button"
              onClick={() => changerMode(enChangement ? "login" : "change")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#2563eb",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {enChangement ? "← Retour à la connexion" : "Changer le mot de passe ?"}
            </button>
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                color: "#374151",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 40,
                padding: "0 18px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
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
  );
}
