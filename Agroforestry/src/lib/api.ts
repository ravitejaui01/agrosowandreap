const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function get(url: string) {
  return fetch(API_BASE + url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
}

function post(url: string, body: unknown) {
  return fetch(API_BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
}

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

/** Coconut Plantation Registration – submit new */
export async function registerCoconutPlantation(
  data: Omit<import("@/types").CoconutSubmission, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
) {
  return post("/api/coconut", data) as Promise<import("@/types").CoconutSubmission>;
}
