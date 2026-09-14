import SunCalc from "suncalc";

/**
 * Solar geometry helpers. UV irradiance under clear sky scales strongly
 * with solar elevation (equivalently, cos(zenith)); we use it two ways:
 *  1. to know whether the sun is up at all at a given instant/location, and
 *  2. to shape sub-hourly interpolation of the hourly UV forecast (see
 *     irradiance.interpolateHourlyToMinutes), since UV follows the solar
 *     elevation curve through the day, not a straight line between the
 *     hourly anchor points a forecast API gives us.
 * See citations.solarPosition.
 */

/** Sun altitude above the horizon, in degrees. Negative = below horizon. */
export function solarAltitudeDeg(time: Date, latitude: number, longitude: number): number {
  const pos = SunCalc.getPosition(time, latitude, longitude);
  return (pos.altitude * 180) / Math.PI;
}

/** Solar zenith angle, in degrees (0 = directly overhead, 90 = horizon). */
export function solarZenithDeg(time: Date, latitude: number, longitude: number): number {
  return 90 - solarAltitudeDeg(time, latitude, longitude);
}

export function isDaylight(time: Date, latitude: number, longitude: number): boolean {
  return solarAltitudeDeg(time, latitude, longitude) > 0;
}

/**
 * Relative clear-sky UV weight at an instant, proportional to sin(altitude)
 * (i.e. cos(zenith)), clamped at zero below the horizon. This is a shape
 * function, not an absolute irradiance — it is only ever used to redistribute
 * a known hourly UVI value across the minutes around it.
 */
export function solarWeight(time: Date, latitude: number, longitude: number): number {
  const altitudeRad = (solarAltitudeDeg(time, latitude, longitude) * Math.PI) / 180;
  return Math.max(0, Math.sin(altitudeRad));
}
