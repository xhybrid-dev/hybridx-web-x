
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeartRateZoneCalculatorForm from '@/components/calculators/HeartRateZoneCalculatorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/heart-rate-zone-calculator' },
  title: 'Free Heart Rate Zone Calculator',
  description: 'Find your optimal training zones with our free Heart Rate Zone Calculator. Uses the Karvonen formula for accurate cardio and running training.',
};

export default function HeartRateZoneCalculatorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">Heart Rate Zone Calculator</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Determine your target heart rate zones for effective training using the Karvonen method.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HeartRateZoneCalculatorForm />
            </CardContent>
          </Card>
          <CalculatorCTA calculator="heart-rate-zone-calculator" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
