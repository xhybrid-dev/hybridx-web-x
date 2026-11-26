// Structured data is in the page's HTML, and cannot break out of its script.
//
// next/script (afterInteractive) puts a script in the page only after the
// browser has run JavaScript, so crawlers that read the HTML alone saw no
// structured data on 35 of 47 pages. Every page now renders <JsonLd>, a plain
// server-rendered script, and this fails if the next/script form comes back.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import JsonLd from '@/components/JsonLd';
import { jsonLdString } from '@/lib/json-ld';

const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') walk(full, out);
    } else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe('JsonLd', () => {
  it('renders each object as its own script in the markup', () => {
    const html = renderToStaticMarkup(<JsonLd data={[{ '@type': 'A' }, { '@type': 'B' }]} />);
    expect(html.match(/<script type="application\/ld\+json">/g)).toHaveLength(2);
    expect(html).toContain('{"@type":"A"}');
    expect(html).toContain('{"@type":"B"}');
  });

  it('cannot be closed early by text inside the data', () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: '</script><script>alert(1)</script> <!-- & ' }} />);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).toContain('\\u0026');
  });

  it('escapes the line and paragraph separators, and the data still parses back to what it was', () => {
    const data = { text: 'a\u2028b\u2029c </x> & y' };
    const out = jsonLdString(data);
    expect(out).not.toMatch(/[\u2028\u2029<>&]/);
    expect(JSON.parse(out)).toEqual(data);
  });
});

describe('the site', () => {
  const files = walk(SRC).filter((f) => !f.endsWith('components/JsonLd.tsx'));

  it('has no structured data added with next/script or a hand-written script', () => {
    const offenders = files
      .filter((f) => readFileSync(f, 'utf8').includes('application/ld+json'))
      .map((f) => f.slice(SRC.length + 1))
      // json-ld.ts only mentions it in a comment.
      .filter((f) => f !== 'lib/json-ld.ts');
    expect(offenders, 'use <JsonLd data={...} /> from @/components/JsonLd').toEqual([]);
  });
});
