
import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { toPersianNum } from '../utils';
import GameShell from './GameShell';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const GAME_DURATION = 35;

const SpeedGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [combo, setCombo] = useState(1);
  const [grid, setGrid] = useState<string[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [feedbackState, setFeedbackState] = useState<{index: number, type: 'correct' | 'wrong'} | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  
  // High Precision Timing
  const roundStartTime = useRef<number>(0);
  const reactionTimes = useRef<number[]>([]);

  const easyShapes = ['★', '●', '■', '▲', '◆', '▼'];
  const mediumShapes = ['O', 'Q', '0', 'C', 'G']; 
  const hardShapes = ['6', '9', '8', 'B', 'P', 'R'];

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Generate initial level
    if (grid.length === 0) generateLevel();

    const timer = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 0.1) {
                clearInterval(timer);
                setGameState('finished');
                return 0;
            }
            return prev - 0.1;
        });
    }, 100);
    return () => clearInterval(timer);
  }, [gameState]);

  const generateLevel = () => {
      let gridSize = 9; // 3x3
      let shapeSet = easyShapes;

      if (difficulty >= 4) gridSize = 16; // 4x4
      if (difficulty >= 7) gridSize = 25; // 5x5

      if (difficulty >= 3 && difficulty < 6) shapeSet = mediumShapes;
      else if (difficulty >= 6) shapeSet = hardShapes;

      const mainShape = shapeSet[Math.floor(Math.random() * shapeSet.length)];
      let oddShape = shapeSet[Math.floor(Math.random() * shapeSet.length)];
      while(oddShape === mainShape) {
          oddShape = shapeSet[Math.floor(Math.random() * shapeSet.length)];
      }

      const newGrid = Array(gridSize).fill(mainShape);
      const oddIndex = Math.floor(Math.random() * gridSize);
      newGrid[oddIndex] = oddShape;

      setGrid(newGrid);
      setTargetIndex(oddIndex);
      setFeedbackState(null);
      
      // Start Timer for this round
      roundStartTime.current = performance.now();
  };

  const handleSelect = (index: number) => {
      if (feedbackState) return; 

      const endTime = performance.now();
      const rt = endTime - roundStartTime.current; // Milliseconds
      
      const isCorrect = index === targetIndex;
      
      if (isCorrect) {
          sfx.playSuccess();
          reactionTimes.current.push(rt);

          const comboMultiplier = Math.min(5, 1 + Math.floor(combo / 5));
          // Bonus for fast reaction (< 800ms)
          const speedBonus = rt < 800 ? 10 : 0;
          
          setScore(s => s + (15 * difficulty * comboMultiplier) + speedBonus);
          setCorrectCount(prev => prev + 1);
          setCombo(c => c + 1);
          setDifficulty(d => Math.min(10, d + 1));
          setFeedbackState({ index, type: 'correct' });
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          sfx.playError();
          setCombo(1); // Reset Combo
          setDifficulty(d => Math.max(1, d - 1));
          setFeedbackState({ index, type: 'wrong' });
          if (navigator.vibrate) navigator.vibrate(200);
      }

      setTimeout(() => {
          if (isCorrect) generateLevel();
          else setFeedbackState(null);
      }, 300);
  };

  if (gameState === 'finished') {
      const normalizedScore = Math.min(100, Math.round(score / 50)); 
      if (normalizedScore > 50) sfx.playWin();
      
      const avgRT = reactionTimes.current.length > 0 
        ? Math.round(reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length) 
        : 0;

      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center max-w-md w-full animate-scale-in">
                 <div className="text-6xl mb-4">⚡</div>
                 <h2 className="text-2xl font-black text-slate-800 mb-2">رکورد سرعت ثبت شد</h2>
                 <div className="text-5xl font-black text-amber-500 mb-8">{toPersianNum(normalizedScore)}</div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8 px-4">
                     <div className="text-center bg-slate-50 p-2 rounded-xl">
                         <div className="text-xs text-slate-400 font-bold mb-1">تعداد صحیح</div>
                         <div className="text-xl font-bold">{toPersianNum(correctCount)}</div>
                     </div>
                     <div className="text-center bg-slate-50 p-2 rounded-xl">
                         <div className="text-xs text-slate-400 font-bold mb-1">میانگین واکنش</div>
                         <div className="text-xl font-bold text-blue-600">{toPersianNum(avgRT)} <span className="text-xs">ms</span></div>
                     </div>
                 </div>

                 <button onClick={() => onComplete(normalizedScore)} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:scale-105 transition-transform">پایان بازی</button>
             </div>
        </div>
      );
  }

  // Determine Grid Columns
  let gridCols = 'grid-cols-3';
  if (grid.length === 16) gridCols = 'grid-cols-4';
  if (grid.length === 25) gridCols = 'grid-cols-5';

  return (
    <GameShell
        title="سرعت ادراکی (Reaction Time)"
        description="شکل متفاوت را در سریع‌ترین زمان ممکن پیدا کنید. زمان واکنش (RT) شما با دقت میلی‌ثانیه ثبت می‌شود."
        instructions={[
            `یک شبکه از اشکال نمایش داده می‌شود.`,
            `همه شکل‌ها یکسان هستند به جز یکی.`,
            `روی شکل متفاوت کلیک کنید.`,
            `سیستم میانگین زمان واکنش شما را محاسبه می‌کند.`,
        ]}
        icon={<Zap />}
        stats={{ score, timeLeft, level: difficulty, combo }}
        onExit={onExit}
        onRestart={() => {
            setTimeLeft(GAME_DURATION);
            setScore(0);
            setCombo(1);
            setDifficulty(1);
            setGrid([]);
            reactionTimes.current = [];
            setGameState('playing');
        }}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="amber"
    >
        <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-4">
             <h2 className="text-amber-400 font-bold text-lg mb-8 animate-pulse uppercase tracking-widest">شکل متفاوت را پیدا کنید</h2>
             
             <div className={`grid ${gridCols} gap-3 md:gap-4 p-4 max-w-md mx-auto w-full aspect-square transition-all duration-300`}>
                {grid.map((item, idx) => {
                    let tileClass = "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400";
                    if (feedbackState?.index === idx) {
                        if (feedbackState.type === 'correct') tileClass = "bg-emerald-500 border-emerald-400 text-white scale-105 shadow-[0_0_30px_rgba(16,185,129,0.8)] z-20";
                        else tileClass = "bg-red-500 border-red-400 text-white animate-shake z-20";
                    }

                    return (
                        <button 
                            key={idx}
                            onClick={() => handleSelect(idx)}
                            className={`rounded-2xl text-3xl md:text-4xl flex items-center justify-center transition-all duration-100 border-b-4 active:border-b-0 active:translate-y-1 shadow-lg ${tileClass}`}
                        >
                            {item}
                        </button>
                    )
                })}
            </div>
        </div>
    </GameShell>
  );
};

export default SpeedGame;
