/*
 * src/lib/streak-content.ts
 *
 * The rules behind streak.hybridx.club, the page for HybridX Streak on UNA
 * Watch.
 *
 * Mirrors the watch app so the page cannot describe a streak the watch does
 * not keep:
 *   - CLIMBS and BADGES:  hybridx-streak/Software/Libs/Core/Header/Summits.hpp
 *   - climbFor():         the same function there
 *   - SHIELD_*:           kShieldEvery / kMaxShields in Core/Sources/StreakModel.cpp
 *   - moodFor():          StreakModel::homeView (at risk when the sessions still
 *                         needed are at least the days left)
 *   - coachLine():        Coach::coachLine in gui/src/copy/Coach.cpp
 *   - headline(), mountainLine(): the same file
 *
 * If the watch changes one of these, change it here too;
 * src/lib/__tests__/streak-content.test.ts pins the values.
 */

export interface Climb {
  name: string;
  /** Cumulative weeks completed at the top. */
  summitAt: number;
  /** Weeks between the previous summit and this one. */
  steps: number;
}

export const CLIMBS: readonly Climb[] = [
  { name: "Arthur's Seat", summitAt: 4, steps: 4 },
  { name: 'Snowdon', summitAt: 12, steps: 8 },
  { name: 'Ben Nevis', summitAt: 26, steps: 14 },
  { name: 'Mont Blanc', summitAt: 52, steps: 26 },
  { name: 'Everest', summitAt: 104, steps: 52 },
];

/** Weeks for each extra ascent of Everest after the first. */
export const REPEAT_STEPS = 52;

export const BADGES: readonly { name: string; sessions: number }[] = [
  { name: 'Trailhead', sessions: 10 },
  { name: 'Ridge Walker', sessions: 50 },
  { name: 'Centurion', sessions: 100 },
  { name: 'Mountaineer', sessions: 250 },
];

/** One shield for every this many weeks completed… */
export const SHIELD_EVERY = 4;
/** …held up to this many. */
export const MAX_SHIELDS = 2;

export const TARGET_MIN = 1;
export const TARGET_MAX = 7;
export const DEFAULT_TARGET = 3;
/** Sessions shorter than this don't count, by default. */
export const DEFAULT_MIN_MINUTES = 10;

export interface ClimbPosition {
  /** Index into CLIMBS. */
  climb: number;
  /** Steps climbed on this mountain, 0 .. steps - 1. */
  stepsClimbed: number;
  steps: number;
  /** 1 the first time up; 2+ for repeat ascents of Everest. */
  ascent: number;
}

export function climbFor(weeksAchieved: number): ClimbPosition {
  let floor = 0;
  for (let i = 0; i < CLIMBS.length; i++) {
    if (weeksAchieved < CLIMBS[i].summitAt) {
      return { climb: i, stepsClimbed: weeksAchieved - floor, steps: CLIMBS[i].steps, ascent: 1 };
    }
    floor = CLIMBS[i].summitAt;
  }
  const beyond = weeksAchieved - floor;
  return {
    climb: CLIMBS.length - 1,
    stepsClimbed: beyond % REPEAT_STEPS,
    steps: REPEAT_STEPS,
    ascent: 2 + Math.floor(beyond / REPEAT_STEPS),
  };
}

/** "Snowdon · 5 weeks to go", or "Everest again · …" on a repeat ascent. */
export function mountainLine(weeksAchieved: number): string {
  const pos = climbFor(weeksAchieved);
  const left = pos.steps - pos.stepsClimbed;
  const again = pos.ascent > 1 ? ' again' : '';
  return `${CLIMBS[pos.climb].name}${again} · ${left} week${left === 1 ? '' : 's'} to go`;
}

export type Mood = 'trial' | 'climbing' | 'atRisk' | 'done';

export interface WeekView {
  /** Sessions a week, 1..7. */
  target: number;
  /** Counted sessions so far this week. */
  sessions: number;
  /** Days left in the week, including today, 1..7. */
  daysLeft: number;
  /** The first week of a goal: counts if met, can't break the streak. */
  trial?: boolean;
}

export function moodFor(v: WeekView): Mood {
  const remaining = Math.max(0, v.target - v.sessions);
  if (remaining === 0) return 'done';
  if (v.trial) return 'trial';
  if (remaining >= v.daysLeft) return 'atRisk';
  return 'climbing';
}

/** The line under the pips, as the watch words it. */
export function coachLine(v: WeekView): string {
  const left = v.sessions >= v.target ? 0 : v.target - v.sessions;

  if (left === 0) {
    const extra = v.sessions - v.target;
    return extra === 0 ? 'Week banked. Rest up.' : `Week banked, +${extra} bonus`;
  }
  if (v.trial) return 'Week one, no pressure';
  if (v.daysLeft <= 1) return `Last day: ${left} to go`;
  if (moodFor(v) === 'atRisk') return `${left} more in ${v.daysLeft} days. Go!`;
  return `${left} more · ${v.daysLeft} days left`;
}

/** The headline's words: "7 week streak", "Your first week", "Start a new streak". */
export function headline(streakWeeks: number, trial: boolean): { number: string; words: string } {
  if (streakWeeks > 0) return { number: String(streakWeeks), words: 'week streak' };
  return { number: '', words: trial ? 'Your first week' : 'Start a new streak' };
}

/** The watch shows up to this many bonus pips beyond the target. */
export const MAX_BONUS_PIPS = 3;
/** Coach lines must fit the narrowing disc: at most this many characters. */
export const MAX_COACH_CHARS = 21;
