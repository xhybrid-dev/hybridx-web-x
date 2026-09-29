// src/lib/plan-finder/store.ts
//
// The plan finder's server-side storage jobs and reads. Server only: every
// function here uses the Admin SDK, and the admin pages call them only after
// checking the admin session.
//
//   runDailyRollups()   hx_batches -> hx_rollups/<YYYY-MM-DD>, one small doc per day
//   blankOldNotes()     removes the step-5 note text 90 days after it was received
//   loadRange()         merged rollups for a date range, for the admin
//
// The first two run from the hourly /api/cron/marketing-maintenance job, so
// the plan finder needs no scheduler job or secret of its own. Both are safe
// to repeat: a rollup is recomputed from the batches and overwritten, and a
// blanked note stays blank.

import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS, NOTE_RETENTION_MS } from './config';
import { funnel } from './content';
import type { FlatEvent, RollupDoc } from './analytics';
import { insights, mergeDays, report, rollupDay } from './analytics';
import { generate } from './analytics/seed';
import { addDays, dayMs, daysBetween, isoDay } from './dates';

const DAY_MS = 86_400_000;
/** Sessions last minutes, but a tab left open can send its last batch after midnight. */
const SETTLE_MS = 3 * 3_600_000;
/** How far back the hourly job looks for days it has not rolled up (or notes it has not blanked). */
const CATCH_UP_DAYS = 14;
const META = 'hx_meta';


/* ------------------------------------------------------------------------ */
/* Daily rollups                                                             */
/* ------------------------------------------------------------------------ */

/**
 * The events of every visit that STARTED on `day`, flattened for rollupDay.
 * Drops repeated batches by (sid, q), and keeps only visits whose first event
 * falls on `day`. Reads the day either side too: a visit that starts at 23:58
 * finishes after midnight, so the next day holds the rest of it, and the
 * previous day holds the start of a visit that only looks new today. Without
 * the previous day, that visit would be counted twice.
 */
export async function eventsForDay(day: string): Promise<{ events: FlatEvent[]; batches: number }> {
  const snap = await adminFirestore
    .collection(COLLECTIONS.batches)
    .where('day', '>=', addDays(day, -1))
    .where('day', '<=', addDays(day, 1))
    .get();
  const seen = new Set<string>();
  const firstT = new Map<string, number>();
  const events: FlatEvent[] = [];
  for (const doc of snap.docs) {
    const b = doc.data();
    for (const e of b.events || []) {
      const key = b.sid + ':' + e.q;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ ...e, sid: b.sid, ctx: b.ctx });
      if (!firstT.has(b.sid) || e.t < firstT.get(b.sid)!) firstT.set(b.sid, e.t);
    }
  }
  return { events: events.filter((e) => isoDay(firstT.get(e.sid)!) === day), batches: snap.size };
}

/** Recompute one day's rollup from its batches and overwrite hx_rollups/<day>. */
export async function rollupDate(day: string): Promise<{ day: string; sessions: number; batchesRead: number }> {
  const { events, batches } = await eventsForDay(day);
  const doc = rollupDay(events, { date: day });
  // set(), never update(): map keys such as "google.com" contain dots, which update() reads as paths.
  await adminFirestore
    .collection(COLLECTIONS.rollups)
    .doc(day)
    .set({ ...doc, batchesRead: batches, updatedAt: Timestamp.now() });
  return { day, sessions: doc.counters.sessions, batchesRead: batches };
}

/**
 * Rolls up every settled day in the last two weeks that has no rollup yet.
 * A day is settled three hours after it ends. Runs hourly; on a normal day
 * it writes one document, shortly after 03:00 UTC.
 */
export async function runDailyRollups(now = Date.now()) {
  const lastSettled = isoDay(now - SETTLE_MS - DAY_MS);
  const candidates = daysBetween(addDays(lastSettled, -(CATCH_UP_DAYS - 1)), lastSettled);
  const refs = candidates.map((d) => adminFirestore.collection(COLLECTIONS.rollups).doc(d));
  const existing = await adminFirestore.getAll(...refs);
  const missing = candidates.filter((_, i) => !existing[i].exists);
  const done = [];
  for (const day of missing) done.push(await rollupDate(day));
  return { checked: candidates.length, rolledUp: done };
}

/* ------------------------------------------------------------------------ */
/* Note retention                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Removes the text of every step-5 note once it is 90 days old, keeping the
 * rest of the batch (the note's existence is still counted). Works through
 * whole days in order and records how far it has got, so a missed run is
 * caught up on the next one.
 */
export async function blankOldNotes(now = Date.now()) {
  const state = adminFirestore.collection(META).doc('notes');
  const through: string | undefined = (await state.get()).data()?.blankedThrough;
  const lastDue = isoDay(now - NOTE_RETENTION_MS - DAY_MS);
  const first = through ? addDays(through, 1) : addDays(lastDue, -(CATCH_UP_DAYS - 1));
  const days = daysBetween(first, lastDue).slice(0, CATCH_UP_DAYS);
  let blanked = 0;
  for (const day of days) {
    const snap = await adminFirestore.collection(COLLECTIONS.batches).where('day', '==', day).get();
    for (const doc of snap.docs) {
      const events: Record<string, unknown>[] = doc.data().events || [];
      if (!events.some((e) => e.key === 'note' && typeof e.value === 'string')) continue;
      const cleaned = events.map((e) => {
        if (e.key !== 'note') return e;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { value, ...rest } = e;
        return rest;
      });
      await doc.ref.update({ events: cleaned, notesBlankedAt: FieldValue.serverTimestamp() });
      blanked++;
    }
    await state.set({ blankedThrough: day, updatedAt: Timestamp.now() }, { merge: true });
  }
  return { days: days.length, blanked };
}

