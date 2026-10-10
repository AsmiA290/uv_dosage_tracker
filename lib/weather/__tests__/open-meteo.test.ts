import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchOpenMeteoForecast } from "../open-meteo";

describe("fetchOpenMeteoForecast time handling", () => {
  it("requests GMT unix timestamps and parses them as absolute UTC instants", async () => {
    let requested = "";
    // 2026-07-15 18:00 UTC = 13:00 CDT (solar noon-ish in Illinois)
    const noonUtcSeconds = Date.UTC(2026, 6, 15, 18, 0) / 1000;
    const fakeFetch = (async (url: string) => {
      requested = url;
      return new Response(
        JSON.stringify({
          latitude: 39.78,
          longitude: -89.65,
          timezone: "GMT",
          hourly: {
            time: [noonUtcSeconds, noonUtcSeconds + 3600],
            uv_index: [9, null],
            uv_index_clear_sky: [9.2, 8.5],
          },
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const samples = await fetchOpenMeteoForecast({ latitude: 39.78, longitude: -89.65 }, fakeFetch);
    const params = new URL(requested).searchParams;
    expect(params.get("timezone")).toBe("GMT");
    expect(params.get("timeformat")).toBe("unixtime");
    expect(Number(params.get("past_hours"))).toBeGreaterThan(0);
    // Independent of the runtime's own time zone:
    expect(samples).toHaveLength(1); // null hour dropped, not coerced to 0
    expect(samples[0]!.time.toISOString()).toBe("2026-07-15T18:00:00.000Z");
  });
});
