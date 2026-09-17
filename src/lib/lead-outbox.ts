// src/lib/lead-outbox.ts
//
// Durable delivery for leads crossing into the mailing system.
//
// Forwarding is fire-and-forget with a four-second timeout, and that is the
// right posture on a request path: a marketing integration being slow must
// never cost a visitor their submission. But it also means every failure is
// silent, and there was nothing behind it. A deploy, a cold start over four
// seconds, or any app downtime and those leads existed in this project's own
// `leads` collection and nowhere else, permanently, with nothing that would
// ever notice.
//
// So each lead carries its own outbox entry: the exact payload to send, whether
// it has been sent, and when to try again. The attempt still happens inline and
// still cannot fail the submission — the entry simply survives it failing, and
// a cron drains what is left. An outage now costs a delay in nurturing rather
// than the lead.
//
// The payload is stored rather than reconstructed. A replay must send what the
// original send would have sent — in particular the consent flag and its
// method, which differ between a single opt-in magnet, a pending confirmed
// opt-in, and the confirmation itself. Rebuilding that from the lead document
// would mean re-deriving consent from context, which is the one thing worth
// never guessing about.

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import { forwardLead, type ForwardLeadInput } from '@/lib/marketing-bridge';

/**
 * Stop retrying after this many attempts.
 *
 * The drain runs hourly, so the backoff below rarely binds — the effective
 * cadence is roughly one attempt an hour, which makes this about a day of
 * tolerated outage. That is deliberately generous, because giving up does not
 * discard anything: the entry is parked and stays visible in the admin view and
 * the bridge diagnostic. The cost of a high ceiling is nil; the cost of a low
 * one is a lead needing manual recovery after an afternoon of downtime.
 */
export const MAX_FORWARD_ATTEMPTS = 24;

/**
 * Exponential backoff, capped.
 *
 * The common failure is the app being briefly unavailable, which resolves in
 * minutes; the uncommon one is a misconfigured secret, which resolves when
 * somebody fixes it. Backing off quickly at first and then hourly serves both
 * without hammering a service that is already unwell.
 */
export function backoffMs(attempts: number): number {
  const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
  return minutes * 60_000;
}

export interface OutboxFields {
  forwardPayload: ForwardLeadInput;
  forwarded: boolean;
  forwardAttempts: number;
  forwardNextAttemptAt: Timestamp;
  forwardLastError?: string;
}

/** The outbox fields for a freshly captured lead, to merge into its document. */
export function pendingOutbox(payload: ForwardLeadInput): Record<string, unknown> {
  return {
    forwardPayload: payload,
    forwarded: false,
    forwardAttempts: 0,
    forwardNextAttemptAt: Timestamp.now(),
  };
}

/**
 * Try to deliver one entry, and record what happened.
 *
 * Never throws. Callers on a request path fire this without awaiting; the drain
 * awaits it. Either way the outcome is written to the document, so the state of
 * every lead is inspectable rather than inferred from logs.
 */
export async function attemptForward(
  docPath: string,
  payload: ForwardLeadInput,
  attemptsSoFar = 0,
): Promise<boolean> {
  const ref = adminFirestore.doc(docPath);

  try {
    const delivered = await forwardLead(payload);

    if (delivered) {
      await ref.update({
        forwarded: true,
        forwardedAt: FieldValue.serverTimestamp(),
        forwardLastError: FieldValue.delete(),
      });
      return true;
    }

    const attempts = attemptsSoFar + 1;
    await ref.update({
      forwardAttempts: attempts,
      forwardNextAttemptAt: Timestamp.fromMillis(Date.now() + backoffMs(attempts)),
      forwardLastError: 'The mailing system did not accept the lead.',
    });
    return false;
  } catch (err) {
    // Reaching here means the bookkeeping write failed, not the forward. Log and
    // move on: the entry keeps its previous state, so the drain will find it
    // again rather than losing it.
    console.error('[lead-outbox] could not record a forward attempt:', err);
    return false;
  }
}

/** Fire an attempt without waiting, for callers on a request path. */
export function attemptForwardAsync(docPath: string, payload: ForwardLeadInput): void {
  void attemptForward(docPath, payload, 0);
}

export interface DrainResult {
  claimed: number;
  delivered: number;
  failed: number;
  exhausted: number;
}

/**
 * Deliver whatever is still outstanding.
 *
 * Ordered by when each entry is next due rather than by age, so a lead that has
 * failed seven times does not keep pushing a fresh one behind it.
 */
export async function drainOutbox(limit = 100): Promise<DrainResult> {
  const result: DrainResult = { claimed: 0, delivered: 0, failed: 0, exhausted: 0 };

  const snap = await adminFirestore
    .collection('leads')
    .where('forwarded', '==', false)
    .where('forwardNextAttemptAt', '<=', Timestamp.now())
    .orderBy('forwardNextAttemptAt', 'asc')
    .limit(limit)
    .get();

  if (snap.empty) return result;

  for (const doc of snap.docs) {
    const data = doc.data() as Partial<OutboxFields>;
    const payload = data.forwardPayload;
    const attempts = data.forwardAttempts ?? 0;

    // An entry with no payload predates the outbox, or was written by a failed
    // partial write. Nothing can be replayed from it, so stop retrying rather
    // than reserving a slot in every future drain.
    if (!payload?.email) {
      await doc.ref.update({
        forwarded: true,
        forwardLastError: 'No stored payload; nothing to replay.',
      });
      result.exhausted++;
      continue;
    }

    if (attempts >= MAX_FORWARD_ATTEMPTS) {
      // Left un-forwarded and no longer due, so it stays visible in the admin
      // view and in the bridge diagnostic's backlog count without consuming a
      // slot in every future drain. Nothing is discarded — somebody should look
      // at it, and re-running is a matter of resetting the attempt count.
      await doc.ref.update({
        forwardNextAttemptAt: Timestamp.fromMillis(Date.now() + 365 * 86_400_000),
        forwardLastError: `Gave up after ${attempts} attempts.`,
      });
      result.exhausted++;
      continue;
    }

    result.claimed++;
    const ok = await attemptForward(doc.ref.path, payload, attempts);
    if (ok) result.delivered++;
    else result.failed++;
  }

  return result;
}
