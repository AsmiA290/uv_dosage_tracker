import type { FitzpatrickType, Interval, PostureType, SunscreenApplication, SurfaceType } from "@/lib/dose/types";

/**
 * Persists the session that is currently running (or ended but not yet
 * saved) so it survives a page reload. Mobile browsers routinely discard
 * background tabs; without this, a 2-hour practice could vanish from the
 * day's total and the app would show more burn budget than the user has.
 */

const STORAGE_KEY = "uv-tracker:in-progress-session";

export interface SessionSetup {
  fitzpatrickType: FitzpatrickType;
  surface: SurfaceType;
  posture: PostureType;
  spf: string;
  thickness: number;
}

export interface SessionLocation {
  latitude: number;
  longitude: number;
  label: string;
}

export interface InProgressSession {
  id: string;
  startedAt: Date;
  /** Set once the user taps End; the session stays here until saved or discarded. */
  endedAt?: Date;
  setup: SessionSetup;
  applications: SunscreenApplication[];
  note: string;
  priorDose: Interval;
  location: SessionLocation;
}

interface StoredSession {
  version: 1;
  id: string;
  startedAt: string;
  endedAt?: string;
  setup: SessionSetup;
  applications: Array<Omit<SunscreenApplication, "appliedAt"> & { appliedAt: string }>;
  note: string;
  priorDose: Interval;
  location: SessionLocation;
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

export function serializeSession(session: InProgressSession): string {
  const stored: StoredSession = {
    version: 1,
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString(),
    setup: session.setup,
    applications: session.applications.map((a) => ({ ...a, appliedAt: a.appliedAt.toISOString() })),
    note: session.note,
    priorDose: session.priorDose,
    location: session.location,
  };
  return JSON.stringify(stored);
}

/** Returns null for anything missing, malformed, or from an unknown version. */
export function deserializeSession(raw: string | null): InProgressSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<StoredSession>;
    if (s.version !== 1 || !s.id || !s.startedAt || !s.setup || !s.location || !s.priorDose) return null;
    const startedAt = new Date(s.startedAt);
    const endedAt = s.endedAt ? new Date(s.endedAt) : undefined;
    if (!isValidDate(startedAt) || (endedAt && !isValidDate(endedAt))) return null;
    const applications = (s.applications ?? [])
      .map((a) => ({ ...a, appliedAt: new Date(a.appliedAt) }))
      .filter((a) => isValidDate(a.appliedAt));
    return {
      id: s.id,
      startedAt,
      endedAt,
      setup: s.setup,
      applications,
      note: s.note ?? "",
      priorDose: s.priorDose,
      location: s.location,
    };
  } catch {
    return null;
  }
}

export function loadInProgressSession(): InProgressSession | null {
  if (typeof window === "undefined") return null;
  try {
    return deserializeSession(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Saves the session, or clears storage when passed null. */
export function saveInProgressSession(session: InProgressSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, serializeSession(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, quota). The session still
    // works in memory; it just won't survive a reload.
  }
}
