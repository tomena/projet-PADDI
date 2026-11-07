import React from 'react';
import SuiviDashboard from './SuiviDashboard';

const config = {
  title: '🌿 Suivi des surfaces agropastorales',
  themes: ['agropastoral'],
  cible: 40000, debut: 2025, fin: 2030,
  enonce: 'Les surfaces sur lesquelles des pratiques agricoles et d’élevage durables sont appliquées augmentent de 40 000 hectares dans les Communes partenaires.',
  donuts: [['type_terrain', 'Répartition par type de terrain (ha)'], ['pratique_cat', 'Répartition par type de pratique (ha)']],
  extras: [
    { label: 'Superficie des Champs Écoles Paysans (CEP)', flag: 'is_cep', icon: 'cep' },
    { label: 'Superficie des pare-feux', flag: 'is_pare_feu', icon: 'feu' },
  ],
};

export default function SurfacesAgropastorales() {
  return <SuiviDashboard config={config} />;
}
