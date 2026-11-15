import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import {
  ArrowRight,
  BookOpen,
  Compass,
  FolderKanban,
  Phone,
  Trees,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import bg from "../assets/home-bg.png";
import { text } from "./homeText";
import "./Home.css";

type Lang = "mg" | "fr" | "en" | "de";

const LANGS: readonly Lang[] = ["mg", "fr", "en", "de"];

const ROUTES: Record<string, string> = {
  paddi: "/dashboard",
  environnement: "/dashboard/analyse-feux",
  cadre: "/dashboard/analyse",
  societe: "/dashboard/analyse-social",
  economie: "/dashboard/analyse-economie",
  projets: "/dashboard/projets",
};

type ModuleLabelKey = "env" | "eco" | "soc" | "cadre" | "projet";

interface ModuleDef {
  key: string;
  tone: "env" | "eco" | "soc" | "cadre" | "proj";
  Icon: LucideIcon;
  labelKey: ModuleLabelKey;
}

const MODULES: ModuleDef[] = [
  { key: "environnement", tone: "env", Icon: Trees, labelKey: "env" },
  { key: "economie", tone: "eco", Icon: TrendingUp, labelKey: "eco" },
  { key: "societe", tone: "soc", Icon: Users, labelKey: "soc" },
  { key: "cadre", tone: "cadre", Icon: Compass, labelKey: "cadre" },
  { key: "projets", tone: "proj", Icon: FolderKanban, labelKey: "projet" },
];

export default function Home() {
  const { lang, setLang } = useLanguage();
  const t = text[(lang as Lang) in text ? (lang as Lang) : "fr"];
  const navigate = useNavigate();

  const open = (module: string) => {
    const known = module in ROUTES;
    navigate(known ? ROUTES[module] : "/dashboard", {
      state: { module: known ? module : "paddi" },
    });
  };

  return (
    <div className="home" style={{ backgroundImage: `url(${bg})` }}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Trees />
          </span>
          <span>PADDI</span>
        </div>

        <div className="lang" role="group" aria-label="Langue">
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              className={lang === code ? "active" : ""}
              aria-pressed={lang === code}
              onClick={() => setLang(code as never)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <h1>
            <span>{t.title1}</span>
            <span>{t.title2}</span>
          </h1>
          <p className="lead">{t.p1}</p>

          <button type="button" className="cta" onClick={() => open("paddi")}>
            PADDI
            <ArrowRight aria-hidden="true" />
          </button>
        </section>

        <nav className="modules" aria-label={t.presentation}>
          <ul>
            {MODULES.map(({ key, tone, Icon, labelKey }) => (
              <li key={key}>
                <button
                  type="button"
                  className={`tile ${tone}`}
                  onClick={() => open(key)}
                >
                  <span className="tile-icon" aria-hidden="true">
                    <Icon strokeWidth={2.2} />
                  </span>
                  <span className="tile-label">{t[labelKey]}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className="panels" aria-label={t.presentation}>
          <h2 className="panels-title">{t.presentation}</h2>
          <article className="panel">
            <ul className="chips">
              {t.territories.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <ul className="checks">
              {t.features.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <p className="tagline">{t.p7}</p>
      </main>

      <footer className="footer">
        <button type="button" className="footer-btn" onClick={() => open("guide")}>
          <BookOpen aria-hidden="true" />
          <strong>{t.guide}</strong>
        </button>
        <button type="button" className="footer-btn" onClick={() => open("contact")}>
          <Phone aria-hidden="true" />
          <strong>{t.contact}</strong>
        </button>
      </footer>
    </div>
  );
}
