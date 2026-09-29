#!/usr/bin/env node
/*
 * Browser checks for the Next.js build of the plan finder (docs/08 sections A, B and F),
 * run against a live dev or production server. The reference's own test.js checks the
 * plain-HTML reference; this checks the real site.
 *
 *   PLAN_FINDER_MODE=on npm run dev          (from the repo root; the entry must be on for every load)
 *   cd handover/entry-funnel && npm install
 *   CHROMIUM_PATH=/path/to/chrome node scripts/check-next.js http://localhost:3000
 *
 * The brand audit is scoped to what the plan finder adds (#hx-entry, #hx-start, the skip
 * strip, the open dialog and the consent banner), because the existing homepage predates
 * the brand rules and must not be changed (docs/03). Exit code 1 if anything fails.
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');
// Every batch the real tracker sends must pass the collector untouched. The reference
// collector is identical to src/lib/plan-finder/collect-core.ts (a parity test holds them
// together); it is used here because this script runs in plain Node.
const { validateBatch } = require('../server/collect-core.js');
const SCHEMA = require(path.join(__dirname, '../../../src/lib/plan-finder/events.schema.json'));

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
let failures = 0;
const ok = (cond, msg, extra) => {
  if (!cond) {
    failures++;
    console.log('  FAIL:', msg, extra !== undefined ? JSON.stringify(extra) : '');
  } else console.log('  ok:', msg);
};

const PALETTE = new Set(['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(250, 219, 92)', 'rgb(26, 26, 26)', 'rgb(51, 51, 51)', 'rgb(179, 179, 179)', 'rgb(77, 77, 77)', 'rgb(217, 217, 217)', 'rgb(128, 128, 128)', 'rgba(0, 0, 0, 0)']);
// Loaded on this site: Inter 400/600/700 and Space Grotesk 500/700 (docs/07).
const FONTS = /^(Inter (400|600|700)|Space Grotesk (500|700))$/;
const SCOPE = '#hx-entry:not([hidden]), #hx-start, #hx-skipwhy-slot, dialog[open], [data-consent-banner]';

const CONSENT = (analytics) => `localStorage.setItem('hybridx-consent', JSON.stringify({ v: 1, analytics: ${analytics}, at: '2026-09-29' }))`;

async function newPage(browser, w, h, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    reducedMotion: opts.reduce ? 'reduce' : 'no-preference',
    javaScriptEnabled: opts.js !== false,
  });
  // Decide the consent banner up front unless a check is about the banner.
  if (opts.consent !== undefined) await ctx.addInitScript(CONSENT(opts.consent));
  const page = await ctx.newPage();
  // Stand-ins for the two endpoints, so the checks need no Firestore or mail transport.
  // A check that wants to see what was sent registers its own handler, which wins.
  await page.route('**/api/collect', (r) => r.fulfill({ status: 204 }));
  await page.route('**/api/talk', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message.split('\n')[0]));
  return page;
}

