
// utils/scoring.ts

// --- Constants & Norms (Simulated based on v2.0 Spec) ---
const NORMS = {
  // Mean and Standard Deviation for T-Score Calculation (Population Norms)
  A9a: { mean: 6.5, sd: 1.5 },   // Corsi Span
  A9b: { mean: 75, sd: 15 },     // Paired Accuracy
  A9c: { mean: 2.5, sd: 1.0 },   // N-Back d-prime (Typical d' ranges 0-4)
  A10: { mean: 450, sd: 150 },   // Math Weighted Score
  A10Plus: { mean: 50, sd: 20 }, // Pattern Score
  A11: { mean: 60, sd: 15 },     // Speed Score
  A12: { mean: 50, sd: 20 },     // Visualization Score
  A13: { mean: 60, sd: 20 },     // Orientation Score
  A14: { mean: 50, sd: 15 },     // Stroop Inhibition Score
  A15: { mean: 50, sd: 15 },     // Multitask Score
  A18: { mean: 60, sd: 20 }      // Fact Finding
};

export interface RawScores {
  A9a_Corsi: number;
  A9b_Paired: number;
  A9c_NBack: number;
  A10_Math: number;
  A10Plus_Pattern: number;
  A11_Speed: number;
  A12_Visual: number;
  A13_Orient: number;
  A14_Stroop: number;
  A15_Multi: number;
  A18_Fact: number;
}

export interface TScores {
  MI: number; // Memory Index
  AI: number; // Attention Index
  RI: number; // Reasoning Index
  SI: number; // Spatial Index
  EI: number; // Executive Index
  TCS: number; // Total Cognitive Score
}

// --- Statistical Functions ---

