
import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { 
  Bell, ChevronDown, Settings, ArrowUpRight, 
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid,
  Trophy, Moon, Sun, ClipboardCheck, Star, Activity, Play, FileText
} from 'lucide-react';
import { toPersianNum } from '../utils';

interface DashboardProps {
  user: UserProfile;
  onStartScenario: () => void;
  onOpenBigFive: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartScenario, onOpenBigFive, isDarkMode, toggleTheme }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        setAnimateStats(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!showProfileModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileModal(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showProfileModal]);

  // Calculations
  const totalSkill = (Object.values(user.skills) as number[]).reduce((a: number, b: number) => a + b, 0);
  const overallScore = user.cognitiveProfile?.tScores?.TCS || (totalSkill > 0 ? Math.min(100, Math.round(totalSkill / 7)) : 0);
  const xpPercentage = Math.min(100, (user.currentXp / user.requiredXp) * 100);
  const avatarLabel = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();
  const accountId = user.id ? `IC-${String(user.id).padStart(6, '0')}` : null;

  // Selected Cognitive Skills for the Widget
  const cognitiveStats = [
    { name: 'تجسم (Visual)', score: user.skills.visualization, icon: Box, color: 'text-indigo-500', bg: 'bg-indigo-500', barBg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { name: 'جهت‌یابی (Orient)', score: user.skills.orientation, icon: Compass, color: 'text-emerald-500', bg: 'bg-emerald-500', barBg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { name: 'تمرکز (Focus)', score: user.skills.focus, icon: Eye, color: 'text-rose-500', bg: 'bg-rose-500', barBg: 'bg-rose-100 dark:bg-rose-900/30' },
    { name: 'همزمانی (Multi)', score: user.skills.multitasking, icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-500', barBg: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-8 font-sans text-slate-800 dark:text-slate-100 pb-24 custom-scrollbar relative transition-colors duration-300">
        
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowProfileModal(false)}>
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100 animate-scale-in m-4 border border-white/20" onClick={e => e.stopPropagation()}>
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
               
               <div className="space-y-4">
                   <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-indigo-600 shadow-sm">
                        <ClipboardCheck size={20} />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-slate-500 uppercase">شناسه یکتا</div>
                         <div className="text-sm font-black text-slate-900 dark:text-white font-mono" dir="ltr">{accountId || '—'}</div>
                      </div>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 animate-fade-in-up">
        <div className="text-center md:text-right w-full md:w-auto">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">داشبورد وضعیت</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-1">گزارش جامع شایستگی و عملکرد</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-end">
           <div 
             onClick={toggleTheme}
             className="hidden md:flex items-center gap-3 cursor-pointer bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all active:scale-95 select-none"
           >
              {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
           </div>

           <div 
             onClick={() => setShowProfileModal(true)}
             className="flex items-center gap-3 bg-white dark:bg-slate-800 pl-2 pr-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group active:scale-95"
           >
              <div className="text-left hidden lg:block">
                 <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{user.name}</div>
                 <div className="text-[10px] text-slate-400 font-bold uppercase">{user.role}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black shadow-sm">
                {avatarLabel}
              </div>
              <ChevronDown size={16} className="text-slate-400" />
           </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        
        {/* 1. Level Progress (Top Full Width) */}
        <div className="col-span-12 bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 relative overflow-hidden animate-scale-in delay-100 group">
            <div className="relative z-10 flex flex-col xl:flex-row items-center gap-8">
                <div className="hidden md:block absolute -top-6 -left-6 rotate-12 opacity-10">
                    <Trophy size={150} />
                </div>

                <div className="flex items-center gap-4 w-full xl:w-auto min-w-[200px]">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                        <ClipboardCheck size={32} />
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">اقدام بعدی</div>
                        <button onClick={onStartScenario} className="font-black text-slate-800 dark:text-white hover:text-indigo-600 transition-colors flex items-center gap-1">
                            ادامه مسیر <ArrowUpRight size={16} className="rtl:scale-x-[-1]" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{xpPercentage.toFixed(0)}%</span>
                        <div className="text-right">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">سطح فعلی</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">{user.level} <span className="inline-block bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] px-2 py-0.5 rounded-lg ml-2 align-middle">Tier {toPersianNum(user.levelNumber)}</span></div>
                        </div>
                    </div>
                    <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner p-1">
                         <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative transition-all duration-[1500ms] ease-out shadow-sm"
                            style={{ width: `${animateStats ? Math.max(5, xpPercentage) : 5}%` }}
                         >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                         </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. Personality Profile (Right in RTL / Col 1) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up delay-200 flex flex-col min-h-[340px]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">پروفایل شخصیت</h3>
                <Activity size={18} className="text-slate-400" />
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center text-center">
                 {user.bigFive ? (
                     <div className="w-full h-full flex flex-col items-center justify-center">
                         <div className="text-5xl mb-4 animate-bounce">✨</div>
                         <h4 className="font-black text-slate-800 dark:text-white text-xl mb-2">تحلیل کامل شد</h4>
                         <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 px-4 leading-relaxed">
                            پروفایل OCEAN شما ثبت شده است. برای مشاهده جزئیات به بخش کارنامه مراجعه کنید.
                         </p>
                         <button onClick={onOpenBigFive} className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                             مشاهده مجدد
                         </button>
                     </div>
                 ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center">
                         <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Star className="text-amber-500 w-12 h-12 fill-amber-500" />
                         </div>
                         <p className="text-slate-500 dark:text-slate-400 font-bold mb-6 text-sm">
                             آزمون شخصیت انجام نشده است.
                         </p>
                         <button 
                            onClick={onOpenBigFive}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/30 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
                         >
                            <Play fill="currentColor" size={18} /> شروع آزمون
                         </button>
                     </div>
                 )}
             </div>
        </div>

        {/* 3. Cognitive Scores (Center / Col 2) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up delay-300 flex flex-col min-h-[340px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">ریز نمرات شناختی</h3>
                <Settings size={18} className="text-slate-400" />
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6">
                {cognitiveStats.map((stat, idx) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${stat.barBg} ${stat.color}`}>
                                    <stat.icon size={16} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                                    {stat.name}
                                </span>
                            </div>
                            <span className={`text-sm font-black ${stat.color}`}>
                                {toPersianNum(stat.score)}%
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${stat.bg} rounded-full transition-all duration-1000 ease-out relative`} 
                                style={{ width: `${animateStats ? stat.score : 0}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 4. Overall Competency Index (Left / Col 3) */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up delay-400 flex flex-col min-h-[340px]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">شاخص کل صلاحیت</h3>
                <ArrowUpRight size={18} className="text-slate-400 rtl:scale-x-[-1]" />
             </div>

             <div className="flex-1 flex flex-col items-center justify-center">
                 {user.totalScenarios === 0 ? (
                   <div className="flex flex-col items-center justify-center py-12 text-center">
                     <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                       <Play size={32} className="text-slate-400" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">هنوز آزمونی انجام نداده‌اید</h3>
                     <p className="text-slate-500 text-sm mb-4">با انجام اولین آزمون، نتایج شما اینجا نمایش داده می‌شود.</p>
                   </div>
                 ) : (
                 <>
                 {/* Gauge Chart */}
                 <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background Circle */}
                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                          {/* Progress Circle */}
                          <circle 
                              cx="50" cy="50" r="45" 
                              fill="none" 
                              stroke="url(#gradient-gauge)" 
                              strokeWidth="8" 
                              strokeDasharray="283" 
                              strokeDashoffset={animateStats ? 283 - (283 * overallScore) / 100 : 283}
                              strokeLinecap="round"
                              className="transition-all duration-[2000ms] ease-out"
                          />
                          <defs>
                              <linearGradient id="gradient-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#6366f1" />
                                  <stop offset="100%" stopColor="#a855f7" />
                              </linearGradient>
                          </defs>
                      </svg>
                      
                      {/* Inner Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tighter">
                              {toPersianNum(overallScore)}
                          </div>
                          <div className="text-xs font-bold text-slate-400 uppercase mt-1">نمره تراز</div>
                          {/* Decorative Elements around circle */}
                          <div className="absolute -top-2 -right-2 text-2xl animate-bounce delay-700">🪙</div>
                          <div className="absolute bottom-4 -left-4 text-xl animate-pulse">🔮</div>
                          <div className="absolute top-10 -left-2 text-sm text-indigo-300">👑</div>
                      </div>
                 </div>

                 <button 
                     onClick={onStartScenario}
                     className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 mb-4"
                 >
                     شروع آزمون جدید
                 </button>

                 <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                     <span className="flex items-center gap-2"><FileText size={14}/> شفافیت محاسبات</span>
                     <ChevronDown size={14} />
                 </button>
                 </>
                 )}
             </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
