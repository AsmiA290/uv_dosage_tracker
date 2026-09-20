"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { computeDoseEstimate } from "@/lib/dose/dose";
import { activeSPFAtTime, shouldReapply } from "@/lib/dose/sunscreen";
import { FITZPATRICK_LABELS, SURFACE_ALBEDO } from "@/lib/dose/constants";
import { fetchOpenMeteoForecastClient } from "@/lib/weather/client";
import type {
  DoseEstimate,
  FitzpatrickType,
  HourlyUVSample,
  PostureType,
  SunscreenApplication,
  SurfaceType,
} from "@/lib/dose/types";
import { createDbSession, endDbSession, insertSunscreenApplicationRow } from "@/lib/supabase/sessions";
import { Button } from "@/components/ui/button";
import { RadialGaugeShell } from "@/components/ui/radial-gauge-shell";
import { UncertaintyRange } from "@/components/ui/uncertainty-range";
import type { RiskLevel } from "@/components/ui/stat-tile";

const DEFAULT_LAT = 39.78;
const DEFAULT_LON = -89.65;

const THICKNESS_OPTIONS = [
  { label: "Light dab", value: 0.5 },
  { label: "Standard layer", value: 1.0 },
  { label: "Thick, visible layer", value: 2.0 },
] as const;

const SURFACE_OPTIONS = Object.entries(SURFACE_ALBEDO) as [SurfaceType, { label: string }][];
const POSTURE_OPTIONS: { value: PostureType; label: string }[] = [
  { value: "standing", label: "Standing" },
  { value: "sitting", label: "Sitting" },
  { value: "activeSport", label: "Active sport" },
];

type SetupState = {
  fitzpatrickType: FitzpatrickType;
  surface: SurfaceType;
  posture: PostureType;
  spf: string;
  thickness: number;
};

type ActiveSession = {
  id: string;
  startedAt: Date;
  setup: SetupState;
  applications: SunscreenApplication[];
  note: string;
};

type EndedSession = ActiveSession & { endedAt: Date; estimate: DoseEstimate };

function riskFromFraction(fraction: number): RiskLevel {
  if (fraction > 0.5) return "low";
  if (fraction > 0.2) return "medium";
  return "high";
}

