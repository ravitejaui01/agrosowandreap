import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCoconutPlantationsFromSupabase, listDocumentsByFarmerCode, getPlotsFromRow } from "@/lib/supabase";
import type { CoconutPlantationRow } from "@/lib/supabase";
import { buildKmlForPlots, downloadKml } from "@/lib/kml";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";

const COCONUT_PAGE_SIZE = 100;

/** Get value from row with snake_case/camelCase fallback. */
function getCsvVal(c: CoconutPlantationRow | Record<string, unknown>, ...keys: string[]): string {
  const r = c as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "" && String(v).toLowerCase() !== "undefined") return String(v);
  }
  return "";
}

export type DocLinks = { aadhaarUrl?: string; agreementUrl?: string; bankUrl?: string; rtcUrl?: string };

/** From bucket document list, pick URLs for Aadhaar, Agreement, Bank, RTC by filename. */
function getDocLinksFromList(docs: { name: string; url: string }[]): DocLinks {
  const out: DocLinks = {};
  for (const d of docs) {
    const n = d.name.toLowerCase();
    if (!out.aadhaarUrl && (n.includes("aadhaar") || n.includes("aadhar"))) out.aadhaarUrl = d.url;
    if (!out.agreementUrl && n.includes("agreement")) out.agreementUrl = d.url;
    if (!out.bankUrl && n.includes("bank")) out.bankUrl = d.url;
    if (!out.rtcUrl && n.includes("rtc")) out.rtcUrl = d.url;
  }
  return out;
}

