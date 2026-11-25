import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { prefillFromSearch, CORRECTION_TOPIC, CONTACT_TOPICS } from '@/components/contact/ContactForm';
import { createPersonSchema, PERSON_ID } from '@/lib/seo';
import { guideJsonLd } from '@/lib/guides/schema';
import { SAMPLE_GUIDES } from '@/lib/guides/fixtures';

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
    expect(read('src/app/about/page.tsx')).toContain('/contact?topic=correction');
  });
});

describe('the person behind the guides', () => {
  it('is one entity: the guides name the Person the About page defines', () => {
    expect(createPersonSchema({ name: 'Jon Lee', jobTitle: 'HybridX trainer' })['@id']).toBe(PERSON_ID);
    const page = guideJsonLd(SAMPLE_GUIDES[0]).find((o) => (o as { '@type'?: string })['@type'] === 'WebPage') as { reviewedBy: Record<string, string> };
    expect(page.reviewedBy['@id']).toBe(PERSON_ID);
    expect(page.reviewedBy.name).toBe('Jon Lee');
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
    const page = read('src/app/about/page.tsx').replace(/\/\/.*$/gm, '');
    for (const word of [/\bcertified\b/i, /\bqualified\b/i, /\byears of\b/i, /\bexperienced\b/i, /\bformer\b/i, /\bcoached\b/i, /\bhundreds of\b/i, /\bchampion/i, /\bworld[- ]class\b/i]) {
      expect(page, String(word)).not.toMatch(word);
    }
  });
});
