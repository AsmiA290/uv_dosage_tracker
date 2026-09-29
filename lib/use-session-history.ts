"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDbSessionHistory } from "@/lib/supabase/sessions";
import type { HistoricalSession } from "@/lib/session-history";

/**
 * Isolated data-fetching hook so the History screen doesn't need to know
 * how persistence works. Backed by Supabase (`sessions` + `dose_records`,
 * see lib/supabase/sessions.ts) and scoped to the signed-in user via RLS.
 */
export function useSessionHistory(): {
  sessions: HistoricalSession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [sessions, setSessions] = useState<HistoricalSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDbSessionHistory()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err) => {
        console.error("[v0] Failed to load session history:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load history.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { sessions, isLoading, error, refresh };
}
