import type { NextApiRequest, NextApiResponse } from "next";

const UC_PAR_ONGLET: Record<string, string> = {
  "UCT (ext)": "UCT",
  "UCR-N (Boeny-ext)": "UCR-B",
  "UCR-N (DIANA-ext)": "UCR-D",
  "UCR-S (Ambositra-ext)": "UCR-A",
  "UCR-S (Farafangana-ext)": "UCR-F",
  "UCR-S (Fort-dauphin-ext)": "UCR-FD",
};
const ADMIN = new Set(["Toky", "Zo", "Joary"]);
const ONGLET_PAR_UTILISATEUR: Record<string, string> = {
  Allan: "UCR-N (DIANA-ext)",
  Herimanga: "UCR-N (Boeny-ext)",
  Michael: "UCR-S (Ambositra-ext)",
  Tsinjo: "UCR-S (Fort-dauphin-ext)",
  Njaka: "UCR-S (Farafangana-ext)",
};
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const UC_AGREGEES = ["UCT", "UCR-A", "UCR-B", "UCR-D", "UCR-F", "UCR-FD"];

const SUM_FIELDS = [
  "D (EUR)", "DC", "BT", "PA (EUR)",
  "D C1 (EUR)", "D C2 (EUR)", "D C3 (EUR)", "D C4 (EUR)",
  "PA C1 (EUR)", "PA C2 (EUR)", "PA C3 (EUR)", "PA C4 (EUR)",
  "DF (EUR)", "DA (EUR)", "DC (EUR)", "DMI (EUR)", "DMP (EUR)",
  "PAF (EUR)", "PAA (EUR)", "PAC (EUR)", "PAMI (EUR)", "PAMP (EUR)",
];
const COMPONENTS = [
  { spend: "D C1 (EUR)", plan: "PA C1 (EUR)", rate: "TAC  C1" },
  { spend: "D C2 (EUR)", plan: "PA C2 (EUR)", rate: "TAC C2" },
  { spend: "D C3 (EUR)", plan: "PA C3 (EUR)", rate: "TAC  C3" },
  { spend: "D C4 (EUR)", plan: "PA C4 (EUR)", rate: "TAC C4" },
];
const INSTRUMENTS = [
  { spend: "DF (EUR)", plan: "PAF (EUR)", rate: "TAC F" },
  { spend: "DA (EUR)", plan: "PAA (EUR)", rate: "TAC A" },
  { spend: "DC (EUR)", plan: "PAC (EUR)", rate: "TAC C" },
  { spend: "DMI (EUR)", plan: "PAMI (EUR)", rate: "TAC MI" },
  { spend: "DMP (EUR)", plan: "PAMP (EUR)", rate: " TAC MP" },
];

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}
function monthIndex(value: unknown): number {
  return MOIS.indexOf(String(value));
}
function assertOwn(p: Record<string, any>, key: string, value: number) {
  if (!Object.prototype.hasOwnProperty.call(p, key)) {
    throw new Error(`La colonne GeoJSON « ${key} » est absente de la ligne.`);
  }
  p[key] = value;
}

async function readGitHubFile(apiUrl: string, branch: string, headers: Record<string, string>) {
  const metadataResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (!metadataResponse.ok) throw new Error(`Lecture des métadonnées GitHub impossible (${metadataResponse.status}).`);
  const metadata = await metadataResponse.json();
  if (!metadata.sha) throw new Error("GitHub n'a pas retourné le SHA du GeoJSON.");
  const rawResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: { ...headers, Accept: "application/vnd.github.raw+json" }, cache: "no-store",
  });
  if (!rawResponse.ok) throw new Error(`Lecture du GeoJSON impossible (${rawResponse.status}).`);
  const geojson = JSON.parse(await rawResponse.text());
  if (!Array.isArray(geojson.features)) throw new Error("Le GeoJSON ne contient pas de tableau features.");
  return { metadata, geojson };
}

