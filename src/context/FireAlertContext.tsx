import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext";
import { DATA, PROP, useGeo, toZones, inZone, sameArea, parseFires } from "../lib/fireGeo";

const alertTxt: Record<string, Record<string, string>> = {
  fr: {
    title: "Alerte feux", sub: "Feux actifs détectés depuis moins de 24 h", inAp: "dans l'AP", perShort: "périphérie 5 km",
    last: "dernière détection il y a", view: "Voir sur la carte", close: "Fermer", unit: "feux",
    communes: "Communes concernées", noCommune: "Commune non identifiée", noAlert: "Aucun feu actif détecté ces dernières 24 h.",
  },
  en: {
    title: "Fire alert", sub: "Active fires detected less than 24 h ago", inAp: "inside the PA", perShort: "5 km periphery",
    last: "last detection", view: "View on map", close: "Close", unit: "fires",
    communes: "Affected communes", noCommune: "Commune not identified", noAlert: "No active fire detected in the last 24 h.",
  },
  mg: {
    title: "Fampitandremana doro", sub: "Misy doro mavitrika hita tao anatin'ny 24 ora latsaka", inAp: "ao anatin'ny AP", perShort: "manodidina 5 km",
    last: "fanamarihana farany", view: "Jereo amin'ny sarintany", close: "Hidio", unit: "doro",
    communes: "Kaominina voakasika", noCommune: "Kaominina tsy voamarina", noAlert: "Tsy misy doro mavitrika tao anatin'ny 24 ora latsaka.",
  },
  de: {
    title: "Brandalarm", sub: "Aktive Brände wurden vor weniger als 24 h erkannt", inAp: "im Schutzgebiet", perShort: "5-km-Umfeld",
    last: "letzte Erkennung vor", view: "Auf der Karte zeigen", close: "Schließen", unit: "Brände",
    communes: "Betroffene Gemeinden", noCommune: "Gemeinde nicht zugeordnet", noAlert: "Keine aktiven Brände in den letzten 24 h.",
  },
};

export type CommuneAlerte = { commune: string; dedans: number; peri: number; total: number };
export type Alerte = { ap: string; dedans: number; peri: number; ids: string[]; recent: number; communes: CommuneAlerte[] };

type Ctx = {
  alertes: Alerte[];
  nbAlertes: number;
  firesRaw: any[];
  firesErr: boolean;
  now: number;
  loadFires: () => Promise<void>;
  ouvrirAlertes: () => void;
};

const FireAlertCtx = createContext<Ctx | null>(null);

export const useFireAlerts = () => {
  const c = useContext(FireAlertCtx);
  if (!c) throw new Error("useFireAlerts doit être utilisé dans FireAlertProvider");
  return c;
};

const agoTxt = (h: number) =>
  h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

const CSS_ALERTE = `
@keyframes fxPulse{50%{box-shadow:0 0 0 6px rgba(239,68,68,.22)}}
.fx-ov{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:16px;background:rgba(10,15,25,.6);backdrop-filter:blur(2px)}
.fx-alert{width:min(540px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--surface);color:var(--text);border:1px solid var(--border);border-top:5px solid #dc2626;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.45);overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.fx-al-h{display:flex;align-items:center;gap:12px;padding:16px 16px 10px}
.fx-al-h h2{margin:0;font-size:18px;color:#dc2626}
.fx-al-h p{margin:2px 0 0;font-size:12.5px;color:var(--text-2)}
.fx-al-ico{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#dc2626,#f97316);font-size:20px}
.fx-al-l{list-style:none;margin:0;padding:6px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.fx-al-l li{padding:10px 12px;border-radius:10px;background:var(--surface-3);border:1px solid var(--border-soft)}
.fx-al-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.fx-al-t{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12.5px}
.fx-al-t strong{font-size:14px}
.fx-al-t small{color:var(--text-3)}
.fx-al-tog{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;margin-top:4px;padding:0;border:0;background:none;color:#0b4ea2;font-size:12px;font-weight:700;cursor:pointer}
.fx-al-tog:hover{text-decoration:underline}
.fx-al-tog span{display:inline-block;transition:transform .15s}
.fx-al-tog[aria-expanded="true"] span{transform:rotate(90deg)}
.fx-al-cl{list-style:none;margin:8px 0 0;padding:8px 0 0;border-top:1px dashed var(--border);display:flex;flex-direction:column;gap:5px}
.fx-al-cl li{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0;background:none;border:0;font-size:12.5px}
.fx-al-cl small{color:var(--text-3);font-size:11px;white-space:nowrap}
.fx-al-cl b{color:#dc2626;white-space:nowrap}
.fx-al-go{flex:none;padding:7px 12px;border:0;border-radius:8px;background:#0b4ea2;color:#fff;font-weight:700;font-size:12px;cursor:pointer}
.fx-al-go.sec{background:var(--surface-3);color:var(--text);border:1px solid var(--border)}
.fx-al-f{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px 14px}
.fx-al-vide{padding:14px 4px;font-size:13px;color:var(--text-2);text-align:center}
@media(max-width:480px){.fx-al-row{flex-direction:column;align-items:stretch}}
`;

