// Dev: "" = proxy forwards /api (set VITE_PROXY_TARGET=http://localhost:3000 to use local API). Production: Use Supabase only
const API_BASE = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "" : "")
).replace(/\/$/, "");

async function checkOk(r: Response) {
  if (r.ok) return;
  let msg = r.statusText;
  try {
    const body = await r.json();
    if (body && typeof body === "object" && typeof body.error === "string") msg = body.error;
  } catch {
    // ignore
  }
  throw new Error(msg);
}

function get(url: string) {
  return fetch(API_BASE + url).then(async (r) => {
    await checkOk(r);
    return r.json();
  });
}

function post(url: string, body: unknown) {
  return fetch(API_BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => {
    await checkOk(r);
    return r.json();
  });
}

function patch(url: string, body: unknown) {
  return fetch(API_BASE + url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => {
    await checkOk(r);
    return r.json();
  });
}

function del(url: string) {
  return fetch(API_BASE + url, {
    method: "DELETE",
  }).then(async (r) => {
    await checkOk(r);
    return r.json();
  });
}

// ---------- Data Validator: Farmers / Records ----------

/** List all farmer records (optional status filter) */
export async function getFarmerRecords(status?: string) {
  const url = status ? `/api/farmers?status=${encodeURIComponent(status)}` : "/api/farmers";
  return get(url) as Promise<import("@/types").FarmerRecord[]>;
}

/** Farmer records stats for validator dashboard */
export async function getFarmerStats() {
  const raw = (await get("/api/farmers/stats")) as {
    total_records?: number;
    pending_review?: number;
    approved?: number;
    rejected?: number;
    corrections_needed?: number;
  };
  return {
    totalRecords: raw.total_records ?? 0,
    pendingReview: raw.pending_review ?? 0,
    approved: raw.approved ?? 0,
    rejected: raw.rejected ?? 0,
    correctionsNeeded: raw.corrections_needed ?? 0,
  } as import("@/types").DashboardStats;
}

/** Get one farmer record by id */
export async function getFarmerRecordById(id: string) {
  return get(`/api/farmers/${id}`) as Promise<import("@/types").FarmerRecord>;
}

/** Update farmer record (e.g. status for validator workflow) */
export async function updateFarmerRecord(
  id: string,
  data: Partial<import("@/types").FarmerRecord>
) {
  return patch(`/api/farmers/${id}`, data) as Promise<import("@/types").FarmerRecord>;
}

/** Delete farmer record */
export async function deleteFarmerRecord(id: string) {
  return del(`/api/farmers/${id}`) as Promise<{ success: boolean }>;
}

/** Create or link a farmer_record from a coconut (Supabase) row so Approve/Recollect work */
export async function ensureFarmerRecordFromCoconut(
  row: Record<string, unknown>
): Promise<import("@/types").FarmerRecord> {
  return post("/api/farmers/from-coconut", row) as Promise<import("@/types").FarmerRecord>;
}

/** List all users (for Field Executives = field_agent role) */
export async function getUsers() {
  return get("/api/users") as Promise<import("@/types").User[]>;
}

// ---------- Coconut ----------

/** Coconut Plantation – list all */
export async function getCoconutPlantations() {
  return get("/api/coconut") as Promise<import("@/types").CoconutSubmission[]>;
}

/** Coconut Plantation – stats for dashboard */
export async function getCoconutPlantationStats() {
  return get("/api/coconut/stats") as Promise<import("@/types").CoconutPlantationStats>;
}

/** Coconut Plantation – get one by id */
export async function getCoconutPlantationById(id: string) {
  return get(`/api/coconut/${id}`) as Promise<import("@/types").CoconutSubmission>;
}

/** Coconut Plantation – get one by farmer code (fallback when id lookup fails) */
export async function getCoconutPlantationByFarmerCode(farmerCode: string) {
  return get(`/api/coconut/by-farmer-code/${encodeURIComponent(farmerCode)}`) as Promise<import("@/types").CoconutSubmission>;
}

/** Coconut Plantation Registration – submit new */
export async function registerCoconutPlantation(
  data: Omit<import("@/types").CoconutSubmission, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
) {
  return post("/api/coconut", data) as Promise<import("@/types").CoconutSubmission>;
}
