import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* =====================================================================
   TYPES & CONSTANTES
   ===================================================================== */

type Bbox = [number, number, number, number]; // minLon, minLat, maxLon, maxLat

type Zone = { nom: string; feature: any; bbox: Bbox };

type Feu = {
  lon: number;
  lat: number;
  t: number; // timestamp UTC (ms)
  date: string;
  heure: string;
  conf: 'l' | 'n' | 'h' | null;
  frp: number | null;
  sat: string;
  jn: string;
  age: number; // en heures
};

type Histo = Record<
  string,
  { total: number; regions: Record<string, number>; aps: Record<string, number> }
>;

const TOUS = '__tous__';
const MADAGASCAR: L.LatLngBoundsExpression = [
  [-26, 42.3],
  [-11.5, 50.9],
];
const CLE_HISTO = 'pression_historique_feux_v1';
const RANG = { l: 1, n: 2, h: 3 } as const;

const THEMES = [
  { id: 'feux', label: 'Points de feux actifs' },
  { id: 'deforestation', label: 'Déforestation' },
  { id: 'erosion', label: 'Zones à risque d’érosion' },
] as const;
type Theme = (typeof THEMES)[number]['id'];

const rangAlerte = (c: string) => (c === 'high' ? 3 : c === 'nominal' ? 2 : 1);

// Perte annuelle de couvert (UMD/Hansen) : dernière année disponible chez GFW
const ANNEE_MIN = 2020;
const ANNEE_MAX = 2025; // à mettre à jour quand GFW publie l'année suivante
const ANNEES = Array.from({ length: ANNEE_MAX - ANNEE_MIN + 1 }, (_, i) => ANNEE_MIN + i);
type PerteAn = { annee: number; ha: number };

// Au-delà de ce nombre de zones, on ne calcule pas les hectares une par une (trop de requêtes GFW)
const MAX_ZONES = 12;

// Champ « nom » dans tes fichiers : paddi_paysage.geojson → "Paysage", paddi_mbv.geojson → "Nom"
// (mettre les mêmes valeurs dans api/gfw-perte.ts)
const CLE_NOM_PAYSAGE: string | null = 'Paysage';
const CLE_NOM_MBV: string | null = 'Nom';
const CANDIDATS_PAYSAGE = ['paysage', 'nom_paysage', 'nom', 'name'];
const CANDIDATS_MBV = ['nom', 'nom_mbv', 'mbv', 'name'];

const FONDS: Record<
  string,
  { label: string; url: string; attribution: string; apercu: string }
> = {
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    apercu: 'linear-gradient(135deg,#2c4a33,#7d8a52)',
  },
  topo: {
    label: 'Topographique',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    apercu: 'linear-gradient(135deg,#cfe3c0,#e8d9b0)',
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    apercu: 'linear-gradient(135deg,#e9e2cf,#b7d1a0)',
  },
};

const nf = (n: number) => n.toLocaleString('fr-FR');

const couleurAge = (age: number) =>
  age <= 24 ? 'rgb(200,15,15)' : age <= 48 ? '#f97316' : '#facc15';

/* =====================================================================
   GÉOMÉTRIE
   ===================================================================== */

function parcourirPoints(coords: any, cb: (x: number, y: number) => void) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number') {
    cb(coords[0], coords[1]);
    return;
  }
  for (const c of coords) parcourirPoints(c, cb);
}

function bboxDe(geometry: any): Bbox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  parcourirPoints(geometry?.coordinates, (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  return [minX, minY, maxX, maxY];
}

function pointDansAnneau(lon: number, lat: number, anneau: number[][]) {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const xi = anneau[i][0],
      yi = anneau[i][1],
      xj = anneau[j][0],
      yj = anneau[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

function pointDansPolygone(lon: number, lat: number, geometry: any): boolean {
  if (!geometry) return false;
  const verifier = (poly: number[][][]) => {
    if (!pointDansAnneau(lon, lat, poly[0])) return false;
    for (let i = 1; i < poly.length; i++) {
      if (pointDansAnneau(lon, lat, poly[i])) return false; // trou
    }
    return true;
  };
  if (geometry.type === 'Polygon') return verifier(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(verifier);
  return false;
}

// Test rapide : boîte englobante d'abord, polygone ensuite
function dansZone(lon: number, lat: number, z: Zone) {
  const b = z.bbox;
  if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) return false;
  return pointDansPolygone(lon, lat, z.feature.geometry);
}

function boitesSeCroisent(a: Bbox, b: Bbox) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

// Une zone (aire protégée, périphérie) appartient à une région si l'un de ses
// sommets (ou le centre de sa boîte) tombe dans la région.
function zoneDansRegion(z: Zone, region: Zone) {
  if (!boitesSeCroisent(z.bbox, region.bbox)) return false;
  const points: number[][] = [];
  parcourirPoints(z.feature.geometry?.coordinates, (x, y) => points.push([x, y]));
  const pas = Math.max(1, Math.floor(points.length / 40));
  for (let i = 0; i < points.length; i += pas) {
    if (dansZone(points[i][0], points[i][1], region)) return true;
  }
  const cx = (z.bbox[0] + z.bbox[2]) / 2;
  const cy = (z.bbox[1] + z.bbox[3]) / 2;
  return dansZone(cx, cy, region);
}

// Champs de tes fichiers : paddi_mbv.geojson → "Aire_Prot" (aire protégée) et "Paysage"
const PROP_MBV_AIRE = 'Aire_Prot';
const PROP_MBV_PAYSAGE = 'Paysage';
// paddi_paysage.geojson → champ "Aires_Prot" (aire protégée du paysage)
const PROP_PAYSAGE_AIRE = 'Aires_Prot';

const normaliser = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Même nom, ou l'un contenu dans l'autre (ex. « Ankarana » et « Réserve spéciale d'Ankarana »)
const memeAire = (a: unknown, b: unknown) => {
  const x = normaliser(a);
  const y = normaliser(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
};

// Deux zones s'emboîtent ou se chevauchent (dans un sens ou dans l'autre)
function zoneAutour(z: Zone, conteneur: Zone) {
  return zoneDansRegion(z, conteneur) || zoneDansRegion(conteneur, z);
}

function compterParZone(feux: Feu[], zones: Zone[], unique = false) {
  const compte = new Array(zones.length).fill(0);
  for (const f of feux) {
    for (let i = 0; i < zones.length; i++) {
      if (dansZone(f.lon, f.lat, zones[i])) {
        compte[i]++;
        if (unique) break;
      }
    }
  }
  return compte as number[];
}

function preparerZones(data: any, cle: string, defaut: string): Zone[] {
  return (data?.features || [])
    .filter((f: any) => f?.geometry)
    .map((f: any) => ({
      nom: f.properties?.[cle] || defaut,
      feature: f,
      bbox: bboxDe(f.geometry),
    }));
}

/* =====================================================================
   DONNÉES FEUX
   ===================================================================== */

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

// Même logique côté serveur (api/gfw-perte.ts) : champ du nom + noms rendus uniques
function preparerZonesAuto(data: any, candidats: string[], force: string | null, defaut: string): Zone[] {
  const features = (data?.features || []).filter((f: any) => f?.geometry);
  const cle = trouverCleNom(features, candidats, force);
  const bruts: string[] = features.map((f: any) => String(f.properties?.[cle] ?? '').trim() || defaut);
  const total: Record<string, number> = {};
  bruts.forEach((n) => (total[n] = (total[n] || 0) + 1));
  const vus: Record<string, number> = {};
  return features.map((f: any, i: number) => {
    const n = bruts[i];
    vus[n] = (vus[n] || 0) + 1;
    return { nom: total[n] > 1 ? `${n} (${vus[n]})` : n, feature: f, bbox: bboxDe(f.geometry) };
  });
}

function niveauConfiance(c: any): 'l' | 'n' | 'h' | null {
  if (c == null || c === '') return null;
  if (typeof c === 'string' && Number.isNaN(Number(c))) {
    const v = c.toLowerCase();
    if (v.startsWith('h')) return 'h';
    if (v.startsWith('n')) return 'n';
    if (v.startsWith('l')) return 'l';
    return null;
  }
  const n = Number(c); // MODIS : 0-100
  return n >= 80 ? 'h' : n >= 30 ? 'n' : 'l';
}

function analyserFeux(features: any[]): Omit<Feu, 'age'>[] {
  const sortie: Omit<Feu, 'age'>[] = [];
  for (const f of features) {
    const p = f?.properties || {};
    const c = f?.geometry?.coordinates;
    if (!c || !p.acq_date || p.acq_time == null) continue;
    const h = String(p.acq_time).padStart(4, '0');
    const t = new Date(`${p.acq_date}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    const frp = Number(p.frp);
    sortie.push({
      lon: c[0],
      lat: c[1],
      t,
      date: p.acq_date,
      heure: `${h.slice(0, 2)}:${h.slice(2, 4)}`,
      conf: niveauConfiance(p.confidence),
      frp: Number.isFinite(frp) ? frp : null,
      sat: p.satellite ?? '',
      jn: p.daynight ?? '',
    });
  }
  return sortie;
}

function useGeoJSON(url: string) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let actif = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url} introuvable`);
        return r.json();
      })
      .then((j) => actif && setData(j))
      .catch((e) => console.error(e));
    return () => {
      actif = false;
    };
  }, [url]);
  return data;
}

/* =====================================================================
   HISTORIQUE MENSUEL (compteurs par jour, stockés dans le navigateur)
   ===================================================================== */

function lireHisto(): Histo {
  try {
    return JSON.parse(localStorage.getItem(CLE_HISTO) || '{}');
  } catch {
    return {};
  }
}

function ecrireHisto(h: Histo) {
  try {
    localStorage.setItem(CLE_HISTO, JSON.stringify(h));
  } catch (e) {
    console.error('Historique non enregistré', e);
  }
}

function telechargerCSV(nom: string, lignes: (string | number)[][]) {
  const csv =
    '\ufeff' +
    lignes
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/* =====================================================================
   COUCHES LEAFLET
   ===================================================================== */

function CoucheZones({
  zones,
  style,
  cle,
  onClick,
}: {
  zones: Zone[];
  style: (z: Zone) => L.PathOptions;
  cle: string; // change quand le style doit être recalculé
  onClick?: (z: Zone) => void;
}) {
  const map = useMap();
  const styleRef = useRef(style);
  const clickRef = useRef(onClick);
  styleRef.current = style;
  clickRef.current = onClick;

  useEffect(() => {
    if (!zones.length) return;
    const groupe = L.featureGroup();
    zones.forEach((z) => {
      const couche = L.geoJSON(z.feature, { style: () => styleRef.current(z) });
      if (z.nom) couche.bindTooltip(z.nom, { sticky: true });
      couche.on('click', () => clickRef.current?.(z));
      couche.addTo(groupe);
    });
    groupe.addTo(map);
    return () => {
      map.removeLayer(groupe);
    };
  }, [zones, cle, map]);

  return null;
}

function CoucheFeux({ feux }: { feux: Feu[] }) {
  const map = useMap();

  useEffect(() => {
    const rayon = (zoom: number) => Math.max(2.5, Math.min(9, 2 + (zoom - 5) * 0.75));
    const renderer = L.canvas({ padding: 0.5 });
    const groupe = L.featureGroup();

    feux.forEach((f) => {
      const m = L.circleMarker([f.lat, f.lon], {
        radius: rayon(map.getZoom()),
        fillColor: couleurAge(f.age),
        color: '#ffffff',
        weight: 0.6,
        opacity: 0.9,
        fillOpacity: 0.92,
        renderer,
      });
      m.bindPopup(() => {
        const conf = f.conf === 'h' ? 'élevée' : f.conf === 'n' ? 'nominale' : f.conf === 'l' ? 'faible' : 'n/d';
        const jr = new Date(f.t).toLocaleDateString('fr-FR');
        return `<div style="font:13px/1.5 system-ui"><strong>Détection satellite</strong><br/>
          ${jr} à ${f.heure} UTC<br/>
          Confiance : ${conf}<br/>
          ${f.frp != null ? `Puissance : ${f.frp} MW<br/>` : ''}
          ${f.sat ? `Satellite : ${f.sat}` : ''}</div>`;
      });
      m.addTo(groupe);
    });
    groupe.addTo(map);

    const maj = () => {
      const r = rayon(map.getZoom());
      groupe.eachLayer((l) => l instanceof L.CircleMarker && l.setRadius(r));
    };
    map.on('zoomend', maj);
    return () => {
      map.off('zoomend', maj);
      map.removeLayer(groupe);
    };
  }, [feux, map]);

  return null;
}

function FocusCarte({ zone, maxZoom }: { zone: Zone | null; maxZoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!zone) {
      map.fitBounds(MADAGASCAR, { padding: [10, 10] });
      return;
    }
    const b = L.geoJSON(zone.feature).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom });
  }, [zone, maxZoom, map]);
  return null;
}

