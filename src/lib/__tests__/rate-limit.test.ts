import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// A small stateful Firestore stand-in. Stateful rather than a stub because the
// whole point of this limiter is that the window survives outside the process —
// a mock that forgot between calls would pass while testing nothing.
const store = new Map<string, Record<string, unknown>>();
let txCount = 0;
let failNext = false;

vi.mock('@/lib/firebase-admin', () => {
  const makeRef = (id: string) => ({ id, path: `rateLimits/${id}` });

  const makeQuery = (filters: Array<(d: Record<string, unknown>) => boolean>, cap: number) => ({
    where: (_field: string, _op: string, value: Timestamp) =>
      makeQuery(
        [...filters, (d) => (d.expiresAt as Timestamp).toMillis() <= value.toMillis()],
        cap,
      ),
    limit: (n: number) => makeQuery(filters, n),
    get: async () => {
      const hits = [...store.entries()]
        .filter(([, d]) => filters.every((f) => f(d)))
        .slice(0, cap)
        .map(([id]) => ({ id, ref: makeRef(id) }));
      return { empty: hits.length === 0, size: hits.length, docs: hits };
    },
  });

  return {
    adminFirestore: {
      collection: () => ({
        doc: (id: string) => makeRef(id),
        ...makeQuery([], 500),
      }),
      bulkWriter: () => ({
        delete: (ref: { id: string }) => store.delete(ref.id),
        close: async () => {},
      }),
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        txCount++;
        if (failNext) {
          failNext = false;
          throw new Error('Firestore unavailable');
        }
        const tx = {
          get: async (ref: { id: string }) => ({
            exists: store.has(ref.id),
            data: () => store.get(ref.id),
          }),
          set: (ref: { id: string }, data: Record<string, unknown>) => store.set(ref.id, data),
          update: (ref: { id: string }, patch: Record<string, unknown>) =>
            store.set(ref.id, { ...(store.get(ref.id) ?? {}), ...patch }),
        };
        return fn(tx);
      },
    },
  };
});

const {
  CAPTURE_LIMIT,
  checkRateLimit,
  isCaptureRateLimited,
  pruneRateLimits,
  resetRateLimitMemory,
} = await import('../rate-limit');

beforeEach(() => {
  store.clear();
  txCount = 0;
  failNext = false;
  resetRateLimitMemory();
});
afterEach(() => vi.useRealTimers());

describe('checkRateLimit', () => {
  it('allows up to the cap and then refuses', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit('k', 60_000, 3)).allowed, `call ${i + 1}`).toBe(true);
    }
    expect((await checkRateLimit('k', 60_000, 3)).allowed).toBe(false);
  });

  it('reports how long until the window reopens', async () => {
    await checkRateLimit('k', 60_000, 1);
    const blocked = await checkRateLimit('k', 60_000, 1);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('keys are independent, so one caller cannot exhaust another', async () => {
    await checkRateLimit('a', 60_000, 1);
    expect((await checkRateLimit('a', 60_000, 1)).allowed).toBe(false);
    expect((await checkRateLimit('b', 60_000, 1)).allowed).toBe(true);
  });

  it('reopens once the window has passed', async () => {
    vi.useFakeTimers();
    await checkRateLimit('k', 1000, 1);
    expect((await checkRateLimit('k', 1000, 1)).allowed).toBe(false);

    vi.advanceTimersByTime(1500);
    resetRateLimitMemory(); // the deny cache is time-based; clear it as prune would
    expect((await checkRateLimit('k', 1000, 1)).allowed).toBe(true);
  });

  // The reason this file exists. The previous limiter kept its window in a
  // per-process Map, so a second instance started every visitor from zero and
  // the effective limit became CAPTURE_LIMIT x instance count — silently.
  it('shares the window across instances', async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit('shared', 60_000, 3);
    expect((await checkRateLimit('shared', 60_000, 3)).allowed).toBe(false);

    // A second instance: same Firestore, empty local memory.
    resetRateLimitMemory();
    expect((await checkRateLimit('shared', 60_000, 3)).allowed).toBe(false);
  });

  it('answers a known-blocked key without a Firestore round trip', async () => {
    await checkRateLimit('hot', 60_000, 1);
    expect((await checkRateLimit('hot', 60_000, 1)).allowed).toBe(false);

    const before = txCount;
    for (let i = 0; i < 20; i++) await checkRateLimit('hot', 60_000, 1);
    expect(txCount).toBe(before); // every one served from memory
  });

  it('fails open when Firestore is unreachable', async () => {
    // A lead lost to an outage is gone for good; an unthrottled burst during
    // one is recoverable. The limiter must never be the reason a signup fails.
    failNext = true;
    const result = await checkRateLimit('k', 60_000, 1);
    expect(result.allowed).toBe(true);
  });
});

describe('isCaptureRateLimited', () => {
  it('lets a human through and stops a script', async () => {
    for (let i = 0; i < CAPTURE_LIMIT; i++) {
      expect(await isCaptureRateLimited('1.2.3.4', 'test'), `submission ${i + 1}`).toBe(false);
    }
    expect(await isCaptureRateLimited('1.2.3.4', 'test')).toBe(true);
  });

  it('separates buckets, so filling one form does not lock out another', async () => {
    // Three funnels shared one limiter before this was consolidated; hitting
    // the race-card limit would have blocked the VO2max guide too.
    for (let i = 0; i < CAPTURE_LIMIT; i++) await isCaptureRateLimited('9.9.9.9', 'race-card');

    expect(await isCaptureRateLimited('9.9.9.9', 'race-card')).toBe(true);
    expect(await isCaptureRateLimited('9.9.9.9', 'engine-guide')).toBe(false);
  });

  it('never limits an unresolved IP', async () => {
    // Behind a proxy that strips the header, limiting on the literal "unknown"
    // would throttle every visitor as though they were one person.
    for (let i = 0; i < CAPTURE_LIMIT * 3; i++) {
      expect(await isCaptureRateLimited('unknown', 'test')).toBe(false);
    }
    expect(await isCaptureRateLimited('', 'test')).toBe(false);
  });

  it('handles an IPv6 address', async () => {
    // Colons in the key: fine as a hashed doc id, would not be as a raw one.
    const ip = '2a00:23c7:2d0c:1e01:aaaa:bbbb:cccc:dddd';
    expect(await isCaptureRateLimited(ip, 'test')).toBe(false);
    for (let i = 1; i < CAPTURE_LIMIT; i++) await isCaptureRateLimited(ip, 'test');
    expect(await isCaptureRateLimited(ip, 'test')).toBe(true);
  });

  it('does not store the raw IP', async () => {
    await isCaptureRateLimited('5.6.7.8', 'test');
    const ids = [...store.keys()].join(' ');
    expect(ids).not.toContain('5.6.7.8');
  });
});

describe('pruneRateLimits', () => {
  it('deletes expired windows and leaves live ones', async () => {
    vi.useFakeTimers();
    await checkRateLimit('old', 1000, 5);
    vi.advanceTimersByTime(5000);
    await checkRateLimit('new', 60_000, 5);

    expect(store.size).toBe(2);
    const { deleted } = await pruneRateLimits();
    expect(deleted).toBe(1);
    expect(store.size).toBe(1);
  });

  it('is a no-op when nothing has expired', async () => {
    await checkRateLimit('live', 60_000, 5);
    expect((await pruneRateLimits()).deleted).toBe(0);
    expect(store.size).toBe(1);
  });
});
