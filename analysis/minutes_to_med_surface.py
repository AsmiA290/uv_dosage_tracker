"""
Compute, per city and per Fitzpatrick type, a day-of-year x hour-of-day
surface of "minutes of unprotected exposure until MED is reached," and
render it as the heatmap the brief calls "the figure that opens the video"
(section 4): "an unprotected type II person at a 3pm June practice or field
shift crosses their burn threshold in under half an hour."

Keep these three constants in sync BY HAND with lib/dose/constants.ts and
lib/dose/irradiance.ts -- see analysis/README.md.

Usage:
    python minutes_to_med_surface.py
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
FIG_DIR = Path(__file__).parent / "figures"
FIG_DIR.mkdir(exist_ok=True)

# --- Keep in sync with lib/dose/constants.ts and lib/dose/irradiance.ts ---
UVI_TO_WM2 = 0.025  # lib/dose/constants.ts: UVI_TO_WM2
JOULES_PER_SED = 100.0  # lib/dose/constants.ts: JOULES_PER_SED
MED_RANGES_SED = {  # lib/dose/constants.ts: MED_RANGES_SED (nominal = midpoint)
    "I": (1.5, 3.4),
    "II": (2.5, 5.0),
    "III": (3.0, 6.0),
    "IV": (4.5, 8.0),
    "V": (6.0, 10.0),
    "VI": (8.0, 15.0),
}
# ---------------------------------------------------------------------------


def minutes_to_med(uv_index: float, med_sed: float) -> float:
    """Minutes of unprotected, ambient-plane exposure to reach `med_sed`
    SED at a constant `uv_index`. NOTE: this is deliberately the *ambient*
    (not personal-exposure-ratio-corrected) figure for this headline chart,
    matching how the brief frames the opening claim ("an unprotected person
    ... crosses their burn threshold") -- the in-app dose engine applies the
    additional personal exposure ratio correction on top of this.
    """
    if uv_index <= 0:
        return float("inf")
    irradiance_wm2 = uv_index * UVI_TO_WM2
    joules_per_m2_needed = med_sed * JOULES_PER_SED
    seconds = joules_per_m2_needed / irradiance_wm2
    return seconds / 60.0


def build_surface(df_city: pd.DataFrame, med_sed_nominal: float) -> pd.DataFrame:
    df_city = df_city.copy()
    df_city["hour"] = df_city["time"].dt.hour
    df_city["doy"] = df_city["time"].dt.dayofyear
    df_city["minutes_to_med"] = df_city["uv_index"].apply(lambda uvi: minutes_to_med(uvi, med_sed_nominal))
    pivot = df_city.pivot_table(index="hour", columns="doy", values="minutes_to_med", aggfunc="median")
    return pivot


def plot_surface(pivot: pd.DataFrame, city: str, fitz_type: str, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 4))
    capped = pivot.clip(upper=120)  # cap for readability; >120 min reads as "effectively safe"
    im = ax.imshow(capped, aspect="auto", origin="lower", cmap="RdYlGn", vmin=0, vmax=120)
    ax.set_xlabel("Day of year")
    ax.set_ylabel("Hour of day (local)")
    ax.set_title(f"Minutes to MED, unprotected, Fitzpatrick {fitz_type} -- {city.title()}, IL-13")
    cbar = fig.colorbar(im, ax=ax)
    cbar.set_label("Minutes to MED (capped at 120)")
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Wrote {out_path}")


def main() -> None:
    csv_path = DATA_DIR / "historical_uv_il13.csv"
    if not csv_path.exists():
        raise SystemExit(f"{csv_path} not found -- run fetch_historical_uv.py first.")

    df = pd.read_csv(csv_path, parse_dates=["time"])

    for city in df["city"].unique():
        df_city = df[df["city"] == city]
        for fitz_type, (low, high) in MED_RANGES_SED.items():
            nominal = (low + high) / 2
            pivot = build_surface(df_city, nominal)
            plot_surface(pivot, city, fitz_type, FIG_DIR / f"minutes_to_med_{city}_{fitz_type}.png")

    # Headline stat for the video script: median minutes-to-MED at 3pm in June
    # for an unprotected Type II person, across all three cities.
    june_3pm = df[(df["time"].dt.month == 6) & (df["time"].dt.hour == 15)]
    med_ii_nominal = (MED_RANGES_SED["II"][0] + MED_RANGES_SED["II"][1]) / 2
    minutes = june_3pm["uv_index"].apply(lambda uvi: minutes_to_med(uvi, med_ii_nominal))
    print(f"\nHeadline stat -- median minutes-to-MED, Type II, 3pm in June, IL-13 cities: {np.median(minutes):.1f} min")


if __name__ == "__main__":
    main()
