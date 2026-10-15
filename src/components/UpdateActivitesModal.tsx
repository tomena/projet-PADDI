import React, { useEffect, useState } from "react";
import { X, Save, History, RotateCcw } from "lucide-react";

interface UpdateActivitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
  userName?: string;
  identifiant: string;
  motDePasse: string;
}

type MainChoice = "taux" | "axes";
type TauxChoice = "global" | "realisation" | "composante";
type AxeChoice = "gestion" | "amenagement";

const mois = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const unites = [
  "UCT",
  "UCR-A",
  "UCR-B",
  "UCR-D",
  "UCR-F",
  "UCR-FD",
];

const annees = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const InputPercent = ({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) => (
  <div style={styles.fieldCard}>
    <label style={styles.fieldLabel}>{label}</label>

    <div
      style={{
        ...styles.percentInputWrapper,
        borderColor: invalid ? "#dc2626" : "#d1d5db",
        boxShadow: invalid
          ? "0 0 0 1px rgba(220,38,38,0.15)"
          : "none",
      }}
    >
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={styles.percentInput}
      />

      <span
        style={{
          ...styles.percentSymbol,
          color: invalid ? "#dc2626" : GREEN,
        }}
      >
        %
      </span>
    </div>

    {invalid && (
      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: "#dc2626",
        }}
      >
        Valeur invalide. Saisissez un nombre entre 0 et 100.
      </div>
    )}
  </div>
);


const InputNumber = ({
  id,
  label,
  value,
  invalid,
  onChange,
  readOnly = false,
  calculatedValue,
}: {
  id: string;
  label: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  readOnly?: boolean;
  calculatedValue?: number | string;
}) => (
  <div style={styles.fieldCard}>
    <label style={styles.fieldLabel}>{label}</label>

    <input
      type="text"
      inputMode="numeric"
      value={
        calculatedValue !== undefined
          ? calculatedValue
          : value ?? ""
      }
      onChange={(e) => {
        if (!readOnly) {
          onChange(e.target.value);
        }
      }}
      readOnly={readOnly}
      placeholder="Saisir une valeur"
      style={{
        ...styles.normalInput,
        borderColor: invalid ? "#dc2626" : "#d1d5db",
        boxShadow: invalid
          ? "0 0 0 1px rgba(220,38,38,0.15)"
          : "none",
        backgroundColor: readOnly ? "#f3f4f6" : "#ffffff",
        cursor: readOnly ? "not-allowed" : "text",
      }}
    />

    {invalid && !readOnly && (
      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: "#dc2626",
        }}
      >
        Veuillez saisir uniquement un nombre entier positif.
      </div>
    )}
  </div>
);



