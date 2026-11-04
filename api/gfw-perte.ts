// api/gfw-perte.ts — Fonction serverless Vercel
// Superficie de perte de couvert arboré par année (UMD/Hansen via Global Forest Watch), depuis 2020.
// Appels :
//   /api/gfw-perte?type=all
//   /api/gfw-perte?type=region&nom=Analamanga
//   /api/gfw-perte?type=ap&nom=Nom de l'aire protégée
// Ajouter &debug=1 pour voir la requête SQL et la réponse brute de GFW.

const API = 'https://data-api.globalforestwatch.org';
const ANNEE_DEBUT = 2020;
const SEUIL_COUVERT = 30; // densité minimale de couvert en 2000 (%), seuil standard de GFW

const MADAGASCAR = {
  type: 'Polygon',
  coordinates: [[[42.3, -26], [50.9, -26], [50.9, -11.5], [42.3, -11.5], [42.3, -26]]],
};

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

    const type = String(req.query.type || 'all');
    const nom = String(req.query.nom || '');
    const hote = (req.headers['x-forwarded-host'] || req.headers.host) as string;

    // 1. Géométrie de la zone interrogée
    let geometry: any = MADAGASCAR;
    if (type === 'region' || type === 'ap') {
      const fichier = type === 'region' ? 'madagascar_24_region.geojson' : 'aire_protegee_paddi.geojson';
      const champ = type === 'region' ? 'nom_reg' : 'nom_ap';
      const rep = await fetch(`https://${hote}/data/${fichier}`);
      if (!rep.ok) return res.status(500).json({ erreur: `Fichier ${fichier} introuvable.` });
      const data = await rep.json();
      const f = (data.features || []).find((x: any) => x.properties?.[champ] === nom);
      if (!f) return res.status(404).json({ erreur: `Zone inconnue : ${nom}` });
      geometry = simplifier(f.geometry);
    }

    // 2. Requête GFW : hectares perdus par année
    const sql =
      `SELECT umd_tree_cover_loss__year, SUM(area__ha) AS hectares FROM results ` +
      `WHERE umd_tree_cover_loss__year >= ${ANNEE_DEBUT} ` +
      `AND umd_tree_cover_density_2000__threshold >= ${SEUIL_COUVERT} ` +
      `GROUP BY umd_tree_cover_loss__year`;

    const rep = await fetch(`${API}/dataset/umd_tree_cover_loss/latest/query/json`, {
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

    const annees = brut.data
      .map((r: any) => ({
        annee: Number(r.umd_tree_cover_loss__year),
        ha: Number(r.hectares ?? r.sum ?? 0),
      }))
      .filter((a: any) => Number.isFinite(a.annee))
      .sort((a: any, b: any) => a.annee - b.annee);

    // Données annuelles : on garde le résultat 7 jours
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).json({ type, nom, seuil: SEUIL_COUVERT, annees });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
}
