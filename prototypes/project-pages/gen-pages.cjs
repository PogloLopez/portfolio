/**
 * Generates the five project pages (<slug>.html) for the prototype.
 *
 * Everything visual that the landing already has comes from the landing's own
 * generator (../landing-showcase/gen-index.cjs): the project pictures, the
 * recap cards, the contact marks, the gradients and the wording of the
 * titles, hooks and headline stats. A card and the page it opens can never
 * disagree. The new wording (the short story and the technical panel) lives
 * in content.cjs.
 *
 *   node gen-pages.cjs
 *
 * The architecture diagrams are the site's own (src/components/Diagram.tsx),
 * taken from the built app so they are not redrawn by hand: with a build in
 * .next they are re-extracted into diagrams/, otherwise the saved copies are
 * used.
 */
const fs = require("fs");
const path = require("path");
const L = require("../landing-showcase/gen-index.cjs");
const CONTENT = require("./content.cjs");

const REPO = path.resolve(__dirname, "..", "..");
const LANDING = "../landing-showcase";
const { projects, viz, stats, card, kicker, icon, gradients, esc } = L;

/* ---------------------------------------------------------------------------
   Diagrams
--------------------------------------------------------------------------- */

function diagramFor(slug) {
  const cache = path.join(__dirname, "diagrams", `${slug}.svg`);
  const built = path.join(REPO, ".next", "server", "app", "projects", `${slug}.html`);
  if (fs.existsSync(built)) {
    const html = fs.readFileSync(built, "utf8");
    const at = html.indexOf('<figure class="not-prose my-9"');
    const fig = html.slice(at, html.indexOf("</figure>", at));
    const svg = fig.slice(fig.indexOf("<svg"), fig.indexOf("</svg>") + 6);
    const caption = (fig.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/) || [])[1] || "";
    if (at > -1 && svg.startsWith("<svg")) {
      fs.mkdirSync(path.dirname(cache), { recursive: true });
      fs.writeFileSync(cache, `<!-- ${caption} -->\n${svg}\n`);
    }
  }
  const saved = fs.readFileSync(cache, "utf8");
  const caption = (saved.match(/^<!-- ([\s\S]*?) -->/) || [])[1] || "";
  let svg = saved.slice(saved.indexOf("<svg")).trim();
  for (const [from, to] of DIAGRAM_EDITS[slug] || []) svg = svg.split(from).join(to);
  return { svg, caption };
}

// Wording in the site's diagrams (src/content/diagrams.ts) that the review
// corrected: the analysts planned transfers themselves, they did not queue
// behind me. Applied to the extracted copy here; the same edit is listed in
// NOTES.md for diagrams.ts when the pages move into the app.
const DIAGRAM_EDITS = {
  "operations-platform": [
    [">Operations &amp; planning<", ">Purchasing analysts<"],
    [">used to queue behind me<", ">planned transfers by hand<"],
  ],
};

/* ---------------------------------------------------------------------------
   Pieces
--------------------------------------------------------------------------- */

// The opening mirrors the project's landing panel: same layout, and it
// assembles from the same direction the panel entered from.
const LAYOUT = [
  { cls: "pp-hero--cols pp-hero--text-first", enter: "right" },
  { cls: "pp-hero--cols pp-hero--viz-first", enter: "left" },
  { cls: "pp-hero--rows pp-hero--text-first", enter: "bottom" },
  { cls: "pp-hero--rows pp-hero--viz-first", enter: "top" },
  { cls: "pp-hero--finale", enter: "finale" },
];

const ARROW_LEFT = "←";

function topbar() {
  return `    <nav class="topbar" aria-label="Top bar">
      <div class="wrap topbar__inner">
        <a class="topbar__name" href="${LANDING}/index.html">Pablo A. López</a>
        <div class="topbar__actions">
          <a class="btn btn--ghost btn--back" href="${LANDING}/index.html#work">${ARROW_LEFT} All work</a>
          <a class="btn btn--accent" href="#contact">Contact me</a>
        </div>
      </div>
    </nav>`;
}

