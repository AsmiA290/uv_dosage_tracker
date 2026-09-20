"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
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

const RISK_HEX: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function buildWeekData(sessions: HistoricalSession[]) {
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
    label: DAY_LABELS[i],
    dose: Number(d.dose.toFixed(2)),
    range: d.hasData ? [Number(d.low.toFixed(2)), Number(d.high.toFixed(2))] : [0, 0],
    risk: (d.threshold > 0 ? riskForRatio(d.dose / d.threshold) : "low") as RiskLevel,
    threshold: d.threshold,
  }));
}

function buildTrendData(sessions: HistoricalSession[]) {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + s.cumulativeDoseSED.nominal);
  }
  const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  let rolling7: number[] = [];
  let rolling30: number[] = [];
  return sortedDays.map(([day, dose], i) => {
    rolling7.push(dose);
    rolling30.push(dose);
    if (rolling7.length > 7) rolling7.shift();
    if (rolling30.length > 30) rolling30.shift();
    return {
      day: new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sevenDay: Number(rolling7.reduce((a, b) => a + b, 0).toFixed(2)),
      thirtyDay: Number(rolling30.reduce((a, b) => a + b, 0).toFixed(2)),
    };
  });
}

function SessionRow({ session }: { session: HistoricalSession }) {
  const [expanded, setExpanded] = useState(false);
  const start = new Date(session.startedAt);
  const end = new Date(session.endedAt);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);

  return (
    <li className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {durationMin} min · {session.surface}
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
            <span className="text-[var(--muted-foreground)]">Skin type</span>
            <span>{session.fitzpatrickType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">MED threshold</span>
            <span className="hero-number">{session.medThresholdSED.nominal.toFixed(1)} SED</span>
          </div>
          {session.note && (
            <p className="mt-1 text-sm italic text-[var(--muted-foreground)]">&ldquo;{session.note}&rdquo;</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function HistoryPage() {
  const { sessions, isLoading } = useSessionHistory();
  const weekData = useMemo(() => buildWeekData(sessions), [sessions]);
  const trendData = useMemo(() => buildTrendData(sessions), [sessions]);
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
        <p className="text-lg font-semibold">No sessions yet</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Start and save your first session to see your weekly UV load here.
        </p>
        <Button asChild size="session" className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90">
          <Link href="/session">Start a session</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 py-8 pb-28">
      <h1 className="text-lg font-semibold">History</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">This week</h2>
        <div className="h-56 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`${value.toFixed(2)} SED`, "Dose"]}
              />
              {weekThreshold > 0 && (
                <ReferenceLine
                  y={weekThreshold}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: "MED", position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }}
                />
              )}
              <Bar dataKey="dose" radius={[4, 4, 0, 0]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={RISK_HEX[d.risk]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--muted-foreground)]">
          {weekData.map((d, i) => (
            <li key={i} className="hero-number">
              {d.dose > 0 ? d.dose.toFixed(1) : "–"}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">Cumulative trend</h2>
        <div className="h-48 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="thirtyDay" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.08} strokeWidth={1.5} name="30-day total" />
              <Area type="monotone" dataKey="sevenDay" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} name="7-day total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-[var(--muted-foreground)]">Sessions</h2>
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      </section>
    </main>
  );
}
