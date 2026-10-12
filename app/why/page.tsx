import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Globe2, HeartPulse, Landmark, Microscope, ScrollText, ShieldAlert, Smartphone, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const REASONS = [
  {
    icon: ShieldAlert,
    title: "UV exposure is invisible",
    body: "There's no sting, no heat, no warning sign in the moment — the skin damage from today's sun shows up hours later, or years later. A tool that turns an invisible, cumulative exposure into a number you can watch in real time closes that feedback gap.",
  },
  {
    icon: Target,
    title: "Built for people who can't just stay inside",
    body: "Outdoor workers and athletes don't get to avoid midday sun — their job or their sport is outside. The Actinic Shield focuses on the people whose exposure is a given, not a choice, and asks: given that, how do we make it safer?",
  },
  {
    icon: Microscope,
    title: "Generic advice doesn't fit a real day",
    body: "\"Wear sunscreen\" and \"avoid peak hours\" are true but useless when you're six hours into a shift at 1 p.m. This app instead tracks your specific skin type, your sunscreen's real decay over time, cloud cover, and your actual forecast — together — as one running dose.",
  },
  {
    icon: HeartPulse,
    title: "Prevention is cheaper than treatment",
    body: "Skin cancer is one of the most preventable cancers there is. Every habit this app nudges — reapplying before protection lapses, taking shade before the budget runs out — is a small, compounding act of prevention.",
  },
] as const;

// Policy status is time-sensitive: re-check every item before each submission
// or demo and update POLICY_AS_OF. Sources are listed in POLICY_SOURCES.
const POLICY_AS_OF = "October 2026";

const POLICY_CARDS = [
  {
    icon: Landmark,
    title: "In the United States",
    points: [
      "There is no legal limit for sun exposure at work. OSHA has said it “does not have established exposure limits for radiation from the sun.” It can require protective equipment only after overexposure is shown, which is hard to show without a limit.",
      "A UV limit exists only for artificial sources. NIOSH’s 1972 recommended standard sets 30 J/m² per 8 hours for artificial UV, and for strong sunlight only recommends protective clothing. ACGIH uses the same value as a voluntary guideline.",
      "Heat protections leave UV out. A 2025 federal bill (H.R. 4443 / S. 2298), OSHA’s heat standard (proposed in 2024 and not yet final), and Illinois House Bill 3762 (still pending in the House) would set heat protections such as water, rest breaks, and shade. The federal bill’s text does not mention UV or sunscreen.",
    ],
  },
  {
    icon: Globe2,
    title: "Elsewhere",
    points: [
      "International standard: ICNIRP applies the same 30 J/m² daily limit to sunlight (about 1.0–1.3 SED), acknowledges outdoor workers will rarely stay under it, and recommends broad-brimmed hats when the UV Index is above 3.",
      "Australia: employers have a legal duty to manage workers’ sun exposure. National guidance calls for sun protection when the UV Index is 3 or higher, using shade, rescheduling, clothing, and SPF 30+ sunscreen.",
      "Germany: since 2015, squamous cell carcinoma and multiple actinic keratoses caused by sun at work can be recognized as an occupational disease, based on a reconstruction of the worker’s past exposure.",
      "European Union: workplace rules on optical radiation cover artificial sources only. The European Academy of Dermatology and Venereology has called for adding solar UV and skin checks for outdoor workers.",
    ],
  },
  {
    icon: ScrollText,
    title: "What we propose",
    points: [
      "When the UV Index is 3 or higher, heat illness prevention plans should also cover sun protection: shade, scheduling around the midday peak, and sunscreen supplied like other protective equipment.",
      "Because employers would already provide the breaks and shade, this adds little cost. Heat standards have drawn debate over cost and flexibility, so building on measures already required keeps the added burden small.",
      "NIOSH should update its 1972 ultraviolet criteria to address sunlight.",
    ],
  },
  {
    icon: Smartphone,
    title: "How this app helps",
    points: [
      "A daily work-exposure meter shows how much of the international limit each day’s sessions used. It is the same for every skin type.",
      "An exportable exposure log gives workers a dated personal record. It stays on their device unless they choose to share it.",
      "Both are estimates from the forecast, not measurements, and not for legal compliance.",
    ],
  },
] as const;

