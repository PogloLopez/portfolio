// Generates landing-showcase/index.html from the real content in projects.ts,
// so every kicker/title/hook/stat/caption/points array is copied verbatim.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const OUT = path.resolve(__dirname, "index.html");

const src = fs.readFileSync(`${REPO}/src/content/projects.ts`, "utf8");
const marker = "export const projects: Project[] = ";
const start = src.indexOf(marker) + marker.length;
const end = src.indexOf("];", start) + 1;
// eslint-disable-next-line no-new-func
const all = new Function(`return ${src.slice(start, end)};`)();
const ORDER = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];

/**
 * Copy the prototype overrides on top of the real content.
 *
 * These are review notes from the author, not yet agreed for the live site, so
 * they live here rather than in `src/content/projects.ts`: the prototype shows
 * the new wording while the site keeps shipping the old one. Two rules drive
 * them: the employer is never named, and a hook says what the system is rather
 * than reaching for a clever line.
 */
const OVERRIDES = {
  forecast: {
    // "per series" read as though every one of the 100k+ series gets its own
    // model; the routing policy actually decides per demand cluster.
    hook:
      "Over 100,000 product and store combinations, forecast weekly by a routing policy that picks a model per cluster.",
    visual: { caption: "Forecast" },
  },
  "market-prices": {
    // Was "A hostile public data source, turned into a tool...": a judgement
    // about the source instead of a description of the system. "bulletins"
    // was jargon a reader has to already know the domain to parse.
    hook:
      "Weekly public data, parsed into a 52-week forecast the buying team takes into supplier negotiations.",
    visual: {
      caption: "Market vs. internal price, forecast ahead",
      // "Peak" here means a high point only, not every turn — so the ask
      // was 2-3 highs before today, 1-2 after. Actuals: up/down/up/down/
      // up/down, three descending highs (90, 78, 68), landing today at a
      // low (40). Forecast: up/down/up, two rising highs (72, then 95, the
      // one that earns "Buy now"). 10 points, every leg exactly two of
      // them, so every leg is one straight line. `split` is explicit
      // because this point count doesn't land the default 0.66 rule on the
      // index (6) this shape actually needs.
      points: [60, 90, 55, 78, 48, 68, 40, 72, 58, 95],
      split: 6,
    },
  },
  rag: {
    // Was "Built the spend guardrails first, then broke them on purpose...":
    // it never said what the assistant does.
    hook:
      "A Telegram assistant for questions about sales, inventory and purchasing. Every figure it gives comes from a query it actually ran.",
    // "2 paths / Certified + dynamic" told a reader nothing they could act
    // on. This keeps the certified/dynamic idea but says what it buys: no
    // dead end on the questions nobody pre-wrote a recipe for.
    cardStats: [
      { value: "Zero", label: "Numbers the model makes up" },
      { value: "Golden queries", label: "Embedded/Vector DB" },
    ],
  },
  "operations-platform": {
    // Internally "la herramienta de traslados". The old title described any
    // backend; the old hook credited the wait to me, when the purchasing
    // analysts were doing the analysis themselves.
    title: "Stock rebalancing engine",
    kicker: "Full stack · Internal product",
    hook:
      "Analysts used to work out every inter-store transfer by hand. The engine proposes what moves where, and they run it themselves.",
    cardStats: [
      { value: "4h to 5min", label: "Per transfer plan" },
      { value: "Self-serve", label: "Run by the analysts" },
    ],
    visual: { caption: "Stock moving from a surplus store to the short ones" },
  },
  cortana: {
    // The real caption ("Proposed change, held for approval") describes the
    // ledger-diff mockup this replaced; the new picture is just a question
    // and an answer, so the caption says that instead.
    visual: { caption: "Ask it something, in your own words" },
    // Picked from options after two earlier rounds got rejected outright.
    // First: the approval gate, in a sentence rather than the "Zero"
    // pattern used elsewhere. Second: the real achievement text ("A
    // Markdown vault in Git is the source of truth") condensed to fit the
    // stat's two lines.
    cardStats: [
      { value: "Asks first", label: "Before anything it can't undo" },
      { value: "Plain text", label: "Git is the source of truth" },
    ],
  },
};

