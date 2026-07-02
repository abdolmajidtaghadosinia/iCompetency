
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import JourneyMap from './components/JourneyMap';
import MiniGameHub from './components/MiniGameHub';
import VerifiedResume from './components/VerifiedResume';
import BackgroundQuotes from './components/BackgroundQuotes';
import BigFiveGame from './components/BigFiveGame';
import AuthScreen from './components/AuthScreen';

// Methodology Games
import FiveWhysGame from './components/FiveWhysGame';
import SwotGame from './components/SwotGame';
import CynefinGame from './components/CynefinGame';

// Cognitive Games (Razi Model A9-A15)
import MemoryGame from './components/MemoryGame';
import MathGame from './components/MathGame';
import SpeedGame from './components/SpeedGame';
import VisualizationGame from './components/VisualizationGame';
import OrientationGame from './components/OrientationGame';
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
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authenticated'>('checking');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const errorMessage = (error: unknown, fallback = 'عملیات ناموفق بود.') => error instanceof Error ? error.message : fallback;

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
  }, []);

  // --- Navigation Safety (Browser Back Button) ---
  useEffect(() => {
      window.history.replaceState({ view: AppView.DASHBOARD }, '');

      const handlePopState = () => {
          if (view !== AppView.DASHBOARD) {
              setView(AppView.DASHBOARD);
              window.history.pushState({ view: AppView.DASHBOARD }, '');
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

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
      setView(newView);
      if (newView !== AppView.DASHBOARD) {
          window.history.pushState({ view: newView }, '');
      }
  };

  const runProfileMutation = async (message: string, action: () => Promise<{ profile: UserProfile }>, nextView: AppView = AppView.DASHBOARD) => {
    setLoading(true);
    setLoadingMessage(message);
    try {
      const result = await action();
      applyServerProfile(result.profile);
      changeView(nextView);
    } catch (error) {
      alert(errorMessage(error));
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
      alert(errorMessage(error, 'ثبت پیشرفت حافظه ناموفق بود.'));
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

      <Sidebar
        currentView={view}
        onChangeView={changeView}
        onLogout={handleLogout}
        user={user}
      />

      <main className="flex-1 h-full md:mr-20 lg:mr-72 pb-16 md:pb-0 transition-all duration-300 relative z-10">
          <div className="h-full w-full animate-fade-in-up overflow-hidden">
                 {view === AppView.DASHBOARD && (
                    <Dashboard
                      user={user}
                      onStartScenario={() => changeView(AppView.JOURNEY_MAP)}
                      onOpenBigFive={() => changeView(AppView.MINIGAME_BIGFIVE)}
                      isDarkMode={darkMode}
                      toggleTheme={toggleTheme}
                    />
                 )}
                 {view === AppView.JOURNEY_MAP && (
                    <JourneyMap
                       unlockedNodes={user.unlockedNodes}
                       completedNodes={user.completedNodes}
                       onSelectNode={(v) => changeView(v)}
                       onStartScenario={() => {}}
                    />
                 )}
                 {view === AppView.MINIGAME_HUB && (
                    <MiniGameHub onSelectGame={changeView} user={user} />
                 )}
                 {view === AppView.MINIGAME_BIGFIVE && (
                    <BigFiveGame onExit={() => changeView(AppView.DASHBOARD)} onComplete={handleBigFiveComplete} />
                 )}
                 {view === AppView.VERIFIED_RESUME && (
                    <VerifiedResume user={user} isDarkMode={darkMode} />
                 )}

                 {/* --- Cognitive Games (Razi Model) --- */}
                 {view === AppView.MINIGAME_MEMORY && (
                    <MemoryGame
                        user={user}
                        onExit={() => changeView(AppView.JOURNEY_MAP)}
                        onComplete={(s, rawScores) => handleMiniGameComplete(s, 'node-1', AppView.MINIGAME_MEMORY, rawScores ? { rawScores } : undefined)}
                        onStepComplete={handleMemoryProgress}
                    />
                 )}
                 {view === AppView.MINIGAME_MATH && (
                    <MathGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-2', AppView.MINIGAME_MATH)} />
                 )}
                 {view === AppView.MINIGAME_PATTERN && (
                    <PatternGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_PATTERN)} />
                 )}
                 {view === AppView.MINIGAME_SPEED && (
                    <SpeedGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-3', AppView.MINIGAME_SPEED)} />
                 )}
                 {view === AppView.MINIGAME_VISUALIZATION && (
                    <VisualizationGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-4', AppView.MINIGAME_VISUALIZATION)} />
                 )}
                 {view === AppView.MINIGAME_ORIENTATION && (
                    <OrientationGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-5', AppView.MINIGAME_ORIENTATION)} />
                 )}
                 {view === AppView.MINIGAME_STROOP && (
                    <StroopGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-6', AppView.MINIGAME_STROOP)} />
                 )}
                 {view === AppView.MINIGAME_MULTITASK && (
                    <MultitaskGame onExit={() => changeView(AppView.JOURNEY_MAP)} onComplete={(s) => handleMiniGameComplete(s, 'node-7', AppView.MINIGAME_MULTITASK)} />
                 )}
                 {view === AppView.MINIGAME_FACTFINDING && (
                    <FactFindingGame
                        onExit={() => changeView(AppView.JOURNEY_MAP)}
                        onComplete={(s) => handleMiniGameComplete(s, 'node-final', AppView.MINIGAME_FACTFINDING)}
                    />
                 )}
                 {view === AppView.MINIGAME_ROLEPLAY && (
                    <RoleplayGame
                        onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_ROLEPLAY)}
                    />
                 )}

                 {/* --- Methodology Games --- */}
                 {view === AppView.MINIGAME_5WHYS && (
                    <FiveWhysGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_5WHYS)} />
                 )}
                 {view === AppView.MINIGAME_SWOT && (
                    <SwotGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_SWOT)} />
                 )}
                 {view === AppView.MINIGAME_CYNEFIN && (
                    <CynefinGame onExit={() => changeView(AppView.MINIGAME_HUB)} onComplete={(s) => handleMiniGameComplete(s, '', AppView.MINIGAME_CYNEFIN)} />
                 )}
          </div>
      </main>
    </div>
  );
}

export default App;