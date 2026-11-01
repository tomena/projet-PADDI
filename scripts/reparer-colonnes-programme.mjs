#!/usr/bin/env node
/* =====================================================================
 * Réparation des colonnes « programme » du GeoJSON
 *
 * L'ancienne API d'import a écrasé, sur les lignes des UC importées :
 *   BT, DC, TD, BD 20xx (EUR / %)           (remplacés par des valeurs d'UC)
 * et, sur la ligne « Tous », a SOMMÉ ces colonnes (+ BD O0..O4) sur 6 UC
 * (d'où 4,29 M€ = 6 x 715 524,94 dans le graphique).
 *
 * Ces colonnes sont identiques sur toutes les lignes d'un même (Année, Mois) :
 * ce script recopie, pour chaque (Année, Mois), les valeurs d'une ligne SAINE
 * vers toutes les autres lignes (UC et « Tous »).
 *
 * Ligne saine = BT = 34 500 000, TD = DC / BT, et DC = somme des BD annuels.
 *
 * Usage :
 *   node reparer-colonnes-programme.mjs Base_Cout_Activite.geojson               (simulation)
 *   node reparer-colonnes-programme.mjs Base_Cout_Activite.geojson --ecrire      (écrit *.repare.geojson)
 *   node reparer-colonnes-programme.mjs Base_Cout_Activite.geojson --remplacer   (remplace le fichier)
 * ===================================================================== */
import { readFileSync, writeFileSync } from "node:fs";

const BUDGET_TOTAL = 34_500_000;
const ANNEES = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const COLONNES_PROGRAMME = [
  "DC", "BT", "TD",
  ...ANNEES.flatMap((a) => [`BD ${a} (EUR)`, `BD ${a} (%)`]),
  "BD O0 (EUR)", "BD O1 (EUR)", "BD O2 (EUR)", "BD O3 (EUR)", "BD O4 (EUR)",
  ...["1. S", "1.6 L", "1.7 S", "1.8 P", "1.9 R", "2.1 S", "2.2 S", "3.2 F", "3.4 G", "4 S"].flatMap((c) => [`${c} (EUR)`, `${c} (%)`]),
];

const num = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

function estSaine(p) {
  if (num(p.BT) !== BUDGET_TOTAL) return false;
  if (Math.abs(num(p.TD) - num(p.DC) / BUDGET_TOTAL) > 1e-6) return false;
  const sommeBD = ANNEES.reduce((s, a) => s + num(p[`BD ${a} (EUR)`]), 0);
  return Math.abs(sommeBD - num(p.DC)) < 1;
}
const signature = (p) => JSON.stringify(COLONNES_PROGRAMME.map((c) => p[c] ?? null));

const [, , chemin, ...options] = process.argv;
if (!chemin) {
  console.error("Usage : node reparer-colonnes-programme.mjs <fichier.geojson> [--ecrire | --remplacer]");
  process.exit(1);
}

const geojson = JSON.parse(readFileSync(chemin, "utf8"));
const groupes = new Map();
for (const f of geojson.features) {
  const p = f.properties ?? {};
  const cle = `${p["Année"]}|${p.Mois}`;
  if (!groupes.has(cle)) groupes.set(cle, []);
  groupes.get(cle).push(f);
}

let lignesModifiees = 0;
let colonnesModifiees = 0;
const sansReference = [];
const resume = [];

const cles = [...groupes.keys()].sort((a, b) => {
  const [ya, ma] = a.split("|"); const [yb, mb] = b.split("|");
  return Number(ya) - Number(yb) || MOIS.indexOf(ma) - MOIS.indexOf(mb);
});

for (const cle of cles) {
  const lignes = groupes.get(cle);
  const candidates = lignes.filter((f) => f.properties.UC !== "Tous" && estSaine(f.properties));
  if (candidates.length === 0) {
    // Rien à réparer si toutes les colonnes programme sont vides (mois sans données).
    const aDesDonnees = lignes.some((f) => COLONNES_PROGRAMME.some((c) => num(f.properties[c]) !== 0));
    if (aDesDonnees) sansReference.push(cle.replace("|", " "));
    continue;
  }

  // Signature la plus fréquente parmi les lignes saines.
  const compte = new Map();
  for (const f of candidates) compte.set(signature(f.properties), (compte.get(signature(f.properties)) || 0) + 1);
  const [sigRef] = [...compte.entries()].sort((a, b) => b[1] - a[1])[0];
  const reference = candidates.find((f) => signature(f.properties) === sigRef);

  let modifieesGroupe = 0;
  for (const f of lignes) {
    let change = false;
    for (const c of COLONNES_PROGRAMME) {
      if (!Object.prototype.hasOwnProperty.call(f.properties, c)) continue;
      const voulu = reference.properties[c] ?? null;
      if (f.properties[c] !== voulu) {
        f.properties[c] = voulu;
        colonnesModifiees++;
        change = true;
      }
    }
    if (change) { lignesModifiees++; modifieesGroupe++; }
  }
  if (modifieesGroupe) resume.push(`${cle.replace("|", " ")} : ${modifieesGroupe} ligne(s) corrigée(s) (référence : ${reference.properties.UC})`);
}

console.log(resume.length ? resume.join("\n") : "Aucune correction nécessaire.");
console.log(`\nTotal : ${lignesModifiees} ligne(s), ${colonnesModifiees} valeur(s) à corriger.`);
if (sansReference.length) {
  console.log(`\n⚠ Aucune ligne saine pour : ${sansReference.join(", ")}`);
  console.log("  Ces mois n'ont pas été touchés : à vérifier à la main (ou restaurer depuis l'historique GitHub).");
}

if (options.includes("--remplacer")) {
  writeFileSync(chemin, JSON.stringify(geojson, null, 2), "utf8");
  console.log(`\nFichier remplacé : ${chemin}`);
} else if (options.includes("--ecrire")) {
  const sortie = chemin.replace(/\.geojson$/i, "") + ".repare.geojson";
  writeFileSync(sortie, JSON.stringify(geojson, null, 2), "utf8");
  console.log(`\nFichier écrit : ${sortie}`);
} else {
  console.log("\n(Simulation : rien n'a été écrit.)");
}
