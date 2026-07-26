// utils/assessmentInventory.ts
//
// The dashboard's information architecture is built around one idea: the
// product's results are only as trustworthy as the evidence behind them
// (see docs/competency-matrix.md and docs/career-fit.md, where every score
// ships with a coverage figure and an "insufficient evidence" flag).
//
// So instead of gamifying raw XP, this module models the user's *assessment
// dossier*: which of the 14 assessments are done, what each one unlocks, and
// which single one to take next for the biggest gain in evidence coverage.
// Everything here is derived from the server-authoritative profile — nothing
// is scored client-side.

import { AppView, UserProfile } from '../types';

export type AssessmentCategory = 'cognitive' | 'methodology' | 'personality';

export interface AssessmentDef {
  view: AppView;
  code: string;
  title: string;
  category: AssessmentCategory;
  /** Persian phrase describing what completing this unlocks. */
  unlocks: string;
  /** Competency keys this assessment feeds (docs/competency-matrix.md). */
  feeds: string[];
  /** Raw-score keys that prove completion (cognitive games only). */
  rawKeys?: string[];
  /** Methodology result key that proves completion. */
  methodKey?: string;
}

export const ASSESSMENTS: AssessmentDef[] = [
  // --- Cognitive battery (Razi model) ---
  { view: AppView.MINIGAME_MEMORY, code: 'A9', title: 'حافظه جامع', category: 'cognitive',
    unlocks: 'یادگیری‌پذیری', feeds: ['learningAgility'], rawKeys: ['A9a_Corsi', 'A9b_Paired', 'A9c_NBack'] },
  { view: AppView.MINIGAME_MATH, code: 'A10', title: 'هوش محاسباتی', category: 'cognitive',
    unlocks: 'حل مسئله', feeds: ['problemSolving'], rawKeys: ['A10_Math'] },
  { view: AppView.MINIGAME_PATTERN, code: 'A10+', title: 'تطابق الگو', category: 'cognitive',
    unlocks: 'تفکر استراتژیک', feeds: ['problemSolving', 'strategicThinking'], rawKeys: ['A10Plus_Pattern'] },
  { view: AppView.MINIGAME_SPEED, code: 'A11', title: 'سرعت ادراکی', category: 'cognitive',
    unlocks: 'تمرکز و یادگیری‌پذیری', feeds: ['attentionControl', 'learningAgility'], rawKeys: ['A11_Speed'] },
  { view: AppView.MINIGAME_VISUALIZATION, code: 'A12', title: 'تجسم فضایی', category: 'cognitive',
    unlocks: 'نیمرخ فضایی', feeds: [], rawKeys: ['A12_Visual'] },
  { view: AppView.MINIGAME_ORIENTATION, code: 'A13', title: 'جهت‌یابی', category: 'cognitive',
    unlocks: 'نیمرخ فضایی', feeds: [], rawKeys: ['A13_Orient'] },
  { view: AppView.MINIGAME_STROOP, code: 'A14', title: 'قدرت تمرکز', category: 'cognitive',
    unlocks: 'تمرکز و عملکرد زیر فشار', feeds: ['attentionControl', 'stressResilience'], rawKeys: ['A14_Stroop'] },
  { view: AppView.MINIGAME_MULTITASK, code: 'A15', title: 'مدیریت همزمان', category: 'cognitive',
    unlocks: 'تمرکز و عملکرد زیر فشار', feeds: ['attentionControl', 'stressResilience'], rawKeys: ['A15_Multi'] },
  { view: AppView.MINIGAME_FACTFINDING, code: 'A18', title: 'حقیقت‌یابی', category: 'cognitive',
    unlocks: 'تصمیم‌گیری و حل مسئله', feeds: ['problemSolving', 'decisionMaking'], rawKeys: ['A18_Fact'] },

  // --- Applied methodology (rubric-scored) ---
  { view: AppView.MINIGAME_5WHYS, code: '5W', title: 'ریشه‌یابی (۵ چرا)', category: 'methodology',
    unlocks: 'حل مسئله', feeds: ['problemSolving'], methodKey: '5whys' },
  { view: AppView.MINIGAME_SWOT, code: 'SWOT', title: 'تحلیل SWOT', category: 'methodology',
    unlocks: 'تفکر استراتژیک', feeds: ['strategicThinking'], methodKey: 'swot' },
  { view: AppView.MINIGAME_CYNEFIN, code: 'CYN', title: 'چارچوب Cynefin', category: 'methodology',
    unlocks: 'تصمیم‌گیری', feeds: ['decisionMaking'], methodKey: 'cynefin' },
  { view: AppView.MINIGAME_SJT, code: 'SJT', title: 'قضاوت موقعیتی', category: 'methodology',
    unlocks: 'همکاری و تعامل', feeds: ['collaboration'], methodKey: 'sjt' },

  // --- Personality (feeds almost every competency) ---
  { view: AppView.MINIGAME_BIGFIVE, code: 'B5', title: 'آزمون شخصیت', category: 'personality',
    unlocks: 'لایه شخصیتی همه شایستگی‌ها', feeds: ['problemSolving', 'decisionMaking', 'strategicThinking', 'learningAgility', 'attentionControl', 'stressResilience', 'collaboration'] },
];

