import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  BarChart3,
  Flame,
  Trees,
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
  Gavel,
  Wheat,
  Activity,
  ReceiptText,
  Store,
  BrainCircuit,
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  /*
   * Le module est envoyé depuis Home.tsx avec :
   *
   * navigate("/dashboard", {
   *   state: { module: "paddi" }
   * })
   *
   * Valeur par défaut : paddi
   */
  const module = location.state?.module || "paddi";

  const [collapsed, setCollapsed] = useState(false);

  /*
   * Menus principaux ouverts
   */
  const [open, setOpen] = useState<string | null>("paddi");

  /*
   * Sous-menus du PADDI+
   */
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({
    systeme: false,
    amenagement: false,
  });

  /*
   * Connexion
   */
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /*
   * Ouvrir / fermer un menu
   */
  const toggle = (menu: string) => {
    setOpen(open === menu ? null : menu);
  };

  /*
   * Ouvrir / fermer un sous-menu
   */
  const toggleSub = (menu: string) => {
    setOpenSub((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  /*
   * Navigation vers une page du Dashboard.
   *
   * On conserve le module actuel dans location.state.
   * Cela permet de garder la bonne Sidebar après navigation.
   */
  const go = (path: string) => {
    navigate(`/dashboard/${path}`, {
      state: { module },
    });
  };

  /*
   * Vérifie si une page est active.
   */
  const isActive = (path: string) => {
    return location.pathname === `/dashboard/${path}`;
  };

  /*
   * Connexion / déconnexion
   */
  const toggleAuth = () => {
    setIsLoggedIn(!isLoggedIn);

    if (isLoggedIn) {
      navigate("/dashboard", {
        state: { module },
      });
    }
  };

  /*
   * Retour accueil
   */
  const goHome = () => {
    navigate("/");
  };

  return (
    <div
      style={{
        ...styles.sidebar,
        width: collapsed ? 78 : 240,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      {/* ===================================================== */}
      {/* ======================== LOGO ======================== */}
      {/* ===================================================== */}

      <div style={styles.logoBox}>
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
        {/* ===================================================== */}
        {/* ======================== ACCUEIL ==================== */}
        {/* ===================================================== */}

        <div
          style={{
            ...styles.menuItem,
            ...(location.pathname === "/" ? styles.activeMenu : {}),
          }}
          onClick={goHome}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div style={styles.menuLeft}>
            <Home size={18} />
            {!collapsed && "Accueil"}
          </div>
        </div>

        {/* ===================================================== */}
        {/* ======================== PADDI ====================== */}
        {/* ===================================================== */}

        {module === "paddi" && (
          <>
            {/* ================= VUE GENERALE ================= */}

            <div
              style={{
                ...styles.menuItem,
                ...(location.pathname === "/dashboard"
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() =>
                navigate("/dashboard", {
                  state: { module: "paddi" },
                })
              }
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <LayoutDashboard size={18} />
                {!collapsed && "Vue générale"}
              </div>
            </div>

            {/* ================================================= */}
            {/* ================= INDICATEUR PADDI+ ============= */}
            {/* ================================================= */}

            <div
              style={styles.menuItem}
              onClick={() => toggle("paddi")}
            >
              <div style={styles.menuLeft}>
                <FolderKanban size={18} />
                {!collapsed && "Indicateur du PADDI+"}
              </div>

              {!collapsed && (
                <div style={styles.chevronBox}>
                  {open === "paddi" ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </div>
              )}
            </div>

            {open === "paddi" && !collapsed && (
              <div style={styles.subMenu}>
                {/* ============================================= */}
                {/* ================ SYSTEME ===================== */}
                {/* ============================================= */}

                <div
                  style={styles.groupMenu}
                  onClick={() => toggleSub("systeme")}
                >
                  <div style={styles.menuLeft}>
                    <Database size={16} />
                    Système de gestion
                  </div>

                  {openSub["systeme"] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </div>

                {openSub["systeme"] && (
                  <div style={styles.innerSubMenu}>
                    {/* Superficies brûlées */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("superficie-brulee")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("superficie-brulee")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Flame size={16} />
                      Superficies brûlées
                    </div>

                    {/* Budgets Communaux */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("budget-communal")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("budget-communal")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Landmark size={16} />
                      Budgets Communaux
                    </div>

                    {/* Système de suivi */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("systeme-suivi")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("systeme-suivi")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Activity size={16} />
                      Système de suivi
                    </div>

                    {/* Mesures Communautaires */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("mesures-communales")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("mesures-communales")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Users size={16} />
                      Mesures Communautaires
                    </div>

                    {/* Décision des COSAP */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("cosap-decision")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("cosap-decision")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Gavel size={16} />
                      Décision des COSAP
                    </div>

                    {/* Mesures régionales */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("mesures-regionales")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("mesures-regionales")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Globe2 size={16} />
                      Mesures régionales
                    </div>
                  </div>
                )}

                {/* ============================================= */}
                {/* ========== AMENAGEMENT DU TERRITOIRE ========= */}
                {/* ============================================= */}

                <div
                  style={styles.groupMenu}
                  onClick={() => toggleSub("amenagement")}
                >
                  <div style={styles.menuLeft}>
                    <Briefcase size={16} />
                    Aménagement du territoire
                  </div>

                  {openSub["amenagement"] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </div>

                {openSub["amenagement"] && (
                  <div style={styles.innerSubMenu}>
                    {/* Superficie aménagée */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("sad")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("sad")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <MapPinned size={16} />
                      Superficie aménagée
                    </div>

                    {/* Bénéficiaire */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("beneficiaire")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("beneficiaire")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Users size={16} />
                      Bénéficiaire
                    </div>

                    {/* Surfaces Agropastorales */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("surface-agro")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("surface-agro")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Wheat size={16} />
                      Surfaces Agropastorales
                    </div>

                    {/* Surfaces Forestières */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("surface-forestiere")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("surface-forestiere")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Trees size={16} />
                      Surfaces Forestières
                    </div>

                    {/* Producteurs avec revenus */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("revenus-producteurs")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("revenus-producteurs")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <DollarSign size={16} />
                      Producteurs avec revenus
                    </div>

                    {/* Micro-entreprises */}

                    <div
                      style={{
                        ...styles.subItem,
                        ...(isActive("micro-entreprises")
                          ? styles.activeSubItem
                          : {}),
                      }}
                      onClick={() => go("micro-entreprises")}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,0,0,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Store size={16} />
                      Micro-entreprises
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================================= */}
            {/* ================= SUIVI DES COÛTS =============== */}
            {/* ================================================= */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("suivi-couts")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("suivi-couts")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <ReceiptText size={18} />
                {!collapsed && "Suivi des coûts"}
              </div>
            </div>

            {/* ================================================= */}
            {/* ========== SUIVI ACTIVITÉS ANNUELLES ============ */}
            {/* ================================================= */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("suivi-activites-annuelles")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("suivi-activites-annuelles")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <Activity size={18} />
                {!collapsed && "Suivi des activités annuelles"}
              </div>
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/* =================== ENVIRONNEMENT =================== */}
        {/* ===================================================== */}

        {module === "environnement" && (
          <>
            {/* Analyse de feux */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("analyse-feux")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("analyse-feux")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <Flame size={18} />
                {!collapsed && "Analyse de feux"}
              </div>
            </div>

            {/* Déforestation */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("deforestation")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("deforestation")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <Trees size={18} />
                {!collapsed && "Déforestation"}
              </div>
            </div>

            {/* Environnement */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("analyse-environnement")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("analyse-environnement")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <Globe2 size={18} />
                {!collapsed && "Environnement"}
              </div>
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/* ================= CADRE STRATÉGIQUE ================= */}
        {/* ===================================================== */}

        {module === "cadre" && (
          <>
            <div
              style={{
                ...styles.menuItem,
                ...(isActive("analyse")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("analyse")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <BarChart3 size={18} />
                {!collapsed && "Synthèse territoriale"}
              </div>
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/* ======================= SOCIÉTÉ ==================== */}
        {/* ===================================================== */}

        {module === "societe" && (
          <>
            {/* Indicateurs sociaux */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("analyse-social")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("analyse-social")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <Users size={18} />
                {!collapsed && "Indicateurs sociaux"}
              </div>
            </div>

            {/* Socio-économique */}

            <div
              style={{
                ...styles.menuItem,
                ...(isActive("analyse-socio-economique")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("analyse-socio-economique")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <MapPinned size={18} />
                {!collapsed && "Sociaux-économique"}
              </div>
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/* ======================= ÉCONOMIE =================== */}
        {/* ===================================================== */}

        {module === "economie" && (
          <>
            <div
              style={{
                ...styles.menuItem,
                ...(isActive("analyse-economie")
                  ? styles.activeMenu
                  : {}),
              }}
              onClick={() => go("analyse-economie")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.menuLeft}>
                <Landmark size={18} />
                {!collapsed && "Économie locale"}
              </div>
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/* ==================== CARTOGRAPHIE ================== */}
        {/* ===================================================== */}

        {module === "paddi" && (
          <>
            <div
              style={styles.menuItem}
              onClick={() => toggle("carto")}
            >
              <div style={styles.menuLeft}>
                <Map size={18} />
                {!collapsed && "Cartographie"}
              </div>

              {!collapsed &&
                (open === "carto" ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </div>

            {open === "carto" && !collapsed && (
              <div style={styles.subMenu}>
                {/* Intervention PADDI+ */}

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive("carte")
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go("carte")}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(0,0,0,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <MapPinned size={16} />
                  Intervention de PADDI+
                </div>

                {/* Zones de pression */}

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive("pression")
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go("pression")}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(0,0,0,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Flame size={16} />
                  Zones de Pression
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================================== */}
        {/* ==================== CONFIGURATION ================= */}
        {/* ===================================================== */}

        {module === "paddi" && (
          <>
            <div
              style={styles.menuItem}
              onClick={() => toggle("param")}
            >
              <div style={styles.menuLeft}>
                <Settings size={18} />
                {!collapsed && "Configuration"}
              </div>

              {!collapsed &&
                (open === "param" ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </div>

            {open === "param" && !collapsed && (
              <div style={styles.subMenu}>
                {/* Intelligence artificielle */}

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive("model")
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go("model")}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(0,0,0,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Bot size={16} />
                  Intelligence Artificielle
                </div>

                {/* Langues */}

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive("language")
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go("language")}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(0,0,0,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Languages size={16} />
                  Langues
                </div>

                {/* Exportation */}

                <div
                  style={{
                    ...styles.subItem,
                    ...(isActive("export")
                      ? styles.activeSubItem
                      : {}),
                  }}
                  onClick={() => go("export")}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(0,0,0,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Download size={16} />
                  Exportation
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================================== */}
        {/* ====================== LOGIN ======================== */}
        {/* ===================================================== */}

        <div style={styles.authBox} onClick={toggleAuth}>
          <div style={styles.menuLeft}>
            <Users size={18} />
            {!collapsed &&
              (isLoggedIn ? "Se déconnecter" : "Se connecter")}
          </div>

          <div
            style={{
              ...styles.authBadge,
              background: isLoggedIn ? "#dc2626" : "#059669",
            }}
          >
            {!collapsed && (isLoggedIn ? "Logout" : "Login")}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================= */
/* ======================= STYLES ============================== */
/* ============================================================= */

const styles: any = {
  sidebar: {
    width: 290,
    height: "100vh",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    background: "transparent",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    borderRight: "1px solid rgba(0,0,0,0.06)",
    color: "#111827",
    overflow: "hidden",
    transition: "width 0.25s ease",
  },

  logoBox: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  logo: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 1,
    color: "#111827",
  },

  subtitle: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 6,
    color: "#6b7280",
    lineHeight: 1.4,
  },

  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.06)",
    marginBottom: 10,
    transition: "all 0.2s ease",
  },

  menuContainer: {
    flex: 1,
    overflowY: "auto",
    paddingRight: 4,
    paddingLeft: 6,
  },

  menuItem: {
    padding: "10px 10px",
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 600,
    fontSize: 13,
    marginBottom: 5,
    background: "transparent",
    color: "#374151",
    transition: "all 0.15s ease",
  },

  activeMenu: {
    color: "#2563eb",
    background: "rgba(37,99,235,0.06)",
    borderLeft: "3px solid #2563eb",
  },

  menuLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  subMenu: {
    marginLeft: 0,
    paddingLeft: 10,
    borderLeft: "1px solid rgba(0,0,0,0.06)",
  },

  groupMenu: {
    padding: "9px 10px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    background: "#f9fafb",
    color: "#374151",
    transition: "0.2s ease",
    border: "1px solid rgba(0,0,0,0.05)",
  },

  innerSubMenu: {
    marginLeft: 10,
    paddingLeft: 10,
    borderLeft: "1px solid rgba(0,0,0,0.08)",
    animation: "fadeIn 0.15s ease",
  },

  subItem: {
    padding: "8px 10px",
    marginBottom: 4,
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12.8,
    color: "#4b5563",
    transition: "all 0.15s ease",
  },

  activeSubItem: {
    color: "#2563eb",
    transform: "translateX(2px)",
    fontWeight: 600,
  },

  authBox: {
    marginTop: "auto",
    padding: "11px 12px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
  },

  authBadge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    color: "#fff",
    fontWeight: 600,
  },

  searchWrap: {
    marginBottom: 12,
  },

  searchInput: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.08)",
    outline: "none",
    fontSize: 13,
    background: "transparent",
    color: "#111827",
    transition: "all 0.2s ease",
  },

  chevronBox: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
};
