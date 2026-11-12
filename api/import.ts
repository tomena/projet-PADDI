import updateFeux from "../server/update-feux";
import updateGeojson from "../server/update-geojson";
import importCouts from "../server/import-couts";
import importDecaissement from "../server/import-decaissement";
import importIndicateurs from "../server/import-indicateurs";

type Handler = (req: any, res: any) => unknown;

const types: Record<string, Handler> = {
  feux: updateFeux,
  geojson: updateGeojson,
  couts: importCouts,
  decaissement: importDecaissement,
  indicateurs: importIndicateurs,
};

export default function handler(req: any, res: any) {
  const t = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
  const fn = t ? types[t] : undefined;
  if (!fn) return res.status(404).json({ error: "Type d'import inconnu." });
  return fn(req, res);
}
