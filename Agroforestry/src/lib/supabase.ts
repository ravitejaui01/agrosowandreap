import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/** Plot shape from Supabase (plots jsonb) - supports camelCase and snake_case */
export interface CoconutPlotRow {
  plotNumber?: number;
  areaAcres?: number;
  latlngs?: [number, number][] | undefined;
  /** Snake_case from DB */
  plot_number?: number;
  area_acres?: number;
  lat_lngs?: [number, number][] | undefined;
  coordinates?: number[][] | number[][][];
  [key: string]: unknown;
}

/** GeoJSON uses [lng, lat]; Leaflet wants [lat, lng]. Convert one ring to [lat, lng][]. */
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

/** GeoJSON MultiPolygon or array of rings: return one plot per polygon so multi-plot farmers show all. */
function geoJsonToPlots(coords: unknown): CoconutPlotRow[] {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const first = coords[0];
  if (!Array.isArray(first)) return [];
  if (first.length >= 3 && typeof first[0] === "number") {
    const ring = geoJsonToLatLngs(coords);
    return ring ? [{ latlngs: ring, plotNumber: 1, areaAcres: undefined }] : [];
  }
  if (first.length >= 3 && Array.isArray(first[0])) {
    const plots: CoconutPlotRow[] = [];
    for (let i = 0; i < coords.length; i++) {
      const ring = geoJsonToLatLngs(coords[i]);
      if (ring) plots.push({ latlngs: ring, plotNumber: i + 1, areaAcres: undefined });
    }
    return plots;
  }
  return [];
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
  /** Supabase coconut_plantations may have total_plots (e.g. from Colab upload) */
  total_plots?: number;
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

/** Extract plots array from GeoJSON FeatureCollection; each feature can be Polygon or MultiPolygon */
function plotsFromFeatureCollection(fc: unknown): CoconutPlotRow[] {
  if (fc == null || typeof fc !== "object" || !Array.isArray((fc as { features?: unknown }).features)) return [];
  const features = (fc as { features: unknown[] }).features;
  const result: CoconutPlotRow[] = [];
  features.forEach((f, idx) => {
    if (f && typeof f === "object" && "geometry" in f) {
      const geom = (f as { geometry: { type?: string; coordinates?: unknown } }).geometry;
      if (geom && Array.isArray(geom.coordinates)) {
        const plots = geoJsonToPlots(geom.coordinates);
        plots.forEach((p, i) => result.push({ ...p, plotNumber: p.plotNumber ?? idx * 100 + i + 1 }));
      }
    }
  });
  return result;
}

/**
 * Parse geo_coordinates text format: "Plot 1: lat,lng;lat,lng;... (X acres); Plot 2: ..."
 * Returns one CoconutPlotRow per plot with latlngs as [lat, lng][].
 */
function parseGeoCoordinatesText(text: string): CoconutPlotRow[] {
  const plots: CoconutPlotRow[] = [];
  const str = String(text).trim();
  if (!str) return plots;
  const plotBlocks = str.split(/\s*;\s*Plot\s+\d+\s*:\s*/i).filter(Boolean);
  for (let i = 0; i < plotBlocks.length; i++) {
    const block = plotBlocks[i].replace(/^\s*Plot\s+\d+\s*:\s*/i, "").trim();
    const acresMatch = block.match(/\s*\(([\d.]+)\s*acres?\)\s*$/i);
    const areaAcres = acresMatch ? Number(acresMatch[1]) : undefined;
    const pairs = block.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const latlngs: [number, number][] = [];
    const regex = /([\d.-]+)\s*,\s*([\d.-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(pairs)) !== null) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) latlngs.push([lat, lng]);
    }
    if (latlngs.length >= 3) {
      plots.push({ plotNumber: i + 1, latlngs, areaAcres: Number.isNaN(Number(areaAcres)) ? undefined : Number(areaAcres) });
    }
  }
  if (plots.length > 0) return plots;
  const singleBlock = str.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  const singleLatlngs: [number, number][] = [];
  const singleRegex = /([\d.-]+)\s*,\s*([\d.-]+)/g;
  let singleM: RegExpExecArray | null;
  while ((singleM = singleRegex.exec(singleBlock)) !== null) {
    const lat = Number(singleM[1]);
    const lng = Number(singleM[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) singleLatlngs.push([lat, lng]);
  }
  if (singleLatlngs.length >= 3) {
    return [{ plotNumber: 1, latlngs: singleLatlngs, areaAcres: undefined }];
  }
  return plots;
}

