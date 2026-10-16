"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, LocateFixed, Sun, Timer, LineChart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FITZPATRICK_LABELS, SURFACE_ALBEDO } from "@/lib/dose/constants";
import { saveProfile } from "@/lib/local/profile";
import { LanguagePicker } from "@/components/language-picker";
import { useI18n } from "@/lib/i18n/provider";
import type { FitzpatrickType, PostureType, SurfaceType } from "@/lib/dose/types";

const SURFACE_KEYS = Object.keys(SURFACE_ALBEDO) as SurfaceType[];
const POSTURE_OPTIONS = [
  { value: "standing", hint: "hintStanding" },
  { value: "sitting", hint: "hintSitting" },
  { value: "activeSport", hint: "hintActive" },
] as const satisfies readonly { value: PostureType; hint: string }[];

// Springfield, IL — a reasonable central-Illinois default if the user
// declines location access. They can always change this later from Profile.
const FALLBACK_LAT = 39.78;
const FALLBACK_LON = -89.65;
const FALLBACK_LABEL = "Springfield, IL";

const STEPS = ["language", "welcome", "skin", "location", "defaults"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { m, t, rich } = useI18n();
  const [step, setStep] = useState(0);
  const [fitzpatrickType, setFitzpatrickType] = useState<FitzpatrickType | null>(null);
  const [homeLabel, setHomeLabel] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLon, setHomeLon] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<"unavailable" | "failed" | null>(null);
  const [surface, setSurface] = useState<SurfaceType>("grass");
  const [posture, setPosture] = useState<PostureType>("standing");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("unavailable");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeLat(position.coords.latitude);
        setHomeLon(position.coords.longitude);
        if (!homeLabel) setHomeLabel(m.common.currentLocation);
        setLocating(false);
      },
      () => {
        setLocationError("failed");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function handleFinish() {
    if (!fitzpatrickType) return;
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
      setSaveError(m.onboarding.saveError);
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
          <div className="glass-panel flex flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <span className="glass-pill flex size-14 items-center justify-center self-start rounded-full">
              <Languages className="size-7 text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">{m.language.title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{m.language.body}</p>
            </div>
            <LanguagePicker />
          </div>
        )}

        {step === 1 && (
          <div className="glass-panel flex flex-col gap-6 rounded-[calc(var(--radius)+10px)] p-7">
            <span className="glass-pill flex size-14 items-center justify-center self-start rounded-full">
              <Sun className="size-7 text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">{m.onboarding.welcomeTitle}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{m.onboarding.welcomeBody}</p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <Timer className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <p>{rich(m.onboarding.sedExplain, { term: <strong className="font-medium">SED</strong> })}</p>
              </div>
              <div className="flex items-start gap-3">
                <LineChart className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <p>{rich(m.onboarding.medExplain, { term: <strong className="font-medium">MED</strong> })}</p>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <p>{m.onboarding.methodsNote}</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-panel flex flex-1 flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <div>
              <h1 className="text-xl font-semibold">{m.onboarding.skinTitle}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{m.onboarding.skinBody}</p>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{m.session.skinType}</legend>
              {(Object.keys(FITZPATRICK_LABELS) as FitzpatrickType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFitzpatrickType(key)}
                  aria-pressed={fitzpatrickType === key}
                  className={`rounded-[var(--radius)] border px-4 py-3 text-start text-sm font-medium transition-colors ${
                    fitzpatrickType === key
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--foreground)]"
                  }`}
                >
                  {m.skin.full[key]}
                </button>
              ))}
            </fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel flex flex-1 flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <div>
              <h1 className="text-xl font-semibold">{m.onboarding.locTitle}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{m.onboarding.locBody}</p>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">{m.onboarding.placeName}</span>
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
              {locating ? m.common.locating : homeLat !== null ? m.onboarding.locSaved : m.onboarding.useMyLocation}
            </Button>
            {locationError && (
              <p className="text-xs text-[var(--risk-medium)]">
                {locationError === "unavailable" ? m.onboarding.locUnavailable : m.onboarding.locFailed}
              </p>
            )}
            <p className="text-xs text-[var(--muted-foreground)]">{t(m.onboarding.locDefault, { place: FALLBACK_LABEL })}</p>
          </div>
        )}

        {step === 4 && (
          <div className="glass-panel flex flex-1 flex-col gap-5 rounded-[calc(var(--radius)+10px)] p-7">
            <div>
              <h1 className="text-xl font-semibold">{m.onboarding.defaultsTitle}</h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{m.onboarding.defaultsBody}</p>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">{m.onboarding.surface}</legend>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value as SurfaceType)}
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
              <legend className="text-sm font-medium">{m.onboarding.posture}</legend>
              <div className="flex flex-col gap-2">
                {POSTURE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPosture(opt.value)}
                    aria-pressed={posture === opt.value}
                    className={`rounded-[var(--radius)] border px-4 py-2.5 text-start text-sm transition-colors ${
                      posture === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground)]"
                    }`}
                  >
                    <span className="font-medium">{m.posture[opt.value]}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">{m.posture[opt.hint]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {saveError && <p className="text-sm text-[var(--risk-high)]">{saveError}</p>}
          </div>
        )}

        <div className="mt-auto flex gap-3">
          {step > 0 && (
            <Button variant="outline" size="session" className="flex-1" onClick={() => setStep((s) => s - 1)} disabled={isSaving}>
              {m.common.back}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              variant="glass"
              size="session"
              className="glass-cta flex-1"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && !fitzpatrickType}
            >
              {m.onboarding.continue}
            </Button>
          ) : (
            <Button
              variant="glass"
              size="session"
              className="glass-cta flex-1"
              onClick={handleFinish}
              disabled={isSaving || !fitzpatrickType}
            >
              {isSaving ? m.common.saving : m.onboarding.finish}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
