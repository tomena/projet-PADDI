import { useEffect, useState } from "react";

/* ============================ CHEMINS DES DONNÉES (à adapter) ============================ */
export const DATA = {
  feux: "/data/Bases_Feux.geojson",
  communesSup: "/data/communes_superficie.geojson",
  regions: "/data/madagascar_24_region.geojson",
  aires: "/data/aire_protegee_paddi.geojson",
  peripheries: "/data/peripherie_5km_paddi.geojson",
  communesGeo: ["/data/commune_riverain_ap_paddi_2026.json", "/data/commune_riverain_ap_paddi_2026.geojson"],
  zonesBrulees: "/data/zones_brulees.geojson",
  firms: "/api/firms",
};

// Noms des champs dans les fichiers géographiques
export const PROP = { region: "nom_reg", ap: "nom_ap", periph: "nom_ap", commune: "COMM_15", communeAp: "nom_ap" };

/* ============================ TEXTE & COMPARAISON ============================ */
export const norm = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const sameArea = (a: unknown, b: unknown) => {
  const x = norm(a), y = norm(b);
  return x.length >= 4 && y.length >= 4 && (x === y || x.includes(y) || y.includes(x));
};

/* ============================ CHARGEMENT ============================ */
// Accepte un chemin ou une liste de chemins (essayés dans l'ordre : .json puis .geojson)
export function useGeo(url: string | string[]) {
  const [features, setFeatures] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const key = ([] as string[]).concat(url).join("|");

  useEffect(() => {
    let on = true;
    const load = async (u: string) => {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status} (fichier introuvable)`);
      const txt = await r.text();
      try {
        return JSON.parse(txt);
      } catch {
        throw new Error("réponse non JSON : le chemin est faux ou le site renvoie index.html");
      }
    };
    (async () => {
      let last = "";
      for (const u of key.split("|")) {
        try {
          const j = await load(u);
          if (on) {
            setFeatures(j.features || []);
            setErr("");
          }
          return;
        } catch (e: any) {
          last = String(e?.message || e);
          console.warn("Données introuvables :", u, last);
        }
      }
      if (on) setErr(last);
    })().finally(() => on && setDone(true));
    return () => {
      on = false;
    };
  }, [key]);

  return [features, done, err] as const;
}

/* ============================ GÉOMÉTRIE ============================ */
export type Bbox = [number, number, number, number];
export type Zone = { nom: string; feature: any; bbox: Bbox; [k: string]: any };

export const walk = (c: any, cb: (x: number, y: number) => void) => {
  if (!Array.isArray(c)) return;
  if (typeof c[0] === "number") {
    cb(c[0], c[1]);
    return;
  }
  for (const k of c) walk(k, cb);
};

export const bboxOf = (g: any): Bbox => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  walk(g?.coordinates, (x, y) => {
    if (x < a) a = x;
    if (x > c) c = x;
    if (y < b) b = y;
    if (y > d) d = y;
  });
  return [a, b, c, d];
};

export const inRing = (lon: number, lat: number, r: number[][]) => {
  let in_ = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
};

export const inPoly = (lon: number, lat: number, g: any): boolean => {
  const test = (p: number[][][]) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h));
  if (g?.type === "Polygon") return test(g.coordinates);
  if (g?.type === "MultiPolygon") return g.coordinates.some(test);
  return false;
};

export const touch = (a: Bbox, b: Bbox) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);

export const inZone = (lon: number, lat: number, z: Zone) => {
  const b = z.bbox;
  return !(lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) && inPoly(lon, lat, z.feature.geometry);
};

export const zoneIn = (z: Zone, r: Zone) => {
  if (!touch(z.bbox, r.bbox)) return false;
  const pts: number[][] = [];
  walk(z.feature.geometry?.coordinates, (x, y) => pts.push([x, y]));
  const step = Math.max(1, Math.floor(pts.length / 40));
  for (let i = 0; i < pts.length; i += step) if (inZone(pts[i][0], pts[i][1], r)) return true;
  return inZone((z.bbox[0] + z.bbox[2]) / 2, (z.bbox[1] + z.bbox[3]) / 2, r);
};

export const around = (z: Zone, c: Zone) => zoneIn(z, c) || zoneIn(c, z);

export const toZones = (feats: any[], key: string, def: string): Zone[] =>
  feats
    .filter((f) => f?.geometry)
    .map((f) => ({ nom: f.properties?.[key] || def, feature: f, bbox: bboxOf(f.geometry) }));

/* ============================ FEUX NASA FIRMS ============================ */
export const confLevel = (c: any): "l" | "n" | "h" => {
  if (c == null || c === "") return "n";
  if (typeof c === "string" && Number.isNaN(Number(c))) {
    const v = c.toLowerCase();
    return v[0] === "h" ? "h" : v[0] === "l" ? "l" : "n";
  }
  return Number(c) >= 80 ? "h" : Number(c) >= 30 ? "n" : "l";
};

export const parseFires = (features: any[]) => {
  const out: any[] = [];
  for (const f of features) {
    const p = f?.properties || {}, c = f?.geometry?.coordinates;
    if (!c || !p.acq_date || p.acq_time == null) continue;
    const h = String(p.acq_time).padStart(4, "0");
    const t = new Date(`${p.acq_date}T${h.slice(0, 2)}:${h.slice(2, 4)}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    out.push({
      lon: c[0],
      lat: c[1],
      t,
      date: p.acq_date,
      heure: `${h.slice(0, 2)}:${h.slice(2, 4)}`,
      conf: confLevel(p.confidence),
      frp: Number.isFinite(Number(p.frp)) ? Number(p.frp) : null,
      sat: p.satellite ?? "",
    });
  }
  return out;
};
