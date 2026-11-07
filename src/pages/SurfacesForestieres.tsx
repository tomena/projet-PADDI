import React from 'react';
import SuiviDashboard from './SuiviDashboard';
import type { DashboardConfig } from './SuiviDashboard';

const config: DashboardConfig = {
  titleKey: 'foret',
  themes: ['forestier'],
  cible: 70000, debut: 2025, fin: 2030,
  enonceKey: 'foret',
  donuts: ['type_terrain', 'pratique_cat'],
  extras: [
    { key: 'cep', flag: 'is_cep', icon: 'cep' },
    { key: 'feu', flag: 'is_pare_feu', icon: 'feu' },
  ],
};

export default function SurfacesForestieres() {
  return <SuiviDashboard config={config} />;
}
