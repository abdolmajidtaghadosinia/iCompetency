
import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, Database, Radar, Play, CheckCircle2, XCircle, 
  HelpCircle, Eye, RefreshCw, Zap 
} from 'lucide-react';
import { toPersianNum } from '../utils';
import { calculateDPrime } from '../utils/scoring';
import { UserProfile } from '../types';
import { sfx } from '../services/audioService';
import GameResultCard from './GameResultCard';

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
            let i = 0;
            const interval = setInterval(() => {
                if (i >= sequence.length) {
                    clearInterval(interval);
                    setActiveBlock(null);
                    setTimeout(() => setGameState('input'), 500);
                    return;
                }
                setActiveBlock(sequence[i]);
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
        setUserSequence(newUserSeq);
        
        if (newUserSeq[newUserSeq.length - 1] !== sequence[newUserSeq.length - 1]) {
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
            setLevel(l => l + 1);
            setTimeout(() => startRound(level + 1), 1000);
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
                onRetry={() => { setLevel(2); setLives(3); setMaxSpan(0); setErrors(0); startRound(2); }}
                onComplete={() => onFinish(maxSpan, finalScore)}
            />
        );
    }

    return (
        <div className="flex flex-col items-center h-full pt-8">
            <div className="flex justify-between w-full max-w-sm mb-8 px-4 font-bold text-slate-500">
                <span>طول دنباله: {toPersianNum(level)}</span>
                <span>فرصت: {lives}</span>
            </div>
            <div className="grid grid-cols-4 gap-3 bg-slate-800 p-4 rounded-2xl shadow-xl">
                {Array.from({length: GRID_SIZE}).map((_, i) => (
                    <button
                        key={i}
                        disabled={gameState !== 'input'}
                        onClick={() => handleBlockClick(i)}
                        className={`
                            w-14 h-14 rounded-xl transition-all duration-200
                            ${activeBlock === i ? 'bg-emerald-400 shadow-[0_0_15px_#34d399] scale-105' : 'bg-slate-700'}
                            ${gameState === 'input' ? 'hover:bg-slate-600 active:scale-95' : ''}
                        `}
                    />
                ))}
            </div>
            <p className="mt-8 text-slate-400 text-sm animate-pulse">
                {gameState === 'display' ? 'الگو را تماشا کنید...' : 'الگو را تکرار کنید'}
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

    const LEVELS = [4, 6, 8, 10];
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

// --- SUB-GAME 3: N-BACK (Working Memory - Precise Timing) ---
const NBackGame: React.FC<{ onFinish: (score: number, rawScore: number) => void }> = ({ onFinish }) => {
    const [n, setN] = useState(1);
    const [sequence, setSequence] = useState<string[]>([]);
    const [current, setCurrent] = useState('');
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

    // Precise Timing Refs
    const startTimeRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const trialCountRef = useRef(0);

    // Game Logic function
    const nextTrial = () => {
        if (trialCountRef.current >= MAX_TRIALS) {
            setGameOver(true); // Triggers logic in useEffect
            return;
        }

        // Generate Next
        const seq = sequence; // Note: In RAF loop, state might be stale if not careful. 
        // We need to use refs for sequence if possible, or functional updates. 
        // To simplify, we will stick to functional updates in state setter and assume 'sequence' state is close enough for N-Back logic inside this scope
        // Actually, 'sequence' state is updated on render.
    };

    // Re-implementing with setInterval but precise timestamp check or just simple useEffect with functional updates
    // The previous implementation was using setInterval inside useEffect.
    // The critique was about setInterval drifting.
    // Using a self-correcting timeout or RAF is better.

    useEffect(() => {
        if (gameOver) return;

        let expectedTime = performance.now() + ISI;
        
        const tick = () => {
            const now = performance.now();
            const drift = now - expectedTime;
            
            if (trials >= MAX_TRIALS) {
                if (n < 2) { 
                    setN(prev => prev + 1);
                    setTrials(0);
                    setSequence([]);
                    expectedTime = performance.now() + ISI; // Reset timer
                } else {
                    setGameOver(true);
                    return; // Stop loop
                }
            } else {
                // Generate Next Item
                setSequence(prevSeq => {
                    const shouldMatch = Math.random() < 0.3 && prevSeq.length >= n;
                    let newItem = '';
                    
                    if (shouldMatch) {
                        newItem = prevSeq[prevSeq.length - n];
                        setTargets(t => t + 1);
                    } else {
                        newItem = POOL[Math.floor(Math.random() * POOL.length)];
                        if (prevSeq.length >= n && newItem === prevSeq[prevSeq.length - n]) {
                            newItem = POOL.find(x => x !== newItem) || 'A';
                        }
                        setNonTargets(nt => nt + 1);
                    }
                    
                    setCurrent(newItem);
                    setShowStimulus(true);
                    return [...prevSeq, newItem];
                });

                setTrials(t => t + 1);
                setUserResponded(false);
                setTimeout(() => setShowStimulus(false), 1500);
            }

            expectedTime += ISI;
            // Schedule next tick correcting for drift
            timeoutId = setTimeout(tick, Math.max(0, ISI - drift));
        };

        let timeoutId = setTimeout(tick, 100); // Start immediately-ish

        return () => clearTimeout(timeoutId);
    }, [n, gameOver]); // Only restart loop if N changes or Game Over

    const handleMatch = () => {
        if (!showStimulus || sequence.length <= n || userResponded) return;
        
        setUserResponded(true);
        const target = sequence[sequence.length - 1 - n];
        
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
                rawScore={dPrime * 20} 
                scoreKey="A9c"
                metrics={[
                    { label: 'شاخص d-prime', value: dPrime.toFixed(2), subtext: 'تفکیک پذیری' },
                    { label: 'ضربه (Hits)', value: hits },
                    { label: 'خطای مثبت', value: falseAlarms },
                ]}
                onRetry={() => { setN(1); setHits(0); setFalseAlarms(0); setTargets(0); setNonTargets(0); setGameOver(false); setSequence([]); setTrials(0); }}
                onComplete={() => onFinish(finalScore, dPrime)}
            />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full relative bg-slate-900 text-white">
            <div className="absolute top-4 left-4 bg-slate-800 px-3 py-1 rounded-full text-sm font-bold">
                Level: {n}-Back
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
    const [gameStage, setGameStage] = useState<'intro' | 'corsi' | 'paired' | 'nback'>('intro');
    
    // Store raw scores for T-Score calculation
    const [rawScores, setRawScores] = useState({ corsi: 0, paired: 0, nback: 0 });

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

    if (gameStage === 'intro') {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 shadow-lg">
                    <Database size={48} />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-4">آزمون جامع حافظه (A9)</h1>
                <p className="text-slate-600 max-w-md mb-8 leading-relaxed">
                    این آزمون شامل ۳ بخش است: <br/>
                    ۱. <strong>شبکه امنیتی:</strong> حافظه دیداری (تکرار الگو)<br/>
                    ۲. <strong>جفت‌های پنهان:</strong> حافظه تداعی‌گر (ارتباط آیکون و رنگ)<br/>
                    ۳. <strong>رادار تمرکز:</strong> حافظه فعال (N-Back)
                </p>
                <button onClick={() => setGameStage('corsi')} className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl">
                    شروع آزمون
                </button>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative overflow-hidden bg-white">
            <button onClick={onExit} className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-slate-600"><XCircle /></button>
            
            {gameStage === 'corsi' && <CorsiGame onFinish={handleCorsiFinish} />}
            {gameStage === 'paired' && <PairedGame onFinish={handlePairedFinish} />}
            {gameStage === 'nback' && <NBackGame onFinish={handleNBackFinish} />}
        </div>
    );
};

export default MemoryGame;
