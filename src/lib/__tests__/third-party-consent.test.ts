// Third-party scripts wait for a choice.
//
// Ecwid once loaded for every homepage visitor, before they had chosen
// anything and even after Reject, contradicting the consent banner's own
// promise. It is now loaded by one component, only after a click on /store.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

describe('Ecwid', () => {
  const files = walk(SRC);
  const loaders = files.filter((f) => readFileSync(f, 'utf8').includes('app.ecwid.com/script.js'));

  it('is loaded from exactly one component', () => {
    expect(loaders.map((f) => f.slice(SRC.length + 1))).toEqual(['components/EcwidStore.tsx']);
  });

  it('is only rendered once the visitor has pressed the button', () => {
    const src = readFileSync(join(SRC, 'components/EcwidStore.tsx'), 'utf8');
    const gate = src.indexOf('if (!requested)');
    const script = src.indexOf('<Script');
    expect(gate).toBeGreaterThan(-1);
    expect(script).toBeGreaterThan(gate);
    expect(src).toContain('useState(false)');
    expect(src).toContain('setRequested(true)');
  });

  it('is not in the homepage promotion, which links to the store instead', () => {
    const src = readFileSync(join(SRC, 'components/ApparelPromotion.tsx'), 'utf8');
    expect(src).not.toMatch(/<Script|xProduct|ecsp/);
    expect(src).toContain('href="/store"');
  });

  it('is named in the privacy policy', () => {
    const src = readFileSync(join(SRC, 'app/privacy-policy/page.tsx'), 'utf8');
    expect(src).toContain('Ecwid');
  });
});
