// The 404 page is not allowed to import the header or footer.
//
// Next.js puts the root not-found element into the data of every page, so a
// notFound() thrown anywhere can render it. With the header and footer in it,
// every page carried about 50 KB of navigation it never showed (the homepage
// went from 349 KB to 396 KB), and the ATHX page, built never to say HYROX, had
// "HYROX" in its data. It carries its own few links instead.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(join(process.cwd(), 'src/app/not-found.tsx'), 'utf8');

describe('the root 404 page', () => {
  it('does not import the site header, footer or navigation', () => {
    expect(src).not.toMatch(/components\/Header|components\/Footer|site-nav/);
  });

  it('says no sport by name, since its text is in every page including the ATHX one', () => {
    // Comments are not shipped, so only what the page renders is checked.
    const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code.toLowerCase()).not.toContain('hyrox');
  });

  it('still gives a way back to the useful places, including a lost download', () => {
    for (const href of ['/start', '/calculators', '/guides', '/resend', '/contact', '/']) {
      expect(src, href).toContain(`'${href}'`.replace(/'/g, src.includes(`"${href}"`) ? '"' : "'"));
    }
  });
});
