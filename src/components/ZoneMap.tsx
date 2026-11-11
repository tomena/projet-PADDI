import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../context/ThemeContext";
import type { ZoneApi } from "../lib/geo";

/** v : 0 à 100 (position dans l'échelle de couleurs) ou null (pas de données). */
export type MapVal = { v: number | null; text: string };

export const SCALES = {
  bleu: ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"],
  rouge: ["#fee2e2", "#fca5a5", "#f87171", "#dc2626", "#7f1d1d"],
  vert: ["#dcfce7", "#86efac", "#22c55e", "#15803d", "#14532d"],
};

const MADA: L.LatLngBoundsExpression = [[-25.9, 43.0], [-11.8, 50.7]];
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const TILES = {
  light: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  dark: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  sat: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
};
const NO_DATA = "#8d9a94";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function ZoneMap({ zone, values, scale, legend, low = "faible", high = "élevé" }: {
  zone: ZoneApi;
  values: Record<string, MapVal>;
  scale: string[];
  legend: string;
  low?: string;
  high?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const units = useRef<L.GeoJSON | null>(null);
  const edge = useRef<L.GeoJSON | null>(null);
  const pick = useRef(zone.select);
  pick.current = zone.select;
  const { theme } = useTheme();
  const [sat, setSat] = useState(false);

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false, zoomSnap: 0.25 }).fitBounds(MADA);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.control.scale({ imperial: false, position: "bottomright" }).addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    base.current?.remove();
    base.current = L.tileLayer(sat ? TILES.sat : theme === "dark" ? TILES.dark : TILES.light, {
      maxZoom: 18, maxNativeZoom: sat ? 17 : 16, attribution: "Esri · limites geoBoundaries",
    }).addTo(m);
    base.current.bringToBack();
  }, [sat, theme]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    units.current?.remove();
    if (!zone.units.length) return;
    const byKey = new Map(zone.units.map((u) => [u.key, u]));
    const feats = zone.units.map((u) => ({ ...u.feat, properties: { ...u.feat.properties, __k: u.key } }));
    const color = (v: number | null) =>
      v == null ? NO_DATA : scale[Math.min(scale.length - 1, Math.max(0, Math.floor((v / 100) * scale.length)))];
    const focusKey = zone.focus?.key;
    units.current = L.geoJSON(feats as any, {
      style: (f) => {
        const k = (f as any).properties.__k as string;
        const v = values[k]?.v ?? null;
        const on = k === focusKey;
        return { color: on ? "#22d3ee" : "#ffffff", weight: on ? 3.5 : 1.1, fillColor: color(v), fillOpacity: v == null ? 0.18 : 0.75 };
      },
      onEachFeature: (f, layer) => {
        const k = (f as any).properties.__k as string;
        const u = byKey.get(k)!;
        const p = layer as L.Path;
        p.bindTooltip(`<strong>${esc(u.name)}</strong><br/>${esc(values[k]?.text ?? "Pas de données")}`, { sticky: true, className: "an-tip" });
        p.on("mouseover", () => p.setStyle({ weight: 3 }));
        p.on("mouseout", () => units.current?.resetStyle(p));
        p.on("click", () => pick.current(u));
      },
    }).addTo(m);
    units.current.eachLayer((l: any) => { if (l.feature?.properties?.__k === focusKey) l.bringToFront(); });
  }, [zone.units, zone.focus, values, scale]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    edge.current?.remove();
    if (!zone.parent) { m.flyToBounds(MADA, { duration: 0.8 }); return; }
    edge.current = L.geoJSON(zone.parent.feat as any, { interactive: false, style: { color: "#ff7a3d", weight: 3, fill: false } }).addTo(m);
    m.flyToBounds(edge.current.getBounds(), { padding: [24, 24], duration: 0.9 });
  }, [zone.parent]);

  const hint = zone.level === "ADM1" ? "Cliquez sur une région pour voir ses districts."
    : zone.level === "ADM2" ? "Cliquez sur un district pour voir ses communes." : "Cliquez sur une commune pour la sélectionner.";

  return (
    <section className="an-mapcard" aria-label="Carte interactive">
      <header className="an-mapcard-h">
        <div>
          <h2>{zone.title}</h2>
          <p className="an-hint">{hint}</p>
        </div>
        <div className="an-seg" role="group" aria-label="Fond de carte">
          <button type="button" aria-pressed={!sat} onClick={() => setSat(false)}>Carte</button>
          <button type="button" aria-pressed={sat} onClick={() => setSat(true)}>Satellite</button>
        </div>
      </header>
      <div className="an-mapbox">
        <div ref={el} className="an-map" />
        <div className="an-maplegend">
          <strong>{legend}</strong>
          <div className="an-maplegend-bar">
            {scale.map((c) => <i key={c} style={{ background: c }} />)}
          </div>
          <div className="an-maplegend-lab"><span>{low}</span><span>{high}</span></div>
          <span className="an-maplegend-nd"><i style={{ background: NO_DATA }} />Pas de données</span>
        </div>
      </div>
    </section>
  );
}
