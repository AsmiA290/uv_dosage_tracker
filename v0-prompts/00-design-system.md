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
