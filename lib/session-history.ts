import type { FitzpatrickType, Interval } from "@/lib/dose/types";

/**
 * Placeholder persistence for ended sessions. This is explicitly a stand-in
 * — real persistence goes through the Drizzle schema in lib/db/schema.ts
 * (`exposureSessions`, `doseRecords`) once the API routes for it exist.
 * Keep this file's shape in sync with that schema when it lands, and swap
 * `readSessionHistory`/`saveSessionToHistory` for real API calls without
 * touching the screens that call them.
 */
export interface HistoricalSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  fitzpatrickType: FitzpatrickType;
  cumulativeDoseSED: Interval;
  medThresholdSED: Interval;
  surface: string;
  note?: string;
}

export const SESSION_HISTORY_STORAGE_KEY = "uv-dose-tracker:sessions";

export function readSessionHistory(): HistoricalSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoricalSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionToHistory(session: HistoricalSession): void {
  if (typeof window === "undefined") return;
  const existing = readSessionHistory();
  window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify([session, ...existing]));
  window.dispatchEvent(new Event("uv-dose-tracker:sessions-updated"));
}
