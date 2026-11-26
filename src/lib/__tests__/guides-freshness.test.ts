import { describe, expect, it } from 'vitest';
import { SAMPLE_GUIDES } from '@/lib/guides/fixtures';
import { describeDue, guideSeason, lastLookedAt, LEGACY_SEASON, REVIEW_INTERVAL_DAYS, reviewsDue } from '@/lib/guides/freshness';
import { GuideSchema, type Guide } from '@/lib/guides/types';
import { guideJsonLd } from '@/lib/guides/schema';

const base = SAMPLE_GUIDES[0];
const guide = (patch: Partial<Guide>): Guide => ({ ...base, status: 'published', publishedAt: '2026-11-10T07:00:00.000Z', updatedAt: '2026-11-10T07:00:00.000Z', ...patch });
const at = (iso: string) => new Date(iso);

describe('which guides are due a look', () => {
  it('lists none that were just written for this season', () => {
    expect(reviewsDue([guide({ season: '2026/27' })], at('2026-11-25T00:00:00Z'), '2026/27')).toEqual([]);
  });

  it('counts a guide with no season as written for the season the engine launched in', () => {
    expect(guideSeason(guide({ season: undefined }))).toBe(LEGACY_SEASON);
    expect(reviewsDue([guide({ season: undefined })], at('2026-11-25T00:00:00Z'), '2026/27')).toEqual([]);
  });

  it('lists every guide at once when the season changes, ahead of those merely old', () => {
    const old = guide({ slug: 'old-one', season: '2026/27', updatedAt: '2026-01-01T00:00:00.000Z' });
    const mine = guide({ slug: 'fresh-one', season: '2026/27' });
    const due = reviewsDue([old, mine], at('2027-09-01T00:00:00Z'), '2027/28');
    expect(due.map((d) => d.slug)).toEqual(['old-one', 'fresh-one']);
    expect(due.every((d) => d.reasons.includes('season'))).toBe(true);
  });

  it('lists a guide nobody has looked at for six months, and not before', () => {
    const g = guide({ season: '2026/27' });
    const day = (n: number) => new Date(Date.parse(g.updatedAt) + n * 86_400_000);
    expect(reviewsDue([g], day(REVIEW_INTERVAL_DAYS - 1), '2026/27')).toEqual([]);
    const due = reviewsDue([g], day(REVIEW_INTERVAL_DAYS), '2026/27');
    expect(due).toHaveLength(1);
    expect(due[0].reasons).toEqual(['age']);
  });

  it('is cleared by a check, which counts as a look without being an edit', () => {
    const g = guide({ season: '2026/27', checkedAt: '2027-04-01T00:00:00.000Z' });
    expect(lastLookedAt(g)).toBe('2027-04-01T00:00:00.000Z');
    expect(reviewsDue([g], at('2027-05-01T00:00:00Z'), '2026/27')).toEqual([]);
  });

  it('ignores a guide that is not published', () => {
    expect(reviewsDue([guide({ status: 'awaiting_review', season: '2020/21' })], at('2030-01-01T00:00:00Z'), '2026/27')).toEqual([]);
  });

  it('says why, plainly', () => {
    const [d] = reviewsDue([guide({ season: '2026/27' })], at('2027-09-01T00:00:00Z'), '2027/28');
    expect(describeDue(d, '2027/28')).toMatch(/written for the 2026\/27 rules; the current season is 2027\/28/);
  });
});

describe('what a check changes on the page', () => {
  it('is accepted by the schema, and a malformed season is not', () => {
    expect(GuideSchema.safeParse({ ...base, season: '2026/27', checkedAt: '2026-11-25T10:00:00.000Z' }).success).toBe(true);
    expect(GuideSchema.safeParse({ ...base, season: 'last year' }).success).toBe(false);
  });

  it('moves lastReviewed, but never dateModified, which only content changes move', () => {
    const g = guide({ season: '2026/27', checkedAt: '2027-04-01T00:00:00.000Z' });
    const ld = guideJsonLd(g) as { '@type': string; dateModified?: string; lastReviewed?: string }[];
    expect(ld.find((o) => o['@type'] === 'WebPage')?.lastReviewed).toBe('2027-04-01');
    expect(ld.find((o) => o['@type'] === 'Article' || o['@type'] === 'BlogPosting')?.dateModified?.slice(0, 10)).toBe('2026-11-10');
  });
});
