/**
 * api/gfw-zone.ts : perte annuelle de couvert arboré (UMD/Hansen) à l'intérieur d'un polygone quelconque.
 *
 * POST /api/gfw-zone    corps JSON : { "geometry": { "type": "Polygon" | "MultiPolygon", "coordinates": [...] } }
 * Réponse               { "annees": [{ "annee": 2001, "ha": 123.4 }, ...] }
 *
 * La clé GFW reste ici, côté serveur (jamais dans la page). Utilise la même variable d'environnement
 * que votre api/gfw-perte.ts : adaptez le nom ci-dessous si ce n'est pas GFW_API_KEY.
 * Variable facultative : GFW_TCD (seuil de couvert arboré en %, 30 par défaut, comme les tuiles de la carte).
 */
export const config = { maxDuration: 60 }; // grandes régions : la requête raster peut dépasser 10 s

const URL_QUERY = "https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest/query/json";

async function interroger(sql: string, geometry: unknown, key: string) {
  const r = await fetch(URL_QUERY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ sql, geometry }),
  });
  if (!r.ok) throw new Error(`GFW ${r.status}`);
  return r.json();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST requis" });

  const key = process.env.GFW_API_KEY;
  if (!key) return res.status(500).json({ error: "GFW_API_KEY manquante côté serveur" });

  const geometry = req.body?.geometry;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
    return res.status(400).json({ error: "geometry (Polygon ou MultiPolygon) requise" });
  }

  const tcd = Number(process.env.GFW_TCD ?? 30);
  const base = "SELECT umd_tree_cover_loss__year, SUM(area__ha) AS ha FROM data WHERE umd_tree_cover_loss__year > 0";
  const groupe = " GROUP BY umd_tree_cover_loss__year";

  try {
    let json: any;
    try {
      // avec le seuil de couvert arboré (cohérent avec les tuiles de la carte)
      json = await interroger(`${base} AND umd_tree_cover_density_2000__threshold >= ${tcd}${groupe}`, geometry, key);
    } catch {
      // si le champ de seuil n'est pas accepté, on retombe sur toute la perte
      json = await interroger(`${base}${groupe}`, geometry, key);
    }

    const annees = (json?.data ?? [])
      .map((row: any) => {
        const annee = Number(row.umd_tree_cover_loss__year);
        const ha = Number(row.ha ?? row.area__ha ?? Object.values(row).find((v) => typeof v === "number" && v !== annee));
        return { annee, ha: Number.isFinite(ha) ? ha : 0 };
      })
      .filter((a: { annee: number }) => a.annee >= 2001)
      .sort((a: { annee: number }, b: { annee: number }) => a.annee - b.annee);

    return res.status(200).json({ annees });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || "GFW indisponible" });
  }
}
