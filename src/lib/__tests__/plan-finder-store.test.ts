import { beforeEach, describe, expect, it, vi } from 'vitest';

// The daily rollup and note-retention jobs, against an in-memory Firestore.
// docs/08 D2: the job writes hx_rollups/<date>, and running it twice gives the
// same document.

type Doc = Record<string, unknown>;
const db = new Map<string, Map<string, Doc>>();
const col = (name: string) => db.get(name) ?? db.set(name, new Map()).get(name)!;
let nextId = 0;

function query(name: string, filters: ((d: Doc) => boolean)[] = []) {
  const run = () => [...col(name).entries()].filter(([, d]) => filters.every((f) => f(d)));
  const snap = (rows: [string, Doc][]) => ({
    size: rows.length,
    empty: rows.length === 0,
    docs: rows.map(([id, d]) => ({ id, data: () => d, ref: ref(name, id) })),
  });
  return {
    where: (field: string, op: string, v: unknown) =>
      query(name, [
        ...filters,
        (d: Doc) => {
          const x = d[field] as string;
          return op === '==' ? x === v : op === '>=' ? x >= (v as string) : op === '<=' ? x <= (v as string) : false;
        },
      ]),
    get: async () => snap(run()),
  };
}
function ref(name: string, id: string) {
  return {
    id,
    get: async () => ({ exists: col(name).has(id), data: () => col(name).get(id) }),
    set: async (d: Doc, opts?: { merge?: boolean }) => void col(name).set(id, opts?.merge ? { ...(col(name).get(id) ?? {}), ...d } : d),
    update: async (d: Doc) => void col(name).set(id, { ...(col(name).get(id) ?? {}), ...d }),
  };
}

vi.mock('@/lib/firebase-admin', () => ({
  adminFirestore: {
    collection: (name: string) => ({
      ...query(name),
      doc: (id: string) => ref(name, id),
      add: async (d: Doc) => {
        const id = 'b' + nextId++;
        col(name).set(id, d);
        return ref(name, id);
      },
    }),
    getAll: async (...refs: { get: () => Promise<unknown> }[]) => Promise.all(refs.map((r) => r.get())),
  },
}));

const { rollupDate, runDailyRollups, blankOldNotes, eventsForDay } = await import('@/lib/plan-finder/store');
const { generate, toBatches, splitByDay } = await import('@/lib/plan-finder/analytics/seed');
const { rollupDay } = await import('@/lib/plan-finder/analytics');

/** Stores generated traffic the way the collector would: one document per batch, dated by its first event. */
function store(events: ReturnType<typeof generate>['events'], repeat = false) {
  for (const b of toBatches(events, 20)) {
    const first = Math.min(...b.events.map((e: { t: number }) => e.t));
    const doc = { sid: b.sid, day: new Date(first).toISOString().slice(0, 10), ctx: b.ctx, events: b.events, receivedAt: first };
    col('hx_batches').set('b' + nextId++, doc);
    if (repeat) col('hx_batches').set('b' + nextId++, structuredClone(doc)); // a beacon that arrived twice
  }
}

beforeEach(() => {
  db.clear();
  nextId = 0;
});

describe('daily rollups', () => {
  it('rolls up the visits that started on a day, ignoring repeated batches, and is repeatable', async () => {
    const { events } = generate({ days: 3, sessionsPerDay: 80, seed: 3, startDate: '2026-10-01' });
    store(events, true);
    const expected = splitByDay(events).find((d) => d.date === '2026-10-02')!;

    const first = await rollupDate('2026-10-02');
    const doc1 = structuredClone(col('hx_rollups').get('2026-10-02')!);
    const second = await rollupDate('2026-10-02');
    const doc2 = col('hx_rollups').get('2026-10-02')!;

    expect(first.sessions).toBe(80);
    expect(second.sessions).toBe(80);
    const strip = (d: Doc) => ({ ...d, updatedAt: null });
    expect(strip(doc2)).toEqual(strip(doc1));
    const { counters, hist, maps } = rollupDay(expected.events, { date: '2026-10-02' });
    expect(doc1).toMatchObject({ date: '2026-10-02', counters, hist, maps });
  });

  it('keeps a visit that crosses midnight on the day it started', async () => {
    const t0 = Date.UTC(2026, 9, 1, 23, 59, 50);
    const ctx = { mode: 'entry', vw: 'phone' };
    col('hx_batches').set('late-1', { sid: 'late', day: '2026-10-01', ctx, events: [{ n: 'page_view', t: t0, q: 0 }] });
    col('hx_batches').set('late-2', { sid: 'late', day: '2026-10-02', ctx, events: [{ n: 'finder_open', t: t0 + 30_000, q: 1, source: 'tile', step: 2 }] });
    const d1 = await eventsForDay('2026-10-01');
    const d2 = await eventsForDay('2026-10-02');
    expect(d1.events.map((e) => e.n)).toEqual(['page_view', 'finder_open']);
    expect(d2.events).toEqual([]);
  });

  it('rolls up each settled day once, catching up on missed days', async () => {
    const { events } = generate({ days: 4, sessionsPerDay: 10, seed: 5, startDate: '2026-10-01' });
    store(events);
    // 02:00 UTC on the 5th: the 4th is not settled until 03:00.
    const early = await runDailyRollups(Date.UTC(2026, 9, 5, 2));
    expect(early.rolledUp.map((r) => r.day).filter((d) => d >= '2026-10-01')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    const later = await runDailyRollups(Date.UTC(2026, 9, 5, 4));
    expect(later.rolledUp.map((r) => r.day)).toEqual(['2026-10-04']);
    const again = await runDailyRollups(Date.UTC(2026, 9, 5, 5));
    expect(again.rolledUp).toEqual([]);
  });
});

describe('note retention', () => {
  it('removes note text 90 days after the day it was received, and keeps everything else', async () => {
    const note = { n: 'q_answer', t: 1, q: 3, step: 5, key: 'note', value: 'Race in Leeds', ms: 4000 };
    const race = { n: 'q_answer', t: 2, q: 4, step: 5, key: 'race', value: '12-23' };
    col('hx_batches').set('old', { sid: 'a', day: '2026-07-01', events: [note, race] });
    col('hx_batches').set('new', { sid: 'b', day: '2026-09-01', events: [note, race] });

    const now = Date.UTC(2026, 8, 30, 4); // 30 September 2026: 1 July is 91 days back
    const first = await blankOldNotes(now);
    expect(first.blanked).toBe(1);
    const old = col('hx_batches').get('old')!.events as Doc[];
    expect(old[0]).toEqual({ n: 'q_answer', t: 1, q: 3, step: 5, key: 'note', ms: 4000 });
    expect(old[1]).toEqual(race);
    expect((col('hx_batches').get('new')!.events as Doc[])[0]).toEqual(note);

    // It remembers how far it got, so the next run looks only at new days.
    const second = await blankOldNotes(now + 3_600_000);
    expect(second).toEqual({ days: 0, blanked: 0 });
    expect(col('hx_meta').get('notes')!.blankedThrough).toBe('2026-07-01');
  });
});
