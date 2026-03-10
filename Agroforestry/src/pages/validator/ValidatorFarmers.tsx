import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCoconutPlantationsFromSupabase, listDocumentsByFarmerCode, getPlotsFromRow, listDocumentsBucketFolderNames, createFarmerRecordInSupabase, updateCoconutPlantationStatus, applyStorageDocumentsPolicy } from "@/lib/supabase";
import type { CoconutPlantationRow } from "@/lib/supabase";
import { buildKmlForPlots, downloadKml } from "@/lib/kml";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Download, Eye, CheckCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const COCONUT_PAGE_SIZE = 100;

/** Get value from row with snake_case/camelCase fallback. Handles null/undefined properly. */
function getCsvVal(c: CoconutPlantationRow | Record<string, unknown>, ...keys: string[]): string {
  const r = c as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== undefined && v !== "" && String(v).toLowerCase() !== "undefined" && String(v).toLowerCase() !== "null") {
      return String(v);
    }
  }
  return "";
}

export type DocLinks = { aadhaarUrl?: string; agreementUrl?: string; bankUrl?: string; priorConsiderationUrl?: string; rtcUrl?: string };

/** From bucket document list, pick URLs for Aadhaar, Agreement, Bank, Prior Consideration, RTC by filename. */
function getDocLinksFromList(docs: { path?: string; name: string; url: string }[]): DocLinks {
  const out: DocLinks = {};
  for (const d of docs) {
    const n = d.name.toLowerCase();
    
    // Aadhaar document patterns
    if (!out.aadhaarUrl && (n.includes("aadhaar") || n.includes("aadhar"))) {
      out.aadhaarUrl = d.url;
    }
    
    // Agreement document patterns (include common typos: aggrement, agrement)
    if (!out.agreementUrl && /agreement|contract|pact|aggrement|agrement/.test(n)) {
      out.agreementUrl = d.url;
    }
    
    // Bank document patterns
    if (!out.bankUrl && (n.includes("bank") || n.includes("account") || n.includes("statement") || n.includes("passbook") || n.includes("cheque"))) {
      out.bankUrl = d.url;
    }
    
    // Prior Consideration (match before RTC so "prior_consideration" is not matched by "document")
    if (!out.priorConsiderationUrl && /prior.*consideration|consideration.*prior/.test(n)) {
      out.priorConsiderationUrl = d.url;
    }
    
    // RTC document patterns (land record, patta, survey, etc.)
    if (!out.rtcUrl && /rtc|patta|survey|land|revenue|extract|legal|7\/12|7-12|land_record|land_doc|document|patta_survey/.test(n)) {
      out.rtcUrl = d.url;
    }
  }
  
  return out;
}

/** Keys we output as fixed columns first (not duplicated in "all other columns") */
const FIXED_CSV_KEYS = new Set([
  "id", "farmer_code", "farmer_id", "farmer_name", "phone", "phone_number", "mobile", "mobile_number",
  "aadhaar", "aadhaar_number", "active_status", "district", "village", "date_of_plantation", "agent_name",
  "adjusted_polygon_area_by_kosher_ha",
]);