// Couche GFW : zones de perte de couvert arboré pour la période choisie
function CouchePerte({ debut, fin }: { debut: number; fin: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('perte')) {
      const pane = map.createPane('perte');
      pane.style.zIndex = '250'; // au-dessus du fond de carte, sous les contours
      pane.style.pointerEvents = 'none';
    }
    const c = L.tileLayer(
  `https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=${debut}&end_year=${fin}&tcd=30&render_type=true_color`,
  { pane: "perte", maxNativeZoom: 12, opacity: 0.95, attribution: "Perte de couvert © UMD/Hansen, GFW" }
).addTo(map);
    return () => {
      map.removeLayer(couche);
    };
  }, [debut, fin, map]);
  return null;
}

// Voile clair sur tout ce qui est hors de la région / aire protégée choisie
function MasqueZone({ zone }: { zone: Zone }) {
  const map = useMap();
  useEffect(() => {
    const monde: L.LatLngTuple[] = [[-89, -179], [-89, 179], [89, 179], [89, -179]];
    const g = zone.feature.geometry;
    const polys: number[][][][] =
      g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const trous = polys.map((p) => p[0].map(([x, y]) => [y, x] as L.LatLngTuple));
    const couche = L.polygon([monde, ...trous], {
      stroke: false,
      fillColor: '#f1f4f7',
      fillOpacity: 0.82,
      interactive: false,
    });
    couche.addTo(map);
    return () => {
      map.removeLayer(couche);
    };
  }, [zone, map]);
  return null;
}

function ListeZones({ items, vide }: { items: { nom: string; texte: string }[]; vide: string }) {
  if (!items.length) return <p className="pr-vide">{vide}</p>;
  return (
    <div className="pr-liste">
      {items.map((i) => (
        <div key={i.nom} className="pr-ligne">
          <span>{i.nom}</span>
          <strong>{i.texte}</strong>
        </div>
      ))}
    </div>
  );
}

function Redimension() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer().parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/* =====================================================================
   COMPOSANT PRINCIPAL
   ===================================================================== */

