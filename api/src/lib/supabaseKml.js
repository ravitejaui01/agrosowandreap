import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function geoJsonToLatLngs(coords) {
  if (!Array.isArray(coords)) return undefined;
  let ring;
  if (coords.length > 0 && Array.isArray(coords[0])) {
    const first = coords[0];
    if (first.length >= 3 && Array.isArray(first[0])) ring = first;
    else if (coords.length >= 3 && typeof coords[0][0] === "number") ring = coords;
  }
  if (!ring || ring.length < 3) return undefined;
  return ring.map((c) => {
    const [a, b] = Array.isArray(c) ? c : [0, 0];
    return [Number(b), Number(a)];
  });
}

function geoJsonToPlots(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const first = coords[0];
  if (!Array.isArray(first)) return [];
  if (first.length >= 3 && typeof first[0] === "number") {
    const ring = geoJsonToLatLngs(coords);
    return ring ? [{ latlngs: ring, plotNumber: 1, areaAcres: undefined }] : [];
  }
  if (first.length >= 3 && Array.isArray(first[0])) {
    const plots = [];
    for (let i = 0; i < coords.length; i++) {
      const ring = geoJsonToLatLngs(coords[i]);
      if (ring) plots.push({ latlngs: ring, plotNumber: i + 1, areaAcres: undefined });
    }
    return plots;
  }
  return [];
}

function normalizePlot(raw) {
  if (raw == null || typeof raw !== "object") return null;
  let latlngs = raw.latlngs ?? raw.lat_lngs;
  if (!latlngs && Array.isArray(raw.coordinates)) latlngs = geoJsonToLatLngs(raw.coordinates);
  if (!latlngs && raw.geometry?.coordinates) latlngs = geoJsonToLatLngs(raw.geometry.coordinates);
  if (Array.isArray(latlngs) && latlngs.length > 0) {
    latlngs = latlngs.filter((c) => Array.isArray(c) && c.length >= 2).map((c) => [Number(c[0]), Number(c[1])]);
    if (latlngs.length < 3) latlngs = undefined;
  } else latlngs = undefined;
  return latlngs ? { plotNumber: Number(raw.plotNumber ?? raw.plot_number ?? 0) || undefined, areaAcres: raw.areaAcres ?? raw.area_acres, latlngs } : null;
}

function normalizePlotsList(plots) {
  if (plots == null) return [];
  const arr = typeof plots === "string" ? (() => { try { return JSON.parse(plots) ?? []; } catch { return []; } })() : Array.isArray(plots) ? plots : [];
  return arr.map(normalizePlot).filter(Boolean);
}

function parseGeoCoordinatesText(text) {
  const plots = [];
  const str = String(text).trim();
  if (!str) return plots;
  const plotBlocks = str.split(/\s*;\s*Plot\s+\d+\s*:\s*/i).filter(Boolean);
  for (let i = 0; i < plotBlocks.length; i++) {
    const block = plotBlocks[i].replace(/^\s*Plot\s+\d+\s*:\s*/i, "").trim();
    const acresMatch = block.match(/\s*\(([\d.]+)\s*acres?\)\s*$/i);
    const areaAcres = acresMatch ? Number(acresMatch[1]) : undefined;
    const pairs = block.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const latlngs = [];
    const regex = /([\d.-]+)\s*,\s*([\d.-]+)/g;
    let m;
    while ((m = regex.exec(pairs)) !== null) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) latlngs.push([lat, lng]);
    }
    if (latlngs.length >= 3) plots.push({ plotNumber: i + 1, latlngs, areaAcres: Number.isNaN(areaAcres) ? undefined : areaAcres });
  }
  if (plots.length > 0) return plots;
  const singleBlock = str.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  const singleLatlngs = [];
  const singleRegex = /([\d.-]+)\s*,\s*([\d.-]+)/g;
  let singleM;
  while ((singleM = singleRegex.exec(singleBlock)) !== null) {
    const lat = Number(singleM[1]);
    const lng = Number(singleM[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) singleLatlngs.push([lat, lng]);
  }
  if (singleLatlngs.length >= 3) return [{ plotNumber: 1, latlngs: singleLatlngs, areaAcres: undefined }];
  return plots;
}

