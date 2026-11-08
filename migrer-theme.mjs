// Convertit les couleurs fixes (#fff, #111827…) des fichiers .tsx / .css
// en variables du thème (var(--surface), var(--text)…).
//
// Utilisation (à la racine du projet) :
//   node migrer-theme.mjs --dry src/pages src/components     (aperçu, ne modifie rien)
//   node migrer-theme.mjs src/pages src/components           (applique)
//
// Faites un commit Git avant : vous pourrez tout annuler avec « git checkout . ».
// Le script peut être relancé sans risque (les var(--…) ne sont plus touchées).

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const cibles = args.filter((a) => a !== "--dry");
if (!cibles.length) {
  console.log("Indiquez au moins un dossier ou fichier. Ex : node migrer-theme.mjs src/pages");
  process.exit(1);
}

const NEG = "(?![0-9a-fA-F])"; // le code couleur doit se terminer là

// Chaque règle : propriété (ou contexte) + couleurs → variable.
// Le guillemet ouvrant est optionnel : fonctionne pour "…", '…' et le CSS brut.
const groupes = [
  {
    prop: "(?:background|backgroundColor|background-color)",
    map: {
      "surface": ["fff", "ffffff"],
      "surface-3": ["fafafa"],
      "surface-2": ["f8fafc", "f9fafb", "f1f5f9", "f3f4f6"],
      "track": ["e5e7eb"],
      "blue-soft": ["eff6ff"],
      "green-soft": ["ecfdf5", "d1fae5"],
    },
  },
  {
    prop: "color",
    map: {
      "text": ["111827", "111", "0f172a"],
      "text-2": ["374151", "334155", "475569", "4b5563"],
      "text-3": ["6b7280", "666", "64748b", "94a3b8"],
      "title-green": ["14532d"],
      "accent": ["1d4ed8"],
    },
  },
];

const regles = [];

for (const { prop, map } of groupes) {
  for (const [variable, codes] of Object.entries(map)) {
    for (const code of codes) {
      regles.push([
        new RegExp(`(\\b${prop}\\s*:\\s*['"]?)#${code}${NEG}`, "gi"),
        `$1var(--${variable})`,
      ]);
    }
  }
}

// Bordures : « 1px solid #e5e7eb » (style objet ou CSS)
for (const code of ["e5e7eb", "dbe4f0", "e2e8f0", "cbd5e1", "d1d5db", "eef2f7", "f1f5f9", "dbeafe", "a7f3d0"]) {
  regles.push([new RegExp(`(solid\\s+)#${code}${NEG}`, "gi"), "$1var(--border)"]);
}
regles.push([/(solid\s+)black\b/gi, "$1var(--text-3)"]);

// SVG / Recharts
regles.push(
  [new RegExp(`(\\bfill=)"#e5e7eb"`, "gi"), '$1"var(--track)"'],
  [new RegExp(`(\\bstroke=)"#(?:fff|ffffff)"`, "gi"), '$1"var(--surface)"'],
  [new RegExp(`(\\bfill:\\s*)"#334155"`, "gi"), '$1"var(--text-2)"'],
  [new RegExp(`(\\bstroke:\\s*)"#1e293b"`, "gi"), '$1"var(--text-2)"'],
  [new RegExp(`#eee 0`, "gi"), "var(--track) 0"], // anneau conic-gradient
);

// ---- parcours des fichiers ----
const EXT = new Set([".tsx", ".ts", ".css"]);
const IGNORER = new Set(["node_modules", "dist", "build", ".git"]);
const IGNORER_FICHIERS = new Set(["ThemeContext.tsx", "theme.css"]);

function lister(p, sortie = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) if (!IGNORER.has(f)) lister(path.join(p, f), sortie);
  } else if (EXT.has(path.extname(p)) && !IGNORER_FICHIERS.has(path.basename(p))) {
    sortie.push(p);
  }
  return sortie;
}

let total = 0;
for (const cible of cibles) {
  if (!fs.existsSync(cible)) { console.log(`Introuvable : ${cible}`); continue; }
  for (const fichier of lister(cible)) {
    const avant = fs.readFileSync(fichier, "utf8");
    let apres = avant;
    let n = 0;
    for (const [re, rempl] of regles) {
      apres = apres.replace(re, (...m) => { n++; return rempl.replace(/\$1/g, m[1]); });
    }
    if (n > 0) {
      total += n;
      console.log(`${dry ? "[aperçu] " : ""}${fichier} : ${n} remplacement(s)`);
      if (!dry) fs.writeFileSync(fichier, apres, "utf8");
    }
  }
}
console.log(`\n${total} couleur(s) ${dry ? "à convertir" : "converties"}.`);
