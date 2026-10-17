import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis & SerwistGlobalConfig;

/**
 * Offline installability + caching of the last forecast (brief, week 4-5:
 * "a worker in a Logan County field has no signal, so offline support is
 * a genuine requirement"). Precaches the app shell; runtime-caches API
 * responses (including /api/forecast) via Serwist's default strategy set
 * so the last successful dose estimate is still viewable offline.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Tapping a session alert brings the app back to the Session screen,
// reusing an open window when there is one.
// Minimal shapes of the service-worker APIs used here (the project's
// TypeScript config targets the DOM, not the worker library).
interface AlertWindowClient {
  url: string;
  focus(): Promise<AlertWindowClient>;
  navigate?(url: string): Promise<AlertWindowClient | null>;
}
interface AlertClients {
  matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<AlertWindowClient[]>;
  openWindow(url: string): Promise<AlertWindowClient | null>;
}
interface AlertNotificationEvent extends Event {
  notification: { close(): void };
  waitUntil(promise: Promise<unknown>): void;
}

self.addEventListener("notificationclick", (event) => {
  const e = event as AlertNotificationEvent;
  e.notification.close();
  const clients = (self as unknown as { clients: AlertClients }).clients;
  const origin = self.location.origin;
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const open = windows.find((w) => new URL(w.url).origin === origin);
      if (open) {
        const focused = await open.focus();
        return focused.navigate ? focused.navigate("/session") : focused;
      }
      return clients.openWindow("/session");
    }),
  );
});