function plotsFromFeatureCollection(fc) {
  if (fc == null || typeof fc !== "object" || !Array.isArray(fc.features)) return [];
  const result = [];
  fc.features.forEach((f, idx) => {
    if (f?.geometry?.coordinates) {
      const plots = geoJsonToPlots(f.geometry.coordinates);
      plots.forEach((p, i) => result.push({ ...p, plotNumber: p.plotNumber ?? idx * 100 + i + 1 }));
    }
  });
  return result;
}

function extractPlotsFrom(raw) {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const trimmed = String(raw).trim();
    if (/Plot\s+\d+\s*:[\d\s,.;()-]+/i.test(trimmed) || /^[\d.-]+\s*,\s*[\d.-]+(\s*;\s*[\d.-]+\s*,\s*[\d.-]+)+/i.test(trimmed)) {
      const parsed = parseGeoCoordinatesText(trimmed);
      if (parsed.length > 0) return parsed;
    }
    try {
      return extractPlotsFrom(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => extractPlotsFrom(item));
  }
  if (typeof raw === "object") {
    if (raw.plots != null) return normalizePlotsList(raw.plots);
    if (raw.geoboundaries != null) return normalizePlotsList(raw.geoboundaries);
    if (raw.features && raw.type === "FeatureCollection") return plotsFromFeatureCollection(raw);
    if (raw.geometry?.coordinates) {
      const plots = geoJsonToPlots(raw.geometry.coordinates);
      if (plots.length > 0) return plots;
    }
    if (raw.coordinates) {
      const plots = geoJsonToPlots(raw.coordinates);
      if (plots.length > 0) return plots;
    }
    if (raw.geom?.coordinates) {
      const plots = geoJsonToPlots(raw.geom.coordinates);
      if (plots.length > 0) return plots;
    }
  }
  return normalizePlotsList(raw);
}

const PLOT_GEOMETRY_KEYS = [
  "plots", "mapped_details", "mapped_details_geoboundaries", "plot_geoboundaries",
  "mapped_data", "geoboundaries", "plot_boundaries", "boundaries", "polygons",
  "geometry", "geojson", "plot_coordinates", "coordinates", "plot_geometries",
  "lat_lngs", "plot_latlngs", "features", "geojson_plots", "mapped_geoboundaries",
  "plot_polygons", "boundaries_geojson", "geoboundaries_geojson",
  "geo_coordinates", "geom", "the_geom", "geojson_geom", "geom_geojson",
  "shape", "shapes", "multipolygon", "multi_polygon", "plot_geometry", "plot_geometries",
  "boundary_geom", "polygon_geom", "geodata", "location_geom", "area_geom",
  "geoboundary", "mapped_geoboundary", "plot_boundary", "rings", "coords",
];

/** Normalize [lat,lng] vs [lng,lat] so same polygon from different columns dedupes. India: lat ~8–35, lng ~68–97; worldwide: |lat|<=90, |lng|<=180. */
function normalizePointForDedup(c) {
  const a = Number(c[0]);
  const b = Number(c[1]);
  if (a >= 6 && a <= 38 && b >= 65 && b <= 99) return [a, b];
  if (a >= 65 && a <= 99 && b >= 6 && b <= 38) return [b, a];
  if (Math.abs(a) <= 90 && (Math.abs(b) > 90 || b < -180 || b > 180)) return [a, b];
  if ((Math.abs(a) > 90 || a < -180 || a > 180) && Math.abs(b) <= 90) return [b, a];
  return [a, b];
}

const DEDUP_COORD_DECIMALS = 4;

function plotKey(latlngs) {
  const normalized = latlngs.map((c) => normalizePointForDedup(c));
  const rounded = normalized.map((c) => `${c[0].toFixed(DEDUP_COORD_DECIMALS)},${c[1].toFixed(DEDUP_COORD_DECIMALS)}`);
  const unique = [...new Set(rounded)];
  return unique.sort().join("|");
}

