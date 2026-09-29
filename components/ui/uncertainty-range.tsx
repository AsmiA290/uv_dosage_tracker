import { cn } from "@/lib/utils"

interface UncertaintyRangeProps {
  low: number
  nominal: number
  high: number
  unit?: string
  decimals?: number
  /** Render the nominal value at a larger size than the low-high bounds. */
  size?: "sm" | "md"
  className?: string
}

/**
 * `low – high` with the nominal value slightly emphasized. Used anywhere the
 * app shows an interval instead of a single number — this app deliberately
 * never states a falsely precise single figure for a forecasted quantity.
 */
export function UncertaintyRange({
  low,
  nominal,
  high,
  unit,
  decimals = 1,
  size = "md",
  className,
}: UncertaintyRangeProps) {
  const fmt = (n: number) => n.toFixed(decimals)

  return (
    <span className={cn("hero-number inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("font-semibold text-[var(--foreground)]", size === "md" ? "text-lg" : "text-sm")}>
        {fmt(nominal)}
        {unit && <span className="ml-1 text-xs font-normal text-[var(--muted-foreground)]">{unit}</span>}
      </span>
      <span className="text-sm text-[var(--muted-foreground)]">
        ({fmt(low)}&ndash;{fmt(high)})
      </span>
    </span>
  )
}
