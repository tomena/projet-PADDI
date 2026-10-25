
const ALLOWED_FIELDS = new Set([
  "NAP", "NAA", "NAC", "NAD",
  "TAR 1", "TAR 2",
  "TAR 1.1", "TAR 1.2", "TAR 2.1", "TAR 2.2",
  "TAA 1.1.1", "TAA 1.1.2", "TAA 1.1.3", "TAA 1.1.4",
  "TAA 1.2.1", "TAA 1.2.2", "TAA 1.2.3", "TAA 1.2.4",
  "TAA 2.1.1", "TAA 2.1.2", "TAA 2.1.3", "TAA 2.1.4",
  "TAA 2.2.1", "TAA 2.2.2", "TAA 2.2.3", "TAA 2.2.4",
  "TAC", "TAC  C1", "TAC C2", "TAC  C3", "TAC C4",
]);

// Colonnes quantitatives : on fait la SOMME pour "Tous"
const SUM_FIELDS = new Set([
  "NAP",
  "NAA",
  "NAC",
  "NAD",
]);

// Colonnes en pourcentage : on fait la MOYENNE uniquement des UC qui possèdent une valeur.
const AVERAGE_FIELDS = new Set([
  "TAR 1",
  "TAR 2",

  "TAR 1.1",
  "TAR 1.2",
  "TAR 2.1",
  "TAR 2.2",

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

  "TAC",
  "TAC C1",
  "TAC C2",
  "TAC C3",
  "TAC C4",
]);

const USERS: Record<string, string> = {
  "zo.ravelonirina@giz.de": "Zo",
  "anjarampifohazana.toky@giz.de": "Toky",
  "joary.andriamiharimanana@giz.de": "Joary",
};


async function appendHistory(
  owner: string,
  repo: string,
  branch: string,
  historyPath: string,
  headers: Record<string, string>,
  entry: Record<string, any>
) {
  const historyUrl =
    `https://api.github.com/repos/${owner}/${repo}/contents/` +
    historyPath.split("/").map(encodeURIComponent).join("/");

  let sha: string | undefined;
  let entries: Record<string, any>[] = [];

  // Lire l'historique existant, s'il existe
  const readResponse = await fetch(
    `${historyUrl}?ref=${encodeURIComponent(branch)}`,
    { headers, cache: "no-store" }
  );

  if (readResponse.ok) {
    const metadata = await readResponse.json();
    sha = metadata.sha;

    const content = Buffer.from(
      metadata.content.replace(/\n/g, ""),
      "base64"
    ).toString("utf8");

    const history = JSON.parse(content);
    entries = Array.isArray(history.entries) ? history.entries : [];
  } else if (readResponse.status !== 404) {
    throw new Error("Impossible de lire le fichier d'historique.");
  }

  // Ajouter la nouvelle entrée au début de la liste
  entries.unshift(entry);

  // Créer ou mettre à jour le fichier dans GitHub
  const saveResponse = await fetch(historyUrl, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Ajout d'une entrée à l'historique PADDI+",
      content: Buffer.from(
        JSON.stringify({ entries }, null, 2),
        "utf8"
      ).toString("base64"),
      ...(sha ? { sha } : {}),
      branch,
    }),
  });

  if (!saveResponse.ok) {
    const details = await saveResponse.text();
    console.error("Erreur GitHub historique :", details);
    throw new Error("Impossible d'enregistrer l'historique.");
  }
}

