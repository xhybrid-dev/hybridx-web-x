import type { Metadata } from 'next';
import PaceCalculatorForm from '@/components/calculators/PaceCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Running Pace Calculator';
const DESCRIPTION = 'Easily calculate your running pace, finish time, or distance with our free Pace Calculator. Perfect for marathon, 10k, and 5k training.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/pace-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="pace-calculator"
      title="Pace Calculator"
      intro="Easily calculate your running pace, finish time, or distance."
      description={DESCRIPTION}
    >
      <PaceCalculatorForm />
    </CalculatorShell>
  );
}
