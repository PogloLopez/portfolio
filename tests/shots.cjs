/**
 * Screenshots of every project page, for review: the opening, the story and
 * demo, the "See more" panel open, and the page on a phone.
 *
 *   node tests/shots.cjs [outDir]     (against the running site, see lib.cjs)
 */
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");
const { urls } = require("./lib.cjs");

const OUT = path.resolve(process.argv[2] || path.join(__dirname, ".shots"));
const SLUGS = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];


(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  try {
    for (const [name, opts] of [
      ["desk", { viewport: { width: 1440, height: 900 } }],
      ["phone", { ...devices["iPhone 13"] }],
    ]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`${name} ${m.text()}`));
      page.on("pageerror", (e) => problems.push(`${name} pageerror ${e.message}`));
      page.on("response", (r) => r.status() >= 400 && problems.push(`${name} HTTP ${r.status()} ${r.url()}`));
      for (const slug of SLUGS) {
        await page.goto(urls.project(slug), { waitUntil: "networkidle" });
        await page.waitForTimeout(1800); // the arrival
        await page.screenshot({ path: path.join(OUT, `${name}-${slug}-1-open.png`) });
        await page.evaluate(() => document.querySelector(".pp-story").scrollIntoView({ block: "start" }));
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT, `${name}-${slug}-2-story.png`) });
        await page.click(".pp-more__open");
        await page.waitForTimeout(900);
        await page.screenshot({ path: path.join(OUT, `${name}-${slug}-3-sheet.png`) });
        await page.evaluate(() => {
          const b = document.querySelector(".pp-sheet__body");
          b.scrollTop = b.scrollHeight;
        });
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(OUT, `${name}-${slug}-4-sheet-end.png`) });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        await page.evaluate(() => document.querySelector(".pp-others").scrollIntoView({ block: "center" }));
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `${name}-${slug}-5-others.png`) });
      }
      await ctx.close();
    }
    console.log(JSON.stringify({ out: OUT, problems }, null, 1));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
