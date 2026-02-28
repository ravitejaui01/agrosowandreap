import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/** Plot shape from Supabase (plots jsonb) - supports camelCase and snake_case */
export interface CoconutPlotRow {
  plotNumber?: number;
  areaAcres?: number;
  latlngs?: [number, number][];
  /** Snake_case from DB */
  plot_number?: number;
  area_acres?: number;
  lat_lngs?: [number, number][];
  coordinates?: number[][] | number[][][];
  [key: string]: unknown;
}

/** GeoJSON uses [lng, lat]; Leaflet wants [lat, lng]. Convert geometry/coordinates to [lat, lng][]. */
function geoJsonToLatLngs(coords: unknown): [number, number][] | undefined {
  if (!Array.isArray(coords)) return undefined;
  let ring: number[][] | undefined;
  if (coords.length > 0 && Array.isArray(coords[0])) {
    const first = coords[0];
    if (first.length >= 3 && Array.isArray(first[0])) {
      ring = first as number[][];
    } else if (coords.length >= 3 && typeof coords[0][0] === "number") {
      ring = coords as number[][];
    }
  }
  if (!ring || ring.length < 3) return undefined;
  return ring.map((c) => {
    const [a, b] = Array.isArray(c) ? c : [0, 0];
    return [Number(b), Number(a)] as [number, number];
  });
}

/** Normalize raw plot from DB (snake_case or camelCase) to CoconutPlotRow with latlngs */
export function normalizePlot(raw: unknown): CoconutPlotRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let latlngs: [number, number][] | undefined =
    (o.latlngs as [number, number][] | undefined) ??
    (o.lat_lngs as [number, number][] | undefined);
  if (!latlngs && Array.isArray(o.coordinates)) latlngs = geoJsonToLatLngs(o.coordinates);
  if (!latlngs && o.geometry && typeof o.geometry === "object" && Array.isArray((o.geometry as { coordinates?: unknown }).coordinates)) {
    latlngs = geoJsonToLatLngs((o.geometry as { coordinates: unknown }).coordinates);
  }
  if (Array.isArray(latlngs) && latlngs.length > 0) {
    latlngs = latlngs.filter((c) => Array.isArray(c) && c.length >= 2).map((c) => [Number(c[0]), Number(c[1])] as [number, number]);
    if (latlngs.length < 3) latlngs = undefined;
  } else {
    latlngs = undefined;
  }
  return {
    plotNumber: Number(o.plotNumber ?? o.plot_number ?? 0) || undefined,
    areaAcres: o.areaAcres != null ? Number(o.areaAcres) : o.area_acres != null ? Number(o.area_acres) : undefined,
    latlngs,
  };
}

/** Parse and normalize plots array from row (handles string JSON or array, snake_case or camelCase) */
export function normalizePlotsList(plots: unknown): CoconutPlotRow[] {
  if (plots == null) return [];
  let arr: unknown[] = [];
  if (typeof plots === "string") {
    try {
      arr = JSON.parse(plots) ?? [];
    } catch {
      return [];
    }
  } else if (Array.isArray(plots)) {
    arr = plots;
  } else {
    return [];
  }
  return arr.map(normalizePlot).filter((p): p is CoconutPlotRow => p != null);
}

/** Row from Supabase coconut_plantations table (snake_case from DB) */
export interface CoconutPlantationRow {
  id?: string;
  farmer_code?: string;
  farmer_id?: string;
  farmer_name?: string;
  phone?: string;
  aadhaar?: string;
  agent_name?: string;
  district?: string;
  block_tehsil_mandal?: string;
  village?: string;
  date_of_plantation?: string;
  spacing?: string;
  seedlings_planted?: number;
  seedlings_survived?: number;
  total_area_hectares?: number;
  area_under_coconut_hectares?: number;
  number_of_plots?: number;
  state?: string;
  created_at?: string;
  created_by?: string;
  plots?: CoconutPlotRow[] | unknown;
  /** Mapped details / geoboundaries (Supabase may use this column for plot polygons) */
  mapped_details?: unknown;
  mapped_details_geoboundaries?: unknown;
  plot_geoboundaries?: unknown;
  location?: { lat: number; lng: number; accuracy?: number } | null;
  [key: string]: unknown;
}

/** Extract plots array from GeoJSON FeatureCollection */
function plotsFromFeatureCollection(fc: unknown): CoconutPlotRow[] {
  if (fc == null || typeof fc !== "object" || !Array.isArray((fc as { features?: unknown }).features)) return [];
  const features = (fc as { features: unknown[] }).features;
  return features.map((f) => {
    if (f && typeof f === "object" && "geometry" in f) {
      const geom = (f as { geometry: { type?: string; coordinates?: unknown } }).geometry;
      if (geom && Array.isArray(geom.coordinates)) {
        const latlngs = geoJsonToLatLngs(geom.coordinates);
        return { latlngs, plotNumber: undefined, areaAcres: undefined };
      }
    }
    return null;
  }).filter((p): p is CoconutPlotRow => p != null);
}

