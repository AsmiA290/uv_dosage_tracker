"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronRight, MapPin, Timer } from "lucide-react";
import { computeDoseEstimate } from "@/lib/dose/dose";
import { interpolateHourlyToMinutes, uviToErythemalIrradianceWm2 } from "@/lib/dose/irradiance";
import { personalExposureRatio } from "@/lib/dose/corrections";
import { FITZPATRICK_LABELS } from "@/lib/dose/constants";
import { fetchOpenMeteoForecastClient } from "@/lib/weather/client";
import { fetchProfile } from "@/lib/local/profile";
import { fetchIncidentDoseOnDay, fetchPriorDoseToday } from "@/lib/local/sessions";
import { loadInProgressSession, type InProgressSession } from "@/lib/local/active-session";
import type { UserProfile } from "@/lib/local/profile";
import type { HourlyUVSample, Interval } from "@/lib/dose/types";
import { budgetFractionLeft, formatMinutes, riskFromEstimate } from "@/lib/risk";
import { fractionOfDailyLimit, sumIntervals } from "@/lib/dose/occupational";
import { BurnTimeHeadline } from "@/components/burn-time-headline";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { SkyHero } from "@/components/sky/sky-hero";
import { WorkExposureCard } from "@/components/work-exposure-card";

// Springfield, IL is only a fallback for the rare case a profile has no
// saved location yet. Normal use always comes from the user's own profile.
const FALLBACK_LAT = 39.78;
const FALLBACK_LON = -89.65;
const FALLBACK_LABEL = "Springfield, IL";

const ZERO: Interval = { low: 0, nominal: 0, high: 0 };

/**
 * Now screen: answers one question, "if I go outside right now, how soon
 * could I burn?" It does NOT invent a session; the only dose counted so far
 * is what the user actually logged in saved sessions earlier today.
 */
