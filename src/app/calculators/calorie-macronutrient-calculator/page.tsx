
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CalorieMacronutrientCalculatorForm from '@/components/calculators/CalorieMacronutrientCalculatorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/calculators/calorie-macronutrient-calculator' },
  title: 'Free Calorie & Macronutrient Calculator',
  description: 'Free Calorie and Macronutrient Calculator. Estimate your daily calorie and macro needs for fat loss, maintenance, or muscle gain.',
};

export default function CalorieMacronutrientCalculatorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">Calorie & Macronutrient Calculator</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Estimate your daily calorie and macronutrient targets based on your body metrics, activity level, and fitness goals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalorieMacronutrientCalculatorForm />
            </CardContent>
          </Card>
          <CalculatorCTA calculator="calorie-macronutrient-calculator" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
