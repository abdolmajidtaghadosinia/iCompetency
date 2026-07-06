
import React, { useState, useEffect } from 'react';
import { FiveWhysData } from '../types';
import { generateFiveWhysData, validateTextAnswer } from '../services/geminiService';
import { Loader2, AlertTriangle, XCircle, Search, Send, HelpCircle, ArrowDown } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const FiveWhysGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [data, setData] = useState<FiveWhysData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [validating, setValidating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');

  const [feedback, setFeedback] = useState<string>('');
  const [serviceNotice, setServiceNotice] = useState<string>('');
  const [score, setScore] = useState(0);
  // rabbitHoleTime > 0 means the player took a wrong branch and is waiting
  // out the time penalty.
  const [rabbitHoleTime, setRabbitHoleTime] = useState(0);

  // The AI case file loads in the background while the intro modal is up.
  const loadData = () => {
    setLoadError(false);
    setData(null);
    generateFiveWhysData()
      .then(d => setData(d))
      .catch(() => setLoadError(true));
  };

  useEffect(loadData, []);

  // Loading safety net: flag an error if the AI call hangs.
  useEffect(() => {
    if (data || loadError) return;
    const timeout = setTimeout(() => setLoadError(true), 15000);
    return () => clearTimeout(timeout);
  }, [data, loadError]);

  // Rabbit-hole penalty countdown; freezes while the shell is paused.
  useEffect(() => {
      if (gameState !== 'playing' || rabbitHoleTime <= 0) return;
      const timer = setInterval(() => {
          setRabbitHoleTime(t => {
              if (t <= 1) {
                  setFeedback('');
                  setUserAnswer('');
                  return 0;
              }
              return t - 1;
          });
      }, 1000);
      return () => clearInterval(timer);
  }, [gameState, rabbitHoleTime > 0]);

  const handleSubmit = async () => {
      if (!userAnswer.trim() || !data || validating) return;

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
              sfx.playSuccess();
              setCurrentLevel(l => l + 1);
              setUserAnswer('');
              setFeedback(''); // Clear feedback for next level
          } else {
              setGameState('finished');
          }
      } else {
          // Enter Rabbit Hole
          sfx.playError();
          setFeedback(result.feedback || "این علت اصلی نیست. شما وارد مسیر فرعی شدید.");
          setScore(s => Math.max(0, s - 5));
          setRabbitHoleTime(5); // 5 seconds penalty
      }
  };

  // Canned offline content must not be recorded as a real assessment result.
  const isFallback = data?._fallback === true;

  if (gameState === 'finished' && data) {
    return (
      <GameResultCard
          title="متدولوژی ۵ چرا"
          rawScore={score}
          metrics={[
              { label: 'زنجیره علت‌ها', value: `${toPersianNum(5)}/${toPersianNum(5)}` },
              { label: 'ریشه مشکل', value: 'کشف شد' },
          ]}
          onComplete={() => isFallback ? onExit() : onComplete(score)}
      />
    );
  }

  const levelData = data?.levels[currentLevel];
  const inRabbitHole = rabbitHoleTime > 0;

  return (
    <GameShell
        title="متدولوژی ۵ چرا"
        description="با پرسیدن مکرر «چرا» زنجیره علت و معلول را دنبال کنید تا به ریشه واقعی مشکل برسید. پاسخ‌های شما توسط هوش مصنوعی تحلیل معنایی می‌شود."
        instructions={[
            'صورت مسئله را بخوانید و علت مستقیم آن را بنویسید.',
            'هر پاسخ درست، یک سطح عمیق‌تر می‌برد؛ ۵ سطح تا ریشه فاصله دارید.',
            'پاسخ سطحی یا انحرافی شما را وارد «مسیر فرعی» با جریمه زمانی می‌کند.',
        ]}
        icon={<Search />}
        stats={{ score }}
        onExit={onExit}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="amber"
    >
      <div className={`h-full w-full flex flex-col p-6 overflow-y-auto rounded-3xl transition-colors duration-500 ${inRabbitHole ? 'bg-red-950' : 'bg-slate-900'} text-slate-100`}>

        {!data && !loadError && (
            <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
                <Loader2 className="animate-spin w-10 h-10 text-amber-500 mb-4" />
                <p className="text-lg animate-pulse">در حال آماده‌سازی پرونده...</p>
            </div>
        )}

        {!data && loadError && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
                <p className="text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.</p>
                <button onClick={loadData} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-colors">
                    تلاش مجدد
                </button>
            </div>
        )}

        {data && levelData && (
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col relative">
            {isFallback && (
                <div className="mb-4 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold text-center">
                    نسخه آفلاین — این اجرا در کارنامه ثبت نمی‌شود.
                </div>
            )}
            <div className="text-center text-xs text-slate-500 font-bold mb-4">سطح {toPersianNum(currentLevel + 1)} از ۵</div>

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
            {inRabbitHole ? (
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
        )}
      </div>
    </GameShell>
  );
};

export default FiveWhysGame;
