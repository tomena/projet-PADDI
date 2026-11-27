// src/pages/MiseAJour.tsx — version 3
// Bouton « + Ajouter un point » sur la carte. Il propose deux façons d'indiquer l'emplacement :
//  - Cliquer sur la carte : un clic donne la position, la fenêtre de saisie s'ouvre à droite.
//  - Saisir les coordonnées : latitude et longitude tapées à la main, puis « Placer sur la carte »
//    pour vérifier l'emplacement avant d'enregistrer.
// La fenêtre est à droite pour laisser la carte visible. Échap ou Annuler arrête l'ajout.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

type Domaine = "sante" | "education";
type Option = { label: string; prefixe: string; amenity: string };
type Zone = { region: string | null; district: string | null; commune: string | null };
type Props = { mapRef: { current: L.Map | null }; zone: Zone };
type Mode = "clic" | "saisie";

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

// Même emprise que la carte, pour refuser les coordonnées hors de Madagascar
const MADA = { lonMin: 43.0, lonMax: 50.7, latMin: -25.9, latMax: -11.8 };

const lireNombre = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

const dansMada = (lat: number, lon: number) =>
  lat >= MADA.latMin && lat <= MADA.latMax && lon >= MADA.lonMin && lon <= MADA.lonMax;

const STYLE = `
.maj-btn{padding:6px 11px;border-radius:9px;border:1px solid #0f766e;background:#0f766e;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-btn.actif{background:#fff;color:#0f766e}
.maj-statut{font:600 12px system-ui,sans-serif;color:#0f766e}
.maj-bandeau{position:fixed;z-index:1100;left:50%;top:12px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:7px 12px;border-radius:9px;font:12.5px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none}
.maj-ov{position:fixed;inset:0;z-index:5000;display:flex;justify-content:flex-end;align-items:center;padding:16px;pointer-events:none}
.maj-modal{width:min(440px,100%);max-height:92dvh;overflow-y:auto;background:var(--surface,#fff);color:var(--text,#1c2822);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);font:13px system-ui,sans-serif;pointer-events:auto}
.maj-choix{width:min(340px,100%);background:var(--surface,#fff);color:var(--text,#1c2822);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);font:13px system-ui,sans-serif;padding:16px;display:flex;flex-direction:column;gap:10px;pointer-events:auto}
.maj-choix h3{margin:0;font-size:16px}
.maj-choix p{margin:0;color:var(--text-3,#6b7770)}
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
.maj-aide{font-size:12px;color:var(--text-3,#6b7770);margin:0;line-height:1.45}
.maj-ok{font-size:12px;color:#0f766e;font-weight:600;margin:0}
.maj-primary{padding:10px 14px;border-radius:9px;border:0;background:#0f766e;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-primary:disabled{opacity:.5;cursor:default}
.maj-sec{padding:10px 14px;border-radius:9px;border:1px solid var(--border,#d8d4c8);background:transparent;color:inherit;font:600 13px system-ui,sans-serif;cursor:pointer}
.maj-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
.maj-msg{margin:0;padding:8px 10px;border-radius:8px;background:rgba(190,18,60,.1);color:#be123c;font-weight:600}
@media (max-width:520px){
  .maj-ov{justify-content:center}
  .maj-grille{grid-template-columns:1fr}
}
`;