/** Try to get plots from any candidate value (array, object with plots/geoboundaries/features) */
function extractPlotsFrom(raw: unknown): CoconutPlotRow[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const trimmed = (raw as string).trim();
    if (/Plot\s+\d+\s*:[\d\s,.;()-]+/i.test(trimmed) || /^[\d.-]+\s*,\s*[\d.-]+(\s*;\s*[\d.-]+\s*,\s*[\d.-]+)+/i.test(trimmed)) {
      const parsed = parseGeoCoordinatesText(trimmed);
      if (parsed.length > 0) return parsed;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      return extractPlotsFrom(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => extractPlotsFrom(item));
  }
  if (typeof raw === "object") {
    if ("plots" in raw) return normalizePlotsList((raw as { plots: unknown }).plots);
    if ("geoboundaries" in raw) return normalizePlotsList((raw as { geoboundaries: unknown }).geoboundaries);
    if ("features" in raw && (raw as { type?: string }).type === "FeatureCollection") {
      return plotsFromFeatureCollection(raw);
    }
    if ("geometry" in raw) {
      const geom = (raw as { geometry: { coordinates?: unknown } }).geometry;
      if (geom && typeof geom === "object" && Array.isArray((geom as { coordinates?: unknown }).coordinates)) {
        const plots = geoJsonToPlots((geom as { coordinates: unknown }).coordinates);
        if (plots.length > 0) return plots;
      }
    }
    if ("coordinates" in raw) {
      const plots = geoJsonToPlots((raw as { coordinates: unknown }).coordinates);
      if (plots.length > 0) return plots;
    }
    if ("geom" in raw) {
      const g = (raw as { geom: unknown }).geom;
      if (g != null && typeof g === "object" && Array.isArray((g as { coordinates?: unknown }).coordinates)) {
        const plots = geoJsonToPlots((g as { coordinates: unknown }).coordinates);
        if (plots.length > 0) return plots;
      }
    }
  }
  return normalizePlotsList(raw);
}

/** All coconut_plantations columns that may hold multi-plot geometry (Supabase / Colab / PostGIS) */
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
function normalizePointForDedup(c: [number, number]): [number, number] {
  const a = Number(c[0]);
  const b = Number(c[1]);
  if (a >= 6 && a <= 38 && b >= 65 && b <= 99) return [a, b];
  if (a >= 65 && a <= 99 && b >= 6 && b <= 38) return [b, a];
  if (Math.abs(a) <= 90 && (Math.abs(b) > 90 || b < -180 || b > 180)) return [a, b];
  if ((Math.abs(a) > 90 || a < -180 || a > 180) && Math.abs(b) <= 90) return [b, a];
  return [a, b];
}

const DEDUP_COORD_DECIMALS = 4;

/** Build a stable key for a polygon so duplicates (same shape from different columns) collapse. Uses 4 decimals and unique points so closed rings match. */
function plotKey(latlngs: [number, number][]): string {
  const normalized = latlngs.map((c) => normalizePointForDedup(c));
  const rounded = normalized.map((c) => `${c[0].toFixed(DEDUP_COORD_DECIMALS)},${c[1].toFixed(DEDUP_COORD_DECIMALS)}`);
  const unique = [...new Set(rounded)];
  return unique.sort().join("|");
}

export interface GetPlotsFromRowOptions {
  /** When true (default), cap result to row total_plots/number_of_plots when set. Set false for KML export so all plots are included. */
  capByTotalPlots?: boolean;
}

