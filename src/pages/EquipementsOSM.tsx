/**
 * EquipementsOSM.tsx — équipements sociaux et économiques (OpenStreetMap)
 *
 * Utilisé par les onglets Social et Économie de AnalyseTerritoriale.tsx.
 *  - Social    : Santé (CHU, CHRR, CHRD, CSB2, CSB1, ...) et Éducation (EPP, CEG, lycée, ...)
 *  - Économie  : marchés, banques, stations-service, hébergement, industrie, transport
 *
 * Données : OpenStreetMap via Overpass API (aucune clé, aucun serveur à ajouter).
 * Le type (CSB1, CSB2, CHRD...) est déduit du nom de la structure, comme dans le suivi du
 * WikiProject Madagascar. Les chiffres reflètent donc la cartographie OSM, pas un recensement officiel.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Search, Eye, EyeOff, RotateCcw } from "lucide-react";
import { LOCALE, type Lang } from "./analyseTexts";

/* ===================== TYPES ===================== */

export type Domaine = "sante" | "education" | "economie";
export type Geom = { type: string; coordinates: any };
export type Equip = { id: string; osm: string; lat: number; lon: number; nom: string; cat: string };
type Cat = { key: string; couleur: string; label: Record<Lang, string> };
type Row = { nom: string; cnt: Record<string, number>; tot: number };

const A = (s: string): Record<Lang, string> => ({ fr: s, en: s, mg: s, de: s });
const L4 = (fr: string, en: string, mg: string, de: string): Record<Lang, string> => ({ fr, en, mg, de });

/* ===================== CATÉGORIES ===================== */

const CATS: Record<Domaine, Cat[]> = {
  sante: [
    { key: "chu", couleur: "#6d28d9", label: A("CHU") },
    { key: "chrr", couleur: "#1d4ed8", label: A("CHRR") },
    { key: "chrd", couleur: "#0891b2", label: A("CHRD") },
    { key: "csb2", couleur: "#059669", label: A("CSB 2") },
    { key: "csb1", couleur: "#84cc16", label: A("CSB 1") },
    { key: "csb", couleur: "#a8a29e", label: L4("CSB (niveau non précisé)", "CSB (level not stated)", "CSB (haavo tsy voalaza)", "CSB (Stufe unklar)") },
    { key: "csm", couleur: "#f59e0b", label: L4("Autre centre de santé", "Other health centre", "Toeram-pahasalamana hafa", "Anderes Gesundheitszentrum") },
    { key: "hopital", couleur: "#e11d48", label: L4("Autre hôpital", "Other hospital", "Hopitaly hafa", "Anderes Krankenhaus") },
    { key: "clinique", couleur: "#ec4899", label: L4("Clinique", "Clinic", "Klinika", "Klinik") },
    { key: "cabinet", couleur: "#94a3b8", label: L4("Cabinet médical ou dentaire", "Doctor or dentist", "Biraon'ny dokotera", "Arzt- oder Zahnarztpraxis") },
    { key: "autre", couleur: "#64748b", label: L4("Autre structure", "Other facility", "Toerana hafa", "Sonstige Einrichtung") },
  ],
  education: [
    { key: "mat", couleur: "#f59e0b", label: L4("Maternelle", "Kindergarten", "Sekoly maternelle", "Kindergarten") },
    { key: "epp", couleur: "#22c55e", label: L4("Primaire (EPP)", "Primary (EPP)", "Sekoly fototra (EPP)", "Grundschule (EPP)") },
    { key: "ceg", couleur: "#0ea5e9", label: L4("Collège (CEG)", "Lower secondary (CEG)", "Kolejy (CEG)", "Sekundarstufe I (CEG)") },
    { key: "lycee", couleur: "#6366f1", label: L4("Lycée", "Upper secondary", "Lisea", "Lycée") },
    { key: "univ", couleur: "#a21caf", label: L4("Supérieur, université", "Higher education", "Fianarana ambony", "Hochschule, Universität") },
    { key: "ecole", couleur: "#94a3b8", label: L4("École (niveau non précisé)", "School (level not stated)", "Sekoly (haavo tsy voalaza)", "Schule (Stufe unklar)") },
  ],
  economie: [
    { key: "marche", couleur: "#f97316", label: L4("Marché", "Market", "Tsena", "Markt") },
    { key: "finance", couleur: "#0ea5e9", label: L4("Banque et finance", "Bank and finance", "Banky sy vola", "Bank und Finanzen") },
    { key: "carburant", couleur: "#ef4444", label: L4("Station-service", "Fuel station", "Stasiona solika", "Tankstelle") },
    { key: "hebergement", couleur: "#8b5cf6", label: L4("Hébergement", "Accommodation", "Fandraisam-bahiny", "Unterkunft") },
    { key: "industrie", couleur: "#64748b", label: L4("Industrie et ateliers", "Industry and workshops", "Indostria sy ateliera", "Industrie und Werkstätten") },
    { key: "transport", couleur: "#14b8a6", label: L4("Transport", "Transport", "Fitaterana", "Verkehr") },
    { key: "commerce", couleur: "#eab308", label: L4("Grande distribution", "Supermarkets", "Fivarotana lehibe", "Supermärkte") },
  ],
};

