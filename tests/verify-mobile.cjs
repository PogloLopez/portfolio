/**
 * Self-check for the phone version of the site: `node tests/verify-mobile.cjs`.
 *
 * Drives Chromium as a phone (touch, no mouse) through the landing and all
 * five project pages on the running site (see lib.cjs) and asserts what
 * someone holding a phone would notice:
 *
 * - nothing scrolls sideways, at 320px as well as 390px;
 * - no two pieces of text sit on top of each other;
 * - everything you tap is at least 44px on its short side;
 * - the project pictures move, and only the ones on screen do;
 * - the closing row is the swipe row, not the drifting carousel, and it
 *   swipes and opens pages;
 * - the parts that arrive on scroll all end up visible;
 * - with reduced motion asked for, nothing animates and nothing is hidden;
 * - the pages stay short enough to get through.
 *
 * Set AXE=<path to axe.min.js> to add an axe-core audit at phone size, the
 * "See more" sheet included. As on the desktop pages, findings inside the
 * site's own demos are reported apart rather than counted.
 */
const { chromium, devices } = require("playwright");
const { serve, urls } = require("./lib.cjs");

const AXE = process.env.AXE;
const SLUGS = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];
// A 2020s phone, and the narrowest screen still worth supporting.
const SIZES = [
  { name: "390px", width: 390, height: 844 },
  { name: "320px", width: 320, height: 568 },
];

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? "  " + JSON.stringify(detail) : ""}`);
};

/* What a page looks like from the outside, measured in the page itself. */
const survey = () => {
  const style = (el) => getComputedStyle(el);
  const shown = (el) => {
    const s = style(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => {
    const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
    return el.tagName.toLowerCase() + (cls ? "." + String(cls).trim().split(/\s+/)[0] : "");
  };

  // Blocks of text only: inline runs share a line box with their siblings by
  // design, and a grid slot that holds the typing dots under the answer they
  // will be replaced by is the same one cell on purpose.
  const blocks = [...document.querySelectorAll("p, li, h1, h2, h3, dt, dd, figcaption, span, div")].filter(
    (el) =>
      shown(el) &&
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) &&
      style(el).position === "static" &&
      // The fixed bar floats over the page on purpose.
      !el.closest(".topbar, .pp-sheet, .pp-cue") &&
      !style(el).display.startsWith("inline") &&
      !el.closest(".chat__slot"),
  );
  const overlaps = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 2 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 2) {
        overlaps.push(name(a) + " over " + name(b));
      }
    }
  }

  const small = [];
  for (const el of document.querySelectorAll("a[href], button, [role=button], summary")) {
    if (!shown(el) || el.disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) small.push(name(el) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }

  return {
    overlaps: [...new Set(overlaps)],
    small: [...new Set(small)],
    wider: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // Screens of a 390x844 phone, whatever this window's own height is, so
    // the number means the same thing at both sizes.
    screens: +(document.documentElement.scrollHeight / 844).toFixed(1),
  };
};

// Walks a page from top to bottom the way a reader does, so everything that
// waits for its turn (the pictures' idle switch, the parts that arrive on
// scroll) has had it.
async function walk(page, step = 400) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += step) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(80);
  }
  // Long enough for the last arrival to have finished: the transition is
  // 0.55s, after a stagger of up to 0.35s.
  await page.waitForTimeout(1200);
}

(async () => {
  const { server } = await serve();
  const browser = await chromium.launch();
  const problems = [];
  const watch = (page, tag) => {
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`${tag}: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`${tag}: ${e.message}`));
    page.on("response", (r) => r.status() >= 400 && problems.push(`${tag}: HTTP ${r.status()} ${r.url()}`));
  };

  try {
    /* ---- every page, at two phone sizes -------------------------------- */
    for (const size of SIZES) {
      const ctx = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["iPhone 13"].userAgent,
      });
      const page = await ctx.newPage();
      watch(page, size.name);

      for (const [tag, url] of [["home", urls.home], ...SLUGS.map((s) => [s, urls.project(s)])]) {
        await page.goto(url, { waitUntil: "networkidle" });
        await walk(page);
        const r = await page.evaluate(survey);
        check(`${size.name} ${tag}: nothing wider than the screen`, r.wider <= 0, r.wider);
        check(`${size.name} ${tag}: no text on top of other text`, r.overlaps.length === 0, r.overlaps.slice(0, 4));
        check(`${size.name} ${tag}: every target is at least 44px`, r.small.length === 0, r.small.slice(0, 4));
        // The desktop pages run to 7-11 screens; a phone reader gets through
        // a project in about five.
        check(`${size.name} ${tag}: the page stays under 8 screens (${r.screens})`, r.screens <= 8, r.screens);
      }
      await ctx.close();
    }

    /* ---- the pictures, and what they cost ------------------------------ */
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    watch(page, "phone");

    await page.goto(urls.home, { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll(".panel")[1].scrollIntoView({ block: "center" }));
    await page.waitForTimeout(700);
    const loops = await page.evaluate(() => {
      const running = (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length;
      const panels = [...document.querySelectorAll(".panel")];
      const near = panels.filter((p) => {
        const r = p.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      });
      // Well away, not merely off screen: a block is woken a little before it
      // arrives (chrome.js).
      const away = panels.filter((p) => {
        const r = p.getBoundingClientRect();
        return r.top - innerHeight > 200 || -r.bottom > 200;
      });
      return {
        mode: document.documentElement.className,
        onScreen: near.reduce((n, p) => n + running(p), 0),
        offScreen: away.reduce((n, p) => n + running(p), 0),
      };
    });
    check("phone: the project pictures animate", /viz-live/.test(loops.mode) && loops.onScreen > 0, loops);
    check("phone: a picture off screen is not animating", loops.offScreen === 0, loops);

    /* ---- the closing row ----------------------------------------------- */
    for (const [tag, url] of [
      ["home", urls.home],
      ["rag", urls.project("rag")],
    ]) {
      await page.goto(url, { waitUntil: "networkidle" });
      const row = await page.evaluate(() => {
        const strip = document.querySelector(".mstrip");
        const marquee = document.querySelector(".marquee");
        return {
          strip: !!strip && getComputedStyle(strip).display !== "none",
          marquee: !!marquee && getComputedStyle(marquee).display === "none",
          cards: strip ? strip.querySelectorAll(".mstrip__card").length : 0,
        };
      });
      check(`phone: ${tag} closes with the swipe row, not the carousel`, row.strip && row.marquee, row);
      check(`phone: ${tag}'s row holds every other project`, row.cards === (tag === "home" ? 5 : 4), row.cards);

      const swipe = await page.evaluate(() => {
        const el = document.querySelector(".mstrip");
        el.scrollIntoView({ block: "center" });
        const before = el.scrollLeft;
        el.scrollBy({ left: el.clientWidth * 0.8 });
        return new Promise((r) => setTimeout(() => r({ before, after: el.scrollLeft, room: el.scrollWidth - el.clientWidth }), 600));
      });
      check(`phone: ${tag}'s row swipes sideways`, swipe.room > 100 && swipe.after > swipe.before, swipe);
    }

    const card = page.locator(".mstrip__card").first();
    await card.scrollIntoViewIfNeeded();
    const target = await card.evaluate((a) => a.href);
    await card.tap();
    await page.waitForURL((u) => u.href === target, { timeout: 5000 }).catch(() => {});
    check("phone: a card in the row opens its page by tap", page.url() === target, page.url());

    /* ---- nothing left hidden ------------------------------------------- */
    for (const [tag, url] of [
      ["home", urls.home],
      ["forecast", urls.project("forecast")],
    ]) {
      await page.goto(url, { waitUntil: "networkidle" });
      await walk(page);
      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll("[data-reveal]")].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).map((el) => el.className),
      );
      check(`phone: ${tag} leaves nothing hidden once it has been scrolled through`, hidden.length === 0, hidden.slice(0, 4));
    }

    /* ---- the "See more" sheet ------------------------------------------ */
    await page.goto(urls.project("cortana"), { waitUntil: "networkidle" });
    await page.locator(".pp-more__open").tap();
    await page.waitForTimeout(800);
    const sheet = await page.evaluate(() => {
      const s = document.getElementById("tech");
      const r = s.getBoundingClientRect();
      return {
        open: s.open,
        fullWidth: Math.abs(r.width - innerWidth) < 2,
        locked: document.documentElement.classList.contains("pp-locked"),
        wider: s.querySelector(".pp-sheet__body").scrollWidth - s.querySelector(".pp-sheet__body").clientWidth,
      };
    });
    check("phone: 'See more' fills the screen and holds the page still", sheet.open && sheet.fullWidth && sheet.locked, sheet);
    check("phone: nothing in the sheet runs off the side", sheet.wider <= 0, sheet.wider);
    const inSheet = await page.evaluate(survey);
    check("phone: every target in the sheet is at least 44px", inSheet.small.length === 0, inSheet.small.slice(0, 4));
    check("phone: no text on top of other text in the sheet", inSheet.overlaps.length === 0, inSheet.overlaps.slice(0, 4));

    const cue = await page.evaluate(() => {
      const fig = document.querySelector(".pp-diagram");
      const sc = fig.querySelector(".pp-diagram__scroll");
      return { marked: fig.classList.contains("pp-diagram--wide"), over: sc.scrollWidth - sc.clientWidth };
    });
    check("phone: the diagram asks for a swipe because it really overflows", cue.marked && cue.over > 4, cue);

    if (AXE) {
      await page.addScriptTag({ path: AXE });
      const open = await page.evaluate(async () =>
        (await window.axe.run(document, { preload: false })).violations.map((v) => `${v.id} (${v.nodes.length})`),
      );
      check("phone: axe finds no violations with the sheet open", open.length === 0, open);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await ctx.close();

    /* ---- a phone with a notch ------------------------------------------ */
    const notched = await browser.newContext({ ...devices["iPhone 13"] });
    const notchedPage = await notched.newPage();
    watch(notchedPage, "phone with a notch");
    const cdp = await notched.newCDPSession(notchedPage);
    // An iPhone 13's own insets: the island and the home indicator.
    await cdp.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 47, left: 0, bottom: 34, right: 0 },
    });
    await notchedPage.goto(urls.project("rag"), { waitUntil: "networkidle" });
    const bar = await notchedPage.evaluate(() => {
      const tops = [...document.querySelectorAll(".topbar .btn")].map((b) => b.getBoundingClientRect().top);
      return { lowest: Math.min(...tops), inset: getComputedStyle(document.querySelector(".topbar")).paddingTop };
    });
    check("phone with a notch: the bar's actions sit below the status bar", bar.lowest >= 47, bar);

    await notchedPage.locator(".pp-more__open").tap();
    await notchedPage.waitForTimeout(800);
    const sheetTop = await notchedPage.evaluate(() => {
      const close = document.querySelector(".pp-sheet__close").getBoundingClientRect();
      const kicker = document.querySelector(".pp-sheet__kicker").getBoundingClientRect();
      return { close: close.top, closeSize: Math.min(close.width, close.height), kicker: kicker.top };
    });
    check("phone with a notch: the sheet's close button clears it, and is 44px", sheetTop.close >= 47 && sheetTop.closeSize >= 44, sheetTop);
    check("phone with a notch: the sheet's own heading clears it", sheetTop.kicker >= 47, sheetTop);
    await notched.close();

    /* ---- a window dragged wider than the sequence's threshold ----------- */
    const grown = await browser.newContext({ viewport: { width: 700, height: 800 } });
    const grownPage = await grown.newPage();
    watch(grownPage, "narrow window");
    await grownPage.goto(urls.home, { waitUntil: "networkidle" });
    await walk(grownPage);
    await grownPage.setViewportSize({ width: 1280, height: 800 });
    await grownPage.waitForTimeout(900);
    const handedBack = await grownPage.evaluate(() => {
      // In the sequence a panel's opacity is the stage's business: only the
      // one being shown is opaque. What must not survive the change is this
      // file's own state — the attribute and the stagger it set.
      const parts = [...document.querySelectorAll(".panel [data-part]")];
      const shown = [...document.querySelectorAll(".panel")].find((p) => Number(getComputedStyle(p).opacity) > 0.99);
      return {
        mode: document.documentElement.className,
        waiting: document.querySelectorAll("[data-reveal]").length,
        staggered: parts.filter((el) => el.style.transitionDelay).length,
        hiddenInShownPanel: shown ? [...shown.querySelectorAll("[data-part]")].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length : -1,
      };
    });
    check(
      "a window widened past 780px hands every part back to the sequence",
      /seq-live/.test(handedBack.mode) && handedBack.waiting === 0 && handedBack.staggered === 0 && handedBack.hiddenInShownPanel === 0,
      handedBack,
    );
    await grown.close();

    /* ---- reduced motion ------------------------------------------------ */
    const calm = await browser.newContext({ ...devices["iPhone 13"], reducedMotion: "reduce" });
    const calmPage = await calm.newPage();
    watch(calmPage, "phone, reduced motion");
    await calmPage.goto(urls.home, { waitUntil: "networkidle" });
    await walk(calmPage);
    const quiet = await calmPage.evaluate(() => ({
      mode: document.documentElement.className,
      running: document.getAnimations().filter((a) => a.playState === "running").length,
      waiting: document.querySelectorAll("[data-reveal]").length,
    }));
    check("phone, reduced motion: nothing animates and nothing waits to arrive", quiet.running === 0 && quiet.waiting === 0, quiet);

    /* ---- the audit, with the page at rest -------------------------------
       Deliberately in this context. Colour contrast is a property of the
       page's colours, and a page whose pictures are looping and whose blocks
       are arriving is half way through a fade somewhere at any moment: axe
       reads those elements at whatever opacity it finds them, and reports
       text against its own background. At rest it measures the real
       colours. */
    if (AXE) {
      for (const [tag, url] of [["home", urls.home], ...SLUGS.map((s) => [s, urls.project(s)])]) {
        await calmPage.goto(url, { waitUntil: "networkidle" });
        await calmPage.addScriptTag({ path: AXE });
        const site = await calmPage.evaluate(async () =>
          (await window.axe.run({ exclude: [["[data-demo]"]] }, { preload: false })).violations.map((v) => `${v.id} (${v.nodes.length})`),
        );
        // The landing has no demo on it.
        const demo = await calmPage.evaluate(async () =>
          document.querySelector("[data-demo]")
            ? (await window.axe.run({ include: [["[data-demo]"]] }, { preload: false })).violations.map((v) => `${v.id} (${v.nodes.length})`)
            : [],
        );
        if (demo.length) console.log(`note  phone ${tag}: the site's own demo has ${demo.join(", ")} (pre-existing, not counted)`);
        check(`phone ${tag}: axe finds no violations`, site.length === 0, site);
      }
    }

    await calm.close();

    check("no console errors, page errors or failed requests", problems.length === 0, problems.slice(0, 6));
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
