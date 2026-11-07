import React from 'react';
import SuiviDashboard from './SuiviDashboard';

const config = {
  title: 'Suivi des superficies aménagées durablement',
  themes: ['agropastoral', 'forestier'],
  cible: 110000, debut: 2025, fin: 2030,
  enonce: 'Sur 110 000 ha, des pratiques agropastorales et forestières durables sont appliquées.',
  donuts: [['theme_label', 'Part par type d’aménagement (ha)'], ['pratique_cat', 'Répartition par type de pratique (ha)']],
  extras: [],
};

export default function SuiviAmenagementGlobal() {
  return <SuiviDashboard config={config} />;
}
