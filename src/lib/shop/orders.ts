// src/lib/shop/orders.ts
//
// Turning a paid Stripe Checkout Session into an order. Server only.
//
// fulfilOrder() is called from two places that race: the thanks page the
// buyer lands on, and the checkout.session.completed webhook. Either may
// arrive first, either may arrive twice, and the buyer may close the tab so
// the thanks page never arrives at all. So it is idempotent end to end:
//
//   - The order document is keyed by the session id and created inside a
//     transaction, so two callers cannot both create it, and the second gets
//     the first one's download token.
//   - The email is sent by whichever caller claims it first. The claim is a
//     lease, not a lock: a caller that claims and then dies (a crashed
//     instance, a timed-out request) leaves a claim that expires, and the
//     next webhook retry sends it.

import { randomBytes } from 'node:crypto';
import { adminFirestore } from '@/lib/firebase-admin';
import { getShopEvent, getShopFile, type ShopEvent } from './config';
import { offerForPriceId } from './env';
import { getStripe, type Stripe } from './stripe';
import { sendOrderEmail } from './email';

export const ORDERS = 'shop_orders';

/** How long a claim to send the order email holds before another caller may retry it. */
export const EMAIL_CLAIM_LEASE_MS = 2 * 60 * 1000;

export type OrderStatus = 'paid' | 'refunded' | 'disputed';

export interface OrderItem {
  /** Offer key from config. */
  product: string;
  priceId: string;
  /** Pence, after any discount, including any tax. */
  amount: number;
}

export interface ShopOrder {
  status: OrderStatus;
  eventSlug: string;
  email: string;
  items: OrderItem[];
  /** File keys the order grants: the union of every item's files. */
  files: string[];
  amountTotal: number;
  amountTax: number;
  currency: string;
  paymentIntentId: string | null;
  downloadToken: string;
  /** Shown to the buyer and used in support replies. Not derived from the session id. */
  shortId: string;
  createdAt: Date;
  emailSentAt: Date | null;
  emailClaimedAt: Date | null;
  billingCountry: string | null;
  ipCountry: string | null;
  cardCountry: string | null;
  consent: { version: string | null; text: string | null; acceptedAt: Date | null };
  utm: { source: string | null; medium: string | null; campaign: string | null };
  livemode: boolean;
  /** Pence refunded so far, set by charge.refunded. */
  amountRefunded?: number;
  refundedAt?: Date | null;
  disputedAt?: Date | null;
}

/** Stripe's Checkout Session ids, test or live. Anything else is never sent to Stripe. */
const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

/** 24 random bytes as base64url: always 32 characters. */
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export function isDownloadToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

export function newDownloadToken(): string {
  return randomBytes(24).toString('base64url');
}

// No 0/O or 1/I/L: this is read aloud and typed into support replies.
const SHORT_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newShortId(): string {
  const bytes = randomBytes(6);
  let id = 'HX-';
  for (const b of bytes) id += SHORT_ID_ALPHABET[b % SHORT_ID_ALPHABET.length];
  return id;
}

/** Firestore hands back Timestamps; the fake in tests hands back Dates. */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === 'function' ? maybe.toDate() : null;
}

