
import React, { useState, useEffect, useRef } from 'react';
import {
  Server, Database, Radar, Play, CheckCircle2, XCircle,
  HelpCircle, Eye, RefreshCw, Zap, Heart, MousePointer2
} from 'lucide-react';
import { toPersianNum } from '../utils';
import { calculateDPrime } from '../utils/scoring';
import { UserProfile } from '../types';
import { sfx } from '../services/audioService';
import GameResultCard from './GameResultCard';
import GameShell from './GameShell';

interface Props {
  onExit: () => void;
  onComplete: (score: number, rawScores?: { corsi: number; paired: number; nback: number }) => void;
  user?: UserProfile;
  onStepComplete?: (game: 'corsi' | 'pairs' | 'nback', score: number, rawScore?: number) => void;
}

// --- SUB-GAME 1: CORSI BLOCK TAPPING (Spatial Memory) ---
const CorsiGame: React.FC<{ onFinish: (span: number, rawScore: number) => void }> = ({ onFinish }) => {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'display' | 'input' | 'finished'>('display');
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
        setGameState('display');
    };

    useEffect(() => { startRound(level); }, []);

    useEffect(() => {
        if (gameState === 'display') {
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
            return () => clearInterval(interval);
        }
    }, [gameState, sequence]);

    const handleBlockClick = (idx: number) => {
        if (gameState !== 'input') return;

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
                isWatching
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            }`}>
                {isWatching ? <Eye size={16} className="animate-pulse" /> : <MousePointer2 size={16} />}
                {isWatching ? 'الگو را به خاطر بسپارید' : 'الگو را تکرار کنید'}
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
const PairedGame: React.FC<{ onFinish: (accuracy: number, rawScore: number) => void }> = ({ onFinish }) => {
    const [phase, setPhase] = useState<'study' | 'delay' | 'test' | 'finished'>('study');
    const [level, setLevel] = useState(0); 
    const [timeLeft, setTimeLeft] = useState(0);
    const [pairs, setPairs] = useState<{icon: string, color: string}[]>([]);
    const [testIndex, setTestIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalTests, setTotalTests] = useState(0);

    // Max level is capped by COLORS.length: with more pairs than colors, two
    // icons would share a color and the recall task becomes inconsistent.
    const LEVELS = [4, 6, 8];
    const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
    const ICONS = ['🏠', '🚗', '💻', '⌚', '📷', '🚲', '🚀', '☂️', '🍔', '🎸', '⚽', '🔑'];

    const startLevel = (lvlIndex: number) => {
        const count = LEVELS[lvlIndex];
        const selectedIcons = ICONS.slice(0, count).sort(() => Math.random() - 0.5);
        const selectedColors = COLORS.slice(0, count).sort(() => Math.random() - 0.5);
        
        const newPairs = selectedIcons.map((icon, i) => ({
            icon, color: selectedColors[i % selectedColors.length]
        }));
        
        setPairs(newPairs);
        setPhase('study');
        setTimeLeft(3 + (count * 2)); 
    };

    useEffect(() => { startLevel(0); }, []);

    useEffect(() => {
        if (timeLeft > 0) {
            const t = setTimeout(() => setTimeLeft(l => l - 1), 1000);
            return () => clearTimeout(t);
        } else if (timeLeft === 0 && phase === 'study') {
            setPhase('delay');
            setTimeLeft(3); 
        } else if (timeLeft === 0 && phase === 'delay') {
            setPhase('test');
            setTestIndex(0);
        }
    }, [timeLeft, phase]);

    const handleAnswer = (color: string) => {
        const currentPair = pairs[testIndex];
        const isCorrect = currentPair.color === color;
        
        if (isCorrect) {
            setCorrectCount(s => s + 1);
            sfx.playSuccess();
        } else {
            sfx.playError();
        }
        setTotalTests(t => t + 1);

        if (testIndex < pairs.length - 1) {
            setTestIndex(i => i + 1);
        } else {
            // Level done
            if (level < LEVELS.length - 1) {
                setLevel(l => l + 1);
                startLevel(level + 1);
            } else {
                setPhase('finished');
            }
        }
    };

    if (phase === 'finished') {
        const accuracy = Math.round((correctCount / totalTests) * 100);
        // Formula: Level * 15 + Accuracy * 0.5
        const finalScore = (LEVELS.length * 15) + (accuracy * 0.5);

        return (
            <GameResultCard 
                title="جفت‌های پنهان"
                rawScore={accuracy} // T-Score based on Accuracy
                scoreKey="A9b"
                metrics={[
                    { label: 'دقت', value: toPersianNum(accuracy) + '%' },
                    { label: 'پاسخ صحیح', value: toPersianNum(correctCount) },
                ]}
                onRetry={() => { setLevel(0); setCorrectCount(0); setTotalTests(0); startLevel(0); }}
                onComplete={() => onFinish(accuracy, finalScore)}
            />
        );
    }

    if (phase === 'study') {
        return (
            <div className="flex flex-col items-center h-full pt-8">
                <div className="mb-6 font-bold text-slate-500">زمان یادگیری: {timeLeft}s</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {pairs.map((p, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl shadow-md flex flex-col items-center gap-2 border border-slate-100 animate-scale-in">
                            <span className="text-4xl">{p.icon}</span>
                            <div className={`w-8 h-8 rounded-full ${p.color}`}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (phase === 'delay') {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 font-bold bg-slate-50">
                صبر کنید...
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center h-full pt-12">
            <h3 className="mb-8 font-bold text-slate-700">این آیتم چه رنگی بود؟</h3>
            <div className="text-8xl mb-12 animate-pop">{pairs[testIndex]?.icon}</div>
            <div className="flex flex-wrap justify-center gap-4 max-w-md">
                {COLORS.map((c, i) => (
                    <button 
                        key={i}
                        onClick={() => handleAnswer(c)}
                        className={`w-16 h-16 rounded-2xl ${c} shadow-lg hover:scale-110 transition-transform`}
                    />
                ))}
            </div>
        </div>
    );
};

// --- SUB-GAME 3: N-BACK (Working Memory) ---
const NBackGame: React.FC<{ onFinish: (score: number, rawScore: number) => void }> = ({ onFinish }) => {
    const [n, setN] = useState(1);
    const [sequence, setSequence] = useState<string[]>([]);
    const sequenceRef = useRef<string[]>([]);
    const [showStimulus, setShowStimulus] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [trials, setTrials] = useState(0);

    // Stats for d-prime
    const [hits, setHits] = useState(0); // Correct matches
    const [targets, setTargets] = useState(0); // Total actual matches
    const [falseAlarms, setFalseAlarms] = useState(0); // Wrong matches
    const [nonTargets, setNonTargets] = useState(0); // Total non-matches
    const [userResponded, setUserResponded] = useState(false);

    const MAX_TRIALS = 25;
    const POOL = ['A', 'B', 'C', 'D', 'H', 'K', 'X', 'Y'];
    const ISI = 2500; // Inter-Stimulus Interval (ms)

    const current = sequence.length > 0 ? sequence[sequence.length - 1] : '';

    // Trial loop chained on the `trials` state: each run schedules exactly one
    // trial, so the level-up/game-over check always sees the live count. (The
    // previous self-scheduling timeout closed over `trials` from mount, so the
    // check never fired and the game could not end.)
    useEffect(() => {
        if (gameOver) return;

        if (trials >= MAX_TRIALS) {
            if (n < 2) {
                setN(2);
                setTrials(0);
                setSequence([]);
            } else {
                setGameOver(true);
            }
            return;
        }

        const timeoutId = setTimeout(() => {
            // `sequence` is fresh here: this effect re-runs per trial.
            const shouldMatch = Math.random() < 0.3 && sequence.length >= n;
            let newItem = '';

            if (shouldMatch) {
                newItem = sequence[sequence.length - n];
                setTargets(t => t + 1);
            } else {
                newItem = POOL[Math.floor(Math.random() * POOL.length)];
                if (sequence.length >= n && newItem === sequence[sequence.length - n]) {
                    newItem = POOL.find(x => x !== newItem) || 'A';
                }
                setNonTargets(nt => nt + 1);
            }

            setSequence(prev => [...prev, newItem]);
            sequenceRef.current = [...sequenceRef.current, newItem];
            setUserResponded(false);
            setShowStimulus(true);
            setTrials(t => t + 1);
        }, trials === 0 ? 600 : ISI);

        return () => clearTimeout(timeoutId);
    }, [trials, n, gameOver]);

    // Hide the stimulus 1.5s after each onset
    useEffect(() => {
        if (!showStimulus) return;
        const t = setTimeout(() => setShowStimulus(false), 1500);
        return () => clearTimeout(t);
    }, [showStimulus, trials]);

    const handleMatch = () => {
        if (!showStimulus || sequence.length <= n || userResponded) return;
        
        setUserResponded(true);
        const target = sequenceRef.current[sequenceRef.current.length - 1 - n];
        
        if (current === target) {
            setHits(h => h + 1);
            sfx.playSuccess();
        } else {
            setFalseAlarms(f => f + 1);
            sfx.playError();
        }
    };

    if (gameOver) {
        const dPrime = calculateDPrime(hits, targets, falseAlarms, nonTargets);
        const finalScore = Math.round((dPrime * 20) + (n * 15));

        return (
            <GameResultCard
                title="رادار تمرکز (N-Back)"
                rawScore={dPrime} // A9c norm is on the raw d' scale (mean 2.5, sd 1.0)
                scoreKey="A9c"
                metrics={[
                    { label: 'شاخص d-prime', value: dPrime.toFixed(2), subtext: 'تفکیک پذیری' },
                    { label: 'ضربه (Hits)', value: hits },
                    { label: 'خطای مثبت', value: falseAlarms },
                ]}
                onRetry={() => { setN(1); setHits(0); setFalseAlarms(0); setTargets(0); setNonTargets(0); setGameOver(false); setSequence([]); sequenceRef.current = []; setTrials(0); setUserResponded(false); setShowStimulus(false); }}
                onComplete={() => onFinish(finalScore, dPrime)}
            />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full relative bg-slate-900 text-white">
            <div className="absolute top-4 left-4 bg-slate-800 px-3 py-1 rounded-full text-sm font-bold">
                Level: {n}-Back
            </div>
            <div className="absolute top-4 right-14 bg-slate-800 px-3 py-1 rounded-full text-sm font-bold text-slate-300 tabular-nums">
                آزمایه {toPersianNum(Math.min(trials, MAX_TRIALS))} / {toPersianNum(MAX_TRIALS)}
            </div>
            
            <div className={`text-9xl font-black transition-all duration-200 ${showStimulus ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                {current}
            </div>

            <button 
                onClick={handleMatch}
                disabled={userResponded}
                className={`absolute bottom-12 w-64 py-6 rounded-2xl font-bold text-xl shadow-[0_0_30px_rgba(225,29,72,0.5)] active:scale-95 transition-all ${userResponded ? 'bg-slate-700 text-slate-500' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
            >
                تطابق (Match)
            </button>
        </div>
    );
};

// --- MAIN WRAPPER ---
const MemoryGame: React.FC<Props> = ({ onExit, onComplete, onStepComplete }) => {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
    const [gameStage, setGameStage] = useState<'corsi' | 'paired' | 'nback'>('corsi');
    
    // Store raw scores for T-Score calculation
    const [rawScores, setRawScores] = useState({ corsi: 0, paired: 0, nback: 0 });

    // When GameShell transitions to 'playing', start from corsi
    useEffect(() => {
        if (gameState === 'playing') {
            setGameStage('corsi');
        }
    }, [gameState]);

    const handleCorsiFinish = (span: number, score: number) => {
        setRawScores(prev => ({ ...prev, corsi: span }));
        if (onStepComplete) onStepComplete('corsi', score, span);
        setGameStage('paired');
    };

    const handlePairedFinish = (acc: number, score: number) => {
        setRawScores(prev => ({ ...prev, paired: acc }));
        if (onStepComplete) onStepComplete('pairs', score, acc);
        setGameStage('nback');
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
            stats={{ score: 0 }}
            onExit={onExit}
            gameState={gameState}
            setGameState={setGameState}
            colorTheme="emerald"
        >
            <div className="h-full w-full relative overflow-hidden">
                {gameStage === 'corsi' && <CorsiGame onFinish={handleCorsiFinish} />}
                {gameStage === 'paired' && <PairedGame onFinish={handlePairedFinish} />}
                {gameStage === 'nback' && <NBackGame onFinish={handleNBackFinish} />}
            </div>
        </GameShell>
    );
};

export default MemoryGame;
