/**
 * ZonesUpdateModal.tsx — fenêtre de mise à jour des zones d'intervention.
 * Ouverte uniquement après connexion (LoginModal), comme UpdateIndicateursModal dans le Dashboard.
 * Permet :
 *  - ajouter un projet, choisir ses secteurs (liste de la base, avec ajout de nouveaux secteurs) ;
 *  - ajouter, modifier (région, district, commune, MBV) ou supprimer une zone, y compris une zone
 *    déjà enregistrée ;
 *  - enregistrer le tout (PUT saveUrl, avec l'en-tête Authorization: Bearer <jeton>).
 * Les listes Région > District > Commune sont en cascade, basées sur les limites de Madagascar
 * (geoBoundaries ADM1 à ADM3, via ../lib/limitesAdmin).
 * À placer dans : src/components/ZonesUpdateModal.tsx
 */
import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, Save, Pencil } from "lucide-react";
import { charger, cle, estDans, nomFeat, type Feat } from "../lib/limitesAdmin";

type TypeProjet = "environnement" | "developpement";
export type Secteur = { id: string; nom: string };
export type ProjetMeta = {
  id: string;
  nom: string;
  alias: string[];
  type: TypeProjet;
  secteurs: string[];
};
export type LigneZone = {
  projetId: string;
  projet: string;
  type: TypeProjet;
  region: string;
  district?: string;
  commune?: string;
  activites: unknown[];
  mbv_ha?: number;
};

type Props = {
  projets: ProjetMeta[];
  lignes: LigneZone[];
  secteurs: Secteur[];
  token: string;
  userName: string;
  saveUrl: string;
  onClose: () => void;
  onSaved: () => void;
};

const cleZone = (l: LigneZone) =>
  [cle(l.region), l.district ? cle(l.district) : "", l.commune ? cle(l.commune) : ""].join("|");

const CHAMP: React.CSSProperties = {
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  font: "inherit",
  fontSize: 13,
  minWidth: 0,
  width: "100%",
};

const BOUTON: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 8,
  border: "none",
  background: "#14532d",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const BOUTON_SECOND: React.CSSProperties = {
  ...BOUTON,
  background: "var(--surface-3)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

const SECTION: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "var(--surface-2)",
};

