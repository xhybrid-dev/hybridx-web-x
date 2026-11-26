
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, HeartPulse, Dumbbell, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Plan {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  ctaText: string;
  href: string;
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'hybrid-running',
    title: 'Hybrid Running Plan',
    description: 'Run faster for HYROX. A free interactive 12-week plan: threshold sessions, intervals, long runs and compromised running, with a built-in pace calculator.',
    icon: Activity,
    ctaText: 'Open The Plan',
    href: '/12-week-running-hyrox',
  },
  {
    id: 'hyrox-specific',
    title: 'Hyrox 12 Week Training Plan',
    description: 'Our most-chosen plan for Hyrox race preparation. Beginner scaling and advanced challenges on every session to conquer every station and run.',
    icon: HeartPulse,
    ctaText: 'Get The Free Plan',
    href: '/free-hyrox-plan',
    isPopular: true,
  },
  {
    id: 'week-planner',
    title: 'Hybrid Week Planner',
    description: 'Pick your goal and training days and get four weeks of running and lifting that fit together, with a calendar file.',
    icon: Dumbbell,
    ctaText: 'Build Your Week',
    href: '/calculators/week-planner',
  },
];

export default function TrainingPlanShowcase() {
  return (
    <section id="training-plans" className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-3">
            Your Path to Elite Hybrid Performance Starts Here
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Our training philosophy is built on the principle of concurrent training—developing strength and endurance in parallel. These plans are your roadmap to becoming a truly well-rounded hybrid athlete.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <div key={plan.id} className="relative pt-4">
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-accent text-accent-foreground font-headline font-bold text-xs px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  <Star className="h-3 w-3 fill-current" />
                  Most Popular
                  <Star className="h-3 w-3 fill-current" />
                </div>
              )}
              <Card className={`shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card/80 backdrop-blur-sm ${
                plan.isPopular
                  ? 'border-2 border-accent ring-2 ring-accent/20 shadow-accent/10'
                  : 'border-t-2 border-accent/50'
              }`}>
                <CardHeader className="items-center text-center pt-8">
                  <div className={`p-4 rounded-full mb-4 ${
                    plan.isPopular
                      ? 'bg-accent/30 ring-2 ring-accent/60'
                      : 'bg-accent/20 ring-2 ring-accent/30'
                  }`}>
                    <plan.icon className="h-10 w-10 text-accent-ink" />
                  </div>
                  <CardTitle className="font-headline text-2xl text-primary">{plan.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col text-center">
                  <CardDescription className="font-body text-muted-foreground mb-6 flex-grow px-2">
                    {plan.description}
                  </CardDescription>
                  <Button
                    variant={plan.isPopular ? 'default' : 'outline'}
                    className={`mt-auto w-full transition-colors duration-300 font-headline py-3 ${
                      plan.isPopular
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : 'border-accent text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                    asChild
                  >
                    <Link href={plan.href}>{plan.ctaText}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
