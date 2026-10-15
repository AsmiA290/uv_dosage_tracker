/**
 * Languages the app is offered in. English is the source; every other
 * dictionary in ./messages must have exactly the same keys (TypeScript
 * enforces this) and keep the protected terms below unchanged (a unit
 * test enforces that).
 */
export const LOCALES = [
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr", intl: "en-US" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr", intl: "es-US" },
  { code: "pl", nativeName: "Polski", englishName: "Polish", dir: "ltr", intl: "pl-PL" },
  { code: "zh", nativeName: "简体中文", englishName: "Chinese (Simplified)", dir: "ltr", intl: "zh-CN" },
  { code: "tl", nativeName: "Tagalog", englishName: "Tagalog", dir: "ltr", intl: "fil-PH" },
  // Western digits keep numbers consistent with the rest of the app.
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl", intl: "ar-u-nu-latn" },
  { code: "uk", nativeName: "Українська", englishName: "Ukrainian", dir: "ltr", intl: "uk-UA" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", intl: "hi-IN-u-nu-latn" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", dir: "ltr", intl: "gu-IN-u-nu-latn" },
  { code: "ru", nativeName: "Русский", englishName: "Russian", dir: "ltr", intl: "ru-RU" },
  { code: "ko", nativeName: "한국어", englishName: "Korean", dir: "ltr", intl: "ko-KR" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "uv-tracker:locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((l) => l.code === value);
}

export function localeInfo(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

/**
 * Scientific acronyms, units and names that must read the same in every
 * language: people compare them with sunscreen labels, the UV Index on the
 * news, and the cited sources.
 */
export const PROTECTED_TERMS = ["SPF", "UPF", "UV", "SED", "MED", "ICNIRP", "ACGIH", "OSHA", "NIOSH", "EPA", "CSV", "J/m²", "Open-Meteo", "Actinic Shield", "ActinicUVDose"] as const;

/**
 * Runs before React loads (inlined in the root layout), so a right-to-left
 * language does not flash left-to-right on the first paint.
 */
export const LOCALE_BOOT_SCRIPT = `try{var l=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(l){document.documentElement.lang=l==="zh"?"zh-Hans":l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}}catch(e){}`;
