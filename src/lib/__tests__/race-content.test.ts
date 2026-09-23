import { describe, expect, it } from 'vitest';
import { buildSegments, STATIONS } from '../race-content';

// The same counts the watch app's RaceTemplateTest pins. If these drift, the
// page is describing a race the watch does not record.
describe('buildSegments', () => {
  it.each([
    ['full', false, 16],
    ['firstHalf', false, 8],
    ['secondHalf', false, 8],
    ['full', true, 31],
    ['firstHalf', true, 15],
    ['secondHalf', true, 15],
  ] as const)('%s with Roxzone %s has %i segments', (format, roxzone, count) => {
    expect(buildSegments(format, roxzone)).toHaveLength(count);
  });

  it('alternates run and station, starting with a run', () => {
    const kinds = buildSegments('full', false).map((s) => s.kind);
    kinds.forEach((kind, i) => expect(kind).toBe(i % 2 === 0 ? 'run' : 'station'));
  });

  it('never follows the final station with a Roxzone out', () => {
    for (const format of ['full', 'firstHalf', 'secondHalf'] as const) {
      const last = buildSegments(format, true).at(-1);
      expect(last?.kind).toBe('station');
    }
  });

  it('keeps the real round numbers in the second half', () => {
    const [first] = buildSegments('secondHalf', false);
    expect(first.label).toBe('RUN 5/8');
  });

  it('runs the stations in race order', () => {
    const stations = buildSegments('full', false).filter((s) => s.kind === 'station');
    expect(stations.map((s) => s.label)).toEqual(STATIONS.map((s) => s.label));
  });
});
