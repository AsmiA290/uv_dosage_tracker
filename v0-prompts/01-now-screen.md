# v0 prompt — "Now" screen

Paste after the design-system prompt, in the same v0 project.

---

Build the **Now** screen for UV Dose Tracker — a Next.js 15 App Router client component at `app/page.tsx` (replacing the existing placeholder there). This is the app's home screen and answers exactly one question on arrival: **how much sun can I take right now.** Use the design system primitives already established (StatTile, RiskBadge, RadialGaugeShell, UncertaintyRange, BottomNav) — do not invent a second visual language.

## Data contract (do not change these shapes — they come from the hand-built dose engine)

```ts
// GET /api/forecast?lat=..&lon=..  ->  { samples: HourlyUVSample[] } | { error: string }
interface HourlyUVSample {
  time: string; // ISO timestamp (serialized Date)
  uvIndex: number;
  uvIndexClearSky?: number;
  cloudCoverPct?: number;
}

// lib/dose/dose.ts — pure function, safe to call client-side
function computeDoseEstimate(input: DoseEstimateInput): DoseEstimate;

interface DoseEstimateInput {
  fitzpatrickType: "I" | "II" | "III" | "IV" | "V" | "VI";
  latitude: number;
  longitude: number;
  surface: "grass" | "soil" | "concrete" | "sand" | "water" | "freshSnow";
  posture: "standing" | "sitting" | "activeSport";
  hourlySamples: HourlyUVSample[]; // parse `time` back into Date before calling
  sessionStart: Date;
  now: Date;
  sunscreenApplications?: SunscreenApplication[];
}

interface Interval { low: number; nominal: number; high: number; }

interface DoseEstimate {
  cumulativeDoseSED: Interval;
  medThresholdSED: Interval;
  remainingBudgetSED: Interval;
  currentDoseRateSEDPerMinute: number;
  timeToThreshold: { p10Minutes: number; p50Minutes: number; p90Minutes: number };
  minuteSeries: Array<{ time: Date; ambientUvIndex: number; personalUvIndex: number; personalIrradianceWm2: number; sunscreenAttenuation: number }>;
  cloudModificationFactors: Array<{ time: Date; cmf: number }>;
}
```

`FITZPATRICK_LABELS` (a `Record<FitzpatrickType, string>` of human-readable labels) is exported from `lib/dose/constants.ts` for the type picker.

## Layout, top to bottom

1. **Top nav** (BottomNav or top variant) — Now / Session / History / Methods, "Now" active.
2. **Hero radial gauge** (use RadialGaugeShell as the container — the actual SVG arc math is hand-written elsewhere and will be dropped in later; for now render the shell with a placeholder arc at the fraction `remainingBudgetSED.nominal / medThresholdSED.nominal`). Center number: `remainingBudgetSED.nominal` SED remaining, one decimal place, tabular numerals, `text-7xl`+. Caption beneath in muted text: the `low-high` interval via UncertaintyRange.
3. **Time-to-threshold sentence**, plain language, large and legible: "You'll likely reach your burn threshold in **{p10Minutes}-{p90Minutes} minutes**" (round to nearest minute; if either bound is `Infinity`, render an em dash and a note that the sun is below a usable elevation). This is the single most important sentence on the screen -- do not bury it below the fold.
4. **Two StatTiles side by side**: current dose rate (`currentDoseRateSEDPerMinute`, SED/min, 3 decimals) and cumulative dose so far (`cumulativeDoseSED`, as an UncertaintyRange).
5. **Context row**: small, muted, single line showing Fitzpatrick type label, surface, and posture as tappable chips that open a bottom sheet / inline editor to change them (changing any of them should recompute `computeDoseEstimate` client-side and re-render -- no page reload).
6. **Sunscreen status**: if any `sunscreenApplications` are active, show a small RiskBadge-style pill: "Protected -- reapply by {time}" in `--risk-low`/`--risk-medium`, else an outline "No sunscreen logged" prompt with a button to add one (linking to the Session screen's application flow -- this screen doesn't need to implement logging itself, just surface status and a link).
7. **Educational disclaimer**, small, muted, always visible without scrolling on a typical phone viewport: "Estimate only -- not a medical device. See Methods for sources."

## Interaction / state

- On mount, fetch `/api/forecast` using the browser's geolocation if granted, falling back to a default coordinate (Springfield, IL: `39.78, -89.65`) with a small "using default location" note if geolocation is denied or unavailable.
- Session window for this screen: `sessionStart` = 6 hours before now, and `now` = current time, purely to show *some* live cumulative dose on the home screen before a real Session has been started -- make this assumption obvious in a code comment, since the real "start/stop" semantics belong to the Session screen.
- Handle the loading state (skeleton matching the gauge + tiles layout) and the forecast-unavailable error state (friendly message, retry button) explicitly -- do not let either state render blank or throw.
- Recompute and re-render at least once a minute while the tab is visible (a simple interval is fine).

## What NOT to build here

No lesion/skin assessment feature of any kind. No diagnostic language anywhere ("this looks like...", "you may have..."). This screen only ever talks about *exposure*, never about skin *condition*.
