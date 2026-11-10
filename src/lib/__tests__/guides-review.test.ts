import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {}, adminAuth: {} }));

let session: { uid: string; email: string } | null = { uid: 'u1', email: 'coach@example.com' };
vi.mock('@/lib/admin-auth', () => ({ getAdminSession: async () => session }));

// redirect() ends a server action by throwing; record where it was going.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`REDIRECT ${url}`), { url });
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const { SAMPLE_GUIDES } = await import('../guides/fixtures');
const store = await import('../guides/store');
const review = await import('../guides/review');
const actions = await import('../../app/admin/guides/actions');

/*
 * Step 3's review rules. Approval takes the next free Monday, Wednesday or
 * Friday slot; an article with placeholder text cannot be approved; turning
 * one down needs a reason; a retired article can only send readers to a page
 * on this site. Every action refuses to run without an admin session.
 */

type Draft = Parameters<typeof store.saveGuide>[0];
const sample = SAMPLE_GUIDES[0];
const draft = (overrides: Partial<Draft> = {}): Draft => {
  const { revision: _r, updatedAt: _u, publishedAt: _p, ...rest } = sample;
  return { ...rest, status: 'awaiting_review', ...overrides };
};
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
};
const redirectOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { url?: string }).url ?? `threw: ${(e as Error).message}`;
  }
  return 'no redirect';
};

beforeEach(() => {
  db.reset();
  store.invalidateGuideCache();
  session = { uid: 'u1', email: 'coach@example.com' };
});

describe('approving', () => {
  const tuesday = new Date('2026-11-10T10:00:00Z');

  it('schedules into the next free slot, one article per slot', async () => {
    await store.saveGuide(draft());
    await store.saveGuide(draft({ slug: 'second' }));
    expect((await review.approve(sample.slug, 'slot', tuesday)).publishAt).toBe('2026-11-11T07:00:00.000Z');
    expect((await review.approve('second', 'slot', tuesday)).publishAt).toBe('2026-11-13T07:00:00.000Z');
  });

  it('publishes straight away when asked', async () => {
    await store.saveGuide(draft());
    const g = await review.approve(sample.slug, 'now', tuesday);
    expect([g.status, g.publishedAt]).toEqual(['published', '2026-11-10T10:00:00.000Z']);
  });

  it('refuses an article that still has placeholder text', async () => {
    await store.saveGuide(review.newArticle('How long should I rest between rounds?', 'hyrox', 'rest-between-rounds'));
    await expect(review.approve('rest-between-rounds', 'slot', tuesday)).rejects.toThrow(/placeholder/);
  });

  it('refuses an article that is not waiting for review', async () => {
    await store.saveGuide(draft({ status: 'published', publishedAt: '2026-11-01T07:00:00Z' }));
    await expect(review.approve(sample.slug, 'slot', tuesday)).rejects.toBeInstanceOf(review.ReviewError);
  });

  it('can be undone before the slot', async () => {
    await store.saveGuide(draft());
    await review.approve(sample.slug, 'slot', tuesday);
    const back = await review.unschedule(sample.slug);
    expect([back.status, back.publishAt]).toEqual(['awaiting_review', undefined]);
  });
});

describe('turning down and retiring', () => {
  it('needs a reason to turn an article down, and keeps it', async () => {
    await store.saveGuide(draft());
    await expect(review.reject(sample.slug, ' ')).rejects.toThrow(/why/);
    const g = await review.reject(sample.slug, 'The how-to guide already answers this.');
    expect([g.status, g.rejectionReason]).toEqual(['rejected', 'The how-to guide already answers this.']);
  });

  it('retires a published article, sending readers only to a page on this site', async () => {
    await store.saveGuide(draft({ status: 'published', publishedAt: '2026-11-01T07:00:00Z' }));
    await expect(review.retire(sample.slug, 'https://example.com')).rejects.toThrow(/page on this site/);
    await expect(review.retire(sample.slug, `/guides/${sample.slug}`)).rejects.toThrow();
    expect((await review.retire(sample.slug, '/how-to-train-for-hyrox')).redirectTo).toBe('/how-to-train-for-hyrox');
  });

  it('makes addresses from titles', () => {
    expect(review.slugify('Should I lift or run first on the same day?')).toBe('should-i-lift-or-run-first-on-the-same-day');
    expect(review.slugify('Café — 5×5 & 10k!')).toBe('cafe-5-5-10k');
  });
});

