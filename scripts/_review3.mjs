import { chromium } from 'playwright';
const SHOTS = 'C:/Users/ASUS/.claude/jobs/d4fa21dd/tmp/shots/';
const browser = await chromium.launch();
const out = {};

function lum(c) { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

const pages = [
  ['home', 'http://127.0.0.1:3000/'],
  ['about', 'http://127.0.0.1:3000/about'],
  ['forecast', 'http://127.0.0.1:3000/projects/forecast'],
  ['landing', 'http://127.0.0.1:4173/'],
];

for (const [name, url] of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // all links
  const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim().slice(0, 45), href: a.getAttribute('href'), target: a.target })));
  // contrast sample of small text
  const contrast = await page.evaluate(() => {
    const parse = s => { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
    function bg(el) { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; const p = parse(c); if (p && !/rgba\(.*,\s*0\)/.test(c)) { const a = c.match(/[\d.]+/g); if (!a[3] || Number(a[3]) > 0.5) return p; } e = e.parentElement; } return [10, 10, 14]; }
    const res = [];
    document.querySelectorAll('p,span,li,small,div,a,figcaption,td,th').forEach(el => {
      if (!el.childNodes.length) return;
      const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 3);
      if (!hasText) return;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (size > 17) return;
      const r = el.getBoundingClientRect();
      if (r.width < 5 || r.height < 5) return;
      res.push({ t: el.innerText.trim().slice(0, 50), size, color: cs.color, bg: bg(el), cls: (el.className && el.className.toString ? el.className.toString().slice(0, 60) : ''), y: Math.round(r.top + window.scrollY) });
    });
    return res;
  });
  const lowc = [];
  const seen = new Set();
  for (const c of contrast) {
    const fg = c.color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const a = c.color.match(/[\d.]+/g)[3];
    let f = fg;
    if (a && Number(a) < 1) { const al = Number(a); f = fg.map((v, i) => v * al + c.bg[i] * (1 - al)); }
    const L1 = lum(f), L2 = lum(c.bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const need = c.size >= 18.66 ? 3 : 4.5;
    if (ratio < need) { const k = c.t.slice(0, 25) + c.color; if (!seen.has(k)) { seen.add(k); lowc.push({ ...c, ratio: ratio.toFixed(2), need }); } }
  }
  out[name] = { linkCount: links.length, badLinks: links.filter(l => !l.href || l.href === '#'), links: links, lowContrast: lowc.slice(0, 25) };

  // focus visibility
  const foc = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(180);
    foc.push(await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { tag: e.tagName, txt: (e.innerText || '').trim().slice(0, 30), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow.slice(0, 60) }; }));
  }
  out[name].focus = foc;
  await page.screenshot({ path: SHOTS + name + '-focus.png' });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
