/**
 * AnalyseTerritoriale.tsx — Madagascar : Région → District → Commune
 *
 * Dépendances : npm i leaflet && npm i -D @types/leaflet   (+ Tailwind CSS)
 * Données (toutes appelées depuis le navigateur, sans clé API) :
 *  - Limites administratives : geoBoundaries (ADM1 régions, ADM2 districts, ADM3 communes)
 *  - Occupation du sol : ESA WorldCover 2021 (WMS Terrascope), comptage des pixels dans le polygone
 *  - Altitude / pente : Open-Meteo Elevation (Copernicus DEM 90 m), grille échantillonnée
 *  - Pluviométrie : Open-Meteo Archive (cumul annuel au centre du territoire)
 *  - Bassins versants : à brancher via BASSINS_GEOJSON_URL (GeoJSON HydroBASINS/HydroATLAS)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BASSINS_GEOJSON_URL = ""; // ex. votre GeoJSON HydroBASINS niveau 6-8 pour Madagascar (CORS ouvert)
const GB = "https://www.geoboundaries.org/api/current/gbOpen/MDG/";
const WMS = "https://services.terrascope.be/wms/v2";

type Ring = number[][];
type Feat = { properties: { shapeName: string }; geometry: { type: string; coordinates: any } };
type Level = "ADM1" | "ADM2" | "ADM3";

const CLASSES = [
  { n: "Couvert arboré", c: [0, 100, 0] },
  { n: "Arbustes", c: [255, 187, 34] },
  { n: "Prairie / savane", c: [255, 255, 76] },
  { n: "Cultures", c: [240, 150, 255] },
  { n: "Bâti", c: [250, 0, 0] },
  { n: "Sol nu", c: [180, 180, 180] },
  { n: "Eau", c: [0, 100, 200] },
  { n: "Zone humide", c: [0, 150, 160] },
  { n: "Mangrove", c: [0, 207, 117] },
];
const SLOPES = [
  { n: "Plat (< 5 %)", max: 5, col: "#7fb069" },
  { n: "Modérée (5–15 %)", max: 15, col: "#e6c84f" },
  { n: "Forte (15–30 %)", max: 30, col: "#e08a3c" },
  { n: "Très forte (> 30 %)", max: 1e9, col: "#b23a2e" },
];

const polys = (f: Feat): Ring[][] =>
  f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
const inRing = (x: number, y: number, r: Ring) => {
  let o = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) o = !o;
  return o;
};
const inFeat = (x: number, y: number, f: Feat) =>
  polys(f).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
const bbox = (f: Feat) => {
  let a = 180, b = 90, c = -180, d = -90;
  polys(f).forEach((p) => p[0].forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }));
  return { minLon: a, minLat: b, maxLon: c, maxLat: d };
};
const center = (f: Feat): [number, number] => {
  const r = polys(f).sort((p, q) => q[0].length - p[0].length)[0][0];
  return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
};

async function loadLevel(l: Level): Promise<Feat[]> {
  const meta = await (await fetch(GB + l + "/")).json();
  const url = meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL;
  return (await (await fetch(url)).json()).features;
}

type Result = {
  land: { n: string; pct: number; col: string }[];
  slope: { n: string; pct: number; col: string }[];
  elevMin: number; elevMax: number; elevMean: number;
  rain: number | null; areaKm2: number;
  cropSteep: number; treePct: number; cropPct: number; barePct: number; steepPct: number; wetPct: number;
  bassin: string | null; resolution: string;
};

async function analyse(f: Feat, signal: AbortSignal): Promise<Result> {
  const b = bbox(f);
  const midLat = (b.minLat + b.maxLat) / 2;
  const wKm = (b.maxLon - b.minLon) * 111.32 * Math.cos((midLat * Math.PI) / 180);
  const hKm = (b.maxLat - b.minLat) * 110.54;
  const W = wKm >= hKm ? 600 : Math.max(120, Math.round((600 * wKm) / hKm));
  const H = wKm >= hKm ? Math.max(120, Math.round((600 * hKm) / wKm)) : 600;

  // 1) Occupation du sol : image WMS + masque du polygone
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `${WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=WORLDCOVER_2021_MAP&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:4326&BBOX=${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}&WIDTH=${W}&HEIGHT=${H}`;
  await img.decode();
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const cx = cv.getContext("2d", { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0);
  const px = cx.getImageData(0, 0, W, H).data;
  const mk = document.createElement("canvas"); mk.width = W; mk.height = H;
  const mc = mk.getContext("2d", { willReadFrequently: true })!;
  const X = (lon: number) => ((lon - b.minLon) / (b.maxLon - b.minLon)) * W;
  const Y = (lat: number) => ((b.maxLat - lat) / (b.maxLat - b.minLat)) * H;
  mc.beginPath();
  polys(f).forEach((p) => p.forEach((r) => r.forEach(([x, y], i) => (i ? mc.lineTo(X(x), Y(y)) : mc.moveTo(X(x), Y(y))))));
  mc.fill("evenodd");
  const mask = mc.getImageData(0, 0, W, H).data;
  const cls = (i: number) => {
    if (px[i * 4 + 3] < 128) return -1;
    let best = -1, bd = 60 * 60 * 3;
    CLASSES.forEach((k, ci) => {
      const d = (px[i * 4] - k.c[0]) ** 2 + (px[i * 4 + 1] - k.c[1]) ** 2 + (px[i * 4 + 2] - k.c[2]) ** 2;
      if (d < bd) { bd = d; best = ci; }
    });
    return best;
  };
  const cnt = new Array(CLASSES.length).fill(0); let tot = 0;
  for (let i = 0; i < W * H; i++) if (mask[i * 4 + 3] > 128) { const c = cls(i); if (c >= 0) { cnt[c]++; tot++; } }
  if (!tot) throw new Error("Aucune donnée d'occupation du sol reçue (service indisponible ou bloqué par CORS).");

  // 2) Grille d'altitude 10×10 → pente
  const N = 10, dLon = (b.maxLon - b.minLon) / (N - 1), dLat = (b.maxLat - b.minLat) / (N - 1);
  const lats: number[] = [], lons: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { lats.push(+(b.maxLat - i * dLat).toFixed(5)); lons.push(+(b.minLon + j * dLon).toFixed(5)); }
  const el = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lons.join(",")}`, { signal })).json();
  const z: number[] = el.elevation;
  const dx = dLon * 111320 * Math.cos((midLat * Math.PI) / 180), dy = dLat * 110540;
  const sc = new Array(SLOPES.length).fill(0); let sn = 0, cropSteep = 0, cropN = 0;
  for (let i = 1; i < N - 1; i++) for (let j = 1; j < N - 1; j++) {
    const k = i * N + j;
    if (!inFeat(lons[k], lats[k], f)) continue;
    const s = (Math.hypot((z[k + 1] - z[k - 1]) / (2 * dx), (z[k - N] - z[k + N]) / (2 * dy))) * 100;
    const si = SLOPES.findIndex((t) => s < t.max);
    sc[si]++; sn++;
    const c = cls(Math.min(H - 1, Math.max(0, Math.floor(Y(lats[k])))) * W + Math.min(W - 1, Math.max(0, Math.floor(X(lons[k])))));
    if (c === 3) { cropN++; if (s >= 15) cropSteep++; }
  }
  const inside = z.filter((_, k) => inFeat(lons[k], lats[k], f));
  const zs = inside.length ? inside : z;

  // 3) Pluviométrie annuelle
  let rain: number | null = null;
  try {
    const [cLon, cLat] = center(f);
    const r = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${cLat}&longitude=${cLon}&start_date=2023-01-01&end_date=2023-12-31&daily=precipitation_sum&timezone=auto`, { signal })).json();
    rain = Math.round(r.daily.precipitation_sum.reduce((s: number, v: number) => s + (v || 0), 0));
  } catch { /* facultatif */ }

  // 4) Bassin versant (si une source est configurée)
  let bassin: string | null = null;
  if (BASSINS_GEOJSON_URL) {
    try {
      const g = await (await fetch(BASSINS_GEOJSON_URL, { signal })).json();
      const [cLon, cLat] = center(f);
      const hit = g.features.find((x: any) => inFeat(cLon, cLat, x));
      bassin = hit ? hit.properties.name || hit.properties.shapeName || hit.properties.HYBAS_ID || "Bassin identifié" : "Hors bassin référencé";
    } catch { bassin = null; }
  }

  const pct = (c: number) => (tot ? (cnt[c] / tot) * 100 : 0);
  return {
    land: CLASSES.map((k, i) => ({ n: k.n, pct: pct(i), col: `rgb(${k.c.join(",")})` })).filter((x) => x.pct > 0.05).sort((a, b) => b.pct - a.pct),
    slope: SLOPES.map((s, i) => ({ n: s.n, pct: sn ? (sc[i] / sn) * 100 : 0, col: s.col })),
    elevMin: Math.min(...zs), elevMax: Math.max(...zs), elevMean: zs.reduce((a, c) => a + c, 0) / zs.length,
    rain, areaKm2: Math.round(wKm * hKm * (tot / (W * H)) || wKm * hKm),
    cropSteep: cropN ? (cropSteep / cropN) * 100 : 0,
    treePct: pct(0), cropPct: pct(3), barePct: pct(5), steepPct: sn ? ((sc[2] + sc[3]) / sn) * 100 : 0, wetPct: pct(7) + pct(8),
    bassin, resolution: `${Math.round((wKm * 1000) / W)} m/pixel (occupation) · ${Math.round(Math.max(dx, dy) / 1000 * 10) / 10} km entre points (pente)`,
  };
}

