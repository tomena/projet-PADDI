// src/pages/MiseAJour.tsx — version 2
// Bouton « + Ajouter un point » sur la carte. Quand il est actif, un clic sur la carte
// ouvre directement la fenêtre de saisie, avec la position. Échap ou Annuler arrête le mode.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

type Domaine = "sante" | "education";
type Option = { label: string; prefixe: string; amenity: string };
type Zone = { region: string | null; district: string | null; commune: string | null };
type Props = { mapRef: { current: L.Map | null }; zone: Zone };

const TITRE: Record<Domaine, string> = { sante: "Santé", education: "Éducation" };

const OPTIONS: Record<Domaine, Option[]> = {
  sante: [
    { label: "CHU", prefixe: "CHU", amenity: "hospital" },
    { label: "CHRR", prefixe: "CHRR", amenity: "hospital" },
    { label: "CHRD", prefixe: "CHRD", amenity: "hospital" },
    { label: "CSB I", prefixe: "CSB I", amenity: "health_post" },
    { label: "CSB II", prefixe: "CSB II", amenity: "health_post" },
    { label: "Pharmacie", prefixe: "Pharmacie", amenity: "pharmacy" },
    { label: "Centre médical", prefixe: "Centre médical", amenity: "doctors" },
    { label: "Clinique", prefixe: "Clinique", amenity: "clinic" },
  ],
  education: [
    { label: "CEG", prefixe: "CEG", amenity: "college" },
    { label: "Collège", prefixe: "Collège", amenity: "college" },
    { label: "Collège privé", prefixe: "Collège privé", amenity: "college" },
    { label: "École primaire", prefixe: "École primaire", amenity: "school" },
    { label: "École primaire privée", prefixe: "École primaire privée", amenity: "school" },
    { label: "Lycée", prefixe: "Lycée", amenity: "school" },
    { label: "Lycée privé", prefixe: "Lycée privé", amenity: "school" },
    { label: "Université", prefixe: "Université", amenity: "university" },
    { label: "Université privée", prefixe: "Université privée", amenity: "university" },
  ],
};

const LIBELLE_LIEU = { region: "Région", district: "District", commune: "Commune", fokontany: "Fokontany" } as const;

const STYLE = `
.maj-btn{padding:6px 11px;border-radius:9px;border:1px solid #0f766e;background:#0f766e;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-btn.actif{background:#fff;color:#0f766e}
.maj-statut{font:600 12px system-ui,sans-serif;color:#0f766e}
.maj-bandeau{position:absolute;z-index:1100;left:50%;top:12px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:7px 12px;border-radius:9px;font:12.5px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none}
.maj-ov{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:16px;background:rgba(10,20,15,.5)}
.maj-modal{width:min(480px,100%);max-height:92dvh;overflow-y:auto;background:var(--surface,#fff);color:var(--text,#1c2822);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);font:13px system-ui,sans-serif}
.maj-h{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border,#d8d4c8)}
.maj-h h3{margin:0;font-size:16px}
.maj-x{width:32px;height:32px;border-radius:8px;border:1px solid var(--border,#d8d4c8);background:transparent;color:inherit;font-size:18px;cursor:pointer}
.maj-seg{display:flex;gap:6px;padding:12px 16px 0}
.maj-seg button{flex:1;padding:8px;border-radius:9px;border:1px solid var(--border,#d8d4c8);background:transparent;color:inherit;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-seg button[aria-pressed=true]{background:#0f766e;border-color:#0f766e;color:#fff}
.maj-corps{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.maj-corps label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:12px}
.maj-corps input,.maj-corps select{padding:8px 9px;border-radius:8px;border:1px solid var(--border,#d8d4c8);background:var(--surface-2,#f7f6f2);color:inherit;font:400 13px system-ui,sans-serif}
.maj-grille{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.maj-coord{font-size:12px;color:var(--text-3,#6b7770);margin:0}
.maj-primary{padding:10px 14px;border-radius:9px;border:0;background:#0f766e;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-primary:disabled{opacity:.5;cursor:default}
.maj-sec{padding:10px 14px;border-radius:9px;border:1px solid var(--border,#d8d4c8);background:transparent;color:inherit;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
.maj-msg{margin:0;padding:8px 10px;border-radius:8px;background:rgba(190,18,60,.1);color:#be123c;font-weight:600}
@media (max-width:520px){.maj-grille{grid-template-columns:1fr}}
`;

