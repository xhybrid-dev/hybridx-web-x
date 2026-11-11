import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StrengthEngineTest from '@/components/calculators/StrengthEngineTest';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import { createMetadata } from '@/lib/seo';

// Docs: docs/content-engine-plan.md, step 8. The targets and the scoring are in
// src/lib/calculators/strength-engine.ts, pinned by Jon's worked examples in
// src/lib/__tests__/strength-engine.test.ts.

export const metadata: Metadata = createMetadata({
  title: 'HYROX Strength and Engine Test: What Holds You Back?',
  description:
    'Three lifts and a 5 km against your HYROX division: find out whether strength or your engine is the limiter, and get an eight-week focus. Free.',
  path: '/calculators/strength-engine-test',
});

export default function StrengthEngineTestPage() {
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
              Strength or engine: <span className="text-accent">what is holding you back?</span>
            </h1>
            <p className="mt-5 max-w-2xl font-body text-lg text-white/75">
              Three lifts and your 5 km, measured against targets for your HYROX division. You find out which side to train for the next
              eight weeks, and what those weeks look like.
            </p>
          </div>
        </section>
        <div className="container mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
          <StrengthEngineTest />
          <div className="mx-auto max-w-2xl">
            <CalculatorCTA calculator="strength-engine-test" heading="Racing HYROX? Get the full 12 weeks" />
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