const POLICY_SOURCES = [
  { label: "OSHA interpretation letter on sun exposure (1998)", href: "https://www.osha.gov/laws-regs/standardinterpretations/1998-08-28" },
  { label: "NIOSH recommended standard for occupational UV (1972)", href: "https://stacks.cdc.gov/view/cdc/209876" },
  { label: "ICNIRP statement on protecting workers from UV (2010)", href: "https://doi.org/10.1097/HP.0b013e3181d85908" },
  { label: "S. 2298, heat illness prevention bill (2025)", href: "https://www.congress.gov/bill/119th-congress/senate-bill/2298/text" },
  { label: "Illinois HB 3762, Workplace Extreme Temperature Safety Act (bill status)", href: "https://lrb.ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB3762.html" },
  { label: "Safe Work Australia guide on solar UV", href: "https://www.safeworkaustralia.gov.au/system/files/documents/1702/guide-exposure-solar-ultraviolet-radiation.pdf" },
  { label: "DGUV/IFA on occupational disease BK 5103", href: "https://www.dguv.de/ifa/fachinfos/optische-strahlung/natuerliche-optische-strahlung/berufskrankheiten/index-2.jsp" },
  { label: "EADV call to action on skin cancer in outdoor workers", href: "https://eadv.org/wp-content/uploads/2024/08/Call-to-Action-Skin-Cancer-Call-to-Action-in-Outdoor-Workers_for-publication.pdf" },
] as const;

export default function WhyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-10 px-6 py-8 pb-28">
      <header className="flex flex-col gap-4">
        <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
          <Link href="/methods">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Methods
          </Link>
        </Button>

        <div className="glass-panel-solid flex flex-col items-center gap-3 rounded-[var(--radius)] p-6 text-center">
          <div className="rounded-xl bg-[#0b0e14] px-5 py-4">
            <Image
              src="/actinic-shield-logo.png"
              alt="The Actinic Shield logo: a shield containing a sun icon, beside the wordmark &quot;The Actinic Shield&quot;"
              width={420}
              height={100}
              className="h-auto w-full max-w-[240px]"
              priority
            />
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            This UV Dose Tracker is a program of <strong className="text-[var(--foreground)]">The Actinic Shield</strong>,
            a nonprofit dedicated to sun-safety education and skin cancer prevention for people who spend their
            days outdoors.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">Why this app exists</h1>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          &quot;Actinic&quot; is the medical word for damage caused by radiant energy — specifically, in
          dermatology, the slow harm that ultraviolet light does to skin over a lifetime of exposure. Our
          namesake is the idea that this kind of harm can be shielded against, one informed decision at a time.
          This app is our attempt to make that shield practical: not a warning poster, but a live, personal
          running total you can actually act on during your day.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        {REASONS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass-panel-solid flex flex-col gap-2 rounded-[var(--radius)] p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</p>
          </div>
        ))}
      </section>

      <section id="policy" className="flex scroll-mt-6 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Sun exposure at work: the policy gap</h2>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            Outdoor workers receive several times the yearly UV dose of indoor workers, yet sun exposure is one of the few
            workplace hazards with no exposure limit in US law. Status as of {POLICY_AS_OF}.
          </p>
        </div>
        {POLICY_CARDS.map(({ icon: Icon, title, points }) => (
          <div key={title} className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
            </div>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
        <details className="glass-panel-solid group rounded-[var(--radius)] p-4 text-xs">
          <summary className="cursor-pointer list-none font-medium text-[var(--foreground)]">Policy sources</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {POLICY_SOURCES.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Our approach
        </h2>
        <ul className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5 text-sm leading-relaxed text-[var(--foreground)]">
          <li>Educational, not diagnostic — we estimate exposure, we never assess skin or claim to detect harm.</li>
          <li>Every model parameter is cited and shown on the Methods page, including where the science is still a range rather than a single settled number.</li>
          <li>Real, live weather data for your coordinates — never a simulated or hardcoded forecast.</li>
          <li>Built around the people most exposed: outdoor workers and athletes who can&apos;t simply avoid the sun.</li>
        </ul>
      </section>

      <footer className="glass-panel-solid flex flex-col items-center gap-2 rounded-[var(--radius)] p-5 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">
          A program of The Actinic Shield
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Educational tool. Not a medical device. Does not diagnose or assess skin conditions.
        </p>
      </footer>
    </main>
  );
}
