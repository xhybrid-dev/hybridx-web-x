import { describe, expect, it } from 'vitest';
import {
  acsmRunningCost,
  danielsFitness,
  danielsFraction,
  danielsVo2Cost,
  edwardsLoad,
  form,
  formWord,
  simulateWeekLoad,
  stepLoad,
  tanakaMaxHr,
  vo2maxFromMinute,
} from '@/lib/una-maths';

/*
 * The /una pages quote these figures in their copy and run these functions in
 * their demos. The expected values are the same hand-worked ones the watch
 * apps' host tests pin (xhybrid-dev/una-hyrox), so a page that drifts from the
 * watch fails here rather than quietly teaching the wrong sum.
 */

describe('Edwards training load', () => {
  it('scores the reference ride at 39', () => {
    // 6:41 in zone 1, 1:28 in zone 2, 4:25 in zone 3, 3:56 in zone 4.
    expect(edwardsLoad([6 + 41 / 60, 1 + 28 / 60, 4 + 25 / 60, 3 + 56 / 60, 0])).toBe(39);
  });

  it('scores nothing without heart rate', () => {
    expect(edwardsLoad([0, 0, 0, 0, 0])).toBe(0);
  });

  it('weights a minute in zone 5 five times a minute in zone 1', () => {
    expect(edwardsLoad([0, 0, 0, 0, 10])).toBe(5 * edwardsLoad([10, 0, 0, 0, 0]));
  });
});

describe('fitness, fatigue and form', () => {
  it('moves fitness 1/42 and fatigue 1/7 of the way to the day', () => {
    const next = stepLoad({ fitness: 0, fatigue: 0 }, 42);
    expect(next.fitness).toBeCloseTo(1, 10);
    expect(next.fatigue).toBeCloseTo(6, 10);
    expect(form(next)).toBeCloseTo(-5, 10);
  });

  it('settles on the daily load when every day is the same', () => {
    let state = { fitness: 0, fatigue: 0 };
    for (let day = 0; day < 600; day++) state = stepLoad(state, 50);
    expect(state.fitness).toBeCloseTo(50, 3);
    expect(state.fatigue).toBeCloseTo(50, 3);
    expect(formWord(state)).toBe('Steady');
  });

  it('names the bands by form as a share of fitness', () => {
    expect(formWord({ fitness: 100, fatigue: 85 })).toBe('Fresh');
    expect(formWord({ fitness: 100, fatigue: 105 })).toBe('Steady');
    expect(formWord({ fitness: 100, fatigue: 125 })).toBe('Building');
    expect(formWord({ fitness: 100, fatigue: 140 })).toBe('Overreaching');
  });
});

describe('VO2max from a steady minute', () => {
  it('costs level running at 3.5 + 0.2 v', () => {
    expect(acsmRunningCost(200)).toBeCloseTo(43.5, 10);
  });

  it('adds 0.9 v per unit of uphill grade, and treats downhill as level', () => {
    expect(acsmRunningCost(200, 0.05)).toBeCloseTo(52.5, 10);
    expect(acsmRunningCost(200, -0.05)).toBeCloseTo(43.5, 10);
  });

  it('gives 54.4 for the reference minute', () => {
    // 200 m/min on the level at 160 bpm, resting 50, maximum 190.
    const v = vo2maxFromMinute({ speedMPerMin: 200, hr: 160, restHr: 50, maxHr: 190 });
    expect(v.toFixed(1)).toBe('54.4');
  });

  it('estimates maximum heart rate as 208 - 0.7 x age', () => {
    expect(tanakaMaxHr(40)).toBeCloseTo(180, 10);
  });
});

