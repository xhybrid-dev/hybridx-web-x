import { NextRequest, NextResponse } from 'next/server';
import { getStripe, ShopNotConfiguredError, webhookSecret, type Stripe } from '@/lib/shop/stripe';
import { handleStripeEvent } from '@/lib/shop/webhook';

/**
 * Stripe webhook. Subscribe it to the four events in HANDLED_EVENTS
 * (src/lib/shop/webhook.ts) and nothing else.
 *
 *   400  the signature does not verify. Nothing is read from the body.
 *   200  handled, or an event this route ignores.
 *   500  a transient failure. Stripe retries with backoff for three days.
 */

// The signature is over the exact bytes Stripe sent, so the body is read raw
// and never parsed before verification.
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch (err) {
    if (err instanceof ShopNotConfiguredError) {
      console.error('[shop] webhook received but the shop is not configured:', err.message);
      return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error('[shop] webhook handling failed', {
      type: event.type,
      id: event.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Temporary failure.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
