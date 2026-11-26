// src/lib/retention.ts
//
// Deletes personal data when its time is up, from the hourly maintenance job, so that what the privacy
// policy promises does not depend on a console setting someone has to remember.
//
// Two collections carry an `expireAt` timestamp and used to be emptied only by a Firestore TTL policy
// (src/lib/plan-finder/config.ts says so): the messages people send through the contact form and the
// plan finder's "Talk to us" (`hx_leads`, 12 months after the last change, 30 days once closed: the
// policy and the form both say it) and the plan finder's raw visit batches (`hx_batches`, 400 days).
// With no TTL policy set, nothing deleted them: a promise kept only if a setting had been ticked.
// Rate-limit windows already had this backstop (rate-limit.ts, pruneRateLimits); these get the same.
//
// A TTL policy on the same field still works and is cleaner (it deletes without a request, and without
// waiting for the next hourly run), so set it as well; the two never conflict.
//
// Only a document that carries an `expireAt` Timestamp in the past is touched. One without the field is
// left alone, which is also why a message the admin has not yet closed cannot be swept early.

import { Timestamp } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/plan-finder/config';

export const RETAINED: readonly { collection: string; field: string; what: string }[] = [
  { collection: COLLECTIONS.leads, field: 'expireAt', what: 'messages' },
  { collection: COLLECTIONS.batches, field: 'expireAt', what: 'visit batches' },
];

/** Most documents removed per collection per run: an hour's worth of catching up, not an outage. */
export const PRUNE_LIMIT = 500;

export async function pruneExpired(collection: string, field: string, now: Timestamp = Timestamp.now(), limit: number = PRUNE_LIMIT): Promise<{ deleted: number }> {
  const snap = await adminFirestore.collection(collection).where(field, '<=', now).limit(limit).get();
  if (snap.empty) return { deleted: 0 };
  const writer = adminFirestore.bulkWriter();
  for (const doc of snap.docs) writer.delete(doc.ref);
  await writer.close();
  return { deleted: snap.size };
}

/** The hourly job's step. */
export async function pruneRetainedData(now: Timestamp = Timestamp.now()): Promise<Record<string, { deleted: number }>> {
  const out: Record<string, { deleted: number }> = {};
  for (const r of RETAINED) out[r.what] = await pruneExpired(r.collection, r.field, now);
  return out;
}
