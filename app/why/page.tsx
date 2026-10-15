"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Globe2, HeartPulse, Landmark, Microscope, ScrollText, ShieldAlert, Smartphone, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

const REASON_ICONS = [ShieldAlert, Target, Microscope, HeartPulse] as const;

// Policy status is time-sensitive: re-check every item before each submission
// or demo and update POLICY_AS_OF. Sources are listed in POLICY_SOURCES.
const POLICY_AS_OF = "October 2026";

const POLICY_CARDS = [
  {
    icon: Landmark,
    key: "us",
    title: "In the United States",
    points: [
      "There is no legal limit for sun exposure at work. OSHA has said it “does not have established exposure limits for radiation from the sun.” It can require protective equipment only after overexposure is shown, which is hard to show without a limit.",
      "A UV limit exists only for artificial sources. NIOSH’s 1972 recommended standard sets 30 J/m² per 8 hours for artificial UV, and for strong sunlight only recommends protective clothing. ACGIH uses the same value as a voluntary guideline.",
      "Heat protections leave UV out. A 2025 federal bill (H.R. 4443 / S. 2298), OSHA’s heat standard (proposed in 2024 and not yet final), and Illinois House Bill 3762 (still pending in the House) would set heat protections such as water, rest breaks, and shade. The federal bill’s text does not mention UV or sunscreen.",
    ],
  },
  {
    icon: Globe2,
    key: "elsewhere",
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
    key: "propose",
    title: "What we propose",
    points: [
      "When the UV Index is 3 or higher, heat illness prevention plans should also cover sun protection: shade, scheduling around the midday peak, and sunscreen supplied like other protective equipment.",
      "Because employers would already provide the breaks and shade, this adds little cost. Heat standards have drawn debate over cost and flexibility, so building on measures already required keeps the added burden small.",
      "NIOSH should update its 1972 ultraviolet criteria to address sunlight.",
    ],
  },
  {
    icon: Smartphone,
    key: "helps",
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
  const { m, rich, locale } = useI18n();
  const w = m.why;
  const policyLang = locale === "en" ? undefined : "en";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-10 px-6 py-8 pb-28">
      <header className="flex flex-col gap-4">
        <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
          <Link href="/methods">
            <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden="true" />
            {w.back}
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
            {rich(w.orgIntro, { org: <strong className="whitespace-nowrap text-[var(--foreground)]">The Actinic Shield</strong> })}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">{w.title}</h1>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          {w.body}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        {w.reasons.map(({ title, body }, i) => {
          const Icon = REASON_ICONS[i] ?? ShieldAlert;
          return (
          <div key={i} className="glass-panel-solid flex flex-col gap-2 rounded-[var(--radius)] p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</p>
          </div>
          );
        })}
      </section>

      <section id="policy" className="flex scroll-mt-6 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{w.policyTitle}</h2>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{w.policyIntro.replace("{date}", POLICY_AS_OF)}</p>
          {policyLang && <p className="text-xs italic leading-relaxed text-[var(--muted-foreground)]">{w.policyNote}</p>}
        </div>
        {POLICY_CARDS.map(({ icon: Icon, key, points }) => (
          <div key={key} className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{w.policyCards[key]}</h3>
            </div>
            {/* Policy wording stays in English so legal terms stay exact. */}
            <ul
              lang={policyLang}
              dir={policyLang ? "ltr" : undefined}
              className="flex list-disc flex-col gap-2 ps-5 text-sm leading-relaxed text-[var(--muted-foreground)]"
            >
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
        <details className="glass-panel-solid group rounded-[var(--radius)] p-4 text-xs">
          <summary className="cursor-pointer list-none font-medium text-[var(--foreground)]">{w.sources}</summary>
          <ul className="mt-3 flex flex-col gap-2" lang="en" dir="ltr">
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{w.approachTitle}</h2>
        <ul className="glass-panel-solid flex flex-col gap-3 rounded-[var(--radius)] p-5 text-sm leading-relaxed text-[var(--foreground)]">
          {w.approach.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <footer className="glass-panel-solid flex flex-col items-center gap-2 rounded-[var(--radius)] p-5 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">{w.program}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{w.footer}</p>
      </footer>
    </main>
  );
}
