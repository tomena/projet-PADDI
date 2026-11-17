/**
 * ZonesUpdateModal.tsx — fenêtre de mise à jour des zones d'intervention.
 * Ouverte uniquement après connexion (LoginModal), comme UpdateIndicateursModal dans le Dashboard.
 * Permet : ajouter un projet, ajouter / supprimer une zone, modifier la superficie MBV, enregistrer.
 * Enregistrement : PUT saveUrl, avec l'en-tête Authorization: Bearer <jeton>.
 */
import { useMemo, useState } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";

type TypeProjet = "environnement" | "developpement";
export type ProjetMeta = { id: string; nom: string; alias: string[]; type: TypeProjet };
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
  token: string;
  userName: string;
  saveUrl: string;
  onClose: () => void;
  onSaved: () => void;
};

const cle = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

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

export default function ZonesUpdateModal({
  projets: projetsInit,
  lignes: lignesInit,
  token,
  userName,
  saveUrl,
  onClose,
  onSaved,
}: Props) {
  const [projets, setProjets] = useState<ProjetMeta[]>(projetsInit);
  const [lignes, setLignes] = useState<LigneZone[]>(lignesInit);
  const [projetId, setProjetId] = useState<string>(projetsInit[0]?.id ?? "");
  const [np, setNp] = useState({ nom: "", alias: "", type: "environnement" as TypeProjet });
  const [nz, setNz] = useState({ region: "", district: "", commune: "", mbv: "" });
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const projet = projets.find((p) => p.id === projetId);
  const lignesProjet = lignes.filter((l) => l.projetId === projetId);
  const regionsConnues = useMemo(
    () => [...new Set(lignes.map((l) => l.region))].sort((a, b) => a.localeCompare(b)),
    [lignes]
  );

  const erreur = (texte: string) => setMsg({ ok: false, texte });
  const info = (texte: string) => setMsg({ ok: true, texte });

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
    setProjets((prev) => [...prev, { id, nom, alias, type: np.type }]);
    setProjetId(id);
    setNp({ nom: "", alias: "", type: "environnement" });
    info(`Projet « ${nom} » ajouté. Ajoutez ses zones, puis enregistrez.`);
  };

  const supprimerProjet = (p: ProjetMeta) => {
    if (lignes.some((l) => l.projetId === p.id))
      return erreur(`Supprimez d'abord les zones de « ${p.nom} ».`);
    setProjets((prev) => prev.filter((x) => x.id !== p.id));
    if (projetId === p.id) setProjetId(projets.find((x) => x.id !== p.id)?.id ?? "");
    info(`Projet « ${p.nom} » retiré. Enregistrez pour confirmer.`);
  };

  /* ----- zones ----- */
  const ajouterZone = () => {
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
      activites: [],
      mbv_ha: mbv,
    };
    if (lignes.some((l) => cleZone(l) === cleZone(nouvelle) && l.projetId === projet.id))
      return erreur("Cette zone existe déjà pour ce projet.");

    setLignes((prev) => [...prev, nouvelle]);
    setNz({ region: "", district: "", commune: "", mbv: "" });
    info("Zone ajoutée. Enregistrez pour confirmer.");
  };

  const supprimerZone = (l: LigneZone) => {
    setLignes((prev) => prev.filter((x) => x !== l));
    info("Zone retirée. Enregistrez pour confirmer.");
  };

  /* La superficie MBV est validée à la sortie du champ (évite de perdre une virgule en cours de saisie) */
  const changerMbv = (l: LigneZone, v: string) => {
    const txt = v.trim().replace(",", ".");
    const mbv = txt === "" ? undefined : Number(txt);
    if (mbv !== undefined && (!Number.isFinite(mbv) || mbv < 0)) return erreur("Superficie MBV invalide.");
    setLignes((prev) => prev.map((x) => (x === l ? { ...x, mbv_ha: mbv } : x)));
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
          {/* 1. Projets */}
          <div style={SECTION}>
            <div style={{ fontWeight: 700 }}>1. Projets</div>
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
                  onClick={() => setProjetId(p.id)}
                >
                  {p.nom} <small style={{ color: "var(--text-3)" }}>({p.type === "environnement" ? "env." : "dév."})</small>
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
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 150px auto", gap: 6, alignItems: "end" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) 110px auto", gap: 6, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>Région *</label>
                    <input list="zi-regions" style={CHAMP} value={nz.region} onChange={(e) => setNz({ ...nz, region: e.target.value })} placeholder="ex. Boeny" />
                    <datalist id="zi-regions">
                      {regionsConnues.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>District</label>
                    <input style={CHAMP} value={nz.district} onChange={(e) => setNz({ ...nz, district: e.target.value })} placeholder="ex. Marovoay" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>Commune</label>
                    <input style={CHAMP} value={nz.commune} onChange={(e) => setNz({ ...nz, commune: e.target.value })} placeholder="ex. Marosakoa" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)" }}>MBV (ha)</label>
                    <input style={CHAMP} inputMode="decimal" value={nz.mbv} onChange={(e) => setNz({ ...nz, mbv: e.target.value })} placeholder="facultatif" />
                  </div>
                  <button type="button" style={BOUTON} onClick={ajouterZone}>
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                  Laissez District et Commune vides pour une zone au niveau de la région seulement.
                  Écrivez les noms comme dans les données géographiques (ex. « Boeny », « Vakinankaratra »).
                </div>

                {lignesProjet.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-3)" }}>Aucune zone pour ce projet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                    {lignesProjet.map((l) => (
                      <div
                        key={cleZone(l) + l.projetId}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0,1fr) 120px auto",
                          gap: 8,
                          alignItems: "center",
                          padding: "6px 8px",
                          borderRadius: 8,
                          background: "var(--surface)",
                          border: "1px solid var(--border-soft, var(--border))",
                        }}
                      >
                        <div style={{ fontSize: 12.5, minWidth: 0, overflowWrap: "anywhere" }}>
                          <strong>{l.region}</strong>
                          {l.district && <> · {l.district}</>}
                          {l.commune && <> · {l.commune}</>}
                        </div>
                        <input
                          style={{ ...CHAMP, padding: "4px 7px" }}
                          inputMode="decimal"
                          defaultValue={l.mbv_ha ?? ""}
                          placeholder="MBV (ha)"
                          key={`${cleZone(l)}-${l.mbv_ha ?? ""}`}
                          onBlur={(e) => changerMbv(l, e.target.value)}
                          aria-label="Superficie MBV (ha)"
                        />
                        <button
                          type="button"
                          aria-label="Supprimer la zone"
                          onClick={() => supprimerZone(l)}
                          style={{ ...BOUTON_SECOND, padding: 6, color: "#b91c1c" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
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