function opening(p, i) {
  const lay = LAYOUT[i];
  const I = "        ";
  return `    <header class="pp-hero ${lay.cls}" data-enter="${lay.enter}">
      <div class="wrap pp-hero__inner">
        <div class="pp-hero__text">
${kicker(p, i, `${I}  `)}
          <h1 class="panel__title pp-part" id="page-title">${esc(p.title)}</h1>
          <p class="panel__hook pp-part">${esc(p.hook)}</p>
${stats(p, "panel__stats pp-part", `${I}  `, false)}
        </div>
        <div class="pp-hero__viz pp-part">
${viz(p, "panel", `${I}  `)}
        </div>
      </div>
    </header>`;
}

function story(c) {
  return `      <section class="pp-story" aria-labelledby="story-title">
        <div class="wrap">
          <div class="section-label">
            <h2 id="story-title">The story</h2>
            <span class="rule-accent" aria-hidden="true"></span>
          </div>
          <div class="pp-story__body">
${c.story.map((para) => `            <p>${esc(para)}</p>`).join("\n")}
          </div>
        </div>
      </section>`;
}

function demo(p) {
  return `      <section class="pp-demo" aria-labelledby="demo-title">
        <div class="wrap">
          <div class="section-label">
            <h2 id="demo-title">Try it yourself</h2>
            <span class="pp-pill"><span class="pp-pill__dot" aria-hidden="true"></span>Interactive</span>
            <span class="rule-accent" aria-hidden="true"></span>
          </div>
          <!-- A still of the real demo (src/components/demos), captured from the
               built app by capture-demos.cjs. It is interactive on the real
               site; this prototype has no React to run it. -->
          <figure class="pp-demo__frame">
            <img src="demos/${p.slug}.jpg" alt="The interactive ${esc(p.title.toLowerCase())} demo, as it appears on the site" loading="lazy" decoding="async" />
            <figcaption>Still of the live demo. On the real site you can click through it.</figcaption>
          </figure>
        </div>
      </section>`;
}

function moreBand() {
  return `      <section class="pp-more" aria-labelledby="more-title">
        <div class="wrap pp-more__inner">
          <div>
            <h2 class="pp-more__title" id="more-title">How it's built</h2>
            <p class="pp-more__lede">The tools, the architecture and the engineering numbers, one line each.</p>
          </div>
          <button type="button" class="btn btn--accent pp-more__open" aria-haspopup="dialog" aria-controls="tech">See more</button>
        </div>
      </section>`;
}

function sheet(p, i, c, d) {
  const I = "            ";
  const tools = c.tools
    .map(
      ([name, what]) =>
        `${I}  <li><span class="pp-tool__name">${esc(name)}</span><span class="pp-tool__what">${esc(what)}</span></li>`,
    )
    .join("\n");
  const numbers = c.numbers
    .map(
      (n) =>
        `${I}  <div class="pp-num"><dt class="pp-num__label">${esc(n.label)}</dt><dd class="pp-num__value">${esc(n.value)}</dd></div>`,
    )
    .join("\n");
  return `    <!-- The technical panel. A native <dialog>: it traps focus, closes on
         Escape and hands focus back to "See more" on its own; page.js only adds
         the open and close animation and the click-outside. -->
    <dialog class="pp-sheet" id="tech" aria-labelledby="tech-title">
      <div class="pp-sheet__head">
        <p class="pp-sheet__kicker">${esc(p.title)}</p>
        <h2 class="pp-sheet__title" id="tech-title">How it's built</h2>
        <button type="button" class="pp-sheet__close" data-close>
          <span aria-hidden="true">×</span><span class="sr-only">Close</span>
        </button>
      </div>
      <!-- Focusable so keyboard users can scroll it: nothing inside is a link. -->
      <div class="pp-sheet__body" tabindex="0" role="region" aria-label="Technical details">
        <dl class="pp-meta">
          <div><dt>Role</dt><dd>${esc(c.meta.role)}</dd></div>
          <div><dt>Running</dt><dd>${esc(c.meta.running)}</dd></div>
          <div><dt>Repo</dt><dd>${esc(c.meta.repo)}</dd></div>
        </dl>

        <section class="pp-block" aria-labelledby="tools-title">
          <h3 class="pp-block__title" id="tools-title">Built with</h3>
          <ul class="pp-tools">
${tools}
          </ul>
        </section>

        <section class="pp-block" aria-labelledby="arch-title">
          <h3 class="pp-block__title" id="arch-title">How it fits together</h3>
          <figure class="pp-diagram">
            <div class="pp-diagram__scroll" tabindex="0" role="region" aria-label="Architecture diagram, scrolls sideways on small screens">
              ${d.svg}
            </div>
            <figcaption>${esc(d.caption)}</figcaption>
          </figure>
        </section>

        <section class="pp-block" aria-labelledby="numbers-title">
          <h3 class="pp-block__title" id="numbers-title">By the numbers</h3>
          <dl class="pp-nums">
${numbers}
          </dl>
        </section>
      </div>
    </dialog>`;
}

