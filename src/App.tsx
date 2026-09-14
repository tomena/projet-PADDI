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
import SurfacesAgropastorales from "./pages/SurfacesAgropastorales";
import SurfacesForestieres from "./pages/SurfacesForestieres";
import SuperficiesAD from "./pages/SuperficiesAD";
import MicroEntreprise from "./pages/MicroEntreprise";
import Beneficiaires from "./pages/Beneficiaires";
import DecisionCOSAP from "./pages/DecisionCOSAP";
import MesureRegionale from "./pages/MesureRegionale";

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
      <Route path="/dashboard" element={<DashboardLayout />}>
        {/* Tableau de bord */}
        <Route index element={<Dashboard data={data} />} />
        <Route path="analyse-feux" element={<AnalyseFeux />} />
        <Route path="deforestation" element={<Deforestation />} />

        {/* Analyses */}
        <Route path="analyse" element={<Analyse />} />
        <Route
          path="analyse-environnement"
          element={<AnalyseEnvironnement />}
        />

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
        <Route
          path="surface-agro"
          element={<SurfacesAgropastorales />}
        />
        <Route
          path="surface-forestiere"
          element={<SurfacesForestieres />}
        />

        {/* Autres */}
        <Route path="sad" element={<SuperficiesAD />} />
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
