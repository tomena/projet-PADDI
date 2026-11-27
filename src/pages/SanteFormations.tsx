// src/pages/SanteFormations.tsx — version 12
// Onglet Social.
// Santé : hôpitaux, CSB1 et CSB2 comptés dans formations-sante.json ; pharmacies dans la base de localisation.
// Éducation : universités, lycées, collèges et écoles primaires comptés dans la base éducation.
// Chaque type d'établissement scolaire est une carte au contour coloré ; sa liste s'écrit en petits
// caractères gris, sur plusieurs colonnes à l'intérieur de la même carte.
import { useEffect, useMemo, useState } from "react";
import { Stethoscope, MapPin, GraduationCap, School } from "lucide-react";
import { chargerLocalisation, pointsDansZone, correspond, type Point } from "../lib/localisation";
import { chargerEducation, ecolesDansZone, type Ecole } from "../lib/education";

type Hop = { region: string; district: string; type: string; nom: string; bloc_operatoire: boolean };
type Csb = { region: string; district: string; commune: string; type: string; nom: string };
type Donnees = { hopitaux: Hop[]; csb: Csb[]; genere_le?: string };

type Props = {
  region?: string | null;
  district?: string | null;
  commune?: string | null;
};

// Compare sans casse, sans accents et sans ponctuation : « Ranotsara Nord » = « Ranotsara nord ».
const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const same = (a?: string | null, b?: string | null) => !!b && norm(a) === norm(b);

// Garde les lignes dont le champ correspond : écriture exacte d'abord, sinon noms proches (Boeni ↔ Boeny).
function choisir<T extends Record<string, any>>(liste: T[], champ: keyof T, valeur?: string | null): T[] {
  if (!valeur) return liste;
  const exact = liste.filter((x) => same(x[champ], valeur));
  if (exact.length) return exact;
  return liste.filter((x) => correspond(x[champ], valeur));
}

const trier = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "fr"));
const nb = (n: number) => n.toLocaleString("fr-FR");

const COULEUR: Record<string, string> = {
  CHU: "#7c3aed",
  CHRR: "#2563eb",
  CHRD: "#0d9488",
  autre: "#64748b",
  CSB1: "#0ea5e9",
  CSB2: "#16a34a",
  CSBU: "#a855f7",
  CSAJ: "#94a3b8",
  CSB: "#94a3b8",
};

const COULEUR_EDU = {
  universite: "#4f46e5",
  lycee: "#f97316",
  college: "#eab308",
  primaire: "#ec4899",
  autre: "#94a3b8",
};

const COULEUR_PHARMA = "#16a34a";

const LIBELLE_NIVEAU: Record<string, string> = {
  national: "Madagascar",
  region: "Région",
  district: "District",
  commune: "Commune",
};

const TYPES_HOPITAL = ["CHU", "CHRR", "CHRD"];

// Ordre d'affichage des groupes d'établissements scolaires
const ORDRE_ECOLES = ["CEG", "Collège privé", "École primaire", "École primaire privée", "Autre établissement scolaire"];
const ORDRE_LYCEES = ["Lycée", "Lycée privé", "Université", "Université privée"];

