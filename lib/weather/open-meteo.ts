import "server-only";
import type { HourlyUVSample } from "@/lib/dose/types";
import { OpenMeteoForecastResponseSchema } from "./schema";

const FORECAST_BASE = process.env.OPEN_METEO_FORECAST_BASE ?? "https://api.open-meteo.com/v1/forecast";

export interface FetchForecastOptions {
  latitude: number;
  longitude: number;
  /** Hours of forecast to request, forward from now. Open-Meteo default is 7 days; we only need a session window. */
  forecastHours?: number;
}

export class ForecastFetchError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = "ForecastFetchError";
  }
}

/**
 * Fetches hourly UV index (all-sky + clear-sky) and cloud cover from
 * Open-Meteo, validates the response shape with Zod, and maps nulls to
 * "no data" by dropping those hours rather than silently coercing to 0
 * (a 0 UVI is a legitimate nighttime value and must not be confused with
 * a missing reading).
 *
 * Intended to run in a server component or route handler — never call
 * this from client code (see app/api/forecast/route.ts for the boundary).
 */
export async function fetchOpenMeteoForecast(
  options: FetchForecastOptions,
  fetchImpl: typeof fetch = fetch
): Promise<HourlyUVSample[]> {
  const { latitude, longitude, forecastHours = 48 } = options;

  const url = new URL(FORECAST_BASE);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", "uv_index,uv_index_clear_sky,cloud_cover");
  url.searchParams.set("forecast_hours", String(forecastHours));
  url.searchParams.set("timezone", "auto");

  let raw: unknown;
  try {
    const res = await fetchImpl(url.toString(), { next: { revalidate: 900 } });
    if (!res.ok) {
      throw new ForecastFetchError(`Open-Meteo responded with ${res.status}`);
    }
    raw = await res.json();
  } catch (err) {
    if (err instanceof ForecastFetchError) throw err;
    throw new ForecastFetchError("Failed to reach Open-Meteo forecast API", err);
  }

  const parsed = OpenMeteoForecastResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ForecastFetchError(`Open-Meteo response failed validation: ${parsed.error.message}`);
  }

  const { time, uv_index, uv_index_clear_sky, cloud_cover } = parsed.data.hourly;
  const samples: HourlyUVSample[] = [];
  for (let i = 0; i < time.length; i++) {
    const uvIndex = uv_index[i];
    if (uvIndex === null || uvIndex === undefined) continue; // drop missing hours, don't coerce to 0
    samples.push({
      time: new Date(time[i]!),
      uvIndex,
      uvIndexClearSky: uv_index_clear_sky[i] ?? undefined,
      cloudCoverPct: cloud_cover?.[i] ?? undefined,
    });
  }
  return samples;
}
