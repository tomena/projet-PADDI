import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Phone, BarChart3, Leaf, Users, Target, Cog,} from "lucide-react";

import bg from "../assets/home-bg.png";
import "./Home.css";

const text = {
  fr: {
    title1: "Système d’Information pour un",
    title2: "Développement Durable et Intégré",
    presentation: "Présentation du système d’information",
    p1: "Ce système d'information sert d'outil d'aide à la prise de décision, à l'orientation des actions à mettre en œuvre pour le développement durable et intégré d'un territoire bien défini à Madagascar, notamment dans les régions d'ancrage de 7 aires protégées sélectionnées, telles que Montagne d'Ambre, Ankarana et Analamerana dans la région DIANA, Ankarafantsika dans la région Boeny, Andohahela dans la région Anôsy, Befotaka-Midongy dans la région Atsimo Atsinanana et Marolambo dans la région Amoron'i Mania. Le territoire peut aller de la Région jusqu'au niveau des communes.",
    p2: "Ce système est destiné à tout acteur qui œuvre ou qui s'intéresse dans le développement durable et surtout aux preneurs de décisions.",
    p3: "D'un côté, selon le territoire sélectionné, le système d'information présente les informations centralisées, disponibles sur le plan environnement, le plan économie et le plan social ; à cela s'ajoutent les documents cadres existants ainsi que la présentation spatialisée des différentes interventions des différents acteurs. De plus, les résultats des appuis du PADDI dans le territoire sélectionné seront présentés beaucoup plus en détails.",
    p4: "De l'autre côté, à part le partage des informations, des analyses plus spécifiques pourront être produites par le système sur la base des données renseignées par les utilisateurs. Des prévisions, des analyses et des orientations peuvent être produites.",
    p5: "Le système d'information est constitué des éléments de l'arbre ci-contre.",
    env: "Environnement",
    eco: "Économie",
    soc: "Société",
    cadre: "Cadre stratégique",
    projet: "Projets de développement",
    guide: "Guide",
    guide2: "d'utilisation",
    contact: "Contact",
  },

  mg: {
    title1: "Rafitra Fampahalalana ho an'ny",
    title2: "Fampandrosoana Maharitra sy Mitambatra",

    presentation: "Fampahafantarana ny Rafitra Fampahalalana",

    p1: "Ity rafitra fampahalalana ity dia fitaovana manampy amin'ny fandraisana fanapahan-kevitra sy fitarihana ireo hetsika hotanterahina ho an'ny fampandrosoana maharitra sy mitambatra ao amin'ny faritra voafaritra eto Madagasikara. Izy io dia mifantoka indrindra amin'ireo faritra iasan'ny faritra arovana fito voafantina, dia ny Montagne d'Ambre, Ankarana ary Analamerana ao amin'ny faritra DIANA, Ankarafantsika ao Boeny, Andohahela ao Anôsy, Befotaka-Midongy ao Atsimo Atsinanana ary Marolambo ao Amoron'i Mania. Ny sehatra iasana dia afaka manomboka amin'ny Faritra ka hatrany amin'ny Kaominina.",

    p2: "Ity rafitra ity dia natao ho an'ny mpisehatra rehetra miasa na liana amin'ny fampandrosoana maharitra, indrindra ho an'ireo tompon'andraikitra mandray fanapahan-kevitra.",

    p3: "Etsy ankilany, arakaraka ny faritra voafidy, ny rafitra dia mampiseho ireo angon-drakitra sy vaovao voaangona momba ny tontolo iainana, ny toekarena ary ny fiarahamonina. Ampiana ihany koa ireo antontan-taratasy stratejika efa misy sy ny fanehoana ara-jeografika ny fandraisan'anjaran'ireo mpisehatra samihafa. Ankoatra izany, ny vokatry ny fanohanana nataon'ny PADDI ao amin'ilay faritra voafidy dia haseho amin'ny antsipiriany kokoa.",

    p4: "Etsy an-daniny, ankoatra ny fizarana vaovao, ny rafitra dia afaka mamokatra fanadihadiana manokana mifototra amin'ireo angona ampidirin'ny mpampiasa. Afaka mamorona vinavina, fanadihadiana ary torolalana ho an'ny fanapahan-kevitra ihany koa izy.",

    p5: "Ny Rafitra Fampahalalana dia ahitana ireo singa asehon'ny hazo etsy ankavanana.",

    env: "Tontolo iainana",
    eco: "Toekarena",
    soc: "Fiarahamonina",
    cadre: "Rafitra stratejika",
    projet: "Tetikasa fampandrosoana",
    guide: "Torolàlana",
    guide2: "fampiasana",
    contact: "Fifandraisana",
  },
};

