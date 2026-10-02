
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { Trophy, Calendar, TrendingUp, Dumbbell, CheckCircle, Smartphone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShopEventLink from '@/components/shop/ShopEventLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import HyroxDominationForm from '@/components/hyrox/HyroxDominationForm';
import TrackedLink from '@/components/TrackedLink';
import { createFAQSchema } from '@/lib/seo';
import { fetchHyroxEvents, type HyroxEvent } from '@/lib/hyrox-events';

// Events change infrequently — revalidate hourly instead of blocking every
// request on the Google Sheet fetch.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: '/free-hyrox-plan' },
  title: 'Free Hyrox Training Plan (12-Week) | PDF Download',
  description: "Get a free, scientifically-backed 12-week Hyrox training plan. Achieve your best race time with our expert program. Download your personalized PDF now.",
  keywords: [
    'free hyrox training plan',
    'hyrox training plan pdf',
    '12 week hyrox plan free',
    'hyrox workout plan',
    'hyrox preparation',
    'free hyrox program',
    'hyrox training',
  ],
  openGraph: {
    title: 'Free Hyrox Training Plan (12-Week) | PDF Download',
    description: "Get a free, scientifically-backed 12-week Hyrox training plan. Achieve your best race time with our expert program. Download your personalized PDF now.",
    type: 'website',
    url: '/free-hyrox-plan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free 12-Week Hyrox Training Plan | HybridX',
    description: "Your ultimate guide to Hyrox success. Download a free, personalized 12-week training plan in PDF format and get ready for race day.",
  },
};

// --- Section Components ---

const HeroSection = () => (
  <section className="relative bg-background text-center py-16 md:py-24 overflow-hidden">
    <div className="absolute inset-0 bg-subtle-x-light dark:bg-subtle-x-dark opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen"></div>
    <div className="container mx-auto px-6 relative z-10">
      <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary mb-4 leading-tight">
        Your Free 12-Week <span className="text-accent">Hyrox Training Plan</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto mb-8">
        Enter your race date and ability level. Get a personalised, phase-by-phase plan — covering every station and every compromised running session — emailed to you instantly. No cost, no account.
      </p>
      <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transform hover:scale-105 transition-transform duration-200">
        <Link href="#get-the-plan">Get My Free Plan</Link>
      </Button>
    </div>
  </section>
);

const WhyThisPlanSection = () => (
  <section className="py-16 md:py-20 bg-secondary/30">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-3">Most Hyrox prep fails for the same reasons</h2>
      <p className="text-base text-muted-foreground font-body max-w-2xl mx-auto mb-10">
        Random CrossFit workouts, no plan for pacing between stations, and strength training that doesn&apos;t translate to race day. This plan is built to fix all three.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
        <Card>
          <CardHeader><CardTitle className="text-lg">Phase-Specific Structure</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm">Foundation, strength-endurance, peak performance, and a competition taper — in that order, for a reason.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Compromised Running</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm">Weekly sessions that train you to run fast immediately after a station, not just run fast on fresh legs.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">RPE-Based Intensity</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm">Scales automatically to your fitness level — no guessing paces or copying someone else&apos;s numbers.</CardContent>
        </Card>
      </div>
    </div>
  </section>
);

const GetThePlanSection = ({ events }: { events: HyroxEvent[] }) => (
    <section id="get-the-plan" className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary">Get Your Personalised Plan</h2>
                <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">Enter your race date and ability level — we build your 12-week plan and send it to your inbox instantly.</p>
                <ul className="mt-6 inline-flex flex-col items-start gap-2 text-left text-base text-muted-foreground font-body">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Adapts to your exact race date</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Adjusts to your ability level — beginner, intermediate, or advanced</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Structured progressively over 12 weeks across 4 phases</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent flex-shrink-0" /> Emailed instantly as a downloadable PDF — 100% free</li>
                </ul>
            </div>
            <div className="flex justify-center">
                <Card className="border-2 border-accent shadow-2xl relative overflow-hidden max-w-lg w-full">
                     <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-bold px-4 py-1 rounded-b-lg shadow-lg">
                        <Trophy className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
                        100% FREE
                     </div>
                    <CardHeader className="text-center pt-12 pb-4">
                        <CardTitle className="text-2xl font-headline uppercase tracking-wider">Hyrox Performance Plan</CardTitle>
                        <CardDescription>Your Personalized Path to the Finish Line</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center px-4 sm:px-8 pb-8">
                        <HyroxDominationForm initialEvents={events} />
                    </CardContent>
                </Card>
            </div>
            <p className="text-center text-sm text-muted-foreground font-body mt-10">
              Want to understand the methodology first? Read{' '}
              <Link href="/how-to-train-for-hyrox" className="text-accent hover:underline font-semibold">How to Train for a Hyrox Event</Link>
              {', '}the{' '}
              <Link href="/hyrox-training-plan" className="text-accent hover:underline font-semibold">12-week plan structure</Link>
              {', or the '}
              <Link href="/hybrid-training-program" className="text-accent hover:underline font-semibold">hybrid training methodology</Link>.
            </p>
        </div>
    </section>
);