/* ------------------------------------------------------------------------ */
/* Reads for the admin                                                       */
/* ------------------------------------------------------------------------ */

export interface RangeData {
  from: string;
  to: string;
  merged: RollupDoc;
  /** One entry per day in the range; null where there is no rollup. */
  perDay: { day: string; doc: RollupDoc | null }[];
  /** The newest day with a rollup, over the whole store (or the demo). */
  dataThrough: string | null;
  demo: boolean;
}

// Made-up traffic for the admin's "Demo data" switch, so the pages can be read
// before real visits arrive. Each day is generated from its own date, so a day
// always shows the same numbers whichever range it is part of, and the volume
// varies by weekday so the charts do not draw a flat line.
function demoDays(from: string, to: string) {
  return daysBetween(from, to).map((day) => {
    const n = dayMs(day) / DAY_MS;
    const weekday = new Date(dayMs(day)).getUTCDay();
    const sessionsPerDay = 120 + ((n * 37) % 50) + (weekday === 0 || weekday === 6 ? 60 : 0);
    const { events } = generate({ days: 1, sessionsPerDay, seed: n, startDate: day });
    return { day, doc: rollupDay(events, { date: day }) };
  });
}

/** Rollups for [from, to], merged. `today` adds today's batches, rolled up on the spot. */
export async function loadRange(from: string, to: string, opts: { demo?: boolean; today?: boolean } = {}): Promise<RangeData> {
  if (opts.demo) {
    const perDay = demoDays(from, to);
    return { from, to, perDay, merged: mergeDays(perDay.map((d) => d.doc)), dataThrough: to, demo: true };
  }
  const days = daysBetween(from, to);
  const snaps = days.length ? await adminFirestore.getAll(...days.map((d) => adminFirestore.collection(COLLECTIONS.rollups).doc(d))) : [];
  const perDay = days.map((day, i) => ({ day, doc: snaps[i].exists ? (snaps[i].data() as RollupDoc) : null }));
  const today = isoDay(Date.now());
  if (opts.today && to >= today) {
    const { events } = await eventsForDay(today);
    const live = rollupDay(events, { date: today });
    const slot = perDay.find((d) => d.day === today);
    if (slot) slot.doc = live;
  }
  const newest = await adminFirestore.collection(COLLECTIONS.rollups).orderBy(FieldPath.documentId(), 'desc').limit(1).get();
  return {
    from,
    to,
    perDay,
    merged: mergeDays(perDay.map((d) => d.doc)),
    dataThrough: newest.empty ? null : newest.docs[0].id,
    demo: false,
  };
}

export function reportFor(merged: RollupDoc) {
  const rep = report(merged, { catalog: funnel.catalog });
  return { report: rep, insights: insights(rep) };
}

/* ------------------------------------------------------------------------ */
/* Health                                                                    */
/* ------------------------------------------------------------------------ */

export async function dataHealth(now = Date.now()) {
  const today = isoDay(now);
  const yesterday = addDays(today, -1);
  const [todayBatches, rollupYesterday, newest, todays] = await Promise.all([
    adminFirestore.collection(COLLECTIONS.batches).where('day', '==', today).count().get(),
    adminFirestore.collection(COLLECTIONS.rollups).doc(yesterday).get(),
    adminFirestore.collection(COLLECTIONS.rollups).orderBy(FieldPath.documentId(), 'desc').limit(1).get(),
    adminFirestore.collection(COLLECTIONS.batches).where('day', '==', today).select('dropped', 'skewed').get(),
  ]);
  let droppedEvents = 0;
  let droppedProps = 0;
  let skewed = 0;
  for (const d of todays.docs) {
    const x = d.data();
    droppedEvents += x.dropped?.events || 0;
    droppedProps += x.dropped?.props || 0;
    if (x.skewed) skewed++;
  }
  const newestDoc = newest.empty ? null : newest.docs[0];
  return {
    today,
    batchesToday: todayBatches.data().count,
    droppedEventsToday: droppedEvents,
    droppedPropsToday: droppedProps,
    skewedBatchesToday: skewed,
    newestRollup: newestDoc?.id ?? null,
    newestRollupSessions: newestDoc ? (newestDoc.data().counters?.sessions ?? 0) : null,
    yesterdayRolledUp: rollupYesterday.exists,
    yesterdaySessions: rollupYesterday.exists ? (rollupYesterday.data()?.counters?.sessions ?? 0) : null,
    // Rolled up after 03:00 UTC, so "missing" only means something after that.
    yesterdayDue: now >= dayMs(today) + SETTLE_MS,
  };
}
