import { describe, it, expect } from 'vitest';
import {
  comparisonRows,
  computeBreakEven,
  computePacing,
  describeRunPace,
  formatTime,
  formatTimePrecise,
  RUN_PACE_MIN,
  ZONE_CAP_SECONDS,
} from '../athx-pacing';

/**
 * The ATHX funnel page argues that the standard advice to start the Endurance
 * Zone easy is a scoring error, and it argues it with arithmetic the visitor can
 * check against their own numbers. If that arithmetic is wrong the page is worse
 * than useless — it is confidently wrong to an audience who will notice.
 *
 * The six cases below are the ones published in the build brief. They are the
 * acceptance criteria, not illustrations, so they are asserted exactly.
 */

/** `m:ss` -> seconds, so the cases read as they were written. */
const secs = (mmss: string): number => {
  const [m, s] = mmss.split(':').map(Number);
  return m * 60 + s;
};

describe('computePacing — the six published cases', () => {
  const cases: Array<{ run: string; ski: string; skiTime: string; metres: number }> = [
    { run: '4:30', ski: '2:00', skiTime: '10:30', metres: 2625 },
    { run: '4:00', ski: '2:00', skiTime: '12:00', metres: 3000 },
    { run: '3:30', ski: '2:00', skiTime: '13:30', metres: 3375 },
    { run: '4:30', ski: '2:20', skiTime: '10:30', metres: 2250 },
    { run: '4:00', ski: '2:20', skiTime: '12:00', metres: 2571 },
    { run: '5:00', ski: '2:00', skiTime: '9:00', metres: 2250 },
  ];

  for (const { run, ski, skiTime, metres } of cases) {
    it(`${run}/km at ${ski}/500m leaves ${skiTime} and scores ${metres}m`, () => {
      const result = computePacing(secs(run), secs(ski));
      expect(formatTime(result.skiSeconds)).toBe(skiTime);
      expect(result.distanceMetres).toBe(metres);
      expect(result.overCap).toBe(false);
    });
  }
});

describe('computePacing — the shape of the model', () => {
  it('spends the whole zone: run time plus ski time is always the cap', () => {
    const result = computePacing(secs('4:30'), secs('2:00'));
    expect(result.runSeconds + result.skiSeconds).toBe(ZONE_CAP_SECONDS);
  });

  it('floors partial metres rather than rounding them up', () => {
    // 720s at 2:20/500 is 2571.43m. A metre only scores once it is covered.
    expect(computePacing(secs('4:00'), secs('2:20')).distanceMetres).toBe(2571);
  });

  it('reports what one second saved on the run is worth', () => {
    // 500m / 120s = 4.1666… metres for every second not spent running.
    expect(computePacing(secs('4:30'), secs('2:00')).metresPerSecond).toBeCloseTo(4.17, 2);
  });

  it('is the source of the page’s 187m claim', () => {
    // Fifteen seconds per kilometre over 3 km is 45 seconds, and 45 seconds at
    // a 2:00/500m ski pace is the headline figure in the black band section.
    const at430 = computePacing(secs('4:30'), secs('2:00'));
    const at415 = computePacing(secs('4:15'), secs('2:00'));
    expect(at415.distanceMetres - at430.distanceMetres).toBe(187);
  });

  it('clamps the ski time at zero and flags the over-cap state', () => {
    // 8:00/km spends the entire 24 minutes running: the athlete never skis.
    const result = computePacing(secs('8:00'), secs('2:00'));
    expect(result.skiSeconds).toBe(0);
    expect(result.distanceMetres).toBe(0);
    expect(result.overCap).toBe(true);
  });

  it('treats exactly reaching the cap as over-cap', () => {
    const result = computePacing(ZONE_CAP_SECONDS / 3, secs('2:00'));
    expect(result.skiSeconds).toBe(0);
    expect(result.overCap).toBe(true);
  });
});

