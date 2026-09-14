import { describe, expect, it } from "vitest";
import {
  erythemalIrradianceWm2ToUvi,
  integrateErythemalDoseSED,
  interpolateHourlyToMinutes,
  joulesPerM2ToSED,
  sedToJoulesPerM2,
  uviToErythemalIrradianceWm2,
} from "../irradiance";
import type { HourlyUVSample } from "../types";

describe("uviToErythemalIrradianceWm2", () => {
  it("converts UVI 1 to 25 mW/m^2 (0.025 W/m^2)", () => {
    expect(uviToErythemalIrradianceWm2(1)).toBeCloseTo(0.025, 10);
  });

  it("scales linearly", () => {
    expect(uviToErythemalIrradianceWm2(8)).toBeCloseTo(0.2, 10);
  });

  it("clamps negative UVI to zero", () => {
    expect(uviToErythemalIrradianceWm2(-3)).toBe(0);
  });

  it("round-trips with erythemalIrradianceWm2ToUvi", () => {
    expect(erythemalIrradianceWm2ToUvi(uviToErythemalIrradianceWm2(6.4))).toBeCloseTo(6.4, 8);
  });
});

describe("SED conversions", () => {
  it("100 J/m^2 is exactly 1 SED", () => {
    expect(joulesPerM2ToSED(100)).toBe(1);
  });

  it("round-trips", () => {
    expect(sedToJoulesPerM2(joulesPerM2ToSED(437))).toBeCloseTo(437, 8);
  });
});

describe("integrateErythemalDoseSED", () => {
  it("returns 0 for fewer than two points", () => {
    expect(integrateErythemalDoseSED([])).toBe(0);
    expect(integrateErythemalDoseSED([{ time: new Date(), uvIndex: 5 }])).toBe(0);
  });

  it("matches the closed-form trapezoid for a constant UVI held for exactly 1 hour", () => {
    // Constant UVI=8 for 3600s => irradiance 0.2 W/m^2 * 3600s = 720 J/m^2 = 7.2 SED
    const t0 = new Date("2026-06-15T18:00:00Z");
    const t1 = new Date("2026-06-15T19:00:00Z");
    const series = [
      { time: t0, uvIndex: 8 },
      { time: t1, uvIndex: 8 },
    ];
    expect(integrateErythemalDoseSED(series)).toBeCloseTo(7.2, 6);
  });

  it("integrates a linear ramp correctly via the trapezoid rule", () => {
    // UVI ramps 0 -> 10 linearly over 600s. Trapezoid average irradiance = 0.125 W/m^2.
    // Dose = 0.125 * 600 = 75 J/m^2 = 0.75 SED.
    const t0 = new Date("2026-06-15T12:00:00Z");
    const t1 = new Date("2026-06-15T12:10:00Z");
    const series = [
      { time: t0, uvIndex: 0 },
      { time: t1, uvIndex: 10 },
    ];
    expect(integrateErythemalDoseSED(series)).toBeCloseTo(0.75, 6);
  });

  it("is monotonically increasing as more time/points are added", () => {
    const t0 = new Date("2026-06-15T12:00:00Z");
    const points = Array.from({ length: 10 }, (_, i) => ({
      time: new Date(t0.getTime() + i * 60_000),
      uvIndex: 5,
    }));
    const partial = integrateErythemalDoseSED(points.slice(0, 5));
    const full = integrateErythemalDoseSED(points);
    expect(full).toBeGreaterThan(partial);
  });
});

describe("interpolateHourlyToMinutes", () => {
  const lat = 39.8; // Springfield, IL
  const lon = -89.6;

  it("returns an empty array for an empty input", () => {
    expect(interpolateHourlyToMinutes([], lat, lon, new Date(), new Date())).toEqual([]);
  });

  it("reproduces the hourly anchor value at the final anchor timestamp", () => {
    const samples: HourlyUVSample[] = [
      { time: new Date("2026-06-15T17:00:00Z"), uvIndex: 6 },
      { time: new Date("2026-06-15T18:00:00Z"), uvIndex: 9 },
    ];
    const start = samples[0]!.time;
    const end = samples[1]!.time;
    const minutes = interpolateHourlyToMinutes(samples, lat, lon, start, end);
    const last = minutes[minutes.length - 1]!;
    expect(last.time.getTime()).toBe(end.getTime());
    expect(last.uvIndex).toBeCloseTo(9, 6);
  });

  it("produces one sample per minute across a 2-hour window", () => {
    const samples: HourlyUVSample[] = [
      { time: new Date("2026-06-15T16:00:00Z"), uvIndex: 4 },
      { time: new Date("2026-06-15T17:00:00Z"), uvIndex: 7 },
      { time: new Date("2026-06-15T18:00:00Z"), uvIndex: 6 },
    ];
    const start = samples[0]!.time;
    const end = samples[2]!.time;
    const minutes = interpolateHourlyToMinutes(samples, lat, lon, start, end);
    // 120 minutes spanned, inclusive of both anchors => 121 points expected.
    expect(minutes.length).toBe(121);
  });

  it("never produces negative UV Index values", () => {
    const samples: HourlyUVSample[] = [
      { time: new Date("2026-06-15T00:00:00Z"), uvIndex: 0 },
      { time: new Date("2026-06-15T01:00:00Z"), uvIndex: 0.2 },
    ];
    const minutes = interpolateHourlyToMinutes(samples, lat, lon, samples[0]!.time, samples[1]!.time);
    expect(minutes.every((m) => m.uvIndex >= 0)).toBe(true);
  });
});
