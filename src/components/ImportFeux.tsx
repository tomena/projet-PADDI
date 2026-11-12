import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, Download, Loader2, CloudUpload } from 'lucide-react';
import { convertir, versGeoJSON, serialiser, type Ligne, type Rapport } from './feuxConvert';
import LoginModal from './LoginModal';

/* =====================================================================
   ACCÈS : connexion par votre LoginModal (même session que l'import des coûts).
   Seul l'utilisateur « Toky » (anjarampifohazana.toky@giz.de) est autorisé.
   ⚠️ Ce test côté navigateur n'est qu'une aide : c'est api/update-feux.ts qui
   vérifie le jeton signé et refuse tout autre compte.
   ===================================================================== */
const UTILISATEUR_AUTORISE = 'Toky';

interface Props {
  /** Lignes actuellement affichées (feuxData) : sert à comparer avant/après */
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
  const [confirme, setConfirme] = useState(false);
  const [message, setMessage] = useState('');
  const [publication, setPublication] = useState(false);
  const [survol, setSurvol] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reinit = useCallback(() => {
    setFichier(''); setFeuille(''); setRapport(null); setErreurLecture('');
    setConfirme(false); setMessage(''); setChargement(false);
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

  const traiter = async (f?: File | null) => {
    if (!f || !autorise) return;
    reinit();
    if (!/\.(xlsx|xlsm|xls)$/i.test(f.name)) { setErreurLecture('Format non pris en charge : choisissez un fichier Excel (.xlsx).'); return; }
    setFichier(f.name); setChargement(true);
    try {
      const { lignes, feuille: nom } = await lireExcel(f);
      setFeuille(nom);
      setRapport(convertir(lignes, current));
    } catch (e) {
      console.error(e);
      setErreurLecture("Impossible de lire ce fichier Excel. Vérifiez qu'il n'est pas protégé par mot de passe ni corrompu.");
    } finally { setChargement(false); }
  };

  const autorise = session?.userName === UTILISATEUR_AUTORISE;
  const bloque = !autorise || !rapport || rapport.erreurs.length > 0 || (rapport.risque && !confirme);

  const appliquerLocal = () => {
    if (!rapport || bloque) return;
    onApply(rapport.lignes, { fichier, derniereAnnee: rapport.derniereAnnee });
    setMessage("Aperçu appliqué à votre écran uniquement : le fichier du serveur n'a pas été modifié.");
  };
  const exporter = () => {
    if (!rapport || bloque) return;
    telecharger('Bases_Feux.geojson', serialiser(versGeoJSON(rapport.lignes)));
  };
  // Action principale : remplace public/data/Bases_Feux.geojson sur le serveur
  const publier = async () => {
    if (!rapport || bloque) return;
    setPublication(true); setErreurLecture(''); setMessage('');
    try {
      const res = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session?.token, lignes: rapport.lignes, confirmeSuppression: confirme }),
      });
      if (!res.ok) {
        let m = '';
        try { m = (await res.json()).error; } catch { /* réponse non JSON */ }
        if (res.status === 401) { setSession(null); setOuvert(false); setLogin(true); }
        throw new Error(m || `HTTP ${res.status}`);
      }
      onApply(rapport.lignes, { fichier, derniereAnnee: rapport.derniereAnnee });
      setMessage('Base enregistrée (commit GitHub). Le tableau de bord affiche déjà les nouvelles données ; pour les autres utilisateurs, c\'est visible après le redéploiement du site (1 à 3 minutes).');
    } catch (e: any) {
      setErreurLecture(`Échec de la mise à jour : ${e?.message || 'erreur serveur'}. Le fichier n'a pas été modifié.`);
    } finally { setPublication(false); }
  };

  const d = rapport?.diff;

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
                <p>Importez l'Excel <b>Bases_Feux.xlsx</b> : il est converti en GeoJSON et remplace la base actuelle.</p>
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

                  {rapport.lignes.length > 0 && (
                    <>
                      <div className="sbi-kpis">
                        <div><span>Lignes importées</span><strong>{nf(rapport.lignes.length)}</strong></div>
                        <div><span>Années</span><strong>{rapport.annees[0]?.annee}–{rapport.derniereAnnee}</strong></div>
                        <div><span>Dernier mois ({rapport.derniereAnnee})</span><strong>{rapport.dernierMois ?? '—'}</strong></div>
                        <div><span>Aires protégées</span><strong>{rapport.aires.length}</strong></div>
                      </div>

                      {d && (
                        <div className="sbi-diff">
                          <h3>Changements par rapport à la base actuelle</h3>
                          <div className="sbi-puces">
                            <span className="p ok">+ {nf(d.ajoutees)} ajoutée(s)</span>
                            <span className="p mod">~ {nf(d.modifiees)} modifiée(s)</span>
                            <span className={`p ${d.supprimees ? 'sup' : ''}`}>− {nf(d.supprimees)} supprimée(s)</span>
                            <span className="p">= {nf(d.identiques)} inchangée(s)</span>
                          </div>
                          {d.anneesNouvelles.length > 0 && (
                            <p className="sbi-info"><CheckCircle2 size={14} /> Nouvelle année détectée : <b>{d.anneesNouvelles.join(', ')}</b>. Le tableau de bord s'ouvrira dessus.</p>
                          )}
                        </div>
                      )}

                      <details className="sbi-det">
                        <summary>Lignes par année et par source</summary>
                        <div className="sbi-puces">
                          {rapport.annees.map((a) => <span key={a.annee} className="p">{a.annee} : {nf(a.n)}</span>)}
                          {Object.entries(rapport.sources).map(([s, n]) => <span key={s} className="p">{s} : {nf(Number(n))}</span>)}
                        </div>
                      </details>
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

                  {rapport.risque && rapport.erreurs.length === 0 && (
                    <label className="sbi-confirm">
                      <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
                      Je confirme remplacer la base actuelle malgré les suppressions signalées.
                    </label>
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

.sbi-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.sbi-kpis div{background:var(--surface-3,#f1f5f9);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}
.sbi-kpis span{font-size:11px;color:var(--text-3,#64748b)}
.sbi-kpis strong{font-size:16px;font-variant-numeric:tabular-nums}
.sbi-diff h3{margin:0 0 6px;font-size:13px}
.sbi-puces{display:flex;flex-wrap:wrap;gap:6px}
.sbi-puces .p{font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--surface-3,#f1f5f9);border:1px solid var(--border,#e2e8f0)}
.sbi-puces .ok{background:rgba(22,163,74,.15);border-color:#16a34a}
.sbi-puces .mod{background:rgba(245,158,11,.18);border-color:#f59e0b}
.sbi-puces .sup{background:rgba(220,38,38,.15);border-color:#dc2626}
.sbi-info{display:flex;align-items:center;gap:6px;margin:8px 0 0;font-size:12.5px;color:#15803d}
.sbi-det summary{cursor:pointer;font-size:12.5px;color:var(--text-2,#334155);margin-bottom:6px}

.sbi-boite{display:flex;gap:10px;padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.45;border:1px solid}
.sbi-boite svg{flex:none;margin-top:2px}
.sbi-boite ul{margin:4px 0;padding-left:18px}
.sbi-boite.err{background:rgba(220,38,38,.1);border-color:#dc2626}
.sbi-boite.warn{background:rgba(245,158,11,.12);border-color:#f59e0b}
.sbi-boite.ok{background:rgba(22,163,74,.12);border-color:#16a34a}
.sbi-confirm{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;font-weight:600}

.sbi-pied{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 20px;border-top:1px solid var(--border,#e2e8f0)}
.sbi-actions{display:flex;gap:8px;flex-wrap:wrap}
.sbi-modal button{font-family:inherit}
.sbi-sec,.sbi-prim{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer}
.sbi-sec{border:1px solid var(--border,#cbd5e1);background:transparent;color:inherit}
.sbi-sec:hover:not(:disabled){background:var(--surface-3,#f1f5f9)}
.sbi-prim{border:1px solid #14532d;background:#14532d;color:#fff}
.sbi-prim:hover:not(:disabled){background:#166534}
.sbi-modal button:disabled{opacity:.45;cursor:not-allowed}
.sbi-modal button:focus-visible{outline:2px solid rgb(200,15,15);outline-offset:2px}
@media (max-width:520px){.sbi-pied{flex-direction:column-reverse;align-items:stretch}.sbi-actions{flex-direction:column}.sbi-sec,.sbi-prim{justify-content:center}}
@media (prefers-reduced-motion:reduce){.sbi-tourne{animation:none}}
`;
