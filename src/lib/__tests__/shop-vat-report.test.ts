import { describe, it, expect } from 'vitest';
import {
  assessEvidence, buildReport, jurisdictionOf, ordersCsv, ukDay, type ReportOrder,
} from '../shop/vat-report';

/**
 * The VAT report decides what the shop owner does about EU VAT, so its rules
 * are pinned: what counts as a sale, how a country becomes UK / EU / Other,
 * and when location evidence is good enough.
 */

let n = 0;
function order(over: Partial<ReportOrder> = {}): ReportOrder {
  n += 1;
  return {
    id: `cs_test_${n}`, shortId: `HX-${String(n).padStart(6, '0')}`,
    createdAt: new Date('2026-11-10T12:00:00Z'), status: 'paid', livemode: true, items: ['glasgow-2027-guide'],
    amountTotal: 800, amountTax: 0, amountRefunded: 0,
    billingCountry: 'GB', cardCountry: 'GB', ipCountry: null, ...over,
  };
}

describe('jurisdictionOf', () => {
  it('maps countries to UK, EU, Other and Unknown', () => {
    expect(jurisdictionOf('GB')).toBe('UK');
    expect(jurisdictionOf('im')).toBe('UK');
    expect(jurisdictionOf('IE')).toBe('EU');
    expect(jurisdictionOf('GR')).toBe('EU');
    expect(jurisdictionOf('US')).toBe('Other');
    expect(jurisdictionOf('CH')).toBe('Other');
    expect(jurisdictionOf('NO')).toBe('Other');
    expect(jurisdictionOf(null)).toBe('Unknown');
  });
  it('knows all 27 EU states', async () => {
    const { EU_COUNTRIES } = await import('../shop/vat-report');
    expect(EU_COUNTRIES.size).toBe(27);
    expect(EU_COUNTRIES.has('GB')).toBe(false);
  });
});

describe('assessEvidence', () => {
  it('billing and card agreeing is confirmed', () => {
    expect(assessEvidence({ billingCountry: 'IE', cardCountry: 'IE', ipCountry: null })).toEqual({ state: 'confirmed', country: 'IE' });
  });
  it('two of three agreeing wins over the odd one out', () => {
    expect(assessEvidence({ billingCountry: 'GB', cardCountry: 'IE', ipCountry: 'IE' })).toEqual({ state: 'confirmed', country: 'IE' });
  });
  it('one piece only is single, attributed to it', () => {
    expect(assessEvidence({ billingCountry: 'DE', cardCountry: null, ipCountry: null })).toEqual({ state: 'single', country: 'DE' });
  });
  it('all different is a conflict, attributed to billing', () => {
    expect(assessEvidence({ billingCountry: 'FR', cardCountry: 'GB', ipCountry: 'US' })).toEqual({ state: 'conflict', country: 'FR' });
    expect(assessEvidence({ billingCountry: 'FR', cardCountry: 'GB', ipCountry: null }).state).toBe('conflict');
  });
  it('nothing recorded is none', () => {
    expect(assessEvidence({ billingCountry: null, cardCountry: null, ipCountry: null })).toEqual({ state: 'none', country: null });
  });
  it('ignores case and blanks', () => {
    expect(assessEvidence({ billingCountry: 'ie', cardCountry: ' IE ', ipCountry: '' }).state).toBe('confirmed');
  });
});

