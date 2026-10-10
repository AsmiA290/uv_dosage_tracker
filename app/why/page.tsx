import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, HeartPulse, Microscope, ShieldAlert, Target } from "lucide-react";
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
