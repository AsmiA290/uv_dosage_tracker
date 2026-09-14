import { computeDoseEstimate } from "@/lib/dose/dose";
import { FITZPATRICK_LABELS } from "@/lib/dose/constants";
import { fetchOpenMeteoForecast, ForecastFetchError } from "@/lib/weather/open-meteo";
import type { FitzpatrickType } from "@/lib/dose/types";

// Springfield, IL — district anchor city (IL-13). Replace with the user's
// own geolocation once the "Now" screen is built out in v0.
const DEFAULT_LAT = 39.78;
const DEFAULT_LON = -89.65;

export const dynamic = "force-dynamic";

/**
 * Minimal, functional placeholder for the "Now" screen. This wires the
 * real pipeline end-to-end (Open-Meteo -> dose engine -> render) so the
 * app builds and runs before any UI work happens. Replace this file's
 * JSX with what v0 generates from v0-prompts/01-now-screen.md — keep the
 * data-fetching + computeDoseEstimate() call, since that's the part that
 * must stay hand-written per the brief.
 */
export default async function NowPage() {
  const sessionStart = new Date(Date.now() - 30 * 60_000);
  const now = new Date();
  const fitzpatrickType: FitzpatrickType = "II";

  let content: React.ReactNode;
  try {
    const hourlySamples = await fetchOpenMeteoForecast({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
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

    content = (
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">{FITZPATRICK_LABELS[fitzpatrickType]}</p>
        <div>
          <div className="hero-number text-7xl font-semibold">
            {estimate.remainingBudgetSED.nominal.toFixed(1)}
            <span className="text-2xl font-normal text-[var(--muted-foreground)]"> SED left</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            range {estimate.remainingBudgetSED.low.toFixed(1)}–{estimate.remainingBudgetSED.high.toFixed(1)} SED
          </p>
        </div>
        <p className="text-lg">
          You will likely reach your burn threshold in{" "}
          <strong>
            {Number.isFinite(estimate.timeToThreshold.p10Minutes) ? Math.round(estimate.timeToThreshold.p10Minutes) : "—"}
            –
            {Number.isFinite(estimate.timeToThreshold.p90Minutes) ? Math.round(estimate.timeToThreshold.p90Minutes) : "—"}
          </strong>{" "}
          minutes.
        </p>
        <p className="max-w-md text-xs text-[var(--muted-foreground)]">
          Educational estimate only — not a medical device and not a diagnosis. See /methods for every
          parameter and its source.
        </p>
      </div>
    );
  } catch (err) {
    const message = err instanceof ForecastFetchError ? err.message : "Unexpected error.";
    content = (
      <div className="text-center">
        <p className="text-lg font-medium">Forecast unavailable</p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6 py-16">
      <h1 className="text-xl font-semibold">UV Dose Tracker</h1>
      {content}
    </main>
  );
}
