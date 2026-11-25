
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BodyFatCalculatorForm from '@/components/calculators/BodyFatCalculatorForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CalculatorCTA from '@/components/calculators/CalculatorCTA';
import type { Metadata } from 'next';

import { OG_DEFAULTS, TWITTER_DEFAULTS } from '@/lib/seo';
export const metadata: Metadata = {
  alternates: { canonical: '/calculators/body-fat-calculator' },
  title: 'Free Body Fat Percentage Calculator',
  description: 'Estimate your body fat percentage with our free Body Fat Calculator. Uses the U.S. Navy method to help you track body composition.',
  keywords: [
    'body fat calculator',
    'body fat percentage',
    'navy method',
    'body composition',
    'fitness calculator',
  ],
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Free Body Fat Percentage Calculator',
    description: 'Estimate your body fat percentage with our free Body Fat Calculator. Uses the U.S. Navy method to help you track body composition.',
    url: 'https://hybridx.club/calculators/body-fat-calculator',
    type: 'website',
  },
  twitter: {
    ...TWITTER_DEFAULTS,
    card: 'summary_large_image',
    title: 'Free Body Fat Percentage Calculator',
    description: 'Estimate your body fat percentage with our free Body Fat Calculator. Uses the U.S. Navy method.',
  },
};

export default function BodyFatCalculatorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle as="h1" className="text-3xl md:text-4xl font-headline text-primary">Body Fat Percentage Calculator</CardTitle>
              <CardDescription className="text-lg text-muted-foreground font-body mt-2">
                Estimate your body fat percentage using the U.S. Navy formula. All measurements should be taken in a relaxed state.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BodyFatCalculatorForm />
            </CardContent>
          </Card>
          <CalculatorCTA calculator="body-fat-calculator" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