async function appendHistory(owner: string, repo: string, branch: string, path: string, headers: Record<string, string>, entry: any) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/");
  let sha: string | undefined;
  let entries: any[] = [];
  const response = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
  if (response.ok) {
    const metadata = await response.json();
    sha = metadata.sha;
    const content = Buffer.from(String(metadata.content).replace(/\n/g, ""), "base64").toString("utf8");
    const parsed = JSON.parse(content);
    entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  } else if (response.status !== 404) {
    throw new Error("Impossible de lire l'historique des mises à jour.");
  }
  entries.unshift(entry);
  const save = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Historique import décaissements ${entry.annee}`,
      content: Buffer.from(JSON.stringify({ entries }, null, 2), "utf8").toString("base64"),
      ...(sha ? { sha } : {}), branch,
    }),
  });
  if (!save.ok) throw new Error("L'historique n'a pas pu être sauvegardé.");
}

function recalcTous(features: any[], annee: number, mois: string) {
  const tous = features.find((f: any) => Number(f.properties?.["Année"]) === annee && f.properties?.Mois === mois && f.properties?.UC === "Tous");
  if (!tous) return;
  const lignes = features.filter((f: any) => Number(f.properties?.["Année"]) === annee && f.properties?.Mois === mois && UC_AGREGEES.includes(f.properties?.UC));
  if (!lignes.length) return;
  const pTous = tous.properties;
  for (const key of SUM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(pTous, key)) pTous[key] = lignes.reduce((s: number, f: any) => s + num(f.properties?.[key]), 0);
  }
  for (const year of [2024, 2025, 2026, 2027, 2028, 2029, 2030]) {
    const eurKey = `BD ${year} (EUR)`;
    const pctKey = `BD ${year} (%)`;
    if (Object.prototype.hasOwnProperty.call(pTous, eurKey)) {
      pTous[eurKey] = lignes.reduce((s: number, f: any) => s + num(f.properties?.[eurKey]), 0);
    }
    if (Object.prototype.hasOwnProperty.call(pTous, pctKey)) {
      pTous[pctKey] = ratio(num(pTous[eurKey]), num(pTous.BT));
    }
  }
  pTous.TD = ratio(num(pTous.DC), num(pTous.BT));
  if (Object.prototype.hasOwnProperty.call(pTous, "TAC")) pTous.TAC = pTous.TD;
  for (const item of [...COMPONENTS, ...INSTRUMENTS]) {
    if (Object.prototype.hasOwnProperty.call(pTous, item.rate)) {
      const weighted = lignes.reduce((s: number, f: any) => s + num(f.properties?.[item.rate]) * num(f.properties?.[item.plan]), 0);
      const plan = num(pTous[item.plan]);
      pTous[item.rate] = ratio(weighted, plan);
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GEOJSON_PATH;
  const accessPassword = process.env.PADDI_ACCESS_PASSWORD;
  if (!token || !owner || !repo || !branch || !path || !accessPassword) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { userName, motDePasse, imports } = req.body ?? {};
  const nom = typeof userName === "string" ? userName.trim() : "";
  if (motDePasse !== accessPassword || (!ADMIN.has(nom) && !ONGLET_PAR_UTILISATEUR[nom])) {
    return res.status(401).json({ error: "Accès refusé. Vérifiez votre utilisateur et votre mot de passe." });
  }
  if (!Array.isArray(imports) || imports.length === 0) return res.status(400).json({ error: "Aucune donnée Excel à importer." });

  const ongletsEnvoyes = imports.map((item: any) => String(item?.onglet ?? ""));
  if (ongletsEnvoyes.some((sheet: string) => !UC_PAR_ONGLET[sheet])) return res.status(400).json({ error: "Le fichier contient un onglet UC non autorisé à l'importation." });
  if (!ADMIN.has(nom) && (imports.length !== 1 || ongletsEnvoyes[0] !== ONGLET_PAR_UTILISATEUR[nom])) {
    return res.status(403).json({ error: "Vous n'êtes autorisé à importer que votre onglet Excel." });
  }
  if (new Set(ongletsEnvoyes).size !== ongletsEnvoyes.length) return res.status(400).json({ error: "Un même onglet est présent plusieurs fois dans l'import." });

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/` + path.split("/").map(encodeURIComponent).join("/");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

  try {
    const { metadata, geojson } = await readGitHubFile(apiUrl, branch, headers);
    const historyChanges: any[] = [];
    const touched: Array<{ annee: number; mois: string; uc: string }> = [];

    // Valider l'ensemble avant toute modification : l'import est tout-ou-rien.
    const prepared: any[] = [];
    for (const item of imports) {
      const expectedUC = UC_PAR_ONGLET[item.onglet];
      if (item.uc !== expectedUC || !Number.isInteger(Number(item.annee)) || !Array.isArray(item.mois) || item.mois.length === 0) {
        return res.status(400).json({ error: `Structure invalide pour l'onglet ${item.onglet}.` });
      }
      const year = Number(item.annee);
      const monthRows = [...item.mois].sort((a: any, b: any) => monthIndex(a.mois) - monthIndex(b.mois));
      if (monthRows.some((m: any) => monthIndex(m.mois) < 0) || new Set(monthRows.map((m: any) => m.mois)).size !== monthRows.length) {
        return res.status(400).json({ error: `Nom de mois invalide ou répété dans ${item.onglet}.` });
      }
      const features = monthRows.map((m: any) => {
        const matches = geojson.features.filter((f: any) => Number(f.properties?.["Année"]) === year && f.properties?.Mois === m.mois && f.properties?.UC === expectedUC);
        if (matches.length !== 1) throw new Error(`${m.mois} ${year} – ${expectedUC} : ${matches.length === 0 ? "ligne existante introuvable" : "plusieurs lignes correspondantes"}. Aucune ligne n'a été créée.`);
        return { month: m, feature: matches[0] };
      });
      prepared.push({ item, year, uc: expectedUC, monthRows: features });
    }

    for (const batch of prepared) {
      const { item, year, uc, monthRows } = batch;
      const firstImportedMonth = monthIndex(monthRows[0].month.mois);
      // Base = toutes les périodes antérieures à la première période importée.
      // Cela préserve par exemple janvier-mai pour les onglets dont le suivi commence en juin.
      const previousRows = geojson.features.filter((f: any) => {
        if (f.properties?.UC !== uc) return false;
        const rowYear = Number(f.properties?.["Année"]);
        return rowYear < year || (rowYear === year && monthIndex(f.properties?.Mois) >= 0 && monthIndex(f.properties?.Mois) < firstImportedMonth);
      });
      const previousYearRows = previousRows.filter((f: any) => Number(f.properties?.["Année"]) < year);
      const previousYearSorted = [...previousYearRows].sort((a: any, b: any) => Number(a.properties["Année"]) - Number(b.properties["Année"]) || monthIndex(a.properties.Mois) - monthIndex(b.properties.Mois));
      const lastPreviousYear = previousYearSorted[previousYearSorted.length - 1]?.properties ?? {};
      const cumulativeTotalBeforePreviousMonths = num(lastPreviousYear.DC) || previousYearRows.reduce((s: number, f: any) => s + num(f.properties?.["D (EUR)"]), 0);
      const currentYearBeforeMonths = previousRows.filter((f: any) => Number(f.properties?.["Année"]) === year);
      const currentYearTotalBeforeMonths = currentYearBeforeMonths.reduce((s: number, f: any) => s + num(f.properties?.["D (EUR)"]), 0);
      const cumulativeBefore = (field: string) => previousRows.reduce((s: number, f: any) => s + num(f.properties?.[field]), 0);
      let runningYearTotal = currentYearTotalBeforeMonths;
      let runningDMI = 0, runningDMP = 0, runningContracts = 0, runningPurchases = 0, runningFinancing = 0;
      let runningC1 = 0, runningC2 = 0, runningC3 = 0, runningC4 = 0;

      for (const entry of monthRows) {
        const { month, feature } = entry;
        const p = feature.properties as Record<string, any>;
        const m = month;
        const plan = item.budget;
        const updates: Record<string, number> = {
          "BT": num(plan.total), "PA (EUR)": num(plan.total),
          "PAF (EUR)": num(plan.financements), "PAA (EUR)": num(plan.achats), "PAC (EUR)": num(plan.contrats),
          "PAMI (EUR)": num(plan.dmi), "PAMP (EUR)": num(plan.dmp),
          "PA C1 (EUR)": num(plan.c1), "PA C2 (EUR)": num(plan.c2), "PA C3 (EUR)": num(plan.c3), "PA C4 (EUR)": num(plan.c4),
          "D (EUR)": num(m.total),
          "DMI (EUR)": num(m.dmi), "DMP (EUR)": num(m.dmp), "DC (EUR)": num(m.contrats),
          "DA (EUR)": num(m.achats), "DF (EUR)": num(m.financements),
          "D C1 (EUR)": num(m.c1), "D C2 (EUR)": num(m.c2), "D C3 (EUR)": num(m.c3), "D C4 (EUR)": num(m.c4),
        };
        for (const [key, value] of Object.entries(updates)) {
          if (!Object.prototype.hasOwnProperty.call(p, key)) throw new Error(`La colonne GeoJSON « ${key} » n'existe pas dans ${year} ${m.mois} ${uc}.`);
          const old = p[key] ?? null;
          if (old !== value) historyChanges.push({ colonne: `${m.mois} — ${key}`, ancienneValeur: old, nouvelleValeur: value, uc, annee: year, mois: m.mois });
          p[key] = value;
        }

        runningYearTotal += num(m.total);
        runningDMI += num(m.dmi); runningDMP += num(m.dmp); runningContracts += num(m.contrats); runningPurchases += num(m.achats); runningFinancing += num(m.financements);
        runningC1 += num(m.c1); runningC2 += num(m.c2); runningC3 += num(m.c3); runningC4 += num(m.c4);
        const lifetimeTotal = cumulativeTotalBeforePreviousMonths + runningYearTotal;
        const lifetimeDMI = cumulativeBefore("DMI (EUR)") + runningDMI;
        const lifetimeDMP = cumulativeBefore("DMP (EUR)") + runningDMP;
        const lifetimeContracts = cumulativeBefore("DC (EUR)") + runningContracts;
        const lifetimePurchases = cumulativeBefore("DA (EUR)") + runningPurchases;
        const lifetimeFinancing = cumulativeBefore("DF (EUR)") + runningFinancing;
        const lifetimeC1 = cumulativeBefore("D C1 (EUR)") + runningC1;
        const lifetimeC2 = cumulativeBefore("D C2 (EUR)") + runningC2;
        const lifetimeC3 = cumulativeBefore("D C3 (EUR)") + runningC3;
        const lifetimeC4 = cumulativeBefore("D C4 (EUR)") + runningC4;
        const calculated: Record<string, number> = {
          DC: lifetimeTotal,
          TD: ratio(lifetimeTotal, num(plan.total)),
          TAC: ratio(lifetimeTotal, num(plan.total)),
          "TAC F": ratio(lifetimeFinancing, num(plan.financements)),
          "TAC A": ratio(lifetimePurchases, num(plan.achats)),
          "TAC C": ratio(lifetimeContracts, num(plan.contrats)),
          "TAC MI": ratio(lifetimeDMI, num(plan.dmi)),
          " TAC MP": ratio(lifetimeDMP, num(plan.dmp)),
          "TAC  C1": ratio(lifetimeC1, num(plan.c1)),
          "TAC C2": ratio(lifetimeC2, num(plan.c2)),
          "TAC  C3": ratio(lifetimeC3, num(plan.c3)),
          "TAC C4": ratio(lifetimeC4, num(plan.c4)),
        };
        const bdEUR = `BD ${year} (EUR)`;
        const bdPct = `BD ${year} (%)`;
        if (Object.prototype.hasOwnProperty.call(p, bdEUR)) calculated[bdEUR] = runningYearTotal;
        if (Object.prototype.hasOwnProperty.call(p, bdPct)) calculated[bdPct] = ratio(runningYearTotal, num(plan.total));
        for (const [key, value] of Object.entries(calculated)) {
          if (!Object.prototype.hasOwnProperty.call(p, key)) {
            if (key.startsWith("BD ")) continue;
            throw new Error(`La colonne GeoJSON « ${key} » n'existe pas dans ${year} ${m.mois} ${uc}.`);
          }
          const old = p[key] ?? null;
          if (old !== value) historyChanges.push({ colonne: `${m.mois} — ${key}`, ancienneValeur: old, nouvelleValeur: value, uc, annee: year, mois: m.mois });
          p[key] = value;
        }
        touched.push({ annee: year, mois: m.mois, uc });
      }
    }

    // Recalculer l'UC agrégée « Tous » sans créer de ligne.
    for (const row of touched) recalcTous(geojson.features, row.annee, row.mois);

    const saveResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Import des décaissements Excel ${prepared.map((b: any) => b.year).join(", ")} (${prepared.map((b: any) => b.uc).join(", ")})`,
        content: Buffer.from(JSON.stringify(geojson, null, 2), "utf8").toString("base64"),
        sha: metadata.sha,
        branch,
      }),
    });
    if (!saveResponse.ok) throw new Error(`GitHub a refusé l'enregistrement du GeoJSON (${saveResponse.status}).`);

    let historySaved = false;
    try {
      await appendHistory(owner, repo, branch, process.env.HISTORY_PATH || "historique-mises-a-jour.json", headers, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString(),
        utilisateur: nom,
        identifiant: nom,
        annee: prepared[0].year,
        mois: "Import annuel (janvier-décembre)",
        uc: prepared.map((b: any) => b.uc).join(", "),
        nombreColonnesModifiees: historyChanges.length,
        changements: historyChanges,
      });
      historySaved = true;
    } catch (e) {
      console.error("GeoJSON enregistré, historique non enregistré :", e);
    }

    return res.status(200).json({
      success: true,
      historySaved,
      imported: prepared.map((b: any) => ({ onglet: b.item.onglet, uc: b.uc, annee: b.year, mois: b.monthRows.length })),
      message: historySaved ? "Import Excel enregistré avec son historique." : "Import enregistré, mais l'historique n'a pas pu être sauvegardé.",
    });
  } catch (error: any) {
    console.error("Erreur import décaissements :", error);
    return res.status(400).json({ error: error?.message || "Échec de l'importation Excel." });
  }
}
