/**
 * Shared types for the dose engine (/lib/dose).
 * This module has no dependency on Next.js, React, or the database —
 * it is pure domain logic and should stay that way so it can be unit
 * tested in isolation and reused by /analysis (via a ported Python model)
 * without dragging in framework code.
 */

/** Fitzpatrick sun-reactive skin type, I (always burns) through VI (never burns). */
export type FitzpatrickType = "I" | "II" | "III" | "IV" | "V" | "VI";

/** A closed interval with a nominal (best-estimate) value. */
export interface Interval {
  low: number;
  nominal: number;
  high: number;
}

/** Ground surface under the user, used for the albedo correction. */
export type SurfaceType =
  | "grass"
  | "soil"
  | "concrete"
  | "sand"
  | "water"
  | "freshSnow";

/** Body posture / activity, used for the personal exposure ratio (PER). */
export type PostureType = "standing" | "sitting" | "activeSport";

/** One hourly forecast/observation sample, as delivered by Open-Meteo. */
export interface HourlyUVSample {
  /** UTC timestamp of the sample. */
  time: Date;
  /** All-sky (actual, cloud-affected) UV Index. */
  uvIndex: number;
  /** Clear-sky UV Index for the same instant, when available. */
  uvIndexClearSky?: number;
  /** Total cloud cover, percent (0-100), when available. */
  cloudCoverPct?: number;
}

/** A single minute-resolution sample after interpolation + corrections. */
export interface MinuteSample {
  time: Date;
  /** Ambient (horizontal-plane) UV Index at this minute. */
  ambientUvIndex: number;
  /** Ambient UV Index after the personal exposure + albedo correction. */
  personalUvIndex: number;
  /** Erythemally-weighted irradiance reaching the person, W/m². */
  personalIrradianceWm2: number;
  /** Sunscreen dose-reduction multiplier applied at this minute (1 = none). */
  sunscreenAttenuation: number;
}

/** A sunscreen application event. */
export interface SunscreenApplication {
  appliedAt: Date;
  labeledSPF: number;
  /** Thickness actually applied, mg/cm². Label testing assumes 2.0 mg/cm². */
  appliedThicknessMgCm2: number;
  /** Conditions affecting wear-off rate. */
  wearCondition: "dry" | "sweating" | "swimming";
}

/** MED range for a Fitzpatrick type, in Standard Erythema Dose (SED) units. */
export interface MedRangeSED {
  fitzpatrickType: FitzpatrickType;
  lowSED: number;
  highSED: number;
  /** Whether the exact figures have been checked against the team's chosen
   *  primary source (brief requirement 3.3). Flip to true once verified and
   *  fill in `citationKey` in citations.ts with the confirmed reference. */
  verified: boolean;
  citationKey: string;
}

/** Inputs to the main dose-estimate orchestrator. */
export interface DoseEstimateInput {
  fitzpatrickType: FitzpatrickType;
  latitude: number;
  longitude: number;
  surface: SurfaceType;
  posture: PostureType;
  /** Hourly forecast/observation samples spanning the session, sorted ascending. */
  hourlySamples: HourlyUVSample[];
  /** When the exposure session started. */
  sessionStart: Date;
  /** "Now" — the point up to which dose has actually accumulated. */
  now: Date;
  /** Optional sunscreen application history during the session. */
  sunscreenApplications?: SunscreenApplication[];
  /** Relative (fractional) 1-sigma forecast error to assume for uncertainty
   *  propagation, e.g. 0.15 for +/-15%. Defaults applied in dose.ts if omitted. */
  forecastRelativeErrorSD?: number;
  /** Monte Carlo sample count. Defaults to 2000. */
  monteCarloSamples?: number;
  /** Seed for the Monte Carlo PRNG, for reproducible tests/demos. */
  monteCarloSeed?: number;
}

/** A time-to-threshold estimate expressed as a calibrated interval. */
export interface TimeToThresholdEstimate {
  p10Minutes: number;
  p50Minutes: number;
  p90Minutes: number;
}

/** Full output of the dose engine for one session at one point in time. */
export interface DoseEstimate {
  /** Cumulative personal dose from sessionStart to now, as an interval, SED. */
  cumulativeDoseSED: Interval;
  /** MED interval in effect for this user (from Fitzpatrick type). */
  medThresholdSED: Interval;
  /** Remaining budget before the low/nominal/high MED is reached, SED. */
  remainingBudgetSED: Interval;
  /** Instantaneous personal dose rate at `now`, SED per minute. */
  currentDoseRateSEDPerMinute: number;
  /** Calibrated forward-looking time-to-threshold interval. */
  timeToThreshold: TimeToThresholdEstimate;
  /** Minute-resolution series actually used for the integration (for charts). */
  minuteSeries: MinuteSample[];
  /** Empirical cloud modification factor per hourly sample, when derivable. */
  cloudModificationFactors: Array<{ time: Date; cmf: number }>;
}
