import type {
  DoseEstimate,
  FitzpatrickType,
  PostureType,
  SunscreenApplication,
  SurfaceType,
} from "@/lib/dose/types";
import type { Interval } from "@/lib/dose/types";
import type { HistoricalSession } from "@/lib/session-history";

const STORAGE_KEY = "uv-tracker:sessions";

function readHistory(): HistoricalSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(sessions: HistoricalSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Starts a new session and returns its local id. There's no server, so this
 * just mints an id for the in-memory session state (see app/session/page.tsx)
 * — nothing is written to storage until the session ends and is saved.
 */
export async function createDbSession(_params: {
  startedAt: Date;
  latitude: number;
  longitude: number;
  surface: SurfaceType;
  posture: PostureType;
  fitzpatrickType: FitzpatrickType;
}): Promise<string> {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * No-op: sunscreen applications already live in the active session's React
 * state while it's running, and are included when the session is saved via
 * endDbSession. Kept so app/session/page.tsx doesn't need special-casing.
 */
export async function insertSunscreenApplicationRow(
  _sessionId: string,
  _application: SunscreenApplication,
): Promise<void> {}

/** Saves a finished session into local history. */
export async function endDbSession(params: {
  sessionId: string;
  startedAt: Date;
  endedAt: Date;
  surface: SurfaceType;
  posture?: PostureType;
  fitzpatrickType: FitzpatrickType;
  estimate: DoseEstimate;
  note?: string;
  location?: { label: string; latitude: number; longitude: number };
  applications?: SunscreenApplication[];
}): Promise<void> {
  const history = readHistory();
  const entry: HistoricalSession = {
    id: params.sessionId,
    startedAt: params.startedAt.toISOString(),
    endedAt: params.endedAt.toISOString(),
    fitzpatrickType: params.fitzpatrickType,
    // Store this session's own dose, not the day total, so History can sum
    // sessions without double-counting.
    cumulativeDoseSED: params.estimate.sessionDoseSED,
    incidentDoseSED: params.estimate.sessionIncidentDoseSED,
    medThresholdSED: params.estimate.medThresholdSED,
    surface: params.surface,
    posture: params.posture,
    location: params.location,
    sunscreenSPFs: params.applications?.map((a) => a.labeledSPF),
    note: params.note || undefined,
  };
  writeHistory([entry, ...history.filter((s) => s.id !== params.sessionId)]);
}

/**
 * A saved session's dose before sunscreen. Sessions saved before October
 * 2026 did not record it; for those, the after-sunscreen dose is used, which
 * is a lower bound (identical when no sunscreen was worn).
 */
export function incidentDoseOf(session: HistoricalSession): Interval {
  return session.incidentDoseSED ?? session.cumulativeDoseSED;
}

/**
 * Sum of before-sunscreen dose from sessions saved on the same local
 * calendar day as `day`, for the daily work-exposure (ICNIRP) comparison.
 * `excludeId` skips a session that is also being counted live.
 */
export async function fetchIncidentDoseOnDay(day: Date, excludeId?: string): Promise<Interval> {
  const total = { low: 0, nominal: 0, high: 0 };
  for (const s of readHistory()) {
    if (s.id === excludeId) continue;
    if (new Date(s.startedAt).toDateString() !== day.toDateString()) continue;
    const dose = incidentDoseOf(s);
    total.low += dose.low;
    total.nominal += dose.nominal;
    total.high += dose.high;
  }
  return total;
}

/** Fetches saved sessions, newest first. */
export async function fetchDbSessionHistory(): Promise<HistoricalSession[]> {
  return [...readHistory()].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

/**
 * Sum of dose from sessions saved earlier on the same local calendar day as
 * `now`. Fed into the dose engine as priorDoseTodaySED so a second outing
 * does not start from a full budget.
 */
export async function fetchPriorDoseToday(now: Date): Promise<Interval> {
  const total = { low: 0, nominal: 0, high: 0 };
  for (const s of readHistory()) {
    const start = new Date(s.startedAt);
    const end = new Date(s.endedAt);
    if (start.toDateString() !== now.toDateString() || end.getTime() > now.getTime()) continue;
    total.low += s.cumulativeDoseSED.low;
    total.nominal += s.cumulativeDoseSED.nominal;
    total.high += s.cumulativeDoseSED.high;
  }
  return total;
}
