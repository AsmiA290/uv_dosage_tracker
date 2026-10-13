import SunCalc from "suncalc";

/**
 * Geometry and appearance rules for the live 3D sky on the Now screen.
 *
 * The sky is decorative, but it is driven by the same real inputs as the
 * dose engine, so it never shows a sun that is not there:
 *  - the sun's ALTITUDE is the true solar altitude for the user's location
 *    and time (suncalc, the same library lib/dose/solar.ts uses);
 *  - its AZIMUTH (left-right position) is the true azimuth, compressed so a
 *    whole day's path fits on a phone screen. The viewer faces the equator
 *    (south in the northern hemisphere), so the sun rises on the left and
 *    sets on the right;
 *  - the size and color of the sun's glow follow the forecast UV Index, and
 *    the haze and clouds follow the forecast cloud cover.
 *
 * Pure functions only (no three.js), so they are unit tested in isolation.
 */

const DEG = Math.PI / 180;

/**
 * Fraction of the true azimuth used on screen. A summer day in Illinois spans
 * about ±120° of azimuth; 0.36 maps that into about ±43°, inside the camera's
 * field of view. Altitude is never compressed.
 */
export const AZIMUTH_COMPRESSION = 0.36;

export interface SunState {
  /** True solar altitude above the horizon, degrees (negative below it). */
  altitudeDeg: number;
  /** True azimuth, degrees, measured from south toward west (suncalc convention). */
  azimuthDeg: number;
}

export function sunState(time: Date, latitude: number, longitude: number): SunState {
  const p = SunCalc.getPosition(time, latitude, longitude);
  return { altitudeDeg: p.altitude / DEG, azimuthDeg: p.azimuth / DEG };
}

/** Wraps an angle in degrees to (-180, 180]. */
export function wrapDeg(deg: number): number {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

/**
 * Azimuth relative to the direction the viewer faces (toward the equator),
 * in degrees. Positive = to the viewer's right.
 */
export function relativeAzimuthDeg(azimuthDeg: number, latitude: number): number {
  return latitude >= 0 ? wrapDeg(azimuthDeg) : wrapDeg(azimuthDeg - 180);
}

/**
 * Unit vector toward the sun in scene space (camera looks along -Z, +X is
 * right, +Y is up), with the azimuth compressed for display.
 */
export function displayDirection(sun: SunState, latitude: number): [number, number, number] {
  const yaw = relativeAzimuthDeg(sun.azimuthDeg, latitude) * AZIMUTH_COMPRESSION * DEG;
  const alt = sun.altitudeDeg * DEG;
  return [Math.sin(yaw) * Math.cos(alt), Math.sin(alt), -Math.cos(yaw) * Math.cos(alt)];
}

export interface PathPoint extends SunState {
  time: Date;
}

/**
 * The sun's path across today's sky, sunrise to sunset, sampled every
 * `stepMinutes`. Empty during polar night; the whole day during polar day.
 */
export function sunPath(day: Date, latitude: number, longitude: number, stepMinutes = 10): PathPoint[] {
  const times = SunCalc.getTimes(day, latitude, longitude);
  let start = times.sunrise;
  let end = times.sunset;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const noonAlt = sunState(times.solarNoon, latitude, longitude).altitudeDeg;
    if (noonAlt <= 0) return [];
    start = new Date(times.solarNoon.getTime() - 12 * 3600_000);
    end = new Date(times.solarNoon.getTime() + 12 * 3600_000);
  }
  const points: PathPoint[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += stepMinutes * 60_000) {
    const time = new Date(t);
    points.push({ time, ...sunState(time, latitude, longitude) });
  }
  return points;
}

export interface SkyAppearance {
  /** Haze in the atmosphere model: about 2 on a clear day, up to about 12 under thick cloud. */
  turbidity: number;
  /** Strength of the blue (Rayleigh) scattering. */
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  /** Overall scene brightness for the renderer's tone mapping. */
  exposure: number;
  /** 0 by day, rising to 1 once the sun is well below the horizon. */
  starOpacity: number;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Camera exposure by sun altitude. The sky model's brightness rises steeply
 * as the sun climbs, so, like a phone camera, the scene is exposed less at
 * noon and more at dusk; otherwise noon washes out to white and dusk goes black.
 */
const EXPOSURE_BY_ALTITUDE: Array<[number, number]> = [
  [-18, 0.75],
  [-6, 0.62],
  [0, 0.55],
  [3, 0.42],
  [10, 0.28],
  [20, 0.21],
  [35, 0.16],
  [60, 0.13],
  [90, 0.12],
];

function interpolateTable(table: Array<[number, number]>, x: number): number {
  if (x <= table[0]![0]) return table[0]![1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]!;
    const [x0, y0] = table[i - 1]!;
    if (x <= x1) return lerp(y0, y1, (x - x0) / (x1 - x0));
  }
  return table[table.length - 1]![1];
}

/** Atmosphere settings from the real sun altitude and the forecast cloud cover and rain. */
export function skyAppearance(altitudeDeg: number, cloudCoverPct: number, precipitationMm = 0): SkyAppearance {
  const cloud = clamp01(cloudCoverPct / 100);
  const rain = clamp01(precipitationMm / 2);
  return {
    turbidity: lerp(2.2, 10, cloud) + rain * 2,
    rayleigh: lerp(1.5, 0.7, cloud),
    mieCoefficient: lerp(0.004, 0.012, cloud),
    mieDirectionalG: lerp(0.86, 0.7, cloud),
    exposure: interpolateTable(EXPOSURE_BY_ALTITUDE, altitudeDeg) * (1 - 0.3 * cloud) * (1 - 0.3 * rain),
    starOpacity: clamp01((-altitudeDeg - 4) / 8) * (1 - cloud),
  };
}

export interface SunGlow {
  /** Multiplier for the glow sprite size. */
  scale: number;
  /** 0-1 opacity of the glow. */
  opacity: number;
  /** Hex color: warm amber when weak or low, near white when UV is strong. */
  color: string;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(lerp(v, pb[i]!, t)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The visible sign of UV intensity: the glow around the sun grows and turns
 * from amber to white as the UV Index rises, and dims behind cloud. Gone
 * once the sun is below the horizon.
 */
export function sunGlow(uvIndex: number, altitudeDeg: number, cloudCoverPct: number): SunGlow {
  const uv = clamp01(uvIndex / 11);
  const up = clamp01((altitudeDeg + 1) / 4);
  const cloud = clamp01(cloudCoverPct / 100);
  // Low sun: deep gold. High sun with strong UV: near white.
  const whiteness = clamp01(uv * 0.75 + clamp01((altitudeDeg - 5) / 40) * 0.35);
  return {
    scale: 0.7 + 1.5 * uv,
    opacity: up * (0.3 + 0.7 * uv) * (1 - 0.75 * cloud),
    color: mixHex("#ff8a3d", "#fff7e6", whiteness),
  };
}
