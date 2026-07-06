
import React, { useState, useEffect } from 'react';
import { FiveWhysData } from '../types';
import { generateFiveWhysData, validateTextAnswer } from '../services/geminiService';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Search, Send, HelpCircle, ArrowDown } from 'lucide-react';
import { toPersianNum } from '../utils';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const FiveWhysGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [data, setData] = useState<FiveWhysData | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [validating, setValidating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  
  const [gameState, setGameState] = useState<'playing' | 'rabbit_hole' | 'finished'>('playing');
  const [feedback, setFeedback] = useState<string>('');
  const [serviceNotice, setServiceNotice] = useState<string>('');
  const [score, setScore] = useState(0);
  const [rabbitHoleTime, setRabbitHoleTime] = useState(0);

  useEffect(() => {
    generateFiveWhysData()
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Timeout safety net: if loading takes more than 15 seconds, show error
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (loading) {
        setError(true);
        setLoading(false);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Rabbit Hole Timer
  useEffect(() => {
      if (gameState === 'rabbit_hole' && rabbitHoleTime > 0) {
          const timer = setInterval(() => setRabbitHoleTime(t => t - 1), 1000);
          return () => clearInterval(timer);
      } else if (gameState === 'rabbit_hole' && rabbitHoleTime === 0) {
          setGameState('playing');
          setFeedback('');
          setUserAnswer('');
      }
  }, [gameState, rabbitHoleTime]);

  const handleSubmit = async () => {
      if (!userAnswer.trim() || !data) return;

      setValidating(true);
      setServiceNotice('');
      const levelData = data.levels[currentLevel];

      // AI Semantic Check. A grader outage (fallback flag or network error)
      // must not be scored as a wrong answer - no rabbit hole, no penalty.
      let result;
      try {
          result = await validateTextAnswer(
              userAnswer,
              levelData.idealAnswer,
              `Problem: ${data.problemStatement}. Previous Cause: ${currentLevel > 0 ? data.levels[currentLevel-1].idealAnswer : 'Initial Problem'}`
          );
      } catch {
          result = { isCorrect: false, feedback: '', similarity: 0, serviceUnavailable: true };
      }

      setValidating(false);

      if (result.serviceUnavailable) {
          setServiceNotice('سرویس ارزیابی هوش مصنوعی موقتاً در دسترس نیست؛ پاسخ شما بررسی نشد. لطفاً دوباره تلاش کنید.');
          return;
      }

      if (result.isCorrect) {
          setScore(s => s + 20);
          if (currentLevel < 4) {
              setCurrentLevel(l => l + 1);
              setUserAnswer('');
              setFeedback(''); // Clear feedback for next level
          } else {
              setGameState('finished');
          }
      } else {
          // Enter Rabbit Hole
          setGameState('rabbit_hole');
          setFeedback(result.feedback || "این علت اصلی نیست. شما وارد مسیر فرعی شدید.");
          setScore(s => Math.max(0, s - 5));
          setRabbitHoleTime(5); // 5 seconds penalty
      }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white animate-fade-in-up">
        <Loader2 className="animate-spin w-10 h-10 text-amber-500 mb-4" />
        <p className="text-lg animate-pulse">در حال آماده‌سازی پرونده...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
        <p className="text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.</p>
        <div className="flex gap-3">
            <button 
                onClick={() => { setLoading(true); setError(false); generateFiveWhysData().then(d => { setData(d); setLoading(false); }).catch(() => { setError(true); setLoading(false); }); }}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-colors"
            >
                تلاش مجدد
            </button>
            <button onClick={onExit} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
                بازگشت
            </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 p-4 animate-fade-in-up">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">ریشه مشکل پیدا شد!</h2>
          <p className="text-slate-600 mb-6">شما با موفقیت زنجیره علت و معلول را تکمیل کردید.</p>
          
          <div className="text-5xl font-black text-emerald-500 mb-8">{toPersianNum(score)}<span className="text-xl text-slate-400">/100</span></div>
          
          <button 
            onClick={() => onComplete(score)}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 hover:scale-105 transition-all"
          >
            خروج و ثبت
          </button>
        </div>
      </div>
    );
  }

  const levelData = data.levels[currentLevel];

  return (
    <div className={`h-full flex flex-col p-6 pb-24 md:pb-6 overflow-y-auto transition-colors duration-500 ${gameState === 'rabbit_hole' ? 'bg-red-950' : 'bg-slate-900'} text-slate-100`}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2 rounded-lg">
                <Search className="text-amber-500" />
            </div>
            <div>
                <h2 className="font-bold text-xl">متدولوژی ۵ چرا</h2>
                <p className="text-slate-400 text-sm">سطح {toPersianNum(currentLevel + 1)} از ۵</p>
            </div>
        </div>
        <div className="text-2xl font-black tabular-nums text-amber-400">{toPersianNum(score)}</div>
      </div>

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col relative">
        
        {/* Chain History */}
        <div className="space-y-4 mb-8 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                <AlertTriangle size={16} /> صورت مسئله: {data.problemStatement}
            </div>
            {data.levels.slice(0, currentLevel).map((lvl, idx) => (
                <div key={idx} className="flex items-start gap-3 ml-4 border-l-2 border-slate-700 pl-4 py-1">
                    <ArrowDown size={14} className="mt-1 text-emerald-500" />
                    <div>
                        <div className="text-xs text-slate-500">چرا {idx + 1}</div>
                        <div className="text-emerald-400">{lvl.idealAnswer}</div>
                    </div>
                </div>
            ))}
        </div>

        {/* Current Question */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-6 shadow-xl animate-slide-in-right">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                {levelData.question}
            </h1>
            <p className="text-slate-400 text-sm flex items-center gap-2 mt-2">
                <HelpCircle size={14} /> راهنمایی: {levelData.hint}
            </p>
        </div>

        {/* Rabbit Hole Overlay / Input */}
        {gameState === 'rabbit_hole' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-shake">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="text-red-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-red-400 mb-2">مسیر اشتباه (Rabbit Hole)</h3>
                <p className="text-red-200 mb-6 max-w-md">{feedback}</p>
                <div className="text-4xl font-black text-white animate-pulse">{toPersianNum(rabbitHoleTime)}s</div>
                <p className="text-xs text-red-300 mt-2">جریمه زمانی...</p>
            </div>
        ) : (
            <div className="mt-auto">
                {serviceNotice && (
                    <div className="mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm font-bold rounded-xl p-4 animate-fade-in">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        {serviceNotice}
                    </div>
                )}
                <div className="relative">
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="علت را اینجا بنویسید..."
                        className="w-full bg-slate-800 text-white rounded-xl p-4 pr-12 min-h-[120px] border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none text-lg"
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                    />
                    <button 
                        onClick={handleSubmit}
                        disabled={validating || !userAnswer.trim()}
                        className="absolute bottom-4 left-4 p-3 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-amber-500/20"
                    >
                        {validating ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-4">پاسخ شما توسط هوش مصنوعی تحلیل می‌شود.</p>
            </div>
        )}

      </div>
      
      <button onClick={onExit} className="absolute top-6 left-6 text-slate-600 hover:text-slate-400"><XCircle /></button>
    </div>
  );
};

export default FiveWhysGame;
