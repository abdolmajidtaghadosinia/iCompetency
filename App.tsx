
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import JourneyMap from './components/JourneyMap';
import MiniGameHub from './components/MiniGameHub';
import VerifiedResume from './components/VerifiedResume';
import BackgroundQuotes from './components/BackgroundQuotes';
import BigFiveGame from './components/BigFiveGame';
import AuthScreen from './components/AuthScreen';
import Toast, { ToastData } from './components/Toast';

// Methodology Games
import FiveWhysGame from './components/FiveWhysGame';
import SwotGame from './components/SwotGame';
import CynefinGame from './components/CynefinGame';

// Cognitive Games (Razi Model A9-A15)
import MemoryGame from './components/MemoryGame';
import MathGame from './components/MathGame';
import SpeedGame from './components/SpeedGame';
import VisualizationGame from './components/VisualizationGame';
// Lazy-loaded 3D Orientation Game (uses Three.js)
const OrientationGame3D = React.lazy(() => import('./components/OrientationGame3D'));
import StroopGame from './components/StroopGame';
import MultitaskGame from './components/MultitaskGame';
import PatternGame from './components/PatternGame';
import FactFindingGame from './components/FactFindingGame';
import { RoleplayGame } from './components/RoleplayGame';

import { AppView, UserProfile } from './types';
import { Loader2 } from 'lucide-react';
import {
  clearStoredToken,
  completeGame,
  getMe,
  getStoredToken,
  login,
  logout,
  markLegacyProfileSynced,
  mergeAccountFields,
  profileFromAuthPayload,
  readLegacyProfile,
  register,
  submitBigFive,
  submitMemoryProgress,
  syncProfile,
} from './services/apiService';

// URL <-> AppView mapping. This is the only place that needs to know about
// paths - every other component still speaks in AppView, unchanged.
const VIEW_PATHS: Record<AppView, string> = {
  [AppView.DASHBOARD]: '/dashboard',
  [AppView.JOURNEY_MAP]: '/journey',
  [AppView.MINIGAME_HUB]: '/games',
  [AppView.VERIFIED_RESUME]: '/resume',
  [AppView.MINIGAME_5WHYS]: '/games/5whys',
  [AppView.MINIGAME_SWOT]: '/games/swot',
  [AppView.MINIGAME_CYNEFIN]: '/games/cynefin',
  [AppView.MINIGAME_MEMORY]: '/games/memory',
  [AppView.MINIGAME_MATH]: '/games/math',
  [AppView.MINIGAME_SPEED]: '/games/speed',
  [AppView.MINIGAME_VISUALIZATION]: '/games/visualization',
  [AppView.MINIGAME_ORIENTATION]: '/games/orientation',
  [AppView.MINIGAME_STROOP]: '/games/stroop',
  [AppView.MINIGAME_MULTITASK]: '/games/multitask',
  [AppView.MINIGAME_PATTERN]: '/games/pattern',
  [AppView.MINIGAME_FACTFINDING]: '/games/factfinding',
  [AppView.MINIGAME_ROLEPLAY]: '/games/roleplay',
  [AppView.MINIGAME_BIGFIVE]: '/personality',
};

const PATH_TO_VIEW: Record<string, AppView> = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as AppView])
);

