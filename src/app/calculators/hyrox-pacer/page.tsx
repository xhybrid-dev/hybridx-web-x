import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HyroxPacer, { type PackOffer } from '@/components/calculators/HyroxPacer';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import { createMetadata } from '@/lib/seo';
import { formatPence, getShopEvent } from '@/lib/shop/config';
import { salesState } from '@/lib/shop/env';

// Docs: docs/content-engine-plan.md, step 9. The profiles and the arithmetic are
// in src/lib/hyrox-pacing.ts, shared with the Glasgow Pacing Pack's preview.

// Built ahead of time and refreshed hourly, so the Pacing Pack offer appears
// and disappears with its sales window without a deploy.
export const revalidate = 3600;

export const metadata: Metadata = createMetadata({
  title: 'HYROX Pace Calculator: Every Run and Station Split',
  description:
    'Free HYROX pacer: pick your division and target finish, and get every run and station split, the Roxzone budget and the clock at halfway.',
  path: '/calculators/hyrox-pacer',
});

/** The Pacing Pack, while it is on sale. */
function packOffer(): PackOffer | null {
  const event = getShopEvent('hyrox-glasgow-2027');
  const offer = event?.offers.find((o) => o.key === 'glasgow-2027-pack');
  if (!event || !offer || salesState(event) !== 'open') return null;
  return { href: `${event.path}#buy`, price: formatPence(offer.pricePence), name: offer.name };
}

export default function HyroxPacerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-neutral-900 to-black py-14 text-white md:py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <nav aria-label="Breadcrumb" className="mb-5 font-body text-sm text-white/70">
              <Link href="/calculators" className="hover:text-white">
                Calculators
              </Link>
            </nav>
            <h1 className="font-headline text-3xl font-extrabold leading-tight md:text-5xl">
              HYROX pacer: <span className="text-accent">every split</span> for your target time
            </h1>
            <p className="mt-5 max-w-2xl font-body text-lg text-white/75">
              Pick your division and the finish you are aiming for. You get all eight runs, all eight stations, the Roxzone and the clock
              at halfway, so you know before the start what each part of the race should cost you.
            </p>
          </div>
        </section>
        <div className="container mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
          <HyroxPacer pack={packOffer()} />
          <div className="mx-auto max-w-2xl">
            <CalculatorCTA calculator="hyrox-pacer" heading="Now train for that time" />
          </div>
          <p className="mt-10 text-center font-body text-xs text-muted-foreground">
            HybridX is independent and not affiliated with, sponsored or endorsed by HYROX.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
