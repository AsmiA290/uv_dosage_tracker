# Exit questionnaire -- draft answers

Per the brief (section 9). Fill in bracketed placeholders as the project develops; the structure and the "why this answer" reasoning are ready now.

## App title

**UV Dose Tracker** (working title -- consider something with more identity before submission, e.g. "SunBadge" or "Dose/IL," but don't let naming become a time sink).

## Purpose

A personal UV exposure tracker for outdoor workers and athletes in central Illinois. It converts real-time UV forecast data into a personalized cumulative dose estimate -- accounting for skin type, ground surface, posture, and sunscreen use -- and tells the user how much longer they can safely stay in the sun, as a calibrated range rather than a single number.

## What inspired it

IL-13 is an agricultural district. Outdoor agricultural workers carry among the highest occupational UV doses of any group, yet unlike a radiation worker's dosimetry badge, there is no equivalent monitoring, exposure limit, or even awareness tool for UV. [Add your own personal connection here if you have one -- a family member who works outdoors, a coach, a personal experience with sunburn/skin health -- genuine specificity beats a generic civic-good framing.]

## Technical or coding difficulty faced, and how you addressed it

Three strong, genuine candidates (pick the one you can speak to in the most depth, or blend two):

1. **Ambient vs. personal dose.** Every public UV forecast reports irradiance on a horizontal plane at ground level. A standing person's face and shoulders receive a fraction of that -- roughly 40-60%, and it changes with posture and solar angle. Building the personal exposure ratio correction meant learning that "the UV Index right now" and "the UV dose I'm actually receiving" are fundamentally different quantities, and that most consumer UV apps conflate them. [Describe the specific research/implementation process -- e.g., finding the personal-dosimetry literature, deciding on a posture-based default, testing it against the naive ambient-only version.]

2. **Uncertainty propagation.** Rather than reporting a single "you'll burn in 47 minutes," the app propagates three independent sources of uncertainty -- the published range for minimal erythemal dose at the user's skin type, the UV forecast's own error, and the personal exposure ratio's range -- through a Monte Carlo simulation to produce a calibrated interval. [Describe wrestling with how to combine independent uncertainties correctly, and why reporting a single number would have been dishonest given how much the underlying literature disagrees on exact MED values.]

3. **Timezone- and solar-geometry-aware interpolation.** Forecast APIs deliver UV Index once per hour, but UV doesn't move linearly between those points -- it follows the solar elevation curve. Naive linear interpolation between hourly forecast points systematically distorts dose near sunrise, sunset, and solar noon. [Describe building the solar-weighted interpolation in `lib/dose/irradiance.ts` and how you validated it, e.g., against the raw hourly values themselves.]

**Avoid:** anything that reduces to "getting v0/AI to generate the right component" or CSS/styling difficulty -- those are real but don't demonstrate the underlying technical skill this question is scored on.

## Notes for the written reflection sections (real user testing)

Once you've run the three user sessions the brief calls for (an outdoor coach, a grounds/farm crew member, one other), record:
- What they misunderstood on first use, and what UI/copy change fixed it.
- Any feature they asked for that you deliberately did NOT build, and why (ties back to the "no scope creep past four screens" constraint).
- One quote you can use verbatim in the demo video's closing section.
