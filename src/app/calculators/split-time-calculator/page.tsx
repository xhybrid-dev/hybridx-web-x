import type { Metadata } from 'next';
import SplitTimeCalculatorForm from '@/components/calculators/SplitTimeCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Race Split Time Calculator (GPX)';
const DESCRIPTION = 'Plan your race with our free Split Time Calculator. Generate even splits or upload a GPX file for AI-powered, elevation-adjusted split recommendations.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/split-time-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="split-time-calculator"
      title="Split Time Calculator"
      intro="Plan your race with precise split times. Upload a GPX file for AI-powered, elevation-adjusted recommendations."
      description={DESCRIPTION}
    >
      <SplitTimeCalculatorForm />
    </CalculatorShell>
  );
}
