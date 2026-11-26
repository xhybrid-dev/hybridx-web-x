import { describe, expect, it } from 'vitest';
import {
  checkRaceDate,
  daysBetween,
  eventLabel,
  formatLongDate,
  matchesQuery,
  nextMonday,
  startFor,
  starterDates,
  tomorrow,
  upcomingEvents,
  type PlanEvent,
} from '../free-plan-dates';
import { formatDateShort } from '../training-plan-utils';

const d = (iso: string) => new Date(`${iso}T12:00:00`);
const ev = (name: string, startDate: string | null, endDate: string | null = startDate, extra: Partial<PlanEvent> = {}): PlanEvent => ({
  name,
  startDate,
  endDate,
  city: null,
  country: null,
  ...extra,
});

describe('formatLongDate', () => {
  it('writes a calendar day the way a UK reader does', () => {
    expect(formatLongDate('2027-03-13')).toBe('Saturday 13 March 2027');
  });
});

describe('"no race booked yet"', () => {
  it('starts next Monday, never today, and ends on the Sunday 76 days later', () => {
    // Wednesday 25 November 2026
    expect(formatDateShort(nextMonday(d('2026-11-25')))).toBe('2026-11-30');
    // A Monday starts the following Monday, not that morning
    expect(formatDateShort(nextMonday(d('2026-11-30')))).toBe('2026-12-07');
    // A Sunday starts the next day
    expect(formatDateShort(nextMonday(d('2026-11-29')))).toBe('2026-11-30');
    expect(starterDates(d('2026-11-25'))).toEqual({ start: '2026-11-30', raceDay: '2027-02-14' });
    expect(new Date(2027, 1, 14).getDay()).toBe(0); // a Sunday
  });
});

describe('tomorrow', () => {
  it('is the earliest race date offered', () => {
    expect(tomorrow(d('2026-11-25'))).toBe('2026-11-26');
    expect(tomorrow(d('2026-12-31'))).toBe('2027-01-01');
  });
});

describe('a race date', () => {
  const today = d('2026-11-25');
  it('says when the plan starts', () => {
    expect(startFor('2027-03-13')).toBe('2026-12-27');
    expect(checkRaceDate('2027-03-13', today)).toMatchObject({ ok: true });
    expect(checkRaceDate('2027-03-13', today).message).toContain('Sunday 27 December 2026');
  });
  it('is honest when the race is closer than the plan is long', () => {
    const r = checkRaceDate('2027-01-23', today); // 59 days away
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/first 17 days are already behind you/);
  });
  it('refuses a past date, a missing one and one that is too far off', () => {
    expect(checkRaceDate('2026-11-24', today).ok).toBe(false);
    expect(checkRaceDate('', today).ok).toBe(false);
    expect(checkRaceDate('2029-01-01', today).ok).toBe(false);
  });
});

describe('the race list', () => {
  const today = d('2026-11-25');
  const events = [
    ev('HYROX Glasgow', '2027-03-10', '2027-03-14', { city: 'Glasgow', country: 'UK' }),
    ev('HYROX Old', '2026-10-01', '2026-10-03'),
    ev('HYROX Stockholm', null, null),
    ev('HYROX London', '2027-01-20', '2027-01-24', { city: 'London', country: 'UK' }),
    ev('HYROX Copenhagen', null, null),
  ];

  it('is soonest first, drops races that have passed, and puts undated ones last', () => {
    expect(upcomingEvents(events, today).map((e) => e.name)).toEqual([
      'HYROX London',
      'HYROX Glasgow',
      'HYROX Copenhagen',
      'HYROX Stockholm',
    ]);
  });

  it('keeps a race that is on today', () => {
    expect(upcomingEvents([ev('HYROX Today', '2026-11-25')], today)).toHaveLength(1);
  });

  it('is searchable by name, city or country, in any order', () => {
    const glasgow = events[0];
    expect(matchesQuery(glasgow, 'glasgow')).toBe(true);
    expect(matchesQuery(glasgow, 'uk glasgow')).toBe(true);
    expect(matchesQuery(glasgow, 'london')).toBe(false);
    expect(matchesQuery(glasgow, '  ')).toBe(true);
  });

  it('labels a race with its dates and place, and says when there are none', () => {
    expect(eventLabel(events[0])).toBe('HYROX Glasgow, 10 Mar 2027 to 14 Mar 2027 (Glasgow, UK)');
    expect(eventLabel(events[2])).toBe('HYROX Stockholm, dates to be announced');
  });

  it('lists the days of a multi-day event', () => {
    expect(daysBetween('2027-03-10', '2027-03-14')).toEqual(['2027-03-10', '2027-03-11', '2027-03-12', '2027-03-13', '2027-03-14']);
  });
});
