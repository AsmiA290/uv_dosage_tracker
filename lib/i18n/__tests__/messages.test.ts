import { describe, expect, it } from "vitest";
import { LOCALES, PROTECTED_TERMS } from "../config";
import { clockAfter, fill, formatDuration, placeholders, weekdayNames } from "../format";
import { en } from "../messages/en";
import { es } from "../messages/es";
import { pl } from "../messages/pl";
import { zh } from "../messages/zh";
import { tl } from "../messages/tl";
import { ar } from "../messages/ar";
import { uk } from "../messages/uk";
import { hi } from "../messages/hi";
import { gu } from "../messages/gu";
import { ru } from "../messages/ru";
import { ko } from "../messages/ko";

const ALL = { es, pl, zh, tl, ar, uk, hi, gu, ru, ko } as const;

/** Flattens a dictionary to dotted paths, so arrays are compared item by item. */
function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  const out: Record<string, string> = {};
  if (Array.isArray(value)) value.forEach((v, i) => Object.assign(out, flatten(v, `${prefix}[${i}]`)));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
  return out;
}

const EN = flatten(en);

describe("translations", () => {
  it("cover every language offered in the picker", () => {
    expect(Object.keys(ALL).sort()).toEqual(LOCALES.map((l) => l.code).filter((c) => c !== "en").sort());
  });

  for (const [code, dict] of Object.entries(ALL)) {
    describe(code, () => {
      const flat = flatten(dict);

      it("has exactly the English keys, including every list item", () => {
        expect(Object.keys(flat).sort()).toEqual(Object.keys(EN).sort());
      });

      it("has no empty strings", () => {
        const empty = Object.entries(flat).filter(([, v]) => v.trim() === "").map(([k]) => k);
        expect(empty).toEqual([]);
      });

      it("keeps every {placeholder}", () => {
        const broken = Object.keys(EN).filter((k) => placeholders(EN[k]!).join() !== placeholders(flat[k] ?? "").join());
        expect(broken).toEqual([]);
      });

      it("keeps protected acronyms and names unchanged (SPF, UV, SED, MED, ...)", () => {
        const missing: string[] = [];
        for (const [k, source] of Object.entries(EN)) {
          for (const term of PROTECTED_TERMS) {
            if (source.includes(term) && !(flat[k] ?? "").includes(term)) missing.push(`${k}: ${term}`);
          }
        }
        expect(missing).toEqual([]);
      });
    });
  }
});

describe("formatting helpers", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(fill("around {time}", { time: "1:00 PM" })).toBe("around 1:00 PM");
    expect(fill("around {time}")).toBe("around {time}");
  });

  it("formats durations with each language's words", () => {
    expect(formatDuration(21.4, en.duration)).toBe("21 min");
    expect(formatDuration(60, en.duration)).toBe("1 h");
    expect(formatDuration(83, en.duration)).toBe("1 h 23 min");
    expect(formatDuration(83, es.duration)).toContain("23");
  });

  it("marks clock times on the next day", () => {
    const elevenPm = new Date(2026, 6, 15, 23, 0);
    expect(clockAfter(elevenPm, 11 * 60, "en-US", en.duration.tomorrow).startsWith("tomorrow")).toBe(true);
    expect(clockAfter(new Date(2026, 6, 15, 12, 0), 13, "en-US", en.duration.tomorrow)).toMatch(/12:15/);
  });

  it("names weekdays from Sunday in the chosen locale", () => {
    expect(weekdayNames("en-US")[0]).toBe("Sun");
    expect(weekdayNames("es-US")).toHaveLength(7);
  });
});
