
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SjtData, SjtDimension } from '../types';
import { generateSjtData } from '../services/geminiService';
import { Loader2, Users, CheckCircle2, XCircle, ChevronLeft, AlertTriangle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import GameShell from './GameShell';
import MethodologyResult, { RubricDimension } from './MethodologyResult';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number, payload?: Record<string, unknown>) => void;
}

const DIMENSIONS: Record<SjtDimension, string> = {
  conflictManagement: 'مدیریت تعارض',
  teamCommunication: 'ارتباط تیمی',
  empathySupport: 'همدلی و حمایت',
};
const canonicalDimension = (raw: string): SjtDimension =>
  (Object.keys(DIMENSIONS) as SjtDimension[]).includes((raw || '').trim() as SjtDimension)
    ? (raw.trim() as SjtDimension)
    : 'teamCommunication';

// The UI is Persian-only; an English generation must not be shown as a real
// assessment (same guard as CynefinGame).
const hasPersian = (s: string) => /[؀-ۿ]/.test(s || '');

// A scenario is gradable when it has enough Persian options and a genuine
// ordering signal (at least two distinct effectiveness values). Ties are fine:
// the tier-based scoring below credits every option sharing the top/bottom
// value. Only a completely flat scenario carries no signal at all.
const isUsableScenario = (s: SjtData['scenarios'][number]): boolean => {
  if (!s || typeof s.context !== 'string' || !hasPersian(s.context)) return false;
  if (!Array.isArray(s.options) || s.options.length < 3) return false;
  if (!s.options.every(o => o && typeof o.text === 'string' && hasPersian(o.text)
      && typeof o.effectiveness === 'number' && Number.isFinite(o.effectiveness))) return false;
  return new Set(s.options.map(o => o.effectiveness)).size >= 2;
};

// Repair rather than reject: drop only the scenarios that are unusable and
// keep the rest. Previously a single tied pair anywhere in the set (e.g. the
// model scoring two options 2 and 2) failed an all-or-nothing check and threw
// away an otherwise good six-scenario generation, so the whole run was marked
// unrecordable.
const normalizeSjt = (d: SjtData | null): SjtData | null => {
  if (!d || !Array.isArray(d.scenarios)) return null;
  const scenarios = d.scenarios.filter(isUsableScenario);
  return scenarios.length >= 3 ? { ...d, scenarios } : null;
};

interface Attempt { dimension: SjtDimension; bestPts: number; worstPts: number; }

// Classic SJT pick-best/pick-worst partial credit, computed over the DISTINCT
// effectiveness tiers so tied options are graded consistently: everything on
// the top tier earns full credit for "most effective", the next tier down
// earns half, and likewise from the bottom for "least effective".
const tiers = (effs: number[], desc: boolean): number[] =>
  [...new Set(effs)].sort((a, b) => (desc ? b - a : a - b));
const bestPoints = (picked: number, effs: number[]): number => {
  const t = tiers(effs, true);
  return picked === t[0] ? 1 : picked === t[1] ? 0.5 : 0;
};
const worstPoints = (picked: number, effs: number[]): number => {
  const t = tiers(effs, false);
  return picked === t[0] ? 1 : picked === t[1] ? 0.5 : 0;
};

const SjtGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [raw, setRaw] = useState<SjtData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Two picks per scenario, in order: most effective first, then least.
  const [bestPick, setBestPick] = useState<number | null>(null);
  const [worstPick, setWorstPick] = useState<number | null>(null);
  const attempts = useRef<Attempt[]>([]);

  const loadData = () => {
    setLoadError(false);
    setRaw(null);
    generateSjtData().then(d => setRaw(d)).catch(() => setLoadError(true));
  };
  useEffect(loadData, []);
  useEffect(() => {
    if (raw || loadError) return;
    const t = setTimeout(() => setLoadError(true), 15000);
    return () => clearTimeout(t);
  }, [raw, loadError]);

  // Play the usable subset when there is one; otherwise still render whatever
  // came back (so the player sees content) but never record the run.
  const usable = useMemo(() => normalizeSjt(raw), [raw]);
  const data = usable ?? raw;

  const scenario = data?.scenarios[index];
  const answered = worstPick !== null;

  const pickBest = (idx: number) => {
    if (bestPick !== null) return;
    sfx.playClick();
    setBestPick(idx);
  };

  const pickWorst = (idx: number) => {
    if (!scenario || bestPick === null || worstPick !== null || idx === bestPick) return;
    setWorstPick(idx);
    const effs = scenario.options.map(o => o.effectiveness);
    const bPts = bestPoints(scenario.options[bestPick].effectiveness, effs);
    const wPts = worstPoints(scenario.options[idx].effectiveness, effs);
    attempts.current.push({ dimension: canonicalDimension(scenario.dimension), bestPts: bPts, worstPts: wPts });
    if (bPts + wPts >= 1.5) sfx.playSuccess(); else sfx.playError();
  };

  const handleNext = () => {
    if (!data) return;
    if (index < data.scenarios.length - 1) {
      setIndex(i => i + 1);
      setBestPick(null);
      setWorstPick(null);
    } else {
      setGameState('finished');
    }
  };

  const isFallback = raw?._fallback === true || (!!raw && usable === null);

  if (gameState === 'finished' && data) {
    // Per-dimension percentages from the pick-best/pick-worst points.
    const byDim: Record<string, { got: number; max: number }> = {};
    attempts.current.forEach(a => {
      const d = byDim[a.dimension] ?? (byDim[a.dimension] = { got: 0, max: 0 });
      d.got += a.bestPts + a.worstPts;
      d.max += 2;
    });
    const dimScores: Record<string, number> = {};
    Object.entries(byDim).forEach(([k, v]) => { dimScores[k] = Math.round((v.got / Math.max(1, v.max)) * 100); });

    const totalGot = attempts.current.reduce((s, a) => s + a.bestPts + a.worstPts, 0);
    const totalMax = Math.max(1, attempts.current.length * 2);
    const finalScore = Math.round((totalGot / totalMax) * 100);

    const dimensions: RubricDimension[] = Object.entries(dimScores).map(([k, v]) => ({
      label: DIMENSIONS[k as SjtDimension] ?? k,
      value: v,
    }));

    const ranked = Object.entries(dimScores).sort((a, b) => b[1] - a[1]);
    const strength = ranked.length > 0
      ? `در «${DIMENSIONS[ranked[0][0] as SjtDimension] ?? ranked[0][0]}» بهترین قضاوت را دارید.`
      : 'قضاوت موقعیتی شما سنجیده شد.';
    const worstDim = ranked[ranked.length - 1];
    const blindSpot = ranked.length > 1 && worstDim[1] < ranked[0][1]
      ? `در موقعیت‌های «${DIMENSIONS[worstDim[0] as SjtDimension] ?? worstDim[0]}» گزینه‌های مؤثرتر را کمتر تشخیص می‌دهید.`
      : 'تشخیص «بدترین اقدام» معمولاً سخت‌تر از بهترین است — روی پیامدهای منفی گزینه‌ها دقت کنید.';

    const payload = {
      subject: 'sjt',
      dimensions: dimScores,
      scenarios: attempts.current,
      usedFallback: isFallback,
    };

    const reset = () => {
      attempts.current = [];
      setIndex(0); setBestPick(null); setWorstPick(null);
      setGameState('playing');
    };

    return (
      <MethodologyResult
        title="قضاوت موقعیتی بین‌فردی"
        subtitle="Situational Judgment Test"
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

  return (
    <GameShell
      title="قضاوت موقعیتی بین‌فردی (SJT)"
      description="در هر موقعیت کاری، از میان چهار اقدام ممکن، مؤثرترین و کم‌اثرترین را انتخاب کنید. همه گزینه‌ها منطقی به نظر می‌رسند — تفاوت در پیامدهاست."
      instructions={[
        'گام ۱: مؤثرترین اقدام را انتخاب کنید.',
        'گام ۲: کم‌اثرترین (یا مخرب‌ترین) اقدام را انتخاب کنید.',
        'پس از هر پاسخ، رتبه اثربخشی واقعی گزینه‌ها و دلیل آن نمایش داده می‌شود.',
      ]}
      icon={<Users />}
      stats={{ score: Math.round(attempts.current.reduce((s, a) => s + (a.bestPts + a.worstPts) * 50, 0)) }}
      onExit={onExit}
      gameState={gameState}
      setGameState={setGameState}
      colorTheme="teal"
    >
      <div className="h-full w-full bg-slate-950 text-white flex flex-col overflow-hidden rounded-3xl">
        {!data && !loadError && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
            <Loader2 className="animate-spin w-10 h-10 text-teal-500 mb-4" />
            <p className="text-lg font-bold animate-pulse">در حال آماده‌سازی موقعیت‌های کاری...</p>
          </div>
        )}
        {!data && loadError && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
            <p className="text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد.</p>
            <button onClick={loadData} className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors">تلاش مجدد</button>
          </div>
        )}

        {data && scenario && (
          <>
            <div className="w-full h-1 bg-slate-900"><div className="h-full bg-teal-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
            {isFallback && (
              <div className="mx-4 mt-3 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold text-center">
                نسخه آفلاین یا داده ناقص — این اجرا در کارنامه ثبت نمی‌شود.
              </div>
            )}
            <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-medium pt-3">
              <span>موقعیت {toPersianNum(index + 1)} از {toPersianNum(data.scenarios.length)}</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold">
                {DIMENSIONS[canonicalDimension(scenario.dimension)]}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full min-h-0">
              {/* Scenario */}
              <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 md:p-7 mb-6 relative overflow-hidden animate-slide-in-right shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start gap-4 relative z-10">
                  <MessageSquare className="text-teal-400 shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">موقعیت کاری</h3>
                    <p className="text-lg md:text-xl font-bold leading-relaxed text-slate-100 text-justify">{scenario.context}</p>
                  </div>
                </div>
              </div>

              {/* Step prompt */}
              <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                {bestPick === null ? (
                  <><span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"><ThumbsUp size={11} /></span> مؤثرترین اقدام کدام است؟</>
                ) : !answered ? (
                  <><span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center"><ThumbsDown size={11} /></span> کم‌اثرترین اقدام کدام است؟</>
                ) : (
                  <>رتبه اثربخشی واقعی گزینه‌ها:</>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {scenario.options.map((opt, idx) => {
                  const isBestPick = bestPick === idx;
                  const isWorstPick = worstPick === idx;
                  const effs = scenario.options.map(o => o.effectiveness);
                  const isTrueBest = opt.effectiveness === Math.max(...effs);
                  const isTrueWorst = opt.effectiveness === Math.min(...effs);

                  let cls = 'bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer';
                  if (!answered && isBestPick) cls = 'bg-emerald-900/30 border-emerald-500/60 ring-1 ring-emerald-500';
                  if (answered) {
                    if (isTrueBest) cls = 'bg-emerald-900/25 border-emerald-500/50';
                    else if (isTrueWorst) cls = 'bg-rose-900/25 border-rose-500/50';
                    else cls = 'bg-slate-900 border-slate-800 opacity-70';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={answered || (bestPick !== null && idx === bestPick)}
                      onClick={() => (bestPick === null ? pickBest(idx) : pickWorst(idx))}
                      className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${cls}`}
                    >
                      <div className="flex items-start justify-between w-full gap-3">
                        <span className="font-bold text-sm md:text-base text-slate-200 leading-relaxed">{opt.text}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {isBestPick && (
                            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                              <ThumbsUp size={10} /> انتخاب شما
                            </span>
                          )}
                          {isWorstPick && (
                            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40">
                              <ThumbsDown size={10} /> انتخاب شما
                            </span>
                          )}
                          {answered && (
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${
                              isTrueBest ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : isTrueWorst ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                              : 'bg-slate-700/40 text-slate-400 border-slate-600'
                            }`}>
                              رتبه {toPersianNum(4 - Math.min(3, Math.max(0, Math.round(opt.effectiveness))))}
                            </span>
                          )}
                        </span>
                      </div>
                      {answered && (isBestPick || isWorstPick || isTrueBest || isTrueWorst) && opt.feedback && (
                        <div className={`mt-1 text-sm p-3 rounded-xl text-right w-full ${
                          isTrueBest ? 'bg-emerald-500/10 text-emerald-200' : isTrueWorst ? 'bg-rose-500/10 text-rose-200' : 'bg-slate-800/60 text-slate-300'
                        }`}>{opt.feedback}</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Verdict after both picks */}
              {answered && bestPick !== null && (() => {
                const effs = scenario.options.map(o => o.effectiveness);
                const bPts = bestPoints(scenario.options[bestPick].effectiveness, effs);
                const wPts = worstPoints(scenario.options[worstPick as number].effectiveness, effs);
                const pct = Math.round(((bPts + wPts) / 2) * 100);
                return (
                  <div className={`mt-6 rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up border ${
                    pct >= 75 ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200' : pct >= 50 ? 'bg-amber-950/50 border-amber-500/30 text-amber-200' : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
                  }`}>
                    {pct >= 75 ? <CheckCircle2 size={20} className="shrink-0" /> : <XCircle size={20} className="shrink-0" />}
                    <span className="text-sm font-bold">امتیاز این موقعیت: {toPersianNum(pct)}٪ — {pct >= 75 ? 'قضاوت دقیق!' : pct >= 50 ? 'نزدیک بود؛ به تفاوت پیامدها دقت کنید.' : 'رتبه‌بندی گزینه‌ها را در بازخوردها مرور کنید.'}</span>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-end items-center">
              <button onClick={handleNext} disabled={!answered}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${answered ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 opacity-0 pointer-events-none'}`}>
                {index < data.scenarios.length - 1 ? 'موقعیت بعدی' : 'مشاهده کارنامه'}
                <ChevronLeft size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </GameShell>
  );
};

export default SjtGame;
