import { chromium } from "playwright";
import fs from "node:fs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const out = process.env.OUT ?? "C:/Users/ASUS/.claude/jobs/d4fa21dd/tmp/shots";
fs.mkdirSync(out, { recursive: true });

const pages = (process.env.PAGES ?? "/,/about,/projects/forecast,/projects/cortana").split(",");
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const full = process.env.FULL !== "0";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

for (const p of pages) {
  const url = base + p;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
  const name = (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "-")) + `-${width}`;
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  console.log("shot", name);
}

if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
else console.log("no console errors");

await browser.close();