describe('the server actions', () => {
  it('refuse to run without an admin session', async () => {
    session = null;
    await store.saveGuide(draft());
    for (const run of [
      () => actions.approveGuide(form({ slug: sample.slug, when: 'now' })),
      () => actions.rejectGuide(form({ slug: sample.slug, reason: 'No.' })),
      () => actions.commentOnGuide(form({ slug: sample.slug, text: 'Hi' })),
      () => actions.saveGuideEdit(sample.slug, { ...sample }),
    ]) {
      await expect(run()).rejects.toThrow('Not authorized');
    }
    expect((await store.getGuide(sample.slug))?.status).toBe('awaiting_review');
  });

  it('refuse a malformed slug', async () => {
    expect(await redirectOf(actions.approveGuide(form({ slug: '../etc', when: 'now' })))).toBe('threw: Bad request');
  });

  it('send a refusal back to the page as a message', async () => {
    await store.saveGuide(draft());
    const url = await redirectOf(actions.rejectGuide(form({ slug: sample.slug, reason: '' })));
    expect(url).toMatch(new RegExp(`^/admin/guides/${sample.slug}\\?error=`));
  });

  it('approve, then report where the article will go live', async () => {
    await store.saveGuide(draft());
    expect(await redirectOf(actions.approveGuide(form({ slug: sample.slug, when: 'slot' })))).toBe(`/admin/guides/${sample.slug}?done=scheduled`);
    expect((await store.getGuide(sample.slug))?.status).toBe('scheduled');
  });

  it('save a comment against a block of the current revision', async () => {
    await store.saveGuide(draft());
    await redirectOf(actions.commentOnGuide(form({ slug: sample.slug, text: 'Lighter beginner option.', blockIndex: '3' })));
    expect((await store.listComments(sample.slug)).map((c) => [c.blockIndex, c.revision, c.by])).toEqual([[3, 1, 'coach@example.com']]);
  });

  it('create a new article with a unique address and open it for editing', async () => {
    await store.saveGuide(draft({ slug: 'how-long-should-i-rest' }));
    const url = await redirectOf(actions.createGuide(form({ title: 'How long should I rest?', pillar: 'hyrox' })));
    expect(url).toBe('/admin/guides/how-long-should-i-rest-2/edit');
  });

  it('return edit problems by block number rather than saving', async () => {
    await store.saveGuide(draft());
    const blocks = sample.blocks.map((b) =>
      b.type === 'workout' ? { ...b, racePace: { ...b.racePace, rest: '' } } : b,
    );
    const result = await actions.saveGuideEdit(sample.slug, { ...sample, blocks });
    expect(result.ok).toBe(false);
    // The workout is the fourth block; numbering is from 1, as on the page.
    expect(!result.ok && result.errors[0]).toBe('Block 4 (workout) racePace.rest: is empty');
    expect((await store.getGuide(sample.slug))?.revision).toBe(1);
  });

  it('save a good edit as the next revision, keeping its status', async () => {
    await store.saveGuide(draft({ status: 'scheduled', publishAt: '2026-11-11T07:00:00.000Z' }));
    expect(await actions.saveGuideEdit(sample.slug, { ...sample, title: 'Train the sled push without a sled' })).toEqual({ ok: true });
    const g = await store.getGuide(sample.slug);
    expect([g?.revision, g?.status, g?.title]).toEqual([2, 'scheduled', 'Train the sled push without a sled']);
  });
});
