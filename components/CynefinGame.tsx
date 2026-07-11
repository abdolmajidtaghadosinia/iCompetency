
import React, { useState, useEffect, useRef } from 'react';
import { CynefinData } from '../types';
import { generateCynefinData } from '../services/geminiService';
import { Loader2, Brain, CheckCircle2, XCircle, ChevronLeft, ShieldAlert, Compass, AlertTriangle } from 'lucide-react';
import GameShell from './GameShell';
import MethodologyResult, { RubricDimension } from './MethodologyResult';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number, payload?: Record<string, unknown>) => void;
}

// The five canonical Cynefin domains. The AI labels correctDomain with various
// synonyms (simple/obvious/clear …); canonicalize before comparing.
type DomainKey = 'clear' | 'complicated' | 'complex' | 'chaotic' | 'disorder';
const DOMAINS: { key: DomainKey; label: string; response: string; desc: string }[] = [
  { key: 'clear', label: 'ساده / بدیهی', response: 'اجرای بهترین‌روش', desc: 'رابطه علت و معلول برای همه روشن است: حس کن، دسته‌بندی کن، پاسخ بده — بهترین روش (Best Practice) را اجرا کن.' },
  { key: 'complicated', label: 'پیچیده', response: 'تحلیل کارشناسی', desc: 'رابطه علت و معلول با تحلیل تخصصی کشف می‌شود: حس کن، تحلیل کن، پاسخ بده — روش خوب با کمک خبره.' },
  { key: 'complex', label: 'پیچیده پویا', response: 'آزمایش‌های امن‌به‌شکست', desc: 'علت و معلول فقط در نگاه به گذشته معلوم می‌شود: بیازما (Probe)، حس کن، پاسخ بده — آزمایش‌های امن برای یادگیری.' },
  { key: 'chaotic', label: 'آشوبناک', response: 'اقدام فوری برای ثبات', desc: 'رابطه علت و معلولی در کار نیست: اول عمل کن تا ثبات برقرار شود، بعد حس کن و پاسخ بده.' },
  { key: 'disorder', label: 'بی‌نظمی', response: 'تجزیه موقعیت', desc: 'هنوز معلوم نیست در کدام دامنه هستید — اول موقعیت را به بخش‌های قابل تشخیص تجزیه کنید.' },
];
const DOMAIN_MAP: Record<string, DomainKey> = {
  simple: 'clear', obvious: 'clear', clear: 'clear',
  complicated: 'complicated', complex: 'complex', chaotic: 'chaotic', disorder: 'disorder',
};
const canonicalDomain = (raw: string): DomainKey | null => DOMAIN_MAP[(raw || '').trim().toLowerCase()] ?? null;
const domainLabel = (k: DomainKey | null) => DOMAINS.find(d => d.key === k)?.label ?? '—';

// Reject malformed AI data so a bad generation never becomes a scored (and
// unfair) assessment. Invalid data is treated like the offline fallback.
const isValidCynefin = (d: CynefinData | null): boolean =>
  !!d && Array.isArray(d.scenarios) && d.scenarios.length > 0 &&
  d.scenarios.every(s =>
    !!s && typeof s.description === 'string' && s.description.trim().length > 0 &&
    Array.isArray(s.options) && s.options.length >= 2 &&
    s.options.some(o => o.isCorrect) && canonicalDomain(s.correctDomain) !== null);

interface Attempt { correctDomain: DomainKey; domainPick: DomainKey; domainCorrect: boolean; responseCorrect: boolean; }

const CynefinGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [data, setData] = useState<CynefinData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Per-scenario step: pick domain first (no feedback), then response, then reveal.
  const [domainPick, setDomainPick] = useState<DomainKey | null>(null);
  const [optionPick, setOptionPick] = useState<number | null>(null);
  const attempts = useRef<Attempt[]>([]);

  const loadData = () => {
    setLoadError(false);
    setData(null);
    generateCynefinData().then(d => setData(d)).catch(() => setLoadError(true));
  };
  useEffect(loadData, []);
  useEffect(() => {
    if (data || loadError) return;
    const t = setTimeout(() => setLoadError(true), 15000);
    return () => clearTimeout(t);
  }, [data, loadError]);

  const scenario = data?.scenarios[index];
  const scenarioDomain = scenario ? canonicalDomain(scenario.correctDomain) : null;

  const pickDomain = (k: DomainKey) => {
    if (domainPick !== null) return;
    sfx.playClick();
    setDomainPick(k); // no correctness feedback yet, to keep the response choice independent
  };

  const pickResponse = (optionIdx: number) => {
    if (!scenario || domainPick === null || optionPick !== null) return;
    setOptionPick(optionIdx);
    const responseCorrect = !!scenario.options[optionIdx].isCorrect;
    const domainCorrect = domainPick === scenarioDomain;
    attempts.current.push({ correctDomain: scenarioDomain as DomainKey, domainPick, domainCorrect, responseCorrect });
    if (responseCorrect && domainCorrect) sfx.playSuccess(); else sfx.playError();
  };

  const handleNext = () => {
    if (!data) return;
    if (index < data.scenarios.length - 1) {
      setIndex(i => i + 1);
      setDomainPick(null);
      setOptionPick(null);
    } else {
      setGameState('finished');
    }
  };

  const isFallback = data?._fallback === true || (!!data && !isValidCynefin(data));

  if (gameState === 'finished' && data) {
    const n = Math.max(1, attempts.current.length);
    const domainCorrect = attempts.current.filter(a => a.domainCorrect).length;
    const responseCorrect = attempts.current.filter(a => a.responseCorrect).length;
    const domainAcc = (domainCorrect / n) * 100;
    const responseAcc = (responseCorrect / n) * 100;
    // Domain detection and response fit weigh equally in the final measure.
    const finalScore = Math.round(domainAcc * 0.5 + responseAcc * 0.5);

    const dimensions: RubricDimension[] = [
      { label: 'تشخیص دامنه', value: domainAcc },
      { label: 'انتخاب واکنش', value: responseAcc },
    ];

    // Blind spot: the most frequent misclassification (picked vs correct).
    const misPairs: Record<string, number> = {};
    attempts.current.forEach(a => { if (!a.domainCorrect) { const k = `${a.domainPick}>${a.correctDomain}`; misPairs[k] = (misPairs[k] || 0) + 1; } });
    const topMis = Object.entries(misPairs).sort((a, b) => b[1] - a[1])[0];
    const strength = domainAcc >= responseAcc
      ? 'در تشخیص نوع پیچیدگی موقعیت خوب عمل می‌کنید.'
      : 'واکنش مدیریتی متناسب با موقعیت را درست انتخاب می‌کنید.';
    const blindSpot = topMis
      ? `گرایش دارید موقعیت «${domainLabel(topMis[0].split('>')[1] as DomainKey)}» را «${domainLabel(topMis[0].split('>')[0] as DomainKey)}» تشخیص دهید.`
      : (responseAcc < domainAcc ? 'گاهی دامنه را درست می‌بینید اما واکنش نامتناسب انتخاب می‌کنید.' : 'در چند موقعیت واکنش عجولانه انتخاب شد.');

    const payload = {
      subject: 'cynefin',
      dimensions: { domainAccuracy: Math.round(domainAcc), responseAccuracy: Math.round(responseAcc) },
      scenarios: attempts.current,
      usedFallback: isFallback,
    };

    const reset = () => {
      attempts.current = [];
      setIndex(0); setDomainPick(null); setOptionPick(null);
      setGameState('playing');
    };

    return (
      <MethodologyResult
        title="چارچوب Cynefin"
        subtitle="تصمیم‌گیری زمینه‌مند"
        score={finalScore}
        dimensions={dimensions}
        strength={strength}
        blindSpot={blindSpot}
        onRetry={reset}
        onComplete={() => isFallback ? onExit() : onComplete(finalScore, payload)}
      />
    );
  }

  const progress = data ? ((index + 1) / data.scenarios.length) * 100 : 0;
  const answered = optionPick !== null;

  return (
    <GameShell
      title="چارچوب Cynefin"
      description="برای هر موقعیت، اول تشخیص دهید در کدام دامنه پیچیدگی قرار دارید، سپس واکنش مدیریتی درست را انتخاب کنید. این دو جداگانه سنجیده می‌شوند."
      instructions={[
        'گام ۱: نوع پیچیدگی موقعیت را از میان پنج دامنه انتخاب کنید.',
        'گام ۲: بهترین واکنش مدیریتی را برگزینید.',
        'پس از هر پاسخ، دامنه صحیح و الگوی واکنش آن آموزش داده می‌شود.',
      ]}
      icon={<Brain />}
      stats={{ score: attempts.current.reduce((s, a) => s + (a.domainCorrect ? 50 : 0) + (a.responseCorrect ? 50 : 0), 0) }}
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
            <p className="text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد.</p>
            <button onClick={loadData} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors">تلاش مجدد</button>
          </div>
        )}

        {data && scenario && (
          <>
            <div className="w-full h-1 bg-slate-900"><div className="h-full bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
            {isFallback && (
              <div className="mx-4 mt-3 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold text-center">
                نسخه آفلاین یا داده ناقص — این اجرا در کارنامه ثبت نمی‌شود.
              </div>
            )}
            <div className="text-center text-xs text-slate-500 font-medium pt-3">سناریو {toPersianNum(index + 1)} از {toPersianNum(data.scenarios.length)}</div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full min-h-0">
              {/* Scenario */}
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 md:p-7 mb-6 relative overflow-hidden animate-slide-in-right shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start gap-4 relative z-10">
                  <ShieldAlert className="text-rose-400 shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">وضعیت مشاهده شده</h3>
                    <p className="text-lg md:text-xl font-bold leading-relaxed text-slate-100 text-justify">{scenario.description}</p>
                  </div>
                </div>
              </div>

              {/* STEP 1: domain */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">۱</span>
                  این موقعیت در کدام دامنه است؟
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {DOMAINS.map(d => {
                    const picked = domainPick === d.key;
                    const isRight = answered && d.key === scenarioDomain;
                    const wrongPick = answered && picked && d.key !== scenarioDomain;
                    return (
                      <button key={d.key} disabled={domainPick !== null} onClick={() => pickDomain(d.key)}
                        className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                          isRight ? 'bg-emerald-900/30 border-emerald-500 text-emerald-300'
                          : wrongPick ? 'bg-red-900/30 border-red-500 text-red-300'
                          : picked ? 'bg-rose-900/30 border-rose-500 text-rose-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                        {d.label}
                        {isRight && <CheckCircle2 size={13} className="inline mr-1" />}
                        {wrongPick && <XCircle size={13} className="inline mr-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: response — revealed after domain pick */}
              {domainPick !== null && (
                <div className="animate-fade-in-up">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">۲</span>
                    بهترین واکنش مدیریتی کدام است؟
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {scenario.options.map((opt, idx) => {
                      const isSel = optionPick === idx;
                      let cls = 'bg-slate-800 border-slate-700 hover:border-slate-500';
                      if (answered) {
                        if (isSel) cls = opt.isCorrect ? 'bg-emerald-900/30 border-emerald-500/60 ring-1 ring-emerald-500' : 'bg-red-900/30 border-red-500/60 ring-1 ring-red-500';
                        else if (opt.isCorrect) cls = 'bg-emerald-900/10 border-emerald-500/30 opacity-60';
                        else cls = 'bg-slate-900 border-slate-800 opacity-30';
                      }
                      return (
                        <button key={idx} disabled={answered} onClick={() => pickResponse(idx)}
                          className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${cls}`}>
                          <div className="flex items-start justify-between w-full">
                            <span className={`font-bold text-sm md:text-base ${answered && isSel ? (opt.isCorrect ? 'text-emerald-400' : 'text-red-400') : 'text-slate-200'}`}>{opt.text}</span>
                            {answered && isSel && (opt.isCorrect ? <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> : <XCircle className="text-red-500 shrink-0" size={18} />)}
                          </div>
                          {answered && isSel && (
                            <div className={`mt-1 text-sm p-3 rounded-xl ${opt.isCorrect ? 'bg-emerald-500/10 text-emerald-200' : 'bg-red-500/10 text-red-200'}`}>{opt.feedback}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teaching card after answering */}
              {answered && scenarioDomain && (
                <div className="mt-6 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-5 flex items-start gap-4 animate-fade-in-up">
                  <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0"><Compass className="text-indigo-400" size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">
                      دامنه صحیح: <span className="text-white">{domainLabel(scenarioDomain)}</span>
                      {domainPick === scenarioDomain ? <span className="text-emerald-400 mr-2">(تشخیص شما درست بود)</span> : <span className="text-amber-400 mr-2">(شما «{domainLabel(domainPick)}» تشخیص دادید)</span>}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{DOMAINS.find(d => d.key === scenarioDomain)?.desc}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-end items-center">
              <button onClick={handleNext} disabled={!answered}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${answered ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 opacity-0 pointer-events-none'}`}>
                {index < data.scenarios.length - 1 ? 'سناریوی بعدی' : 'مشاهده کارنامه'}
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
