/**
 * Frame times with the CPU throttled: the arrival, a scroll down the page, and
 * the "See more" panel opening and scrolling.
 *
 *   node tests/perf.cjs [slug|home] [phone]
 *
 * Without "phone": a 1440px window at 4x throttle, roughly an office machine
 * next to a developer desktop. With it: an iPhone 13 at 6x, roughly a mid
 * range phone, which is where the pictures animate under the reader's thumb
 * and where five of them share one column.
 */
const { chromium, devices } = require("playwright");
const { urls } = require("./lib.cjs");
const SLUG = process.argv[2] || "forecast";
const PHONE = process.argv.includes("phone");

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))] * 10) / 10;
  return { frames: s.length, median: q(0.5), p95: q(0.95), slow: Math.round((s.filter((x) => x > 33).length / s.length) * 100) + "%" };
};

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext(PHONE ? { ...devices["iPhone 13"] } : { viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: PHONE ? 6 : 4 });
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
    await page.goto(SLUG === "home" ? urls.home : urls.project(SLUG), { waitUntil: "load" });
    await page.waitForTimeout(2000);
    const stage = (s) => page.evaluate((s) => (window.__f.stage = s), s);
    await stage("scroll");
    await page.mouse.move(720, 450);
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i < Math.ceil(total / 100); i++) {
      if (PHONE) await page.evaluate(() => window.scrollBy(0, 100));
      else await page.mouse.wheel(0, 100);
      await page.waitForTimeout(24);
    }
    if (SLUG === "home") {
      const data = await page.evaluate(() => window.__f.data);
      const out = {};
      for (const [k, v] of Object.entries(data)) out[k] = stats(v.filter((x) => x > 0 && x < 2000));
      console.log(SLUG, PHONE ? "(phone, 6x)" : "(desktop, 4x)", JSON.stringify(out));
      return;
    }
    await page.evaluate(() => document.querySelector(".pp-more").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await stage("panel-open");
    if (PHONE) await page.tap(".pp-more__open");
    else await page.click(".pp-more__open");
    await page.waitForTimeout(900);
    await stage("panel-scroll");
    await page.mouse.move(720, 450);
    for (let i = 0; i < 14; i++) {
      if (PHONE) await page.evaluate(() => document.querySelector(".pp-sheet__body").scrollBy(0, 100));
      else await page.mouse.wheel(0, 100);
      await page.waitForTimeout(24);
    }
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => window.__f.data);
    const out = {};
    for (const [k, v] of Object.entries(data)) out[k] = stats(v.filter((x) => x > 0 && x < 2000));
    console.log(SLUG, PHONE ? "(phone, 6x)" : "(desktop, 4x)", JSON.stringify(out));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
