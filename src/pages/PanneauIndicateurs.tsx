/**
 * PanneauIndicateurs.tsx
 * Remplace, dans le panneau de gauche, les cartes « occupation du sol / perte de couvert /
 * relief / feux » lorsque l'onglet Économie ou Social est actif.
 * La carte de Madagascar et les filtres région / district / commune ne changent pas.
 *
 * Affiche :
 *  1. les cartes OpenStreetMap (OsmIndicateurs) : marchés et routes pour Économie,
 *     santé et éducation pour Social ;
 *  2. les groupes d'indicateurs fournis par la route /api/indicateurs.
 *
 * Route serveur : POST /api/indicateurs
 *   corps    : { theme: "economie" | "social", niveau, region, district, commune, geometry }
 *   réponse  : { groupes: [{ titre, indicateurs: [{ libelle, valeur, unite?, annee?, source? }] }] }
 */
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TERR_TEXTS, type Lang } from "./territoireTexts";
import OsmIndicateurs from "../components/OsmIndicateurs";

export type ZoneSel = {
  niveau: "ADM1" | "ADM2" | "ADM3" | "parcelle" | null;
  nom: string;
  region: string | null;
  district: string | null;
  commune: string | null;
  geometry: unknown | null;
};

type Indicateur = {
  libelle: string;
  valeur: number | string | null;
  unite?: string;
  annee?: number | string;
  source?: string;
};
type Groupe = { titre: string; indicateurs: Indicateur[] };

const LOCALE: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", mg: "fr-FR" };
const CACHE = new Map<string, Groupe[]>();

export default function PanneauIndicateurs({
  theme,
  lang,
  zone,
}: {
  theme: "economie" | "social";
  lang: Lang;
  zone: ZoneSel;
}) {
  const tx = TERR_TEXTS[lang];
  const [etat, setEtat] = useState<{ groupes: Groupe[] | null; busy: boolean; err: string | null }>({
    groupes: null,
    busy: false,
    err: null,
  });
  const [essai, setEssai] = useState(0);

  const cle = `${theme}|${zone.niveau}|${zone.region}|${zone.district}|${zone.commune}`;
  const parcelle = zone.niveau === "parcelle";

  useEffect(() => {
    if (!zone.niveau || parcelle) {
      setEtat({ groupes: null, busy: false, err: null });
      return;
    }
    const hit = CACHE.get(cle);
    if (hit && essai === 0) {
      setEtat({ groupes: hit, busy: false, err: null });
      return;
    }

    const ctl = new AbortController();
    setEtat({ groupes: null, busy: true, err: null });
    fetch("/api/indicateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        niveau: zone.niveau,
        region: zone.region,
        district: zone.district,
        commune: zone.commune,
      }),
      signal: ctl.signal,
    })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.erreur || j?.error || `HTTP ${r.status}`);
        if (!Array.isArray(j?.groupes)) throw new Error("réponse invalide");
        CACHE.set(cle, j.groupes);
        setEtat({ groupes: j.groupes, busy: false, err: null });
      })
      .catch((e) => {
        if (ctl.signal.aborted) return;
        setEtat({ groupes: null, busy: false, err: e?.message || "erreur" });
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, essai]);

  const reessayer = useCallback(() => {
    CACHE.delete(cle);
    setEssai((n) => n + 1);
  }, [cle]);

  const fmt = (v: number | string | null) =>
    v == null
      ? "—"
      : typeof v === "number"
      ? v.toLocaleString(LOCALE[lang], { maximumFractionDigits: 2 })
      : v;

  if (!zone.niveau) return <p className="at-note">{tx.choisir}</p>;
  if (parcelle) return <p className="at-alert" role="alert">{tx.parcelleNonSupportee}</p>;

  // Cartes OpenStreetMap : elles ont leur propre état de chargement et d'erreur
  const osm = <OsmIndicateurs theme={theme} lang={lang} geometry={zone.geometry} />;

  let indicateurs: ReactNode;
  if (etat.busy) {
    indicateurs = <p className="at-load">{tx.chargement}</p>;
  } else if (etat.err) {
    indicateurs = (
      <p className="at-alert" role="alert">
        {tx.indispo.replace("{e}", etat.err)}{" "}
        <button type="button" className="at-link" onClick={reessayer}>
          {tx.reessayer}
        </button>
      </p>
    );
  } else if (!etat.groupes || !etat.groupes.length) {
    indicateurs = <p className="at-note">{tx.aucune}</p>;
  } else {
    indicateurs = (
      <div className="at-duo">
        {etat.groupes.map((g) => (
          <section key={g.titre} className="at-card at-c">
            <h3>{g.titre}</h3>
            <table className="at-tbl">
              <tbody>
                {g.indicateurs.map((i) => (
                  <tr
                    key={i.libelle}
                    title={
                      [i.source && `${tx.source} : ${i.source}`, i.annee && `${tx.annee} : ${i.annee}`]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  >
                    <td>{i.libelle}</td>
                    <td>
                      {fmt(i.valeur)}
                      {i.unite ? ` ${i.unite}` : ""}
                      {i.annee ? (
                        <small style={{ color: "var(--c-ink3)", marginLeft: 6 }}>{i.annee}</small>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {g.indicateurs.some((i) => i.source) && (
              <p className="at-note">
                {tx.source} :{" "}
                {Array.from(new Set(g.indicateurs.map((i) => i.source).filter(Boolean))).join(", ")}
              </p>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {osm}
      {indicateurs}
    </div>
  );
}
