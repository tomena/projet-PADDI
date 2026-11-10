/// <reference types="node" />
// api/gfw-perte.ts — Fonction serverless Vercel
// Superficie de perte de couvert arboré par année (UMD/Hansen via Global Forest Watch).
// Appels :
//   /api/gfw-perte?type=all
//   /api/gfw-perte?type=region&nom=Analamanga
//   /api/gfw-perte?type=ap&nom=Nom de l'aire protégée
//   /api/gfw-perte?type=paysage&nom=...
//   /api/gfw-perte?type=mbv&nom=...
//   /api/gfw-perte?type=communes&nom=Nom de l'aire protégée   ← NOUVEAU : toutes les communes riveraines
// Option : &debut=2001 pour changer la première année (défaut 2020 ; 2001 pour « communes »).
// Ajouter &debug=1 pour voir la requête SQL et la réponse brute de GFW.

const API = 'https://data-api.globalforestwatch.org';
const ANNEE_DEBUT = 2020;          // défaut pour all / region / ap / paysage / mbv
const ANNEE_DEBUT_COMMUNES = 2001; // les données UMD/Hansen démarrent en 2001
const SEUIL_COUVERT = 30; // densité minimale de couvert en 2000 (%), seuil standard de GFW
const SIMULTANES = 5;     // requêtes GFW en parallèle pour le type « communes »

// Si le champ du nom n'est pas détecté correctement, écrire ici son nom exact (ex. 'NOM_PAYSAGE')
const CLE_NOM_PAYSAGE: string | null = 'Paysage';
const CLE_NOM_MBV: string | null = 'Nom';

// Fichiers utilisés par le type « communes » (mêmes que dans Deforestation.tsx)
const FICHIER_BASE = 'Bases_Deforestation.geojson'; // champs : AP, Source, Commune
const FICHIER_COMMUNES = 'madagascar_communes.json'; // champ : NAME_4
const CLE_COMMUNE_GEO = 'NAME_4';

// Vercel : durée maximale (le type « communes » fait une requête GFW par commune)
export const config = { maxDuration: 60 };

const MADAGASCAR = {
  type: 'Polygon',
  coordinates: [[[42.3, -26], [50.9, -26], [50.9, -11.5], [42.3, -11.5], [42.3, -26]]],
};

const SOURCES: Record<
  string,
  { fichier: string; candidats: string[]; force: string | null; defaut: string; unique: boolean }
> = {
  region: { fichier: 'madagascar_24_region.geojson', candidats: ['nom_reg'], force: 'nom_reg', defaut: 'Région', unique: false },
  ap: { fichier: 'aire_protegee_paddi.geojson', candidats: ['nom_ap'], force: 'nom_ap', defaut: 'Aire protégée sans nom', unique: false },
  paysage: {
    fichier: 'paddi_paysage.geojson',
    candidats: ['nom_paysage', 'paysage', 'nom_pays', 'nom', 'name', 'libelle', 'label'],
    force: CLE_NOM_PAYSAGE,
    defaut: 'Paysage sans nom',
    unique: true,
  },
  mbv: {
    fichier: 'paddi_mbv.geojson',
    candidats: ['nom_mbv', 'mbv', 'nom_mb', 'nom_microbassin', 'micro_bassin', 'microbassin', 'nom', 'name', 'libelle', 'label'],
    force: CLE_NOM_MBV,
    defaut: 'Micro-bassin sans nom',
    unique: true,
  },
};

// Même logique que dans Pression.tsx : détection du champ « nom » et noms uniques
function trouverCleNom(features: any[], candidats: string[], force: string | null) {
  if (force) return force;
  const props = features.find((f) => f?.properties)?.properties || {};
  const cles = Object.keys(props);
  for (const c of candidats) {
    const k = cles.find((x) => x.toLowerCase() === c);
    if (k) return k;
  }
  return cles.find((k) => typeof props[k] === 'string') || '';
}

function nomsDesZones(features: any[], cle: string, defaut: string, unique: boolean) {
  const bruts = features.map((f) => String(f.properties?.[cle] ?? '').trim() || defaut);
  if (!unique) return bruts;
  const total: Record<string, number> = {};
  bruts.forEach((n) => (total[n] = (total[n] || 0) + 1));
  const vus: Record<string, number> = {};
  return bruts.map((n) => {
    vus[n] = (vus[n] || 0) + 1;
    return total[n] > 1 ? `${n} (${vus[n]})` : n;
  });
}

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

/* ---------- outils pour le type « communes » ---------- */
type Bbox = [number, number, number, number];

