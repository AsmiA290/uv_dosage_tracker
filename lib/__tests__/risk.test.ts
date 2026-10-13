import { describe, expect, it } from "vitest";
import { clockLabel, formatLimitShare, formatMinutes } from "../risk";

describe("formatMinutes", () => {
  it("formats short and long durations", () => {
    expect(formatMinutes(21.4)).toBe("21 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(83)).toBe("1 h 23 min");
  });
});

describe("clockLabel", () => {
  it("gives a same-day clock time without a day prefix", () => {
    const twoAm = new Date(2026, 6, 15, 2, 0); // local time
    const label = clockLabel(twoAm, 500); // 10:20 AM local
    expect(label.startsWith("tomorrow")).toBe(false);
    expect(label).toMatch(/10:20/);
  });

  it("prefixes 'tomorrow' when the time falls on the next day", () => {
    const elevenPm = new Date(2026, 6, 15, 23, 0);
    expect(clockLabel(elevenPm, 11 * 60).startsWith("tomorrow")).toBe(true);
  });

  it("rounds to the nearest 5 minutes", () => {
    const noon = new Date(2026, 6, 15, 12, 0);
    expect(clockLabel(noon, 13)).toMatch(/12:15/);
  });
});

describe("formatLimitShare", () => {
  it("shows a percentage below the limit and a multiple at or above it", () => {
    expect(formatLimitShare(0)).toBe("0%");
    expect(formatLimitShare(0.64)).toBe("64%");
    expect(formatLimitShare(1)).toBe("1.0×");
    expect(formatLimitShare(2.34)).toBe("2.3×");
    expect(formatLimitShare(-1)).toBe("0%");
  });
});
