import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useTheme, ThemeToggle } from "../context/ThemeContext";

import {
  LayoutDashboard, BarChart3, Flame, Trees, Users, Globe2, Landmark, MapPinned,
  Library, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Home,
  FolderKanban, Database, Briefcase, DollarSign, Gavel, Wheat, Activity, Store,
  Wallet, CalendarCheck, LogOut, Menu, X, ShieldAlert, Mountain,TrendingUp, Calculator,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* =====================================================================
   TEXTES
   ===================================================================== */

const sidebarTxt = {
  fr: {
    home: "Accueil",
    subtitle: "Programme d'Appui au Développement Durable et Intégré",
    generalView: "Vue générale",
    paddiIndicator: "Indicateur du PADDI+",

    managementSystem: "Système de gestion",
    burnedAreas: "Superficies brûlées",
    municipalBudgets: "Budgets Communaux",
    monitoringSystem: "Système de suivi",
    communityMeasures: "Mesures Communautaires",
    cosapDecision: "Décision des COSAP",
    regionalMeasures: "Mesures régionales",

    landUsePlanning: "Aménagement du territoire",
    developedArea: "Superficie aménagée",
    beneficiary: "Bénéficiaire",
    agroPastoralAreas: "Surfaces Agropastorales",
    forestAreas: "Surfaces Forestières",
    producersWithIncome: "Producteurs avec revenus",
    microEnterprises: "Micro-entreprises",

    costMonitoring: "Suivi des coûts",
    annualActivityMonitoring: "Suivi des activités annuelles",

    library: "Bibliothèque",
    economyDiagnostic: "Diagnostic des secteurs",
    investmentSimulator: "Simulateur d'investissement",
    territoryDiagnostic: "Diagnostic des territoires",
    priorityPlanner: "Planificateur de priorités",

    fireAnalysis: "Superficie brûlée",
    deforestation: "Déforestation",
    environment: "Environnement",
    burnedZonesMap: "Cartographie des zones brûlées",
    territorialAnalysis: "Analyse territoriale",

    territorialSynthesis: "Synthèse territoriale",

    socialIndicators: "Indicateurs sociaux",
    socioeconomic: "Sociaux-économique",

    localEconomy: "Économie locale",
    areaMonitoring: "Suivi de superficie",

    pressureZones: "Points de feux",

    quit: "Quitter",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    collapse: "Réduire le menu",
    expand: "Agrandir le menu",
  },

  mg: {
    home: "Tongasoa",
    subtitle: "Fandaharanasa fanohanana ny fampandrosoana maharitra sy mitambatra",
    generalView: "Fijery ankapobeny",
    paddiIndicator: "Tondro PADDI+",

    managementSystem: "Rafitra fitantanana",
    burnedAreas: "Velaran-tany may",
    municipalBudgets: "Tetibolan'ny Kaominina",
    monitoringSystem: "Rafitra fanaraha-maso",
    communityMeasures: "Fepetra raisin'ny vondrom-piarahamonina",
    cosapDecision: "Fanapahan-kevitry ny COSAP",
    regionalMeasures: "Fepetra isam-paritra",

    landUsePlanning: "Fanajariana ny faritany",
    developedArea: "Velaran-tany voalamina",
    beneficiary: "Mpahazo tombontsoa",
    agroPastoralAreas: "Velaran-tany fambolena sy fiompiana",
    forestAreas: "Velaran-tany misy ala",
    producersWithIncome: "Mpamokatra manana fidiram-bola",
    microEnterprises: "Orinasa madinika",

    costMonitoring: "Fanaraha-maso ny fandaniana",
    annualActivityMonitoring: "Fanaraha-maso ny asa isan-taona",

    library: "Tranomboky",
    economyDiagnostic: "Fanombanana ny sehatra",
    investmentSimulator: "Simulatera fampiasam-bola",
    territoryDiagnostic: "Fanombanana ny faritany",
    priorityPlanner: "Mpandrafitra laharam-pahamehana",

    fireAnalysis: "Faritra may",
    deforestation: "Fandripahana ala",
    environment: "Tontolo iainana",
    burnedZonesMap: "Sarintanin'ny faritra may",
    territorialAnalysis: "Famakafakana ny faritany",

    socialIndicators: "Tondro ara-tsosialy",
    socioeconomic: "Ara-tsosialy sy ara-toekarena",

    localEconomy: "Toekarena eo an-toerana",

    pressureZones: "Tebok'afo",

    quit: "Hiala",
    openMenu: "Sokafy ny menio",
    closeMenu: "Akatony ny menio",
    collapse: "Hahena ny menio",
    expand: "Hanitatra ny menio",
  },

  en: {
    home: "Home",
    subtitle: "Support Programme for Sustainable and Integrated Development",
    generalView: "Overview",
    paddiIndicator: "PADDI+ Indicators",

    managementSystem: "Management System",
    burnedAreas: "Burned Areas",
    municipalBudgets: "Municipal Budgets",
    monitoringSystem: "Monitoring System",
    communityMeasures: "Community Measures",
    cosapDecision: "COSAP Decisions",
    regionalMeasures: "Regional Measures",

    landUsePlanning: "Land Use Planning",
    developedArea: "Developed Area",
    beneficiary: "Beneficiary",
    agroPastoralAreas: "Agropastoral Areas",
    forestAreas: "Forest Areas",
    producersWithIncome: "Producers with Income",
    microEnterprises: "Micro-enterprises",

    costMonitoring: "Cost Monitoring",
    annualActivityMonitoring: "Annual Activity Monitoring",

    library: "Library",
    economyDiagnostic: "Sector diagnosis",
    investmentSimulator: "Investment simulator",
    territoryDiagnostic: "Territory diagnosis",
    priorityPlanner: "Priority planner",

    fireAnalysis: "Burned Area",
    deforestation: "Deforestation",
    environment: "Environment",
    burnedZonesMap: "Burned Areas Mapping",
    territorialAnalysis: "Territorial Analysis",

    socialIndicators: "Social Indicators",
    socioeconomic: "Socio-economic",

    localEconomy: "Local Economy",

    pressureZones: "Fire spots",

    quit: "Quit",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    collapse: "Collapse menu",
    expand: "Expand menu",
  },

  de: {
    home: "Startseite",
    subtitle: "Programm zur Unterstützung einer nachhaltigen und integrierten Entwicklung",
    generalView: "Übersicht",
    paddiIndicator: "PADDI+ Indikatoren",

    managementSystem: "Verwaltungssystem",
    burnedAreas: "Verbrannte Flächen",
    municipalBudgets: "Gemeindehaushalte",
    monitoringSystem: "Überwachungssystem",
    communityMeasures: "Maßnahmen der Gemeinschaft",
    cosapDecision: "COSAP-Entscheidung",
    regionalMeasures: "Regionale Maßnahmen",

    landUsePlanning: "Raumplanung",
    developedArea: "Erschlossene Fläche",
    beneficiary: "Begünstigte",
    agroPastoralAreas: "Agropastorale Flächen",
    forestAreas: "Waldflächen",
    producersWithIncome: "Produzenten mit Einkommen",
    microEnterprises: "Kleinstunternehmen",

    costMonitoring: "Kostenüberwachung",
    annualActivityMonitoring: "Jährliche Aktivitätsüberwachung",

    library: "Bibliothek",
    economyDiagnostic: "Sektordiagnose",
    investmentSimulator: "Investitionssimulator",
    territoryDiagnostic: "Gebietsdiagnose",
    priorityPlanner: "Prioritätenplaner",

    fireAnalysis: "Verbrannte Flächen",
    deforestation: "Entwaldung",
    environment: "Umwelt",
    burnedZonesMap: "Kartierung verbrannter Flächen",
    territorialAnalysis: "Territoriale Analyse",

    socialIndicators: "Soziale Indikatoren",
    socioeconomic: "Sozioökonomisch",

    localEconomy: "Lokale Wirtschaft",

    pressureZones: "Feuerstellen",

    quit: "Beenden",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    collapse: "Menü einklappen",
    expand: "Menü ausklappen",
  },
};

type Cle = keyof typeof sidebarTxt.fr;

/* =====================================================================
   STRUCTURE DU MENU
   Pour ajouter une page : ajouter une ligne lien(...) dans le bon module.
   ===================================================================== */

type Lien = { type: "lien"; cle: string; icone: LucideIcon; label: Cle; chemin: string };
type Groupe = { type: "groupe"; cle: string; icone: LucideIcon; label: Cle; enfants: Entree[] };
type Entree = Lien | Groupe;

const lien = (cle: string, icone: LucideIcon, label: Cle, chemin: string): Lien => ({
  type: "lien", cle, icone, label, chemin,
});
const groupe = (cle: string, icone: LucideIcon, label: Cle, enfants: Entree[]): Groupe => ({
  type: "groupe", cle, icone, label, enfants,
});

const MENUS: Record<string, Entree[]> = {
  paddi: [
    lien("vue", LayoutDashboard, "generalView", ""),
    groupe("indicateurs", FolderKanban, "paddiIndicator", [
      groupe("systeme", Database, "managementSystem", [
        lien("brulees", Flame, "burnedAreas", "superficie-brulee"),
        lien("budgets", Landmark, "municipalBudgets", "budget-communal"),
        lien("suivi", Activity, "monitoringSystem", "systeme-suivi"),
        lien("communautaires", Users, "communityMeasures", "mesures-communales"),
        lien("cosap", Gavel, "cosapDecision", "cosap-decision"),
        lien("regionales", Globe2, "regionalMeasures", "mesures-regionales"),
      ]),
      groupe("amenagement", Briefcase, "landUsePlanning", [
        lien("superficie", MapPinned, "areaMonitoring", "suivi-superficie"),
        lien("beneficiaire", Users, "beneficiary", "beneficiaire"),
        lien("revenus", DollarSign, "producersWithIncome", "revenus-producteurs"),
        lien("micro", Store, "microEnterprises", "micro-entreprises"),
      ]),
    ]),
    // Wallet = argent / dépenses ; CalendarCheck = activités réalisées dans l'année
    lien("couts", Wallet, "costMonitoring", "suivi-couts"),
    lien("annuel", CalendarCheck, "annualActivityMonitoring", "suivi-activites-annuelles"),
    lien("biblio", Library, "library", "bibliotheque"),
  ],

  environnement: [
    lien("feux", Flame, "fireAnalysis", "analyse-feux"),
    lien("zones-brulees", MapPinned, "burnedZonesMap", "zones-brulees"),
    lien("deforestation", Trees, "deforestation", "deforestation"),
    lien("pression", ShieldAlert, "pressureZones", "pression"),
    lien("territoire", Mountain, "territorialAnalysis", "analyse-territoriale"),
    lien("environnement", Globe2, "environment", "analyse-environnement"),
  ],

  cadre: [lien("synthese", BarChart3, "territorialSynthesis", "analyse")],

   societe: [
    lien("territoires", MapPinned, "territoryDiagnostic", "analyse-social"),
    lien("priorites", Users, "priorityPlanner", "analyse-social/priorites"),
    lien("socio", Globe2, "socioeconomic", "analyse-socio-economique"),
  ],

  economie: [
    lien("eco-diag", TrendingUp, "economyDiagnostic", "analyse-economie"),
    lien("eco-sim", Calculator, "investmentSimulator", "analyse-economie/simulateur"),
  ],
};

function moduleDuChemin(pathname: string): string | null {
  const nom = pathname.replace(/^\/dashboard\/?/, "").replace(/\/$/, "");
  const contient = (liste: Entree[]): boolean =>
    liste.some((e) => (e.type === "lien" ? e.chemin === nom : contient(e.enfants)));
  for (const [m, liste] of Object.entries(MENUS)) if (contient(liste)) return m;
  return null;
}

/* =====================================================================
   OUTILS
   ===================================================================== */

const CLE_PREF = "sidebar_reduite";

function lirePref() {
  try {
    return localStorage.getItem(CLE_PREF) === "1";
  } catch {
    return false;
  }
}

function ecrirePref(v: boolean) {
  try {
    localStorage.setItem(CLE_PREF, v ? "1" : "0");
  } catch {
    /* stockage indisponible : on ignore */
  }
}

function useLargeur() {
  const lire = () => (typeof window === "undefined" ? 1280 : window.innerWidth);
  const [largeur, setLargeur] = useState(lire);
  useEffect(() => {
    const f = () => setLargeur(lire());
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return largeur;
}

/* =====================================================================
   COMPOSANT
   Ordinateur (≥ 1024 px) : menu complet, réductible, préférence mémorisée
   Tablette (768-1023 px) : menu réduit en icônes, extensible
   Téléphone (< 768 px)   : menu caché, ouvert par le bouton ☰
   ===================================================================== */

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const t = sidebarTxt[lang];
  const { theme } = useTheme();

  // Module envoyé depuis Home.tsx : navigate("/dashboard", { state: { module: "paddi" } })
  const module: string = location.state?.module || moduleDuChemin(location.pathname) || "paddi";

  const largeur = useLargeur();
  const mobile = largeur < 768;
  const tablette = !mobile && largeur < 1024;

  const [prefBureau, setPrefBureau] = useState(lirePref);
  const [prefTablette, setPrefTablette] = useState(true);
  const [tiroir, setTiroir] = useState(false);
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({ indicateurs: true });

  const reduit = mobile ? false : tablette ? prefTablette : prefBureau;

  const entrees = useMemo(() => MENUS[module] ?? [], [module]);

  const estActif = (chemin: string) =>
    chemin === ""
      ? location.pathname === "/dashboard" || location.pathname === "/dashboard/"
      : location.pathname === `/dashboard/${chemin}`;

  // Le tiroir se ferme après chaque navigation et quand on quitte le mode téléphone
  useEffect(() => {
    setTiroir(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobile) setTiroir(false);
  }, [mobile]);

  // Tiroir ouvert : touche Échap pour fermer + page derrière bloquée
  useEffect(() => {
    if (!mobile || !tiroir) return;
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setTiroir(false);
    window.addEventListener("keydown", touche);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = ancien;
    };
  }, [mobile, tiroir]);

  // Ouvre automatiquement les groupes qui contiennent la page affichée
  useEffect(() => {
    const aOuvrir: string[] = [];
    const parcourir = (liste: Entree[], parents: string[]) => {
      liste.forEach((e) => {
        if (e.type === "groupe") parcourir(e.enfants, [...parents, e.cle]);
        else if (estActif(e.chemin)) aOuvrir.push(...parents);
      });
    };
    parcourir(entrees, []);
    if (aOuvrir.length) {
      setOuverts((o) => {
        const n = { ...o };
        aOuvrir.forEach((c) => (n[c] = true));
        return n;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, entrees]);

  const aller = (chemin: string) => {
    navigate(chemin === "" ? "/dashboard" : `/dashboard/${chemin}`, { state: { module } });
    setTiroir(false);
  };

  const agrandir = () => {
    if (tablette) setPrefTablette(false);
    else {
      setPrefBureau(false);
      ecrirePref(false);
    }
  };

  const basculerReduit = () => {
    if (tablette) setPrefTablette((v) => !v);
    else {
      const n = !prefBureau;
      setPrefBureau(n);
      ecrirePref(n);
    }
  };

  const basculerGroupe = (cle: string) => {
    if (reduit) {
      // menu en icônes : on l'agrandit et on ouvre le groupe cliqué
      agrandir();
      setOuverts((o) => ({ ...o, [cle]: true }));
      return;
    }
    setOuverts((o) => ({ ...o, [cle]: !o[cle] }));
  };

  const contientActif = (e: Entree): boolean =>
    e.type === "lien" ? estActif(e.chemin) : e.enfants.some(contientActif);

  const rendre = (e: Entree, niveau: number) => {
    const Icone = e.icone;
    const label = t[e.label];
    const taille = niveau === 0 ? 18 : 16;

    if (e.type === "lien") {
      const actif = estActif(e.chemin);
      return (
        <button
          key={e.cle}
          type="button"
          title={reduit ? label : undefined}
          aria-label={reduit ? label : undefined}
          aria-current={actif ? "page" : undefined}
          className={`sb-item niveau${niveau} ${actif ? "actif" : ""}`}
          onClick={() => aller(e.chemin)}
        >
          <Icone size={taille} />
          {!reduit && <span className="sb-label">{label}</span>}
        </button>
      );
    }

    const ouvert = !!ouverts[e.cle];
    return (
      <div key={e.cle}>
        <button
          type="button"
          title={reduit ? label : undefined}
          aria-label={reduit ? label : undefined}
          aria-expanded={reduit ? undefined : ouvert}
          className={`sb-item sb-groupe niveau${niveau} ${contientActif(e) ? "parent" : ""}`}
          onClick={() => basculerGroupe(e.cle)}
        >
          <Icone size={taille} />
          {!reduit && (
            <>
              <span className="sb-label">{label}</span>
              <span className="sb-chevron">
                {ouvert ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </>
          )}
        </button>
        {ouvert && !reduit && (
          <div className="sb-sous">{e.enfants.map((c) => rendre(c, niveau + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>

      {/* Téléphone : bouton pour ouvrir le menu */}
      {mobile && !tiroir && (
        <button type="button" className="sb-burger" aria-label={t.openMenu} onClick={() => setTiroir(true)}>
          <Menu size={20} />
        </button>
      )}

      {/* Téléphone : fond sombre derrière le menu ouvert */}
      {mobile && tiroir && <div className="sb-voile" onClick={() => setTiroir(false)} />}

      <aside
        className={`sb ${reduit ? "reduit" : ""} ${mobile ? "mobile" : ""} ${tiroir ? "ouvert" : ""}`}
        aria-label="Menu"
      >
        {/* ======================== LOGO ======================== */}
        <div className="sb-logobox">
          <button
            type="button"
            className="sb-collapse"
            title={mobile ? t.closeMenu : reduit ? t.expand : t.collapse}
            aria-label={mobile ? t.closeMenu : reduit ? t.expand : t.collapse}
            onClick={mobile ? () => setTiroir(false) : basculerReduit}
          >
            {mobile ? <X size={18} /> : reduit ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <div className="sb-logo">
            <img
              src={
                reduit
                  ? "/logo-paddi-icone.svg"
                  : theme === "dark"
                  ? "/logo-paddi-sombre.svg"
                  : "/logo-paddi.svg"
              }
              alt="PADDI+"
              style={{ width: reduit ? 36 : "100%", maxWidth: 200, display: "block" }}
            />
          </div>
        </div>

        {/* ======================== MENU ======================== */}
        <nav className="sb-nav">
          <button
            type="button"
            title={reduit ? t.home : undefined}
            aria-label={reduit ? t.home : undefined}
            aria-current={location.pathname === "/" ? "page" : undefined}
            className={`sb-item niveau0 ${location.pathname === "/" ? "actif" : ""}`}
            onClick={() => navigate("/")}
          >
            <Home size={18} />
            {!reduit && <span className="sb-label">{t.home}</span>}
          </button>

          {entrees.map((e) => rendre(e, 0))}
        </nav>

        {/* ======================== QUITTER ===================== */}
        <div className="sb-pied">
          <div style={{ marginBottom: 8 }}>
            <ThemeToggle compact={reduit} />
          </div>
          <button
            type="button"
            className="sb-quitter"
            title={reduit ? t.quit : undefined}
            aria-label={t.quit}
            onClick={() => navigate("/")}
          >
            <LogOut size={18} />
            {!reduit && <span className="sb-label">{t.quit}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* =====================================================================
   STYLES (feuille de style locale : les media queries sont impossibles en inline)
   ===================================================================== */

const CSS = `
.sb{
  width:240px;flex:0 0 auto;height:100vh;height:100dvh;padding:14px;display:flex;flex-direction:column;
  background:transparent;border-right:1px solid var(--border-soft);color:var(--text);overflow:hidden;
  box-sizing:border-box;transition:width .25s ease;font-family:inherit;
}
.sb *{box-sizing:border-box}
.sb.reduit{width:78px}
.sb button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:left}

/* ---- Logo ---- */
.sb-logobox{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border-soft)}
.sb-collapse{width:36px;height:36px;border-radius:10px;display:flex !important;align-items:center;justify-content:center;
  background:var(--surface) !important;border:1px solid var(--border) !important;margin-bottom:10px;
  transition:background .15s}
.sb-collapse:hover{background:var(--surface-2) !important}
.sb-logo{font-size:20px;font-weight:800;letter-spacing:1px;color:var(--text)}
.sb-logo.petit{font-size:14px;letter-spacing:.5px}
.sb-subtitle{font-size:11px;margin-top:6px;color:var(--text-3);line-height:1.4}

/* ---- Liste des pages ---- */
.sb-nav{flex:1;min-height:0;overflow-y:auto;padding:0 4px 6px 6px;display:flex;flex-direction:column;gap:3px;
  overscroll-behavior:contain}
.sb-item{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:9px 10px;border-radius:10px;
  font-size:13px;font-weight:600;color:var(--text-2);transition:background .15s,color .15s}
.sb-item:hover{background:var(--hover)}
.sb-item:focus-visible,.sb-collapse:focus-visible,.sb-quitter:focus-visible,.sb-burger:focus-visible{
  outline:2px solid var(--accent);outline-offset:-2px}
.sb-item.actif{color:var(--accent);background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent)}
.sb-item.parent{color:var(--accent)}
.sb-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-chevron{display:flex;opacity:.7;margin-left:auto}
.sb.reduit .sb-item{justify-content:center;padding:9px 0}

/* sous-menus */
.sb-sous{margin:3px 0 6px 10px;padding-left:10px;border-left:1px solid var(--border);display:flex;
  flex-direction:column;gap:3px;animation:sbFondu .15s ease}
.sb-item.sb-groupe.niveau1{background:var(--surface-2);border:1px solid var(--border-soft)}
.sb-item.niveau1:not(.sb-groupe),.sb-item.niveau2{font-size:12.8px;font-weight:500;color:var(--text-2);min-height:36px;padding:7px 10px}
.sb-item.niveau1.actif,.sb-item.niveau2.actif{color:var(--accent);font-weight:600}

/* ---- Bas du menu ---- */
.sb-pied{padding-top:10px;margin-top:6px;border-top:1px solid var(--border-soft)}
.sb-quitter{display:flex !important;align-items:center;gap:10px;width:100%;padding:11px 12px;border-radius:10px;
  border:1px solid rgba(220,38,38,.28) !important;color:var(--danger) !important;font-size:13px;font-weight:600;
  background:transparent !important;transition:background .15s}
.sb-quitter:hover{background:var(--danger-soft) !important}
.sb.reduit .sb-quitter{justify-content:center;padding:11px 0}

/* ---- Téléphone : menu en tiroir ---- */
.sb-burger{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));left:10px;z-index:1500;width:42px;height:42px;
  border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;
  display:grid;place-items:center;box-shadow:0 2px 10px rgba(0,0,0,.15)}
.sb-voile{position:fixed;inset:0;z-index:1999;background:var(--overlay);animation:sbFondu .2s ease}
.sb.mobile{position:fixed;top:0;left:0;bottom:0;z-index:2000;width:min(300px,86vw);background:var(--surface);
  padding-top:calc(14px + env(safe-area-inset-top,0px));padding-bottom:calc(14px + env(safe-area-inset-bottom,0px));
  transform:translateX(-105%);visibility:hidden;transition:transform .25s ease,visibility 0s .25s}
.sb.mobile.ouvert{transform:none;visibility:visible;box-shadow:0 0 40px rgba(15,23,42,.3);
  transition:transform .25s ease,visibility 0s}

/* écrans tactiles : zones de toucher plus grandes */
@media (pointer:coarse){
  .sb-item{min-height:44px}
  .sb-item.niveau1:not(.sb-groupe),.sb-item.niveau2{min-height:42px}
}

@keyframes sbFondu{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){
  .sb,.sb *,.sb-voile{transition:none !important;animation:none !important}
}
`;
