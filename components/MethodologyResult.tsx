
import React, { useEffect, useState } from 'react';
import { toPersianNum } from '../utils';
import { CheckCircle2, RotateCcw, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

export interface RubricDimension {
  label: string;
  value: number; // 0-100
}

interface Props {
  title: string;
  subtitle?: string;
  score: number; // 0-100 overall
  dimensions: RubricDimension[];
  strength: string;
  blindSpot: string;
  note?: string;
  onRetry?: () => void;
  onComplete: () => void;
  completeLabel?: string;
}

// Shared rubric-style result for the methodology games: an overall gauge plus a
// per-dimension breakdown and one strength / one blind spot, so the user leaves
// with a diagnosis instead of a bare number.
const level = (s: number) => (s >= 75 ? 'پیشرفته' : s >= 50 ? 'متوسط' : 'مبتدی');
const levelColor = (s: number) =>
  s >= 75 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15'
  : s >= 50 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15'
  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15';
const barColor = (v: number) => (v >= 70 ? 'bg-emerald-500' : v >= 45 ? 'bg-blue-500' : 'bg-amber-500');

const MethodologyResult: React.FC<Props> = ({ title, subtitle, score, dimensions, strength, blindSpot, note, onRetry, onComplete, completeLabel }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = clamped / 40;
    const t = setInterval(() => {
      start += step;
      if (start >= clamped) { setShown(clamped); clearInterval(t); }
      else setShown(Math.floor(start));
    }, 20);
    return () => clearInterval(t);
  }, [clamped]);

  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (shown / 100) * circ;

  return (
    <div className="h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden max-w-md w-full my-auto animate-scale-in border border-slate-200 dark:border-slate-700">
        <div className="bg-slate-50 dark:bg-slate-800 p-6 text-center border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">{subtitle ?? 'کارنامه مهارتی'}</p>
        </div>

        <div className="p-6 md:p-8 flex flex-col items-center">
          <div className="relative w-36 h-36 flex items-center justify-center mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius} stroke="currentColor" strokeWidth="9" fill="transparent" className="text-slate-200 dark:text-slate-700" />
              <circle cx="65" cy="65" r={radius} stroke="currentColor" strokeWidth="9" fill="transparent"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                className="text-indigo-600 dark:text-indigo-400 transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{toPersianNum(shown)}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">از ۱۰۰</span>
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-full font-bold text-sm mb-6 ${levelColor(clamped)}`}>سطح: {level(clamped)}</div>

          {/* Dimension breakdown */}
          <div className="w-full space-y-3 mb-6">
            {dimensions.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600 dark:text-slate-300">{d.label}</span>
                  <span className="text-slate-400 tabular-nums">{toPersianNum(Math.round(d.value))}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor(d.value)} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, d.value))}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Strength + blind spot */}
          <div className="w-full space-y-2 mb-6">
            <div className="flex items-start gap-2 text-sm bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl">
              <TrendingUp size={16} className="shrink-0 mt-0.5" /><span><b>نقطه قوت:</b> {strength}</span>
            </div>
            <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 p-3 rounded-xl">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /><span><b>نقطه کور:</b> {blindSpot}</span>
            </div>
            {note && (
              <div className="flex items-start gap-2 text-sm bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 p-3 rounded-xl">
                <Sparkles size={16} className="shrink-0 mt-0.5" /><span>{note}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            {onRetry && (
              <button onClick={onRetry} className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                <RotateCcw size={18} /> تلاش مجدد
              </button>
            )}
            <button onClick={onComplete} className="flex-[2] py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> {completeLabel ?? 'ثبت نتیجه'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodologyResult;
