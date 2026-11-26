// "Are you interested in ATHX?" at the top of the home page (Jon, 26 November 2026): the site is mostly
// about HYROX, and a visitor who came for ATHX had no clear way to the ATHX page.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AthxPrompt from '@/components/AthxPrompt';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** WCAG relative luminance contrast of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('the ATHX prompt', () => {
  const html = renderToStaticMarkup(<AthxPrompt />);

  it('asks the question and links to the ATHX 2027 page', () => {
    expect(html).toContain('Are you interested in ATHX?');
    expect(html).toMatch(/<a [^>]*href="\/athx-2027"/);
    expect(existsSync(join(process.cwd(), 'src/app/athx-2027/page.tsx'))).toBe(true);
  });

  it('names the region by its question, for a screen reader', () => {
    expect(html).toMatch(/<section[^>]*aria-labelledby="athx-prompt-q"/);
    expect(html).toContain('id="athx-prompt-q"');
  });

  it('is counted when it is used, so the home page can tell whether it earns its place', () => {
    expect(read('src/components/AthxPrompt.tsx')).toContain('home_athx_click');
  });

  it('reads on its yellow in both of its colours: black text, and a white button label on black', () => {
    expect(contrast('#000000', '#FADB5C')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', '#000000')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('on the home page', () => {
  const home = read('src/components/HomePage.tsx');

  it('sits under the header, ahead of the plan finder, and in every plan finder mode', () => {
    const prompt = home.indexOf('<AthxPrompt />');
    expect(prompt).toBeGreaterThan(home.indexOf('<Header />'));
    expect(prompt).toBeLessThan(home.indexOf("planFinder === 'entry' && <EntrySection"));
    // Not inside a condition: the line before it does not end an `&&`.
    expect(home.slice(0, prompt).trimEnd().endsWith('&&')).toBe(false);
  });
});