const WhatsIncludedSection = () => {
    const includedItems = [
      { icon: Calendar, title: "Beginner to Advanced", description: "Progressive 12-week plans for every fitness level, from first-timers to competitors."},
      { icon: TrendingUp, title: "Running-Specific Sessions", description: "Speed, endurance, and compromised running protocols built into every week."},
      { icon: Dumbbell, title: "Station-by-Station Strength", description: "Targeted work for every one of the 8 stations, to reduce injury risk and build confidence."},
    ];

    return (
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary">What&apos;s in the plan</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {includedItems.map((item, index) => (
              <Card key={index} className="shadow-sm border-primary/20">
                <CardHeader>
                  <item.icon className="h-7 w-7 text-accent mb-2"/>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  };

const AppUpsellSection = () => (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-6 max-w-3xl">
        <Card className="bg-primary/5 border-primary/20 p-8 text-center">
          <Smartphone className="h-12 w-12 text-accent mx-auto mb-4"/>
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary">Want it guided, day by day?</h2>
          <p className="text-lg text-muted-foreground mt-3 font-body max-w-xl mx-auto">
            The HybridX app delivers this plan one session at a time, tracks every rep and run, and adapts as you progress. Try it free for 14 days — cancel anytime in two clicks.
          </p>
          <Button size="lg" asChild className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
            <TrackedLink href="/app" event="cta_app_click" eventParams={{ location: 'free_plan_upsell' }}>See the app</TrackedLink>
          </Button>
        </Card>
      </div>
    </section>
);

const FaqSection = () => {
  const hyroxFaqItems = [
    {
      question: "What if I'm a complete beginner?",
      answer: "This plan is designed to take you from wherever you are to Hyrox-ready in 12 weeks. It uses RPE (Rate of Perceived Exertion), so intensity automatically scales to your current fitness level.",
    },
    {
      question: "How much time do I need to train per week?",
      answer: "Sessions run 45-90 minutes, most under 75, across 4-5 days a week.",
    },
    {
      question: "Why is this free? What's the catch?",
      answer: "No catch. It's 100% free — we hope you'll get results, like the system, and consider the app or books later.",
    },
    {
      question: "What equipment do I need for this plan?",
      answer: "A standard functional fitness gym: squat rack, barbells, dumbbells, kettlebells, a rowing machine, a ski-erg, and space for sled pushes/pulls. Substitutions are suggested where possible.",
    },
  ];

  const hyroxFaqSchema = createFAQSchema(hyroxFaqItems);

  return (
    <>
      <Script
        id="hyrox-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hyroxFaqSchema) }}
      />
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary text-center mb-8">FAQ</h2>
          <Accordion type="single" collapsible className="w-full">
            {hyroxFaqItems.map((item, i) => (
              <AccordionItem value={`faq-${i + 1}`} key={item.question}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
};

// --- Main Page Component ---

export default async function FreeHyroxPlanPage() {
  // Fetch events at build/request time for instant availability
  const events = await fetchHyroxEvents();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <WhyThisPlanSection />
        <GetThePlanSection events={events} />
        <WhatsIncludedSection />
        <AppUpsellSection />
        <FaqSection />
        <ShopEventLink />
      </main>
      <Footer />
    </div>
  );
}
