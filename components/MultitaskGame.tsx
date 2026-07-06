
import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Clock, Split, TrendingUp, Calculator, Palette, Check, X } from 'lucide-react';
import GameIntro from './GameIntro';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const GAME_DURATION = 40;

// Per-round response deadline, shrinking with difficulty. Without it both
// tasks could be answered serially at leisure (only the global clock ran),
// which defeats the point of a simultaneous dual-task measure.
const roundDeadlineMs = (difficulty: number) => Math.max(4000, 8000 - difficulty * 400);

const MultitaskGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  // Task 1: Math (Even/Odd)
  const [number, setNumber] = useState(0);
  const [mathAnswer, setMathAnswer] = useState<boolean | null>(null);

  // Task 2: Color Matching
  const [colorText, setColorText] = useState('قرمز');
  const [colorHex, setColorHex] = useState('red');
  const [colorAnswer, setColorAnswer] = useState<boolean | null>(null);

  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Round-deadline bookkeeping
  const [roundKey, setRoundKey] = useState(0);
  const roundStartRef = useRef(0);
  const roundDoneRef = useRef(false);

  useEffect(() => {
    if (showIntro || finished) return;

    generateTasks();
    const timer = setInterval(() => {
        setTimeLeft(t => {
            if (t <= 0.1) {
                clearInterval(timer);
                setFinished(true);
                return 0;
            }
            return t - 0.1;
        });
    }, 100);
    return () => clearInterval(timer);
  }, [showIntro, finished]);

  // Round deadline: an unanswered round counts as a failed attempt.
  useEffect(() => {
    if (showIntro || finished) return;

    const t = setTimeout(() => {
        if (roundDoneRef.current) return;
        setAttempts(prev => prev + 1);
        setScore(s => Math.max(0, s - (5 * difficulty)));
        setDifficulty(d => Math.max(1, d - 1));
        if (navigator.vibrate) navigator.vibrate(200);
        generateTasks();
    }, roundDeadlineMs(difficulty));

    return () => clearTimeout(t);
  }, [roundKey, showIntro, finished]);

  // Handle Keyboard Inputs
  useEffect(() => {
      if (showIntro || finished) return;

      const handleKey = (e: KeyboardEvent) => {
          // Left Hand: Math (A = Yes, S = No)
          const key = e.key.toLowerCase();
          if (key === 'a' && mathAnswer === null) handleMathInput(true);
          if (key === 's' && mathAnswer === null) handleMathInput(false);

          // Right Hand: Color (LeftArrow = Yes, RightArrow = No)
          // *Note*: Logic changed to standard Right=Yes/Left=No or similar mapping? 
          // Let's stick to ArrowLeft=Yes (Positive/Green side on keyboard often mapped to left in some layouts or just by convention here)
          // To be intuitive: Let's map Visual Layout to Keys.
          // Left Box (Math): Left Btn (A=Yes), Right Btn (S=No) -> Actually A is Left of S. So A=Yes/Even? S=No/Odd?
          // Let's use specific keys: A (Yes/Even), S (No/Odd).
          // Right Box (Color): Left Arrow (Yes), Right Arrow (No).
          
          if (e.key === 'ArrowLeft' && colorAnswer === null) handleColorInput(true);
          if (e.key === 'ArrowRight' && colorAnswer === null) handleColorInput(false);
      };

      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [showIntro, finished, mathAnswer, colorAnswer]);

  // Check if round is complete
  useEffect(() => {
      if (mathAnswer !== null && colorAnswer !== null) {
          evaluateRound();
      }
  }, [mathAnswer, colorAnswer]);

  const generateTasks = () => {
      setMathAnswer(null);
      setColorAnswer(null);

      const maxNum = difficulty > 5 ? 500 : 100;
      setNumber(Math.floor(Math.random() * maxNum) + 1);

      const colors = [
          {name: 'قرمز', hex: '#ef4444'},
          {name: 'آبی', hex: '#3b82f6'},
          {name: 'سبز', hex: '#22c55e'}
      ];
      const textIdx = Math.floor(Math.random() * 3);
      const hexIdx = Math.random() > 0.5 ? textIdx : Math.floor(Math.random() * 3);

      setColorText(colors[textIdx].name);
      setColorHex(colors[hexIdx].hex);

      roundDoneRef.current = false;
      roundStartRef.current = Date.now();
      setRoundKey(k => k + 1);
  };

  const handleMathInput = (isEven: boolean) => {
      setMathAnswer(isEven);
  };

  const handleColorInput = (isMatch: boolean) => {
      setColorAnswer(isMatch);
  };

  const evaluateRound = () => {
      roundDoneRef.current = true; // stop the round-deadline timer from double-counting
      setAttempts(prev => prev + 1);
      
      const correctEven = (number % 2 === 0);
      const mathCorrect = mathAnswer === correctEven;

      const correctMatch = (colorText === 'قرمز' && colorHex === '#ef4444') || 
                           (colorText === 'آبی' && colorHex === '#3b82f6') || 
                           (colorText === 'سبز' && colorHex === '#22c55e');
      const colorCorrect = colorAnswer === correctMatch;
      
      if (mathCorrect && colorCorrect) {
          setScore(s => s + (10 * difficulty));
          setCorrectCount(prev => prev + 1);
          setDifficulty(d => Math.min(10, d + 1));
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          setScore(s => Math.max(0, s - (5 * difficulty)));
          setDifficulty(d => Math.max(1, d - 1));
          if (navigator.vibrate) navigator.vibrate(200);
      }
      
      setTimeout(generateTasks, 200);
  };

  if (showIntro) {
    return (
      <GameIntro 
        title="انجام همزمان امور (A15)"
        description="تفکیک نیمکره‌ها! سمت چپ: اگر عدد زوج است دکمه A (بله)، اگر فرد است دکمه S (خیر). سمت راست: اگر رنگ و متن یکی است فلش چپ (بله)، اگر نه فلش راست (خیر)."
        icon={<LayoutGrid />}
        gradientFrom="from-purple-600"
        gradientTo="to-indigo-600"
        accentColor="text-purple-500"
        onStart={() => setShowIntro(false)}
      />
    );
  }

  if (finished) {
      const accuracy = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 0;
      const normalizedScore = Math.min(100, Math.round(score / 30));

      return (
        <GameResultCard
            title="مدیریت همزمان (A15)"
            rawScore={normalizedScore}
            scoreKey="A15"
            metrics={[
                { label: 'دقت', value: toPersianNum(accuracy) + '٪' },
                { label: 'سطح نهایی', value: toPersianNum(difficulty) },
            ]}
            onRetry={() => {
                setScore(0);
                setDifficulty(1);
                setAttempts(0);
                setCorrectCount(0);
                setTimeLeft(GAME_DURATION);
                setFinished(false); // main effect restarts timer + tasks
            }}
            onComplete={() => onComplete(normalizedScore)}
        />
      );
  }

  const progressPercent = (timeLeft / GAME_DURATION) * 100;
  // Re-rendered every 100ms by the global clock tick, so this stays live.
  const roundRemaining = Math.max(0, 1 - (Date.now() - roundStartRef.current) / roundDeadlineMs(difficulty));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-2 relative overflow-hidden font-sans">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-2 px-2 pt-2">
             <div className="flex items-center gap-2 font-bold bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                 <Clock size={16} className="text-slate-400" /> {toPersianNum(Math.ceil(timeLeft))}
             </div>
             <div className="flex items-center gap-2">
                <div className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-500">Lv {toPersianNum(difficulty)}</div>
                <div className="font-bold text-purple-400 bg-purple-900/20 px-3 py-1.5 rounded-full border border-purple-500/20">{toPersianNum(score)}</div>
             </div>
        </div>

        {/* Timer Line */}
        <div className="w-full h-1 bg-slate-900 mb-2 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-100 ease-linear" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Round Deadline Line */}
        <div className="w-full flex items-center gap-2 mb-4">
            <span className="text-[9px] font-bold text-amber-500/80 uppercase shrink-0">مهلت این دور</span>
            <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-100 ease-linear ${roundRemaining < 0.3 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${roundRemaining * 100}%` }}></div>
            </div>
        </div>

        <div className="flex-1 flex gap-2 md:gap-4 overflow-hidden">
            
            {/* --- LEFT SIDE: MATH (Purple Theme) --- */}
            <div className={`flex-1 bg-slate-900 rounded-3xl border-2 ${mathAnswer !== null ? 'border-purple-500 opacity-50 scale-[0.98]' : 'border-purple-500/30'} flex flex-col relative transition-all duration-200`}>
                <div className="absolute top-4 left-4 p-2 bg-purple-500/20 rounded-lg text-purple-400"><Calculator size={24} /></div>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <h3 className="text-purple-300 font-bold mb-6 uppercase tracking-widest text-xs">آیا زوج است؟</h3>
                    <div className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">{toPersianNum(number)}</div>
                </div>
                
                {/* Visual Buttons for Touch / Key Hint */}
                <div className="p-4 grid grid-cols-2 gap-3">
                    <button 
                        onPointerDown={() => handleMathInput(true)}
                        className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
                    >
                        <Check size={24} className="text-purple-400"/>
                        <span className="text-xs font-bold text-purple-300">بله (A)</span>
                    </button>
                    <button 
                        onPointerDown={() => handleMathInput(false)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
                    >
                        <X size={24} className="text-slate-400"/>
                        <span className="text-xs font-bold text-slate-400">خیر (S)</span>
                    </button>
                </div>
            </div>

            {/* --- RIGHT SIDE: COLOR (Cyan Theme) --- */}
            <div className={`flex-1 bg-slate-900 rounded-3xl border-2 ${colorAnswer !== null ? 'border-cyan-500 opacity-50 scale-[0.98]' : 'border-cyan-500/30'} flex flex-col relative transition-all duration-200`}>
                <div className="absolute top-4 left-4 p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Palette size={24} /></div>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <h3 className="text-cyan-300 font-bold mb-6 uppercase tracking-widest text-xs">تطابق رنگ و متن؟</h3>
                    <div className="text-5xl md:text-6xl font-black drop-shadow-lg transition-transform hover:scale-110 duration-200" style={{color: colorHex}}>{colorText}</div>
                </div>

                {/* Visual Buttons for Touch / Key Hint */}
                <div className="p-4 grid grid-cols-2 gap-3">
                    <button 
                        onPointerDown={() => handleColorInput(true)}
                        className="bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
                    >
                        <Check size={24} className="text-cyan-400"/>
                        <span className="text-xs font-bold text-cyan-300">بله (Left)</span>
                    </button>
                    <button 
                        onPointerDown={() => handleColorInput(false)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
                    >
                        <X size={24} className="text-slate-400"/>
                        <span className="text-xs font-bold text-slate-400">خیر (Right)</span>
                    </button>
                </div>
            </div>

        </div>
        
        <button onClick={onExit} className="absolute top-4 left-1/2 -translate-x-1/2 text-slate-600 hover:text-white text-xs p-2">انصراف</button>
    </div>
  );
};

export default MultitaskGame;
