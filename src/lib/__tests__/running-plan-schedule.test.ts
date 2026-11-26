import { describe, expect, it } from 'vitest';
import { trainingPlan } from '@/lib/12-week-running-hyrox/data';
import { addDays, buildIcs, daysBetween, datesFromRace, datesFromStart, isYmd, planEvents, weekdayMon0 } from '@/lib/12-week-running-hyrox/schedule';

describe('calendar days', () => {
  it('knows the weekday of a date', () => {
    expect(weekdayMon0('2027-06-12')).toBe(5); // a Saturday
    expect(weekdayMon0('2027-06-13')).toBe(6); // a Sunday
    expect(weekdayMon0('2026-11-23')).toBe(0); // a Monday
  });

  it('adds days across clock changes and the year end', () => {
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29');
    expect(addDays('2027-10-30', 2)).toBe('2027-11-01');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(daysBetween('2027-03-01', '2027-03-31')).toBe(30);
  });

  it('rejects dates that are not real days', () => {
    expect(isYmd('2027-02-30')).toBe(false);
    expect(isYmd('27-02-03')).toBe(false);
    expect(isYmd('2027-02-28')).toBe(true);
  });
});

describe('where the plan starts', () => {
  it('starts on a Monday, moving a chosen weekday forward to the next one', () => {
    expect(datesFromStart('2026-11-23').start).toBe('2026-11-23');
    expect(datesFromStart('2026-11-25').start).toBe('2026-11-30');
    expect(datesFromStart('2026-11-29').start).toBe('2026-11-30');
  });

  it('puts race day on the Sunday of week 12 when counting forward', () => {
    const { start, raceDay } = datesFromStart('2026-11-23');
    expect(weekdayMon0(raceDay)).toBe(6);
    expect(daysBetween(start, raceDay)).toBe(83);
  });

  it.each(['2027-06-12', '2027-06-13', '2027-06-11', '2027-06-07'])('lands race day exactly on %s when counting back', (race) => {
    const { start, raceDay } = datesFromRace(race);
    expect(raceDay).toBe(race);
    expect(weekdayMon0(start)).toBe(0);
    const events = planEvents(datesFromRace(race));
    const raceEvent = events.find((e) => e.summary.includes('RACE DAY'))!;
    expect(raceEvent.date).toBe(race);
  });
});

describe('the sessions', () => {
  const dates = datesFromRace('2027-06-12'); // a Saturday
  const events = planEvents(dates);

  it('has one event for every session in the plan', () => {
    expect(events).toHaveLength(trainingPlan.reduce((n, w) => n + w.days.length, 0));
  });

  it('keeps weeks 1 to 11 on Monday, Tuesday, Thursday and Saturday', () => {
    for (const e of events.filter((e) => e.week < 12)) {
      expect([0, 1, 3, 5]).toContain(weekdayMon0(e.date));
    }
  });

  it('puts race week before the race and race day on it, never on the Monday', () => {
    const raceWeek = events.filter((e) => e.week === 12);
    const raceEvent = raceWeek.find((e) => e.summary.includes('RACE DAY'))!;
    expect(raceEvent.date).toBe('2027-06-12');
    for (const e of raceWeek.filter((e) => e !== raceEvent)) expect(e.date < '2027-06-12').toBe(true);
  });

  it('keeps race week sessions before a midweek race', () => {
    const early = planEvents(datesFromRace('2027-06-10')); // a Thursday
    const raceEvent = early.find((e) => e.summary.includes('RACE DAY'))!;
    for (const e of early.filter((e) => e.week === 12 && e !== raceEvent)) expect(e.date < '2027-06-10').toBe(true);
  });

  it('is the same on any machine: the events are the same whatever the time zone says', () => {
    const before = process.env.TZ;
    try {
      const results = ['UTC', 'America/New_York', 'Pacific/Auckland', 'Europe/London'].map((tz) => {
        process.env.TZ = tz;
        return planEvents(datesFromStart('2026-11-23')).map((e) => e.date).join(',');
      });
      expect(new Set(results).size).toBe(1);
    } finally {
      if (before === undefined) delete process.env.TZ;
      else process.env.TZ = before;
    }
  });

  it('gives each session a stable id with no date in it', () => {
    const a = planEvents(datesFromStart('2026-11-23'));
    const b = planEvents(datesFromStart('2027-01-04'));
    expect(a.map((e) => e.uid)).toEqual(b.map((e) => e.uid));
    expect(new Set(a.map((e) => e.uid)).size).toBe(a.length);
  });
});

describe('the calendar file', () => {
  const ics = buildIcs(planEvents(datesFromRace('2027-06-12')), new Date('2026-11-25T10:00:00Z'));

  it('uses CRLF line endings and is a complete calendar', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('gives every event the properties calendars require', () => {
    const blocks = ics.split('BEGIN:VEVENT').slice(1);
    expect(blocks.length).toBeGreaterThan(40);
    for (const b of blocks) {
      expect(b).toMatch(/\r\nUID:/);
      expect(b).toContain('DTSTAMP:20261125T100000Z');
      expect(b).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
      expect(b).toMatch(/DTEND;VALUE=DATE:\d{8}/);
    }
  });

  it('folds no line past 75 octets', () => {
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
  });

  it('escapes commas, semicolons and line breaks in text', () => {
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).not.toMatch(/DESCRIPTION:[^\r]*[^\\],[^\r]*\r\n(?=[A-Z-]+[:;])/);
    expect(unfolded).toContain('\\n\\n');
  });
});
