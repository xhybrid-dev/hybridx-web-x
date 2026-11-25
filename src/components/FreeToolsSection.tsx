
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, CalendarDays, Scale, TrendingUp, HeartPulse, Activity, Dumbbell, FileCog, ArrowRight, Calculator, Footprints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  isNew?: boolean;
}

// Nine tools, none behind an email form, in a 3 x 3 grid. The section says
// "No Sign-Up", so nothing that asks for an address belongs here (the VO2max guide
// does, and is offered under the grid and in the footer instead).
const tools: Tool[] = [
  {
    id: 'hyrox-pacer',
    title: 'HYROX Pace Calculator',
    description: 'Every run and station split for your division and target time, free on the page.',
    icon: Timer,
    href: '/calculators/hyrox-pacer',
    isNew: true,
  },
  {
    id: 'week-planner',
    title: 'Hybrid Week Planner',
    description: 'Pick your goal and training days and get four weeks of running and lifting that fit together.',
    icon: CalendarDays,
    href: '/calculators/week-planner',
    isNew: true,
  },
  {
    id: 'strength-engine-test',
    title: 'Strength and Engine Test',
    description: 'Two minutes to find out whether strength or your engine is holding your HYROX time back.',
    icon: Scale,
    href: '/calculators/strength-engine-test',
    isNew: true,
  },
  {
    id: 'garmin-tcx-generator',
    title: 'Treadmill FIT/TCX Generator',
    description: 'Watch mangled your treadmill intervals? Rebuild the session and export a Garmin-ready file, real heart rate included.',
    icon: FileCog,
    href: '/calculators/garmin-tcx-generator',
    isNew: true,
  },
  {
    id: 'vdot',
    title: 'VDOT Calculator',
    description: 'Turn any race result into precise training paces for all five zones, from easy runs to repetitions.',
    icon: Activity,
    href: '/vdot',
  },
  {
    id: 'race-time-predictor',
    title: 'Race Time Predictor',
    description: 'Predict your 5K, 10K, half and marathon times from a recent performance and set honest goals.',
    icon: TrendingUp,
    href: '/calculators/race-time-predictor',
  },
  {
    id: 'heart-rate-zones',
    title: 'Heart Rate Zone Calculator',
    description: 'Find your five training zones with the Karvonen method so every session hits the right intensity.',
    icon: HeartPulse,
    href: '/calculators/heart-rate-zone-calculator',
  },
  {
    id: 'one-rep-max',
    title: '1RM Calculator',
    description: 'Estimate your one-rep max from any set and load your strength sessions with the right percentages.',
    icon: Dumbbell,
    href: '/calculators/one-rep-max-calculator',
  },
  {
    id: 'running-plan',
    title: '12-Week Running Plan for Hyrox',
    description: 'A free interactive week-by-week running plan built for Hyrox — threshold, intervals, and compromised running.',
    icon: Footprints,
    href: '/12-week-running-hyrox',
  },
];

export default function FreeToolsSection() {
  return (
    <section id="free-tools" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block bg-accent text-accent-foreground font-headline font-bold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            100% Free · No Sign-Up
          </span>
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">
            Free Tools That Do the Maths for You
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Train on data, not guesswork. The same calculators we use to build our plans — paces, zones, race
            predictions and more — free for every hybrid athlete.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href} className="group block h-full">
              <Card className="h-full shadow-md hover:shadow-xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm border-border/60 border-t-2 border-t-accent/50 group-hover:border-t-accent">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-accent/15 rounded-lg ring-1 ring-accent/30">
                      <tool.icon className="h-6 w-6 text-accent-ink" />
                    </div>
                    {tool.isNew && (
                      <span className="bg-accent text-accent-foreground font-headline font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-xl font-bold text-primary group-hover:text-accent-ink transition-colors duration-300 mb-2">
                    {tool.title}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground flex-grow">{tool.description}</p>
                  <span className="mt-4 flex items-center text-sm font-headline font-semibold text-foreground/80 group-hover:text-accent-ink transition-colors duration-300">
                    Use it free <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button
            variant="outline"
            className="border-accent text-foreground hover:bg-accent hover:text-accent-foreground font-headline py-3 px-8 text-base"
            asChild
          >
            <Link href="/calculators">
              <Calculator className="mr-2 h-5 w-5" /> Browse All Calculators
            </Link>
          </Button>
          <p className="mt-6 font-body text-sm text-muted-foreground">
            Want the science too? The free{' '}
            <Link href="/build-a-bigger-engine" className="font-semibold text-foreground underline underline-offset-4 hover:text-accent-ink">
              VO2max guide
            </Link>{' '}
            is a download that asks for your email.
          </p>
        </div>
      </div>
    </section>
  );
}
