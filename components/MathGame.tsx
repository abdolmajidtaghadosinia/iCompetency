
import React, { useState, useEffect, useRef } from 'react';
import { Calculator, CheckCircle2, Eraser } from 'lucide-react';
import { toPersianNum } from '../utils';
import GameShell, { GameState } from './GameShell';
import GameResultCard from './GameResultCard';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  // payload carries the gamification-free construct measure (cognitiveRaw) and
  // audit metadata; the on-screen `score` stays gamified for XP/feedback.
  onComplete: (score: number, payload?: Record<string, unknown>) => void;
}

const INITIAL_TIME = 300; // 5 Minutes Total

const MathGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState({ text: '', answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  
  // New Stats for v2.0
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctQuestions, setCorrectQuestions] = useState(0);

  // Construct-measure bookkeeping (kept out of the gamified score). The clean
  // A10 measure is weighted-correct-per-active-minute × accuracy, so it ignores
  // the streak multiplier and the fact that correct answers extend the clock.
  // Active time is counted in clock ticks, which only run while playing, so
  // time spent in the pause menu no longer dilutes the throughput.
  const activeMsRef = useRef(0);
  const correctWeightRef = useRef(0);

  const resetMeasures = () => {
    activeMsRef.current = 0;
    correctWeightRef.current = 0;
  };

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (!question.text) generateQuestion(1);
    else setQuestionStartTime(Date.now()); // resume: don't bill the pause to this question

    const timer = setInterval(() => {
      activeMsRef.current += 1000;
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generateQuestion = (currentLevel: number) => {
    let qText = '';
    let qAns = 0;

    switch(currentLevel) {
      case 1: case 2:
        {
          const max = currentLevel === 1 ? 20 : 50;
          const op = Math.random() > 0.5 ? '+' : '-';
          const a = rand(5, max);
          const b = rand(1, op === '-' ? a : max);
          qAns = op === '+' ? a + b : a - b;
          qText = `${a} ${op} ${b}`;
        }
        break;
      case 3: case 4:
        {
          const isMul = Math.random() > 0.5;
          const max = currentLevel === 3 ? 10 : 15;
          if (isMul) {
            const a = rand(2, max);
            const b = rand(2, 9);
            qAns = a * b;
            qText = `${a} × ${b}`;
          } else {
            const b = rand(2, 9);
            const ans = rand(2, max);
            const a = b * ans;
            qAns = ans;
            qText = `${a} ÷ ${b}`;
          }
        }
        break;
      case 5: case 6:
        {
          const a = rand(2, 20);
          const b = rand(2, 10);
          const c = rand(2, 10);
          const template = rand(1, 3);
          // Subtraction only when the result stays non-negative: the keypad
          // has no minus key, so a negative answer was unanswerable.
          if (template === 1) {
             const op2 = Math.random() > 0.5 && a * b >= c ? '-' : '+';
             qAns = op2 === '+' ? (a * b) + c : (a * b) - c;
             qText = `${a} × ${b} ${op2} ${c}`;
          } else {
             const op1 = Math.random() > 0.5 && a >= b * c ? '-' : '+';
             qAns = op1 === '+' ? a + (b * c) : a - (b * c);
             qText = `${a} ${op1} ${b} × ${c}`;
          }
        }
        break;
      case 7: case 8: 
        {
          const a = rand(5, 20);
          const b = rand(2, 10);
          const c = rand(2, 5);
          const opIn = Math.random() > 0.5 && a >= b ? '-' : '+';
          qAns = (opIn === '+' ? a + b : a - b) * c;
          qText = `(${a} ${opIn} ${b}) × ${c}`;
        }
        break;
      case 9:
        {
          const p = [10, 20, 25, 50][rand(0, 3)];
          const base = rand(2, 20) * 10;
          qAns = (base * p) / 100;
          qText = `${p}٪ از ${base}`;
        }
        break;
      default:
        {
           const a = rand(5, 15);
           const b = rand(5, 15);
           const c = rand(10, Math.min(50, a * b));
           qAns = (a * b) - c;
           qText = `${a} × ${b} - ${c}`;
        }
        break;
    }

    setQuestion({ text: qText, answer: Math.floor(qAns) });
    setUserAnswer('');
    setQuestionStartTime(Date.now());
  };

  const handleSubmit = () => {
    // Ignore input during the 400ms feedback flash: a second Enter used to be
    // scored again against the same question.
    if (!userAnswer || feedback) return;
    const val = parseInt(userAnswer);
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    
    setTotalQuestions(t => t + 1);

    if (val === question.answer) {
      sfx.playSuccess();
      setFeedback('correct');
      setCorrectQuestions(c => c + 1);
      
      const timeBonus = 3; 
      setTimeLeft(t => t + timeBonus);
      
      // V2.0 Formula: Base * SpeedMultiplier * ComboMultiplier
      const baseScore = level * 15;
      
      // Speed Bonus: If answered in under 3 seconds (approx 50% of expected time for expert)
      const speedMultiplier = timeTaken < 3.0 ? 1.5 : 1.0;
      
      // Combo Bonus: 1 + (Streak * 0.1)
      const comboMultiplier = 1 + (streak * 0.1);
      
      const points = Math.round(baseScore * speedMultiplier * comboMultiplier);
      setScore(s => s + points);
      // Weight each correct answer by the level it was solved at, for the
      // construct measure — harder problems count more, independent of combo.
      correctWeightRef.current += level;

      setStreak(s => s + 1);
      
      let nextLevel = level;
      if (streak > 0 && streak % 2 === 0) {
         nextLevel = Math.min(10, level + 1);
         setLevel(nextLevel);
      }

      setTimeout(() => {
        setFeedback(null);
        generateQuestion(nextLevel);
      }, 400);
    } else {
      sfx.playError();
      setFeedback('wrong');
      setTimeLeft(t => Math.max(0, t - 2)); // V2.0 Penalty: -2s
      setStreak(0);
      const nextLevel = Math.max(1, level - 1);
      setLevel(nextLevel);

      setTimeout(() => {
        setFeedback(null);
        generateQuestion(nextLevel);
      }, 400);
    }
  };

  const handleNumpad = (num: number) => {
      if (feedback) return;
      sfx.playClick();
      if (userAnswer.length < 5) setUserAnswer(prev => prev + num.toString());
  };

  const handleBackspace = () => {
      if (feedback) return;
      sfx.playClick();
      setUserAnswer(prev => prev.slice(0, -1));
  };

  // Keyboard Support
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (/^[0-9]$/.test(e.key)) {
        handleNumpad(parseInt(e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, userAnswer, question, feedback]);

  const resetRun = () => {
      setTimeLeft(INITIAL_TIME);
      setScore(0);
      setLevel(1);
      setStreak(0);
      setTotalQuestions(0);
      setCorrectQuestions(0);
      setFeedback(null);
      resetMeasures();
      generateQuestion(1);
      setGameState('playing');
  };

  if (gameState === 'finished') {
      const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

      // Gamification-free construct measure: weighted-correct per active
      // minute, scaled by accuracy, on a 0-100 scale. Uses real elapsed play
      // time so the clock-extending time bonus can't inflate it.
      const elapsedMs = activeMsRef.current;
      const elapsedMin = elapsedMs > 0 ? elapsedMs / 60000 : INITIAL_TIME / 60;
      const accuracyFrac = totalQuestions > 0 ? correctQuestions / totalQuestions : 0;
      const cognitiveRaw = Math.max(0, Math.min(100, Math.round((correctWeightRef.current / elapsedMin) * accuracyFrac)));

      return (
        <GameResultCard
            title="هوش محاسباتی (A10)"
            rawScore={cognitiveRaw}
            scoreKey="A10"
            metrics={[
                { label: 'دقت', value: toPersianNum(accuracy) + '%' },
                { label: 'سطح نهایی', value: toPersianNum(level) },
            ]}
            onRetry={resetRun}
            onComplete={() => onComplete(score, { cognitiveRaw, durationMs: elapsedMs, trialCount: totalQuestions })}
        />
      );
  }

  return (
    <GameShell
        title="هوش محاسباتی (A10)"
        description="محاسبات را با بیشترین سرعت و دقت انجام دهید."
        instructions={[
            "معادله را حل کنید و پاسخ را تایپ کنید.",
            "پاسخ صحیح زمان می‌خرد، پاسخ غلط زمان کم می‌کند.",
            "پاسخ‌های سریع (زیر ۳ ثانیه) امتیاز ۱.۵ برابر دارند."
        ]}
        keyboardHint="اعداد را تایپ کنید؛ Enter برای ثبت و Backspace برای پاک کردن."
        icon={<Calculator />}
        stats={{ score, timeLeft, level, combo: streak }}
        onExit={onExit}
        onRestart={resetRun}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="blue"
        tone="dark"
    >
        <div className="h-full w-full flex flex-col items-center justify-center p-2 relative overflow-y-auto">
             <div className="w-full max-w-md mb-6">
                 <div className="bg-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl border-b-8 border-slate-950 flex items-center justify-center min-h-[120px] md:min-h-[140px]" dir="ltr">
                    <span className="text-4xl md:text-6xl font-black text-white font-mono tabular-nums">
                        {toPersianNum(question.text)}
                    </span>
                 </div>
             </div>

             <div className={`w-full max-w-md h-20 bg-slate-900 rounded-2xl mb-6 flex items-center justify-center border-2 transition-colors ${feedback === 'correct' ? 'border-emerald-500' : feedback === 'wrong' ? 'border-red-500' : 'border-slate-700'}`} dir="ltr">
                 <span className={`text-4xl font-mono font-bold tracking-widest ${feedback === 'correct' ? 'text-emerald-400' : feedback === 'wrong' ? 'text-red-400' : 'text-white'}`}>
                     {userAnswer ? toPersianNum(userAnswer) : '_'}
                 </span>
             </div>

             <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                    <button key={num} onClick={() => handleNumpad(num)} className="h-16 bg-slate-700 rounded-xl text-2xl font-bold text-white shadow-md active:translate-y-1">{toPersianNum(num)}</button>
                ))}
                <button onClick={handleBackspace} aria-label="پاک کردن" className="h-16 bg-red-500/20 rounded-xl text-red-400 flex items-center justify-center border border-red-500/30 active:translate-y-1 transition-transform"><Eraser /></button>
                <button onClick={() => handleNumpad(0)} className="h-16 bg-slate-700 rounded-xl text-2xl font-bold text-white active:translate-y-1 transition-transform">{toPersianNum(0)}</button>
                <button onClick={handleSubmit} aria-label="تایید پاسخ" className="h-16 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-lg active:translate-y-1 transition-transform"><CheckCircle2 /></button>
            </div>
        </div>
    </GameShell>
  );
};

export default MathGame;
