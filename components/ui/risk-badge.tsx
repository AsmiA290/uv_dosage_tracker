import { cn } from "@/lib/utils"
import type { RiskLevel } from "./stat-tile"

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "risk-pill-low text-[var(--risk-low)]",
  medium: "risk-pill-medium text-[var(--risk-medium)]",
  high: "risk-pill-high text-[var(--risk-high)]",
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
        "inline-flex items-center gap-1.5 rounded-full border border-white/50 px-3 py-1 text-sm font-medium shadow-sm backdrop-blur-md",
        RISK_STYLES[level],
        className
      )}
    >
      {value && <span className="hero-number font-semibold">{value}</span>}
      <span>{label}</span>
    </span>
  )
}
