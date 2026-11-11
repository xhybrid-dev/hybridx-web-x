// src/lib/shop/glasgow-2027-pacing.ts
//
// The Glasgow page's helpers: the plan calendar behind "where to start", and the
// countdown to race week. Client-safe.
//
// The profiles and the arithmetic now live in src/lib/hyrox-pacing.ts, shared
// with the free HYROX pacer. Re-exported here so the Glasgow page, its preview
// and its tests are unchanged.
export { DIVISION_PROFILES, formatDuration, previewSplits } from '@/lib/hyrox-pacing';
export type { DivisionProfile, SplitPreview } from '@/lib/hyrox-pacing';

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
