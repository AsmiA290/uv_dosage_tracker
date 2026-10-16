"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { interpolateHourlyToMinutes } from "@/lib/dose/irradiance";
import type { HourlyUVSample } from "@/lib/dose/types";
import { uvCategoryKey } from "@/lib/risk";
import { useI18n } from "@/lib/i18n/provider";
import { sunPath, sunState } from "@/lib/sky/sun-geometry";

// The 3D sky loads after the page's numbers are on screen; the CSS sky shows meanwhile.
const LiveSkyCanvas = dynamic(() => import("./live-sky-canvas").then((m) => m.LiveSkyCanvas), { ssr: false });

interface SkyHeroProps {
  latitude: number;
  longitude: number;
  now: Date;
  samples: HourlyUVSample[];
  /** Title, location and risk badge, laid over the top of the sky. */
  header: ReactNode;
}

/** How long a previewed time stays on screen after the finger lifts, before easing back to now. */
const PREVIEW_HOLD_MS = 5000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True while the element is on screen and the tab is visible, so the 3D scene can pause otherwise. */
function useOnScreen<T extends Element>(ref: React.RefObject<T | null>) {
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return onScreen && visible;
}

function nearestSample(samples: HourlyUVSample[], t: number): HourlyUVSample | undefined {
  let best: HourlyUVSample | undefined;
  for (const s of samples) {
    if (!best || Math.abs(s.time.getTime() - t) < Math.abs(best.time.getTime() - t)) best = s;
  }
  return best;
}

/** UV Index at a minute, using the same solar-shaped interpolation as the dose engine. */
function uvAt(samples: HourlyUVSample[], lat: number, lon: number, t: number): number {
  const at = new Date(t);
  return interpolateHourlyToMinutes(samples, lat, lon, at, new Date(t + 120_000))[0]?.uvIndex ?? nearestSample(samples, t)?.uvIndex ?? 0;
}

/** Color for the UV intensity strip along the scrubber: pale gold when weak, deep orange-red when extreme. */
function uvStripColor(uv: number): string {
  const stops = [
    { at: 0, rgba: [255, 255, 255, 0.35] },
    { at: 2, rgba: [253, 230, 138, 0.75] },
    { at: 5, rgba: [251, 191, 36, 0.9] },
    { at: 8, rgba: [234, 88, 12, 0.95] },
    { at: 11, rgba: [185, 28, 28, 1] },
  ];
  const v = Math.min(11, Math.max(0, uv));
  let i = 0;
  while (i < stops.length - 2 && v > stops[i + 1]!.at) i++;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  const t = (v - a.at) / (b.at - a.at);
  const c = a.rgba.map((x, j) => x + (b.rgba[j]! - x) * t);
  return `rgba(${Math.round(c[0]!)}, ${Math.round(c[1]!)}, ${Math.round(c[2]!)}, ${c[3]!.toFixed(2)})`;
}

/**
 * Static placeholder sky, shown for the moment before the 3D scene appears
 * (and kept if 3D isn't available). Matched to the real sun height so the
 * 3D sky fades in over the same colors instead of a different time of day.
 */
function fallbackSky(altitudeDeg: number, cloudCoverPct: number): string {
  const ground = "#2c3f33 86%, #22312a 100%";
  if (cloudCoverPct >= 70 && altitudeDeg > 0) {
    return `linear-gradient(180deg, #9aa7b4 0%, #c3ccd5 60%, #d7dde3 85.5%, ${ground})`;
  }
  if (altitudeDeg > 12) return `linear-gradient(180deg, #1f5fae 0%, #4f8fd1 45%, #a9cbe9 85.5%, ${ground})`;
  if (altitudeDeg > 0) return `linear-gradient(180deg, #123a77 0%, #3f74b8 50%, #e9b27a 85.5%, ${ground})`;
  if (altitudeDeg > -8) return `linear-gradient(180deg, #071a3a 0%, #1d3e6e 55%, #c98852 85.5%, #1b1a20 86%, #121216 100%)`;
  return "linear-gradient(180deg, #03060f 0%, #0b1530 60%, #142246 85.5%, #070b12 86%, #04070c 100%)";
}

/**
 * Full-bleed live sky at the top of the Now screen. The sun sits at its true
 * height in the sky for this place and time, glows in proportion to the UV
 * Index, and the clouds follow the forecast. Dragging the strip at the bottom
 * previews the sun at any other time today; it eases back to now on its own.
 */
