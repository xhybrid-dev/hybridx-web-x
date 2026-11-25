// No page, and no GET handler, confirms a subscriber.
//
// Outlook Safe Links, Proofpoint and Gmail's prefetch request every URL in an
// inbound email, so a confirmation made while a page renders is one a mail
// scanner can complete for someone who never opened the message. Consent is
// granted by a POST (a server action behind a button), never by a GET.
// /hyrox-rule-changes-2026/confirm once did it on render; this keeps it from
// coming back on that page or on a new funnel's.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = join(process.cwd(), 'src/app');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const GRANTS = /\bmarkLeadConfirmed\s*\(|\bconfirmLead\s*\(|\bconfirmMagnet\s*\(/;

describe('confirming a lead', () => {
  const files = walk(APP).filter((f) => /\/(page|layout|route)\.tsx?$/.test(f));

  it('finds the pages to check', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('never happens inside a page, layout or route handler', () => {
    const offenders = files
      .filter((f) => GRANTS.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(process.cwd().length + 1));
    expect(offenders).toEqual([]);
  });

  it('is only a function reference handed to a button on the confirm pages', () => {
    const pages = ['confirm/page.tsx', 'athx-2027/confirm/page.tsx', 'hyrox-rule-changes-2026/confirm/page.tsx'].map(
      (p) => join(APP, p),
    );
    for (const page of pages) {
      const src = readFileSync(page, 'utf8');
      expect(src, page).not.toMatch(GRANTS);
    }
  });

  it('is behind a POST button on the race day card page', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/hyrox-rules/RaceCardConfirm.tsx'), 'utf8');
    expect(src).toContain("confirmMagnet.bind(null, SLUG)");
    expect(src).toContain('<form action={formAction}>');
    expect(src).toContain('type="submit"');
  });
});
