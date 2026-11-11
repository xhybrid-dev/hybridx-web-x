// src/lib/hyrox-pacing.ts
//
// HYROX split profiles: how a finish time divides into eight runs, eight
// stations and the Roxzone, per division. Shared by the free HYROX pacer
// (/calculators/hyrox-pacer, plan step 9) and the Glasgow Pacing Pack's
// preview. Client-safe.
//
// Each division's table in the Pacing Pack scales one average profile to the
// target finish: a segment's time is a fixed share of the finish (Run 1 for Men
// is 5.87% of 1:10 and of 1:30 alike). The shares below were measured from the
// pack's printed tables and reproduce every printed split to within three
// seconds; src/lib/__tests__/glasgow-pacing.test.ts holds them to that, and
// src/lib/__tests__/hyrox-pacing.test.ts holds the full table to the finish.
//
// If the pack's tables change, re-measure: share = segment / finish, averaged
// over the columns.
//
// What is free (Jon, D9, 11 November 2026): the whole table, on the page. A
// download or an email of it is the Pacing Pack, with its race cards and the
// finish-time prediction.

// Straight from the standards file, not the facts index: this runs in the browser.
import { STATION_WORK } from '@/lib/facts/hyrox-standards';

export interface DivisionProfile {
  key: string;
  label: string;
  /** The pack's table range, in minutes. The preview offers the same range. */
  minMinutes: number;
  maxMinutes: number;
  /** Share of the finish time for Runs 1 to 8. */
  runs: number[];
  /** Share for Stations 1 to 8, in race order. */
  stations: number[];
  /** Share for all 16 Roxzone passes together. */
  roxzone: number;
}

export const DIVISION_PROFILES: readonly DivisionProfile[] = [
  { key: 'men', label: 'Men', minMinutes: 70, maxMinutes: 120, runs: [0.05868, 0.05868, 0.0598, 0.06, 0.06167, 0.06403, 0.065, 0.06685], stations: [0.04945, 0.03211, 0.05482, 0.06459, 0.05372, 0.02492, 0.06313, 0.08638], roxzone: 0.07619 },
  { key: 'women', label: 'Women', minMinutes: 80, maxMinutes: 130, runs: [0.06606, 0.06167, 0.07587, 0.06754, 0.06439, 0.06383, 0.06477, 0.07029], stations: [0.05942, 0.02952, 0.06313, 0.05463, 0.06183, 0.02513, 0.04762, 0.05259], roxzone: 0.07171 },
  { key: 'men-pro', label: 'Men Pro', minMinutes: 60, maxMinutes: 100, runs: [0.05538, 0.05391, 0.05946, 0.06254, 0.05844, 0.05946, 0.0605, 0.06667], stations: [0.05145, 0.04511, 0.07258, 0.05638, 0.05522, 0.025, 0.06312, 0.08366], roxzone: 0.07113 },
  { key: 'women-pro', label: 'Women Pro', minMinutes: 70, maxMinutes: 110, runs: [0.05789, 0.056, 0.06078, 0.06148, 0.06148, 0.06211, 0.06148, 0.06381], stations: [0.05657, 0.05025, 0.07686, 0.06041, 0.05619, 0.03078, 0.05371, 0.0633], roxzone: 0.06692 },
  { key: 'doubles-men', label: 'Doubles Men', minMinutes: 65, maxMinutes: 115, runs: [0.08216, 0.06599, 0.06889, 0.06867, 0.06978, 0.07086, 0.07019, 0.07333], stations: [0.05512, 0.02568, 0.04385, 0.04336, 0.05802, 0.02037, 0.04959, 0.05738], roxzone: 0.07676 },
  { key: 'doubles-women', label: 'Doubles Women', minMinutes: 75, maxMinutes: 125, runs: [0.07467, 0.06772, 0.07064, 0.07372, 0.07275, 0.07022, 0.07, 0.07275], stations: [0.05333, 0.02078, 0.04733, 0.05061, 0.05889, 0.02158, 0.04333, 0.05175], roxzone: 0.07993 },
  { key: 'doubles-mixed', label: 'Doubles Mixed', minMinutes: 70, maxMinutes: 120, runs: [0.07014, 0.06808, 0.07216, 0.07401, 0.07605, 0.07588, 0.07278, 0.07729], stations: [0.05111, 0.02681, 0.04315, 0.04211, 0.05623, 0.02245, 0.04541, 0.04826], roxzone: 0.07809 },
];

export interface SplitPreview {
  /** Seconds, Runs 1 to 8. */
  runs: number[];
  /** Clock time leaving Station 4, seconds. Roxzone spread evenly, as on the race cards. */
  halfway: number;
  allRuns: number;
  allStations: number;
  roxzone: number;
  averageRun: number;
}

export function previewSplits(profile: DivisionProfile, finishSeconds: number): SplitPreview {
  const runs = profile.runs.map((s) => s * finishSeconds);
  const stations = profile.stations.map((s) => s * finishSeconds);
  const roxzone = profile.roxzone * finishSeconds;
  const firstHalf =
    runs.slice(0, 4).reduce((a, b) => a + b, 0) + stations.slice(0, 4).reduce((a, b) => a + b, 0) + roxzone / 2;
  const allRuns = runs.reduce((a, b) => a + b, 0);
  return {
    runs: runs.map(Math.round),
    halfway: Math.round(firstHalf),
    allRuns: Math.round(allRuns),
    allStations: Math.round(stations.reduce((a, b) => a + b, 0)),
    roxzone: Math.round(roxzone),
    averageRun: Math.round(allRuns / 8),
  };
}

/** "5:17" under an hour, "1:30:00" from an hour. */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/* ── The whole race ─────────────────────────────────────────────────────── */

export interface Segment {
  kind: 'run' | 'station';
  /** 1 to 8. */
  n: number;
  name: string;
  /** Target for the segment itself, seconds. */
  seconds: number;
  /** Race clock at the end of it, seconds, with the Roxzone spread evenly over the 16 segments. */
  clock: number;
}

export interface FullSplits extends SplitPreview {
  segments: Segment[];
  finish: number;
}

/**
 * Every run and station in race order, with the race clock after each.
 *
 * The clock is rounded once, at each segment's end, and each segment is the
 * gap between rounded clocks, so the column adds up to the clock and the last
 * clock is the finish, to the second.
 */
export function fullSplits(profile: DivisionProfile, finishSeconds: number): FullSplits {
  const share = profile.roxzone / 16;
  const total = profile.runs.reduce((a, b) => a + b, 0) + profile.stations.reduce((a, b) => a + b, 0) + profile.roxzone;
  const segments: Segment[] = [];
  let exact = 0;
  let previous = 0;
  for (let i = 0; i < 8; i++) {
    for (const kind of ['run', 'station'] as const) {
      exact += ((kind === 'run' ? profile.runs[i] : profile.stations[i]) + share) * (finishSeconds / total);
      const clock = Math.round(exact);
      const name = kind === 'run' ? `Run ${i + 1}` : STATION_WORK[i].name;
      // The segment's own target excludes its Roxzone share: that is shown as one total.
      const own = Math.round((kind === 'run' ? profile.runs[i] : profile.stations[i]) * (finishSeconds / total));
      segments.push({ kind, n: i + 1, name, seconds: own, clock });
      previous = clock;
    }
  }
  return { ...previewSplits(profile, finishSeconds), segments, finish: previous };
}

/** The finish times a division's profile covers, every five minutes. */
export function finishOptions(profile: DivisionProfile): number[] {
  const out: number[] = [];
  for (let m = profile.minMinutes; m <= profile.maxMinutes; m += 5) out.push(m);
  return out;
}
