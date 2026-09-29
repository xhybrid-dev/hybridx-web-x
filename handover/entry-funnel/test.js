const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ASSETS = path.join(__dirname, 'assets', 'fonts');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const FILE = process.argv[2] || 'index.html';
const ENTRY = /entry-demo/.test(FILE);
const { validateBatch } = require('./server/collect-core.js');
const funnel = require('./data/funnel.json');

const hits = { collect: [], talk: [] };
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (req.method === 'POST') {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      (u === '/collect' ? hits.collect : hits.talk).push({ body: b, type: req.headers['content-type'] });
      res.writeHead(u === '/collect' ? 204 : 200, { 'content-type': 'application/json' });
      res.end(u === '/collect' ? '' : '{"ok":true}');
    });
    return;
  }
  let p;
  if (u.startsWith('/assets/')) p = path.join(ASSETS, u.slice(8));
  else p = path.join(ROOT, 'dist', u === '/' ? FILE : u.slice(1));
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    const ext = path.extname(p);
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.woff2': 'font/woff2' }[ext] || 'application/octet-stream', 'access-control-allow-origin': '*' });
    res.end(d);
  });
});

const fontCss = (port) => {
  const f = (fam, w, file) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(http://localhost:${port}/assets/${file}) format('woff2')}`;
  return [
    f('Inter', 400, 'inter-latin-400-normal.woff2'), f('Inter', 500, 'inter-latin-500-normal.woff2'),
    f('Inter', 600, 'inter-latin-600-normal.woff2'), f('Inter', 700, 'inter-latin-700-normal.woff2'),
    f('Space Grotesk', 500, 'space-grotesk-latin-500-normal.woff2'), f('Space Grotesk', 700, 'space-grotesk-latin-700-normal.woff2')
  ].join('\n');
};

let failures = 0;
const ok = (cond, msg, extra) => { if (!cond) { failures++; console.log('  FAIL:', msg, extra !== undefined ? JSON.stringify(extra) : ''); } else console.log('  ok:', msg); };

async function newPage(browser, port, w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: fontCss(port) }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  page.errors = errors;
  return page;
}

const PALETTE = new Set(['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(250, 219, 92)', 'rgb(26, 26, 26)', 'rgb(51, 51, 51)', 'rgb(179, 179, 179)', 'rgb(77, 77, 77)', 'rgb(217, 217, 217)', 'rgb(128, 128, 128)', 'rgba(0, 0, 0, 0)']);

async function audit(page, label) {
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
      if (parseFloat(cs.fontSize) < 12) small.push([el.tagName, cs.fontSize, n.textContent.trim().slice(0, 30)]);
      fam.add(cs.fontFamily.split(',')[0].replace(/['"]/g, '') + ' ' + cs.fontWeight);
      colors.add(cs.color);
    }
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('svg,script,style,noscript')) return;
      const cs = getComputedStyle(el); if (cs.display === 'none') return;
      colors.add('bg:' + cs.backgroundColor);
      if (parseFloat(cs.borderTopWidth) > 0) colors.add('bd:' + cs.borderTopColor);
    });
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('svg,[aria-hidden=true]') || el.closest('dialog:not([open])')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || getComputedStyle(el).display === 'none') return;
      if (r.right > vw + 1 || r.left < -1) {
        let a = el.parentElement, clipped = false;
        while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o === 'hidden' || o === 'auto') { const ar = a.getBoundingClientRect(); if (ar.right <= vw + 1) { clipped = true; break; } } a = a.parentElement; }
        if (!clipped) over.push([el.tagName, el.className && el.className.baseVal === undefined ? el.className : '', Math.round(r.left), Math.round(r.right), (el.textContent || '').trim().slice(0, 24)]);
      }
    });
    return { small, fam: [...fam], colors: [...colors], over: over.slice(0, 10), sw: document.documentElement.scrollWidth, vw };
  });
  ok(r.small.length === 0, label + ': no text under 12px', r.small.slice(0, 5));
  ok(r.sw <= r.vw, label + ': no horizontal scroll (' + r.sw + ' <= ' + r.vw + ')');
  ok(r.over.length === 0, label + ': nothing pokes outside viewport', r.over);
  const badFam = r.fam.filter((f) => !/^(Inter (400|500|600|700)|Space Grotesk (500|700))$/.test(f));
  ok(badFam.length === 0, label + ': only brand fonts and loaded weights', badFam);
  const offPal = r.colors.map((c) => c.replace(/^(bg|bd):/, '')).filter((c) => !PALETTE.has(c));
  ok(offPal.length === 0, label + ': colours inside the brand palette', [...new Set(offPal)]);
  return r;
}

async function clickText(page, sel, text) { await page.locator(sel, { hasText: text }).first().click(); }
async function stepTitle(page) { return (await page.locator('#f-title').innerText()).trim(); }

