// src/lib/shop/checkout.ts
//
// Creating a hosted Stripe Checkout Session. Server only.
//
// The client sends an offer key and nothing else that matters: the price, the
// amount and what the order grants are all decided here from config. A
// request cannot name its own price.

import { SHOP_CONSENT, type ShopEvent, type ShopOffer } from './config';
import { priceIdFor, siteUrl, taxEnabled } from './env';
import { getStripe, ShopNotConfiguredError } from './stripe';

export interface CheckoutInput {
  offer: ShopOffer;
  event: ShopEvent;
  /** When the server received the consent tick. */
  consentAt: Date;
  ipCountry: string | null;
  utm: { source?: string; medium?: string; campaign?: string };
}

/** The configured Stripe Price disagrees with the page. Refused rather than charged. */
export class PriceMismatchError extends Error {
  constructor(detail: string) {
    super(`Stripe price does not match the page: ${detail}`);
    this.name = 'PriceMismatchError';
  }
}

const PRICE_CACHE_MS = 10 * 60 * 1000;
const verified = new Map<string, number>();

/**
 * Check the Stripe Price matches what the page quotes, once per ten minutes.
 *
 * The page's prices come from config and the charge comes from Stripe, so a
 * price edited in one place and not the other would quote £8 and charge £12.
 * Comparing them here makes that a failed checkout and a log line instead.
 */
async function verifyPrice(offer: ShopOffer, priceId: string): Promise<void> {
  const at = verified.get(priceId);
  if (at && Date.now() - at < PRICE_CACHE_MS) return;
  const price = await getStripe().prices.retrieve(priceId);
  if (!price.active) throw new PriceMismatchError(`${offer.priceEnv} is archived`);
  if (price.currency !== 'gbp') throw new PriceMismatchError(`${offer.priceEnv} is in ${price.currency}`);
  if (price.unit_amount !== offer.pricePence) {
    throw new PriceMismatchError(
      `${offer.priceEnv} is ${price.unit_amount} pence, config says ${offer.pricePence}`,
    );
  }
  verified.set(priceId, Date.now());
}

/** Tests only. */
export function resetPriceCache(): void {
  verified.clear();
}

export async function createCheckoutSession(input: CheckoutInput): Promise<string> {
  const { offer, event } = input;
  const priceId = priceIdFor(offer);
  if (!priceId) throw new ShopNotConfiguredError(`${offer.priceEnv} is not set`);
  await verifyPrice(offer, priceId);

  const site = siteUrl();
  const metadata: Record<string, string> = {
    shop_event: event.slug,
    product: offer.key,
    consent_version: SHOP_CONSENT.version,
    consent_text: SHOP_CONSENT.text,
    consent_at: input.consentAt.toISOString(),
    ip_country: input.ipCountry ?? '',
  };
  if (input.utm.source) metadata.utm_source = input.utm.source;
  if (input.utm.medium) metadata.utm_medium = input.utm.medium;
  if (input.utm.campaign) metadata.utm_campaign = input.utm.campaign;

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    currency: 'gbp',
    line_items: [{ price: priceId, quantity: 1 }],
    // Card only. Cards settle immediately, so there is never a buyer waiting
    // on a bank transfer for a £5 PDF, and every order carries a card country
    // as location evidence for VAT.
    allowed_payment_method_types: ['card'],
    billing_address_collection: 'required',
    automatic_tax: { enabled: taxEnabled() },
    custom_text: { submit: { message: SHOP_CONSENT.text } },
    success_url: `${site}${event.path}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}${event.path}`,
    metadata,
    // Copied onto the PaymentIntent so it is visible from the payment in the
    // dashboard, where refunds and disputes are handled.
    payment_intent_data: { metadata: { shop_event: event.slug, product: offer.key } },
    locale: 'auto',
    allow_promotion_codes: false,
  });

  if (!session.url) throw new Error('Stripe returned a session without a URL');
  return session.url;
}