/* Liste déroulante ; saisie libre si les limites n'ont pas pu être chargées */
function Choix({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  libre,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  libre?: boolean;
}) {
  if (libre)
    return (
      <input
        style={CHAMP}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  return (
    <select
      style={{ ...CHAMP, opacity: disabled ? 0.55 : 1 }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const uniques = (feats: Feat[]) =>
  [...new Set(feats.map(nomFeat))].sort((a, b) => a.localeCompare(b));

const NZ_VIDE = { region: "", district: "", commune: "", mbv: "" };

export default function ZonesUpdateModal({
  projets: projetsInit,
  lignes: lignesInit,
  secteurs: secteursInit = [],
  token,
  userName,
  saveUrl,
  onClose,
  onSaved,
}: Props) {
  const [projets, setProjets] = useState<ProjetMeta[]>(
    projetsInit.map((p) => ({ ...p, secteurs: p.secteurs ?? [] }))
  );
  const [lignes, setLignes] = useState<LigneZone[]>(lignesInit);
  const [secteurs, setSecteurs] = useState<Secteur[]>(secteursInit);
  const [projetId, setProjetId] = useState<string>(projetsInit[0]?.id ?? "");
  const [np, setNp] = useState({ nom: "", alias: "", type: "environnement" as TypeProjet });
  const [nsec, setNsec] = useState("");
  const [nz, setNz] = useState(NZ_VIDE);
  /* Zone enregistrée en cours de modification (null = ajout d'une nouvelle zone) */
  const [enEdition, setEnEdition] = useState<LigneZone | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [saving, setSaving] = useState(false);

  /* ----- limites administratives de Madagascar ----- */
  const [regionsF, setRegionsF] = useState<Feat[]>([]);
  const [districtsF, setDistrictsF] = useState<Feat[]>([]);
  const [communesF, setCommunesF] = useState<Feat[]>([]);
  const [limitesOk, setLimitesOk] = useState(false);
  const [limitesErreur, setLimitesErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    Promise.all([charger("ADM1"), charger("ADM2"), charger("ADM3")])
      .then(([r, d, c]) => {
        if (!actif) return;
        setRegionsF(r);
        setDistrictsF(d);
        setCommunesF(c);
        setLimitesOk(true);
      })
      .catch(() => {
        if (actif) setLimitesErreur(true);
      });
    return () => {
      actif = false;
    };
  }, []);

  const nomsRegions = useMemo(() => uniques(regionsF), [regionsF]);

  const regionFeat = useMemo(
    () => regionsF.find((f) => cle(nomFeat(f)) === cle(nz.region)),
    [regionsF, nz.region]
  );
  const districtsRegion = useMemo(
    () => (regionFeat ? districtsF.filter((d) => estDans(d, regionFeat)) : []),
    [regionFeat, districtsF]
  );
  const districtFeat = useMemo(
    () => districtsRegion.find((d) => cle(nomFeat(d)) === cle(nz.district)),
    [districtsRegion, nz.district]
  );
  const communesDistrict = useMemo(
    () => (districtFeat ? communesF.filter((c) => estDans(c, districtFeat)) : []),
    [districtFeat, communesF]
  );
  const nomsDistricts = useMemo(() => uniques(districtsRegion), [districtsRegion]);
  const nomsCommunes = useMemo(() => uniques(communesDistrict), [communesDistrict]);

  const projet = projets.find((p) => p.id === projetId);
  const lignesProjet = lignes.filter((l) => l.projetId === projetId);

  const erreur = (texte: string) => setMsg({ ok: false, texte });
  const info = (texte: string) => setMsg({ ok: true, texte });

  /* ----- choix du projet (annule une modification de zone en cours) ----- */
  const selectionnerProjet = (id: string) => {
    setProjetId(id);
    setEnEdition(null);
    setNz(NZ_VIDE);
  };

  /* ----- projets ----- */
  const ajouterProjet = () => {
    const nom = np.nom.trim();
    if (!nom) return erreur("Indiquez le nom du projet.");
    const id = cle(nom);
    if (!id) return erreur("Nom de projet invalide.");
    if (projets.some((p) => p.id === id)) return erreur("Ce projet existe déjà.");
    const alias = np.alias
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const secteurDefaut = np.type === "environnement" ? "environnement" : "developpement";
    const secteursDefaut = secteurs.some((s) => s.id === secteurDefaut) ? [secteurDefaut] : [];
    setProjets((prev) => [...prev, { id, nom, alias, type: np.type, secteurs: secteursDefaut }]);
    selectionnerProjet(id);
    setNp({ nom: "", alias: "", type: "environnement" });
    info(`Projet « ${nom} » ajouté. Choisissez ses secteurs et ajoutez ses zones, puis enregistrez.`);
  };

  const supprimerProjet = (p: ProjetMeta) => {
    if (lignes.some((l) => l.projetId === p.id))
      return erreur(`Supprimez d'abord les zones de « ${p.nom} ».`);
    setProjets((prev) => prev.filter((x) => x.id !== p.id));
    if (projetId === p.id) selectionnerProjet(projets.find((x) => x.id !== p.id)?.id ?? "");
    info(`Projet « ${p.nom} » retiré. Enregistrez pour confirmer.`);
  };

  /* ----- secteurs ----- */
  const basculerSecteur = (secteurId: string) => {
    if (!projet) return;
    setProjets((prev) =>
      prev.map((p) =>
        p.id === projet.id
          ? {
              ...p,
              secteurs: p.secteurs.includes(secteurId)
                ? p.secteurs.filter((x) => x !== secteurId)
                : [...p.secteurs, secteurId],
            }
          : p
      )
    );
  };

  const ajouterSecteur = () => {
    const nom = nsec.trim();
    if (!nom) return erreur("Indiquez le nom du secteur.");
    const id = cle(nom);
    if (!id) return erreur("Nom de secteur invalide.");
    if (!secteurs.some((s) => s.id === id)) setSecteurs((prev) => [...prev, { id, nom }]);
    if (projet && !projet.secteurs.includes(id)) basculerSecteur(id);
    setNsec("");
    info(`Secteur « ${nom} » ajouté. Enregistrez pour confirmer.`);
  };

  const supprimerSecteur = (s: Secteur) => {
    if (projets.some((p) => p.secteurs.includes(s.id)))
      return erreur(`Le secteur « ${s.nom} » est utilisé par un projet : retirez-le des projets d'abord.`);
    setSecteurs((prev) => prev.filter((x) => x.id !== s.id));
    info(`Secteur « ${s.nom} » retiré. Enregistrez pour confirmer.`);
  };

  /* ----- zones : chargement d'une zone enregistrée dans le formulaire ----- */
  const modifierZone = (l: LigneZone) => {
    setEnEdition(l);
    setNz({
      region: l.region,
      district: l.district ?? "",
      commune: l.commune ?? "",
      mbv: l.mbv_ha != null ? String(l.mbv_ha) : "",
    });
    setMsg(null);
  };

  const annulerModification = () => {
    setEnEdition(null);
    setNz(NZ_VIDE);
  };

  /* ----- zones : ajout ou modification (validation commune) ----- */
  const validerZone = () => {
    if (!projet) return erreur("Choisissez d'abord un projet.");
    const region = nz.region.trim();
    const district = nz.district.trim();
    const commune = nz.commune.trim();
    if (!region) return erreur("La région est obligatoire.");
    if (commune && !district) return erreur("Indiquez le district de cette commune.");

    const mbvTxt = nz.mbv.trim().replace(",", ".");
    const mbv = mbvTxt === "" ? undefined : Number(mbvTxt);
    if (mbv !== undefined && (!Number.isFinite(mbv) || mbv < 0))
      return erreur("Superficie MBV invalide.");

    const nouvelle: LigneZone = {
      projetId: projet.id,
      projet: projet.nom,
      type: projet.type,
      region,
      district: district || undefined,
      commune: commune || undefined,
      activites: enEdition?.activites ?? [],
      mbv_ha: mbv,
    };

    /* Doublon : on ignore la zone en cours de modification */
    const doublon = lignes.some(
      (l) => l !== enEdition && l.projetId === projet.id && cleZone(l) === cleZone(nouvelle)
    );
    if (doublon) return erreur("Cette zone existe déjà pour ce projet.");

    if (enEdition) {
      const cible = enEdition;
      setLignes((prev) => prev.map((x) => (x === cible ? nouvelle : x)));
      annulerModification();
      info("Zone modifiée. Enregistrez pour confirmer.");
    } else {
      setLignes((prev) => [...prev, nouvelle]);
      setNz(NZ_VIDE);
      info("Zone ajoutée. Enregistrez pour confirmer.");
    }
  };

  const supprimerZone = (l: LigneZone) => {
    if (enEdition === l) annulerModification();
    setLignes((prev) => prev.filter((x) => x !== l));
    info("Zone retirée. Enregistrez pour confirmer.");
  };

  /* ----- enregistrement ----- */
  const enregistrer = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const corps = {
        type: "FeatureCollection",
        name: "zones_intervention",
        mise_a_jour: new Date().toISOString().slice(0, 10),
        secteurs,
        projets,
        features: lignes.map((l) => ({
          type: "Feature",
          geometry: null,
          properties: {
            projet_id: l.projetId,
            projet: l.projet,
            type: l.type,
            region: l.region,
            district: l.district ?? null,
            commune: l.commune ?? null,
            mbv_ha: l.mbv_ha ?? null,
            activites: l.activites,
          },
        })),
      };
      const r = await fetch(saveUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(corps),
      });
      if (!r.ok) {
        const detail = await r.text();
        throw new Error(detail || `HTTP ${r.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setMsg({
        ok: false,
        texte: `Enregistrement impossible : ${e instanceof Error ? e.message : "erreur inconnue"}`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          borderRadius: 14,
          width: "min(760px, 100%)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,.3)",
        }}
      >
        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--title-green)" }}>Mettre à jour les zones d'intervention</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Connecté : {userName || "utilisateur"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ ...BOUTON_SECOND, padding: 6 }}>
            <X size={16} />
          </button>
        </div>

        {/* Corps défilant */}
        <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1. Projets et secteurs */}
          <div style={SECTION}>
            <div style={{ fontWeight: 700 }}>1. Projets et secteurs</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {projets.map((p) => (
                <span
                  key={p.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 6px 3px 10px",
                    borderRadius: 999,
                    border: `1px solid ${p.id === projetId ? "var(--accent)" : "var(--border)"}`,
                    background: p.id === projetId ? "var(--acc-soft, var(--surface-3))" : "var(--surface)",
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                  onClick={() => selectionnerProjet(p.id)}
                >
                  {p.nom}
                  <button
                    type="button"
                    aria-label={`Supprimer ${p.nom}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      supprimerProjet(p);
                    }}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", display: "grid", placeItems: "center" }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>

            {projet && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>Secteurs de « {projet.nom} »</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {secteurs.map((s) => {
                    const on = projet.secteurs.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 6px 3px 8px",
                          borderRadius: 999,
                          border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                          background: on ? "var(--acc-soft, var(--surface-3))" : "var(--surface)",
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        <input type="checkbox" checked={on} onChange={() => basculerSecteur(s.id)} />
                        {s.nom}
                        <button
                          type="button"
                          aria-label={`Retirer le secteur ${s.nom}`}
                          title="Retirer le secteur de la liste"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            supprimerSecteur(s);
                          }}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", display: "grid", placeItems: "center" }}
                        >
                          <X size={12} />
                        </button>
                      </label>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={CHAMP}
                    value={nsec}
                    onChange={(e) => setNsec(e.target.value)}
                    placeholder="Nouveau secteur (ex. Agriculture)"
                  />
                  <button type="button" style={BOUTON_SECOND} onClick={ajouterSecteur}>
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 150px auto", gap: 6, alignItems: "end", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>Nom du projet</label>
                <input style={CHAMP} value={np.nom} onChange={(e) => setNp({ ...np, nom: e.target.value })} placeholder="ex. PRODECID" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>Autres noms (virgules)</label>
                <input style={CHAMP} value={np.alias} onChange={(e) => setNp({ ...np, alias: e.target.value })} placeholder="ex. prodecid rural" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>Type</label>
                <select style={CHAMP} value={np.type} onChange={(e) => setNp({ ...np, type: e.target.value as TypeProjet })}>
                  <option value="environnement">Environnemental</option>
                  <option value="developpement">Développement</option>
                </select>
              </div>
              <button type="button" style={BOUTON} onClick={ajouterProjet}>
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>

          {/* 2. Zones du projet choisi */}
          <div style={SECTION}>
            <div style={{ fontWeight: 700 }}>
              2. Zones d'intervention {projet ? `— ${projet.nom}` : ""}
            </div>
            {!projet ? (
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>Ajoutez d'abord un projet.</div>
            ) : (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: enEdition ? "var(--accent)" : "var(--text-3)" }}>
                  {enEdition
                    ? `Modification de : ${enEdition.region}${enEdition.district ? ` · ${enEdition.district}` : ""}${enEdition.commune ? ` · ${enEdition.commune}` : ""}`
                    : "Nouvelle zone"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) 110px auto", gap: 6, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>Région *</label>
                    <Choix
                      value={nz.region}
                      options={nomsRegions}
                      placeholder={limitesOk || limitesErreur ? "Choisir une région" : "Chargement…"}
                      libre={limitesErreur}
                      disabled={!limitesOk}
                      onChange={(v) => setNz({ ...nz, region: v, district: "", commune: "" })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>District</label>
                    <Choix
                      value={nz.district}
                      options={nomsDistricts}
                      placeholder="Toute la région"
                      libre={limitesErreur}
                      disabled={!nz.region}
                      onChange={(v) => setNz({ ...nz, district: v, commune: "" })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>Commune</label>
                    <Choix
                      value={nz.commune}
                      options={nomsCommunes}
                      placeholder="Tout le district"
                      libre={limitesErreur}
                      disabled={!nz.district}
                      onChange={(v) => setNz({ ...nz, commune: v })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>MBV (ha)</label>
                    <input style={CHAMP} inputMode="decimal" value={nz.mbv} onChange={(e) => setNz({ ...nz, mbv: e.target.value })} placeholder="facultatif" />
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" style={BOUTON} onClick={validerZone}>
                      {enEdition ? <Save size={14} /> : <Plus size={14} />} {enEdition ? "Valider" : "Ajouter"}
                    </button>
                    {enEdition && (
                      <button type="button" style={BOUTON_SECOND} onClick={annulerModification}>
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                  Laissez District et Commune vides pour une zone au niveau de la région seulement.
                  Les listes sont liées : le district dépend de la région, et la commune dépend du district.
                  {limitesErreur && " Les limites n'ont pas pu être chargées : saisissez les noms à la main."}
                </div>

                {lignesProjet.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-3)" }}>Aucune zone pour ce projet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                    {lignesProjet.map((l, i) => {
                      const actuelle = enEdition === l;
                      return (
                        <div
                          key={`${cleZone(l)}-${i}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0,1fr) 110px auto auto",
                            gap: 8,
                            alignItems: "center",
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: actuelle ? "var(--acc-soft, var(--surface-3))" : "var(--surface)",
                            border: `1px solid ${actuelle ? "var(--accent)" : "var(--border)"}`,
                          }}
                        >
                          <div style={{ fontSize: 12.5, minWidth: 0, overflowWrap: "anywhere" }}>
                            <strong>{l.region}</strong>
                            {l.district && <> · {l.district}</>}
                            {l.commune && <> · {l.commune}</>}
                          </div>
                          <div style={{ fontSize: 12.5, textAlign: "right", color: "var(--text-2)" }}>
                            {l.mbv_ha != null ? `${l.mbv_ha} ha MBV` : "—"}
                          </div>
                          <button
                            type="button"
                            aria-label="Modifier la zone"
                            title="Modifier la zone"
                            onClick={() => modifierZone(l)}
                            style={{ ...BOUTON_SECOND, padding: 6 }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Supprimer la zone"
                            title="Supprimer la zone"
                            onClick={() => supprimerZone(l)}
                            style={{ ...BOUTON_SECOND, padding: 6, color: "#b91c1c" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pied : message + actions */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            role="status"
            style={{
              flex: 1,
              minWidth: 180,
              fontSize: 12.5,
              color: msg ? (msg.ok ? "var(--accent)" : "#b91c1c") : "var(--text-3)",
            }}
          >
            {msg ? msg.texte : "Les modifications ne sont enregistrées qu'après un clic sur Enregistrer."}
          </div>
          <button type="button" style={BOUTON_SECOND} onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="button" style={{ ...BOUTON, opacity: saving ? 0.6 : 1 }} onClick={enregistrer} disabled={saving}>
            <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
