import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReportOrder } from '../shop/vat-report';

/**
 * The admin page: signed-out visitors are sent to log in, and a signed-in
 * admin sees the figures the report computes.
 */

const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`);
});
let session: { email: string } | null = { email: 'owner@example.com' };
let orders: ReportOrder[] = [];

vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: unknown }) => ({ type: 'a', props: { href, children }, key: null, ref: null, $$typeof: Symbol.for('react.transitional.element') }) }));
vi.mock('@/lib/admin-auth', () => ({ getAdminSession: async () => session }));
vi.mock('@/lib/shop/report-data', () => ({ loadReportOrders: async () => ({ orders, truncated: false }) }));
vi.mock('@/app/admin/leads/LogoutButton', () => ({ default: () => null }));
vi.mock('../../app/admin/leads/LogoutButton', () => ({ default: () => null }));

const { default: Page } = await import('../../app/admin/shop/page');

function o(over: Partial<ReportOrder>): ReportOrder {
  return {
    id: Math.random().toString(36).slice(2), shortId: 'HX-TEST01', createdAt: new Date('2026-11-10T12:00:00Z'),
    status: 'paid', livemode: true, items: ['glasgow-2027-guide'], amountTotal: 800, amountTax: 0, amountRefunded: 0,
    billingCountry: 'GB', cardCountry: 'GB', ipCountry: null, ...over,
  };
}

const render = async (sp: Record<string, string> = {}) =>
  renderToStaticMarkup(await Page({ searchParams: Promise.resolve(sp) }));

describe('/admin/shop', () => {
  it('sends a signed-out visitor to the login page', async () => {
    session = null;
    await expect(render()).rejects.toThrow('REDIRECT /admin/login');
  });

  it('shows an empty state with no orders', async () => {
    session = { email: 'owner@example.com' };
    orders = [];
    expect(await render()).toContain('No sales yet');
  });

  it('shows the split, the first EU sale and the countries', async () => {
    session = { email: 'owner@example.com' };
    orders = [
      o({ amountTotal: 800 }), o({ amountTotal: 1200 }),
      o({ billingCountry: 'IE', cardCountry: 'IE', amountTotal: 500, shortId: 'HX-EU0001', createdAt: new Date('2026-11-12T12:00:00Z') }),
      o({ billingCountry: 'FR', cardCountry: 'GB', shortId: 'HX-CHECK1' }),
      o({ livemode: false, billingCountry: 'US', cardCountry: 'US' }),
    ];
    const html = await render();
    // 800 + 1200 + 500 + 800 pence, with the test-mode order left out.
    expect(html).toContain('£33.00');
    expect(html).toContain('4 orders');
    expect(html).toContain('Ireland (IE)');
    expect(html).toContain('France (FR)');
    // The French order is EU by billing country and earlier than the Irish one.
    expect(html).toContain('The first was on <strong>2026-11-10</strong> (order HX-CHECK1)');
    expect(html).toContain('Orders to check');
    expect(html).toContain('HX-CHECK1');
    expect(html).toContain('1 Stripe test-mode order left out');
    expect(html).toContain('does not calculate VAT');
  });

  it('includes test orders when asked', async () => {
    session = { email: 'owner@example.com' };
    orders = [o({}), o({ livemode: false, billingCountry: 'US', cardCountry: 'US' })];
    expect(await render({ test: '1' })).toContain('United States (US)');
  });

  it('ignores a malformed date range', async () => {
    session = { email: 'owner@example.com' };
    orders = [o({})];
    expect(await render({ from: 'not-a-date', to: '"><script>' })).not.toContain('<script>');
  });
});