describe('buildReport', () => {
  const now = new Date('2026-12-01T12:00:00Z');

  it('splits sales into UK, EU and Other with shares of net sales', () => {
    const r = buildReport([
      order({ amountTotal: 800 }), order({ amountTotal: 800 }), order({ amountTotal: 1200 }),
      order({ billingCountry: 'IE', cardCountry: 'IE', amountTotal: 500 }),
      order({ billingCountry: 'US', cardCountry: 'US', amountTotal: 200 }),
    ], { now });
    expect(r.total).toMatchObject({ orders: 5, gross: 3500, net: 3500 });
    expect(r.byJurisdiction.UK).toMatchObject({ orders: 3, net: 2800 });
    expect(r.byJurisdiction.EU).toMatchObject({ orders: 1, net: 500 });
    expect(r.byJurisdiction.Other).toMatchObject({ orders: 1, net: 200 });
    expect(r.share.UK).toBeCloseTo(0.8, 5);
    expect(r.share.EU).toBeCloseTo(500 / 3500, 5);
  });

  it('lists countries by sales, largest first', () => {
    const r = buildReport([
      order(), order({ billingCountry: 'DE', cardCountry: 'DE' }), order({ billingCountry: 'DE', cardCountry: 'DE' }), order({ billingCountry: 'DE', cardCountry: 'DE' }),
    ], { now });
    expect(r.byCountry.map((c) => [c.country, c.orders])).toEqual([['DE', 3], ['GB', 1]]);
    expect(r.byCountry[0].jurisdiction).toBe('EU');
  });

  it('a fully refunded order is not a sale', () => {
    const r = buildReport([order({ amountTotal: 800 }), order({ status: 'refunded', amountTotal: 1200, amountRefunded: 1200 })], { now });
    expect(r.total).toMatchObject({ orders: 1, net: 800 });
    expect(r.refundedOrders).toEqual({ count: 1, amount: 1200 });
  });

  it('a partly refunded order counts for what was kept', () => {
    const r = buildReport([order({ amountTotal: 1200, amountRefunded: 400 })], { now });
    expect(r.total).toMatchObject({ gross: 1200, refunded: 400, net: 800 });
  });

  it('a disputed order counts and is reported', () => {
    const r = buildReport([order({ status: 'disputed', amountTotal: 800 })], { now });
    expect(r.total.net).toBe(800);
    expect(r.disputedOrders).toEqual({ count: 1, amount: 800 });
  });

  it('leaves test-mode orders out unless asked', () => {
    const orders = [order(), order({ livemode: false, billingCountry: 'IE', cardCountry: 'IE' })];
    const live = buildReport(orders, { now });
    expect(live.total.orders).toBe(1);
    expect(live.testOrdersLeftOut).toBe(1);
    expect(live.byJurisdiction.EU.orders).toBe(0);
    expect(buildReport(orders, { now, includeTest: true }).total.orders).toBe(2);
  });

  it('finds the first EU sale', () => {
    const r = buildReport([
      order({ billingCountry: 'FR', cardCountry: 'FR', createdAt: new Date('2026-11-20T10:00:00Z'), shortId: 'HX-LATER' }),
      order({ billingCountry: 'NL', cardCountry: 'NL', createdAt: new Date('2026-11-12T10:00:00Z'), shortId: 'HX-FIRST' }),
      order({ createdAt: new Date('2026-11-01T10:00:00Z') }),
    ], { now });
    expect(r.firstEuSale).toEqual({ date: '2026-11-12', shortId: 'HX-FIRST' });
    expect(buildReport([order()], { now }).firstEuSale).toBeNull();
  });

  it('flags conflicting or missing evidence, not single pieces', () => {
    const r = buildReport([
      order({ billingCountry: 'FR', cardCountry: 'GB', shortId: 'HX-CONFLICT' }),
      order({ billingCountry: null, cardCountry: null, shortId: 'HX-NONE' }),
      order({ cardCountry: null, shortId: 'HX-SINGLE' }),
      order({ shortId: 'HX-FINE' }),
    ], { now });
    expect(r.evidenceFlags.map((f) => f.order.shortId).sort()).toEqual(['HX-CONFLICT', 'HX-NONE']);
    expect(r.evidenceCounts).toEqual({ confirmed: 1, single: 1, conflict: 1, none: 1 });
    expect(r.byJurisdiction.Unknown.orders).toBe(1);
  });

  it('groups by month in UK time, newest first', () => {
    const r = buildReport([
      order({ createdAt: new Date('2026-10-31T23:30:00Z') }), // GMT from 25 Oct, so still 31 Oct
      order({ createdAt: new Date('2026-04-30T23:30:00Z'), billingCountry: 'IE', cardCountry: 'IE' }), // 00:30 BST on 1 May
      order({ createdAt: new Date('2026-11-05T12:00:00Z') }),
    ], { now });
    expect(r.byMonth.map((m) => m.month)).toEqual(['2026-11', '2026-10', '2026-05']);
    expect(r.byMonth[2].EU.orders).toBe(1);
  });

  it('applies the date range inclusively, in UK time', () => {
    const orders = [
      order({ createdAt: new Date('2026-11-01T12:00:00Z') }),
      order({ createdAt: new Date('2026-11-15T12:00:00Z') }),
      order({ createdAt: new Date('2026-11-30T12:00:00Z') }),
    ];
    expect(buildReport(orders, { now, from: '2026-11-15', to: '2026-11-30' }).total.orders).toBe(2);
    expect(buildReport(orders, { now, from: '2026-12-01' }).total.orders).toBe(0);
  });

  it('is well behaved with no orders', () => {
    const r = buildReport([], { now });
    expect(r.total.orders).toBe(0);
    expect(r.share).toEqual({ UK: 0, EU: 0, Other: 0, Unknown: 0 });
    expect(r.byCountry).toEqual([]);
  });

  it('reports the last twelve months for the UK threshold, ignoring the date range', () => {
    const r = buildReport([
      order({ amountTotal: 800, createdAt: new Date('2026-11-01T12:00:00Z') }),
      order({ amountTotal: 800, createdAt: new Date('2025-01-01T12:00:00Z') }),
      order({ amountTotal: 500, status: 'refunded', createdAt: new Date('2026-11-02T12:00:00Z') }),
    ], { now, from: '2026-11-15' });
    expect(r.last12Months).toEqual({ net: 800, thresholdPence: 9_000_000 });
  });

  it('counts tax charged', () => {
    expect(buildReport([order({ amountTax: 133 })], { now }).total.tax).toBe(133);
  });
});

describe('ordersCsv', () => {
  it('has one row per order, with evidence and no personal details', () => {
    const csv = ordersCsv([order({ billingCountry: 'IE', cardCountry: 'IE', shortId: 'HX-ABC123', amountTotal: 1200, items: ['a', 'b'] })]);
    const [head, row] = csv.split('\n');
    expect(head).toContain('Billing country');
    expect(row).toContain('HX-ABC123');
    expect(row).toContain('12.00');
    expect(row).toContain('IE,IE,,IE,EU,confirmed');
    expect(row).toContain('a + b');
    expect(csv.toLowerCase()).not.toContain('@');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(ordersCsv([order({ shortId: '=1+1' })])).toContain("'=1+1");
  });
});

describe('ukDay', () => {
  it('uses UK time across the clock change', () => {
    expect(ukDay(new Date('2026-04-30T23:30:00Z'))).toBe('2026-05-01');
    expect(ukDay(new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31');
  });
});