export default function MiseAJour({ mapRef, zone }: Props) {
  const [choix, setChoix] = useState(false);        // fenêtre « comment indiquer l'emplacement ? »
  const [mode, setMode] = useState<Mode>("clic");
  const [attente, setAttente] = useState(false);    // mode clic : en attente d'un clic sur la carte
  const [ouvert, setOuvert] = useState(false);      // fenêtre de saisie affichée
  const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [latTxt, setLatTxt] = useState("");
  const [lonTxt, setLonTxt] = useState("");
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

  // La zone choisie au moment de l'ouverture sert à pré-remplir la fenêtre
  const zoneRef = useRef(zone);
  zoneRef.current = zone;

  const fermer = () => {
    setChoix(false);
    setAttente(false);
    setOuvert(false);
    setCoord(null);
    setLatTxt("");
    setLonTxt("");
    setMsg("");
  };

  const ouvrirFenetre = (c: { lat: number; lon: number } | null) => {
    const z = zoneRef.current;
    setLieu({ region: z.region ?? "", district: z.district ?? "", commune: z.commune ?? "", fokontany: "" });
    setNom("");
    setOptIdx(0);
    setMsg("");
    setCoord(c);
    setLatTxt(c ? c.lat.toFixed(5) : "");
    setLonTxt(c ? c.lon.toFixed(5) : "");
    setOuvert(true);
    setAttente(false);
    setChoix(false);
  };

  // Mode clic : actif en attente du clic, puis pendant que la fenêtre est ouverte (pour corriger la position)
  const cliqueActif = mode === "clic" && (attente || ouvert);

  useEffect(() => {
    const carte = mapRef.current;
    if (!cliqueActif || !carte) return;
    carte.getContainer().style.cursor = "crosshair";

    const clic = (e: L.LeafletMouseEvent) => {
      const c = { lat: e.latlng.lat, lon: e.latlng.lng };
      if (ouvert) {
        setCoord(c);
        setLatTxt(c.lat.toFixed(5));
        setLonTxt(c.lon.toFixed(5));
        setMsg("");
      } else {
        ouvrirFenetre(c);
      }
    };
    carte.on("click", clic);
    return () => {
      carte.off("click", clic);
      carte.getContainer().style.cursor = "";
    };
    // ouvrirFenetre ne dépend que de setters et de zoneRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliqueActif, ouvert, mapRef]);

  // Échap arrête l'ajout
  useEffect(() => {
    if (!choix && !attente && !ouvert) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [choix, attente, ouvert]);

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

  // Saisie : vérifie les coordonnées puis place le repère et centre la carte
  const placerSurCarte = () => {
    const lat = lireNombre(latTxt), lon = lireNombre(lonTxt);
    if (lat === null || lon === null) {
      setMsg("Latitude et longitude doivent être des nombres, par exemple -22.61500 et 46.65800.");
      return;
    }
    if (!dansMada(lat, lon)) {
      setMsg("Ces coordonnées sont en dehors de Madagascar. Vérifiez qu'elles ne sont pas inversées : la latitude est négative (environ -11 à -26).");
      return;
    }
    setMsg("");
    setCoord({ lat, lon });
    const carte = mapRef.current;
    if (carte) carte.flyTo([lat, lon], Math.max(carte.getZoom(), 16), { duration: 1 });
  };

  // Position à enregistrer : celle du clic, ou celle tapée à la main
  const obtenirPosition = (): { lat: number; lon: number } | null => {
    if (mode === "clic") {
      if (!coord) {
        setMsg("Cliquez sur la carte pour choisir l'emplacement.");
        return null;
      }
      return coord;
    }
    const lat = lireNombre(latTxt), lon = lireNombre(lonTxt);
    if (lat === null || lon === null) {
      setMsg("Latitude et longitude doivent être des nombres.");
      return null;
    }
    if (!dansMada(lat, lon)) {
      setMsg("Position en dehors de Madagascar. Vérifiez la latitude (négative) et la longitude.");
      return null;
    }
    return { lat, lon };
  };

  const enregistrer = async () => {
    const opt = OPTIONS[domaine][optIdx];
    if (!opt || !nom.trim()) {
      setMsg("Renseignez au moins le nom.");
      return;
    }
    const pos = obtenirPosition();
    if (!pos) return;

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
          lat: pos.lat,
          lon: pos.lon,
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
          "hors-mada": "La position est en dehors de Madagascar.",
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

  const actif = choix || attente || ouvert;

  return (
    <>
      <style>{STYLE}</style>

      <button
        type="button"
        className={`maj-btn${actif ? " actif" : ""}`}
        aria-pressed={actif}
        onClick={() => (actif ? fermer() : setChoix(true))}
      >
        {actif ? "Arrêter l'ajout" : "+ Ajouter un point"}
      </button>
      {statut && <span className="maj-statut" role="status">{statut}</span>}

      {attente && !ouvert && (
        <div className="maj-bandeau" role="status">
          Cliquez sur la carte à l'endroit du point · Échap pour arrêter
        </div>
      )}

      {/* Choix du mode */}
      {choix && (
        <div className="maj-ov">
          <div className="maj-choix" role="dialog" aria-label="Ajouter un point">
            <h3>Ajouter un point</h3>
            <p>Comment indiquer l'emplacement ?</p>
            <button
              type="button"
              className="maj-primary"
              onClick={() => {
                setMode("clic");
                setChoix(false);
                setAttente(true);
              }}
            >
              Cliquer sur la carte
            </button>
            <button type="button" className="maj-primary" onClick={() => { setMode("saisie"); ouvrirFenetre(null); }}>
              Saisir les coordonnées
            </button>
            <button type="button" className="maj-sec" onClick={fermer}>Annuler</button>
          </div>
        </div>
      )}

      {/* Fenêtre de saisie du point */}
      {ouvert && (
        <div className="maj-ov">
          <div className="maj-modal" role="dialog" aria-label="Nouveau point">
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
              {mode === "clic" ? (
                <p className="maj-coord">
                  {coord
                    ? `Position : ${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)} (cliquez ailleurs sur la carte pour corriger)`
                    : "Cliquez sur la carte pour choisir l'emplacement."}
                </p>
              ) : (
                <>
                  <div className="maj-grille">
                    <label>
                      Latitude
                      <input
                        inputMode="decimal"
                        value={latTxt}
                        onChange={(e) => setLatTxt(e.target.value)}
                        placeholder="-22.61500"
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        inputMode="decimal"
                        value={lonTxt}
                        onChange={(e) => setLonTxt(e.target.value)}
                        placeholder="46.65800"
                      />
                    </label>
                  </div>
                  <p className="maj-aide">
                    La latitude est négative à Madagascar. Vérifiez l'emplacement sur la carte avant d'enregistrer.
                  </p>
                  <div>
                    <button type="button" className="maj-sec" onClick={placerSurCarte}>Placer sur la carte</button>
                  </div>
                  {coord && <p className="maj-ok">Repère placé sur la carte.</p>}
                </>
              )}

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
