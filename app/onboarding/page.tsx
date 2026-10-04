"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Sun, Timer, LineChart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FITZPATRICK_LABELS, SURFACE_ALBEDO } from "@/lib/dose/constants";
import { saveProfile } from "@/lib/supabase/profile";
import type { FitzpatrickType, PostureType, SurfaceType } from "@/lib/dose/types";

const SURFACE_OPTIONS = Object.entries(SURFACE_ALBEDO) as [SurfaceType, { label: string }][];
const POSTURE_OPTIONS: { value: PostureType; label: string; hint: string }[] = [
  { value: "standing", label: "Standing", hint: "e.g. fieldwork, coaching, standing shifts" },
  { value: "sitting", label: "Sitting", hint: "e.g. driving, sideline bench, desk outdoors" },
  { value: "activeSport", label: "Active sport", hint: "e.g. running, cycling, practice drills" },
];

// Springfield, IL — a reasonable central-Illinois default if the user
// declines location access. They can always change this later from Profile.
const FALLBACK_LAT = 39.78;
const FALLBACK_LON = -89.65;
const FALLBACK_LABEL = "Springfield, IL";

const STEPS = ["Welcome", "Skin type", "Location", "Defaults"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fitzpatrickType, setFitzpatrickType] = useState<FitzpatrickType>("II");
  const [homeLabel, setHomeLabel] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLon, setHomeLon] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [surface, setSurface] = useState<SurfaceType>("grass");
  const [posture, setPosture] = useState<PostureType>("standing");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Location isn't available in this browser. Enter a place name instead.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeLat(position.coords.latitude);
        setHomeLon(position.coords.longitude);
        if (!homeLabel) setHomeLabel("Current location");
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location. Enter a place name and use the default instead.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function handleFinish() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveProfile({
        fitzpatrickType,
        homeLat: homeLat ?? FALLBACK_LAT,
        homeLon: homeLon ?? FALLBACK_LON,
        homeLabel: homeLabel.trim() || FALLBACK_LABEL,
        defaultSurface: surface,
        defaultPosture: posture,
        markOnboarded: true,
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("[v0] Failed to save onboarding profile:", error);
      setSaveError(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 15% -10%, color-mix(in srgb, #7dd3fc 22%, transparent) 0%, transparent 60%), radial-gradient(100% 55% at 100% 0%, color-mix(in srgb, #fde68a 18%, transparent) 0%, transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        {step === 0 && (
          <div className="glass-panel flex flex-1 flex-col justify-center gap-6 rounded-[calc(var(--radius)+10px)] p-7">
            <span className="glass-pill flex size-14 items-center justify-center self-start rounded-full">
              <Sun className="size-7 text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Welcome to UV Dose Tracker</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                This app estimates how much UV radiation your skin has absorbed during a session outdoors, using
                the forecast, your skin type, and what you're standing on. A few quick questions first, so every
                estimate is personal to you.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <Timer className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <p>
                  <strong className="font-medium">SED</strong> (Standard Erythema Dose) is the unit this app uses
                  to measure how much UV your skin has absorbed. Think of it like a running total.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <LineChart className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <p>
                  <strong className="font-medium">MED</strong> (Minimal Erythema Dose) is your estimated sunburn
                  threshold, in SED, based on your skin type. The app shows how much budget you have left before
                  reaching it.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <p>Every number and source is listed on the Methods tab, any time you want the details.</p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="glass-panel flex flex-1 flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <div>
              <h1 className="text-xl font-semibold">What's your skin type?</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                This sets your personal sunburn threshold. Pick the description closest to how your skin
                typically reacts to sun, based on the well-established Fitzpatrick scale.
              </p>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Skin type</legend>
              {(Object.keys(FITZPATRICK_LABELS) as FitzpatrickType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFitzpatrickType(key)}
                  aria-pressed={fitzpatrickType === key}
                  className={`rounded-[var(--radius)] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    fitzpatrickType === key
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground)]"
                  }`}
                >
                  {FITZPATRICK_LABELS[key]}
                </button>
              ))}
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="glass-panel flex flex-1 flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <div>
              <h1 className="text-xl font-semibold">Where are you usually outdoors?</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Used to pull the local UV forecast and sun position. You can change this any time from Profile.
              </p>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Place name</span>
              <input
                type="text"
                value={homeLabel}
                onChange={(e) => setHomeLabel(e.target.value)}
                placeholder={FALLBACK_LABEL}
                className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </label>
            <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating} className="gap-2">
              <LocateFixed className="size-4" aria-hidden="true" />
              {locating ? "Locating…" : homeLat !== null ? "Location saved" : "Use my current location"}
            </Button>
            {locationError && <p className="text-xs text-[var(--risk-medium)]">{locationError}</p>}
            <p className="text-xs text-[var(--muted-foreground)]">
              Prefer not to share it? Leave this as-is and we'll use a central-Illinois default (
              {FALLBACK_LABEL}) that you can correct later.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel flex flex-1 flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <div>
              <h1 className="text-xl font-semibold">Your usual conditions</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                These become your defaults for a new session, and you can still change them each time.
              </p>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Ground surface</legend>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value as SurfaceType)}
                className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {SURFACE_OPTIONS.map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Typical posture</legend>
              <div className="flex flex-col gap-2">
                {POSTURE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPosture(opt.value)}
                    aria-pressed={posture === opt.value}
                    className={`rounded-[var(--radius)] border px-4 py-2.5 text-left text-sm transition-colors ${
                      posture === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground)]"
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {saveError && <p className="text-sm text-[var(--risk-high)]">{saveError}</p>}
          </div>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)} disabled={isSaving}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              variant="glass"
              className="glass-cta flex-1"
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button variant="glass" className="glass-cta flex-1" onClick={handleFinish} disabled={isSaving}>
              {isSaving ? "Saving…" : "Finish"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
