# Landing showcase prototype

A standalone static prototype of the home page's "Selected work" section: five
projects that pin and assemble as you scroll, then a drifting recap carousel.
No build step, no framework, nothing here is wired into the Next.js app.

Run it:

```
cd prototypes/landing-showcase
python -m http.server 4030
```

Then open <http://localhost:4030>. `?debug` adds a small readout of which
project is active and how far through it you are.

`index.html` is **generated**: `node gen-index.cjs` rebuilds it from
`src/content/projects.ts`, so every kicker, stat and points array is the real
content. Edit the generator, not the HTML.

## Files

| File | What it is |
| --- | --- |
| `gen-index.cjs` | Builds `index.html` from the real project content, plus the prototype's copy overrides |
| `index.html` | Generated markup |
| `style.css` | Everything visual; `@import`s `tokens.css` |
| `sequence.js` | The scroll-scrubbed sequence: mode switching, phase math, the split finale |
| `carousel.js` | Recap marquee: drift, pause control, tilt and spotlight |
| `chrome.js` | Top bar, anchor scrolling, and the idle switch that stops off-screen animation |
| `brain.js` | The neural field in the hero |
| `tokens.css` | Palette, copied verbatim from the app's `globals.css` |
| `hero.webp` | The flow-field artwork, copied from `public/hero/` |

## Round 4 (this round): the review changes

Content. The employer is not named anywhere. Project 2 lost "a hostile public
data source"; project 3's hook now says what the assistant is; project 4 is
"Stock rebalancing engine", its kicker says full stack rather than backend, and
its hook credits the analysts who used to do the work by hand. These live in
`OVERRIDES` in `gen-index.cjs`, **not** in `src/content/projects.ts`: the live
site keeps its current copy until you approve this wording.

Pictures. Projects 1 and 2 were both line charts; project 2 is now one bar per
weekly bulletin with the forecast weeks hollow past a divider, and project 1
gained an actuals/forecast divider. Project 3 answers with a figure and a
three-row breakdown instead of a sentence about having answered (the numbers
are invented and realistic, not real business figures). Project 4 shows stock
crossing from a surplus store to two short ones.

Motion. Each project now takes about 2.2 screens of scroll instead of 1.2, and
the pieces are spread across more of it: roughly two turns of the wheel per
piece. Project 3 fades out completely as project 4 arrives rather than staying
behind it. The finale reaches full screen in the first half of its segment and
then drifts, instead of creeping the whole way.

Page. The flow-field artwork and the neural field are both in the hero only.
"See the work" and "Contact me" sit in the hero and in a slim bar that appears
once the hero scrolls away. The pinned stage opens on a title card with a
"keep scrolling" cue, so it never reads as an unfinished page. The contact row
is marks plus both CVs on one line.

Performance, measured with the CPU throttled 6x (`scratchpad/r4/work.cjs` and
`perf.cjs`):

- Main-thread work for one full pass: **0.64s → 0.35s**, on a page that is now
  1.6x longer.
- Script time per pass: 0.051s → 0.015s.
- Median frame time through the sequence: 67–100ms → 17–33ms.

What did it:

- The neural field lives in the hero, stops when the hero scrolls off, draws
  84–132 nodes instead of 150, and caps its backing store at 1.5x.
- Off-screen sections are marked `data-idle` and every loop inside them stops.
  The recap alone holds eleven looping pictures.
- The finale card's radial gradient became a flat tint: it is re-rendered on
  every frame of its growth, and it alone doubled that segment's frame time.
- The dim backdrop and the grayscale filter behind project 4 are gone with the
  ghost they existed for.

## Known deviations from the earlier rounds' rules

- On a window under about 620px tall the title card is hidden rather than
  overlapping project 1: the top bar, the card and a clear gap do not fit.
- The `accept-seq` suite's "parts unchanged" check and `accept-static`'s
  "identical to round 1" checks fail on purpose — the phase windows and the
  hero are what this round changed.

## Still open for review

- How strongly project 3 should fade behind project 4 (it now goes to zero).
- Project 1 exits left while project 2 enters from the left, so both move the
  same way.
- Marquee speed (40s per loop) and direction.
- In the live sequence, assistive tech only reaches the project that is on
  screen; the recap carousel exposes all five. Worth solving in the port.
