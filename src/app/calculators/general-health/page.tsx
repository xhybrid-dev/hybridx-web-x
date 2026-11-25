
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Percent, Utensils, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/general-health' },
  title: 'Free Health Calculators (Body Fat, Calories) | HybridX Hub',
  description: 'A suite of free health calculators to understand body composition, daily calorie needs, and macronutrient targets for your fitness and nutrition goals.',
};

interface CalculatorInfo {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  ctaText: string;
}

const generalHealthCalculators: CalculatorInfo[] = [
  {
    id: 'body-fat-calculator',
    title: 'Body Fat Calculator',
    description: 'Estimate your body fat percentage using the U.S. Navy method. Track your body composition and progress towards your goals.',
    icon: Percent,
    href: '/calculators/body-fat-calculator',
    ctaText: 'Estimate My Body Fat',
  },
  {
    id: 'calorie-macronutrient-calculator',
    title: 'Calorie & Macro Calculator',
    description: 'Determine your daily calorie and macronutrient needs for fat loss, maintenance, or muscle gain, tailored to your activity level.',
    icon: Utensils,
    href: '/calculators/calorie-macronutrient-calculator',
    ctaText: 'Calculate My Calories & Macros',
  },
];

export default function GeneralHealthCalculatorsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <section id="general-health-calculators-overview" className="py-12 md:py-16">
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
              Understand Your Body: Health Calculators
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-body max-w-3xl mx-auto">
              Gain key insights into your body composition and nutritional needs with our easy-to-use health calculators. Whether you want to estimate your body fat or dial in your nutrition, these tools can help guide your journey.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {generalHealthCalculators.map((calc) => (
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
