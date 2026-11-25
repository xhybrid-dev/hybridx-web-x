import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CALCULATORS, CALCULATOR_GUIDES, calculatorBySlug } from '@/lib/calculators/registry';
import { PAGE_UPDATED } from '@/lib/page-dates';

const ROOT = process.cwd();

// The pages that use the shell, and the pages that were converted to it: every one of them
// must have a guide, or the shell throws at build time.
const SHELL_PAGES = [
  'pace-calculator',
  'race-time-predictor',
  'heart-rate-zone-calculator',
  'one-rep-max-calculator',
  'percentage-based-weight-calculator',
  'powerlifting-score-calculator',
  'calorie-macronutrient-calculator',
  'split-time-calculator',
  'body-fat-calculator',
];

describe('the calculators registry', () => {
  it('has a page behind every path, and a date for it in the sitemap', () => {
    for (const c of CALCULATORS) {
      expect(existsSync(join(ROOT, 'src/app', c.path, 'page.tsx')), c.path).toBe(true);
      expect(PAGE_UPDATED[c.path], `${c.path} has no entry in page-dates.ts`).toBeTruthy();
    }
  });

  it('has unique slugs and paths', () => {
    expect(new Set(CALCULATORS.map((c) => c.slug)).size).toBe(CALCULATORS.length);
    expect(new Set(CALCULATORS.map((c) => c.path)).size).toBe(CALCULATORS.length);
  });

  it('only relates a calculator to others that exist, never to itself', () => {
    for (const [slug, guide] of Object.entries(CALCULATOR_GUIDES)) {
      expect(guide.related.length).toBeGreaterThan(0);
      for (const r of guide.related) {
        expect(calculatorBySlug(r), `${slug} relates to unknown "${r}"`).toBeDefined();
        expect(r).not.toBe(slug);
      }
    }
  });

  it('explains every converted calculator, with real questions and answers', () => {
    for (const slug of SHELL_PAGES) {
      const g = CALCULATOR_GUIDES[slug];
      expect(g, slug).toBeDefined();
      expect(g.how.length).toBeGreaterThan(0);
      expect(g.faqs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(g.faqs.map((f) => f.question)).size).toBe(g.faqs.length);
      for (const f of g.faqs) {
        expect(f.question.endsWith('?')).toBe(true);
        expect(f.answer.length).toBeGreaterThan(40);
      }
    }
  });

  it('is used by every converted page, with a slug it knows', () => {
    for (const slug of SHELL_PAGES) {
      const page = readFileSync(join(ROOT, 'src/app/calculators', slug, 'page.tsx'), 'utf8');
      expect(page).toContain('<CalculatorShell');
      expect(page).toContain(`slug="${slug}"`);
      expect(page).toContain(`path: '/calculators/${slug}'`);
    }
  });

  // The explanation says which formula the tool uses. If a form changes its formula these
  // fail, which is the prompt to change the sentence.
  it('names the formulas the forms really use', () => {
    const read = (f: string) => readFileSync(join(ROOT, 'src/components/calculators', f), 'utf8');
    expect(read('RaceTimePredictorForm.tsx')).toContain('RIEGL_EXPONENT = 1.06');
    expect(CALCULATOR_GUIDES['race-time-predictor'].how.join(' ')).toContain('1.06');
    expect(read('OneRepMaxCalculatorForm.tsx')).toContain('1.0278 - 0.0278 * Reps');
    expect(read('OneRepMaxCalculatorForm.tsx')).toContain('Weight * (1 + Reps / 30)');
    const cal = read('CalorieMacronutrientCalculatorForm.tsx');
    for (const needle of ['Mifflin-St Jeor', '1.2', '1.9', 'tdee * 0.80', 'tdee * 1.15', "'loseWeight' ? 2.0 : 1.8", 'targetCalories < 1000']) {
      expect(cal, needle).toContain(needle);
    }
    expect(read('HeartRateZoneCalculatorForm.tsx')).toContain('220 - currentAge');
  });
});
