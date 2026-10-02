// src/lib/shop/stripe.ts
//
// The one Stripe client. Server only.
//
// The API version is pinned rather than left to the account default: a
// dashboard upgrade would otherwise change the shape of the sessions and
// events this code reads, on a day nobody deployed anything. Bump it together
// with the `stripe` package (pinned exactly in package.json for the same
// reason), and re-run the manual checks in docs/shop-setup.md when you do.
//
// Nothing here touches the app's subscription billing, which lives in the
// hyroxedgeai project and its own code.

import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2026-09-30.endive' as const;

let client: Stripe | null = null;

export class ShopNotConfiguredError extends Error {
  constructor(what: string) {
    super(`Shop is not configured: ${what}`);
    this.name = 'ShopNotConfiguredError';
  }
}

export function getStripe(): Stripe {
  if (client) return client;
  // .trim(): a secret piped through `echo` rather than `echo -n` carries a
  // trailing newline, and Stripe rejects the key as malformed.
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new ShopNotConfiguredError('STRIPE_SECRET_KEY is not set');
  client = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: 'hybridx.club shop' },
  });
  return client;
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new ShopNotConfiguredError('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

export type { Stripe };
