// src/lib/free-plan-dates.ts
//
// The date choices on the free plan form, as plain functions so they can be
// tested: the three ways to say when the plan should end, and how the list of
// races is ordered. Every date is a calendar day in the reader's own time zone
// (see parseLocalDate), never an instant.

import { RACE_DAY_NUMBER, calculateStartDate, formatDateShort, parseLocalDate } from './training-plan-utils';

export type PlanMode = 'race' | 'date' | 'starter';

export interface PlanEvent {
  name: string;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  country: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight at the start of the given day, in the reader's time zone. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The Monday after `today` (never today, even on a Monday: the plan starts on a day that has not begun). */
export function nextMonday(today: Date): Date {
  const t = startOfDay(today);
  const daysAhead = ((8 - t.getDay()) % 7) || 7; // Sunday 0 ... Saturday 6; Monday is 1
  const monday = new Date(t);
  monday.setDate(t.getDate() + daysAhead);
  return monday;
}

/**
 * "No race booked yet": the plan starts next Monday and its race day is Day 77,
 * the Sunday 76 days later. Book a race for that weekend, or move the dates.
 */
export function starterDates(today: Date): { start: string; raceDay: string } {
  const start = nextMonday(today);
  const raceDay = new Date(start);
  raceDay.setDate(raceDay.getDate() + RACE_DAY_NUMBER - 1);
  return { start: formatDateShort(start), raceDay: formatDateShort(raceDay) };
}

/** Tomorrow, as YYYY-MM-DD: the earliest race date offered. */
export function tomorrow(today: Date): string {
  const t = startOfDay(today);
  t.setDate(t.getDate() + 1);
  return formatDateShort(t);
}

/** The first day of training for a race on `raceDay` (YYYY-MM-DD). */
export function startFor(raceDay: string): string {
  return formatDateShort(calculateStartDate(parseLocalDate(raceDay)));
}

/** Whole days from `today` to a YYYY-MM-DD date; negative once it has passed. */
export function daysUntil(isoDate: string, today: Date): number {
  return Math.round((parseLocalDate(isoDate).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

export interface RaceDateCheck {
  ok: boolean;
  /** One sentence for the reader: what is wrong, or what the plan will do. */
  message: string;
}

/** Whether a race date can be planned for, and what to tell the reader about it. */
export function checkRaceDate(isoDate: string, today: Date): RaceDateCheck {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || Number.isNaN(parseLocalDate(isoDate).getTime())) {
    return { ok: false, message: 'Choose your race date.' };
  }
  const days = daysUntil(isoDate, today);
  if (days < 1) return { ok: false, message: 'That date has passed. Choose a date in the future.' };
  if (days > 730) return { ok: false, message: 'That is more than two years away. Choose a nearer date.' };
  const startDays = daysUntil(startFor(isoDate), today);
  if (startDays < 0) {
    return {
      ok: true,
      message: `Your race is ${days} days away and the full plan is ${RACE_DAY_NUMBER} days, so its first ${-startDays} days are already behind you. Start on the session dated today.`,
    };
  }
  return { ok: true, message: `The plan starts on ${formatLongDate(startFor(isoDate))} and ends on your race day.` };
}

/** The races still to come, soonest first; races with no date yet come last, by name. */
export function upcomingEvents<T extends PlanEvent>(events: readonly T[], today: Date): T[] {
  const todayIso = formatDateShort(startOfDay(today));
  return events
    .filter((e) => !(e.endDate ?? e.startDate) || (e.endDate ?? e.startDate)! >= todayIso)
    .sort((a, b) => {
      if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name);
      if (a.startDate) return -1;
      if (b.startDate) return 1;
      return a.name.localeCompare(b.name);
    });
}

const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long' });

/**
 * "Saturday 13 March 2027", for a YYYY-MM-DD date. Put together from parts: whether
 * Intl puts a comma after the weekday depends on the ICU version, and a date on a
 * page should not change with the server's.
 */
export function formatLongDate(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  return `${WEEKDAY.format(d)} ${d.getDate()} ${MONTH.format(d)} ${d.getFullYear()}`;
}

/** "HYROX London, 13 to 15 Mar 2027 (London, UK)". */
export function eventLabel(e: PlanEvent): string {
  const place = [e.city, e.country].filter(Boolean).join(', ');
  let when = 'dates to be announced';
  if (e.startDate) {
    const start = parseLocalDate(e.startDate);
    const end = e.endDate ? parseLocalDate(e.endDate) : start;
    when = e.endDate && e.endDate !== e.startDate ? `${SHORT.format(start)} to ${SHORT.format(end)}` : SHORT.format(start);
  }
  return `${e.name}, ${when}${place ? ` (${place})` : ''}`;
}

/** Whether an event matches what the reader has typed: any word of it, in the name or place. */
export function matchesQuery(e: PlanEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${e.name} ${e.city ?? ''} ${e.country ?? ''}`.toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

/** Every day from `startDate` to `endDate` inclusive, as YYYY-MM-DD. */
export function daysBetween(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const end = parseLocalDate(endDate);
  for (const d = parseLocalDate(startDate); d <= end && out.length < 31; d.setDate(d.getDate() + 1)) {
    out.push(formatDateShort(d));
  }
  return out;
}
