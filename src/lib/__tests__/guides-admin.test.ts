import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

const db = new FakeFirestore();
vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {}, adminAuth: {} }));

const { DEFAULT_SETTINGS, describeSlot, nextFreeSlot, zonedTime } = await import('../guides/slots');
const { SAMPLE_GUIDES } = await import('../guides/fixtures');
const store = await import('../guides/store');

/*
 * Step 3: when approved articles go live, and the state changes around review.
 * Slots are UK wall-clock times, so these tests cross both clock changes; a
 * slot computed in UTC would publish at 08:00 all summer.
 */

const at = (iso: string) => new Date(iso);
const slot = (after: string, taken: string[] = []) => nextFreeSlot(at(after), taken, DEFAULT_SETTINGS).toISOString();

describe('publishing slots', () => {
  it('turns 07:00 UK time into the right instant in winter and in summer', () => {
    expect(zonedTime(2026, 11, 16, '07:00', 'Europe/London').toISOString()).toBe('2026-11-16T07:00:00.000Z');
    expect(zonedTime(2026, 6, 15, '07:00', 'Europe/London').toISOString()).toBe('2026-06-15T06:00:00.000Z');
  });

  it('takes the next Monday, Wednesday or Friday at 07:00', () => {
    // Tuesday 10 November 2026, mid-morning.
    expect(slot('2026-11-10T10:00:00Z')).toBe('2026-11-11T07:00:00.000Z');
    // Wednesday before 07:00 gets Wednesday's slot; just after gets Friday's.
    expect(slot('2026-11-11T06:59:00Z')).toBe('2026-11-11T07:00:00.000Z');
    expect(slot('2026-11-11T07:00:00Z')).toBe('2026-11-13T07:00:00.000Z');
    // Friday afternoon rolls over the weekend to Monday.
    expect(slot('2026-11-13T15:00:00Z')).toBe('2026-11-16T07:00:00.000Z');
  });

  it('gives one article per slot', () => {
    const taken = ['2026-11-11T07:00:00.000Z', '2026-11-13T07:00:00.000Z'];
    expect(slot('2026-11-10T10:00:00Z', taken)).toBe('2026-11-16T07:00:00.000Z');
  });

  it('keeps 07:00 across the spring and autumn clock changes', () => {
    // Clocks go forward on Sunday 28 March 2027: Monday 29 March is BST.
    expect(slot('2027-03-27T12:00:00Z')).toBe('2027-03-29T06:00:00.000Z');
    // Clocks go back on Sunday 31 October 2027: Monday 1 November is GMT.
    expect(slot('2027-10-30T12:00:00Z')).toBe('2027-11-01T07:00:00.000Z');
  });

  it('follows the settings when the days or time change', () => {
    const tuesdays = { ...DEFAULT_SETTINGS, publishDays: [2], publishTime: '18:30' };
    expect(nextFreeSlot(at('2026-11-10T10:00:00Z'), [], tuesdays).toISOString()).toBe('2026-11-10T18:30:00.000Z');
  });

  it('describes a slot in UK time', () => {
    expect(describeSlot('2026-06-15T06:00:00.000Z')).toBe('Monday 15 June, 07:00');
  });
});

type Draft = Parameters<typeof store.saveGuide>[0];
const sample = SAMPLE_GUIDES[0];
const draft = (overrides: Partial<Draft> = {}): Draft => {
  const { revision: _r, updatedAt: _u, publishedAt: _p, ...rest } = sample;
  return { ...rest, status: 'awaiting_review', ...overrides };
};

