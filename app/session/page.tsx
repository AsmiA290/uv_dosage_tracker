"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, LocateFixed, MapPin, Plus } from "lucide-react";
import { computeDoseEstimate } from "@/lib/dose/dose";
import { activeSPFAtTime, shouldReapply } from "@/lib/dose/sunscreen";
import { FITZPATRICK_LABELS, SURFACE_ALBEDO } from "@/lib/dose/constants";
import { useI18n } from "@/lib/i18n/provider";
import { fetchOpenMeteoForecastClient } from "@/lib/weather/client";
import type {
  DoseEstimate,
  FitzpatrickType,
  HourlyUVSample,
  Interval,
  PostureType,
  SunscreenApplication,
  SurfaceType,
} from "@/lib/dose/types";
import {
  createDbSession,
  endDbSession,
  fetchDbSessionHistory,
  fetchIncidentDoseOnDay,
  fetchPriorDoseToday,
  insertSunscreenApplicationRow,
} from "@/lib/local/sessions";
import { fetchProfile } from "@/lib/local/profile";
import {
  loadInProgressSession,
  saveInProgressSession,
  type InProgressSession,
  type SessionLocation,
  type SessionSetup,
} from "@/lib/local/active-session";
import { Button } from "@/components/ui/button";
import { RadialGaugeShell } from "@/components/ui/radial-gauge-shell";
import { UncertaintyRange } from "@/components/ui/uncertainty-range";
import { BurnTimeHeadline } from "@/components/burn-time-headline";
import { budgetFractionLeft, riskFromEstimate } from "@/lib/risk";
import { fractionOfDailyLimit, sumIntervals } from "@/lib/dose/occupational";
import { WorkExposureCard } from "@/components/work-exposure-card";
import { SessionAlerts } from "@/components/session-alerts";

// Springfield, IL is only a fallback for the rare case a profile has no
// saved location yet. Normal use always comes from the user's own profile.
const FALLBACK_LOCATION: SessionLocation = { latitude: 39.78, longitude: -89.65, label: "Springfield, IL" };

const ZERO: Interval = { low: 0, nominal: 0, high: 0 };

/** After this long, gently ask whether the user forgot to end the session. */
const LONG_SESSION_MINUTES = 8 * 60;

const THICKNESS_OPTIONS = [
  { key: "thicknessLight", value: 0.5 },
  { key: "thicknessStandard", value: 1.0 },
  { key: "thicknessThick", value: 2.0 },
] as const;

const SURFACE_KEYS = Object.keys(SURFACE_ALBEDO) as SurfaceType[];
const SKIN_KEYS = Object.keys(FITZPATRICK_LABELS) as FitzpatrickType[];
const POSTURE_OPTIONS: PostureType[] = ["standing", "sitting", "activeSport"];

type SetupState = SessionSetup;

/** A running session (no endedAt) or one that has ended but isn't saved yet. */
type ActiveSession = InProgressSession;
type EndedSession = InProgressSession & { endedAt: Date };

