"use client";

import Link from "next/link";
import { ChevronDown, HardHat } from "lucide-react";
import type { Interval } from "@/lib/dose/types";
import { formatLimitShare } from "@/lib/risk";
import { useI18n } from "@/lib/i18n/provider";

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
export function WorkExposureCard({ share, title }: WorkExposureCardProps) {
  const { m, t } = useI18n();
  const heading = title ?? m.work.title;
  const hasData = share !== null && share.high > 0;
  const nominal = hasData ? share.nominal : 0;
  const over = nominal >= 1;
  const fillPct = Math.min(1, nominal) * 100;
  const color = over ? "var(--risk-medium)" : "var(--accent)";

  return (
    <section className="glass-panel flex flex-col gap-3 rounded-[calc(var(--radius)+4px)] p-5" aria-label={heading}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          <HardHat className="size-3.5" aria-hidden="true" />
          {heading}
        </span>
        <span className="text-[11px] text-[var(--muted-foreground)]">{m.work.limitName}</span>
      </div>

      {hasData ? (
        <>
          <p className="flex items-baseline gap-2">
            <span dir="ltr" className="hero-number text-3xl font-semibold" style={{ color: over ? color : "var(--foreground)" }}>
              {formatLimitShare(nominal)}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">{over ? m.work.timesLimit : m.work.ofLimit}</span>
          </p>
          <div
            className="relative h-2.5 overflow-hidden rounded-full bg-[var(--border)]"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(1, nominal) * 100)}
            aria-valuetext={`${formatLimitShare(nominal)} ${over ? m.work.timesLimit : m.work.ofLimit}`}
          >
            <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: color }} />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t(m.work.likelyRange, { low: formatLimitShare(share.low), high: formatLimitShare(share.high) })}
          </p>
        </>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">{m.work.nothingYet}</p>
      )}

      <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
        {m.work.limitDef}
      </p>

      <details className="group text-xs leading-relaxed text-[var(--muted-foreground)]">
        <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-[var(--foreground)]">
          {m.work.about}
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 ps-4">
          {m.work.aboutPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <Link href="/why#policy" className="mt-2 inline-block font-medium text-[var(--accent)] underline-offset-2 hover:underline">
          {m.work.policyLink}
        </Link>
      </details>
    </section>
  );
}