const projects = ORDER.map((slug) => {
  const base = all.find((p) => p.slug === slug);
  const over = OVERRIDES[slug];
  if (!over) return base;
  return { ...base, ...over, visual: { ...base.visual, ...(over.visual || {}) } };
});

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num2 = (i) => String(i + 1).padStart(2, "0");
const ARROW = "\u2192";

/* Same geometry as CardVisual.tsx LineMini, for a given viewBox. loOverride/
   hiOverride let a caller share its y-scale with a second series (project
   2's internal-price line), so both plot on the same axis. splitOverride
   lets a caller pick its own actuals/forecast boundary instead of the
   default 0.66-of-length rule, when the point count doesn't land the rule
   on the index the caller actually wants (project 2's peak count). */
function lineGeometry(points, w, h, pad, loOverride, hiOverride, splitOverride) {
  const lo = loOverride ?? Math.min(...points);
  const hi = hiOverride ?? Math.max(...points);
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  const split = splitOverride ?? Math.floor((points.length - 1) * 0.66);
  const seg = (from, to) =>
    points
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? "M" : "L"} ${x(from + k).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  const area = `${seg(0, points.length - 1)} L ${x(points.length - 1).toFixed(1)} ${h} L ${x(0).toFixed(1)} ${h} Z`;
  return { solid: seg(0, split), tail: seg(split, points.length - 1), area };
}

/**
 * Project 2's chart: the market price, drawn the same way as project 1's
 * (grid, gradient fill, ghost/trace/tail), against the full internal-price
 * line — not just a flat reference — in its own colour, plus the AI's
 * one-word reading of the gap once both lines reach the forecast.
 *
 * Two earlier attempts (range bars, then bars with a connecting line) tried
 * to look different from project 1 by looking rougher, which just read as
 * worse, not as a different system. This round's brief: build project 2's
 * picture like project 1's — clean line, nothing has to be literally
 * accurate — while keeping both real series the project is actually about.
 */
