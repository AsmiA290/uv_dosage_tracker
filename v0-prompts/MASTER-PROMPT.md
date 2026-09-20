# MASTER PROMPT: UV Dose Tracker

CONTEXT (read first): I have an existing Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui project. The folders lib/dose, lib/weather, lib/db and app/api/forecast are FINISHED, hand-written code. DO NOT modify, rewrite, or regenerate anything in them. Import and call them. Build ONLY the UI: app/page.tsx, app/session/page.tsx, app/history/page.tsx, app/methods/page.tsx and components/ui/*. Exactly four screens: Now, Session, History, Methods. No diagnostic or lesion features anywhere.

Build in this order, all in one pass:


==========
# v0 prompt — Design system

Paste this first, before any screen prompt.

---

Build a design system for **UV Dose Tracker**, a personal UV-exposure tracking web app for outdoor workers and athletes (farm crews, sports coaches, grounds crews) in central Illinois. Use **Next.js 15 App Router, TypeScript, Tailwind v4, and shadcn/ui**. Output reusable primitives, not a full page yet.

## The one design constraint that matters more than any other

This app is read **outdoors, in direct sunlight, often through sunglasses, often at arm's length while working.** Every other health/fitness app on the market defaults to a dark, moody UI — that is the wrong choice here, because dark UIs wash out and glare under direct sun and have poor contrast in bright ambient light. Design **light-first, very high contrast, oversized numerals, large touch targets.** Do not propose a dark-mode-primary design. A muted dark variant may exist for evening use but is secondary.

## Tokens

Use CSS custom properties (already scaffolded in `app/globals.css` — read that file and match it, don't invent a parallel palette):

```
--background: #fafaf9        (near-white, not pure white — reduces glare)
--surface: #ffffff           (cards)
--foreground: #111114        (near-black text, maximum contrast)
--muted-foreground: #52525b
--border: #e4e4e7
--accent: #0f766e            (teal — primary actions, NOT risk-coded)
--accent-foreground: #ffffff
--risk-low: #166534          (deep green)
--risk-medium: #b45309       (amber/brown)
--risk-high: #b91c1c         (red)
--epa-low / --epa-moderate / --epa-high / --epa-very-high / --epa-extreme
  (the official WHO/EPA UV Index rainbow — reserved ONLY for a small index
  legend component, never used as the app's general color language)
--radius: 0.75rem
```

**Color discipline rule:** do not paint the whole interface in the EPA green→yellow→orange→red→purple UV Index rainbow. That's the instinctive choice and it's wrong here — it's visually loud, inaccessible to colorblind users (who are statistically overrepresented among outdoor tradespeople, the target user), and it teaches users to react to color instead of the number. Use the single warm `--risk-*` ramp (low/medium/high, three stops only) for the app's own risk state, and **always pair every risk state with a numeral and a text label — never color alone.**

## Typography

- One neutral sans-serif: **Geist** (preferred) or **Inter**.
- Enable tabular numerals everywhere a number updates live: `font-variant-numeric: tabular-nums`. This is already set globally in `app/globals.css` via `.hero-number` and `body`. Digits must not visually jitter/reflow as a countdown ticks.
- Steep type scale: the hero number should be genuinely huge (`text-7xl` / `text-8xl` territory), body text modest (`text-base`/`text-sm`), and comparatively little in the middle. Avoid a smooth, timid scale with everything close to the same size.

## Spacing

Generous, not dense. This is a glanceable, one-question-at-a-time interface, not a data-dense dashboard. Favor large paddings (`p-6`–`p-8` on cards), big gaps between sections (`gap-8`+), and a single-column layout that reads top-to-bottom without horizontal scanning.

## Component primitives to generate now

1. **Button** (shadcn `Button`, using `--accent`) — primary, secondary, and a large "session control" variant sized for a gloved thumb (min 56px tall).
2. **Card** (shadcn `Card`) using `--surface` and `--border`, generous padding, no heavy drop shadows (they read as dirt/glare outdoors — use a thin 1px border instead).
3. **StatTile** — a small labeled numeral block (label above, big tabular-nums value below, optional unit suffix in a smaller muted weight). Must support a `riskLevel: "low" | "medium" | "high"` prop that colors only a small accent (e.g. a left border stripe or a dot), never the whole tile background.
4. **RiskBadge** — pill-shaped, text + numeral, background at ~10% opacity of the matching `--risk-*` token, foreground at full `--risk-*` token color. Never render a `RiskBadge` with no text, only color.
5. **RadialGaugeShell** — an empty, reusable SVG arc container (viewBox, background track arc, no data yet) sized to host a hand-written hero gauge later. Use `d3-scale`/`d3-shape` conventions in comments but leave the actual arc-drawing math as a TODO — that gauge is hand-built separately, not generated. Just build the shell: container, title slot, big center-number slot, small caption slot beneath.
6. **UncertaintyRange** — a small horizontal component showing `low – high` with the nominal value slightly emphasized, used anywhere the app shows an interval instead of a single number (this app deliberately never shows a falsely precise single figure for a forecasted quantity).
7. **BottomNav** or simple top nav with exactly four destinations: **Now, Session, History, Methods**. No more than four — this is a hard scope constraint for the whole project, not a placeholder.

## Recommended packages (for later screens, not needed for this prompt)

`recharts` (time-series charts on History), `motion` (for the gauge fill animation — used with restraint, no bouncy/playful easing given the seriousness of a health-adjacent tool), `lucide-react` (icons), `date-fns` + `date-fns-tz` (never format times without explicit timezone handling).

## Accessibility

WCAG AA contrast minimum everywhere, larger than default touch targets (44px minimum, prefer 56px for primary actions), and — repeating because it's the most commonly violated rule in health apps — **no state may be conveyed by color alone.**

Output: a `components/ui/` set (Button, Card, StatTile, RiskBadge, RadialGaugeShell, UncertaintyRange, BottomNav) plus a `globals.css`-compatible Tailwind config, shown together on one small demo page so all primitives are visible at once.

==========
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

==========
# v0 prompt — "Session" screen

Paste after the Now-screen prompt, in the same v0 project.

---

Build the **Session** screen for UV Dose Tracker at `app/session/page.tsx` (replacing the existing placeholder there), a Next.js 15 client component. This screen is how a coach, crew lead, or individual user tracks one continuous block of outdoor exposure -- a practice, a shift, a match. **The app deliberately does not do background location tracking** (a web app cannot do this reliably); sessions are explicit start/stop, exactly the way a coach or crew lead already thinks about a shift or practice. Treat that as a stated design decision in the UI copy, not an apology.

## Data contract

Same `computeDoseEstimate` / `DoseEstimateInput` / `DoseEstimate` shapes as the Now screen (see `v0-prompts/01-now-screen.md` for the full type block). Additionally:

```ts
interface SunscreenApplication {
  appliedAt: Date;
  labeledSPF: number;
  appliedThicknessMgCm2: number; // label testing assumes 2.0; real application is often 0.5-1.0
  wearCondition: "dry" | "sweating" | "swimming";
}

// lib/dose/sunscreen.ts
function shouldReapply(application: SunscreenApplication, atTime: Date): boolean;
function activeSPFAtTime(applications: SunscreenApplication[], atTime: Date): number;
```

## Screen states

### 1. Idle (no session running)
- Big primary action: **Start Session**. Tapping it opens a short setup step (can be a single screen, not a wizard): Fitzpatrick type (use `FITZPATRICK_LABELS`), ground surface, posture, and an optional initial sunscreen application (SPF number input + a thickness selector using plain language, not mg/cm^2 jargon -- e.g. "Light dab," "Standard layer," "Thick, visible layer" mapped internally to roughly 0.5 / 1.0 / 2.0 mg/cm^2).
- Below the button, show yesterday's or last session's summary in one muted line, if available, so returning users have continuity.

### 2. Active session
- Persistent header showing elapsed time (large, tabular numerals) and a prominent **End Session** button (destructive-styled but not alarming -- this is a normal, frequent action).
- Live-updating dose readout: reuse the RadialGaugeShell + hero-number pattern from the Now screen for visual consistency, showing remaining budget SED and the time-to-threshold sentence, recomputed at least once a minute from `computeDoseEstimate` with `sessionStart` fixed at the actual start time and `now` ticking forward.
- **Sunscreen reapplication nudge**: poll `shouldReapply()` against the active application(s) each tick; when it flips true, surface a clear, non-modal banner ("Reapply sunscreen -- protection has dropped below half its labeled SPF") with a one-tap **Log Reapplication** action that appends a new `SunscreenApplication` at the current time. Do not use a blocking modal or an alarming color for this -- it's a routine reminder, not an emergency.
- **Add sunscreen mid-session** even without a nudge (e.g. the user reapplies proactively) via a small secondary action.
- **Log a note** (optional, single free-text field) for context a coach might want later ("practice moved indoors at 3:40").

### 3. Ended session
- Summary card: total duration, final cumulative dose (as an UncertaintyRange), how many SED of headroom remained (or by how much the estimated MED was exceeded, worded carefully and non-alarmingly: "This session used more of your estimated daily budget than usual" rather than any clinical framing), and a **Save** / **Discard** choice.
- Saving should be a clearly-named function stub (e.g. `saveSessionToHistory(session)`) that the History screen will read from -- for this prompt, persist to `localStorage` under a single documented key as a placeholder; real persistence goes through the Drizzle schema in `lib/db/schema.ts` (`exposureSessions`, `doseRecords`) once the API routes for it exist.

## Visual language

Reuse every primitive from the design-system prompt. This screen is used mid-activity, often one-handed, sometimes with sweaty or gloved fingers -- touch targets should be even larger than the Now screen's (56px+ minimum for Start/End Session), and the "End Session" action must never be positioned where an accidental scroll or tap could trigger it.

## What NOT to build here

No background/passive GPS tracking. No diagnostic or lesion-related content. No more than the states described above -- resist adding a "pause session" state, multi-session comparison, or social/sharing features; those are out of the four-screen scope.

==========
# v0 prompt -- "History" screen

Paste after the Session-screen prompt, in the same v0 project.

---

Build the **History** screen for UV Dose Tracker at `app/history/page.tsx` (replacing the existing placeholder there), a Next.js 15 client component. This screen answers: "how has my UV load looked over time, and am I trending toward overexposure this week." Use **Recharts** for every chart on this screen -- the hand-written SVG gauge belongs only on Now/Session; History is exactly the kind of standard time-series/bar visualization a charting library is right for.

## Data shape (placeholder until the DB-backed API route exists)

For this prompt, read an array from `localStorage` (same key `saveSessionToHistory` wrote to on the Session screen) shaped like:

```ts
interface HistoricalSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  fitzpatrickType: "I" | "II" | "III" | "IV" | "V" | "VI";
  cumulativeDoseSED: { low: number; nominal: number; high: number };
  medThresholdSED: { low: number; nominal: number; high: number };
  surface: string;
  note?: string;
}
```

Design the component so the data-fetching is isolated in one small hook (e.g. `useSessionHistory()`) that can later be swapped to call a real API route backed by the `exposureSessions` / `doseRecords` tables in `lib/db/schema.ts` without touching the rest of the screen.

## Layout

1. **Top nav**, History active.
2. **Week-at-a-glance bar chart** (Recharts `BarChart`): one bar per day of the current week, bar height = that day's total nominal SED (sum across sessions that day), with a thin error bar or shaded band showing the low-high range. Overlay a horizontal reference line at the user's nominal MED threshold so "did I cross my daily budget" is visually immediate. Use `--risk-low`/`--risk-medium`/`--risk-high` fills per bar based on how close that day's dose came to threshold (e.g. <60% = low, 60-100% = medium, >100% = high) -- and label each bar's exact SED value in text as well, never relying on the color alone.
3. **Cumulative trend line** (Recharts `LineChart` or `AreaChart`): rolling 7-day and 30-day total dose, so a coach can see a season building up, not just single days.
4. **Session list**, most recent first: each row shows date, duration, surface, dose range, and the optional note; tapping a row expands it to a small detail card. Use the same StatTile/UncertaintyRange primitives as the other screens for visual consistency.
5. **Empty state**: if there are zero recorded sessions, show an inviting (not scolding) prompt to start one, linking to the Session screen.

## Optional, only if time permits (brief section 6 -- do not prioritize this over the four core screens)

A **coach / crew-lead view**: a roster list (backed by the `teamRosters` table) where each row is a team member's most recent session status, so a coach can glance at "who's approaching their limit today" across a whole practice. If you build this, put it behind a clearly separate route (`app/history/team/page.tsx`) so it never displaces the individual History view as the default.

## What NOT to build here

No diagnostic trend claims ("your risk of skin cancer is increasing"). Frame everything in terms of measured exposure load, not health outcomes -- that framing distinction is explicitly part of why this app is defensible to health-professional judges.

==========
# v0 prompt -- "Methods" screen

Paste after the History-screen prompt, in the same v0 project.

---

Build the **Methods & Citations** screen for UV Dose Tracker at `app/methods/page.tsx`, restyling the existing functional placeholder there -- **do not change its data source.** It already imports and renders `CITATIONS` from `lib/dose/citations.ts`; your job is purely visual/structural polish of that existing component, because the citation content itself must stay wired to the single source of truth other code also reads from (so the in-app claims and the constants actually used to compute doses can never drift apart).

## Data contract (already wired -- restyle, don't replace)

```ts
interface Citation {
  key: string;
  claim: string;
  source: string;
  confirmed: boolean;
  note?: string;
}
const CITATIONS: Record<string, Citation>; // from lib/dose/citations.ts
```

## Why this screen exists

Health-professional judges are skeptical of consumer UV/skin apps by default. A visible, specific methods page -- naming every constant, every correction, and the literature it comes from, including honestly flagging which figures are "not yet verified" against a primary source -- is one of the highest-leverage pieces of credibility this project can build cheaply. Do not make this screen feel like an afterthought or a legal disclaimer buried in gray text; give it real design attention.

## Layout

1. **Top nav**, Methods active.
2. **Intro block**: one short paragraph explaining what this app estimates (personal cumulative UV dose) and, just as importantly, what it does *not* do (no lesion assessment, no diagnosis, no medical advice) -- reuse this exact framing, don't soften it.
3. **Grouped citation cards**, one per `Citation` entry, organized under clear section headers by topic (Dose definitions / Skin type & MED / Atmospheric corrections / Sunscreen / Solar geometry & forecast uncertainty) rather than as one long undifferentiated list -- group by inspecting each `key`'s content, since `citations.ts` doesn't currently carry an explicit category field. Each card shows: the claim in plain language (`claim`), the citation itself in a smaller/monospace-adjacent style suggesting "this is a reference, not prose" (`source`), a small status pill -- "Verified" (`--risk-low` tones) vs. "Not yet verified" (`--risk-medium` tones) driven by `confirmed` -- and, when present, the `note` field in italic, muted, slightly smaller text explaining what verification step remains.
4. **"How this app defines your personal dose" explainer**: a short, plain-language walkthrough of the pipeline -- UV Index -> erythemal irradiance -> personal exposure ratio -> sunscreen attenuation -> cumulative SED -> compared against your MED range -- ideally as a simple horizontal step diagram (five or six labeled nodes with connecting arrows/lines; can be built with plain divs and CSS, no diagramming library needed). This is the same pipeline the demo video will narrate, so keep the labels consistent with the video script in `docs/demo-video-script.md`.
5. **A small, isolated EPA UV Index legend** (the only place in the whole app that uses the `--epa-*` rainbow tokens): the five official categories (Low/Moderate/High/Very High/Extreme) as small labeled swatches, purely for reference -- explicitly caption it as "for reference only -- this app's own risk indicators use a simpler scale," reinforcing the design system's color-discipline decision.
6. **Footer disclaimer**, larger and more visually deliberate than a typical legal footnote: "Educational tool. Not a medical device. Does not diagnose or assess skin conditions."

## What NOT to build here

Do not add an editable citation-management UI (no add/edit/delete for citations) -- this is a static, curated reference page, and the source of truth lives in code (`lib/dose/citations.ts`), not in the database.
