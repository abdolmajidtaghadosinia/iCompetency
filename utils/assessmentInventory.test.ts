import { describe, it, expect } from 'vitest';
import { AppView, UserProfile } from '../types';
import {
  ASSESSMENTS, getDossier, getNextAction, getEvidenceCoverage, isAssessmentDone,
} from './assessmentInventory';

const emptyRaw = {
  A9a_Corsi: 0, A9b_Paired: 0, A9c_NBack: 0, A10_Math: 0, A10Plus_Pattern: 0,
  A11_Speed: 0, A12_Visual: 0, A13_Orient: 0, A14_Stroop: 0, A15_Multi: 0, A18_Fact: 0,
};

const makeUser = (over: Partial<UserProfile> = {}): UserProfile => ({
  name: 'کاربر', role: 'متقاضی', level: 'مبتدی', levelNumber: 0,
  currentXp: 0, requiredXp: 500, totalScenarios: 0, badges: [],
  skills: {
    analysis: 0, creativity: 0, speed: 0, quality: 0, teamwork: 0, decisionMaking: 0,
    memory: 0, math: 0, perception: 0, visualization: 0, orientation: 0, focus: 0, multitasking: 0,
  },
  cognitiveProfile: { rawScores: { ...emptyRaw }, tScores: { MI: 0, AI: 0, RI: 0, SI: 0, EI: 0, TCS: 0 } },
  coins: 0, streak: 0, unlockedNodes: ['node-1'], completedNodes: [],
  ...over,
});

describe('assessment inventory', () => {
  it('covers all 14 assessments across three categories', () => {
    expect(ASSESSMENTS).toHaveLength(14);
    const counts = ASSESSMENTS.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ cognitive: 9, methodology: 4, personality: 1 });
  });

  it('every assessment has a completion signal (raw keys, method key, or personality)', () => {
    for (const a of ASSESSMENTS) {
      const hasSignal = a.category === 'personality' || !!a.methodKey || (a.rawKeys?.length ?? 0) > 0;
      expect(hasSignal, a.title).toBe(true);
    }
  });
});

describe('isAssessmentDone', () => {
  it('treats a zero raw score as not done', () => {
    const memory = ASSESSMENTS.find(a => a.view === AppView.MINIGAME_MEMORY)!;
    expect(isAssessmentDone(memory, makeUser())).toBe(false);
  });

  it('counts a cognitive game done when any of its sub-tests has a score', () => {
    const memory = ASSESSMENTS.find(a => a.view === AppView.MINIGAME_MEMORY)!;
    const user = makeUser({
      cognitiveProfile: { rawScores: { ...emptyRaw, A9b_Paired: 80 }, tScores: { MI: 55, AI: 0, RI: 0, SI: 0, EI: 0, TCS: 30 } },
    });
    expect(isAssessmentDone(memory, user)).toBe(true);
  });

  it('uses methodologyResults for methodology games and bigFive for personality', () => {
    const swot = ASSESSMENTS.find(a => a.view === AppView.MINIGAME_SWOT)!;
    const bigFive = ASSESSMENTS.find(a => a.view === AppView.MINIGAME_BIGFIVE)!;
    const user = makeUser({
      methodologyResults: { swot: { score: 64, dimensions: {} } },
      bigFive: { Openness: 60, Conscientiousness: 60, Extraversion: 60, Agreeableness: 60, Neuroticism: 60 },
    });
    expect(isAssessmentDone(swot, user)).toBe(true);
    expect(isAssessmentDone(bigFive, user)).toBe(true);
    expect(isAssessmentDone(ASSESSMENTS.find(a => a.view === AppView.MINIGAME_CYNEFIN)!, user)).toBe(false);
  });
});

describe('getDossier', () => {
  it('reports zero progress for a fresh account', () => {
    const d = getDossier(makeUser());
    expect(d.done).toBe(0);
    expect(d.total).toBe(14);
    expect(d.percent).toBe(0);
    expect(d.remaining).toHaveLength(14);
  });

  it('counts completed assessments per category', () => {
    const user = makeUser({
      cognitiveProfile: { rawScores: { ...emptyRaw, A10_Math: 70 }, tScores: { MI: 0, AI: 0, RI: 55, SI: 0, EI: 0, TCS: 20 } },
      methodologyResults: { swot: { score: 64, dimensions: {} } },
      bigFive: { Openness: 60, Conscientiousness: 60, Extraversion: 60, Agreeableness: 60, Neuroticism: 60 },
    });
    const d = getDossier(user);
    expect(d.done).toBe(3);
    const byKey = Object.fromEntries(d.categories.map(c => [c.key, c]));
    expect(byKey.cognitive.done).toBe(1);
    expect(byKey.methodology.done).toBe(1);
    expect(byKey.personality.done).toBe(1);
  });
});

describe('getNextAction', () => {
  it('recommends the personality test first — it feeds every competency', () => {
    const next = getNextAction(makeUser());
    expect(next?.assessment.view).toBe(AppView.MINIGAME_BIGFIVE);
  });

  it('once personality is done, prefers an assessment feeding an insufficient competency', () => {
    const user = makeUser({
      bigFive: { Openness: 60, Conscientiousness: 60, Extraversion: 60, Agreeableness: 60, Neuroticism: 60 },
      competencies: [
        { key: 'collaboration', title: 'همکاری و تعامل', description: '', score: 60, coverage: 0.3, insufficient: true, label: 'خوب', evidence: [] },
        { key: 'problemSolving', title: 'حل مسئله', description: '', score: 70, coverage: 1, insufficient: false, label: 'خوب', evidence: [] },
      ],
    });
    const next = getNextAction(user);
    // SJT is the only assessment feeding collaboration.
    expect(next?.assessment.view).toBe(AppView.MINIGAME_SJT);
    expect(next?.impact).toBeGreaterThan(0);
  });

  it('returns null when every assessment is complete', () => {
    const user = makeUser({
      cognitiveProfile: {
        rawScores: {
          A9a_Corsi: 6, A9b_Paired: 80, A9c_NBack: 2, A10_Math: 70, A10Plus_Pattern: 60,
          A11_Speed: 60, A12_Visual: 60, A13_Orient: 60, A14_Stroop: 60, A15_Multi: 60, A18_Fact: 70,
        },
        tScores: { MI: 55, AI: 55, RI: 55, SI: 55, EI: 55, TCS: 55 },
      },
      methodologyResults: {
        '5whys': { score: 70, dimensions: {} }, swot: { score: 64, dimensions: {} },
        cynefin: { score: 61, dimensions: {} }, sjt: { score: 68, dimensions: {} },
      },
      bigFive: { Openness: 60, Conscientiousness: 60, Extraversion: 60, Agreeableness: 60, Neuroticism: 60 },
    });
    expect(getDossier(user).done).toBe(14);
    expect(getNextAction(user)).toBeNull();
  });
});

describe('getEvidenceCoverage', () => {
  it('is null before anything is scored', () => {
    expect(getEvidenceCoverage(makeUser())).toBeNull();
  });

  it('averages coverage across scored competencies only', () => {
    const user = makeUser({
      competencies: [
        { key: 'a', title: 'A', description: '', score: 60, coverage: 1, insufficient: false, label: 'خوب', evidence: [] },
        { key: 'b', title: 'B', description: '', score: 50, coverage: 0.5, insufficient: false, label: 'متوسط', evidence: [] },
        { key: 'c', title: 'C', description: '', score: null, coverage: 0, insufficient: true, label: null, evidence: [] },
      ],
    });
    expect(getEvidenceCoverage(user)).toBe(75);
  });
});