export default function SessionPage() {
  const [phase, setPhase] = useState<"idle" | "active" | "ended">("idle");
  const [samples, setSamples] = useState<HourlyUVSample[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [ended, setEnded] = useState<EndedSession | null>(null);
  const [lastSavedSummary, setLastSavedSummary] = useState<string | null>(null);

  const [setup, setSetup] = useState<SetupState>({
    fitzpatrickType: "II",
    surface: "grass",
    posture: "standing",
    spf: "",
    thickness: 1.0,
  });
  const [addingSunscreen, setAddingSunscreen] = useState(false);
  const [addSpf, setAddSpf] = useState("");
  const [addThickness, setAddThickness] = useState(1.0);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch once on mount — forecast is reused across the active session; the
  // dose engine only needs samples spanning sessionStart..now, and Open-Meteo
  // returns a multi-day hourly forecast that comfortably covers that.
  useEffect(() => {
    fetchOpenMeteoForecastClient(DEFAULT_LAT, DEFAULT_LON)
      .then(setSamples)
      .catch((err) => setForecastError(err instanceof Error ? err.message : "Forecast unavailable."));
  }, []);

  // Live tick, at least once a minute, while a session is active.
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("uv-dose-tracker:sessions");
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.length > 0) {
        const last = list[0];
        const dose = last.cumulativeDoseSED?.nominal?.toFixed?.(1) ?? "—";
        const date = new Date(last.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        setLastSavedSummary(`Last session: ${date} · ${dose} SED`);
      }
    } catch {
      // ignore — continuity note is best-effort only
    }
  }, []);

  const estimate = useMemo<DoseEstimate | null>(() => {
    if (!samples || !active) return null;
    return computeDoseEstimate({
      fitzpatrickType: active.setup.fitzpatrickType,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      surface: active.setup.surface,
      posture: active.setup.posture,
      hourlySamples: samples,
      sessionStart: active.startedAt,
      now,
      sunscreenApplications: active.applications,
    });
  }, [samples, active, now]);

  const reapplyNeeded = useMemo(() => {
    if (!active || active.applications.length === 0) return false;
    return active.applications.some((a) => shouldReapply(a, now));
  }, [active, now]);

  async function handleStart() {
    const startedAt = new Date();
    setStartError(null);
    setIsStarting(true);
    try {
      const sessionId = await createDbSession({
        startedAt,
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LON,
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

      setActive({ id: sessionId, startedAt, setup, applications, note: "" });
      setNow(new Date());
      setPhase("active");
    } catch (error: unknown) {
      console.error("[v0] Failed to start session:", error);
      setStartError(error instanceof Error ? error.message : "Could not start session. Please try again.");
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
    if (!active || !estimate) return;
    setEnded({ ...active, endedAt: new Date(), estimate });
    setActive(null);
    setPhase("ended");
  }

  async function handleSave() {
    if (!ended) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await endDbSession({
        sessionId: ended.id,
        endedAt: ended.endedAt,
        estimate: ended.estimate,
        note: ended.note,
      });
      resetToIdle();
    } catch (error: unknown) {
      console.error("[v0] Failed to save session:", error);
      setSaveError(error instanceof Error ? error.message : "Could not save session. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetToIdle() {
    setEnded(null);
    setPhase("idle");
  }

  if (phase === "ended" && ended) {
    const budgetFraction =
      ended.estimate.medThresholdSED.nominal > 0
        ? ended.estimate.remainingBudgetSED.nominal / ended.estimate.medThresholdSED.nominal
        : 0;
    const durationMin = Math.round((ended.endedAt.getTime() - ended.startedAt.getTime()) / 60_000);
    const overBudget = budgetFraction <= 0;

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
        <h1 className="text-lg font-semibold">Session summary</h1>
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>Duration</span>
            <span className="hero-number font-semibold text-[var(--foreground)]">{durationMin} min</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>Total dose</span>
            <UncertaintyRange
              low={ended.estimate.cumulativeDoseSED.low}
              nominal={ended.estimate.cumulativeDoseSED.nominal}
              high={ended.estimate.cumulativeDoseSED.high}
              unit="SED"
              size="sm"
            />
          </div>
          <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
            <span>Budget headroom left</span>
            <UncertaintyRange
              low={ended.estimate.remainingBudgetSED.low}
              nominal={ended.estimate.remainingBudgetSED.nominal}
              high={ended.estimate.remainingBudgetSED.high}
              unit="SED"
              size="sm"
            />
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            {overBudget
              ? "This session used more of your estimated daily budget than usual."
              : "This session stayed within your estimated daily budget."}
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Note (optional)</span>
          <textarea
            value={ended.note}
            onChange={(e) => setEnded({ ...ended, note: e.target.value })}
            placeholder="e.g. practice moved indoors at 3:40"
            rows={3}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
        </label>

        {saveError && (
          <p className="rounded-[var(--radius)] border border-[var(--risk-high)]/30 bg-[var(--risk-high)]/10 p-3 text-sm text-[var(--foreground)]">
            {saveError}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" size="session" className="flex-1" onClick={resetToIdle} disabled={isSaving}>
            Discard
          </Button>
          <Button
            size="session"
            className="flex-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "active" && active) {
    const budgetFraction =
      estimate && estimate.medThresholdSED.nominal > 0
        ? estimate.remainingBudgetSED.nominal / estimate.medThresholdSED.nominal
        : 0;
    const risk = riskFromFraction(budgetFraction);
    const elapsedMin = Math.round((now.getTime() - active.startedAt.getTime()) / 60_000);
    const hasTimeToThreshold =
      estimate &&
      Number.isFinite(estimate.timeToThreshold.p10Minutes) &&
      Number.isFinite(estimate.timeToThreshold.p90Minutes);
    const currentSpf = active.applications.length > 0 ? activeSPFAtTime(active.applications, now) : null;

    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-6 py-8 pb-28">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Elapsed
            </p>
            <p className="hero-number text-3xl font-semibold">{elapsedMin} min</p>
          </div>
          <Button
            variant="destructive"
            size="session"
            onClick={handleEnd}
            className="bg-[var(--risk-high)] text-white hover:bg-[var(--risk-high)]/90"
          >
            End Session
          </Button>
        </header>

        {reapplyNeeded && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--risk-medium)]/30 bg-[var(--risk-medium)]/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--risk-medium)]" aria-hidden="true" />
              <p className="text-sm text-[var(--foreground)]">
                Reapply sunscreen — protection has dropped below half its labeled SPF.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90"
              onClick={() => handleLogReapplication("dry")}
            >
              Log
            </Button>
          </div>
        )}

        {estimate && (
          <div className="flex flex-col items-center py-2">
            <RadialGaugeShell title="Remaining budget" fraction={budgetFraction} riskLevel={risk} size={200}>
              <span className="hero-number text-4xl font-semibold text-[var(--foreground)]">
                {estimate.remainingBudgetSED.nominal.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">SED left</span>
            </RadialGaugeShell>
            <p className="mt-4 text-center text-base">
              You will likely reach your burn threshold in{" "}
              <strong className="hero-number">
                {hasTimeToThreshold
                  ? `${Math.round(estimate.timeToThreshold.p10Minutes)}–${Math.round(estimate.timeToThreshold.p90Minutes)} min`
                  : "—"}
              </strong>
            </p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <span className="text-[var(--muted-foreground)]">Sunscreen</span>
          <span className="font-medium">
            {currentSpf ? `Effective SPF ~${currentSpf.toFixed(0)}` : "None logged"}
          </span>
        </div>

        {addingSunscreen ? (
          <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">SPF</span>
              <input
                type="number"
                min={1}
                value={addSpf}
                onChange={(e) => setAddSpf(e.target.value)}
                placeholder="30"
                className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </label>
            <fieldset className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Thickness</span>
              <div className="flex flex-wrap gap-2">
                {THICKNESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setAddThickness(opt.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      addThickness === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddingSunscreen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90"
                onClick={() => handleLogReapplication("dry")}
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAddingSunscreen(true)} className="gap-1.5">
            <Plus className="size-4" data-icon="inline-start" aria-hidden="true" />
            Add sunscreen application
          </Button>
        )}

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--muted-foreground)]">Note (optional)</span>
          <textarea
            value={active.note}
            onChange={(e) => setActive({ ...active, note: e.target.value })}
            placeholder="e.g. practice moved indoors at 3:40"
            rows={2}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />
        </label>
      </main>
    );
  }

  // Idle: setup step lives inline on the same screen, not a separate wizard.
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
      <div>
        <h1 className="text-lg font-semibold">Session</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Sessions are explicit start/stop — this app doesn&apos;t track location in the background, the same
          way a coach or crew lead already thinks about a shift or practice.
        </p>
      </div>

      {forecastError && (
        <p className="rounded-[var(--radius)] border border-[var(--risk-medium)]/30 bg-[var(--risk-medium)]/10 p-3 text-sm text-[var(--foreground)]">
          {forecastError}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Skin type</legend>
        <select
          value={setup.fitzpatrickType}
          onChange={(e) => setSetup({ ...setup, fitzpatrickType: e.target.value as FitzpatrickType })}
          className="h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {Object.entries(FITZPATRICK_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Ground surface</legend>
        <select
          value={setup.surface}
          onChange={(e) => setSetup({ ...setup, surface: e.target.value as SurfaceType })}
          className="h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {SURFACE_OPTIONS.map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Posture</legend>
        <div className="flex gap-2">
          {POSTURE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSetup({ ...setup, posture: opt.value })}
              className={`flex-1 rounded-[var(--radius)] border px-3 py-2.5 text-sm font-medium ${
                setup.posture === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Sunscreen (optional)</legend>
        <input
          type="number"
          min={1}
          value={setup.spf}
          onChange={(e) => setSetup({ ...setup, spf: e.target.value })}
          placeholder="SPF, e.g. 30"
          className="h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        {setup.spf && (
          <div className="flex flex-wrap gap-2">
            {THICKNESS_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSetup({ ...setup, thickness: opt.value })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  setup.thickness === opt.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {opt.label}
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
        size="session"
        onClick={handleStart}
        disabled={!samples || isStarting}
        className="mt-2 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90"
      >
        {isStarting ? "Starting…" : samples ? "Start Session" : "Loading forecast…"}
      </Button>

      {lastSavedSummary && (
        <p className="text-center text-sm text-[var(--muted-foreground)]">{lastSavedSummary}</p>
      )}
    </main>
  );
}
