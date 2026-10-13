/*
 * src/lib/weighin-core.ts
 *
 * The rules behind the X Weigh-in page (/weigh-in), ported from the watch
 * app's pure core so the page cannot show a trend the watch would not:
 *   - daysFromCivil, civilFromDays:   x-weighin Core/Header/Calendar.hpp
 *   - isValidEntry, formatEntry:      Core/Sources/WeighLog.cpp
 *   - Trend:                          Core/Header/Trend.hpp, Sources/Trend.cpp
 *   - startValue, stepEntry,
 *     HoldRepeat:                     Core/Header/WeighEntry.hpp
 *   - rangeFor, yFor, xFor:           Core/Header/GraphScale.hpp
 *   - formatKg, formatChange:         Core/Header/WeighText.hpp
 *   - formatShortDate, agoText, ...:  Core/Header/DateText.hpp
 *   - bmiTenths, bmrKcal:             Core/Sources/BodyMetrics.cpp
 *   - fillWindow, recentDays:         Core/Header/Window.hpp, Sources/Window.cpp
 *   - makeLog:                        Tests/Host/tools/make_log.cpp, the sample
 *                                     log the app's store screens were taken
 *                                     from (40 days, seed 3, to 12 October 2026)
 *
 * Weights are integers in hundredths of a kg, as on the watch; the trend is
 * held to 1/10 000 kg. JavaScript numbers are exact at these sizes, and every
 * C++ integer division is spelled out with Math.trunc, so the results match
 * the watch to the last digit. src/lib/__tests__/weighin-core.test.ts ports
 * the app's host tests and pins makeLog to make_log's own output.
 *
 * If the watch changes one of these, change it here too.
 */

// ── Calendar (H. Hinnant's days_from_civil / civil_from_days) ─────────────

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

const div = (a: number, b: number) => Math.trunc(a / b);

