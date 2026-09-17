// src/lib/suppression-mirror.ts
//
// A local copy of the mailing system's complainant list.
//
// Every send from this site asked the app whether the recipient had complained.
// That question must be asked — mailing someone who reported us as spam
// endangers delivery for everyone on a domain both properties share — but
// asking it across a project boundary put a cross-service round trip on the
// awaited path of a form submission, before a guide the visitor is waiting on
// could go out.
//
// So the answer is kept here instead. The list is tiny (a healthy list produces
// a handful of complaints a year), it changes slowly, and it is stored as
// sha256 hashes, so mirroring it costs almost nothing and leaks nothing.
//
// The live lookup remains as a backstop for when the mirror is stale or absent.
// It is never removed: a mirror that silently stopped refreshing would answer
// "not a complainant" for everybody, which is the one wrong answer that matters.

import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import { getComplaintHashes } from '@/lib/marketing-bridge';

const MIRROR_DOC = 'marketingMirror/complaints';

/**
 * How old the mirror may be before it stops being trusted.
 *
 * Generous on purpose. The refresh runs hourly, so a mirror older than this has
 * missed many refreshes — meaning the bridge has been unreachable for most of a
 * day, which is exactly when falling back to a live lookup is worth its
 * latency.
 */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Re-read from Firestore at most this often. Well under the refresh interval. */
const MEMORY_TTL_MS = 5 * 60 * 1000;

interface MirrorState {
  hashes: Set<string>;
  syncedAtMs: number;
  truncated: boolean;
}

let memory: { at: number; state: MirrorState | null } | null = null;

/** Same derivation the mailing system uses for its subscriber document ids. */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

/** Drop the in-process copy. Used after a refresh, and by tests. */
export function invalidateMirror(): void {
  memory = null;
}

async function readMirror(): Promise<MirrorState | null> {
  if (memory && Date.now() - memory.at < MEMORY_TTL_MS) return memory.state;

  let state: MirrorState | null = null;
  try {
    const snap = await adminFirestore.doc(MIRROR_DOC).get();
    const data = snap.data() as
      | { hashes?: string[]; syncedAt?: Timestamp; truncated?: boolean }
      | undefined;

    if (data?.hashes && data.syncedAt) {
      state = {
        hashes: new Set(data.hashes),
        syncedAtMs: data.syncedAt.toMillis(),
        truncated: data.truncated === true,
      };
    }
  } catch (err) {
    console.error('[suppression-mirror] could not read the mirror:', err);
  }

  memory = { at: Date.now(), state };
  return state;
}

export type ComplaintVerdict =
  /** The mirror is fresh and answered. No live lookup needed. */
  | { complained: boolean; source: 'mirror' }
  /** The mirror could not answer; the caller should ask the mailing system. */
  | { complained: false; source: 'unknown' };

/**
 * Whether this address has reported us as spam, answered locally if possible.
 *
 * A truncated mirror is treated as unusable rather than partial. Half a
 * denylist reads as a clean bill of health for everyone in the missing half,
 * and this is the check that protects the sending domain.
 */
export async function checkComplaintMirror(email: string): Promise<ComplaintVerdict> {
  const state = await readMirror();
  if (!state) return { complained: false, source: 'unknown' };
  if (state.truncated) return { complained: false, source: 'unknown' };
  if (Date.now() - state.syncedAtMs > MAX_AGE_MS) {
    return { complained: false, source: 'unknown' };
  }

  return { complained: state.hashes.has(hashEmail(email)), source: 'mirror' };
}

export interface RefreshResult {
  ok: boolean;
  count: number;
  truncated: boolean;
  error?: string;
}

/**
 * Pull the current complainant list and store it.
 *
 * The previous mirror is left in place on failure rather than cleared. A stale
 * answer is worth more than none: it still blocks the complainants it knows
 * about, and the age check decides when to stop trusting it.
 */
export async function refreshComplaintMirror(): Promise<RefreshResult> {
  const list = await getComplaintHashes();

  if (!list) {
    return { ok: false, count: 0, truncated: false, error: 'Could not reach the mailing system.' };
  }

  try {
    await adminFirestore.doc(MIRROR_DOC).set({
      hashes: list.hashes,
      count: list.count,
      truncated: list.truncated,
      syncedAt: FieldValue.serverTimestamp(),
    });
    invalidateMirror();

    if (list.truncated) {
      console.error(
        '[suppression-mirror] the mailing system truncated the complainant list; ' +
          'falling back to live lookups until that is resolved',
      );
    }

    return { ok: true, count: list.count, truncated: list.truncated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[suppression-mirror] could not store the mirror:', message);
    return { ok: false, count: 0, truncated: false, error: message };
  }
}
