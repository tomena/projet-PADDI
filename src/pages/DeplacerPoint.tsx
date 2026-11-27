// src/pages/DeplacerPoint.tsx — version 2
// 1. Bouton visible « Déplacer un point » dans la barre de la carte.
// 2. Mode « choisir » : un clic sur un point (santé ou éducation) lance le déplacement.
// 3. Le bouton « Déplacer ce point » reste disponible dans la fenêtre de chaque point.
// 4. Cliquer sur le nouvel emplacement, vérifier, puis enregistrer.
// Ne modifie pas localisation.ts ni education.ts.
import { useEffect, useState } from "react";
import L from "leaflet";
import { chargerLocalisation } from "../lib/localisation";
import { chargerEducation } from "../lib/education";

type Domaine = "sante" | "education";
type Cible = { domaine: Domaine; nom: string; ancienLat: number; ancienLon: number };
type Props = { mapRef: { current: L.Map | null } };

const TOLERANCE = 1e-6;

const MESSAGES: Record<string, string> = {
  code: "Code d'ajout incorrect.",
  introuvable: "Point introuvable dans le fichier. Il a peut-être déjà été déplacé : réessayez après la mise à jour du site.",
  ambigu: "Plusieurs points identiques existent à cet endroit : aucun changement n'a été fait. Signalez-le à l'administrateur.",
  "hors-mada": "La nouvelle position est en dehors de Madagascar.",
  champs: "Des informations manquent pour le déplacement.",
  conflit: "Un autre enregistrement a eu lieu en même temps. Réessayez.",
  ecriture: "GitHub refuse l'écriture. Vérifiez les permissions du jeton.",
  lecture: "GitHub ne trouve pas le fichier. Vérifiez la configuration.",
  config: "Variables Vercel manquantes : GITHUB_TOKEN, GITHUB_REPO ou CODE_AJOUT.",
};

const STYLE = `
.dp-btn{padding:6px 11px;border-radius:9px;border:1px solid #0f766e;background:var(--surface,#fff);color:#0f766e;font:600 13px system-ui,sans-serif;cursor:pointer}
.dp-btn.actif{background:#0f766e;color:#fff}
.dp-bandeau{position:fixed;z-index:1100;left:50%;top:12px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:7px 12px;border-radius:9px;font:12.5px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none}
.dp-statut{font:600 12px system-ui,sans-serif;color:#0f766e}
.dp-panel{position:fixed;z-index:5000;left:50%;bottom:20px;transform:translateX(-50%);width:min(420px,calc(100% - 32px));background:var(--surface,#fff);color:var(--text,#1c2822);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:14px 16px;font:13px system-ui,sans-serif;display:flex;flex-direction:column;gap:8px}
.dp-panel strong{font-size:14px}
.dp-panel p{margin:0;line-height:1.5}
.dp-aide{font-size:12px;color:var(--text-3,#6b7770)}
.dp-panel label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:12px}
.dp-panel input{padding:8px 9px;border-radius:8px;border:1px solid var(--border,#d8d4c8);background:var(--surface-2,#f7f6f2);color:inherit;font:400 13px system-ui,sans-serif}
.dp-msg{padding:8px 10px;border-radius:8px;background:rgba(190,18,60,.1);color:#be123c;font-weight:600}
.dp-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
.dp-sec{padding:9px 13px;border-radius:9px;border:1px solid var(--border,#d8d4c8);background:transparent;color:inherit;font:600 13px system-ui,sans-serif;cursor:pointer}
.dp-primary{padding:9px 13px;border-radius:9px;border:0;background:#0f766e;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer}
.dp-primary:disabled{opacity:.5;cursor:default}
.dp-tip{background:#0f766e!important;color:#fff!important;border:0!important;font-weight:600}
`;

const normNom = (s: string) => s.replace(/\s+/g, " ").trim();

