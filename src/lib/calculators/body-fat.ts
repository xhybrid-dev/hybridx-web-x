// Body fat from tape measurements: the US Navy circumference method, in the
// metric form (Hodgdon and Beckett's equations, centimetres in).
//
// The page once converted every measurement to centimetres and then ran the
// inches version of the formula on them, which read a fit 25% woman as 51.6%.
// Keep the unit in the name of every argument, and pin new numbers in
// src/lib/__tests__/calculators-legacy.test.ts.

export type BodyFatSex = 'male' | 'female';

export interface BodyFatInput {
  sex: BodyFatSex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  /** Required for women. */
  hipCm?: number;
}

export type BodyFatResult = { ok: true; percent: number } | { ok: false; message: string };

export function navyBodyFatPercent(input: BodyFatInput): BodyFatResult {
  const { sex, heightCm, neckCm, waistCm } = input;

  if (!(heightCm > 0) || !(neckCm > 0) || !(waistCm > 0)) {
    return { ok: false, message: 'Height, Neck, and Waist measurements must be positive values.' };
  }

  let percent: number;

  if (sex === 'male') {
    if (waistCm <= neckCm) {
      return { ok: false, message: 'For males, waist circumference must be greater than neck circumference for this formula.' };
    }
    percent = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    const hipCm = input.hipCm ?? 0;
    if (!(hipCm > 0)) {
      return { ok: false, message: 'Hip measurement must be a positive value for females.' };
    }
    if (waistCm + hipCm <= neckCm) {
      return { ok: false, message: 'For females, the sum of waist and hip circumferences must be greater than neck circumference for this formula.' };
    }
    percent = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
  }

  if (!Number.isFinite(percent)) {
    return { ok: false, message: 'Calculation resulted in an invalid number. Please check your inputs.' };
  }

  // Body fat cannot be negative, and the method is not meant for extremes.
  const clamped = Math.min(70, Math.max(0, percent));
  return { ok: true, percent: Math.round(clamped * 10) / 10 };
}
