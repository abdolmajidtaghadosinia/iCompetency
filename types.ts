
export interface UserProfile {
  id?: number;
  email?: string;
  name: string;
  role: string;
  level: string;
  levelNumber: number; 
  currentXp: number;   
  requiredXp: number;  
  totalScenarios: number;
  badges: string[];
  skills: SkillMatrix; // Legacy skills for backward compatibility
  
  // New Razi Model Cognitive Profile
  cognitiveProfile: {
    rawScores: {
      A9a_Corsi: number;      // Max Span
      A9b_Paired: number;     // Accuracy %
      A9c_NBack: number;      // d-prime * 100 or Score
      A10_Math: number;       // Score
      A10Plus_Pattern: number;// Score
      A11_Speed: number;      // Score
      A12_Visual: number;     // Score
      A13_Orient: number;     // Score
      A14_Stroop: number;     // Inhibition Score
      A15_Multi: number;      // Efficiency Score
      A18_Fact: number;       // Efficiency
    };
    tScores: {
      MI: number; // Memory Index
      AI: number; // Attention Index
      RI: number; // Reasoning Index
      SI: number; // Spatial Index
      EI: number; // Executive Index
      TCS: number; // Total Cognitive Score
    };
  };

  coins: number;       
  streak: number;      
  unlockedNodes: string[]; 
  completedNodes: string[]; 
  // Legacy support
  memorySubScores?: {
    corsi: number;
    pairs: number;
    nback: number;
  };
  bigFive?: {
    Openness: number;
    Conscientiousness: number;
    Extraversion: number;
    Agreeableness: number;
    Neuroticism: number;
    // Server-computed response-validity verdict (attention check, consistency
    // pairs, response times). null/absent = unknown (recorded pre-upgrade).
    _validity?: 'valid' | 'caution' | 'invalid' | null;
  };
  // Latest rubric result per methodology game (5whys/swot/cynefin), derived
  // server-side from the analytical payload stored in game_results.
  methodologyResults?: Record<string, {
    score: number;
    dimensions: Record<string, number>;
    updatedAt?: string;
  }>;
  // Server-computed competency matrix (docs/competency-matrix.md): each
  // org-facing competency blends cognitive T-scores, Big Five and methodology
  // rubrics. The frontend only renders this — it never computes it.
  competencies?: CompetencyResult[];
}

// Raw response-quality indicators collected by BigFiveGame. The server turns
// these into the _validity verdict — the client never grades itself.
export interface BigFiveValidityIndicators {
  tooFastCount: number;
  itemCount: number;
  inconsistentPairs: number;
  pairCount: number;
  attentionFailed: number;
  attentionCount: number;
  medianItemMs: number;
}

export interface CompetencyEvidence {
  layer: 'cognitive' | 'personality' | 'methodology';
  label: string;
  weight: number;
  available: boolean;
  score: number | null;
}

export interface CompetencyResult {
  key: string;
  title: string;
  description: string;
  score: number | null;   // 0-100, null when no evidence layer is present yet
  coverage: number;       // 0-1 share of intended evidence weight available
  insufficient: boolean;  // coverage < 0.5 — render as tentative, not a verdict
  label: string | null;
  evidence: CompetencyEvidence[];
}

export interface SkillMatrix {
  analysis: number;
  creativity: number;
  speed: number;
  quality: number;
  teamwork: number;
  decisionMaking: number;
  memory: number;        
  math: number;          
  perception: number;    
  visualization: number; 
  orientation: number;   
  focus: number;         
  multitasking: number;  
}

export interface ScenarioPhase {
  id: string;
  title: string;
  description: string;
  question: string;
  type: 'text' | 'multiple_choice' | 'decision';
  options?: string[]; 
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  industry: string;
  description: string;
  timeLimitMinutes: number;
  methodology: 'Polya' | 'SixSigma' | 'DesignThinking' | 'General';
  phases: ScenarioPhase[];
}

