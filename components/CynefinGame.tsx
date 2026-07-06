
import React, { useState, useEffect } from 'react';
import { CynefinData } from '../types';
import { generateCynefinData } from '../services/geminiService';
import { Loader2, Brain, CheckCircle2, XCircle, ChevronLeft, ShieldAlert, Compass, AlertTriangle } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

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
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [data, setData] = useState<CynefinData | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  // The AI scenario set loads in the background while the intro modal is
  // up, so a normal reader never sees the loading spinner.
  const loadData = () => {
    setLoadError(false);
    setData(null);
    generateCynefinData()
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

  const handleSelect = (optionIdx: number) => {
    if (!data || selectedOptionIndex !== null) return;

    setSelectedOptionIndex(optionIdx);
    const scenario = data.scenarios[index];
    const selectedOption = scenario.options[optionIdx];

    if (selectedOption.isCorrect) {
        sfx.playSuccess();
        setScore(s => s + 20); // 5 scenarios * 20 = 100 max
        setCorrectCount(c => c + 1);
    } else {
        sfx.playError();
    }
  };

  const handleNext = () => {
      if (!data) return;

      if (index < data.scenarios.length - 1) {
          setIndex(prev => prev + 1);
          setSelectedOptionIndex(null);
      } else {
          setGameState('finished');
      }
  };

  if (gameState === 'finished' && data) {
      // The AI may return more or fewer than 5 scenarios, so the final score
      // is the correct-answer ratio on a fixed 0-100 scale rather than the
      // running 20-points-per-hit HUD score.
      const finalScore = Math.round((correctCount / Math.max(1, data.scenarios.length)) * 100);
      return (
        <GameResultCard
            title="چارچوب Cynefin"
            rawScore={finalScore}
            metrics={[
                { label: 'تشخیص صحیح', value: `${toPersianNum(correctCount)}/${toPersianNum(data.scenarios.length)}` },
                { label: 'دامنه‌های سنجیده', value: toPersianNum(data.scenarios.length) },
            ]}
            onComplete={() => onComplete(finalScore)}
        />
      );
  }

  const scenario = data?.scenarios[index];
  const progress = data ? ((index + 1) / data.scenarios.length) * 100 : 0;

  return (
    <GameShell
        title="چارچوب Cynefin"
        description="برای هر موقعیت، اول تشخیص دهید در کدام دامنه پیچیدگی هستید و بعد واکنش مدیریتی درست را انتخاب کنید."
        instructions={[
            'هر سناریو یک وضعیت واقعی سازمانی را توصیف می‌کند.',
            'واکنشی را انتخاب کنید که با نوع پیچیدگی موقعیت هم‌خوانی دارد.',
            'بعد از هر پاسخ، دامنه صحیح و الگوی واکنش آن آموزش داده می‌شود.',
        ]}
        icon={<Brain />}
        stats={{ score }}
        onExit={onExit}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="rose"
    >
      <div className="h-full w-full bg-slate-950 text-white flex flex-col overflow-hidden rounded-3xl">
        {!data && !loadError && (
            <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
                <Loader2 className="animate-spin w-10 h-10 text-rose-500 mb-4" />
                <p className="text-lg font-bold animate-pulse">در حال شبیه‌سازی بحران...</p>
            </div>
        )}

        {!data && loadError && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
                <p className="text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.</p>
                <button onClick={loadData} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors">
                    تلاش مجدد
                </button>
            </div>
        )}

        {data && scenario && (
          <>
            {/* Progress Line */}
            <div className="w-full h-1 bg-slate-900">
                <div className="h-full bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="text-center text-xs text-slate-500 font-medium pt-3">
                سناریو {toPersianNum(index + 1)} از {toPersianNum(data.scenarios.length)}
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
            <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-end items-center">
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
          </>
        )}
      </div>
    </GameShell>
  );
};

export default CynefinGame;
