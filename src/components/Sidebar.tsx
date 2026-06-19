import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Flame,
  Trees,
  Leaf,
  BrainCircuit,
  Users,
  Globe2,
  Landmark,
  Map,
  MapPinned,
  Settings,
  Bot,
  Languages,
  Download,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  FolderKanban,
  Database,
  Briefcase,
  DollarSign,
  Wheat,
  Activity,
  ReceiptText,
  Store,
} from 'lucide-react';

export default function Sidebar({ setPage }: any) {
  const [open, setOpen] = useState<string | null>('dashboard');

  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState<string>('dashboard-general');

  // ✅ FIX IMPORTANT : openSub devient un objet (multi accordéon propre)
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});

  const toggleSub = (menu: string) => {
    setOpenSub((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const toggle = (menu: string) => {
    setOpen(open === menu ? null : menu);
  };

  const go = (page: string) => {
    setPage(page);
    setActive(page);
  };

  const isActive = (page: string) => active === page;

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const toggleAuth = () => {
    setIsLoggedIn(!isLoggedIn);

    if (isLoggedIn) {
      setPage('dashboard-general');
      setActive('dashboard-general');
    }
  };

  const [search, setSearch] = useState('');

  return (
    <div
      style={{
        ...styles.sidebar,
        width: collapsed ? 78 : 240,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* ================= LOGO ================= */}
      <div style={styles.logoBox}>
        {!collapsed && (
          <div style={styles.searchWrap}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Module de recherche..."
              style={styles.searchInput}
            />
          </div>
        )}
        <div
          style={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </div>

        <div style={styles.logo}>PADDI+</div>

        {!collapsed && (
          <div style={styles.subtitle}>
            Programme d'Appui au Développement Durable et Intégré
          </div>
        )}
      </div>
      <div style={styles.menuContainer}>
        {/* ================= HOME ================= */}
        <div
  style={{
    ...styles.menuItem,
    ...(isActive('home') ? styles.activeMenu : {}),
  }}
  onClick={() => go('home')}
  onMouseEnter={(e) =>
    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
  }
  onMouseLeave={(e) =>
    (e.currentTarget.style.background = 'transparent')
  }
>
  <div style={styles.menuLeft}>
    <Home size={18} />
    {!collapsed && 'Accueil'}
  </div>
</div>

        {/* ================= PADDI+ ================= */}
        <div
  style={styles.menuItem}
  onClick={() => toggle('paddi')}
>
  <div style={styles.menuLeft}>
    <FolderKanban size={18} />
    {!collapsed && 'Indicateur du PADDI+'}
  </div>

  {!collapsed && (
    <div style={styles.chevronBox}>
      {open === 'paddi' ? (
        <ChevronDown size={16} />
      ) : (
        <ChevronRight size={16} />
      )}
    </div>
  )}
</div>

        {open === 'paddi' && !collapsed && (
          <div style={styles.subMenu}>
            {/* ===== SYSTEME ===== */}
            <div style={styles.groupMenu} onClick={() => toggleSub('systeme')}>
              <div style={styles.menuLeft}>
                <Database size={16} />
                Système de gestion
              </div>

              {openSub['systeme'] ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </div>

            {openSub['systeme'] && (
              <div style={styles.innerSubMenu}>
                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('superficie-brulee')
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go('superficie-brulee')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Flame size={16} />
                  Superficies brûlées
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('budget-communal')
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go('budget-communal')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Landmark size={16} />
                  Budgets Communaux
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('systeme-suivi') ? styles.activeSubItem : {}),
                  }}
                  onClick={() => go('systeme-suivi')}
                >
                  <Activity size={16} />
                  Système de suivi
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('mesures-communales')
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go('mesures-communales')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Users size={16} />
                  Mesures Communautaires
                </div>
              </div>
            )}

            {/* ===== AMENAGEMENT ===== */}
            <div
              style={styles.groupMenu}
              onClick={() => toggleSub('amenagement')}
            >
              <div style={styles.menuLeft}>
                <Briefcase size={16} />
                Aménagement du territoire
              </div>

              {openSub['amenagement'] ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </div>

            {openSub['amenagement'] && (
              <div style={styles.innerSubMenu}>
                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('sad') ? styles.activeSubItem : {}),
                  }}
                  onClick={() => go('sad')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <MapPinned size={16} />
                  Superficie aménagée
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('beneficiaire') ? styles.activeSubItem : {}),
                  }}
                  onClick={() => go('beneficiaire')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Users size={16} />
                  Bénéficiaire
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('surface-agro') ? styles.activeSubItem : {}),
                  }}
                  onClick={() => go('surface-agro')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Wheat size={16} />
                  Surfaces Agropastorales
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('surface-forestiere')
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go('surface-forestiere')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Trees size={16} />
                  Surfaces Forestières
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('revenus-producteurs')
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go('revenus-producteurs')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <DollarSign size={16} />
                  Producteurs avec revenus
                </div>

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive('micro-entreprises')
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go('micro-entreprises')}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Store size={16} />
                  Micro-entreprises
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            ...styles.menuItem,
            ...(isActive('suivi-couts') ? styles.activeMenu : {}),
          }}
          onClick={() => go('suivi-couts')}
        >
          <div style={styles.menuLeft}>
            <ReceiptText size={18} />
            {!collapsed && 'Suivi des coûts'}
          </div>
        </div>

        <div
  style={{
    ...styles.menuItem,
    ...(isActive('suivi-activites-annuelles')
      ? styles.activeMenu
      : {}),
  }}
  onClick={() => go('suivi-activites-annuelles')}
