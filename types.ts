
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
  // Server-computed O*NET-anchored person-environment career fit
  // (docs/career-fit.md). Advisory/exploratory — never a hiring verdict.
  careerFit?: CareerFitResult[];
  // Active organization memberships (docs/organizations.md) and whether this
  // account is a platform admin. Both are server-provided.
  organizations?: OrgMembership[];
  platformAdmin?: boolean;
}

export interface CareerFitResult {
  key: string;
  title: string;
  description: string;
  onet: string;    // anchoring O*NET occupation code
  riasec: string;  // Holland letters of the anchored occupation
  fitScore: number | null; // 0-100, null when nothing is measured yet
  coverage: number;        // share of requirement weight actually measured
  insufficient: boolean;   // coverage < 0.5 — tentative, not a verdict
  strengths: string[];     // best-satisfied requirement labels (Persian)
  gaps: string[];          // weakest requirement labels (Persian)
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
  ADMIN = 'ADMIN',         // organization admin panel (/admin/*)
  JOIN_ORG = 'JOIN_ORG',   // invite acceptance (/join?token=)
  JOURNEY_MAP = 'JOURNEY_MAP',
  MINIGAME_HUB = 'MINIGAME_HUB', 
  VERIFIED_RESUME = 'VERIFIED_RESUME', 
  