const STYLE = `
.sf{display:flex;flex-direction:column;gap:12px;color:var(--text,#1c2822)}
.sf-hero{border-radius:14px;padding:16px 18px;color:#fff;background:linear-gradient(135deg,#0f766e 0%,#0284c7 100%);box-shadow:0 6px 18px rgba(2,132,199,.25);display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px}
.sf-hero-titre{min-width:0}
.sf-hero small{opacity:.85;font-size:12px;letter-spacing:.04em;text-transform:uppercase}
.sf-hero h3{margin:4px 0 2px;font-size:20px;line-height:1.2}
.sf-hero p{margin:0;font-size:13px;opacity:.92}
.sf-hero-totaux{display:flex;align-items:stretch;border-left:2px solid rgba(255,255,255,.5);padding-left:16px;gap:18px}
.sf-total span{display:block;font-size:11.5px;opacity:.9;text-transform:uppercase;letter-spacing:.03em}
.sf-total b{display:block;font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}
.sf-total b.sf-vide{opacity:.7;font-weight:500}
.sf-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
.sf-block{border:1px solid var(--border,#d8d4c8);border-radius:14px;padding:12px;background:var(--surface,#fff);min-width:0}
.sf-block-titre{display:flex;align-items:center;gap:6px;margin:0 0 10px;font-size:14px;font-weight:700}
.sf-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
.sf-kpi{background:var(--surface-2,#f7f6f2);border:1px solid var(--border,#d8d4c8);border-left:4px solid var(--c,#0ea5e9);border-radius:10px;padding:9px 10px;min-width:0}
.sf-kpi b{display:block;font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums}
.sf-kpi b.sf-vide{color:var(--text-3,#9aa39e);font-weight:500}
.sf-kpi span{display:block;font-size:11.5px;color:var(--text-3,#6b7770);line-height:1.3;margin-top:3px}
.sf-kpi small{display:block;font-size:10.5px;color:var(--text-3,#6b7770);margin-top:4px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sf-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text-2,#4a5850)}
.sf-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:3px}
.sf-duo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
.sf-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.sf-sec{border:1px solid var(--border,#d8d4c8);border-radius:12px;padding:12px;background:var(--surface,#fff);min-width:0}
.sf-sec h4{margin:0 0 8px;font-size:14px;display:flex;align-items:center;gap:6px}
.sf-scroll{max-height:260px;overflow-y:auto;padding-right:4px;overscroll-behavior:contain}
.sf-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px}
.sf-item{border:1px solid var(--border,#d8d4c8);border-radius:9px;padding:6px 8px;font-size:12.5px;line-height:1.3;background:var(--surface-2,#f7f6f2);min-width:0}
.sf-item b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sf-item small{color:var(--text-3,#6b7770);font-size:11px}
.sf-chip{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;margin-bottom:3px}
.sf-groupes{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px}
.sf-groupe{border:1.5px solid var(--c,#94a3b8);border-radius:10px;padding:8px 10px;background:var(--surface,#fff);min-width:0}
.sf-groupe-tete{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
.sf-groupe-tete span{font-size:12.5px;font-weight:700;color:var(--c,#94a3b8);filter:brightness(.8)}
.sf-groupe-tete b{background:var(--c,#94a3b8);color:#fff;border-radius:999px;padding:0 8px;font-size:11px;font-weight:700;line-height:1.6}
.sf-groupe-liste{max-height:220px;overflow-y:auto;overscroll-behavior:contain;columns:140px;column-gap:14px}
.sf-groupe-ligne{break-inside:avoid;padding:3px 0 4px;border-top:1px solid var(--border,#e4e1d8);font-size:11px;line-height:1.2;color:#7a837e}
.sf-groupe-ligne:first-child{border-top:0}
.sf-groupe-ligne b{display:block;font-weight:500;color:#6b7470;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sf-groupe-ligne small{display:block;font-size:10px;color:#9aa39e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sf-row{display:grid;grid-template-columns:minmax(80px,1fr) minmax(0,2fr) auto;gap:8px;align-items:center;margin:6px 0;font-size:13px}
.sf-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--surface-2,#eef0ec)}
.sf-bar i{display:block;height:100%}
.sf-muted{font-size:12px;color:var(--text-3,#6b7770);line-height:1.5}
.sf-empty{padding:14px;border-radius:12px;background:var(--surface-2,#f1efe8);font-size:13px;line-height:1.5}
.sf-note{font-size:11.5px;color:var(--text-3,#6b7770);line-height:1.5;border-top:1px dashed var(--border,#d8d4c8);padding-top:10px;margin:0}
@media (max-width:760px){.sf-pair,.sf-duo{grid-template-columns:1fr}.sf-hero-totaux{border-left:0;padding-left:0;border-top:1px solid rgba(255,255,255,.5);padding-top:12px;width:100%}}
@media (max-width:420px){.sf-grid{grid-template-columns:1fr}}
`;

function Pastille({ type }: { type: string }) {
  return (
    <span className="sf-chip" style={{ background: COULEUR[type] ?? COULEUR.autre }}>
      {type}
    </span>
  );
}

/**
 * Une carte par type d'établissement scolaire, contour de sa couleur.
 * La liste est sur plusieurs colonnes, en petits caractères gris : nom, puis fokontany ou commune.
 */
