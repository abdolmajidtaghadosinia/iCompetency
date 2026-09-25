import React, { useEffect } from 'react';
import { X, Pause, Play, RotateCcw, HelpCircle, Timer, Heart, Keyboard } from 'lucide-react';
import { toPersianNum } from '../utils';

export type GameState = 'intro' | 'playing' | 'paused' | 'finished';

export interface GameStats {
  // Omit for games without a running score (e.g. the memory battery), so the
  // HUD doesn't show a meaningless "0".
  score?: number;
  timeLeft?: number;
  level?: number;
  combo?: number;
  lives?: number;
  maxLives?: number;
  // Trial/round/stage counter, e.g. { current: 3, total: 10, label: 'مرحله' }.
  progress?: { current: number; total: number; label?: string };
}

interface GameShellProps {
  title: string;
  description: string;
  instructions: string[];
  icon: React.ReactNode;
  stats: GameStats;
  onExit: () => void;
  onRestart?: () => void;
  children: React.ReactNode;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  colorTheme: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' | 'indigo' | 'teal';
  // 'dark' renders the whole shell (HUD, intro, pause) in the dark palette for
  // games whose play area is a dark stage, so there's no light frame around it.
  tone?: 'light' | 'dark';
  // Optional one-line keyboard hint shown on the intro card.
  keyboardHint?: string;
}

