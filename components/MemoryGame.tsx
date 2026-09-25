
import React, { useState, useEffect, useRef } from 'react';
import {
  Server, Database, Play, CheckCircle2, XCircle, Users, Cpu,
  Eye, Heart, MousePointer2, Radar
} from 'lucide-react';
import { toPersianNum } from '../utils';
import { calculateDPrime } from '../utils/scoring';
import { UserProfile } from '../types';
import { sfx } from '../services/audioService';
import GameResultCard from './GameResultCard';
import GameShell, { GameState } from './GameShell';

interface Props {
  onExit: () => void;
  onComplete: (score: number, rawScores?: { corsi: number; paired: number; nback: number }) => void;
  user?: UserProfile;
  onStepComplete?: (game: 'corsi' | 'pairs' | 'nback', score: number, rawScore?: number) => void;
}

// --- SUB-GAME 1: CORSI BLOCK TAPPING (Spatial Memory) ---
// Sub-tests receive `paused` from the battery's GameShell so their timers stop
// under the pause menu instead of running on unseen.
const CorsiGame: React.FC<{ onFinish: (span: number, rawScore: number) => void; paused: boolean }> = ({ onFinish, paused }) => {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    // 'feedback' locks input between a finished attempt and the next round:
    // without it, one extra tap after completing a sequence was checked
    // against a non-existent position and cost a life.
    const [gameState, setGameState] = useState<'display' | 'input' | 'feedback' | 'finished'>('display');
    const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
    const [level, setLevel] = useState(2); 
    const [lives, setLives] = useState(3); // Standard 3 strikes
    const [successCount, setSuccessCount] = useState(0); // For Staircase: 2 correct -> level up
    const [activeBlock, setActiveBlock] = useState<number | null>(null);
    // Visual-only feedback: the block just tapped (green if right, red if wrong)
    // and how many pattern steps have played so far during the watch phase.
    const [tapFeedback, setTapFeedback] = useState<{ idx: number; correct: boolean } | null>(null);
    const [shown, setShown] = useState(0);

    // Stats
    const [maxSpan, setMaxSpan] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [errors, setErrors] = useState(0);

    const GRID_SIZE = 16; // 4x4

    const startRound = (len: number) => {
        const newSeq: number[] = [];
        let last = -1;
        for (let i = 0; i < len; i++) {
            let next;
            do { next = Math.floor(Math.random() * GRID_SIZE); } while (next === last);
            newSeq.push(next);
            last = next;
        }
        setSequence(newSeq);
        setUserSequence([]);
        setLastResult(null);
        setGameState('display');
    };

    useEffect(() => { startRound(level); }, []);

    // Pausing mid-playback replays the pattern from the start on resume.
    useEffect(() => {
        if (gameState === 'display' && !paused) {
            setShown(0);
            let i = 0;
            const interval = setInterval(() => {
                if (i >= sequence.length) {
                    clearInterval(interval);
                    setActiveBlock(null);
                    setTimeout(() => setGameState('input'), 500);
                    return;
                }
                setActiveBlock(sequence[i]);
                setShown(i + 1);
                sfx.playHover();
                setTimeout(() => setActiveBlock(null), 600);
                i++;
            }, 1000);
            return () => { clearInterval(interval); setActiveBlock(null); };
        }
    }, [gameState, sequence, paused]);

    const handleBlockClick = (idx: number) => {
        if (gameState !== 'input' || paused) return;

        sfx.playClick();
        const newUserSeq = [...userSequence, idx];
        const correct = newUserSeq[newUserSeq.length - 1] === sequence[newUserSeq.length - 1];
        setTapFeedback({ idx, correct });
        setTimeout(() => setTapFeedback(f => (f && f.idx === idx ? null : f)), 350);
        setUserSequence(newUserSeq);

        if (!correct) {
            sfx.playError();
            handleFail();
        } else if (newUserSeq.length === sequence.length) {
            sfx.playSuccess();
            handleSuccess();
        }
    };

    const handleSuccess = () => {
        setGameState('feedback');
        setLastResult('correct');
        setTotalCorrect(c => c + 1);
        const currentSpan = sequence.length;
        if (currentSpan > maxSpan) setMaxSpan(currentSpan);

        // Staircase Logic: 2 Correct -> Level Up
        const newSuccess = successCount + 1;
        setSuccessCount(newSuccess);
        
        if (newSuccess >= 2) {
            setSuccessCount(0);
            const newLevel = level + 1;
            setLevel(newLevel);
            setTimeout(() => startRound(newLevel), 1000);
        } else {
            setTimeout(() => startRound(level), 1000);
        }
    };

    const handleFail = () => {
        setGameState('feedback');
        setLastResult('wrong');
        setErrors(e => e + 1);
        const newLives = lives - 1;
        setLives(newLives);
        
        // Staircase Logic: 1 Wrong -> Level Down (min 2)
        setSuccessCount(0);
        const newLevel = Math.max(2, level - 1);
        setLevel(newLevel);
        
        if (newLives <= 0) {
            setGameState('finished');
        } else {
            setTimeout(() => startRound(newLevel), 1000);
        }
    };

    if (gameState === 'finished') {
        // Formula: (MaxSpan * 10) + (TotalCorrect * 2) - (Errors * 1)
        const finalScore = (maxSpan * 10) + (totalCorrect * 2) - errors;
        
        return (
            <GameResultCard 
                title="شبکه امنیتی (Corsi)"
                rawScore={maxSpan} // T-Score based on Span
                scoreKey="A9a"
                metrics={[
                    { label: 'ظرفیت حافظه', value: toPersianNum(maxSpan) },
                    { label: 'امتیاز کل', value: toPersianNum(finalScore) },
                ]}
                onRetry={() => { setLevel(2); setLives(3); setMaxSpan(0); setErrors(0); setTotalCorrect(0); setSuccessCount(0); startRound(2); }}
                onComplete={() => onFinish(maxSpan, finalScore)}
                completeLabel="ثبت و ادامه به بخش ۲"
            />
        );
    }

    const isWatching = gameState === 'display';
    const progressTotal = sequence.length;
    const progressDone = isWatching ? shown : userSequence.length;

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-6 relative overflow-hidden">
            {/* Ambient grid glow */}
            <div className="absolute inset-0 pointer-events-none opacity-60" style={{
                backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(16,185,129,0.12), transparent 55%)'
            }}></div>

            {/* HUD */}
            <div className="relative z-10 w-full max-w-sm flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-full pl-3 pr-2 py-1.5">
                    <Server size={15} className="text-emerald-400" />
                    <span className="text-xs font-black text-slate-200">طول الگو</span>
                    <span className="text-sm font-black text-emerald-400 tabular-nums min-w-[1.2rem] text-center">{toPersianNum(level)}</span>
                </div>
                <div className="flex items-center gap-1.5" aria-label="جان‌های باقی‌مانده">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Heart
                            key={i}
                            size={20}
                            className={`transition-all duration-300 ${i < lives ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]' : 'text-slate-700 fill-slate-800'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Phase banner */}
            <div className={`relative z-10 flex items-center gap-2 mb-5 px-4 py-2 rounded-full font-black text-sm border transition-colors duration-300 ${
                gameState === 'feedback'
                    ? (lastResult === 'correct' ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200' : 'bg-rose-500/15 border-rose-500/50 text-rose-300')
                    : isWatching
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            }`}>
                {gameState === 'feedback'
                    ? (lastResult === 'correct' ? <><CheckCircle2 size={16} /> درست بود!</> : <><XCircle size={16} /> اشتباه — یک جان از دست رفت</>)
                    : isWatching
                    ? <><Eye size={16} className="animate-pulse" /> الگو را به خاطر بسپارید</>
                    : <><MousePointer2 size={16} /> الگو را تکرار کنید</>}
            </div>

            {/* The grid */}
            <div className="relative z-10 grid grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-3xl shadow-2xl border border-slate-700/60 backdrop-blur-sm">
                {Array.from({ length: GRID_SIZE }).map((_, i) => {
                    const isActive = activeBlock === i;
                    const inTrail = gameState === 'input' && userSequence.includes(i);
                    const fb = tapFeedback && tapFeedback.idx === i ? tapFeedback : null;

                    let stateClass = 'bg-slate-700/70 border-slate-600/40';
                    if (fb) {
                        stateClass = fb.correct
                            ? 'bg-emerald-400 border-emerald-300 scale-95'
                            : 'bg-rose-500 border-rose-400 shadow-[0_0_22px_rgba(244,63,94,0.75)] scale-95';
                    } else if (isActive) {
                        stateClass = 'bg-emerald-400 border-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.85)] scale-110';
                    } else if (inTrail) {
                        stateClass = 'bg-emerald-600/40 border-emerald-500/60';
                    }

                    return (
                        <button
                            key={i}
                            disabled={gameState !== 'input'}
                            onClick={() => handleBlockClick(i)}
                            className={`
                                w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 transition-all duration-200 ${stateClass}
                                ${gameState === 'input' && !fb && !inTrail ? 'hover:border-emerald-500/50 hover:bg-slate-600/70 active:scale-95 cursor-pointer' : ''}
                            `}
                        />
                    );
                })}
            </div>

            {/* Progress dots for the current sequence */}
            <div className="relative z-10 flex items-center gap-1.5 mt-6 min-h-[0.75rem]">
                {Array.from({ length: progressTotal }).map((_, i) => (
                    <span
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            i < progressDone
                                ? (isWatching ? 'w-5 bg-sky-400' : 'w-5 bg-emerald-400')
                                : 'w-2 bg-slate-700'
                        }`}
                    />
                ))}
            </div>
            <p className="relative z-10 mt-3 text-slate-500 text-xs font-bold">
                {isWatching
                    ? `${toPersianNum(progressDone)} از ${toPersianNum(progressTotal)} خانه`
                    : `${toPersianNum(progressDone)} از ${toPersianNum(progressTotal)} خانه انتخاب شد`}
            </p>
        </div>
    );
};

