# Project pages prototype

The five case-study pages, redesigned around the finished landing
(`../landing-showcase`). The pages are committed ready to open. Run
`node build-demos.cjs` only after changing a demo in `src/`.

Run it from the **prototypes** folder, since the pages borrow the landing's
styles and scripts:

```
cd prototypes
python -m http.server 4030
```

Then open <http://localhost:4030/landing-showcase/> and click any "View full
case study", or go straight to <http://localhost:4030/project-pages/forecast.html>.

## What a page is now

1. **An opening that assembles on arrival.** It is the project's landing
   panel: the same title, hook, two figures and picture, in the same layout,
   arriving from the same direction. It takes about 1.5s and needs no
   scrolling.
2. **The story:** two paragraphs at most, under the landing's word rules.
3. **Try it yourself:** the site's real, interactive demo. `build-demos.cjs`
   bundles each React demo from `src/components/demos` with React, and
   compiles the Tailwind utilities it uses with the app's own theme. The page
   mounts it, so every control works as it does on the site. The still in
   `demos/<slug>.jpg` shows only without JavaScript.
4. **"See more":** an animated panel with the role, how long it has been
   running and the repo, then the tools one line each ("Polars — fast data
   processing"), the site's own architecture diagram, and the engineering
   numbers. On a phone it becomes a full-screen sheet.
5. **The other four**, in the landing's drifting carousel, then the landing's
   contact row. There is no neural field and no hero artwork, so the pages
   stay light.

## Files

| File | What it is |
| --- | --- |
| `content.cjs` | **All the new wording, for review**: story, tools, numbers, role/running/repo |
| `gen-pages.cjs` | Builds `<slug>.html` from the landing's generator plus `content.cjs` |
| `pages.css` | What a project page adds on top of the landing's `style.css` |
| `mode.js` | Chooses live or static the same way the landing does |
| `page.js` | The "See more" panel: exit animation and click-outside (the rest is native `<dialog>`) |
| `build-demos.cjs` | Bundles the real demos into `demos/<slug>.js` and `demos/demos.css`. It installs esbuild into a git-ignored `.tools/`, so `package.json` is untouched. |
| `capture-demos.cjs` | Takes the no-JavaScript stills from the built app (`next start -p 3100`) |
| `demos/`, `diagrams/*.svg` | The demo bundles, their styles and stills, and the diagrams |
| `verify.cjs` | `node verify.cjs` (set `AXE=<path to axe.min.js>` for the audit, 72 checks) |
| `../interact.cjs` | `node ../interact.cjs`: real clicks and taps on everything (63 checks) |
| `perf.cjs`, `shots.cjs` | Frame times at 4x CPU throttle; review screenshots |

The landing's generator now exports its pieces (`module.exports`) and only
writes `index.html` when it is run directly. Its CTAs point here
(`../project-pages/<slug>.html`), where they used to point at `#case-<slug>`.
Apart from those links its output is byte-identical, and its `verify.cjs`
passes 15/15.

## Checked

- **`../interact.cjs`: 63/63.** This one clicks everything the way a person
  does: a real mouse or finger moved onto the element and pressed, then a
  check that the right thing happened. It covers:
  - the root address;
  - every link and button on the landing;
  - the carousel on every pass, on the landing and all five pages;
  - Pause and Play;
  - "← All work", the name, "Contact me" and "See more" on every page, with
    close, click outside, Escape and the mouse wheel inside the panel;
  - every control of every demo, including the ones that only appear after an
    action;
  - on a phone: taps, and no page ever wider than the screen, not even during
    the arrival, and no demo content cut off.

- **`verify.cjs`: 72/72 with the axe audit.** It also checks that every figure
  of 10 or more in the new wording appears in the site's own content, or in
  the figures you gave directly. It covers every page and the
  panel both closed and open:
  - the opening assembles, and its words match the landing card;
  - the employer is never named;
  - the story is two paragraphs at most;
  - the demo and the diagram load;
  - the panel opens, keeps focus inside, locks the page, and closes by
    Escape, by a click outside and by its button, handing focus back;
  - the carousel links the other four, and every card link in both
    prototypes resolves;
  - reduced motion runs no animations;
  - a phone has no sideways scroll and gets a full-screen sheet;
  - there are no console errors or missing files.
- **Frame times at 4x CPU throttle:** the arrival and scrolling hold a median
  16.7ms (60fps), the same as the landing. Opening the panel is 16.8ms median,
  with a short hitch on the first open while its contents are drawn for the
  first time. Staggering the panel's contents cost most of that, so it was
  removed.

## Fixed after your review

- **The root address showed a directory listing.** `prototypes/index.html` now
  sends it to the landing, and it is dark from the first frame.
- **The carousel was dead on every other pass.** Its copies were `inert`, and
  an inert element cannot be clicked. The workaround only ever wrote
  `#../project-pages/…` into the address bar. The copies are ordinary links
  now, hidden from screen readers and the Tab key, and the workaround is gone.
  This affected the landing too.
- **The demos were pictures.** They are the real, working demos now (see
  above).
- **"19% less error" was dropped.** It came from the live site's own content
  (`projects.ts:78`, `forecast.mdx:90`). The story uses your figures instead:
  about 30% accuracy with the ERP, 70–82% today. **The live site still says
  19%.**
- **Scrollbars.** The panel's scrollbar is slim and in the project's colour.
  Both prototypes use dark native controls, and the page scrollbar uses the
  site's palette.
- **Phones:**
  - The forecast page became 44px wider than the screen while the opening slid
    in, and stayed that wide. The opening now clips sideways.
  - The stock-rebalancing and Cortana demos were cut off on the right by 53px.
    This happens on the **live site too**. The fix is in the real demos,
    `src/components/demos/{Operations,Cortana}Demo.tsx`, whose single-column
    grid could not shrink below its table (`grid-cols-1`).
- **"Contact me" on the landing** jumps straight there when the target is
  more than three screens away, instead of smooth-scrolling across the whole
  pinned sequence.

## Second review round (feedback.md)

Wording changes are in `content.cjs`, plus two landing card lines that the
page openings share: the forecast hook says "SKU+Store combinations" and the
transfer stat says "4h → 5min". The other changes are made in the site's own
sources, so they reach the live site when this merges:

- **`ForecastDemo.tsx`:** the policy text box and the note under the demo are
  gone. The footer reads "Orchestrated weekly in Dagster" followed by
  Dagster's own mark (`DagsterMark.tsx`, copied from dagster-io/dagster). The
  LightGBM row says "one model per cluster". `DemoFrame`'s `note` is now
  optional.
- **`OperationsDemo.tsx`:**
  - The quantity inputs (the spinner arrows) are gone, and the plan is
    static.
  - Stock is at a real store's scale: 16 to 372 units on hand, and moves of
    18 to 84 units.
  - The solver no longer throws away a whole surplus store over a 1-unit
    leftover.
  - The note says "real inventory".
- **`diagrams.ts`:**
  - Forecast: "one per cluster".
  - Stock engine: redrawn without the Gmail API, the inboxes or the
    standalone scripts, and "Web app" in place of "plain JS". Its old title,
    "One API where separate scripts used to be", is replaced.
  - Cortana: "Automatic backups" in place of "restore drill".
- **Captions:** the forecast and stock-engine diagrams are shown without one
  (`NO_CAPTION` in `gen-pages.cjs`).
- **Repo line:** it shows only when the repo is public, so only Cortana has
  one.
- **Numbers:** a number marked `wide` takes two columns, so
  "30% → 70–82%" stays on one line.

## To do when these move into the app

- **Demo subtitles and notes still name the employer.** They are renamed only
  in the stills, so change the React sources:
  - `MarketPricesDemo.tsx:333` `mercaldas-precios-mercado` → `market-prices`
  - `MarketPricesDemo.tsx:334` "from DANE or from Mercaldas" → "…or from the company"
  - `RagDemo.tsx:178` `mercaldas-rag` → `business-data-assistant`
- **The site's demos have five small contrast shortfalls,** ratios of 3.98 to
  4.43 against the 4.5 required. They are on the live site today, and the
  audit reports them apart rather than restyling them silently:
  - the "Simulation · synthetic data" badge on market prices and the business
    data assistant (accent text on its tint);
  - the forecast's "Champion" chip;
  - an accent button in the business data assistant;
  - the red line in the Cortana diff.

  The fix is to lighten each text colour slightly.
- **The rest of the site still names the employer:**
  - the confidentiality line on the project page (`[slug]/page.tsx:247`);
  - the home intro (`page.tsx:88`);
  - `site.ts:13`.
- **Repo names contain the employer's name,** so the four work projects show
  no repo line. Cortana shows its real repo names.
- **`projects.ts` still has the old wording:** "4h to 5min", the Gmail API,
  and "product and store".
- **The long MDX write-ups are replaced.** Their content is condensed into
  `content.cjs` and they stay in git history.

## Open for your review

- The wording in `content.cjs`: 5 stories, 5 tool lists, 5 sets of numbers.
- Whether Cortana's repo should link to GitHub, if it is public.
- Project 3's picture caption, "Question, routed path, verified answer", comes
  from the landing and still says "routed path", the jargon the picture itself
  dropped.
