import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeekPlanner from '@/components/calculators/WeekPlanner';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import { createMetadata } from '@/lib/seo';

// Docs: docs/content-engine-plan.md, step 5. The rules are in
// src/lib/calculators/week-planner.ts and tested for every combination.

export const metadata: Metadata = createMetadata({
  title: 'Hybrid Training Week Planner: Running and Lifting',
  description:
    'Plan a 3, 4 or 5-day week of running and strength for HYROX, ATHX or a faster 10k. Free, built on HybridX coaching rules, with a calendar file.',
  path: '/calculators/week-planner',
});

export default function WeekPlannerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-neutral-900 to-black py-14 text-white md:py-20">
          <div className="container mx-auto max-w-5xl px-6">
            <nav aria-label="Breadcrumb" className="mb-5 font-body text-sm text-white/70">
              <Link href="/calculators" className="hover:text-white">
                Calculators
              </Link>
            </nav>
            <h1 className="font-headline text-3xl font-extrabold leading-tight md:text-5xl">
              Plan your <span className="text-accent">running and lifting</span> week
            </h1>
            <p className="mt-5 max-w-2xl font-body text-lg text-white/75">
              Pick your days, your goal, your kit and your long-run day. You get a week where the hard sessions never land on top of
              each other: strength before running, and a full day between heavy legs and a hard run.
            </p>
          </div>
        </section>
        <div className="container mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
          <WeekPlanner />
          <div className="mx-auto max-w-2xl">
            <CalculatorCTA calculator="week-planner" heading="Racing HYROX? Get the full 12 weeks" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
