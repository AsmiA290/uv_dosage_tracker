import { describe, expect, it } from "vitest";
import { simulateTimeToThreshold } from "../uncertainty";

describe("simulateTimeToThreshold", () => {
  const baseInputs = {
    currentDoseSED: 0,
    doseRateSEDPerMinute: 0.05,
    medRangeSED: [2.5, 5.0] as [number, number],
    perRange: [0.4, 0.6] as [number, number],
    perNominal: 0.5,
    forecastRelativeErrorSD: 0.15,
    samples: 2000,
    seed: 42,
  };

  it("is deterministic for a fixed seed", () => {
    const a = simulateTimeToThreshold(baseInputs);
    const b = simulateTimeToThreshold(baseInputs);
    expect(a).toEqual(b);
  });

  it("orders percentiles correctly: p10 <= p50 <= p90", () => {
    const result = simulateTimeToThreshold(baseInputs);
    expect(result.p10Minutes).toBeLessThanOrEqual(result.p50Minutes);
    expect(result.p50Minutes).toBeLessThanOrEqual(result.p90Minutes);
  });

  it("returns all zeros once the MED has already been exceeded", () => {
    const result = simulateTimeToThreshold({ ...baseInputs, currentDoseSED: 10 });
    expect(result.p10Minutes).toBe(0);
    expect(result.p50Minutes).toBe(0);
    expect(result.p90Minutes).toBe(0);
  });

  it("produces a plausible order of magnitude for a known dose rate", () => {
    // Median MED ~3.75 SED, rate 0.05 SED/min => nominal ~75 minutes.
    const result = simulateTimeToThreshold(baseInputs);
    expect(result.p50Minutes).toBeGreaterThan(30);
    expect(result.p50Minutes).toBeLessThan(150);
  });

  it("widens the interval as forecast uncertainty increases", () => {
    const tight = simulateTimeToThreshold({ ...baseInputs, forecastRelativeErrorSD: 0.05 });
    const wide = simulateTimeToThreshold({ ...baseInputs, forecastRelativeErrorSD: 0.4 });
    const tightSpread = tight.p90Minutes - tight.p10Minutes;
    const wideSpread = wide.p90Minutes - wide.p10Minutes;
    expect(wideSpread).toBeGreaterThan(tightSpread);
  });

  it("returns Infinity-safe results when the dose rate is zero (e.g. nighttime)", () => {
    const result = simulateTimeToThreshold({ ...baseInputs, doseRateSEDPerMinute: 0 });
    expect(result.p50Minutes).toBe(Number.POSITIVE_INFINITY);
  });
});
