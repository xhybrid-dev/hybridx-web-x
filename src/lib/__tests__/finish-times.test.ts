// Jon, 26 November 2026: the HYROX finish times stand as written for men (about 1:40), and 1:30 to 1:40 is
// a realistic goal for ambitious women. The site no longer states a women's average (it said about 1:54),
// because nobody here can source one; it states his coaching judgement as what it is, a realistic goal.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const PLACES = ['src/app/how-to-train-for-hyrox/page.tsx', 'src/components/FaqSection.tsx', 'src/lib/plan-finder/funnel.json'];

describe('HYROX finish times for women', () => {
  it.each(PLACES)('%s gives 1:30 to 1:40 as a realistic goal for ambitious women', (file) => {
    expect(read(file)).toMatch(/Ambitious women[^.]*1:30\s*(?:–|to|-)\s*1:40/);
  });

  it('is stated as an average nowhere', () => {
    for (const file of PLACES) expect(read(file)).not.toContain('1:54');
  });
});
