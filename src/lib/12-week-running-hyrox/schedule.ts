import { trainingPlan } from './data';
import type { DayPlan } from './types';

/**
 * Where each session of the running plan falls on a calendar.
 *
 * Everything here works on calendar days written 'YYYY-MM-DD', never on Date instants:
 * a date typed into a date input is a day, not a moment, and turning it into a
 * UTC-midnight Date and back put sessions on the wrong day in some time zones and across
 * clock changes. Day numbers are whole days since 1970-01-01, so adding days is addition.
 */

export type Ymd = string;

const MS_PER_DAY = 86_400_000;

/** Weeks 1 to 11 train on these days: Monday, Tuesday, Thursday, Saturday (Mon = 0). */
const FOUR_DAY_OFFSETS = [0, 1, 3, 5] as const;
/** The week-12 days written in the plan, "Day 1 (Monday)" and so on, Monday to Friday. */
const WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export const PLAN_LENGTH_DAYS = 84;

export function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function toDayNumber(ymd: Ymd): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromDayNumber(n: number): Ymd {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(ymd: Ymd, days: number): Ymd {
  return fromDayNumber(toDayNumber(ymd) + days);
}

/** Monday = 0 … Sunday = 6. 1970-01-01 was a Thursday. */
export function weekdayMon0(ymd: Ymd): number {
  return (((toDayNumber(ymd) + 3) % 7) + 7) % 7;
}

export interface PlanDates {
  /** Monday of week 1. */
  start: Ymd;
  /** The day the plan's "Race Day" session falls on. */
  raceDay: Ymd;
}

/** Counting forward: week 1 begins on the Monday on or after the chosen day; race day is that plan's Sunday. */
export function datesFromStart(chosen: Ymd): PlanDates {
  const wd = weekdayMon0(chosen);
  const start = wd === 0 ? chosen : addDays(chosen, 7 - wd);
  return { start, raceDay: addDays(start, PLAN_LENGTH_DAYS - 1) };
}

/**
 * Counting back: race day is exactly the day chosen, whatever weekday it is, and the
 * race week begins on the Monday before it, so a Saturday or a Sunday race both work.
 */
export function datesFromRace(race: Ymd): PlanDates {
  const raceWeekMonday = addDays(race, -weekdayMon0(race));
  return { start: addDays(raceWeekMonday, -77), raceDay: race };
}

/** Whole days from one calendar day to another. */
export function daysBetween(a: Ymd, b: Ymd): number {
  return toDayNumber(b) - toDayNumber(a);
}

function isRaceDay(day: DayPlan): boolean {
  return /race day/i.test(day.title);
}

/** Offset, in days from the Monday of the week, of one session. */
function sessionOffset(week: number, day: DayPlan, raceWeekday: number): number {
  if (week < 12) {
    const n = Number(/day\s*(\d)/i.exec(day.day)?.[1]) - 1;
    return FOUR_DAY_OFFSETS[n] ?? 0;
  }
  if (isRaceDay(day)) return raceWeekday;
  const named = WEEKDAY_NAMES.findIndex((name) => day.day.toLowerCase().includes(name));
  const offset = named === -1 ? 0 : named;
  // Race week's other sessions stay before the race, even when it is on a Thursday.
  return Math.min(offset, raceWeekday - 1);
}

export interface PlanEvent {
  date: Ymd;
  week: number;
  /** 1-based position among the week's sessions. */
  session: number;
  summary: string;
  description: string;
  uid: string;
}

function describe(day: DayPlan): string {
  const parts: string[] = [`Focus: ${day.focus}`];
  const section = (heading: string, lines?: string[]) => {
    if (lines && lines.length > 0) parts.push(`${heading}:\n${lines.join('\n')}`);
  };
  section('ACTIVITY', day.activity);
  section('WARM UP', day.warmup);
  section('MAIN WORKOUT', day.mainWorkout);
  section('COOL DOWN', day.coolDown);
  if (day.coachHint) parts.push(`COACH'S HINT:\n${day.coachHint}`);
  parts.push('Free from HybridX: https://hybridx.club/12-week-running-hyrox');
  return parts.join('\n\n');
}

/** Every session of the plan, placed on the calendar. */
export function planEvents(dates: PlanDates): PlanEvent[] {
  const raceWeekday = weekdayMon0(dates.raceDay);
  return trainingPlan.flatMap((week) => {
    const weekStart = addDays(dates.start, (week.weekNumber - 1) * 7);
    return week.days.map((day, i) => {
      const date = isRaceDay(day) && week.weekNumber === 12 ? dates.raceDay : addDays(weekStart, sessionOffset(week.weekNumber, day, raceWeekday));
      return {
        date,
        week: week.weekNumber,
        session: i + 1,
        summary: `W${week.weekNumber}: ${day.title}`,
        description: describe(day),
        // No date in it, so importing the plan again with a new start updates these events
        // rather than adding a second set.
        uid: `hybridx-run-w${week.weekNumber}-s${i + 1}@hybridx.club`,
      };
    });
  });
}

/* ───────────────────────────── iCalendar text ───────────────────────────── */

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold to 75 octets a line, never splitting a UTF-8 character (RFC 5545 §3.1). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + bytes > limit) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += bytes;
  }
  out.push(current);
  return out.join('\r\n ');
}

const compact = (ymd: Ymd) => ymd.replace(/-/g, '');

export function buildIcs(events: PlanEvent[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HybridX//Running Plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:HybridX 12-week running plan'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${escapeText(e.summary)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      // An all-day workout should not turn the whole day to "busy".
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const ICS_FILE_NAME = 'HybridX_12_Week_Running_Plan.ics';
