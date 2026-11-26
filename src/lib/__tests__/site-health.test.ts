import { describe, expect, it } from 'vitest';
import { analyseIndexablePage, errorsOf, SITE_TARGETS, type HealthIssue, type PageSnapshot } from '@/lib/site-health/analyse';
import { ALERT_COOLDOWN_MS, needsAlert, pagesDue, PAGES_PER_RUN, runSiteHealth, WINDOW_MS, type HealthDeps, type HealthState } from '@/lib/site-health/run';

const ORIGIN = 'https://hybridx.club';
const SECURITY = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const hdrs = (h: Record<string, string> = {}) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

function page(path: string, over: Partial<{ title: string; description: string; canonical: string | null; robots: string; h1: number; ld: string[]; ogImage: boolean; status: number; headers: Record<string, string> }> = {}): PageSnapshot {
  const o = { title: 'Pace Calculator | HybridX Hub', description: 'Work out your running pace, finish time or distance with this free calculator, in kilometres or miles.', canonical: `${ORIGIN}${path}`, robots: '', h1: 1, ld: ['{"@type":"WebPage"}'], ogImage: true, status: 200, headers: {}, ...over };
  const html = [
    `<html><head><title>${o.title}</title>`,
    `<meta name="description" content="${o.description}">`,
    o.canonical ? `<link rel="canonical" href="${o.canonical}">` : '',
    o.robots ? `<meta name="robots" content="${o.robots}">` : '',
    o.ogImage ? '<meta property="og:image" content="https://hybridx.club/og.png">' : '',
    ...o.ld.map((j) => `<script type="application/ld+json">${j}</script>`),
    '</head><body>',
    ...Array.from({ length: o.h1 }, () => '<h1>Hi</h1>'),
    '</body></html>',
  ].join('');
  return { path, status: o.status, location: null, headers: hdrs(o.headers), html: o.status === 200 ? html : '' };
}
const codes = (issues: HealthIssue[]) => issues.map((i) => i.code);

describe('a page in the sitemap', () => {
  it('passes when it is all there', () => {
    expect(analyseIndexablePage(ORIGIN, page('/vdot'))).toEqual([]);
  });

  it('treats the homepage canonical with or without its slash as the same page', () => {
    expect(analyseIndexablePage(ORIGIN, page('/', { canonical: ORIGIN }))).toEqual([]);
    expect(analyseIndexablePage(ORIGIN, page('/', { canonical: `${ORIGIN}/` }))).toEqual([]);
  });

  it.each([
    ['a server error', { status: 500 }, 'status'],
    ['marked noindex in the page', { robots: 'noindex, follow' }, 'noindex'],
    ['marked noindex in a header', { headers: { 'x-robots-tag': 'noindex' } }, 'noindex'],
    ['no canonical', { canonical: null }, 'canonical-missing'],
    ['a canonical off the site', { canonical: 'https://example.com/x' }, 'canonical-offsite'],
    ['a title that is empty', { title: '' }, 'title-missing'],
    ['structured data that is not JSON', { ld: ['{"@type": '] }, 'jsonld-invalid'],
  ] as const)('is an error: %s', (_what, over, code) => {
    const issues = analyseIndexablePage(ORIGIN, page('/vdot', over as never));
    expect(codes(errorsOf(issues))).toContain(code);
  });

  it('is only a warning when a page is untidy: long title, two h1s, no social image, no structured data, another canonical', () => {
    const issues = analyseIndexablePage(ORIGIN, page('/vdot', { title: 'x'.repeat(80), h1: 2, ogImage: false, ld: [], canonical: `${ORIGIN}/other` }));
    expect(errorsOf(issues)).toEqual([]);
    expect(codes(issues)).toEqual(expect.arrayContaining(['title-long', 'h1', 'og-image', 'jsonld-missing', 'canonical-other']));
  });

  it('is an error when a sitemap page redirects', () => {
    const snap: PageSnapshot = { path: '/old', status: 308, location: '/new', headers: hdrs(), html: '' };
    expect(codes(analyseIndexablePage(ORIGIN, snap))).toEqual(['redirect']);
  });
});

