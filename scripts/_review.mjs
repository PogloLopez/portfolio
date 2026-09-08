import { chromium } from 'playwright';

const SHOTS = 'C:/Users/ASUS/.claude/jobs/d4fa21dd/tmp/shots/';

const targets = [
  ['pf-home', 'http://127.0.0.1:3000/'],
  ['pf-about', 'http://127.0.0.1:3000/about'],
  ['pf-forecast', 'http://127.0.0.1:3000/projects/forecast'],
  ['pf-market', 'http://127.0.0.1:3000/projects/market-prices'],
  ['pf-rag', 'http://127.0.0.1:3000/projects/rag'],
  ['pf-ops', 'http://127.0.0.1:3000/projects/operations-platform'],
  ['pf-cortana', 'http://127.0.0.1:3000/projects/cortana'],
  ['landing', 'http://127.0.0.1:4173/'],
];

const report = {};

const browser = await chromium.launch();

for (const [name, url] of targets) {
  for (const [wname, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    const failed = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
    page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 300)));
    page.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure()?.errorText)));
    page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) {
      report[name + '-' + wname] = { error: String(e).slice(0, 200) };
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(2500);

    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth > window.innerWidth ? de.scrollWidth - window.innerWidth : 0;
      // find offending elements
      const offenders = [];
      if (overflow > 0) {
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 2 && r.width > 20) {
            offenders.push(el.tagName + '.' + (el.className && el.className.toString ? el.className.toString().slice(0,80) : '') + ' right=' + Math.round(r.right) + ' w=' + Math.round(r.width));
          }
        });
      }
      return {
        overflow,
        offenders: offenders.slice(0, 12),
        scrollHeight: de.scrollHeight,
        title: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(e => e.innerText).slice(0, 5),
      };
    });
    report[name + '-' + wname] = { metrics, errors: [...new Set(errors)].slice(0, 15), failed: [...new Set(failed)].slice(0, 15) };

    await page.screenshot({ path: SHOTS + name + '-' + wname + '-top.png' });
    // scroll depths
    const sh = metrics.scrollHeight;
    const stops = [0.3, 0.6, 0.9];
    let i = 1;
    for (const s of stops) {
      await page.evaluate(y => window.scrollTo(0, y), Math.round(sh * s));
      await page.waitForTimeout(900);
      await page.screenshot({ path: SHOTS + name + '-' + wname + '-s' + i + '.png' });
      i++;
    }
    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
