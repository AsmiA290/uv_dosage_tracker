import { CITATIONS } from "@/lib/dose/citations";

/**
 * Methods & citations page — required by the brief (section 10): "Cite
 * every model parameter in-app." This renders lib/dose/citations.ts
 * directly, so the in-app page and the source-of-truth citation registry
 * can never drift apart. Style this from v0-prompts/04-methods-screen.md;
 * do not hand-author the citation text again in the generated component —
 * keep importing CITATIONS.
 */
export default function MethodsPage() {
  const citations = Object.values(CITATIONS);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Methods &amp; citations</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Every constant and correction used to compute your dose estimate, with its source. Entries marked
        "not yet verified" are literature-consistent starting points pending confirmation against a single
        chosen primary source (see the project&apos;s own build checklist).
      </p>

      <div className="mt-8 space-y-6">
        {citations.map((c) => (
          <div key={c.key} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium">{c.claim}</p>
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " +
                  (c.confirmed ? "bg-[var(--risk-low)]/10 text-[var(--risk-low)]" : "bg-[var(--risk-medium)]/10 text-[var(--risk-medium)]")
                }
              >
                {c.confirmed ? "Verified" : "Not yet verified"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{c.source}</p>
            {c.note && <p className="mt-2 text-xs italic text-[var(--muted-foreground)]">{c.note}</p>}
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-[var(--muted-foreground)]">
        This app estimates cumulative UV exposure for educational purposes. It does not diagnose skin
        conditions and is not a substitute for medical advice.
      </p>
    </main>
  );
}
