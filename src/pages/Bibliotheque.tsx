import { useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Search, Download, FileText, Image as ImageIcon, FileSpreadsheet, BookOpen, Eye, X } from "lucide-react";

/* =====================================================================
   DOCUMENTS DE LA BIBLIOTHÈQUE
   Pour ajouter un document :
   1. déposer le fichier dans  public/bibliotheque/
   2. ajouter une ligne dans DOCS ci-dessous.
   ===================================================================== */

type Cat = "rapports" | "guides" | "cartes" | "donnees" | "textes";
type Format = "pdf" | "docx" | "xlsx" | "jpg" | "png";

type Doc = {
  id: string;
  cat: Cat;
  format: Format;
  titre: string;      // titre affiché
  description: string;
  date: string;       // AAAA-MM-JJ
  taille: string;     // ex. "2,4 Mo"
  fichier: string;    // chemin dans /public
  apercu?: string;    // image d'aperçu (pour les images)
};

// EXEMPLES : remplacez-les par vos vrais fichiers
const DOCS: Doc[] = [
  {
    id: "d1", cat: "rapports", format: "pdf",
    titre: "Rapport annuel du programme",
    description: "Résultats, indicateurs et leçons apprises de l'année écoulée.",
    date: "2026-01-15", taille: "4,2 Mo", fichier: "/bibliotheque/rapport-annuel.pdf",
  },
  {
    id: "d2", cat: "guides", format: "pdf",
    titre: "Guide de gestion communautaire des forêts",
    description: "Étapes pratiques pour les communautés : zonage, règles locales, suivi.",
    date: "2025-11-03", taille: "3,1 Mo", fichier: "/bibliotheque/guide-gestion-forestiere.pdf",
  },
  {
    id: "d3", cat: "cartes", format: "jpg",
    titre: "Carte des zones d'intervention",
    description: "Communes et sites d'intervention du programme.",
    date: "2026-02-20", taille: "1,8 Mo", fichier: "/bibliotheque/carte-intervention.jpg",
    apercu: "/bibliotheque/carte-intervention.jpg",
  },
  {
    id: "d4", cat: "donnees", format: "xlsx",
    titre: "Indicateurs de suivi (tableau)",
    description: "Données de suivi des superficies, bénéficiaires et revenus.",
    date: "2026-03-10", taille: "0,6 Mo", fichier: "/bibliotheque/indicateurs.xlsx",
  },
  {
    id: "d5", cat: "textes", format: "docx",
    titre: "Modèle de convention de transfert de gestion",
    description: "Document type pour les contrats entre communautés et services de l'État.",
    date: "2025-09-12", taille: "0,2 Mo", fichier: "/bibliotheque/modele-convention.docx",
  },
  {
    id: "d6", cat: "cartes", format: "png",
    titre: "Infographie : services écosystémiques",
    description: "Ce que les écosystèmes apportent aux communautés : eau, sols, bois, climat.",
    date: "2026-04-02", taille: "1,2 Mo", fichier: "/bibliotheque/infographie-services.png",
    apercu: "/bibliotheque/infographie-services.png",
  },
];

/* =====================================================================
   TEXTES
   ===================================================================== */