/** Colonnes de la carte de chaleur ; le reste est regroupé dans « Autres ». */
const COLS: Record<Domaine, string[]> = {
  sante: ["chu", "chrr", "chrd", "csb2", "csb1"],
  education: ["mat", "epp", "ceg", "lycee", "univ"],
  economie: ["marche", "finance", "carburant", "hebergement", "transport"],
};
/** Catégories servant au calcul du rayon théorique moyen. */
const REF: Record<Domaine, string[]> = {
  sante: ["csb1", "csb2", "csb", "csm"],
  education: ["epp"],
  economie: ["marche"],
};
const PYR = ["chu", "chrr", "chrd", "csb2", "csb1"];

export const catsDe = (d: Domaine) => CATS[d];

/* ===================== TEXTES ===================== */

const TX: Record<Lang, any> = {
  fr: {
    dom: { sante: "Santé", education: "Éducation" },
    titre: { sante: "Formations sanitaires", education: "Établissements scolaires", economie: "Équipements économiques" },
    sub: { sante: "CHU, CHRR, CHRD, CSB et autres structures de soins", education: "De la maternelle à l'enseignement supérieur", economie: "Marchés, finance, carburant, hébergement, transport, industrie" },
    tot: "équipements cartographiés", dens: "pour 100 km²", rayon: "Rayon théorique moyen",
    rayonSub: { sante: "autour d'un centre de santé de base", education: "autour d'une école primaire", economie: "autour d'un marché" },
    noms: "avec un nom renseigné",
    pyr: "Pyramide sanitaire", pyrSub: "Nombre de structures à chaque niveau de recours",
    niv: { chu: "Hôpital universitaire", chrr: "Référence régionale", chrd: "Référence de district", csb2: "Avec médecin", csb1: "Paramédical" },
    ratio: "{x} CSB 1 pour 1 CSB 2",
    cats: "Types d'équipement", catsHint: "Cliquez sur une ligne pour l'afficher ou la masquer sur la carte.",
    rep: "Répartition par {u}", district: "district", commune: "commune",
    horsLimites: "Hors limites connues", totalRow: "Total", autres: "Autres",
    liste: "Liste détaillée", chercher: "Rechercher un nom", sansNom: "(sans nom)", plus: "Afficher plus", csv: "Exporter en CSV",
    resultats: "{n} résultats", charge: "Interrogation d'OpenStreetMap…", reessayer: "Réessayer",
    erreur: "OpenStreetMap n'a pas répondu ({e}). Aucun chiffre n'est affiché.",
    vide: "Aucun équipement de ce type n'est cartographié dans cette zone.",
    source: "Source : © contributeurs OpenStreetMap (ODbL), via Overpass API, interrogée le {d}.",
    limites: "Ces chiffres reflètent l'avancement de la cartographie, pas un recensement officiel : des structures peuvent manquer ou n'avoir pas de nom. Le niveau (CSB 1, CSB 2, CHRD…) est déduit du nom.",
    suivi: "Suivi de la cartographie (OSM Wiki)", voirOsm: "Voir sur OpenStreetMap", carte: "Sur la carte",
  },
  en: {
    dom: { sante: "Health", education: "Education" },
    titre: { sante: "Health facilities", education: "Schools", economie: "Economic facilities" },
    sub: { sante: "CHU, CHRR, CHRD, CSB and other care facilities", education: "From kindergarten to higher education", economie: "Markets, finance, fuel, accommodation, transport, industry" },
    tot: "mapped facilities", dens: "per 100 km²", rayon: "Average theoretical radius",
    rayonSub: { sante: "around a basic health centre", education: "around a primary school", economie: "around a market" },
    noms: "with a name recorded",
    pyr: "Health pyramid", pyrSub: "Number of facilities at each level of care",
    niv: { chu: "University hospital", chrr: "Regional referral", chrd: "District referral", csb2: "With a doctor", csb1: "Paramedical" },
    ratio: "{x} CSB 1 per CSB 2",
    cats: "Facility types", catsHint: "Click a row to show or hide it on the map.",
    rep: "Breakdown by {u}", district: "district", commune: "commune",
    horsLimites: "Outside known boundaries", totalRow: "Total", autres: "Others",
    liste: "Detailed list", chercher: "Search a name", sansNom: "(unnamed)", plus: "Show more", csv: "Export as CSV",
    resultats: "{n} results", charge: "Querying OpenStreetMap…", reessayer: "Retry",
    erreur: "OpenStreetMap did not respond ({e}). No figure is shown.",
    vide: "No facility of this kind is mapped in this area.",
    source: "Source: © OpenStreetMap contributors (ODbL), via Overpass API, queried on {d}.",
    limites: "These figures reflect mapping progress, not an official census: facilities may be missing or unnamed. The level (CSB 1, CSB 2, CHRD…) is inferred from the name.",
    suivi: "Mapping progress (OSM Wiki)", voirOsm: "View on OpenStreetMap", carte: "On the map",
  },
  mg: {
    dom: { sante: "Fahasalamana", education: "Fianarana" },
    titre: { sante: "Toeram-pitsaboana", education: "Sekoly", economie: "Fotodrafitrasa ara-toekarena" },
    sub: { sante: "CHU, CHRR, CHRD, CSB sy toerana hafa", education: "Hatramin'ny maternelle ka hatrany amin'ny oniversite", economie: "Tsena, banky, solika, fandraisam-bahiny, fitaterana, indostria" },
    tot: "voasarika ao amin'ny sarintany", dens: "isaky ny 100 km²", rayon: "Taratra teorika salanisa",
    rayonSub: { sante: "manodidina ny CSB iray", education: "manodidina ny sekoly fototra iray", economie: "manodidina ny tsena iray" },
    noms: "misy anarana",
    pyr: "Piramida ara-pahasalamana", pyrSub: "Isan'ny toerana isaky ny haavo",
    niv: { chu: "Hopitaly universitaire", chrr: "Fanondroana isam-paritra", chrd: "Fanondroana isam-paritany", csb2: "Misy dokotera", csb1: "Paramedikaly" },
    ratio: "{x} CSB 1 ho an'ny CSB 2 iray",
    cats: "Karazana", catsHint: "Tsindrio ny andalana iray hanehoana na hanafenana azy amin'ny sarintany.",
    rep: "Fanaparitahana isaky ny {u}", district: "paritany", commune: "kaominina",
    horsLimites: "Ivelan'ny sisintany fantatra", totalRow: "Fitambarany", autres: "Hafa",
    liste: "Lisitra", chercher: "Hikaroka anarana", sansNom: "(tsy misy anarana)", plus: "Asehoy bebe kokoa", csv: "Avoaka CSV",
    resultats: "{n} vokatra", charge: "Mangataka amin'ny OpenStreetMap…", reessayer: "Andramo indray",
    erreur: "Tsy namaly ny OpenStreetMap ({e}). Tsy misy isa aseho.",
    vide: "Tsy misy toerana toy izao voasoratra ao amin'ity faritra ity.",
    source: "Loharano: © mpandray anjara OpenStreetMap (ODbL), amin'ny Overpass API, nangatahana tamin'ny {d}.",
    limites: "Ireo isa ireo dia maneho ny fandrosoan'ny fanaovana sarintany fa tsy tala-bola ofisialy: mety tsy hita ny sasany. Ny haavo (CSB 1, CSB 2, CHRD…) dia ahitana avy amin'ny anarana.",
    suivi: "Fanaraha-maso ny sarintany (OSM Wiki)", voirOsm: "Jereo ao amin'ny OpenStreetMap", carte: "Amin'ny sarintany",
  },
  de: {
    dom: { sante: "Gesundheit", education: "Bildung" },
    titre: { sante: "Gesundheitseinrichtungen", education: "Schulen", economie: "Wirtschaftliche Einrichtungen" },
    sub: { sante: "CHU, CHRR, CHRD, CSB und weitere Einrichtungen", education: "Vom Kindergarten bis zur Hochschule", economie: "Märkte, Finanzen, Treibstoff, Unterkunft, Verkehr, Industrie" },
    tot: "kartierte Einrichtungen", dens: "pro 100 km²", rayon: "Mittlerer theoretischer Radius",
    rayonSub: { sante: "um ein Basisgesundheitszentrum", education: "um eine Grundschule", economie: "um einen Markt" },
    noms: "mit erfasstem Namen",
    pyr: "Gesundheitspyramide", pyrSub: "Anzahl der Einrichtungen je Versorgungsstufe",
    niv: { chu: "Universitätsklinik", chrr: "Regionale Referenz", chrd: "Distrikt-Referenz", csb2: "Mit Arzt", csb1: "Paramedizinisch" },
    ratio: "{x} CSB 1 je CSB 2",
    cats: "Einrichtungstypen", catsHint: "Zeile anklicken, um sie auf der Karte ein- oder auszublenden.",
    rep: "Aufteilung nach {u}", district: "Distrikt", commune: "Gemeinde",
    horsLimites: "Außerhalb bekannter Grenzen", totalRow: "Gesamt", autres: "Sonstige",
    liste: "Detailliste", chercher: "Name suchen", sansNom: "(ohne Namen)", plus: "Mehr anzeigen", csv: "Als CSV exportieren",
    resultats: "{n} Ergebnisse", charge: "OpenStreetMap wird abgefragt…", reessayer: "Erneut versuchen",
    erreur: "OpenStreetMap hat nicht geantwortet ({e}). Es werden keine Zahlen angezeigt.",
    vide: "In diesem Gebiet ist keine Einrichtung dieser Art kartiert.",
    source: "Quelle: © OpenStreetMap-Mitwirkende (ODbL), über die Overpass API, abgefragt am {d}.",
    limites: "Die Zahlen spiegeln den Kartierungsstand wider, keine amtliche Erhebung: Einrichtungen können fehlen oder keinen Namen haben. Die Stufe (CSB 1, CSB 2, CHRD…) wird aus dem Namen abgeleitet.",
    suivi: "Kartierungsstand (OSM-Wiki)", voirOsm: "Auf OpenStreetMap ansehen", carte: "Auf der Karte",
  },
};
const tx = (l: Lang) => TX[l] ?? TX.fr;
const rp = (s: string, o: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? ""));
export const titreDomaine = (d: Domaine, l: Lang): string => tx(l).titre[d];

