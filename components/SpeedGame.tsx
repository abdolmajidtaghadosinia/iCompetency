
import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { toPersianNum } from '../utils';
import GameShell, { GameState, PracticeBanner } from './GameShell';
import GameResultCard from './GameResultCard';
import { cleanReactionTimes, median } from '../utils/scoring';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  // payload carries the gamification-free construct measure (cognitiveRaw) and
  // audit metadata; the on-screen `score` stays gamified for XP/feedback.
  onComplete: (score: number, payload?: Record<string, unknown>) => void;
}

const GAME_DURATION = 35;
const PRACTICE_ROUNDS = 2;

const SpeedGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [combo, setCombo] = useState(1);
  const [grid, setGrid] = useState<string[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [feedbackState, setFeedbackState] = useState<{index: number, type: 'correct' | 'wrong'} | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Scored attempts (correct + wrong), for the accuracy term of the construct measure.
  const [attempts, setAttempts] = useState(0);
  // Unscored warm-up rounds on the first run; the clock waits for them.
  const [practiceLeft, setPracticeLeft] = useState(PRACTICE_ROUNDS);
  
  // High Precision Timing
  const roundStartTime = useRef<number>(0);
  const reactionTimes = useRef<number[]>([]);

  const easyShapes = ['★', '●', '■', '▲', '◆', '▼'];
  const mediumShapes = ['O', 'Q', '0', 'C', 'G']; 
  const hardShapes = ['6', '9', '8', 'B', 'P', 'R'];

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Generate the first grid; after a pause, restart the current trial's RT
    // clock so time spent in the pause menu isn't scored as reaction time.
    if (grid.length === 0) generateLevel(difficulty);
    else roundStartTime.current = performance.now();

    if (practiceLeft > 0) return; // clock frozen during practice

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
  }, [gameState, practiceLeft]);

  // Difficulty is passed in: the next grid is generated from a timeout right
  // after setDifficulty(), where the closed-over state is still the old value.
  const generateLevel = (difficulty: number) => {
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

      // Practice rounds: feedback only, nothing recorded.
      if (practiceLeft > 0) {
          if (isCorrect) sfx.playSuccess(); else sfx.playError();
          setFeedbackState({ index, type: isCorrect ? 'correct' : 'wrong' });
          setPracticeLeft(p => p - 1);
          setTimeout(() => generateLevel(difficulty), 300);
          return;
      }

      setAttempts(a => a + 1);
      const nextDifficulty = isCorrect ? Math.min(10, difficulty + 1) : Math.max(1, difficulty - 1);

      if (isCorrect) {
          sfx.playSuccess();
          reactionTimes.current.push(rt);

          const comboMultiplier = Math.min(5, 1 + Math.floor(combo / 5));
          // Bonus for fast reaction (< 800ms)
          const speedBonus = rt < 800 ? 10 : 0;

          setScore(s => s + (15 * difficulty * comboMultiplier) + speedBonus);
          setCorrectCount(prev => prev + 1);
          setCombo(c => c + 1);
          setDifficulty(nextDifficulty);
          setFeedbackState({ index, type: 'correct' });
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          sfx.playError();
          setScore(s => Math.max(0, s - (10 * difficulty))); // Guessing costs points
          setCombo(1); // Reset Combo
          setDifficulty(nextDifficulty);
          setFeedbackState({ index, type: 'wrong' });
          if (navigator.vibrate) navigator.vibrate(200);
      }

      // Always move to a fresh grid: staying on the same one after an error
      // let players scan through the remaining tiles risk-free.
      setTimeout(() => generateLevel(nextDifficulty), 300);
  };

  const resetRun = () => {
      setTimeLeft(GAME_DURATION);
      setScore(0);
      setCombo(1);
      setDifficulty(1);
      setCorrectCount(0);
      setAttempts(0);
      setGrid([]);
      setFeedbackState(null);
      setPracticeLeft(0); // restarts/retries skip the warm-up
      reactionTimes.current = [];
      setGameState('playing');
  };

  if (gameState === 'finished') {
      const normalizedScore = Math.min(100, Math.round(score / 50));

      // Trimmed median: robust to one anticipation or attention lapse.
      const medRT = Math.round(median(cleanReactionTimes(reactionTimes.current, 200, 10000)));

      // Gamification-free construct measure on a 0-100 scale: the theoretical
      // correct-responses-per-minute implied by the median RT (this is the RT
      // data the old combo-based score threw away), scaled by accuracy.
      const accuracyFrac = attempts > 0 ? correctCount / attempts : 0;
      const throughput = medRT > 0 ? 60000 / medRT : 0;
      const cognitiveRaw = Math.max(0, Math.min(100, Math.round(throughput * accuracyFrac)));

      return (
        <GameResultCard
            title="سرعت ادراکی (A11)"
            rawScore={cognitiveRaw}
            scoreKey="A11"
            metrics={[
                { label: 'تعداد صحیح', value: toPersianNum(correctCount) },
                { label: 'میانه واکنش', value: medRT > 0 ? toPersianNum(medRT) + ' ms' : '—' },
            ]}
            onRetry={resetRun}
            onComplete={() => onComplete(normalizedScore, { cognitiveRaw, durationMs: GAME_DURATION * 1000, trialCount: attempts })}
        />
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
            `${toPersianNum(PRACTICE_ROUNDS)} دور اول تمرینی است؛ سپس ${toPersianNum(GAME_DURATION)} ثانیه زمان دارید.`,
            `پاسخ اشتباه امتیاز کم می‌کند؛ میانه زمان واکنش شما ثبت می‌شود.`,
        ]}
        icon={<Zap />}
        stats={{ score, timeLeft, level: difficulty, combo }}
        onExit={onExit}
        onRestart={resetRun}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="amber"
        tone="dark"
    >
        <div className="h-full w-full flex flex-col items-center justify-center p-2">
             {practiceLeft > 0 && <div className="mb-4"><PracticeBanner left={practiceLeft} /></div>}
             <h2 className="text-amber-400 font-bold text-lg mb-6 tracking-widest">شکل متفاوت را پیدا کنید</h2>
             
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
