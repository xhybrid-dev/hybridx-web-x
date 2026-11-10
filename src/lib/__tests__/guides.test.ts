import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {} }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const { SAMPLE_GUIDES } = await import('../guides/fixtures');
const { GuideSchema, BlockSchema } = await import('../guides/types');
const { parseInline, isAllowedHref, disallowedLinks, plainText } = await import('../guides/inline');
const { relatedGuides, guidesByPillar } = await import('../guides/related');
const { guideJsonLd, jsonLdString } = await import('../guides/schema');
const { SITE_PAGES, PILLARS, TOOLS } = await import('../guides/topics');
const { CTAS } = await import('../guides/ctas');
const store = await import('../guides/store');
const { default: sitemap } = await import('../../app/sitemap');

/*
 * Articles are data, not code: these tests hold the line that keeps them so.
 * Text carries only bold, italic and allowed links; a workout cannot be saved
 * without both scaling options; a draft is never served; and every page an
 * article may link to is a real page in the sitemap.
 */

const sample = SAMPLE_GUIDES[0];
type Draft = Parameters<typeof store.saveGuide>[0];
const draftOf = (g: (typeof SAMPLE_GUIDES)[number]): Draft => {
  const { revision: _r, updatedAt: _u, ...rest } = g;
  return rest;
};

