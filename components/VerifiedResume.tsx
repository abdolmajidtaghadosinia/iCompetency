
import React, { useMemo, useState } from 'react';
import { UserProfile } from '../types';
import { 
  ShieldCheck, Printer, Share2, Loader2,
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid, 
  Target, Microscope, Sparkles, Hexagon, Briefcase
} from 'lucide-react';
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
            {/* ... Print content ... */}
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

      {user.bigFive && (
        <div className="col-span-12 mt-6">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                        <Hexagon className="text-white" size={24} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">پروفایل شخصیت (Big Five)</h3>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">تحلیل ۵ عاملی شخصیت بر اساس مدل OCEAN</p>
                     </div>
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
