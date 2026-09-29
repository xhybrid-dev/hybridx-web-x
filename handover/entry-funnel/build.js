/*
 * Reference build. Node only, no dependencies.
 *   node build.js
 * Writes dist/index.html (plan finder as a page), dist/entry-demo.html (the funnel above a
 * stand-in homepage, with a skip route) and artifact fragments for previewing.
 * Sources: src/partials/*.html, src/style.css, src/app.js, data/funnel.json, data/routing.js.
 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const logo = fs.readFileSync(path.join(root, 'assets', 'logos', 'hybridx-logo-full.png')).toString('base64');
const xmark = fs.readFileSync(path.join(root, 'assets', 'logos', 'hybridx-x-mark.jpg')).toString('base64');

const F = JSON.parse(read('data', 'funnel.json'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ico = (n) => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const fill = (tpl, map) => Object.keys(map).reduce((s, k) => s.split(`%%${k}%%`).join(map[k]), tpl);

// ---- FAQ from data/funnel.json
const faqHtml = F.faq.map(({ q, a }) =>
  `      <details class="qa"><summary><span>${esc(q)}</span><svg class="ico" aria-hidden="true"><use href="#i-h"/><use class="v" href="#i-v"/></svg></summary><p class="qa__a">${esc(a)}</p></details>`
).join('\n');
const faqLd = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: F.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
});

// ---- hero / entry section from data/funnel.json
function hero(mode) {
  const H = F.copy.hero, E = F.copy.entry;
  const entry = mode === 'entry';
  const title = esc(H.title).replace(esc(H.titleHighlight), `<span class="ty">${esc(H.titleHighlight)}</span>`);
  const tiles = F.goals.map((g) =>
    `        <button type="button" class="tile" data-goal="${g.id}"><span class="tile__t">${esc(g.label)}${ico('arrow')}</span><span class="tile__s">${esc(g.sub)}</span></button>`
  ).join('\n');
  const ticks = H.ticks.map((t) => `        <li>${ico('check')}${esc(t)}</li>`)
    .concat(`        <li>${ico('check')}<span data-privacy-tick>${esc(F.copy.privacy.tickOff)}</span></li>`).join('\n');
  return fill(read('src', 'partials', 'hero.html'), {
    HERO_OPEN: entry
      ? '<section class="hero hero--entry" id="hx-entry" aria-labelledby="hx-entry-h">'
      : '<section class="hero" id="top">',
    ENTRY_BAR: entry
      ? `  <div class="wrap entry__bar"><span class="entry__hint">${esc(F.copy.skip.hint)}</span><a class="skiplink" href="#hx-home" data-skip="bar">${esc(E.skipLabel)} ${ico('arrow')}</a></div>`
      : '',
    H_TAG: entry ? 'h2' : 'h1',
    H_ID: entry ? ' id="hx-entry-h"' : '',
    H_CHIP: esc(H.chip), H_META: esc(H.meta), H_TITLE: title, H_LEAD: esc(H.lead), H_TICKS: ticks,
    H_Q1T: esc(F.steps[1].title), H_Q1HELP: esc(H.q1Help), H_TILES: tiles,
    H_START: esc(H.startTodayLine), H_STARTLINK: esc(H.startTodayLink)
  });
}

function skipWhy() {
  const S = F.copy.skipWhy;
  return `<div class="skipwhy" id="hx-skipwhy" hidden><div class="wrap skipwhy__in"><span class="skipwhy__t">${esc(S.title)}</span>` +
    S.options.map((o) => `<button type="button" class="pill pill--btn" data-why="${o.id}">${esc(o.label)}</button>`).join('') +
    `<button type="button" class="ulink" data-why-close>${esc(S.dismiss)}</button></div></div>`;
}

function body(mode) {
  const entry = mode === 'entry';
  let nav = read('src', 'partials', 'nav.html');
  if (entry) nav = nav.replace('href="#top"', 'href="#main"');
  const rest = read('src', 'partials', 'rest.html').replace('%%FAQ_HTML%%', faqHtml);
  const dialog = fill(read('src', 'partials', 'dialog.html'), {
    F_SKIP: entry ? `<button type="button" class="f-skip" id="f-skip" data-skip="dialog">${esc(F.copy.entry.skipLabel)}</button>` : ''
  });
  const footer = read('src', 'partials', 'footer.html');
  const main = entry
    ? `<main id="main">\n${hero('entry')}\n${skipWhy()}\n<div id="hx-home" tabindex="-1">\n<div class="demo-band"><div class="wrap"><div class="demo">${esc(F.copy.entry.demoBanner)}</div></div></div>\n${rest}\n</div>\n</main>`
    : `<main id="main">\n${hero('page')}\n${rest}\n</main>`;
  return `${nav}\n${main}\n\n${footer}\n\n${dialog}`;
}

// ---- assets
const fonts = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap';
const css = read('src', 'style.css').replace('%%LOGO%%', logo).replace('%%XMARK%%', xmark);
const json = JSON.stringify(F).replace(/</g, '\\u003c');
const scripts = () => `<script>window.HX_FUNNEL = ${json};</script>
<script>
${read('data', 'routing.js')}
</script>
<script>
${read('src', 'app.js')}
</script>`;

const desc = 'Answer five questions and HybridX matches you to the right Hyrox plan, paperback book, app or free tool. Free to use, no sign-up.';
function fullDoc(mode) {
  const entry = mode === 'entry';
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${entry ? 'HybridX.club | Entry funnel demo' : 'HybridX.club | Find your Hyrox and hybrid training plan'}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#000000">
${entry ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="https://hybridx.club/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="HybridX.club">
<meta property="og:title" content="What do you want from your training? | HybridX.club">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="https://hybridx.club/">
<meta name="twitter:card" content="summary_large_image">`}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
${entry ? '' : `<script type="application/ld+json">${faqLd}</script>`}
</head>
<body>
${body(mode)}
${scripts()}
</body>
</html>
`;
}

// Artifact fragment: no doctype/html/head/body, title and style first, fonts via @import.
function artifact(mode) {
  return `<title>${mode === 'entry' ? 'HybridX Entry Funnel Demo' : 'HybridX Plan Finder'}</title>
<style>
@import url('${fonts}');
${css}
</style>
${body(mode)}
${scripts()}
`;
}
// The fragment wrapped in a document, so the same browser tests can run against it.
const wrapForTest = (frag) => `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${frag}</body></html>`;

const out = {
  'index.html': fullDoc('page'),
  'entry-demo.html': fullDoc('entry'),
  'artifact.html': artifact('page'),
  'entry-demo-artifact.html': artifact('entry')
};
out['artifact-test.html'] = wrapForTest(out['artifact.html']);
out['entry-demo-artifact-test.html'] = wrapForTest(out['entry-demo-artifact.html']);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const [name, html] of Object.entries(out)) {
  fs.writeFileSync(path.join(root, 'dist', name), html);
  console.log(name.padEnd(30), (html.length / 1024).toFixed(0) + ' KB');
}
