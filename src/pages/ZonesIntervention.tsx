/**
 * ZonesIntervention.tsx — localisation des zones d'intervention des projets
 *
 * Disposition : à gauche, les informations du territoire recherché ;
 *               à droite, la carte interactive de Madagascar.
 * Recherche : projet, région, district ou commune (insensible aux accents, tirets et casse).
 * Dépendances : leaflet, @types/leaflet, lucide-react.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, Trees, Sprout, Leaf, MapPin } from "lucide-react";

/* ===================== DONNÉES DES PROJETS ===================== */

type TypeActivite = "restauration" | "reboisement" | "autre";
type Activite = { type: TypeActivite; titre: string; annee?: number; surface_ha?: number };
type Commune = { nom: string; activites: Activite[] };
type District = { nom: string; communes: Commune[] };
type Region = { nom: string; districts: District[] };
type Projet = { id: string; nom: string; alias: string[]; regions: Region[] };

/*
 * Pour ajouter une activité, remplir le tableau `activites` d'une commune, par exemple :
 * { type: "reboisement", titre: "Plantation de filao", annee: 2025, surface_ha: 120 }
 * type : "restauration" | "reboisement" | "autre"
 *
 * Les districts ou communes sans données restent à [] : l'affichage le signale.
 */
const PROJETS: Projet[] = [
  {
    id: "paddi",
    nom: "PADDI+",
    alias: ["paddi", "paddi+", "paddi plus"],
    regions: [
      {
        nom: "Boeny",
        districts: [
          {
            nom: "Ambato Boeni",
            communes: [
              { nom: "Ankijabe", activites: [] },
              { nom: "Andranofasika", activites: [] },
              { nom: "Ambondromamy", activites: [] },
              { nom: "Tsaramandroso", activites: [] },
            ],
          },
          {
            nom: "Marovoay",
            communes: [
              { nom: "Ankazomborona", activites: [] },
              { nom: "Marosakoa", activites: [] },
              { nom: "Anosinalainolona", activites: [] },
            ],
          },
        ],
      },
      {
        nom: "Diana",
        districts: [
          { nom: "Antsiranana II", communes: [] },
          { nom: "Ambilobe", communes: [] },
        ],
      },
      { nom: "Vakinakaratra", districts: [] },
      { nom: "Amoron'i Mania", districts: [] },
      { nom: "Atsimo Atsinanana", districts: [] },
      { nom: "Anosy", districts: [] },
    ],
  },
];

type Ligne = { projet: Projet; region: Region; district?: District; commune?: Commune };
type LigneCommune = Ligne & { district: District; commune: Commune };

/** Une ligne par combinaison projet / région / district / commune. */
const LIGNES: Ligne[] = PROJETS.flatMap((projet) =>
  projet.regions.flatMap((region) => {
    if (!region.districts.length) return [{ projet, region }];
    return region.districts.flatMap((district) =>
      district.communes.length
        ? district.communes.map((commune) => ({ projet, region, district, commune }))
        : [{ projet, region, district }]
    );
  })
);

/* ===================== OUTILS ===================== */

/** Clé de comparaison : sans accents, sans tirets ni espaces, en minuscules. */
const cle = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

type Niveau = "projet" | "region" | "district" | "commune";

/** Entrée de la barre de recherche. */
type Sel = {
  niveau: Niveau;
  label: string;
  cle: string;
  contexte: string;
  recherche: string;
  projetId?: string;
  regionCle?: string;
  districtCle?: string;
};

const NIVEAU_LABEL: Record<Niveau, string> = {
  projet: "Projet",
  region: "Région",
  district: "District",
  commune: "Commune",
};
const RANG: Record<Niveau, number> = { projet: 0, region: 1, district: 2, commune: 3 };

const TYPES: Record<TypeActivite, { label: string; couleur: string; icone: typeof Leaf }> = {
  restauration: { label: "Restauration", couleur: "#65a30d", icone: Sprout },
  reboisement: { label: "Reboisement", couleur: "#15803d", icone: Trees },
  autre: { label: "Autres projets environnementaux", couleur: "#0891b2", icone: Leaf },
};

