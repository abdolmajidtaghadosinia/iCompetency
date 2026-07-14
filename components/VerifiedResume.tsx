
import React, { useMemo, useState } from 'react';
import { UserProfile } from '../types';
import {
  ShieldCheck, Printer, Share2, Loader2,
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid,
  Target, Microscope, Sparkles, Hexagon, Briefcase, Brain, Search, Puzzle,
  Award, AlertTriangle
} from 'lucide-react';

// Methodology assessment display config (keys match the server payload subjects).
const METH_CONFIG: Record<string, { title: string; icon: any; color: string; bg: string; hex: string }> = {
  '5whys':   { title: 'ریشه‌یابی (۵ چرا)',            icon: Search, color: 'text-cyan-600 dark:text-cyan-400',       bg: 'bg-cyan-500',    hex: '#06b6d4' },
  'swot':    { title: 'تحلیل استراتژیک (SWOT)',        icon: Target, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-500', hex: '#d946ef' },
  'cynefin': { title: 'تصمیم‌گیری زمینه‌مند (Cynefin)', icon: Brain,  color: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-500',  hex: '#8b5cf6' },
};
const METH_ORDER = ['5whys', 'swot', 'cynefin'];

// Evidence-layer display config for the competency matrix. The layer keys
// match the server's calculate_competencies() output.
const LAYER_CONFIG: Record<string, { label: string; dot: string; bar: string }> = {
  cognitive:   { label: 'شناختی',      dot: 'bg-sky-500',     bar: 'bg-sky-500' },
  personality: { label: 'شخصیتی',      dot: 'bg-violet-500',  bar: 'bg-violet-500' },
  methodology: { label: 'روش‌شناختی',  dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
};
// Server-computed Big Five response-validity verdict -> display chip.
const BF_VALIDITY_CHIP: Record<string, { label: string; cls: string; printLabel: string }> = {
  valid:   { label: 'اعتبار پاسخ: تأیید شده',      cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', printLabel: 'اعتبار پاسخ: تأیید شده' },
  caution: { label: 'اعتبار پاسخ: نیازمند احتیاط', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',             printLabel: 'اعتبار پاسخ: نیازمند احتیاط' },
  invalid: { label: 'اعتبار پاسخ: نامعتبر',        cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',                         printLabel: 'اعتبار پاسخ: نامعتبر — در شایستگی‌ها لحاظ نشده' },
};
const competencyScoreColor = (s: number) =>
  s >= 75 ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300'
  : s >= 60 ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'
  : s >= 40 ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300'
  : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300';
const DIM_LABELS: Record<string, string> = {
  domainAccuracy: 'تشخیص دامنه', responseAccuracy: 'انتخاب واکنش',
  classificationAccuracy: 'دقت طبقه‌بندی', internalExternalDiscrimination: 'تفکیک داخلی/خارجی',
  positiveNegativeDiscrimination: 'تفکیک مثبت/منفی', strategyAlignment: 'هم‌راستایی استراتژی',
  precision: 'دقت علّی', directness: 'مسیر مستقیم',
};
import { toPersianNum } from '../utils';
import { getCareerFit } from '../utils/scoring';
import { shareResume } from '../utils/pdfGenerator';

interface Props {
  user: UserProfile;
  isDarkMode?: boolean;
}

interface SkillItem {
    code: string; 
    title: string; 
    score: number; 
    icon: any; 
    method: string; 
    indicator: string; 
    color: string; 
    bg: string;
}

const ModernGauge: React.FC<{ item: SkillItem }> = ({ item }) => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const maxStroke = circumference * 0.75; 
    const strokeDashoffset = maxStroke - (item.score / 100) * maxStroke;
    const rotation = 135 + (270 * (item.score / 100));

    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 relative flex flex-col items-center justify-between shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 h-full min-h-[280px] group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex justify-between w-full items-start mb-4">
              <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-2xl group-hover:bg-slate-100 dark:group-hover:bg-slate-600 transition-colors">
                  <item.icon size={24} className={item.color} />
              </div>
              <button className="p-2 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                  <Sparkles size={18} />
              </button>
          </div>

          <div className="relative w-48 h-48 flex items-center justify-center -mt-4 shrink-0">
              <svg className="w-full h-full transform rotate-[135deg]" viewBox="0 0 192 192">
                  <circle cx="96" cy="96" r={radius} strokeWidth="12" fill="transparent" strokeDasharray={maxStroke} strokeLinecap="round" className="stroke-slate-100 dark:stroke-slate-700" />
                  <circle 
                      cx="96" cy="96" r={radius} 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      fill="transparent" 
                      strokeDasharray={maxStroke} 
                      strokeDashoffset={strokeDashoffset} 
                      strokeLinecap="round"
                      className={`${item.color} transition-all duration-[1500ms] ease-out drop-shadow-lg`}
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pb-3">
                  <div className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{toPersianNum(item.score)}</div>
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">از ۱۰۰</div>
              </div>
               <div 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: `rotate(${rotation}deg)` }} 
               >
                   <div className="absolute top-1/2 right-[38px] -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-slate-800 dark:bg-white rounded-full shadow-md border-2 border-white dark:border-slate-800"></div>
               </div>
          </div>
          
          <div className="flex flex-col items-center text-center w-full mt-[-20px] relative z-20 px-2">
               <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-1">{item.title}</h4>
               <div className="flex flex-col items-center justify-center w-full px-1">
                   <div className="flex items-center gap-1.5 justify-center mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">متدولوژی</span>
                   </div>
                   <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold leading-tight text-center break-words w-full dir-rtl">
                       {item.method}
                   </span>
               </div>
          </div>
      </div>
    );
};

const VerifiedResume: React.FC<Props> = ({ user, isDarkMode = false }) => {
  const [sharing, setSharing] = useState(false);

  const cognitiveSkills: SkillItem[] = [
    { code: 'A9', title: 'حافظه جامع', score: user.skills.memory, icon: Layers, method: 'باتری چندگانه (N-Back, Corsi, PAL)', indicator: 'ظرفیت + پایداری + تداعی', color: 'text-pink-600', bg: 'bg-pink-500' },
    { code: 'A10', title: 'هوش محاسباتی', score: user.skills.math, icon: Calculator, method: 'محاسبات سرعت بالا (Speed Arithmetic)', indicator: 'دقت در فشار زمانی', color: 'text-blue-600', bg: 'bg-blue-500' },
    { code: 'A11', title: 'سرعت ادراکی', score: user.skills.perception, icon: Zap, method: 'تشخیص تفاوت بصری (Visual Discrimination)', indicator: 'سرعت واکنش (ms)', color: 'text-amber-500', bg: 'bg-amber-500' },
    { code: 'A12', title: 'تجسم فضایی', score: user.skills.visualization, icon: Box, method: 'چرخش ذهنی (Mental Rotation)', indicator: 'زاویه انحراف', color: 'text-indigo-600', bg: 'bg-indigo-500' },
    { code: 'A13', title: 'جهت‌یابی', score: user.skills.orientation, icon: Compass, method: 'ناوبری نسبی (Relative Navigation)', indicator: 'درک موقعیت', color: 'text-emerald-600', bg: 'bg-emerald-500' },
    { code: 'A14', title: 'قدرت تمرکز', score: user.skills.focus, icon: Eye, method: 'تست استروپ (Stroop Test)', indicator: 'مقاومت در برابر تداخل', color: 'text-red-500', bg: 'bg-red-500' },
    { code: 'A15', title: 'پردازش موازی', score: user.skills.multitasking, icon: LayoutGrid, method: 'تکلیف دوگانه (Dual Task)', indicator: 'نرخ سوئیچینگ', color: 'text-purple-600', bg: 'bg-purple-500' },
  ];

  const currentDate = new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const verificationHash = "0x7a8c...3f9c";

  const handlePrint = () => { window.print(); };

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareResume({
        user,
        cognitiveSkills: cognitiveSkills.map(s => ({ code: s.code, title: s.title, score: s.score })),
        bigFiveData: bigFiveData.map(t => ({ title: t.title, score: t.score })),
        careerProfiles: careerProfiles.map(p => ({ title: p.title, fitScore: p.fitScore })),
        methodology: methItems.map(m => ({
          title: m.cfg.title,
          score: m.score,
          color: m.cfg.hex,
          dims: Object.entries(m.dimensions ?? {}).map(([k, v]) => ({ label: DIM_LABELS[k] ?? k, value: v })),
        })),
        competencies: scoredCompetencies.map(c => ({
          title: c.title,
          score: c.score as number,
          label: c.label ?? '',
          coverage: c.coverage,
          insufficient: c.insufficient,
        })),
        date: currentDate,
      });
    } catch (err) {
      // Fallback: share link
      if (navigator.share) {
        try {
          await navigator.share({
            title: `کارنامه شایستگی ${user.name}`,
            text: `کارنامه شایستگی حرفه‌ای ${user.name} در پلتفرم iCompetency`,
            url: window.location.href,
          });
        } catch { /* cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('لینک کپی شد!');
        } catch {
          alert('خطا در اشتراک‌گذاری');
        }
      }
    } finally {
      setSharing(false);
    }
  };

  // Calculate Career Fit
  const careerProfiles = useMemo(() => getCareerFit(user), [user]);
  const bestFit = careerProfiles[0];

  const methResults = user.methodologyResults ?? {};
  const methItems = METH_ORDER.filter(k => methResults[k]).map(k => ({ key: k, ...methResults[k], cfg: METH_CONFIG[k] }));

  // Server-computed competency matrix. The web view shows every competency
  // (including not-yet-measured ones, to invite completion); print/share only
  // include those with an actual score.
  const competencies = user.competencies ?? [];
  const scoredCompetencies = competencies.filter(c => c.score !== null);

  const bigFiveData = user.bigFive ? [
    { title: 'گشودگی (Openness)', score: user.bigFive.Openness, color: 'text-blue-500', bg: 'bg-blue-500' },
    { title: 'وجدان کاری (Conscientiousness)', score: user.bigFive.Conscientiousness, color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { title: 'برون‌گرایی (Extraversion)', score: user.bigFive.Extraversion, color: 'text-amber-500', bg: 'bg-amber-500' },
    { title: 'توافق‌پذیری (Agreeableness)', score: user.bigFive.Agreeableness, color: 'text-pink-500', bg: 'bg-pink-500' },
    { title: 'ثبات هیجانی (Neuroticism)', score: user.bigFive.Neuroticism, color: 'text-purple-500', bg: 'bg-purple-500' },
  ] : [];

  return (
    <>
    <div className="print-container-wrapper hidden">
        {/* Print Layout */}
        <div className="bg-white text-black p-[15mm] h-full flex flex-col font-sans" dir="rtl">
            <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-8 mb-8">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-indigo-700 rounded-xl flex items-center justify-center print:bg-indigo-700 print:text-white">
                        <Zap size={40} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-1">iCompetency</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">سامانه جامع سنجش صلاحیت حرفه‌ای</p>
                    </div>
                </div>
                <div className="text-left">
                    <div className="bg-slate-900 text-white px-4 py-1.5 rounded text-sm font-bold uppercase mb-2 inline-block">Verified Report</div>
                    <div className="text-sm font-mono text-slate-600 font-bold mt-1">ID: {verificationHash}</div>
                    <div className="text-sm font-mono text-slate-600">Date: {currentDate}</div>
                </div>
            </div>

            {/* Candidate */}
            <div className="mb-6">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">دارنده کارنامه</div>
                <div className="text-2xl font-black text-slate-900">{user.name}</div>
                <div className="text-sm font-bold text-slate-500">{user.role} — {user.level}</div>
            </div>

            {/* Cognitive skills */}
            <section className="mb-7">
                <h2 className="text-lg font-black text-slate-900 mb-3 border-b-2 border-slate-200 pb-1.5">شاخص‌های شناختی (مدل رضی)</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                    {cognitiveSkills.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-[9px] font-mono text-slate-400 w-7 shrink-0">{s.code}</span>
                            <span className="text-xs font-bold text-slate-800 flex-1 truncate">{s.title}</span>
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0">
                                <div className={`h-full ${s.bg}`} style={{ width: `${s.score}%` }} />
                            </div>
                            <span className="text-xs font-black text-slate-900 w-7 text-left shrink-0">{toPersianNum(s.score)}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Competency matrix */}
            {scoredCompetencies.length > 0 && (
                <section className="mb-7">
                    <h2 className="text-lg font-black text-slate-900 mb-3 border-b-2 border-slate-200 pb-1.5">ماتریس شایستگی سازمانی</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {scoredCompetencies.map(comp => (
                            <div key={comp.key} className="border border-slate-200 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-xs font-black text-slate-800 leading-tight">{comp.title}</span>
                                    <span className="text-lg font-black text-slate-900 shrink-0">{toPersianNum(comp.score as number)}</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                                    <div className="h-full bg-indigo-600" style={{ width: `${comp.score}%` }} />
                                </div>
                                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                                    <span>{comp.label}{comp.insufficient ? ' · شواهد ناکافی' : ''}</span>
                                    <span>پوشش {toPersianNum(Math.round(comp.coverage * 100))}٪</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">هر شایستگی ترکیب وزنی سه لایه شواهد است: توانایی شناختی (T-Score)، آمادگی شخصیتی (Big Five) و مهارت کاربردی (آزمون‌های روش‌شناختی). «پوشش» سهم شواهد موجود از وزن کامل مدل است.</p>
                </section>
            )}

            {/* Methodology assessments */}
            {methItems.length > 0 && (
                <section className="mb-7">
                    <h2 className="text-lg font-black text-slate-900 mb-3 border-b-2 border-slate-200 pb-1.5">آزمون‌های حل مسئله</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {methItems.map(item => (
                            <div key={item.key} className="border border-slate-200 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2.5">
                                    <span className="text-xs font-black text-slate-800 leading-tight">{item.cfg.title}</span>
                                    <span className="text-lg font-black text-slate-900 shrink-0">{toPersianNum(item.score)}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {Object.entries(item.dimensions ?? {}).map(([dk, dv]) => (
                                        <div key={dk}>
                                            <div className="flex justify-between text-[9px] font-bold text-slate-600 mb-0.5">
                                                <span>{DIM_LABELS[dk] ?? dk}</span><span>{toPersianNum(dv)}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full ${item.cfg.bg}`} style={{ width: `${Math.max(0, Math.min(100, dv))}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Big Five */}
            {bigFiveData.length > 0 && (
                <section className="mb-7">
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1.5 mb-3">
                        <h2 className="text-lg font-black text-slate-900">پروفایل شخصیت (Big Five / OCEAN)</h2>
                        {user.bigFive?._validity && BF_VALIDITY_CHIP[user.bigFive._validity] && (
                            <span className="text-[10px] font-black text-slate-600 border border-slate-300 rounded-full px-2.5 py-0.5">
                                {BF_VALIDITY_CHIP[user.bigFive._validity].printLabel}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        {bigFiveData.map((t, i) => (
                            <div key={i} className="border border-slate-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-black text-slate-900">{toPersianNum(t.score)}</div>
                                <div className="text-[10px] font-bold text-slate-500 leading-tight mt-1">{t.title.split('(')[0].trim()}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Career fit */}
            <section className="mb-7">
                <h2 className="text-lg font-black text-slate-900 mb-3 border-b-2 border-slate-200 pb-1.5">تحلیل تناسب شغلی</h2>
                <div className="bg-slate-100 rounded-lg p-4 mb-3 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">پیشنهاد برتر</div>
                        <div className="text-lg font-black text-slate-900">{bestFit.title}</div>
                        <div className="text-xs text-slate-500">{bestFit.description}</div>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 shrink-0">{toPersianNum(bestFit.fitScore)}%</div>
                </div>
                <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                    {careerProfiles.slice(1, 4).map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 flex-1 truncate">{p.title}</span>
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0"><div className="h-full bg-slate-400" style={{ width: `${p.fitScore}%` }} /></div>
                            <span className="text-[10px] font-mono text-slate-500 w-7 text-left shrink-0">{toPersianNum(p.fitScore)}%</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <div className="mt-auto pt-5 border-t-2 border-slate-200 flex justify-between items-center text-xs text-slate-500">
                <span>iCompetency — سامانه جامع سنجش صلاحیت حرفه‌ای</span>
                <span className="font-mono">شناسه راستی‌آزمایی: {verificationHash}</span>
            </div>
        </div>
    </div>

    <div className="print:hidden h-full bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 overflow-y-auto custom-scrollbar pb-32 transition-colors duration-300">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="text-center md:text-right">
             <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">رزومه شایستگی</h1>
             <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> تایید شده (Verified)
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold font-mono">#{verificationHash}</span>
             </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
              <button onClick={handlePrint} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2 active:scale-95 group">
                  <Printer size={18} className="group-hover:text-indigo-500 transition-colors" /> چاپ نسخه کامل
              </button>
              <button onClick={handleShare} disabled={sharing} className="bg-indigo-600 dark:bg-slate-700 hover:bg-indigo-700 dark:hover:bg-slate-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 active:scale-95 disabled:opacity-50">
                  {sharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                  {sharing ? 'در حال ساخت...' : 'اشتراک‌گذاری'}
              </button>
          </div>
      </header>

      {/* --- Competency Matrix (org-facing summary) --- */}
      {competencies.length > 0 && (
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Award className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">ماتریس شایستگی</h3>
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">ترکیب وزنی سه لایه شواهد: توانایی شناختی، آمادگی شخصیتی و مهارت کاربردی</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {Object.entries(LAYER_CONFIG).map(([k, cfg]) => (
                  <span key={k} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>{cfg.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {competencies.map(comp => (
                <div key={comp.key} className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-600 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-black text-slate-800 dark:text-white">{comp.title}</h4>
                    {comp.score !== null ? (
                      <div className="text-center shrink-0">
                        <div className="text-3xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{toPersianNum(comp.score)}</div>
                        <div className="text-[9px] text-slate-400 font-bold">از ۱۰۰</div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 mt-1">سنجیده نشده</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-3 min-h-[2rem]">{comp.description}</p>

                  {comp.score !== null && comp.label && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${competencyScoreColor(comp.score)}`}>{comp.label}</span>
                      {comp.insufficient && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle size={10} /> شواهد ناکافی
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 mt-auto">
                    {comp.evidence.map((ev, i) => {
                      const lcfg = LAYER_CONFIG[ev.layer];
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center text-[10px] font-bold mb-0.5">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className={`w-1.5 h-1.5 rounded-full ${lcfg?.dot ?? 'bg-slate-400'}`}></span>
                              {ev.label}
                              <span className="text-slate-300 dark:text-slate-500">×{toPersianNum(Math.round(ev.weight * 100))}٪</span>
                            </span>
                            <span className="text-slate-400 tabular-nums">{ev.available && ev.score !== null ? toPersianNum(ev.score) : '—'}</span>
                          </div>
                          <div className="h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            {ev.available && ev.score !== null && (
                              <div className={`h-full ${lcfg?.bar ?? 'bg-slate-400'} rounded-full transition-all duration-1000`} style={{ width: `${Math.max(0, Math.min(100, ev.score))}%` }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-600 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    پوشش شواهد: {toPersianNum(Math.round(comp.coverage * 100))}٪ از وزن مدل
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- NEW: Career Profiling Section --- */}
      {user.bigFive && (
          <div className="mb-8 animate-fade-in-up">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="flex flex-col md:flex-row gap-8 relative z-10">
                      <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-indigo-500 rounded-lg"><Briefcase size={24} /></div>
                              <h3 className="text-2xl font-black">تحلیل تناسب شغلی (AI Profiling)</h3>
                          </div>
                          <p className="text-slate-300 mb-6 leading-relaxed max-w-xl">
                              بر اساس ترکیب شاخص‌های شناختی و مدل شخصیتی OCEAN، الگوریتم پیشنهاد می‌دهد که پروفایل شما بیشترین تطابق را با نقش زیر دارد:
                          </p>
                          
                          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 inline-block w-full max-w-md">
                              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">پیشنهاد برتر</div>
                              <h2 className="text-3xl font-black mb-2">{bestFit.title}</h2>
                              <p className="text-slate-300 text-sm">{bestFit.description}</p>
                              
                              <div className="mt-4 flex flex-wrap gap-2">
                                  {bestFit.keyTraits.map((t, i) => (
                                      <span key={i} className="text-[10px] bg-indigo-500/30 px-2 py-1 rounded text-indigo-200 border border-indigo-500/30">{t}</span>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="w-full md:w-1/3 flex flex-col justify-center gap-3">
                          {careerProfiles.slice(0, 4).map((profile, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                  <div className="flex-1 text-right text-sm font-bold text-slate-300">{profile.title}</div>
                                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-400' : 'bg-slate-500'}`} 
                                        style={{width: `${profile.fitScore}%`}}
                                      ></div>
                                  </div>
                                  <div className="w-8 text-xs font-mono text-slate-400">{toPersianNum(profile.fitScore)}%</div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {cognitiveSkills.slice(0, 4).map((skill, idx) => (
             <ModernGauge key={idx} item={skill} />
          ))}
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-12 lg:col-span-4 space-y-6">
               <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 min-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white">توازن شایستگی</h3>
                        <button className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600"><Target size={18} className="text-slate-400 dark:text-slate-300"/></button>
                    </div>
                    <div className="flex-1 space-y-3">
                         {cognitiveSkills.map((s, idx) => (
                             <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                 <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{s.title}</span>
                                 <div className="w-24 md:w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                     <div className={`h-full ${s.bg}`} style={{width: `${s.score}%`}}></div>
                                 </div>
                             </div>
                         ))}
                    </div>
               </div>
          </div>
          <div className="col-span-12 lg:col-span-8">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 h-full">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white">جزئیات ارزیابی فنی</h3>
                          <p className="text-slate-400 dark:text-slate-500 font-bold text-sm mt-1">شاخص‌ها و متدهای استفاده شده برای سنجش</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl text-slate-500 dark:text-slate-300 font-bold text-xs flex items-center gap-2">
                          <Microscope size={16} /> استاندارد ISO-10667
                      </div>
                  </div>
                  <div className="space-y-4">
                      {cognitiveSkills.map((skill, idx) => (
                          <div key={idx} className="group flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-3xl hover:bg-slate-50/80 dark:hover:bg-slate-700/80 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600 cursor-default">
                              <div className="flex items-center gap-4 min-w-[200px]">
                                  <div className={`w-12 h-12 rounded-2xl ${skill.bg} bg-opacity-10 flex items-center justify-center`}>
                                      <skill.icon size={24} className={skill.color} />
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{skill.title}</h4>
                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black px-1.5 py-0.5 rounded text-opacity-70">{skill.code}</span>
                                      </div>
                                      <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">امتیاز: {toPersianNum(skill.score)}</div>
                                  </div>
                              </div>
                              <div className="flex-1">
                                  <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">متدولوژی:</span>
                                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{skill.method}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="w-full md:w-32 flex flex-col items-end gap-1">
                                  <div className="text-xl font-black text-slate-800 dark:text-white">{toPersianNum(skill.score)}٪</div>
                                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div className={`h-full ${skill.bg} rounded-full transition-all duration-1000 group-hover:scale-x-105 origin-left`} style={{width: `${skill.score}%`}}></div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* --- Methodology / Problem-Solving Assessments --- */}
      {methItems.length > 0 && (
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg">
                <Puzzle className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">آزمون‌های حل مسئله</h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">تحلیل چندبعدی مهارت‌های تحلیل و تصمیم‌گیری بر پایه شواهد</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {methItems.map(item => {
                const dims = Object.entries(item.dimensions ?? {});
                return (
                  <div key={item.key} className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl ${item.cfg.bg} bg-opacity-10 flex items-center justify-center`}>
                          <item.cfg.icon size={20} className={item.cfg.color} />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{item.cfg.title}</h4>
                      </div>
                      <div className="text-center shrink-0">
                        <div className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{toPersianNum(item.score)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">از ۱۰۰</div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {dims.map(([dk, dv]) => (
                        <div key={dk}>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{DIM_LABELS[dk] ?? dk}</span>
                            <span className="text-slate-400 tabular-nums">{toPersianNum(dv)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full ${item.cfg.bg} rounded-full transition-all duration-1000`} style={{ width: `${Math.max(0, Math.min(100, dv))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {user.bigFive && (
        <div className="col-span-12 mt-6">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                            <Hexagon className="text-white" size={24} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">پروفایل شخصیت (Big Five)</h3>
                            <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">تحلیل ۵ عاملی شخصیت بر اساس مدل OCEAN</p>
                         </div>
                     </div>
                     {user.bigFive?._validity && BF_VALIDITY_CHIP[user.bigFive._validity] && (
                        <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${BF_VALIDITY_CHIP[user.bigFive._validity].cls}`}>
                            <ShieldCheck size={14} /> {BF_VALIDITY_CHIP[user.bigFive._validity].label}
                        </span>
                     )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                     {bigFiveData.map((trait, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-600 text-center hover:scale-105 transition-transform duration-300">
                            <div className="text-4xl font-black text-slate-800 dark:text-white mb-2">{toPersianNum(trait.score)}%</div>
                            <div className={`text-sm font-bold mb-4 ${trait.color}`}>{trait.title}</div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div className={`h-full ${trait.bg}`} style={{width: `${trait.score}%`}}></div>
                            </div>
                        </div>
                     ))}
                </div>
            </div>
        </div>
      )}

    </div>
    </>
  );
};

export default VerifiedResume;