function recalculerLigneTous(
  features: any[],
  annee: number,
  mois: string
) {
  const UCs = [
    "UCT",
    "UCR-A",
    "UCR-B",
    "UCR-D",
    "UCR-F",
    "UCR-FD",
  ];

  // Chercher la ligne "Tous"
  const ligneTous = features.find((feature: any) => {
    const p = feature.properties ?? {};

    return (
      Number(p["Année"]) === Number(annee) &&
      p["Mois"] === mois &&
      p["UC"] === "Tous"
    );
  });

  if (!ligneTous) {
    throw new Error(
      `La ligne "Tous" est introuvable pour ${annee} - ${mois}.`
    );
  }

  // Récupérer les 6 UC
  const lignesUC = UCs
    .map((nomUC) =>
      features.find((feature: any) => {
        const p = feature.properties ?? {};

        return (
          Number(p["Année"]) === Number(annee) &&
          p["Mois"] === mois &&
          p["UC"] === nomUC
        );
      })
    )
    .filter(Boolean);

  const propertiesTous = ligneTous.properties ?? {};

  // ==============================
  // SOMME DES COLONNES QUANTITATIVES
  // ==============================

  for (const field of SUM_FIELDS) {
    let total = 0;

    for (const feature of lignesUC) {
      const value = feature.properties?.[field];

      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
      ) {
        total += Number(value);
      }
    }

    propertiesTous[field] = total;
  }

  // ==============================
  // MOYENNE DES POURCENTAGES
  // ==============================

  for (const field of AVERAGE_FIELDS) {
    const valeurs: number[] = [];

    for (const feature of lignesUC) {
      const value = feature.properties?.[field];

      // Les cellules vides sont ignorées
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
      ) {
        valeurs.push(Number(value));
      }
    }

    if (valeurs.length > 0) {
      const moyenne =
        valeurs.reduce((sum, value) => sum + value, 0) /
        valeurs.length;

      propertiesTous[field] = moyenne;
    } else {
      // Si aucune UC n'a de valeur,
      // on laisse "Tous" vide.
      propertiesTous[field] = null;
    }
  }

  // Réaffecter les propriétés
  ligneTous.properties = propertiesTous;
}


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
    
    if (!tout && (!annee || !mois || !uc)) {
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
        const details = await rawResponse.text();

        console.error(
          "Erreur GitHub pendant la lecture :",
          rawResponse.status,
          details
        );

        throw new Error(
          `Lecture du GeoJSON impossible : ${rawResponse.status}`
        );
      }

      const geojson = JSON.parse(await rawResponse.text());

      if (!Array.isArray(geojson.features)) {
        throw new Error("Le fichier ne contient pas de tableau features.");
      }
      // Le tableau de bord demande toutes les données à jour depuis GitHub.
      if (tout) {
        return res.status(200).json({
          features: geojson.features,
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
              ? "Aucun enregistrement correspondant."
              : "Plusieurs enregistrements correspondent.",
          matches: matches.length,
        });
      }

      return res.status(200).json({
        properties: matches[0].properties,
      });
    } catch (error) {
      console.error("Erreur de lecture GeoJSON :", error);

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

        // Vérifier que toutes les colonnes existent
        for (const [key] of updateEntries) {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) {
            return res.status(400).json({
              error: `La colonne "${key}" n'existe pas dans cette ligne.`,
            });
          }
        }

        // Historique de la modification demandée
        const changements = updateEntries.map(([key, value]) => ({
          colonne: key,
          ancienneValeur: properties[key] ?? null,
          nouvelleValeur: value,
        }));

        // Modifier l'UC sélectionné
        for (const [key, value] of updateEntries) {
          properties[key] = value;
        }

        // Recalculer automatiquement "Tous"
        recalculerLigneTous(
          geojson.features,
          Number(annee),
          mois
        );

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
    
    let historySaved = false;

    try {
      await appendHistory(
        owner,
        repo,
        branch,
        process.env.HISTORY_PATH || "historique-mises-a-jour.json",
        headers,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: new Date().toISOString(),
          utilisateur: USERS[normalizedId],
          identifiant: normalizedId,
          annee: Number(annee),
          mois,
          uc,
          nombreColonnesModifiees: changements.length,
          changements,
        }
      );

      historySaved = true;
    } catch (historyError) {
      console.error(
        "GeoJSON enregistré, mais historique non enregistré :",
        historyError
      );
    }

  return res.status(200).json({
    success: true,
    message: historySaved
      ? "Mise à jour et historique enregistrés dans GitHub."
      : "GeoJSON enregistré, mais l'historique n'a pas pu être enregistré.",
    userName: USERS[normalizedId],
    historySaved,
    ...(historySaved
      ? {}
      : {
          warning:
            "Les données ont été mises à jour, mais vérifiez le fichier d'historique dans GitHub.",
        }),
  });
  } catch (error) {
    console.error("Erreur de sauvegarde GeoJSON :", error);

    return res.status(500).json({
      error: "Échec de la sauvegarde. Consultez les journaux Vercel.",
    });
  }
}