const colorMap = {
  blue: { bg: 'bg-blue-50', primary: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', light: 'bg-blue-100 dark:bg-blue-500/15', hover: 'hover:bg-blue-700' },
  emerald: { bg: 'bg-emerald-50', primary: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', light: 'bg-emerald-100 dark:bg-emerald-500/15', hover: 'hover:bg-emerald-700' },
  rose: { bg: 'bg-rose-50', primary: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400', light: 'bg-rose-100 dark:bg-rose-500/15', hover: 'hover:bg-rose-700' },
  amber: { bg: 'bg-amber-50', primary: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400', light: 'bg-amber-100 dark:bg-amber-500/15', hover: 'hover:bg-amber-700' },
  purple: { bg: 'bg-purple-50', primary: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400', light: 'bg-purple-100 dark:bg-purple-500/15', hover: 'hover:bg-purple-700' },
  indigo: { bg: 'bg-indigo-50', primary: 'bg-indigo-600', text: 'text-indigo-600 dark:text-indigo-400', light: 'bg-indigo-100 dark:bg-indigo-500/15', hover: 'hover:bg-indigo-700' },
  teal: { bg: 'bg-teal-50', primary: 'bg-teal-600', text: 'text-teal-600 dark:text-teal-400', light: 'bg-teal-100 dark:bg-teal-500/15', hover: 'hover:bg-teal-700' },
};

// Shared "warm-up round" pill so every game with unscored practice trials
// announces them the same way.
export const PracticeBanner: React.FC<{ left: number }> = ({ left }) => (
  <div className="bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 px-5 py-2 rounded-full text-sm font-black shadow-sm animate-pulse text-center">
    دور تمرینی ({toPersianNum(left)} مانده) — امتیاز و زمان ثبت نمی‌شود
  </div>
);

const GameShell: React.FC<GameShellProps> = ({
  title,
  description,
  instructions,
  icon,
  stats,
  onExit,
  onRestart,
  children,
  gameState,
  setGameState,
  colorTheme,
  tone = 'light',
  keyboardHint,
}) => {
  const theme = colorMap[colorTheme];

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'paused') return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [gameState]);

  // Auto-pause when the tab loses visibility: timed assessments must not keep
  // running (and scoring misses) while the player is looking elsewhere.
  useEffect(() => {
    if (gameState !== 'playing') return;
    const onVisibility = () => {
      if (document.hidden) setGameState('paused');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [gameState]);

  const handleStart = () => {
    setGameState('playing');
  };

  const { progress } = stats;

  return (
    <div className={tone === 'dark' ? 'dark' : undefined}>
    <div className={`fixed inset-0 z-50 flex flex-col ${theme.bg} dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-500`}>

      {/* --- HUD (Heads Up Display) --- */}
      {gameState !== 'intro' && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800 p-3 md:p-4 flex justify-between items-center relative z-30 gap-2">
            <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setGameState('paused')} aria-label="توقف" className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center shrink-0">
                    <Pause size={20} />
                </button>
                <div className="flex flex-col min-w-0">
                    <h2 className="hidden md:block font-bold text-slate-800 dark:text-white text-sm truncate">{title}</h2>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        {stats.level !== undefined && stats.level > 0 && <span className="hidden md:inline">سطح {toPersianNum(stats.level)}</span>}
                        {progress && (
                            <span className={`${stats.timeLeft !== undefined || stats.lives !== undefined ? 'hidden sm:inline' : ''} bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap`}>
                                {progress.label ?? 'مرحله'} {toPersianNum(Math.min(progress.current, progress.total))} از {toPersianNum(progress.total)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
                {stats.timeLeft !== undefined && (
                    <div className={`flex items-center gap-2 font-black text-lg md:text-xl tabular-nums px-4 md:px-5 py-1.5 rounded-full border-2 ${stats.timeLeft < 10 ? 'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                        <Timer size={18} className="opacity-50" />
                        {toPersianNum(Math.max(0, Math.ceil(stats.timeLeft)))}
                    </div>
                )}

                {stats.lives !== undefined && (
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700" aria-label={`جان باقی‌مانده: ${stats.lives}`}>
                        {Array.from({ length: stats.maxLives || 3 }).map((_, i) => (
                            <Heart
                                key={i}
                                size={18}
                                className={`transition-all duration-300 ${i < (stats.lives || 0) ? 'text-rose-500 fill-rose-500' : 'text-slate-300 fill-slate-200 dark:text-slate-600 dark:fill-slate-700'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {stats.combo !== undefined && stats.combo > 1 && (
                     <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-amber-500 tracking-widest">COMBO</span>
                        <span className="text-xl font-black text-amber-600 dark:text-amber-400">×{toPersianNum(stats.combo)}</span>
                     </div>
                )}
                {stats.score !== undefined && (
                    <div className={`${theme.primary} text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10 flex flex-col items-end min-w-[80px]`}>
                        <span className="text-[9px] font-bold opacity-80 tracking-wider">امتیاز</span>
                        <span className="text-xl font-black tabular-nums leading-none">{toPersianNum(stats.score)}</span>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- Main Game Area --- */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-3 md:p-4 min-h-0">
         {children}
      </div>

      {/* --- Intro Modal --- */}
      {gameState === 'intro' && (
        <div className="absolute inset-0 z-50 bg-white/90 dark:bg-slate-950/95 backdrop-blur-md flex p-4 md:p-6 overflow-y-auto animate-fade-in">
            <div className="m-auto bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-7 md:p-10 text-center relative overflow-hidden animate-scale-in">
                <div className={`absolute top-0 left-0 w-full h-2 ${theme.primary}`}></div>

                <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl ${theme.light} flex items-center justify-center shadow-inner rotate-3 transform transition-transform hover:rotate-6 duration-500`}>
                    <div className={`${theme.text} transform scale-150`}>{icon}</div>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-7 leading-relaxed text-sm md:text-base px-2">{description}</p>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 md:p-6 mb-7 text-right border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm">
                        <HelpCircle size={18} className="text-slate-400" /> راهنما:
                    </h3>
                    <ul className="space-y-3">
                        {instructions.map((inst, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                <span className={`w-5 h-5 rounded-full ${theme.primary} text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>{toPersianNum(idx+1)}</span>
                                {inst}
                            </li>
                        ))}
                    </ul>
                    {keyboardHint && (
                        <p className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <Keyboard size={14} className="shrink-0" /> {keyboardHint}
                        </p>
                    )}
                </div>

                <button
                    onClick={handleStart}
                    className={`w-full py-4 rounded-2xl font-black text-lg text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 ${theme.primary} ${theme.hover}`}
                >
                    <Play fill="currentColor" size={24} />
                    شروع چالش
                </button>

                <button onClick={onExit} className="mt-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs transition-colors">
                    بازگشت به منو
                </button>
            </div>
        </div>
      )}

      {/* --- Pause Modal --- */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-scale-in">
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">بازی متوقف شد</h2>
                 <p className="text-xs font-bold text-slate-400 mb-7">زمان متوقف است؛ برای ادامه Esc را بزنید.</p>
                 <div className="space-y-3">
                     <button onClick={() => setGameState('playing')} className={`w-full py-3.5 rounded-2xl font-bold text-white ${theme.primary} ${theme.hover} flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform`}>
                         <Play size={20} fill="currentColor" /> ادامه بازی
                     </button>
                     {onRestart && (
                         <button onClick={onRestart} className="w-full py-3.5 rounded-2xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors">
                             <RotateCcw size={20} /> شروع مجدد
                         </button>
                     )}
                     <button onClick={onExit} className="w-full py-3.5 rounded-2xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900">
                         <X size={20} /> خروج
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default GameShell;
