import { chromium } from 'playwright';
const SHOTS = 'C:/Users/ASUS/.claude/jobs/d4fa21dd/tmp/shots/';
const targets = [['pf-cortana', 'http://127.0.0.1:3000/projects/cortana']];
const report = {};
const browser = await chromium.launch();
for (const [name, url] of targets) {
  for (const [wname, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 200)));
    page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, sh: document.documentElement.scrollHeight, title: document.title, h1: Array.from(document.querySelectorAll('h1')).map(e => e.innerText) }));
    report[name + wname] = { m, errors: [...new Set(errors)], failed: [...new Set(failed)] };
    await page.screenshot({ path: SHOTS + name + '-' + wname + '-top.png' });
    let i = 1;
    for (const s of [0.3, 0.6, 0.9]) { await page.evaluate(y => window.scrollTo(0, y), Math.round(m.sh * s)); await page.waitForTimeout(900); await page.screenshot({ path: SHOTS + name + '-' + wname + '-s' + (i++) + '.png' }); }
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
