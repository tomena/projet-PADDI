// src/pages/SanteFormations.tsx — version 2
// Établissements publics de santé de la zone choisie : hôpitaux (CHU, CHRR, CHRD)
// et centres de santé de base (CSB1, CSB2), à partir de public/data/formations-sante.json.
// Les hôpitaux n'ont pas de commune dans la source : au niveau commune, on affiche
// les hôpitaux de référence du district.
import { useEffect, useMemo, useState } from "react";
import { Stethoscope, Building2, MapPin } from "lucide-react";

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

// Couleurs par type d'établissement (lisibles en clair comme en sombre)
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
.sf-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.sf-kpi{background:var(--surface,#fff);border:1px solid var(--border,#d8d4c8);border-top:4px solid var(--c,#0ea5e9);border-radius:12px;padding:10px 12px}
.sf-kpi b{display:block;font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums}
.sf-kpi span{font-size:12px;color:var(--text-3,#6b7770);line-height:1.35}
.sf-sec{border:1px solid var(--border,#d8d4c8);border-radius:12px;padding:12px;background:var(--surface,#fff)}
.sf-sec h4{margin:0 0 8px;font-size:14px;display:flex;align-items:center;gap:6px}
.sf-row{display:grid;grid-template-columns:minmax(90px,1.1fr) minmax(0,2fr) auto;gap:8px;align-items:center;margin:6px 0;font-size:13px}
.sf-bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--surface-2,#eef0ec)}
.sf-bar i{display:block;height:100%}
.sf-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:12px;color:#fff;margin:3px 4px 3px 0}
.sf-dot{width:9px;height:9px;border-radius:50%;display:inline-block}
.sf-list{margin:0;padding:0;list-style:none}
.sf-list li{padding:7px 0;border-top:1px solid var(--border,#d8d4c8);font-size:13px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.sf-list li:first-child{border-top:0}
.sf-muted{font-size:12px;color:var(--text-3,#6b7770);line-height:1.5}
.sf-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text-2,#4a5850)}
.sf-empty{padding:14px;border-radius:12px;background:var(--surface-2,#f1efe8);font-size:13px;line-height:1.5}
.sf-note{font-size:11.5px;color:var(--text-3,#6b7770);line-height:1.5;border-top:1px dashed var(--border,#d8d4c8);padding-top:10px}
@media (max-width:640px){.sf-kpis{grid-template-columns:1fr}.sf-row{grid-template-columns:1fr auto}.sf-row .sf-bar{grid-column:1 / -1}}
`;

function Pastille({ type }: { type: string }) {
  return (
    <span className="sf-chip" style={{ background: COULEUR[type] ?? COULEUR.autre }}>
      {type}
    </span>
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
  const autresCsb = csb.length - csb1 - csb2;
  const blocs = hop.filter((h) => h.bloc_operatoire).length;
  const total = hop.length + csb.length;

  // Regroupements pour les graphiques
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
    <section className="sf" aria-label="Établissements de santé publics">
      <style>{STYLE}</style>

      {/* En-tête */}
      <div className="sf-hero">
        <small>{LIBELLE_NIVEAU[niveau]}</small>
        <h3>{titreZone}</h3>
        <p>{fil || "Ensemble du pays"}</p>
      </div>

      {/* Indicateurs */}
      <div className="sf-kpis">
        <div className="sf-kpi" style={{ ["--c" as any]: COULEUR.CHU }}>
          <b>{nb(hop.length)}</b>
          <span>
            Hôpitaux publics (CHU, CHRR, CHRD)
            {niveau === "commune" && " · hôpitaux de référence du district"}
          </span>
        </div>
        <div className="sf-kpi" style={{ ["--c" as any]: COULEUR.CSB1 }}>
          <b>{nb(csb1)}</b>
          <span>Centres de santé CSB1</span>
        </div>
        <div className="sf-kpi" style={{ ["--c" as any]: COULEUR.CSB2 }}>
          <b>{nb(csb2)}</b>
          <span>Centres de santé CSB2</span>
        </div>
        <div className="sf-kpi" style={{ ["--c" as any]: "#f59e0b" }}>
          <b>{nb(total)}</b>
          <span>
            Total établissements publics
            {autresCsb > 0 && ` · dont ${nb(autresCsb)} autres CSB`}
          </span>
        </div>
      </div>

      <div className="sf-legend" aria-hidden>
        {["CHU", "CHRR", "CHRD", "CSB1", "CSB2"].map((t) => (
          <span key={t}><i className="sf-dot" style={{ background: COULEUR[t] }} /> {t}</span>
        ))}
      </div>

      {total === 0 && (
        <div className="sf-empty">
          Aucun établissement public n'est enregistré pour cette zone dans la source.
          Si la zone devrait en avoir, le nom de la commune ou du district peut ne pas correspondre à l'écriture du wiki.
        </div>
      )}

      {/* Région : un graphique par district */}
      {niveau === "region" && parDistrict.length > 0 && (
        <div className="sf-sec">
          <h4><Building2 size={15} aria-hidden /> Établissements par district</h4>
          {parDistrict.map((d) => {
            const tot = d.hop + d.csb1 + d.csb2;
            return (
              <div className="sf-row" key={d.nom}>
                <span>{d.nom}</span>
                <div className="sf-bar" title={`${d.csb1} CSB1 · ${d.csb2} CSB2 · ${d.hop} hôpitaux`} style={{ width: "100%" }}>
                  <i style={{ width: `${(d.csb1 / maxBarre) * 100}%`, background: COULEUR.CSB1 }} />
                  <i style={{ width: `${(d.csb2 / maxBarre) * 100}%`, background: COULEUR.CSB2 }} />
                </div>
                <span>{nb(tot)}{d.hop > 0 && <small> · {d.hop} hôp.</small>}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* District : les communes avec leurs CSB */}
      {niveau === "district" && parCommune.length > 0 && (
        <div className="sf-sec">
          <h4><MapPin size={15} aria-hidden /> Centres de santé par commune</h4>
          {parCommune.map((c) => {
            const n1 = c.csbs.filter((x) => x.type === "CSB1").length;
            const n2 = c.csbs.filter((x) => x.type === "CSB2").length;
            return (
              <div className="sf-row" key={c.nom}>
                <span>{c.nom}</span>
                <div className="sf-bar" style={{ width: "100%" }}>
                  <i style={{ width: `${(n1 / maxBarre) * 100}%`, background: COULEUR.CSB1 }} />
                  <i style={{ width: `${(n2 / maxBarre) * 100}%`, background: COULEUR.CSB2 }} />
                </div>
                <span>{c.csbs.length}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Commune : liste des CSB */}
      {niveau === "commune" && csb.length > 0 && (
        <div className="sf-sec">
          <h4><MapPin size={15} aria-hidden /> Centres de santé de la commune</h4>
          <ul className="sf-list">
            {csb.map((c, i) => (
              <li key={i}>
                <span><Pastille type={c.type} /> {c.nom}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hôpitaux : tous niveaux ; au niveau commune, ceux du district */}
      {hop.length > 0 && (
        <div className="sf-sec">
          <h4>
            <Stethoscope size={15} aria-hidden />
            {niveau === "commune" ? " Hôpitaux de référence du district" : " Hôpitaux publics"}
          </h4>
          <p className="sf-muted" style={{ margin: "0 0 6px" }}>
            {nb(blocs)} sur {nb(hop.length)} disposent d'un bloc opératoire.
          </p>
          <ul className="sf-list">
            {hop.map((h, i) => (
              <li key={i}>
                <span><Pastille type={h.type} /> {h.nom} <span className="sf-muted">· {h.district}</span></span>
                {h.bloc_operatoire && <span className="sf-muted">bloc opératoire</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

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
