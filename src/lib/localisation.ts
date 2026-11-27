// src/lib/localisation.ts
// Lit public/data/localisation-hopital-mada.geojson (votre base : adm1_name = région,
// adm2_name = district, adm3_name = commune, adm4_name = fokontany, name = nom, amenity = type).
// Abrège les noms, filtre par zone, et affiche les points sur la carte Leaflet.
import { useEffect } from "react";
import L from "leaflet";

export type Categorie = "hopital" | "csb" | "autre";

export type Point = {
  nomComplet: string;   // nom complet (ou type si le nom est vide)
  nom: string;          // nom abrégé affiché sur la carte
  type: string;         // CHU, CHRR, CHRD, CSB I, CSB II, CSB, Hôpital, Centre médical…
  categorie: Categorie;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  lat: number;
  lon: number;
};

const CHEMIN = "/data/localisation-hopital-mada.geojson";
const TYPES_REGION = ["CHU", "CHRR", "CHRD"];

const COULEUR: Record<string, string> = {
  CHU: "#7c3aed",
  CHRR: "#2563eb",
  CHRD: "#0d9488",
  "CSB II": "#0ea5e9",
  "CSB I": "#0284c7",
  CSB: "#0ea5e9",
  Hôpital: "#64748b",
  autre: "#94a3b8",
};

// Libellés des types OSM (utilisés si le nom est vide)
const AMENITY: Record<string, string> = {
  hospital: "Hôpital",
  clinic: "Clinique",
  doctors: "Centre médical",
  health_post: "Poste de santé",
  health_centre: "Centre de santé",
  pharmacy: "Pharmacie",
};

/* ---------- utilitaires ---------- */

const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const same = (a?: string | null, b?: string | null) => !!b && norm(a) === norm(b);

const propre = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Abrège le nom : « Centre Hospitalier de Référence Régionale Ihosy » → « CHRR Ihosy »,
 * « Centre de Santé de Base Niveau I Antsahapolisy » → « CSB I Antsahapolisy ».
 */
export function abreger(nom: string): string {
  let s = nom.replace(/\s+/g, " ").trim();
  s = s
    .replace(/^centre\s+hospitalier\s+universitaire\b\s*/i, "CHU ")
    .replace(/^centre\s+hospitalier\s+de\s+r[ée]f[ée]rence\s+r[ée]gionale?\b\s*/i, "CHRR ")
    .replace(/^centre\s+hospitalier\s+de\s+r[ée]f[ée]rence\s+(?:de\s+)?district\b\s*/i, "CHRD ")
    .replace(/^centre\s+de\s+sant[ée]\s+de\s+base\s*(?:niveau\s*)?(II|2)\b\s*/i, "CSB II ")
    .replace(/^centre\s+de\s+sant[ée]\s+de\s+base\s*(?:niveau\s*)?(I|1)\b\s*/i, "CSB I ")
    .replace(/^centre\s+de\s+sant[ée]\s+de\s+base\s*/i, "CSB ");
  if (s.length > 34) s = s.slice(0, 33).trimEnd() + "…";
  return s;
}

// Type et catégorie d'après le nom (ou le type OSM si le nom ne dit rien).
function classer(nom: string, amenite: string): { type: string; categorie: Categorie } {
  const n = nom.toLowerCase();
  if (/centre\s+hospitalier\s+universitaire|^chu\b/.test(n)) return { type: "CHU", categorie: "hopital" };
  if (/r[ée]f[ée]rence\s+r[ée]gionale|^chrr\b/.test(n)) return { type: "CHRR", categorie: "hopital" };
  if (/r[ée]f[ée]rence\s+(de\s+)?district|^chrd\b/.test(n)) return { type: "CHRD", categorie: "hopital" };
  if (/sant[ée]\s+de\s+base\s*(niveau\s*)?(ii|2)\b|^csb\s*(ii|2)\b/.test(n)) return { type: "CSB II", categorie: "csb" };
  if (/sant[ée]\s+de\s+base\s*(niveau\s*)?(i|1)\b|^csb\s*(i|1)\b/.test(n)) return { type: "CSB I", categorie: "csb" };
  if (/sant[ée]\s+de\s+base|^csb/.test(n)) return { type: "CSB", categorie: "csb" };
  if (/h[ôo]pital/.test(n) || amenite === "hospital") return { type: "Hôpital", categorie: "hopital" };
  if (amenite === "health_post" || amenite === "doctors" || amenite === "clinic" || amenite === "health_centre") {
    return { type: AMENITY[amenite], categorie: "csb" };
  }
  return { type: AMENITY[amenite] ?? "", categorie: "autre" };
}

// Lit une entité du GeoJSON. Retourne null si ni le nom ni le type ne sont renseignés.
function lire(f: any): Point | null {
  const p = f?.properties ?? {};
  const c = f?.geometry?.coordinates;
  if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;

  const nomBrut = propre(p.name);
  const amenite = propre(p.amenity);
  const libelleAmenite = AMENITY[amenite] ?? amenite;
  if (!nomBrut && !libelleAmenite) return null;

  const nomComplet = nomBrut || libelleAmenite;
  const { type, categorie } = classer(nomComplet, amenite);
  return {
    nomComplet,
    nom: nomBrut ? abreger(nomBrut) : libelleAmenite,
    type,
    categorie,
    region: propre(p.adm1_name),
    district: propre(p.adm2_name),
    commune: propre(p.adm3_name),
    fokontany: propre(p.adm4_name),
    lat: c[1],
    lon: c[0],
  };
}

