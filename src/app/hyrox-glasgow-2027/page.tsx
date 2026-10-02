import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BuyPanel from '@/components/shop/BuyPanel';
import PreviewGallery from '@/components/shop/PreviewGallery';
import ShopViewEvent from '@/components/shop/ShopViewEvent';
import { formatPence, getShopEvent, SHOP_CONSENT, SHOP_SUPPORT_EMAIL, type ShopEvent } from '@/lib/shop/config';
import { salesState } from '@/lib/shop/env';
import { createBreadcrumbSchema } from '@/lib/seo';

/*
 * HYROX Glasgow 2027: the shop's first event.
 *
 * Machinery (prices, Stripe, delivery) lives in src/lib/shop and is shared by
 * every event; this file is the event's content. Copy rules for shop pages:
 * UK English, plain and factual, no rhetorical questions, no exclamation
 * marks, no urgency devices, no testimonials, no em dashes. Every claim about
 * the PDFs here was checked against the PDFs themselves.
 *
 * Regenerated every five minutes so the page notices the sales close time.
 * The checkout route enforces that time exactly; this only decides what the
 * page shows.
 */
export const revalidate = 300;

const EVENT = getShopEvent('hyrox-glasgow-2027') as ShopEvent;
const PATH = EVENT.path;
const URL_ABS = `https://hybridx.club${PATH}`;
const TITLE = 'HYROX Glasgow 2027 training plan and split targets | HybridX';
const DESCRIPTION =
  'A 22-week training plan and split targets for HYROX Glasgow at the SEC, 10 to 14 March 2027. Two PDF downloads.';
