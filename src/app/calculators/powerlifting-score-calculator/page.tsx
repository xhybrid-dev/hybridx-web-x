import type { Metadata } from 'next';
import PowerliftingScoreCalculatorForm from '@/components/calculators/PowerliftingScoreCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Wilks & DOTS Powerlifting Calculator';
const DESCRIPTION = 'Use our free Powerlifting Score Calculator to find your Wilks or DOTS score. Benchmark your strength against other lifters.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/powerlifting-score-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="powerlifting-score-calculator"
      title="Powerlifting Score Calculator"
      intro="Calculate your Wilks or DOTS score to benchmark your powerlifting total."
      description={DESCRIPTION}
    >
      <PowerliftingScoreCalculatorForm />
    </CalculatorShell>
  );
}
