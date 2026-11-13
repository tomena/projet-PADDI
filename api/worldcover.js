export default async function handler(req, res) {
  const { minLon, minLat, maxLon, maxLat, w, h } = req.query;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: "WORLDCOVER_2021_MAP", // vérifiez le nom exact dans le GetCapabilities
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: `${minLat},${minLon},${maxLat},${maxLon}`, // WMS 1.3.0 en EPSG:4326 : ordre lat,lon
    WIDTH: w,
    HEIGHT: h,
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
  });
  try {
    const r = await fetch(`https://services.terrascope.be/wms/v2?${params}`);
    if (!r.ok) return res.status(502).send("WorldCover indisponible");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.status(502).send("WorldCover indisponible");
  }
}