export function SkyHero({ latitude, longitude, now, samples, header }: SkyHeroProps) {
  const { m, t, rich, clock: clockOf, intl } = useI18n();
  const clock = (ms: number) => clockOf(new Date(ms));
  const containerRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const active = useOnScreen(containerRef);
  const [ready, setReady] = useState(false);
  const [previewMs, setPreviewMs] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dayKey = now.toDateString();
  // Today's path only changes when the date (or place) changes, not every few minutes.
  const dayNoonMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  const path = useMemo(() => sunPath(new Date(dayNoonMs), latitude, longitude, 10), [dayNoonMs, latitude, longitude]);
  const rangeStart = path.length > 0 ? path[0]!.time.getTime() - 30 * 60_000 : null;
  const rangeEnd = path.length > 0 ? path[path.length - 1]!.time.getTime() + 30 * 60_000 : null;

  const shownMs = previewMs ?? now.getTime();
  const sun = useMemo(() => sunState(new Date(shownMs), latitude, longitude), [shownMs, latitude, longitude]);
  const uv = useMemo(() => uvAt(samples, latitude, longitude, shownMs), [samples, latitude, longitude, shownMs]);
  const sample = nearestSample(samples, shownMs);
  const cloudCoverPct = sample?.cloudCoverPct ?? 0;
  const precipitationMm = sample?.precipitationMm ?? 0;

  const peak = useMemo(() => {
    const today = samples.filter((s) => s.time.toDateString() === dayKey);
    if (today.length === 0) return null;
    return today.reduce((a, b) => (b.uvIndex > a.uvIndex ? b : a));
  }, [samples, dayKey]);

  // UV across the scrubber's range, drawn as the strip's gradient.
  const strip = useMemo(() => {
    if (rangeStart === null || rangeEnd === null) return undefined;
    const stops: string[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = rangeStart + ((rangeEnd - rangeStart) * i) / n;
      stops.push(`${uvStripColor(uvAt(samples, latitude, longitude, t))} ${((i / n) * 100).toFixed(1)}%`);
    }
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, [samples, latitude, longitude, rangeStart, rangeEnd]);

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const backToNow = useCallback(() => {
    clearHold();
    setPreviewMs(null);
  }, []);
  const scheduleReturn = () => {
    clearHold();
    holdTimer.current = setTimeout(() => setPreviewMs(null), PREVIEW_HOLD_MS);
  };
  useEffect(() => clearHold, []);

  const previewing = previewMs !== null;
  const sliderValue =
    rangeStart !== null && rangeEnd !== null ? Math.min(rangeEnd, Math.max(rangeStart, shownMs)) : 0;
  const altitude = Math.round(sun.altitudeDeg);
  const sunText = altitude > 0 ? t(m.sky.sunUp, { deg: altitude }) : altitude > -6 ? m.sky.sunHorizon : m.sky.sunBelow;

  return (
    <section
      ref={containerRef}
      aria-label={m.sky.label}
      className="relative -mx-6 -mt-8 h-[27rem] overflow-hidden rounded-b-[2.25rem] shadow-[0_24px_48px_-28px_rgba(15,23,42,0.55)]"
    >
      {/* Static sky: shows instantly, and stays if 3D isn't available. */}
      <div className="absolute inset-0" style={{ background: fallbackSky(sun.altitudeDeg, cloudCoverPct) }} aria-hidden="true" />
      <div
        className="absolute inset-0 transition-opacity duration-[1400ms] ease-out"
        style={{ opacity: ready ? 1 : 0 }}
        aria-hidden="true"
      >
        <LiveSkyCanvas
          latitude={latitude}
          sun={sun}
          path={path}
          uvIndex={uv}
          cloudCoverPct={cloudCoverPct}
          precipitationMm={precipitationMm}
          reducedMotion={reducedMotion}
          active={active}
          onReady={() => setReady(true)}
        />
      </div>
      {/* Gentle scrims keep the glass controls readable over any sky. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-14 pt-6">
        {header}

        <div className="flex flex-col gap-2.5">
          <p
            className="liquid-glass w-fit rounded-full px-3.5 py-1.5 text-sm font-medium text-[var(--foreground)]"
            aria-live="polite"
          >
            {previewing && <span className="hero-number me-1.5 text-[var(--accent)]">{clock(shownMs)}</span>}
            <span className="hero-number">UV {uv.toFixed(1)}</span> · {m.uvCategory[uvCategoryKey(uv)]} · {sunText}
          </p>

          {rangeStart !== null && rangeEnd !== null && (
            <div className="liquid-glass flex flex-col gap-2 rounded-2xl px-3.5 pb-2.5 pt-3">
              <input
                type="range"
                dir="ltr"
                className="sky-scrubber"
                min={rangeStart}
                max={rangeEnd}
                step={5 * 60_000}
                value={sliderValue}
                style={{ backgroundImage: strip }}
                aria-label={m.sky.sliderLabel}
                aria-valuetext={`${clock(sliderValue)}, UV ${uv.toFixed(1)}`}
                onChange={(e) => {
                  clearHold();
                  setPreviewMs(Number(e.target.value));
                }}
                onPointerUp={scheduleReturn}
                onKeyUp={scheduleReturn}
                onBlur={scheduleReturn}
              />
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                <span>
                  {peak
                    ? rich(m.sky.peakLine, {
                        uv: <span className="hero-number font-medium text-[var(--foreground)]">UV {peak.uvIndex.toFixed(1)}</span>,
                        time: peak.time.toLocaleTimeString(intl, { hour: "numeric" }),
                      })
                    : m.sky.todaysSun}
                </span>
                {previewing ? (
                  <button
                    type="button"
                    onClick={backToNow}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[var(--accent)] transition-colors hover:bg-white/50"
                  >
                    <RotateCcw className="size-3" aria-hidden="true" />
                    {m.sky.backToNow}
                  </button>
                ) : (
                  <span>{m.sky.dragHint}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