/* ===================== CLASSIFICATION ===================== */

type Tags = Record<string, string>;
const noms = (t: Tags) => [t.name, t["name:fr"], t.short_name, t.official_name, t.alt_name].filter(Boolean).join(" ");

function classerSante(t: Tags): string | null {
  if (t.amenity === "pharmacy") return null;
  const n = noms(t);
  if (/\bCHU[A-Z]?\b|\bHJR[AB]\b|centre hospitalier universitaire|h[ôo]pital universitaire/i.test(n)) return "chu";
  if (/\bCHRR\b|r[ée]f[ée]rence r[ée]gional/i.test(n)) return "chrr";
  if (/\bCHRD|\bCHD\b|r[ée]f[ée]rence de district/i.test(n)) return "chrd";
  if (/CSB\s*[-_.]?\s*(2|II)(?![a-z0-9])/i.test(n)) return "csb2";
  if (/CSB\s*[-_.]?\s*(1|I)(?![a-z0-9])/i.test(n)) return "csb1";
  if (/\bCSB\b|centre de sant[ée] de base/i.test(n)) return "csb";
  if (/\bCSMI\b|\bCSM\b|\bCSS\b|centre de sant[ée]|dispensaire/i.test(n)) return "csm";
  if (t.amenity === "hospital" || /h[ôo]pital|hopitaly|maternit[ée]/i.test(n)) return "hopital";
  if (t.amenity === "clinic" || t.healthcare === "clinic" || t.healthcare === "centre" || /clinique/i.test(n)) return "clinique";
  if (t.amenity === "doctors" || t.amenity === "dentist" || t.healthcare === "doctor" || t.healthcare === "dentist") return "cabinet";
  return "autre";
}

