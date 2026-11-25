import type { Metadata } from 'next';
import CalorieMacronutrientCalculatorForm from '@/components/calculators/CalorieMacronutrientCalculatorForm';
import CalculatorShell from '@/components/calculators/CalculatorShell';
import { createMetadata } from '@/lib/seo';

const TITLE = 'Free Calorie & Macronutrient Calculator';
const DESCRIPTION = 'Free Calorie and Macronutrient Calculator. Estimate your daily calorie and macro needs for fat loss, maintenance, or muscle gain.';

export const metadata: Metadata = createMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/calculators/calorie-macronutrient-calculator',
});

export default function Page() {
  return (
    <CalculatorShell
      slug="calorie-macronutrient-calculator"
      title="Calorie & Macronutrient Calculator"
      intro="Estimate your daily calorie and macronutrient targets based on your body metrics, activity level, and fitness goals."
      description={DESCRIPTION}
    >
      <CalorieMacronutrientCalculatorForm />
    </CalculatorShell>
  );
}