/** A Stripe Price this deployment does not sell. Retried, because the fix is configuration. */
export class UnknownPriceError extends Error {
  constructor(priceIds: string[]) {
    super(`Checkout session contains no price this shop sells (${priceIds.join(', ') || 'none'})`);
    this.name = 'UnknownPriceError';
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function str(value: string | undefined | null): string | null {
  return value ? value : null;
}

/** The charge behind a session, when it was expanded. */
function latestCharge(session: Stripe.Checkout.Session): Stripe.Charge | null {
  const pi = session.payment_intent;
  if (!pi || typeof pi === 'string') return null;
  const charge = pi.latest_charge;
  if (!charge || typeof charge === 'string') return null;
  return charge;
}

/** Build the order a session describes. Pure, apart from minting the token and short id. */
export function orderFromSession(session: Stripe.Checkout.Session, event: ShopEvent): ShopOrder {
  const lineItems = session.line_items?.data ?? [];
  const items: OrderItem[] = [];
  const files = new Set<string>();
  const unknown: string[] = [];

  for (const li of lineItems) {
    const priceId = li.price?.id ?? '';
    const offer = offerForPriceId(priceId);
    if (!offer || offer.event.slug !== event.slug) {
      unknown.push(priceId);
      continue;
    }
    items.push({ product: offer.key, priceId, amount: li.amount_total ?? 0 });
    for (const f of offer.files) files.add(f);
  }
  if (items.length === 0) throw new UnknownPriceError(unknown);
  if (unknown.length) {
    // Sold, but not something this code knows how to deliver. Fulfil what it
    // can and say so loudly, rather than withholding the files it does know.
    console.error('[shop] session has line items with unknown prices', { unknown });
  }

  const charge = latestCharge(session);
  const md = session.metadata ?? {};
  const consentAt = md.consent_at ? new Date(md.consent_at) : null;

  let status: OrderStatus = 'paid';
  if (charge?.disputed) status = 'disputed';
  else if (charge?.refunded) status = 'refunded';

  return {
    status,
    eventSlug: event.slug,
    email: (session.customer_details?.email ?? session.customer_email ?? '').trim().toLowerCase(),
    items,
    files: [...files],
    amountTotal: session.amount_total ?? 0,
    amountTax: session.total_details?.amount_tax ?? 0,
    currency: session.currency ?? 'gbp',
    paymentIntentId: idOf(session.payment_intent),
    downloadToken: newDownloadToken(),
    shortId: newShortId(),
    createdAt: new Date(),
    emailSentAt: null,
    emailClaimedAt: null,
    billingCountry: str(session.customer_details?.address?.country),
    ipCountry: str(md.ip_country),
    cardCountry: str(charge?.payment_method_details?.card?.country),
    consent: {
      version: str(md.consent_version),
      text: str(md.consent_text),
      acceptedAt: consentAt && !Number.isNaN(consentAt.getTime()) ? consentAt : null,
    },
    utm: {
      source: str(md.utm_source),
      medium: str(md.utm_medium),
      campaign: str(md.utm_campaign),
    },
    livemode: session.livemode,
  };
}

export type FulfilResult =
  | { status: 'fulfilled'; orderId: string; token: string; emailSent: boolean; emailError?: Error }
  /** Not yet paid: an async payment method still clearing. The webhook fulfils it later. */
  | { status: 'not_paid' }
  /** A session from something else on the same Stripe account. Ignored. */
  | { status: 'not_shop' }
  | { status: 'invalid' };

export async function fulfilOrder(sessionId: string): Promise<FulfilResult> {
  if (!isCheckoutSessionId(sessionId)) return { status: 'invalid' };

  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'payment_intent.latest_charge'],
  });

  const event = getShopEvent(session.metadata?.shop_event ?? '');
  if (!event) return { status: 'not_shop' };
  if (session.payment_status !== 'paid') return { status: 'not_paid' };

  const draft = orderFromSession(session, event);
  const ref = adminFirestore.collection(ORDERS).doc(sessionId);

  const order = await adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return snap.data() as ShopOrder;
    tx.set(ref, draft);
    return draft;
  });

  const email = await ensureOrderEmail(sessionId, order, event);
  return {
    status: 'fulfilled',
    orderId: sessionId,
    token: order.downloadToken,
    emailSent: email.sent,
    ...(email.error ? { emailError: email.error } : {}),
  };
}

/** Item names for the email: offer names, falling back to the key. */
function itemNames(order: ShopOrder, event: ShopEvent): string[] {
  return order.items.map((i) => event.offers.find((o) => o.key === i.product)?.name ?? i.product);
}

