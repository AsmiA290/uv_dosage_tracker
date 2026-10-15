"use client";

import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, Languages, UserCog } from "lucide-react";
import { CITATIONS, type Citation } from "@/lib/dose/citations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { Messages } from "@/lib/i18n/messages/en";

const EPA_LEGEND = [
  { key: "low", range: "0–2", color: "var(--epa-low)" },
  { key: "moderate", range: "3–5", color: "var(--epa-moderate)" },
  { key: "high", range: "6–7", color: "var(--epa-high)" },
  { key: "veryHigh", range: "8–10", color: "var(--epa-very-high)" },
  { key: "extreme", range: "11+", color: "var(--epa-extreme)" },
] as const;

// Formulas are the same in every language; the step titles and explanations
// come from the translated messages, in the same order.
const PIPELINE_FORMULAS: (string | null)[] = [
  null,
  "E (W/m²) = UVI × 0.025",
  "personalUVI = ambientUVI × ER × (1 + 0.5 × (albedo[surface] − albedo[grass]))\nER ≈ 0.8 (0.6–1.0)",
  "thickness(t) = applied × 0.5^(minutesElapsed / halfLife)\neffectiveSPF = labeledSPF^(thickness(t) / 2.0)\nprotection = 1 / effectiveSPF",
  "Dose (SED) = ∫ E(t) dt ÷ 100 J/m²\ndayDose = this session + earlier sessions today",
  "remainingBudget = MEDthreshold − dayDose",
  "workDose = this session + earlier sessions today (before sunscreen)\nshareOfLimit = workDose ÷ 1.15 SED (range ÷1.3 to ÷1.0)",
];

// citations.ts has no explicit category field, so grouping is inferred here
// from each key's content. Keep this mapping in sync when new keys are
// added to CITATIONS.
const SECTIONS: { key: keyof Messages["methods"]["sections"]; keys: string[] }[] = [
  { key: "dose", keys: ["uviDefinition", "sedDefinition"] },
  { key: "skin", keys: ["fitzpatrickScale", "medRangesByType"] },
  { key: "environment", keys: ["cloudModificationFactor", "surfaceAlbedo", "personalExposureRatio"] },
  { key: "sunscreen", keys: ["sunscreenApplicationThickness", "sunscreenWearOff"] },
  { key: "solar", keys: ["solarPosition", "forecastUncertainty"] },
  { key: "work", keys: ["icnirpDailyLimit", "icnirpSolarEquivalence", "usNoSolarLimit"] },
];

function CitationCard({ citation, verified, notVerified }: { citation: Citation; verified: string; notVerified: string }) {
  return (
    // Cited claims stay in English, the language of the sources.
    <div className="glass-panel-solid flex flex-col gap-2 rounded-[var(--radius)] p-5" lang="en" dir="ltr">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{citation.claim}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
            citation.confirmed
              ? "bg-[var(--risk-low)]/10 text-[var(--risk-low)]"
              : "bg-[var(--risk-medium)]/10 text-[var(--risk-medium)]"
          )}
        >
          {citation.confirmed ? verified : notVerified}
        </span>
      </div>
      <p className="font-mono text-xs leading-relaxed text-[var(--muted-foreground)]">{citation.source}</p>
      {citation.note && <p className="text-xs italic leading-relaxed text-[var(--muted-foreground)]">{citation.note}</p>}
    </div>
  );
}

export default function MethodsPage() {
  const { m, rich, locale } = useI18n();
  const mm = m.methods;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-10 px-6 py-8 pb-28">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">{mm.title}</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile" className="gap-1.5">
              <UserCog className="size-3.5" aria-hidden="true" />
              {mm.profile}
            </Link>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{mm.intro}</p>
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{mm.dataNote}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 text-[var(--accent)]">
            <Link href="/why">
              <HeartHandshake className="size-3.5" aria-hidden="true" />
              {mm.whyLink}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 text-[var(--accent)]">
            <Link href="/profile">
              <Languages className="size-3.5" aria-hidden="true" />
              {m.language.label}
            </Link>
          </Button>
        </div>
      </header>

      <section className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{mm.readTitle}</h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {mm.readPoints.map((point, i) => (
            <li key={i}>
              {rich(point, { strong: <strong className="font-medium text-[var(--foreground)]">{mm.earliestLikely}</strong> })}
            </li>
          ))}
        </ul>
      </section>

      {locale !== "en" && <p className="-mb-6 text-xs italic leading-relaxed text-[var(--muted-foreground)]">{mm.citationsNote}</p>}

      {SECTIONS.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{mm.sections[section.key]}</h2>
          <div className="flex flex-col gap-3">
            {section.keys.map((key) => {
              const citation = CITATIONS[key];
              return citation ? <CitationCard key={key} citation={citation} verified={mm.verified} notVerified={mm.notVerified} /> : null;
            })}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{mm.pipelineTitle}</h2>
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{mm.pipelineIntro}</p>
        <ol className="flex flex-col gap-0">
          {mm.steps.map((step, i) => {
            const formula = PIPELINE_FORMULAS[i];
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)]">
                    {i + 1}
                  </span>
                  {i < mm.steps.length - 1 && <span className="my-1 w-px flex-1 bg-[var(--border)]" />}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 pb-6">
                  <p className="text-sm font-medium text-[var(--foreground)]">{step.title}</p>
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{step.explanation}</p>
                  {formula && (
                    <pre
                      dir="ltr"
                      className="whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--foreground)]/5 px-3 py-2 text-start font-mono text-xs leading-relaxed text-[var(--foreground)]"
                    >
                      {formula}
                    </pre>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{mm.epaTitle}</h2>
        <div className="glass-panel-solid flex flex-col gap-2 rounded-[var(--radius)] p-4">
          {EPA_LEGEND.map((item) => (
            <div key={item.key} className="flex items-center gap-3 text-sm">
              <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="flex-1 font-medium">{m.uvCategory[item.key]}</span>
              <span className="hero-number text-[var(--muted-foreground)]">{item.range}</span>
            </div>
          ))}
        </div>
        <p className="text-xs italic text-[var(--muted-foreground)]">{mm.epaNote}</p>
      </section>

      <footer className="glass-panel-solid flex flex-col items-center gap-4 rounded-[var(--radius)] p-5 text-center">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">{mm.footerTitle}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{mm.footerBody}</p>
        </div>
        <Link href="/why" className="flex flex-col items-center gap-2">
          <div className="rounded-lg bg-[#0b0e14] px-3 py-2">
            <Image src="/actinic-shield-logo.png" alt="The Actinic Shield logo" width={420} height={100} className="h-auto w-36" />
          </div>
          <span className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline">{mm.program}</span>
        </Link>
      </footer>
    </main>
  );
}
