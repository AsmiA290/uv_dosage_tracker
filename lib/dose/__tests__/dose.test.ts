import { describe, expect, it } from "vitest";
import { computeDoseEstimate } from "../dose";
import type { DoseEstimateInput, HourlyUVSample } from "../types";

// Champaign, IL — a bright, clear June afternoon.
const LAT = 40.1;
const LON = -88.2;

function hourly(times: string[], uvIndex: number[], clearSky?: number[]): HourlyUVSample[] {
  return times.map((t, i) => ({
    time: new Date(t),
    uvIndex: uvIndex[i]!,
    uvIndexClearSky: clearSky ? clearSky[i] : undefined,
  }));
}

function baseInput(overrides: Partial<DoseEstimateInput> = {}): DoseEstimateInput {
  const hourlySamples = hourly(
    ["2026-06-15T17:00:00Z", "2026-06-15T18:00:00Z", "2026-06-15T19:00:00Z", "2026-06-15T20:00:00Z"],
    [7, 9, 9, 7],
    [7.5, 9.2, 9.2, 7.5]
  );
  return {
    fitzpatrickType: "II",
    latitude: LAT,
    longitude: LON,
    surface: "grass",
    posture: "standing",
    hourlySamples,
    sessionStart: new Date("2026-06-15T18:00:00Z"),
    now: new Date("2026-06-15T19:00:00Z"),
    monteCarloSamples: 500,
    ...overrides,
  };
}

describe("computeDoseEstimate", () => {
  it("accumulates positive dose during a sunny midday hour", () => {
    const result = computeDoseEstimate(baseInput());
    expect(result.cumulativeDoseSED.nominal).toBeGreaterThan(0);
    expect(result.cumulativeDoseSED.low).toBeLessThanOrEqual(result.cumulativeDoseSED.nominal);
    expect(result.cumulativeDoseSED.nominal).toBeLessThanOrEqual(result.cumulativeDoseSED.high);
  });

  it("produces zero cumulative dose when sessionStart === now", () => {
    const input = baseInput({ now: new Date("2026-06-15T18:00:00Z") });
    const result = computeDoseEstimate(input);
    expect(result.cumulativeDoseSED.nominal).toBeCloseTo(0, 6);
  });

  it("remaining budget shrinks as cumulative dose grows", () => {
    const short = computeDoseEstimate(baseInput({ now: new Date("2026-06-15T18:30:00Z") }));
    const long = computeDoseEstimate(baseInput({ now: new Date("2026-06-15T20:00:00Z") }));
    expect(long.remainingBudgetSED.nominal).toBeLessThan(short.remainingBudgetSED.nominal);
  });

  it("a higher Fitzpatrick type yields a larger MED threshold and more remaining budget", () => {
    const typeI = computeDoseEstimate(baseInput({ fitzpatrickType: "I" }));
    const typeVI = computeDoseEstimate(baseInput({ fitzpatrickType: "VI" }));
    expect(typeVI.medThresholdSED.nominal).toBeGreaterThan(typeI.medThresholdSED.nominal);
    expect(typeVI.remainingBudgetSED.nominal).toBeGreaterThan(typeI.remainingBudgetSED.nominal);
  });

  it("sunscreen reduces cumulative dose relative to no protection", () => {
    const unprotected = computeDoseEstimate(baseInput());
    const protectedInput = baseInput({
      sunscreenApplications: [
        {
          appliedAt: new Date("2026-06-15T18:00:00Z"),
          labeledSPF: 30,
          appliedThicknessMgCm2: 2.0,
          wearCondition: "dry",
        },
      ],
    });
    const protectedResult = computeDoseEstimate(protectedInput);
    expect(protectedResult.cumulativeDoseSED.nominal).toBeLessThan(unprotected.cumulativeDoseSED.nominal);
  });

  it("standing on sand accumulates more dose than standing on grass, all else equal", () => {
    const onGrass = computeDoseEstimate(baseInput({ surface: "grass" }));
    const onSand = computeDoseEstimate(baseInput({ surface: "sand" }));
    expect(onSand.cumulativeDoseSED.nominal).toBeGreaterThan(onGrass.cumulativeDoseSED.nominal);
  });

  it("time-to-threshold percentiles are ordered p10 <= p50 <= p90", () => {
    const result = computeDoseEstimate(baseInput());
    expect(result.timeToThreshold.p10Minutes).toBeLessThanOrEqual(result.timeToThreshold.p50Minutes);
    expect(result.timeToThreshold.p50Minutes).toBeLessThanOrEqual(result.timeToThreshold.p90Minutes);
  });

  it("computes an empirical CMF close to 1 when clear-sky and all-sky nearly match", () => {
    const result = computeDoseEstimate(baseInput());
    expect(result.cloudModificationFactors.length).toBeGreaterThan(0);
    for (const { cmf } of result.cloudModificationFactors) {
      expect(cmf).toBeGreaterThan(0.9);
      expect(cmf).toBeLessThan(1.1);
    }
  });

  it("returns a minute-resolution series covering the session window", () => {
    const result = computeDoseEstimate(baseInput());
    expect(result.minuteSeries.length).toBeGreaterThan(50);
    expect(result.minuteSeries[0]!.time.getTime()).toBeGreaterThanOrEqual(
      new Date("2026-06-15T18:00:00Z").getTime()
    );
  });
});
