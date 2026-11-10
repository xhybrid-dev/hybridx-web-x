// src/lib/guides/slots.ts
//
// When approved articles go live, and the engine settings that decide it.
// docs/content-engine-plan.md, section 6.5.
//
// Slots are wall-clock times in the UK (Monday, Wednesday and Friday at 07:00,
// Jon, 10 November 2026), so 07:00 is 07:00 GMT in winter and 06:00 UTC in
// summer. One article per slot: approving a second article for Monday puts it
// on Wednesday.
//
// Pure functions, no I/O: the store reads and writes the settings, and
// src/lib/__tests__/guides-admin.test.ts pins the arithmetic, including both
// clock changes.

import { z } from 'zod';

const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const EngineSettingsSchema = z.object({
  /** Days articles go live, 0 = Sunday … 6 = Saturday. */
  publishDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  /** Wall-clock time in `timeZone`, "HH:MM". */
  publishTime: z.string().regex(HHMM),
  timeZone: z.literal('Europe/London'),
  /** Review emails are sent only between these times (plan step 4). */
  emailFrom: z.string().regex(HHMM),
  emailTo: z.string().regex(HHMM),
  /** Where review emails go. Empty means the first address in ADMIN_EMAILS. */
  reviewAddress: z.union([z.literal(''), z.string().email()]),
  /**
   * Holiday switch: no new drafts and no review emails while true. Articles
   * already approved still go live in their slots, which is how a week away
   * is covered: approve three before leaving.
   */
  paused: z.boolean(),
});
export type EngineSettings = z.infer<typeof EngineSettingsSchema>;

export const DEFAULT_SETTINGS: EngineSettings = {
  publishDays: [1, 3, 5],
  publishTime: '07:00',
  timeZone: 'Europe/London',
  emailFrom: '07:00',
  emailTo: '20:00',
  reviewAddress: '',
  paused: false,
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** The zone's offset from UTC at an instant, in minutes (60 during BST). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const p = localParts(instant, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((wall - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000);
}

/** The instant a wall-clock time occurs in `timeZone`. */
export function zonedTime(year: number, month: number, day: number, hhmm: string, timeZone: string): Date {
  const [hour, minute] = hhmm.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Correct by the offset at the guess, then again at the corrected instant,
  // which settles it either side of a clock change.
  let instant = wall - offsetMinutes(new Date(wall), timeZone) * 60_000;
  instant = wall - offsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/**
 * The first publishing slot strictly after `after` that no article already
 * holds. `taken` is the publishAt of every scheduled article.
 */
export function nextFreeSlot(after: Date, taken: readonly string[], settings: EngineSettings): Date {
  const held = new Set(taken.map((t) => new Date(t).toISOString()));
  const start = localParts(after, settings.timeZone);
  // A year of days is far more than three slots a week could ever need.
  for (let i = 0; i < 366; i++) {
    const date = new Date(Date.UTC(start.year, start.month - 1, start.day + i));
    if (!settings.publishDays.includes(date.getUTCDay())) continue;
    const slot = zonedTime(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), settings.publishTime, settings.timeZone);
    if (slot.getTime() > after.getTime() && !held.has(slot.toISOString())) return slot;
  }
  throw new Error('No free publishing slot in the next year');
}

/** "Monday 17 November, 07:00" in the settings' zone, for admin and emails. */
export function describeSlot(instant: Date | string, timeZone = DEFAULT_SETTINGS.timeZone): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  const date = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${date}, ${time}`;
}
