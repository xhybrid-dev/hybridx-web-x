// src/lib/shop/vat-report.ts
//
// Where the shop's sales come from, for deciding what to do about VAT.
// Pure: takes orders, returns figures. The page and the CSV export both read
// from it, and src/lib/__tests__/shop-vat-report.test.ts holds it to the rules
// below.
//
// What it does NOT do is compute VAT. Rates differ by country and change, and
// the decision they feed (register for the EU One Stop Shop, move to a service
// that handles VAT, or stop selling to the EU) is not made from a rate table
// here. Stripe Tax or an accountant owns that number. This answers the question
// that comes first: how much of the shop is UK, how much EU, and when did the
// first EU sale happen.
//
// Counting rules:
//   - A fully refunded order is not a sale. It is counted separately and kept
//     out of every figure.
//   - A partly refunded order counts for what was kept.
//   - A disputed order counts, and is flagged: the money is in doubt, not gone.
//   - Stripe test-mode orders are left out unless asked for. Local testing
//     writes to the same database as the live site, so they are in there.

export type Jurisdiction = 'UK' | 'EU' | 'Other' | 'Unknown';

/** EU member states. Greece is GR in ISO 3166. */
export const EU_COUNTRIES: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

/**
 * The UK VAT area as far as a billing country can tell. Northern Ireland also
 * uses GB, and has its own VAT rules for some goods but not for downloads sold
 * to consumers, so it is treated as UK here.
 */
const UK_COUNTRIES: ReadonlySet<string> = new Set(['GB', 'IM']);

/** The UK registration threshold, for context beside the shop's own sales. */
export const UK_VAT_THRESHOLD_PENCE = 90_000 * 100;

export function jurisdictionOf(country: string | null): Jurisdiction {
  if (!country) return 'Unknown';
  const c = country.toUpperCase();
  if (UK_COUNTRIES.has(c)) return 'UK';
  if (EU_COUNTRIES.has(c)) return 'EU';
  return 'Other';
}

