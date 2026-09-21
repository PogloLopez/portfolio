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
| `verify.cjs` | `node verify.cjs` — drives the page in Chromium and checks the things that break by accident |

## Round 12 (this round): the review changes

Neural field, a real bug in round 11's trigger measurement. It read
`#work-title` and `.work__lede`'s position with `getBoundingClientRect()`,
which is only a stable document offset for ordinary, normal-flow elements —
these two live inside the pinned sequence's sticky stage, which sequence.js
actively scrubs: past a certain scroll point `.work__intro` is set to
`display: none` (a hidden element's rect is `(0,0,0,0)`), and even while
shown, its position is relative to the sticky stage's *current* on-screen
spot, not a fixed place in the document. Either way, `rect.top + scrollY`
came out different depending on where the page happened to be scrolled on
load or resize — which is exactly the bug reported: the field's rest point
drifted with wherever a reload landed. Fixed by reading `.sequence` instead
(the plain, always-normal-flow, never-hidden wrapper the whole pinned
system lives inside) and using fixed pixel offsets from its top for the
title and lede positions, rather than measuring the scrubbed elements
directly. Confirmed by reloading mid-scroll and near the end of the page:
`--brain-anchor` now computes to the identical value every time.

## Round 11: the review changes

Neural field, confirmed in writing before building it this time (round 10's
version scrolled with the page correctly, but was already fixed and on
screen from page load — the actual ask was two phases, not one). It is
present in the document from load, anchored next to "Selected work" and
scrolling with the page exactly like any other content — invisible until
that point scrolls into view, same as any content below the fold — until
"Selected work" is a quarter of the way down the viewport, at which point
it locks to the screen and starts dispersing, staying stuck (and coming
apart) for the rest of the page. Built on `position: sticky`, not a custom
scroll-position switch: `.brain-track` is an absolutely-positioned overlay
the height of the whole document (`body` is its containing block, now
`position: relative`), which takes no layout space itself but gives its
sticky child room to stick through the entire remaining page; `#brain-canvas`
is `position: sticky; top: 0` with a `margin-top` (`--brain-anchor`) that
`brain.js` sets to the same document position used for the dispersal
trigger, so the two engage on the same scroll pixel by construction, not
by keeping two numbers in sync by hand. The `IntersectionObserver` that
pauses the animation off-screen is back too — sticky means there is now a
real stretch before the trigger where the canvas is genuinely off the top
of the screen, not just quiet.

Project 2's picture. "Peaks" meant highs only, not every high and low —
round 10's shape had one peak per side. This one: three descending highs
before today (90, 78, 68), landing at a low, then two rising highs in the
forecast (72, then 95, the one "Buy now" names) — nine legs, ten points,
still every leg exactly two of them. The point count needed for that shape
doesn't land the default 0.66-of-length split rule on the index it actually
needs, so `lineGeometry` and `marketViz` both take an explicit split
override now, read from `visual.split` when a project sets one.

## Round 10: the review changes

Neural field, a different design instead of another patch on the hero one.
Round 9's translucent fade was still too faint against the actual page (a
tight crop made it look more visible than it was) — rather than keep tuning
opacity against a fade built for something else, the field's resting point
moved out of the hero entirely: it now sits just left of the "Selected
work" lede, and stays put (no dispersal, only its idle drift) until that
heading reaches a quarter of the way down the viewport. Both the position
and the trigger are measured off the real elements (`.work__lede`,
`#work-title`) rather than guessed as fixed fractions, since both are
normal-flow content above the pinned sequence's pin point and safe to read
once per resize(). `.hero__art-fade` is back to its original solid — it was
only ever translucent to let the field show through a position it no longer
rests at.

Project 2's picture. A single decline-then-climb (last round) was not the
ask: this is 5 points, split lands on the 3rd by the existing 0.66 rule, so
it draws as down / up (to today) / down / up (the forecast) — four legs,
each exactly two points, so each is unambiguously one straight line. Today
lands on a real peak, and the forecast opens with one more dip before the
turn the "Buy now" chip names.

Contact marks. GitHub's size was already right and stayed there; LinkedIn
and Gmail needed their own classes to move independently of it (they were
all sharing `.ico`) and are a notch smaller again.

## Round 9: the review changes

