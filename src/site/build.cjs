/**
 * Builds the site's pages into public/site/, where Next serves them as static
 * files (the rewrites in next.config.ts map / and /projects/<slug> onto them).
 *
 *   npm run site          write public/site/
 *   npm run site:check    fail if public/site/ is not what the sources give
 *
 * From the sources:
 * - src/content/projects.ts and src/lib/site.ts: every word on the pages.
 * - src/components/Diagram.tsx and src/content/diagrams.ts: each project's
 *   architecture diagram, rendered to SVG with the real component.
 * - src/components/demos: each interactive demo, bundled with React into one
 *   script, and the Tailwind utilities they use, compiled against theme.css.
 *
 * The hand-written parts of the front end (style.css, the scripts, hero.webp,
 * the demo stills) live in public/site/ already and are not touched.
 *
 * The output is committed, so a deploy serves exactly the files that were
 * reviewed; site:check keeps them from going stale.
 */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const { landingPage } = require("./landing.cjs");
const { projectPage } = require("./project-page.cjs");

const REPO = path.resolve(__dirname, "..", "..");
const OUT = path.join(REPO, "public", "site");
const DEMOS_SRC = path.join(REPO, "src", "components", "demos");
const CHECK = process.argv.includes("--check");

const DEMOS = {
  forecast: "ForecastDemo",
  "market-prices": "MarketPricesDemo",
  rag: "RagDemo",
  "operations-platform": "OperationsDemo",
  cortana: "CortanaDemo",
};

/* ---- content ------------------------------------------------------------- */

// The TypeScript content and the diagram component, compiled with esbuild and
// loaded in this process. Packages stay external and resolve from the app's
// own node_modules.
async function loadContent() {
  const result = await esbuild.build({
    stdin: {
      contents: [
        `import { createElement } from "react";`,
        `import { renderToStaticMarkup } from "react-dom/server";`,
        `import { Diagram } from "@/components/Diagram";`,
        `import { diagrams } from "@/content/diagrams";`,
        `export { projects } from "@/content/projects";`,
        `export { site } from "@/lib/site";`,
        `export const renderDiagram = (slug) => renderToStaticMarkup(createElement(Diagram, { spec: diagrams[slug] }));`,
      ].join("\n"),
      resolveDir: path.join(REPO, "src"),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    packages: "external",
    logLevel: "warning",
  });
  const mod = { exports: {} };
  const load = new Function("module", "exports", "require", result.outputFiles[0].text);
  load(mod, mod.exports, (id) => require(require.resolve(id, { paths: [REPO] })));
  return mod.exports;
}

// The diagram's <svg> and its caption, out of the <figure> Diagram renders.
function diagramFor(renderDiagram, slug) {
  const fig = renderDiagram(slug);
  const svg = fig.slice(fig.indexOf("<svg"), fig.indexOf("</svg>") + 6);
  const caption = (fig.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/) || [])[1] || "";
  if (!svg.startsWith("<svg")) throw new Error(`no diagram for ${slug}`);
  return { svg, caption };
}

/* ---- demos --------------------------------------------------------------- */

// One small mount script per demo. It clears the host's fallback (a still of
// the demo, shown without JavaScript) and renders the real component there.
function mountSource(slug, name) {
  return [
    `import { createRoot } from "react-dom/client";`,
    `import { ${name} } from "./${name}";`,
    ``,
    `const host = document.querySelector('[data-demo="${slug}"]');`,
    `if (host) {`,
    `  host.textContent = "";`,
    `  createRoot(host).render(<${name} />);`,
    `  host.setAttribute("data-demo-ready", "1");`,
    `}`,
    ``,
  ].join("\n");
}

