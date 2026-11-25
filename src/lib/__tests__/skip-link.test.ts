import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * The layout's skip link points at #main-content. A page whose <main> lacks that id makes
 * the first Tab stop a link that goes nowhere, so every <main> outside the admin carries it.
 */
const SRC = path.join(process.cwd(), 'src');

function* tsxFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'admin') continue;
      yield* tsxFiles(full);
    } else if (name.endsWith('.tsx')) {
      yield full;
    }
  }
}

describe('skip link', () => {
  it('is rendered by the root layout', () => {
    const layout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('<SkipLink />');
    expect(readFileSync(path.join(SRC, 'components/SkipLink.tsx'), 'utf8')).toContain('href="#main-content"');
  });

  it('has a target on every page', () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(SRC)) {
      // The shadcn sidebar primitive's <main> is an app-shell part, not a page.
      if (file.endsWith(path.join('components', 'ui', 'sidebar.tsx'))) continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/<main\b[^>]*>/g)) {
        if (!/id="main-content"/.test(m[0])) offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