/** Toutes les entrées cherchables, construites à partir de PROJETS. */
const SUGGESTIONS: Sel[] = (() => {
  const vues = new Map<string, Sel>();
  const ajouter = (s: Sel) => {
    const k = [s.niveau, s.regionCle, s.districtCle, s.cle].join("|");
    if (!vues.has(k)) vues.set(k, s);
  };
  PROJETS.forEach((p) =>
    ajouter({
      niveau: "projet",
      label: p.nom,
      cle: cle(p.id),
      contexte: "Projet d'intervention",
      recherche: [p.nom, ...p.alias].map(cle).join(" "),
      projetId: p.id,
    })
  );
  LIGNES.forEach(({ region, district, commune }) => {
    const rk = cle(region.nom);
    ajouter({ niveau: "region", label: region.nom, cle: rk, regionCle: rk, contexte: "Région", recherche: rk });
    if (district) {
      const dk = cle(district.nom);
      ajouter({
        niveau: "district",
        label: district.nom,
        cle: dk,
        regionCle: rk,
        contexte: `Région ${region.nom}`,
        recherche: dk,
      });
      if (commune) {
        const ck = cle(commune.nom);
        ajouter({
          niveau: "commune",
          label: commune.nom,
          cle: ck,
          regionCle: rk,
          districtCle: dk,
          contexte: `${region.nom} · ${district.nom}`,
          recherche: ck,
        });
      }
    }
  });
  return [...vues.values()];
})();

/** Retrouve une entrée de recherche à partir d'un clic sur la carte ou dans la liste. */
function trouver(niveau: Niveau, k: string, regionK?: string, districtK?: string) {
  return SUGGESTIONS.find(
    (s) =>
      s.niveau === niveau &&
      s.cle === k &&
      (regionK === undefined || s.regionCle === regionK) &&
      (districtK === undefined || s.districtCle === districtK)
  );
}

/** Une ligne correspond-elle à la sélection ? */
function correspond(l: Ligne, s: Sel): boolean {
  const rk = cle(l.region.nom);
  switch (s.niveau) {
    case "projet":
      return l.projet.id === s.projetId;
    case "region":
      return rk === s.cle;
    case "district":
      return rk === s.regionCle && !!l.district && cle(l.district.nom) === s.cle;
    case "commune":
      return (
        rk === s.regionCle &&
        !!l.district &&
        cle(l.district.nom) === s.districtCle &&
        !!l.commune &&
        cle(l.commune.nom) === s.cle
      );
  }
}

/* ===================== GÉOMÉTRIE ET LIMITES ADMINISTRATIVES ===================== */

