/// <reference types="node" />
import { createHmac, timingSafeEqual } from "crypto";

/* api/update-geojson.ts
 *  - GET  : lecture publique (une ligne pour le formulaire, ou tout avec ?tout=1)
 *  - POST : mise à jour d'une ligne. Authentification par JETON DE SESSION signé par /api/auth
 *           (envoyé dans le corps : { token, annee, mois, uc, updates }).
 * Variables : GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GEOJSON_PATH,
 * AUTH_SECRET, et optionnellement HISTORY_PATH. */

/* ---------- Jeton de session (créé par api/auth.ts) ---------- */
function lireJeton(jeton: unknown, secret: string): string | null {
  if (typeof jeton !== "string" || !secret) return null;
  const [payload, signature] = jeton.split(".");
  if (!payload || !signature) return null;
  const attendu = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof u === "string" && typeof exp === "number" && exp > Date.now() ? u : null;
  } catch {
    return null;
  }
}

/* Les noms de colonnes sont comparés sans tenir compte des espaces multiples
   (le GeoJSON contient « TAC  C1 » avec deux espaces, le formulaire envoie « TAC C1 »). */
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const ALLOWED_FIELDS = new Set([
  "TAG", "NAP", "NAA", "NAC", "NAD", "TAR 1", "TAR 2", "TAC C1", "TAC C2", "TAC C3", "TAC C4",
  "TAA 1.1.1", "TAA 1.1.2", "TAA 1.1.3", "TAA 1.1.4", "TAA 1.2.1", "TAA 1.2.2", "TAA 1.2.3", "TAA 1.2.4",
  "TAA 2.1.1", "TAA 2.1.2", "TAA 2.1.3", "TAA 2.1.4", "TAA 2.2.1", "TAA 2.2.2", "TAA 2.2.3", "TAA 2.2.4",
]);

