"""
Cross-validate Open-Meteo's UV index against the EPA Envirofacts UV API
for the same ZIP codes and hours, and produce an agreement plot.

Brief reference: section 3 ("Cross-validate Open-Meteo against the EPA
Envirofacts UV API for the same ZIP and same hours; produce an agreement
plot") and section 4 (data sources table -- EPA API used "as cross-
validation and as a federal-data talking point").

The EPA Envirofacts UV API returns a *daily* forecast curve (hourly points
for the current day) per ZIP, not a historical archive, so realistically
this script is run repeatedly over a few days to accumulate enough paired
points for a meaningful agreement plot -- each run appends to a local CSV.

Usage:
    python cross_validate_epa.py
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import openmeteo_requests
import pandas as pd
import requests
import requests_cache
from retry_requests import retry

DATA_DIR = Path(__file__).parent / "data"
FIG_DIR = Path(__file__).parent / "figures"
DATA_DIR.mkdir(exist_ok=True)
FIG_DIR.mkdir(exist_ok=True)

EPA_BASE = "https://data.epa.gov/efservice"
# IL-13 anchor ZIPs (Springfield, Decatur, Champaign).
ZIP_COORDS = {
    "62701": (39.80, -89.64),  # Springfield
    "62521": (39.84, -88.95),  # Decatur
    "61820": (40.11, -88.21),  # Champaign
}

ACCUMULATED_CSV = DATA_DIR / "epa_open_meteo_pairs.csv"


def fetch_epa_uv(zip_code: str) -> pd.DataFrame:
    """EPA Envirofacts UV_HOURLY table, filtered by ZIP. Public, no API key."""
    url = f"{EPA_BASE}/getEnvirofactsUVHOURLY/ZIP/{zip_code}/JSON"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    rows = resp.json()
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["time"] = pd.to_datetime(df["DATE_TIME"], format="%b/%d/%Y %I %p", errors="coerce")
    df = df.dropna(subset=["time"])
    df["uv_index_epa"] = pd.to_numeric(df["UV_VALUE"], errors="coerce")
    df["zip"] = zip_code
    return df[["zip", "time", "uv_index_epa"]]


def fetch_open_meteo_uv(lat: float, lon: float) -> pd.DataFrame:
    cache_session = requests_cache.CachedSession(str(DATA_DIR / ".http_cache"), expire_after=1800)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.5)
    client = openmeteo_requests.Client(session=retry_session)

    params = {"latitude": lat, "longitude": lon, "hourly": ["uv_index"], "forecast_days": 2, "timezone": "America/Chicago"}
    responses = client.weather_api("https://api.open-meteo.com/v1/forecast", params=params)
    response = responses[0]
    hourly = response.Hourly()
    times = pd.date_range(
        start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
        end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=hourly.Interval()),
        inclusive="left",
    )
    return pd.DataFrame({"time": times.tz_convert("America/Chicago").tz_localize(None), "uv_index_open_meteo": hourly.Variables(0).ValuesAsNumpy()})


def collect_pairs() -> pd.DataFrame:
    frames = []
    for zip_code, (lat, lon) in ZIP_COORDS.items():
        print(f"Fetching EPA + Open-Meteo UV for ZIP {zip_code}...")
        epa = fetch_epa_uv(zip_code)
        if epa.empty:
            print(f"  no EPA data returned for {zip_code}, skipping")
            continue
        om = fetch_open_meteo_uv(lat, lon)
        merged = pd.merge_asof(
            epa.sort_values("time"), om.sort_values("time"), on="time", direction="nearest", tolerance=pd.Timedelta("30min")
        ).dropna(subset=["uv_index_open_meteo"])
        frames.append(merged)

    new_pairs = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    if ACCUMULATED_CSV.exists():
        existing = pd.read_csv(ACCUMULATED_CSV, parse_dates=["time"])
        combined = pd.concat([existing, new_pairs], ignore_index=True).drop_duplicates(subset=["zip", "time"])
    else:
        combined = new_pairs
    combined.to_csv(ACCUMULATED_CSV, index=False)
    return combined


def plot_agreement(df: pd.DataFrame) -> None:
    if len(df) < 5:
        print(f"Only {len(df)} paired points so far -- run this script again on a few more days before plotting.")
        return

    diff = df["uv_index_open_meteo"] - df["uv_index_epa"]
    mean_val = (df["uv_index_open_meteo"] + df["uv_index_epa"]) / 2

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))

    axes[0].scatter(df["uv_index_epa"], df["uv_index_open_meteo"], alpha=0.5, s=14)
    lims = [0, max(df["uv_index_epa"].max(), df["uv_index_open_meteo"].max()) + 1]
    axes[0].plot(lims, lims, "k--", linewidth=1, label="1:1 line")
    axes[0].set_xlabel("EPA Envirofacts UV Index")
    axes[0].set_ylabel("Open-Meteo UV Index")
    axes[0].set_title("Scatter agreement")
    axes[0].legend()

    axes[1].scatter(mean_val, diff, alpha=0.5, s=14)
    axes[1].axhline(diff.mean(), color="red", linestyle="--", label=f"mean diff = {diff.mean():.2f}")
    axes[1].axhline(diff.mean() + 1.96 * diff.std(), color="gray", linestyle=":")
    axes[1].axhline(diff.mean() - 1.96 * diff.std(), color="gray", linestyle=":")
    axes[1].set_xlabel("Mean of the two sources")
    axes[1].set_ylabel("Open-Meteo minus EPA")
    axes[1].set_title("Bland-Altman style agreement")
    axes[1].legend()

    fig.suptitle("Open-Meteo vs. EPA Envirofacts UV Index -- IL-13 ZIPs")
    fig.tight_layout()
    out_path = FIG_DIR / "epa_open_meteo_agreement.png"
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"Wrote {out_path}")
    print(f"n = {len(df)} paired points, mean diff = {diff.mean():.2f} UVI, RMSE = {np.sqrt((diff**2).mean()):.2f} UVI")


def main() -> None:
    combined = collect_pairs()
    plot_agreement(combined)


if __name__ == "__main__":
    main()
