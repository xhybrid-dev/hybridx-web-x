// src/lib/shop/webhook.ts
//
// What each Stripe event does. Server only. The route verifies the signature
// and turns a thrown error into a 500, which makes Stripe retry.

import { fulfilOrder, handleChargeRefunded, handleDisputeCreated } from './orders';
import type { Stripe } from './stripe';

export const HANDLED_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'charge.refunded',
  'charge.dispute.created',
] as const;

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Re-read from the API inside fulfilOrder rather than trusting the
      // payload: it needs the expanded line items and charge anyway, and it
      // means an event replayed out of order acts on the session as it is now.
      if (session.payment_status !== 'paid') return;
      const result = await fulfilOrder(session.id);
      if (result.status === 'fulfilled' && result.emailError) {
        // Order exists; the email did not go. Throwing makes Stripe retry,
        // and the retry finds the order and sends only the email.
        throw result.emailError;
      }
      return;
    }
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      return;
    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object as Stripe.Dispute);
      return;
    default:
      // Subscribed to something not listed above. Acknowledge and ignore.
      return;
  }
}