// Drive the finder through a route; returns result info
async function runRoute(page, r) {
  await page.locator('.tile[data-goal=' + r.goal + ']').first().click();
  await page.waitForSelector('#f-title');
  ok((await stepTitle(page)).startsWith('Where are you starting'), r.name + ': goal click lands on step 2');
  await page.locator('.opt[data-k=level][data-v=' + r.level + ']').click();
  await page.locator('.opt[data-k=place][data-v=' + r.place + ']').click();
  await page.click('#f-next');
  ok((await stepTitle(page)).startsWith('What has got in the way'), r.name + ': continue lands on step 3');
  for (const o of r.obst) await page.locator('.opt[data-k=obst][data-v=' + o + ']').click();
  await page.click('#f-next');
  await page.locator('.opt[data-k=format][data-v=' + r.format + ']').click();
  await page.waitForFunction(() => document.querySelector('#f-title') && document.querySelector('#f-title').textContent.startsWith('Anything else'));
  await page.click('#f-next');
  await page.waitForFunction(() => document.querySelector('.rcard'));
  const primary = (await page.locator('.rcard__n').innerText()).trim();
  const href = await page.locator('.rcard .btn').getAttribute('href');
  const secs = await page.locator('.sec2 .t').allInnerTexts();
  ok(primary === r.primary, r.name + ': primary = ' + r.primary, primary);
  ok(href === r.href, r.name + ': primary link', href);
  ok(JSON.stringify(secs) === JSON.stringify(r.secs), r.name + ': extras = ' + JSON.stringify(r.secs), secs);
  return { primary, secs };
}