export default function Pression() {
  // ---- Filtres
  const [region, setRegion] = useState(TOUS);
  const [ap, setAp] = useState(TOUS);
  const [periode, setPeriode] = useState<24 | 48 | 72>(72);
  const [confiance, setConfiance] = useState<'l' | 'n' | 'h'>('l');
  const [theme, setTheme] = useState<Theme>('feux');
  const [joursDef, setJoursDef] = useState<7 | 30 | 90>(30);
  const [anneeDebut, setAnneeDebut] = useState(ANNEE_MIN);
  const [anneeFin, setAnneeFin] = useState(ANNEE_MAX);

  // ---- Interface
  const [fond, setFond] = useState('topo');
  const [menu, setMenu] = useState<null | 'fond' | 'couches' | 'export'>(null);
  const [couches, setCouches] = useState({
    regions: true,
    aires: true,
    peripheries: false,
    feux: true,
    perte: true,
    paysages: true,
    mbv: true,
  });

  // ---- Données géographiques
  const regionsData = useGeoJSON('/data/madagascar_24_region.geojson');
  const apData = useGeoJSON('/data/aire_protegee_paddi.geojson');
  const communesData = useGeoJSON('/data/madagascar_communes.json');
  const periphData = useGeoJSON('/data/peripherie_5km_paddi.geojson');
  const paysageData = useGeoJSON('/data/paddi_paysage.geojson');
  const mbvData = useGeoJSON('/data/paddi_mbv.geojson');

  const regionsZ = useMemo(() => preparerZones(regionsData, 'nom_reg', 'Région'), [regionsData]);
  const apZ = useMemo(() => preparerZones(apData, 'nom_ap', 'Aire protégée sans nom'), [apData]);
  const periphZ = useMemo(() => preparerZones(periphData, 'nom_ap', ''), [periphData]);
  const communesZ = useMemo(
    () => preparerZones(communesData, 'NAME_4', 'Commune sans nom'),
    [communesData]
  );

  const paysagesZ = useMemo(
    () => preparerZonesAuto(paysageData, CANDIDATS_PAYSAGE, CLE_NOM_PAYSAGE, 'Paysage sans nom'),
    [paysageData]
  );
  const mbvZ = useMemo(
    () => preparerZonesAuto(mbvData, CANDIDATS_MBV, CLE_NOM_MBV, 'Micro-bassin sans nom'),
    [mbvData]
  );

  // ---- Feux NASA FIRMS
  const [feuxBruts, setFeuxBruts] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [derniereMaj, setDerniereMaj] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(Date.now());

  const chargerFeux = useCallback(async () => {
    try {
      setChargement(true);
      setErreur('');
      const rep = await fetch('/api/firms');
      if (!rep.ok) throw new Error('Impossible de récupérer les données FIRMS.');
      const geojson = await rep.json();
      setFeuxBruts(Array.isArray(geojson.features) ? geojson.features : []);
      setDerniereMaj(Date.now());
    } catch (e) {
      console.error(e);
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerFeux();
    const rafraichir = setInterval(chargerFeux, 15 * 60 * 1000); // données : toutes les 15 min
    const horloge = setInterval(() => setMaintenant(Date.now()), 60 * 1000); // ancienneté : chaque minute
    return () => {
      clearInterval(rafraichir);
      clearInterval(horloge);
    };
  }, [chargerFeux]);

  const feux = useMemo(() => analyserFeux(feuxBruts), [feuxBruts]);

  // ---- Chaîne de filtrage ------------------------------------------------
  const feuxAges: Feu[] = useMemo(
    () =>
      feux
        .map((f) => ({ ...f, age: (maintenant - f.t) / 3.6e6 }))
        .filter((f) => f.age <= 72 && f.age >= -1),
    [feux, maintenant]
  );

  // 1. confiance
  const feuxConf = useMemo(
    () => feuxAges.filter((f) => RANG[f.conf ?? 'n'] >= RANG[confiance]),
    [feuxAges, confiance]
  );

  // 2. région
  const regionZone = useMemo(
    () => (region === TOUS ? null : regionsZ.find((z) => z.nom === region) || null),
    [region, regionsZ]
  );
  const feuxRegion = useMemo(
    () => (regionZone ? feuxConf.filter((f) => dansZone(f.lon, f.lat, regionZone)) : feuxConf),
    [feuxConf, regionZone]
  );

  // aires protégées et périphéries de la région choisie uniquement
  const apsVisibles = useMemo(
    () => (regionZone ? apZ.filter((z) => zoneDansRegion(z, regionZone)) : apZ),
    [apZ, regionZone]
  );
  const periphVisibles = useMemo(
    () => (regionZone ? periphZ.filter((z) => zoneDansRegion(z, regionZone)) : periphZ),
    [periphZ, regionZone]
  );

  // 3. aire protégée
  const apZone = useMemo(
    () => (ap === TOUS ? null : apsVisibles.find((z) => z.nom === ap) || null),
    [ap, apsVisibles]
  );
  const periphSel = useMemo(() => {
    if (!apZone) return periphVisibles;
    const parNom = periphVisibles.filter((p) => p.nom && p.nom === apZone.nom);
    return parNom.length
      ? parNom
      : periphVisibles.filter((p) => boitesSeCroisent(p.bbox, apZone.bbox));
  }, [apZone, periphVisibles]);

  const feuxZone = useMemo(
    () =>
      apZone
        ? feuxRegion.filter(
            (f) =>
              dansZone(f.lon, f.lat, apZone) || periphSel.some((p) => dansZone(f.lon, f.lat, p))
          )
        : feuxRegion,
    [feuxRegion, apZone, periphSel]
  );

  // Micro-bassins et paysages : affichés seulement quand une aire protégée est choisie.
  // Micro-bassins = ceux dont le champ "Aire_Prot" correspond à l'aire protégée
  // (à défaut, ceux qui la touchent) ; paysages = ceux de ces micro-bassins.
  const mbvVisibles = useMemo(() => {
    if (!apZone) return [];
    const parNom = mbvZ.filter((z) => memeAire(z.feature.properties?.[PROP_MBV_AIRE], apZone.nom));
    return parNom.length ? parNom : mbvZ.filter((z) => zoneAutour(z, apZone));
  }, [mbvZ, apZone]);

  const paysagesVisibles = useMemo(() => {
    if (!apZone) return [];
    // tous les paysages de l'aire protégée (champ "Aires_Prot") + ceux de ses micro-bassins
    const nomsMbv = new Set(
      mbvVisibles.map((z) => normaliser(z.feature.properties?.[PROP_MBV_PAYSAGE])).filter(Boolean)
    );
    const liste = paysagesZ.filter(
      (z) =>
        memeAire(z.feature.properties?.[PROP_PAYSAGE_AIRE], apZone.nom) ||
        nomsMbv.has(normaliser(z.feature.properties?.[CLE_NOM_PAYSAGE ?? 'Paysage']))
    );
    return liste.length ? liste : paysagesZ.filter((z) => zoneAutour(z, apZone));
  }, [paysagesZ, mbvVisibles, apZone]);

  // 4. période → ce qui est affiché sur la carte
  const feuxAffiches = useMemo(() => feuxZone.filter((f) => f.age <= periode), [feuxZone, periode]);
  const feuxRegionPeriode = useMemo(
    () => feuxRegion.filter((f) => f.age <= periode),
    [feuxRegion, periode]
  );

  // ---- Statistiques des 6 cartes ----------------------------------------
  const stats24 = feuxZone.filter((f) => f.age <= 24).length;
  const stats48 = feuxZone.filter((f) => f.age <= 48).length;
  const stats72 = feuxZone.length;

  const statsAP = useMemo(() => {
    const c = compterParZone(feuxRegionPeriode, apsVisibles);
    return apsVisibles
      .map((z, i) => ({ nom: z.nom, nombre: c[i] }))
      .sort((a, b) => b.nombre - a.nombre);
  }, [feuxRegionPeriode, apsVisibles]);

  const statsPaysages = useMemo(() => {
    const c = compterParZone(feuxAffiches, paysagesVisibles);
    return paysagesVisibles
      .map((z, i) => ({ nom: z.nom, nombre: c[i] }))
      .filter((x) => x.nombre > 0)
      .sort((a, b) => b.nombre - a.nombre);
  }, [feuxAffiches, paysagesVisibles]);

  const statsMbv = useMemo(() => {
    const c = compterParZone(feuxAffiches, mbvVisibles);
    return mbvVisibles
      .map((z, i) => ({ nom: z.nom, nombre: c[i] }))
      .filter((x) => x.nombre > 0)
      .sort((a, b) => b.nombre - a.nombre);
  }, [feuxAffiches, mbvVisibles]);

  const feuxPeriph = useMemo(
    () => feuxAffiches.filter((f) => periphSel.some((p) => dansZone(f.lon, f.lat, p))),
    [feuxAffiches, periphSel]
  );

  const topCommunes = useMemo(() => {
    if (!communesZ.length || !feuxAffiches.length) return [];
    const c = compterParZone(feuxAffiches, communesZ, true);
    return communesZ
      .map((z, i) => ({ nom: z.nom, nombre: c[i] }))
      .filter((x) => x.nombre > 0)
      .sort((a, b) => b.nombre - a.nombre)
      .slice(0, 3);
  }, [feuxAffiches, communesZ]);

  // Chronologie : un bloc toutes les 6 heures sur 72 h
  const chronologie = useMemo(() => {
    const blocs = new Array(12).fill(0);
    feuxZone.forEach((f) => {
      const i = Math.min(11, Math.max(0, Math.floor(f.age / 6)));
      blocs[i]++;
    });
    return blocs as number[]; // indice 0 = les 6 dernières heures
  }, [feuxZone]);

  // ---- Historique mensuel ------------------------------------------------
  const [nbJoursHisto, setNbJoursHisto] = useState(() => Object.keys(lireHisto()).length);

  useEffect(() => {
    if (!feux.length || !regionsZ.length || !apZ.length) return;

    const parJour: Record<string, Feu[]> = {};
    feux.forEach((f) => {
      (parJour[f.date] = parJour[f.date] || []).push(f as Feu);
    });

    const histo = lireHisto();
    for (const [jour, liste] of Object.entries(parJour)) {
      if (histo[jour] && histo[jour].total >= liste.length) continue;
      const cr = compterParZone(liste, regionsZ, true);
      const ca = compterParZone(liste, apZ);
      const regions: Record<string, number> = {};
      const aps: Record<string, number> = {};
      regionsZ.forEach((z, i) => cr[i] > 0 && (regions[z.nom] = cr[i]));
      apZ.forEach((z, i) => ca[i] > 0 && (aps[z.nom] = ca[i]));
      histo[jour] = { total: liste.length, regions, aps };
    }

    const limite = Date.now() - 31 * 864e5;
    Object.keys(histo).forEach((j) => {
      if (new Date(`${j}T00:00:00Z`).getTime() < limite) delete histo[j];
    });

    ecrireHisto(histo);
    setNbJoursHisto(Object.keys(histo).length);
  }, [feux, regionsZ, apZ]);

  const exporterVue = () => {
    const lignes: (string | number)[][] = [
      ['date', 'heure_utc', 'latitude', 'longitude', 'region', 'confiance', 'puissance_mw', 'satellite', 'jour_nuit'],
    ];
    feuxAffiches.forEach((f) => {
      const r = regionZone?.nom || regionsZ.find((z) => dansZone(f.lon, f.lat, z))?.nom || '';
      lignes.push([
        f.date,
        f.heure,
        f.lat,
        f.lon,
        r,
        f.conf === 'h' ? 'élevée' : f.conf === 'n' ? 'nominale' : f.conf === 'l' ? 'faible' : '',
        f.frp ?? '',
        f.sat,
        f.jn,
      ]);
    });
    telechargerCSV(`feux_vue_${new Date().toISOString().slice(0, 10)}.csv`, lignes);
    setMenu(null);
  };

  const exporterHistorique = () => {
    const histo = lireHisto();
    const lignes: (string | number)[][] = [['date', 'type', 'nom', 'nombre_de_feux']];
    Object.keys(histo)
      .sort()
      .forEach((jour) => {
        const h = histo[jour];
        lignes.push([jour, 'Madagascar', 'Total', h.total]);
        Object.entries(h.regions).forEach(([n, v]) => lignes.push([jour, 'Région', n, v]));
        Object.entries(h.aps).forEach(([n, v]) => lignes.push([jour, 'Aire protégée', n, v]));
      });
    telechargerCSV(`feux_historique_${new Date().toISOString().slice(0, 10)}.csv`, lignes);
    setMenu(null);
  };

  // ---- Actions -----------------------------------------------------------
  const choisirRegion = (nom: string) => {
    setRegion(nom);
    setAp(TOUS);
  };
  const filtresModifies =
    region !== TOUS || ap !== TOUS || periode !== 72 || confiance !== 'l' || joursDef !== 30 ||
    anneeDebut !== ANNEE_MIN || anneeFin !== ANNEE_MAX;
  const reinitialiser = () => {
    setRegion(TOUS);
    setAp(TOUS);
    setPeriode(72);
    setConfiance('l');
    setJoursDef(30);
    setAnneeDebut(ANNEE_MIN);
    setAnneeFin(ANNEE_MAX);
  };

  const nomsRegions = useMemo(
    () => Array.from(new Set(regionsZ.map((z) => z.nom))).sort((a, b) => a.localeCompare(b, 'fr')),
    [regionsZ]
  );
  const nomsAP = useMemo(
    () => Array.from(new Set(apsVisibles.map((z) => z.nom))).sort((a, b) => a.localeCompare(b, 'fr')),
    [apsVisibles]
  );

  const portee = apZone ? apZone.nom : region !== TOUS ? region : 'Tout Madagascar';
  const maxBloc = Math.max(1, ...chronologie);
  const heureMaj = derniereMaj
    ? new Date(derniereMaj).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  // ---- Déforestation : alertes GFW (une requête par région, 90 jours) -------
  const [alertes, setAlertes] = useState<any | null>(null);
  const [chargAlertes, setChargAlertes] = useState(false);
  const [erreurAlertes, setErreurAlertes] = useState('');

  useEffect(() => {
    if (theme !== 'deforestation') return;
    const ctrl = new AbortController();
    setAlertes(null);
    setErreurAlertes('');
    setChargAlertes(true);
    fetch(`/api/gfw?region=${encodeURIComponent(region === TOUS ? 'all' : region)}&jours=90`, {
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Impossible de récupérer les alertes GFW.');
        return r.json();
      })
      .then((j) => setAlertes(j))
      .catch((e) => {
        if (e.name !== 'AbortError') {
          console.error(e);
          setErreurAlertes(e instanceof Error ? e.message : 'Erreur inconnue');
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setChargAlertes(false);
      });
    return () => ctrl.abort();
  }, [theme, region]);

  const defStats = useMemo(() => {
    const toutes: any[] = alertes?.lignes || [];
    const lignes = toutes.filter((l) => rangAlerte(l.confiance) >= RANG[confiance]);
    const depuis = (j: number) => new Date(Date.now() - j * 864e5).toISOString().slice(0, 10);
    const somme = (j: number, cle: 'alertes' | 'ha') =>
      lignes.filter((l) => l.date >= depuis(j)).reduce((t, l) => t + (l[cle] || 0), 0);

    const jours: { date: string; n: number }[] = [];
    for (let i = joursDef - 1; i >= 0; i--) {
      const d = depuis(i);
      jours.push({ date: d, n: lignes.filter((l) => l.date === d).reduce((t, l) => t + l.alertes, 0) });
    }

    const parConf = { high: 0, nominal: 0, low: 0 };
    toutes
      .filter((l) => l.date >= depuis(joursDef))
      .forEach((l) => {
        const k = l.confiance === 'high' ? 'high' : l.confiance === 'nominal' ? 'nominal' : 'low';
        parConf[k] += l.alertes || 0;
      });

    return {
      total: somme(joursDef, 'alertes'),
      ha: somme(joursDef, 'ha'),
      p7: somme(7, 'alertes'),
      p30: somme(30, 'alertes'),
      p90: somme(90, 'alertes'),
      jours,
      maxJour: Math.max(1, ...jours.map((j) => j.n)),
      parConf,
    };
  }, [alertes, confiance, joursDef]);

  // ---- Déforestation : superficie perdue par année (GFW, depuis 2020) -------
  const [perte, setPerte] = useState<Record<string, PerteAn[] | 'err'>>({});
  const enCours = useRef(new Set<string>());

  useEffect(() => {
    if (theme !== 'deforestation') return;
    const besoins: [string, string, string][] = [
      region === TOUS ? ['all', 'all', ''] : [`region:${region}`, 'region', region],
    ];
    apsVisibles.forEach((a) => besoins.push([`ap:${a.nom}`, 'ap', a.nom]));
    if (paysagesVisibles.length <= MAX_ZONES) {
      paysagesVisibles.forEach((z) => besoins.push([`paysage:${z.nom}`, 'paysage', z.nom]));
    }
    if (mbvVisibles.length <= MAX_ZONES) {
      mbvVisibles.forEach((z) => besoins.push([`mbv:${z.nom}`, 'mbv', z.nom]));
    }

    besoins.forEach(([cle, type, nom]) => {
      if (perte[cle] || enCours.current.has(cle)) return;
      enCours.current.add(cle);
      fetch(`/api/gfw-perte?type=${type}&nom=${encodeURIComponent(nom)}`)
        .then((r) => {
          if (!r.ok) throw new Error('GFW');
          return r.json();
        })
        .then((j) => setPerte((p) => ({ ...p, [cle]: j.annees as PerteAn[] })))
        .catch(() => setPerte((p) => ({ ...p, [cle]: 'err' })))
        .finally(() => enCours.current.delete(cle));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, region, apsVisibles, paysagesVisibles, mbvVisibles]);

  const defPerte = useMemo(() => {
    const lire = (cle: string) => (Array.isArray(perte[cle]) ? (perte[cle] as PerteAn[]) : null);
    const somme = (rows: PerteAn[] | null) =>
      rows
        ? rows.filter((a) => a.annee >= anneeDebut && a.annee <= anneeFin).reduce((t, a) => t + a.ha, 0)
        : null;

    const cleScope = apZone ? `ap:${apZone.nom}` : region === TOUS ? 'all' : `region:${region}`;
    const scope = lire(cleScope);

    const parAnnee: PerteAn[] = [];
    for (let a = anneeDebut; a <= anneeFin; a++) {
      parAnnee.push({ annee: a, ha: scope?.find((x) => x.annee === a)?.ha ?? 0 });
    }

    const aires = apsVisibles
      .map((z) => {
        const cle = `ap:${z.nom}`;
        return { nom: z.nom, ha: somme(lire(cle)), erreur: perte[cle] === 'err' };
      })
      .sort((a, b) => (b.ha ?? -1) - (a.ha ?? -1));

    const liste = (zones: Zone[], pre: string) => ({
      trop: zones.length > MAX_ZONES,
      items: zones
        .map((z) => {
          const cle = `${pre}:${z.nom}`;
          const ha = somme(lire(cle));
          return {
            nom: z.nom,
            ha,
            texte: perte[cle] === 'err' ? 'n/d' : ha == null ? '…' : `${nf(Math.round(ha))} ha`,
          };
        })
        .sort((a, b) => (b.ha ?? -1) - (a.ha ?? -1)),
    });

    return {
      paysages: liste(paysagesVisibles, 'paysage'),
      mbvs: liste(mbvVisibles, 'mbv'),
      erreur: perte[cleScope] === 'err',
      total: somme(scope),
      parAnnee,
      maxAn: Math.max(1, ...parAnnee.map((a) => a.ha)),
      nbAnnees: anneeFin - anneeDebut + 1,
      aires,
    };
  }, [perte, anneeDebut, anneeFin, apZone, region, apsVisibles, paysagesVisibles, mbvVisibles]);

  // ---- Styles des zones sur la carte ------------------------------------
  const styleRegion = (z: Zone): L.PathOptions => {
    const sel = region !== TOUS && z.nom === region;
    return {
      color: sel ? '#0f766e' : '#475569',
      weight: sel ? 2.5 : region !== TOUS ? 0.6 : 1,
      fillColor: '#0f766e',
      fillOpacity: sel ? 0.14 : region !== TOUS ? 0 : 0.05,
    };
  };
  const styleAP = (z: Zone): L.PathOptions => {
    const sel = ap !== TOUS && z.nom === ap;
    return {
      color: sel ? '#052e16' : '#166534',
      weight: sel ? 2.5 : 1,
      fillColor: '#22c55e',
      fillOpacity: sel ? 0.36 : 0.2,
    };
  };
  const stylePeriph = (): L.PathOptions => ({
    color: '#b45309',
    weight: 1,
    dashArray: '4 4',
    fillColor: '#d97706',
    fillOpacity: 0.07,
  });

  const stylePaysage = (): L.PathOptions => ({
    color: '#6d28d9',
    weight: 2.5,
    fillColor: '#8b5cf6',
    fillOpacity: 0.06,
  });
  const styleMbv = (): L.PathOptions => ({
    color: '#0e7490',
    weight: 1.3,
    dashArray: '4 3',
    fillColor: '#22d3ee',
    fillOpacity: 0.16,
  });

  const optionsCouches: [keyof typeof couches, string][] = [
    ['feux', 'Détections de feux'],
    ['perte', 'Perte de couvert forestier'],
    ['paysages', 'Paysages'],
    ['mbv', 'Micro-bassins'],
    ['regions', 'Limites des régions'],
    ['aires', 'Aires protégées'],
    ['peripheries', 'Périphéries de 5 km'],
  ];

  /* ------------------------------------------------------------------ */

  return (
    <div className="pr">
      <style>{CSS}</style>

      {/* ============ EN-TÊTE + FILTRES ============ */}
      <header className="pr-top">
        <div className="pr-top-ligne">
          <div className="pr-marque">
            <div className="pr-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2c.6 3.2-1.4 4.6-2.8 6.4C7.6 10.4 7 12 8.2 13.8c.3-1.5 1.2-2.4 2.3-3 0 2.2 2.8 2.6 2.4 5.2-.2 1.2-.9 2-1.9 2.5 3.6.3 6.4-2.1 6.4-5.5 0-2.7-1.6-4.2-2.6-5.6C13.700 6 12.500 4.500 12 2Z" />
                <path d="M6.500 15.500C6 18.500 8.300 21 12 21c-3-.8-4.700-3-5.500-5.500Z" opacity=".55" />
              </svg>
            </div>
            <div>
              <h1 className="pr-titre">Zones de pression</h1>
              <p className="pr-sous">
                Feux actifs et pression sur les aires protégées
              </p>
            </div>
          </div>

          <div className="pr-actions">
            <span className={`pr-etat ${erreur ? 'err' : ''}`}>
              <i /> {chargement ? 'Mise à jour…' : erreur ? 'Hors ligne' : `Données de ${heureMaj}`}
            </span>
            <button className="pr-btn" onClick={chargerFeux} disabled={chargement} title="Actualiser les feux">
              Actualiser
            </button>
            <div className="pr-menu-wrap">
              <button className="pr-btn pr-btn-plein" onClick={() => setMenu(menu === 'export' ? null : 'export')}>
                Exporter
              </button>
              {menu === 'export' && (
                <div className="pr-pop pr-pop-droite">
                  <button className="pr-pop-item" onClick={exporterVue} disabled={!feuxAffiches.length}>
                    <strong>Vue actuelle</strong>
                    <span>{nf(feuxAffiches.length)} feux filtrés · CSV</span>
                  </button>
                  <button className="pr-pop-item" onClick={exporterHistorique} disabled={!nbJoursHisto}>
                    <strong>Historique du mois</strong>
                    <span>
                      {nbJoursHisto
                        ? `${nbJoursHisto} jour${nbJoursHisto > 1 ? 's' : ''} enregistré${nbJoursHisto > 1 ? 's' : ''} · CSV`
                        : 'Aucun jour enregistré pour l’instant'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pr-filtres">
          <label className="pr-champ">
            <span>Thème d’analyse</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pr-champ">
            <span>Région</span>
            <select value={region} onChange={(e) => choisirRegion(e.target.value)}>
              <option value={TOUS}>Toutes les régions</option>
              {nomsRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="pr-champ">
            <span>Aire protégée</span>
            <select value={apZone ? ap : TOUS} onChange={(e) => setAp(e.target.value)}>
              <option value={TOUS}>
                {region === TOUS ? 'Toutes les aires protégées' : 'Toutes celles de la région'}
              </option>
              {nomsAP.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <div className="pr-champ">
            <span>Période</span>
            <div className="pr-seg" role="group" aria-label="Période">
              {theme === 'deforestation'
                ? ([7, 30, 90] as const).map((j) => (
                    <button key={j} className={joursDef === j ? 'on' : ''} onClick={() => setJoursDef(j)}>
                      {j} j
                    </button>
                  ))
                : ([24, 48, 72] as const).map((h) => (
                    <button key={h} disabled={theme !== 'feux'} className={periode === h ? 'on' : ''} onClick={() => setPeriode(h)}>
                      {h} h
                    </button>
                  ))}
            </div>
          </div>

          {theme === 'deforestation' && (
            <div className="pr-champ">
              <span>Perte de couvert (années)</span>
              <div className="pr-annees">
                <select
                  aria-label="Année de début"
                  value={anneeDebut}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAnneeDebut(v);
                    if (v > anneeFin) setAnneeFin(v);
                  }}
                >
                  {ANNEES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <span>à</span>
                <select
                  aria-label="Année de fin"
                  value={anneeFin}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAnneeFin(v);
                    if (v < anneeDebut) setAnneeDebut(v);
                  }}
                >
                  {ANNEES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <label className="pr-champ">
            <span>Fiabilité</span>
            <select value={confiance} disabled={theme === 'erosion'} onChange={(e) => setConfiance(e.target.value as 'l' | 'n' | 'h')}>
              <option value="l">Toutes les détections</option>
              <option value="n">Nominale et plus</option>
              <option value="h">Élevée seulement</option>
            </select>
          </label>

          {filtresModifies && (
            <button className="pr-reset" onClick={reinitialiser}>
              Réinitialiser
            </button>
          )}
        </div>
      </header>

      {/* ============ CORPS ============ */}
      <div className="pr-body">
        {/* ---------- PANNEAU DE STATISTIQUES ---------- */}
        <aside className="pr-panel">
          {theme === 'erosion' && (
            <section className="pr-attente-theme">
              <h2>{THEMES.find((t) => t.id === theme)?.label}</h2>
              <p>
                Cette couche n’est pas encore intégrée. Les statistiques et la carte
                s’afficheront ici dès que les données seront ajoutées.
              </p>
            </section>
          )}
          {theme === 'deforestation' && (
            <>
              <section className="pr-hero">
                <div className="pr-hero-haut">
                  <div className="pr-hero-nb">{chargAlertes ? '…' : nf(defStats.total)}</div>
                  <div className="pr-hero-txt">
                    <strong>alertes de perte de couvert forestier</strong>
                    <span>
                      {region !== TOUS ? region : 'Tout Madagascar'} · {joursDef} derniers jours
                    </span>
                  </div>
                </div>

                {erreurAlertes ? (
                  <p className="pr-vide">{erreurAlertes}</p>
                ) : (
                  <>
                    <div className="pr-chrono" role="img" aria-label="Alertes par jour">
                      {defStats.jours.map((j) => (
                        <div key={j.date} className="pr-chrono-col" title={`${j.n} alertes · ${j.date}`}>
                          <div
                            className="pr-chrono-barre"
                            style={{
                              height: `${Math.max(4, (j.n / defStats.maxJour) * 100)}%`,
                              background: 'rgb(200,15,15)',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="pr-chrono-legende">
                      <span>il y a {joursDef} jours</span>
                      <span>aujourd’hui</span>
                    </div>
                  </>
                )}
              </section>

              <div className="pr-grille">
                <article className="pr-carte c1">
                  <h2>Alertes par période</h2>
                  <p className="pr-note">{region !== TOUS ? region : 'Tout Madagascar'}</p>
                  {[
                    ['7 derniers jours', defStats.p7, 'rgb(200,15,15)'],
                    ['30 derniers jours', defStats.p30, '#f97316'],
                    ['90 derniers jours', defStats.p90, '#facc15'],
                  ].map(([label, val, col]) => (
                    <div className="pr-ligne-barre" key={label as string}>
                      <div className="pr-ligne">
                        <span>{label}</span>
                        <strong>{nf(val as number)}</strong>
                      </div>
                      <div className="pr-barre">
                        <i style={{ width: `${defStats.p90 ? ((val as number) / defStats.p90) * 100 : 0}%`, background: col as string }} />
                      </div>
                    </div>
                  ))}
                </article>

                <article className="pr-carte c2">
                  <h2>Superficie déboisée à l’intérieur de l’aire protégée</h2>
                  <p className="pr-note">
                    {anneeDebut} – {anneeFin} · hectares
                  </p>
                  {defPerte.aires.length ? (
                    <div className="pr-liste">
                      {defPerte.aires.map((a) => (
                        <button
                          key={a.nom}
                          className={`pr-ligne pr-cliquable ${ap === a.nom ? 'on' : ''}`}
                          onClick={() => setAp(ap === a.nom ? TOUS : a.nom)}
                        >
                          <span>{a.nom}</span>
                          <strong>
                            {a.erreur ? 'n/d' : a.ha == null ? '…' : `${nf(Math.round(a.ha))} ha`}
                          </strong>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="pr-vide">Aucune aire protégée dans cette région</p>
                  )}
                </article>

                <article className="pr-carte c3">
                  <h2>Superficie déboisée par paysage</h2>
                  <p className="pr-note">
                    {anneeDebut} – {anneeFin} · hectares
                  </p>
                  {defPerte.paysages.trop ? (
                    <p className="pr-vide">
                      Trop de paysages ({defPerte.paysages.items.length}) : choisissez d’abord une région
                    </p>
                  ) : (
                    <ListeZones items={defPerte.paysages.items} vide={apZone ? 'Aucun paysage trouvé pour cette aire protégée' : 'Choisissez une aire protégée pour voir ses paysages'} />
                  )}
                </article>

                <article className="pr-carte c4">
                  <h2>Superficie déboisée par micro-bassin</h2>
                  <p className="pr-note">
                    {anneeDebut} – {anneeFin} · hectares
                  </p>
                  {defPerte.mbvs.trop ? (
                    <p className="pr-vide">
                      Trop de micro-bassins ({defPerte.mbvs.items.length}) : choisissez d’abord une région ou une aire protégée
                    </p>
                  ) : (
                    <ListeZones items={defPerte.mbvs.items} vide={apZone ? 'Aucun micro-bassin trouvé pour cette aire protégée' : 'Choisissez une aire protégée pour voir ses micro-bassins'} />
                  )}
                </article>

                <article className="pr-carte c5">
                  <h2>Superficie déboisée</h2>
                  <p className="pr-note">
                    {portee} · {anneeDebut} – {anneeFin}
                  </p>
                  <div className="pr-grand">
                    {defPerte.erreur ? 'n/d' : defPerte.total == null ? '…' : `${nf(Math.round(defPerte.total))} ha`}
                  </div>
                  <p className="pr-note">
                    {defPerte.total != null
                      ? `≈ ${nf(Math.round(defPerte.total / defPerte.nbAnnees))} ha par an en moyenne`
                      : 'Chargement des données GFW'}
                  </p>
                </article>

                <article className="pr-carte c6">
                  <h2>Évolution annuelle</h2>
                  <p className="pr-note">Hectares perdus par an · {portee}</p>
                  {defPerte.erreur ? (
                    <p className="pr-vide">Données indisponibles</p>
                  ) : (
                    defPerte.parAnnee.map((a) => (
                      <div className="pr-ligne-barre" key={a.annee}>
                        <div className="pr-ligne">
                          <span>{a.annee}</span>
                          <strong>{defPerte.total == null ? '…' : `${nf(Math.round(a.ha))} ha`}</strong>
                        </div>
                        <div className="pr-barre">
                          <i style={{ width: `${(a.ha / defPerte.maxAn) * 100}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </article>
              </div>
            </>
          )}
          {theme === 'feux' && (
          <>
          <section className="pr-hero">
            <div className="pr-hero-haut">
              <div className="pr-hero-nb">{nf(feuxAffiches.length)}</div>
              <div className="pr-hero-txt">
                <strong>feux détectés</strong>
                <span>
                  {portee} · {periode} dernières heures
                </span>
              </div>
            </div>

            <div className="pr-chrono" role="img" aria-label="Détections par tranche de 6 heures">
              {[...chronologie]
                .map((n, i) => ({ n, i }))
                .reverse()
                .map(({ n, i }) => (
                  <div key={i} className="pr-chrono-col" title={`${n} feux · il y a ${i * 6} à ${i * 6 + 6} h`}>
                    <div
                      className="pr-chrono-barre"
                      style={{
                        height: `${Math.max(4, (n / maxBloc) * 100)}%`,
                        background: couleurAge(i * 6 + 3),
                        opacity: i * 6 < periode ? 1 : 0.22,
                      }}
                    />
                  </div>
                ))}
            </div>
            <div className="pr-chrono-legende">
              <span>il y a 72 h</span>
              <span>maintenant</span>
            </div>
          </section>

          <div className="pr-grille">
            {/* CARTE 1 : par période */}
            <article className="pr-carte c1">
              <h2>Feux par période</h2>
              <p className="pr-note">{portee}</p>
              {[
                ['24 dernières heures', stats24, 'rgb(200,15,15)'],
                ['48 dernières heures', stats48, '#f97316'],
                ['72 dernières heures', stats72, '#facc15'],
              ].map(([label, val, col]) => (
                <div className="pr-ligne-barre" key={label as string}>
                  <div className="pr-ligne">
                    <span>{label}</span>
                    <strong>{nf(val as number)}</strong>
                  </div>
                  <div className="pr-barre">
                    <i style={{ width: `${stats72 ? ((val as number) / stats72) * 100 : 0}%`, background: col as string }} />
                  </div>
                </div>
              ))}
            </article>

            {/* CARTE 2 : aires protégées */}
            <article className="pr-carte c2">
              <h2>Feux à l’intérieur de l’aire protégée</h2>
              <p className="pr-note">
                {region === TOUS ? 'Toutes les régions' : region} · {periode} h
              </p>
              {statsAP.length ? (
                <div className="pr-liste">
                  {statsAP.map((a) => (
                    <button
                      key={a.nom}
                      className={`pr-ligne pr-cliquable ${ap === a.nom ? 'on' : ''}`}
                      onClick={() => setAp(ap === a.nom ? TOUS : a.nom)}
                    >
                      <span>{a.nom}</span>
                      <strong>{nf(a.nombre)}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="pr-vide">
                  {apZ.length ? 'Aucune aire protégée dans cette région' : 'Chargement…'}
                </p>
              )}
            </article>

            {/* CARTE 3 : paysages (à intégrer) */}
            <article className="pr-carte c3">
              <h2>Feux par paysage</h2>
              <p className="pr-note">
                {portee} · {periode} h
              </p>
              <ListeZones
                items={statsPaysages.map((p) => ({ nom: p.nom, texte: nf(p.nombre) }))}
                vide={!apZone ? 'Choisissez une aire protégée pour voir ses paysages' : paysagesVisibles.length ? 'Aucun feu détecté dans les paysages de cette aire protégée' : paysagesZ.length ? 'Aucun paysage trouvé pour cette aire protégée' : 'Chargement…'}
              />
            </article>

            {/* CARTE 4 : micro-bassins (à intégrer) */}
            <article className="pr-carte c4">
              <h2>Feux par micro-bassin</h2>
              <p className="pr-note">
                {portee} · {periode} h
              </p>
              <ListeZones
                items={statsMbv.map((p) => ({ nom: p.nom, texte: nf(p.nombre) }))}
                vide={!apZone ? 'Choisissez une aire protégée pour voir ses micro-bassins' : mbvVisibles.length ? 'Aucun feu détecté dans les micro-bassins de cette aire protégée' : mbvZ.length ? 'Aucun micro-bassin trouvé pour cette aire protégée' : 'Chargement…'}
              />
            </article>

            {/* CARTE 5 : périphéries */}
            <article className="pr-carte c5">
              <h2>Périphéries de 5 km</h2>
              <p className="pr-note">Autour des aires protégées · {periode} h</p>
              <div className="pr-grand">{nf(feuxPeriph.length)}</div>
              <p className="pr-note">
                {feuxAffiches.length
                  ? `${Math.round((feuxPeriph.length / feuxAffiches.length) * 100)} % des feux affichés`
                  : 'Aucun feu affiché'}
              </p>
            </article>

            {/* CARTE 6 : communes */}
            <article className="pr-carte c6">
              <h2>Top 3 des communes</h2>
              <p className="pr-note">Nombre de feux · {periode} h</p>
              {topCommunes.length ? (
                topCommunes.map((c, i) => (
                  <div className="pr-ligne-barre" key={c.nom + i}>
                    <div className="pr-ligne">
                      <span>
                        {i + 1}. {c.nom}
                      </span>
                      <strong>{nf(c.nombre)}</strong>
                    </div>
                    <div className="pr-barre">
                      <i style={{ width: `${(c.nombre / topCommunes[0].nombre) * 100}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="pr-vide">
                  {communesZ.length ? 'Aucun feu dans la zone choisie' : 'Chargement…'}
                </p>
              )}
            </article>
          </div>
          </>
          )}
        </aside>

        {/* ---------- CARTE ---------- */}
        <main className="pr-map">
          <MapContainer
            bounds={MADAGASCAR}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas={true}
          >
            <TileLayer
              key={fond}
              url={FONDS[fond].url}
              attribution={FONDS[fond].attribution}
            />
            <ZoomControl position="bottomright" />
            <Redimension />
            <FocusCarte zone={apZone || regionZone} maxZoom={apZone ? 11 : 9} />

            {theme === 'deforestation' && couches.perte && <CouchePerte debut={anneeDebut} fin={anneeFin} />}
            {theme === 'deforestation' && couches.perte && (apZone || regionZone) && (
              <MasqueZone zone={(apZone || regionZone) as Zone} />
            )}
            {couches.regions && (
              <CoucheZones zones={regionsZ} style={styleRegion} cle={region} onClick={(z) => choisirRegion(z.nom)} />
            )}
            {couches.paysages && <CoucheZones zones={paysagesVisibles} style={stylePaysage} cle="paysages" />}
            {couches.mbv && <CoucheZones zones={mbvVisibles} style={styleMbv} cle="mbv" />}
            {couches.peripheries && <CoucheZones zones={periphSel} style={stylePeriph} cle="p" />}
            {couches.aires && (
              <CoucheZones
                zones={apsVisibles}
                style={styleAP}
                cle={`${region}|${ap}`}
                onClick={(z) => setAp(z.nom === ap ? TOUS : z.nom)}
              />
            )}
            {theme === 'feux' && couches.feux && <CoucheFeux feux={feuxAffiches} />}
          </MapContainer>

          {/* Barre d'outils : fond de carte + couches */}
          <div className="pr-outils">
            <div className="pr-menu-wrap">
              <button className="pr-outil" onClick={() => setMenu(menu === 'fond' ? null : 'fond')}>
                <span className="pr-apercu" style={{ background: FONDS[fond].apercu }} />
                {FONDS[fond].label}
              </button>
              {menu === 'fond' && (
                <div className="pr-pop pr-pop-droite">
                  {Object.entries(FONDS).map(([id, f]) => (
                    <button
                      key={id}
                      className={`pr-pop-item pr-pop-fond ${fond === id ? 'on' : ''}`}
                      onClick={() => {
                        setFond(id);
                        setMenu(null);
                      }}
                    >
                      <span className="pr-apercu grand" style={{ background: f.apercu }} />
                      <strong>{f.label}</strong>
                      {fond === id && <span className="pr-fond-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pr-menu-wrap">
              <button className="pr-outil" onClick={() => setMenu(menu === 'couches' ? null : 'couches')}>
                Couches
              </button>
              {menu === 'couches' && (
                <div className="pr-pop pr-pop-droite">
                  {optionsCouches
                    .filter(([id]) =>
                      id === 'feux' ? theme === 'feux' : id === 'perte' ? theme === 'deforestation' : true
                    )
                    .map(([id, label]) => (
                    <label key={id} className="pr-check">
                      <input
                        type="checkbox"
                        checked={couches[id]}
                        onChange={() => setCouches((c) => ({ ...c, [id]: !c[id] }))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {menu && <div className="pr-voile" onClick={() => setMenu(null)} />}

          {/* Légende */}
          <div className={`pr-legende ${theme !== 'feux' ? 'cache' : ''}`}>
            <strong>Ancienneté des feux</strong>
            <div><i style={{ background: 'rgb(200,15,15)' }} />Moins de 24 h</div>
            <div><i style={{ background: '#f97316' }} />24 à 48 h</div>
            <div><i style={{ background: '#facc15' }} />48 à 72 h</div>
          </div>

          {apZone && (couches.paysages || couches.mbv) && (
            <div className="pr-legende pr-legende-zones">
              <strong>Zones de l’aire protégée</strong>
              {couches.paysages && (
                <div>
                  <i style={{ background: 'rgba(139,92,246,.3)', border: '2px solid #6d28d9', boxShadow: 'none', borderRadius: 3 }} />
                  Paysages
                </div>
              )}
              {couches.mbv && (
                <div>
                  <i style={{ background: 'rgba(34,211,238,.3)', border: '2px dashed #0e7490', boxShadow: 'none', borderRadius: 3 }} />
                  Micro-bassins
                </div>
              )}
            </div>
          )}

          {theme === 'deforestation' && couches.perte && (
            <div className="pr-legende">
              <strong>Perte de couvert forestier</strong>
              <div>
                <i style={{ background: '#dc6c9a' }} />
                {anneeDebut} à {anneeFin}
              </div>
            </div>
          )}

          {theme === 'erosion' && (
            <div className="pr-alerte pr-info">Zones à risque d’érosion : couche à intégrer</div>
          )}

          {erreur && (
            <div className="pr-alerte">
              {erreur}
              <button onClick={chargerFeux}>Réessayer</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* =====================================================================
   STYLES (media queries impossibles en inline → feuille de style locale)
   ===================================================================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600&display=swap');

/* =====================================================================
   PALETTE — pour changer l'ambiance, modifier uniquement ce bloc
   ===================================================================== */
.pr{
  --fond-panneau:#f1f4f7;               /* mettre "transparent" pour reprendre le fond de l'application */
  --fond-entete:rgba(255,255,255,.95);
  --carte:#ffffff;
  --ligne:#e2e8f0;
  --txt:#0f172a;
  --mut:#64748b;
  --rouge:rgb(200,15,15);
  --vert:#166534;
  --titre:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;
  --corps:'Figtree','Segoe UI',system-ui,sans-serif;

  height:100%;width:100%;display:flex;flex-direction:column;
  background:transparent;color:var(--txt);font-family:var(--corps);
  font-size:14px;overflow:hidden;box-sizing:border-box;
}
.pr *{box-sizing:border-box}
.pr button,.pr select,.pr input{font-family:inherit}
.pr button:focus-visible,.pr select:focus-visible,.pr input:focus-visible{outline:2px solid var(--rouge);outline-offset:2px}

/* ---- En-tête ---- */
.pr-top{background:var(--fond-entete);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border-bottom:1px solid var(--ligne);padding:12px 18px;position:relative;z-index:20}
.pr-top-ligne{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pr-marque{display:flex;align-items:center;gap:12px;min-width:0}
.pr-logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(160deg,rgb(200,15,15),#e8601c);flex:none}
.pr-titre{margin:0;font-family:var(--titre);font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.1}
.pr-sous{margin:2px 0 0;font-size:12px;color:var(--mut)}
.pr-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pr-etat{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);margin-right:4px}
.pr-etat i{width:8px;height:8px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.18)}
.pr-etat.err i{background:var(--rouge);box-shadow:0 0 0 3px rgba(200,15,15,.2)}
.pr-btn{padding:8px 14px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:var(--txt);
  font-size:13px;font-weight:600;cursor:pointer;transition:background .15s}
.pr-btn:hover:not(:disabled){background:#f1f5f9}
.pr-btn:disabled{opacity:.55;cursor:default}
.pr-btn-plein{background:#0f172a;color:#fff;border-color:#0f172a}
.pr-btn-plein:hover:not(:disabled){background:#1e293b}

.pr-filtres{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:12px}
.pr-champ{display:flex;flex-direction:column;gap:4px;min-width:0}
.pr-champ>span{font-size:12px;color:var(--mut);font-weight:500}
.pr-champ select{padding:8px 10px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;
  color:var(--txt);font-size:13px;min-width:170px;max-width:260px;cursor:pointer}
.pr-champ select:disabled{background:#f1f5f9;color:#94a3b8;cursor:not-allowed}
.pr-seg{display:flex;border:1px solid #cbd5e1;border-radius:9px;overflow:hidden;background:#fff}
.pr-seg button{padding:8px 14px;border:0;background:transparent;color:#475569;font-size:13px;cursor:pointer;font-weight:600}
.pr-seg button+button{border-left:1px solid #cbd5e1}
.pr-seg button.on{background:var(--rouge);color:#fff}
.pr-seg button:disabled{color:#94a3b8;background:#f1f5f9;cursor:not-allowed}
.pr-reset{padding:8px 12px;border-radius:9px;border:1px dashed #94a3b8;background:transparent;color:var(--txt);
  font-size:13px;font-weight:600;cursor:pointer}
.pr-reset:hover{border-color:var(--rouge);color:var(--rouge)}

/* ---- Corps ---- */
.pr-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(400px,46%) 1fr}
.pr-panel{overflow-y:auto;padding:16px;background:var(--fond-panneau);border-right:1px solid var(--ligne)}
.pr-map{position:relative;min-height:0;min-width:0;isolation:isolate}

/* ---- Résumé principal ---- */
.pr-hero{background:var(--carte);border:1px solid var(--ligne);border-left:5px solid var(--rouge);
  border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.pr-hero-haut{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}
.pr-hero-nb{font-family:var(--titre);font-weight:800;font-size:clamp(44px,6vw,68px);line-height:.9;
  color:var(--rouge);letter-spacing:-.03em}
.pr-hero-txt{display:flex;flex-direction:column;gap:2px;padding-bottom:4px;min-width:0}
.pr-hero-txt strong{font-family:var(--titre);font-size:17px;color:var(--txt)}
.pr-hero-txt span{color:var(--mut);font-size:12.5px}
.pr-chrono{display:flex;align-items:flex-end;gap:5px;height:68px;margin-top:16px}
.pr-chrono-col{flex:1;height:100%;display:flex;align-items:flex-end}
.pr-chrono-barre{width:100%;border-radius:4px 4px 2px 2px;transition:height .3s,opacity .2s}
.pr-chrono-legende{display:flex;justify-content:space-between;font-size:11px;color:var(--mut);margin-top:6px}

.pr-attente-theme{background:var(--carte);border:1px dashed #94a3b8;border-radius:14px;padding:22px}
.pr-attente-theme h2{margin:0 0 8px;font-family:var(--titre);font-size:18px}
.pr-attente-theme p{margin:0;color:var(--mut);line-height:1.5}

/* ---- Grille 2 colonnes × 3 lignes : une couleur par carte ---- */
.pr-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pr-carte{--accent:#475569;background:var(--carte);border:1px solid var(--ligne);border-top:4px solid var(--accent);
  border-radius:12px;padding:14px;min-width:0;display:flex;flex-direction:column;
  box-shadow:0 1px 3px rgba(15,23,42,.06)}
.pr-carte.c1{--accent:rgb(200,15,15)}   /* pression directe : rouge */
.pr-carte.c2{--accent:#166534}          /* aires protégées : vert forêt */
.pr-carte.c3{--accent:#6d28d9}          /* paysages : violet (comme sur la carte) */
.pr-carte.c4{--accent:#0e7490}          /* micro-bassins : cyan (comme sur la carte) */
.pr-carte.c5{--accent:#b45309}          /* périphéries : ocre */
.pr-carte.c6{--accent:#475569}          /* communes : ardoise */
.pr-carte h2{margin:0;font-family:var(--titre);font-size:15px;font-weight:700;color:var(--txt);line-height:1.25}
.pr-note{margin:3px 0 10px;font-size:11.5px;color:var(--mut)}
.pr-carte-attente{background:#f8fafc;border-style:dashed;border-top-style:solid}
.pr-vide{margin:auto 0;padding:8px 0;font-size:12.5px;color:var(--mut);font-style:italic}
.pr-ligne{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;padding:5px 0;color:#334155}
.pr-ligne span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-ligne strong{font-variant-numeric:tabular-nums;color:var(--txt)}
.pr-ligne-barre{margin-bottom:8px}
.pr-barre{height:6px;border-radius:3px;background:#e2e8f0;overflow:hidden}
.pr-barre i{display:block;height:100%;border-radius:3px;background:var(--accent);transition:width .3s}
.pr-grand{font-family:var(--titre);font-weight:800;font-size:40px;color:var(--accent);line-height:1.05}
.pr-liste{max-height:220px;overflow-y:auto;margin:0 -6px;padding:0 6px}
.pr-cliquable{width:100%;border:0;background:transparent;color:#334155;cursor:pointer;text-align:left;
  padding:6px 8px;margin:1px 0;border-radius:8px}
.pr-cliquable:hover{background:#f1f5f9}
.pr-cliquable.on{background:#dcfce7;outline:1px solid var(--accent)}

/* ---- Outils sur la carte ---- */
.pr-outils{position:absolute;top:12px;right:12px;z-index:1010;display:flex;gap:8px}
.pr-menu-wrap{position:relative}
.pr-outil{display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:10px;
  border:1px solid rgba(15,23,42,.18);background:rgba(255,255,255,.92);backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);color:var(--txt);font-size:13px;font-weight:700;cursor:pointer;
  box-shadow:0 2px 8px rgba(0,0,0,.15)}
.pr-outil:hover{background:#fff}
.pr-apercu{width:18px;height:18px;border-radius:5px;border:1px solid rgba(15,23,42,.25);flex:none}
.pr-apercu.grand{width:36px;height:36px;border-radius:8px}
.pr-pop{position:absolute;top:calc(100% + 8px);z-index:1020;min-width:245px;background:#fff;
  border:1px solid rgba(15,23,42,.12);border-radius:12px;padding:7px;box-shadow:0 8px 28px rgba(0,0,0,.18)}
.pr-pop-droite{right:0}
.pr-pop-item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:10px;border:0;
  border-radius:8px;background:transparent;color:var(--txt);cursor:pointer;font-size:13px;font-weight:600}
.pr-pop-item span{color:var(--mut);font-weight:500}
.pr-pop-item:hover:not(:disabled){background:#f1f5f9}
.pr-pop-item:disabled{opacity:.5;cursor:default}
.pr-top .pr-pop-item{flex-direction:column;align-items:flex-start;gap:2px}
.pr-pop-fond{min-height:55px}
.pr-top .pr-pop-fond{flex-direction:row;align-items:center}
.pr-pop-fond.on{background:#fee2e2;outline:1px solid var(--rouge)}
.pr-pop .pr-fond-check{margin-left:auto;color:var(--rouge);font-size:17px;font-weight:800}
.pr-check{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;
  font-size:13px;font-weight:600;color:var(--txt)}
.pr-check:hover{background:#f1f5f9}
.pr-check input{accent-color:var(--rouge);width:16px;height:16px}
.pr-voile{position:absolute;inset:0;z-index:1005;background:transparent}

/* ---- Légende & messages sur la carte ---- */
.pr-legende{position:absolute;left:12px;bottom:12px;z-index:1000;padding:11px 14px;border-radius:12px;
  background:rgba(255,255,255,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(15,23,42,.15);font-size:12px;font-weight:600;display:flex;flex-direction:column;
  gap:7px;box-shadow:0 3px 12px rgba(0,0,0,.15)}
.pr-legende.cache{display:none}
.pr-legende.pr-legende-zones{top:12px;bottom:auto}
.pr-legende div{display:flex;align-items:center;gap:8px;color:#334155}
.pr-legende strong{color:var(--txt)}
.pr-legende i{width:11px;height:11px;border-radius:50%;border:1px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.35);flex:none}
.pr-alerte{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:1000;display:flex;gap:10px;
  align-items:center;padding:9px 13px;border-radius:10px;background:#fff1f1;color:rgb(160,10,10);
  font-size:12.5px;font-weight:700;border:1px solid #f5b5b5;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.pr-alerte.pr-info{background:#fff;color:#334155;border-color:#cbd5e1;top:auto;bottom:12px}
.pr-alerte button{border:0;background:rgb(200,15,15);color:#fff;border-radius:6px;padding:5px 9px;cursor:pointer;font-weight:700}

.pr .leaflet-container{background:#e5e7eb;font-family:var(--corps)}
.pr .leaflet-tooltip{background:#fff;color:var(--txt);border:1px solid #94a3b8;border-radius:5px;
  box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:13px;font-weight:700;padding:5px 8px}
.pr .leaflet-tooltip-top:before,.pr .leaflet-tooltip-bottom:before{display:none}

/* ---- Tablette & mobile : la carte passe au-dessus, la page défile ---- */
@media (max-width:1023px){
  .pr{overflow-y:auto;overflow-x:hidden}
  .pr-top{position:sticky;top:0}
  .pr-body{display:flex;flex-direction:column;flex:none;min-height:auto}
  .pr-map{order:-1;height:56vh;min-height:320px;flex:none}
  .pr-panel{overflow:visible;border-right:0}
  .pr-filtres{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .pr-champ,.pr-reset{flex:none}
}
@media (max-width:639px){
  .pr-top{padding:10px 12px}
  .pr-sous,.pr-etat{display:none}
  .pr-titre{font-size:18px}
  .pr-panel{padding:12px}
  .pr-grille{grid-template-columns:1fr}
  .pr-map{height:50vh}
  .pr-legende{font-size:11px;padding:8px 10px}
  .pr-outil{padding:7px 10px}
}
.pr-annees{display:flex;align-items:center;gap:6px}
.pr-annees>span{font-size:13px;color:var(--mut)}
.pr-champ .pr-annees select{min-width:84px}
@media (prefers-reduced-motion:reduce){
  .pr *{transition:none !important}
}

`;