describe('Daniels–Gilbert pace model (X Training)', () => {
  it('computes level running VO2 cost at reference speeds and sits below ACSM scale', () => {
    expect(danielsVo2Cost(134)).toBeCloseTo(21.689996, 5);
    expect(danielsVo2Cost(134).toFixed(1)).toBe('21.7');

    expect(danielsVo2Cost(200)).toBeCloseTo(36.0116, 5);
    expect(danielsVo2Cost(200).toFixed(1)).toBe('36.0');

    expect(danielsVo2Cost(250)).toBeCloseTo(47.4645, 5);
    expect(danielsVo2Cost(250).toFixed(1)).toBe('47.5');

    expect(danielsVo2Cost(300)).toBeCloseTo(59.4374, 5);
    expect(danielsVo2Cost(300).toFixed(1)).toBe('59.4');

    expect(acsmRunningCost(200)).toBeGreaterThan(danielsVo2Cost(200));
  });

  it('decays sustainable fraction monotonically towards the 0.8 asymptote', () => {
    expect(danielsFraction(20)).toBeCloseTo(0.952983, 5);
    expect(danielsFraction(60)).toBeCloseTo(0.888007, 5);
    expect(danielsFraction(120)).toBeCloseTo(0.840883, 5);

    const durations = [5, 10, 20, 40, 60, 120, 240];
    const fractions = durations.map((t) => danielsFraction(t));
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]).toBeLessThan(fractions[i - 1]);
      expect(fractions[i]).toBeGreaterThan(0.8);
    }
    expect(danielsFraction(1000)).toBeCloseTo(0.8, 5);
  });

  it('matches pinned race performance table rows across 5K, 10K and Half Marathon', () => {
    // 5K references (Daniels Tables 5.1 & PaceModelTest.cpp)
    const f5k1957 = danielsFitness(5000, 19 + 57 / 60);
    expect(f5k1957).toBeCloseTo(49.9522, 3);
    expect(Math.abs(f5k1957 - 50)).toBeLessThan(0.1);

    expect(danielsFitness(5000, 20)).toBeCloseTo(49.8062, 3);
    expect(danielsFitness(5000, 22)).toBeCloseTo(44.5428, 3);
    expect(danielsFitness(5000, 25)).toBeCloseTo(38.3094, 3);
    expect(danielsFitness(5000, 30)).toBeCloseTo(30.822, 3);
    expect(danielsFitness(5000, 30 + 40 / 60)).toBeCloseTo(30.0172, 3);

    // 10K references
    const f10k4121 = danielsFitness(10000, 41 + 21 / 60);
    expect(f10k4121).toBeCloseTo(49.9671, 3);
    expect(Math.abs(f10k4121 - f5k1957)).toBeLessThan(0.05);
    expect(danielsFitness(10000, 50)).toBeCloseTo(40.0121, 3);

    // Half Marathon references (21,097.5 m)
    expect(danielsFitness(21097.5, 91 + 35 / 60)).toBeCloseTo(49.96, 3);
    expect(danielsFitness(21097.5, 105)).toBeCloseTo(42.6353, 3);
    expect(danielsFitness(21097.5, 120)).toBeCloseTo(36.4592, 3);
  });

  it('obeys strict monotonicity with speed, distance and duration', () => {
    const speeds = [100, 150, 200, 250, 300, 350];
    for (let i = 1; i < speeds.length; i++) {
      expect(danielsVo2Cost(speeds[i])).toBeGreaterThan(danielsVo2Cost(speeds[i - 1]));
    }

    const times = [15, 18, 20, 22, 25, 30, 35];
    for (let i = 1; i < times.length; i++) {
      expect(danielsFitness(5000, times[i])).toBeLessThan(danielsFitness(5000, times[i - 1]));
    }

    const distances = [4000, 5000, 6000, 7000, 8000];
    for (let i = 1; i < distances.length; i++) {
      expect(danielsFitness(distances[i], 30)).toBeGreaterThan(danielsFitness(distances[i - 1], 30));
    }
  });

  it('returns 0 (never NaN, Infinity or negative) on invalid or sub-walking inputs', () => {
    for (const bad of [0, -10, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 10]) {
      expect(danielsVo2Cost(bad)).toBe(0);
    }
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(danielsFraction(bad)).toBe(0);
    }
    const invalidPairs: [number, number][] = [
      [0, 20],
      [-5000, 20],
      [5000, 0],
      [5000, -20],
      [Number.NaN, 20],
      [5000, Number.NaN],
      [Number.POSITIVE_INFINITY, 20],
      [5000, Number.POSITIVE_INFINITY],
      [100, 60],
    ];
    for (const [d, t] of invalidPairs) {
      expect(danielsFitness(d, t)).toBe(0);
    }
  });
});

