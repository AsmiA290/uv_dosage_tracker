import type { DoseEstimate } from "@/lib/dose/types";
import type { RiskLevel } from "@/components/ui/stat-tile";

/**
 * One risk rule for the whole app, so the badge, gauge color, and headline
 * can never disagree. It is driven by the EARLIEST LIKELY burn time (p10 of
 * the Monte Carlo run), not by remaining budget alone: a full budget can
 * still disappear in 20 minutes at midday UV.
 */
export type RiskKey = "thresholdReached" | "low" | "moderate" | "high";

export function riskFromEstimate(estimate: DoseEstimate): { level: RiskLevel; label: string; key: RiskKey } {
  if (estimate.remainingBudgetSED.nominal <= 0) return { level: "high", label: "Threshold reached", key: "thresholdReached" };
  const p10 = estimate.timeToThreshold.p10Minutes;
  if (!Number.isFinite(p10)) return { level: "low", label: "Low risk", key: "low" };
  if (p10 <= 30) return { level: "high", label: "High risk", key: "high" };
  if (p10 <= 90) return { level: "medium", label: "Moderate risk", key: "moderate" };
  return { level: "low", label: "Low risk", key: "low" };
}

/** "45 min" or "1 h 20 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** Fraction (0-1) of today's nominal burn-threshold budget still unused. */
export function budgetFractionLeft(estimate: DoseEstimate): number {
  const med = estimate.medThresholdSED.nominal;
  return med > 0 ? Math.max(0, estimate.remainingBudgetSED.nominal / med) : 0;
}

export type UvCategoryKey = "low" | "moderate" | "high" | "veryHigh" | "extreme";

/** EPA UV Index category, as a key into the translated category names. */
export function uvCategoryKey(uvIndex: number): UvCategoryKey {
  if (uvIndex < 3) return "low";
  if (uvIndex < 6) return "moderate";
  if (uvIndex < 8) return "high";
  if (uvIndex < 11) return "veryHigh";
  return "extreme";
}

/** EPA UV Index category word in English, for plain-language display next to the number. */
export function uvCategory(uvIndex: number): string {
  if (uvIndex < 3) return "Low";
  if (uvIndex < 6) return "Moderate";
  if (uvIndex < 8) return "High";
  if (uvIndex < 11) return "Very high";
  return "Extreme";
}

/**
 * Share of the daily work-exposure limit: "64%" below the limit, "2.3×"
 * at or above it. Outdoor workers often pass the limit several times over,
 * so multiples read better than "230%".
 */
export function formatLimitShare(fraction: number): string {
  const f = Math.max(0, fraction);
  if (f < 1) return `${Math.round(f * 100)}%`;
  return `${f.toFixed(1)}×`;
}

/** Below this UV Index the sun is down or too weak to matter right now. */
export const LOW_UV_NOW = 1;

/**
 * Clock time `minutes` after `from`, rounded to 5 minutes, e.g. "10:40 AM",
 * prefixed with "tomorrow" when it falls on the next calendar day.
 * Used instead of a long duration ("8 h 20 min") when UV is low right now,
 * because nobody stands outside from 2 AM until a burn at 10:40 AM.
 */
export function clockLabel(from: Date, minutes: number): string {
  const ms = Math.round((from.getTime() + minutes * 60_000) / 300_000) * 300_000;
  const at = new Date(ms);
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return at.toDateString() === from.toDateString() ? time : `tomorrow ${time}`;
}
