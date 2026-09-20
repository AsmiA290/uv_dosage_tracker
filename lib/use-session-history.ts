"use client";

import { useEffect, useState } from "react";
import { readSessionHistory, SESSION_HISTORY_STORAGE_KEY, type HistoricalSession } from "@/lib/session-history";

/**
 * Isolated data-fetching hook so the History screen can be swapped to a
 * real API route (backed by `exposureSessions` / `doseRecords` in
 * lib/db/schema.ts) later without touching any rendering code below it.
 */
export function useSessionHistory(): { sessions: HistoricalSession[]; isLoading: boolean } {
  const [sessions, setSessions] = useState<HistoricalSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setSessions(readSessionHistory());
      setIsLoading(false);
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_HISTORY_STORAGE_KEY || e.key === null) load();
    };
    const onLocalUpdate = () => load();

    window.addEventListener("storage", onStorage);
    window.addEventListener("uv-dose-tracker:sessions-updated", onLocalUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("uv-dose-tracker:sessions-updated", onLocalUpdate);
    };
  }, []);

  return { sessions, isLoading };
}