Neural field, two real bugs from round 8's restructure. It was invisible at
the top of the page: `.hero__art-fade` paints solid `var(--ground)` over
the hero's left ~40% (to blend the artwork into the page there), and used
to sit under the field when the field was a sibling inside `.hero__art` at
a higher z-index — moving the field out to a fixed, page-level layer put it
behind that fade instead, and solid ground fully hid it. The fade is
translucent now (55%/40% ground instead of 100%), which still softens the
edge without blocking what is behind it. Separately, its dispersal was
tied to one viewport height, so it finished almost immediately and then
just idled for the rest of the (very long) page; span is now the full
document scroll range, so it keeps visibly coming apart the whole way down,
much more slowly.

Project 2's picture, restraightened. Even project 1's own points alternate
direction on nearly every step — what actually reads as "clean lines" is
each rise or fall landing on one slope, not several segments at close but
different angles. This round's points are two exactly-evenly-spaced runs (a
straight -5-per-step decline, then a straight +10-per-step climb) meeting
at the split, so each leg draws as one line, not an approximation of a
curve. The shape itself now carries the "Buy now" case instead of relying
on the chip alone: prices have been falling, and the forecast turns up
exactly at today. The internal-price line (a trailing average of the same
points) tracks it closely now too, being a smoothed copy of a line that is
itself simple, rather than of a zigzag.

Contact marks, one size down from round 8's — round 8 overshot on the first
pass with the real box finally free to use.

## Round 8: the review changes

Neural field, for real this time. Round 7's fix addressed the wrong problem
(a slow idle drift) — the actual ask, repeated across several rounds, was
that the field should stay with you for the whole scroll, the way it does
on the live site, instead of scrolling away with the hero and being absent
for the other 95% of the (very long, ~1200vh) page. It is now a fixed,
page-long background again: tokens.css already had it this way (`position:
fixed`, copied from the live site's own globals.css) and round 4 overrode
that to confine it to the hero for a frame-budget win on weak hardware,
which is what this round gives back on request. The `<canvas>` moved out of
`.hero__art` to a direct child of `<body>`: `.hero` has its own stacking
context (`isolation: isolate`, for the split/finale swap later in the
sequence), and a `position: fixed` descendant of one is still confined to
compete inside it, which would have kept the field pinned to the hero's
old screen position instead of the viewport's. `brain.js`'s span is now the
viewport height, not the hero's, and the "stop once the hero scrolls off"
`IntersectionObserver` is gone — a fixed element never leaves the viewport,
so it was dead code once the position changed.

Project 2. The internal-price line is a full second series again, not the
flat reference it became last round: dropping it wasn't asked for, only a
better colour was, so it never should have been cut down to that. Its own
colour is the site's blue (`var(--iris)`) instead of grey. Its points are
recomputed with fewer, gentler swings — the previous set read as a roller
coaster (a peak or valley on nearly every step, each about the same size as
the trend itself); this one climbs the way project 1's own points do, with
pullbacks that are small next to the overall rise rather than matching it.

Project 3. "Embedded/Vector DB" is the stat's subtext now, under "Golden
queries" — not a replacement for it, which is what last round did by
mistake. Hook: "sales, inventory and purchasing" (was "margin").

Contact marks. Round 7's repeated failure to visibly enlarge them had a
real cause: a stale rule from an older build of `.contact__links a`,
setting `padding: 0.65rem 1rem`, survived every round because it was never
actually deleted, only judged harmless. That padding alone left about 7.6px
of the 2.6rem box free for the mark, no matter what `.ico`'s own width said
— confirmed by measuring the rendered SVG box, not just rereading the CSS.
Deleted now. With the real box finally available, the marks went a little
past the mark on the first correct pass and came back down a notch.

## Round 7: the review changes

Neural field. Its idle drift at rest (2px, a 15.7s cycle) was too slow and
too small to read as motion — which is what made the field look static
before you had scrolled at all, not the scroll-linked dispersion itself
(that part already worked; confirmed by scripting real scroll, since the
methodology that first suggested otherwise turned out to be an artifact of
how the screenshot was taken, not the page). Now 3.5-6px on Y, a matching
X wobble, and roughly twice the speed.

Project 2's picture, redrawn. Not "make the bars nicer" — built the same way
project 1's chart is (same `lineGeometry`, same grid/ghost/trace/tail
classes, same gradient fill), because that chart was the example of "clean"
to build toward. The internal-price line is now a single flat dashed
reference instead of a second jagged series threading through the market
line — two independently-drawn angular lines crossing was most of what read
as messy. The "Buy now" verdict moved into a small pill in the corner
(right/bottom, auto width) instead of a bar spanning the chart's full width,
which had been overlapping the lines above it; the longer reason is now a
title tooltip instead of a second line inside the chip.

