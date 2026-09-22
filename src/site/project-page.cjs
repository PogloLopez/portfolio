/**
 * A project page (/projects/<slug>), rendered to static HTML by build.cjs.
 *
 * Everything visual the landing already has comes from the landing's own
 * renderer (landing.cjs): the project picture, the recap cards, the contact
 * marks, the gradients and the title, hook and headline stats. A card and
 * the page it opens can never disagree. The page's own wording (the story and
 * the "How it's built" panel) is in src/content/projects.ts.
 *
 * The architecture diagram is the site's own (src/components/Diagram.tsx with
 * src/content/diagrams.ts), rendered by build.cjs and passed in.
 */
const L = require("./landing.cjs");
const { head } = require("./head.cjs");

const { urls, viz, stats, card, kicker, icon, gradients, esc } = L;

// Diagrams shown without a caption. The caption is the diagram's title, and
// on these two the review asked for it gone; the SVG keeps it as its <title>.
const NO_CAPTION = new Set(["forecast", "operations-platform"]);

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
        <a class="topbar__name" href="${urls.home}">Pablo A. López</a>
        <div class="topbar__actions">
          <a class="btn btn--ghost btn--back" href="${urls.home}#work">${ARROW_LEFT} All work</a>
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

// The opening fills the first screen, so without this a reader can take the
// page for all there is. Decoration, like the landing's own cue, so it carries
// nothing for assistive tech; page.js shows it once the arrival has settled
// and drops it on the first scroll. It sits outside the opening because it is
// pinned to the foot of the screen, and the opening is taller than that on a
// phone.
function cue() {
  return `      <div class="pp-cue" data-cue aria-hidden="true">
        <span class="pp-cue__chevron"></span>
      </div>`;
}

function story(p) {
  return `      <section class="pp-story" aria-labelledby="story-title">
        <div class="wrap">
          <div class="section-label">
            <h2 id="story-title">The story</h2>
            <span class="rule-accent" aria-hidden="true"></span>
          </div>
          <div class="pp-story__body">
${p.story.map((para) => `            <p>${esc(para)}</p>`).join("\n")}
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
          <!-- The site's real, interactive demo (src/components/demos), bundled
               by build.cjs and mounted here by demos/${p.slug}.js. The
               still inside is only what shows without JavaScript; the demo
               replaces it as soon as it mounts. -->
          <div class="pp-demo__live" data-demo="${p.slug}">
            <img class="pp-demo__still" src="${urls.asset(`demos/${p.slug}.jpg`)}" alt="The ${esc(p.title)} demo (interactive with JavaScript on)" loading="lazy" decoding="async" />
          </div>
          <script src="${urls.asset(`demos/${p.slug}.js`)}" defer></script>
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

function sheet(p, d) {
  const I = "            ";
  const tools = p.tools
    .map(
      ([name, what]) =>
        `${I}  <li><span class="pp-tool__name">${esc(name)}</span><span class="pp-tool__what">${esc(what)}</span></li>`,
    )
    .join("\n");
  const numbers = p.numbers
    .map(
      (n) =>
        `${I}  <div class="pp-num${n.wide ? " pp-num--wide" : ""}"><dt class="pp-num__label">${esc(n.label)}</dt><dd class="pp-num__value">${esc(n.value)}</dd></div>`,
    )
    .join("\n");
  // One grid column per card and two for a wide one, so the row is always full.
  const cols = p.numbers.reduce((n, x) => n + (x.wide ? 2 : 1), 0);
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
          <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
          <div><dt>Running</dt><dd>${esc(p.running)}</dd></div>
${p.repo ? `          <div><dt>Repo</dt><dd>${esc(p.repo)}</dd></div>\n` : ""}        </dl>

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
${d.caption ? `            <figcaption>${esc(d.caption)}</figcaption>\n` : ""}          </figure>
        </section>

        <section class="pp-block" aria-labelledby="numbers-title">
          <h3 class="pp-block__title" id="numbers-title">By the numbers</h3>
          <dl class="pp-nums" style="--cols: ${cols}">
${numbers}
          </dl>
        </section>
      </div>
    </dialog>`;
}

// The landing's recap carousel, minus the project you are on. Same markup, so
// carousel.js and the landing's styles drive it unchanged.
function others(p, projects) {
  const rest = projects.map((q, i) => ({ q, i })).filter(({ q }) => q.slug !== p.slug);
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
            <div class="marquee__lead" aria-hidden="true">
${card(last.q, last.i, false)}
            </div>
            <div class="marquee__set">
${rest.map(({ q, i }) => card(q, i, true)).join("\n")}
              <!-- Four cards are narrower than a wide screen, so the drift
                   would open a gap before the loop comes round. Each set
                   carries the four twice; the copy is hidden from assistive
                   tech and the tab order (but clickable), and gone in the
                   static layout. -->
              <div class="marquee__pad" aria-hidden="true" style="display: contents">
${rest.map(({ q, i }) => card(q, i, false)).join("\n")}
              </div>
            </div>
            <div class="marquee__set" aria-hidden="true">
${rest.map(({ q, i }) => card(q, i, false)).join("\n")}
${rest.map(({ q, i }) => card(q, i, false)).join("\n")}
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

/**
 * The whole page. `projects` is the full list (for "The other four"), and
 * `diagram` is { svg, caption } for this project, from build.cjs.
 */
function projectPage(p, i, { projects, site, diagram }) {
  const d = NO_CAPTION.has(p.slug) ? { ...diagram, caption: "" } : diagram;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
${head({
  site,
  title: `${p.title} · ${site.shortName}`,
  description: p.hook,
  path: urls.project(p.slug),
  image: `${urls.project(p.slug)}/opengraph-image`,
})}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${urls.asset("style.css")}" />
    <link rel="stylesheet" href="${urls.asset("pages.css")}" />
    <link rel="stylesheet" href="${urls.asset("demos/demos.css")}" />
    <!-- Decides live vs static before first paint, exactly as the landing does. -->
    <script src="${urls.asset("mode.js")}"></script>
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

${cue()}

${story(p)}

${demo(p)}

${moreBand()}

${others(p, projects)}
    </main>

${contact()}

${sheet(p, d)}

    <script src="${urls.asset("carousel.js")}"></script>
    <script src="${urls.asset("chrome.js")}"></script>
    <script src="${urls.asset("page.js")}"></script>
  </body>
</html>
`;
}

module.exports = { projectPage };
