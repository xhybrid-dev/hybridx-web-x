import { describe, expect, it } from 'vitest';
import { DIVISION_PROFILES, finishOptions, formatDuration, fullSplits, previewSplits } from '../hyrox-pacing';
import { STATION_WORK } from '../facts';

/*
 * The full split table behind the free HYROX pacer (plan step 9), for every
 * division and every finish time it offers. The profiles themselves are held
 * to the Pacing Pack's printed tables by glasgow-pacing.test.ts.
 */

const ALL = DIVISION_PROFILES.flatMap((p) => finishOptions(p).map((m) => [p, m] as const));

describe('the full table', () => {
  it.each(ALL.map(([p, m]) => [`${p.label} ${formatDuration(m * 60)}`, p, m] as const))('%s', (_, profile, minutes) => {
    const t = fullSplits(profile, minutes * 60);

    // Race order: Run 1, SkiErg, Run 2, Sled Push ... Run 8, Wall Balls.
    expect(t.segments.map((s) => s.name)).toEqual(STATION_WORK.flatMap((st, i) => [`Run ${i + 1}`, st.name]));

    // The clock only goes forward, and ends on the finish, to the second.
    for (let i = 1; i < 16; i++) expect(t.segments[i].clock).toBeGreaterThan(t.segments[i - 1].clock);
    expect(t.finish).toBe(minutes * 60);

    // Runs, stations and Roxzone add up to the finish, within rounding.
    const own = t.segments.reduce((n, s) => n + s.seconds, 0);
    expect(Math.abs(own + t.roxzone - minutes * 60)).toBeLessThanOrEqual(9);

    // The same numbers as the Glasgow preview, which the pack's tables pin.
    const preview = previewSplits(profile, minutes * 60);
    t.segments.filter((s) => s.kind === 'run').forEach((s, i) => expect(Math.abs(s.seconds - preview.runs[i])).toBeLessThanOrEqual(1));
    // Halfway is the clock leaving Station 4.
    expect(Math.abs(t.segments[7].clock - preview.halfway)).toBeLessThanOrEqual(2);
  });

  it('covers every division across its whole range', () => {
    expect(ALL.length).toBeGreaterThan(70);
    expect(finishOptions(DIVISION_PROFILES[0])).toEqual([70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120]);
  });

  it('gives a Men Open 1:30 a first run near 5:17', () => {
    const t = fullSplits(DIVISION_PROFILES[0], 90 * 60);
    expect(formatDuration(t.segments[0].seconds)).toBe('5:17');
  });
});
