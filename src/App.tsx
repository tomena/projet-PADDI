import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import DashboardLayout from "./pages/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Analyse from "./pages/Analyse";
import AnalyseFeux from "./pages/AnalyseFeux";
import Deforestation from "./pages/Deforestation";
import AnalyseEnvironnement from "./pages/AnalyseEnvironnement";
import InsertionDonnees from "./pages/InsertionDonnees";
import Pression from "./pages/Pression";
import BudgetCommunaux from "./pages/BudgetCommunaux";
import RevenusProducteurs from "./pages/RevenusProducteurs";
import SuiviCouts from "./pages/SuiviCouts";
import SuiviActivitesAnnuelles from "./pages/SuiviActivitesAnnuelles";
import SuperficiesBrulees from "./pages/SuperficiesBrulees";
import SystemeSuivi from "./pages/SystemeSuivi";
import MesuresCommunales from "./pages/MesuresCommunales";
import SuiviSuperficie from "./pages/SuiviSuperficie";
import MicroEntreprise from "./pages/MicroEntreprise";
import Beneficiaires from "./pages/Beneficiaires";
import DecisionCOSAP from "./pages/DecisionCOSAP";
import MesureRegionale from "./pages/MesureRegionale";
import ZonesBrulees from "./pages/ZonesBrulees";
import Bibliotheque from "./pages/Bibliotheque";
import AnalyseTerritoriale from "./pages/AnalyseTerritoriale";
import { FireAlertProvider } from "./context/FireAlertContext";

import EconomieDiagnostic from "./pages/EconomieDiagnostic";
import EconomieSimulateur from "./pages/EconomieSimulateur";
import SocialDiagnostic from "./pages/SocialDiagnostic";
import SocialPriorites from "./pages/SocialPriorites";

export default function App() {
  const data = {
    hommes: 4000,
    femmes: 6000,
    enfants: 10000,
    superficie: 5000,
  };

  return (
    <Routes>
      {/* ================= ACCUEIL ================= */}
      <Route path="/" element={<Home />} />

      {/* ================= ESPACE PADDI ================= */}
      <Route
        path="/dashboard"
        element={
          <FireAlertProvider>
            <DashboardLayout />
          </FireAlertProvider>
        }
      >
      
        {/* Tableau de bord */}
        <Route index element={<Dashboard data={data} />} />
      
        {/* Intervention de PADDI+ */}
        <Route path="zones-brulees" element={<ZonesBrulees />}/>
        <Route path="analyse-feux" element={<AnalyseFeux />} />
        <Route path="deforestation" element={<Deforestation />} />
      
        {/* Analyses */}
        <Route path="analyse" element={<Analyse />} />
        <Route
          path="analyse-environnement"
          element={<AnalyseEnvironnement />}
        />
        <Route path="analyse-territoriale" element={<AnalyseTerritoriale />} />

        {/* Données */}
        <Route
          path="insertion-donnees"
          element={<InsertionDonnees />}
        />
        <Route path="pression" element={<Pression />} />

        {/* Économie */}
        <Route
          path="budget-communal"
          element={<BudgetCommunaux />}
        />
        <Route
          path="revenus-producteurs"
          element={<RevenusProducteurs />}
        />
        <Route path="suivi-couts" element={<SuiviCouts />} />
        <Route
          path="suivi-activites-annuelles"
          element={<SuiviActivitesAnnuelles />}
        />

        {/* Économie */}
        <Route path="analyse-economie" element={<EconomieDiagnostic />} />
        <Route path="analyse-economie/simulateur" element={<EconomieSimulateur />} />

        {/* Société */}
        <Route path="analyse-social" element={<SocialDiagnostic />} />
        <Route path="analyse-social/priorites" element={<SocialPriorites />} />

        <Route path="budget-communal" element={<BudgetCommunaux />} />
        {/* ... le reste de vos routes Économie existantes ... */}

        {/* Environnement */}
        <Route
          path="superficie-brulee"
          element={<SuperficiesBrulees />}
        />
        <Route path="systeme-suivi" element={<SystemeSuivi />} />
        <Route
          path="mesures-communales"
          element={<MesuresCommunales />}
        />
        <Route path="suivi-superficie" element={<SuiviSuperficie />} />
        <Route
          path="micro-entreprises"
          element={<MicroEntreprise />}
        />
        <Route path="beneficiaire" element={<Beneficiaires />} />
        <Route
          path="cosap-decision"
          element={<DecisionCOSAP />}
        />
        <Route
          path="mesures-regionales"
          element={<MesureRegionale />}
        />

        {/* Bibliothèque */}
        <Route path="bibliotheque" element={<Bibliotheque />} />

        {/* Route de secours */}
        <Route
          path="*"
          element={
            <h1 style={{ color: "red" }}>
              Page introuvable
            </h1>
          }
        />
      </Route>

      {/* Route inconnue */}
      <Route
        path="*"
        element={<h1>404 - Page introuvable</h1>}
      />
    </Routes>
  );
}
