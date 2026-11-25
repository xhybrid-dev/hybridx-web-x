// Yellow text on white is 1.4:1. WCAG 2.1 AA wants 4.5:1 for text and 3:1 for
// icons, focus rings and other UI parts, and the default theme is light, so
// 125 yellow-on-white tokens (including the homepage heading) failed for most
// visitors. The fix is a colour of its own, accent-ink, deep amber on light
// surfaces and bright yellow in dark mode; yellow FILLS keep --accent.
//
// This reads the real tokens from globals.css and does the sums.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

function block(selector: ':root' | '.dark'): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('\n  }', start));
}

/** "H S% L%" to a colour. */
function hsl(value: string): [number, number, number] {
  const [h, s, l] = value.trim().split(/\s+/).map((x) => parseFloat(x));
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

function token(scope: ':root' | '.dark', name: string): [number, number, number] {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(block(scope));
  expect(match, `--${name} in ${scope}`).not.toBeNull();
  return hsl(match![1].replace(/\/\*.*\*\//, ''));
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('light mode', () => {
  const surfaces = ['background', 'card', 'secondary', 'muted'] as const;

  it.each(surfaces)('reads accent-ink text on --%s at 4.5:1 or better', (surface) => {
    expect(ratio(token(':root', 'accent-ink'), token(':root', surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('shows what the old yellow was: unreadable as text on white', () => {
    expect(ratio(token(':root', 'accent'), token(':root', 'background'))).toBeLessThan(1.5);
  });

  it('keeps black on the yellow fill at 4.5:1 or better', () => {
    expect(ratio(token(':root', 'accent-foreground'), token(':root', 'accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the focus ring at 3:1 or better on white, and on black', () => {
    const ring = token(':root', 'ring');
    expect(ratio(ring, token(':root', 'background'))).toBeGreaterThanOrEqual(3);
    expect(ratio(ring, [0, 0, 0])).toBeGreaterThanOrEqual(3);
  });

  it('reads error text and the destructive button at 4.5:1 or better', () => {
    expect(ratio(token(':root', 'destructive'), token(':root', 'background'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(':root', 'destructive'), token(':root', 'destructive-foreground'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('dark mode', () => {
  it.each(['background', 'card', 'secondary'] as const)('reads accent-ink text on --%s at 4.5:1 or better', (surface) => {
    expect(ratio(token('.dark', 'accent-ink'), token('.dark', surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the focus ring at 3:1 or better on the dark background', () => {
    expect(ratio(token('.dark', 'ring'), token('.dark', 'background'))).toBeGreaterThanOrEqual(3);
  });

  it('reads error text at 4.5:1 or better', () => {
    expect(ratio(token('.dark', 'destructive'), token('.dark', 'background'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('yellow on yellow', () => {
  it('never lets a hover fill the button yellow and leave the text yellow', () => {
    const button = readFileSync(join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8');
    expect(button).toMatch(/ghost: "hover:bg-accent hover:text-accent-foreground"/);
    const toggle = readFileSync(join(process.cwd(), 'src/components/ThemeToggleButton.tsx'), 'utf8');
    expect(toggle).not.toMatch(/hover:text-accent(?!-)/);
  });

  it('exposes accent-ink to Tailwind', () => {
    expect(readFileSync(join(process.cwd(), 'tailwind.config.ts'), 'utf8')).toContain("ink: 'hsl(var(--accent-ink))'");
  });
});
