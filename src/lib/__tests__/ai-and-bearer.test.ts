// The two public Gemini actions are bounded and rate limited, and the cron secret
// is compared in constant time.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bearerMatches } from '../bearer';

let allowed = true;
const checkRateLimit = vi.fn(async () => ({ allowed, remaining: 0, retryAfterMs: 0 }));
let forwarded = '203.0.113.9, 10.0.0.1';
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: (...args: unknown[]) => (checkRateLimit as (...a: unknown[]) => unknown)(...args) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers(forwarded ? { 'x-forwarded-for': forwarded } : {}) }));

const { guardAiCall, AiLimitError, AI_CALLS_PER_HOUR } = await import('../ai-guard');

beforeEach(() => {
  allowed = true;
  forwarded = '203.0.113.9, 10.0.0.1';
  checkRateLimit.mockClear();
});

describe('guardAiCall', () => {
  it('limits per action and per caller, by the first forwarded address', async () => {
    await guardAiCall('treadmill-workout');
    expect(checkRateLimit).toHaveBeenCalledWith('ai:treadmill-workout:203.0.113.9', 60 * 60 * 1000, AI_CALLS_PER_HOUR);
  });

  it('throws once the limit is passed', async () => {
    allowed = false;
    await expect(guardAiCall('elevation-splits')).rejects.toBeInstanceOf(AiLimitError);
  });

  it('does not limit a caller whose address it cannot see', async () => {
    forwarded = '';
    allowed = false;
    await expect(guardAiCall('elevation-splits')).resolves.toBeUndefined();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});

describe('the AI actions', () => {
  it('refuse an over-long description before any model call', async () => {
    vi.doMock('@/ai/genkit', () => ({ ai: { definePrompt: () => () => {}, defineFlow: () => () => {} } }));
    vi.doMock('genkit', async () => {
      const { z } = await import('zod');
      return { z };
    });
    const { parseTreadmillWorkout } = await import('@/ai/flows/parse-treadmill-workout-flow');
    await expect(parseTreadmillWorkout({ description: 'x'.repeat(1501), unit: 'km' })).rejects.toThrow(/1,500 characters/);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('refuse a route with too many points', async () => {
    vi.doMock('@/ai/genkit', () => ({ ai: { definePrompt: () => () => {}, defineFlow: () => () => {} } }));
    vi.doMock('genkit', async () => {
      const { z } = await import('zod');
      return { z };
    });
    const { suggestElevationAdjustedSplits } = await import('@/ai/flows/suggest-splits-flow');
    const points = Array.from({ length: 601 }, (_, i) => ({ distanceKm: i / 100, elevationMeters: 10 }));
    await expect(
      suggestElevationAdjustedSplits({ gpxRouteProfile: points, totalTargetTimeSeconds: 1800, splitIntervalKm: 1 }),
    ).rejects.toThrow(/too many points/);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});

describe('bearerMatches', () => {
  it('accepts exactly "Bearer <secret>"', () => {
    expect(bearerMatches('Bearer s3cret', 's3cret')).toBe(true);
  });
  it('rejects anything else, of any length', () => {
    expect(bearerMatches(null, 's3cret')).toBe(false);
    expect(bearerMatches('', 's3cret')).toBe(false);
    expect(bearerMatches('Bearer s3cre', 's3cret')).toBe(false);
    expect(bearerMatches('Bearer s3crett', 's3cret')).toBe(false);
    expect(bearerMatches('bearer s3cret', 's3cret')).toBe(false);
    expect(bearerMatches('s3cret', 's3cret')).toBe(false);
  });
});
