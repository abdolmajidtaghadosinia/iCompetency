
import React, { useState, useEffect } from 'react';
import { Box, Check, X, Scan, TrendingUp, ArrowRight, RotateCw, HelpCircle } from 'lucide-react';
import GameIntro from './GameIntro';
import { toPersianNum } from '../utils';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const MAX_ROUNDS = 10;

// Helper Component for Visual Angle
const AngleGauge = ({ degrees }: { degrees: number }) => {
  const radius = 36;
  const center = 50;
  // 0 degrees is at 12 o'clock (Up) -> -90 degrees in SVG standard (which starts 3 o'clock)
  const startAngle = -90; 
  const endAngle = startAngle + degrees;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const x1 = center + radius * Math.cos(toRad(startAngle));
  const y1 = center + radius * Math.sin(toRad(startAngle));
  
  const x2 = center + radius * Math.cos(toRad(endAngle));
  const y2 = center + radius * Math.sin(toRad(endAngle));

  const largeArcFlag = degrees > 180 ? 1 : 0;

  const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center bg-slate-800/50 rounded-full border-2 border-slate-700 shadow-inner">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
            {/* Background Ring */}
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
            {/* Start Marker (Up) */}
            <line x1="50" y1="10" x2="50" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
            
            {/* Wedge */}
            <path d={pathData} fill="#818cf8" fillOpacity="0.4" stroke="#818cf8" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-indigo-300 pt-8">
            {toPersianNum(degrees)}°
        </div>
        <RotateCw size={14} className="absolute top-2 text-indigo-400" />
    </div>
  );
};

const VisualizationGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState(1); // CAT Level
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Dynamic Generation based on Difficulty
  const [targetRotation, setTargetRotation] = useState(0);
  const [options, setOptions] = useState<number[]>([]);

  useEffect(() => {
      if (!showIntro) generateLevel();
  }, [round, showIntro]);

  const generateLevel = () => {
      let step = 90;
      if (difficulty >= 3) step = 45;
      if (difficulty >= 7) step = 30;

      const rot = Math.floor(Math.random() * (360 / step)) * step;
      const finalRot = rot === 0 ? step : rot; // Avoid 0 degree rotation
      
      setTargetRotation(finalRot);

      // Generate options (Correct + 2 Distractors)
      const correct = finalRot;
      let wrong1 = (finalRot + step) % 360;
      let wrong2 = (finalRot - step + 360) % 360;
      
      // Ensure unique options
      const uniqueOptions = new Set([correct]);
      while (uniqueOptions.size < 3) {
          const rand = Math.floor(Math.random() * (360 / step)) * step;
          uniqueOptions.add(rand);
      }

      setOptions(Array.from(uniqueOptions).sort(() => Math.random() - 0.5));
      setSelectedOption(null);
      setIsCorrect(null);
  }

  const handleGuess = (deg: number) => {
      if (selectedOption !== null) return;

      const correct = deg === targetRotation;
      setSelectedOption(deg);
      setIsCorrect(correct);

      if (correct) {
          setScore(s => s + (10 * difficulty));
          setDifficulty(d => Math.min(10, d + 1));
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          setDifficulty(d => Math.max(1, d - 1));
          if (navigator.vibrate) navigator.vibrate(200);
      }
      
      setTimeout(() => {
          if (round < MAX_ROUNDS) {
              setRound(r => r + 1);
          } else {
              setFinished(true);
          }
      }, 1200); // Slightly longer delay to see the equation result
  };

  const getRating = (s: number) => {
      if (s >= 300) return "معمار ذهن";
      if (s >= 150) return "طراح ارشد";
      return "تصویرساز";
  };

  if (showIntro) {
    return (
      <GameIntro 
        title="قدرت تجسم (A12)"
        description="این آزمون توانایی چرخش ذهنی شما را می‌سنجد. یک شکل و مقدار چرخش آن داده می‌شود. نتیجه نهایی را انتخاب کنید."
        icon={<Box />}
        gradientFrom="from-indigo-500"
        gradientTo="to-violet-600"
        accentColor="text-indigo-600"
        onStart={() => setShowIntro(false)}
      />
    );
  }

  if (finished) {
      const normalizedScore = Math.min(100, Math.round(score / 5));
      const rating = getRating(score);

      return (
        <div className="h-full flex items-center justify-center bg-indigo-50 p-4 animate-fade-in-up">
             <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-md w-full border border-indigo-100">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Box size={40} className="text-indigo-600" />
                </div>
                
                <h2 className="text-3xl font-black text-slate-800 mb-2">تحلیل فضایی (CAT)</h2>
                <p className="text-indigo-500 font-bold mb-8 text-lg">{rating}</p>
                
                <div className="flex flex-col items-center gap-1 mb-8">
                    <span className="text-5xl font-black text-slate-800">{toPersianNum(score)}</span>
                    <span className="text-xs text-slate-400 font-bold">امتیاز خام</span>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                         <Scan className="text-indigo-500" size={18} />
                         <span className="text-sm font-bold text-slate-600">سطح دشواری نهایی</span>
                     </div>
                     <span className="text-xl font-black text-indigo-600">{toPersianNum(difficulty)}</span>
                </div>

                <button onClick={() => onComplete(normalizedScore)} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30">
                    پایان ارزیابی
                </button>
            </div>
        </div>
      )
  }

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

        <div className="flex justify-between w-full max-w-lg mb-8 items-center z-10">
            <div className="flex items-center gap-3">
                <span className="text-indigo-300 font-bold bg-white/10 px-3 py-1 rounded-full text-xs">مرحله {toPersianNum(round)} / {toPersianNum(MAX_ROUNDS)}</span>
                <span className="text-white font-bold text-xs flex items-center gap-1"><TrendingUp size={14}/> سطح {toPersianNum(difficulty)}</span>
            </div>
            <button onClick={onExit} className="text-xs font-bold text-indigo-300 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg">خروج</button>
        </div>

        {/* --- The Visual Equation --- */}
        <div className="w-full max-w-2xl mb-12 flex items-center justify-between px-4 z-10 gap-2 md:gap-4">
            
            {/* 1. Original Shape */}
            <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-800 rounded-2xl border-2 border-slate-600 flex items-center justify-center shadow-lg relative">
                    <div className="absolute -top-3 bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-600">مبدا</div>
                    <Box size={48} className="text-indigo-400 drop-shadow-lg" />
                </div>
            </div>

            {/* Operator */}
            <div className="flex flex-col items-center text-slate-500">
                <ArrowRight size={24} className="md:hidden" />
                <div className="hidden md:block text-2xl font-black text-slate-600">+</div>
            </div>

            {/* 2. Rotation Instruction */}
            <div className="flex flex-col items-center gap-3">
                <AngleGauge degrees={targetRotation} />
                <span className="text-xs font-bold text-slate-400">چرخش</span>
            </div>

            {/* Operator */}
            <div className="flex flex-col items-center text-slate-500">
                <ArrowRight size={24} className="md:hidden" />
                <div className="hidden md:block text-2xl font-black text-slate-600">=</div>
            </div>

            {/* 3. Result Placeholder (Question Mark) */}
            <div className="flex flex-col items-center gap-3">
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-dashed flex items-center justify-center shadow-inner transition-all duration-300 ${selectedOption !== null ? (isCorrect ? 'bg-emerald-500/20 border-emerald-500' : 'bg-red-500/20 border-red-500') : 'bg-slate-800/50 border-slate-600'}`}>
                    {selectedOption !== null ? (
                        <Box size={48} style={{ transform: `rotate(${selectedOption}deg)` }} className={isCorrect ? 'text-emerald-400' : 'text-red-400'} />
                    ) : (
                        <HelpCircle size={32} className="text-slate-600 animate-pulse" />
                    )}
                </div>
                <span className="text-xs font-bold text-slate-400">نتیجه؟</span>
            </div>

        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 w-full max-w-xl px-4 z-10">
            {options.map((optDeg, idx) => {
                let btnClass = "bg-white text-indigo-950 hover:scale-105 hover:shadow-xl hover:bg-indigo-50";
                if (selectedOption !== null) {
                    if (optDeg === selectedOption) {
                        btnClass = isCorrect 
                            ? "bg-emerald-500 text-white scale-105 ring-4 ring-emerald-500/30 border-emerald-400" 
                            : "bg-red-500 text-white scale-95 ring-4 ring-red-500/30 border-red-400";
                    } else if (optDeg === targetRotation) {
                        // Highlight the correct answer if user got it wrong
                        btnClass = "bg-emerald-100 text-emerald-800 opacity-50 scale-95 border-emerald-200"; 
                    } else {
                        btnClass = "bg-slate-800 text-slate-500 opacity-20 scale-90 border-slate-700";
                    }
                }

                return (
                    <button 
                        key={idx}
                        onClick={() => handleGuess(optDeg)}
                        disabled={selectedOption !== null}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-lg border-b-4 border-black/10 active:border-b-0 active:translate-y-1 relative overflow-hidden ${btnClass}`}
                    >
                        <div className="absolute top-2 left-2 text-[10px] font-bold opacity-40">{toPersianNum(idx + 1)}</div>
                        <Box size={40} style={{ transform: `rotate(${optDeg}deg)` }} strokeWidth={2} className="drop-shadow-sm" />
                        
                        {selectedOption !== null && optDeg === selectedOption && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                {isCorrect ? <Check size={32} className="text-white" /> : <X size={32} className="text-white" />}
                            </div>
                        )}
                    </button>
                )
            })}
        </div>
        
        <div className="mt-8 text-slate-500 text-xs font-medium max-w-md text-center leading-relaxed">
            گزینه‌ای را انتخاب کنید که حاصل چرخش شکل مبدا به اندازه زاویه نشان داده شده باشد.
        </div>
    </div>
  );
};

export default VisualizationGame;