async function bundleDemo(slug, name) {
  const result = await esbuild.build({
    stdin: { contents: mountSource(slug, name), resolveDir: DEMOS_SRC, loader: "tsx" },
    bundle: true,
    write: false,
    minify: true,
    format: "iife",
    jsx: "automatic",
    target: "es2020",
    // Without this, React's development build is bundled.
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  // esbuild adds this itself for a file entry but not for stdin; the demos
  // were reviewed running in strict mode.
  return '"use strict";' + result.outputFiles[0].text;
}

// The part of Tailwind's preflight the demos rely on, scoped to the demo so
// it cannot touch the rest of the page. It comes before the utilities, so a
// utility with the same specificity still wins.
const SCOPED_RESET = `
/* The theme defines its fonts through two variables that next/font set on
   the old site. The theme block redeclares --font-sans and --font-mono at
   :root in terms of them, so they must exist at :root too: left undefined,
   the whole page's font stack becomes invalid and falls back to the
   browser's serif. */
:root {
  --font-inter: "Inter";
  --font-mono-face: "JetBrains Mono";
}
[data-demo] {
  font-family: var(--font-sans);
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}
[data-demo] :where(*, ::before, ::after) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}
[data-demo] :where(h1, h2, h3, h4, h5, h6) {
  font-size: inherit;
  font-weight: inherit;
}
[data-demo] :where(ol, ul, menu) {
  list-style: none;
}
[data-demo] :where(img, svg, video, canvas) {
  display: block;
  vertical-align: middle;
}
[data-demo] :where(button, input, select, optgroup, textarea) {
  font: inherit;
  font-feature-settings: inherit;
  letter-spacing: inherit;
  color: inherit;
  border-radius: 0;
  background-color: transparent;
  opacity: 1;
}
[data-demo] :where(button, [role="button"]) {
  cursor: pointer;
}
[data-demo] :where(table) {
  border-collapse: collapse;
  text-indent: 0;
  border-color: inherit;
}
[data-demo] :where(a) {
  color: inherit;
  text-decoration: inherit;
}
`;

async function demoStyles() {
  const postcss = require("postcss");
  const tailwind = require("@tailwindcss/postcss");
  const theme = fs.readFileSync(path.join(DEMOS_SRC, "theme.css"), "utf8");
  // Utilities are emitted unlayered on purpose: the page stylesheet's element
  // rules (p, ul, h3...) are unlayered too, and a layered utility would lose
  // to them regardless of specificity.
  const input = [
    "/* GENERATED by src/site/build.cjs: the Tailwind utilities the site's demos use. */",
    '@import "tailwindcss/theme.css";',
    '@source "./";',
    theme,
    SCOPED_RESET,
    "@tailwind utilities;",
    "",
  ].join("\n");
  const result = await postcss([tailwind({ base: DEMOS_SRC, optimize: { minify: true } })]).process(input, {
    from: path.join(DEMOS_SRC, "demos.css"),
    to: path.join(OUT, "demos", "demos.css"),
  });
  return result.css;
}

/* ---- all of it ----------------------------------------------------------- */

async function build() {
  const { projects, site, renderDiagram } = await loadContent();
  const files = {};

  files["index.html"] = landingPage({ projects, site });
  projects.forEach((p, i) => {
    const diagram = diagramFor(renderDiagram, p.slug);
    files[`projects/${p.slug}.html`] = projectPage(p, i, { projects, site, diagram });
  });
  for (const [slug, name] of Object.entries(DEMOS)) files[`demos/${slug}.js`] = await bundleDemo(slug, name);
  files["demos/demos.css"] = await demoStyles();

  // The employer is never named, on any page or in any demo.
  for (const [file, text] of Object.entries(files)) {
    if (/mercaldas/i.test(text)) throw new Error(`${file} names the employer`);
  }
  return files;
}

module.exports = { loadContent, build };

if (require.main !== module) return;

build()
  .then((files) => {
    const stale = [];
    for (const [file, text] of Object.entries(files)) {
      const target = path.join(OUT, file);
      const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
      if (current === text) continue;
      if (CHECK) {
        stale.push(file);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text);
      console.log("wrote", path.relative(REPO, target), `${(text.length / 1024).toFixed(0)} KB`);
    }
    if (CHECK && stale.length) {
      console.error(`public/site/ is out of date (run npm run site):\n  ${stale.join("\n  ")}`);
      process.exit(1);
    }
    if (CHECK) console.log("public/site/ is up to date");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
