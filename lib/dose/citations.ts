/**
 * Central citation registry for every constant used in /lib/dose.
 *
 * Rendered verbatim on the app's /methods page. Per the project brief
 * (section 10, "Constraints and cautions"): "Cite every model parameter
 * in-app." Every exported constant in constants.ts, corrections.ts, and
 * sunscreen.ts should point at a `citationKey` defined here.
 *
 * IMPORTANT — read before submission: several entries below are marked
 * `confirmed: false`. Those numbers are literature-consistent starting
 * points assembled from well-established photobiology/dermatology
 * sources, but the brief's own checklist (3.3) requires the team to
 * pick ONE primary source per parameter and verify the exact reported
 * value before the app ships. Do that, then flip `confirmed` to true
 * and tighten the citation (edition, page/table number).
 */

export interface Citation {
  key: string;
  claim: string;
  source: string;
  confirmed: boolean;
  note?: string;
}

export const CITATIONS: Record<string, Citation> = {
  uviDefinition: {
    key: "uviDefinition",
    claim: "1 UV Index unit = 25 mW/m² of CIE-erythema-weighted irradiance.",
    source:
      "World Health Organization, WMO, UNEP, ICNIRP: Global Solar UV Index: A Practical Guide (2002); " +
      "CIE S 007/E-1998, Erythema Reference Action Spectrum and Standard Erythema Dose.",
    confirmed: true,
  },
  sedDefinition: {
    key: "sedDefinition",
    claim: "1 Standard Erythema Dose (SED) = 100 J/m² of erythemally weighted radiant exposure.",
    source: "Diffey, B.L. et al., 'A new UV-erythema action spectrum,' and CIE S 007/E-1998 SED definition.",
    confirmed: true,
  },
  fitzpatrickScale: {
    key: "fitzpatrickScale",
    claim:
      "Six-category sun-reactive skin typing scale (Type I, always burns/never tans, through Type VI, never burns/deeply pigmented), self-reported via burn/tan history.",
    source: "Fitzpatrick, T.B. 'The validity and practicality of sun-reactive skin types I through VI.' Archives of Dermatology, 1988;124(6):869-871.",
    confirmed: true,
  },
  medRangesByType: {
    key: "medRangesByType",
    claim:
      "Approximate Minimal Erythema Dose (MED) ranges by Fitzpatrick type, in Standard Erythema Dose (SED) units: " +
      "I 2-3, II 2.5-3.5, III 3-5, IV 4.5-6, V 6-10, VI 10-20.",
    source:
      "Skin-type MED table as reproduced from ICNIRP guidance in the sun-protection literature; " +
      "background on MED measurement in Harrison, G.I., Young, A.R. 'Ultraviolet radiation-induced erythema in human skin.' " +
      "Methods, 2002;28(1):14-19.",
    confirmed: false,
    note:
      "ACTION ITEM: open one primary table (ICNIRP statement or a measured MED study) and copy its exact figures and page/table number here, " +
      "then set confirmed: true. MED varies widely within each skin type, and self-reported Fitzpatrick type is itself imprecise, " +
      "which is why the app samples across the whole range.",
  },
  cloudModificationFactor: {
    key: "cloudModificationFactor",
    claim:
      "Cloud modification factor (CMF) is non-linear in cloud fraction: broken cloud (roughly 10-40% cover) " +
      "can transiently enhance UV above clear-sky values via reflection off cloud edges, while overcast " +
      "(>70% cover) attenuates UV by roughly 30-70%.",
    source:
      "Calbó, J., Pagès, D., González, J.A. 'Empirical studies of cloud effects on UV radiation: A review.' " +
      "Reviews of Geophysics, 2005;43(2). Also cross-checked empirically in this app against " +
      "Open-Meteo's uv_index / uv_index_clear_sky ratio for the same location and hour.",
    confirmed: false,
    note: "The piecewise curve in corrections.ts is an illustrative fit to the qualitative shape reported in the review, not a regression on raw data. Prefer the empirical Open-Meteo ratio whenever both fields are available.",
  },
  surfaceAlbedo: {
    key: "surfaceAlbedo",
    claim:
      "UV-relevant surface albedo (fraction reflected): grass and water under ~10%, dry beach sand ~15%, " +
      "concrete/pavement ~10-12%, fresh snow up to ~80%.",
    source:
      "World Health Organization, WMO, UNEP, ICNIRP: Global Solar UV Index: A Practical Guide (2002), " +
      "section on factors affecting UV (ground reflection).",
    confirmed: false,
    note:
      "Point estimates sit within the guide's ranges. The 0.5 sensitivity factor that converts an albedo difference into extra dose on " +
      "skin is an app assumption.",
  },
  personalExposureRatio: {
    key: "personalExposureRatio",
    claim:
      "Exposure ratio (ER) for the most exposed body site (top of head, shoulders, nose) relative to ambient horizontal UV: " +
      "0.6-1.0, nominal ~0.8. Upward-facing skin receives close to the full horizontal irradiance; vertical or shaded sites receive much less. " +
      "The app estimates for the most exposed site because that is where sunburn appears first.",
    source:
      "Vernez, D., Milon, A., Vuilleumier, L., et al. 'A general model to predict individual exposure to solar UV by using ambient irradiance data.' " +
      "Journal of Exposure Science and Environmental Epidemiology, 2015;25(1):113-118. doi:10.1038/jes.2014.6. " +
      "Site-specific ER depends on solar zenith angle and the fraction of sky visible from the site.",
    confirmed: false,
    note:
      "ACTION ITEM: pull per-site ER values from Vernez et al. (2015) or the SimUVEx v2 papers and tighten this range. " +
      "Posture offsets (sitting -0.05, active sport +0.05) are app assumptions.",
  },
  sunscreenApplicationThickness: {
    key: "sunscreenApplicationThickness",
    claim:
      "Labeled SPF is measured at 2.0 mg/cm²; real-world application is commonly 0.5-1.0 mg/cm². " +
      "How protection falls with thinner layers is debated: some studies support an exponential model (SPF^(thickness/2)), " +
      "others found a roughly linear relationship. The app uses the exponential model because it is the more cautious of the two.",
    source:
      "ISO 24444:2019 In vivo determination of the sunscreen protection factor (SPF); " +
      "Faurschou, A., Wulf, H.C. 'The relation between sun protection factor and amount of sunscreen applied in vivo.' " +
      "British Journal of Dermatology, 2007;156(4):716-719.",
    confirmed: false,
    note: "Add the specific paper supporting the exponential form once chosen; the linear result is cited so judges can see both sides.",
  },
  sunscreenWearOff: {
    key: "sunscreenWearOff",
    claim:
      "Applied sunscreen loses effectiveness over time, faster with sweating or swimming; guidance is to reapply about every 2 hours " +
      "and after swimming or sweating. The half-lives used here (120 min dry, 60 min sweating, 40 min swimming) are app assumptions " +
      "chosen to match that guidance, not measured constants. The app suggests reapplying once about half the layer has worn off.",
    source:
      "Diffey, B.L. 'When should sunscreen be reapplied?' Journal of the American Academy of Dermatology, 2001;45(6):882-885; " +
      "FDA sunscreen labeling rule (water resistance claims of 40 or 80 minutes).",
    confirmed: false,
  },
  solarPosition: {
    key: "solarPosition",
    claim: "Sun altitude/azimuth computed from date + coordinates via standard solar position algorithms.",
    source: "suncalc (mourner/suncalc), implementing formulas from Jean Meeus, Astronomical Algorithms.",
    confirmed: true,
  },
  forecastUncertainty: {
    key: "forecastUncertainty",
    claim: "Open-Meteo UV index forecasts carry roughly 10-20% relative error versus ground observations at short lead times, growing at longer lead times.",
    source: "Open-Meteo model documentation and general numerical weather prediction UV-forecast validation literature (e.g. Lindfors, A.V. et al., validation of UV forecast products).",
    confirmed: false,
    note: "The app's cross-validation notebook (analysis/cross_validate_epa.py) produces a site-specific agreement plot against the EPA Envirofacts UV API: use that measured error instead of this literature default once you have it.",
  },
};

export function getCitation(key: string): Citation {
  const citation = CITATIONS[key];
  if (!citation) {
    throw new Error(`Unknown citation key: ${key}`);
  }
  return citation;
}
