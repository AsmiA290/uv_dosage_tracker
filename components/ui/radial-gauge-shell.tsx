import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "./stat-tile"

const RISK_COLOR: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
}

interface RadialGaugeShellProps {
  /** Small caption above the arc, e.g. "Remaining budget". */
  title?: string
  /**
   * Placeholder fill fraction, 0-1. This shell draws a simple stroke-based
   * arc as a stand-in — the real hero gauge (eased fill animation, tick
   * marks, d3-scale/d3-shape arc generator) is hand-built separately and
   * will replace the <circle> below without touching this component's API.
   */
  fraction: number
  riskLevel?: RiskLevel
  size?: number
  strokeWidth?: number
  /** Big center-number slot. */
  children: ReactNode
  /** Small caption slot beneath the center number. */
  caption?: ReactNode
  className?: string
}

/** Reusable, empty-by-default SVG arc container that hosts a hero number. */
export function RadialGaugeShell({
  title,
  fraction,
  riskLevel = "low",
  size = 240,
  strokeWidth = 14,
  children,
  caption,
  className,
}: RadialGaugeShellProps) {
  const clamped = Math.min(1, Math.max(0, fraction))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // TODO(hero gauge): replace this dasharray placeholder with a proper
  // d3-shape `arc()` generator (start/end angle, corner radius, easing via
  // `motion`) once the hand-built gauge is dropped in.
  const dashOffset = circumference * (1 - clamped)

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {title && (
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {title}
        </span>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="-rotate-90"
          role="img"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={RISK_COLOR[riskLevel]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 400ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
          {children}
          {caption && <div className="text-sm text-[var(--muted-foreground)]">{caption}</div>}
        </div>
      </div>
    </div>
  )
}
