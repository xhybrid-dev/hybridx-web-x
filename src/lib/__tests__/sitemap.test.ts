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

const { default: sitemap } = await import('../../app/sitemap');

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

/** Pages whose canonical address is a subdomain, so their hybridx.club copy is not listed. */
const SUBDOMAIN_CANONICAL: Record<string, string> = {
  '/race': 'https://race.hybridx.club',
  '/streak': 'https://streak.hybridx.club',
  '/trail': 'https://trail.hybridx.club',
};

/** Reached only by a rewrite and redirected to "/" on a direct visit. */
const REDIRECTED = ['/home-control'];

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
  process.env.SHOP_SALES_OPEN = 'true';
  process.env.SHOP_SALES_CLOSE_AT = '2099-01-01T00:00:00Z';
});

describe('the main sitemap', () => {
  it('lists every page that is not deliberately left out', async () => {
    const listed = new Set((await sitemap()).map((e) => e.url.replace(BASE, '') || '/'));
    const left = new Set([...NOINDEX, ...Object.keys(SUBDOMAIN_CANONICAL), ...REDIRECTED]);

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
    for (const u of urls) expect(routes.has(u), `${u} has no page`).toBe(true);
    for (const r of [...NOINDEX, ...Object.keys(SUBDOMAIN_CANONICAL), ...REDIRECTED]) {
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
    for (const [r, canonical] of Object.entries(SUBDOMAIN_CANONICAL)) {
      expect(readFileSync(byRoute.get(r)!, 'utf8'), `${r} canonical`).toContain(`'${canonical}'`);
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
});

describe('the subdomain sitemaps', () => {
  it.each([
    ['race.hybridx.club', 'https://race.hybridx.club'],
    ['streak.hybridx.club', 'https://streak.hybridx.club'],
    ['trail.hybridx.club', 'https://trail.hybridx.club'],
  ])('%s lists only its own address', async (host, root) => {
    requestHeaders = { 'x-forwarded-host': host };
    expect((await sitemap()).map((e) => e.url)).toEqual([root]);
  });

  it('reads the forwarded host before the plain one, and the first of several', async () => {
    requestHeaders = { host: 'internal.run.app', 'x-forwarded-host': 'trail.hybridx.club, proxy.example' };
    expect((await sitemap()).map((e) => e.url)).toEqual(['https://trail.hybridx.club']);
  });

  it('works for a local subdomain host', async () => {
    requestHeaders = { host: 'race.localhost:9002' };
    expect((await sitemap()).map((e) => e.url)).toEqual(['https://race.hybridx.club']);
  });

  it('gives the full sitemap on the main host and on the backend address', async () => {
    for (const host of ['hybridx.club', 'www.hybridx.club', 'hybridx-web-x--hybridx-hub.europe-west4.hosted.app', '']) {
      requestHeaders = host ? { 'x-forwarded-host': host } : {};
      expect((await sitemap()).length, host || '(no host)').toBeGreaterThan(20);
    }
  });
});
