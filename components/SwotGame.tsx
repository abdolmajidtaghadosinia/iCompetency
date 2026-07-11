
import React, { useState, useEffect, useRef } from 'react';
import { SwotData } from '../types';
import { generateSwotData } from '../services/geminiService';
import { Loader2, Building2, CheckCircle2, XCircle, AlertTriangle, Target } from 'lucide-react';
import GameShell from './GameShell';
import MethodologyResult, { RubricDimension } from './MethodologyResult';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

type SwotCat = 'S' | 'W' | 'O' | 'T';
const internalAxis = (c: SwotCat) => c === 'S' || c === 'W'; // internal = strengths/weaknesses
const positiveAxis = (c: SwotCat) => c === 'S' || c === 'O'; // positive = strengths/opportunities

// Reject malformed AI data so a bad generation never becomes an unfair score.
const isValidSwot = (d: SwotData | null): boolean =>
  !!d && Array.isArray(d.items) && d.items.length > 0 &&
  d.items.every(i => !!i && typeof i.text === 'string' && i.text.trim().length > 0) &&
  !!d.strategyPhase && Array.isArray(d.strategyPhase.options) &&
  d.strategyPhase.options.length >= 2 && d.strategyPhase.options.filter(o => o.isCorrect).length === 1;

interface SortEntry { correctCat: SwotCat; picked: SwotCat; exact: boolean; ieCorrect: boolean; pnCorrect: boolean; }

function normalizeCategory(raw: string): 'S' | 'W' | 'O' | 'T' {
  const val = raw.trim().toUpperCase();
  // Single letter match
  if (val === 'S' || val === 'W' || val === 'O' || val === 'T') return val;
  // English full-word match
  if (val.startsWith('STRENGTH')) return 'S';
  if (val.startsWith('WEAKNESS')) return 'W';
  if (val.startsWith('OPPORTUNIT')) return 'O';
  if (val.startsWith('THREAT')) return 'T';
  // Persian match
  if (val.includes('قوت') || val.includes('قدرت')) return 'S';
  if (val.includes('ضعف')) return 'W';
  if (val.includes('فرصت')) return 'O';
  if (val.includes('تهدید')) return 'T';
  // Fallback: return as-is (first char uppercase)
  return val.charAt(0) as 'S' | 'W' | 'O' | 'T';
}

interface Props {
  onExit: () => void;
  onComplete: (score: number, payload?: Record<string, unknown>) => void;
}

const SwotGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [data, setData] = useState<SwotData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState<'sorting' | 'strategy'>('sorting');

  // Phase 1 State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortCorrect, setSortCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{correct: boolean, msg: string} | null>(null);

  // Phase 2 State
  const [strategyResult, setStrategyResult] = useState<{correct: boolean, feedback: string} | null>(null);

  // Per-item classification log for the rubric subscores (exact category plus
  // the two discrimination axes: internal/external and positive/negative).
  const sortLog = useRef<SortEntry[]>([]);
  const strategyPick = useRef<number | null>(null);

  // The AI case data loads in the background while the intro modal is up.
  const loadData = () => {
    setLoadError(false);
    setData(null);
    generateSwotData()
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

  const handleChoice = (category: 'S' | 'W' | 'O' | 'T') => {
    if (!data || feedback) return;

    const item = data.items[currentIndex];
    const correctCat = normalizeCategory(item.category);
    const isCorrect = correctCat === category;

    sortLog.current.push({
      correctCat, picked: category, exact: isCorrect,
      ieCorrect: internalAxis(category) === internalAxis(correctCat),
      pnCorrect: positiveAxis(category) === positiveAxis(correctCat),
    });

    const categoryLabels: Record<string, string> = { S: 'نقاط قوت (Strengths)', W: 'نقاط ضعف (Weaknesses)', O: 'فرصت‌ها (Opportunities)', T: 'تهدیدها (Threats)' };
    setFeedback({
        correct: isCorrect,
        msg: isCorrect ? "دقیقاً!" : `اشتباه. این مورد ${categoryLabels[correctCat] || item.category} است زیرا: ${item.reason}`
    });

    if (isCorrect) {
        sfx.playSuccess();
        setSortCorrect(c => c + 1);
    } else {
        sfx.playError();
    }

    setTimeout(() => {
        setFeedback(null);
        if (currentIndex < data.items.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setPhase('strategy');
        }
    }, isCorrect ? 800 : 2500);
  };

  const handleStrategyChoice = (index: number) => {
      if (!data || strategyResult) return;

      const opt = data.strategyPhase.options[index];
      strategyPick.current = index;
      setStrategyResult({
          correct: opt.isCorrect,
          feedback: opt.feedback
      });

      if (opt.isCorrect) {
          sfx.playSuccess();
      } else {
          sfx.playError();
      }

      setTimeout(() => {
          setGameState('finished');
      }, 3000);
  };

  // Canned offline OR malformed content must not be recorded as a real result.
  const isFallback = data?._fallback === true || (!!data && !isValidSwot(data));

  // Live score on the SAME 0-100 scale the final result uses, so the HUD number
  // never contradicts the recorded score.
  const itemCount = Math.max(1, data?.items.length ?? 1);
  const liveScore = Math.round((sortCorrect / itemCount) * 50) + (strategyResult?.correct ? 50 : 0);

  if (gameState === 'finished' && data) {
      const total = Math.max(1, sortLog.current.length);
      const classAcc = (sortLog.current.filter(e => e.exact).length / total) * 100;
      const ieAcc = (sortLog.current.filter(e => e.ieCorrect).length / total) * 100;
      const pnAcc = (sortLog.current.filter(e => e.pnCorrect).length / total) * 100;
      const strategyAlignment = strategyResult?.correct ? 100 : 0;
      // Headline: exact classification (50) + strategy alignment (50).
      const finalScore = Math.round(classAcc * 0.5 + strategyAlignment * 0.5);

      const dimensions: RubricDimension[] = [
        { label: 'دقت طبقه‌بندی', value: classAcc },
        { label: 'تفکیک داخلی/خارجی', value: ieAcc },
        { label: 'تفکیک مثبت/منفی', value: pnAcc },
        { label: 'هم‌راستایی استراتژی', value: strategyAlignment },
      ];

      const strength = classAcc >= 80 ? 'گزاره‌ها را با دقت بالا طبقه‌بندی می‌کنید.'
        : strategyAlignment === 100 ? 'از تحلیل به استراتژی درست می‌رسید.'
        : ieAcc >= pnAcc ? 'تفکیک عوامل داخلی و خارجی را خوب انجام می‌دهید.'
        : 'بار مثبت و منفی عوامل را خوب تشخیص می‌دهید.';
      const blindSpot = (ieAcc < pnAcc && ieAcc < 100) ? 'گاهی عوامل داخلی (قوت/ضعف) و خارجی (فرصت/تهدید) را جابه‌جا می‌کنید.'
        : (pnAcc < 100 && pnAcc <= ieAcc) ? 'گاهی بار مثبت (قوت/فرصت) و منفی (ضعف/تهدید) گزاره‌ها را اشتباه می‌گیرید.'
        : strategyAlignment === 0 ? 'طبقه‌بندی خوب بود اما استراتژی منتخب با تحلیل هم‌راستا نبود.'
        : 'عملکرد متوازن؛ فقط چند خطای جزئی در طبقه‌بندی.';

      const payload = {
        subject: 'swot',
        dimensions: { classificationAccuracy: Math.round(classAcc), internalExternalDiscrimination: Math.round(ieAcc), positiveNegativeDiscrimination: Math.round(pnAcc), strategyAlignment },
        items: sortLog.current,
        strategyPick: strategyPick.current,
        usedFallback: isFallback,
      };

      const reset = () => {
        sortLog.current = []; strategyPick.current = null;
        setCurrentIndex(0); setSortCorrect(0); setFeedback(null);
        setStrategyResult(null); setPhase('sorting'); setGameState('playing');
      };

      return (
        <MethodologyResult
            title="تحلیل استراتژیک SWOT"
            subtitle="طبقه‌بندی و تدوین استراتژی"
            score={finalScore}
            dimensions={dimensions}
            strength={strength}
            blindSpot={blindSpot}
            onRetry={reset}
            onComplete={() => isFallback ? onExit() : onComplete(finalScore, payload)}
        />
      );
  }

  const currentItem = data?.items[currentIndex];

  return (
    <GameShell
        title="تحلیل SWOT"
        description="اول عوامل داخلی و خارجی شرکت را طبقه‌بندی کنید، بعد بر اساس تحلیل خودتان بهترین استراتژی را انتخاب کنید."
        instructions={[
            'فاز ۱: هر گزاره را در یکی از چهار خانه قوت/ضعف/فرصت/تهدید قرار دهید.',
            'قوت و ضعف عوامل «داخلی» شرکت هستند؛ فرصت و تهدید عوامل «خارجی» بازار.',
            'فاز ۲: با توجه به تحلیل، استراتژی درست را انتخاب کنید (۵۰ امتیاز).',
        ]}
        icon={<Target />}
        stats={{ score: liveScore }}
        onExit={onExit}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="blue"
    >
      <div className="h-full w-full rounded-3xl overflow-hidden flex flex-col">
        {!data && !loadError && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-900 dark:text-white animate-fade-in-up">
                <Loader2 className="animate-spin w-10 h-10 text-blue-500 mb-4" />
                <p className="text-lg font-medium">در حال تحلیل داده‌های بازار...</p>
            </div>
        )}

        {!data && loadError && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-900 dark:text-white p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد.</p>
                <button onClick={loadData} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">
                    تلاش مجدد
                </button>
            </div>
        )}

        {/* --- PHASE 1: SORTING --- */}
        {data && currentItem && phase === 'sorting' && (
            <div className="h-full bg-slate-50 dark:bg-slate-900 flex flex-col overflow-y-auto animate-fade-in-up">
                <div className="bg-white dark:bg-slate-800 p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg text-blue-600 dark:text-blue-400 shrink-0"><Building2 size={18} /></div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">فاز ۱: طبقه‌بندی ({toPersianNum(currentIndex + 1)}/{toPersianNum(data.items.length)})</p>
                        </div>
                    </div>
                    {isFallback && (
                        <div className="mt-2 bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-bold text-center">
                            نسخه آفلاین — این اجرا در کارنامه ثبت نمی‌شود.
                        </div>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">{data.companyContext}</p>
                </div>

                <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center mb-12 transform transition-all hover:scale-105 duration-300 border border-slate-100 dark:border-slate-700">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 leading-snug">"{currentItem.text}"</h3>
                        <div className="h-1 w-16 bg-slate-200 dark:bg-slate-600 mx-auto rounded-full"></div>
                    </div>

                    {feedback && (
                        <div className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm ${feedback.correct ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            <div className={`px-8 py-4 rounded-full font-bold text-white text-xl shadow-lg animate-bounce max-w-xl text-center ${feedback.correct ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                {feedback.msg}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                        <button onClick={() => handleChoice('S')} className="h-32 rounded-xl bg-green-100 dark:bg-green-500/15 border-2 border-green-200 dark:border-green-500/40 text-green-800 dark:text-green-300 text-xl font-bold hover:bg-green-200 dark:hover:bg-green-500/25 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                            <span>💪 نقاط قوت</span><span className="text-xs font-normal opacity-75">(داخلی + مثبت)</span>
                        </button>
                        <button onClick={() => handleChoice('W')} className="h-32 rounded-xl bg-red-100 dark:bg-red-500/15 border-2 border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-300 text-xl font-bold hover:bg-red-200 dark:hover:bg-red-500/25 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                            <span>⚠️ نقاط ضعف</span><span className="text-xs font-normal opacity-75">(داخلی + منفی)</span>
                        </button>
                        <button onClick={() => handleChoice('O')} className="h-32 rounded-xl bg-blue-100 dark:bg-blue-500/15 border-2 border-blue-200 dark:border-blue-500/40 text-blue-800 dark:text-blue-300 text-xl font-bold hover:bg-blue-200 dark:hover:bg-blue-500/25 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                            <span>🚀 فرصت‌ها</span><span className="text-xs font-normal opacity-75">(خارجی + مثبت)</span>
                        </button>
                        <button onClick={() => handleChoice('T')} className="h-32 rounded-xl bg-amber-100 dark:bg-amber-500/15 border-2 border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xl font-bold hover:bg-amber-200 dark:hover:bg-amber-500/25 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                            <span>🛡️ تهدیدها</span><span className="text-xs font-normal opacity-75">(خارجی + منفی)</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- PHASE 2: STRATEGY --- */}
        {data && phase === 'strategy' && (
            <div className="h-full bg-slate-900 text-white flex flex-col overflow-y-auto animate-fade-in">
                <div className="bg-slate-800 p-6 shadow-md border-b border-slate-700 text-center">
                    <h2 className="text-2xl font-black text-amber-400 mb-2">فاز ۲: تدوین استراتژی</h2>
                    <p className="text-slate-400 text-sm">بر اساس تحلیل‌های انجام شده، بهترین اقدام را انتخاب کنید.</p>
                </div>

                <div className="flex-1 p-8 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
                    <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 mb-8 w-full shadow-2xl">
                        <h3 className="text-xl md:text-2xl font-bold leading-relaxed mb-4">{data.strategyPhase.question}</h3>

                        {strategyResult && (
                            <div className={`p-4 rounded-xl mb-4 flex items-start gap-3 ${strategyResult.correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {strategyResult.correct ? <CheckCircle2 className="shrink-0" /> : <XCircle className="shrink-0" />}
                                <p className="font-bold">{strategyResult.feedback}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 w-full">
                        {data.strategyPhase.options.map((opt, idx) => (
                            <button
                                key={idx}
                                disabled={!!strategyResult}
                                onClick={() => handleStrategyChoice(idx)}
                                className={`w-full text-right p-6 rounded-2xl border-2 transition-all flex items-center justify-between group
                                    ${strategyResult
                                        ? (opt.isCorrect ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500')
                                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-amber-500 text-slate-200'
                                    }`}
                            >
                                <span className="font-bold text-lg">{opt.text}</span>
                                {!strategyResult && <div className="w-4 h-4 rounded-full border-2 border-slate-500 group-hover:border-amber-500"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </GameShell>
  );
};

export default SwotGame;
