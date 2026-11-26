// Every typeface is self-hosted.
//
// next/font/google fetches each font file at build time and reads the extension
// off the URL Google returns. On 20 and 24 November 2026 the deploy build got a URL
// without one, died with "Cannot read properties of null (reading '1')", and
// shipped nothing. The same build passed locally. So nothing imports it, and every
// file the site's font modules name exists.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

describe('fonts', () => {
  const files = walk(SRC);

  it('are never loaded with next/font/google', () => {
    const offenders = files
      .filter((f) => /from\s+['"]next\/font\/google['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(SRC.length + 1));
    expect(offenders, 'self-host it: see src/fonts/README.md').toEqual([]);
  });

  it('all exist where the font modules say they are', () => {
    const modules = files.filter((f) => /next\/font\/local/.test(readFileSync(f, 'utf8')));
    expect(modules.length).toBeGreaterThanOrEqual(4);
    for (const file of modules) {
      const paths = [...readFileSync(file, 'utf8').matchAll(/(?:src|path):\s*'([^']+\.woff2)'/g)].map((m) => m[1]);
      expect(paths.length, file).toBeGreaterThan(0);
      for (const p of paths) expect(existsSync(resolve(dirname(file), p)), `${file} names ${p}`).toBe(true);
    }
  });

  it('give the root layout its two faces from the shared module', () => {
    const layout = readFileSync(join(SRC, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain("import { inter, spaceGrotesk } from '@/lib/fonts'");
    expect(layout).toContain('${inter.variable} ${spaceGrotesk.variable}');
  });

  it('size the fallback face to the web font where it can', () => {
    const shared = readFileSync(join(SRC, 'lib/fonts.ts'), 'utf8');
    expect(shared).toMatch(/adjustFontFallback: 'Arial'/);
    expect(shared).toMatch(/adjustFontFallback: 'Times New Roman'/);
  });
});