>
  <div style={styles.menuLeft}>
    <Activity size={18} />
    {!collapsed && 'Suivi activités annuelles'}
  </div>
</div>

        {/* ================= DASHBOARD ================= */}
        <div style={styles.menuItem} onClick={() => toggle('dashboard')}>
          <div style={styles.menuLeft}>
            <LayoutDashboard size={18} />
            {!collapsed && 'Tableau de Bord'}
          </div>

          {!collapsed &&
            (open === 'dashboard' ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            ))}
        </div>

        {open === 'dashboard' && !collapsed && (
          <div style={styles.subMenu}>
            <div
              style={{
                ...styles.subItem,
                ...(isActive('dashboard-general') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('dashboard-general')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <BarChart3 size={16} />
              Vue Générale
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('dashboard-feux') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('dashboard-feux')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Flame size={16} />
              Analyse des Feux
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('dashboard-deforestation')
                  ? styles.activeSubItem
                  : {}),
              }}
              onClick={() => go('dashboard-deforestation')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Trees size={16} />
              Déforestation
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('dashboard-ecosysteme')
                  ? styles.activeSubItem
                  : {}),
              }}
              onClick={() => go('dashboard-ecosysteme')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Leaf size={16} />
              Écosystèmes
            </div>
          </div>
        )}

        {/* ================= ANALYSE ================= */}
        <div style={styles.menuItem} onClick={() => toggle('analyse')}>
          <div style={styles.menuLeft}>
            <BrainCircuit size={18} />
            {!collapsed && 'Analyses Stratégiques'}
          </div>

          {!collapsed &&
            (open === 'analyse' ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            ))}
        </div>

        {open === 'analyse' && !collapsed && (
          <div style={styles.subMenu}>
            <div
              style={{
                ...styles.subItem,
                ...(isActive('analyse') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('analyse')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <BarChart3 size={16} />
              Synthèse Territoriale
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('analyse-social') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('analyse-social')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Users size={16} />
              Indicateurs Sociaux
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('analyse-environnement')
                  ? styles.activeSubItem
                  : {}),
              }}
              onClick={() => go('analyse-environnement')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Globe2 size={16} />
              Environnement
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('analyse-economie') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('analyse-economie')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Landmark size={16} />
              Économie Locale
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('insertion-donnees') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('insertion-donnees')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <MapPinned size={16} />
              Socio-économiques
            </div>
          </div>
        )}

        {/* ================= CARTOGRAPHIE ================= */}
        <div style={styles.menuItem} onClick={() => toggle('carto')}>
          <div style={styles.menuLeft}>
            <Map size={18} />
            {!collapsed && 'Cartographie'}
          </div>

          {!collapsed &&
            (open === 'carto' ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            ))}
        </div>

        {open === 'carto' && !collapsed && (
          <div style={styles.subMenu}>
            <div
              style={{
                ...styles.subItem,
                ...(isActive('carte') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('carte')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <MapPinned size={16} />
              Intervention de PADDI+
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('pression') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('pression')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Flame size={16} />
              Zones de Pression
            </div>
          </div>
        )}

        {/* ================= PARAMÈTRES ================= */}
        <div style={styles.menuItem} onClick={() => toggle('param')}>
          <div style={styles.menuLeft}>
            <Settings size={18} />
            {!collapsed && 'Configuration'}
          </div>

          {!collapsed &&
            (open === 'param' ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            ))}
        </div>

        {open === 'param' && !collapsed && (
          <div style={styles.subMenu}>
            <div
              style={{
                ...styles.subItem,
                ...(isActive('model') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('model')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Bot size={16} />
              Intelligence Artificielle
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('language') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('language')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Languages size={16} />
              Langues
            </div>

            <div
              style={{
                ...styles.subItem,
                ...(isActive('export') ? styles.activeSubItem : {}),
              }}
              onClick={() => go('export')}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Download size={16} />
              Exportation
            </div>
          </div>
        )}

        {/* ================= LOGIN / LOGOUT ================= */}
        <div style={styles.authBox} onClick={toggleAuth}>
          <div style={styles.menuLeft}>
            <Users size={18} />
            {!collapsed && (isLoggedIn ? 'Se déconnecter' : 'Se connecter')}
          </div>

          <div
            style={{
              ...styles.authBadge,
              background: isLoggedIn ? '#dc2626' : '#059669',
            }}
          >
            {!collapsed && (isLoggedIn ? 'Logout' : 'Login')}
          </div>
        </div>
      </div>{' '}
      {/* fin menuContainer */}
    </div>
  );
}

// ===== SIDEBAR UI  =====

const styles: any = {
  sidebar: {
    width: 290,
    height: '100vh',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    background: 'transparent',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    borderRight: '1px solid rgba(0,0,0,0.06)',
    color: '#111827',
    overflow: 'hidden',
    transition: 'width 0.25s ease',
  },

  logoBox: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },

  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 1,
    color: '#111827',
  },

  subtitle: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 6,
    color: '#6b7280',
    lineHeight: 1.4,
  },

  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(0,0,0,0.06)',
    marginBottom: 10,
    transition: 'all 0.2s ease',
  },

  menuContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
    paddingLeft: 6,
  },

  menuItem: {
    padding: '10px 10px',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontWeight: 600,
    fontSize: 13,
    marginBottom: 5,
    background: 'transparent',
    color: '#374151',
    transition: 'all 0.15s ease',
  },

  activeMenu: {
    color: '#2563eb',
    background: 'rgba(37,99,235,0.06)',
    borderLeft: '3px solid #2563eb',
  },

  menuLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },

  subMenu: {
    marginLeft: 0,
    paddingLeft: 10,
    borderLeft: '1px solid rgba(0,0,0,0.06)',
  },

  groupMenu: {
    padding: '9px 10px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    background: '#f9fafb',
    color: '#374151',
    transition: '0.2s ease',
    border: '1px solid rgba(0,0,0,0.05)',
  },

  innerSubMenu: {
    marginLeft: 10,
    paddingLeft: 10,
    borderLeft: '1px solid rgba(0,0,0,0.08)',
    animation: 'fadeIn 0.15s ease',
  },

  subItem: {
    padding: '8px 10px',
    marginBottom: 4,
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12.8,
    color: '#4b5563',
    transition: 'all 0.15s ease',
  },

  activeSubItem: {
    color: '#2563eb',
    transform: 'translateX(2px)',
    fontWeight: 600,
  },

  authBox: {
    marginTop: 'auto',
    padding: '11px 12px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid rgba(0,0,0,0.08)',
    transition: 'all 0.2s ease',
  },

  authBadge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 999,
    color: '#fff',
    fontWeight: 600,
  },

  searchWrap: {
    marginBottom: 12,
  },

  searchInput: {
    width: '100%',
    padding: '9px 10px',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.08)',
    outline: 'none',
    fontSize: 13,
    background: 'transparent',
    color: '#111827',
    transition: 'all 0.2s ease',
  },

  chevronBox: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
};
