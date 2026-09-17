import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

import {
  BookOpen, Phone, BarChart3, Leaf, Users, Target, Cog,} from "lucide-react";

import bg from "../assets/home-bg.png";
import "./Home.css";

const text = {
  fr: {
    title1: "Système d'Information pour un",
    title2: "Développement Durable et Intégré",

    presentation:
      "Un système d’information au service d’un développement durable et intégré",
    p1: "Ce système d’information constitue un outil d’aide à la décision et d’orientation des actions en faveur du développement durable et intégré des territoires à Madagascar. Il met à disposition des acteurs une information centralisée, structurée et territorialisée, permettant de mieux comprendre les dynamiques environnementales, économiques et sociales et d’appuyer les décisions.",
    p2: "Le système couvre les territoires d’ancrage du programme autour de 7 aires protégées :",

    territories: [
      "Région DIANA : Montagne d’Ambre, Ankarana et Analamerana ;",
      "Région Boeny : Ankarafantsika ;",
      "Région Anôsy : Andohahela ;",
      "Région Atsimo Atsinanana : Befotaka-Midongy;",
      "Région Amoron’i Mania et Vakinakaratra: Marolambo.",
    ],

    p3: "L’information peut être consultée à différentes échelles, pour mieux comprendre les territoires, de la Région jusqu’à la Commune, afin de répondre au plus près aux besoins des utilisateurs.",
    p4: "Le système rassemble en un même espace :",

    features: [
      "des données environnementales, économiques et sociales ;",
      "les documents et cadres de planification existants ;",
      "une visualisation spatialisée des interventions menées par les différents acteurs ;",
      "les résultats et réalisations des appuis du PADDI, présentés de manière détaillée sur les territoires concernés.",
    ],

    p5: "Il offre ainsi une vision globale et actualisée du territoire, facilite le partage d’informations et favorise une meilleure coordination entre les acteurs.",
    p6: "Au-delà du simple partage d’informations, le système permet également de valoriser les données disponibles pour produire des analyses spécifiques.",
    p7: "À partir des informations renseignées par les utilisateurs, il pourra notamment contribuer à générer des analyses, des projections et des éléments d’orientation, afin d’aider les décideurs et les acteurs du territoire à mieux anticiper les évolutions, à orienter leurs interventions et à agir durablement.",

    env: "Environnement",
    eco: "Économie",
    soc: "Société",
    cadre: "Cadre stratégique",
    projet: "Projets de développement",
    guide: "Guide",
    contact: "Contact",
  },

  mg: {
    title1: "Rafitra fampahalalana ho an’ny",
    title2: "fampandrosoana maharitra sy mitambatra",

    presentation:
      "Rafitra fampahalalana ho an’ny fampandrosoana maharitra sy mitambatra",

    p1: "Ity rafitra fampahalalana ity dia fitaovana manampy amin’ny fandraisana fanapahan-kevitra sy amin’ny fandrindrana ireo hetsika ho an’ny fampandrosoana maharitra sy mitambatra ny faritra eto Madagasikara. Manolotra vaovao voaangona, voalamina ary mifanaraka amin’ny toerana ho an’ireo mpisehatra izy, ka manampy amin’ny fahatakarana tsara kokoa ny fivoaran’ny tontolo iainana, ny toekarena ary ny fiarahamonina, ary manohana ny fandraisana fanapahan-kevitra.",
    p2: "Mandrakotra ireo faritra iasan’ny fandaharanasa manodidina ireo faritra arovana 7 voafantina ity rafitra ity:",

    territories: [
      "Faritra DIANA : Montagne d’Ambre, Ankarana ary Analamerana ;",
      "Faritra Boeny : Ankarafantsika ;",
      "Faritra Anôsy : Andohahela ;",
      "Faritra Atsimo Atsinanana : Befotaka-Midongy;",
      "Faritra Amoron’i Mania sy Vakinakaratra : Marolambo.",
    ],

    p3: "Azo jerena amin’ny ambaratonga samihafa ny vaovao, manomboka amin’ny Faritra ka hatrany amin’ny Kaominina, mba hahafahana mahatakatra tsara kokoa ny faritra sy hamaliana akaiky kokoa ny filàn’ireo mpampiasa.",
    p4: "Atambatr’ity rafitra ity ao anatin’ny sehatra iray ihany:",

    features: [
      "ireo angon-drakitra momba ny tontolo iainana, ny toekarena ary ny fiarahamonina ;",
      "ireo antontan-taratasy sy rafitra fandrindrana efa misy ;",
      "fanehoana ara-jeografika ireo hetsika sy fandraisana anjara ataon’ireo mpisehatra samihafa ;",
      "ireo vokatra sy zava-bita vokatry ny fanohanana nataon’ny PADDI, izay aseho amin’ny antsipiriany amin’ireo faritra voakasika.",
    ],

    p5: "Noho izany, manome topimaso ankapobeny sy havaozina momba ny faritra ity rafitra ity, manamora ny fifampizarana vaovao ary manampy amin’ny fanatsarana ny fandrindrana eo amin’ireo mpisehatra.",
    p6: "Ankoatra ny fifampizarana vaovao fotsiny, dia ahafahan’ny rafitra manome lanja ireo angon-drakitra misy ihany koa mba hamokarana fanadihadiana manokana.",
    p7: "Miorina amin’ireo vaovao ampidirin’ny mpampiasa, dia afaka manampy amin’ny famokarana fanadihadiana, vinavina ary torolalana ity rafitra ity, mba hanampiana ireo mpandray fanapahan-kevitra sy ireo mpisehatra ao amin’ny faritra hahita mialoha kokoa ny fiovana, handrindra ny fandraisany andraikitra ary hiasa ho an’ny fampandrosoana maharitra.",

    env: "Tontolo iainana",
    eco: "Toekarena",
    soc: "Fiarahamonina",
    cadre: "Rafitra stratejika",
    projet: "Tetikasa fampandrosoana",
    guide: "Torolàlana",
    contact: "Fifandraisana",
  },

  en: {
    title1: "Information system serving",
    title2: "sustainable and integrated development",

    presentation:
      "An information system serving sustainable and integrated development",

    p1: "This information system is a decision-support and action-orientation tool designed to promote sustainable and integrated development across territories in Madagascar. It provides stakeholders with centralized, structured and territorially referenced information, helping them better understand environmental, economic and social dynamics and supporting decision-making.",
    p2: "The system covers the programme’s intervention territories around 7 protected areas:",

    territories: [
      "DIANA Region: Montagne d’Ambre, Ankarana and Analamerana;",
      "Boeny Region: Ankarafantsika;",
      "Anôsy Region: Andohahela;",
      "Atsimo Atsinanana Region: Befotaka-Midongy;",
      "Amoron’i Mania and Vakinakaratra Region: Marolambo.",
    ],

    p3: "Information can be consulted at different geographical scales, from the Region down to the Commune level, in order to better understand the territories and respond as closely as possible to users’ needs.",
    p4: "The system brings together in a single space:",

    features: [
      "environmental, economic and social data;",
      "existing planning documents and frameworks;",
      "a spatialized visualization of interventions carried out by the different stakeholders;",
      "the results and achievements of PADDI support activities, presented in detail for the territories concerned.",
    ],

    p5: "It therefore provides a comprehensive and up-to-date view of the territory, facilitates information sharing and promotes better coordination among stakeholders.",
    p6: "Beyond simply sharing information, the system also enables available data to be used to produce specific analyses.",
    p7: "Based on information entered by users, the system can contribute to generating analyses, projections and guidance to help decision-makers and territorial stakeholders better anticipate changes, guide their interventions and act sustainably.",

    env: "Environment",
    eco: "Economy",
    soc: "Society",
    cadre: "Strategic Framework",
    projet: "Development Projects",
    guide: "User Guide",
    contact: "Contact",
  },

  de: {
    title1: "Informationssystem im Dienste einer",
    title2: "nachhaltigen und integrierten Entwicklung",

    presentation:
      "Ein Informationssystem im Dienste einer nachhaltigen und integrierten Entwicklung",

    p1: "Dieses Informationssystem dient als Instrument zur Unterstützung von Entscheidungen und zur Orientierung von Maßnahmen für eine nachhaltige und integrierte Entwicklung der Gebiete in Madagaskar. Es stellt den Akteuren zentralisierte, strukturierte und territorial zugeordnete Informationen zur Verfügung, um ein besseres Verständnis der ökologischen, wirtschaftlichen und sozialen Dynamiken zu ermöglichen und Entscheidungsprozesse zu unterstützen.",
    p2: "Das System deckt die Gebiete ab, in denen das Programm rund um 7 Schutzgebiete tätig ist:",

    territories: [
      "Region DIANA: Montagne d’Ambre, Ankarana und Analamerana;",
      "Region Boeny: Ankarafantsika;",
      "Region Anôsy: Andohahela;",
      "Region Atsimo Atsinanana: Befotaka-Midongy;",
      "Region Amoron’i Mania und Vakinakaratra: Marolambo.",
    ],

    p3: "Die Informationen können auf verschiedenen räumlichen Ebenen abgerufen werden, von der Region bis hin zur Gemeinde. Dadurch können die Gebiete besser verstanden und die Bedürfnisse der Nutzer möglichst genau berücksichtigt werden.",
    p4: "Das System führt an einem einzigen Ort zusammen:",

    features: [
      "Umwelt-, Wirtschafts- und Sozialdaten;",
      "bestehende Planungsdokumente und Planungsrahmen;",
      "eine räumliche Darstellung der von den verschiedenen Akteuren durchgeführten Maßnahmen;",
      "die Ergebnisse und Leistungen der Unterstützungsmaßnahmen von PADDI, die für die betroffenen Gebiete detailliert dargestellt werden.",
    ],

    p5: "Damit bietet das System einen umfassenden und aktuellen Überblick über das Gebiet, erleichtert den Informationsaustausch und fördert eine bessere Koordination zwischen den Akteuren.",
    p6: "Über den reinen Informationsaustausch hinaus ermöglicht das System auch, die verfügbaren Daten zu nutzen, um spezifische Analysen zu erstellen.",
    p7: "Auf Grundlage der von den Nutzern eingegebenen Informationen kann das System insbesondere dazu beitragen, Analysen, Projektionen und Orientierungshilfen zu erstellen. Dadurch sollen Entscheidungsträger und Akteure vor Ort dabei unterstützt werden, Entwicklungen besser vorauszusehen, ihre Maßnahmen gezielter auszurichten und nachhaltig zu handeln.",

    env: "Umwelt",
    eco: "Wirtschaft",
    soc: "Gesellschaft",
    cadre: "Strategischer Rahmen",
    projet: "Entwicklungsprojekte",
    guide: "Benutzerhandbuch",
    contact: "Kontakt",
  },
};


export default function Home() {
  const { lang, setLang } = useLanguage();
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

        <button
          className={lang === "en" ? "active" : ""}
          onClick={() => setLang("en")}
        >
          EN
        </button>

        <button
          className={lang === "de" ? "active" : ""}
          onClick={() => setLang("de")}
        >
          DE
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

            <ul className="info-list">
              {t.territories.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <p>{t.p3}</p>
            <p>{t.p4}</p>

            <ul className="info-list">
              {t.features.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <p>{t.p5}</p>

            <p>{t.p6}</p>

            <p className="bold">{t.p7}</p>
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
