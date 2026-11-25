// Powerlifting scores: Wilks (the 1990s coefficients) and DOTS.
//
// DOTS is Dynamic Objective Team Scoring, with the coefficients OpenPowerlifting
// publishes. The page once carried the wrong female set, which under-scored a
// 63 kg woman's 350 kg total by 43.8 points; pin any change in
// src/lib/__tests__/calculators-legacy.test.ts against a published figure.

export type LifterSex = 'male' | 'female';
export type ScoreFormula = 'wilks' | 'dots';

export const KG_PER_LB = 0.45359237;

const WILKS = {
  male: { a: -216.0475144, b: 16.2606339, c: -0.002388645, d: -0.00113732, e: 7.01863e-6, f: -1.291e-8 },
  female: { a: 594.31747775582, b: -27.23842536447, c: 0.82112226871, d: -0.00930733913, e: 4.731582e-5, f: -9.054e-8 },
} as const;

const DOTS = {
  male: { a: -0.000001093, b: 0.0007391293, c: -0.1918759221, d: 24.0900756, e: -307.75076 },
  female: { a: -0.0000010706, b: 0.0005158568, c: -0.1126655495, d: 13.6175032, e: -57.96288 },
} as const;

/**
 * The bodyweight range each formula is fitted to. Outside it the polynomial
 * heads towards zero or negative, so the score is meaningless rather than
 * merely approximate.
 */
export const BODYWEIGHT_RANGE_KG: Record<LifterSex, { min: number; max: number }> = {
  male: { min: 40, max: 210 },
  female: { min: 40, max: 150 },
};

export type ScoreResult = { ok: true; points: number } | { ok: false; message: string };

export function powerliftingScore(input: {
  sex: LifterSex;
  formula: ScoreFormula;
  bodyweightKg: number;
  totalKg: number;
}): ScoreResult {
  const { sex, formula, bodyweightKg, totalKg } = input;

  if (!(bodyweightKg > 0)) return { ok: false, message: 'Invalid bodyweight.' };
  if (!(totalKg > 0)) return { ok: false, message: 'Total lift cannot be zero for score calculation.' };

  const range = BODYWEIGHT_RANGE_KG[sex];
  if (bodyweightKg < range.min || bodyweightKg > range.max) {
    return {
      ok: false,
      message: `Bodyweight must be between ${range.min} and ${range.max} kg (${Math.round(range.min / KG_PER_LB)}–${Math.round(range.max / KG_PER_LB)} lb) for this formula.`,
    };
  }

  let denominator: number;
  if (formula === 'wilks') {
    const c = WILKS[sex];
    denominator =
      c.a +
      c.b * bodyweightKg +
      c.c * bodyweightKg ** 2 +
      c.d * bodyweightKg ** 3 +
      c.e * bodyweightKg ** 4 +
      c.f * bodyweightKg ** 5;
  } else {
    const c = DOTS[sex];
    denominator =
      c.a * bodyweightKg ** 4 + c.b * bodyweightKg ** 3 + c.c * bodyweightKg ** 2 + c.d * bodyweightKg + c.e;
  }

  if (!(denominator > 0)) {
    return { ok: false, message: `Calculation error (${formula.toUpperCase()} denominator is not positive).` };
  }

  return { ok: true, points: totalKg * (500 / denominator) };
}
