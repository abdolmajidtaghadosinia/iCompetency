
import React from 'react';
import { AppView, UserProfile } from '../types';
import {
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid, BrainCircuit, Lock, CheckCircle2, Play, Grid, Search,
  HelpCircle, Target, Network
} from 'lucide-react';
import { toPersianNum } from '../utils';

interface Props {
  onSelectGame: (view: AppView) => void;
  user: UserProfile;
}

interface GameCardData {
  id: AppView;
  code: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  bar: string;
  progress: number;
}

const GameCard: React.FC<{ game: GameCardData; index: number; onSelectGame: (view: AppView) => void }> = ({ game, index, onSelectGame }) => (
  <div
    onClick={() => onSelectGame(game.id)}
    style={{ animationDelay: `${index * 50}ms` }}
    className="group relative bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 hover:-translate-y-2 hover:shadow-xl cursor-pointer transition-all duration-300 animate-fade-in-up"
  >
    <div className={`h-32 rounded-2xl bg-gradient-to-br ${game.gradient} mb-5 flex items-center justify-center relative overflow-hidden`}>
      <div className="absolute top-3 left-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-slate-700 dark:text-white">
        {game.code}
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm transform transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3">
        {game.icon}
      </div>
    </div>

    <div className="px-1">
      <h3 className="text-lg font-black mb-1.5 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {game.title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-5 leading-relaxed line-clamp-2 min-h-[32px]">
        {game.description}
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${game.bar} transition-all duration-1000 ease-out`} style={{ width: `${game.progress}%` }}></div>
          </div>
          <span className={`text-[10px] font-bold ${game.accent}`}>{toPersianNum(game.progress)}%</span>
        </div>
        <button className="w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-indigo-600 transition-all">
          <Play size={14} fill="currentColor" /> شروع
        </button>
      </div>
    </div>
  </div>
);

const MiniGameHub: React.FC<Props> = ({ onSelectGame, user }) => {

  // Map user raw scores or skills to progress display
  // Using user.skills for now as the bridge until CognitiveProfile is fully populated
  const getProgress = (key: keyof typeof user.skills) => user.skills[key] || 0;

  const cognitiveGames = [
    {
      id: AppView.MINIGAME_MEMORY,
      code: "A9",
      title: "حافظه جامع (Memory)",
      description: "شامل ۳ آزمون: شبکه امنیتی (Corsi)، جفت‌های پنهان و رادار تمرکز (N-Back).",
      icon: <Layers className="w-8 h-8 text-pink-600 dark:text-pink-400" />,
      gradient: "from-pink-100 to-rose-50 dark:from-pink-900/40 dark:to-rose-900/20",
      accent: "text-pink-600 dark:text-pink-400",
      bar: "bg-pink-500",
      progress: getProgress('memory')
    },
    {
      id: AppView.MINIGAME_MATH,
      code: "A10",
      title: "هوش محاسباتی",
      description: "ارزیابی سرعت و دقت محاسبات ذهنی در ۱۰ سطح دشواری.",
      icon: <Calculator className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      gradient: "from-blue-100 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/20",
      accent: "text-blue-600 dark:text-blue-400",
      bar: "bg-blue-500",
      progress: getProgress('math')
    },
    {
      id: AppView.MINIGAME_PATTERN,
      code: "A10+",
      title: "تطابق الگو",
      description: "کشف روابط منطقی در ماتریس‌های عددی و تصویری.",
      icon: <Grid className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      gradient: "from-indigo-100 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/20",
      accent: "text-indigo-600 dark:text-indigo-400",
      bar: "bg-indigo-500",
      progress: getProgress('analysis')
    },
    {
      id: AppView.MINIGAME_SPEED,
      code: "A11",
      title: "سرعت ادراکی",
      description: "یافتن تفاوت‌ها و شباهت‌ها در کمترین زمان ممکن.",
      icon: <Zap className="w-8 h-8 text-amber-500 dark:text-amber-400" />,
      gradient: "from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/20",
      accent: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      progress: getProgress('perception')
    },
    {
      id: AppView.MINIGAME_VISUALIZATION,
      code: "A12",
      title: "تجسم فضایی",
      description: "چرخش ذهنی اشکال و درک روابط سه‌بعدی.",
      icon: <Box className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      gradient: "from-indigo-100 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/20",
      accent: "text-indigo-600 dark:text-indigo-400",
      bar: "bg-indigo-500",
      progress: getProgress('visualization')
    },
    {
      id: AppView.MINIGAME_ORIENTATION,
      code: "A13",
      title: "جهت‌یابی",
      description: "تشخیص جهت‌ها با تغییر زاویه دید (قطب‌نما).",
      icon: <Compass className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      gradient: "from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20",
      accent: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      progress: getProgress('orientation')
    },
    {
      id: AppView.MINIGAME_STROOP,
      code: "A14",
      title: "قدرت تمرکز (استروپ)",
      description: "کنترل تداخل و بازداری پاسخ‌های تکانشی.",
      icon: <Eye className="w-8 h-8 text-red-600 dark:text-red-400" />,
      gradient: "from-red-100 to-rose-50 dark:from-red-900/40 dark:to-rose-900/20",
      accent: "text-red-600 dark:text-red-400",
      bar: "bg-red-500",
      progress: getProgress('focus')
    },
    {
      id: AppView.MINIGAME_MULTITASK,
      code: "A15",
      title: "مدیریت همزمان",
      description: "پردازش موازی اطلاعات و مدیریت توجه.",
      icon: <LayoutGrid className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      gradient: "from-purple-100 to-fuchsia-50 dark:from-purple-900/40 dark:to-fuchsia-900/20",
      accent: "text-purple-600 dark:text-purple-400",
      bar: "bg-purple-500",
      progress: getProgress('multitasking')
    },
    {
      id: AppView.MINIGAME_FACTFINDING,
      code: "A18",
      title: "حقیقت‌یابی",
      description: "استنتاج منطقی و مدیریت بودجه اطلاعاتی.",
      icon: <Search className="w-8 h-8 text-teal-600 dark:text-teal-400" />,
      gradient: "from-teal-100 to-emerald-50 dark:from-teal-900/40 dark:to-emerald-900/20",
      accent: "text-teal-600 dark:text-teal-400",
      bar: "bg-teal-500",
      progress: getProgress('decisionMaking')
    },
    {
      id: AppView.MINIGAME_ROLEPLAY,
      code: "A19",
      title: "شبیه‌ساز نقش‌آفرینی",
      description: "نسخه پیچیده حقیقت‌یابی. تصمیم‌گیری تحت فشار با اطلاعات ناقص به عنوان مدیرعامل.",
      icon: <Search className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
      gradient: "from-indigo-100 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/20",
      accent: "text-indigo-600 dark:text-indigo-400",
      bar: "bg-indigo-500",
      progress: getProgress('decisionMaking')
    }
  ];

  const methodologyGames = [
    {
      id: AppView.MINIGAME_5WHYS,
      code: "5W",
      title: "پنج چرا (5 Whys)",
      description: "ریشه‌یابی مسئله با پرسش مکرر «چرا» تا رسیدن به علت اصلی.",
      icon: <HelpCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />,
      gradient: "from-cyan-100 to-sky-50 dark:from-cyan-900/40 dark:to-sky-900/20",
      accent: "text-cyan-600 dark:text-cyan-400",
      bar: "bg-cyan-500",
      progress: getProgress('analysis')
    },
    {
      id: AppView.MINIGAME_SWOT,
      code: "SWOT",
      title: "تحلیل SWOT",
      description: "طبقه‌بندی نقاط قوت، ضعف، فرصت و تهدید و تدوین استراتژی.",
      icon: <Target className="w-8 h-8 text-fuchsia-600 dark:text-fuchsia-400" />,
      gradient: "from-fuchsia-100 to-pink-50 dark:from-fuchsia-900/40 dark:to-pink-900/20",
      accent: "text-fuchsia-600 dark:text-fuchsia-400",
      bar: "bg-fuchsia-500",
      progress: getProgress('analysis')
    },
    {
      id: AppView.MINIGAME_CYNEFIN,
      code: "CYN",
      title: "چارچوب Cynefin",
      description: "تشخیص نوع پیچیدگی موقعیت و انتخاب واکنش مدیریتی درست.",
      icon: <Network className="w-8 h-8 text-violet-600 dark:text-violet-400" />,
      gradient: "from-violet-100 to-purple-50 dark:from-violet-900/40 dark:to-purple-900/20",
      accent: "text-violet-600 dark:text-violet-400",
      bar: "bg-violet-500",
      progress: getProgress('decisionMaking')
    }
  ];

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto pb-24 md:pb-12">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-10 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 animate-fade-in-up">
             <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none text-white shrink-0">
                <BrainCircuit size={40} />
             </div>
             <div className="text-center md:text-right">
                 <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">آزمون‌های شناختی (Razi Model)</h1>
                 <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-2xl">
                     مجموعه بازی‌های استاندارد شده برای سنجش دقیق مهارتهای ذهنی. 
                     امتیازات شما به صورت خودکار به شاخص‌های T-Score و پروفایل شایستگی تبدیل می‌شوند.
                 </p>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8">
            {cognitiveGames.map((game, index) => (
                <GameCard key={game.id} game={game} index={index} onSelectGame={onSelectGame} />
            ))}
        </div>

        <div className="flex items-center gap-3 mt-12 mb-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">روش‌های حل مسئله</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">شبیه‌سازی سناریوهای واقعی کسب‌وکار با متدولوژی‌های استاندارد</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {methodologyGames.map((game, index) => (
                <GameCard key={game.id} game={game} index={index} onSelectGame={onSelectGame} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default MiniGameHub;
