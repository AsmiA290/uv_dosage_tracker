"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { alertMessages, type AlertMessages } from "@/lib/i18n/extra/alerts";
import { dueAlerts, keysToRecord, type AlertInputs, type AlertKind } from "@/lib/alerts";
import {
  isIosOutsideHomeScreen,
  loadFiredAlerts,
  notificationPermission,
  requestNotificationPermission,
  saveFiredAlerts,
  showSystemNotification,
  type NotifyPermission,
} from "@/lib/notify";

/** Lower number = more urgent; decides which banner shows when several are due at once. */
const PRIORITY: Record<AlertKind, number> = { thresholdReached: 0, workLimit: 1, budgetLow: 2, reapply: 3 };

interface Toast {
  id: string;
  kind: AlertKind;
}

function textFor(kind: AlertKind, a: AlertMessages): { title: string; body: string } {
  switch (kind) {
    case "reapply":
      return { title: a.reapplyTitle, body: a.reapplyBody };
    case "budgetLow":
      return { title: a.budgetLowTitle, body: a.budgetLowBody };
    case "thresholdReached":
      return { title: a.thresholdTitle, body: a.thresholdBody };
    case "workLimit":
      return { title: a.workTitle, body: a.workBody };
  }
}

/**
 * Pop-up alerts for an active session. Shows an in-app banner when the app is
 * on screen and a system notification when it is in the background (if the
 * user allowed notifications). Each alert appears once per session.
 */
export function SessionAlerts({ sessionId, inputs }: { sessionId: string; inputs: AlertInputs }) {
  const { locale } = useI18n();
  const a = alertMessages(locale);
  const [permission, setPermission] = useState<NotifyPermission>("default");
  const [iosHint, setIosHint] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const firedRef = useRef<Set<string> | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    setPermission(notificationPermission());
    setIosHint(isIosOutsideHomeScreen());
  }, []);

  useEffect(() => {
    if (loadedFor.current !== sessionId) {
      firedRef.current = loadFiredAlerts(sessionId);
      loadedFor.current = sessionId;
    }
    const fired = firedRef.current ?? new Set<string>();
    const due = dueAlerts(inputs, fired);
    if (due.length === 0) return;
    for (const key of keysToRecord(due)) fired.add(key);
    saveFiredAlerts(sessionId, fired);

    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    for (const alert of due) {
      const { title, body } = textFor(alert.kind, a);
      if (hidden) void showSystemNotification(title, body, `uv-${alert.kind}`);
    }
    // On screen, show one banner at a time: the most urgent new alert. It is
    // also waiting when the user returns from the background.
    const top = [...due].sort((x, y) => PRIORITY[x.kind] - PRIORITY[y.kind])[0];
    if (top) setToasts([{ id: top.key, kind: top.kind }]);
    // `a` changes only with the language; alerts are keyed so they never repeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, inputs.budgetFractionLeft, inputs.reapplyDue, inputs.applicationCount, inputs.workShare]);

  async function enable() {
    setPermission(await requestNotificationPermission());
  }

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {toasts.length > 0 && (
        <div
          className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-md flex-col gap-2 px-4 pt-[max(env(safe-area-inset-top),1rem)]"
          role="status"
          aria-live="assertive"
        >
          {toasts.map((toast) => {
            const { title, body } = textFor(toast.kind, a);
            const urgent = toast.kind === "thresholdReached" || toast.kind === "workLimit";
            return (
              <div
                key={toast.id}
                style={{ background: "var(--background)" }}
                className={`flex items-start gap-3 rounded-[var(--radius)] border p-4 shadow-lg ${
                  urgent ? "border-[var(--risk-high)]/40" : "border-[var(--risk-medium)]/40"
                }`}
              >
                <Bell
                  className={`mt-0.5 size-5 shrink-0 ${urgent ? "text-[var(--risk-high)]" : "text-[var(--risk-medium)]"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                  aria-label={a.dismiss}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {permission === "default" && (
        <div className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-4">
          <div className="flex items-start gap-2">
            <Bell className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{a.enableTitle}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{a.enableBody}</p>
              {iosHint && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{a.iosHint}</p>}
            </div>
          </div>
          <Button variant="glass" size="sm" className="glass-cta self-start" onClick={enable}>
            {a.enableButton}
          </Button>
        </div>
      )}
      {permission === "granted" && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Bell className="size-3.5" aria-hidden="true" />
          {a.enabled}
        </p>
      )}
      {(permission === "denied" || permission === "unsupported") && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <BellOff className="size-3.5" aria-hidden="true" />
          {permission === "denied" ? a.blocked : a.unsupported}
        </p>
      )}
    </>
  );
}