/** Get normalized plots from a row: collects from ALL columns and array elements so every farmer with multiple plots gets correct count and all polygons in Excel, KML, and map */
export function getPlotsFromRow(
  row: CoconutPlantationRow | null | undefined,
  options?: GetPlotsFromRowOptions
): CoconutPlotRow[] {
  if (!row) return [];
  const capByTotalPlots = options?.capByTotalPlots !== false;
  const r = row as Record<string, unknown>;
  const allPlots: CoconutPlotRow[] = [];
  const seen = new Map<string, number>(); // key -> index in allPlots

  function addPlots(plots: CoconutPlotRow[]) {
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

  function tryValue(val: unknown) {
    if (val == null) return;
    addPlots(extractPlotsFrom(val));
  }

  for (const key of PLOT_GEOMETRY_KEYS) {
    tryValue(r[key]);
  }
  for (const key of Object.keys(r)) {
    if (PLOT_GEOMETRY_KEYS.includes(key)) continue;
    const lower = key.toLowerCase();
    if (lower.includes("mapped") || lower.includes("plot") || lower.includes("boundary") || lower.includes("geo") || lower.includes("polygon") || lower.includes("coordinate") || lower.includes("lat_lng") || lower.includes("feature") || lower.includes("ring") || lower.includes("geom") || lower.includes("shape") || lower.includes("multipolygon")) {
      tryValue(r[key]);
    }
  }
  for (const key of Object.keys(r)) {
    if (PLOT_GEOMETRY_KEYS.includes(key)) continue;
    const lower = key.toLowerCase();
    if (lower.includes("mapped") || lower.includes("plot") || lower.includes("boundary") || lower.includes("geo") || lower.includes("polygon") || lower.includes("coordinate") || lower.includes("lat_lng") || lower.includes("feature") || lower.includes("ring") || lower.includes("geom") || lower.includes("shape")) continue;
    const val = r[key];
    if (val != null && typeof val === "object" && (Array.isArray(val) || Object.keys(val as object).length > 0)) {
      tryValue(val);
    }
  }
  if (capByTotalPlots) {
    const totalPlots = Number((r.total_plots ?? r.number_of_plots ?? r.totalPlots ?? r.numberOfPlots) ?? 0);
    if (totalPlots > 0 && allPlots.length > totalPlots) {
      const withAreaFirst = [...allPlots].sort((a, b) => {
        const aHas = a.areaAcres != null && !Number.isNaN(Number(a.areaAcres)) ? 1 : 0;
        const bHas = b.areaAcres != null && !Number.isNaN(Number(b.areaAcres)) ? 1 : 0;
        return bHas - aHas;
      });
      return withAreaFirst.slice(0, totalPlots);
    }
  }
  return allPlots;
}

const PAGE_SIZE = 1000;

/**
 * Fetch all rows from coconut_plantations (Supabase only — source of truth for validator/farmers).
 * Uses cursor-based pagination to avoid large OFFSETs and statement timeouts.
 */
export async function getCoconutPlantationsFromSupabase(): Promise<CoconutPlantationRow[]> {
  if (!supabase) {
    console.warn("Supabase not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
    return [];
  }
  const all: CoconutPlantationRow[] = [];
  let cursorCreatedAt: string | null = null;
  let hasMore = true;
  while (hasMore) {
    let q = supabase
      .from("coconut_plantations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (cursorCreatedAt != null) {
      q = q.lt("created_at", cursorCreatedAt);
    }
    const { data, error } = await q;
    if (error) {
      console.error("Supabase coconut_plantations error:", error.message);
      break;
    }
    const page = (data ?? []) as CoconutPlantationRow[];
    all.push(...page);
    hasMore = page.length === PAGE_SIZE;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1];
      const raw = last.created_at ?? (last as Record<string, unknown>).createdAt;
      cursorCreatedAt = raw != null ? String(raw) : null;
      if (cursorCreatedAt == null) hasMore = false;
    }
  }
  return all;
}

/** Fetch one row from coconut_plantations by id (or farmer_code); Supabase only. */
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

