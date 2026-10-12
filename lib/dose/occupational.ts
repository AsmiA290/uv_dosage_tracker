import type { Interval } from "./types";

/**
 * Work-exposure comparison against the international occupational UV limit.
 *
 * The United States has no legal limit for workers' exposure to sunlight
 * (OSHA, 1998 interpretation letter). The closest standard is the
 * ICNIRP (2004) / ACGIH limit: 30 J/m² of ICNIRP-weighted ("effective") UV
 * on unprotected skin in an 8-hour day. NIOSH's 1972 recommended standard
 * uses the same 30 J/m² (3 mJ/cm² at 270 nm) for artificial UV.
 *
 * The limit uses its own spectral weighting, not the erythema weighting
 * behind the UV Index and SED. For sunlight, ICNIRP's 2010 statement on
 * protecting workers gives the conversion: 30 J/m² effective is about
 * 1.0-1.3 SED. The app samples that whole range, so the share of the limit
 * is reported as an interval like every other estimate.
 *
 * Two deliberate choices:
 *  - The limit applies to UV reaching unprotected skin, so callers pass the
 *    dose BEFORE sunscreen (DoseEstimate.sessionIncidentDoseSED). Sunscreen
 *    is protective equipment; it lowers what the skin absorbs but does not
 *    change the exposure the limit is written for.
 *  - Totals reset per local calendar day. A whole day's total is always at
 *    least as large as any 8-hour window inside it, so this is the cautious
 *    reading of an 8-hour limit.
 *
 * It does not depend on skin type: the limit is the same for everyone.
 */

/** ICNIRP / ACGIH daily limit for UV on unprotected skin, J/m² effective (8-hour day). */
export const ICNIRP_DAILY_LIMIT_J_PER_M2 = 30;

/**
 * The daily limit expressed in SED for sunlight (ICNIRP 2010: "about 1.0-1.3 SED").
 * Nominal is the midpoint of that range.
 */
export const ICNIRP_LIMIT_IN_SED: Interval = { low: 1.0, nominal: 1.15, high: 1.3 };

const ZERO: Interval = { low: 0, nominal: 0, high: 0 };

/** Adds intervals bound by bound. */
export function sumIntervals(...intervals: Interval[]): Interval {
  return intervals.reduce(
    (acc, x) => ({ low: acc.low + x.low, nominal: acc.nominal + x.nominal, high: acc.high + x.high }),
    { ...ZERO },
  );
}

/**
 * Converts a sunlight dose on unprotected skin (SED) into ICNIRP-weighted
 * J/m² effective. The low bound pairs the low dose with the largest SED
 * equivalent (1.3), the high bound pairs the high dose with the smallest
 * (1.0), so the interval covers both sources of uncertainty.
 */
export function sedToIcnirpEffectiveJPerM2(incidentDoseSED: Interval): Interval {
  const k = ICNIRP_DAILY_LIMIT_J_PER_M2;
  return {
    low: (Math.max(0, incidentDoseSED.low) / ICNIRP_LIMIT_IN_SED.high) * k,
    nominal: (Math.max(0, incidentDoseSED.nominal) / ICNIRP_LIMIT_IN_SED.nominal) * k,
    high: (Math.max(0, incidentDoseSED.high) / ICNIRP_LIMIT_IN_SED.low) * k,
  };
}

/** Share of the daily limit used, as a fraction (1 = 100%, 2.5 = 2.5 times the limit). */
export function fractionOfDailyLimit(incidentDoseSED: Interval): Interval {
  const effective = sedToIcnirpEffectiveJPerM2(incidentDoseSED);
  const k = ICNIRP_DAILY_LIMIT_J_PER_M2;
  return { low: effective.low / k, nominal: effective.nominal / k, high: effective.high / k };
}
