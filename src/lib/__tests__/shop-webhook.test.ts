import { describe, it, expect, beforeEach, vi } from 'vitest';
import Stripe from 'stripe';

/**
 * The webhook trusts nothing it cannot verify. A bad signature is a 400 and
 * the body is never acted on; a transient failure is a 500 so Stripe retries.
 */

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_key_for_signature_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

const handled = vi.fn(async (_event: { type: string }) => {});
vi.mock('@/lib/shop/webhook', () => ({ handleStripeEvent: (e: never) => handled(e) }));

const { POST } = await import('@/app/api/shop/stripe-webhook/route');

const payload = JSON.stringify({
  id: 'evt_test_1',
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_test_x', object: 'checkout.session', payment_status: 'paid' } },
});

function post(body: string, signature?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature) headers['stripe-signature'] = signature;
  return POST(new Request('https://hybridx.club/api/shop/stripe-webhook', { method: 'POST', body, headers }) as never);
}

const sign = (body: string, secret = process.env.STRIPE_WEBHOOK_SECRET!) =>
  new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload: body, secret });

beforeEach(() => {
  handled.mockReset();
  handled.mockImplementation(async () => {});
});

describe('POST /api/shop/stripe-webhook', () => {
  it('returns 400 for a bad signature and does not handle the event', async () => {
    const res = await post(payload, 't=1,v1=deadbeef');
    expect(res.status).toBe(400);
    expect(handled).not.toHaveBeenCalled();
  });

  it('returns 400 for a signature made with a different secret', async () => {
    const res = await post(payload, sign(payload, 'whsec_someone_else'));
    expect(res.status).toBe(400);
    expect(handled).not.toHaveBeenCalled();
  });

  it('returns 400 when the body was altered after signing', async () => {
    const sig = sign(payload);
    const res = await post(payload.replace('cs_test_x', 'cs_test_y'), sig);
    expect(res.status).toBe(400);
  });

  it('returns 400 with no signature header', async () => {
    expect((await post(payload)).status).toBe(400);
  });

  it('handles a correctly signed event and returns 200', async () => {
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(200);
    expect(handled).toHaveBeenCalledTimes(1);
    expect(handled.mock.calls[0][0].type).toBe('checkout.session.completed');
  });

  it('returns 500 on a transient failure so Stripe retries', async () => {
    handled.mockRejectedValueOnce(new Error('Firestore unavailable'));
    const res = await post(payload, sign(payload));
    expect(res.status).toBe(500);
  });
});
