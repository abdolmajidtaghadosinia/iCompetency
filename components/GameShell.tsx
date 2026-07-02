
import React, { useState, useEffect } from 'react';
import { X, Pause, Play, RotateCcw, HelpCircle, Timer, Heart } from 'lucide-react';
import { toPersianNum } from '../utils';

export interface GameStats {
  score: number;
  timeLeft?: number;
  level?: number;
  combo?: number;
  lives?: number;
  maxLives?: number;
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
  gameState: 'intro' | 'playing' | 'paused' | 'finished';
  setGameState: (state: 'intro' | 'playing' | 'paused' | 'finished') => void;
  colorTheme: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' | 'indigo';
}

const colorMap = {
  blue: { bg: 'bg-blue-50', primary: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-100', hover: 'hover:bg-blue-700', ring: 'ring-blue-300' },
  emerald: { bg: 'bg-emerald-50', primary: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', light: 'bg-emerald-100', hover: 'hover:bg-emerald-700', ring: 'ring-emerald-300' },
  rose: { bg: 'bg-rose-50', primary: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-100', hover: 'hover:bg-rose-700', ring: 'ring-rose-300' },
  amber: { bg: 'bg-amber-50', primary: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-100', hover: 'hover:bg-amber-700', ring: 'ring-amber-300' },
  purple: { bg: 'bg-purple-50', primary: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-100', hover: 'hover:bg-purple-700', ring: 'ring-purple-300' },
  indigo: { bg: 'bg-indigo-50', primary: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', light: 'bg-indigo-100', hover: 'hover:bg-indigo-700', ring: 'ring-indigo-300' },
};

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
  colorTheme
}) => {
  const theme = colorMap[colorTheme];

  const handleStart = () => {
    setGameState('playing');
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${theme.bg} overflow-hidden font-sans transition-colors duration-500`}>
      
      {/* --- HUD (Heads Up Display) --- */}
      {gameState !== 'intro' && (
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 p-3 md:p-4 flex justify-between items-center relative z-30">
            <div className="flex items-center gap-3">
                <button onClick={() => setGameState('paused')} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800">
                    <Pause size={20} />
                </button>
                <div className="hidden md:flex flex-col">
                    <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
                    {stats.level && <span className="text-[10px] text-slate-400 font-bold">سطح {toPersianNum(stats.level)}</span>}
                </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
                {/* Timer Display */}
                {stats.timeLeft !== undefined && (
                    <div className={`flex items-center gap-2 font-black text-xl tabular-nums px-5 py-1.5 rounded-full border-2 ${stats.timeLeft < 10 ? 'border-red-500 bg-red-50 text-red-600 animate-pulse' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <Timer size={18} className="opacity-50" />
                        {toPersianNum(Math.ceil(stats.timeLeft))}
                    </div>
                )}
                
                {/* Lives Display (Hearts) */}
                {stats.lives !== undefined && (
                    <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                        {Array.from({ length: stats.maxLives || 3 }).map((_, i) => (
                            <Heart 
                                key={i} 
                                size={20} 
                                className={`transition-all duration-300 ${i < (stats.lives || 0) ? 'text-rose-500 fill-rose-500' : 'text-slate-300 fill-slate-200'}`} 
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {stats.combo !== undefined && stats.combo > 1 && (
                     <div className="hidden md:flex flex-col items-end animate-bounce">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">COMBO</span>
                        <span className="text-xl font-black text-amber-600">x{toPersianNum(stats.combo)}</span>
                     </div>
                )}
                <div className={`${theme.primary} text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20 flex flex-col items-end min-w-[90px]`}>
                    <span className="text-[9px] font-bold opacity-80 uppercase tracking-wider">امتیاز</span>
                    <span className="text-xl font-black tabular-nums leading-none">{toPersianNum(stats.score)}</span>
                </div>
            </div>
        </div>
      )}

      {/* --- Main Game Area --- */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4">
         {children}
      </div>

      {/* --- Intro Modal --- */}
      {gameState === 'intro' && (
        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10 text-center relative overflow-hidden animate-scale-in">
                <div className={`absolute top-0 left-0 w-full h-2 ${theme.primary}`}></div>
                
                <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl ${theme.light} flex items-center justify-center shadow-inner rotate-3 transform transition-transform hover:rotate-6 duration-500`}>
                    <div className={`${theme.text} transform scale-150`}>{icon}</div>
                </div>

                <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">{title}</h1>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm md:text-base px-4">{description}</p>

                <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-right border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                        <HelpCircle size={18} className="text-slate-400" /> راهنما:
                    </h3>
                    <ul className="space-y-3">
                        {instructions.map((inst, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-xs md:text-sm text-slate-600 font-medium">
                                <span className={`w-5 h-5 rounded-full ${theme.primary} text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>{toPersianNum(idx+1)}</span>
                                {inst}
                            </li>
                        ))}
                    </ul>
                </div>

                <button 
                    onClick={handleStart}
                    className={`w-full py-4 rounded-2xl font-black text-lg text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 ${theme.primary} ${theme.hover}`}
                >
                    <Play fill="currentColor" size={24} />
                    شروع چالش
                </button>
                
                <button onClick={onExit} className="mt-6 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors">
                    بازگشت به منو
                </button>
            </div>
        </div>
      )}

      {/* --- Pause Modal --- */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-scale-in">
                 <h2 className="text-2xl font-black text-slate-900 mb-8">بازی متوقف شد</h2>
                 <div className="space-y-3">
                     <button onClick={() => setGameState('playing')} className={`w-full py-3.5 rounded-2xl font-bold text-white ${theme.primary} flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform`}>
                         <Play size={20} fill="currentColor" /> ادامه بازی
                     </button>
                     {onRestart && (
                         <button onClick={onRestart} className="w-full py-3.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors">
                             <RotateCcw size={20} /> شروع مجدد
                         </button>
                     )}
                     <button onClick={onExit} className="w-full py-3.5 rounded-2xl font-bold text-red-500 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-100">
                         <X size={20} /> خروج
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default GameShell;