// Initial Empty State (No Mock Data)
const initialUser: UserProfile = {
  name: "کاربر میهمان",
  role: "متقاضی ارزیابی",
  level: "تعیین نشده",
  levelNumber: 0,
  currentXp: 0,
  requiredXp: 500,
  totalScenarios: 0,
  badges: [],
  skills: {
    // General
    analysis: 0,
    creativity: 0,
    speed: 0,
    quality: 0,
    teamwork: 0,
    decisionMaking: 0,
    // Cognitive (A9-A15)
    memory: 0,
    math: 0,
    perception: 0,
    visualization: 0,
    orientation: 0,
    focus: 0,
    multitasking: 0
  },
  cognitiveProfile: {
    rawScores: {
      A9a_Corsi: 0,
      A9b_Paired: 0,
      A9c_NBack: 0,
      A10_Math: 0,
      A10Plus_Pattern: 0,
      A11_Speed: 0,
      A12_Visual: 0,
      A13_Orient: 0,
      A14_Stroop: 0,
      A15_Multi: 0,
      A17_Decision: 0,
      A18_Fact: 0
    },
    tScores: {
      MI: 0,
      AI: 0,
      RI: 0,
      SI: 0,
      EI: 0,
      TCS: 0
    }
  },
  coins: 0,
  streak: 0,
  unlockedNodes: ['node-1'],
  completedNodes: [],
  memorySubScores: { corsi: 0, pairs: 0, nback: 0 }
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authenticated'>('checking');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const currentView = PATH_TO_VIEW[location.pathname] ?? AppView.DASHBOARD;

  const errorMessage = (error: unknown, fallback = 'عملیات ناموفق بود.') => error instanceof Error ? error.message : fallback;
  const showError = (error: unknown, fallback?: string) => setToast({ message: errorMessage(error, fallback), type: 'error' });

  const applyServerProfile = (profile: UserProfile) => {
    setUser(prev => mergeAccountFields(profile, prev));
  };

  const migrateLegacyProfile = async (baseProfile: UserProfile) => {
    const legacy = readLegacyProfile();
    if (!legacy) return baseProfile;

    try {
      const synced = await syncProfile(legacy);
      markLegacyProfileSynced();
      return { ...synced, id: baseProfile.id, email: baseProfile.email };
    } catch (error) {
      console.warn('Legacy profile sync failed:', error);
      return baseProfile;
    }
  };

  const finishAuth = async (payload: Awaited<ReturnType<typeof login>>) => {
    const accountProfile = profileFromAuthPayload(payload);
    const migratedProfile = await migrateLegacyProfile(accountProfile);
    setUser(migratedProfile);
    setAuthState('authenticated');
    changeView(AppView.DASHBOARD);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = getStoredToken();
      if (!token) {
        setAuthState('anonymous');
        return;
      }

      setLoading(true);
      setLoadingMessage('در حال بازیابی حساب...');
      try {
        const payload = await getMe();
        const accountProfile = profileFromAuthPayload(payload);
        const migratedProfile = await migrateLegacyProfile(accountProfile);
        if (!cancelled) {
          setUser(migratedProfile);
          setAuthState('authenticated');
        }
      } catch (error) {
        clearStoredToken();
        if (!cancelled) setAuthState('anonymous');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => { cancelled = true; };
    // Deliberately does not navigate anywhere on success, so a refresh or a
    // deep link (e.g. /games/memory) restores the user directly onto that
    // route instead of bouncing them back to the dashboard.
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(prev => !prev);

  const changeView = (newView: AppView) => {
    navigate(VIEW_PATHS[newView]);
  };

  const runProfileMutation = async (message: string, action: () => Promise<{ profile: UserProfile }>, nextView: AppView = AppView.DASHBOARD) => {
    setLoading(true);
    setLoadingMessage(message);
    try {
      const result = await action();
      applyServerProfile(result.profile);
      changeView(nextView);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Auth Handlers ---
  const handleLogin = async (email: string, password: string) => {
    const payload = await login(email, password);
    await finishAuth(payload);
  };

  const handleRegister = async (email: string, password: string, name: string, role: string) => {
    const payload = await register(email, password, name, role);
    await finishAuth(payload);
  };

  const handleLogout = async () => {
    setLoading(true);
    setLoadingMessage('در حال خروج...');
    try {
      await logout();
    } catch {
      clearStoredToken();
    } finally {
      setUser(initialUser);
      setAuthState('anonymous');
      changeView(AppView.DASHBOARD);
      setLoading(false);
    }
  };

  // --- Server-authoritative progression handlers ---
  const handleMemoryProgress = async (gameType: 'corsi' | 'pairs' | 'nback', score: number, rawScore?: number) => {
    try {
      const result = await submitMemoryProgress(gameType, score, rawScore);
      applyServerProfile(result.profile);
    } catch (error) {
      showError(error, 'ثبت پیشرفت حافظه ناموفق بود.');
    }
  };

  const handleMiniGameComplete = async (
    score: number,
    nodeId: string,
    gameView: AppView,
    payload?: Record<string, unknown>
  ) => {
      await runProfileMutation(
        'در حال ثبت نتیجه روی سرور...',
        () => completeGame(gameView, nodeId || null, score, payload)
      );
  };

  const handleBigFiveComplete = async (scores: NonNullable<UserProfile['bigFive']>) => {
      await runProfileMutation('در حال ثبت نتیجه آزمون شخصیت...', () => submitBigFive(scores));
  };

  if (loading || authState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-blue-900 dark:text-blue-100 z-50 relative overflow-hidden">
        <BackgroundQuotes />
        <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
            <h2 className="text-2xl font-bold animate-pulse mb-2">{loadingMessage || 'در حال آماده‌سازی...'}</h2>
        </div>
      </div>
    );
  }

  if (authState === 'anonymous') {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className={`flex h-screen font-sans overflow-hidden relative transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <BackgroundQuotes />
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}

      <Sidebar
        currentView={currentView}
        onChangeView={changeView}
        onLogout={handleLogout}
        user={user}
      />

      <main className="flex-1 h-full md:mr-20 lg:mr-72 pb-20 md:pb-0 transition-all duration-300 relative z-10">
          <div className="h-full w-full animate-fade-in-up overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to={VIEW_PATHS[AppView.DASHBOARD]} replace />} />
              <Route
                path={VIEW_PATHS[AppView.DASHBOARD]}
                element={(
                  <Dashboard
                    user={user}
                    onStartScenario={() => changeView(AppView.JOURNEY_MAP)}
                    onOpenBigFive={() => changeView(AppView.MINIGAME_BIGFIVE)}
                    isDarkMode={darkMode}
                    toggleTheme={toggleTheme}
                  />
                )}
              />
              <Route
                path={VIEW_PATHS[AppView.JOURNEY_MAP]}
                element={(
                  <JourneyMap
                    unlockedNodes={user.unlockedNodes}
                    completedNodes={user.completedNodes}
                    onSelectNode={(v) => changeView(v)}
                    onStartScenario={() => {}}
                  />
                )}
              />
              <Route path={VIEW_PATHS[AppView.MINIGAME_HUB]} element={<MiniGameHub onSelectGame={changeView} user={user} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_BIGFIVE]} element={<BigFiveGame onExit={() => changeView(AppView.DASHBOARD)} onComplete={handleBigFiveComplete} />} />
              <Route path={VIEW_PATHS[AppView.VERIFIED_RESUME]} element={<VerifiedResume user={user} isDarkMode={darkMode} />} />

              {/* --- Cognitive Games (Razi Model) --- */}
              <Route
                path={VIEW_PATHS[AppView.MINIGAME_MEMORY]}
                element={(
                  <MemoryGame
                    user={user}
                    onExit={() => changeView(AppView.JOURNEY_MAP)}
                    onComplete={(s, rawScores) => handleMiniGameComplete(s, 'node-1', AppView.MINIGAME_MEMORY, rawScores ? { rawScores } : undefined)}
                    onStepComplete={handleMemoryProgress}
                  />
                )}
              />
              <Route path={VIEW_PATHS[AppView.MINIGAME_MATH]} element={<MathGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-2', AppView.MINIGAME_MATH)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_PATTERN]} element={<PatternGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_PATTERN)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_SPEED]} element={<SpeedGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-3', AppView.MINIGAME_SPEED)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_VISUALIZATION]} element={<VisualizationGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-4', AppView.MINIGAME_VISUALIZATION)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_ORIENTATION]} element={<Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>}><OrientationGame3D onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-5', AppView.MINIGAME_ORIENTATION)} /></Suspense>} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_STROOP]} element={<StroopGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-6', AppView.MINIGAME_STROOP)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_MULTITASK]} element={<MultitaskGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-7', AppView.MINIGAME_MULTITASK)} />} />
              <Route
                path={VIEW_PATHS[AppView.MINIGAME_FACTFINDING]}
                element={(
                  <FactFindingGame
                    onExit={() => changeView(AppView.JOURNEY_MAP)}
                    onComplete={(s) => handleMiniGameComplete(s, 'node-final', AppView.MINIGAME_FACTFINDING)}
                  />
                )}
              />
              <Route path={VIEW_PATHS[AppView.MINIGAME_ROLEPLAY]} element={<RoleplayGame onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_ROLEPLAY)} />} />

              {/* --- Methodology Games --- */}
              <Route path={VIEW_PATHS[AppView.MINIGAME_5WHYS]} element={<FiveWhysGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_5WHYS)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_SWOT]} element={<SwotGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_SWOT)} />} />
              <Route path={VIEW_PATHS[AppView.MINIGAME_CYNEFIN]} element={<CynefinGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_CYNEFIN)} />} />

              <Route path="*" element={<Navigate to={VIEW_PATHS[AppView.DASHBOARD]} replace />} />
            </Routes>
          </div>
      </main>
    </div>
  );
}

export default App;