async function audit(page, label) {
  await page.waitForTimeout(250); // let hover and selection colour transitions finish
  const r = await page.evaluate(({ scope }) => {
    const roots = Array.from(document.querySelectorAll(scope));
    const small = [], fam = new Set(), colors = new Set(), over = [];
    const vw = document.documentElement.clientWidth;
    const family = (f) => f.split(',')[0].replace(/['"]/g, '').replace(/^__(.+?)_[0-9a-f]+$/, '$1').trim();
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (el.closest('script,style,noscript,svg')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (el.offsetParent === null && cs.position !== 'fixed' && !el.closest('dialog[open]')) continue;
        if (parseFloat(cs.fontSize) < 12) small.push([el.tagName, cs.fontSize, n.textContent.trim().slice(0, 30)]);
        fam.add(family(cs.fontFamily) + ' ' + cs.fontWeight);
        colors.add(cs.color);
      }
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (el.closest('svg,script,style,noscript')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        colors.add(cs.backgroundColor);
        if (parseFloat(cs.borderTopWidth) > 0) colors.add(cs.borderTopColor);
        const rc = el.getBoundingClientRect();
        if (rc.width && (rc.right > vw + 1 || rc.left < -1) && !el.closest('[aria-hidden=true]')) {
          let a = el.parentElement, clipped = false;
          while (a && a !== document.body) {
            const o = getComputedStyle(a).overflowX;
            if ((o === 'hidden' || o === 'auto') && a.getBoundingClientRect().right <= vw + 1) { clipped = true; break; }
            a = a.parentElement;
          }
          if (!clipped) over.push([el.tagName, Math.round(rc.left), Math.round(rc.right), (el.textContent || '').trim().slice(0, 24)]);
        }
      }
    }
    return { roots: roots.length, small, fam: [...fam], colors: [...colors], over: over.slice(0, 8), sw: document.documentElement.scrollWidth, vw };
  }, { scope: SCOPE });
  ok(r.roots > 0, label + ': something to audit');
  ok(r.small.length === 0, label + ': no text under 12px', r.small.slice(0, 5));
  ok(r.sw <= r.vw, label + ': no horizontal scroll (' + r.sw + ' <= ' + r.vw + ')');
  ok(r.over.length === 0, label + ': nothing pokes outside the viewport', r.over);
  const badFam = r.fam.filter((f) => !FONTS.test(f));
  ok(badFam.length === 0, label + ': only brand fonts at loaded weights', badFam);
  const offPal = [...new Set(r.colors.filter((c) => !PALETTE.has(c)))];
  ok(offPal.length === 0, label + ': colours inside the brand palette', offPal);
}

const title = (page) => page.locator('#f-title').innerText().then((t) => t.trim());
const opt = (page, k, v) => page.locator(`dialog [data-k="${k}"][data-v="${v}"]`);

async function toResult(page, a) {
  await page.locator(`#hx-entry [data-goal="${a.goal}"], #hx-start [data-goal="${a.goal}"]`).first().click();
  await page.waitForSelector('dialog[open] #f-title');
  await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.startsWith('Where are you starting'));
  await opt(page, 'level', a.level).click();
  await opt(page, 'place', a.place).click();
  await page.click('#f-next');
  for (const o of a.obst) await opt(page, 'obst', o).click();
  await page.click('#f-next');
  await opt(page, 'format', a.format).click();
  await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.startsWith('Anything else'));
  if (a.race) await page.fill('#race', a.race);
  if (a.note) await page.fill('#note', a.note);
  await page.click('#f-next');
  await page.waitForSelector('[data-result-title]');
}

