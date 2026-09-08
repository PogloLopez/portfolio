# Decisions

Where this implementation departs from the plan it was built from
(`cortana/06-PROJECTS/portafolio/plan.md`), and why. The plan settled most things correctly and
those are not relisted here — only the changes.

---

## English, not Spanish

**Plan:** all content in Spanish; `case-studies.md` was written that way.

**Changed to:** English only.

The career document that this portfolio serves puts the target at "remote LatAm → US/EU" and
names Amperon, Odyssey Energy Solutions, Nithio and Sun King. Those readers work in English. A
Spanish-only site asks the person you most want to reach to translate your best work before
they can judge it, and the plan's own success criterion is that the site be citable in a cold
message to exactly those companies.

The Spanish source text remains in the vault, so a Spanish edition is a translation job rather
than a rewrite if one is ever wanted.

## The deep dive is a visible section, not a collapsible one

**Plan:** layer 2 "collapsible / separate section".

**Changed to:** always visible, with a sticky table of contents beside it.

The plan permitted either. Visible wins because the deep dive is the part that differentiates
this from a CV: collapsing it costs a click on the most valuable content, hides it from anyone
skimming, and makes it worth less to a search engine. The table of contents does the job the
accordion was there for — letting a reader skip to the section they care about — without hiding
anything.

## No shadcn/ui

**Plan:** Tailwind + shadcn/ui, for "cards, badges, accordion".

**Changed to:** Tailwind only.

shadcn earns its place when you need the accessibility machinery behind interactive primitives.
With the accordion gone (above), what remained were cards and badges — non-interactive elements
that are a dozen lines of Tailwind each. Installing Radix, `cva`, `tailwind-merge` and a
`components.json` to render a bordered box is dependency weight with nothing behind it.

If a real interactive primitive shows up later — a command palette, a dialog — reconsider it
then. Nothing here forecloses that.

## Diagrams are a small SVG renderer, not Mermaid

**Plan:** Mermaid embedded in MDX, because it is already the vault's standard and because
hand-made images go stale.

**Changed to:** `src/components/Diagram.tsx`, a declarative renderer fed by `diagrams.ts`.

The plan's real requirement was that diagrams be versioned source rather than exported images.
A spec in a TypeScript file satisfies that as well as a `.mmd` block does. What it also gets:

- **The site's own palette.** Mermaid's theming would land somewhere near the brand; these land
  on it, which matters because a diagram is the visual centrepiece of every deep dive.
- **No client JavaScript.** Mermaid renders in the browser and is several hundred kilobytes.
  These are inline SVG in the prerendered HTML.
- **Real text.** Selectable, searchable, and readable by a screen reader through `title`/`desc`.

The cost is explicit layout — every node states its column and row, and some edges state a
route. That is more work per diagram, and it is the reason the renderer stays deliberately
small. If diagrams ever get numerous enough that hand-placing them is a chore, that is the
signal to revisit.

## Interactive demos on every case study

**Not in the plan.** Added at Pablo's request during the build.

Each case study carries a working, clickable miniature of the product: pick a product and watch
a forecast, ask the data assistant a question and see which path it took and what SQL it ran,
approve or reject an agent's proposed action. All of it runs on synthetic data generated in the
browser.

Two rules govern them, and they are not negotiable:

1. **Everything is labelled as a simulation, visibly, inside the frame.** Not a footnote. A
   visitor must never be able to mistake a demo for Mercaldas' real prices, sales or inventory
   — for honesty first, and because it is exactly the line the confidentiality rules draw.
2. **No real data is embedded, ever**, not even "realistic" figures taken from production. The
   numbers are generated from a seeded function in the component.

The forecast demo is the one worth pointing at: it reproduces the silent horizon degradation
from that case study, so a visitor can watch every job report success while the usable forecast
horizon shrinks underneath.

## Dark only

The identity this site inherits — the GitHub header, the LinkedIn banner — is dark. A light
mode would be a second design with none of the same character. The palette is committed to once
and defined explicitly, so nothing borrows a colour from the browser's default.

## Every figure traces to a document

Audited on 2026-09-06, after the first version shipped with numbers that did not
survive checking. The rule now: **a figure appears on this site only if it is recorded in the
project's own evaluation documents**, and the document is the arbiter, not memory and not the
vault's narrative copy.

What the audit changed in the forecast case study:

- **Scale** was "thousands of series". The operational universe is over 100,000 product and
  store combinations, out of a wider universe above half a million. Understated by two orders
  of magnitude.
- **Accuracy** is a 70–82% band by cluster, confirmed by Pablo. The docs I can read only
  record the lower end of it (WMAPE 0.296 on the operational universe, run 2026-07-15); the
  upper end comes from per-cluster figures I did not locate in the repository. Treated as his
  own project knowledge, which outranks my search.
- **The baseline.** The ERP module scored roughly 30%, per Pablo. It is stated as context and
  deliberately not sold as the achievement, on his reasoning that beating a basic statistical
  model is no feat. The claim that carries weight is the same-fold comparison against the
  previous pipeline: WMAPE 0.489 → 0.394, a 19% relative reduction, which the evaluation table
  records directly.
- **The architecture was simply wrong.** The site described K-Means clustering with
  Croston/SBA. The repo explicitly marks the K-Means path legacy and not for production. The
  real champion is eight LightGBM Tweedie models by taxonomic category, a Syntetos-Boylan
  routing policy that sends intermittent, lumpy and new series to a four-week moving average
  instead, and a G1 cap on the daily prediction.
- **Attribution.** Model selection and evaluation belong to the team's data scientist, not to
  Pablo. The role line says so.
- **Test counts** were verified by counting test functions: 374 in forecast, 582 in prices, 120
  in the assistant, 0 in the operations platform (which the case study already called debt).

Figures that come from the vault's narrative rather than a repo document — "hours to minutes per
transfer plan", "several reports per week" — are kept because nothing contradicts them, and they
are the kind of claim a reference check settles in conversation rather than on paper.

## Where the deployment stands

The Vercel project is **`pablo-lopez`** under the hobby team `poglolopezs-projects`, and the
site is deployed and verified rendering. It is **not public yet**, and that is deliberate.

Vercel Authentication is on for the project with scope `all_except_custom_domains`, so every
`*.vercel.app` URL — preview and production alike — asks for a Vercel login first. Signed in as
the account owner the site opens normally; to anyone else it is a login page.

Git integration is **not** connected: the Vercel GitHub App is not installed on the account, so
deploys are manual (`npx vercel deploy`) rather than on push.

## What is left for Pablo

- **Make it public, when he is happy with it.** Two steps, in this order:
  1. Project Settings → Deployment Protection → turn **Vercel Authentication** off.
  2. `npx vercel deploy --prod` from this repo.
  Left undone on purpose — publishing is the decision the plan reserves for him.
- **Optional: connect Git.** Installing the Vercel GitHub App (`github.com/apps/vercel`) and
  linking `PogloLopez/portfolio` gives deploy-on-push and preview deployments per pull request.
- **Verify the figures.** `case-studies.md` in the vault carries a note saying the ranges are
  representative of each repo's state as of 2026-09-05 but were never checked figure by figure.
  Nothing here invented a number, but nothing here verified one either.
- **Update the vault.** `06-PROJECTS/repos-map.md` needs this repo's row, and
  `06-PROJECTS/portafolio/README.md` moves from `pendiente` to `activo`. Left undone on purpose:
  the vault working tree had uncommitted work in progress and was to be left untouched.
