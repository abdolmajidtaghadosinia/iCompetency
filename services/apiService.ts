import type { AppView, UserProfile } from '../types';

const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || '/backend').replace(/\/+$/, '');
const TOKEN_KEY = 'iCompetency_Token';
const LEGACY_PROFILE_KEY = 'iCompetency_User';
const LEGACY_SYNCED_KEY = 'iCompetency_LegacySynced';

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

export interface AccountUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

export interface AuthPayload {
  user: AccountUser;
  profile: UserProfile;
  token?: string;
  tokenType?: 'Bearer';
}

export interface GameMutationResponse {
  profile: UserProfile;
  xpEarned?: number;
  progression?: unknown;
  nodeProgress?: unknown;
  memorySubScores?: UserProfile['memorySubScores'];
}

export interface LeaderboardItem {
  rank: number;
  name: string;
  levelNumber: number;
  levelTitle: string;
  totalXp: number;
  isMe: boolean;
}

export interface LeaderboardResponse {
  items: LeaderboardItem[];
  me: LeaderboardItem | null;
  limit: number;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = 'API_ERROR', status = 0, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const readLegacyProfile = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!raw || localStorage.getItem(LEGACY_SYNCED_KEY) === 'true') return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as UserProfile : null;
  } catch {
    return null;
  }
};

export const markLegacyProfileSynced = () => {
  try {
    localStorage.setItem(LEGACY_SYNCED_KEY, 'true');
    localStorage.removeItem(LEGACY_PROFILE_KEY);
  } catch {
    // Ignore storage failures; server state is already authoritative.
  }
};

async function apiRequest<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (requireAuth) {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch (error) {
    throw new ApiError('ارتباط با سرور برقرار نشد.', 'NETWORK_ERROR', 0, error);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = await response.json() as ApiEnvelope<T>;
  } catch {
    // Non-JSON errors are normalized below.
  }

  if (!response.ok || !payload?.ok) {
    const apiError = payload?.error;
    throw new ApiError(
      apiError?.message || 'درخواست ناموفق بود.',
      apiError?.code || `HTTP_${response.status}`,
      response.status,
      apiError?.details
    );
  }

  return payload.data as T;
}

export const profileFromAuthPayload = (payload: AuthPayload): UserProfile => ({
  ...payload.profile,
  id: payload.user.id,
  email: payload.user.email,
});

export const mergeAccountFields = (profile: UserProfile, previous: UserProfile): UserProfile => ({
  ...profile,
  id: previous.id,
  email: previous.email,
});

export async function register(email: string, password: string, name: string, role: string): Promise<AuthPayload> {
  const payload = await apiRequest<AuthPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  }, false);
  if (payload.token) setStoredToken(payload.token);
  return payload;
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const payload = await apiRequest<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false);
  if (payload.token) setStoredToken(payload.token);
  return payload;
}

export const logout = async () => {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearStoredToken();
  }
};

export const getMe = () => apiRequest<AuthPayload>('/auth/me');

export const syncProfile = (profile: UserProfile) => apiRequest<UserProfile>('/profile/sync', {
  method: 'POST',
  body: JSON.stringify({ profile }),
});

export const completeGame = (
  gameView: AppView,
  nodeId: string | null,
  rawScore: number,
  payload?: Record<string, unknown>
) => apiRequest<GameMutationResponse>('/game/complete', {
  method: 'POST',
  body: JSON.stringify({ gameView, nodeId, rawScore, payload: payload || {} }),
});

export const submitMemoryProgress = (
  subType: 'corsi' | 'pairs' | 'nback',
  score: number,
  rawScore?: number
) => apiRequest<GameMutationResponse>('/game/memory-progress', {
  method: 'POST',
  body: JSON.stringify({ subType, score, ...(rawScore !== undefined ? { rawScore } : {}) }),
});

export const submitBigFive = (scores: NonNullable<UserProfile['bigFive']>) => apiRequest<GameMutationResponse>('/game/bigfive', {
  method: 'POST',
  body: JSON.stringify({ scores }),
});

export const getLeaderboard = (limit = 20) => apiRequest<LeaderboardResponse>(`/leaderboard?limit=${limit}`);

export interface ServerJourneyNode {
  id: string;
  gameView: string;
  title: string;
  xpReward: number;
  coinReward: number;
}

export interface JourneyNodesResponse {
  order: string[];
  nodes: ServerJourneyNode[];
}

// Canonical node order/titles/rewards live on the backend (journey_nodes()
// in backend/logic/nodes.php); the frontend only keeps display metadata.
export const getJourneyNodes = () => apiRequest<JourneyNodesResponse>('/game/nodes');

export const aiGenerate = <T>(task: string, params: Record<string, unknown> = {}) => apiRequest<T>('/ai/generate', {
  method: 'POST',
  body: JSON.stringify({ task, params }),
});
