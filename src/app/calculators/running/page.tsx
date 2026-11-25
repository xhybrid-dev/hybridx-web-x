
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, TrendingUp, HeartPulse, Timer, Activity, FileCog, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/running' },
  title: 'Free Running Calculators (Pace, Race Time, Splits) | HybridX Hub',
  description: 'A suite of free, essential running calculators. Plan your pace, predict race times for 5k to marathon, find heart rate zones, and strategize your race splits.',
};

interface CalculatorInfo {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  ctaText: string;
}

const runningCalculators: CalculatorInfo[] = [
  {
    id: 'pace-calculator',
    title: 'Pace Calculator',
    description: 'Instantly calculate your running pace, finish time, or distance. Perfect for planning workouts and race strategy. Know your numbers, crush your goals.',
    icon: Route,
    href: '/calculators/pace-calculator',
    ctaText: 'Use Pace Calculator',
  },
  {
    id: 'race-time-predictor',
    title: 'Race Time Predictor',
    description: 'Estimate your finish times for popular race distances (5K, 10K, Half, Marathon) based on a recent performance. Set realistic goals and track your improvement.',
    icon: TrendingUp,
    href: '/calculators/race-time-predictor',
    ctaText: 'Predict My Race Time',
  },
  {
    id: 'heart-rate-zone-calculator',
    title: 'Heart Rate Zone Calculator',
    description: 'Discover your optimal training heart rate zones using the Karvonen method. Train smarter, recover better, and maximize your aerobic and anaerobic development.',
    icon: HeartPulse,
    href: '/calculators/heart-rate-zone-calculator',
    ctaText: 'Find My HR Zones',
  },
  {
    id: 'split-time-calculator',
    title: 'Split Time Calculator',
    description: 'Plan your race with precision. Calculate even splits or upload a GPX file for AI-powered, elevation-adjusted split recommendations.',
    icon: Timer,
    href: '/calculators/split-time-calculator',
    ctaText: 'Plan My Splits',
  },
  {
    id: 'garmin-tcx-generator',
    title: 'Treadmill FIT & TCX Generator',
    description: 'Watch mangled your treadmill intervals? Rebuild the session you actually ran — paces, inclines and real heart rate — and export a FIT or TCX file for Garmin Connect or Strava.',
    icon: FileCog,
    href: '/calculators/garmin-tcx-generator',
    ctaText: 'Rebuild My Session',
  },
  {
    id: 'vdot-calculator',
    title: 'VDOT Calculator',
    description: 'Calculate your Jack Daniels VDOT score from any race result. Get precise training paces for all five zones — Easy, Marathon, Threshold, Interval, and Repetition.',
    icon: Activity,
    href: '/vdot',
    ctaText: 'Calculate My VDOT',
  },
];

export default function RunningCalculatorsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <section id="running-calculators-overview" className="py-12 md:py-16">
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
              Optimize Your Run: Essential Calculators
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-body max-w-3xl mx-auto">
              Unlock your running potential with our suite of free, easy-to-use calculators. Plan your pace, predict race times, understand your heart rate zones, and strategize your splits for your 5k, 10k, or marathon.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {runningCalculators.map((calc) => (
              <Card key={calc.id} className="shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col bg-card/80 backdrop-blur-sm border-border/60 group border-t-2 border-accent/40">
                <CardHeader className="flex-row items-center space-x-4 pb-4 pt-6">
                  <div className="p-3 bg-accent/15 rounded-lg ring-1 ring-accent/30">
                    <calc.icon className="h-8 w-8 text-accent-ink" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-2xl text-primary group-hover:text-accent-ink transition-colors duration-300">{calc.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <CardDescription className="font-body text-muted-foreground mb-6 flex-grow">
                    {calc.description}
                  </CardDescription>
                  <Button variant="default" className="mt-auto bg-primary text-primary-foreground hover:bg-primary/90 w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300 font-headline py-3 text-base" asChild>
                    <Link href={calc.href}>
                      {calc.ctaText} <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