Project 3. "Golden queries" is now "Embedded/Vector DB" — a different real
component, not a rewording of the same idea. `.stat__label` is up from
0.8125rem to 0.9375rem, sitewide (every project's KPI subtext, not just this
one, since they all share the class).

Project 5. Its two card stats were still engineering metrics ("4 gates
required in CI"); now "Zero / Irreversible actions without approval" and
"< $20/mo / Total cloud spend", matching the "Zero" pattern project 3 already
uses for a trust stat. Its picture is a different exchange (spent $50 at the
movies, assistant offers to update the budget, "waiting on your OK" status
line) instead of the bank-transfer one, and its frame is taller (9rem to
13rem): three rows no longer fit the box sized for the old ledger mockup's
one tight block, and the top bubble was overlapping the caption above it.

Contact marks. The box goes back to 2.6rem — round 6 grew the box itself,
which was not the ask (fill more of the existing box). The icon inside it is
now 2.3rem (2.55rem for Gmail), most of the box rather than half of it.
LinkedIn's and GitHub's paths are Simple Icons' (CC0), not the hand-plotted
approximation from the original build: at the size these render now, the
approximation's imprecision was what read as "low quality", not the size.

## Round 6: the review changes

Correction. Round 5's "personal AI assistant" fixes (background, KPIs, natural
copy) went to project 3 (the business-data assistant); the actual target,
confirmed this round by name ("the last project", "approval required"), was
project 5 (cortana). Project 5's background is now plain `var(--ground)` in
both the static and live rules — it had its own accent-tinted radial gradient
and glow, the thing making it look more important than the other four, in
both. Its picture is no longer the ledger-diff-plus-"approval required" mockup
(that is the real gate mechanic, but it is case-study detail, not a homepage
card); it is one plain question and one plain answer, no typing indicator, no
routing line, nothing to explain first. Project 3's round-5 fixes stand: its
own round-5 feedback ("golden queries", "not a guess") was about it directly.

Bugs, not taste. The neural field's dispersion is driven by
`window.scrollY / span`; round 5 gave the hero a top offset (the fixed top
bar's reserved space) without telling `brain.js`, so the field finished
dispersing well before the hero actually scrolled away and then sat still,
on screen, for the rest of that stretch — worse than before round 5, which
had no offset to account for. It now measures the hero's own document
position and subtracts it, so progress is 0 at the hero's actual top and 1
just before its actual bottom, regardless of anything above it. Project 4's
SURPLUS-side connector was still off after round 5's fix to the SHORT side:
that fix anchored each store to its own top, which was correct, but the
SURPLUS store was still positioned by centering its whole box (roof + body +
label) in the row — and that box is only symmetric around the body if the
roof and the label are the same height, which they were not. Matching the
label's rendered height to the roof's makes the box symmetric, so the
existing centering does the rest; no offset math to keep in sync with the
picture's scale.

Content, project 3. "120 tests" was a code metric, not something a business
reader weighs; its card stats are now "Zero / Numbers the model makes up" and
"Golden queries / Plus a live path for the rest" (keeping the certified/
dynamic idea, saying what it buys instead of naming it). Its chat footer
drops "not a guess" — "Pulled straight from the database." says the same
thing without the double negative.

Picture, project 2. Not a range chart at all anymore: two rounds of trying to
make bars read as "a range" never said what the platform actually does,
which is compare a public price to what the buying team pays today. It is
now a line chart with both prices, the market one forecast past a divider,
the internal one held flat as a reference, the gap between them shaded, and
an AI verdict chip ("Buy now" / "Hold" and why) reading the gap — the thing
neither a bar chart nor a single line could show.

Contact marks. Noticeably larger again (2.1rem icon in a 3rem box, 3rem in
3.5rem now) — round 5's increase was real but still read as small next to
the box.

## Round 5: the review changes

Content. Project 1's hook now says "per cluster" instead of "per series" (the
routing policy picks a model per demand cluster, not one per series), and its
caption is just "Forecast" instead of "Forecast against actuals". Project 2
drops the word "bulletins" ("Weekly public data..."), and its caption is five
words instead of nine. Project 3's two card stats used to be "2 paths /
Certified + dynamic" and "0 / Figures from the model" — neither said anything
a reader could act on; they're now "Zero / Numbers the model makes up" and
"120 tests / Covering every guardrail".