async function ensureOrderEmail(
  orderId: string,
  order: ShopOrder,
  event: ShopEvent,
): Promise<{ sent: boolean; error?: Error }> {
  if (order.emailSentAt) return { sent: true };
  // A session refunded before it was ever fulfilled has nothing to deliver.
  if (order.status !== 'paid') return { sent: false };
  if (!order.email) {
    console.error('[shop] order has no email address; cannot send the download link', { orderId });
    return { sent: false };
  }

  const ref = adminFirestore.collection(ORDERS).doc(orderId);
  const now = Date.now();

  const claimed = await adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data() as ShopOrder | undefined;
    if (!current || toDate(current.emailSentAt)) return false;
    const claimedAt = toDate(current.emailClaimedAt);
    if (claimedAt && now - claimedAt.getTime() < EMAIL_CLAIM_LEASE_MS) return false;
    tx.update(ref, { emailClaimedAt: new Date(now) });
    return true;
  });

  // Someone else is sending it, or has.
  if (!claimed) return { sent: true };

  try {
    await sendOrderEmail({
      to: order.email,
      subject: event.emailSubject,
      token: order.downloadToken,
      shortId: order.shortId,
      itemNames: itemNames(order, event),
      amountTotal: order.amountTotal,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    // Release the claim so the next webhook retry can send it straight away.
    await ref.update({ emailClaimedAt: null }).catch(() => {});
    console.error('[shop] order email failed', { orderId, error: error.message });
    return { sent: false, error };
  }

  await ref.update({ emailSentAt: new Date(), emailClaimedAt: null });
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Lookups and status changes
// ---------------------------------------------------------------------------

export async function findOrderByToken(token: string): Promise<{ id: string; order: ShopOrder } | null> {
  if (!isDownloadToken(token)) return null;
  const snap = await adminFirestore.collection(ORDERS).where('downloadToken', '==', token).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, order: doc.data() as ShopOrder };
}

async function updateByPaymentIntent(paymentIntentId: string, patch: Partial<ShopOrder>): Promise<number> {
  const snap = await adminFirestore.collection(ORDERS).where('paymentIntentId', '==', paymentIntentId).get();
  for (const doc of snap.docs) await doc.ref.update(patch);
  return snap.size;
}

/** charge.refunded. Only a full refund ends access; a partial one is recorded and nothing else. */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const pi = idOf(charge.payment_intent);
  if (!pi) return;
  const patch: Partial<ShopOrder> = { amountRefunded: charge.amount_refunded };
  if (charge.refunded) {
    patch.status = 'refunded';
    patch.refundedAt = new Date();
  }
  const n = await updateByPaymentIntent(pi, patch);
  if (n === 0) console.warn('[shop] refund for a payment with no order', { refunded: charge.refunded });
}

/** charge.dispute.created. Downloads stop while the dispute stands. */
export async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  const pi = idOf(dispute.payment_intent);
  if (!pi) return;
  const n = await updateByPaymentIntent(pi, { status: 'disputed', disputedAt: new Date() });
  if (n === 0) console.warn('[shop] dispute for a payment with no order');
}

/** Paid orders for an address, newest first. For /resend. */
export async function paidOrdersForEmail(email: string): Promise<Array<{ id: string; order: ShopOrder }>> {
  const snap = await adminFirestore
    .collection(ORDERS)
    .where('email', '==', email.trim().toLowerCase())
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, order: d.data() as ShopOrder }))
    .filter((o) => o.order.status === 'paid');
}

/** Names of the files an order grants, for display. */
export function orderFileNames(order: ShopOrder): string[] {
  return order.files.map((k) => getShopFile(k)?.name ?? k);
}

export function orderItemNames(order: ShopOrder): string[] {
  const event = getShopEvent(order.eventSlug);
  return event ? itemNames(order, event) : order.items.map((i) => i.product);
}