export default function UpdateActivitesModal({
  isOpen,
  onClose,
  onUpdateSuccess,
  userName,
  identifiant,
  motDePasse,
}: UpdateActivitesModalProps) {


  const [mainChoice, setMainChoice] = useState<MainChoice>("taux");

  const [tauxChoice, setTauxChoice] =
    useState<TauxChoice>("global");

  const [axeChoice, setAxeChoice] =
    useState<AxeChoice>("gestion");

  const [annee, setAnnee] = useState("");
  const [moisSelectionne, setMoisSelectionne] = useState("");
  const [uc, setUc] = useState("");

  const [values, setValues] = useState<Record<string, string>>({});
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const [showHistorique, setShowHistorique] = useState(false);

  
const [historique, setHistorique] = useState<any[]>([]);
const [chargementHistorique, setChargementHistorique] = useState(false);
const [erreurHistorique, setErreurHistorique] = useState("");


useEffect(() => {
  if (!annee || !moisSelectionne || !uc) {
    setValues({});
    return;
  }

  let cancelled = false;

  const chargerEnregistrement = async () => {
    setValues({});

    console.log("Chargement demandé :", {
      annee,
      mois: moisSelectionne,
      uc,
    });

    try {
      const params = new URLSearchParams({
        annee,
        mois: moisSelectionne,
        uc,
      });

      const response = await fetch(
        `/api/update-geojson?${params.toString()}`
      );

      console.log("Réponse API :", response.status);

      const result = await response.json();

      if (!response.ok) {
        if (!cancelled) {
          console.warn(
            "Chargement de l'enregistrement :",
            result.error
          );
        }
        return;
      }

      const p = result.properties;

      const mapping: Record<string, string> = {
        totalPlanifiees: "NAP",
        achevees: "NAA",
        enCours: "NAC",
        nonDemarrees: "NAD",

        r1: "TAR 1",
        r2: "TAR 2",

        c1: "TAC  C1",
        c2: "TAC C2",
        c3: "TAC  C3",
        c4: "TAC C4",

        a111: "TAA 1.1.1",
        a112: "TAA 1.1.2",
        a113: "TAA 1.1.3",
        a114: "TAA 1.1.4",

        a121: "TAA 1.2.1",
        a122: "TAA 1.2.2",
        a123: "TAA 1.2.3",
        a124: "TAA 1.2.4",

        a211: "TAA 2.1.1",
        a212: "TAA 2.1.2",
        a213: "TAA 2.1.3",
        a214: "TAA 2.1.4",

        a221: "TAA 2.2.1",
        a222: "TAA 2.2.2",
        a223: "TAA 2.2.3",
        a224: "TAA 2.2.4",
      };

      const percentageFields = new Set([
        "r1", "r2",
        "c1", "c2", "c3", "c4",
        "a111", "a112", "a113", "a114",
        "a121", "a122", "a123", "a124",
        "a211", "a212", "a213", "a214",
        "a221", "a222", "a223", "a224",
      ]);

      const loadedValues: Record<string, string> = {};

      for (const [formKey, column] of Object.entries(mapping)) {
        const storedValue = p[column];

        if (storedValue === null || storedValue === undefined) {
          loadedValues[formKey] = "";
          continue;
        }

        const displayValue = percentageFields.has(formKey)
          ? Number(storedValue) * 100
          : Number(storedValue);

        loadedValues[formKey] = String(
          Number(displayValue.toFixed(6))
        );
      }

      if (!cancelled) {
        setValues(loadedValues);
      }
    } catch (error) {
      console.error("Erreur de chargement :", error);
    }
  };

  chargerEnregistrement();

  return () => {
    cancelled = true;
  };
}, [annee, moisSelectionne, uc]);


  if (!isOpen) return null;

  const handleValueChange = (
    key: string,
    value: string
  ) => {
    const isValidFormat = /^\d*\.?\d*$/.test(value);
    const isValidRange =
      value === "" || Number(value) <= 100;
  
    const isValid = isValidFormat && isValidRange;
  
    setInvalidFields((prev) => ({
      ...prev,
      [key]: !isValid,
    }));
  
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setAnnee("");
    setMoisSelectionne("");
    setUc("");
    setValues({});
  };

  const handleMainChoice = (choice: MainChoice) => {
    setMainChoice(choice);
    setValues({});
  };

  const handleTauxChoice = (choice: TauxChoice) => {
    setTauxChoice(choice);
    setValues({});
  };

  const handleAxeChoice = (choice: AxeChoice) => {
    setAxeChoice(choice);
    setValues({});
  };

  const handleSave = async () => {
    if (!annee || !moisSelectionne || !uc) {
      alert(
        "Veuillez sélectionner l’année, le mois et l’unité de coordination."
      );
      return;
    }
  
    if (Object.values(invalidFields).some(Boolean)) {
      alert(
        "Veuillez corriger les valeurs indiquées en rouge avant d'enregistrer."
      );
      return;
    }

  // Calcul automatique des activités non démarrées
  const total = Number(values.totalPlanifiees || 0);
  const achevees = Number(values.achevees || 0);
  const enCours = Number(values.enCours || 0);

  const nonDemarrees = Math.max(
    0,
    total - (achevees + enCours)
  );

  const updates: Record<string, number> = {};

  const fieldMapping: Record<string, string> = {
    totalPlanifiees: "NAP",
    achevees: "NAA",
    enCours: "NAC",
    nonDemarrees: "NAD",

    r1: "TAR 1",
    r2: "TAR 2",

    c1: "TAC  C1",
    c2: "TAC C2",
    c3: "TAC  C3",
    c4: "TAC C4",

    a111: "TAA 1.1.1",
    a112: "TAA 1.1.2",
    a113: "TAA 1.1.3",
    a114: "TAA 1.1.4",

    a121: "TAA 1.2.1",
    a122: "TAA 1.2.2",
    a123: "TAA 1.2.3",
    a124: "TAA 1.2.4",

    a211: "TAA 2.1.1",
    a212: "TAA 2.1.2",
    a213: "TAA 2.1.3",
    a214: "TAA 2.1.4",

    a221: "TAA 2.2.1",
    a222: "TAA 2.2.2",
    a223: "TAA 2.2.3",
    a224: "TAA 2.2.4",
  };

  const percentageFields = new Set([
    "r1", "r2",
    "c1", "c2", "c3", "c4",
    "a111", "a112", "a113", "a114",
    "a121", "a122", "a123", "a124",
    "a211", "a212", "a213", "a214",
    "a221", "a222", "a223", "a224",
  ]);

  for (const [formKey, rawValue] of Object.entries(values)) {
    if (rawValue.trim() === "") continue;

    const column = fieldMapping[formKey];
    if (!column) continue;

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      alert(`Valeur invalide pour le champ ${formKey}.`);
      return;
    }

    updates[column] = percentageFields.has(formKey)
      ? parsedValue / 100
      : parsedValue;
  }

  
  const hasGlobalActivityValues = [
    values.totalPlanifiees,
    values.achevees,
    values.enCours,
  ].some((value) => String(value ?? "").trim() !== "");

  if (
    mainChoice === "taux" &&
    tauxChoice === "global" &&
    hasGlobalActivityValues
  ) {
    updates["NAD"] = nonDemarrees;
  }

  if (Object.keys(updates).length === 0) {
    alert("Veuillez saisir au moins une valeur à enregistrer.");
    return;
  }

  try {
    const response = await fetch("/api/update-geojson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifiant,
        motDePasse,
        annee,
        mois: moisSelectionne,
        uc,
        updates,
      }),
    });

    const result = await response.json();

        if (!response.ok) {
          alert(result.error || "Échec de l’enregistrement.");
          return;
        }
        
      if (result.historySaved) {
        console.log("Historique enregistré avec succès.");
      } else {
        console.warn("Les données sont enregistrées, mais l'historique ne l'est pas.");
      }

      onUpdateSuccess();

      alert(
        result.historySaved
          ? "Les données ont été enregistrées avec succès dans GitHub."
          : "Les données ont été enregistrées, mais l'historique n'a pas pu être enregistré."
      );

      onClose();

      } catch (error) {
        console.error("Erreur d’enregistrement :", error);
        alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
      }
    };


  const renderHeaderFields = () => (
    <>
      <div style={styles.contextGrid}>
        <div>
          <label style={styles.selectLabel}>Année</label>

          <select
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
            style={styles.select}
          >
            <option value="">Sélectionner</option>

            {annees.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={styles.selectLabel}>Mois</label>

          <select
            value={moisSelectionne}
            onChange={(e) =>
              setMoisSelectionne(e.target.value)
            }
            style={styles.select}
          >
            <option value="">Sélectionner</option>

            {mois.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.fullField}>
        <label style={styles.selectLabel}>
          Unité de coordination
        </label>

        <select
          value={uc}
          onChange={(e) => setUc(e.target.value)}
          style={styles.select}
        >
          <option value="">Sélectionner</option>

          {unites.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderGlobal = () => (
    <>
      {renderHeaderFields()}
  
      <div style={styles.fieldsGrid}>
      <InputNumber
        id="totalPlanifiees"
        label="Total activités planifiées"
        value={values.totalPlanifiees ?? ""}
        invalid={invalidFields.totalPlanifiees}
        onChange={(value) => {
          const isValid = /^\d*$/.test(value);

          setInvalidFields((prev) => ({
            ...prev,
            totalPlanifiees: !isValid,
          }));

          setValues((prev) => ({
            ...prev,
            totalPlanifiees: value,
          }));
        }}
      />
  
        <InputNumber
          id="achevees"
          label="Activités achevées"
          value={values.achevees ?? ""}
          invalid={invalidFields.achevees}
          onChange={(value) => {
            const isValid = /^\d*$/.test(value);

            setInvalidFields((prev) => ({
              ...prev,
              achevees: !isValid,
            }));

            setValues((prev) => ({
              ...prev,
              achevees: value,
            }));
          }}
        />
  
        <InputNumber
          id="enCours"
          label="Activités en cours"
          value={values.enCours ?? ""}
          invalid={invalidFields.enCours}
          onChange={(value) => {
            const isValid = /^\d*$/.test(value);

            setInvalidFields((prev) => ({
              ...prev,
              enCours: !isValid,
            }));

            setValues((prev) => ({
              ...prev,
              enCours: value,
            }));
          }}
        />  
        
        <InputNumber
          id="nonDemarrees"
          label="Activités non démarrées"
          value=""
          readOnly
          calculatedValue={Math.max(
            0,
            Number(values.totalPlanifiees || 0) -
              (
                Number(values.achevees || 0) +
                Number(values.enCours || 0)
              )
          )}
          onChange={() => {}}
        />
      </div>
    </>
  );

  const renderRealisation = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="r1"
          label="R1. Système de gestion"
          value={values.r1 ?? ""}
          invalid={invalidFields.r1}
          onChange={(value) => handleValueChange("r1", value)}
        />

        <InputPercent
          id="r2"
          label="R2. Aménagement du territoire"
          value={values.r2 ?? ""}
          invalid={invalidFields.r2}
          onChange={(value) => handleValueChange("r2", value)}
        />
      </div>
    </>
  );

  const renderComposante = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="c1"
          label="C1. Gestion de services écosystémiques"
          value={values.c1 ?? ""}
          invalid={invalidFields.c1}
          onChange={(value) => handleValueChange("c1", value)}
        />

        <InputPercent
          id="c2"
          label="C2. Gouvernance environnementale décentralisée"
          value={values.c2 ?? ""}
          invalid={invalidFields.c2}
          onChange={(value) => handleValueChange("c2", value)}
        />

        <InputPercent
          id="c3"
          label="C3. Développement des paysages productifs"
          value={values.c3 ?? ""}
          invalid={invalidFields.c3}
          onChange={(value) => handleValueChange("c3", value)}
        />

        <InputPercent
          id="c4"
          label="C4. Création d'emplois verts"
          value={values.c4 ?? ""}
          invalid={invalidFields.c4}
          onChange={(value) => handleValueChange("c4", value)}
        />
      </div>
    </>
  );

  const renderGestion = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="a111"
          label="1.1.1 Analyses diagnostiques"
          value={values.a111 ?? ""}
          invalid={invalidFields.a111}
          onChange={(value) => handleValueChange("a111", value)}
        />

        <InputPercent
          id="a112"
          label="1.1.2 Planification territoriale"
          value={values.a112 ?? ""}
          invalid={invalidFields.a112}
          onChange={(value) => handleValueChange("a112", value)}
        />

        <InputPercent
          id="a113"
          label="1.1.3 Suivi écosystémique"
          value={values.a113 ?? ""}
          invalid={invalidFields.a113}
          onChange={(value) => handleValueChange("a113", value)}
        />

        <InputPercent
          id="a114"
          label="1.1.4 Financement durable"
          value={values.a114 ?? ""}
          invalid={invalidFields.a114}
          onChange={(value) => handleValueChange("a114", value)}
        />

        <InputPercent
          id="a121"
          label="1.2.1 Participation des populations"
          value={values.a121 ?? ""}
          invalid={invalidFields.a121}
          onChange={(value) => handleValueChange("a121", value)}
        />

        <InputPercent
          id="a122"
          label="1.2.2 Coopération avec MNP"
          value={values.a122 ?? ""}
          invalid={invalidFields.a122}
          onChange={(value) => handleValueChange("a122", value)}
        />

        <InputPercent
          id="a123"
          label="1.2.3 Coordination intersectorielle"
          value={values.a123 ?? ""}
          invalid={invalidFields.a123}
          onChange={(value) => handleValueChange("a123", value)}
        />

        <InputPercent
          id="a124"
          label="1.2.4 Lutte contre la corruption"
          value={values.a124 ?? ""}
          invalid={invalidFields.a124}
          onChange={(value) => handleValueChange("a124", value)}
        />
      </div>
    </>
  );

  const renderAmenagement = () => (
    <>
      {renderHeaderFields()}

      <div style={styles.fieldsGrid}>
        <InputPercent
          id="a211"
          label="2.1.1 Restauration paysages"
          value={values.a211 ?? ""}
          invalid={invalidFields.a211}
          onChange={(value) => handleValueChange("a211", value)}
        />

        <InputPercent
          id="a212"
          label="2.1.2 Production durable"
          value={values.a212 ?? ""}
          invalid={invalidFields.a212}
          onChange={(value) => handleValueChange("a212", value)}
        />

        <InputPercent
          id="a213"
          label="2.1.3 Sécurisation foncière"
          value={values.a213 ?? ""}
          invalid={invalidFields.a213}
          onChange={(value) => handleValueChange("a213", value)}
        />

        <InputPercent
          id="a214"
          label="2.1.4 Gestion des feux"
          value={values.a214 ?? ""}
          invalid={invalidFields.a214}
          onChange={(value) => handleValueChange("a214", value)}
        />

        <InputPercent
          id="a221"
          label="2.2.1 Système de marché"
          value={values.a221 ?? ""}
          invalid={invalidFields.a221}
          onChange={(value) => handleValueChange("a221", value)}
        />

        <InputPercent
          id="a222"
          label="2.2.2 Valorisation des productions"
          value={values.a222 ?? ""}
          invalid={invalidFields.a222}
          onChange={(value) => handleValueChange("a222", value)}
        />

        <InputPercent
          id="a223"
          label="2.2.3 Diversification des activités"
          value={values.a223 ?? ""}
          invalid={invalidFields.a223}
          onChange={(value) => handleValueChange("a223", value)}
        />

        <InputPercent
          id="a224"
          label="2.2.4 Mobilisation communautaire"
          value={values.a224 ?? ""}
          invalid={invalidFields.a224}
          onChange={(value) => handleValueChange("a224", value)}
        />
      </div>
    </>
  );

  