const ROUTES = [
  { name: 'first/new/home/run/paper', goal: 'first', level: 'new', place: 'home', obst: ['run'], format: 'paper', primary: 'Train for Hyrox at Home', href: 'https://amzn.to/445PMV1', secs: ['12-Week Running Plan for Hyrox', 'VDOT Calculator'] },
  { name: 'faster/raced/gym/plateau/phone', goal: 'faster', level: 'raced', place: 'gym', obst: ['plateau'], format: 'phone', primary: 'The HybridX app', href: 'https://app.hybridx.club', secs: ['Race Time Predictor', 'Elite Hyrox Training Plan'] },
  { name: 'ultra/regular/both/time/free', goal: 'ultra', level: 'regular', place: 'both', obst: ['time'], format: 'free', primary: 'VDOT Calculator', href: 'https://hybridx.club/vdot', secs: ['Free 12-week Hyrox plan', 'ULTRA STRENGTH'] },
  { name: 'xenom/compete/gym/options/tools', goal: 'xenom', level: 'compete', place: 'gym', obst: ['options'], format: 'tools', primary: 'Build a Bigger Engine', href: 'https://hybridx.club/build-a-bigger-engine', secs: [] },
  { name: 'athx/new/home/none/paper', goal: 'athx', level: 'new', place: 'home', obst: [], format: 'paper', primary: 'ATHX 2027 training book', href: 'https://hybridx.club/books', secs: ['Free 12-week Hyrox plan', 'The HybridX app'] },
  { name: 'hybrid/raced/both/injury/paper', goal: 'hybrid', level: 'raced', place: 'both', obst: ['injury'], format: 'paper', primary: 'Elite Hyrox Training Plan', href: 'https://amzn.to/44jOd74', secs: ['Free 12-week Hyrox plan', 'The HybridX app'] },
  { name: 'first/new/gym/structure/paper', goal: 'first', level: 'new', place: 'gym', obst: ['structure'], format: 'paper', primary: 'Hyrox 12 Week Training Plan', href: 'https://amzn.to/3SSh8sz', secs: ['The HybridX app', 'Free 12-week Hyrox plan'] }
];

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const base = 'http://localhost:' + port + '/';

  // ---- layout audits at three widths
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [820, 1100, 'tablet'], [390, 844, 'phone']]) {
    console.log('\n== layout ' + tag + ' ' + w);
    const page = await newPage(browser, port, w, h);
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await audit(page, tag);
    await page.screenshot({ path: path.join(OUT, 'page-' + tag + '.png'), fullPage: true });
    ok(page.errors.length === 0, tag + ': no console errors', page.errors);
    await page.context().close();
  }

  // ---- funnel routes (desktop)
  console.log('\n== funnel routes');
  for (const r of ROUTES) {
    const page = await newPage(browser, port, 1440, 900, { reduce: true });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await runRoute(page, r);
    if (r === ROUTES[0]) {
      await page.screenshot({ path: path.join(OUT, 'result-desktop.png') });
      const hash = await page.evaluate(() => location.hash);
      ok(/^#plan=first\.new\.home\.run\.paper\.-$/.test(hash), 'result writes shareable hash', hash);
      await audit(page, 'result dialog desktop');
    }
    ok(page.errors.length === 0, r.name + ': no console errors', page.errors);
    await page.context().close();
  }

  // ---- dialog step screenshots + audits, desktop and phone
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    console.log('\n== dialog ' + tag);
    const page = await newPage(browser, port, w, h, { reduce: true });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.tile[data-goal=first]').first().click();
    await page.waitForSelector('#f-title');
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-2.png') });
    await audit(page, tag + ' step 2');
    // continue disabled until both groups chosen
    ok((await page.locator('#f-next').getAttribute('aria-disabled')) === 'true', tag + ': continue disabled on step 2 until answered');
    await page.click('#f-next', { force: true });
    ok((await stepTitle(page)).startsWith('Where are you starting'), tag + ': disabled continue does not advance');
    await page.locator('.opt[data-k=level][data-v=new]').click();
    await page.locator('.opt[data-k=place][data-v=home]').click();
    await page.click('#f-next');
    await page.locator('.opt[data-k=obst][data-v=run]').click();
    await page.locator('.opt[data-k=obst][data-v=time]').click();
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-3.png') });
    await audit(page, tag + ' step 3');
    // none is exclusive
    await page.locator('.opt[data-k=obst][data-v=none]').click();
    const pressed = await page.locator('.opt[data-k=obst][aria-pressed=true]').count();
    ok(pressed === 1, tag + ': "nothing yet" clears the other obstacles', pressed);
    await page.locator('.opt[data-k=obst][data-v=run]').click();
    ok((await page.locator('.opt[data-k=obst][data-v=none]').getAttribute('aria-pressed')) === 'false', tag + ': picking an obstacle clears "nothing yet"');
    await page.click('#f-next');
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-4.png') });
    await audit(page, tag + ' step 4');
    await page.locator('.opt[data-k=format][data-v=paper]').click();
    await page.waitForSelector('#note');
    // race date 20 weeks ahead
    const d = new Date(Date.now() + 20 * 7 * 86400000);
    const iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    await page.fill('#race', iso);
    await page.fill('#note', 'Race in Manchester, train before work');
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-5.png') });
    await audit(page, tag + ' step 5');
    await page.click('#f-next');
    await page.waitForSelector('.rcard');
    const why = await page.locator('.f-why').innerText();
    ok(/20 weeks until your race/.test(why), tag + ': race date turns into weeks in the result', why);
    ok((await page.locator('.f-left .pill', { hasText: 'Race in 20 weeks' }).count()) === 1, tag + ': race chip shown');
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-6.png') });
    await audit(page, tag + ' result');
    // back to step 1 keeps answers
    await page.click('[data-act=restart]');
    ok((await page.locator('.opt[data-k=goal][data-v=first]').getAttribute('aria-pressed')) === 'true', tag + ': change my answers keeps the goal selected');
    await page.click('#f-next');
    ok((await page.locator('.opt[data-k=level][data-v=new]').getAttribute('aria-pressed')) === 'true', tag + ': earlier answers are still selected');
    // strip jump
    await page.locator('.stn[data-step="4"]').click();
    ok((await stepTitle(page)).startsWith('How do you want'), tag + ': strip jumps to an answered station');
    // talk to us from result
    await page.locator('.stn[data-step="5"]').click();
    await page.click('#f-next');
    await page.click('[data-act=talk]');
    await page.waitForSelector('#talkForm');
    ok((await page.inputValue('#t-goal')) === 'My first Hyrox', tag + ': talk form pre-fills the goal');
    ok((await page.inputValue('#t-msg')) === 'Race in Manchester, train before work', tag + ': talk form pre-fills the note');
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-talk.png') });
    await audit(page, tag + ' talk');
    // validation
    await page.fill('#t-goal', '');
    await page.click('#t-send');
    ok((await page.locator('#t-name-e').isVisible()) && (await page.locator('#t-email-e').isVisible()) && (await page.locator('#t-goal-e').isVisible()), tag + ': empty form shows three errors');
    ok((await page.evaluate(() => document.activeElement.id)) === 't-name', tag + ': focus jumps to first error');
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-talk-err.png') });
    await audit(page, tag + ' talk errors');
    await page.fill('#t-name', 'Sam Runner');
    await page.fill('#t-email', 'not-an-email');
    await page.fill('#t-goal', 'A race that is not on your list');
    await page.click('#t-send');
    ok((await page.locator('#t-email-e').isVisible()) && !(await page.locator('#t-name-e').isVisible()), tag + ': bad email flagged, name error cleared');
    await page.fill('#t-email', 'sam@example.com');
    await page.click('#t-send');
    await page.waitForSelector('.sent');
    const sentTitle = await stepTitle(page);
    ok(/Nothing was sent/.test(sentTitle), tag + ': preview mode does not claim the message was sent', sentTitle);
    await page.screenshot({ path: path.join(OUT, 'dlg-' + tag + '-sent.png') });
    await audit(page, tag + ' sent');
    await page.click('.sent [data-act=toresult]');
    await page.waitForSelector('.rcard');
    // Esc closes and returns focus
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(!(await page.evaluate(() => document.getElementById('finder').open)), tag + ': Esc closes the dialog');
    ok(!(await page.evaluate(() => document.documentElement.classList.contains('lock'))), tag + ': page scroll unlocked');
    ok(!(await page.evaluate(() => location.hash.startsWith('#plan='))), tag + ': hash cleared on close');
    ok(page.errors.length === 0, tag + ': no console errors in dialog flow', page.errors);
    await page.context().close();
  }

  // ---- story prompts, nav CTA, talk band, menu, faq
  console.log('\n== page triggers');
  {
    const page = await newPage(browser, port, 390, 844, { reduce: true });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.click('#menuBtn');
    ok(await page.locator('#menuPanel').isVisible(), 'phone: menu opens');
    await page.screenshot({ path: path.join(OUT, 'phone-menu.png') });
    await page.click('#menuBtn');
    ok(!(await page.locator('#menuPanel').isVisible()), 'phone: menu closes');
    await page.locator('.pcard[data-prompt=run]').scrollIntoViewIfNeeded();
    await page.locator('.pcard[data-prompt=run]').click();
    ok((await stepTitle(page)).startsWith('What are you training for'), 'prompt without goal opens at step 1');
    await page.locator('.opt[data-k=goal][data-v=faster]').click();
    await page.waitForFunction(() => document.querySelector('#f-title').textContent.startsWith('Where are you'));
    await page.locator('.opt[data-k=level][data-v=raced]').click();
    await page.locator('.opt[data-k=place][data-v=gym]').click();
    await page.click('#f-next');
    ok((await page.locator('.opt[data-k=obst][data-v=run]').getAttribute('aria-pressed')) === 'true', 'running prompt pre-selects "Running is my weak spot"');
    await page.click('[data-act=close]');
    await page.waitForTimeout(100);
    // reopen from nav CTA resumes at step 3
    await page.locator('.nav [data-open=find]').click();
    ok((await stepTitle(page)).startsWith('What has got in the way'), 'nav CTA resumes where the visitor left off');
    await page.click('[data-act=close]');
    await page.waitForTimeout(100);
    // talk band opens the form directly
    await page.locator('[data-open=talk]').scrollIntoViewIfNeeded();
    await page.locator('[data-open=talk]').click();
    await page.waitForSelector('#talkForm');
    ok(!(await page.locator('#f-strip').isVisible()), 'talk form hides the station strip');
    ok((await page.locator('[data-act=toresult]').count()) === 0, 'no "back to result" when there is no result yet');
    await page.click('[data-act=close]');
    await page.waitForTimeout(100);
    // faq
    const qa = page.locator('.qa').first();
    await qa.scrollIntoViewIfNeeded();
    await qa.locator('summary').click();
    ok(await qa.evaluate((e) => e.open), 'faq item opens');
    await page.screenshot({ path: path.join(OUT, 'phone-faq.png') });
    ok(page.errors.length === 0, 'no console errors on triggers', page.errors);
    await page.context().close();
  }

  // ---- reload from shared hash
  console.log('\n== shared link');
  {
    const page = await newPage(browser, port, 1440, 900, { reduce: true });
    await page.goto(base + '#plan=faster.raced.gym.run+plateau.phone.-');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('.rcard');
    ok((await page.locator('.rcard__n').innerText()) === 'The HybridX app', 'shared link restores the result');
    ok((await page.locator('.f-left .pill', { hasText: 'Running is my weak spot' }).count()) === 1, 'shared link restores obstacles');
    await page.context().close();
    const p2 = await newPage(browser, port, 1440, 900, { reduce: true });
    await p2.goto(base + '#plan=bogus.x.y.z.w.-');
    ok(!(await p2.evaluate(() => document.getElementById('finder').open)), 'invalid hash is ignored');
    await p2.context().close();
  }

  // ---- keyboard: tab order reaches tiles and dialog traps focus
  console.log('\n== keyboard');
  {
    const page = await newPage(browser, port, 1440, 900, { reduce: true });
    await page.goto(base);
    await page.locator('.tile').first().focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#f-title');
    ok((await page.evaluate(() => document.activeElement.id)) === 'f-title', 'focus moves to the question heading');
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
    ok(await page.evaluate(() => document.getElementById('finder').contains(document.activeElement)), 'focus stays inside the open dialog');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok((await page.evaluate(() => document.activeElement.className)).includes('tile'), 'focus returns to the tile that opened it');
    await page.context().close();
  }


  // =====================================================================
  // Tracking, privacy switches and the entry funnel
  // =====================================================================
  const dateIn = (weeks) => { const d = new Date(Date.now() + weeks * 7 * 86400000); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  const decode = () => hits.collect.map((h) => JSON.parse(h.body));
  const flat = () => decode().flatMap((b) => b.events);
  const names = () => flat().map((e) => e.n);
  const isSubsequence = (want, have) => { let i = 0; for (const n of have) if (n === want[i]) i++; return i === want.length; };

  // A tracked page: HX_CONFIG is set before the page script runs.
  async function trackedPage(cfg, opts = {}) {
    hits.collect.length = 0; hits.talk.length = 0;
    const page = await newPage(browser, port, opts.w || 1440, opts.h || 900, { reduce: true });
    await page.context().route(/^https:\/\/(app\.|www\.)?(hybridx\.club|amzn\.to)\//, (r) => r.abort());
    await page.addInitScript((c) => { window.HX_CONFIG = c; }, cfg);
    if (opts.gpc) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
    if (opts.dnt) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' }));
    await page.goto(opts.url || base, opts.referer ? { referer: opts.referer } : undefined);
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  const flush = async (page) => { await page.evaluate(() => window.HXTrack.flush()); await page.waitForTimeout(200); };

  async function answerToResult(page, o) {
    await page.locator('.tile[data-goal=' + o.goal + ']').first().click();
    await page.locator('.opt[data-k=level][data-v=' + o.level + ']').click();
    await page.locator('.opt[data-k=place][data-v=' + o.place + ']').click();
    await page.click('#f-next');
    for (const x of o.obst) await page.locator('.opt[data-k=obst][data-v=' + x + ']').click();
    await page.click('#f-next');
    await page.locator('.opt[data-k=format][data-v=' + o.format + ']').click();
    await page.waitForSelector('#note');
    if (o.note) await page.fill('#note', o.note);
    if (o.weeks) await page.fill('#race', dateIn(o.weeks));
    await page.click('#f-next');
    await page.waitForSelector('.rcard');
  }

  console.log('\n== tracking on: full journey');
  {
    const page = await trackedPage({ trackEndpoint: '/collect', talkEndpoint: '/talk', variant: 'A', siteVersion: 'test-1' },
      { url: base + '?utm_source=Newsletter&utm_medium=email&utm_campaign=Sept%20Launch', referer: 'https://www.google.com/search?q=hyrox+plan' });
    ok(await page.evaluate(() => window.HXTrack.enabled), 'tracker is enabled when an endpoint is set');
    ok((await page.locator('[data-privacy-tick]').innerText()) === funnel.copy.privacy.tickOn, 'tick tells the truth when tracking is on');
    await answerToResult(page, { goal: 'first', level: 'regular', place: 'gym', obst: ['structure', 'time'], format: 'phone', weeks: 20,
      note: 'Race in Leeds. Ring me on 07700 900123 or email sam@example.com, see www.example.com/plan' });
    ok((await page.locator('#fb').count()) === 1, 'result shows the feedback question when tracking is on');
    // feedback: not really + two reasons
    await page.locator('#fb').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'result-feedback.png') });
    await page.locator('[data-fb=no]').click();
    await page.locator('[data-fbr=wrong]').click();
    await page.locator('[data-fbr=price]').click();
    await page.locator('#fb').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, 'result-feedback-reasons.png') });
    await audit(page, 'result with feedback');
    await page.click('[data-act=fbsend]');
    ok(/Thank you/.test(await page.locator('#fb').innerText()), 'feedback shows a thank you');
    // click the primary product (opens a new tab, which the route above aborts)
    const [pop] = await Promise.all([page.context().waitForEvent('page'), page.locator('.rcard .btn').click()]);
    await pop.close();
    await page.locator('.sec2').first().scrollIntoViewIfNeeded();
    // talk to us with a real endpoint
    await page.click('[data-act=talk]');
    await page.fill('#t-name', 'Sam Runner'); await page.fill('#t-email', 'sam@example.com');
    await page.click('#t-send');
    await page.waitForSelector('.sent');
    ok(/Thank you/.test(await stepTitle(page)), 'talk form with an endpoint says thank you');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(250);

    const bodies = hits.collect.map((h) => h.body);
    ok(bodies.length >= 1, 'collector received batches', bodies.length);
    ok(hits.collect.every((h) => /^text\/plain/.test(h.type)), 'batches are text/plain (no CORS preflight)');
    const results = bodies.map((b) => validateBatch(b));
    ok(results.every((r) => r.ok), 'every batch passes the collector validator', results.filter((r) => !r.ok).map((r) => r.error));
    ok(results.every((r) => r.dropped.events === 0 && r.dropped.props === 0), 'nothing was dropped: tracker output matches events.schema.json', results.map((r) => r.dropped));
    const batches = decode();
    ok(new Set(batches.map((b) => b.sid)).size === 1 && /^[0-9a-f]{32}$/.test(batches[0].sid), 'one random visit id per page load');
    const c = batches[0].ctx;
    ok(c.mode === (ENTRY ? 'entry' : 'page') && c.variant === 'A' && c.ref === 'google.com' && c.vw === 'desktop' && c.path === '/' && c.site === 'test-1', 'context: mode, variant, referrer host only, viewport bucket, path', c);
    ok(c.utm && c.utm.utm_source === 'newsletter' && c.utm.utm_medium === 'email' && c.utm.utm_campaign === 'sept-launch', 'utm values are normalised', c.utm);
    const ev = flat();
    ok(ev.every((e, i) => e.q === i), 'sequence numbers run 0..n with no gaps', ev.map((e) => e.q).join(','));
    ok(isSubsequence(['page_view', 'finder_open', 'q_answer', 'q_view', 'q_answer', 'q_answer', 'q_view', 'q_answer', 'q_view', 'q_answer', 'q_view', 'q_answer', 'q_answer', 'result_view', 'result_feedback', 'result_click', 'talk_open', 'talk_submit', 'page_hide'], names()), 'events arrive in journey order', names().join(' '));
    const open = ev.find((e) => e.n === 'finder_open');
    ok(open.source === 'tile', 'finder_open records the source', open);
    const rv = ev.find((e) => e.n === 'result_view');
    ok(rv.primary === 'app' && ['goal:first', 'level:regular', 'place:gym', 'format:phone', 'race:12-23'].every((kv) => rv.answers[kv.split(':')[0]] === kv.split(':')[1]) && rv.answers.obst.join() === 'structure,time', 'result_view has the answers and the product', rv);
    ok(rv.secondary.length === 2 && rv.trace.length >= 3 && rv.weeks === 20, 'result_view has extras, rule trace and weeks', rv);
    ok(ev.filter((e) => e.n === 'result_view').length === 1, 'one result_view per set of answers');
    const fbk = ev.find((e) => e.n === 'result_feedback');
    ok(fbk.fit === 'no' && fbk.reasons.join() === 'wrong,price', 'feedback records the fit and reasons', fbk);
    const rc = ev.find((e) => e.n === 'result_click');
    ok(rc.product === 'app' && rc.slot === 'primary' && rc.dest === funnel.catalog.app.destinationType && rc.affiliate === false, 'result_click records product, slot and destination type', rc);
    ok(ev.find((e) => e.n === 'talk_submit').ok === true, 'talk_submit records only the outcome');
    const noteEv = ev.find((e) => e.n === 'q_answer' && e.key === 'note');
    ok(noteEv && /\[email\]/.test(noteEv.value) && /\[number\]/.test(noteEv.value) && /\[link\]/.test(noteEv.value) && !/@|07700|example\.com/.test(noteEv.value), 'the note is scrubbed before it leaves the browser', noteEv && noteEv.value);
    const all = bodies.join('\n');
    ok(!/sam@example\.com|Sam Runner|Runner/.test(all), 'no name or email in any tracking batch');
    ok(hits.talk.length === 1 && /sam@example\.com/.test(hits.talk[0].body), 'the email goes only to the talk endpoint');
    const tp = JSON.parse(hits.talk[0].body);
    ok(tp.sid === undefined && tp.plan && tp.plan.recommended === 'app' && tp.source === 'hybridx.club/' + (ENTRY ? 'entry' : 'page'), 'talk payload carries the plan, no visit id', tp);
    const hide = ev.find((e) => e.n === 'page_hide');
    ok(hide && hide.step === 8 && hide.result === true, 'page_hide records where the visitor was', hide);
    ok(ev.some((e) => e.n === 'q_answer' && e.ms >= 0), 'time on step is recorded');
    ok(page.errors.length === 0, 'no console errors while tracking', page.errors);
    await page.context().close();
  }

  console.log('\n== tracking: abandonment, back, jump, invalid form');
  {
    const page = await trackedPage({ trackEndpoint: '/collect' });
    await page.locator('.tile[data-goal=faster]').first().click();
    await page.locator('.opt[data-k=level][data-v=raced]').click();
    await page.locator('.opt[data-k=place][data-v=both]').click();
    await page.click('#f-next');
    await page.click('[data-act=back]');
    await page.click('#f-next');
    await page.locator('.stn[data-step="1"]').click();
    await page.locator('.stn[data-step="3"]').click().catch(() => {});
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.locator('[data-open=talk]').first().scrollIntoViewIfNeeded();
    await page.locator('[data-open=talk]').first().click();
    await page.click('#t-send');
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(250);
    const ev = flat();
    ok(ev.some((e) => e.n === 'q_back' && e.step === 3), 'q_back recorded', ev.filter((e) => e.n === 'q_back'));
    ok(ev.some((e) => e.n === 'q_jump' && e.from === 3 && e.to === 1), 'q_jump recorded');
    const close = ev.find((e) => e.n === 'dialog_close');
    ok(close && close.reason === 'esc' && close.result === false, 'Esc is recorded as an abandon with reason esc', close);
    const inv = ev.find((e) => e.n === 'talk_invalid');
    ok(inv && inv.fields.join() === 'name,email', 'invalid form records field names only (goal was pre-filled)', inv);
    const tk = ev.find((e) => e.n === 'talk_open');
    ok(tk && tk.from === 'band', 'talk_open records where it was opened from', tk);
    ok(hits.collect.map((h) => validateBatch(h.body)).every((r) => r.ok && r.dropped.events === 0 && r.dropped.props === 0), 'all batches valid');
    await page.context().close();
  }

  console.log('\n== tracking: page engagement');
  {
    const page = await trackedPage({ trackEndpoint: '/collect' }, { h: 700 });
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(300);
    const qa = page.locator('.qa').first();
    await qa.scrollIntoViewIfNeeded();
    await qa.locator('summary').click();
    await page.locator('.foot a[href*="/books"]').first().click({ modifiers: ['Control'] }).catch(() => {});
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(250);
    const ev = flat();
    ok(ev.filter((e) => e.n === 'scroll_depth').map((e) => e.pct).join() === '25,50,75,100', 'scroll depth marks fire once each, in order', ev.filter((e) => e.n === 'scroll_depth').map((e) => e.pct));
    ok(ev.filter((e) => e.n === 'section_view').length >= 4, 'sections reached are recorded', ev.filter((e) => e.n === 'section_view').map((e) => e.id));
    ok(new Set(ev.filter((e) => e.n === 'section_view').map((e) => e.id)).size === ev.filter((e) => e.n === 'section_view').length, 'each section is recorded once');
    ok(ev.some((e) => e.n === 'faq_open' && e.i === 0), 'faq open is recorded');
    const cta = ev.find((e) => e.n === 'cta_click');
    ok(cta && cta.kind === 'footer' && cta.host === 'hybridx.club', 'link clicks are recorded with kind and host only', cta);
    ok(ev.find((e) => e.n === 'page_hide').scroll >= 95, 'page_hide records deepest scroll');
    ok(hits.collect.map((h) => validateBatch(h.body)).every((r) => r.ok && r.dropped.events === 0 && r.dropped.props === 0), 'all batches valid');
    await page.context().close();
  }

  console.log('\n== tracking off: no endpoint, Global Privacy Control, Do Not Track, note switched off');
  for (const [label, cfg, o] of [
    ['no endpoint', {}, {}],
    ['Global Privacy Control', { trackEndpoint: '/collect' }, { gpc: true }],
    ['Do Not Track', { trackEndpoint: '/collect' }, { dnt: true }]
  ]) {
    const page = await trackedPage(cfg, o);
    ok(!(await page.evaluate(() => window.HXTrack.enabled)), label + ': tracker is off');
    ok((await page.locator('[data-privacy-tick]').innerText()) === funnel.copy.privacy.tickOff, label + ': tick says answers stay on the device');
    await answerToResult(page, { goal: 'first', level: 'new', place: 'home', obst: ['run'], format: 'paper' });
    ok((await page.locator('#fb').count()) === 0, label + ': no feedback question when nothing can be sent');
    await page.click('[data-act=restart]');
    await page.locator('.stn[data-step="5"]').click();
    ok((await page.locator('#f-privacy').innerText()).startsWith(funnel.copy.privacy.trackingOff.slice(0, 40)), label + ': step 5 says nothing is sent');
    await page.evaluate(() => { window.HXTrack.flush(); window.dispatchEvent(new Event('pagehide')); });
    await page.waitForTimeout(250);
    ok(hits.collect.length === 0, label + ': zero requests to the collector', hits.collect.length);
    await page.context().close();
  }
  {
    const page = await trackedPage({ trackEndpoint: '/collect', captureNote: false });
    await answerToResult(page, { goal: 'first', level: 'new', place: 'home', obst: [], format: 'free', note: 'private words here', weeks: 8 });
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(250);
    const ev = flat();
    ok(!ev.some((e) => e.n === 'q_answer' && e.key === 'note') && !hits.collect.some((h) => /private words/.test(h.body)), 'captureNote:false never sends the note');
    ok(ev.some((e) => e.n === 'q_answer' && e.key === 'race' && e.value === '5-11'), 'race date is sent as a bucket, never as a date');
    ok(!hits.collect.some((h) => /\d{4}-\d{2}-\d{2}/.test(h.body.replace(/"catalog":"[^"]*"/g, ''))), 'no calendar dates in any batch');
    await page.locator('.stn[data-step="5"]').click();
    ok((await page.locator('#f-privacy').innerText()).includes('What you type in this box is not saved'), 'step 5 copy matches captureNote:false');
    await page.context().close();
  }

  if (ENTRY) {
    console.log('\n== entry funnel above the homepage');
    {
      const page = await trackedPage({ trackEndpoint: '/collect', talkEndpoint: '/talk' });
      ok(await page.locator('#hx-entry').isVisible(), 'entry section is shown first');
      ok((await page.locator('h1').count()) === 0, 'entry section adds no second H1 (the existing homepage keeps its own)');
      ok((await page.locator('#hx-entry .skiplink').getAttribute('href')) === '#hx-home', 'skip link is a real anchor to the homepage');
      const yEntry = await page.locator('#hx-entry').evaluate((e) => e.getBoundingClientRect().top);
      const yHome = await page.locator('#hx-home').evaluate((e) => e.getBoundingClientRect().top);
      ok(yEntry < yHome, 'entry sits above the existing homepage in the document');
      console.log('  info: entry height ' + (await page.locator('#hx-entry').evaluate((e) => Math.round(e.getBoundingClientRect().height))) + 'px at 1440x900; homepage starts ' + Math.round(yHome) + 'px from the top');
      await page.screenshot({ path: path.join(OUT, 'entry-desktop.png') });
      await audit(page, 'entry desktop');
      await page.locator('#hx-entry .skiplink').click();
      await page.waitForTimeout(150);
      ok(!(await page.locator('#hx-entry').isVisible()), 'skip hides the entry section');
      ok((await page.evaluate(() => document.activeElement.id)) === 'hx-home', 'skip moves focus to the homepage');
      ok((await page.evaluate(() => window.scrollY)) === 0, 'skip lands at the top of the homepage');
      ok((await page.evaluate(() => sessionStorage.getItem('hx_entry'))) === 'skipped', 'skip is remembered for this tab session only');
      ok(await page.locator('#hx-skipwhy').isVisible(), 'skip reason strip appears when tracking is on');
      await page.screenshot({ path: path.join(OUT, 'entry-after-skip.png') });
      await audit(page, 'entry after skip');
      await page.locator('[data-why=toomany]').click();
      ok(/Thank you/.test(await page.locator('#hx-skipwhy').innerText()), 'skip reason says thank you');
      await page.locator('[data-why-close]').click();
      ok(!(await page.locator('#hx-skipwhy').isVisible()), 'skip reason strip can be closed');
      await flush(page);
      let ev = flat();
      ok(isSubsequence(['page_view', 'entry_shown', 'entry_skip', 'skip_reason'], names()), 'events: page_view, entry_shown, entry_skip, skip_reason', names().join(' '));
      const sk = ev.find((e) => e.n === 'entry_skip');
      ok(sk.from === 'bar' && sk.step === 0, 'skip before opening the questions is step 0', sk);
      ok(ev.find((e) => e.n === 'skip_reason').reason === 'toomany', 'skip reason recorded');
      // reload in the same tab: entry stays skipped, and is not counted as shown
      hits.collect.length = 0;
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      ok(!(await page.locator('#hx-entry').isVisible()), 'after a reload in the same tab the entry stays skipped');
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await page.waitForTimeout(250);
      ok(!names().includes('entry_shown') && names().includes('page_view'), 'a skipped visitor is not counted as shown the entry again', names());
      // the nav button still opens the finder after skipping
      await page.locator('.nav [data-open=find]').click();
      ok((await stepTitle(page)).startsWith('What are you training for'), 'Find your plan in the header still opens the questions after a skip');
      await page.context().close();
    }
    {
      // skip from inside the dialog
      const page = await trackedPage({ trackEndpoint: '/collect' });
      await page.locator('.tile[data-goal=first]').first().click();
      await page.waitForSelector('#f-title');
      ok(await page.locator('#f-skip').isVisible(), 'dialog offers a skip while answering');
      await page.screenshot({ path: path.join(OUT, 'entry-dialog-skip.png') });
      await audit(page, 'entry dialog skip');
      await page.click('#f-skip');
      await page.waitForTimeout(250);
      ok(!(await page.evaluate(() => document.getElementById('finder').open)), 'skip in the dialog closes it');
      ok(!(await page.locator('#hx-entry').isVisible()) && (await page.evaluate(() => document.activeElement.id)) === 'hx-home', 'skip in the dialog lands on the homepage with focus there');
      await flush(page);
      const ev = flat();
      const sk = ev.find((e) => e.n === 'entry_skip');
      ok(sk && sk.from === 'dialog' && sk.step === 2, 'dialog skip records the step the visitor was on', sk);
      ok(ev.some((e) => e.n === 'dialog_close' && e.step === 2), 'dialog close is recorded with the skip');
      await page.context().close();
    }
    {
      // continue after a result: not a skip
      const page = await trackedPage({ trackEndpoint: '/collect' });
      await answerToResult(page, { goal: 'ultra', level: 'regular', place: 'both', obst: ['time'], format: 'free' });
      ok(!(await page.locator('#f-skip').isVisible()), 'skip button is hidden once the result is showing');
      ok(await page.locator('[data-act=continue]').isVisible(), 'result offers Continue to the homepage');
      await page.screenshot({ path: path.join(OUT, 'entry-result-continue.png') });
      await page.click('[data-act=continue]');
      await page.waitForTimeout(250);
      ok(!(await page.locator('#hx-entry').isVisible()) && (await page.evaluate(() => document.activeElement.id)) === 'hx-home', 'continue hides the entry and moves focus to the homepage');
      ok(!(await page.locator('#hx-skipwhy').isVisible()), 'continue is not a skip: no reason strip');
      await flush(page);
      const ev = flat();
      ok(!names().includes('entry_skip') && ev.some((e) => e.n === 'cta_click' && e.id === 'continue-to-homepage'), 'continue is recorded as a click, not a skip', names().join(' '));
      ok((await page.evaluate(() => sessionStorage.getItem('hx_entry'))) === 'done', 'completion is remembered for this tab session');
      await page.context().close();
    }
    {
      // ?entry=off bypasses without remembering
      const page = await trackedPage({ trackEndpoint: '/collect' }, { url: base + '?entry=off' });
      ok(!(await page.locator('#hx-entry').isVisible()), '?entry=off hides the entry');
      ok((await page.evaluate(() => sessionStorage.getItem('hx_entry'))) === null, '?entry=off does not store anything');
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await page.waitForTimeout(250);
      ok(!names().includes('entry_shown'), '?entry=off is not counted as shown the entry');
      await page.context().close();
    }
    {
      // no JavaScript: the skip link still works and the questions are replaced by plain links
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
      const page = await ctx.newPage();
      await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
      await page.goto(base);
      ok(!(await page.locator('.tiles').isVisible()), 'without JS the tiles are hidden');
      ok(await page.locator('#hx-entry .qcard').isVisible(), 'without JS the card still shows the plain links');
      await page.locator('#hx-entry .skiplink').click();
      ok((await page.evaluate(() => location.hash)) === '#hx-home', 'without JS the skip link jumps to the homepage');
      await ctx.close();
    }
    {
      // phone
      const page = await trackedPage({ trackEndpoint: '/collect' }, { w: 390, h: 844 });
      console.log('  info: entry height ' + (await page.locator('#hx-entry').evaluate((e) => Math.round(e.getBoundingClientRect().height))) + 'px at 390x844; homepage starts ' + (await page.locator('#hx-home').evaluate((e) => Math.round(e.getBoundingClientRect().top + scrollY))) + 'px from the top');
      await page.screenshot({ path: path.join(OUT, 'entry-phone.png') });
      await audit(page, 'entry phone');
      ok(await page.locator('#hx-entry .skiplink').isVisible(), 'phone: skip link visible without scrolling');
      const vis = await page.locator('#hx-entry .skiplink').evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      ok(vis, 'phone: skip link is inside the first screen');
      await page.locator('.tile[data-goal=first]').first().click();
      await page.waitForSelector('#f-title');
      await page.screenshot({ path: path.join(OUT, 'entry-phone-dialog.png') });
      await audit(page, 'entry phone dialog');
      const fits = await page.evaluate(() => { const t = document.querySelector('.f-top'); return t.scrollWidth <= t.clientWidth + 1; });
      ok(fits, 'phone: dialog top bar (logo, skip, close) fits without overflow');
      await page.context().close();
    }
  }

  await browser.close();
  server.close();
  console.log('\n' + (failures ? failures + ' FAILURES' : 'ALL CHECKS PASSED'));
  process.exit(failures ? 1 : 0);
})();
