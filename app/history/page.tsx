"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ChevronDown, Download, MapPin } from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSessionHistory } from "@/lib/use-session-history";
import type { HistoricalSession } from "@/lib/session-history";
import { Button } from "@/components/ui/button";
import { UncertaintyRange } from "@/components/ui/uncertainty-range";
import type { RiskLevel } from "@/components/ui/stat-tile";
import { fractionOfDailyLimit } from "@/lib/dose/occupational";
import { buildExposureLogCsv, exposureLogFileName } from "@/lib/export/exposure-log";
import { formatLimitShare } from "@/lib/risk";
import { useI18n } from "@/lib/i18n/provider";

// Recharts writes colors into SVG presentation attributes (fill="..."),
// where CSS custom properties like var(--risk-low) are not resolved, so
// the bars and lines rendered invisibly. Charts use literal hex values that
// mirror the tokens in globals.css.
const RISK_HEX: Record<RiskLevel, string> = {
  low: "#166534",
  medium: "#b45309",
  high: "#b91c1c",
};
const CHART = {
  accent: "#0f766e",
  muted: "#52525b",
  grid: "#e4e4e7",
};

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function riskForRatio(ratio: number): RiskLevel {
  if (ratio > 1) return "high";
  if (ratio >= 0.6) return "medium";
  return "low";
}

function buildWeekData(sessions: HistoricalSession[], dayLabels: string[]) {
  const weekStart = startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return { date, dose: 0, low: 0, high: 0, threshold: 0, hasData: false };
  });

  for (const s of sessions) {
    const started = new Date(s.startedAt);
    const dayIndex = Math.floor((started.getTime() - weekStart.getTime()) / 86_400_000);
    if (dayIndex < 0 || dayIndex > 6) continue;
    const day = days[dayIndex];
    if (!day) continue;
    day.dose += s.cumulativeDoseSED.nominal;
    day.low += s.cumulativeDoseSED.low;
    day.high += s.cumulativeDoseSED.high;
    day.threshold = Math.max(day.threshold, s.medThresholdSED.nominal);
    day.hasData = true;
  }

  return days.map((d, i) => ({
    label: dayLabels[i],
    dose: Number(d.dose.toFixed(2)),
    range: d.hasData ? [Number(d.low.toFixed(2)), Number(d.high.toFixed(2))] : [0, 0],
    risk: (d.threshold > 0 ? riskForRatio(d.dose / d.threshold) : "low") as RiskLevel,
    threshold: d.threshold,
  }));
}

/** Local calendar-day key (YYYY-MM-DD) — NOT toISOString(), which uses the UTC date. */
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Rolling 7- and 30-day dose totals over CALENDAR days (days with no
 * sessions count as zero), for each day that has a session.
 */
function buildTrendData(sessions: HistoricalSession[], intl: string) {
  const byDay = new Map<string, { date: Date; dose: number }>();
  for (const s of sessions) {
    const started = new Date(s.startedAt);
    const key = localDayKey(started);
    const date = new Date(started.getFullYear(), started.getMonth(), started.getDate());
    const entry = byDay.get(key) ?? { date, dose: 0 };
    entry.dose += s.cumulativeDoseSED.nominal;
    byDay.set(key, entry);
  }
  const days = Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const windowTotal = (end: Date, nDays: number) => {
    const start = new Date(end);
    start.setDate(start.getDate() - (nDays - 1));
    return days
      .filter((d) => d.date.getTime() >= start.getTime() && d.date.getTime() <= end.getTime())
      .reduce((sum, d) => sum + d.dose, 0);
  };
  return days.map(({ date }) => ({
    day: date.toLocaleDateString(intl, { month: "short", day: "numeric" }),
    sevenDay: Number(windowTotal(date, 7).toFixed(2)),
    thirtyDay: Number(windowTotal(date, 30).toFixed(2)),
  }));
}

/**
 * Saves the exposure log as a CSV file on this device. Nothing is uploaded;
 * the worker decides whether to share the file.
 */
