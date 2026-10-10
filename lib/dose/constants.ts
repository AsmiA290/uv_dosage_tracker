import type { FitzpatrickType, MedRangeSED, PostureType, SurfaceType } from "./types";

/** 1 UV Index unit = 25 mW/m² of erythemally weighted irradiance. See citations.uviDefinition. */
export const UVI_TO_WM2 = 0.025;

/** 1 Standard Erythema Dose = 100 J/m². See citations.sedDefinition. */
export const JOULES_PER_SED = 100;

/**
 * MED ranges by Fitzpatrick type, in SED. Values follow the widely reproduced
 * ICNIRP-style skin-type table (Type I 2-3 SED ... Type VI 10-20 SED).
 * See citations.medRangesByType — still marked NOT YET VERIFIED until a
 * primary table is checked page-by-page.
 */
export const MED_RANGES_SED: Record<FitzpatrickType, MedRangeSED> = {
  I: { fitzpatrickType: "I", lowSED: 2.0, highSED: 3.0, verified: false, citationKey: "medRangesByType" },
  II: { fitzpatrickType: "II", lowSED: 2.5, highSED: 3.5, verified: false, citationKey: "medRangesByType" },
  III: { fitzpatrickType: "III", lowSED: 3.0, highSED: 5.0, verified: false, citationKey: "medRangesByType" },
  IV: { fitzpatrickType: "IV", lowSED: 4.5, highSED: 6.0, verified: false, citationKey: "medRangesByType" },
  V: { fitzpatrickType: "V", lowSED: 6.0, highSED: 10.0, verified: false, citationKey: "medRangesByType" },
  VI: { fitzpatrickType: "VI", lowSED: 10.0, highSED: 20.0, verified: false, citationKey: "medRangesByType" },
};

export const FITZPATRICK_LABELS: Record<FitzpatrickType, string> = {
  I: "Type I: very fair, always burns, never tans",
  II: "Type II: fair, burns easily, tans minimally",
  III: "Type III: medium, burns moderately, tans gradually",
  IV: "Type IV: olive, burns minimally, tans well",
  V: "Type V: brown, rarely burns, tans darkly",
  VI: "Type VI: deeply pigmented, never burns",
};

/** UV-relevant surface albedo (fraction of incident UV reflected). See citations.surfaceAlbedo. */
export const SURFACE_ALBEDO: Record<SurfaceType, { albedo: number; label: string }> = {
  grass: { albedo: 0.03, label: "Grass / turf" },
  soil: { albedo: 0.07, label: "Bare soil / dirt" },
  concrete: { albedo: 0.12, label: "Concrete / pavement" },
  sand: { albedo: 0.18, label: "Dry sand" },
  water: { albedo: 0.08, label: "Water (mid-day, calm)" },
  freshSnow: { albedo: 0.85, label: "Fresh snow" },
};

/** Reference surface the personal-exposure-ratio nominal values below were characterized against. */
export const ALBEDO_REFERENCE_SURFACE: SurfaceType = "grass";

/**
 * Fraction of an albedo difference (vs. the reference surface) that reaches
 * upward- and forward-facing skin as extra reflected UV. First-order,
 * illustrative sensitivity — see citations.surfaceAlbedo note.
 */
export const ALBEDO_SENSITIVITY = 0.5;

/**
 * Exposure ratio for the MOST EXPOSED body site (top of head, shoulders,
 * nose), relative to ambient horizontal-plane UV. Sunburn appears first on
 * these upward-facing sites, and an upward-facing horizontal patch of skin
 * receives close to the full ambient horizontal irradiance by definition
 * (ratio ~1, minus self-shading and tilt). Using a whole-body or vertical-
 * surface average (~0.5) would make burn-time estimates roughly twice as
 * long as they should be, which is the unsafe direction for this app.
 * Posture offsets are small app assumptions, not measured values.
 * See citations.personalExposureRatio.
 */
export const PERSONAL_EXPOSURE_RATIO: Record<PostureType, { low: number; nominal: number; high: number }> = {
  standing: { low: 0.6, nominal: 0.8, high: 1.0 },
  sitting: { low: 0.55, nominal: 0.75, high: 0.95 },
  activeSport: { low: 0.65, nominal: 0.85, high: 1.0 },
};

/** Label-testing reference application thickness for sunscreen SPF claims, mg/cm². See citations.sunscreenApplicationThickness. */
export const SPF_REFERENCE_THICKNESS_MG_CM2 = 2.0;

/**
 * APP ASSUMPTION, not a measured constant: wear-off half-lives (minutes) for
 * applied sunscreen thickness, by condition. Chosen so that half the layer is
 * gone at the 2-hour reapplication interval in sun-safety guidance (dry), and
 * much sooner with sweat or water (cf. the 40-minute water-resistance label).
 * See citations.sunscreenWearOff.
 */
export const SUNSCREEN_WEAR_HALF_LIFE_MINUTES: Record<"dry" | "sweating" | "swimming", number> = {
  dry: 120,
  sweating: 60,
  swimming: 40,
};

/** Fraction of the applied sunscreen layer remaining below which the app nudges the user to reapply. */
export const REAPPLY_THRESHOLD_FRACTION = 0.5;

/** Default 1-sigma relative forecast error assumed for the UV index, absent a measured value. See citations.forecastUncertainty. */
export const DEFAULT_FORECAST_RELATIVE_ERROR_SD = 0.15;

export const DEFAULT_MONTE_CARLO_SAMPLES = 2000;
export const DEFAULT_MONTE_CARLO_SEED = 42;
