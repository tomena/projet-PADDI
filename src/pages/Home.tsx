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
import { text } from "./homeText"; // ← ton objet `text` déplacé tel quel dans ce fichier
import "./Home.css";

const LANGS = ["mg", "fr", "en", "de"] as const;

// Chaque module -> page. Comportement identique à ton ancien switch.
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

  const open = (module: string) => {
    const known = module in ROUTES;
    navigate(known ? ROUTES[module] : "/dashboard", {
      state: { module: known ? module : "paddi" },
    });
  };

  // Les feuilles : seule la position (--x / --y, en % de l'image) change.
  const leaves = [
    { key: "environnement", cls: "env", Icon: Trees, label: t.env },
    { key: "economie", cls: "eco", Icon: TrendingUp, label: t.eco },
    { key: "societe", cls: "soc", Icon: Users, label: t.soc },
    { key: "cadre", cls: "cadre", Icon: Compass, label: t.cadre },
    { key: "projets", cls: "proj", Icon: FolderKanban, label: t.projet },
  ];

  return (
    <div className="home-page">
      <div
        className="home-backdrop"
        style={{ backgroundImage: `url(${bg})` }}
        aria-hidden="true"
      />

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

      {/* ARBRE + FEUILLES : tout est positionné en % de l'image */}
      <section className="tree-stage" aria-label="PADDI">
        <img src={bg} alt="" className="tree-img" />

        {leaves.map(({ key, cls, Icon, label }) => (
          <button
            key={key}
            type="button"
            className={`leaf ${cls}`}
            onClick={() => open(key)}
            aria-label={label}
          >
            <Icon className="leaf-icon" strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}

        <button type="button" className="paddi-btn" onClick={() => open("paddi")}>
          PADDI
        </button>
      </section>

      {/* TEXTE */}
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
        <button type="button" className="bottom" onClick={() => open("guide")}>
          <BookOpen size={26} aria-hidden="true" />
          <strong>{t.guide}</strong>
        </button>
        <button type="button" className="bottom" onClick={() => open("contact")}>
          <Phone size={26} aria-hidden="true" />
          <strong>{t.contact}</strong>
        </button>
      </footer>
    </div>
  );
}