function classerEdu(t: Tags): string | null {
  const n = noms(t);
  if (t.amenity === "university" || /universit|\bIUT\b|institut sup|[ée]cole sup|facult[ée]/i.test(n)) return "univ";
  if (/lyc[ée]e|\bLTP\b/i.test(n)) return "lycee";
  if (/\bCEG\b|coll[eè]ge/i.test(n)) return "ceg";
  if (/\bEPP\b|\bEPU\b|primaire/i.test(n)) return "epp";
  if (t.amenity === "kindergarten" || /maternelle|jardin d.enfant/i.test(n)) return "mat";
  if (t.amenity === "college") return "univ";
  return t.amenity === "school" ? "ecole" : null;
}

function classerEco(t: Tags): string | null {
  if (t.amenity === "marketplace") return "marche";
  if (t.amenity === "bank" || t.amenity === "bureau_de_change" || t.office === "financial") return "finance";
  if (t.amenity === "fuel") return "carburant";
  if (["hotel", "guest_house", "hostel", "motel", "resort", "chalet", "apartment"].includes(t.tourism)) return "hebergement";
  if (t.man_made === "works" || t.industrial || t.craft) return "industrie";
  if (t.aeroway || t.harbour === "yes" || t.railway === "station" || t.amenity === "bus_station" || t.amenity === "ferry_terminal") return "transport";
  if (t.shop) return "commerce";
  return null;
}
const CLASSEUR: Record<Domaine, (t: Tags) => string | null> = { sante: classerSante, education: classerEdu, economie: classerEco };

/* ===================== GÉOMÉTRIE ===================== */

const inRing = (x: number, y: number, r: number[][]) => {
  let o = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) o = !o;
  return o;
};
const polysG = (g: Geom): number[][][][] => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const inGeom = (x: number, y: number, g: Geom) => polysG(g).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
/** [minLon, minLat, maxLon, maxLat] */
const bboxG = (g: Geom): [number, number, number, number] => {
  let a = 180, b = 90, c = -180, d = -90;
  polysG(g).forEach((p) => p[0].forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }));
  return [a, b, c, d];
};

/* ===================== OVERPASS ===================== */

const FILTRES: Record<Domaine, string[]> = {
  sante: ['["amenity"~"^(hospital|clinic|doctors|dentist)$"]', '["healthcare"]["amenity"!="pharmacy"]'],
  education: ['["amenity"~"^(school|kindergarten|college|university)$"]'],
  economie: [
    '["amenity"~"^(marketplace|bank|bureau_de_change|fuel|bus_station|ferry_terminal)$"]',
    '["office"="financial"]',
    '["tourism"~"^(hotel|guest_house|hostel|motel|resort|chalet|apartment)$"]',
    '["man_made"="works"]', '["craft"]', '["industrial"]',
    '["aeroway"~"^(aerodrome|terminal)$"]', '["harbour"="yes"]', '["railway"="station"]',
    '["shop"~"^(supermarket|mall|department_store|wholesale)$"]',
  ],
};
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const RAW = new Map<string, Promise<any[]>>();

async function overpass(q: string): Promise<any[]> {
  let derniere = "connexion";
  for (const u of ENDPOINTS) {
    const ctl = new AbortController();
    const minuteur = setTimeout(() => ctl.abort(), 55000);
    try {
      const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q), signal: ctl.signal });
      if (!r.ok) { derniere = `HTTP ${r.status}`; continue; }
      const j = await r.json();
      if (!Array.isArray(j?.elements)) { derniere = "réponse"; continue; }
      return j.elements;
    } catch (e: any) {
      derniere = e?.name === "AbortError" ? "délai dépassé" : "connexion";
    } finally {
      clearTimeout(minuteur);
    }
  }
  throw new Error(derniere);
}

