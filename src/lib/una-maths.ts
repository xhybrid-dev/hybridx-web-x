/*
 * The arithmetic the X family of UNA Watch apps does on the wrist, restated
 * for the /una pages so their demos run the real formulas rather than
 * illustrations of them.
 *
 * Every function here mirrors a named piece of the watch repository
 * (xhybrid-dev/una-hyrox):
 *   - edwardsLoad        hybridx-link     TrainingLoad.hpp
 *   - stepLoad, formWord,
 *     simulateWeekLoad   hybridx-streak   LoadHistory.hpp
 *   - acsmRunningCost,
 *     vo2maxFromMinute,
 *     tanakaMaxHr        hybridx-run      Vo2Run / Vo2Profile
 *   - danielsVo2Cost,
 *     danielsFraction,
 *     danielsFitness     hybridx-training PaceModel.cpp
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

/** One simulated day from X Streak's Banister training-load model. */
export type WeekLoadDay = {
  fitness: number;
  fatigue: number;
  form: number;
  word: FormWord;
};

/**
 * Daniels–Gilbert oxygen cost of running on the level, in ml/kg/min, at
 * `speedMPerMin` (metres per minute). Mirrors `PaceModel::vo2Cost` in
 * `hybridx-training/Software/Libs/Core/Sources/PaceModel.cpp`.
 *
 * Returns `0` for non-positive or non-finite speeds, and clamps sub-walking
 * speeds (< ~24.89 m/min) at `0` so oxygen cost is never negative.
 */
export function danielsVo2Cost(speedMPerMin: number): number {
  if (!Number.isFinite(speedMPerMin) || speedMPerMin <= 0) return 0;
  return Math.max(0, -4.6 + 0.182258 * speedMPerMin + 0.000104 * speedMPerMin * speedMPerMin);
}

/**
 * Daniels–Gilbert fraction of VO2max sustainable for a race lasting
 * `durationMin` minutes. Mirrors `PaceModel::fractionHeld` in
 * `hybridx-training/Software/Libs/Core/Sources/PaceModel.cpp`.
 *
 * Strictly decreasing on `(0, ∞)` and bounded below by `0.8`.
 * Returns `0` for non-positive or non-finite durations.
 */
export function danielsFraction(durationMin: number): number {
  if (!Number.isFinite(durationMin) || durationMin <= 0) return 0;
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMin) +
    0.2989558 * Math.exp(-0.1932605 * durationMin)
  );
}

/**
 * Daniels–Gilbert internal race-fitness index from a race distance in metres
 * and duration in minutes (`danielsVo2Cost(D / t) / danielsFraction(t)`).
 * Mirrors `PaceModel::fitness` in `PaceModel.cpp` (note: C++ takes seconds and
 * divides by 60; here `durationMin` is already in minutes).
 *
 * Returns `0` if either input is non-positive or non-finite, or if the speed is
 * too slow to produce a positive oxygen cost.
 */
export function danielsFitness(distanceM: number, durationMin: number): number {
  if (
    !Number.isFinite(distanceM) ||
    !Number.isFinite(durationMin) ||
    distanceM <= 0 ||
    durationMin <= 0
  ) {
    return 0;
  }
  const cost = danielsVo2Cost(distanceM / durationMin);
  const frac = danielsFraction(durationMin);
  return cost > 0 && frac > 0 ? cost / frac : 0;
}

/**
 * Simulates a sequence of daily training loads day-by-day through X Streak's
 * Banister model (`stepLoad`, `form`, `formWord`), without mutating `loads`.
 *
 * Defaults `startFitness = 0` and `startFatigue = 0` (raw Banister initial
 * state). For a settled athlete week (such as `AthleteWeekPreset`), pass the
 * athlete's starting fitness and fatigue explicitly. Non-finite or negative
 * inputs are safely clamped to `0`.
 */
export function simulateWeekLoad(
  loads: readonly number[],
  startFitness = 0,
  startFatigue = 0,
): WeekLoadDay[] {
  let state: LoadState = {
    fitness: Number.isFinite(startFitness) ? Math.max(0, startFitness) : 0,
    fatigue: Number.isFinite(startFatigue) ? Math.max(0, startFatigue) : 0,
  };
  return loads.map((rawLoad) => {
    const dayLoad = Number.isFinite(rawLoad) ? Math.max(0, rawLoad) : 0;
    state = stepLoad(state, dayLoad);
    return {
      fitness: state.fitness,
      fatigue: state.fatigue,
      form: form(state),
      word: formWord(state),
    };
  });
}
