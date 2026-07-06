
import React, { useEffect, useState } from 'react';
import { toPersianNum } from '../utils';
import { getPerformanceLabel, getTScoreColor, toTScore } from '../utils/scoring';
import { Trophy, TrendingUp, Activity, CheckCircle2, RotateCcw } from 'lucide-react';

interface Metric {
    label: string;
    value: string | number;
    subtext?: string;
}

interface Props {
    title: string;
    rawScore: number;
    scoreKey: string; // Key for T-Score normalization (e.g., 'A10')
    metrics: Metric[];
    onRetry: () => void;
    onComplete: () => void;
}

const GameResultCard: React.FC<Props> = ({ title, rawScore, scoreKey, metrics, onRetry, onComplete }) => {
    const [tScore, setTScore] = useState(50);
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        // Calculate T-Score using norms
        // @ts-ignore
        const calculatedT = toTScore(rawScore, scoreKey);
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

    const performance = getPerformanceLabel(tScore);
    const colorClass = getTScoreColor(tScore);

    // Gauge calculation
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((animatedScore - 20) / 60) * circumference; // Map 20-80 T-Score to circle

    return (
        <div className="h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden max-w-md w-full animate-scale-in border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800 p-6 text-center border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">تحلیل عملکرد شناختی</p>
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
                            <span className="text-xs font-bold text-slate-400 uppercase">T-Score</span>
                        </div>
                    </div>

                    <div className={`px-4 py-1.5 rounded-full font-bold text-sm mb-8 ${colorClass}`}>
                        {performance}
                    </div>

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
                        <button 
                            onClick={onRetry}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={18} /> تلاش مجدد
                        </button>
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