function chargerOSM(d: Domaine, bb: [number, number, number, number], force: boolean): Promise<any[]> {
  const [w, s, e, n] = bb;
  const cle = `${d}|${[s, w, n, e].map((v) => v.toFixed(3)).join(",")}`;
  if (force) RAW.delete(cle);
  let p = RAW.get(cle);
  if (!p) {
    const q = `[out:json][timeout:50];(${FILTRES[d].map((f) => `nwr${f}(${s},${w},${n},${e});`).join("")});out center tags;`;
    p = overpass(q);
    RAW.set(cle, p);
    p.catch(() => RAW.delete(cle));
  }
  return p;
}

/** Charge les équipements dans la zone (emprise puis découpage exact par le polygone). */
export function useEquipements(domaine: Domaine | null, geom: Geom | null) {
  const [essai, setEssai] = useState(0);
  const [s, setS] = useState<{ dom: Domaine | null; raw: any[] | null; busy: boolean; err: string | null; at: number | null }>(
    { dom: null, raw: null, busy: false, err: null, at: null });

  useEffect(() => {
    if (!domaine || !geom) { setS({ dom: null, raw: null, busy: false, err: null, at: null }); return; }
    let actif = true;
    setS({ dom: domaine, raw: null, busy: true, err: null, at: null });
    chargerOSM(domaine, bboxG(geom), essai > 0)
      .then((raw) => { if (actif) setS({ dom: domaine, raw, busy: false, err: null, at: Date.now() }); })
      .catch((e) => { if (actif) setS({ dom: domaine, raw: null, busy: false, err: String(e?.message || "connexion"), at: null }); });
    return () => { actif = false; };
  }, [domaine, geom, essai]);

  const items = useMemo<Equip[]>(() => {
    if (!s.raw || !domaine || !geom || s.dom !== domaine) return [];
    const classer = CLASSEUR[domaine];
    const vus = new Set<string>();
    const out: Equip[] = [];
    for (const el of s.raw) {
      const osm = `${el.type}/${el.id}`;
      if (vus.has(osm)) continue;
      const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inGeom(lon, lat, geom)) continue;
      const tags: Tags = el.tags || {};
      const cat = classer(tags);
      if (!cat) continue;
      vus.add(osm);
      out.push({ id: osm, osm, lat, lon, nom: (tags.name || tags["name:fr"] || tags.short_name || "").trim(), cat });
    }
    return out;
  }, [s.raw, s.dom, domaine, geom]);

  return { items, busy: s.busy, err: s.err, at: s.at, retry: () => setEssai((n) => n + 1) };
}

