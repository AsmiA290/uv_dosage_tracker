import { describe, expect, it } from "vitest";
import { BUDGET_LOW_FRACTION_LEFT, dueAlerts, keysToRecord, type AlertInputs } from "@/lib/alerts";
import { ALERT_MESSAGES } from "@/lib/i18n/extra/alerts";
import { LOCALES } from "@/lib/i18n/config";

const base: AlertInputs = { budgetFractionLeft: 0.9, reapplyDue: false, applicationCount: 0, workShare: 0.2 };
const none = new Set<string>();

describe("dueAlerts", () => {
  it("returns nothing on a calm session", () => {
    expect(dueAlerts(base, none)).toEqual([]);
  });

  it("returns nothing while the estimate is still loading", () => {
    expect(dueAlerts({ ...base, budgetFractionLeft: null, workShare: null }, none)).toEqual([]);
  });

  it("warns once the burn budget runs low", () => {
    const due = dueAlerts({ ...base, budgetFractionLeft: BUDGET_LOW_FRACTION_LEFT }, none);
    expect(due.map((d) => d.kind)).toEqual(["budgetLow"]);
  });

  it("gives only the threshold alert when the budget is used up, and records the low warning as shown", () => {
    const due = dueAlerts({ ...base, budgetFractionLeft: -0.1 }, none);
    expect(due.map((d) => d.kind)).toEqual(["thresholdReached"]);
    expect(keysToRecord(due)).toEqual(["thresholdReached", "budgetLow"]);
  });

  it("never repeats an alert that was already shown", () => {
    const fired = new Set(["budgetLow"]);
    expect(dueAlerts({ ...base, budgetFractionLeft: 0.1 }, fired)).toEqual([]);
  });

  it("alerts to reapply once per sunscreen layer", () => {
    const first = dueAlerts({ ...base, reapplyDue: true, applicationCount: 1 }, none);
    expect(first).toEqual([{ kind: "reapply", key: "reapply:1" }]);
    const fired = new Set(keysToRecord(first));
    expect(dueAlerts({ ...base, reapplyDue: true, applicationCount: 1 }, fired)).toEqual([]);
    expect(dueAlerts({ ...base, reapplyDue: true, applicationCount: 2 }, fired)).toEqual([
      { kind: "reapply", key: "reapply:2" },
    ]);
  });

  it("does not ask to reapply when no sunscreen was logged", () => {
    expect(dueAlerts({ ...base, reapplyDue: true, applicationCount: 0 }, none)).toEqual([]);
  });

  it("alerts when the daily work limit is reached", () => {
    expect(dueAlerts({ ...base, workShare: 1 }, none).map((d) => d.kind)).toEqual(["workLimit"]);
    expect(dueAlerts({ ...base, workShare: 0.99 }, none)).toEqual([]);
  });
});

describe("alert translations", () => {
  const keys = Object.keys(ALERT_MESSAGES.en).sort();

  it("covers every app language with the same keys", () => {
    for (const { code } of LOCALES) {
      expect(Object.keys(ALERT_MESSAGES[code]).sort(), code).toEqual(keys);
      for (const key of keys) {
        const value = ALERT_MESSAGES[code][key as keyof (typeof ALERT_MESSAGES)["en"]];
        expect(value.trim().length, `${code}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps UV unchanged wherever English uses it", () => {
    for (const { code } of LOCALES) {
      for (const key of keys) {
        const k = key as keyof (typeof ALERT_MESSAGES)["en"];
        if (/\bUV\b/.test(ALERT_MESSAGES.en[k])) expect(ALERT_MESSAGES[code][k], `${code}.${key}`).toContain("UV");
      }
    }
  });

  it("uses no em dashes", () => {
    for (const { code } of LOCALES) {
      for (const value of Object.values(ALERT_MESSAGES[code])) expect(value).not.toContain("—");
    }
  });
});