export const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  cognitive: 'شناختی',
  methodology: 'روش‌شناختی',
  personality: 'شخصیتی',
};

/** Has the user completed this assessment? Uses server-provided evidence only. */
export const isAssessmentDone = (a: AssessmentDef, user: UserProfile): boolean => {
  if (a.category === 'personality') return !!user.bigFive;
  if (a.methodKey) return !!user.methodologyResults?.[a.methodKey];
  const raw = user.cognitiveProfile?.rawScores as Record<string, number> | undefined;
  // Any of the sub-tests counts as started; all raw keys default to 0.
  return !!a.rawKeys?.some(k => (raw?.[k] ?? 0) > 0);
};

export interface DossierCategory {
  key: AssessmentCategory;
  label: string;
  done: number;
  total: number;
}

export interface Dossier {
  done: number;
  total: number;
  percent: number;
  categories: DossierCategory[];
  remaining: AssessmentDef[];
}

export const getDossier = (user: UserProfile): Dossier => {
  const done: AssessmentDef[] = [];
  const remaining: AssessmentDef[] = [];
  ASSESSMENTS.forEach(a => (isAssessmentDone(a, user) ? done : remaining).push(a));

  const categories = (Object.keys(CATEGORY_LABELS) as AssessmentCategory[]).map(key => {
    const all = ASSESSMENTS.filter(a => a.category === key);
    return {
      key,
      label: CATEGORY_LABELS[key],
      done: all.filter(a => isAssessmentDone(a, user)).length,
      total: all.length,
    };
  });

  return {
    done: done.length,
    total: ASSESSMENTS.length,
    percent: Math.round((done.length / ASSESSMENTS.length) * 100),
    categories,
    remaining,
  };
};

export interface NextAction {
  assessment: AssessmentDef;
  /** Persian sentence explaining why this one is the highest-value next step. */
  reason: string;
  /** How many competencies it would move out of "insufficient evidence". */
  impact: number;
}

/**
 * Picks the single highest-impact assessment to take next.
 *
 * Ranking rationale: an assessment is worth more when it feeds competencies
 * that are currently evidence-starved (`insufficient`) or unscored, because
 * that is exactly what turns a tentative number into a defensible one. Big
 * Five wins early because its layer is weighted into every competency.
 */
export const getNextAction = (user: UserProfile): NextAction | null => {
  const dossier = getDossier(user);
  if (dossier.remaining.length === 0) return null;

  const comps = user.competencies ?? [];
  const weakKeys = new Set(
    comps.filter(c => c.score === null || c.insufficient).map(c => c.key)
  );
  // Before any competency exists, every competency counts as weak.
  const noCompetenciesYet = comps.length === 0;

  const scored = dossier.remaining.map(a => {
    const impact = noCompetenciesYet
      ? a.feeds.length
      : a.feeds.filter(f => weakKeys.has(f)).length;
    // Personality is the single widest lever: it contributes to every
    // competency and to the career-fit personality features.
    const bonus = a.category === 'personality' ? 3 : 0;
    return { a, impact, rank: impact + bonus };
  });

  scored.sort((x, y) => y.rank - x.rank || y.impact - x.impact);
  const best = scored[0];

  const reason =
    best.a.category === 'personality'
      ? 'لایه شخصیتی در وزن هر هفت شایستگی و تحلیل شغلی شما تأثیر دارد؛ بدون آن، نتایج با «شواهد ناکافی» علامت می‌خورند.'
      : best.impact > 0
        ? `این آزمون شواهد ${best.a.unlocks} را کامل می‌کند و نتیجه آن را از حالت «شواهد ناکافی» خارج می‌کند.`
        : `این آزمون دقت سنجش ${best.a.unlocks} را بالا می‌برد و پرونده شما را کامل‌تر می‌کند.`;

  return { assessment: best.a, reason, impact: best.impact };
};

/** Average evidence coverage across scored competencies (0-100), or null. */
export const getEvidenceCoverage = (user: UserProfile): number | null => {
  const comps = (user.competencies ?? []).filter(c => c.score !== null);
  if (comps.length === 0) return null;
  return Math.round((comps.reduce((s, c) => s + c.coverage, 0) / comps.length) * 100);
};
