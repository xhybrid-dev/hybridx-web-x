
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
import Script from 'next/script';
import { createCourseSchema, createSpeakableSchema } from '@/lib/seo';
import EntrySection from '@/components/plan-finder/EntrySection';
import PlanFinderRoot from '@/components/plan-finder/PlanFinderRoot';
import type { Variant } from '@/lib/plan-finder/tracker';

export const homeMetadata: Metadata = {
  alternates: { canonical: '/' },
  title: 'HybridX Hub | Hyrox Training Plans, Workout Programs & Coaching App',
  description: 'Expert Hyrox training plans and hybrid workout programs. Achieve your best performance in Hyrox competitions with our scientifically-backed training plans, books, and coaching app. Free calculators and resources.',
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
    title: 'HybridX Hub | Hyrox Training Plans, Workout Programs & Coaching App',
    description: 'Expert Hyrox training plans and hybrid workout programs. Achieve your best performance in Hyrox competitions with our scientifically-backed training plans, books, and coaching app.',
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
    card: 'summary_large_image',
    title: 'HybridX Hub | Hyrox Training Plans, Workout Programs & Coaching App',
    description: 'Expert Hyrox training plans and hybrid workout programs. Achieve your best performance in Hyrox competitions with our scientifically-backed training plans, books, and coaching app.',
    images: ['/og-default.png'],
  },
};

const courseSchemas = [
  createCourseSchema({
    name: 'HybridX 12-Week Hyrox Training Plan',
    description:
      'A free, personalised 12-week Hyrox training plan for beginner, intermediate, and advanced athletes. Covers compromised running, all 8 race stations, and race-day strategy. RPE-based so it scales to your fitness level.',
    url: '/free-hyrox-plan',
    level: 'All levels',
  }),
  createCourseSchema({
    name: 'HybridX Hybrid Running Training Plan',
    description:
      'A 12-week hybrid running plan combining elite running protocols with targeted strength work to improve race times and build functional endurance.',
    url: '/free-hyrox-plan',
    level: 'Intermediate',
  }),
  createCourseSchema({
    name: 'HybridX Offseason Strength Plan',
    description:
      'A focused offseason strength and power programme for Hyrox and hybrid athletes, building the foundation for the next competitive season.',
    url: '/free-hyrox-plan',
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
        <Script
          key={`course-schema-${i}`}
          id={`course-schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {/* Speakable schema — marks key sections for AI voice and read-aloud responses */}
      <Script
        id="speakable-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
      />
      <Header />
      {/* The plan finder sits in front of the homepage and can be skipped
          (handover/entry-funnel/docs/03). Everything inside #hx-home is the
          existing homepage, unchanged. */}
      {planFinder === 'entry' && <EntrySection mode="entry" />}
      <div id="hx-home" tabIndex={-1} className="flex flex-grow flex-col">
      <main className="flex-grow space-y-20 md:space-y-28">
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
