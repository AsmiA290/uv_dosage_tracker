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