// Retrouve le vrai nom de la colonne dans la ligne (même si l'espacement diffère)
const cle = (props: any, nom: string): string =>
  Object.keys(props ?? {}).find((k) => norm(k) === norm(nom)) ?? nom;

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GEOJSON_PATH;
  const historyPath = process.env.HISTORY_PATH || "historique-mises-a-jour.json";
  const authSecret = process.env.AUTH_SECRET;

  if (!token || !owner || !repo || !branch || !path) {
    console.error("Configuration GitHub incomplète.");
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const apiUrl =
    `https://api.github.com/repos/${owner}/${repo}/contents/` +
    path.split("/").map(encodeURIComponent).join("/");

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const headersRaw = { ...headers, Accept: "application/vnd.github.raw+json" };

  /* ============================================================
     GET : lecture
  ============================================================ */
  if (req.method === "GET") {
    const tout = String(req.query?.tout ?? "") === "1";
    const annee = String(req.query?.annee ?? "");
    const mois = String(req.query?.mois ?? "");
    const uc = String(req.query?.uc ?? "");

    // Toutes les lignes, pour le tableau de bord
    if (tout) {
      try {
        const rawResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
          headers: headersRaw,
          cache: "no-store",
        });

        if (!rawResponse.ok) {
          console.error("Erreur GitHub lors du chargement complet :", rawResponse.status, await rawResponse.text());
          return res.status(502).json({ error: "Impossible de lire le fichier GeoJSON depuis GitHub." });
        }

        const geojson = JSON.parse(await rawResponse.text());
        if (!Array.isArray(geojson.features)) {
          return res.status(500).json({ error: "Le fichier GeoJSON ne contient pas de tableau features valide." });
        }
        return res.status(200).json(geojson);
      } catch (error) {
        console.error("Erreur de lecture complète du GeoJSON :", error);
        return res.status(500).json({ error: "Impossible de charger les données du GeoJSON." });
      }
    }

    // Une seule ligne, pour le formulaire de mise à jour
    if (!annee || !mois || !uc) {
      return res.status(400).json({ error: "Année, mois et unité de coordination obligatoires." });
    }

    try {
      const rawResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: headersRaw,
        cache: "no-store",
      });

      if (!rawResponse.ok) {
        console.error("Erreur GitHub lors du chargement d'une ligne :", rawResponse.status, await rawResponse.text());
        return res.status(502).json({ error: "Impossible de lire le fichier GeoJSON depuis GitHub." });
      }

      const geojson = JSON.parse(await rawResponse.text());
      if (!Array.isArray(geojson.features)) {
        return res.status(500).json({ error: "Le fichier GeoJSON ne contient pas de tableau features valide." });
      }

      const matches = geojson.features.filter((feature: any) => {
        const p = feature.properties ?? {};
        return Number(p["Année"]) === Number(annee) && p["Mois"] === mois && p["UC"] === uc;
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

      // Les colonnes sont renvoyées avec un espacement normalisé (« TAC C1 »)
      const properties: Record<string, any> = {};
      for (const [k, v] of Object.entries(matches[0].properties ?? {})) properties[norm(k)] = v;

      return res.status(200).json({ properties });
    } catch (error) {
      console.error("Erreur de chargement d'une ligne GeoJSON :", error);
      return res.status(500).json({ error: "Impossible de lire les données enregistrées." });
    }
  }

  /* ============================================================
     POST : modifier une ligne existante
  ============================================================ */
  if (!authSecret) {
    console.error("AUTH_SECRET manquant.");
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { token: jeton, annee, mois, uc, updates } = req.body ?? {};

  // Utilisateur connecté, d'après le jeton de session signé par /api/auth
  const utilisateur = lireJeton(jeton, authSecret);
  if (!utilisateur) {
    return res.status(401).json({
      error: "Session expirée ou invalide. Fermez cette fenêtre et reconnectez-vous.",
    });
  }

  if (
    !Number.isInteger(Number(annee)) ||
    typeof mois !== "string" || !mois.trim() ||
    typeof uc !== "string" || !uc.trim() ||
    !updates || typeof updates !== "object" || Array.isArray(updates)
  ) {
    return res.status(400).json({ error: "Données du formulaire invalides." });
  }

  const updateEntries: [string, number][] = Object.entries(updates).map(
    ([key, value]) => [norm(key), value as number]
  );

  if (
    updateEntries.length === 0 ||
    updateEntries.some(([key, value]) => !ALLOWED_FIELDS.has(key) || typeof value !== "number" || !Number.isFinite(value))
  ) {
    return res.status(400).json({ error: "Champs à mettre à jour invalides." });
  }

  try {
    // Première lecture : SHA du fichier GitHub
    const metadataResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      headers,
      cache: "no-store",
    });

    if (!metadataResponse.ok) {
      console.error("Erreur GitHub pendant la récupération du SHA :", metadataResponse.status, await metadataResponse.text());
      throw new Error("Impossible de lire les métadonnées du fichier.");
    }

    const fileMetadata = await metadataResponse.json();
    if (!fileMetadata.sha) throw new Error("GitHub n'a pas fourni le SHA du fichier.");

    // Deuxième lecture : contenu réel du GeoJSON
    const rawResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: headersRaw,
      cache: "no-store",
    });

    if (!rawResponse.ok) {
      console.error("Erreur GitHub pendant la lecture brute :", rawResponse.status, await rawResponse.text());
      throw new Error("Impossible de lire le GeoJSON.");
    }

    const geojson = JSON.parse(await rawResponse.text());
    if (!Array.isArray(geojson.features)) throw new Error("Le fichier ne contient pas de tableau features.");

    // Recherche stricte : aucune nouvelle ligne ne sera créée
    const matches = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};
      return Number(p["Année"]) === Number(annee) && p["Mois"] === mois && p["UC"] === uc;
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

    // Anciennes et nouvelles valeurs pour l'historique (nom de colonne normalisé : « TAC C1 »)
    const changements = updateEntries.map(([key, nouvelleValeur]) => ({
      colonne: key,
      ancienneValeur: properties[cle(properties, key)] ?? null,
      nouvelleValeur,
    }));

    // Modifier uniquement les colonnes reçues et autorisées
    for (const [key, value] of updateEntries) {
      const vraieCle = cle(properties, key);
      if (!Object.prototype.hasOwnProperty.call(properties, vraieCle)) {
        return res.status(400).json({ error: `La colonne "${key}" n'existe pas dans cette ligne.` });
      }
      properties[vraieCle] = value;
    }

    // ============================================
    // Mise à jour automatique de la ligne "Tous"
    // ============================================
    const unitesIndividuelles = new Set(["UCT", "UCR-A", "UCR-B", "UCR-D", "UCR-F", "UCR-FD"]);

    const lignesTous = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};
      return Number(p["Année"]) === Number(annee) && p["Mois"] === mois && String(p["UC"] ?? "").trim() === "Tous";
    });

    if (lignesTous.length !== 1) {
      return res.status(409).json({
        error:
          lignesTous.length === 0
            ? `La ligne UC "Tous" n'existe pas pour ${annee} - ${mois}.`
            : `Plusieurs lignes UC "Tous" existent pour ${annee} - ${mois}.`,
      });
    }

    const lignesUC = geojson.features.filter((feature: any) => {
      const p = feature.properties ?? {};
      return Number(p["Année"]) === Number(annee) && p["Mois"] === mois && unitesIndividuelles.has(String(p["UC"] ?? "").trim());
    });

    const proprietesTous = lignesTous[0].properties;

    // Colonnes numériques : SOMME
    const colonnesSomme = ["NAP", "NAA", "NAC", "NAD"];

    // Colonnes de pourcentage (stockées en décimal) : MOYENNE
    const colonnesMoyenne = [
      "TAG", "TAR 1", "TAR 2", "TAC C1", "TAC C2", "TAC C3", "TAC C4",
      "TAA 1.1.1", "TAA 1.1.2", "TAA 1.1.3", "TAA 1.1.4", "TAA 1.2.1", "TAA 1.2.2", "TAA 1.2.3", "TAA 1.2.4",
      "TAA 2.1.1", "TAA 2.1.2", "TAA 2.1.3", "TAA 2.1.4", "TAA 2.2.1", "TAA 2.2.2", "TAA 2.2.3", "TAA 2.2.4",
    ];

    for (const colonne of colonnesSomme) {
      proprietesTous[cle(proprietesTous, colonne)] = lignesUC.reduce((total: number, feature: any) => {
        const valeur = feature.properties?.[cle(feature.properties, colonne)];
        if (valeur === null || valeur === undefined || valeur === "") return total;
        const nombre = Number(valeur);
        return total + (Number.isFinite(nombre) ? nombre : 0);
      }, 0);
    }

    for (const colonne of colonnesMoyenne) {
      const valeurs = lignesUC
        .map((feature: any) => feature.properties?.[cle(feature.properties, colonne)])
        .filter((v: any) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)))
        .map(Number);

      proprietesTous[cle(proprietesTous, colonne)] =
        valeurs.length > 0 ? valeurs.reduce((t: number, v: number) => t + v, 0) / valeurs.length : 0;
    }

    // Enregistrer le GeoJSON sur GitHub en conservant le SHA
    const saveResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Mise à jour des activités ${annee} - ${mois} - ${uc}`,
        content: Buffer.from(JSON.stringify(geojson, null, 2), "utf8").toString("base64"),
        sha: fileMetadata.sha,
        branch,
      }),
    });

    if (!saveResponse.ok) {
      console.error("Erreur GitHub pendant la sauvegarde :", await saveResponse.text());
      throw new Error("GitHub n'a pas accepté la sauvegarde.");
    }

    // ============================================
    // Historique
    // ============================================
    try {
      const historyUrl =
        `https://api.github.com/repos/${owner}/${repo}/contents/` +
        historyPath.split("/").map(encodeURIComponent).join("/");

      let historyData: { entries: any[] } = { entries: [] };
      let historySha: string | undefined;

      // SHA (fonctionne même si le fichier dépasse 1 Mo)
      const historyMeta = await fetch(`${historyUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });

      if (historyMeta.status !== 404) {
        if (!historyMeta.ok) {
          console.error("Impossible de lire l'historique :", historyMeta.status, await historyMeta.text());
          throw new Error("Impossible de lire le fichier d'historique sur GitHub.");
        }
        historySha = (await historyMeta.json()).sha;

        // Contenu brut
        const historyRaw = await fetch(`${historyUrl}?ref=${encodeURIComponent(branch)}`, { headers: headersRaw, cache: "no-store" });
        if (!historyRaw.ok) throw new Error("Impossible de lire le contenu de l'historique.");

        const parsed = JSON.parse(await historyRaw.text());
        if (!Array.isArray(parsed.entries)) {
          throw new Error("Le fichier d'historique ne contient pas un tableau entries valide.");
        }
        historyData = parsed;
      }

      // Ajouter la nouvelle entrée sans supprimer les précédentes
      historyData.entries.unshift({
        id: `${Date.now()}-${utilisateur}`,
        date: new Date().toISOString(),
        utilisateur,
        identifiant: utilisateur,
        annee: Number(annee),
        mois,
        uc,
        champsModifies: updateEntries.map(([key]) => key),
        changements,
      });

      const saveHistoryResponse = await fetch(historyUrl, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Historique de mise à jour ${annee} - ${mois} - ${uc}`,
          content: Buffer.from(JSON.stringify(historyData, null, 2), "utf8").toString("base64"),
          ...(historySha ? { sha: historySha } : {}),
          branch,
        }),
      });

      if (!saveHistoryResponse.ok) {
        console.error("Erreur de sauvegarde de l'historique :", saveHistoryResponse.status, await saveHistoryResponse.text());
        throw new Error("Le GeoJSON est enregistré, mais la sauvegarde de l'historique a échoué.");
      }
    } catch (historyError) {
      console.error("Erreur d'enregistrement de l'historique :", historyError);
      return res.status(500).json({
        error: historyError instanceof Error ? historyError.message : "Erreur lors de l'enregistrement de l'historique.",
        geojsonEnregistre: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mise à jour et historique enregistrés dans GitHub.",
      userName: utilisateur,
    });
  } catch (error) {
    console.error("Erreur de sauvegarde GeoJSON :", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Échec de la sauvegarde du GeoJSON.",
    });
  }
}