// The landing's recap carousel, minus the project you are on. Same markup, so
// carousel.js and the landing's styles drive it unchanged.
function others(p) {
  const rest = projects.map((q, i) => ({ q, i })).filter(({ q }) => q.slug !== p.slug);
  const here = (q) => `${q.slug}.html`;
  const last = rest[rest.length - 1];
  return `      <section class="recap pp-others" aria-labelledby="recap-title" data-idle="0">
        <div class="wrap">
          <div class="section-label">
            <h2 id="recap-title">The other four</h2>
            <span class="rule-accent" aria-hidden="true"></span>
            <button type="button" class="marquee-toggle" aria-controls="recap-marquee">
              <span class="marquee-toggle__icon" aria-hidden="true"></span><span class="marquee-toggle__label" aria-hidden="true">Pause</span><span class="sr-only">Pause the carousel</span>
            </button>
          </div>
        </div>
        <div class="marquee" id="recap-marquee">
          <div class="marquee__track">
            <div class="marquee__lead" aria-hidden="true" inert>
${card(last.q, last.i, false, here)}
            </div>
            <div class="marquee__set">
${rest.map(({ q, i }) => card(q, i, true, here)).join("\n")}
              <!-- Four cards are narrower than a wide screen, so the drift
                   would open a gap before the loop comes round. Each set
                   carries the four twice; the copy is invisible to assistive
                   tech and focus, and gone in the static layout. -->
              <div class="marquee__pad" aria-hidden="true" inert style="display: contents">
${rest.map(({ q, i }) => card(q, i, false, here)).join("\n")}
              </div>
            </div>
            <div class="marquee__set" aria-hidden="true" inert>
${rest.map(({ q, i }) => card(q, i, false, here)).join("\n")}
${rest.map(({ q, i }) => card(q, i, false, here)).join("\n")}
            </div>
          </div>
        </div>
      </section>`;
}

function contact() {
  return `    <footer class="contact" id="contact">
      <div class="wrap">
        <div class="section-label">
          <h2>Get in touch</h2>
          <span class="rule-accent" aria-hidden="true"></span>
        </div>
        <div class="contact__row">
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
    </footer>`;
}

function page(p, i) {
  const c = CONTENT[p.slug];
  const d = diagramFor(p.slug);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(p.title)} · Pablo López</title>
    <meta name="description" content="${esc(p.hook)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${LANDING}/style.css" />
    <link rel="stylesheet" href="pages.css" />
    <!-- Decides live vs static before first paint, exactly as the landing does. -->
    <script src="mode.js"></script>
  </head>
  <body class="pp" data-accent="${p.accent}">
    <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
      <defs>
${gradients}
      </defs>
    </svg>

${topbar()}

    <main>
${opening(p, i)}

${story(c)}

${demo(p)}

${moreBand()}

${others(p)}
    </main>

${contact()}

${sheet(p, i, c, d)}

    <script src="${LANDING}/carousel.js"></script>
    <script src="${LANDING}/chrome.js"></script>
    <script src="page.js"></script>
  </body>
</html>
`;
}

for (const [i, p] of projects.entries()) {
  const out = path.join(__dirname, `${p.slug}.html`);
  const html = page(p, i);
  fs.writeFileSync(out, html);
  console.log("wrote", path.basename(out), html.length, "bytes");
}
