import type { CoconutSubmission } from "@/types/coconut";

const STORAGE_KEY = "coconut_submissions";

export function getCoconutSubmissions(agentId?: string): CoconutSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: CoconutSubmission[] = raw ? JSON.parse(raw) : [];
    if (agentId) return list.filter((s) => s.createdBy === agentId);
    return list;
  } catch {
    return [];
  }
}

export function getCoconutSubmissionById(id: string): CoconutSubmission | null {
  const list = getCoconutSubmissions();
  return list.find((s) => s.id === id) ?? null;
}

export function saveCoconutSubmission(data: CoconutSubmission): void {
  const list = getCoconutSubmissions();
  const idx = list.findIndex((s) => s.id === data.id);
  if (idx >= 0) list[idx] = data;
  else list.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function createCoconutSubmissionId(): string {
  return `CP-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
