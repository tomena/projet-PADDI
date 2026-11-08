import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "./LanguageContext";

type Theme = "light" | "dark";

const CLE = "theme";

function choixMemorise(): Theme | null {
  try {
    const v = localStorage.getItem(CLE);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function themeSysteme(): Theme {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type Ctx = { theme: Theme; toggle: () => void };
const ThemeCtx = createContext<Ctx>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => choixMemorise() ?? themeSysteme());

  // Applique le thème sur <html>
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Suit le réglage de l'appareil tant que le visiteur n'a rien choisi
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const f = (e: MediaQueryListEvent) => {
      if (!choixMemorise()) setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const toggle = () =>
    setTheme((t) => {
      const n: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(CLE, n);
      } catch {
        /* stockage indisponible : on ignore */
      }
      return n;
    });

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

const LABELS = {
  fr: { sombre: "Thème sombre", clair: "Thème clair" },
  en: { sombre: "Dark theme", clair: "Light theme" },
  mg: { sombre: "Lohamilina maizina", clair: "Lohamilina mazava" },
  de: { sombre: "Dunkles Design", clair: "Helles Design" },
};

/** Bouton de bascule. compact = icône seule (menu réduit). */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const { lang } = useLanguage();
  const l = LABELS[lang as keyof typeof LABELS] ?? LABELS.fr;
  const texte = theme === "dark" ? l.clair : l.sombre;

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "compact" : ""}`}
      title={compact ? texte : undefined}
      aria-label={texte}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span>{texte}</span>}
    </button>
  );
}
