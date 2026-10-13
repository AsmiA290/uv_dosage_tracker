import { describe, expect, it } from "vitest";
import SunCalc from "suncalc";
import {
  AZIMUTH_COMPRESSION,
  displayDirection,
  relativeAzimuthDeg,
  skyAppearance,
  sunGlow,
  sunPath,
  sunState,
  wrapDeg,
} from "../sun-geometry";

const SPRINGFIELD = { lat: 39.78, lon: -89.65 };

describe("sunState", () => {
  it("matches the textbook noon altitude at the June solstice (90 - latitude + 23.44)", () => {
    const noon = SunCalc.getTimes(new Date("2026-06-21T12:00:00Z"), SPRINGFIELD.lat, SPRINGFIELD.lon).solarNoon;
    const s = sunState(noon, SPRINGFIELD.lat, SPRINGFIELD.lon);
    expect(s.altitudeDeg).toBeCloseTo(90 - 39.78 + 23.44, 0);
    expect(Math.abs(s.azimuthDeg)).toBeLessThan(2); // due south at solar noon
  });

  it("puts the sun below the horizon at night", () => {
    // 3 AM CDT
    expect(sunState(new Date("2026-07-15T08:00:00Z"), SPRINGFIELD.lat, SPRINGFIELD.lon).altitudeDeg).toBeLessThan(0);
  });
});

describe("display mapping", () => {
  it("keeps the true altitude and compresses only the azimuth", () => {
    const [x, y, z] = displayDirection({ altitudeDeg: 50, azimuthDeg: -100 }, 40);
    expect(Math.asin(y) * (180 / Math.PI)).toBeCloseTo(50, 6);
    expect(Math.atan2(x, -z) * (180 / Math.PI)).toBeCloseTo(-100 * AZIMUTH_COMPRESSION, 6);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10);
  });

  it("shows the morning sun on the left in the northern hemisphere and faces north in the southern", () => {
    expect(relativeAzimuthDeg(-90, 40)).toBe(-90); // east, facing south: left
    expect(relativeAzimuthDeg(-90, -33)).toBe(90); // east, facing north: right
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-180)).toBe(180);
  });

  it("fits a whole summer day inside about ±45 degrees on screen", () => {
    const path = sunPath(new Date("2026-06-21T17:00:00Z"), SPRINGFIELD.lat, SPRINGFIELD.lon);
    const maxYaw = Math.max(...path.map((p) => Math.abs(relativeAzimuthDeg(p.azimuthDeg, SPRINGFIELD.lat) * AZIMUTH_COMPRESSION)));
    expect(maxYaw).toBeLessThan(45);
  });
});

describe("sunPath", () => {
  it("runs from sunrise to sunset and peaks near solar noon", () => {
    const path = sunPath(new Date("2026-07-15T17:00:00Z"), SPRINGFIELD.lat, SPRINGFIELD.lon, 10);
    expect(path.length).toBeGreaterThan(80);
    expect(Math.abs(path[0]!.altitudeDeg)).toBeLessThan(2);
    const peak = path.reduce((a, b) => (b.altitudeDeg > a.altitudeDeg ? b : a));
    expect(peak.altitudeDeg).toBeGreaterThan(65);
    expect(Math.abs(peak.azimuthDeg)).toBeLessThan(5);
  });

  it("is empty in polar night", () => {
    expect(sunPath(new Date("2026-12-21T12:00:00Z"), 80, 15)).toEqual([]);
  });
});

describe("appearance", () => {
  it("gets hazier and dimmer as cloud cover rises", () => {
    const clear = skyAppearance(45, 0);
    const overcast = skyAppearance(45, 100);
    expect(overcast.turbidity).toBeGreaterThan(clear.turbidity);
    expect(overcast.exposure).toBeLessThan(clear.exposure);
  });

  it("exposes less as the sun climbs, like a camera, so noon does not wash out", () => {
    expect(skyAppearance(70, 0).exposure).toBeLessThan(skyAppearance(20, 0).exposure);
    expect(skyAppearance(20, 0).exposure).toBeLessThan(skyAppearance(1, 0).exposure);
    expect(skyAppearance(-30, 0).exposure).toBeCloseTo(0.75, 6);
  });

  it("shows stars only once the sun is well below the horizon on a clear night", () => {
    expect(skyAppearance(20, 0).starOpacity).toBe(0);
    expect(skyAppearance(-15, 0).starOpacity).toBe(1);
    expect(skyAppearance(-15, 100).starOpacity).toBe(0);
  });

  it("grows and whitens the sun glow with UV, and hides it below the horizon", () => {
    const weak = sunGlow(1, 15, 0);
    const strong = sunGlow(10, 70, 0);
    expect(strong.scale).toBeGreaterThan(weak.scale);
    expect(strong.opacity).toBeGreaterThan(weak.opacity);
    expect(parseInt(strong.color.slice(5, 7), 16)).toBeGreaterThan(parseInt(weak.color.slice(5, 7), 16)); // more blue = whiter
    expect(sunGlow(8, -5, 0).opacity).toBe(0);
    expect(sunGlow(8, 60, 100).opacity).toBeLessThan(sunGlow(8, 60, 0).opacity);
  });
});
