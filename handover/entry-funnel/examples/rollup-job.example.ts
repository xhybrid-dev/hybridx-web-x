/**
 * EXAMPLE, NOT EXECUTED. A daily job that turns yesterday's stored batches into one small rollup
 * document. Run it from a Vercel Cron hitting a protected route, or a Firebase scheduled function,
 * at about 03:00 UTC. It is safe to run twice: it overwrites the same document.
 *
 * Why a rollup: the admin then reads one small document per day instead of thousands of events, so
 * dashboards stay fast and cost almost nothing. Rollups hold counts only, so they are aggregate data
 * and can be kept much longer than the raw batches (docs/06).
 */
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { rollupDay } from '@/lib/hx/rollup'; // port of admin/rollup.js

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => day(Date.parse(d + 'T00:00:00Z') + n * 86_400_000);

export async function rollupDate(date: string) {
  const db = getFirestore(adminApp);
  // A visit that starts just before midnight sends its last batch after midnight, so read two days
  // of batches and keep only the visits whose FIRST event fell on `date`.
  const snap = await db.collection('hx_batches').where('day', 'in', [date, addDays(date, 1)]).get();
  // A retried request can store the same batch twice. Events carry a per-visit sequence number `q`,
  // so drop repeats of (sid, q) before counting.
  const seen = new Set<string>();
  const events = snap.docs.flatMap((d) => {
    const b = d.data();
    return (b.events as any[])
      .map((e) => ({ ...e, sid: b.sid, ctx: b.ctx }))
      .filter((e) => !seen.has(e.sid + ':' + e.q) && !!seen.add(e.sid + ':' + e.q));
  });
  const firstSeen = new Map<string, number>();
  for (const e of events) firstSeen.set(e.sid, Math.min(firstSeen.get(e.sid) ?? Infinity, e.t));
  const started = events.filter((e) => day(firstSeen.get(e.sid)!) === date);

  const doc = rollupDay(started, { date });
  // Use set(), never update(): map keys such as "google.com" contain dots, which update() would read as paths.
  await db.collection('hx_rollups').doc(date).set({ ...doc, updatedAt: new Date() });
  return { date, visits: doc.counters.sessions };
}

export const rollupYesterday = () => rollupDate(addDays(day(Date.now()), -1));