/** Contenu d'une bulle de carte, construit sans HTML brut (les noms OSM ne sont pas fiables). */
export function popupEquip(e: Equip, lang: Lang, label: string): HTMLElement {
  const t = tx(lang);
  const d = document.createElement("div");
  d.style.cssText = "font:13px/1.5 system-ui";
  const b = document.createElement("strong");
  b.textContent = e.nom || t.sansNom;
  d.appendChild(b);
  d.appendChild(document.createElement("br"));
  d.appendChild(document.createTextNode(label));
  d.appendChild(document.createElement("br"));
  const a = document.createElement("a");
  a.href = `https://www.openstreetmap.org/${e.osm}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = t.voirOsm;
  d.appendChild(a);
  return d;
}

/* ===================== PANNEAU ===================== */

type Props = {
  domaine: Domaine;
  lang: Lang;
  onDomaine?: (d: "sante" | "education") => void;
  areaKm2: number;
  data: ReturnType<typeof useEquipements>;
  enfants: { nom: string; geometry: Geom }[];
  enfantNiveau: "district" | "commune";
  off: string[];
  setOff: (v: string[]) => void;
  onFocus: (e: Equip) => void;
};

export default function PanneauEquipements(p: Props) {
  const { domaine, lang, data, off, setOff } = p;
  const t = tx(lang);
  const cats = CATS[domaine];
  const catDe = (k: string) => cats.find((c) => c.key === k);
  const N = (n: number, d = 0) => n.toLocaleString(LOCALE[lang], { maximumFractionDigits: d });
  const items = data.items;
  const [q, setQ] = useState("");
  const [lim, setLim] = useState(40);
  useEffect(() => { setLim(40); }, [items, q, off]);
  useEffect(() => { setQ(""); }, [domaine]);

  const compte = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((e) => { m[e.cat] = (m[e.cat] || 0) + 1; });
    return m;
  }, [items]);
  const total = items.length;
  const nommes = items.filter((e) => e.nom).length;
  const nRef = REF[domaine].reduce((s, k) => s + (compte[k] || 0), 0);
  const rayon = nRef > 0 && p.areaKm2 > 0 ? Math.sqrt(p.areaKm2 / (Math.PI * nRef)) : null;
  const maxCat = Math.max(1, ...cats.map((c) => compte[c.key] || 0));
  const maxPyr = Math.max(1, ...PYR.map((k) => compte[k] || 0));

  /* carte de chaleur : sous-unités × types */
  const hm = useMemo(() => {
    if (!p.enfants.length || !items.length) return null;
    const cols = COLS[domaine];
    const boites = p.enfants.map((e) => ({ nom: e.nom, g: e.geometry, b: bboxG(e.geometry), cnt: {} as Record<string, number>, tot: 0 }));
    const hors: Row = { nom: t.horsLimites, cnt: {}, tot: 0 };
    items.forEach((e) => {
      const col = cols.includes(e.cat) ? e.cat : "autres";
      const r: Row = boites.find((b) => e.lon >= b.b[0] && e.lon <= b.b[2] && e.lat >= b.b[1] && e.lat <= b.b[3] && inGeom(e.lon, e.lat, b.g)) ?? hors;
      r.cnt[col] = (r.cnt[col] || 0) + 1;
      r.tot++;
    });
    const rows: Row[] = boites.map(({ nom, cnt, tot }) => ({ nom, cnt, tot })).sort((a, b) => b.tot - a.tot || a.nom.localeCompare(b.nom, lang));
    if (hors.tot) rows.push(hors);
    const colMax: Record<string, number> = {};
    [...cols, "autres"].forEach((k) => { colMax[k] = Math.max(1, ...rows.map((r) => r.cnt[k] || 0)); });
    return { cols, rows, colMax, maxTot: Math.max(1, ...rows.map((r) => r.tot)) };
  }, [items, p.enfants, domaine, lang, t.horsLimites]);

  /* liste filtrée */
  const liste = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const ordre = new Map(cats.map((c, i) => [c.key, i]));
    return items
      .filter((e) => !off.includes(e.cat) && (!needle || e.nom.toLowerCase().includes(needle)))
      .sort((a, b) => (ordre.get(a.cat)! - ordre.get(b.cat)!) || a.nom.localeCompare(b.nom, lang));
  }, [items, off, q, cats, lang]);

  const basculer = (k: string) => setOff(off.includes(k) ? off.filter((x) => x !== k) : [...off, k]);

  const exporter = () => {
    const safe = (v: string | number) => {
      const s = String(v);
      return `"${(typeof v === "string" && /^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
    };
    const lignes = [["categorie", "nom", "latitude", "longitude", "osm"],
      ...liste.map((e) => [catDe(e.cat)?.label[lang] ?? e.cat, e.nom, e.lat, e.lon, `https://www.openstreetmap.org/${e.osm}`])];
    const blob = new Blob(["\ufeff" + lignes.map((r) => r.map(safe).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `equipements-${domaine}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const dateAff = data.at ? new Date(data.at).toLocaleString(LOCALE[lang], { dateStyle: "short", timeStyle: "short" }) : "—";
  const ratio = (compte.csb2 || 0) > 0 ? N((compte.csb1 || 0) / compte.csb2, 1) : null;

  return (
    <div className="eq">
      <style>{CSS_EQ}</style>

      <section className="at-card eq-head">
        {p.onDomaine && (
          <div className="at-seg eq-dom" role="group" aria-label={t.titre[domaine]}>
            {(["sante", "education"] as const).map((d) => (
              <button key={d} type="button" aria-pressed={domaine === d} onClick={() => p.onDomaine!(d)}>{t.dom[d]}</button>
            ))}
          </div>
        )}
        <h3>{t.titre[domaine]}</h3>
        <p className="at-sub">{t.sub[domaine]}</p>

        {data.busy && <p className="at-load">{t.charge}</p>}
        {data.err && (
          <p className="at-alert" role="alert">
            {rp(t.erreur, { e: data.err })} <button type="button" className="at-link" onClick={data.retry}><RotateCcw size={12} /> {t.reessayer}</button>
          </p>
        )}
        {!data.busy && !data.err && (
          <div className="eq-kpis">
            <div className="eq-kpi-main"><b>{N(total)}</b><span>{t.tot}</span></div>
            <div className="eq-kpi"><b>{total ? N((total / Math.max(p.areaKm2, 0.01)) * 100, 1) : "—"}</b><span>{t.dens}</span></div>
            <div className="eq-kpi" title={t.rayonSub[domaine]}>
              <b>{rayon != null ? `${N(rayon, rayon < 10 ? 1 : 0)} km` : "—"}</b>
              <span>{t.rayon} · {t.rayonSub[domaine]}</span>
            </div>
            <div className="eq-kpi"><b>{total ? `${N((nommes / total) * 100, 0)} %` : "—"}</b><span>{t.noms}</span></div>
          </div>
        )}
      </section>

      {!data.busy && !data.err && total === 0 && <p className="at-note eq-vide">{t.vide}</p>}

      {!data.busy && !data.err && total > 0 && (
        <>
          {domaine === "sante" && (
            <section className="at-card">
              <h3 className="eq-h">{t.pyr}</h3>
              <p className="at-sub">{t.pyrSub}</p>
              <div className="eq-pyr" role="img" aria-label={t.pyr}>
                {PYR.map((k) => {
                  const n = compte[k] || 0, c = catDe(k)!;
                  return (
                    <div className="eq-pyr-row" key={k}>
                      <div className="eq-pyr-lab"><b>{c.label[lang]}</b><small>{t.niv[k]}</small></div>
                      <div className="eq-pyr-bar"><i style={{ width: `${n ? Math.max(6, (n / maxPyr) * 100) : 2}%`, background: c.couleur }} /></div>
                      <div className="eq-pyr-n">{N(n)}</div>
                    </div>
                  );
                })}
              </div>
              {ratio && <p className="at-note">{rp(t.ratio, { x: ratio })}</p>}
            </section>
          )}

          <section className="at-card">
            <h3 className="eq-h">{t.cats}</h3>
            <p className="at-sub">{t.catsHint}</p>
            <div className="eq-cats">
              {cats.filter((c) => compte[c.key]).map((c) => {
                const n = compte[c.key], visible = !off.includes(c.key);
                return (
                  <button key={c.key} type="button" className="eq-cat" aria-pressed={visible} onClick={() => basculer(c.key)} title={t.carte}>
                    <i style={{ background: c.couleur }} />
                    <span className="eq-cat-nom">{c.label[lang]}</span>
                    <span className="eq-cat-bar"><u style={{ width: `${(n / maxCat) * 100}%`, background: c.couleur }} /></span>
                    <span className="eq-cat-n">{N(n)}</span>
                    <span className="eq-cat-p">{N((n / total) * 100, 1)} %</span>
                    {visible ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
                  </button>
                );
              })}
            </div>
          </section>

          {hm && (
            <section className="at-card">
              <h3 className="eq-h">{rp(t.rep, { u: t[p.enfantNiveau] })}</h3>
              <div className="eq-hm-wrap">
                <table className="eq-hm">
                  <thead>
                    <tr>
                      <th scope="col" />
                      {hm.cols.map((k) => <th scope="col" key={k}>{catDe(k)?.label[lang]}</th>)}
                      <th scope="col">{t.autres}</th>
                      <th scope="col">{t.totalRow}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hm.rows.map((r) => (
                      <tr key={r.nom}>
                        <th scope="row" title={r.nom}>{r.nom}</th>
                        {[...hm.cols, "autres"].map((k) => {
                          const v = r.cnt[k] || 0, col = catDe(k)?.couleur ?? "#64748b";
                          return (
                            <td key={k} className={v ? "" : "eq-zero"} style={v ? { background: `color-mix(in srgb, ${col} ${Math.round(14 + (v / hm.colMax[k]) * 62)}%, transparent)` } : undefined}>
                              {v ? N(v) : "·"}
                            </td>
                          );
                        })}
                        <td className="eq-tot"><span>{N(r.tot)}</span><u style={{ width: `${(r.tot / hm.maxTot) * 100}%` }} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{t.totalRow}</th>
                      {[...hm.cols, "autres"].map((k) => (
                        <td key={k}>{N(hm.rows.reduce((s, r) => s + (r.cnt[k] || 0), 0))}</td>
                      ))}
                      <td className="eq-tot">{N(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          <section className="at-card">
            <div className="at-ch">
              <h3 className="eq-h">{t.liste}</h3>
              <button type="button" className="at-tool" onClick={exporter}><Download size={14} />{t.csv}</button>
            </div>
            <label className="eq-search">
              <Search size={14} aria-hidden />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.chercher} aria-label={t.chercher} />
            </label>
            <p className="at-sub">{rp(t.resultats, { n: N(liste.length) })}</p>
            <ul className="eq-list">
              {liste.slice(0, lim).map((e) => {
                const c = catDe(e.cat);
                return (
                  <li key={e.id}>
                    <button type="button" className="eq-row" onClick={() => p.onFocus(e)} title={t.carte}>
                      <i style={{ background: c?.couleur }} />
                      <span className="eq-row-cat">{c?.label[lang]}</span>
                      <span className={e.nom ? "eq-row-nom" : "eq-row-nom eq-nn"}>{e.nom || t.sansNom}</span>
                    </button>
                    <a href={`https://www.openstreetmap.org/${e.osm}`} target="_blank" rel="noopener noreferrer" aria-label={`${t.voirOsm} : ${e.nom || t.sansNom}`}><ExternalLink size={13} /></a>
                  </li>
                );
              })}
            </ul>
            {liste.length > lim && <button type="button" className="at-tool eq-more" onClick={() => setLim((n) => n + 60)}>{t.plus}</button>}
          </section>

          <p className="at-note">
            {rp(t.source, { d: dateAff })} {t.limites}
            {domaine === "sante" && <> <a className="eq-a" href="https://wiki.openstreetmap.org/wiki/FR:WikiProject_Madagascar/Formations_Sanitaires/Suivi" target="_blank" rel="noopener noreferrer">{t.suivi}</a></>}
          </p>
        </>
      )}
    </div>
  );
}