function downloadExposureLog(sessions: HistoricalSession[]) {
  const now = new Date();
  // A leading byte-order mark lets Excel read notes with accented characters correctly.
  const BOM = String.fromCharCode(0xfeff);
  const blob = new Blob([BOM + buildExposureLogCsv(sessions, now)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exposureLogFileName(now);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function SessionRow({ session }: { session: HistoricalSession }) {
  const { m, duration, intl } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const surfaceLabel = (m.surface as Record<string, string>)[session.surface] ?? session.surface;
  const start = new Date(session.startedAt);
  const end = new Date(session.endedAt);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);

  return (
    <li className="glass-panel-solid rounded-[var(--radius)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-start"
        aria-expanded={expanded}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {start.toLocaleDateString(intl, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {duration(durationMin)} · {surfaceLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UncertaintyRange
            low={session.cumulativeDoseSED.low}
            nominal={session.cumulativeDoseSED.nominal}
            high={session.cumulativeDoseSED.high}
            unit="SED"
            size="sm"
          />
          <ChevronDown
            className={`size-4 text-[var(--muted-foreground)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-[var(--border)] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">{m.history.skinType}</span>
            <span>{m.skin.short[session.fitzpatrickType]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">{m.history.threshold}</span>
            <span className="hero-number">{session.medThresholdSED.nominal.toFixed(1)} SED</span>
          </div>
          {session.incidentDoseSED && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted-foreground)]">{m.history.workShare}</span>
              <span className="hero-number">
                {formatLimitShare(fractionOfDailyLimit(session.incidentDoseSED).nominal)}
              </span>
            </div>
          )}
          {session.location && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted-foreground)]">{m.history.location}</span>
              <span className="flex items-center gap-1 text-end">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {session.location.label}
              </span>
            </div>
          )}
          {session.note && (
            <p className="mt-1 text-sm italic text-[var(--muted-foreground)]">&ldquo;{session.note}&rdquo;</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function HistoryPage() {
  const { m, intl, weekdays } = useI18n();
  const { sessions, isLoading } = useSessionHistory();
  const weekData = useMemo(() => buildWeekData(sessions, weekdays), [sessions, weekdays]);
  const trendData = useMemo(() => buildTrendData(sessions, intl), [sessions, intl]);
  const weekThreshold = Math.max(0, ...weekData.map((d) => d.threshold));

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-8 pb-28">
        <div className="h-48 animate-pulse rounded-[var(--radius)] bg-[var(--border)]" />
      </main>
    );
  }

  if (sessions.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-16 pb-28 text-center">
        <CalendarPlus className="size-10 text-[var(--accent)]" aria-hidden="true" />
        <p className="text-lg font-semibold">{m.history.emptyTitle}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          {m.history.emptyBody}
        </p>
        <Button asChild variant="glass" size="session" className="glass-cta">
          <Link href="/session">{m.now.startSession}</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 py-8 pb-28">
      <h1 className="text-lg font-semibold">{m.history.title}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">{m.history.thisWeek}</h2>
        {/* Charts stay left-to-right in every language so time runs the same way. */}
        <div dir="ltr" className="glass-panel-solid h-56 rounded-[var(--radius)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART.muted }} axisLine={false} tickLine={false} width={34} allowDecimals domain={[0, (max: number) => Math.ceil(Math.max(max, weekThreshold) * 1.15)]} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`${value.toFixed(2)} SED`, m.history.dose]}
              />
              {weekThreshold > 0 && (
                <ReferenceLine
                  y={weekThreshold}
                  stroke={CHART.muted}
                  strokeDasharray="4 4"
                  label={{ value: "MED", position: "insideTopRight", fontSize: 10, fill: CHART.muted }}
                />
              )}
              <Bar dataKey="dose" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={RISK_HEX[d.risk]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul dir="ltr" className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--muted-foreground)]">
          {weekData.map((d, i) => (
            <li key={i} className="hero-number">
              {d.dose > 0 ? d.dose.toFixed(1) : "–"}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">{m.history.trend}</h2>
        <div dir="ltr" className="glass-panel-solid h-48 rounded-[var(--radius)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART.muted }} axisLine={false} tickLine={false} width={34} allowDecimals />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Area isAnimationActive={false} type="monotone" dataKey="thirtyDay" stroke={CHART.muted} fill={CHART.muted} fillOpacity={0.08} strokeWidth={1.5} name={m.history.thirtyDay} />
              <Area isAnimationActive={false} type="monotone" dataKey="sevenDay" stroke={CHART.accent} fill={CHART.accent} fillOpacity={0.15} strokeWidth={2} name={m.history.sevenDay} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">{m.history.sessions}</h2>
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      </section>

      <section className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5" aria-labelledby="exposure-log-heading">
        <h2 id="exposure-log-heading" className="text-sm font-semibold text-[var(--foreground)]">
          {m.history.logTitle}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          {m.history.logBody}
        </p>
        <Button variant="outline" onClick={() => downloadExposureLog(sessions)} className="w-fit gap-1.5">
          <Download className="size-4" aria-hidden="true" />
          {m.history.export}
        </Button>
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
          {m.history.logFine}
        </p>
      </section>
    </main>
  );
}
