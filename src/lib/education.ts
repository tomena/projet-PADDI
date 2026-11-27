// src/lib/education.ts
// Lit public/data/localisation_education_mada.geojson (adm1_name = région, adm2_name = district,
// adm3_name = commune, adm4_name = fokontany, name = nom, amenity = type).
// Sert au comptage des cartes Éducation et à l'affichage des établissements sur la carte.
import { useEffect } from "react";
import L from "leaflet";
import { correspond, type Zone } from "./localisation";

export type CategorieEdu = "universite" | "lycee" | "college" | "primaire" | "autre";

export type Ecole = {
  nomComplet: string;   // nom complet (ou type si le nom est vide)
  nom: string;          // nom affiché au niveau commune
  type: string;         // Université, Lycée, Collège, École primaire, Maternelle, École…
  categorie: CategorieEdu;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  lat: number;
  lon: number;
};

const CHEMIN = "/data/localisation_education_mada.geojson";

const STYLE: Record<CategorieEdu, { couleur: string; carre: boolean; libelle: string }> = {
  universite: { couleur: "#4f46e5", carre: true, libelle: "Université" },
  lycee: { couleur: "#f97316", carre: false, libelle: "Lycée" },
  college: { couleur: "#eab308", carre: false, libelle: "Collège" },
  primaire: { couleur: "#ec4899", carre: false, libelle: "École primaire ou maternelle" },
  autre: { couleur: "#94a3b8", carre: false, libelle: "Autre établissement scolaire" },
};

const propre = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Type et catégorie d'après le nom, ou le type OSM (amenity) si le nom ne dit rien. */
function classer(nom: string, amenite: string): { type: string; categorie: CategorieEdu } {
  const n = nom.toLowerCase();
  if (amenite === "university" || /universit|\bist\b|\bista\b|institut/.test(n)) {
    return { type: "Université", categorie: "universite" };
  }
  if (/lyc[ée]e/.test(n)) return { type: "Lycée", categorie: "lycee" };
  if (amenite === "college" || /\bceg\b|coll[èe]ge|\bcem\b/.test(n)) return { type: "Collège", categorie: "college" };
  if (amenite === "kindergarten" || /maternelle/.test(n)) return { type: "Maternelle", categorie: "primaire" };
  if (/\bepp\b|\bep\b|primaire/.test(n)) return { type: "École primaire", categorie: "primaire" };
  if (amenite === "school" || /[ée]cole/.test(n)) return { type: "École primaire", categorie: "primaire" };
  return { type: "Établissement scolaire", categorie: "autre" };
}

