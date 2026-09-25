import { describe, expect, it } from 'vitest';
import {
  CLIMBS,
  climbFor,
  coachLine,
  headline,
  MAX_COACH_CHARS,
  moodFor,
  mountainLine,
  TARGET_MAX,
  TARGET_MIN,
} from '../streak-content';

// Values pinned from the watch app (see the header of streak-content.ts). If
// one of these drifts, the page is describing a streak the watch does not keep.

describe('the climbs', () => {
  it('match the watch: summit weeks and steps', () => {
    expect(CLIMBS.map((c) => [c.name, c.summitAt, c.steps])).toEqual([
      ["Arthur's Seat", 4, 4],
      ['Snowdon', 12, 8],
      ['Ben Nevis', 26, 14],
      ['Mont Blanc', 52, 26],
      ['Everest', 104, 52],
    ]);
  });

  it('each climb’s steps are the gap from the previous summit', () => {
    CLIMBS.forEach((c, i) => {
      const floor = i === 0 ? 0 : CLIMBS[i - 1].summitAt;
      expect(c.summitAt - floor).toBe(c.steps);
    });
  });
});

describe('climbFor', () => {
  it.each([
    [0, 0, 0, 1],
    [3, 0, 3, 1],
    [4, 1, 0, 1], // reaching a summit starts the next climb
    [11, 1, 7, 1],
    [26, 3, 0, 1],
    [103, 4, 51, 1],
    [104, 4, 0, 2], // Everest again
    [157, 4, 1, 3],
  ])('%i weeks -> climb %i, step %i, ascent %i', (weeks, climb, step, ascent) => {
    const pos = climbFor(weeks);
    expect([pos.climb, pos.stepsClimbed, pos.ascent]).toEqual([climb, step, ascent]);
  });
});

describe('mountainLine', () => {
  it('reads as the watch writes it', () => {
    expect(mountainLine(0)).toBe("Arthur's Seat · 4 weeks to go");
    expect(mountainLine(7)).toBe('Snowdon · 5 weeks to go');
    expect(mountainLine(11)).toBe('Snowdon · 1 week to go');
    expect(mountainLine(104)).toBe('Everest again · 52 weeks to go');
  });
});

describe('coachLine', () => {
  it.each([
    [{ target: 3, sessions: 3, daysLeft: 4 }, 'Week banked. Rest up.'],
    [{ target: 3, sessions: 5, daysLeft: 2 }, 'Week banked, +2 bonus'],
    [{ target: 3, sessions: 1, daysLeft: 6, trial: true }, 'Week one, no pressure'],
    [{ target: 3, sessions: 2, daysLeft: 3 }, '1 more · 3 days left'],
    [{ target: 4, sessions: 2, daysLeft: 2 }, '2 more in 2 days. Go!'],
    [{ target: 3, sessions: 1, daysLeft: 1 }, 'Last day: 2 to go'],
  ])('%j -> %s', (view, line) => {
    expect(coachLine(view)).toBe(line);
  });

  it('is at risk only when the sessions needed reach the days left', () => {
    expect(moodFor({ target: 3, sessions: 1, daysLeft: 3 })).toBe('climbing');
    expect(moodFor({ target: 3, sessions: 1, daysLeft: 2 })).toBe('atRisk');
  });

  it('always fits the disc', () => {
    for (let target = TARGET_MIN; target <= TARGET_MAX; target++) {
      for (let sessions = 0; sessions <= target + 3; sessions++) {
        for (let daysLeft = 1; daysLeft <= 7; daysLeft++) {
          for (const trial of [false, true]) {
            expect(coachLine({ target, sessions, daysLeft, trial }).length).toBeLessThanOrEqual(MAX_COACH_CHARS);
          }
        }
      }
    }
  });
});

describe('headline', () => {
  it('names the streak, the first week or a new start', () => {
    expect(headline(7, false)).toEqual({ number: '7', words: 'week streak' });
    expect(headline(0, true).words).toBe('Your first week');
    expect(headline(0, false).words).toBe('Start a new streak');
  });
});
