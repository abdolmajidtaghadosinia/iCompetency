
import React, { useEffect, useState } from 'react';
import { toPersianNum } from '../utils';
import { getNormMeta, getPerformanceLabel, getTScoreColor, toTScore } from '../utils/scoring';
import { Trophy, TrendingUp, Activity, CheckCircle2, RotateCcw } from 'lucide-react';
import { sfx } from '../services/audioService';

interface Metric {
    label: string;
    value: string | number;
    subtext?: string;
}

interface Props {
    title: string;
    rawScore: number;
    // Key for T-Score normalization (e.g. 'A10'). Omit for games without
    // population norms (the methodology games): the gauge then shows the
    // raw 0-100 score instead of a T-score.
    scoreKey?: string;
    metrics: Metric[];
    onRetry?: () => void;
    onComplete: () => void;
}

const GameResultCard: React.FC<Props> = ({ title, rawScore, scoreKey, metrics, onRetry, onComplete }) => {
    const [tScore, setTScore] = useState(50);
    const [animatedScore, setAnimatedScore] = useState(0);
    const isNormed = scoreKey !== undefined;

    // Completion chime once per result screen, shared by every game.
    useEffect(() => {
        sfx.playWin();
    }, []);

    useEffect(() => {
        // Normed games map raw -> T-score; un-normed ones animate the raw 0-100 score.
        // @ts-ignore
        const calculatedT = isNormed ? toTScore(rawScore, scoreKey) : Math.max(0, Math.min(100, Math.round(rawScore)));
        setTScore(calculatedT);

        // Animation
        let start = 0;
        const duration = 1500;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = calculatedT / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= calculatedT) {
                setAnimatedScore(calculatedT);
                clearInterval(timer);
            } else {
                setAnimatedScore(Math.floor(start));
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [rawScore, scoreKey]);

    const rawLabel = (s: number) =>
        s >= 80 ? 'عالی' : s >= 60 ? 'خوب' : s >= 40 ? 'متوسط' : 'نیازمند تمرین';
    const performance = isNormed ? getPerformanceLabel(tScore) : rawLabel(tScore);
    const colorClass = isNormed ? getTScoreColor(tScore) : getTScoreColor(tScore >= 80 ? 70 : tScore >= 60 ? 60 : tScore >= 40 ? 50 : 30);

    // Gauge calculation: T-scores live on 20-80, raw scores on 0-100.
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const gaugeFraction = isNormed ? (animatedScore - 20) / 60 : animatedScore / 100;
    const offset = circumference - Math.max(0, Math.min(1, gaugeFraction)) * circumference;

    return (
        <div className="h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden max-w-md w-full animate-scale-in border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800 p-6 text-center border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">{isNormed ? 'تحلیل عملکرد شناختی' : 'نتیجه شبیه‌سازی'}</p>
                </div>

                {/* Score Gauge */}
                <div className="p-8 flex flex-col items-center">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-200 dark:text-slate-700" />
                            <circle 
                                cx="70" cy="70" r={radius} 
                                stroke="currentColor" 
                                strokeWidth="10" 
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className={`text-indigo-600 transition-all duration-300`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{toPersianNum(animatedScore)}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">{isNormed ? 'T-Score' : 'از ۱۰۰'}</span>
                        </div>
                    </div>

                    <div className={`px-4 py-1.5 rounded-full font-bold text-sm mb-2 ${colorClass}`}>
                        {performance}
                    </div>

                    {/* Norm provenance: be honest about what the T-score is
                        standardized against until empirical norms are live. */}
                    {isNormed && (() => {
                        const meta = getNormMeta(scoreKey as string);
                        if (!meta) return <div className="mb-6" />;
                        return (
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-6">
                                {meta.source === 'empirical'
                                    ? `مرجع: نرم تجربی (n=${toPersianNum(meta.n)} · نسخه ${toPersianNum(meta.version)})`
                                    : 'مرجع: نرم آزمایشی — تا کالیبراسیون با داده واقعی'}
                            </div>
                        );
                    })()}
                    {!isNormed && <div className="mb-6" />}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                        {metrics.map((m, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                <div className="text-slate-800 dark:text-white font-black text-lg mb-0.5">{m.value}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">{m.label}</div>
                                {m.subtext && <div className="text-[9px] text-slate-400">{m.subtext}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} /> تلاش مجدد
                            </button>
                        )}
                        <button 
                            onClick={onComplete}
                            className="flex-[2] py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} /> ثبت نتیجه
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameResultCard;