function marketViz(p, ctx, ind) {
  const pts = p.visual.points;
  const big = ctx === "panel";
  const [w, h, pad] = big ? [480, 300, 18] : [300, 96, 10];
  // An explicit split index, not the default 0.66-of-length rule: with this
  // many peaks, the point count that gives the right actuals/forecast leg
  // counts doesn't land on the index the rule would pick on its own.
  const split = p.visual.split ?? Math.floor((pts.length - 1) * 0.66);
  const sx = pad + (split / (pts.length - 1)) * (w - pad * 2);

  // The internal (negotiated) price the buying team pays today: a trailing
  // 3-week average of the market series up to the forecast split, standing
  // in for a real internal price feed the content file does not carry —
  // smoother than the market line by construction, which is what makes it
  // read as the steadier, negotiated number next to the volatile public
  // one. Held flat past the split: it is what is being paid now, not
  // itself forecast.
  const internalAt = (i) => {
    const from = Math.max(0, i - 2);
    const slice = pts.slice(from, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };
  const internalPts = pts.slice(0, split + 1).map((_, i) => internalAt(i));
  const flatValue = internalPts[internalPts.length - 1];
  const risesAboveToday = pts[pts.length - 1] > flatValue;

  const lo = Math.min(...pts, ...internalPts);
  const hi = Math.max(...pts, ...internalPts);
  const g = lineGeometry(pts, w, h, pad, lo, hi, split);
  const x = (i) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  const internalSolid = internalPts
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const internalFlat = `M ${x(split).toFixed(1)} ${y(flatValue).toFixed(1)} L ${x(pts.length - 1).toFixed(1)} ${y(flatValue).toFixed(1)}`;

  const grid = big
    ? `${ind}    <g class="line__grid">${[0.25, 0.5, 0.75]
        .map((f) => `<line x1="0" x2="${w}" y1="${(h * f).toFixed(0)}" y2="${(h * f).toFixed(0)}" />`)
        .join("")}</g>\n`
    : "";
  const marks = big
    ? `${ind}    <line class="line__split" x1="${sx.toFixed(1)}" x2="${sx.toFixed(1)}" y1="${pad}" y2="${h - pad}" />\n` +
      `${ind}    <text class="line__mark line__mark--a" text-anchor="end" x="${(sx - 8).toFixed(1)}" y="${pad + 12}">actuals</text>\n` +
      `${ind}    <text class="line__mark" x="${(sx + 8).toFixed(1)}" y="${pad + 12}">forecast</text>\n`
    : "";
  const legend = big
    ? `${ind}    <text class="mkt__legend mkt__legend--market" x="${pad}" y="${h - 8}">Market</text>\n` +
      `${ind}    <text class="mkt__legend mkt__legend--internal" x="${pad + 54}" y="${h - 8}">Internal, today</text>\n`
    : "";
  const insight = big
    ? `${ind}  <div class="mkt__insight" title="${esc(
        risesAboveToday ? "Forecast climbs past today’s price" : "Forecast stays under today’s price",
      )}">\n` +
      `${ind}    <span class="mkt__insight-dot" aria-hidden="true"></span>\n` +
      `${ind}    <span class="mkt__insight-verdict">${risesAboveToday ? "Buy now" : "Hold"}</span>\n` +
      `${ind}  </div>\n`
    : "";

  return (
    `${ind}<div class="viz viz--market" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (big ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <svg class="mkt" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">\n` +
    grid +
    `${ind}    <path class="line__area" d="${g.area}" fill="url(#fill-${p.accent})" />\n` +
    marks +
    `${ind}    <path class="mkt__internal" d="${internalSolid}" />\n` +
    `${ind}    <path class="mkt__internal mkt__internal--flat" d="${internalFlat}" />\n` +
    legend +
    `${ind}    <path class="line__ghost" d="${g.solid}" />\n` +
    `${ind}    <path class="line__trace" d="${g.solid}" pathLength="1" />\n` +
    `${ind}    <path class="line__tail" d="${g.tail}" />\n` +
    `${ind}  </svg>\n` +
    insight +
    `${ind}</div>`
  );
}

/**
 * Project 4's picture: one store with surplus on the left, two short stores on
 * the right, and boxes crossing between them on a loop.
 *
 * Plain HTML rather than SVG: the shapes are rectangles, and boxes animated
 * with `transform` on their own elements stay on the compositor.
 */
function flowViz(p, ctx, ind) {
  const big = ctx === "panel";
  // The label always renders, even in the card miniature where it is
  // visually hidden (see .mcard .flow__label): it is what makes each
  // store's own box symmetric around its body (the roof's height above
  // matches the label's height below), which is what lets the SURPLUS
  // store's body land on the shared line just by being centred like every
  // other piece in the row, with no separate offset to keep in sync with
  // the picture's scale.
  const store = (cls, label, level) =>
    `${ind}    <div class="flow__store ${cls}">\n` +
    `${ind}      <span class="flow__roof"></span>\n` +
    `${ind}      <span class="flow__body"><span class="flow__level" style="--lv: ${level}"></span></span>\n` +
    `${ind}      <span class="flow__label">${label}</span>\n` +
    `${ind}    </div>`;
  const boxes = [0, 1, 2]
    .map((i) => `${ind}      <i class="flow__box" style="--i: ${i}"></i>`)
    .join("\n");
  return (
    `${ind}<div class="viz viz--flow" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (big ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <div class="flow" aria-hidden="true">\n` +
    store("flow__store--from", "Surplus", 82) + "\n" +
    `${ind}    <div class="flow__lane">\n${boxes}\n${ind}    </div>\n` +
    `${ind}    <div class="flow__to">\n` +
    store("flow__store--to", "Short", 18) + "\n" +
    store("flow__store--to", "Short", 26) + "\n" +
    `${ind}    </div>\n` +
    `${ind}  </div>\n` +
    `${ind}</div>`
  );
}

function lineViz(p, ctx, ind) {
  const big = ctx === "panel";
  const [w, h, pad] = big ? [480, 300, 18] : [300, 96, 10];
  const g = lineGeometry(p.visual.points, w, h, pad);
  const grid = big
    ? `${ind}    <g class="line__grid">${[0.25, 0.5, 0.75]
        .map((f) => `<line x1="0" x2="${w}" y1="${(h * f).toFixed(0)}" y2="${(h * f).toFixed(0)}" />`)
        .join("")}</g>\n`
    : "";
  // A divider and two words, so the dashed part reads as "from here on it is a
  // forecast" rather than as a change of line style.
  const pts = p.visual.points;
  const split = Math.floor((pts.length - 1) * 0.66);
  const sx = pad + (split / (pts.length - 1)) * (w - pad * 2);
  const marks = big
    ? `${ind}    <line class="line__split" x1="${sx.toFixed(1)}" x2="${sx.toFixed(1)}" y1="${pad}" y2="${h - pad}" />\n` +
      `${ind}    <text class="line__mark line__mark--a" text-anchor="end" x="${(sx - 8).toFixed(1)}" y="${pad + 12}">actuals</text>\n` +
      `${ind}    <text class="line__mark" x="${(sx + 8).toFixed(1)}" y="${pad + 12}">forecast</text>\n`
    : "";

  return (
    `${ind}<div class="viz viz--line" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (big ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <svg class="line" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">\n` +
    grid +
    `${ind}    <path class="line__area" d="${g.area}" fill="url(#fill-${p.accent})" />\n` +
    marks +
    `${ind}    <path class="line__ghost" d="${g.solid}" />\n` +
    `${ind}    <path class="line__trace" d="${g.solid}" pathLength="1" />\n` +
    `${ind}    <path class="line__tail" d="${g.tail}" />\n` +
    `${ind}  </svg>\n` +
    `${ind}</div>`
  );
}

function barsViz(p, ctx, ind) {
  const pts = p.visual.points;
  const hi = Math.max(...pts);
  const bars = pts
    .map((v, i) => {
      const hgt = Math.max(8, (v / hi) * 100).toFixed(1);
      // Short cover is the problem state; the rest reads as healthy (CardVisual).
      return `${ind}    <span class="bar${v < 25 ? " bar--low" : ""}" style="--i: ${i}; --h: ${hgt}%"></span>`;
    })
    .join("\n");
  return (
    `${ind}<div class="viz viz--bars" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (ctx === "panel" ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <div class="bars" aria-hidden="true">\n${bars}\n${ind}  </div>\n` +
    `${ind}</div>`
  );
}

/**
 * Project 3's chat: a question in plain language, a processing state anyone
 * reads (not the internal path name), and an answer with a footer that says
 * why it can be trusted, again in plain language.
 *
 * Round 4's "Certified recipe -> SQL validated -> run" and "1 query -> 3
 * rows -> 41 ms" were the pipeline's own vocabulary, meaningless to someone
 * who has never seen the system. Both are replaced by what a non-technical
 * reader already understands: "the assistant is looking this up for real"
 * and "this came from a live number, not a guess."
 */
function chatViz(p, ctx, ind) {
  return (
    `${ind}<div class="viz viz--chat" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (ctx === "panel" ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <div class="chat" aria-hidden="true">\n` +
    `${ind}    <p class="chat__q">What was our dairy margin last week, by store?</p>\n` +
    `${ind}    <p class="chat__route"><span class="chat__route-dot"></span>Checking real sales data${ARROW}</p>\n` +
    `${ind}    <div class="chat__slot">\n` +
    `${ind}      <span class="chat__typing"><i></i><i></i><i></i></span>\n` +
    `${ind}      <div class="chat__a">\n` +
    `${ind}        <p class="chat__lead">21.4% overall, up 1.6 pts on the week.</p>\n` +
    `${ind}        <ul class="chat__rows">\n` +
    `${ind}          <li><span>Store 03</span><b>24.8%</b></li>\n` +
    `${ind}          <li><span>Store 07</span><b>21.0%</b></li>\n` +
    `${ind}          <li class="chat__row--low"><span>Store 11</span><b>17.3%</b></li>\n` +
    `${ind}        </ul>\n` +
    `${ind}        <p class="chat__src">Pulled straight from the database.</p>\n` +
    `${ind}      </div>\n` +
    `${ind}    </div>\n` +
    `${ind}  </div>\n` +
    `${ind}</div>`
  );
}

/**
 * Project 5's picture: a plain, everyday exchange, plus the one thing that
 * makes this assistant different — it says what it is about to do and
 * waits, rather than just doing it.
 *
 * The real ledger diff and its "approval required" chip are what the gate
 * actually looks like, but that is a term of art from the project's own
 * README, meaningless on a first look. A home-page card is not where that
 * gets explained — the case study page is. Reusing .chat__route (built for
 * project 3's "checking real data" status line) for "waiting on your OK"
 * says the same thing the gate does, in a sentence anyone reads instantly.
 */
function assistantChatViz(p, ctx, ind) {
  const big = ctx === "panel";
  return (
    `${ind}<div class="viz viz--chat" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (big ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <div class="chat" aria-hidden="true">\n` +
    `${ind}    <p class="chat__q">Spent $50 at the movies tonight.</p>\n` +
    `${ind}    <p class="chat__a">Logged under Entertainment — want me to top it up $50 from savings?</p>\n` +
    `${ind}    <p class="chat__route"><span class="chat__route-dot"></span>Waiting on your OK</p>\n` +
    `${ind}  </div>\n` +
    `${ind}</div>`
  );
}

// Three projects get a picture of their own rather than the shared `kind`
// miniature: 1 and 2 were both line charts, project 4's generic bar chart
// said nothing about moving stock between stores, and project 5's real gate
// mechanic is case-study detail, not a home-page miniature.
const BY_SLUG = {
  "market-prices": marketViz,
  "operations-platform": flowViz,
  cortana: assistantChatViz,
};

function viz(p, ctx, ind) {
  const fn = BY_SLUG[p.slug] || { line: lineViz, bars: barsViz, chat: chatViz }[p.visual.kind];
  return fn(p, ctx, ind);
}

function stats(p, cls, ind, part) {
  return (
    `${ind}<dl class="${cls}"${part ? ' data-part="stats"' : ""}>\n` +
    p.cardStats
      .map(
        (s) =>
          `${ind}  <div class="stat"><dt class="stat__label">${esc(s.label)}</dt><dd class="stat__value">${esc(s.value)}</dd></div>`,
      )
      .join("\n") +
    `\n${ind}</dl>`
  );
}

const LAYOUT = [
  { cls: "panel--cols panel--text-first", enter: "right" },
  { cls: "panel--cols panel--viz-first", enter: "left" },
  { cls: "panel--rows panel--text-first", enter: "bottom" },
  { cls: "panel--rows panel--viz-first", enter: "top" },
  { cls: "panel--finale", enter: "finale" },
];

function kicker(p, i, ind) {
  return (
    `${ind}<p class="panel__kicker" data-part="kicker"><span class="panel__num">${num2(i)}</span>` +
    `<span class="panel__kicker-rule" aria-hidden="true"></span><span>${esc(p.kicker)}</span></p>`
  );
}

// Every CTA reads "View full case study" on screen, but its accessible name is
// "View full case study: <title>", so the ten links stay distinguishable in a
// screen reader's links list. The visible words are aria-hidden and the full
// name is one visually hidden span: an absolutely positioned span in the middle
// of the text would be read with a stray space (" : "). No whitespace between
// the spans, because the CTA is a flex container and a text run there would
// become an extra flex item (one more gap, a wider button).
const ctaLabel = (p) =>
  `<span aria-hidden="true">View full case study</span>` +
  `<span class="sr-only">View full case study: ${esc(p.title)}</span>` +
  `<span aria-hidden="true">${ARROW}</span>`;

const cta = (p, ind) => `${ind}<a class="panel__cta" data-part="cta" href="#case-${p.slug}">${ctaLabel(p)}</a>`;

// Ids name each article after its title. Only real content gets them: the
// duplicate marquee cards and the split-half clones must not repeat an id.
const panelTitleId = (p) => `title-${p.slug}`;
const cardTitleId = (p) => `card-title-${p.slug}`;

function panel(p, i) {
  const L = LAYOUT[i];
  const I = "              ";
  const open =
    `            <article class="panel ${L.cls}" data-index="${i}" data-accent="${p.accent}" data-enter="${L.enter}"` +
    ` aria-labelledby="${panelTitleId(p)}">\n`;
  const title = (ind) => `${ind}<h3 class="panel__title" id="${panelTitleId(p)}" data-part="title">${esc(p.title)}</h3>\n`;
  if (i === 4) {
    return (
      open +
      `${I}<div class="panel__inner">\n` +
      kicker(p, i, `${I}  `) + "\n" +
      title(`${I}  `) +
      `${I}  <p class="panel__hook" data-part="hook">${esc(p.hook)}</p>\n` +
      stats(p, "panel__stats", `${I}  `, true) + "\n" +
      `${I}  <div class="panel__viz" data-part="viz">\n${viz(p, "panel", `${I}    `)}\n${I}  </div>\n` +
      cta(p, `${I}  `) + "\n" +
      `${I}</div>\n` +
      `            </article>`
    );
  }
  return (
    open +
    `${I}<div class="panel__inner">\n` +
    `${I}  <div class="panel__text">\n` +
    kicker(p, i, `${I}    `) + "\n" +
    title(`${I}    `) +
    `${I}    <p class="panel__hook" data-part="hook">${esc(p.hook)}</p>\n` +
    `${I}    <div class="panel__foot">\n` +
    stats(p, "panel__stats", `${I}      `, true) + "\n" +
    cta(p, `${I}      `) + "\n" +
    `${I}    </div>\n` +
    `${I}  </div>\n` +
    `${I}  <div class="panel__viz" data-part="viz">\n${viz(p, "panel", `${I}    `)}\n${I}  </div>\n` +
    `${I}</div>\n` +
    `            </article>`
  );
}

// `real` is false for the inert copies (the duplicate set and the lead card):
// they carry no ids and no aria-labelledby.
function card(p, i, real) {
  const I = "            ";
  return (
    `          <article class="mcard" data-accent="${p.accent}"${real ? ` aria-labelledby="${cardTitleId(p)}"` : ""}>\n` +
    `${I}<p class="mcard__head"><span class="mcard__num">${num2(i)}</span><span class="mcard__kicker">${esc(p.kicker)}</span></p>\n` +
    `${I}<h3 class="mcard__title"${real ? ` id="${cardTitleId(p)}"` : ""}>${esc(p.title)}</h3>\n` +
    stats(p, "mcard__stats", I, false) + "\n" +
    `${I}<div class="mcard__viz">\n${viz(p, "card", `${I}  `)}\n${I}</div>\n` +
    `${I}<p class="mcard__hook">${esc(p.hook)}</p>\n` +
    `${I}<a class="mcard__cta" href="#case-${p.slug}">${ctaLabel(p)}</a>\n` +
    `          </article>`
  );
}

// The "Selected work" lede, shared by the visual intro and its assistive-tech
// copy (see the markup below), so the two can never drift apart.
const WORK_LEDE_MAIN = "Five systems I designed, built and operate.";
// A template literal: the line break is the one the markup wants.
const WORK_LEDE_REST = `Four run at a retail chain in Colombia. The fifth is my own
                infrastructure. Every one has a working demo you can click.`;
const WORK_LEDE = WORK_LEDE_MAIN + " " + WORK_LEDE_REST;

// Brand glyphs for the contact row, so the addresses stop shouting their full
// length at the bottom of the page. Single-path marks, sized by the button.
// Simple Icons' path data (simpleicons.org, CC0), not hand-plotted: at the
// size these now render (see .ico), a hand-approximated curve shows every
// place it was approximate.
const ICONS = {
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  github:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
};

// The Gmail mark (Google's 2020 four-colour envelope), used verbatim rather
// than a generic envelope stroke: it is the address people recognise at a
// glance. Its own colours are the point, so it carries no currentColor fill.
const GMAIL_PATHS = [
  { fill: "#4285f4", d: "M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" },
  { fill: "#34a853", d: "M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" },
  { fill: "#fbbc04", d: "M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" },
  { fill: "#ea4335", d: "M72 74V48l24 18 24-18v26L96 92" },
  { fill: "#c5221f", d: "M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" },
];
const gmailIcon = () =>
  `<svg class="ico ico--gmail" viewBox="52 42 88 66" aria-hidden="true" focusable="false">` +
  GMAIL_PATHS.map((p) => `<path fill="${p.fill}" d="${p.d}" />`).join("") +
  `</svg>`;

// `fill` marks (LinkedIn, GitHub) use currentColor so they follow the button's
// text colour; Gmail keeps its own brand colours (see gmailIcon above). GitHub
// gets no size class of its own (it lands on plain .ico's size) — LinkedIn
// and Gmail each needed sizing down again after GitHub's own size was
// already right, so they need a class of their own to move independently.
const icon = (name) =>
  name === "email"
    ? gmailIcon()
    : `<svg class="ico${name === "linkedin" ? " ico--linkedin" : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="${ICONS[name]}" /></svg>`;

const gradients = ["a1", "a2", "a3", "a4", "a5"]
  .map(
    (a) =>
      `        <linearGradient id="fill-${a}" x1="0" y1="0" x2="0" y2="1">\n` +
      `          <stop offset="0" style="stop-color: var(--${a}); stop-opacity: 0.28" />\n` +
      `          <stop offset="1" style="stop-color: var(--${a}); stop-opacity: 0" />\n` +
      `        </linearGradient>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Selected work</title>
    <meta name="description" content="Prototype: a scroll-scrubbed project sequence and a drifting recap carousel for the portfolio landing page." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="style.css" />
    <!-- Loaded in <head> on purpose: it only decides live vs static mode here
         (one class on <html>) so the first paint already has the right layout.
         Everything else waits for DOMContentLoaded. -->
    <script src="sequence.js"></script>
  </head>
  <body>

    <!-- The neural field. .brain-track is an absolutely-positioned overlay
         the height of the whole document (position: relative on body makes
         that the containing block) so it takes no layout space of its own;
         the canvas inside it is position: sticky, which is what gives the
         two-phase behaviour brain.js's resize() sets up: normal document
         flow (scrolling like anything else, anchored by margin-top next to
         "Selected work") until that section is a quarter of the way down
         the viewport, then it sticks there and stays on screen, dispersing,
         for the rest of the page. Both live outside .hero — .hero has its
         own stacking context (isolation: isolate, for the split/finale swap
         later in the sequence), and a position: fixed or sticky descendant
         of one is still confined to compete inside it. -->
    <div class="brain-track" aria-hidden="true">
      <canvas id="brain-canvas"></canvas>
    </div>

    <!-- One always-rendered defs block for every line chart's area fill. Panels
         can be display:none and the 4->5 halves are clones, so a gradient id
         living inside any of them could vanish or be duplicated. -->
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
      <defs>
${gradients}
      </defs>
    </svg>

    <!-- Slim bar with the two page actions. It only appears once the hero's
         own copy of them has scrolled away (chrome.js flips data-shown), so it
         never sits over the hero, and it stays reachable through the pinned
         sequence. -->
    <!-- The bar is itself the landmark: a second <nav> inside it would share
         the hero's label, and the name beside the links would sit outside any
         landmark at all. -->
    <nav class="topbar" data-shown="0" aria-label="Top bar">
      <div class="wrap topbar__inner">
        <span class="topbar__name">Pablo A. López</span>
        <div class="topbar__actions">
          <a class="btn btn--ghost" href="#work">See the work</a>
          <a class="btn btn--accent" href="#contact">Contact me</a>
        </div>
      </div>
    </nav>

    <header class="hero">
      <!-- The flow-field artwork from the live site. The neural field is no
           longer nested here — see the comment by <canvas id="brain-canvas">
           above — but the fade still needs to sit over both of them, so it
           stays in the hero along with the image. -->
      <div class="hero__art" aria-hidden="true">
        <img src="hero.webp" alt="" width="2400" height="1260" fetchpriority="high" decoding="async" />
        <span class="hero__art-fade"></span>
      </div>
      <div class="wrap hero__body">
        <p class="eyebrow">Operational complexity, solved with data &amp; AI.</p>
        <h1 class="hero__title">
          <span class="hero__line">Data engineer</span>
          <span class="hero__line text-gradient">AI &amp; automation</span>
        </h1>
        <p class="hero__name">Pablo Alejandro López Sánchez</p>
        <p class="hero__lede">I build forecasting systems, data pipelines and AI agents that run in production.</p>
        <nav class="hero__actions" aria-label="Page sections">
          <a class="btn btn--accent" href="#work">See the work</a>
          <a class="btn btn--ghost" href="#contact">Contact me</a>
        </nav>
        <p class="hero__loc">Manizales, Colombia</p>
      </div>
    </header>

    <main>
      <section class="work" id="work" aria-labelledby="work-title">
        <!-- Live mode only: what assistive tech reads for the intro. Live, the
             visual intro below is a scrubbed stage layer that is display:none
             for most of the sequence, so sequence.js marks it aria-hidden and
             this visually hidden copy stays in the tree at every position.
             Static (and without JS) this copy is display:none and the visual
             intro is the one exposed, so there is only ever one heading. -->
        <div class="work__a11y sr-only">
          <h2>Selected work</h2>
          <p>
                ${WORK_LEDE}
          </p>
        </div>
        <div class="sequence" data-idle="0">
          <div class="sequence__stage">
            <!-- The intro lives inside the stage. Live, it is the title card the
                 stage pins on (sequence.js scrubs it out as project 1 arrives);
                 static, it is ordinary flow above the first project. -->
            <div class="wrap work__intro">
              <div class="section-label">
                <h2 id="work-title">Selected work</h2>
                <span class="rule-accent" aria-hidden="true"></span>
              </div>
              <p class="work__lede">
                <span class="work__lede-main">${WORK_LEDE_MAIN}</span>
                <span class="work__lede-rest">${WORK_LEDE_REST}</span>
              </p>
              <!-- Live mode only. The first project assembles from nothing, so
                   without this the stage reads as an unfinished page for the
                   first turn of the wheel. It fades out with the intro. -->
              <p class="work__cue" aria-hidden="true">
                <span class="work__cue-text">Keep scrolling</span>
                <span class="work__cue-arrow"></span>
              </p>
            </div>
${projects.map(panel).join("\n")}
            <div class="split-half split-half--left" aria-hidden="true" inert></div>
            <div class="split-half split-half--right" aria-hidden="true" inert></div>
          </div>
        </div>
      </section>

      <section class="recap" aria-labelledby="recap-title" data-idle="0">
        <div class="wrap">
          <div class="section-label">
            <h2 id="recap-title">All five, at a glance</h2>
            <span class="rule-accent" aria-hidden="true"></span>
            <!-- Live mode only (there is no drift in the static grid). A play/pause
                 button: carousel.js swaps its label (Pause <-> Play) and icon, so
                 it carries no aria-pressed. The visible word is aria-hidden and
                 styled uppercase; the name is the sentence-case sr-only text. -->
            <button type="button" class="marquee-toggle" aria-controls="recap-marquee">
              <span class="marquee-toggle__icon" aria-hidden="true"></span><span class="marquee-toggle__label" aria-hidden="true">Pause</span><span class="sr-only">Pause the carousel</span>
            </button>
          </div>
        </div>
        <div class="marquee" id="recap-marquee">
          <div class="marquee__track">
            <!-- A copy of the last card just left of the first, so the track
                 can sit far enough right for the first real card to be brought
                 fully into the clear band when it takes keyboard focus. -->
            <div class="marquee__lead" aria-hidden="true" inert>
${card(projects[4], 4, false)}
            </div>
            <div class="marquee__set">
${projects.map((p, i) => card(p, i, true)).join("\n")}
            </div>
            <div class="marquee__set" aria-hidden="true" inert>
${projects.map((p, i) => card(p, i, false)).join("\n")}
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="contact" id="contact">
      <div class="wrap">
        <div class="section-label">
          <h2>Get in touch</h2>
          <span class="rule-accent" aria-hidden="true"></span>
        </div>
        <div class="contact__row">
          <!-- Marks rather than full addresses: the row stays one short line.
               Each link keeps a real name for assistive tech and a tooltip. -->
          <ul class="contact__links">
            <li>
              <a href="mailto:poglolopez@gmail.com" title="poglolopez@gmail.com">
                ${icon("email")}<span class="sr-only">Email: poglolopez@gmail.com</span>
              </a>
            </li>
            <li>
              <a href="https://linkedin.com/in/pablo-a-lopez-s" title="linkedin.com/in/pablo-a-lopez-s">
                ${icon("linkedin")}<span class="sr-only">LinkedIn: pablo-a-lopez-s</span>
              </a>
            </li>
            <li>
              <a href="https://github.com/PogloLopez" title="github.com/PogloLopez">
                ${icon("github")}<span class="sr-only">GitHub: PogloLopez</span>
              </a>
            </li>
          </ul>
          <ul class="contact__cvs">
            <li><a href="https://github.com/PogloLopez/PogloLopez/raw/main/assets/cv/Pablo-Lopez-CV-EN.pdf">CV English</a></li>
            <li><a href="https://github.com/PogloLopez/PogloLopez/raw/main/assets/cv/Pablo-Lopez-CV-ES.pdf">CV Español</a></li>
          </ul>
          <p class="contact__loc">Manizales, Colombia</p>
        </div>
      </div>
    </footer>

    <script src="brain.js"></script>
    <script src="carousel.js"></script>
    <script src="chrome.js"></script>
  </body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT, html.length, "bytes");
