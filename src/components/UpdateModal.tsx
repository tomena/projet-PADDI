import React, { useEffect, useRef, useState,} from "react";
import { X, RefreshCw, FileSpreadsheet, Upload, CheckCircle2, AlertCircle,} from "lucide-react";
import {  analyserFichierCouts,  UC_PAR_ONGLET,  ONGLET_PAR_UTILISATEUR,  UTILISATEURS_ADMIN,} from "../utils/parseCoutsExcel";


interface UpdateModalProps {
  onClose: () => void;
  userName?: string;
  password?: string;
}

export default function UpdateModal({ onClose, userName, password }: UpdateModalProps) {

  const [anneeImport, setAnneeImport] = useState<string>("2026");
  const anneesDisponibles = [ 2024,2025,2026,2027,2028,2029,2030,];
  
  const [moisImport, setMoisImport] = useState<string>("");
  const moisDisponibles = [
  "Janvier", "Février", "Mars", "Avril",
  "Mai", "Juin", "Juillet", "Août",
  "Septembre", "Octobre", "Novembre", "Décembre",
];
  
  const [typeMiseAJour, setTypeMiseAJour] = useState<
    "decaissement" | "avancement" | null
  >(null);

  const [niveau, setNiveau] = useState<
    "Par composante" | "Par instrument"
  >("Par composante");

  const [uniteCoordination, setUniteCoordination] =
  useState("UCT");  

  const uniteParUtilisateur: Record<string, string> = {
    Joary: "UCT",
    Allan: "UCR-D",
    Herimanga: "UCR-B",
    Njaka: "UCR-F",
    Michael: "UCR-A",
    Tsinjo: "UCR-FD",
  };
  
  // Utilisateurs et droits
  const estAdmin = UTILISATEURS_ADMIN.has(userName ?? "");
  const estCeline = userName === "Celine";
  
  // Seuls les administrateurs choisissent le type de mise à jour.
  const peutChoisirType = estAdmin;
  
  // Celine peut choisir le niveau pour le décaissement.
  // Les autres utilisateurs ne peuvent pas changer le niveau.
  const peutChoisirNiveau = estAdmin || estCeline;
  
  // Seuls les administrateurs choisissent l'unité de coordination.
  const peutChoisirUnite = estAdmin;
  
  // Initialisation selon l'utilisateur connecté
  useEffect(() => {
    if (!userName) return;
  
    if (estAdmin) {
      setTypeMiseAJour(null);
      setNiveau("Par composante");
      setUniteCoordination("UCT");
      return;
    }
  
    if (estCeline) {
      setTypeMiseAJour("decaissement");
      setNiveau("Par composante");
      setUniteCoordination("");
      return;
    }
  
    setTypeMiseAJour("avancement");
    setNiveau("Par composante");
    setUniteCoordination(uniteParUtilisateur[userName] || "");
  }, [userName, estAdmin, estCeline]);
  

  const [fichier, setFichier] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importEnCours, setImportEnCours] = useState(false);

  /* =========================
     SÉLECTION DU FICHIER
  ========================= */

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setErreur(null);
    setMessage(null);

    const file = event.target.files?.[0];

    if (!file) {
      setFichier(null);
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "xlsx" && extension !== "xls") {
      setErreur(
        "Veuillez sélectionner un fichier Excel au format .xlsx ou .xls."
      );

      setFichier(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setFichier(file);
  };

  /* =========================
     OUVRIR LE SÉLECTEUR
  ========================= */

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  /* =========================
     IMPORTATION
  ========================= */

  const estAdminImport = UTILISATEURS_ADMIN.has(userName ?? "");
  const ongletImpose = ONGLET_PAR_UTILISATEUR[userName ?? ""];
  const ongletsDisponibles = Object.keys(UC_PAR_ONGLET);
  const peutImporterDecaissement = estAdmin || estCeline;

const peutImporterAvancement =
  estAdmin || Boolean(ONGLET_PAR_UTILISATEUR[userName ?? ""]);

const peutImporter =
  typeMiseAJour === "decaissement"
    ? peutImporterDecaissement
    : typeMiseAJour === "avancement"
      ? peutImporterAvancement
      : false;

  const handleImport = async () => {
    setErreur(null);
    setMessage(null);
  
    if (!fichier) {
      setErreur("Veuillez sélectionner un fichier Excel.");
      return;
    }
  
    if (!userName) {
      setErreur("Utilisateur non identifié.");
      return;
    }

    if (!password) {
      setErreur("Session expirée : fermez cette fenêtre et reconnectez-vous.");
      return;
    }
  
  if (!peutImporter) {
      setErreur("Vous n'êtes pas autorisé à importer ces données.");
      return;
    }
  
    let ongletsAImporter: string[] = [];
  
    if (estAdminImport) {
      if (uniteCoordination === "Tous") {
        ongletsAImporter = ongletsDisponibles;
      } else {
        ongletsAImporter = ongletsDisponibles.filter(
          (onglet) =>
            UC_PAR_ONGLET[onglet] === uniteCoordination
        );
      }
    } else if (ongletImpose) {
      ongletsAImporter = [ongletImpose];
    }
  
    if (ongletsAImporter.length === 0) {
      setErreur(
        "Aucun onglet Excel autorisé ne correspond à votre unité de coordination."
      );
      return;
    }
  
    setImportEnCours(true);
  
    try {
      // Lire uniquement les onglets autorisés.
      const imports = await analyserFichierCouts(
        fichier,
        ongletsAImporter,
        Number(anneeImport)
      );
  
      if (!imports || imports.length === 0) {
        throw new Error(
          "Aucune donnée exploitable trouvée dans les onglets sélectionnés."
        );
      }
  
      // Envoyer les données à l'API import-couts.
      const reponse = await fetch("/api/import-couts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName,
          password,
          imports,
        }),
      });
  
      const resultatAPI = await reponse.json();
  
      if (!reponse.ok || !resultatAPI.success) {
        throw new Error(
          resultatAPI.error ||
            resultatAPI.message ||
            "Échec de la mise à jour des coûts."
        );
      }
  
      setMessage(
        resultatAPI.message ||
          "Importation et mise à jour effectuées avec succès."
      );
  
      console.log("Résultat de l'importation :", resultatAPI);
    } catch (error) {
      console.error("Erreur pendant l'importation :", error);
  
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue."
      );
    } finally {
      setImportEnCours(false);
    }
  };


  /* =========================
     RESET DU MODAL
  ========================= */

  const handleClose = () => {
    setTypeMiseAJour(null);
    setNiveau("Par composante");
    setFichier(null);
    setMessage(null);
    setErreur(null);

    onClose();
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        style={styles.overlay}
        onClick={handleClose}
      >
        {/* MODAL */}
        <div
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* =========================
              HEADER
          ========================= */}

          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.headerIcon}>
                <RefreshCw
                  size={20}
                  color="#2563eb"
                />
              </div>

              <div>
                <div style={styles.title}>
                  Mise à jour des données
                </div>

                <div style={styles.subtitle}>
                  Importer et actualiser les données financières
                </div>
                {userName && (
                <div style={styles.welcome}>
                  Bienvenue {userName} !
                </div>
                )}
              </div>
            </div>

            <button
              onClick={handleClose}
              style={styles.closeButton}
              title="Fermer"
            >
              <X size={19} />
            </button>
          </div>

          {/* =========================
              CONTENU
          ========================= */}

          <div style={styles.content}>

            {/* TITRE SECTION */}

            <div style={styles.sectionTitle}>
              DONNÉES À METTRE À JOUR
            </div>

            {/* =========================
                CHOIX DES DONNÉES
            ========================= */}
            
            <div style={styles.dataChoices}>
              {/* DÉCAISSEMENT */}
              <label
                style={{
                  ...styles.choice,
                  ...(typeMiseAJour === "decaissement"
                    ? styles.choiceActive
                    : {}),
                  ...(!estAdmin && !estCeline
                    ? { opacity: 0.5, cursor: "not-allowed" }
                    : {}),
                  ...(estCeline
                    ? { cursor: "default" }
                    : {}),
                }}
              >
                <input
                  type="checkbox"
                  checked={typeMiseAJour === "decaissement"}
                  disabled={!estAdmin && !estCeline}
                  onChange={() => {
                    if (!estAdmin && !estCeline) return;

                    setTypeMiseAJour(
                      typeMiseAJour === "decaissement"
                        ? null
                        : "decaissement"
                    );
                  }}
                  style={styles.checkbox}
                />

                <span
                  style={{
                    ...styles.choiceText,
                    ...(typeMiseAJour === "decaissement"
                      ? styles.choiceTextActive
                      : {}),
                  }}
                >
                  Décaissement
                </span>
              </label>

              {/* TAUX D'AVANCEMENT */}
              <label
                style={{
                  ...styles.choice,
                  ...(typeMiseAJour === "avancement"
                    ? styles.choiceActive
                    : {}),
                  ...(estCeline
                    ? { opacity: 0.5, cursor: "not-allowed" }
                    : {}),
                }}
              >
                <input
                  type="checkbox"
                  checked={typeMiseAJour === "avancement"}
                  disabled={!estAdmin}
                  onChange={() => {
                    if (!estAdmin) return;

                    setTypeMiseAJour(
                      typeMiseAJour === "avancement"
                        ? null
                        : "avancement"
                    );
                  }}
                  style={styles.checkbox}
                />

                <span
                  style={{
                    ...styles.choiceText,
                    ...(typeMiseAJour === "avancement"
                      ? styles.choiceTextActive
                      : {}),
                  }}
                >
                  Taux d'avancement
                </span>
              </label>
            </div>       

           {/* =========================
                MENUS DE PARAMÉTRAGE
            ========================= */}
            
            {/* MENUS DE PARAMÉTRAGE */}
            {typeMiseAJour && (
              <div style={styles.levelContainer}>
                {/* NIVEAU : uniquement pour le décaissement */}
                {typeMiseAJour === "decaissement" && (
                  <div style={styles.selectGroup}>
                    <div style={styles.levelLabel}>
                      Niveau de mise à jour
                    </div>

                    <select
                      value={niveau}
                      onChange={(e) =>
                        setNiveau(
                          e.target.value as
                            | "Par composante"
                            | "Par instrument"
                        )
                      }
                      disabled={!peutChoisirNiveau}
                      style={styles.select}
                    >
                      <option value="Par composante">
                        Par composante
                      </option>
                      <option value="Par instrument">
                        Par instrument
                      </option>
                    </select>
                  </div>
                )}

                {/* UNITÉ : uniquement pour le taux d'avancement */}
                {typeMiseAJour === "avancement" && !estCeline && (
                  <div style={styles.selectGroup}>
                    <div style={styles.levelLabel}>
                      Unité de coordination
                    </div>

                    <select
                      value={uniteCoordination}
                      onChange={(e) => setUniteCoordination(e.target.value)}
                      disabled={!peutChoisirUnite}
                      style={{
                        ...styles.select,
                        ...(!peutChoisirUnite
                          ? {
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                              cursor: "not-allowed",
                              borderColor: "#cbd5e1",
                            }
                          : {}),
                      }}
                    >
                      {peutChoisirUnite ? (
                        <>
                          <option value="Tous">Toutes les antennes</option>
                          <option value="UCT">UCT</option>
                          <option value="UCR-A">UCR-A</option>
                          <option value="UCR-B">UCR-B</option>
                          <option value="UCR-D">UCR-D</option>
                          <option value="UCR-F">UCR-F</option>
                          <option value="UCR-FD">UCR-FD</option>
                        </>
                      ) : (
                        <option value={uniteCoordination}>
                          {uniteCoordination}
                        </option>
                      )}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* IMPORT EXCEL */}
              <div style={styles.importSection}>
                <div style={styles.sectionTitle}>
                  IMPORTER LE FICHIER EXCEL
                </div>
              
                {/* PREMIÈRE LIGNE : ANNÉE ET MOIS */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    alignItems: "end",
                    width: "100%",
                  }}
                >
                  {/* ANNÉE */}
                  <div style={styles.selectGroup}>
                    <div style={styles.levelLabel}>Année</div>
              
                    <select
                      value={anneeImport}
                      onChange={(e) => setAnneeImport(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Choisir l'année</option>
                      {anneesDisponibles.map((annee) => (
                        <option key={annee} value={annee}>
                          {annee}
                        </option>
                      ))}
                    </select>
                  </div>
              
                  {/* MOIS */}
                  <div style={styles.selectGroup}>
                    <div style={styles.levelLabel}>Mois</div>
              
                    <select
                      value={moisImport}
                      onChange={(e) => setMoisImport(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Choisir le mois</option>
                      {moisDisponibles.map((mois) => (
                        <option key={mois} value={mois}>
                          {mois}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              
                {/* DEUXIÈME LIGNE : FICHIER EXCEL SUR TOUTE LA LARGEUR */}
                <div
                  style={{
                    ...styles.importButtonContainer,
                    width: "100%",
                    marginTop: "12px",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
              
                  <div
                    style={{
                      ...styles.uploadBox,
                      width: "100%",
                      minHeight: "100px",
                      padding: "16px",
                      boxSizing: "border-box",
                      ...(fichier ? styles.uploadBoxSelected : {}),
                    }}
                    onClick={handleOpenFile}
                  >
                    {fichier ? (
                      <>
                        <div style={styles.fileIcon}>
                          <FileSpreadsheet size={24} color="#16a34a" />
                        </div>
              
                        <div style={styles.fileName}>{fichier.name}</div>
              
                        <div style={styles.fileInfo}>
                          {(fichier.size / 1024).toFixed(1)} Ko
                        </div>
              
                        <div style={styles.changeFile}>
                          Cliquer pour remplacer
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.uploadIcon}>
                          <Upload size={22} color="#2563eb" />
                        </div>
              
                        <div style={styles.uploadTitle}>
                          Choisir le fichier Excel
                        </div>
              
                        <div style={styles.uploadFormat}>
                          .xlsx / .xls
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

            {/* MESSAGE ERREUR */}
            {erreur && (
              <div style={styles.errorMessage}>
                <AlertCircle size={16} color="#dc2626" />
                <span>{erreur}</span>
              </div>
            )}

            {/* MESSAGE SUCCÈS */}
            {message && (
              <div style={styles.successMessage}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>{message}</span>
              </div>
            )}
          </div>


          {/* =========================
                  FOOTER
              ========================= */}

          <div style={styles.footer}>
            <button
              type="button"
              onClick={handleClose}
              style={styles.cancelButton}
              disabled={importEnCours}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleImport}
              style={{
                ...styles.importButton,
                opacity: !typeMiseAJour || !fichier || importEnCours ? 0.55 : 1,
                cursor:
                  !typeMiseAJour || !fichier || importEnCours
                    ? "not-allowed"
                    : "pointer",
              }}
              disabled={!typeMiseAJour || !fichier || importEnCours}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: importEnCours ? "spin 1s linear infinite" : "none",
                }}
              />

              {importEnCours
                ? "Importation en cours..."
                : "Importer et mettre à jour"}
            </button>
          </div>
        </div> {/* fin de styles.modal */}
        </div>   {/* fin de styles.overlay */}
      </>
    );
  }

const styles: {
  [key: string]: React.CSSProperties;
} = {

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.48)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
    boxSizing: "border-box",
  },

  modal: {
    width: "100%",
    maxWidth: 570,
    background: "#ffffff",
    borderRadius: 16,
    boxShadow:
      "0 25px 60px rgba(15, 23, 42, 0.22)",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
    background: "#ffffff",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  title: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.2,
  },

  subtitle: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },

  closeButton: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  content: {
    padding: "20px 22px 22px",
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 11,
  },

  dataChoices: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },

  choice: {
    flex: 1,
    minHeight: 48,
    padding: "0 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    cursor: "pointer",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  choiceActive: {
    border: "1px solid #93c5fd",
    background: "#f8fbff",
    boxShadow:
      "0 2px 6px rgba(37, 99, 235, 0.06)",
  },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#2563eb",
    cursor: "pointer",
    margin: 0,
  },

  choiceText: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    whiteSpace: "nowrap",
  },

  choiceTextActive: {
    color: "#1d4ed8",
  },

  levelContainer: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 9,
  },

  levelLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "#64748b",
    marginBottom: 1,
  },

  select: {
    width: 190,
    height: 34,
    padding: "0 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 11,
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
  },

  selectGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 5,
  },

  importSection: {
    marginTop: 24,
  },

  uploadBox: {
    minHeight: 135,
    border: "1.5px dashed #cbd5e1",
    borderRadius: 11,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: "20px",
    width: "100%",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },

  uploadBoxSelected: {
    border: "1.5px dashed #86efac",
    background: "#f0fdf4",
  },

  uploadIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  fileIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  uploadTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
  },

  uploadDescription: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },

  uploadFormat: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 5,
  },

  fileName: {
    maxWidth: "90%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 800,
    color: "#166534",
  },

  fileInfo: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 3,
  },

  changeFile: {
    fontSize: 9,
    color: "#2563eb",
    marginTop: 7,
    fontWeight: 700,
  },

  errorMessage: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: "9px 11px",
    borderRadius: 8,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 10,
    fontWeight: 600,
  },

  successMessage: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: "9px 11px",
    borderRadius: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 10,
    fontWeight: 600,
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  cancelButton: {
    height: 38,
    padding: "0 16px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#475569",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  importButton: {
    height: 38,
    padding: "0 16px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  welcome: {
    display: "inline-block",
    marginTop: 6,
    padding: "3px 8px",
    borderRadius: 6,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: 700,
  },

  importButtonContainer: {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
},
};
