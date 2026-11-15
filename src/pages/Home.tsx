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
    <div className="home">
      <section className="hero" style={{ backgroundImage: `url(${bg})` }}>
        <div className="topbar">
          <span className="brand">PADDI</span>

          <div className="lang" role="group" aria-label="Langue">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code as never)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-content">
          <h1>
            <span>{t.title1}</span>
            <span>{t.title2}</span>
          </h1>

          <button type="button" className="cta" onClick={() => open("paddi")}>
            PADDI
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <main>
        <section className="section" aria-labelledby="modules-title">
          <h2 id="modules-title" className="section-title">
            {t.presentation}
          </h2>

          <ul className="modules">
            {MODULES.map(({ key, tone, Icon, labelKey }) => (
              <li key={key}>
                <button
                  type="button"
                  className={`module ${tone}`}
                  onClick={() => open(key)}
                >
                  <span className="module-icon" aria-hidden="true">
                    <Icon strokeWidth={2.1} />
                  </span>
                  <span className="module-label">{t[labelKey]}</span>
                  <span className="module-go" aria-hidden="true">
                    Ouvrir <ArrowRight />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="section about" aria-label="Présentation">
          <article className="card">
            <h3>{t.presentation}</h3>
            <p>{t.p1}</p>
            <p>{t.p2}</p>
            <ul>
              {t.territories.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t.p3}</p>
            <p>{t.p4}</p>
          </article>

          <article className="card">
            <ul>
              {t.features.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t.p5}</p>
            <p>{t.p6}</p>
            <p className="highlight">{t.p7}</p>
          </article>
        </section>
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