describe('inline text', () => {
  it('parses bold, italic and links, and leaves everything else as text', () => {
    expect(parseInline('Push **low**, then *drive*: see [the guide](/how-to-train-for-hyrox).')).toEqual([
      { kind: 'text', text: 'Push ' },
      { kind: 'bold', text: 'low' },
      { kind: 'text', text: ', then ' },
      { kind: 'italic', text: 'drive' },
      { kind: 'text', text: ': see ' },
      { kind: 'link', text: 'the guide', href: '/how-to-train-for-hyrox' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('treats HTML as text, never markup', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([{ kind: 'text', text: '<script>alert(1)</script>' }]);
  });

  it('allows links to listed pages, articles and the app only', () => {
    expect(isAllowedHref('/free-hyrox-plan')).toBe(true);
    expect(isAllowedHref('/guides/lift-or-run-first')).toBe(true);
    expect(isAllowedHref('/how-to-train-for-hyrox#faq')).toBe(true);
    expect(isAllowedHref('https://app.hybridx.club/signup')).toBe(true);
    expect(isAllowedHref('/not-a-page')).toBe(false);
    expect(isAllowedHref('https://example.com')).toBe(false);
    expect(isAllowedHref('javascript:alert(1)')).toBe(false);
    expect(isAllowedHref('//evil.example/free-hyrox-plan')).toBe(false);
    expect(isAllowedHref('/api/admin/leads')).toBe(false);
  });

  it('lists the links an article may not carry', () => {
    expect(disallowedLinks('[ok](/vdot) and [no](https://example.com)')).toEqual(['https://example.com']);
  });

  it('strips markup for plain text', () => {
    expect(plainText('**Lift** first, then [run](/vdot).')).toBe('Lift first, then run.');
  });
});

describe('the article schema', () => {
  it('accepts the sample articles', () => {
    for (const g of SAMPLE_GUIDES) expect(GuideSchema.safeParse(g).success, g.slug).toBe(true);
  });

  it('refuses a workout without both scaling options, or without RPE and rest', () => {
    const workout = sample.blocks.find((b) => b.type === 'workout')!;
    const { racePace: _rp, ...noRacePace } = workout as Extract<typeof workout, { type: 'workout' }>;
    expect(BlockSchema.safeParse(noRacePace).success).toBe(false);

    const noRest = JSON.parse(JSON.stringify(workout));
    delete noRest.beginner.rest;
    expect(BlockSchema.safeParse(noRest).success).toBe(false);
  });

  it('refuses a link to anywhere not allowed', () => {
    const r = BlockSchema.safeParse({ type: 'paragraph', text: 'See [this](https://example.com).' });
    expect(r.success).toBe(false);
  });

  it('refuses a table whose rows do not match the header, and more than three FAQs', () => {
    expect(BlockSchema.safeParse({ type: 'table', header: ['A', 'B'], rows: [['1']] }).success).toBe(false);
    const q = { question: 'Q?', answer: 'A.' };
    expect(BlockSchema.safeParse({ type: 'faq', items: [q, q, q, q] }).success).toBe(false);
  });

  it('refuses an unknown tool or CTA', () => {
    expect(BlockSchema.safeParse({ type: 'calculator', tool: 'made-up' }).success).toBe(false);
    expect(BlockSchema.safeParse({ type: 'cta', variant: 'app-store' }).success).toBe(false);
  });

  it('refuses a reserved slug, and a published article without a date', () => {
    expect(GuideSchema.safeParse({ ...sample, slug: 'how-we-write' }).success).toBe(false);
    expect(GuideSchema.safeParse({ ...sample, publishedAt: undefined }).success).toBe(false);
  });
});

describe('the store', () => {
  beforeEach(() => {
    db.reset();
    store.invalidateGuideCache();
  });

  it('numbers each save as the next revision and keeps every revision', async () => {
    const first = await store.saveGuide(draftOf(sample), new Date('2026-11-10T08:00:00Z'));
    const second = await store.saveGuide({ ...draftOf(sample), title: 'A new title' }, new Date('2026-11-10T09:00:00Z'));
    expect([first.revision, second.revision]).toEqual([1, 2]);
    expect(db.all('guideRevisions').map((r) => r.id).sort()).toEqual([
      'sled-push-without-a-sled__1',
      'sled-push-without-a-sled__2',
    ]);
    expect((db.all('guides')[0].data as { title: string }).title).toBe('A new title');
  });

  it('refuses to save an invalid article', async () => {
    await expect(store.saveGuide({ ...draftOf(sample), blocks: [] })).rejects.toThrow();
    expect(db.all('guides')).toEqual([]);
  });

  it('serves published and retired articles, never drafts', async () => {
    await store.saveGuide(draftOf(sample));
    await store.saveGuide({ ...draftOf(SAMPLE_GUIDES[1]), status: 'awaiting_review' });
    await store.saveGuide({
      ...draftOf(SAMPLE_GUIDES[1]),
      slug: 'old-article',
      status: 'retired',
      redirectTo: '/guides/sled-push-without-a-sled',
    });
    expect((await store.listPublishedGuides()).map((g) => g.slug)).toEqual(['sled-push-without-a-sled']);
    expect(await store.getPublicGuide('lift-or-run-first')).toBeNull();
    expect((await store.getPublicGuide('old-article'))?.redirectTo).toBe('/guides/sled-push-without-a-sled');
  });

  it('skips a malformed document instead of failing the list', async () => {
    await store.saveGuide(draftOf(sample));
    db.rawSet('guides', 'broken', { status: 'published', title: 'No blocks' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await store.listPublishedGuides()).map((g) => g.slug)).toEqual(['sled-push-without-a-sled']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[guides] skipped broken'));
    spy.mockRestore();
  });
});

describe('related articles', () => {
  const make = (slug: string, pillar: 'hyrox' | 'athx', day: number) => ({
    ...sample,
    slug,
    pillar,
    publishedAt: `2026-11-${String(day).padStart(2, '0')}T07:00:00Z`,
  });

  it('prefers the same pillar, newest first, then the newest elsewhere', () => {
    const all = [make('a', 'hyrox', 1), make('b', 'athx', 9), make('c', 'hyrox', 5), make('d', 'hyrox', 7)];
    expect(relatedGuides(all[0], all).map((g) => g.slug)).toEqual(['d', 'c', 'b']);
  });

  it('groups published articles by pillar', () => {
    const grouped = guidesByPillar([make('a', 'hyrox', 1), make('b', 'hyrox', 3), { ...make('c', 'athx', 2), status: 'retired' }]);
    expect(grouped.get('hyrox')!.map((g) => g.slug)).toEqual(['b', 'a']);
    expect(grouped.has('athx')).toBe(false);
  });
});

describe('structured data', () => {
  it('credits HybridX as author and Jon Lee as reviewer', () => {
    const [article, , page] = guideJsonLd(sample) as Array<Record<string, any>>;
    expect(article['@type']).toBe('Article');
    expect(article.author['@type']).toBe('Organization');
    expect(page.reviewedBy).toMatchObject({ '@type': 'Person', name: 'Jon Lee' });
  });

  it('never says Hyrox on an ATHX article', () => {
    const json = JSON.stringify(guideJsonLd({ ...sample, pillar: 'athx', title: 'Peaking for ATHX', description: 'Three zones.' }));
    expect(json).not.toMatch(/hyrox/i);
  });

  it('escapes "<" so article text cannot close the script element', () => {
    expect(jsonLdString({ t: '</script><script>' })).not.toContain('<');
  });
});

describe('the topic map', () => {
  it('lists only pages the sitemap lists, plus the guide pages themselves', async () => {
    const listed = new Set((await sitemap()).map((e) => e.url.replace('https://hybridx.club', '') || '/'));
    const missing = SITE_PAGES.map((p) => p.route).filter((r) => !listed.has(r));
    expect(missing).toEqual([]);
  });

  it('gives every pillar a listed page, and every tool a listed route', () => {
    const routes = new Set(SITE_PAGES.map((p) => p.route));
    for (const p of PILLARS) expect(routes.has(p.page), p.id).toBe(true);
    for (const [id, t] of Object.entries(TOOLS)) expect(routes.has(t.route), id).toBe(true);
  });

  it('sends every call to action to a page on this site', () => {
    const routes = new Set(SITE_PAGES.map((p) => p.route));
    for (const [id, c] of Object.entries(CTAS)) expect(routes.has(c.href), id).toBe(true);
  });
});