const normaliser = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const memeAire = (a: unknown, b: unknown) => {
  const x = normaliser(a), y = normaliser(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
};

function bboxDe(geometry: any): Bbox {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  const marche = (co: any) => {
    if (!Array.isArray(co)) return;
    if (typeof co[0] === 'number') {
      if (co[0] < a) a = co[0];
      if (co[0] > c) c = co[0];
      if (co[1] < b) b = co[1];
      if (co[1] > d) d = co[1];
      return;
    }
    for (const k of co) marche(k);
  };
  marche(geometry?.coordinates);
  return [a, b, c, d];
}

const seCroisent = (a: Bbox, b: Bbox) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);

async function lireJson(hote: string, fichier: string) {
  const rep = await fetch(`https://${hote}/data/${fichier}`);
  if (!rep.ok) throw new Error(`Fichier ${fichier} introuvable.`);
  return rep.json();
}

// Exécute `tache` sur chaque élément, avec au plus `n` appels simultanés
async function enParallele<T, R>(items: T[], n: number, tache: (x: T) => Promise<R>): Promise<R[]> {
  const sortie: R[] = new Array(items.length);
  let suivant = 0;
  const ouvriers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (suivant < items.length) {
      const i = suivant++;
      sortie[i] = await tache(items[i]);
    }
  });
  await Promise.all(ouvriers);
  return sortie;
}

/* ---------- requête GFW ---------- */
async function requeteGfw(geometry: any, debut: number, cle: string, hote: string) {
  const sql =
    `SELECT umd_tree_cover_loss__year, SUM(area__ha) AS hectares FROM results ` +
    `WHERE umd_tree_cover_loss__year >= ${debut} ` +
    `AND umd_tree_cover_density_2000__threshold >= ${SEUIL_COUVERT} ` +
    `GROUP BY umd_tree_cover_loss__year`;

  const rep = await fetch(`${API}/dataset/umd_tree_cover_loss/latest/query/json`, {
    method: 'POST',
    headers: { 'x-api-key': cle, 'Content-Type': 'application/json', Origin: `https://${hote}` },
    body: JSON.stringify({ sql, geometry }),
  });
  const brut = await rep.json().catch(() => null);
  return { sql, statut: rep.status, ok: rep.ok && !!brut?.data, brut };
}

function versAnnees(brut: any) {
  return (brut.data as any[])
    .map((r) => ({ annee: Number(r.umd_tree_cover_loss__year), ha: Number(r.hectares ?? r.sum ?? 0) }))
    .filter((a) => Number.isFinite(a.annee))
    .sort((a, b) => a.annee - b.annee);
}

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

// Perte annuelle de couvert arboré dans un polygone quelconque (POST)
async function perteParPolygone(req: VercelRequest, res: VercelResponse) {
  const key = process.env.GFW_API_KEY; // mettez ici le nom de variable que ce fichier utilise déjà
  if (!key) return res.status(500).json({ error: "Clé GFW manquante côté serveur" });

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
      json = await interroger(`${base} AND umd_tree_cover_density_2000__threshold >= ${tcd}${groupe}`, geometry, key);
    } catch {
      json = await interroger(`${base}${groupe}`, geometry, key);
    }
    const annees = (json?.data ?? [])
      .map((row: any) => {
        const annee = Number(row.umd_tree_cover_loss__year);
        const ha = Number(row.ha ?? row.area__ha);
        return { annee, ha: Number.isFinite(ha) ? ha : 0 };
      })
      .filter((a: { annee: number }) => a.annee >= 2001)
      .sort((a: { annee: number }, b: { annee: number }) => a.annee - b.annee);
    return res.status(200).json({ annees });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || "GFW indisponible" });
  }
}

