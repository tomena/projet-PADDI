/// <reference types="node" />
import type { VercelRequest, VercelResponse } from "@vercel/node";

const MADAGASCAR_BBOX = "43,-26.5,51,-11";

const FIRMS_SOURCES = [
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA21_NRT",
];

type FireFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Record<string, any>;
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);

  return result.map((value) =>
    value.trim().replace(/^"|"$/g, "")
  );
}

function csvToFeatures(csv: string): FireFeature[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);

  const features: FireFeature[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      continue;
    }

    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      continue;
    }

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      properties: {
        latitude,
        longitude,
        bright_ti4: row.bright_ti4
          ? Number(row.bright_ti4)
          : null,
        bright_ti5: row.bright_ti5
          ? Number(row.bright_ti5)
          : null,
        scan: row.scan ? Number(row.scan) : null,
        track: row.track ? Number(row.track) : null,
        acq_date: row.acq_date || null,
        acq_time: row.acq_time || null,
        satellite: row.satellite || null,
        instrument: row.instrument || null,
        confidence: row.confidence || null,
        frp: row.frp ? Number(row.frp) : null,
        daynight: row.daynight || null,
        version: row.version || null,
      },
    });
  }

  return features;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Méthode non autorisée",
      });
    }

    const mapKey = process.env.FIRMS_MAP_KEY;

    if (!mapKey) {
      return res.status(500).json({
        error:
          "La variable FIRMS_MAP_KEY n'est pas configurée.",
      });
    }

    const daysParam = Number(req.query.days || 3);

    const days = Math.min(
      Math.max(Number.isFinite(daysParam) ? daysParam : 3, 1),
      3
    );

    const results = await Promise.all(
      FIRMS_SOURCES.map(async (source) => {
        const url =
          `https://firms.modaps.eosdis.nasa.gov/api/area/csv/` +
          `${mapKey}/${source}/${MADAGASCAR_BBOX}/${days}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `FIRMS ${source}: HTTP ${response.status}`
          );
        }

        const csv = await response.text();

        return csvToFeatures(csv);
      })
    );

    const allFeatures = results.flat();

    /*
     * Évite les doublons éventuels entre sources.
     */
    const unique = new Map<string, FireFeature>();

    for (const feature of allFeatures) {
      const p = feature.properties;

      const key = [
        p.latitude,
        p.longitude,
        p.acq_date,
        p.acq_time,
        p.satellite,
      ].join("_");

      if (!unique.has(key)) {
        unique.set(key, feature);
      }
    }

    const geojson = {
      type: "FeatureCollection",
      features: Array.from(unique.values()),
    };

    res.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate=600"
    );

    return res.status(200).json(geojson);
  } catch (error) {
    console.error("Erreur FIRMS:", error);

    return res.status(500).json({
      error: "Impossible de récupérer les données NASA FIRMS.",
      details:
        error instanceof Error
          ? error.message
          : "Erreur inconnue",
    });
  }
}
