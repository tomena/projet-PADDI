import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";

/* =====================================================================
   OUTILS PARTAGÉS PAR TOUTES LES FENÊTRES MODALES
   - ModalPortal   : affiche la fenêtre directement dans <body>, ce qui évite
                     les décalages causés par le « zoom » des grandes pages
   - useModalLock  : touche Échap pour fermer + page de derrière bloquée
                     (avec plusieurs fenêtres ouvertes, Échap ferme la dernière)
   - useModalLang  : langue courante (LanguageContext)
   - AuthModal     : fenêtre de connexion UNIQUE, branchée sur /api/auth.
                     LoginModal (coûts) et ActivitesAccessModal (activités)
                     l'utilisent toutes les deux : un même compte donne donc
                     accès aux deux, avec le même mot de passe.
   ===================================================================== */

export type Lang = "fr" | "mg" | "en" | "de";

export function useModalLang(): Lang {
  const ctx: any = useLanguage() || {};
  const raw = ctx.lang ?? ctx.language;
  return raw === "mg" || raw === "en" || raw === "de" ? raw : "fr";
}

export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const pile: { current: () => void }[] = [];

export function useModalLock(onClose: () => void, active = true) {
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    if (!active) return;
    pile.push(ref);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pile[pile.length - 1] === ref) ref.current();
    };
    document.addEventListener("keydown", onKey);

    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = pile.indexOf(ref);
      if (i >= 0) pile.splice(i, 1);
      document.body.style.overflow = overflowInitial;
    };
  }, [active]);
}

/* =====================================================================
   TRADUCTIONS
   (les messages d'erreur renvoyés par le serveur sont affichés tels quels)
   ===================================================================== */

const LONGUEUR_MIN = 10;