  MINIGAME_5WHYS = 'MINIGAME_5WHYS',
  MINIGAME_SWOT = 'MINIGAME_SWOT',
  MINIGAME_CYNEFIN = 'MINIGAME_CYNEFIN',
  MINIGAME_SJT = 'MINIGAME_SJT',
  
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
    // Pick-the-deeper-cause: exactly one option is the genuine next cause in
    // the chain (isRootCausePath), the others are symptoms / lateral blame /
    // premature solutions. Deterministic — no per-answer AI grading.
    options: { text: string; isRootCausePath: boolean; feedback: string }[];
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

// Interpersonal Situational Judgment Test. Each scenario's options carry a
// unique effectiveness rank 0-3 (3 = best action, 0 = worst); the player
// picks the most AND least effective action (classic SJT format).
export type SjtDimension = 'conflictManagement' | 'teamCommunication' | 'empathySupport';

export interface SjtData {
  scenarios: {
    context: string;
    dimension: string; // one of SjtDimension; unknown values are canonicalized
    options: { text: string; effectiveness: number; feedback: string }[];
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

// ---- Organizations (docs/organizations.md) --------------------------------------

export type OrgRole = 'member' | 'manager' | 'admin';
export type OrgMemberStatus = 'invited' | 'active' | 'inactive' | 'left';
export type OrgAccessRole = 'super' | 'admin' | 'manager';

export interface OrgMembership {
  memberId: number;
  orgId: number;
  orgName: string;
  orgRole: OrgRole;
  jobTitle: string | null;
  unitPath: string | null;
  requiredAssessments: string[];
  dueDate: string | null;
  joinedAt: string | null;
}

export interface Organization {
  id: number;
  name: string;
  industry: string | null;
  description: string | null;
  status: 'active' | 'suspended';
  seatLimit: number | null;
  requiredAssessments: string[];
  dueDate: string | null;
  createdAt: string;
}

export interface OrgListItem extends Organization {
  counts: { total: number; active: number; invited: number; admins: number };
}

export interface OrgUnit {
  id: number;
  name: string;
  code: string | null;
  parentId: number | null;
  path: string;
  depth: number;
  memberCount: number;
}

export interface OrgCatalogItem {
  view: string;
  code: string;
  title: string;
  category: 'cognitive' | 'methodology' | 'personality';
}

export interface OrgWorkspace {
  organization: Organization;
  role: OrgAccessRole;
  scopeUnitIds: number[] | null;
  units: OrgUnit[];
  seats: { used: number; limit: number | null };
  catalog: OrgCatalogItem[];
  inviteTtlDays: number;
}

export interface OrgMemberSummary {
  id: number;
  userId: number | null;
  fullName: string;
  email: string;
  accountEmail: string | null;
  employeeCode: string | null;
  jobTitle: string | null;
  unitId: number | null;
  unitPath: string | null;
  orgRole: OrgRole;
  status: OrgMemberStatus;
  invitedAt: string | null;
  inviteExpiresAt: string | null;
  joinedAt: string | null;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  requiredDone: number;
  requiredTotal: number;
  completionPct: number;
  completedAssessments: string[];
  overallScore: number | null;
  competencies: Record<string, number | null>;
  bigFiveValidity: 'valid' | 'caution' | 'invalid' | null;
}

export interface OrgInvite {
  token: string;
  expiresAt: string;
  emailed: boolean;
}

export interface OrgUnitRollup {
  id: number; // 0 = members without a unit
  name: string;
  path: string;
  parentId: number | null;
  depth: number;
  headcount: number;
  active: number;
  completionPct: number;
  overallMean: number | null;
  competencies: Record<string, { mean: number | null; n: number }>;
}

export interface OrgDashboardData {
  generatedAt: string;
  scope: { unitId: number | null; unitPath: string | null; restricted: boolean };
  headcount: { total: number; invited: number; active: number; inactive: number; left: number };
  funnel: { invited: number; joined: number; started: number; completed: number };
  completion: { requiredCount: number; avgPct: number; dueDate: string | null; daysLeft: number | null; overdue: number };
  overallMean: number | null;
  assessments: { view: string; code: string; title: string; category: string; required: boolean; done: number; of: number }[];
  competencies: { key: string; title: string; n: number; mean: number | null; buckets: Record<'develop' | 'average' | 'good' | 'strong', number> }[];
  cognitive: { key: string; title: string; n: number; meanT: number | null }[];
  bigFive: { n: number; invalidExcluded: number; traits: Record<string, number | null> };
  units: OrgUnitRollup[];
  recent: { memberId: number; fullName: string; view: string; title: string; at: string }[];
  followUp: {
    notJoinedCount: number;
    noProgressCount: number;
    notJoined: { id: number; fullName: string; email: string; unitPath: string | null; since: string | null }[];
    noProgress: { id: number; fullName: string; email: string; unitPath: string | null; since: string | null }[];
  };
}

export interface OrgMemberReport {
  member: OrgMemberSummary;
  report: null | {
    competencies: CompetencyResult[];
    careerFit: CareerFitResult[];
    bigFive: UserProfile['bigFive'] | null;
    methodology: Record<string, { score: number; dimensions: Record<string, number>; updatedAt?: string }>;
    cognitiveTests: { key: string; title: string; tScore: number | null; label: string | null }[];
    assessments: { view: string; code: string; title: string; category: string; required: boolean; done: boolean }[];
    history: { view: string; title: string; rawScore: number; at: string }[];
  };
}

export interface OrgImportRow {
  fullName: string;
  email: string;
  unit?: string;
  jobTitle?: string;
  employeeCode?: string;
  orgRole?: OrgRole;
}

export interface OrgImportResult {
  dryRun: boolean;
  summary: { created: number; updated: number; skipped: number; errors: number; total: number; newUnits: string[] };
  rows: {
    row: number;
    email: string | null;
    fullName: string | null;
    status: 'created' | 'updated' | 'skipped' | 'error';
    message: string | null;
    memberId?: number;
    inviteToken?: string;
    expiresAt?: string;
    emailed?: boolean;
  }[];
}

export interface OrgAuditEntry {
  id: number;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  actorName: string | null;
  at: string;
}

export interface InviteInfo {
  orgName: string;
  fullName: string;
  email: string;
  unitPath: string | null;
  jobTitle: string | null;
  orgRole: OrgRole;
  expired: boolean;
  orgActive: boolean;
}