export interface UserResponse {
  phaseId: string;
  answer: string;
  timeSpentSeconds: number;
}

export interface EvaluationResult {
  score: number;
  level: string;
  breakdown: {
    understanding: number;
    planning: number;
    execution: number;
    review: number;
    creativity: number; 
  };
  feedback: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  timeAnalysis: {
    totalTime: number;
    efficiencyScore: number;
  };
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  JOURNEY_MAP = 'JOURNEY_MAP',
  MINIGAME_HUB = 'MINIGAME_HUB', 
  VERIFIED_RESUME = 'VERIFIED_RESUME', 
  
  MINIGAME_5WHYS = 'MINIGAME_5WHYS',
  MINIGAME_SWOT = 'MINIGAME_SWOT',
  MINIGAME_CYNEFIN = 'MINIGAME_CYNEFIN',
  
  // Cognitive Games (Razi Model A9-A15)
  MINIGAME_MEMORY = 'MINIGAME_MEMORY',      // A9
  MINIGAME_MATH = 'MINIGAME_MATH',          // A10
  MINIGAME_SPEED = 'MINIGAME_SPEED',        // A11
  MINIGAME_VISUALIZATION = 'MINIGAME_VISUALIZATION', // A12
  MINIGAME_ORIENTATION = 'MINIGAME_ORIENTATION', // A13
  MINIGAME_STROOP = 'MINIGAME_STROOP',      // A14
  MINIGAME_MULTITASK = 'MINIGAME_MULTITASK', // A15
  MINIGAME_PATTERN = 'MINIGAME_PATTERN', // A10+
  MINIGAME_FACTFINDING = 'MINIGAME_FACTFINDING', // A18
  MINIGAME_ROLEPLAY = 'MINIGAME_ROLEPLAY', // Roleplay Variant
  
  MINIGAME_BIGFIVE = 'MINIGAME_BIGFIVE'
}

export interface JourneyNode {
  id: string;
  view: AppView;
  title: string;
  type: 'Game' | 'Assessment' | 'Boss';
  icon: any;
  xpReward: number;
  coinReward: number;
  requiredNodeId?: string; 
  position: 'left' | 'center' | 'right';
}

// Mini Game Types
// `_fallback` is set by the backend when the AI generation failed and canned
// offline content was returned instead; games use it to avoid recording a
// score on a run the user didn't really face.
export interface FiveWhysData {
  problemStatement: string;
  levels: {
    level: number;
    question: string;
    idealAnswer: string; // Used for semantic matching
    hint: string;
  }[];
  _fallback?: boolean;
}

export interface SwotData {
  companyContext: string;
  items: { text: string; category: 'S'|'W'|'O'|'T'; reason: string }[];
  strategyPhase: {
    question: string;
    options: { text: string; isCorrect: boolean; feedback: string }[];
  };
  _fallback?: boolean;
}

export interface CynefinData {
  scenarios: {
    description: string;
    correctDomain: string; // Simple, Complicated, etc.
    options: { text: string; isCorrect: boolean; feedback: string }[]; // Behavioral options
  }[];
  _fallback?: boolean;
}

// --- Fact Finding Types ---
export type FactSourceType = 'HUMINT' | 'SIGINT' | 'OSINT';

export interface FactAction {
  id: string;
  label: string;
  cost: number;
  riskLevel: 'Low' | 'Medium' | 'High'; 
  content: string;
  isCrucial: boolean;
}

export interface FactSource {
  id: string;
  name: string;
  role: string;
  type: FactSourceType;
  reliability: number; // 0-100%
  description: string;
  actions: FactAction[];
}

export interface FactCategory {
  id: string;
  title: string;
  sources: FactSource[];
}

export interface FactFindingScenario {
  id: string;
  title: string;
  context: string;
  budget: number;
  categories: FactCategory[];
  options: { id: string; text: string; isCorrect: boolean; feedback: string }[];
  _fallback?: boolean;
}
