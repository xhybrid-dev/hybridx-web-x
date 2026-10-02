import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SHOP_CONSENT, SHOP_SUPPORT_EMAIL } from '@/lib/shop/config';

/*
 * DRAFT for Jon's review (docs/shop-setup.md, "Before going live").
 *
 * Terms for the digital downloads sold on this site. Written to the Consumer
 * Rights Act 2015 and the Consumer Contracts Regulations 2013 as they apply to
 * digital content, but not checked by a lawyer. The refund wording should
 * match the "Refunds" policy in src/lib/shop/config.ts.
 */

export const metadata: Metadata = {
  title: 'Shop terms',
  description: 'Terms for buying digital downloads from HybridX: immediate supply, your personal-use licence, refunds and contact details.',
  alternates: { canonical: 'https://hybridx.club/shop-terms' },
};

const h2 = 'mb-2 mt-8 font-headline text-xl font-bold';

export default function ShopTermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 py-12 sm:px-6 md:py-16">
        <h1 className="font-headline text-3xl font-bold">Shop terms</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 2 October 2026</p>

        <div className="space-y-4 text-muted-foreground">
          <h2 className={`${h2} text-foreground`}>Who you are buying from</h2>
          <p>
            Downloads on hybridx.club are sold by HybridX. Contact:{' '}
            <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="underline underline-offset-4">
              {SHOP_SUPPORT_EMAIL}
            </a>
            . Payment is handled by Stripe.
          </p>

          <h2 className={`${h2} text-foreground`}>What you are buying</h2>
          <p>
            Digital content: PDF files, described on the page you bought from. Prices are in pounds sterling and
            are the total you pay. The contract is made when Stripe confirms your payment.
          </p>

          <h2 className={`${h2} text-foreground`}>Immediate supply and your right to cancel</h2>
          <p>
            You can normally cancel a purchase within 14 days. For digital content, that right ends once the
            download has started, if you agreed to that before buying. At checkout you are asked to confirm:
            &ldquo;{SHOP_CONSENT.text}&rdquo; We record that confirmation and the time you gave it, and the files
            are available straight away.
          </p>

          <h2 className={`${h2} text-foreground`}>Faulty files and refunds</h2>
          <p>
            If a file is faulty, will not open, or is not as described, tell us and we will replace it or refund
            you. This does not affect your legal rights. A refund ends access to the download page for that order.
          </p>

          <h2 className={`${h2} text-foreground`}>Your licence</h2>
          <p>
            You may download, print and use the files for your own training. You may not share, resell, upload or
            otherwise redistribute them, in whole or in part, or remove the HybridX name from them. A coach may
            use them with their own athletes only if each athlete buys their own copy. The files remain the
            property of HybridX.
          </p>

          <h2 className={`${h2} text-foreground`}>Download page and limits</h2>
          <p>
            Your download page keeps working after the event. To stop links being shared widely, each file can be
            downloaded a limited number of times a day. If you reach the limit, email us.
          </p>

          <h2 className={`${h2} text-foreground`}>Updates</h2>
          <p>
            Where we update a file, for example after a rule change, the new version appears on your download page
            at no charge. We do not promise that any particular update will be made.
          </p>

          <h2 className={`${h2} text-foreground`}>Training at your own risk</h2>
          <p>
            The files are general training guidance, not medical advice. Check with a qualified professional
            before starting a new programme if you have an injury or health condition. Nothing in these terms
            limits our liability where the law does not allow it to be limited.
          </p>

          <h2 className={`${h2} text-foreground`}>Independence</h2>
          <p>HybridX is independent. These products are not affiliated with, sponsored or endorsed by HYROX.</p>

          <h2 className={`${h2} text-foreground`}>Your data</h2>
          <p>
            How we use your order details is set out in the{' '}
            <Link href="/privacy-policy#purchases" className="underline underline-offset-4">
              privacy policy
            </Link>
            . These terms are governed by the law of England and Wales, and you may also bring proceedings in the
            courts of the part of the UK where you live.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
