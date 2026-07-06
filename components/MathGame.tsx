
import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, Eraser, Timer } from 'lucide-react';
import { toPersianNum } from '../utils';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const INITIAL_TIME = 300; // 5 Minutes Total

const MathGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
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

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (!question.text) generateQuestion(1);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
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
          if (template === 1) {
             const op2 = Math.random() > 0.5 ? '+' : '-';
             qAns = op2 === '+' ? (a * b) + c : (a * b) - c;
             qText = `${a} × ${b} ${op2} ${c}`;
          } else {
             const op1 = Math.random() > 0.5 ? '+' : '-';
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
          const opIn = Math.random() > 0.5 ? '+' : '-';
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
           const c = rand(10, 50);
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
    if (!userAnswer) return;
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
      sfx.playClick();
      if (userAnswer.length < 5) setUserAnswer(prev => prev + num.toString());
  };

  const handleBackspace = () => {
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
  }, [gameState, userAnswer, question]);

  if (gameState === 'finished') {
      const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
      return (
        <GameResultCard 
            title="هوش محاسباتی (A10)"
            rawScore={score}
            scoreKey="A10"
            metrics={[
                { label: 'دقت', value: toPersianNum(accuracy) + '%' },
                { label: 'سطح نهایی', value: toPersianNum(level) },
            ]}
            onRetry={() => {
                setTimeLeft(INITIAL_TIME);
                setScore(0);
                setLevel(1);
                setStreak(0);
                setTotalQuestions(0);
                setCorrectQuestions(0);
                generateQuestion(1);
                setGameState('playing');
            }}
            onComplete={() => onComplete(score)}
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
        icon={<Calculator />}
        stats={{ score, timeLeft, level, combo: streak }}
        onExit={onExit}
        onRestart={() => {
            setTimeLeft(INITIAL_TIME);
            setScore(0);
            setLevel(1);
            setStreak(0);
            generateQuestion(1);
            setGameState('playing');
        }}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="blue"
    >
        <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-4 relative">
             <div className="w-full max-w-md mb-8">
                 <div className="bg-white rounded-3xl p-8 shadow-2xl border-b-8 border-slate-300 flex items-center justify-center min-h-[140px]" dir="ltr">
                    <span className="text-4xl md:text-6xl font-black text-slate-800 font-mono">
                        {toPersianNum(question.text)}
                    </span>
                 </div>
             </div>

             <div className={`w-full max-w-md h-20 bg-slate-800 rounded-2xl mb-6 flex items-center justify-center border-2 transition-colors ${feedback === 'correct' ? 'border-emerald-500' : feedback === 'wrong' ? 'border-red-500' : 'border-slate-700'}`} dir="ltr">
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
