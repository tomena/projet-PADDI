import React, { useState } from 'react';
import SuiviDashboard from './SuiviDashboard';
import type { DashboardConfig } from './SuiviDashboard';
import { useLanguage } from '../context/LanguageContext';

type PageKey = 'global' | 'agro' | 'foret';

const ORDER: PageKey[] = ['global', 'agro', 'foret'];

const extras: DashboardConfig['extras'] = [
  { key: 'cep', flag: 'is_cep', icon: 'cep' },
  { key: 'feu', flag: 'is_pare_feu', icon: 'feu' },
];

const CONFIGS: Record<PageKey, DashboardConfig> = {
  global: {
    titleKey: 'global',
    enonceKey: 'global',
    themes: ['agropastoral', 'forestier'],
    cible: 110000,
    debut: 2025,
    fin: 2030,
    donuts: ['theme_label', 'pratique_cat'],
    extras,
  },
  agro: {
    titleKey: 'agro',
    enonceKey: 'agro',
    themes: ['agropastoral'],
    cible: 40000,
    debut: 2025,
    fin: 2030,
    donuts: ['type_terrain', 'pratique_cat'],
    extras,
  },
  foret: {
    titleKey: 'foret',
    enonceKey: 'foret',
    themes: ['forestier'],
    cible: 70000,
    debut: 2025,
    fin: 2030,
    donuts: ['type_terrain', 'pratique_cat'],
    extras,
  },
};

type Labels = {
  page: string;
  select: string;
  opts: Record<PageKey, string>;
};

const LABELS: Record<string, Labels> = {
  fr: {
    page: 'Suivi de superficie',
    select: 'Type de superficie',
    opts: {
      global: 'Superficie aménagée durablement',
      agro: 'Surface agropastorale',
      foret: 'Surface forestière',
    },
  },
  mg: {
    page: 'Fanaraha-maso ny velarana',
    select: 'Karazana velarana',
    opts: {
      global: 'Velarana voalamina maharitra',
      agro: 'Velarana fambolena sy fiompiana',
      foret: 'Velarana ala',
    },
  },
  en: {
    page: 'Area monitoring',
    select: 'Area type',
    opts: {
      global: 'Sustainably managed area',
      agro: 'Agropastoral area',
      foret: 'Forest area',
    },
  },
  de: {
    page: 'Flächenmonitoring',
    select: 'Flächentyp',
    opts: {
      global: 'Nachhaltig bewirtschaftete Fläche',
      agro: 'Agrarpastorale Fläche',
      foret: 'Waldfläche',
    },
  },
};

export default function SuiviSuperficie() {
  const ctx: any = useLanguage() || {};
  const raw = ctx.language ?? ctx.lang ?? ctx.locale;
  const L = LABELS[typeof raw === 'string' && raw in LABELS ? raw : 'fr'];

  const [view, setView] = useState<PageKey>('global');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: '10px clamp(12px,2vw,24px)',
          background: 'var(--card, #fff)',
          borderBottom: '1px solid var(--line, #e5e7eb)',
          color: 'var(--txt, #374151)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--gv, #1b5e20)' }}>
          {L.page}
        </h3>
        <span style={{ flex: 1 }} />
        <label htmlFor="suivi-view" style={{ fontSize: 13, fontWeight: 600 }}>
          {L.select}
        </label>
        <select
          id="suivi-view"
          value={view}
          onChange={(e) => setView(e.target.value as PageKey)}
          style={{
            height: 38,
            minWidth: 260,
            maxWidth: '100%',
            padding: '0 10px',
            borderRadius: 8,
            border: '1px solid var(--bd, #d1d5db)',
            background: 'var(--card, #fff)',
            color: 'var(--txt, #374151)',
          }}
        >
          {ORDER.map((k) => (
            <option key={k} value={k}>
              {L.opts[k]}
            </option>
          ))}
        </select>
      </div>

      {/* key : remet à zéro filtres, recherche et pagination à chaque changement de vue */}
      <SuiviDashboard key={view} config={CONFIGS[view]} />
    </div>
  );
}
