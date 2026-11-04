/// <reference types="node" />
// api/gfw.ts — Fonction serverless Vercel
// Alertes de perte de couvert forestier (GFW, "Integrated Deforestation Alerts")
// Appel : /api/gfw?region=Analamanga&jours=90   (region=all pour tout Madagascar)
// Ajouter &debug=1 pour voir la requête SQL et la réponse brute de GFW.

const API = 'https://data-api.globalforestwatch.org';

// Rectangle englobant Madagascar (pour « Toutes les régions »)
const MADAGASCAR = {
  type: 'Polygon',
  coordinates: [[[42.3, -26], [50.9, -26], [50.9, -11.5], [42.3, -11.5], [42.3, -26]]],
};

// Allège les contours très détaillés pour ne pas alourdir la requête vers GFW
function eclaircir(anneau: number[][], max: number) {
  if (anneau.length <= max) return anneau;
  const pas = Math.ceil(anneau.length / max);
  const sortie = anneau.filter((_, i) => i % pas === 0);
  const premier = anneau[0];
  const dernier = sortie[sortie.length - 1];
  if (dernier[0] !== premier[0] || dernier[1] !== premier[1]) sortie.push(premier);
  return sortie;
}

function simplifier(geometry: any) {
  const MAX = 1500;
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map((a: number[][]) => eclaircir(a, MAX)) };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((p: number[][][]) => p.map((a) => eclaircir(a, MAX))),
    };
  }
  return geometry;
}

export default async function handler(req: any, res: any) {
  try {
    const cle = process.env.GFW_API_KEY;
    if (!cle) return res.status(500).json({ erreur: 'Variable GFW_API_KEY manquante sur Vercel.' });

    const region = String(req.query.region || 'all');
    const jours = Math.min(90, Math.max(1, parseInt(String(req.query.jours), 10) || 90));
    const hote = (req.headers['x-forwarded-host'] || req.headers.host) as string;

    // 1. Géométrie de la zone interrogée
    let geometry: any = MADAGASCAR;
    if (region !== 'all') {
      const rep = await fetch(`https://${hote}/data/madagascar_24_region.geojson`);
      if (!rep.ok) return res.status(500).json({ erreur: 'Fichier des régions introuvable.' });
      const data = await rep.json();
      const f = (data.features || []).find((x: any) => x.properties?.nom_reg === region);
      if (!f) return res.status(404).json({ erreur: `Région inconnue : ${region}` });
      geometry = simplifier(f.geometry);
    }

    // 2. Requête GFW : alertes et hectares par jour et par niveau de confiance
    const depuis = new Date(Date.now() - jours * 864e5).toISOString().slice(0, 10);
    const sql =
      `SELECT gfw_integrated_alerts__date, gfw_integrated_alerts__confidence, ` +
      `COUNT(*) AS alertes, SUM(area__ha) AS hectares FROM results ` +
      `WHERE gfw_integrated_alerts__date >= '${depuis}' ` +
      `GROUP BY gfw_integrated_alerts__date, gfw_integrated_alerts__confidence`;

    const rep = await fetch(`${API}/dataset/gfw_integrated_alerts/latest/query/json`, {
      method: 'POST',
      headers: {
        'x-api-key': cle,
        'Content-Type': 'application/json',
        Origin: `https://${hote}`,
      },
      body: JSON.stringify({ sql, geometry }),
    });

    const brut = await rep.json().catch(() => null);

    if (req.query.debug) return res.status(200).json({ statut: rep.status, sql, brut });
    if (!rep.ok || !brut?.data) {
      return res.status(502).json({ erreur: 'Réponse GFW invalide', statut: rep.status });
    }

    const lignes = brut.data.map((r: any) => ({
      date: r.gfw_integrated_alerts__date,
      confiance: r.gfw_integrated_alerts__confidence,
      alertes: Number(r.alertes ?? r.count ?? 0),
      ha: Number(r.hectares ?? r.sum ?? 0),
    }));

    // Les alertes ne changent qu'une fois par jour : on garde le résultat 6 h
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ region, depuis, jours, lignes });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
}