describe('the site-wide checks', () => {
  const target = (id: string) => SITE_TARGETS.find((t) => t.id === id)!;
  const res = (over: Partial<{ status: number; location: string | null; headers: Record<string, string>; body: string }>) => ({ status: 200, location: null, body: '', ...over, headers: hdrs(over.headers) });

  it('www: a permanent redirect to the apex is fine; anything else is an error', () => {
    expect(target('www').check(res({ status: 308, location: 'https://hybridx.club/' }), ORIGIN)).toEqual([]);
    expect(target('www').check(res({ status: 301, location: 'https://hybridx.club' }), ORIGIN)).toEqual([]);
    expect(codes(target('www').check(res({ status: 200 }), ORIGIN))).toEqual(['www']);
    expect(codes(target('www').check(res({ status: 307, location: 'https://hybridx.club/' }), ORIGIN))).toEqual(['www']);
    expect(codes(target('www').check(res({ status: 308, location: 'https://example.com/' }), ORIGIN))).toEqual(['www']);
  });

  it('robots.txt must name the sitemap, and the sitemap must list the site', () => {
    expect(target('robots').check(res({ body: 'User-agent: *\nSitemap: https://hybridx.club/sitemap.xml' }), ORIGIN)).toEqual([]);
    expect(codes(target('robots').check(res({ body: 'User-agent: *' }), ORIGIN))).toEqual(['robots']);
    expect(target('sitemap').check(res({ body: '<loc>x</loc>'.repeat(30) }), ORIGIN)).toEqual([]);
    expect(codes(target('sitemap').check(res({ body: '<loc>x</loc>' }), ORIGIN))).toEqual(['sitemap']);
  });

  it('a missing page must be a real 404 and not indexed: a soft 404 is an error', () => {
    expect(target('not-found').check(res({ status: 404, body: '<meta name="robots" content="noindex">' }), ORIGIN)).toEqual([]);
    expect(codes(errorsOf(target('not-found').check(res({ status: 200 }), ORIGIN)))).toEqual(['not-found']);
  });

  it('the events feed must list races, at least one still to come; an empty one is an error, a stale one only a warning', () => {
    const now = new Date('2026-11-25T10:00:00Z');
    const feed = (events: unknown) => res({ body: JSON.stringify({ events }) });
    expect(target('events').check(feed([{ startDate: '2027-03-13', endDate: '2027-03-15' }]), ORIGIN, now)).toEqual([]);
    expect(target('events').check(feed([{ startDate: '2026-11-25', endDate: null }]), ORIGIN, now)).toEqual([]);
    expect(codes(errorsOf(target('events').check(feed([]), ORIGIN, now)))).toEqual(['events']);
    expect(codes(errorsOf(target('events').check(res({ status: 500 }), ORIGIN, now)))).toEqual(['events']);
    expect(codes(errorsOf(target('events').check(res({ body: 'not json' }), ORIGIN, now)))).toEqual(['events']);
    const stale = target('events').check(feed([{ startDate: '2025-03-13', endDate: '2025-03-15' }]), ORIGIN, now);
    expect(codes(stale)).toEqual(['events-stale']);
    expect(errorsOf(stale)).toEqual([]);
  });

  it('the homepage must carry all six security headers and not announce its stack', () => {
    const all = Object.fromEntries(SECURITY.map((h) => [h, 'x']));
    expect(target('headers').check(res({ headers: all }), ORIGIN)).toEqual([]);
    expect(codes(target('headers').check(res({ headers: { ...all, 'x-frame-options': '' } }), ORIGIN))).toEqual(['headers']);
    expect(codes(target('headers').check(res({ headers: { ...all, 'x-powered-by': 'Next.js' } }), ORIGIN))).toEqual(['powered-by']);
  });
});

/* ── The runner, against stand-ins ─────────────────────────────────────── */

function harness(opts: { paths?: string[]; states?: HealthState[]; broken?: Record<string, Partial<Parameters<typeof page>[1]>>; throwFor?: string[]; address?: boolean; tick?: number } = {}) {
  const paths = opts.paths ?? ['/a', '/b', '/c'];
  let clock = Date.parse('2026-11-25T10:00:00Z');
  const saved: HealthState[] = [];
  const deleted: string[] = [];
  const alerts: { label: string; issues: HealthIssue[] }[][] = [];
  const fetched: string[] = [];
  const deps: HealthDeps = {
    origin: ORIGIN,
    paths: async () => paths,
    fetchPage: async (path) => {
      fetched.push(path);
      clock += opts.tick ?? 0;
      if (opts.throwFor?.includes(path)) throw new Error('timeout');
      return page(path, opts.broken?.[path] as never);
    },
    fetchTarget: async (t) => {
      const base = { status: 200, location: null as string | null, headers: hdrs(Object.fromEntries(SECURITY.map((h) => [h, 'x']))), body: '<loc>x</loc>'.repeat(30) + '\nSitemap: x\n' + 'x'.repeat(300) };
      if (t.id === 'www') return { ...base, status: 308, location: 'https://hybridx.club/' };
      if (t.id === 'not-found') return { ...base, status: 404, body: '<meta name="robots" content="noindex">' };
      if (t.id === 'events') return { ...base, body: JSON.stringify({ events: [{ name: 'HYROX London', startDate: '2027-03-13', endDate: '2027-03-15' }] }) };
      return base;
    },
    loadStates: async () => opts.states ?? [],
    saveStates: async (s) => void saved.push(...s),
    deleteStates: async (k) => void deleted.push(...k),
    alert: async (items) => {
      if (opts.address === false) return false;
      alerts.push(items);
      return true;
    },
    now: () => new Date(clock),
  };
  return { deps, saved, deleted, alerts, fetched, advance: (ms: number) => void (clock += ms) };
}

