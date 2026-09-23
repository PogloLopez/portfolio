# portfolio

A technical portfolio presenting five systems as case studies: the business problem, the
architecture decisions and what they cost, and the most interesting thing that went wrong in
each.

Built to be citable in a cold message. The audience is hiring managers and engineers in energy
access and distributed generation, so the site is in English.

---

## Running it

```bash
npm install
npm run site       # rebuild public/site/ after changing content, diagrams or demos
npm run build      # checks public/site/ is up to date, then builds Next
npx next start -p 4030
npm test           # every check, against http://localhost:4030 (BASE=<url> for another)
npm run lint
npm run assets     # regenerate the hero image and the icon from assets/source/
```

Node 20+. No environment variables, no database, no external services at runtime.

## How it is built

The pages are plain HTML, CSS and JavaScript: a scroll-driven landing and five project pages.
They are generated from the TypeScript content, committed to `public/site/`, and served by
Next.js at the real addresses:

| Address | File | |
|---|---|---|
| `/` | `public/site/index.html` | the landing |
| `/projects/<slug>` | `public/site/projects/<slug>.html` | a project page |
| `/opengraph-image`, `/projects/<slug>/opengraph-image`, `/icon.png` | `src/app/` | social cards and icon, rendered by Next |

The rewrites in `next.config.ts` do the mapping. Anything else is Next's 404 page.

`npm run site` (`src/site/build.cjs`) produces everything generated in `public/site/`:

- **the HTML** of every page, from `src/content/projects.ts` and `src/lib/site.ts`, through
  `src/site/landing.cjs` and `src/site/project-page.cjs`;
- **each architecture diagram**, rendered with the real `src/components/Diagram.tsx` from
  `src/content/diagrams.ts`;
- **each interactive demo** (`src/components/demos/`), bundled with React into
  `public/site/demos/<slug>.js`, plus the Tailwind utilities they use in `demos/demos.css`,
  compiled against `src/components/demos/theme.css`.

The rest of `public/site/` is hand-written and edited in place: `style.css`, `tokens.css`,
`pages.css`, the scripts (`sequence.js`, `brain.js`, `carousel.js`, `chrome.js`, `mode.js`,
`page.js`), `hero.webp` and the demo stills in `demos/*.jpg` (`node tests/capture-stills.cjs`).

The generated files are committed, so a deploy serves exactly the bytes that were reviewed.
`npm run build` starts with `npm run site:check`, which fails the build if they are stale.

## Where the content lives

```
src/content/projects.ts     every word about the five projects: landing panels and cards,
                            each page's story, tools, numbers, role and running time
src/content/diagrams.ts     the architecture diagram for each slug
src/lib/site.ts             name, role, one-liner and the canonical address
```

A card on the landing and the page it opens are drawn from the same entry by the same code, so
they cannot disagree.

## Confidentiality rules baked into the content

Four of the five projects run at an employer, a retail chain in Colombia. The rules below are
the constraint the content was written under.

- **The employer is never named**, on any page or in any demo. `npm run site` fails if its name
  appears in the output. Its repositories carry the name, so those pages show no repo.
- **Business figures appear as ranges, orders of magnitude or relative percentages.** Never
  exact revenue, margin, cost or volume figures.
- **No source code and no screenshots of real operating data.** Architecture diagrams are fine.
- **Cortana carries none of this**: it is a personal project.

## Interactive demos

Each project page carries a small interactive demo of the product. **Every one runs on synthetic
data and is labelled as a simulation in the interface.** They exist so a visitor can form an
impression by clicking rather than by reading, and they must never be mistakable for production
data. If you extend them, keep the label.

The demos have five small contrast shortfalls (ratios of 3.98 to 4.43 against the 4.5 required):
the "Simulation · synthetic data" badge on market prices and the business data assistant, the
forecast's "Champion" chip, an accent button in the business data assistant, and the red line
in the Cortana diff. `tests/verify-pages.cjs` reports them apart when run with `AXE=<path to
axe.min.js>`.

## On a phone

Under 780px the site is its own design, not the desktop one with the moving parts removed.
`mode.js` sets two switches on `<html>`, and the difference is which one a visit gets:

| | what it drives | who gets it |
|---|---|---|
| `seq-live` | the landing's pinned sequence, the carousel's drift, the cursor tilt | motion allowed, a fine pointer, a window 780px or wider |
| `viz-live` | the project pictures' own loops | motion allowed — a phone included |

What that adds up to:

