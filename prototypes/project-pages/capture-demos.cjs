/**
 * Captures each project's real interactive demo from the running Next.js app,
 * so the prototype shows the actual thing rather than a redrawn stand-in.
 *
 *   npm run build && npx next start -p 3100     (in the repo root)
 *   node prototypes/project-pages/capture-demos.cjs
 *
 * The demos are React components; they come back live when these pages are
 * moved into the app. Until then the prototype frames a still of each one.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../node_modules/playwright"));

const BASE = process.env.SITE || "http://127.0.0.1:3100";
const OUT = path.join(__dirname, "demos");
const SLUGS = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];

// Order matters: the longer repo names go before any shorter overlap.
const RENAMES = [
  ["mercaldas-precios-mercado", "market-prices"],
  ["mercaldas-forecast", "demand-forecast"],
  ["mercaldas-data", "stock-rebalancing"],
  ["mercaldas-rag", "business-data-assistant"],
  ["from DANE or from Mercaldas", "from DANE or from the company"],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
    for (const slug of SLUGS) {
      await page.goto(`${BASE}/projects/${slug}`, { waitUntil: "networkidle" });
      const demo = page.locator('section[aria-label$="interactive demo"]').first();
      await demo.scrollIntoViewIfNeeded();
      // Let lazy-loaded demos mount and any intro animation settle.
      await page.waitForTimeout(1500);
      // The employer is never named. The demo subtitles still carry the repo
      // names (e.g. "mercaldas-data") and one note names the company; these
      // are renamed here for the stills, and the same edits are listed in
      // NOTES.md for the React sources when the pages move into the app.
      await page.evaluate((renames) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          let t = n.data;
          for (const [from, to] of renames) t = t.split(from).join(to);
          if (t !== n.data) n.data = t;
        }
      }, RENAMES);
      // The site's sticky header (and anything else pinned to the viewport)
      // would otherwise be photographed over the demo it scrolled past.
      await page.evaluate(() => {
        const demoEl = document.querySelector('section[aria-label$="interactive demo"]');
        for (const el of document.querySelectorAll("body *")) {
          if (demoEl.contains(el)) continue;
          const pos = getComputedStyle(el).position;
          if (pos === "sticky" || pos === "fixed") el.style.visibility = "hidden";
        }
      });
      const file = path.join(OUT, `${slug}.jpg`);
      await demo.screenshot({ path: file, type: "jpeg", quality: 86 });
      const box = await demo.boundingBox();
      console.log(slug, Math.round(box.width), "x", Math.round(box.height), (fs.statSync(file).size / 1024).toFixed(0) + " KB");
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
