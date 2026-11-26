import { describe, expect, it } from 'vitest';
import { CANDIDATES } from '@/lib/guides/candidates';
import { missingCandidates, questionKey } from '@/lib/guides/queue';
import { PILLAR_IDS, TOOL_IDS } from '@/lib/guides/topics';

describe('the candidate list', () => {
  it('has no question twice, however it is worded', () => {
    const keys = CANDIDATES.map((c) => questionKey(c.question));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('names only pillars and tools that exist', () => {
    for (const c of CANDIDATES) {
      expect(PILLAR_IDS).toContain(c.pillar);
      if (c.tool) expect(TOOL_IDS).toContain(c.tool);
    }
  });

  it('keeps ATHX articles away from HYROX, and says so in the brief', () => {
    for (const c of CANDIDATES.filter((c) => c.pillar === 'athx')) {
      expect(c.question).not.toMatch(/hyrox/i);
      expect(c.note ?? '').toMatch(/never mention HYROX/i);
    }
  });

  it('asks for no facts a model would have to invent: products and rival events carry their limits in the brief', () => {
    const watch = CANDIDATES.find((c) => /watch/i.test(c.question));
    expect(watch?.note).toMatch(/no brands/i);
    const versus = CANDIDATES.find((c) => /ATHX/.test(c.question) && /HYROX/.test(c.question));
    expect(versus?.note).toMatch(/facts registry/i);
  });
});

describe('topping up a queue that was seeded long ago', () => {
  it('adds the candidates it does not hold, and only those', () => {
    const held = CANDIDATES.slice(0, 30).map((c) => ({ question: c.question }));
    const missing = missingCandidates(held);
    expect(missing.map((c) => c.question)).toEqual(CANDIDATES.slice(30).map((c) => c.question));
    expect(missing.length).toBeGreaterThan(0);
  });

  it('adds nothing when every candidate is held, skipped ones included, so a skipped topic stays skipped', () => {
    expect(missingCandidates(CANDIDATES.map((c) => ({ question: c.question })))).toEqual([]);
  });

  it('matches a question whatever its case or punctuation', () => {
    const [first] = CANDIDATES;
    expect(missingCandidates([{ question: first.question.toUpperCase() + '??' }], [first])).toEqual([]);
  });
});
