
import React, { useState, useEffect, useRef } from 'react';
import { Eye, Keyboard } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';
import { calculateStroopScore } from '../utils/scoring';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const ALL_COLORS = [
  { name: 'قرمز', hex: '#ef4444' },
  { name: 'آبی', hex: '#3b82f6' },
  { name: 'سبز', hex: '#22c55e' },
  { name: 'زرد', hex: '#eab308' },
  { name: 'بنفش', hex: '#9333ea' },
  { name: 'نارنجی', hex: '#f97316' },
];

const GAME_DURATION = 45;

const StroopGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentRound, setCurrentRound] = useState<{ text: string; colorHex: string; colorName: string }>({ text: '', colorHex: '', colorName: '' });
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [roundColors, setRoundColors] = useState<typeof ALL_COLORS>([]);

  // Stats for Analysis
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);

  // RT Tracking
  const roundStartTime = useRef(0);
  const congruencyData = useRef<{
      congruentRTs: number[];
      incongruentRTs: number[];
  }>({ congruentRTs: [], incongruentRTs: [] });

  // Kick off the first round once GameShell's own intro button flips us to 'playing'.
  useEffect(() => {
    if (gameState === 'playing' && roundColors.length === 0) generateRound();
  }, [gameState, roundColors]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 0.1), 100);
      return () => clearInterval(timer);
    } else if (gameState === 'playing' && timeLeft <= 0) {
      setGameState('finished');
    }
  }, [gameState, timeLeft]);

  // Keyboard Listener
  useEffect(() => {
      if (gameState !== 'playing') return;

      const handleKey = (e: KeyboardEvent) => {
          const key = parseInt(e.key);
          if (!isNaN(key) && key >= 1 && key <= roundColors.length) {
              handleAnswer(roundColors[key-1].name);
          }
      };

      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, roundColors, currentRound]);

  const generateRound = () => {
    // 30% Congruent (Match), 70% Incongruent (Mismatch)
    const isCongruent = Math.random() < 0.3;

    // Pick 4 active colors for this round to fit keyboard 1-4 nicely (or 1-6)
    // Let's use 4 options to reduce cognitive load on scanning and focus on inhibition
    const shuffledPool = [...ALL_COLORS].sort(() => Math.random() - 0.5);
    const activeColors = shuffledPool.slice(0, 4);
    setRoundColors(activeColors);

    const textIndex = Math.floor(Math.random() * activeColors.length);
    let colorIndex;

    if (isCongruent) {
        colorIndex = textIndex;
    } else {
        do {
            colorIndex = Math.floor(Math.random() * activeColors.length);
        } while (colorIndex === textIndex);
    }

    setCurrentRound({
      text: activeColors[textIndex].name,
      colorHex: activeColors[colorIndex].hex,
      colorName: activeColors[colorIndex].name
    });

    roundStartTime.current = performance.now();
  };

  const resetRun = () => {
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setAttempts(0);
    setCorrectCount(0);
    congruencyData.current = { congruentRTs: [], incongruentRTs: [] };
  };

  const handleStart = () => {
    resetRun();
    setGameState('playing');
    generateRound();
  };

  const handleAnswer = (selectedColorName: string) => {
    const reactionTime = performance.now() - roundStartTime.current;

    setAttempts(prev => prev + 1);
    const isCorrect = selectedColorName === currentRound.colorName;
    const isCongruent = currentRound.text === currentRound.colorName;

    if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        setScore(s => s + 10); // Base points
        setFlash('correct');

        // Record RT for analysis
        if (isCongruent) {
            congruencyData.current.congruentRTs.push(reactionTime);
        } else {
            congruencyData.current.incongruentRTs.push(reactionTime);
        }
    } else {
        setScore(s => Math.max(0, s - 10)); // Penalty
        setFlash('wrong');
    }

    setTimeout(() => setFlash(null), 200);
    generateRound();
  };

  if (gameState === 'finished') {
      const accuracy = attempts > 0 ? (correctCount / attempts) : 0;

      const avgCongruentRT = congruencyData.current.congruentRTs.length > 0
          ? congruencyData.current.congruentRTs.reduce((a,b) => a+b, 0) / congruencyData.current.congruentRTs.length
          : 0;

      const avgIncongruentRT = congruencyData.current.incongruentRTs.length > 0
          ? congruencyData.current.incongruentRTs.reduce((a,b) => a+b, 0) / congruencyData.current.incongruentRTs.length
          : 0;

      // Inhibition Score Calculation
      const inhibitionScore = calculateStroopScore(avgIncongruentRT, avgCongruentRT, accuracy);
      const stroopEffect = Math.round(Math.max(0, avgIncongruentRT - avgCongruentRT));

      return (
          <GameResultCard
              title="قدرت تمرکز (استروپ)"
              rawScore={inhibitionScore} // Use the specific formula as "raw" to map to T-Score
              scoreKey="A14"
              metrics={[
                  { label: 'دقت', value: toPersianNum(Math.round(accuracy * 100)) + '%' },
                  { label: 'اثر استروپ', value: toPersianNum(stroopEffect) + ' ms', subtext: 'هرچه کمتر، بهتر' },
                  { label: 'سرعت ناسازگار', value: toPersianNum(Math.round(avgIncongruentRT)) + ' ms' }
              ]}
              onRetry={handleStart}
              onComplete={() => onComplete(inhibitionScore)}
          />
      )
  }

  return (
    <GameShell
        title="قدرت تمرکز (استروپ)"
        description="رنگِ نوشته را انتخاب کنید، نه معنی کلمه را! می‌توانید از ماوس یا کلیدهای کیبورد (۱ تا ۴) برای پاسخ سریع استفاده کنید."
        instructions={[
          "رنگ واقعی نوشته را انتخاب کنید، نه کلمه‌ای که نوشته شده است.",
          "می‌توانید با کلیک روی گزینه‌ها یا کلیدهای ۱ تا ۴ پاسخ دهید.",
          `${toPersianNum(GAME_DURATION)} ثانیه فرصت دارید؛ پاسخ اشتباه امتیاز کم می‌کند.`,
        ]}
        icon={<Eye />}
        stats={{ score, timeLeft }}
        onExit={onExit}
        onRestart={() => { resetRun(); setGameState('playing'); generateRound(); }}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="rose"
    >
      <div className={`h-full w-full flex flex-col items-center justify-center rounded-3xl transition-colors duration-150 ${flash === 'correct' ? 'bg-emerald-100' : flash === 'wrong' ? 'bg-red-100' : ''}`}>
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="relative mb-12 transform hover:scale-105 transition-transform duration-300">
              <h1
                  className="text-7xl md:text-9xl font-black tracking-wider cursor-default select-none drop-shadow-2xl font-sans"
                  style={{ color: currentRound.colorHex, textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                  {currentRound.text}
              </h1>
              <p className="text-center text-slate-400 font-bold mt-6 text-sm uppercase tracking-[0.2em] bg-slate-100 inline-block px-4 py-1 rounded-full mx-auto flex items-center gap-2">
                  <Keyboard size={16} /> رنگ را انتخاب کنید
              </p>
          </div>
        </div>

        <div className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4">
          {roundColors.map((btnColor, idx) => (
             <button
               key={btnColor.name}
               onClick={() => handleAnswer(btnColor.name)}
               className="relative py-5 rounded-xl bg-white border border-slate-200 shadow-[0_4px_0_rgb(226,232,240)] hover:shadow-[0_2px_0_rgb(226,232,240)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all font-bold text-slate-700 text-xl group"
             >
               {btnColor.name}
               <div className="absolute top-1 left-2 text-[10px] text-slate-300 font-mono border border-slate-100 rounded px-1 group-hover:text-slate-500">
                   {toPersianNum(idx + 1)}
               </div>
             </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
};

export default StroopGame;
