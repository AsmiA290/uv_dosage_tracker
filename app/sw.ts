import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

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
