
const ALLOWED_FIELDS = new Set([
  "TAG","NAP","NAA","NAC","NAD","TAR 1","TAR 2","TAC  C1","TAC C2","TAC  C3","TAC C4","TAA 1.1.1","TAA 1.1.2",
  "TAA 1.1.3","TAA 1.1.4","TAA 1.2.1","TAA 1.2.2","TAA 1.2.3","TAA 1.2.4","TAA 2.1.1","TAA 2.1.2","TAA 2.1.3",
  "TAA 2.1.4","TAA 2.2.1","TAA 2.2.2","TAA 2.2.3","TAA 2.2.4",
]);

const USERS: Record<string, string> = {
  "zo.ravelonirina@giz.de": "Zo",
  "anjarampifohazana.toky@giz.de": "Toky",
  "joary.andriamiharimanana@giz.de": "Joary",
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée.",
    });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GEOJSON_PATH;
  const historyPath =
  process.env.HISTORY_PATH || "historique-mises-a-jour.json";
  const accessPassword = process.env.PADDI_ACCESS_PASSWORD;

  if (!token || !owner || !repo || !branch || !path) {
    console.error("Configuration GitHub incomplète.");

    return res.status(500).json({
      error: "Configuration serveur incomplète.",
    });
  }

  const apiUrl =
    `https://api.github.com/repos/${owner}/${repo}/contents/` +
    path.split("/").map(encodeURIComponent).join("/");

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // GET : lire une ligne existante pour remplir le formulaire.
  if (req.method === "GET") {
  const tout = String(req.query?.tout ?? "") === "1";

  const annee = String(req.query?.annee ?? "");
  const mois = String(req.query?.mois ?? "");
  const uc = String(req.query?.uc ?? "");

  // Charger toutes les lignes pour le tableau annuel
  if (tout) {
    try {
      const rawResponse = await fetch(
        `${apiUrl}?ref=${encodeURIComponent(branch)}`,
        {
          headers: {
            ...headers,
            Accept: "application/vnd.github.raw+json",
          },
          cache: "no-store",
        }
      );

      if (!rawResponse.ok) {
        console.error(
          "Erreur GitHub lors du chargement complet :",
          rawResponse.status,
          await rawResponse.text()
        );

        return res.status(502).json({
          error: "Impossible de lire le fichier GeoJSON depuis GitHub.",
        });
      }

      const geojson = JSON.parse(await rawResponse.text());

      if (!Array.isArray(geojson.features)) {
        return res.status(500).json({
          error: "Le fichier GeoJSON ne contient pas de tableau features valide.",
        });
      }

      return res.status(200).json(geojson);
    } catch (error) {
      console.error("Erreur de lecture complète du GeoJSON :", error);

      return res.status(500).json({
        error: "Impossible de charger les données du GeoJSON.",
      });
    }
  }

  // Charger une seule ligne pour le formulaire de mise à jour
  if (!annee || !mois || !uc) {
    return res.status(400).json({
      error: "Année, mois et unité de coordination obligatoires.",
    });
  }

  try {
    const rawResponse = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          ...headers,
          Accept: "application/vnd.github.raw+json",
        },
        cache: "no-store",
      }
    );

    if (!rawResponse.ok) {
      console.error(
        "Erreur GitHub lors du chargement d'une ligne :",
        rawResponse.status,
        await rawResponse.text()
      );

      return res.status(502).json({
        error: "Impossible de lire le fichier GeoJSON depuis GitHub.",
      });
    }

    const geojson = JSON.parse(await rawResponse.text());

    if (!Array.isArray(geojson.features)) {
      return res.status(500).json({
        error: "Le fichier GeoJSON ne contient pas de tableau features valide.",
      });
    }

    const matches = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};

      return (
        Number(p["Année"]) === Number(annee) &&
        p["Mois"] === mois &&
        p["UC"] === uc
      );
    });

    if (matches.length !== 1) {
      return res.status(404).json({
        error:
          matches.length === 0
            ? "Aucune ligne trouvée pour cette année, ce mois et cette UC."
            : "Plusieurs lignes correspondent à cette année, ce mois et cette UC.",
        matches: matches.length,
      });
    }

    return res.status(200).json({
      properties: matches[0].properties,
    });
  } catch (error) {
    console.error("Erreur de chargement d'une ligne GeoJSON :", error);

    return res.status(500).json({
      error: "Impossible de lire les données enregistrées.",
    });
  }
}

  // POST : modifier une ligne existante.
  const {
    identifiant,
    motDePasse,
    annee,
    mois,
    uc,
    updates,
  } = req.body ?? {};

  const normalizedId =
    typeof identifiant === "string"
      ? identifiant.trim().toLowerCase()
      : "";

  if (
    !accessPassword ||
    !USERS[normalizedId] ||
    typeof motDePasse !== "string" ||
    motDePasse !== accessPassword
  ) {
    return res.status(401).json({
      error: "Accès refusé. Vérifiez vos identifiants.",
    });
  }

  if (
    !Number.isInteger(Number(annee)) ||
    typeof mois !== "string" ||
    !mois.trim() ||
    typeof uc !== "string" ||
    !uc.trim() ||
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates)
  ) {
    return res.status(400).json({
      error: "Données du formulaire invalides.",
    });
  }

  const updateEntries = Object.entries(updates);

  if (
    updateEntries.length === 0 ||
    updateEntries.some(
      ([key, value]) =>
        !ALLOWED_FIELDS.has(key) ||
        typeof value !== "number" ||
        !Number.isFinite(value)
    )
  ) {
    return res.status(400).json({
      error: "Champs à mettre à jour invalides.",
    });
  }

  try {
    // Première lecture : récupérer le SHA du fichier GitHub.
    const metadataResponse = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(branch)}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!metadataResponse.ok) {
      const details = await metadataResponse.text();

      console.error(
        "Erreur GitHub pendant la récupération du SHA :",
        metadataResponse.status,
        details
      );

      throw new Error("Impossible de lire les métadonnées du fichier.");
    }

    const fileMetadata = await metadataResponse.json();

    if (!fileMetadata.sha) {
      throw new Error("GitHub n'a pas fourni le SHA du fichier.");
    }

    // Deuxième lecture : récupérer le contenu réel du GeoJSON.
    const rawResponse = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          ...headers,
          Accept: "application/vnd.github.raw+json",
        },
        cache: "no-store",
      }
    );

    if (!rawResponse.ok) {
      const details = await rawResponse.text();

      console.error(
        "Erreur GitHub pendant la lecture brute :",
        rawResponse.status,
        details
      );

      throw new Error("Impossible de lire le GeoJSON.");
    }

    const geojson = JSON.parse(await rawResponse.text());

    if (!Array.isArray(geojson.features)) {
      throw new Error("Le fichier ne contient pas de tableau features.");
    }

    // Recherche stricte : aucune nouvelle ligne ne sera créée.
    const matches = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};

      return (
        Number(p["Année"]) === Number(annee) &&
        p["Mois"] === mois &&
        p["UC"] === uc
      );
    });

    if (matches.length !== 1) {
      return res.status(409).json({
        error:
          matches.length === 0
            ? "Aucune ligne correspondante. Rien n'a été modifié."
            : "Plusieurs lignes correspondent. Rien n'a été modifié.",
        matches: matches.length,
      });
    }

    const properties = matches[0].properties;

    // Modifier uniquement les colonnes reçues et autorisées.
    for (const [key, value] of updateEntries) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        return res.status(400).json({
          error: `La colonne "${key}" n'existe pas dans cette ligne.`,
        });
      }

      properties[key] = value;
    }

    
    // ============================================
    // Mise à jour automatique de la ligne "Tous"
    // ============================================

    const unitesIndividuelles = new Set([
      "UCT",
      "UCR-A",
      "UCR-B",
      "UCR-D",
      "UCR-F",
      "UCR-FD",
    ]);

    // Trouver la ligne "Tous" pour la même année et le même mois
    const lignesTous = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};

      return (
        Number(p["Année"]) === Number(annee) &&
        p["Mois"] === mois &&
        String(p["UC"] ?? "").trim() === "Tous"
      );
    });

    // Il faut exactement une ligne "Tous"
    if (lignesTous.length !== 1) {
      return res.status(409).json({
        error:
          lignesTous.length === 0
            ? `La ligne UC "Tous" n'existe pas pour ${annee} - ${mois}.`
            : `Plusieurs lignes UC "Tous" existent pour ${annee} - ${mois}.`,
      });
    }

    // Récupérer uniquement les lignes des UC individuelles
    // pour la même année et le même mois
    const lignesUC = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};

      return (
        Number(p["Année"]) === Number(annee) &&
        p["Mois"] === mois &&
        unitesIndividuelles.has(String(p["UC"] ?? "").trim())
      );
    });

    const proprietesTous = lignesTous[0].properties;

    // Colonnes numériques : on fait la SOMME
    const colonnesSomme = [
      "NAP",
      "NAA",
      "NAC",
      "NAD",
    ];

    // Colonnes de pourcentage : on fait la MOYENNE
    // Les valeurs du GeoJSON sont stockées sous forme décimale
    const colonnesMoyenne = [
      "TAG",
      "TAR 1",
      "TAR 2",
      "TAC  C1",
      "TAC C2",
      "TAC  C3",
      "TAC C4",
      "TAA 1.1.1",
      "TAA 1.1.2",
      "TAA 1.1.3",
      "TAA 1.1.4",
      "TAA 1.2.1",
      "TAA 1.2.2",
      "TAA 1.2.3",
      "TAA 1.2.4",
      "TAA 2.1.1",
      "TAA 2.1.2",
      "TAA 2.1.3",
      "TAA 2.1.4",
      "TAA 2.2.1",
      "TAA 2.2.2",
      "TAA 2.2.3",
      "TAA 2.2.4",
    ];

    // 1. Somme des nombres : NAP, NAA, NAC et NAD
    for (const colonne of colonnesSomme) {
      proprietesTous[colonne] = lignesUC.reduce(
        (total: number, feature: any) => {
          const valeur = feature.properties?.[colonne];

          if (
            valeur === null ||
            valeur === undefined ||
            valeur === ""
          ) {
            return total;
          }

          const nombre = Number(valeur);

          return total + (
            Number.isFinite(nombre) ? nombre : 0
          );
        },
        0
      );
    }

    // 2. Moyenne des pourcentages : TAG, TAR, TAC et TAA
    for (const colonne of colonnesMoyenne) {
      const valeurs = lignesUC
        .map((feature: any) => feature.properties?.[colonne])
        .filter(
          (valeur: any) =>
            valeur !== null &&
            valeur !== undefined &&
            valeur !== "" &&
            Number.isFinite(Number(valeur))
        )
        .map(Number);

      proprietesTous[colonne] =
        valeurs.length > 0
          ? valeurs.reduce(
              (total: number, valeur: number) => total + valeur,
              0
            ) / valeurs.length
          : 0;
    }

    // Enregistrer le GeoJSON sur GitHub en conservant le SHA.
    const saveResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Mise à jour des activités ${annee} - ${mois} - ${uc}`,
        content: Buffer.from(
          JSON.stringify(geojson, null, 2),
          "utf8"
        ).toString("base64"),
        sha: fileMetadata.sha,
        branch,
      }),
    });

    if (!saveResponse.ok) {
      const details = await saveResponse.text();

      console.error("Erreur GitHub pendant la sauvegarde :", details);

      throw new Error("GitHub n'a pas accepté la sauvegarde.");
    }

    return res.status(200).json({
      success: true,
      message: "Mise à jour enregistrée dans GitHub.",
      userName: USERS[normalizedId],
    });
  } catch (error) {
    console.error("Erreur de sauvegarde GeoJSON :", error);

   
    // Enregistrer la mise à jour dans l'historique GitHub
    try {
      const historyUrl =
        `https://api.github.com/repos/${owner}/${repo}/contents/` +
        historyPath.split("/").map(encodeURIComponent).join("/");

      // Lire le fichier d'historique existant
      const historyResponse = await fetch(
        `${historyUrl}?ref=${encodeURIComponent(branch)}`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (!historyResponse.ok) {
        console.error(
          "Impossible de lire l'historique :",
          historyResponse.status,
          await historyResponse.text()
        );

        throw new Error("Impossible de lire le fichier d'historique.");
      }

      const historyMetadata = await historyResponse.json();

      const historyContent = Buffer.from(
        String(historyMetadata.content || "").replace(/\n/g, ""),
        "base64"
      ).toString("utf8");

      const historyData = JSON.parse(historyContent);

      if (!Array.isArray(historyData.entries)) {
        throw new Error("Le fichier d'historique ne contient pas entries.");
      }

      // Ajouter une nouvelle entrée sans effacer les précédentes
      historyData.entries.unshift({
        id: `${Date.now()}-${normalizedId}`,
        date: new Date().toISOString(),
        utilisateur: USERS[normalizedId],
        identifiant: normalizedId,
        annee: Number(annee),
        mois,
        uc,
        champsModifies: updateEntries.map(([key]) => key),
      });

      // Enregistrer l'historique sur GitHub
      const saveHistoryResponse = await fetch(historyUrl, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Historique de mise à jour ${annee} - ${mois} - ${uc}`,
          content: Buffer.from(
            JSON.stringify(historyData, null, 2),
            "utf8"
          ).toString("base64"),
          sha: historyMetadata.sha,
          branch,
        }),
      });

      if (!saveHistoryResponse.ok) {
        console.error(
          "Erreur de sauvegarde de l'historique :",
          saveHistoryResponse.status,
          await saveHistoryResponse.text()
        );

        throw new Error("La mise à jour est enregistrée, mais l'historique n'a pas pu être sauvegardé.");
      }
    } catch (historyError) {
      console.error("Erreur d'enregistrement de l'historique :", historyError);

      return res.status(500).json({
        error:
          historyError instanceof Error
            ? historyError.message
            : "La mise à jour est enregistrée, mais l'historique n'a pas pu être sauvegardé.",
        geojsonEnregistre: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mise à jour et historique enregistrés dans GitHub.",
      userName: USERS[normalizedId],
    });

  }
}
