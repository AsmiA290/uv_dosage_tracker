import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type RiskLevel = "low" | "medium" | "high"

const RISK_BORDER: Record<RiskLevel, string> = {
  low: "border-l-[var(--risk-low)]",
  medium: "border-l-[var(--risk-medium)]",
  high: "border-l-[var(--risk-high)]",
}

interface StatTileProps {
  label: string
  value: ReactNode
  unit?: string
  /**
   * Colors only a small accent (the left stripe), never the whole tile —
   * risk state must always be legible from the numeral + label alone.
   */
  riskLevel?: RiskLevel
  className?: string
}

/** A small labeled numeral block: label above, big tabular-nums value below. */
export function StatTile({ label, value, unit, riskLevel, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5",
        riskLevel && `border-l-4 ${RISK_BORDER[riskLevel]}`,
        className
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="hero-number text-3xl font-semibold text-[var(--foreground)]">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-[var(--muted-foreground)]">{unit}</span>}
      </span>
    </div>
  )
}
