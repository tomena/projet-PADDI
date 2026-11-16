import updateFeux from "../server/update-feux.js";
import updateGeojson from "../server/update-geojson.js";
import importCouts from "../server/import-couts.js";
import importDecaissement from "../server/import-decaissement.js";
import importIndicateurs from "../server/import-indicateurs.js";
import osmTerritoire from "../server/osm-territoire.js";

type Handler = (req: any, res: any) => unknown;

const types: Record<string, Handler> = {
  feux: updateFeux,
  geojson: updateGeojson,
  couts: importCouts,
  decaissement: importDecaissement,
  indicateurs: importIndicateurs,
  osm: osmTerritoire,
};

export default function handler(req: any, res: any) {
  const t = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
  const fn = t ? types[t] : undefined;
  if (!fn) return res.status(404).json({ error: "Type d'import inconnu." });

  // Les types d'écriture exigent un jeton ; « osm » reste public (lecture seule)
  if (t !== "osm") {
    const secret = process.env.IMPORT_SECRET;
    if (!secret || req.headers["x-import-token"] !== secret) {
      return res.status(401).json({ error: "Non autorisé." });
    }
  }

  return fn(req, res);
}
