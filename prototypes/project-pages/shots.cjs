/**
 * Screenshots of every project page, for review: the opening, the story and
 * demo, the "See more" panel open, and the page on a phone.
 *
 *   node shots.cjs [outDir]
 *
 * Serves the whole prototypes/ folder, since the pages borrow the landing's
 * styles and scripts from ../landing-showcase.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require(path.resolve(__dirname, "../../node_modules/playwright"));

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(__dirname, ".shots"));
const SLUGS = ["forecast", "market-prices", "rag", "operations-platform", "cortana"];
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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await serve();
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
        await page.goto(`${url}project-pages/${slug}.html`, { waitUntil: "networkidle" });
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
    server.close();
  }
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
