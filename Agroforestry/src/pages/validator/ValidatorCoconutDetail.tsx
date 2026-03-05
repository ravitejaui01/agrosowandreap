import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCoconutPlantationByIdFromSupabase, getPlotsFromRow, createFarmerRecordInSupabase } from "@/lib/supabase";
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
import { MapContainer, TileLayer, Polygon, useMap, Tooltip, Popup } from "react-leaflet"; // FIXED: added Tooltip & Popup
import L from "leaflet";
import { ArrowLeft, Map as MapIcon, FileText, Download, ZoomIn, ZoomOut, Maximize2, AlertCircle } from "lucide-react";
import { buildKmlForPlots, downloadKml } from "@/lib/kml";
import { supabase } from "@/lib/supabase";

// Make sure this is in your main entry file (index.tsx / main.tsx):
// import 'leaflet/dist/leaflet.css';

// ──────────────────────────────────────────────
// Map helper components
// ──────────────────────────────────────────────

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
      map.fitBounds(combinedBounds, { padding: [80, 80], maxZoom: 18 });
    }
  }, [map, polygons]);

  return null;
}

function MapControls() {
  const map = useMap();

  const zoomIn = () => map?.zoomIn();
  const zoomOut = () => map?.zoomOut();

  const toggleFullscreen = () => {
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ top: '10px', right: '10px', zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar bg-white shadow-md rounded">
        <button onClick={zoomIn} className="p-2 hover:bg-gray-100 border-b" title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={zoomOut} className="p-2 hover:bg-gray-100 border-b" title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-100" title="Toggle fullscreen">
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
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setMapReady(true), 150);
      return () => clearTimeout(t);
    }
    setMapReady(false);
  }, [open]);

  const polygons = useMemo(() => {
    return (plots ?? []).filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
  }, [plots]);

  const center: [number, number] = useMemo(() => {
    if (polygons.length === 0) return [12.97, 77.59];
    const all = polygons.flatMap((p) => p.latlngs ?? []).filter((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]));
    if (all.length === 0) return [12.97, 77.59];
    const lats = all.map((c) => c[0]);
    const lngs = all.map((c) => c[1]);
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [12.97, 77.59];
    return [lat, lng];
  }, [polygons]);

  const formatFarmerDetail = (key: string, value: unknown) => {
    if (value == null || value === "" || String(value).toLowerCase() === "undefined") return null;
    if (String(value) === "0" || String(value) === "00") return null;
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

    return { ownership: landOwnership, patta: landPatta, area: landArea };
  };

  const landDetails = getLandDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[98vh] flex flex-col p-4">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              Plot Geoboundaries Details
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const kml = buildKmlForPlots(polygons, String(farmerData?.id ?? farmerData?.farmer_code ?? "farmer"), farmerData);
                downloadKml(kml, `geoboundaries-${farmerData?.id ?? farmerData?.farmer_code ?? "farmer"}-all-plots.kml`);
              }}
            >
              <Download className="h-4 w-4" />
              Download All KML
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 rounded-md overflow-hidden border min-h-[700px]">
          {!mapReady ? (
            <div className="h-full min-h-[700px] flex items-center justify-center bg-muted text-muted-foreground">Loading map…</div>
          ) : (
          <MapContainer
            center={center}
            zoom={13}
            className="h-full w-full min-h-[700px]"
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
                  fillOpacity: 0,
                  weight: 3,
                  opacity: 0.9,
                  dashArray: i === 0 ? undefined : "10, 5",
                  className: "plot-polygon hover:fill-opacity-0 transition-all cursor-pointer"
                }}
              >
                <Tooltip
                  direction="right"
                  offset={[10, 0]}
                  opacity={1}
                  permanent={false}
                >
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[280px] max-w-[320px] max-h-[500px] overflow-y-auto">
                    <h4 className="font-bold text-gray-900 mb-2 border-b pb-1">
                      Farmer Details - Plot {i + 1}
                    </h4>
                    <div className="space-y-1 text-sm">
                      {formatFarmerDetail("Farmer Code", farmerData?.id ?? farmerData?.farmer_code)}
                      {formatFarmerDetail("Farmer Name", farmerData?.farmer_name)}
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            ))}
            <MapBounds polygons={polygons} />
            <MapControls />
          </MapContainer>
          )}
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

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export default function ValidatorCoconutDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [mapOpen, setMapOpen] = useState(false);
  const [recollectDialogOpen, setRecollectDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "recollect" | null>(null);

  const { data: row, isLoading } = useQuery({
    queryKey: ["coconut-plantation-detail", id],
    queryFn: () => getCoconutPlantationByIdFromSupabase(id!),
    enabled: !!id,
  });

  const farmerCodeForDocs = row?.farmer_code ?? row?.farmer_id ?? row?.id ?? id ?? "";

  // Documents with signed URLs
  const [bucketDocuments, setBucketDocuments] = useState<{ name: string; path: string; url: string | null }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmerCodeForDocs || !row) return;

    async function fetchSignedDocuments() {
      setDocsLoading(true);
      setDocsError(null);

      try {
        const folderVariants = [
          farmerCodeForDocs,
          `farmers/${farmerCodeForDocs}`,
          `farmer_${farmerCodeForDocs}`,
        ];

        let files: any[] = [];
        let usedFolder = '';

        for (const folder of folderVariants) {
          const { data, error } = await supabase.storage
            .from('documents')
            .list(folder, { limit: 100 });

          if (!error && data?.length) {
            files = data;
            usedFolder = folder;
            break;
          }
        }

        if (files.length === 0) {
          setBucketDocuments([]);
          return;
        }

        const signedDocs = await Promise.all(
          files.map(async (file) => {
            const fullPath = `${usedFolder}/${file.name}`.replace(/\/+/g, '/');

            const { data: signed } = await supabase.storage
              .from('documents')
              .createSignedUrl(fullPath, 3600);

            return {
              name: file.name,
              path: fullPath,
              url: signed?.signedUrl ?? null,
            };
          })
        );

        setBucketDocuments(signedDocs.filter(d => d.url !== null));
      } catch (err: any) {
        console.error("Document fetch failed:", err);
        setDocsError(err.message || "Failed to load documents");
      } finally {
        setDocsLoading(false);
      }
    }

    fetchSignedDocuments();
  }, [farmerCodeForDocs, row]);

  const plotsList: CoconutPlotRow[] = useMemo(
    () => (row ? getPlotsFromRow(row) : []),
    [row]
  );

  const totalAreaHa = useMemo(() => {
    if (!row) return 0;
    const r = row as Record<string, unknown>;
    const v = r.total_area_hectares ?? r.totalAreaHectares ?? r.area_under_coconut_hectares ?? r.areaUnderCoconutHectares;
    return Number(v) || 0;
  }, [row]);

  const totalGeoboundariesHa = useMemo(() => {
    let sum = 0;
    for (const p of plotsList) {
      if (p.areaAcres != null) sum += p.areaAcres * 0.404686;
    }
    return sum || totalAreaHa;
  }, [plotsList, totalAreaHa]);

  // Helper functions
  const get = (keys: string[]) => {
    const r = row as Record<string, unknown> | undefined;
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

  const getByPattern = (pattern: RegExp): unknown => {
    const r = row as Record<string, unknown> | undefined;
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

  const formatDays = (v: unknown): string => {
    const n = typeof v === "number" ? v : v != null ? Number(v) : NaN;
    if (Number.isFinite(n)) return `${n} days`;
    return "—";
  };

  const handleApprove = async () => {
    if (!row) return;
    setActionLoading("approve");
    try {
      const result = await createFarmerRecordInSupabase(row, "approved");
      if (!result.ok) {
        toast.error(result.error ?? "Failed to approve");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["validator-farmer-records"] });
      toast.success("Record approved. It will appear in Validator Records → Recent Records.");
    } catch (err) {
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecollect = async () => {
    setActionLoading("recollect");
    try {
      // Your recollect logic here
      toast.success("Recollect requested");
      setRecollectDialogOpen(false);
    } catch (err) {
      toast.error("Failed to request recollect");
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

              {/* Section 1: Farmer Details */}
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
                        <dd>{String(row.aadhaar ?? row.aadhaar_number ?? row.aadhar ?? "") || "—"}</dd>
                        <dt className="text-muted-foreground">Submission Date</dt>
                        <dd>{row.created_at ? new Date(String(row.created_at)).toLocaleDateString() : "—"}</dd>
                      </dl>
                      <h4 className="font-medium text-foreground mt-4">Contact Details</h4>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Mobile No</dt>
                        <dd>{String(row.phone ?? row.phone_number ?? row.mobile ?? row.mobile_number ?? "") || "—"}</dd>
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
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Status: Pending
                        </span>
                      </p>
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

              {/* Section 2: Farmer Document Details */}
              <AccordionItem value="section-2" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">Section 2</span>
                    <span className="text-muted-foreground">Farmer Document Details</span>
                    <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                      Status: Pending
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto pt-2">
                    {docsLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Loading documents...</div>
                    ) : docsError ? (
                      <div className="p-6 text-center text-destructive flex items-center justify-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {docsError}
                      </div>
                    ) : bucketDocuments.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        No documents found for farmer code: <strong>{farmerCodeForDocs}</strong>
                      </div>
                    ) : (
                      <table className="w-full border rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="text-left p-3">Document Type</th>
                            <th className="text-left p-3">Preview</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-right p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bucketDocuments.map((doc) => (
                            <tr key={doc.path} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="p-3 font-medium capitalize">
                                {doc.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || doc.name}
                              </td>
                              <td className="p-3">
                                {doc.url ? (
                                  /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name) ? (
                                    <div className="flex flex-col gap-1.5">
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-28 h-28 rounded border overflow-hidden bg-muted shadow-sm hover:shadow"
                                      >
                                        <img
                                          src={doc.url}
                                          alt={doc.name}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </a>
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline text-center block">
                                        View full size
                                      </a>
                                    </div>
                                  ) : /\.pdf$/i.test(doc.name) ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="w-32 h-40 rounded border overflow-hidden bg-muted flex items-center justify-center">
                                        <FileText className="h-10 w-10 text-muted-foreground/70" />
                                      </div>
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline inline-flex items-center gap-1 justify-center mt-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        Open PDF
                                      </a>
                                    </div>
                                  ) : (
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                                      <FileText className="h-5 w-5" />
                                      View Document
                                    </a>
                                  )
                                ) : (
                                  <span className="text-sm text-destructive flex items-center gap-1.5">
                                    <AlertCircle className="h-4 w-4" />
                                    Preview unavailable
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-medium">Pending</td>
                              <td className="p-3 text-right space-x-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={!!actionLoading}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>
                                  Recollect
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
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
                      <strong>Plots Count:</strong> {plotsList.length || (Number((row as Record<string, unknown>).total_plots) || (row.number_of_plots ?? 0))} &nbsp;
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
                              const acres = p.areaAcres ? Number(p.areaAcres) : null;
                              const ha = acres != null ? acres / 2.47105 : null;
                              return (
                                <tr key={i} className="border-b">
                                  <td className="p-2 font-mono text-xs">{row.id}-P{i + 1}</td>
                                  <td className="p-2">{acres != null ? acres.toFixed(2) : "—"}</td>
                                  <td className="p-2">{ha != null ? Number(ha).toFixed(3) : "—"}</td>
                                  <td className="p-2 text-right">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 mr-1" onClick={handleApprove} disabled={!!actionLoading}>
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>
                                      Recollect
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 4: Land Details */}

              {/* Section 4: Land Details */}
              <AccordionItem value="section-4" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">Section 4</span>
                    <span className="text-muted-foreground">Land Details</span>
                    <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                      Status: Pending
                    </span>
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
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Total Area Possessed</td>
                            <td className="p-2">
                              {formatHa(get(["total_area_hectares", "totalAreaHectares", "total_area_hectare", "total_area", "totalArea", "area_hectares", "land.total_area_hectares", "land_details.total_area_hectares"]) ?? getByPattern(/^total_area|^totalArea/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Area Under Coconut</td>
                            <td className="p-2">
                              {formatHa(get(["area_under_coconut_hectares", "areaUnderCoconutHectares", "area_under_coconut", "areaUnderCoconut", "coconut_area", "land.area_under_coconut_hectares"]) ?? getByPattern(/area_under_coconut|areaUnderCoconut|under_coconut/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Land Area</td>
                            <td className="p-2">{formatHa(get(["land_area_hectares", "land_area", "landAreaHectares", "land_size", "landSize", "land.land_size"]) ?? 0)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Land Ownership</td>
                            <td className="p-2">{formatStr(get(["land_ownership", "landOwnership", "ownership", "land.land_ownership"]))}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Land Patta/Survey</td>
                            <td className="p-2">
                              {formatStr(get(["land_patta_survey_number", "land_patta_survey", "landPattaSurveyNumber", "landPattaSurvey", "patta_survey", "patta_number", "survey_number", "survey_no", "land_patta", "patta", "survey", "land.survey_number", "land.patta"]) ?? getByPattern(/patta|survey|patta_survey|survey_no/i))}
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
                    <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                      Status: Pending
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm">
                        <strong>Plots Count:</strong> {plotsList.length || (Number((row as Record<string, unknown>).total_plots) || (row.number_of_plots ?? 0))}    
                        <strong>Total Area (Ha):</strong> {Number(totalAreaHa).toFixed(2)}    
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
                                        const kml = buildKmlForPlots([p], String(row.id ?? "plot"), row);
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
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700 mr-1" onClick={handleApprove} disabled={!!actionLoading}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => setRecollectDialogOpen(true)} disabled={!!actionLoading}>
                                    Recollect
                                  </Button>
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

              {/* Section 6: Plantation Details */}
              <AccordionItem value="section-7" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">Section 6</span>
                    <span className="text-muted-foreground">Plantation Details</span>
                    <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                      Status: Pending
                    </span>
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
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Date of Plantation</td>
                            <td className="p-2">{formatStr(get(["date_of_plantation", "dateOfPlantation", "plantation_date", "planting_date"]))}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Plantation Model</td>
                            <td className="p-2">
                              {formatStr(get(["plantation_model", "plantationModel", "plantation_type", "model"]) ?? getByPattern(/plantation_model|plantationModel|model/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Type of Variety</td>
                            <td className="p-2">
                              {formatStr(get(["type_of_variety", "typeOfVariety", "variety", "coconut_variety"]) ?? getByPattern(/variety|type_of_variety|typeOfVariety/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Spacing</td>
                            <td className="p-2">{formatStr(get(["spacing", "plant_spacing", "crop_spacing"]) ?? getByPattern(/spacing/i))}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Seedlings Planted</td>
                            <td className="p-2">{formatStr(get(["seedlings_planted", "seedlingsPlanted", "seedlings_planted_count", "plants_planted"]))}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Seedlings Survived</td>
                            <td className="p-2">{formatStr(get(["seedlings_survived", "seedlingsSurvived", "seedlings_survived_count"]))}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Mode of Irrigation</td>
                            <td className="p-2">
                              {formatStr(get(["mode_of_irrigation", "modeOfIrrigation", "irrigation", "irrigation_mode"]) ?? getByPattern(/irrigation|mode_of_irrigation|modeOfIrrigation/i))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 7: Crop Information */}
              <AccordionItem value="section-8" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">Section 7</span>
                    <span className="text-muted-foreground">Crop Information</span>
                    <span className="ml-2 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                      Status: Pending
                    </span>
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
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Kharif Crop</td>
                            <td className="p-2">
                              {formatStr(get(["kharif_crop", "kharifCrop", "kharif"]) ?? getByPattern(/kharif.*crop|kharifCrop/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Kharif Duration</td>
                            <td className="p-2">
                              {formatDays(get([
                                "kharif_crop_duration_days",
                                "kharifCropDurationDays",
                                "kharif_duration_days",
                                "kharif_duration",
                                "kharifDuration",
                                "kharif_crop_duration",
                                "kharifCropDuration",
                                "crop.kharif_duration_days"
                              ]) ?? getByPattern(/kharif.*(duration|days)|(duration|days).*kharif/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Rabi Crop</td>
                            <td className="p-2">
                              {formatStr(get(["rabi_crop", "rabiCrop", "rabi"]) ?? getByPattern(/rabi.*crop|rabiCrop/i))}
                            </td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 text-muted-foreground">Rabi Duration</td>
                            <td className="p-2">
                              {formatDays(get([
                                "rabi_crop_duration_days",
                                "rabiCropDurationDays",
                                "rabi_duration_days",
                                "rabi_duration",
                                "rabiDuration",
                                "rabi_crop_duration",
                                "rabiCropDuration",
                                "crop.rabi_duration_days"
                              ]) ?? getByPattern(/rabi.*(duration|days)|(duration|days).*rabi/i))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* Bottom action buttons */}
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

            {/* Recollect confirmation dialog */}
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

            {/* Plot Geoboundaries Modal - only when open */}
            {mapOpen && (
              <PlotGeoboundariesModal
                key="plot-geoboundaries-map"
                open={mapOpen}
                onOpenChange={setMapOpen}
                plots={plotsList}
                farmerData={row}
                totalAreaHa={totalAreaHa}
                totalGeoboundariesHa={totalGeoboundariesHa}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}