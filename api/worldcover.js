export default async function handler(req, res) {
  const { minLon, minLat, maxLon, maxLat, w, h } = req.query;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: "WORLDCOVER_2021_MAP", // à confirmer via GetCapabilities
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: `${minLat},${minLon},${maxLat},${maxLon}`,
    WIDTH: w,
    HEIGHT: h,
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
  });
  try {
    const r = await fetch(`https://services.terrascope.be/wms/v2?${params}`);
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) {
      const txt = await r.text();
      console.error("WorldCover WMS :", r.status, type, txt.slice(0, 500));
      return res.status(502).json({ erreur: "WorldCover : " + txt.slice(0, 300) });
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("WorldCover :", e);
    res.status(502).json({ erreur: "WorldCover injoignable" });
  }
}
