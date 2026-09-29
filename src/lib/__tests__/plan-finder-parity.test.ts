import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import schema from '@/lib/plan-finder/events.schema.json';
import { scrubText, validateBatch } from '@/lib/plan-finder/collect-core';

// The TypeScript ports must behave exactly like the reference modules they came
// from, which were tested over every answer combination and a large synthetic
// traffic set before hand-over. These tests run both side by side on the same
// input and require identical output. If handover/entry-funnel is ever removed,
// remove this file with it.

const require = createRequire(import.meta.url);
const ref = {
  collect: require('../../../handover/entry-funnel/server/collect-core.js'),
  seed: require('../../../handover/entry-funnel/admin/seed.js'),
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
