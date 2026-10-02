import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SHOP_SUPPORT_EMAIL, type ShopEvent } from '@/lib/shop/config';
import { fulfilOrder, type FulfilResult } from '@/lib/shop/orders';

/**
 * Where Stripe sends the buyer after payment, for any event.
 *
 * Fulfils the order itself rather than waiting for the webhook, so the buyer
 * never sits on a spinner, then redirects to the download page. The webhook
 * does the same work for the buyer who closes the tab first.
 */
export default async function ShopThanks({ event, sessionId }: { event: ShopEvent; sessionId: string | undefined }) {
  let result: FulfilResult | { status: 'error' };
  try {
    result = await fulfilOrder(sessionId ?? '');
  } catch (err) {
    console.error('[shop] thanks page could not fulfil:', err instanceof Error ? err.message : String(err));
    result = { status: 'error' };
  }

  // Outside the try: redirect() works by throwing.
  if (result.status === 'fulfilled') redirect(`/d/${result.token}`);

  let heading: string;
  let body: React.ReactNode;
  if (result.status === 'not_paid') {
    heading = 'Your payment is being processed';
    body = (
      <p>
        Stripe has not confirmed the payment yet. As soon as it does, your download link is emailed to you. This
        usually takes a few minutes.
      </p>
    );
  } else if (result.status === 'error') {
    heading = 'Your order is being prepared';
    body = (
      <p>
        We could not open your download page just now. If your payment went through, the link is emailed to you
        shortly. If it has not arrived within an hour, <Link href="/resend" className="underline underline-offset-4">request it again</Link> or
        email <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="underline underline-offset-4">{SHOP_SUPPORT_EMAIL}</a>.
      </p>
    );
  } else {
    heading = 'Order not found';
    body = (
      <p>
        This link does not match an order. If you have paid, your download link is in your email, or you
        can <Link href="/resend" className="underline underline-offset-4">request it again</Link>.
      </p>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-grow px-4 py-12 sm:px-6 md:py-16">
        <h1 className="mb-4 font-headline text-3xl font-bold">{heading}</h1>
        <div className="space-y-4 text-muted-foreground">{body}</div>
        <p className="mt-8">
          <Link href={event.path} className="font-medium underline underline-offset-4">
            Back to {event.name}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