/** Build CSV content from coconut rows (Excel-compatible). Includes Farmer Information, Submitted date, and document links. */
function buildCoconutCsv(
  rows: CoconutPlantationRow[],
  getStatus: (c: CoconutPlantationRow, hasAllFourFromBucket?: boolean) => string,
  getAreaHa: (c: CoconutPlantationRow) => number | null,
  docLinksByCode: Record<string, DocLinks> = {},
  hasAllFourDocsByCode: Record<string, boolean> = {}
): string {
  const header = "ID,Farmer Code,Farmer Name,Phone,Aadhaar,Active Status,District,Village,Date of Plantation,Agent,Area (ha),Status,Submitted,Has KML,Plots Count,KML Download Link,Aadhaar Doc Link,Agreement Doc Link,Bank Doc Link,RTC Doc Link";
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const submittedDate = (c: CoconutPlantationRow, status: string) => {
    if (status !== "Submitted") return "";
    const raw = c.created_at ?? (c as Record<string, unknown>).createdAt;
    return raw ? new Date(String(raw)).toLocaleDateString() : "";
  };
  const lines = [
    header,
    ...rows.map((c) => {
      const areaHa = getAreaHa(c);
      const farmerCode = String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim();
      const hasAllFourFromBucket = hasAllFourDocsByCode[farmerCode] || false;
      const status = getStatus(c, hasAllFourFromBucket);
      const id = c.id ?? "";
      const date = c.date_of_plantation ? new Date(c.date_of_plantation).toLocaleDateString() : "";
      const aadhaar = getCsvVal(c, "aadhaar", "aadhaar_number");
      const activeStatus = getCsvVal(c, "active_status", "activeStatus");
      const links = docLinksByCode[farmerCode] ?? {};
      
      // Check for KML/geoboundaries
      const plots = getPlotsFromRow(c);
      const hasKml = plots.some((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
      const plotsCount = plots.length;
      
      // Generate KML download link if KML is available
      let kmlDownloadLink = "";
      if (hasKml) {
        // Create a base64-encoded KML file link that can be downloaded
        try {
          const kmlContent = buildKmlForPlots(plots, farmerCode || String(c.id ?? "plot"));
          const base64Kml = btoa(kmlContent);
          kmlDownloadLink = `data:application/vnd.google-earth.kml+xml;base64,${base64Kml}`;
        } catch (error) {
          console.error("Error generating KML link:", error);
          kmlDownloadLink = "Error generating KML";
        }
      }
      
      return [
        escape(id),
        escape(farmerCode),
        escape(c.farmer_name),
        escape(c.phone),
        escape(aadhaar),
        escape(activeStatus),
        escape(c.district),
        escape(c.village),
        escape(date),
        escape(c.agent_name),
        areaHa != null ? String(Number(areaHa).toFixed(2)) : "",
        escape(status),
        escape(submittedDate(c, status)),
        escape(hasKml ? "Yes" : "No"),
        escape(String(plotsCount)),
        escape(kmlDownloadLink),
        escape(links.aadhaarUrl ?? ""),
        escape(links.agreementUrl ?? ""),
        escape(links.bankUrl ?? ""),
        escape(links.rtcUrl ?? ""),
      ].join(",");
    }),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** True only when all 4 docs are present: Aadhaar, Agreement, RTC, and Bank. If any one is missing → Incomplete. */
function hasAllFourComplete(c: CoconutPlantationRow | Record<string, unknown>): boolean {
  const r = c as Record<string, unknown>;
  const hasVal = (v: unknown) => v != null && v !== "" && String(v).trim() !== "" && String(v).toLowerCase() !== "undefined";
  const hasAadhaar = hasVal(r.aadhaar ?? r.aadhaar_number);
  const hasAgreement = hasVal(r.agreement_url ?? r.agreement_document ?? r.agreement ?? r.agreementUrl);
  const hasRTC = hasVal(
    r.land_patta_survey_number ?? r.land_patta_survey ?? r.landPattaSurveyNumber ?? r.rtc_document ?? r.legal_document
  );
  const hasBank = hasVal(
    r.bank_account ?? r.bank_name ?? r.ifsc ?? r.bank_details ?? r.bankAccount ?? r.bankName ?? r.bank_ifsc
  );
  return hasAadhaar && hasAgreement && hasRTC && hasBank;
}

/** Check if bucket has all 4 doc types (Aadhaar, Agreement, Bank, RTC) by file names. */
function checkBucketHasAllFourDocTypes(docNames: string[]): boolean {
  const names = docNames.map((n) => n.toLowerCase());
  const hasAadhaar = names.some((n) => n.includes("aadhaar") || n.includes("aadhar"));
  const hasAgreement = names.some((n) => n.includes("agreement"));
  const hasBank = names.some((n) => n.includes("bank"));
  const hasRtc = names.some((n) => n.includes("rtc"));
  return hasAadhaar && hasAgreement && hasBank && hasRtc;
}

/** Show "Submitted" only when all 4 (Aadhaar, Agreement, RTC, Bank) are present from row OR from bucket; otherwise "Incomplete". */
function getSubmissionStatus(
  c: CoconutPlantationRow | Record<string, unknown>,
  hasAllFourFromBucket?: boolean
): string {
  if (hasAllFourFromBucket) return "Submitted";
  return hasAllFourComplete(c) ? "Submitted" : "Incomplete";
}

/** Get area in hectares from a coconut row (Supabase may use different column names). */
function getAreaHa(c: CoconutPlantationRow | Record<string, unknown>): number | null {
  const r = c as Record<string, unknown>;
  const keys = [
    "area_under_coconut_hectares", "areaUnderCoconutHectares", "area_under_coconut", "areaUnderCoconut",
    "total_area_hectares", "totalAreaHectares", "total_area", "totalArea", "area_hectares", "land_size", "landSize",
  ];
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "" && String(v).toLowerCase() !== "undefined") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  for (const k of Object.keys(r)) {
    if (/area_under_coconut|areaUnderCoconut|total_area_hectares|totalAreaHectares|area.*hectare/i.test(k)) {
      const v = r[k];
      if (v != null && v !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}

export default function ValidatorFarmers() {
  const [coconutSearch, setCoconutSearch] = useState("");
  const [coconutPage, setCoconutPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const {
    data: coconutPlantations = [],
    isLoading: coconutLoading,
    isError: coconutError,
    refetch: refetchCoconut,
  } = useQuery({
    queryKey: ["coconut-plantations-supabase"],
    queryFn: () => getCoconutPlantationsFromSupabase(),
    refetchInterval: 30000,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const filteredCoconut = useMemo(() => {
    const q = String(coconutSearch).toLowerCase().trim();
    if (!q) return coconutPlantations;
    const exactMatch = coconutPlantations.filter((c: CoconutPlantationRow) => {
      try {
        const id = String(c.id ?? "").toLowerCase();
        const farmerCode = String(c.farmer_code ?? "").toLowerCase();
        const farmerId = String(c.farmer_id ?? "").toLowerCase();
        return id === q || farmerCode === q || farmerId === q;
      } catch {
        return false;
      }
    });
    if (exactMatch.length > 0) return exactMatch;
    return coconutPlantations.filter((c: CoconutPlantationRow) => {
      try {
        const id = String(c.id ?? "").toLowerCase();
        const farmerCode = String(c.farmer_code ?? "").toLowerCase();
        const farmerId = String(c.farmer_id ?? "").toLowerCase();
        const name = String(c.farmer_name ?? "").toLowerCase();
        const district = String(c.district ?? "").toLowerCase();
        const village = String(c.village ?? "").toLowerCase();
        const agent = String(c.agent_name ?? "").toLowerCase();
        return id.includes(q) || farmerCode.includes(q) || farmerId.includes(q) ||
          name.includes(q) || district.includes(q) || village.includes(q) || agent.includes(q);
      } catch {
        return false;
      }
    });
  }, [coconutPlantations, coconutSearch]);

  const coconutTotal = filteredCoconut.length;
  const coconutPageCount = Math.max(1, Math.ceil(coconutTotal / COCONUT_PAGE_SIZE));
  const coconutFrom = coconutTotal === 0 ? 0 : coconutPage * COCONUT_PAGE_SIZE + 1;
  const coconutTo = Math.min((coconutPage + 1) * COCONUT_PAGE_SIZE, coconutTotal);
  const coconutPageRows = useMemo(
    () => filteredCoconut.slice(coconutPage * COCONUT_PAGE_SIZE, (coconutPage + 1) * COCONUT_PAGE_SIZE),
    [filteredCoconut, coconutPage]
  );

  const bucketDocResults = useQueries({
    queries: coconutPageRows.map((c) => {
      const code = String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim();
      return {
        queryKey: ["bucket-docs-status", code] as const,
        queryFn: () => listDocumentsByFarmerCode(code),
        enabled: !!code,
        staleTime: 60_000,
      };
    }),
  });

  const hasAllFourDocsByCode = useMemo(() => {
    const m: Record<string, boolean> = {};
    coconutPageRows.forEach((c, i) => {
      const code = String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim();
      const docs = bucketDocResults[i]?.data ?? [];
      m[code] = checkBucketHasAllFourDocTypes(docs.map((d) => d.name));
    });
    return m;
  }, [coconutPageRows, bucketDocResults]);

  // Calculate counts for Incomplete and Submitted records
  const recordCounts = useMemo(() => {
    const submitted = filteredCoconut.filter(c => {
      const code = String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim();
      const hasAllFourFromBucket = hasAllFourDocsByCode[code];
      return getSubmissionStatus(c, hasAllFourFromBucket) === "Submitted";
    }).length;
    
    const incomplete = filteredCoconut.filter(c => {
      const code = String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim();
      const hasAllFourFromBucket = hasAllFourDocsByCode[code];
      return getSubmissionStatus(c, hasAllFourFromBucket) === "Incomplete";
    }).length;
    
    return { submitted, incomplete };
  }, [filteredCoconut, hasAllFourDocsByCode]);

  useEffect(() => {
    setCoconutPage(0);
  }, [coconutSearch]);

  useEffect(() => {
    if (coconutPage >= coconutPageCount && coconutPageCount > 0) setCoconutPage(0);
  }, [coconutPageCount, coconutPage]);

  const goToCoconutPage = (dir: number) => {
    setCoconutPage((p) => Math.max(0, Math.min(coconutPageCount - 1, p + dir)));
  };

  return (
    <DashboardLayout userRole="data_validator" userName="Mary Wanjiku">
      <div className="space-y-6">
        <div className="sticky top-0 z-20 -mx-4 px-4 pb-6 pt-1 border-b border-border bg-background lg:-mx-8 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Farmer Records</h1>
          <p className="mt-1 text-muted-foreground">
            View and search all farmer submissions and coconut plantations
          </p>
        </div>

        {/* Record Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Incomplete</p>
                <p className="text-3xl font-bold text-orange-600">{recordCounts.incomplete}</p>
                <p className="text-xs text-muted-foreground mt-1">Missing documents</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-orange-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Submitted</p>
                <p className="text-3xl font-bold text-blue-600">{recordCounts.submitted}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready for review</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-600">{filteredCoconut.length}</p>
                <p className="text-xs text-muted-foreground mt-1">All farmers</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-gray-600"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by ID, farmer code, name, district, village, agent..."
                value={coconutSearch}
                onChange={(e) => setCoconutSearch(e.target.value)}
                className="pl-10 h-11 rounded-lg border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <Button
              variant="default"
              size="default"
              className="gap-2 h-11 px-6 rounded-lg shadow-sm whitespace-nowrap"
              onClick={async () => {
                if (exporting || filteredCoconut.length === 0) return;
                setExporting(true);
                try {
                  const allCodes = [...new Set(
                    filteredCoconut.map((c) => String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim()).filter(Boolean)
                  )];
                  const docLinksByCode: Record<string, DocLinks> = {};
                  const MAX_CODES_FOR_LINKS = 150;
                  const codesToFetch = allCodes.slice(0, MAX_CODES_FOR_LINKS);
                  const BATCH = 75;
                  for (let i = 0; i < codesToFetch.length; i += BATCH) {
                    const batch = codesToFetch.slice(i, i + BATCH);
                    const results = await Promise.all(batch.map((code) => listDocumentsByFarmerCode(code)));
                    batch.forEach((code, j) => {
                      docLinksByCode[code] = getDocLinksFromList(results[j]);
                    });
                  }
                  const csv = buildCoconutCsv(
                    filteredCoconut,
                    (c, hasAllFourFromBucket) => getSubmissionStatus(c, hasAllFourFromBucket),
                    getAreaHa,
                    docLinksByCode,
                    hasAllFourDocsByCode
                  );
                  const name = `coconut-plantations${coconutSearch.trim() ? `-${coconutSearch.trim().slice(0, 20)}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
                  downloadCsv(csv, name);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={coconutLoading || exporting || filteredCoconut.length === 0}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Preparing export…" : "Download Excel"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {coconutError && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3 flex-wrap">
              <span>
                Connection issue — could not load coconut plantations. This often happens when the network changes (e.g. Wi‑Fi or VPN). Check your connection and retry.
              </span>
              <Button variant="outline" size="sm" onClick={() => refetchCoconut()}>
                Retry
              </Button>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-auto max-h-[calc(100vh-16rem)]">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Farmer Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">District</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Village</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Plantation</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Area (ha)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">KML</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {coconutLoading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-muted-foreground">
                        Loading coconut plantations…
                      </td>
                    </tr>
                  ) : (
                    coconutPageRows.map((c: CoconutPlantationRow) => {
                      const areaHa = getAreaHa(c);
                      const code = String(c.farmer_code ?? c.farmer_id ?? c.id ?? "").trim();
                      const hasAllFourFromBucket = !!hasAllFourDocsByCode[code];
                      const status = getSubmissionStatus(c, hasAllFourFromBucket);
                      const plots = getPlotsFromRow(c);
                      const hasGeoboundaries = plots.some((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
                      const submittedAt = status === "Submitted"
                        ? (c.created_at ?? (c as Record<string, unknown>).createdAt)
                        : null;
                      const submittedStr = submittedAt ? new Date(String(submittedAt)).toLocaleDateString() : "—";
                      return (
                        <tr key={c.id ?? String(c.created_at ?? Math.random())} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-foreground">
                            {c.farmer_code && String(c.farmer_code) !== String(c.id) ? `${c.farmer_code} (${c.id ?? "—"})` : (c.id ?? "—")}
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">{c.farmer_name ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">{c.district ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground">{c.village ?? "—"}</td>
                          <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">
                            {c.date_of_plantation
                              ? new Date(c.date_of_plantation).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-6 py-4 text-foreground">{c.agent_name ?? "—"}</td>
                          <td className="px-6 py-4 tabular-nums font-medium">{areaHa != null ? Number(areaHa).toFixed(2) : "—"}</td>
                          <td className="px-6 py-4">
                            {status === "Submitted" ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium">
                                Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
                                Incomplete
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">{submittedStr}</td>
                          <td className="px-6 py-4 text-center">
                            {hasGeoboundaries ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-lg border-green-200 text-green-600 hover:bg-green-50"
                                title="Download KML"
                                onClick={() => {
                                  const kml = buildKmlForPlots(plots, code || String(c.id ?? "plot"));
                                  downloadKml(kml, `geoboundaries-${(code || c.id) ?? "plot"}.kml`);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {c.id && (
                              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg" asChild>
                                <Link to={`/validator/farmers/coconut/${c.id}`} title="View">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {!coconutLoading && filteredCoconut.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-muted-foreground">
                        {coconutSearch.trim()
                          ? "No matching records for your search. Try a different ID, name, or district."
                          : "No rows in coconut_plantations table. Add data in Supabase or check RLS."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {coconutTotal > 0 && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-muted/30 text-sm rounded-b-2xl">
                <span className="text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{coconutFrom.toLocaleString()}–{coconutTo.toLocaleString()}</span> of <span className="font-medium text-foreground">{coconutTotal.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => goToCoconutPage(-1)}
                    disabled={coconutPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="min-w-[6rem] text-center text-muted-foreground">
                    Page {coconutPage + 1} of {coconutPageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => goToCoconutPage(1)}
                    disabled={coconutPage >= coconutPageCount - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
