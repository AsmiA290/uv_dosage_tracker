# The ActinicUVDose

Personal UV dose tracking for outdoor workers and athletes in central Illinois (IL-13) -- built for the **Congressional App Challenge 2026**. See [docs/project-timeline.md](docs/project-timeline.md) for the dated build plan and blocking action items.

> Educational tool. Not a medical device. Does not diagnose or assess skin conditions.

## What this is

A UV Index forecast tells you the irradiance falling on a flat, horizontal surface. It does not tell you how much sun *your* skin will actually take on, or when *you* will burn. This app closes that gap: enter your Fitzpatrick skin type, the surface you're standing on, and your posture, and it converts an hourly UV forecast into a personal, cumulative dose estimate with an honest uncertainty interval -- "you'll likely reach your burn threshold in 42-68 minutes," not a single falsely precise number.

## Repository structure

```
lib/dose/         Hand-written scientific core. No framework dependencies. See below.
lib/weather/      Open-Meteo fetch + Zod validation (server-only).
lib/sky/          Sun position and sky-appearance math for the live 3D sky on the Now screen.
components/sky/   The live 3D sky (three.js via @react-three/fiber), lazy-loaded on the client.
lib/db/           Drizzle ORM schema (Postgres via Neon/Supabase).
app/              Next.js 15 App Router pages + API routes.
v0-prompts/       Prompts to paste into v0.dev, one per screen. Start here for UI work.
analysis/         Python: historical UV pull, the minutes-to-MED evidence figure, EPA cross-validation.
docs/             Timeline, demo video script, exit questionnaire draft.
```

## The scientific core (`lib/dose`)

This is the scientific heart of the app and the answer to the technical-challenge question on the exit questionnaire. **AI disclosure:** parts of `lib/dose` were written with an AI coding assistant (Claude, by Anthropic) and reviewed by the author: the October 2026 corrections to the dose model and the work-exposure calculation in `occupational.ts`. v0 does not generate this folder. Every constant is cited in [lib/dose/citations.ts](lib/dose/citations.ts) and rendered on the in-app Methods page; several are flagged `confirmed: false` because the literature reports a range rather than one agreed figure -- **picking your one primary source per parameter and flipping those flags is a required step before submission**, not optional cleanup.

The pipeline, end to end (`lib/dose/dose.ts` → `computeDoseEstimate`):

