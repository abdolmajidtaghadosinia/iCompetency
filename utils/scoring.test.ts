import { describe, it, expect } from 'vitest';
import {
  calculateDPrime,
  calculateStroopScore,
  toTScore,
  calculateIndices,
  getPerformanceLabel,
  getTScoreColor,
  getCareerFit,
  type RawScores,
} from './scoring';

describe('calculateDPrime', () => {
  it('gives a high positive value for near-perfect performance', () => {
    // hitRate clamps to 0.99, faRate clamps to 0.01 -> probit(0.99) - probit(0.01)
    expect(calculateDPrime(10, 10, 0, 10)).toBeCloseTo(4.6527, 3);
  });

  it('gives ~0 when hit rate equals false-alarm rate (chance performance)', () => {
    expect(calculateDPrime(5, 10, 5, 10)).toBeCloseTo(0, 5);
  });

  it('clamps worse-than-chance performance to 0 instead of negative', () => {
    expect(calculateDPrime(1, 10, 9, 10)).toBe(0);
  });

  it('does not divide by zero when there are no targets/non-targets', () => {
    expect(calculateDPrime(0, 0, 0, 0)).toBe(0);
  });
});

describe('calculateStroopScore', () => {
  it('computes a 0-100 inhibition score from RT interference and accuracy', () => {
    // interference = 200ms, accuracy 90% -> (1000/200) * 0.9 * 10 = 45
    expect(calculateStroopScore(800, 600, 0.9)).toBe(45);
  });

  it('caps at 100 when interference is floored at 50ms', () => {
    // raw interference is 10ms, floored to 50ms -> (1000/50) * 1 * 10 = 200 -> cap 100
    expect(calculateStroopScore(610, 600, 1)).toBe(100);
  });

  it('floors interference at 50ms when incongruent RT is faster than congruent RT', () => {
    // floored to 50ms -> (1000/50) * 0.8 * 10 = 160 -> cap 100
    expect(calculateStroopScore(500, 600, 0.8)).toBe(100);
  });

  it('scores a slow, error-prone run well below the norm mean', () => {
    // interference = 500ms, accuracy 60% -> (1000/500) * 0.6 * 10 = 12
    expect(calculateStroopScore(1100, 600, 0.6)).toBe(12);
  });

  it('returns 0 when accuracy is 0 regardless of reaction time', () => {
    expect(calculateStroopScore(800, 600, 0)).toBe(0);
  });
});

describe('toTScore', () => {
  it('returns exactly 50 when the raw score equals the population mean', () => {
    expect(toTScore(450, 'A10')).toBe(50);
  });

  it('clamps to 80 for scores far above the mean', () => {
    expect(toTScore(1000, 'A10')).toBe(80);
  });

  it('clamps to 20 for scores far below the mean', () => {
    expect(toTScore(0, 'A10')).toBe(20);
    expect(toTScore(-1000, 'A10')).toBe(20);
  });

  it('falls back to 50 for an unrecognized norm key instead of throwing', () => {
    expect(toTScore(999, 'NOT_A_REAL_KEY' as never)).toBe(50);
  });
});

describe('calculateIndices', () => {
  const meanRawScores: RawScores = {
    A9a_Corsi: 6.5,
    A9b_Paired: 75,
    A9c_NBack: 2.5,
    A10_Math: 450,
    A10Plus_Pattern: 50,
    A11_Speed: 60,
    A12_Visual: 50,
    A13_Orient: 60,
    A14_Stroop: 50,
    A15_Multi: 50,
    A18_Fact: 60,
  };

  it('returns 50 for every index when every raw score sits at its population mean', () => {
    expect(calculateIndices(meanRawScores)).toEqual({
      MI: 50, AI: 50, RI: 50, SI: 50, EI: 50, TCS: 50,
    });
  });

  it('propagates an above-average Reasoning score into TCS at its documented weight', () => {
    const result = calculateIndices({ ...meanRawScores, A10_Math: 1000 }); // clamps to T-score 80
    expect(result.RI).toBe(60); // round((80 + 50 + 50) / 3)
    expect(result.MI).toBe(50);
    expect(result.AI).toBe(50);
    expect(result.SI).toBe(50);
    // TCS = 50*0.20 + 50*0.20 + 60*0.25 + 50*0.15 + 50*0.20 = 52.5 -> rounds to 53
    expect(result.TCS).toBe(53);
  });
});

describe('getCareerFit', () => {
  it('rewards emotional stability in the Operations profile (Neuroticism key stores stability, high = calm)', () => {
    const base = { Openness: 50, Conscientiousness: 50, Extraversion: 50, Agreeableness: 50 };
    const calm = getCareerFit({ skills: {}, bigFive: { ...base, Neuroticism: 90 } });
    const anxious = getCareerFit({ skills: {}, bigFive: { ...base, Neuroticism: 10 } });

    const ops = (profiles: ReturnType<typeof getCareerFit>) =>
      profiles.find((p) => p.title.includes('Operations'))!.fitScore;

    expect(ops(calm)).toBeGreaterThan(ops(anxious));
  });
});

describe('getPerformanceLabel', () => {
  it.each([
    [70, 'عالی (Top 2%)'],
    [69, 'بالاتر از میانگین'],
    [60, 'بالاتر از میانگین'],
    [59, 'متوسط (نرمال)'],
    [40, 'متوسط (نرمال)'],
    [39, 'پایین‌تر از میانگین'],
    [30, 'پایین‌تر از میانگین'],
    [29, 'نیازمند توجه'],
  ])('labels a T-score of %i as %s', (score, label) => {
    expect(getPerformanceLabel(score)).toBe(label);
  });
});

describe('getTScoreColor', () => {
  it.each([
    [70, 'text-purple-600 bg-purple-100'],
    [60, 'text-emerald-600 bg-emerald-100'],
    [40, 'text-blue-600 bg-blue-100'],
    [30, 'text-amber-600 bg-amber-100'],
    [29, 'text-red-600 bg-red-100'],
  ])('colors a T-score of %i as %s', (score, className) => {
    expect(getTScoreColor(score)).toBe(className);
  });
});
