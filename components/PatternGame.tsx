
import React, { useState, useEffect } from 'react';
import { Grid, HelpCircle } from 'lucide-react';
import { toPersianNum } from '../utils';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const PatternGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [matrix, setMatrix] = useState<(number | null)[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [feedback, setFeedback] = useState<{ idx: number; isCorrect: boolean } | null>(null);
  const [patternType, setPatternType] = useState("");

  useEffect(() => {
    if (gameState === 'playing' && matrix.length === 0) generateRound();
  }, [gameState, matrix]);

  const generateRound = () => {
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

    let debugType = "";

    if (type === 0) {
        // Linear: Row logic + Col logic
        debugType = "Linear (Arithmetic)";
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
        debugType = "Cross Multiplication";
        const factor = Math.floor(Math.random() * 3) + 1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                newMatrix[r * size + c] = (r + 1) * (c + 1) * factor;
            }
        }
    } else if (type === 2) {
        // Alternating Rows: Even Rows (+x), Odd Rows (-y) or (*z)
        debugType = "Alternating Rows";
        const start = 20;
        for (let r = 0; r < size; r++) {
            let rowVal = start + (r * 5);
            for (let c = 0; c < size; c++) {
                if (r % 2 === 0) {
                    newMatrix[r * size + c] = rowVal + (c * 2); // Add 2
                } else {
                    newMatrix[r * size + c] = rowVal - (c * 3); // Subtract 3
                }
            }
        }
    } else if (type === 3) {
        // Fibonacci-ish sequence running through the matrix (Row by Row)
        debugType = "Sequence (Fibonacci-like)";
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
        debugType = "Snake Path";
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

    setPatternType(debugType);

    const missingIdx = Math.floor(Math.random() * 16);
    const ans = newMatrix[missingIdx];
    newMatrix[missingIdx] = null;

    setCorrectAnswer(ans!);
    setMatrix(newMatrix);

    // Generate Options
    const opts = new Set([ans!]);
    while(opts.size < 4) {
        // Smart distractors based on pattern type
        const noise = Math.floor(Math.random() * 10) - 5;
        const val = ans! + (noise === 0 ? 1 : noise);
        opts.add(val);
    }
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
  };

  const handleSelect = (val: number, idx: number) => {
    const isCorrect = val === correctAnswer;
    setFeedback({ idx, isCorrect });

    if (isCorrect) {
        sfx.playSuccess();
        setScore(s => s + (10 * level));
        setLevel(l => l + 1);
        setTimeout(() => {
            setFeedback(null);
            generateRound();
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
              onRetry={() => { setScore(0); setLevel(1); setLives(3); setMatrix([]); setFeedback(null); setGameState('playing'); }}
              onComplete={() => onComplete(normalizedScore)}
          />
      )
  }

  return (
    <GameShell
        title="استدلال سیال (A10+)"
        description="روابط پنهان اعداد را کشف کنید. الگوها ممکن است خطی، ضربدری، یا دنباله‌دار باشند."
        instructions={["جدول را بررسی کنید.", "نوع رابطه (سطری، ستونی یا مارپیچ) را بیابید.", "عدد گم شده را انتخاب کنید."]}
        icon={<Grid />}
        stats={{ score, level, lives, maxLives: 3 }}
        onExit={onExit}
        onRestart={() => { setScore(0); setLevel(1); setLives(3); setGameState('playing'); generateRound(); }}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="indigo"
    >
        <div className="h-full flex flex-col items-center justify-center w-full max-w-lg">
            
            {/* Pattern Type Hint (Optional, helps learning) */}
            {/* <div className="mb-4 text-xs font-mono text-indigo-300 opacity-50">{patternType}</div> */}

            <div className="grid grid-cols-4 gap-2 md:gap-3 bg-white/10 p-4 rounded-2xl mb-8 shadow-xl">
                {matrix.map((val, i) => (
                    <div key={i} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-xl text-xl font-bold ${val === null ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-800 text-indigo-100'}`}>
                        {val === null ? '?' : toPersianNum(val)}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-4 gap-4 w-full">
                {options.map((opt, i) => {
                    let style = "bg-white text-slate-800 hover:bg-indigo-50";
                    if (feedback && feedback.idx === i) {
                        style = feedback.isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white";
                    }
                    return (
                        <button key={i} onClick={() => handleSelect(opt, i)} disabled={!!feedback} className={`py-4 rounded-xl font-black text-xl shadow-lg transition-all ${style}`}>
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
