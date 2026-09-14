# /analysis

Python notebook-equivalent scripts supporting the app's evidence base (brief, weeks 1-2 and 3). Kept separate from `/lib/dose` (TypeScript, runs in the app) and `/lib/dose/__tests__` (the credibility artifact for the technical-challenge question) -- this directory is where the *district-specific evidence* gets built: the historical UV analysis, the minutes-to-MED heatmap that opens the demo video, and the cross-validation against a second, independent UV data source.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Scripts, in the order the brief's checklist calls for them

1. **`fetch_historical_uv.py`** -- pulls 10 years of hourly UV index (ERA5, via Open-Meteo's Historical Weather API) for Springfield, Decatur, and Champaign, IL, and caches it to `analysis/data/*.csv` (git-ignored -- regenerate locally, don't commit raw weather data to the repo).
2. **`minutes_to_med_surface.py`** -- consumes that cached data and computes, for each city and each Fitzpatrick type, a day-of-year x hour-of-day surface of "minutes until MED at this time of year and time of day." Produces the heatmap figure the brief calls "the figure that opens the video" (section 4). Uses the *same* MED ranges and UVI->irradiance conversion as `lib/dose/constants.ts` and `lib/dose/irradiance.ts` -- see the constants block at the top of the script, which must be kept in sync by hand (there are only three numbers to copy; a build-time codegen step would be overkill for a project this size).
3. **`cross_validate_epa.py`** -- for a shared set of ZIP/hour combinations, pulls both Open-Meteo's forecast UV index and the EPA Envirofacts UV API's value, and produces an agreement (scatter + Bland-Altman-style difference) plot. This is the artifact that answers "how do you know your primary data source is trustworthy" and is worth more to a technical judge than most UI polish.
4. **`melanoma_and_workforce.py`** -- pulls Illinois county-level melanoma incidence (CDC State Cancer Profiles) and outdoor-occupation employment counts (BLS) for the IL-13 counties, to size the population the app is built for. This is motivating context for the pitch, not app logic -- it does not feed into any dose calculation.

## A note on keeping this in sync with `/lib/dose`

These scripts intentionally duplicate a small number of physical constants (the UVI-to-irradiance factor, the MED ranges) rather than importing the TypeScript module, since Python and Node don't share a runtime. If you change a constant in `lib/dose/constants.ts`, update the corresponding constant here too -- each script's constants block says exactly which file to check against.
