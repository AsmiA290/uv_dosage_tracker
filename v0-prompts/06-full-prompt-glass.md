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

## 6. Visual design: match this reference
Reference: https://dribbble.com/shots/25898869-Weather-Forecasting-Web-Design (Gapsy Studio). Recreate its structure and feel, adapted to UV:
- Full-bleed, immersive background that IS the weather: a large atmospheric sky/cloud image or 3D scene fills the whole Now page behind everything. It changes with the live forecast and with the user's choices (clear sun, partly cloudy, overcast, storm).
- A large, thin, light-weight headline in the top-left that states the condition ("Clear skies, very high UV"), a one-line description beneath, and a huge hero number (the Sun budget left) with the small unit and a location line under it, like the "22 deg" in the reference.
- Frosted liquid-glass panels stacked on the right side (single column on mobile): (a) hourly UV Index as a smooth wave/line chart, (b) sunrise-to-sunset sun arc with the current sun position and the user's time marked, (c) time-to-threshold range, (d) sunscreen status. Panels have rounded corners, thin light borders, blur, and subtle inner highlights.
- Slim top bar: small brand mark, nav (Now, Session, History, Methods, Glossary) as icons with labels on hover, date/time, and a profile chip with avatar and name.
- Glass implementation: use liquid-glass-react on the 2-3 hero panels and plain CSS glass (backdrop-filter: blur(18px) saturate(160%), 1px translucent white border, inset top highlight) for the rest.
- Ground and weather in 3D: a React Three Fiber scene (@react-three/fiber, @react-three/drei) fills the background. The selected surface (grass, soil, concrete, sand, water, snow) changes the floor material and color; the live cloud cover changes drei Cloud density, sky color and sun light; the sun position follows real solar altitude. Changing a selection animates smoothly.
- Scroll: Lenis smooth scrolling plus GSAP ScrollTrigger or Motion useScroll. As the user scrolls, the background sky and sun shift, and sections below the hero (protection tips, hourly detail, glossary teasers) fade and rise in on glass cards.
- Legibility rules (required, this app is used in direct sunlight): all numbers and body text sit on a frosted plate with at least WCAG AA contrast, never directly on the photo; use a dark-glass variant on bright skies and a light-glass variant on dark skies; the hero number gets its own high-contrast plate; never encode risk by color alone (always a number and a word); respect prefers-reduced-motion; lazy-load the 3D scene, cap pixel ratio at 1.5, and fall back to a static gradient or image on low-power devices.

Wire everything to the existing computeDoseEstimate and /api/forecast contracts. Show loading and error states for every fetch.
