import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DownloadButton from '@/components/shop/DownloadButton';
import { getShopEvent, getShopFile, SHOP_SUPPORT_EMAIL } from '@/lib/shop/config';
import { findOrderByToken, toDate } from '@/lib/shop/orders';
import { getProductDocs } from '@/lib/shop/products';
import { planPosition } from '@/lib/shop/glasgow-2027-pacing';

/*
 * A buyer's download page. The token in the URL is the only credential, so
 * the page is never cached, indexed or sent on as a referrer (middleware.ts),
 * is disallowed in robots.txt, and is recorded in analytics as /d/[token].
 *
 * Reads the current version of each file at request time, so an updated PDF
 * appears here for every past buyer as soon as it is uploaded.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your downloads',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

function planNote(now: Date): string {
  const p = planPosition(now);
  if (p.kind === 'before') return 'Week 1 of the plan starts on Monday 12 October 2026, with the first benchmark tests.';
  if (p.kind === 'after') return 'The plan finished with race week in March 2027.';
  return `This week is Week ${p.week} of the plan (${p.phase}). Section 03 of the guide has the sessions for it.`;
}

export default async function DownloadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findOrderByToken(token);
  if (!found) notFound();
  const { order } = found;
  const event = getShopEvent(order.eventSlug);

  const docs = order.status === 'paid' ? await getProductDocs(order.files) : new Map();
  const createdAt = toDate(order.createdAt);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 py-10 sm:px-6 md:py-14">
        <h1 className="font-headline text-3xl font-bold">Your downloads</h1>
        <p className="mt-2 text-muted-foreground">
          Order {order.shortId}
          {createdAt ? `, ${DATE.format(createdAt)}` : ''}
          {event ? `. ${event.name}.` : '.'}
        </p>

        {order.status !== 'paid' ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6" role="status">
            <p className="font-headline text-lg font-bold">
              {order.status === 'refunded' ? 'This order was refunded' : 'This order is under review'}
            </p>
            <p className="mt-2 text-muted-foreground">
              {order.status === 'refunded'
                ? 'The downloads for this order are no longer available.'
                : 'The payment for this order has been disputed, so its downloads are paused.'}{' '}
              If you think this is a mistake, email{' '}
              <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="underline underline-offset-4">
                {SHOP_SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6">
              Bookmark this page. It keeps working, and it shows any updated versions of your files.
            </p>
            <ul className="mt-8 space-y-6">
              {order.files.map((key) => {
                const file = getShopFile(key);
                const doc = docs.get(key);
                const updatedAt = doc ? toDate(doc.updatedAt) : null;
                const recent = doc ? [...doc.changelog].reverse().slice(0, 3) : [];
                return (
                  <li key={key} className="rounded-lg border border-border bg-card p-5 sm:p-6">
                    <h2 className="font-headline text-xl font-bold">{file?.name ?? key}</h2>
                    {doc ? (
                      <>
                        <p className="mt-1 text-muted-foreground">
                          Version {doc.currentVersion}
                          {updatedAt ? `, updated ${DATE.format(updatedAt)}` : ''}. PDF
                          {file ? `, ${file.pages} pages` : ''}.
                        </p>
                        {recent.length > 0 ? (
                          <div className="mt-3">
                            <h3 className="text-sm font-semibold">Changes</h3>
                            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {recent.map((c) => (
                                <li key={c.version}>
                                  Version {c.version}, {c.date}: {c.note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="mt-4">
                          <DownloadButton token={token} product={key} label={`Download ${file?.name ?? 'file'}`} />
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-muted-foreground">
                        This file is being prepared. Please check back shortly.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {event?.slug === 'hyrox-glasgow-2027' && order.files.includes('glasgow-2027-guide') ? (
              <p className="mt-8">{planNote(new Date())}</p>
            ) : null}
            {event && event.files.some((f) => !order.files.includes(f.key)) ? (
              <p className="mt-4 text-muted-foreground">
                {event.files
                  .filter((f) => !order.files.includes(f.key))
                  .map((f) => f.name)
                  .join(' and ')}{' '}
                is sold separately on the{' '}
                <Link href={`${event.path}#buy`} className="font-medium text-foreground underline underline-offset-4">
                  {event.name} page
                </Link>
                .
              </p>
            ) : null}
            <p className="mt-8 text-sm text-muted-foreground">
              Each download link lasts five minutes, so press the button again if one expires. If a file does not
              open or something looks wrong, email{' '}
              <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="underline underline-offset-4">
                {SHOP_SUPPORT_EMAIL}
              </a>{' '}
              or reply to your order email.
            </p>
          </>
        )}
        <p className="mt-8 text-sm">
          <Link href="/shop-terms" className="underline underline-offset-4">
            Shop terms
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
