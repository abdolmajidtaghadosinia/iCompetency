
import React, { useState, useEffect } from 'react';
import { CynefinData } from '../types';
import { generateCynefinData } from '../services/geminiService';
import { Loader2, Activity, Brain, CheckCircle2, XCircle, ChevronLeft, ShieldAlert, Compass, AlertTriangle } from 'lucide-react';
import { toPersianNum } from '../utils';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

// The AI generates a correctDomain per scenario; teach it after each answer
// with the domain's canonical sense/analyze/probe/act response pattern.
const DOMAIN_INFO: Record<string, { label: string; desc: string }> = {
  simple: { label: 'ساده / بدیهی (Clear)', desc: 'رابطه علت و معلول برای همه روشن است: حس کن، دسته‌بندی کن، پاسخ بده — بهترین روش (Best Practice) را اجرا کن.' },
  obvious: { label: 'ساده / بدیهی (Clear)', desc: 'رابطه علت و معلول برای همه روشن است: حس کن، دسته‌بندی کن، پاسخ بده — بهترین روش (Best Practice) را اجرا کن.' },
  clear: { label: 'ساده / بدیهی (Clear)', desc: 'رابطه علت و معلول برای همه روشن است: حس کن، دسته‌بندی کن، پاسخ بده — بهترین روش (Best Practice) را اجرا کن.' },
  complicated: { label: 'پیچیده (Complicated)', desc: 'رابطه علت و معلول با تحلیل کارشناسی کشف می‌شود: حس کن، تحلیل کن، پاسخ بده — روش خوب (Good Practice) با کمک خبره.' },
  complex: { label: 'پیچیده پویا (Complex)', desc: 'علت و معلول فقط در نگاه به گذشته معلوم می‌شود: بیازما (Probe)، حس کن، پاسخ بده — آزمایش‌های امن برای شکست.' },
  chaotic: { label: 'آشوبناک (Chaotic)', desc: 'رابطه علت و معلولی در کار نیست: اول عمل کن تا ثبات برقرار شود، بعد حس کن و پاسخ بده.' },
  disorder: { label: 'بی‌نظمی (Disorder)', desc: 'هنوز معلوم نیست در کدام دامنه هستید — اول موقعیت را به یکی از چهار دامنه دیگر تجزیه کنید.' },
};

const domainInfoFor = (domain: string) =>
  DOMAIN_INFO[domain.trim().toLowerCase()] ?? { label: domain, desc: 'الگوی واکنش مناسب این دامنه را مرور کنید.' };

const CynefinGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [data, setData] = useState<CynefinData | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    generateCynefinData()
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

  const handleSelect = (optionIdx: number) => {
    if (!data || selectedOptionIndex !== null) return;
    
    setSelectedOptionIndex(optionIdx);
    const scenario = data.scenarios[index];
    const selectedOption = scenario.options[optionIdx];

    if (selectedOption.isCorrect) {
        setScore(s => s + 20); // 5 scenarios * 20 = 100 max
    }
  };

  const handleNext = () => {
      if (!data) return;
      
      if (index < data.scenarios.length - 1) {
          setIndex(prev => prev + 1);
          setSelectedOptionIndex(null);
      } else {
          setFinished(true);
      }
  };

  if (loading) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white animate-fade-in-up">
            <Loader2 className="animate-spin w-10 h-10 text-rose-500 mb-4" />
            <p className="text-lg font-bold animate-pulse">در حال شبیه‌سازی بحران...</p>
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
                onClick={() => { setLoading(true); setError(false); generateCynefinData().then(d => { setData(d); setLoading(false); }).catch(() => { setError(true); setLoading(false); }); }}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors"
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

  if (finished) {
      return (
        <div className="h-full flex items-center justify-center bg-slate-900 p-4 animate-fade-in-up">
            <div className="max-w-md w-full bg-slate-800 p-8 rounded-[2rem] shadow-2xl text-center border border-slate-700">
                 <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-rose-500/20">
                    <Activity size={40} className="text-rose-500" />
                 </div>
                 <h2 className="text-2xl font-black text-white mb-2">پایان شبیه‌سازی Cynefin</h2>
                 <p className="text-slate-400 mb-6 text-sm">توانایی شما در انتخاب رویکرد مناسب برای شرایط مختلف سنجیده شد.</p>
                 
                 <div className="flex flex-col items-center gap-1 mb-8">
                    <span className="text-5xl font-black text-emerald-400">{toPersianNum(score)}</span>
                    <span className="text-xs text-slate-500 font-bold uppercase">امتیاز نهایی</span>
                 </div>

                 <button onClick={() => onComplete(score)} className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg hover:shadow-rose-500/20 active:scale-95">
                    ثبت عملکرد
                 </button>
            </div>
        </div>
      );
  }

  const scenario = data.scenarios[index];
  const progress = ((index + 1) / data.scenarios.length) * 100;

  return (
    <div className="h-full bg-slate-950 text-white flex flex-col overflow-hidden font-sans pb-20 md:pb-0">
        
        {/* Progress Line */}
        <div className="w-full h-1 bg-slate-900">
            <div className="h-full bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-lg">
                    <Brain className="text-rose-500" size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">چارچوب Cynefin</h2>
                    <p className="text-xs text-slate-500 font-medium">سناریو {toPersianNum(index + 1)} از {toPersianNum(data.scenarios.length)}</p>
                </div>
            </div>
            <div className="text-xl font-black text-slate-700 bg-slate-900 px-3 py-1 rounded-lg tabular-nums">
                {toPersianNum(score)}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full min-h-0">
            
            {/* Scenario Card */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden animate-slide-in-right shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                    <ShieldAlert className="text-rose-400 shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">وضعیت مشاهده شده</h3>
                        <p className="text-lg md:text-xl font-bold leading-relaxed text-slate-100 text-justify">
                            {scenario.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Domain Teaching Card - shown once answered */}
            {selectedOptionIndex !== null && (
                <div className="mb-6 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-5 flex items-start gap-4 animate-fade-in-up">
                    <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                        <Compass className="text-indigo-400" size={20} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">
                            دامنه صحیح: <span className="text-white">{domainInfoFor(scenario.correctDomain).label}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{domainInfoFor(scenario.correctDomain).desc}</p>
                    </div>
                </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-1 gap-4">
                {scenario.options.map((opt, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const showResult = selectedOptionIndex !== null;
                    
                    let cardClass = "bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600";
                    if (showResult) {
                        if (isSelected) {
                            cardClass = opt.isCorrect 
                                ? "bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500" 
                                : "bg-red-900/30 border-red-500/50 ring-1 ring-red-500";
                        } else if (opt.isCorrect) {
                            cardClass = "bg-emerald-900/10 border-emerald-500/30 opacity-50";
                        } else {
                            cardClass = "bg-slate-900 border-slate-800 opacity-30";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            disabled={showResult}
                            onClick={() => handleSelect(idx)}
                            className={`w-full text-right p-5 rounded-2xl border-2 transition-all flex flex-col gap-2 group ${cardClass}`}
                        >
                            <div className="flex items-start justify-between w-full">
                                <span className={`font-bold text-base md:text-lg transition-colors ${showResult && isSelected ? (opt.isCorrect ? 'text-emerald-400' : 'text-red-400') : 'text-slate-300 group-hover:text-white'}`}>
                                    {opt.text}
                                </span>
                                {showResult && isSelected && (
                                    opt.isCorrect ? <CheckCircle2 className="text-emerald-500 shrink-0" /> : <XCircle className="text-red-500 shrink-0" />
                                )}
                            </div>
                            
                            {/* Feedback Expansion */}
                            {showResult && isSelected && (
                                <div className={`mt-2 text-sm p-3 rounded-xl animate-fade-in ${opt.isCorrect ? 'bg-emerald-500/10 text-emerald-200' : 'bg-red-500/10 text-red-200'}`}>
                                    {opt.feedback}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-between items-center">
            <button onClick={onExit} className="text-slate-500 hover:text-white text-xs font-bold transition-colors">خروج</button>
            
            <button 
                onClick={handleNext}
                disabled={selectedOptionIndex === null}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                    selectedOptionIndex !== null 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg hover:shadow-rose-500/20 translate-y-0' 
                    : 'bg-slate-800 text-slate-500 translate-y-2 opacity-0 pointer-events-none'
                }`}
            >
                {index < data.scenarios.length - 1 ? 'سناریوی بعدی' : 'مشاهده نتایج'}
                <ChevronLeft size={18} />
            </button>
        </div>

    </div>
  );
};

export default CynefinGame;
