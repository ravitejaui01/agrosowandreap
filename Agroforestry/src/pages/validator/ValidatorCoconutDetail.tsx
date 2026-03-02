import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCoconutPlantationByIdFromSupabase, getCoconutPlantationsFromSupabase, listDocumentsByFarmerCode, getPlotsFromRow } from "@/lib/supabase";
import type { CoconutPlantationRow, CoconutPlotRow } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapContainer, TileLayer, Polygon, useMap, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { ChevronDown, ArrowLeft, Map, FileText, Download, ZoomIn, ZoomOut, Layers, Maximize2 } from "lucide-react";
import { buildKmlForPlots, downloadKml } from "@/lib/kml";

function MapBounds({ polygons }: { polygons: CoconutPlotRow[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (polygons.length === 0) return;
    
    const validPolygons = polygons.filter(p => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
    if (validPolygons.length === 0) return;
    
    const allBounds = validPolygons.map(p => {
      const coords = p.latlngs!.map(([lat, lng]) => [lat, lng] as [number, number]);
      return L.latLngBounds(coords);
    });
    
    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds), allBounds[0]);
      // Fit bounds with max zoom to prevent overzooming
      map.fitBounds(combinedBounds, { 
        padding: [80, 80],
        maxZoom: 18 // Prevent zooming in too far
      });
    }
  }, [map, polygons]);
  
  return null;
}

