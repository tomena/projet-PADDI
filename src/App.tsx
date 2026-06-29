import React, { useState } from 'react';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Analyse from './pages/Analyse';
import AnalyseEnvironnement from './pages/AnalyseEnvironnement';
import InsertionDonnees from './pages/InsertionDonnees';
import Pression from './pages/Pression';
import BudgetCommunaux from './pages/BudgetCommunaux';
import RevenusProducteurs from './pages/RevenusProducteurs';
import SuiviCouts from './pages/SuiviCouts';
import SuiviActivitesAnnuelles from './pages/SuiviActivitesAnnuelles';
import SuperficiesBrulees from './pages/SuperficiesBrulees';
import SystemeSuivi from './pages/SystemeSuivi';
import MesuresCommunales from './pages/MesuresCommunales';
import SurfacesAgropastorales from './pages/SurfacesAgropastorales';
import SurfacesForestieres from './pages/SurfacesForestieres';
import SuperficiesAD from './pages/SuperficiesAD';
import MicroEntreprise from './pages/MicroEntreprise';
import Beneficiaires from './pages/Beneficiaires';
import DecisionCOSAP from './pages/DecisionCOSAP';
import MesureRegionale from './pages/MesureRegionale';


export default function App() {
  const [page, setPage] = useState('dashboard-general');

  const [data] = useState({
    hommes: 4000,
    femmes: 6000,
    enfants: 10000,
    superficie: 5000,
  });

  return (
    <div style={styles.layout}>
      <Sidebar setPage={setPage} />

      <div style={styles.content}>
        {page === 'dashboard-general' && <Dashboard data={data} />}
        {page === 'dashboard-feux' && <h1>🔥 Feux</h1>}
        {page === 'dashboard-deforestation' && <h1>🌳 Déforestation</h1>}
        {page === 'dashboard-ecosysteme' && <h1>🌿 Écosystèmes</h1>}
        {page === 'analyse' && <Analyse />}
        {page === 'analyse-environnement' && <AnalyseEnvironnement />}
        {page === 'insertion-donnees' && <InsertionDonnees />}
        {page === 'pression' && <Pression />}
        {page === 'budget-communal' && <BudgetCommunaux />}
        {page === 'revenus-producteurs' && <RevenusProducteurs />}
        {page === 'suivi-couts' && <SuiviCouts />}
        {page === 'suivi-activites-annuelles' && <SuiviActivitesAnnuelles />}
        {page === 'superficie-brulee' && <SuperficiesBrulees />}
        {page === 'systeme-suivi' && <SystemeSuivi />}
        {page === 'mesures-communales' && <MesuresCommunales />}
        {page === 'surface-agro' && <SurfacesAgropastorales />}
        {page === 'surface-forestiere' && <SurfacesForestieres />}
        {page === 'sad' && <SuperficiesAD />}
        {page === 'micro-entreprises' && <MicroEntreprise />}
        {page === 'beneficiaire' && <Beneficiaires />}
        {page === 'cosap-decision' && <DecisionCOSAP />}
        {page === 'mesures-regionales' && <MesureRegionale />}
        
      </div>
    </div>
  );
}

const styles: any = {
  layout: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#f3f4f6',
  },

  content: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
};
