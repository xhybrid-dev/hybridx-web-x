import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planFinderMode } from '@/lib/plan-finder/launch';

// The launch switch. The experiment split it once described is over: see launch.ts.

describe('PLAN_FINDER_MODE', () => {
  it('is off unless it says on', () => {
    expect(planFinderMode(undefined)).toBe('off');
    expect(planFinderMode('')).toBe('off');
    expect(planFinderMode('On')).toBe('off');
    expect(planFinderMode('true')).toBe('off');
    expect(planFinderMode('on')).toBe('on');
  });

  it('reads the old "experiment" value as on, so no stale setting turns the finder off', () => {
    expect(planFinderMode('experiment')).toBe('on');
  });

  it('is on in apphosting.yaml', () => {
    const yaml = readFileSync(join(process.cwd(), 'apphosting.yaml'), 'utf8');
    expect(yaml).toMatch(/variable: PLAN_FINDER_MODE\s+value: "on"/);
  });
});

describe('the homepage control arm', () => {
  it('has no page, and its old address redirects to the homepage', () => {
    expect(existsSync(join(process.cwd(), 'src/app/home-control/page.tsx'))).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../../../next.config.js') as { redirects: () => Promise<{ source: string; destination: string; permanent: boolean }[]> };
    return config.redirects().then((redirects) => {
      expect(redirects).toContainEqual({ source: '/home-control', destination: '/', permanent: true });
    });
  });
});

describe('middleware', () => {
  it('is not at the repository root, where Next ignores it while the app is under src/', () => {
    expect(existsSync(join(process.cwd(), 'middleware.ts'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/app/page.tsx'))).toBe(true);
  });
});
