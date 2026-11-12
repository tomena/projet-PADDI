import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, Download, Loader2, CloudUpload } from 'lucide-react';
import { convertir, versGeoJSON, serialiser, type Ligne, type Rapport } from './feuxConvert';
import LoginModal from './LoginModal';

/* =====================================================================
   ACCÈS : connexion par votre LoginModal (même session que l'import des coûts).
   Seul l'utilisateur « Toky » (anjarampifohazana.toky@giz.de) est autorisé.
   ⚠️ Ce test côté navigateur n'est qu'une aide : c'est le serveur (update-feux)
   qui vérifie le jeton signé et refuse tout autre compte.

   MODE FUSION : l'utilisateur choisit UNE année et UN ou PLUSIEURS mois.
   - ligne déjà présente (District + AP + Année + Commune + Source) : seuls les mois
     choisis sont modifiés, Total est recalculé ;
   - ligne absente (nouvelle année, nouvelle commune…) : elle est ajoutée ;
   - aucune ligne n'est supprimée.
   La même logique tourne sur le serveur (pour l'enregistrement) et ici (pour l'affichage).
   ===================================================================== */
const UTILISATEUR_AUTORISE = 'Toky';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const cle = (p: any) => [p.District, p.AP, p['Année'], p.Commune, p.Source].join('|');
const somme = (p: any) => MOIS.reduce((s, m) => s + (typeof p[m] === 'number' ? p[m] : 0), 0);

/** Mois pour lesquels l'Excel contient au moins une valeur pour l'année donnée */
const moisAvecDonnees = (lignes: any[], annee: number) =>
  MOIS.filter((m) => lignes.some((l) => Number(l['Année']) === annee && typeof l[m] === 'number'));

/** Même fusion que le serveur. Ne modifie pas les tableaux reçus. */
function fusionner(actuelles: any[], nouvelles: any[], mois: string[]) {
  const res = actuelles.map((p) => ({ ...p }));
  const index = new Map<string, number>();
  res.forEach((p, i) => index.set(cle(p), i));
  let ajoutees = 0, modifiees = 0, identiques = 0;

  for (const nouv of nouvelles) {
    const i = index.get(cle(nouv));
    if (i === undefined) {
      const p: any = { ...nouv };
      for (const m of MOIS) if (!mois.includes(m)) p[m] = null;
      p.Total = somme(p);
      index.set(cle(p), res.push(p) - 1);
      ajoutees++;
    } else {
      const p = res[i];
      let change = false;
      for (const m of mois) {
        const v = nouv[m] ?? null;
        if ((p[m] ?? null) !== v) change = true;
        p[m] = v;
      }
      p.Total = somme(p);
      if (change) modifiees++; else identiques++;
    }
  }
  return { lignes: res, ajoutees, modifiees, identiques };
}

interface Props {
  /** Lignes actuellement affichées (feuxData) : sert à calculer l'aperçu de la fusion */
  current: Ligne[];
  /** Appelé après l'import : met à jour le tableau de bord affiché */
  onApply: (lignes: Ligne[], meta: { fichier: string; derniereAnnee: number | null }) => void;
  /** Route serveur (défaut : /api/update-feux) */
  publishUrl?: string;
}

const nf = (n: number) => n.toLocaleString('fr-FR');

function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/geo+json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nom; a.click();
  URL.revokeObjectURL(url);
}

async function lireExcel(file: File): Promise<{ lignes: Record<string, unknown>[]; feuille: string }> {
  const XLSX = await import('xlsx'); // chargé à la demande : n'alourdit pas la page
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const nomFeuille =
    wb.SheetNames.find((n: string) => n.toLowerCase().replace(/[^a-z]/g, '') === 'basesfeux') ?? wb.SheetNames[0];
  const lignes = XLSX.utils.sheet_to_json(wb.Sheets[nomFeuille], { defval: null, raw: true }) as Record<string, unknown>[];
  return { lignes, feuille: nomFeuille };
}

