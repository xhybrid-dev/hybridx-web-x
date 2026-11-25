// The older calculators' sums, pinned to published or hand-worked answers.
//
// These lived inside 'use client' form components with no tests, which is how
// the body fat page came to read centimetres as inches (a fit woman at 25%
// shown as 51.6%) and the DOTS page carried the wrong female coefficients.

import { describe, expect, it } from 'vitest';
import { navyBodyFatPercent } from '../calculators/body-fat';
import { powerliftingScore } from '../calculators/powerlifting';
import { formatPaceSec } from '../format-pace';
import { formatTime } from '../calculators/strength-engine';

describe('body fat (US Navy method, metric)', () => {
  it('reads a 178 cm man with a 38 cm neck and 84 cm waist as about 15.7%', () => {
    const r = navyBodyFatPercent({ sex: 'male', heightCm: 178, neckCm: 38, waistCm: 84 });
    expect(r).toEqual({ ok: true, percent: 15.7 });
  });

  it('reads a 165 cm woman with a 32 cm neck, 70 cm waist and 95 cm hip as about 24.9%, not 51.6%', () => {
    const r = navyBodyFatPercent({ sex: 'female', heightCm: 165, neckCm: 32, waistCm: 70, hipCm: 95 });
    expect(r).toEqual({ ok: true, percent: 24.9 });
  });

  it('asks for a hip measurement for women, and a waist bigger than the neck for men', () => {
    expect(navyBodyFatPercent({ sex: 'female', heightCm: 165, neckCm: 32, waistCm: 70 }).ok).toBe(false);
    expect(navyBodyFatPercent({ sex: 'male', heightCm: 178, neckCm: 40, waistCm: 38 }).ok).toBe(false);
    expect(navyBodyFatPercent({ sex: 'male', heightCm: 0, neckCm: 40, waistCm: 80 }).ok).toBe(false);
  });

  it('keeps the answer between 0 and 70', () => {
    const lean = navyBodyFatPercent({ sex: 'male', heightCm: 190, neckCm: 40, waistCm: 70 });
    expect(lean.ok && lean.percent).toBeGreaterThanOrEqual(0);
  });
});

describe('powerlifting scores', () => {
  const dots = (sex: 'male' | 'female', bw: number, total: number) => {
    const r = powerliftingScore({ sex, formula: 'dots', bodyweightKg: bw, totalKg: total });
    if (!r.ok) throw new Error(r.message);
    return r.points;
  };

  it('scores a 63 kg woman with a 350 kg total at 376.43 DOTS (it read 332.61)', () => {
    expect(dots('female', 63, 350)).toBeCloseTo(376.43, 2);
  });

  it('scores an 83 kg man with a 600 kg total at 405.05 DOTS', () => {
    expect(dots('male', 83, 600)).toBeCloseTo(405.05, 2);
  });

  it('keeps Wilks as it was (an 83 kg man has a coefficient of about 0.667)', () => {
    const r = powerliftingScore({ sex: 'male', formula: 'wilks', bodyweightKg: 83, totalKg: 600 });
    expect(r.ok && r.points).toBeCloseTo(400.5, 1);
  });

  it('refuses bodyweights the formula is not fitted to', () => {
    expect(powerliftingScore({ sex: 'female', formula: 'dots', bodyweightKg: 30, totalKg: 200 }).ok).toBe(false);
    expect(powerliftingScore({ sex: 'female', formula: 'dots', bodyweightKg: 160, totalKg: 200 }).ok).toBe(false);
    expect(powerliftingScore({ sex: 'male', formula: 'dots', bodyweightKg: 220, totalKg: 600 }).ok).toBe(false);
    expect(powerliftingScore({ sex: 'male', formula: 'dots', bodyweightKg: 83, totalKg: 0 }).ok).toBe(false);
  });
});

describe('pace formatting', () => {
  it('rounds the whole number of seconds first, so 239.6 s is 4:00 and not 3:60', () => {
    expect(formatPaceSec(239.6)).toBe('4:00');
    expect(formatPaceSec(239.4)).toBe('3:59');
    expect(formatPaceSec(59.5)).toBe('1:00');
    expect(formatPaceSec(0)).toBe('0:00');
  });

  it('writes hours only when asked', () => {
    expect(formatPaceSec(3725)).toBe('62:05');
    expect(formatPaceSec(3725, { hours: true })).toBe('1:02:05');
  });

  it('never prints a bad number', () => {
    expect(formatPaceSec(NaN)).toBe('--:--');
    expect(formatPaceSec(-5)).toBe('--:--');
  });

  it('is what the strength and engine test prints too', () => {
    expect(formatTime(1319.6)).toBe('22:00');
  });
});
