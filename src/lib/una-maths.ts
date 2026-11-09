/*
 * The arithmetic the X family of UNA Watch apps does on the wrist, restated
 * for the /una pages so their demos run the real formulas rather than
 * illustrations of them.
 *
 * Every function here mirrors a named piece of the watch repository
 * (xhybrid-dev/una-hyrox):
 *   - edwardsLoad        hybridx-link  TrainingLoad.hpp
 *   - stepLoad, formWord hybridx-streak LoadHistory.hpp
 *   - acsmRunningCost,
 *     vo2maxFromMinute,
 *     tanakaMaxHr        hybridx-run   Vo2Run / Vo2Profile
 *
 * src/lib/__tests__/una-maths.test.ts pins them to the same hand-worked
 * figures the watch's host tests use (54.4, and a load of 39). If a method
 * changes on the watch, change it here and the tests will say what moved.
 */

/** Minutes in heart-rate zones 1 to 5, as the watch's own thresholds cut them. */
export type ZoneMinutes = readonly [number, number, number, number, number];

/**
 * Edwards' training load: each minute in zone N scores N points. Time below
 * zone 1, or with no heart rate at all, scores nothing.
 */
export function edwardsLoad(zones: ZoneMinutes): number {
  const raw = zones.reduce((sum, minutes, i) => sum + Math.max(0, minutes) * (i + 1), 0);
  return Math.round(raw);
}

export const FITNESS_DAYS = 42;
export const FATIGUE_DAYS = 7;

export type LoadState = { fitness: number; fatigue: number };

/**
 * One day of Banister's model as X Streak runs it: fitness moves 1/42 of the
 * way towards the day's load, fatigue 1/7 of the way. A rest day is a load of 0.
 */
export function stepLoad(state: LoadState, dayLoad: number): LoadState {
  return {
    fitness: state.fitness + (dayLoad - state.fitness) / FITNESS_DAYS,
    fatigue: state.fatigue + (dayLoad - state.fatigue) / FATIGUE_DAYS,
  };
}

export function form(state: LoadState): number {
  return state.fitness - state.fatigue;
}

export type FormWord = 'Fresh' | 'Steady' | 'Building' | 'Overreaching';

/**
 * X Streak's word for where you are: form as a share of fitness. The bands are
 * the watch's own and are marked provisional there.
 */
export function formWord(state: LoadState): FormWord {
  if (state.fitness <= 0) return 'Steady';
  const share = form(state) / state.fitness;
  if (share > 0.1) return 'Fresh';
  if (share >= -0.1) return 'Steady';
  if (share >= -0.3) return 'Building';
  return 'Overreaching';
}

/**
 * The ACSM running equation: oxygen cost in ml/kg/min of running at
 * `speedMPerMin` on a gradient of `grade` (a fraction, 0.05 for 5 %).
 * ACSM gives it for level and uphill running, so a downhill counts as level.
 */
export function acsmRunningCost(speedMPerMin: number, grade = 0): number {
  const g = Math.max(0, grade);
  return 3.5 + 0.2 * speedMPerMin + 0.9 * speedMPerMin * g;
}

/** Heart-rate reserve in use, 0 to 1. */
export function hrReserveFraction(hr: number, restHr: number, maxHr: number): number {
  return (hr - restHr) / (maxHr - restHr);
}

/**
 * VO2max from one steady minute: the minute's oxygen cost, scaled up by how
 * much of the heart-rate reserve it used (%HRR ≈ %VO2 reserve).
 */
export function vo2maxFromMinute(args: {
  speedMPerMin: number;
  grade?: number;
  hr: number;
  restHr: number;
  maxHr: number;
}): number {
  const cost = acsmRunningCost(args.speedMPerMin, args.grade ?? 0);
  const reserve = hrReserveFraction(args.hr, args.restHr, args.maxHr);
  return 3.5 + (cost - 3.5) / reserve;
}

/** Tanaka's age-predicted maximum heart rate, used when none is entered. */
export function tanakaMaxHr(age: number): number {
  return 208 - 0.7 * age;
}

/** X Run only scores a minute at or above these. */
export const VO2_MIN_SPEED_M_PER_MIN = 134; // 7:28 /km, the foot of ACSM's running range
export const VO2_MIN_RESERVE = 0.5;

export function paceToSpeed(secondsPerKm: number): number {
  return 60000 / secondsPerKm;
}

export function formatPace(secondsPerKm: number): string {
  const s = Math.round(secondsPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
