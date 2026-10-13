
export default async function handler(req: any, res: any) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({
        error: "Méthode non autorisée.",
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
        error: "Configuration GitHub incomplète.",
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
        cache: "no-store",
      });
  
      if (response.status === 404) {
        return res.status(200).json({ date: null });
      }
  
      if (!response.ok) {
        throw new Error("Impossible de lire l'historique GitHub.");
      }
  
      const metadata = await response.json();
  
      const content = Buffer.from(
        String(metadata.content || "").replace(/\n/g, ""),
        "base64"
      ).toString("utf8");
  
      const history = JSON.parse(content);
      const entries = Array.isArray(history.entries)
        ? history.entries
        : [];
  
      const dates = entries
        .map((entry: any) => entry.date)
        .filter(
          (date: any) =>
            typeof date === "string" &&
            !Number.isNaN(Date.parse(date))
        )
        .sort(
          (a: string, b: string) =>
            Date.parse(b) - Date.parse(a)
        );
  
      return res.status(200).json({
        date: dates[0] || null,
      });
    } catch (error) {
      console.error("Erreur dernière date de mise à jour :", error);
  
      return res.status(500).json({
        error: "Impossible de récupérer la dernière date.",
      });
    }
  }
  
