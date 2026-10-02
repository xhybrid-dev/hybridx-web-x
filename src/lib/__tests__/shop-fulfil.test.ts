import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

/**
 * fulfilOrder is called by the thanks page and by the webhook, in either
 * order, possibly at the same moment, possibly more than once each. Whatever
 * the interleaving, a paid session must become exactly one order with one
 * download token, and the buyer must get exactly one email.
 */

const db = new FakeFirestore();
const sessions = new Map<string, unknown>();
const retrieve = vi.fn(async (id: string) => {
  const s = sessions.get(id);
  if (!s) throw new Error('No such checkout.session');
  return structuredClone(s);
});
const sendEmail = vi.fn(async (_opts: { to: string; subject: string; text: string }) => {});

vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {} }));
vi.mock('@/lib/email/service', () => ({ sendEmail: (opts: never) => sendEmail(opts) }));
vi.mock('@/lib/shop/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve } } }),
  ShopNotConfiguredError: class extends Error {},
}));

process.env.STRIPE_PRICE_GUIDE = 'price_guide';
process.env.STRIPE_PRICE_PACK = 'price_pack';
process.env.STRIPE_PRICE_BUNDLE = 'price_bundle';
process.env.NEXT_PUBLIC_SITE_URL = 'https://hybridx.club';

const { fulfilOrder, handleChargeRefunded, handleDisputeCreated } = await import('../shop/orders');

function session(id: string, priceId: string, amount: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    object: 'checkout.session',
    livemode: false,
    payment_status: 'paid',
    amount_total: amount,
    currency: 'gbp',
    total_details: { amount_tax: 0 },
    customer_details: { email: 'Buyer@Example.com', address: { country: 'IE' } },
    payment_intent: {
      id: `pi_${id}`,
      latest_charge: {
        id: `ch_${id}`,
        refunded: false,
        disputed: false,
        payment_method_details: { card: { country: 'DE' } },
      },
    },
    metadata: {
      shop_event: 'hyrox-glasgow-2027',
      product: 'x',
      consent_version: '2026-10-02',
      consent_text: 'I want to download this PDF immediately...',
      consent_at: '2026-10-02T10:00:00.000Z',
      ip_country: 'FR',
      utm_source: 'instagram',
    },
    line_items: { data: [{ price: { id: priceId }, amount_total: amount }] },
    ...extra,
  };
}

const SID = 'cs_test_a1b2c3d4e5f6g7h8i9j0';

beforeEach(() => {
  db.reset();
  sessions.clear();
  sendEmail.mockReset();
  sendEmail.mockImplementation(async () => {});
  retrieve.mockClear();
});

