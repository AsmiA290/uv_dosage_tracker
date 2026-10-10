import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type RiskLevel = "low" | "medium" | "high"

const RISK_BORDER: Record<RiskLevel, string> = {
  low: "border-l-[var(--risk-low)]",
  medium: "border-l-[var(--risk-medium)]",
  high: "border-l-[var(--risk-high)]",
}

interface StatTileProps {
  /** Keep short (one or two words) so it never wraps and misaligns a row of tiles. */
  label: string
  value: ReactNode
  unit?: string
  /** Plain-language line under the value, e.g. "Very high" or "at 1 PM". */
  caption?: string
  /** Smaller type for three-across rows. */
  compact?: boolean
  /**
   * Colors only a small accent (the left stripe), never the whole tile —
   * risk state must always be legible from the numeral + label alone.
   */
  riskLevel?: RiskLevel
  className?: string
}

/** A small labeled numeral block: label above, big tabular-nums value below. */
export function StatTile({ label, value, unit, caption, compact, riskLevel, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "glass-panel flex flex-col gap-1 rounded-[calc(var(--radius)+4px)]",
        compact ? "p-3.5" : "p-5",
        riskLevel && `border-l-4 ${RISK_BORDER[riskLevel]}`,
        className
      )}
    >
      <span className="truncate text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className={cn("hero-number font-semibold text-[var(--foreground)]", compact ? "text-2xl" : "text-3xl")}>
        {value}
        {unit && <span className="ml-1 text-base font-normal text-[var(--muted-foreground)]">{unit}</span>}
      </span>
      {caption && <span className="text-xs leading-snug text-[var(--muted-foreground)]">{caption}</span>}
    </div>
  )
}