function MapControls() {
  const map = useMap();

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();
  const toggleFullscreen = () => {
    const mapContainer = map.getContainer();
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ top: '10px', right: '10px', zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar bg-white shadow-md rounded">
        <button
          onClick={zoomIn}
          className="leaflet-control-zoom-in p-2 hover:bg-gray-100 border-b"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={zoomOut}
          className="leaflet-control-zoom-out p-2 hover:bg-gray-100 border-b"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 hover:bg-gray-100"
          title="Toggle fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PlotGeoboundariesModal({
  open,
  onOpenChange,
  plots,
  farmerData,
  totalAreaHa,
  totalGeoboundariesHa,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plots: CoconutPlotRow[];
  farmerData?: Record<string, unknown> | null;
  totalAreaHa?: number;
  totalGeoboundariesHa?: number;
}) {
  const polygons = useMemo(() => {
    return (plots ?? []).filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
  }, [plots]);
  const center: [number, number] = useMemo(() => {
    if (polygons.length === 0) return [12.97, 77.59];
    const all = polygons.flatMap((p) => p.latlngs ?? []);
    const lats = all.map((c) => c[0]);
    const lngs = all.map((c) => c[1]);
    return [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];
  }, [polygons]);

  const formatFarmerDetail = (key: string, value: unknown) => {
    if (value == null || value === "" || String(value).toLowerCase() === "undefined") return null;
    return (
      <div key={key} className="flex justify-between gap-4">
        <span className="font-medium text-gray-700">{key}:</span>
        <span className="text-gray-900">{String(value)}</span>
      </div>
    );
  };

  const getLandDetails = () => {
    const landOwnership = farmerData?.land_ownership ?? farmerData?.landOwnership ?? farmerData?.ownership;
    const landPatta = farmerData?.land_patta_survey_number ?? farmerData?.landPattaSurveyNumber ?? farmerData?.patta_survey ?? farmerData?.survey_number;
    const landArea = farmerData?.land_area_hectares ?? farmerData?.landAreaHectares ?? farmerData?.land_size;
    
    return {
      ownership: landOwnership,
      patta: landPatta,
      area: landArea
    };
  };

  const landDetails = getLandDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-4">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Plot Geoboundaries Details
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 rounded-md overflow-hidden border">
          <MapContainer
            center={center}
            zoom={13}
            className="h-full w-full min-h-[600px]"
            scrollWheelZoom={true}
            style={{ background: '#1a1a1a' }}
          >
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              minZoom={3}
            />
            <TileLayer
              attribution="© Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
              minZoom={3}
              zIndex={1}
            />
            {polygons.map((p, i) => (
              <Polygon
                key={i}
                positions={(p.latlngs ?? []).map((c) => [c[0], c[1]] as [number, number])}
                pathOptions={{
                  color: i === 0 ? "#dc2626" : "#f59e0b",
                  fillColor: i === 0 ? "#dc2626" : "#f59e0b",
                  fillOpacity: 0.25,
                  weight: 3,
                  opacity: 0.9,
                  dashArray: i === 0 ? undefined : "10, 5",
                  className: "plot-polygon hover:fill-opacity-40 transition-all cursor-pointer"
                }}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[280px]">
                    <h4 className="font-bold text-gray-900 mb-2 border-b pb-1">
                      Farmer Details - Plot {i + 1}
                    </h4>
                    <div className="space-y-1 text-sm">
                      {formatFarmerDetail("Farmer Code", farmerData?.id ?? farmerData?.farmer_code)}
                      {formatFarmerDetail("Farmer Name", farmerData?.farmer_name)}
                      {formatFarmerDetail("Submission Date", farmerData?.created_at ? new Date(String(farmerData.created_at)).toLocaleDateString() : null)}
                      {landDetails.ownership && formatFarmerDetail("Land Ownership", landDetails.ownership)}
                      {landDetails.patta && formatFarmerDetail("Land Patta/Survey", landDetails.patta)}
                      {totalAreaHa && formatFarmerDetail("Total Area (Ha)", totalAreaHa.toFixed(2))}
                      {totalGeoboundariesHa && formatFarmerDetail("Total Geoboundaries Area (Ha)", totalGeoboundariesHa.toFixed(3))}
                      {formatFarmerDetail("Plot Area", p.areaAcres ? `${p.areaAcres.toFixed(2)} acres` : null)}
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            ))}
            <MapBounds polygons={polygons} />
            <MapControls />
          </MapContainer>
        </div>
        <div className="flex justify-between items-center pt-2 mt-2 text-xs">
          <div className="text-muted-foreground">
            {polygons.length} plot{polygons.length !== 1 ? 's' : ''} displayed
          </div>
          <div className="text-muted-foreground">
            High-resolution satellite imagery • Hover over plots for farmer details
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ValidatorCoconutDetail() {
  const { id } = useParams<{ id: string }>();
  const [mapOpen, setMapOpen] = useState(false);
  const [recollectDialogOpen, setRecollectDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "recollect" | null>(null);

  const { data: row, isLoading } = useQuery({
    queryKey: ["coconut-plantation-detail", id],
    queryFn: () => getCoconutPlantationByIdFromSupabase(id!),
    enabled: !!id,
  });

  const { data: apiRowById, isFetched: apiByIdFetched } = useQuery({
    queryKey: ["coconut-plantation-api", id],
    queryFn: () => getCoconutPlantationByIdFromSupabase(id!),
    enabled: !!id,
    retry: false,
  });

  const farmerCodeForApi = row?.farmer_code ?? row?.farmer_id ?? (row as unknown as Record<string, unknown> | undefined)?.id;
  const { data: apiRowByFarmerCode, isFetched: apiByCodeFetched } = useQuery({
    queryKey: ["coconut-plantation-api-by-farmer-code", farmerCodeForApi],
    queryFn: () => getCoconutPlantationByIdFromSupabase(String(farmerCodeForApi)),
    enabled: !!farmerCodeForApi && !!apiByIdFetched && apiRowById == null,
    retry: false,
  });

  const tryListMatch = !!row && !!apiByIdFetched && apiRowById == null && (!farmerCodeForApi || !!apiByCodeFetched) && apiRowByFarmerCode == null;
  const { data: apiRowFromList } = useQuery({
    queryKey: ["coconut-plantation-api-list-match", id, tryListMatch, row?.id, row?.farmer_code, row?.phone],
    queryFn: async () => {
      const list = await getCoconutPlantationsFromSupabase();
      const r = row as Record<string, unknown>;
      const match = list.find(
        (item) => {
          const itemRecord = item as Record<string, unknown>;
          return itemRecord.id === r?.id ||
            itemRecord.id === r?.farmer_code ||
            itemRecord.id === r?.farmer_id ||
            String(itemRecord.phone || "").trim() === String(r?.phone || "").trim() ||
            (itemRecord.farmerName === r?.farmer_name && (itemRecord.village === r?.village || itemRecord.phone === r?.phone));
        }
      );
      return match ?? null;
    },
    enabled: tryListMatch,
    retry: false,
    staleTime: 60_000,
  });

  const apiRow = apiRowById ?? apiRowByFarmerCode ?? apiRowFromList ?? null;

  const displayRow = useMemo((): Record<string, unknown> | undefined => {
    if (!row) return undefined;
    const base = row as Record<string, unknown>;
    const out = { ...base };
    if (apiRow && typeof apiRow === "object") {
      const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      for (const [k, v] of Object.entries(apiRow as unknown as Record<string, unknown>)) {
        if (v === undefined || v === null) continue;
        out[k] = v;
        if (/[A-Z]/.test(k)) out[camelToSnake(k)] = v;
      }
    }
    return out;
  }, [row, apiRow]);

  const farmerCodeForDocs = row?.farmer_code ?? row?.farmer_id ?? id ?? "";

  const { data: bucketDocuments = [] } = useQuery({
    queryKey: ["bucket-documents", farmerCodeForDocs],
    queryFn: () => listDocumentsByFarmerCode(farmerCodeForDocs),
    enabled: !!farmerCodeForDocs && !!row,
  });

  const hasAllFourDocsFromBucket = useMemo(() => {
    const names = bucketDocuments.map((d) => d.name.toLowerCase());
    const hasAadhaar = names.some((n) => n.includes("aadhaar") || n.includes("aadhar"));
    const hasAgreement = names.some((n) => n.includes("agreement"));
    const hasBank = names.some((n) => n.includes("bank"));
    const hasRtc = names.some((n) => n.includes("rtc"));
    return hasAadhaar && hasAgreement && hasBank && hasRtc;
  }, [bucketDocuments]);

  const plotsList: CoconutPlotRow[] = useMemo(
    () => getPlotsFromRow(row),
    [row]
  );

  useEffect(() => {
    if (!row) return;
    const r = row as Record<string, unknown>;
    const allKeys = Object.keys(r);
    if (import.meta.env.DEV && allKeys.length > 0) {
      console.log("[ValidatorCoconutDetail] Row keys from Supabase:", allKeys.sort());
      const landKeys = allKeys.filter((k) => /area|land|patta|survey|ownership|hectare/i.test(k));
      const locationKeys = allKeys.filter((k) => /village|block|tehsil|district|state|mandal/i.test(k));
      const cropKeys = allKeys.filter((k) => /kharif|rabi|crop|duration/i.test(k));
      if (landKeys.length || locationKeys.length || cropKeys.length) {
        console.log("[ValidatorCoconutDetail] Land-related:", landKeys, "Location-related:", locationKeys, "Crop-related:", cropKeys);
      }
    }
  }, [row]);

  // Debug: Log the actual row data to see what fields are present
  if (import.meta.env.DEV && row) {
    console.log("[ValidatorCoconutDetail] Full row data:", {
      id: row.id,
      farmer_name: row.farmer_name,
      agent_name: row.agent_name,
      date_of_plantation: row.date_of_plantation,
      created_at: row.created_at,
      // Check if coconut fields exist
      has_coconut_fields: !!(row.date_of_plantation || row.agent_name)
    });
  }

  const totalAreaHa = useMemo(() => {
    const r = displayRow ?? (row as Record<string, unknown>);
    if (!r) return 0;
    const v =
      r.total_area_hectares ?? r.totalAreaHectares ?? r.area_under_coconut_hectares ?? r.areaUnderCoconutHectares
      ?? (() => {
        const scan = (obj: Record<string, unknown>): number | undefined => {
          for (const k of Object.keys(obj)) {
            if (/^total_area|^totalArea/i.test(k) || /area_under_coconut|areaUnderCoconut/i.test(k)) {
              const n = Number(obj[k]);
              if (Number.isFinite(n)) return n;
            }
            const val = obj[k];
            if (val != null && typeof val === "object" && !Array.isArray(val)) {
              const nested = scan(val as Record<string, unknown>);
              if (nested !== undefined) return nested;
            }
          }
          return undefined;
        };
        return scan(r);
      })();
    return Number(v) || 0;
  }, [displayRow, row]);

  /** Read from displayRow (Supabase + API merge) with snake_case or camelCase. Supports "nested.key". Treats "undefined" string as missing. */
  const get = (keys: string[]) => {
    const r = displayRow;
    if (!r) return undefined;
    for (const key of keys) {
      let v: unknown = r;
      const parts = key.split(".");
      for (const p of parts) {
        v = v != null && typeof v === "object" && p in (v as object) ? (v as Record<string, unknown>)[p] : undefined;
        if (v === undefined || v === null) break;
      }
      if (v !== undefined && v !== null && v !== "" && String(v).toLowerCase() !== "undefined") return v;
    }
    return undefined;
  };

  /** Fallback: find first key on displayRow (or nested objects) matching regex and return its value. */
  const getByPattern = (pattern: RegExp): unknown => {
    const r = displayRow as Record<string, unknown> | undefined;
    if (!r) return undefined;
    const scan = (obj: Record<string, unknown>): unknown => {
      for (const k of Object.keys(obj)) {
        if (pattern.test(k)) {
          const v = obj[k];
          if (v !== undefined && v !== null && v !== "" && String(v).toLowerCase() !== "undefined") return v;
        }
        if (obj[k] != null && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
          const nested = scan(obj[k] as Record<string, unknown>);
          if (nested !== undefined) return nested;
        }
      }
      return undefined;
    };
    return scan(r);
  };
  const formatHa = (v: unknown): string => {
    const n = typeof v === "number" ? v : v != null ? Number(v) : NaN;
    if (Number.isFinite(n)) return `${n} hectares`;
    return "—";
  };
  const formatStr = (v: unknown): string => {
    if (v == null || String(v) === "undefined" || String(v).toLowerCase() === "undefined") return "—";
    return String(v);
  };
  /** e.g. 120 -> "120 days", null -> "—" */
  const formatDays = (v: unknown): string => {
    const n = typeof v === "number" ? v : v != null ? Number(v) : NaN;
    if (Number.isFinite(n)) return `${n} days`;
    return "—";
  };
  const totalGeoboundariesHa = useMemo(() => {
    let sum = 0;
    for (const p of plotsList) {
      if (p.areaAcres != null) sum += p.areaAcres * 0.404686;
    }
    return sum || totalAreaHa;
  }, [plotsList, totalAreaHa]);

  const farmerRecordId = row ? `farmer-${row.id ?? id}` : null;
  const isNotFound = (e: unknown) => {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
    return /not found/i.test(msg);
  };
  const handleApprove = async () => {
    if (!farmerRecordId || !row) return;
    setActionLoading("approve");
    try {
      await updateFarmerRecord(farmerRecordId, { status: "approved" });
      toast.success("Record approved.");
    } catch (e: unknown) {
      if (isNotFound(e)) {
        try {
          await ensureFarmerRecordFromCoconut(row as Record<string, unknown>);
          await updateFarmerRecord(farmerRecordId, { status: "approved" });
          toast.success("Record linked and approved.");
        } catch (e2: unknown) {
          const m2 = e2 && typeof e2 === "object" && "message" in e2 ? String((e2 as { message: unknown }).message) : "";
          toast.error(m2 || "Could not link record. Ensure the API server is running.");
        }
      } else {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed to approve.";
        toast.error(msg);
      }
    } finally {
      setActionLoading(null);
    }
  };
  const handleRecollect = async () => {
    if (!farmerRecordId || !row) return;
    setActionLoading("recollect");
    try {
      await updateFarmerRecord(farmerRecordId, { status: "corrections_needed" });
      toast.success("Recollect requested. Field agent will be notified to resubmit.");
      setRecollectDialogOpen(false);
    } catch (e: unknown) {
      if (isNotFound(e)) {
        try {
          await ensureFarmerRecordFromCoconut(row as Record<string, unknown>);
          await updateFarmerRecord(farmerRecordId, { status: "corrections_needed" });
          toast.success("Record linked. Recollect requested.");
          setRecollectDialogOpen(false);
        } catch (e2: unknown) {
          const m2 = e2 && typeof e2 === "object" && "message" in e2 ? String((e2 as { message: unknown }).message) : "";
          toast.error(m2 || "Could not link record. Ensure the API server is running.");
        }
      } else {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Failed to request recollection.";
        toast.error(msg);
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (!id) {
    return (
      <DashboardLayout userRole="data_validator" userName="Validator">
        <div className="p-8 text-center text-muted-foreground">Missing record ID.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="data_validator" userName="Validator">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Farmer Information</h1>
          <Button variant="outline" asChild className="gap-1.5 border-border bg-card hover:bg-muted/80 text-foreground shadow-sm">
            <Link to="/validator/farmers">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        {row && (() => {
          const aadhaar = get(["aadhaar", "aadhaar_number"]);
          const agreement = get(["agreement_url", "agreement_document", "agreement", "agreementUrl"]);
          const rtc = get(["land_patta_survey_number", "land_patta_survey", "landPattaSurveyNumber", "rtc_document", "legal_document"]);
          const bank = get(["bank_account", "bank_name", "ifsc", "bank_details", "bankAccount", "bankName", "bank_ifsc"]);
          const has = (v: unknown) => v != null && v !== "" && String(v).toLowerCase() !== "undefined";
          const allFourComplete = (has(aadhaar) && has(agreement) && has(rtc) && has(bank)) || hasAllFourDocsFromBucket;
          const statusLabel = allFourComplete ? "Submitted" : "Incomplete";
          return (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm w-fit">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <span className={statusLabel === "Submitted" ? "inline-flex items-center rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary" : "inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"}>
                {statusLabel}
              </span>
            </div>
          );
        })()}

        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Loading…
          </div>
        ) : !row ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Record not found.
          </div>
        ) : (
          <>
            <Accordion type="multiple" className="w-full space-y-3" defaultValue={["section-1", "section-2", "section-3"]}>
            {/* Section 1: Farmer / Plantation Details */}
            <AccordionItem value="section-1" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Section 1</span>
                  <span className="text-muted-foreground">Farmer Details</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 pb-2">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Personal Details</h4>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Farmer Code</dt>
                      <dd className="font-mono">{row.id ?? "—"}</dd>
                      <dt className="text-muted-foreground">Farmer Name</dt>
                      <dd>{row.farmer_name ?? "—"}</dd>
                      <dt className="text-muted-foreground">Aadhaar</dt>
                      <dd>{row.aadhaar ?? "—"}</dd>
                      <dt className="text-muted-foreground">Submission Date</dt>
                      <dd>{row.created_at ? new Date(String(row.created_at)).toLocaleDateString() : "—"}</dd>
                    </dl>
                    <h4 className="font-medium text-foreground mt-4">Contact Details</h4>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Mobile No</dt>
                      <dd>{row.phone ?? "—"}</dd>
                    </dl>
                    <h4 className="font-medium text-foreground mt-4">Address Details</h4>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Village</dt>
                      <dd>{row.village ?? "—"}</dd>
                      <dt className="text-muted-foreground">Block / Tehsil</dt>
                      <dd>{row.block_tehsil_mandal ?? "—"}</dd>
                      <dt className="text-muted-foreground">District</dt>
                      <dd>{row.district ?? "—"}</dd>
                      <dt className="text-muted-foreground">State</dt>
                      <dd>{row.state ?? "—"}</dd>
                    </dl>
                    <p className="text-sm text-muted-foreground mt-2"><span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Status: Pending</span></p>
                  </div>
                  {row.location && (
                    <div className="rounded border p-3 bg-muted/30">
                      <p className="text-xs font-mono text-muted-foreground">Farmer Code: {row.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Date: {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Latitude: {row.location.lat}</p>
                      <p className="text-xs text-muted-foreground">Longitude: {row.location.lng}</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Farmer Document Details (from Supabase bucket documents folder by farmer code) */}
            <AccordionItem value="section-2" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Section 2</span>
                  <span className="text-muted-foreground">Farmer Document Details</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto pt-2">
                  <table className="w-full border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="text-left p-2">Documents Type</th>
                        <th className="text-left p-2">Doc Image</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-right p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucketDocuments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            No documents in bucket for this farmer code (folder: {farmerCodeForDocs}).
                          </td>
                        </tr>
                      ) : (
                        bucketDocuments.map((doc) => (
                          <tr key={doc.path} className="border-b">
                            <td className="p-2">
                              <span className="capitalize">
                                {doc.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || doc.name}
                              </span>
                            </td>
                            <td className="p-2">
                              {/\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name) ? (
                                <div className="flex flex-col gap-1">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-20 rounded border overflow-hidden bg-muted shrink-0"
                                  >
                                    <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                                  </a>
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                                    View full size
                                  </a>
                                </div>
                              ) : /\.pdf$/i.test(doc.name) ? (
                                <div className="flex flex-col gap-1">
                                  <div className="w-32 h-40 rounded border overflow-hidden bg-muted shrink-0">
                                    <object
                                      data={doc.url}
                                      type="application/pdf"
                                      className="w-full h-full"
                                      title={doc.name}
                                    >
                                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                        <FileText className="h-8 w-8" />
                                      </div>
                                    </object>
                                  </div>
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">
                                    <FileText className="h-3 w-3" />
                                    View PDF
                                  </a>
                                </div>
                              ) : (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary underline"
                                >
                                  <FileText className="h-4 w-4" />
                                  View
                                </a>
                              )}
                            </td>
                            <td className="p-2">Pending</td>
                            <td className="p-2 text-right">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 mr-1" onClick={handleApprove} disabled={!!actionLoading}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>Recollect</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Plot Details */}
            <AccordionItem value="section-3" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Section 3</span>
                  <span className="text-muted-foreground">Plot Details</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-4">
                  <p className="text-sm">
                    <strong>Plots Count:</strong> {plotsList.length || (row.number_of_plots ?? 0)} &nbsp;
                    <strong>Total Area (Ha):</strong> {Number(totalAreaHa).toFixed(2)} &nbsp;
                    <strong>Total Geoboundaries Area (Ha):</strong> {totalGeoboundariesHa.toFixed(3)}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="text-left p-2">Plot Code</th>
                          <th className="text-left p-2">Area (Acres)</th>
                          <th className="text-left p-2">Area (Ha)</th>
                          <th className="text-right p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plotsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-muted-foreground">
                              There is no Plot Image Details
                            </td>
                          </tr>
                        ) : (
                          plotsList.map((p, i) => {
                            const plotAcres = p.areaAcres ?? (p as Record<string, unknown>).area_acres;
                            const acres =
                              plotAcres != null
                                ? Number(plotAcres)
                                : plotsList.length === 1 && totalAreaHa > 0
                                  ? totalAreaHa * 2.47105
                                  : null;
                            const ha = acres != null ? acres / 2.47105 : (plotsList.length === 1 ? totalAreaHa : null);
                            return (
                              <tr key={i} className="border-b">
                                <td className="p-2 font-mono text-xs">{row.id}-P{i + 1}</td>
                                <td className="p-2">{acres != null ? acres.toFixed(2) : "—"}</td>
                                <td className="p-2">{ha != null ? Number(ha).toFixed(3) : "—"}</td>
                                <td className="p-2 text-right">
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 mr-1" onClick={handleApprove} disabled={!!actionLoading}>Approve</Button>
                                  <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>Recollect</Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {plotsList.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 bg-muted/50 font-medium">
                            <td colSpan={2} className="p-2 text-right">Total Geoboundaries Area (Ha):</td>
                            <td className="p-2">{totalGeoboundariesHa.toFixed(3)}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 4: Land Details */}
            <AccordionItem value="section-4" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Section 4</span>
                  <span className="text-muted-foreground">Land Details</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="text-left p-2">Land Details</th>
                          <th className="text-left p-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Total Area Possessed</td><td className="p-2">{formatHa(get(["total_area_hectares", "totalAreaHectares", "total_area_hectare", "total_area", "totalArea", "area_hectares", "land.total_area_hectares", "land_details.total_area_hectares"]) ?? getByPattern(/^total_area|^totalArea/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Area Under Coconut</td><td className="p-2">{formatHa(get(["area_under_coconut_hectares", "areaUnderCoconutHectares", "area_under_coconut", "areaUnderCoconut", "coconut_area", "land.area_under_coconut_hectares"]) ?? getByPattern(/area_under_coconut|areaUnderCoconut|under_coconut/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Land Area</td><td className="p-2">{formatHa(get(["land_area_hectares", "land_area", "landAreaHectares", "land_size", "landSize", "land.land_size"]) ?? 0)}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Land Ownership</td><td className="p-2">{formatStr(get(["land_ownership", "landOwnership", "ownership", "land.land_ownership"]))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Land Patta/Survey</td><td className="p-2">{formatStr(get(["land_patta_survey_number", "land_patta_survey", "landPattaSurveyNumber", "landPattaSurvey", "patta_survey", "patta_number", "survey_number", "survey_no", "land_patta", "patta", "survey", "land.survey_number", "land.patta"]) ?? getByPattern(/patta|survey|patta_survey|survey_no/i))}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="text-left p-2">Plot Code</th>
                          <th className="text-left p-2">Documents Type</th>
                          <th className="text-left p-2">Legal Documents</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-right p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2 font-mono text-xs">{row.id}</td>
                          <td className="p-2">Legal Document (RTC)</td>
                          <td className="p-2">—</td>
                          <td className="p-2">Pending</td>
                          <td className="p-2 text-right">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 mr-1" onClick={handleApprove} disabled={!!actionLoading}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>Recollect</Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 5: Plot Geoboundaries Details */}
            <AccordionItem value="section-5" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Section 5</span>
                  <span className="text-muted-foreground">Plot Geoboundaries Details</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm">
                      <strong>Plots Count:</strong> {plotsList.length || (row.number_of_plots ?? 0)} &nbsp;
                      <strong>Total Area (Ha):</strong> {Number(totalAreaHa).toFixed(2)} &nbsp;
                      <strong>Total Geoboundaries Area (Ha):</strong> {totalGeoboundariesHa.toFixed(3)}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="text-left p-2">Plot Code</th>
                          <th className="text-left p-2">View Map</th>
                          <th className="text-left p-2">Download KML</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-right p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plotsList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-muted-foreground">
                              No plot geoboundaries
                            </td>
                          </tr>
                        ) : (
                          plotsList.map((p, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2 font-mono text-xs">{row.id}-P{i + 1}</td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setMapOpen(true)}
                                >
                                  View Map
                                </Button>
                              </td>
                              <td className="p-2">
                                {Array.isArray(p.latlngs) && p.latlngs.length >= 3 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => {
                                      const kml = buildKmlForPlots([p], String(row.id ?? "plot"));
                                      downloadKml(kml, `geoboundaries-${row.id}-P${i + 1}.kml`);
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                    KML
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="p-2">Pending</td>
                              <td className="p-2 text-right">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 mr-1" onClick={handleApprove} disabled={!!actionLoading}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>Recollect</Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 7: Plantation Details */}
            <AccordionItem value="section-7" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Section 6</span>
                  <span className="text-muted-foreground">Plantation Details</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="text-left p-2">Plantation Details</th>
                          <th className="text-left p-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Date of Plantation</td><td className="p-2">{formatStr(get(["date_of_plantation", "dateOfPlantation", "plantation_date", "planting_date"]))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Plantation Model</td><td className="p-2">{formatStr(get(["plantation_model", "plantationModel", "plantation_type", "model"]) ?? getByPattern(/plantation_model|plantationModel|model/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Type of Variety</td><td className="p-2">{formatStr(get(["type_of_variety", "typeOfVariety", "variety", "coconut_variety"]) ?? getByPattern(/variety|type_of_variety|typeOfVariety/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Spacing</td><td className="p-2">{formatStr(get(["spacing", "plant_spacing", "crop_spacing"]) ?? getByPattern(/spacing/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Seedlings Planted</td><td className="p-2">{formatStr(get(["seedlings_planted", "seedlingsPlanted", "seedlings_planted_count", "plants_planted"]))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Seedlings Survived</td><td className="p-2">{formatStr(get(["seedlings_survived", "seedlingsSurvived", "seedlings_survived_count"]))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Mode of Irrigation</td><td className="p-2">{formatStr(get(["mode_of_irrigation", "modeOfIrrigation", "irrigation", "irrigation_mode"]) ?? getByPattern(/irrigation|mode_of_irrigation|modeOfIrrigation/i))}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 8: Crop Information */}
            <AccordionItem value="section-8" className="rounded-xl border border-border bg-card px-4 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">Section 7</span>
                  <span className="text-muted-foreground">Crop Information</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">Status: Pending</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="text-left p-2">Crop Information</th>
                          <th className="text-left p-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Kharif Crop</td><td className="p-2">{formatStr(get(["kharif_crop", "kharifCrop", "kharif"]) ?? getByPattern(/kharif.*crop|kharifCrop/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Kharif Duration</td><td className="p-2">{formatDays(get(["kharif_crop_duration_days", "kharifCropDurationDays", "kharif_duration_days", "kharif_duration", "kharifDuration", "kharif_crop_duration", "kharifCropDuration", "crop.kharif_duration_days"]) ?? getByPattern(/kharif.*(duration|days)|(duration|days).*kharif/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Rabi Crop</td><td className="p-2">{formatStr(get(["rabi_crop", "rabiCrop", "rabi"]) ?? getByPattern(/rabi.*crop|rabiCrop/i))}</td></tr>
                        <tr className="border-b"><td className="p-2 text-muted-foreground">Rabi Duration</td><td className="p-2">{formatDays(get(["rabi_crop_duration_days", "rabiCropDurationDays", "rabi_duration_days", "rabi_duration", "rabiDuration", "rabi_crop_duration", "rabiCropDuration", "crop.rabi_duration_days"]) ?? getByPattern(/rabi.*(duration|days)|(duration|days).*rabi/i))}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </>
        )}

        {/* Section 6: Validation Details - Moved to Bottom */}
        {row && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3">Section 6: Validation Details</h3>
            <p className="text-sm text-muted-foreground">Validation history and final status.</p>
          </div>
        )}

        {row && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={!!actionLoading}
            >
              {actionLoading === "approve" ? "Approving…" : "Approve"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRecollectDialogOpen(true)}
              disabled={!!actionLoading}
            >
              {actionLoading === "recollect" ? "Requesting…" : "Recollect"}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={recollectDialogOpen} onOpenChange={setRecollectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Recollection</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark the record as needing corrections. The field agent can resubmit data. Continue?
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setRecollectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRecollect}
              disabled={actionLoading === "recollect"}
            >
              {actionLoading === "recollect" ? "Requesting…" : "Request Recollect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PlotGeoboundariesModal
        open={mapOpen}
        onOpenChange={setMapOpen}
        plots={plotsList}
        farmerData={displayRow}
        totalAreaHa={totalAreaHa}
        totalGeoboundariesHa={totalGeoboundariesHa}
      />
    </DashboardLayout>
  );
}