describe('fulfilOrder', () => {
  it('called twice for one session creates one order and sends one email', async () => {
    sessions.set(SID, session(SID, 'price_guide', 800));

    const first = await fulfilOrder(SID);
    const second = await fulfilOrder(SID);

    expect(first.status).toBe('fulfilled');
    expect(second.status).toBe('fulfilled');
    if (first.status !== 'fulfilled' || second.status !== 'fulfilled') return;
    expect(second.token).toBe(first.token);
    expect(db.all('shop_orders')).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('called concurrently (thanks page and webhook together) still sends one email', async () => {
    sessions.set(SID, session(SID, 'price_guide', 800));
    const results = await Promise.all([fulfilOrder(SID), fulfilOrder(SID), fulfilOrder(SID)]);
    const tokens = new Set(results.map((r) => (r.status === 'fulfilled' ? r.token : null)));
    expect(tokens.size).toBe(1);
    expect(db.all('shop_orders')).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('records the order, the VAT evidence, the consent and the UTM source', async () => {
    sessions.set(SID, session(SID, 'price_pack', 500));
    await fulfilOrder(SID);
    const [{ id, data }] = db.all('shop_orders');
    expect(id).toBe(SID);
    expect(data).toMatchObject({
      status: 'paid',
      email: 'buyer@example.com',
      items: [{ product: 'glasgow-2027-pack', priceId: 'price_pack', amount: 500 }],
      files: ['glasgow-2027-pack'],
      amountTotal: 500,
      amountTax: 0,
      billingCountry: 'IE',
      ipCountry: 'FR',
      cardCountry: 'DE',
      paymentIntentId: `pi_${SID}`,
      consent: { version: '2026-10-02', text: 'I want to download this PDF immediately...' },
      utm: { source: 'instagram', medium: null, campaign: null },
    });
    expect((data.consent as { acceptedAt: Date }).acceptedAt.toISOString()).toBe('2026-10-02T10:00:00.000Z');
    expect(data.downloadToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(data.emailSentAt).toBeInstanceOf(Date);
  });

  it('a bundle price grants both files', async () => {
    sessions.set(SID, session(SID, 'price_bundle', 1200));
    await fulfilOrder(SID);
    const [{ data }] = db.all('shop_orders');
    expect(data.files).toEqual(['glasgow-2027-guide', 'glasgow-2027-pack']);
    expect(data.items).toEqual([{ product: 'glasgow-2027-bundle', priceId: 'price_bundle', amount: 1200 }]);
  });

  it('the email links to the download page and lists the order', async () => {
    sessions.set(SID, session(SID, 'price_bundle', 1200));
    const r = await fulfilOrder(SID);
    if (r.status !== 'fulfilled') throw new Error('not fulfilled');
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('buyer@example.com');
    expect(mail.subject).toBe('Your HYROX Glasgow 2027 downloads');
    expect(mail.text).toContain(`https://hybridx.club/d/${r.token}`);
    expect(mail.text).toContain('https://hybridx.club/resend.');
    expect(mail.text).toContain('Total paid: £12.00');
  });

  it('does nothing for an unpaid session', async () => {
    sessions.set(SID, session(SID, 'price_guide', 800, { payment_status: 'unpaid' }));
    expect((await fulfilOrder(SID)).status).toBe('not_paid');
    expect(db.all('shop_orders')).toHaveLength(0);
  });

  it('ignores sessions that are not from the shop', async () => {
    sessions.set(SID, session(SID, 'price_other', 500, { metadata: {} }));
    expect((await fulfilOrder(SID)).status).toBe('not_shop');
    expect(db.all('shop_orders')).toHaveLength(0);
  });

  it('never sends a malformed session id to Stripe', async () => {
    expect((await fulfilOrder('../../etc')).status).toBe('invalid');
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('throws on a price it does not sell, so the webhook is retried', async () => {
    sessions.set(SID, session(SID, 'price_unknown', 800));
    await expect(fulfilOrder(SID)).rejects.toThrow(/no price this shop sells/);
  });

  it('a failed email leaves the order in place and is sent on the next call', async () => {
    sessions.set(SID, session(SID, 'price_guide', 800));
    sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

    const first = await fulfilOrder(SID);
    expect(first.status === 'fulfilled' && first.emailError?.message).toBe('SMTP down');
    expect(db.all('shop_orders')[0].data.emailSentAt).toBeNull();

    const second = await fulfilOrder(SID);
    expect(second.status === 'fulfilled' && second.emailSent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(db.all('shop_orders')[0].data.emailSentAt).toBeInstanceOf(Date);
  });

  it('a session already refunded before fulfilment is recorded as refunded and not emailed', async () => {
    const s = session(SID, 'price_guide', 800);
    (s.payment_intent.latest_charge as { refunded: boolean }).refunded = true;
    sessions.set(SID, s);
    await fulfilOrder(SID);
    expect(db.all('shop_orders')[0].data.status).toBe('refunded');
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('refunds and disputes', () => {
  beforeEach(async () => {
    sessions.set(SID, session(SID, 'price_guide', 800));
    await fulfilOrder(SID);
  });

  it('a full refund ends access', async () => {
    await handleChargeRefunded({ payment_intent: `pi_${SID}`, refunded: true, amount_refunded: 800 } as never);
    expect(db.all('shop_orders')[0].data).toMatchObject({ status: 'refunded', amountRefunded: 800 });
  });

  it('a partial refund is recorded and access continues', async () => {
    await handleChargeRefunded({ payment_intent: `pi_${SID}`, refunded: false, amount_refunded: 300 } as never);
    expect(db.all('shop_orders')[0].data).toMatchObject({ status: 'paid', amountRefunded: 300 });
  });

  it('a dispute pauses access', async () => {
    await handleDisputeCreated({ payment_intent: `pi_${SID}` } as never);
    expect(db.all('shop_orders')[0].data.status).toBe('disputed');
  });

  it('fulfilling again after a refund keeps the refund', async () => {
    await handleChargeRefunded({ payment_intent: `pi_${SID}`, refunded: true, amount_refunded: 800 } as never);
    await fulfilOrder(SID);
    expect(db.all('shop_orders')[0].data.status).toBe('refunded');
  });
});
