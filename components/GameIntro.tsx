
import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { toPersianNum } from '../utils';

interface GameIntroProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onStart: () => void;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

const GameIntro: React.FC<GameIntroProps> = ({
  title,
  description,
  icon,
  onStart,
  gradientFrom,
  gradientTo,
  accentColor, // Kept for API consistency, though usage might vary
}) => {
  const [isCounting, setIsCounting] = useState(false);
  const [count, setCount] = useState(3);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isCounting && count > 0) {
      timer = setTimeout(() => setCount(c => c - 1), 1000);
    } else if (isCounting && count === 0) {
      onStart();
    }
    return () => clearTimeout(timer);
  }, [isCounting, count, onStart]);

  const handleStartClick = () => {
    setIsCounting(true);
  };

  return (
    <div className={`h-full w-full absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-50`}>
      {/* Animated Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-10 animate-pulse`}></div>
      
      <div className="relative z-10 max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 text-center border border-white/50 overflow-hidden">
        
        {!isCounting ? (
          <div className="animate-fade-in-up">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-tr ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-500`}>
              <div className="text-white scale-150">
                {icon}
              </div>
            </div>

            <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">{title}</h1>
            
            <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100">
                <p className="text-slate-600 font-medium leading-relaxed text-sm text-justify" dir="rtl">
                {description}
                </p>
            </div>

            <button 
              onClick={handleStartClick}
              className={`w-full py-4 rounded-2xl font-black text-xl text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
            >
              <Play fill="currentColor" size={24} />
              شروع ارزیابی
            </button>
          </div>
        ) : (
          <div className="py-20 animate-bounce">
             <div className={`text-9xl font-black bg-clip-text text-transparent bg-gradient-to-br ${gradientFrom} ${gradientTo} drop-shadow-sm`}>
               {toPersianNum(count)}
             </div>
             <p className="text-slate-400 font-bold mt-4 animate-pulse">آماده باشید...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameIntro;
