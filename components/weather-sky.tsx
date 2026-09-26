type TimeOfDay = "dawn" | "day" | "dusk" | "night"

interface WeatherSkyProps {
  /** Current UV Index — used only to decide whether the sun disc renders. */
  uvIndex: number
  /** 0-100. Drives cloud opacity/count; higher cover dims the sun glow. */
  cloudCoverPct: number
  /** Local hour, 0-23. Drives the sky gradient and the sun's height. */
  hour: number
  className?: string
}

function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return "dawn"
  if (hour >= 8 && hour < 17) return "day"
  if (hour >= 17 && hour < 20) return "dusk"
  return "night"
}

const SKY_GRADIENT: Record<TimeOfDay, string> = {
  dawn: "linear-gradient(180deg, #fbcfe8 0%, #fdba74 35%, #fef3c7 68%, var(--background) 100%)",
  day: "linear-gradient(180deg, #0ea5e9 0%, #38bdf8 30%, #bae6fd 62%, var(--background) 100%)",
  dusk: "linear-gradient(180deg, #6d28d9 0%, #f97316 40%, #fdba74 70%, var(--background) 100%)",
  night: "linear-gradient(180deg, #0b1120 0%, #1e293b 45%, #334155 75%, var(--background) 100%)",
}

const SUN_TOP: Record<TimeOfDay, string> = {
  dawn: "62%",
  day: "10%",
  dusk: "60%",
  night: "80%",
}

/**
 * Full-bleed, Apple-Weather-style animated backdrop for the Now page,
 * matching the actual forecast (UV, cloud cover) and local time of day.
 * Pure CSS keyframes — no client JS — so it renders straight out of the
 * server component tree. `prefers-reduced-motion` disables the drift/pulse
 * animations globally (see globals.css).
 */
export function WeatherSky({ uvIndex, cloudCoverPct, hour, className }: WeatherSkyProps) {
  const tod = timeOfDay(hour)
  const showSun = tod !== "night" && uvIndex > 0
  const cloudCover = Math.min(100, Math.max(0, cloudCoverPct))
  const cloudOpacity = Math.min(0.85, Math.max(0.1, cloudCover / 100))
  const sunGlowColor = tod === "dusk" ? "#fed7aa" : tod === "dawn" ? "#fef3c7" : "#fffbeb"

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{ background: SKY_GRADIENT[tod] }}
    >
      {showSun && (
        <div
          className="sky-sun absolute left-1/2 aspect-square w-44 -translate-x-1/2 rounded-full"
          style={{
            top: SUN_TOP[tod],
            background: `radial-gradient(circle, ${sunGlowColor} 0%, color-mix(in srgb, ${sunGlowColor} 55%, transparent) 45%, transparent 75%)`,
            filter: `blur(3px) brightness(${1 - cloudOpacity * 0.35})`,
            animation: "sun-pulse 7s ease-in-out infinite",
          }}
        />
      )}

      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="sky-cloud absolute rounded-full bg-white blur-2xl"
          style={{
            top: `${16 + i * 24}%`,
            left: `${-25 + i * 12}%`,
            width: `${72 - i * 10}%`,
            height: `${18 - i * 3}%`,
            opacity: cloudOpacity * (1 - i * 0.18),
            animation: `drift-cloud ${24 + i * 8}s ease-in-out infinite alternate`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]" />
    </div>
  )
}
