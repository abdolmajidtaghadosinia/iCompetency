import { Scenario, EvaluationResult, UserResponse, UserProfile, FiveWhysData, SwotData, CynefinData, FactFindingScenario } from "../types";
import { aiGenerate } from "./apiService";

export const generateScenario = async (
  difficulty: string,
  industry: string,
  focusArea: string,
  methodology: 'Polya' | 'SixSigma' = 'Polya'
): Promise<Scenario> => {
  return aiGenerate<Scenario>('generateScenario', { difficulty, industry, focusArea, methodology });
};

export const evaluateSession = async (scenario: Scenario, responses: UserResponse[]): Promise<EvaluationResult> => {
  return aiGenerate<EvaluationResult>('evaluateSession', { scenario, responses });
};

export const getCoachingTip = async (profile: UserProfile): Promise<string> => {
  const result = await aiGenerate<{ tip: string }>('getCoachingTip', { profile });
  return result.tip;
};

export const generateFiveWhysData = async (): Promise<FiveWhysData> => {
  return aiGenerate<FiveWhysData>('generateFiveWhysData');
};

export const validateTextAnswer = async (
  userText: string,
  idealText: string,
  context: string
): Promise<{ isCorrect: boolean; feedback: string; similarity: number }> => {
  return aiGenerate<{ isCorrect: boolean; feedback: string; similarity: number }>('validateTextAnswer', {
    userText,
    idealText,
    context,
  });
};

export const generateSwotData = async (): Promise<SwotData> => {
  return aiGenerate<SwotData>('generateSwotData');
};

export const generateCynefinData = async (): Promise<CynefinData> => {
  return aiGenerate<CynefinData>('generateCynefinData');
};

export const generateFactFindingScenario = async (): Promise<FactFindingScenario> => {
  return aiGenerate<FactFindingScenario>('generateFactFindingScenario');
};