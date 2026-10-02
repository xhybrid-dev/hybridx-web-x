import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fake-firestore';

/**
 * The download route is the only door to the files. It must refuse a
 * refunded order, an unknown token and a product the order does not include,
 * and it must stop at the configured limits.
 */

const db = new FakeFirestore();
const signed = vi.fn(async (path: string, filename: string) => `https://signed.example/${path}?as=${filename}`);

vi.mock('@/lib/firebase-admin', () => ({ adminFirestore: db, adminApp: {} }));
vi.mock('@/lib/email/service', () => ({ sendEmail: async () => {} }));
vi.mock('@/lib/shop/stripe', () => ({ getStripe: () => ({}), ShopNotConfiguredError: class extends Error {} }));
vi.mock('@/lib/shop/storage', () => ({ signedDownloadUrl: (p: string, f: string) => signed(p, f) }));

const { requestDownload } = await import('../shop/downloads');

const TOKEN = 'A'.repeat(31) + 'b';
const ORDER = 'cs_test_order0000001';

function seed(overrides: Record<string, unknown> = {}) {
  db.rawSet('shop_orders', ORDER, {
    status: 'paid',
    eventSlug: 'hyrox-glasgow-2027',
    email: 'buyer@example.com',
    files: ['glasgow-2027-guide'],
    items: [{ product: 'glasgow-2027-guide', priceId: 'price_guide', amount: 800 }],
    downloadToken: TOKEN,
    shortId: 'HX-ABCDEF',
    createdAt: new Date(),
    ...overrides,
  });
  for (const key of ['glasgow-2027-guide', 'glasgow-2027-pack']) {
    db.rawSet('shop_products', key, {
      name: key,
      currentVersion: 2,
      storagePath: `shop/${key}/v2.pdf`,
      filename: 'x.pdf',
      updatedAt: new Date(),
      changelog: [],
    });
  }
}

beforeEach(() => {
  db.reset();
  signed.mockClear();
  delete process.env.SHOP_DOWNLOAD_LIMIT_PER_PRODUCT_DAY;
  delete process.env.SHOP_DOWNLOAD_LIMIT_TOTAL;
});

const ask = (product = 'glasgow-2027-guide', token: unknown = TOKEN) =>
  requestDownload({ token, product, ip: '203.0.113.5' });

describe('requestDownload', () => {
  it('issues a signed URL for the current version with the configured filename, and records it', async () => {
    seed();
    const r = await ask();
    expect(r).toEqual({
      ok: true,
      url: 'https://signed.example/shop/glasgow-2027-guide/v2.pdf?as=HybridX-HYROX-Glasgow-2027-Guide.pdf',
    });
    const [rec] = db.all('shop_downloads');
    expect(rec.data).toMatchObject({ orderId: ORDER, product: 'glasgow-2027-guide', version: 2 });
    expect(rec.data.ipHash).toMatch(/^[0-9a-f]{32}$/);
    expect(rec.data.ipHash).not.toContain('203.0.113.5');
  });

  it('refuses a refunded order', async () => {
    seed({ status: 'refunded' });
    expect(await ask()).toMatchObject({ ok: false, status: 403 });
    expect(signed).not.toHaveBeenCalled();
  });

  it('refuses a disputed order', async () => {
    seed({ status: 'disputed' });
    expect(await ask()).toMatchObject({ ok: false, status: 403 });
  });

  it('refuses an unknown token', async () => {
    seed();
    expect(await ask('glasgow-2027-guide', 'B'.repeat(32))).toMatchObject({ ok: false, status: 404 });
    expect(await ask('glasgow-2027-guide', 'not a token')).toMatchObject({ ok: false, status: 404 });
    expect(await ask('glasgow-2027-guide', null)).toMatchObject({ ok: false, status: 404 });
  });

  it('refuses a product that is not in the order', async () => {
    seed();
    expect(await ask('glasgow-2027-pack')).toMatchObject({ ok: false, status: 403 });
  });

  it('refuses a product key that does not exist', async () => {
    seed();
    expect(await ask('glasgow-2027-bundle')).toMatchObject({ ok: false, status: 400 });
    expect(await ask('../secrets')).toMatchObject({ ok: false, status: 400 });
  });

  it('a bundle order can download both files', async () => {
    seed({ files: ['glasgow-2027-guide', 'glasgow-2027-pack'] });
    expect(await ask('glasgow-2027-guide')).toMatchObject({ ok: true });
    expect(await ask('glasgow-2027-pack')).toMatchObject({ ok: true });
  });

  it('returns 429 after the per-product daily limit', async () => {
    process.env.SHOP_DOWNLOAD_LIMIT_PER_PRODUCT_DAY = '3';
    seed();
    for (let i = 0; i < 3; i++) expect(await ask()).toMatchObject({ ok: true });
    expect(await ask()).toMatchObject({ ok: false, status: 429 });
    expect(db.all('shop_downloads')).toHaveLength(3);
  });

  it('downloads older than 24 hours do not count towards the daily limit', async () => {
    process.env.SHOP_DOWNLOAD_LIMIT_PER_PRODUCT_DAY = '2';
    seed();
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    for (let i = 0; i < 5; i++) db.rawAdd('shop_downloads', { orderId: ORDER, product: 'glasgow-2027-guide', at: old });
    expect(await ask()).toMatchObject({ ok: true });
  });

  it('returns 429 after the total limit, across products and days', async () => {
    process.env.SHOP_DOWNLOAD_LIMIT_TOTAL = '4';
    seed({ files: ['glasgow-2027-guide', 'glasgow-2027-pack'] });
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 3; i++) db.rawAdd('shop_downloads', { orderId: ORDER, product: 'glasgow-2027-guide', at: old });
    expect(await ask('glasgow-2027-pack')).toMatchObject({ ok: true });
    expect(await ask('glasgow-2027-pack')).toMatchObject({ ok: false, status: 429 });
  });

  it('says so when a file has not been uploaded yet', async () => {
    seed();
    db.store.get('shop_products')!.delete('glasgow-2027-guide');
    expect(await ask()).toMatchObject({ ok: false, status: 503 });
  });
});
