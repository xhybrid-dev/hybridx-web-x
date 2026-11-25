import type { Metadata } from 'next';
import RaceTimePredictorForm from '@/components/calculators/RaceTimePredictorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Race Time Predictor (5K to Marathon)';
const DESCRIPTION = 'Free Race Time Predictor. Estimate your finish times for a 5k, 10k, half marathon, or full marathon based on a recent performance.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/race-time-predictor',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="race-time-predictor"
      title="Race Time Predictor"
      intro="Estimate your potential finish times for different race distances based on a recent performance."
      description={DESCRIPTION}
    >
      <RaceTimePredictorForm />
    </CalculatorShell>
  );
}
