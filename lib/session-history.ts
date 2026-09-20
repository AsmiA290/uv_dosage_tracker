import type { FitzpatrickType, Interval } from "@/lib/dose/types";

/**
 * Shape of one completed, saved session as shown on the History screen.
 * Persisted via lib/supabase/sessions.ts (`sessions` + `dose_records` tables).
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
