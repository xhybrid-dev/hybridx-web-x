// src/lib/shop/glasgow-2027-pacing.ts
//
// The split profiles behind the Pacing Pack, for the free run-split preview on
// /hyrox-glasgow-2027, and the plan calendar behind "where to start".
// Client-safe.
//
// Each division's table in the pack scales one average profile to the target
// finish: a segment's time is a fixed share of the finish (Run 1 for Men is
// 5.87% of 1:10 and of 1:30 alike). The shares below were measured from the
// pack's printed tables and reproduce every printed split to within three
// seconds; src/lib/__tests__/glasgow-pacing.test.ts holds them to that.
//
// If the pack's tables change, re-measure: share = segment / finish, averaged
// over the columns. The preview deliberately shows the runs, the halfway clock
// and the totals, not each station: those, the worksheet and the race cards
// are what the pack sells.

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

// ---------------------------------------------------------------------------
// The plan calendar (Guide, section 02)
// ---------------------------------------------------------------------------

/** Monday of Week 1. */
export const PLAN_START = '2026-10-12';
export const PLAN_WEEKS = 22;

export type PlanPosition =
  | { kind: 'before'; startsOn: string }
  | { kind: 'week'; week: number; phase: string }
  | { kind: 'after' };

const PHASES: Array<[number, string]> = [
  [6, 'Base'],
  [12, 'Build'],
  [19, 'Race specific'],
  [22, 'Peak and taper'],
];

/** Which week of the plan a date falls in, using UK dates. */
export function planPosition(now: Date): PlanPosition {
  const ukDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);
  const days = Math.round((Date.parse(`${ukDate}T00:00:00Z`) - Date.parse(`${PLAN_START}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { kind: 'before', startsOn: PLAN_START };
  const week = Math.floor(days / 7) + 1;
  if (week > PLAN_WEEKS) return { kind: 'after' };
  const phase = PHASES.find(([last]) => week <= last)![1];
  return { kind: 'week', week, phase };
}

// ---------------------------------------------------------------------------
// Time left to race week
// ---------------------------------------------------------------------------

/** Monday of Glasgow race week, and its last day (the Sunday). */
export const RACE_WEEK_START = '2027-03-08';
export const RACE_WEEK_END = '2027-03-14';

export type RaceCountdown =
  | { kind: 'weeks'; n: number }
  | { kind: 'days'; n: number }
  | { kind: 'raceWeek' }
  | { kind: 'over' };

const dayNumber = (ymd: string) => Math.round(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);

/**
 * How long until race week, in UK dates: whole weeks while it is two or more
 * weeks away, days inside that.
 */
export function raceCountdown(now: Date): RaceCountdown {
  const today = dayNumber(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now));
  const days = dayNumber(RACE_WEEK_START) - today;
  if (days > 0) return days >= 14 ? { kind: 'weeks', n: Math.floor(days / 7) } : { kind: 'days', n: days };
  return today <= dayNumber(RACE_WEEK_END) ? { kind: 'raceWeek' } : { kind: 'over' };
}

/** "22 weeks to race week", or null once the race has passed. */
export function raceCountdownLabel(c: RaceCountdown): string | null {
  switch (c.kind) {
    case 'weeks':
      return `${c.n} weeks to race week`;
    case 'days':
      return `${c.n} ${c.n === 1 ? 'day' : 'days'} to race week`;
    case 'raceWeek':
      return 'Race week is here';
    case 'over':
      return null;
  }
}