const TXT = {
  fr: {
    titre: "Bibliothèque",
    intro: "Documents et images en accès libre sur les communautés et les services écosystémiques. Téléchargez ce qui vous intéresse.",
    recherche: "Rechercher un document…",
    tous: "Tous",
    cats: { rapports: "Rapports et études", guides: "Guides techniques", cartes: "Cartes et images", donnees: "Données", textes: "Textes et modèles" },
    telecharger: "Télécharger", voir: "Voir l'image", fermer: "Fermer",
    resultats: (n: number) => `${n} document${n > 1 ? "s" : ""}`,
    vide: "Aucun document ne correspond à votre recherche. Essayez un autre mot ou choisissez « Tous ».",
  },
  en: {
    titre: "Library",
    intro: "Freely accessible documents and images on communities and ecosystem services. Download what interests you.",
    recherche: "Search a document…",
    tous: "All",
    cats: { rapports: "Reports and studies", guides: "Technical guides", cartes: "Maps and images", donnees: "Data", textes: "Texts and templates" },
    telecharger: "Download", voir: "View image", fermer: "Close",
    resultats: (n: number) => `${n} document${n > 1 ? "s" : ""}`,
    vide: "No document matches your search. Try another word or choose “All”.",
  },
  mg: {
    titre: "Tranomboky",
    intro: "Antontan-taratasy sy sary malalaka ho an'ny rehetra momba ny vondrom-piarahamonina sy ny tolotra avy amin'ny tontolo iainana. Alaivo izay mahaliana anao.",
    recherche: "Hikaroka antontan-taratasy…",
    tous: "Rehetra",
    cats: { rapports: "Tatitra sy fandalinana", guides: "Torolàlana teknika", cartes: "Sarintany sy sary", donnees: "Angona", textes: "Lahatsoratra sy modely" },
    telecharger: "Alaivo", voir: "Jereo ny sary", fermer: "Akatony",
    resultats: (n: number) => `${n} antontan-taratasy`,
    vide: "Tsy misy antontan-taratasy mifanaraka amin'ny fikarohanao. Andramo teny hafa na safidio ny « Rehetra ».",
  },
  de: {
    titre: "Bibliothek",
    intro: "Frei zugängliche Dokumente und Bilder zu Gemeinschaften und Ökosystemleistungen. Laden Sie herunter, was Sie interessiert.",
    recherche: "Dokument suchen…",
    tous: "Alle",
    cats: { rapports: "Berichte und Studien", guides: "Technische Leitfäden", cartes: "Karten und Bilder", donnees: "Daten", textes: "Texte und Vorlagen" },
    telecharger: "Herunterladen", voir: "Bild ansehen", fermer: "Schließen",
    resultats: (n: number) => `${n} Dokument${n > 1 ? "e" : ""}`,
    vide: "Kein Dokument entspricht Ihrer Suche. Versuchen Sie ein anderes Wort oder wählen Sie „Alle“.",
  },
};

const CATS: Cat[] = ["rapports", "guides", "cartes", "donnees", "textes"];

/* Couleur du dossier selon la catégorie (couleur de donnée : fixe dans les deux thèmes) */
const COULEUR_CAT: Record<Cat, string> = {
  rapports: "#2563eb",
  guides: "#16a34a",
  cartes: "#d97706",
  donnees: "#0d9488",
  textes: "#7c3aed",
};

function IconeFormat({ f, size = 20 }: { f: Format; size?: number }) {
  if (f === "jpg" || f === "png") return <ImageIcon size={size} />;
  if (f === "xlsx") return <FileSpreadsheet size={size} />;
  return <FileText size={size} />;
}

/* =====================================================================
   PAGE
   ===================================================================== */