const ROUTES = [
  { goal: 'first', level: 'new', place: 'home', obst: ['run'], format: 'paper', primary: 'Train for Hyrox at Home', href: 'https://amzn.to/445PMV1', secs: ['12-Week Running Plan for Hyrox', 'VDOT Calculator'] },
  { goal: 'faster', level: 'raced', place: 'gym', obst: ['plateau'], format: 'phone', primary: 'The HybridX app', href: 'https://app.hybridx.club', secs: ['Race Time Predictor', 'Elite Hyrox Training Plan'] },
  { goal: 'ultra', level: 'regular', place: 'both', obst: ['time'], format: 'free', primary: 'VDOT Calculator', href: '/vdot', secs: ['Free 12-week Hyrox plan', 'ULTRA STRENGTH'] },
  { goal: 'xenom', level: 'compete', place: 'gym', obst: ['options'], format: 'tools', primary: 'Build a Bigger Engine', href: '/build-a-bigger-engine', secs: [] },
  { goal: 'athx', level: 'new', place: 'home', obst: [], format: 'paper', primary: 'ATHX 2027 training book', href: 'https://link.amazon/B073SX15W', secs: ['Free 12-week Hyrox plan', 'The HybridX app'] },
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });

  console.log('\nB. Entry above the homepage');
  {
    const page = await newPage(browser, 390, 844, { consent: false });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    ok((await page.locator('h1').count()) === 1, 'B2 exactly one <h1> on /');
    ok((await page.locator('#hx-entry h2#hx-entry-h').count()) === 1, 'entry headline is an <h2>');
    const skip = page.locator('a[data-skip="bar"]');
    ok((await skip.getAttribute('href')) === '#hx-home', 'B3 skip link is an anchor to #hx-home');
    const sb = await skip.boundingBox();
    ok(sb && sb.y + sb.height <= 844, 'B3 skip link inside the first screen at 390 x 844', sb);
    const geo = await page.evaluate(() => ({
      entry: document.getElementById('hx-entry').getBoundingClientRect().height,
      home: document.getElementById('hx-home').getBoundingClientRect().top + window.scrollY,
    }));
    ok(geo.entry <= 844 * 1.15, 'B10 phone entry about one screen tall (' + Math.round(geo.entry) + 'px)');
    ok(geo.home <= 844 * 1.2, 'B10 homepage starts within 1.2 screens (' + Math.round(geo.home) + 'px)');
    await page.mouse.wheel(0, 400);
    await skip.click();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({
      hidden: document.getElementById('hx-entry').hidden,
      y: window.scrollY,
      focus: document.activeElement && document.activeElement.id,
      stored: sessionStorage.getItem('hx_entry'),
      strip: document.getElementById('hx-skipwhy-slot').children.length,
    }));
    ok(after.hidden, 'B4 entry hidden after skip');
    ok(after.y === 0, 'B4 page at the top after skip', after.y);
    ok(after.focus === 'hx-home', 'B4 focus on #hx-home after skip', after.focus);
    ok(after.stored === 'skipped', 'B4 skip remembered for the tab session');
    ok(after.strip === 0, 'B4 no "why" strip while tracking is off');
    await page.reload({ waitUntil: 'networkidle' });
    ok(await page.evaluate(() => document.getElementById('hx-entry').hidden), 'B5 entry stays hidden after a reload in the same tab');
    ok(page.errors.length === 0, 'no page errors', page.errors);
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: false });
    await page.goto(base + '/?entry=off', { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => ({ hidden: document.getElementById('hx-entry').hidden, stored: sessionStorage.getItem('hx_entry') }));
    ok(r.hidden && r.stored === null, 'B6 /?entry=off hides the entry and stores nothing', r);
    await page.context().close();
  }
  {
    // Layout shift while the page loads and hydrates.
    const page = await newPage(browser, 1440, 900, { consent: false });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const cls = await page.evaluate(() => window.__cls);
    ok(cls < 0.01, 'B9 no layout shift from the entry while loading (CLS ' + cls.toFixed(4) + ')');
    await page.context().close();
  }
  {
    const page = await newPage(browser, 390, 844, { js: false });
    await page.goto(base + '/', { waitUntil: 'load' });
    ok(await page.locator('#hx-entry').isVisible(), 'A12 entry shows with JavaScript off');
    ok(!(await page.locator('#hx-entry [data-goal]').first().isVisible()), 'A12 tiles hidden with JavaScript off');
    ok(await page.locator('#hx-entry noscript').count() > 0 && (await page.content()).includes('The plan finder needs JavaScript'), 'A12 plain links offered with JavaScript off');
    await page.locator('a[data-skip="bar"]').click();
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ hash: location.hash, top: document.getElementById('hx-home').getBoundingClientRect().top }));
    ok(r.hash === '#hx-home' && r.top < 200, 'B3 skip link works with JavaScript off', r);
    await page.context().close();
  }

  console.log('\nA. Funnel behaviour');
  {
    const page = await newPage(browser, 1440, 900, { consent: false });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    for (const r of ROUTES) {
      // Answers persist while the page is open, by design, so each route starts from a fresh load.
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      await toResult(page, r);
      const primary = (await page.locator('[data-result-title]').innerText()).trim();
      const href = await page.locator('a[data-slot="primary"]').getAttribute('href');
      const secs = await page.locator('[data-extra-title]').allInnerTexts();
      ok(primary === r.primary && href === r.href && JSON.stringify(secs) === JSON.stringify(r.secs), `route ${r.goal}/${r.level}/${r.place}/${r.obst.join('+') || '-'}/${r.format}`, { primary, href, secs });
    }
    ok(page.errors.length === 0, 'no page errors on the routes', page.errors);
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: false, reduce: false });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    const tile = page.locator('#hx-entry [data-goal="first"]');
    await tile.focus();
    await tile.press('Enter');
    await page.waitForSelector('dialog[open]');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'f-title'), 'A11 focus moves to the question heading');
    ok((await title(page)).startsWith('Where are you starting'), 'a tile opens the dialog at question 2');
    ok((await page.locator('#f-next').getAttribute('aria-disabled')) === 'true', 'A3 Continue disabled until both parts are answered');
    ok((await page.locator('dialog').innerText()).includes('Choose one option in each group to continue'), 'A3 visible hint while Continue is disabled');
    // Tab stays inside the open dialog. Past the last control, a native modal dialog hands
    // focus to the browser's own UI (document.body here) and then back: never to the page.
    let escaped = null;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => (document.activeElement === document.body || document.activeElement.closest('dialog') ? null : document.activeElement.outerHTML.slice(0, 80)));
      if (where) { escaped = where; break; }
    }
    ok(!escaped, 'A11 tab focus never reaches the page behind the open dialog', escaped);
    ok(await page.evaluate(() => !!document.activeElement.closest('dialog') || document.activeElement === document.body), 'A11 focus still in the dialog after 40 tabs');
    await opt(page, 'level', 'regular').click();
    await opt(page, 'place', 'gym').click();
    await page.click('#f-next');
    await opt(page, 'obst', 'run').click();
    await opt(page, 'obst', 'none').click();
    const afterNone = await page.locator('dialog [data-k="obst"][aria-pressed="true"]').evaluateAll((b) => b.map((x) => x.dataset.v));
    ok(JSON.stringify(afterNone) === '["none"]', 'A4 "Nothing yet" clears the other obstacles', afterNone);
    await opt(page, 'obst', 'structure').click();
    const afterPick = await page.locator('dialog [data-k="obst"][aria-pressed="true"]').evaluateAll((b) => b.map((x) => x.dataset.v));
    ok(JSON.stringify(afterPick) === '["structure"]', 'A4 choosing an obstacle clears "Nothing yet"', afterPick);
    await page.click('#f-next');
    await opt(page, 'format', 'phone').click();
    await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.startsWith('Anything else'));
    ok(true, 'A3 format auto-advances to question 5');
    const d = new Date(); d.setDate(d.getDate() + 70);
    const iso = d.toISOString().slice(0, 10);
    await page.fill('#race', iso);
    await page.fill('#note', 'Race in Leeds, email me at a@b.co');
    ok((await page.locator('#f-privacy').innerText()).includes('Nothing you type here is sent anywhere'), 'E5 step-5 privacy line says nothing is sent while tracking is off');
    await page.click('#f-next');
    await page.waitForSelector('[data-result-title]');
    const why = await page.locator('dialog').innerText();
    ok(/You have 10 weeks until your race/.test(why) && why.includes('Race in 10 weeks'), 'A6 race date becomes weeks in the reason line and a chip');
    ok(/^#plan=first\.regular\.gym\.structure\.phone\.\d{4}-\d{2}-\d{2}$/.test(await page.evaluate(() => location.hash)), 'A8 the result has a shareable #plan= link');
    ok(!(await page.locator('dialog').textContent()).includes('Did this fit'), 'feedback question hidden while tracking is off');
    await page.getByRole('button', { name: 'Change my answers' }).click();
    ok((await title(page)).startsWith('What are you training for'), 'A7 Change my answers returns to question 1');
    ok((await opt(page, 'goal', 'first').getAttribute('aria-pressed')) === 'true', 'A7 earlier answers stay selected');
    const stations = await page.locator('dialog [aria-label^="Station "]').evaluateAll((b) => b.map((x) => !x.disabled));
    ok(JSON.stringify(stations) === '[false,true,true,true,true]', 'A7 station strip jumps only to answered stations', stations);
    await page.locator('dialog [aria-label^="Station 5"]').click();
    await page.click('#f-next');
    await page.waitForSelector('[data-result-title]');
    await page.getByRole('button', { name: 'Talk to us directly' }).click();
    ok((await page.inputValue('#t-goal')) === 'My first Hyrox' && (await page.inputValue('#t-msg')).startsWith('Race in Leeds'), 'A9 talk form pre-fills the goal and the note');
    await page.fill('#t-goal', '');
    await page.getByRole('button', { name: /Send message/ }).click();
    ok(await page.evaluate(() => document.activeElement.id === 't-name'), 'A9 focus jumps to the first error');
    ok((await page.locator('#t-name').getAttribute('aria-describedby')) === 't-name-e', 'A9 errors linked with aria-describedby');
    await page.fill('#t-name', 'Sam');
    await page.fill('#t-email', 'sam@example.com');
    await page.fill('#t-goal', 'First Hyrox');
    await page.getByRole('button', { name: /Send message/ }).click();
    await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.includes('with us'));
    ok(true, 'A9 a sent message is confirmed only after the endpoint accepts it');
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => !location.hash), 'A8 hash cleared when the dialog closes');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.dataset.goal === 'first'), 'A11 focus returns to the trigger');
    ok(page.errors.length === 0, 'no page errors', page.errors);
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: false });
    await page.goto(base + '/#plan=faster.raced.gym.plateau.phone.-', { waitUntil: 'networkidle' });
    await page.waitForSelector('dialog[open] [data-result-title]');
    ok((await page.locator('[data-result-title]').innerText()).trim() === 'The HybridX app', 'A8 a shared #plan= link restores the result');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => !document.querySelector('dialog[open]') && !location.hash), 'A11 Escape closes and the hash is cleared');
    await page.goto(base + '/#plan=nope.raced.gym.-.phone.-', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    ok((await page.locator('dialog[open]').count()) === 0, 'A8 an invalid #plan= link is ignored');
    await page.context().close();
  }
  {
    const page = await newPage(browser, 390, 844, { consent: false });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.locator('#hx-entry [data-goal="hybrid"]').click();
    await page.waitForSelector('dialog[open]');
    await page.goBack();
    await page.waitForTimeout(400);
    ok((await page.locator('dialog[open]').count()) === 0 && page.url().startsWith(base + '/') && !/about:blank/.test(page.url()), 'B12 Back closes the dialog instead of leaving the page', page.url());
    await page.locator('#hx-entry [data-goal="hybrid"]').click();
    await page.waitForSelector('dialog[open]');
    await page.locator('dialog [data-skip="dialog"]').click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ open: !!document.querySelector('dialog[open]'), hidden: document.getElementById('hx-entry').hidden, focus: document.activeElement.id, stored: sessionStorage.getItem('hx_entry') }));
    ok(!r.open && r.hidden && r.focus === 'hx-home' && r.stored === 'skipped', 'B7 skip from the dialog closes it and lands on the homepage', r);
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: false });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await toResult(page, ROUTES[0]);
    await page.locator('dialog').getByRole('button', { name: /Continue to the homepage/ }).click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ hidden: document.getElementById('hx-entry').hidden, stored: sessionStorage.getItem('hx_entry'), strip: document.getElementById('hx-skipwhy-slot').children.length }));
    ok(r.hidden && r.stored === 'done' && r.strip === 0, 'B7 Continue to the homepage is remembered as done, not a skip', r);
    await page.context().close();
  }

  console.log('\nB11. /start');
  {
    const page = await newPage(browser, 1440, 900, { consent: false });
    await page.goto(base + '/start?goal=ultra&utm_source=guide', { waitUntil: 'networkidle' });
    ok((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'B11 /start is noindex');
    ok((await page.locator('link[rel="canonical"]').count()) === 0, 'B11 /start has no canonical');
    ok((await page.locator('h1').count()) === 1 && (await page.locator('#hx-start h1').count()) === 1, '/start has its own single <h1>');
    await page.waitForSelector('dialog[open]');
    ok((await title(page)).startsWith('Where are you starting') && (await opt(page, 'goal', 'ultra').count()) === 0, 'B11 ?goal= opens at question 2');
    ok((await page.locator('dialog [data-skip]').count()) === 0, 'no skip control on /start');
    await page.context().close();
  }

  console.log('\nC. Tracking');
  // Capture what the tracker and the talk form send, without a real Firestore behind them.
  async function captured(page, { talkStatus = 200 } = {}) {
    const batches = [], talks = [];
    await page.route('**/api/collect', async (r) => { batches.push(r.request().postData() || ''); await r.fulfill({ status: 204 }); });
    await page.route('**/api/talk', async (r) => { talks.push(r.request().postData() || ''); await r.fulfill({ status: talkStatus, contentType: 'application/json', body: JSON.stringify({ ok: talkStatus === 200 }) }); });
    return { batches, talks };
  }
  const events = (batches) => batches.flatMap((b) => JSON.parse(b).events);
  const flush = (page) => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))).then(() => page.waitForTimeout(300));

  for (const [label, opts] of [
    ['with no consent choice', {}],
    ['after rejecting in the banner', { consent: false }],
    ['with Global Privacy Control, even after accepting', { consent: true, gpc: true }],
    ['with Do Not Track, even after accepting', { consent: true, dnt: true }],
  ]) {
    const page = await newPage(browser, 1440, 900, opts.consent === undefined ? {} : { consent: opts.consent });
    if (opts.gpc) await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
    if (opts.dnt) await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
    const cap = await captured(page);
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await toResult(page, ROUTES[0]);
    await page.getByRole('button', { name: 'Change my answers' }).click();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(500);
    ok(cap.batches.length === 0, 'C6 zero requests to the collector ' + label, cap.batches.length);
    ok((await page.locator('[data-privacy-tick]').innerText()) === 'Answers stay on your device', 'E5 tick says answers stay on the device ' + label);
    await page.context().close();
  }

  {
    const page = await newPage(browser, 1440, 900, { consent: true });
    const cap = await captured(page);
    await page.goto(base + '/?utm_source=Instagram&utm_campaign=spring', { waitUntil: 'networkidle' });
    ok((await page.locator('[data-privacy-tick]').innerText()) === 'Answers saved without your name', 'E5 tick says answers are saved once tracking is on');
    await page.mouse.wheel(0, 300);
    await toResult(page, { ...ROUTES[0], race: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10), note: 'Leeds in March, email sam@example.com, call 07700 900123, see www.mysite.com' });
    ok((await page.locator('dialog').textContent()).includes('Did this fit what you were after?'), 'feedback question shown when tracking is on');
    await page.getByRole('button', { name: 'Partly' }).click();
    await page.getByRole('button', { name: 'The price' }).click();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await page.locator('a[data-slot="secondary"]').first().click({ modifiers: ['Control'] });
    await page.getByRole('button', { name: 'Talk to us directly' }).click();
    await page.fill('#t-name', 'Sam Visitor');
    await page.fill('#t-email', 'sam@example.com');
    await page.getByRole('button', { name: /Send message/ }).click();
    await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.includes('with us'));
    ok(true, 'A9 with an endpoint the form says the message is with us');
    await page.getByRole('button', { name: /Continue to the homepage/ }).click();
    await page.waitForTimeout(300);
    for (let y = 0; y < 30; y++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(40); }
    await page.locator('#faq button[aria-expanded]').nth(1).click();
    await page.waitForTimeout(200);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(600);

    const all = events(cap.batches);
    const results = cap.batches.map((b) => validateBatch(b, { schema: SCHEMA }));
    ok(cap.batches.length > 0 && results.every((r) => r.ok && r.dropped.events === 0 && r.dropped.props === 0), 'C1 every batch passes the collector with nothing dropped', results.filter((r) => !r.ok || r.dropped.events || r.dropped.props).slice(0, 2));
    const qs = all.map((e) => e.q);
    ok(JSON.stringify(qs) === JSON.stringify(qs.map((_, i) => i)), 'C2 sequence numbers run 0..n with no gaps');
    const names = all.map((e) => e.n);
    const order = ['page_view', 'entry_shown', 'finder_open', 'q_answer', 'q_view', 'result_view', 'result_feedback', 'result_click', 'talk_open', 'talk_submit', 'cta_click'];
    ok(order.every((n) => names.includes(n)), 'C2 the journey is recorded', order.filter((n) => !names.includes(n)));
    ok(names.indexOf('page_view') === 0 && names.indexOf('finder_open') < names.indexOf('result_view') && names.indexOf('result_view') < names.indexOf('talk_open'), 'C2 events arrive in journey order');
    ok(names.filter((n) => n === 'result_view').length === 1, 'C2 one result_view for one set of answers');
    const text = cap.batches.join('\n');
    ok(!/Sam Visitor|sam@example\.com/i.test(text), 'C3 no name or email in any tracking request');
    ok(!/[0-9a-f]{32}/.test(cap.talks[0]) && !/"sid"/.test(cap.talks[0]), 'C3 the talk payload carries no visit id');
    const note = all.find((e) => e.n === 'q_answer' && e.key === 'note');
    ok(note && !/07700|mysite\.com|@/.test(note.value) && /\[email\]/.test(note.value) && /\[number\]/.test(note.value) && /\[link\]/.test(note.value), 'C4 the note is scrubbed before it leaves the browser', note && note.value);
    const rv = all.find((e) => e.n === 'result_view');
    // The context carries the catalog version, itself a date label, so look at the events.
    ok(rv && rv.answers.race === '12-23' && !/\d{4}-\d{2}-\d{2}/.test(JSON.stringify(all)), 'C5 the race date is sent as a bucket, never a date', rv && rv.answers);
    const ctx = JSON.parse(cap.batches[0]).ctx;
    ok(ctx.mode === 'entry' && ctx.path === '/' && ctx.utm && ctx.utm.utm_source === 'instagram' && ctx.vw === 'desktop', 'context: mode, path, cleaned utm and width bucket', ctx);
    const marks = all.filter((e) => e.n === 'scroll_depth').map((e) => e.pct);
    ok(JSON.stringify(marks) === '[25,50,75,100]', 'C8 scroll depth marks fire once each, in order', marks);
    const sections = all.filter((e) => e.n === 'section_view').map((e) => e.id);
    ok(sections.includes('hero') && sections.includes('faq') && new Set(sections).size === sections.length, 'C8 homepage sections recorded once each, hero named by position', sections);
    ok(all.some((e) => e.n === 'faq_open' && e.i === 1), 'C8 FAQ opens recorded by index');
    const ctas = all.filter((e) => e.n === 'cta_click');
    ok(ctas.every((e) => Object.keys(e).every((k) => ['n', 't', 'q', 'id', 'kind', 'host'].includes(k))), 'C8 link clicks carry only id, kind and host');
    ok(ctas.some((e) => e.id === 'continue-to-homepage') && !names.includes('entry_skip'), 'B7 continue is a click, not a skip');
    const storage = await page.evaluate(() => ({ session: Object.keys(sessionStorage), local: Object.keys(localStorage), cookie: document.cookie }));
    ok(JSON.stringify(storage.session) === '["hx_entry"]' && storage.local.every((k) => ['hybridx-consent', 'hybridx-ui-theme'].includes(k)) && !storage.cookie.includes(JSON.parse(cap.batches[0]).sid), 'C11 the visit id is not stored on the device', storage);
    await page.context().close();
  }
  {
    // Accepting in the banner mid-visit starts the record from that moment.
    const page = await newPage(browser, 1440, 900);
    const cap = await captured(page);
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.locator('[data-consent-banner]').getByRole('button', { name: 'Accept' }).click();
    await page.locator('#hx-entry [data-goal="xenom"]').click();
    await page.waitForSelector('dialog[open]');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(500);
    const names = events(cap.batches).map((e) => e.n);
    ok(names[0] === 'page_view' && names.includes('entry_shown') && names.includes('finder_open'), 'consent given mid-visit starts tracking with a page_view', names.slice(0, 4));
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: true });
    const cap = await captured(page);
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.locator('a[data-skip="bar"]').click();
    await page.waitForTimeout(200);
    ok((await page.locator('#hx-skipwhy-slot button').count()) > 0, 'B4 the "why" strip appears after a skip when tracking is on');
    await page.getByRole('button', { name: 'I know what I want' }).click();
    ok((await page.locator('#hx-skipwhy-slot').innerText()).includes('Thank you'), 'the strip thanks the visitor');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(500);
    const all = events(cap.batches);
    ok(all.some((e) => e.n === 'entry_skip' && e.from === 'bar' && e.step === 0) && all.some((e) => e.n === 'skip_reason' && e.reason === 'know'), 'entry_skip and skip_reason recorded', all.map((e) => e.n));
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: true });
    await captured(page, { talkStatus: 500 });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await toResult(page, ROUTES[1]);
    await page.getByRole('button', { name: 'Talk to us directly' }).click();
    await page.fill('#t-name', 'Sam');
    await page.fill('#t-email', 'sam@example.com');
    await page.getByRole('button', { name: /Send message/ }).click();
    await page.waitForTimeout(500);
    ok((await page.locator('dialog').innerText()).includes('did not send') && (await page.inputValue('#t-name')) === 'Sam', 'C13 a failed send shows the error and keeps what the visitor typed');
    await page.context().close();
  }
  {
    const page = await newPage(browser, 1440, 900, { consent: true });
    const cap = await captured(page);
    await page.goto(base + '/start?goal=faster&utm_source=guide&utm_campaign=how-to-train', { waitUntil: 'networkidle' });
    await page.waitForSelector('dialog[open]');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(500);
    const first = JSON.parse(cap.batches[0]);
    const all = events(cap.batches);
    ok(first.ctx.mode === 'page' && first.ctx.utm.utm_campaign === 'how-to-train', 'B11 /start reports mode "page" and its utm tags', first.ctx);
    ok(all.some((e) => e.n === 'finder_open' && e.source === 'link' && e.step === 2), 'B11 ?goal= is recorded as finder_open from a link');
    await page.context().close();
  }

  console.log('\nF. Brand and layout');
  for (const [w, h] of [[1440, 900], [820, 1180], [390, 844]]) {
    const page = await newPage(browser, w, h, { consent: false });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await audit(page, `${w} entry`);
    await page.locator('#hx-entry [data-goal="first"]').click();
    await page.waitForSelector('dialog[open]');
    await audit(page, `${w} step 2`);
    await opt(page, 'level', 'new').click();
    await opt(page, 'place', 'home').click();
    await page.click('#f-next');
    await audit(page, `${w} step 3`);
    await opt(page, 'obst', 'run').click();
    await page.click('#f-next');
    await audit(page, `${w} step 4`);
    await opt(page, 'format', 'paper').click();
    await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.startsWith('Anything else'));
    await audit(page, `${w} step 5`);
    await page.click('#f-next');
    await page.waitForSelector('[data-result-title]');
    await audit(page, `${w} result`);
    await page.screenshot({ path: `next-result-${w}.png` });
    await page.getByRole('button', { name: 'Talk to us directly' }).click();
    await page.getByRole('button', { name: /Send message/ }).click();
    await audit(page, `${w} talk with errors`);
    await page.fill('#t-name', 'Sam');
    await page.fill('#t-email', 'sam@example.com');
    await page.getByRole('button', { name: /Send message/ }).click();
    await page.waitForFunction(() => document.querySelector('#f-title')?.textContent.includes('with us'));
    await audit(page, `${w} sent`);
    await page.context().close();
    const fresh = await newPage(browser, w, h);
    await fresh.goto(base + '/', { waitUntil: 'networkidle' });
    await audit(fresh, `${w} entry with consent banner`);
    await fresh.screenshot({ path: `next-entry-${w}.png` });
    await fresh.context().close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
