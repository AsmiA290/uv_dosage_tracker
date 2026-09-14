import { JOULES_PER_SED, UVI_TO_WM2 } from "./constants";
import { solarWeight } from "./solar";
import type { HourlyUVSample } from "./types";

/** UV Index -> erythemally weighted irradiance, W/m². See citations.uviDefinition. */
export function uviToErythemalIrradianceWm2(uvIndex: number): number {
  return Math.max(0, uvIndex) * UVI_TO_WM2;
}

/** Erythemal irradiance, W/m² -> UV Index (inverse of the above, for display/debugging). */
export function erythemalIrradianceWm2ToUvi(irradianceWm2: number): number {
  return Math.max(0, irradianceWm2) / UVI_TO_WM2;
}

/** Radiant exposure, J/m² -> Standard Erythema Dose. See citations.sedDefinition. */
export function joulesPerM2ToSED(joulesPerM2: number): number {
  return joulesPerM2 / JOULES_PER_SED;
}

export function sedToJoulesPerM2(sed: number): number {
  return sed * JOULES_PER_SED;
}

/**
 * Interpolates a sparse (typically hourly) UV Index series to 1-minute
 * resolution between `start` and `end`, shaping the interpolation by the
 * solar-elevation curve rather than a naive straight line.
 *
 * Rationale: UV Index does not move linearly between, say, 12:00 and 13:00 —
 * it tracks sin(solar altitude) under clear sky. Naive linear interpolation
 * systematically over- or under-estimates dose near sunrise/sunset and near
 * solar noon. We instead interpolate the "clearness ratio" k = uvi / solarWeight
 * between the two bracketing hourly points and reconstruct
 * uvi(t) = k(t) * solarWeight(t), falling back to linear interpolation
 * whenever the solar weight is too small to divide by safely (near the
 * terminator, where the ratio is numerically unstable but the UV values
 * are already close to zero and the difference is immaterial to the dose
 * integral).
 */
export function interpolateHourlyToMinutes(
  samples: HourlyUVSample[],
  latitude: number,
  longitude: number,
  start: Date,
  end: Date
): Array<{ time: Date; uvIndex: number }> {
  if (samples.length === 0) return [];

  const sorted = [...samples].sort((a, b) => a.time.getTime() - b.time.getTime());
  const clamped = sorted.filter((s) => s.time.getTime() >= start.getTime() - 3600_000 && s.time.getTime() <= end.getTime() + 3600_000);
  const points = clamped.length >= 2 ? clamped : sorted;

  const MINUTE_MS = 60_000;
  const WEIGHT_EPSILON = 1e-6;
  const out: Array<{ time: Date; uvIndex: number }> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const spanMs = b.time.getTime() - a.time.getTime();
    if (spanMs <= 0) continue;
    const spanMinutes = Math.round(spanMs / MINUTE_MS);

    const wa = solarWeight(a.time, latitude, longitude);
    const wb = solarWeight(b.time, latitude, longitude);
    const ka = wa > WEIGHT_EPSILON ? a.uvIndex / wa : null;
    const kb = wb > WEIGHT_EPSILON ? b.uvIndex / wb : null;

    for (let m = 0; m < spanMinutes; m++) {
      const t = new Date(a.time.getTime() + m * MINUTE_MS);
      if (t.getTime() < start.getTime() || t.getTime() > end.getTime()) continue;
      const frac = m / spanMinutes;
      const wt = solarWeight(t, latitude, longitude);

      let uvi: number;
      if (ka !== null && kb !== null && wt > WEIGHT_EPSILON) {
        const k = ka * (1 - frac) + kb * frac;
        uvi = Math.max(0, k * wt);
      } else {
        uvi = Math.max(0, a.uvIndex * (1 - frac) + b.uvIndex * frac);
      }
      out.push({ time: t, uvIndex: uvi });
    }
  }

  // Ensure the final anchor point itself is included if it falls in range.
  const last = points[points.length - 1]!;
  if (last.time.getTime() >= start.getTime() && last.time.getTime() <= end.getTime()) {
    out.push({ time: last.time, uvIndex: Math.max(0, last.uvIndex) });
  }

  return out;
}

/**
 * Trapezoidal integration of a minute-resolution personal-UV series into
 * cumulative Standard Erythema Dose.
 */
export function integrateErythemalDoseSED(series: Array<{ time: Date; uvIndex: number }>): number {
  if (series.length < 2) return 0;
  let totalJoulesPerM2 = 0;
  for (let i = 0; i < series.length - 1; i++) {
    const p1 = series[i]!;
    const p2 = series[i + 1]!;
    const dtSeconds = (p2.time.getTime() - p1.time.getTime()) / 1000;
    if (dtSeconds <= 0) continue;
    const e1 = uviToErythemalIrradianceWm2(p1.uvIndex);
    const e2 = uviToErythemalIrradianceWm2(p2.uvIndex);
    const avgIrradiance = (e1 + e2) / 2;
    totalJoulesPerM2 += avgIrradiance * dtSeconds;
  }
  return joulesPerM2ToSED(totalJoulesPerM2);
}
