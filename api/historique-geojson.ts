
export default async function handler(req: any, res: any) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({
        error: "Méthode non autorisée.",
      });
    }
  
    // Protection : identifiant et mot de passe requis
    const identifiant = String(req.headers["x-paddi-identifiant"] || "")
      .trim()
      .toLowerCase();
  
    const motDePasse = String(req.headers["x-paddi-password"] || "");
    const accessPassword = process.env.PADDI_ACCESS_PASSWORD;
  
    const users: Record<string, string> = {
      "zo.ravelonirina@giz.de": "Zo",
      "anjarampifohazana.toky@giz.de": "Toky",
      "joary.andriamiharimanana@giz.de": "Joary",
    };
  
    if (!users[identifiant] || !accessPassword || motDePasse !== accessPassword) {
      return res.status(401).json({
        error: "Accès non autorisé.",
      });
    }
  
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const historyPath =
      process.env.HISTORY_PATH || "historique-mises-a-jour.json";
  
    if (!token || !owner || !repo) {
      return res.status(500).json({
        error: "Configuration GitHub incomplète sur Vercel.",
      });
    }
  
    try {
      const url =
        `https://api.github.com/repos/${owner}/${repo}/contents/` +
        historyPath.split("/").map(encodeURIComponent).join("/") +
        `?ref=${encodeURIComponent(branch)}`;
  
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
  
      if (response.status === 404) {
        return res.status(200).json({ entries: [] });
      }
  
      if (!response.ok) {
        console.error("Erreur de lecture historique GitHub:", await response.text());
        return res.status(502).json({
          error: "Impossible de lire l'historique.",
        });
      }
  
      const metadata = await response.json();
      const content = Buffer.from(
        String(metadata.content || "").replace(/\n/g, ""),
        "base64"
      ).toString("utf8");
  
      const history = JSON.parse(content);
  
      return res.status(200).json({
        entries: Array.isArray(history.entries) ? history.entries : [],
      });
    } catch (error) {
      console.error("Erreur API historique:", error);
  
      return res.status(500).json({
        error: "Erreur lors de la lecture de l'historique.",
      });
    }
  }
  
