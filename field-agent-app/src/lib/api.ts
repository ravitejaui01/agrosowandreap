import type { CoconutSubmission } from "@/types/coconut";

// Use VITE_API_URL if set; else Railway API (production); else "" for local proxy
const API_BASE = (import.meta.env.VITE_API_URL ?? "https://api-production-de18.up.railway.app").replace(/\/$/, "");

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: string }).error || res.statusText;
    throw new Error(msg || "Server error");
  }
  return res.json();
}