// Inverse Error Function approximation for Z-score calculation
function probit(p: number): number {
  // Handle edge cases to avoid Infinity
  if (p >= 1) p = 0.999;
  if (p <= 0) p = 0.001;
  
  const a1 =  -39.69683028665376;
  const a2 =   220.9460984245205;
  const a3 =  -275.9285104469687;
  const a4 =   138.3577518672690;
  const a5 =  -30.66479806614716;
  const a6 =   2.506628277459239;

  const b1 =  -54.47609879822406;
  const b2 =   161.5858368580409;
  const b3 =  -155.6989798598866;
  const b4 =   66.80131188771972;
  const b5 =  -13.28068155288572;

  const c1 =  -0.007784894002430293;
  const c2 =  -0.3223964580411365;
  const c3 =  -2.400758277161838;
  const c4 =  -2.549732539343734;
  const c5 =   4.374664141464968;
  const c6 =   2.938163982698783;

  const d1 =   0.007784695709041462;
  const d2 =   0.3224671290700398;
  const d3 =   2.445134137142996;
  const d4 =   3.754408661907416;

  const p_low = 0.02425;
  const p_high = 1 - p_low;

  let q, r;

  if (p < p_low) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
             ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  if (p <= p_high) {
      q = p - 0.5;
      r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
             (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }

  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
          ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

// --- Specific Game Calculators ---

/**
 * Calculates d-prime for N-Back
 * d' = Z(Hit Rate) - Z(False Alarm Rate)
 */
export const calculateDPrime = (hits: number, targets: number, falseAlarms: number, nonTargets: number): number => {
    const hitRate = targets > 0 ? hits / targets : 0;
    const faRate = nonTargets > 0 ? falseAlarms / nonTargets : 0;
    
    // Avoid Z(0) or Z(1) which are infinite
    const adjustedHit = Math.max(0.01, Math.min(0.99, hitRate));
    const adjustedFA = Math.max(0.01, Math.min(0.99, faRate));

    const dPrime = probit(adjustedHit) - probit(adjustedFA);
    // d' typically ranges from 0 (random) to 4.6 (perfect). We clamp negative values (worse than random).
    return Math.max(0, dPrime);
};

/**
 * Calculates Stroop Inhibition Score on a 0-100 scale.
 * Score = (1000 / interference_ms) * accuracy * 10, capped at 100.
 * Higher is better. The scale matches the A14 norm (mean 50, sd 15):
 * ~200ms interference at 90% accuracy lands near the mean, while the
 * previous unscaled formula produced 300-600 for typical runs and pinned
 * every player's T-score at the 80 clamp.
 */
export const calculateStroopScore = (rtIncongruent: number, rtCongruent: number, accuracy: number): number => {
    // Prevent division by zero or negative interference (which means user is superhuman or data is noisy)
    const interference = Math.max(50, rtIncongruent - rtCongruent); // Minimum 50ms interference assumed
    return Math.min(100, Math.round((1000 / interference) * accuracy * 10));
};

// --- General Scoring ---

export const toTScore = (raw: number, key: keyof typeof NORMS): number => {
  const norm = NORMS[key];
  if (!norm) return 50;
  
  let t = 50 + 10 * ((raw - norm.mean) / norm.sd);
  return Math.max(20, Math.min(80, Math.round(t)));
};

export const calculateIndices = (raw: RawScores): TScores => {
  // 1. Memory Index (MI) - Weighted Average
  const tA9a = toTScore(raw.A9a_Corsi, 'A9a');
  const tA9b = toTScore(raw.A9b_Paired, 'A9b');
  const tA9c = toTScore(raw.A9c_NBack, 'A9c');
  const MI = Math.round((tA9a + tA9b + tA9c) / 3);

  // 2. Attention Index (AI)
  const tA11 = toTScore(raw.A11_Speed, 'A11');
  const tA14 = toTScore(raw.A14_Stroop, 'A14');
  const tA15 = toTScore(raw.A15_Multi, 'A15');
  const AI = Math.round((tA11 + tA14 + tA15) / 3);

  // 3. Reasoning Index (RI)
  const tA10 = toTScore(raw.A10_Math, 'A10');
  const tA10Plus = toTScore(raw.A10Plus_Pattern, 'A10Plus');
  const tA18 = toTScore(raw.A18_Fact, 'A18');
  const RI = Math.round((tA10 + tA10Plus + tA18) / 3);

  // 4. Spatial Index (SI)
  const tA12 = toTScore(raw.A12_Visual, 'A12');
  const tA13 = toTScore(raw.A13_Orient, 'A13');
  const SI = Math.round((tA12 + tA13) / 2);

  // 5. Executive Index (EI)
  const EI = Math.round((tA14 + tA15 + tA10Plus) / 3);

  // 6. Total Cognitive Score (TCS)
  const TCS = Math.round(
    (MI * 0.20) + (AI * 0.20) + (RI * 0.25) + (SI * 0.15) + (EI * 0.20)
  );

  return { MI, AI, RI, SI, EI, TCS };
};

export const getPerformanceLabel = (tScore: number): string => {
  if (tScore >= 70) return 'عالی (Top 2%)';
  if (tScore >= 60) return 'بالاتر از میانگین';
  if (tScore >= 40) return 'متوسط (نرمال)';
  if (tScore >= 30) return 'پایین‌تر از میانگین';
  return 'نیازمند توجه';
};

export const getTScoreColor = (tScore: number): string => {
    if (tScore >= 70) return 'text-purple-600 bg-purple-100';
    if (tScore >= 60) return 'text-emerald-600 bg-emerald-100';
    if (tScore >= 40) return 'text-blue-600 bg-blue-100';
    if (tScore >= 30) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
};

// --- Career Profiling (Combinatorial Analysis) ---

export interface CareerProfile {
  title: string;
  description: string;
  fitScore: number; // 0-100
  keyTraits: string[];
}

export const getCareerFit = (user: any): CareerProfile[] => {
    // Default safe values if data missing
    const scores = user.skills || {};
    // Note: BigFiveGame scores the 'Neuroticism' key so that HIGH = emotionally
    // stable (calm answers score +2; the radar labels it "ثبات"), so stability
    // contributes positively below rather than being subtracted.
    const big5 = user.bigFive || { Openness: 50, Conscientiousness: 50, Extraversion: 50, Agreeableness: 50, Neuroticism: 50 };

    // Derived Indices (Approximated from raw skills if T-Scores not fully avail)
    const analytical = ((scores.math || 0) + (scores.analysis || 0)) / 2;
    const spatial = ((scores.visualization || 0) + (scores.orientation || 0)) / 2;
    const executive = ((scores.focus || 0) + (scores.multitasking || 0)) / 2;

    const profiles: CareerProfile[] = [
        {
            title: "تحقیق و توسعه (R&D)",
            description: "حل مسائل پیچیده و نوآوری تکنیکال",
            fitScore: Math.max(0, Math.min(100, Math.round((analytical * 0.4) + (spatial * 0.2) + (big5.Openness * 0.4)))),
            keyTraits: ["تحلیل‌گری بالا", "گشودگی به تجربه", "تجسم فضایی"]
        },
        {
            title: "مدیریت عملیات (Operations)",
            description: "نظم‌دهی، کارایی و مدیریت منابع",
            fitScore: Math.max(0, Math.min(100, Math.round((executive * 0.3) + (big5.Conscientiousness * 0.5) + (big5.Neuroticism * 0.2)))),
            keyTraits: ["وجدان کاری بالا", "تمرکز اجرایی", "ثبات هیجانی"]
        },
        {
            title: "مدیریت محصول (Product)",
            description: "تعادل بین نیاز کاربر، فنی و بیزنس",
            fitScore: Math.max(0, Math.min(100, Math.round((analytical * 0.3) + (big5.Extraversion * 0.3) + (big5.Openness * 0.2) + (big5.Agreeableness * 0.2)))),
            keyTraits: ["جامع‌نگری", "تعامل اجتماعی", "نوآوری"]
        },
        {
            title: "فروش و بازاریابی",
            description: "ارتباط موثر و اقناع",
            fitScore: Math.max(0, Math.min(100, Math.round((big5.Extraversion * 0.6) + (big5.Agreeableness * 0.2) + (executive * 0.2)))),
            keyTraits: ["برون‌گرایی بالا", "انرژی اجتماعی", "سرعت پردازش"]
        }
    ];

    return profiles.sort((a, b) => b.fitScore - a.fitScore);
};
