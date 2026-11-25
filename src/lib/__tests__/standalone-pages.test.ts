// The pages with their own look still lead back to the site, and their legal
// links go somewhere. The engine funnel linked its terms to "/privacy-policy#terms"
// (no such anchor; they are at /terms) and its contact to hello@hybridx.club (not
// the address the rest of the site uses), and its logo was not a link.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the build a bigger engine page', () => {
  const src = read('src/app/build-a-bigger-engine/page.tsx');

  it('has working legal and contact links, and no dead anchor or stray address', () => {
    expect(src).not.toContain('privacy-policy#terms');
    expect(src).not.toContain('hello@hybridx.club');
    for (const href of ['/privacy-policy', '/terms', '/contact']) expect(src).toContain(`href="${href}"`);
  });

  it('can reopen the cookie choice, and links its logo and a bar back to the site', () => {
    expect(src).toContain('<ConsentSettingsButton');
    expect(src).toContain('<StandaloneBar />');
    expect(src).toMatch(/<Link href="\/" aria-label="HybridX home"/);
  });

  it('keeps the footer outside <main>, and gives <main> an id for a skip link', () => {
    expect(src).toMatch(/<\/main>\s*<EngineFooter \/>/);
    expect(src).toContain('<main id="main-content"');
  });

  it('does not drop the sample week detail on a phone', () => {
    expect(src).toContain('sm:hidden">{row.detail}');
  });
});

describe('the email form on the engine funnel', () => {
  it('says what signing up means and links the privacy policy', () => {
    const form = read('src/components/engine/EngineLeadForm.tsx');
    expect(form).toContain('Signing up means you will get training emails from HybridX');
    expect(form).toContain('href="/privacy-policy"');
  });
});
