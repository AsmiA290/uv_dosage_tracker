"""
Pull Illinois county-level melanoma incidence (CDC State Cancer Profiles)
and outdoor-occupation employment counts (BLS) for the IL-13 counties, to
size the population this app is built for. This is motivating/pitch
context, NOT an input to any dose calculation -- keep it firmly out of
/lib/dose.

Brief reference: section 3 ("Pull Illinois county-level melanoma incidence
from CDC State Cancer Profiles," "Pull BLS outdoor-occupation employment
counts for IL-13 counties").

NOTE: Both CDC State Cancer Profiles and BLS require the user to either
download a CSV export from their web UI (no simple public JSON endpoint
for county-level melanoma incidence) or register for a BLS API key. This
script is written to consume locally-downloaded exports rather than
scrape either site, since that's the reliable, ToS-respecting path:

  1. CDC State Cancer Profiles (statecancerprofiles.cancer.gov) ->
     Incidence Rates -> Melanoma of the Skin -> Illinois -> County ->
     export the table as CSV to analysis/data/cdc_melanoma_il_counties.csv
  2. BLS Quarterly Census of Employment and Wages (QCEW), or
     data.bls.gov series for NAICS codes covering outdoor agricultural /
     construction / landscaping work, exported for the IL-13 counties to
     analysis/data/bls_outdoor_employment_il13.csv

Usage:
    python melanoma_and_workforce.py
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
FIG_DIR = Path(__file__).parent / "figures"
FIG_DIR.mkdir(exist_ok=True)

# IL-13 counties (2022 map), per the brief's district description
# (Springfield through Decatur and Champaign-Urbana down into the Metro East).
IL_13_COUNTIES = [
    "Sangamon", "Macon", "Champaign", "Piatt", "Madison", "St. Clair",
    "Monroe", "Christian", "Montgomery", "Macoupin", "Jersey",
    "Calhoun", "Vermilion",
]


def load_melanoma_incidence() -> pd.DataFrame:
    path = DATA_DIR / "cdc_melanoma_il_counties.csv"
    if not path.exists():
        raise SystemExit(
            f"{path} not found. Export it from statecancerprofiles.cancer.gov "
            "(Incidence Rates -> Melanoma of the Skin -> Illinois -> County) first -- see this file's docstring."
        )
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    return df[df["County"].str.replace(" County, IL", "", regex=False).isin(IL_13_COUNTIES)]


def load_outdoor_employment() -> pd.DataFrame:
    path = DATA_DIR / "bls_outdoor_employment_il13.csv"
    if not path.exists():
        raise SystemExit(
            f"{path} not found. Export QCEW outdoor-occupation employment for the IL-13 counties from BLS "
            "first -- see this file's docstring."
        )
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    return df


def plot_melanoma_by_county(df: pd.DataFrame) -> None:
    fig, ax = plt.subplots(figsize=(9, 5))
    sorted_df = df.sort_values(df.columns[-1], ascending=True)
    ax.barh(sorted_df["County"], sorted_df.iloc[:, -1], color="#b45309")
    ax.set_xlabel("Age-adjusted melanoma incidence rate (per 100,000)")
    ax.set_title("Melanoma incidence, IL-13 counties (CDC State Cancer Profiles)")
    fig.tight_layout()
    out_path = FIG_DIR / "melanoma_incidence_il13.png"
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Wrote {out_path}")


def summarize_outdoor_workforce(df: pd.DataFrame) -> None:
    total = df.select_dtypes("number").sum().sum()
    print(f"Total outdoor-occupation employment across exported IL-13 rows: {total:,.0f}")
    print("(This is the population-size figure to cite in the demo video, e.g. '~N outdoor workers in IL-13.')")


def main() -> None:
    melanoma_df = load_melanoma_incidence()
    plot_melanoma_by_county(melanoma_df)

    employment_df = load_outdoor_employment()
    summarize_outdoor_workforce(employment_df)


if __name__ == "__main__":
    main()
