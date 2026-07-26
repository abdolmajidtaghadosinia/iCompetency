
import React, { useEffect, useMemo, useState } from 'react';
import { AppView, UserProfile } from '../types';
import {
  ChevronDown, ArrowUpRight, Box, Compass, Eye, LayoutGrid,
  Trophy, Moon, Sun, ClipboardCheck, Star, Play, FileText,
  Briefcase, AlertTriangle, Flame, Coins, ShieldCheck, Sparkles,
  Target, Brain, CheckCircle2, Lock, Layers, Calculator, Zap, Search,
  HelpCircle, Network, Users, Hexagon, TrendingUp
} from 'lucide-react';
import { toPersianNum } from '../utils';
import {
  ASSESSMENTS, AssessmentDef, CATEGORY_LABELS, getDossier, getEvidenceCoverage,
  getNextAction, isAssessmentDone,
} from '../utils/assessmentInventory';

interface DashboardProps {
  user: UserProfile;
  onStartScenario: () => void;
  onOpenBigFive: () => void;
  onOpenResume?: () => void;
  onNavigate?: (view: AppView) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// Per-assessment icon, keyed by AppView so the inventory stays data-only.
const ASSESSMENT_ICONS: Partial<Record<AppView, any>> = {
  [AppView.MINIGAME_MEMORY]: Layers,
  [AppView.MINIGAME_MATH]: Calculator,
  [AppView.MINIGAME_PATTERN]: Hexagon,
  [AppView.MINIGAME_SPEED]: Zap,
  [AppView.MINIGAME_VISUALIZATION]: Box,
  [AppView.MINIGAME_ORIENTATION]: Compass,
  [AppView.MINIGAME_STROOP]: Eye,
  [AppView.MINIGAME_MULTITASK]: LayoutGrid,
  [AppView.MINIGAME_FACTFINDING]: Search,
  [AppView.MINIGAME_5WHYS]: HelpCircle,
  [AppView.MINIGAME_SWOT]: Target,
  [AppView.MINIGAME_CYNEFIN]: Network,
  [AppView.MINIGAME_SJT]: Users,
  [AppView.MINIGAME_BIGFIVE]: Star,
};

/** Cognitive profile radar (T-scores 20-80 mapped onto a pentagon). */
const CognitiveRadar: React.FC<{ t: Record<string, number>; animate: boolean }> = ({ t, animate }) => {
  const axes = [
    { key: 'MI', label: 'حافظه' },
    { key: 'AI', label: 'توجه' },
    { key: 'RI', label: 'استدلال' },
    { key: 'SI', label: 'فضایی' },
    { key: 'EI', label: 'اجرایی' },
  ];
  const size = 240, center = size / 2, radius = 78;
  const pt = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)] as const;
  };
  const norm = (v: number) => Math.max(0, Math.min(1, (v - 20) / 60));
  const shape = axes
    .map((a, i) => pt(i, radius * (animate ? norm(t[a.key] ?? 0) : 0)).join(','))
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon
          key={level}
          points={axes.map((_, i) => pt(i, radius * level).join(',')).join(' ')}
          fill="none"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, radius);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />;
      })}
      <polygon
        points={shape}
        fill="rgba(99,102,241,0.25)"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinejoin="round"
        className="transition-all duration-[1200ms] ease-out"
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, radius * (animate ? norm(t[a.key] ?? 0) : 0));
        return <circle key={a.key} cx={x} cy={y} r="3.5" fill="#fff" stroke="#6366f1" strokeWidth="2" className="transition-all duration-[1200ms] ease-out" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, radius + 26);
        return (
          <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[11px] font-bold">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  user, onStartScenario, onOpenBigFive, onOpenResume, onNavigate, isDarkMode, toggleTheme,
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateStats(true), 200);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!showProfileModal) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowProfileModal(false); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showProfileModal]);

  const xpPercentage = Math.min(100, (user.currentXp / Math.max(1, user.requiredXp)) * 100);
  const avatarLabel = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();
  const accountId = user.id ? `IC-${String(user.id).padStart(6, '0')}` : null;
  const tScores = user.cognitiveProfile?.tScores ?? { MI: 0, AI: 0, RI: 0, SI: 0, EI: 0, TCS: 0 };

  // Evidence-first IA: the dossier drives what the user sees and does next.
  const dossier = useMemo(() => getDossier(user), [user]);
  const nextAction = useMemo(() => getNextAction(user), [user]);
  const coverage = useMemo(() => getEvidenceCoverage(user), [user]);

  const competencies = (user.competencies ?? []).filter(c => c.score !== null);
  const careerRanked = (user.careerFit ?? []).filter(c => c.fitScore !== null);
  const careerBest = careerRanked[0];

  const go = (view: AppView) => {
    if (view === AppView.MINIGAME_BIGFIVE) return onOpenBigFive();
    if (onNavigate) return onNavigate(view);
    onStartScenario();
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'صبح بخیر';
    if (h < 18) return 'وقت بخیر';
    return 'شب بخیر';
  })();

  const NextIcon = nextAction ? (ASSESSMENT_ICONS[nextAction.assessment.view] ?? Play) : Play;

  // Dossier ring geometry
  const ringR = 54, ringC = 2 * Math.PI * ringR;

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-8 font-sans text-slate-800 dark:text-slate-100 pb-24 custom-scrollbar relative transition-colors duration-300">

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in m-4 border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">اطلاعات پرونده</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ChevronDown className="text-slate-400 rotate-180" size={24} />
              </button>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white mb-4 shadow-lg border-4 border-white dark:border-slate-700 flex items-center justify-center text-4xl font-black">
                {avatarLabel}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{user.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold">{user.role}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-indigo-600 shadow-sm"><ClipboardCheck size={20} /></div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">شناسه یکتا</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white font-mono" dir="ltr">{accountId || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-emerald-600 shadow-sm"><ShieldCheck size={20} /></div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">تکمیل پرونده ارزیابی</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{toPersianNum(dossier.done)} از {toPersianNum(dossier.total)} آزمون</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-fade-in-up">
        <div className="text-center md:text-right w-full md:w-auto">
          <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-1">{greeting}، {user.name.split(' ')[0]} 👋</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">داشبورد وضعیت</h1>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
          <button onClick={toggleTheme} className="hidden md:flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all active:scale-95">
            {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          </button>
          <div onClick={() => setShowProfileModal(true)} className="flex items-center gap-3 bg-white dark:bg-slate-800 pl-2 pr-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group active:scale-95">
            <div className="text-left hidden lg:block">
              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">{user.role}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black shadow-sm">{avatarLabel}</div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </header>

      {/* ===== HERO: assessment dossier + the single best next step ===== */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Dossier completeness */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-7 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-scale-in">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={18} className="text-indigo-500" />
            <h2 className="font-black text-slate-900 dark:text-white">پرونده ارزیابی شما</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={ringR} fill="none" strokeWidth="11" className="stroke-slate-100 dark:stroke-slate-700" />
                <circle cx="65" cy="65" r={ringR} fill="none" strokeWidth="11" strokeLinecap="round"
                  stroke="url(#dossierGrad)" strokeDasharray={ringC}
                  strokeDashoffset={animateStats ? ringC - (ringC * dossier.percent) / 100 : ringC}
                  className="transition-all duration-[1600ms] ease-out" />
                <defs>
                  <linearGradient id="dossierGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                  {toPersianNum(dossier.done)}<span className="text-lg text-slate-400">/{toPersianNum(dossier.total)}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-1">آزمون</div>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              {dossier.categories.map(cat => (
                <div key={cat.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{cat.label}</span>
                    <span className="text-[11px] font-black text-slate-400 tabular-nums">{toPersianNum(cat.done)}/{toPersianNum(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${animateStats ? (cat.done / cat.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {coverage !== null && (
                <div className="pt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  میانگین پوشش شواهد نتایج: {toPersianNum(coverage)}٪
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next best action */}
        <div className="col-span-12 lg:col-span-7 rounded-3xl p-6 md:p-7 relative overflow-hidden animate-scale-in delay-100 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-500/20">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-10 w-56 h-56 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />

          {nextAction ? (
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-amber-300" />
                <span className="text-xs font-black uppercase tracking-widest text-indigo-200">قدم بعدی پیشنهادی</span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
                  <NextIcon size={26} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-2xl font-black">{nextAction.assessment.title}</h3>
                    <span className="text-[10px] font-black bg-white/15 border border-white/20 px-2 py-0.5 rounded-lg" dir="ltr">{nextAction.assessment.code}</span>
                  </div>
                  <p className="text-indigo-100 text-sm leading-relaxed">{nextAction.reason}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-[11px] font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <TrendingUp size={12} /> باز می‌کند: {nextAction.assessment.unlocks}
                </span>
                <span className="text-[11px] font-bold bg-white/10 text-indigo-100 border border-white/20 px-2.5 py-1 rounded-lg">
                  {CATEGORY_LABELS[nextAction.assessment.category]}
                </span>
              </div>

              <div className="mt-auto flex flex-col sm:flex-row gap-3">
                <button onClick={() => go(nextAction.assessment.view)}
                  className="flex-1 py-3.5 bg-white text-indigo-700 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Play size={18} fill="currentColor" /> شروع این آزمون
                </button>
                <button onClick={onStartScenario}
                  className="px-5 py-3.5 bg-white/10 border border-white/20 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  نقشه مسیر <ArrowUpRight size={16} className="rtl:scale-x-[-1]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-4 border border-white/20">
                <CheckCircle2 size={30} />
              </div>
              <h3 className="text-2xl font-black mb-2">پرونده شما کامل است 🎉</h3>
              <p className="text-indigo-100 text-sm mb-5 max-w-md">هر ۱۴ آزمون را انجام داده‌اید. کارنامه شما با بالاترین پوشش شواهد قابل ارائه است.</p>
              {onOpenResume && (
                <button onClick={onOpenResume} className="px-8 py-3.5 bg-white text-indigo-700 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2">
                  <FileText size={18} /> مشاهده کارنامه
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Stat strip ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Trophy, label: 'سطح فعلی', value: user.level, sub: `Tier ${toPersianNum(user.levelNumber)}`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { icon: Brain, label: 'نمره تراز شناختی', value: tScores.TCS > 0 ? toPersianNum(tScores.TCS) : '—', sub: tScores.TCS > 0 ? 'T-Score' : 'هنوز سنجیده نشده', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { icon: Flame, label: 'روزهای پیاپی', value: toPersianNum(user.streak), sub: 'استمرار', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { icon: Coins, label: 'سکه', value: toPersianNum(user.coins), sub: 'موجودی', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className={`w-11 h-11 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{s.label}</div>
              <div className="text-lg font-black text-slate-900 dark:text-white truncate leading-tight">{s.value}</div>
              <div className="text-[10px] font-bold text-slate-400 truncate">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* XP progress */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl px-5 py-4 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 mb-6 animate-fade-in-up">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black text-indigo-500 dark:text-indigo-400 tabular-nums">{toPersianNum(Math.round(xpPercentage))}٪ تا سطح بعد</span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{toPersianNum(user.currentXp)} / {toPersianNum(user.requiredXp)} XP</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-[1500ms] ease-out relative"
            style={{ width: `${animateStats ? Math.max(2, xpPercentage) : 2}%` }}>
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>

      {/* ===== Results: competency matrix + cognitive radar ===== */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Competency matrix */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-indigo-500" />
              <h3 className="font-black text-slate-900 dark:text-white">ماتریس شایستگی</h3>
            </div>
            {onOpenResume && competencies.length > 0 && (
              <button onClick={onOpenResume} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                جزئیات <ArrowUpRight size={12} className="rtl:scale-x-[-1]" />
              </button>
            )}
          </div>

          {competencies.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-14 h-14 mx-auto bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-3">
                <Lock size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">هنوز شایستگی‌ای محاسبه نشده است.</p>
              <p className="text-xs text-slate-400">با اولین آزمون، این بخش فعال می‌شود.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {competencies.map(c => (
                <div key={c.key} className="group">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{c.title}</span>
                      {c.insufficient && (
                        <span className="shrink-0 text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle size={9} /> ناکافی
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums shrink-0">{toPersianNum(c.score as number)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${c.insufficient ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                      style={{ width: `${animateStats ? c.score : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cognitive radar */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up delay-100 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={18} className="text-violet-500" />
            <h3 className="font-black text-slate-900 dark:text-white">نیمرخ شناختی</h3>
          </div>
          {tScores.TCS > 0 ? (
            <>
              <div className="flex-1 flex items-center justify-center min-h-[220px]">
                <div className="w-full max-w-[260px] aspect-square">
                  <CognitiveRadar t={tScores as unknown as Record<string, number>} animate={animateStats} />
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold">
                مقیاس T (میانگین جمعیت ۵۰) — پنج شاخص مدل رضی
              </p>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-3">
                <Brain size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">هنوز آزمون شناختی انجام نشده است.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Career fit ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 mb-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Briefcase size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">تحلیل تناسب شغلی</h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">تطبیق پروفایل سنجیده‌شده با الزامات گروه‌های شغلی (مرجع: O*NET)</p>
            </div>
          </div>
          {onOpenResume && careerBest && (
            <button onClick={onOpenResume} className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5">
              کارنامه کامل <ArrowUpRight size={14} className="rtl:scale-x-[-1]" />
            </button>
          )}
        </div>

        {!careerBest ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <Briefcase size={26} className="text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-1">هنوز داده کافی برای تحلیل تناسب شغلی ثبت نشده است.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs">با انجام آزمون‌های شناختی، شخصیت و روش‌شناختی، این بخش فعال می‌شود.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-300 uppercase tracking-wider">پیشنهاد برتر</span>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5" dir="ltr">
                  O*NET {careerBest.onet} · {careerBest.riasec}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 mb-1">
                <h4 className="text-xl font-black text-slate-900 dark:text-white">{careerBest.title}</h4>
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">{toPersianNum(careerBest.fitScore as number)}٪</div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">{careerBest.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {careerBest.strengths.map((s, i) => (
                  <span key={i} className="text-[10px] font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-2 py-1 rounded-lg">{s}</span>
                ))}
                {careerBest.insufficient && (
                  <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg flex items-center gap-1">
                    <AlertTriangle size={10} /> شواهد ناکافی
                  </span>
                )}
              </div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                پوشش شواهد: {toPersianNum(Math.round(careerBest.coverage * 100))}٪ از مدل الزامات
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {careerRanked.slice(0, 4).map((c, idx) => (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="flex-1 text-sm font-bold text-slate-600 dark:text-slate-300 truncate">{c.title}</span>
                  <div className="w-32 md:w-44 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-300 dark:bg-slate-500'}`}
                      style={{ width: `${animateStats ? c.fitScore : 0}%` }} />
                  </div>
                  <span className="w-9 text-left text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums shrink-0">{toPersianNum(c.fitScore as number)}٪</span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed mt-1">
                پیشنهاد اکتشافی بر پایه تطبیق پروفایل — جایگزین آزمون رغبت شغلی یا مصاحبه نیست.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== Assessment checklist: the full path, at a glance ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-emerald-500" />
            <h3 className="font-black text-slate-900 dark:text-white">مسیر ارزیابی</h3>
          </div>
          <span className="text-[11px] font-black text-slate-400 tabular-nums">
            {toPersianNum(dossier.done)} از {toPersianNum(dossier.total)} تکمیل شده
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {ASSESSMENTS.map((a: AssessmentDef) => {
            const done = isAssessmentDone(a, user);
            const isNext = nextAction?.assessment.view === a.view;
            const Icon = ASSESSMENT_ICONS[a.view] ?? Play;
            return (
              <button
                key={a.view}
                onClick={() => go(a.view)}
                className={`text-right p-3.5 rounded-2xl border transition-all active:scale-[0.98] group ${
                  done
                    ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400'
                    : isNext
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/30 hover:border-indigo-500'
                      : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    done ? 'bg-emerald-500 text-white' : isNext ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-600'
                  }`}>
                    {done ? <CheckCircle2 size={18} /> : <Icon size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-800 dark:text-white truncate">{a.title}</div>
                    <div className="text-[9px] font-bold text-slate-400" dir="ltr">{a.code}</div>
                  </div>
                </div>
                <div className={`text-[10px] font-bold truncate ${
                  done ? 'text-emerald-600 dark:text-emerald-400' : isNext ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                }`}>
                  {done ? 'تکمیل شده' : isNext ? 'پیشنهاد بعدی ✦' : `باز می‌کند: ${a.unlocks}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
