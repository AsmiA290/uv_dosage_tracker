# UV Dose Tracker

Personal UV dose tracking for outdoor workers and athletes in central Illinois (IL-13) -- built for the **Congressional App Challenge 2026**. See [docs/project-timeline.md](docs/project-timeline.md) for the dated build plan and blocking action items.

> Educational tool. Not a medical device. Does not diagnose or assess skin conditions.

## What this is

A UV Index forecast tells you the irradiance falling on a flat, horizontal surface. It does not tell you how much sun *your* skin will actually take on, or when *you* will burn. This app closes that gap: enter your Fitzpatrick skin type, the surface you're standing on, and your posture, and it converts an hourly UV forecast into a personal, cumulative dose estimate with an honest uncertainty interval -- "you'll likely reach your burn threshold in 42-68 minutes," not a single falsely precise number.

## Repository structure

```
lib/dose/         Hand-written scientific core. No framework dependencies. See below.
lib/weather/      Open-Meteo fetch + Zod validation (server-only).
lib/db/           Drizzle ORM schema (Postgres via Neon/Supabase).
app/              Next.js 15 App Router pages + API routes.
v0-prompts/       Prompts to paste into v0.dev, one per screen. Start here for UI work.
analysis/         Python: historical UV pull, the minutes-to-MED evidence figure, EPA cross-validation.
docs/             Timeline, demo video script, exit questionnaire draft.
```

## The scientific core (`lib/dose`)

This is the part of the app that should stay genuinely, defensibly yours -- it's the answer to the technical-challenge question on the exit questionnaire, and the brief is explicit that neither v0 nor an AI assistant should be the one generating it unsupervised. Every constant is cited in [lib/dose/citations.ts](lib/dose/citations.ts) and rendered on the in-app Methods page; several are flagged `confirmed: false` because the literature reports a range rather than one agreed figure -- **picking your one primary source per parameter and flipping those flags is a required step before submission**, not optional cleanup.

The pipeline, end to end (`lib/dose/dose.ts` → `computeDoseEstimate`):

1. **UV Index → erythemal irradiance** (`irradiance.ts`): 1 UVI = 25 mW/m².
2. **Solar-geometry-aware interpolation** (`solar.ts`, `irradiance.ts`): hourly forecast points are interpolated to minute resolution shaped by the solar-elevation curve (via `suncalc`), not a naive straight line.
3. **Corrections** (`corrections.ts`): empirical cloud modification factor (from Open-Meteo's paired all-sky/clear-sky UV fields), surface albedo, and the personal exposure ratio -- the correction most consumer UV apps skip, converting *ambient* horizontal UV into what a standing person's face/neck/shoulders actually receive.
4. **Sunscreen decay** (`sunscreen.ts`): labeled SPF assumes 2.0 mg/cm² application; real-world application is thinner, and protection falls off exponentially, not proportionally, with thickness. Wear-off is modeled as a condition-dependent half-life (dry / sweating / swimming), driving the in-session reapplication nudge.
5. **Uncertainty propagation** (`uncertainty.ts`): a seeded Monte Carlo simulation combines the MED range for the user's Fitzpatrick type, UV forecast error, and the personal exposure ratio range into a calibrated p10/p50/p90 time-to-threshold interval.

Run the test suite (the single most credible artifact if a judge asks for source access):

```bash
npm install
npm test
```

**Note from this build session:** this development machine has no Node.js/npm installed, so `npm install` / `npm test` could not actually be executed here -- every function was hand-traced against its test's expected values instead (see the reasoning in this session's transcript). Run the suite yourself as your first step before building on top of this; if anything fails, it's a real bug to fix, not a formatting issue.

## Getting the UI built in v0

Don't ask v0 for the whole app at once -- see [v0-prompts/README.md](v0-prompts/README.md) for the full workflow. Short version: paste `v0-prompts/00-design-system.md` first, then the four screen prompts (`01`-`04`) one at a time in the same v0 project, then pull the generated components back into this repo's `app/` folders. Every screen prompt references the real types in `lib/dose/types.ts` and the real `/api/forecast` route, so what v0 generates plugs into the actual engine instead of mock data.

### Recommended packages for a visually strong, interactive result

Already wired into [package.json](package.json):

| Package | Why |
|---|---|
| `recharts` | Standard, accessible time-series/bar charts for the History screen -- don't hand-roll these. |
| `d3-scale` + `d3-shape` | For the one thing worth hand-rolling: the hero radial dose gauge on Now/Session. A custom arc is more distinctive than any chart-library gauge and is genuinely only a few functions. |
| `motion` (Framer Motion) | Gauge fill animation and screen transitions -- use restrained, non-bouncy easing; this is a health-adjacent tool, not a game. |
| `lucide-react` | Icon set that matches shadcn/ui's visual language. |
| `@serwist/next` + `serwist` | PWA installability + offline caching of the last forecast -- genuinely load-bearing for a user with no signal in a field, not just a checkbox. |
| `date-fns` + `date-fns-tz` | Never hand-roll timezone math for a minute-resolution dose integration -- silent tz bugs there directly corrupt the dose number. |
| shadcn/ui (via v0) + Tailwind v4 | What v0 emits natively; fastest iteration loop and consistent with the design-system prompt's tokens. |

Worth adding if you want to push the interactivity/polish further once the four core screens exist:

- **`react-spring` or `motion`'s `useAnimationFrame`** if the radial gauge needs a smoother needle-follows-live-value animation than CSS transitions give you.
- **`vaul`** (a shadcn-ecosystem drawer library) for the Session screen's "log sunscreen application" bottom sheet -- much better on mobile than a modal dialog.
- **`cmdk`** if a coach/crew-lead roster view (optional, brief section 6) grows large enough to need a searchable command palette.
- **`@vercel/og`** if you want a shareable, auto-generated "today's dose summary" image for the demo video's social-proof moment -- not required, genuinely optional polish.

Resist the temptation to add a charting or animation library per screen "just because it looks cool" -- the brief's own "do not" list (scope creep past four screens) applies to dependencies too.

## Data pipeline

`app/api/forecast/route.ts` proxies Open-Meteo server-side, validating the response with Zod (`lib/weather/schema.ts`) and dropping (never zero-filling) hours with missing data. Persistence uses Drizzle + Postgres (`lib/db/schema.ts`) -- copy `.env.example` to `.env` and point `DATABASE_URL` at a Neon or Supabase instance, then `npm run db:generate && npm run db:migrate`.

## Evidence base (`analysis/`)

Python scripts for the district-specific evidence that opens the demo video: 10 years of historical UV for Springfield/Decatur/Champaign, the minutes-to-MED heatmap, cross-validation against the EPA Envirofacts UV API, and Illinois melanoma/outdoor-workforce sizing. See [analysis/README.md](analysis/README.md).

## Constraints this project holds itself to

- No diagnostic feature of any kind -- exposure tracking only, never "is this a cancer."
- No more than four screens: Now, Session, History, Methods.
- Every model parameter cited in-app (`/methods`).
- `/lib/dose` is hand-written and excluded from AI/v0 generation.
