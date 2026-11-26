import type { Metadata } from 'next';
import OneRepMaxCalculatorForm from '@/components/calculators/OneRepMaxCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free One-Rep Max (1RM) Calculator';
const DESCRIPTION = 'Estimate your one-rep max (1RM) for key lifts like squat, bench, and deadlift. Use our free calculator to find your true strength.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/one-rep-max-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="one-rep-max-calculator"
      title="One-Rep Max (1RM) Calculator"
      intro="Estimate your one-repetition maximum (1RM) for lifts like squat, bench, and deadlift using popular formulas."
      description={DESCRIPTION}
    >
      <OneRepMaxCalculatorForm />
    </CalculatorShell>
  );
}
