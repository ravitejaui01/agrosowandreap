import type { CoconutSubmission } from "@/types/coconut";

// Use VITE_API_URL if set (e.g. production); else "" so dev uses same-origin + Vite proxy → local API
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function submitCoconutRegistration(data: Partial<CoconutSubmission> & {
  farmerName: string;
  phone: string;
  aadhaar: string;
  agentName: string;
  totalAreaHectares: number;
  areaUnderCoconutHectares: number;
  numberOfPlots: number;
  district: string;
  village: string;
  seedlingsPlanted: number;
  seedlingsSurvived: number;
  createdBy: string;
}) {
  const res = await fetch(`${API_BASE}/api/coconut`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: string; detail?: string };
    const msg = err.error || res.statusText || "Server error";
    const detail = err.detail ? ` (${err.detail})` : "";
    throw new Error(msg + detail);
  }
  return body;
}