- **The pictures move.** They are the work's only moving proof, and five frozen pictures read
  as a page that failed to load. `chrome.js` gives each project block and each card its own
  idle switch in the stacked layout, so only the picture on screen is running.
- **Each block arrives as it is scrolled to** (`data-reveal`, also `chrome.js`), which is the
  sequence's move, once per part. Set from JavaScript only: without it, or with reduced motion,
  everything is visible from the first paint.
- **The closing carousel becomes a row you swipe** (`.mstrip`, `landing.cjs`'s `strip()`).
  Five full project cards stacked in a column were the five project blocks over again. The
  swap is by pointer as well as width: a touch screen of any size gets the row, because the
  drift and the tilt need a mouse.
- **The neural field is drawn, not run.** Clearing and repainting a full-screen canvas every
  frame was 13% of frames over 33ms while scrolling the landing (a mid-range phone, CPU
  throttled 6x); it keeps its shape and its dispersal on scroll, and gives up its idle drift.
  That, and the per-block idle switch, hold the scroll at a 16.7ms median and 1–3% slow frames.
- **Everything you tap is at least 44px** on its short side, 48px for the page's own actions,
  and the bar carries one action per page rather than a copy of the hero's pair.
- **The pictures are sized for a screen held in one hand** (about a third of it), the
  conversations grow to fit their text instead of overflowing a fixed frame, and the mono
  labels go up to 12px.
- **A notch is accounted for**: `viewport-fit=cover` plus `env(safe-area-inset-*)` in the
  gutters, the bar and the foot of the page.

A project page runs to about five screens on a phone, where it used to be eight.

## Tests

All of them drive Chromium against a running server (`tests/lib.cjs`):

- `tests/verify-landing.cjs`: the scroll sequence, its phases, the keyboard path, reduced
  motion, no JavaScript.
- `tests/verify-pages.cjs`: each page's opening, story, demo, diagram and "See more" panel, the
  carousel, phones and reduced motion. `AXE=<path>` adds an accessibility audit.
- `tests/verify-mobile.cjs`: the phone version at 390px and 320px — no sideways scroll, no
  text over text, 44px targets, the pictures animating only where they can be seen, the swipe
  row, the full-screen sheet, and reduced motion. `AXE=<path>` adds an audit, run with the page
  at rest.
- `tests/interact.cjs`: real mouse clicks and taps on every link, button and demo control.
- `tests/perf.cjs` (frame times at 4x CPU throttle, or `node tests/perf.cjs home phone` for a
  phone at 6x) and `tests/shots.cjs` (review screenshots).

## Images

`assets/source/flow-field.png` is the artwork behind the GitHub profile header and the LinkedIn
banner, extracted from that repository's `header.svg` and committed here so this repo does not
depend on the other one. `npm run assets` derives the hero (`public/site/hero.webp`) and the
favicon from it.
The site's palette is sampled from the same file, which is why the portfolio, the GitHub profile
and the CV read as one identity.

## Deploying

Deploys come from Git. A push to `main` publishes to production. A push to any other branch
gets its own preview: a URL per deployment, plus one that always follows the branch, e.g.
`pablo-lopez-git-develop-poglolopezs-projects.vercel.app` for `develop`. Previews are behind
Vercel's login. There is nothing to run by hand.

The manual path still works for a one-off, because the repo is also linked locally
(`.vercel/`, ignored by git):

```bash
npx vercel deploy          # preview
npx vercel deploy --prod   # production
```

The Vercel project is `pablo-lopez` on the hobby team `poglolopezs-projects`. The site is public
at **<https://pablo.maieutik-data.com>**, which is the canonical address; `pablo-lopez.vercel.app`
is an alias of the same project. `site.url` must match the canonical one: every canonical link
and social card URL the pages emit is built from it.

Vercel Web Analytics loads from `/_vercel/insights/script.js`, which only exists on a
deployment, so the pages request it only off localhost (`src/site/head.cjs`).

## Structure

```
src/
  site/                 the page generator (build.cjs, landing.cjs, project-page.cjs, head.cjs)
  app/                  the social cards, the icon and the 404 page
  components/           Diagram.tsx and demos/
  content/              projects.ts, diagrams.ts
  lib/                  site config, social card layout
public/site/            the pages as served: generated HTML and demo bundles, hand-written CSS/JS
tests/                  browser checks against a running server
assets/source/          the original artwork, input to npm run assets
scripts/                asset pipeline
```

`DECISIONS.md` records where this implementation departed from the original plan, and why.
