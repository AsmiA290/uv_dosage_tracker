FIRST: sync with the latest code on the main branch of https://github.com/AsmiA290/uv_dosage_tracker (pull the newest commit before doing anything, and re-read lib/dose, app/api/forecast and v0-prompts). The engine in lib/dose was just updated (time-to-threshold now integrates the forecast forward). Treat that repo as the source of truth and do not overwrite it.

Refine the existing UV Dose Tracker app. Keep the four screens (Now, Session, History, Methods) and add Onboarding, Login and a Glossary. Do NOT modify anything in lib/dose, lib/weather or app/api/forecast; import and call them. No diagnostic or lesion features.

## 1. Remove all assumed values
- Delete every default location (Springfield) and default Fitzpatrick type. Never show a dose number, gauge or time estimate until the user has a saved profile.
- Before setup is complete, the Now and Session screens show an empty state: "Set up your profile to see your sun budget" with a button to onboarding.

## 2. Login and saved data
- Add /login and /signup using Supabase Auth (email + password and Google). Protect Now, Session and History; Methods and Glossary stay public.
- Tables (Supabase Postgres, row-level security so users only read and write their own rows): profiles (user_id, display_name, fitzpatrick_type, home_lat, home_lon, home_label, default_surface, default_posture), sessions, dose_records, sunscreen_applications.
- Add Settings with edit profile, sign out, and "Delete my account and all data".
- Collect the minimum data. Add a short privacy note. Show a notice that the app is for ages 13+.

## 3. Onboarding (3 steps, no pre-filled answers)
1. Skin type: the standard Fitzpatrick questionnaire (eye/hair/skin color, freckling, how skin reacts to first 30-45 minutes of summer sun, tanning tendency). Score it, show the suggested type with a plain-language description, and let the user override. State that self-reported skin type is only an estimate.
2. Location: a "Use my current location" button (only requests permission on tap) and a city/ZIP search. Never guess.
3. Usual surface and posture, with icons.

## 4. Explain every abbreviation
Add an info icon and tooltip next to every term, plus a /glossary page. Use plain language as the primary label and the technical term in small text. Define: UV Index (UVI), SED (Standard Erythema Dose, 100 J/m2 of sunburn-weighted UV), MED (Minimal Erythema Dose, the smallest dose that causes visible redness), Fitzpatrick skin type, SPF, PER (Personal Exposure Ratio, the share of ambient UV your skin actually receives), CMF (Cloud Modification Factor), albedo, erythemal. Replace "burn threshold" wording with "% of your MED" and explain that 100% means minimal redness.
Rename "SED left" to "Sun budget left" with "(SED)" in small text.

## 5. More comprehensive
- Now: hero sun budget, % of MED used, time-to-threshold as a range, hourly UV Index chart for today with the user's time marked, best/worst hours, sunscreen status, and a "why is this range wide?" expandable explaining the three uncertainty sources.
- Add a Protection tips section with dermatology-based guidance tied to the current UV Index: shade, clothing, hat, sunglasses, SPF 30+ broad spectrum, 2 mg/cm2 (about a shot glass for the body), reapply every 2 hours and after swimming or sweating.
- History: weekly totals, cumulative load, per-session detail.
- Methods: keep rendering CITATIONS from lib/dose/citations.ts, and add a Limitations section (Fitzpatrick is a rough guide and less validated for darker skin; estimates are not medical advice).

## 6. Visual design: liquid glass and sunshine
- Style: liquid-glass panels (backdrop-filter blur, subtle SVG displacement refraction, thin light borders, soft inner highlights) over a warm sunrise-to-sky gradient. Use the liquid-glass-react package or an equivalent.
- Scroll: smooth scrolling with Lenis. Use GSAP ScrollTrigger or Motion useScroll so the background sky and sun position shift as the user scrolls, and cards fade and rise in.
- 3D on the Now page: a React Three Fiber scene (@react-three/fiber, @react-three/drei) that mirrors the user's choices.
  - Ground surface: grass, soil, concrete, sand, water, snow each change the floor material and color.
  - Weather (from the live forecast cloud cover): clear, partly cloudy, overcast change the sky, drei Cloud density and sun light intensity. The sun's position follows the real solar altitude.
  - Selecting a different surface or weather animates a smooth transition.
- Accessibility and performance (required): keep every number on a high-contrast solid or frosted plate readable in direct sunlight (WCAG AA), never encode risk by color alone, respect prefers-reduced-motion, lazy-load the 3D scene, cap pixel ratio at 1.5, and fall back to a static gradient image on low-power devices.

Wire everything to the existing computeDoseEstimate and /api/forecast contracts. Show loading and error states for every fetch.
