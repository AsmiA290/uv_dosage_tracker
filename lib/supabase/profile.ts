import { createClient } from "@/lib/supabase/client";
import type { FitzpatrickType, PostureType, SurfaceType } from "@/lib/dose/types";

/**
 * The user's saved personal defaults, backed by `public.profiles` (one row
 * per account, RLS-scoped to `auth.uid() = user_id`). Collected once during
 * onboarding and editable afterward from /profile.
 */
export interface UserProfile {
  userId: string;
  displayName: string | null;
  fitzpatrickType: FitzpatrickType | null;
  homeLat: number | null;
  homeLon: number | null;
  homeLabel: string | null;
  defaultSurface: SurfaceType | null;
  defaultPosture: PostureType | null;
  onboardedAt: string | null;
}

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  fitzpatrick_type: FitzpatrickType | null;
  home_lat: number | null;
  home_lon: number | null;
  home_label: string | null;
  default_surface: SurfaceType | null;
  default_posture: PostureType | null;
  onboarded_at: string | null;
};

function fromRow(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    fitzpatrickType: row.fitzpatrick_type,
    homeLat: row.home_lat,
    homeLon: row.home_lon,
    homeLabel: row.home_label,
    defaultSurface: row.default_surface,
    defaultPosture: row.default_posture,
    onboardedAt: row.onboarded_at,
  };
}

const PROFILE_COLUMNS =
  "user_id, display_name, fitzpatrick_type, home_lat, home_lon, home_label, default_surface, default_posture, onboarded_at";

/** Fetches the signed-in user's profile. Returns null if signed out. */
export async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle()
    .returns<ProfileRow>();
  if (error) throw error;
  // The signup trigger creates this row, but fall back gracefully if it
  // hasn't landed yet (e.g. a race right after email confirmation).
  if (!data) return { userId: user.id, displayName: null, fitzpatrickType: null, homeLat: null, homeLon: null, homeLabel: null, defaultSurface: null, defaultPosture: null, onboardedAt: null };
  return fromRow(data);
}

export interface ProfileUpdate {
  displayName?: string | null;
  fitzpatrickType?: FitzpatrickType;
  homeLat?: number;
  homeLon?: number;
  homeLabel?: string;
  defaultSurface?: SurfaceType;
  defaultPosture?: PostureType;
  /** Set true to stamp onboarded_at with the current time. */
  markOnboarded?: boolean;
}

/** Upserts the signed-in user's profile row with the given fields. */
export async function saveProfile(update: ProfileUpdate): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  if (update.displayName !== undefined) patch.display_name = update.displayName;
  if (update.fitzpatrickType !== undefined) patch.fitzpatrick_type = update.fitzpatrickType;
  if (update.homeLat !== undefined) patch.home_lat = update.homeLat;
  if (update.homeLon !== undefined) patch.home_lon = update.homeLon;
  if (update.homeLabel !== undefined) patch.home_label = update.homeLabel;
  if (update.defaultSurface !== undefined) patch.default_surface = update.defaultSurface;
  if (update.defaultPosture !== undefined) patch.default_posture = update.defaultPosture;
  if (update.markOnboarded) patch.onboarded_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").upsert(patch, { onConflict: "user_id" });
  if (error) throw error;
}
