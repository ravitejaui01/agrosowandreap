import type { BiocharDeployment } from "@/types";

const STORAGE_KEY = "agroforestry_biochar_deployments";

function loadDeployments(): BiocharDeployment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [
    {
      id: "bc-1",
      siteName: "North Block A",
      district: "Guntur",
      village: "Arumbaka",
      deploymentDate: "2025-01-15",
      quantityTonnes: 2.5,
      areaAcres: 1.2,
      latlngs: undefined,
      notes: "Initial pilot",
      createdBy: "4",
      createdAt: "2025-01-15T10:00:00Z",
      updatedAt: "2025-01-15T10:00:00Z",
    },
  ];
}

function saveDeployments(list: BiocharDeployment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

export function getBiocharDeployments(): BiocharDeployment[] {
  return loadDeployments();
}

export function getBiocharDeploymentById(id: string): BiocharDeployment | null {
  return loadDeployments().find((d) => d.id === id) ?? null;
}

export function saveBiocharDeployment(
  deployment: Omit<BiocharDeployment, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }
): BiocharDeployment {
  const list = loadDeployments();
  const now = new Date().toISOString();
  const existing = list.findIndex((d) => d.id === deployment.id);
  const record: BiocharDeployment = {
    ...deployment,
    createdAt: deployment.createdAt ?? (existing >= 0 ? list[existing].createdAt : now),
    updatedAt: now,
  };
  if (existing >= 0) {
    list[existing] = record;
  } else {
    list.push(record);
  }
  saveDeployments(list);
  return record;
}
