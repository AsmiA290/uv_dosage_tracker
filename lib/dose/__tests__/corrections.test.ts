import { describe, expect, it } from "vitest";
import {
  albedoAdjustmentMultiplier,
  cloudModificationFactorFromCoverPct,
  empiricalCloudModificationFactor,
  personalExposureRatio,
} from "../corrections";

describe("empiricalCloudModificationFactor", () => {
  it("is 1.0 when all-sky equals clear-sky", () => {
    expect(empiricalCloudModificationFactor(6, 6)).toBeCloseTo(1, 8);
  });

  it("is less than 1 under attenuating cloud", () => {
    expect(empiricalCloudModificationFactor(3, 6)).toBeCloseTo(0.5, 8);
  });

  it("can exceed 1 for cloud-enhancement events, but is clamped", () => {
    expect(empiricalCloudModificationFactor(8, 6)).toBeGreaterThan(1);
    expect(empiricalCloudModificationFactor(100, 6)).toBeLessThanOrEqual(1.3);
  });

  it("returns 1 when clear-sky value is zero (avoids divide by zero)", () => {
    expect(empiricalCloudModificationFactor(0, 0)).toBe(1);
  });
});

describe("cloudModificationFactorFromCoverPct", () => {
  it("is ~1 for clear sky (0% cover)", () => {
    expect(cloudModificationFactorFromCoverPct(0)).toBeCloseTo(1, 6);
  });

  it("can exceed 1 for broken cloud (10-40%)", () => {
    expect(cloudModificationFactorFromCoverPct(25)).toBeGreaterThan(1);
  });

  it("attenuates substantially under full overcast", () => {
    expect(cloudModificationFactorFromCoverPct(100)).toBeLessThan(0.5);
  });

  it("is monotonically non-increasing from 40% cover to 100%", () => {
    const at40 = cloudModificationFactorFromCoverPct(40);
    const at70 = cloudModificationFactorFromCoverPct(70);
    const at100 = cloudModificationFactorFromCoverPct(100);
    expect(at40).toBeGreaterThanOrEqual(at70);
    expect(at70).toBeGreaterThanOrEqual(at100);
  });
});

describe("albedoAdjustmentMultiplier", () => {
  it("is 1.0 for the reference surface (grass)", () => {
    expect(albedoAdjustmentMultiplier("grass")).toBeCloseTo(1, 8);
  });

  it("is greater than 1 for higher-albedo surfaces (sand, snow)", () => {
    expect(albedoAdjustmentMultiplier("sand")).toBeGreaterThan(1);
    expect(albedoAdjustmentMultiplier("freshSnow")).toBeGreaterThan(albedoAdjustmentMultiplier("sand"));
  });
});

describe("personalExposureRatio", () => {
  it("returns an interval with low <= nominal <= high", () => {
    const per = personalExposureRatio("standing", "grass");
    expect(per.low).toBeLessThanOrEqual(per.nominal);
    expect(per.nominal).toBeLessThanOrEqual(per.high);
  });

  it("scales upward on a higher-albedo surface than on grass", () => {
    const onGrass = personalExposureRatio("standing", "grass");
    const onSand = personalExposureRatio("standing", "sand");
    expect(onSand.nominal).toBeGreaterThan(onGrass.nominal);
  });

  it("active sport posture has a higher nominal PER than sitting", () => {
    const sitting = personalExposureRatio("sitting", "grass");
    const sport = personalExposureRatio("activeSport", "grass");
    expect(sport.nominal).toBeGreaterThan(sitting.nominal);
  });
});
