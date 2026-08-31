// src/lib/athx-pacing.ts
//
// The Endurance Zone pacing model behind the ATHX 2027 funnel calculator.
//
// Kept out of the component deliberately. The calculator is the page's claim to
// competence — the argument the whole funnel rests on is that this arithmetic is
// exact and the usual "start easy" advice is a scoring error — so the numbers
// are testable without rendering anything. See __tests__/athx-pacing.test.ts,
// which pins the six worked cases published in the build brief.
//
// The model in one line: the zone is a fixed 24 minutes, the run is a buy-in
// that scores nothing, so every second spent running is a second not spent
// scoring on the ski.

/** The Endurance Zone cap, in seconds. Twenty-four minutes, fixed. */
export const ZONE_CAP_SECONDS = 1440;

/** The run leg, in kilometres. A buy-in: none of it scores. */
export const RUN_DISTANCE_KM = 3;

/** Slider domain for the run pace, seconds per kilometre (3:00 – 5:30). */
export const RUN_PACE_MIN = 180;
export const RUN_PACE_MAX = 330;
export const RUN_PACE_STEP = 5;
export const RUN_PACE_DEFAULT = 270;

/** Slider domain for the ski pace, seconds per 500m (1:40 – 2:50). */
export const SKI_PACE_MIN = 100;
export const SKI_PACE_MAX = 170;
export const SKI_PACE_STEP = 2;
export const SKI_PACE_DEFAULT = 120;

/** One step of the comparison table, in seconds per kilometre. */
export const COMPARISON_STEP = 15;

/** How many steps either side of the current pace the table shows. */
export const COMPARISON_SPREAD = 3;

export interface PacingResult {
  /** Seconds spent running the 3 km. */
  runSeconds: number;
  /** Seconds left for the SkiErg, floored at zero. */
  skiSeconds: number;
  /** Scoring distance, whole metres. */
  distanceMetres: number;
  /** Metres gained per second saved on the run, at this ski pace. */
  metresPerSecond: number;
  /**
   * True when the run alone consumes the zone. Unreachable from the sliders,
   * which stop at 5:30/km, but the readouts accept typed input and a model that
   * returns a negative ski time would render a negative score rather than say
   * the athlete never reaches the machine.
   */
  overCap: boolean;
}

/**
 * Run the model for one pair of paces.
 *
 * Distance is floored rather than rounded: metres score when they are complete,
 * and rounding up would claim a metre the athlete did not cover.
 */
export function computePacing(runPacePerKm: number, skiPacePer500: number): PacingResult {
  const runSeconds = runPacePerKm * RUN_DISTANCE_KM;
  const remaining = ZONE_CAP_SECONDS - runSeconds;
  const skiSeconds = Math.max(0, remaining);
  const metresPerSecond = 500 / skiPacePer500;

  return {
    runSeconds,
    skiSeconds,
    distanceMetres: Math.floor(skiSeconds * metresPerSecond),
    metresPerSecond,
    overCap: remaining <= 0,
  };
}

export interface BreakEven {
  /** The faster run pace being compared against, seconds per kilometre. */
  fasterRunPace: number;
  /** Ski seconds that faster run pace buys. */
  fasterSkiSeconds: number;
  /**
   * How much slower you could ski at the faster run pace and still score the
   * same distance, as a percentage of the current ski pace.
   */
  allowableDecayPct: number;
  /** That decay expressed as a ski pace, seconds per 500m. */
  allowableSkiPace: number;
  /** Extra metres the faster run pace is worth at the *current* ski pace. */
  metresGained: number;
}

/**
 * The trade the page exists to make visible: run one step faster and you can
 * afford to ski measurably slower and still score the same.
 *
 * Returns null when the current pace is already at the fast end of the model —
 * there is no faster comparison to draw, and inventing one below 3:00/km would
 * be arithmetic about a pace nobody in this field runs.
 */
export function computeBreakEven(
  runPacePerKm: number,
  skiPacePer500: number,
  step = COMPARISON_STEP,
): BreakEven | null {
  const fasterRunPace = runPacePerKm - step;
  if (fasterRunPace < RUN_PACE_MIN) return null;

  const current = computePacing(runPacePerKm, skiPacePer500);
  const faster = computePacing(fasterRunPace, skiPacePer500);
  if (current.skiSeconds <= 0) return null;

  const ratio = faster.skiSeconds / current.skiSeconds;

  return {
    fasterRunPace,
    fasterSkiSeconds: faster.skiSeconds,
    allowableDecayPct: (ratio - 1) * 100,
    allowableSkiPace: skiPacePer500 * ratio,
    metresGained: faster.distanceMetres - current.distanceMetres,
  };
}

export interface ComparisonRow extends PacingResult {
  runPacePerKm: number;
  /** Offset from the athlete's current pace, in seconds per kilometre. */
  deltaPerKm: number;
  /** True for the row matching the current setting. */
  current: boolean;
  /** Metres against the current row. Negative for the slower rows. */
  metresVsCurrent: number;
}

/**
 * The comparison table: the current pace and three steps either side.
 *
 * Rows are generated from the *offsets* rather than filtered from the slider
 * domain, so the table keeps its shape as the slider moves. A table that
 * changed length at the ends would move everything below it on the page while
 * somebody was reading a row.
 */
export function comparisonRows(
  runPacePerKm: number,
  skiPacePer500: number,
  spread = COMPARISON_SPREAD,
  step = COMPARISON_STEP,
): ComparisonRow[] {
  const current = computePacing(runPacePerKm, skiPacePer500);

  const rows: ComparisonRow[] = [];
  for (let i = -spread; i <= spread; i++) {
    const deltaPerKm = i * step;
    const pace = runPacePerKm + deltaPerKm;
    const result = computePacing(pace, skiPacePer500);
    rows.push({
      ...result,
      runPacePerKm: pace,
      deltaPerKm,
      current: deltaPerKm === 0,
      metresVsCurrent: result.distanceMetres - current.distanceMetres,
    });
  }
  return rows;
}

/**
 * Seconds as `m:ss`. Used for every pace and duration on the page, so a change
 * of mind about the format lands everywhere at once.
 */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Seconds as `m:ss.s` — one decimal place.
 *
 * The break-even answer lands between whole seconds far more often than not,
 * and rounding it to `2:17` loses the precision that makes the claim credible.
 */
export function formatTimePrecise(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe - mins * 60;
  // toFixed can carry to 60.0 (e.g. 119.97s), which would render as "1:60.0".
  const rendered = secs.toFixed(1);
  if (rendered === '60.0') return `${mins + 1}:00.0`;
  return `${mins}:${secs < 10 ? '0' : ''}${rendered}`;
}

/** `m:ss per kilometre`, spelled out for `aria-valuetext`. */
export function describeRunPace(seconds: number): string {
  return `${formatTime(seconds)} per kilometre`;
}

/** `m:ss per 500 metres`, spelled out for `aria-valuetext`. */
export function describeSkiPace(seconds: number): string {
  return `${formatTime(seconds)} per 500 metres`;
}
