import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {}, adminAuth: {} }));

const perf = await import('../guides/performance');
const store = await import('../guides/store');
const { GET } = await import('../../app/api/guides/out/route');
const { SAMPLE_GUIDES } = await import('../guides/fixtures');

/* Step 7: what each article earns, and the two flags that say it needs a look. */

const sample = SAMPLE_GUIDES[0];
const out = (query: string, ua = 'Mozilla/5.0') => GET(new NextRequest(`https://hybridx.club/api/guides/out?${query}`, { headers: { 'user-agent': ua } }));

beforeEach(() => {
  db.reset();
  store.invalidateGuideCache();
});

describe('the click counter', () => {
  it('counts a call to action and sends the reader on, credited to the article', async () => {
    await store.saveGuide(sample);
    const res = await out(`g=${sample.slug}&cta=free-plan`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`https://hybridx.club/free-hyrox-plan?src=guide-${sample.slug}`);
    await out(`g=${sample.slug}&tool=vdot`);
    expect(await perf.listClicks()).toMatchObject([{ slug: sample.slug, cta: 1, tool: 1 }]);
  });

  it('sends a tool click to the tool', async () => {
    expect((await out(`g=${sample.slug}&tool=vdot`)).headers.get('location')).toBe('https://hybridx.club/vdot');
  });

  it('never redirects anywhere the registry does not name', async () => {
    for (const q of ['g=x&cta=https://evil.example', 'g=x&tool=//evil.example', 'g=x', 'g=x&cta=constructor']) {
      expect((await out(q)).headers.get('location')).toBe('https://hybridx.club/guides');
    }
  });

  it('counts neither bots nor articles that are not published', async () => {
    await store.saveGuide(sample);
    await store.saveGuide({ ...sample, slug: 'a-draft', status: 'awaiting_review', publishedAt: undefined });
    await out(`g=${sample.slug}&cta=app`, 'Googlebot/2.1');
    await out('g=a-draft&cta=app');
    expect(await perf.listClicks()).toEqual([]);
  });
});

describe('leads per article', () => {
  it('counts leads whose src names an article, and nothing else', async () => {
    for (const src of ['guide-sled-push-without-a-sled', 'guide-sled-push-without-a-sled', 'guide-lift-or-run-first', 'direct', 'gym-poster']) {
      db.rawAdd('leads', { extra: { src } });
    }
    db.rawAdd('leads', { extra: {} });
    expect(Object.fromEntries(await perf.leadsByGuide())).toEqual({ 'sled-push-without-a-sled': 2, 'lift-or-run-first': 1 });
  });
});

describe('the performance rows', () => {
  const now = new Date('2027-03-01T09:00:00Z');
  const guide = (slug: string, publishedAt: string) => ({ slug, title: slug, status: 'published' as const, publishedAt });

  it('flags an article not indexed after 30 days, and one with few impressions after 90', () => {
    const rows = perf.performanceRows(
      [guide('new', '2027-02-20T07:00:00Z'), guide('month', '2027-01-20T07:00:00Z'), guide('old', '2026-11-20T07:00:00Z'), guide('good', '2026-11-20T07:00:00Z')],
      [
        { slug: 'month', index: { url: '', verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed', checkedAt: '' } },
        { slug: 'old', impressions: 40, index: { url: '', verdict: 'PASS', checkedAt: '' } },
        { slug: 'good', impressions: 900, clicks: 30, position: 6.1, index: { url: '', verdict: 'PASS', checkedAt: '' } },
      ],
      [{ slug: 'good', cta: 4, tool: 9 }],
      new Map([['good', 2]]),
      now,
    );
    expect(rows.map((r) => [r.slug, r.flags])).toEqual([
      ['new', []],
      ['month', ['not-indexed']],
      ['old', ['few-impressions']],
      ['good', []],
    ]);
    expect(rows[3]).toMatchObject({ indexed: 'yes', clicks: 30, ctaClicks: 4, toolClicks: 9, leads: 2, days: 101 });
  });

  it('leaves out anything not published', () => {
    expect(perf.performanceRows([{ slug: 'd', title: 'd', status: 'scheduled', publishedAt: undefined }], [], [], new Map(), now)).toEqual([]);
  });
});
