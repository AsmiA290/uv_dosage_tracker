"use client";

import { Check } from "lucide-react";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Language choice, shown first in onboarding and again in Profile. Each
 * option is written in its own language so anyone can find theirs.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2.5"} role="radiogroup">
      {LOCALES.map((l) => {
        const selected = l.code === locale;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={l.code}
            dir={l.dir}
            onClick={() => setLocale(l.code)}
            className={`flex min-h-12 items-center justify-between gap-2 rounded-[var(--radius)] border px-3.5 py-2.5 text-start transition-colors ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--border)] bg-white/60 text-[var(--foreground)]"
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{l.nativeName}</span>
              {l.code !== "en" && (
                <span className="truncate text-[11px] text-[var(--muted-foreground)]" lang="en" dir="ltr">
                  {l.englishName}
                </span>
              )}
            </span>
            {selected && <Check className="size-4 shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
