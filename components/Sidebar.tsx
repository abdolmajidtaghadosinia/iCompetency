
import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';
import { LayoutDashboard, Workflow, BrainCircuit, LogOut, FileBadge, Globe, Volume2, VolumeX, Hexagon } from 'lucide-react';
import { sfx } from '../services/audioService';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  user: UserProfile;
}

interface MenuItem {
  id: AppView | string;
  label: string;
  description: string;
  icon: any;
  disabled?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout }) => {
  const [isMuted, setIsMuted] = useState(sfx.muted);

  const toggleSound = () => {
      const newState = sfx.toggleMute();
      setIsMuted(newState);
      if (!newState) sfx.playSuccess();
  };

  const handleMenuClick = (view: AppView) => {
      sfx.playClick();
      onChangeView(view);
  };

  const menuItems: MenuItem[] = [
    { 
      id: AppView.DASHBOARD, 
      label: 'داشبورد', 
      description: 'گزارش عملکرد',
      icon: LayoutDashboard 
    },
    { 
      id: AppView.JOURNEY_MAP, 
      label: 'مسیر', 
      description: 'نقشه ارزیابی',
      icon: Workflow 
    },
    { 
      id: AppView.MINIGAME_HUB, 
      label: 'آزمون‌ها', 
      description: 'بازی‌های شناختی',
      icon: BrainCircuit 
    },
    {
      id: AppView.MINIGAME_BIGFIVE,
      label: 'آزمون شخصیت',
      description: 'مدیریت کلونی',
      icon: Globe
    },
    { 
      id: AppView.VERIFIED_RESUME, 
      label: 'کارنامه', 
      description: 'گزارش نهایی',
      icon: FileBadge 
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="w-20 lg:w-72 h-screen fixed right-0 top-0 z-50 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 hidden md:flex flex-col font-sans shadow-sm transition-all duration-300">
        
        {/* Logo Area */}
        <div className="p-6 lg:p-8 flex items-center justify-center lg:justify-start gap-4 animate-fade-in-up">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none shrink-0 text-white">
            <Hexagon size={24} fill="currentColor" className="opacity-90" />
          </div>
          <div className="hidden lg:block">
              <h1 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">iCompetency</h1>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md inline-block mt-1">سامانه هوشمند</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 lg:px-6 space-y-2 overflow-y-auto custom-scrollbar py-4">
          <div className="hidden lg:block text-[10px] font-black text-slate-500 px-4 mb-2 uppercase tracking-widest opacity-60">منوی اصلی</div>
          {menuItems.map((item, index) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => !item.disabled && handleMenuClick(item.id as AppView)}
                onMouseEnter={() => !item.disabled && sfx.playHover()}
                disabled={item.disabled}
                style={{ animationDelay: `${50 + (index * 30)}ms` }}
                className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 lg:px-4 lg:py-3.5 rounded-2xl transition-all duration-300 group animate-fade-in-up relative overflow-hidden ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                    : item.disabled
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:scale-110'
                }`}>
                  <item.icon 
                    className={`w-5 h-5 ${isActive ? 'animate-pulse-soft' : ''}`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                
                <div className="hidden lg:block flex-1 text-right relative z-10">
                    <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {item.label}
                    </div>
                    <div className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-500'}`}>
                        {item.description}
                    </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 lg:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex gap-3">
                <button 
                    onClick={toggleSound}
                    className="flex-1 flex items-center justify-center p-3 rounded-2xl text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                    title={isMuted ? "وصل صدا" : "قطع صدا"}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button onClick={onLogout} className="flex-[3] flex items-center justify-center gap-3 p-3 rounded-2xl text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all font-bold text-sm group border border-red-100 dark:border-red-900/30">
                    <LogOut size={20} className="rtl:scale-x-[-1] group-hover:ltr:-translate-x-1 group-hover:rtl:translate-x-1 transition-transform" />
                    <span className="hidden lg:inline">خروج</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center p-2">
          {menuItems.map((item) => {
             const isActive = currentView === item.id;
             return (
               <button
                 key={item.id}
                 onClick={() => !item.disabled && handleMenuClick(item.id as AppView)}
                 className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-full min-h-[44px] min-w-[44px] ${
                   isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                 }`}
               >
                 <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 -translate-y-1' : ''}`}>
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                 </div>
                 <span className={`text-[9px] font-bold mt-1 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                   {item.label}
                 </span>
               </button>
             )
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
