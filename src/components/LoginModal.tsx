import React, { useState } from "react";

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (userName: string) => void;
}

export default function LoginModal({
  onClose,
  onSuccess,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Authentification temporaire pour la démonstration
  const DEMO_PASSWORD = "Paddi2026";

  // Utilisateurs autorisés
  const USERS: Record<string, string> = {
    "zo.ravelonirina@giz.de": "Zo",
    "anjarampifohazana.toky@giz.de": "Toky",
    "joary.andriamiharimanana@giz.de": "Joary",
  
    "allan.hong-wa@giz.de": "Allan",
    "nantenaina.herimanga@giz.de": "Herimanga",
    "tolojanahary.velomahafaly@giz.de": "Njaka",
    "mmichael.raharifidinarivo@giz.de": "Michael",
    "tsinjoharinosy.rahaingoarivelo@giz.de": "Tsinjo",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (
      USERS[normalizedEmail] &&
      password === DEMO_PASSWORD
    ) {
      setError("");

      // Envoie le prénom de l'utilisateur au composant parent
      onSuccess(USERS[normalizedEmail]);

    } else {
      setError("Email ou mot de passe incorrect.");
    }
  };

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

          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Accès sécurisé
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Connectez-vous pour mettre à jour les coûts.
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>

            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="exemple@giz.de"
              required
              style={{
                width: "100%",
                height: 42,
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 16 }}>

            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Mot de passe
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => { 
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                height: 42,
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

          </div>

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

          {/* Boutons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 22,
            }}
          >

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
              style={{
                height: 40,
                padding: "0 18px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Se connecter
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}
