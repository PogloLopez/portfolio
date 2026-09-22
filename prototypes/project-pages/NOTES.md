# Project pages prototype

The five case-study pages, redesigned around the finished landing
(`../landing-showcase`). No build step, and nothing in `src/` changes.

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
3. **Try it yourself:** the real demo. In the prototype it is a still,
   because the demos are React; the live demo mounts here in the app.
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
| `capture-demos.cjs` | Takes the demo stills from the built app (`next start -p 3100`) |
| `demos/*.jpg`, `diagrams/*.svg` | The captured demos and diagrams |
| `verify.cjs` | `node verify.cjs` (66 checks; set `AXE=<path to axe.min.js>` for the audit, 71 checks) |
| `perf.cjs`, `shots.cjs` | Frame times at 4x CPU throttle; review screenshots |

The landing's generator now exports its pieces (`module.exports`) and only
writes `index.html` when it is run directly. Its CTAs point here
(`../project-pages/<slug>.html`), where they used to point at `#case-<slug>`.
Apart from those links its output is byte-identical, and its `verify.cjs`
passes 15/15.

## Checked

- **`verify.cjs`: 71/71 with the axe audit.** It covers every page and the
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

## To do when these move into the app

- **Demo subtitles and notes still name the employer.** They are renamed only
  in the stills, so change the React sources:
  - `ForecastDemo.tsx:273` `mercaldas-forecast` → `demand-forecast`
  - `MarketPricesDemo.tsx:333` `mercaldas-precios-mercado` → `market-prices`
  - `MarketPricesDemo.tsx:334` "from DANE or from Mercaldas" → "…or from the company"
  - `OperationsDemo.tsx:164` `mercaldas-data` → `stock-rebalancing`
  - `RagDemo.tsx:178` `mercaldas-rag` → `business-data-assistant`
- **`src/content/diagrams.ts:188`**: "Operations & planning / used to queue
  behind me" → "Purchasing analysts / planned transfers by hand".
- **The rest of the site still names the employer:**
  - the confidentiality line on the project page (`[slug]/page.tsx:247`);
  - the home intro (`page.tsx:88`);
  - `site.ts:13`.
- **Repo names contain the employer's name,** so the panel says "Private
  repository" for the four work projects. Cortana shows its real repo names.
- **The long MDX write-ups are replaced.** Their content is condensed into
  `content.cjs` and they stay in git history.

## Open for your review

- The wording in `content.cjs`: 5 stories, 5 tool lists, 5 sets of numbers.
- Whether Cortana's repo should link to GitHub, if it is public.
- Project 3's picture caption, "Question, routed path, verified answer", comes
  from the landing and still says "routed path", the jargon the picture itself
  dropped.
