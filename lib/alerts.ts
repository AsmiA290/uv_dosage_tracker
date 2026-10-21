/**
 * Session alerts: which pop-up notifications are due right now.
 *
 * Pure logic, no browser APIs, so it can be unit tested. The Session screen
 * calls `dueAlerts` on every tick and shows each returned alert once; the
 * keys it has already shown are remembered per session so a reload or a
 * repeated tick never repeats an alert.
 */

export type AlertKind = "reapply" | "budgetLow" | "thresholdReached" | "workLimit";

/** Warn when this fraction (or less) of the day's burn budget is left. */
export const BUDGET_LOW_FRACTION_LEFT = 0.25;

export interface AlertInputs {
  /** Fraction of today's burn budget still left (1 = untouched, 0 or less = threshold reached). Null while loading. */
  budgetFractionLeft: number | null;
  /** True when the most recent sunscreen application has worn thin enough to reapply. */
  reapplyDue: boolean;
  /** How many sunscreen applications have been logged; keys the reapply alert so each new layer can alert once. */
  applicationCount: number;
  /** Today's work exposure as a share of the ICNIRP/ACGIH daily limit (1 = limit). Null while loading. */
  workShare: number | null;
}

export interface DueAlert {
  kind: AlertKind;
  /** Stable key; an alert with a key already in `fired` is never returned again. */
  key: string;
}

/**
 * Alerts that should be shown now and have not been shown before.
 * When the burn threshold is reached, the "budget low" warning is skipped
 * (and its key returned as fired) so the user never gets both at once.
 */
export function dueAlerts(inputs: AlertInputs, fired: ReadonlySet<string>): DueAlert[] {
  const due: DueAlert[] = [];
  const add = (kind: AlertKind, key: string) => {
    if (!fired.has(key)) due.push({ kind, key });
  };

  const left = inputs.budgetFractionLeft;
  if (left !== null && Number.isFinite(left)) {
    if (left <= 0) add("thresholdReached", "thresholdReached");
    else if (left <= BUDGET_LOW_FRACTION_LEFT) add("budgetLow", "budgetLow");
  }

  if (inputs.reapplyDue && inputs.applicationCount > 0) {
    add("reapply", `reapply:${inputs.applicationCount}`);
  }

  if (inputs.workShare !== null && Number.isFinite(inputs.workShare) && inputs.workShare >= 1) {
    add("workLimit", "workLimit");
  }

  return due;
}

/** Keys to record as fired after showing `due`, including any warning a stronger alert replaced. */
export function keysToRecord(due: DueAlert[]): string[] {
  const keys = due.map((d) => d.key);
  if (due.some((d) => d.kind === "thresholdReached")) keys.push("budgetLow");
  return keys;
}
