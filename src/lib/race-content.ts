/*
 * src/lib/race-content.ts
 *
 * The race format behind race.hybridx.club, the page for HybridX Race on UNA
 * Watch.
 *
 * Mirrors the watch app's own definition (hybridx-race/Software/Libs/Header/
 * RaceData.hpp and the segment rule in RaceModel) so the page cannot describe a
 * race the watch does not record. If the watch changes a station, a label or
 * the Roxzone rule, change it here too; src/lib/__tests__/race-content.test.ts
 * pins the segment counts the watch's own host tests pin (16/8/8, 31/15/15).
 */

export type SegmentKind = 'run' | 'roxIn' | 'station' | 'roxOut';

export type RaceFormat = 'full' | 'firstHalf' | 'secondHalf';

export interface Station {
  /** 1-based, as in the FIT file's station_id developer field. */
  id: number;
  /** As the watch shows it. */
  label: string;
  /** Title case, for prose. */
  name: string;
  work: string;
}

export interface Segment {
  kind: SegmentKind;
  /** The real round number, 1–8, in a half race too. */
  round: number;
  /** As the watch shows it: "RUN 5/8", "SKIERG", "ROXZONE IN". */
  label: string;
  work: string;
}

// The race's own order. Matches kStations in the watch's RaceData.hpp.
export const STATIONS: readonly Station[] = [
  { id: 1, label: 'SKIERG', name: 'SkiErg', work: '1000 m' },
  { id: 2, label: 'SLED PUSH', name: 'Sled Push', work: '50 m' },
  { id: 3, label: 'SLED PULL', name: 'Sled Pull', work: '50 m' },
  { id: 4, label: 'BURPEE BROAD JUMPS', name: 'Burpee Broad Jumps', work: '80 m' },
  { id: 5, label: 'ROW', name: 'Row', work: '1000 m' },
  { id: 6, label: 'FARMERS CARRY', name: 'Farmers Carry', work: '200 m' },
  { id: 7, label: 'SANDBAG LUNGES', name: 'Sandbag Lunges', work: '100 m' },
  { id: 8, label: 'WALL BALLS', name: 'Wall Balls', work: '100 reps' },
];

// Run distance: the race's 1 km, or shortened for a sim. Matches the watch's
// kRunDistanceMinM / MaxM / StepM / DefaultM in RaceData.hpp.
export const RUN_MIN_M = 100;
export const RUN_MAX_M = 1000;
export const RUN_STEP_M = 100;
export const RUN_DEFAULT_M = 1000;

/** As the watch writes it: "500 m", or "1 km" for the race distance (runWork). */
export function runWork(metres: number) {
  const m = Math.min(RUN_MAX_M, Math.max(RUN_MIN_M, Math.round(metres / RUN_STEP_M) * RUN_STEP_M));
  return m === 1000 ? '1 km' : `${m} m`;
}

/** The start screen's name for a format: a full race with shorter runs is a "Full sim". */
export function formatName(format: RaceFormat, runM = RUN_DEFAULT_M) {
  if (format === 'full') return runM === RUN_DEFAULT_M ? 'Full race' : 'Full sim';
  return FORMATS.find((f) => f.id === format)?.label ?? '';
}

export const FORMATS: readonly { id: RaceFormat; label: string; rounds: [number, number] }[] = [
  { id: 'full', label: 'Full race', rounds: [1, 8] },
  { id: 'firstHalf', label: 'Rounds 1–4', rounds: [1, 4] },
  { id: 'secondHalf', label: 'Rounds 5–8', rounds: [5, 8] },
];

/**
 * The segments a race records, in order.
 *
 * Roxzone off: RUN, STATION for each round. Roxzone on: RUN, ROXZONE IN,
 * STATION, ROXZONE OUT — except that no ROXZONE OUT follows the final station,
 * because the race ends when the last station does. Runs are 1 km unless the
 * run distance is shortened for a sim (100 m to 1 km, in 100 m steps).
 */
export function buildSegments(format: RaceFormat, roxzone: boolean, runM = RUN_DEFAULT_M): Segment[] {
  const found = FORMATS.find((f) => f.id === format);
  if (!found) return [];
  const [first, last] = found.rounds;
  const segments: Segment[] = [];

  for (let round = first; round <= last; round++) {
    const station = STATIONS[round - 1];
    segments.push({ kind: 'run', round, label: `RUN ${round}/8`, work: runWork(runM) });
    if (roxzone) segments.push({ kind: 'roxIn', round, label: 'ROXZONE IN', work: 'Transition' });
    segments.push({ kind: 'station', round, label: station.label, work: station.work });
    if (roxzone && round !== last) {
      segments.push({ kind: 'roxOut', round, label: 'ROXZONE OUT', work: 'Transition' });
    }
  }

  return segments;
}
