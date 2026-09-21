// Generates landing-showcase/index.html from the real content in projects.ts,
// so every kicker/title/hook/stat/caption/points array is copied verbatim.
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ASUS/Desktop/Poglo_local/data_analysis/portfolio";
const OUT = path.resolve(__dirname, "../../landing-showcase/index.html");

const src = fs.readFileSync(`${REPO}/src/content/projects.ts`, "utf8");
const marker = "export const projects: Project[] = ";
const start = src.indexOf(marker) + marker.length;
const end = src.indexOf("];", start) + 1;
// eslint-disable-next-line no-new-func
const all = new Function(`return ${src.slice(start, end)};`)();
const ORDER = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];
const projects = ORDER.map((slug) => all.find((p) => p.slug === slug));

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

function lineViz(p, ctx, ind) {
  const big = ctx === "panel";
  const [w, h, pad] = big ? [480, 300, 18] : [300, 96, 10];
  const g = lineGeometry(p.visual.points, w, h, pad);
  const grid = big
    ? `${ind}    <g class="line__grid">${[0.25, 0.5, 0.75]
        .map((f) => `<line x1="0" x2="${w}" y1="${(h * f).toFixed(0)}" y2="${(h * f).toFixed(0)}" />`)
        .join("")}</g>\n`
    : "";
  return (
    `${ind}<div class="viz viz--line" role="img" aria-label="${esc(p.visual.caption)}">\n` +
    (big ? `${ind}  <span class="viz__caption" aria-hidden="true">${esc(p.visual.caption)}</span>\n` : "") +
    `${ind}  <svg class="line" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">\n` +
    grid +
    `${ind}    <path class="line__area" d="${g.area}" fill="url(#fill-${p.accent})" />\n` +
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
    `${ind}    <p class="chat__q">What was last week's dairy margin?</p>\n` +
    `${ind}    <p class="chat__route"><span class="chat__route-dot"></span>Certified path ${ARROW} query validated</p>\n` +
    `${ind}    <div class="chat__slot">\n` +
    `${ind}      <span class="chat__typing"><i></i><i></i><i></i></span>\n` +
    `${ind}      <p class="chat__a">Answer from an executed, validated query.</p>\n` +
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
    `${ind}    <span class="gate__line">| 2026-09-04 | Mercado | -186,400 |</span>\n` +
    `${ind}    <span class="gate__line gate__line--new">+ | 2026-09-06 | Electricity | -214,300 |</span>\n` +
    `${ind}    <span class="gate__chip">approval required</span>\n` +
    `${ind}  </div>\n` +
    `${ind}</div>`
  );
}

function viz(p, ctx, ind) {
  return { line: lineViz, bars: barsViz, chat: chatViz, gate: gateViz }[p.visual.kind](p, ctx, ind);
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
    (i === 3 ? `${I}<div class="panel__backdrop" aria-hidden="true"></div>\n` : "") +
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
const WORK_LEDE =
  "Five systems I designed, built and operate. Four run at Mercaldas, a retail grocery\n" +
  "                chain in Colombia. The fifth is my own infrastructure. Every one has a working demo\n" +
  "                you can click.";

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
    <canvas id="brain-canvas" aria-hidden="true"></canvas>

    <!-- One always-rendered defs block for every line chart's area fill. Panels
         can be display:none and the 4->5 halves are clones, so a gradient id
         living inside any of them could vanish or be duplicated. -->
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
      <defs>
${gradients}
      </defs>
    </svg>

    <header class="hero">
      <div class="wrap hero__body">
        <p class="eyebrow">Operational complexity, solved with data &amp; AI.</p>
        <h1 class="hero__title">
          <span class="hero__line">Data engineer</span>
          <span class="hero__line text-gradient">AI &amp; automation</span>
        </h1>
        <p class="hero__name">Pablo Alejandro López Sánchez</p>
        <p class="hero__lede">I build forecasting systems, data pipelines and AI agents that run in production.</p>
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
        <div class="sequence">
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
                ${WORK_LEDE}
              </p>
            </div>
${projects.map(panel).join("\n")}
            <div class="split-half split-half--left" aria-hidden="true" inert></div>
            <div class="split-half split-half--right" aria-hidden="true" inert></div>
          </div>
        </div>
      </section>

      <section class="recap" aria-labelledby="recap-title">
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
        <ul class="contact__links">
          <li><a href="mailto:poglolopez@gmail.com">poglolopez@gmail.com</a></li>
          <li><a href="https://linkedin.com/in/pablo-a-lopez-s">linkedin.com/in/pablo-a-lopez-s</a></li>
          <li><a href="https://github.com/PogloLopez">github.com/PogloLopez</a></li>
        </ul>
        <p class="contact__loc">Manizales, Colombia</p>
      </div>
    </footer>

    <script src="brain.js"></script>
    <script src="carousel.js"></script>
  </body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("wrote", OUT, html.length, "bytes");
