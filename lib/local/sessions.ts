import type {
  DoseEstimate,
  FitzpatrickType,
  PostureType,
  SunscreenApplication,
  SurfaceType,
} from "@/lib/dose/types";
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
  fitzpatrickType: FitzpatrickType;
  estimate: DoseEstimate;
  note?: string;
}): Promise<void> {
  const history = readHistory();
  const entry: HistoricalSession = {
    id: params.sessionId,
    startedAt: params.startedAt.toISOString(),
    endedAt: params.endedAt.toISOString(),
    fitzpatrickType: params.fitzpatrickType,
    cumulativeDoseSED: params.estimate.cumulativeDoseSED,
    medThresholdSED: params.estimate.medThresholdSED,
    surface: params.surface,
    note: params.note || undefined,
  };
  writeHistory([entry, ...history.filter((s) => s.id !== params.sessionId)]);
}

/** Fetches saved sessions, newest first. */
export async function fetchDbSessionHistory(): Promise<HistoricalSession[]> {
  return [...readHistory()].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}
