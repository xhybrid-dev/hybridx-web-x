// src/lib/rate-limit.ts
//
// Fixed-window rate limiter for the public capture forms, held in Firestore.
//
// This began as three verbatim in-process copies — one per funnel action, each
// keeping its own Map and pruning nothing. Consolidating them fixed the
// unbounded growth, but left a sharper problem: per-process state is only
// correct while exactly one process exists. `maxInstances: 1` in
// apphosting.yaml was load-bearing because of this file, and every limit here
// would have silently multiplied by the instance count the moment the backend
// scaled up. A limiter that quietly stops limiting is worse than none, because
// nothing about it looks broken.
//
// So the window lives in Firestore, shared by every instance. Two things keep
// that from being expensive or fragile:
//
//   - A local memory of who is already blocked, which can only ever *deny*.
//     Once Firestore has said "blocked until T", the count for that window
//     cannot fall below the cap again, so answering from memory until T is
//     exactly what a round trip would have said. Under a scripted flood — the
//     case that matters — almost every request is answered without a read.
//
//   - Failing open. If Firestore is unreachable, submissions are allowed. That
//     is deliberate and matches the rest of the capture path: a lead lost to an
//     outage is gone for good, while an unthrottled burst during an outage is
//     recoverable and rare. The limiter protects against nuisance, not against
//     anything worth trading real signups for.

import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';

const COLLECTION = 'rateLimits';

/**
 * Windows already known to be exhausted, keyed by identifier.
 *
 * Deny-only, and therefore safe to consult across instances: a blocked window
 * never reopens early. It is never used to *allow* anything, so a stale entry
 * can only cost the caller a wait it had already earned.
 */
const blockedUntil = new Map<string, number>();

/** Bound the deny cache by active keys rather than by every key ever seen. */
let lastPrune = Date.now();
function prunememory() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, until] of blockedUntil) {
    if (now >= until) blockedUntil.delete(key);
  }
}

/** Doc id for an identifier. Hashed so IPv6 colons, length and PII are all non-issues. */
function docId(identifier: string): string {
  return createHash('sha256').update(identifier).digest('hex').slice(0, 32);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface WindowDoc {
  count: number;
  resetAt: Timestamp;
  expiresAt: Timestamp;
  bucket: string;
}

/**
 * Check whether `identifier` is within the allowed rate.
 *
 * Fixed-window, matching the semantics this replaced: the window opens on the
 * first request and runs for `windowMs` regardless of what arrives inside it.
 *
 * @param identifier Unique key, e.g. `"funnel:1.2.3.4"`.
 * @param windowMs   Window size in milliseconds.
 * @param max        Maximum requests allowed within the window.
 */
export async function checkRateLimit(
  identifier: string,
  windowMs: number,
  max: number,
): Promise<RateLimitResult> {
  prunememory();
  const now = Date.now();

  const known = blockedUntil.get(identifier);
  if (known !== undefined && now < known) {
    return { allowed: false, remaining: 0, retryAfterMs: known - now };
  }

  const ref = adminFirestore.collection(COLLECTION).doc(docId(identifier));
  const bucket = identifier.split(':')[0] ?? 'unknown';

  try {
    return await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as WindowDoc) : null;
      const resetAtMs = data?.resetAt?.toMillis?.() ?? 0;

      // No window, or the previous one has run out: start a fresh one.
      if (!data || now >= resetAtMs) {
        const resetAt = now + windowMs;
        tx.set(ref, {
          count: 1,
          resetAt: Timestamp.fromMillis(resetAt),
          // Read by the hourly prune, and by a Firestore TTL policy if one is
          // ever configured on this collection. Kept well clear of resetAt so
          // deletion can never race a live window.
          expiresAt: Timestamp.fromMillis(resetAt + windowMs),
          bucket,
        } satisfies WindowDoc);
        return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
      }

      if (data.count >= max) {
        blockedUntil.set(identifier, resetAtMs);
        return { allowed: false, remaining: 0, retryAfterMs: resetAtMs - now };
      }

      const count = data.count + 1;
      tx.update(ref, { count });
      if (count >= max) blockedUntil.set(identifier, resetAtMs);
      return { allowed: true, remaining: max - count, retryAfterMs: 0 };
    });
  } catch (err) {
    // Fail open. See the note at the top of the file: an outage must not cost
    // signups, and this limiter is not the thing standing between us and abuse
    // that matters.
    console.error(
      '[rate-limit] Firestore unavailable, allowing the request:',
      err instanceof Error ? err.message : String(err),
    );
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }
}

/** Submissions allowed per IP per hour on a public capture form. */
export const CAPTURE_LIMIT = 8;
export const CAPTURE_WINDOW_MS = 60 * 60 * 1000;

/**
 * The gate every funnel form uses.
 *
 * An unresolved IP is never limited: behind a proxy that strips the header,
 * limiting on the string `"unknown"` would throttle every visitor as though
 * they were one person.
 */
export async function isCaptureRateLimited(ip: string, bucket = 'capture'): Promise<boolean> {
  if (!ip || ip === 'unknown') return false;
  const { allowed } = await checkRateLimit(`${bucket}:${ip}`, CAPTURE_WINDOW_MS, CAPTURE_LIMIT);
  return !allowed;
}

/** Drop the deny cache. Tests only. */
export function resetRateLimitMemory(): void {
  blockedUntil.clear();
  lastPrune = Date.now();
}

export interface PruneResult {
  deleted: number;
}

/**
 * Delete windows that have expired.
 *
 * Runs on the hourly maintenance cron. A Firestore TTL policy on `expiresAt`
 * would do the same job without any code — this exists so the collection stays
 * bounded whether or not that policy has been configured, and so forgetting the
 * console step is not a slow leak nobody notices.
 */
export async function pruneRateLimits(limit = 500): Promise<PruneResult> {
  const snap = await adminFirestore
    .collection(COLLECTION)
    .where('expiresAt', '<=', Timestamp.now())
    .limit(limit)
    .get();

  if (snap.empty) return { deleted: 0 };

  const writer = adminFirestore.bulkWriter();
  for (const doc of snap.docs) writer.delete(doc.ref);
  await writer.close();

  return { deleted: snap.size };
}