describe('review state', () => {
  beforeEach(() => {
    db.reset();
    store.invalidateGuideCache();
  });

  it('changes status without counting a new revision', async () => {
    await store.saveGuide(draft());
    const scheduled = await store.updateGuideState(sample.slug, { status: 'scheduled', publishAt: '2026-11-11T07:00:00.000Z' });
    expect(scheduled.revision).toBe(1);
    expect(db.all('guideRevisions')).toHaveLength(1);
  });

  it('refuses an impossible state rather than saving it', async () => {
    await store.saveGuide(draft());
    await expect(store.updateGuideState(sample.slug, { status: 'scheduled' })).rejects.toThrow();
    await expect(store.updateGuideState(sample.slug, { status: 'published' })).rejects.toThrow();
    expect((await store.getGuide(sample.slug))?.status).toBe('awaiting_review');
  });

  it('removes a field set to undefined', async () => {
    await store.saveGuide(draft());
    await store.updateGuideState(sample.slug, { status: 'scheduled', publishAt: '2026-11-11T07:00:00.000Z' });
    const back = await store.updateGuideState(sample.slug, { status: 'awaiting_review', publishAt: undefined });
    expect(back.publishAt).toBeUndefined();
    expect('publishAt' in (db.all('guides')[0].data as object)).toBe(false);
  });

  it('shows a scheduled article from its slot, not before, without waiting for the hourly job', async () => {
    await store.saveGuide(draft({ status: 'scheduled', publishAt: '2026-11-11T07:00:00.000Z' }));
    expect(await store.listPublishedGuides(Date.parse('2026-11-11T06:59:00Z'))).toEqual([]);
    store.invalidateGuideCache();
    const live = await store.listPublishedGuides(Date.parse('2026-11-11T07:00:00Z'));
    expect(live.map((g) => [g.slug, g.status, g.publishedAt])).toEqual([[sample.slug, 'published', '2026-11-11T07:00:00.000Z']]);
  });

  it('records due articles as published, and leaves the rest scheduled', async () => {
    await store.saveGuide(draft({ status: 'scheduled', publishAt: '2026-11-11T07:00:00.000Z' }));
    await store.saveGuide(draft({ slug: 'later', status: 'scheduled', publishAt: '2026-11-13T07:00:00.000Z' }));
    const { published } = await store.publishDueGuides(at('2026-11-11T07:20:00Z'));
    expect(published).toEqual([sample.slug]);
    expect((await store.getGuide(sample.slug))?.status).toBe('published');
    expect((await store.getGuide('later'))?.status).toBe('scheduled');
    expect(await store.takenSlots()).toEqual(['2026-11-13T07:00:00.000Z']);
  });

  it('never serves a rejected article', async () => {
    await store.saveGuide(draft({ status: 'rejected', rejectionReason: 'Covered by the how-to guide already.' }));
    expect(await store.getPublicGuide(sample.slug)).toBeNull();
  });

  it('keeps comments per article, open until resolved', async () => {
    const id = await store.addComment({ slug: sample.slug, revision: 1, blockIndex: 2, text: 'Make the beginner option lighter.', by: 'jon' });
    await store.addComment({ slug: 'other', revision: 1, blockIndex: null, text: 'Elsewhere.', by: 'jon' });
    expect((await store.listComments(sample.slug)).map((c) => [c.blockIndex, c.status])).toEqual([[2, 'open']]);
    await store.resolveComment(id);
    expect((await store.listComments(sample.slug))[0].status).toBe('resolved');
  });

  it('lists revisions newest first', async () => {
    await store.saveGuide(draft());
    await store.saveGuide(draft({ title: 'Second title' }));
    expect((await store.listRevisions(sample.slug)).map((r) => r.revision)).toEqual([2, 1]);
  });
});

describe('engine settings', () => {
  beforeEach(() => db.reset());

  it('defaults to Monday, Wednesday and Friday at 07:00, emails 07:00 to 20:00', async () => {
    expect(await store.getEngineSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ publishDays: [1, 3, 5], publishTime: '07:00', emailFrom: '07:00', emailTo: '20:00' });
  });

  it('saves valid settings and refuses invalid ones', async () => {
    await store.saveEngineSettings({ ...DEFAULT_SETTINGS, paused: true });
    expect((await store.getEngineSettings()).paused).toBe(true);
    await expect(store.saveEngineSettings({ ...DEFAULT_SETTINGS, publishTime: '7am' })).rejects.toThrow();
  });

  it('sends review email to the saved address, else the first admin', () => {
    process.env.ADMIN_EMAILS = 'first@example.com, second@example.com';
    expect(store.reviewAddress(DEFAULT_SETTINGS)).toBe('first@example.com');
    expect(store.reviewAddress({ ...DEFAULT_SETTINGS, reviewAddress: 'reviews@example.com' })).toBe('reviews@example.com');
  });
});
