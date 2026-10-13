import { describe, expect, it } from 'vitest';
import {
  agoText,
  bmiTenths,
  bmrKcal,
  ceilSnap,
  civilFromDays,
  daysFromCivil,
  ENTRY_FALLBACK,
  ENTRY_MAX,
  ENTRY_MIN,
  fillWindow,
  floorSnap,
  formatChange,
  formatDayMonth,
  formatEntry,
  formatKg,
  formatShortDate,
  GRAPH_MIN_SPAN,
  GRAPH_PAD,
  GRAPH_SNAP,
  HISTORY_DAYS,
  HoldRepeat,
  lastText,
  LOG_HEADER,
  makeLog,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  monthShort,
  rangeFor,
  recentDays,
  SAMPLE_DAYS,
  SAMPLE_LAST_DAY,
  SAMPLE_SEED,
  startValue,
  stepEntry,
  Trend,
  TREND_PERCENT,
  trendOf,
  weekday,
  weekdayShort,
  weekText,
  xFor,
  yFor,
  type Entry,
} from '../weighin-core';

// The watch app's own host tests (x-weighin/Tests/Host), ported case for case,
// so the page's trend, entry and graph match the watch's to the last digit.

const day0 = daysFromCivil(2026, 10, 1);
const entry = (day: number, hundredths: number, minute = 7 * 60): Entry => ({ day, minute, hundredths });
const trendAt = (t: Trend, day: number) => {
  const p = t.at(day);
  expect(p, `day ${day}`).not.toBeNull();
  return p!.trend;
};

describe('Calendar', () => {
  it('round-trips day numbers', () => {
    expect(daysFromCivil(1970, 1, 1)).toBe(0);
    for (const [y, m, d] of [
      [2026, 10, 12],
      [2000, 2, 29],
      [2099, 12, 31],
      [1969, 12, 31],
    ]) {
      expect(civilFromDays(daysFromCivil(y, m, d))).toEqual({ year: y, month: m, day: d });
    }
  });
});

