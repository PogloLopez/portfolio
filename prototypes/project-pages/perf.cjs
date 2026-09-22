/**
 * Frame times on a project page with the CPU throttled 4x (roughly an office
 * machine next to a developer desktop): the arrival, a wheel scroll down the
 * page, and the "See more" panel opening and scrolling.
 *
 *   node perf.cjs [slug]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../node_modules/playwright"));
const ROOT = path.resolve(__dirname, "..");
const SLUG = process.argv[2] || "forecast";
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".webp": "image/webp" };

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))] * 10) / 10;
  return { frames: s.length, median: q(0.5), p95: q(0.95), slow: Math.round((s.filter((x) => x > 33).length / s.length) * 100) + "%" };
};

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(file, (e, d) => {
      if (e) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      window.__f = { stage: "arrival", data: {} };
      let last = performance.now();
      const tick = (t) => {
        const dt = t - last;
        last = t;
        (window.__f.data[window.__f.stage] ||= []).push(dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/project-pages/${SLUG}.html`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    const stage = (s) => page.evaluate((s) => (window.__f.stage = s), s);
    await stage("scroll");
    await page.mouse.move(720, 450);
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i < Math.ceil(total / 100); i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(24);
    }
    await page.evaluate(() => document.querySelector(".pp-more").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await stage("panel-open");
    await page.click(".pp-more__open");
    await page.waitForTimeout(900);
    await stage("panel-scroll");
    await page.mouse.move(720, 450);
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(24);
    }
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => window.__f.data);
    const out = {};
    for (const [k, v] of Object.entries(data)) out[k] = stats(v.filter((x) => x > 0 && x < 2000));
    console.log(SLUG, JSON.stringify(out));
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
