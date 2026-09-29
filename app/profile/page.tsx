"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LocateFixed } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FITZPATRICK_LABELS, SURFACE_ALBEDO } from "@/lib/dose/constants";
import { fetchProfile, saveProfile } from "@/lib/supabase/profile";
import type { FitzpatrickType, PostureType, SurfaceType } from "@/lib/dose/types";

const SURFACE_OPTIONS = Object.entries(SURFACE_ALBEDO) as [SurfaceType, { label: string }][];
const POSTURE_OPTIONS: { value: PostureType; label: string }[] = [
  { value: "standing", label: "Standing" },
  { value: "sitting", label: "Sitting" },
  { value: "activeSport", label: "Active sport" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [fitzpatrickType, setFitzpatrickType] = useState<FitzpatrickType>("II");
  const [homeLabel, setHomeLabel] = useState("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLon, setHomeLon] = useState<number | null>(null);
  const [surface, setSurface] = useState<SurfaceType>("grass");
  const [posture, setPosture] = useState<PostureType>("standing");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        if (!profile) return;
        if (profile.fitzpatrickType) setFitzpatrickType(profile.fitzpatrickType);
        if (profile.homeLabel) setHomeLabel(profile.homeLabel);
        if (profile.homeLat !== null) setHomeLat(profile.homeLat);
        if (profile.homeLon !== null) setHomeLon(profile.homeLon);
        if (profile.defaultSurface) setSurface(profile.defaultSurface);
        if (profile.defaultPosture) setPosture(profile.defaultPosture);
      })
      .catch((error) => console.error("[v0] Failed to load profile:", error))
      .finally(() => setIsLoading(false));
  }, []);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeLat(position.coords.latitude);
        setHomeLon(position.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocationError("Couldn't get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveProfile({
        fitzpatrickType,
        homeLabel: homeLabel.trim() || undefined,
        homeLat: homeLat ?? undefined,
        homeLon: homeLon ?? undefined,
        defaultSurface: surface,
        defaultPosture: posture,
      });
      setSavedAt(Date.now());
      router.refresh();
    } catch (error) {
      console.error("[v0] Failed to save profile:", error);
      setSaveError(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
        <div className="h-48 animate-pulse rounded-[var(--radius)] bg-[var(--border)]" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
      <header className="flex items-center gap-3">
        <Link
          href="/methods"
          aria-label="Back to Methods"
          className="glass-pill flex size-9 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
      </header>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Skin type</legend>
        <select
          value={fitzpatrickType}
          onChange={(e) => setFitzpatrickType(e.target.value as FitzpatrickType)}
          className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {Object.entries(FITZPATRICK_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Home location</legend>
        <input
          type="text"
          value={homeLabel}
          onChange={(e) => setHomeLabel(e.target.value)}
          placeholder="e.g. Springfield, IL"
          className="glass-panel-solid h-11 rounded-[var(--radius)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating} className="gap-2">
          <LocateFixed className="size-4" aria-hidden="true" />
          {locating ? "Locating…" : "Use my current location"}
        </Button>
        {locationError && <p className="text-xs text-[var(--risk-medium)]">{locationError}</p>}
        {homeLat !== null && homeLon !== null && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Saved coordinates: {homeLat.toFixed(3)}, {homeLon.toFixed(3)}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Default ground surface</legend>
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
        <legend className="text-sm font-medium">Default posture</legend>
        <div className="flex gap-2">
          {POSTURE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPosture(opt.value)}
              className={`flex-1 rounded-[var(--radius)] border px-3 py-2.5 text-sm font-medium ${
                posture === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {saveError && (
        <p className="rounded-[var(--radius)] border border-[var(--risk-high)]/30 bg-[var(--risk-high)]/10 p-3 text-sm text-[var(--foreground)]">
          {saveError}
        </p>
      )}

      <Button variant="glass" size="session" className="glass-cta" onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving…" : savedAt ? "Saved" : "Save changes"}
      </Button>
    </main>
  );
}
