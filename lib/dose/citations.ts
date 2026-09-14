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
      "World Health Organization, WMO, UNEP, ICNIRP — Global Solar UV Index: A Practical Guide (2002); " +
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
      "Approximate MED ranges by Fitzpatrick type (SED): I 1.5-3.4, II 2.5-5.0, III 3.0-6.0, IV 4.5-8.0, V 6.0-10.0, VI 8.0-15.0.",
    source:
      "Synthesized from Fitzpatrick (1988) skin-type definitions and commonly cited photobiology MED summaries " +
      "(e.g. Diffey, B.L., 'Sources and measurement of ultraviolet radiation,' Methods, 2002;28(1):4-13; " +
      "CIE Technical Reports on erythemal reference dosimetry). Ranges vary meaningfully between studies " +
      "because MED is measured differently (solar simulator vs. narrowband UV, single reader vs. panel).",
    confirmed: false,
    note:
      "ACTION ITEM (brief 3.3): pick one MED study with a published table, cite its exact figures here, " +
      "and set confirmed: true. Until then, treat these as an illustrative starting range, not a verified value.",
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
      "UV-relevant surface albedo (fraction reflected): grass ~2-5%, bare soil ~5-10%, concrete/pavement ~10-15%, " +
      "dry sand ~15-20%, calm water (mid-day) ~5-10%, fresh snow up to ~80-90%.",
    source:
      "Blumthaler, M., Ambach, W. 'Indication of increasing solar ultraviolet-B radiation flux in alpine regions.' " +
      "Science, 1990;248(4952):206-208 (snow albedo); " +
      "WHO/WMO/UNEP/ICNIRP Global Solar UV Index guide (2002), surface reflectance table.",
    confirmed: false,
    note: "Point estimates chosen from the middle of commonly cited ranges; confirm against the guide's table before submission.",
  },
  personalExposureRatio: {
    key: "personalExposureRatio",
    claim:
      "Personal exposure ratio (PER) — the fraction of ambient horizontal-plane erythemal UV actually received " +
      "by facial/neck/shoulder skin — is roughly 0.4-0.6 for a standing adult, varying with solar elevation and posture.",
    source:
      "Vernez, D., Milon, A., Vuilleumier, L., et al. work on anatomical/personal UV exposure ratios; " +
      "Serrano, M-A., Cañada, J., Moreno, J.C. 'Erythemal ultraviolet exposure of cyclists in Valencia, Spain.' " +
      "Photochemistry and Photobiology, 2010. Both report body-site exposure ratios well below 1.0 relative to " +
      "a horizontal ambient reference.",
    confirmed: false,
    note: "This is the correction most consumer UV apps skip entirely — flagging it, with a cited range, is itself part of the technical-challenge answer.",
  },
  sunscreenApplicationThickness: {
    key: "sunscreenApplicationThickness",
    claim:
      "Labeled SPF is measured at 2.0 mg/cm² application thickness (ISO 24444 / FDA sunscreen testing standard); " +
      "real-world consumer application is commonly 0.5-1.0 mg/cm², and protection falls off non-linearly " +
      "(roughly as labeledSPF^(appliedThickness / 2.0)) rather than proportionally with thickness.",
    source:
      "ISO 24444:2019 In vivo determination of the sunscreen protection factor (SPF); " +
      "Diffey, B.L. 'When translucent is deceptive.' International Journal of Cosmetic Science, 2001;23(2):67-71.",
    confirmed: false,
    note: "The exponential form is a widely cited approximation of the underlying Beer–Lambert-style attenuation; verify against the Diffey paper's exact functional form before final submission.",
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
    note: "The app's cross-validation notebook (analysis/cross_validate_epa.py) produces a site-specific agreement plot against the EPA Envirofacts UV API — use that measured error instead of this literature default once you have it.",
  },
};

export function getCitation(key: string): Citation {
  const citation = CITATIONS[key];
  if (!citation) {
    throw new Error(`Unknown citation key: ${key}`);
  }
  return citation;
}
