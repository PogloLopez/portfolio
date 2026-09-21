/**
 * Self-check for the prototype: `node verify.cjs`.
 *
 * Starts its own static server, drives Chromium through the page and asserts
 * the things that are easy to break by accident — the mode switching, the
 * phase windows, the 4->5 swap, reversibility, the keyboard path and the idle
 * pausing. It needs Playwright, which the app already depends on.
 *
 * Pass `--shots <dir>` to also save a few screenshots.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require(path.resolve(__dirname, "../../node_modules/playwright"));

const ROOT = __dirname;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
const shotsAt = process.argv.indexOf("--shots");
const SHOTS = shotsAt > -1 ? process.argv[shotsAt + 1] : null;

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
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + JSON.stringify(detail) : ""}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  try {
    /* ---- live mode: phases, mounting, finale, keyboard ---------------- */
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const problems = [];
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(m.text()));
    page.on("pageerror", (e) => problems.push(String(e.message)));
    page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
    await page.goto(url, { waitUntil: "networkidle" });

    check("live mode on a desktop viewport", (await page.evaluate(() => window.__seq.mode)) === "live");

    const at = (i, l) => page.evaluate(([i, l]) => window.__seq.scrollYFor(i, l), [i, l]);
    const go = async (i, l) => {
      await page.evaluate((y) => window.scrollTo(0, y), await at(i, l));
      await page.waitForTimeout(120);
    };
    const partState = (i, part) =>
      page.evaluate(
        ([i, part]) => {
          const el = document.querySelector(`.panel[data-index="${i}"] [data-part="${part}"]`);
          const cs = getComputedStyle(el);
          return { opacity: +cs.opacity, transform: cs.transform };
        },
        [i, part],
      );

    // The title card holds the stage before project 1 arrives.
    await go(0, 0);
    const intro = await page.evaluate(() => {
      const el = document.querySelector(".work__intro");
      return { display: getComputedStyle(el).display, opacity: +getComputedStyle(el).opacity };
    });
    check("title card is on the stage at the pin", intro.display !== "none" && intro.opacity > 0.9, intro);

    await go(0, 0);
    const k0 = await partState(0, "kicker");
    check("project 1 starts 96px to the right, invisible", k0.opacity < 0.02 && k0.transform.includes("96"), k0);

    await go(0, 0.3);
    const k3 = await partState(0, "kicker");
    const t3 = await partState(0, "title");
    check("pieces arrive in order (kicker before title)", k3.opacity > t3.opacity, { kicker: k3.opacity, title: t3.opacity });

    await go(0, 0.95);
    const assembled = await page.evaluate(() =>
      [...document.querySelectorAll('.panel[data-index="0"] [data-part]')].every(
        (el) => !el.style.opacity && !el.style.transform,
      ),
    );
    check("project 1 is fully assembled by the end of its segment", assembled);

    // Project 3 leaves rather than sitting behind project 4.
    await go(3, 0.35);
    const ghost = await page.evaluate(() => {
      const el = document.querySelector('.panel[data-index="2"]');
      return { display: getComputedStyle(el).display, opacity: +getComputedStyle(el).opacity };
    });
    check("project 3 is gone once project 4 has arrived", ghost.display === "none" || ghost.opacity < 0.02, ghost);

    // The finale reaches full screen halfway and then drifts.
    const scaleAt = async (l) => {
      await go(4, l);
      return page.evaluate(() => {
        const m = getComputedStyle(document.querySelector('.panel[data-index="4"]')).transform;
        return +m.split("(")[1].split(",")[0];
      });
    };
    const s0 = await scaleAt(0);
    const sHalf = await scaleAt(0.5);
    const sEnd = await scaleAt(1);
    check("finale grows 0.35 -> 1.0 by halfway, then drifts", near(s0, 0.35, 0.01) && near(sHalf, 1, 0.01) && sEnd > 1.05, {
      s0,
      sHalf,
      sEnd,
    });

    // The swap into the finale is seamless (idle loops off, canvas hidden).
    await page.addStyleTag({ content: "#brain-canvas{display:none!important}*{animation:none!important}" });
    await go(3, 0.9999);
    const a = await page.screenshot();
    await go(4, 0.0001);
    const b = await page.screenshot();
    const swap = await page.evaluate(
      async ([x, y]) => {
        const load = async (d) => {
          const img = await createImageBitmap(await (await fetch("data:image/png;base64," + d)).blob());
          const c = new OffscreenCanvas(img.width, img.height);
          c.getContext("2d").drawImage(img, 0, 0);
          return c.getContext("2d").getImageData(0, 0, img.width, img.height).data;
        };
        const A = await load(x);
        const B = await load(y);
        let over = 0;
        for (let i = 0; i < A.length; i += 4) {
          if (Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])) > 8) over++;
        }
        return over;
      },
      [a.toString("base64"), b.toString("base64")],
    );
    check("project 4 splits into the finale with no visible jump", swap === 0, { differingPixels: swap });

    await page.close();

    /* ---- reversibility ------------------------------------------------ */
    const snapshot = async (p) =>
      p.evaluate(() =>
        [...document.querySelectorAll(".sequence__stage > .panel, .split-half")].map((el) => ({
          d: getComputedStyle(el).display,
          o: getComputedStyle(el).opacity,
          t: getComputedStyle(el).transform,
        })),
      );
    const fresh = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await fresh.goto(url, { waitUntil: "networkidle" });
    const target = await fresh.evaluate(() => window.__seq.scrollYFor(2, 0.5));
    await fresh.evaluate((y) => window.scrollTo(0, y), target);
    await fresh.waitForTimeout(150);
    const direct = await snapshot(fresh);
    const end = await fresh.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = target; y <= end; y += 400) {
      await fresh.evaluate((y) => window.scrollTo(0, y), y);
      await fresh.waitForTimeout(8);
    }
    for (let y = end; y >= target; y -= 400) {
      await fresh.evaluate((y) => window.scrollTo(0, y), y);
      await fresh.waitForTimeout(8);
    }
    await fresh.evaluate((y) => window.scrollTo(0, y), target);
    await fresh.waitForTimeout(150);
    const roundTrip = await snapshot(fresh);
    check("scrolling down and back leaves the same frame", JSON.stringify(direct) === JSON.stringify(roundTrip));

    /* ---- keyboard ------------------------------------------------------ */
    await fresh.evaluate(() => window.scrollTo(0, 0));
    const stops = [];
    // Two hero buttons come first, then the five projects.
    for (let i = 0; i < 9; i++) {
      await fresh.keyboard.press("Tab");
      await fresh.waitForTimeout(150);
      stops.push(
        await fresh.evaluate(() => {
          const el = document.activeElement;
          const r = el.getBoundingClientRect();
          return { href: el.getAttribute("href"), opacity: +getComputedStyle(el).opacity, onScreen: r.top >= 0 && r.bottom <= innerHeight };
        }),
      );
    }
    const ctas = stops.filter((s) => s.href && s.href.startsWith("#case-"));
    check("every project is reachable by keyboard, fully visible", ctas.length === 5 && ctas.every((s) => s.opacity > 0.95 && s.onScreen), ctas);
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await fresh.evaluate(() => window.scrollTo(0, 0));
      await fresh.screenshot({ path: path.join(SHOTS, "hero.png") });
    }
    await fresh.close();

    /* ---- idle pausing -------------------------------------------------- */
    const idlePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await idlePage.goto(url, { waitUntil: "networkidle" });
    await idlePage.waitForTimeout(500);
    const idle = await idlePage.evaluate(() => ({
      recap: document.querySelector(".recap").getAttribute("data-idle"),
      running: document.getAnimations().filter((a) => a.playState === "running").length,
    }));
    check("off-screen recap is idle while you are in the sequence", idle.recap === "1", idle);
    await idlePage.close();

    /* ---- fallbacks ----------------------------------------------------- */
    for (const [name, opts] of [
      ["reduced motion", { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }],
      ["phone", { ...devices["iPhone 13"] }],
      ["no JavaScript", { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }],
    ]) {
      const ctx = await browser.newContext(opts);
      const p = await ctx.newPage();
      await p.goto(url, { waitUntil: "networkidle" });
      await p.waitForTimeout(400);
      const state = await p.evaluate(() => ({
        panels: [...document.querySelectorAll(".sequence__stage > .panel")].filter(
          (el) => getComputedStyle(el).display !== "none",
        ).length,
        sticky: getComputedStyle(document.querySelector(".sequence__stage")).position,
        running: document.getAnimations ? document.getAnimations().filter((a) => a.playState === "running").length : 0,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      check(
        `${name}: five stacked projects, nothing pinned, no loops, no sideways scroll`,
        state.panels === 5 && state.sticky !== "sticky" && state.running === 0 && state.overflow === 0,
        state,
      );
      await ctx.close();
    }

    check("no console errors, page errors or failed requests", problems.length === 0, problems.slice(0, 3));
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
