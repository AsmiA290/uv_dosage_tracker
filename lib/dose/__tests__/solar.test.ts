import { describe, expect, it } from "vitest";
import { isDaylight, solarAltitudeDeg, solarWeight, solarZenithDeg } from "../solar";

// Springfield, IL
const LAT = 39.8;
const LON = -89.6;

describe("solar geometry", () => {
  it("reports the sun below the horizon at solar midnight", () => {
    const midnightUTC = new Date("2026-06-15T06:00:00Z"); // ~01:00 CDT
    expect(isDaylight(midnightUTC, LAT, LON)).toBe(false);
    expect(solarAltitudeDeg(midnightUTC, LAT, LON)).toBeLessThan(0);
  });

  it("reports the sun above the horizon near solar noon in June", () => {
    const solarNoonUTC = new Date("2026-06-15T17:45:00Z"); // ~12:45 CDT
    expect(isDaylight(solarNoonUTC, LAT, LON)).toBe(true);
    expect(solarAltitudeDeg(solarNoonUTC, LAT, LON)).toBeGreaterThan(60);
  });

  it("zenith and altitude are complementary", () => {
    const t = new Date("2026-06-15T17:45:00Z");
    const alt = solarAltitudeDeg(t, LAT, LON);
    const zen = solarZenithDeg(t, LAT, LON);
    expect(alt + zen).toBeCloseTo(90, 6);
  });

  it("solarWeight is zero below the horizon and positive above it", () => {
    const night = new Date("2026-06-15T06:00:00Z");
    const day = new Date("2026-06-15T17:45:00Z");
    expect(solarWeight(night, LAT, LON)).toBe(0);
    expect(solarWeight(day, LAT, LON)).toBeGreaterThan(0);
  });

  it("solarWeight peaks near solar noon relative to mid-afternoon", () => {
    const noon = new Date("2026-06-15T17:45:00Z");
    const afternoon = new Date("2026-06-15T21:00:00Z");
    expect(solarWeight(noon, LAT, LON)).toBeGreaterThan(solarWeight(afternoon, LAT, LON));
  });
});