describe('which pages are looked at', () => {
  it('takes the never-checked first, then the longest since checked, and no more than a run allows', () => {
    const states = [
      { key: 'page:/a', kind: 'page', label: '/a', checkedAt: '2026-11-25T09:00:00Z', issues: [] },
      { key: 'page:/b', kind: 'page', label: '/b', checkedAt: '2026-11-25T07:00:00Z', issues: [] },
    ] as HealthState[];
    expect(pagesDue(['/a', '/b', '/c'], states, 2)).toEqual(['/c', '/b']);
    expect(pagesDue(Array.from({ length: 30 }, (_, i) => `/p${i}`), [])).toHaveLength(PAGES_PER_RUN);
  });
});

describe('a run', () => {
  it('checks the site-wide targets and the due pages, writes a record for each, and is quiet when all is well', async () => {
    const h = harness();
    const out = await runSiteHealth(h.deps);
    expect(out).toMatchObject({ checked: SITE_TARGETS.length + 3, errors: 0, alerted: 0 });
    expect(h.saved.map((s) => s.key)).toEqual(expect.arrayContaining(['page:/a', 'site:www']));
    expect(h.alerts).toEqual([]);
  });

  it('emails once for a newly broken page, naming it and what is wrong', async () => {
    const h = harness({ broken: { '/b': { robots: 'noindex' } } });
    const out = await runSiteHealth(h.deps);
    expect(out.errors).toBe(1);
    expect(out.alerted).toBe(1);
    expect(h.alerts).toHaveLength(1);
    expect(h.alerts[0][0].label).toBe('/b');
    expect(h.alerts[0][0].issues[0].code).toBe('noindex');
    expect(h.saved.find((s) => s.key === 'page:/b')?.alertedAt).toBeDefined();
  });

  it('does not email again for the same problem inside the cooldown, and does after it', async () => {
    const alertedAt = '2026-11-25T08:00:00.000Z';
    const prev = { key: 'page:/b', kind: 'page', label: '/b', path: '/b', checkedAt: '2026-11-25T09:00:00Z', alertedAt, issues: [{ code: 'noindex', severity: 'error', message: 'x' }] } as HealthState;
    const quiet = harness({ states: [prev], broken: { '/b': { robots: 'noindex' } } });
    expect((await runSiteHealth(quiet.deps)).alerted).toBe(0);
    expect(quiet.saved.find((s) => s.key === 'page:/b')?.alertedAt).toBe(alertedAt);

    expect(needsAlert({ issues: prev.issues }, { alertedAt }, new Date(Date.parse(alertedAt) + ALERT_COOLDOWN_MS))).toBe(true);
    expect(needsAlert({ issues: prev.issues }, { alertedAt }, new Date(Date.parse(alertedAt) + ALERT_COOLDOWN_MS - 1))).toBe(false);
  });

  it('forgets the alert when the page recovers, so the next break is emailed straight away', async () => {
    const prev = { key: 'page:/b', kind: 'page', label: '/b', path: '/b', checkedAt: '2026-11-25T09:00:00Z', alertedAt: '2026-11-25T08:00:00.000Z', issues: [{ code: 'noindex', severity: 'error', message: 'x' }] } as HealthState;
    const h = harness({ states: [prev] });
    await runSiteHealth(h.deps);
    expect(h.saved.find((s) => s.key === 'page:/b')?.alertedAt).toBeUndefined();
  });

  it('never emails for a tidy-up', async () => {
    const h = harness({ broken: { '/a': { title: 'x'.repeat(90) } } });
    const out = await runSiteHealth(h.deps);
    expect(out).toMatchObject({ errors: 0, warnings: 1, alerted: 0 });
  });

  it('counts a page that cannot be fetched as an error', async () => {
    const h = harness({ throwFor: ['/c'] });
    const out = await runSiteHealth(h.deps);
    expect(out.errors).toBe(1);
    expect(h.alerts[0][0].issues[0].message).toContain('Could not be fetched: timeout');
  });

  it('does not record an email as sent when there is nobody to send it to, so it is tried again', async () => {
    const h = harness({ broken: { '/b': { robots: 'noindex' } }, address: false });
    const out = await runSiteHealth(h.deps);
    expect(out.alerted).toBe(0);
    expect(h.saved.find((s) => s.key === 'page:/b')?.alertedAt).toBeUndefined();
  });

  it('drops the record of a page that has left the sitemap', async () => {
    const gone = { key: 'page:/retired', kind: 'page', label: '/retired', path: '/retired', checkedAt: '2026-11-24T00:00:00Z', issues: [{ code: 'status', severity: 'error', message: 'x' }] } as HealthState;
    const h = harness({ states: [gone] });
    await runSiteHealth(h.deps);
    expect(h.deleted).toEqual(['page:/retired']);
  });

  it('starts no new request once its time window has passed', async () => {
    const h = harness({ paths: Array.from({ length: 10 }, (_, i) => `/p${i}`), tick: WINDOW_MS });
    const out = await runSiteHealth(h.deps);
    expect(h.fetched.length).toBeLessThan(10);
    expect(out.checked).toBeLessThan(SITE_TARGETS.length + 10);
  });
});