/* ===================== STYLES ===================== */

const CSS_EQ = `
.eq{display:flex;flex-direction:column;gap:12px}
.eq-head h3,.eq-h{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:20px;margin:0 0 2px}
.eq-dom{display:inline-flex;margin-bottom:10px}
.eq-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 14px;margin-top:6px}
.eq-kpi-main{grid-column:1/-1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.eq-kpi-main b{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:46px;line-height:1;letter-spacing:-.02em}
.eq-kpi-main span{font-size:13px;color:var(--c-ink2)}
.eq-kpi{display:flex;flex-direction:column;gap:2px;padding-top:8px;border-top:1px solid var(--c-line)}
.eq-kpi b{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:24px;line-height:1.1}
.eq-kpi span{font-size:11.5px;color:var(--c-ink3);line-height:1.35}
.eq-vide{padding:6px 4px}
.eq-pyr{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.eq-pyr-row{display:grid;grid-template-columns:minmax(96px,128px) 1fr 44px;gap:10px;align-items:center}
.eq-pyr-lab{display:flex;flex-direction:column;line-height:1.2;min-width:0}
.eq-pyr-lab b{font-size:13px}
.eq-pyr-lab small{font-size:11px;color:var(--c-ink3)}
.eq-pyr-bar{display:flex;justify-content:center;height:26px;background:repeating-linear-gradient(90deg,transparent 0 24.5%,var(--c-line) 24.5% 25%)}
.eq-pyr-bar i{display:block;height:100%;border-radius:4px;transition:width .35s}
.eq-pyr-n{font-variant-numeric:tabular-nums;font-weight:600;font-size:14px;text-align:right}
.eq-cats{display:flex;flex-direction:column;margin-top:6px}
.eq-cat{display:grid;grid-template-columns:12px minmax(110px,1.3fr) minmax(40px,1fr) 44px 52px 16px;gap:8px;align-items:center;width:100%;padding:6px 2px;border:0;border-top:1px solid var(--c-line);background:none;color:var(--c-ink);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
.eq-cat:first-child{border-top:0}
.eq-cat i{width:11px;height:11px;border-radius:50%}
.eq-cat-nom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eq-cat-bar{height:8px;background:var(--c-bg);border-radius:4px;overflow:hidden}
.eq-cat-bar u{display:block;height:100%;text-decoration:none;border-radius:4px}
.eq-cat-n{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.eq-cat-p{text-align:right;color:var(--c-ink3);font-variant-numeric:tabular-nums}
.eq-cat[aria-pressed=false]{opacity:.45}
.eq-cat svg{color:var(--c-ink3)}
.eq-hm-wrap{overflow:auto;max-height:360px;margin-top:8px;border:1px solid var(--c-line);border-radius:10px}
.eq-hm{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;font-variant-numeric:tabular-nums}
.eq-hm th,.eq-hm td{padding:5px 7px;border-bottom:1px solid var(--c-line);text-align:right;white-space:nowrap}
.eq-hm thead th{position:sticky;top:0;z-index:2;background:var(--c-card);font-weight:600;font-size:11px;color:var(--c-ink2);white-space:normal;line-height:1.2;vertical-align:bottom}
.eq-hm tbody th,.eq-hm tfoot th{position:sticky;left:0;z-index:1;background:var(--c-card);text-align:left;font-weight:500;max-width:150px;overflow:hidden;text-overflow:ellipsis}
.eq-hm td{min-width:38px}
.eq-hm .eq-zero{color:var(--c-ink3);opacity:.5}
.eq-hm tfoot th,.eq-hm tfoot td{font-weight:700;border-bottom:0;border-top:2px solid var(--c-line)}
.eq-hm .eq-tot{position:relative;min-width:64px;font-weight:600}
.eq-hm .eq-tot span{position:relative;z-index:1}
.eq-hm .eq-tot u{position:absolute;left:0;bottom:0;height:3px;background:var(--c-ink);opacity:.55;text-decoration:none}
.eq-search{display:flex;align-items:center;gap:8px;border:1px solid var(--c-line);border-radius:9px;padding:6px 10px;color:var(--c-ink3);margin-top:6px}
.eq-search input{flex:1;min-width:0;border:0;background:none;color:var(--c-ink);font:inherit;font-size:13px;outline:none}
.eq-search:focus-within{outline:2px solid var(--c-acc);outline-offset:2px}
.eq-list{list-style:none;margin:0;padding:0;max-height:380px;overflow:auto}
.eq-list li{display:flex;align-items:center;gap:6px;border-top:1px solid var(--c-line)}
.eq-list a{flex:none;color:var(--c-ink3);padding:6px;display:grid;place-items:center}
.eq-list a:hover{color:var(--c-acc)}
.eq-row{flex:1;min-width:0;display:grid;grid-template-columns:10px minmax(64px,112px) 1fr;gap:8px;align-items:center;padding:7px 2px;border:0;background:none;color:var(--c-ink);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
.eq-row:hover .eq-row-nom{text-decoration:underline}
.eq-row i{width:10px;height:10px;border-radius:50%}
.eq-row-cat{color:var(--c-ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eq-row-nom{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eq-nn{font-weight:400;font-style:italic;color:var(--c-ink3)}
.eq-more{margin-top:8px}
.eq-a{color:var(--c-acc);font-weight:600}
.eq button:focus-visible,.eq a:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
@media (max-width:640px){
  .eq-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .eq-cat{grid-template-columns:12px 1fr 44px 16px}
  .eq-cat-bar,.eq-cat-p{display:none}
}
@media (prefers-reduced-motion:reduce){.eq-pyr-bar i{transition:none}}
`;