export default function MiseAJour({ mapRef, zone }: Props) {
  const [actif, setActif] = useState(false);
  const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [domaine, setDomaine] = useState<Domaine>("sante");
  const [optIdx, setOptIdx] = useState(0);
  const [nom, setNom] = useState("");
  const [lieu, setLieu] = useState({ region: "", district: "", commune: "", fokontany: "" });
  const [code, setCode] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem("code-ajout") ?? "" : "",
  );
  const [msg, setMsg] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [statut, setStatut] = useState("");

  // La zone choisie au moment du clic sert à pré-remplir la fenêtre
  const zoneRef = useRef(zone);
  zoneRef.current = zone;

  const fermer = () => {
    setCoord(null);
    setActif(false);
    setMsg("");
  };

  // Mode actif : curseur en croix, un clic donne la position, Échap annule
  useEffect(() => {
    const carte = mapRef.current;
    if (!actif || !carte) return;
    carte.getContainer().style.cursor = "crosshair";

    const clic = (e: L.LeafletMouseEvent) => {
      const z = zoneRef.current;
      setCoord({ lat: e.latlng.lat, lon: e.latlng.lng });
      setLieu({ region: z.region ?? "", district: z.district ?? "", commune: z.commune ?? "", fokontany: "" });
      setNom("");
      setOptIdx(0);
      setMsg("");
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };

    carte.on("click", clic);
    window.addEventListener("keydown", touche);
    return () => {
      carte.off("click", clic);
      window.removeEventListener("keydown", touche);
      carte.getContainer().style.cursor = "";
    };
  }, [actif, mapRef]);

  // Repère sur la carte à l'endroit choisi
  useEffect(() => {
    const carte = mapRef.current;
    if (!carte || !coord) return;
    const repere = L.circleMarker([coord.lat, coord.lon], {
      radius: 7, color: "#fff", weight: 2, fillColor: "#e11d48", fillOpacity: 1,
    }).addTo(carte);
    return () => {
      repere.remove();
    };
  }, [coord, mapRef]);

  const enregistrer = async () => {
    const opt = OPTIONS[domaine][optIdx];
    if (!coord || !opt || !nom.trim()) {
      setMsg("Renseignez au moins le nom.");
      return;
    }
    setEnCours(true);
    setMsg("");
    try {
      const r = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-code-ajout": code },
        body: JSON.stringify({
          domaine,
          nom: `${opt.prefixe} ${nom.trim()}`,
          amenity: opt.amenity,
          lat: coord.lat,
          lon: coord.lon,
          adm1_name: lieu.region,
          adm2_name: lieu.district,
          adm3_name: lieu.commune,
          adm4_name: lieu.fokontany,
        }),
      });
      if (r.status === 401) {
        setMsg("Code d'ajout incorrect.");
        return;
      }
      if (!r.ok) {
        const corps = await r.json().catch(() => ({} as any));
        const causes: Record<string, string> = {
          config: "Variables Vercel manquantes : GITHUB_TOKEN, GITHUB_REPO ou CODE_AJOUT.",
          lecture: "GitHub ne trouve pas le fichier : vérifiez GITHUB_REPO et le chemin du fichier.",
          "lecture-contenu": "Impossible de lire le contenu du fichier GeoJSON.",
          ecriture: "GitHub refuse l'écriture : le jeton doit avoir la permission Contents en lecture et écriture.",
          conflit: "Un autre enregistrement a eu lieu en même temps. Réessayez.",
          champs: "Un champ obligatoire manque (nom ou type).",
          position: "La position sur la carte n'est pas valide.",
        };
        setMsg(causes[corps.erreur] ?? `Erreur ${r.status} : la route /api/points ne répond pas. Vérifiez que api/points.ts est à la racine du projet.`);
        return;
      }
      sessionStorage.setItem("code-ajout", code);
      window.dispatchEvent(new Event("points-maj"));
      setStatut("Point enregistré. Il apparaîtra après la mise à jour du site (1 à 2 minutes).");
      setTimeout(() => setStatut(""), 8000);
      fermer();
    } catch {
      setMsg("Connexion impossible.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <>
      <style>{STYLE}</style>

      <button
        type="button"
        className={`maj-btn${actif ? " actif" : ""}`}
        aria-pressed={actif}
        onClick={() => (actif ? fermer() : setActif(true))}
      >
        {actif ? "Arrêter l'ajout" : "+ Ajouter un point"}
      </button>
      {statut && <span className="maj-statut" role="status">{statut}</span>}

      {actif && !coord && (
        <div className="maj-bandeau" role="status">
          Cliquez sur la carte à l'endroit du point · Échap pour arrêter
        </div>
      )}

      {coord && (
        <div
          className="maj-ov"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fermer();
          }}
        >
          <div className="maj-modal" role="dialog" aria-modal="true" aria-label="Nouveau point">
            <header className="maj-h">
              <h3>Nouveau point</h3>
              <button type="button" className="maj-x" onClick={fermer} aria-label="Fermer">×</button>
            </header>

            <div className="maj-seg">
              {(["sante", "education"] as Domaine[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={domaine === d}
                  onClick={() => {
                    setDomaine(d);
                    setOptIdx(0);
                  }}
                >
                  {TITRE[d]}
                </button>
              ))}
            </div>

            <form
              className="maj-corps"
              onSubmit={(e) => {
                e.preventDefault();
                enregistrer();
              }}
            >
              <p className="maj-coord">
                Position : {coord.lat.toFixed(5)}, {coord.lon.toFixed(5)}
              </p>

              <label>
                Type
                <select value={optIdx} onChange={(e) => setOptIdx(Number(e.target.value))}>
                  {OPTIONS[domaine].map((o, i) => (
                    <option key={o.label} value={i}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Nom
                <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Ranohira Ville" required />
              </label>

              <div className="maj-grille">
                {(Object.keys(LIBELLE_LIEU) as (keyof typeof LIBELLE_LIEU)[]).map((k) => (
                  <label key={k}>
                    {LIBELLE_LIEU[k]}
                    <input value={lieu[k]} onChange={(e) => setLieu({ ...lieu, [k]: e.target.value })} />
                  </label>
                ))}
              </div>

              <label>
                Code d'ajout
                <input type="password" value={code} onChange={(e) => setCode(e.target.value)} required />
              </label>

              {msg && <p className="maj-msg" role="alert">{msg}</p>}

              <div className="maj-actions">
                <button type="button" className="maj-sec" onClick={fermer}>Annuler</button>
                <button type="submit" className="maj-primary" disabled={enCours}>
                  {enCours ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
