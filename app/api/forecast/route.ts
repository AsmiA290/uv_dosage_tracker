import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchOpenMeteoForecast, ForecastFetchError } from "@/lib/weather/open-meteo";

// z.coerce.number() would silently turn a missing param (searchParams.get
// returns null) into 0 via Number(null) === 0, passing validation instead
// of failing it. Require a non-empty string first, then coerce.
const QuerySchema = z.object({
  lat: z.string().min(1).pipe(z.coerce.number().min(-90).max(90)),
  lon: z.string().min(1).pipe(z.coerce.number().min(-180).max(180)),
});

/**
 * GET /api/forecast?lat=..&lon=..
 * Server-side proxy for the Open-Meteo forecast so the API key/rate-limit
 * surface (currently none, but this is where auth would live) and response
 * validation stay off the client. Returns HourlyUVSample[] as JSON.
 * Degrades to a 503 with a clear message on upstream failure rather than
 * a raw 500 — the UI can show "forecast unavailable, showing last cached
 * value" per the brief's graceful-degradation requirement.
 */
export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({
    lat: request.nextUrl.searchParams.get("lat"),
    lon: request.nextUrl.searchParams.get("lon"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "lat and lon query params are required and must be valid coordinates." }, { status: 400 });
  }

  try {
    const samples = await fetchOpenMeteoForecast({ latitude: parsed.data.lat, longitude: parsed.data.lon });
    return NextResponse.json({ samples }, { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" } });
  } catch (err) {
    if (err instanceof ForecastFetchError) {
      return NextResponse.json({ error: "Forecast temporarily unavailable.", detail: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