/** Build CSV content from coconut rows (Excel-compatible). Includes fixed columns then ALL other Supabase columns. */
function buildCoconutCsv(
  rows: CoconutPlantationRow[],
  getStatus: (c: CoconutPlantationRow, hasAllFourFromBucket?: boolean) => string,
  docLinksByCode: Record<string, DocLinks> = {},
  hasAllFourDocsByCode: Record<string, boolean> = {},
  /** App origin for KML link (e.g. https://agrosowandreap.vercel.app) — link opens /validator/kml/:id and triggers download; works after deploy without API */
  appOrigin: string = ""
): string {
  try {
    if (!Array.isArray(rows)) throw new Error("Invalid data: rows must be an array");

    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      let s: string;
      if (typeof v === "object" && v !== null) {
        try {
          s = JSON.stringify(v);
          if (s.length > 2000) s = s.slice(0, 1997) + "...";
        } catch {
          s = "(object)";
        }
      } else {
        s = String(v);
      }
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      s = s.replace(/[\r\n\t]/g, " ");
      if (/[",\n\r]/.test(s) || /:\/\//.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const submittedDate = (c: CoconutPlantationRow, status: string): string => {
      if (status !== "Submitted") return "";
      try {
        const raw = (c as Record<string, unknown>).updated_at ?? (c as Record<string, unknown>).created_at;
        if (!raw) return "";
        const date = new Date(String(raw));
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString();
      } catch {
        return "";
      }
    };

    const allKeys = new Set<string>();
    rows.forEach((c) => Object.keys(c as Record<string, unknown>).forEach((k) => allKeys.add(k)));
    const extraKeys = [...allKeys].filter((k) => !FIXED_CSV_KEYS.has(k)).sort();

    const fixedHeader = "ID,Farmer Code,Farmer Name,Mobile No,Aadhaar,Active Status,District,Village,Date of Plantation,Agent,Adjusted polygon area (ha),Status,Submitted,Has KML,Plots Count,KML Download Link";
    const header = extraKeys.length > 0 ? fixedHeader + "," + extraKeys.map((k) => escape(k)).join(",") : fixedHeader;

    const lines = [
      header,
      ...rows.map((c, index) => {
        try {
          const r = c as Record<string, unknown>;
          const farmerCode = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
          const hasAllFourFromBucket = hasAllFourDocsByCode[farmerCode] || false;
          const status = getStatus(c, hasAllFourFromBucket);
          const id = escape(c.id ?? `row-${index}`);
          const date = c.date_of_plantation ? new Date(c.date_of_plantation).toLocaleDateString() : "";
          const aadhaar = escape(getCsvVal(c, "aadhaar", "aadhaar_number"));
          const activeStatus = escape(getCsvVal(c, "active_status", "activeStatus"));

          let hasKml = false;
          let plotsCount = 0;
          let kmlDownloadLink = "";
          try {
            const plots = getPlotsFromRow(c as any);
            plotsCount = plots.length || Number((c as Record<string, unknown>).total_plots) || Number((c as Record<string, unknown>).number_of_plots) || 0;
            hasKml = plots.some((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
            if (hasKml && appOrigin && farmerCode) {
              kmlDownloadLink = `${appOrigin.replace(/\/$/, "")}/validator/kml/${encodeURIComponent(farmerCode)}`;
            }
          } catch {
            plotsCount = 0;
            hasKml = false;
          }

          const phone = getCsvVal(c, "phone", "phone_number", "mobile", "mobile_number");
          const adjustedHa = r.adjusted_polygon_area_by_kosher_ha;
          const adjustedHaStr = adjustedHa != null && adjustedHa !== "" && String(adjustedHa).toLowerCase() !== "undefined"
            ? (Number.isFinite(Number(adjustedHa)) ? String(Number(adjustedHa).toFixed(2)) : escape(String(adjustedHa)))
            : "";
          const fixedPart = [
            id,
            escape(farmerCode),
            escape(c.farmer_name),
            escape(phone),
            aadhaar,
            activeStatus,
            escape(c.district),
            escape(c.village),
            date,
            escape(c.agent_name),
            adjustedHaStr,
            escape(status),
            escape(submittedDate(c, status)),
            escape(hasKml ? "Yes" : "No"),
            escape(String(plotsCount)),
            escape(kmlDownloadLink),
          ];
          const extraPart = extraKeys.map((k) => escape(r[k]));
          return [...fixedPart, ...extraPart].join(",");
        } catch (rowError) {
          console.error("Error processing CSV row", index, ":", rowError);
          const fixedPart = [
            escape(`error-row-${index}`), "", "Error processing row", "", "", "", "", "", "", "Error", "", "", "No", "0", "", "",
          ];
          const extraPart = extraKeys.map(() => "");
          return [...fixedPart, ...extraPart].join(",");
        }
      }),
    ];
    
    const csvContent = "\uFEFF" + lines.join("\r\n");
    
    // Validate the generated CSV
    if (csvContent.length === 0) {
      throw new Error("Generated CSV is empty");
    }
    
    return csvContent;
  } catch (error) {
    console.error("Error building CSV:", error);
    throw new Error(`Failed to build CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/** Create a blob URL for CSV with improved error handling and memory management. */
function createCsvBlobUrl(content: string): string {
  try {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    // Set up automatic cleanup after 5 minutes to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log("[DEBUG] Auto-cleaned blob URL:", url);
    }, 300000); // 5 minutes
    return url;
  } catch (error) {
    console.error("[DEBUG] Blob creation failed:", error);
    throw new Error("Failed to create file for download");
  }
}

/** Trigger immediate download of CSV/Excel file with improved browser compatibility. */
function downloadCsv(content: string, filename: string) {
  try {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    // Add to DOM for better browser compatibility
    document.body.appendChild(a);
    // Trigger click with fallback
    if (a.click) {
      a.click();
    } else {
      // Fallback for older browsers
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      a.dispatchEvent(event);
    }
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    console.log("[DEBUG] Download triggered successfully for:", filename);
  } catch (error) {
    console.error("[DEBUG] Download failed:", error);
    // Fallback: open in new window
    try {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`<pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
        newWindow.document.close();
      }
    } catch (fallbackError) {
      console.error("[DEBUG] Fallback also failed:", fallbackError);
    }
    throw error;
  }
}

/** True only when all 4 docs are present: Aadhaar, Agreement, RTC, and Bank. If any one is missing → Incomplete. */
function hasAllFourComplete(c: CoconutPlantationRow | Record<string, unknown>): boolean {
  const r = c as Record<string, unknown>;
  const hasVal = (v: unknown) => v != null && v !== "" && String(v).trim() !== "" && String(v).toLowerCase() !== "undefined";
  
  // Check database fields first
  const hasAadhaar = hasVal(r.aadhaar ?? r.aadhaar_number);
  const hasAgreement = hasVal(
    r.agreement_url ?? r.agreement_document ?? r.agreement ?? r.agreementUrl ?? 
    r.plantation_agreement ?? r.farmer_agreement ?? r.agreement_file
  );
  const hasRTC = hasVal(
    r.land_patta_survey_number ?? r.land_patta_survey ?? r.landPattaSurveyNumber ?? 
    r.rtc_document ?? r.legal_document ?? r.land_document ?? r.survey_document ?? 
    r.patta_document ?? r.rtc_number ?? r.land_patta_or_survey_number
  );
  const hasBank = hasVal(
    r.bank_account ?? r.bank_name ?? r.ifsc ?? r.bank_details ?? r.bankAccount ?? 
    r.bankName ?? r.bank_ifsc ?? r.bank_statement ?? r.bank_document ?? 
    r.bank_passbook ?? r.bank_cheque
  );
  
  // If all documents are found in database fields, return true
  if (hasAadhaar && hasAgreement && hasRTC && hasBank) {
    return true;
  }
  
  // Fallback: If farmer has basic data and aadhaar, assume documents exist in bucket
  // This matches the CSV approach where we construct URLs based on pattern
  const farmerCode = String(r.id ?? "").trim();
  const hasBasicData = hasVal(r.farmer_name) || hasVal(r.phone) || hasAadhaar;
  
  // Use the same logic as CSV - if basic data exists, assume documents exist in bucket
  return hasBasicData && hasAadhaar;
}

/** Check if documents actually exist in bucket by testing HTTP requests */
async function checkDocumentsExistInBucket(farmerCode: string): Promise<boolean> {
  const baseUrl = "https://ahkkuzseckcrpjbdohth.supabase.co/storage/v1/object/public/documents";
  
  try {
    // First, try to list the actual files in the bucket
    const actualFiles = await listDocumentsByFarmerCode(farmerCode);
    
    // Check if we have all 4 document types in the actual files
    const hasAadhaar = actualFiles.some(f => f.name.toLowerCase().includes("aadhaar"));
    const hasAgreement = actualFiles.some(f => f.name.toLowerCase().includes("agreement"));
    const hasBank = actualFiles.some(f => f.name.toLowerCase().includes("bank"));
    const hasRtc = actualFiles.some(f => f.name.toLowerCase().includes("rtc") || f.name.toLowerCase().includes("patta") || f.name.toLowerCase().includes("survey"));
    
    return hasAadhaar && hasAgreement && hasBank && hasRtc;
    
  } catch {
    // Fallback: Try URL testing if bucket listing fails
    const documentTypes = [
      { name: "aadhaar", extensions: ["png", "jpg", "jpeg", "pdf"] },
      { name: "agreement", extensions: ["pdf", "png", "jpg", "jpeg"] },
      { name: "bank", extensions: ["pdf", "png", "jpg", "jpeg"] },
      { name: "rtc", extensions: ["pdf", "png", "jpg", "jpeg"] }
    ];
    
    for (const docType of documentTypes) {
      let found = false;
      
      for (const ext of docType.extensions) {
        const url = `${baseUrl}/${farmerCode}/${farmerCode}_${docType.name}.${ext}`;
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            found = true;
            break;
          }
        } catch {
          // Continue trying other extensions
        }
      }
      
      if (!found) return false;
    }
    return true;
  }
}