const OG_IMAGE = `https://hybridx.club/shop/hyrox-glasgow-2027/og.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  // Kept out of search results until sales open, so a "not open yet" page is
  // never what somebody finds.
  const indexable = salesState(EVENT) !== 'not-open';
  return {
    // absolute: the layout's template would append "| HybridX Hub" to a title
    // that already ends with the brand.
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: URL_ABS },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: URL_ABS,
      title: TITLE,
      description: DESCRIPTION,
      siteName: 'HybridX',
      locale: 'en_GB',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'HYROX Glasgow 2027 race preparation guide cover' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [OG_IMAGE],
    },
  };
}

const offer = (key: string) => {
  const o = EVENT.offers.find((x) => x.key === key);
  if (!o) throw new Error(`Missing offer ${key}`);
  return o;
};
const GUIDE = offer('glasgow-2027-guide');
const PACK = offer('glasgow-2027-pack');
const BUNDLE = offer('glasgow-2027-bundle');

interface ProductCopy {
  key: string;
  heading: string;
  facts: string;
  points: string[];
}

const PRODUCTS: ProductCopy[] = [
  {
    key: GUIDE.key,
    heading: 'Preparation Guide',
    facts: `${formatPence(GUIDE.pricePence)}. PDF, 16 pages, A4. Covers Open and Doubles.`,
    points: [
      'The race format, station order and the 2026/27 rules that cost the most time.',
      'A 22-week plan from 12 October 2026 to race week, with five sessions a week in four phases.',
      'Benchmark tests in weeks 1, 9 and 17, and race simulations in weeks 9, 12, 16 and 18.',
      'Technique and pacing for each of the eight stations.',
      'Nutrition for training, the two days before the race and race day.',
      'Race week countdown, warm-up and practical points for Glasgow.',
      'Checklists and logs to print.',
    ],
  },
  {
    key: PACK.key,
    heading: 'Pacing Pack',
    facts: `${formatPence(PACK.pricePence)}. PDF, 10 pages, A4. Covers Open, Pro and Doubles.`,
    points: [
      'Split targets for every run and station at 40 target finish times across seven divisions.',
      'A worksheet that predicts your finish time from your 5 km time and benchmark tests of each station.',
      'Four cut-out race cards showing the clock time at the end of each segment, one filled in as an example.',
      'An after-race review to compare target and actual splits.',
    ],
  },
];

function productSchema(name: string, description: string, pricePence: number, image: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    brand: { '@type': 'Brand', name: 'HybridX' },
    offers: {
      '@type': 'Offer',
      price: (pricePence / 100).toFixed(2),
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: URL_ABS,
      seller: { '@type': 'Organization', name: 'HybridX', url: 'https://hybridx.club' },
    },
  };
}

export default function HyroxGlasgow2027Page() {
  const state = salesState(EVENT);

  const schemas = [
    productSchema(
      GUIDE.name,
      'A 16-page PDF: a 22-week HYROX training plan for Glasgow 2027, station technique, nutrition and race week logistics.',
      GUIDE.pricePence,
      'https://hybridx.club/shop/hyrox-glasgow-2027/guide-1.webp',
    ),
    productSchema(
      PACK.name,
      'A 10-page PDF: split targets for every run and station at 40 finish times across seven divisions, a finish time worksheet and race cards.',
      PACK.pricePence,
      'https://hybridx.club/shop/hyrox-glasgow-2027/pack-1.webp',
    ),
    productSchema(
      BUNDLE.name,
      'Both PDFs: the Preparation Guide and the Pacing Pack for HYROX Glasgow 2027.',
      BUNDLE.pricePence,
      'https://hybridx.club/shop/hyrox-glasgow-2027/guide-1.webp',
    ),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'HYROX Glasgow 2027', url: PATH },
    ]),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <ShopViewEvent event={EVENT.slug} />
      <Header />

      <main className="flex-grow">
        <section className="bg-black py-12 text-white md:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="mb-3 font-headline text-sm font-semibold uppercase tracking-widest text-accent">
              SEC, Glasgow · 10 to 14 March 2027
            </p>
            <h1 className="mb-5 font-headline text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              HYROX Glasgow 2027 Preparation Guide and Pacing Pack
            </h1>
            <p className="max-w-3xl text-lg text-white/85">
              A 22-week training plan and split targets for HYROX Glasgow at the SEC, 10 to 14 March 2027. Two
              PDFs, sold separately or together. Download straight after payment. No account needed.
            </p>
            <p className="mt-6 text-white/85">
              Guide {formatPence(GUIDE.pricePence)} · Pacing Pack {formatPence(PACK.pricePence)} · Both{' '}
              {formatPence(BUNDLE.pricePence)}.{' '}
              <a
                href="#buy"
                className="font-semibold text-accent underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Go to buying options
              </a>
            </p>
          </div>
        </section>

        <section aria-labelledby="products" className="py-12 md:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 id="products" className="mb-8 font-headline text-2xl font-bold md:text-3xl">
              What is in each PDF
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {PRODUCTS.map((p) => (
                <article key={p.key} className="flex flex-col rounded-lg border border-border bg-card p-5 sm:p-6">
                  <h3 className="font-headline text-xl font-bold">{p.heading}</h3>
                  <p className="mt-1 font-medium">{p.facts}</p>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                    {p.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <h4 className="mb-2 text-sm font-semibold">Sample pages</h4>
                    <PreviewGallery title={p.heading} previews={EVENT.previews[p.key] ?? []} />
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-6 font-medium">
              Both: {formatPence(BUNDLE.pricePence)} for the Preparation Guide and the Pacing Pack together.
            </p>
          </div>
        </section>

        <section id="buy" aria-labelledby="buy-heading" className="scroll-mt-20 bg-secondary/60 py-12 md:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 id="buy-heading" className="mb-6 font-headline text-2xl font-bold md:text-3xl">
              Buying options
            </h2>
            <BuyPanel
              state={state}
              consentText={SHOP_CONSENT.text}
              options={[GUIDE, PACK, BUNDLE].map((o) => ({
                key: o.key,
                label: o.key === BUNDLE.key ? 'Guide and Pacing Pack' : o.label,
                price: formatPence(o.pricePence),
              }))}
            />
          </div>
        </section>

        <section aria-labelledby="method" className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="method" className="mb-4 font-headline text-2xl font-bold md:text-3xl">
              How the targets are made
            </h2>
            <p className="text-muted-foreground">
              The split targets use average run and station profiles for each division, scaled to the finish time
              you choose. They are not based on Glasgow results, and they are a planning guide, not a prediction of
              your result. The worksheet takes your 5 km time and fresh benchmark tests and gives a finish time with
              a range of 3 to 5 minutes either way.
            </p>
          </div>
        </section>

        <section aria-labelledby="info" className="border-t border-border py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="info" className="mb-6 font-headline text-2xl font-bold md:text-3xl">
              Information
            </h2>
            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="mb-1 font-headline text-lg font-bold text-foreground">Format and delivery</h3>
                <p>
                  PDF files. The download page is shown after payment and emailed to you, and the link keeps
                  working. If you lose it, <Link href="/resend" className="font-medium text-foreground underline underline-offset-4">request a new link</Link>.
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-headline text-lg font-bold text-foreground">Updates</h3>
                <p>{EVENT.policies.updates}</p>
              </div>
              <div>
                <h3 className="mb-1 font-headline text-lg font-bold text-foreground">Refunds</h3>
                <p>{EVENT.policies.refunds}</p>
              </div>
              <div>
                <h3 className="mb-1 font-headline text-lg font-bold text-foreground">Independence</h3>
                <p>
                  HybridX is independent. These products are not affiliated with, sponsored or endorsed by HYROX.
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-headline text-lg font-bold text-foreground">Questions</h3>
                <p>
                  Email{' '}
                  <a href={`mailto:${SHOP_SUPPORT_EMAIL}`} className="font-medium text-foreground underline underline-offset-4">
                    {SHOP_SUPPORT_EMAIL}
                  </a>
                  . Read the <Link href="/shop-terms" className="font-medium text-foreground underline underline-offset-4">shop terms</Link> and the{' '}
                  <Link href="/privacy-policy#purchases" className="font-medium text-foreground underline underline-offset-4">privacy policy</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
