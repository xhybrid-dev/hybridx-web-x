import type { Metadata } from 'next';
import PercentageBasedWeightCalculatorForm from '@/components/calculators/PercentageBasedWeightCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Percentage-Based Weight Calculator';
const DESCRIPTION = 'Calculate specific training weights with our free Percentage-Based Weight Calculator. Perfect for programming based on your 1RM.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/percentage-based-weight-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="percentage-based-weight-calculator"
      title="Percentage-Based Weight Calculator"
      intro="Determine the exact weight to lift for any given percentage of your One-Rep Max (1RM)."
      description={DESCRIPTION}
    >
      <PercentageBasedWeightCalculatorForm />
    </CalculatorShell>
  );
}
