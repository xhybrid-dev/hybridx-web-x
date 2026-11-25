
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import SocialProofSection from '@/components/SocialProofSection';
import AmazonBookPromotion from '@/components/AmazonBookPromotion';
import AppPromotion from '@/components/AppPromotion';
import FaqSection from '@/components/FaqSection';
import InstagramSection from '@/components/InstagramSection';
import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import ApparelPromotion from '@/components/ApparelPromotion';
import TrainingPlanShowcase from '@/components/TrainingPlanShowcase';
import FreeToolsSection from '@/components/FreeToolsSection';
import { createCourseSchema, createSpeakableSchema, OG_DEFAULTS, TWITTER_DEFAULTS } from '@/lib/seo';
import EntrySection from '@/components/plan-finder/EntrySection';
import PlanFinderRoot from '@/components/plan-finder/PlanFinderRoot';
import type { Variant } from '@/lib/plan-finder/tracker';

import JsonLd from '@/components/JsonLd';
export const homeMetadata: Metadata = {
  alternates: { canonical: '/' },
  title: { absolute: 'HybridX Hub | HYROX Training Plans & Coaching App' },
  description: 'HYROX and hybrid training plans, books, free calculators and a coaching app, from £5/month with a 14-day free trial.',
  keywords: [
    'hyrox',
    'hyrox training',
    'hyrox workout',
    'what is hyrox',
    'hyrox competition',
    'hyrox training plan',
    'hybrid training',
    'hybrid athlete',
    'training plans',
    'running training',
    'strength training',
    'fitness calculators',
    'hybrid training app',
  ],
  openGraph: {
    ...OG_DEFAULTS,
    title: 'HybridX Hub | HYROX Training Plans & Coaching App',
    description: 'HYROX and hybrid training plans, books, free calculators and a coaching app, from £5/month with a 14-day free trial.',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'HybridX Hub - Training Plans and Coaching App',
      },
    ],
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    card: 'summary_large_image',
    title: 'HybridX Hub | HYROX Training Plans & Coaching App',
    description: 'HYROX and hybrid training plans, books, free calculators and a coaching app, from £5/month with a 14-day free trial.',
    images: ['/og-default.png'],
  },
};

const courseSchemas = [
  createCourseSchema({
    name: 'HybridX 12-Week Hyrox Training Plan',
    description:
      'A free 12-week Hyrox training plan dated back from your race day, with beginner scaling and advanced challenges. Covers compromised running, all 8 race stations, and race-day strategy. RPE-based so it scales to your fitness level.',
    url: '/free-hyrox-plan',
    level: 'All levels',
  }),
  // Each Course is at the address that is that plan. They were three names for one
  // address (/free-hyrox-plan), two of them plans that page does not offer.
  createCourseSchema({
    name: 'HybridX 12-Week Running Plan for HYROX',
    description:
      'A free interactive 12-week running plan for HYROX athletes: threshold sessions, intervals, long runs and compromised running, with a built-in pace calculator.',
    url: '/12-week-running-hyrox',
    level: 'All levels',
  }),
];

const speakableSchema = createSpeakableSchema(['h1', 'h2', '#faq', '#social-proof']);

/**
 * The homepage. `planFinder` decides what sits around it (handover/entry-funnel/docs/03):
 *   'none'     the homepage alone, as before the plan finder
 *   'entry'    the plan finder's entry section in front of it, skippable
 *   'control'  the homepage alone, with the plan finder's tracker, as the
 *              experiment's control arm (no entry markup, no dialog)
 * Everything inside #hx-home is the same in all three.
 */
export default function HomePage({ planFinder, variant = null }: { planFinder: 'none' | 'entry' | 'control'; variant?: Variant | null }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Course schemas — each plan is a Course entity for AI search citations */}
      {courseSchemas.map((schema, i) => (
        <JsonLd key={i} data={schema} />
      ))}
      {/* Speakable schema — marks key sections for AI voice and read-aloud responses */}
      <JsonLd data={speakableSchema} />
      <Header />
      {/* The plan finder sits in front of the homepage and can be skipped
          (handover/entry-funnel/docs/03). Everything inside #hx-home is the
          existing homepage, unchanged. */}
      {planFinder === 'entry' && <EntrySection mode="entry" />}
      <div id="hx-home" tabIndex={-1} className="flex flex-grow flex-col">
      <main id="main-content" tabIndex={-1} className="flex-grow space-y-20 md:space-y-28">
        <HeroSection />
        <SocialProofSection />
        <TrainingPlanShowcase />
        <AppPromotion />
        <FreeToolsSection />
        <AmazonBookPromotion />
        <ApparelPromotion />
        <FaqSection />
        <InstagramSection />
      </main>
      </div>
      <Footer />
      {planFinder !== 'none' && <PlanFinderRoot mode="entry" variant={variant} finder={planFinder === 'entry'} />}
    </div>
  );
}
