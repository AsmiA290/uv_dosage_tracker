import type { DoseEstimate } from "@/lib/dose/types";
import { formatMinutes } from "@/lib/risk";

interface BurnTimeHeadlineProps {
  estimate: DoseEstimate;
  /** Lead-in line, e.g. "If you go outside now, you could burn in as little as". */
  lead: string;
}

/**
 * The app's main answer, shared by Now and Session. Leads with the earliest
 * likely burn time (p10) so the warning comes early, then shows the likely
 * range underneath. Handles the "threshold already reached" and "not expected
 * before UV fades" cases in words instead of "N/A".
 */
export function BurnTimeHeadline({ estimate, lead }: BurnTimeHeadlineProps) {
  const { p10Minutes, p50Minutes, p90Minutes } = estimate.timeToThreshold;

  if (estimate.remainingBudgetSED.nominal <= 0 || p10Minutes === 0) {
    return (
      <div className="flex flex-col gap-1 text-center">
        <p className="text-2xl font-semibold text-[var(--risk-high)]">You may have reached your burn threshold</p>
        <p className="text-sm text-[var(--muted-foreground)]">Get into shade and cover up.</p>
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
