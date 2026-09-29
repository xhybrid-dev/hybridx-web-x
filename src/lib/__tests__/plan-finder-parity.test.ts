import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import schema from '@/lib/plan-finder/events.schema.json';
import { scrubText, validateBatch } from '@/lib/plan-finder/collect-core';
import { funnel } from '@/lib/plan-finder/content';
import { insights, mergeDays, report, rollupDay } from '@/lib/plan-finder/analytics';
import { generate, splitByDay, toBatches } from '@/lib/plan-finder/analytics/seed';

// The TypeScript ports must behave exactly like the reference modules they came
// from, which were tested over every answer combination and a large synthetic
// traffic set before hand-over. These tests run both side by side on the same
// input and require identical output. If handover/entry-funnel is ever removed,
// remove this file with it.

const require = createRequire(import.meta.url);
const ref = {
  collect: require('../../../handover/entry-funnel/server/collect-core.js'),
  seed: require('../../../handover/entry-funnel/admin/seed.js'),
  rollup: require('../../../handover/entry-funnel/admin/rollup.js'),
};

const NOW = Date.UTC(2026, 8, 29, 12);

/** Deterministic nasty variations of a valid batch: wrong types, extra keys, identifying keys, junk. */
function mutations(body: string, rng: () => number): unknown[] {
  const b = JSON.parse(body);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  const junk = [null, undefined, '', 'x'.repeat(600), -1, 1e12, 3.5, true, [], {}, { email: 'a@b.co' }, 'https://evil.example/?q=1', '__proto__'];
  const out: unknown[] = [];
  for (let i = 0; i < 6; i++) {
    const m = JSON.parse(JSON.stringify(b));
    const e = pick(m.events) as Record<string, unknown>;
    const key = pick([...Object.keys(e), 'email', 'name', 'ua', 'extra', 'step', 'value', 'answers']);
    e[key] = pick(junk);
    if (rng() < 0.3) m.ctx[pick(['ref', 'path', 'utm', 'vw', 'ip', 'lang'])] = pick(junk);
    if (rng() < 0.1) m.sid = pick(['', 'UPPER', 'a'.repeat(80), 7]);
    if (rng() < 0.1) m.v = pick([0, 2, '1']);
    out.push(JSON.stringify(m));
  }
  out.push(b, Buffer.from(body), body.slice(0, body.length / 2), '[]', 'null', '{"v":1}');
  return out;
}

describe('collect-core port', () => {
  it('validates generated traffic, and hostile variations of it, exactly as the reference', () => {
    const { events } = ref.seed.generate({ days: 3, sessionsPerDay: 120, seed: 7, startDate: '2026-09-01', entryMode: true });
    const bodies: string[] = ref.seed.toBatches(events, 50).map((b: object) => JSON.stringify(b));
    expect(bodies.length).toBeGreaterThan(100);
    let compared = 0;
    let seed = 99;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (const body of bodies) {
      for (const input of [body, ...mutations(body, rng)]) {
        const mine = validateBatch(input, { schema, now: NOW });
        const theirs = ref.collect.validateBatch(input, { schema, now: NOW });
        expect(mine).toEqual(theirs);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });

  it('scrubs text exactly as the reference', () => {
    const samples = [
      'Email me at jo.bloggs+hyrox@gmail.com or call +44 (0)7700 900123',
      'Race at www.hyrox.com/events in LS1 4AP, IG @jo_trains, 5km and 100kg PBs',
      'See mysite.club/page, e.g. this. Card 1234567890123456',
      'Plain text with no personal details at all',
      'x'.repeat(700),
      '😀'.repeat(300),
      '\u0000control\u0007chars\n\tand   spaces',
    ];
    for (const s of samples) expect(scrubText(s, 500)).toBe(ref.collect.scrubText(s, 500));
  });
});

describe('analytics port', () => {
  // This repo's catalog changed two rows after hand-over (the owner's ATHX and ULTRA links),
  // which shows up in generated events as the catalog label and a destination type. Neither is
  // counted by the rollup; both are normalised before comparing the generators themselves.
  const normalise = (events: Record<string, unknown>[]) =>
    events.map((e) => ({ ...e, ctx: { ...(e.ctx as object), catalog: '-' }, ...(e.n === 'result_click' ? { dest: '-' } : {}) }));

  const CASES = [
    { days: 7, sessionsPerDay: 150, seed: 1, startDate: '2026-09-01' },
    { days: 3, sessionsPerDay: 400, seed: 42, startDate: '2026-10-01', entryMode: false },
    { days: 5, sessionsPerDay: 90, seed: 2026, startDate: '2026-11-01', model: { skip: 0.6, exit: { 3: 0.35 }, click: 0.1 } },
    { days: 2, sessionsPerDay: 30, seed: 9, startDate: '2026-12-01' }, // under the 100-session insight floor
  ];

  it.each(CASES)('generates the same traffic as the reference (seed $seed)', (opts) => {
    const mine = generate(opts);
    const theirs = ref.seed.generate(opts);
    expect(normalise(mine.events)).toEqual(normalise(theirs.events));
    expect(mine.truth).toEqual(theirs.truth);
    expect(toBatches(mine.events, 50).length).toBe(ref.seed.toBatches(theirs.events, 50).length);
  });

  it.each(CASES)('rolls up, merges, reports and finds insights exactly as the reference (seed $seed)', (opts) => {
    const { events } = ref.seed.generate(opts);
    const days = splitByDay(events);
    expect(days.map((d) => d.date)).toEqual(ref.seed.splitByDay(events).map((d: { date: string }) => d.date));
    const mineDays = days.map((d) => rollupDay(d.events, { date: d.date }));
    const theirDays = days.map((d) => ref.rollup.rollupDay(d.events, { date: d.date }));
    expect(mineDays).toEqual(theirDays);
    const mineMerged = mergeDays(mineDays);
    expect(mineMerged).toEqual(ref.rollup.mergeDays(theirDays));
    const mineReport = report(mineMerged, { catalog: funnel.catalog });
    const theirReport = ref.rollup.report(mineMerged, { catalog: funnel.catalog });
    expect(mineReport).toEqual(theirReport);
    expect(insights(mineReport)).toEqual(ref.rollup.insights(theirReport));
    expect(insights(mineReport, { thresholds: { stepDropRate: 0.05, skipRate: 0.1, clickRate: 0.9 } })).toEqual(
      ref.rollup.insights(theirReport, { thresholds: { stepDropRate: 0.05, skipRate: 0.1, clickRate: 0.9 } }),
    );
  });

  it('caps hostile map keys exactly as the reference', () => {
    const events = Array.from({ length: 300 }, (_, i) => ({ sid: 's' + i, n: 'cta_click', t: i, q: 0, id: 'link-' + i, ctx: { ref: 'host' + i + '.example' } }));
    expect(rollupDay(events, { date: 'x', maxKeys: 20 })).toEqual(ref.rollup.rollupDay(events, { date: 'x', maxKeys: 20 }));
  });
});