type Feat = { properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type Niv = "ADM1" | "ADM2" | "ADM3";

const REV = "9469f09";
const GH = "wmgeolab/geoBoundaries";
const MADA: L.LatLngBoundsExpression = [[-25.9, 43.0], [-11.8, 50.7]];

const nomFeat = (f: Feat): string =>
  String(
    f.properties.shapeName ??
      f.properties.name ??
      Object.values(f.properties).find((v) => typeof v === "string") ??
      ""
  );

const polygones = (f: Feat): number[][][][] =>
  f.geometry.type === "Polygon"
    ? [f.geometry.coordinates]
    : f.geometry.type === "MultiPolygon"
    ? f.geometry.coordinates
    : [];

function dansAnneau(x: number, y: number, a: number[][]): boolean {
  let dedans = false;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [xi, yi] = a[i];
    const [xj, yj] = a[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

const contient = (x: number, y: number, f: Feat) =>
  polygones(f).some((p) => dansAnneau(x, y, p[0]) && !p.slice(1).some((h) => dansAnneau(x, y, h)));

/** Un enfant (district, commune) appartient-il à un parent ? Test sur son centre et quelques sommets. */
function estDans(enfant: Feat, parent: Feat): boolean {
  const pts = polygones(enfant).flatMap((p) => p[0]);
  if (!pts.length) return false;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let score = contient(cx, cy, parent) ? 3 : 0;
  const pas = Math.max(1, Math.floor(pts.length / 6));
  for (let i = 0; i < pts.length && i < pas * 6; i += pas) {
    if (contient(pts[i][0], pts[i][1], parent)) score++;
  }
  return score >= 5;
}

const CACHE: Partial<Record<Niv, Feat[]>> = {};

async function charger(niv: Niv): Promise<Feat[]> {
  if (CACHE[niv]) return CACHE[niv]!;
  const f = `releaseData/gbOpen/MDG/${niv}/geoBoundaries-MDG-${niv}_simplified.geojson`;
  const urls = [
    `https://media.githubusercontent.com/media/${GH}/${REV}/${f}`, // sert les fichiers Git LFS
    `https://raw.githubusercontent.com/${GH}/${REV}/${f}`,
    `https://cdn.jsdelivr.net/gh/${GH}@${REV}/${f}`,
  ];
  let derniere: unknown = null;
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texte = await r.text();
      if (texte.startsWith("version https://git-lfs")) {
        throw new Error("pointeur Git LFS non résolu");
      }
      const j = JSON.parse(texte);
      const feats = (j.features ?? []).filter(
        (x: Feat) => x?.geometry && /Polygon/.test(x.geometry.type)
      ) as Feat[];
      if (feats.length) {
        CACHE[niv] = feats;
        return feats;
      }
    } catch (e) {
      derniere = e;
    }
  }
  throw new Error(`Impossible de charger les limites ${niv} (${String(derniere)})`);
}

const STYLE = {
  hors: { color: "#94a3b8", weight: 1, fillColor: "#e2e8f0", fillOpacity: 0.15 },
  inter: { color: "#c2410c", weight: 1.5, fillColor: "#fdba74", fillOpacity: 0.45 },
  choisie: { color: "#dc2626", weight: 3, fillColor: "#f97316", fillOpacity: 0.55 },
};
const styleZone = (dans: boolean, choisie: boolean) =>
  choisie ? STYLE.choisie : dans ? STYLE.inter : STYLE.hors;

type ActiviteLocalisee = Activite & { region: string; district: string; commune: string };

/* ===================== COMPOSANT ===================== */

export default function ZonesIntervention() {
  const elMap = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const couche = useRef<L.LayerGroup | null>(null);

  const [regions, setRegions] = useState<Feat[]>([]);
  const [districts, setDistricts] = useState<Feat[]>([]);
  const [communes, setCommunes] = useState<Feat[]>([]);
  const [erreur, setErreur] = useState("");
  const [requete, setRequete] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);

  /* ----- carte ----- */
  useEffect(() => {
    const m = L.map(elMap.current!, { zoomControl: false }).fitBounds(MADA);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(m);
    couche.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(elMap.current!);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  /* ----- chargement des limites ----- */
  useEffect(() => {
    charger("ADM1").then(setRegions).catch((e) => setErreur(e.message));
    charger("ADM2").then(setDistricts).catch((e) => setErreur(e.message));
  }, []);
  useEffect(() => {
    if (sel && (sel.niveau === "district" || sel.niveau === "commune")) {
      charger("ADM3").then(setCommunes).catch((e) => setErreur(e.message));
    }
  }, [sel]);

  /* ----- actions ----- */
  const choisir = (s: Sel) => {
    setSel(s);
    setRequete(s.label);
    setOuvert(false);
  };
  const effacer = () => {
    setSel(null);
    setRequete("");
    setOuvert(false);
  };
  const choisirZone = (niveau: Niveau, k: string, rk?: string, dk?: string) => {
    const s = trouver(niveau, k, rk, dk);
    if (s) choisir(s);
  };

  /* ----- suggestions de recherche ----- */
  const suggestions = useMemo(() => {
    const q = cle(requete);
    if (!q) return [];
    return SUGGESTIONS.filter((s) => s.recherche.includes(q))
      .sort((a, b) => RANG[a.niveau] - RANG[b.niveau] || a.label.localeCompare(b.label, "fr"))
      .slice(0, 8);
  }, [requete]);

  /* ----- périmètre ----- */
  const lignes = useMemo(() => (sel ? LIGNES.filter((l) => correspond(l, sel)) : []), [sel]);
  // Sans sélection, on montre toutes les zones d'intervention.
  const actives = useMemo(() => (sel ? lignes : LIGNES), [sel, lignes]);

  const regionActive = sel ? (sel.niveau === "region" ? sel.cle : sel.regionCle ?? null) : null;
  const districtActive = sel
    ? sel.niveau === "district"
      ? sel.cle
      : sel.niveau === "commune"
      ? sel.districtCle ?? null
      : null
    : null;
  const communeActive = sel?.niveau === "commune" ? sel.cle : null;

  const surbRegions = useMemo(() => new Set(actives.map((l) => cle(l.region.nom))), [actives]);
  const surbDistricts = useMemo(
    () =>
      new Set(
        actives
          .filter((l) => l.district)
          .map((l) => `${cle(l.region.nom)}|${cle(l.district!.nom)}`)
      ),
    [actives]
  );
  const surbCommunes = useMemo(
    () =>
      new Set(
        actives
          .filter((l) => l.commune)
          .map((l) => `${cle(l.region.nom)}|${cle(l.district!.nom)}|${cle(l.commune!.nom)}`)
      ),
    [actives]
  );
  const regionsDetaillees = useMemo(
    () => (regionActive ? new Set([regionActive]) : surbRegions),
    [regionActive, surbRegions]
  );

  const regionFeat = useMemo(
    () => (regionActive ? regions.find((f) => cle(nomFeat(f)) === regionActive) : undefined),
    [regionActive, regions]
  );
  const districtFeat = useMemo(() => {
    if (!districtActive) return undefined;
    return districts.find(
      (d) => cle(nomFeat(d)) === districtActive && (!regionFeat || estDans(d, regionFeat))
    );
  }, [districtActive, districts, regionFeat]);
  const communeFeat = useMemo(() => {
    if (!communeActive || !districtFeat) return undefined;
    return communes.find((c) => cle(nomFeat(c)) === communeActive && estDans(c, districtFeat));
  }, [communeActive, districtFeat, communes]);

  /* ----- dessin de la carte ----- */
  useEffect(() => {
    const g = couche.current;
    if (!g) return;
    g.clearLayers();

    // Régions
    regions.forEach((f) => {
      const k = cle(nomFeat(f));
      const dans = surbRegions.has(k);
      const couc = L.geoJSON(f as any, { style: styleZone(dans, regionActive === k) });
      couc.bindTooltip(nomFeat(f), { sticky: true });
      if (dans) couc.on("click", () => choisirZone("region", k));
      couc.addTo(g);
    });

    // Districts des régions concernées
    regions
      .filter((f) => regionsDetaillees.has(cle(nomFeat(f))))
      .forEach((rf) => {
        const rk = cle(nomFeat(rf));
        districts
          .filter((d) => estDans(d, rf))
          .forEach((d) => {
            const k = cle(nomFeat(d));
            const dans = surbDistricts.has(`${rk}|${k}`);
            const couc = L.geoJSON(d as any, {
              style: styleZone(dans, districtActive === k && regionActive === rk),
            });
            couc.bindTooltip(nomFeat(d), { sticky: true });
            if (dans) couc.on("click", () => choisirZone("district", k, rk));
            couc.addTo(g);
          });
      });

    // Communes du district sélectionné
    if (districtFeat && districtActive && communes.length) {
      const rk = regionActive ?? "";
      communes
        .filter((c) => estDans(c, districtFeat))
        .forEach((c) => {
          const k = cle(nomFeat(c));
          const dans = surbCommunes.has(`${rk}|${districtActive}|${k}`);
          const couc = L.geoJSON(c as any, { style: styleZone(dans, communeActive === k) });
          couc.bindTooltip(nomFeat(c), { sticky: true });
          if (dans) couc.on("click", () => choisirZone("commune", k, rk, districtActive));
          couc.addTo(g);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, districts, communes, sel, regionActive, districtActive, communeActive,
      surbRegions, surbDistricts, surbCommunes, regionsDetaillees, districtFeat]);

  /* ----- cadrage automatique ----- */
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!sel) {
      m.flyToBounds(MADA, { duration: 0.8 });
      return;
    }
    let liste: Feat[] = [];
    if (sel.niveau === "projet") {
      liste = regions.filter((f) => surbRegions.has(cle(nomFeat(f))));
    } else {
      const cible =
        sel.niveau === "commune" ? communeFeat : sel.niveau === "district" ? districtFeat : regionFeat;
      if (cible) liste = [cible];
    }
    if (!liste.length) return;
    const bounds = liste
      .map((f) => L.geoJSON(f as any).getBounds())
      .reduce((a, b) => a.extend(b));
    m.flyToBounds(bounds, {
      padding: [40, 40],
      maxZoom: sel.niveau === "commune" ? 11 : 9,
      duration: 0.9,
    });
  }, [sel, regions, surbRegions, regionFeat, districtFeat, communeFeat]);

  /* ----- données du panneau ----- */
  const lignesCommunes = useMemo(
    () =>
      actives.filter((l): l is LigneCommune => !!l.commune && !!l.district),
    [actives]
  );
  const activites = useMemo<ActiviteLocalisee[]>(
    () =>
      lignesCommunes.flatMap((l) =>
        l.commune.activites.map((a) => ({
          ...a,
          region: l.region.nom,
          district: l.district.nom,
          commune: l.commune.nom,
        }))
      ),
    [lignesCommunes]
  );
  const projetsVue = useMemo(
    () => PROJETS.filter((p) => actives.some((l) => l.projet.id === p.id)),
    [actives]
  );
  const arbre = useMemo(() => {
    const m = new Map<string, Map<string, Commune[]>>();
    actives.forEach((l) => {
      const r = m.get(l.region.nom) ?? new Map<string, Commune[]>();
      m.set(l.region.nom, r);
      if (!l.district) return;
      const coms = r.get(l.district.nom) ?? [];
      if (l.commune) coms.push(l.commune);
      r.set(l.district.nom, coms);
    });
    return m;
  }, [actives]);

  const nbRegions = new Set(actives.map((l) => cle(l.region.nom))).size;
  const nbDistricts = new Set(
    actives.filter((l) => l.district).map((l) => `${cle(l.region.nom)}|${cle(l.district!.nom)}`)
  ).size;
  const compteType = (t: TypeActivite) => activites.filter((a) => a.type === t).length;

  /* ----- rendu ----- */
  return (
    <div className="zi">
      <style>{CSS}</style>

      <header className="zi-head">
        <div>
          <h1>Zones d'intervention des projets</h1>
          <p>Localisation des régions, districts et communes où interviennent les projets</p>
        </div>

        <div className="zi-search">
          <Search size={17} aria-hidden />
          <input
            type="search"
            value={requete}
            placeholder="Projet, région, district ou commune (ex. PADDI+, Boeny, Marovoay)"
            onChange={(e) => {
              setRequete(e.target.value);
              setOuvert(true);
            }}
            onFocus={() => setOuvert(true)}
            onBlur={() => setOuvert(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]) choisir(suggestions[0]);
              if (e.key === "Escape") setOuvert(false);
            }}
            aria-label="Rechercher une zone d'intervention"
            aria-autocomplete="list"
          />
          {requete && (
            <span className="zi-clear" onClick={effacer} role="button" tabIndex={0} aria-label="Effacer la recherche">
              <X size={16} />
            </span>
          )}

          {ouvert && suggestions.length > 0 && (
            <ul className="zi-sug" role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choisir(s);
                  }}
                >
                  <span className={`zi-badge ${s.niveau}`}>{NIVEAU_LABEL[s.niveau]}</span>
                  <strong>{s.label}</strong>
                  <small>{s.contexte}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {erreur && <div className="zi-erreur" role="alert">{erreur}</div>}

      <div className="zi-body">
        <aside className="zi-panel">
          {/* Carte d'identité du territoire */}
          <section className="zi-card">
            {sel ? (
              <>
                <span className="zi-niveau">{NIVEAU_LABEL[sel.niveau]}</span>
                <h2>{sel.label}</h2>
                <p className="zi-fil">{sel.contexte}</p>
              </>
            ) : (
              <>
                <span className="zi-niveau">Vue d'ensemble</span>
                <h2>Zones d'intervention</h2>
                <p className="zi-fil">
                  Recherchez un projet, une région, un district ou une commune pour afficher ses
                  zones d'intervention et ses activités environnementales.
                </p>
                <div className="zi-projets">
                  {PROJETS.map((p) => (
                    <span
                      key={p.id}
                      className="zi-chip"
                      role="button"
                      tabIndex={0}
                      onClick={() => choisirZone("projet", cle(p.id))}
                    >
                      {p.nom}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Chiffres clés */}
          <section className="zi-stats">
            <div><b>{nbRegions}</b><span>Régions</span></div>
            <div><b>{nbDistricts}</b><span>Districts</span></div>
            <div><b>{lignesCommunes.length}</b><span>Communes</span></div>
            <div><b>{activites.length}</b><span>Activités</span></div>
          </section>

          {/* Activités par type */}
          <section className="zi-card">
            <h3>Activités environnementales</h3>
            {(Object.keys(TYPES) as TypeActivite[]).map((t) => {
              const Icone = TYPES[t].icone;
              const liste = activites.filter((a) => a.type === t);
              return (
                <div className="zi-type" key={t}>
                  <div className="zi-typeh" style={{ color: TYPES[t].couleur }}>
                    <Icone size={16} aria-hidden />
                    {TYPES[t].label}
                    <span>{compteType(t)}</span>
                  </div>
                  {liste.length ? (
                    <ul>
                      {liste.map((a, i) => (
                        <li key={i}>
                          <strong>{a.commune}</strong> · {a.titre}
                          {a.surface_ha ? ` · ${a.surface_ha} ha` : ""}
                          {a.annee ? ` · ${a.annee}` : ""}
                          <small> ({a.district}, {a.region})</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="zi-vide">Aucune activité renseignée</p>
                  )}
                </div>
              );
            })}
          </section>

          {/* Tableau par commune */}
          <section className="zi-card">
            <h3>Par commune</h3>
            {lignesCommunes.length ? (
              <table className="zi-tbl">
                <thead>
                  <tr>
                    <th>Commune</th>
                    <th>Restauration</th>
                    <th>Reboisement</th>
                    <th>Autres</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesCommunes.map((l) => {
                    const acts = l.commune.activites;
                    return (
                      <tr
                        key={`${l.region.nom}-${l.district.nom}-${l.commune.nom}`}
                        className="zi-row"
                        onClick={() =>
                          choisirZone("commune", cle(l.commune.nom), cle(l.region.nom), cle(l.district.nom))
                        }
                      >
                        <td>
                          {l.commune.nom}
                          <small>{l.district.nom}, {l.region.nom}</small>
                        </td>
                        <td>{acts.filter((a) => a.type === "restauration").length}</td>
                        <td>{acts.filter((a) => a.type === "reboisement").length}</td>
                        <td>{acts.filter((a) => a.type === "autre").length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="zi-vide">Communes non renseignées pour cette zone</p>
            )}
          </section>

          {/* Arbre des zones */}
          <section className="zi-card">
            <h3>Zones d'intervention</h3>
            {[...arbre.entries()].map(([reg, dists]) => (
              <div key={reg} className="zi-reg">
                <h4>{reg}</h4>
                {dists.size === 0 ? (
                  <p className="zi-vide">Districts non renseignés</p>
                ) : (
                  [...dists.entries()].map(([dis, coms]) => (
                    <div key={dis}>
                      <div className="zi-disn">{dis}</div>
                      <div className="zi-chips">
                        {coms.length ? (
                          coms.map((c) => (
                            <span
                              key={c.nom}
                              role="button"
                              tabIndex={0}
                              className={`zi-chip ${c.activites.length ? "has" : ""}`}
                              onClick={() => choisirZone("commune", cle(c.nom), cle(reg), cle(dis))}
                            >
                              {c.nom}
                            </span>
                          ))
                        ) : (
                          <span className="zi-vide">Communes non renseignées</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </section>

          {/* Projets concernés */}
          <section className="zi-card">
            <h3>Projets concernés</h3>
            <ul className="zi-list">
              {projetsVue.map((p) => (
                <li key={p.id}>
                  <strong>{p.nom}</strong> · {p.regions.length} région(s)
                </li>
              ))}
            </ul>
          </section>

          <p className="zi-note">
            Limites administratives : geoBoundaries (ADM1 à ADM3). Les zones d'intervention
            proviennent de la liste des projets dans le code. Les communes en vert signalent
            une activité renseignée.
          </p>
        </aside>

        <section className="zi-mcard" aria-label="Carte des zones d'intervention">
          <div className="zi-mhead">
            <MapPin size={16} aria-hidden />
            <span>{sel ? sel.label : "Madagascar : zones d'intervention"}</span>
          </div>
          <div ref={elMap} className="zi-map" />
          <div className="zi-legende">
            <span><i className="zi-lg-int" />Zone d'intervention</span>
            <span><i className="zi-lg-sel" />Sélection</span>
            <span><i className="zi-lg-oth" />Hors intervention</span>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */

const CSS = `
.zi{--bg:#f1efe8;--card:#fff;--line:#d8d4c8;--ink:#1c2822;--ink2:#4a5850;--ink3:#7a867f;--acc:#1f6f50;
  display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg);color:var(--ink);font-family:inherit}
.zi *{box-sizing:border-box}
.zi h1,.zi h2,.zi h3,.zi h4{margin:0;font-weight:600}
.zi h1{font-size:22px}
.zi h2{font-family:Georgia,serif;font-weight:500;font-size:30px;line-height:1.1;margin:4px 0}
.zi h3{font-size:16px;margin-bottom:6px}
.zi-head{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--card);border-bottom:1px solid var(--line)}
.zi-head p{margin:2px 0 0;font-size:13px;color:var(--ink3)}
.zi-search{position:relative;display:flex;align-items:center;gap:8px;flex:1;max-width:640px;min-width:260px;padding:0 12px;height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink3)}
.zi-search:focus-within{border-color:var(--acc);box-shadow:0 0 0 3px rgba(31,111,80,.15)}
.zi-search input{flex:1;min-width:0;border:0;outline:none;background:transparent;font:inherit;font-size:14px;color:var(--ink)}
.zi-clear{cursor:pointer;display:grid;place-items:center;color:var(--ink3)}
.zi-sug{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:20;margin:0;padding:6px;list-style:none;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.15);max-height:360px;overflow-y:auto}
.zi-sug li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:8px 10px;border-radius:8px;cursor:pointer;align-items:center}
.zi-sug li:hover{background:var(--bg)}
.zi-sug strong{font-size:14px}
.zi-sug small{grid-column:2;font-size:12px;color:var(--ink3)}
.zi-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:#e7f1ec;color:var(--acc);white-space:nowrap}
.zi-badge.projet{background:#fde68a;color:#78350f}
.zi-badge.district{background:#e0e7ff;color:#3730a3}
.zi-badge.commune{background:#fce7f3;color:#9d174d}
.zi-erreur{padding:10px 20px;background:#fef2f2;color:#b91c1c;font-size:13px}
.zi-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(380px,44%) minmax(0,1fr)}
.zi-panel{overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;border-right:1px solid var(--line)}
.zi-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.zi-niveau{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--acc)}
.zi-fil{margin:0;font-size:13px;color:var(--ink2);line-height:1.5}
.zi-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.zi-stats div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 10px;display:flex;flex-direction:column}
.zi-stats b{font-family:Georgia,serif;font-weight:500;font-size:24px;line-height:1.1}
.zi-stats span{font-size:11.5px;color:var(--ink3)}
.zi-type{margin-top:4px}
.zi-typeh{display:flex;align-items:center;gap:6px;font-weight:600;font-size:14px;margin:12px 0 4px}
.zi-typeh span{margin-left:auto;font-size:12px;background:var(--bg);color:var(--ink2);padding:1px 8px;border-radius:999px}
.zi-type ul,.zi-list{margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:var(--ink2)}
.zi-type small{color:var(--ink3)}
.zi-vide{font-size:13px;color:var(--ink3);margin:2px 0}
.zi-tbl{width:100%;border-collapse:collapse;font-size:13px}
.zi-tbl th{font-weight:500;font-size:12px;color:var(--ink3);text-align:right;padding-bottom:4px}
.zi-tbl th:first-child,.zi-tbl td:first-child{text-align:left}
.zi-tbl td{padding:6px 0;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
.zi-tbl td small{display:block;color:var(--ink3);font-size:11.5px}
.zi-row{cursor:pointer}
.zi-row:hover td{background:var(--bg)}
.zi-reg{margin-top:10px}
.zi-reg h4{font-size:14px;padding-bottom:4px;border-bottom:1px solid var(--line)}
.zi-disn{font-size:13px;font-weight:600;margin:8px 0 4px;color:var(--ink2)}
.zi-chips,.zi-projets{display:flex;flex-wrap:wrap;gap:6px}
.zi-projets{margin-top:12px}
.zi-chip{font-size:12.5px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:#fff;cursor:pointer;color:var(--ink2)}
.zi-chip:hover{background:var(--bg)}
.zi-chip.has{border-color:var(--acc);color:var(--acc);font-weight:600}
.zi-note{font-size:12px;color:var(--ink3);line-height:1.5;margin:0 4px}
.zi-mcard{margin:10px;display:flex;flex-direction:column;min-height:0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.zi-mhead{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:14px;font-weight:600}
.zi-map{flex:1;min-height:420px;background:#e5e7eb}
.zi-legende{display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid var(--line);font-size:12px;color:var(--ink2)}
.zi-legende i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
.zi-lg-int{background:#fdba74;border:1px solid #c2410c}
.zi-lg-sel{background:#f97316;border:2px solid #dc2626}
.zi-lg-oth{background:#e2e8f0;border:1px solid #94a3b8}
@media (max-width:900px){
  .zi{height:auto;min-height:100dvh}
  .zi-body{grid-template-columns:1fr}
  .zi-panel{border-right:0;order:2;overflow:visible}
  .zi-mcard{order:1;margin:10px 10px 0}
  .zi-map{min-height:50vh}
  .zi-stats{grid-template-columns:repeat(2,1fr)}
}
`;
