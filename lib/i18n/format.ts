/**
 * Small formatting helpers shared by every language. Pure functions, so
 * they are unit tested without React.
 */

export type Vars = Record<string, string | number>;

/** Fills "{name}" placeholders. Unknown placeholders are left as they are, so a gap is visible rather than silent. */
export function fill(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Placeholder names used in a template, e.g. ["time"] for "around {time}". */
export function placeholders(template: string): string[] {
  return Array.from(template.matchAll(/\{(\w+)\}/g), (m) => m[1]!).sort();
}

export interface DurationTemplates {
  /** e.g. "{m} min" */
  min: string;
  /** e.g. "{h} h" */
  h: string;
  /** e.g. "{h} h {m} min" */
  hMin: string;
}

/** "45 min" or "1 h 20 min", in the given language's words. */
export function formatDuration(minutes: number, t: DurationTemplates): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return fill(t.min, { m });
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? fill(t.h, { h }) : fill(t.hMin, { h, m: rest });
}

/** Local clock time, e.g. "1:05 PM" or "13:05", in the given locale. */
export function formatClock(date: Date, intlLocale: string, opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }): string {
  return date.toLocaleTimeString(intlLocale, opts);
}

/**
 * Clock time `minutes` after `from`, rounded to 5 minutes, with the
 * language's "tomorrow {time}" template when it falls on the next day.
 */
export function clockAfter(from: Date, minutes: number, intlLocale: string, tomorrowTemplate: string): string {
  const ms = Math.round((from.getTime() + minutes * 60_000) / 300_000) * 300_000;
  const at = new Date(ms);
  const time = formatClock(at, intlLocale);
  return at.toDateString() === from.toDateString() ? time : fill(tomorrowTemplate, { time });
}

/** Short weekday names Sunday..Saturday in the given locale. */
export function weekdayNames(intlLocale: string): string[] {
  const fmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short" });
  // 2026-07-12 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 6, 12 + i)));
}