describe('simulateWeekLoad (7-day Banister simulation)', () => {
  it('returns an empty array for empty input', () => {
    expect(simulateWeekLoad([])).toEqual([]);
    expect(simulateWeekLoad([], 60, 60)).toEqual([]);
  });

  it('defaults starting fitness and fatigue to (0, 0)', () => {
    const implicit = simulateWeekLoad([42, 0]);
    const explicit = simulateWeekLoad([42, 0], 0, 0);
    expect(implicit).toEqual(explicit);

    expect(implicit[0].fitness).toBeCloseTo(1, 10);
    expect(implicit[0].fatigue).toBeCloseTo(6, 10);
    expect(implicit[0].form).toBeCloseTo(-5, 10);
    expect(implicit[0].word).toBe('Overreaching');

    expect(implicit[1].fitness).toBeCloseTo(41 / 42, 10);
    expect(implicit[1].fatigue).toBeCloseTo(36 / 7, 10);
    expect(implicit[1].form).toBeCloseTo(41 / 42 - 36 / 7, 10);
    expect(implicit[1].word).toBe('Overreaching');
  });

  it('matches step-by-step stepLoad/form/formWord without mutating input loads', () => {
    const loads = [75, 0, 110, 45, 0, 130, 95];
    const snapshot = [...loads];
    const result = simulateWeekLoad(loads, 55, 62);

    expect(loads).toEqual(snapshot);
    expect(result).toHaveLength(loads.length);

    let state = { fitness: 55, fatigue: 62 };
    loads.forEach((dayLoad, i) => {
      state = stepLoad(state, dayLoad);
      expect(result[i].fitness).toBeCloseTo(state.fitness, 12);
      expect(result[i].fatigue).toBeCloseTo(state.fatigue, 12);
      expect(result[i].form).toBeCloseTo(form(state), 12);
      expect(result[i].word).toBe(formWord(state));
    });
  });

  it('holds constant equilibrium when daily load matches starting fitness and fatigue', () => {
    const steady = simulateWeekLoad([50, 50, 50, 50, 50, 50, 50], 50, 50);
    for (const day of steady) {
      expect(day.fitness).toBeCloseTo(50, 10);
      expect(day.fatigue).toBeCloseTo(50, 10);
      expect(day.form).toBeCloseTo(0, 10);
      expect(day.word).toBe('Steady');
    }
  });

  it('decays fatigue faster than fitness over seven rest days, steadily increasing form', () => {
    const rest = simulateWeekLoad([0, 0, 0, 0, 0, 0, 0], 60, 60);
    expect(rest[0].fitness).toBeCloseTo(58.5714285714, 8);
    expect(rest[0].fatigue).toBeCloseTo(51.4285714286, 8);
    expect(rest[0].form).toBeCloseTo(7.1428571429, 8);
    expect(rest[0].word).toBe('Fresh');

    expect(rest[6].fitness).toBeCloseTo(50.6866063514, 8);
    expect(rest[6].fatigue).toBeCloseTo(20.3950006253, 8);
    expect(rest[6].form).toBeCloseTo(30.2916057261, 8);
    expect(rest[6].word).toBe('Fresh');

    for (let i = 1; i < rest.length; i++) {
      expect(rest[i].form).toBeGreaterThan(rest[i - 1].form);
      expect(rest[i].fatigue).toBeLessThan(rest[i].fitness);
    }
  });

  it('tracks a heavy build week from Steady into Building and Overreaching', () => {
    const heavy = simulateWeekLoad([90, 80, 100, 0, 110, 140, 80], 50, 50);
    expect(heavy.map((d) => d.word)).toEqual([
      'Steady',
      'Building',
      'Building',
      'Steady',
      'Building',
      'Overreaching',
      'Overreaching',
    ]);
    expect(heavy[6].fitness).toBeCloseTo(55.5984867722, 8);
    expect(heavy[6].fatigue).toBeCloseTo(75.2098676086, 8);
    expect(heavy[6].form).toBeCloseTo(-19.6113808364, 8);
  });

  it('tracks a taper week from fatigued back to Fresh', () => {
    const taper = simulateWeekLoad([30, 0, 40, 0, 25, 0, 0], 70, 95);
    expect(taper.map((d) => d.word)).toEqual([
      'Building',
      'Steady',
      'Steady',
      'Steady',
      'Fresh',
      'Fresh',
      'Fresh',
    ]);
    expect(taper[0].form).toBeCloseTo(-16.6666666667, 8);
    expect(taper[6].form).toBeCloseTo(21.4845970443, 8);
  });

  it('defensively clamps negative and non-finite inputs to 0', () => {
    const clamped = simulateWeekLoad([-20, Number.NaN], -10, Number.NaN);
    expect(clamped).toEqual(simulateWeekLoad([0, 0], 0, 0));
    for (const day of clamped) {
      expect(day.fitness).toBe(0);
      expect(day.fatigue).toBe(0);
      expect(day.form).toBe(0);
      expect(day.word).toBe('Steady');
    }
  });

  it('respects exact formWord threshold boundaries', () => {
    expect(formWord({ fitness: 100, fatigue: 90 })).toBe('Steady');
    expect(formWord({ fitness: 100, fatigue: 89.99 })).toBe('Fresh');
    expect(formWord({ fitness: 100, fatigue: 110 })).toBe('Steady');
    expect(formWord({ fitness: 100, fatigue: 110.01 })).toBe('Building');
    expect(formWord({ fitness: 100, fatigue: 130 })).toBe('Building');
    expect(formWord({ fitness: 100, fatigue: 130.01 })).toBe('Overreaching');
    expect(formWord({ fitness: 0, fatigue: 0 })).toBe('Steady');
    expect(formWord({ fitness: 0, fatigue: 50 })).toBe('Steady');
  });
});