const TXT = {
  fr: {
    titleLogin: "Accès sécurisé",
    titleChange: "Changer le mot de passe",
    subCosts: "Connectez-vous pour mettre à jour les coûts.",
    subActivities: "Connectez-vous pour mettre à jour les activités annuelles.",
    subChange: "Choisissez un mot de passe personnel.",
    email: "Email",
    password: "Mot de passe",
    current: "Mot de passe actuel",
    newPw: (n: number) => `Nouveau mot de passe (min. ${n} caractères)`,
    confirm: "Confirmer le nouveau mot de passe",
    firstLogin: "Première connexion : choisissez votre mot de passe personnel.",
    tooShort: (n: number) => `Le nouveau mot de passe doit contenir au moins ${n} caractères.`,
    mismatch: "La confirmation ne correspond pas au nouveau mot de passe.",
    failed: "Connexion impossible.",
    error: "Erreur de connexion.",
    toChange: "Changer le mot de passe ?",
    toLogin: "← Retour à la connexion",
    cancel: "Annuler",
    login: "Se connecter",
    wait: "Veuillez patienter...",
    saveLogin: "Enregistrer et se connecter",
    close: "Fermer",
  },
  mg: {
    titleLogin: "Fidirana azo antoka",
    titleChange: "Hanova ny teny miafina",
    subCosts: "Hiditra mba hanavao ny vidim-panatanterahana.",
    subActivities: "Hiditra mba hanavao ny asa isan-taona.",
    subChange: "Fidio ny teny miafina manokana anao.",
    email: "Adiresy mailaka",
    password: "Teny miafina",
    current: "Teny miafina ankehitriny",
    newPw: (n: number) => `Teny miafina vaovao (farafahakeliny litera ${n})`,
    confirm: "Hamarino ny teny miafina vaovao",
    firstLogin: "Fidirana voalohany : fidio ny teny miafina manokana anao.",
    tooShort: (n: number) => `Ny teny miafina vaovao dia tsy maintsy ahitana litera ${n} farafahakeliny.`,
    mismatch: "Tsy mifanaraka amin’ny teny miafina vaovao ny fanamarinana.",
    failed: "Tsy afaka niditra.",
    error: "Hadisoana tamin’ny fidirana.",
    toChange: "Hanova ny teny miafina ?",
    toLogin: "← Hiverina amin’ny fidirana",
    cancel: "Foano",
    login: "Hiditra",
    wait: "Mahandrata azafady...",
    saveLogin: "Tahirizo ary hiditra",
    close: "Akatony",
  },
  en: {
    titleLogin: "Secure access",
    titleChange: "Change password",
    subCosts: "Sign in to update the costs.",
    subActivities: "Sign in to update the annual activities.",
    subChange: "Choose a personal password.",
    email: "Email",
    password: "Password",
    current: "Current password",
    newPw: (n: number) => `New password (min. ${n} characters)`,
    confirm: "Confirm the new password",
    firstLogin: "First sign-in: choose your personal password.",
    tooShort: (n: number) => `The new password must contain at least ${n} characters.`,
    mismatch: "The confirmation does not match the new password.",
    failed: "Unable to sign in.",
    error: "Sign-in error.",
    toChange: "Change password?",
    toLogin: "← Back to sign-in",
    cancel: "Cancel",
    login: "Sign in",
    wait: "Please wait...",
    saveLogin: "Save and sign in",
    close: "Close",
  },
  de: {
    titleLogin: "Sicherer Zugang",
    titleChange: "Passwort ändern",
    subCosts: "Melden Sie sich an, um die Kosten zu aktualisieren.",
    subActivities: "Melden Sie sich an, um die jährlichen Aktivitäten zu aktualisieren.",
    subChange: "Wählen Sie ein persönliches Passwort.",
    email: "E-Mail",
    password: "Passwort",
    current: "Aktuelles Passwort",
    newPw: (n: number) => `Neues Passwort (mind. ${n} Zeichen)`,
    confirm: "Neues Passwort bestätigen",
    firstLogin: "Erste Anmeldung: Wählen Sie Ihr persönliches Passwort.",
    tooShort: (n: number) => `Das neue Passwort muss mindestens ${n} Zeichen enthalten.`,
    mismatch: "Die Bestätigung stimmt nicht mit dem neuen Passwort überein.",
    failed: "Anmeldung nicht möglich.",
    error: "Anmeldefehler.",
    toChange: "Passwort ändern?",
    toLogin: "← Zurück zur Anmeldung",
    cancel: "Abbrechen",
    login: "Anmelden",
    wait: "Bitte warten...",
    saveLogin: "Speichern und anmelden",
    close: "Schließen",
  },
};

/* =====================================================================
   STYLES — responsive + thème clair / sombre
   - variables claires dans « .am-modal », surcharges dans
     « :root[data-theme="dark"] .am-modal »
   - téléphone : feuille ancrée en bas ; paysage / écran court : défilement ;
     champs à 16 px (pas de zoom automatique sur iOS) ; cibles tactiles ≥ 44 px
   ===================================================================== */
