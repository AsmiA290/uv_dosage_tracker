import type { FitzpatrickType, PostureType, SurfaceType } from "@/lib/dose/types";

/**
 * The user's saved personal defaults, persisted in this browser's
 * localStorage — there's no account or server, so nothing syncs across
 * devices. Collected once during onboarding and editable afterward from
 * /profile.
 */
export interface UserProfile {
  displayName: string | null;
  fitzpatrickType: FitzpatrickType | null;
  homeLat: number | null;
  homeLon: number | null;
  homeLabel: string | null;
  defaultSurface: SurfaceType | null;
  defaultPosture: PostureType | null;
  onboardedAt: string | null;
}

const STORAGE_KEY = "uv-tracker:profile";

const EMPTY_PROFILE: UserProfile = {
  displayName: null,
  fitzpatrickType: null,
  homeLat: null,
  homeLon: null,
  homeLabel: null,
  defaultSurface: null,
  defaultPosture: null,
  onboardedAt: null,
};

function readProfile(): UserProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_PROFILE;
  }
}

/** Fetches the locally saved profile. Resolves to null only before onboarding has run. */
export async function fetchProfile(): Promise<UserProfile | null> {
  const profile = readProfile();
  return profile.onboardedAt === null && profile.fitzpatrickType === null ? null : profile;
}

export interface ProfileUpdate {
  displayName?: string | null;
  fitzpatrickType?: FitzpatrickType;
  homeLat?: number;
  homeLon?: number;
  homeLabel?: string;
  defaultSurface?: SurfaceType;
  defaultPosture?: PostureType;
  /** Set true to stamp onboardedAt with the current time. */
  markOnboarded?: boolean;
}

/** Merges the given fields into the locally saved profile. */
export async function saveProfile(update: ProfileUpdate): Promise<void> {
  if (typeof window === "undefined") return;
  const current = readProfile();
  const next: UserProfile = { ...current };
  if (update.displayName !== undefined) next.displayName = update.displayName;
  if (update.fitzpatrickType !== undefined) next.fitzpatrickType = update.fitzpatrickType;
  if (update.homeLat !== undefined) next.homeLat = update.homeLat;
  if (update.homeLon !== undefined) next.homeLon = update.homeLon;
  if (update.homeLabel !== undefined) next.homeLabel = update.homeLabel;
  if (update.defaultSurface !== undefined) next.defaultSurface = update.defaultSurface;
  if (update.defaultPosture !== undefined) next.defaultPosture = update.defaultPosture;
  if (update.markOnboarded) next.onboardedAt = new Date().toISOString();

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
