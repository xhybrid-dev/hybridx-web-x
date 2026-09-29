// src/lib/plan-finder/config.ts
//
// The plan finder's switches (HX_CONFIG in the reference, handover/entry-funnel/docs/04).
// Tracking still needs the visitor's consent in the banner, and stays off under
// Global Privacy Control or Do Not Track, whatever is set here.

export const PLAN_FINDER = {
  /** Where tracked batches go. Empty turns tracking off everywhere. */
  trackEndpoint: '/api/collect',
  /** Where Talk-to-us messages go. Empty makes the form a preview that says nothing was sent. */
  talkEndpoint: '/api/talk',
  /** Send the scrubbed step-5 note. false never sends it, and the step-5 wording changes to say so. */
  captureNote: true,
  privacyHref: '/privacy-policy#plan-finder',
  /** Stored with every batch so the admin can compare before and after a change. Bump on visible changes. */
  siteVersion: 'web-1',
} as const;

/** Firestore collections. Clients can read or write none of them (firestore.rules). */
export const COLLECTIONS = {
  batches: 'hx_batches',
  rollups: 'hx_rollups',
  leads: 'hx_leads',
  insights: 'hx_insights',
} as const;

const DAY_MS = 86_400_000;
/** Raw batches are deleted after this, by a Firestore TTL policy on `expireAt`. */
export const BATCH_RETENTION_MS = 400 * DAY_MS;
/** The step-5 note is blanked after this (the rest of the batch stays until the TTL). */
export const NOTE_RETENTION_MS = 90 * DAY_MS;
/** Talk-to-us messages are deleted after this, by a TTL policy on `expireAt`. */
export const LEAD_RETENTION_MS = 365 * DAY_MS;
