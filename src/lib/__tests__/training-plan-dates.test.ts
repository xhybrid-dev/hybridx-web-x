// The free plan's dates, pinned to the real CSV.
//
// "RACE DAY!" is Day 77 in public/training-plans/hyrox-fusion-86.csv and Days
// 78-84 are the recovery week after it. The start date was once counted back
// from Day 84, which put the race a week before the athlete's real race and
// printed "Congratulations, you've completed" on race day itself. These tests
// read the CSV, so a change to either side fails here.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RACE_DAY_NUMBER,
  calculateStartDate,
  calculateWorkoutDate,
  formatDate,
  formatDateShort,
  groupWorkoutsByDay,
  parseLocalDate,
  parseTrainingPlanCSV,
} from '../training-plan-utils';
import { generateTrainingCalendar } from '../ical-generator';

const CSV_PATH = join(process.cwd(), 'public/training-plans/hyrox-fusion-86.csv');
const csvText = readFileSync(CSV_PATH, 'utf8');

const RACE = '2027-03-13';

function ymd(date: Date): string {
  return formatDateShort(date);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => csvText })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('plan dates', () => {
  it('puts Day 77, "RACE DAY!", on the race date itself', async () => {
    const rows = await parseTrainingPlanCSV('/training-plans/hyrox-fusion-86.csv');
    const raceRows = rows.filter((r) => r.workoutTitle === 'RACE DAY!');
    expect(raceRows.length).toBeGreaterThan(0);
    expect(new Set(raceRows.map((r) => r.workoutDay))).toEqual(new Set([RACE_DAY_NUMBER]));

    const workouts = groupWorkoutsByDay(rows, parseLocalDate(RACE));
    const raceDay = workouts.find((w) => w.workoutTitle === 'RACE DAY!');
    expect(raceDay && ymd(raceDay.date)).toBe(RACE);
  });

  it('starts training 76 days before the race, and dates the recovery week after it', () => {
    const race = parseLocalDate(RACE);
    expect(ymd(calculateStartDate(race))).toBe('2026-12-27');
    expect(ymd(calculateWorkoutDate(race, 1))).toBe('2026-12-27');
    expect(ymd(calculateWorkoutDate(race, 76))).toBe('2027-03-12');
    expect(ymd(calculateWorkoutDate(race, 77))).toBe(RACE);
    expect(ymd(calculateWorkoutDate(race, 78))).toBe('2027-03-14');
    expect(ymd(calculateWorkoutDate(race, 84))).toBe('2027-03-20');
  });

  it('dates Day 0, the "how to use this plan" page, with Day 1, not with today', () => {
    const race = parseLocalDate(RACE);
    expect(ymd(calculateWorkoutDate(race, 0))).toBe(ymd(calculateWorkoutDate(race, 1)));
  });

  it('prints the first training day as the start date, so the first workout is Day 0 or Day 1 of the same date', async () => {
    const rows = await parseTrainingPlanCSV('/training-plans/hyrox-fusion-86.csv');
    const workouts = groupWorkoutsByDay(rows, parseLocalDate(RACE));
    const dayOne = workouts.find((w) => w.day === 1)!;
    expect(ymd(workouts[0].date)).toBe(ymd(dayOne.date));
    expect(ymd(dayOne.date)).toBe('2026-12-27');
  });

  it('puts the race-day event in the calendar on the race date', async () => {
    const rows = await parseTrainingPlanCSV('/training-plans/hyrox-fusion-86.csv');
    const workouts = groupWorkoutsByDay(rows, parseLocalDate(RACE));
    const ics = generateTrainingCalendar({
      userName: 'Test Athlete',
      eventName: 'HYROX Test',
      eventDate: RACE,
      workouts,
      allDayEvents: true,
    });
    expect(ics).toContain('DTSTART;VALUE=DATE:20270313');
    const events = ics.split('BEGIN:VEVENT').slice(1);
    const day77 = events.find((e) => e.includes('HybridX Day 77:'));
    expect(day77).toContain('DTSTART;VALUE=DATE:20270313');
    // The recovery week is after the race, never before it.
    const day84 = events.find((e) => e.includes('HybridX Day 84:'));
    expect(day84).toContain('DTSTART;VALUE=DATE:20270320');
    // A UTC timestamp, not a local date with a Z on the end.
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
});

describe('calendar days, not instants', () => {
  it('reads YYYY-MM-DD as that calendar day wherever the reader is', () => {
    const d = parseLocalDate('2027-06-12');
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2027, 6, 12]);
    expect(ymd(d)).toBe('2027-06-12');
  });

  it('formats a date as the UK writes it', () => {
    expect(formatDate(parseLocalDate('2027-03-13'))).toBe('Sat, 13 Mar 2027');
  });
});

describe('the plan CSV', () => {
  it('gives men a 3.0 m (10 ft) wall ball target and women 2.7 m (9 ft)', () => {
    expect(csvText).toContain('3.0 m (10 ft) target for men');
    expect(csvText).toContain('2.7 m (9 ft) target for women');
    expect(csvText).not.toMatch(/6kg men \/ 4kg women to 9ft/);
  });
});
