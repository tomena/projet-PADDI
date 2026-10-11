
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
  
  const USERS: Record<string, string> = {
    "zo.ravelonirina@giz.de": "Zo",
    "anjarampifohazana.toky@giz.de": "Toky",
    "joary.andriamiharimanana@giz.de": "Joary",
  };
  
  export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Méthode non autorisée." });
    }
  
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH;
    const path = process.env.GEOJSON_PATH;
    const accessPassword = process.env.PADDI_ACCESS_PASSWORD;
  
    if (!token || !owner || !repo || !branch || !path || !accessPassword) {
      return res.status(500).json({
        error: "Configuration serveur incomplète.",
      });
    }
  
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
      const apiUrl =
        `https://api.github.com/repos/${owner}/${repo}/contents/` +
        path.split("/").map(encodeURIComponent).join("/");
  
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
  
      const readResponse = await fetch(
        `${apiUrl}?ref=${encodeURIComponent(branch)}`,
        { headers, cache: "no-store" }
      );
  
      if (!readResponse.ok) {
        throw new Error("Impossible de lire le fichier dans GitHub.");
      }
  
      const file = await readResponse.json();
      const geojson = JSON.parse(
        Buffer.from(file.content, "base64").toString("utf8")
      );
  
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
  
      for (const [key, value] of updateEntries) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          return res.status(400).json({
            error: `La colonne "${key}" n'existe pas dans cette ligne.`,
          });
        }
        properties[key] = value;
      }
  
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
          sha: file.sha,
          branch,
        }),
      });
  
      if (!saveResponse.ok) {
        const details = await saveResponse.text();
        console.error("Erreur GitHub:", details);
        throw new Error("GitHub n'a pas accepté la sauvegarde.");
      }
  
      return res.status(200).json({
        success: true,
        message: "Mise à jour enregistrée dans GitHub.",
        userName: USERS[normalizedId],
      });
    } catch (error) {
      console.error("Erreur de sauvegarde GeoJSON:", error);
      return res.status(500).json({
        error: "Échec de la sauvegarde. Vérifiez les journaux du serveur.",
      });
    }
  }
  