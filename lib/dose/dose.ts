import {
  DEFAULT_FORECAST_RELATIVE_ERROR_SD,
  DEFAULT_MONTE_CARLO_SAMPLES,
  DEFAULT_MONTE_CARLO_SEED,
  MED_RANGES_SED,
} from "./constants";
import { empiricalCloudModificationFactor, personalExposureRatio } from "./corrections";
import { integrateErythemalDoseSED, interpolateHourlyToMinutes, uviToErythemalIrradianceWm2 } from "./irradiance";
import { activeSPFAtTime, protectionMultiplier } from "./sunscreen";
import { simulateTimeToThreshold, simulateTimeToThresholdFromForecast } from "./uncertainty";
import type { DoseEstimate, DoseEstimateInput, Interval, MinuteSample } from "./types";

/**
 * Main orchestrator: turns a Fitzpatrick type, location, ground surface,
 * an hourly UV forecast/observation series, and an optional sunscreen
 * history into a full dose estimate — cumulative dose so far, remaining
 * budget, and a calibrated time-to-threshold interval.
 *
 * This function is the single integration point for every correction in
 * the model (solar geometry via interpolateHourlyToMinutes, personal
 * exposure ratio + albedo, sunscreen decay, and Monte Carlo uncertainty
 * propagation). UI code should call this and nothing lower-level directly.
 */