describe('computeBreakEven', () => {
  it('matches the brief’s worked example: 4:30 to 4:00 at a 2:00 base', () => {
    const result = computeBreakEven(secs('4:30'), secs('2:00'), 30);
    expect(result).not.toBeNull();
    // 720/630 - 1 = +14.2857%, which the page rounds to one decimal place.
    expect(result!.allowableDecayPct.toFixed(1)).toBe('14.3');
    // 120s x 720/630 = 137.14s per 500m.
    expect(result!.allowableSkiPace).toBeCloseTo(137.14, 2);
    expect(formatTimePrecise(result!.allowableSkiPace)).toBe('2:17.1');
  });

  it('defaults to a single 15 s/km step', () => {
    const result = computeBreakEven(secs('4:30'), secs('2:00'));
    expect(result!.fasterRunPace).toBe(secs('4:15'));
    expect(result!.metresGained).toBe(187);
    // 675/630 - 1 = +7.14%.
    expect(result!.allowableDecayPct).toBeCloseTo(7.14, 2);
  });

  it('is independent of the ski pace it is measured from', () => {
    // The affordable *decay* is a ratio of ski times, so it does not depend on
    // how fast the athlete skis — only the pace it converts to does.
    const fast = computeBreakEven(secs('4:30'), secs('1:45'))!;
    const slow = computeBreakEven(secs('4:30'), secs('2:45'))!;
    expect(fast.allowableDecayPct).toBeCloseTo(slow.allowableDecayPct, 10);
    expect(fast.allowableSkiPace).toBeLessThan(slow.allowableSkiPace);
  });

  it('declines to compare below the model’s fastest run pace', () => {
    expect(computeBreakEven(RUN_PACE_MIN, secs('2:00'))).toBeNull();
    expect(computeBreakEven(RUN_PACE_MIN + 14, secs('2:00'))).toBeNull();
    expect(computeBreakEven(RUN_PACE_MIN + 15, secs('2:00'))).not.toBeNull();
  });

  it('declines when the run already consumes the zone', () => {
    expect(computeBreakEven(secs('8:00'), secs('2:00'))).toBeNull();
  });
});

describe('comparisonRows', () => {
  const rows = comparisonRows(secs('4:30'), secs('2:00'));

  it('shows the current pace and three steps either side', () => {
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.deltaPerKm)).toEqual([-45, -30, -15, 0, 15, 30, 45]);
  });

  it('marks exactly one row as current, and it is the one submitted', () => {
    const current = rows.filter((r) => r.current);
    expect(current).toHaveLength(1);
    expect(current[0].runPacePerKm).toBe(secs('4:30'));
    expect(current[0].metresVsCurrent).toBe(0);
    expect(current[0].distanceMetres).toBe(2625);
  });

  it('falls monotonically as the run gets slower', () => {
    const metres = rows.map((r) => r.distanceMetres);
    for (let i = 1; i < metres.length; i++) {
      expect(metres[i]).toBeLessThan(metres[i - 1]);
    }
  });

  it('prices each step at 187m either side, which is the page’s whole argument', () => {
    expect(rows.find((r) => r.deltaPerKm === -15)!.metresVsCurrent).toBe(187);
    expect(rows.find((r) => r.deltaPerKm === 15)!.metresVsCurrent).toBe(-188);
  });

  it('keeps its shape at the ends of the slider domain', () => {
    // The window is generated from offsets, so a pace at either extreme still
    // renders seven rows and nothing below the table moves.
    expect(comparisonRows(secs('3:00'), secs('1:40'))).toHaveLength(7);
    expect(comparisonRows(secs('5:30'), secs('2:50'))).toHaveLength(7);
  });
});

describe('formatting', () => {
  it('pads seconds to two digits', () => {
    expect(formatTime(630)).toBe('10:30');
    expect(formatTime(605)).toBe('10:05');
    expect(formatTime(120)).toBe('2:00');
  });

  it('never renders a negative duration', () => {
    expect(formatTime(-30)).toBe('0:00');
  });

  it('carries a rounded 60.0 into the next minute rather than printing 1:60.0', () => {
    expect(formatTimePrecise(119.97)).toBe('2:00.0');
    expect(formatTimePrecise(137.142857)).toBe('2:17.1');
    expect(formatTimePrecise(125.04)).toBe('2:05.0');
  });

  it('spells paces out for assistive technology', () => {
    expect(describeRunPace(270)).toBe('4:30 per kilometre');
  });
});
