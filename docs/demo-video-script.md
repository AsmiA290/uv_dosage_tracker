# Demo video script (3:00 max)

Draft script following the brief's outline (section 8). Fill in the bracketed placeholders once the app and figures exist; the structure and timing are ready to record against now.

---

**[0:00-0:30] The problem**

*(Show the minutes-to-MED heatmap from `analysis/figures/minutes_to_med_champaign_II.png`, next to the melanoma incidence bar chart from `analysis/figures/melanoma_incidence_il13.png`.)*

> "This is central Illinois in June. If you're a fair-skinned outdoor worker with no sunscreen, standing in a field at 3pm, you cross your burn threshold in under [X] minutes. Skin cancer is one of the only occupational hazards with no dosimetry, no exposure limit, and no monitoring requirement -- unlike radiation, there's no badge that tells an outdoor worker how much sun they've actually taken on. [County] has a melanoma incidence rate of [Y] per 100,000. This is that badge."

**[0:30-0:50] Who it's for**

> "IL-13 runs from Springfield through Decatur and Champaign-Urbana into the Metro East -- an agricultural district with roughly [N] outdoor workers, plus every outdoor athlete and coach in between. None of them currently have a way to know their cumulative UV dose."

**[0:50-1:50] Live walkthrough**

*(Screen-record the actual app.)*

1. Start a session -- Fitzpatrick type, surface, posture.
2. Watch the radial budget gauge deplete in near-real time; call out the time-to-threshold sentence explicitly ("42 to 68 minutes, not a single falsely precise number").
3. Trigger (or fast-forward to) the sunscreen reapplication nudge; log a reapplication.
4. Switch to History; show the week-at-a-glance chart and point out a day that approached the threshold.

**[1:50-2:30] The model**

*(Cut to the Methods screen, then a code editor.)*

> "Every number here traces back to a source." *(Pan across a few citation cards.)* "The core model lives in `/lib/dose` -- hand-written, not generated. It converts UV Index to erythemal irradiance, corrects for solar geometry, cloud cover, ground surface, and the fact that ambient UV isn't the same as what your skin actually receives -- that personal exposure ratio is the correction most consumer apps skip entirely. And instead of one falsely precise number, it Monte Carlo-simulates the uncertainty in your skin type's threshold, the forecast, and that exposure ratio into a real interval." *(Show `npm test` passing across the dose engine's test suite.)*

**[2:30-3:00] What we learned**

> "[User]'s feedback changed [specific design decision -- e.g., the reapplication nudge, or dropping background tracking in favor of explicit sessions]. Next, we'd add a coach view so a whole practice can be monitored at once. This app doesn't diagnose anything -- it just gives outdoor workers and athletes in central Illinois the exposure badge they've never had."

---

## Recording notes

- Reserve five full days for this per the brief (section 7) -- script, record, edit, caption if needed, upload.
- Show a passing `npm test` run on camera during 1:50-2:30 -- judges can request source access, but a visible green test run in the video itself is free, immediate credibility.
- Keep language exposure-focused throughout, never diagnostic ("your dose was high" not "your risk increased").
