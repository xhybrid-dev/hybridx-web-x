import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// A small stateful stand-in for the two collections, like rate-limit.test.ts's: a document is removed only
// if its field is a Timestamp at or before the cutoff, which is what a Firestore inequality query returns.
const collections = new Map<string, Map<string, Record<string, unknown>>>();
const queried: { collection: string; field: string; limit: number }[] = [];

vi.mock('@/lib/firebase-admin', () => ({
  adminFirestore: {
    collection: (name: string) => {
      const make = (field = '', cutoff?: Timestamp, cap = 500) => ({
        where: (f: string, _op: string, v: Timestamp) => make(f, v, cap),
        limit: (n: number) => make(field, cutoff, n),
        get: async () => {
          queried.push({ collection: name, field, limit: cap });
          const docs = [...(collections.get(name) ?? new Map()).entries()]
            .filter(([, d]) => d[field] instanceof Timestamp && cutoff && (d[field] as Timestamp).toMillis() <= cutoff.toMillis())
            .slice(0, cap)
            .map(([id]) => ({ id, ref: { collection: name, id } }));
          return { empty: docs.length === 0, size: docs.length, docs };
        },
      });
      return make();
    },
    bulkWriter: () => ({
      delete: (ref: { collection: string; id: string }) => void collections.get(ref.collection)?.delete(ref.id),
      close: async () => {},
    }),
  },
}));

const { pruneExpired, pruneRetainedData, PRUNE_LIMIT } = await import('@/lib/retention');
const { COLLECTIONS } = await import('@/lib/plan-finder/config');

const NOW = Timestamp.fromMillis(Date.parse('2027-12-01T00:00:00Z'));
const at = (iso: string) => Timestamp.fromMillis(Date.parse(iso));
const put = (collection: string, id: string, data: Record<string, unknown>) => {
  if (!collections.has(collection)) collections.set(collection, new Map());
  collections.get(collection)!.set(id, data);
};
const ids = (collection: string) => [...(collections.get(collection)?.keys() ?? [])].sort();

beforeEach(() => {
  collections.clear();
  queried.length = 0;
});

describe('deleting what has expired', () => {
  it('removes a message past its retention and keeps one that is not', async () => {
    put(COLLECTIONS.leads, 'old', { expireAt: at('2027-11-30T23:59:59Z') });
    put(COLLECTIONS.leads, 'edge', { expireAt: NOW });
    put(COLLECTIONS.leads, 'live', { expireAt: at('2028-01-01T00:00:00Z') });
    expect(await pruneExpired(COLLECTIONS.leads, 'expireAt', NOW)).toEqual({ deleted: 2 });
    expect(ids(COLLECTIONS.leads)).toEqual(['live']);
  });

  it('leaves alone a document that has no expiry, or one that is not a timestamp', async () => {
    put(COLLECTIONS.leads, 'none', { name: 'x' });
    put(COLLECTIONS.leads, 'text', { expireAt: '2020-01-01' });
    expect(await pruneExpired(COLLECTIONS.leads, 'expireAt', NOW)).toEqual({ deleted: 0 });
    expect(ids(COLLECTIONS.leads)).toEqual(['none', 'text']);
  });

  it('does nothing, quietly, on an empty collection', async () => {
    expect(await pruneExpired(COLLECTIONS.leads, 'expireAt', NOW)).toEqual({ deleted: 0 });
  });

  it('takes no more than one run allows, and the rest next hour', async () => {
    for (let i = 0; i < 7; i++) put(COLLECTIONS.batches, `b${i}`, { expireAt: at('2020-01-01T00:00:00Z') });
    expect(await pruneExpired(COLLECTIONS.batches, 'expireAt', NOW, 5)).toEqual({ deleted: 5 });
    expect(ids(COLLECTIONS.batches)).toHaveLength(2);
    expect(PRUNE_LIMIT).toBeGreaterThanOrEqual(100);
  });
});

describe('the retained collections', () => {
  it('sweeps the messages and the visit batches, each on its own expireAt, and nothing else', async () => {
    put(COLLECTIONS.leads, 'm', { expireAt: at('2020-01-01T00:00:00Z') });
    put(COLLECTIONS.batches, 'v', { expireAt: at('2020-01-01T00:00:00Z') });
    put(COLLECTIONS.rollups, 'r', { expireAt: at('2020-01-01T00:00:00Z') });
    const out = await pruneRetainedData(NOW);
    expect(out).toEqual({ messages: { deleted: 1 }, 'visit batches': { deleted: 1 } });
    expect(queried.map((q) => `${q.collection}.${q.field}`).sort()).toEqual([`${COLLECTIONS.batches}.expireAt`, `${COLLECTIONS.leads}.expireAt`].sort());
    expect(ids(COLLECTIONS.rollups)).toEqual(['r']);
  });
});
