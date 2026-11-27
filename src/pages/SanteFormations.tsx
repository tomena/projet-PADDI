// src/pages/SanteFormations.tsx — version 3
// Onglet Social : santé (hôpitaux publics, CSB1, CSB2) à gauche, éducation à droite.
// Données santé : /data/formations-sante.json. L'éducation n'a pas encore de source :
// la carte reste visible avec des tirets, sans zéro trompeur.
import { useEffect, useMemo, useState } from "react";
import { Stethoscope, Building2, MapPin, GraduationCap } from "lucide-react";

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

const LIBELLE_NIVEAU: Record<string, string> = {
  national: "Madagascar",
  region: "Région",
  district: "District",
  commune: "Commune",
};

const STYLE = `
.sf{display:flex;flex-direction:column;gap:12px;color:var(--text,#1c2822)}
.sf-hero{border-radius:14px;padding:16px 18px;color:#fff;background:linear-gradient(135deg,#0f766e 0%,#0284c7 100%);box-shadow:0 6px 18px rgba(2,132,199,.25)}
.sf-hero small{opacity:.85;font-size:12px;letter-spacing:.04em;text-transform:uppercase}
.sf-hero h3{margin:4px 0 2px;font-size:20px;line-height:1.2}
.sf-hero p{margin:0;font-size:13px;opacity:.92}
.sf-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.sf-kpi{background:var(--surface,#fff);border:1px solid var(--border,#d8d4c8);border-top:4px solid var(--c,#0ea5e9);border-radius:12px;padding:9px 10px;min-width:0}
.sf-kpi b{display:block;font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums}
.sf-kpi span{font-size:11.5px;color:var(--text-3,#6b7770);line-height:1.3;display:block;margin-top:2px}
.sf-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text-2,#4a5850)}
.sf-duo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
.sf-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.sf-sec{border:1px solid var(--border,#d8d4c8);border-radius:12px;padding:12px;background:var(--surface,#fff);min-width:0}
.sf-sec h4{margin:0 0 8px;font-size:14px;display:flex;align-items:center;gap:6px}
.sf-scroll{max-height:260px;overflow-y:auto;padding-right:4px;overscroll-behavior:contain}
.sf-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.sf-item{border:1px solid var(--border,#d8d4c8);border-radius:9px;padding:6px 8px;font-size:12.5px;line-height:1.3;background:var(--surface-2,#f7f6f2);min-width:0}
.sf-item b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sf-item small{color:var(--text-3,#6b7770);font-size:11px}
.sf-chip{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;margin-bottom:3px}
.sf-row{display:grid;grid-template-columns:minmax(80px,1fr) minmax(0,2fr) auto;gap:8px;align-items:center;margin:6px 0;font-size:13px}
.sf-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--surface-2,#eef0ec)}
.sf-bar i{display:block;height:100%}
.sf-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:3px}
.sf-muted{font-size:12px;color:var(--text-3,#6b7770);line-height:1.5}
.sf-empty{padding:14px;border-radius:12px;background:var(--surface-2,#f1efe8);font-size:13px;line-height:1.5}
.sf-edu-empty{padding:10px 12px;border-radius:10px;background:var(--surface-2,#f1efe8);font-size:12.5px;line-height:1.5;margin-bottom:10px}
.sf-edu-line{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--border,#d8d4c8);font-size:13px}
.sf-edu-line:first-of-type{border-top:0}
.sf-edu-line span:last-child{color:var(--text-3,#6b7770);font-variant-numeric:tabular-nums}
.sf-note{font-size:11.5px;color:var(--text-3,#6b7770);line-height:1.5;border-top:1px dashed var(--border,#d8d4c8);padding-top:10px;margin:0}
@media (max-width:760px){.sf-duo{grid-template-columns:1fr}}
@media (max-width:560px){.sf-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.sf-row{grid-template-columns:1fr auto}.sf-row .sf-bar{grid-column:1 / -1}}
`;

function Pastille({ type }: { type: string }) {
  return (
    <span className="sf-chip" style={{ background: COULEUR[type] ?? COULEUR.autre }}>
      {type}
    </span>
  );
}

function CarteEducation({ zone }: { zone: string }) {
  const lignes = [
    "Écoles primaires et maternelles",
    "Collèges",
    "Lycées",
    "Universités et formations supérieures",
  ];
  return (
    <section className="sf-sec" aria-label="Éducation">
      <h4><GraduationCap size={15} aria-hidden /> Éducation</h4>
      <p className="sf-muted" style={{ margin: "0 0 8px" }}>Zone : {zone}</p>
      <div className="sf-edu-empty">
        Données éducation non disponibles pour le moment. Cette rubrique accueillera écoles, collèges,
        lycées et établissements supérieurs dès qu'une source fiable sera identifiée.
      </div>
      {lignes.map((l) => (
        <div className="sf-edu-line" key={l}>
          <span>{l}</span>
          <span aria-label="non disponible">—</span>
        </div>
      ))}
      <p className="sf-note" style={{ marginTop: 10 }}>
        Aucune valeur n'est affichée tant que la source n'est pas vérifiée, pour éviter un zéro trompeur.
      </p>
    </section>
  );
}

