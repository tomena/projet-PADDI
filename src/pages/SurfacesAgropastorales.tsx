import React from 'react';
import SuiviDashboard from './SuiviDashboard';
import type { DashboardConfig } from './SuiviDashboard';

const config: DashboardConfig = {
  titleKey: 'agro',
  themes: ['agropastoral'],
  cible: 40000, debut: 2025, fin: 2030,
  enonceKey: 'agro',
  donuts: ['type_terrain', 'pratique_cat'],
  extras: [
    { key: 'cep', flag: 'is_cep', icon: 'cep' },
    { key: 'feu', flag: 'is_pare_feu', icon: 'feu' },
  ],
};

export default function SurfacesAgropastorales() {
  return <SuiviDashboard config={config} />;
}
