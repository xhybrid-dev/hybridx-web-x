
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PowerliftingScoreCalculatorForm from '@/components/calculators/PowerliftingScoreCalculatorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/powerlifting-score-calculator' },
  title: 'Free Wilks & DOTS Powerlifting Calculator',
  description: 'Use our free Powerlifting Score Calculator to find your Wilks or DOTS score. Benchmark your strength against other lifters.',
};

export default function PowerliftingScoreCalculatorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">Powerlifting Score Calculator</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Calculate your Wilks or DOTS score to benchmark your powerlifting total.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PowerliftingScoreCalculatorForm />
            </CardContent>
          </Card>
          <CalculatorCTA calculator="powerlifting-score-calculator" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
