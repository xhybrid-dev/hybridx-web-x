// The About page is written and parked, not published (Jon, 26 November 2026: "keep that out of this
// update"; a proper About article is to be written). It lives in src/app/_drafts/about, a private
// folder Next does not route. This holds it there: no live page, and nothing that links to it, lists
// it or points structured data at it. Delete this file when About is published.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '__tests__' || name === '_drafts') continue;
      yield* files(full);
    } else if (/\.(ts|tsx)$/.test(name)) yield full;
  }
}

describe('the About page, while it is a draft', () => {
  it('is kept in the private drafts folder and has no live route', () => {
    expect(existsSync(join(SRC, 'app/_drafts/about/page.tsx'))).toBe(true);
    expect(existsSync(join(SRC, 'app/about'))).toBe(false);
  });

  it('is linked, listed and cited by nothing else', () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      // seo.ts holds the Person helper the draft uses; about.ts holds the profile data. Neither publishes anything.
      if (/src\/lib\/(seo|about)\.ts$/.test(file.replace(/\\/g, '/'))) continue;
      if (/['"`]\/about(['"`#?/])/.test(readFileSync(file, 'utf8'))) offenders.push(file.slice(SRC.length + 1));
    }
    expect(offenders).toEqual([]);
  });
});
