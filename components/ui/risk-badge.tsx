import { cn } from "@/lib/utils"
import type { RiskLevel } from "./stat-tile"

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-[var(--risk-low)]/10 text-[var(--risk-low)]",
  medium: "bg-[var(--risk-medium)]/10 text-[var(--risk-medium)]",
  high: "bg-[var(--risk-high)]/10 text-[var(--risk-high)]",
}

interface RiskBadgeProps {
  level: RiskLevel
  /** Always required — a RiskBadge must never render color with no text. */
  label: string
  value?: string
  className?: string
}

/** Pill-shaped, text + numeral. Never render with color alone. */
export function RiskBadge({ level, label, value, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        RISK_STYLES[level],
        className
      )}
    >
      {value && <span className="hero-number font-semibold">{value}</span>}
      <span>{label}</span>
    </span>
  )
}
