import { describe, expect, it } from 'vitest';
import { diagnose, type EngineSnapshot } from '../guides/engine/diagnose';

/*
 * The engine check's verdicts (/api/admin/engine-check): from a snapshot of
 * the engine's state, the most likely reason nothing is being drafted.
 */

const now = new Date('2026-11-24T10:20:00Z');
const topic = (over: Partial<EngineSnapshot['topics'][number]> = {}) => ({ status: 'queued' as const, question: 'Q', updatedAt: '2026-11-20T10:00:00Z', ...over });

function snap(over: Partial<EngineSnapshot> = {}): EngineSnapshot {
  return {
    now,
    mode: 'on',
    paused: false,
    geminiKey: true,
    writerModel: 'googleai/gemini-test',
    lastRun: { at: '2026-11-24T10:00:00Z', log: [] },
    pipeline: { room: true, waiting: 0, ahead: 0 },
    activeRuns: [],
    topics: [topic()],
    draftable: 1,
    ping: { ok: true },
    ...over,
  };
}

const areas = (s: EngineSnapshot) => diagnose(s).map((f) => f.area);

describe('the engine check', () => {
  it('finds nothing wrong when the last run was this hour, Gemini answers, and there is room and a topic', () => {
    expect(areas(snap())).toEqual(['ok']);
  });

  it('says so, and nothing else, when the engine is switched off', () => {
    expect(diagnose(snap({ mode: 'off' }))).toEqual([{ area: 'settings', says: expect.stringContaining('"off", not "on"') }]);
  });

  it('blames the schedule when the last run is hours old', () => {
    const [f] = diagnose(snap({ lastRun: { at: '2026-11-22T10:00:00Z', log: [] } }));
    expect(f.area).toBe('scheduling');
    expect(f.says).toContain('2 days ago');
    expect(f.says).toContain('CRON_SECRET');
  });

  it('blames the schedule when no run was ever recorded', () => {
    expect(areas(snap({ lastRun: null }))).toEqual(['scheduling']);
  });

  it('puts a failing Gemini first, with its reason', () => {
    const f = diagnose(snap({ ping: { ok: false, error: '404 model not found' }, lastRun: { at: '2026-11-22T10:00:00Z', log: [] } }));
    expect(f.map((x) => x.area)).toEqual(['gemini', 'scheduling']);
    expect(f[0].says).toContain('404 model not found');
    expect(f[0].says).toContain('googleai/gemini-test');
  });

  it('says a missing Gemini key outright', () => {
    expect(areas(snap({ geminiKey: false, ping: undefined }))).toEqual(['gemini']);
  });

  it('calls a full pipeline by design, with the counts', () => {
    const [f] = diagnose(snap({ pipeline: { room: false, waiting: 2, ahead: 0 } }));
    expect(f.area).toBe('waiting');
    expect(f.says).toContain('2 waiting for your review');
  });

  it('reports topics the engine skipped, and an empty queue', () => {
    const topics = [
      topic({ status: 'skipped', failures: 2, lastError: 'quota exceeded', question: 'Sled push', updatedAt: '2026-11-23T10:00:00Z' }),
      topic({ status: 'skipped', failures: 2, lastError: 'older', updatedAt: '2026-11-21T10:00:00Z' }),
      topic({ status: 'skipped' }), // skipped by Jon: not the engine's
    ];
    const f = diagnose(snap({ topics, draftable: 0, lastRun: { at: '2026-11-24T10:00:00Z', log: ['queue empty: nothing to draft'] } }));
    expect(f.map((x) => x.area)).toEqual(['gemini', 'queue']);
    expect(f[0].says).toMatch(/^2 topic\(s\) were skipped by the engine/);
    expect(f[0].says).toContain('"quota exceeded" ("Sled push")');
  });

  it('calls it a time limit when most skipped topics were cut off', () => {
    const topics = [topic({ status: 'skipped', failures: 2, lastError: 'the drafting request was cut off before it finished' })];
    expect(areas(snap({ topics, draftable: 0 }))).toEqual(['time limit', 'queue']);
  });

  it('reads the last run note: an outage, a failed draft, running out of time, an error', () => {
    const log = [
      'the writer (Gemini) is not answering: quota exceeded. "Q" stays in the queue, unchanged',
      'topic "R": the draft did not fit the article format',
      'stopped starting model calls 31 s into the run (none starts after 25 s)',
    ];
    expect(areas(snap({ lastRun: { at: '2026-11-24T10:00:00Z', log } }))).toEqual(['gemini', 'gemini', 'time limit']);
    expect(areas(snap({ lastRun: { at: '2026-11-24T10:00:00Z', log: [], error: 'boom' } }))).toEqual(['code']);
  });

  it('notes a second review that keeps failing, without calling it the stop', () => {
    const f = diagnose(snap({ activeRuns: [{ slug: 'a', stage: 'review', attempts: 2, error: 'review failed: overloaded' }] }));
    expect(f.map((x) => x.area)).toEqual(['reviewer']);
  });
});