function CarteGroupe({ titre, items, couleur }: { titre: string; items: Ecole[]; couleur: string }) {
  return (
    <div className="sf-groupe" style={{ ["--c" as any]: couleur }}>
      <div className="sf-groupe-tete">
        <span>{titre}</span>
        <b>{nb(items.length)}</b>
      </div>
      <div className="sf-groupe-liste">
        {items.map((e, i) => (
          <div className="sf-groupe-ligne" key={`${e.nomComplet}-${i}`}>
            <b title={e.nomComplet}>{e.nomCourt}</b>
            <small title={e.fokontany || e.commune}>{e.fokontany || e.commune}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

type Carte = { valeur: number | null; libelle: string; couleur: string; note?: string };

function Cartes({ items }: { items: Carte[] }) {
  return (
    <div className="sf-grid">
      {items.map((c) => (
        <div className="sf-kpi" key={c.libelle} style={{ ["--c" as any]: c.couleur }}>
          {c.valeur === null ? <b className="sf-vide">—</b> : <b>{nb(c.valeur)}</b>}
          <span>{c.libelle}</span>
          {c.note && <small title={c.note}>{c.note}</small>}
        </div>
      ))}
    </div>
  );
}

export default function SanteFormations({ region, district, commune }: Props) {
  const [data, setData] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const [loc, setLoc] = useState<Point[] | null>(null);
  const [edu, setEdu] = useState<Ecole[] | null>(null);

  useEffect(() => {
    fetch("/data/formations-sante.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setData)
      .catch(() => setErreur(true));
  }, []);

  useEffect(() => {
    chargerLocalisation().then(setLoc).catch(() => setLoc([]));
  }, []);

  useEffect(() => {
    chargerEducation().then(setEdu).catch(() => setEdu([]));
  }, []);

  const niveau = commune ? "commune" : district ? "district" : region ? "region" : "national";

  // Hôpitaux et CSB : formations-sante.json, filtrés par région, district, commune (pour les CSB)
  const calc = useMemo(() => {
    if (!data) return null;
    const hop = choisir(choisir(data.hopitaux, "region", region), "district", district);
    const csb = choisir(
      choisir(choisir(data.csb, "region", region), "district", district),
      "commune",
      commune,
    );
    return { hop, csb };
  }, [data, region, district, commune]);

  // Communes où se trouvent les CHU, CHRR, CHRD du district (base de localisation)
  const communesHop = useMemo(() => {
    if (!loc) return [];
    const liste = pointsDansZone(loc, { region: region ?? null, district: district ?? null, commune: null })
      .filter((p) => TYPES_HOPITAL.includes(p.type));
    const vus = new Map<string, string>();
    liste.forEach((p) => {
      const cle = `${p.commune}|${p.type}`;
      if (p.commune && !vus.has(cle)) vus.set(cle, `${p.commune} (${p.type})`);
    });
    return [...vus.values()];
  }, [loc, region, district]);

  // Pharmacies de la zone choisie (base de localisation)
  const pharmacies = useMemo(() => {
    if (!loc) return null;
    return pointsDansZone(loc, { region: region ?? null, district: district ?? null, commune: commune ?? null })
      .filter((p) => p.categorie === "pharmacie").length;
  }, [loc, region, district, commune]);

  // Établissements scolaires de la zone choisie (base de localisation éducation)
  const ecolesZone = useMemo(() => {
    if (!edu) return null;
    return ecolesDansZone(edu, { region: region ?? null, district: district ?? null, commune: commune ?? null });
  }, [edu, region, district, commune]);

  // Regroupement par type : une carte par groupe
  const groupes = useMemo(() => {
    const m = new Map<string, Ecole[]>();
    (ecolesZone ?? []).forEach((e) => {
      const l = m.get(e.groupe) ?? [];
      l.push(e);
      m.set(e.groupe, l);
    });
    const tous = [...m.keys()];
    const ordre = [...ORDRE_ECOLES, ...ORDRE_LYCEES];
    const cles = [...ordre.filter((g) => m.has(g)), ...tous.filter((g) => !ordre.includes(g))];
    return cles.map((g) => ({
      nom: g,
      items: (m.get(g) ?? []).sort((a, b) => a.nomCourt.localeCompare(b.nomCourt, "fr")),
    }));
  }, [ecolesZone]);

  const groupesEcoles = groupes.filter((g) => !ORDRE_LYCEES.includes(g.nom));
  const groupesLycees = groupes.filter((g) => ORDRE_LYCEES.includes(g.nom));

  const nbEcole = (cat: Ecole["categorie"]) =>
    ecolesZone ? ecolesZone.filter((e) => e.categorie === cat).length : null;

  if (erreur) {
    return (
      <section className="sf">
        <style>{STYLE}</style>
        <div className="sf-empty" role="alert">Données santé indisponibles pour le moment.</div>
      </section>
    );
  }
  if (!calc) {
    return (
      <section className="sf">
        <style>{STYLE}</style>
        <div className="sf-empty">Chargement des établissements de santé…</div>
      </section>
    );
  }

  const { hop, csb } = calc;
  const csb1 = csb.filter((c) => c.type === "CSB1").length;
  const csb2 = csb.filter((c) => c.type === "CSB2").length;
  const totalSante = hop.length + csb.length;

  const typesPresents = TYPES_HOPITAL.filter((t) => hop.some((h) => h.type === t));
  const libelleHop = typesPresents.length ? `Hôpitaux ${typesPresents.join(", ")}` : "Hôpitaux";
  const hopCompte = hop.filter((h) => TYPES_HOPITAL.includes(h.type)).length;

  const parDistrict = trier(hop.map((h) => h.district).concat(csb.map((c) => c.district))).map((d) => ({
    nom: d,
    csb1: csb.filter((c) => same(c.district, d) && c.type === "CSB1").length,
    csb2: csb.filter((c) => same(c.district, d) && c.type === "CSB2").length,
    hop: hop.filter((h) => same(h.district, d)).length,
  }));
  const parCommune = trier(csb.map((c) => c.commune)).map((co) => ({
    nom: co,
    csbs: csb.filter((c) => same(c.commune, co)),
  }));
  const maxBarre = Math.max(1, ...parDistrict.map((d) => d.csb1 + d.csb2), ...parCommune.map((c) => c.csbs.length));

  const titreZone = commune ?? district ?? region ?? "Madagascar";
  const fil = [region, district, commune].filter(Boolean).join(" › ");

  const cartesSante: Carte[] = [
    {
      valeur: hopCompte,
      libelle: libelleHop,
      couleur: COULEUR.CHU,
      note: communesHop.length ? communesHop.join(" · ") : undefined,
    },
    { valeur: csb1, libelle: "Centres de santé CSB1", couleur: COULEUR.CSB1 },
    { valeur: csb2, libelle: "Centres de santé CSB2", couleur: COULEUR.CSB2 },
    { valeur: pharmacies, libelle: "Pharmacies", couleur: COULEUR_PHARMA },
  ];

  const cartesEducation: Carte[] = [
    { valeur: nbEcole("universite"), libelle: "Universités", couleur: COULEUR_EDU.universite },
    { valeur: nbEcole("lycee"), libelle: "Lycées", couleur: COULEUR_EDU.lycee },
    { valeur: nbEcole("college"), libelle: "Collèges", couleur: COULEUR_EDU.college },
    { valeur: nbEcole("primaire"), libelle: "Écoles primaires", couleur: COULEUR_EDU.primaire },
  ];

  const couleurGroupe = (items: Ecole[]) => COULEUR_EDU[items[0]?.categorie] ?? COULEUR_EDU.autre;

  return (
    <section className="sf" aria-label="Santé et éducation">
      <style>{STYLE}</style>

      <div className="sf-hero">
        <div className="sf-hero-titre">
          <small>{LIBELLE_NIVEAU[niveau]}</small>
          <h3>{titreZone}</h3>
          <p>{fil || "Ensemble du pays"}</p>
        </div>
        <div className="sf-hero-totaux">
          <div className="sf-total">
            <span>Santé</span>
            <b>{nb(totalSante)}</b>
          </div>
          <div className="sf-total">
            <span>Éducation</span>
            {ecolesZone ? <b>{nb(ecolesZone.length)}</b> : <b className="sf-vide">—</b>}
          </div>
        </div>
      </div>

      <div className="sf-pair">
        <div className="sf-block">
          <h4 className="sf-block-titre"><Stethoscope size={16} aria-hidden /> Santé</h4>
          <Cartes items={cartesSante} />
        </div>
        <div className="sf-block">
          <h4 className="sf-block-titre"><GraduationCap size={16} aria-hidden /> Éducation</h4>
          <Cartes items={cartesEducation} />
        </div>
      </div>

      <div className="sf-legend" aria-hidden>
        {["CHU", "CHRR", "CHRD", "CSB1", "CSB2"].map((t) => (
          <span key={t}><i className="sf-dot" style={{ background: COULEUR[t] }} />{t}</span>
        ))}
      </div>

      {totalSante === 0 && (
        <div className="sf-empty">
          Aucun établissement public de santé n'est enregistré pour cette zone. Si elle devrait en avoir, le nom de la
          commune ou du district peut ne pas correspondre à l'écriture du wiki.
        </div>
      )}

      <div className="sf-duo">
        <div className="sf-col">
          {niveau === "region" && parDistrict.length > 0 && (
            <div className="sf-sec">
              <h4><MapPin size={15} aria-hidden /> Établissements par district</h4>
              <div className="sf-scroll">
                {parDistrict.map((d) => (
                  <div className="sf-row" key={d.nom}>
                    <span>{d.nom}</span>
                    <div className="sf-bar" title={`${d.csb1} CSB1 · ${d.csb2} CSB2`}>
                      <i style={{ width: `${(d.csb1 / maxBarre) * 100}%`, background: COULEUR.CSB1 }} />
                      <i style={{ width: `${(d.csb2 / maxBarre) * 100}%`, background: COULEUR.CSB2 }} />
                    </div>
                    <span>{nb(d.hop + d.csb1 + d.csb2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {niveau === "district" && parCommune.length > 0 && (
            <div className="sf-sec">
              <h4><MapPin size={15} aria-hidden /> Centres de santé par commune</h4>
              <div className="sf-scroll">
                {parCommune.map((c) => {
                  const n1 = c.csbs.filter((x) => x.type === "CSB1").length;
                  const n2 = c.csbs.filter((x) => x.type === "CSB2").length;
                  return (
                    <div className="sf-row" key={c.nom}>
                      <span>{c.nom}</span>
                      <div className="sf-bar">
                        <i style={{ width: `${(n1 / maxBarre) * 100}%`, background: COULEUR.CSB1 }} />
                        <i style={{ width: `${(n2 / maxBarre) * 100}%`, background: COULEUR.CSB2 }} />
                      </div>
                      <span>{c.csbs.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {niveau === "commune" && (
            <div className="sf-sec">
              <h4><MapPin size={15} aria-hidden /> Centres de santé de la commune</h4>
              {csb.length > 0 ? (
                <div className="sf-scroll">
                  <div className="sf-cols">
                    {csb.map((c, i) => (
                      <div className="sf-item" key={i}>
                        <Pastille type={c.type} />
                        <b title={c.nom}>{c.nom}</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="sf-muted" style={{ margin: 0 }}>Aucun centre de santé enregistré dans cette commune.</p>
              )}
            </div>
          )}

          {hop.length > 0 && (
            <div className="sf-sec">
              <h4>
                <Stethoscope size={15} aria-hidden />
                {niveau === "commune" ? ` ${libelleHop} du district` : ` ${libelleHop}`}
              </h4>
              <div className="sf-scroll">
                <div className="sf-cols">
                  {hop.map((h, i) => (
                    <div className="sf-item" key={i}>
                      <Pastille type={h.type} />
                      <b title={h.nom}>{h.nom}</b>
                      <small>{h.district}{h.bloc_operatoire ? " · bloc" : ""}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sf-col">
          <div className="sf-sec">
            <h4>
              <School size={15} aria-hidden />
              {niveau === "commune" ? " Écoles de la commune" : " Écoles de la zone"}
            </h4>
            {groupesEcoles.length > 0 ? (
              <div className="sf-groupes">
                {groupesEcoles.map((g) => (
                  <CarteGroupe key={g.nom} titre={g.nom} items={g.items} couleur={couleurGroupe(g.items)} />
                ))}
              </div>
            ) : (
              <p className="sf-muted" style={{ margin: 0 }}>Aucune école primaire ni collège enregistré dans cette zone.</p>
            )}
          </div>

          <div className="sf-sec">
            <h4>
              <GraduationCap size={15} aria-hidden />
              {groupesLycees.some((g) => g.nom.startsWith("Université")) ? " Lycées et universités" : " Lycées"}
            </h4>
            {groupesLycees.length > 0 ? (
              <div className="sf-groupes">
                {groupesLycees.map((g) => (
                  <CarteGroupe key={g.nom} titre={g.nom} items={g.items} couleur={couleurGroupe(g.items)} />
                ))}
              </div>
            ) : (
              <p className="sf-muted" style={{ margin: 0 }}>Aucun lycée enregistré dans cette zone.</p>
            )}
          </div>
        </div>
      </div>

      <p className="sf-note">
        <strong>Méthode.</strong> Santé : hôpitaux, CSB1 et CSB2 comptés dans la page communautaire OpenStreetMap
        « Formations Sanitaires / Suivi ». Les hôpitaux sont comptés au niveau du district, car la liste ne donne
        pas leur commune. Pharmacies et établissements scolaires : comptés dans les bases de localisation. Les
        chiffres ne tiennent compte ni de la population ni de l'état de fonctionnement. Sources : OpenStreetMap Wiki
        (CC BY-SA), données OSM (ODbL).
        {data?.genere_le && ` Extraction santé du ${data.genere_le}.`}
      </p>
    </section>
  );
}
