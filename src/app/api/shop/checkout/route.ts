import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getShopOffer } from '@/lib/shop/config';
import { salesState } from '@/lib/shop/env';
import { createCheckoutSession } from '@/lib/shop/checkout';
import { cleanUtm, clientIp, ipCountry } from '@/lib/shop/request';
import { ShopNotConfiguredError } from '@/lib/shop/stripe';

/**
 * POST { product, consent: true, utm_source?, utm_medium?, utm_campaign? }
 *   → 200 { url }  the hosted Stripe Checkout page
 *
 * The product key is checked against config and the price is chosen here.
 * Nothing in the body can set an amount.
 */

const HOUR_MS = 60 * 60 * 1000;
const CHECKOUT_LIMIT = 20;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, 'Invalid request.');
  }
  if (!body || typeof body !== 'object') return fail(400, 'Invalid request.');

  // Honeypot: a field no person can see. Answer as though it worked would
  // invite retries with a different payload; a plain refusal is enough.
  if (typeof body.website === 'string' && body.website.length > 0) return fail(400, 'Invalid request.');

  const offer = typeof body.product === 'string' ? getShopOffer(body.product) : undefined;
  if (!offer) return fail(400, 'Unknown product.');

  // Express consent to immediate supply. Without it the buyer keeps a 14-day
  // right to cancel after downloading, so the sale is refused, not made.
  if (body.consent !== true) {
    return fail(400, 'Please tick the box to confirm you want the download straight away.');
  }

  const state = salesState(offer.event);
  if (state === 'closed') return fail(410, 'Sales for this event have closed.');
  if (state === 'not-open') return fail(503, 'Sales have not opened yet.');

  const ip = clientIp(request.headers);
  if (ip !== 'unknown') {
    const { allowed } = await checkRateLimit(`shop-checkout:${ip}`, HOUR_MS, CHECKOUT_LIMIT);
    if (!allowed) return fail(429, 'Too many attempts. Please wait a few minutes and try again.');
  }

  try {
    const url = await createCheckoutSession({
      offer,
      event: offer.event,
      consentAt: new Date(),
      ipCountry: ipCountry(request.headers),
      utm: {
        source: cleanUtm(body.utm_source),
        medium: cleanUtm(body.utm_medium),
        campaign: cleanUtm(body.utm_campaign),
      },
    });
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[shop] checkout failed:', message);
    if (err instanceof ShopNotConfiguredError) return fail(503, 'Checkout is not available right now.');
    return fail(500, 'Checkout could not be started. Please try again in a minute.');
  }
}