1. **UV Index → erythemal irradiance** (`irradiance.ts`): 1 UVI = 25 mW/m².
2. **Solar-geometry-aware interpolation** (`solar.ts`, `irradiance.ts`): hourly forecast points are interpolated to minute resolution shaped by the solar-elevation curve (via `suncalc`), not a naive straight line.
3. **Corrections** (`corrections.ts`): empirical cloud modification factor (from Open-Meteo's paired all-sky/clear-sky UV fields), surface albedo, and the exposure ratio -- the correction most consumer UV apps skip, converting *ambient* horizontal UV into what the user's **most exposed** skin (top of head, shoulders, nose) receives. The app deliberately estimates for the most exposed site (ratio ~0.8, range 0.6-1.0) because that is where sunburn appears first; a whole-body average would make burn times look about twice as long as they are.
4. **Sunscreen decay** (`sunscreen.ts`): labeled SPF assumes 2.0 mg/cm² application; real-world application is thinner, and protection falls off exponentially, not proportionally, with thickness. Wear-off is modeled as a condition-dependent half-life (dry / sweating / swimming), driving the in-session reapplication nudge.
5. **Uncertainty propagation** (`uncertainty.ts`): a seeded Monte Carlo simulation combines the MED range for the user's Fitzpatrick type, UV forecast error, and the personal exposure ratio range into a calibrated p10/p50/p90 time-to-threshold interval. The UI headlines the p10 (earliest likely) time so warnings come early.
6. **Same-day accumulation**: dose from sessions saved earlier the same day is carried into the next session's budget (`priorDoseTodaySED`).
7. **Work exposure vs the occupational limit** (`occupational.ts`): separately from the burn estimate, the day's UV on the most exposed skin *before sunscreen* is compared with the ICNIRP/ACGIH limit for workers (30 J/m² effective per 8-hour day, about 1.0-1.3 SED of sunlight per ICNIRP 2010). The US has no legal limit for sun exposure at work, so this is the closest standard; it is the same for every skin type. It never changes the SED or burn-time numbers.

Run the test suite (the single most credible artifact if a judge asks for source access):

```bash
npm install
npm test
```

The suite (162 tests across the dose engine, the work-exposure limit, forecast time handling, session persistence, the exposure-log export, the sky's sun geometry, the translations, session alerts, and display helpers) passes as of the October 2026 revision. The config file is `vitest.config.mts` because `vite-tsconfig-paths` is ESM-only.

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
| `date-fns` + `date-fns-tz` | Never hand-roll timezone math for a minute-resolution dose integration -- silent tz bugs there directly corrupt the dose number. (For the same reason the forecast is requested from Open-Meteo as GMT Unix timestamps: local-time strings parsed on a UTC server once shifted the whole UV curve by 5 hours.) |
| shadcn/ui (via v0) + Tailwind v4 | What v0 emits natively; fastest iteration loop and consistent with the design-system prompt's tokens. |

Worth adding if you want to push the interactivity/polish further once the four core screens exist:

- **`react-spring` or `motion`'s `useAnimationFrame`** if the radial gauge needs a smoother needle-follows-live-value animation than CSS transitions give you.
- **`vaul`** (a shadcn-ecosystem drawer library) for the Session screen's "log sunscreen application" bottom sheet -- much better on mobile than a modal dialog.
- **`cmdk`** if a coach/crew-lead roster view (optional, brief section 6) grows large enough to need a searchable command palette.
- **`@vercel/og`** if you want a shareable, auto-generated "today's dose summary" image for the demo video's social-proof moment -- not required, genuinely optional polish.

### Live sky (Now screen)

The Now screen opens on a live 3D sky rendered with `three`, `@react-three/fiber` and `@react-three/drei` (already dependencies). The sun sits at its real altitude and azimuth for the user's location and time (`suncalc`), the sky color comes from three.js's physically based scattering model, and cloud cover and rain from the forecast change the haze, clouds and rain shown. A slider previews the sun's position and UV at any time between sunrise and sunset. The 3D code is loaded only after the page renders, so the first load stays light, and it pauses when off screen; with reduced motion turned on, the sky is drawn without animation, and a static gradient stays in place if WebGL is unavailable. **AI disclosure:** `components/sky/` and `lib/sky/` were written with an AI coding assistant (Claude, by Anthropic) and reviewed by the author. The interface typeface is Plus Jakarta Sans (Google Fonts, via `next/font`).

Resist the temptation to add a charting or animation library per screen "just because it looks cool" -- the brief's own "do not" list (scope creep past four screens) applies to dependencies too.

### Session alerts

During a session the app shows a pop-up when it is time to reapply sunscreen (the latest layer has about half worn off), when about three quarters of the day's burn budget is used, when the estimated burn threshold is reached, and when the day's UV on skin reaches the ICNIRP/ACGIH workplace limit. The rules live in `lib/alerts.ts` and are unit tested; each alert appears once per session. On screen the alert is an in-app banner; if the user turns on notifications and the app is in the background, it is also a system notification (`lib/notify.ts`, shown through the service worker). Notifications are created on the device, with no server and no push service, so they work only while the app is open or running in the background; on iPhone the app must first be added to the Home Screen. **AI disclosure:** the alerts feature was written with an AI coding assistant (Claude, by Anthropic) and reviewed by the author.

### Languages

The app runs in English, Spanish, Polish, Simplified Chinese, Tagalog, Arabic (right-to-left), Ukrainian, Hindi, Gujarati, Russian and Korean. People choose a language on the first onboarding screen and can change it later in Profile; the choice is stored on the device. English text lives in `lib/i18n/messages/en.ts`, and every other language is a file of the same shape that loads only when chosen. Scientific and regulatory acronyms (SPF, UPF, UV, SED, MED, ICNIRP, ACGIH, OSHA, NIOSH, EPA) and units such as J/m² stay unchanged in every language; a test checks this, along with matching keys and placeholders. On the Methods and Why pages the headings and summaries are translated, while quoted citations and detailed policy text stay in English, the language of the original sources, with a note saying so. Times, dates and numbers follow each language's conventions through the browser's `Intl` formatting. Fonts for Cyrillic, Devanagari, Arabic and Gujarati come from Noto Sans and load only on pages that use those letters; Chinese and Korean use the phone's own fonts. **AI disclosure:** the translation system in `lib/i18n/` and the translations themselves were produced with an AI coding assistant (Claude, by Anthropic) and reviewed by the author; review by native speakers is recommended before wider distribution.

## Data pipeline

`app/api/forecast/route.ts` proxies Open-Meteo server-side, validating the response with Zod (`lib/weather/schema.ts`) and dropping (never zero-filling) hours with missing data. Persistence uses Drizzle + Postgres (`lib/db/schema.ts`) -- copy `.env.example` to `.env` and point `DATABASE_URL` at a Neon or Supabase instance, then `npm run db:generate && npm run db:migrate`.

## Evidence base (`analysis/`)

Python scripts for the district-specific evidence that opens the demo video: 10 years of historical UV for Springfield/Decatur/Champaign, the minutes-to-MED heatmap, cross-validation against the EPA Envirofacts UV API, and Illinois melanoma/outdoor-workforce sizing. See [analysis/README.md](analysis/README.md).

## Constraints this project holds itself to

- No diagnostic feature of any kind -- exposure tracking only, never "is this a cancer."
- No more than four screens: Now, Session, History, Methods.
- Every model parameter cited in-app (`/methods`).
- `/lib/dose` is never generated by v0; AI-assisted changes to it are disclosed above and were reviewed by the author.
- Exposure data stays on the device. The History screen's exposure log (CSV) is created locally and only leaves the device if the user shares it.
