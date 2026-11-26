// src/pages/SanteFormations.tsx
// Affiche les hôpitaux publics et les centres de santé de base (CSB) de la zone choisie.
// Données : /data/formations-sante.json (généré par la GitHub Action).
// Les classes at-* viennent du style de AnalyseTerritoriale : le composant doit être rendu dans son panneau.
import { useEffect, useMemo, useState } from "react";

type Hop = { region: string; district: string; type: string; nom: string; bloc_operatoire: boolean };
type Csb = { region: string; district: string; commune: string; type: string; nom: string };
type Donnees = { hopitaux: Hop[]; csb: Csb[]; genere_le?: string };

// Compare sans casse, sans accents et sans ponctuation : « Ranotsara Nord » = « Ranotsara nord ».
const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const same = (a?: string | null, b?: string | null) => !!b && norm(a) === norm(b);

type Props = {
  region?: string | null;
  district?: string | null;
  commune?: string | null;
};

const trier = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "fr"));

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

  const zone = useMemo(() => {
    if (!data) return null;
    // Les hôpitaux n'ont pas de commune : ils n'apparaissent qu'aux niveaux région et district.
    const dansZone = (e: { region: string; district?: string; commune?: string }) =>
      (!region || same(e.region, region)) &&
      (!district || same(e.district, district)) &&
      (!commune || same(e.commune, commune));
    return { hop: data.hopitaux.filter(dansZone), csb: data.csb.filter(dansZone) };
  }, [data, region, district, commune]);

  if (erreur) {
    return (
      <section className="at-card at-c">
        <h3>Santé</h3>
        <p className="at-alert" role="alert">Données santé indisponibles.</p>
      </section>
    );
  }
  if (!zone) {
    return (
      <section className="at-card at-c">
        <h3>Santé</h3>
        <p className="at-load">Chargement des formations sanitaires…</p>
      </section>
    );
  }

  const { hop, csb } = zone;
  const niveau = commune ? "commune" : district ? "district" : region ? "region" : "national";
  const nb = (n: number) => n.toLocaleString("fr-FR");
  const csb1 = csb.filter((c) => c.type === "CSB1").length;
  const csb2 = csb.filter((c) => c.type === "CSB2").length;
  const bloc = hop.filter((h) => h.bloc_operatoire).length;
  const vide = hop.length === 0 && csb.length === 0;

  const districts = trier([...hop.map((h) => h.district), ...csb.map((c) => c.district)]);
  const communes = trier(csb.map((c) => c.commune));

  return (
    <section className="at-card at-c">
      <h3>Santé</h3>

      <div className="at-kpis" style={{ marginTop: 10 }}>
        <div className="at-kpi"><b>{nb(hop.length)}</b><span>Hôpitaux publics</span></div>
        <div className="at-kpi"><b>{nb(csb.length)}</b><span>Centres de santé (CSB)</span></div>
        <div className="at-kpi"><b>{nb(csb1)} / {nb(csb2)}</b><span>CSB1 / CSB2</span></div>
      </div>

      {vide && (
        <p className="at-note">
          Aucun établissement enregistré pour cette zone. Vérifiez l'orthographe du nom dans la page du wiki.
        </p>
      )}

      {/* Niveau région : un tableau par district */}
      {niveau === "region" && districts.length > 0 && (
        <table className="at-tbl">
          <thead>
            <tr><th scope="col">District</th><th scope="col">Hôpitaux</th><th scope="col">CSB</th></tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d}>
                <td>{d}</td>
                <td>{nb(hop.filter((h) => same(h.district, d)).length)}</td>
                <td>{nb(csb.filter((c) => same(c.district, d)).length)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Niveau district : les communes avec leurs CSB */}
      {niveau === "district" && communes.length > 0 && (
        <>
          <p className="at-note">Communes et centres de santé</p>
          <ul className="at-acts">
            {communes.map((co) => (
              <li key={co}>
                <strong>{co}</strong> : {csb.filter((c) => same(c.commune, co)).map((c) => c.nom).join(", ")}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Niveau commune : les CSB de la commune */}
      {niveau === "commune" && csb.length > 0 && (
        <>
          <p className="at-note">Centres de santé de la commune</p>
          <ul className="at-acts">
            {csb.map((c, i) => (
              <li key={i}>{c.type} {c.nom}</li>
            ))}
          </ul>
        </>
      )}

      {/* Hôpitaux : visibles au niveau région et district */}
      {niveau !== "commune" && hop.length > 0 && (
        <>
          <p className="at-note">
            Hôpitaux publics : {nb(bloc)} avec bloc opératoire
          </p>
          <ul className="at-acts">
            {hop.map((h, i) => (
              <li key={i}>
                {h.type} {h.nom} ({h.district}){h.bloc_operatoire ? " · bloc opératoire" : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="at-note">
        Source : OpenStreetMap Wiki, page « Formations Sanitaires / Suivi » (contenu communautaire, peut être incomplet).
        {data?.genere_le && ` Mise à jour : ${data.genere_le}.`}
      </p>
    </section>
  );
}
