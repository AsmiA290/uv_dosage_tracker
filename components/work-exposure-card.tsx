import Link from "next/link";
import { ChevronDown, HardHat } from "lucide-react";
import type { Interval } from "@/lib/dose/types";
import { formatLimitShare } from "@/lib/risk";

interface WorkExposureCardProps {
  /** Share of the daily limit as a fraction (1 = 100%), or null when nothing is logged today. */
  share: Interval | null;
  /** Heading, e.g. "Work exposure today". */
  title?: string;
}

/**
 * Daily work-exposure meter: how much of the ICNIRP/ACGIH occupational UV
 * limit (30 J/m² effective per 8-hour day) today's logged sessions used.
 *
 * Deliberately not styled as an alarm. ICNIRP itself notes outdoor workers
 * rarely stay under this limit, so passing it is common and the wording
 * points at shade, scheduling and clothing rather than blaming the worker.
 * Past the limit the bar stays full and turns amber, and the value switches
 * to multiples ("2.3×") so it stays readable.
 */
export function WorkExposureCard({ share, title = "Work exposure today" }: WorkExposureCardProps) {
  const hasData = share !== null && share.high > 0;
  const nominal = hasData ? share.nominal : 0;
  const over = nominal >= 1;
  const fillPct = Math.min(1, nominal) * 100;
  const color = over ? "var(--risk-medium)" : "var(--accent)";

  return (
    <section className="glass-panel flex flex-col gap-3 rounded-[calc(var(--radius)+4px)] p-5" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          <HardHat className="size-3.5" aria-hidden="true" />
          {title}
        </span>
        <span className="text-[11px] text-[var(--muted-foreground)]">ICNIRP / ACGIH limit</span>
      </div>

      {hasData ? (
        <>
          <p className="flex items-baseline gap-2">
            <span className="hero-number text-3xl font-semibold" style={{ color: over ? color : "var(--foreground)" }}>
              {formatLimitShare(nominal)}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">{over ? "the daily limit" : "of the daily limit"}</span>
          </p>
          <div
            className="relative h-2.5 overflow-hidden rounded-full bg-[var(--border)]"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(1, nominal) * 100)}
            aria-valuetext={`${formatLimitShare(nominal)} ${over ? "the" : "of the"} daily work-exposure limit`}
          >
            <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: color }} />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Likely range {formatLimitShare(share.low)} to {formatLimitShare(share.high)}
          </p>
        </>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">Nothing logged yet today.</p>
      )}

      <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
        Limit: 30 J/m² of UV on skin per 8-hour workday. It is the same for every skin type.
      </p>

      <details className="group text-xs leading-relaxed text-[var(--muted-foreground)]">
        <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-[var(--foreground)]">
          About this limit
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4">
          <li>The United States has no legal limit for sun exposure at work. This is the closest international standard.</li>
          <li>
            It counts UV reaching your skin before sunscreen, because that is how the limit is defined. Sunscreen still
            lowers what your skin absorbs.
          </li>
          <li>
            Passing it is common in outdoor work. It shows how much shade, scheduling, and protective clothing matter; it is
            not a sign you did something wrong.
          </li>
          <li>This is an estimate from the forecast, not a measurement, and it is not for legal compliance.</li>
        </ul>
        <Link href="/why#policy" className="mt-2 inline-block font-medium text-[var(--accent)] underline-offset-2 hover:underline">
          Why this matters for policy
        </Link>
      </details>
    </section>
  );
}
