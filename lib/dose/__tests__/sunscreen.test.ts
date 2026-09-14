import { describe, expect, it } from "vitest";
import {
  activeSPFAtTime,
  effectiveSPF,
  effectiveSPFAtTime,
  protectionMultiplier,
  remainingAppliedThicknessMgCm2,
  shouldReapply,
} from "../sunscreen";
import type { SunscreenApplication } from "../types";

describe("effectiveSPF", () => {
  it("returns the full labeled SPF at the 2.0 mg/cm^2 reference thickness", () => {
    expect(effectiveSPF(30, 2.0)).toBeCloseTo(30, 6);
  });

  it("falls off non-linearly (steeply) at half the reference thickness", () => {
    const half = effectiveSPF(30, 1.0);
    // SPF^0.5 = sqrt(30) ~= 5.48, dramatically below half of 30 (15).
    expect(half).toBeCloseTo(Math.sqrt(30), 6);
    expect(half).toBeLessThan(15);
  });

  it("returns 1 (no protection) at zero applied thickness", () => {
    expect(effectiveSPF(50, 0)).toBe(1);
  });

  it("returns 1 for an SPF <= 1 product", () => {
    expect(effectiveSPF(1, 2.0)).toBe(1);
  });
});

describe("remainingAppliedThicknessMgCm2", () => {
  it("equals the initial thickness at t=0", () => {
    expect(remainingAppliedThicknessMgCm2(2.0, 0, "dry")).toBeCloseTo(2.0, 8);
  });

  it("halves after exactly one half-life", () => {
    expect(remainingAppliedThicknessMgCm2(2.0, 150, "dry")).toBeCloseTo(1.0, 6);
  });

  it("wears off faster while swimming than dry", () => {
    const dry = remainingAppliedThicknessMgCm2(2.0, 60, "dry");
    const swimming = remainingAppliedThicknessMgCm2(2.0, 60, "swimming");
    expect(swimming).toBeLessThan(dry);
  });
});

describe("effectiveSPFAtTime / activeSPFAtTime", () => {
  const applied: SunscreenApplication = {
    appliedAt: new Date("2026-06-15T14:00:00Z"),
    labeledSPF: 30,
    appliedThicknessMgCm2: 2.0,
    wearCondition: "dry",
  };

  it("is the full labeled SPF immediately after application", () => {
    expect(effectiveSPFAtTime(applied, applied.appliedAt)).toBeCloseTo(30, 4);
  });

  it("decays over time", () => {
    const later = new Date(applied.appliedAt.getTime() + 90 * 60_000);
    expect(effectiveSPFAtTime(applied, later)).toBeLessThan(30);
  });

  it("returns 1 (no protection) before the application time", () => {
    const before = new Date(applied.appliedAt.getTime() - 60_000);
    expect(effectiveSPFAtTime(applied, before)).toBe(1);
  });

  it("activeSPFAtTime returns 1 with no applications", () => {
    expect(activeSPFAtTime([], new Date())).toBe(1);
  });

  it("activeSPFAtTime picks up a later reapplication", () => {
    const reapplied: SunscreenApplication = {
      appliedAt: new Date("2026-06-15T16:00:00Z"),
      labeledSPF: 30,
      appliedThicknessMgCm2: 2.0,
      wearCondition: "dry",
    };
    const atReapply = activeSPFAtTime([applied, reapplied], reapplied.appliedAt);
    expect(atReapply).toBeCloseTo(30, 4);
  });
});

describe("protectionMultiplier", () => {
  it("is 1 with no protection (SPF 1)", () => {
    expect(protectionMultiplier(1)).toBe(1);
  });

  it("is 1/30 at effective SPF 30", () => {
    expect(protectionMultiplier(30)).toBeCloseTo(1 / 30, 8);
  });
});

describe("shouldReapply", () => {
  it("is false immediately after application", () => {
    const applied: SunscreenApplication = {
      appliedAt: new Date("2026-06-15T14:00:00Z"),
      labeledSPF: 30,
      appliedThicknessMgCm2: 2.0,
      wearCondition: "dry",
    };
    expect(shouldReapply(applied, applied.appliedAt)).toBe(false);
  });

  it("becomes true once effective SPF decays below the reapply threshold", () => {
    const applied: SunscreenApplication = {
      appliedAt: new Date("2026-06-15T14:00:00Z"),
      labeledSPF: 30,
      appliedThicknessMgCm2: 2.0,
      wearCondition: "swimming",
    };
    const muchLater = new Date(applied.appliedAt.getTime() + 6 * 60 * 60_000);
    expect(shouldReapply(applied, muchLater)).toBe(true);
  });
});
