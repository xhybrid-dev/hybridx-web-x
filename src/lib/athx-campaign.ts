// src/lib/athx-campaign.ts
//
// The ATHX 2027 funnel's identifiers, in one place.
//
// They are needed by the server action, the confirm page, the download route
// and the email, and the action is a `'use server'` module — which may only
// export async functions, so it cannot be their home. Hard-coding the strings
// at four call sites instead is how a funnel ends up half-registered: the
// capture files leads under one slug and the download gate checks another, and
// every confirmation link fails verification with nothing in the logs to say
// why.

/**
 * The funnel slug. Travels to the mailing system as the lead's `source`, where
 * it resolves to an intake route (see the app's lib/marketing/sources.ts) and
 * decides which welcome journey enrols the subscriber.
 *
 * Must satisfy the shared slug rule — see isValidLeadSource in lib/leads.ts and
 * the agreement test that pins it against the app's own copy.
 */
export const ATHX_SOURCE = 'athx_2027_guide';

/**
 * The tag carried into the mailing system alongside the automatic `route:` tag.
 *
 * Hyphens, not underscores: the receiving end accepts `[a-z0-9:-]` and silently
 * drops anything else, so the underscored spelling of the slug would arrive as
 * no tag at all.
 */
export const ATHX_TAG = 'athx-2027-guide';

/** Filename the guide downloads as. */
export const ATHX_PDF_FILENAME = 'What-Is-ATHX.pdf';

/** Where the guide lives on disk — outside /public, so the gate is the only route to it. */
export const ATHX_PDF_FILE = 'what-is-athx.pdf';