export default async function handler(req: any, res: any) {
  try {
    const cle = process.env.GFW_API_KEY;
    if (!cle) return res.status(500).json({ erreur: 'Variable GFW_API_KEY manquante sur Vercel.' });
    if (req.method === "POST") return perteParPolygone(req, res);

    const type = String(req.query.type || 'all');
    const nom = String(req.query.nom || '');
    const hote = (req.headers['x-forwarded-host'] || req.headers.host) as string;
    const debutDemande = Number(req.query.debut);

    /* ======== NOUVEAU : toutes les communes riveraines d'une aire protégée ======== */
    if (type === 'communes') {
      if (!nom) return res.status(400).json({ erreur: 'Paramètre nom (aire protégée) manquant.' });
      const debut = Number.isFinite(debutDemande) && debutDemande >= 2001 ? debutDemande : ANNEE_DEBUT_COMMUNES;

      // 1. noms des communes riveraines dans la base de déforestation
      const base = await lireJson(hote, FICHIER_BASE);
      const nomsBase = new Map<string, string>(); // nom normalisé → nom tel qu'écrit dans la base
      for (const f of base.features || []) {
        const p = f?.properties || {};
        if (String(p.Source).trim().toLowerCase() !== 'commune') continue;
        if (String(p.AP).trim().toLowerCase() !== nom.trim().toLowerCase()) continue;
        const c = String(p.Commune ?? '').trim();
        if (c) nomsBase.set(normaliser(c), c);
      }
      if (!nomsBase.size) return res.status(404).json({ erreur: `Aucune commune pour l'aire protégée : ${nom}` });

      // 2. emprise de l'aire protégée (pour départager les communes homonymes)
      const aires = await lireJson(hote, SOURCES.ap.fichier);
      const geoAP = (aires.features || []).filter(
        (f: any) => f?.geometry && memeAire(f.properties?.[SOURCES.ap.force as string], nom)
      );
      const boites = geoAP.map((f: any) => bboxDe(f.geometry));
      const zone: Bbox | null = boites.length
        ? [
            Math.min(...boites.map((b: Bbox) => b[0])) - 0.5,
            Math.min(...boites.map((b: Bbox) => b[1])) - 0.5,
            Math.max(...boites.map((b: Bbox) => b[2])) + 0.5,
            Math.max(...boites.map((b: Bbox) => b[3])) + 0.5,
          ]
        : null;

      // 3. géométries des communes correspondantes
      const geoCommunes = await lireJson(hote, FICHIER_COMMUNES);
      const cibles: { nom: string; geometry: any }[] = [];
      for (const f of geoCommunes.features || []) {
        if (!f?.geometry) continue;
        const nomBase = nomsBase.get(normaliser(f.properties?.[CLE_COMMUNE_GEO]));
        if (!nomBase) continue;
        if (zone && !seCroisent(bboxDe(f.geometry), zone)) continue;
        cibles.push({ nom: nomBase, geometry: simplifier(f.geometry) });
      }
      if (!cibles.length) return res.status(404).json({ erreur: 'Aucune géométrie de commune trouvée.' });

      if (req.query.debug) {
        return res.status(200).json({ aire: nom, debut, communes: cibles.map((c) => c.nom) });
      }

      // 4. une requête GFW par commune (quelques-unes en parallèle)
      const resultats = await enParallele(cibles, SIMULTANES, async (c) => {
        try {
          const r = await requeteGfw(c.geometry, debut, cle, hote);
          return { nom: c.nom, annees: r.ok ? versAnnees(r.brut) : null };
        } catch {
          return { nom: c.nom, annees: null };
        }
      });

      // communes homonymes (plusieurs polygones) : on additionne leurs pertes par année
      const communes: Record<string, { annee: number; ha: number }[]> = {};
      let echecs = 0;
      for (const r of resultats) {
        if (!r.annees) { echecs++; continue; }
        const cumul = new Map<number, number>((communes[r.nom] || []).map((a) => [a.annee, a.ha]));
        r.annees.forEach((a) => cumul.set(a.annee, (cumul.get(a.annee) || 0) + a.ha));
        communes[r.nom] = Array.from(cumul, ([annee, ha]) => ({ annee, ha })).sort((a, b) => a.annee - b.annee);
      }
      if (!Object.keys(communes).length) return res.status(502).json({ erreur: 'Réponse GFW invalide' });

      // on ne met en cache que les réponses complètes
      if (!echecs) res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
      return res.status(200).json({ type, nom, seuil: SEUIL_COUVERT, debut, echecs, communes });
    }

    /* ======== Types existants ======== */
    // 1. Géométrie de la zone interrogée
    let geometry: any = MADAGASCAR;
    if (type !== 'all') {
      const source = SOURCES[type];
      if (!source) return res.status(400).json({ erreur: `Type inconnu : ${type}` });

      const data = await lireJson(hote, source.fichier).catch(() => null);
      if (!data) return res.status(500).json({ erreur: `Fichier ${source.fichier} introuvable.` });

      const features = (data.features || []).filter((f: any) => f?.geometry);
      const champ = trouverCleNom(features, source.candidats, source.force);
      const noms = nomsDesZones(features, champ, source.defaut, source.unique);
      const i = noms.indexOf(nom);
      if (i < 0) return res.status(404).json({ erreur: `Zone inconnue : ${nom}`, champ });
      geometry = simplifier(features[i].geometry);
    }

    // 2. Requête GFW : hectares perdus par année
    const debut = Number.isFinite(debutDemande) && debutDemande >= 2001 ? debutDemande : ANNEE_DEBUT;
    const r = await requeteGfw(geometry, debut, cle, hote);

    if (req.query.debug) return res.status(200).json({ statut: r.statut, sql: r.sql, brut: r.brut });
    if (!r.ok) return res.status(502).json({ erreur: 'Réponse GFW invalide', statut: r.statut });

    // Données annuelles : on garde le résultat 7 jours
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).json({ type, nom, seuil: SEUIL_COUVERT, annees: versAnnees(r.brut) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erreur: 'Erreur serveur' });
  }
}
