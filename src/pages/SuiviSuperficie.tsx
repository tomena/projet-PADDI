import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, Wheat, Trees, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SuiviDashboard from './SuiviDashboard';
import type { DashboardConfig } from './SuiviDashboard';
import { useLanguage } from '../context/LanguageContext';

type PageKey = 'global' | 'agro' | 'foret';

const ORDER: PageKey[] = ['global', 'agro', 'foret'];

const ICONS: Record<PageKey, LucideIcon> = {
  global: Layers,
  agro: Wheat,
  foret: Trees,
};

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
  select: string;
  opts: Record<PageKey, string>;
};

const LABELS: Record<string, Labels> = {
  fr: {
    select: 'Type de superficie',
    opts: {
      global: 'Superficie aménagée durablement',
      agro: 'Surface agropastorale',
      foret: 'Surface forestière',
    },
  },
  mg: {
    select: 'Karazana velarana',
    opts: {
      global: 'Velarana voalamina maharitra',
      agro: 'Velarana fambolena sy fiompiana',
      foret: 'Velarana ala',
    },
  },
  en: {
    select: 'Area type',
    opts: {
      global: 'Sustainably managed area',
      agro: 'Agropastoral area',
      foret: 'Forest area',
    },
  },
  de: {
    select: 'Flächentyp',
    opts: {
      global: 'Nachhaltig bewirtschaftete Fläche',
      agro: 'Agrarpastorale Fläche',
      foret: 'Waldfläche',
    },
  },
};

const MENU_CSS = `
.sv-dd{position:relative}
.sv-h .sv-dd-btn{max-width:100%}
.sv-h .sv-dd-btn .sv-dd-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sv-dd-btn svg{flex:0 0 auto}
.sv-dd-chev{transition:transform .15s}
.sv-dd-chev.open{transform:rotate(180deg)}
.sv-dd-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:1000;min-width:100%;width:max-content;max-width:min(340px,88vw);
  background:var(--card);color:var(--txt);border:1px solid var(--line);border-radius:10px;padding:4px;
  box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:2px}
.sv-h .sv-opt{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;color:var(--txt);
  border:0;border-radius:8px;padding:9px 10px;font-weight:500;font-size:13px;cursor:pointer}
.sv-h .sv-opt:hover,.sv-h .sv-opt:focus-visible{background:var(--e1);outline:none}
.sv-h .sv-opt.on{color:var(--gv);font-weight:700}
.sv-h .sv-opt .sv-opt-l{flex:1}
@media(max-width:520px){.sv-dd-menu{left:0;right:auto}}
`;

function AreaMenu({
  value, onChange, labels,
}: { value: PageKey; onChange: (v: PageKey) => void; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const Current = ICONS[value];

  return (
    <div className="sv-dd" ref={ref}>
      <style>{MENU_CSS}</style>
      <button
        type="button"
        className="sv-dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.select}
        title={labels.select}
        onClick={() => setOpen((o) => !o)}
      >
        <Current size={16} />
        <span className="sv-dd-txt">{labels.opts[value]}</span>
        <ChevronDown size={16} className={`sv-dd-chev ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="sv-dd-menu" role="listbox" aria-label={labels.select}>
          {ORDER.map((k) => {
            const Icon = ICONS[k];
            const on = k === value;
            return (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={on}
                className={`sv-opt ${on ? 'on' : ''}`}
                onClick={() => { onChange(k); setOpen(false); }}
              >
                <Icon size={16} />
                <span className="sv-opt-l">{labels.opts[k]}</span>
                {on && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SuiviSuperficie() {
  const ctx: any = useLanguage() || {};
  const raw = ctx.language ?? ctx.lang ?? ctx.locale;
  const L = LABELS[typeof raw === 'string' && raw in LABELS ? raw : 'fr'];

  const [view, setView] = useState<PageKey>('global');

  return (
    // key : remet à zéro filtres, recherche et pagination à chaque changement de vue
    <SuiviDashboard
      key={view}
      config={CONFIGS[view]}
      headerExtra={<AreaMenu value={view} onChange={setView} labels={L} />}
    />
  );
}
