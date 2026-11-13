import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { APP } from '@/lib/facts';
import { SHOP_SUPPORT_EMAIL as CONTACT_EMAIL } from '@/lib/shop/config';

/*
 * DRAFT for Jon's review.
 *
 * Terms of use for hybridx.club as a whole. Purchases have their own terms at
 * /shop-terms and data has the privacy policy; this page points to both rather
 * than repeating them, so the three cannot drift apart. Written with the
 * Consumer Rights Act 2015 and the Electronic Commerce Regulations 2002 in
 * mind, but not checked by a lawyer.
 *
 * Prices and trial lengths are deliberately absent: they live in
 * src/lib/facts/product.ts and on /app, and facts.test.ts holds the site to
 * them. Edit this page, bump '/terms' in src/lib/page-dates.ts and the date
 * below in the same commit.
 */

export const metadata: Metadata = {
  title: 'Terms of use',
  description:
    'The terms for using hybridx.club: our free plans, guides and calculators, training at your own risk, your emails from us, and what you may do with our content.',
  alternates: { canonical: 'https://hybridx.club/terms' },
};

const h2 = 'mb-2 mt-8 font-headline text-xl font-bold text-foreground';
const link = 'underline underline-offset-4';
const appHost = new URL(APP.url).host;

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 py-12 sm:px-6 md:py-16">
        <h1 className="font-headline text-3xl font-bold">Terms of use</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 13 November 2026</p>

        <div className="space-y-4 text-muted-foreground">
          <h2 id="about" className={h2}>
            About these terms
          </h2>
          <p>
            These terms cover your use of hybridx.club, run by HybridX. By using the site you accept them. If you do
            not, please do not use the site. Contact:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <p>Some parts of what we offer have terms of their own, which apply alongside these:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Buying a download from us is covered by our{' '}
              <Link href="/shop-terms" className={link}>
                shop terms
              </Link>
              .
            </li>
            <li>
              The HybridX app at {appHost} is a separate service. Your subscription, billing and cancellation are
              covered by the terms you accept when you sign up there.
            </li>
            <li>
              Our apps for UNA Watch are supplied through the UNA app store, on its terms. Our paperback plans are
              sold by Amazon, on its terms.
            </li>
            <li>
              How we use your personal information is set out in our{' '}
              <Link href="/privacy-policy" className={link}>
                privacy policy
              </Link>
              .
            </li>
          </ul>

          <h2 id="training" className={h2}>
            Training at your own risk
          </h2>
          <p>
            Everything on this site, including our plans, guides, calculators and emails, is general training
            information. It is not medical advice and it is not written for you personally. It cannot take account of
            your health, your injuries or your fitness.
          </p>
          <p>
            Check with a doctor or another qualified professional before you start a new programme, especially if
            you are pregnant, have an injury or a health condition, or have not trained for a while. Stop and get
            help if you feel pain, dizziness or shortness of breath beyond what you would expect from hard training.
            Pain and injury are for a professional, not for a training plan.
          </p>
          <p>
            You are responsible for training safely: warming up, using equipment you know how to use, and choosing
            loads and paces you can manage. No plan can guarantee a result, a race time or weight loss, and ours do
            not.
          </p>

          <h2 id="tools" className={h2}>
            Calculators and tools
          </h2>
          <p>
            Our calculators give estimates from the numbers you enter and from published formulas. They can be wrong,
            and they are only as good as what you put in. Use them as a guide, not as a measurement. Race and pacing
            tools describe events as we understand their current rules. Always check the official rules for your own
            event.
          </p>

          <h2 id="guides" className={h2}>
            Our guides
          </h2>
          <p>
            Our guides are drafted with the help of AI and reviewed by a HybridX trainer before they are published.{' '}
            <Link href="/guides/how-we-write" className={link}>
              How our guides are written
            </Link>{' '}
            explains the process. We work to keep them accurate and up to date, but we cannot promise that every
            detail is correct, complete or current. If you spot a mistake, please tell us.
          </p>

          <h2 id="emails" className={h2}>
            Free plans and emails
          </h2>
          <p>
            When you ask for a free plan or guide, we email it to you and may send you further training emails. Every
            email has an unsubscribe link, and you can leave at any time. Please give an email address that is your
            own. Free downloads are for your personal use, on the same terms as the rest of our content below.
          </p>

          <h2 id="content" className={h2}>
            Our content and what you may do with it
          </h2>
          <p>
            The text, plans, tables, images, designs and software on this site belong to HybridX or to the people
            who license them to us. You may read, print and use them for your own training, and share a link to any
            page.
          </p>
          <p>
            You may not copy, sell, republish or redistribute our plans, downloads or guides, in whole or in large
            part, or present them as your own. A coach who wants to use our material with athletes should email us
            first. Quoting a short passage with a link back to the page is fine.
          </p>

          <h2 id="use" className={h2}>
            Using the site fairly
          </h2>
          <p>Please do not:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>sign other people up to our emails, or submit our forms automatically or in bulk;</li>
            <li>share private download links publicly, or try to get around download limits;</li>
            <li>try to break into, overload or interfere with the site or the services it runs on;</li>
            <li>use the site to break the law, or to send anything abusive, misleading or harmful to us.</li>
          </ul>
          <p>We may block access, or remove someone from our lists, where these terms are broken.</p>

          <h2 id="availability" className={h2}>
            Changes and availability
          </h2>
          <p>
            We may change, pause or remove any page, tool or free offer at any time. We try to keep the site running,
            but we do not promise it will always be available or free of errors.
          </p>

          <h2 id="links" className={h2}>
            Links to other sites
          </h2>
          <p>
            We link to other websites, such as event organisers, Amazon and the UNA app store. We do not control
            them and are not responsible for their content or how they use your information.
          </p>

          <h2 id="independence" className={h2}>
            Independence
          </h2>
          <p>
            HybridX is independent. We are not affiliated with, sponsored or endorsed by HYROX or ATHX. HYROX® is a
            registered trademark of HYROX GmbH. We use event names only to describe the events our training is for.
          </p>

          <h2 id="liability" className={h2}>
            Our responsibility to you
          </h2>
          <p>
            We are responsible for loss or damage you suffer that is a foreseeable result of our breaking these terms
            or failing to use reasonable care and skill. We are not responsible for loss or damage that was not
            foreseeable. The site is for personal use, so we are not responsible for any business loss.
          </p>
          <p>
            Most of what we offer here is free. Except as set out below, our total responsibility to you for anything
            arising from your use of the free parts of the site is limited to £100.
          </p>
          <p>
            Nothing in these terms limits or excludes our responsibility for death or personal injury caused by our
            negligence, for fraud, or for anything else the law does not allow us to limit. These terms do not affect
            your legal rights as a consumer.
          </p>

          <h2 id="changes" className={h2}>
            Changes to these terms
          </h2>
          <p>
            We may update these terms from time to time. The date at the top of this page shows when they last
            changed, and the version on this page when you use the site is the one that applies.
          </p>

          <h2 id="law" className={h2}>
            Law and disputes
          </h2>
          <p>
            These terms are governed by the law of England and Wales. You may bring proceedings in the courts of
            England and Wales, or in the courts of the part of the UK where you live. If you have a problem, please
            email us first at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
              {CONTACT_EMAIL}
            </a>{' '}
            and we will try to sort it out.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
