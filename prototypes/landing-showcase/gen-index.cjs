// Generates landing-showcase/index.html from the real content in projects.ts,
// so every kicker/title/hook/stat/caption/points array is copied verbatim.
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ASUS/Desktop/Poglo_local/data_analysis/portfolio";
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
  "market-prices": {
    // Was "A hostile public data source, turned into a tool...": a judgement
    // about the source instead of a description of the system.
    hook:
      "Weekly public price bulletins, parsed into a 52-week forecast the buying team takes into supplier negotiations.",
    visual: { caption: "Weekly market price range, forecast ahead of the line" },
  },
  rag: {
    // Was "Built the spend guardrails first, then broke them on purpose...":
    // it never said what the assistant does.
    hook:
      "A Telegram assistant for questions about sales, inventory and margin. Every figure it gives comes from a query it actually ran.",
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

/* Same geometry as CardVisual.tsx LineMini, for a given viewBox. */
function lineGeometry(points, w, h, pad) {
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  const split = Math.floor((points.length - 1) * 0.66);
  const seg = (from, to) =>
    points
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? "M" : "L"} ${x(from + k).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
  const area = `${seg(0, points.length - 1)} L ${x(points.length - 1).toFixed(1)} ${h} L ${x(0).toFixed(1)} ${h} Z`;
  return { solid: seg(0, split), tail: seg(split, points.length - 1), area };
}

/**
 * Project 2's chart: one thin bar per weekly bulletin (the price range that
 * week), with the forecast weeks drawn lighter past a divider.
 *
 * It used to be a second line chart, which made projects 1 and 2 read as the
 * same system twice. The range bars say "weekly published prices" at a glance
 * and stay legible at card size, where a two-line comparison would not.
 */
function rangeViz(p, ctx, ind) {
  const pts = p.visual.points;
  const big = ctx === "panel";
  const [w, h, pad] = big ? [480, 300, 24] : [300, 96, 10];
  // A deterministic half-range per week: the real spread is not in the content
  // file, and a random one would change on every generation.
  const halfOf = (i) => 3 + ((i * 7) % 5);
  const lo = Math.min(...pts.map((v, i) => v - halfOf(i)));
  const hi = Math.max(...pts.map((v, i) => v + halfOf(i)));
  const x = (i) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  const split = Math.floor((pts.length - 1) * 0.66);
  const bw = big ? 9 : 6;

  const bars = pts
    .map((v, i) => {
      const half = halfOf(i);
      const top = y(v + half);
      const height = Math.max(bw, y(v - half) - top);
      return (
        `${ind}    <rect class="rng__bar${i > split ? " rng__bar--fc" : ""}" style="--i: ${i}"` +
        ` x="${(x(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw}" height="${height.toFixed(1)}" rx="${(bw / 2).toFixed(1)}" />`
      );
    })
    .join("\n");
  const mid = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const divider =
    `${ind}    <line class="rng__split" x1="${x(split + 0.5).toFixed(1)}" x2="${x(split + 0.5).toFixed(1)}"` +
    ` y1="${pad}" y2="${h - pad}" />`;
  const label = big
    ? `${ind}    <text class="rng__label" x="${(x(split + 0.5) + 10).toFixed(1)}" y="${pad + 12}">52 weeks ahead</text>\n`
    : "";

  return (
    `${ind}<div class="viz viz--range" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (big ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <svg class="rng" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">\n` +
    `${ind}    <path class="rng__mid" d="${mid}" pathLength="1" />\n` +
    bars + "\n" +
    divider + "\n" +
    label +
    `${ind}  </svg>\n` +
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
  const store = (cls, label, level) =>
    `${ind}    <div class="flow__store ${cls}">\n` +
    `${ind}      <span class="flow__roof"></span>\n` +
    `${ind}      <span class="flow__body"><span class="flow__level" style="--lv: ${level}"></span></span>\n` +
    (big ? `${ind}      <span class="flow__label">${label}</span>\n` : "") +
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

function chatViz(p, ctx, ind) {
  return (
    `${ind}<div class="viz viz--chat" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (ctx === "panel" ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <div class="chat" aria-hidden="true">\n` +
    `${ind}    <p class="chat__q">Dairy margin last week, by store?</p>\n` +
    `${ind}    <p class="chat__route"><span class="chat__route-dot"></span>Certified recipe ${ARROW} SQL validated ${ARROW} run</p>\n` +
    `${ind}    <div class="chat__slot">\n` +
    `${ind}      <span class="chat__typing"><i></i><i></i><i></i></span>\n` +
    `${ind}      <div class="chat__a">\n` +
    `${ind}        <p class="chat__lead">21.4% overall, up 1.6 pts on the week.</p>\n` +
    `${ind}        <ul class="chat__rows">\n` +
    `${ind}          <li><span>Store 03</span><b>24.8%</b></li>\n` +
    `${ind}          <li><span>Store 07</span><b>21.0%</b></li>\n` +
    `${ind}          <li class="chat__row--low"><span>Store 11</span><b>17.3%</b></li>\n` +
    `${ind}        </ul>\n` +
    `${ind}        <p class="chat__src">1 query ${ARROW} 3 rows ${ARROW} 41 ms</p>\n` +
    `${ind}      </div>\n` +
    `${ind}    </div>\n` +
    `${ind}  </div>\n` +
    `${ind}</div>`
  );
}

function gateViz(p, ctx, ind) {
  return (
    `${ind}<div class="viz viz--gate" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (ctx === "panel" ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <div class="gate" aria-hidden="true">\n` +
    `${ind}    <span class="gate__line">| 2026-09-04 | Groceries | -186,400 |</span>\n` +
    `${ind}    <span class="gate__line gate__line--new">+ | 2026-09-06 | Electricity | -214,300 |</span>\n` +
    `${ind}    <span class="gate__chip">approval required</span>\n` +
    `${ind}  </div>\n` +
    `${ind}</div>`
  );
}

// Two projects get a picture of their own rather than the shared `kind`
// miniature: 1 and 2 were both line charts, and project 4's generic bar chart
// said nothing about moving stock between stores.
const BY_SLUG = { "market-prices": rangeViz, "operations-platform": flowViz };

function viz(p, ctx, ind) {
  const fn = BY_SLUG[p.slug] || { line: lineViz, bars: barsViz, chat: chatViz, gate: gateViz }[p.visual.kind];
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
const ICONS = {
  email:
    "M1.5 4.5h21v15h-21zM2.2 5.2 12 13l9.8-7.8",
  linkedin:
    "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21H9z",
  github:
    "M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z",
};

// `fill` marks (LinkedIn, GitHub) and the `stroke` one (the envelope) need
// different attributes, so the mark carries them rather than the CSS.
const icon = (name) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${
    name === "email" ? ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"' : ' fill="currentColor"'
  }><path d="${ICONS[name]}" /></svg>`;

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
      <!-- The flow-field artwork from the live site, plus the neural field over
           it. Both belong to the hero alone: the canvas used to be fixed behind
           the whole page, redrawing 150 nodes every frame all the way down. -->
      <div class="hero__art" aria-hidden="true">
        <img src="hero.webp" alt="" width="2400" height="1260" fetchpriority="high" decoding="async" />
        <canvas id="brain-canvas"></canvas>
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