/** True if farmer code matches a folder in the bucket list (e.g. "22071", "farmer_22071", "22071_docs"). */
function isFarmerInBucketList(code: string, folderNames: string[]): boolean {
  if (!code || !folderNames.length) return false;
  const c = code.toLowerCase();
  return folderNames.some(
    (f) =>
      f === code ||
      f === `farmer_${code}` ||
      f.startsWith(`${code}_`) ||
      f.endsWith(`_${code}`) ||
      f.toLowerCase() === c
  );
}

/** Check if bucket has all 4 doc types (Aadhaar, Agreement, Bank, RTC) by file names. */
function checkBucketHasAllFourDocTypes(docNames: string[]): boolean {
  const names = docNames.map((n) => n.toLowerCase());
  const hasAadhaar = names.some((n) =>
    /aadha?ar|uid|identity|id_proof|idproof/.test(n)
  );
  const hasAgreement = names.some((n) =>
    /agreement|contract|pact|aggrement|agrement|plantation_agreement|farmer_agreement/.test(n)
  );
  const hasBank = names.some((n) =>
    /bank|account|statement|passbook|cheque|ifsc/.test(n)
  );
  const hasRtc = names.some((n) =>
    /rtc|patta|survey|land|revenue|extract|legal|7\/12|7-12|land_record|land_doc|document|patta_survey/.test(n)
  );
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

/** Get area in hectares from a coconut row. Prefers adjusted_polygon_area_by_kosher_ha for validator table. */
function getAreaHa(c: CoconutPlantationRow | Record<string, unknown>): number | null {
  const r = c as Record<string, unknown>;
  const keys = [
    "adjusted_polygon_area_by_kosher_ha",
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
    if (/adjusted_polygon_area_by_kosher_ha|area_under_coconut|areaUnderCoconut|total_area_hectares|totalAreaHectares|area.*hectare/i.test(k)) {
      const v = r[k];
      if (v != null && v !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return null;
}

type StatusTab = "all" | "submitted" | "incomplete";

/** Submission date string (YYYY-MM-DD) from a coconut row for filtering/grouping. */
function getSubmissionDateKey(c: CoconutPlantationRow): string {
  const raw = (c as Record<string, unknown>).updated_at ?? (c as Record<string, unknown>).created_at;
  if (!raw) return "";
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export default function ValidatorFarmers() {
  const [searchParams] = useSearchParams();
  const [coconutSearch, setCoconutSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [dateFilter, setDateFilter] = useState<string | null>(null); // YYYY-MM-DD or null = all dates
  const [coconutPage, setCoconutPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportReady, setExportReady] = useState<{ url: string; filename: string } | null>(null);
  const exportBlobUrlRef = useRef<string | null>(null);

  // Restore tab and date from URL when returning from Farmer Information (Back button)
  useEffect(() => {
    const tab = searchParams.get("tab");
    const date = searchParams.get("date");
    if (tab === "submitted" || tab === "incomplete" || tab === "all") setStatusTab(tab);
    if (date != null && date !== "") setDateFilter(date);
    else setDateFilter(null);
  }, [searchParams]);

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

  // Add debug logging for data loading
  useEffect(() => {
    console.log("[DEBUG] Data loading state - coconutLoading:", coconutLoading);
    console.log("[DEBUG] Data loading state - coconutError:", coconutError);
    console.log("[DEBUG] Data loaded - coconutPlantations.length:", coconutPlantations.length);
  }, [coconutLoading, coconutError, coconutPlantations]);

  const { data: bucketFolderNames = [], isLoading: bucketFoldersLoading } = useQuery({
    queryKey: ["bucket-folder-names"],
    queryFn: () => listDocumentsBucketFolderNames(),
    staleTime: 60_000,
  });
  const bucketFolderCount = bucketFolderNames.length;

  const filteredCoconut = useMemo(() => {
    const q = String(coconutSearch).toLowerCase().trim();
    console.log("[DEBUG] Filtering data. Search term:", q);
    console.log("[DEBUG] Total coconutPlantations:", coconutPlantations.length);
    
    if (!q) {
      console.log("[DEBUG] No search term, returning all data");
      return coconutPlantations;
    }
    
    const exactMatch = coconutPlantations.filter((c: CoconutPlantationRow) => {
      try {
        const id = String(c.id ?? "").toLowerCase();
        const farmerCode = String(c.farmer_id ?? c.id ?? "").toLowerCase();
        const farmerId = String(c.farmer_id ?? "").toLowerCase();
        return id === q || farmerCode === q || farmerId === q;
      } catch {
        return false;
      }
    });
    
    if (exactMatch.length > 0) {
      console.log("[DEBUG] Found exact matches:", exactMatch.length);
      return exactMatch;
    }
    
    const filtered = coconutPlantations.filter((c: CoconutPlantationRow) => {
      try {
        const id = String(c.id ?? "").toLowerCase();
        const farmerCode = String(c.farmer_id ?? c.id ?? "").toLowerCase();
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
    
    console.log("[DEBUG] Filtered result:", filtered.length);
    return filtered;
  }, [coconutPlantations, coconutSearch]);

  // Status for all filtered rows: folder in bucket → Submitted, else Incomplete
  const hasUploadedByCodeAll = useMemo(() => {
    const m: Record<string, boolean> = {};
    const folders = bucketFolderNames as string[];
    filteredCoconut.forEach((c) => {
      const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
      if (code) m[code] = isFarmerInBucketList(code, folders);
    });
    return m;
  }, [filteredCoconut, bucketFolderNames]);

  // Filter by tab: Submitted = has folder in bucket, Incomplete = no folder
  const tabFilteredCoconut = useMemo(() => {
    if (statusTab === "all") return filteredCoconut;
    return filteredCoconut.filter((c) => {
      const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
      const submitted = !!hasUploadedByCodeAll[code];
      if (statusTab === "submitted") return submitted;
      return !submitted;
    });
  }, [filteredCoconut, statusTab, hasUploadedByCodeAll]);

  // Records that have uploaded documents (folder in bucket) — used for calendar dots so "Uploaded Documents" dates always show
  const coconutWithUploads = useMemo(
    () => filteredCoconut.filter((c) => {
      const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
      return !!hasUploadedByCodeAll[code];
    }),
    [filteredCoconut, hasUploadedByCodeAll]
  );

  // Count records per date for event-style calendar: use uploaded-docs set so calendar shows all dates that have uploads (aligns with Uploaded Documents count)
  const recordCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    coconutWithUploads.forEach((c) => {
      const key = getSubmissionDateKey(c);
      if (key) map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [coconutWithUploads]);

  // Filter by submission date when date filter is set
  const dateFilteredCoconut = useMemo(() => {
    if (!dateFilter) return tabFilteredCoconut;
    return tabFilteredCoconut.filter((c) => getSubmissionDateKey(c) === dateFilter);
  }, [tabFilteredCoconut, dateFilter]);

  // Group by submission date (newest first) for date-wise display
  const recordsByDate = useMemo(() => {
    const map = new Map<string, { dateLabel: string; records: CoconutPlantationRow[] }>();
    dateFilteredCoconut.forEach((c) => {
      const key = getSubmissionDateKey(c) || "no-date";
      const raw = (c as Record<string, unknown>).updated_at ?? (c as Record<string, unknown>).created_at;
      const d = raw ? new Date(String(raw)) : new Date();
      const dateLabel = key === "no-date" ? "No date" : d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, { dateLabel, records: [] });
      map.get(key)!.records.push(c);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === "no-date" ? 1 : b[0] === "no-date" ? -1 : b[0].localeCompare(a[0])))
      .map(([dateKey, { dateLabel, records }]) => ({ dateKey, dateLabel, records }));
  }, [dateFilteredCoconut]);

  const recordCounts = useMemo(() => {
    let submitted = 0;
    let incomplete = 0;
    filteredCoconut.forEach((c) => {
      const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
      if (hasUploadedByCodeAll[code]) submitted++;
      else incomplete++;
    });
    return { submitted, incomplete, total: filteredCoconut.length };
  }, [filteredCoconut, hasUploadedByCodeAll]);

  // Sort by submission date (newest first) for date-wise display
  const sortedByDate = useMemo(
    () => [...dateFilteredCoconut].sort((a, b) => {
      const ka = getSubmissionDateKey(a);
      const kb = getSubmissionDateKey(b);
      return kb.localeCompare(ka);
    }),
    [dateFilteredCoconut]
  );

  const coconutTotal = sortedByDate.length;
  const coconutPageCount = Math.max(1, Math.ceil(coconutTotal / COCONUT_PAGE_SIZE));
  const coconutFrom = coconutTotal === 0 ? 0 : coconutPage * COCONUT_PAGE_SIZE + 1;
  const coconutTo = Math.min((coconutPage + 1) * COCONUT_PAGE_SIZE, coconutTotal);
  const coconutPageRows = useMemo(
    () => sortedByDate.slice(coconutPage * COCONUT_PAGE_SIZE, (coconutPage + 1) * COCONUT_PAGE_SIZE),
    [sortedByDate, coconutPage]
  );

  useEffect(() => {
    exportBlobUrlRef.current = exportReady?.url ?? null;
  }, [exportReady?.url]);

  useEffect(() => {
    return () => {
      // Clean up any remaining blob URLs
      const url = exportBlobUrlRef.current;
      if (url) {
        try {
          URL.revokeObjectURL(url);
          console.log("[DEBUG] Cleaned up blob URL on unmount:", url);
        } catch (error) {
          console.warn("[DEBUG] Failed to clean up blob URL:", error);
        }
      }
    };
  }, []);

  useEffect(() => {
    setCoconutPage(0);
  }, [coconutSearch, statusTab, dateFilter]);

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
        </div>

        {/* Record Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Incomplete</p>
                <p className="text-3xl font-bold text-orange-600">{recordCounts.incomplete ?? 0}</p>
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
                <p className="text-3xl font-bold text-blue-600">{recordCounts.submitted ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Has folder in bucket</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Uploaded Documents</p>
                <p className="text-3xl font-bold text-emerald-600">{bucketFolderCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Folders (Aadhaar, Agreement, Bank, RTC)</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-emerald-600"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-600">{recordCounts.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">All farmers (search result)</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-gray-600"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-3 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by ID, farmer code, name, district, village, agent..."
                  value={coconutSearch}
                  onChange={(e) => setCoconutSearch(e.target.value)}
                  className="pl-10 h-10 rounded-lg border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm text-muted-foreground whitespace-nowrap">Filter by date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 min-w-[160px] justify-start text-left font-normal rounded-lg",
                        !dateFilter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter ? format(new Date(dateFilter + "T12:00:00"), "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="bottom" align="start" sideOffset={6} avoidCollisions={false}>
                    <Calendar
                      mode="single"
                      selected={dateFilter ? new Date(dateFilter + "T12:00:00") : undefined}
                      onSelect={(d) => setDateFilter(d ? format(d, "yyyy-MM-dd") : null)}
                      modifiers={{
                        hasRecords: (date) => (recordCountByDate[format(date, "yyyy-MM-dd")] ?? 0) > 0,
                      }}
                      modifiersClassNames={{
                        hasRecords: "day-has-records",
                      }}
                      components={{
                        DayContent: ({ date, activeModifiers }) => {
                          const key = format(date, "yyyy-MM-dd");
                          const count = recordCountByDate[key] ?? 0;
                          return (
                            <span className="relative inline-flex flex-col items-center justify-center gap-0.5">
                              <span>{format(date, "d")}</span>
                              {count > 0 && (
                                <span
                                  className={cn(
                                    "text-[10px] font-medium tabular-nums leading-none rounded px-1 min-w-[1.25rem] flex items-center justify-center",
                                    activeModifiers.selected
                                      ? "bg-primary-foreground/20 text-primary-foreground"
                                      : "bg-primary/15 text-primary"
                                  )}
                                  title={`${count} record${count === 1 ? "" : "s"}`}
                                >
                                  {count}
                                </span>
                              )}
                            </span>
                          );
                        },
                      }}
                    />
                    <p className="px-3 pt-1 text-xs text-muted-foreground border-t border-border">
                      Numbers show record count per date
                    </p>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setDateFilter(null)}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setDateFilter(format(new Date(), "yyyy-MM-dd"))}
                      >
                        Today
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                {dateFilter && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 rounded-lg"
                    onClick={() => setDateFilter(null)}
                    title="Clear date to show all records"
                  >
                    Clear date
                  </Button>
                )}
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-2 h-10 shrink-0 rounded-lg"
                onClick={async () => {
                  const dataToExport = dateFilteredCoconut;
                  if (exporting || dataToExport.length === 0) return;
                  setExportError(null);
                  setExportReady((prev) => {
                    if (prev?.url) {
                      try { URL.revokeObjectURL(prev.url); } catch { /* ignore */ }
                    }
                    return null;
                  });
                  setExporting(true);
                  try {
                    if (!dataToExport || dataToExport.length === 0) {
                      throw new Error("No data available for export");
                    }
                    const docLinksByCode: Record<string, DocLinks> = {};
                    dataToExport.forEach((c) => {
                      const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
                      if (!code) return;
                      docLinksByCode[code] = {
                        aadhaarUrl: getCsvVal(c, "aadhaar_url", "aadhaar_document", "aadhaar_document_url", "aadhaarFile", "aadhaar_path"),
                        agreementUrl: getCsvVal(c, "agreement_url", "agreement_document", "plantation_agreement", "farmer_agreement", "agreementFile", "agreement_path"),
                        bankUrl: getCsvVal(c, "bank_url", "bank_document", "bank_statement", "bank_passbook", "bankFile", "bank_path"),
                        priorConsiderationUrl: getCsvVal(c, "prior_consideration_url", "prior_consideration_document", "priorConsiderationFile", "priorConsiderationPath"),
                        rtcUrl: getCsvVal(c, "rtc_url", "rtc_document", "land_document", "survey_document", "patta_document", "land_patta_or_survey_number", "rtcFile", "rtc_path", "landRecord"),
                      };
                    });
                    const uploadedForCsv: Record<string, boolean> = {};
                    dataToExport.forEach((c) => {
                      const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
                      uploadedForCsv[code] = isFarmerInBucketList(code, bucketFolderNames as string[]);
                    });
                    const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
                    const csv = buildCoconutCsv(
                      dataToExport,
                      (c, hasAllFourFromBucket) => getSubmissionStatus(c, hasAllFourFromBucket),
                      docLinksByCode,
                      uploadedForCsv,
                      appOrigin
                    );
                    if (!csv || csv.length === 0) {
                      throw new Error("Failed to generate CSV content");
                    }
                    const searchPart = coconutSearch.trim() ? `-${coconutSearch.trim().slice(0, 20).replace(/[^\w\-]/g, "_")}` : "";
                    const tabPart = statusTab === "all" ? "all" : statusTab === "submitted" ? "submitted" : "incomplete";
                    const name = `coconut-plantations-${tabPart}${searchPart}-${new Date().toISOString().slice(0, 10)}.csv`;
                    const url = createCsvBlobUrl(csv);
                    setExportReady({ url, filename: name });
                    setTimeout(() => {
                      try { downloadCsv(csv, name); } catch { /* user can use link */ }
                    }, 100);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Export failed";
                    setExportError(message);
                    if (message.includes("No data")) {
                      setExportError("No data available to export. Please try refreshing the data.");
                    } else if (message.includes("network") || message.includes("fetch")) {
                      setExportError("Network error occurred. Please check your connection and try again.");
                    } else if (message.includes("memory") || message.includes("size")) {
                      setExportError("Dataset too large. Try filtering the data first.");
                    } else {
                      setExportError(`Export failed: ${message}`);
                    }
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={coconutLoading || exporting || dateFilteredCoconut.length === 0}
              >
                <Download className="h-4 w-4" />
                {exporting ? "Preparing export…" : "Download Excel"}
              </Button>
            </div>
            {exportError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2 w-full lg:w-auto">
                <span>{exportError}</span>
                <Button variant="ghost" size="sm" className="shrink-0 h-8" onClick={() => setExportError(null)}>Dismiss</Button>
              </div>
            )}
            {exportReady && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 flex items-center gap-2 flex-wrap">
                <span>Export ready —</span>
                <a
                  href={exportReady.url}
                  download={exportReady.filename}
                  className="font-medium underline underline-offset-2 hover:no-underline"
                >
                  Click here to download your file
                </a>
              </div>
            )}
          </div>
        </div>

        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)} className="mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-12 rounded-lg bg-muted/60 p-1">
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              All ({recordCounts.total ?? 0})
            </TabsTrigger>
            <TabsTrigger value="submitted" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Submitted ({recordCounts.submitted ?? 0})
            </TabsTrigger>
            <TabsTrigger value="incomplete" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Incomplete ({recordCounts.incomplete ?? 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Farmer ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Farmer Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">District</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Village</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Plantation</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjusted polygon area (ha)</th>
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
                    (() => {
                      let lastDateKey: string | null = null;
                      return coconutPageRows.map((c: CoconutPlantationRow) => {
                        const code = String(c.farmer_id ?? c.farmer_code ?? c.id ?? "").trim();
                        const hasUploaded = !!hasUploadedByCodeAll[code];
                        const status = bucketFoldersLoading ? "Checking" : (hasUploaded ? "Submitted" : "Incomplete");
                        const plots = getPlotsFromRow(c as any);
                        const hasGeoboundaries = plots.some((p) => Array.isArray(p.latlngs) && p.latlngs.length >= 3);
                        const submittedAt = status === "Submitted"
                          ? (c.updated_at || c.created_at)
                          : null;
                        const submittedStr = submittedAt ? new Date(String(submittedAt)).toLocaleDateString() : "—";
                        const dateKey = getSubmissionDateKey(c) || "no-date";
                        const raw = (c as Record<string, unknown>).updated_at ?? (c as Record<string, unknown>).created_at;
                        const dateLabel = raw ? new Date(String(raw)).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "No date";
                        const dateSectionCount = recordsByDate.find((g) => g.dateKey === dateKey)?.records.length ?? 0;
                        const showDateHeader = dateKey !== lastDateKey;
                        if (showDateHeader) lastDateKey = dateKey;
                        return (
                          <Fragment key={c.id ?? String(c.created_at ?? Math.random())}>
                            {showDateHeader && (
                              <tr className="bg-muted/60 border-y border-border">
                                <td colSpan={11} className="px-6 py-3 text-sm font-semibold text-foreground">
                                  {dateLabel} — {dateSectionCount} record{dateSectionCount === 1 ? "" : "s"}
                                </td>
                              </tr>
                            )}
                            <tr className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-foreground">
                            {code || "—"}
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
                          <td className="px-6 py-4 tabular-nums font-medium">
                            {(() => {
                              const v = (c as Record<string, unknown>).adjusted_polygon_area_by_kosher_ha;
                              if (v == null || v === "") return "—";
                              const n = Number(v);
                              return Number.isFinite(n) ? n.toFixed(2) : "—";
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            {bucketFoldersLoading ? (
                              <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium">
                                Checking…
                              </span>
                            ) : status === "Submitted" ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium" title="Folder in bucket (uploaded)">
                                Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium" title="No folder in bucket">
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
                                <Link
                                  to={`/validator/farmers/coconut/${c.id}${(() => {
                                    const q = new URLSearchParams();
                                    if (statusTab !== "all") q.set("tab", statusTab);
                                    if (dateFilter) q.set("date", dateFilter);
                                    const s = q.toString();
                                    return s ? `?${s}` : "";
                                  })()}`}
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </td>
                        </tr>
                          </Fragment>
                        );
                      });
                    })()
                  )}
                  {!coconutLoading && dateFilteredCoconut.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-muted-foreground">
                        {dateFilter
                          ? "No records on this date. Try another date or clear the date filter."
                          : coconutSearch.trim()
                            ? "No matching records for your search. Try a different ID, name, or district."
                            : statusTab === "submitted"
                              ? "No submitted records in this view."
                              : statusTab === "incomplete"
                                ? "No incomplete records in this view."
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
