import Link from "next/link";
import { UserCog } from "lucide-react";
import { CITATIONS, type Citation } from "@/lib/dose/citations";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";

const EPA_LEGEND = [
  { label: "Low", range: "0–2", color: "var(--epa-low)" },
  { label: "Moderate", range: "3–5", color: "var(--epa-moderate)" },
  { label: "High", range: "6–7", color: "var(--epa-high)" },
  { label: "Very High", range: "8–10", color: "var(--epa-very-high)" },
  { label: "Extreme", range: "11+", color: "var(--epa-extreme)" },
] as const;

const PIPELINE_STEPS = [
  "UV Index",
  "Erythemal irradiance",
  "Personal exposure ratio",
  "Sunscreen attenuation",
  "Cumulative dose (SED, Standard Erythema Dose)",
  "Compared to your burn threshold (MED, Minimal Erythema Dose) range",
] as const;

// citations.ts has no explicit category field, so grouping is inferred here
// from each key's content. Keep this mapping in sync when new keys are
// added to CITATIONS.
const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "Dose definitions", keys: ["uviDefinition", "sedDefinition"] },
  { title: "Skin type & MED", keys: ["fitzpatrickScale", "medRangesByType"] },
  {
    title: "Atmospheric corrections",
    keys: ["cloudModificationFactor", "surfaceAlbedo", "personalExposureRatio"],
  },
  { title: "Sunscreen", keys: ["sunscreenApplicationThickness"] },
  { title: "Solar geometry & forecast uncertainty", keys: ["solarPosition", "forecastUncertainty"] },
];

function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="glass-panel-solid flex flex-col gap-2 rounded-[var(--radius)] p-5">
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
          {citation.confirmed ? "Verified" : "Not yet verified"}
        </span>
      </div>
      <p className="font-mono text-xs leading-relaxed text-[var(--muted-foreground)]">{citation.source}</p>
      {citation.note && (
        <p className="text-xs italic leading-relaxed text-[var(--muted-foreground)]">{citation.note}</p>
      )}
    </div>
  );
}

export default function MethodsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-10 px-6 py-8 pb-28">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">Methods & Citations</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/profile" className="gap-1.5">
                <UserCog className="size-3.5" aria-hidden="true" />
                Profile
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          This app estimates your personal cumulative UV dose from forecasted UV Index, your skin type, and
          your logged sunscreen use. It does not assess, diagnose, or evaluate any skin condition, and it is
          not a medical device or medical advice.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {section.title}
          </h2>
          <div className="flex flex-col gap-3">
            {section.keys.map((key) => {
              const citation = CITATIONS[key];
              return citation ? <CitationCard key={key} citation={citation} /> : null;
            })}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          How this app defines your personal dose
        </h2>
        <ol className="flex flex-col gap-0">
          {PIPELINE_STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)]">
                  {i + 1}
                </span>
                {i < PIPELINE_STEPS.length - 1 && <span className="my-1 w-px flex-1 bg-[var(--border)]" />}
              </div>
              <p className="pb-6 text-sm font-medium text-[var(--foreground)]">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          EPA UV Index legend
        </h2>
        <div className="glass-panel-solid flex flex-col gap-2 rounded-[var(--radius)] p-4">
          {EPA_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <span
                className="size-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="flex-1 font-medium">{item.label}</span>
              <span className="hero-number text-[var(--muted-foreground)]">{item.range}</span>
            </div>
          ))}
        </div>
        <p className="text-xs italic text-[var(--muted-foreground)]">
          For reference only: this app&apos;s own risk indicators use a simpler scale.
        </p>
      </section>

      <footer className="glass-panel-solid rounded-[var(--radius)] p-5 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">
          Educational tool. Not a medical device.
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Does not diagnose or assess skin conditions.
        </p>
      </footer>
    </main>
  );
}
