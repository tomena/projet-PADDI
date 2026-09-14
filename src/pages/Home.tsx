import { useNavigate } from "react-router-dom";
import {
  BookOpen, Phone, BarChart3, Leaf, Users, Target, Cog,} from "lucide-react";

import bg from "../assets/home-bg.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const open = (module: string) => navigate(`/${module}`);

  return (
    <div className="home-page">

      {/* IMAGE DE FOND */}
      <img src={bg} alt="PADDI" className="home-bg" />


      {/* TITRE */}
      <div className="title">
        <h1>Système d’Information pour un</h1>
        <h1>Développement Durable et Intégré</h1>
      </div>

      {/* LANGUE */}
      <div className="lang">
        <button>MG</button>
        <button className="active">FR</button>
      </div>

      {/* CARTE TEXTE */}
      <div className="info-card">
        <div className="info-header">
          <div className="info-icon">i</div>
          <h2>Présentation du système d’information</h2>
        </div>

        <p>
          Ce système d'information sert d'outil d'aide à la prise de décision,
          à l'orientation des actions à mettre en œuvre pour le développement
          durable et intégré d'un territoire bien défini à Madagascar, notamment dans les régions d'ancrage de 7 aires protégées sélectionnées, 
          telles que Montagne d'Ambre, Ankarana et Analamerana dans la région DIANA, Ankarafantsika dans la région Boeny, Andohahela dans la région Anôsy,
          Befotaka-Midongy dans la région Atsimo Atsinanana et Marolambo dans la région Amoron'i Mania.
          La territoire peut aller de la Région jusqu'au niveau des communes.
        </p>

        <p>
          Ce système est destiné à tout acteur qui œuvre ou qui s'intéresse dans le développement durable et surtout aux preneurs de décisions.
        </p>

        <p>
          D'un côté, selon le territoire sélectionné, le système d'information présente les informations centralisées,
          disponibles sur le plan environnement, le plan économie et le plan social; à cela s'ajoute les doccuments cadres existant ainsi que la présentation spatialisée des
          différentes interventions des différentes acteurs; de plus, les résultats des appuis du PADDI dans le territoire sélectionné seront présentés beaucoup plus en détails.
        </p>

        <p>
          De l'autre côté, à part le partage des informations, des analyses plus spécifiques pourront être produits par le système sur la base des données renseignées par les utilisateurs.
          Des prévisions, des analyses et des orientations peuvent être produites.
        </p>

        <p className="bold">
          Le système d’information est constitué des éléments de l’arbre
          ci-contre.
        </p>
      </div>

      {/* PLAQUE PADDI */}
      <button className="paddi-btn" onClick={() => open("dashboard")}>
        PADDI
      </button>

      {/* ===== FEUILLES CLIQUABLES ===== */}

        <button
        className="leaf env"
        onClick={() => open("environnement")}
        title="Ouvrir Environnement"
        >
        <Leaf size={30} strokeWidth={2.2} />
        <span>Environnement</span>
        </button>

        <button
        className="leaf eco"
        onClick={() => open("economie")}
        title="Ouvrir Économie"
        >
        <BarChart3 size={30} strokeWidth={2.2} />
        <span>Économie</span>
        </button>

        <button
        className="leaf soc"
        onClick={() => open("societe")}
        title="Ouvrir Société"
        >
        <Users size={30} strokeWidth={2.2} />
        <span>Société</span>
        </button>

        <button
        className="leaf cadre"
        onClick={() => open("cadre")}
        title="Ouvrir Cadre stratégique"
        >
        <Target size={30} strokeWidth={2.2} />
        <span>Cadre stratégique</span>
        </button>

        <button
        className="leaf proj"
        onClick={() => open("projets")}
        title="Ouvrir Projets de développement"
        >
        <Cog size={30} strokeWidth={2.2} />
        <span>Projets de développement</span>
        </button>

      {/* BOUTONS BAS */}
      <button className="bottom guide" onClick={() => open("guide")}>
        <BookOpen size={32} />
        <div>
          <strong>Guide</strong>
          <small>d’utilisation</small>
        </div>
      </button>

      <button className="bottom contact" onClick={() => open("contact")}>
        <Phone size={32} />
        <div>
          <strong>Contact</strong>
        </div>
      </button>

    </div>
  );
}