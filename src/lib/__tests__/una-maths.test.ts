import { describe, expect, it } from 'vitest';
import {
  acsmRunningCost,
  edwardsLoad,
  form,
  formWord,
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
