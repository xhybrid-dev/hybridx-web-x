import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import LogoutButton from '../leads/LogoutButton';
import { loadReportOrders } from '@/lib/shop/report-data';
import {
  buildReport, countryLabel, percent, pounds, UK_VAT_THRESHOLD_PENCE,
  type Figures, type Jurisdiction,
} from '@/lib/shop/vat-report';

export const dynamic = 'force-dynamic';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LABELS: Record<Jurisdiction, string> = { UK: 'United Kingdom', EU: 'European Union', Other: 'Rest of world', Unknown: 'Country not recorded' };
const ORDER: Jurisdiction[] = ['UK', 'EU', 'Other', 'Unknown'];

const th = 'py-2 pr-4 font-medium';
const num = 'py-2 pr-4 text-right tabular-nums';

function monthLabel(m: string) {
  return new Date(`${m}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; test?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const q = await searchParams;
  const from = q.from && DAY.test(q.from) ? q.from : undefined;
  const to = q.to && DAY.test(q.to) ? q.to : undefined;
  const includeTest = q.test === '1';

  const { orders, truncated } = await loadReportOrders();
  const r = buildReport(orders, { from, to, includeTest });
  const cell = (f: Figures) => (f.orders ? pounds(f.net) : '–');

  const eu = r.byJurisdiction.EU;
  const thresholdShare = r.last12Months.net / UK_VAT_THRESHOLD_PENCE;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-headline font-bold text-primary">Shop sales by country</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {session.email}. Where sales come from, for deciding what to do about VAT.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/leads">Leads</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/admin/shop/export${includeTest ? '?test=1' : ''}`}>
                <Download className="mr-2 h-4 w-4" /> Export orders CSV
              </a>
            </Button>
            <LogoutButton />
          </div>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-4 text-sm">
          <label className="grid gap-1">
            <span className="text-muted-foreground">From</span>
            <input type="date" name="from" defaultValue={from} className="h-10 rounded-md border border-input bg-background px-3" />
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground">To</span>
            <input type="date" name="to" defaultValue={to} className="h-10 rounded-md border border-input bg-background px-3" />
          </label>
          <label className="flex h-10 items-center gap-2">
            <input type="checkbox" name="test" value="1" defaultChecked={includeTest} className="h-4 w-4" />
            Include Stripe test orders
          </label>
          <Button type="submit" variant="outline">Apply</Button>
          {(from || to || includeTest) && (
            <Button variant="ghost" asChild>
              <Link href="/admin/shop">Clear</Link>
            </Button>
          )}
        </form>

        {r.total.orders === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No sales{from || to ? ' in this range' : ' yet'}.
              {r.testOrdersLeftOut > 0 && ` ${r.testOrdersLeftOut} Stripe test order${r.testOrdersLeftOut === 1 ? ' is' : 's are'} left out.`}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardDescription>Net sales</CardDescription><CardTitle className="text-2xl tabular-nums">{pounds(r.total.net)}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">{r.total.orders} order{r.total.orders === 1 ? '' : 's'}</CardContent></Card>
              {(['UK', 'EU', 'Other'] as const).map((j) => (
                <Card key={j}><CardHeader className="pb-2"><CardDescription>{LABELS[j]}</CardDescription><CardTitle className="text-2xl tabular-nums">{percent(r.share[j])}</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{pounds(r.byJurisdiction[j].net)} · {r.byJurisdiction[j].orders} order{r.byJurisdiction[j].orders === 1 ? '' : 's'}</CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>What to look at</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  {r.firstEuSale
                    ? <>EU sales: <strong>{eu.orders}</strong> order{eu.orders === 1 ? '' : 's'}, <strong>{pounds(eu.net)}</strong>, {percent(r.share.EU)} of sales. The first was on <strong>{r.firstEuSale.date}</strong> (order {r.firstEuSale.shortId}). No EU VAT has been charged on {eu.orders === 1 ? 'it' : 'them'}.</>
                    : <>No EU sales in this range.</>}
                </p>
                <p>
                  Shop sales in the last 12 months: <strong>{pounds(r.last12Months.net)}</strong>, {percent(thresholdShare)} of the {pounds(UK_VAT_THRESHOLD_PENCE)} UK VAT registration threshold. The threshold applies to all of your taxable turnover, so this is only the shop&apos;s part of it.
                </p>
                {r.evidenceFlags.length > 0 && (
                  <p>
                    <strong>{r.evidenceFlags.length}</strong> order{r.evidenceFlags.length === 1 ? ' has' : 's have'} contradictory or missing location evidence. They are listed below.
                  </p>
                )}
                {r.total.tax > 0 && <p>Tax charged so far: {pounds(r.total.tax)}.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>By region</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-muted-foreground">
                    <th className={th}>Region</th><th className={`${th} text-right`}>Orders</th><th className={`${th} text-right`}>Net sales</th><th className={`${th} text-right`}>Share</th>
                  </tr></thead>
                  <tbody>
                    {ORDER.map((j) => (
                      <tr key={j} className="border-b border-border/50">
                        <td className="py-2 pr-4">{LABELS[j]}</td>
                        <td className={num}>{r.byJurisdiction[j].orders}</td>
                        <td className={num}>{pounds(r.byJurisdiction[j].net)}</td>
                        <td className={num}>{percent(r.share[j])}</td>
                      </tr>
                    ))}
                    <tr className="font-medium"><td className="py-2 pr-4">Total</td><td className={num}>{r.total.orders}</td><td className={num}>{pounds(r.total.net)}</td><td className={num}>100%</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>By country</CardTitle><CardDescription>Largest first. A sale is attributed to the country two pieces of evidence agree on, otherwise to the billing country.</CardDescription></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-muted-foreground">
                    <th className={th}>Country</th><th className={th}>Region</th><th className={`${th} text-right`}>Orders</th><th className={`${th} text-right`}>Net sales</th>
                  </tr></thead>
                  <tbody>
                    {r.byCountry.map((c) => (
                      <tr key={c.country ?? 'none'} className="border-b border-border/50">
                        <td className="py-2 pr-4">{countryLabel(c.country)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{c.jurisdiction === 'Unknown' ? '–' : c.jurisdiction}</td>
                        <td className={num}>{c.orders}</td>
                        <td className={num}>{pounds(c.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>By month</CardTitle><CardDescription>Net sales, in UK time.</CardDescription></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-muted-foreground">
                    <th className={th}>Month</th><th className={`${th} text-right`}>UK</th><th className={`${th} text-right`}>EU</th><th className={`${th} text-right`}>Rest of world</th><th className={`${th} text-right`}>Not recorded</th><th className={`${th} text-right`}>Total</th>
                  </tr></thead>
                  <tbody>
                    {r.byMonth.map((m) => (
                      <tr key={m.month} className="border-b border-border/50">
                        <td className="py-2 pr-4">{monthLabel(m.month)}</td>
                        <td className={num}>{cell(m.UK)}</td><td className={num}>{cell(m.EU)}</td><td className={num}>{cell(m.Other)}</td><td className={num}>{cell(m.Unknown)}</td>
                        <td className={`${num} font-medium`}>{pounds(m.total.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {r.evidenceFlags.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Orders to check</CardTitle><CardDescription>Billing, card and IP country disagree, or none was recorded. Look the order up in Stripe by its reference.</CardDescription></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left text-muted-foreground">
                      <th className={th}>Order</th><th className={th}>Date</th><th className={th}>Billing</th><th className={th}>Card</th><th className={th}>IP</th><th className={`${th} text-right`}>Paid</th>
                    </tr></thead>
                    <tbody>
                      {r.evidenceFlags.map(({ order: o }) => (
                        <tr key={o.id} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono">{o.shortId}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{o.createdAt.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}</td>
                          <td className="py-2 pr-4">{o.billingCountry ?? '–'}</td><td className="py-2 pr-4">{o.cardCountry ?? '–'}</td><td className="py-2 pr-4">{o.ipCountry ?? '–'}</td>
                          <td className={num}>{pounds(o.amountTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="space-y-1 text-xs text-muted-foreground">
          {(r.refundedOrders.count > 0 || r.disputedOrders.count > 0) && (
            <p>
              Left out of the figures: {r.refundedOrders.count} fully refunded order{r.refundedOrders.count === 1 ? '' : 's'} ({pounds(r.refundedOrders.amount)}).
              {r.disputedOrders.count > 0 && ` Counted but disputed: ${r.disputedOrders.count} (${pounds(r.disputedOrders.amount)}).`}
            </p>
          )}
          {r.testOrdersLeftOut > 0 && !includeTest && <p>{r.testOrdersLeftOut} Stripe test-mode order{r.testOrdersLeftOut === 1 ? '' : 's'} left out. Tick &quot;Include Stripe test orders&quot; to see them.</p>}
          {truncated && <p>Showing the most recent 5,000 orders only.</p>}
          <p>
            This page does not calculate VAT. Rates differ by country, so use Stripe Tax or your accountant for that. Northern Ireland buyers share the GB country code and count as UK. App Hosting records no IP country, so billing and card country are normally the two pieces of evidence.
          </p>
        </div>
      </div>
    </div>
  );
}
