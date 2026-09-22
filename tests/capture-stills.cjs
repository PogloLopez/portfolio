/**
 * Captures each project page's live demo as the still that shows in its place
 * without JavaScript (public/site/demos/<slug>.jpg).
 *
 *   node tests/capture-stills.cjs     (against the running site, see lib.cjs)
 *
 * Run it after changing a demo. The stills are plain files the pages point
 * at, so nothing needs rebuilding afterwards.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { urls } = require("./lib.cjs");

const OUT = path.resolve(__dirname, "..", "public", "site", "demos");
const SLUGS = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
    for (const slug of SLUGS) {
      await page.goto(urls.project(slug), { waitUntil: "networkidle" });
      const demo = page.locator('[data-demo-ready] section[aria-label$="interactive demo"]');
      await demo.scrollIntoViewIfNeeded();
      // Let the demo mount and any intro animation settle.
      await page.waitForTimeout(1500);
      // The top bar (and anything else pinned to the viewport) would
      // otherwise be photographed over the demo it scrolled past.
      await page.evaluate(() => {
        const demoEl = document.querySelector("[data-demo]");
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
