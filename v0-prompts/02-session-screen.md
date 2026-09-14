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