export default function SanteFormations({ region, district, commune }: Props) {
  const [data, setData] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    fetch("/data/formations-sante.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setData)
      .catch(() => setErreur(true));
  }, []);

  const niveau = commune ? "commune" : district ? "district" : region ? "region" : "national";

  const calc = useMemo(() => {
    if (!data) return null;
    const dansRegionDistrict = (e: { region: string; district: string }) =>
      (!region || same(e.region, region)) && (!district || same(e.district, district));
    const hop = data.hopitaux.filter(dansRegionDistrict);
    const csb = data.csb.filter(
      (c) => dansRegionDistrict(c) && (!commune || same(c.commune, commune)),
    );
    return { hop, csb };
  }, [data, region, district, commune]);

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
  const total = hop.length + csb.length;

  const parDistrict = trier(hop.map((h) => h.district).concat(csb.map((c) => c.district))).map((d) => ({
    nom: d,
    hop: hop.filter((h) => same(h.district, d)).length,
    csb1: csb.filter((c) => same(c.district, d) && c.type === "CSB1").length,
    csb2: csb.filter((c) => same(c.district, d) && c.type === "CSB2").length,
  }));
  const parCommune = trier(csb.map((c) => c.commune)).map((co) => ({
    nom: co,
    csbs: csb.filter((c) => same(c.commune, co)),
  }));
  const maxBarre = Math.max(1, ...parDistrict.map((d) => d.csb1 + d.csb2), ...parCommune.map((c) => c.csbs.length));

  const titreZone = commune ?? district ?? region ?? "Madagascar";
  const fil = [region, district, commune].filter(Boolean).join(" › ");

  return (
    <section className="sf" aria-label="Santé et éducation">
      <style>{STYLE}</style>

      {/* Bandeau unique */}
      <div className="sf-hero">
        <small>{LIBELLE_NIVEAU[niveau]}</small>
        <h3>{titreZone}</h3>
        <p>{fil || "Ensemble du pays"}</p>
      </div>

      {/* Indicateurs sur une seule ligne */}
      <div className="sf-kpis">
        <div className="sf-kpi" style={{ ["--c" as any]: COULEUR.CHU }}>
          <b>{nb(hop.length)}</b>
          <span>Hôpitaux publics</span>
        </div>
        <div className="sf-kpi" style={{ ["--c" as any]: COULEUR.CSB1 }}>
          <b>{nb(csb1)}</b>
          <span>CSB1</span>
        </div>
        <div className="sf-kpi" style={{ ["--c" as any]: COULEUR.CSB2 }}>
          <b>{nb(csb2)}</b>
          <span>CSB2</span>
        </div>
        <div className="sf-kpi" style={{ ["--c" as any]: "#f59e0b" }}>
          <b>{nb(total)}</b>
          <span>Total public</span>
        </div>
      </div>

      <div className="sf-legend" aria-hidden>
        {["CHU", "CHRR", "CHRD", "CSB1", "CSB2"].map((t) => (
          <span key={t}><i className="sf-dot" style={{ background: COULEUR[t] }} />{t}</span>
        ))}
      </div>

      {total === 0 && (
        <div className="sf-empty">
          Aucun établissement public n'est enregistré pour cette zone. Si elle devrait en avoir, le nom de la commune
          ou du district peut ne pas correspondre à l'écriture du wiki.
        </div>
      )}

      {/* Santé à gauche, Éducation à droite */}
      <div className="sf-duo">
        <div className="sf-col">
          {niveau === "region" && parDistrict.length > 0 && (
            <div className="sf-sec">
              <h4><Building2 size={15} aria-hidden /> Établissements par district</h4>
              <div className="sf-scroll">
                {parDistrict.map((d) => (
                  <div className="sf-row" key={d.nom}>
                    <span>{d.nom}</span>
                    <div className="sf-bar" title={`${d.csb1} CSB1 · ${d.csb2} CSB2 · ${d.hop} hôpitaux`}>
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

          {niveau === "commune" && csb.length > 0 && (
            <div className="sf-sec">
              <h4><MapPin size={15} aria-hidden /> Centres de santé de la commune</h4>
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
            </div>
          )}

          {hop.length > 0 && (
            <div className="sf-sec">
              <h4>
                <Stethoscope size={15} aria-hidden />
                {niveau === "commune" ? " Hôpitaux de référence du district" : " Hôpitaux publics"}
              </h4>
              <p className="sf-muted" style={{ margin: "0 0 8px" }}>
                {nb(hop.filter((h) => h.bloc_operatoire).length)} sur {nb(hop.length)} disposent d'un bloc opératoire.
              </p>
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
          <CarteEducation zone={titreZone} />
        </div>
      </div>

      <p className="sf-note">
        <strong>Méthode.</strong> Comptage des établissements publics listés dans la page communautaire
        OpenStreetMap « Formations Sanitaires / Suivi ». Les CSB1 et CSB2 sont des centres de santé publics de
        premier niveau. Les chiffres ne tiennent compte ni de la population ni de l'état de fonctionnement :
        ils montrent la présence d'établissements, pas leur capacité. Source : OpenStreetMap Wiki (CC BY-SA),
        données OSM (ODbL).
        {data?.genere_le && ` Extraction du ${data.genere_le}.`}
      </p>
    </section>
  );
}
