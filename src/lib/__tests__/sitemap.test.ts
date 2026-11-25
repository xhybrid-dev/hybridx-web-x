import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * The sitemap is a hand-kept list, which is how pages end up missing from it
 * without anything failing. This test walks src/app and requires every page to
 * be either listed or deliberately left out, with the reason checked against
 * the page itself.
 */

let requestHeaders: Record<string, string> = {};
vi.mock('next/headers', () => ({ headers: async () => new Headers(requestHeaders) }));

// Articles come from Firestore. Never reach for the real one here: the list is
// whatever a test sets, and a test can make the read fail.
let publishedGuides: () => Promise<Array<{ slug: string; updatedAt: string }>> = async () => [];
vi.mock('@/lib/guides/store', () => ({ listPublishedGuides: () => publishedGuides() }));

const { default: sitemap } = await import('../sitemap');

const APP_DIR = path.resolve(__dirname, '../../app');
const BASE = 'https://hybridx.club';

function pageRoutes(dir = APP_DIR, prefix = ''): Array<{ route: string; file: string }> {
  const out: Array<{ route: string; file: string }> = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'api') continue;
      out.push(...pageRoutes(full, `${prefix}/${name}`));
    } else if (name === 'page.tsx') {
      out.push({ route: prefix || '/', file: full });
    }
  }
  return out;
}

/** Pages that carry noindex, and so must stay out of the sitemap. */
const NOINDEX = [
  '/start',
  '/12-week-hyrox',
  '/confirm',
  '/resend',
  '/athx-2027/confirm',
  '/hyrox-rule-changes-2026/confirm',
  '/hyrox-glasgow-2027/thanks',
  '/hyrox-glasgow-2027/sample',
];

/**
 * Pages that are noindex only some of the time. The shop page is noindex while
 * sales are not open and is listed only while they are; 'lists the shop page
 * while sales are open, and not before or after' below holds that to account.
 */
const CONDITIONALLY_NOINDEX = ['/hyrox-glasgow-2027'];

