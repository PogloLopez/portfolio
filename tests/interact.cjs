/**
 * Clicks everything, the way a person does: a real mouse moved onto the
 * element and pressed, then a check that the right thing happened. Nothing
 * here reads an attribute and assumes the click would work.
 *
 *   node tests/interact.cjs
 *
 * Runs against the running site (see lib.cjs).
 */
const { chromium, devices } = require("playwright");
const { serve, urls } = require("./lib.cjs");

const SLUGS = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];


const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? "  " + JSON.stringify(detail) : ""}`);
};

// A real click: scroll it into view, move the mouse there, press.
async function realClick(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.mouse.down();
  await page.mouse.up();
}

// A real click that is expected to navigate: wait for the address to change
// (up to 5s) instead of reading it the instant the mouse comes up, which
// raced the navigation and reported working links as broken.
async function clickToNavigate(page, locator, test) {
  const start = page.url();
  await realClick(page, locator);
  try {
    await page.waitForURL((u) => u.href !== start && test(u.href), { timeout: 5000 });
  } catch {
    // fall through: the caller reports page.url()
  }
  return page.url();
}

/**
 * Carousel: for each of several drift phases, freeze the drift, find the card
 * nearest the middle of the screen (real, padding copy or duplicate, whichever
 * is there), click its call to action with the mouse, and check where the
 * browser went. This is exactly the "every other pass is dead" test.
 */
async function carouselClicks(page, pageUrl, label) {
  const failures = [];
  const phases = [0.02, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  for (const f of phases) {
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelector(".marquee").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(200);
    const target = await page.evaluate((f) => {
      const track = document.querySelector(".marquee__track");
      const anim = track.getAnimations().find((a) => a.animationName === "marquee-drift");
      if (anim) {
        anim.pause();
        anim.currentTime = anim.effect.getTiming().duration * f;
      }
      const mid = innerWidth / 2;
      let best = null;
      for (const card of document.querySelectorAll(".marquee .mcard")) {
        const r = card.getBoundingClientRect();
        if (r.width === 0) continue;
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (!best || d < best.d) best = { d, card };
      }
      const cta = best.card.querySelector(".mcard__cta");
      cta.setAttribute("data-test-target", "1");
      const kind = best.card.closest(".marquee__lead")
        ? "lead"
        : best.card.closest(".marquee__pad")
          ? "pad"
          : best.card.closest('.marquee__set[aria-hidden="true"]')
            ? "duplicate"
            : "real";
      return { href: new URL(cta.getAttribute("href"), location.href).href, kind };
    }, f);
    const cta = page.locator('[data-test-target="1"]');
    const box = await cta.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.mouse.down();
    const start = page.url();
    await page.mouse.up();
    await page.waitForURL((u) => u.href !== start, { timeout: 5000 }).catch(() => {});
    const landed = page.url();
    if (landed !== target.href) failures.push({ phase: f, kind: target.kind, expected: target.href, landed });
  }
  check(`${label}: a carousel card opens its page on every pass (${phases.length} phases)`, !failures.length, failures);
}

(async () => {
  const { server, base } = await serve();
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

    /* ---- the root URL -------------------------------------------------- */
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    const root = await page.evaluate(() => ({
      url: location.pathname,
      hasLanding: !!document.querySelector(".sequence"),
      bg: getComputedStyle(document.body).backgroundColor,
    }));
    check("the root URL lands on the landing page", root.hasLanding, root);

    /* ---- landing: every link and button -------------------------------- */
    const landing = urls.home;
    await page.goto(landing, { waitUntil: "networkidle" });

    await realClick(page, page.locator(".hero__actions a", { hasText: "See the work" }));
    await page.waitForTimeout(900);
    const atWork = await page.evaluate(() => {
      const r = document.getElementById("work").getBoundingClientRect();
      return Math.abs(r.top - document.querySelector(".topbar").offsetHeight) < 40;
    });
    check("landing: 'See the work' scrolls to the work", atWork);

    await page.goto(landing, { waitUntil: "networkidle" });
    await realClick(page, page.locator(".hero__actions a", { hasText: "Contact me" }));
    await page.waitForTimeout(1200);
    const atContact = await page.evaluate(() => document.getElementById("contact").getBoundingClientRect().top < innerHeight);
    check("landing: 'Contact me' scrolls to the contact row", atContact);

    for (let i = 0; i < SLUGS.length; i++) {
      await page.goto(landing, { waitUntil: "networkidle" });
      const y = await page.evaluate((i) => window.__seq.scrollYFor(i, 0.95), i);
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(250);
      // The panel lives in the pinned stage: click where it is, do not let
      // scrollIntoView move the page (that would change which panel shows).
      const cta = page.locator(`.panel[data-index="${i}"] .panel__cta`);
      const box = await cta.boundingBox();
      const start = page.url();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForURL((u) => u.href !== start, { timeout: 5000 }).catch(() => {});
      check(`landing: project ${i + 1}'s 'View full case study' opens its page`, page.url() === urls.project(SLUGS[i]), page.url());
    }

    await page.goto(landing, { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelector(".recap").scrollIntoView({ block: "center" }));
    await realClick(page, page.locator(".marquee-toggle"));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(150);
    const paused1 = await page.evaluate(() => {
      const t = document.querySelector(".marquee__track");
      const a = new DOMMatrix(getComputedStyle(t).transform).m41;
      return new Promise((r) => setTimeout(() => r(a === new DOMMatrix(getComputedStyle(t).transform).m41), 600));
    });
    await realClick(page, page.locator(".marquee-toggle"));
    await page.mouse.move(5, 5);
    const moving1 = await page.evaluate(() => {
      const t = document.querySelector(".marquee__track");
      const a = new DOMMatrix(getComputedStyle(t).transform).m41;
      return new Promise((r) => setTimeout(() => r(a !== new DOMMatrix(getComputedStyle(t).transform).m41), 600));
    });
    check("landing: the carousel's Pause button pauses, and Play resumes", paused1 && moving1, { paused1, moving1 });

    await carouselClicks(page, landing, "landing");

    /* ---- every project page ------------------------------------------- */
    for (const slug of SLUGS) {
      const url = urls.project(slug);

      await page.goto(url, { waitUntil: "networkidle" });
      const back = await clickToNavigate(page, page.locator(".topbar a", { hasText: "All work" }), (h) => !h.includes("/projects/"));
      check(`${slug}: '← All work' goes back to the landing`, back === `${urls.home}#work`, back);

      await page.goto(url, { waitUntil: "networkidle" });
      const home = await clickToNavigate(page, page.locator(".topbar a", { hasText: "Pablo A. López" }), (h) => !h.includes("/projects/"));
      check(`${slug}: the name goes to the landing`, home === urls.home, home);

      await page.goto(url, { waitUntil: "networkidle" });
      await realClick(page, page.locator(".topbar a", { hasText: "Contact me" }));
      await page.waitForTimeout(1200);
      check(
        `${slug}: 'Contact me' scrolls to the contact row`,
        await page.evaluate(() => document.getElementById("contact").getBoundingClientRect().top < innerHeight),
      );

      // The demo must be the real, working thing: every control is clicked
      // and has to change something on screen.
      await page.goto(url, { waitUntil: "networkidle" });
      const demoRoot = page.locator(".pp-demo [data-demo]");
      const hasDemo = (await demoRoot.count()) > 0;
      check(`${slug}: the demo is live, not a picture`, hasDemo && (await page.locator(".pp-demo img").count()) === 0);
      if (hasDemo) {
        await demoRoot.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        // Each control is exercised with a real click (or a real selection /
        // typing for form fields) and must change the demo. A control that was
        // already the selected one legitimately changes nothing, so anything
        // that did not change is retried once more after the other controls
        // have moved the demo on. Controls can also appear or disappear as the
        // demo changes (a button that turns into its result), so the list is
        // re-read by position and a control that has gone is skipped.
        const operate = async (c) => {
          const tag = await c.evaluate((el) => el.tagName.toLowerCase() + (el.type ? ":" + el.type : ""));
          if (tag.startsWith("select")) {
            const opts = await c.evaluate((el) => [...el.options].map((o) => o.value));
            const cur = await c.inputValue();
            const next = opts.find((o) => o !== cur);
            if (!next) return false;
            await c.selectOption(next);
          } else if (tag === "input:text" || tag === "input:search" || tag === "input") {
            await c.click();
            await c.fill("stock by store");
            await c.press("Enter");
          } else if (tag === "input:number") {
            await c.fill("7");
            await c.press("Tab");
          } else {
            // A person scrolls a control into view before clicking it; a
            // disclosure opened earlier can push the next one off-screen.
            await c.scrollIntoViewIfNeeded().catch(() => {});
            const box = await c.boundingBox();
            if (!box) return false;
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
            await page.mouse.down();
            await page.mouse.up();
          }
          return true;
        };
        const snapshot = () => demoRoot.evaluate((el) => el.innerHTML);
        const controls = demoRoot.locator(
          "button:visible, select:visible, input:visible, summary:visible, [role=button]:visible, [role=tab]:visible, [role=switch]:visible",
        );
        // Explored in rounds: controls that only appear after an action (the
        // editable quantities of a generated plan, approve / reject after a
        // request) are picked up by the next round. A control is identified
        // by its kind, its text and its position among controls like it.
        const seen = new Set();
        let changed = 0;
        let exercised = 0;
        const dead = [];
        for (let round = 0; round < 4; round++) {
          const n = await controls.count();
          let fresh = 0;
          for (let k = 0; k < n; k++) {
            const c = controls.nth(k);
            if (!(await c.isVisible().catch(() => false))) continue;
            const sig = await c
              .evaluate((el) => {
                const same = [...el.closest("[data-demo]").querySelectorAll(el.tagName)].filter(
                  (o) => (o.textContent || "").trim() === (el.textContent || "").trim(),
                );
                return `${el.tagName}|${el.type || ""}|${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}|${same.indexOf(el)}`;
              })
              .catch(() => null);
            if (!sig || seen.has(sig)) continue;
            seen.add(sig);
            fresh++;
            if (!(await c.isEnabled({ timeout: 1000 }).catch(() => false))) continue;
            const name = sig.split("|")[2] || sig.split("|")[1] || "control";
            const before = await snapshot();
            if (!(await operate(c).catch(() => false))) continue;
            exercised++;
            await page.waitForTimeout(1500);
            if ((await snapshot()) !== before) changed++;
            else dead.push(name);
          }
          if (!fresh) break;
        }
        const stillDead = [];
        for (const name of dead) {
          const again = demoRoot.locator("button:visible", { hasText: name.slice(0, 20) }).first();
          if (!(await again.count())) {
            stillDead.push(name + " (gone)");
            continue;
          }
          const before = await snapshot();
          await operate(again).catch(() => {});
          await page.waitForTimeout(1500);
          if ((await snapshot()) === before) stillDead.push(name);
          else changed++;
        }
        check(`${slug}: every demo control does something (${changed} of ${exercised} changed the demo)`, exercised > 0 && stillDead.length === 0, stillDead);
      }

      // See more: the button, the close button, a click outside, Escape.
      await page.goto(url, { waitUntil: "networkidle" });
      await realClick(page, page.locator(".pp-more__open"));
      await page.waitForTimeout(700);
      const opened = await page.evaluate(() => document.getElementById("tech").open);
      await realClick(page, page.locator(".pp-sheet__close"));
      await page.waitForTimeout(600);
      const closedByBtn = await page.evaluate(() => !document.getElementById("tech").open);
      await realClick(page, page.locator(".pp-more__open"));
      await page.waitForTimeout(700);
      await page.mouse.move(6, 450);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(600);
      const closedByOutside = await page.evaluate(() => !document.getElementById("tech").open);
      await realClick(page, page.locator(".pp-more__open"));
      await page.waitForTimeout(700);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      const closedByEsc = await page.evaluate(() => !document.getElementById("tech").open);
      check(`${slug}: 'See more' opens; close, outside click and Escape all close it`, opened && closedByBtn && closedByOutside && closedByEsc, {
        opened,
        closedByBtn,
        closedByOutside,
        closedByEsc,
      });

      // Mouse-wheel inside the open panel scrolls the panel, not the page.
      await realClick(page, page.locator(".pp-more__open"));
      await page.waitForTimeout(700);
      const pageY = await page.evaluate(() => window.scrollY);
      const sheetBox = await page.locator(".pp-sheet__body").boundingBox();
      await page.mouse.move(sheetBox.x + sheetBox.width / 2, sheetBox.y + sheetBox.height / 2);
      for (let k = 0; k < 6; k++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(40);
      }
      const scroll = await page.evaluate(() => ({ sheet: document.querySelector(".pp-sheet__body").scrollTop, page: window.scrollY }));
      check(`${slug}: the wheel scrolls the panel, not the page behind`, scroll.sheet > 100 && scroll.page === pageY, scroll);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);

      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.querySelector(".recap").scrollIntoView({ block: "center" }));
      await realClick(page, page.locator(".marquee-toggle"));
      await page.mouse.move(5, 5);
      const paused = await page.evaluate(() => {
        const t = document.querySelector(".marquee__track");
        const a = new DOMMatrix(getComputedStyle(t).transform).m41;
        return new Promise((r) => setTimeout(() => r(a === new DOMMatrix(getComputedStyle(t).transform).m41), 600));
      });
      check(`${slug}: the carousel's Pause button works`, paused);

      await carouselClicks(page, url, slug);
    }
    await ctx.close();

    /* ---- a phone: taps ------------------------------------------------- */
    const pctx = await browser.newContext({ ...devices["iPhone 13"] });
    const phone = await pctx.newPage();
    watch(phone, "phone");
    await phone.goto(urls.project("rag"), { waitUntil: "networkidle" });
    await phone.locator(".pp-more__open").tap();
    await phone.waitForTimeout(700);
    const pOpen = await phone.evaluate(() => document.getElementById("tech").open);
    await phone.locator(".pp-sheet__close").tap();
    await phone.waitForTimeout(600);
    const pClosed = await phone.evaluate(() => !document.getElementById("tech").open);
    check("phone: 'See more' opens and closes by tap", pOpen && pClosed, { pOpen, pClosed });
    const firstCard = phone.locator(".marquee__set:not([aria-hidden]) > .mcard .mcard__cta").first();
    await firstCard.scrollIntoViewIfNeeded();
    const expect = await firstCard.evaluate((a) => a.href);
    await firstCard.tap();
    await phone.waitForURL((u) => u.href === expect, { timeout: 5000 }).catch(() => {});
    check("phone: a card's 'View full case study' opens its page by tap", phone.url() === expect, phone.url());

    // Nothing wider than the screen at any point of the arrival (the opening
    // slides in from the side), and nothing inside a demo cut off by its frame.
    for (const slug of SLUGS) {
      await phone.goto(urls.project(slug), { waitUntil: "commit" });
      let worst = 0;
      for (let t = 0; t < 12; t++) {
        await phone.waitForTimeout(200);
        worst = Math.max(worst, await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0));
      }
      await phone.waitForLoadState("networkidle");
      const clipped = await phone.evaluate(() => {
        const sec = document.querySelector('[data-demo] section[aria-label$="interactive demo"]');
        if (!sec) return ["no demo"];
        const frame = sec.firstElementChild;
        const fr = frame.getBoundingClientRect();
        const out = [];
        for (const el of frame.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || el.closest(".sr-only")) continue;
          let sc = el.parentElement;
          let scrolls = false;
          while (sc && sc !== frame) {
            if (/auto|scroll/.test(getComputedStyle(sc).overflowX)) {
              scrolls = true;
              break;
            }
            sc = sc.parentElement;
          }
          if (!scrolls && r.right > fr.right + 0.5) out.push(el.tagName + " +" + Math.round(r.right - fr.right) + "px");
        }
        return out.slice(0, 4);
      });
      check(`phone: ${slug} never overflows the screen, and its demo is not cut off`, worst <= 0 && !clipped.length, { worst, clipped });
    }
    await pctx.close();

    check("no console errors, page errors or failed requests anywhere", problems.length === 0, problems.slice(0, 6));
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
