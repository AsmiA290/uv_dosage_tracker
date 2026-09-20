import { createClient } from "@/lib/supabase/client";
import type {
  DoseEstimate,
  FitzpatrickType,
  PostureType,
  SunscreenApplication,
  SurfaceType,
} from "@/lib/dose/types";
import type { HistoricalSession } from "@/lib/session-history";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return user.id;
}

export async function createDbSession(params: {
  startedAt: Date;
  latitude: number;
  longitude: number;
  surface: SurfaceType;
  posture: PostureType;
  fitzpatrickType: FitzpatrickType;
}): Promise<string> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      started_at: params.startedAt.toISOString(),
      latitude: params.latitude,
      longitude: params.longitude,
      surface: params.surface,
      posture: params.posture,
      fitzpatrick_type: params.fitzpatrickType,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function insertSunscreenApplicationRow(
  sessionId: string,
  application: SunscreenApplication,
): Promise<void> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { error } = await supabase.from("sunscreen_applications").insert({
    session_id: sessionId,
    user_id: userId,
    applied_at: application.appliedAt.toISOString(),
    labeled_spf: application.labeledSPF,
    applied_thickness_mg_cm2: application.appliedThicknessMgCm2,
    wear_condition: application.wearCondition,
  });

  if (error) throw error;
}

export async function endDbSession(params: {
  sessionId: string;
  endedAt: Date;
  estimate: DoseEstimate;
  note?: string;
}): Promise<void> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { error: sessionError } = await supabase
    .from("sessions")
    .update({ ended_at: params.endedAt.toISOString() })
    .eq("id", params.sessionId);
  if (sessionError) throw sessionError;

  const finite = (n: number) => (Number.isFinite(n) ? n : null);

  const { error: doseError } = await supabase.from("dose_records").insert({
    session_id: params.sessionId,
    user_id: userId,
    recorded_at: params.endedAt.toISOString(),
    cumulative_dose_sed_nominal: params.estimate.cumulativeDoseSED.nominal,
    cumulative_dose_sed_low: params.estimate.cumulativeDoseSED.low,
    cumulative_dose_sed_high: params.estimate.cumulativeDoseSED.high,
    med_threshold_sed_nominal: params.estimate.medThresholdSED.nominal,
    med_threshold_sed_low: params.estimate.medThresholdSED.low,
    med_threshold_sed_high: params.estimate.medThresholdSED.high,
    time_to_threshold_p10_minutes: finite(params.estimate.timeToThreshold.p10Minutes),
    time_to_threshold_p50_minutes: finite(params.estimate.timeToThreshold.p50Minutes),
    time_to_threshold_p90_minutes: finite(params.estimate.timeToThreshold.p90Minutes),
    note: params.note || null,
  });
  if (doseError) throw doseError;
}

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  surface: SurfaceType;
  fitzpatrick_type: FitzpatrickType;
};

type DoseRecordRow = {
  session_id: string;
  recorded_at: string;
  cumulative_dose_sed_nominal: number;
  cumulative_dose_sed_low: number;
  cumulative_dose_sed_high: number;
  med_threshold_sed_nominal: number | null;
  med_threshold_sed_low: number | null;
  med_threshold_sed_high: number | null;
  note: string | null;
};

/** Fetches ended sessions, newest first, joined with each session's final dose record. */
export async function fetchDbSessionHistory(): Promise<HistoricalSession[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, started_at, ended_at, surface, fitzpatrick_type")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .returns<SessionRow[]>();
  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  const { data: doseRecords, error: doseError } = await supabase
    .from("dose_records")
    .select(
      "session_id, recorded_at, cumulative_dose_sed_nominal, cumulative_dose_sed_low, cumulative_dose_sed_high, med_threshold_sed_nominal, med_threshold_sed_low, med_threshold_sed_high, note",
    )
    .in(
      "session_id",
      sessions.map((s) => s.id),
    )
    .order("recorded_at", { ascending: false })
    .returns<DoseRecordRow[]>();
  if (doseError) throw doseError;

  const latestBySession = new Map<string, DoseRecordRow>();
  for (const record of doseRecords ?? []) {
    if (!latestBySession.has(record.session_id)) {
      latestBySession.set(record.session_id, record);
    }
  }

  const history: HistoricalSession[] = [];
  for (const session of sessions) {
    const record = latestBySession.get(session.id);
    if (!session.ended_at || !record) continue;
    history.push({
      id: session.id,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      fitzpatrickType: session.fitzpatrick_type,
      cumulativeDoseSED: {
        low: record.cumulative_dose_sed_low,
        nominal: record.cumulative_dose_sed_nominal,
        high: record.cumulative_dose_sed_high,
      },
      medThresholdSED: {
        low: record.med_threshold_sed_low ?? 0,
        nominal: record.med_threshold_sed_nominal ?? 0,
        high: record.med_threshold_sed_high ?? 0,
      },
      surface: session.surface,
      note: record.note ?? undefined,
    });
  }
  return history;
}
