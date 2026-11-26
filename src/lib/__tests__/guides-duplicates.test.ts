// Two articles must not answer one question, and the dates in an article's
// structured data must be in order.
//
// Two of the first three live guides were "can you do 100 unbroken air squats
// before 100 wall balls", published two hours apart and each listing the other
// as related. The only checks were an identical title and a 3-gram overlap of
// the body (0.037 for that pair). The pair's titles score 0.78 on the same
// words the related-articles score uses.

import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_GUIDES } from '../guides/fixtures';
import { checkDraft } from '../guides/checks';
import { APPROVE_BLOCK_OVERLAP, DUPLICATE_TITLE_OVERLAP, findDuplicates } from '../guides/duplicates';
import type { Guide } from '../guides/types';

vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: {} }));

const sample = SAMPLE_GUIDES[0];
const codes = (r: ReturnType<typeof checkDraft>, kind: 'errors' | 'warnings' = 'errors') => r[kind].map((i) => i.code);

const FIRST = 'Can you do 100 unbroken air squats first?';
const SECOND = 'Before you try 100 wall balls: can you do 100 unbroken air squats?';

describe('findDuplicates', () => {
  it('sees the two live air squat articles as one question', () => {
    const [d] = findDuplicates(SECOND, [{ label: '/guides/a', title: FIRST }]);
    expect(d.score).toBeGreaterThanOrEqual(DUPLICATE_TITLE_OVERLAP);
  });

  it('leaves two different questions alone', () => {
    expect(
      findDuplicates('How should you pace the sled push?', [
        { label: '/guides/a', title: FIRST },
        { label: '/guides/b', title: 'Singles or doubles for a first HYROX?' },
      ]),
    ).toEqual([]);
  });

  it('sorts the strongest match first and respects the threshold', () => {
    const found = findDuplicates(
      'Can you do 100 unbroken air squats?',
      [
        { label: '/guides/loose', title: 'Air squats and sled push strength' },
        { label: '/guides/close', title: FIRST },
      ],
      0.3,
    );
    expect(found[0].other.label).toBe('/guides/close');
    expect(DUPLICATE_TITLE_OVERLAP).toBeLessThan(APPROVE_BLOCK_OVERLAP);
  });
});

describe('checkDraft', () => {
  const published = (title: string, slug = 'existing'): Guide => ({ ...sample, slug, title });

  it('stops a draft that asks a question a published article already answers', () => {
    const draft: Guide = { ...sample, slug: 'second', title: SECOND };
    const r = checkDraft(draft, [published(FIRST)], { fromModel: true });
    expect(codes(r)).toContain('duplicate-topic');
    expect(r.errors.find((e) => e.code === 'duplicate-topic')?.message).toContain('/guides/existing');
  });

  it('stops one that duplicates an article still waiting for review, not just published ones', () => {
    const draft: Guide = { ...sample, slug: 'second', title: SECOND };
    const r = checkDraft(draft, [], { fromModel: true, inProgress: [published(FIRST, 'waiting')] });
    expect(codes(r)).toContain('duplicate-topic');
  });

  it('does not compare an article with itself', () => {
    const r = checkDraft({ ...sample, title: FIRST }, [{ ...sample, title: FIRST }], { fromModel: true });
    expect(codes(r)).not.toContain('duplicate-topic');
  });

  it('catches "after 7 km of running" near the wall balls', () => {
    const bad: Guide = {
      ...sample,
      blocks: [...sample.blocks, { type: 'paragraph', text: 'The 100 wall balls arrive after 7 km of running, so your legs are already full.' }],
    };
    expect(codes(checkDraft(bad))).toContain('run-distance');
    const good: Guide = {
      ...sample,
      blocks: [...sample.blocks, { type: 'paragraph', text: 'The 100 wall balls arrive after 8 km of running, so your legs are already full.' }],
    };
    expect(codes(checkDraft(good))).not.toContain('run-distance');
  });

  it('warns about a title that will be cut off once the site name is added', () => {
    const long: Guide = { ...sample, title: 'A very long title that goes well past what a results page shows' };
    expect(codes(checkDraft(long), 'warnings')).toContain('title-long');
    expect(codes(checkDraft({ ...sample, title: 'Rest 90 seconds' }), 'warnings')).not.toContain('title-long');
  });
});

describe('the dates in structured data', () => {
  it('never put modified before published', async () => {
    const { guideJsonLd } = await import('../guides/schema');
    // Published (scheduled) on the 16th, last edited on the 12th: the three live guides.
    const scheduled: Guide = { ...sample, publishedAt: '2026-11-16T07:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z' };
    const [article, , page] = guideJsonLd(scheduled) as Array<Record<string, string>>;
    expect(article.datePublished).toBe('2026-11-16T07:00:00.000Z');
    expect(article.dateModified).toBe('2026-11-16T07:00:00.000Z');
    expect(page.lastReviewed).toBe('2026-11-16');
    // An edit after publishing still shows as the later date.
    const edited: Guide = { ...scheduled, updatedAt: '2026-11-20T09:00:00.000Z' };
    expect((guideJsonLd(edited) as Array<Record<string, string>>)[0].dateModified).toBe('2026-11-20T09:00:00.000Z');
  });
});
