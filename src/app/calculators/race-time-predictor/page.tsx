
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RaceTimePredictorForm from '@/components/calculators/RaceTimePredictorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/race-time-predictor' },
  title: 'Free Race Time Predictor (5K to Marathon)',
  description: 'Free Race Time Predictor. Estimate your finish times for a 5k, 10k, half marathon, or full marathon based on a recent performance.',
};

export default function RaceTimePredictorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">Race Time Predictor</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Estimate your potential finish times for different race distances based on a recent performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RaceTimePredictorForm />
            </CardContent>
          </Card>
          <CalculatorCTA calculator="race-time-predictor" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
