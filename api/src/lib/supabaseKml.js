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

function plotsFromFeatureCollection(fc) {
  if (fc == null || typeof fc !== "object" || !Array.isArray(fc.features)) return [];
  return fc.features.map((f) => {
    if (f?.geometry?.coordinates) {
      const latlngs = geoJsonToLatLngs(f.geometry.coordinates);
      if (latlngs) return { latlngs, plotNumber: undefined, areaAcres: undefined };
    }
    return null;
  }).filter(Boolean);
}

function extractPlotsFrom(raw) {
  if (raw == null) return [];
  if (typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.plots != null) return normalizePlotsList(raw.plots);
    if (raw.geoboundaries != null) return normalizePlotsList(raw.geoboundaries);
    if (raw.features && raw.type === "FeatureCollection") return plotsFromFeatureCollection(raw);
    if (raw.coordinates) {
      const latlngs = geoJsonToLatLngs(raw.coordinates);
      if (latlngs) return [{ latlngs, plotNumber: 1, areaAcres: undefined }];
    }
  }
  return normalizePlotsList(raw);
}

const KNOWN_KEYS = [
  "plots", "mapped_details", "mapped_details_geoboundaries", "plot_geoboundaries",
  "mapped_data", "geoboundaries", "plot_boundaries", "boundaries", "polygons",
  "geometry", "geojson", "plot_coordinates", "coordinates", "plot_geometries",
];

export function getPlotsFromRow(row) {
  if (!row) return [];
  for (const key of KNOWN_KEYS) {
    const raw = row[key];
    if (raw == null) continue;
    const plots = extractPlotsFrom(raw);
    if (plots.length > 0) return plots;
  }
  for (const key of Object.keys(row)) {
    if (KNOWN_KEYS.includes(key)) continue;
    const lower = key.toLowerCase();
    if (lower.includes("mapped") || lower.includes("plot") || lower.includes("boundary") || lower.includes("geo") || lower.includes("polygon") || lower.includes("coordinate")) {
      const plots = extractPlotsFrom(row[key]);
      if (plots.length > 0) return plots;
    }
  }
  return [];
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

  const docDescription = `
<b>Farmer Information</b><br/>
<b>Farmer ID:</b> ${escapeKml(farmerData?.id ?? farmerData?.farmer_code ?? plotCodePrefix)}<br/>
<b>Generated:</b> ${new Date().toLocaleDateString()}<br/>
<b>Source:</b> Agroforestry Management System
  `.trim();

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