/* =====================================================================
   COMPOSANT
   ===================================================================== */
export default function ImportFeux({ current, onApply, publishUrl = '/api/update-feux' }: Props) {
  // Session en mémoire : à la fermeture de la page, il faudra se reconnecter.
  const [session, setSession] = useState<{ userName: string; token: string } | null>(null);
  const [login, setLogin] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState('');
  const [feuille, setFeuille] = useState('');
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreurLecture, setErreurLecture] = useState('');
  const [message, setMessage] = useState('');
  const [publication, setPublication] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [annee, setAnnee] = useState<number | null>(null);
  const [mois, setMois] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const reinit = useCallback(() => {
    setFichier(''); setFeuille(''); setRapport(null); setErreurLecture('');
    setMessage(''); setChargement(false); setAnnee(null); setMois([]);
  }, []);
  const fermer = useCallback(() => { setOuvert(false); reinit(); }, [reinit]);

  useEffect(() => {
    if (!ouvert) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fermer();
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [ouvert, fermer]);

  const autorise = session?.userName === UTILISATEUR_AUTORISE;

  // Lignes de l'Excel (déjà validées par convertir)
  const lignesExcel = useMemo(() => (rapport?.lignes ?? []) as any[], [rapport]);
  const anneesExcel = useMemo(
    () => [...new Set(lignesExcel.map((l) => Number(l['Année'])).filter(Number.isInteger))].sort((a, b) => a - b),
    [lignesExcel]
  );
  const anneesBase = useMemo(
    () => new Set((current as any[]).map((l) => Number(l['Année']))),
    [current]
  );
  const lignesAnnee = useMemo(
    () => (annee == null ? [] : lignesExcel.filter((l) => Number(l['Année']) === annee)),
    [lignesExcel, annee]
  );
  const moisDisponibles = useMemo(
    () => (annee == null ? [] : moisAvecDonnees(lignesExcel, annee)),
    [lignesExcel, annee]
  );
  const moisSansDonnees = mois.filter((m) => !moisDisponibles.includes(m));

  // Aperçu exact de ce que donnera la fusion
  const fusion = useMemo(
    () => (annee == null || mois.length === 0 ? null : fusionner(current as any[], lignesAnnee, mois)),
    [current, lignesAnnee, annee, mois]
  );

  const choisirAnnee = (a: number | null, lignes: any[] = lignesExcel) => {
    setAnnee(a);
    setMois(a == null ? [] : moisAvecDonnees(lignes, a));
    setMessage('');
  };
  const basculerMois = (m: string) =>
    setMois((prev) => MOIS.filter((x) => (x === m ? !prev.includes(m) : prev.includes(x))));

  const traiter = async (f?: File | null) => {
    if (!f || !autorise) return;
    reinit();
    if (!/\.(xlsx|xlsm|xls)$/i.test(f.name)) { setErreurLecture('Format non pris en charge : choisissez un fichier Excel (.xlsx).'); return; }
    setFichier(f.name); setChargement(true);
    try {
      const { lignes, feuille: nom } = await lireExcel(f);
      setFeuille(nom);
      const r = convertir(lignes, current);
      setRapport(r);
      // Année proposée par défaut : la plus récente du fichier ; mois : ceux qui ont des valeurs
      const lg = (r.lignes ?? []) as any[];
      const ans = [...new Set(lg.map((l) => Number(l['Année'])).filter(Number.isInteger))].sort((a, b) => a - b);
      if (ans.length) {
        const defaut = ans[ans.length - 1];
        setAnnee(defaut);
        setMois(moisAvecDonnees(lg, defaut));
      }
    } catch (e) {
      console.error(e);
      setErreurLecture("Impossible de lire ce fichier Excel. Vérifiez qu'il n'est pas protégé par mot de passe ni corrompu.");
    } finally { setChargement(false); }
  };

  const bloque =
    !autorise || !rapport || rapport.erreurs.length > 0 ||
    annee == null || mois.length === 0 || lignesAnnee.length === 0;

  const derniereAnneeDe = (lignes: any[]) => {
    const ys = lignes.map((l) => Number(l['Année'])).filter(Number.isInteger);
    return ys.length ? Math.max(...ys) : null;
  };

  const appliquerLocal = () => {
    if (!fusion || bloque) return;
    onApply(fusion.lignes as Ligne[], { fichier, derniereAnnee: derniereAnneeDe(fusion.lignes) });
    setMessage("Aperçu appliqué à votre écran uniquement : le fichier du serveur n'a pas été modifié.");
  };
  const exporter = () => {
    if (!fusion || bloque) return;
    telecharger('Bases_Feux.geojson', serialiser(versGeoJSON(fusion.lignes as Ligne[])));
  };

  // Action principale : fusionne dans public/data/Bases_Feux.geojson sur le serveur
  const publier = async () => {
    if (!fusion || bloque) return;
    setPublication(true); setErreurLecture(''); setMessage('');
    try {
      const res = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Seules les lignes de l'année choisie sont envoyées
        body: JSON.stringify({ token: session?.token, lignes: lignesAnnee, annee, mois }),
      });
      if (!res.ok) {
        let m = '';
        try { m = (await res.json()).error; } catch { /* réponse non JSON */ }
        if (res.status === 401) { setSession(null); setOuvert(false); setLogin(true); }
        throw new Error(m || `HTTP ${res.status}`);
      }
      onApply(fusion.lignes as Ligne[], { fichier, derniereAnnee: derniereAnneeDe(fusion.lignes) });
      setMessage(
        `Base enregistrée (commit GitHub) : ${nf(fusion.modifiees)} ligne(s) modifiée(s), ${nf(fusion.ajoutees)} ajoutée(s). ` +
        "Le tableau de bord affiche déjà les nouvelles données ; pour les autres utilisateurs, c'est visible après le redéploiement du site (1 à 3 minutes)."
      );
    } catch (e: any) {
      setErreurLecture(`Échec de la mise à jour : ${e?.message || 'erreur serveur'}. Le fichier n'a pas été modifié.`);
    } finally { setPublication(false); }
  };

  return (
    <div className="sbi-slot">
      <style>{CSS}</style>
      <button className="sbi-btn" onClick={() => (session ? setOuvert(true) : setLogin(true))}>
        <Upload size={14} /> Importer l'Excel
      </button>

      {login && createPortal(
        <LoginModal
          onClose={() => setLogin(false)}
          onSuccess={(userName, token) => { setSession({ userName, token }); setLogin(false); setOuvert(true); }}
        />,
        document.body
      )}

      {ouvert && createPortal(
        <div className="sbi-fond" onMouseDown={(e) => { if (e.target === e.currentTarget) fermer(); }}>
          <div className="sbi-modal" role="dialog" aria-modal="true" aria-labelledby="sbi-titre">
            <header className="sbi-tete">
              <div>
                <h2 id="sbi-titre">Mettre à jour la base des feux</h2>
                <p>Importez l'Excel, puis choisissez l'<b>année</b> et les <b>mois</b> à mettre à jour. Les autres données de la base ne sont pas touchées.</p>
              </div>
              <button className="sbi-x" onClick={fermer} aria-label="Fermer"><X size={18} /></button>
            </header>

            <div className="sbi-corps">
              {!autorise && (
                <div className="sbi-boite err">
                  <AlertTriangle size={16} />
                  <div><b>Accès refusé</b><br />Connecté en tant que « {session?.userName} ». La mise à jour de la base des feux est réservée à Toky.</div>
                </div>
              )}
              <div
                style={autorise ? undefined : { display: 'none' }}
                className={`sbi-zone ${survol ? 'on' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
                onDragLeave={() => setSurvol(false)}
                onDrop={(e) => { e.preventDefault(); setSurvol(false); traiter(e.dataTransfer.files?.[0]); }}
                onClick={() => inputRef.current?.click()}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls" hidden
                       onChange={(e) => { traiter(e.target.files?.[0]); e.target.value = ''; }} />
                {chargement ? <Loader2 size={26} className="sbi-tourne" /> : <FileSpreadsheet size={26} />}
                <strong>{fichier || 'Déposez votre fichier Excel ici'}</strong>
                <span>{chargement ? 'Lecture en cours…' : fichier ? `Feuille « ${feuille} » · cliquez pour changer de fichier` : 'ou cliquez pour parcourir (.xlsx)'}</span>
              </div>

              {erreurLecture && <div className="sbi-boite err"><AlertTriangle size={16} /><div>{erreurLecture}</div></div>}

              {rapport && (
                <>
                  {rapport.erreurs.length > 0 && (
                    <div className="sbi-boite err">
                      <AlertTriangle size={16} />
                      <div><b>Import impossible</b>
                        <ul>{rapport.erreurs.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        Corrigez le fichier Excel puis réimportez-le.
                      </div>
                    </div>
                  )}

                  {rapport.lignes.length > 0 && rapport.erreurs.length === 0 && (
                    <>
                      {/* ---------- Choix de l'année ---------- */}
                      <div className="sbi-bloc">
                        <label className="sbi-champ">
                          <span>1. Année à mettre à jour</span>
                          <select value={annee ?? ''} onChange={(e) => choisirAnnee(e.target.value ? Number(e.target.value) : null)}>
                            <option value="">Choisir l'année…</option>
                            {anneesExcel.map((a) => (
                              <option key={a} value={a}>{a}{anneesBase.has(a) ? '' : ' (nouvelle année)'}</option>
                            ))}
                          </select>
                        </label>
                        {annee != null && !anneesBase.has(annee) && (
                          <p className="sbi-info"><CheckCircle2 size={14} /> {annee} n'existe pas encore dans la base : elle sera ajoutée et le tableau de bord s'ouvrira dessus.</p>
                        )}
                      </div>

                      {/* ---------- Choix des mois ---------- */}
                      {annee != null && (
                        <div className="sbi-bloc">
                          <div className="sbi-ligne">
                            <span className="sbi-etiq">2. Mois à mettre à jour</span>
                            <span className="sbi-liens">
                              <button type="button" onClick={() => setMois(moisDisponibles)}>Mois avec données</button>
                              <button type="button" onClick={() => setMois([...MOIS])}>Tous</button>
                              <button type="button" onClick={() => setMois([])}>Aucun</button>
                            </span>
                          </div>
                          <div className="sbi-mois">
                            {MOIS.map((m) => {
                              const dispo = moisDisponibles.includes(m);
                              return (
                                <label key={m} className={`sbi-mois-item ${mois.includes(m) ? 'on' : ''} ${dispo ? '' : 'vide'}`}
                                       title={dispo ? undefined : "Aucune valeur dans l'Excel pour ce mois"}>
                                  <input type="checkbox" checked={mois.includes(m)} onChange={() => basculerMois(m)} />
                                  {m}
                                </label>
                              );
                            })}
                          </div>
                          <p className="sbi-aide">Ajouter un nouveau mois : cochez-le simplement. Les mois en pointillés n'ont aucune valeur dans l'Excel.</p>
                          {moisSansDonnees.length > 0 && (
                            <div className="sbi-boite warn">
                              <AlertTriangle size={16} />
                              <div>
                                L'Excel ne contient aucune valeur pour : <b>{moisSansDonnees.join(', ')}</b>. Si vous les gardez cochés,
                                ces mois seront <b>vidés</b> dans la base pour {annee}.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ---------- Aperçu ---------- */}
                      <div className="sbi-kpis">
                        <div><span>Lignes de {annee ?? '…'} dans l'Excel</span><strong>{nf(lignesAnnee.length)}</strong></div>
                        <div><span>Mois choisis</span><strong>{mois.length}</strong></div>
                        <div><span>Aires protégées</span><strong>{rapport.aires.length}</strong></div>
                      </div>

                      {fusion && (
                        <div className="sbi-diff">
                          <h3>Ce qui sera changé dans la base</h3>
                          <div className="sbi-puces">
                            <span className="p ok">+ {nf(fusion.ajoutees)} ajoutée(s)</span>
                            <span className="p mod">~ {nf(fusion.modifiees)} modifiée(s)</span>
                            <span className="p">= {nf(fusion.identiques)} inchangée(s)</span>
                          </div>
                          <p className="sbi-aide">Aucune ligne n'est supprimée. Le Total de chaque ligne est recalculé (somme des 12 mois).</p>
                        </div>
                      )}
                    </>
                  )}

                  {rapport.avertissements.length > 0 && (
                    <div className="sbi-boite warn">
                      <AlertTriangle size={16} />
                      <div><b>À vérifier</b>
                        <ul>{rapport.avertissements.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      </div>
                    </div>
                  )}
                </>
              )}

              {message && <div className="sbi-boite ok"><CheckCircle2 size={16} /><div>{message}</div></div>}
            </div>

            <footer className="sbi-pied">
              <button className="sbi-sec" onClick={fermer}>Fermer</button>
              <div className="sbi-actions">
                <button className="sbi-sec" disabled={bloque} onClick={exporter}><Download size={14} /> Télécharger</button>
                <button className="sbi-sec" disabled={bloque} onClick={appliquerLocal}>Aperçu seulement</button>
                <button className="sbi-prim" disabled={bloque || publication} onClick={publier}>
                  {publication ? <Loader2 size={14} className="sbi-tourne" /> : <CloudUpload size={14} />} Mettre à jour la base
                </button>
              </div>
            </footer>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* Les variables du thème ont des valeurs de repli : la fenêtre est rendue dans <body> (portail) */
const CSS = `
.sbi-slot{align-self:flex-end}
@container sbr (max-width:1023px){.sbi-slot{order:1;align-self:center}}
.sbi-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;border:1px solid currentColor;
  background:transparent;color:var(--title-green,#14532d);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.sbi-btn:hover{background:rgba(22,163,74,.12)}

.sbi-fond{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.55);display:grid;place-items:center;padding:16px;
  font-family:'Figtree','Segoe UI',system-ui,sans-serif}
.sbi-modal{width:min(720px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;border-radius:16px;
  background:var(--surface,#fff);color:var(--text,#0f172a);border:1px solid var(--border,#e2e8f0);box-shadow:0 20px 60px rgba(0,0,0,.4)}
.sbi-modal *{box-sizing:border-box}
.sbi-tete{display:flex;justify-content:space-between;gap:12px;padding:18px 20px 12px;border-bottom:1px solid var(--border,#e2e8f0);
  border-top:4px solid rgb(200,15,15);border-radius:16px 16px 0 0}
.sbi-tete h2{margin:0;font-size:17px;font-weight:700}
.sbi-tete p{margin:4px 0 0;font-size:12.5px;color:var(--text-3,#64748b)}
.sbi-x{border:0;background:transparent;color:inherit;cursor:pointer;border-radius:8px;width:32px;height:32px;display:grid;place-items:center;flex:none}
.sbi-x:hover{background:var(--surface-3,#f1f5f9)}
.sbi-corps{padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}

.sbi-zone{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:22px 14px;border-radius:12px;
  border:2px dashed var(--text-3,#94a3b8);cursor:pointer;background:var(--surface-2,#f8fafc)}
.sbi-zone span{font-size:12px;color:var(--text-3,#64748b)}
.sbi-zone:hover,.sbi-zone.on,.sbi-zone:focus-visible{border-color:#16a34a;background:rgba(22,163,74,.08);outline:none}
.sbi-tourne{animation:sbi-spin 1s linear infinite}
@keyframes sbi-spin{to{transform:rotate(360deg)}}

/* choix année / mois */
.sbi-bloc{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;border:1px solid var(--border,#e2e8f0);
  background:var(--surface-2,#f8fafc)}
.sbi-champ{display:flex;flex-direction:column;gap:6px}
.sbi-champ>span,.sbi-etiq{font-size:13px;font-weight:700}
.sbi-champ select{padding:9px 10px;border-radius:9px;border:1px solid var(--border,#cbd5e1);background:var(--surface,#fff);
  color:inherit;font-size:13px;font-family:inherit;max-width:260px;cursor:pointer}
.sbi-ligne{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.sbi-liens{display:flex;gap:10px}
.sbi-liens button{border:0;background:transparent;padding:0;font-size:12px;font-weight:600;color:#15803d;cursor:pointer;
  text-decoration:underline;font-family:inherit}
.sbi-mois{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.sbi-mois-item{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;
  border:1px solid var(--border,#cbd5e1);background:var(--surface,#fff)}
.sbi-mois-item.on{border-color:#16a34a;background:rgba(22,163,74,.14)}
.sbi-mois-item.vide{border-style:dashed}
.sbi-mois-item input{accent-color:#16a34a}
.sbi-aide{margin:0;font-size:11.5px;color:var(--text-3,#64748b)}

.sbi-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.sbi-kpis div{background:var(--surface-3,#f1f5f9);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}
.sbi-kpis span{font-size:11px;color:var(--text-3,#64748b)}
.sbi-kpis strong{font-size:16px;font-variant-numeric:tabular-nums}
.sbi-diff h3{margin:0 0 6px;font-size:13px}
.sbi-diff .sbi-aide{margin-top:6px}
.sbi-puces{display:flex;flex-wrap:wrap;gap:6px}
.sbi-puces .p{font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--surface-3,#f1f5f9);border:1px solid var(--border,#e2e8f0)}
.sbi-puces .ok{background:rgba(22,163,74,.15);border-color:#16a34a}
.sbi-puces .mod{background:rgba(245,158,11,.18);border-color:#f59e0b}
.sbi-info{display:flex;align-items:center;gap:6px;margin:0;font-size:12.5px;color:#15803d}

.sbi-boite{display:flex;gap:10px;padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.45;border:1px solid}
.sbi-boite svg{flex:none;margin-top:2px}
.sbi-boite ul{margin:4px 0;padding-left:18px}
.sbi-boite.err{background:rgba(220,38,38,.1);border-color:#dc2626}
.sbi-boite.warn{background:rgba(245,158,11,.12);border-color:#f59e0b}
.sbi-boite.ok{background:rgba(22,163,74,.12);border-color:#16a34a}

.sbi-pied{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 20px;border-top:1px solid var(--border,#e2e8f0)}
.sbi-actions{display:flex;gap:8px;flex-wrap:wrap}
.sbi-modal button{font-family:inherit}
.sbi-sec,.sbi-prim{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer}
.sbi-sec{border:1px solid var(--border,#cbd5e1);background:transparent;color:inherit}
.sbi-sec:hover:not(:disabled){background:var(--surface-3,#f1f5f9)}
.sbi-prim{border:1px solid #14532d;background:#14532d;color:#fff}
.sbi-prim:hover:not(:disabled){background:#166534}
.sbi-modal button:disabled{opacity:.45;cursor:not-allowed}
.sbi-modal button:focus-visible,.sbi-modal select:focus-visible{outline:2px solid rgb(200,15,15);outline-offset:2px}
@media (max-width:520px){.sbi-pied{flex-direction:column-reverse;align-items:stretch}.sbi-actions{flex-direction:column}.sbi-sec,.sbi-prim{justify-content:center}}
@media (prefers-reduced-motion:reduce){.sbi-tourne{animation:none}}
`;
