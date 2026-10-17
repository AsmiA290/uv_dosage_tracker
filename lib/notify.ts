/**
 * Browser notifications for session alerts.
 *
 * Web apps can only show notifications while their page is running: open on
 * screen or in the background. On iPhone this also requires the app to be
 * added to the Home Screen (iOS 16.4+). The app never sends anything to a
 * server; notifications are created on the device.
 */

export type NotifyPermission = "granted" | "denied" | "default" | "unsupported";

export function notificationPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (notificationPermission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

/** True on iPhone/iPad when the app is running in a normal browser tab rather than from the Home Screen. */
export function isIosOutsideHomeScreen(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/**
 * Show a system notification. Uses the service worker when available (needed
 * on Android and iOS), and falls back to the page-level Notification API.
 * Returns false if nothing could be shown.
 */
export async function showSystemNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationPermission() !== "granted") return false;
  const options: NotificationOptions = { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

const FIRED_KEY = "uv-tracker:alerts-fired";

/** Alert keys already shown for this session (survives reloads, forgets other sessions). */
export function loadFiredAlerts(sessionId: string): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { sessionId?: string; keys?: string[] };
    return parsed.sessionId === sessionId && Array.isArray(parsed.keys) ? new Set(parsed.keys) : new Set();
  } catch {
    return new Set();
  }
}

export function saveFiredAlerts(sessionId: string, keys: Set<string>): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ sessionId, keys: [...keys] }));
  } catch {
    // Storage can be unavailable in private browsing; alerts still work for this page load.
  }
}
