
import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Calculator, Palette, Check, X } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';
import { cleanReactionTimes, median } from '../utils/scoring';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const GAME_DURATION = 40;
const PRACTICE_ROUNDS = 2;

// Per-round response deadline, shrinking with difficulty. Without it both
// tasks could be answered serially at leisure (only the global clock ran),
// which defeats the point of a simultaneous dual-task measure.
const roundDeadlineMs = (difficulty: number) => Math.max(4000, 8000 - difficulty * 400);

const COLORS = [
  { name: 'قرمز', hex: '#ef4444' },
  { name: 'آبی', hex: '#3b82f6' },
  { name: 'سبز', hex: '#22c55e' },
];

const MultitaskGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  // Unscored warm-up rounds on the first run; the clock waits for them.
  const [practiceLeft, setPracticeLeft] = useState(PRACTICE_ROUNDS);

  // Task 1: Math (Even/Odd)
  const [number, setNumber] = useState(0);
  const [mathAnswer, setMathAnswer] = useState<boolean | null>(null);

  // Task 2: Color Matching
  const [colorText, setColorText] = useState('قرمز');
  const [colorHex, setColorHex] = useState('#ef4444');
  const [colorAnswer, setColorAnswer] = useState<boolean | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Round-deadline bookkeeping. `now` ticks every 100ms while playing so the
  // deadline bar stays live even during practice (when the global clock is frozen).
  const [roundKey, setRoundKey] = useState(0);
  const [now, setNow] = useState(0);
  const roundStartRef = useRef(0);
  const roundDoneRef = useRef(false);
  const roundTimes = useRef<number[]>([]);

  // Kick off the first round once GameShell's intro flips us to 'playing'.
  // Also regenerates after a pause: letting a paused round survive would let
  // players stop the clock mid-round to think, so resume starts a fresh round.
  useEffect(() => {
    if (gameState === 'playing') generateTasks();
  }, [gameState]);

  // Global assessment clock (frozen during practice).
  useEffect(() => {
    if (gameState !== 'playing' || practiceLeft > 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) {
          clearInterval(timer);
          setGameState('finished');
          return 0;
        }
        return t - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [gameState, practiceLeft]);

  // 100ms tick for the round-deadline bar.
  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(t);
  }, [gameState]);

  // Round deadline: an unanswered round counts as a failed attempt (except in practice).
  useEffect(() => {
    if (gameState !== 'playing') return;

    const t = setTimeout(() => {
      if (roundDoneRef.current) return;
      if (practiceLeft > 0) {
        setPracticeLeft(p => p - 1);
        generateTasks();
        return;
      }
      sfx.playError();
      setAttempts(prev => prev + 1);
      setScore(s => Math.max(0, s - (5 * difficulty)));
      setDifficulty(d => Math.max(1, d - 1));
      if (navigator.vibrate) navigator.vibrate(200);
      generateTasks();
    }, roundDeadlineMs(difficulty));

    return () => clearTimeout(t);
  }, [roundKey, gameState]);

  // Keyboard: left hand answers math (A=yes, S=no), right hand answers color (arrows).
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' && mathAnswer === null) handleMathInput(true);
      if (key === 's' && mathAnswer === null) handleMathInput(false);
      if (e.key === 'ArrowLeft' && colorAnswer === null) handleColorInput(true);
      if (e.key === 'ArrowRight' && colorAnswer === null) handleColorInput(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, mathAnswer, colorAnswer]);

  // Round completes when both tasks are answered.
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

    const textIdx = Math.floor(Math.random() * COLORS.length);
    const hexIdx = Math.random() > 0.5 ? textIdx : Math.floor(Math.random() * COLORS.length);
    setColorText(COLORS[textIdx].name);
    setColorHex(COLORS[hexIdx].hex);

    roundDoneRef.current = false;
    roundStartRef.current = performance.now();
    setRoundKey(k => k + 1);
  };

  const handleMathInput = (isEven: boolean) => setMathAnswer(isEven);
  const handleColorInput = (isMatch: boolean) => setColorAnswer(isMatch);

  const evaluateRound = () => {
    roundDoneRef.current = true; // stop the round-deadline timer from double-counting
    const roundTime = performance.now() - roundStartRef.current;

    const correctEven = (number % 2 === 0);
    const mathCorrect = mathAnswer === correctEven;
    const matchColor = COLORS.find(c => c.name === colorText);
    const correctMatch = matchColor?.hex === colorHex;
    const colorCorrect = colorAnswer === correctMatch;
    const bothCorrect = mathCorrect && colorCorrect;

    // Practice rounds: feedback only, nothing recorded.
    if (practiceLeft > 0) {
      if (bothCorrect) sfx.playSuccess(); else sfx.playError();
      setPracticeLeft(p => p - 1);
      setTimeout(generateTasks, 200);
      return;
    }

    setAttempts(prev => prev + 1);

    if (bothCorrect) {
      sfx.playSuccess();
      roundTimes.current.push(roundTime);
      setScore(s => s + (10 * difficulty));
      setCorrectCount(prev => prev + 1);
      setDifficulty(d => Math.min(10, d + 1));
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      sfx.playError();
      setScore(s => Math.max(0, s - (5 * difficulty)));
      setDifficulty(d => Math.max(1, d - 1));
      if (navigator.vibrate) navigator.vibrate(200);
    }

    setTimeout(generateTasks, 200);
  };

  const resetRun = () => {
    setScore(0);
    setDifficulty(1);
    setAttempts(0);
    setCorrectCount(0);
    setTimeLeft(GAME_DURATION);
    setPracticeLeft(0); // restarts/retries skip the warm-up
    roundTimes.current = [];
  };

  if (gameState === 'finished') {
    const accuracy = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 0;
    const normalizedScore = Math.min(100, Math.round(score / 30));
    const medRT = Math.round(median(cleanReactionTimes(roundTimes.current, 200, 10000)));

    return (
      <GameResultCard
        title="مدیریت همزمان (A15)"
        rawScore={normalizedScore}
        scoreKey="A15"
        metrics={[
          { label: 'دقت', value: toPersianNum(accuracy) + '٪' },
          { label: 'میانه زمان هر دور', value: medRT > 0 ? toPersianNum(medRT) + ' ms' : '—' },
          { label: 'سطح نهایی', value: toPersianNum(difficulty) },
          { label: 'دورهای صحیح', value: toPersianNum(correctCount) },
        ]}
        onRetry={() => {
          resetRun();
          setGameState('playing');
        }}
        onComplete={() => onComplete(normalizedScore)}
      />
    );
  }

  const roundRemaining = roundStartRef.current > 0
    ? Math.max(0, 1 - (now - roundStartRef.current) / roundDeadlineMs(difficulty))
    : 1;

  return (
    <GameShell
      title="مدیریت همزمان (A15)"
      description="تفکیک نیمکره‌ها! دو کار را همزمان انجام دهید: سمت چپ زوج/فرد بودن عدد، سمت راست تطابق رنگ و متن. هر دور یک مهلت کوتاه دارد."
      instructions={[
        'کار اول: اگر عدد زوج است «بله» (کلید A)، اگر فرد است «خیر» (کلید S).',
        'کار دوم: اگر رنگِ نوشته با معنی آن یکی است «بله» (فلش چپ)، وگرنه «خیر» (فلش راست).',
        'هر دور فقط وقتی امتیاز می‌گیرد که هر دو پاسخ درست باشند.',
        `مهلت هر دور محدود است و ${toPersianNum(GAME_DURATION)} ثانیه کل آزمون است.`,
      ]}
      icon={<LayoutGrid />}
      stats={{ score, timeLeft, level: difficulty }}
      onExit={onExit}
      onRestart={() => {
        resetRun();
        setGameState('playing');
      }}
      gameState={gameState}
      setGameState={setGameState}
      colorTheme="purple"
    >
      <div className="h-full w-full bg-slate-950 text-white flex flex-col p-2 rounded-3xl overflow-hidden">
        {practiceLeft > 0 && (
          <div className="flex justify-center pt-2">
            <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 px-5 py-2 rounded-full text-sm font-black animate-pulse">
              دور تمرینی ({toPersianNum(practiceLeft)} مانده) — امتیاز و زمان ثبت نمی‌شود
            </div>
          </div>
        )}

        {/* Round Deadline Line */}
        <div className="w-full flex items-center gap-2 my-3 px-2">
          <span className="text-[9px] font-bold text-amber-500/80 uppercase shrink-0">مهلت این دور</span>
          <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-100 ease-linear ${roundRemaining < 0.3 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${roundRemaining * 100}%` }}></div>
          </div>
        </div>

        <div className="flex-1 flex gap-2 md:gap-4 overflow-hidden">
          {/* --- MATH TASK (Purple) --- */}
          <div className={`flex-1 bg-slate-900 rounded-3xl border-2 ${mathAnswer !== null ? 'border-purple-500 opacity-50 scale-[0.98]' : 'border-purple-500/30'} flex flex-col relative transition-all duration-200`}>
            <div className="absolute top-4 left-4 p-2 bg-purple-500/20 rounded-lg text-purple-400"><Calculator size={24} /></div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h3 className="text-purple-300 font-bold mb-6 uppercase tracking-widest text-xs">آیا زوج است؟</h3>
              <div className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">{toPersianNum(number)}</div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                onPointerDown={() => mathAnswer === null && handleMathInput(true)}
                className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <Check size={24} className="text-purple-400" />
                <span className="text-xs font-bold text-purple-300">بله (A)</span>
              </button>
              <button
                onPointerDown={() => mathAnswer === null && handleMathInput(false)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <X size={24} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400">خیر (S)</span>
              </button>
            </div>
          </div>

          {/* --- COLOR TASK (Cyan) --- */}
          <div className={`flex-1 bg-slate-900 rounded-3xl border-2 ${colorAnswer !== null ? 'border-cyan-500 opacity-50 scale-[0.98]' : 'border-cyan-500/30'} flex flex-col relative transition-all duration-200`}>
            <div className="absolute top-4 left-4 p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Palette size={24} /></div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h3 className="text-cyan-300 font-bold mb-6 uppercase tracking-widest text-xs">تطابق رنگ و متن؟</h3>
              <div className="text-5xl md:text-6xl font-black drop-shadow-lg" style={{ color: colorHex }}>{colorText}</div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                onPointerDown={() => colorAnswer === null && handleColorInput(true)}
                className="bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <Check size={24} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">بله (فلش چپ)</span>
              </button>
              <button
                onPointerDown={() => colorAnswer === null && handleColorInput(false)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl py-4 flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <X size={24} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400">خیر (فلش راست)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
};

export default MultitaskGame;
