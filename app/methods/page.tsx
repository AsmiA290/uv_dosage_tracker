import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, UserCog } from "lucide-react";
import { CITATIONS, type Citation } from "@/lib/dose/citations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const EPA_LEGEND = [
  { label: "Low", range: "0–2", color: "var(--epa-low)" },
  { label: "Moderate", range: "3–5", color: "var(--epa-moderate)" },
  { label: "High", range: "6–7", color: "var(--epa-high)" },
  { label: "Very High", range: "8–10", color: "var(--epa-very-high)" },
  { label: "Extreme", range: "11+", color: "var(--epa-extreme)" },
] as const;

const PIPELINE_STEPS = [
  {
    title: "1. Forecast UV Index",
    explanation:
      "Every hour, Open-Meteo reports an all-sky UV Index for your coordinates — already accounting for real cloud cover at that hour. We interpolate it to 1-minute resolution following the sun's elevation curve, not a straight line, so values near sunrise/sunset aren't over- or under-stated.",
    formula: null,
  },
  {
    title: "2. Convert to erythemal irradiance",
    explanation: "UV Index is a unitless index; dose math needs actual power per area, so we convert first.",
    formula: "E (W/m²) = UVI × 0.025",
  },
  {
    title: "3. Apply the exposure ratio for your most exposed skin",
    explanation:
      "Sunburn shows up first on upward-facing skin: the top of the head, shoulders, and nose. Those spots catch most of the UV a flat sensor measures (about 80%, range 60-100%), more on bright ground like sand or snow. Using a whole-body average instead would make burn times look about twice as long as they really are.",
    formula: "personalUVI = ambientUVI × ER × (1 + 0.5 × (albedo[surface] − albedo[grass]))\nER ≈ 0.8 (0.6–1.0)",
  },
  {
    title: "4. Apply sunscreen attenuation",
    explanation:
      "Labeled SPF assumes a thick, even 2.0 mg/cm² layer. Real application is usually thinner, and the layer wears off over time (faster with sweat or water). Studies disagree on exactly how protection falls with a thinner layer; the app uses the more cautious exponential model.",
    formula:
      "thickness(t) = applied × 0.5^(minutesElapsed / halfLife)\neffectiveSPF = labeledSPF^(thickness(t) / 2.0)\nprotection = 1 / effectiveSPF",
  },
  {
    title: "5. Integrate cumulative dose",
    explanation:
      "Your personal irradiance curve is integrated over time (trapezoidal rule) into joules per square meter, then expressed in Standard Erythema Dose units. Dose from sessions saved earlier the same day is added, because sunburn builds up over the whole day.",
    formula: "Dose (SED) = ∫ E(t) dt ÷ 100 J/m²\ndayDose = this session + earlier sessions today",
  },
  {
    title: "6. Compare to your burn threshold",
    explanation:
      "Your Fitzpatrick skin type maps to a Minimal Erythema Dose (MED) range, the dose at which reddening begins. Remaining budget is the gap between the two. A Monte Carlo simulation (2,000 runs varying your MED, the forecast, and the exposure ratio) gives a range of burn times; the headline shows the earliest likely one (10th percentile).",
    formula: "remainingBudget = MEDthreshold − dayDose",
  },
] as const;

// citations.ts has no explicit category field, so grouping is inferred here
// from each key's content. Keep this mapping in sync when new keys are
// added to CITATIONS.
const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "Dose definitions", keys: ["uviDefinition", "sedDefinition"] },
  { title: "Skin type & MED", keys: ["fitzpatrickScale", "medRangesByType"] },
  {
    title: "Clouds, ground, and body position",
    keys: ["cloudModificationFactor", "surfaceAlbedo", "personalExposureRatio"],
  },
  { title: "Sunscreen", keys: ["sunscreenApplicationThickness", "sunscreenWearOff"] },
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
          <Button asChild variant="outline" size="sm">
            <Link href="/profile" className="gap-1.5">
              <UserCog className="size-3.5" aria-hidden="true" />
              Profile
            </Link>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          This app estimates your personal cumulative UV dose from forecasted UV Index, your skin type, and
          your logged sunscreen use. It does not assess, diagnose, or evaluate any skin condition, and it is
          not a medical device or medical advice.
        </p>
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
          Weather data is fetched live from Open-Meteo for your exact coordinates every time you open the app
          (cached at most 15 minutes) &mdash; never simulated or hardcoded.
        </p>
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 text-[var(--accent)]">
          <Link href="/why">
            <HeartHandshake className="size-3.5" aria-hidden="true" />
            Why we built this &mdash; The Actinic Shield
          </Link>
        </Button>
      </header>

      <section className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">How to read the estimate</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
          <li>
            The headline time is the <strong className="font-medium text-[var(--foreground)]">earliest likely</strong>{" "}
            point you could reach your burn threshold, so you are warned early rather than on average.
          </li>
          <li>Estimates are for your most exposed skin (top of head, shoulders, nose), where sunburn shows up first.</li>
          <li>Dose from every saved session on the same day is added together.</li>
          <li>
            Staying under your burn threshold is not the same as no damage. UV causes DNA damage in skin cells below
            the dose that turns skin red, so shade, clothing, hats, and sunscreen still matter.
          </li>
        </ul>
      </section>

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
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
          Six steps, run in order, turn a plain forecast into your running dose, remaining budget, and burn-time range. Each
          step&apos;s formula pulls straight from the constants and citations above.
        </p>
        <ol className="flex flex-col gap-0">
          {PIPELINE_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)]">
                  {i + 1}
                </span>
                {i < PIPELINE_STEPS.length - 1 && <span className="my-1 w-px flex-1 bg-[var(--border)]" />}
              </div>
              <div className="flex flex-col gap-1.5 pb-6">
                <p className="text-sm font-medium text-[var(--foreground)]">{step.title}</p>
                <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{step.explanation}</p>
                {step.formula && (
                  <pre className="whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--foreground)]/5 px-3 py-2 font-mono text-xs leading-relaxed text-[var(--foreground)]">
                    {step.formula}
                  </pre>
                )}
              </div>
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

      <footer className="glass-panel-solid flex flex-col items-center gap-4 rounded-[var(--radius)] p-5 text-center">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">
            Educational tool. Not a medical device.
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Does not diagnose or assess skin conditions.
          </p>
        </div>
        <Link href="/why" className="flex flex-col items-center gap-2">
          <div className="rounded-lg bg-[#0b0e14] px-3 py-2">
            <Image
              src="/actinic-shield-logo.png"
              alt="The Actinic Shield logo"
              width={420}
              height={100}
              className="h-auto w-36"
            />
          </div>
          <span className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline">
            A program of The Actinic Shield
          </span>
        </Link>
      </footer>
    </main>
  );
}