const chargerHistorique = async () => {
  setChargementHistorique(true);
  setErreurHistorique("");

  try {
    // Réutiliser ici les identifiants de la session existante.
    const response = await fetch("/api/historique-geojson", {
      method: "GET",      
      headers: {
        "x-paddi-identifiant": identifiant,
        "x-paddi-password": motDePasse,
      },

    });

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Accès non autorisé."
          : "Impossible de charger l'historique."
      );
    }

    const texte = await response.text();

console.log("Statut API historique :", response.status);
console.log("Réponse API historique :", texte);

let result;

try {
  result = JSON.parse(texte);
} catch {
  throw new Error(
    "L'API historique ne renvoie pas du JSON valide. Vérifie la réponse dans la console du navigateur."
  );
}

setHistorique(
  Array.isArray(result.entries) ? result.entries : []
);
  } catch (error) {
    setErreurHistorique(
      error instanceof Error
        ? error.message
        : "Une erreur est survenue."
    );
  } finally {
    setChargementHistorique(false);
  }
};

const lignesHistorique = historique.flatMap((entry) => {
  const date = entry.date ? new Date(entry.date) : null;

  return (Array.isArray(entry.changements) ? entry.changements : [])
    .filter((changement) => {
      const ancienneValeur =
        changement.ancienneValeur ??
        changement.ancienne ??
        changement.oldValue ??
        null;

      const nouvelleValeur =
        changement.nouvelleValeur ??
        changement.nouvelle ??
        changement.newValue ??
        null;

      return (
        JSON.stringify(ancienneValeur) !==
        JSON.stringify(nouvelleValeur)
      );
    })
    .map((changement) => ({
      utilisateur: entry.utilisateur ?? entry.nom ?? "",
      mail: entry.identifiant ?? "",
      date: date
        ? date.toLocaleDateString("fr-FR")
        : "",
      heure: date
        ? date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "",
      colonne:
        changement.colonne ??
        changement.champ ??
        changement.field ??
        changement.nomColonne ??
        "",
      ancienneValeur:
        changement.ancienneValeur ??
        changement.ancienne ??
        changement.oldValue ??
        "",
      nouvelleValeur:
        changement.nouvelleValeur ??
        changement.nouvelle ??
        changement.newValue ??
        "",
    }));
});

