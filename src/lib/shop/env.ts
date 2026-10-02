// src/lib/shop/env.ts
//
// The shop's per-deployment settings, read from the environment. Server only.
//
// Read on every call rather than captured at import, so tests can set them
// and so a value changed in apphosting.yaml applies on the next rollout
// without anything here needing to know.

import { SITE_CONFIG } from '@/lib/seo';
import { SHOP_EVENTS, type ShopEvent, type ShopOffer } from './config';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Absolute site origin, no trailing slash. Used in Stripe redirects and emails. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE_CONFIG.url).replace(/\/+$/, '');
}

export function taxEnabled(): boolean {
  return process.env.SHOP_TAX_ENABLED === 'true';
}

export function downloadLimits(): { perProductPerDay: number; total: number } {
  return {
    perProductPerDay: intEnv('SHOP_DOWNLOAD_LIMIT_PER_PRODUCT_DAY', 10),
    total: intEnv('SHOP_DOWNLOAD_LIMIT_TOTAL', 50),
  };
}

/** From identity for order email. Falls back to the site-wide sender. */
export function shopEmailFrom(): string | undefined {
  return process.env.SHOP_EMAIL_FROM?.trim() || undefined;
}

export function storageBucketName(): string {
  return process.env.SHOP_STORAGE_BUCKET || 'hybridx-hub.firebasestorage.app';
}

export function salesCloseAt(event: ShopEvent): Date {
  const fromEnv = process.env.SHOP_SALES_CLOSE_AT;
  const parsed = fromEnv ? new Date(fromEnv) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(event.salesCloseAt);
}

/**
 * Where an event's sales stand.
 *
 *   not-open  SHOP_SALES_OPEN is not "true". The default, because going live
 *             waits on decisions (EU VAT, prices, wording) that are not code.
 *             The page renders with the buy buttons replaced by a notice, and
 *             nothing links to it.
 *   open      Checkout works.
 *   closed    After the close time. Checkout returns 410; download pages keep
 *             working indefinitely.
 */
export type SalesState = 'not-open' | 'open' | 'closed';

export function salesState(event: ShopEvent, now = new Date()): SalesState {
  if (now >= salesCloseAt(event)) return 'closed';
  return process.env.SHOP_SALES_OPEN === 'true' ? 'open' : 'not-open';
}

/** The Stripe Price ID configured for an offer, if any. */
export function priceIdFor(offer: ShopOffer): string | undefined {
  return process.env[offer.priceEnv]?.trim() || undefined;
}

/**
 * Reverse lookup: which offer a Stripe Price belongs to.
 *
 * Fulfilment trusts this, not anything the client sent, to decide what an
 * order grants. A bundle price resolves to the bundle offer, whose `files`
 * lists both PDFs.
 */
export function offerForPriceId(priceId: string): (ShopOffer & { event: ShopEvent }) | undefined {
  for (const event of SHOP_EVENTS) {
    for (const offer of event.offers) {
      if (priceIdFor(offer) === priceId) return { ...offer, event };
    }
  }
  return undefined;
}
