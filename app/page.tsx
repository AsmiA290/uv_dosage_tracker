import { AlertTriangle, MapPin } from "lucide-react";
import { computeDoseEstimate } from "@/lib/dose/dose";
import { FITZPATRICK_LABELS } from "@/lib/dose/constants";
import { fetchOpenMeteoForecast, ForecastFetchError } from "@/lib/weather/open-meteo";
import type { FitzpatrickType } from "@/lib/dose/types";
import { RadialGaugeShell } from "@/components/ui/radial-gauge-shell";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatTile, type RiskLevel } from "@/components/ui/stat-tile";
import { UncertaintyRange } from "@/components/ui/uncertainty-range";

// Springfield, IL — district anchor city (IL-13). Replace with the user's
// own geolocation once device location wiring is built out.
const DEFAULT_LAT = 39.78;
const DEFAULT_LON = -89.65;
const LOCATION_LABEL = "Springfield, IL";

export const dynamic = "force-dynamic";

function riskFromFraction(fraction: number): RiskLevel {
  if (fraction > 0.5) return "low";
  if (fraction > 0.2) return "medium";
  return "high";
}

export default async function NowPage() {
  const sessionStart = new Date(Date.now() - 30 * 60_000);
  const now = new Date();
  const fitzpatrickType: FitzpatrickType = "II";

  let hourlySamples;
  try {
    hourlySamples = await fetchOpenMeteoForecast({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
  } catch (err) {
    const message = err instanceof ForecastFetchError ? err.message : "Unexpected error.";
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-16 pb-28 text-center">
        <AlertTriangle className="size-10 text-[var(--risk-medium)]" aria-hidden="true" />
        <p className="text-lg font-semibold">Forecast unavailable</p>
        <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Showing no cached estimate yet — try again shortly.
        </p>
      </main>
    );
  }

  const estimate = computeDoseEstimate({
    fitzpatrickType,
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LON,
    surface: "grass",
    posture: "standing",
    hourlySamples,
    sessionStart,
    now,
  });

  const budgetFraction =
    estimate.medThresholdSED.nominal > 0
      ? estimate.remainingBudgetSED.nominal / estimate.medThresholdSED.nominal
      : 0;
  const risk = riskFromFraction(budgetFraction);
  const riskLabel = risk === "low" ? "Low risk" : risk === "medium" ? "Moderate risk" : "High risk";

  const hasTimeToThreshold =
    Number.isFinite(estimate.timeToThreshold.p10Minutes) && Number.isFinite(estimate.timeToThreshold.p90Minutes);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">UV Dose Tracker</h1>
          <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <MapPin className="size-3.5" aria-hidden="true" />
            {LOCATION_LABEL}
          </p>
        </div>
        <RiskBadge level={risk} label={riskLabel} />
      </header>

      <p className="text-sm text-[var(--muted-foreground)]">{FITZPATRICK_LABELS[fitzpatrickType]}</p>

      <div className="flex flex-col items-center py-2">
        <RadialGaugeShell title="Remaining budget" fraction={budgetFraction} riskLevel={risk} size={220}>
          <span className="hero-number text-5xl font-semibold text-[var(--foreground)]">
            {estimate.remainingBudgetSED.nominal.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-[var(--muted-foreground)]">SED left</span>
        </RadialGaugeShell>
        <div className="mt-3">
          <UncertaintyRange
            low={estimate.remainingBudgetSED.low}
            nominal={estimate.remainingBudgetSED.nominal}
            high={estimate.remainingBudgetSED.high}
            unit="SED range"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">You will likely reach your burn threshold in</p>
        <p className="hero-number mt-1 text-2xl font-semibold text-[var(--foreground)]">
          {hasTimeToThreshold
            ? `${Math.round(estimate.timeToThreshold.p10Minutes)}–${Math.round(estimate.timeToThreshold.p90Minutes)} min`
            : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Dose rate"
          value={estimate.currentDoseRateSEDPerMinute.toFixed(3)}
          unit="SED/min"
        />
        <StatTile
          label="MED threshold"
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

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Educational estimate only — not a medical device and not a diagnosis. See Methods for every
        parameter and its source.
      </p>
    </main>
  );
}