const CSS = `
.am-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
  display:flex;align-items:center;justify-content:center;box-sizing:border-box;
  padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));
  overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}

.am-modal{--am-card:#fff;--am-ink:#111827;--am-txt2:#374151;--am-mut:#6b7280;--am-bd:#d1d5db;--am-line:#e5e7eb;--am-input:#fff;
  --am-btn:#2563eb;--am-link:#2563eb;--am-soft:#eff6ff;--am-ring:rgba(37,99,235,.25);--am-info-bg:#eff6ff;--am-info-txt:#1d4ed8;
  --am-err-bg:#fef2f2;--am-err-txt:#b91c1c;--am-err-bd:#fecaca;
  width:100%;max-width:400px;margin:auto;box-sizing:border-box;background:var(--am-card);color:var(--am-ink);
  border:1px solid var(--am-line);border-radius:14px;padding:clamp(18px,5vw,28px);box-shadow:0 20px 50px rgba(0,0,0,.18);
  max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;outline:none}
.am-modal.am-green{--am-btn:#15803d;--am-link:#15803d;--am-soft:#f0fdf4;--am-ring:rgba(21,128,61,.25);--am-info-bg:#f0fdf4;--am-info-txt:#166534}

:root[data-theme="dark"] .am-modal{--am-card:var(--surface,#111a2e);--am-ink:#e5e7eb;--am-txt2:#cbd5e1;--am-mut:#94a3b8;
  --am-bd:rgba(255,255,255,.2);--am-line:rgba(255,255,255,.12);--am-input:#16213a;
  --am-link:#60a5fa;--am-soft:rgba(96,165,250,.16);--am-ring:rgba(96,165,250,.35);--am-info-bg:rgba(96,165,250,.14);--am-info-txt:#93c5fd;
  --am-err-bg:rgba(248,113,113,.14);--am-err-txt:#fca5a5;--am-err-bd:rgba(248,113,113,.4)}
:root[data-theme="dark"] .am-modal.am-green{--am-link:#4ade80;--am-soft:rgba(74,222,128,.14);--am-ring:rgba(74,222,128,.35);
  --am-info-bg:rgba(74,222,128,.12);--am-info-txt:#86efac}

.am-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.am-header{margin-bottom:clamp(16px,4vw,24px);min-width:0}
.am-icon{width:42px;height:42px;border-radius:10px;background:var(--am-soft);display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:20px}
.am-title{margin:0;font-size:clamp(18px,4.5vw,20px);font-weight:700;color:var(--am-ink);line-height:1.25;overflow-wrap:anywhere}
.am-subtitle{margin:6px 0 0;font-size:13px;color:var(--am-mut);line-height:1.45}
.am-field{margin-bottom:16px}
.am-label{display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--am-txt2);line-height:1.35}
.am-input{display:block;width:100%;height:44px;padding:0 12px;border:1px solid var(--am-bd);border-radius:8px;font-size:14px;font-family:inherit;
  color:var(--am-ink);background:var(--am-input);box-sizing:border-box;outline:none;-webkit-appearance:none;appearance:none;
  transition:border-color .15s ease,box-shadow .15s ease}
.am-input::placeholder{color:var(--am-mut);opacity:.7}
.am-input:focus{border-color:var(--am-link);box-shadow:0 0 0 3px var(--am-ring)}
.am-msg{margin-bottom:16px;padding:9px 12px;border-radius:8px;font-size:13px;line-height:1.45;overflow-wrap:anywhere}
.am-info{background:var(--am-info-bg);color:var(--am-info-txt)}
.am-error{background:var(--am-err-bg);color:var(--am-err-txt);border:1px solid var(--am-err-bd)}
.am-link{background:none;border:none;padding:10px 0;color:var(--am-link);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;text-decoration:underline;text-align:left}
.am-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}
.am-btn{height:44px;padding:0 18px;border-radius:8px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;box-sizing:border-box;line-height:1.2}
.am-btn-cancel{border:1px solid var(--am-bd);background:var(--am-card);color:var(--am-txt2)}
.am-btn-cancel:hover{background:var(--am-soft)}
.am-btn-primary{border:none;background:var(--am-btn);color:#fff}
.am-btn-primary:disabled{cursor:not-allowed;opacity:.6}
.am-btn:focus-visible,.am-link:focus-visible{outline:3px solid var(--am-ring);outline-offset:2px}

@media (max-width:480px){
  .am-overlay{align-items:flex-end}
  .am-modal{border-radius:16px;max-width:100%}
  .am-input{font-size:16px}
  .am-actions{flex-direction:column-reverse;gap:8px}
  .am-btn{width:100%}
}
@media (max-width:340px){
  .am-overlay{padding-left:8px;padding-right:8px}
  .am-modal{padding:16px}
  .am-label{font-size:12px}
}
@media (max-height:520px){
  .am-overlay{align-items:flex-start}
  .am-modal{max-height:none;padding:16px 20px}
  .am-icon{display:none}
  .am-header{margin-bottom:12px}
  .am-field{margin-bottom:12px}
}
@media (min-width:1600px){
  .am-modal{max-width:460px}
  .am-title{font-size:22px}
  .am-subtitle,.am-label,.am-msg{font-size:14px}
  .am-input{font-size:15px}
}
@media (min-width:2560px){
  .am-modal{max-width:560px}
  .am-title{font-size:26px}
  .am-subtitle,.am-label,.am-msg{font-size:17px}
  .am-input{font-size:18px;height:52px}
  .am-btn{height:52px;font-size:17px}
}
@media (pointer:coarse){.am-input,.am-btn{min-height:44px}}
@media (prefers-reduced-motion:reduce){.am-input{transition:none}}
`;

