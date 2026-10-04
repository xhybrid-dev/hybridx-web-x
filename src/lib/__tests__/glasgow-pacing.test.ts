import { describe, it, expect } from 'vitest';
import {
  DIVISION_PROFILES, formatDuration, planPosition, previewSplits, raceCountdown, raceCountdownLabel,
} from '../shop/glasgow-2027-pacing';

/**
 * The free preview on /hyrox-glasgow-2027 must agree with the Pacing Pack a
 * buyer then downloads. These values are copied from the pack's printed
 * tables; the preview may differ from them by rounding only.
 */

const sec = (t: string) => t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
const profile = (key: string) => DIVISION_PROFILES.find((d) => d.key === key)!;
const near = (actual: number, printed: string) => expect(Math.abs(actual - sec(printed))).toBeLessThanOrEqual(3);

describe('previewSplits matches the printed Pacing Pack tables', () => {
  it('Men at 1:30', () => {
    const r = previewSplits(profile('men'), sec('1:30:00'));
    ['5:17', '5:17', '5:23', '5:24', '5:33', '5:46', '5:51', '6:01'].forEach((t, i) => near(r.runs[i], t));
    near(r.halfway, '0:42:52');
    near(r.allRuns, '44:32');
    near(r.roxzone, '6:51');
    near(r.averageRun, '5:34');
  });

  it('Women Pro at 1:30', () => {
    const r = previewSplits(profile('women-pro'), sec('1:30:00'));
    near(r.runs[0], '5:13');
    near(r.runs[7], '5:45');
    near(r.halfway, '0:46:14');
    near(r.allRuns, '43:39');
  });

  it('Doubles Mixed at 2:00', () => {
    const r = previewSplits(profile('doubles-mixed'), sec('2:00:00'));
    near(r.runs[7], '9:16');
    near(r.halfway, '0:58:24');
    near(r.allRuns, '1:10:22');
    near(r.roxzone, '9:22');
  });

  it('every profile accounts for the whole finish time', () => {
    for (const d of DIVISION_PROFILES) {
      const total = [...d.runs, ...d.stations, d.roxzone].reduce((a, b) => a + b, 0);
      expect(total, d.key).toBeCloseTo(1, 3);
      expect(d.runs).toHaveLength(8);
      expect(d.stations).toHaveLength(8);
    }
    expect(DIVISION_PROFILES).toHaveLength(7);
  });
});

describe('formatDuration', () => {
  it('formats under and over an hour', () => {
    expect(formatDuration(317)).toBe('5:17');
    expect(formatDuration(5400)).toBe('1:30:00');
  });
});

describe('planPosition', () => {
  it('before the plan starts', () => {
    expect(planPosition(new Date('2026-10-03T12:00:00Z'))).toEqual({ kind: 'before', startsOn: '2026-10-12' });
  });
  it('week 1 starts on Monday 12 October, UK time', () => {
    expect(planPosition(new Date('2026-10-11T23:30:00Z'))).toMatchObject({ kind: 'week', week: 1, phase: 'Base' });
  });
  it('matches the guide timeline', () => {
    expect(planPosition(new Date('2026-12-07T12:00:00Z'))).toMatchObject({ week: 9, phase: 'Build' });
    expect(planPosition(new Date('2027-01-04T12:00:00Z'))).toMatchObject({ week: 13, phase: 'Race specific' });
    expect(planPosition(new Date('2027-03-08T12:00:00Z'))).toMatchObject({ week: 22, phase: 'Peak and taper' });
  });
  it('after race week', () => {
    expect(planPosition(new Date('2027-03-15T12:00:00Z'))).toEqual({ kind: 'after' });
  });
});

describe('raceCountdown', () => {
  // Race week starts Monday 8 March 2027.
  const label = (iso: string) => raceCountdownLabel(raceCountdown(new Date(iso)));

  it('counts whole weeks while two or more weeks away', () => {
    expect(label('2026-10-04T12:00:00Z')).toBe('22 weeks to race week'); // 155 days
    expect(label('2026-10-12T12:00:00Z')).toBe('21 weeks to race week'); // 147 days, the day Week 1 starts
    expect(label('2027-02-22T12:00:00Z')).toBe('2 weeks to race week'); // 14 days
  });

  it('switches to days inside two weeks', () => {
    expect(label('2027-02-23T12:00:00Z')).toBe('13 days to race week');
    expect(label('2027-03-07T12:00:00Z')).toBe('1 day to race week');
  });

  it('says race week is here from the Monday to the Sunday, then stops', () => {
    expect(label('2027-03-08T09:00:00Z')).toBe('Race week is here');
    expect(label('2027-03-14T22:00:00Z')).toBe('Race week is here');
    expect(label('2027-03-15T09:00:00Z')).toBeNull();
  });

  it('uses UK dates across the clock change', () => {
    // 23:30 GMT on 7 March is still 7 March in the UK: one day to go.
    expect(label('2027-03-07T23:30:00Z')).toBe('1 day to race week');
    // 23:30 UTC on 27 March is 00:30 BST on 28 March, after race week either way.
    expect(label('2027-03-27T23:30:00Z')).toBeNull();
  });
});
