import type { Metadata } from 'next';
import HeartRateZoneCalculatorForm from '@/components/calculators/HeartRateZoneCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Heart Rate Zone Calculator';
const DESCRIPTION = 'Find your optimal training zones with our free Heart Rate Zone Calculator. Uses the Karvonen formula for accurate cardio and running training.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/heart-rate-zone-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="heart-rate-zone-calculator"
      title="Heart Rate Zone Calculator"
      intro="Determine your target heart rate zones for effective training using the Karvonen method."
      description={DESCRIPTION}
    >
      <HeartRateZoneCalculatorForm />
    </CalculatorShell>
  );
}
