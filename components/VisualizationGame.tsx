
import React, { useState, useEffect } from 'react';
import { Box, Check, X, TrendingUp, ArrowRight, RotateCw, HelpCircle } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const MAX_ROUNDS = 10;

// An option is a pose of the reference shape: rotated, possibly mirrored.
// A mirrored chiral shape can never be produced by rotation alone, which is
// what makes the mirror distractors meaningful (Shepard-Metzler style).
interface ShapeOption {
  deg: number;
  mirrored: boolean;
}

// Chiral block-"F": no rotational or mirror symmetry, so every rotation and
// every mirrored pose is visually distinct. The previous lucide <Box> icon
// (an isometric cube) looked nearly identical under 90/180/270 rotation,
// which made the options indistinguishable and the task guessable.
const ChiralShape: React.FC<{ deg?: number; mirrored?: boolean; size?: number; className?: string }> = ({
  deg = 0,
  mirrored = false,
  size = 48,
  className = '',
}) => (
  <div
    style={{ transform: `${mirrored ? 'scaleX(-1) ' : ''}rotate(${deg}deg)`, width: size, height: size }}
    className="flex items-center justify-center transition-transform duration-300"
  >
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M14 6 h22 v9 h-13 v7 h10 v9 h-10 v11 h-9 z" fill="currentColor" />
    </svg>
  </div>
);

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
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [round, setRound] = useState(1);
  const [difficulty, setDifficulty] = useState(1); // CAT Level
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Dynamic Generation based on Difficulty
  const [targetRotation, setTargetRotation] = useState(0);
  const [options, setOptions] = useState<ShapeOption[]>([]);

  useEffect(() => {
      if (gameState === 'playing') generateLevel();
  }, [round, gameState]);

  const generateLevel = () => {
      let step = 90;
      if (difficulty >= 3) step = 45;
      if (difficulty >= 7) step = 30;

      const steps = 360 / step;
      const rot = Math.floor(Math.random() * steps) * step;
      const finalRot = rot === 0 ? step : rot; // Avoid 0 degree rotation

      setTargetRotation(finalRot);

      // Correct pose + a mirror trap + a wrong rotation. The mirror can sit at
      // any angle (even the target's): no rotation ever equals a mirrored pose.
      const correct: ShapeOption = { deg: finalRot, mirrored: false };
      const mirrorTrap: ShapeOption = {
          deg: Math.random() < 0.5 ? finalRot : Math.floor(Math.random() * steps) * step,
          mirrored: true,
      };
      let wrongDeg = Math.floor(Math.random() * steps) * step;
      while (wrongDeg === finalRot) {
          wrongDeg = Math.floor(Math.random() * steps) * step;
      }
      const wrongRotation: ShapeOption = { deg: wrongDeg, mirrored: false };

      setOptions([correct, mirrorTrap, wrongRotation].sort(() => Math.random() - 0.5));
      setSelectedIndex(null);
      setIsCorrect(null);
  }

  const handleGuess = (idx: number) => {
      if (selectedIndex !== null) return;

      const opt = options[idx];
      const correct = !opt.mirrored && opt.deg === targetRotation;
      setSelectedIndex(idx);
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
              setGameState('finished');
          }
      }, 1200); // Slightly longer delay to see the equation result
  };

  if (finished || gameState === 'finished') {
      const normalizedScore = Math.min(100, Math.round(score / 5));

      return (
        <GameResultCard
            title="قدرت تجسم (A12)"
            rawScore={normalizedScore}
            scoreKey="A12"
            metrics={[
                { label: 'سطح دشواری نهایی', value: toPersianNum(difficulty) },
                { label: 'امتیاز خام', value: toPersianNum(score) },
            ]}
            onRetry={() => {
                setRound(1);
                setDifficulty(1);
                setScore(0);
                setFinished(false);
                setSelectedIndex(null);
                setIsCorrect(null);
                setGameState('playing');
                generateLevel();
            }}
            onComplete={() => onComplete(normalizedScore)}
        />
      )
  }

  const selectedOption = selectedIndex !== null ? options[selectedIndex] : null;

  return (
    <GameShell
        title="قدرت تجسم (A12)"
        description="این آزمون توانایی چرخش ذهنی شما را می‌سنجد. شکل مبدا و مقدار چرخش داده شده؛ نتیجه صحیح را انتخاب کنید."
        instructions={[
            "شکل مبدا و زاویه چرخش را ببینید.",
            "نتیجه صحیح چرخش را از بین گزینه‌ها انتخاب کنید.",
            "مراقب گزینه‌های قرینه (آینه‌ای) باشید — آنها پاسخ صحیح نیستند!"
        ]}
        icon={<Box />}
        stats={{ score, level: difficulty }}
        onExit={onExit}
        onRestart={() => { setRound(1); setDifficulty(1); setScore(0); setFinished(false); setSelectedIndex(null); setIsCorrect(null); }}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="indigo"
    >
        <div className="h-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

            <div className="flex justify-between w-full max-w-lg mb-8 items-center z-10">
                <div className="flex items-center gap-3">
                    <span className="text-indigo-300 font-bold bg-white/10 px-3 py-1 rounded-full text-xs">مرحله {toPersianNum(round)} / {toPersianNum(MAX_ROUNDS)}</span>
                    <span className="text-white font-bold text-xs flex items-center gap-1"><TrendingUp size={14}/> سطح {toPersianNum(difficulty)}</span>
                </div>
            </div>

            {/* --- The Visual Equation --- */}
            <div className="w-full max-w-2xl mb-12 flex items-center justify-between px-4 z-10 gap-2 md:gap-4">

                {/* 1. Original Shape */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-800 rounded-2xl border-2 border-slate-600 flex items-center justify-center shadow-lg relative">
                        <div className="absolute -top-3 bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-600">مبدا</div>
                        <ChiralShape size={56} className="text-indigo-400 drop-shadow-lg" />
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
                            <ChiralShape size={56} deg={selectedOption.deg} mirrored={selectedOption.mirrored} className={isCorrect ? 'text-emerald-400' : 'text-red-400'} />
                        ) : (
                            <HelpCircle size={32} className="text-slate-600 animate-pulse" />
                        )}
                    </div>
                    <span className="text-xs font-bold text-slate-400">نتیجه؟</span>
                </div>

            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 w-full max-w-xl px-4 z-10">
                {options.map((opt, idx) => {
                    const isTheCorrectOption = !opt.mirrored && opt.deg === targetRotation;
                    let btnClass = "bg-white text-indigo-950 hover:scale-105 hover:shadow-xl hover:bg-indigo-50";
                    if (selectedIndex !== null) {
                        if (idx === selectedIndex) {
                            btnClass = isCorrect
                                ? "bg-emerald-500 text-white scale-105 ring-4 ring-emerald-500/30 border-emerald-400"
                                : "bg-red-500 text-white scale-95 ring-4 ring-red-500/30 border-red-400";
                        } else if (isTheCorrectOption) {
                            // Highlight the correct answer if user got it wrong
                            btnClass = "bg-emerald-100 text-emerald-800 opacity-50 scale-95 border-emerald-200";
                        } else {
                            btnClass = "bg-slate-800 text-slate-500 opacity-20 scale-90 border-slate-700";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleGuess(idx)}
                            disabled={selectedIndex !== null}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-lg border-b-4 border-black/10 active:border-b-0 active:translate-y-1 relative overflow-hidden ${btnClass}`}
                        >
                            <div className="absolute top-2 left-2 text-[10px] font-bold opacity-40">{toPersianNum(idx + 1)}</div>
                            <ChiralShape size={44} deg={opt.deg} mirrored={opt.mirrored} className="drop-shadow-sm" />

                            {selectedIndex !== null && idx === selectedIndex && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                    {isCorrect ? <Check size={32} className="text-white" /> : <X size={32} className="text-white" />}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="mt-8 text-slate-500 text-xs font-medium max-w-md text-center leading-relaxed">
                گزینه‌ای را انتخاب کنید که حاصل چرخش شکل مبدا به اندازه زاویه نشان داده شده باشد. گزینه‌های قرینه (آینه‌ای) پاسخ صحیح نیستند.
            </div>
        </div>
    </GameShell>
  );
};

export default VisualizationGame;
