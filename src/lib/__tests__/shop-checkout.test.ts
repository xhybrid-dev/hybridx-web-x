import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The checkout route decides the price. The client names a product and
 * confirms consent; everything else comes from config and Stripe.
 */

const create = vi.fn(async (_params: Record<string, unknown>) => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }));
const retrievePrice = vi.fn(async (id: string) => ({ id, active: true, currency: 'gbp', unit_amount: 800 }));

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ allowed: true, remaining: 1, retryAfterMs: 0 }) }));
vi.mock('@/lib/shop/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create } }, prices: { retrieve: retrievePrice } }),
  ShopNotConfiguredError: class ShopNotConfiguredError extends Error {},
}));

const { POST } = await import('@/app/api/shop/checkout/route');
const { resetPriceCache } = await import('../shop/checkout');

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('https://hybridx.club/api/shop/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.1', ...headers },
    }) as never,
  );
}

beforeEach(() => {
  create.mockClear();
  retrievePrice.mockClear();
  retrievePrice.mockImplementation(async (id: string) => ({ id, active: true, currency: 'gbp', unit_amount: 800 }));
  resetPriceCache();
  process.env.SHOP_SALES_OPEN = 'true';
  process.env.SHOP_SALES_CLOSE_AT = '2099-01-01T00:00:00Z';
  process.env.STRIPE_PRICE_GUIDE = 'price_guide';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://hybridx.club';
  delete process.env.SHOP_TAX_ENABLED;
});

describe('POST /api/shop/checkout', () => {
  it('creates a session with the server-chosen price, consent text and metadata', async () => {
    const res = await post(
      { product: 'glasgow-2027-guide', consent: true, utm_source: 'instagram', price: 1, amount: 1 },
      { 'x-vercel-ip-country': 'ie' },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const params = create.mock.calls[0][0] as Record<string, any>;
    expect(params.line_items).toEqual([{ price: 'price_guide', quantity: 1 }]);
    expect(params).toMatchObject({
      mode: 'payment',
      currency: 'gbp',
      billing_address_collection: 'required',
      automatic_tax: { enabled: false },
      locale: 'auto',
      allow_promotion_codes: false,
      success_url: 'https://hybridx.club/hyrox-glasgow-2027/thanks?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://hybridx.club/hyrox-glasgow-2027',
    });
    expect(params.custom_text.submit.message).toMatch(/lose my right to cancel/);
    expect(params.metadata).toMatchObject({
      shop_event: 'hyrox-glasgow-2027',
      product: 'glasgow-2027-guide',
      ip_country: 'IE',
      utm_source: 'instagram',
    });
    expect(params.metadata.consent_version).toBeTruthy();
  });

  it('refuses without consent', async () => {
    expect((await post({ product: 'glasgow-2027-guide' })).status).toBe(400);
    expect((await post({ product: 'glasgow-2027-guide', consent: 'true' })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses an unknown product', async () => {
    expect((await post({ product: 'free-stuff', consent: true })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 410 after sales close', async () => {
    process.env.SHOP_SALES_CLOSE_AT = '2020-01-01T00:00:00Z';
    expect((await post({ product: 'glasgow-2027-guide', consent: true })).status).toBe(410);
  });

  it('returns 503 before sales open', async () => {
    process.env.SHOP_SALES_OPEN = 'false';
    expect((await post({ product: 'glasgow-2027-guide', consent: true })).status).toBe(503);
  });

  it('refuses when the Stripe price differs from the page', async () => {
    retrievePrice.mockImplementation(async (id: string) => ({ id, active: true, currency: 'gbp', unit_amount: 1200 }));
    expect((await post({ product: 'glasgow-2027-guide', consent: true })).status).toBe(500);
    expect(create).not.toHaveBeenCalled();
  });

  it('turns on Stripe Tax only when the flag says so', async () => {
    process.env.SHOP_TAX_ENABLED = 'true';
    await post({ product: 'glasgow-2027-guide', consent: true });
    expect((create.mock.calls[0][0] as Record<string, any>).automatic_tax).toEqual({ enabled: true });
  });

  it('rejects a filled honeypot', async () => {
    expect((await post({ product: 'glasgow-2027-guide', consent: true, website: 'x' })).status).toBe(400);
  });
});