/** Any of the ways a page in this codebase says "do not index me". */
const NOINDEX_MARKER = /index:\s*false|noIndex:\s*true|['"]noindex/;

const isExcludedByRule = (route: string) => route.startsWith('/admin') || route.includes('[');

beforeEach(() => {
  requestHeaders = {};
  publishedGuides = async () => [];
  process.env.SHOP_SALES_OPEN = 'true';
  process.env.SHOP_SALES_CLOSE_AT = '2099-01-01T00:00:00Z';
});

describe('the main sitemap', () => {
  it('lists every page that is not deliberately left out', async () => {
    const listed = new Set((await sitemap()).map((e) => e.url.replace(BASE, '') || '/'));
    const left = new Set([...NOINDEX]);

    const missing = pageRoutes()
      .map((p) => p.route)
      .filter((r) => !isExcludedByRule(r) && !left.has(r) && !listed.has(r === '/' ? '/' : r));
    expect(missing, 'pages on disk that are neither in the sitemap nor deliberately left out').toEqual([]);
  });

  it('never lists a page that marks itself noindex, whether or not it is in the lists above', async () => {
    const listed = new Set((await sitemap()).map((e) => e.url.replace(BASE, '') || '/'));
    const offenders = pageRoutes()
      .filter((p) => NOINDEX_MARKER.test(readFileSync(p.file, 'utf8')))
      .map((p) => p.route)
      .filter((r) => !CONDITIONALLY_NOINDEX.includes(r) && listed.has(r));
    expect(offenders, 'listed in the sitemap but marked noindex: Search Console reports these as errors').toEqual([]);
  });

  it('does not list a page that is left out or does not exist', async () => {
    const urls = (await sitemap()).map((e) => e.url.replace(BASE, '') || '/');
    const routes = new Set(pageRoutes().map((p) => p.route));
    const page = (u: string) => (/^\/guides\/[a-z0-9-]+$/.test(u) && !routes.has(u) ? '/guides/[slug]' : u);
    for (const u of urls) expect(routes.has(page(u)), `${u} has no page`).toBe(true);
    for (const r of [...NOINDEX]) {
      expect(urls, r).not.toContain(r);
    }
    expect(urls.some((u) => u.startsWith('/admin') || u.startsWith('/d/'))).toBe(false);
  });

  it('keeps the exclusion lists honest against the pages themselves', () => {
    const byRoute = new Map(pageRoutes().map((p) => [p.route, p.file]));
    for (const r of NOINDEX) {
      const src = readFileSync(byRoute.get(r)!, 'utf8');
      expect(NOINDEX_MARKER.test(src), `${r} is listed as noindex but is not`).toBe(true);
    }
    // A page on the main site names the main site as its canonical: the three
    // single-app pages once named subdomains that have no DNS record.
    for (const r of ['/race', '/streak', '/trail']) {
      const src = readFileSync(byRoute.get(r)!, 'utf8');
      expect(src, `${r} canonical`).toContain(`'https://hybridx.club${r}'`);
      expect(src, `${r} canonical`).not.toMatch(/https:\/\/(race|streak|trail)\.hybridx\.club/);
    }
  });

  it('has each address once, on the main host, with no query strings', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) {
      expect(u.startsWith(BASE)).toBe(true);
      expect(u).not.toMatch(/[?#]/);
      expect(u.endsWith('/') && u !== `${BASE}/`).toBe(false);
    }
  });

  it('lists the shop page while sales are open, and not before or after', async () => {
    expect((await sitemap()).map((e) => e.url)).toContain(`${BASE}/hyrox-glasgow-2027`);
    process.env.SHOP_SALES_OPEN = 'false';
    expect((await sitemap()).map((e) => e.url)).not.toContain(`${BASE}/hyrox-glasgow-2027`);
    process.env.SHOP_SALES_OPEN = 'true';
    process.env.SHOP_SALES_CLOSE_AT = '2020-01-01T00:00:00Z';
    expect((await sitemap()).map((e) => e.url)).not.toContain(`${BASE}/hyrox-glasgow-2027`);
  });

  it('lists the terms page', async () => {
    expect((await sitemap()).map((e) => e.url)).toContain(`${BASE}/shop-terms`);
  });

  it('lists published articles with the date each last changed', async () => {
    publishedGuides = async () => [{ slug: 'lift-or-run-first', updatedAt: '2026-11-08T07:00:00Z' }];
    const entry = (await sitemap()).find((e) => e.url === `${BASE}/guides/lift-or-run-first`);
    expect(entry?.lastModified).toBe('2026-11-08T07:00:00Z');
  });

  it('never dates anything "now"', async () => {
    // A lastmod of "now" on every fetch teaches Google to ignore lastmod for
    // the whole sitemap, articles included. Two fetches must give the same dates.
    const first = (await sitemap()).map((e) => e.lastModified);
    await new Promise((r) => setTimeout(r, 5));
    expect((await sitemap()).map((e) => e.lastModified)).toEqual(first);
    const today = new Date().toISOString().slice(0, 10);
    expect(first.filter((d) => String(d ?? '').startsWith(today) && !/^\d{4}-\d{2}-\d{2}$/.test(String(d)))).toEqual([]);
  });

  it('still answers, without articles, when Firestore cannot be read', async () => {
    publishedGuides = async () => {
      throw new Error('unavailable');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/guides`);
    expect(urls.some((u) => u.startsWith(`${BASE}/guides/`) && !u.endsWith('/how-we-write'))).toBe(false);
    spy.mockRestore();
  });
});

describe('any host', () => {
  it('gets the full sitemap, whatever host asked', async () => {
    for (const host of ['hybridx.club', 'www.hybridx.club', 'race.hybridx.club', 'hybridx-web-x--hybridx-hub.europe-west4.hosted.app', '']) {
      requestHeaders = host ? { 'x-forwarded-host': host } : {};
      expect((await sitemap()).length, host || '(no host)').toBeGreaterThan(20);
    }
  });

  it('lists the three single-app pages on the main host', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const r of ['/race', '/streak', '/trail']) expect(urls).toContain(`${BASE}${r}`);
  });
});

describe('the /sitemap.xml route', () => {
  it('serves XML the CDN may keep for an hour', async () => {
    const { GET } = await import('../../app/sitemap.xml/route');
    const res = await GET();
    expect(res.headers.get('content-type')).toContain('application/xml');
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
    const xml = await res.text();
    expect(xml).toMatch(/^<\?xml version="1.0"/);
    expect(xml).toContain('<loc>https://hybridx.club</loc>');
  });
});

describe('lastmod on hand-built pages', () => {
  it('gives every main-site page a fixed date', async () => {
    const missing = (await sitemap()).filter((e) => e.url.startsWith(BASE) && !e.lastModified).map((e) => e.url);
    expect(missing).toEqual([]);
  });

  it('never dates a page earlier than its last commit: edit a page, bump its date in page-dates.ts', async () => {
    const { execFileSync } = await import('node:child_process');
    const { PAGE_UPDATED } = await import('../page-dates');
    let git = true;
    try {
      execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
    } catch {
      git = false;
    }
    if (!git) return; // a checkout without history: nothing to compare against
    const stale: string[] = [];
    for (const [route, date] of Object.entries(PAGE_UPDATED)) {
      const file = path.join('src/app', route, 'page.tsx');
      const last = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim();
      if (last && last > date) stale.push(`${route}: page changed ${last}, dated ${date}`);
    }
    expect(stale).toEqual([]);
  });
});
