#!/usr/bin/env node
// Crawl a running copy of the site and report what search engines and social
// cards would read: title, description, canonical, social image and locale,
// headings, structured data in the HTML, robots, and security headers.
//
//   npm run build && npx next start -p 3100 &
//   node scripts/seo-crawl.mjs http://localhost:3100
//   node scripts/seo-crawl.mjs https://hybridx.club      (the live site)
//
// Exits 1 if any page has a problem, so it can gate a release. It only reads.

const base = (process.argv[2] || 'http://localhost:3100').replace(/\/$/, '');
const EXTRA = ['/hyrox-glasgow-2027/thanks', '/start', '/confirm', '/resend', '/does-not-exist-404-check'];

const tag = (html, re) => [...html.matchAll(re)].map((m) => m[1] ?? m[0]);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function get(path) {
  const res = await fetch(base + path, { redirect: 'manual', headers: { 'user-agent': 'hybridx-seo-crawl' } });
  return { res, html: res.status === 200 || res.status === 404 ? await res.text() : '' };
}

function analyse(path, status, headers, html) {
  const problems = [];
  const titles = tag(html, /<title[^>]*>([\s\S]*?)<\/title>/g).map(decode);
  const title = titles[0] ?? '';
  const meta = (name, attr = 'name') => {
    const m = html.match(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, 'i')) || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, 'i'));
    return m ? decode(m[1]) : '';
  };
  const description = meta('description');
  const canonical = (html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) || [])[1] || '';
  const ogImage = meta('og:image', 'property');
  const ogLocale = meta('og:locale', 'property');
  const twImage = meta('twitter:image');
  const robots = tag(html, /<meta[^>]*name="robots"[^>]*content="([^"]*)"/gi);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  const ld = (html.match(/<script type="application\/ld\+json"/g) || []).length;
  const noindex = robots.some((r) => /noindex/i.test(r)) || /noindex/i.test(headers.get('x-robots-tag') || '');

  if (status === 200 && !noindex) {
    if (titles.length !== 1) problems.push(`${titles.length} <title> tags`);
    if (title.length > 60) problems.push(`title ${title.length} chars`);
    if ((title.match(/HybridX/gi) || []).length > 1 && !/^HybridX/.test(title)) problems.push('brand twice in title');
    if (/\| HybridX Hub \| HybridX|HybridX Hub \| HybridX Hub/.test(title)) problems.push('double-branded title');
    if (description.length < 70 || description.length > 160) problems.push(`description ${description.length} chars`);
    if (!canonical) problems.push('no canonical');
    else if (!canonical.startsWith('https://hybridx.club') && !canonical.startsWith(base)) problems.push(`canonical off-site: ${canonical}`);
    if (!ogImage) problems.push('no og:image');
    if (!twImage) problems.push('no twitter:image');
    if (ogLocale && ogLocale !== 'en_GB') problems.push(`og:locale ${ogLocale}`);
    if (h1s !== 1) problems.push(`${h1s} <h1>`);
    if (ld === 0) problems.push('no JSON-LD in the HTML');
    if (robots.length > 1) problems.push(`${robots.length} robots meta tags`);
  }
  if (status === 404 && (titles.length !== 1 || robots.length !== 1)) problems.push(`404 page: ${titles.length} titles, ${robots.length} robots tags`);
  return { path, status, title, description, canonical, ogImage: !!ogImage, ogLocale, h1s, ld, noindex, problems };
}

const sitemap = await (await fetch(base + '/sitemap.xml')).text();
const paths = [...new Set([...tag(sitemap, /<loc>([^<]+)<\/loc>/g).map((u) => u.replace(/^https?:\/\/[^/]+/, '') || '/'), ...EXTRA])];

const rows = [];
for (const path of paths) {
  try {
    const { res, html } = await get(path);
    rows.push(analyse(path, res.status, res.headers, html));
  } catch (error) {
    rows.push({ path, status: 0, problems: [`fetch failed: ${error.message}`] });
  }
}

const headerCheck = await get('/');
const wanted = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const missing = wanted.filter((h) => !headerCheck.res.headers.get(h));
const powered = headerCheck.res.headers.get('x-powered-by');

let bad = 0;
for (const r of rows) {
  if (r.problems.length) {
    bad++;
    console.log(`${String(r.status).padEnd(4)} ${r.path}\n       ${r.problems.join('; ')}`);
  }
}
console.log(`\n${rows.length} pages, ${rows.length - bad} clean, ${bad} with problems`);
console.log(missing.length ? `Missing security headers on /: ${missing.join(', ')}` : 'All six security headers present on /');
if (powered) console.log(`x-powered-by is set: ${powered}`);
process.exit(bad || missing.length || powered ? 1 : 0);