describe('Trend (TrendTest.cpp)', () => {
  it('has no data when empty', () => {
    const t = new Trend();
    const s = t.summary();
    expect(s.days).toBe(0);
    expect(s.latest).toBe(0);
    expect(s.hasWeekChange).toBe(false);
    expect(t.at(day0)).toBeNull();
  });

  it('starts at the first weigh-in', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8200));
    expect(t.summary()).toMatchObject({ days: 1, firstDay: day0, lastDay: day0, latest: 8200, trend: 8200, hasWeekChange: false });
  });

  it('stays put on a steady weight', () => {
    const t = new Trend();
    for (let i = 0; i < 30; i++) t.onEntry(entry(day0 + i, 8200));
    expect(t.summary()).toMatchObject({ trend: 8200, hasWeekChange: true, weekChange: 0 });
  });

  it('moves twenty percent a day', () => {
    expect(TREND_PERCENT).toBe(20);
    const t = new Trend();
    t.onEntry(entry(day0, 8200));
    for (let i = 1; i <= 7; i++) t.onEntry(entry(day0 + i, 8300));
    expect(trendAt(t, day0 + 1)).toBe(8220);
    expect(trendAt(t, day0 + 2)).toBe(8236);
    expect(trendAt(t, day0 + 7)).toBe(8279);
    expect(t.summary().trend).toBe(8279);
    expect(t.summary().latest).toBe(8300);
  });

  it('takes other shares for comparison', () => {
    const ten = new Trend(10);
    ten.onEntry(entry(day0, 8200));
    for (let i = 1; i <= 7; i++) ten.onEntry(entry(day0 + i, 8300));
    expect(trendAt(ten, day0 + 1)).toBe(8210);
    expect(trendAt(ten, day0 + 7)).toBe(8252);

    const raw = new Trend(100);
    raw.onEntry(entry(day0, 8200));
    raw.onEntry(entry(day0 + 1, 8300));
    expect(raw.summary().trend).toBe(8300);

    expect(new Trend(0).percent).toBe(1);
    expect(new Trend(250).percent).toBe(100);
    expect(new Trend().percent).toBe(TREND_PERCENT);
  });

  it('counts the latest weigh-in of a day', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8200));
    t.onEntry(entry(day0 + 1, 8300, 7 * 60));
    expect(t.summary().trend).toBe(8220);
    t.onEntry(entry(day0 + 1, 8250, 7 * 60 + 2));
    expect(t.summary()).toMatchObject({ days: 2, latest: 8250, trend: 8210 });
    expect(trendAt(t, day0 + 1)).toBe(8210);
  });

  it('counts the latest on the first day too', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8200));
    t.onEntry(entry(day0, 8000, 8 * 60));
    expect(t.summary()).toMatchObject({ days: 1, latest: 8000, trend: 8000 });
    t.onEntry(entry(day0 + 1, 8100));
    expect(t.summary().trend).toBe(8020);
  });

  it('redoes the filled days when a weigh-in after a gap is replaced', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8000));
    t.onEntry(entry(day0 + 4, 9000));
    t.onEntry(entry(day0 + 4, 8000));
    expect(t.summary().trend).toBe(8000);
    for (let i = 1; i <= 4; i++) expect(trendAt(t, day0 + i)).toBe(8000);
  });

  it('skips an earlier day', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8200));
    t.onEntry(entry(day0 + 2, 8100));
    t.onEntry(entry(day0 + 1, 9999));
    expect(t.summary()).toMatchObject({ skipped: 1, days: 2, lastDay: day0 + 2, latest: 8100 });
  });

  it('skips invalid entries', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 0));
    t.onEntry(entry(day0, 50001));
    expect(t.summary()).toMatchObject({ skipped: 2, days: 0 });
  });

  it('follows a straight line over missed days', () => {
    const daily = new Trend();
    const alternate = new Trend();
    for (let i = 0; i <= 20; i++) {
      const w = 8500 - 10 * i;
      daily.onEntry(entry(day0 + i, w));
      if (i % 2 === 0) alternate.onEntry(entry(day0 + i, w));
    }
    for (let i = 0; i <= 20; i++) expect(trendAt(alternate, day0 + i)).toBe(trendAt(daily, day0 + i));
    expect(alternate.summary().days).toBe(11);
    expect(daily.summary().days).toBe(21);
  });

  it('gives filled days no weigh-in', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8000));
    t.onEntry(entry(day0 + 3, 8300));
    expect(t.at(day0 + 1)?.hundredths).toBe(0);
    expect(t.at(day0 + 3)?.hundredths).toBe(8300);
  });

  it('neither freezes nor jumps over a week off', () => {
    const gap = new Trend();
    const daily = new Trend();
    gap.onEntry(entry(day0, 8000));
    daily.onEntry(entry(day0, 8000));
    for (let i = 1; i <= 7; i++) daily.onEntry(entry(day0 + i, 8000 - 10 * i));
    gap.onEntry(entry(day0 + 7, 7930));
    expect(gap.summary().trend).toBe(daily.summary().trend);
  });

  it('gives the weekly change once the log spans a week', () => {
    const t = new Trend();
    for (let i = 0; i < 7; i++) t.onEntry(entry(day0 + i, 8500 - 10 * i));
    expect(t.summary().hasWeekChange).toBe(false);
    t.onEntry(entry(day0 + 7, 8430));
    let s = t.summary();
    expect(s.hasWeekChange).toBe(true);
    expect(s.weekChange).toBe(trendAt(t, day0 + 7) - trendAt(t, day0));
    expect(s.weekChange).toBeLessThan(0);
    for (let i = 8; i < 60; i++) t.onEntry(entry(day0 + i, 8500 - 10 * i));
    s = t.summary();
    expect(s.weekChange).toBe(-70);
  });

  it('keeps the last ninety days', () => {
    const t = new Trend();
    for (let i = 0; i < 120; i++) t.onEntry(entry(day0 + i, 8000 + i));
    const last = day0 + 119;
    expect(t.at(last)?.hundredths).toBe(8119);
    expect(t.at(last - (HISTORY_DAYS - 1))?.day).toBe(last - (HISTORY_DAYS - 1));
    expect(t.at(last - HISTORY_DAYS)).toBeNull();
    expect(t.at(last + 1)).toBeNull();
    expect(t.at(day0)).toBeNull();
  });

  it('forgets everything on reset', () => {
    const t = new Trend();
    t.onEntry(entry(day0, 8200));
    t.reset();
    expect(t.summary().days).toBe(0);
    t.onEntry(entry(day0 - 5, 7000));
    expect(t.summary()).toMatchObject({ latest: 7000, skipped: 0 });
  });
});