/** Fetch all farmer records from Supabase (with camelCase aliases for UI). */
export async function getFarmerRecordsFromSupabase(): Promise<any[]> {
  if (!supabase) {
    console.warn("Supabase not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
    return [];
  }
  const { data, error } = await supabase
    .from("farmer_records")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase farmer_records error:", error.message);
    return [];
  }
  const rows = data || [];
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    farmerId: r.farmer_id ?? r.farmerId,
    firstName: r.first_name ?? r.firstName,
    lastName: r.last_name ?? r.lastName,
    createdAt: r.created_at ?? r.createdAt,
  }));
}

/** Delete a farmer record from Supabase */
export async function deleteFarmerRecord(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("farmer_records")
    .delete()
    .eq("id", id);
  return !error;
}

/**
 * Supabase Storage: bucket "documents".
 * Convention: folder = farmer id (e.g. 30809), files = {id}_{type}.ext
 * (e.g. 30809_aadhaar.png, 30809_agreement.pdf, 30809_bank.png, 30809_rtc.pdf).
 */
const DOCUMENTS_BUCKET = "documents";

const DOCUMENTS_SIGNED_URL_EXPIRY_SEC = 3600; // 1 hour

/** Public URL for a storage file path. Use for public buckets. */
function getDocumentPublicUrl(path: string): string {
  if (!supabase) return "";
  const hasExt = /\.(pdf|png|jpg|jpeg|gif|webp|bmp|tiff?|heic)$/i.test(path.split("/").pop() ?? "");
  if (!hasExt) return "";
  const { data } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Signed URL for a storage file path. Use for private buckets to avoid 404. */
async function getDocumentSignedUrl(path: string): Promise<string> {
  if (!supabase) return "";
  const hasExt = /\.(pdf|png|jpg|jpeg|gif|webp|bmp|tiff?|heic)$/i.test(path.split("/").pop() ?? "");
  if (!hasExt) return getDocumentPublicUrl(path);
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, DOCUMENTS_SIGNED_URL_EXPIRY_SEC);
  if (error || !data?.signedUrl) return getDocumentPublicUrl(path);
  return data.signedUrl;
}