export function computeDoseEstimate(input: DoseEstimateInput): DoseEstimate {
  const {
    fitzpatrickType,
    latitude,
    longitude,
    surface,
    posture,
    hourlySamples,
    sessionStart,
    now,
    sunscreenApplications = [],
    forecastRelativeErrorSD = DEFAULT_FORECAST_RELATIVE_ERROR_SD,
    monteCarloSamples = DEFAULT_MONTE_CARLO_SAMPLES,
    monteCarloSeed = DEFAULT_MONTE_CARLO_SEED,
  } = input;

  const per = personalExposureRatio(posture, surface);

  // 1. Build a minute-resolution ambient UVI series from sessionStart to now,
  //    shaped by solar geometry rather than naive linear interpolation.
  const ambientMinutes = interpolateHourlyToMinutes(hourlySamples, latitude, longitude, sessionStart, now);

  // 2. Apply personal exposure ratio + sunscreen attenuation to get the
  //    minute series actually used for dose integration and charting.
  const minuteSeries: MinuteSample[] = ambientMinutes.map(({ time, uvIndex }) => {
    const spf = activeSPFAtTime(sunscreenApplications, time);
    const sunscreenAttenuation = protectionMultiplier(spf);
    const personalUvIndex = uvIndex * per.nominal * sunscreenAttenuation;
    return {
      time,
      ambientUvIndex: uvIndex,
      personalUvIndex,
      personalIrradianceWm2: uviToErythemalIrradianceWm2(personalUvIndex),
      sunscreenAttenuation,
    };
  });

  // 3. Integrate cumulative personal dose so far (nominal PER), and again at
  //    the low/high PER bounds so the "so far" figure is itself an interval.
  const cumulativeNominal = integrateErythemalDoseSED(minuteSeries.map((m) => ({ time: m.time, uvIndex: m.personalUvIndex })));
  const scaleForPER = (targetPER: number) =>
    per.nominal > 0
      ? integrateErythemalDoseSED(
          minuteSeries.map((m) => ({
            time: m.time,
            uvIndex: (m.personalUvIndex * targetPER) / per.nominal,
          }))
        )
      : 0;
  const cumulativeDoseSED: Interval = {
    low: scaleForPER(per.low),
    nominal: cumulativeNominal,
    high: scaleForPER(per.high),
  };

  // 4. MED threshold interval for this Fitzpatrick type.
  const medRange = MED_RANGES_SED[fitzpatrickType];
  const medThresholdSED: Interval = {
    low: medRange.lowSED,
    nominal: (medRange.lowSED + medRange.highSED) / 2,
    high: medRange.highSED,
  };

  const remainingBudgetSED: Interval = {
    low: Math.max(0, medThresholdSED.low - cumulativeDoseSED.high),
    nominal: Math.max(0, medThresholdSED.nominal - cumulativeDoseSED.nominal),
    high: Math.max(0, medThresholdSED.high - cumulativeDoseSED.low),
  };

  // 5. Instantaneous dose rate "right now," from the last two minute samples
  //    (or the last available sample held constant, if the series is short).
  const currentDoseRateSEDPerMinute = estimateCurrentDoseRate(minuteSeries);

  // 6. Calibrated forward-looking time-to-threshold via Monte Carlo.
  // Walk the forecast forward (up to 12 h) rather than holding today's rate constant.
  const horizonEnd = new Date(Math.min(now.getTime() + 12 * 3600_000, hourlySamples.reduce((m, s) => Math.max(m, s.time.getTime()), 0)));
  const futureMinutes = horizonEnd.getTime() > now.getTime() ? interpolateHourlyToMinutes(hourlySamples, latitude, longitude, now, horizonEnd) : [];
  const futurePersonal = futureMinutes.map(({ time, uvIndex }) => ({
    time,
    uvIndex: uvIndex * per.nominal * protectionMultiplier(activeSPFAtTime(sunscreenApplications, time)),
  }));
  const cumulativeFutureSED: number[] = [];
  let running = 0;
  for (let i = 1; i < futurePersonal.length; i++) {
    running += integrateErythemalDoseSED([futurePersonal[i - 1]!, futurePersonal[i]!]);
    cumulativeFutureSED.push(running);
  }
  const common = {
    currentDoseSED: cumulativeDoseSED.nominal,
    medRangeSED: [medRange.lowSED, medRange.highSED] as [number, number],
    perRange: [per.low, per.high] as [number, number],
    perNominal: per.nominal,
    forecastRelativeErrorSD,
    samples: monteCarloSamples,
    seed: monteCarloSeed,
  };
  const timeToThreshold =
    cumulativeFutureSED.length > 0
      ? simulateTimeToThresholdFromForecast({ ...common, cumulativeFutureSED })
      : simulateTimeToThreshold({ ...common, doseRateSEDPerMinute: currentDoseRateSEDPerMinute });

  // 7. Empirical CMF per hourly sample, for the methods/history views.
  const cloudModificationFactors = hourlySamples
    .filter((s) => s.uvIndexClearSky !== undefined)
    .map((s) => ({ time: s.time, cmf: empiricalCloudModificationFactor(s.uvIndex, s.uvIndexClearSky!) }));

  return {
    cumulativeDoseSED,
    medThresholdSED,
    remainingBudgetSED,
    currentDoseRateSEDPerMinute,
    timeToThreshold,
    minuteSeries,
    cloudModificationFactors,
  };
}

/**
 * Dose rate "right now": average erythemal dose rate over the trailing
 * window (up to 15 minutes) of the minute series, converted to SED/minute.
 * Using a short trailing average rather than the single last point smooths
 * out minute-to-minute interpolation noise without lagging behind a real
 * change in conditions (e.g. a cloud rolling in).
 */
function estimateCurrentDoseRate(series: MinuteSample[]): number {
  if (series.length === 0) return 0;
  const windowSize = Math.min(15, series.length);
  const window = series.slice(-windowSize);
  if (window.length < 2) {
    const only = window[0]!;
    return (uviToErythemalIrradianceWm2(only.personalUvIndex) * 60) / 100;
  }
  const dose = integrateErythemalDoseSED(window.map((m) => ({ time: m.time, uvIndex: m.personalUvIndex })));
  const minutes = (window[window.length - 1]!.time.getTime() - window[0]!.time.getTime()) / 60_000;
  return minutes > 0 ? dose / minutes : 0;
}
