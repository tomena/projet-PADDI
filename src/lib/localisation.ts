// src/lib/localisation.ts — version 2
// Lit public/data/localisation_hopital_mada.geojson (adm1_name = région, adm2_name = district,
// adm3_name = commune, adm4_name = fokontany, name = nom, amenity = type).
// Affiche des pastilles colorées avec une légende dans la carte (sans nom affiché sur les points).
import { useEffect } from "react";
import L from "leaflet";

export type Categorie = "hopital" | "pharmacie" | "csb" | "medical" | "autre";

export type Point = {
  nomComplet: string;   // nom complet (ou type si le nom est vide)
  nom: string;          // nom abrégé (utilisé dans la fenêtre du point)
  type: string;         // CHU, CHRR, CHRD, CSB I, CSB II, CSB, Pharmacie, Hôpital…
  categorie: Categorie;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  lat: number;
  lon: number;
};

const CHEMIN = "/data/localisation_hopital_mada.geojson";
const TYPES_REGION = ["CHU", "CHRR", "CHRD"];

// Style par catégorie : couleur et forme (croix ou point)
const STYLE: Record<Categorie, { couleur: string; croix: boolean; libelle: string }> = {
  hopital: { couleur: "#dc2626", croix: true, libelle: "Hôpital (CHU, CHRR, CHRD)" },
  pharmacie: { couleur: "#16a34a", croix: true, libelle: "Pharmacie" },
  csb: { couleur: "#2563eb", croix: false, libelle: "Centre de santé (CSB)" },
  medical: { couleur: "#7c3aed", croix: false, libelle: "Centre médical ou clinique" },
  autre: { couleur: "#64748b", croix: false, libelle: "Autre établissement" },
};

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

// Correspondance de secours : un nom contient l'autre (« Ampitatafika » ↔ « Ampitatafika Fokontany »)
const proche = (a?: string | null, b?: string | null) => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

const propre = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Nom abrégé : « Centre Hospitalier de Référence Régionale Ihosy » → « CHRR Ihosy ». */
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

// Type et catégorie d'après le nom, ou le type OSM si le nom ne dit rien.
function classer(nom: string, amenite: string): { type: string; categorie: Categorie } {
  const n = nom.toLowerCase();
  if (/centre\s+hospitalier\s+universitaire|^chu\b/.test(n)) return { type: "CHU", categorie: "hopital" };
  if (/r[ée]f[ée]rence\s+r[ée]gionale|^chrr\b/.test(n)) return { type: "CHRR", categorie: "hopital" };
  if (/r[ée]f[ée]rence\s+(de\s+)?district|^chrd\b/.test(n)) return { type: "CHRD", categorie: "hopital" };
  if (/sant[ée]\s+de\s+base\s*(niveau\s*)?(ii|2)\b|^csb\s*(ii|2)\b/.test(n)) return { type: "CSB II", categorie: "csb" };
  if (/sant[ée]\s+de\s+base\s*(niveau\s*)?(i|1)\b|^csb\s*(i|1)\b/.test(n)) return { type: "CSB I", categorie: "csb" };
  if (/sant[ée]\s+de\s+base|^csb/.test(n)) return { type: "CSB", categorie: "csb" };
  if (/pharmacie/.test(n) || amenite === "pharmacy") return { type: "Pharmacie", categorie: "pharmacie" };
  if (/h[ôo]pital/.test(n) || amenite === "hospital") return { type: "Hôpital", categorie: "hopital" };
  if (amenite === "health_post" || amenite === "health_centre") return { type: AMENITY[amenite], categorie: "csb" };
  if (amenite === "doctors" || amenite === "clinic") return { type: AMENITY[amenite], categorie: "medical" };
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
        if (!r.ok) throw new Error(`HTTP ${r.status} sur ${CHEMIN}`);
        return r.json();
      })
      .then((j) => (j.features ?? []).map(lire).filter(Boolean) as Point[])
      .catch((e) => {
        console.error("Localisation indisponible :", e);
        cache = null;
        throw e;
      });
  }
  return cache;
}

/* ---------- filtres ---------- */

export type Zone = { region: string | null; district: string | null; commune: string | null };

// Garde les points dont le champ correspond : exact d'abord, sinon correspondance de secours.
function filtrer(liste: Point[], champ: "region" | "district" | "commune", valeur: string): Point[] {
  const exact = liste.filter((p) => same(p[champ], valeur));
  if (exact.length) return exact;
  return liste.filter((p) => proche(p[champ], valeur));
}

