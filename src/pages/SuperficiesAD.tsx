import React from 'react';
import SuiviDashboard from './SuiviDashboard';
import type { DashboardConfig } from './SuiviDashboard';

const config: DashboardConfig = {
  titleKey: 'global',
  themes: ['agropastoral', 'forestier'],
  cible: 110000, debut: 2025, fin: 2030,
  enonceKey: 'global',
  donuts: ['theme_label', 'pratique_cat'],
  extras: [
    { key: 'cep', flag: 'is_cep', icon: 'cep' },
    { key: 'feu', flag: 'is_pare_feu', icon: 'feu' },
  ],
};

export default function SuiviAmenagementGlobal() {
  return <SuiviDashboard config={config} />;
}