export interface ReportOrder {
  id: string;
  shortId: string;
  createdAt: Date;
  status: 'paid' | 'refunded' | 'disputed';
  livemode: boolean;
  /** Offer keys, for the CSV. */
  items: string[];
  /** Pence. */
  amountTotal: number;
  amountTax: number;
  amountRefunded: number;
  billingCountry: string | null;
  cardCountry: string | null;
  ipCountry: string | null;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type EvidenceState =
  /** Two or more pieces name the same country. What the EU scheme asks for. */
  | 'confirmed'
  /** One piece only. Usual here: App Hosting sends no IP country, so billing and card are the pair. */
  | 'single'
  /** Two or more pieces, all different. Needs a look before relying on it. */
  | 'conflict'
  | 'none';

export interface Evidence {
  state: EvidenceState;
  /** The country the sale is attributed to. */
  country: string | null;
}

const norm = (c: string | null) => (c ? c.trim().toUpperCase() || null : null);

/**
 * Two non-contradictory pieces of location evidence are what the EU
 * non-Union scheme asks a seller to hold. Billing address, card country and IP
 * country are the three this shop records.
 *
 * The sale is attributed to the country two pieces agree on, else to billing,
 * else card, else IP.
 */
export function assessEvidence(o: Pick<ReportOrder, 'billingCountry' | 'cardCountry' | 'ipCountry'>): Evidence {
  const pieces = [norm(o.billingCountry), norm(o.cardCountry), norm(o.ipCountry)].filter(
    (c): c is string => c !== null,
  );
  const counts = new Map<string, number>();
  for (const c of pieces) counts.set(c, (counts.get(c) ?? 0) + 1);
  const agreed = [...counts.entries()].find(([, n]) => n >= 2)?.[0] ?? null;
  const fallback = norm(o.billingCountry) ?? norm(o.cardCountry) ?? norm(o.ipCountry);

  if (agreed) return { state: 'confirmed', country: agreed };
  if (pieces.length === 0) return { state: 'none', country: null };
  if (pieces.length === 1) return { state: 'single', country: fallback };
  return { state: 'conflict', country: fallback };
}

// ---------------------------------------------------------------------------
// Dates (UK time, so a sale at 00:30 BST on 1 April is April)
// ---------------------------------------------------------------------------

const LONDON_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' });

/** YYYY-MM-DD in UK time. */
export function ukDay(d: Date): string {
  return LONDON_DAY.format(d);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface Figures {
  orders: number;
  /** Pence paid, before partial refunds. */
  gross: number;
  /** Pence of partial refunds. */
  refunded: number;
  /** gross - refunded. */
  net: number;
  /** Pence of tax charged. Zero while Stripe Tax is off. */
  tax: number;
}

const zero = (): Figures => ({ orders: 0, gross: 0, refunded: 0, net: 0, tax: 0 });

function add(f: Figures, o: ReportOrder) {
  const refunded = Math.min(o.amountRefunded || 0, o.amountTotal);
  f.orders += 1;
  f.gross += o.amountTotal;
  f.refunded += refunded;
  f.net += o.amountTotal - refunded;
  f.tax += o.amountTax || 0;
}

export interface CountryRow extends Figures {
  country: string | null;
  jurisdiction: Jurisdiction;
}

export interface MonthRow {
  /** YYYY-MM, UK time. */
  month: string;
  total: Figures;
  UK: Figures;
  EU: Figures;
  Other: Figures;
  Unknown: Figures;
}

export interface ReportOptions {
  /** Inclusive, YYYY-MM-DD in UK time. */
  from?: string;
  to?: string;
  includeTest?: boolean;
  now?: Date;
}

export interface VatReport {
  range: { from: string | null; to: string | null };
  /** Everything counted as a sale. */
  total: Figures;
  byJurisdiction: Record<Jurisdiction, Figures>;
  /** Share of net sales, 0 to 1. Zero when there are no sales. */
  share: Record<Jurisdiction, number>;
  byCountry: CountryRow[];
  byMonth: MonthRow[];
  /** Earliest counted EU sale, if any. The date the EU question started to matter. */
  firstEuSale: { date: string; shortId: string } | null;
  /** Counted orders whose location evidence is thin or contradictory. */
  evidenceFlags: Array<{ order: ReportOrder; evidence: Evidence }>;
  evidenceCounts: Record<EvidenceState, number>;
  refundedOrders: { count: number; amount: number };
  disputedOrders: { count: number; amount: number };
  testOrdersLeftOut: number;
  /** Shop sales in the 12 months to `now`, for context against the UK threshold. */
  last12Months: { net: number; thresholdPence: number };
}

const JURISDICTIONS: Jurisdiction[] = ['UK', 'EU', 'Other', 'Unknown'];

export function buildReport(all: ReportOrder[], opts: ReportOptions = {}): VatReport {
  const now = opts.now ?? new Date();
  const from = opts.from ?? null;
  const to = opts.to ?? null;

  let testOrdersLeftOut = 0;
  const inRange: ReportOrder[] = [];
  for (const o of all) {
    if (!o.livemode && !opts.includeTest) {
      testOrdersLeftOut += 1;
      continue;
    }
    const day = ukDay(o.createdAt);
    if (from && day < from) continue;
    if (to && day > to) continue;
    inRange.push(o);
  }

  const total = zero();
  const byJurisdiction = { UK: zero(), EU: zero(), Other: zero(), Unknown: zero() } as Record<Jurisdiction, Figures>;
  const countries = new Map<string, CountryRow>();
  const months = new Map<string, MonthRow>();
  const evidenceCounts: Record<EvidenceState, number> = { confirmed: 0, single: 0, conflict: 0, none: 0 };
  const evidenceFlags: VatReport['evidenceFlags'] = [];
  const refundedOrders = { count: 0, amount: 0 };
  const disputedOrders = { count: 0, amount: 0 };
  let firstEu: { date: string; shortId: string; at: number } | null = null;

  for (const o of inRange) {
    if (o.status === 'refunded') {
      refundedOrders.count += 1;
      refundedOrders.amount += o.amountTotal;
      continue;
    }
    if (o.status === 'disputed') {
      disputedOrders.count += 1;
      disputedOrders.amount += o.amountTotal;
    }

    const evidence = assessEvidence(o);
    const j = jurisdictionOf(evidence.country);
    evidenceCounts[evidence.state] += 1;
    // 'single' is expected while no IP country is recorded, so only conflict
    // and none are worth flagging as problems.
    if (evidence.state === 'conflict' || evidence.state === 'none') evidenceFlags.push({ order: o, evidence });

    add(total, o);
    add(byJurisdiction[j], o);

    const key = evidence.country ?? '';
    let row = countries.get(key);
    if (!row) countries.set(key, (row = { ...zero(), country: evidence.country, jurisdiction: j }));
    add(row, o);

    const month = ukDay(o.createdAt).slice(0, 7);
    let m = months.get(month);
    if (!m) {
      m = { month, total: zero(), UK: zero(), EU: zero(), Other: zero(), Unknown: zero() };
      months.set(month, m);
    }
    add(m.total, o);
    add(m[j], o);

    if (j === 'EU' && (!firstEu || o.createdAt.getTime() < firstEu.at)) {
      firstEu = { date: ukDay(o.createdAt), shortId: o.shortId, at: o.createdAt.getTime() };
    }
  }

  const share = { UK: 0, EU: 0, Other: 0, Unknown: 0 } as Record<Jurisdiction, number>;
  for (const j of JURISDICTIONS) share[j] = total.net > 0 ? byJurisdiction[j].net / total.net : 0;

  // The trailing year ignores the date range: it is context for the threshold,
  // not part of the range being looked at.
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  let last12 = 0;
  for (const o of all) {
    if (!o.livemode && !opts.includeTest) continue;
    if (o.status === 'refunded') continue;
    if (o.createdAt < yearAgo || o.createdAt > now) continue;
    last12 += o.amountTotal - Math.min(o.amountRefunded || 0, o.amountTotal);
  }

  return {
    range: { from, to },
    total,
    byJurisdiction,
    share,
    byCountry: [...countries.values()].sort((a, b) => b.net - a.net || (a.country ?? '').localeCompare(b.country ?? '')),
    byMonth: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
    firstEuSale: firstEu ? { date: firstEu.date, shortId: firstEu.shortId } : null,
    evidenceFlags: evidenceFlags.sort((a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime()),
    evidenceCounts,
    refundedOrders,
    disputedOrders,
    testOrdersLeftOut,
    last12Months: { net: last12, thresholdPence: UK_VAT_THRESHOLD_PENCE },
  };
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

/** "£1,234.50". Pence in. */
export function pounds(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function percent(share: number): string {
  return `${(share * 100).toFixed(share > 0 && share < 0.1 ? 1 : 0)}%`;
}

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en-GB'], { type: 'region' }) : null;

/** "Ireland (IE)", or "Not recorded". */
export function countryLabel(code: string | null): string {
  if (!code) return 'Not recorded';
  let name = code;
  try {
    name = regionNames?.of(code) ?? code;
  } catch {
    // An unknown code falls back to itself.
  }
  return name === code ? code : `${name} (${code})`;
}

// ---------------------------------------------------------------------------
// CSV, for an accountant
// ---------------------------------------------------------------------------

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  // A leading = + - @ would run as a formula when opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * One row per order, with the location evidence and no personal details: no
 * email, no name, no IP. The order reference is enough to find it in Stripe.
 */
export function ordersCsv(orders: ReportOrder[]): string {
  const header = [
    'Date (UK)', 'Order', 'Status', 'Mode', 'Items', 'Paid (GBP)', 'Refunded (GBP)', 'Tax charged (GBP)',
    'Billing country', 'Card country', 'IP country', 'Attributed country', 'Jurisdiction', 'Evidence',
  ];
  const rows = orders
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((o) => {
      const e = assessEvidence(o);
      return [
        ukDay(o.createdAt), o.shortId, o.status, o.livemode ? 'live' : 'test', o.items.join(' + '),
        (o.amountTotal / 100).toFixed(2), ((o.amountRefunded || 0) / 100).toFixed(2), ((o.amountTax || 0) / 100).toFixed(2),
        o.billingCountry ?? '', o.cardCountry ?? '', o.ipCountry ?? '', e.country ?? '', jurisdictionOf(e.country), e.state,
      ];
    });
  return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}
