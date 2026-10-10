import type { DoseEstimate } from "@/lib/dose/types";
import { clockLabel, formatMinutes, LOW_UV_NOW } from "@/lib/risk";

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
  const { p10Minutes, p50Minutes, p90Minutes } = estimate.timeToThreshold;

  if (estimate.remainingBudgetSED.nominal <= 0 || p10Minutes === 0) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--risk-high)]">You may have reached your burn threshold</p>
        <p className="text-sm text-[var(--muted-foreground)]">Get into shade and cover up.</p>
      </div>
    );
  }

  if (now && uvNow !== undefined && uvNow < LOW_UV_NOW) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--foreground)]">UV is low right now</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          {Number.isFinite(p10Minutes)
            ? `If you stayed outside from now on, the earliest you could burn is around ${clockLabel(now, p10Minutes)}, once the sun gets stronger.`
            : "Sunburn isn't expected for the rest of the forecast."}
        </p>
      </div>
    );
  }

  if (!Number.isFinite(p10Minutes)) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--foreground)]">Sunburn not expected today</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          UV stays too low for the rest of the forecast to reach your burn threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-center">
      <p className="text-sm text-[var(--muted-foreground)]">{lead}</p>
      <p className="hero-number text-6xl font-semibold tracking-tight text-[var(--foreground)]">
        {formatMinutes(p10Minutes)}
      </p>
      <p className="text-sm text-[var(--muted-foreground)]">
        Most likely around {formatMinutes(p50Minutes)}
        {Number.isFinite(p90Minutes) ? `, up to ${formatMinutes(p90Minutes)}` : ""}
      </p>
    </div>
  );
}