/** Retrouve le domaine (santé ou éducation) d'un point d'après son nom complet et sa position. */
async function trouverDomaine(nom: string, lat: number, lon: number): Promise<Domaine | null> {
  const [sante, edu] = await Promise.all([
    chargerLocalisation().catch(() => []),
    chargerEducation().catch(() => []),
  ]);
  const correspond = (p: { nomComplet: string; lat: number; lon: number }) =>
    normNom(p.nomComplet) === nom && Math.abs(p.lat - lat) < TOLERANCE && Math.abs(p.lon - lon) < TOLERANCE;
  if (sante.some(correspond)) return "sante";
  if (edu.some(correspond)) return "education";
  return null;
}

export default function DeplacerPoint({ mapRef }: Props) {
  const [choix, setChoix] = useState(false);
  const [cible, setCible] = useState<Cible | null>(null);
  const [nouvelle, setNouvelle] = useState<{ lat: number; lon: number } | null>(null);
  const [code, setCode] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem("code-ajout") ?? "" : "",
  );
  const [msg, setMsg] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [statut, setStatut] = useState("");

  const notifier = (texte: string) => {
    setStatut(texte);
    setTimeout(() => setStatut(""), 8000);
  };

  const annuler = () => {
    setChoix(false);
    setCible(null);
    setNouvelle(null);
    setMsg("");
  };

  // Un point choisi (par clic dans la carte ou dans sa fenêtre) passe en mode déplacement
  const choisir = async (titre: string, lat: number, lng: number) => {
    const nom = normNom(titre);
    const domaine = await trouverDomaine(nom, lat, lng);
    setChoix(false);
    if (!domaine) {
      notifier("Point introuvable dans les données chargées. Rechargez la page et réessayez.");
      return;
    }
    setMsg("");
    setCible({ domaine, nom, ancienLat: lat, ancienLon: lng });
  };

  // 1. Popups : en mode « choisir », la fenêtre se ferme et le point est choisi.
  //    Sinon, le bouton « Déplacer ce point » est ajouté dans la fenêtre.
  useEffect(() => {
    const carte = mapRef.current;
    if (!carte) return;

    const surOuverture = (e: L.PopupEvent) => {
      const titre = (e.popup as any)._source?.options?.title as string | undefined;
      const ll = e.popup.getLatLng();
      if (!titre || !ll) return;

      if (choix) {
        carte.closePopup();
        choisir(titre, ll.lat, ll.lng);
        return;
      }

      const contenu = e.popup.getElement()?.querySelector<HTMLElement>(".leaflet-popup-content");
      if (!contenu || contenu.querySelector("[data-deplacer]")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.deplacer = "1";
      btn.textContent = "Déplacer ce point";
      btn.style.cssText =
        "margin-top:8px;padding:5px 9px;border-radius:7px;border:1px solid #0f766e;background:#0f766e;color:#fff;font:600 12px system-ui,sans-serif;cursor:pointer";
      btn.addEventListener("click", () => {
        carte.closePopup();
        choisir(titre, ll.lat, ll.lng);
      });
      contenu.appendChild(btn);
    };

    carte.on("popupopen", surOuverture);
    return () => {
      carte.off("popupopen", surOuverture);
    };
    // choisir change à chaque rendu mais ne dépend que des setters et de mapRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, choix]);

  // 2. Mode « choisir » : Échap annule
  useEffect(() => {
    if (!choix) return;
    const carte = mapRef.current;
    if (carte) carte.getContainer().style.cursor = "pointer";
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChoix(false);
    };
    window.addEventListener("keydown", touche);
    return () => {
      window.removeEventListener("keydown", touche);
      if (carte) carte.getContainer().style.cursor = "";
    };
  }, [choix, mapRef]);

  // 3. Mode « nouvel emplacement » : curseur en croix, clic = nouvelle position, Échap = annuler
  useEffect(() => {
    const carte = mapRef.current;
    if (!carte || !cible) return;
    carte.getContainer().style.cursor = "crosshair";

    const clic = (e: L.LeafletMouseEvent) => setNouvelle({ lat: e.latlng.lat, lon: e.latlng.lng });
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") annuler();
    };

    carte.on("click", clic);
    window.addEventListener("keydown", touche);
    return () => {
      carte.off("click", clic);
      window.removeEventListener("keydown", touche);
      carte.getContainer().style.cursor = "";
    };
  }, [cible, mapRef]);

  // 4. Repères : ancienne position (pointillés rouges), nouvelle (pastille verte)
  useEffect(() => {
    const carte = mapRef.current;
    if (!carte || !cible) return;
    const ancien = L.circleMarker([cible.ancienLat, cible.ancienLon], {
      radius: 10, color: "#dc2626", weight: 2, dashArray: "3 3", fill: false,
    }).addTo(carte);
    return () => {
      ancien.remove();
    };
  }, [cible, mapRef]);

  useEffect(() => {
    const carte = mapRef.current;
    if (!carte || !nouvelle) return;
    const repere = L.circleMarker([nouvelle.lat, nouvelle.lon], {
      radius: 8, color: "#fff", weight: 2, fillColor: "#0f766e", fillOpacity: 1,
    }).addTo(carte);
    return () => {
      repere.remove();
    };
  }, [nouvelle, mapRef]);

  // 5. Enregistrement
  const enregistrer = async () => {
    if (!cible || !nouvelle) return;
    if (!code.trim()) {
      setMsg("Saisissez le code d'ajout.");
      return;
    }
    setEnCours(true);
    setMsg("");
    try {
      const r = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-code-ajout": code },
        body: JSON.stringify({
          action: "deplacer",
          domaine: cible.domaine,
          nom: cible.nom,
          ancienLat: cible.ancienLat,
          ancienLon: cible.ancienLon,
          lat: nouvelle.lat,
          lon: nouvelle.lon,
        }),
      });
      if (!r.ok) {
        const corps = await r.json().catch(() => ({} as any));
        setMsg(MESSAGES[corps.erreur] ?? `Erreur ${r.status}.`);
        return;
      }
      sessionStorage.setItem("code-ajout", code);
      notifier("Point déplacé. Le nouvel emplacement apparaîtra après la mise à jour du site (1 à 2 minutes).");
      annuler();
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
        className={`dp-btn${choix ? " actif" : ""}`}
        aria-pressed={choix}
        onClick={() => {
          setMsg("");
          if (cible) annuler();
          else setChoix((v) => !v);
        }}
      >
        {choix || cible ? "Arrêter" : "↔ Déplacer un point"}
      </button>

      {statut && <span className="dp-statut" role="status">{statut}</span>}

      {choix && !cible && (
        <div className="dp-bandeau" role="status">
          Cliquez sur le point à déplacer · Échap pour arrêter
        </div>
      )}

      {cible && !nouvelle && (
        <div className="dp-bandeau" role="status">
          Cliquez sur le nouvel emplacement de « {cible.nom} » · Échap pour annuler
        </div>
      )}

      {cible && nouvelle && (
        <div className="dp-panel" role="dialog" aria-label="Déplacer le point">
          <strong>Déplacer « {cible.nom} »</strong>
          <p>
            Ancienne position : {cible.ancienLat.toFixed(5)}, {cible.ancienLon.toFixed(5)}
            <br />
            Nouvelle position : {nouvelle.lat.toFixed(5)}, {nouvelle.lon.toFixed(5)}
          </p>
          <p className="dp-aide">Cliquez à nouveau sur la carte pour corriger la position.</p>
          <label>
            Code d'ajout
            <input type="password" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {msg && <p className="dp-msg" role="alert">{msg}</p>}
          <div className="dp-actions">
            <button type="button" className="dp-sec" onClick={annuler}>Annuler</button>
            <button type="button" className="dp-primary" onClick={enregistrer} disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer le déplacement"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
