import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminFirestore } from '@/lib/firebase-admin';
import type { ForwardLeadInput } from '@/lib/marketing-bridge';
import { attemptForwardAsync, pendingOutbox } from '@/lib/lead-outbox';

/**
 * A funnel identifier.
 *
 * Deliberately a slug rather than a union. A closed union meant every new
 * promotion needed a type change here, a bespoke server action, and a deploy of
 * this project *and* the app before its leads could be nurtured — five
 * touchpoints across two repositories to launch a landing page. Funnels change
 * at marketing speed; that made this file the bottleneck on the thing it exists
 * to serve.
 *
 * The mailing system registers a slug it has never seen on the first lead that
 * carries it, so a new funnel is a new page and nothing else.
 */
export type LeadSource = string;

/** The funnels that predate slugs. Kept only so their spellings stay stable. */
export const LEGACY_LEAD_SOURCES = [
  'free_hyrox_plan',
  'sign_up',
  'build_a_bigger_engine',
  'hyrox_rules_card',
] as const;

/**
 * Shape check for a funnel slug, matching the mailing system's own rule. A slug
 * that fails this is still captured locally — it becomes a route the app files
 * as unclassified rather than a lost lead — but it will not get its own route.
 */
const SLUG = /^[a-z0-9][a-z0-9_-]{1,48}$/;

export function isValidLeadSource(source: string): boolean {
  return SLUG.test(source);
}

export interface LeadInput {
  source: LeadSource;
  email: string;
  name?: string;
  /** Free-form extra fields specific to the source (event, eventDate, tag, etc). */
  extra?: Record<string, unknown>;
  /**
   * Tags to carry into the mailing system alongside the ones its own intake
   * registry applies for this source. Lowercase, `[a-z0-9:-]`, at most five —
   * the receiving end validates and drops anything else.
   */
  tags?: string[];
  utm?: Record<string, string>;
  userAgent?: string;
  ip?: string;
}

/**
 * Single write path for every lead magnet on the site. Throws on failure —
 * callers decide whether that should surface to the user or just be logged,
 * but it must never be swallowed silently.
 */
export async function saveLead(input: LeadInput): Promise<void> {
  const email = input.email.trim().toLowerCase();

  // Push into the mailing system so this person can actually be nurtured.
  // Single opt-in magnets carry consent: the forms state that signing up means
  // ongoing email and that they can unsubscribe at any time, which is what the
  // consent flag records.
  const payload: ForwardLeadInput = {
    email,
    name: input.name?.trim() || undefined,
    source: input.source,
    consent: true,
    consentMethod: `magnet:${input.source}`,
    utm: input.utm,
    tags: input.tags,
  };

  const ref = await adminFirestore.collection('leads').add({
    source: input.source,
    email,
    name: input.name?.trim() || null,
    // Stored here as well as forwarded. The forward is fire-and-forget and
    // swallows its failures, so tags that existed only in that payload would be
    // gone for good on any bridge outage — with no way to replay the window and
    // recover which nurture sequence these people belonged to.
    tags: input.tags || [],
    extra: input.extra || {},
    utm: input.utm || {},
    userAgent: input.userAgent || '',
    ip: input.ip || '',
    createdAt: FieldValue.serverTimestamp(),
    // The outbox entry is written with the lead, in the same operation. Any
    // ordering where the forward is attempted before the entry exists is an
    // ordering where a crash loses the lead.
    ...pendingOutbox(payload),
  });

  // Attempted immediately and not awaited, so the visitor waits for nothing —
  // but the entry survives the attempt failing, and the drain will finish the
  // job. This is the difference between a bridge outage costing a delay and
  // costing the lead.
  attemptForwardAsync(ref.path, payload);
}

/**
 * Deterministic document id for one address on one magnet. Emails can contain
 * characters Firestore rejects in ids, so the address is hashed rather than
 * used directly.
 */
function leadDocId(source: LeadSource, email: string): string {
  const hash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `${source}__${hash}`;
}

/**
 * Write path for confirmed-opt-in magnets. Unlike saveLead this upserts on
 * (source, email), so someone who requests the card twice produces one record
 * rather than two — which keeps the confirmation rate honest.
 */
export async function upsertPendingLead(input: LeadInput): Promise<void> {
  const email = input.email.trim().toLowerCase();

  // Forwarded WITHOUT consent. This magnet uses confirmed opt-in, and someone
  // who has requested a confirmation link has not yet given it — recording
  // consent now would defeat the point of asking twice. They land on the list
  // as a known contact, and markLeadConfirmed grants consent if they click.
  const payload: ForwardLeadInput = {
    email,
    name: input.name?.trim() || undefined,
    source: input.source,
    consent: false,
    consentMethod: `magnet:${input.source}:pending`,
    utm: input.utm,
    tags: input.tags,
  };

  const docId = leadDocId(input.source, email);

  await adminFirestore
    .collection('leads')
    .doc(docId)
    .set(
      {
        source: input.source,
        email,
        name: input.name?.trim() || null,
        extra: input.extra || {},
        utm: input.utm || {},
        userAgent: input.userAgent || '',
        ip: input.ip || '',
        tags: input.tags || [],
        confirmed: false,
        createdAt: FieldValue.serverTimestamp(),
        ...pendingOutbox(payload),
      },
      // Never let a repeat request downgrade an already-confirmed lead — and
      // never let it reset an outbox entry that has already been delivered, or
      // a second request for the card would re-forward the pending (consent
      // false) payload after the confirmation had granted consent.
      {
        mergeFields: [
          'source', 'email', 'name', 'tags', 'extra', 'utm', 'userAgent', 'ip', 'createdAt',
        ],
      }
    );

  attemptForwardAsync(`leads/${docId}`, payload);
}

/**
 * Marks an address as having clicked the confirmation link. Upserts, so a
 * confirmation still lands even if the pending write failed earlier.
 */
export async function markLeadConfirmed(
  source: LeadSource,
  email: string,
  tags?: string[],
): Promise<void> {
  const normalised = email.trim().toLowerCase();

  // A clicked confirmation link is the strongest consent evidence available,
  // so this is where the mailing system is told they may be emailed. That
  // grant is also what raises `consentGranted` there, which is the trigger a
  // confirmed opt-in nurture sequence starts from — so this call is not merely
  // bookkeeping, it is what actually begins the sequence.
  //
  // Which makes it the forward that most needs to survive an outage: losing it
  // means somebody completed a double opt-in and is then never mailed, with the
  // pending record still saying they never confirmed.
  const payload: ForwardLeadInput = {
    email: normalised,
    source,
    consent: true,
    consentMethod: `magnet:${source}:confirmed`,
    tags,
  };

  const docId = leadDocId(source, normalised);

  await adminFirestore
    .collection('leads')
    .doc(docId)
    .set(
      {
        source,
        email: normalised,
        confirmed: true,
        confirmedAt: FieldValue.serverTimestamp(),
        // Replaces whatever the pending write left, so the outbox now carries
        // the consent-granting payload rather than the one that withheld it.
        ...pendingOutbox(payload),
      },
      { merge: true }
    );

  attemptForwardAsync(`leads/${docId}`, payload);
}
