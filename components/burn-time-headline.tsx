"use client";

import type { DoseEstimate } from "@/lib/dose/types";
import { LOW_UV_NOW } from "@/lib/risk";
import { useI18n } from "@/lib/i18n/provider";

interface BurnTimeHeadlineProps {
  estimate: DoseEstimate;
  /** Lead-in line, e.g. "If you go outside now, you could burn in as little as". */
  lead: string;
  /** Current time and UV Index; when UV is low right now the headline switches to a clock time. */
  now?: Date;
  uvNow?: number;
}

/**
 * The app's main answer, shared by Now and Session. Leads with the earliest
 * likely burn time (p10) so the warning comes early, then shows the likely
 * range underneath. Handles "threshold reached", "UV is low right now"
 * (night, early morning, evening), and "not expected for the rest of the
 * forecast" in words instead of misleading durations or "N/A".
 */
export function BurnTimeHeadline({ estimate, lead, now, uvNow }: BurnTimeHeadlineProps) {
  const { m, t, duration, clockAfter } = useI18n();
  const { p10Minutes, p50Minutes, p90Minutes } = estimate.timeToThreshold;

  if (estimate.remainingBudgetSED.nominal <= 0 || p10Minutes === 0) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--risk-high)]">{m.burn.reachedTitle}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{m.burn.reachedBody}</p>
      </div>
    );
  }

  if (now && uvNow !== undefined && uvNow < LOW_UV_NOW) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--foreground)]">{m.burn.lowNowTitle}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          {Number.isFinite(p10Minutes) ? t(m.burn.lowNowBody, { time: clockAfter(now, p10Minutes) }) : m.burn.lowNowNever}
        </p>
      </div>
    );
  }

  if (!Number.isFinite(p10Minutes)) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--foreground)]">{m.burn.notExpectedTitle}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{m.burn.notExpectedBody}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-center">
      <p className="text-sm text-[var(--muted-foreground)]">{lead}</p>
      <p className="hero-number text-6xl font-semibold tracking-tight text-[var(--foreground)]">{duration(p10Minutes)}</p>
      <p className="text-sm text-[var(--muted-foreground)]">
        {Number.isFinite(p90Minutes)
          ? t(m.burn.mostLikelyRange, { p50: duration(p50Minutes), p90: duration(p90Minutes) })
          : t(m.burn.mostLikely, { p50: duration(p50Minutes) })}
      </p>
    </div>
  );
}