export default function Home() {
  const [lang, setLang] = useState<"fr" | "mg">("fr");
  const t = text[lang];
  const navigate = useNavigate();

  const open = (module: string) => {
    switch (module) {
      case "paddi":
        navigate("/dashboard", {
          state: { module: "paddi" },
        });
        break;
  
      case "environnement":
        navigate("/dashboard/analyse-feux", {
          state: { module: "environnement" },
        });
        break;
  
      case "cadre":
        navigate("/dashboard/analyse", {
          state: { module: "cadre" },
        });
        break;
  
      case "societe":
        navigate("/dashboard/analyse-social", {
          state: { module: "societe" },
        });
        break;
  
      case "economie":
        navigate("/dashboard/analyse-economie", {
          state: { module: "economie" },
        });
        break;
  
      case "projets":
        navigate("/dashboard/projets", {
          state: { module: "projets" },
        });
        break;
  
      default:
        navigate("/dashboard", {
          state: { module: "paddi" },
        });
    }
  };

  return (
    <div className="home-page">

      {/* IMAGE DE FOND */}
      <img src={bg} alt="PADDI" className="home-bg" />


      {/* TITRE */}
      <div className="title">
        <h1>{t.title1}</h1>
        <h1>{t.title2}</h1>
      </div>

      {/* LANGUE */}
      <div className="lang">
        <button
          className={lang === "mg" ? "active" : ""}
          onClick={() => setLang("mg")}
        >
          MG
        </button>

        <button
          className={lang === "fr" ? "active" : ""}
          onClick={() => setLang("fr")}
        >
          FR
        </button>
      </div>

      {/* CARTE TEXTE */}
      <div className="info-card">
        <div className="info-header">
          <div className="info-icon">i</div>
          <h2>{t.presentation}</h2>
        </div>

        <p>{t.p1}</p>
        <p>{t.p2}</p>
        <p>{t.p3}</p>
        <p>{t.p4}</p>

        <p className="bold">{t.p5}</p>
      </div>

      {/* PLAQUE PADDI */}
      <button className="paddi-btn" onClick={() => open("paddi")}>
        PADDI
      </button>

      {/* ===== FEUILLES CLIQUABLES ===== */}

        <button
          className="leaf env"
          onClick={() => open("environnement")}
          title="Ouvrir Environnement"
        >
          <Leaf size={30} strokeWidth={2.2} />
          <span>{t.env}</span>
        </button>

        <button
          className="leaf eco"
          onClick={() => open("economie")}
          title="Ouvrir Économie"
        >
          <BarChart3 size={30} strokeWidth={2.2} />
          <span>{t.eco}</span>
        </button>

        <button
          className="leaf soc"
          onClick={() => open("societe")}
          title="Ouvrir Société"
        >
          <Users size={30} strokeWidth={2.2} />
          <span>{t.soc}</span>
        </button>

        <button
          className="leaf cadre"
          onClick={() => open("cadre")}
          title="Ouvrir Cadre stratégique"
        >
          <Target size={30} strokeWidth={2.2} />
          <span>{t.cadre}</span>
        </button>

        <button
          className="leaf proj"
          onClick={() => open("projets")}
          title="Ouvrir Projets de développement"
        >
          <Cog size={30} strokeWidth={2.2} />
          <span>{t.projet}</span>
        </button>

      {/* BOUTONS BAS */}
      <button className="bottom guide" onClick={() => open("guide")}>
        <BookOpen size={32} />
        <div>
          <strong>{t.guide}</strong>
          <small>{t.guide2}</small>
        </div>
      </button>

      <button className="bottom contact" onClick={() => open("contact")}>
        <Phone size={32} />
        <div>
        <strong>{t.contact}</strong>
        </div>
      </button>

    </div>
  );
}