describe('WeighEntry (WeighEntryTest.cpp)', () => {
  it('starts from the log, then the profile, then 70.0', () => {
    expect(startValue(8234, 9000)).toBe(8230);
    expect(startValue(8235, 0)).toBe(8240);
    expect(startValue(0, 8200)).toBe(8200);
    expect(startValue(0, 8234)).toBe(8230);
    expect(startValue(0, 0)).toBe(ENTRY_FALLBACK);
    expect(startValue(-5, -5)).toBe(ENTRY_FALLBACK);
    expect(startValue(60000, 0)).toBe(ENTRY_MAX);
    expect(startValue(50, 0)).toBe(ENTRY_MIN);
  });

  it('steps in tenths within the range', () => {
    expect(stepEntry(8230, 1)).toBe(8240);
    expect(stepEntry(8230, -3)).toBe(8200);
    expect(stepEntry(8230, 0)).toBe(8230);
    expect(stepEntry(ENTRY_MIN, -1)).toBe(ENTRY_MIN);
    expect(stepEntry(ENTRY_MAX, 1)).toBe(ENTRY_MAX);
    expect(stepEntry(ENTRY_MAX - 5, 1)).toBe(ENTRY_MAX);
  });
});

describe('HoldRepeat (WeighEntryTest.cpp)', () => {
  it('counts a tap as one click', () => {
    const h = new HoldRepeat();
    h.press(1000);
    expect(h.tick(1100)).toBe(0);
    h.release(1150);
    expect(h.takeClick(1160)).toBe(true);
    expect(h.tick(2000)).toBe(0);
  });

  it('counts a click without a press', () => {
    expect(new HoldRepeat().takeClick(500)).toBe(true);
  });

  it('repeats after the start delay, and quickens', () => {
    const h = new HoldRepeat();
    h.press(0);
    expect(h.tick(599)).toBe(0);
    expect(h.tick(600)).toBe(1);
    expect(h.tick(799)).toBe(0);
    expect(h.tick(800)).toBe(1);
    expect(h.tick(974)).toBe(0);
    expect(h.tick(975)).toBe(1);
    let steps = 0;
    for (let t = 1000; t <= 4000; t += 50) steps += h.tick(t);
    expect(steps).toBeGreaterThanOrEqual(50);
    expect(steps).toBeLessThanOrEqual(61);
    expect(h.tick(4050)).toBe(1);
  });

  it('does not count the click that ends a hold', () => {
    const h = new HoldRepeat();
    h.press(0);
    expect(h.tick(600)).toBe(1);
    h.release(700);
    expect(h.takeClick(720)).toBe(false);
    h.press(2000);
    h.release(2100);
    expect(h.takeClick(2110)).toBe(true);
  });

  it('counts a late click as a tap', () => {
    const h = new HoldRepeat();
    h.press(0);
    expect(h.tick(600)).toBe(1);
    h.release(700);
    expect(h.takeClick(700 + HoldRepeat.CLICK_MS + 1)).toBe(true);
  });

  it('ends a hold that never repeated in a click', () => {
    const h = new HoldRepeat();
    h.press(0);
    expect(h.tick(500)).toBe(0);
    h.release(550);
    expect(h.takeClick(560)).toBe(true);
  });

  it('survives the clock wrapping', () => {
    const h = new HoldRepeat();
    const start = 0xffffff00;
    h.press(start);
    expect(h.tick((start + 599) >>> 0)).toBe(0);
    expect(h.tick((start + 600) >>> 0)).toBe(1);
  });

  it('does not leap after a stall', () => {
    const h = new HoldRepeat();
    h.press(0);
    expect(h.tick(10000)).toBe(HoldRepeat.MAX_BURST);
    expect(h.tick(10050)).toBeLessThanOrEqual(1);
  });
});

