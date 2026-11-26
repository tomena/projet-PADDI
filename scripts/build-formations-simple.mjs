// scripts/build-formations.mjs
// Usage : node scripts/build-formations.mjs
// Lit scripts/formations-wikitext.txt (wikitext de la page OSM) et écrit
// public/data/formations-sante.json avec région, district, commune, type et nom.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const ENTREE = "scripts/formations-wikitext.txt";
const SORTIE = "public/data/formations-sante.json";

// Retire les liens wiki [[lien|texte]] et les espaces en trop.
const nettoyer = (s = "") =>
  s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/\s+/g, " ").trim();

// Corrige les variantes de nom de région connues.
const REGIONS = { SAVA: "Sava" };
const region = (s) => {
  const v = nettoyer(s);
  return REGIONS[v] ?? v;
};

// Renvoie { "Titre de section": [ [cellule, cellule, ...], ... ] }
function tableaux(texte) {
  const res = {};
  let section = null;
  let rangee = null;

  const fermer = () => {
    if (section && rangee && rangee.length) res[section].push(rangee);
    rangee = null;
  };

  for (const raw of texte.split("\n")) {
    const l = raw.trim();

    const titre = l.match(/^==\s*(.+?)\s*==$/);
    if (titre) {
      fermer();
      section = titre[1];
      res[section] = [];
      continue;
    }
    if (!section) continue;

    if (l.startsWith("|-")) {
      fermer();
      rangee = [];
      continue;
    }
    // Lignes de cellules "| a || b || c". Les en-têtes "!", "{|", "|}" et "|+" sont ignorés.
    if (rangee && l.startsWith("|") && !l.startsWith("|}") && !l.startsWith("|+")) {
      rangee.push(...l.slice(1).split("||"));
    }
  }
  fermer();
  return res;
}

// Hôpitaux : région, district, établissement (type CHU/CHRR/CHRD + nom), bloc opératoire.
const TYPE_HOP = /^(CHU|CHRR|CHRD)\s+/;

function hopitaux(rangees) {
  return rangees
    .filter((c) => c.length >= 3)
    .map((c) => {
      const [r, d, e, b = ""] = c;
      const libelle = nettoyer(e);
      const m = libelle.match(TYPE_HOP);
      return {
        region: region(r),
        district: nettoyer(d),
        type: m ? m[1] : "autre",
        nom: m ? libelle.slice(m[0].length).trim() : libelle,
        bloc_operatoire: /oui/i.test(nettoyer(b)),
      };
    })
    .filter((h) => h.region && h.nom);
}

// CSB : région, district, commune, type (CSB1, CSB2, CSBU…) et nom.
// Accepte aussi CBS1 (faute de frappe) et CSAJ.
const TYPE_CSB = /^(CSB|CBS|CSAJ)\s*([12U]?)/i;

function centres(rangees) {
  return rangees
    .filter((c) => c.length >= 4)
    .map((c) => {
      const [r, d, co, e] = c;
      const libelle = nettoyer(e);
      const m = libelle.match(TYPE_CSB);
      let type = "autre";
      let nom = libelle;
      if (m) {
        const base = m[1].toUpperCase() === "CSAJ" ? "CSAJ" : "CSB";
        type = base + m[2].toUpperCase();
        nom = libelle.slice(m[0].length).trim() || libelle;
      }
      return {
        region: region(r),
        district: nettoyer(d),
        commune: nettoyer(co),
        type,
        nom,
      };
    })
    .filter((x) => x.region && x.nom);
}

/* ---------- programme principal ---------- */

const texte = await readFile(ENTREE, "utf8");
const t = tableaux(texte);

const cleHop = Object.keys(t).find((k) => /h[ôo]pitaux/i.test(k));
const cleCsb = Object.keys(t).find((k) => /centres de sant/i.test(k));

const hop = cleHop ? hopitaux(t[cleHop]) : [];
const csb = cleCsb ? centres(t[cleCsb]) : [];

if (!hop.length || !csb.length) {
  console.error(
    `Aucune ligne lue (hôpitaux : ${hop.length}, CSB : ${csb.length}). ` +
      `Vérifiez que ${ENTREE} contient le wikitext complet de la page.`,
  );
  process.exit(1);
}

const data = {
  source: "OpenStreetMap Wiki : FR:WikiProject Madagascar/Formations Sanitaires/Suivi",
  licence: "Contenu du wiki : CC BY-SA. Données OSM : ODbL.",
  genere_le: new Date().toISOString().slice(0, 10),
  hopitaux: hop,
  csb,
};

await mkdir(dirname(SORTIE), { recursive: true });
await writeFile(SORTIE, JSON.stringify(data, null, 2), "utf8");

console.log(`Écrit : ${SORTIE}`);
console.log(`Hôpitaux : ${hop.length} · CSB : ${csb.length}`);
const inconnus = csb.filter((x) => x.type === "autre").length;
if (inconnus) console.warn(`Attention : ${inconnus} CSB sans type reconnu.`);
