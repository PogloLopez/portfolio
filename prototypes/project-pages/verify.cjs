/**
 * Self-check for the project pages: `node verify.cjs`.
 *
 * Serves prototypes/ (the pages borrow the landing's styles and scripts),
 * drives Chromium through all five pages and asserts what a reviewer would
 * check by hand: the opening assembles, the words follow the landing's rules,
 * the demo and diagram load, the "See more" panel opens, traps focus, closes
 * every way it should and gives focus back, the carousel shows the other four,
 * and the fallbacks hold (reduced motion, a phone). No console errors, no
 * missing files.
 *
 * Set AXE=<path to axe.min.js> to add an axe-core audit of every page, with
 * the panel closed and open.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require(path.resolve(__dirname, "../../node_modules/playwright"));
const L = require("../landing-showcase/gen-index.cjs");
const CONTENT = require("./content.cjs");

const ROOT = path.resolve(__dirname, "..");
const AXE = process.env.AXE;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) return res.writeHead(403).end();
      fs.readFile(file, (err, data) => {
        if (err) return res.writeHead(404).end("not found");
        res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? "  " + JSON.stringify(detail) : ""}`);
};

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const problems = [];
  const watch = (page, tag) => {
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`${tag}: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`${tag}: ${e.message}`));
    page.on("response", (r) => r.status() >= 400 && problems.push(`${tag}: HTTP ${r.status()} ${r.url()}`));
  };

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page, "desktop");

    for (const p of L.projects) {
      const tag = p.slug;
      await page.goto(`${url}project-pages/${p.slug}.html`, { waitUntil: "networkidle" });

      // The opening: same words as the landing card, fully assembled by 2s.
      await page.waitForTimeout(2000);
      const opening = await page.evaluate(() => {
        const parts = [...document.querySelectorAll(".pp-hero .panel__kicker, .pp-hero .pp-part")];
        return {
          title: document.querySelector("h1").textContent.trim(),
          hook: document.querySelector(".pp-hero .panel__hook").textContent.trim(),
          settled: parts.every((el) => {
            const cs = getComputedStyle(el);
            return +cs.opacity > 0.99 && (cs.transform === "none" || cs.transform === "matrix(1, 0, 0, 1, 0, 0)");
          }),
          parts: parts.length,
        };
      });
      check(`${tag}: title and hook match the landing card`, opening.title === p.title && opening.hook === p.hook, opening);
      check(`${tag}: the opening assembles on arrival (${opening.parts} pieces)`, opening.settled && opening.parts >= 5, opening);

      // The words.
      const words = await page.evaluate(() => ({
        text: document.body.innerText,
        paragraphs: document.querySelectorAll(".pp-story__body p").length,
      }));
      check(`${tag}: the employer is never named`, !/mercaldas/i.test(words.text + (await page.content())));
      check(`${tag}: the story is at most two paragraphs`, words.paragraphs >= 1 && words.paragraphs <= 2, words.paragraphs);

      // The demo still and the diagram load.
      const media = await page.evaluate(async () => {
        const img = document.querySelector(".pp-demo__frame img");
        img.loading = "eager";
        if (!img.complete) await new Promise((r) => img.addEventListener("load", r, { once: true }));
        return { demo: img.naturalWidth, diagram: !!document.querySelector(".pp-diagram svg") };
      });
      check(`${tag}: the demo still loads`, media.demo > 0, media);
      check(`${tag}: the architecture diagram is in the panel`, media.diagram);

      // "See more": opens, holds focus, locks the page, closes three ways.
      await page.evaluate(() => document.querySelector(".pp-more").scrollIntoView({ block: "center" }));
      const before = await page.evaluate(() => window.scrollY);
      await page.focus(".pp-more__open");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(700);
      const opened = await page.evaluate(() => {
        const d = document.getElementById("tech");
        return {
          open: d.open,
          focusInside: d.contains(document.activeElement),
          locked: document.documentElement.classList.contains("pp-locked"),
          tools: d.querySelectorAll(".pp-tools li").length,
          numbers: d.querySelectorAll(".pp-num").length,
          meta: d.querySelectorAll(".pp-meta > div").length,
        };
      });
      const c = CONTENT[p.slug];
      check(`${tag}: See more opens the panel, focus moves in, page is locked`, opened.open && opened.focusInside && opened.locked, opened);
      check(
        `${tag}: the panel carries tools, numbers, role/running/repo`,
        opened.tools === c.tools.length && opened.numbers === c.numbers.length && opened.meta === 3,
        opened,
      );
      for (let t = 0; t < 12; t++) await page.keyboard.press("Tab");
      check(`${tag}: Tab stays inside the open panel`, await page.evaluate(() => document.getElementById("tech").contains(document.activeElement)));

      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const afterEsc = await page.evaluate(() => ({
        open: document.getElementById("tech").open,
        focusBack: document.activeElement.classList.contains("pp-more__open"),
        unlocked: !document.documentElement.classList.contains("pp-locked"),
        y: window.scrollY,
      }));
      check(
        `${tag}: Escape closes it, returns focus, page scroll untouched`,
        !afterEsc.open && afterEsc.focusBack && afterEsc.unlocked && Math.abs(afterEsc.y - before) < 2,
        { ...afterEsc, before },
      );

      await page.click(".pp-more__open");
      await page.waitForTimeout(600);
      await page.mouse.click(8, 450); // the dimmed area, outside the panel
      await page.waitForTimeout(500);
      const clickOut = await page.evaluate(() => document.getElementById("tech").open);
      await page.click(".pp-more__open");
      await page.waitForTimeout(600);
      await page.click(".pp-sheet__close");
      await page.waitForTimeout(500);
      const closeBtn = await page.evaluate(() => document.getElementById("tech").open);
      check(`${tag}: a click outside and the close button both close it`, !clickOut && !closeBtn, { clickOut, closeBtn });

      // The other four.
      const others = await page.evaluate((slug) => {
        const real = [...document.querySelectorAll(".marquee__set:not([aria-hidden]) > .mcard")];
        return {
          n: real.length,
          hrefs: real.map((a) => a.querySelector(".mcard__cta").getAttribute("href")),
          self: real.some((a) => a.querySelector(".mcard__cta").getAttribute("href") === `${slug}.html`),
        };
      }, p.slug);
      check(`${tag}: the carousel links the other four, not this one`, others.n === 4 && !others.self, others);

      if (AXE) {
        await page.addScriptTag({ path: AXE });
        const closed = await page.evaluate(async () => (await window.axe.run(document, { preload: false })).violations.map((v) => `${v.id} (${v.nodes.length})`));
        await page.click(".pp-more__open");
        await page.waitForTimeout(700);
        const openV = await page.evaluate(async () => (await window.axe.run(document, { preload: false })).violations.map((v) => `${v.id} (${v.nodes.length})`));
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        check(`${tag}: axe finds no violations, panel closed and open`, !closed.length && !openV.length, { closed, open: openV });
      }
    }

    // Every card link in both prototypes points at a page that exists.
    const links = await page.evaluate(async (base) => {
      const out = [];
      for (const f of ["landing-showcase/index.html", "project-pages/forecast.html"]) {
        const html = await (await fetch(base + f)).text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        for (const a of doc.querySelectorAll("a.panel__cta, a.mcard__cta")) {
          const target = new URL(a.getAttribute("href"), base + f).href;
          out.push({ from: f, target, status: (await fetch(target)).status });
        }
      }
      return out;
    }, url);
    const broken = links.filter((l) => l.status !== 200);
    check(`every case-study link resolves (${links.length} checked)`, links.length > 0 && !broken.length, broken);
    await ctx.close();

    /* ---- fallbacks ---------------------------------------------------- */
    for (const [name, opts] of [
      ["reduced motion", { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }],
      ["phone", { ...devices["iPhone 13"] }],
    ]) {
      const c2 = await browser.newContext(opts);
      const p2 = await c2.newPage();
      watch(p2, name);
      await p2.goto(`${url}project-pages/operations-platform.html`, { waitUntil: "networkidle" });
      await p2.waitForTimeout(2000);
      const state = await p2.evaluate(() => ({
        running: document.getAnimations().filter((a) => a.playState === "running").length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        topbarFits: document.querySelector(".topbar__actions").getBoundingClientRect().right <= innerWidth,
      }));
      check(`${name}: nothing sideways, the top bar fits`, state.overflow <= 0 && state.topbarFits, state);
      if (name === "reduced motion") check(`${name}: nothing animates`, state.running === 0, state);
      if (name === "phone") {
        await p2.click(".pp-more__open");
        await p2.waitForTimeout(700);
        const sheet = await p2.evaluate(() => {
          const r = document.getElementById("tech").getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
        });
        check(`${name}: the panel is a full-screen sheet`, sheet.w === sheet.vw && Math.abs(sheet.h - sheet.vh) <= 2, sheet);
      }
      await c2.close();
    }

    check("no console errors, page errors or failed requests", problems.length === 0, problems.slice(0, 5));
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
