import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../../middleware';
import { planFinderMode } from '@/lib/plan-finder/launch';

// The launch switch and the experiment split (docs/03, P6).

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const get = (url: string) => middleware(new NextRequest(url, { headers: { host: new URL(url).host } }));

describe('PLAN_FINDER_MODE', () => {
  it('is off unless it says on or experiment', () => {
    expect(planFinderMode(undefined)).toBe('off');
    expect(planFinderMode('')).toBe('off');
    expect(planFinderMode('On')).toBe('off');
    expect(planFinderMode('true')).toBe('off');
    expect(planFinderMode('on')).toBe('on');
    expect(planFinderMode('experiment')).toBe('experiment');
  });

  it('leaves the homepage alone and cacheable when not experimenting', () => {
    vi.stubEnv('PLAN_FINDER_MODE', 'on');
    const res = get('https://hybridx.club/');
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('cache-control')).toBeNull();
  });

  it('splits "/" between the two arms, uncached, keeping the query string', () => {
    vi.stubEnv('PLAN_FINDER_MODE', 'experiment');
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    const control = get('https://hybridx.club/?utm_source=ig');
    const armA = get('https://hybridx.club/?utm_source=ig');
    expect(control.headers.get('x-middleware-rewrite')).toBe('https://hybridx.club/home-control?utm_source=ig');
    expect(armA.headers.get('x-middleware-rewrite')).toBeNull();
    for (const res of [control, armA]) expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('only splits the homepage of the main site', () => {
    vi.stubEnv('PLAN_FINDER_MODE', 'experiment');
    expect(get('https://hybridx.club/books').headers.get('x-middleware-rewrite')).toBeNull();
    // The race subdomain's root is its own page, as before.
    expect(get('https://race.hybridx.club/').headers.get('x-middleware-rewrite')).toBe('https://race.hybridx.club/race');
  });

  it('sends a direct visit to the control page back to the homepage', () => {
    const res = get('https://hybridx.club/home-control?x=1');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://hybridx.club/?x=1');
  });
});
