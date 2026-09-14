# v0 prompt -- "Methods" screen

Paste after the History-screen prompt, in the same v0 project.

---

Build the **Methods & Citations** screen for UV Dose Tracker at `app/methods/page.tsx`, restyling the existing functional placeholder there -- **do not change its data source.** It already imports and renders `CITATIONS` from `lib/dose/citations.ts`; your job is purely visual/structural polish of that existing component, because the citation content itself must stay wired to the single source of truth other code also reads from (so the in-app claims and the constants actually used to compute doses can never drift apart).

## Data contract (already wired -- restyle, don't replace)

```ts
interface Citation {
  key: string;
  claim: string;
  source: string;
  confirmed: boolean;
  note?: string;
}
const CITATIONS: Record<string, Citation>; // from lib/dose/citations.ts
```

## Why this screen exists

Health-professional judges are skeptical of consumer UV/skin apps by default. A visible, specific methods page -- naming every constant, every correction, and the literature it comes from, including honestly flagging which figures are "not yet verified" against a primary source -- is one of the highest-leverage pieces of credibility this project can build cheaply. Do not make this screen feel like an afterthought or a legal disclaimer buried in gray text; give it real design attention.

## Layout

1. **Top nav**, Methods active.
2. **Intro block**: one short paragraph explaining what this app estimates (personal cumulative UV dose) and, just as importantly, what it does *not* do (no lesion assessment, no diagnosis, no medical advice) -- reuse this exact framing, don't soften it.
3. **Grouped citation cards**, one per `Citation` entry, organized under clear section headers by topic (Dose definitions / Skin type & MED / Atmospheric corrections / Sunscreen / Solar geometry & forecast uncertainty) rather than as one long undifferentiated list -- group by inspecting each `key`'s content, since `citations.ts` doesn't currently carry an explicit category field. Each card shows: the claim in plain language (`claim`), the citation itself in a smaller/monospace-adjacent style suggesting "this is a reference, not prose" (`source`), a small status pill -- "Verified" (`--risk-low` tones) vs. "Not yet verified" (`--risk-medium` tones) driven by `confirmed` -- and, when present, the `note` field in italic, muted, slightly smaller text explaining what verification step remains.
4. **"How this app defines your personal dose" explainer**: a short, plain-language walkthrough of the pipeline -- UV Index -> erythemal irradiance -> personal exposure ratio -> sunscreen attenuation -> cumulative SED -> compared against your MED range -- ideally as a simple horizontal step diagram (five or six labeled nodes with connecting arrows/lines; can be built with plain divs and CSS, no diagramming library needed). This is the same pipeline the demo video will narrate, so keep the labels consistent with the video script in `docs/demo-video-script.md`.
5. **A small, isolated EPA UV Index legend** (the only place in the whole app that uses the `--epa-*` rainbow tokens): the five official categories (Low/Moderate/High/Very High/Extreme) as small labeled swatches, purely for reference -- explicitly caption it as "for reference only -- this app's own risk indicators use a simpler scale," reinforcing the design system's color-discipline decision.
6. **Footer disclaimer**, larger and more visually deliberate than a typical legal footnote: "Educational tool. Not a medical device. Does not diagnose or assess skin conditions."

## What NOT to build here

Do not add an editable citation-management UI (no add/edit/delete for citations) -- this is a static, curated reference page, and the source of truth lives in code (`lib/dose/citations.ts`), not in the database.