/** Try to get plots from any candidate value (array, object with plots/geoboundaries/features) */
function extractPlotsFrom(raw: unknown): CoconutPlotRow[] {
  if (raw == null) return [];
  if (typeof raw === "object" && !Array.isArray(raw)) {
    if ("plots" in raw) return normalizePlotsList((raw as { plots: unknown }).plots);
    if ("geoboundaries" in raw) return normalizePlotsList((raw as { geoboundaries: unknown }).geoboundaries);
    if ("features" in raw && (raw as { type?: string }).type === "FeatureCollection") {
      return plotsFromFeatureCollection(raw);
    }
    if ("coordinates" in raw) {
      const latlngs = geoJsonToLatLngs((raw as { coordinates: unknown }).coordinates);
      if (latlngs) return [{ latlngs, plotNumber: 1, areaAcres: undefined }];
    }
  }
  return normalizePlotsList(raw);
}

/** Get normalized plots from a row: tries known columns then any key that might hold geo data */
export function getPlotsFromRow(row: CoconutPlantationRow | null | undefined): CoconutPlotRow[] {
  if (!row) return [];
  const r = row as Record<string, unknown>;
  const knownKeys = [
    "plots", "mapped_details", "mapped_details_geoboundaries", "plot_geoboundaries",
    "mapped_data", "geoboundaries", "plot_boundaries", "boundaries", "polygons",
    "geometry", "geojson", "plot_coordinates", "coordinates", "plot_geometries",
  ];
  for (const key of knownKeys) {
    const raw = r[key];
    if (raw == null) continue;
    const plots = extractPlotsFrom(raw);
    if (plots.length > 0) return plots;
  }
  for (const key of Object.keys(r)) {
    if (knownKeys.includes(key)) continue;
    const lower = key.toLowerCase();
    if (lower.includes("mapped") || lower.includes("plot") || lower.includes("boundary") || lower.includes("geo") || lower.includes("polygon") || lower.includes("coordinate")) {
      const plots = extractPlotsFrom(r[key]);
      if (plots.length > 0) return plots;
    }
  }
  return [];
}

const PAGE_SIZE = 1000;

/** Fetch all rows from coconut_plantations table in Supabase (paginates to get full count, e.g. 15,330+) */
export async function getCoconutPlantationsFromSupabase(): Promise<CoconutPlantationRow[]> {
  if (!supabase) {
    console.warn("Supabase not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
    return [];
  }
  const all: CoconutPlantationRow[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("coconut_plantations")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      console.error("Supabase coconut_plantations error:", error.message);
      break;
    }
    const page = (data ?? []) as CoconutPlantationRow[];
    all.push(...page);
    hasMore = page.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return all;
}

/** Fetch one row from coconut_plantations by id (or farmer_code if id match fails) */
export async function getCoconutPlantationByIdFromSupabase(
  id: string
): Promise<CoconutPlantationRow | null> {
  if (!supabase) return null;
  let { data, error } = await supabase
    .from("coconut_plantations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Supabase coconut_plantations by id error:", error.message);
    return null;
  }
  if (!data) {
    const byCode = await supabase
      .from("coconut_plantations")
      .select("*")
      .eq("farmer_code", id)
      .maybeSingle();
    if (!byCode.error && byCode.data) {
      data = byCode.data;
    }
  }
  return data as CoconutPlantationRow | null;
}

/**
 * Supabase Storage: public bucket "documents", path {farmerCode}/{filename}.
 * Example: https://xxx.supabase.co/storage/v1/object/public/documents/23832/23832_agreement.pdf
 */
const DOCUMENTS_BUCKET = "documents";

/** List documents in bucket "documents" under folder {farmerCode}. Returns public URLs for each file. */
export async function listDocumentsByFarmerCode(
  farmerCode: string
): Promise<{ path: string; name: string; url: string }[]> {
  if (!supabase) return [];
  const folderPath = farmerCode;
  const { data: list, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list(folderPath, { limit: 100 });
  if (error) {
    console.warn("Supabase storage list error:", error.message);
    return [];
  }
  const result: { path: string; name: string; url: string }[] = [];
  for (const f of list ?? []) {
    if (!f.name) continue;
    const path = `${folderPath}/${f.name}`;
    const { data: urlData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
    result.push({ path, name: f.name, url: urlData.publicUrl });
  }
  return result;
}
