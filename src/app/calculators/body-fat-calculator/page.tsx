import type { Metadata } from 'next';
import BodyFatCalculatorForm from '@/components/calculators/BodyFatCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const KEYWORDS = ['body fat calculator', 'body fat percentage', 'navy method', 'body composition', 'fitness calculator'];

const TITLE = 'Free Body Fat Percentage Calculator';
const DESCRIPTION = 'Estimate your body fat percentage with our free Body Fat Calculator. Uses the U.S. Navy method to help you track body composition.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  keywords: KEYWORDS,
  path: '/calculators/body-fat-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="body-fat-calculator"
      title="Body Fat Percentage Calculator"
      intro="Estimate your body fat percentage using the U.S. Navy formula. All measurements should be taken in a relaxed state."
      description={DESCRIPTION}
      keywords={KEYWORDS}
    >
      <BodyFatCalculatorForm />
    </CalculatorShell>
  );
}