/* =====================================================================
   FENÊTRE DE CONNEXION UNIQUE
   ===================================================================== */

export interface AuthModalProps {
  /** « costs » : mise à jour des coûts · « activities » : mise à jour des activités */
  purpose: "costs" | "activities";
  onClose: () => void;
  // userName : prénom de l'utilisateur ; token : jeton de session signé par le serveur
  onSuccess: (userName: string, token: string) => void;
}

export function AuthModal({ purpose, onClose, onSuccess }: AuthModalProps) {
  const lang = useModalLang();
  const t = TXT[lang];

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
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalLock(onClose);
  useEffect(() => { dialogRef.current?.focus(); }, []);

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
    if (!reponse.ok) throw new Error(data.error || t.failed);
    return data as { userName: string; token: string; mustChange: boolean };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    effacerMessages();

    const mail = email.trim().toLowerCase();

    if (mode === "change") {
      if (newPassword.length < LONGUEUR_MIN) {
        setError(t.tooShort(LONGUEUR_MIN));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t.mismatch);
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
          setInfo(t.firstLogin);
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
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  const enChangement = mode === "change";

  return (
    <ModalPortal>
      <style>{CSS}</style>

      <div className="am-overlay" onClick={onClose}>
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={`am-modal${purpose === "activities" ? " am-green" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-title`}
          lang={lang}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="am-header">
            <div className="am-icon" aria-hidden="true">🔒</div>

            <h2 id={`${uid}-title`} className="am-title">
              {enChangement ? t.titleChange : t.titleLogin}
            </h2>

            <p className="am-subtitle">
              {enChangement ? t.subChange : purpose === "costs" ? t.subCosts : t.subActivities}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="am-field">
              <label className="am-label" htmlFor={idEmail}>{t.email}</label>
              <input
                id={idEmail}
                className="am-input"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); effacerMessages(); }}
                placeholder="exemple@giz.de"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
              />
            </div>

            <div className="am-field">
              <label className="am-label" htmlFor={idPassword}>
                {enChangement ? t.current : t.password}
              </label>
              <input
                id={idPassword}
                className="am-input"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); effacerMessages(); }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {enChangement && (
              <>
                <div className="am-field">
                  <label className="am-label" htmlFor={idNew}>{t.newPw(LONGUEUR_MIN)}</label>
                  <input
                    id={idNew}
                    className="am-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); effacerMessages(); }}
                    placeholder="••••••••••"
                    required
                    minLength={LONGUEUR_MIN}
                    autoComplete="new-password"
                  />
                </div>

                <div className="am-field">
                  <label className="am-label" htmlFor={idConfirm}>{t.confirm}</label>
                  <input
                    id={idConfirm}
                    className="am-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); effacerMessages(); }}
                    placeholder="••••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {info && <div className="am-msg am-info" role="status">{info}</div>}
            {error && <div className="am-msg am-error" role="alert">{error}</div>}

            <div>
              <button type="button" className="am-link" onClick={() => changerMode(enChangement ? "login" : "change")}>
                {enChangement ? t.toLogin : t.toChange}
              </button>
            </div>

            <div className="am-actions">
              <button type="button" className="am-btn am-btn-cancel" onClick={onClose}>
                {t.cancel}
              </button>

              <button type="submit" className="am-btn am-btn-primary" disabled={loading}>
                {loading ? t.wait : enChangement ? t.saveLogin : t.login}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

export default AuthModal;
