import {
  fillWindow,
  makeLog,
  rangeFor,
  SAMPLE_DAYS,
  SAMPLE_LAST_DAY,
  SAMPLE_SEED,
  Trend,
  trendOf,
  type Summary,
  type WindowDays,
} from '@/lib/weighin-core';

/*
 * The page's made-up person: make_log's 40 days (seed 3, to Monday 12 October
 * 2026), the log the app's own store screens were taken from, so the drawn
 * watch and the real captures agree. Not real data, and the page says so.
 */

export const SAMPLE = makeLog(SAMPLE_DAYS, SAMPLE_SEED, SAMPLE_LAST_DAY).log;
export const FIRST_DAY = SAMPLE_LAST_DAY - SAMPLE_DAYS + 1;

export interface SampleDay {
  day: number;
  /** That morning's weigh-in in 0.01 kg, 0 if none. */
  weight: number;
  /** The trend at the end of the day, 0.01 kg, as the whole log has it. */
  trend: number;
  /** What Home showed that evening. */
  summary: Summary;
}

/** The 40 days, each with the summary as it stood that day. */
export const SAMPLE_DAYS_LIST: SampleDay[] = (() => {
  const live = new Trend();
  const whole = trendOf(SAMPLE);
  const out: SampleDay[] = [];
  let k = 0;
  for (let i = 0; i < SAMPLE_DAYS; i++) {
    const day = FIRST_DAY + i;
    while (k < SAMPLE.length && SAMPLE[k].day <= day) live.onEntry(SAMPLE[k++]);
    const p = whole.at(day);
    out.push({ day, weight: p?.hundredths ?? 0, trend: p?.trend ?? 0, summary: live.summary() });
  }
  return out;
})();

/** The whole log's 30-day window, as the Graph and Recent pages show it on 12 October. */
export const SAMPLE_WINDOW: WindowDays = fillWindow(trendOf(SAMPLE));

export const SAMPLE_SUMMARY: Summary = SAMPLE_DAYS_LIST[SAMPLE_DAYS_LIST.length - 1].summary;

export const SAMPLE_RANGE = rangeFor(
  SAMPLE_DAYS_LIST.map((d) => d.weight),
  SAMPLE_DAYS_LIST.map((d) => d.trend),
)!;

/** A sample profile for the Body page: made up, not anyone's. */
export const SAMPLE_PROFILE = { heightCm: 185, ageYears: 36, sex: 2 } as const;

