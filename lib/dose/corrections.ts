import {
  ALBEDO_REFERENCE_SURFACE,
  ALBEDO_SENSITIVITY,
  PERSONAL_EXPOSURE_RATIO,
  SURFACE_ALBEDO,
} from "./constants";
import type { Interval, PostureType, SurfaceType } from "./types";

/**
 * Empirical cloud modification factor: ratio of all-sky to clear-sky UV
 * index for the same instant. This is the preferred CMF whenever Open-Meteo
 * (or any source) supplies both `uv_index` and `uv_index_clear_sky` — it is
 * measured, not modeled. See citations.cloudModificationFactor.
 */
export function empiricalCloudModificationFactor(uvIndexAllSky: number, uvIndexClearSky: number): number {
  if (uvIndexClearSky <= 0) return 1;
  const cmf = uvIndexAllSky / uvIndexClearSky;
  return clamp(cmf, 0, 1.3);
}

/**
 * Fallback CMF curve as a function of cloud cover fraction (0-100%), for
 * situations where only cloud cover — not a clear-sky UV companion value —
 * is available (e.g. some historical reanalysis fields). Non-linear:
 * broken cloud (~10-40%) can transiently exceed clear-sky UV via reflection
 * off cloud edges; heavier cover attenuates increasingly steeply.
 * See citations.cloudModificationFactor — illustrative fit, prefer the
 * empirical ratio above whenever it is available.
 */
export function cloudModificationFactorFromCoverPct(cloudCoverPct: number): number {
  const c = clamp(cloudCoverPct, 0, 100) / 100;
  if (c <= 0.1) return 1.0;
  if (c <= 0.4) {
    const bump = 0.05 * Math.sin(((c - 0.1) / 0.3) * Math.PI);
    return 1.0 + bump;
  }
  const t = (c - 0.4) / 0.6;
  return clamp(1.0 - 0.7 * Math.pow(t, 1.2), 0.25, 1.05);
}

/**
 * Albedo adjustment relative to the reference surface (grass), applied as a
 * multiplier on personal exposure ratio to account for extra reflected UV
 * reaching upward/forward-facing skin on brighter surfaces (sand, concrete,
 * snow). First-order and illustrative — see citations.surfaceAlbedo note.
 */
export function albedoAdjustmentMultiplier(surface: SurfaceType): number {
  const a = SURFACE_ALBEDO[surface].albedo;
  const aRef = SURFACE_ALBEDO[ALBEDO_REFERENCE_SURFACE].albedo;
  const delta = a - aRef;
  return 1 + ALBEDO_SENSITIVITY * delta;
}

/**
 * Personal exposure ratio (ambient horizontal UV -> UV actually received by
 * face/neck/shoulders), as a low/nominal/high interval for the given
 * posture, adjusted for the chosen ground surface's albedo.
 * See citations.personalExposureRatio.
 */
export function personalExposureRatio(posture: PostureType, surface: SurfaceType): Interval {
  const base = PERSONAL_EXPOSURE_RATIO[posture];
  const albedoMultiplier = albedoAdjustmentMultiplier(surface);
  return {
    low: base.low * albedoMultiplier,
    nominal: base.nominal * albedoMultiplier,
    high: base.high * albedoMultiplier,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
