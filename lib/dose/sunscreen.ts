import {
  REAPPLY_THRESHOLD_FRACTION,
  SPF_REFERENCE_THICKNESS_MG_CM2,
  SUNSCREEN_WEAR_HALF_LIFE_MINUTES,
} from "./constants";
import type { SunscreenApplication } from "./types";

/**
 * Effective SPF at a given applied thickness. Labeled SPF assumes
 * SPF_REFERENCE_THICKNESS_MG_CM2 (2.0 mg/cm²); real-world application is
 * usually much thinner, and protection does not fall off proportionally —
 * it falls off exponentially in thickness. See citations.sunscreenApplicationThickness.
 */
export function effectiveSPF(labeledSPF: number, appliedThicknessMgCm2: number): number {
  if (appliedThicknessMgCm2 <= 0) return 1;
  if (labeledSPF <= 1) return 1;
  const ratio = appliedThicknessMgCm2 / SPF_REFERENCE_THICKNESS_MG_CM2;
  return Math.pow(labeledSPF, ratio);
}

/**
 * How much of the originally applied thickness remains at `minutesElapsed`,
 * modeled as exponential wear-off with a condition-dependent half-life
 * (sweating and swimming remove product much faster than dry wear).
 */
export function remainingAppliedThicknessMgCm2(
  initialThicknessMgCm2: number,
  minutesElapsed: number,
  wearCondition: "dry" | "sweating" | "swimming"
): number {
  const halfLife = SUNSCREEN_WEAR_HALF_LIFE_MINUTES[wearCondition];
  return initialThicknessMgCm2 * Math.pow(0.5, Math.max(0, minutesElapsed) / halfLife);
}

/** Effective SPF for one application, evaluated at a later point in time. */
export function effectiveSPFAtTime(application: SunscreenApplication, atTime: Date): number {
  const minutesElapsed = (atTime.getTime() - application.appliedAt.getTime()) / 60_000;
  if (minutesElapsed < 0) return 1;
  const remainingThickness = remainingAppliedThicknessMgCm2(
    application.appliedThicknessMgCm2,
    minutesElapsed,
    application.wearCondition
  );
  return effectiveSPF(application.labeledSPF, remainingThickness);
}

/**
 * Given a chronological list of applications during a session, the SPF
 * actually in effect at `atTime` is the highest-remaining-protection
 * application applied at or before that time (reapplying resets the clock).
 */
export function activeSPFAtTime(applications: SunscreenApplication[], atTime: Date): number {
  const applicable = applications.filter((a) => a.appliedAt.getTime() <= atTime.getTime());
  if (applicable.length === 0) return 1;
  return Math.max(...applicable.map((a) => effectiveSPFAtTime(a, atTime)));
}

/** Dose-reduction multiplier to apply to incoming erythemal irradiance (1 = no protection). */
export function protectionMultiplier(spf: number): number {
  return spf > 0 ? 1 / spf : 1;
}

/** True when effective SPF has decayed below the reapply threshold fraction of its labeled value. */
export function shouldReapply(application: SunscreenApplication, atTime: Date): boolean {
  const current = effectiveSPFAtTime(application, atTime);
  return current < application.labeledSPF * REAPPLY_THRESHOLD_FRACTION;
}
