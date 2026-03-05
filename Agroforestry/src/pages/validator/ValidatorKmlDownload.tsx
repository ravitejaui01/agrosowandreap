import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCoconutPlantationByIdFromSupabase, getPlotsFromRow } from "@/lib/supabase";
import { buildKmlForPlots, downloadKml } from "@/lib/kml";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, CheckCircle } from "lucide-react";

/**
 * Route: /validator/kml/:id
 * When user opens this URL (e.g. from Excel KML link), the app fetches the plantation,
 * builds KML, triggers download, and shows success. User can then open the .kml file with Google Earth.
 */
export default function ValidatorKmlDownload() {
  const { id } = useParams<{ id: string }>();
  const downloadedRef = useRef(false);

  const { data: row, isLoading, error } = useQuery({
    queryKey: ["coconut-plantation-kml", id],
    queryFn: () => getCoconutPlantationByIdFromSupabase(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!row || !id || downloadedRef.current) return;
    const plots = getPlotsFromRow(row, { capByTotalPlots: false });
    const validPlots = plots.filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
    if (validPlots.length === 0) return;
    downloadedRef.current = true;
    const code = String(row.farmer_id ?? row.farmer_code ?? row.id ?? id).trim() || id;
    const rowData = row as Record<string, unknown>;
    validPlots.forEach((p, i) => {
      const delay = i * 400;
      setTimeout(() => {
        const kml = buildKmlForPlots([p], code, rowData);
        const filename = `plot_${code}_p${i + 1}.kml`;
        downloadKml(kml, filename);
      }, delay);
    });
  }, [row, id]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center text-muted-foreground">Missing farmer ID.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading…</p>
          <p className="text-sm text-muted-foreground mt-2">Preparing KML download</p>
        </div>
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center text-destructive">
          <p>Record not found or error loading data.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/validator/farmers">Back to Farmer Records</Link>
          </Button>
        </div>
      </div>
    );
  }

  const plots = getPlotsFromRow(row, { capByTotalPlots: false });
  const validPlots = plots.filter((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
  const hasKml = validPlots.length > 0;
  const code = String(row.farmer_id ?? row.farmer_code ?? row.id ?? id).trim() || id;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
        {hasKml ? (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {validPlots.length === 1 ? "KML downloaded" : "KML files downloaded"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {validPlots.length === 1
                ? "The KML file was downloaded. Open it from your Downloads folder with Google Earth or another KML viewer."
                : `${validPlots.length} individual plot KML files were downloaded (plot_${code}_p1.kml through plot_${code}_p${validPlots.length}.kml). Open them with Google Earth or another KML viewer.`}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {validPlots.length === 1 ? `plot_${code}_p1.kml` : `plot_${code}_p1.kml … plot_${code}_p${validPlots.length}.kml`}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Download className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">No KML data</h1>
            <p className="text-muted-foreground text-sm">
              This record has no plot boundaries (geoboundaries) to export.
            </p>
          </>
        )}
        <Button variant="outline" className="gap-2" asChild>
          <Link to="/validator/farmers">
            <ArrowLeft className="h-4 w-4" />
            Back to Farmer Records
          </Link>
        </Button>
      </div>
    </div>
  );
}