describe('GraphScale (GraphScaleTest.cpp)', () => {
  it('pads and snaps', () => {
    expect(rangeFor([8000, 0, 8100], [8020, 8040, 8060])).toEqual({ lo: 7950, hi: 8150 });
  });

  it('is at least two kilograms', () => {
    const r = rangeFor([8000, 8010])!;
    expect(r.hi - r.lo).toBe(GRAPH_MIN_SPAN);
    expect(r.lo).toBeLessThanOrEqual(8000 - GRAPH_PAD);
    expect(r.hi).toBeGreaterThanOrEqual(8010 + GRAPH_PAD);
    expect(r.lo % GRAPH_SNAP).toBe(0);
  });

  it('handles wide ranges', () => {
    expect(rangeFor([7000, 9000])).toEqual({ lo: 6950, hi: 9050 });
  });

  it('has nothing to draw without data', () => {
    expect(rangeFor([0, 0, 0], [0, 0, 0])).toBeNull();
    expect(rangeFor([])).toBeNull();
  });

  it('never goes below zero', () => {
    const r = rangeFor([50])!;
    expect(r.lo).toBe(0);
    expect(r.hi - r.lo).toBe(GRAPH_MIN_SPAN);
  });

  it('maps rows and columns', () => {
    const r = { lo: 8000, hi: 8200 };
    expect(yFor(8200, r, 60, 101)).toBe(60);
    expect(yFor(8000, r, 60, 101)).toBe(160);
    expect(yFor(8100, r, 60, 101)).toBe(110);
    expect(yFor(9000, r, 60, 101)).toBe(60);
    expect(yFor(7000, r, 60, 101)).toBe(160);
    expect(xFor(0, 30, 28, 184)).toBe(28);
    expect(xFor(29, 30, 28, 184)).toBe(211);
    expect(xFor(40, 30, 28, 184)).toBe(211);
    expect(xFor(0, 1, 28, 184)).toBe(28 + 92);
  });

  it('snaps', () => {
    expect(floorSnap(7980)).toBe(7950);
    expect(floorSnap(7950)).toBe(7950);
    expect(floorSnap(-10)).toBe(-50);
    expect(ceilSnap(8120)).toBe(8150);
    expect(ceilSnap(8150)).toBe(8150);
  });
});

