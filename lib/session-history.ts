import type { FitzpatrickType, Interval } from "@/lib/dose/types";

/**
 * Shape of one completed, saved session as shown on the History screen.
 * Persisted locally via lib/local/sessions.ts (localStorage).
 *
 * Fields marked optional were added in the October 2026 revision; sessions
 * saved before then do not have them, and every reader must cope with that.
 */
export interface HistoricalSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  fitzpatrickType: FitzpatrickType;
  /** This session's own dose on the most exposed skin, after sunscreen, SED. */
  cumulativeDoseSED: Interval;
  medThresholdSED: Interval;
  surface: string;
  note?: string;
  /** This session's dose before sunscreen, SED. Used for the work-exposure (ICNIRP) comparison. */
  incidentDoseSED?: Interval;
  /** Where the session took place. */
  location?: { label: string; latitude: number; longitude: number };
  posture?: string;
  /** Labeled SPF of each sunscreen application logged during the session. */
  sunscreenSPFs?: number[];
}
