import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/supabase/profile";
import type { FitzpatrickType, PostureType, SurfaceType } from "@/lib/dose/types";

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

/** Server-component equivalent of lib/supabase/profile's fetchProfile. */
export async function fetchProfileServer(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, fitzpatrick_type, home_lat, home_lon, home_label, default_surface, default_posture, onboarded_at",
    )
    .eq("user_id", user.id)
    .maybeSingle()
    .returns<ProfileRow>();
  if (error) throw error;
  if (!data) {
    return {
      userId: user.id,
      displayName: null,
      fitzpatrickType: null,
      homeLat: null,
      homeLon: null,
      homeLabel: null,
      defaultSurface: null,
      defaultPosture: null,
      onboardedAt: null,
    };
  }

  return {
    userId: data.user_id,
    displayName: data.display_name,
    fitzpatrickType: data.fitzpatrick_type,
    homeLat: data.home_lat,
    homeLon: data.home_lon,
    homeLabel: data.home_label,
    defaultSurface: data.default_surface,
    defaultPosture: data.default_posture,
    onboardedAt: data.onboarded_at,
  };
}
