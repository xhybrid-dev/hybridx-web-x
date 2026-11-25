
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OneRepMaxCalculatorForm from '@/components/calculators/OneRepMaxCalculatorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/one-rep-max-calculator' },
  title: 'Free One-Rep Max (1RM) Calculator',
  description: 'Estimate your one-rep max (1RM) for key lifts like squat, bench, and deadlift. Use our free calculator to find your true strength.',
};

export default function OneRepMaxCalculatorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">One-Rep Max (1RM) Calculator</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Estimate your one-repetition maximum (1RM) for lifts like squat, bench, and deadlift using popular formulas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OneRepMaxCalculatorForm />
            </CardContent>
          </Card>
          <CalculatorCTA calculator="one-rep-max-calculator" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
