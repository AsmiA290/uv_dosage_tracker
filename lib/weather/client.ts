import type { HourlyUVSample } from "@/lib/dose/types";

/**
 * Browser-safe forecast fetch. `lib/weather/open-meteo.ts` is marked
 * `server-only` on purpose, so client components go through the
 * `/api/forecast` route handler instead of calling it directly.
 */
export async function fetchOpenMeteoForecastClient(
  latitude: number,
  longitude: number
): Promise<HourlyUVSample[]> {
  const url = `/api/forecast?lat=${latitude}&lon=${longitude}`;
  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok || "error" in body) {
    throw new Error(body.error ?? "Forecast temporarily unavailable.");
  }

  const samples = body.samples as Array<Omit<HourlyUVSample, "time"> & { time: string }>;
  return samples.map((s) => ({ ...s, time: new Date(s.time) }));
}