export function getPlotsFromRow(row) {
  if (!row) return [];
  const seen = new Map();
  const allPlots = [];
  function addPlots(plots) {
    for (const p of plots) {
      if (!Array.isArray(p.latlngs) || p.latlngs.length < 3) continue;
      const key = plotKey(p.latlngs);
      const existingIdx = seen.get(key);
      const hasArea = p.areaAcres != null && !Number.isNaN(Number(p.areaAcres));
      if (existingIdx !== undefined) {
        const existing = allPlots[existingIdx];
        const existingHasArea = existing.areaAcres != null && !Number.isNaN(Number(existing.areaAcres));
        if (hasArea && !existingHasArea) allPlots[existingIdx] = p;
        continue;
      }
      seen.set(key, allPlots.length);
      allPlots.push(p);
    }
  }
  for (const key of PLOT_GEOMETRY_KEYS) {
    const raw = row[key];
    if (raw == null) continue;
    addPlots(extractPlotsFrom(raw));
  }
  for (const key of Object.keys(row)) {
    if (PLOT_GEOMETRY_KEYS.includes(key)) continue;
    const lower = key.toLowerCase();
    if (lower.includes("mapped") || lower.includes("plot") || lower.includes("boundary") || lower.includes("geo") || lower.includes("polygon") || lower.includes("coordinate") || lower.includes("lat_lng") || lower.includes("feature") || lower.includes("ring") || lower.includes("geom") || lower.includes("shape") || lower.includes("multipolygon")) {
      addPlots(extractPlotsFrom(row[key]));
    }
  }
  for (const key of Object.keys(row)) {
    if (PLOT_GEOMETRY_KEYS.includes(key)) continue;
    const lower = key.toLowerCase();
    if (lower.includes("mapped") || lower.includes("plot") || lower.includes("boundary") || lower.includes("geo") || lower.includes("polygon") || lower.includes("coordinate") || lower.includes("lat_lng") || lower.includes("feature") || lower.includes("ring") || lower.includes("geom") || lower.includes("shape")) continue;
    const val = row[key];
    if (val != null && typeof val === "object" && (Array.isArray(val) || Object.keys(val).length > 0)) {
      addPlots(extractPlotsFrom(val));
    }
  }
  const totalPlots = Number(row.total_plots ?? row.number_of_plots ?? row.totalPlots ?? row.numberOfPlots ?? 0);
  if (totalPlots > 0 && allPlots.length > totalPlots) {
    const withAreaFirst = [...allPlots].sort((a, b) => {
      const aHas = (a.areaAcres != null && !Number.isNaN(Number(a.areaAcres))) ? 1 : 0;
      const bHas = (b.areaAcres != null && !Number.isNaN(Number(b.areaAcres))) ? 1 : 0;
      return bHas - aHas;
    });
    return withAreaFirst.slice(0, totalPlots);
  }
  return allPlots;
}

function escapeKml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildKmlForPlots(plots, plotCodePrefix, farmerData = {}) {
  const farmerCode = escapeKml(String(farmerData?.id ?? farmerData?.farmer_code ?? farmerData?.farmer_id ?? plotCodePrefix));
  const farmerName = escapeKml(String(farmerData?.farmer_name ?? "N/A"));
  const placemarkDescription = `<b>Farmer Code:</b> ${farmerCode}<br/><b>Farmer Name:</b> ${farmerName}`;

  const placemarks = plots
    .filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3)
    .map((p, i) => {
      const plotNum = p.plotNumber ?? (i + 1);
      const name = `${plotCodePrefix}-P${plotNum}`;
      const ring = p.latlngs;
      const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]];
      const coords = closed.map(([lat, lng]) => `${lng},${lat},0`).join(" ");
      return `    <Placemark>
      <name>${escapeKml(name)}</name>
      <description><![CDATA[${placemarkDescription}]]></description>
      <styleUrl>#plotStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    });

  const docDescription = `<b>Farmer Code:</b> ${farmerCode}<br/><b>Farmer Name:</b> ${farmerName}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeKml(plotCodePrefix)} Geoboundaries</name>
    <description><![CDATA[${docDescription}]]></description>
    <Style id="plotStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>7f0000ff</color>
        <fill>1</fill>
      </PolyStyle>
    </Style>
${placemarks.join("\n")}
  </Document>
</kml>`;
}

export async function getCoconutPlantationById(id) {
  if (!supabase) return null;
  let { data, error } = await supabase.from("coconut_plantations").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Supabase coconut_plantations by id:", error.message);
    return null;
  }
  if (!data) {
    const byCode = await supabase.from("coconut_plantations").select("*").eq("farmer_code", id).maybeSingle();
    if (!byCode.error && byCode.data) data = byCode.data;
  }
  return data;
}
