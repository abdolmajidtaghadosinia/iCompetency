
import React, { useState, useEffect } from 'react';
import { SwotData } from '../types';
import { generateSwotData } from '../services/geminiService';
import { Loader2, Building2, BrainCircuit, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

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
  onComplete: (score: number) => void;
}

const SwotGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [data, setData] = useState<SwotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<'sorting' | 'strategy' | 'finished'>('sorting');
  
  // Phase 1 State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [sortCorrect, setSortCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{correct: boolean, msg: string} | null>(null);
  
  // Phase 2 State
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null); // Index
  const [strategyResult, setStrategyResult] = useState<{correct: boolean, feedback: string} | null>(null);

  useEffect(() => {
    generateSwotData()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Timeout safety net: if loading takes more than 15 seconds, show error
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (loading) { setError(true); setLoading(false); }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleChoice = (category: 'S' | 'W' | 'O' | 'T') => {
    if (!data || feedback) return;
    
    const item = data.items[currentIndex];
    const isCorrect = normalizeCategory(item.category) === category;

    const categoryLabels: Record<string, string> = { S: 'نقاط قوت (Strengths)', W: 'نقاط ضعف (Weaknesses)', O: 'فرصت‌ها (Opportunities)', T: 'تهدیدها (Threats)' };
    setFeedback({
        correct: isCorrect,
        msg: isCorrect ? "دقیقاً!" : `اشتباه. این مورد ${categoryLabels[normalizeCategory(item.category)] || item.category} است زیرا: ${item.reason}`
    });

    if (isCorrect) {
        sfx.playSuccess();
        setScore(s => s + 10);
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
      setStrategyResult({
          correct: opt.isCorrect,
          feedback: opt.feedback
      });

      if (opt.isCorrect) {
          sfx.playSuccess();
          setScore(s => s + 50); // Big bonus for strategy
      } else {
          sfx.playError();
      }

      setTimeout(() => {
          setPhase('finished');
      }, 3000);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 animate-fade-in-up">
        <Loader2 className="animate-spin w-10 h-10 text-blue-500 mb-4" />
        <p className="text-lg font-medium">در حال تحلیل داده‌های بازار...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
        <p className="text-slate-500 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد.</p>
        <div className="flex gap-3">
            <button 
                onClick={() => { setLoading(true); setError(false); generateSwotData().then(d => { setData(d); setLoading(false); }).catch(() => { setError(true); setLoading(false); }); }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
                تلاش مجدد
            </button>
            <button onClick={onExit} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors">
                بازگشت
            </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
      // AI generates 8-10 items, so the raw point total has a variable maximum.
      // Normalize: sorting is worth 50 (proportional to items) and picking the
      // right strategy is worth 50, for a fixed 0-100 scale.
      const normalizedScore = Math.round((sortCorrect / Math.max(1, data.items.length)) * 50)
        + (strategyResult?.correct ? 50 : 0);
      return (
        <div className="h-full flex items-center justify-center bg-slate-50 animate-fade-in-up">
            <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl text-center border border-slate-100">
                 <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BrainCircuit className="w-10 h-10 text-blue-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">پایان تحلیل استراتژیک</h2>
                 <p className="text-slate-500 mb-6">شما فرآیند تحلیل و تدوین استراتژی را تکمیل کردید.</p>
                 <div className="text-5xl font-black text-blue-600 mb-2">{toPersianNum(normalizedScore)}<span className="text-xl text-slate-400">/۱۰۰</span></div>
                 <div className="flex justify-center gap-3 text-xs font-bold text-slate-500 mb-8">
                     <span className="bg-slate-100 px-3 py-1 rounded-full">طبقه‌بندی: {toPersianNum(sortCorrect)}/{toPersianNum(data.items.length)}</span>
                     <span className={`px-3 py-1 rounded-full ${strategyResult?.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        استراتژی: {strategyResult?.correct ? 'صحیح' : 'ناموفق'}
                     </span>
                 </div>
                 <button onClick={() => onComplete(normalizedScore)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                    ثبت در کارنامه
                 </button>
            </div>
        </div>
      );
  }

  // --- PHASE 1: SORTING ---
  if (phase === 'sorting') {
      const currentItem = data.items[currentIndex];
      return (
        <div className="h-full bg-slate-50 flex flex-col overflow-y-auto animate-fade-in-up pb-20 md:pb-0">
            <div className="bg-white p-3 md:p-4 border-b border-slate-200 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0"><Building2 size={18} /></div>
                        <p className="text-xs text-slate-500 font-bold">فاز ۱: طبقه‌بندی ({toPersianNum(currentIndex + 1)}/{toPersianNum(data.items.length)})</p>
                    </div>
                    <div className="text-lg font-bold text-blue-600 tabular-nums bg-blue-50 px-3 py-1 rounded-full">{toPersianNum(score)}</div>
                </div>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{data.companyContext}</p>
            </div>

            <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center mb-12 transform transition-all hover:scale-105 duration-300 border border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4 leading-snug">"{currentItem.text}"</h3>
                    <div className="h-1 w-16 bg-slate-200 mx-auto rounded-full"></div>
                </div>

                {feedback && (
                    <div className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm ${feedback.correct ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <div className={`px-8 py-4 rounded-full font-bold text-white text-xl shadow-lg animate-bounce ${feedback.correct ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {feedback.msg}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                    <button onClick={() => handleChoice('S')} className="h-32 rounded-xl bg-green-100 border-2 border-green-200 text-green-800 text-xl font-bold hover:bg-green-200 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                        <span>💪 نقاط قوت</span><span className="text-xs font-normal opacity-75">(داخلی + مثبت)</span>
                    </button>
                    <button onClick={() => handleChoice('W')} className="h-32 rounded-xl bg-red-100 border-2 border-red-200 text-red-800 text-xl font-bold hover:bg-red-200 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                        <span>⚠️ نقاط ضعف</span><span className="text-xs font-normal opacity-75">(داخلی + منفی)</span>
                    </button>
                    <button onClick={() => handleChoice('O')} className="h-32 rounded-xl bg-blue-100 border-2 border-blue-200 text-blue-800 text-xl font-bold hover:bg-blue-200 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                        <span>🚀 فرصت‌ها</span><span className="text-xs font-normal opacity-75">(خارجی + مثبت)</span>
                    </button>
                    <button onClick={() => handleChoice('T')} className="h-32 rounded-xl bg-amber-100 border-2 border-amber-200 text-amber-800 text-xl font-bold hover:bg-amber-200 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                        <span>🛡️ تهدیدها</span><span className="text-xs font-normal opacity-75">(خارجی + منفی)</span>
                    </button>
                </div>
            </div>
            <div className="p-4 text-center"><button onClick={onExit} className="text-slate-400 hover:text-slate-600 transition-colors">خروج</button></div>
        </div>
      );
  }

  // --- PHASE 2: STRATEGY ---
  return (
    <div className="h-full bg-slate-900 text-white flex flex-col overflow-y-auto animate-fade-in pb-20 md:pb-0">
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
  );
};

export default SwotGame;
