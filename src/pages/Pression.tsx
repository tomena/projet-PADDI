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

const FONDS: Record<
  string,
  { label: string; url: string; attribution: string; apercu: string }
> = {
  sombre: {
    label: 'Sombre',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap · © CARTO',
    apercu: 'linear-gradient(135deg,#0f1a22,#25364a)',
  },
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
  clair: {
    label: 'Clair',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap · © CARTO',
    apercu: 'linear-gradient(135deg,#f1f3f4,#d9dee2)',
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
  age <= 24 ? '#ef4a2b' : age <= 48 ? '#f97316' : '#facc15';

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

  // ---- Interface
  const [fond, setFond] = useState('sombre');
  const [menu, setMenu] = useState<null | 'fond' | 'couches' | 'export'>(null);
  const [couches, setCouches] = useState({
    regions: true,
    aires: true,
    peripheries: false,
    feux: true,
  });

  // ---- Données géographiques
  const regionsData = useGeoJSON('/data/madagascar_24_region.geojson');
  const apData = useGeoJSON('/data/aire_protegee_paddi.geojson');
  const communesData = useGeoJSON('/data/madagascar_communes.json');
  const periphData = useGeoJSON('/data/peripherie_5km_paddi.geojson');

  const regionsZ = useMemo(() => preparerZones(regionsData, 'nom_reg', 'Région'), [regionsData]);
  const apZ = useMemo(() => preparerZones(apData, 'nom_ap', 'Aire protégée sans nom'), [apData]);
  const periphZ = useMemo(() => preparerZones(periphData, 'nom_ap', ''), [periphData]);
  const communesZ = useMemo(
    () => preparerZones(communesData, 'NAME_4', 'Commune sans nom'),
    [communesData]
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
    region !== TOUS || ap !== TOUS || periode !== 72 || confiance !== 'l';
  const reinitialiser = () => {
    setRegion(TOUS);
    setAp(TOUS);
    setPeriode(72);
    setConfiance('l');
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

  // ---- Styles des zones sur la carte ------------------------------------
  const styleRegion = (z: Zone): L.PathOptions => {
    const sel = region !== TOUS && z.nom === region;
    return {
      color: sel ? '#52d6b8' : 'rgba(255,255,255,0.55)',
      weight: sel ? 2.5 : region !== TOUS ? 0.6 : 1,
      fillColor: '#52d6b8',
      fillOpacity: sel ? 0.14 : region !== TOUS ? 0 : 0.05,
    };
  };
  const styleAP = (z: Zone): L.PathOptions => {
    const sel = ap !== TOUS && z.nom === ap;
    return {
      color: sel ? '#ffffff' : '#b7f7c9',
      weight: sel ? 2.5 : 1,
      fillColor: '#4ade80',
      fillOpacity: sel ? 0.36 : 0.2,
    };
  };
  const stylePeriph = (): L.PathOptions => ({
    color: '#fbbf24',
    weight: 1,
    dashArray: '4 4',
    fillColor: '#fbbf24',
    fillOpacity: 0.07,
  });

  const optionsCouches: [keyof typeof couches, string][] = [
    ['feux', 'Détections de feux'],
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
              {([24, 48, 72] as const).map((h) => (
                <button key={h} className={periode === h ? 'on' : ''} onClick={() => setPeriode(h)}>
                  {h} h
                </button>
              ))}
            </div>
          </div>

          <label className="pr-champ">
            <span>Fiabilité</span>
            <select value={confiance} onChange={(e) => setConfiance(e.target.value as 'l' | 'n' | 'h')}>
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
            <article className="pr-carte">
              <h2>Feux par période</h2>
              <p className="pr-note">{portee}</p>
              {[
                ['24 dernières heures', stats24, '#ef4a2b'],
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
            <article className="pr-carte">
              <h2>Feux par aire protégée</h2>
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
            <article className="pr-carte pr-carte-attente">
              <h2>Feux par paysage</h2>
              <p className="pr-note">{periode} dernières heures</p>
              <p className="pr-vide">Couche des paysages à intégrer</p>
            </article>

            {/* CARTE 4 : micro-bassins (à intégrer) */}
            <article className="pr-carte pr-carte-attente">
              <h2>Feux par micro-bassin</h2>
              <p className="pr-note">{periode} dernières heures</p>
              <p className="pr-vide">Couche des micro-bassins à intégrer</p>
            </article>

            {/* CARTE 5 : périphéries */}
            <article className="pr-carte">
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
            <article className="pr-carte">
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

            {couches.regions && (
              <CoucheZones zones={regionsZ} style={styleRegion} cle={region} onClick={(z) => choisirRegion(z.nom)} />
            )}
            {couches.peripheries && <CoucheZones zones={periphSel} style={stylePeriph} cle="p" />}
            {couches.aires && (
              <CoucheZones
                zones={apsVisibles}
                style={styleAP}
                cle={`${region}|${ap}`}
                onClick={(z) => setAp(z.nom === ap ? TOUS : z.nom)}
              />
            )}
            {couches.feux && <CoucheFeux feux={feuxAffiches} />}
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
                  {optionsCouches.map(([id, label]) => (
                    <label key={id} className="pr-check">
                      <input
                        type="checkbox"
                        checked={couches[id]}
                        onChange={() => setCouches({ ...couches, [id]: !couches[id] })}
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
          <div className="pr-legende">
            <strong>Ancienneté des feux</strong>
            <div><i style={{ background: '#ef4a2b' }} />Moins de 24 h</div>
            <div><i style={{ background: '#f97316' }} />24 à 48 h</div>
            <div><i style={{ background: '#facc15' }} />48 à 72 h</div>
          </div>

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

.pr{
  --bg:#0c1a19; --panel:#102320; --carte:#173029; --carte2:#1d3a33;
  --ligne:rgba(190,230,215,.11); --txt:#e4efe9; --mut:#8fa9a0;
  --lagon:#52d6b8; --braise:#ff7a45;
  --titre:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;
  --corps:'Figtree','Segoe UI',system-ui,sans-serif;
  height:100%; width:100%; display:flex; flex-direction:column;
  background:var(--bg); color:var(--txt); font-family:var(--corps);
  font-size:14px; overflow:hidden; box-sizing:border-box;
}
.pr *{box-sizing:border-box}
.pr button,.pr select,.pr input{font-family:inherit}

/* ---- En-tête ---- */
.pr-top{background:var(--panel);border-bottom:1px solid var(--ligne);padding:12px 18px;position:relative;z-index:20}
.pr-top-ligne{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.pr-marque{display:flex;align-items:center;gap:12px;min-width:0}
.pr-logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(160deg,#ff5a2c,#ffb02e);flex:none}
.pr-titre{margin:0;font-family:var(--titre);font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.1}
.pr-sous{margin:2px 0 0;font-size:12px;color:var(--mut)}
.pr-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pr-etat{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);margin-right:4px}
.pr-etat i{width:8px;height:8px;border-radius:50%;background:var(--lagon);box-shadow:0 0 0 3px rgba(82,214,184,.18)}
.pr-etat.err i{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.2)}
.pr-btn{padding:8px 14px;border-radius:9px;border:1px solid var(--ligne);background:var(--carte);color:var(--txt);
  font-size:13px;font-weight:500;cursor:pointer;transition:background .15s}
.pr-btn:hover:not(:disabled){background:var(--carte2)}
.pr-btn:disabled{opacity:.55;cursor:default}
.pr-btn-plein{background:var(--lagon);color:#07201b;border-color:transparent;font-weight:600}
.pr-btn-plein:hover:not(:disabled){background:#7ae6cd}
.pr button:focus-visible,.pr select:focus-visible,.pr input:focus-visible{outline:2px solid var(--lagon);outline-offset:2px}

.pr-filtres{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:12px}
.pr-champ{display:flex;flex-direction:column;gap:4px;min-width:0}
.pr-champ>span{font-size:12px;color:var(--mut)}
.pr-champ select{padding:8px 10px;border-radius:9px;border:1px solid var(--ligne);background:var(--carte);
  color:var(--txt);font-size:13px;min-width:170px;max-width:260px;cursor:pointer}
.pr-seg{display:flex;border:1px solid var(--ligne);border-radius:9px;overflow:hidden;background:var(--carte)}
.pr-seg button{padding:8px 14px;border:0;background:transparent;color:var(--mut);font-size:13px;cursor:pointer;font-weight:500}
.pr-seg button+button{border-left:1px solid var(--ligne)}
.pr-seg button.on{background:var(--braise);color:#2a1004;font-weight:700}
.pr-reset{padding:8px 12px;border-radius:9px;border:1px dashed var(--mut);background:transparent;color:var(--txt);
  font-size:13px;cursor:pointer}
.pr-reset:hover{border-color:var(--lagon);color:var(--lagon)}

/* ---- Corps ---- */
.pr-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(400px,46%) 1fr}
.pr-panel{overflow-y:auto;padding:16px;background:var(--bg);border-right:1px solid var(--ligne)}
.pr-map{position:relative;min-height:0;min-width:0;isolation:isolate}

/* ---- Hero ---- */
.pr-hero{background:linear-gradient(180deg,#1b3a31,#143027);border:1px solid var(--ligne);border-radius:18px;padding:18px;margin-bottom:14px}
.pr-hero-haut{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}
.pr-hero-nb{font-family:var(--titre);font-weight:800;font-size:clamp(44px,6vw,68px);line-height:.9;color:var(--braise);letter-spacing:-.03em}
.pr-hero-txt{display:flex;flex-direction:column;gap:2px;padding-bottom:4px;min-width:0}
.pr-hero-txt strong{font-family:var(--titre);font-size:17px}
.pr-hero-txt span{color:var(--mut);font-size:12.5px}
.pr-chrono{display:flex;align-items:flex-end;gap:5px;height:68px;margin-top:16px}
.pr-chrono-col{flex:1;height:100%;display:flex;align-items:flex-end}
.pr-chrono-barre{width:100%;border-radius:4px 4px 2px 2px;transition:height .3s,opacity .2s}
.pr-chrono-legende{display:flex;justify-content:space-between;font-size:11px;color:var(--mut);margin-top:6px}

/* ---- Grille 2 colonnes × 3 lignes ---- */
.pr-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.pr-carte{background:var(--carte);border:1px solid var(--ligne);border-radius:14px;padding:14px;min-width:0;display:flex;flex-direction:column}
.pr-carte h2{margin:0;font-family:var(--titre);font-size:15px;font-weight:700}
.pr-note{margin:3px 0 10px;font-size:11.5px;color:var(--mut)}
.pr-carte-attente{background:transparent;border-style:dashed}
.pr-vide{margin:auto 0;padding:8px 0;font-size:12.5px;color:var(--mut);font-style:italic}
.pr-ligne{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;padding:5px 0}
.pr-ligne span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-ligne strong{font-variant-numeric:tabular-nums}
.pr-ligne-barre{margin-bottom:8px}
.pr-barre{height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}
.pr-barre i{display:block;height:100%;border-radius:3px;background:var(--braise);transition:width .3s}
.pr-grand{font-family:var(--titre);font-weight:800;font-size:40px;color:#fbbf24;line-height:1.05}
.pr-liste{max-height:220px;overflow-y:auto;margin:0 -6px;padding:0 6px}
.pr-cliquable{width:100%;border:0;background:transparent;color:var(--txt);cursor:pointer;text-align:left;
  padding:6px 8px;margin:1px 0;border-radius:8px;border-bottom:0}
.pr-cliquable:hover{background:rgba(255,255,255,.06)}
.pr-cliquable.on{background:rgba(82,214,184,.16);outline:1px solid rgba(82,214,184,.5)}

/* ---- Outils sur la carte ---- */
.pr-outils{position:absolute;top:12px;right:12px;z-index:1000;display:flex;gap:8px}
.pr-menu-wrap{position:relative}
.pr-outil{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);
  background:rgba(12,26,25,.88);backdrop-filter:blur(8px);color:var(--txt);font-size:13px;font-weight:500;cursor:pointer}
.pr-outil:hover{background:rgba(23,48,41,.95)}
.pr-apercu{width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.25);flex:none}
.pr-apercu.grand{width:34px;height:34px;border-radius:8px}
.pr-pop{position:absolute;top:calc(100% + 8px);z-index:1010;min-width:230px;background:#112722;border:1px solid var(--ligne);
  border-radius:12px;padding:6px;box-shadow:0 14px 40px rgba(0,0,0,.45)}
.pr-pop-droite{right:0}
.pr-pop-item{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;padding:10px;border:0;border-radius:8px;
  background:transparent;color:var(--txt);cursor:pointer;font-size:13px}
.pr-pop-item span{font-size:11.5px;color:var(--mut)}
.pr-pop-item:hover:not(:disabled){background:rgba(255,255,255,.07)}
.pr-pop-item:disabled{opacity:.5;cursor:default}
.pr-pop-fond{flex-direction:row;align-items:center;gap:10px}
.pr-pop-fond.on{background:rgba(82,214,184,.16)}
.pr-check{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;font-size:13px}
.pr-check:hover{background:rgba(255,255,255,.07)}
.pr-check input{accent-color:var(--lagon);width:16px;height:16px}
.pr-voile{position:absolute;inset:0;z-index:1005;background:transparent}
.pr-top .pr-pop{z-index:1010}

.pr-legende{position:absolute;left:12px;bottom:12px;z-index:1000;padding:10px 12px;border-radius:12px;
  background:rgba(12,26,25,.88);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);font-size:12px;
  display:flex;flex-direction:column;gap:5px}
.pr-legende div{display:flex;align-items:center;gap:8px;color:var(--mut)}
.pr-legende i{width:11px;height:11px;border-radius:50%;border:1px solid #fff}
.pr-alerte{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:1000;display:flex;gap:10px;align-items:center;
  padding:8px 12px;border-radius:10px;background:#4a1717;color:#fecaca;font-size:12.5px;border:1px solid #7f1d1d}
.pr-alerte button{border:0;background:#fecaca;color:#450a0a;border-radius:6px;padding:4px 8px;cursor:pointer;font-weight:600}

.pr .leaflet-container{background:#0c1a19;font-family:var(--corps)}
.pr .leaflet-tooltip{background:#102320;color:#e4efe9;border:1px solid rgba(255,255,255,.15);box-shadow:none}
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
@media (prefers-reduced-motion:reduce){
  .pr *{transition:none !important}
}
`;