function lire(f: any): Ecole | null {
  const p = f?.properties ?? {};
  const c = f?.geometry?.coordinates;
  if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;

  const nomBrut = propre(p.name);
  const amenite = propre(p.amenity);
  if (!nomBrut && !amenite) return null;

  const nomComplet = nomBrut || "Établissement scolaire";
  const { type, categorie } = classer(nomComplet, amenite);
  return {
    nomComplet,
    nom: nomBrut || type,
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

let cache: Promise<Ecole[]> | null = null;

export function chargerEducation(): Promise<Ecole[]> {
  if (!cache) {
    cache = fetch(CHEMIN)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} sur ${CHEMIN}`);
        return r.json();
      })
      .then((j) => (j.features ?? []).map(lire).filter(Boolean) as Ecole[])
      .catch((e) => {
        console.error("Éducation indisponible :", e);
        cache = null;
        throw e;
      });
  }
  return cache;
}

/** Établissements de la zone choisie (région, district, commune), noms proches acceptés. */
export function ecolesDansZone(ecoles: Ecole[], zone: Zone): Ecole[] {
  return ecoles.filter(
    (e) =>
      (!zone.region || correspond(e.region, zone.region)) &&
      (!zone.district || correspond(e.district, zone.district)) &&
      (!zone.commune || correspond(e.commune, zone.commune)),
  );
}

/* ---------- affichage sur la carte ---------- */

let styleAjoute = false;
function injecterStyle() {
  if (styleAjoute || typeof document === "undefined") return;
  styleAjoute = true;
  const s = document.createElement("style");
  s.textContent = `
    .edu-icon{background:none!important;border:0!important}
    .edu-wrap{position:relative;width:12px;height:12px}
    .edu-pt{display:block;width:12px;height:12px;border:1.5px solid #fff;box-sizing:border-box;
      box-shadow:0 1px 2px rgba(0,0,0,.35);cursor:pointer}
    .edu-txt{position:absolute;left:15px;top:-1px;white-space:nowrap;pointer-events:none;
      font:600 11px/1.2 system-ui,sans-serif;color:#14231c;
      text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff,0 0 2px #fff}
    .edu-leg{background:rgba(255,255,255,.96);color:#14231c;border-radius:10px;padding:8px 10px;
      font:12px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);min-width:170px;margin-top:8px}
    .edu-leg strong{display:block;margin-bottom:4px;font-size:12px}
    .edu-leg-row{display:flex;align-items:center;gap:7px;margin:3px 0}`;
  document.head.appendChild(s);
}

function pastille(cat: CategorieEdu) {
  const s = STYLE[cat];
  return `<span class="edu-pt" style="background:${s.couleur};border-radius:${s.carre ? "3px" : "50%"}"></span>`;
}

function marqueur(e: Ecole, avecNom: boolean) {
  const texte = avecNom ? `<span class="edu-txt">${esc(e.nom)}</span>` : "";
  const icone = L.divIcon({
    className: "edu-icon",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html: `<div class="edu-wrap">${pastille(e.categorie)}${texte}</div>`,
  });
  const lignes = [
    `<strong>${esc(e.nomComplet)}</strong>`,
    `Type : ${esc(e.type)}`,
    e.commune ? `Commune : ${esc(e.commune)}` : "",
    e.district ? `District : ${esc(e.district)}` : "",
    e.fokontany ? `Fokontany : ${esc(e.fokontany)}` : "",
  ].filter(Boolean);
  return L.marker([e.lat, e.lon], { icon: icone, title: e.nomComplet, alt: e.nomComplet, keyboard: true })
    .bindPopup(`<div style="font:13px/1.5 system-ui">${lignes.join("<br/>")}</div>`);
}

function legende(categories: CategorieEdu[]): L.Control {
  const ctl = L.control({ position: "topright" });
  ctl.onAdd = () => {
    const d = L.DomUtil.create("div", "edu-leg");
    d.innerHTML =
      `<strong>Éducation</strong>` +
      categories
        .map((c) => `<div class="edu-leg-row">${pastille(c)}<span>${esc(STYLE[c].libelle)}</span></div>`)
        .join("");
    L.DomEvent.disableClickPropagation(d);
    return d;
  };
  return ctl;
}

/**
 * Affiche les établissements scolaires de la zone sur la carte, avec leur légende.
 * Actif seulement dans l'onglet Social. Au niveau commune, chaque point porte son nom.
 */
export function useEducationMap(mapRef: { current: L.Map | null }, zone: Zone, actif: boolean) {
  const { region, district, commune } = zone;

  useEffect(() => {
    const m = mapRef.current;
    if (!actif || !m || !region) return;
    injecterStyle();

    let annule = false;
    let groupe = null as L.LayerGroup | null;
    let ctl = null as L.Control | null;

    chargerEducation()
      .then((ecoles) => {
        if (annule || !mapRef.current) return;
        const carte = mapRef.current;
        const liste = ecolesDansZone(ecoles, { region, district, commune });
        const avecNom = !!commune;

        console.info("Éducation : établissements affichés =", liste.length, { region, district, commune });

        groupe = L.layerGroup(liste.map((e) => marqueur(e, avecNom))).addTo(carte);
        const cats = [...new Set(liste.map((e) => e.categorie))];
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