const celluleHistorique: React.CSSProperties = {
  padding: 10,
  border: "1px solid #e2e8e3",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};


  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ================= HEADER ================= */}

      <div style={styles.modalHeader}>

      {/* GAUCHE : TITRE */}
      <div>
        <h2 style={styles.title}>
          Mise à jour
        </h2>

        <p style={styles.subtitle}>
          Suivi des activités annuelles
        </p>

        {userName && (
          <div style={styles.welcome}>
            Bienvenue {userName} !
          </div>
        )}
      </div>

      {/* DROITE : HISTORIQUE + FERMER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >

        {/* HISTORIQUE */}
        <button
          type="button"          
          onClick={() => {
            setShowHistorique(true);
            chargerHistorique();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.45)",
            backgroundColor: "rgba(255,255,255,0.15)",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
          title="Voir l'historique des mises à jour"
        >
          <History size={16} />
          Historique
        </button>

        {/* FERMER */}
        <button
          type="button"
          onClick={onClose}
          style={styles.closeButton}
          title="Fermer"
        >
          <X size={21} />
        </button>

      </div>

      </div>

        {/* ================= CONTENU ================= */}

        <div style={styles.content}>
          <div style={styles.sectionTitle}>
            Que souhaitez-vous mettre à jour ?
          </div>

          {/* CHOIX PRINCIPAL */}

          <div style={styles.choiceGrid}>
            <button
              onClick={() => handleMainChoice("taux")}
              style={{
                ...styles.choiceButton,
                ...(mainChoice === "taux"
                  ? styles.choiceButtonActive
                  : {}),
              }}
            >
              <div style={styles.choiceTitle}>
                Taux d'avancement
              </div>

              <div style={styles.choiceDescription}>
                Activités, réalisations et composantes
              </div>
            </button>

            <button
              onClick={() => handleMainChoice("axes")}
              style={{
                ...styles.choiceButton,
                ...(mainChoice === "axes"
                  ? styles.choiceButtonActive
                  : {}),
              }}
            >
              <div style={styles.choiceTitle}>
                Axes prioritaires
              </div>

              <div style={styles.choiceDescription}>
                Système de gestion et aménagement
              </div>
            </button>
          </div>

          {/* ================= TAUX ================= */}

          {mainChoice === "taux" && (
            <>
              <div style={styles.subTitle}>
                Type d'avancement
              </div>

              <div style={styles.tabs}>
                <button
                  onClick={() =>
                    handleTauxChoice("global")
                  }
                  style={{
                    ...styles.tab,
                    ...(tauxChoice === "global"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Avancement global des activités
                </button>

                <button
                  onClick={() =>
                    handleTauxChoice("realisation")
                  }
                  style={{
                    ...styles.tab,
                    ...(tauxChoice === "realisation"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Avancement par réalisation
                </button>

                <button
                  onClick={() =>
                    handleTauxChoice("composante")
                  }
                  style={{
                    ...styles.tab,
                    ...(tauxChoice === "composante"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Avancement par composante
                </button>
              </div>

              <div style={styles.formSection}>
                {tauxChoice === "global" &&
                  renderGlobal()}

                {tauxChoice === "realisation" &&
                  renderRealisation()}

                {tauxChoice === "composante" &&
                  renderComposante()}
              </div>
            </>
          )}

          {/* ================= AXES ================= */}

          {mainChoice === "axes" && (
            <>
              <div style={styles.subTitle}>
                Axe prioritaire
              </div>

              <div style={styles.tabs}>
                <button
                  onClick={() =>
                    handleAxeChoice("gestion")
                  }
                  style={{
                    ...styles.tab,
                    ...(axeChoice === "gestion"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Système de gestion
                </button>

                <button
                  onClick={() =>
                    handleAxeChoice("amenagement")
                  }
                  style={{
                    ...styles.tab,
                    ...(axeChoice === "amenagement"
                      ? styles.tabActive
                      : {}),
                  }}
                >
                  Aménagement du territoire
                </button>
              </div>

              <div style={styles.formSection}>
                {axeChoice === "gestion" &&
                  renderGestion()}

                {axeChoice === "amenagement" &&
                  renderAmenagement()}
              </div>
            </>
          )}
        </div>

                {/* ================= FOOTER ================= */}

              <div style={styles.footer}>
                <button
                  onClick={handleReset}
                  style={styles.resetButton}
                >
                  <RotateCcw size={16} />
                  Réinitialiser
                </button>

          <div style={styles.footerRight}>
            <button
              onClick={onClose}
              style={styles.cancelButton}
            >
              Annuler
            </button>

            <button
              onClick={handleSave}
              style={styles.saveButton}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>

      </div>

      {/* ================= HISTORIQUE ================= */}

      {showHistorique && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(900px, 95vw)",
              maxHeight: "85vh",
              backgroundColor: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >

            {/* HEADER HISTORIQUE */}
            <div
              style={{
                background: GREEN,
                color: "#ffffff",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                  }}
                >
                  Historique des mises à jour
                </div>

                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.9,
                    marginTop: 3,
                  }}
                >
                  Consultez les modifications effectuées sur les activités.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistorique(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: 5,
                }}
                title="Fermer"
              >
                <X size={22} />
              </button>
            </div>

            {/* CONTENU HISTORIQUE */}
            <div
              style={{
                padding: 20,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                
              {chargementHistorique ? (
                <div style={{ padding: 30, textAlign: "center" }}>
                  Chargement de l'historique...
                </div>
              ) : erreurHistorique ? (
                <div style={{ padding: 30, textAlign: "center", color: "#dc2626" }}>
                  {erreurHistorique}
                </div>
              ) : historique.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
                  Aucune mise à jour enregistrée.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>

  {historique.length === 0 ? (
    <p style={{ textAlign: "center", padding: 24 }}>
      Aucune modification enregistrée.
    </p>
  ) : (
    <div
      style={{
        maxHeight: "420px",
        overflowY: "auto",
        overflowX: "auto",
        width: "100%",
      }}
    >

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          textAlign: "left",
        }}
      >

        <thead>
          <tr style={{ background: "#f0f5f1" }}>
          {[
            "Utilisateur",
            "Date",
            "Heure",
            "Année",
            "Unité de coordination",
            "Nom colonne modifié",
            "Ancienne valeur",
            "Nouvelle valeur",
          ].map((titre) => (
            <th
              key={titre}
              style={{
                padding: 10,
                border: "1px solid #dce5dd",
                color: "#245c3a",
                whiteSpace: "normal",
                lineHeight: 1.2,
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "#f0f5f1",
                minWidth: 100,
              }}
            >
              {titre.split(" ").map((mot, index) => (
                <React.Fragment key={index}>
                  {index > 0 && " "}
                  {mot}
                </React.Fragment>
              ))}
            </th>
          ))}
          </tr>
        </thead>

        <tbody>
          {historique.flatMap((entry, index) => {

            const date = entry.date
              ? new Date(entry.date)
              : null;

            return (
              Array.isArray(entry.changements)
                ? entry.changements
                : []
            )
              .filter((c) => {
                const ancienne =
                  c.ancienneValeur ??
                  c.ancienne ??
                  c.oldValue ??
                  null;

                const nouvelle =
                  c.nouvelleValeur ??
                  c.nouvelle ??
                  c.newValue ??
                  null;

                return (
                  JSON.stringify(ancienne) !==
                  JSON.stringify(nouvelle)
                );
              })
              .map((c, i) => (
                <tr key={`${entry.id ?? index}-${i}`}>

                  <td style={celluleHistorique}>
                    {entry.utilisateur ?? entry.nom ?? ""}
                  </td>

                  <td style={celluleHistorique}>
                    {date && !isNaN(date.getTime())
                      ? date.toLocaleDateString("fr-FR")
                      : ""}
                  </td>

                  <td style={celluleHistorique}>
                    {date && !isNaN(date.getTime())
                      ? date.toLocaleTimeString("fr-FR")
                      : ""}
                  </td>

                  <td style={celluleHistorique}>
                    {entry.annee ?? ""}
                  </td>

                  <td style={celluleHistorique}>
                    {entry.uc ?? ""}
                  </td>

                  <td style={celluleHistorique}>
                    {c.colonne ??
                      c.champ ??
                      c.field ??
                      c.nomColonne ??
                      ""}
                  </td>

                  <td style={celluleHistorique}>
                    {String(
                      c.ancienneValeur ??
                      c.ancienne ??
                      c.oldValue ??
                      ""
                    )}
                  </td>

                  <td style={celluleHistorique}>
                    {String(
                      c.nouvelleValeur ??
                      c.nouvelle ??
                      c.newValue ??
                      ""
                    )}
                  </td>

                </tr>
              ));
          })}
        </tbody>

      </table>
    </div>
  )}

</div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ============  STYLES  ============== */

const GREEN = "#15803d";
const GREEN_DARK = "#166534";
const GREEN_LIGHT = "#f0fdf4";
const GREEN_BORDER = "#bbf7d0";

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },

  modal: {
    width: "min(1050px, 100%)",
    maxHeight: "90vh",
    background: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.20)",
  },

  modalHeader: {
    background: GREEN,
    color: "#ffffff",
    padding: "18px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },

  title: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 700,
  },

  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    opacity: 0.9,
  },

  closeButton: {
    border: "none",
    background: "rgba(255,255,255,0.15)",
    color: "#ffffff",
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: "22px",
    overflowY: "auto",
    flex: 1,
  },

  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: "12px",
  },

  subTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#374151",
    marginTop: "22px",
    marginBottom: "10px",
  },

  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  choiceButton: {
    textAlign: "left",
    padding: "15px 17px",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  choiceButtonActive: {
    background: GREEN_LIGHT,
    border: `2px solid ${GREEN}`,
    boxShadow: "0 2px 8px rgba(21,128,61,0.10)",
  },

  choiceTitle: {
    color: "#1f2937",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px",
  },

  choiceDescription: {
    color: "#6b7280",
    fontSize: "12px",
  },

  tabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  tab: {
    padding: "9px 13px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  tabActive: {
    background: GREEN,
    borderColor: GREEN,
    color: "#ffffff",
  },

  formSection: {
    marginTop: "18px",
    padding: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
  },

  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "14px",
  },

  fullField: {
    marginBottom: "16px",
  },

  selectLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "6px",
  },

  select: {
    width: "100%",
    height: "40px",
    padding: "0 11px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#374151",
    fontSize: "13px",
    outline: "none",
  },

  fieldsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  fieldCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px",
  },

  fieldLabel: {
    display: "block",
    fontSize: "12px",
    lineHeight: 1.4,
    fontWeight: 600,
    color: "#374151",
    marginBottom: "8px",
    minHeight: "34px",
  },

  normalInput: {
    width: "100%",
    height: "38px",
    boxSizing: "border-box",
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "13px",
    outline: "none",
  },

  percentInputWrapper: {
    display: "flex",
    alignItems: "center",
    height: "38px",
    border: "1px solid #d1d5db",
    borderRadius: "7px",
    background: "#ffffff",
    overflow: "hidden",
  },

  percentInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    padding: "0 10px",
    border: "none",
    outline: "none",
    fontSize: "13px",
  },

  percentSymbol: {
    padding: "0 10px",
    color: GREEN,
    fontWeight: 700,
    fontSize: "13px",
  },

  footer: {
    padding: "14px 20px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#ffffff",
    flexShrink: 0,
  },

  footerRight: {
    display: "flex",
    gap: "8px",
  },

  resetButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 13px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  cancelButton: {
    padding: "9px 15px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#4b5563",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },

  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 16px",
    border: "none",
    borderRadius: "8px",
    background: GREEN,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
  },

  welcome: {
    display: "inline-block",
    marginTop: "6px",
    padding: "3px 8px",
    borderRadius: "6px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "10px",
    fontWeight: 700,
  },
};
