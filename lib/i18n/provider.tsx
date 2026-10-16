"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, localeInfo, type Locale } from "./config";
import { clockAfter, fill, formatClock, formatDuration, weekdayNames, type Vars } from "./format";
import { en, type Messages } from "./messages/en";

// English ships with every page; other languages load only when chosen.
const LOADERS: Record<Exclude<Locale, "en">, () => Promise<Messages>> = {
  es: () => import("./messages/es").then((m) => m.es),
  pl: () => import("./messages/pl").then((m) => m.pl),
  zh: () => import("./messages/zh").then((m) => m.zh),
  tl: () => import("./messages/tl").then((m) => m.tl),
  ar: () => import("./messages/ar").then((m) => m.ar),
  uk: () => import("./messages/uk").then((m) => m.uk),
  hi: () => import("./messages/hi").then((m) => m.hi),
  gu: () => import("./messages/gu").then((m) => m.gu),
  ru: () => import("./messages/ru").then((m) => m.ru),
  ko: () => import("./messages/ko").then((m) => m.ko),
};

export interface I18n {
  locale: Locale;
  /** Locale string for Intl date and number formatting. */
  intl: string;
  dir: "ltr" | "rtl";
  m: Messages;
  setLocale: (locale: Locale) => void;
  /** Fills {placeholders} in a message. */
  t: (template: string, vars?: Vars) => string;
  /** Fills placeholders with React nodes, e.g. a link or bold word inside a sentence. */
  rich: (template: string, nodes: Record<string, ReactNode>) => ReactNode;
  duration: (minutes: number) => string;
  clock: (date: Date) => string;
  clockAfter: (from: Date, minutes: number) => string;
  date: (date: Date, opts: Intl.DateTimeFormatOptions) => string;
  weekdays: string[];
}

const I18nContext = createContext<I18n | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Messages>(en);

  // The server always renders English; switch to the saved language after mount.
  useEffect(() => {
    const saved = readStoredLocale();
    if (saved && saved !== DEFAULT_LOCALE) setLocaleState(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (locale === "en") {
      setMessages(en);
    } else {
      LOADERS[locale]()
        .then((m) => {
          if (!cancelled) setMessages(m);
        })
        .catch(() => {
          if (!cancelled) setMessages(en);
        });
    }
    const info = localeInfo(locale);
    // "zh-Hans" tells the browser to pick Simplified Chinese glyph shapes.
    document.documentElement.lang = info.code === "zh" ? "zh-Hans" : info.code;
    document.documentElement.dir = info.dir;
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Private browsing: the choice lasts for this visit only.
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const info = localeInfo(locale);
    const intl = info.intl;
    return {
      locale,
      intl,
      dir: info.dir,
      m: messages,
      setLocale,
      t: fill,
      rich: (template, nodes) => {
        const parts = template.split(/(\{\w+\})/g);
        return parts.map((part, i) => {
          const key = /^\{(\w+)\}$/.exec(part)?.[1];
          return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>;
        });
      },
      duration: (minutes) => formatDuration(minutes, messages.duration),
      clock: (date) => formatClock(date, intl),
      clockAfter: (from, minutes) => clockAfter(from, minutes, intl, messages.duration.tomorrow),
      date: (date, opts) => date.toLocaleDateString(intl, opts),
      weekdays: weekdayNames(intl),
    };
  }, [locale, messages, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