/** Points qui se trouvent dans la zone choisie (région, puis district, puis commune). */
export function pointsDansZone(points: Point[], zone: Zone): Point[] {
  let liste = points;
  if (zone.region) liste = filtrer(liste, "region", zone.region);
  if (zone.district) liste = filtrer(liste, "district", zone.district);
  if (zone.commune) liste = filtrer(liste, "commune", zone.commune);
  return liste;
}

/**
 * Ce qui s'affiche sur la carte :
 *  - région seule : seulement CHU, CHRR, CHRD (trop de points sinon)
 *  - district ou commune : tous les points de la zone
 *  - aucune zone : rien
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
    .poi{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;
      border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);box-sizing:border-box;cursor:pointer}
    .poi svg{width:10px;height:10px;display:block}
    .poi-leg{background:rgba(255,255,255,.96);color:#14231c;border-radius:10px;padding:8px 10px;
      font:12px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);min-width:170px}
    .poi-leg strong{display:block;margin-bottom:4px;font-size:12px}
    .poi-leg-row{display:flex;align-items:center;gap:7px;margin:3px 0}`;
  document.head.appendChild(s);
}

const CROIX = '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#fff"/>';
const POINT = '<circle cx="12" cy="12" r="5" fill="#fff"/>';

function badge(cat: Categorie) {
  const s = STYLE[cat];
  return `<span class="poi" style="background:${s.couleur}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.croix ? CROIX : POINT}</svg></span>`;
}

function marqueur(p: Point) {
  const icone = L.divIcon({
    className: "poi-icon",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: badge(p.categorie),
  });
  const lignes = [
    `<strong>${esc(p.nomComplet)}</strong>`,
    p.type ? `Type : ${esc(p.type)}` : "",
    p.commune ? `Commune : ${esc(p.commune)}` : "",
    p.district ? `District : ${esc(p.district)}` : "",
    p.fokontany ? `Fokontany : ${esc(p.fokontany)}` : "",
  ].filter(Boolean);
  return L.marker([p.lat, p.lon], { icon: icone, title: p.nomComplet, alt: p.nomComplet, keyboard: true })
    .bindPopup(`<div style="font:13px/1.5 system-ui">${lignes.join("<br/>")}</div>`);
}

// Légende : seulement les catégories présentes dans la zone
function legende(categories: Categorie[]): L.Control {
  const ctl = L.control({ position: "topright" });
  ctl.onAdd = () => {
    const d = L.DomUtil.create("div", "poi-leg");
    d.innerHTML =
      `<strong>Légende</strong>` +
      categories
        .map((c) => `<div class="poi-leg-row">${badge(c)}<span>${esc(STYLE[c].libelle)}</span></div>`)
        .join("");
    L.DomEvent.disableClickPropagation(d);
    return d;
  };
  return ctl;
}

/**
 * Affiche les points de la zone sur la carte, avec la légende. Actif seulement dans l'onglet Social.
 * mapRef : la référence de la carte Leaflet (useRef<L.Map | null>).
 */
export function useSanteMap(mapRef: { current: L.Map | null }, zone: Zone, actif: boolean) {
  const { region, district, commune } = zone;

  useEffect(() => {
    const m = mapRef.current;
    if (!actif || !m || !region) return;
    injecterStyle();

    let annule = false;
    let groupe = null as L.LayerGroup | null;
    let ctl = null as L.Control | null;

    chargerLocalisation()
      .then((points) => {
        if (annule || !mapRef.current) return;
        const carte = mapRef.current;
        const liste = pointsPourCarte(points, { region, district, commune });

        console.info("Localisation : points affichés =", liste.length, { region, district, commune });
        if (!liste.length && district) {
          const communes = [...new Set(points.filter((p) => same(p.district, district)).map((p) => p.commune))];
          console.info("Communes disponibles dans ce district :", communes);
        }

        groupe = L.layerGroup(liste.map(marqueur)).addTo(carte);
        const cats = [...new Set(liste.map((p) => p.categorie))];
        if (cats.length) ctl = legende(cats).addTo(carte);
      })
      .catch(() => {
        /* base indisponible : la carte reste utilisable, sans points */
      });

    return () => {
      annule = true;
      groupe?.remove();
      ctl?.remove();
    };
  }, [mapRef, actif, region, district, commune]);
}