/* ---------- chargement (une seule fois) ---------- */

let cache: Promise<Point[]> | null = null;

export function chargerLocalisation(): Promise<Point[]> {
  if (!cache) {
    cache = fetch(CHEMIN)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j) => (j.features ?? []).map(lire).filter(Boolean) as Point[])
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

/* ---------- filtres ---------- */

export type Zone = { region: string | null; district: string | null; commune: string | null };

/** Points qui se trouvent dans la zone choisie (région, puis district, puis commune). */
export function pointsDansZone(points: Point[], zone: Zone): Point[] {
  return points.filter(
    (p) =>
      (!zone.region || same(p.region, zone.region)) &&
      (!zone.district || same(p.district, zone.district)) &&
      (!zone.commune || same(p.commune, zone.commune)),
  );
}

/**
 * Ce qui s'affiche sur la carte :
 *  - région seule  : seulement CHU, CHRR, CHRD (trop de points sinon)
 *  - district ou commune : tous les points de la zone
 *  - aucune zone  : rien
 */
export function pointsPourCarte(points: Point[], zone: Zone): Point[] {
  if (!zone.region) return [];
  const dans = pointsDansZone(points, zone);
  return zone.district ? dans : dans.filter((p) => TYPES_REGION.includes(p.type));
}

/* ---------- affichage sur la carte ---------- */

let styleAjoute = false;
function injecterStyle() {
  if (styleAjoute || typeof document === "undefined") return;
  styleAjoute = true;
  const s = document.createElement("style");
  s.textContent = `
    .poi-icon{background:none!important;border:0!important}
    .poi{position:relative;width:22px;height:28px;cursor:pointer}
    .poi-lbl{position:absolute;top:30px;left:50%;transform:translateX(-50%);padding:1px 6px;border-radius:5px;
      background:rgba(255,255,255,.95);color:#14231c;font:600 11px/1.35 system-ui,sans-serif;white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,.28);pointer-events:none}`;
  document.head.appendChild(s);
}

function icone(p: Point) {
  const couleur = COULEUR[p.type] ?? COULEUR[p.categorie === "csb" ? "CSB" : "autre"];
  const symbole =
    p.categorie === "hopital"
      ? '<path d="M10 6h4v4h4v4h-4v4h-4v-4H6v-4h4z" fill="#fff"/>'
      : p.categorie === "csb"
        ? '<circle cx="12" cy="12" r="3.2" fill="#fff"/>'
        : '<circle cx="12" cy="12" r="2.2" fill="#fff"/>';
  return L.divIcon({
    className: "poi-icon",
    iconSize: [0, 0],
    iconAnchor: [11, 28],
    html:
      `<div class="poi">` +
      `<svg width="22" height="28" viewBox="0 0 24 30" aria-hidden="true">` +
      `<path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 18 12 18s12-9.4 12-18C24 5.4 18.6 0 12 0z" fill="${couleur}" stroke="#fff" stroke-width="1.5"/>` +
      `${symbole}</svg>` +
      `<span class="poi-lbl">${esc(p.nom)}</span></div>`,
  });
}

function marqueur(p: Point) {
  const lignes = [
    `<strong>${esc(p.nomComplet)}</strong>`,
    p.type ? `Type : ${esc(p.type)}` : "",
    p.commune ? `Commune : ${esc(p.commune)}` : "",
    p.district ? `District : ${esc(p.district)}` : "",
    p.fokontany ? `Fokontany : ${esc(p.fokontany)}` : "",
  ].filter(Boolean);
  return L.marker([p.lat, p.lon], { icon: icone(p), title: p.nomComplet, alt: p.nomComplet, keyboard: true })
    .bindPopup(`<div style="font:13px/1.5 system-ui">${lignes.join("<br/>")}</div>`);
}

/**
 * Affiche les points de la zone sur la carte. Actif seulement dans l'onglet Social.
 * mapRef : la référence de la carte Leaflet (useRef<L.Map | null>).
 */
export function useSanteMap(
  mapRef: { current: L.Map | null },
  zone: Zone,
  actif: boolean,
) {
  const { region, district, commune } = zone;

  useEffect(() => {
    const m = mapRef.current;
    if (!actif || !m || !region) return;
    injecterStyle();

    let annule = false;
    let groupe: L.LayerGroup | null = null;

    chargerLocalisation()
      .then((points) => {
        if (annule || !mapRef.current) return;
        const liste = pointsPourCarte(points, { region, district, commune });
        groupe = L.layerGroup(liste.map(marqueur)).addTo(mapRef.current);
      })
      .catch(() => {
        /* base indisponible : la carte reste utilisable, sans points */
      });

    return () => {
      annule = true;
      groupe?.remove();
    };
  }, [mapRef, actif, region, district, commune]);
}
