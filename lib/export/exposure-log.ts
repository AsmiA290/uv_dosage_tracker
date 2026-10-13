import { fractionOfDailyLimit, sumIntervals } from "@/lib/dose/occupational";
import type { Interval } from "@/lib/dose/types";
import type { HistoricalSession } from "@/lib/session-history";

/**
 * Builds the exposure log a worker can export from the History screen.
 *
 * Why it exists: in the US, OSHA can require sun protection only once
 * overexposure is documented, and Germany's recognition of work-related
 * skin cancer (occupational disease BK 5103) depends on reconstructing a
 * worker's past exposure. A dated personal record helps with both.
 *
 * What it is not: the numbers are estimates from forecast UV, not
 * measurements, and the file says so at the top. It is generated on the
 * device and only leaves it if the worker shares it.
 */

const COLUMNS = [
  "date",
  "start_time",
  "end_time",
  "duration_min",
  "location",
  "latitude",
  "longitude",
  "surface",
  "posture",
  "sunscreen_spf",
  "skin_type",
  "dose_sed",
  "dose_sed_low",
  "dose_sed_high",
  "dose_before_sunscreen_sed",
  "session_share_of_daily_limit_pct",
  "day_total_share_of_daily_limit_pct",
  "note",
] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Quotes a CSV field when needed. Text a spreadsheet could run as a formula
 * (starting with =, +, -, @, tab or carriage return) is prefixed with an
 * apostrophe so a note like "=HYPERLINK(...)" stays plain text. Plain
 * numbers such as a negative longitude are left alone.
 */
export function csvField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  let text = String(value);
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(text);
  if (!isPlainNumber && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function fixed(n: number | undefined, digits: number): string {
  return n === undefined || !Number.isFinite(n) ? "" : n.toFixed(digits);
}

/** Builds the CSV text. Sessions are written oldest first. */
export function buildExposureLogCsv(sessions: HistoricalSession[], generatedAt: Date = new Date()): string {
  const sorted = [...sessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // Day totals for the daily limit. Only sessions that recorded their
  // before-sunscreen dose count, so older sessions never understate a total
  // silently; a day with any older session gets a blank total instead.
  const dayTotals = new Map<string, { dose: Interval; complete: boolean }>();
  for (const s of sorted) {
    const key = localDate(new Date(s.startedAt));
    const entry = dayTotals.get(key) ?? { dose: { low: 0, nominal: 0, high: 0 }, complete: true };
    if (s.incidentDoseSED) entry.dose = sumIntervals(entry.dose, s.incidentDoseSED);
    else entry.complete = false;
    dayTotals.set(key, entry);
  }

  const header = [
    "# UV Dose Tracker exposure log (a program of The Actinic Shield)",
    `# Generated ${localDate(generatedAt)} ${localTime(generatedAt)} (device local time)`,
    "# Personal record of ESTIMATES from forecast UV data. Not a measurement. Not medical advice. Not legal evidence.",
    "# dose_sed: UV dose on the most exposed skin after sunscreen. 1 SED = 100 J/m2 of sunburn-weighted UV.",
    "# share_of_daily_limit: share of the ICNIRP/ACGIH limit (30 J/m2 effective per 8-hour day) using UV on skin before sunscreen. 100 = at the limit. The US has no legal limit.",
    "# Blank cells: not recorded (sessions saved before October 2026 lack location and before-sunscreen dose).",
  ].map((line) => csvField(line));

  const rows = sorted.map((s) => {
    const start = new Date(s.startedAt);
    const end = new Date(s.endedAt);
    const day = dayTotals.get(localDate(start));
    const sessionShare = s.incidentDoseSED ? fractionOfDailyLimit(s.incidentDoseSED).nominal * 100 : undefined;
    const dayShare = day && day.complete ? fractionOfDailyLimit(day.dose).nominal * 100 : undefined;
    const cells: Array<string | number | undefined> = [
      localDate(start),
      localTime(start),
      localTime(end),
      Math.round((end.getTime() - start.getTime()) / 60_000),
      s.location?.label,
      fixed(s.location?.latitude, 3),
      fixed(s.location?.longitude, 3),
      s.surface,
      s.posture,
      s.sunscreenSPFs && s.sunscreenSPFs.length > 0 ? s.sunscreenSPFs.join(" ") : s.sunscreenSPFs ? "none" : undefined,
      s.fitzpatrickType,
      fixed(s.cumulativeDoseSED.nominal, 2),
      fixed(s.cumulativeDoseSED.low, 2),
      fixed(s.cumulativeDoseSED.high, 2),
      fixed(s.incidentDoseSED?.nominal, 2),
      fixed(sessionShare, 0),
      fixed(dayShare, 0),
      s.note,
    ];
    return cells.map((c) => csvField(c)).join(",");
  });

  return [...header, COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

/** File name like uv-exposure-log-2026-10-12.csv. */
export function exposureLogFileName(generatedAt: Date = new Date()): string {
  return `uv-exposure-log-${localDate(generatedAt)}.csv`;
}
