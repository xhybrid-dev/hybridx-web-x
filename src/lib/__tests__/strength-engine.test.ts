import { describe, expect, it } from 'vitest';
import {
  CAP,
  TARGETS,
  estimateMax,
  focusFor,
  formatTime,
  parseTestInput,
  parseTime,
  scoreTest,
  testQuery,
  type TestInput,
} from '../calculators/strength-engine';
import { BANNED_DASHES, BANNED_PHRASES, findWordViolations } from '../guides/bible';

/*
 * The strength and engine test (plan step 8), held to Jon's targets
 * (11 November 2026) and to three worked examples, to the number. Each is
 * worked by hand in the comment above it, with Epley: weight × (1 + reps/30).
 */

const set = (kg: number, reps: number) => ({ kg, reps });

describe("Jon's targets", () => {
  it('are as agreed, with Women Pro on the Men Open targets', () => {
    expect(TARGETS['men-open']).toEqual({ strength: { squat: 1.25, deadlift: 1.5, press: 0.6 }, fiveK: 1320 });
    expect(TARGETS['women-open']).toEqual({ strength: { squat: 1.0, deadlift: 1.25, press: 0.45 }, fiveK: 1500 });
    expect(TARGETS['men-pro']).toEqual({ strength: { squat: 1.5, deadlift: 2.0, press: 1.0 }, fiveK: 1200 });
    expect(TARGETS['women-pro'].strength).toEqual(TARGETS['men-open'].strength);
    expect(TARGETS['women-pro'].fiveK).toBe(1380);
  });
});

describe('three worked examples', () => {
  // Men Open, 80 kg. Squat 100 × 5 → 116.7 kg, 1.46 × bodyweight, 117% of 1.25.
  // Deadlift 120 × 5 → 140 kg, 1.75 ×, 117% of 1.5. Press 50 × 5 → 58.3 kg,
  // 0.73 ×, 122% of 0.6, capped at 120%. Strength (117 + 117 + 120) / 3 = 118%.
  // 5 km 21:00 against 22:00: 105%. 105 is more than 10% behind 118: engine-limited.
  it('a strong Men Open athlete with a 21:00 5 km is engine-limited', () => {
    const r = scoreTest({ division: 'men-open', bodyweightKg: 80, lifts: { squat: set(100, 5), deadlift: set(120, 5), press: set(50, 5) }, fiveK: 21 * 60 });
    expect(r.lifts.map((l) => [l.lift, l.estimatedMax, l.ratio, l.score])).toEqual([
      ['squat', 116.7, 1.46, 1.17],
      ['deadlift', 140, 1.75, 1.17],
      ['press', 58.3, 0.73, CAP],
    ]);
    expect([r.strength, r.engine, r.verdict, r.weakest]).toEqual([1.18, 1.05, 'engine-limited', 'squat']);
  });

  // Women Open, 65 kg. Squat 50 × 5 → 58.3 kg, 0.90 ×, 90% of 1.0. Deadlift
  // 60 × 5 → 70 kg, 1.08 ×, 86% of 1.25. Press 25 × 5 → 29.2 kg, 0.45 ×, 100%.
  // Strength 92%. 5 km 24:00 against 25:00: 104%. 92 is more than 10% behind 104:
  // force-limited, with the deadlift furthest from its target.
  it('a Women Open athlete with a 24:00 5 km and a light deadlift is force-limited', () => {
    const r = scoreTest({ division: 'women-open', bodyweightKg: 65, lifts: { squat: set(50, 5), deadlift: set(60, 5), press: set(25, 5) }, fiveK: 24 * 60 });
    expect(r.lifts.map((l) => [l.lift, l.estimatedMax, l.score])).toEqual([
      ['squat', 58.3, 0.9],
      ['deadlift', 70, 0.86],
      ['press', 29.2, 1],
    ]);
    expect([r.strength, r.engine, r.verdict, r.weakest]).toEqual([0.92, 1.04, 'force-limited', 'deadlift']);
  });

  // Men Pro, 85 kg. Squat 120 × 3 → 132 kg, 1.55 ×, 104% of 1.5. Deadlift
  // 160 × 3 → 176 kg, 2.07 ×, 104% of 2.0. Press 70 × 3 → 77 kg, 0.91 ×, 91% of 1.0.
  // Strength 99%. 5 km 20:30 against 20:00: 98%. Within 10% either way: balanced.
  it('a Men Pro athlete near every target is balanced', () => {
    const r = scoreTest({ division: 'men-pro', bodyweightKg: 85, lifts: { squat: set(120, 3), deadlift: set(160, 3), press: set(70, 3) }, fiveK: 20 * 60 + 30 });
    expect(r.lifts.map((l) => [l.lift, l.estimatedMax, l.score])).toEqual([
      ['squat', 132, 1.04],
      ['deadlift', 176, 1.04],
      ['press', 77, 0.91],
    ]);
    expect([r.strength, r.engine, r.verdict, r.weakest]).toEqual([0.99, 0.98, 'balanced', 'press']);
  });
});

describe('the rules', () => {
  it('never needs a true max: a single is its own max, more reps are estimated', () => {
    expect(estimateMax(set(100, 1))).toBe(100);
    expect(estimateMax(set(100, 10))).toBeCloseTo(133.3, 1);
  });

  it('caps every score, so one huge lift cannot hide a weak one', () => {
    const r = scoreTest({ division: 'men-open', bodyweightKg: 80, lifts: { squat: set(300, 1), deadlift: set(60, 5), press: set(30, 5) }, fiveK: 22 * 60 });
    expect(r.lifts[0].score).toBe(CAP);
    expect(r.verdict).toBe('force-limited');
    expect(r.weakest).toBe('deadlift');
  });

  it('gives each verdict an eight-week focus in four blocks, naming the weakest lift when strength is short', () => {
    expect(focusFor({ verdict: 'force-limited', weakest: 'press' }).week[0]).toContain('strict press');
    for (const verdict of ['force-limited', 'engine-limited', 'balanced'] as const) {
      const f = focusFor({ verdict, weakest: 'squat' });
      expect(f.blocks).toHaveLength(4);
      for (const t of [f.headline, f.why, f.retest, ...f.week, ...f.blocks]) {
        expect(findWordViolations(t, BANNED_PHRASES), t).toEqual([]);
        expect(findWordViolations(t, BANNED_DASHES), t).toEqual([]);
      }
    }
  });
});

describe('reading the inputs', () => {
  const input: TestInput = { division: 'women-pro', bodyweightKg: 62, lifts: { squat: set(70, 5), deadlift: set(90, 3), press: set(35, 6) }, fiveK: 23 * 60 + 15 };
  const q = (s: string) => {
    const p = new URLSearchParams(s);
    return parseTestInput((k) => p.get(k));
  };

  it('round-trips through the query string', () => {
    expect(q(testQuery(input))).toEqual(input);
  });

  it('refuses anything out of range: a true max over 10 reps, an odd bodyweight, a missing time', () => {
    const base = new URLSearchParams(testQuery(input));
    for (const [k, v] of [['sqr', '12'], ['sqr', '0'], ['bw', '20'], ['5k', ''], ['division', 'elite'], ['dl', '-5']]) {
      const p = new URLSearchParams(base);
      p.set(k, v);
      expect(q(p.toString()), `${k}=${v}`).toBeNull();
    }
  });

  it('reads times as minutes and seconds', () => {
    expect(parseTime('21:30')).toBe(1290);
    expect(parseTime('21:75')).toBeNull();
    expect(formatTime(1290)).toBe('21:30');
  });
});