describe('Text (WeighTextTest.cpp, DateTextTest.cpp)', () => {
  it('formats weights', () => {
    expect(formatKg(8230, 2)).toBe('82.30');
    expect(formatKg(8205, 2)).toBe('82.05');
    expect(formatKg(1, 2)).toBe('0.01');
    expect(formatKg(50000, 2)).toBe('500.00');
    expect(formatKg(8230, 1)).toBe('82.3');
    expect(formatKg(8234, 1)).toBe('82.3');
    expect(formatKg(8235, 1)).toBe('82.4');
    expect(formatKg(8295, 1)).toBe('83.0');
    expect(formatKg(4, 1)).toBe('0.0');
    expect(formatKg(5, 1)).toBe('0.1');
    expect(formatKg(8249, 0)).toBe('82');
    expect(formatKg(8250, 0)).toBe('83');
    expect(formatKg(0, 2)).toBe('--');
    expect(formatKg(-100, 1)).toBe('--');
    expect(formatKg(10000000, 2)).toBe('--');
    expect(formatKg(9999999, 2)).toBe('99999.99');
  });

  it('formats changes, signed, without judgement', () => {
    expect(formatChange(40, 1)).toBe('+0.4');
    expect(formatChange(-40, 1)).toBe('-0.4');
    expect(formatChange(-123, 2)).toBe('-1.23');
    expect(formatChange(123, 2)).toBe('+1.23');
    expect(formatChange(12345, 1)).toBe('+123.5');
    expect(formatChange(150, 0)).toBe('+2');
    expect(formatChange(5, 1)).toBe('+0.1');
    expect(formatChange(-5, 1)).toBe('-0.1');
    expect(formatChange(-35, 1)).toBe('-0.4');
    expect(formatChange(0, 1)).toBe('0.0');
    expect(formatChange(4, 1)).toBe('0.0');
    expect(formatChange(-4, 1)).toBe('0.0');
    expect(formatChange(-49, 0)).toBe('0');
    expect(formatChange(0, 2)).toBe('0.00');
    expect(formatChange(10000000, 1)).toBe('--');
    expect(formatChange(-10000000, 1)).toBe('--');
  });

  it('formats dates', () => {
    const mon12Oct = daysFromCivil(2026, 10, 12);
    expect(weekday(0)).toBe(3);
    expect(weekday(mon12Oct)).toBe(0);
    expect(weekdayShort(mon12Oct + 6)).toBe('Sun');
    expect(weekdayShort(-1)).toBe('Wed');
    expect(formatShortDate(mon12Oct)).toBe('Mon 12 Oct');
    expect(formatShortDate(daysFromCivil(2026, 10, 5))).toBe('Mon 5 Oct');
    expect(formatShortDate(daysFromCivil(2027, 1, 1))).toBe('Fri 1 Jan');
    expect(formatDayMonth(mon12Oct)).toBe('12 Oct');
    expect(monthShort(0)).toBe('---');
    expect(monthShort(13)).toBe('---');
    expect(agoText(mon12Oct, mon12Oct)).toBe('today');
    expect(agoText(mon12Oct, mon12Oct - 1)).toBe('yesterday');
    expect(agoText(mon12Oct, mon12Oct - 3)).toBe('3 days ago');
    expect(agoText(mon12Oct, mon12Oct - 40)).toBe('40 days ago');
    expect(agoText(mon12Oct, mon12Oct + 1)).toBe('Tue 13 Oct');
  });

  it('writes the log line as the watch does', () => {
    expect(formatEntry({ day: daysFromCivil(2026, 10, 12), minute: 7 * 60 + 31, hundredths: 8230 })).toBe('2026-10-12,07:31,82.30');
    expect(formatEntry({ day: daysFromCivil(2026, 10, 12), minute: 1440, hundredths: 8230 })).toBe('');
    expect(formatEntry({ day: daysFromCivil(1999, 12, 31), minute: 0, hundredths: 8230 })).toBe('');
  });
});

describe('BodyMetrics (BodyMetricsTest.cpp)', () => {
  it('gives BMI in tenths', () => {
    expect(bmiTenths(8200, 182)).toBe(248);
    expect(bmiTenths(7000, 175)).toBe(229);
    expect(bmiTenths(10000, 200)).toBe(250);
  });

  it('gives no BMI when anything is unset', () => {
    expect(bmiTenths(0, 182)).toBe(0);
    expect(bmiTenths(-8200, 182)).toBe(0);
    expect(bmiTenths(50001, 182)).toBe(0);
    expect(bmiTenths(8200, 0)).toBe(0);
    expect(bmiTenths(8200, MIN_HEIGHT_CM - 1)).toBe(0);
    expect(bmiTenths(8200, MAX_HEIGHT_CM + 1)).toBe(0);
  });

  it('gives resting kcal by Mifflin-St Jeor', () => {
    expect(bmrKcal(8200, 182, 40, 2)).toBe(1763);
    expect(bmrKcal(8200, 182, 40, 1)).toBe(1597);
    expect(bmrKcal(6000, 165, 30, 1)).toBe(1320);
    expect(bmrKcal(8234, 182, 40, 2)).toBe(1766);
  });

  it('gives no resting kcal when anything is unset', () => {
    expect(bmrKcal(0, 182, 40, 2)).toBe(0);
    expect(bmrKcal(8200, 0, 40, 2)).toBe(0);
    expect(bmrKcal(8200, 182, 0, 2)).toBe(0);
    expect(bmrKcal(8200, 182, 40, 0)).toBe(0);
    expect(bmrKcal(8200, 182, 40, 3)).toBe(0);
  });
});

