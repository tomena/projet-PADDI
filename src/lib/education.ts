// src/lib/education.ts — version 4
// Lit public/data/localisation_education_mada.geojson (adm1_name = région, adm2_name = district,
// adm3_name = commune, adm4_name = fokontany, name = nom, amenity = type).
// Sert au comptage, aux cartes de la liste et à l'affichage sur la carte (légende cliquable).
import { useEffect } from "react";
import L from "leaflet";
import { correspond, type Zone } from "./localisation";

export type CategorieEdu = "universite" | "lycee" | "college" | "primaire" | "autre";

export type Ecole = {
  nomComplet: string;   // nom tel qu'il est dans la base
  nomCourt: string;     // nom sans le type (CEG, Lycée, EPP…), en forme de titre
  groupe: string;       // CEG, Collège, Collège privé, École primaire, École primaire privée, Lycée, Lycée privé, Université, Université privée
  categorie: CategorieEdu;
  prive: boolean;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  lat: number;
  lon: number;
};

const CHEMIN = "/data/localisation_education_mada.geojson";
const EVT = "education-filtre";

const STYLE: Record<CategorieEdu, { couleur: string; carre: boolean; libelle: string }> = {
  universite: { couleur: "#4f46e5", carre: true, libelle: "Université" },
  lycee: { couleur: "#f97316", carre: false, libelle: "Lycée" },
  college: { couleur: "#eab308", carre: false, libelle: "Collège (CEG)" },
  primaire: { couleur: "#ec4899", carre: false, libelle: "École primaire" },
  autre: { couleur: "#94a3b8", carre: false, libelle: "Autre établissement scolaire" },
};

// Mots qui indiquent un établissement privé (privé, luthérien, catholique, FJKM, Saint…)
const PRIVE =
  /priv[ée]|\bprive\b|luth[ée]rien|cathol|fjkm|jesosy|adventiste|\bsaint\b|\bsainte\b|notre\s+dame|\bfran[çc]ais\b|am[ée]ricain|\bmission\b/i;

