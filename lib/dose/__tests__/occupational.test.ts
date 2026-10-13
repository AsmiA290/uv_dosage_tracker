import { describe, expect, it } from "vitest";
import { computeDoseEstimate } from "../dose";
import {
  fractionOfDailyLimit,
  ICNIRP_DAILY_LIMIT_J_PER_M2,
  ICNIRP_LIMIT_IN_SED,
  sedToIcnirpEffectiveJPerM2,
  sumIntervals,
} from "../occupational";
import type { DoseEstimateInput, HourlyUVSample } from "../types";

describe("ICNIRP work-exposure conversion", () => {
  it("uses the published 30 J/m² limit and the ICNIRP 2010 solar equivalence of 1.0-1.3 SED", () => {
    expect(ICNIRP_DAILY_LIMIT_J_PER_M2).toBe(30);
    expect(ICNIRP_LIMIT_IN_SED.low).toBe(1.0);
    expect(ICNIRP_LIMIT_IN_SED.high).toBe(1.3);
  });

  it("maps the nominal SED equivalent to exactly 100% of the limit", () => {
    const share = fractionOfDailyLimit({ low: 1.15, nominal: 1.15, high: 1.15 });
    expect(share.nominal).toBeCloseTo(1, 10);
    // The same dose spans 1.15/1.3 to 1.15/1.0 of the limit once the conversion range is included.
    expect(share.low).toBeCloseTo(1.15 / 1.3, 10);
    expect(share.high).toBeCloseTo(1.15, 10);
  });

  it("keeps the interval ordered and never negative", () => {
    const e = sedToIcnirpEffectiveJPerM2({ low: -0.2, nominal: 0.5, high: 0.9 });
    expect(e.low).toBe(0);
    expect(e.low).toBeLessThanOrEqual(e.nominal);
    expect(e.nominal).toBeLessThanOrEqual(e.high);
  });

  it("sums sessions bound by bound", () => {
    expect(sumIntervals({ low: 1, nominal: 2, high: 3 }, { low: 0.5, nominal: 0.5, high: 0.5 })).toEqual({
      low: 1.5,
      nominal: 2.5,
      high: 3.5,
    });
    expect(sumIntervals()).toEqual({ low: 0, nominal: 0, high: 0 });
  });
});

// A flat UV Index of 8 for a full hour around solar noon in Champaign, IL.
function flatUv(uvi: number): HourlyUVSample[] {
  return ["2026-07-15T16:00:00Z", "2026-07-15T17:00:00Z", "2026-07-15T18:00:00Z", "2026-07-15T19:00:00Z", "2026-07-15T20:00:00Z"].map(
    (t) => ({ time: new Date(t), uvIndex: uvi }),
  );
}

function input(overrides: Partial<DoseEstimateInput> = {}): DoseEstimateInput {
  return {
    fitzpatrickType: "II",
    latitude: 40.1,
    longitude: -88.2,
    surface: "grass",
    posture: "standing",
    hourlySamples: flatUv(8),
    sessionStart: new Date("2026-07-15T17:30:00Z"),
    now: new Date("2026-07-15T17:45:00Z"),
    monteCarloSamples: 200,
    ...overrides,
  };
}

describe("dose before sunscreen (sessionIncidentDoseSED)", () => {
  it("equals the burn-model dose when no sunscreen is logged", () => {
    const r = computeDoseEstimate(input());
    expect(r.sessionIncidentDoseSED.nominal).toBeCloseTo(r.sessionDoseSED.nominal, 10);
    expect(r.sessionIncidentDoseSED.low).toBeCloseTo(r.sessionDoseSED.low, 10);
    expect(r.sessionIncidentDoseSED.high).toBeCloseTo(r.sessionDoseSED.high, 10);
  });

  it("is unaffected by sunscreen, while the burn-model dose drops", () => {
    const sunscreen = computeDoseEstimate(
      input({
        sunscreenApplications: [
          { appliedAt: new Date("2026-07-15T17:30:00Z"), labeledSPF: 30, appliedThicknessMgCm2: 2.0, wearCondition: "dry" },
        ],
      }),
    );
    const none = computeDoseEstimate(input());
    expect(sunscreen.sessionIncidentDoseSED.nominal).toBeCloseTo(none.sessionIncidentDoseSED.nominal, 10);
    expect(sunscreen.sessionDoseSED.nominal).toBeLessThan(none.sessionDoseSED.nominal / 5);
  });

  it("reaches the daily limit in roughly the time ICNIRP-based guidance reports at UV Index 8", () => {
    // Published guidance: about 10 minutes at UV Index 8 for a horizontal surface.
    // The app uses the most exposed skin (exposure ratio ~0.8), so expect a little longer.
    const fifteen = computeDoseEstimate(input());
    const share = fractionOfDailyLimit(fifteen.sessionIncidentDoseSED);
    // 15 min at UVI 8 x 0.8 = 1.44 SED, about 125% of the limit at the nominal equivalence.
    expect(fifteen.sessionIncidentDoseSED.nominal).toBeGreaterThan(1.3);
    expect(fifteen.sessionIncidentDoseSED.nominal).toBeLessThan(1.6);
    expect(share.nominal).toBeGreaterThan(1.1);
    expect(share.nominal).toBeLessThan(1.4);
  });
});