Pictures. Project 2's range chart lost the zigzag line threading through the
bars (it read as tangled, not as a range): each bar carries its own midpoint
dot instead. Project 3's chat lost its jargon — "Certified recipe → SQL
validated → run" and "1 query → 3 rows → 41 ms" are gone, replaced by
"Checking real sales data…" and "Pulled straight from the database, not a
guess." Its question bubble also lost most of its saturation (38% accent down
to 16%): it was the brightest thing in the whole sequence, which made the
panel read as more important than the other four. Project 4's dashed
connectors to the two SHORT stores now land on the middle of each store's
body — they used to sit up near the roof, a `top: 27%` that only happened to
be close for one specific label height. Its travelling box now moves the full
width of the lane (a CSS transform percentage is relative to the box's own
~1em size, not the lane, so it barely moved before); it still goes surplus →
short, left to right, and loops from the start once it reaches the stores.

Page. The top bar (name plus "See the work" / "Contact me") is on screen for
the whole page now, not only once the hero has scrolled past — chrome.js
measures its real height into `--topbar-h` so the body reserves the matching
space instead of sitting under it. Gmail's own four-colour mark replaces the
generic envelope stroke, and all three contact marks (Gmail, LinkedIn,
GitHub) are noticeably larger inside their buttons.

## Round 4: the review changes

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

Performance, measured against the round-3 build with the CPU throttled
(`scratchpad/r4/work.cjs` and `perf.cjs`):

- Main-thread work for one full pass: **0.72s → 0.34s**, on a page that is now
  1.6x longer. Script time per pass: 0.047s → 0.012s.
- Median frame time through the sequence at 4x throttle (roughly an office
  machine next to this desktop): **50–83ms → 16.7ms**, i.e. 12–20fps to a
  steady 60fps, with 20–43% of frames over 33ms instead of 100%.
- At a punishing 6x throttle the medians are 33ms (30fps) throughout.

What did it:

- The neural field lives in the hero, stops when the hero scrolls off, draws
  84–132 nodes instead of 150, and caps its backing store at 1.5x.
- Off-screen sections are marked `data-idle` and every loop inside them stops.
  The recap alone holds eleven looping pictures.
- The finale card's radial gradient became a flat tint: it is re-rendered on
  every frame of its growth, and it alone doubled that segment's frame time.
- The dim backdrop and the grayscale filter behind project 4 are gone with the
  ghost they existed for.

## Checking it

`node verify.cjs` (needs the app's Playwright, already a dependency) starts its
own server and asserts: live mode, the title card at the pin, project 1's entry
offset, the order the pieces arrive in, the assembled state, project 3 leaving,
the finale's growth curve, a pixel-identical 4->5 swap, reversibility, the
keyboard path, idle pausing, and the three fallbacks (reduced motion, phone, no
JavaScript). 15/15 pass as committed.

An axe-core audit over five states (live at the top, mid-sequence, at the
recap, the static fallback, a phone) reports no violations, colour contrast
included.

## Known deviations from the earlier rounds' rules

- On a window under about 620px tall the title card is hidden rather than
  overlapping project 1: the top bar, the card and a clear gap do not fit.
- The `accept-seq` suite's "parts unchanged" check and `accept-static`'s
  "identical to round 1" checks fail on purpose — the phase windows and the
  hero are what this round changed.
- `swap2.cjs`'s "running" variant (idle loops left running) now reports about
  70 differing pixels where it used to report 0-2. That is the travelling box
  in project 4's new picture moving between the two captures, not a pop: with
  that one animation disabled the swap measures 0 differing pixels, and the
  clones' loops are phase-locked to the same `currentTime` as the original.

## Still open for review

- How strongly project 3 should fade behind project 4 (it now goes to zero).
- Project 1 exits left while project 2 enters from the left, so both move the
  same way.
- Marquee speed (40s per loop) and direction.
- In the live sequence, assistive tech only reaches the project that is on
  screen; the recap carousel exposes all five. Worth solving in the port.
