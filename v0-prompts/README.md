# How to use these prompts in v0

Per the project brief (section 6): **generate screen by screen, never "build the whole app" in one shot.** v0 produces much higher quality output — and code you can actually reason about — when each prompt is scoped to one surface.

## Order of operations

1. **Paste `00-design-system.md` first**, in its own v0 chat/project. This establishes the tokens, type scale, and component vocabulary every later screen should reuse. Let v0 generate a small set of primitives (button, card, stat tile, radial gauge shell) from it before moving on.
2. **Then paste `01-now-screen.md`, `02-session-screen.md`, `03-history-screen.md`, `04-methods-screen.md`**, one at a time, in the *same* v0 project so it keeps reusing the design system instead of reinventing it each time.
3. After each screen looks right in the v0 preview, use v0's "Add to Codebase" / export flow to pull the generated components into this repo under `app/<screen>/` and `components/ui/`, replacing the placeholder page in that folder.
4. **Never paste anything from `/lib/dose` into v0, and never let v0 regenerate it.** Every prompt below is written to *consume* the dose engine's existing types and the `/api/forecast` route, not to reimplement the math. That boundary is what makes `/lib/dose` credible as "solely your own work" for the originality requirement.

## What v0 needs from this repo to wire up real data

Point v0 (or your own follow-up edits after import) at these files so generated components call the real pipeline instead of inventing mock data:

- `lib/dose/types.ts` — every shape referenced below (`DoseEstimate`, `MinuteSample`, `FitzpatrickType`, `SunscreenApplication`, etc.)
- `lib/dose/constants.ts` — `FITZPATRICK_LABELS`, `SURFACE_ALBEDO` (for surface picker labels)
- `lib/dose/citations.ts` — `CITATIONS` (Methods screen)
- `app/api/forecast/route.ts` — `GET /api/forecast?lat=..&lon=..` → `{ samples: HourlyUVSample[] }`
- A client-side call to `computeDoseEstimate()` (from `lib/dose/dose.ts`) is safe — it's pure, synchronous, and has no server-only dependency, unlike `lib/weather/open-meteo.ts`. Fetch samples from `/api/forecast`, then call `computeDoseEstimate` in a client component (or a server component, either works).

## If you'd rather paste one mega-prompt

Some teams prefer a single v0 generation to start from and then iterate. If so, concatenate `00` through `04` in order into one paste. Expect a rougher first pass than the screen-by-screen flow — plan to spend more iteration turns cleaning it up.
