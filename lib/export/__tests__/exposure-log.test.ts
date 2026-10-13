import { describe, expect, it } from "vitest";
import { buildExposureLogCsv, csvField, exposureLogFileName } from "../exposure-log";
import type { HistoricalSession } from "@/lib/session-history";

function session(overrides: Partial<HistoricalSession> = {}): HistoricalSession {
  return {
    id: "a",
    startedAt: new Date(2026, 6, 15, 9, 0).toISOString(),
    endedAt: new Date(2026, 6, 15, 11, 30).toISOString(),
    fitzpatrickType: "II",
    cumulativeDoseSED: { low: 1.0, nominal: 1.5, high: 2.0 },
    incidentDoseSED: { low: 2.0, nominal: 2.3, high: 3.0 },
    medThresholdSED: { low: 2.5, nominal: 3, high: 3.5 },
    surface: "grass",
    posture: "standing",
    location: { label: "Springfield, IL", latitude: 39.7817, longitude: -89.6501 },
    sunscreenSPFs: [30, 50],
    ...overrides,
  };
}

/** Minimal RFC 4180 parser so quoted fields like "Springfield, IL" stay in one cell. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]!;
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  return rows;
}

function dataRows(csv: string): string[][] {
  return parseCsv(csv).filter((r) => !r[0]!.startsWith("#"));
}

describe("csvField", () => {
  it("quotes commas, quotes, and newlines", () => {
    expect(csvField('said "hi", left')).toBe('"said ""hi"", left"');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
  });

  it("neutralizes text a spreadsheet would run as a formula", () => {
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("leaves negative numbers alone", () => {
    expect(csvField("-89.650")).toBe("-89.650");
    expect(csvField(-3)).toBe("-3");
  });

  it("writes missing values as empty cells", () => {
    expect(csvField(undefined)).toBe("");
  });
});

describe("buildExposureLogCsv", () => {
  it("starts with the estimate disclaimer and a header row", () => {
    const csv = buildExposureLogCsv([session()], new Date(2026, 9, 12, 14, 5));
    expect(csv).toContain("Not a measurement. Not medical advice. Not legal evidence.");
    expect(csv).toContain("The US has no legal limit.");
    const [header] = dataRows(csv);
    expect(header![0]).toBe("date");
    expect(header).toContain("day_total_share_of_daily_limit_pct");
  });

  it("writes one row per session with the limit share computed before sunscreen", () => {
    const csv = buildExposureLogCsv([session()]);
    const [header, row] = dataRows(csv);
    const col = (name: string) => row![header!.indexOf(name)];
    expect(col("date")).toBe("2026-07-15");
    expect(col("start_time")).toBe("09:00");
    expect(col("duration_min")).toBe("150");
    expect(col("longitude")).toBe("-89.650");
    expect(col("sunscreen_spf")).toBe("30 50");
    expect(col("dose_sed")).toBe("1.50");
    // 2.3 SED before sunscreen / 1.15 SED per limit = 200%.
    expect(col("session_share_of_daily_limit_pct")).toBe("200");
    expect(col("day_total_share_of_daily_limit_pct")).toBe("200");
  });

  it("adds sessions on the same day into the day total", () => {
    const morning = session({ id: "m" });
    const afternoon = session({
      id: "p",
      startedAt: new Date(2026, 6, 15, 13, 0).toISOString(),
      endedAt: new Date(2026, 6, 15, 14, 0).toISOString(),
      incidentDoseSED: { low: 1, nominal: 1.15, high: 1.3 },
    });
    const [header, ...rows] = dataRows(buildExposureLogCsv([afternoon, morning]));
    const idx = header!.indexOf("day_total_share_of_daily_limit_pct");
    expect(rows[0]![header!.indexOf("start_time")]).toBe("09:00"); // oldest first
    expect(rows[0]![idx]).toBe("300");
    expect(rows[1]![idx]).toBe("300");
  });

  it("leaves new fields blank for sessions saved before they existed, and never understates a day total", () => {
    const old = session({ id: "old", incidentDoseSED: undefined, location: undefined, posture: undefined, sunscreenSPFs: undefined });
    const [header, row] = dataRows(buildExposureLogCsv([old]));
    expect(row![header!.indexOf("location")]).toBe("");
    expect(row![header!.indexOf("dose_before_sunscreen_sed")]).toBe("");
    expect(row![header!.indexOf("day_total_share_of_daily_limit_pct")]).toBe("");
    expect(row![header!.indexOf("dose_sed")]).toBe("1.50");
  });

  it("names the file by date", () => {
    expect(exposureLogFileName(new Date(2026, 9, 12))).toBe("uv-exposure-log-2026-10-12.csv");
  });
});
