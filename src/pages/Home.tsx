import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import {
  BookOpen,
  Phone,
  Trees,
  TrendingUp,
  Users,
  Compass,
  FolderKanban,
} from "lucide-react";

import bg from "../assets/home-bg.png";
import { text } from "./homeText"; // ton objet `text`, déplacé tel quel (avec `export`)
import "./Home.css";

const LANGS = ["mg", "fr", "en", "de"] as const;

const ROUTES: Record<string, string> = {
  paddi: "/dashboard",
  environnement: "/dashboard/analyse-feux",
  cadre: "/dashboard/analyse",
  societe: "/dashboard/analyse-social",
  economie: "/dashboard/analyse-economie",
  projets: "/dashboard/projets",
};

export default function Home() {
  const { lang, setLang } = useLanguage();
  const t = text[lang as keyof typeof text];
  const navigate = useNavigate();

  // Ratio réel de l'image (lu automatiquement) : sert à garder les feuilles alignées
  const [ratio, setRatio] = useState(3 / 2);

  const open = (module: string) => {
    const known = module in ROUTES;
    navigate(known ? ROUTES[module] : "/dashboard", {
      state: { module: known ? module : "paddi" },
    });
  };

  const leaves = [
    { key: "environnement", cls: "env", Icon: Trees, label: t.env },
    { key: "economie", cls: "eco", Icon: TrendingUp, label: t.eco },
    { key: "societe", cls: "soc", Icon: Users, label: t.soc },
    { key: "cadre", cls: "cadre", Icon: Compass, label: t.cadre },
    { key: "projets", cls: "proj", Icon: FolderKanban, label: t.projet },
  ];

  return (
    <div className="home-page">
      <div className="stage" style={{ "--ratio": ratio } as CSSProperties}>
        <header className="home-header">
          <h1 className="home-title">
            <span>{t.title1}</span> <span>{t.title2}</span>
          </h1>

          <div className="lang" role="group" aria-label="Langue">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={lang === code ? "active" : ""}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <div className="tree-viewport">
          <div className="tree-canvas">
            <img
              src={bg}
              alt="PADDI"
              className="home-bg"
              draggable={false}
              onLoad={(e) =>
                setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)
              }
            />

            {leaves.map(({ key, cls, Icon, label }) => (
              <button
                key={key}
                type="button"
                className={`leaf ${cls}`}
                onClick={() => open(key)}
                aria-label={label}
              >
                <Icon strokeWidth={2.2} />
                <span>{label}</span>
              </button>
            ))}

            <button type="button" className="paddi-btn" onClick={() => open("paddi")}>
              PADDI
            </button>
          </div>
        </div>

        <article className="info-card">
          <div className="info-header">
            <div className="info-icon" aria-hidden="true">i</div>
            <h2>{t.presentation}</h2>
          </div>

          <p>{t.p1}</p>
          <p>{t.p2}</p>
          <ul className="info-list">
            {t.territories.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p>{t.p3}</p>
          <p>{t.p4}</p>
          <ul className="info-list">
            {t.features.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p>{t.p5}</p>
          <p>{t.p6}</p>
          <p className="bold">{t.p7}</p>
        </article>

        <footer className="home-footer">
          <button type="button" className="bottom guide" onClick={() => open("guide")}>
            <BookOpen aria-hidden="true" />
            <strong>{t.guide}</strong>
          </button>
          <button type="button" className="bottom contact" onClick={() => open("contact")}>
            <Phone aria-hidden="true" />
            <strong>{t.contact}</strong>
          </button>
        </footer>
      </div>
    </div>
  );
}