export default function Bibliotheque() {
  const { lang } = useLanguage();
  const t = TXT[lang as keyof typeof TXT] ?? TXT.fr;

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat | "tous">("tous");
  const [image, setImage] = useState<Doc | null>(null);

  const liste = useMemo(() => {
    const mot = q.trim().toLowerCase();
    return DOCS.filter(
      (d) =>
        (cat === "tous" || d.cat === cat) &&
        (!mot || `${d.titre} ${d.description}`.toLowerCase().includes(mot))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [q, cat]);

  const dateLisible = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "mg" ? "fr" : lang, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="bib">
      <style>{CSS}</style>

      <header className="bib-tete">
        <div className="bib-titre">
          <BookOpen size={26} aria-hidden />
          <h1>{t.titre}</h1>
        </div>
        <p className="bib-intro">{t.intro}</p>
      </header>

      <div className="bib-outils">
        <label className="bib-recherche">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={q}
            placeholder={t.recherche}
            aria-label={t.recherche}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <div className="bib-filtres" role="group">
          {(["tous", ...CATS] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={`bib-chip ${cat === c ? "actif" : ""}`}
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
            >
              {c === "tous" ? t.tous : t.cats[c]}
            </button>
          ))}
        </div>
      </div>

      {/* .bib-zone = conteneur de la grille (le nombre de colonnes suit sa largeur réelle) */}
      <div className="bib-zone">
        <p className="bib-compte" aria-live="polite">{t.resultats(liste.length)}</p>

        {liste.length === 0 ? (
          <p className="bib-vide">{t.vide}</p>
        ) : (
          <ul className="bib-grille">
            {liste.map((d) => {
              const estImage = d.format === "jpg" || d.format === "png";
              return (
                <li key={d.id} className="bib-dossier" style={{ "--fc": COULEUR_CAT[d.cat] } as React.CSSProperties}>
                  {/* Onglet du classeur */}
                  <span className="bib-onglet">
                    <IconeFormat f={d.format} size={13} />
                    {d.format.toUpperCase()}
                  </span>
                  {/* Feuille qui dépasse derrière le dossier */}
                  <span className="bib-feuille" aria-hidden />

                  <div className="bib-dos">
                    {estImage && d.apercu ? (
                      <button type="button" className="bib-apercu" aria-label={`${t.voir} : ${d.titre}`} onClick={() => setImage(d)}>
                        <img src={d.apercu} alt="" loading="lazy" />
                        <span className="bib-oeil"><Eye size={16} /></span>
                      </button>
                    ) : (
                      <div className="bib-icone"><IconeFormat f={d.format} size={30} /></div>
                    )}

                    <div className="bib-corps">
                      <span className="bib-cat">{t.cats[d.cat]}</span>
                      <h2>{d.titre}</h2>
                      <p>{d.description}</p>
                      <div className="bib-meta">
                        {d.format.toUpperCase()} · {d.taille} · {dateLisible(d.date)}
                      </div>
                    </div>

                    <a className="bib-dl" href={d.fichier} download>
                      <Download size={16} aria-hidden /> {t.telecharger}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {image && (
        <div className="bib-modal" role="dialog" aria-modal="true" aria-label={image.titre} onClick={() => setImage(null)}>
          <div className="bib-modal-boite" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="bib-fermer" aria-label={t.fermer} onClick={() => setImage(null)}>
              <X size={18} />
            </button>
            <img src={image.apercu} alt={image.titre} />
            <div className="bib-modal-pied">
              <strong>{image.titre}</strong>
              <a className="bib-dl" href={image.fichier} download>
                <Download size={16} aria-hidden /> {t.telecharger}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   STYLES
   - pleine largeur (plus de max-width)
   - grille : 1 → 6 colonnes selon la largeur réelle disponible
   - cartes = dossiers (onglet + feuille qui dépasse)
   - couleurs d'interface = variables du thème (clair / sombre)
   ===================================================================== */

const CSS = `
.bib{--gt:color-mix(in srgb,#166534 55%,var(--text));
  padding:clamp(14px,2vw,28px);padding-top:clamp(60px,8vw,32px);width:100%;max-width:none;margin:0;
  min-height:100%;background:var(--surface-2);color:var(--text);
  font-family:inherit;box-sizing:border-box}
.bib *{box-sizing:border-box}
.bib-tete{margin-bottom:20px}
.bib-titre{display:flex;align-items:center;gap:10px;color:var(--gt)}
.bib-titre h1{margin:0;font-size:clamp(22px,3.5vw,30px);font-weight:800;color:var(--text)}
.bib-intro{margin:8px 0 0;max-width:70ch;font-size:14px;line-height:1.6;color:var(--text-2)}

.bib-outils{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}
.bib-recherche{display:flex;align-items:center;gap:8px;width:100%;max-width:420px;padding:0 12px;height:42px;
  border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text-3)}
.bib-recherche:focus-within{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.2)}
.bib-recherche input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:14px;color:var(--text)}

.bib-filtres{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
.bib-chip{flex:0 0 auto;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--border);
  background:var(--surface);font:inherit;font-size:13px;font-weight:600;color:var(--text-2);cursor:pointer;transition:background .15s}
.bib-chip:hover{background:var(--surface-3)}
.bib-chip.actif{background:#166534;border-color:#166534;color:#fff}
.bib-chip:focus-visible,.bib-dl:focus-visible,.bib-apercu:focus-visible,.bib-fermer:focus-visible{outline:2px solid #2563eb;outline-offset:2px}

.bib-compte{margin:0 0 12px;font-size:13px;color:var(--text-3)}
.bib-vide{padding:32px 0;color:var(--text-2);font-size:14px;max-width:50ch}

/* ---------- Grille : pleine largeur, 1 à 6 colonnes alignées ---------- */
.bib-zone{container-type:inline-size;container-name:bibz;width:100%}
.bib-grille{list-style:none;margin:0;padding:0;display:grid;gap:22px 16px;
  grid-template-columns:repeat(1,minmax(0,1fr));grid-auto-rows:1fr;align-items:stretch}
@container bibz (min-width:520px){.bib-grille{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container bibz (min-width:780px){.bib-grille{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container bibz (min-width:1040px){.bib-grille{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container bibz (min-width:1300px){.bib-grille{grid-template-columns:repeat(5,minmax(0,1fr))}}
@container bibz (min-width:1560px){.bib-grille{grid-template-columns:repeat(6,minmax(0,1fr))}}

/* ---------- Dossier (classeur) ---------- */
.bib-dossier{--fc:#16a34a;position:relative;display:flex;flex-direction:column;padding-top:30px;min-width:0}
/* onglet : coin supérieur droit biseauté */
.bib-onglet{position:absolute;top:0;left:0;z-index:2;height:32px;max-width:72%;display:inline-flex;align-items:center;gap:6px;
  padding:0 24px 2px 12px;background:var(--fc);color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;
  border-radius:10px 0 0 0;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 100%,0 100%)}
/* feuille qui dépasse derrière le dossier */
.bib-feuille{position:absolute;top:16px;left:12px;right:12px;height:18px;z-index:0;
  background:var(--surface-3);border:1px solid var(--border);border-bottom:0;border-radius:7px 7px 0 0}
.bib-dos{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;
  background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--fc);
  border-radius:0 12px 12px 12px;box-shadow:0 2px 6px rgba(0,0,0,.12);overflow:hidden;transition:transform .15s,box-shadow .15s}
.bib-dossier:hover .bib-dos{transform:translateY(-3px);box-shadow:0 8px 18px rgba(0,0,0,.2)}

.bib-icone{display:grid;place-items:center;height:92px;margin:12px 12px 0;border-radius:8px;
  background:color-mix(in srgb,var(--fc) 14%,var(--surface-3));color:color-mix(in srgb,var(--fc) 70%,var(--text))}
.bib-apercu{position:relative;display:block;width:calc(100% - 24px);height:130px;margin:12px 12px 0;padding:0;border:0;
  border-radius:8px;overflow:hidden;cursor:zoom-in;background:var(--surface-3)}
.bib-apercu img{width:100%;height:100%;object-fit:cover;display:block}
.bib-oeil{position:absolute;right:8px;bottom:8px;display:grid;place-items:center;width:30px;height:30px;border-radius:8px;
  background:rgba(255,255,255,.92);color:#111827}

.bib-corps{flex:1;padding:12px 14px 4px}
.bib-cat{font-size:12px;font-weight:700;color:color-mix(in srgb,var(--fc) 70%,var(--text))}
.bib-corps h2{margin:4px 0 6px;font-size:14.5px;line-height:1.35;font-weight:700;color:var(--text);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bib-corps p{margin:0;font-size:13px;line-height:1.55;color:var(--text-2);
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bib-meta{margin-top:10px;font-size:12px;color:var(--text-3)}

.bib-dl{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;margin:10px 14px 14px;
  padding:0 16px;border-radius:10px;background:#166534;color:#fff;font-size:13px;font-weight:600;text-decoration:none;
  transition:background .15s}
.bib-dl:hover{background:#14532d}

.bib-modal{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.75)}
.bib-modal-boite{position:relative;width:min(960px,100%);max-height:100%;display:flex;flex-direction:column;
  background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.bib-modal-boite img{display:block;width:100%;max-height:calc(100dvh - 160px);object-fit:contain;background:#111827}
.bib-modal-pied{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:8px 16px}
.bib-modal-pied .bib-dl{margin:0}
.bib-fermer{position:absolute;top:10px;right:10px;width:36px;height:36px;display:grid;place-items:center;border:0;
  border-radius:10px;background:rgba(255,255,255,.92);cursor:pointer;color:#111827}

@media (prefers-reduced-motion:reduce){.bib *{transition:none !important}.bib-dossier:hover .bib-dos{transform:none}}
`;
