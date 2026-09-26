import { redirect } from "next/navigation";
import { AlertTriangle, MapPin } from "lucide-react";
import { computeDoseEstimate } from "@/lib/dose/dose";
import { FITZPATRICK_LABELS } from "@/lib/dose/constants";
import { fetchOpenMeteoForecast, ForecastFetchError } from "@/lib/weather/open-meteo";
import { fetchProfileServer } from "@/lib/supabase/profile-server";
import { RadialGaugeShell } from "@/components/ui/radial-gauge-shell";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatTile, type RiskLevel } from "@/components/ui/stat-tile";
import { UncertaintyRange } from "@/components/ui/uncertainty-range";
import { WeatherSky } from "@/components/weather-sky";

// Springfield, IL is only a fallback for the rare case a profile has no
// saved location yet. Normal use always comes from the user's own profile.
const FALLBACK_LAT = 39.78;
const FALLBACK_LON = -89.65;
const FALLBACK_LABEL = "Springfield, IL";

export const dynamic = "force-dynamic";

function riskFromFraction(fraction: number): RiskLevel {
  if (fraction > 0.5) return "low";
  if (fraction > 0.2) return "medium";
  return "high";
}

export default async function NowPage() {
  const profile = await fetchProfileServer();
  if (!profile) redirect("/auth/login");
  if (!profile.onboardedAt) redirect("/onboarding");

  const fitzpatrickType = profile.fitzpatrickType ?? "II";
  const latitude = profile.homeLat ?? FALLBACK_LAT;
  const longitude = profile.homeLon ?? FALLBACK_LON;
  const locationLabel = profile.homeLabel ?? FALLBACK_LABEL;
  const surface = profile.defaultSurface ?? "grass";
  const posture = profile.defaultPosture ?? "standing";

  const sessionStart = new Date(Date.now() - 30 * 60_000);
  const now = new Date();

  let hourlySamples;
  try {
    hourlySamples = await fetchOpenMeteoForecast({ latitude, longitude });
  } catch (err) {
    const message = err instanceof ForecastFetchError ? err.message : "Unexpected error.";
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 pb-28">
        <WeatherSky uvIndex={0} cloudCoverPct={100} hour={now.getHours()} />
        <div className="glass-panel relative z-10 mx-auto flex max-w-md flex-col items-center gap-4 rounded-[calc(var(--radius)+10px)] p-8 text-center">
          <AlertTriangle className="size-10 text-[var(--risk-medium)]" aria-hidden="true" />
          <p className="text-lg font-semibold">Forecast unavailable</p>
          <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Showing no cached estimate yet. Try again shortly.
          </p>
        </div>
      </main>
    );
  }

  const estimate = computeDoseEstimate({
    fitzpatrickType,
    latitude,
    longitude,
    surface,
    posture,
    hourlySamples,
    sessionStart,
    now,
  });

  // Nearest hourly sample to "now" drives the animated sky's sun/cloud
  // state so it reflects the actual forecast, not just the clock.
  const currentSample =
    hourlySamples.find((s) => s.time.getTime() >= now.getTime()) ?? hourlySamples[hourlySamples.length - 1];

  const budgetFraction =
    estimate.medThresholdSED.nominal > 0
      ? estimate.remainingBudgetSED.nominal / estimate.medThresholdSED.nominal
      : 0;
  const risk = riskFromFraction(budgetFraction);
  const riskLabel = risk === "low" ? "Low risk" : risk === "medium" ? "Moderate risk" : "High risk";

  const hasTimeToThreshold =
    Number.isFinite(estimate.timeToThreshold.p10Minutes) && Number.isFinite(estimate.timeToThreshold.p90Minutes);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden pb-28">
      <WeatherSky
        uvIndex={currentSample?.uvIndex ?? 0}
        cloudCoverPct={currentSample?.cloudCoverPct ?? 40}
        hour={now.getHours()}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="glass-pill flex flex-col gap-0.5 rounded-2xl px-4 py-2">
            <h1 className="text-base font-semibold leading-tight text-[var(--foreground)]">UV Dose Tracker</h1>
            <p className="flex items-center gap-1 text-xs font-medium leading-tight text-[var(--foreground)]/75">
              <MapPin className="size-3.5" aria-hidden="true" />
              {locationLabel}
            </p>
          </div>
          <RiskBadge level={risk} label={riskLabel} />
        </header>

        <p className="glass-pill inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/85">
          {FITZPATRICK_LABELS[fitzpatrickType]}
        </p>

        <div className="glass-panel flex flex-col items-center gap-3 rounded-[calc(var(--radius)+10px)] px-6 py-8">
          <RadialGaugeShell title="Remaining budget" fraction={budgetFraction} riskLevel={risk} size={220}>
            <span className="hero-number text-5xl font-semibold text-[var(--foreground)]">
              {estimate.remainingBudgetSED.nominal.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-[var(--muted-foreground)]">SED left</span>
          </RadialGaugeShell>
          <UncertaintyRange
            low={estimate.remainingBudgetSED.low}
            nominal={estimate.remainingBudgetSED.nominal}
            high={estimate.remainingBudgetSED.high}
            unit="SED range"
          />
        </div>

        <div className="glass-panel rounded-[calc(var(--radius)+6px)] p-4 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">You will likely reach your burn threshold in</p>
          <p className="hero-number mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {hasTimeToThreshold
              ? `${Math.round(estimate.timeToThreshold.p10Minutes)}–${Math.round(estimate.timeToThreshold.p90Minutes)} min`
              : "N/A"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Dose rate"
            value={estimate.currentDoseRateSEDPerMinute.toFixed(3)}
            unit="SED/min"
          />
          <StatTile
            label="Burn threshold (MED)"
            value={estimate.medThresholdSED.nominal.toFixed(1)}
            unit="SED"
          />
          <StatTile
            label="Dose so far"
            value={estimate.cumulativeDoseSED.nominal.toFixed(2)}
            unit="SED"
          />
          <StatTile
            label="Session length"
            value={Math.round((now.getTime() - sessionStart.getTime()) / 60_000)}
            unit="min"
          />
        </div>

        <p className="glass-pill rounded-2xl px-4 py-3 text-center text-xs text-[var(--foreground)]/75">
          SED (Standard Erythema Dose) measures cumulative UV exposure. MED (Minimal Erythema Dose) is your
          estimated sunburn threshold. Educational estimate only, not a medical device and not a diagnosis. See
          Methods for every parameter and its source.
        </p>
      </div>
    </main>
  );
}
