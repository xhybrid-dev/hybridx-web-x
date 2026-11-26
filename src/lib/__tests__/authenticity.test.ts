import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { prefillFromSearch, CORRECTION_TOPIC, CONTACT_TOPICS } from '@/components/contact/ContactForm';
import { createPersonSchema, PERSON_ID } from '@/lib/seo';
import { guideJsonLd } from '@/lib/guides/schema';
import { SAMPLE_GUIDES } from '@/lib/guides/fixtures';
import { buildReviewEmail, COACH_NOTE_NUDGE, hasCoachNote } from '@/lib/guides/email';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('report a correction', () => {
  it('opens the form on the correction topic, naming the page', () => {
    const pre = prefillFromSearch('?topic=correction&page=/guides/how-to-pace-wall-balls');
    expect(pre.topic).toBe(CORRECTION_TOPIC);
    expect(CONTACT_TOPICS).toContain(CORRECTION_TOPIC);
    expect(pre.message).toContain('Page: https://hybridx.club/guides/how-to-pace-wall-balls');
  });

  it('does nothing without the correction topic', () => {
    expect(prefillFromSearch('')).toEqual({});
    expect(prefillFromSearch('?topic=other&page=/guides/x')).toEqual({});
  });

  it('never puts anything but a path on this site into the message', () => {
    for (const page of ['https://evil.example/x', '//evil.example', '/a b', '/<script>', 'javascript:alert(1)', '/' + 'a'.repeat(200), '/x?y=1']) {
      const pre = prefillFromSearch(`?topic=correction&page=${encodeURIComponent(page)}`);
      expect(pre.message).not.toContain('Page:');
      expect(pre.topic).toBe(CORRECTION_TOPIC);
    }
  });

  it('is offered at the end of every guide and on the About page', () => {
    expect(read('src/app/guides/[slug]/page.tsx')).toContain('/contact?topic=correction&page=');
    expect(read('src/app/_drafts/about/page.tsx')).toContain('/contact?topic=correction');
  });
});

describe('the person behind the guides', () => {
  it('is named on every guide, and points at no About page while there is none', () => {
    expect(createPersonSchema({ name: 'Jon Lee', jobTitle: 'HybridX trainer' })['@id']).toBe(PERSON_ID);
    const page = guideJsonLd(SAMPLE_GUIDES[0]).find((o) => (o as { '@type'?: string })['@type'] === 'WebPage') as { reviewedBy: Record<string, string> };
    expect(page.reviewedBy.name).toBe('Jon Lee');
    // A reference to a page that does not exist is worse than none. When About is published, point it at PERSON_ID.
    expect(page.reviewedBy).not.toHaveProperty('@id');
    expect(page.reviewedBy).not.toHaveProperty('url');
  });

  it('states only what it is given: no description or profiles unless supplied', () => {
    const bare = createPersonSchema({ name: 'Jon Lee', jobTitle: 'HybridX trainer', description: null, sameAs: [] });
    expect(bare).not.toHaveProperty('description');
    expect(bare).not.toHaveProperty('sameAs');
    const full = createPersonSchema({ name: 'Jon Lee', jobTitle: 'HybridX trainer', description: 'A real sentence.', sameAs: ['https://example.com/jon'] });
    expect(full).toMatchObject({ description: 'A real sentence.', sameAs: ['https://example.com/jon'] });
  });

  // The About page may only say what the code can back. A credential or a track record has to
  // come from the owner through src/lib/about.ts, never from the page's own copy.
  it('does not claim a qualification, a track record or a number of years in its own copy', () => {
    const page = read('src/app/_drafts/about/page.tsx').replace(/\/\/.*$/gm, '');
    for (const word of [/\bcertified\b/i, /\bqualified\b/i, /\byears of\b/i, /\bexperienced\b/i, /\bformer\b/i, /\bcoached\b/i, /\bhundreds of\b/i, /\bchampion/i, /\bworld[- ]class\b/i]) {
      expect(page, String(word)).not.toMatch(word);
    }
  });
});

describe("Jon's coach's note, the part no model may write", () => {
  const withoutNote = { ...SAMPLE_GUIDES[0], blocks: SAMPLE_GUIDES[0].blocks.filter((b) => !(b.type === 'callout' && b.kind === 'coach-note')) };
  const withNote = { ...withoutNote, blocks: [...withoutNote.blocks, { type: 'callout' as const, kind: 'coach-note' as const, text: 'In my experience athletes rush the first sled.' }] };

  it('is asked for in the review email when a draft has none, and not when it has one', () => {
    expect(hasCoachNote(withoutNote)).toBe(false);
    expect(hasCoachNote(withNote)).toBe(true);
    expect(buildReviewEmail({ kind: 'ready', to: 'jon@example.com', guide: withoutNote }).text).toContain(COACH_NOTE_NUDGE);
    expect(buildReviewEmail({ kind: 'ready', to: 'jon@example.com', guide: withNote }).text).not.toContain(COACH_NOTE_NUDGE);
  });

  it('is still refused to the engine: a model cannot write one', () => {
    const checks = read('src/lib/guides/checks.ts');
    expect(checks).toContain('invented-coach-note');
    expect(read('src/lib/guides/engine/prompts.ts')).toContain('never "coach-note", which is Jon');
  });
});