export default function SessionPage() {
  const { m, t, duration, date: formatDate } = useI18n();
  // Location labels the app stores in English are shown in the chosen language.
  const displayLabel = (label: string) =>
    label === "Current location" ? m.common.currentLocation : label === "Home" ? m.common.home : label;
  const [phase, setPhase] = useState<"idle" | "active" | "ended">("idle");
  const [samples, setSamples] = useState<HourlyUVSample[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [ended, setEnded] = useState<EndedSession | null>(null);
  const [lastSaved, setLastSaved] = useState<{ startedAt: string; dose: string } | null>(null);

  const [setup, setSetup] = useState<SetupState>({
    fitzpatrickType: "II",
    surface: "grass",
    posture: "standing",
    spf: "",
    thickness: 1.0,
  });
  const [homeLocation, setHomeLocation] = useState<SessionLocation>(FALLBACK_LOCATION);
  const [location, setLocation] = useState<SessionLocation>(FALLBACK_LOCATION);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<"unavailable" | "failed" | null>(null);
  // True once we've checked storage for an unfinished session, so the
  // persistence effect below never wipes it before it has been restored.
  const [restored, setRestored] = useState(false);
  const [addingSunscreen, setAddingSunscreen] = useState(false);
  const [addSpf, setAddSpf] = useState("");
  const [addThickness, setAddThickness] = useState(1.0);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Before-sunscreen dose from other sessions saved the same day, for the
  // daily work-exposure meter (ICNIRP/ACGIH limit).
  const [priorWorkDose, setPriorWorkDose] = useState<Interval>(ZERO);
  const workSessionId = (active ?? ended)?.id;
  const workStartMs = (active ?? ended)?.startedAt.getTime();

  // Load the user's saved profile defaults (skin type, home location, usual
  // surface/posture) once on mount, so setup starts pre-filled instead of
  // generic. The forecast fetch waits for the resolved location.
  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        if (!profile) return;
        setSetup((prev) => ({
          ...prev,
          fitzpatrickType: profile.fitzpatrickType ?? prev.fitzpatrickType,
          surface: profile.defaultSurface ?? prev.surface,
          posture: profile.defaultPosture ?? prev.posture,
        }));
        if (profile.homeLat !== null && profile.homeLon !== null) {
          const home = { latitude: profile.homeLat, longitude: profile.homeLon, label: profile.homeLabel ?? "Home" };
          setHomeLocation(home);
          setLocation(home);
        }
      })
      .catch((err) => console.error("[v0] Failed to load profile:", err))
      .finally(() => {
        // Restore an unfinished session last, so its location wins over home.
        const saved = loadInProgressSession();
        if (saved) {
          setLocation(saved.location);
          if (saved.endedAt) {
            setEnded({ ...saved, endedAt: saved.endedAt });
            setPhase("ended");
          } else {
            setActive(saved);
            setNow(new Date());
            setPhase("active");
          }
        }
        setRestored(true);
      });
  }, []);

  useEffect(() => {
    if (!workSessionId || workStartMs === undefined) return;
    fetchIncidentDoseOnDay(new Date(workStartMs), workSessionId)
      .then(setPriorWorkDose)
      .catch(() => setPriorWorkDose(ZERO));
  }, [workSessionId, workStartMs]);

  // Keep the unfinished session in storage so a reload or a discarded
  // background tab never loses dose the user actually received.
  useEffect(() => {
    if (!restored) return;
    saveInProgressSession(active ?? ended ?? null);
  }, [restored, active, ended]);

  // Recompute right away when the user returns to the tab, instead of
  // waiting up to a minute for the next tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function pickCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("unavailable");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSamples(null);
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, label: "Current location" });
        setLocating(false);
      },
      () => {
        setLocationError("failed");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60_000 },
    );
  }

  function pickHomeLocation() {
    setSamples(null);
    setLocation(homeLocation);
    setLocationError(null);
  }

  // Forecast is reused across the active session; the dose engine only
  // needs samples spanning sessionStart..now, and Open-Meteo returns a
  // multi-day hourly forecast that comfortably covers that.
  useEffect(() => {
    setForecastError(null);
    fetchOpenMeteoForecastClient(location.latitude, location.longitude)
      .then(setSamples)
      .catch((err) => setForecastError(err instanceof Error ? err.message : "Forecast unavailable."));
  }, [location.latitude, location.longitude]);

  // Live tick, at least once a minute, while a session is active.
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    fetchDbSessionHistory()
      .then((sessions) => {
        const last = sessions[0];
        if (!last) return;
        setLastSaved({ startedAt: last.startedAt, dose: last.cumulativeDoseSED.nominal.toFixed(1) });
      })
      .catch(() => {
        // ignore: this continuity note is best-effort only
      });
  }, []);

  const estimate = useMemo<DoseEstimate | null>(() => {
    if (!samples || !active) return null;
    return computeDoseEstimate({
      fitzpatrickType: active.setup.fitzpatrickType,
      latitude: active.location.latitude,
      longitude: active.location.longitude,
      surface: active.setup.surface,
      posture: active.setup.posture,
      hourlySamples: samples,
      sessionStart: active.startedAt,
      now,
      sunscreenApplications: active.applications,
      priorDoseTodaySED: active.priorDose,
    });
  }, [samples, active, now]);

  // The summary is recomputed from the stored session (not stored itself),
  // so it also works after a reload on the summary screen.
  const endedEstimate = useMemo<DoseEstimate | null>(() => {
    if (!samples || !ended) return null;
    return computeDoseEstimate({
      fitzpatrickType: ended.setup.fitzpatrickType,
      latitude: ended.location.latitude,
      longitude: ended.location.longitude,
      surface: ended.setup.surface,
      posture: ended.setup.posture,
      hourlySamples: samples,
      sessionStart: ended.startedAt,
      now: ended.endedAt,
      sunscreenApplications: ended.applications,
      priorDoseTodaySED: ended.priorDose,
    });
  }, [samples, ended]);

  // Only the most recent layer matters: once the user reapplies, the
  // reminder goes away even though older layers have worn off.
  const reapplyNeeded = useMemo(() => {
    const latest = active?.applications.at(-1);
    return latest ? shouldReapply(latest, now) : false;
  }, [active, now]);

  async function handleStart() {
    const startedAt = new Date();
    setStartError(null);
    setIsStarting(true);
    try {
      const sessionId = await createDbSession({
        startedAt,
        latitude: location.latitude,
        longitude: location.longitude,
        surface: setup.surface,
        posture: setup.posture,
        fitzpatrickType: setup.fitzpatrickType,
      });

      const applications: SunscreenApplication[] = [];
      const spfNumber = Number(setup.spf);
      if (setup.spf && Number.isFinite(spfNumber) && spfNumber > 0) {
        const application: SunscreenApplication = {
          appliedAt: startedAt,
          labeledSPF: spfNumber,
          appliedThicknessMgCm2: setup.thickness,
          wearCondition: "dry",
        };
        applications.push(application);
        await insertSunscreenApplicationRow(sessionId, application);
      }

      const priorDose = await fetchPriorDoseToday(startedAt);
      setActive({ id: sessionId, startedAt, setup, applications, note: "", priorDose, location });
      setNow(new Date());
      setPhase("active");
    } catch (error: unknown) {
      console.error("[v0] Failed to start session:", error);
      setStartError(m.session.startFailed);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleLogReapplication(condition: "dry" | "sweating" | "swimming" = "dry") {
    if (!active) return;
    const spfNumber = Number(addSpf || setup.spf || active.applications.at(-1)?.labeledSPF || 30);
    const application: SunscreenApplication = {
      appliedAt: new Date(),
      labeledSPF: Number.isFinite(spfNumber) && spfNumber > 0 ? spfNumber : 30,
      appliedThicknessMgCm2: addThickness,
      wearCondition: condition,
    };
    setActive({ ...active, applications: [...active.applications, application] });
    setAddingSunscreen(false);
    setAddSpf("");
    try {
      await insertSunscreenApplicationRow(active.id, application);
    } catch (error) {
      console.error("[v0] Failed to log sunscreen application:", error);
    }
  }

  function handleEnd() {
    if (!active) return;
    setEnded({ ...active, endedAt: new Date() });
    setActive(null);
    setPhase("ended");
  }

  async function handleSave() {
    if (!ended || !endedEstimate) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await endDbSession({
        sessionId: ended.id,
        startedAt: ended.startedAt,
        endedAt: ended.endedAt,
        surface: ended.setup.surface,
        posture: ended.setup.posture,
        fitzpatrickType: ended.setup.fitzpatrickType,
        estimate: endedEstimate,
        note: ended.note,
        location: ended.location,
        applications: ended.applications,
      });
      resetToIdle();
    } catch (error: unknown) {
      console.error("[v0] Failed to save session:", error);
      setSaveError(m.session.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  function resetToIdle() {
    setEnded(null);
    setPhase("idle");
  }

  if (phase === "ended" && ended && !endedEstimate) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
        <h1 className="text-lg font-semibold">{m.session.summaryTitle}</h1>
        {forecastError ? (
          <p className="rounded-[var(--radius)] border border-[var(--risk-medium)]/30 bg-[var(--risk-medium)]/10 p-3 text-sm text-[var(--foreground)]">
            {m.now.forecastUnavailable}. {m.session.keptOffline}
          </p>
        ) : (
          <div className="h-48 animate-pulse rounded-[var(--radius)] bg-[var(--border)]" />
        )}
      </main>
    );
  }

  if (phase === "ended" && ended && endedEstimate) {
    const budgetFraction =
      endedEstimate.medThresholdSED.nominal > 0
        ? endedEstimate.remainingBudgetSED.nominal / endedEstimate.medThresholdSED.nominal
        : 0;
    const durationMin = Math.round((ended.endedAt.getTime() - ended.startedAt.getTime()) / 60_000);
    const overBudget = budgetFraction <= 0;

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
        <h1 className="text-lg font-semibold">{m.session.summaryTitle}</h1>
        <div className="glass-panel-solid flex flex-col gap-4 rounded-[calc(var(--radius)+6px)] p-6">
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>{m.session.duration}</span>
            <span className="hero-number font-semibold text-[var(--foreground)]">{duration(durationMin)}</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>{m.session.thisSession}</span>
            <UncertaintyRange
              low={endedEstimate.sessionDoseSED.low}
              nominal={endedEstimate.sessionDoseSED.nominal}
              high={endedEstimate.sessionDoseSED.high}
              unit="SED"
              size="sm"
            />
          </div>
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>{m.session.todaySoFar}</span>
            <UncertaintyRange
              low={endedEstimate.cumulativeDoseSED.low}
              nominal={endedEstimate.cumulativeDoseSED.nominal}
              high={endedEstimate.cumulativeDoseSED.high}
              unit="SED"
              size="sm"
            />
          </div>
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>{m.session.budgetLeftToday}</span>
            <UncertaintyRange
              low={endedEstimate.remainingBudgetSED.low}
              nominal={endedEstimate.remainingBudgetSED.nominal}
              high={endedEstimate.remainingBudgetSED.high}
              unit="SED"
              size="sm"
            />
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            {overBudget ? m.session.overBudget : m.session.underBudget}
          </p>
        </div>

        <WorkExposureCard
          share={fractionOfDailyLimit(sumIntervals(priorWorkDose, endedEstimate.sessionIncidentDoseSED))}
        />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">{m.session.note}</span>
          <textarea
            value={ended.note}
            onChange={(e) => setEnded({ ...ended, note: e.target.value })}
            placeholder={m.session.notePlaceholder}
            rows={3}
            className="glass-panel-solid rounded-[var(--radius)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
        </label>

        {saveError && (
          <p className="rounded-[var(--radius)] border border-[var(--risk-high)]/30 bg-[var(--risk-high)]/10 p-3 text-sm text-[var(--foreground)]">
            {saveError}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" size="session" className="flex-1" onClick={resetToIdle} disabled={isSaving}>
            {m.session.discard}
          </Button>
          <Button
            variant="glass"
            size="session"
            className="glass-cta flex-1"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? m.common.saving : m.common.save}
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "active" && active) {
    const budgetFraction = estimate ? budgetFractionLeft(estimate) : 0;
    const risk = estimate ? riskFromEstimate(estimate).level : "low";
    const elapsedMin = Math.round((now.getTime() - active.startedAt.getTime()) / 60_000);
    const uvNow = estimate?.minuteSeries.at(-1)?.ambientUvIndex;
    const currentSpf = active.applications.length > 0 ? activeSPFAtTime(active.applications, now) : null;

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-6 py-8 pb-28">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {m.session.elapsed}
            </p>
            <p className="hero-number text-3xl font-semibold">{duration(elapsedMin)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <MapPin className="size-3" aria-hidden="true" />
              {displayLabel(active.location.label)}
            </p>
          </div>
          <Button
            variant="destructive"
            size="session"
            onClick={handleEnd}
            className="bg-[var(--risk-high)] text-white hover:bg-[var(--risk-high)]/90"
          >
            {m.session.end}
          </Button>
        </header>

        <SessionAlerts
          sessionId={active.id}
          inputs={{
            budgetFractionLeft: estimate ? budgetFraction : null,
            reapplyDue: reapplyNeeded,
            applicationCount: active.applications.length,
            workShare: estimate
              ? fractionOfDailyLimit(sumIntervals(priorWorkDose, estimate.sessionIncidentDoseSED)).nominal
              : null,
          }}
        />

        {elapsedMin >= LONG_SESSION_MINUTES && (
          <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <Clock className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
            <p className="text-sm text-[var(--foreground)]">
              {t(m.session.longSession, { time: duration(elapsedMin) })}
            </p>
          </div>
        )}

        {reapplyNeeded && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--risk-medium)]/30 bg-[var(--risk-medium)]/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--risk-medium)]" aria-hidden="true" />
              <p className="text-sm text-[var(--foreground)]">
                {m.session.reapply}
              </p>
            </div>
            <Button
              variant="glass"
              size="sm"
              className="glass-cta shrink-0"
              onClick={() => handleLogReapplication("dry")}
            >
              {m.session.log}
            </Button>
          </div>
        )}

        {estimate && (
          <div className="glass-panel flex flex-col items-center gap-5 rounded-[calc(var(--radius)+10px)] px-6 py-6">
            <BurnTimeHeadline estimate={estimate} lead={m.now.leadStaying} now={now} uvNow={uvNow} />
            <RadialGaugeShell title={m.session.budgetTitle} fraction={budgetFraction} riskLevel={risk} size={168}>
              <span className="hero-number text-4xl font-semibold text-[var(--foreground)]">
                {Math.round(budgetFraction * 100)}%
              </span>
              <span className="hero-number text-xs text-[var(--muted-foreground)]">
                {estimate.remainingBudgetSED.nominal.toFixed(1)} SED
              </span>
            </RadialGaugeShell>
          </div>
        )}

        {estimate && (
          <WorkExposureCard share={fractionOfDailyLimit(sumIntervals(priorWorkDose, estimate.sessionIncidentDoseSED))} />
        )}

        <div className="glass-panel-solid flex items-center justify-between rounded-[var(--radius)] p-4 text-sm">
          <span className="text-[var(--muted-foreground)]">{m.session.sunscreen}</span>
          <span className="font-medium">
            {currentSpf ? t(m.session.effectiveSpf, { spf: currentSpf.toFixed(0) }) : m.session.noneLogged}
          </span>
        </div>

        {addingSunscreen ? (
          <div className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{m.session.spf}</span>
              <input
                type="number"
                min={1}
                value={addSpf}
                onChange={(e) => setAddSpf(e.target.value)}
                placeholder="30"
                className="glass-panel-solid h-10 rounded-[var(--radius)] px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </label>
            <fieldset className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{m.session.thickness}</span>
              <div className="flex flex-wrap gap-2">
                {THICKNESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAddThickness(opt.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      addThickness === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {m.session[opt.key]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddingSunscreen(false)}>
                {m.common.cancel}
              </Button>
              <Button
                variant="glass"
                className="glass-cta flex-1"
                onClick={() => handleLogReapplication("dry")}
              >
                {m.session.add}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAddingSunscreen(true)} className="gap-1.5">
            <Plus className="size-4" data-icon="inline-start" aria-hidden="true" />
            {m.session.addSunscreen}
          </Button>
        )}

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--muted-foreground)]">{m.session.note}</span>
          <textarea
            value={active.note}
            onChange={(e) => setActive({ ...active, note: e.target.value })}
            placeholder={m.session.notePlaceholder}
            rows={2}
            className="glass-panel-solid rounded-[var(--radius)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
        </label>
      </main>
    );
  }

  // Idle: setup step lives inline on the same screen, not a separate wizard.
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
      <div>
        <h1 className="text-lg font-semibold">{m.session.title}</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{m.session.intro}</p>
      </div>

      {forecastError && (
        <p className="rounded-[var(--radius)] border border-[var(--risk-medium)]/30 bg-[var(--risk-medium)]/10 p-3 text-sm text-[var(--foreground)]">
          {m.now.forecastUnavailable}. {m.now.tryAgain}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{m.session.location}</legend>
        <div className="glass-panel-solid flex items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <MapPin className="size-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
            <span className="truncate">{displayLabel(location.label)}</span>
          </span>
          {location.label === "Current location" ? (
            <Button type="button" variant="outline" size="sm" onClick={pickHomeLocation}>
              {m.session.useHome}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={pickCurrentLocation} disabled={locating} className="gap-1.5">
              <LocateFixed className="size-3.5" aria-hidden="true" />
              {locating ? m.common.locating : m.session.useHere}
            </Button>
          )}
        </div>
        {locationError && (
          <p className="text-xs text-[var(--risk-medium)]">
            {locationError === "unavailable" ? m.session.locUnavailable : m.session.locFailedHome}
          </p>
        )}
        <p className="text-xs text-[var(--muted-foreground)]">
          {m.session.awayHint}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{m.session.skinType}</legend>
        <select
          value={setup.fitzpatrickType}
          onChange={(e) => setSetup({ ...setup, fitzpatrickType: e.target.value as FitzpatrickType })}
          className="glass-panel-solid h-11 w-full min-w-0 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {SKIN_KEYS.map((key) => (
            <option key={key} value={key}>
              {m.skin.full[key]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{m.session.surface}</legend>
        <select
          value={setup.surface}
          onChange={(e) => setSetup({ ...setup, surface: e.target.value as SurfaceType })}
          className="glass-panel-solid h-11 w-full min-w-0 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {SURFACE_KEYS.map((key) => (
            <option key={key} value={key}>
              {m.surface[key]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{m.session.posture}</legend>
        <div className="flex gap-2">
          {POSTURE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSetup({ ...setup, posture: opt })}
              className={`flex-1 rounded-[var(--radius)] border px-3 py-2.5 text-sm font-medium ${
                setup.posture === opt
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {m.posture[opt]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{m.session.sunscreenOptional}</legend>
        <input
          type="number"
          min={1}
          value={setup.spf}
          onChange={(e) => setSetup({ ...setup, spf: e.target.value })}
          placeholder={m.session.spfPlaceholder}
          className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        {setup.spf && (
          <div className="flex flex-wrap gap-2">
            {THICKNESS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSetup({ ...setup, thickness: opt.value })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  setup.thickness === opt.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {m.session[opt.key]}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {startError && (
        <p className="rounded-[var(--radius)] border border-[var(--risk-high)]/30 bg-[var(--risk-high)]/10 p-3 text-sm text-[var(--foreground)]">
          {startError}
        </p>
      )}

      <Button
        variant="glass"
        size="session"
        onClick={handleStart}
        disabled={!samples || isStarting}
        className="glass-cta mt-2"
      >
        {isStarting ? m.session.starting : samples ? m.session.start : m.session.loadingForecast}
      </Button>

      {lastSaved && (
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          {t(m.session.lastSession, {
            date: formatDate(new Date(lastSaved.startedAt), { month: "short", day: "numeric" }),
            dose: lastSaved.dose,
          })}
        </p>
      )}
    </main>
  );
}
