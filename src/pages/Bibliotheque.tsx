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

function IconeFormat({ f }: { f: Format }) {
  if (f === "jpg" || f === "png") return <ImageIcon size={20} />;
  if (f === "xlsx") return <FileSpreadsheet size={20} />;
  return <FileText size={20} />;
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

      <p className="bib-compte" aria-live="polite">{t.resultats(liste.length)}</p>

      {liste.length === 0 ? (
        <p className="bib-vide">{t.vide}</p>
      ) : (
        <ul className="bib-grille">
          {liste.map((d) => {
            const estImage = d.format === "jpg" || d.format === "png";
            return (
              <li key={d.id} className="bib-carte">
                {estImage && d.apercu ? (
                  <button type="button" className="bib-apercu" aria-label={`${t.voir} : ${d.titre}`} onClick={() => setImage(d)}>
                    <img src={d.apercu} alt="" loading="lazy" />
                    <span className="bib-oeil"><Eye size={16} /></span>
                  </button>
                ) : (
                  <div className={`bib-icone f-${d.format}`}><IconeFormat f={d.format} /><b>{d.format.toUpperCase()}</b></div>
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
              </li>
            );
          })}
        </ul>
      )}

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
   STYLES (responsive : 1 colonne téléphone, 2 tablette, 3+ ordinateur)
   ===================================================================== */

const CSS = `
.bib{padding:clamp(14px,3vw,32px);padding-top:clamp(60px,8vw,32px);max-width:1280px;margin:0 auto;color:#111827;
  font-family:inherit;width:100%;box-sizing:border-box}
.bib *{box-sizing:border-box}
.bib-tete{margin-bottom:20px}
.bib-titre{display:flex;align-items:center;gap:10px;color:#166534}
.bib-titre h1{margin:0;font-size:clamp(22px,3.5vw,30px);font-weight:800;color:#111827}
.bib-intro{margin:8px 0 0;max-width:62ch;font-size:14px;line-height:1.6;color:#4b5563}

.bib-outils{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}
.bib-recherche{display:flex;align-items:center;gap:8px;width:100%;max-width:420px;padding:0 12px;height:42px;
  border:1px solid rgba(0,0,0,.14);border-radius:10px;background:#fff;color:#6b7280}
.bib-recherche:focus-within{border-color:#166534;box-shadow:0 0 0 3px rgba(22,101,52,.15)}
.bib-recherche input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:14px;color:#111827}

.bib-filtres{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
.bib-chip{flex:0 0 auto;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(0,0,0,.14);
  background:#fff;font:inherit;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:background .15s}
.bib-chip:hover{background:#f3f4f6}
.bib-chip.actif{background:#166534;border-color:#166534;color:#fff}
.bib-chip:focus-visible,.bib-dl:focus-visible,.bib-apercu:focus-visible,.bib-fermer:focus-visible{outline:2px solid #2563eb;outline-offset:2px}

.bib-compte{margin:0 0 12px;font-size:13px;color:#6b7280}
.bib-vide{padding:32px 0;color:#4b5563;font-size:14px;max-width:50ch}

.bib-grille{list-style:none;margin:0;padding:0;display:grid;gap:16px;grid-template-columns:1fr}
@media (min-width:640px){.bib-grille{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1100px){.bib-grille{grid-template-columns:repeat(3,1fr)}}
@media (min-width:1600px){.bib-grille{grid-template-columns:repeat(4,1fr)}}

.bib-carte{display:flex;flex-direction:column;background:#fff;border:1px solid rgba(0,0,0,.09);border-radius:14px;overflow:hidden}
.bib-icone{display:flex;align-items:center;gap:8px;height:84px;padding:0 16px;background:#f0fdf4;color:#166534}
.bib-icone b{font-size:12px;letter-spacing:.5px}
.bib-icone.f-xlsx{background:#ecfdf5}
.bib-icone.f-docx{background:#eff6ff;color:#1d4ed8}
.bib-icone.f-pdf{background:#fef2f2;color:#b91c1c}
.bib-apercu{position:relative;display:block;width:100%;height:150px;padding:0;border:0;cursor:zoom-in;background:#e5e7eb}
.bib-apercu img{width:100%;height:100%;object-fit:cover;display:block}
.bib-oeil{position:absolute;right:8px;bottom:8px;display:grid;place-items:center;width:30px;height:30px;border-radius:8px;
  background:rgba(255,255,255,.92);color:#111827}

.bib-corps{flex:1;padding:14px 16px 6px}
.bib-cat{font-size:12px;font-weight:600;color:#166534}
.bib-corps h2{margin:4px 0 6px;font-size:15px;line-height:1.35;font-weight:700}
.bib-corps p{margin:0;font-size:13px;line-height:1.55;color:#4b5563}
.bib-meta{margin-top:10px;font-size:12px;color:#6b7280}

.bib-dl{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin:10px 16px 16px;
  padding:0 16px;border-radius:10px;background:#166534;color:#fff;font-size:13px;font-weight:600;text-decoration:none;
  transition:background .15s}
.bib-dl:hover{background:#14532d}

.bib-modal{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.7)}
.bib-modal-boite{position:relative;width:min(960px,100%);max-height:100%;display:flex;flex-direction:column;
  background:#fff;border-radius:14px;overflow:hidden}
.bib-modal-boite img{display:block;width:100%;max-height:calc(100dvh - 160px);object-fit:contain;background:#111827}
.bib-modal-pied{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:8px 16px}
.bib-modal-pied .bib-dl{margin:0}
.bib-fermer{position:absolute;top:10px;right:10px;width:36px;height:36px;display:grid;place-items:center;border:0;
  border-radius:10px;background:rgba(255,255,255,.92);cursor:pointer;color:#111827}

@media (prefers-reduced-motion:reduce){.bib *{transition:none !important}}
`;