// CEG : Collège d'Enseignement Général (public, général)
const CEG = /\bceg\b|coll[èe]ge\s+d['’]enseignement\s+g[ée]n[ée]ral/i;

// Masquages sur la carte (choisis en cliquant sur la légende)
const masques = new Set<CategorieEdu>();

const propre = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Texte simplifié pour comparer : sans accents, minuscules, sans ponctuation
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* ---------- noms ---------- */

// Préfixes de type à retirer du nom. L'ordre compte : le plus précis d'abord.
const PREFIXES: RegExp[] = [
  /^coll[èe]ge\s+d['’]enseignement\s+g[ée]n[ée]ral\b\s*/i,
  /^ceg\b\s*/i,
  /^coll[èe]ge\b\s*/i,
  /^cem\b\s*/i,
  /^[ée]cole\s+primaire\s+publique\b\s*/i,
  /^[ée]cole\s+primaire\s+priv[ée]e?\b\s*/i,
  /^[ée]cole\s+primaire\b\s*/i,
  /^epp\b\s*/i,
  /^ep\b\s*/i,
  /^maternelle\b\s*/i,
  /^lyc[ée]e\b\s*/i,
  /^universit[ée]\b\s*/i,
  /^(ist|ista)\b\s*/i,
  /^[ée]cole\b\s*/i,
];
const SUFFIXE_PRIVE = /\s+priv[ée]e?$/i;
const PETITS = /^(de|du|des|d|la|le|les|et|en|sur|ou|a|au|aux)$/i;

// Forme de titre : « SAKAVIROMAHASOA MANOMBOBE » → « Sakaviromahasoa Manombobe »
function titre(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((mot, i) => {
      if (i > 0 && PETITS.test(mot)) return mot;
      return mot.replace(/(^|[-'’])([a-zà-ÿ])/g, (_m, a: string, b: string) => a + b.toUpperCase());
    })
    .join(" ");
}

/** Nom sans le type : « CEG SAKAVIROMAHASOA MANOMBOBE » → « Sakaviromahasoa Manombobe ». */
export function nomCourt(nomComplet: string): string {
  let s = nomComplet.replace(/\s+/g, " ").trim();
  for (const r of PREFIXES) {
    if (r.test(s)) {
      s = s.replace(r, "");
      break;
    }
  }
  s = s.replace(/^priv[ée]e?\s+/i, "").replace(SUFFIXE_PRIVE, "").trim();
  if (!s) return nomComplet;
  return titre(s);
}

/* ---------- classement ---------- */

function classer(nom: string, amenite: string): { categorie: CategorieEdu; prive: boolean } {
  const n = nom.toLowerCase();
  const prive = PRIVE.test(nom);
  if (amenite === "university" || /universit|\bist\b|\bista\b|institut/.test(n)) return { categorie: "universite", prive };
  if (/lyc[ée]e/.test(n)) return { categorie: "lycee", prive };
  if (amenite === "college" || /\bceg\b|coll[èe]ge|\bcem\b/.test(n)) return { categorie: "college", prive };
  if (amenite === "kindergarten" || /maternelle/.test(n)) return { categorie: "primaire", prive };
  if (/\bepp\b|\bep\b|primaire/.test(n)) return { categorie: "primaire", prive };
  if (amenite === "school" || /[ée]cole/.test(n)) return { categorie: "primaire", prive };
  return { categorie: "autre", prive };
}

// Nom du groupe affiché sur la petite carte
function groupeDe(cat: CategorieEdu, prive: boolean, nomComplet: string): string {
  switch (cat) {
    case "universite": return prive ? "Université privée" : "Université";
    case "lycee": return prive ? "Lycée privé" : "Lycée";
    case "college":
      if (prive) return "Collège privé";
      return CEG.test(nomComplet) ? "CEG" : "Collège";
    case "primaire": return prive ? "École primaire privée" : "École primaire";
    default: return "Autre établissement scolaire";
  }
}

function lire(f: any): Ecole | null {
  const p = f?.properties ?? {};
  const c = f?.geometry?.coordinates;
  if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;

  const nomBrut = propre(p.name);
  const amenite = propre(p.amenity);
  if (!nomBrut && !amenite) return null;

  const nomComplet = nomBrut || "Établissement scolaire";
  const { categorie, prive } = classer(nomComplet, amenite);
  return {
    nomComplet,
    nomCourt: nomBrut ? nomCourt(nomBrut) : "Établissement scolaire",
    groupe: groupeDe(categorie, prive, nomComplet),
    categorie,
    prive,
    region: propre(p.adm1_name),
    district: propre(p.adm2_name),
    commune: propre(p.adm3_name),
    fokontany: propre(p.adm4_name),
    lat: c[1],
    lon: c[0],
  };
}

/* ---------- doublons ---------- */

// Supprime les répétitions de mots consécutives : « ranohira ranohira ville » → « ranohira ville »
const sansRepetition = (s: string) => {
  const mots = s.split(" ").filter(Boolean);
  return mots.filter((m, i) => i === 0 || m !== mots[i - 1]).join(" ");
};

/**
 * Un même établissement peut être saisi deux fois (CEG Ranohira Ville et CEG Ranohira Ranohira Ville).
 * On ne garde qu'une ligne par groupe et par nom, en privilégiant celle qui a un fokontany.
 */
export function dedoublonner(liste: Ecole[]): Ecole[] {
  const vus = new Map<string, Ecole>();
  for (const e of liste) {
    const cle = `${e.groupe}|${sansRepetition(norm(e.nomCourt))}`;
    const deja = vus.get(cle);
    if (!deja) vus.set(cle, e);
    else if (!deja.fokontany && e.fokontany) vus.set(cle, e);
  }
  return [...vus.values()];
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

/** Établissements de la zone choisie (région, district, commune), sans doublons. */
export function ecolesDansZone(ecoles: Ecole[], zone: Zone): Ecole[] {
  const dans = ecoles.filter(
    (e) =>
      (!zone.region || correspond(e.region, zone.region)) &&
      (!zone.district || correspond(e.district, zone.district)) &&
      (!zone.commune || correspond(e.commune, zone.commune)),
  );
  return dedoublonner(dans);
}

/** Affiche ou masque une catégorie sur la carte (appelé par un clic sur la légende). */
export function basculerEducation(cat: CategorieEdu) {
  if (masques.has(cat)) masques.delete(cat);
  else masques.add(cat);
  window.dispatchEvent(new Event(EVT));
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
    .edu-leg-row{display:flex;align-items:center;gap:7px;margin:3px 0;width:100%;padding:2px 4px;
      background:none;border:0;border-radius:6px;font:inherit;color:inherit;text-align:left;cursor:pointer}
    .edu-leg-row:hover{background:rgba(0,0,0,.05)}
    .edu-leg-row.off{opacity:.35;text-decoration:line-through}
    .edu-hint{font-size:10.5px;color:#5b6660;margin-top:4px}`;
  document.head.appendChild(s);
}

function pastille(cat: CategorieEdu) {
  const s = STYLE[cat];
  return `<span class="edu-pt" style="background:${s.couleur};border-radius:${s.carre ? "3px" : "50%"}"></span>`;
}

function marqueur(e: Ecole, avecNom: boolean) {
  const texte = avecNom ? `<span class="edu-txt">${esc(e.nomCourt)}</span>` : "";
  const icone = L.divIcon({
    className: "edu-icon",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html: `<div class="edu-wrap">${pastille(e.categorie)}${texte}</div>`,
  });
  const lignes = [
    `<strong>${esc(e.nomComplet)}</strong>`,
    `Type : ${esc(e.groupe)}`,
    e.commune ? `Commune : ${esc(e.commune)}` : "",
    e.district ? `District : ${esc(e.district)}` : "",
    e.fokontany ? `Fokontany : ${esc(e.fokontany)}` : "",
  ].filter(Boolean);
  return L.marker([e.lat, e.lon], { icon: icone, title: e.nomComplet, alt: e.nomComplet, keyboard: true })
    .bindPopup(`<div style="font:13px/1.5 system-ui">${lignes.join("<br/>")}</div>`);
}

// Contenu de la légende : une ligne par catégorie présente. Un élément masqué est grisé.
function htmlLegende(cats: CategorieEdu[]): string {
  if (!cats.length) return "";
  return (
    `<strong>Éducation</strong>` +
    cats
      .map(
        (c) =>
          `<button type="button" class="edu-leg-row${masques.has(c) ? " off" : ""}" data-cat="${c}">` +
          `${pastille(c)}<span>${esc(STYLE[c].libelle)}</span></button>`,
      )
      .join("") +
    `<div class="edu-hint">Cliquez pour afficher ou masquer</div>`
  );
}

/**
 * Affiche les établissements scolaires de la zone sur la carte, avec une légende cliquable.
 * Actif seulement quand l'onglet Social est ouvert. Au niveau commune, chaque point porte son nom.
 */
export function useEducationMap(mapRef: { current: L.Map | null }, zone: Zone, actif: boolean) {
  const { region, district, commune } = zone;

  useEffect(() => {
    const carte = mapRef.current;
    if (!actif || !carte || !region) return;
    injecterStyle();

    let annule = false;
    let liste: Ecole[] = [];
    let groupe: L.LayerGroup | null = null;
    let legEl: HTMLDivElement | null = null;
    const avecNom = !!commune;

    const dessiner = () => {
      if (annule) return;
      groupe?.remove();
      const visibles = liste.filter((e) => !masques.has(e.categorie));
      groupe = L.layerGroup(visibles.map((e) => marqueur(e, avecNom))).addTo(carte);
      if (legEl) legEl.innerHTML = htmlLegende([...new Set(liste.map((e) => e.categorie))]);
    };

    const ctl = L.control({ position: "topright" });
    ctl.onAdd = () => {
      legEl = L.DomUtil.create("div", "edu-leg");
      legEl.addEventListener("click", (ev) => {
        const b = (ev.target as HTMLElement).closest("[data-cat]") as HTMLElement | null;
        if (b?.dataset.cat) basculerEducation(b.dataset.cat as CategorieEdu);
      });
      L.DomEvent.disableClickPropagation(legEl);
      return legEl;
    };
    ctl.addTo(carte);

    const surFiltre = () => dessiner();
    window.addEventListener(EVT, surFiltre);

    chargerEducation()
      .then((ecoles) => {
        if (annule) return;
        liste = ecolesDansZone(ecoles, { region, district, commune });
        console.info("Éducation : établissements affichés =", liste.length, { region, district, commune });
        dessiner();
      })
      .catch(() => {
        /* base indisponible : la carte reste utilisable, sans points */
      });

    return () => {
      annule = true;
      window.removeEventListener(EVT, surFiltre);
      groupe?.remove();
      ctl.remove();
    };
  }, [mapRef, actif, region, district, commune]);
}
