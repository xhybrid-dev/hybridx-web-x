// src/lib/shop/report-data.ts
//
// Reads shop_orders for the VAT report. Server only.
//
// Reads the whole collection rather than a window: the shop sells tens of
// orders a month, so a year is a few hundred small documents, and the report's
// date range and test-mode filters are applied in vat-report.ts where they can
// be tested. The cap exists so a runaway collection cannot make an admin page
// slow; it is far above what the shop will reach.

import { adminFirestore } from '@/lib/firebase-admin';
import type { ReportOrder } from './vat-report';

export const REPORT_ORDER_LIMIT = 5000;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  return typeof maybe.toDate === 'function' ? maybe.toDate() : null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export async function loadReportOrders(): Promise<{ orders: ReportOrder[]; truncated: boolean }> {
  const snap = await adminFirestore
    .collection('shop_orders')
    .orderBy('createdAt', 'desc')
    .limit(REPORT_ORDER_LIMIT)
    .get();

  const orders: ReportOrder[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const createdAt = toDate(d.createdAt);
    if (!createdAt) continue;
    const status = d.status === 'refunded' || d.status === 'disputed' ? d.status : 'paid';
    orders.push({
      id: doc.id,
      shortId: str(d.shortId) ?? doc.id.slice(-8),
      createdAt,
      status,
      // Orders written before this field existed were live.
      livemode: d.livemode !== false,
      items: Array.isArray(d.items) ? d.items.map((i: { product?: unknown }) => String(i?.product ?? '')) : [],
      amountTotal: num(d.amountTotal),
      amountTax: num(d.amountTax),
      amountRefunded: num(d.amountRefunded),
      billingCountry: str(d.billingCountry),
      cardCountry: str(d.cardCountry),
      ipCountry: str(d.ipCountry),
    });
  }
  return { orders, truncated: snap.size >= REPORT_ORDER_LIMIT };
}