// make_log's own output, `make_log s3.csv 40 3 2026-10-12`: the log behind the
// app's store screens (capture_screens.sh).
const MAKE_LOG_40_3 = `date,time,kg
2026-09-03,07:08,84.40
2026-09-04,07:14,83.80
2026-09-05,07:05,83.70
2026-09-06,07:24,83.70
2026-09-07,06:40,83.70
2026-09-08,07:15,83.40
2026-09-09,06:41,83.60
2026-09-10,07:20,83.80
2026-09-11,06:38,83.40
2026-09-12,06:38,83.30
2026-09-13,06:50,83.10
2026-09-14,06:48,83.60
2026-09-15,06:33,83.80
2026-09-17,06:38,83.50
2026-09-18,06:48,83.60
2026-09-19,07:04,84.40
2026-09-20,06:31,83.20
2026-09-21,06:50,83.40
2026-09-25,07:10,83.40
2026-09-26,06:53,82.80
2026-09-28,07:13,82.50
2026-09-29,06:37,82.80
2026-10-01,07:03,82.80
2026-10-02,07:11,82.30
2026-10-03,07:29,82.90
2026-10-04,07:11,82.40
2026-10-05,07:05,82.50
2026-10-06,07:08,82.60
2026-10-07,06:52,83.20
2026-10-08,07:21,81.90
2026-10-09,06:49,82.40
2026-10-10,06:56,82.40
2026-10-11,06:40,82.70
2026-10-12,06:41,81.50`;

describe('the sample log (make_log)', () => {
  it('is the file make_log writes', () => {
    const { log } = makeLog(SAMPLE_DAYS, SAMPLE_SEED, SAMPLE_LAST_DAY);
    expect([LOG_HEADER, ...log.map(formatEntry)].join('\n')).toBe(MAKE_LOG_40_3);
  });

  it('gives the trend the store screens show', () => {
    const t = trendOf(makeLog(SAMPLE_DAYS, SAMPLE_SEED, SAMPLE_LAST_DAY).log);
    const s = t.summary();
    // trend_csv: 34 days weighed, latest 81.50 kg, trend 82.35 kg, -0.34 kg this week.
    expect(s).toMatchObject({ days: 34, latest: 8150, trend: 8235, weekChange: -34, skipped: 0 });
    // Home: "82.4", "-0.3 kg this week", "Last 81.5, today".
    expect(formatKg(s.trend, 1)).toBe('82.4');
    expect(weekText(s)).toBe('-0.3 kg this week');
    expect(lastText(s, SAMPLE_LAST_DAY)).toBe('Last 81.5, today');
    // trend_csv's rows for the missed 22-24 September.
    expect(trendAt(t, daysFromCivil(2026, 9, 22))).toBe(8355);
    expect(trendAt(t, daysFromCivil(2026, 9, 24))).toBe(8350);
    // Recent: the last five days weighed, newest first.
    const recent = recentDays(fillWindow(t)).map((r) => `${formatShortDate(r.day)} ${formatKg(r.hundredths, 1)}`);
    expect(recent).toEqual(['Mon 12 Oct 81.5', 'Sun 11 Oct 82.7', 'Sat 10 Oct 82.4', 'Fri 9 Oct 82.4', 'Thu 8 Oct 81.9']);
    // Graph: "13 Sep - 12 Oct", scaled 81.0 to 85.0.
    const w = fillWindow(t);
    expect(`${formatDayMonth(w.firstDay)} - ${formatDayMonth(w.firstDay + w.weight.length - 1)}`).toBe('13 Sep - 12 Oct');
    expect(rangeFor(w.weight, w.trend)).toEqual({ lo: 8100, hi: 8500 });
  });

  it('matches make_log with its defaults, typo and all', () => {
    // make_log s1.csv (60 days, seed 1): 52 weigh-ins, one a typo fixed a
    // minute later; trend_csv: 51 days, latest 80.80, trend 81.23, -0.47 a week.
    const { log } = makeLog(60, 1, SAMPLE_LAST_DAY);
    expect(log).toHaveLength(52);
    const typo = log.findIndex((e, i) => i > 0 && e.day === log[i - 1].day);
    expect(log[typo - 1].hundredths - log[typo].hundredths).toBe(1000);
    expect(trendOf(log).summary()).toMatchObject({ days: 51, latest: 8080, trend: 8123, weekChange: -47 });
  });
});