/** List documents in bucket "documents" under folder {farmerCode}. Returns URLs. Retries once on error (e.g. 429/544). */
export async function listDocumentsByFarmerCode(
  farmerCode: string,
  retried = false,
  /** When true, use public URLs only (no signed URL calls) — much faster for CSV export */
  usePublicUrls = false
): Promise<{ path: string; name: string; url: string }[]> {
  if (!supabase) return [];
  const folderPath = String(farmerCode ?? "").trim();
  if (!folderPath) return [];

  const files: { path: string; name: string }[] = [];
  let firstListError: string | null = null;
  let rateLimited = false;
  const hasFileExtension = (name: string) => /\.(pdf|png|jpg|jpeg|gif|webp|bmp|tiff?|heic)$/i.test(name);

  const addFile = (path: string, name: string) => {
    files.push({ path, name });
  };

  const is429 = (msg: string) => /429|too many requests/i.test(msg);

  const LIST_PAGE_SIZE = 1000;
  const collectFromFolder = async (folderName: string) => {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: list, error } = supabase!.storage
        .from(DOCUMENTS_BUCKET)
        .list(folderName, { limit: LIST_PAGE_SIZE, offset });
      if (error) {
        if (!firstListError) firstListError = error.message;
        if (is429(error.message)) rateLimited = true;
        return;
      }
      const items = list ?? [];
      for (const f of items) {
        if (!f.name) continue;
        const fullPath = folderName ? `${folderName}/${f.name}` : f.name;
        if (hasFileExtension(f.name)) {
          addFile(fullPath, f.name);
        } else {
          let subOffset = 0;
          let subMore = true;
          while (subMore) {
            const { data: subList } = supabase!.storage.from(DOCUMENTS_BUCKET).list(fullPath, { limit: LIST_PAGE_SIZE, offset: subOffset });
            if (subList?.length) {
              for (const sub of subList) {
                if (!sub.name || !hasFileExtension(sub.name)) continue;
                const subPath = `${fullPath}/${sub.name}`;
                addFile(subPath, sub.name);
              }
              subMore = subList.length === LIST_PAGE_SIZE;
              subOffset += subList.length;
            } else {
              subMore = false;
            }
          }
        }
      }
      hasMore = items.length === LIST_PAGE_SIZE;
      offset += items.length;
    }
  };

  await collectFromFolder(folderPath);

  // If direct folder empty, try common folder name variants (field app may use different naming)
  if (files.length === 0 && folderPath) {
    const folderVariants = [
      `farmer_${folderPath}`,
      `Farmer_${folderPath}`,
      `farmer${folderPath}`,
      `Farmer${folderPath}`,
      `${folderPath}_docs`,
      `docs_${folderPath}`,
      `${folderPath}_documents`,
      `Farmer-${folderPath}`,
      `farmer-${folderPath}`,
      `upload_${folderPath}`,
      `${folderPath}_upload`,
      `doc_${folderPath}`,
      `${folderPath}_doc`,
    ];
    for (const variant of folderVariants) {
      await collectFromFolder(variant);
      if (files.length > 0) break;
    }
  }

  // If still empty, try root list: find a folder that matches farmer code then list it (limit 10000 to avoid missing e.g. 30809)
  if (files.length === 0 && folderPath) {
    const { data: rootList, error: rootError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list("", { limit: 10000 });
    if (rootError && is429(rootError.message)) rateLimited = true;
    if (!rootError && rootList?.length) {
      const folderLower = folderPath.toLowerCase();
      for (const f of rootList) {
        if (!f.name) continue;
        const name = f.name;
        const nameLower = name.toLowerCase();
        const exactOrPrefixSuffix =
          name === folderPath ||
          name === `farmer_${folderPath}` ||
          nameLower === `farmer_${folderLower}` ||
          name.startsWith(`${folderPath}_`) ||
          name.endsWith(`_${folderPath}`) ||
          nameLower.replace(/^farmer_/, "") === folderLower ||
          nameLower.replace(/_docs$/, "") === folderLower;
        // Simple string matching instead of complex regex to avoid character class errors
        const containsCode = !hasFileExtension(name) && (
          name.includes(folderPath) || 
          name.includes(`farmer_${folderPath}`) ||
          name.includes(`${folderPath}_`) ||
          name.includes(`_${folderPath}`) ||
          name.toLowerCase().includes(folderLower)
        );
        if (exactOrPrefixSuffix || containsCode) {
          await collectFromFolder(name);
          if (files.length > 0) break;
        }
      }
    }
  }

  // Flat structure: files at root with prefix e.g. 22071_aadhaar.png (paginate so all documents display)
  if (files.length === 0 && folderPath) {
    const prefix = folderPath + "_";
    let rootOffset = 0;
    let rootMore = true;
    while (rootMore) {
      const { data: rootList, error: rootError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .list("", { limit: LIST_PAGE_SIZE, offset: rootOffset });
      if (rootError) {
        if (is429(rootError.message)) rateLimited = true;
        break;
      }
      const items = rootList ?? [];
      for (const f of items) {
        if (!f.name) continue;
        const name = f.name;
        const isFile = hasFileExtension(name);
        if (isFile && (name.startsWith(prefix) || name.startsWith(folderPath + ".") || name === folderPath)) {
          addFile(name, name);
        }
      }
      rootMore = items.length === LIST_PAGE_SIZE;
      rootOffset += items.length;
    }
  }

  // On 429 Too Many Requests: retry once after a longer delay to avoid rate limit
  if (rateLimited && !retried) {
    await new Promise((r) => setTimeout(r, 2800));
    return listDocumentsByFarmerCode(farmerCode, true, usePublicUrls);
  }
  // On other storage error when no files: retry once after a short delay
  if (files.length === 0 && firstListError) {
    if (!retried) {
      await new Promise((r) => setTimeout(r, 1500));
      return listDocumentsByFarmerCode(farmerCode, true, usePublicUrls);
    }
    console.warn("[documents] list failed for folder:", folderPath, firstListError);
    return [];
  }

  // Deduplicate by path and build result (signed URLs for detail view, public URLs for fast export)
  const seen = new Set<string>();
  const uniqueFiles: { path: string; name: string }[] = [];
  for (const { path, name } of files) {
    if (seen.has(path)) continue;
    seen.add(path);
    uniqueFiles.push({ path, name });
  }
  if (usePublicUrls) {
    return uniqueFiles.map((f) => ({ path: f.path, name: f.name, url: getDocumentPublicUrl(f.path) }));
  }
  const urls = await Promise.all(
    uniqueFiles.map((f) => getDocumentSignedUrl(f.path))
  );
  return uniqueFiles.map((f, i) => ({ path: f.path, name: f.name, url: urls[i] ?? getDocumentPublicUrl(f.path) }));
}

/** List top-level folder/item names in the documents bucket (each = one farmer's uploads). */
export async function listDocumentsBucketFolderNames(): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data: list, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list("", { limit: 10000 });
    if (error) return [];
    return (list ?? []).map((f) => String(f?.name ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

/** Count top-level folders in the documents bucket (each folder = one farmer's uploads). */
export async function countDocumentsBucketFolders(): Promise<number> {
  const names = await listDocumentsBucketFolderNames();
  return names.length;
}

const STORAGE_POLICY_SQL = `
DROP POLICY IF EXISTS "Allow read documents bucket" ON storage.objects;
CREATE POLICY "Allow read documents bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );
`;

/** Apply storage policy so the app can list/read the "documents" bucket. Requires exec_sql RPC. */
export async function applyStorageDocumentsPolicy(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const { error } = await supabase.rpc("exec_sql", { sql_query: STORAGE_POLICY_SQL });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Create or update a farmer record in farmer_records when validator approves (so it shows in Validator Records). */
export async function createFarmerRecordInSupabase(
  coconutData: CoconutPlantationRow,
  status: "submitted" | "approved" = "approved"
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const farmerId = String(coconutData.farmer_code ?? coconutData.farmer_id ?? coconutData.id ?? "").trim();
  const recordId = `fr-${coconutData.id ?? farmerId ?? crypto.randomUUID()}`;
  const parts = (coconutData.farmer_name ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") ?? "";

  const recordData = {
    id: recordId,
    farmer_id: farmerId || recordId,
    first_name: firstName || "—",
    last_name: lastName,
    phone_number: coconutData.phone ?? coconutData.phone_number ?? "",
    district: coconutData.district ?? "",
    state: (coconutData as Record<string, unknown>).state ?? "",
    village: coconutData.village ?? "",
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date_of_plantation: coconutData.date_of_plantation,
    agent_name: coconutData.agent_name,
    total_area_hectares: coconutData.total_area_hectares ?? (coconutData as Record<string, unknown>).total_area_hectares,
    area_under_coconut_hectares: coconutData.area_under_coconut_hectares ?? (coconutData as Record<string, unknown>).area_under_coconut_hectares,
    created_by: (coconutData as Record<string, unknown>).created_by ?? "data_validator",
  };

  const { error } = await supabase
    .from("farmer_records")
    .upsert(recordData, { onConflict: "farmer_id", ignoreDuplicates: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Update coconut plantation status to submitted when approved */
export async function updateCoconutPlantationStatus(
  id: number | string,
  status: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  
  const { error } = await supabase
    .from("coconut_plantations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Clear all farmer records from Supabase for fresh start */
export async function clearAllFarmerRecords(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  
  try {
    // Delete from all related tables in correct order to avoid foreign key constraints
    const { error: historyError } = await supabase
      .from("validation_history")
      .delete()
      .neq("id", ""); // Delete all records
    
    const { error: docsError } = await supabase
      .from("documents")
      .delete()
      .neq("id", ""); // Delete all records
    
    const { error: recordsError } = await supabase
      .from("farmer_records")
      .delete()
      .neq("id", ""); // Delete all records

    if (historyError) return { ok: false, error: `History: ${historyError.message}` };
    if (docsError) return { ok: false, error: `Documents: ${docsError.message}` };
    if (recordsError) return { ok: false, error: `Records: ${recordsError.message}` };
    
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