function orientations(r: Result) {
  const o: { t: string; d: string; lvl: "haute" | "moyenne" | "info" }[] = [];
  if (r.cropSteep > 30 && (r.rain ?? 0) > 1000)
    o.push({ lvl: "haute", t: "Lutte antiérosive sur cultures de pente", d: `${r.cropSteep.toFixed(0)} % des cultures échantillonnées sont sur pente ≥ 15 % avec ${r.rain} mm/an : risque élevé de ravinement et de lavaka. Priorité : agroforesterie, cordons de pierres, bandes enherbées, terrasses.` });
  else if (r.cropSteep > 30)
    o.push({ lvl: "moyenne", t: "Cultures sur pente à sécuriser", d: `${r.cropSteep.toFixed(0)} % des cultures sont sur pente ≥ 15 %. Envisager des pratiques de conservation des sols.` });
  if (r.steepPct > 35 && r.treePct < 25)
    o.push({ lvl: "haute", t: "Restauration forestière des versants", d: `Pentes ≥ 15 % sur ${r.steepPct.toFixed(0)} % du territoire pour seulement ${r.treePct.toFixed(0)} % de couvert arboré. Reboisement d'espèces locales sur les versants, en priorité autour des têtes de bassin.` });
  if (r.barePct > 10)
    o.push({ lvl: "haute", t: "Réhabilitation des sols nus", d: `${r.barePct.toFixed(0)} % de sol nu : stabilisation par végétalisation (graminées, légumineuses) puis plantations.` });
  if (r.treePct >= 40)
    o.push({ lvl: "info", t: "Conservation du couvert existant", d: `${r.treePct.toFixed(0)} % de couvert arboré : protéger en priorité (gestion communautaire, lutte contre les feux et le défrichement).` });
  if (r.wetPct > 3)
    o.push({ lvl: "moyenne", t: "Protection des zones humides et mangroves", d: `${r.wetPct.toFixed(1)} % de zones humides/mangroves : zones tampons, éviter drainage et coupe.` });
  if (r.cropPct > 40 && r.steepPct < 15)
    o.push({ lvl: "info", t: "Intensification durable en terrain plat", d: "Terrain peu pentu et très cultivé : bonnes conditions pour intensifier (rotations, fertilisation organique) et alléger la pression sur les forêts." });
  if (!o.length) o.push({ lvl: "info", t: "Pas de signal prioritaire détecté", d: "Les indicateurs calculés ne révèlent pas de pression marquée. Affiner par un diagnostic de terrain." });
  o.push({ lvl: "info", t: "Limites", d: "Estimation indicative (WorldCover 2021, DEM 90 m échantillonné). Valider avec des données locales et la consultation des acteurs du territoire avant toute décision." });
  return o;
}

