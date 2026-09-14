"""
Pull 10 years of hourly UV index (ERA5 reanalysis, via Open-Meteo's free
Historical Weather API) for the three anchor cities of IL-13, and cache
the result locally as CSV.

Brief reference: section 3 ("Week 1 to 2: the scientific core... Pull ten
years of historical hourly UV for Springfield, Decatur, and Champaign via
Open-Meteo Historical (ERA5)").

Usage:
    python fetch_historical_uv.py
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# IL-13 anchor cities (brief, section 1).
CITIES = {
    "springfield": (39.78, -89.65),
    "decatur": (39.84, -88.95),
    "champaign": (40.12, -88.24),
}

HISTORICAL_BASE = "https://archive-api.open-meteo.com/v1/archive"
YEARS_OF_HISTORY = 10


def build_client() -> openmeteo_requests.Client:
    cache_session = requests_cache.CachedSession(str(DATA_DIR / ".http_cache"), expire_after=-1)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.5)
    return openmeteo_requests.Client(session=retry_session)


def fetch_city(client: openmeteo_requests.Client, name: str, lat: float, lon: float) -> pd.DataFrame:
    end = dt.date.today() - dt.timedelta(days=7)  # archive API has a short lag
    start = end.replace(year=end.year - YEARS_OF_HISTORY)

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": ["uv_index", "uv_index_clear_sky", "cloud_cover"],
        "timezone": "America/Chicago",
    }
    responses = client.weather_api(HISTORICAL_BASE, params=params)
    response = responses[0]
    hourly = response.Hourly()

    times = pd.date_range(
        start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
        end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=hourly.Interval()),
        inclusive="left",
    )
    df = pd.DataFrame(
        {
            "time": times,
            "uv_index": hourly.Variables(0).ValuesAsNumpy(),
            "uv_index_clear_sky": hourly.Variables(1).ValuesAsNumpy(),
            "cloud_cover": hourly.Variables(2).ValuesAsNumpy(),
        }
    )
    df["city"] = name
    return df


def main() -> None:
    client = build_client()
    frames = []
    for name, (lat, lon) in CITIES.items():
        print(f"Fetching {YEARS_OF_HISTORY} years of hourly UV for {name}...")
        frames.append(fetch_city(client, name, lat, lon))

    combined = pd.concat(frames, ignore_index=True)
    out_path = DATA_DIR / "historical_uv_il13.csv"
    combined.to_csv(out_path, index=False)
    print(f"Wrote {len(combined):,} rows to {out_path}")


if __name__ == "__main__":
    main()
