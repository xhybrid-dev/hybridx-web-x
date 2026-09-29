#!/usr/bin/env node
/*
 * Brand and layout audit for any URL, so the Next.js build can be held to the same rules as the
 * reference page. Uses playwright-core with a Chromium you already have.
 *
 *   CHROMIUM_PATH=/path/to/chrome node scripts/audit-url.js http://localhost:3000/
 *   node scripts/audit-url.js http://localhost:3000/ --widths 1440,820,390
 *
 * Checks, at each width: no visible text under 12px; no horizontal scroll; nothing poking outside the
 * viewport; only Inter 400/500/600/700 and Space Grotesk 500/700; only the brand palette for text,
 * backgrounds and borders. Exit code 1 if anything fails.
 *
 * The palette below is the reference page's. If the real site adds a token (a hover tint, say), add it
 * to PALETTE on purpose. The point of the check is that nothing new arrives by accident.
 */
'use strict';
const { chromium } = require('playwright-core');

const url = process.argv[2];
if (!url) { console.error('Usage: node scripts/audit-url.js <url> [--widths 1440,820,390]'); process.exit(2); }
const wi = process.argv.indexOf('--widths');
const widths = (wi > -1 ? process.argv[wi + 1] : '1440,820,390').split(',').map(Number);

const PALETTE = new Set(['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(250, 219, 92)', 'rgb(26, 26, 26)', 'rgb(51, 51, 51)', 'rgb(179, 179, 179)', 'rgb(77, 77, 77)', 'rgb(217, 217, 217)', 'rgb(128, 128, 128)', 'rgba(0, 0, 0, 0)']);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let failures = 0;
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: w > 1000 ? 900 : 844 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const small = [], fam = new Set(), colors = new Set(), over = [];
      const vw = document.documentElement.clientWidth;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement; if (el.closest('script,style,noscript,svg')) continue;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (el.offsetParent === null && cs.position !== 'fixed') continue;
        if (parseFloat(cs.fontSize) < 12) small.push(el.tagName + ' ' + cs.fontSize + ' "' + n.textContent.trim().slice(0, 30) + '"');
        fam.add(cs.fontFamily.split(',')[0].replace(/['"]/g, '') + ' ' + cs.fontWeight);
        colors.add(cs.color);
      }
      document.querySelectorAll('body *').forEach((el) => {
        if (el.closest('svg,script,style,noscript')) return;
        const cs = getComputedStyle(el); if (cs.display === 'none') return;
        colors.add(cs.backgroundColor);
        if (parseFloat(cs.borderTopWidth) > 0) colors.add(cs.borderTopColor);
        const rc = el.getBoundingClientRect();
        if (rc.width && (rc.right > vw + 1 || rc.left < -1) && !el.closest('svg,[aria-hidden=true]')) {
          let a = el.parentElement, clipped = false;
          while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if ((o === 'hidden' || o === 'auto') && a.getBoundingClientRect().right <= vw + 1) { clipped = true; break; } a = a.parentElement; }
          if (!clipped) over.push(el.tagName + '.' + (typeof el.className === 'string' ? el.className.slice(0, 30) : ''));
        }
      });
      return { small, fam: [...fam], colors: [...colors], over: over.slice(0, 10), sw: document.documentElement.scrollWidth, vw };
    });
    const badFam = r.fam.filter((f) => !/^(Inter (400|500|600|700)|Space Grotesk (500|700))$/.test(f));
    const offPal = [...new Set(r.colors.filter((c) => !PALETTE.has(c)))];
    const checks = [
      [r.small.length === 0, 'no text under 12px', r.small.slice(0, 5)],
      [r.sw <= r.vw, 'no horizontal scroll (' + r.sw + ' <= ' + r.vw + ')'],
      [r.over.length === 0, 'nothing pokes outside the viewport', r.over],
      [badFam.length === 0, 'only brand fonts and loaded weights', badFam],
      [offPal.length === 0, 'colours inside the brand palette', offPal]
    ];
    console.log('\n' + w + 'px');
    for (const [ok, msg, extra] of checks) { if (!ok) failures++; console.log((ok ? '  ok:   ' : '  FAIL: ') + msg + (!ok && extra ? ' ' + JSON.stringify(extra) : '')); }
    await page.close();
  }
  await browser.close();
  console.log('\n' + (failures ? failures + ' FAILURES' : 'ALL CHECKS PASSED'));
  process.exit(failures ? 1 : 0);
})();
