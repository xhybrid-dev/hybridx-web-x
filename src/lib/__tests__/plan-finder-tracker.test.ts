import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The tracker's switches (docs/08 C6). It must send nothing without an
// endpoint, without consent in the banner, or under Global Privacy Control or
// Do Not Track, and it must not write anything to the device.

const calls: { url: string; body: string }[] = [];
let consent: string | null;
let storageWrites: string[];

function browser(nav: Record<string, unknown> = {}) {
  storageWrites = [];
  const storage = {
    getItem: (k: string) => (k === 'hybridx-consent' && consent ? consent : null),
    setItem: (k: string) => storageWrites.push(k),
    removeItem: () => {},
  };
  vi.stubGlobal('window', {
    innerWidth: 390,
    location: { pathname: '/', search: '?utm_source=Instagram&utm_campaign=Spring Launch&email=a@b.co' },
    localStorage: storage,
    sessionStorage: storage,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal('navigator', { language: 'en-GB', doNotTrack: null, ...nav });
  vi.stubGlobal('document', { referrer: 'https://www.google.com/search?q=hyrox', documentElement: { lang: 'en' }, cookie: '' });
  vi.stubGlobal('fetch', (url: string, init: { body: string }) => {
    calls.push({ url, body: init.body });
    return Promise.resolve(new Response(null, { status: 204 }));
  });
}

const { createTracker } = await import('@/lib/plan-finder/tracker');

beforeEach(() => {
  calls.length = 0;
  consent = JSON.stringify({ v: 1, analytics: true, at: '2026-09-29' });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function run(endpoint = '/api/collect') {
  const t = createTracker({ endpoint, mode: 'entry', siteVersion: 'web-1' });
  t.track('page_view');
  t.track('q_answer', { step: 1, key: 'goal', value: 'first' });
  t.flush();
  return t;
}

describe('plan finder tracker', () => {
  it('sends batches when there is an endpoint and consent', () => {
    browser();
    const t = run();
    expect(t.on).toBe(true);
    expect(calls).toHaveLength(1);
    const batch = JSON.parse(calls[0].body);
    expect(batch.sid).toMatch(/^[0-9a-f]{32}$/);
    expect(batch.events.map((e: { n: string; q: number }) => [e.n, e.q])).toEqual([['page_view', 0], ['q_answer', 1]]);
    // Context: referrer host only, cleaned UTM tags, a width bucket; never the query string.
    expect(batch.ctx).toMatchObject({ ref: 'google.com', vw: 'phone', path: '/', utm: { utm_source: 'instagram', utm_campaign: 'spring-launch' } });
    expect(calls[0].body).not.toContain('a@b.co');
  });

  it('sends nothing with no endpoint', () => {
    browser();
    expect(run('').on).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('sends nothing until the visitor accepts in the banner, and nothing after they reject', () => {
    browser();
    consent = null;
    expect(run().on).toBe(false);
    consent = JSON.stringify({ v: 1, analytics: false, at: '2026-09-29' });
    expect(run().on).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('drops anything queued if consent is withdrawn before it is sent', () => {
    browser();
    const t = createTracker({ endpoint: '/api/collect', mode: 'entry', siteVersion: 'web-1' });
    t.track('page_view');
    consent = JSON.stringify({ v: 1, analytics: false, at: '2026-09-29' });
    vi.advanceTimersByTime(5000);
    t.flush();
    expect(calls).toHaveLength(0);
  });

  it('sends nothing under Global Privacy Control or Do Not Track, even with consent', () => {
    browser({ globalPrivacyControl: true });
    expect(run().on).toBe(false);
    browser({ doNotTrack: '1' });
    expect(run().on).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('writes nothing to the device (C11)', () => {
    browser();
    run();
    expect(storageWrites).toEqual([]);
  });

  it('stops at 400 events per page load', () => {
    browser();
    const t = createTracker({ endpoint: '/api/collect', mode: 'entry', siteVersion: 'web-1' });
    for (let i = 0; i < 450; i++) t.track('scroll_depth', { pct: 25 });
    t.flush();
    const sentEvents = calls.flatMap((c) => JSON.parse(c.body).events);
    expect(sentEvents).toHaveLength(400);
    expect(calls.every((c) => JSON.parse(c.body).events.length <= 50)).toBe(true);
  });
});