export function daysFromCivil(year: number, month: number, day: number): number {
  const y = year - (month <= 2 ? 1 : 0);
  const era = div(y >= 0 ? y : y - 399, 400);
  const yoe = y - era * 400;
  const doy = div(153 * (month > 2 ? month - 3 : month + 9) + 2, 5) + day - 1;
  const doe = yoe * 365 + div(yoe, 4) - div(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

export function civilFromDays(days: number): CivilDate {
  const z = days + 719468;
  const era = div(z >= 0 ? z : z - 146096, 146097);
  const doe = z - era * 146097;
  const yoe = div(doe - div(doe, 1460) + div(doe, 36524) - div(doe, 146096), 365);
  const doy = doe - (365 * yoe + div(yoe, 4) - div(yoe, 100));
  const mp = div(5 * doy + 2, 153);
  const day = doy - div(153 * mp + 2, 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

const FIRST_VALID_DAY = daysFromCivil(2000, 1, 1);
const LAST_VALID_DAY = daysFromCivil(2099, 12, 31);

// ── The log ─────────────────────────────────────────────────────────────────

/** The heaviest weight the app accepts, kg. */
export const MAX_KG = 500;

/** One weigh-in: a local day number, a local minute and a weight in 0.01 kg. */
export interface Entry {
  day: number;
  minute: number;
  hundredths: number;
}

export const LOG_HEADER = 'date,time,kg';

export function isValidEntry(e: Entry): boolean {
  return (
    Number.isInteger(e.day) &&
    Number.isInteger(e.minute) &&
    Number.isInteger(e.hundredths) &&
    e.day >= FIRST_VALID_DAY &&
    e.day <= LAST_VALID_DAY &&
    e.minute >= 0 &&
    e.minute < 1440 &&
    e.hundredths > 0 &&
    e.hundredths <= MAX_KG * 100
  );
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** The entry's line in weighins.csv, "2026-10-12,07:31,82.30"; '' if invalid. */
export function formatEntry(e: Entry): string {
  if (!isValidEntry(e)) return '';
  const d = civilFromDays(e.day);
  return `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)},${pad(div(e.minute, 60))}:${pad(e.minute % 60)},${div(e.hundredths, 100)}.${pad(e.hundredths % 100)}`;
}

// ── The trend ───────────────────────────────────────────────────────────────

/** Trend units per 0.01 kg: the trend is held to 1/10 000 kg. */
const TREND_SCALE = 100;
/** The share of the gap closed each day, in percent (Jon, Gate W1). */
export const TREND_PERCENT = 20;
/** Days kept for the graph and the glance. */
export const HISTORY_DAYS = 90;
/** The span the weekly change is taken over. */
export const WEEK_DAYS = 7;

export interface DayPoint {
  day: number;
  /** That day's weigh-in in 0.01 kg; 0 on a filled-in day. */
  hundredths: number;
  /** The trend at the end of that day, 0.01 kg. */
  trend: number;
}

export interface Summary {
  days: number;
  firstDay: number;
  lastDay: number;
  /** The last day's weigh-in, 0.01 kg; 0 = no data. */
  latest: number;
  /** The trend at the last day, 0.01 kg. */
  trend: number;
  hasWeekChange: boolean;
  /** trend(lastDay) - trend(lastDay - 7), 0.01 kg. */
  weekChange: number;
  skipped: number;
}

/** Integer division rounding half away from zero. */
function divRound(num: number, den: number): number {
  const half = div(den, 2);
  return num >= 0 ? div(num + half, den) : -div(-num + half, den);
}

const toHundredths = (units: number) => divRound(units, TREND_SCALE);

const slot = (day: number) => {
  const s = day % HISTORY_DAYS;
  return s < 0 ? s + HISTORY_DAYS : s;
};

/**
 * The smoothed trend: one weight per local day (the latest that day), each day
 * moving the trend a fixed share of the way to that day's weight, missed days
 * filled along a straight line. Feed it entries in log order.
 */
export class Trend {
  readonly percent: number;
  private started = false;
  private firstDay = 0;
  private lastDay = 0;
  private lastWeightUnits = 0;
  private trendUnits = 0;
  private days = 0;
  private skipped = 0;
  private beforeLast = { lastDay: 0, lastWeightUnits: 0, trendUnits: 0, days: 0 };
  private haveBefore = false;
  private ring: DayPoint[] = [];

  constructor(percent: number = TREND_PERCENT) {
    this.percent = percent < 1 ? 1 : percent > 100 ? 100 : Math.trunc(percent);
    this.reset();
  }

  reset() {
    this.started = false;
    this.firstDay = 0;
    this.lastDay = 0;
    this.lastWeightUnits = 0;
    this.trendUnits = 0;
    this.days = 0;
    this.skipped = 0;
    this.beforeLast = { lastDay: 0, lastWeightUnits: 0, trendUnits: 0, days: 0 };
    this.haveBefore = false;
    this.ring = Array.from({ length: HISTORY_DAYS }, () => ({ day: 0, hundredths: 0, trend: 0 }));
  }

  private record(day: number, hundredths: number, trendUnits: number) {
    this.ring[slot(day)] = { day, hundredths, trend: toHundredths(trendUnits) };
  }

  private commit(day: number, unitsW: number) {
    this.beforeLast = {
      lastDay: this.lastDay,
      lastWeightUnits: this.lastWeightUnits,
      trendUnits: this.trendUnits,
      days: this.days,
    };
    this.haveBefore = true;

    const gap = day - this.lastDay; // >= 1
    for (let k = 1; k <= gap; k++) {
      // The day's weight: the weigh-in on the last step, a straight line before it.
      const w = k === gap ? unitsW : this.lastWeightUnits + divRound((unitsW - this.lastWeightUnits) * k, gap);
      this.trendUnits += divRound((w - this.trendUnits) * this.percent, 100);
      this.record(this.lastDay + k, k === gap ? div(unitsW, TREND_SCALE) : 0, this.trendUnits);
    }
    this.lastDay = day;
    this.lastWeightUnits = unitsW;
    this.days++;
  }

  onEntry(e: Entry) {
    if (!isValidEntry(e)) {
      this.skipped++;
      return;
    }
    const unitsW = e.hundredths * TREND_SCALE;

    if (!this.started) {
      this.started = true;
      this.firstDay = e.day;
      this.lastDay = e.day;
      this.lastWeightUnits = unitsW;
      this.trendUnits = unitsW;
      this.days = 1;
      this.haveBefore = false;
      this.record(e.day, e.hundredths, this.trendUnits);
      return;
    }

    if (e.day < this.lastDay) {
      this.skipped++;
      return;
    }

    if (e.day === this.lastDay) {
      // The latest weigh-in of the day counts: undo the day and redo it.
      if (!this.haveBefore) {
        this.lastWeightUnits = unitsW;
        this.trendUnits = unitsW;
        this.record(e.day, e.hundredths, this.trendUnits);
        return;
      }
      this.lastDay = this.beforeLast.lastDay;
      this.lastWeightUnits = this.beforeLast.lastWeightUnits;
      this.trendUnits = this.beforeLast.trendUnits;
      this.days = this.beforeLast.days;
    }
    this.commit(e.day, unitsW);
  }

  summary(): Summary {
    const s: Summary = {
      days: 0,
      firstDay: 0,
      lastDay: 0,
      latest: 0,
      trend: 0,
      hasWeekChange: false,
      weekChange: 0,
      skipped: this.skipped,
    };
    if (!this.started) return s;
    s.days = this.days;
    s.firstDay = this.firstDay;
    s.lastDay = this.lastDay;
    s.latest = div(this.lastWeightUnits, TREND_SCALE);
    s.trend = toHundredths(this.trendUnits);
    const weekAgo = this.lastDay - this.firstDay >= WEEK_DAYS ? this.at(this.lastDay - WEEK_DAYS) : null;
    if (weekAgo) {
      s.hasWeekChange = true;
      s.weekChange = s.trend - weekAgo.trend;
    }
    return s;
  }

  /** The history for one day, within the last HISTORY_DAYS days; null outside. */
  at(day: number): DayPoint | null {
    if (!this.started || day > this.lastDay || day < this.firstDay || day <= this.lastDay - HISTORY_DAYS) {
      return null;
    }
    const p = this.ring[slot(day)];
    return p.day === day ? { ...p } : null;
  }
}

/** A Trend fed the whole of @p log, in order. */
export function trendOf(log: readonly Entry[], percent: number = TREND_PERCENT): Trend {
  const t = new Trend(percent);
  for (const e of log) t.onEntry(e);
  return t;
}

// ── The window: the graph's 30 days, and the Recent page ────────────────────

export const WINDOW_DAYS = 30;

export interface WindowDays {
  firstDay: number;
  /** Per day, the weigh-in in 0.01 kg (0 on a missed day). */
  weight: number[];
  /** Per day, the trend in 0.01 kg. */
  trend: number[];
}

export function fillWindow(trend: Trend, days: number = WINDOW_DAYS): WindowDays {
  const out: WindowDays = { firstDay: 0, weight: [], trend: [] };
  const s = trend.summary();
  if (s.days === 0) return out;
  out.firstDay = Math.max(s.firstDay, s.lastDay - (days - 1));
  for (let day = out.firstDay; day <= s.lastDay && out.weight.length < days; day++) {
    const p = trend.at(day);
    if (!p) break;
    out.weight.push(p.hundredths);
    out.trend.push(p.trend);
  }
  return out;
}

/** The days in @p w with a weigh-in, newest first, at most @p max. */
export function recentDays(w: WindowDays, max = 5): { day: number; hundredths: number }[] {
  const out: { day: number; hundredths: number }[] = [];
  for (let i = w.weight.length - 1; i >= 0 && out.length < max; i--) {
    if (w.weight[i] !== 0) out.push({ day: w.firstDay + i, hundredths: w.weight[i] });
  }
  return out;
}

// ── The weigh-in screen ─────────────────────────────────────────────────────

/** One press: 0.1 kg. */
export const ENTRY_STEP = 10;
export const ENTRY_MIN = 100;
export const ENTRY_MAX = MAX_KG * 100;
/** Where the entry starts with no log and no profile weight: 70.0 kg. */
export const ENTRY_FALLBACK = 7000;

export const roundToTenth = (hundredths: number) => div(hundredths + 5, 10) * 10;

export const clampEntry = (hundredths: number) =>
  hundredths < ENTRY_MIN ? ENTRY_MIN : hundredths > ENTRY_MAX ? ENTRY_MAX : hundredths;

/** The last logged weigh-in, else the UNA profile's weight, else 70.0 kg; to 0.1 kg. */
export function startValue(lastLogged: number, profile: number): number {
  if (lastLogged > 0) return clampEntry(roundToTenth(lastLogged));
  if (profile > 0) return clampEntry(roundToTenth(profile));
  return ENTRY_FALLBACK;
}

export const stepEntry = (value: number, steps: number) => clampEntry(value + steps * ENTRY_STEP);

/**
 * Hold-to-repeat for UP and DOWN, as the watch does it: a tap is one step; a
 * hold repeats after 0.6 s, every 200 ms at first, quickening to 50 ms. Times
 * are milliseconds from a wrapping 32-bit clock, and every difference is taken
 * unsigned, as on the watch.
 */
export class HoldRepeat {
  static readonly START_MS = 600;
  static readonly SLOW_MS = 200;
  static readonly FAST_MS = 50;
  static readonly ACCEL_MS = 25;
  static readonly CLICK_MS = 500;
  static readonly MAX_BURST = 4;

  private heldNow = false;
  private repeated = false;
  private pressedAt = 0;
  private releasedAt = 0;
  private nextAt = 0;
  private interval = HoldRepeat.SLOW_MS;

  press(nowMs: number) {
    this.heldNow = true;
    this.repeated = false;
    this.pressedAt = nowMs >>> 0;
    this.nextAt = HoldRepeat.START_MS;
    this.interval = HoldRepeat.SLOW_MS;
  }

  release(nowMs: number) {
    if (this.heldNow) {
      this.heldNow = false;
      this.releasedAt = nowMs >>> 0;
    }
  }

  /** Steps due since the last tick while held (0 when not held). */
  tick(nowMs: number): number {
    if (!this.heldNow) return 0;
    const elapsed = ((nowMs >>> 0) - this.pressedAt) >>> 0;
    let steps = 0;
    while (elapsed >= this.nextAt && steps < HoldRepeat.MAX_BURST) {
      steps++;
      this.repeated = true;
      this.nextAt += this.interval;
      if (this.interval > HoldRepeat.FAST_MS) {
        this.interval =
          this.interval - HoldRepeat.FAST_MS > HoldRepeat.ACCEL_MS ? this.interval - HoldRepeat.ACCEL_MS : HoldRepeat.FAST_MS;
      }
    }
    if (steps === HoldRepeat.MAX_BURST && elapsed >= this.nextAt) {
      this.nextAt = elapsed + this.interval; // drop the backlog rather than leap
    }
    return steps;
  }

  /** A click arrived: true if it is a tap to count, false if it only ends a counted hold. */
  takeClick(nowMs: number): boolean {
    const endsHold = this.repeated && (this.heldNow || (((nowMs >>> 0) - this.releasedAt) >>> 0) < HoldRepeat.CLICK_MS);
    this.repeated = false;
    this.heldNow = false;
    return !endsHold;
  }

  get held() {
    return this.heldNow;
  }
}

// ── The graph's scale ───────────────────────────────────────────────────────

/** The scale is never shorter than 2 kg, its ends snap to 0.5 kg, with 0.2 kg of room. */
export const GRAPH_MIN_SPAN = 200;
export const GRAPH_SNAP = 50;
export const GRAPH_PAD = 20;

export function floorSnap(v: number): number {
  const q = div(v, GRAPH_SNAP);
  return (v < 0 && q * GRAPH_SNAP !== v ? q - 1 : q) * GRAPH_SNAP;
}

export function ceilSnap(v: number): number {
  const f = floorSnap(v);
  return f === v ? v : f + GRAPH_SNAP;
}

export interface Range {
  lo: number;
  hi: number;
}

/** The range for the non-zero values of the arrays, padded, snapped, at least 2 kg. */
export function rangeFor(...arrays: readonly (readonly number[] | null)[]): Range | null {
  let lo = 0;
  let hi = 0;
  let any = false;
  for (const a of arrays) {
    for (const v of a ?? []) {
      if (v === 0) continue;
      if (!any || v < lo) lo = v;
      if (!any || v > hi) hi = v;
      any = true;
    }
  }
  if (!any) return null;
  let top = ceilSnap(hi + GRAPH_PAD);
  let bottom = floorSnap(lo - GRAPH_PAD);
  if (top - bottom < GRAPH_MIN_SPAN) {
    const mid = div(lo + hi, 2);
    bottom = floorSnap(mid - GRAPH_MIN_SPAN / 2);
    top = bottom + GRAPH_MIN_SPAN;
    if (top < hi + GRAPH_PAD) top = ceilSnap(hi + GRAPH_PAD);
  }
  if (bottom < 0) {
    top -= bottom;
    bottom = 0;
  }
  return { lo: bottom, hi: top };
}

/** The pixel row for @p value: @p top is range.hi, top + height - 1 is range.lo. */
export function yFor(value: number, range: Range, top: number, height: number): number {
  if (height <= 1 || range.hi <= range.lo) return top;
  const y = top + div((range.hi - value) * (height - 1), range.hi - range.lo);
  return Math.min(top + height - 1, Math.max(top, y));
}

/** The pixel column for day @p index of @p slots. */
export function xFor(index: number, slots: number, left: number, width: number): number {
  if (slots <= 1 || width <= 1) return left + div(width, 2);
  const i = index < slots ? index : slots - 1;
  return left + div(i * (width - 1), slots - 1);
}

// ── Text ────────────────────────────────────────────────────────────────────

const MAX_FORMAT = 9999999;

/** A weight in 0.01 kg as "82.30", "82.3" or "82", rounding half up; "--" if not set. */
export function formatKg(hundredths: number, decimals: 0 | 1 | 2 = 1): string {
  if (hundredths <= 0 || hundredths > MAX_FORMAT) return '--';
  if (decimals === 0) return String(div(hundredths + 50, 100));
  if (decimals === 1) {
    const tenths = div(hundredths + 5, 10);
    return `${div(tenths, 10)}.${tenths % 10}`;
  }
  return `${div(hundredths, 100)}.${pad(hundredths % 100)}`;
}

/**
 * A change in 0.01 kg as "+0.4", "-0.4" or "0.0", rounding half away from
 * zero. A change that rounds to nothing has no sign. Plain ASCII '-', no unit,
 * no judgement.
 */
export function formatChange(hundredths: number, decimals: 0 | 1 | 2 = 1): string {
  if (hundredths > MAX_FORMAT || hundredths < -MAX_FORMAT) return '--';
  const negative = hundredths < 0;
  const mag = Math.abs(hundredths);
  let whole: number;
  let frac = 0;
  if (decimals === 0) {
    whole = div(mag + 50, 100);
  } else if (decimals === 1) {
    const tenths = div(mag + 5, 10);
    whole = div(tenths, 10);
    frac = tenths % 10;
  } else {
    whole = div(mag, 100);
    frac = mag % 100;
  }
  const sign = whole === 0 && frac === 0 ? '' : negative ? '-' : '+';
  if (decimals === 0) return `${sign}${whole}`;
  if (decimals === 1) return `${sign}${whole}.${frac}`;
  return `${sign}${whole}.${pad(frac)}`;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 0 = Monday .. 6 = Sunday. Day 0 (1970-01-01) was a Thursday. */
export function weekday(day: number): number {
  const w = (day + 3) % 7;
  return w < 0 ? w + 7 : w;
}

export const weekdayShort = (day: number) => WEEKDAYS[weekday(day)];
export const monthShort = (month: number) => (month >= 1 && month <= 12 ? MONTHS[month - 1] : '---');

/** "Mon 12 Oct". */
export function formatShortDate(day: number): string {
  const d = civilFromDays(day);
  return `${weekdayShort(day)} ${d.day} ${monthShort(d.month)}`;
}

/** "12 Oct". */
export function formatDayMonth(day: number): string {
  const d = civilFromDays(day);
  return `${d.day} ${monthShort(d.month)}`;
}

/** "today", "yesterday", "3 days ago"; a later day (the clock went back) as its date. */
export function agoText(today: number, day: number): string {
  const ago = today - day;
  if (ago === 0) return 'today';
  if (ago === 1) return 'yesterday';
  if (ago > 1) return `${ago} days ago`;
  return formatShortDate(day);
}

/** Home's second line: "-0.3 kg this week", or "-- kg this week" before a week. */
export function weekText(s: Summary): string {
  return `${s.hasWeekChange ? formatChange(s.weekChange, 1) : '--'} kg this week`;
}

/** Home's third line, and the weigh-in hint: "Last 81.5, today". */
export function lastText(s: Summary, today: number): string {
  return `Last ${formatKg(s.latest, 1)}, ${agoText(today, s.lastDay)}`;
}

// ── The body numbers ────────────────────────────────────────────────────────

export const MIN_HEIGHT_CM = 50;
export const MAX_HEIGHT_CM = 272;

const weightSet = (h: number) => h > 0 && h <= MAX_KG * 100;
const heightSet = (cm: number) => cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM;

/** BMI in tenths (kg / m²), from the weight in 0.01 kg and the height in cm; 0 if unset. */
export function bmiTenths(hundredths: number, heightCm: number): number {
  if (!weightSet(hundredths) || !heightSet(heightCm)) return 0;
  const num = hundredths * 1000;
  const den = heightCm * heightCm;
  return div(num + div(den, 2), den);
}

/** Sex as the phone setting holds it. */
export const SEX = { notSet: 0, female: 1, male: 2 } as const;

/**
 * Resting energy (BMR), kcal: the Mifflin-St Jeor equation (Am J Clin Nutr
 * 1990;51:241-7). 0 if any input is unset.
 */
export function bmrKcal(hundredths: number, heightCm: number, ageYears: number, sex: number): number {
  if (!weightSet(hundredths) || !heightSet(heightCm) || ageYears === 0) return 0;
  let s: number;
  if (sex === SEX.male) s = 5;
  else if (sex === SEX.female) s = -161;
  else return 0;
  const c = 10 * hundredths + 625 * heightCm - 500 * ageYears + 100 * s;
  return c <= 0 ? 0 : div(c + 50, 100);
}

// ── The sample log (make_log) ───────────────────────────────────────────────

/**
 * make_log's model, from its own source: a slow loss of 0.35 kg a week from
 * 84 kg, the day-to-day swings a real log shows, a salty meal or a late dinner
 * now and then (+0.9 kg), about one missed day in eight, and one weigh-in
 * mistyped 10 kg out and corrected a minute later. Not real data.
 *
 * A generator, so the page can carry the same made-up person on past the log's
 * last day; makeLog() is the file make_log writes.
 */
export class SampleScale {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** A uniform number in [0, 1), from a fixed LCG (Numerical Recipes). */
  uniform(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return (this.state >>> 8) / 16777216;
  }

  /** Roughly normal, mean 0, standard deviation about 1. */
  noise(): number {
    return (this.uniform() + this.uniform() + this.uniform() + this.uniform() - 2.0) * 1.732;
  }

  /**
   * Day @p i of the model: missed (null) or the reading in 0.01 kg, in 0.1 kg
   * steps, and the minute. @p canMiss is false for the log's first and last days.
   */
  day(i: number, canMiss: boolean): { hundredths: number; minute: number; salty: boolean } | null {
    const u = this.uniform();
    if (canMiss && u < 0.125) return null;
    let kg = 84.0 - 0.05 * i + 0.35 * this.noise();
    const salty = this.uniform() < 0.08;
    if (salty) kg += 0.9;
    const minute = 6 * 60 + 30 + Math.trunc(this.uniform() * 60);
    return { hundredths: Math.trunc(kg * 10.0 + 0.5) * 10, minute, salty };
  }
}

/** The log make_log writes: @p days days ending on day @p lastDay, from @p seed. */
export function makeLog(days: number, seed: number, lastDay: number): { log: Entry[]; scale: SampleScale } {
  const scale = new SampleScale(seed);
  const firstDay = lastDay - days + 1;
  const typoDay = div(days, 2);
  const log: Entry[] = [];
  for (let i = 0; i < days; i++) {
    const r = scale.day(i, i !== 0 && i !== days - 1);
    if (!r) continue;
    const e: Entry = { day: firstDay + i, minute: r.minute, hundredths: r.hundredths };
    if (i === typoDay) {
      log.push({ ...e, hundredths: e.hundredths + 1000 });
      e.minute += 1;
    }
    log.push(e);
  }
  return { log, scale };
}

/** The page's made-up person: make_log's 40 days, seed 3, to Monday 12 October 2026. */
export const SAMPLE_LAST_DAY = daysFromCivil(2026, 10, 12);
export const SAMPLE_DAYS = 40;
export const SAMPLE_SEED = 3;