const Bar = ({ n, pct, col }: { n: string; pct: number; col: string }) => (
  <div className="mb-1.5">
    <div className="flex justify-between text-xs text-stone-700"><span>{n}</span><span className="tabular-nums">{pct.toFixed(1)} %</span></div>
    <div className="h-2 bg-stone-200 rounded-sm overflow-hidden"><div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: col }} /></div>
  </div>
);

export default function AnalyseTerritoriale() {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.GeoJSON | null>(null);
  const wc = useRef<L.TileLayer.WMS | null>(null);
  const cache = useRef<Partial<Record<Level, Feat[]>>>({});
  const [regs, setRegs] = useState<Feat[]>([]);
  const [dists, setDists] = useState<Feat[]>([]);
  const [coms, setComs] = useState<Feat[]>([]);
  const [reg, setReg] = useState(""), [dis, setDis] = useState(""), [com, setCom] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [show, setShow] = useState(false), [wcOn, setWcOn] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  const get = async (l: Level) => (cache.current[l] ??= await loadLevel(l));
  const rF = regs.find((f) => f.properties.shapeName === reg);
  const dF = dists.find((f) => f.properties.shapeName === dis);
  const cF = coms.find((f) => f.properties.shapeName === com);
  const current = cF || dF || rF;
  const level = cF ? "Commune" : dF ? "District" : rF ? "Région" : "";

  useEffect(() => {
    const m = L.map(mapEl.current!, { zoomControl: true }).setView([-19.0, 46.7], 6);
    L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", { maxZoom: 20, attribution: "Imagerie © Google" }).addTo(m);
    wc.current = L.tileLayer.wms(WMS, { layers: "WORLDCOVER_2021_MAP", format: "image/png", transparent: true, opacity: 0.55, attribution: "ESA WorldCover" } as any);
    map.current = m;
    get("ADM1").then(setRegs).catch(() => setErr("Impossible de charger les régions (réseau)."));
    return () => { m.remove(); };
  }, []);

  useEffect(() => { if (wcOn) wc.current?.addTo(map.current!); else wc.current?.remove(); }, [wcOn]);

  useEffect(() => {
    if (!map.current) return;
    layer.current?.remove();
    setRes(null); setShow(false); setErr("");
    if (!current) { map.current.flyTo([-19.0, 46.7], 6); return; }
    layer.current = L.geoJSON(current as any, { style: { color: "#ffd166", weight: 3, fillOpacity: 0.05 } }).addTo(map.current);
    map.current.flyToBounds(layer.current.getBounds(), { padding: [30, 30], duration: 1.2 });
    ctl.current?.abort();
    const c = (ctl.current = new AbortController());
    setBusy(true);
    analyse(current, c.signal).then(setRes).catch((e) => !c.signal.aborted && setErr(e.message || "Erreur d'analyse")).finally(() => setBusy(false));
  }, [current]);

  const pickReg = async (v: string) => {
    setReg(v); setDis(""); setCom(""); setDists([]); setComs([]);
    const r = regs.find((f) => f.properties.shapeName === v);
    if (!r) return;
    const all = await get("ADM2");
    setDists(all.filter((d) => inFeat(...center(d), r)).sort((a, b) => a.properties.shapeName.localeCompare(b.properties.shapeName)));
  };
  const pickDis = async (v: string) => {
    setDis(v); setCom(""); setComs([]);
    const d = dists.find((f) => f.properties.shapeName === v);
    if (!d) return;
    const all = await get("ADM3");
    setComs(all.filter((c) => inFeat(...center(c), d)).sort((a, b) => a.properties.shapeName.localeCompare(b.properties.shapeName)));
  };

  const advice = useMemo(() => (res ? orientations(res) : []), [res]);
  const sel = "w-full border border-stone-400 bg-white px-2 py-1.5 text-sm disabled:opacity-50 focus:outline-2 focus:outline-emerald-700";

  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-100 text-stone-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <aside className="md:w-[420px] md:h-full overflow-y-auto p-4 space-y-4 border-r border-stone-300 order-2 md:order-1 max-h-[55vh] md:max-h-none">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">Lecture du territoire</h1>
          <p className="text-sm text-stone-600">Choisissez une région, un district puis une commune pour voir l’occupation du sol et le relief.</p>
        </header>

        <div className="space-y-2">
          <select className={sel} value={reg} onChange={(e) => pickReg(e.target.value)} aria-label="Région">
            <option value="">Région…</option>
            {regs.map((f) => <option key={f.properties.shapeName}>{f.properties.shapeName}</option>)}
          </select>
          <select className={sel} value={dis} disabled={!dists.length} onChange={(e) => pickDis(e.target.value)} aria-label="District">
            <option value="">{reg && !dists.length ? "Chargement…" : "District…"}</option>
            {dists.map((f) => <option key={f.properties.shapeName}>{f.properties.shapeName}</option>)}
          </select>
          <select className={sel} value={com} disabled={!coms.length} onChange={(e) => setCom(e.target.value)} aria-label="Commune">
            <option value="">{dis && !coms.length ? "Chargement…" : "Commune…"}</option>
            {coms.map((f) => <option key={f.properties.shapeName}>{f.properties.shapeName}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wcOn} onChange={(e) => setWcOn(e.target.checked)} /> Superposer l’occupation du sol sur la carte</label>
        </div>

        {err && <p role="alert" className="text-sm border-l-4 border-red-700 bg-red-50 p-2">{err}</p>}
        {busy && <p className="text-sm text-stone-600">Analyse de {level.toLowerCase()} {current?.properties.shapeName}…</p>}

        {res && current && (
          <>
            <section className="bg-white border border-stone-300 p-3">
              <h2 className="font-semibold mb-2">Occupation du sol — {level} {current.properties.shapeName}</h2>
              {res.land.map((x) => <Bar key={x.n} {...x} />)}
            </section>

            <section className="bg-white border border-stone-300 p-3">
              <h2 className="font-semibold mb-2">Relief et contexte</h2>
              {res.slope.map((x) => <Bar key={x.n} {...x} />)}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm mt-3">
                <dt className="text-stone-600">Altitude</dt><dd>{Math.round(res.elevMin)} – {Math.round(res.elevMax)} m (moy. {Math.round(res.elevMean)})</dd>
                <dt className="text-stone-600">Superficie</dt><dd>≈ {res.areaKm2.toLocaleString("fr-FR")} km²</dd>
                <dt className="text-stone-600">Pluie 2023</dt><dd>{res.rain ? `${res.rain} mm` : "n/d"}</dd>
                <dt className="text-stone-600">Cultures ≥ 15 %</dt><dd>{res.cropSteep.toFixed(0)} % des cultures</dd>
                <dt className="text-stone-600">Bassin versant</dt><dd>{res.bassin ?? "source non configurée"}</dd>
              </dl>
              <p className="text-xs text-stone-500 mt-2">Résolution : {res.resolution}</p>
            </section>

            <button onClick={() => setShow(true)} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-emerald-800">
              Analyser
            </button>

            {show && (
              <section className="space-y-2" aria-live="polite">
                <h2 className="font-semibold">Orientations possibles</h2>
                {advice.map((a) => (
                  <article key={a.t} className={`p-3 border-l-4 bg-white ${a.lvl === "haute" ? "border-red-700" : a.lvl === "moyenne" ? "border-amber-500" : "border-stone-400"}`}>
                    <h3 className="text-sm font-semibold">{a.t}{a.lvl !== "info" && <span className="font-normal text-stone-500"> — priorité {a.lvl}</span>}</h3>
                    <p className="text-sm text-stone-700">{a.d}</p>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </aside>
      <div ref={mapEl} className="flex-1 min-h-[45vh] order-1 md:order-2" />
    </div>
  );
}
