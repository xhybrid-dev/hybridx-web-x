import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ATHX_FAQS, ATHX_UK_DATES, ATHX_ZONES, ATHX_TOTAL_WORKING_MINUTES } from '../athx-content';

/**
 * The facts behind the ATHX 2027 page, and two things that must never regress
 * silently because nothing else would catch them:
 *
 *   1. The page must never name HYROX. The build brief is explicit about why —
 *      comparative editorial is fine on social, and inviting trademark trouble
 *      on a commercial landing page is not — and it is exactly the kind of rule
 *      a future content edit breaks by accident, not on purpose. A keyword
 *      array is prose to a search engine but code to everyone editing it, which
 *      is precisely how "is athx like hyrox" ended up in one during this same
 *      piece of work.
 *   2. The page's JSON-LD must render as static HTML, not be handed to
 *      next/script. next/script's default strategy inserts the tag after
 *      hydration — a browser or Googlebot sees it, a crawler that only fetches
 *      raw HTML (which a meaningful share of AI crawlers do) sees nothing.
 *      That failure mode is invisible in a browser, in axe, and in a build log
 *      — the only place it shows up is a raw, unexecuted fetch of the page,
 *      which is what this test does by reading the source directly rather than
 *      rendering it.
 */

const PAGE_SOURCE = readFileSync(
  join(process.cwd(), 'src/app/athx-2027/page.tsx'),
  'utf8',
);
const CONTENT_SOURCE = readFileSync(
  join(process.cwd(), 'src/lib/athx-content.ts'),
  'utf8',
);

/**
 * Strip `//` and `/* *​/` comments before scanning for the word.
 *
 * A comment explaining *why* the page must never say it — this file has one,
 * and the codebase has several elsewhere for the same trademark reasoning —
 * is documentation, not a leak. It is never shipped: TypeScript comments do
 * not survive compilation. What has to stay clean is everything that does
 * reach the browser: JSX text, the metadata keyword list, schema strings.
 * That is what a naive whole-file substring check cannot tell apart, and
 * exactly the false positive this file's own header comment triggered the
 * first time this test ran.
 */
function stripComments(source: string): string {
  return source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('the ATHX page never mentions HYROX', () => {
  it('has no "hyrox" in anything that ships — copy, keywords, or schema data', () => {
    expect(stripComments(PAGE_SOURCE).toLowerCase()).not.toContain('hyrox');
  });

  it('has no "hyrox" in the content module the page renders from', () => {
    expect(stripComments(CONTENT_SOURCE).toLowerCase()).not.toContain('hyrox');
  });
});

describe('the ATHX page renders its JSON-LD as static HTML', () => {
  it('does not import next/script', () => {
    // The regression this guards: next/script's default strategy defers
    // insertion to after hydration, so a non-JS-executing crawler — which
    // includes a meaningful share of AI crawlers — sees none of this page's
    // structured data. A plain <script> in a Server Component's JSX is part
    // of the first HTML byte instead, which is what Next's own docs recommend
    // for JSON-LD specifically.
    expect(PAGE_SOURCE).not.toMatch(/import\s+Script\s+from\s+['"]next\/script['"]/);
  });

  it('emits five plain <script type="application/ld+json"> elements', () => {
    const matches = [...PAGE_SOURCE.matchAll(/<script\s+id="athx-[a-z-]+-schema"/g)];
    expect(matches.map((m) => m[0])).toHaveLength(5);
  });
});

describe('ATHX_ZONES', () => {
  it('has exactly the three published zones, in the order they run', () => {
    expect(ATHX_ZONES.map((z) => z.id)).toEqual(['strength', 'endurance', 'metcon-x']);
  });

  it('scores the Endurance Zone on ski metres only, which is the page’s whole argument', () => {
    const endurance = ATHX_ZONES.find((z) => z.id === 'endurance')!;
    expect(endurance.scoring).toBe('Ski metres only');
  });

  it('gives every zone a non-empty time, description and scoring rule', () => {
    for (const zone of ATHX_ZONES) {
      expect(zone.time.length, zone.id).toBeGreaterThan(0);
      expect(zone.whatYouDo.length, zone.id).toBeGreaterThan(0);
      expect(zone.scoring.length, zone.id).toBeGreaterThan(0);
    }
  });
});

describe('ATHX_UK_DATES', () => {
  it('lists all five 2027 UK and Ireland events, London first', () => {
    expect(ATHX_UK_DATES.map((d) => d.city)).toEqual([
      'London',
      'Glasgow',
      'Dublin',
      'Birmingham',
      'Liverpool',
    ]);
  });

  it('gives London the date the 12-week training block is timed against', () => {
    // If this date drifts, the timing section's "twelve-week block starts in
    // early November" claim silently stops matching the date printed beside it.
    expect(ATHX_UK_DATES[0].dates).toBe('23–24 January');
  });
});

describe('ATHX_FAQS', () => {
  it('has a non-empty, distinct question and answer for every entry', () => {
    const questions = ATHX_FAQS.map((f) => f.question);
    expect(new Set(questions).size).toBe(questions.length);
    for (const faq of ATHX_FAQS) {
      expect(faq.question.length, faq.question).toBeGreaterThan(0);
      expect(faq.answer.length, faq.question).toBeGreaterThan(20);
    }
  });

  it('answers the affiliation question without conflating adidas and ATHX Games', () => {
    // The one FAQ where two distinct claims — a fact about the event, and a
    // disclaimer about this site — are easy to blur into one sentence that
    // overstates a relationship neither this site nor its source claims.
    const affiliation = ATHX_FAQS.find((f) => f.question.toLowerCase().includes('adidas'))!;
    expect(affiliation).toBeDefined();
    expect(affiliation.answer).toContain('backed by adidas');
    expect(affiliation.answer).toContain('not affiliated with, or endorsed by, ATHX Games');
  });
});

describe('ATHX_TOTAL_WORKING_MINUTES', () => {
  it('is less than the ~2.5 hour venue window, which is the point being made', () => {
    expect(ATHX_TOTAL_WORKING_MINUTES).toBeGreaterThan(0);
    expect(ATHX_TOTAL_WORKING_MINUTES).toBeLessThan(150); // 2.5 hours in minutes
  });
});
