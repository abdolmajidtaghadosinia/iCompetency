
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, FileText, CheckCircle2, AlertTriangle, XCircle, FolderOpen, MessageSquare,
  Terminal, Fingerprint, Shield, User, Loader2, RefreshCw, Wallet, Gavel, Lock,
  Coins, ScrollText, ChevronLeft
} from 'lucide-react';
import GameIntro from './GameIntro';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';
import { FactFindingScenario, FactAction, FactSource, FactSourceType } from '../types';
import { generateFactFindingScenario } from '../services/geminiService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

// The AI often omits or duplicates the id fields on nested objects, which broke
// source selection and action tracking (the "detail won't build" bug). Reassign
// deterministic index-based ids on load so every lookup is stable regardless of
// what the model returned.
const normalizeScenario = (s: FactFindingScenario): FactFindingScenario => ({
  ...s,
  categories: (s.categories ?? []).map((cat, ci) => ({
    ...cat,
    id: `cat-${ci}`,
    sources: (cat.sources ?? []).map((src, si) => ({
      ...src,
      id: `cat-${ci}-src-${si}`,
      actions: (src.actions ?? []).map((act, ai) => ({ ...act, id: `cat-${ci}-src-${si}-act-${ai}` })),
    })),
  })),
  options: (s.options ?? []).map((o, oi) => ({ ...o, id: `opt-${oi}` })),
});

const ReliabilityRing: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = v >= 80 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" stroke={color} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black tabular-nums" style={{ color }}>{toPersianNum(v)}</span>
        <span className="text-[8px] text-slate-400 font-bold -mt-0.5">اعتبار</span>
      </div>
    </div>
  );
};

const FactFindingGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<FactFindingScenario | null>(null);

  const [currentBudget, setCurrentBudget] = useState(0);
  const [performedActions, setPerformedActions] = useState<string[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);

  const [gameState, setGameState] = useState<'playing' | 'result'>('playing');
  const [result, setResult] = useState<{ isWin: boolean; feedback: string; score: number } | null>(null);
  // Best single round counts (matches the server's best-attempt policy);
  // summing across replays let users farm an unbounded score by replaying.
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    if (!showIntro && !scenario) loadNewScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);

  const loadNewScenario = async () => {
    setLoading(true);
    setGameState('playing');
    setResult(null);
    setPerformedActions([]);
    setSelectedSourceId(null);
    setOpenCategoryId(null);
    setShowDecision(false);
    try {
      const raw = await generateFactFindingScenario();
      const s = normalizeScenario(raw);
      setScenario(s);
      setCurrentBudget(s.budget);
      // Auto-open the first category so the directory is never a dead end.
      setOpenCategoryId(s.categories[0]?.id ?? null);
    } catch {
      setScenario(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => { if (loading) setLoading(false); }, 15000);
    return () => clearTimeout(t);
  }, [loading]);

  // Robust, id-based flat index so the detail pane never depends on category
  // state being in sync with the selected source.
  const sourceIndex = useMemo(() => {
    const m = new Map<string, { src: FactSource; catTitle: string }>();
    scenario?.categories.forEach(cat => cat.sources.forEach(src => m.set(src.id, { src, catTitle: cat.title })));
    return m;
  }, [scenario]);

  const handleAction = (action: FactAction) => {
    if (performedActions.includes(action.id)) return;
    if (currentBudget >= action.cost) {
      sfx.playClick();
      setCurrentBudget(prev => prev - action.cost);
      setPerformedActions(prev => [...prev, action.id]);
    } else {
      sfx.playError();
    }
  };

  const handleDecision = (optionId: string) => {
    if (!scenario) return;
    const selectedOption = scenario.options.find(o => o.id === optionId);
    if (!selectedOption) return;

    const isWin = selectedOption.isCorrect;
    let roundScore = 0;

    if (isWin) {
      sfx.playSuccess();
      let crucialFound = 0, totalCrucial = 0;
      scenario.categories.forEach(cat => cat.sources.forEach(src => src.actions.forEach(act => {
        if (act.isCrucial) totalCrucial++;
        if (act.isCrucial && performedActions.includes(act.id)) crucialFound++;
      })));
      const investigationBonus = (crucialFound / Math.max(1, totalCrucial)) * 70;
      // Efficiency only rewards an evidence-based win: a blind guess with an
      // untouched budget must not earn the full frugality bonus.
      const efficiency = crucialFound > 0 ? (currentBudget / scenario.budget) * 30 : 0;
      roundScore = Math.round(efficiency + investigationBonus);
    } else {
      sfx.playError();
    }

    setResult({ isWin, feedback: selectedOption.feedback, score: roundScore });
    setBestScore(prev => Math.max(prev, roundScore));
    setShowDecision(false);
    setGameState('result');
  };

  const getTypeIcon = (type: FactSourceType, size = 14) => {
    if (type === 'HUMINT') return <User size={size} />;
    if (type === 'SIGINT') return <Terminal size={size} />;
    return <FileText size={size} />;
  };

  const riskChip = (risk: string) => {
    const map: Record<string, string> = {
      Low: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
      Medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
      High: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    };
    const label: Record<string, string> = { Low: 'کم', Medium: 'متوسط', High: 'بالا' };
    return { cls: map[risk] ?? map.Medium, label: label[risk] ?? risk };
  };

  const renderEvidence = (type: FactSourceType, content: string) => {
    if (type === 'SIGINT') return (
      <div className="mt-3 bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner font-mono text-xs md:text-sm text-emerald-400 overflow-x-auto whitespace-pre animate-fade-in" dir="ltr">
        <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2 text-slate-500"><Terminal size={14} /> SYSTEM_LOG_OUTPUT</div>
        {content}
      </div>
    );
    if (type === 'OSINT') return (
      <div className="mt-3 bg-white dark:bg-slate-100 rounded-sm p-5 border border-slate-300 shadow-md font-serif text-slate-800 text-sm leading-relaxed whitespace-pre-wrap animate-fade-in relative">
        <div className="absolute top-0 right-0 w-8 h-8 bg-slate-100 border-l border-b border-slate-300"></div>
        <div className="border-b-2 border-slate-800 pb-2 mb-3 font-bold uppercase tracking-widest text-xs text-slate-500 flex items-center gap-2"><FileText size={14} /> سند رسمی</div>
        {content}
      </div>
    );
    return (
      <div className="mt-3 bg-blue-50/60 dark:bg-blue-500/10 rounded-xl p-4 border-r-4 border-blue-500 text-slate-700 dark:text-slate-300 italic text-sm leading-relaxed shadow-sm animate-fade-in whitespace-pre-wrap">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs mb-2 not-italic"><MessageSquare size={14} /> رونوشت مصاحبه</div>
        «{content}»
      </div>
    );
  };

  // --- Intro / loading / error ---
  if (showIntro) return (
    <GameIntro
      title="اتاق وضعیت: حقیقت‌یابی"
      description="شما در نقش کارآگاه سازمانی هستید. با بودجه محدود، منابع اطلاعاتی را کاوش کنید و پیش از فروش گنجینه به حقیقت برسید. مراقب باشید؛ برخی منابع کم‌اعتبار و برخی شواهد، ردِ گم‌کن (Red Herring) هستند."
      icon={<Fingerprint />}
      gradientFrom="from-slate-700" gradientTo="to-slate-900" accentColor="text-emerald-400"
      onStart={() => setShowIntro(false)}
    />
  );

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">در حال آماده‌سازی پرونده...</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">جمع‌آوری مستندات و شواهد صحنه جرم...</p>
      </div>
    </div>
  );

  if (!scenario) return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-8 text-center animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">خطا در بارگذاری</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً دوباره تلاش کنید.</p>
        <div className="flex gap-3">
          <button onClick={loadNewScenario} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors">تلاش مجدد</button>
          <button onClick={onExit} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors">بازگشت</button>
        </div>
      </div>
    </div>
  );

  const isFallback = scenario._fallback === true;

  // Crucial-clue accounting for the result screen (formative feedback).
  const crucialActions: { label: string; sourceName: string; id: string }[] = [];
  scenario.categories.forEach(cat => cat.sources.forEach(src => src.actions.forEach(act => {
    if (act.isCrucial) crucialActions.push({ label: act.label, sourceName: src.name, id: act.id });
  })));
  const foundCrucial = crucialActions.filter(a => performedActions.includes(a.id));
  const missedCrucial = crucialActions.filter(a => !performedActions.includes(a.id));

  const budgetFrac = Math.max(0, Math.min(1, currentBudget / Math.max(1, scenario.budget)));
  const budgetColor = budgetFrac > 0.5 ? 'bg-emerald-500' : budgetFrac > 0.2 ? 'bg-amber-500' : 'bg-red-500';

  const selected = selectedSourceId ? sourceIndex.get(selectedSourceId) : undefined;

  // --- Result screen ---
  if (gameState === 'result' && result) {
    return (
      <div className="h-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
        <div className={`max-w-lg w-full my-auto p-8 rounded-3xl text-center shadow-2xl border-2 bg-white dark:bg-slate-800 ${result.isWin ? 'border-emerald-500' : 'border-red-500'}`}>
          <div className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center ${result.isWin ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
            {result.isWin ? <CheckCircle2 size={44} /> : <XCircle size={44} />}
          </div>
          <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">{result.isWin ? 'پرونده مختومه شد' : 'حکم اشتباه بود'}</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 leading-relaxed border-y py-4 border-slate-100 dark:border-slate-700">{result.feedback}</p>

          {result.isWin && (
            <div className="flex justify-center gap-3 mb-5">
              <div className="bg-emerald-50 dark:bg-emerald-500/15 px-4 py-2 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-100 dark:border-emerald-500/30">امتیاز این دور: {toPersianNum(result.score)}</div>
              <div className="bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold border border-slate-100 dark:border-slate-600">بهترین: {toPersianNum(bestScore)}</div>
            </div>
          )}

          {/* Learning feedback: which crucial clues were found vs missed */}
          {crucialActions.length > 0 && (
            <div className="text-right bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">سرنخ‌های کلیدی پرونده</h4>
              <div className="space-y-1.5">
                {foundCrucial.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={15} className="shrink-0" /><span>{a.label} <span className="text-slate-400">({a.sourceName})</span></span></div>
                ))}
                {missedCrucial.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"><AlertTriangle size={15} className="shrink-0" /><span>کشف‌نشده: {a.label} <span className="text-slate-400">({a.sourceName})</span></span></div>
                ))}
              </div>
              {result.isWin && result.score === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-3">حدس درست بدون جمع‌آوری سرنخ کلیدی، امتیازی ثبت نمی‌کند.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={loadNewScenario} className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] bg-slate-900 dark:bg-emerald-600 flex items-center justify-center gap-2"><RefreshCw size={18} /> پرونده جدید</button>
            <button onClick={() => isFallback ? onExit() : onComplete(bestScore)} className="w-full py-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">پایان و ثبت نتیجه</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Play screen ---
  return (
    <div className="h-full bg-slate-100 dark:bg-slate-950 flex flex-col p-3 md:p-5 overflow-hidden font-sans">
      {isFallback && (
        <div className="mb-3 bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-xl text-xs font-bold text-center shrink-0">
          نسخه آفلاین (سرویس هوش مصنوعی در دسترس نیست) — این اجرا در کارنامه ثبت نمی‌شود.
        </div>
      )}

      {/* HUD */}
      <div className="mb-3 bg-slate-900 dark:bg-slate-900 text-white p-3 md:p-4 rounded-2xl shadow-lg flex items-center gap-4 shrink-0">
        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0"><Shield size={22} /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-lg font-black truncate">{scenario.title}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <Wallet size={14} className="text-slate-400 shrink-0" />
            <div className="flex-1 max-w-[220px] h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full ${budgetColor} transition-all duration-500`} style={{ width: `${budgetFrac * 100}%` }} />
            </div>
            <span className="text-xs font-bold tabular-nums text-slate-200 shrink-0">{toPersianNum(currentBudget)}<span className="text-slate-500">/{toPersianNum(scenario.budget)}</span></span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-center px-3 border-r border-slate-700 shrink-0">
          <span className="text-lg font-black tabular-nums text-emerald-400">{toPersianNum(performedActions.length)}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase">شواهد</span>
        </div>
        <button onClick={onExit} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors shrink-0">خروج</button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-y-auto lg:overflow-hidden pb-24 lg:pb-0">
        {/* DIRECTORY (right in RTL) */}
        <div className="lg:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col shrink-0 lg:overflow-hidden">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2 shrink-0">
            <FolderOpen size={16} className="text-emerald-500" /> دایرکتوری منابع
          </div>
          <div className="flex-1 lg:overflow-y-auto p-2 space-y-1.5">
            {scenario.categories.map(cat => {
              const open = openCategoryId === cat.id;
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => setOpenCategoryId(open ? null : cat.id)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-bold transition-all ${open ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  >
                    <div className={`p-1.5 rounded-lg ${open ? 'bg-emerald-100 dark:bg-emerald-500/25' : 'bg-slate-100 dark:bg-slate-700'}`}><FolderOpen size={15} /></div>
                    <span className="flex-1 text-right truncate">{cat.title}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{toPersianNum(cat.sources.length)}</span>
                  </button>
                  {open && (
                    <div className="pr-3 mt-1 space-y-1 animate-fade-in">
                      {cat.sources.length === 0 && (
                        <p className="text-[11px] text-slate-400 px-3 py-2">منبعی در این دسته موجود نیست.</p>
                      )}
                      {cat.sources.map(src => {
                        const explored = src.actions.length > 0 && src.actions.every(a => performedActions.includes(a.id));
                        const active = selectedSourceId === src.id;
                        return (
                          <button
                            key={src.id}
                            onClick={() => setSelectedSourceId(src.id)}
                            className={`w-full text-right p-2.5 rounded-lg text-xs font-medium border-r-2 transition-all flex items-center gap-2 ${active ? 'bg-slate-800 dark:bg-slate-700 text-white border-emerald-500 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                          >
                            <span className={active ? 'text-emerald-400' : 'text-slate-400'}>{getTypeIcon(src.type)}</span>
                            <span className="flex-1 truncate">{src.name}</span>
                            {explored && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* WORKSPACE (center) */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 lg:overflow-y-auto custom-scrollbar min-h-[320px]">
          {selected ? (
            <div className="animate-fade-in">
              <div className="flex items-start gap-4 mb-6 pb-5 border-b border-slate-100 dark:border-slate-700">
                <ReliabilityRing value={selected.src.reliability} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">{selected.src.name}</h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400">{selected.src.role}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">{getTypeIcon(selected.src.type, 12)} {selected.src.type}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">{selected.src.description}</p>
                </div>
              </div>

              {selected.src.actions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">اقدام تحقیقاتی برای این منبع تعریف نشده است.</p>
              ) : (
                <div className="space-y-4">
                  {selected.src.actions.map(action => {
                    const isPerformed = performedActions.includes(action.id);
                    const canAfford = currentBudget >= action.cost;
                    const risk = riskChip(action.riskLevel);
                    return (
                      <div key={action.id}>
                        <button
                          onClick={() => handleAction(action)}
                          disabled={isPerformed || !canAfford}
                          className={`w-full text-right p-4 rounded-xl border transition-all group ${
                            isPerformed ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 cursor-default'
                            : canAfford ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md active:scale-[0.99]'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {isPerformed
                                ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                : canAfford ? <Search size={18} className="text-slate-400 group-hover:text-emerald-500 shrink-0" /> : <Lock size={18} className="text-slate-400 shrink-0" />}
                              <h4 className={`font-bold truncate ${isPerformed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{action.label}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${risk.cls}`}>ریسک: {risk.label}</span>
                              {!isPerformed && (
                                <span className={`text-xs font-black px-2 py-1 rounded flex items-center gap-1 ${canAfford ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}><Coins size={11} /> {toPersianNum(action.cost)}</span>
                              )}
                            </div>
                          </div>
                        </button>
                        {isPerformed && renderEvidence(selected.src.type, action.content)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center">
              <div className="max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500"><ScrollText size={30} /></div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">خلاصه پرونده</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{scenario.context}</p>
                <p className="mt-5 text-xs text-slate-400 flex items-center justify-center gap-2"><Search size={14} /> از دایرکتوری سمت راست یک منبع را برای بررسی انتخاب کنید.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision launcher (floating on mobile, inline on desktop) */}
      <div className="fixed lg:static bottom-4 inset-x-4 lg:inset-x-auto lg:mt-3 z-30 lg:z-auto shrink-0">
        <button
          onClick={() => setShowDecision(true)}
          className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-l from-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
        >
          <Gavel size={20} /> صدور حکم نهایی
        </button>
      </div>

      {/* Decision modal */}
      {showDecision && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDecision(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400"><Gavel size={22} /></div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">صدور حکم نهایی</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{toPersianNum(performedActions.length)} شاهد جمع‌آوری شده · بودجه باقی‌مانده {toPersianNum(currentBudget)}</p>
              </div>
              <button onClick={() => setShowDecision(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"><XCircle size={22} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-5">{scenario.context}</p>
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">بر اساس شواهد، چه کسی مقصر است؟</h4>
              <div className="space-y-3">
                {scenario.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleDecision(opt.id)}
                    className="w-full text-right p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-between gap-3 group"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{opt.text}</span>
                    <ChevronLeft size={20} className="text-slate-300 group-hover:text-emerald-500 shrink-0" />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-4">حکم نهایی قابل بازگشت نیست — پیش از انتخاب، شواهد کافی جمع کنید.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactFindingGame;