export default function NowPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [samples, setSamples] = useState<HourlyUVSample[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [priorDoseToday, setPriorDoseToday] = useState<Interval>(ZERO);
  // Before-sunscreen dose from sessions saved today, for the work-exposure meter.
  const [priorWorkDoseToday, setPriorWorkDoseToday] = useState<Interval>(ZERO);
  const [inProgress, setInProgress] = useState<InProgressSession | null>(null);

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p || !p.onboardedAt) {
        router.replace("/onboarding");
        return;
      }
      const t = new Date();
      setProfile(p);
      setNow(t);
      fetchPriorDoseToday(t).then(setPriorDoseToday).catch(() => setPriorDoseToday(ZERO));
      fetchIncidentDoseOnDay(t).then(setPriorWorkDoseToday).catch(() => setPriorWorkDoseToday(ZERO));
      setInProgress(loadInProgressSession());
    });
  }, [router]);

  // Refresh "now" every 5 minutes so the estimate stays current if the screen is left open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  // While a session is running, "now" means where that session is.
  const running = inProgress && !inProgress.endedAt ? inProgress : null;
  const latitude = running?.location.latitude ?? profile?.homeLat ?? FALLBACK_LAT;
  const longitude = running?.location.longitude ?? profile?.homeLon ?? FALLBACK_LON;

  // Dose from a session that is running, or ended but not saved yet, still
  // counts toward today, so the Now screen never shows a fuller budget than
  // the user really has.
  const unsaved = useMemo<{ dose: Interval; incident: Interval }>(() => {
    if (!inProgress || !samples || !now) return { dose: ZERO, incident: ZERO };
    if (inProgress.startedAt.toDateString() !== now.toDateString()) return { dose: ZERO, incident: ZERO };
    const e = computeDoseEstimate({
      fitzpatrickType: inProgress.setup.fitzpatrickType,
      latitude: inProgress.location.latitude,
      longitude: inProgress.location.longitude,
      surface: inProgress.setup.surface,
      posture: inProgress.setup.posture,
      hourlySamples: samples,
      sessionStart: inProgress.startedAt,
      now: inProgress.endedAt ?? now,
      sunscreenApplications: inProgress.applications,
      monteCarloSamples: 50,
    });
    return { dose: e.sessionDoseSED, incident: e.sessionIncidentDoseSED };
  }, [inProgress, samples, now]);
  const unsavedDose = unsaved.dose;

  const doseToday = useMemo<Interval>(
    () => ({
      low: priorDoseToday.low + unsavedDose.low,
      nominal: priorDoseToday.nominal + unsavedDose.nominal,
      high: priorDoseToday.high + unsavedDose.high,
    }),
    [priorDoseToday, unsavedDose],
  );

  useEffect(() => {
    if (!profile) return;
    fetchOpenMeteoForecastClient(latitude, longitude)
      .then(setSamples)
      .catch((err) => setForecastError(err instanceof Error ? err.message : "Forecast unavailable."));
  }, [profile, latitude, longitude]);

  const estimate = useMemo(() => {
    if (!profile || !samples || !now) return null;
    return computeDoseEstimate({
      fitzpatrickType: running?.setup.fitzpatrickType ?? profile.fitzpatrickType ?? "II",
      latitude,
      longitude,
      surface: running?.setup.surface ?? profile.defaultSurface ?? "grass",
      posture: running?.setup.posture ?? profile.defaultPosture ?? "standing",
      hourlySamples: samples,
      sessionStart: now,
      now,
      // Sunscreen already on from the running session keeps protecting.
      sunscreenApplications: running?.applications ?? [],
      priorDoseTodaySED: doseToday,
    });
  }, [profile, samples, now, latitude, longitude, doseToday, running]);

  if (profile === undefined || !now) {
    return <LoadingShell />;
  }

  if (forecastError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16 pb-28">
        <div className="glass-panel mx-auto flex max-w-md flex-col items-center gap-4 rounded-[calc(var(--radius)+10px)] p-8 text-center">
          <AlertTriangle className="size-10 text-[var(--risk-medium)]" aria-hidden="true" />
          <p className="text-lg font-semibold">Forecast unavailable</p>
          <p className="text-sm text-[var(--muted-foreground)]">{forecastError}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Try again in a few minutes.</p>
        </div>
      </main>
    );
  }

  if (!estimate || !profile || !samples) {
    return <LoadingShell />;
  }

  const fitzpatrickType = profile.fitzpatrickType ?? "II";
  const locationLabel = running?.location.label ?? profile.homeLabel ?? FALLBACK_LABEL;
  const risk = riskFromEstimate(estimate);
  // Solar-shaped UV at this minute (same interpolation the dose engine uses).
  const uvNow =
    interpolateHourlyToMinutes(samples, latitude, longitude, now, new Date(now.getTime() + 2 * 60_000))[0]?.uvIndex ??
    nearestUv(samples, now);
  const perNominal = personalExposureRatio(profile.defaultPosture ?? "standing", profile.defaultSurface ?? "grass").nominal;
  const doseRateNow = (uviToErythemalIrradianceWm2(uvNow * perNominal) * 60) / 100; // SED per minute
  const peak = peakToday(samples, now);
  const usedPct = Math.round((1 - budgetFractionLeft(estimate)) * 100);
  const loggedToday = doseToday.nominal > 0;
  // Daily work exposure vs the ICNIRP/ACGIH limit: saved sessions today plus
  // any running or unsaved session, counted before sunscreen.
  const workDoseToday = sumIntervals(priorWorkDoseToday, unsaved.incident);
  const workShare = workDoseToday.high > 0 ? fractionOfDailyLimit(workDoseToday) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-6 py-8 pb-32">
      <SkyHero
        latitude={latitude}
        longitude={longitude}
        now={now}
        samples={samples}
        header={
          <header className="flex items-start justify-between gap-3">
            <div className="liquid-glass flex min-w-0 flex-col gap-1 rounded-2xl px-3 py-2">
              <h1 className="text-base font-semibold leading-tight">UV Dose Tracker</h1>
              <a
                href="https://theactinicshield.org"
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit rounded-full border border-white/60 bg-white/50 px-2 py-px text-[10px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-white/80 hover:text-[var(--foreground)]"
              >
                Created by the Actinic Shield
              </a>
              <p className="flex items-center gap-1 text-xs text-[var(--foreground)]/80">
                <MapPin className="size-3" aria-hidden="true" />
                {locationLabel}
              </p>
            </div>
            <RiskBadge level={risk.level} label={risk.label} />
          </header>
        }
      />

      <section
        className="glass-panel rise-in relative z-10 -mt-12 flex flex-col gap-5 rounded-[calc(var(--radius)+12px)] px-6 py-7"
        style={{ boxShadow: `inset 0 3px 0 0 var(--risk-${risk.level}), inset 0 1px 0 0 rgb(255 255 255 / 0.85), 0 22px 44px -22px rgb(15 23 42 / 0.45)` }}
      >
        <BurnTimeHeadline
          estimate={estimate}
          lead={running ? "Staying out, you could burn in as little as" : "If you go outside now, you could burn in as little as"}
          now={now}
          uvNow={uvNow}
        />
        <Button asChild variant="glass" size="session" className="glass-cta w-full">
          <Link href="/session">{inProgress ? "Open your session" : "Start a session"}</Link>
        </Button>
      </section>

      {inProgress && (
        <Link
          href="/session"
          className="glass-panel rise-in flex items-center justify-between gap-3 rounded-[var(--radius)] px-4 py-3"
        >
          <span className="flex items-center gap-3">
            <Timer className="size-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">
                {inProgress.endedAt ? "Session ended, not saved yet" : "Session in progress"}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {inProgress.endedAt
                  ? "Save it so it counts toward today's total"
                  : `Running for ${formatMinutes((now.getTime() - inProgress.startedAt.getTime()) / 60_000)}`}
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" />
        </Link>
      )}

      <div className="rise-in grid grid-cols-2 gap-3" style={{ animationDelay: "80ms" }}>
        <StatTile
          label="Peak UV"
          value={peak ? peak.uvIndex.toFixed(1) : "–"}
          caption={peak ? `today at ${peak.time.toLocaleTimeString([], { hour: "numeric" })}` : "No data"}
          compact
        />
        <StatTile
          label="Used today"
          value={`${usedPct}%`}
          caption={loggedToday ? "of your burn budget" : "nothing logged yet"}
          compact
        />
      </div>

      <WorkExposureCard share={workShare} />

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Estimated for {FITZPATRICK_LABELS[fitzpatrickType].split(":")[0]} skin, on your most exposed areas
        (head, shoulders, nose). <Link href="/profile" className="font-medium text-[var(--accent)] underline-offset-2 hover:underline">Change</Link>
      </p>

      <details className="glass-panel-solid group rounded-[var(--radius)] p-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
          The numbers behind this
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[var(--muted-foreground)]">
          <dt>Dose rate right now</dt>
          <dd className="hero-number text-right text-[var(--foreground)]">
            {doseRateNow.toFixed(3)} SED/min
          </dd>
          <dt>Your burn threshold (MED)</dt>
          <dd className="hero-number text-right text-[var(--foreground)]">
            {estimate.medThresholdSED.low.toFixed(1)}–{estimate.medThresholdSED.high.toFixed(1)} SED
          </dd>
          <dt>Saved sessions today</dt>
          <dd className="hero-number text-right text-[var(--foreground)]">{priorDoseToday.nominal.toFixed(2)} SED</dd>
          {inProgress && (
            <>
              <dt>{inProgress.endedAt ? "Unsaved session" : "Session in progress"}</dt>
              <dd className="hero-number text-right text-[var(--foreground)]">{unsavedDose.nominal.toFixed(2)} SED</dd>
            </>
          )}
          <dt>Budget left</dt>
          <dd className="hero-number text-right text-[var(--foreground)]">
            {estimate.remainingBudgetSED.nominal.toFixed(1)} SED ({estimate.remainingBudgetSED.low.toFixed(1)}–
            {estimate.remainingBudgetSED.high.toFixed(1)})
          </dd>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted-foreground)]">
          SED (Standard Erythema Dose) measures UV dose; 1 SED = 100 J/m² of sunburn-weighted UV. The headline uses
          the earliest likely time from 2,000 simulations that vary your threshold, the forecast, and how much UV your
          skin catches. See <Link href="/methods" className="font-medium text-[var(--accent)]">Methods</Link> for every source.
        </p>
      </details>

      <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
        Educational estimate only, not a medical device. Staying under your burn threshold does not mean no UV damage.
      </p>
    </main>
  );
}

function LoadingShell() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-6 py-8 pb-32">
      <div className="h-12 w-2/3 animate-pulse rounded-[var(--radius)] bg-[var(--border)]" />
      <div className="h-64 animate-pulse rounded-[var(--radius)] bg-[var(--border)]" />
      <div className="h-24 animate-pulse rounded-[var(--radius)] bg-[var(--border)]" />
    </main>
  );
}

function nearestUv(samples: HourlyUVSample[], now: Date): number {
  let best: HourlyUVSample | undefined;
  for (const s of samples) {
    if (!best || Math.abs(s.time.getTime() - now.getTime()) < Math.abs(best.time.getTime() - now.getTime())) best = s;
  }
  return best?.uvIndex ?? 0;
}

function peakToday(samples: HourlyUVSample[], now: Date): HourlyUVSample | null {
  const today = samples.filter((s) => s.time.toDateString() === now.toDateString());
  if (today.length === 0) return null;
  return today.reduce((a, b) => (b.uvIndex > a.uvIndex ? b : a));
}