export function FireAlertProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = alertTxt[lang] ?? alertTxt.fr;

  const [airesF] = useGeo(DATA.aires);
  const [periphF] = useGeo(DATA.peripheries);
  const [communesF] = useGeo(DATA.communesGeo);
  const aires = useMemo(() => toZones(airesF, PROP.ap, ""), [airesF]);
  const periph = useMemo(() => toZones(periphF, PROP.periph, ""), [periphF]);
  const communesZ = useMemo(() => toZones(communesF, PROP.commune, ""), [communesF]);

  const [firesRaw, setFiresRaw] = useState<any[]>([]);
  const [firesErr, setFiresErr] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadFires = useCallback(async () => {
    try {
      setFiresErr(false);
      const r = await fetch(DATA.firms);
      if (!r.ok) throw new Error("FIRMS");
      const j = await r.json();
      setFiresRaw(Array.isArray(j.features) ? j.features : []);
    } catch {
      setFiresErr(true);
    }
  }, []);

  useEffect(() => {
    loadFires();
    const a = setInterval(loadFires, 15 * 60 * 1000);
    const b = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [loadFires]);

  // Feux < 24 h situés dans l'AP ou dans sa périphérie de 5 km, regroupés par AP puis par commune
  const alertes = useMemo<Alerte[]>(() => {
    const recents = parseFires(firesRaw)
      .map((f) => ({ ...f, age: (now - f.t) / 3.6e6, id: `${f.lon},${f.lat},${f.t}` }))
      .filter((f) => f.age <= 24 && f.age >= -1);
    if (!recents.length) return [];

    const noms = Array.from(new Set(aires.map((z) => z.nom).filter(Boolean)));
    return noms
      .map((n): Alerte | null => {
        const zin = aires.filter((z) => z.nom === n);
        const zper = periph.filter((p) => sameArea(p.nom, n));
        const communesAp = communesZ.filter((c) => sameArea(c.feature.properties?.[PROP.communeAp], n));
        const pool = communesAp.length ? communesAp : communesZ;

        const parCommune = new Map<string, CommuneAlerte>();
        const ids: string[] = [];
        let dedans = 0, peri = 0, recent = Infinity;

        for (const f of recents) {
          const dans = zin.some((z) => inZone(f.lon, f.lat, z));
          const autour = !dans && zper.some((z) => inZone(f.lon, f.lat, z));
          if (!dans && !autour) continue;

          const c = pool.find((z) => inZone(f.lon, f.lat, z));
          const nom = c ? String(c.nom) : "";
          const ligne = parCommune.get(nom) ?? { commune: nom, dedans: 0, peri: 0, total: 0 };
          if (dans) {
            ligne.dedans++;
            dedans++;
          } else {
            ligne.peri++;
            peri++;
          }
          ligne.total++;
          parCommune.set(nom, ligne);

          ids.push(f.id);
          recent = Math.min(recent, f.age);
        }

        if (!ids.length) return null;
        return {
          ap: n,
          dedans,
          peri,
          ids,
          recent,
          communes: [...parCommune.values()].sort((a, b) => b.total - a.total),
        };
      })
      .filter((a): a is Alerte => a !== null)
      .sort((a, b) => b.dedans - a.dedans || b.peri - a.peri);
  }, [firesRaw, now, aires, periph, communesZ]);

  const nbAlertes = alertes.reduce((s, a) => s + a.ids.length, 0);

  // Feux déjà vus : gardés dans le contexte, donc pas de pop-up répété à chaque page
  const vus = useRef<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  // AP dont la liste des communes est dépliée (repliée par défaut)
  const [depliees, setDepliees] = useState<Record<string, boolean>>({});
  const basculer = (ap: string) => setDepliees((d) => ({ ...d, [ap]: !d[ap] }));

  useEffect(() => {
    if (alertes.some((a) => a.ids.some((id) => !vus.current.has(id)))) setOpen(true);
  }, [alertes]);

  const fermer = useCallback(() => {
    alertes.forEach((a) => a.ids.forEach((id) => vus.current.add(id)));
    setOpen(false);
  }, [alertes]);

  const voir = (nom: string) => {
    navigate("/dashboard/analyse-feux", { state: { module: "environnement", ap: nom, hours: 24 } });
    fermer();
  };

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, fermer]);

  const value: Ctx = {
    alertes,
    nbAlertes,
    firesRaw,
    firesErr,
    now,
    loadFires,
    ouvrirAlertes: () => setOpen(true),
  };

  return (
    <FireAlertCtx.Provider value={value}>
      <style>{CSS_ALERTE}</style>
      {children}

      {open && (
        <div
          className="fx-ov"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fermer();
          }}
        >
          <div className="fx-alert" role="alertdialog" aria-modal="true" aria-labelledby="fx-al-t">
            <div className="fx-al-h">
              <span className="fx-al-ico" aria-hidden="true">🔥</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="fx-al-t">{t.title}</h2>
                <p>{t.sub}</p>
              </div>
            </div>

            {alertes.length === 0 ? (
              <div className="fx-al-vide">{t.noAlert}</div>
            ) : (
              <ul className="fx-al-l">
                {alertes.map((a) => {
                  const ouvert = !!depliees[a.ap];
                  return (
                    <li key={a.ap}>
                      <div className="fx-al-row">
                        <div className="fx-al-t">
                          <strong>{a.ap}</strong>
                          <span>
                            {a.dedans > 0 && (
                              <b style={{ color: "#dc2626" }}>
                                {a.dedans} {t.unit} {t.inAp}
                              </b>
                            )}
                            {a.dedans > 0 && a.peri > 0 && " · "}
                            {a.peri > 0 && (
                              <>
                                {a.peri} {t.unit} {t.perShort}
                              </>
                            )}
                          </span>
                          <small>
                            {t.last} {agoTxt(a.recent)}
                          </small>
                          <button
                            type="button"
                            className="fx-al-tog"
                            onClick={() => basculer(a.ap)}
                            aria-expanded={ouvert}
                          >
                            {t.communes} <span aria-hidden="true">›</span>
                          </button>
                        </div>
                        <button type="button" className="fx-al-go" onClick={() => voir(a.ap)}>
                          {t.view}
                        </button>
                      </div>

                      {ouvert && (
                        <ul className="fx-al-cl">
                          {a.communes.map((c) => (
                            <li key={c.commune || "?"}>
                              <span>{c.commune || t.noCommune}</span>
                              <span>
                                <b>
                                  {c.total} {t.unit}
                                </b>{" "}
                                <small>
                                  ({c.dedans > 0 && `${c.dedans} ${t.inAp}`}
                                  {c.dedans > 0 && c.peri > 0 && " · "}
                                  {c.peri > 0 && `${c.peri} ${t.perShort}`})
                                </small>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="fx-al-f">
              <button type="button" className="fx-al-go sec" onClick={fermer}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </FireAlertCtx.Provider>
  );
}
