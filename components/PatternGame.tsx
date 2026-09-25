
import React, { useState, useEffect } from 'react';
import { Grid } from 'lucide-react';
import { toPersianNum } from '../utils';
import GameShell, { GameState } from './GameShell';
import GameResultCard from './GameResultCard';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const PatternGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [matrix, setMatrix] = useState<(number | null)[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [feedback, setFeedback] = useState<{ idx: number; isCorrect: boolean } | null>(null);

  useEffect(() => {
    if (gameState === 'playing' && matrix.length === 0) generateRound(level);
  }, [gameState, matrix]);

  // The level is passed in explicitly: rounds are generated from a timeout
  // right after setLevel(), where the closed-over `level` is still the old
  // value (every round used to lag one level behind, and a restart kept
  // generating at the previous run's level).
  const generateRound = (level: number) => {
    const size = 4;
    const newMatrix = new Array(size * size).fill(0);
    
    // Choose Pattern Logic based on Level
    // Levels 1-2: Linear
    // Levels 3-4: Cross Math
    // Levels 5-6: Alternating
    // Levels 7+: Fibonacci / Spiral
    let type = 0; // 0: Linear, 1: Cross, 2: Alternating, 3: Fibonacci, 4: Spiral
    
    if (level <= 2) type = 0;
    else if (level <= 4) type = 1;
    else if (level <= 6) type = 2;
    else type = Math.random() > 0.5 ? 3 : 4;

    if (type === 0) {
        // Linear: Row logic + Col logic
        const start = Math.floor(Math.random() * 10) + 1;
        const rowStep = Math.floor(Math.random() * 5) + 1;
        const colStep = Math.floor(Math.random() * 5) + 1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                newMatrix[r * size + c] = start + (r * rowStep) + (c * colStep);
            }
        }
    } else if (type === 1) {
        // Cross Math: val = (r+1) * (c+1) * factor
        const factor = Math.floor(Math.random() * 3) + 1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                newMatrix[r * size + c] = (r + 1) * (c + 1) * factor;
            }
        }
    } else if (type === 2) {
        // Alternating Rows: even rows count up, odd rows count down. The
        // start and both steps are randomized (they used to be constants, so
        // every round at levels 5-6 showed the identical grid).
        const start = Math.floor(Math.random() * 11) + 20;
        const rowStep = Math.floor(Math.random() * 4) + 3;
        const up = Math.floor(Math.random() * 3) + 2;
        const down = Math.floor(Math.random() * 3) + 2;
        for (let r = 0; r < size; r++) {
            const rowVal = start + (r * rowStep);
            for (let c = 0; c < size; c++) {
                newMatrix[r * size + c] = r % 2 === 0 ? rowVal + (c * up) : rowVal - (c * down);
            }
        }
    } else if (type === 3) {
        // Fibonacci-ish sequence running through the matrix (Row by Row)
        let a = 1, b = 1;
        const startOffset = Math.floor(Math.random() * 5);
        // Advance offset
        for(let k=0; k<startOffset; k++) { let temp = a+b; a=b; b=temp; }
        
        for (let i = 0; i < size * size; i++) {
            newMatrix[i] = a;
            let next = a + b;
            a = b;
            b = next;
        }
    } else {
        // Spiral / Snake: 1 2 3 4 -> 8 7 6 5 -> 9 10...
        let counter = Math.floor(Math.random() * 10) + 1;
        const step = Math.floor(Math.random() * 3) + 1;
        
        for (let r = 0; r < size; r++) {
            if (r % 2 === 0) {
                for (let c = 0; c < size; c++) {
                    newMatrix[r * size + c] = counter;
                    counter += step;
                }
            } else {
                for (let c = size - 1; c >= 0; c--) {
                    newMatrix[r * size + c] = counter;
                    counter += step;
                }
            }
        }
    }

    const missingIdx = Math.floor(Math.random() * 16);
    const ans = newMatrix[missingIdx];
    newMatrix[missingIdx] = null;

    setCorrectAnswer(ans!);
    setMatrix(newMatrix);

    // Near-miss distractors (±1..5), never negative: a negative option next
    // to an all-positive grid was an obvious giveaway.
    const opts = new Set([ans!]);
    while(opts.size < 4) {
        const noise = Math.floor(Math.random() * 5) + 1;
        const val = ans! + (Math.random() < 0.5 ? -noise : noise);
        if (val > 0) opts.add(val);
    }
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
  };

  const handleSelect = (val: number, idx: number) => {
    if (feedback || gameState !== 'playing') return;
    const isCorrect = val === correctAnswer;
    setFeedback({ idx, isCorrect });

    if (isCorrect) {
        sfx.playSuccess();
        const nextLevel = level + 1;
        setScore(s => s + (10 * level));
        setLevel(nextLevel);
        setTimeout(() => {
            setFeedback(null);
            generateRound(nextLevel);
        }, 1000);
    } else {
        sfx.playError();
        setLives(l => l - 1);
        if (lives <= 1) {
            setTimeout(() => setGameState('finished'), 1000);
        } else {
            setTimeout(() => setFeedback(null), 500);
        }
    }
  };

  // Keyboard: 1-4 pick the matching option.
  useEffect(() => {
    if (gameState !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = parseInt(e.key, 10);
      if (k >= 1 && k <= options.length) handleSelect(options[k - 1], k - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, options, feedback, correctAnswer, level, lives]);

  const resetRun = () => {
    setScore(0); setLevel(1); setLives(3); setFeedback(null); setMatrix([]);
    setGameState('playing');
  };

  if (gameState === 'finished') {
      // The cumulative 10*level score passes 550 after ~10 solved rounds while
      // the A10Plus norm is mean 50 / sd 20 - normalize to 0-100 so the
      // T-score can actually discriminate instead of clamping at 80.
      const normalizedScore = Math.min(100, Math.round(score / 5));
      return (
          <GameResultCard
              title="تطابق الگو (A10+)"
              rawScore={normalizedScore}
              scoreKey="A10Plus"
              metrics={[
                  { label: 'سطح نهایی', value: toPersianNum(level) },
                  { label: 'امتیاز خام', value: toPersianNum(score) },
              ]}
              onRetry={resetRun}
              onComplete={() => onComplete(normalizedScore)}
          />
      )
  }

  return (
    <GameShell
        title="استدلال سیال (A10+)"
        description="روابط پنهان اعداد را کشف کنید. الگوها ممکن است خطی، ضربدری، یا دنباله‌دار باشند."
        instructions={[
            "جدول ۴×۴ را بررسی کنید؛ یک خانه خالی است.",
            "نوع رابطه (سطری، ستونی، ضربی، دنباله یا مارپیچ) را بیابید.",
            "عدد گم‌شده را انتخاب کنید. سه پاسخ اشتباه یعنی پایان آزمون.",
        ]}
        keyboardHint="کلیدهای ۱ تا ۴ گزینه‌ها را انتخاب می‌کنند."
        icon={<Grid />}
        stats={{ score, level, lives, maxLives: 3 }}
        onExit={onExit}
        onRestart={resetRun}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="indigo"
        tone="dark"
    >
        <div className="h-full w-full flex flex-col items-center justify-center">
            <div className="grid grid-cols-4 gap-2 md:gap-3 bg-slate-900 border border-slate-800 p-3 md:p-4 rounded-3xl mb-8 shadow-2xl">
                {matrix.map((val, i) => (
                    <div key={i} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-xl text-lg md:text-xl font-bold tabular-nums ${val === null ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/60 animate-pulse' : 'bg-slate-800 text-indigo-100'}`}>
                        {val === null ? '?' : toPersianNum(val)}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-4 gap-3 md:gap-4 w-full max-w-lg">
                {options.map((opt, i) => {
                    let style = "bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:border-indigo-500/60";
                    if (feedback && feedback.idx === i) {
                        style = feedback.isCorrect ? "bg-emerald-500 border-emerald-400 text-white" : "bg-red-500 border-red-400 text-white animate-shake";
                    }
                    return (
                        <button key={i} onClick={() => handleSelect(opt, i)} disabled={!!feedback} className={`relative py-4 rounded-2xl border-2 font-black text-xl shadow-lg transition-all active:scale-95 ${style}`}>
                            <span className="absolute top-1 left-2 text-[10px] font-bold opacity-40">{toPersianNum(i + 1)}</span>
                            {toPersianNum(opt)}
                        </button>
                    )
                })}
            </div>
        </div>
    </GameShell>
  );
};

export default PatternGame;
