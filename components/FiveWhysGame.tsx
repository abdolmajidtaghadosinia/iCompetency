
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiveWhysData } from '../types';
import { generateFiveWhysData } from '../services/geminiService';
import { Loader2, AlertTriangle, XCircle, CheckCircle2, Search, HelpCircle, ArrowDown } from 'lucide-react';
import GameShell from './GameShell';
import MethodologyResult, { RubricDimension } from './MethodologyResult';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: number, payload?: Record<string, unknown>) => void;
}

// The UI is Persian-only; reject non-Persian output so a weak generation falls
// to the Persian fallback instead of being scored.
const hasPersian = (s: string) => /[؀-ۿ]/.test(s || '');

// Reject malformed AI data so a bad generation never becomes an unfair score:
// every level needs 3+ Persian options with exactly one root-cause path.
const isValidFiveWhys = (d: FiveWhysData | null): boolean =>
  !!d && typeof d.problemStatement === 'string' && hasPersian(d.problemStatement) &&
  Array.isArray(d.levels) && d.levels.length >= 1 &&
  d.levels.every(l =>
    !!l && typeof l.question === 'string' && hasPersian(l.question) &&
    Array.isArray(l.options) && l.options.length >= 3 &&
    l.options.every(o => !!o && typeof o.text === 'string' && hasPersian(o.text)) &&
    l.options.filter(o => o.isRootCausePath === true).length === 1);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface LevelLog { level: number; wrongCount: number; timeMs: number; }

const FiveWhysGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [data, setData] = useState<FiveWhysData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  // The chosen root-cause-path option text per solved level, shown as the chain.
  const [chain, setChain] = useState<string[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  // Rubric signals: wrong picks before solving each level, and time spent.
  const levelLogs = useRef<LevelLog[]>([]);
  const levelStart = useRef<number>(Date.now());
  const levelWrongs = useRef<number>(0);

  useEffect(() => {
    levelStart.current = Date.now();
    levelWrongs.current = 0;
    setPicked(null);
  }, [currentLevel]);

  const loadData = () => {
    setLoadError(false);
    setData(null);
    generateFiveWhysData().then(d => setData(d)).catch(() => setLoadError(true));
  };
  useEffect(loadData, []);
  useEffect(() => {
    if (data || loadError) return;
    const timeout = setTimeout(() => setLoadError(true), 15000);
    return () => clearTimeout(timeout);
  }, [data, loadError]);

  // Shuffle each level's options once per loaded case so the correct option
  // isn't always in the same slot.
  const shuffledLevels = useMemo(
    () => data?.levels.map(l => ({ ...l, options: shuffle(l.options) })) ?? [],
    [data]
  );

  const isFallback = data?._fallback === true || (!!data && !isValidFiveWhys(data));
  const levelCount = shuffledLevels.length || 5;
  const levelData = shuffledLevels[currentLevel];

  const handlePick = (idx: number) => {
    if (!levelData || picked !== null) return;
    const option = levelData.options[idx];
    setPicked(idx);

    if (option.isRootCausePath) {
      sfx.playSuccess();
      levelLogs.current.push({
        level: currentLevel,
        wrongCount: levelWrongs.current,
        timeMs: Date.now() - levelStart.current,
      });
      setScore(s => s + 20);
      const solvedText = option.text;
      setTimeout(() => {
        if (currentLevel < shuffledLevels.length - 1) {
          setChain(c => [...c, solvedText]);
          setCurrentLevel(l => l + 1);
        } else {
          setChain(c => [...c, solvedText]);
          setGameState('finished');
        }
      }, 1100);
    } else {
      // Soft correction: show why this is a symptom / lateral / jump, then let
      // them try again on the same level. No timed lockout.
      sfx.playError();
      levelWrongs.current += 1;
      setScore(s => Math.max(0, s - 5));
      setTimeout(() => setPicked(null), 1400);
    }
  };

  if (gameState === 'finished' && data) {
    const logs = levelLogs.current;
    const n = Math.max(1, logs.length);
    const firstTry = logs.filter(l => l.wrongCount === 0).length;
    const totalWrong = logs.reduce((s, l) => s + l.wrongCount, 0);
    // Precision: share of levels where the true deeper cause was spotted on the
    // first pick. Directness: correct picks over total picks — a clean chain vs.
    // detouring through symptoms.
    const precision = (firstTry / n) * 100;
    const directness = (n / (n + totalWrong)) * 100;
    const finalScore = Math.round(precision * 0.5 + directness * 0.5);

    const dimensions: RubricDimension[] = [
      { label: 'دقت علّی (تشخیص علت از نشانه)', value: precision },
      { label: 'مسیر مستقیم (بدون انحراف)', value: directness },
    ];
    const strength = precision >= directness
      ? 'علت عمیق‌تر را از میان نشانه‌ها به‌خوبی و اغلب در نگاه اول تشخیص می‌دهید.'
      : 'با وجود چند انحراف، در نهایت زنجیره علت را تا ریشه دنبال می‌کنید.';
    const blindSpot = totalWrong === 0
      ? 'برای رشد بیشتر، سناریوهای پیچیده‌تری را با همین دقت تمرین کنید.'
      : precision < 60
      ? 'گاهی نشانه (symptom) یا راه‌حل عجولانه را به‌جای علت (cause) انتخاب می‌کنید.'
      : 'در چند سطح، پیش از رسیدن به علت درست، گزینه انحرافی را انتخاب کردید.';

    const payload = {
      subject: '5whys',
      dimensions: { precision: Math.round(precision), directness: Math.round(directness) },
      levels: logs,
      totalWrong,
      usedFallback: isFallback,
    };

    const reset = () => {
      levelLogs.current = []; levelWrongs.current = 0; levelStart.current = Date.now();
      setCurrentLevel(0); setScore(0); setChain([]); setPicked(null); setGameState('playing');
    };

    return (
      <MethodologyResult
        title="متدولوژی ۵ چرا"
        subtitle="ریشه‌یابی علّی"
        score={finalScore}
        dimensions={dimensions}
        strength={strength}
        blindSpot={blindSpot}
        onRetry={reset}
        onComplete={() => isFallback ? onExit() : onComplete(finalScore, payload)}
      />
    );
  }

  const pickedOption = picked !== null && levelData ? levelData.options[picked] : null;
  const pickedWrong = pickedOption !== null && !pickedOption.isRootCausePath;

  return (
    <GameShell
        title="متدولوژی ۵ چرا"
        description="با پرسیدن مکرر «چرا» زنجیره علت و معلول را دنبال کنید. در هر گام، از میان سه گزینه، علتِ یک‌قدم‌عمیق‌تر را (نه نشانه و نه راه‌حل عجولانه) انتخاب کنید تا به ریشه واقعی برسید."
        instructions={[
            'صورت مسئله یک نشانه (symptom) کاری است؛ علت زیرین آن را پیدا کنید.',
            'در هر سطح، گزینه‌ای را انتخاب کنید که یک قدم واقعی عمیق‌تر می‌رود.',
            'گزینه‌های انحرافی یا بازگویی نشانه یا پریدن به راه‌حل هستند؛ از آن‌ها پرهیز کنید.',
        ]}
        icon={<Search />}
        stats={{ score }}
        onExit={onExit}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="amber"
    >
      <div className="h-full w-full flex flex-col p-6 overflow-y-auto rounded-3xl bg-slate-900 text-slate-100">
        {!data && !loadError && (
            <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up">
                <Loader2 className="animate-spin w-10 h-10 text-amber-500 mb-4" />
                <p className="text-lg animate-pulse">در حال آماده‌سازی پرونده...</p>
            </div>
        )}

        {!data && loadError && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">خطا در بارگذاری</h2>
                <p className="text-slate-400 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.</p>
                <button onClick={loadData} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-colors">
                    تلاش مجدد
                </button>
            </div>
        )}

        {data && levelData && (
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
            {isFallback && (
                <div className="mb-4 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold text-center">
                    نسخه آفلاین — این اجرا در کارنامه ثبت نمی‌شود.
                </div>
            )}
            <div className="text-center text-xs text-slate-500 font-bold mb-4">سطح {toPersianNum(currentLevel + 1)} از {toPersianNum(levelCount)}</div>

            {/* Chain history */}
            <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 text-sm font-bold text-slate-300 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" /> <span>صورت مسئله: {data.problemStatement}</span>
                </div>
                {chain.map((cause, idx) => (
                    <div key={idx} className="flex items-start gap-3 mr-4 border-r-2 border-emerald-700/50 pr-4 py-1">
                        <ArrowDown size={14} className="mt-1 text-emerald-500 shrink-0" />
                        <div>
                            <div className="text-xs text-slate-500">چرا {toPersianNum(idx + 1)}</div>
                            <div className="text-emerald-400 text-sm">{cause}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Current question */}
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 mb-5 shadow-xl animate-slide-in-right">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
                    {levelData.question}
                </h1>
                <p className="text-slate-400 text-sm flex items-center gap-2 mt-2">
                    <HelpCircle size={14} className="shrink-0" /> راهنمایی: {levelData.hint}
                </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {levelData.options.map((opt, idx) => {
                const isPicked = picked === idx;
                let cls = 'bg-slate-800 border-slate-700 hover:border-amber-500/50 cursor-pointer';
                if (picked !== null) {
                  if (isPicked) cls = opt.isRootCausePath
                    ? 'bg-emerald-900/30 border-emerald-500/60 ring-1 ring-emerald-500'
                    : 'bg-red-900/30 border-red-500/60 ring-1 ring-red-500';
                  else cls = 'bg-slate-900 border-slate-800 opacity-40';
                }
                return (
                  <button
                    key={idx}
                    disabled={picked !== null}
                    onClick={() => handlePick(idx)}
                    className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${cls}`}
                  >
                    <div className="flex items-start justify-between w-full gap-3">
                      <span className="font-bold text-sm md:text-base text-slate-200 leading-relaxed">{opt.text}</span>
                      {isPicked && (opt.isRootCausePath
                        ? <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                        : <XCircle className="text-red-500 shrink-0" size={20} />)}
                    </div>
                    {isPicked && opt.feedback && (
                      <div className={`mt-1 text-sm p-3 rounded-xl w-full text-right ${opt.isRootCausePath ? 'bg-emerald-500/10 text-emerald-200' : 'bg-red-500/10 text-red-200'}`}>
                        {opt.feedback}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {pickedWrong && (
              <p className="text-center text-xs text-red-300 mt-4 animate-fade-in">این علت اصلی نیست؛ دوباره تلاش کنید.</p>
            )}
            <p className="text-center text-xs text-slate-500 mt-4">علتِ یک‌قدم‌عمیق‌تر را انتخاب کنید، نه نشانه یا راه‌حل را.</p>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default FiveWhysGame;