// --- SUB-GAME 2: PAIRED ASSOCIATION ---
// Level sizes are capped by PAIRED_COLORS.length: with more pairs than colors,
// two icons would share a color and the recall task becomes ambiguous.
const PAIRED_LEVELS = [4, 6, 8];
const PAIRED_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
const PAIRED_ICONS = ['🏠', '🚗', '💻', '⌚', '📷', '🚲', '🚀', '☂️', '🍔', '🎸', '⚽', '🔑'];
const pairedStudySeconds = (lvlIndex: number) => 3 + PAIRED_LEVELS[lvlIndex] * 2;
const makePairs = (lvlIndex: number) => {
    const count = PAIRED_LEVELS[lvlIndex];
    const icons = [...PAIRED_ICONS].sort(() => Math.random() - 0.5).slice(0, count);
    const colors = [...PAIRED_COLORS].sort(() => Math.random() - 0.5).slice(0, count);
    return icons.map((icon, i) => ({ icon, color: colors[i] }));
};

const PairedGame: React.FC<{ onFinish: (accuracy: number, rawScore: number) => void; paused: boolean }> = ({ onFinish, paused }) => {
    const [phase, setPhase] = useState<'study' | 'delay' | 'test' | 'finished'>('study');
    const [level, setLevel] = useState(0);
    // Pairs and the study clock are seeded lazily so the very first render is
    // already a valid study phase. (Previously both were initialized in a mount
    // effect while a second effect keyed on [timeLeft, phase] also ran on mount
    // with the initial timeLeft=0 — it matched the "study finished" branch and
    // skipped straight past the study screen, so the player was asked to recall
    // pairs they had never been shown.)
    const [pairs, setPairs] = useState(() => makePairs(0));
    const [timeLeft, setTimeLeft] = useState(() => pairedStudySeconds(0));
    const [studyTotal, setStudyTotal] = useState(() => pairedStudySeconds(0));
    const [testIndex, setTestIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalTests, setTotalTests] = useState(0);
    const [lastPick, setLastPick] = useState<{ color: string; correct: boolean } | null>(null);

    const startLevel = (lvlIndex: number) => {
        setPairs(makePairs(lvlIndex));
        setTestIndex(0);
        setLastPick(null);
        setPhase('study');
        setStudyTotal(pairedStudySeconds(lvlIndex));
        setTimeLeft(pairedStudySeconds(lvlIndex));
    };

    // One timer per phase; transitions only fire for the timed phases so a
    // freshly seeded study phase can never be mistaken for a finished one.
    useEffect(() => {
        if (phase !== 'study' && phase !== 'delay') return;
        if (paused) return; // the study clock stops under the pause menu
        if (timeLeft > 0) {
            const t = setTimeout(() => setTimeLeft(l => l - 1), 1000);
            return () => clearTimeout(t);
        }
        if (phase === 'study') { setPhase('delay'); setTimeLeft(3); }
        else { setPhase('test'); setTestIndex(0); }
    }, [timeLeft, phase, paused]);

    const handleAnswer = (color: string) => {
        if (lastPick || paused) return;
        const currentPair = pairs[testIndex];
        const isCorrect = currentPair.color === color;
        setLastPick({ color, correct: isCorrect });

        if (isCorrect) { setCorrectCount(s => s + 1); sfx.playSuccess(); }
        else { sfx.playError(); }
        setTotalTests(t => t + 1);

        // Brief feedback so the player learns which colour was right.
        setTimeout(() => {
            setLastPick(null);
            if (testIndex < pairs.length - 1) {
                setTestIndex(i => i + 1);
            } else if (level < PAIRED_LEVELS.length - 1) {
                const next = level + 1;
                setLevel(next);
                startLevel(next);
            } else {
                setPhase('finished');
            }
        }, 700);
    };

    if (phase === 'finished') {
        const accuracy = totalTests > 0 ? Math.round((correctCount / totalTests) * 100) : 0;
        const finalScore = (PAIRED_LEVELS.length * 15) + (accuracy * 0.5);

        return (
            <GameResultCard
                title="جفت‌های پنهان"
                rawScore={accuracy} // T-Score based on Accuracy
                scoreKey="A9b"
                metrics={[
                    { label: 'دقت', value: toPersianNum(accuracy) + '%' },
                    { label: 'پاسخ صحیح', value: toPersianNum(correctCount) + ' از ' + toPersianNum(totalTests) },
                ]}
                onRetry={() => { setLevel(0); setCorrectCount(0); setTotalTests(0); startLevel(0); }}
                onComplete={() => onFinish(accuracy, finalScore)}
                completeLabel="ثبت و ادامه به بخش ۳"
            />
        );
    }

    const shell = 'flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 px-4 py-6';

    if (phase === 'study') {
        const pct = studyTotal > 0 ? (timeLeft / studyTotal) * 100 : 0;
        return (
            <div className={shell}>
                <div className="flex items-center gap-2 mb-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/40 text-sky-300 font-black text-sm">
                    <Eye size={16} className="animate-pulse" /> این جفت‌ها را به خاطر بسپارید
                </div>
                <p className="text-slate-400 text-xs font-bold mb-5">
                    مرحله {toPersianNum(level + 1)} از {toPersianNum(PAIRED_LEVELS.length)} — {toPersianNum(pairs.length)} جفت
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {pairs.map((p, i) => (
                        <div key={i} className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl shadow-lg flex flex-col items-center gap-2.5 animate-scale-in"
                             style={{ animationDelay: `${i * 60}ms` }}>
                            <span className="text-4xl">{p.icon}</span>
                            <div className={`w-9 h-9 rounded-full ${p.color} ring-2 ring-white/20`}></div>
                        </div>
                    ))}
                </div>

                <div className="w-full max-w-sm">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                        <span>زمان یادگیری</span>
                        <span className="tabular-nums">{toPersianNum(timeLeft)} ثانیه</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-1000 ease-linear"
                             style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'delay') {
        return (
            <div className={shell}>
                <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin mb-5" />
                <p className="font-black text-slate-300 mb-1">آماده شوید…</p>
                <p className="text-xs text-slate-500 font-bold">الان رنگ هر آیتم را می‌پرسیم</p>
            </div>
        );
    }

    return (
        <div className={shell}>
            <div className="flex items-center gap-2 mb-1 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-black text-sm">
                <MousePointer2 size={16} /> این آیتم چه رنگی بود؟
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-5">
                پرسش {toPersianNum(testIndex + 1)} از {toPersianNum(pairs.length)} — مرحله {toPersianNum(level + 1)} از {toPersianNum(PAIRED_LEVELS.length)}
            </p>

            <div className="text-7xl mb-7 animate-scale-in" key={testIndex}>{pairs[testIndex]?.icon}</div>

            <div className="grid grid-cols-4 gap-3 max-w-sm">
                {PAIRED_COLORS.map((c, i) => {
                    const picked = lastPick?.color === c;
                    const isAnswer = lastPick && pairs[testIndex]?.color === c;
                    return (
                        <button
                            key={i}
                            disabled={!!lastPick}
                            onClick={() => handleAnswer(c)}
                            className={`w-14 h-14 rounded-2xl ${c} shadow-lg transition-all duration-200 border-2
                                ${isAnswer ? 'border-white scale-110 ring-4 ring-white/40'
                                  : picked ? 'border-rose-300 opacity-70 scale-95'
                                  : lastPick ? 'border-transparent opacity-40'
                                  : 'border-transparent hover:scale-110 active:scale-95'}`}
                        />
                    );
                })}
            </div>
            <p className="mt-5 text-[11px] text-slate-500 font-bold">از میان {toPersianNum(PAIRED_COLORS.length)} رنگ، رنگ درست را انتخاب کنید</p>
        </div>
    );
};

// --- SUB-GAME 3: N-BACK (Working Memory) ---
const NBACK_TRIALS = 25;
const NBACK_POOL = ['A', 'B', 'C', 'D', 'H', 'K', 'X', 'Y'];
const NBACK_ISI = 2500; // Inter-Stimulus Interval (ms)

const NBackGame: React.FC<{ onFinish: (score: number, rawScore: number) => void; paused: boolean }> = ({ onFinish, paused }) => {
    const [n, setN] = useState(1);
    const [sequence, setSequence] = useState<string[]>([]);
    const sequenceRef = useRef<string[]>([]);
    const [showStimulus, setShowStimulus] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [trials, setTrials] = useState(0);
    // Between the 1-back and 2-back blocks the rule changes, so the player
    // gets a self-paced notice instead of the stream silently switching.
    const [levelNotice, setLevelNotice] = useState(false);

    // Stats for d-prime
    const [hits, setHits] = useState(0); // Correct matches
    const [targets, setTargets] = useState(0); // Total actual matches
    const [falseAlarms, setFalseAlarms] = useState(0); // Wrong matches
    const [nonTargets, setNonTargets] = useState(0); // Total non-matches
    const [userResponded, setUserResponded] = useState(false);
    const [responseFeedback, setResponseFeedback] = useState<'hit' | 'fa' | null>(null);

    const current = sequence.length > 0 ? sequence[sequence.length - 1] : '';

    // Trial loop chained on the `trials` state: each run schedules exactly one
    // trial, so the level-up/game-over check always sees the live count.
    useEffect(() => {
        if (gameOver || levelNotice || paused) return;

        if (trials >= NBACK_TRIALS) {
            if (n < 2) {
                setN(2);
                setTrials(0);
                setSequence([]);
                sequenceRef.current = [];
                setLevelNotice(true);
            } else {
                setGameOver(true);
            }
            return;
        }

        const timeoutId = setTimeout(() => {
            // `sequence` is fresh here: this effect re-runs per trial.
            const eligible = sequence.length >= n; // first n items can't match anything
            const shouldMatch = eligible && Math.random() < 0.3;
            let newItem = '';

            if (shouldMatch) {
                newItem = sequence[sequence.length - n];
                setTargets(t => t + 1);
            } else {
                newItem = NBACK_POOL[Math.floor(Math.random() * NBACK_POOL.length)];
                if (eligible && newItem === sequence[sequence.length - n]) {
                    newItem = NBACK_POOL.find(x => x !== newItem) || 'A';
                }
                // Only items the player could respond to count as non-targets;
                // counting the unanswerable first n inflated correct rejections.
                if (eligible) setNonTargets(nt => nt + 1);
            }

            setSequence(prev => [...prev, newItem]);
            sequenceRef.current = [...sequenceRef.current, newItem];
            setUserResponded(false);
            setResponseFeedback(null);
            setShowStimulus(true);
            setTrials(t => t + 1);
        }, trials === 0 ? 800 : NBACK_ISI);

        return () => clearTimeout(timeoutId);
    }, [trials, n, gameOver, levelNotice, paused]);

    // Hide the stimulus 1.5s after each onset
    useEffect(() => {
        if (!showStimulus) return;
        const t = setTimeout(() => setShowStimulus(false), 1500);
        return () => clearTimeout(t);
    }, [showStimulus, trials]);

    const handleMatch = () => {
        if (paused || levelNotice || !showStimulus || sequence.length <= n || userResponded) return;

        setUserResponded(true);
        const target = sequenceRef.current[sequenceRef.current.length - 1 - n];

        if (current === target) {
            setHits(h => h + 1);
            setResponseFeedback('hit');
            sfx.playSuccess();
        } else {
            setFalseAlarms(f => f + 1);
            setResponseFeedback('fa');
            sfx.playError();
        }
    };

    // Keyboard: Space (or Enter) = match.
    useEffect(() => {
        if (gameOver) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.code === 'Space' || e.key === 'Enter') {
                e.preventDefault();
                handleMatch();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (gameOver) {
        const dPrime = calculateDPrime(hits, targets, falseAlarms, nonTargets);
        const finalScore = Math.round((dPrime * 20) + (n * 15));

        return (
            <GameResultCard
                title="رادار تمرکز (N-Back)"
                rawScore={dPrime} // A9c norm is on the raw d' scale (mean 2.5, sd 1.0)
                scoreKey="A9c"
                metrics={[
                    { label: 'شاخص d-prime', value: toPersianNum(dPrime.toFixed(2)), subtext: 'تفکیک پذیری' },
                    { label: 'تشخیص درست', value: `${toPersianNum(hits)} از ${toPersianNum(targets)}` },
                    { label: 'خطای مثبت', value: toPersianNum(falseAlarms) },
                ]}
                onRetry={() => { setN(1); setHits(0); setFalseAlarms(0); setTargets(0); setNonTargets(0); setGameOver(false); setSequence([]); sequenceRef.current = []; setTrials(0); setUserResponded(false); setShowStimulus(false); setResponseFeedback(null); setLevelNotice(false); }}
                onComplete={() => onFinish(finalScore, dPrime)}
                completeLabel="ثبت و پایان آزمون"
            />
        );
    }

    if (levelNotice) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-slate-900 to-slate-950 px-6 animate-fade-in">
                <div className="max-w-md w-full bg-slate-800/70 border border-slate-700 rounded-3xl p-7 shadow-2xl text-center animate-scale-in">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-lg">
                        <Radar size={26} />
                    </div>
                    <div className="text-[11px] font-black text-rose-300 mb-1">مرحله دوم</div>
                    <h2 className="text-xl font-black text-white mb-3">حالا ۲-Back</h2>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                        از این به بعد، وقتی حرف فعلی با حرفِ <b className="text-white">دو مرحله قبل</b> یکسان بود «تطابق» را بزنید (نه حرف قبلی).
                    </p>
                    <button
                        onClick={() => setLevelNotice(false)}
                        className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Play size={18} fill="currentColor" /> شروع مرحله دوم
                    </button>
                </div>
            </div>
        );
    }

    const canRespond = showStimulus && sequence.length > n && !userResponded;

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white px-4 py-6 relative overflow-hidden">
            {/* HUD */}
            <div className="relative z-10 w-full max-w-sm flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-full pl-3 pr-2 py-1.5">
                    <Radar size={15} className="text-rose-400" />
                    <span className="text-xs font-black text-slate-200">قانون</span>
                    <span className="text-sm font-black text-rose-400" dir="ltr">{toPersianNum(n)}-Back</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700 rounded-full px-3 py-1.5 text-xs font-black text-slate-300 tabular-nums">
                    آزمایه {toPersianNum(Math.min(trials, NBACK_TRIALS))} از {toPersianNum(NBACK_TRIALS)}
                </div>
            </div>

            <p className="relative z-10 text-xs font-bold text-slate-400 mb-6 text-center">
                اگر حرف فعلی با حرفِ {n === 1 ? 'قبلی' : 'دو مرحله قبل'} یکسان است، «تطابق» را بزنید.
            </p>

            <div className={`w-44 h-44 rounded-3xl border-2 flex items-center justify-center mb-10 transition-colors duration-200 ${
                responseFeedback === 'hit' ? 'border-emerald-400 bg-emerald-500/10'
                : responseFeedback === 'fa' ? 'border-rose-500 bg-rose-500/10'
                : 'border-slate-700 bg-slate-800/50'
            }`}>
                <span className={`text-8xl font-black transition-all duration-200 ${showStimulus ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} dir="ltr">
                    {current}
                </span>
            </div>

            <button
                onClick={handleMatch}
                disabled={!canRespond}
                className={`w-64 py-5 rounded-2xl font-black text-xl active:scale-95 transition-all ${
                    responseFeedback === 'hit' ? 'bg-emerald-600 text-white'
                    : responseFeedback === 'fa' ? 'bg-rose-800 text-rose-200'
                    : canRespond ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_30px_rgba(225,29,72,0.45)]'
                    : 'bg-slate-800 text-slate-500'
                }`}
            >
                {responseFeedback === 'hit' ? 'درست!' : responseFeedback === 'fa' ? 'تطابق نبود' : 'تطابق'}
            </button>
            <p className="mt-3 text-[11px] font-bold text-slate-500">کلید Space هم کار می‌کند</p>
        </div>
    );
};

// --- STAGE BRIEFINGS ---
// Each stage is a different task, so it never starts cold: this card explains
// what is about to happen and waits for the player before the stage mounts.
type StageKey = 'corsi' | 'paired' | 'nback';
const STAGE_BRIEF: Record<StageKey, { n: number; title: string; test: string; icon: any; steps: string[] }> = {
    corsi: {
        n: 1, title: 'حافظه فضایی', test: 'آزمون Corsi', icon: Server,
        steps: [
            'چند خانه از شبکه به‌ترتیب روشن می‌شوند؛ با دقت تماشا کنید.',
            'سپس همان خانه‌ها را به همان ترتیب لمس کنید.',
            'با هر دو پاسخ درستِ پیاپی الگو یک خانه بلندتر می‌شود؛ هر خطا یک جان (از ۳) کم می‌کند.',
        ],
    },
    paired: {
        n: 2, title: 'حافظه تداعی‌گر', test: 'آزمون جفت‌ها', icon: Users,
        steps: [
            'ابتدا چند جفتِ «آیکون + رنگ» نمایش داده می‌شود؛ آن‌ها را حفظ کنید.',
            'پس از پایان زمان یادگیری، جفت‌ها پنهان می‌شوند.',
            'سپس هر آیکون را نشان می‌دهیم و شما رنگ آن را از میان ۸ رنگ انتخاب می‌کنید.',
        ],
    },
    nback: {
        n: 3, title: 'حافظه فعال', test: 'آزمون N-Back', icon: Cpu,
        steps: [
            'حروف یکی‌یکی نمایش داده می‌شوند.',
            'هر بار که حرف فعلی با N حرف قبل یکسان بود، دکمه «تطابق» را بزنید.',
            'ابتدا N برابر ۱ است و در ادامه به ۲ افزایش می‌یابد (کلید Space = تطابق).',
        ],
    },
};

const StageBriefing: React.FC<{ stage: StageKey; onStart: () => void }> = ({ stage, onStart }) => {
    const b = STAGE_BRIEF[stage];
    const Icon = b.icon;
    return (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-6 animate-fade-in">
            <div className="max-w-md w-full bg-slate-800/70 border border-slate-700 rounded-3xl p-7 shadow-2xl backdrop-blur-sm animate-scale-in">
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                        <Icon size={26} />
                    </div>
                    <div>
                        <div className="text-[11px] font-black text-emerald-400 mb-0.5">
                            بخش {toPersianNum(b.n)} از ۳ · {b.test}
                        </div>
                        <h2 className="text-xl font-black text-white">{b.title}</h2>
                    </div>
                </div>

                <ol className="space-y-2.5 mb-6">
                    {b.steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {toPersianNum(i + 1)}
                            </span>
                            <span className="text-sm text-slate-300 leading-relaxed">{s}</span>
                        </li>
                    ))}
                </ol>

                <button
                    onClick={onStart}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/25 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Play size={18} fill="currentColor" /> شروع بخش {toPersianNum(b.n)}
                </button>
            </div>
        </div>
    );
};

// --- MAIN WRAPPER ---
const STAGE_ORDER: StageKey[] = ['corsi', 'paired', 'nback'];

const MemoryGame: React.FC<Props> = ({ onExit, onComplete, onStepComplete }) => {
    const [gameState, setGameState] = useState<GameState>('intro');
    // Starts at corsi; only stage completions advance it. (This used to be
    // reset from an effect on every switch to 'playing', so resuming from the
    // pause menu threw the player back to the start of the whole battery.)
    const [gameStage, setGameStage] = useState<StageKey>('corsi');
    // Every stage opens with its own briefing so no task ever starts cold.
    const [briefing, setBriefing] = useState(true);

    // Store raw scores for T-Score calculation
    const [rawScores, setRawScores] = useState({ corsi: 0, paired: 0, nback: 0 });
    const paused = gameState !== 'playing';

    const handleCorsiFinish = (span: number, score: number) => {
        setRawScores(prev => ({ ...prev, corsi: span }));
        if (onStepComplete) onStepComplete('corsi', score, span);
        setGameStage('paired');
        setBriefing(true);
    };

    const handlePairedFinish = (acc: number, score: number) => {
        setRawScores(prev => ({ ...prev, paired: acc }));
        if (onStepComplete) onStepComplete('pairs', score, acc);
        setGameStage('nback');
        setBriefing(true);
    };

    const handleNBackFinish = (score: number, dPrime: number) => {
        const finalRawScores = { ...rawScores, nback: dPrime };
        setRawScores(finalRawScores);
        if (onStepComplete) onStepComplete('nback', score, dPrime);
        onComplete(score, finalRawScores);
    };

    return (
        <GameShell
            title="آزمون جامع حافظه (A9)"
            description="این آزمون شامل ۳ بخش است: حافظه دیداری، حافظه تداعی‌گر، و حافظه فعال."
            instructions={[
                "بخش ۱: الگوی بلوک‌ها را تماشا و تکرار کنید.",
                "بخش ۲: جفت‌های آیکون-رنگ را حفظ کنید.",
                "بخش ۳: تطابق حروف با N مرحله قبل را تشخیص دهید."
            ]}
            icon={<Database />}
            stats={{ progress: { current: STAGE_ORDER.indexOf(gameStage) + 1, total: STAGE_ORDER.length, label: 'بخش' } }}
            onExit={onExit}
            gameState={gameState}
            setGameState={setGameState}
            colorTheme="emerald"
            tone="dark"
        >
            <div className="h-full w-full relative overflow-hidden rounded-3xl">
                {briefing ? (
                    <StageBriefing stage={gameStage} onStart={() => setBriefing(false)} />
                ) : (
                    <>
                        {gameStage === 'corsi' && <CorsiGame onFinish={handleCorsiFinish} paused={paused} />}
                        {gameStage === 'paired' && <PairedGame onFinish={handlePairedFinish} paused={paused} />}
                        {gameStage === 'nback' && <NBackGame onFinish={handleNBackFinish} paused={paused} />}
                    </>
                )}
            </div>
        </GameShell>
    );
};

export default MemoryGame;
